// The shell's per-device choices, and the small questions about where a section sits.
//
// Kept out of library.ts so they can be tested: the shell is three thousand lines of
// component, and the answers here — which tab a phone lights for a screen, what a
// stored density of "xl" means — are the kind of thing that quietly goes wrong in one.
// Per device rather than per library, like the theme: a phone wants a denser grid than
// the television the same library is opened on.

/** How big the grid's tiles are. */
export type Density = "s" | "m" | "l";

/** The narrowest a grid column may be, per density, in CSS pixels. */
export const DENSITY_MIN: Record<Density, number> = { s: 148, m: 210, l: 300 };

/** On a phone a minimum width is the wrong question — a column count is what a thumb
 *  feels — so each density is a number of columns there instead. */
export const DENSITY_PHONE_COLUMNS: Record<Density, number> = { s: 3, m: 2, l: 1 };

export const DENSITY_LABEL: Record<Density, string> = { s: "Small tiles", m: "Medium tiles", l: "Large tiles" };

const DENSITY_KEY = "oppai_density";
const NAV_KEY = "oppai_nav";

/** A stored density, or medium for anything that is not one. */
export function parseDensity(value: unknown): Density {
  return value === "s" || value === "m" || value === "l" ? value : "m";
}

/** The density after this one, for a button that steps through them. Medium follows
 *  small and large follows medium, so a tap always grows the tiles until it wraps. */
export function nextDensity(d: Density): Density {
  return d === "s" ? "m" : d === "m" ? "l" : "s";
}

export function loadDensity(): Density {
  try {
    return parseDensity(localStorage.getItem(DENSITY_KEY));
  } catch {
    return "m";
  }
}

export function saveDensity(d: Density): void {
  try {
    localStorage.setItem(DENSITY_KEY, d);
  } catch {
    /* private mode / quota: the choice lasts the visit */
  }
}

/**
 * The sidebar's width: pinned open, pinned to a rail, or left to the shell.
 *
 * Null is "not chosen", and it is not the same as either choice: unchosen, the sidebar
 * is open beside the library and folds to a rail in Chat and Create, which bring
 * columns of their own and need the width more than a list of sections does.
 */
export type NavWidth = "full" | "rail";

export function parseNavWidth(value: unknown): NavWidth | null {
  return value === "full" || value === "rail" ? value : null;
}

export function loadNavWidth(): NavWidth | null {
  try {
    return parseNavWidth(localStorage.getItem(NAV_KEY));
  } catch {
    return null;
  }
}

export function saveNavWidth(w: NavWidth): void {
  try {
    localStorage.setItem(NAV_KEY, w);
  } catch {
    /* ignore */
  }
}

/** The sections that bring their own columns, where an unchosen sidebar folds. */
const WORKSPACES = new Set(["chat", "imagegen", "studio"]);

/**
 * Whether the sidebar is a rail right now.
 *
 * A choice the user made wins everywhere. Unchosen, it is a rail on a screen too narrow
 * for the open sidebar and in a workspace, and open otherwise.
 */
export function navIsRail(pref: NavWidth | null, section: string, narrow: boolean): boolean {
  if (pref) return pref === "rail";
  return narrow || WORKSPACES.has(section);
}

/** The phone's bottom bar: four places and the Add button between them. */
export type PhoneTab = "library" | "chat" | "create" | "more";

/** Which tab a section lights. Everything that is the library — its kinds, favourites,
 *  collections and the sources things are browsed in from — is under Library. */
export function phoneTabFor(section: string): PhoneTab {
  if (section === "chat") return "chat";
  if (section === "imagegen" || section === "studio") return "create";
  if (section === "settings") return "more";
  return "library";
}

/** Whether a section is the library itself: the screens with a search box and a grid. */
export function isLibrarySection(section: string): boolean {
  return phoneTabFor(section) === "library";
}

/** A count for the sidebar, where a column of numbers has to stay narrow: 1,204 is
 *  fine as it is, 12,400 reads better as 12.4k. */
export function compactCount(n: number): string {
  if (n < 10_000) return n.toLocaleString("en");
  if (n < 1_000_000) return `${(Math.floor(n / 100) / 10).toString()}k`;
  return `${(Math.floor(n / 100_000) / 10).toString()}M`;
}
