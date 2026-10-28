import { test } from "node:test";
import assert from "node:assert/strict";

const { trainBucket, trainResolution, picturesToEnlarge } = await import("./train-fit.ts");

test("a bucket is the picture's shape filling the resolution, as the server works it out", () => {
  // The same cases as lora_fit_test.go, so the two cannot drift apart unseen.
  assert.deepEqual(trainBucket(512, 768, 1024), { width: 832, height: 1216 });
  assert.deepEqual(trainBucket(400, 400, 1024), { width: 1024, height: 1024 });
  assert.deepEqual(trainBucket(4000, 3000, 1024), { width: 1152, height: 832 });
  assert.deepEqual(trainBucket(300, 450, 512), { width: 384, height: 576 });
  assert.deepEqual(trainBucket(100, 2000, 1024), { width: 256, height: 2048 });
});

test("the resolution is the one asked for, else the family's, held to 768 on low VRAM", () => {
  assert.equal(trainResolution(0, "SDXL 1.0 pony", false), 1024);
  assert.equal(trainResolution(0, "SD 1.5 anything", false), 512);
  assert.equal(trainResolution(0, "", false), 1024);
  assert.equal(trainResolution(0, "Illustrious", true), 768);
  assert.equal(trainResolution(900, "", false), 896);
});

test("only pictures more than a quarter short of their bucket count as enlarged", () => {
  const items = [
    { width: 300, height: 450 },   // ×2.8 — enlarged
    { width: 800, height: 1170 },  // ×1.04 — resampled
    { width: 2000, height: 3000 }, // shrinks
    {},                             // size unknown
  ];
  assert.equal(picturesToEnlarge(items, 1024), 1);
});
