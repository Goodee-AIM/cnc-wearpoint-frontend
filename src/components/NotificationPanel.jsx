// 현재 Set별 경고·위험을 보여주는 팝업. 
// X를 누르면 숨겨짐. DB 알림 확인은 AlertsPage
import { formatWear } from "../utils/wear.js";

export default function NotificationPanel({
  alerts,
  setDismissedAlerts,
  changeSet,
}) {
  return (
    <details className="alert-history-popover">
      <summary className="alert-history-toggle">알림 내역</summary>

      <aside className="notification-panel" aria-label="전체 Set 알림">
        <div className="notification-heading">
          <h2>전체 Set 알림</h2>
          <span>{alerts.length}</span>
        </div>

        <div className="notification-content">
          {alerts.length === 0 ? (
            <p style={{ fontSize: 14, color: "#64748b" }}>
              현재 경고·위험 알림이 없습니다.
            </p>
          ) : (
            alerts.map((record) => (
              <div
                key={record.set}
                style={{
                  position: "relative",
                  padding: 14,
                  paddingRight: 38,
                  marginBottom: 14,
                  border: `1px solid ${record.status.color}`,
                  borderRadius: 10,
                  background: record.status.background,
                  fontSize: 14,
                  lineHeight: 1.9,
                }}
              >
                <button
                  type="button"
                  aria-label={`Set${record.set} 알림 닫기`}
                  title="알림 닫기"
                  onClick={() =>
                    // 회차를 포함한 alertKey만 숨겨 다음 회차의 같은 측정은 다시 표시할 수 있습니다.
                    setDismissedAlerts((previous) => ({
                      ...previous,
                      [record.set]: record.alertKey,
                    }))
                  }
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    display: "grid",
                    placeItems: "center",
                    width: 26,
                    height: 26,
                    padding: 0,
                    border: 0,
                    background: "transparent",
                    color: record.status.color,
                    fontSize: 22,
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>

                <strong style={{ color: record.status.color }}>
                  [Set{record.set}] {record.status.label}
                </strong>

                <p style={{ marginTop: 8, overflowWrap: "anywhere" }}>
                  {record.image.name}
                </p>
                <p style={{ marginTop: 8 }}>
                  {record.source}: {formatWear(record.wear)}
                </p>
                <p style={{ marginTop: 8, color: "#64748b" }}>
                  {record.testing ? "테스트 입력값" : "저장 데이터 기준"}
                </p>

                <button
                  type="button"
                  style={{ marginTop: 10 }}
                  onClick={(event) => {
                    const popover = event.currentTarget.closest("details");
                    changeSet(record.set);
                    if (popover) popover.open = false;
                  }}
                >
                  Set{record.set} 보기
                </button>
              </div>
            ))
          )}
        </div>

        <p className="notification-footer">Set별 최신 상태 · 전체 공통 표시</p>
      </aside>
    </details>
  );
}