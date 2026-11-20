import { test } from "node:test";
import assert from "node:assert/strict";
import { blendParam, faceTargets, fitModel, mouthOpen, mouthWithoutSound, stepWeights } from "./live2d-face.ts";

const settings = {
  expressions: [{ name: "ku", file: "exp/0.exp3.json" }, { name: "x", file: "exp/1.exp3.json" }, { name: "mz", file: "exp/2.exp3.json" }],
  moods: { sad: ["ku"], loving: ["x"] },
  worn: ["mz"],
};

test("her mood's expressions and the ones she always wears are on, and nothing else", () => {
  const sad = faceTargets("sad", settings);
  assert.deepEqual([...sad.entries()], [["ku", 1], ["x", 0], ["mz", 1]]);
  const neutral = faceTargets("neutral", settings);
  assert.equal(neutral.get("ku"), 0);
  assert.equal(neutral.get("mz"), 1);
});

test("a change of face fades over the fade time whatever the frame rate", () => {
  let w = new Map([["ku", 1], ["x", 0]]);
  const to = faceTargets("loving", settings);
  w = stepWeights(w, to, 0.1, 0.4);
  assert.equal(w.get("ku"), 0.75);
  assert.equal(w.get("x"), 0.25);
  // One long frame does not overshoot.
  w = stepWeights(w, to, 5, 0.4);
  assert.equal(w.get("ku"), 0);
  assert.equal(w.get("x"), 1);
});

test("each blend applies the way Live2D defines it, eased by the weight", () => {
  assert.equal(blendParam(1, { Id: "a", Value: 30, Blend: "Add" }, 0.5), 16);
  assert.equal(blendParam(2, { Id: "a", Value: 3, Blend: "Multiply" }, 1), 6);
  assert.equal(blendParam(2, { Id: "a", Value: 3, Blend: "Multiply" }, 0), 2);
  assert.equal(blendParam(0, { Id: "a", Value: 1, Blend: "Overwrite" }, 0.25), 0.25);
  // An expression with no blend written is an Add, as in Cubism's own loader.
  assert.equal(blendParam(0, { Id: "a", Value: 1 }, 1), 1);
});

test("her mouth opens with the sound and closes after it", () => {
  let m = 0;
  for (let i = 0; i < 10; i++) m = mouthOpen(m, 0.2, 1 / 60);
  assert.ok(m > 0.6, `open: ${m}`);
  for (let i = 0; i < 60; i++) m = mouthOpen(m, 0, 1 / 60);
  assert.ok(m < 0.05, `closed: ${m}`);
  for (let t = 0; t < 3; t += 0.1) {
    const v = mouthWithoutSound(t);
    assert.ok(v >= 0 && v <= 1);
  }
});

test("she stands on the bottom of the frame, contained, then nudged as asked", () => {
  const fit = fitModel({ width: 400, height: 800 }, { width: 2000, height: 2000 }, { scale: 1, x: 0, y: 0 });
  assert.equal(fit.scale, 0.2);
  assert.equal(fit.x, 0);
  assert.equal(fit.y, 400);
  const nudged = fitModel({ width: 400, height: 800 }, { width: 2000, height: 2000 }, { scale: 2, x: 0.1, y: 0.25 });
  assert.equal(nudged.scale, 0.4);
  assert.equal(nudged.x, -200 + 40);
  assert.equal(nudged.y, 0 + 200);
});
