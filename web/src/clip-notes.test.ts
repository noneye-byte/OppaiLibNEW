import { test } from "node:test";
import assert from "node:assert/strict";

const { comfyKindOf, noteFor, parseTriggers, startWeight, withNegative, withoutNegative, withTriggers, withoutTriggers } = await import("./clip-notes.ts");

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

test("a LoRA goes on at the strength kept for it, else at 1", () => {
  assert.equal(startWeight({ ...note([]), defaults: { weight: 0.7 } }), 0.7);
  assert.equal(startWeight({ ...note([]), defaults: { negative: "blur" } }), 1);
  assert.equal(startWeight(undefined), 1);
});

test("a LoRA's negative words join the negative as phrases, each once", () => {
  assert.equal(withNegative("", "static, flicker"), "static, flicker");
  assert.equal(withNegative("blurry, Static", "static, flicker"), "blurry, Static, flicker");
  assert.equal(withNegative("blurry", ""), "blurry");
});

test("taking the LoRA off takes its negative phrases back out and leaves the rest", () => {
  const on = withNegative("blurry, distorted hands", "static, flicker");
  assert.equal(withoutNegative(on, "static, flicker"), "blurry, distorted hands");
  assert.equal(withoutNegative("static", "static"), "");
  assert.equal(withoutNegative("blurry", "static"), "blurry");
});

test("a choice's files are looked for in the folder its kind is installed to", () => {
  assert.equal(comfyKindOf("lora"), "loras");
  assert.equal(comfyKindOf("pair"), "diffusion_models");
  assert.equal(comfyKindOf("single"), "diffusion_models");
  assert.equal(comfyKindOf("checkpoint"), "checkpoints");
});
