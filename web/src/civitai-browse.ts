// The arithmetic of browsing Civitai the way the site is browsed: a model's page with
// the pictures people made with it, a picture opened with the rest of its post beside it,
// and the reactions and comments under each. Kept apart from views/civitai.ts so it can
// be tested without a browser.

import type { CivitaiComment, CivitaiImage, CivitaiImageStats } from "./api.js";

/** One kind of reaction as the site shows it: its glyph and how many. */
export interface Reaction {
  kind: keyof CivitaiImageStats;
  icon: string;
  label: string;
  n: number;
}

const REACTIONS: { kind: keyof CivitaiImageStats; icon: string; label: string }[] = [
  { kind: "hearts", icon: "favorite", label: "Hearts" },
  { kind: "likes", icon: "thumb_up", label: "Likes" },
  { kind: "laughs", icon: "sentiment_satisfied", label: "Laughs" },
  { kind: "cries", icon: "face", label: "Cries" },
];

/** The reactions a picture has, the ones nobody gave left out, and their sum. Comments
 *  are counted apart: they are not a reaction, they are a conversation to open. */
export function reactionsOf(stats?: CivitaiImageStats): { list: Reaction[]; total: number; comments: number } {
  if (!stats) return { list: [], total: 0, comments: 0 };
  const list = REACTIONS.map((r) => ({ ...r, n: Math.max(0, stats[r.kind] ?? 0) })).filter((r) => r.n > 0);
  return { list, total: list.reduce((sum, r) => sum + r.n, 0), comments: Math.max(0, stats.comments ?? 0) };
}

/**
 * The next page of a feed added to what is shown, without the pictures already there.
 * The site's cursors are positions in a list that keeps changing under them (a new
 * reaction reorders "most reactions"), so a page can repeat the end of the last one —
 * and a repeated picture is a repeated key in the grid.
 */
export function mergeImages(shown: CivitaiImage[], page: CivitaiImage[]): CivitaiImage[] {
  const seen = new Set(shown.map((i) => i.id));
  const out = shown.slice();
  for (const img of page) {
    if (seen.has(img.id)) continue;
    seen.add(img.id);
    out.push(img);
  }
  return out;
}

/** Where a picture sits in the list it was opened from, and its neighbours either way. */
export function neighbours<T extends { id: number }>(list: T[], id: number): { index: number; prev?: T; next?: T } {
  const index = list.findIndex((x) => x.id === id);
  if (index < 0) return { index: -1 };
  return { index, prev: list[index - 1], next: list[index + 1] };
}

/** The pictures of a post in the order they were posted, the opened one first when the
 *  post is not known yet — so the strip is never empty while it loads. */
export function postPictures(current: CivitaiImage, post: CivitaiImage[] | undefined): CivitaiImage[] {
  if (!post?.length) return [current];
  return post.some((p) => p.id === current.id) ? post : [current, ...post];
}

/** How long ago, the way a comment says it: "just now", "5m", "3h", "2d", then a date. */
export function timeAgo(iso: string | undefined, now: number = Date.now()): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d`;
  const date = new Date(t);
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return date.toLocaleDateString(undefined, sameYear ? { month: "short", day: "numeric" } : { year: "numeric", month: "short", day: "numeric" });
}

/** A comment section's pages joined, a comment repeated across a page boundary once. */
export function mergeComments(shown: CivitaiComment[], page: CivitaiComment[]): CivitaiComment[] {
  const seen = new Set(shown.map((c) => c.id));
  return [...shown, ...page.filter((c) => !seen.has(c.id))];
}

/** A compact count: 1.2k, 3.4M. */
export function compactNumber(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, "")}k`;
  return String(Math.round(n));
}

/**
 * A Civitai CDN picture at a width for a tile. The CDN names its variants in the path
 * ("/original=true/", "/width=450/"), and the feed hands out originals — a gallery of
 * thirty of those is a hundred megabytes for tiles a few hundred pixels wide. Only the
 * width is touched: a clip's still is "anim=false,transcode=true,…", and dropping those
 * asks the CDN for the clip itself, which an <img> cannot draw. Anything not shaped like
 * the CDN's is left alone.
 */
export function civitaiSized(url: string, width: number): string {
  const m = /^(https:\/\/image\.civitai\.com\/[^/]+\/[^/]+\/)([^/]+)(\/[^/]+)$/.exec(url);
  if (!m) return url;
  const w = `width=${Math.round(width)}`;
  const options = m[2];
  if (options === "original=true") return `${m[1]}${w}${m[3]}`;
  if (/(^|,)width=\d+(,|$)/.test(options)) return `${m[1]}${options.replace(/(^|,)width=\d+/, `$1${w}`)}${m[3]}`;
  return url;
}
