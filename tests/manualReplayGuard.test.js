import test from 'node:test';
import assert from 'node:assert/strict';
import { replayMeasurementId, matchesManualReplay } from '../src/utils/manualReplayGuard.js';

const result = (wear=175, status='warning') => ({
  measurement_id:920,
  prediction:{prediction_id:1001,predicted_wear_um:wear,status,
    predicted_type:'flank',model_name:'cnc-wearpoint-multitask',model_version:'1',
    warning_threshold_um:150,danger_threshold_um:200}
});
test('only a positive, persisted measurement ID is replayable', () => {
  assert.equal(replayMeasurementId({ measurementId: 920 }), 920);
  for (const id of [null, undefined, 0, -1, 1.25, '920', Number.NaN]) {
    assert.equal(replayMeasurementId({ measurementId: id }), null);
  }
});
test('results from another measurement or an incomplete prediction fail closed', () => {
  assert.ok(matchesManualReplay(920, result()));
  assert.equal(matchesManualReplay(919, result()), false);
  assert.equal(matchesManualReplay(920, {...result(),measurement_id:919}), false);
  assert.equal(matchesManualReplay(920, {...result(),prediction:{...result().prediction,predicted_wear_um:null}}), false);
  assert.equal(matchesManualReplay(920, {...result(),prediction:{...result().prediction,predicted_type:null}}), false);
});
test('150/200 thresholds, zero and boundary values are checked', () => {
  assert.ok(matchesManualReplay(920,result(0,'normal')));
  assert.ok(matchesManualReplay(920,result(150,'warning')));
  assert.ok(matchesManualReplay(920,result(200,'danger')));
  assert.equal(matchesManualReplay(920,result(175,'normal')), false);
  assert.equal(matchesManualReplay(920,{...result(),prediction:{...result().prediction,warning_threshold_um:50}}), false);
});
