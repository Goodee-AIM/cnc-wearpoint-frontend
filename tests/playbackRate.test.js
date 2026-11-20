import test from "node:test";
import assert from "node:assert/strict";
import { PLAYBACK_RATE, monitoringPlaybackRate } from "../src/utils/playbackRate.js";
import { projectMonitoringSets } from "../src/utils/sharedMonitoring.js";

const state = (extra = {}, item = {}) => ({
  status: "running", playback_rate: 2,
  sets: [{ set_number: 4, status: "running", elapsed_ms: 10000, duration_ms: 40000, ...item }],
  ...extra,
});

test("Set test advances 40 seconds of source data in 20 real seconds", () => {
  assert.equal(PLAYBACK_RATE, 2);
  assert.equal(Math.min(40000, 20000 * PLAYBACK_RATE), 40000);
});
test("all eight shared Sets interpolate at the server's 2x rate", () => {
  const s = state();
  s.sets = Array.from({ length: 8 }, (_, i) => ({ ...s.sets[0], set_number: i + 4 }));
  const projected = projectMonitoringSets(s, 1000, 2000);
  for (let i = 4; i <= 11; i++) assert.equal(projected[i].elapsed_ms, 12000);
});
test("gated playing uses the same 2x clock as its server", () => {
  const projected = projectMonitoringSets(state({ gated_playback: true }, { playback_phase: "playing" }), 0, 500);
  assert.equal(projected[4].elapsed_ms, 11000);
});
test("waiting and result showing do not advance the sensor clock", () => {
  for (const phase of ["waiting", "showing", "unavailable"]) {
    const projected = projectMonitoringSets(state({ gated_playback: true }, { playback_phase: phase }), 0, 1000);
    assert.equal(projected[4].elapsed_ms, 10000);
  }
});
test("global pause and item pause keep source position fixed", () => {
  assert.equal(projectMonitoringSets(state({ status: "paused" }), 0, 1000)[4].elapsed_ms, 10000);
  assert.equal(projectMonitoringSets(state({}, { status: "paused" }), 0, 1000)[4].elapsed_ms, 10000);
});
test("interpolation stops at the current file boundary", () => {
  assert.equal(projectMonitoringSets(state({}, { elapsed_ms: 39900 }), 0, 1000)[4].elapsed_ms, 40000);
});
test("older backends without rate metadata retain 1x until upgraded", () => {
  assert.equal(projectMonitoringSets(state({ playback_rate: undefined }), 0, 1000)[4].elapsed_ms, 11000);
});
test("item rate takes priority; invalid rates fall back safely", () => {
  assert.equal(monitoringPlaybackRate({ playback_rate: 2 }, { playback_rate: 1 }), 1);
  for (const rate of [-1, 0, Infinity, "2"]) {
    assert.equal(monitoringPlaybackRate({ playback_rate: rate }, {}), 1);
  }
});
test("empty Sets and missing state are preserved", () => {
  assert.deepEqual(projectMonitoringSets(null, 0, 1000), {});
  const s = state({}, { status: "empty" });
  assert.equal(projectMonitoringSets(s, 0, 1000)[4], s.sets[0]);
});
