import { test } from "node:test";
import assert from "node:assert/strict";
import { importSuggestion, loraNegatives, swapPromptDefault } from "./model-defaults.ts";

test("picking a model puts its quality prefix in front of the prompt", () => {
  assert.equal(swapPromptDefault("1girl, beach", undefined, "score_9, score_8_up", "start"), "score_9, score_8_up, 1girl, beach");
});

test("switching models takes the last one's recommended prompt out", () => {
  const pony = "score_9, score_8_up";
  const ill = "masterpiece, best quality";
  assert.equal(swapPromptDefault("score_9, score_8_up, 1girl", pony, ill, "start"), "masterpiece, best quality, 1girl");
});

test("a recommended prompt someone has edited is theirs and stays", () => {
  // score_8_up was deleted by hand, so this is no longer the model's prefix.
  assert.equal(swapPromptDefault("score_9, 1girl", "score_9, score_8_up", "masterpiece", "start"), "masterpiece, score_9, 1girl");
});

test("a negative goes at the end without repeating what is already there", () => {
  assert.equal(swapPromptDefault("blurry, lowres", undefined, "lowres, bad hands", "end"), "blurry, lowres, bad hands");
  assert.equal(swapPromptDefault("", undefined, undefined, "end"), "");
});

test("a LoRA's negatives are added only where the prompt lacks them", () => {
  assert.equal(loraNegatives("lowres, Bad Hands", ["bad hands, 3d", undefined, "3d, sketch"]), "3d, sketch");
});

test("importing replaces what the page names and keeps what it does not", () => {
  const out = importSuggestion(
    { steps: 20, vae: "vae-key", cfgScale: 7 },
    "existing",
    { triggerWords: ["dream, existing"], steps: 28, negative: "lowres", scheduler: "euler_a", width: 832, height: 1216, sources: {} },
    false,
  );
  assert.deepEqual(out.defaults, { steps: 28, vae: "vae-key", cfgScale: 7, negative: "lowres", scheduler: "euler_a", width: 832, height: 1216 });
  assert.equal(out.triggerText, "existing, dream");
  assert.deepEqual(out.applied, ["trigger words", "steps", "sampler", "size", "negative prompt"]);
});

test("a LoRA imports a weight and its range, never a checkpoint's settings", () => {
  const out = importSuggestion({}, "", { triggerWords: [], weight: 0.8, weightMin: 0.6, weightMax: 1, steps: 30, sources: {} }, true);
  assert.deepEqual(out.defaults, { weight: 0.8, weightMin: 0.6, weightMax: 1 });
});
