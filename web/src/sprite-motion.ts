// Where each wardrobe square is on its way to being an animated sprite.
//
// A square moves in three steps, always in this order: its picture, a clip made from
// the picture (ComfyUI), and that clip with its background cut away (the server's
// matte). Each step is made of the one before, so each remembers which take of the one
// before it was made from. A redone clip makes its cut out of date. A redone picture
// takes its clip and cut with it, in the studio, since animations of a picture she no
// longer has only got in the way; a wardrobe from before that can still hold a clip of
// an older picture, and it reads as out of date here.
//
// The order is also how a whole set is run. Every picture is drawn before any clip is
// made, and every clip before any cut, rather than square by square: a clip borrows
// the graphics card from the image generator, which unloads its checkpoint to make
// room, so interleaving the two would load and unload a checkpoint sixty times. The cut
// runs on the server's CPU and needs the card for nothing, so it goes last, when the
// card's work is done.

/** The three steps, in the order they are made. */
export const MOTION_STEPS = ["picture", "clip", "cut"] as const;
export type MotionStep = (typeof MOTION_STEPS)[number];

/** A stored clip or cut, as the server lists it: what is needed to tell its take. */
export interface StoredMotion {
  seed: number;
  updatedAt: number;
  /** The take of the step before it, as it was when this was made. */
  from?: string;
}

/** One square, as the pipeline sees it: its picture's take ("" when it has none) and
    what it holds of the two later steps. */
export interface SquareMotion {
  picture: string;
  clip?: StoredMotion;
  cut?: StoredMotion;
}

export type StepState = "none" | "ready" | "stale";

/**
 * A picture's take: what its clip remembers it by. The seed tells one generated take
 * from another; a picture of the user's own has no seed, so its upload time does. The
 * recipe is folded in because the same seed under a changed outfit is another picture.
 */
export function pictureTake(seed: number, updatedAt: number, recipe = ""): string {
  const base = seed >= 0 ? `seed-${seed}` : `own-${updatedAt}`;
  return recipe ? `${base}-${shortHash(recipe)}` : base;
}

/** A clip's take, which its cut remembers it by: a redone clip is a new one. */
export function clipTake(clip: StoredMotion): string {
  return `clip-${clip.seed}-${clip.updatedAt}`;
}

/** Where the clip and the cut of one square stand. A cut is out of date when its clip
    is, whatever it was made from: it shows a take the picture no longer is. */
export function squareSteps(sq: SquareMotion): { clip: StepState; cut: StepState } {
  const clip: StepState = !sq.clip ? "none" : sq.picture && sq.clip.from === sq.picture ? "ready" : "stale";
  const cut: StepState = !sq.cut ? "none" : clip === "ready" && sq.cut.from === clipTake(sq.clip!) ? "ready" : "stale";
  return { clip, cut };
}

/** The next step a square needs, or "done" when it is an animated sprite already. */
export function nextStep(sq: SquareMotion): MotionStep | "done" {
  if (!sq.picture) return "picture";
  const { clip, cut } = squareSteps(sq);
  if (clip !== "ready") return "clip";
  if (cut !== "ready") return "cut";
  return "done";
}

/** Whether a square can have this step made now: never before the step it is made of. */
export function canMake(step: MotionStep, sq: SquareMotion): boolean {
  if (step === "picture") return true;
  if (step === "clip") return !!sq.picture;
  return squareSteps(sq).clip === "ready";
}

/**
 * What a square's button for a step has to make, in order; nothing when it has no
 * picture to work from. A cut has to be of a clip of the picture as it is now, so
 * pressing Cut on a square with no clip, or one of an older picture, makes the clip
 * first: pressing the last step is asking for the square to be finished.
 */
export function stepsFor(step: "clip" | "cut", sq: SquareMotion): ("clip" | "cut")[] {
  if (!sq.picture) return [];
  return step === "cut" && squareSteps(sq).clip !== "ready" ? ["clip", "cut"] : [step];
}

/**
 * The squares one step of a run works through, in board order: those that lack the
 * step, or hold it out of date, and have what it is made of. A run asks again before
 * each step rather than planning all three at the start, so a picture that failed is
 * simply not animated, and one drawn in the first step is.
 */
export function stepWork(step: MotionStep, squares: readonly SquareMotion[]): number[] {
  const out: number[] = [];
  squares.forEach((sq, i) => {
    if (!canMake(step, sq)) return;
    const missing = step === "picture" ? !sq.picture : squareSteps(sq)[step] !== "ready";
    if (missing) out.push(i);
  });
  return out;
}

/** How many squares have reached each step, fresh, for the bar under the board. */
export function stepCounts(squares: readonly SquareMotion[]): Record<MotionStep, number> {
  const counts = { picture: 0, clip: 0, cut: 0 };
  for (const sq of squares) {
    if (sq.picture) counts.picture++;
    const s = squareSteps(sq);
    if (s.clip === "ready") counts.clip++;
    if (s.cut === "ready") counts.cut++;
  }
  return counts;
}

/** A short, stable fingerprint of a long string: enough to tell two recipes apart in a
    take, not a security measure. */
function shortHash(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
