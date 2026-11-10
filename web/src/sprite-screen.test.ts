import { test } from "node:test";
import assert from "node:assert/strict";

const { SCREEN_COLOURS, drawnColour, onScreen, screenPrompt } = await import("./sprite-screen.ts");

const W = 24, H = 8;
const hair = [200, 90, 20];
const outline = [40, 20, 15];

/** A cutout: transparent left of x = 6, her from there on. Column 6 is the edge given,
    column 7 the next one in, the rest her hair. */
function cutout(edge: number[], next: number[] = hair): Uint8ClampedArray {
  const px = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const c = x < 6 ? [255, 255, 255] : x === 6 ? edge : x === 7 ? next : hair;
      px.set([...c, x < 6 ? 0 : 255], i);
    }
  }
  return px;
}
const at = (px: Uint8ClampedArray, x: number, y = 4) => [...px.slice((y * W + x) * 4, (y * W + x) * 4 + 4)];

test("a cutout goes onto the screen, opaque, with the screen where she was cut away", () => {
  const px = cutout(hair);
  assert.equal(onScreen(px, W, H, drawnColour("white"), SCREEN_COLOURS.green), true);
  assert.deepEqual(at(px, 2), [...SCREEN_COLOURS.green, 255]);
  assert.deepEqual(at(px, 12), [...hair, 255]);
});

test("the white her rim was drawn against comes off it before she goes on the screen", () => {
  // Half hair, half the white backdrop: on a screen, a pale fringe round her.
  const px = cutout([228, 173, 138]);
  onScreen(px, W, H, drawnColour("white"), SCREEN_COLOURS.green);
  assert.deepEqual(at(px, 6), [...hair, 255]);
});

test("her dark outline is no mix of her and the backdrop, and stays", () => {
  const px = cutout(outline);
  onScreen(px, W, H, drawnColour("white"), SCREEN_COLOURS.green);
  assert.deepEqual(at(px, 6), [...outline, 255]);
});

test("a partly see-through rim pixel takes her colour, then the screen through it", () => {
  const px = cutout([228, 173, 138]);
  for (let y = 0; y < H; y++) px[(y * W + 6) * 4 + 3] = 128;
  onScreen(px, W, H, drawnColour("white"), SCREEN_COLOURS.green);
  const g = SCREEN_COLOURS.green;
  const k = 128 / 255;
  assert.deepEqual(at(px, 6), [...hair.map((c, i) => Math.round(c * k + g[i] * (1 - k))), 255]);
});

test("a square that is not cut out is left alone and said to be", () => {
  const px = new Uint8ClampedArray(W * H * 4).fill(255);
  const before = px.slice();
  assert.equal(onScreen(px, W, H, drawnColour("white"), SCREEN_COLOURS.green), false);
  assert.deepEqual(px, before);
});

test("Wan is told the screen once, after the motion", () => {
  assert.equal(screenPrompt("She breathes slowly", "green"), "She breathes slowly. The background is a flat, evenly lit, plain green screen.");
  assert.equal(screenPrompt("She waves.", "blue"), "She waves. The background is a flat, evenly lit, plain blue screen.");
  const once = screenPrompt("She waves.", "green");
  assert.equal(screenPrompt(once, "green"), once);
  assert.equal(screenPrompt("She waves.", "drawn"), "She waves.");
});

test("the screens are what the server's cut reads as screens", () => {
  // screen.go's screenLead: the key channel at least 80 over the larger of the others.
  const lean = (c: readonly number[], ch: number) => c[ch] - Math.max(c[(ch + 1) % 3], c[(ch + 2) % 3]);
  assert.ok(lean(SCREEN_COLOURS.green, 1) >= 80 + 60, "green leaves room for Wan to shade it");
  assert.ok(lean(SCREEN_COLOURS.blue, 2) >= 80 + 60, "blue leaves room for Wan to shade it");
});
