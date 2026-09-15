import { test } from "node:test";
import assert from "node:assert/strict";
import { isExplicit, safeKeyAction } from "./safe-mode.ts";

const tag = (name: string, category = "general") => ({ id: 1, name, category });

test("the tagger's rating decides what is veiled, and sensitive stays visible", () => {
  assert.equal(isExplicit([tag("explicit", "rating")]), true);
  assert.equal(isExplicit([tag("questionable", "rating"), tag("beach")]), true);
  assert.equal(isExplicit([tag("sensitive", "rating")]), false);
  assert.equal(isExplicit([tag("general", "rating")]), false);
});

test("a rating written as a plain tag still counts, but a word does not", () => {
  assert.equal(isExplicit([tag("rating:explicit")]), true);
  assert.equal(isExplicit([tag("explicit")]), false);
  assert.equal(isExplicit([tag("questionable")]), false);
});

test("untagged items are shown", () => {
  assert.equal(isExplicit(undefined), false);
  assert.equal(isExplicit([]), false);
});

test("backtick veils, tilde locks, and a chord is neither", () => {
  assert.equal(safeKeyAction({ key: "`" }), "toggle");
  assert.equal(safeKeyAction({ key: "~" }), "lock");
  assert.equal(safeKeyAction({ key: "`", ctrlKey: true }), null);
  assert.equal(safeKeyAction({ key: "s" }), null);
});
