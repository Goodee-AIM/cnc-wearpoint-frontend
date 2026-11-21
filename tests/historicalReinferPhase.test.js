import { test } from 'node:test';
import assert from 'node:assert/strict';
import { historicalReinferPhase, canRevealFreshInference, freshAlertSnapshot } from '../src/utils/historicalReinferPhase.js';

const base = {active:true,imageMatched:true,sensorReady:true,sensorPlaying:true,elapsedMs:1000,durationMs:5000,inferenceStatus:'completed'};
test('completed inference stays hidden while historical graph plays', () => {
  assert.equal(historicalReinferPhase(base), 'playing');
  assert.equal(canRevealFreshInference('playing'), false);
});
test('graph ending before inference waits without showing stale data', () => {
  assert.equal(historicalReinferPhase({...base,sensorPlaying:false,elapsedMs:5000,inferenceStatus:'loading'}),'waiting');
});
test('graph ending after inference reveals fresh result for three-second display', () => {
  assert.equal(historicalReinferPhase({...base,sensorPlaying:false,elapsedMs:5000}),'showing');
  assert.equal(historicalReinferPhase({...base,sensorPlaying:false,elapsedMs:5000,holdFinished:true}),'finished');
  assert.equal(canRevealFreshInference('showing'), true);
});
test('CSV error does not hang if new inference completed', () => {
  assert.equal(historicalReinferPhase({...base,sensorReady:false,sensorUnavailable:true}),'showing');
  assert.equal(historicalReinferPhase({...base,sensorReady:false,sensorUnavailable:true,inferenceStatus:'loading'}),'waiting');
});
test('missing image does not invent a replay or reveal stale data', () => {
  assert.equal(historicalReinferPhase({...base,imageMatched:false,imageUnavailable:false}),'loading');
  assert.equal(historicalReinferPhase({...base,imageMatched:false,imageUnavailable:true,inferenceStatus:'error'}),'error');
});
test('failed re-inference never reveals old saved value', () => {
  assert.equal(historicalReinferPhase({...base,sensorPlaying:false,elapsedMs:5000,inferenceStatus:'error'}),'error');
  assert.equal(canRevealFreshInference('error'),false);
});
test('fresh response identity and numerical/status checks', () => {
  const selected = {alertId:'monitoring:31',set:4,imageName:'x.jpg',predicted:190,level:'warning'};
  const response = {alert_id:'monitoring:31',prediction:{predicted_wear_um:220.5,predicted_type:'flank',wear_status:'danger'}};
  assert.deepEqual(freshAlertSnapshot(selected,response),{...selected,predicted:220.5,type:'flank',level:'danger'});
  assert.equal(freshAlertSnapshot(selected,{...response,alert_id:'monitoring:30'}),null);
  assert.equal(freshAlertSnapshot(selected,{...response,prediction:{...response.prediction,predicted_wear_um:NaN}}),null);
});
