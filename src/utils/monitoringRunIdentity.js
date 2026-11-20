/** Guard one inference result against the exact visible occurrence. */
const fields = [
  'session_id', 'playback_generation', 'cycle_number',
  'set_number', 'position', 'measurement_id',
];
const numbers = new Set(['playback_generation', 'cycle_number', 'set_number', 'position', 'measurement_id']);

export function validOccurrence(value) {
  if (!value || typeof value !== 'object') return false;
  return fields.every((field) => {
    const part = value[field];
    return numbers.has(field)
      ? Number.isSafeInteger(part) && part >= (field === 'cycle_number' || field === 'set_number' || field === 'measurement_id' ? 1 : 0)
      : typeof part === 'string' && part.trim().length > 0;
  });
}

export function sameReplayOccurrence(visible, run) {
  return validOccurrence(visible) && validOccurrence(run)
    && fields.every((name) => visible[name] === run[name]);
}

export function matchingReplayPrediction(visible, run) {
  if (visible?.playback_phase !== 'showing' || run?.status !== 'completed') return null;
  if (!sameReplayOccurrence(visible, run)) return null;
  if (!Number.isFinite(run.predicted_wear_um) || run.predicted_wear_um < 0) return null;
  if (typeof run.predicted_type !== 'string' || !run.predicted_type.trim()) return null;
  if (!['normal', 'warning', 'danger'].includes(run.wear_status)) return null;
  return {
    predictedWear: run.predicted_wear_um,
    wearType: run.predicted_type,
    wearTypeLabel: run.predicted_type,
    status: run.wear_status,
    basis: 'prediction',
  };
}
