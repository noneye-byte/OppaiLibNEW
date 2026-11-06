/**
 * The line under Home's Libby Suggested row, which says what she went on.
 *
 * Her reasons are tags, and tags can be as explicit as the library is, so the safe
 * screen gets a line that names none of them: a tile can be veiled, a sentence can't.
 */
export function suggestionLine(because: readonly string[], safe: boolean): string {
  if (safe || !because.length) return "From what you keep coming back to";
  const list = because.length > 1
    ? `${because.slice(0, -1).join(", ")} and ${because[because.length - 1]}`
    : because[0];
  return `Going by ${list}`;
}
