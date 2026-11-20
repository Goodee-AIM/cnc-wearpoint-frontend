import test from "node:test";
import assert from "node:assert/strict";
import { loadManualCuttingMarkers } from "../src/utils/manualCuttingSegment.js";
import { getCuttingMarkers, setCuttingMarkers } from "../src/utils/cuttingSegmentMarkers.js";
import { toSensorChannels } from "../src/aim-ui/adapters.js";

const api = "https://example.test";
const result = { status: "ok", start_seconds: 2.1, end_seconds: 7.6 };
const makeRows = () => Array.from({ length: 100 }, (_, i) => ({
  ms: 100000 + i * 100, values: [i, i * 2, i * 3, i * 4],
}));

test("uploaded and restored Blob CSVs use Python and share boundaries across four channels", async t => {
  for (const source of ["blob:https://example.test/new", "blob:https://example.test/restored"]) {
    const rows = makeRows();
    const calls = [];
    t.mock.method(globalThis, "fetch", async (url, options) => {
      calls.push([String(url), options]);
      return calls.length === 1
        ? new Response("1,2,3,4,5,timestamp")
        : Response.json(result);
    });
    await loadManualCuttingMarkers(rows, source, api, new AbortController().signal);
    assert.equal(calls[0][0], source);
    assert.equal(calls[1][0], api + "/api/sensors/cutting-segment");
    assert.equal(calls[1][1].method, "POST");
    assert.equal(await calls[1][1].body.get("sensor_csv").text(), "1,2,3,4,5,timestamp");
    const channels = toSensorChannels(rows.slice(30, 80), rows[0].ms, rows);
    assert.equal(channels.length, 4);
    for (const channel of channels) assert.deepEqual(channel.changeMarkers, [2.1, 7.6]);
    t.mock.restoreAll();
  }
});

test("full-file Y range stays fixed when the five-second viewport changes", () => {
  const rows = makeRows();
  setCuttingMarkers(rows, result);
  const first = toSensorChannels(rows.slice(0, 10), rows[0].ms, rows);
  const later = toSensorChannels(rows.slice(70), rows[0].ms, rows);
  assert.deepEqual(first.map(c => c.yRange), later.map(c => c.yRange));
  assert.deepEqual(first.map(c => c.changeMarkers), later.map(c => c.changeMarkers));
  assert.ok(first[0].yRange.max > 99);
});

test("legacy Set URLs still use the existing GET endpoint", async t => {
  const rows = makeRows();
  let called;
  t.mock.method(globalThis, "fetch", async url => { called = String(url); return Response.json(result); });
  await loadManualCuttingMarkers(rows, "/api/sensors/set4/example.csv", api, new AbortController().signal);
  assert.equal(called, api + "/api/sensors/set4/example.csv/cutting-segment");
  assert.deepEqual(getCuttingMarkers(rows), [2.1, 7.6]);
});

test("external URLs are not fetched or forwarded", async t => {
  const fetch = t.mock.method(globalThis, "fetch", async () => { throw Error("unexpected fetch"); });
  await loadManualCuttingMarkers(makeRows(), "https://other.test/data.csv", api, new AbortController().signal);
  assert.equal(fetch.mock.calls.length, 0);
});

test("failed or malformed results never create cutting markers", async t => {
  for (const response of [Response.json({ detail: "invalid" }, { status: 422 }),
    Response.json({ status: "ok", start_seconds: 5, end_seconds: 2 })]) {
    const rows = makeRows();
    let count = 0;
    t.mock.method(globalThis, "fetch", async () => ++count === 1 ? new Response("CSV") : response);
    await assert.rejects(loadManualCuttingMarkers(rows, "blob:https://example.test/test", api, new AbortController().signal));
    assert.deepEqual(getCuttingMarkers(rows), []);
    t.mock.restoreAll();
  }
});

test("late results after leaving/reset do not attach stale markers", async t => {
  const rows = makeRows();
  const controller = new AbortController();
  let count = 0;
  t.mock.method(globalThis, "fetch", async () => {
    if (++count === 1) return new Response("CSV");
    controller.abort();
    return Response.json(result);
  });
  await loadManualCuttingMarkers(rows, "blob:https://example.test/test", api, controller.signal);
  assert.deepEqual(getCuttingMarkers(rows), []);
});
