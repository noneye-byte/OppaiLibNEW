import { test } from "node:test";
import assert from "node:assert/strict";

const { aspectLabel, megapixels, previewFrame, PREVIEW_REFERENCE } = await import("./size-preview.ts");

test("the common sizes are called by their ratio and what they are", () => {
  assert.deepEqual(aspectLabel(512, 768), { ratio: "2:3", name: "portrait photo" });
  assert.deepEqual(aspectLabel(1024, 1024), { ratio: "1:1", name: "square" });
  assert.deepEqual(aspectLabel(1344, 768), { ratio: "16:9", name: "widescreen" });
});

test("an SDXL bucket near a ratio counts as it", () => {
  // 832×1216 is 13:19 exactly, within 3% of 2:3.
  assert.deepEqual(aspectLabel(832, 1216), { ratio: "2:3", name: "portrait photo" });
});

test("a size near no common ratio says its own, as a decimal when the numbers are large", () => {
  assert.deepEqual(aspectLabel(600, 1000), { ratio: "3:5", name: "" });
  assert.equal(aspectLabel(1000, 1016).ratio, "1:1");
  assert.deepEqual(aspectLabel(1000, 1608), { ratio: "1:1.61", name: "" });
});

test("the frame is to scale, so a bigger size draws bigger in the same shape", () => {
  const small = previewFrame(512, 768, 128);
  const large = previewFrame(832, 1216, 128);
  assert.ok(large.height > small.height);
  assert.equal(previewFrame(PREVIEW_REFERENCE, PREVIEW_REFERENCE, 128).width, 128);
});

test("a size past the reference fills the box rather than spilling out of it", () => {
  const f = previewFrame(2048, 1024, 128);
  assert.deepEqual(f, { width: 128, height: 64 });
});

test("megapixels read to one decimal", () => {
  assert.equal(megapixels(1024, 1024), "1.0 MP");
  assert.equal(megapixels(512, 768), "0.4 MP");
});
