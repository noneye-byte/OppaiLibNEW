/**
 * The words around a chub.ai search: its orders, a card's counts and its topics.
 * Pure, beside its test; the screen is views/chub-browse.ts and the fetching is the
 * server's (chub.go).
 */

/** chub's orders, as it names them, and what a person reads. */
export const CHUB_SORTS: { id: string; label: string }[] = [
  { id: "download_count", label: "Most downloaded" },
  { id: "trending_downloads", label: "Trending" },
  { id: "star_count", label: "Most starred" },
  { id: "rating", label: "Best rated" },
  { id: "created_at", label: "Newest" },
  { id: "last_activity_at", label: "Recently updated" },
];

/** A count as a card shows it: 950, 1.2k, 34k, 1.5M. */
export function compactCount(n: number): string {
  if (!Number.isFinite(n) || n < 1000) return String(Math.max(0, Math.round(n || 0)));
  const [div, unit] = n >= 1_000_000 ? [1_000_000, "M"] : [1000, "k"];
  const v = n / div;
  return `${v < 10 ? v.toFixed(1).replace(/\.0$/, "") : Math.round(v)}${unit}`;
}

/**
 * The topics worth showing on a card: not "NSFW", which the card's badge already says,
 * nor the "Expressions" topics that only say there is a pack, and at most `limit`.
 */
export function shownTopics(topics: readonly string[], limit = 4): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of topics) {
    const t = raw.trim();
    const key = t.toLowerCase();
    if (!t || key === "nsfw" || key.startsWith("expressions") || seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length === limit) break;
  }
  return out;
}

/** Whether a card's topics say it comes with an expression pack. */
export function saysItHasExpressions(topics: readonly string[]): boolean {
  return topics.some((t) => t.trim().toLowerCase().startsWith("expressions"));
}
