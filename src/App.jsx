import { useEffect, useRef, useState } from "react";
import "./App.css";

const SETS = Array.from({ length: 7 }, (_, i) => `Set${i + 1}`);

// 센서 이름과 열 순서는 데이터 설명서 확인 후 확정해야 합니다.
const GRAPH_TITLES = ["음향", "가속도", "X축", "Y축"];

function parseCsv(text) {
  const rows = text
    .replace(/^\uFEFF/, "")
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line, index) => {
      const cells = line.split(",").map((cell) => cell.trim());

      if (
        cells.length !== 6 ||
        cells.slice(0, 5).some(
          (cell) => cell === "" || !Number.isFinite(Number(cell))
        ) ||
        !/^\d{4}-\d{2}-\d{2} /.test(cells[5])
      ) {
        throw new Error(`CSV ${index + 1}행의 형식을 확인해주세요.`);
      }

      return {
        values: cells.slice(0, 5).map(Number),
        time: cells[5],
      };
    });

  if (!rows.length) {
    throw new Error("CSV에 데이터가 없습니다.");
  }

  return rows;
}

// 구간별 최솟값·최댓값으로 그려 짧은 피크도 표시합니다.
function makeGraph(rows, column) {
  if (!rows.length) return null;

  let min = Infinity;
  let max = -Infinity;
  const sampled = [];
  const step = Math.max(1, Math.ceil(rows.length / 300));

  for (let start = 0; start < rows.length; start += step) {
    const end = Math.min(start + step, rows.length);
    let lowIndex = start;
    let highIndex = start;

    for (let i = start; i < end; i++) {
      const value = rows[i].values[column];
      min = Math.min(min, value);
      max = Math.max(max, value);

      if (value < rows[lowIndex].values[column]) lowIndex = i;
      if (value > rows[highIndex].values[column]) highIndex = i;
    }

    const indices =
      lowIndex === highIndex
        ? [lowIndex]
        : [lowIndex, highIndex].sort((a, b) => a - b);

    indices.forEach((index) => {
      sampled.push({ index, value: rows[index].values[column] });
    });
  }

  const span = max - min || 1;
  const points = sampled
    .map(({ index, value }) => {
      const x = 8 + (index / Math.max(rows.length - 1, 1)) * 284;
      const y = 90 - ((value - min) / span) * 80;
      return `${x},${y}`;
    })
    .join(" ");

  return { points, min, max };
}

function SensorGraph({ title, rows, column, onColumnChange }) {
  const graph = makeGraph(rows, column);

  return (
    <section className="sensor-card">
      <div className="sensor-heading">
        <h2>{title}</h2>

        <select
          aria-label={`${title} 데이터 열`}
          value={column}
          onChange={(event) => onColumnChange(Number(event.target.value))}
        >
          {[0, 1, 2, 3, 4].map((index) => (
            <option key={index} value={index}>
              숫자 {index + 1}열
            </option>
          ))}
        </select>
      </div>

      <svg
        className="sensor-chart"
        viewBox="0 0 300 100"
        role="img"
        aria-label={`${title}, 숫자 ${column + 1}열 그래프`}
      >
        {[10, 50, 90].map((y) => (
          <line
            key={y}
            x1="8"
            y1={y}
            x2="292"
            y2={y}
            stroke="#e5e7eb"
            strokeDasharray="4 4"
          />
        ))}

        {graph && (
          <polyline
            points={graph.points}
            fill="none"
            stroke="#2563eb"
            strokeWidth="1"
          />
        )}
      </svg>

      <div className="chart-caption">
        {graph
          ? `최소 ${graph.min.toFixed(3)} / 최대 ${graph.max.toFixed(3)}`
          : "데이터 없음"}
      </div>
      <div className="chart-caption">측정 순서 → · 열 매핑 확인 필요</div>
    </section>
  );
}

function ToolImage({ show }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="image-placeholder">
      {show && !failed ? (
        <>
          <img
            src="/set7/tool.png"
            alt="Set7 048회차 공구 원본"
            onError={() => setFailed(true)}
            style={{
              display: "block",
              width: "100%",
              maxHeight: 220,
              objectFit: "contain",
              borderRadius: 10,
            }}
          />
          <span>048회차 원본 이미지</span>
        </>
      ) : (
        <span>
          {!show
            ? "이 Set의 데이터는 아직 연결하지 않았습니다."
            : "public/set7/tool.png 파일을 확인해주세요."}
        </span>
      )}
    </div>
  );
}

function timeToMs(value) {
  return Date.parse(value.replace(" ", "T").slice(0, 23));
}

export default function App() {
  const [selectedSet, setSelectedSet] = useState("Set7");
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("CSV 불러오는 중...");
  const [columns, setColumns] = useState([0, 1, 2, 3]);
  const [playing, setPlaying] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const elapsedRef = useRef(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      try {
        const response = await fetch("/set7/sensor.csv", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("public/set7/sensor.csv 파일을 확인해주세요.");
        }

        const parsed = parseCsv(await response.text());
        setRows(parsed);
        setStatus(`CSV 로드 완료 · ${parsed.length.toLocaleString()}행`);
      } catch (error) {
        if (error.name !== "AbortError") {
          setStatus(error.message);
        }
      }
    }

    loadData();
    return () => controller.abort();
  }, []);

  const isSet7 = selectedSet === "Set7";

const startMs = rows.length ? timeToMs(rows[0].time) : 0;
const durationMs = rows.length
  ? timeToMs(rows[rows.length - 1].time) - startMs
  : 0;

// 현재 재생 시간까지 도달한 행의 위치를 이진 탐색합니다.
let left = 0;
let right = rows.length;

while (left < right) {
  const middle = Math.floor((left + right) / 2);
  const rowMs = timeToMs(rows[middle].time) - startMs;

  if (rowMs <= elapsedMs) {
    left = middle + 1;
  } else {
    right = middle;
  }
}

const currentCount = left;

// 최근 약 5초 구간만 표시합니다.
const windowStartMs = Math.max(0, elapsedMs - 5000);
let windowStart = 0;
let windowEnd = currentCount;

while (windowStart < windowEnd) {
  const middle = Math.floor((windowStart + windowEnd) / 2);
  const rowMs = timeToMs(rows[middle].time) - startMs;

  if (rowMs < windowStartMs) {
    windowStart = middle + 1;
  } else {
    windowEnd = middle;
  }
}

const visibleRows = isSet7
  ? rows.slice(windowStart, currentCount)
  : [];

const progress = durationMs > 0
  ? Math.min(100, (elapsedMs / durationMs) * 100)
  : 0;

useEffect(() => {
  if (!playing || !isSet7 || !rows.length) return;

  const startedAt = performance.now();
  const initialElapsed = elapsedRef.current;

  const timer = window.setInterval(() => {
    const nextElapsed = Math.min(
      durationMs,
      initialElapsed + performance.now() - startedAt
    );

    elapsedRef.current = nextElapsed;
    setElapsedMs(nextElapsed);

    if (nextElapsed >= durationMs) {
      setPlaying(false);
    }
  }, 100);

  return () => window.clearInterval(timer);
}, [playing, isSet7, rows.length, durationMs]);

function handlePlay() {
  if (elapsedRef.current >= durationMs) {
    elapsedRef.current = 0;
    setElapsedMs(0);
  }

  setPlaying(true);
}

function handleReset() {
  setPlaying(false);
  elapsedRef.current = 0;
  setElapsedMs(0);
}

  function changeColumn(graphIndex, column) {
    setColumns((previous) =>
      previous.map((value, index) =>
        index === graphIndex ? column : value
      )
    );
  }

  return (
    <div className="dashboard">
      <header className="header">
        <h1>AIM</h1>
        <span>공구 마모 진단 대시보드</span>
      </header>

      <div className="dashboard-body">
        <main className="main-panel">
          <nav className="set-navigation" aria-label="데이터 세트 선택">
            {SETS.map((set) => (
              <button
                key={set}
                className={
                  selectedSet === set ? "set-button active" : "set-button"
                }
                onClick={() => {
                  setPlaying(false);
                  setSelectedSet(set);
}}
                aria-pressed={selectedSet === set}
              >
                {set}
              </button>
            ))}
          </nav>

          <div className="main-content">
            <div className="section-heading">
              <h2>{selectedSet} 모니터링</h2>
              <span className="demo-badge">저장 파일 테스트</span>
            </div>

            <p style={{ marginBottom: 18, fontSize: 12 }} role="status">
              {isSet7 ? status : "Set7을 선택하면 테스트 데이터가 표시됩니다."}
            </p>
{isSet7 && (
  <div style={{ marginBottom: 22 }}>
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <button
        onClick={handlePlay}
        disabled={!rows.length || playing}
      >
        재생
      </button>

      <button
        onClick={() => setPlaying(false)}
        disabled={!playing}
      >
        일시정지
      </button>

      <button
        onClick={handleReset}
        disabled={!rows.length}
      >
        처음부터
      </button>

      <span style={{ fontSize: 12 }}>
        {(elapsedMs / 1000).toFixed(1)}초 /
        {" "}{(durationMs / 1000).toFixed(1)}초
      </span>
    </div>

    <progress
      value={progress}
      max={100}
      aria-label="센서 데이터 재생 진행률"
      style={{ width: "100%", marginTop: 12 }}
    />

    <p style={{ marginTop: 6, fontSize: 11, color: "#64748b" }}>
      저장 데이터 재생 · 최근 5초 표시 · 실제 센서 수신 전
    </p>
  </div>
)}            

            <section className="monitoring-layout">
              <div className="live-image-section">
                <ToolImage show={isSet7} />
                <p className="measurement-time">
                  이미지: {isSet7 ? "2023-02-23 10:22:42.626892" : "—"}
                </p>
                <p className="measurement-time">
                    표시 구간 시작: {visibleRows[0]?.time ?? "—"}
            </p>
                <p className="measurement-time">
                  현재 센서 시간: {visibleRows[visibleRows.length - 1]?.time ?? "—"}
            </p>
              </div>

              <div className="sensor-grid">
                {GRAPH_TITLES.map((title, index) => (
                  <SensorGraph
                    key={title}
                    title={title}
                    rows={visibleRows}
                    column={columns[index]}
                    onColumnChange={(column) => changeColumn(index, column)}
                  />
                ))}
              </div>
            </section>

            <section className="replacement-section">
              <div className="replacement-card">
                <span className="status-dot" />
                <div>
                  <h2>교체 알림</h2>
                  <p>RUL 모델 연결 대기</p>
                </div>
              </div>
            </section>

            <section className="diagnosis-layout">
              <div className="diagnosis-image">
                <ToolImage show={isSet7} />
                <p className="measurement-time">원본 확인용 · 분석 전</p>
              </div>

              <div className="diagnosis-results">
                <div className="result-card">
                  <span>마모 유형</span>
                  <strong>—</strong>
                  <small>모델 연결 대기</small>
                </div>

                <div className="result-card">
                  <span>예측 마모량</span>
                  <strong>— <small>μm</small></strong>
                  <small>모델 연결 대기</small>
                </div>
              </div>
            </section>
          </div>
        </main>

        <aside className="notification-panel">
          <div className="notification-heading">
            <h2>알림창</h2>
            <span>{isSet7 ? 1 : 0}</span>s
          </div>

          <div className="notification-content">
            {isSet7 ? (
              <div style={{ fontSize: 12, lineHeight: 1.9 }}>
                <strong>테스트 파일 회차 불일치</strong>
                <p style={{ marginTop: 10 }}>
                  센서: 037회차<br />
                  이미지: 048회차
                </p>
                <p style={{ marginTop: 10 }}>
                  현재는 개별 표시 테스트입니다.
                  멀티모달 진단에는 동일 회차의 파일이 필요합니다.
                </p>
              </div>
            ) : (
              <p style={{ fontSize: 12 }}>연결된 데이터가 없습니다.</p>
            )}
          </div>

          <p className="notification-footer">저장 데이터 표시 · 실시간 수집 전</p>
        </aside>
      </div>
    </div>
  );
}