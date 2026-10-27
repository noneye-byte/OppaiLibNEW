import type { SourceItem } from "./api.js";

/**
 * Searching Rule34 for pictures to train on.
 *
 * Two things are left out of every search. Animations and videos, because the
 * trainer reads stills. And, unless asked for, pictures another model drew: a LoRA
 * trained on them learns that model's hands and its sheen as if they were the
 * artist's. Rule34 tags those ai_generated, with a few others beside it; the tags
 * are excluded in the search, and the listing's own tags are checked again here
 * because a search is not always told about a tag added since.
 */

/** The tags that mark a picture another model drew. */
export const AI_TAGS = ["ai_generated", "ai-created", "ai_assisted", "stable_diffusion", "novelai", "midjourney"];

/** What still pictures are never tagged. */
const MOVING_TAGS = ["animated", "video"];

/** The search for some tags: theirs, then everything left out, each once. */
export function rule34Query(tags: string, noAI: boolean): string {
  const words = tags.trim().split(/\s+/).filter(Boolean);
  const have = new Set(words.map((w) => w.toLowerCase()));
  const leaveOut = [...MOVING_TAGS, ...(noAI ? AI_TAGS : [])]
    .filter((t) => !have.has(t) && !have.has(`-${t}`))
    .map((t) => `-${t}`);
  return [...words, ...leaveOut].join(" ");
}

/** A listing's posts worth showing: stills (or posts not yet opened), and with
    noAI none tagged as a model's. */
export function rule34Keeps(items: SourceItem[], noAI: boolean): SourceItem[] {
  const ai = new Set(AI_TAGS);
  return items.filter((it) => {
    if (it.kind === "video" || it.kind === "gif") return false;
    if (noAI && (it.tags ?? []).some((t) => ai.has(t.toLowerCase()))) return false;
    return true;
  });
}
