import { test } from "node:test";
import assert from "node:assert/strict";
import { nextSlide } from "./slideshow.ts";

test("in order, the run ends at the last item rather than wrapping", () => {
  assert.equal(nextSlide([1, 2, 3], 1, false), 2);
  assert.equal(nextSlide([1, 2, 3], 3, false), null);
});

test("an item that is not in the queue starts the run from the top", () => {
  assert.equal(nextSlide([1, 2, 3], 9, false), 1);
});

test("shuffled, it never lands on what is already up and a pair alternates", () => {
  for (let i = 0; i < 20; i++) {
    assert.equal(nextSlide([1, 2], 1, true), 2);
    assert.notEqual(nextSlide([1, 2, 3, 4], 3, true), 3);
  }
  assert.equal(nextSlide([1, 2, 3], 2, true, () => 0.99), 3);
  assert.equal(nextSlide([1, 2, 3], 2, true, () => 0), 1);
});

test("a queue of one has nowhere to go", () => {
  assert.equal(nextSlide([7], 7, true), null);
  assert.equal(nextSlide([], 7, false), null);
});
