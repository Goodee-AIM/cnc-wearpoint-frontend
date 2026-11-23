// 알림 이력 -> 모니터링 이동 시, 모니터링 추론으로 발생한 알림은
// 알림에 저장된 추론값(예측 마모량·단계·예측 유형)을 그대로 보여줍니다.
// 이 이동은 수동 조회 모드로 전환되어 측정 기록을 다시 조회하는데,
// 추론 결과는 predictions 테이블에 없으므로 예측 마모량이 "예측 결과 없음"이 되고
// 상태·유형은 측정 기록의 정답 라벨로 채워지던 문제를 막습니다(2026-11-21).

// wear.js와 같은 규칙입니다. wear.js는 dashboardConfig(import.meta.env)를 불러와
// node --test에서 import할 수 없으므로 여기에 둡니다.
function fileKey(name) {
  return String(name ?? "").split(/[\\/]/).pop().replace(/\.(png|jpe?g)$/i, "");
}

function numberOrNull(value) {
  if (value == null || String(value).trim() === "") return null;
  const result = Number(value);
  return Number.isFinite(result) && result >= 0 ? result : null;
}

// useAlerts historyRecord의 source 값: 모니터링 추론(source=prediction)으로 발생한 알림
const INFERENCE_SOURCE = "예측 마모량";

// 추론 알림이 아니면 null을 반환해 기존 화면 동작을 그대로 둡니다.
export function alertPreviewSnapshot(record) {
  const set = record?.set;
  const imageName = record?.image?.name;
  if (!set || !imageName || record.source !== INFERENCE_SOURCE) return null;
  const predicted = numberOrNull(record.prediction?.predicted) ?? numberOrNull(record.wear);
  if (predicted === null) return null;
  return {
    // Only real occurrence-linked inference alerts may trigger another Serving call.
    alertId: record.inferenceRunId && /^monitoring:[1-9][0-9]*$/.test(record.id ?? "")
      ? record.id : null,
    set,
    imageName,
    predicted,
    level: record.status?.level ?? null,
    // 추론 알림은 예측 유형을 original_type 칸에 저장합니다(monitoring_inference_alerts.py).
    type: record.label?.type ?? record.prediction?.type ?? null,
  };
}

// 알림의 Set과 이미지가 지금 화면과 같을 때만 알림의 추론값으로 덮어씁니다.
export function applyAlertPreview(measurement, snapshot, selectedSet) {
  if (!measurement || !snapshot || snapshot.set !== selectedSet) return measurement;
  if (fileKey(measurement.image?.filename) !== fileKey(snapshot.imageName)) return measurement;
  return {
    ...measurement,
    judgedWear: null,
    predictedWear: snapshot.predicted,
    status: snapshot.level ?? measurement.status,
    wearType: snapshot.type,
    wearTypeLabel: snapshot.type,
    basis: "prediction",
  };
}
