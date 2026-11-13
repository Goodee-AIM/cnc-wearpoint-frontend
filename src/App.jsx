// 화면만 새 UI로 교체합니다. 서버 조회·재생·알림 확인은 기존 hook이 담당합니다.
import useDashboard from "./hooks/useDashboard.js";
import AimUI from "./aim-ui/components/AimUI.jsx";
import { SETS } from "./dashboardConfig.js";
import { toAlert, toMeasurement, toSensorChannels } from "./aim-ui/adapters.js";
import "./aim-ui/styles/global.css";
import "./aim-ui/styles/alerts.css";
import "./aim-ui/styles/integration.css";

export default function App() {
  const dashboard = useDashboard();
  const { monitoring, alertPage, notifications } = dashboard;
  const measurement = toMeasurement(
    dashboard.diagnosis.current,
    monitoring.currentImage,
    monitoring.visibleRows.at(-1)?.time,
  );
  const alerts = alertPage.filteredAlerts.map(toAlert);
  const latestAlerts = notifications.alerts.map(toAlert);
  return (
    <AimUI
      page={dashboard.page === "alerts" ? "alerts" : "dashboard"}
      sets={SETS.map((number) => ({ number }))}
      selectedSet={dashboard.selectedSet}
      onSelectSet={dashboard.navigation.changeSet}
      measurement={measurement}
      channels={toSensorChannels(monitoring.visibleRows, monitoring.sensorStartMs)}
      cursorSeconds={monitoring.elapsedMs / 1000}
      preview={!dashboard.unifiedMode}
      onReturnLive={() => dashboard.returnToMonitoring()}
      playbackStatus={monitoring.setStatus}
      dataMessage={monitoring.dataMessage}
      alerts={alerts}
      latestAlerts={latestAlerts}
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
