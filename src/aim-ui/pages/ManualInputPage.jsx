import { getSetName } from "../../utils/setDisplay.js";
import "../styles/manual-upload.css";
import i18n from "../../i18n/index.js";
import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useRef, useState } from "react";
import { API_BASE } from "../../dashboardConfig.js";
import { parseSensor } from "../../utils/csv.js";
import { imageFiles, sensorFiles, playlistPosition } from "../../utils/manualPlaylist.js";
import { toSensorChannels } from "../adapters.js";
import ManualFilePicker from "../components/ManualFilePicker.jsx";
import DashboardPage from "./DashboardPage.jsx";
import ManualControlIcon from "../components/ManualControlIcon.jsx";
import { loadBrowserSession, saveBrowserSession, saveBrowserPrediction, clearBrowserSession } from "../../utils/manualBrowserStore.js";
import { replayMeasurementId, matchesManualReplay } from "../../utils/manualReplayGuard.js";
import "../styles/auto-prediction-dialog.css";

const TEST_STORAGE_KEY = `aim-test-session:v1:${API_BASE}`;

function readTestSession() {
  const empty = {
    items: [], groups: [], selectedKey: "", position: 0,
  };

  try {
    const saved = JSON.parse(localStorage.getItem(TEST_STORAGE_KEY));
    const records = saved?.records;

    if (
      saved?.version !== 1 ||
      !Array.isArray(records) ||
      !records.length ||
      records.length > 1000 ||
      records.some(item =>
        item?.kind === "browser" ||
        !item ||
        typeof item.id !== "string" ||
        typeof item.image_url !== "string" ||
        typeof item.sensor_url !== "string" ||
        !Number.isFinite(Number(item.duration_ms)) ||
        Number(item.duration_ms) <= 0
      )
    ) return empty;

    const total = records.reduce(
      (sum, item) => sum + Number(item.duration_ms), 0,
    );
    const position = Math.min(
      total, Math.max(0, Number(saved.position) || 0),
    );

    if (records.length === 1) {
      return {
        items: records, groups: [],
        selectedKey: records[0].id, position,
      };
    }

    return {
      items: records,
      groups: [{
        id: "restored-test",
        name: getSetName("manual"),
        created_at: records[0].created_at || "",
        item_ids: records.map(item => item.id),
        items: records,
      }],
      selectedKey: "group:restored-test",
      position,
    };
  } catch {
    return empty;
  }
}
export default function ManualInputPage({ sets, onSelectSet, active = false }) {
  const { t } = useTranslation();
  const [restored] = useState(readTestSession);

  const [images, setImages] = useState([]);
  const [sensors, setSensors] = useState([]);

  const [items, setItems] = useState(restored.items);
  const [groups, setGroups] = useState(restored.groups);
  const [selectedKey, setSelectedKey] = useState(restored.selectedKey);

  const [loaded, setLoaded] = useState({ key: "", rows: [] });
  const [position, setPosition] = useState(restored.position);
  const [busy, setBusy] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [autoBusy, setAutoBusy] = useState(false);
  const [autoResult, setAutoResult] = useState(null);
  const [pendingResult, setPendingResult] = useState(null);
  const [predictionModal, setPredictionModal] = useState(null);
  const [retryMeasurementId, setRetryMeasurementId] = useState(null);
  const currentRequest = useRef(0);
  const currentMeasurementId = useRef(null);
  const uploadDialog = useRef(null);
  const blobUrls = useRef(new Set());
  const english = i18n.resolvedLanguage?.startsWith("en") ?? false;
  const tr = (ko, en) => english ? en : ko;

  const cache = useRef(new Map());
  const mounted = useRef(true);
  const sessionSnapshot = useRef(null);
  const storageWarningShown = useRef(false);
  useEffect(() => {
    mounted.current = true;
    const urls = blobUrls.current;
    return () => {
      mounted.current = false;
      currentRequest.current += 1;
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);
  // Open only when Set Test becomes active. Closing the dialog does not
  // reactivate it until Set Test is selected again or onOpenManual is clicked.
  useEffect(() => {
    const dialog = uploadDialog.current;
    if (!dialog) return;
    if (active && !dialog.open) {
      dialog.showModal();
      setUploadOpen(true);
    } else if (!active && dialog.open) {
      dialog.close();
      setUploadOpen(false);
    }
  }, [active]);

  // Legacy manual-input sessions keep using the original backend URLs.
  // New single-upload sessions replay from an IndexedDB browser cache; the
  // server stores the original pair only once through auto-predict.
  useEffect(() => {
    if (restored.selectedKey) return;
    let stopped = false;
    const generation = currentRequest.current;
    (async () => {
      const stored = await loadBrowserSession();
      if (!stored || stopped || generation !== currentRequest.current) return;
      const rows = parseSensor(await stored.sensor.text());
      const imageUrl = URL.createObjectURL(stored.image);
      const sensorUrl = URL.createObjectURL(stored.sensor);
      if (stopped || generation !== currentRequest.current) {
        URL.revokeObjectURL(imageUrl); URL.revokeObjectURL(sensorUrl); return;
      }
      blobUrls.current.add(imageUrl); blobUrls.current.add(sensorUrl);
      const record = { ...stored.record, image_url: imageUrl, sensor_url: sensorUrl, kind: "browser" };
      cache.current.set(sensorUrl, rows);
      setLoaded({ key: sensorUrl, rows });
      setItems([record]);
      setSelectedKey(record.id);
      const saved = JSON.parse(localStorage.getItem(TEST_STORAGE_KEY) || "null");
      const position = saved?.records?.[0]?.id === record.id && Number.isFinite(Number(saved?.position))
        ? Number(saved.position) : 0;
      setPosition(Math.max(0, Math.min(record.duration_ms, position)));
      if (stored.prediction) {
        currentMeasurementId.current = replayMeasurementId(stored.prediction);
        setPendingResult(stored.prediction);
      }
      else setProgress(i18n.resolvedLanguage?.startsWith("en")
        ? "Previous prediction is unavailable. Re-upload if needed."
        : "이전 분석 결과를 복구할 수 없습니다. 필요하면 파일을 다시 업로드하세요.");
    })().catch(() => {
      if (!stopped) setError(i18n.resolvedLanguage?.startsWith("en")
        ? "Could not restore cached files."
        : "브라우저에 저장된 이전 파일을 복구하지 못했습니다.");
    });
    return () => { stopped = true; };
  }, [restored.selectedKey]);
  const choices = useMemo(() => {
    const grouped = new Set(groups.flatMap(group => group.item_ids));
    return [...groups.map(group => ({ key: "group:" + group.id, created: group.created_at, name: group.name, items: group.items })),
      ...items.filter(item => !grouped.has(item.id)).map(item => ({ key: item.id, created: item.created_at, name: item.image_name, items: [item] }))]
      .sort((a, b) => b.created.localeCompare(a.created));
  }, [groups, items]);
  const playlist = useMemo(
    () => choices.find(choice => choice.key === selectedKey)?.items || [],
    [choices, selectedKey]
  );
    // 현재 테스트의 파일 정보와 재생 위치만 보관합니다.
  useEffect(() => {
    sessionSnapshot.current = playlist.length
      ? { version: 1, records: playlist, position }
      : null;
  }, [playlist, position]);

  // 재생 중에는 1초마다 저장하고, 화면을 떠날 때도 저장합니다.
  useEffect(() => {
    const save = () => {
      const snapshot = sessionSnapshot.current;
      if (!snapshot) return;

      try {
        localStorage.setItem(
          TEST_STORAGE_KEY,
          JSON.stringify(snapshot),
        );
      } catch {
        if (!storageWarningShown.current) {
          storageWarningShown.current = true;
          setError(
            i18n.resolvedLanguage?.startsWith("en")
              ? "Unable to save this test in your browser."
              : "브라우저에 테스트 상태를 저장할 수 없습니다.",
          );
        }
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") save();
    };

    const timer = setInterval(save, 1000);

    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(timer);
      window.removeEventListener("pagehide", save);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      save();
    };
  }, []);
  const totalDuration = playlist.reduce(
  (sum, item) => sum + Math.max(1, Number(item.duration_ms) || 1),
  0,
);
const completed = totalDuration > 0 && position >= totalDuration;

const { index, elapsed } = completed
  ? {
      index: playlist.length - 1,
      elapsed: Math.max(1, Number(playlist.at(-1)?.duration_ms) || 1),
    }
  : playlistPosition(position, playlist);

const playbackText = i18n.resolvedLanguage?.startsWith("en")
  ? { replay: "Replay", clear: "Reset", done: "Playback complete" }
  : { replay: "다시 재생", clear: "초기화", done: "재생 완료" };
  const selected = playlist[index];
  const sensorKey = selected?.sensor_url || "";
  const rows = useMemo(
    () => loaded.key === sensorKey ? loaded.rows : [],
    [loaded.key, loaded.rows, sensorKey]
  );

  useEffect(() => {
    if (!sensorKey) return;
    const controller = new AbortController();
    const load = async () => {
      if (cache.current.has(sensorKey)) { setLoaded({ key: sensorKey, rows: cache.current.get(sensorKey) }); return; }
      try {
        const response = await fetch(new URL(sensorKey, API_BASE), { signal: controller.signal });
        if (!response.ok) throw new Error(i18n.t("manual.sensorFailed"));
        const data = parseSensor(await response.text());
        if (controller.signal.aborted) return;
        cache.current.set(sensorKey, data);
        if (cache.current.size > 12) cache.current.delete(cache.current.keys().next().value);
        setLoaded({ key: sensorKey, rows: data });
      } catch(err) { if (!controller.signal.aborted) setError(err.message); }
    };
    load();
    return () => controller.abort();
  }, [sensorKey]);
  useEffect(() => {
  if (!rows.length || busy || completed || !totalDuration) return;

  let previous = performance.now();

  const timer = setInterval(() => {
    const now = performance.now();
    const delta = now - previous;
    previous = now;

    setPosition(value => Math.min(totalDuration, value + delta));
  }, 80);

  return () => clearInterval(timer);
}, [rows, busy, completed, totalDuration]);

  const resetAutoPreview = () => {
    setAutoResult(null);
    setPendingResult(null);
  };
  const normalizePrediction = (payload) => ({
    measurementId: Number(payload.measurement_id),
    predictedWear: payload.prediction.predicted_wear_um,
    wearType: payload.prediction.predicted_type,
    wearTypeLabel: payload.prediction.predicted_type,
    status: payload.prediction.status,
    basis: "prediction",
  });

  // Results may arrive before playback finishes; never reveal them early.
  useEffect(() => {
    if (!completed || !pendingResult || autoResult) return;
    setAutoResult(pendingResult);
  }, [completed, pendingResult, autoResult]);
  useEffect(() => {
    if (!autoResult) return;
    setProgress(english ? "Showing prediction (3 seconds)" : "AI 분석 결과 표시 중 (3초)");
    const hold = setTimeout(() => {
      if (mounted.current) setProgress(english ? "AI analysis complete" : "AI 분석 완료");
    }, 3000);
    return () => clearTimeout(hold);
  }, [autoResult, english]);

  async function predict(path, options) {
    let response;
    try {
      response = await fetch(new URL(path, API_BASE), { credentials: "same-origin", ...options });
    } catch {
      throw { status: 0, detail: null };
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw { status: response.status, detail: payload.detail };
    return payload;
  }
  function reportPredictionError(failure, retryRequest = false) {
    const messages = {
      413: tr("파일 용량 제한을 초과했습니다.", "File size limit exceeded."),
      422: tr("이미지 또는 CSV 형식이 올바르지 않습니다.", "Invalid image or CSV."),
      429: tr("다른 AI 분석이 진행 중입니다. 잠시 후 다시 시도해 주세요.", "Another analysis is running. Retry later."),
      403: tr("추론 요청이 허용되지 않았거나 재추론 권한이 만료되었습니다.", "Prediction denied or retry access expired."),
      409: tr("이미 처리 중이거나 완료된 요청입니다.", "Already processing or completed."),
      502: tr("AI 분석에 실패했습니다. 저장된 데이터로 재추론할 수 있습니다.", "Inference failed. Retry from saved files."),
      503: tr("AI 분석 서비스를 사용할 수 없습니다.", "Prediction service unavailable."),
    };
    const id = Number(failure?.detail?.measurement_id);
    const eligible = failure?.status === 502 && Number.isSafeInteger(id) && id > 0;
    setRetryMeasurementId(eligible ? id : null);
    setPredictionModal({
      title: tr("AI 분석 안내", "AI analysis"),
      message: messages[failure?.status] ||
        (typeof failure?.detail === "string" ? failure.detail :
          (failure?.detail?.message || tr("추론 요청에 실패했습니다. 상태를 확인해 주세요.", "Prediction request failed."))),
      retryRequest,
    });
    setProgress(tr("AI 분석 실패", "AI analysis failed"));
  }
  async function applyPredictionResult(data, requestKey) {
    if (!mounted.current || requestKey !== currentRequest.current) return;
    const value = normalizePrediction(data);
    currentMeasurementId.current = replayMeasurementId(value);
    setProgress(tr("추론 완료 · 재생 종료 후 결과 표시", "Prediction ready · waiting for playback"));
    setPendingResult(value);
    setRetryMeasurementId(null);
    setPredictionModal(null);
    await saveBrowserPrediction(value).catch(() => {});
  }
  async function retryPrediction() {
    const id = retryMeasurementId;
    if (!id || autoBusy || busy) return;
    const requestKey = currentRequest.current;
    setAutoBusy(true);
    setProgress(tr("재추론 중...", "Retrying inference..."));
    try {
      const path = predictionModal?.retryRequest
        ? `/api/measurements/${id}/replay-predict`
        : `/api/measurements/${id}/retry`;
      const data = await predict(path, { method: "POST" });
      if (predictionModal?.retryRequest && !matchesManualReplay(id, data))
        throw { status: 409, detail: "응답 측정 ID가 현재 이미지와 일치하지 않습니다." };
      await applyPredictionResult(data, requestKey);
    } catch (err) {
      if (mounted.current && requestKey === currentRequest.current) reportPredictionError(err, true);
    } finally {
      if (mounted.current && requestKey === currentRequest.current) setAutoBusy(false);
    }
  }
  // Every replay requests a FRESH prediction from already stored input files.
  // No duplicate POST /auto-predict and no duplicate measurements row.
  const replaySavedMeasurement = async () => {
    if (busy || autoBusy || !playlist.length) return;
    if (playlist.length !== 1 || playlist[0].kind !== "browser") {
      setPredictionModal({ title: tr("AI 분석 안내", "AI analysis"),
        message: tr("이전 재생 기록은 파일을 다시 업로드해야 새 추론이 가능합니다.",
                    "Re-upload files from this legacy session to run new inference."),
        retryRequest: false });
      return;
    }
    const id = currentMeasurementId.current ?? replayMeasurementId(pendingResult) ?? replayMeasurementId(autoResult);
    const requestKey = ++currentRequest.current;
    setPosition(0);  // Playback starts immediately, concurrent with Serving.
    setAutoResult(null); setPendingResult(null);
    setRetryMeasurementId(null); setPredictionModal(null);
    // Clear cached old results before writing a new result (avoid IDB races).
    if (!id) {
      setProgress(tr("저장된 측정 ID를 찾을 수 없습니다.", "Saved measurement ID is unavailable."));
      setPredictionModal({ title: tr("AI 분석 안내", "AI analysis"),
        message: tr("이전에 업로드한 이미지·CSV를 한 번 다시 등록해 주세요.",
                    "Re-upload the image and CSV once to enable replay inference."),
        retryRequest: false });
      return;
    }
    setAutoBusy(true);
    setProgress(tr("재생 중 · 새 AI 추론 중", "Replaying · running fresh AI inference"));
    try {
      await saveBrowserPrediction(null).catch(() => {});
      const data = await predict(`/api/measurements/${id}/replay-predict`, { method: "POST" });
      if (!matchesManualReplay(id, data))
        throw { status: 409, detail: "응답 측정 ID가 현재 이미지와 일치하지 않습니다." };
      await applyPredictionResult(data, requestKey);
    } catch (err) {
      if (mounted.current && requestKey === currentRequest.current)
        reportPredictionError(err, true);
    } finally {
      if (mounted.current && requestKey === currentRequest.current) setAutoBusy(false);
    }
  };
  const select = (files, kind) => {
    currentRequest.current += 1;
    currentMeasurementId.current = null;
    resetAutoPreview();
    const supported = kind === "image" ? imageFiles(files) : sensorFiles(files);
    (kind === "image" ? setImages : setSensors)(supported.length === 1 ? supported : []);
    setError(supported.length === 1 ? "" : tr("파일을 한 개만 선택해 주세요.", "Select exactly one file."));
    setProgress("");
  };
  // A single Tool Image and a single Sensor CSV are required per upload.
  // Use both the existing inline error area and a native alert: the alert
  // remains visible even if browser-side file input validation prevents submit.
  const validateSingleUploadPair = () => {
    if (images.length === 1 && sensors.length === 1) return true;
    const message = images.length === 0 && sensors.length === 0
      ? tr("이미지 1개와 CSV 1개를 선택해 주세요.", "Select one image and one CSV.")
      : images.length !== 1
        ? tr("이미지 파일을 1개 선택해 주세요.", "Select exactly one image file.")
        : tr("CSV 파일을 1개 선택해 주세요.", "Select exactly one CSV file.");
    setError(message);
    window.alert(message);
    return false;
  };
  const upload = async (event) => {
    event.preventDefault();
    if (busy || autoBusy) return;
    if (!validateSingleUploadPair()) return;
    const image = images[0], sensor = sensors[0];
    if (image.size > 8 * 1024 * 1024 || sensor.size > 20 * 1024 * 1024) {
      setError(t("manual.sizeLimit")); return;
    }
    // The model Serving currently supports PNG/JPEG, not WebP.
    if (!/\.(png|jpe?g)$/i.test(image.name)) {
      setError(tr("PNG 또는 JPEG 이미지만 선택할 수 있습니다.", "Choose a PNG or JPEG image.")); return;
    }
    setBusy(true); setError(""); setProgress(tr("파일 검증 중...", "Validating files..."));
    let record;
    try {
      const bitmap = await createImageBitmap(image); bitmap.close();
      const parsed = parseSensor(await sensor.text());
      if (parsed.length < 2 || parsed.at(-1).ms <= parsed[0].ms) throw new Error(t("manual.timeRows"));
      const duration = Math.max(1, parsed.at(-1).ms - parsed[0].ms);
      const imageUrl = URL.createObjectURL(image);
      const sensorUrl = URL.createObjectURL(sensor);
      blobUrls.current.add(imageUrl); blobUrls.current.add(sensorUrl);
      record = {
        id: `browser-${crypto.randomUUID()}`,
        image_name: image.name,
        sensor_name: sensor.name,
        image_url: imageUrl,
        sensor_url: sensorUrl,
        duration_ms: duration,
        created_at: new Date().toISOString(),
        kind: "browser",
      };
      currentRequest.current += 1;
      currentMeasurementId.current = null;
      setPendingResult(null); setAutoResult(null); setPredictionModal(null); setRetryMeasurementId(null);
      cache.current.clear(); cache.current.set(sensorUrl, parsed);
      setLoaded({ key: sensorUrl, rows: parsed });
      setGroups([]); setItems([record]); setSelectedKey(record.id); setPosition(0);
      // Replace the old persisted record before the first 1s snapshot tick.
      sessionSnapshot.current = { version: 1, records: [record], position: 0 };
      try { localStorage.setItem(TEST_STORAGE_KEY, JSON.stringify(sessionSnapshot.current)); } catch { /* IndexedDB cache remains available. */ }
      // IndexedDB is a browser-only replay cache. Backend upload happens only
      // through /api/measurements/auto-predict (Object Storage + RDS).
      try { await saveBrowserSession({ image, sensor, record: {
        ...record, image_url: "", sensor_url: ""
      } }); }
      catch { setError(tr("브라우저 파일 복구 캐시를 저장할 수 없습니다. 새로고침 후 재생이 유지되지 않을 수 있습니다.", "Browser replay cache unavailable. Playback may not survive refresh.")); }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("manual.uploadFailed"));
      setProgress(""); setBusy(false); return;
    }
    if (!mounted.current) return;
    uploadDialog.current?.close();
    setBusy(false);
    setAutoBusy(true);
    setProgress(tr("재생 중 · AI 추론 중", "Playing · running AI inference"));
    const requestKey = currentRequest.current;
    const form = new FormData();
    form.append("image", image); form.append("sensor_csv", sensor);
    try {
      const data = await predict("/api/measurements/auto-predict", { method: "POST", body: form });
      await applyPredictionResult(data, requestKey);
    } catch (err) {
      if (mounted.current && requestKey === currentRequest.current) reportPredictionError(err);
    } finally {
      if (mounted.current && requestKey === currentRequest.current) setAutoBusy(false);
    }
  };
  const start = rows[0]?.ms ?? 0;
  const visible = rows.filter(row => row.ms >= start + elapsed - 5000 && row.ms <= start + elapsed);
  const measurement = {
    image: selected ? { url: new URL(selected.image_url, API_BASE).href, filename: selected.image_name, sensorTime: visible.at(-1)?.time } : null,
    predictedWear: selected?.predicted_wear ?? null, status: "pending", wearTypeLabel: null,
    // Never replace the playback image or sensor stream with prediction data.
    ...(autoResult ?? {}),
  };
  const clearScreen = () => {
    if (busy || autoBusy) return;
      sessionSnapshot.current = null;

  try {
    localStorage.removeItem(TEST_STORAGE_KEY);
  } catch {
    setError(
      i18n.resolvedLanguage?.startsWith("en")
        ? "Unable to reset the saved test."
        : "저장된 테스트 상태를 초기화할 수 없습니다.",
    );
    return;
  }

    currentRequest.current += 1;
    currentMeasurementId.current = null;
    resetAutoPreview();
    setPredictionModal(null);
    setRetryMeasurementId(null);
    clearBrowserSession().catch(() => {});
    for (const url of blobUrls.current) URL.revokeObjectURL(url);
    blobUrls.current.clear();
    setSelectedKey("");
    setItems([]);
    setGroups([]);
    setImages([]);
    setSensors([]);
    setLoaded({ key: "", rows: [] });
    setPosition(0);
    setError("");
    setProgress("");
    cache.current.clear();
  };
  const openUploadDialog = () => {
    if (busy || autoBusy) return;
    const dialog = uploadDialog.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
      setUploadOpen(true);
    }
  };

    const uploadPanel = (
    <section
      className="manual-upload card"
      aria-label={t("manual.aria", { name: getSetName("manual") })}
    >
      <h2>{t("manual.title")}</h2>

      <form onSubmit={upload}>
        <ManualFilePicker
          label={t("image.toolImage")}
          accept="image/png,image/jpeg"
          single
          files={images}
          disabled={busy || autoBusy}
          onChange={files => select(files, "image")}
        />

        <ManualFilePicker
          label={t("manual.sensorCsv")}
          accept=".csv,text/csv"
          single
          files={sensors}
          disabled={busy || autoBusy}
          onChange={files => select(files, "sensor")}
        />

        <button
          className="manual-action manual-action-upload"
          type="submit"
          disabled={busy || autoBusy}
        >
          <ManualControlIcon name="play" />
          {busy ? t("alerts.saving") : t("manual.upload")}
        </button>

        <button
          className="manual-action manual-action-replay"
          type="button"
          disabled={busy || autoBusy || !playlist.length}
          onClick={replaySavedMeasurement}
        >
          <ManualControlIcon name="replay" />
          {playbackText.replay}
        </button>

        <button
          className="manual-action manual-action-reset"
          type="button"
          disabled={busy || autoBusy}
          onClick={clearScreen}
        >
          {playbackText.clear}
        </button>
      </form>
      {predictionModal && <div className="auto-inference-backdrop" role="presentation">
        <section className="auto-inference-dialog" role="alertdialog" aria-modal="true" aria-label={predictionModal.title}>
          <h3>{predictionModal.title}</h3>
          <p>{predictionModal.message}</p>
          {retryMeasurementId && <p className="auto-inference-record-id">Measurement ID: {retryMeasurementId}</p>}
          <div className="auto-inference-dialog-actions">
            {retryMeasurementId && <button type="button" onClick={retryPrediction} disabled={autoBusy}>
              {autoBusy ? tr("재추론 중...", "Retrying...") : tr("재추론", "Retry inference")}
            </button>}
            <button type="button" disabled={autoBusy} onClick={() => setPredictionModal(null)}>
              {tr("닫기", "Close")}
            </button>
          </div>
        </section>
      </div>}

      <div className="manual-upload-feedback">
        {error && <p role="alert">{error}</p>}
        {progress && <p role="status">{progress}</p>}
        {completed && <p role="status">{playbackText.done}</p>}

        {playlist.length > 1 && (
          <p role="status">
            {t("manual.playingIndex", {
              current: index + 1,
              total: playlist.length,
            })}
          </p>
        )}
      </div>
    </section>
  );

  return (
    <DashboardPage
      sets={sets}
      selectedSet="manual"
      onSelectSet={onSelectSet}
      measurement={measurement}
      channels={toSensorChannels(visible, start)}
      cursorSeconds={elapsed / 1000}
      playbackStatus="manual"
      onOpenManual={openUploadDialog}
      beforeContent={
        <>
          {!uploadOpen && uploadPanel}
          <dialog
            ref={uploadDialog}
            aria-label={t("manual.title")}
            onClose={() => setUploadOpen(false)}
            onCancel={(event) => { if (busy || autoBusy) event.preventDefault(); }}
            data-set-test-popup="true"
            style={{
              width: "min(90vw, 560px)",
              boxSizing: "border-box",
              maxHeight: "90vh",
              overflowY: "auto",
              border: "none",
            }}
          >
            <style>{`
              dialog[data-set-test-popup="true"] .manual-upload .manual-picker {
                border-right: none;
                padding-right: 0;
                min-width: 0;
                width: 100%;
              }
            `}</style>
            {uploadOpen && (
              <section
                className="manual-upload card"
                aria-label={t("manual.aria", { name: getSetName("manual") })}
                style={{ border: "none", boxShadow: "none" }}
              >
                <h2>{t("manual.title")}</h2>
                <form
                  onSubmit={upload}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 218px), 1fr))",
                    gap: "16px",
                    alignItems: "start",
                    margin: 0,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <ManualFilePicker
                      label={t("image.toolImage")}
                      accept="image/png,image/jpeg"
                      single
                      files={images}
                      disabled={busy || autoBusy}
                      onChange={files => select(files, "image")}
                    />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <ManualFilePicker
                      label={t("manual.sensorCsv")}
                      accept=".csv,text/csv"
                      single
                      files={sensors}
                      disabled={busy || autoBusy}
                      onChange={files => select(files, "sensor")}
                    />
                  </div>
                  <button
                    className="manual-action manual-action-upload"
                    type="submit"
                    disabled={busy || autoBusy}
                    onClick={(event) => {
                      // Click-level validation also covers native required inputs
                      // that might otherwise prevent the form submit handler.
                      if (!validateSingleUploadPair()) event.preventDefault();
                    }}
                    style={{ gridColumn: "1 / -1", justifySelf: "end" }}
                  >
                    <ManualControlIcon name="play" />
                    {busy ? t("alerts.saving") : t("manual.upload")}
                  </button>
                </form>
                <div className="manual-upload-feedback">
                  {error && <p role="alert">{error}</p>}
                  {progress && <p role="status">{progress}</p>}
                </div>
              </section>
            )}
          </dialog>
        </>
      }
    />
  );
}