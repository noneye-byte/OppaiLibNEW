import { test } from "node:test";
import assert from "node:assert/strict";

const { noteFor, parseTriggers, withTriggers, withoutTriggers } = await import("./clip-notes.ts");

const note = (triggers: string[], cover = false) => ({ triggers, cover, v: 1 });

test("a LoRA's words go in front of the prompt as a sentence of their own", () => {
  assert.equal(withTriggers("She turns and waves.", ["b0unce", "jiggle"]), "b0unce, jiggle. She turns and waves.");
});

test("words already in the prompt are not put in twice", () => {
  assert.equal(withTriggers("b0unce. She waves.", ["b0unce"]), "b0unce. She waves.");
  assert.equal(withTriggers("She waves.", ["B0unce", "jiggle"]).startsWith("B0unce, jiggle."), true);
});

test("an empty prompt becomes the words alone", () => {
  assert.equal(withTriggers("", ["twirl"]), "twirl.");
});

test("taking the LoRA off takes its sentence back out", () => {
  const on = withTriggers("She turns and waves.", ["b0unce", "jiggle"]);
  assert.equal(withoutTriggers(on, ["b0unce", "jiggle"]), "She turns and waves.");
});

test("a word the user wrote into a sentence of their own stays", () => {
  assert.equal(withoutTriggers("She does a b0unce and waves.", ["b0unce"]), "She does a b0unce and waves.");
});

test("taking off the only sentence leaves the box empty", () => {
  assert.equal(withoutTriggers("twirl.", ["twirl"]), "");
});

test("trigger words are split on commas and lines, each once", () => {
  assert.deepEqual(parseTriggers(" b0unce, jiggle\nB0UNCE ,, "), ["b0unce", "jiggle"]);
});

test("a pair's note is found on whichever half has one", () => {
  const notes = { "x_low.safetensors": note(["x"], true) };
  assert.deepEqual(noteFor([{ name: "x_high.safetensors" }, { name: "x_low.safetensors" }], notes)?.name, "x_low.safetensors");
  assert.equal(noteFor([{ name: "y.safetensors" }], notes), null);
});
