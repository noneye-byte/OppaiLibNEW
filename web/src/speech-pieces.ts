// How a line is cut up to be spoken.
//
// The server synthesises a whole line before it sends any of it, so the wait before she
// starts talking is the time to read the entire bubble. For a short text that is
// nothing; for a paragraph it is a pause long enough to notice. So a long line goes to
// the server as its sentences, the first on its own, and each is fetched while the one
// before it plays. A short line is left whole: every cut is a seam in the delivery, and
// the voice carries a sentence into the next better than two requests do.

/** Lines up to this long are spoken whole. */
export const SPEAK_WHOLE = 160;

/** Later pieces gather sentences up to about this long. */
const PIECE_TARGET = 220;

/** Splits a line into the pieces it is fetched and played as, in order. */
export function speechPieces(text: string): string[] {
  const clean = text.trim();
  if (clean.length <= SPEAK_WHOLE) return clean ? [clean] : [];
  const sentences = clean.match(/[^.!?…\n]+(?:[.!?…]+["”')]*|\n|$)/g)?.map((s) => s.trim()).filter(Boolean) ?? [clean];
  // The first piece is one sentence, so the first sound comes as soon as it can.
  const [first, ...rest] = sentences;
  const pieces = [first];
  let current = "";
  for (const sentence of rest) {
    if (current && current.length + sentence.length + 1 > PIECE_TARGET) {
      pieces.push(current);
      current = "";
    }
    current = current ? `${current} ${sentence}` : sentence;
  }
  if (current) pieces.push(current);
  return pieces;
}
