import { useEffect, useRef } from "react";
export default function HistoryPopover({
  open,
  alerts = [],
  onClose,
  onDismiss,
  onRestore,
  onSelectSet,
  onViewAll,
}) {
  const panel = useRef(null),
    close = useRef(null);
  useEffect(() => {
    if (!open) return;
    close.current?.focus();
    const outside = (e) => {
      if (
        !panel.current?.contains(e.target) &&
        !e.target.closest('[aria-controls="history-panel"]')
      )
        onClose();
    };
    const escape = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("click", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("click", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <section
      ref={panel}
      className="history-panel"
      id="history-panel"
      role="dialog"
      aria-label="현재 Set별 알림"
    >
      <div className="history-heading">
        <h2>
          현재 Set별 알림 <span>{alerts.length}</span>
        </h2>
        <button
          ref={close}
          className="icon-button"
          onClick={onClose}
          aria-label="알림 내역 닫기"
        >
          ✕
        </button>
      </div>
      <div className="history-body">
        {alerts.length ? (
          alerts.map((r) => (
            <article key={r.id} className={"history-alert " + r.level}>
              <div className="history-alert-heading">
                <h3>
                  <span>Set {r.setNumber}</span>
                  <span className="history-level">
                    {r.level === "danger" ? "위험" : "경고"}
                  </span>
                </h3>
                <button
                  className="dismiss-alert"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDismiss?.(r);
                  }}
                  aria-label={`Set ${r.setNumber} 알림 카드 닫기`}
                  title="이 팝업에서 숨기기"
                >
                  ✕
                </button>
              </div>
              <h4>
                {r.level === "danger" ? "공구 교체 필요" : "마모 상태 확인"}
              </h4>
              <p className="history-filename">
                {r.image?.filename || "이미지 대기"}
              </p>
              <div className="history-reading">
                <span>{r.basis === "prediction" ? "예측" : "라벨"} 마모량</span>
                <b>
                  {(r.judgedWear == null ? "—" : r.judgedWear.toFixed(2))} <small>μm</small>
                </b>
              </div>
              <div className="history-alert-bottom">
                <button
                  onClick={() => {
                    onSelectSet(r);
                    onClose();
                  }}
                >
                  Set {r.setNumber} 보기 ↗
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="history-empty">
            <span>✓</span>
            <p>표시할 알림이 없습니다.</p>
            {onRestore && (
              <button onClick={onRestore}>숨긴 알림 다시 보기</button>
            )}
          </div>
        )}
      </div>
      <div className="history-footer">
        <span>Set별 최신 상태 · 전체 공통 표시</span>
        <button className="text-link" onClick={onViewAll}>
          전체 알림 보기 ↗
        </button>
      </div>
    </section>
  );
}
