import { getCuttingMarkers } from "../utils/cuttingSegmentMarkers.js";
// UI 번역은 React 컴포넌트에서 처리합니다.
// adapter에서는 언어에 종속되지 않는 코드만 전달합니다.

// UI의 예시 모델과 서버 모델을 분리합니다.
// null 예측값은 0으로 바꾸지 않습니다.
export function toMeasurement(
    record,
    image,
    sensorTime,
) {
  const type = record?.label?.type;

  return {
    image: image
        ? {
          url: image.url,
          filename: image.name,
          sensorTime,
        }
        : null,

    judgedWear:
        record?.wear ?? null,

    predictedWear:
        record?.prediction?.predicted ?? null,

    basis:
        record?.set === 10 ||
        record?.set === 11
            ? "prediction"
            : "label",

    status:
        record?.status?.level === "waiting"
            ? "pending"
            : (record?.status?.level ??
                "pending"),

    wearType: type,

    // 화면 표시용 번역은 컴포넌트에서 처리합니다.
    wearTypeLabel: type ?? null,
  };
}


export function toAlert(record) {
  return {
    id:
        record.id ??
        record.alertKey ??
        `current-${record.set}`,

    setNumber: record.set,

    level: record.status.level,

    ...toMeasurement(
        record,
        record.image,
    ),

    basis:
        record.source === "예측 마모량"
            ? "prediction"
            : record.source === "라벨 마모량"
                ? "label"
                : record.set >= 10
                    ? "prediction"
                    : "label",

    occurredAt: record.observedAt,

    acknowledgedAt:
    record.acknowledgedAt,

    cycleNumber:
    record.cycleNumber,

    canAcknowledge:
        Boolean(
            record.canAcknowledge,
        ),

    warningThreshold:
    record.warningThreshold,

    dangerThreshold:
    record.dangerThreshold,

    original: record,
  };
}


const CHANNELS = [
  [
    "acoustic",
    "acoustic",
    "ACOUSTIC",
  ],
  [
    "acceleration",
    "acceleration",
    "ACCELEROMETER",
  ],
  [
    "force-x",
    "forceX",
    "FORCE X",
  ],
  [
    "force-y",
    "forceY",
    "FORCE Y",
  ],
];


// 기존 그래프와 같은 구간별 최솟값·최댓값 방식.
// 피크와 시간 좌표를 유지합니다.
// 센서 파일별 채널 범위를 한 번 계산해 보관합니다.
const sensorRangeCache = new WeakMap();

function getSensorRanges(rows) {
  if (sensorRangeCache.has(rows)) {
    return sensorRangeCache.get(rows);
  }

  const ranges = CHANNELS.map((_, column) => {
    let min = Infinity;
    let max = -Infinity;

    for (const row of rows) {
      const value = row.values?.[column];
      if (!Number.isFinite(value)) continue;

      min = Math.min(min, value);
      max = Math.max(max, value);
    }

    if (!Number.isFinite(min)) return null;

    const padding = max > min
      ? (max - min) * 0.05
      : Math.max(Math.abs(min) * 0.05, 1);

    return { min: min - padding, max: max + padding };
  });

  sensorRangeCache.set(rows, ranges);
  return ranges;
}
// 파일별·채널별 변화 지점을 계산해 보관합니다.
function getWaveformMarkers(rows) {
  const origin = rows[0]?.ms ?? 0;
  const common = getCuttingMarkers(rows).map(
    (seconds) => origin + seconds * 1000,
  );
  return CHANNELS.map(() => common);
}



export function toSensorChannels(
  rows = [],
  sensorStartMs = 0,
  allRows = rows,
) {
  const ranges = getSensorRanges(allRows);
  const markers = getWaveformMarkers(allRows);

  const step = Math.max(
    1,
    Math.ceil(rows.length / 250),
  );

  return CHANNELS.map(
    ([id, labelKey, subtitle], column) => {
      const samples = [];

      for (
        let begin = 0;
        begin < rows.length;
        begin += step
      ) {
        const end = Math.min(
          rows.length,
          begin + step,
        );

        let low = begin;
        let high = begin;

        for (let i = begin; i < end; i++) {
          if (
            rows[i].values[column] <
            rows[low].values[column]
          ) {
            low = i;
          }

          if (
            rows[i].values[column] >
            rows[high].values[column]
          ) {
            high = i;
          }
        }

        const indices = [...new Set([low, high])]
          .sort((a, b) => a - b);

        for (const i of indices) {
          samples.push({
            time:
              (rows[i].ms - sensorStartMs) / 1000,
            value: rows[i].values[column],
          });
        }
      }

      return {
        id,
        labelKey,
        subtitle,
        samples,
        yRange: ranges[column],
        changeMarkers: markers[column].map(
          (ms) => (ms - sensorStartMs) / 1000,
        ),
      };
    },
  );
}
