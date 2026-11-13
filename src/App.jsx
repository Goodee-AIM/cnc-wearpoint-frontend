// 화면의 조립 지점. 상태와 이벤트는 useDashboard에서 받고 각 컴포넌트에는 필요한 props 묶음을 전달합니다.
import DashboardHeader from "./components/DashboardHeader.jsx";
import SetNavigation from "./components/SetNavigation.jsx";
import MonitoringView from "./components/MonitoringView.jsx";
import DiagnosisPanel from "./components/DiagnosisPanel.jsx";
import NotificationPanel from "./components/NotificationPanel.jsx";
import AlertsPage from "./components/AlertsPage.jsx";
import useDashboard from "./hooks/useDashboard.js";
import "./App.css";

export default function App() {
  const dashboard = useDashboard();
  const { page, selectedSet, unifiedMode, returnToMonitoring } = dashboard;

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
          {unifiedMode && <SetNavigation {...dashboard.navigation} />}

          <div className="main-content">
            <div className="section-heading">
              <h2>Set{selectedSet} 모니터링</h2>
              {!unifiedMode && (
                <button type="button" className="monitoring-return-button" onClick={returnToMonitoring}>
                  현재 자동 모니터링으로 돌아가기
                </button>
              )}
            </div>

            {/* 데이터는 서버에서 자동 조회합니다. 과거 알림 조회 중에도 수동 선택 UI는 표시하지 않습니다. */}
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