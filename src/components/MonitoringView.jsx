// 현재 공구 이미지 & 센서 파형 그래프 배치

import ToolImage from "./ToolImage.jsx";
import Graph from "./Graph.jsx";
import { TITLES } from "../dashboardConfig.js";

export default function MonitoringView({ currentImage, visibleRows }) {
  return (
    <section className="monitoring-layout">
      <div className="live-image-section">
        <ToolImage image={currentImage} />
        <p className="measurement-time">
          현재 센서 시간: {visibleRows[visibleRows.length - 1]?.time ?? "—"}
        </p>
      </div>

      <div className="sensor-grid">
        {/* visibleRows에는 현재 재생 위치 기준 최근 5초 데이터가 들어오며, 열 번호는 고정 순서입니다. */}
        {TITLES.map((title, index) => (
          <Graph
            key={title}
            title={title}
            rows={visibleRows}
            column={index}
          />
        ))}
      </div>
    </section>
  );
}
