import { test } from "node:test";
import assert from "node:assert/strict";

const { referencePlan, referenceKindFor } = await import("./sprite-reference.ts");

const both = { dressed: true, bare: true };

test("Calm to Flirty match the dressed reference, Heated and Peak the undressed one", () => {
  assert.deepEqual([0, 1, 2, 3, 4].map(referenceKindFor), ["dressed", "dressed", "dressed", "bare", "bare"]);
  assert.deepEqual(referencePlan(0, both, 0.8, true), { kind: "dressed", weight: 0.8, start: true });
  assert.deepEqual(referencePlan(4, both, 0.8, true), { kind: "bare", weight: 0.8, start: true });
});

test("with its own reference, a level is matched at full strength however undressed", () => {
  assert.equal(referencePlan(4, both, 0.9, false)!.weight, 0.9);
  assert.equal(referencePlan(4, both, 0.9, false)!.start, false);
});

test("an undressed square with only the dressed reference is eased, and never started from it", () => {
  assert.deepEqual(referencePlan(4, { dressed: true, bare: false }, 0.8, true), { kind: "dressed", weight: 0.4, start: false });
  assert.deepEqual(referencePlan(3, { dressed: true, bare: false }, 0.8, true), { kind: "dressed", weight: 0.52, start: false });
});

test("the undressed reference is drawn from the dressed one; neither is matched to itself", () => {
  assert.deepEqual(referencePlan(4, both, 0.8, true, "bare"), { kind: "dressed", weight: 0.4, start: false });
  assert.equal(referencePlan(0, both, 0.8, true, "dressed"), null);
});

test("nothing to match is no plan", () => {
  assert.equal(referencePlan(0, { dressed: false, bare: false }, 0.8, true), null);
  // An undressed reference alone does not reach down to the dressed levels.
  assert.equal(referencePlan(1, { dressed: false, bare: true }, 0.8, true), null);
});
