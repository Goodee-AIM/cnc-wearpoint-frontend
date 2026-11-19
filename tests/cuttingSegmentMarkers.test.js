import assert from "node:assert/strict";
import test from "node:test";
import { getCuttingMarkers, loadCuttingMarkers } from "../src/utils/cuttingSegmentMarkers.js";
import { toSensorChannels } from "../src/aim-ui/adapters.js";

test("Python 경계가 행 배열별로 저장되고 다른 파일에 섞이지 않습니다", async () => {
  const previous = globalThis.fetch;
  const first = [{ ms: 1000, values: [1,2,3,4,5] }, { ms: 2000, values: [2,3,4,5,6] }];
  const second = [{ ms: 2000 }];
  globalThis.fetch = async (url) => {
    assert.equal(url.pathname, "/api/sensors/set10/a.csv/cutting-segment");
    return { ok: true, json: async () => ({ status: "ok", start_seconds: 1.234567, end_seconds: 7.89 }) };
  };
  try {
    const rows = await loadCuttingMarkers(first, "/api/sensors/set10/a.csv", "http://localhost:8001", new AbortController().signal);
    assert.strictEqual(rows, first);
    assert.deepEqual(getCuttingMarkers(first), [1.234567, 7.89]);
    assert.deepEqual(getCuttingMarkers(second), []);
    const channels = toSensorChannels(first, 1000, first);
    assert.equal(channels.length, 4);
    for (const channel of channels) {
      assert.deepEqual(channel.changeMarkers, [1.234567, 7.89]);
      assert.equal(channel.samples[0].time, 0);
      assert.ok(channel.yRange.max > channel.yRange.min);
    }
  } finally { globalThis.fetch = previous; }
});

test("구간 없음과 잘못된 경계에는 선을 만들지 않습니다", async () => {
  const previous = globalThis.fetch;
  try {
    for (const result of [{ status: "unavailable" }, { status: "ok", start_seconds: 5, end_seconds: 2 }]) {
      globalThis.fetch = async () => ({ ok: true, json: async () => result });
      const rows = [];
      await loadCuttingMarkers(rows, "/api/sensors/set4/a.csv", "http://localhost:8001", new AbortController().signal);
      assert.deepEqual(getCuttingMarkers(rows), []);
    }
  } finally { globalThis.fetch = previous; }
});

test("API 실패 시에도 원본 파형 데이터는 유지합니다", async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("연결 실패"); };
  const rows = [{ ms: 1000, values: [1,2,3,4,5] }];
  try {
    assert.strictEqual(await loadCuttingMarkers(rows, "/api/sensors/set4/a.csv", "http://localhost:8001", new AbortController().signal), rows);
    assert.deepEqual(getCuttingMarkers(rows), []);
  } finally { globalThis.fetch = previous; }
});
