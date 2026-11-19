// Accept only the completed prediction for the SAME persisted Set test input.
// ManualInputPage also fences network responses with currentRequest generation.
export function replayMeasurementId(result) {
  const id = result?.measurementId;
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function matchesManualReplay(expectedMeasurementId, payload) {
  const prediction = payload?.prediction;
  const rawWear = prediction?.predicted_wear_um;
  if (!Number.isSafeInteger(expectedMeasurementId) || expectedMeasurementId <= 0 ||
      payload?.measurement_id !== expectedMeasurementId || !prediction ||
      !Number.isSafeInteger(prediction.prediction_id) || prediction.prediction_id <= 0 ||
      rawWear == null || String(rawWear).trim() === "" ||
      !Number.isFinite(Number(rawWear)) || Number(rawWear) < 0 ||
      typeof prediction.predicted_type !== "string" || !prediction.predicted_type.trim() ||
      typeof prediction.model_name !== "string" || !prediction.model_name.trim() ||
      !String(prediction.model_version ?? "").trim() ||
      Number(prediction.warning_threshold_um) !== 150 ||
      Number(prediction.danger_threshold_um) !== 200) return false;
  const level = Number(rawWear) >= 200 ? "danger" : Number(rawWear) >= 150 ? "warning" : "normal";
  return prediction.status === level;
}
