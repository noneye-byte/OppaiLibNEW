// A sprite square's own wording, and the user's changes to it.
//
// Every expression and MISC state on the Sprites board says what it is three ways: the
// face and the pose as tags, for the checkpoints trained on booru tags, and the same
// thing as one plain sentence for Anima, which reads prose (sprite-prose.ts). The
// studio writes all three; the user can rewrite any of them, per square. Only what was
// changed is kept, on the server (libby_sprite_words.go), so a field left alone follows
// the studio's own words when they improve.
//
// The two versions are one picture said twice, and nothing can turn one into the other,
// so a square whose tags were rewritten while its sentence was not is said to be out of
// step: on Anima it would still be drawn the old way.

export interface SquareWords {
  face: string;
  pose: string;
  prose: string;
}

/** The user's changes, by square id (the wardrobe slot: an emotion or a MISC state). */
export type WordChanges = Record<string, Partial<SquareWords>>;

const FIELDS = ["face", "pose", "prose"] as const;

/** A square's wording: the studio's, with whatever the user rewrote over it. */
export function squareWords(base: SquareWords, change?: Partial<SquareWords>): SquareWords {
  const out = { ...base };
  for (const f of FIELDS) {
    const v = change?.[f]?.trim();
    if (v) out[f] = v;
  }
  return out;
}

/** What an edit changes from the studio's words: the fields that differ, trimmed. A
    blank field, or one put back as it was, is the studio's again. Undefined for none. */
export function wordChange(base: SquareWords, edited: SquareWords): Partial<SquareWords> | undefined {
  const out: Partial<SquareWords> = {};
  for (const f of FIELDS) {
    const v = edited[f].trim();
    if (v && v !== base[f].trim()) out[f] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

/** The set of changes with one square's replaced, or removed when it has none. */
export function withChange(all: WordChanges, id: string, change: Partial<SquareWords> | undefined): WordChanges {
  const next = { ...all };
  if (change) next[id] = change;
  else delete next[id];
  return next;
}

/** Whether a square's tags were rewritten and its sentence was not: Anima would draw it
    as the studio's sentence says, not as the tags now do. */
export function proseBehind(change?: Partial<SquareWords>): boolean {
  return !!change && !!(change.face?.trim() || change.pose?.trim()) && !change.prose?.trim();
}
