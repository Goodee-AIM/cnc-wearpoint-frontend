import { wearAdviceKey } from "../../utils/wearAdvice.js";
import { getSetName } from "../../utils/setDisplay.js";
import { useState } from "react";
import { useTranslation } from "react-i18next";

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
                                        gatedPlayback = false,
                                        playbackPhase,
                                        inferenceState = "",
                                        onOpenManual,
                                        beforeContent,
                                      }) {
  const { t, i18n } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const status = measurement?.status || "pending";
  const english = i18n.resolvedLanguage?.startsWith("en");

  const statusCriteria = {
    normal: english
      ? "Predicted wear < 150 μm · Normal"
      : "예측 마모량 150μm 미만 · 정상",

    warning: english
      ? "150 μm ≤ Predicted wear < 200 μm · Warning"
      : "예측 마모량 150μm 이상 ~ 200μm 미만 · 경고",

    danger: english
      ? "Predicted wear ≥ 200 μm · Danger"
      : "예측 마모량 200μm 이상 · 위험",
  }[status];

  return (
      <>
        <div
  className={
    preview
      ? "monitoring-layout monitoring-layout-preview"
      : selectedSet === "manual"
        ? "monitoring-layout"
        : "monitoring-layout monitoring-layout-standard"
  }
>
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
              {!preview && selectedSet !== "manual" && (
  <p className="monitoring-playback-caption" role="status">
    {gatedPlayback
      ? (inferenceState === "failed"
          ? (i18n.resolvedLanguage?.startsWith("en") ? "AI inference failed" : "AI 추론 실패")
          : inferenceState
            ? (i18n.resolvedLanguage?.startsWith("en") ? "Prediction status unavailable" : "추론 상태 조회 실패")
            : playbackPhase === "playing"
              ? (i18n.resolvedLanguage?.startsWith("en") ? "Playing · AI inference in progress" : "재생 중 · AI 추론 진행")
              : playbackPhase === "waiting"
                ? (i18n.resolvedLanguage?.startsWith("en") ? "Waiting for AI inference" : "AI 추론 완료 대기 중")
                : playbackPhase === "showing"
                  ? (i18n.resolvedLanguage?.startsWith("en") ? "Showing result · 3 seconds" : "추론 결과 표시 중 · 3초")
                  : (i18n.resolvedLanguage?.startsWith("en") ? "Preparing" : "재생 준비 중"))
      : playbackStatus === "completed"
        ? (i18n.resolvedLanguage?.startsWith("en")
            ? "Waiting for the next cycle"
            : "다음 회차 대기")
        : playbackStatus === "running"
          ? t("monitoring.autoPlaying")
          : t("monitoring.loadingServer")}
  </p>
)}
            </div>

            <div className="view-context">
              {beforeContent}


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
                <div className="wear-status-heading">
  <div className="status-kicker">
    {t("monitoring.currentWearStatus")}
  </div>

  {statusCriteria && (
    <span className="wear-status-criteria">
      {statusCriteria}
    </span>
  )}
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
                      {t(wearAdviceKey(status, measurement?.wearType))}
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