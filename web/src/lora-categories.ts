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
// ways — A1111's card ("SD1", "SDXL"), Civitai's ("SD 1.5", "Illustrious", "Anima")
// and InvokeAI's ("sd-1", "sdxl") — and are compared by family. A LoRA that says
// nothing about its base is assumed to fit: hiding it would hide most of a library
// that was never dressed from Civitai.

export type BaseFamily = "sd1" | "sd2" | "sdxl" | "sd3" | "flux" | "flux2" | "chroma" | "qwen" | "qwen21"
  | "lumina" | "zimage" | "wan" | "anima" | "ernie" | "pid" | "krea2" | "moss" | "";

/** The model family a base name stands for, "" when it says none. Pony, Illustrious
    and NoobAI are SDXL underneath and share its LoRAs. This is FamilyOfBase in the
    server's imagegen/families.go again: Pony V7 is on AuraFlow, nothing like the Pony
    before it, and Qwen 3 is not a Qwen Forge runs. */
export function baseFamily(base: string | undefined): BaseFamily {
  const b = (base ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (!b || b === "unknown" || b === "other" || b === "any") return "";
  if (b.startsWith("ponyv7") || b.startsWith("flux3") || b.startsWith("qwen3")) return "";
  if (b.startsWith("flux2")) return "flux2";
  if (b.startsWith("flux")) return "flux";
  if (b.startsWith("chroma")) return "chroma";
  if (b.startsWith("qwen21")) return "qwen21";
  if (b.startsWith("qwen")) return "qwen";
  if (b.startsWith("lumina") || b.startsWith("neta")) return "lumina";
  if (b.startsWith("zimage")) return "zimage";
  if (b.startsWith("wan")) return "wan";
  if (b.startsWith("anima")) return "anima";
  if (b.startsWith("ernie")) return "ernie";
  if (b.startsWith("moss")) return "moss";
  if (b.startsWith("krea2")) return "krea2";
  if (b.startsWith("pid")) return "pid";
  if (b.startsWith("sd3")) return "sd3";
  if (b.includes("xl") || b.startsWith("pony") || b.startsWith("illustrious") || b.startsWith("noob") || b.startsWith("mugen")) return "sdxl";
  if (b.startsWith("sd2")) return "sd2";
  if (b.startsWith("sd1")) return "sd1";
  return "";
}

const FAMILY_LABELS: Record<BaseFamily, string> = {
  sd1: "SD 1.5", sd2: "SD 2", sdxl: "SDXL", sd3: "SD 3", flux: "Flux.1", flux2: "Flux.2 Klein", chroma: "Chroma",
  qwen: "Qwen", qwen21: "Qwen 2.1", lumina: "Lumina", zimage: "Z-Image", wan: "Wan", anima: "Anima",
  ernie: "Ernie", pid: "PiD", krea2: "Krea 2", moss: "MOSS Image", "": "",
};

/** A family as the picker says it. */
export function familyLabel(f: BaseFamily): string {
  return FAMILY_LABELS[f];
}

/** A model's family: what its file was read as, or what its base's name says. */
export function familyOf(m: { base?: string; family?: string }): BaseFamily {
  return (m.family as BaseFamily | undefined) || baseFamily(m.base);
}

/** Whether a LoRA can work with a checkpoint: yes unless both say a family and the
    families differ. Chroma is Flux with parts taken out, and Flux's LoRAs load on it. */
export function fitsModel(loraBase: string | undefined, modelBase: string | undefined): boolean {
  const l = baseFamily(loraBase);
  const m = baseFamily(modelBase);
  return !l || !m || l === m || (m === "chroma" && l === "flux");
}

// ── sorting by base model ───────────────────────────────────────────────────
//
// A family is what a LoRA can run on, which is too coarse to find anything by: most of
// a library can be SDXL, and Illustrious, Pony and NoobAI each look nothing like the
// others. So the picker groups by the finest name there is, and the groups are what
// its chips filter and its order sorts on.

export interface BaseGroup {
  key: string;
  label: string;
}

const XL_KINDS: [RegExp, BaseGroup][] = [
  [/illustrious/, { key: "illustrious", label: "Illustrious" }],
  [/noob/, { key: "noobai", label: "NoobAI" }],
  [/pony/, { key: "pony", label: "Pony" }],
  [/mugen/, { key: "mugen", label: "Mugen" }],
];

/** The groups in the order they are listed: what most people run first, then the newer
    models, the ones with nothing to go on last. */
const GROUP_ORDER = ["illustrious", "noobai", "pony", "sdxl", "mugen", "anima", "sd1", "sd2", "sd3", "flux", "flux2",
  "chroma", "zimage", "qwen", "qwen21", "krea2", "lumina", "ernie", "moss", "wan", "pid", "other"];

/** What a model is built on, as the picker groups it. */
export function baseGroup(m: { base?: string; family?: string }): BaseGroup {
  const fam = familyOf(m);
  if (fam === "sdxl") {
    const b = (m.base ?? "").toLowerCase();
    for (const [re, group] of XL_KINDS) if (re.test(b)) return group;
  }
  if (fam) return { key: fam, label: familyLabel(fam) };
  return { key: "other", label: "Other" };
}

/** Each group with what is in it, in order, for the chips above a list. */
export function baseGroups(items: { base?: string; family?: string }[]): (BaseGroup & { count: number })[] {
  const out = new Map<string, BaseGroup & { count: number }>();
  for (const it of items) {
    const g = baseGroup(it);
    const seen = out.get(g.key);
    if (seen) seen.count++;
    else out.set(g.key, { ...g, count: 1 });
  }
  return [...out.values()].sort((a, b) => GROUP_ORDER.indexOf(a.key) - GROUP_ORDER.indexOf(b.key));
}

/** Where a model falls in that order. */
export function baseRank(m: { base?: string; family?: string }): number {
  return GROUP_ORDER.indexOf(baseGroup(m).key);
}

export type ModelOrder = "name" | "name-desc" | "base";

export const MODEL_ORDERS: { id: ModelOrder; label: string }[] = [
  { id: "name", label: "Name, A to Z" },
  { id: "name-desc", label: "Name, Z to A" },
  { id: "base", label: "Base model" },
];

/** The checkpoints a view shows: those of one group, or "" for all, in an order, names
    breaking every tie so the list never shuffles. */
export function browseModels<M extends { model_name: string; base?: string; family?: string }>(models: M[], group: string, order: ModelOrder): M[] {
  const byName = (a: M, b: M) => a.model_name.localeCompare(b.model_name, undefined, { sensitivity: "base", numeric: true });
  const shown = group ? models.filter((m) => baseGroup(m).key === group) : [...models];
  if (order === "name-desc") return shown.sort((a, b) => byName(b, a));
  if (order === "base") return shown.sort((a, b) => baseRank(a) - baseRank(b) || byName(a, b));
  return shown.sort(byName);
}

/** The keys worth asking Civitai about: SDXL files with nothing finer known. Illustrious
    and Pony are SDXL tensor for tensor, so only the catalogue can tell them apart, and a
    file already known to be one of them, or that is anything else, has nothing to learn. */
export function basesToLookUp(items: { key?: string; base?: string; family?: string }[]): string[] {
  return items.filter((m) => m.key && baseGroup(m).key === "sdxl").map((m) => m.key as string);
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

/** The LoRAs in an order, names breaking every tie so the list never shuffles. */
export function sortLoras<L extends Pick<GenLora, "name" | "alias" | "base" | "family" | "categoryKey">>(loras: L[], order: LoraOrder): L[] {
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
      return out.sort((a, b) => baseRank(a) - baseRank(b) || byName(a, b));
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
  /** Only the LoRAs of one base group; "" for all of them. */
  group?: string;
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
    (!view.group || baseGroup(l).key === view.group) &&
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
