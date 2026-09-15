import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSize, promptSettingsFrom, schedulerIdFor } from "./civitai-prompt.ts";

test("A1111 sampler names become InvokeAI scheduler ids, and unknown ones become nothing", () => {
  assert.equal(schedulerIdFor("Euler a"), "euler_a");
  assert.equal(schedulerIdFor("DPM++ 2M Karras"), "dpmpp_2m_k");
  assert.equal(schedulerIdFor("dpm++ 2m  sde   karras"), "dpmpp_2m_sde_k");
  assert.equal(schedulerIdFor("DPM++ 2M Karras Exponential"), "dpmpp_2m_k");
  assert.equal(schedulerIdFor("dpmpp_3m_k"), "dpmpp_3m_k");
  assert.equal(schedulerIdFor("Restart"), "");
  assert.equal(schedulerIdFor(undefined), "");
});

test("a size string is read either way round and rejected when it is not a size", () => {
  assert.deepEqual(parseSize("512x768"), [512, 768]);
  assert.deepEqual(parseSize("1024 × 1024"), [1024, 1024]);
  assert.equal(parseSize("portrait"), null);
  assert.equal(parseSize("8x8"), null);
});

test("a picture without a prompt is not a prompt, and gaps leave the form alone", () => {
  assert.equal(promptSettingsFrom({ id: 1, url: "", width: 512, height: 768, nsfwLevel: 1 }), null);
  const got = promptSettingsFrom({
    id: 1, url: "", width: 512, height: 768, nsfwLevel: 1,
    prompt: " 1girl, dream ", negativePrompt: "bad", sampler: "Euler a", steps: 30, cfgScale: 7, seed: 12345, size: "832x1216",
  });
  assert.deepEqual(got, {
    prompt: "1girl, dream", negativePrompt: "bad", sampler: "euler_a", steps: 30, cfgScale: 7, seed: 12345, width: 832, height: 1216,
  });
  const sparse = promptSettingsFrom({ id: 2, url: "", width: 640, height: 960, nsfwLevel: 1, prompt: "cat", sampler: "Restart", steps: 0 });
  assert.deepEqual(sparse, { prompt: "cat", width: 640, height: 960 });
});
