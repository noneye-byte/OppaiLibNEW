/**
 * A card character's face, from its expression pack.
 *
 * SillyTavern's Character Expressions extension shows one picture per reply, named by
 * the expression the reply wears: joy.png, anger.png, and joy-1.png for a second joy.
 * The server keeps the pack and reads the label off each reply (chat_expressions.go);
 * this is the client's half — which file to draw for a label, and what to call it.
 */

/** A pack as the server lists it: each label's file names, sorted. */
export type ExpressionFiles = Record<string, string[]>;

/**
 * The files to try for an expression, best first: that label's pictures, then
 * neutral's — SillyTavern's fallback expression — and nothing when the pack has
 * neither, so a character with no art gets no stage rather than a broken picture.
 *
 * A label with several pictures shows one of them per reply, as SillyTavern picks
 * among them. `pick` chooses which — the number of replies so far, so the picture
 * holds still while one reply is on screen and moves on with the next — and the rest
 * follow it as fallbacks.
 */
export function expressionSprites(pack: ExpressionFiles | undefined, label: string, pick = 0): string[] {
  if (!pack) return [];
  const rotate = (files: string[]) => {
    if (!files.length) return [];
    const at = ((pick % files.length) + files.length) % files.length;
    return [...files.slice(at), ...files.slice(0, at)];
  };
  const own = rotate(pack[label.trim().toLowerCase()] ?? []);
  const neutral = label === "neutral" ? [] : rotate(pack.neutral ?? []);
  return [...own, ...neutral];
}

/** An expression label as a person reads it: "realization" → "Realization",
    "deep_thought" → "Deep thought". */
export function expressionTitle(label: string): string {
  const words = label.trim().replace(/_+/g, " ");
  return words ? words[0].toUpperCase() + words.slice(1) : "";
}

/**
 * The labels the editor lays out: SillyTavern's own, then any the pack adds, so a
 * pack's custom expression is shown and can be removed like the rest.
 */
export function expressionSlots(defaults: readonly string[], pack: ExpressionFiles | undefined): string[] {
  const extra = Object.keys(pack ?? {}).filter((label) => !defaults.includes(label)).sort();
  return [...defaults, ...extra];
}

/** How many pictures a pack holds, and how many of the default labels it covers. */
export function packCoverage(defaults: readonly string[], pack: ExpressionFiles | undefined): { files: number; covered: number } {
  const files = Object.values(pack ?? {}).reduce((sum, list) => sum + list.length, 0);
  const covered = defaults.filter((label) => (pack?.[label]?.length ?? 0) > 0).length;
  return { files, covered };
}
