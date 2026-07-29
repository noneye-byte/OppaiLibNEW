import type { SourceItem, SourceListing } from "./api.js";

export interface MergedSourcePage {
  items: SourceItem[];
  cursor: string;
  error: string;
}

/**
 * Merge one remote page without allowing a broken adapter to repeat page one
 * forever. IDs are the adapter contract's stable identity. Some catalogues repeat
 * a pinned item at the top of adjacent pages, so individual duplicates are dropped;
 * a page with no new IDs is treated as a stuck paginator and stopped.
 */
export function mergeSourcePage(
  current: SourceItem[],
  page: SourceListing,
  requestedCursor: string,
  reset: boolean,
): MergedSourcePage {
  const nextCursor = page.cursor ?? "";
  if (reset) {
    return { items: dedupe(page.items), cursor: nextCursor, error: "" };
  }
  if (nextCursor && nextCursor === requestedCursor) {
    return { items: current, cursor: "", error: "This source returned the same page cursor twice, so paging was stopped." };
  }
  const known = new Set(current.map((item) => item.id));
  const fresh = dedupe(page.items).filter((item) => !known.has(item.id));
  if (page.items.length > 0 && fresh.length === 0) {
    return { items: current, cursor: "", error: "This source repeated an earlier page, so paging was stopped." };
  }
  return { items: [...current, ...fresh], cursor: nextCursor, error: "" };
}

function dedupe(items: SourceItem[]): SourceItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}
