// 화면만 새 UI로 교체합니다. 서버 조회·재생·알림 확인은 기존 hook이 담당합니다.
import useDashboard from "./hooks/useDashboard.js";
import AimUI from "./aim-ui/components/AimUI.jsx";
import { SETS } from "./dashboardConfig.js";
import { toAlert, toMeasurement, toSensorChannels } from "./aim-ui/adapters.js";
import { matchingReplayPrediction, sameReplayOccurrence } from "./utils/monitoringRunIdentity.js";
import { gatedAlertRecords } from "./utils/gatedAlertFeed.js";
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
  // Never show ground-truth labels as AI predictions in gated replay mode.
  const measurement = monitoring.gatedPlayback ? {
    ...originalMeasurement,
    judgedWear: null,
    predictedWear: prediction?.predictedWear ?? null,
    wearType: prediction?.wearType ?? null,
    wearTypeLabel: prediction?.wearTypeLabel ?? null,
    status: prediction?.status ?? 'pending',
    basis: 'prediction',
  } : originalMeasurement;
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
      onReturnLive={(setNumber) => dashboard.returnToMonitoring(setNumber)}
      playbackStatus={monitoring.setStatus}
      dataMessage={monitoring.dataMessage}
      gatedPlayback={monitoring.gatedPlayback}
      playbackPhase={playback?.playback_phase}
      inferenceState={monitoring.inferenceError ? 'unavailable'
        : (playback?.playback_phase === 'showing' && ['failed', 'cancelled'].includes(matchingRun?.status)
          ? 'failed' : '')}
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
