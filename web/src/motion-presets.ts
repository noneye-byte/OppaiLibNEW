// Ready-made phrases for what moves in a clip.
//
// Wan reads sentences, not tags, and the words that make a clip move are a small,
// learnable vocabulary — a push-in, hair in the wind, a blink — that nobody should have
// to rediscover by trial. A preset is a sentence added to the motion prompt, and taken
// out again by pressing it a second time, so the chips stay honest about what is in
// the box even after it has been typed in by hand.

export interface MotionPreset {
  id: string;
  label: string;
  /** Exactly what is written into the prompt, as its own sentence. */
  phrase: string;
  group: "camera" | "her" | "scene";
}

export const MOTION_PRESETS: readonly MotionPreset[] = [
  { id: "push", label: "Push in", phrase: "The camera slowly pushes in toward her face", group: "camera" },
  { id: "pull", label: "Pull back", phrase: "The camera slowly pulls back to reveal more of the scene", group: "camera" },
  { id: "orbit", label: "Orbit", phrase: "The camera orbits slowly around her", group: "camera" },
  { id: "pan", label: "Pan", phrase: "The camera pans gently from left to right", group: "camera" },
  { id: "still", label: "Locked off", phrase: "The camera stays perfectly still", group: "camera" },
  { id: "handheld", label: "Handheld", phrase: "Subtle handheld camera sway", group: "camera" },
  { id: "look", label: "Looks at you", phrase: "She turns her head to look straight at the camera", group: "her" },
  { id: "smile", label: "Smiles", phrase: "She breaks into a warm smile", group: "her" },
  { id: "blink", label: "Blinks", phrase: "She blinks naturally", group: "her" },
  { id: "wave", label: "Waves", phrase: "She raises a hand and waves", group: "her" },
  { id: "breathe", label: "Breathing", phrase: "Her chest rises and falls with slow breathing", group: "her" },
  { id: "hair", label: "Hair in the wind", phrase: "Her hair flows and moves softly in the breeze", group: "her" },
  { id: "pose", label: "Holds her pose", phrase: "She holds her pose and moves only a little", group: "her" },
  { id: "walk", label: "Walks closer", phrase: "She walks slowly toward the camera", group: "her" },
  { id: "dance", label: "Sways", phrase: "She sways her hips gently to music", group: "her" },
  { id: "light", label: "Flickering light", phrase: "Warm light flickers across the scene", group: "scene" },
  { id: "rain", label: "Rain", phrase: "Rain falls steadily in the background", group: "scene" },
  { id: "petals", label: "Petals", phrase: "Petals drift through the air", group: "scene" },
  { id: "cloth", label: "Fabric moves", phrase: "Her clothes sway and ripple gently as she moves", group: "scene" },
];

/**
 * Showcase: a picture brought to life rather than set in motion — she stays where she
 * is, blinks, breathes, her hair and clothes move, and the camera holds still. It is
 * the clip a character card or a wallpaper wants, and it is made of the presets above,
 * so each of its parts can still be pressed off on its own afterwards. Paired with a
 * loop (the clip ends on the picture it began from) it plays round for ever.
 */
export const SHOWCASE_PRESETS: readonly string[] = ["still", "pose", "blink", "breathe", "hair", "cloth"];

function showcasePhrases(): string[] {
  return SHOWCASE_PRESETS.map((id) => MOTION_PRESETS.find((p) => p.id === id)!.phrase);
}

/** Whether every part of the showcase is in the prompt. */
export function isShowcase(prompt: string): boolean {
  return showcasePhrases().every((phrase) => hasPhrase(prompt, phrase));
}

/**
 * Puts the showcase into the prompt, or takes it out when it is all there. Its parts
 * go first, in their order, with whatever else the prompt says kept after them; the
 * ones already there are not added twice. Taking it out leaves only what is not its.
 */
export function toggleShowcase(prompt: string): string {
  const parts = showcasePhrases();
  const rest = sentences(prompt).filter((s) => !parts.some((p) => same(s, p)));
  const next = isShowcase(prompt) ? rest : [...parts, ...rest];
  return next.length ? `${next.join(". ")}.` : "";
}

/** Splits a prompt into its sentences, trimmed, without their full stops. */
function sentences(prompt: string): string[] {
  return prompt.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim().replace(/[.!?]+$/, "").trim()).filter(Boolean);
}

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** Whether the prompt already says this, as a sentence of its own. */
export function hasPhrase(prompt: string, phrase: string): boolean {
  return sentences(prompt).some((s) => same(s, phrase));
}

/**
 * Adds the phrase as a new sentence, or takes it out if it is there.
 *
 * Only a whole sentence is removed: a phrase that has since been edited ("she slowly
 * turns her head") is the user's now, and pressing the chip adds the preset beside it
 * rather than guessing which words to delete.
 */
export function togglePhrase(prompt: string, phrase: string): string {
  const parts = sentences(prompt);
  const kept = parts.filter((s) => !same(s, phrase));
  const next = kept.length === parts.length ? [...parts, phrase] : kept;
  return next.length ? `${next.join(". ")}.` : "";
}
