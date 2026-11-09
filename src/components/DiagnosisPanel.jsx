// 마모 상태, 예측 마모량, 마모 유형을 표시
import ToolImage from "./ToolImage.jsx";
import ResultCard from "./ResultCard.jsx";
import { formatWear, wearType } from "../utils/wear.js";

export default function DiagnosisPanel({
  current,
  selectedSet,
  currentImage,
  useDatabase,
  actualWear,
}) {
  return (
    <>
      <section className="replacement-section">
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
      </section>

      <section className="diagnosis-layout">
        <div className="diagnosis-image">
          <ToolImage image={currentImage} />
          <p className="measurement-time">
            {useDatabase
              ? "DB 측정 정보와 파일명으로 연결"
              : "CSV 결과와 파일명으로 연결"}
          </p>
        </div>

        <div className="diagnosis-results">
              
          <div className="alert-wear-summary">
            <ResultCard
              title="예측 마모량"
              value={formatWear(current.prediction?.predicted)}
              note="저장된 모델 예측 결과"
            />
          </div>
          
          <ResultCard
            title="마모 유형"
            value={wearType(current.label?.type)}
            note="정답 라벨 기준"
          />
        </div>
      </section>
    </>
  );
}
