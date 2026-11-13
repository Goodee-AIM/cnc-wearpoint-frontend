import { useEffect, useRef, useState } from "react";
export function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={
          name === "expand"
            ? "M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"
            : "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"
        }
      />
    </svg>
  );
}
export function Header({
  page = "dashboard",
  alertCount = 0,
  onDashboard,
  onAlerts,
  onHistory,
  historyOpen = false,
  demo = false,
}) {
  return (
    <header>
      <a
        className="brand"
        href="#monitoring"
        onClick={(e) => {
          e.preventDefault();
          onDashboard?.();
        }}
      >
        <span className="logo" translate="no">AIM</span>
        <span className="brand-separator" aria-hidden="true">
          |
        </span>
        <span className="brand-name">공구 마모 진단 대시보드</span>
      </a>
      <div className="header-actions">
        {demo && (
          <span className="preview">
            <i /> UI 미리보기
          </span>
        )}
        {page === "dashboard" ? (
          <>
            <button className="alert-button" onClick={onAlerts}>
              <Icon name="bell" />
              알림 이력 <span>{alertCount}</span>
            </button>
            <button
              aria-expanded={historyOpen}
              aria-controls="history-panel"
              onClick={onHistory}
            >
              현재 알림 <span className="arrow">↗</span>
            </button>
          </>
        ) : (
          <button onClick={onDashboard}>← 전체 모니터링으로</button>
        )}
      </div>
    </header>
  );
}
export function Footer({ page = "dashboard" }) {
  return (
    <footer>
      <span>
        <span className="footer-logo">AIM</span> CNC WearPoint
      </span>
    </footer>
  );
}
export function ImageCard({
  image,
  caption = "공구 이미지",
  setNumber,
  onExpand,
  alert = false,
}) {
  return (
    <article className="card image-card">
      <div className="card-heading">
        <h2>
          {caption}
        </h2>
        {onExpand ? (
          <button
            className="icon-button"
            onClick={onExpand}
            aria-label="공구 이미지 크게 보기"
          >
            <Icon name="expand" />
          </button>
        ) : (
          <span className="detail-set">Set {setNumber}</span>
        )}
      </div>
      <div className={alert ? "alert-image-wrap" : "image-wrap"}>
        {image?.url ? (
          <img src={image.url} alt={image.alt || "공구 마모 이미지"} />
        ) : (
          <div className="no-data">이미지 대기</div>
        )}
      </div>
      <div className="image-info">
        <span title={image?.filename}>{image?.filename || "이미지 파일 대기"}</span>
      </div>
      {!alert && (
        <div className="timestamp">
          <span>센서 측정 시간</span>
          <time>{image?.sensorTime || "측정 시간 대기"}</time>
        </div>
      )}
    </article>
  );
}
export function PredictionCard({ value }) {
  return (
    <article className="card metric">
      <div className="metric-title">예측 마모량</div>
      <div className="metric-value">
        {value == null ? <span className="missing-value">예측 결과 없음</span> : <>{value.toFixed(2)} <span>μm</span></>}
      </div>
    </article>
  );
}
export function WearTypeCard({ type, label, legend = false }) {
  return (
    <article className="card metric wear">
      <div className="metric-title">마모 유형</div>
      <div className="wear-value">
        {label || "판정 대기"}
      </div>
    </article>
  );
}
export function ImageModal({ image, setNumber, onClose }) {
  const dialogRef = useRef(null);
  const viewportRef = useRef(null);
  const dragRef = useRef(null);
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const confine = (nextScale, x, y) => {
    const viewport = viewportRef.current;
    if (!viewport) return { scale: nextScale, x, y };
    const maxX = (viewport.clientWidth * (nextScale - 1)) / 2;
    const maxY = (viewport.clientHeight * (nextScale - 1)) / 2;
    return {
      scale: nextScale,
      x: clamp(x, -maxX, maxX),
      y: clamp(y, -maxY, maxY),
    };
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (typeof dialog?.showModal === "function") dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  // 휠을 움직인 위치를 중심으로 확대·축소합니다.
  const handleWheel = (event) => {
    event.preventDefault();
    const bounds = viewportRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const mx = event.clientX - bounds.left - bounds.width / 2;
    const my = event.clientY - bounds.top - bounds.height / 2;
    setView((prev) => {
      const scale = clamp(prev.scale * (event.deltaY < 0 ? 1.15 : 1 / 1.15), 1, 5);
      const ratio = scale / prev.scale;
      return confine(scale, mx - (mx - prev.x) * ratio, my - (my - prev.y) * ratio);
    });
  };

  const handlePointerDown = (event) => {
    if (event.button !== 0 || view.scale <= 1) return;
    event.preventDefault();
    dragRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    dragRef.current = { ...drag, x: event.clientX, y: event.clientY };
    setView((prev) => confine(prev.scale, prev.x + dx, prev.y + dy));
  };
  const handlePointerUp = (event) => {
    if (dragRef.current?.id === event.pointerId) dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <dialog
      className="image-zoom-dialog"
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) {
          const r = dialogRef.current.getBoundingClientRect();
          if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) onClose();
        }
      }}
    >
      <div className="modal-head">
        <h2>Set {setNumber} · 공구 이미지</h2>
        <div className="image-zoom-controls">
          <span aria-live="polite">{Math.round(view.scale * 100)}%</span>
          <button type="button" onClick={() => setView({ scale: 1, x: 0, y: 0 })}>
            초기화
          </button>
          <button type="button" onClick={onClose} aria-label="닫기">✕</button>
        </div>
      </div>
      <div
        ref={viewportRef}
        className={"modal-image image-zoom-viewport" + (view.scale > 1 ? " is-zoomed" : "")}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={() => setView({ scale: 1, x: 0, y: 0 })}
      >
        {image?.url ? (
          <img
            src={image.url}
            alt={image.alt || "공구 마모 확대 이미지"}
            draggable={false}
            style={{ transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})` }}
          />
        ) : (
          <p>이미지 대기</p>
        )}
      </div>
      <p className="image-zoom-help">마우스 휠: 확대·축소 · 드래그: 이동 · 더블 클릭: 초기화</p>
    </dialog>
  );
}
