import { readMonitoringJson } from "./sharedMonitoring.js";

// 첫 페이지에서 고정한 ID 상한으로 후속 페이지를 읽어 새 알림 삽입에 의한 누락을 막습니다.
export async function loadSharedAlertHistory(apiBase, signal) {
  const rows = [];
  let caps = "";
  let total;
  do {
    const page = await readMonitoringJson(
      apiBase, `/api/monitoring/alerts?limit=100&offset=${rows.length}${caps}`, signal,
    );
    if (!Array.isArray(page.items) || !Number.isInteger(page.total) ||
        !Number.isInteger(page.event_max_id) || !Number.isInteger(page.legacy_max_id)) {
      throw new Error("공통 알림 응답 형식 오류");
    }
    if (total === undefined) {
      total = page.total;
      caps = `&event_max_id=${page.event_max_id}&legacy_max_id=${page.legacy_max_id}`;
    }
    if (!page.items.length && rows.length < total) throw new Error("공통 알림이 일부만 조회되었습니다.");
    rows.push(...page.items);
  } while (rows.length < total);
  const unique = [...new Map(rows.map((row) => [row.id, row])).values()];
  if (unique.length !== total) throw new Error("공통 알림 목록이 변경됐습니다. 다시 조회합니다.");
  return unique;
}

export function retainKnownAcknowledgments(rows, previous) {
  const known = new Map(previous.map((row) => [row.id, row]));
  return rows.map((row) => {
    const old = known.get(row.id);
    const sameOccurrence = old && old.session_id === row.session_id &&
      old.measurement_id === row.measurement_id && old.created_at === row.created_at;
    return {
      ...row,
      detail_confirmed_at: row.detail_confirmed_at ??
        (sameOccurrence ? old.detail_confirmed_at : null) ?? null,
    };
  });
}
