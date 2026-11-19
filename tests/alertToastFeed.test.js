import test from "node:test";
import assert from "node:assert/strict";
import { createLiveAlertDetector, mergeAlertToasts } from "../src/utils/alertToastFeed.js";

const now = new Date("2026-11-18T14:00:00Z");
function record(set = 11, wear = 100, options = {}) {
  return {
    set, wear, image: { name: `${set}-measurement-1.png` },
    status: { level: wear == null ? "waiting" : wear >= 200 ? "danger" : wear >= 150 ? "warning" : "normal" },
    sessionId: "session-a", cycleNumber: 1,
    source: set >= 10 ? "예측 마모량" : "라벨 마모량",
    label: { type: "adhesion" }, prediction: { type: "flank_wear" }, ...options,
  };
}
function scan(detector, records, playback = null, enabled = true) {
  return detector.scan({ records, playback, enabled }, now);
}

test("Set 8 warning at 151.31 triggers without any new DB alert record", () => {
  const detector = createLiveAlertDetector();
  assert.deepEqual(scan(detector, [record(11, 100)]), []);
  const incoming = scan(detector, [record(11, 151.31)]);
  assert.equal(incoming.length, 1);
  assert.equal(incoming[0].row.set_number, 11);
  assert.equal(incoming[0].row.level, "warning");
  assert.equal(incoming[0].row.judged_wear_um, 151.31);
  assert.equal(incoming[0].row.created_at, now.toISOString());
  assert.deepEqual(scan(detector, [record(11, 151.31)]), []);
});

test("first ready snapshots notify current warnings and dangers once without replaying history", () => {
  const detector = createLiveAlertDetector();
  const current = scan(detector, [record(4, 150), record(11, 210)]);
  assert.deepEqual(current.map(item => item.row.set_number), [4, 11]);
  assert.deepEqual(scan(detector, [record(4, 150), record(11, 210)]), []);
});

test("pending image/metadata stays silent until a real current warning becomes available", () => {
  const detector = createLiveAlertDetector();
  assert.deepEqual(scan(detector, [record(11, null)]), []);
  assert.equal(scan(detector, [record(11, 151.31)]).length, 1);
  assert.deepEqual(scan(detector, [record(11, 151.31)]), []);
  assert.equal(scan(detector, [record(11, 200)])[0].row.level, "danger");
});

test("all eight Sets are observed independently of selected page, Set or history filters", () => {
  const detector = createLiveAlertDetector();
  scan(detector, Array.from({ length: 8 }, (_, index) => record(index + 4, 100)));
  const groups = scan(detector, Array.from({ length: 8 }, (_, index) => record(index + 4, 160)));
  assert.deepEqual(groups.map(item => item.row.set_number), [4, 5, 6, 7, 8, 9, 10, 11]);
});

test("warning escalation triggers even when the same measurement was already notified", () => {
  const detector = createLiveAlertDetector();
  scan(detector, [record(11, 100)]);
  assert.equal(scan(detector, [record(11, 150)])[0].row.level, "warning");
  assert.equal(scan(detector, [record(11, 200)])[0].row.level, "danger");
  assert.deepEqual(scan(detector, [record(11, 220)]), []);
});

test("new critical measurements notify; repeated renders and value fluctuations do not", () => {
  const detector = createLiveAlertDetector();
  scan(detector, [record(11, 160)]);
  assert.equal(scan(detector, [record(11, 170, { image: { name: "next.png" } })]).length, 1);
  assert.deepEqual(scan(detector, [record(11, 180, { image: { name: "next.png" } })]), []);
  scan(detector, [record(11, 149, { image: { name: "next.png" } })]);
  assert.deepEqual(scan(detector, [record(11, 151, { image: { name: "next.png" } })]), []);
});

test("same image name in different Sets does not collide", () => {
  const detector = createLiveAlertDetector();
  const initial = [record(4, 100, { image: { name: "same.png" } }), record(11, 100, { image: { name: "same.png" } })];
  scan(detector, initial);
  assert.equal(scan(detector, initial.map(item => ({ ...item, wear: 160, status: { level: "warning" } }))).length, 2);
});

test("a new cycle or session can notify the same measurement again", () => {
  const detector = createLiveAlertDetector();
  scan(detector, [record(11, 150)]);
  assert.equal(scan(detector, [record(11, 150, { cycleNumber: 2 })]).length, 1);
  assert.equal(scan(detector, [record(11, 150, { sessionId: "session-b", cycleNumber: 1 })]).length, 1);
});

test("analysis restart notifies even when backend reuses session, cycle and old DB rows", () => {
  const detector = createLiveAlertDetector();
  scan(detector, [record(11, 150)], { session_id: "session-a", revision: 1, elapsed_ms: 10000 });
  const incoming = scan(detector, [record(11, 150)], { session_id: "session-a", revision: 2, elapsed_ms: 0 });
  assert.equal(incoming.length, 1);
  assert.equal(incoming[0].row.created_at, now.toISOString());
  assert.deepEqual(scan(detector, [record(11, 150)], { session_id: "session-a", revision: 2, elapsed_ms: 1000 }), []);
});

test("pause/resume does not notify the same occurrence again", () => {
  const detector = createLiveAlertDetector();
  scan(detector, [record(11, 150)], { session_id: "session-a", revision: 1, elapsed_ms: 10000 });
  assert.deepEqual(scan(detector, [record(11, 150)], { session_id: "session-a", revision: 2, elapsed_ms: 10000 }), []);
  assert.deepEqual(scan(detector, [record(11, 150)], { session_id: "session-a", revision: 3, elapsed_ms: 10001 }), []);
});

test("disconnect and historical preview do not create false alerts or reset deduplication", () => {
  const detector = createLiveAlertDetector();
  scan(detector, [record(11, 100)]);
  assert.deepEqual(scan(detector, [record(11, 160)], null, false), []);
  assert.equal(scan(detector, [record(11, 160)]).length, 1);
  assert.deepEqual(scan(detector, [record(11, 160)], null, false), []);
  assert.deepEqual(scan(detector, [record(11, 160)]), []);
});

test("missing or malformed measurements never fabricate a notification", () => {
  const detector = createLiveAlertDetector();
  scan(detector, [record(11, 100)]);
  for (const item of [record(11, null), record(11, ""), record(11, NaN), record(11, -1), record(11, 200, { image: null }), record(20, 200)]) {
    assert.deepEqual(scan(detector, [item]), []);
  }
});

test("prediction-only Sets use the predicted type and never substitute ground truth", () => {
  const detector = createLiveAlertDetector();
  scan(detector, [record(10, 100), record(11, 100), record(4, 100)]);
  const rows = scan(detector, [record(10, 150), record(11, 160, { prediction: null }), record(4, 160)]).map(x => x.row);
  assert.equal(rows.find(x => x.set_number === 10).original_type, "flank_wear");
  assert.equal(rows.find(x => x.set_number === 11).original_type, null);
  assert.equal(rows.find(x => x.set_number === 4).original_type, "adhesion");
});

test("queue merging updates the current level and groups counts without growing beyond eight Sets", () => {
  const detector = createLiveAlertDetector();
  const initial = Array.from({ length: 8 }, (_, index) => record(index + 4, 100));
  scan(detector, initial);
  const warnings = scan(detector, initial.map(x => record(x.set, 160)));
  const dangers = scan(detector, initial.map(x => record(x.set, 210)));
  const queue = mergeAlertToasts(warnings, dangers);
  assert.equal(queue.length, 8);
  assert.ok(queue.every(x => x.count === 2 && x.row.level === "danger"));
});

test("suppressing a toast does not mutate the original current measurement", () => {
  const detector = createLiveAlertDetector();
  const item = record(11, 100);
  scan(detector, [item]);
  const next = record(11, 160);
  const snapshot = JSON.stringify(next);
  scan(detector, [next]);
  assert.equal(JSON.stringify(next), snapshot);
});
