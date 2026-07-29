// Run with: npm test  (node --test, which strips the types itself — no test runner
// dependency, which is why these are node:test rather than vitest.)
import { test } from "node:test";
import assert from "node:assert/strict";

import { buildGenInfo, toGenerateParams, toInfotext, toJSON } from "./gen-info.ts";
import type { GenerateParams } from "./api.ts";

const params: GenerateParams = {
  prompt: "a woman in a red dress, detailed",
  negativePrompt: "blurry, extra fingers",
  checkpoint: "someModel_v4.safetensors",
  vae: "sdxl_vae",
  sampler: "dpmpp_2m_k",
  steps: 28,
  width: 832,
  height: 1216,
  cfgScale: 6.5,
  cfgRescale: 0.7,
  clipSkip: 2,
  seamlessX: true,
  seamlessY: false,
  vaePrecision: "fp16",
  cpuNoise: false,
  board: "portraits",
  seed: -1,
  count: 2,
  loras: [
    { name: "detail_slider", weight: 0.8 },
    { name: "style_thing", weight: 0.45 },
  ],
  detailer: {
    enabled: true,
    model: "face_yolov8n.pt",
    prompt: "detailed face",
    negativePrompt: "deformed",
    confidence: 0.35,
    denoise: 0.4,
    maskBlur: 4,
  },
};

test("the recorded seed is the one that came back, not the one submitted", () => {
  // -1 means "surprise me". Recording that would make the copied data useless for
  // reproducing the image, which is the entire point of copying it.
  const info = buildGenInfo(params, { seed: 998877, backend: "invokeai" });
  assert.equal(info.seed, 998877);
  assert.match(toInfotext(info), /Seed: 998877/);
});

test("infotext keeps the three-line shape other tools parse", () => {
  const info = buildGenInfo(params, { seed: 5, backend: "invokeai" });
  const lines = toInfotext(info).split("\n");
  // A1111 readers key off exactly this: prompt, then "Negative prompt:", then the
  // comma-separated pairs. A prettier layout would make the output non-portable.
  assert.equal(lines.length, 3);
  assert.equal(
    lines[0],
    `${params.prompt} <lora:detail_slider:0.8> <lora:style_thing:0.45>`,
    "portable infotext adds the LoRA activations that InvokeAI otherwise stores only as graph nodes",
  );
  assert.equal(lines[1], "Negative prompt: blurry, extra fingers");
  assert.match(lines[2], /^Steps: 28, Sampler: dpmpp_2m_k, CFG scale: 6\.5, Seed: 5, Size: 832x1216/);
});

test("infotext omits the negative line when there is no negative prompt", () => {
  const info = buildGenInfo({ ...params, negativePrompt: "" }, { seed: 1, backend: "a1111" });
  const lines = toInfotext(info).split("\n");
  assert.equal(lines.length, 2, "an empty 'Negative prompt:' line would be parsed as a literal empty negative");
});

test("every field the brief lists survives into the copied data", () => {
  const info = buildGenInfo(params, {
    seed: 42,
    backend: "invokeai",
    triggers: ["trigger_phrase"],
    characters: ["Libby"],
    outfit: "red dress",
    controlImage: "cutout-1.png",
    seconds: 12.34,
  });
  const text = toInfotext(info);
  for (const [what, needle] of [
    ["model", "Model: someModel_v4.safetensors"],
    ["vae", "VAE: sdxl_vae"],
    ["sampler/scheduler", "Sampler: dpmpp_2m_k"],
    ["seed", "Seed: 42"],
    ["steps", "Steps: 28"],
    ["cfg", "CFG scale: 6.5"],
    ["dimensions", "Size: 832x1216"],
    ["loras", "<lora:detail_slider:0.8>"],
    ["embeddings/triggers", "Trigger phrases: trigger_phrase"],
    ["control input", "Control image: cutout-1.png"],
    ["refiner", "ADetailer model: face_yolov8n.pt"],
    ["generation time", "Generation time: 12.3s"],
    ["backend params", "Backend: invokeai"],
  ] as const) {
    assert.ok(text.includes(needle), `${what} missing from infotext:\n${text}`);
  }
});

test("the JSON form is lossless where infotext is not", () => {
  const info = buildGenInfo(params, { seed: 7, backend: "invokeai", outfit: "red dress" });
  const back = JSON.parse(toJSON(info));
  // These have no A1111 equivalent at all; squeezing them into infotext would either
  // drop them or emit keys nothing else can read, so the JSON carries them.
  assert.equal(back.board, "portraits");
  assert.equal(back.vaePrecision, "fp16");
  assert.equal(back.outfit, "red dress");
  assert.equal(back.cpuNoise, false);
  assert.deepEqual(back.loras, [
    { name: "detail_slider", weight: 0.8 },
    { name: "style_thing", weight: 0.45 },
  ]);
  assert.equal(back.refiner.denoise, 0.4);
});

test("a disabled refiner is absent rather than recorded as off", () => {
  const info = buildGenInfo(
    { ...params, detailer: { enabled: false, model: "face_yolov8n.pt" } },
    { seed: 1, backend: "a1111" },
  );
  assert.equal(info.refiner, undefined);
  assert.ok(!toInfotext(info).includes("ADetailer"), "an unused refiner in the data reads as if it ran");
});

test("the uncategorized board is not recorded as a destination", () => {
  // "none" is InvokeAI's uncategorized pile, not a board the user chose.
  const info = buildGenInfo({ ...params, board: "none" }, { seed: 1, backend: "invokeai" });
  assert.equal(info.board, undefined);
  assert.ok(!toInfotext(info).includes("Board:"));
});

test("Civitai resource hashes are written using the keys its parser recognises", () => {
  const info = buildGenInfo(params, {
    seed: 7,
    backend: "invokeai",
    modelHash: "model-sha256",
    loraHashes: { detail_slider: "detail-sha256", style_thing: "style-sha256" },
  });
  const text = toInfotext(info);
  assert.match(text, /Model hash: model-sha256/);
  assert.match(text, /Lora hashes: "detail_slider: detail-sha256, style_thing: style-sha256"/);
});

test("generation data loads back into reproducible request parameters", () => {
  const info = buildGenInfo(params, { seed: 1234, backend: "invokeai" });
  const reused = toGenerateParams(info);
  assert.equal(reused.prompt, params.prompt);
  assert.equal(reused.negativePrompt, params.negativePrompt);
  assert.equal(reused.checkpoint, params.checkpoint);
  assert.equal(reused.seed, 1234);
  assert.equal(reused.count, 1);
  assert.deepEqual(reused.loras, params.loras);
  assert.equal(reused.detailer?.denoise, params.detailer?.denoise);
});
