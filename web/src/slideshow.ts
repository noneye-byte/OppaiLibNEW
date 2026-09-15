/**
 * Hands-free browsing.
 *
 * The viewer already pages through a queue with the arrow keys; a slideshow is that
 * with nobody pressing them. What is decided here is only *which* item comes next
 * and how long a still stays — the viewer owns the timer, because it is the thing
 * that knows when a video has finished playing.
 */

export interface SlideshowPrefs {
  /** How long a still or a gif stays on stage, in seconds. */
  dwellSec: number;
  /** Draw the next item from the queue rather than taking it in order. */
  shuffle: boolean;
}

const KEY = "oppai.slideshow";
const DEFAULTS: SlideshowPrefs = { dwellSec: 8, shuffle: false };
const DWELL_MIN = 2;
const DWELL_MAX = 120;

export function loadSlideshow(): SlideshowPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<SlideshowPrefs>;
    return normalize(parsed);
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSlideshow(prefs: SlideshowPrefs): SlideshowPrefs {
  const clean = normalize(prefs);
  try { localStorage.setItem(KEY, JSON.stringify(clean)); } catch { /* private window */ }
  return clean;
}

function normalize(prefs: Partial<SlideshowPrefs>): SlideshowPrefs {
  const dwell = Number(prefs.dwellSec);
  return {
    dwellSec: Number.isFinite(dwell) ? Math.min(DWELL_MAX, Math.max(DWELL_MIN, Math.round(dwell))) : DEFAULTS.dwellSec,
    shuffle: !!prefs.shuffle,
  };
}

/**
 * The id to show after `current`, or null when the run is over.
 *
 * In order, the run ends at the last item rather than wrapping: a slideshow that
 * loops forever is one you have to notice has finished. Shuffled, it never lands
 * on the item that is already up and only ends when there is nothing else, so a
 * two-item queue alternates rather than stalling.
 */
export function nextSlide(queue: number[], current: number, shuffle: boolean, random: () => number = Math.random): number | null {
  const others = queue.filter((id) => id !== current);
  if (others.length === 0) return null;
  if (shuffle) return others[Math.floor(random() * others.length)] ?? null;
  const at = queue.indexOf(current);
  if (at < 0) return queue[0] ?? null;
  return queue[at + 1] ?? null;
}
