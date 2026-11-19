import { test } from "node:test";
import assert from "node:assert/strict";

import { compactCount, saysItHasExpressions, shownTopics } from "./chub-cards.ts";

test("a count reads short past a thousand", () => {
  assert.equal(compactCount(950), "950");
  assert.equal(compactCount(1200), "1.2k");
  assert.equal(compactCount(1000), "1k");
  assert.equal(compactCount(34_400), "34k");
  assert.equal(compactCount(1_520_000), "1.5M");
  assert.equal(compactCount(Number.NaN), "0");
});

test("a card's topics leave out what its badges already say, and repeats", () => {
  assert.deepEqual(shownTopics(["NSFW", "Female", "Expressions Pack", "female", "OC", "Maid", "Fantasy"], 3), ["Female", "OC", "Maid"]);
});

test("an expressions topic says a card has a pack", () => {
  assert.equal(saysItHasExpressions(["Female", "Expressions Pack"]), true);
  assert.equal(saysItHasExpressions(["Female"]), false);
});
