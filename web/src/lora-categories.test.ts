import { test } from "node:test";
import assert from "node:assert/strict";

const { inCategory, categoryCounts, moveToCategory, LORA_CATEGORIES } = await import("./lora-categories.ts");

const loras: { name: string; categoryKey?: string }[] = [
  { name: "ink", categoryKey: "style" },
  { name: "mika", categoryKey: "character" },
  { name: "glasses" },
  { name: "old", categoryKey: "Favourites" },
];

test("the list is the seven fixed categories, ETC last", () => {
  assert.deepEqual(LORA_CATEGORIES.map((c) => c.label), ["Character", "Style", "Concept", "Tools", "Poses", "Background", "ETC"]);
});

test("the filter shows all, the unsorted, or one category", () => {
  assert.deepEqual(loras.filter((l) => inCategory(l, "all")).map((l) => l.name), ["ink", "mika", "glasses", "old"]);
  assert.deepEqual(loras.filter((l) => inCategory(l, "character")).map((l) => l.name), ["mika"]);
});

test("a key off the list reads as unsorted rather than vanishing", () => {
  assert.deepEqual(loras.filter((l) => inCategory(l, "none")).map((l) => l.name), ["glasses", "old"]);
  const counts = categoryCounts(loras);
  assert.equal(counts.none, 2);
  assert.equal(counts.style, 1);
  assert.equal(counts.poses, 0);
  assert.equal(counts.all, 4);
});

test("filing a LoRA moves it and leaves the rest as they were", () => {
  const moved = moveToCategory(loras, ["ink", "glasses"], "poses");
  assert.deepEqual(moved.map((l) => l.categoryKey), ["poses", "character", "poses", "Favourites"]);
  assert.equal(moved[1], loras[1]);
  const out = moveToCategory(loras, ["mika"], "");
  assert.equal(out[1].categoryKey, undefined);
});
