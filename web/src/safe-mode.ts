/**
 * The safe toggle.
 *
 * Someone walks in. Incognito (incognito.ts) is the disguise for the *signed-out*
 * surface; this is for the signed-in one: one key, and every tile the tagger rated
 * past "sensitive" is a blur, the mascot is off the screen, and any video is muted.
 * The other key locks — signs out on the spot, which with incognito on lands on the
 * Nextcloud page.
 *
 * Per device, like hiding Libby: which room the screen is in is a fact about the
 * device, not the account. The rating comes from the tagger's own `rating`
 * category (wd14's general / sensitive / questionable / explicit), which is on the
 * item and travels with every listing, so nothing here needs a request.
 */

import type { Media } from "./api.js";

// Also read, by name, in libby.ts (libbyHidden) — keep the two in step.
const KEY = "oppai.safe";
export const SAFE_EVENT = "oppai-safe";

/** The ratings a veiled tile hides. "sensitive" is swimwear and underwear — left
    visible on purpose, since blurring half the library makes the toggle useless
    for browsing while it is on. */
const VEILED = new Set(["questionable", "explicit", "rating:questionable", "rating:explicit", "q", "e"]);

/** Whether an item's tags rate it as something to veil. Untagged items are shown:
    the toggle is a courtesy for the glance over your shoulder, not a filter, and a
    library that has never been auto-tagged should not turn into a wall of blur. */
export function isExplicit(tags: Media["tags"] | undefined): boolean {
  if (!tags) return false;
  for (const tag of tags) {
    const name = tag.name.toLowerCase();
    if (tag.category === "rating" ? VEILED.has(name) : VEILED.has(name) && name.startsWith("rating:")) return true;
  }
  return false;
}

export function loadSafeMode(): boolean {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
}

export function saveSafeMode(on: boolean): void {
  try { localStorage.setItem(KEY, on ? "1" : "0"); } catch { /* private window */ }
  window.dispatchEvent(new CustomEvent(SAFE_EVENT, { detail: { safe: on } }));
  // Libby leaves with the toggle (libbyHidden reads this), and the views that draw
  // her listen for her own preference event rather than this one.
  window.dispatchEvent(new CustomEvent("oppai-libby-pref", { detail: { hidden: on } }));
}

/**
 * Reads the keys. Backtick toggles the veil; shift+backtick (tilde) locks. Chosen
 * because both sit in the corner under one finger, and neither is typed in any
 * field the app has — a typing target is left alone regardless.
 */
export function safeKeyAction(event: { key: string; ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean }): "toggle" | "lock" | null {
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  if (event.key === "`") return "toggle";
  if (event.key === "~") return "lock";
  return null;
}
