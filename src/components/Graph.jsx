export default function Graph({ title, rows, column, onChange }) {
  let min = Infinity;
  let max = -Infinity;
  const samples = [];
  const step = Math.max(1, Math.ceil(rows.length / 250));

  for (let start = 0; start < rows.length; start += step) {
    const end = Math.min(start + step, rows.length);
    let low = start;
    let high = start;

    for (let i = start; i < end; i++) {
      const value = rows[i].values[column];
      min = Math.min(min, value);
      max = Math.max(max, value);
      if (value < rows[low].values[column]) low = i;
      if (value > rows[high].values[column]) high = i;
    }

    [...new Set([low, high])]
      .sort((a, b) => a - b)
      .forEach((i) => samples.push(i));
  }

  const points = samples
    .map((i) => {
      const x = 8 + (i / Math.max(1, rows.length - 1)) * 284;
      const y =
        min === max
          ? 50
          : 90 - ((rows[i].values[column] - min) / (max - min)) * 80;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <section className="sensor-card">
      <div className="sensor-heading">
        <h2>{title}</h2>
        <select
          aria-label={`${title} 센서 열`}
          value={column}
          onChange={(event) => onChange(Number(event.target.value))}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <option key={i} value={i}>
              숫자 {i + 1}열
            </option>
          ))}
        </select>
      </div>

      <svg
        className="sensor-chart"
        viewBox="0 0 300 100"
        role="img"
        aria-label={`${title} 그래프`}
      >
        {[10, 50, 90].map((y) => (
          <line
            key={y}
            x1="8"
            x2="292"
            y1={y}
            y2={y}
            stroke="#e5e7eb"
            strokeDasharray="4 4"
          />
        ))}
        <polyline
          points={points}
          fill="none"
          stroke="#2563eb"
          strokeWidth="1"
        />
      </svg>

      <div className="chart-caption">
        {rows.length
          ? `최소 ${min.toFixed(3)} / 최대 ${max.toFixed(3)}`
          : "데이터 없음"}
      </div>
      <div className="chart-caption">열 매핑 확인 필요</div>
    </section>
  );
}
