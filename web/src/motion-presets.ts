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
  { id: "hair", label: "Hair in the wind", phrase: "Her hair moves softly in the breeze", group: "her" },
  { id: "walk", label: "Walks closer", phrase: "She walks slowly toward the camera", group: "her" },
  { id: "dance", label: "Sways", phrase: "She sways her hips gently to music", group: "her" },
  { id: "light", label: "Flickering light", phrase: "Warm light flickers across the scene", group: "scene" },
  { id: "rain", label: "Rain", phrase: "Rain falls steadily in the background", group: "scene" },
  { id: "petals", label: "Petals", phrase: "Petals drift through the air", group: "scene" },
  { id: "cloth", label: "Fabric moves", phrase: "Her clothes ripple and move with her", group: "scene" },
];

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
