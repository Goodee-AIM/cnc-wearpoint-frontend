import DashboardHeader from "./components/DashboardHeader.jsx";
import SetNavigation from "./components/SetNavigation.jsx";
import PlaybackControls from "./components/PlaybackControls.jsx";
import DataSourceSettings from "./components/DataSourceSettings.jsx";
import PhotoSettings from "./components/PhotoSettings.jsx";
import SensorSettings from "./components/SensorSettings.jsx";
import MonitoringView from "./components/MonitoringView.jsx";
import DiagnosisPanel from "./components/DiagnosisPanel.jsx";
import NotificationPanel from "./components/NotificationPanel.jsx";
import AlertsPage from "./components/AlertsPage.jsx";
import useDashboard from "./hooks/useDashboard.js";
import "./App.css";

export default function App() {
  const dashboard = useDashboard();
  const { page, selectedSet, unifiedMode } = dashboard;

  return (
    <div className="dashboard">
      <DashboardHeader {...dashboard.header} />

      <div
        className="dashboard-body"
        style={page === "alerts" ? { display: "none" } : undefined}
      >
        <main className="main-panel">
          <SetNavigation {...dashboard.navigation} />

          <div className="main-content">
            <div className="section-heading">
              <h2>Set{selectedSet} 모니터링</h2>
              <span className="demo-badge">저장 결과 재생</span>
            </div>

            <PlaybackControls {...dashboard.playback} />
            <details
              className="data-settings"
              style={{ display: unifiedMode ? "none" : undefined }}
            >
              <summary>데이터 설정 및 재생</summary>
              <div className="settings-content">
                <DataSourceSettings {...dashboard.sources} />
                <PhotoSettings {...dashboard.photos} />
                <SensorSettings {...dashboard.sensorSettings} />
              </div>
            </details>

            <MonitoringView {...dashboard.monitoring} />
            <DiagnosisPanel {...dashboard.diagnosis} />
          </div>
        </main>

        <NotificationPanel {...dashboard.notifications} />
      </div>

      {page === "alerts" && <AlertsPage {...dashboard.alertPage} />}
    </div>
  );
}
