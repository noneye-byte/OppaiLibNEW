import { test } from "node:test";
import assert from "node:assert/strict";

import { WATCH_EVERY_MS, frameSize, watchDue } from "./watch-together.ts";

// She is shown the screen only while it is worth showing: on, playing, and not while
// she is still looking at the last one.
test("a frame goes to her only while watching together and the video plays", () => {
  const base = { on: true, playing: true, inFlight: false, now: WATCH_EVERY_MS, last: 0 };
  assert.equal(watchDue(base), true);
  assert.equal(watchDue({ ...base, on: false }), false);
  assert.equal(watchDue({ ...base, playing: false }), false);
  assert.equal(watchDue({ ...base, inFlight: true }), false);
  assert.equal(watchDue({ ...base, last: 10_000 }), false);
});

test("a frame keeps the video's shape and is never upscaled", () => {
  assert.deepEqual(frameSize(1920, 1080), { width: 640, height: 360 });
  assert.deepEqual(frameSize(1080, 1920), { width: 360, height: 640 });
  assert.deepEqual(frameSize(320, 240), { width: 320, height: 240 });
});

test("a video that has not reported its size still gets a frame", () => {
  assert.deepEqual(frameSize(0, 0), { width: 640, height: 360 });
});
