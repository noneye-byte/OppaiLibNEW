/**
 * A stable library filename for one generated wardrobe slot.
 *
 * The outfit field is free-form prompt text, so keep its useful words while removing
 * punctuation that is awkward in filenames. Mood and emotion are appended in the same
 * order as the wardrobe grid: outfit + heat tier + expression.
 */
function part(value: string, fallback: string, limit = 48) {
  const cleaned = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, limit)
    .replace(/-+$/g, "");
  return cleaned || fallback;
}

export function outfitImageFilename(outfit: string, mood: string, emotion: string): string {
  return `${part(outfit, "outfit")}-${part(mood, "calm", 20)}-${part(emotion, "neutral", 24)}.png`;
}

export function outfitArchiveFilename(outfit: string): string {
  return `${part(outfit, "outfit")}-wardrobe.zip`;
}
