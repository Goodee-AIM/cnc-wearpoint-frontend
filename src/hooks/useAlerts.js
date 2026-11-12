// 현재 Set 알림 표시와 서버 DB의 공통 알림 이력 조회·필터·확인
import { useEffect, useMemo, useRef, useState } from "react";
import { API_BASE, DANGER, SETS, WARNING } from "../dashboardConfig.js";

import { fileKey, getStatus, numberOrNull } from "../utils/wear.js";
import { ALERT_PAGE_SIZE, loadSharedAlertPage, retainKnownAcknowledgments } from "../utils/alertHistory.js";

// 알림 이력 조회 시 5초마다 새로고침
const HISTORY_REFRESH_MS = 5000;

// DB 응답의 필드명·숫자·이미지 URL을 화면 레코드로 변환합니다. 회차와 확인 시각은 서버 값을 유지합니다.
function historyRecord(row, imagesBySet) {
  const set = row.set_number;
  const name = row.image_name;
  const image = name
    ? ((imagesBySet[set] ?? []).find(
        (item) => fileKey(item.name) === fileKey(name),
      ) ?? {
        name,
        url: `${API_BASE}/api/images/set${set}/${encodeURIComponent(name)}`,
      })
    : null;

  return {
    id: row.id,
    dbAlertId: row.id,
    cycleNumber: row.cycle_number,
    canAcknowledge: row.can_acknowledge,
    set,
    image,
    status: getStatus(row.level === "danger" ? DANGER : WARNING),
    // 기존 DB 이력에는 판정에 사용한 수치가 메시지에 저장됩니다.
    wear: numberOrNull(row.judged_wear_um ?? row.message?.match(/\(([0-9.]+) [μµ]m\)$/)?.[1]),
    source: row.source === "label" ? "라벨 마모량" : row.source === "prediction" ? "예측 마모량" : "DB 저장 알림",
    warningThreshold: numberOrNull(row.warning_threshold_um) ?? WARNING,
    dangerThreshold: numberOrNull(row.danger_threshold_um) ?? DANGER,
    observedAt: row.created_at,
    acknowledgedAt: row.detail_confirmed_at,
    prediction: {
      predictionId: row.prediction_id,
      predicted: numberOrNull(row.predicted_wear_um),
      sensorName: row.sensor_name,
    },
    label: { type: row.original_type },
  };
}

export default function useAlerts(getRecord, imagesBySet) {
  const [history, setHistory] = useState(null);
  const [historyError, setHistoryError] = useState(null);
  const [pageRequest, setPageRequest] = useState({ key: "", index: 0 });
  const snapshot = useRef(null);
  const acknowledgmentRevision = useRef(0);
  const [historyRequest, setHistoryRequest] = useState(0);
  const [confirmingId, setConfirmingId] = useState(null);
  const [selectedAlertId, setSelectedAlertId] = useState(null);
  const [alertSetFilter, setAlertSetFilter] = useState("all");
  const [alertLevelFilter, setAlertLevelFilter] = useState("all");
  const [alertReadFilter, setAlertReadFilter] = useState("all");
  const [dismissedAlerts, setDismissedAlerts] = useState({});

  // 팝업은 각 Set의 현재 판정을 보여줍니다. 영구 이력은 서버 worker가 저장하고 아래 조회로 가져옵니다.
  const activeAlerts = SETS.map(getRecord)
    .filter(
      (record) =>
        record.status.level === "warning" || record.status.level === "danger",
    )
    .map((record) => ({
      ...record,
      alertKey: JSON.stringify([
        record.sessionId,
        record.cycleNumber,
        record.image.name,
        record.wear,
        record.source,
        record.status.level,
      ]),
    }));

  const alerts = activeAlerts.filter(
    (record) => dismissedAlerts[record.set] !== record.alertKey,
  );

  const filterKey = JSON.stringify([alertSetFilter, alertLevelFilter, alertReadFilter]);
  const pageIndex = pageRequest.key === filterKey ? pageRequest.index : 0;
  const requestKey = `${filterKey}:${pageIndex}`;
  const currentPage = history?.requestKey === requestKey ? history : null;
  const historyLoading = currentPage === null;
  const currentError = historyError?.requestKey === requestKey ? historyError.message : "";
  const historyMessage = currentError || (historyLoading ? "알림 목록을 불러오는 중입니다." : "");
  const historyCounts = history ? { total: history.current_total, unread: history.current_unread } : null;

  // 매번 전체 이력을 순회하지 않고 현재 조건의 50건만 읽습니다.
  // 후속 페이지는 ID 상한을 유지해 새 알림 삽입이 페이지를 밀어내지 않게 합니다.
  useEffect(() => {
    let disposed = false;
    let timer;
    let controller;
    async function loadHistory() {
      controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const revision = acknowledgmentRevision.current;
      try {
        const pinned = snapshot.current?.key === filterKey ? snapshot.current : null;
        const result = await loadSharedAlertPage(API_BASE, {
          page: pageIndex, set: alertSetFilter, level: alertLevelFilter,
          read: alertReadFilter, snapshot: pinned,
        }, controller.signal);
        if (disposed || revision !== acknowledgmentRevision.current) return;
        if (pageIndex > 0 && pageIndex * ALERT_PAGE_SIZE >= result.filtered_total) {
          setPageRequest({ key: filterKey, index: 0 });
          return;
        }
        snapshot.current = { key: filterKey, session_id: result.session_id, event_max_id: result.event_max_id };
        setHistory((previous) => ({
          ...result, requestKey,
          items: retainKnownAcknowledgments(result.items, previous?.items ?? []),
        }));
        setHistoryError(null);
      } catch (error) {
        if (disposed) return;
        if (error.status === 409) {
          snapshot.current = null;
          setHistory(null);
          setPageRequest({ key: filterKey, index: 0 });
        } else {
          setHistoryError({ requestKey, message: `알림 조회 실패: ${error.message} · 자동 재시도 중` });
        }
      } finally {
        clearTimeout(timeout);
        if (!disposed) timer = setTimeout(loadHistory, HISTORY_REFRESH_MS);
      }
    }
    void loadHistory();
    return () => {
      disposed = true;
      clearTimeout(timer);
      controller?.abort();
    };
  }, [filterKey, requestKey, pageIndex, alertSetFilter, alertLevelFilter, alertReadFilter, historyRequest]);

  const alertHistory = useMemo(() => (currentPage?.items ?? [])
    .map((row) => historyRecord(row, imagesBySet)), [currentPage, imagesBySet]);
  // 서버에서 Set/단계/확인 상태 필터를 적용했으므로 현재 페이지를 그대로 표시합니다.
  const filteredAlerts = alertHistory;
  // 필터 변경으로 기존 선택이 사라지면 첫 번째 결과를 선택하고, 결과가 없으면 빈 상세를 표시합니다.
  const selectedAlert =
    filteredAlerts.find((record) => record.id === selectedAlertId) ??
    filteredAlerts[0] ??
    null;

  // 확인은 PATCH 성공 후 서버가 반환한 시각으로 반영합니다. 중복 클릭을 막고 실패하면 미확인 상태를 유지합니다.
  async function acknowledgeAlert(id) {
    const record = alertHistory.find((item) => item.id === id);
    if (!record || record.acknowledgedAt) return;

    if (!record.canAcknowledge || confirmingId !== null) return;

    setConfirmingId(record.dbAlertId);
    try {
      const confirmed = await fetch(
        `${API_BASE}/api/monitoring/alerts/${encodeURIComponent(record.id)}/acknowledge`,
        { method: "PATCH" },
      );
      if (!confirmed.ok) {
        throw new Error(`확인 기록 실패 (HTTP ${confirmed.status})`);
      }
      const saved = await confirmed.json();
      const confirmedAt = saved.detail_confirmed_at;

      if (!confirmedAt) {
        throw new Error("확인 API 응답에 detail_confirmed_at이 없습니다.");
      }

      acknowledgmentRevision.current += 1;
      setHistory((previous) => {
        if (!previous) return previous;
        const stillUnread = previous.items.some((row) => row.id === record.dbAlertId && !row.detail_confirmed_at);
        if (!stillUnread) return previous;
        return {
          ...previous,
          unread: Math.max(0, previous.unread - 1),
          current_unread: Math.max(0, previous.current_unread - 1),
          items: previous.items.map((row) => row.id === record.dbAlertId
            ? { ...row, detail_confirmed_at: confirmedAt } : row),
        };
      });
      setHistoryRequest((value) => value + 1);
    } catch (error) {
      window.alert(error.message);
    } finally {
      setConfirmingId(null);
    }
  }
  return {
    alertHistory,
    alerts,
    setDismissedAlerts,
    selectedAlert,
    acknowledgeAlert,
    confirmingId,
    historyMessage,
    historyCounts,
    historyLoading,
    historyPageNumber: pageIndex + 1,
    historyPageSize: ALERT_PAGE_SIZE,
    historyFilteredTotal: currentPage?.filtered_total ?? null,
    changeHistoryPage: (index) => setPageRequest({ key: filterKey, index: Math.max(0, index) }),
    reloadHistory: () => setHistoryRequest((value) => value + 1),
    alertSetFilter,
    setAlertSetFilter: (value) => {
      setAlertSetFilter(value);
      setPageRequest({ key: "", index: 0 });
    },
    alertLevelFilter,
    setAlertLevelFilter: (value) => {
      setAlertLevelFilter(value);
      setPageRequest({ key: "", index: 0 });
    },
    alertReadFilter,
    setAlertReadFilter: (value) => {
      setAlertReadFilter(value);
      setPageRequest({ key: "", index: 0 });
    },
    filteredAlerts,
    setSelectedAlertId,
  };
}
