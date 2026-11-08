import type { GenModel } from "./api.js";

// Which words a character or pose puts in the prompt.
//
// A character is written as tags ("1girl, long red hair, green eyes"), which is what the
// SDXL family was trained on. Anima reads plain sentences as well as tags and does better
// with a subject described than listed, so a character or pose can carry a description
// too, and on Anima that is what is sent. Everywhere else the tags still are: a
// description given to an SDXL model is a run of tokens it was never taught.

/** The model families a description is sent to in place of the tags. */
export const PROSE_FAMILIES: ReadonlySet<string> = new Set(["anima"]);

/** Whether the picked checkpoint is one that reads a description. */
export function readsProse(model: Pick<GenModel, "family"> | undefined): boolean {
  return !!model?.family && PROSE_FAMILIES.has(model.family);
}

/**
 * The prompt's pieces joined: by commas, as tags are, except after a piece that ends a
 * sentence, which the next follows after a space. Joined by commas alone, a description
 * or a sprite square written in sentences came out "…green eyes., sitting".
 */
export function joinPrompt(parts: string[]): string {
  let out = "";
  for (const raw of parts) {
    const part = raw.trim();
    if (!part) continue;
    out = !out ? part : /[.!?…]$/.test(out) ? `${out} ${part}` : `${out}, ${part}`;
  }
  return out;
}

/** The words a character or pose adds: its description on a model that reads prose, when
 *  it has one; its tags otherwise. */
export function fragmentWords(fragment: { prompt: string; description?: string }, prose: boolean): string {
  const description = fragment.description?.trim() ?? "";
  return prose && description ? description : fragment.prompt.trim();
}
