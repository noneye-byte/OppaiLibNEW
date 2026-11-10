import { test } from "node:test";
import assert from "node:assert/strict";

const { canMake, clipTake, nextStep, nextWaiting, pictureTake, setStage, squareSteps, stageCounts, stepWork, stepsFor } = await import("./sprite-motion.ts");

const clipOf = (picture: string, seed = 5, updatedAt = 100) => ({ seed, updatedAt, from: picture });

test("cutting a redone square makes a clip of the new picture first", () => {
  assert.deepEqual(stepsFor("cut", { picture: "seed-2", clip: clipOf("seed-1") }), ["clip", "cut"]);
});

test("cutting a square that never had a clip makes one first", () => {
  assert.deepEqual(stepsFor("cut", { picture: "seed-1" }), ["clip", "cut"]);
});

test("a current clip is cut as it is, and not made again", () => {
  assert.deepEqual(stepsFor("cut", { picture: "seed-1", clip: clipOf("seed-1") }), ["cut"]);
});

test("redoing a clip makes just the clip, even when its cut needs doing too", () => {
  assert.deepEqual(stepsFor("clip", { picture: "seed-2", clip: clipOf("seed-1") }), ["clip"]);
});

test("nothing can be made of a square with no picture", () => {
  assert.deepEqual(stepsFor("clip", { picture: "" }), []);
  assert.deepEqual(stepsFor("cut", { picture: "", clip: clipOf("seed-1") }), []);
});

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
  const clip = { ...clipOf("seed-1"), approved: true };
  const squares = [
    { picture: "" },
    { picture: "seed-1", reviewed: true },
    { picture: "seed-1", reviewed: true, clip },
    { picture: "seed-1", reviewed: true, clip, cut: { seed: 5, updatedAt: 1, from: clipTake(clip) } },
    { picture: "seed-2", reviewed: true, clip },
  ];
  assert.deepEqual(stepWork("picture", squares), [0]);
  assert.deepEqual(stepWork("clip", squares), [1, 4]);
  assert.deepEqual(stepWork("cut", squares), [2]);
});

test("a run of clips waits for each still's review, and a run of cuts for each clip's", () => {
  const clip = clipOf("seed-1");
  const squares = [
    { picture: "seed-1" },
    { picture: "seed-1", reviewed: true, clip },
    { picture: "seed-1", reviewed: true, clip: { ...clip, approved: true } },
  ];
  assert.deepEqual(stepWork("clip", squares), [], "an unreviewed still is not animated");
  assert.deepEqual(stepWork("cut", squares), [2], "an unapproved clip is not cut");
});

test("an approval belongs to the clip it was given, not the square", () => {
  // The picture was redone: the approved clip is of the old one.
  const sq = { picture: "seed-2", reviewed: true, clip: { ...clipOf("seed-1"), approved: true } };
  assert.equal(setStage(sq), "clip");
  assert.deepEqual(stepWork("cut", [sq]), []);
});

test("a square waits at each stage in turn", () => {
  const clip = clipOf("seed-1");
  const kept = { ...clip, approved: true };
  assert.equal(setStage({ picture: "" }), "picture");
  assert.equal(setStage({ picture: "seed-1" }), "review");
  assert.equal(setStage({ picture: "seed-1", reviewed: true }), "clip");
  assert.equal(setStage({ picture: "seed-1", reviewed: true, clip }), "approve");
  assert.equal(setStage({ picture: "seed-1", reviewed: true, clip: kept }), "cut");
  assert.equal(setStage({ picture: "seed-1", reviewed: true, clip: kept, cut: { seed: 5, updatedAt: 1, from: clipTake(kept) } }), "done");
});

test("the next square to review comes after the one open, round to the start", () => {
  const clip = clipOf("seed-1");
  const squares = [
    { picture: "seed-1", reviewed: true, clip },
    { picture: "seed-1" },
    { picture: "seed-1", reviewed: true, clip },
    { picture: "seed-1" },
  ];
  assert.equal(nextWaiting("review", squares), 1);
  assert.equal(nextWaiting("review", squares, 1), 3);
  assert.equal(nextWaiting("review", squares, 3), 1);
  assert.equal(nextWaiting("approve", squares, 0), 2);
  assert.equal(nextWaiting("approve", squares, 2), 0);
  assert.equal(nextWaiting("approve", [{ picture: "" }]), -1);
});

test("the counts are of squares fresh at each stage", () => {
  const clip = clipOf("seed-1");
  const kept = { ...clip, approved: true };
  const counts = stageCounts([
    { picture: "seed-1", reviewed: true, clip: kept, cut: { seed: 5, updatedAt: 1, from: clipTake(kept) } },
    { picture: "seed-2", reviewed: true, clip },
    { picture: "seed-1", clip },
    { picture: "" },
  ]);
  assert.deepEqual(counts, { picture: 3, review: 2, clip: 2, approve: 1, cut: 1 });
});

test("a picture's take changes with its seed, its recipe, or a new upload of one's own", () => {
  assert.notEqual(pictureTake(1, 10), pictureTake(2, 10));
  assert.equal(pictureTake(1, 10), pictureTake(1, 99));
  assert.notEqual(pictureTake(1, 10, "red dress"), pictureTake(1, 10, "blue dress"));
  assert.notEqual(pictureTake(-1, 10), pictureTake(-1, 11));
});
