/**
 * The gallery's pictures under the day they were made.
 *
 * A gallery of every run is hundreds of near-identical tiles, and the one thing a
 * person remembers about a picture they want back is roughly when they made it. So
 * when the gallery is in date order its grid is broken under headings — Today,
 * Yesterday, the weekday for the rest of this week, then dates — instead of one
 * undivided wall. In size order the days mean nothing and there are no headings.
 */

import type { GalleryImage } from "./api.js";

export interface DayGroup<T> {
  /** A stable key for the day ("2026-10-27"), or "undated". */
  key: string;
  label: string;
  items: T[];
}

function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Whole local days from a to b, ignoring the time of day. */
function daysBetween(a: Date, b: Date): number {
  const start = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const end = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((end - start) / 86_400_000);
}

/** What a day is called under its heading, seen from now. */
export function dayLabel(when: Date, now: Date, locale?: string): string {
  const ago = daysBetween(when, now);
  if (ago === 0) return "Today";
  if (ago === 1) return "Yesterday";
  if (ago > 1 && ago < 7) return when.toLocaleDateString(locale, { weekday: "long" });
  const sameYear = when.getFullYear() === now.getFullYear();
  return when.toLocaleDateString(locale, sameYear
    ? { weekday: "short", day: "numeric", month: "long" }
    : { day: "numeric", month: "long", year: "numeric" });
}

/**
 * The pictures in runs of one day each, in the order they came. The pages are
 * already sorted, so a day is a run of neighbours; a picture with no date (InvokeAI
 * leaves some without) goes under "Undated" wherever it falls.
 */
export function groupByDay<T extends Pick<GalleryImage, "created">>(items: T[], now: Date, locale?: string): DayGroup<T>[] {
  const out: DayGroup<T>[] = [];
  for (const item of items) {
    const when = item.created ? new Date(item.created) : null;
    const valid = when && !Number.isNaN(when.getTime());
    const key = valid ? dayKey(when) : "undated";
    const last = out[out.length - 1];
    if (last && last.key === key) {
      last.items.push(item);
      continue;
    }
    out.push({ key, label: valid ? dayLabel(when, now, locale) : "Undated", items: [item] });
  }
  return out;
}
