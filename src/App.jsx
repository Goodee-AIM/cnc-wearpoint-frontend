// 화면의 조립 지점. 상태와 이벤트는 useDashboard에서 받고 각 컴포넌트에는 필요한 props 묶음을 전달합니다.
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
      <DashboardHeader {...dashboard.header}>
        {page !== "alerts" && (
          <NotificationPanel {...dashboard.notifications} />
        )}
      </DashboardHeader>

      {/* 알림 페이지에서도 모니터링 영역은 숨겨서 유지합니다. 화면 이동으로 hook의 조회 상태를 새로 만들지 않습니다. */}
      <div className="dashboard-body" hidden={page === "alerts"}>
        <main className="main-panel">
          <SetNavigation {...dashboard.navigation} />

          <div className="main-content">
            <div className="section-heading">
              <h2>Set{selectedSet} 모니터링</h2>

            </div>

            {/* 자동 모드에서는 공통 제어 패널을 숨깁니다. 서버 상태 자동 조회는 useDashboard에서 계속됩니다. */}
            {!unifiedMode && <PlaybackControls {...dashboard.playback} />}
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
      </div>

      {/* 상세 알림 화면은 선택 시에만 표시하고 목록·확인 상태는 상위 hook에서 유지합니다. */}
      {page === "alerts" && <AlertsPage {...dashboard.alertPage} />}
    </div>
  );
}