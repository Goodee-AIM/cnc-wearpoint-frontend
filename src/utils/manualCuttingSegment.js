import { loadCuttingMarkers, setCuttingMarkers } from "./cuttingSegmentMarkers.js";

// Blob CSVs belong to the current browser session. Never forward external URLs.
export async function loadManualCuttingMarkers(rows, sensorUrl, apiBase, signal) {
  const url = new URL(sensorUrl, apiBase);
  if (url.protocol !== "blob:") {
    return loadCuttingMarkers(rows, sensorUrl, apiBase, signal);
  }
  setCuttingMarkers(rows, null);
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) abort();
  const timer = setTimeout(abort, 30000);
  try {
    const source = await fetch(url, { signal: controller.signal });
    if (!source.ok) throw new Error(`CSV HTTP ${source.status}`);
    const file = await source.blob();
    if (file.size > 20 * 1024 * 1024) throw new Error("센서 CSV는 20MB 이하여야 합니다.");
    const form = new FormData();
    form.append("sensor_csv", file, "sensor.csv");
    const response = await fetch(new URL("/api/sensors/cutting-segment", apiBase), {
      method: "POST", body: form, signal: controller.signal,
      credentials: "same-origin",
    });
    const result = await response.json();
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${JSON.stringify(result.detail ?? result)}`);
    if (controller.signal.aborted) return rows;
    if (result.status === "unavailable") return rows;
    if (result.status !== "ok" || !Number.isFinite(result.start_seconds) ||
        result.start_seconds < 0 || !Number.isFinite(result.end_seconds) ||
        result.end_seconds <= result.start_seconds) {
      throw new Error("절삭 구간 응답 형식 오류");
    }
    setCuttingMarkers(rows, result);
    return rows;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
  }
}
