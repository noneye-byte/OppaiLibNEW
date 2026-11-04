// The reference squares: pictures of her that every other square is drawn to match.
//
// A set is sixty-odd separate runs of the same prompt, and a checkpoint left to itself
// draws each one as a new reading of the words — a rounder face here, a longer jacket
// there, a different build at Peak than at Calm. A reference is a square from the board,
// drawn with the loadout, model and LoRAs as they are, that every other square is drawn
// from.
//
// The first version sent one dressed reference through ControlNet's reference
// preprocessor and nothing else, eased off as the levels undressed her so its clothes
// would not come back. That was too light a hold: from fresh noise every time, and at
// a third of its strength by Peak, her face and build had wandered off by the end of
// the set. So there are now three holds, each of which matters on its own:
//
//   - Two references. A dressed one for Calm to Flirty, and an undressed one — drawn
//     from the dressed one — for Heated and Peak. Each level is matched to a picture
//     of her in roughly what she has on, so neither has to be eased.
//   - Each square starts from its reference picture (image to image), moved only as
//     far as the denoise lets it: far enough for a face and a pose, not for a new
//     jawline.
//   - Each square is drawn from the dressed reference's seed, so the noise under all of
//     them is the same noise.

export type ReferenceKind = "dressed" | "bare";

/** The heat tiers at and above which a square wants the undressed reference. */
export const BARE_FROM_HEAT = 3;

export function referenceKindFor(heat: number): ReferenceKind {
  return heat >= BARE_FROM_HEAT ? "bare" : "dressed";
}

/** How much of a dressed reference an undressed square keeps when there is no
    undressed reference yet: it copies clothes, so it is eased off, Calm to Peak. */
export const CROSS_LEVEL_SCALE: readonly number[] = [1, 1, 0.85, 0.65, 0.5];

export interface ReferencePlan {
  /** Which reference the square is matched to. */
  kind: ReferenceKind;
  /** The ControlNet weight. */
  weight: number;
  /** Whether the square starts from the reference's picture. Never across kinds: a
      nude square started from a dressed picture keeps the dress. */
  start: boolean;
}

/**
 * What one square is drawn with: which reference, how hard, and whether it starts from
 * it. Null when there is nothing to match — no reference, or this square is the only
 * one there is.
 *
 * `self` is the kind of reference this square itself is, if it is one; a reference is
 * never matched to itself, but the undressed one is drawn from the dressed one.
 */
export function referencePlan(
  heat: number,
  has: { dressed: boolean; bare: boolean },
  strength: number,
  startFrom: boolean,
  self?: ReferenceKind,
): ReferencePlan | null {
  const want = referenceKindFor(heat);
  const full = clamp01(strength);
  if (want === "bare" && has.bare && self !== "bare") return { kind: "bare", weight: round2(full), start: startFrom };
  if (want === "dressed" && has.dressed && self !== "dressed") return { kind: "dressed", weight: round2(full), start: startFrom };
  // Across kinds: an undressed square with only the dressed reference, or the
  // undressed reference itself being drawn.
  if (want === "bare" && has.dressed && self !== "dressed") {
    const at = Math.max(0, Math.min(CROSS_LEVEL_SCALE.length - 1, Math.round(heat)));
    return { kind: "dressed", weight: round2(full * CROSS_LEVEL_SCALE[at]), start: false };
  }
  return null;
}

/** The strength a new board starts with. */
export const DEFAULT_REFERENCE_STRENGTH = 0.8;
/** How far a square may move from the picture it starts from. Enough to change her
    face and her arms; not enough to give her a new one of either. */
export const DEFAULT_REFERENCE_DENOISE = 0.6;

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
