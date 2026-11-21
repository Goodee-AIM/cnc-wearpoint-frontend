// Pure state machine for one saved-alert review. A fresh model response is
// shown only after both the historical waveform and Serving have completed.
// Never fall back to historical label data or previously saved predictions.
export function historicalReinferPhase({
  active = false,
  imageMatched = false,
  imageUnavailable = false,
  sensorReady = false,
  sensorUnavailable = false,
  sensorPlaying = false,
  elapsedMs = 0,
  durationMs = 0,
  inferenceStatus = 'idle',
  holdFinished = false,
} = {}) {
  if (!active) return null;
  if (inferenceStatus === 'error') return 'error';
  const noReplay = imageUnavailable || sensorUnavailable;
  if (!imageMatched && !imageUnavailable) return 'loading';
  if (!noReplay && !sensorReady) return 'loading';
  if (!noReplay && (sensorPlaying || !Number.isFinite(elapsedMs) || elapsedMs < durationMs)) {
    return 'playing';
  }
  if (inferenceStatus !== 'completed') return 'waiting';
  return holdFinished ? 'finished' : 'showing';
}

export function canRevealFreshInference(phase) {
  return phase === 'showing' || phase === 'finished';
}

export function freshAlertSnapshot(original, inference) {
  const result = inference?.prediction;
  if (!original?.alertId || !result || !Number.isFinite(result.predicted_wear_um)) return null;
  if (!['normal', 'warning', 'danger'].includes(result.wear_status)) return null;
  // The API never accepts an arbitrary measurement_id in the request. Also
  // fence late frontend responses by alert_id and the original selection.
  if (inference.alert_id !== original.alertId) return null;
  return {
    ...original,
    predicted: result.predicted_wear_um,
    type: result.predicted_type ?? null,
    level: result.wear_status,
  };
}
