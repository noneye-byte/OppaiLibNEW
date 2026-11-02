import { test } from "node:test";
import assert from "node:assert/strict";

const { canMake, clipTake, nextStep, pictureTake, squareSteps, stepCounts, stepWork } = await import("./sprite-motion.ts");

const clipOf = (picture: string, seed = 5, updatedAt = 100) => ({ seed, updatedAt, from: picture });

test("a square with nothing needs its picture first", () => {
  assert.equal(nextStep({ picture: "" }), "picture");
});

test("a clip can't be made before the picture it is made of", () => {
  assert.ok(!canMake("clip", { picture: "" }));
  assert.ok(canMake("clip", { picture: "seed-1" }));
});

test("a cut can't be made before a clip of the picture the square has now", () => {
  assert.ok(!canMake("cut", { picture: "seed-1" }));
  assert.ok(!canMake("cut", { picture: "seed-2", clip: clipOf("seed-1") }));
  assert.ok(canMake("cut", { picture: "seed-1", clip: clipOf("seed-1") }));
});

test("redoing the picture leaves its clip out of date, and the clip's cut with it", () => {
  const clip = clipOf("seed-1");
  const cut = { seed: 5, updatedAt: 200, from: clipTake(clip) };
  assert.deepEqual(squareSteps({ picture: "seed-1", clip, cut }), { clip: "ready", cut: "ready" });
  assert.deepEqual(squareSteps({ picture: "seed-9", clip, cut }), { clip: "stale", cut: "stale" });
  assert.equal(nextStep({ picture: "seed-9", clip, cut }), "clip");
});

test("redoing the clip leaves its cut out of date", () => {
  const old = clipOf("seed-1", 5, 100);
  const redone = clipOf("seed-1", 6, 300);
  const cut = { seed: 5, updatedAt: 200, from: clipTake(old) };
  assert.deepEqual(squareSteps({ picture: "seed-1", clip: redone, cut }), { clip: "ready", cut: "stale" });
  assert.equal(nextStep({ picture: "seed-1", clip: redone, cut }), "cut");
});

test("a square whose clip and cut are both of its picture is done", () => {
  const clip = clipOf("seed-1");
  assert.equal(nextStep({ picture: "seed-1", clip, cut: { seed: 5, updatedAt: 200, from: clipTake(clip) } }), "done");
});

test("each step of a run works only through squares that have what it is made of", () => {
  const clip = clipOf("seed-1");
  const squares = [
    { picture: "" },
    { picture: "seed-1" },
    { picture: "seed-1", clip },
    { picture: "seed-1", clip, cut: { seed: 5, updatedAt: 1, from: clipTake(clip) } },
    { picture: "seed-2", clip },
  ];
  assert.deepEqual(stepWork("picture", squares), [0]);
  assert.deepEqual(stepWork("clip", squares), [1, 4]);
  assert.deepEqual(stepWork("cut", squares), [2]);
});

test("the counts are of squares fresh at each step", () => {
  const clip = clipOf("seed-1");
  const counts = stepCounts([
    { picture: "seed-1", clip, cut: { seed: 5, updatedAt: 1, from: clipTake(clip) } },
    { picture: "seed-2", clip },
    { picture: "" },
  ]);
  assert.deepEqual(counts, { picture: 2, clip: 1, cut: 1 });
});

test("a picture's take changes with its seed, its recipe, or a new upload of one's own", () => {
  assert.notEqual(pictureTake(1, 10), pictureTake(2, 10));
  assert.equal(pictureTake(1, 10), pictureTake(1, 99));
  assert.notEqual(pictureTake(1, 10, "red dress"), pictureTake(1, 10, "blue dress"));
  assert.notEqual(pictureTake(-1, 10), pictureTake(-1, 11));
});
