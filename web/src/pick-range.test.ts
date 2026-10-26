import { test } from "node:test";
import assert from "node:assert/strict";

const { isPickClick, pickClick } = await import("./pick-range.ts");

const order = ["a", "b", "c", "d", "e"];
const none = { selected: new Set<string>(), anchor: null };
const plain = { shiftKey: false };
const shift = { shiftKey: true };

test("a click toggles one tile and becomes the anchor", () => {
  const once = pickClick(order, none, "c", plain);
  assert.deepEqual([...once.selected], ["c"]);
  assert.equal(once.anchor, "c");
  const twice = pickClick(order, once, "c", plain);
  assert.equal(twice.selected.size, 0);
  assert.equal(twice.anchor, "c");
});

test("shift takes in every tile from the anchor to the click, either way round", () => {
  const down = pickClick(order, pickClick(order, none, "b", plain), "d", shift);
  assert.deepEqual([...down.selected].sort(), ["b", "c", "d"]);
  const up = pickClick(order, pickClick(order, none, "e", plain), "c", shift);
  assert.deepEqual([...up.selected].sort(), ["c", "d", "e"]);
});

test("a shift range adds to what was picked rather than replacing it", () => {
  let p = pickClick(order, none, "a", plain);
  p = pickClick(order, p, "d", plain);
  p = pickClick(order, p, "e", shift);
  assert.deepEqual([...p.selected].sort(), ["a", "d", "e"]);
});

test("shift with nothing to run from toggles the one tile", () => {
  assert.deepEqual([...pickClick(order, none, "c", shift).selected], ["c"]);
  const gone = { selected: new Set(["z"]), anchor: "z" };
  assert.deepEqual([...pickClick(order, gone, "b", shift).selected].sort(), ["b", "z"]);
});

test("the selection handed in is left as it was", () => {
  const before = { selected: new Set(["a"]), anchor: "a" };
  pickClick(order, before, "c", shift);
  assert.deepEqual([...before.selected], ["a"]);
});

test("any modifier makes a click a pick", () => {
  assert.equal(isPickClick({ shiftKey: false, ctrlKey: false, metaKey: false }), false);
  assert.equal(isPickClick({ shiftKey: true, ctrlKey: false, metaKey: false }), true);
  assert.equal(isPickClick({ shiftKey: false, ctrlKey: true, metaKey: false }), true);
  assert.equal(isPickClick({ shiftKey: false, ctrlKey: false, metaKey: true }), true);
});
