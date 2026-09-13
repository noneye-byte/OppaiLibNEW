/**
 * What you last opened, so Home can offer it back.
 *
 * The server records when an item was added and when its metadata changed, and
 * neither of those is "when you last watched it" — a library sorted by createdAt
 * shows you what you imported, which after the first week is not what you want. There
 * is no playback-position tracking anywhere in this app, so this does not claim to
 * know where you got to in a video. It knows what you opened and when, which is
 * enough to put the thing you were in the middle of back in front of you, and it is
 * honest about being that rather than dressed up as a progress bar.
 *
 * Per-device on purpose. Which machine you were watching something on is part of what
 * "carry on" means, and syncing it would need a server round-trip on every open.
 */

const KEY = "oppai.recents.v1";

/** How many opens are remembered. Enough for a row that scrolls, not a history. */
const MAX_RECENTS = 24;

export interface RecentOpen {
  id: number;
  at: number;
}

/** Reads the list newest-first, dropping anything malformed. */
export function loadRecents(): RecentOpen[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is RecentOpen =>
        !!entry && typeof entry === "object"
        && typeof (entry as RecentOpen).id === "number" && Number.isFinite((entry as RecentOpen).id)
        && typeof (entry as RecentOpen).at === "number" && Number.isFinite((entry as RecentOpen).at))
      .sort((a, b) => b.at - a.at)
      .slice(0, MAX_RECENTS);
  } catch {
    // A private window, cleared site data, or a foreign value under our key. None of
    // those is a reason for Home to fail to render.
    return [];
  }
}

/**
 * Records that an item was opened, and returns the new list.
 *
 * An item already in the list moves to the front rather than appearing twice: the
 * row answers "what was I watching", and the same film three times is one answer.
 */
export function noteOpened(id: number, now = Date.now()): RecentOpen[] {
  const next = [{ id, at: now }, ...loadRecents().filter((entry) => entry.id !== id)].slice(0, MAX_RECENTS);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked. The list is a convenience; losing it costs nothing.
  }
  return next;
}

/** Drops an item from the list — for one that has been deleted from the library. */
export function forgetOpened(id: number): RecentOpen[] {
  const next = loadRecents().filter((entry) => entry.id !== id);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* see noteOpened */
  }
  return next;
}

/**
 * Orders a set of library items by when they were last opened, newest first.
 *
 * Items never opened are left out entirely rather than sorted to the end: this feeds
 * a row that means "carry on with this", and padding it with things you have never
 * touched would make it another Recently added.
 */
export function recentlyOpened<T extends { id: number }>(items: T[], recents = loadRecents()): T[] {
  const byID = new Map(items.map((item) => [item.id, item]));
  const out: T[] = [];
  for (const entry of recents) {
    const item = byID.get(entry.id);
    // An id with no item behind it is one deleted from the library since. Skipped
    // rather than cleaned up here: a render should not have a side effect.
    if (item) out.push(item);
  }
  return out;
}
