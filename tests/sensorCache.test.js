import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSensorCache } from '../src/utils/sensorCache.js';

const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };

test('switching away and back reuses the same in-flight request and parsed rows', async () => {
  const waiting = deferred(); let calls = 0;
  const cache = createSensorCache({ load: async () => { calls++; return waiting.promise; } });
  const first = cache.read('session-a:set5:file', '/set5.csv');
  const returning = cache.read('session-a:set5:file', '/set5.csv');
  assert.equal(first, returning);
  await Promise.resolve(); assert.equal(calls, 1);
  const rows = [{ms: 123, values: [1,2,3,4,5]}]; waiting.resolve(rows);
  await first;
  assert.equal(cache.peek('session-a:set5:file').rows, rows);
  assert.equal(await cache.read('session-a:set5:file', '/set5.csv'), rows);
  assert.equal(calls, 1); cache.close();
});

test('all eight current Sets remain cached and a new session cannot reuse old rows', async () => {
  let calls = 0;
  const cache = createSensorCache({ load: async url => { calls++; return [url]; } });
  for (let set = 4; set <= 11; set++) await cache.read(`a:${set}`, `/set${set}`);
  await cache.read('a:5', '/set5'); assert.equal(calls, 8);
  await cache.read('b:5', '/set5'); assert.equal(calls, 9);
  assert.equal(cache.peek('b:5').status, 'ready'); cache.close();
});

test('failed loads retry and cache cleanup aborts pending requests without late notifications', async () => {
  let calls = 0, signal, changes = 0;
  const waiting = deferred();
  const cache = createSensorCache({ onChange: () => changes++, load: async (_, s) => {
    calls++; signal = s; if (calls === 1) throw new Error('HTTP 503'); return waiting.promise;
  }});
  await cache.read('a', '/file'); assert.equal(cache.peek('a').status, 'error');
  const retry = cache.read('a', '/file'); await Promise.resolve();
  assert.equal(calls, 2); cache.close(); assert(signal.aborted);
  waiting.resolve([1]); await retry; assert.equal(changes, 1); assert.equal(cache.peek('a'), undefined);
});

test('bounded cache evicts older completed data while preserving recently viewed data', async () => {
  const cache = createSensorCache({ capacity: 2, load: async url => [url] });
  await cache.read('a', '/a'); await cache.read('b', '/b'); cache.peek('a');
  await cache.read('c', '/c');
  assert(cache.peek('a')); assert(cache.peek('c')); assert.equal(cache.peek('b'), undefined); cache.close();
});

test('pinned current-measurement files survive eviction while other Sets advance', async () => {
  let visible = new Map();
  const cache = createSensorCache({ capacity: 12, onChange: (m) => { visible = m; }, load: async (url) => [url] });
  const key = (set, n) => `session:${set}:m${n}`;
  await cache.read(key(4, 1), '/set4/m1');
  // Regression: without pinning, 12 newer files evicted the selected Set's rows.
  cache.pin([key(4, 1)]);
  for (let round = 1; round <= 3; round++) {
    for (const set of [5, 6, 7, 8, 9, 10, 11]) await cache.read(key(set, round), `/set${set}/m${round}`);
  }
  assert.equal(visible.get(key(4, 1))?.status, 'ready');
  assert.equal(cache.peek(key(4, 1)).status, 'ready');
  // Unpinned older files are still bounded by capacity (pinned ones excepted).
  assert(visible.size <= 13);
  cache.close();
});
