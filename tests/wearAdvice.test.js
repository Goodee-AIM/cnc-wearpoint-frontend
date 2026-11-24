import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { wearAdviceKey, wearTypeKey } from "../src/utils/wearAdvice.js";

test("flank warning requires slowing down and danger requires replacement", () => {
  for (const type of ["flank", "flank_wear", " FLANK_WEAR "]) {
    assert.equal(wearAdviceKey("warning", type), "statusCaption.slowDown");
    assert.equal(wearAdviceKey("danger", type), "statusCaption.danger");
  }
});

test("adhesion and mixed wear require inspection at both alert levels", () => {
  for (const type of ["adhesion", "adhesion+flank", "flank+adhesion", "adhesion + flank_wear", "flank_wear+adhesion"]) {
    assert.equal(wearAdviceKey("warning", type), "statusCaption.inspect");
    assert.equal(wearAdviceKey("danger", type), "statusCaption.inspect");
  }
  assert.equal(wearTypeKey("adhesion + flank"), "adhesion_flank");
});

test("normal and pending do not display an intervention for any type", () => {
  for (const type of ["flank", "adhesion+flank", undefined]) {
    assert.equal(wearAdviceKey("normal", type), "statusCaption.normal");
    assert.equal(wearAdviceKey("pending", type), "statusCaption.pending");
  }
});

test("missing or unsupported type never invents a replacement or speed action", () => {
  for (const type of [null, "", "other", "not_flank_wear"]) {
    assert.equal(wearAdviceKey("warning", type), "statusCaption.warning");
    assert.equal(wearAdviceKey("danger", type), "statusCaption.warning");
  }
});

test("all advice and mixed wear labels exist in Korean and English", () => {
  for (const language of ["ko", "en"]) {
    const dictionary = JSON.parse(readFileSync(new URL(`../src/i18n/locales/${language}.json`, import.meta.url), "utf8"));
    for (const key of ["normal", "warning", "danger", "slowDown", "inspect"]) {
      assert.ok(dictionary.statusCaption[key]);
    }
    assert.equal(dictionary.statusCaption.pending, "");
    assert.equal(dictionary.status.pending, language === "ko" ? "\uBD84\uC11D\uC911" : "Analyzing");
    assert.ok(dictionary.wearType.adhesion_flank);
  }
});
