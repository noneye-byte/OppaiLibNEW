/**
 * The studio's LoRA categories, as the picker filters by them.
 *
 * A LoRA is in one category or none (the server keeps them; see
 * api/lora_categories.go). The picker's chips are "All", each category, and
 * "No category" once there are any — the last is where a newly installed LoRA lands,
 * so it is the pile that wants sorting.
 */

import type { GenLora, LoraCategory } from "./api.js";

/** The picker's filter: every LoRA, the uncategorised ones, or one category. */
export type CategoryFilter = "all" | "none" | number;

export function inCategory(lora: Pick<GenLora, "category">, filter: CategoryFilter): boolean {
  if (filter === "all") return true;
  if (filter === "none") return !lora.category;
  return lora.category === filter;
}

/** A filter that still names something: a deleted category's falls back to all. */
export function liveFilter(filter: CategoryFilter, categories: LoraCategory[]): CategoryFilter {
  if (typeof filter === "number" && !categories.some((c) => c.id === filter)) return "all";
  return filter;
}

/** How many of the LoRAs have no category. */
export function uncategorised(loras: Pick<GenLora, "category">[]): number {
  return loras.filter((l) => !l.category).length;
}

/**
 * The LoRAs with some moved into a category (0 for none) and the counts with them,
 * so the picker shows the move before the server answers.
 */
export function moveToCategory<L extends Pick<GenLora, "name" | "category">>(
  loras: L[],
  categories: LoraCategory[],
  names: string[],
  category: number,
): { loras: L[]; categories: LoraCategory[] } {
  const moving = new Set(names);
  const delta = new Map<number, number>();
  const next = loras.map((l) => {
    if (!moving.has(l.name) || (l.category ?? 0) === category) return l;
    if (l.category) delta.set(l.category, (delta.get(l.category) ?? 0) - 1);
    if (category) delta.set(category, (delta.get(category) ?? 0) + 1);
    return { ...l, category: category || undefined };
  });
  return {
    loras: next,
    categories: categories.map((c) => (delta.has(c.id) ? { ...c, count: c.count + delta.get(c.id)! } : c)),
  };
}
