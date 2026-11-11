import assert from "node:assert/strict";
import { test } from "node:test";
import {
  loadDashboardData,
  projectMonitoringSets,
  readMonitoringJson,
  validateMonitoringState,
} from "../src/utils/sharedMonitoring.js";

function snapshot(status = "running") {
  return {
    status,
    session_id: "same-server-session",
    elapsed_ms: 80000,
    sets: [{
      set_number: 4,
      status,
      measurement_id: 123,
      elapsed_ms: 20000,
      duration_ms: 60000,
      image_url: "/api/images/set4/current.png",
    }],
  };
}

test("late join uses server offset and caps interpolation at measurement boundary", () => {
  const state = snapshot();
  assert.equal(projectMonitoringSets(state, 100, 400)[4].elapsed_ms, 20300);
  const after = projectMonitoringSets(state, 100, 90000)[4];
  assert.equal(after.elapsed_ms, 60000);
  assert.equal(after.measurement_id, 123);
  assert.equal(state.sets[0].elapsed_ms, 20000);
});

test("paused and completed clocks stay fixed", () => {
  for (const status of ["paused", "completed"]) {
    assert.equal(projectMonitoringSets(snapshot(status), 100, 90000)[4].elapsed_ms, 20000);
  }
});

test("empty state does not invent a measurement", () => {
  const empty = { set_number: 4, status: "empty", total: 0 };
  assert.deepEqual(projectMonitoringSets({ status: "idle", sets: [empty] }, 0, 100)[4], empty);
  assert.deepEqual(projectMonitoringSets(null, 0, 100), {});
});

test("malformed shared state is rejected instead of restarting a local clock", () => {
  assert.throws(() => validateMonitoringState({ status: "running" }));
  const state = snapshot();
  state.sets[0].duration_ms = 0;
  assert.throws(() => validateMonitoringState(state));
  assert.equal(validateMonitoringState(snapshot()).session_id, "same-server-session");
});

test("initial load follows measurement pagination and preserves request cancellation", async (context) => {
  const controller = new AbortController();
  const requests = [];
  context.mock.method(globalThis, "fetch", async (url, options) => {
    requests.push(url);
    assert.equal(options.signal, controller.signal);
    assert.equal(options.cache, "no-store");
    let data;
    if (url.pathname.startsWith("/api/images")) {
      data = { items: [{ name: "one.png", url: "/api/images/set4/one.png" }] };
    } else {
      const offset = Number(url.searchParams.get("offset"));
      const count = offset === 0 ? 500 : 1;
      data = {
        total: 501,
        items: Array.from({ length: count }, (_, index) => ({ measurement_id: offset + index })),
      };
    }
    return { ok: true, json: async () => data };
  });
  const [set] = await loadDashboardData("http://localhost:8001", [4], controller.signal);
  assert.equal(set.measurements.length, 501);
  assert.equal(set.images[0].url, "http://localhost:8001/api/images/set4/one.png");
  assert.equal(requests.at(-1).searchParams.get("offset"), "500");
});

test("incomplete pages report failure instead of looping", async (context) => {
  context.mock.method(globalThis, "fetch", async () => ({
    ok: true,
    json: async () => ({ items: [], total: 1 }),
  }));
  await assert.rejects(loadDashboardData("http://localhost:8001", [4]), /일부만/);
});

test("missing API configuration and HTTP failure are explicit", async (context) => {
  await assert.rejects(readMonitoringJson("", "/api/monitoring/state"), /VITE_API_BASE_URL/);
  context.mock.method(globalThis, "fetch", async () => ({ ok: false, status: 503 }));
  await assert.rejects(readMonitoringJson("http://localhost:8001", "/api/monitoring/state"), /503/);
});
