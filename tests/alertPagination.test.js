import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadSharedAlertPage } from '../src/utils/alertHistory.js';

function page(values = {}) {
  return { total: 1441, unread: 1441, current_total: 1441, current_unread: 1441,
    filtered_total: 1441, event_max_id: 6000, session_id: 'session-a', legacy_max_id: 0,
    items: Array.from({ length: 50 }, (_, i) => ({ id: `monitoring:${i}`, session_id: 'session-a' })), ...values };
}

test('large history requires one request to show the first page and full counts', async (context) => {
  let calls = 0;
  const controller = new AbortController();
  context.mock.method(globalThis, 'fetch', async (url, options) => {
    calls++;
    assert.equal(url.searchParams.get('limit'), '50');
    assert.equal(url.searchParams.get('offset'), '0');
    assert.equal(options.signal, controller.signal);
    assert.equal(options.cache, 'no-store');
    return { ok: true, json: async () => page() };
  });
  const result = await loadSharedAlertPage('http://localhost:8001', {}, controller.signal);
  assert.equal(calls, 1);
  assert.equal(result.items.length, 50);
  assert.equal(result.current_total, 1441);
});

test('later pages keep session and id cap while filters are sent to the server', async (context) => {
  context.mock.method(globalThis, 'fetch', async (url) => {
    assert.equal(url.searchParams.get('offset'), '50');
    assert.equal(url.searchParams.get('event_max_id'), '6000');
    assert.equal(url.searchParams.get('session_id'), 'session-a');
    assert.equal(url.searchParams.get('set_number'), '11');
    assert.equal(url.searchParams.get('level'), 'danger');
    assert.equal(url.searchParams.get('read_status'), 'unread');
    return { ok: true, json: async () => page() };
  });
  await loadSharedAlertPage('http://localhost:8001', {
    page: 1, set: '11', level: 'danger', read: 'unread', snapshot: { event_max_id: 6000, session_id: 'session-a' },
  });
});

test('empty filter result still returns current session global counts', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => page({ filtered_total: 0, items: [] }) }));
  const result = await loadSharedAlertPage('http://localhost:8001');
  assert.equal(result.current_total, 1441);
  assert.deepEqual(result.items, []);
});

test('session reset preserves HTTP 409 for restarting at page one', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => ({ ok: false, status: 409 }));
  await assert.rejects(loadSharedAlertPage('http://localhost:8001'), (error) => error.status === 409);
});

test('old backend and mixed-session pages fail explicitly', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => page({ current_total: undefined }) }));
  await assert.rejects(loadSharedAlertPage('http://localhost:8001'), /버전/);
  context.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => page({ items: [{ id: 'monitoring:1', session_id: 'other' }] }) }));
  await assert.rejects(loadSharedAlertPage('http://localhost:8001'), /응답 형식/);
});

test('ten-row history pages keep global counts and use ten-row offsets', async (context) => {
  context.mock.method(globalThis, 'fetch', async (url) => {
    assert.equal(url.searchParams.get('limit'), '10');
    assert.equal(url.searchParams.get('offset'), '10');
    assert.equal(url.searchParams.get('event_max_id'), '6000');
    return { ok: true, json: async () => page({items: page().items.slice(0,10)}) };
  });
  const result = await loadSharedAlertPage('http://localhost:8001', {
    page: 1, pageSize: 10, snapshot: { session_id: 'session-a', event_max_id: 6000 },
  });
  assert.equal(result.items.length,10);
  assert.equal(result.current_total,1441);
});

test('invalid page sizes are rejected before fetching', async () => {
  for (const pageSize of [0,501,1.5]) {
    await assert.rejects(loadSharedAlertPage('http://localhost:8001',{pageSize}), /페이지 크기/);
  }
});
