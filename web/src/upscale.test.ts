import { test } from "node:test";
import assert from "node:assert/strict";

const { hiresScale, upscaleFactor, scaledSize, hiresUpscalers } = await import("./upscale.ts");

test("a hires fix stops where the larger side reaches 4096", () => {
  assert.equal(hiresScale(512, 768, 2), 2);
  assert.equal(hiresScale(1536, 1024, 4), 2.67);
  assert.equal(hiresScale(4096, 4096, 2), 1);
});

test("an unset hires factor doubles and none goes past four", () => {
  assert.equal(hiresScale(512, 512, 0), 2);
  assert.equal(hiresScale(256, 256, 9), 4);
});

test("an upscale of a finished picture may go to 8192 on its larger side", () => {
  assert.equal(upscaleFactor(1024, 1536, 4), 4);
  assert.equal(upscaleFactor(3000, 2000, 4), 8192 / 3000);
  assert.equal(upscaleFactor(9000, 100, 2), 1);
});

test("the size shown is the size A1111 will make", () => {
  assert.deepEqual(scaledSize(512, 768, 1.5), { width: 768, height: 1152 });
  assert.deepEqual(scaledSize(1536, 1024, 2.67), { width: 4101, height: 2734 });
});

test("the hires choices are the latent modes then the models, once each", () => {
  assert.deepEqual(hiresUpscalers(["Latent"], ["R-ESRGAN 4x+", "Latent"]), ["Latent", "R-ESRGAN 4x+"]);
  assert.deepEqual(hiresUpscalers(undefined, undefined), []);
});
