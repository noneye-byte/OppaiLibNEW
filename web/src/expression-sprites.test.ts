import { test } from "node:test";
import assert from "node:assert/strict";

import { expressionSlots, expressionSprites, expressionTitle, packCoverage } from "./expression-sprites.ts";

const pack = { joy: ["joy-1.png", "joy.png"], neutral: ["neutral.png"], smirk: ["smirk.webp"] };

test("an expression's own picture comes first and neutral's is the fallback", () => {
  assert.deepEqual(expressionSprites(pack, "smirk"), ["smirk.webp", "neutral.png"]);
});

test("an expression the pack has no picture for shows neutral, and nothing without one", () => {
  assert.deepEqual(expressionSprites(pack, "anger"), ["neutral.png"]);
  assert.deepEqual(expressionSprites({ joy: ["joy.png"] }, "anger"), []);
  assert.deepEqual(expressionSprites(undefined, "joy"), []);
});

test("a label with several pictures shows one per reply and keeps the rest behind it", () => {
  assert.deepEqual(expressionSprites(pack, "joy", 0), ["joy-1.png", "joy.png", "neutral.png"]);
  assert.deepEqual(expressionSprites(pack, "joy", 1), ["joy.png", "joy-1.png", "neutral.png"]);
  assert.deepEqual(expressionSprites(pack, "joy", 2), ["joy-1.png", "joy.png", "neutral.png"]);
});

test("neutral is not listed twice when it is what was asked for", () => {
  assert.deepEqual(expressionSprites(pack, "neutral"), ["neutral.png"]);
});

test("a label reads as a word", () => {
  assert.equal(expressionTitle("realization"), "Realization");
  assert.equal(expressionTitle("deep_thought"), "Deep thought");
});

test("the editor lays out the defaults, then a pack's own labels", () => {
  assert.deepEqual(expressionSlots(["joy", "neutral"], pack), ["joy", "neutral", "smirk"]);
  assert.deepEqual(packCoverage(["joy", "neutral", "anger"], pack), { files: 4, covered: 2 });
});
