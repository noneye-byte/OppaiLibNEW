import { test } from "node:test";
import assert from "node:assert/strict";

const { REFERENCE_LEVEL_SCALE, referenceWeight } = await import("./sprite-reference.ts");

test("the reference is eased off as the levels undress her, never strengthened", () => {
  const weights = [0, 1, 2, 3, 4].map((heat) => referenceWeight(0.8, heat));
  assert.deepEqual(weights, [0.8, 0.8, 0.68, 0.52, 0.4]);
  for (let i = 1; i < REFERENCE_LEVEL_SCALE.length; i++) assert.ok(REFERENCE_LEVEL_SCALE[i] <= REFERENCE_LEVEL_SCALE[i - 1]);
});

test("a strength or heat out of range is held to what makes sense", () => {
  assert.equal(referenceWeight(3, 0), 1);
  assert.equal(referenceWeight(-1, 0), 0);
  assert.equal(referenceWeight(Number.NaN, 0), 0);
  assert.equal(referenceWeight(1, 9), 0.5);
});
