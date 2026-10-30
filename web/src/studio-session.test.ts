import { test } from "node:test";
import assert from "node:assert/strict";

const { moveItem, patchShot, rememberPrompt, rememberShots, stepThrough } = await import("./studio-session.ts");

const s = (id: string) => ({ id });

test("a new run goes in front of the pictures made before it", () => {
  assert.deepEqual(rememberShots([s("a"), s("b")], [s("c"), s("d")]).map((x) => x.id), ["c", "d", "a", "b"]);
});

test("a picture the strip already holds moves to the front instead of appearing twice", () => {
  assert.deepEqual(rememberShots([s("a"), s("b"), s("c")], [s("b")]).map((x) => x.id), ["b", "a", "c"]);
});

test("the oldest pictures fall off once the strip is full", () => {
  assert.deepEqual(rememberShots([s("a"), s("b"), s("c")], [s("d")], 3).map((x) => x.id), ["d", "a", "b"]);
});

test("patching a picture changes only that one", () => {
  const list = [{ id: "a", saved: false }, { id: "b", saved: false }];
  assert.deepEqual(patchShot(list, "b", { saved: true }), [{ id: "a", saved: false }, { id: "b", saved: true }]);
});

test("patching a picture that is not there hands back the same list", () => {
  const list = [{ id: "a", saved: false }];
  assert.equal(patchShot(list, "z", { saved: true }), list);
});

test("stepping stops at either end rather than wrapping round", () => {
  const list = [s("a"), s("b"), s("c")];
  assert.equal(stepThrough(list, "a", -1), "a");
  assert.equal(stepThrough(list, "c", 1), "c");
  assert.equal(stepThrough(list, "a", 1), "b");
  assert.equal(stepThrough(list, "c", -1), "b");
});

test("stepping with nothing selected lands on the newest picture", () => {
  assert.equal(stepThrough([s("a"), s("b")], null, 1), "a");
  assert.equal(stepThrough([s("a"), s("b")], "gone", -1), "a");
  assert.equal(stepThrough([], null, 1), null);
});

test("a queued run moves to where it is dropped", () => {
  assert.deepEqual(moveItem(["a", "b", "c", "d"], 3, 0), ["d", "a", "b", "c"]);
  assert.deepEqual(moveItem(["a", "b", "c", "d"], 0, 2), ["b", "c", "a", "d"]);
  assert.deepEqual(moveItem(["a", "b"], 5, 0), ["a", "b"]);
});

test("the same prompt used twice is remembered once, at the front", () => {
  let list = rememberPrompt([], { prompt: "a cat", negative: "", at: 1 });
  list = rememberPrompt(list, { prompt: "a dog", negative: "", at: 2 });
  list = rememberPrompt(list, { prompt: " a cat ", negative: "", at: 3 });
  assert.deepEqual(list.map((p) => [p.prompt, p.at]), [["a cat", 3], ["a dog", 2]]);
});

test("the same prompt with a different negative is a different prompt", () => {
  let list = rememberPrompt([], { prompt: "a cat", negative: "", at: 1 });
  list = rememberPrompt(list, { prompt: "a cat", negative: "blurry", at: 2 });
  assert.equal(list.length, 2);
});

test("an empty prompt is not worth remembering", () => {
  assert.deepEqual(rememberPrompt([], { prompt: "   ", negative: "x", at: 1 }), []);
});
