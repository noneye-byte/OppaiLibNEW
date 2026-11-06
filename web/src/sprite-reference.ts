// The reference squares: pictures of her that every other square is drawn to match.
//
// A set is sixty-odd separate runs of the same prompt, and a checkpoint left to itself
// draws each one as a new reading of the words — a rounder face here, a different build
// at Peak than at Calm. A reference is a square from the board, drawn with the loadout,
// model and LoRAs as they are, that holds who she is across all of them. It holds *who
// she is* and nothing else: what she is doing and what she has on belong to the square.
//
// That line has been crossed in both directions. The first version sent one dressed
// picture through ControlNet's reference preprocessor, eased off as she undressed, and
// her face and build had wandered by Peak. The second started every square from its
// reference by image to image, under the reference's own seed, and held her too well:
// Flirty came back as Calm in the same stance, the same top with a bra painted over it.
// Starting from a picture keeps its silhouette, and a shared seed with nearly the same
// words keeps its composition, so neither has any place here. Every square is drawn from
// noise of its own, and two things hold her instead:
//
//   - Her face, from a crop of the reference's head (headBox). A crop has no clothes in
//     it to copy and no arms to pose, so it can be held hard all the way to Peak.
//   - Her build, from the whole picture, more lightly and for only the middle of the
//     run (the server's referenceControls). The first steps settle the pose and the last
//     ones draw the clothes, and the reference is kept out of both.
//
// There are two whole pictures, a dressed one for Calm to Flirty and an undressed one
// for Heated and Peak, so each level's build is read from her in roughly what she has
// on. Between them the hold is eased where the clothes differ most (BUILD_LEVEL_SCALE).

import type { ShotSize } from "./camera.js";

export type ReferenceKind = "dressed" | "bare";

/** The heat tiers at and above which a square wants the undressed reference. */
export const BARE_FROM_HEAT = 3;

export function referenceKindFor(heat: number): ReferenceKind {
  return heat >= BARE_FROM_HEAT ? "bare" : "dressed";
}

/** How much of the build hold a level keeps, Calm to Peak. Each reference is at its
    fullest on the level it was drawn for, and eased a step away from it: Flirty's top
    is pulled aside and Heated's is off, and a firm hold on either picture puts it back. */
export const BUILD_LEVEL_SCALE: readonly number[] = [1, 0.85, 0.7, 0.85, 1];

/** The same, for an undressed square with only a dressed reference to read: it copies
    clothes, so it is eased further. Calm to Peak. */
export const CROSS_LEVEL_SCALE: readonly number[] = [1, 1, 0.85, 0.65, 0.5];

export interface ReferencePlan {
  /** Which reference's whole picture holds the build, and how hard. */
  build: ReferenceKind;
  buildWeight: number;
  /** Which reference's head holds the face, and how hard. */
  face: ReferenceKind;
  faceWeight: number;
}

/**
 * What one square is drawn with: which references, how hard. Null when there is nothing
 * to match — no reference, or this square is the only one there is.
 *
 * `self` is the kind of reference this square itself is, if it is one; a reference is
 * never matched to itself, but the undressed one is drawn from the dressed one.
 */
export function referencePlan(
  heat: number,
  has: { dressed: boolean; bare: boolean },
  strength: { face: number; build: number },
  self?: ReferenceKind,
): ReferencePlan | null {
  const want = referenceKindFor(heat);
  let build: ReferenceKind;
  let scale: readonly number[];
  if (want === "bare" && has.bare && self !== "bare") [build, scale] = ["bare", BUILD_LEVEL_SCALE];
  else if (want === "dressed" && has.dressed && self !== "dressed") [build, scale] = ["dressed", BUILD_LEVEL_SCALE];
  // Across kinds: an undressed square with only the dressed reference, or the undressed
  // reference itself being drawn.
  else if (want === "bare" && has.dressed && self !== "dressed") [build, scale] = ["dressed", CROSS_LEVEL_SCALE];
  else return null;
  const at = Math.max(0, Math.min(scale.length - 1, Math.round(heat)));
  return {
    build,
    buildWeight: round2(clamp01(strength.build) * scale[at]),
    // One face for the whole set, so the undressed levels take it from the same picture
    // as the dressed ones rather than from a drawing of it. Never eased: nothing in a
    // crop of her head can bring her clothes back.
    face: has.dressed && self !== "dressed" ? "dressed" : build,
    faceWeight: round2(clamp01(strength.face)),
  };
}

/** How hard a new board holds her face, and her build. */
export const DEFAULT_REFERENCE_STRENGTH = 0.8;
export const DEFAULT_REFERENCE_BUILD = 0.5;

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** How much of the picture's height her head comes to at each framing, with a little
    room around it. A crop tighter than this loses her hairline; a looser one brings in
    her neckline, and with it the clothes the crop exists to leave behind. */
const HEAD_SHARE: Record<ShotSize, number> = {
  "extreme-closeup": 1,
  closeup: 1,
  "head-shoulders": 0.72,
  bust: 0.58,
  "waist-up": 0.46,
  "three-quarter": 0.36,
  "full-body": 0.2,
};

/** The share of a row that has to be her before the row counts as her, so a speck left
    on the backdrop is not taken for the top of her head. */
const HEAD_ROW_SHARE = 0.01;

/**
 * Where her head is in a reference: the box the face hold reads. Shaped like the square
 * being drawn (`aspect`, width over height) because ControlNet crops whatever it is
 * given to that shape, and the sides of a crop of the wrong shape are her face.
 *
 * `isFigure` says whether a pixel is her rather than the backdrop. Sprites are drawn on
 * a flat backdrop and framed by a setting, so her head is at the top of the figure at a
 * known size; centring on the top of it rather than on all of it keeps long hair blown
 * to one side from pulling the box off her face.
 */
export function headBox(
  isFigure: (x: number, y: number) => boolean,
  width: number,
  height: number,
  shot: ShotSize,
  aspect: number,
): Box {
  let boxH = Math.round(height * HEAD_SHARE[shot]);
  let boxW = Math.round(boxH * aspect);
  if (boxW > width) {
    boxW = width;
    boxH = Math.min(height, Math.round(width / aspect));
  }
  const need = Math.max(2, Math.ceil(width * HEAD_ROW_SHARE));
  let top = 0;
  for (let y = 0; y < height; y++) {
    let hits = 0;
    for (let x = 0; x < width && hits < need; x++) if (isFigure(x, y)) hits++;
    if (hits >= need) {
      top = y;
      break;
    }
  }
  let sum = 0;
  let count = 0;
  for (let y = top; y < Math.min(height, top + Math.ceil(boxH / 3)); y++) {
    for (let x = 0; x < width; x++) {
      if (isFigure(x, y)) {
        sum += x;
        count++;
      }
    }
  }
  const middle = count ? sum / count : width / 2;
  // A little air over her hair, which is the first thing a tight crop loses.
  const y = Math.max(0, Math.min(height - boxH, top - Math.round(boxH * 0.06)));
  const x = Math.max(0, Math.min(width - boxW, Math.round(middle - boxW / 2)));
  return { x, y, width: boxW, height: boxH };
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
