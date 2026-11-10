// A sprite square written as sentences, for a checkpoint that reads them.
//
// The board's prompt is a run of tag phrases ("solo, one person, single subject, cowboy
// shot, smirk, half-lidded eyes, …") because the SDXL checkpoints it was built on were
// trained on booru tags. Anima was trained on sentences as well as tags, and its text
// encoder is a language model, so a square described ("A cowboy shot. She smirks with
// half-lidded eyes, one hand resting on her hip.") is one it follows more closely. The
// rules for what each square says stay where they are (outfit-loadout.ts for clothes and
// undressing, camera.ts for the framing); this only puts the sentences in order.
//
// The negative prompt is not rewritten. It is a list of things to keep out, and a list
// is what it is to any encoder.

/** The background every square is drawn on: flat, so the cutout has nothing to argue with.
    Green is the screen her clips are made on (sprite-screen.ts), so a square drawn on it
    is on that screen already. */
export type SpriteBackdrop = "white" | "black" | "green";

export interface SpriteSquareWords {
  /** The framing, as a sentence. See outfitShotProse. */
  shot: string;
  /** Her face and what her arms are doing, from the expression column or the MISC state. */
  doing: string;
  /** How she stands at this heat, or "" for a MISC state, whose pose is the whole of it. */
  stance: string;
  /** The heat's mood. */
  mood: string;
  /** What she has on. See wearingProse. */
  wearing: string;
  /** What the level has taken off or shows. See undressPrompt. */
  undress: string[];
  /** Said only at the nude level. */
  pubic: string;
  /** The outfit's own words, as typed. */
  extra: string;
  backdrop: SpriteBackdrop;
}

/** There is one person in a square, and it is said first, as the tags did. */
export const SPRITE_SOLO_PROSE = "A solo picture of one woman, alone in the frame.";

export function backdropProse(backdrop: SpriteBackdrop): string {
  // "Green studio backdrop" reads to a model as a green-painted room; a chroma-key screen
  // is the flat, saturated thing that is wanted.
  if (backdrop === "green") {
    return "The background is a perfectly plain, solid chroma-key green screen, seamless and evenly lit, with no texture.";
  }
  return `The background is a perfectly plain, solid pure ${backdrop} studio backdrop, seamless and evenly lit, with no texture.`;
}

export function pubicProse(hair: boolean, color: string): string {
  return hair
    ? `Her ${color.trim() || "dark brown"} pubic hair is visible.`
    : "Her pubic area is clean-shaven, with no pubic hair.";
}

/** A phrase made a sentence: a capital to open it and a full stop to close it, if it
 *  has neither. Words typed as tags ("thigh highs, choker") come out a short sentence. */
export function asSentence(text: string): string {
  const t = text.trim();
  if (!t) return "";
  const opened = t[0].toUpperCase() + t.slice(1);
  return /[.!?…]$/.test(opened) ? opened : `${opened}.`;
}

/** The whole square, in the order a person would describe a portrait: who and how she
 *  is framed, her face and hands, how she stands and feels, her clothes, then the room. */
export function spriteSquareProse(w: SpriteSquareWords): string {
  return [
    SPRITE_SOLO_PROSE, w.shot, w.doing, w.stance, w.mood, w.wearing, ...w.undress, w.pubic, w.extra,
    backdropProse(w.backdrop),
  ].map(asSentence).filter(Boolean).join(" ");
}
