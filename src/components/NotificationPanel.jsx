// Set별 사이드 알림 패널 구성
import { formatWear } from "../utils/wear.js";

export default function NotificationPanel({
  alerts,
  setDismissedAlerts,
  changeSet,
}) {
  return (
    <aside className="notification-panel">
      <div className="notification-heading">
        <h2>전체 Set 알림</h2>
        <span>{alerts.length}</span>
      </div>

      <div className="notification-content">
        {alerts.length ? (
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
                fontSize: 12,
                lineHeight: 1.9,
              }}
            >
              <button
                type="button"
                aria-label={`Set${record.set} 알림 닫기`}
                title="알림 닫기"
                onClick={() =>
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
                  borderRadius: 5,
                  background: "transparent",
                  color: record.status.color,
                  fontSize: 22,
                  lineHeight: 1,
                  cursor: "pointer",
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
              <p style={{ color: "#64748b", marginTop: 8 }}>
                {record.testing ? "테스트 입력값" : "저장 데이터 기준"}
              </p>

              <button
                style={{ marginTop: 10 }}
                onClick={() => changeSet(record.set)}
              >
                Set{record.set} 보기
              </button>
            </div>
          ))
        ) : (
          <p style={{ fontSize: 12, color: "#64748b" }}>
            현재 경고·위험 알림이 없습니다.
          </p>
        )}
      </div>

      <p className="notification-footer">Set별 최신 상태 · 전체 공통 표시</p>
    </aside>
  );
}
