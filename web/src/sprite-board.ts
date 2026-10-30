// The sprite board's filters and keyboard moves.
//
// Sixty squares is too many to scan for the three that still need a cutout look. A
// filter dims everything that is not what you are hunting for — it dims rather than
// hides, because the matrix's shape is how you know which square is which, and a
// matrix with holes punched in it stops being one.

/** Where one square is in its life: nothing yet, made and waiting for its cutout
    review, reviewed and filed, or made from a recipe that has since changed. */
export type SquareState = "none" | "needs" | "ready" | "stale";

export type BoardFilter = "all" | "missing" | "review" | "stale";

export const BOARD_FILTERS: readonly { id: BoardFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "missing", label: "Missing" },
  { id: "review", label: "To review" },
  { id: "stale", label: "Stale" },
];

/** Whether a square in this state is one the filter is looking for. */
export function matchesFilter(filter: BoardFilter, state: SquareState): boolean {
  switch (filter) {
    case "all": return true;
    case "missing": return state === "none";
    case "review": return state === "needs";
    case "stale": return state === "stale";
  }
}

/** How many squares each filter would light up. */
export function filterCounts(states: readonly SquareState[]): Record<BoardFilter, number> {
  const counts: Record<BoardFilter, number> = { all: states.length, missing: 0, review: 0, stale: 0 };
  for (const s of states) {
    for (const f of ["missing", "review", "stale"] as const) if (matchesFilter(f, s)) counts[f]++;
  }
  return counts;
}

export type BoardKey = "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown";

/**
 * One square along the expression matrix: left and right through the expressions, up
 * and down through the heat tiers. Left from the first expression goes to the last of
 * the tier above, as reading order would — the batch walks the board that way too —
 * and the corners stop rather than wrap to the far side of the sheet.
 */
export function moveOnMatrix(face: number, tier: number, key: BoardKey, faces: number, tiers: number): { face: number; tier: number } {
  const clampTier = (t: number) => Math.min(tiers - 1, Math.max(0, t));
  switch (key) {
    case "ArrowUp": return { face, tier: clampTier(tier - 1) };
    case "ArrowDown": return { face, tier: clampTier(tier + 1) };
    case "ArrowLeft":
      if (face > 0) return { face: face - 1, tier };
      return tier > 0 ? { face: faces - 1, tier: tier - 1 } : { face, tier };
    case "ArrowRight":
      if (face < faces - 1) return { face: face + 1, tier };
      return tier < tiers - 1 ? { face: 0, tier: tier + 1 } : { face, tier };
  }
}

/** The next square the flip-through shows: the next one along that has a picture,
    round to the start again, or -1 when none has. */
export function nextFilled(filled: readonly boolean[], from: number): number {
  for (let step = 1; step <= filled.length; step++) {
    const i = (from + step) % filled.length;
    if (filled[i]) return i;
  }
  return -1;
}

/**
 * A line for the "in chat" preview to put in her speech box, one per expression, so a
 * square is judged the way it will be seen — beside words that mean the same thing.
 * An expression that reads wrong next to its own line is the one to redo.
 */
export const SAMPLE_LINES: Readonly<Record<string, string>> = {
  neutral: "Okay. What are we looking at today?",
  happy: "That's honestly the best thing I've heard all day.",
  mischievous: "I have an idea, and you're not going to like it. Probably.",
  surprised: "Wait — you did what?",
  thinking: "Hmm. Give me a second with that one.",
  shy: "You don't have to keep looking at me like that…",
  smug: "Told you so. I always tell you so.",
  sad: "Oh. I thought you'd stay a bit longer.",
  annoyed: "Really? That's the third time.",
  sleepy: "Mm… five more minutes. Then I'm all yours.",
  loving: "I'm really glad it's you I get to talk to.",
  excited: "Okay okay okay — show me. Show me right now!",
};

/** The line for a square: its expression's, or one about what she is doing. */
export function sampleLine(emotion: string, label: string): string {
  return SAMPLE_LINES[emotion] ?? `*${label.toLowerCase()}* …don't mind me.`;
}
