import type { MediaQuery, MediaSort } from "./api.js";
import type { Kind } from "./media-meta.js";

// The kinds, by name. Type-only imports keep this module runnable under node's
// test runner, which strips types but cannot resolve the app's ".js" imports; the
// list is checked against the Kind union so it cannot drift from media-meta.ts.
const KINDS: readonly Kind[] = ["image", "gif", "video", "game", "comic"];
const isKind = (s: string): s is Kind => (KINDS as readonly string[]).includes(s);

/**
 * The header's Filters menu, as data.
 *
 * The button was in the header from the first design and did nothing for a year: no
 * handler, no menu, a `tune` icon and the word "Filters" over every screen including
 * the ones with nothing to filter. What it should have opened is the part of the
 * server's query the grid never exposed — the chips narrow by one tag and the sort
 * menu orders, but "my favourite videos rated four or more" needed three screens and
 * still could not be asked. So this is that: the narrowing that sits beside the
 * section, the search box and the chip, folded into one query by `buildQuery`.
 *
 * Pure so it can be tested without the shell: which controls a screen may use, how
 * the pieces combine, and how many are active for the badge.
 */
export interface LibraryFilters {
  /** One kind, or "" for every kind. Only free on screens that do not fix it. */
  kind: string;
  /** Favourites only. Only free outside the Favorites section, which already is. */
  favorite: boolean;
  /** Rated at least this many stars; 0 means everything, unrated included. */
  minRating: number;
}

export const NO_FILTERS: LibraryFilters = { kind: "", favorite: false, minRating: 0 };

/** Which of the filters a screen leaves to the menu. A kind section fixes the kind,
 *  Favorites fixes the favourite, so offering either there would be a control that
 *  could only agree with the sidebar. */
export interface FilterScope {
  kind: boolean;
  favorite: boolean;
}

/** Whether a section shows the grid at all — the screens the button belongs on.
 *  Home, Browse, Chat, the studio and Settings have nothing to filter. */
export function filtersApply(section: string, search: string): boolean {
  return search.trim() !== "" || section === "favorites" || isKind(section);
}

export function filterScope(section: string, search: string): FilterScope {
  const searching = search.trim() !== "";
  const inKind = !searching && isKind(section);
  const inFavorites = !searching && section === "favorites";
  return { kind: !inKind, favorite: !inFavorites };
}

/**
 * The query the grid asks for: what the section and search box decide, with the
 * menu's narrowing on top. A filter the scope does not allow is ignored rather than
 * applied, so a kind picked while searching cannot quietly hide a kind section's
 * rows once the search is cleared.
 */
export function buildQuery(
  section: string,
  search: string,
  chipTag: string | undefined,
  filters: LibraryFilters,
  sort: MediaSort,
): MediaQuery {
  const scope = filterScope(section, search);
  const q: MediaQuery = { sort };
  const term = search.trim();
  if (term) q.q = term;
  else if (section === "favorites") q.favorite = true;
  else if (isKind(section)) {
    q.kind = section;
    if (chipTag && chipTag !== "All") q.tag = chipTag;
  }
  if (scope.kind && filters.kind) q.kind = filters.kind;
  if (scope.favorite && filters.favorite) q.favorite = true;
  if (filters.minRating > 0) q.minRating = filters.minRating;
  return q;
}

/** How many of the menu's controls are doing something on this screen, for the
 *  badge on the button. The sort is not counted: it is an order, not a narrowing,
 *  and it is shown beside the grid already. */
export function activeFilterCount(filters: LibraryFilters, scope: FilterScope): number {
  let n = 0;
  if (scope.kind && filters.kind) n++;
  if (scope.favorite && filters.favorite) n++;
  if (filters.minRating > 0) n++;
  return n;
}
