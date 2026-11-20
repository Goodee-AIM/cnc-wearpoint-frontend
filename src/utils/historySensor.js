import { parseSensor } from "./csv.js";
import { loadCuttingMarkers } from "./cuttingSegmentMarkers.js";

// Preserve the selected historical file; never substitute a live Set's sensor.
export async function loadHistorySensor(sensorUrl, apiBase, signal) {
  const response = await fetch(new URL(sensorUrl, apiBase), { signal });
  if (!response.ok) {
    throw new Error(response.status === 404
      ? "서버에 대응하는 센서 CSV 파일이 없습니다."
      : `센서 조회 실패: HTTP ${response.status}`);
  }
  const text = await response.text();
  if (signal.aborted) return [];
  const rows = parseSensor(text);
  await loadCuttingMarkers(rows, sensorUrl, apiBase, signal);
  return signal.aborted ? [] : rows;
}
