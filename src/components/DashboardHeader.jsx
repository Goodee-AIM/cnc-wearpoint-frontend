// 상단 제목과 페이지 이동 버튼. 미확인 건수는 alertHistory를 통해 계산
export default function DashboardHeader({
  page,
  setPage,
  alertHistory,
  children,
}) {
  const isAlertsPage = page === "alerts";
  const unreadCount = alertHistory.filter(
    (record) => !record.acknowledgedAt,
  ).length;

  return (
    <header className="header">
      <h1 translate="no">AIM</h1>
      <span>
        {isAlertsPage
          ? "경고·위험 알림 대시보드"
          : "공구 마모 진단 대시보드"}
      </span>

      <div className="header-actions">
        <button
          type="button"
          className="page-switch"
          onClick={() => setPage(isAlertsPage ? "monitoring" : "alerts")}
        >
          {isAlertsPage
            ? "전체 모니터링으로"
            : `경고·위험 알림 보기 (${unreadCount})`}
        </button>
        {children}
      </div>
    </header>
  );
}