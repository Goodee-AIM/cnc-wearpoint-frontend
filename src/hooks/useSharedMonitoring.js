// 서버 공통 재생 상태와 선택 Set의 센서를 조회합니다. 브라우저는 서버가 정한 측정 위치를 표시합니다.
import { useEffect, useMemo, useRef, useState } from "react";
import { API_BASE } from "../dashboardConfig.js";
import { loadCuttingMarkers } from "../utils/cuttingSegmentMarkers.js";
import { parseSensor } from "../utils/csv.js";
import { createSensorCache } from "../utils/sensorCache.js";
import {
  projectMonitoringSets,
  readMonitoringJson,
  validateMonitoringState,
} from "../utils/sharedMonitoring.js";

// 상태 조회는 1초 간격입니다. 알림 이력의 5초 주기는 useAlerts에서 별도로 관리합니다.
const POLL_MS = 1000;

export default function useSharedMonitoring(enabled, selectedSet) {
  const [snapshot, setSnapshot] = useState(null);
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState("공통 재생 상태 조회 중...");
  const [clock, setClock] = useState(0);
  const [sensors, setSensors] = useState(() => new Map());
  const [inferenceRuns, setInferenceRuns] = useState([]);
  const [inferenceError, setInferenceError] = useState("");
  const sensorCache = useRef(null);

  // 활성화 시 바로 조회하고, 비활성화·언마운트 시 요청/타이머/이벤트를 모두 정리합니다.
  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    let pending = false;
    let inferenceSerial = 0;
    // Highest request serial whose response has been applied. A response is
    // dropped only if a NEWER one was already applied — a slow response is
    // still shown instead of being discarded because another request started.
    let appliedInferenceSerial = 0;
    let timer;
    let controller;

    // 이전 요청이 끝난 뒤 다음 조회를 예약해 중복 요청을 막고, 5초 넘는 응답은 취소합니다.
    async function poll() {
      if (disposed || pending) return;
      clearTimeout(timer);
      pending = true;
      controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        const state = validateMonitoringState(await readMonitoringJson(
          API_BASE, "/api/monitoring/state", controller.signal,
        ));
        if (disposed) return;
        const receivedAt = performance.now();
        setSnapshot({ state, receivedAt });
        setClock(receivedAt);
        setConnected(true);
        setMessage("");
        const serial = ++inferenceSerial;
        // Never make images/sensor replay wait for the inference status GET.
        if (state.gated_playback) {
          void readMonitoringJson(API_BASE, "/api/monitoring/inference/current", controller.signal)
            .then((data) => {
              if (!disposed && serial > appliedInferenceSerial) {
                appliedInferenceSerial = serial;
                setInferenceRuns(Array.isArray(data?.runs) ? data.runs : []);
                setInferenceError("");
              }
            })
            .catch((error) => {
              // Report a failure only if it is the latest request; an older
              // failure must not wipe a newer successful result.
              if (!disposed && serial === inferenceSerial && serial > appliedInferenceSerial) {
                appliedInferenceSerial = serial;
                setInferenceRuns([]);
                setInferenceError(error.message);
              }
            });
        } else {
          appliedInferenceSerial = serial;
          setInferenceRuns([]);
          setInferenceError("");
        }
      } catch (error) {
        if (!disposed) {
          setConnected(false);
          setMessage(`공통 상태 연결 실패: ${error.message} · 자동 재연결 중`);
        }
      } finally {
        clearTimeout(timeout);
        pending = false;
        if (!disposed) timer = setTimeout(poll, POLL_MS);
      }
    }

    // 백그라운드 탭에서 타이머가 지연돼도 돌아오는 즉시 서버 위치를 다시 확인합니다.
    function resumeVisibleTab() {
      if (document.visibilityState === "visible") void poll();
    }

    void poll();
    document.addEventListener("visibilitychange", resumeVisibleTab);
    return () => {
      disposed = true;
      inferenceSerial += 1;
      clearTimeout(timer);
      controller?.abort();
      document.removeEventListener("visibilitychange", resumeVisibleTab);
    };
  }, [enabled]);

  // 100ms 화면 갱신은 같은 측정 안의 그래프 진행만 부드럽게 합니다. 다음 측정·회차는 서버 응답으로 바뀝니다.
  const clockRunning = snapshot?.state.status === "running";
  useEffect(() => {
    if (!enabled || !connected || !clockRunning) return;
    const timer = setInterval(() => setClock(performance.now()), 100);
    return () => clearInterval(timer);
  }, [enabled, connected, clockRunning]);

  const sets = useMemo(() => projectMonitoringSets(
    snapshot?.state, snapshot?.receivedAt ?? 0, clock,
  ), [snapshot, clock]);
  const selected = sets[selectedSet];
  const sessionId = snapshot?.state.session_id;
  const sensorUrl = selected?.playback_mode === "sensor" ? selected.sensor_url : null;
  // 같은 세션·Set·센서 원본은 재사용합니다. 반복 회차의 재생 위치는 서버 elapsed_ms가 별도로 결정합니다.
  const sensorKey = JSON.stringify([sessionId, selectedSet, sensorUrl]);

  // 캐시는 선택 Set과 무관하게 살아 있어 전환 중에도 진행 중 요청을 재사용합니다.
  useEffect(() => {
    if (!enabled) return;
    const cache = createSensorCache({
      onChange: setSensors,
      load: async (url, signal) => {
        const controller = new AbortController();
        const abort = () => controller.abort();
        signal.addEventListener("abort", abort, { once: true });
        if (signal.aborted) abort();
        // ~9 MB CSV: allow slow links; a timeout restarts the whole download.
        const timeout = setTimeout(abort, 30000);
        let rows;
        try {
          const response = await fetch(new URL(url, API_BASE), { signal: controller.signal });
          if (!response.ok) throw new Error(`센서 조회 실패: HTTP ${response.status}`);
          rows = parseSensor(await response.text());
        } finally {
          clearTimeout(timeout);
          signal.removeEventListener("abort", abort);
        }
        // Cutting-segment markers are decoration: never hold the waveform back
        // for them (that request alone may take up to 10 s). Re-render when ready.
        void loadCuttingMarkers(rows, url, API_BASE, signal).then(() => {
          if (!signal.aborted) setSensors((previous) => new Map(previous));
        });
        return rows;
      },
    });
    sensorCache.current = cache;
    return () => { cache.close(); sensorCache.current = null; };
  }, [enabled]);

  // 선택 Set은 즉시 요청합니다. 클릭으로 다른 Set에 갔다 와도 같은 요청을 공유합니다.
  // selectedMissing re-runs this when the rows vanish from the cache for any
  // reason, so the charts recover instead of waiting for the next measurement.
  const selectedMissing = Boolean(enabled && sensorUrl && !sensors.has(sensorKey));
  useEffect(() => {
    if (!enabled || !sensorUrl) return;
    const cache = sensorCache.current;
    cache.peek(sensorKey);
    let disposed = false;
    let timer;
    async function loadSelected() {
      await cache.read(sensorKey, sensorUrl);
      if (!disposed && cache.peek(sensorKey)?.status === "error") {
        timer = setTimeout(loadSelected, 1000);
      }
    }
    void loadSelected();
    return () => { disposed = true; clearTimeout(timer); };
  }, [enabled, sensorKey, sensorUrl, selectedMissing]);

    // 선택한 Set의 센서만 요청하고 현재 파일을 캐시에 유지합니다.
  useEffect(() => {
    if (!enabled) return;

    const cache = sensorCache.current;
    if (!cache) return;

    cache.pin([sensorKey]);
  }, [enabled, sensorKey]);

  const sensor = enabled ? sensors.get(sensorKey) : null;

  // 서버 상태와 센서 로딩 상태를 기존 대시보드에서 사용하는 rows/elapsed/message 구조로 변환합니다.
  const entries = Object.fromEntries(Object.entries(sets).map(([set, item]) => {
    const isSelected = Number(set) === selectedSet;
    const loaded = sensor?.status === "ready" && isSelected;
    let status = "ready";
    if (item.status === "empty" || item.status === "completed") status = "finished";
    else if (item.playback_mode === "image_only") status = "image-only";
    else if (isSelected && sensor?.status === "error") status = "error";
    else if (isSelected && !loaded) status = "loading";
    return [set, {
      status,
      rows: loaded ? sensor.rows : [],
      elapsed: item.elapsed_ms ?? 0,
      duration: item.duration_ms ?? 0,
      message: item.status === "empty" ? "등록된 재생 일정 없음"
        : item.message || (isSelected && sensor?.message) || item.sensor_name || "센서 연결 없음",
    }];
  }));

  return {
    state: snapshot?.state ?? null,
    connected: enabled && connected,
    message,
    sets,
    entries,
    inferenceRuns,
    inferenceError,
  };
}
