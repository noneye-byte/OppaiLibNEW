import { test } from "node:test";
import assert from "node:assert/strict";

import { CutoutSession, type RawPixels } from "./cutout.ts";

/** Builds an RGBA buffer from a character grid, so the fixtures read as pictures.
 *  '.' is green backdrop, 'w' white backdrop, 'd' dark hair, 'h' skin. */
function picture(rows: string[]): RawPixels {
  const height = rows.length;
  const width = rows[0].length;
  const data = new Uint8ClampedArray(width * height * 4);
  const colors: Record<string, [number, number, number]> = {
    ".": [0, 200, 0], //  a green screen
    "#": [200, 30, 40], // the subject
    o: [10, 10, 220], //  something else entirely
    w: [255, 255, 255],
    d: [25, 20, 30],
    h: [210, 160, 140],
  };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = colors[rows[y][x]];
      const at = (y * width + x) * 4;
      data[at] = r;
      data[at + 1] = g;
      data[at + 2] = b;
      data[at + 3] = 255;
    }
  }
  return { data, width, height };
}

/** Alpha at (x, y) of a composed result. */
function alphaAt(px: RawPixels, x: number, y: number): number {
  return px.data[(y * px.width + x) * 4 + 3];
}

const hard = { feather: 0, spill: 0 };

// A subject with backdrop visible in the middle, disconnected from the border.
const withHole = [
  "..........",
  "..######..",
  "..#....#..",
  "..#....#..",
  "..######..",
  "..........",
];
const skinReflection = [
  "wwwwwwwwww",
  "wwhhhhhhww",
  "wwhwwwwhww",
  "wwhwwwwhww",
  "wwhhhhhhww",
  "wwwwwwwwww",
];
const hairGap = [
  "wwwwwwwwww",
  "wwddddddww",
  "wwdwwwwdww",
  "wwdwwwwdww",
  "wwddddddww",
  "wwwwwwwwww",
];

test("the automatic pass removes the border backdrop and stops at the subject", () => {
  const s = new CutoutSession(picture(withHole));
  s.autoRemove(30);
  const px = s.composePixels(hard);

  assert.equal(alphaAt(px, 0, 0), 0, "a corner is backdrop");
  assert.equal(alphaAt(px, 5, 0), 0, "the top edge is backdrop");
  assert.equal(alphaAt(px, 2, 1), 255, "the subject's outline survives");
});

test("the automatic pass clears backdrop trapped inside a strongly contrasting subject", () => {
  const s = new CutoutSession(picture(withHole));
  s.autoRemove(30);
  assert.equal(alphaAt(s.composePixels(hard), 4, 2), 0);
});

test("the guarded gap pass preserves white reflections surrounded by skin", () => {
  const s = new CutoutSession(picture(skinReflection));
  s.autoRemove(30);
  assert.equal(alphaAt(s.composePixels(hard), 4, 2), 255, "a skin reflection remains visible");
});

test("the guarded gap pass clears white showing through dark hair", () => {
  const s = new CutoutSession(picture(hairGap));
  s.autoRemove(30);
  assert.equal(alphaAt(s.composePixels(hard), 4, 2), 0, "the hair gap becomes transparent");
});

test("contiguous removal leaves matching pixels elsewhere alone", () => {
  // Two separate patches of the same colour. Contiguous must take one.
  const s = new CutoutSession(
    picture([
      "##########",
      "##oo##oo##",
      "##oo##oo##",
      "##########",
    ]),
  );
  s.removeAt(2, 1, { tolerance: 30, contiguous: true });
  const px = s.composePixels(hard);
  assert.equal(alphaAt(px, 2, 1), 0, "the clicked patch is gone");
  assert.equal(alphaAt(px, 6, 1), 255, "the other patch of the same colour stays");
});

test("global removal takes every matching pixel, connected or not", () => {
  const s = new CutoutSession(
    picture([
      "##########",
      "##oo##oo##",
      "##oo##oo##",
      "##########",
    ]),
  );
  s.removeAt(2, 1, { tolerance: 30, contiguous: false });
  const px = s.composePixels(hard);
  assert.equal(alphaAt(px, 2, 1), 0);
  assert.equal(alphaAt(px, 6, 1), 0, "the disconnected patch goes too");
  assert.equal(alphaAt(px, 0, 0), 255, "a different colour is untouched");
});

test("tolerance decides what counts as the same colour", () => {
  const s = new CutoutSession(picture(withHole));
  // The subject is far from the backdrop in RGB, so a tight tolerance takes only the
  // backdrop and a huge one takes everything. Both directions matter: the first is the
  // tool working, the second is the user's warning that they went too far.
  s.autoRemove(30);
  const tight = s.cutFraction;
  s.autoRemove(400);
  assert.ok(s.cutFraction > tight, "a wide tolerance removes more");
  assert.equal(alphaAt(s.composePixels(hard), 3, 2), 0, "at 400 it takes the subject too");
});

test("the erase brush cuts and the restore brush puts it back", () => {
  const s = new CutoutSession(picture(withHole));
  s.autoRemove(30);
  s.beginStroke();
  s.paint(3, 1, 2, "subtract");
  assert.equal(alphaAt(s.composePixels(hard), 3, 1), 0, "erase cuts the subject");

  s.beginStroke();
  s.paint(3, 1, 2, "add");
  assert.equal(alphaAt(s.composePixels(hard), 3, 1), 255, "restore brings it back");
});

test("the restore brush can undo the automatic pass locally", () => {
  const s = new CutoutSession(picture(withHole));
  s.autoRemove(30);
  assert.equal(alphaAt(s.composePixels(hard), 0, 0), 0);
  s.beginStroke();
  s.paint(0, 0, 3, "add");
  assert.equal(alphaAt(s.composePixels(hard), 0, 0), 255, "background can be painted back in");
});

test("a brush stroke is one undo step, not one per pointer move", () => {
  const s = new CutoutSession(picture(withHole));
  s.autoRemove(30);
  s.beginStroke();
  // A drag: many paint calls, one checkpoint.
  for (let x = 2; x < 8; x++) s.paint(x, 2, 2, "subtract");
  assert.ok(s.canUndo);
  s.undo();
  // The whole stroke is gone, and we are back at the automatic result rather than
  // partway through the drag.
  assert.equal(alphaAt(s.composePixels(hard), 5, 1), 255);
  assert.equal(alphaAt(s.composePixels(hard), 0, 0), 0, "the automatic pass survives the undo");
});

test("undo and redo walk the same history", () => {
  const s = new CutoutSession(picture(skinReflection));
  assert.equal(s.canUndo, false, "nothing to undo before the first edit");
  s.autoRemove(30);
  const afterAuto = s.cutFraction;
  s.removeAt(4, 2, { tolerance: 30, contiguous: true });
  const afterClick = s.cutFraction;
  assert.ok(afterClick > afterAuto);

  assert.equal(s.undo(), true);
  assert.equal(s.cutFraction, afterAuto);
  assert.equal(s.canRedo, true);
  assert.equal(s.redo(), true);
  assert.equal(s.cutFraction, afterClick);
});

test("a new edit discards the redo branch", () => {
  const s = new CutoutSession(picture(withHole));
  s.autoRemove(30);
  s.removeAt(4, 2, { tolerance: 30, contiguous: true });
  s.undo();
  assert.equal(s.canRedo, true);
  s.beginStroke();
  s.paint(3, 1, 1, "subtract");
  assert.equal(s.canRedo, false, "branching redo is not something a cutout tool should offer");
});

test("reset restores every pixel and is itself undoable", () => {
  const s = new CutoutSession(picture(withHole));
  s.autoRemove(30);
  s.reset();
  assert.equal(s.cutFraction, 0);
  s.undo();
  assert.ok(s.cutFraction > 0, "an accidental reset must be recoverable");
});

test("feathering ramps the kept edge without making cut pixels visible", () => {
  const s = new CutoutSession(picture(withHole));
  s.autoRemove(30);
  const px = s.composePixels({ feather: 3, spill: 0 });

  // A cut pixel stays fully transparent. A blur of the mask would give it partial
  // alpha, which puts back exactly the backdrop-coloured halo feathering exists to
  // remove — this is the property worth pinning down.
  assert.equal(alphaAt(px, 0, 0), 0, "cut pixels must never become partly opaque");
  // The subject's outline touches the cut, so it is ramped rather than fully opaque.
  const rim = alphaAt(px, 2, 1);
  assert.ok(rim > 0 && rim < 255, `edge alpha ${rim} should be part-way`);
});

test("feather 0 is a hard edge", () => {
  const s = new CutoutSession(picture(withHole));
  s.autoRemove(30);
  const px = s.composePixels({ feather: 0, spill: 0 });
  assert.equal(alphaAt(px, 2, 1), 255);
  assert.equal(alphaAt(px, 0, 0), 0);
});

test("spill suppression pulls the backdrop's colour out of the soft rim", () => {
  // A solid block, wide enough that some pixels are genuinely far from any edge —
  // the fixtures above are too thin for "deep inside the subject" to exist.
  const solid = [
    "............",
    "............",
    "..########..",
    "..########..",
    "..########..",
    "..########..",
    "..########..",
    "..########..",
    "............",
    "............",
  ];
  const s = new CutoutSession(picture(solid));
  s.autoRemove(30);
  const w = 12;
  const plain = s.composePixels({ feather: 3, spill: 0 });
  const corrected = s.composePixels({ feather: 3, spill: 1 });

  // A rim pixel: on the subject's outline, so feathering made it partly transparent
  // and it is the kind of pixel that really is part backdrop.
  const rim = (2 + 2 * w) * 4;
  assert.ok(alphaAt(plain, 2, 2) < 255, "the fixture's rim pixel should be feathered");
  // The backdrop here is green, so suppression must reduce green on that pixel.
  assert.ok(
    corrected.data[rim + 1] < plain.data[rim + 1],
    `green ${corrected.data[rim + 1]} should be below ${plain.data[rim + 1]}`,
  );

  // And it must not touch a fully opaque pixel deep inside the subject — nothing bled
  // into those, so "correcting" them would just be damage.
  const inside = (5 + 5 * w) * 4;
  assert.equal(alphaAt(plain, 5, 5), 255, "the fixture's inner pixel should be fully opaque");
  assert.equal(corrected.data[inside + 1], plain.data[inside + 1]);
  assert.equal(corrected.data[inside], plain.data[inside]);
});

test("the source is never modified, so the before view is the real original", () => {
  const source = picture(withHole);
  const before = new Uint8ClampedArray(source.data);
  const s = new CutoutSession(source);
  s.autoRemove(30);
  s.beginStroke();
  s.paint(4, 2, 3, "subtract");
  s.composePixels({ feather: 4, spill: 1 });

  const original = s.composePixels(hard, true);
  assert.deepEqual([...original.data], [...before], "the 'before' must be the untouched image");
  assert.deepEqual([...source.data], [...before], "the caller's buffer must be left alone");
});

test("cutFraction reports how much was removed", () => {
  const s = new CutoutSession(picture(withHole));
  assert.equal(s.cutFraction, 0);
  s.autoRemove(30);
  // The outer frame plus the strongly-contrasted enclosed backdrop hole.
  assert.ok(s.cutFraction > 0.7 && s.cutFraction < 0.8, `got ${s.cutFraction}`);
});

test("a click outside the image is clamped rather than throwing", () => {
  const s = new CutoutSession(picture(withHole));
  // Pointer coordinates are scaled from a displayed box, so rounding can put them one
  // pixel outside. That must not be a crash mid-edit.
  assert.doesNotThrow(() => s.removeAt(-5, -5, { tolerance: 30, contiguous: true }));
  assert.doesNotThrow(() => s.removeAt(9999, 9999, { tolerance: 30, contiguous: true }));
  assert.doesNotThrow(() => s.paint(-20, -20, 10, "subtract"));
  assert.doesNotThrow(() => s.paint(9999, 9999, 10, "add"));
});
