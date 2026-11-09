// 현재 경고·위험을 감지, 새 알림을 이력에 추가. 알림은 API로 등록, DB 이력 조회·필터링·확인
import { useEffect, useRef, useState } from "react";
import { API_BASE, DANGER, SETS, WARNING } from "../dashboardConfig.js";

import { fileKey, getStatus, numberOrNull } from "../utils/wear.js";

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
    id: `db:${row.id}`,
    dbAlertId: row.id,
    set,
    image,
    status: getStatus(row.level === "danger" ? DANGER : WARNING),
    // 기존 DB 이력에는 판정에 사용한 수치가 메시지에 저장됩니다.
    wear: numberOrNull(row.message?.match(/\(([0-9.]+) [μµ]m\)$/)?.[1]),
    source: "DB 저장 알림",
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

async function saveAlert(record, setAlertHistory) {
  const predictionId = record.prediction?.predictionId;
  try {
    const created = await fetch(`${API_BASE}/api/alerts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prediction_id: predictionId,
        source:
          !record.testing && record.set !== 10 && record.set !== 11
            ? "label"
            : "prediction",
      }),
    });
    if (!created.ok) {
      throw new Error(`알림 저장 실패 (HTTP ${created.status})`);
    }
    const alert = await created.json();
    if (!alert?.id) throw new Error("알림 생성 응답에 ID가 없습니다.");
    setAlertHistory((previous) =>
      previous.map((item) =>
        item.id === record.id
          ? {
              ...item,
              dbAlertId: alert.id,
              acknowledgedAt: item.acknowledgedAt ?? alert.detail_confirmed_at,
              saveError: null,
            }
          : item,
      ),
    );
  } catch (error) {
    setAlertHistory((previous) =>
      previous.map((item) =>
        item.id === record.id ? { ...item, saveError: error.message } : item,
      ),
    );
  }
}

export default function useAlerts(getRecord, showHistory, imagesBySet) {
  const [sessionAlerts, setAlertHistory] = useState([]);
  const [storedAlerts, setStoredAlerts] = useState([]);
  const [historyMessage, setHistoryMessage] = useState("");
  const [historyRequest, setHistoryRequest] = useState(0);
  const [confirmingId, setConfirmingId] = useState(null);
  const observedAlerts = useRef(new Set());
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
        record.image.name,
        record.wear,
        record.source,
        record.status.level,
      ]),
    }));

  const alerts = activeAlerts.filter(
    (record) => dismissedAlerts[record.set] !== record.alertKey,
  );

  // 최초 관측 시 DB에 저장할 수 있는 알림을 등록합니다.
  const alertSnapshot = JSON.stringify(activeAlerts);
  useEffect(() => {
    const detected = JSON.parse(alertSnapshot);
    const additions = [];
    for (const record of detected) {
      const id = JSON.stringify([record.set, record.alertKey]);
      if (observedAlerts.current.has(id)) continue;
      observedAlerts.current.add(id);
      additions.push({
        ...record,
        id,
        observedAt: new Date().toISOString(),
        acknowledgedAt: null,
      });
    }
    if (additions.length) {
      setAlertHistory((previous) => [...additions, ...previous]);
      for (const record of additions) {
        if (record.prediction?.predictionId && !record.testing) {
          void saveAlert(record, setAlertHistory);
        }
      }
    }
  }, [alertSnapshot]);

  useEffect(() => {
    if (!showHistory) return;
    const controller = new AbortController();
    let refreshTimer;
    setHistoryMessage("DB 알림 이력을 불러오는 중입니다.");

    async function loadHistory() {
      try {
        const rows = [];
        const limit = 100;
        for (let offset = 0; ; offset += limit) {
          const response = await fetch(
            `${API_BASE}/api/alerts?limit=${limit}&offset=${offset}`,
            {
              signal: controller.signal,
            },
          );
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const { items } = await response.json();
          rows.push(...items);
          if (items.length < limit) break;
        }
        // DB 알림 이력은 다른 사용자가 확인할 수 있으므로, 5초마다 새로고침
        if (controller.signal.aborted) return;
        const uniqueRows = [...new Map(rows.map((row) => [row.id, row])).values()];
        setStoredAlerts((previous) => {
          // 조회 도중 확인 요청이 완료되면 이전 조회 결과의 NULL을 덮어쓰지 않습니다.
          const confirmedAtById = new Map(
            previous.map((row) => [row.id, row.detail_confirmed_at]),
          );
          return uniqueRows.map((row) => ({
            ...row,
            detail_confirmed_at:
              row.detail_confirmed_at ?? confirmedAtById.get(row.id) ?? null,
          }));
        });
        setHistoryMessage("");
      } catch (error) {
        if (!controller.signal.aborted) {
          setHistoryMessage(`DB 알림 이력 조회 실패: ${error.message}`);
        }
      } finally {
        if (!controller.signal.aborted) {
          refreshTimer = setTimeout(loadHistory, HISTORY_REFRESH_MS);
        }
      }
    }
    void loadHistory();
    return () => {
      clearTimeout(refreshTimer);
      controller.abort();
    };
  }, [showHistory, historyRequest]);

  const storedByPrediction = new Map(
    storedAlerts.map((row) => [
      row.prediction_id,
      historyRecord(row, imagesBySet),
    ]),
  );
  const alertHistory = [...storedByPrediction.values()];
  const shownPredictions = new Set();
  for (const item of sessionAlerts) {
    const predictionId = item.prediction?.predictionId;
    if (!item.testing && predictionId) {
      const stored = storedByPrediction.get(predictionId);
      if (shownPredictions.has(predictionId)) continue;
      shownPredictions.add(predictionId);
      if (stored) {
        stored.id = item.id;
        stored.acknowledgedAt ??= item.acknowledgedAt;
        continue;
      }
    }
    alertHistory.push(item);
  }
  alertHistory.sort((a, b) => new Date(b.observedAt) - new Date(a.observedAt));

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

    if (!record.dbAlertId || confirmingId !== null) return;

    setConfirmingId(record.dbAlertId);
    try {
      const confirmed = await fetch(
        `${API_BASE}/api/alerts/${record.dbAlertId}/acknowledge`,
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

      setAlertHistory((previous) =>
        previous.map((item) =>
          item.prediction?.predictionId === record.prediction.predictionId &&
          !item.testing
            ? { ...item, acknowledgedAt: confirmedAt }
            : item,
        ),
      );
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
  function retrySaveAlert(record) {
    if (!record.saveError) return;
    setAlertHistory((previous) =>
      previous.map((item) =>
        item.id === record.id ? { ...item, saveError: null } : item,
      ),
    );
    void saveAlert(record, setAlertHistory);
  }

  return {
    alertHistory,
    alerts,
    setDismissedAlerts,
    selectedAlert,
    acknowledgeAlert,
    retrySaveAlert,
    confirmingId,
    historyMessage,
    reloadHistory: () => setHistoryRequest((value) => value + 1),
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
