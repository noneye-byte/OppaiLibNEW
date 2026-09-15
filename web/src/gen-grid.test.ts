import { test } from "node:test";
import assert from "node:assert/strict";

import {
  clampFloat,
  clampNum,
  expressionSquares,
  slotKeyOf,
  squareAddress,
  squareIndex,
  totalSquares,
  type SquareLayout,
} from "./gen-grid.ts";

// The real board: twelve expressions across five heat tiers, then the activity squares.
const LAYOUT: SquareLayout = {
  faces: 12,
  tiers: 5,
  miscIds: ["reading", "cooking", "bathing", "sleeping"],
};

// The property that matters, checked over every square rather than a sample: decoding
// an index and re-encoding the address has to land back on the same index. A board that
// breaks this puts a rendered expression in another expression's cell, and the sheet
// looks perfectly plausible afterwards.
test("every square round-trips through its address", () => {
  for (let index = 0; index < totalSquares(LAYOUT); index++) {
    const a = squareAddress(index, LAYOUT);
    assert.equal(
      squareIndex(a.tier, a.face, a.misc, LAYOUT),
      index,
      `square ${index} decoded to ${JSON.stringify(a)} and came back as something else`,
    );
  }
});

test("addresses are unique — no two squares share one", () => {
  const seen = new Set<string>();
  for (let index = 0; index < totalSquares(LAYOUT); index++) {
    const a = squareAddress(index, LAYOUT);
    const key = `${a.misc || `${a.tier}:${a.face}`}`;
    assert.ok(!seen.has(key), `two squares both decode to ${key}`);
    seen.add(key);
  }
  assert.equal(seen.size, totalSquares(LAYOUT));
});

// Face-major within a tier: the order the wardrobe editor lays them out in.
test("expressions run face-major within a tier", () => {
  assert.deepEqual(squareAddress(0, LAYOUT), { tier: 0, face: 0, misc: "" });
  assert.deepEqual(squareAddress(11, LAYOUT), { tier: 0, face: 11, misc: "" });
  assert.deepEqual(squareAddress(12, LAYOUT), { tier: 1, face: 0, misc: "" });
  assert.equal(expressionSquares(LAYOUT), 60);
});

// An activity is one square whatever the heat — what she is doing does not change with
// the meter the way her face does.
test("the activity block follows the expressions, one square each", () => {
  assert.deepEqual(squareAddress(60, LAYOUT), { tier: 0, face: 0, misc: "reading" });
  assert.deepEqual(squareAddress(63, LAYOUT), { tier: 0, face: 0, misc: "sleeping" });
  assert.equal(squareIndex(0, 0, "cooking", LAYOUT), 61);
  // A tier on an activity square is meaningless and must not move it.
  assert.equal(squareIndex(4, 7, "cooking", LAYOUT), 61);
});

// Out of range clamps rather than throwing: the callers are a batch runner and a
// keyboard walk, and a clamped square beats a crash mid-sheet.
test("out-of-range indexes clamp to the end of their block", () => {
  assert.deepEqual(squareAddress(-5, LAYOUT), { tier: 0, face: 0, misc: "" });
  assert.deepEqual(squareAddress(9999, LAYOUT), { tier: 0, face: 0, misc: "sleeping" });
});

test("a board with no activities is all expressions", () => {
  const bare: SquareLayout = { faces: 3, tiers: 2, miscIds: [] };
  assert.equal(totalSquares(bare), 6);
  assert.deepEqual(squareAddress(5, bare), { tier: 1, face: 2, misc: "" });
  // Past the end of a board with no activity block still gives a real square.
  assert.deepEqual(squareAddress(50, bare), { tier: 0, face: 0, misc: "" });
});

// A square is matched by its slot, not its filename: renaming an outfit used to orphan
// every square on the board.
test("a slot key is the emotion and tier, not the name", () => {
  assert.equal(slotKeyOf({ emotion: "happy", tier: 2 }), "happy:2");
  assert.notEqual(slotKeyOf({ emotion: "happy", tier: 2 }), slotKeyOf({ emotion: "happy", tier: 3 }));
});

test("numeric inputs clamp, round and fall back", () => {
  assert.equal(clampNum("20", 1, 150, 30), 20);
  assert.equal(clampNum("20.6", 1, 150, 30), 21);
  assert.equal(clampNum("999", 1, 150, 30), 150);
  assert.equal(clampNum("-5", 1, 150, 30), 1);
  assert.equal(clampNum("", 1, 150, 30), 30, "an empty field is the default, not zero");
  assert.equal(clampNum("banana", 1, 150, 30), 30);
});

test("fractional inputs keep their fraction", () => {
  assert.equal(clampFloat("7.5", 1, 30, 7), 7.5);
  assert.equal(clampFloat("100", 1, 30, 7), 30);
  assert.equal(clampFloat("nonsense", 1, 30, 7), 7);
  assert.equal(clampFloat("  ", 1, 30, 7), 7, "a cleared field is the default, not the minimum");
});
