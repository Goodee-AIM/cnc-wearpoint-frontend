const WEAR_TYPE_LABELS = { flank_wear: "플랭크 마모", adhesion: "응착" };

// UI의 예시 모델과 서버 모델을 분리합니다. null 예측값은 0으로 바꾸지 않습니다.
export function toMeasurement(record, image, sensorTime) {
  const type = record?.label?.type;
  return {
    image: image ? { url: image.url, filename: image.name, sensorTime } : null,
    judgedWear: record?.wear ?? null,
    predictedWear: record?.prediction?.predicted ?? null,
    basis: record?.set === 10 || record?.set === 11 ? "prediction" : "label",
    status: record?.status?.level === "waiting" ? "pending" : (record?.status?.level ?? "pending"),
    wearType: type,
    wearTypeLabel: type ? (WEAR_TYPE_LABELS[type] ?? type) : "유형 정보 없음",
  };
}

export function toAlert(record) {
  return {
    id: record.id ?? record.alertKey ?? `current-${record.set}`,
    setNumber: record.set,
    level: record.status.level,
    ...toMeasurement(record, record.image),
    basis: record.source === "예측 마모량" ? "prediction" : record.source === "라벨 마모량" ? "label" : (record.set >= 10 ? "prediction" : "label"),
    occurredAt: record.observedAt,
    acknowledgedAt: record.acknowledgedAt,
    cycleNumber: record.cycleNumber,
    canAcknowledge: Boolean(record.canAcknowledge),
    warningThreshold: record.warningThreshold,
    dangerThreshold: record.dangerThreshold,
    original: record,
  };
}

const CHANNELS = [
  ["acoustic", "음향", "ACOUSTIC"],
  ["acceleration", "가속도", "ACCELEROMETER"],
  ["force-x", "X축", "FORCE X"],
  ["force-y", "Y축", "FORCE Y"],
];

// 기존 그래프와 같은 구간별 최솟값·최댓값 방식. 피크와 시간 좌표를 유지합니다.
export function toSensorChannels(rows = [], sensorStartMs = 0) {
  const step = Math.max(1, Math.ceil(rows.length / 250));
  return CHANNELS.map(([id, label, subtitle], column) => {
    const samples = [];
    for (let begin = 0; begin < rows.length; begin += step) {
      const end = Math.min(rows.length, begin + step);
      let low = begin, high = begin;
      for (let i = begin; i < end; i++) {
        if (rows[i].values[column] < rows[low].values[column]) low = i;
        if (rows[i].values[column] > rows[high].values[column]) high = i;
      }
      for (const i of [...new Set([low, high])].sort((a, b) => a - b)) {
        samples.push({ time: (rows[i].ms - sensorStartMs) / 1000, value: rows[i].values[column] });
      }
    }
    return { id, label, subtitle, samples };
  });
}
