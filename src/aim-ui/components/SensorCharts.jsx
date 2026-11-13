/** samples: {time:number,value:number}[], time/cursor are seconds on the same timeline. */
export function SensorChart({ channel, cursorSeconds }) {
  const end = Number.isFinite(cursorSeconds) ? cursorSeconds : 0,
    start = end - 5;
  const points = (channel.samples || [])
    .filter(
      (p) =>
        Number.isFinite(p.time) &&
        Number.isFinite(p.value) &&
        p.time >= start &&
        p.time <= end,
    )
    .sort((a, b) => a.time - b.time);
  // 원시 파형을 유지하며 기존 그래프와 같은 최솟값·최댓값 범위로 표시합니다.
  let min = Infinity, max = -Infinity;
  for (const point of points) { min = Math.min(min, point.value); max = Math.max(max, point.value); }
  const path = points
    .map(
      (p, i) =>
        `${i ? "L" : "M"}${(28 + ((p.time - start) / 5) * 516).toFixed(2)},${(min === max ? 85 : 150 - ((p.value - min) / (max - min)) * 130).toFixed(2)}`,
    )
    .join(" ");
  return (
    <article className="card sensor">
      <div className="sensor-heading">
        <h2>
          <span className="signal-dot" />
          {channel.label}
        </h2>
      </div>
      <svg
        className="chart"
        viewBox="0 0 560 170"
        preserveAspectRatio="none"
        role="img"
        aria-label={`${channel.label} 최근 5초 파형`}
      >
        <path
          d="M28 20H548 M28 52H548 M28 85H548 M28 118H548 M28 150H548"
          stroke="#e8edf5"
          strokeDasharray="4 4"
          fill="none"
        />
        {path && <path className="signal" d={path} />}
      </svg>
      {!points.length && <span className="chart-empty">센서 데이터 대기</span>}
      <div className="chart-bottom" aria-label="진행 위치 기준 최근 5초">
        {["−5 s", "−4 s", "−3 s", "−2 s", "−1 s", "현재"].map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
    </article>
  );
}
export default function SensorCharts({ channels = [], cursorSeconds = 0 }) {
  return (
    <div className="sensor-grid">
      {channels.map((c) => (
        <SensorChart key={c.id} channel={c} cursorSeconds={cursorSeconds} />
      ))}
    </div>
  );
}
