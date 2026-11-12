import assert from "node:assert/strict";
import { test } from "node:test";
import { loadSharedAlertHistory, retainKnownAcknowledgments } from "../src/utils/alertHistory.js";

function record(id, values = {}) {
  return { id, session_id: "session-a", measurement_id: 10,
    created_at: "2026-11-11T01:00:00+00:00", detail_confirmed_at: null, ...values };
}

test("new insertions cannot shift the second alert page", async (context) => {
  const urls = [];
  context.mock.method(globalThis, "fetch", async (url) => {
    urls.push(url);
    const offset = Number(url.searchParams.get("offset"));
    if (offset === 100) {
      assert.equal(url.searchParams.get("event_max_id"), "100");
      assert.equal(url.searchParams.get("legacy_max_id"), "50");
      assert.equal(url.searchParams.get("session_id"), "session-a");
    }
    return { ok: true, json: async () => ({
      total: 101, event_max_id: 100, legacy_max_id: 50, session_id: "session-a",
      items: Array.from({ length: offset === 0 ? 100 : 1 }, (_, i) => record(`monitoring:${offset + i}`)),
    }) };
  });
  const rows = await loadSharedAlertHistory("http://localhost:8001");
  assert.equal(rows.length, 101);
  assert.equal(urls.length, 2);
});

test("legacy and monitoring records with the same numeric id are separate occurrences", async (context) => {
  context.mock.method(globalThis, "fetch", async () => ({ ok: true, json: async () => ({
    total: 2, event_max_id: 1, legacy_max_id: 1,
    items: [record("legacy:1"), record("monitoring:1")],
  }) }));
  const rows = await loadSharedAlertHistory("http://localhost:8001");
  assert.equal(rows.length, 2);
});

test("duplicate or partial pages trigger retry instead of displaying a wrong count", async (context) => {
  context.mock.method(globalThis, "fetch", async () => ({ ok: true, json: async () => ({
    total: 2, event_max_id: 1, legacy_max_id: 0,
    items: [record("monitoring:1"), record("monitoring:1")],
  }) }));
  await assert.rejects(loadSharedAlertHistory("http://localhost:8001"), /목록이 변경/);
});

test("stale fetch does not clear an acknowledgment completed during the request", () => {
  const confirmed = record("monitoring:1", { detail_confirmed_at: "2026-11-11T01:05:00+00:00" });
  const [merged] = retainKnownAcknowledgments([record("monitoring:1")], [confirmed]);
  assert.equal(merged.detail_confirmed_at, confirmed.detail_confirmed_at);
});

test("reused ids after a DB reset do not inherit old acknowledgments", () => {
  const confirmed = record("monitoring:1", { detail_confirmed_at: "2026-11-11T01:05:00+00:00" });
  const [merged] = retainKnownAcknowledgments([
    record("monitoring:1", { session_id: "new-session" }),
  ], [confirmed]);
  assert.equal(merged.detail_confirmed_at, null);
});


test("reset between pages rejects the old session and the next refresh starts clean", async (context) => {
  let reset = false;
  context.mock.method(globalThis, "fetch", async (url) => {
    if (url.searchParams.get("offset") === "100") {
      assert.equal(url.searchParams.get("session_id"), "session-a");
      reset = true;
      return { ok: false, status: 409 };
    }
    return { ok: true, json: async () => reset ? {
      total: 0, event_max_id: 0, legacy_max_id: 0, session_id: "session-b", items: [],
    } : {
      total: 101, event_max_id: 101, legacy_max_id: 0, session_id: "session-a",
      items: Array.from({ length: 100 }, (_, i) => record(`monitoring:${i}`)),
    } };
  });
  await assert.rejects(loadSharedAlertHistory("http://localhost:8001"), /409/);
  assert.deepEqual(await loadSharedAlertHistory("http://localhost:8001"), []);
});
