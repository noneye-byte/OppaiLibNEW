import { test } from "node:test";
import assert from "node:assert/strict";

const { isSpeedLora, loraStage, loraTwin, suggestClipModels } = await import("./clip-models.ts");

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

test("a speed LoRA is known by its name", () => {
  assert.ok(isSpeedLora("Wan2.2-Lightning_I2V-A14B-4steps-lora_HIGH_fp16.safetensors"));
  assert.ok(isSpeedLora("lightx2v_I2V_14B_480p_cfg_step_distill_rank64_bf16.safetensors"));
  assert.ok(!isSpeedLora("wan_bounce_v2_14steps.safetensors"));
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
