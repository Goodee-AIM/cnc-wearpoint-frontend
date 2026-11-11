// 이전 브라우저별 재생 방식으로 남겨둔 hook입니다. 현재 useDashboard의 자동 모드는 useSharedMonitoring을 사용합니다.
// 각 Set의 현재 사진에 연결된 센서를 조회, Set별 재생 시간과 다음 사진으로 넘어가는 시점 관리
import { useEffect, useRef, useState } from "react";
import { API_BASE, SETS } from "../dashboardConfig.js";
import { recordKey } from "../utils/wear.js";
import { parseSensor } from "../utils/csv.js";

// 각 Set의 센서와 재생 위치를 독립적으로 유지합니다.
export default function useSetPlayback(
  enabled,
  playing,
  images,
  records,
  indices,
  setIndices,
) {
  const [states, setStates] = useState({});
  const entries = useRef({});
  const latest = useRef({ images, indices });
  latest.current = { images, indices };
  // 사진/연결 센서가 바뀐 Set만 다시 로드하도록 각 Set의 연결 정보를 문자열 키로 만듭니다.
  const signature = JSON.stringify(
    SETS.map((set) => {
      const image = images[set]?.[indices[set] ?? 0];
      return [
        set,
        image?.name,
        records[recordKey(set, image?.name ?? "")]?.sensor_name,
      ];
    }),
  );
  useEffect(() => {
    if (!enabled) {
      Object.values(entries.current).forEach((entry) =>
        entry.controller?.abort(),
      );
      entries.current = {};
      setStates({});
      return;
    }
    for (const [set, imageName, sensorName] of JSON.parse(signature)) {
      const key = JSON.stringify([imageName, sensorName]);
      if (entries.current[set]?.key === key) continue;
      entries.current[set]?.controller?.abort();
      const controller = new AbortController();
      const entry = {
        key,
        controller,
        rows: [],
        elapsed: 0,
        status: "loading",
        name: sensorName ?? "",
        message: "센서 조회 중",
      };
      entries.current[set] = entry;
      const publish = () => setStates({ ...entries.current });
      if (!imageName || !sensorName) {
        entry.status = imageName ? "image-only" : "finished";
        entry.duration = 2000;
        entry.message = !imageName
          ? "이미지 없음"
          : "DB 센서 연결 정보 없음 · 사진만 2초 표시 후 다음 사진으로 이동";
        publish();
        continue;
      }
      publish();
      (async () => {
        const timeout = window.setTimeout(
          () => controller.abort("timeout"),
          15000,
        );
        try {
          const response = await fetch(
            `${API_BASE}/api/sensors/set${set}/${encodeURIComponent(sensorName)}`,
            { signal: controller.signal },
          );
          if (!response.ok)
            throw new Error(`센서 조회 실패: HTTP ${response.status}`);
          const rows = parseSensor(await response.text());
          if (controller.signal.aborted) return;
          if (!rows.length) throw new Error("사용 가능한 센서 데이터 없음");
          entry.rows = rows;
          entry.duration = rows[rows.length - 1].ms - rows[0].ms;
          entry.status = "ready";
          entry.message = `${sensorName} · ${rows.length.toLocaleString()}행`;
          publish();
        } catch (error) {
          if (
            controller.signal.aborted &&
            controller.signal.reason !== "timeout"
          )
            return;
          entry.status = "image-only";
          entry.duration = 2000;
          entry.elapsed = 0;
          entry.rows = [];
          entry.message = `${controller.signal.reason === "timeout" ? "센서 조회 시간 초과" : error.message} · 사진만 2초 표시 후 다음 사진으로 이동`;
          publish();
        } finally {
          window.clearTimeout(timeout);
        }
      })();
    }
  }, [enabled, signature]);
  // 화면 종료 시 Set별 미완료 센서 요청을 모두 취소합니다.
  useEffect(
    () => () =>
      Object.values(entries.current).forEach((entry) =>
        entry.controller?.abort(),
      ),
    [],
  );
  // 이 hook의 시간 진행은 브라우저 로컬 기준입니다. 서버 공통 회차를 제어하는 타이머가 아닙니다.
  useEffect(() => {
    if (!enabled || !playing) return;
    let previous = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const delta = now - previous;
      previous = now;
      const advances = {};
      for (const set of SETS) {
        const entry = entries.current[set];
        if (!["ready", "image-only"].includes(entry?.status)) continue;
        entry.elapsed = Math.min(entry.duration, entry.elapsed + delta);
        if (entry.elapsed >= entry.duration) {
          const index = latest.current.indices[set] ?? 0;
          if (index + 1 < (latest.current.images[set]?.length ?? 0)) {
            entry.status = "advancing";
            advances[set] = index + 1;
          } else entry.status = "finished";
        }
      }
      if (Object.keys(advances).length)
        setIndices((previous) => ({ ...previous, ...advances }));
      setStates({ ...entries.current });
    }, 100);
    return () => window.clearInterval(timer);
  }, [enabled, playing, setIndices]);
  return states;
}
