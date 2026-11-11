// 현재 Set 알림 표시와 서버 DB의 공통 알림 이력 조회·필터·확인
import { useEffect, useMemo, useState } from "react";
import { API_BASE, DANGER, SETS, WARNING } from "../dashboardConfig.js";

import { fileKey, getStatus, numberOrNull } from "../utils/wear.js";
import { loadSharedAlertHistory, retainKnownAcknowledgments } from "../utils/alertHistory.js";

// 알림 이력 조회 시 5초마다 새로고침
const HISTORY_REFRESH_MS = 5000;

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
  const [storedAlerts, setStoredAlerts] = useState([]);
  const [historyMessage, setHistoryMessage] = useState("DB 공통 알림 이력을 불러오는 중입니다.");
  const [historyRequest, setHistoryRequest] = useState(0);
  const [confirmingId, setConfirmingId] = useState(null);
  const [selectedAlertId, setSelectedAlertId] = useState(null);
  const [alertSetFilter, setAlertSetFilter] = useState("all");
  const [alertLevelFilter, setAlertLevelFilter] = useState("all");
  const [alertReadFilter, setAlertReadFilter] = useState("all");
  const [dismissedAlerts, setDismissedAlerts] = useState({});

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

  useEffect(() => {
    let disposed = false;
    let timer;
    let controller;

    async function loadHistory() {
      controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      try {
        const rows = await loadSharedAlertHistory(API_BASE, controller.signal);
        if (disposed) return;
        setStoredAlerts((previous) => retainKnownAcknowledgments(rows, previous));
        setHistoryMessage("");
      } catch (error) {
        if (!disposed) setHistoryMessage(`DB 공통 알림 조회 실패: ${error.message} · 자동 재시도 중`);
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
  }, [historyRequest]);

  // 화면의 전체 건수와 미확인 건수는 이 DB 목록에서만 계산합니다.
  const alertHistory = useMemo(() => storedAlerts
    .map((row) => historyRecord(row, imagesBySet))
    .sort((a, b) => new Date(b.observedAt) - new Date(a.observedAt)),
  [storedAlerts, imagesBySet]);

  const filteredAlerts = alertHistory.filter(
    (record) =>
      (alertSetFilter === "all" || record.set === Number(alertSetFilter)) &&
      (alertLevelFilter === "all" ||
        record.status.level === alertLevelFilter) &&
      (alertReadFilter === "all" ||
        (alertReadFilter === "unread"
          ? !record.acknowledgedAt
          : Boolean(record.acknowledgedAt))),
  );
  const selectedAlert =
    filteredAlerts.find((record) => record.id === selectedAlertId) ??
    filteredAlerts[0] ??
    null;

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

      setStoredAlerts((previous) =>
        previous.map((row) =>
          row.id === record.dbAlertId
            ? { ...row, detail_confirmed_at: confirmedAt }
            : row,
        ),
      );
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
    reloadHistory: () => {
      setHistoryMessage("DB 공통 알림 이력을 불러오는 중입니다.");
      setHistoryRequest((value) => value + 1);
    },
    alertSetFilter,
    setAlertSetFilter,
    alertLevelFilter,
    setAlertLevelFilter,
    alertReadFilter,
    setAlertReadFilter,
    filteredAlerts,
    setSelectedAlertId,
  };
}
