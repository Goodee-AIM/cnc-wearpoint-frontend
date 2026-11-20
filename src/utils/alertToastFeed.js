// 토스트는 DB 이력 삽입 여부와 관계없이 화면과 같은 실시간 판정을 사용합니다.
// 최초 접속 때 현재 진행 중인 경고·위험도 한 번 알리고 이후 같은 발생은 중복 표시하지 않습니다.
export function createLiveAlertDetector() {
  const seen = new Map();
  let lastPlayback = null;
  let restartNumber = 0;

  return {
    scan({ records = [], enabled = true, playback = null } = {}, now = new Date()) {
      if (!enabled) return [];
      const current = playback && Number.isFinite(playback.elapsed_ms) ? playback : null;
      if (current && lastPlayback && current.session_id === lastPlayback.session_id &&
          current.revision !== lastPlayback.revision && current.elapsed_ms < lastPlayback.elapsed_ms) {
        // '분석 시작'이 같은 세션·회차를 재사용해도 새 재생으로 구분합니다.
        restartNumber += 1;
        seen.clear();
      }
      if (current) lastPlayback = {
        session_id: current.session_id, revision: current.revision, elapsed_ms: current.elapsed_ms,
      };
      const incoming = [];
      for (const record of records) {
        const level = record?.status?.level;
        const wear = record?.wear == null || String(record.wear).trim() === "" ? NaN : Number(record.wear);
        if (!Number.isInteger(record?.set) || record.set < 4 || record.set > 11 ||
            !record.image?.name || !Number.isFinite(wear) || wear < 0 ||
            !["normal", "warning", "danger"].includes(level)) continue;
        const key = JSON.stringify([
          record.sessionId ?? current?.session_id ?? "local",
          record.playbackGeneration ?? restartNumber,
          record.cycleNumber ?? current?.cycle_number ?? 0,
          record.set, record.image.name, record.runId ?? null, record.source, level,
        ]);
        if (level === "normal" || seen.has(key)) continue;
        seen.set(key, true);
        // 과거 DB 이력을 재생하지 않고 현재 유효한 경고·위험만 한 번 표시합니다.
        incoming.push({ count: 1, row: {
          id: `live:${key}`,
          set_number: record.set,
          level,
          judged_wear_um: wear,
          original_type: (record.source === "예측 마모량" || record.set >= 10)
            ? record.prediction?.type ?? null : record.label?.type ?? null,
          created_at: now.toISOString(),
          detail_confirmed_at: null,
        } });
        // 한 세션이 오래 이어져도 브라우저 메모리가 계속 증가하지 않도록 제한합니다.
        if (seen.size > 4096) seen.delete(seen.keys().next().value);
      }
      return incoming;
    },
  };
}

// 같은 Set의 새 알림은 최신 판정으로 갱신하고 건수만 합칩니다. 전체 대기열은 최대 8개입니다.
export function mergeAlertToasts(previous, incoming) {
  const merged = new Map(previous.map((item) => [item.row.set_number, item]));
  for (const item of incoming) {
    const old = merged.get(item.row.set_number);
    merged.set(item.row.set_number, { ...item, count: (old?.count ?? 0) + item.count });
  }
  return [...merged.values()];
}
