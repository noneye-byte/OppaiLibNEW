/**
 * The studio board's index arithmetic, and the numeric clamps around its inputs.
 *
 * Extracted from imagegen.ts — seven thousand lines with no test file — because this is
 * where a wrong answer is expensive and invisible: a square index that decodes to the
 * wrong address puts a rendered expression in another expression's cell, and the sheet
 * looks plausible either way. The arithmetic is a bijection between an integer and a
 * (tier, face | activity) address, which is exactly the kind of thing to check by
 * round-tripping every value rather than by looking at it.
 *
 * The board's *contents* — which expressions, which activities — stay in imagegen.ts,
 * where they are written. Only the shape comes here, as a SquareLayout, so this module
 * knows how many of each there are without knowing what any of them is.
 */

/** How big the board is: the expression block is faces × tiers, and the activities
 *  follow as one square each. */
export interface SquareLayout {
  faces: number;
  tiers: number;
  /** One id per activity square, in board order. */
  miscIds: string[];
}

/** Where a square sits: a tier and an expression, or an activity ("" for an expression
 *  square). */
export interface SquareAddress {
  tier: number;
  face: number;
  misc: string;
}

export function expressionSquares(layout: SquareLayout): number {
  return layout.faces * layout.tiers;
}

export function totalSquares(layout: SquareLayout): number {
  return expressionSquares(layout) + layout.miscIds.length;
}

/**
 * Decodes a square index into its address.
 *
 * Face-major within a tier, which is the order the wardrobe editor lays them out in.
 * Out-of-range indexes clamp to the last square of their block rather than throwing:
 * the callers are a batch runner and a keyboard walk, and a clamped square is a better
 * answer than a crash mid-sheet.
 */
export function squareAddress(index: number, layout: SquareLayout): SquareAddress {
  const expressions = expressionSquares(layout);
  if (index >= expressions) {
    const offset = Math.min(index - expressions, layout.miscIds.length - 1);
    return { tier: 0, face: 0, misc: layout.miscIds[Math.max(0, offset)] ?? "" };
  }
  const clamped = Math.max(0, Math.min(index, expressions - 1));
  return { tier: Math.floor(clamped / layout.faces), face: clamped % layout.faces, misc: "" };
}

/** The inverse: where a (tier, face | misc) square sits in the index space. */
export function squareIndex(tier: number, face: number, misc: string, layout: SquareLayout): number {
  const miscIndex = misc ? layout.miscIds.indexOf(misc) : -1;
  if (miscIndex >= 0) return expressionSquares(layout) + miscIndex;
  return face + tier * layout.faces;
}

/** The key one square is matched by: its slot, not its filename. A filename carries the
 *  theme text, so renaming the outfit used to orphan every square on the board. */
export function slotKeyOf(slot: { emotion: string; tier: number }): string {
  return `${slot.emotion}:${slot.tier}`;
}

/**
 * Clamp a numeric input's string value to an integer range, falling back to a default.
 *
 * An empty field is the default, not zero. `Number("")` is 0 — finite, and so clamped
 * to the low bound — which meant clearing the steps box to type a new number snapped it
 * to the minimum first, against what this function says it does. Whitespace counts as
 * empty for the same reason.
 */
export function clampNum(v: string, lo: number, hi: number, def: number): number {
  if (v.trim() === "") return def;
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.min(hi, Math.max(lo, Math.round(n)));
}

/** Like clampNum but keeps fractional values (CFG scale moves in halves). */
export function clampFloat(v: string, lo: number, hi: number, def: number): number {
  if (v.trim() === "") return def;
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.min(hi, Math.max(lo, n));
}
