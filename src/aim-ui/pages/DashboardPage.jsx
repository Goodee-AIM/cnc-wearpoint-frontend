import { useState } from "react";
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
}) {
  const [expanded, setExpanded] = useState(false);
  const status = measurement?.status || "pending";
  const names = {
    normal: "정상",
    warning: "경고",
    danger: "위험",
    pending: "판정 대기",
  };
  return (
    <>
      {!preview && <nav aria-label="공구 세트 선택">
        {sets.map((s) => (
          <button
            key={s.number}
            className={"tab" + (s.number === selectedSet ? " active" : "")}
            aria-pressed={s.number === selectedSet}
            onClick={() => onSelectSet(s.number)}
          >
            <span className="tab-dot" />
            Set {s.number}
          </button>
        ))}
      </nav>}
      <main>
        <div className="page-heading">
          <div>
            <div className="eyebrow">TOOL CONDITION MONITORING</div>
            <h1>
              Set {selectedSet} {preview ? "과거 알림 조회" : "모니터링"}{" "}
              {measurement?.material && (
                <span className="small-badge">{measurement.material}</span>
              )}
            </h1>
          </div>
          <div className="view-context">
            {!preview && <span>{playbackStatus === "completed" ? "이번 회차 완료 · 다음 회차 대기" : playbackStatus === "running" ? "자동 모니터링 · 재생 중" : "서버 상태 조회 중"}</span>}
            {preview && <button type="button" onClick={onReturnLive}>현재 자동 모니터링으로 돌아가기</button>}
          </div>
        </div>
        <section className="workspace">
          <ImageCard
            image={measurement?.image}
            setNumber={selectedSet}
            onExpand={() => setExpanded(true)}
          />
          <SensorCharts channels={channels} cursorSeconds={cursorSeconds} />
        </section>
        <section className="summary">
          <article className={"status-card status-" + status}>
            <div className="status-content">
              <div className="status-kicker">현재 마모 상태</div>
              <div className="status-layout">
                <span className={"status-symbol status-symbol-" + status} aria-hidden="true">
                  {status === "normal"
                    ? "✓"
                    : status === "warning"
                      ? "⚠"
                      : status === "danger"
                        ? "!"
                        : "–"}
                </span>
                <div className="status-texts">
                  <h2>{names[status]}</h2>
                  <p className="status-caption">
                    {status === "danger"
                      ? "공구 교체 필요"
                      : status === "warning"
                        ? "마모 상태 확인"
                        : status === "normal"
                          ? "정상 상태 유지"
                          : "판정 정보를 기다리는 중"}
                  </p>
                </div>
              </div>
            </div>
          </article>
          <PredictionCard value={measurement?.predictedWear} />
          <WearTypeCard
            label={measurement?.wearTypeLabel}
            type={measurement?.wearType}
            legend
          />
        </section>
        <Footer />
      </main>
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
