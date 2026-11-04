// The reference square: one picture of her that every other square is drawn to match.
//
// A set is sixty-odd separate runs of the same prompt, and a checkpoint left to itself
// draws each one as a new reading of the words — a rounder face here, a longer jacket
// there, a different build at Peak than at Calm. The reference is a square from the
// board, drawn with the loadout, model and LoRAs as they are, that rides along with every
// other square through ControlNet's reference preprocessor, so each run starts from what
// she looked like rather than from the words alone.
//
// It copies everything it sees, clothes included, which is right while she is dressed
// and wrong once a level has taken them off: a dressed reference pulls a nude square
// back into its top. So it is eased off as the levels undress her, and the face and
// build are what is left of it at the top.

/** How much of the reference each heat tier keeps, Calm to Peak. */
export const REFERENCE_LEVEL_SCALE: readonly number[] = [1, 1, 0.85, 0.65, 0.5];

/** The strength a square is drawn with, from the user's strength and the square's heat. */
export function referenceWeight(strength: number, heat: number): number {
  const at = Math.max(0, Math.min(REFERENCE_LEVEL_SCALE.length - 1, Math.round(heat)));
  const clamped = Math.max(0, Math.min(1, Number.isFinite(strength) ? strength : 0));
  return Math.round(clamped * REFERENCE_LEVEL_SCALE[at] * 100) / 100;
}

/** The strength a new board starts with: enough to hold a face, not so much it copies the pose. */
export const DEFAULT_REFERENCE_STRENGTH = 0.6;
