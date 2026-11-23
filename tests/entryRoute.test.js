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

test("landing sections follow topic, purpose, features, GitHub, team order", () => {
  const landing = read("src/aim-ui/pages/LandingPage.jsx");
  const anchors = ["topic", "purpose", "features", "github", "team"];
  let index = -1;
  for (const anchor of anchors) {
    const next = landing.indexOf(`id="${anchor}"`);
    assert.ok(next > index, `missing or out-of-order section: ${anchor}`);
    index = next;
  }
  assert.doesNotMatch(landing, /<nav\b|<FeatureIcon\b|<ToolIllustration\b|<SensorSignal\b/);
  assert.doesNotMatch(landing, /[\u{1F300}-\u{1FAFF}]/u);
});

test("team member names and the single team GitHub link are present", () => {
  const landing = read("src/aim-ui/pages/LandingPage.jsx");
  for (const name of ["구민석", "강지인", "김정훈", "신상석", "오성일"]) {
    assert.ok(landing.includes(name), name);
  }
  assert.match(landing, /href="https:\/\/github\.com\/Goodee-AIM\/"/);
  assert.equal((landing.match(/href="https:\/\/github\.com\//g) ?? []).length, 1);
  assert.doesNotMatch(landing, /href="https:\/\/github\.com\/Goodee-AIM\/cnc-/);
  assert.match(landing, /orgLabel: "AIM 팀 GitHub"/);
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
  assert.match(styles, /grid-template-areas:\s*"topic topic"\s*"purpose features"\s*"github github"\s*"team team"/);
  assert.match(styles, /height:\s*100dvh;\s*overflow:\s*hidden/);
  assert.match(styles, /min-width:\s*981px/);
  assert.match(styles, /min-height:\s*700px/);
  // When space is genuinely insufficient, content remains readable rather than being clipped.
  assert.match(styles, /max-width:\s*980px/);
  assert.match(styles, /overflow:\s*visible/);
});

test("landing uses readable scoped text and does not change dashboard CSS", () => {
  const styles = read("src/aim-ui/styles/landing.css");
  const landing = read("src/aim-ui/pages/LandingPage.jsx");
  assert.match(styles, /Readable AIM landing-only typography/);
  assert.match(styles, /\.wp-landing \.wp-landing-feature p \{ font-size: 14\.5px/);
  assert.match(styles, /\.wp-landing \.wp-landing-section h2 \{ font-size: 20px/);
  assert.match(landing, /href="https:\/\/github\.com\/Goodee-AIM\/"/);
});

test("landing has a single-color complete title and one sentence per line", () => {
  const landing = read("src/aim-ui/pages/LandingPage.jsx");
  const styles = read("src/aim-ui/styles/landing.css");
  assert.match(landing, /topicTitle: "CNC 공구 마모 예측 및 모니터링"/);
  assert.match(landing, /<h1 id="wp-landing-title">\{t\.topicTitle\}<\/h1>/);
  assert.doesNotMatch(landing, /topicLineOne|topicLineTwo/);
  assert.match(landing, /topicLeadLines\.map/);
  assert.match(styles, /\.wp-landing \.wp-landing-hero h1 \{[\s\S]*?color: #1e2b43/);
  assert.doesNotMatch(landing, /wp-landing-feature-number/);
  assert.match(landing, /href="https:\/\/github\.com\/Goodee-AIM\/"/);
});

test("team listing is last, uses readable fonts, and dashboard files are outside the patch", () => {
  const landing = read("src/aim-ui/pages/LandingPage.jsx");
  const styles = read("src/aim-ui/styles/landing.css");
  assert.ok(landing.lastIndexOf('id="team"') > landing.lastIndexOf('id="github"'));
  assert.match(styles, /\.wp-landing \.wp-landing-section h2 \{ font-size: 22px; \}/);
  assert.match(styles, /\.wp-landing \.wp-landing-feature p \{ font-size: 16px;/);
  assert.match(styles, /\.wp-landing \.wp-landing-purpose-list p \{ font-size: 16px;/);
  assert.match(styles, /\.wp-landing \.wp-landing-member strong \{ font-size: clamp\(18px,/);
});


test("Korean and English landing dictionaries have matching keys and every visible label uses translations", () => {
  const landing = read("src/aim-ui/pages/LandingPage.jsx");
  const koBlock = landing.split("  ko: {")[1]?.split("\n  en: {")[0];
  const enBlock = landing.split("\n  en: {")[1]?.split("\n};")[0];
  assert.ok(koBlock && enBlock, "language dictionaries are missing");
  const keys = (block) => [...block.matchAll(/^    ([A-Za-z][\w]*):/gm)].map((match) => match[1]).sort();
  assert.deepEqual(keys(koBlock), keys(enBlock), "Korean/English text keys differ");
  assert.ok(keys(koBlock).includes("footerTeam"));
  const rendered = landing.split("  return (").at(-1);
  const used = [...rendered.matchAll(/\bt\.([A-Za-z][\w]*)/g)].map((match) => match[1]);
  for (const key of used) {
    assert.ok(keys(koBlock).includes(key), `visible translation missing: ${key}`);
  }
  assert.match(rendered, /translate\("app\.title"\)/);
  assert.match(rendered, /t\.languageAction/);
  assert.match(rendered, /language === "ko" \? "본문으로 이동" : "Skip to content"/);
  assert.match(rendered, /\{t\.footerTeam\}/);
});

test("all five team names switch to English romanizations and original Korean names remain", () => {
  const landing = read("src/aim-ui/pages/LandingPage.jsx");
  const members = [
    ["구민석", "Gu Min-seok"],
    ["강지인", "Kang Ji-in"],
    ["김정훈", "Kim Jeong-hun"],
    ["신상석", "Shin Sang-seok"],
    ["오성일", "Oh Seong-il"],
  ];
  for (const [ko, en] of members) {
    assert.ok(landing.includes(`ko: "${ko}", en: "${en}"`), `bilingual name missing: ${ko}`);
  }
  assert.match(landing, /<strong>\{person\[language\]\}<\/strong>/);
  assert.match(landing, /lang=\{language\}/);
  assert.match(landing, /person\.lead \? t\.leader : t\.member/);
  assert.doesNotMatch(landing, /<strong>\{person\.name\}<\/strong>/);
});
