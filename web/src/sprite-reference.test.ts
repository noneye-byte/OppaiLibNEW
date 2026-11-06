import { test } from "node:test";
import assert from "node:assert/strict";

const { headBox, referencePlan, referenceKindFor } = await import("./sprite-reference.ts");

const both = { dressed: true, bare: true };
const strength = { face: 0.8, build: 0.5 };

test("Calm to Flirty read the dressed reference's build, Heated and Peak the undressed one's", () => {
  assert.deepEqual([0, 1, 2, 3, 4].map(referenceKindFor), ["dressed", "dressed", "dressed", "bare", "bare"]);
  assert.equal(referencePlan(0, both, strength)!.build, "dressed");
  assert.equal(referencePlan(2, both, strength)!.build, "dressed");
  assert.equal(referencePlan(3, both, strength)!.build, "bare");
  assert.equal(referencePlan(4, both, strength)!.build, "bare");
});

test("the whole set takes one face, from the dressed reference", () => {
  for (const heat of [0, 1, 2, 3, 4]) assert.equal(referencePlan(heat, both, strength)!.face, "dressed");
});

test("her face is held just as hard at Peak as at Calm", () => {
  assert.equal(referencePlan(0, both, strength)!.faceWeight, 0.8);
  assert.equal(referencePlan(4, both, strength)!.faceWeight, 0.8);
  assert.equal(referencePlan(4, { dressed: true, bare: false }, strength)!.faceWeight, 0.8);
});

test("the build hold lets go where the clothes are furthest from either reference", () => {
  const weights = [0, 1, 2, 3, 4].map((heat) => referencePlan(heat, both, strength)!.buildWeight);
  assert.deepEqual(weights, [0.5, 0.43, 0.35, 0.43, 0.5]);
});

test("an undressed square with only the dressed reference is eased further", () => {
  assert.deepEqual(referencePlan(4, { dressed: true, bare: false }, strength),
    { build: "dressed", buildWeight: 0.25, face: "dressed", faceWeight: 0.8 });
  assert.equal(referencePlan(3, { dressed: true, bare: false }, strength)!.buildWeight, 0.33);
});

test("the undressed reference is drawn from the dressed one; neither is matched to itself", () => {
  assert.deepEqual(referencePlan(4, both, strength, "bare"),
    { build: "dressed", buildWeight: 0.25, face: "dressed", faceWeight: 0.8 });
  assert.equal(referencePlan(0, both, strength, "dressed"), null);
});

test("an undressed reference with no dressed one holds its own levels' face as well", () => {
  assert.equal(referencePlan(4, { dressed: false, bare: true }, strength)!.face, "bare");
});

test("nothing to match is no plan", () => {
  assert.equal(referencePlan(0, { dressed: false, bare: false }, strength), null);
  // An undressed reference alone does not reach down to the dressed levels.
  assert.equal(referencePlan(1, { dressed: false, bare: true }, strength), null);
});

// A 100×130 picture with a figure in the rectangle given.
const figure = (left: number, top: number, right: number, bottom: number) =>
  (x: number, y: number) => x >= left && x < right && y >= top && y < bottom;

test("the head box starts at the top of the figure and is shaped like the square being drawn", () => {
  const box = headBox(figure(30, 10, 70, 130), 100, 130, "three-quarter", 100 / 130);
  assert.equal(box.height, 47);
  assert.equal(box.width, 36);
  assert.equal(box.y, 7);
  assert.equal(box.x, 32);
});

test("hair blown out low on one side does not pull the box off her face", () => {
  const isFigure = (x: number, y: number) =>
    (x >= 40 && x < 60 && y >= 10) || (x >= 0 && x < 40 && y >= 30 && y < 60);
  const box = headBox(isFigure, 100, 130, "three-quarter", 100 / 130);
  assert.ok(box.x <= 40 && box.x + box.width >= 60, `box runs ${box.x} to ${box.x + box.width}`);
});

test("a speck on the backdrop is not the top of her head", () => {
  const isFigure = (x: number, y: number) => (x === 3 && y === 2) || figure(30, 20, 70, 130)(x, y);
  assert.equal(headBox(isFigure, 1000 / 10, 130, "three-quarter", 1).y, 20 - 3);
});

test("the box never leaves the picture, whatever the framing or the figure", () => {
  for (const shot of ["extreme-closeup", "closeup", "head-shoulders", "bust", "waist-up", "three-quarter", "full-body"] as const) {
    for (const isFigure of [figure(0, 0, 100, 130), figure(90, 120, 100, 130), () => false]) {
      const box = headBox(isFigure, 100, 130, shot, 16 / 9);
      assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= 100 && box.y + box.height <= 130, JSON.stringify({ shot, box }));
    }
  }
});
