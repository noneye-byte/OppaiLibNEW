import { test } from "node:test";
import assert from "node:assert/strict";

const { findPanels, backgroundOf, shaveFrame, scaleRect, dragRect } = await import("./comic-panels.ts");

type RGB = [number, number, number];

/** A page of one colour, drawn on with framed panels of busy "art". */
function page(w: number, h: number, bg: RGB) {
  const px = new Uint8ClampedArray(w * h * 4);
  const set = (x: number, y: number, [r, g, b]: RGB) => {
    const i = (y * w + x) * 4;
    px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255;
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) set(x, y, bg);
  const panel = (x0: number, y0: number, pw: number, ph: number, frame = 2) => {
    for (let y = y0; y < y0 + ph; y++) {
      for (let x = x0; x < x0 + pw; x++) {
        const edge = x < x0 + frame || x >= x0 + pw - frame || y < y0 + frame || y >= y0 + ph - frame;
        // The art inside is anything but flat, as art is.
        set(x, y, edge ? [0, 0, 0] : [(x * 37) % 200 + 20, (y * 53) % 180 + 30, ((x + y) * 17) % 160 + 40]);
      }
    }
  };
  return { px, panel };
}

test("a page of three framed panels comes apart into the three, in reading order", () => {
  const { px, panel } = page(200, 300, [255, 255, 255]);
  panel(10, 10, 85, 130);
  panel(105, 10, 85, 130);
  panel(10, 150, 180, 140);
  const got = findPanels(px, 200, 300);
  assert.equal(got.length, 3);
  // Each is the panel without its two-pixel frame.
  assert.deepEqual(got[0], { x: 12, y: 12, w: 81, h: 126 });
  assert.deepEqual(got[1], { x: 107, y: 12, w: 81, h: 126 });
  assert.deepEqual(got[2], { x: 12, y: 152, w: 176, h: 136 });
});

test("black gutters are gutters too", () => {
  const { px } = page(200, 200, [0, 0, 0]);
  const art = (x0: number, y0: number, s: number) => {
    for (let y = y0; y < y0 + s; y++) for (let x = x0; x < x0 + s; x++) {
      const i = (y * 200 + x) * 4;
      px[i] = 120 + (x % 50); px[i + 1] = 90 + (y % 60); px[i + 2] = 200;
    }
  };
  art(10, 10, 80);
  art(110, 10, 80);
  assert.deepEqual(backgroundOf(px, 200, 200), [0, 0, 0]);
  assert.equal(findPanels(px, 200, 200).length, 2);
});

test("a page with no gutters is one picture: a cover or a pin-up stays whole", () => {
  const { px, panel } = page(120, 160, [255, 255, 255]);
  panel(0, 0, 120, 160, 0);
  const got = findPanels(px, 120, 160);
  assert.deepEqual(got, [{ x: 0, y: 0, w: 120, h: 160 }]);
});

test("a caption strip and a sliver too small to train on are left out", () => {
  const { px, panel } = page(200, 300, [255, 255, 255]);
  panel(10, 10, 180, 200);
  // A thin strip: under the smallest side kept.
  panel(10, 225, 180, 12);
  // A caption box: big enough, but nearly all background inside its frame.
  for (let y = 250; y < 290; y++) for (let x = 10; x < 190; x++) {
    const edge = y === 250 || y === 289 || x === 10 || x === 189;
    const i = (y * 200 + x) * 4;
    if (edge) { px[i] = 0; px[i + 1] = 0; px[i + 2] = 0; }
  }
  const got = findPanels(px, 200, 300);
  assert.equal(got.length, 1);
  assert.equal(got[0].y, 12);
});

test("a speck in the gutter does not join two panels", () => {
  const { px, panel } = page(200, 300, [255, 255, 255]);
  panel(10, 10, 180, 130);
  panel(10, 150, 180, 140);
  const i = (145 * 200 + 100) * 4;
  px[i] = 0; px[i + 1] = 0; px[i + 2] = 0;
  assert.equal(findPanels(px, 200, 300).length, 2);
});

test("a page read small still has its frames shaved, though their corners blur into the gutter", () => {
  const { px, panel } = page(240, 360, [255, 255, 255]);
  panel(8, 8, 108, 168, 4);
  panel(124, 8, 108, 168, 4);
  panel(8, 184, 224, 168, 4);
  // Halved by averaging each 2×2 block, as a canvas drawing it smaller does: the
  // frame is 2 pixels and the panels start on an odd one, so their corners are grey.
  const w = 120, h = 180, small = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 4; c++) {
    let sum = 0;
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) sum += px[((y * 2 + 1 + dy > 359 ? 359 : y * 2 + 1 + dy) * 240 + Math.min(239, x * 2 + 1 + dx)) * 4 + c];
    small[(y * w + x) * 4 + c] = sum / 4;
  }
  const got = findPanels(small, w, h);
  assert.equal(got.length, 3);
  // The first panel's art starts at 12 at full size, 6 here, with the half-grey
  // line of its frame at 5: the frame, blur and all, is gone from every side.
  const [first] = got;
  assert.ok(first.x >= 5 && first.y >= 5, `frame left on ${JSON.stringify(first)}`);
  assert.ok(first.x + first.w <= 57 && first.y + first.h <= 87, `frame left on ${JSON.stringify(first)}`);
});

test("art that runs to a panel's edge is not shaved as if it were a frame", () => {
  const { px, panel } = page(100, 100, [255, 255, 255]);
  panel(0, 0, 100, 100, 0);
  assert.deepEqual(shaveFrame(px, 100, { x: 0, y: 0, w: 100, h: 100 }), { x: 0, y: 0, w: 100, h: 100 });
});

test("a rectangle found small is put back on the full page, inside it", () => {
  assert.deepEqual(scaleRect({ x: 10, y: 20, w: 50, h: 70 }, 2.5, 1000, 200), { x: 25, y: 50, w: 125, h: 150 });
});

test("a drag becomes a crop either way round, and a click is not one", () => {
  assert.deepEqual(dragRect(300, 400, 100, 50, 1000, 1000), { x: 100, y: 50, w: 200, h: 350 });
  assert.deepEqual(dragRect(-20, -20, 80, 2000, 500, 900), { x: 0, y: 0, w: 80, h: 900 });
  assert.equal(dragRect(10, 10, 20, 400, 500, 500), null);
});
