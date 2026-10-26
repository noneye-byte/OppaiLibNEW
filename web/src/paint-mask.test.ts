import { test } from "node:test";
import assert from "node:assert/strict";

import { brushPixels, paintedShare, paintsAnything, pictureAt, sourceSize, stampsBetween } from "./paint-mask.ts";

test("a pointer on a picture shown at half size lands on its own pixels", () => {
  const rect = { left: 100, top: 50, width: 256, height: 384 };
  assert.deepEqual(pictureAt(228, 242, rect, 512, 768), { x: 256, y: 384 });
  // Off the edge is the edge, not a stroke outside the picture.
  assert.deepEqual(pictureAt(0, 9999, rect, 512, 768), { x: 0, y: 768 });
});

test("a brush covers the same share of a small picture as of a large one", () => {
  assert.equal(brushPixels(0.05, 512, 768), 26);
  assert.equal(brushPixels(0.05, 2048, 3072), 102);
  assert.equal(brushPixels(0, 512, 512), 2);
});

test("a picture too large to generate at is scaled down with its shape kept", () => {
  assert.deepEqual(sourceSize(832, 1216), { width: 832, height: 1216 });
  assert.deepEqual(sourceSize(3000, 4000), { width: 1536, height: 2048 });
  // Odd sizes come down to multiples of eight, never up past the picture.
  assert.deepEqual(sourceSize(1001, 667), { width: 1000, height: 664 });
  assert.deepEqual(sourceSize(0, 0), { width: 512, height: 512 });
});

test("the painted share counts white pixels and ignores black ones", () => {
  const px = new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255, 0, 0, 0, 255, 200, 200, 200, 255]);
  assert.equal(paintedShare(px), 0.5);
  assert.equal(paintedShare(new Uint8ClampedArray()), 0);
});

test("only the brush paints — an eraser over nothing leaves nothing to repaint", () => {
  assert.equal(paintsAnything([]), false);
  assert.equal(paintsAnything([{ erase: true, size: 10, points: [{ x: 1, y: 1 }] }]), false);
  assert.equal(paintsAnything([{ erase: false, size: 10, points: [{ x: 1, y: 1 }] }]), true);
});

test("a fast drag is filled in at a third of the brush so it draws a line", () => {
  const stamps = stampsBetween({ x: 0, y: 0 }, { x: 30, y: 0 }, 30);
  assert.equal(stamps.length, 3);
  assert.deepEqual(stamps.at(-1), { x: 30, y: 0 });
  assert.equal(stampsBetween({ x: 5, y: 5 }, { x: 5, y: 5 }, 30).length, 1);
});
