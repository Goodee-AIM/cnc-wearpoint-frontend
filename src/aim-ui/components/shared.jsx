import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";


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
    const { t, i18n } = useTranslation();

    const [languageOpen, setLanguageOpen] = useState(false);
    const languageRef = useRef(null);

    const currentLanguage =
        i18n.resolvedLanguage?.startsWith("en") ? "en" : "ko";

    const currentLanguageCode =
        currentLanguage === "ko" ? "KR" : "EN";

    const otherLanguage =
        currentLanguage === "ko"
            ? { code: "en", label: "EN" }
            : { code: "ko", label: "KR" };

    const selectLanguage = async (language) => {
        await i18n.changeLanguage(language);
        localStorage.setItem("language", language);
        setLanguageOpen(false);
    };

    useEffect(() => {
        if (!languageOpen) {
            return;
        }

        const handleOutsideClick = (event) => {
            if (
                languageRef.current &&
                !languageRef.current.contains(event.target)
            ) {
                setLanguageOpen(false);
            }
        };

        const handleEscape = (event) => {
            if (event.key === "Escape") {
                setLanguageOpen(false);
            }
        };

        document.addEventListener("pointerdown", handleOutsideClick);
        document.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener("pointerdown", handleOutsideClick);
            document.removeEventListener("keydown", handleEscape);
        };
    }, [languageOpen]);

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
        <span className="logo" translate="no">
          AIM
        </span>

                <span
                    className="brand-separator"
                    aria-hidden="true"
                >
          |
        </span>

                <span className="brand-name">
          {t("app.title")}
        </span>
            </a>

            <div className="header-actions">
                {demo && (
                    <span className="preview">
            <i />
                        {t("header.preview")}
          </span>
                )}

                {page === "dashboard" ? (
                    <>
                        <button
                            className="alert-button"
                            onClick={onAlerts}
                        >
                            <Icon name="bell" />
                            {t("header.alertHistory")}{" "}
                            <span>{alertCount}</span>
                        </button>

                        <button
                            aria-expanded={historyOpen}
                            aria-controls="history-panel"
                            onClick={onHistory}
                        >
                            {t("header.currentAlerts")}{" "}
                            <span className="arrow">↗</span>
                        </button>
                    </>
                ) : (
                    <button onClick={onDashboard}>
                        ← {t("header.backToMonitoring")}
                    </button>
                )}

                <div
                    className="language-dropdown"
                    ref={languageRef}
                >
                    <button
                        type="button"
                        className="language-trigger"
                        aria-label={t("header.language")}
                        aria-haspopup="menu"
                        aria-expanded={languageOpen}
                        onClick={() =>
                            setLanguageOpen((open) => !open)
                        }
                    >
                        <svg
                            className="language-globe"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <circle cx="12" cy="12" r="9" />
                            <path d="M3 12h18" />
                            <path d="M12 3c2.8 2.5 4.2 5.5 4.2 9S14.8 18.5 12 21" />
                            <path d="M12 3C9.2 5.5 7.8 8.5 7.8 12S9.2 18.5 12 21" />
                        </svg>

                        <span>{t("header.languageLabel")}</span>

                        <svg
                            className={
                                "language-chevron" +
                                (languageOpen ? " open" : "")
                            }
                            viewBox="0 0 20 20"
                            aria-hidden="true"
                        >
                            <path d="m6 8 4 4 4-4" />
                        </svg>
                    </button>

                    {languageOpen && (
                        <div
                            className="language-dropdown-menu"
                            role="menu"
                        >
                            <div className="language-current">
                <span>
                  {t("header.currentLanguage")}
                </span>

                                <strong>
                                    {currentLanguageCode}
                                </strong>
                            </div>

                            <div className="language-menu-divider" />

                            <button
                                type="button"
                                className="language-option"
                                role="menuitem"
                                onClick={() =>
                                    selectLanguage(otherLanguage.code)
                                }
                            >
                <span>
                  {otherLanguage.label}
                </span>

                                <svg
                                    className="language-switch-icon"
                                    viewBox="0 0 20 20"
                                    aria-hidden="true"
                                >
                                    <path d="M11 4h5v5" />
                                    <path d="m16 4-7 7" />
                                    <path d="M14 11v4H5V6h4" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}


export function Footer({ page = "dashboard" }) {
  return (
      <footer>
      <span>
        <span className="footer-logo">
          AIM
        </span>{" "}
        CNC WearPoint
      </span>
      </footer>
  );
}


export function ImageCard({
                            image,
                            caption,
                            setNumber,
                            onExpand,
                            alert = false,
                          }) {
  const { t } = useTranslation();

  const displayCaption =
      caption || t("image.toolImage");

  return (
      <article className="card image-card">
        <div className="card-heading">
          <h2>
            {displayCaption}
          </h2>

          {onExpand ? (
              <button
                  className="icon-button"
                  onClick={onExpand}
                  aria-label={t("image.expand")}
              >
                <Icon name="expand" />
              </button>
          ) : (
              <span className="detail-set">
            Set {setNumber}
          </span>
          )}
        </div>

        <div
            className={
              alert
                  ? "alert-image-wrap"
                  : "image-wrap"
            }
        >
          {image?.url ? (
              <img
                  src={image.url}
                  alt={
                      image.alt ||
                      t("image.toolWearImage")
                  }
              />
          ) : (
              <div className="no-data">
                {t("image.waiting")}
              </div>
          )}
        </div>

        <div className="image-info">
        <span title={image?.filename}>
          {image?.filename ||
              t("image.fileWaiting")}
        </span>
        </div>

        {!alert && (
            <div className="timestamp">
          <span>
            {t("image.sensorTime")}
          </span>

              <time>
                {image?.sensorTime ||
                    t("image.timeWaiting")}
              </time>
            </div>
        )}
      </article>
  );
}


export function PredictionCard({ value }) {
  const { t } = useTranslation();

  return (
      <article className="card metric">
        <div className="metric-title">
          {t("prediction.predictedWear")}
        </div>

        <div className="metric-value">
          {value == null ? (
              <span className="missing-value">
            {t("prediction.noResult")}
          </span>
          ) : (
              <>
                {value.toFixed(2)}{" "}
                <span>μm</span>
              </>
          )}
        </div>
      </article>
  );
}


export function WearTypeCard({
                                 type,
                                 label,
                                 legend = false,
                             }) {
    const { t } = useTranslation();

    const translatedType =
        type
            ? t(`wearType.${type}`, {
                defaultValue: "",
            })
            : "";

    const displayLabel =
        translatedType || t("prediction.noType");

    return (
        <article className="card metric wear">
            <div className="metric-title">
                {t("prediction.wearType")}
            </div>

            <div className="wear-value">
                {displayLabel}
            </div>
        </article>
    );
}


export function ImageModal({
                             image,
                             setNumber,
                             onClose,
                           }) {
  const { t } = useTranslation();

  const dialogRef = useRef(null);
  const viewportRef = useRef(null);
  const dragRef = useRef(null);

  const [view, setView] = useState({
    scale: 1,
    x: 0,
    y: 0,
  });

  const clamp = (value, min, max) =>
      Math.min(max, Math.max(min, value));

  const confine = (
      nextScale,
      x,
      y,
  ) => {
    const viewport =
        viewportRef.current;

    if (!viewport) {
      return {
        scale: nextScale,
        x,
        y,
      };
    }

    const maxX =
        (viewport.clientWidth *
            (nextScale - 1)) /
        2;

    const maxY =
        (viewport.clientHeight *
            (nextScale - 1)) /
        2;

    return {
      scale: nextScale,
      x: clamp(x, -maxX, maxX),
      y: clamp(y, -maxY, maxY),
    };
  };

  useEffect(() => {
    const dialog = dialogRef.current;

    if (
        typeof dialog?.showModal ===
        "function"
    ) {
      dialog.showModal();
    }

    return () => {
      if (dialog?.open) {
        dialog.close();
      }
    };
  }, []);

  // 휠을 움직인 위치를 중심으로 확대·축소합니다.
  const handleWheel = (event) => {
    event.preventDefault();

    const bounds =
        viewportRef.current?.getBoundingClientRect();

    if (!bounds) {
      return;
    }

    const mx =
        event.clientX -
        bounds.left -
        bounds.width / 2;

    const my =
        event.clientY -
        bounds.top -
        bounds.height / 2;

    setView((prev) => {
      const scale = clamp(
          prev.scale *
          (event.deltaY < 0
              ? 1.15
              : 1 / 1.15),
          1,
          5,
      );

      const ratio =
          scale / prev.scale;

      return confine(
          scale,
          mx -
          (mx - prev.x) * ratio,
          my -
          (my - prev.y) * ratio,
      );
    });
  };

  const handlePointerDown = (
      event,
  ) => {
    if (
        event.button !== 0 ||
        view.scale <= 1
    ) {
      return;
    }

    event.preventDefault();

    dragRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };

    event.currentTarget.setPointerCapture(
        event.pointerId,
    );
  };

  const handlePointerMove = (
      event,
  ) => {
    const drag =
        dragRef.current;

    if (
        !drag ||
        drag.id !== event.pointerId
    ) {
      return;
    }

    const dx =
        event.clientX - drag.x;

    const dy =
        event.clientY - drag.y;

    dragRef.current = {
      ...drag,
      x: event.clientX,
      y: event.clientY,
    };

    setView((prev) =>
        confine(
            prev.scale,
            prev.x + dx,
            prev.y + dy,
        ),
    );
  };

  const handlePointerUp = (
      event,
  ) => {
    if (
        dragRef.current?.id ===
        event.pointerId
    ) {
      dragRef.current = null;
    }

    if (
        event.currentTarget.hasPointerCapture(
            event.pointerId,
        )
    ) {
      event.currentTarget.releasePointerCapture(
          event.pointerId,
      );
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
            if (
                event.target ===
                dialogRef.current
            ) {
              const r =
                  dialogRef.current.getBoundingClientRect();

              if (
                  event.clientX < r.left ||
                  event.clientX > r.right ||
                  event.clientY < r.top ||
                  event.clientY > r.bottom
              ) {
                onClose();
              }
            }
          }}
      >
        <div className="modal-head">
          <h2>
            {t("image.modalTitle", {
              setNumber,
            })}
          </h2>

          <div className="image-zoom-controls">
          <span aria-live="polite">
            {Math.round(
                view.scale * 100,
            )}
            %
          </span>

            <button
                type="button"
                onClick={() =>
                    setView({
                      scale: 1,
                      x: 0,
                      y: 0,
                    })
                }
            >
              {t("common.reset")}
            </button>

            <button
                type="button"
                onClick={onClose}
                aria-label={t(
                    "common.close",
                )}
            >
              ✕
            </button>
          </div>
        </div>

        <div
            ref={viewportRef}
            className={
                "modal-image image-zoom-viewport" +
                (view.scale > 1
                    ? " is-zoomed"
                    : "")
            }
            onWheel={handleWheel}
            onPointerDown={
              handlePointerDown
            }
            onPointerMove={
              handlePointerMove
            }
            onPointerUp={handlePointerUp}
            onPointerCancel={
              handlePointerUp
            }
            onDoubleClick={() =>
                setView({
                  scale: 1,
                  x: 0,
                  y: 0,
                })
            }
        >
          {image?.url ? (
              <img
                  src={image.url}
                  alt={
                      image.alt ||
                      t(
                          "image.zoomedToolWearImage",
                      )
                  }
                  draggable={false}
                  style={{
                    transform:
                        `translate3d(${view.x}px, ${view.y}px, 0) ` +
                        `scale(${view.scale})`,
                  }}
              />
          ) : (
              <p>
                {t("image.waiting")}
              </p>
          )}
        </div>

        <p className="image-zoom-help">
          {t("image.zoomHelp")}
        </p>
      </dialog>
  );
}