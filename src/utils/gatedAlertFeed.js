import { matchingReplayPrediction } from './monitoringRunIdentity.js';

/** All eight Sets, irrespective of which Set is currently selected. */
export function gatedAlertRecords(sessionId, sets, runs) {
  if (typeof sessionId !== 'string' || !sessionId || !Array.isArray(runs)) return [];
  return Object.values(sets ?? {}).flatMap((set) => {
    if (set?.playback_phase !== 'showing' || !set?.image_name) return [];
    const visible = {
      session_id: sessionId,
      playback_generation: set.playback_generation,
      cycle_number: set.cycle_number,
      set_number: set.set_number,
      position: set.position,
      measurement_id: set.measurement_id,
      playback_phase: set.playback_phase,
    };
    const run = runs.find((candidate) => {
      const prediction = matchingReplayPrediction(visible, candidate);
      return prediction !== null && typeof candidate.run_id === 'string' && !!candidate.run_id.trim();
    });
    if (!run) return [];
    const prediction = matchingReplayPrediction(visible, run);
    const expected = prediction.predictedWear >= 200 ? 'danger'
      : prediction.predictedWear >= 150 ? 'warning' : 'normal';
    if (!['warning', 'danger'].includes(expected) || prediction.status !== expected) return [];
    return [{
      id: `inference:${run.run_id}`,
      runId: run.run_id,
      sessionId,
      playbackGeneration: visible.playback_generation,
      cycleNumber: visible.cycle_number,
      set: visible.set_number,
      image: { name: set.image_name, url: set.image_url },
      status: { level: prediction.status },
      wear: prediction.predictedWear,
      source: '예측 마모량',
      prediction: { type: prediction.wearType, predicted: prediction.predictedWear },
      label: null,
      warningThreshold: 150,
      dangerThreshold: 200,
      observedAt: new Date().toISOString(),
    }];
  });
}
