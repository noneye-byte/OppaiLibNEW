// Presentation helpers that map the backend Media model onto the visual
// language of the "OppaiLib Media Server UI" design: per-kind labels, icons,
// aspect ratios, the placeholder swatch gradients, and the human-readable
// "stat" shown on each tile. Shared by the library shell and the viewer.

import type { Media } from "./api.js";

export type Kind = Media["kind"];

// True when a keyboard event originates from a text-entry element. Uses
// composedPath() so it still works across shadow boundaries, where
// document.activeElement only reports the outer shadow host. Lets global
// keyboard shortcuts (viewer video keys, library arrow paging) yield while the
// user is typing in a field.
export function isTypingTarget(e: Event): boolean {
  return e.composedPath().some(
    (n) =>
      n instanceof HTMLElement &&
      (n.tagName === "INPUT" || n.tagName === "TEXTAREA" || n.isContentEditable),
  );
}

export interface KindMeta {
  /** Nav-section / plural label, e.g. "Photos". */
  label: string;
  /** Uppercase tile badge, e.g. "PHOTO". */
  typeLabel: string;
  /** Material Symbols Rounded glyph name. */
  icon: string;
  /** CSS aspect-ratio for the tile. */
  aspect: string;
}

export const KIND_META: Record<Kind, KindMeta> = {
  image: { label: "Photos", typeLabel: "PHOTO", icon: "photo_library", aspect: "4 / 3" },
  gif: { label: "GIFs", typeLabel: "GIF", icon: "animation", aspect: "1 / 1" },
  video: { label: "Videos", typeLabel: "VIDEO", icon: "movie", aspect: "16 / 9" },
  game: { label: "Games", typeLabel: "GAME", icon: "sports_esports", aspect: "3 / 4" },
  comic: { label: "Comics", typeLabel: "COMIC", icon: "auto_stories", aspect: "2 / 3" },
};

// Order used by the nav rail and the home dashboard.
export const KIND_ORDER: Kind[] = ["image", "gif", "video", "game", "comic"];

// Deterministic placeholder gradients — warm orange/tan family to match the
// Material 3 theme (hues span amber → orange → terracotta → brown).
const SWATCHES = [
  "linear-gradient(135deg, oklch(34% 0.06 60), oklch(22% 0.05 55))",
  "linear-gradient(135deg, oklch(33% 0.07 45), oklch(21% 0.05 40))",
  "linear-gradient(135deg, oklch(32% 0.07 30), oklch(20% 0.05 25))",
  "linear-gradient(135deg, oklch(34% 0.055 75), oklch(22% 0.045 70))",
  "linear-gradient(135deg, oklch(32% 0.06 20), oklch(20% 0.05 15))",
];

export function swatchFor(m: Media): string {
  return SWATCHES[Math.abs(m.id) % SWATCHES.length];
}

// image/gif render their own bytes as a thumbnail; videos show a generated
// poster frame once the server has produced one (m.hasThumb). Everything else
// falls back to a gradient swatch + type icon.
export function hasThumbnail(m: Media): boolean {
  return m.kind === "image" || m.kind === "gif" || !!m.hasThumb;
}

/** m:ss timecode — a clip's length, or a position within it. */
export function formatTimecode(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

/** Human byte size. Exported because more than one view needs it and three private
    copies had already started to drift on how they round. */
export function formatBytes(bytes: number): string {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n < 10 && i > 0 ? n.toFixed(1) : Math.round(n)} ${units[i]}`;
}

/** The small corner badge / caption for a media item. */
export function statFor(m: Media): string {
  switch (m.kind) {
    case "video":
    case "gif":
      return m.duration ? formatTimecode(m.duration) : formatBytes(m.size);
    case "image":
      return m.width && m.height ? `${m.width}×${m.height}` : formatBytes(m.size);
    case "game":
      return formatBytes(m.size);
    case "comic":
      return m.pageCount ? `${m.pageCount} pages` : formatBytes(m.size);
    default:
      return formatBytes(m.size);
  }
}

/** First tag name, else the kind label — the tile's secondary line. */
export function primaryTag(m: Media): string {
  if (m.tags && m.tags.length) return m.tags[0].name;
  return KIND_META[m.kind].label.replace(/s$/, "");
}

// --- Favorites -------------------------------------------------------------
// The backend has no favorite-mutation endpoint yet, so favorites are held
// client-side in localStorage. Swap these three functions for API calls once
// a PATCH /api/media/{id} (or similar) exists.
const FAV_KEY = "oppai_favorites";

export function loadFavorites(): Set<number> {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    if (!raw) return new Set();
    return new Set((JSON.parse(raw) as number[]).filter((n) => typeof n === "number"));
  } catch {
    return new Set();
  }
}

export function saveFavorites(favs: Set<number>): void {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify([...favs]));
  } catch {
    /* ignore quota / private-mode errors */
  }
}

// --- Comic reader ----------------------------------------------------------
// How a page is sized ("page" fits the whole page on screen, "width" fills the
// column and scrolls) and where the reader left off, per comic. Both are
// per-device preferences, so they live client-side.

export type ComicFit = "page" | "width";

const FIT_KEY = "oppai_comic_fit";
const POS_KEY = "oppai_comic_pos";

export function loadComicFit(): ComicFit {
  return localStorage.getItem(FIT_KEY) === "width" ? "width" : "page";
}

export function saveComicFit(fit: ComicFit): void {
  try {
    localStorage.setItem(FIT_KEY, fit);
  } catch {
    /* ignore */
  }
}

function readPositions(): Record<string, number> {
  try {
    const raw = localStorage.getItem(POS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

/** The page this comic was last left on (1 if never opened). */
export function loadComicPage(id: number): number {
  const n = readPositions()[String(id)];
  return typeof n === "number" && n >= 1 ? n : 1;
}

export function saveComicPage(id: number, page: number): void {
  try {
    const all = readPositions();
    all[String(id)] = page;
    localStorage.setItem(POS_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}
