import { test } from "node:test";
import assert from "node:assert/strict";

const { suggestionLine } = await import("./suggested.ts");

test("the line names what she went on, as a sentence would", () => {
  assert.equal(suggestionLine(["beach"], false), "Going by beach");
  assert.equal(suggestionLine(["beach", "swimsuit"], false), "Going by beach and swimsuit");
  assert.equal(suggestionLine(["beach", "swimsuit", "sunset"], false), "Going by beach, swimsuit and sunset");
});

test("the safe screen names no tags, however many she has", () => {
  assert.equal(suggestionLine(["beach"], true), "From what you keep coming back to");
});

test("with no tags to name the line still reads", () => {
  assert.equal(suggestionLine([], false), "From what you keep coming back to");
});
