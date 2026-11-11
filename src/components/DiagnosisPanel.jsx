// 마모 상태, 예측 마모량, 마모 유형을 표시
import ResultCard from "./ResultCard.jsx";
import { formatWear, wearType } from "../utils/wear.js";

export default function DiagnosisPanel({ current, selectedSet }) {
  return (
    <section className="diagnosis-layout" aria-label="진단 결과">
      <div
        className="replacement-card"
        style={{
          background: current.status.background,
          borderColor: current.status.color,
        }}
        role="status"
      >
        <span
          className="status-dot"
          style={{ background: current.status.color }}
        />
        <div>
          {/* Set10·11은 예측값이 없으면 판정 결과 대신 예측 결과 없음으로 표시합니다. */}
          <h2 style={{ color: current.status.color }}>
            {current.wear === null &&
            (selectedSet === 10 || selectedSet === 11)
              ? "예측 결과 없음"
              : current.status.label}
          </h2>
          <p>
            {current.source}: {formatWear(current.wear)}
          </p>
        </div>
      </div>
      <ResultCard
        title="예측 마모량"
        value={formatWear(current.prediction?.predicted)}
        note="저장된 모델 예측 결과"
      />
      <ResultCard
        title="마모 유형"
        value={wearType(current.label?.type)}
        note="정답 라벨 기준"
      />
    </section>
  );
}
