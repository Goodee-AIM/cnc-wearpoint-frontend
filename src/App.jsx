import { useEffect, useRef, useState } from "react";
import Papa from "papaparse";
import "./App.css";

const SETS = [4,5,6,7,8,9,10,11];
const TITLES = ["음향", "가속도", "X축", "Y축"];
const WARNING = 50;
const DANGER = 90;
const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

function fileKey(name) {
  return String(name ?? "")
    .split(/[\\/]/)
    .pop()
    .replace(/\.(png|jpe?g)$/i, "");
}

function recordKey(set, name) {
  return `${set}:${fileKey(name)}`;
}

function numberOrNull(value) {
  if (value == null || String(value).trim() === "") return null;
  const result = Number(value);
  return Number.isFinite(result) && result >= 0 ? result : null;
}

function getStatus(wear) {
  if (wear === null) {
    return {
      level: "waiting",
      label: "판정 대기",
      color: "#64748b",
      background: "#f1f5f9",
    };
  }

  if (wear >= DANGER) {
    return {
      level: "danger",
      label: "위험 · 공구 교체 필요",
      color: "#b91c1c",
      background: "#fef2f2",
    };
  }

  if (wear >= WARNING) {
    return {
      level: "warning",
      label: "경고 · 마모 상태 확인",
      color: "#a16207",
      background: "#fefce8",
    };
  }

  return {
    level: "normal",
    label: "정상",
    color: "#15803d",
    background: "#f0fdf4",
  };
}

function wearType(value) {
  if (value === "flank_wear") return "플랭크 마모";
  if (value === "adhesion") return "응착";
  return value || "—";
}

function readTable(text, required) {
  const result = Papa.parse(text.replace(/^\uFEFF/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
  });

  if (
    result.errors.length ||
    !required.every((name) => result.meta.fields?.includes(name))
  ) {
    throw new Error(`필요한 열: ${required.join(", ")}`);
  }

  return result.data;
}

function parseSensor(text) {
  const result = Papa.parse(text.replace(/^\uFEFF/, ""), {
    skipEmptyLines: "greedy",
  });

  if (result.errors.length) throw new Error("센서 CSV 형식 오류");

  let previous = -Infinity;

  const rows = result.data.map((cells, index) => {
    const values = cells.slice(0, 5).map(Number);
    const time = String(cells[5] ?? "").trim();
    const ms = Date.parse(time.replace(" ", "T").slice(0, 23));

    if (
      cells.length !== 6 ||
      cells.slice(0, 5).some((v) => String(v).trim() === "") ||
      values.some((v) => !Number.isFinite(v)) ||
      !Number.isFinite(ms) ||
      ms < previous
    ) {
      throw new Error(`센서 CSV ${index + 1}행 확인 필요`);
    }

    previous = ms;
    return { values, time, ms };
  });

  if (!rows.length) throw new Error("센서 데이터가 없습니다.");
  return rows;
}

function Graph({ title, rows, column, onChange }) {
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
            <option key={i} value={i}>숫자 {i + 1}열</option>
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

function ToolImage({ image }) {
  return (
    <div className="image-placeholder">
      {image ? (
        <>
          <img
            src={image.url}
            alt={image.name}
            style={{
              width: "100%",
              maxHeight: 220,
              objectFit: "contain",
              borderRadius: 10,
            }}
          />
          <span style={{ overflowWrap: "anywhere" }}>{image.name}</span>
        </>
      ) : (
        <span>현재 Set의 이미지 폴더를 선택해주세요.</span>
      )}
    </div>
  );
}

const boxStyle = {
  padding: 16,
  marginBottom: 20,
  border: "1px solid #dce2ea",
  borderRadius: 10,
};

const controlsStyle = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 10,
};

function ResultCard({ title, value, note, color }) {
  return (
    <div className="result-card">
      <span>{title}</span>
      <strong style={{ fontSize: 18, color }}>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

export default function App() {
  const [selectedSet, setSelectedSet] = useState(10);
  const [imagesBySet, setImagesBySet] = useState({});
  const [indices, setIndices] = useState({});
  const [photoPlayingBySet, setPhotoPlayingBySet] = useState({});
  const photoPlaying = Boolean(photoPlayingBySet[selectedSet]);

  function stopPhoto(set) {
    setPhotoPlayingBySet((previous) => ({
      ...previous,
      [set]: false,
    }));
  }

  function stopAllPhotos() {
    setPhotoPlayingBySet({});
  }

  function startPhoto(set) {
    const list = activeImagesBySet[set] ?? [];

    if (list.length < 2) return;

    setIndices((previous) => ({
      ...previous,
      [set]:
        (previous[set] ?? 0) >= list.length - 1
          ? 0
          : previous[set] ?? 0,
    }));

    setTestValues((previous) => ({
      ...previous,
      [set]: "",
    }));

    setPhotoPlayingBySet((previous) => ({
      ...previous,
      [set]: true,
    }));
  }
  const [dismissedAlerts, setDismissedAlerts] = useState({});
  const [useDatabase, setUseDatabase] = useState(false);
  const [databaseRecords, setDatabaseRecords] = useState({});
  const [databaseMessage, setDatabaseMessage] =
    useState("DB 조회 사용을 선택해주세요.");
  const [databaseReload, setDatabaseReload] = useState(0);  

  const [useServerImages, setUseServerImages] = useState(false);
  const [serverImagesBySet, setServerImagesBySet] = useState({});
  const [serverImageMessage, setServerImageMessage] =
    useState("서버 이미지 사용을 선택해주세요.");
  const [serverImageReload, setServerImageReload] = useState(0);

  useEffect(() => {
  if (!useServerImages) return;

  const controller = new AbortController();

  async function loadServerImages() {
    setServerImageMessage("서버 이미지 목록 조회 중...");

    try {
      const results = await Promise.all(
        SETS.map(async (set) => {
          const response = await fetch(
            `${API_BASE}/api/images/set${set}`,
            { signal: controller.signal }
          );

          if (!response.ok) {
            throw new Error(
              `Set${set} 이미지 조회 실패: HTTP ${response.status}`
            );
          }

          const data = await response.json();

          if (!Array.isArray(data.items)) {
            throw new Error(`Set${set} 이미지 응답 형식 오류`);
          }

          return [
            set,
            data.items.map((item) => ({
              name: item.name,
              url: new URL(item.url, API_BASE).href,
            })),
          ];
        })
      );

      if (controller.signal.aborted) return;

      const next = Object.fromEntries(results);
      const count = results.reduce(
        (total, [, list]) => total + list.length,
        0
      );

      setServerImagesBySet(next);
      setIndices({});
      stopAllPhotos();
      setTestValues({});
      setServerImageMessage(
        `서버 이미지 목록 조회 완료 · 전체 ${count}장`
      );
    } catch (error) {
      if (controller.signal.aborted) return;

      setServerImagesBySet({});
      setServerImageMessage(`서버 이미지 조회 실패: ${error.message}`);
    }
  }

  loadServerImages();

  return () => controller.abort();
}, [useServerImages, serverImageReload]);

useEffect(() => {
  if (!useDatabase) return;

  const controller = new AbortController();

  async function loadDatabase() {
    setDatabaseMessage("Set4~11 데이터 조회 중...");
    setDatabaseRecords({});

    try {
      const results = await Promise.all(
        SETS.map(async (set) => {
          const response = await fetch(
            `${API_BASE}/api/sets/${set}/measurements?limit=500`,
            { signal: controller.signal }
          );

          if (!response.ok) {
            throw new Error(
              `Set${set} 조회 실패: HTTP ${response.status}`
            );
          }

          const data = await response.json();

          if (!Array.isArray(data.items)) {
            throw new Error(`Set${set} 응답 형식을 확인해주세요.`);
          }

          if (data.total > data.items.length) {
            throw new Error(
              `Set${set}의 일부 데이터만 조회됐습니다. 페이지 조회가 필요합니다.`
            );
          }

          return { set, items: data.items };
        })
      );

      const next = {};
      let count = 0;

      for (const { set, items } of results) {
        for (const item of items) {
          // 이미지가 없는 측정은 사진과 연결하지 않습니다.
          if (!item.image_name) continue;

          const key = recordKey(set, item.image_name);

          if (next[key]) {
            throw new Error(
              `이미지 연결 정보 중복: Set${set} ${item.image_name}`
            );
          }

          next[key] = item;
          count += 1;
        }
      }

      if (controller.signal.aborted) return;

      setDatabaseRecords(next);
      setDatabaseMessage(
        `DB 조회 완료 · 이미지 연결 정보 ${count}건`
      );
    } catch (error) {
      if (controller.signal.aborted) return;

      setDatabaseRecords({});
      setDatabaseMessage(
        `DB 조회 실패: ${error.message} · 백엔드 실행과 CORS 설정을 확인해주세요.`
      );
    }
  }

  loadDatabase();

  return () => controller.abort();
}, [useDatabase, databaseReload]);

  const urlsRef = useRef({});

  const [labels, setLabels] = useState({});
  const [predictions, setPredictions] = useState({});
  const [labelMessage, setLabelMessage] = useState("라벨 CSV 선택 대기");
  const [predictionMessage, setPredictionMessage] = useState("예측 CSV 선택 대기");
  const [imageMessage, setImageMessage] = useState("");

  const [testValues, setTestValues] = useState({});
  const [testModes, setTestModes] = useState({});

  const [sensor, setSensor] = useState({
    set: null,
    name: "",
    rows: [],
  });
  const [sensorMessage, setSensorMessage] = useState("센서 CSV 선택 대기");
  const [useServerSensors, setUseServerSensors] = useState(false);
  const [sensorPlaying, setSensorPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);
  const [columns, setColumns] = useState([0, 1, 2, 3]);

  const activeImagesBySet = useServerImages
    ? serverImagesBySet
    : imagesBySet;

  const images = activeImagesBySet[selectedSet] ?? [];
  const imageIndex = indices[selectedSet] ?? 0;
  const currentImage = images[imageIndex] ?? null;

  function getRecord(set) {
    const list = activeImagesBySet[set] ?? [];
    const image = list[indices[set] ?? 0] ?? null;
    const key = image ? recordKey(set, image.name) : "";

    const dbRecord = useDatabase
      ? databaseRecords[key] ?? null
      : null;

    const dbActual = numberOrNull(dbRecord?.actual_wear_um);
    const dbPredicted = numberOrNull(dbRecord?.predicted_wear_um);

const label = useDatabase
  ? dbRecord
    ? {
        wear: dbActual,
        type: dbRecord.actual_type,
        sensorName: dbRecord.sensor_name,
        imageTime: dbRecord.image_captured_at,
      }
    : null
  : labels[key] ?? null;

const prediction = useDatabase
  ? dbPredicted !== null
    ? {
        predicted: dbPredicted,
        actual: dbActual,
        error:
          dbActual === null
            ? null
            : Math.abs(dbActual - dbPredicted),
        sensorName: dbRecord.sensor_name,
      }
    : null
  : predictions[key] ?? null;
    const testing = Boolean(testModes[set]);

    // Set10·11은 예측 마모량으로만 판정하며, 예측값이 없으면 판정 대기로 표시
    const wear = !image
      ? null
      : testing
        ? numberOrNull(testValues[set])
        : set === 10 || set === 11
          ? prediction?.predicted ?? null
          : label?.wear ?? null;

    return {
      set,
      image,
      label,
      prediction,
      wear,
      testing,
      source: testing
        ? "테스트 마모량"
        : set === 10 || set === 11
          ? "예측 마모량"
          : "라벨 마모량",
      status: getStatus(wear),
    };
  }

  const current = getRecord(selectedSet);

  const alerts = SETS.map(getRecord)
  .filter(
    (record) =>
      record.status.level === "warning" ||
      record.status.level === "danger"
  )
  .map((record) => ({
    ...record,
    alertKey: JSON.stringify([
      record.image.name,
      record.wear,
      record.source,
      record.status.level,
    ]),
  }))
  .filter(
    (record) => dismissedAlerts[record.set] !== record.alertKey
  );

  const matchedCount = images.filter((image) => {
    const key = recordKey(selectedSet, image.name);

      if (useDatabase) {
      const record = databaseRecords[key];

      return selectedSet === 10 || selectedSet === 11
        ? numberOrNull(record?.predicted_wear_um) !== null
        : numberOrNull(record?.actual_wear_um) !== null;
    }

    return selectedSet === 10 || selectedSet === 11
      ? Boolean(predictions[key])
      : Boolean(labels[key]);
  }).length;
  useEffect(() => {
    return () => {
      Object.values(urlsRef.current)
        .flat()
        .forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  function changeSet(set) {
    setSensorPlaying(false);
    setSelectedSet(set);
    setImageMessage("");
}

  function handleImages(event) {
    const files = Array.from(event.target.files ?? [])
      .filter((file) => /\.(png|jpe?g)$/i.test(file.name))
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true })
      );

    if (!files.length) {
      setImageMessage("선택한 폴더에 이미지가 없습니다.");
      return;
    }

    // 폴더명에 Set 번호가 있으면 잘못된 Set 선택을 확인합니다.
    const folderSets = files
      .map((file) =>
        file.webkitRelativePath?.match(
          /(?:^|[\\/])(?:images_)?Set(\d+)(?=[\\/]|$)/i
        )
      )
      .filter(Boolean)
      .map((match) => Number(match[1]));

    if (folderSets.some((set) => set !== selectedSet)) {
      setImageMessage(`Set${selectedSet}에 맞는 폴더를 선택해주세요.`);
      return;
    }

    stopPhoto(selectedSet);

    (urlsRef.current[selectedSet] ?? []).forEach((url) =>
      URL.revokeObjectURL(url)
    );

    const loaded = files.map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
    }));

    urlsRef.current[selectedSet] = loaded.map((image) => image.url);

    setImagesBySet((previous) => ({
      ...previous,
      [selectedSet]: loaded,
    }));
    setIndices((previous) => ({ ...previous, [selectedSet]: 0 }));
    setTestValues((previous) => ({ ...previous, [selectedSet]: "" }));
    setImageMessage(`${loaded.length}장 로드 완료`);
  }

  async function handleLabels(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const rows = readTable(await file.text(), [
        "Set", "ImageName", "wear", "type",
      ]);

      const next = {};

      rows.forEach((row) => {
        const set = Number(row.Set);
        const wear = numberOrNull(row.wear);
        if (!SETS.includes(set) || !row.ImageName?.trim() || wear === null) return;

        next[recordKey(set, row.ImageName.trim())] = {
          wear,
          type: row.type,
          sensorName: row.SensorName,
          imageTime: row.ImageDateTime,
        };
      });

      setLabels(next);
      setLabelMessage(`전체 라벨 ${Object.keys(next).length}건 로드 완료`);
    } catch (error) {
      setLabels({});
      setLabelMessage(error.message);
    }
  }

  async function handlePredictions(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const rows = readTable(await file.text(), [
        "Set", "ImageName", "Actual_Wear", "Predicted_Wear",
      ]);

      const next = {};

      rows.forEach((row) => {
        const set = Number(row.Set);
        const predicted = numberOrNull(row.Predicted_Wear);
        const actual = numberOrNull(row.Actual_Wear);

        if (!SETS.includes(set) || !row.ImageName?.trim() || predicted === null) return;

        const key = recordKey(set, row.ImageName.trim());

        if (next[key]) {
          throw new Error(`중복 예측 행: Set${set} ${row.ImageName}`);
        }

        next[key] = {
          predicted,
          actual,
          error: actual === null ? null : Math.abs(actual - predicted),
          sensorName: String(row.SensorName ?? "").trim(),
        };
      });

      setPredictions(next);
      setPredictionMessage(
        `예측 결과 ${Object.keys(next).length}건 로드 완료`
      );
    } catch (error) {
      setPredictions({});
      setPredictionMessage(error.message);
    }
  }

  async function handleSensor(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const targetSet = selectedSet;
    setSensorPlaying(false);
    elapsedRef.current = 0;
    setElapsed(0);
    setSensor({ set: targetSet, name: file.name, rows: [] });

    try {
      const rows = parseSensor(await file.text());
      setSensor({ set: targetSet, name: file.name, rows });
      setSensorMessage(`${file.name} · ${rows.length.toLocaleString()}행`);
    } catch (error) {
      setSensorMessage(error.message);
    }
  }

  // 재생 상태나 이미지 목록이 바뀌어도 타이머가 참조할 최신 값
const playbackRef = useRef(null);

useEffect(() => {
  playbackRef.current = {
    playing: photoPlayingBySet,
    lists: activeImagesBySet,
  };
}, [photoPlayingBySet, activeImagesBySet]);

// Set마다 마지막 사진에 도달하면 해당 Set만 정지
useEffect(() => {
  const finishedSets = SETS.filter((set) => {
    if (!photoPlayingBySet[set]) return false;

    const list = activeImagesBySet[set] ?? [];

    return (
      list.length < 2 ||
      (indices[set] ?? 0) >= list.length - 1
    );
  });

  if (!finishedSets.length) return;

  setPhotoPlayingBySet((previous) => {
    const next = { ...previous };

    finishedSets.forEach((set) => {
      next[set] = false;
    });

    return next;
  });
}, [indices, photoPlayingBySet, activeImagesBySet]);

// 재생 중인 모든 Set을 2초마다 진행
useEffect(() => {
    const timer = window.setInterval(() => {
      const snapshot = playbackRef.current;

      if (!snapshot) return;

      const playingSets = SETS.filter(
        (set) =>
          snapshot.playing[set] &&
          (snapshot.lists[set]?.length ?? 0) >= 2
      );

      if (!playingSets.length) return;

      setIndices((previous) => {
        const next = { ...previous };
        let changed = false;

        playingSets.forEach((set) => {
          const list = snapshot.lists[set];
          const currentIndex = previous[set] ?? 0;
          const nextIndex = Math.min(
            currentIndex + 1,
            list.length - 1
          );

          if (nextIndex !== currentIndex) {
            next[set] = nextIndex;
            changed = true;
          }
        });

        return changed ? next : previous;
      });
    }, 2000);

    return () => window.clearInterval(timer);
  }, []);

  function movePhoto(index) {
    stopPhoto(selectedSet);

    setIndices((previous) => ({
      ...previous,
      [selectedSet]: index,
    }));

    setTestValues((previous) => ({
      ...previous,
      [selectedSet]: "",
    }));
}

 // DB 사용 시 예측 결과 유무와 관계없이 측정 정보에서 연결 파일을 찾습니다.
const currentDatabaseRecord =
  useDatabase && currentImage
    ? databaseRecords[recordKey(selectedSet, currentImage.name)]
    : null;

const expectedSensor = String(
  useDatabase
    ? currentDatabaseRecord?.sensor_name ?? ""
    : current.prediction?.sensorName ??
        current.label?.sensorName ??
        ""
).trim();

// 사진이 바뀌면 같은 센서 파일명이어도 재생 위치를 초기화합니다.
const sensorSourceKey = JSON.stringify([
  selectedSet,
  currentImage?.name ?? "",
  expectedSensor,
]);

useEffect(() => {
  if (!useServerSensors) return;

  const controller = new AbortController();

  setSensorPlaying(false);
  elapsedRef.current = 0;
  setElapsed(0);

  setSensor({
    set: selectedSet,
    name: expectedSensor,
    sourceKey: sensorSourceKey,
    rows: [],
  });

  if (!useDatabase) {
    setSensorMessage("자동 센서 조회는 DB 조회 사용을 켜주세요.");
    return () => controller.abort();
  }

  if (!currentImage) {
    setSensorMessage("현재 이미지가 없습니다.");
    return () => controller.abort();
  }

  if (!expectedSensor) {
    setSensorMessage("현재 사진에 연결된 센서 정보가 없습니다.");
    return () => controller.abort();
  }

  async function loadSensor() {
    setSensorMessage(`센서 CSV 조회 중: ${expectedSensor}`);

    try {
      const response = await fetch(
        `${API_BASE}/api/sensors/set${selectedSet}/${encodeURIComponent(expectedSensor)}`,
        { signal: controller.signal }
      );

      if (!response.ok) {
        throw new Error(
          response.status === 404
            ? "서버에 대응하는 센서 CSV 파일이 없습니다."
            : `센서 조회 실패: HTTP ${response.status}`
        );
      }

      const text = await response.text();

      if (controller.signal.aborted) return;

      const rows = parseSensor(text);

      if (controller.signal.aborted) return;

      setSensor({
        set: selectedSet,
        name: expectedSensor,
        sourceKey: sensorSourceKey,
        rows,
      });

      setSensorMessage(
        `${expectedSensor} · ${rows.length.toLocaleString()}행 · 자동 연결`
      );

      setSensorPlaying(true);
    } catch (error) {
      if (controller.signal.aborted) return;

      setSensor({
        set: selectedSet,
        name: expectedSensor,
        sourceKey: sensorSourceKey,
        rows: [],
      });

      setSensorMessage(error.message);
    }
  }

  loadSensor();

  // 사진이나 Set을 바꾸면 이전 요청 결과를 적용하지 않습니다.
  return () => controller.abort();
}, [
  useServerSensors,
  useDatabase,
  selectedSet,
  currentImage?.name,
  expectedSensor,
  sensorSourceKey,
]);

const sensorRows =
  sensor.set === selectedSet &&
  (useServerSensors
    ? useDatabase && sensor.sourceKey === sensorSourceKey
    : !sensor.sourceKey)
    ? sensor.rows
    : [];
  const start = sensorRows[0]?.ms ?? 0;
  const duration = sensorRows.length
    ? sensorRows[sensorRows.length - 1].ms - start
    : 0;

  const visibleRows = sensorRows.filter((row) => {
    const relative = row.ms - start;
    return relative <= elapsed && relative >= Math.max(0, elapsed - 5000);
  });

  useEffect(() => {
    if (!sensorPlaying || !sensorRows.length) return;

    const began = performance.now();
    const initial = elapsedRef.current;

    const timer = window.setInterval(() => {
      const next = Math.min(
        duration,
        initial + performance.now() - began
      );

      elapsedRef.current = next;
      setElapsed(next);

      if (next >= duration) setSensorPlaying(false);
    }, 100);

    return () => window.clearInterval(timer);
  }, [sensorPlaying, sensorRows.length, duration, selectedSet]);

  const sensorMatches =
    sensor.set === selectedSet &&
    expectedSensor &&
    sensor.name === expectedSensor;

  const actualWear =
    current.prediction?.actual ?? current.label?.wear ?? null;

  function formatWear(value) {
    return value === null || value === undefined
      ? "—"
      : `${value.toFixed(2)} μm`;
  }

  return (
    <div className="dashboard">
      <header className="header">
        <h1 translate="no">AIM</h1>
        <span>공구 마모 진단 대시보드</span>
      </header>

      <div className="dashboard-body">
        <main className="main-panel">
          <nav
            className="set-navigation"
            aria-label="Set 선택"
            style={{
              display: "flex",
              overflowX: "auto",
            }}
          >
            {SETS.map((set) => (
              <button
                key={set}
                className={
                  selectedSet === set
                    ? "set-button active"
                    : "set-button"
                }
                style={{ flex: "1 0 70px" }}
                onClick={() => changeSet(set)}
                aria-pressed={selectedSet === set}
              >
                Set{set}
              </button>
            ))}
          </nav>

          <div className="main-content">
            <div className="section-heading">
              <h2>Set{selectedSet} 모니터링</h2>
              <span className="demo-badge">저장 결과 재생</span>
            </div>

            <details className="data-settings">
              <summary>데이터 설정 및 재생</summary>
              <div className="settings-content">
              <section style={boxStyle}>
  <label style={controlsStyle}>
    <input
      type="checkbox"
      checked={useServerImages}
      onChange={(event) => {
        stopAllPhotos();
        setIndices({});
        setTestValues({});
        setUseServerImages(event.target.checked);
        
      }}
    />
    서버 이미지 자동 불러오기
  </label>

  <p
    role="status"
    style={{ marginTop: 10, fontSize: 12 }}
  >
    {useServerImages
      ? serverImageMessage
      : "직접 선택한 이미지 폴더를 사용합니다."}
  </p>

  <button
    type="button"
    disabled={!useServerImages}
    onClick={() =>
      setServerImageReload((previous) => previous + 1)
    }
    style={{ marginTop: 10 }}
  >
    서버 이미지 다시 조회
  </button>
</section>  
                <section style={boxStyle}>
  <label style={controlsStyle}>
    <input
      type="checkbox"
      checked={useDatabase}
      onChange={(event) => {
        stopAllPhotos();
        setUseDatabase(event.target.checked);
      }}
    />
    DB 조회 사용
  </label>

  <p
    role="status"
    style={{ marginTop: 10, fontSize: 12 }}
  >
    {useDatabase
      ? databaseMessage
      : "로컬 CSV의 정답·예측 정보를 사용합니다."}
  </p>

  <button
    type="button"
    disabled={!useDatabase}
    onClick={() => setDatabaseReload((previous) => previous + 1)}
    style={{ marginTop: 10 }}
  >
    DB 다시 조회
  </button>

  <p style={{ marginTop: 10, fontSize: 12 }}>
    DB 사용 시 정답·예측 정보는 서버에서 조회합니다.
    센서 자동 연결을 켜면 현재 사진에 대응하는 센서 CSV도 서버에서 불러옵니다.
  </p>
</section>

            <section style={boxStyle}>
              <label style={{ display: "block", marginBottom: 14 }}>
                Set{selectedSet} 이미지 폴더
                <input
                  key={`images-${selectedSet}`}
                  type="file"
                  webkitdirectory=""
                  directory=""
                  multiple
                  disabled={useServerImages}
                  onChange={handleImages}
                  style={{ display: "block", marginTop: 8 }}
                />
              </label>

              <p style={{ fontSize: 12, marginBottom: 14 }} role="status">
                {imageMessage}
                {" · "}사진 {images.length}장 / 결과 매칭 {matchedCount}장
              </p>

              <label style={{ display: "block", marginBottom: 14 }}>
                예측 결과 CSV — rf_test_predictions.csv
                <input
                  type="file"
                  accept=".csv"
                  disabled={useDatabase}
                  onChange={handlePredictions}
                  style={{ display: "block", marginTop: 8 }}
                />
              </label>
              <p style={{ fontSize: 12, marginBottom: 14 }} role="status">
                {predictionMessage}
              </p>

              <label style={{ display: "block", marginBottom: 14 }}>
                정답 라벨 CSV — 선택 사항
                <input
                  type="file"
                  accept=".csv"
                  disabled={useDatabase}
                  onChange={handleLabels}
                  style={{ display: "block", marginTop: 8 }}
                />
              </label>
              <p style={{ fontSize: 12, marginBottom: 14 }} role="status">
                {labelMessage}
              </p>

              <div style={controlsStyle}>
                <button
                  disabled={!images.length || imageIndex === 0}
                  onClick={() => movePhoto(imageIndex - 1)}
                >
                  이전 사진
                </button>

                <button
                  disabled={images.length < 2 || photoPlaying}
                  onClick={() => startPhoto(selectedSet)}
                >
                  사진 자동 재생
                </button>

                <button
                  disabled={!photoPlaying}
                  onClick={() => stopPhoto(selectedSet)}
                >
                  사진 정지
                </button>

                <button
                  disabled={!SETS.some((set) => photoPlayingBySet[set])}
                  onClick={stopAllPhotos}
                >
                  전체 사진 정지
                </button>
                <p style={{ marginTop: 10, fontSize: 12 }} role="status">
                  재생 중:{" "}
                  {SETS.filter((set) => photoPlayingBySet[set])
                    .map((set) => `Set${set}`)
                    .join(", ") || "없음"}
                </p>
                <button
                  disabled={!images.length || imageIndex === images.length - 1}
                  onClick={() => movePhoto(imageIndex + 1)}
                >
                  다음 사진
                </button>
              </div>

              <p style={{ marginTop: 10, fontSize: 12 }}>
                {images.length ? imageIndex + 1 : 0} / {images.length}장
                {" · "}2초 간격
              </p>

              <label style={{ display: "block", marginTop: 16, fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={Boolean(testModes[selectedSet])}
                  onChange={(event) => {
                    setTestModes((previous) => ({
                      ...previous,
                      [selectedSet]: event.target.checked,
                    }));
                    setTestValues((previous) => ({
                      ...previous,
                      [selectedSet]: "",
                    }));
                  }}
                />{" "}
                색상 확인용 테스트 값 사용
              </label>

              {testModes[selectedSet] && (
                <input
                  aria-label="테스트 마모량"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="예: 25"
                  value={testValues[selectedSet] ?? ""}
                  disabled={photoPlaying || !currentImage}
                  onChange={(event) =>
                    setTestValues((previous) => ({
                      ...previous,
                      [selectedSet]: event.target.value,
                    }))
                  }
                  style={{ marginTop: 8, width: 120, padding: 6 }}
                />
              )}

              <p style={{ marginTop: 12, fontSize: 11, color: "#64748b" }}>
                정상: {WARNING}μm 미만 / 경고: {WARNING}μm 이상 {DANGER}μm 미만
                / 위험: {DANGER}μm 이상
                <br />
                저장된 예측 결과를 재생합니다. 실시간 AI 호출 전입니다.
              </p>
            </section>

            <section style={boxStyle}>
              <div style={{ marginBottom: 14 }}>
                <button
                  type="button"
                  aria-pressed={useServerSensors}
                  onClick={() => {
                    const next = !useServerSensors;

                    setSensorPlaying(false);
                    elapsedRef.current = 0;
                    setElapsed(0);

                    setSensor({
                      set: null,
                      name: "",
                      rows: [],
                    });

                    setSensorMessage(
                      next ? "센서 자동 연결 준비 중..." : "센서 CSV 선택 대기"
                    );

                    setUseServerSensors(next);
                  }}
                >
                  {useServerSensors
                    ? "서버 센서 자동 연결 끄기"
                    : "서버 센서 자동 연결 켜기"}
                </button>

                <p style={{ marginTop: 8, fontSize: 12 }} role="status">
                  자동 연결: {useServerSensors ? "켜짐" : "꺼짐"}
                </p>
              </div>
              <label>
                Set{selectedSet} 센서 CSV — 선택 사항
                <input
                  key={`sensor-${selectedSet}`}
                  type="file"
                  accept=".csv"
                  disabled={useServerSensors}
                  onChange={handleSensor}
                  style={{ display: "block", marginTop: 8 }}
                />
              </label>

              <p
                style={{ margin: "10px 0", fontSize: 12, overflowWrap: "anywhere" }}
                role="status"
              >
                {sensor.set === selectedSet
                  ? sensorMessage
                  : "현재 Set의 센서 CSV를 선택해주세요."}
              </p>

              <div style={controlsStyle}>
                <button
                  disabled={!sensorRows.length || sensorPlaying}
                  onClick={() => {
                    if (elapsedRef.current >= duration) {
                      elapsedRef.current = 0;
                      setElapsed(0);
                    }
                    setSensorPlaying(true);
                  }}
                >
                  센서 재생
                </button>
                <button
                  disabled={!sensorPlaying}
                  onClick={() => setSensorPlaying(false)}
                >
                  일시정지
                </button>
                <button
                  disabled={!sensorRows.length}
                  onClick={() => {
                    setSensorPlaying(false);
                    elapsedRef.current = 0;
                    setElapsed(0);
                  }}
                >
                  처음부터
                </button>
                <span style={{ fontSize: 12 }}>
                  {(sensorRows.length ? elapsed / 1000 : 0).toFixed(1)}초 /
                  {" "}{(duration / 1000).toFixed(1)}초
                </span>
              </div>

              <p style={{ marginTop: 10, fontSize: 11, color: "#64748b" }}>
                {useServerSensors
                  ? "최근 5초 표시 · 사진 변경 시 대응 센서로 전환하고 처음부터 재생"
                  : "최근 5초 표시 · 사진과 별도 재생"}
              </p>
              <p style={{ marginTop: 8, fontSize: 11, overflowWrap: "anywhere" }}>
                사진에 대응하는 센서: {expectedSensor || "정보 없음"}
                <br />
                {sensorRows.length && expectedSensor
                  ? sensorMatches
                    ? "선택한 센서 파일과 매칭됩니다."
                    : "현재 사진과 선택한 센서 파일이 다릅니다."
                  : ""}
              </p>
            </section>
          </div>
        </details>

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
                    column={columns[index]}
                    onChange={(column) =>
                      setColumns((previous) =>
                        previous.map((value, i) => i === index ? column : value)
                      )
                    }
                  />
                ))}
              </div>
            </section>

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
                    {current.wear === null && (selectedSet === 10 || selectedSet === 11)
                      ? "예측 결과 없음"
                      : current.status.label}
                  </h2>
                  <p>{current.source}: {formatWear(current.wear)}</p>
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
                <ResultCard
                  title="실제 마모량"
                  value={formatWear(actualWear)}
                  note="정답값"
                />
                <ResultCard
                  title="예측 마모량"
                  value={formatWear(current.prediction?.predicted)}
                  note="저장된 모델 예측 결과"
                  color={
                    getStatus(current.prediction?.predicted ?? null).color
                  }
                />
                <ResultCard
                  title="절대 오차"
                  value={formatWear(current.prediction?.error)}
                  note="|실제 마모량 − 예측 마모량|"
                />
                <ResultCard
                  title="마모 유형"
                  value={wearType(current.label?.type)}
                  note="정답 라벨 기준"
                />
              </div>
            </section>
          </div>
        </main>

        <aside className="notification-panel">
          <div className="notification-heading">
            <h2>전체 Set 알림</h2>
            <span>{alerts.length}</span>
          </div>

          <div className="notification-content">
            {alerts.length ? alerts.map((record) => (
              <div
                key={record.set}
                style={{
                  position: "relative",
                  padding: 14,
                  paddingRight: 38,
                  marginBottom: 14,
                  border: `1px solid ${record.status.color}`,
                  borderRadius: 10,
                  background: record.status.background,
                  fontSize: 12,
                  lineHeight: 1.9,
                }}
              >
                <button
                  type="button"
                  aria-label={`Set${record.set} 알림 닫기`}
                  title="알림 닫기"
                  onClick={() =>
                    setDismissedAlerts((previous) => ({
                      ...previous,
                      [record.set]: record.alertKey,
                    }))
                  }
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    display: "grid",
                    placeItems: "center",
                    width: 26,
                    height: 26,
                    padding: 0,
                    border: 0,
                    borderRadius: 5,
                    background: "transparent",
                    color: record.status.color,
                    fontSize: 22,
                    lineHeight: 1,
                    cursor: "pointer",
                  }}
                >
                  ×
                </button>
                <strong style={{ color: record.status.color }}>
                  [Set{record.set}] {record.status.label}
                </strong>

                <p style={{ marginTop: 8, overflowWrap: "anywhere" }}>
                  {record.image.name}
                </p>
                <p style={{ marginTop: 8 }}>
                  {record.source}: {formatWear(record.wear)}
                </p>
                <p style={{ color: "#64748b", marginTop: 8 }}>
                  {record.testing ? "테스트 입력값" : "저장 데이터 기준"}
                </p>

                <button
                  style={{ marginTop: 10 }}
                  onClick={() => changeSet(record.set)}
                >
                  Set{record.set} 보기
                </button>
              </div>
            )) : (
              <p style={{ fontSize: 12, color: "#64748b" }}>
                현재 경고·위험 알림이 없습니다.
              </p>
            )}
          </div>

          <p className="notification-footer">
            Set별 최신 상태 · 전체 공통 표시 · 이력 저장 전
          </p>
        </aside>
      </div>
    </div>
  );
}