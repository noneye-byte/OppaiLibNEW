import { test } from "node:test";
import assert from "node:assert/strict";

const { clipFrames, clipSeconds, clipSize, lastFrameTime, startFrameSize } = await import("./clip-shape.ts");

test("a clip keeps its picture's shape with the longer side as asked", () => {
  assert.deepEqual(clipSize(1080, 1920, 832), { width: 464, height: 832 });
  assert.deepEqual(clipSize(1920, 1080, 832), { width: 832, height: 464 });
  assert.deepEqual(clipSize(512, 512, 640), { width: 640, height: 640 });
});

test("both sides land on sixteens however odd the picture", () => {
  const { width, height } = clipSize(1001, 777, 1024);
  assert.equal(width % 16, 0);
  assert.equal(height % 16, 0);
});

test("a sliver of a picture still gets a side a model can draw", () => {
  assert.deepEqual(clipSize(4000, 10, 832), { width: 832, height: 64 });
});

test("a picture not yet measured is drawn square", () => {
  assert.deepEqual(clipSize(0, 0, 832), { width: 832, height: 832 });
});

test("five seconds at Wan's sixteen frames is its usual eighty-one", () => {
  assert.equal(clipFrames(5, 16), 81);
  assert.equal(clipSeconds(81, 16), 5);
});

test("every length becomes one frame and whole blocks of eight", () => {
  for (const seconds of [0.5, 1, 2.3, 4, 7]) {
    for (const fps of [8, 12, 16, 24]) assert.equal((clipFrames(seconds, fps) - 1) % 8, 0);
  }
});

test("no length is too short to make a clip of", () => {
  assert.equal(clipFrames(0, 16), 9);
});

test("the last frame is sought half a frame before the clip ends", () => {
  assert.equal(lastFrameTime(5, 16), 5 - 0.5 / 16);
});

test("a clip whose length is not known yet is sought at its start", () => {
  assert.equal(lastFrameTime(NaN, 16), 0);
  assert.equal(lastFrameTime(0, 16), 0);
});

test("a phone photo is shrunk to the start frame's side and keeps its shape; a small picture is sent as it is", () => {
  assert.deepEqual(startFrameSize(3024, 4032), { width: 1152, height: 1536, shrunk: true });
  assert.deepEqual(startFrameSize(4032, 3024), { width: 1536, height: 1152, shrunk: true });
  assert.deepEqual(startFrameSize(832, 1216), { width: 832, height: 1216, shrunk: false });
});
