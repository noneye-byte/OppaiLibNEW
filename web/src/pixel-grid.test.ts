import { test } from "node:test";
import assert from "node:assert/strict";

const { cellsAcross, gridFor, pixelOfConfig, snapAlpha } = await import("./pixel-grid.ts");

test("a square drawn as pixel art says so in its config, and any other square does not", () => {
  assert.deepEqual(pixelOfConfig(JSON.stringify({ v: 2, background: "white", pixel: 8, palette: 32 })), { size: 8, palette: 32 });
  assert.deepEqual(pixelOfConfig(JSON.stringify({ v: 2, pixel: 8 })), { size: 8, palette: 0 });
  assert.equal(pixelOfConfig(JSON.stringify({ v: 2, background: "white" })), null);
  assert.equal(pixelOfConfig(""), null);
  assert.equal(pixelOfConfig("not json"), null);
});

test("the grid is the cells sd-pixel shrinks to, rounding down as it does", () => {
  assert.deepEqual(gridFor(832, 1216, 8), { cols: 104, rows: 152 });
  // int(832 / 6) = 138: the last cell is a little wider than the rest.
  assert.deepEqual(gridFor(832, 1216, 6), { cols: 138, rows: 202 });
});

test("cells fall where a nearest-neighbour enlargement puts them, at the picture's size or a clip's", () => {
  const at = cellsAcross(832, 104);
  for (let x = 0; x < 832; x++) assert.equal(at[x], Math.floor(x / 8));
  const clip = cellsAcross(480, 104);
  assert.equal(clip[0], 0);
  assert.equal(clip[479], 103);
  for (let x = 1; x < 480; x++) assert.ok(clip[x] - clip[x - 1] === 0 || clip[x] - clip[x - 1] === 1);
});

test("a cell is all her or not at all, by whether half of it was kept", () => {
  // 8×4 in two cells of 4×4: the left one has a feathered edge three columns in.
  const w = 8, h = 4;
  const alpha = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    alpha.set([0, 0, 120, 255, 255, 255, 60, 0], y * w);
  }
  const out = snapAlpha(alpha, w, h, { cols: 2, rows: 1 });
  // Left: (0 + 0 + 120 + 255) / 4 is under half — gone. Right: (255 + 255 + 60 + 0) / 4
  // is over — all there.
  assert.deepEqual([...out.slice(0, 8)], [0, 0, 0, 0, 255, 255, 255, 255]);
});
