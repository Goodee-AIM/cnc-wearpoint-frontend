import { getSetName } from "../../utils/setDisplay.js";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import RestartMonitoringButton from "../components/RestartMonitoringButton.jsx";
import SensorCharts from "../components/SensorCharts";
import {
  ImageCard,
  ImageModal,
  PredictionCard,
  WearTypeCard,
  Footer,
} from "../components/shared";

/** Controlled data view: no API calls, playback timer or alert mutation. */
export default function DashboardPage({
                                        sets = [],
                                        selectedSet,
                                        onSelectSet,
                                        measurement,
                                        channels = [],
                                        cursorSeconds = 0,
                                        preview = false,
                                        onReturnLive,
                                        playbackStatus,
                                        onOpenManual,
                                        beforeContent,
                                      }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const status = measurement?.status || "pending";

  const statusCaptionKey = {
    danger: "statusCaption.danger",
    warning: "statusCaption.warning",
    normal: "statusCaption.normal",
    pending: "statusCaption.pending",
  };

  return (
      <>
        <div className={preview ? "monitoring-layout monitoring-layout-preview" : "monitoring-layout"}>
        {!preview && (
            <nav className="set-sidebar" aria-label={t("monitoring.setSelection")}>
              <h2 className="set-sidebar-heading">{t("monitoring.setSelection")}</h2>
              {sets.map((s) => (
                  <button
                      key={s.number}
                      className={"tab" + (s.number === selectedSet ? " active" : "")}
                      aria-pressed={s.number === selectedSet}
                      onClick={() => onSelectSet(s.number)}
                  >
                    {getSetName(s.number)}
                  </button>
              ))}
              {onOpenManual && <button type="button" className={"tab" + (selectedSet === "manual" ? " active" : "")} aria-pressed={selectedSet === "manual"} onClick={onOpenManual}>Set test</button>}
            </nav>
        )}

        <div className="monitoring-content">
        <main>
          <div className={"page-heading" + (beforeContent ? " page-heading-with-input" : "")}>
            <div>
              <div className="eyebrow">
                {t("monitoring.eyebrow")}
              </div>

              <h1>
                {preview
                    ? t("monitoring.historyTitle", {
                      setNumber: getSetName(selectedSet),
                    })
                    : t("monitoring.title", {
                      setNumber: getSetName(selectedSet),
                    })}{" "}

                {measurement?.material && (
                    <span className="small-badge">
                  {measurement.material}
                </span>
                )}
              </h1>
            </div>

            <div className="view-context">
              {beforeContent}
              {!preview && selectedSet !== "manual" && <RestartMonitoringButton />}
              {!preview && selectedSet !== "manual" && (
                  <span>
                {playbackStatus === "completed"
                    ? t("monitoring.roundCompleted")
                    : playbackStatus === "running"
                        ? t("monitoring.autoPlaying")
                        : t("monitoring.loadingServer")}
              </span>
              )}

              {preview && (
                  <button
                      type="button"
                      onClick={onReturnLive}
                  >
                    {t("monitoring.returnLive")}
                  </button>
              )}
            </div>
          </div>

          <section className="workspace">
            <ImageCard
                image={measurement?.image}
                setNumber={selectedSet}
                onExpand={() => setExpanded(true)}
            />

            <SensorCharts
                channels={channels}
                cursorSeconds={cursorSeconds}
            />
          </section>

          <section className="summary">
            <article className={"status-card status-" + status}>
              <div className="status-content">
                <div className="status-kicker">
                  {t("monitoring.currentWearStatus")}
                </div>

                <div className="status-layout">
                <span
                    className={"status-symbol status-symbol-" + status}
                    aria-hidden="true"
                >
                  {status === "normal"
                      ? "✓"
                      : status === "warning"
                          ? "⚠"
                          : status === "danger"
                              ? "!"
                              : "–"}
                </span>

                  <div className="status-texts">
                    <h2>
                      {t(`status.${status}`)}
                    </h2>

                    <p className="status-caption">
                      {t(statusCaptionKey[status])}
                    </p>
                  </div>
                </div>
              </div>
            </article>

            <PredictionCard
                value={measurement?.predictedWear}
            />

            <WearTypeCard
                label={measurement?.wearTypeLabel}
                type={measurement?.wearType}
                legend
            />
          </section>

          <Footer />
        </main>
        </div>
        </div>

        {expanded && (
            <ImageModal
                image={measurement?.image}
                setNumber={selectedSet}
                onClose={() => setExpanded(false)}
            />
        )}
      </>
  );
}