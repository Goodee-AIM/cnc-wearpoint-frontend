import { wearAdviceKey } from "../../utils/wearAdvice.js";
import { useTranslation } from "react-i18next";
import { useEffect, useRef } from "react";
import { getSetName } from "../../utils/setDisplay.js";
export default function HistoryPopover({
  open,
  alerts = [],
  onClose,
  onDismiss,
  onRestore,
  onSelectSet,
  onViewAll,
}) {
  const { t } = useTranslation();
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
      aria-label={t("popover.title")}
    >
      <div className="history-heading">
        <h2>
          {t("popover.title")} <span>{alerts.length}</span>
        </h2>
        <button
          ref={close}
          className="icon-button"
          onClick={onClose}
          aria-label={t("popover.close")}
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
                  <span>{getSetName(r.setNumber)}</span>
                  <span className="history-level">
                    {t(`status.${r.level}`)}
                  </span>
                </h3>
                <button
                  className="dismiss-alert"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDismiss?.(r);
                  }}
                  aria-label={t("popover.dismiss", { name: getSetName(r.setNumber) })}
                  title={t("popover.hide")}
                >
                  ✕
                </button>
              </div>
              <h4>
                {t(wearAdviceKey(r.level, r.wearType))}
              </h4>
              <p className="history-filename">
                {r.image?.filename || t("image.waiting")}
              </p>
              <div className="history-reading">
                <span>{t(r.basis === "prediction" ? "alerts.predictedWearBasis" : "alerts.labelWearBasis")}</span>
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
                  {t("popover.viewSet", { name: getSetName(r.setNumber) })}
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="history-empty">
            <span>✓</span>
            <p>{t("popover.empty")}</p>
            {onRestore && (
              <button onClick={onRestore}>{t("popover.restore")}</button>
            )}
          </div>
        )}
      </div>
      <div className="history-footer">
        <span>{t("popover.latest")}</span>
        <button className="text-link" onClick={onViewAll}>
          {t("popover.viewAll")}
        </button>
      </div>
    </section>
  );
}
