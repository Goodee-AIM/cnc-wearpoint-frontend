import test from 'node:test';
import assert from 'node:assert/strict';
import { matchingReplayPrediction } from '../src/utils/monitoringRunIdentity.js';

const current = {
  session_id: 's1', playback_generation: 2, cycle_number: 4,
  set_number: 4, position: 5, measurement_id: 1001,
  playback_phase: 'showing',
};
const run = {
  ...current, run_id: 'unique', status: 'completed',
  predicted_wear_um: 157.3, predicted_type: 'flank_wear', wear_status: 'warning',
};

test('only matching completed run in showing phase appears', () => {
  assert.equal(matchingReplayPrediction(current, run).predictedWear, 157.3);
  for (const phase of ['playing', 'waiting', undefined]) {
    assert.equal(matchingReplayPrediction({...current, playback_phase: phase}, run), null);
  }
  assert.equal(matchingReplayPrediction(current, {...run, status:'running'}), null);
});

test('other measurement in same Set is never displayed', () => {
  assert.equal(matchingReplayPrediction({...current, position:6, measurement_id:1002}, run), null);
});

test('generation and cycle fence stale inference on restart', () => {
  assert.equal(matchingReplayPrediction({...current, playback_generation:3}, run), null);
  assert.equal(matchingReplayPrediction({...current, cycle_number:5}, run), null);
});

test('wrong Set/session cannot leak a result', () => {
  assert.equal(matchingReplayPrediction({...current, set_number:6}, run), null);
  assert.equal(matchingReplayPrediction({...current, session_id:'s2'}, run), null);
});

test('invalid or incomplete data fail closed', () => {
  assert.equal(matchingReplayPrediction({...current, measurement_id:null}, run), null);
  assert.equal(matchingReplayPrediction({...current, cycle_number:'4'}, run), null);
  assert.equal(matchingReplayPrediction(current, {...run, predicted_wear_um:NaN}), null);
  assert.equal(matchingReplayPrediction(current, {...run, wear_status:null}), null);
});

test('same occurrence recognizes failure without exposing an old prediction', () => {
  assert.equal(matchingReplayPrediction(current, { ...run, status: 'failed' }), null);
});
