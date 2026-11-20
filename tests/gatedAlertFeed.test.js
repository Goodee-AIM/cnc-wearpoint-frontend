import test from 'node:test';
import assert from 'node:assert/strict';
import { gatedAlertRecords } from '../src/utils/gatedAlertFeed.js';
import { createLiveAlertDetector } from '../src/utils/alertToastFeed.js';

const set = (number, overrides = {}) => ({
  session_id: 's', playback_generation: 2, cycle_number: 3,
  set_number: number, position: 1, measurement_id: number + 100,
  image_name: 'a.png', image_url: '/a.png', playback_phase: 'showing',
  ...overrides,
});
const run = (setNumber, wear, overrides = {}) => ({
  ...set(setNumber), run_id: `uuid-${setNumber}`, status: 'completed',
  predicted_wear_um: wear, predicted_type: 'flank',
  wear_status: wear >= 200 ? 'danger' : wear >= 150 ? 'warning' : 'normal',
  ...overrides,
});

test('alerts for Set1 while Set2 page is selected; no Set switching needed', () => {
  const rows = gatedAlertRecords('s', { 4: set(4), 5: set(5) }, [run(4, 175), run(5, 90)]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].set, 4);
  const detector = createLiveAlertDetector();
  assert.equal(detector.scan({ records: rows, enabled: true }).length, 1);
  assert.equal(detector.scan({ records: rows, enabled: true }).length, 0);
});
test('200 is danger; 150 is warning; below 150 no notification', () => {
  const values = [149.99, 150, 199.99, 200];
  assert.deepEqual(values.map(w => gatedAlertRecords('s', {4:set(4)}, [run(4,w)])[0]?.status.level ?? null),
    [null,'warning','warning','danger']);
});
test('rejects other Set, measurement, generation, cycle and in-progress run', () => {
  for (const overrides of [
    { set_number: 5 }, {measurement_id: 900}, {playback_generation: 1},
    {cycle_number: 2}, {position: 2}, {status: 'running'},
  ]) assert.deepEqual(gatedAlertRecords('s', {4:set(4)}, [run(4,175,overrides)]), []);
  assert.deepEqual(gatedAlertRecords('s', {4:set(4,{playback_phase:'waiting'})}, [run(4,175)]), []);
});
test('restart of same session and cycle triggers fresh toast only for new generation', () => {
  const detector = createLiveAlertDetector();
  const records = gatedAlertRecords('s',{4:set(4)},[run(4,175)]);
  assert.equal(detector.scan({records,enabled:true}).length,1);
  assert.equal(detector.scan({records,enabled:true}).length,0);
  const later = gatedAlertRecords('s',{4:set(4,{playback_generation:3})},[run(4,175,{playback_generation:3,run_id:'next'})]);
  assert.equal(detector.scan({records:later,enabled:true}).length,1);
});
