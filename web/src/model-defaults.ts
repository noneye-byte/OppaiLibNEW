import type { CivitaiSuggestion, GenModelDefaults } from "./api.js";

/**
 * A model's recommended prompts, put into the form and taken out again.
 *
 * A checkpoint's recommended positive is a quality prefix ("score_9, score_8_up")
 * and its negative a list of things to avoid; picking the model puts them in the
 * prompt boxes, where they can be read and edited like anything else typed there.
 * Picking another model must then take the first one's out — otherwise switching
 * from Pony to Illustrious leaves Pony's score tags at the front of every prompt —
 * but only if they are still there as they were put in: once someone has edited
 * that text, it is theirs.
 */

/** Splits a prompt into its comma-separated parts, trimmed, empties dropped. */
function parts(text: string): string[] {
  return text.split(",").map((p) => p.trim()).filter(Boolean);
}

const norm = (p: string) => p.toLowerCase().replace(/\s+/g, " ");

/** Whether every part of `fragment` is in `text`, in any order. */
export function containsAll(text: string, fragment: string): boolean {
  const have = new Set(parts(text).map(norm));
  const want = parts(fragment);
  return want.length > 0 && want.every((p) => have.has(norm(p)));
}

/**
 * Replaces the previous model's recommended prompt with the next one's. The
 * previous one is taken out only when all of it is still there; the next goes at
 * the start (a positive's quality prefix) or the end (a negative), leaving out any
 * part the text already has.
 */
export function swapPromptDefault(
  text: string,
  previous: string | undefined,
  next: string | undefined,
  where: "start" | "end",
): string {
  let current = parts(text);
  if (previous && containsAll(text, previous)) {
    const drop = new Set(parts(previous).map(norm));
    current = current.filter((p) => !drop.has(norm(p)));
  }
  const have = new Set(current.map(norm));
  const add = parts(next ?? "").filter((p) => !have.has(norm(p)));
  const out = where === "start" ? [...add, ...current] : [...current, ...add];
  return out.join(", ");
}

/**
 * The negatives the LoRAs that are on ask for, less what the negative prompt
 * already says. Added when the prompt is assembled, so they come and go with the
 * LoRA rather than being left in the box after it is switched off.
 */
export function loraNegatives(negative: string, loraNegs: (string | undefined)[]): string {
  const have = new Set(parts(negative).map(norm));
  const out: string[] = [];
  for (const neg of loraNegs) {
    for (const p of parts(neg ?? "")) {
      if (!have.has(norm(p))) {
        have.add(norm(p));
        out.push(p);
      }
    }
  }
  return out.join(", ");
}

/** What importing a suggestion did to the editor's draft. */
export interface ImportedDefaults {
  defaults: GenModelDefaults;
  triggerText: string;
  /** Human labels of what changed, for the editor to say. */
  applied: string[];
}

/**
 * Lays Civitai's suggestion over the editor's draft. Importing is asked for, so a
 * suggested value replaces the draft's; what the page says nothing about keeps the
 * draft's value. Trigger words are added to the ones already there.
 */
export function importSuggestion(
  current: GenModelDefaults,
  triggerText: string,
  s: CivitaiSuggestion,
  isLora: boolean,
): ImportedDefaults {
  const d: GenModelDefaults = { ...current };
  const applied: string[] = [];
  const take = <K extends keyof GenModelDefaults>(key: K, value: GenModelDefaults[K] | undefined, label: string) => {
    if (value === undefined || value === "" || value === 0) return;
    if (d[key] !== value) applied.push(label);
    d[key] = value;
  };
  if (isLora) {
    take("weight", s.weight, "weight");
    if (s.weightMin && s.weightMax) {
      take("weightMin", s.weightMin, "weight range");
      d.weightMax = s.weightMax;
    }
  } else {
    take("positive", s.positive, "positive prompt");
    take("steps", s.steps, "steps");
    take("cfgScale", s.cfgScale, "CFG");
    take("scheduler", s.scheduler, "sampler");
    take("clipSkip", s.clipSkip, "clip skip");
    if (s.width && s.height) {
      take("width", s.width, "size");
      d.height = s.height;
    }
  }
  take("negative", s.negative, "negative prompt");

  const words = parts(triggerText);
  const have = new Set(words.map(norm));
  let addedWords = 0;
  for (const w of s.triggerWords ?? []) {
    // A trained word can itself be a comma-separated phrase list.
    for (const p of parts(w)) {
      if (!have.has(norm(p))) {
        have.add(norm(p));
        words.push(p);
        addedWords++;
      }
    }
  }
  if (addedWords) applied.unshift("trigger words");
  return { defaults: d, triggerText: words.join(", "), applied };
}
