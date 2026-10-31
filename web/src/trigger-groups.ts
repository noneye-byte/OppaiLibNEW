/**
 * The trigger words of the LoRAs that are on, sorted out for the composer.
 *
 * They used to be one wall of chips under the prompt — every phrase of every LoRA in
 * use, and a character LoRA trained on a booru set brings sixty — which pushed the
 * picture off the stage. Now the composer shows only the ones picked, and the rest
 * are a click away in a picker grouped by the LoRA that wants them: which LoRA a
 * phrase belongs to is what tells "fox girl" from "police hat" when choosing.
 */

export interface TriggerLora {
  name: string;
  alias?: string;
  triggerPhrases?: string[];
}

export interface TriggerGroup {
  lora: string;
  /** How the LoRA is called in the picker: its alias, else its name without a path. */
  label: string;
  phrases: string[];
}

/** The groups of the LoRAs switched on, in their own order. A phrase two LoRAs share
    is listed once, under the first. A LoRA with no phrases is left out. */
export function triggerGroups(loras: readonly TriggerLora[], on: Readonly<Record<string, number>>): TriggerGroup[] {
  const seen = new Set<string>();
  const out: TriggerGroup[] = [];
  for (const l of loras) {
    if (!(l.name in on)) continue;
    const phrases: string[] = [];
    for (const raw of l.triggerPhrases ?? []) {
      const p = raw.trim();
      const key = p.toLowerCase();
      if (!p || seen.has(key)) continue;
      seen.add(key);
      phrases.push(p);
    }
    if (phrases.length) out.push({ lora: l.name, label: l.alias?.trim() || l.name.split(/[\\/]/).pop()!, phrases });
  }
  return out;
}

/** The groups narrowed to the phrases (or LoRAs) that hold every word of the query. */
export function filterTriggerGroups(groups: readonly TriggerGroup[], query: string): TriggerGroup[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [...groups];
  const fits = (text: string) => words.every((w) => text.toLowerCase().includes(w));
  return groups
    .map((g) => (fits(g.label) ? g : { ...g, phrases: g.phrases.filter(fits) }))
    .filter((g) => g.phrases.length);
}

/** The picked phrases the composer has room to show inline, and how many it folds
    into a "+N" — still picked, just not drawn. Only phrases still offered count: one
    picked for a LoRA since switched off is not sent either. */
export function inlineTriggers(picked: readonly string[], groups: readonly TriggerGroup[], room: number): { shown: string[]; folded: number } {
  const offered = new Set(groups.flatMap((g) => g.phrases));
  const live = picked.filter((p) => offered.has(p));
  return { shown: live.slice(0, Math.max(0, room)), folded: Math.max(0, live.length - room) };
}
