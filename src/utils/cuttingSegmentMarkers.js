// Python에서 확정한 같은 시작·종료 지점을 네 채널에서 공유합니다.
const markersByRows = new WeakMap();

export function getCuttingMarkers(rows) {
  return markersByRows.get(rows) ?? [];
}

export async function loadCuttingMarkers(rows, sensorUrl, apiBase, signal) {
  markersByRows.set(rows, []);
  const url = new URL(sensorUrl, apiBase);
  // 일반 Set의 원본 센서만 지원합니다. 외부 주소에는 요청하지 않습니다.
  if (url.origin !== new URL(apiBase).origin ||
      !/^\/api\/sensors\/set\d+\/[^/]+\.csv$/i.test(url.pathname)) return rows;
  url.pathname += "/cutting-segment";
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) abort();
  const timer = setTimeout(abort, 10000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    if (result.status === "ok" &&
        Number.isFinite(result.start_seconds) && result.start_seconds >= 0 &&
        Number.isFinite(result.end_seconds) && result.end_seconds > result.start_seconds) {
      markersByRows.set(rows, [result.start_seconds, result.end_seconds]);
    } else if (result.status !== "unavailable") {
      throw new Error("절삭 구간 응답 형식 오류");
    }
  } catch (error) {
    // 경계 조회 실패로 원본 파형까지 사라지지 않도록 합니다.
    if (!signal.aborted) console.warn("절삭 구간 선 조회 실패:", error);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
  }
  return rows;
}
