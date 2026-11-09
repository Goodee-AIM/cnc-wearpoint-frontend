// 서비스 제목을 표시하고 모니터링과 알림 이력 화면 사이를 전환

export default function DashboardHeader({ page, setPage, alertHistory }) {
  return (
    <header className="header">
      <h1 translate="no">AIM</h1>
      <span>
        {page === "alerts"
          ? "경고·위험 알림 대시보드"
          : "공구 마모 진단 대시보드"}
      </span>
      <button
        type="button"
        className="page-switch"
        onClick={() => setPage(page === "alerts" ? "monitoring" : "alerts")}
      >
        {page === "alerts"
          ? "전체 모니터링으로"
          : `경고·위험 알림 보기 (${alertHistory.filter((record) => !record.acknowledgedAt).length})`}
      </button>
    </header>
  );
}
