/**
 * The studio's LoRA categories, as the picker filters by them.
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
