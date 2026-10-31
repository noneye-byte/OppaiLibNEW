import { test } from "node:test";
import assert from "node:assert/strict";

const {
  clipLoraChoices, clipLoraPicks, clipModelChoiceOf, clipModelChoices, comfyFolderOf, isSpeedFile, loraStage, loraTwin, NO_CLIP_MODELS,
  settleSpeed, speedAtFullCFG, studioClipModels, studioClipRecipe, suggestClipModels, withClipModel,
} = await import("./clip-models.ts");

test("a LoRA's half of the pair is read off its name however it is written", () => {
  assert.equal(loraStage("Wan2.2-Lightning_I2V-A14B-4steps-lora_HIGH_fp16.safetensors"), "high");
  assert.equal(loraStage("wan22/bounce_HighNoise.safetensors"), "high");
  assert.equal(loraStage("wan2.2_i2v_lightx2v_4steps_lora_v1_low_noise.safetensors"), "low");
  assert.equal(loraStage("motion-low.safetensors"), "low");
});

test("slow and highres are words, not halves", () => {
  assert.equal(loraStage("slow_motion_wan.safetensors"), "");
  assert.equal(loraStage("highres_fix.safetensors"), "");
  assert.equal(loraStage("lightx2v_T2V_14B_cfg_step_distill_rank64.safetensors"), "");
});

test("a half's twin is found in the same case it was written in", () => {
  const offered = ["a_HIGH.safetensors", "a_LOW.safetensors", "b_HighNoise.safetensors", "b_LowNoise.safetensors", "c_high.safetensors"];
  assert.equal(loraTwin("a_HIGH.safetensors", offered), "a_LOW.safetensors");
  assert.equal(loraTwin("b_LowNoise.safetensors", offered), "b_HighNoise.safetensors");
  assert.equal(loraTwin("c_high.safetensors", offered), "");
  assert.equal(loraTwin("plain.safetensors", offered), "");
});

test("only a name's last half is swapped, so a high in the model's own name stays", () => {
  const offered = ["High Rise Dance i2v_high.safetensors", "High Rise Dance i2v_low.safetensors"];
  assert.equal(loraTwin("High Rise Dance i2v_high.safetensors", offered), "High Rise Dance i2v_low.safetensors");
  assert.equal(loraTwin("High Rise Dance i2v_low.safetensors", offered), "High Rise Dance i2v_high.safetensors");
});

test("a speed LoRA, or a merge with one in, is known by its name", () => {
  assert.ok(isSpeedFile("wan2.2-rapid-mega-aio-v10.safetensors"));
  assert.ok(isSpeedFile("Wan22_I2V_AIO_fp8.safetensors"));
  assert.ok(!isSpeedFile("wan2.2_i2v_high_noise_14B_fp8_scaled.safetensors"));
  assert.ok(isSpeedFile("Wan2.2-Lightning_I2V-A14B-4steps-lora_HIGH_fp16.safetensors"));
  assert.ok(isSpeedFile("lightx2v_I2V_14B_480p_cfg_step_distill_rank64_bf16.safetensors"));
  assert.ok(!isSpeedFile("wan_bounce_v2_14steps.safetensors"));
});

const installed = {
  diffusion: [
    "wan2.2_t2v_high_noise_14B_fp8_scaled.safetensors",
    "wan2.2_t2v_low_noise_14B_fp8_scaled.safetensors",
    "wan2.2_i2v_high_noise_14B_fp8_scaled.safetensors",
    "wan2.2_i2v_low_noise_14B_fp8_scaled.safetensors",
  ],
  checkpoints: ["sdxl_base.safetensors"],
  textEncoders: ["clip_l.safetensors", "umt5_xxl_fp8_e4m3fn_scaled.safetensors"],
  vaes: ["wan2.2_vae.safetensors", "wan_2.1_vae.safetensors"],
  loras: [],
  missing: [],
};

test("each direction gets its own pair, the encoder and Wan 2.1's VAE", () => {
  const image = suggestClipModels(installed, true);
  assert.equal(image?.model, "wan2.2_i2v_high_noise_14B_fp8_scaled.safetensors");
  assert.equal(image?.lowModel, "wan2.2_i2v_low_noise_14B_fp8_scaled.safetensors");
  assert.equal(image?.textEncoder, "umt5_xxl_fp8_e4m3fn_scaled.safetensors");
  assert.equal(image?.vae, "wan_2.1_vae.safetensors");
  assert.equal(suggestClipModels(installed, false)?.model, "wan2.2_t2v_high_noise_14B_fp8_scaled.safetensors");
});

test("the 5B model does both directions with its own VAE", () => {
  const lists = { ...installed, diffusion: ["wan2.2_ti2v_5B_fp16.safetensors"] };
  for (const fromImage of [true, false]) {
    const s = suggestClipModels(lists, fromImage);
    assert.equal(s?.model, "wan2.2_ti2v_5B_fp16.safetensors");
    assert.equal(s?.lowModel, "");
    assert.equal(s?.vae, "wan2.2_vae.safetensors");
  }
});

test("an all-in-one checkpoint is picked when there are no bare models", () => {
  const lists = { ...installed, diffusion: [], checkpoints: ["wan2.2-i2v-rapid-aio-v10.safetensors"] };
  const s = suggestClipModels(lists, true);
  assert.equal(s?.model, "wan2.2-i2v-rapid-aio-v10.safetensors");
  assert.equal(s?.checkpoint, true);
  assert.equal(suggestClipModels(lists, false), null);
});

test("a Wan checkpoint goes to diffusion_models unless its name says it carries everything", () => {
  assert.equal(comfyFolderOf("Checkpoint", "Smooth Mix i2v_high.safetensors"), "diffusion_models");
  assert.equal(comfyFolderOf("Checkpoint", "Wan 2.2 Rapid AIO v10.safetensors"), "checkpoints");
  assert.equal(comfyFolderOf("Checkpoint", "wan22-all-in-one.safetensors"), "checkpoints");
  assert.equal(comfyFolderOf("Checkpoint", "Radio Ratio.safetensors"), "diffusion_models");
  assert.equal(comfyFolderOf("LyCORIS", "bounce.safetensors"), "loras");
  assert.equal(comfyFolderOf("VAE", "wan_2.1_vae.safetensors"), "vae");
  assert.equal(comfyFolderOf("TextualInversion", "x.pt"), null);
});

test("a pair's two halves are one choice, named without the word for the half", () => {
  const choices = clipLoraChoices([
    "wan\\Wan2.2-Lightning_I2V-A14B-4steps-lora_LOW_fp16.safetensors",
    "wan\\Wan2.2-Lightning_I2V-A14B-4steps-lora_HIGH_fp16.safetensors",
    "bounce_HighNoise.safetensors", "bounce_LowNoise.safetensors",
    "motion.safetensors",
  ]);
  assert.deepEqual(choices.map((c) => [c.label, c.files.length, c.speed]), [
    ["bounce", 2, false], ["motion", 1, false], ["Wan2.2-Lightning I2V-A14B-4steps-lora fp16", 2, true],
  ]);
  // Picked by the high half, which comes first.
  const lightning = choices[2];
  assert.equal(lightning.key, "wan\\Wan2.2-Lightning_I2V-A14B-4steps-lora_HIGH_fp16.safetensors");
  assert.deepEqual(lightning.files.map((f) => f.stage), ["high", "low"]);
});

test("a half with no twin is a choice of its own, still read as its half", () => {
  const [c] = clipLoraChoices(["solo_high.safetensors"]);
  assert.equal(c.label, "solo high");
  assert.deepEqual(c.files, [{ name: "solo_high.safetensors", stage: "high" }]);
});

test("picks go on as files: both halves on the pair, the low half alone on one model", () => {
  const choices = clipLoraChoices(["a_high.safetensors", "a_low.safetensors", "b.safetensors"]);
  const picked = { "a_high.safetensors": 0.8, "b.safetensors": 1 };
  assert.deepEqual(clipLoraPicks(picked, choices, true), [
    { name: "a_high.safetensors", weight: 0.8, stage: "high" },
    { name: "a_low.safetensors", weight: 0.8, stage: "low" },
    { name: "b.safetensors", weight: 1, stage: "" },
  ]);
  assert.deepEqual(clipLoraPicks(picked, choices, false), [
    { name: "a_low.safetensors", weight: 0.8, stage: "" },
    { name: "b.safetensors", weight: 1, stage: "" },
  ]);
});

test("a speed file at a full-strength CFG is told apart from one at its own", () => {
  const m = { model: "high.safetensors", checkpoint: false, lowModel: "low.safetensors", textEncoder: "", vae: "", steps: 20, cfg: 3.5, shift: 0,
    loras: [{ name: "lightx2v_high.safetensors", weight: 1, stage: "high" as const }] };
  assert.ok(speedAtFullCFG(m));
  assert.ok(!speedAtFullCFG({ ...m, cfg: 1 }));
  assert.ok(!speedAtFullCFG({ ...m, loras: [{ ...m.loras[0], weight: 0 }] }));
});

const offeredFiles = {
  diffusion: [
    "wan2.2_i2v_low_noise_14B_fp8.safetensors", "wan2.2_i2v_high_noise_14B_fp8.safetensors",
    "wan2.2_ti2v_5B_fp16.safetensors", "solo_high_noise.gguf",
  ],
  checkpoints: ["wan2.2-rapid-mega-aio-v10.safetensors"],
  textEncoders: ["clip_l.safetensors", "umt5_xxl_fp8.safetensors"],
  vaes: ["wan_2.1_vae.safetensors", "wan2.2_vae.safetensors"],
};

test("a pair of experts is one model to pick, then single models, then checkpoints", () => {
  const choices = clipModelChoices(offeredFiles);
  assert.deepEqual(choices.map((c) => [c.kind, c.key]), [
    ["pair", "wan2.2_i2v_high_noise_14B_fp8.safetensors"],
    ["single", "solo_high_noise.gguf"],
    ["single", "wan2.2_ti2v_5B_fp16.safetensors"],
    ["checkpoint", "wan2.2-rapid-mega-aio-v10.safetensors"],
  ]);
  assert.equal(choices[0].lowModel, "wan2.2_i2v_low_noise_14B_fp8.safetensors");
  assert.equal(choices[0].label, "wan2.2 i2v 14B fp8");
  assert.ok(choices[3].speed && !choices[0].speed);
});

test("picking a model brings what it needs beside it and keeps what still fits", () => {
  const [pair, , fiveB, aio] = clipModelChoices(offeredFiles);
  const m = withClipModel(NO_CLIP_MODELS, pair, offeredFiles);
  assert.equal(m.lowModel, "wan2.2_i2v_low_noise_14B_fp8.safetensors");
  assert.equal(m.textEncoder, "umt5_xxl_fp8.safetensors");
  assert.equal(m.vae, "wan_2.1_vae.safetensors");
  // The 5B model has a VAE of its own; the encoder picked stays.
  const five = withClipModel({ ...m, textEncoder: "mine.safetensors" }, fiveB, offeredFiles);
  assert.deepEqual([five.lowModel, five.textEncoder, five.vae], ["", "mine.safetensors", "wan2.2_vae.safetensors"]);
  // A checkpoint carries both.
  const all = withClipModel(m, aio, offeredFiles);
  assert.deepEqual([all.checkpoint, all.lowModel, all.textEncoder, all.vae], [true, "", "", ""]);
  assert.equal(clipModelChoiceOf(all, clipModelChoices(offeredFiles))?.kind, "checkpoint");
});

test("taking on a speed file drops numbers that would burn it, and losing it drops its four steps", () => {
  const full = { ...NO_CLIP_MODELS, model: "wan.safetensors", steps: 20, cfg: 3.5 };
  const fast = { ...full, loras: [{ name: "lightx2v.safetensors", weight: 1, stage: "" as const }] };
  assert.deepEqual([settleSpeed(full, fast).steps, settleSpeed(full, fast).cfg], [0, 0]);
  // Numbers a speed file can take stand.
  const six = { ...fast, steps: 6, cfg: 1 };
  assert.equal(settleSpeed(full, six).steps, 6);
  const back = { ...fast, steps: 4, cfg: 1, loras: [] };
  assert.deepEqual([settleSpeed({ ...fast, steps: 4, cfg: 1 }, back).steps, settleSpeed({ ...fast, steps: 4, cfg: 1 }, back).cfg], [0, 0]);
  // An AIO picked as the model counts as one.
  const [, , , aio] = clipModelChoices(offeredFiles);
  assert.equal(withClipModel(full, aio, offeredFiles).steps, 0);
});

test("Settings' LoRAs are read as the studio's choices and go back out as the same files", () => {
  const loraChoices = clipLoraChoices(["bounce_high.safetensors", "bounce_low.safetensors", "style.safetensors", "gone.safetensors"]);
  const settings = {
    ...NO_CLIP_MODELS, model: "h.safetensors", lowModel: "l.safetensors", steps: 6,
    loras: [
      { name: "bounce_high.safetensors", weight: 0.7, stage: "high" as const },
      { name: "bounce_low.safetensors", weight: 0.7, stage: "low" as const },
      { name: "style.safetensors", weight: 0.5, stage: "" as const },
      { name: "not-listed.safetensors", weight: 1, stage: "" as const },
    ],
  };
  const recipe = studioClipRecipe(settings, loraChoices);
  assert.deepEqual(recipe.loras, { "bounce_high.safetensors": 0.7, "style.safetensors": 0.5 });
  assert.equal(recipe.models.steps, 6);
  assert.deepEqual(studioClipModels(recipe, loraChoices).loras, [
    { name: "bounce_high.safetensors", weight: 0.7, stage: "high" },
    { name: "bounce_low.safetensors", weight: 0.7, stage: "low" },
    { name: "style.safetensors", weight: 0.5, stage: "" },
  ]);
  // Nothing in Settings is nothing picked.
  assert.deepEqual(studioClipRecipe(undefined, loraChoices), { models: NO_CLIP_MODELS, loras: {} });
});
