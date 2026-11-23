import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");

function* sourceFiles(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) yield* sourceFiles(path);
    else if (/\.(?:js|jsx|ts|tsx)$/.test(entry.name)) yield path;
  }
}

test("history source never requests AI re-inference", () => {
  for (const path of sourceFiles(join(root, "src"))) {
    const content = readFileSync(path, "utf8");
    assert.doesNotMatch(content, /\/re-infer\b|VITE_HISTORICAL_REINFER_ENABLED|historicalReinfer/, path);
  }
});

test("historical alert reads saved prediction; live monitoring inference remains", () => {
  const app = read("src/App.jsx");
  const hook = read("src/hooks/useDashboard.js");
  assert.match(app, /const historicalMeasurement = applyAlertPreview\(/);
  assert.match(app, /matchingReplayPrediction\(visible, matchingRun\)/);
  assert.match(hook, /useSharedMonitoring\(unifiedMode, selectedSet\)/);
  assert.match(hook, /gatedPlayback: Boolean\(unifiedMode && shared\.state\?\.gated_playback\)/);
  assert.doesNotMatch(hook, /\/re-infer\b/);
});
