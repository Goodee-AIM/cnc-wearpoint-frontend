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
