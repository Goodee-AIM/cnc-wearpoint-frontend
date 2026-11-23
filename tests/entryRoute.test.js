import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { shouldRenderDashboard } from "../src/utils/entryRoute.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(join(root, file), "utf8");

test("the root displays the landing page and section anchors do not open the dashboard", () => {
  assert.equal(shouldRenderDashboard("/"), false);
  for (const anchor of ["#topic", "#team", "#purpose", "#features", "#github"]) {
    assert.equal(shouldRenderDashboard("/", anchor), false, anchor);
  }
});

test("the dashboard and legacy alert or monitoring URLs remain accessible", () => {
  assert.equal(shouldRenderDashboard("/dashboard"), true);
  assert.equal(shouldRenderDashboard("/dashboard/", "#alerts"), true);
  assert.equal(shouldRenderDashboard("/", "#monitoring"), true);
  assert.equal(shouldRenderDashboard("/", "#alerts"), true);
  assert.equal(shouldRenderDashboard("/other/existing-path"), true);
});

test("the entry point chooses before mounting the existing dashboard", () => {
  const main = read("src/main.jsx");
  const landing = read("src/aim-ui/pages/LandingPage.jsx");
  assert.match(main, /showDashboard\s*\?\s*<App\s*\/>\s*:\s*<LandingPage\s*\/>/);
  assert.match(landing, /href="\/dashboard"/);
  assert.doesNotMatch(landing, /useDashboard|\/api\/|\/re-infer/);
});

test("landing sections follow topic, team, purpose, features, GitHub order", () => {
  const landing = read("src/aim-ui/pages/LandingPage.jsx");
  const anchors = ["topic", "team", "purpose", "features", "github"];
  let index = -1;
  for (const anchor of anchors) {
    const next = landing.indexOf(`id="${anchor}"`);
    assert.ok(next > index, `missing or out-of-order section: ${anchor}`);
    index = next;
  }
  assert.doesNotMatch(landing, /<nav\b|<FeatureIcon\b|<ToolIllustration\b|<SensorSignal\b/);
  assert.doesNotMatch(landing, /[\u{1F300}-\u{1FAFF}]/u);
});

test("team member names and all three project GitHub links are present", () => {
  const landing = read("src/aim-ui/pages/LandingPage.jsx");
  for (const name of ["구민석", "강지인", "김정훈", "신상석", "오성일"]) {
    assert.ok(landing.includes(name), name);
  }
  assert.match(landing, /https:\/\/github\.com\/Goodee-AIM\/cnc-wearpoint-frontend/);
  assert.match(landing, /https:\/\/github\.com\/Goodee-AIM\/cnc-wearpoint-backend/);
  assert.match(landing, /https:\/\/github\.com\/Goodee-AIM\/cnc-wearpoint-AI/);
  assert.match(landing, /name: "cnc-wearpoint-AI"/);
});

test("AIM is the landing brand and generated-looking hero decoration was removed", () => {
  const landing = read("src/aim-ui/pages/LandingPage.jsx");
  const styles = read("src/aim-ui/styles/landing.css");
  assert.match(landing, /<strong>AIM<\/strong>/);
  assert.match(landing, /teamTitle: "AIM 팀원"/);
  assert.doesNotMatch(landing, /wp-landing-hero-aside|01 — 05|CNC WEARPOINT \/ PROJECT/);
  assert.doesNotMatch(styles, /wp-landing-hero-aside/);
});

test("dashboard AIM logo leads to the project introduction", () => {
  const shared = read("src/aim-ui/components/shared.jsx");
  const routes = read("src/utils/entryRoute.js");
  assert.match(shared, /className="brand"\s+href="\/"/);
  assert.match(shared, /AIM 프로젝트 소개로 이동/);
  assert.doesNotMatch(shared, /href="#monitoring"/);
  // Only the AIM logo anchor should be checked. Other controls legitimately call preventDefault().
  const brandLink = shared.match(/<a\s+className="brand"[\s\S]*?<\/a>/)?.[0];
  assert.ok(brandLink, "AIM logo link is missing");
  assert.doesNotMatch(brandLink, /event\.preventDefault\(\)/);
  assert.doesNotMatch(brandLink, /onClick\s*=/);
  assert.match(routes, /normalizedPath !== "\/"/);
  assert.equal(shouldRenderDashboard("/"), false);
});

test("desktop landing uses one viewport and preserves all five sections", () => {
  const styles = read("src/aim-ui/styles/landing.css");
  assert.match(styles, /grid-template-areas:\s*"topic topic"\s*"team team"\s*"purpose features"\s*"github github"/);
  assert.match(styles, /height:\s*100dvh;\s*overflow:\s*hidden/);
  assert.match(styles, /min-width:\s*981px/);
  assert.match(styles, /min-height:\s*700px/);
  // When space is genuinely insufficient, content remains readable rather than being clipped.
  assert.match(styles, /max-width:\s*980px/);
  assert.match(styles, /overflow:\s*visible/);
});
