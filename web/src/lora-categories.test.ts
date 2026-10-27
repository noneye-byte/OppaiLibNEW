import { test } from "node:test";
import assert from "node:assert/strict";

const { inCategory, liveFilter, uncategorised, moveToCategory } = await import("./lora-categories.ts");

const loras: { name: string; category?: number }[] = [
  { name: "ink", category: 1 },
  { name: "mika", category: 2 },
  { name: "glasses" },
];
const categories = [
  { id: 1, name: "Styles", count: 1 },
  { id: 2, name: "Characters", count: 1 },
];

test("the filter shows all, the uncategorised, or one category", () => {
  assert.deepEqual(loras.filter((l) => inCategory(l, "all")).map((l) => l.name), ["ink", "mika", "glasses"]);
  assert.deepEqual(loras.filter((l) => inCategory(l, "none")).map((l) => l.name), ["glasses"]);
  assert.deepEqual(loras.filter((l) => inCategory(l, 2)).map((l) => l.name), ["mika"]);
  assert.equal(uncategorised(loras), 1);
});

test("a deleted category's filter falls back to all", () => {
  assert.equal(liveFilter(3, categories), "all");
  assert.equal(liveFilter(2, categories), 2);
  assert.equal(liveFilter("none", []), "none");
});

test("moving a LoRA moves its count with it", () => {
  const moved = moveToCategory(loras, categories, ["ink", "glasses"], 2);
  assert.deepEqual(moved.loras.map((l) => l.category), [2, 2, 2]);
  assert.deepEqual(moved.categories.map((c) => c.count), [0, 3]);
  const out = moveToCategory(loras, categories, ["mika"], 0);
  assert.equal(out.loras[1].category, undefined);
  assert.deepEqual(out.categories.map((c) => c.count), [1, 0]);
});

test("moving a LoRA into the category it is in changes nothing", () => {
  const same = moveToCategory(loras, categories, ["ink"], 1);
  assert.equal(same.loras[0], loras[0]);
  assert.deepEqual(same.categories.map((c) => c.count), [1, 1]);
});
