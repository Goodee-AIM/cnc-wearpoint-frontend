// 화면만 새 UI로 교체합니다. 서버 조회·재생·알림 확인은 기존 hook이 담당합니다.
import { useEffect, useState } from "react";
import useDashboard from "./hooks/useDashboard.js";
import AimUI from "./aim-ui/components/AimUI.jsx";
import { SETS } from "./dashboardConfig.js";
import { toAlert, toMeasurement, toSensorChannels } from "./aim-ui/adapters.js";
import { matchingReplayPrediction, sameReplayOccurrence } from "./utils/monitoringRunIdentity.js";
import { gatedAlertRecords } from "./utils/gatedAlertFeed.js";
import { applyAlertPreview, hideHistoricalResult } from "./utils/alertPreview.js";
import { historicalReinferPhase, canRevealFreshInference, freshAlertSnapshot } from "./utils/historicalReinferPhase.js";
const HISTORICAL_REINFER_UI_ENABLED = import.meta.env.VITE_HISTORICAL_REINFER_ENABLED === "1";
import "./aim-ui/styles/global.css";
import "./aim-ui/styles/alerts.css";
import "./aim-ui/styles/integration.css";

export default function App() {
  const dashboard = useDashboard();
  const { monitoring, alertPage, notifications } = dashboard;
  const originalMeasurement = toMeasurement(
    dashboard.diagnosis.current,
    monitoring.currentImage,
    monitoring.visibleRows.at(-1)?.time,
  );
  const playback = monitoring.currentSetPlayback;
  const visible = monitoring.gatedPlayback && playback ? {
    session_id: monitoring.sessionId,
    playback_generation: playback.playback_generation,
    cycle_number: playback.cycle_number,
    set_number: playback.set_number,
    position: playback.position,
    measurement_id: playback.measurement_id,
    playback_phase: playback.playback_phase,
  } : null;
  const matchingRun = monitoring.gatedPlayback
    ? monitoring.inferenceRuns.find((run) => sameReplayOccurrence(visible, run))
    : null;
  const prediction = monitoring.gatedPlayback
    ? matchingReplayPrediction(visible, matchingRun)
    : null;
  // The historical alert is re-inferred by Serving while its saved waveform
  // replays independently. Never show the stored alert value or a DB label as
  // the NEW result; require a completed response for this exact alert ID.
  const historySnapshot = dashboard.diagnosis.alertSnapshot;
  const needsFreshInference = HISTORICAL_REINFER_UI_ENABLED && Boolean(historySnapshot?.alertId);
  const historicalReinfer = dashboard.diagnosis.historicalReinfer;
  const freshResult = needsFreshInference && historicalReinfer?.alertId === historySnapshot.alertId
    && historicalReinfer.status === "completed"
    ? freshAlertSnapshot(historySnapshot, historicalReinfer.result)
    : null;
  const historyImageMatched = Boolean(historySnapshot &&
    applyAlertPreview(originalMeasurement, historySnapshot, dashboard.selectedSet) !== originalMeasurement);
  const historySensor = dashboard.sensorSettings;
  const currentHistorySource = Boolean(historySensor.sensor?.sourceKey &&
    historySensor.sensor.sourceKey === historySensor.sensorSourceKey);
  const historySensorReady = Boolean(historyImageMatched && currentHistorySource &&
    historySensor.sensorRows.length >= 2 && historySensor.duration > 0);
  const historySensorUnavailable = Boolean(historyImageMatched && currentHistorySource &&
    !historySensorReady && (/(?:실패|오류|없습니다)/.test(historySensor.sensorMessage) ||
      /·\s*[01]행\s*·\s*자동 연결/.test(historySensor.sensorMessage)));
  const historyImageUnavailable = Boolean(historySnapshot && !historyImageMatched &&
    /서버 이미지 (?:목록 조회 완료|조회 실패)/.test(dashboard.sources.serverImageMessage));
  const [finishedHistoryHold, setFinishedHistoryHold] = useState(null);
  const historyPlaybackPhase = historicalReinferPhase({
    active: needsFreshInference,
    imageMatched: historyImageMatched,
    imageUnavailable: historyImageUnavailable,
    sensorReady: historySensorReady,
    sensorUnavailable: historySensorUnavailable,
    sensorPlaying: historySensor.sensorPlaying,
    elapsedMs: historySensor.elapsed,
    durationMs: historySensor.duration,
    inferenceStatus: historicalReinfer?.alertId != null &&
      historicalReinfer.alertId === historySnapshot?.alertId
        ? historicalReinfer.status : "loading",
    holdFinished: finishedHistoryHold === historySnapshot,
  });
  useEffect(() => {
    if (historyPlaybackPhase !== "showing" || !historySnapshot) return;
    const timer = window.setTimeout(() => setFinishedHistoryHold(historySnapshot), 3000);
    return () => window.clearTimeout(timer);
  }, [historyPlaybackPhase, historySnapshot]);
  // Never show a stale DB label as an inference, including on Serving failure.
  // Non-occurrence legacy records retain their old preview behavior.
  const historicalMeasurement = needsFreshInference
    ? canRevealFreshInference(historyPlaybackPhase) && freshResult
      ? applyAlertPreview(originalMeasurement, freshResult, dashboard.selectedSet)
      : hideHistoricalResult(originalMeasurement)
    : applyAlertPreview(originalMeasurement, historySnapshot, dashboard.selectedSet);
  // Live gated monitoring remains server-authoritative and unchanged.
  const measurement = monitoring.gatedPlayback ? {
    ...originalMeasurement,
    judgedWear: null,
    predictedWear: prediction?.predictedWear ?? null,
    wearType: prediction?.wearType ?? null,
    wearTypeLabel: prediction?.wearTypeLabel ?? null,
    status: prediction?.status ?? 'pending',
    basis: 'prediction',
  } : historicalMeasurement;
  const liveInferenceAlerts = monitoring.gatedPlayback
    ? gatedAlertRecords(monitoring.sessionId, monitoring.allSetPlayback, monitoring.inferenceRuns)
    : [];
  const alerts = alertPage.filteredAlerts.map(toAlert);
  const latestAlerts = (monitoring.gatedPlayback ? liveInferenceAlerts : notifications.alerts).map(toAlert);
  const toastSource = monitoring.gatedPlayback
    ? { records: liveInferenceAlerts, enabled: monitoring.sharedConnected, playback: monitoring.sharedState }
    : notifications.liveToastSource;
  return (
    <AimUI
      page={dashboard.page === "alerts" ? "alerts" : "dashboard"}
      sets={SETS.map((number) => ({ number }))}
      selectedSet={dashboard.selectedSet}
      onSelectSet={dashboard.navigation.changeSet}
      measurement={measurement}
      channels={toSensorChannels(
  monitoring.visibleRows,
  monitoring.sensorStartMs,
  dashboard.sensorSettings.sensorRows,
)}
      cursorSeconds={monitoring.elapsedMs / 1000}
      preview={!dashboard.unifiedMode}
      historyPlaybackPhase={historyPlaybackPhase}
      onReturnLive={(setNumber) => dashboard.returnToMonitoring(setNumber)}
      playbackStatus={monitoring.setStatus}
      dataMessage={monitoring.dataMessage}
      gatedPlayback={monitoring.gatedPlayback}
      playbackPhase={playback?.playback_phase}
      inferenceState={monitoring.inferenceError ? 'unavailable'
        : (playback?.playback_phase === 'showing' && ['failed', 'cancelled'].includes(matchingRun?.status)
          ? (matchingRun?.error_code === 'INPUT_REJECTED' ? 'input_rejected' : 'failed') : '')}
      alerts={alerts}
      latestAlerts={latestAlerts}
      toastSource={toastSource}
      selectedAlertId={alertPage.selectedAlert?.id}
      onSelectAlert={alertPage.setSelectedAlertId}
      onNavigate={(page) => dashboard.header.setPage(page === "alerts" ? "alerts" : "monitoring")}
      onGoMonitoring={(alert) => alertPage.showAlertSet(alert.original)}
      onCurrentSet={(alert) => dashboard.returnToMonitoring(alert.setNumber)}
      onAcknowledge={(alert) => alertPage.acknowledgeAlert(alert.id)}
      onDismissAlert={(alert) => notifications.setDismissedAlerts((previous) => ({
        ...previous, [alert.setNumber]: alert.original.alertKey,
      }))}
      onRestoreAlerts={() => notifications.setDismissedAlerts({})}
      acknowledgingId={alertPage.confirmingId}
      history={alertPage}
    />
  );
}
