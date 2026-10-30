// What the studio remembers between runs, and between its three modes.
//
// A run used to replace the canvas: the four pictures from ten minutes ago were gone
// from the screen the moment the next four arrived, findable only by scrolling the
// gallery for them. The session strip keeps every picture made since the page opened,
// newest first, and these are the rules it keeps them by.
//
// The studio element is torn down and rebuilt when the shell switches between Create
// and Sprites (library.ts keys it), so anything that must survive that lives at module
// level in the component and is shaped here.

/** The studio's three faces. Image and Video are one element; Sprites is another. */
export type StudioMode = "image" | "video" | "sprites";

/** How many pictures the strip holds. Past this the oldest fall off; they are all in
    the gallery anyway, so the strip is a working set, not an archive. */
export const HISTORY_CAP = 60;

/**
 * Puts a run's pictures at the front of the history.
 *
 * A picture already there moves to the front rather than appearing twice — a redo of
 * an outfit square comes back under a new id, but a restored draft hands back ids the
 * strip already holds.
 */
export function rememberShots<T extends { id: string }>(history: readonly T[], made: readonly T[], cap = HISTORY_CAP): T[] {
  const fresh = new Set(made.map((s) => s.id));
  return [...made, ...history.filter((s) => !fresh.has(s.id))].slice(0, Math.max(0, cap));
}

/** Replaces one picture in a list by id, leaving the list alone when it is not there. */
export function patchShot<T extends { id: string }>(list: readonly T[], id: string, patch: Partial<T>): T[] {
  let hit = false;
  const out = list.map((s) => {
    if (s.id !== id) return s;
    hit = true;
    return { ...s, ...patch };
  });
  return hit ? out : (list as T[]);
}

/**
 * The id one step along a list from `current`, for the viewer's arrows and keys.
 *
 * It stops at the ends rather than wrapping: the strip is newest-first, and wrapping
 * from the newest picture to one an hour old reads as the viewer jumping somewhere
 * random. Nothing selected starts at the newest.
 */
export function stepThrough<T extends { id: string }>(list: readonly T[], current: string | null, dir: 1 | -1): string | null {
  if (!list.length) return null;
  const at = list.findIndex((s) => s.id === current);
  if (at < 0) return list[0].id;
  return list[Math.min(list.length - 1, Math.max(0, at + dir))].id;
}

/** Moves one entry of a list to another position, for reordering the queue. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const out = [...list];
  if (from < 0 || from >= out.length) return out;
  const [item] = out.splice(from, 1);
  out.splice(Math.min(out.length, Math.max(0, to)), 0, item);
  return out;
}

// ── recent prompts ─────────────────────────────────────────────────────────────
//
// The prompt box is the thing most often rewritten and least often recoverable: a
// good prompt edited into a bad one is gone. Every prompt actually generated with is
// remembered per device, so the last good one is a click away.

export interface RecentPrompt {
  prompt: string;
  negative: string;
  at: number;
}

const PROMPTS_KEY = "oppai.studio.prompts.v1";
export const PROMPTS_CAP = 20;

/** Puts a prompt at the front, dropping an older copy of the same text. */
export function rememberPrompt(list: readonly RecentPrompt[], entry: RecentPrompt, cap = PROMPTS_CAP): RecentPrompt[] {
  const prompt = entry.prompt.trim();
  if (!prompt) return list as RecentPrompt[];
  const negative = entry.negative.trim();
  const rest = list.filter((p) => p.prompt.trim() !== prompt || p.negative.trim() !== negative);
  return [{ prompt, negative, at: entry.at }, ...rest].slice(0, cap);
}

export function loadPrompts(): RecentPrompt[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(PROMPTS_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((p): p is RecentPrompt => !!p && typeof p === "object"
        && typeof (p as RecentPrompt).prompt === "string" && typeof (p as RecentPrompt).negative === "string"
        && typeof (p as RecentPrompt).at === "number")
      .slice(0, PROMPTS_CAP);
  } catch {
    return [];
  }
}

export function savePrompts(list: readonly RecentPrompt[]) {
  try {
    localStorage.setItem(PROMPTS_KEY, JSON.stringify(list));
  } catch {
    // Private windows and full storage: the list just isn't kept past this page.
  }
}

// ── layout ─────────────────────────────────────────────────────────────────────

/** Which panels are out, and which face of Create was last open. Per device: a phone
    and a desk monitor want different panels shown. */
export interface StudioLayout {
  inspector: boolean;
  gallery: boolean;
  mode: "image" | "video";
  /** The inspector tab last open, so it comes back out on the same one. */
  tab: string;
}

const LAYOUT_KEY = "oppai.studio.layout.v1";
export const DEFAULT_LAYOUT: StudioLayout = { inspector: true, gallery: true, mode: "image", tab: "models" };

export function loadLayout(): StudioLayout {
  try {
    const raw = JSON.parse(localStorage.getItem(LAYOUT_KEY) ?? "null") as Partial<StudioLayout> | null;
    if (!raw || typeof raw !== "object") return { ...DEFAULT_LAYOUT };
    return {
      inspector: typeof raw.inspector === "boolean" ? raw.inspector : DEFAULT_LAYOUT.inspector,
      gallery: typeof raw.gallery === "boolean" ? raw.gallery : DEFAULT_LAYOUT.gallery,
      mode: raw.mode === "video" ? "video" : "image",
      tab: typeof raw.tab === "string" ? raw.tab : DEFAULT_LAYOUT.tab,
    };
  } catch {
    return { ...DEFAULT_LAYOUT };
  }
}

export function saveLayout(layout: StudioLayout) {
  try {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
  } catch {
    // As with the prompts: the panels open as they were left on this page only.
  }
}
