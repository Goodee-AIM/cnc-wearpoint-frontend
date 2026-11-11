// 서버 상태를 브라우저 화면으로 투영하고 초기 DB·이미지 정보를 조회합니다.
export async function readMonitoringJson(apiBase, path, signal) {
  if (!apiBase) throw new Error("VITE_API_BASE_URL을 설정해주세요.");
  const response = await fetch(new URL(path, apiBase), {
    signal,
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`조회 실패: HTTP ${response.status}`);
  return response.json();
}

export function validateMonitoringState(state) {
  if (
    !["idle", "running", "paused", "completed"].includes(state?.status) ||
    !Array.isArray(state.sets) ||
    !Number.isFinite(state.elapsed_ms)
  ) {
    throw new Error("공통 재생 상태 응답 형식을 확인해주세요.");
  }
  for (const item of state.sets) {
    if (item.status === "empty") continue;
    if (
      !Number.isInteger(item.measurement_id) ||
      !Number.isFinite(item.duration_ms) || item.duration_ms <= 0 ||
      !Number.isFinite(item.elapsed_ms) || item.elapsed_ms < 0 ||
      !item.image_url
    ) {
      throw new Error(`Set${item.set_number} 공통 재생 정보가 올바르지 않습니다.`);
    }
  }
  return state;
}

export function projectMonitoringSets(state, receivedAt, now) {
  if (!state) return {};
  const delta = state.status === "running" ? Math.max(0, now - receivedAt) : 0;
  return Object.fromEntries(state.sets.map((item) => [
    item.set_number,
    item.status === "empty" ? item : {
      ...item,
      // 다음 측정으로 이동할 때는 반드시 서버가 지정한 측정을 사용합니다.
      elapsed_ms: Math.min(item.duration_ms, item.elapsed_ms +
        (item.status === "running" ? delta : 0)),
    },
  ]));
}

export async function loadDashboardData(apiBase, sets, signal) {
  return Promise.all(sets.map(async (set) => {
    const images = await readMonitoringJson(apiBase, `/api/images/set${set}`, signal);
    if (!Array.isArray(images.items)) throw new Error(`Set${set} 이미지 응답 형식 오류`);
    const measurements = [];
    let total;
    do {
      const page = await readMonitoringJson(
        apiBase,
        `/api/sets/${set}/measurements?limit=500&offset=${measurements.length}`,
        signal,
      );
      if (!Array.isArray(page.items) || !Number.isInteger(page.total)) {
        throw new Error(`Set${set} 측정 응답 형식 오류`);
      }
      total = page.total;
      if (!page.items.length && measurements.length < total) {
        throw new Error(`Set${set} 측정 데이터가 일부만 조회되었습니다.`);
      }
      measurements.push(...page.items);
    } while (measurements.length < total);
    return {
      set,
      images: images.items.map((item) => ({
        name: item.name,
        url: new URL(item.url, apiBase).href,
      })),
      measurements,
    };
  }));
}
