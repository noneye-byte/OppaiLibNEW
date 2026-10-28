/**
 * The studio's LoRA categories, as the picker filters by them — and, further down,
 * the rest of what the picker narrows and orders its LoRAs by.
 *
 * The list is fixed — Civitai's own groupings, which is also how a LoRA installed from
 * there arrives filed — and the server keeps which LoRA is under which
 * (api/lora_categories.go). It used to be folders the person made; nobody made the
 * same ones twice and the phone had an editor for them nobody used. Android carries
 * the same list in ImageGenScreen.kt.
 *
 * The picker's chips are "All", each category, and "Unsorted" while there are any —
 * where a LoRA lands when nothing said what it is, so it is the pile that wants sorting.
 */

import type { GenLora } from "./api.js";

export type LoraCategoryKey = "character" | "style" | "concept" | "tools" | "poses" | "background" | "etc";

export const LORA_CATEGORIES: { key: LoraCategoryKey; label: string; icon: string }[] = [
  { key: "character", label: "Character", icon: "person" },
  { key: "style", label: "Style", icon: "brush" },
  { key: "concept", label: "Concept", icon: "lightbulb" },
  { key: "tools", label: "Tools", icon: "build" },
  { key: "poses", label: "Poses", icon: "accessibility_new" },
  { key: "background", label: "Background", icon: "landscape" },
  { key: "etc", label: "ETC", icon: "more_horiz" },
];

/** The picker's filter: every LoRA, the unsorted ones, or one category. */
export type CategoryFilter = "all" | "none" | LoraCategoryKey;

/** A key the server sent, if it is one of the list: an unknown one reads as unsorted. */
export function categoryOf(lora: Pick<GenLora, "categoryKey">): LoraCategoryKey | undefined {
  return LORA_CATEGORIES.find((c) => c.key === lora.categoryKey)?.key;
}

export function inCategory(lora: Pick<GenLora, "categoryKey">, filter: CategoryFilter): boolean {
  if (filter === "all") return true;
  if (filter === "none") return !categoryOf(lora);
  return categoryOf(lora) === filter;
}

/** How many LoRAs are in each category, and unsorted under "none". */
export function categoryCounts(loras: Pick<GenLora, "categoryKey">[]): Record<CategoryFilter, number> {
  const out = { all: loras.length, none: 0 } as Record<CategoryFilter, number>;
  for (const c of LORA_CATEGORIES) out[c.key] = 0;
  for (const l of loras) out[categoryOf(l) ?? "none"]++;
  return out;
}

/** The LoRAs with some filed under a category ("" for none), so the picker shows the
    move before the server answers. */
export function moveToCategory<L extends Pick<GenLora, "name" | "categoryKey">>(
  loras: L[],
  names: string[],
  category: LoraCategoryKey | "",
): L[] {
  const moving = new Set(names);
  return loras.map((l) => {
    if (!moving.has(l.name) || (l.categoryKey ?? "") === category) return l;
    return { ...l, categoryKey: category || undefined };
  });
}

// ── what the picker shows, and in what order ────────────────────────────────
//
// The picker narrows a few hundred LoRAs by four things at once: the category tab,
// the search words, whether a LoRA can work with the checkpoint that is picked, and
// the order. The last two are new. A LoRA trained for SDXL does nothing useful on an
// SD 1.5 checkpoint, and the picker used to offer every one regardless, so the list
// a person scrolled was mostly ones that could not work. The base names come three
// ways — A1111's card ("SD1", "SDXL"), Civitai's ("SD 1.5", "Pony", "Illustrious")
// and InvokeAI's ("sd-1", "sdxl") — and are compared by family. A LoRA that says
// nothing about its base is assumed to fit: hiding it would hide most of a library
// that was never dressed from Civitai.

export type BaseFamily = "sd1" | "sd2" | "sdxl" | "sd3" | "flux" | "";

/** The model family a base name stands for, "" when it says none. Pony, Illustrious
    and NoobAI are SDXL underneath and share its LoRAs. */
export function baseFamily(base: string | undefined): BaseFamily {
  const b = (base ?? "").toLowerCase().replace(/[\s_.-]+/g, "");
  if (!b || b === "unknown" || b === "other" || b === "any") return "";
  if (b.startsWith("flux")) return "flux";
  if (b.startsWith("sd3")) return "sd3";
  if (b.includes("xl") || b.startsWith("pony") || b.startsWith("illustrious") || b.startsWith("noob")) return "sdxl";
  if (b.startsWith("sd2")) return "sd2";
  if (b.startsWith("sd1")) return "sd1";
  return "";
}

/** A family as the picker says it. */
export function familyLabel(f: BaseFamily): string {
  return { sd1: "SD 1.5", sd2: "SD 2", sdxl: "SDXL", sd3: "SD 3", flux: "Flux", "": "" }[f];
}

/** Whether a LoRA can work with a checkpoint: yes unless both say a family and the
    families differ. */
export function fitsModel(loraBase: string | undefined, modelBase: string | undefined): boolean {
  const l = baseFamily(loraBase);
  const m = baseFamily(modelBase);
  return !l || !m || l === m;
}

export type LoraOrder = "name" | "name-desc" | "category" | "base";

export const LORA_ORDERS: { id: LoraOrder; label: string }[] = [
  { id: "name", label: "Name, A to Z" },
  { id: "name-desc", label: "Name, Z to A" },
  { id: "category", label: "Category" },
  { id: "base", label: "Base model" },
];

/** What a LoRA is called on its card. */
export function loraLabel(l: Pick<GenLora, "name" | "alias">): string {
  return l.alias || l.name;
}

const categoryRank = new Map<string, number>(LORA_CATEGORIES.map((c, i) => [c.key, i]));
const familyRank: BaseFamily[] = ["sd1", "sd2", "sdxl", "sd3", "flux", ""];

/** The LoRAs in an order, names breaking every tie so the list never shuffles. */
export function sortLoras<L extends Pick<GenLora, "name" | "alias" | "base" | "categoryKey">>(loras: L[], order: LoraOrder): L[] {
  const byName = (a: L, b: L) => loraLabel(a).localeCompare(loraLabel(b), undefined, { sensitivity: "base", numeric: true });
  const out = [...loras];
  switch (order) {
    case "name-desc":
      return out.sort((a, b) => byName(b, a));
    case "category":
      // Filed ones in the list's order, the unsorted after them.
      return out.sort((a, b) =>
        (categoryRank.get(categoryOf(a) ?? "") ?? 99) - (categoryRank.get(categoryOf(b) ?? "") ?? 99) || byName(a, b));
    case "base":
      return out.sort((a, b) =>
        familyRank.indexOf(baseFamily(a.base)) - familyRank.indexOf(baseFamily(b.base)) || byName(a, b));
    default:
      return out.sort(byName);
  }
}

export interface LoraView {
  category: CategoryFilter;
  query: string;
  /** Only the LoRAs that can work with modelBase. */
  fitOnly: boolean;
  modelBase?: string;
  order: LoraOrder;
}

/** Whether a LoRA's name, alias or trigger words hold every word of a search. */
export function matchesQuery(l: Pick<GenLora, "name" | "alias" | "triggerPhrases">, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = `${l.name} ${l.alias ?? ""} ${(l.triggerPhrases ?? []).join(" ")}`.toLowerCase();
  return words.every((w) => hay.includes(w));
}

/** The LoRAs a view shows, in its order. */
export function browseLoras<L extends GenLora>(loras: L[], view: LoraView): L[] {
  const shown = loras.filter((l) =>
    inCategory(l, view.category) &&
    matchesQuery(l, view.query) &&
    (!view.fitOnly || fitsModel(l.base, view.modelBase)));
  return sortLoras(shown, view.order);
}

/** How many LoRAs a model cannot use, so the switch that hides them can say. */
export function unfitCount(loras: Pick<GenLora, "base">[], modelBase: string | undefined): number {
  return loras.filter((l) => !fitsModel(l.base, modelBase)).length;
}

/** What one round of sorting with Civitai did, in a line. */
export function civitaiSortSummary(results: { outcome: string; category?: string }[]): string {
  const n = (o: string) => results.filter((r) => r.outcome === o).length;
  const filed = n("filed");
  const parts: string[] = [];
  parts.push(filed ? `Filed ${filed} ${filed === 1 ? "LoRA" : "LoRAs"}` : "Nothing could be filed");
  if (n("untagged")) parts.push(`${n("untagged")} on Civitai under no category`);
  if (n("unknown")) parts.push(`${n("unknown")} not on Civitai`);
  if (n("unhashed")) parts.push(`${n("unhashed")} not hashed yet — try again in a few minutes`);
  if (n("error")) parts.push(`${n("error")} couldn't be looked up`);
  return parts.join(" · ");
}

/** Where each category stands after a round of sorting: the names filed under each. */
export function filedByCategory(results: { lora: string; outcome: string; category?: string }[]): Map<LoraCategoryKey, string[]> {
  const out = new Map<LoraCategoryKey, string[]>();
  for (const r of results) {
    const key = LORA_CATEGORIES.find((c) => c.key === r.category)?.key;
    if (r.outcome !== "filed" || !key) continue;
    out.set(key, [...(out.get(key) ?? []), r.lora]);
  }
  return out;
}
