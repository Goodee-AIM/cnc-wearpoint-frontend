import assert from "node:assert/strict";
import { test } from "node:test";
import {
  alertPreviewSnapshot, applyAlertPreview, historicalReplayPhase,
  historyReplayShowsResult, hideHistoricalResult,
} from "../src/utils/alertPreview.js";
import { toMeasurement } from "../src/aim-ui/adapters.js";

// useAlerts historyRecord 형태: 모니터링 추론(source=prediction)으로 생긴 Set5(화면 Set 2) 위험 알림
const inferenceAlert = {
  set: 5,
  image: { name: "Test_0015_1_03_016_2023-02-21T12_49_46.012510.png" },
  status: { level: "danger" },
  wear: 231.4,
  source: "예측 마모량",
  prediction: { predictionId: null, predicted: 231.4, sensorName: "s.csv" },
  label: { type: "flank_wear" },
};

// 알림 이동 후 DB 측정 기록으로 다시 만든 화면 값: predictions 행이 없고 상태·유형은 정답 라벨
function dbMeasurement(name = inferenceAlert.image.name) {
  return toMeasurement(
    { set: 5, wear: 240, prediction: null, label: { type: "adhesion" }, status: { level: "danger" } },
    { name, url: "/img" },
    "2023-02-21 12:48:51",
  );
}

test("regression: DB rebuild alone loses the alert's predicted wear", () => {
  const rebuilt = dbMeasurement();
  assert.equal(rebuilt.predictedWear, null);   // "예측 결과 없음"
  assert.equal(rebuilt.basis, "label");
});

test("alert preview shows the inference result stored with the alert", () => {
  const shown = applyAlertPreview(dbMeasurement(), alertPreviewSnapshot(inferenceAlert), 5);
  assert.equal(shown.predictedWear, 231.4);
  assert.equal(shown.status, "danger");
  assert.equal(shown.wearType, "flank_wear");   // predicted type, not the label's adhesion
  assert.equal(shown.basis, "prediction");
  assert.equal(shown.judgedWear, null);
  assert.equal(shown.image.url, "/img");        // image/sensor data still come from the record
});

test("image extension differences (jpg vs png) still match the alert image", () => {
  const shown = applyAlertPreview(
    dbMeasurement("Test_0015_1_03_016_2023-02-21T12_49_46.012510.jpg"),
    alertPreviewSnapshot(inferenceAlert), 5);
  assert.equal(shown.predictedWear, 231.4);
});

test("snapshot is ignored for another set or another image", () => {
  const snapshot = alertPreviewSnapshot(inferenceAlert);
  assert.equal(applyAlertPreview(dbMeasurement(), snapshot, 6).predictedWear, null);
  assert.equal(applyAlertPreview(dbMeasurement("other.png"), snapshot, 5).predictedWear, null);
  assert.equal(applyAlertPreview(dbMeasurement(), null, 5).predictedWear, null);
});

test("non-inference alerts are left to the existing behaviour (no override)", () => {
  const labelAlert = { ...inferenceAlert, source: "라벨 마모량", wear: 210,
    prediction: { predicted: null }, label: { type: "adhesion" } };
  assert.equal(alertPreviewSnapshot(labelAlert), null);
  const base = dbMeasurement();
  assert.deepEqual(applyAlertPreview(base, alertPreviewSnapshot(labelAlert), 5), base);
});

test("prediction alert without predicted_wear_um falls back to its judged wear", () => {
  const alert = { ...inferenceAlert, prediction: { predicted: null } };
  assert.equal(alertPreviewSnapshot(alert).predicted, 231.4);
});

test("records without set or image produce no snapshot", () => {
  assert.equal(alertPreviewSnapshot({ ...inferenceAlert, image: null }), null);
  assert.equal(alertPreviewSnapshot(null), null);
});


test("historical alert conceals saved prediction and old ground truth until the graph ends", () => {
  const snapshot = alertPreviewSnapshot(inferenceAlert);
  const oldDb = dbMeasurement();
  const saved = applyAlertPreview(oldDb, snapshot, 5);
  const pending = hideHistoricalResult(saved);
  assert.equal(pending.predictedWear, null);
  assert.equal(pending.judgedWear, null);
  assert.equal(pending.wearType, null);
  assert.equal(pending.status, "pending");
  assert.equal(pending.basis, "prediction");

  const base = {hasSnapshot: true, imageMatched: true,
    sensorReady: true, durationMs: 10000, sensorPlaying: true, elapsedMs: 9999,
    holdFinished: false};
  assert.equal(historicalReplayPhase({...base, imageMatched: false}), "loading");
  assert.equal(historicalReplayPhase({...base, sensorReady: false}), "loading");
  assert.equal(historicalReplayPhase(base), "playing");
  assert.equal(historyReplayShowsResult(historicalReplayPhase(base)), false);

  // At completion the stored AI result appears for the three-second hold.
  const showing = historicalReplayPhase({...base, sensorPlaying: false, elapsedMs: 10000});
  assert.equal(showing, "showing");
  assert.equal(historyReplayShowsResult(showing), true);
  assert.equal(saved.predictedWear, 231.4);
  assert.equal(saved.status, "danger");
  assert.equal(saved.wearType, "flank_wear");
  // After the three seconds, history retains the result for inspection.
  assert.equal(historicalReplayPhase({...base, sensorPlaying: false,
    elapsedMs: 10000, holdFinished: true}), "finished");
});

test("history replay cannot show a stale image, and unavailable sensor is explicit", () => {
  const base = {hasSnapshot: true, imageMatched: false, sensorReady: true,
    sensorPlaying: false, elapsedMs: 10000, durationMs: 10000, holdFinished: false};
  assert.equal(historicalReplayPhase(base), "loading");
  assert.equal(historyReplayShowsResult(historicalReplayPhase(base)), false);
  assert.equal(historicalReplayPhase({...base, hasSnapshot: false}), null);
  assert.equal(historicalReplayPhase({...base, imageMatched: true, unavailable: true}), "unavailable");
  assert.equal(historyReplayShowsResult("unavailable"), true);
  assert.equal(historicalReplayPhase({...base, imageMatched: true,
    sensorReady: false, unavailable: false}), "loading");
});
