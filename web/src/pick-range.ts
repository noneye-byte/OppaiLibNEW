/**
 * Picking several tiles with the keyboard's help, as a file manager does: Ctrl (or
 * ⌘) and a click toggles one tile, Shift and a click takes in every tile from the
 * last one clicked to this one. A modified click starts picking from a grid that was
 * not in select mode, so a desktop never needs the Select button at all.
 *
 * Shared by the library grid and the studio's gallery. Kept apart from both because
 * the rules are the part worth testing — which tiles a range covers when the anchor
 * has scrolled out of the loaded page, whether a Shift range drops what was already
 * picked — and none of that needs a DOM.
 */

export interface Picking<K> {
  selected: Set<K>;
  /** The tile a Shift range runs from: the last one clicked. */
  anchor: K | null;
}

/** The modifier keys of a click, as an event has them. */
export interface PickKeys {
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
}

/** Whether a click picks rather than opens: any modifier does. */
export function isPickClick(e: PickKeys): boolean {
  return e.shiftKey || e.ctrlKey || e.metaKey;
}

/**
 * The selection after a click on `key`, with the tiles in the order they are shown.
 *
 * A Shift range is added to what is picked, never in place of it: in select mode the
 * picks so far were made one tap at a time, and a range that dropped them would undo
 * that work. A range whose anchor is no longer in `order` (filtered out, or a page
 * the grid has let go of) has nothing to run from, so the click toggles the one tile.
 */
export function pickClick<K>(order: readonly K[], current: Picking<K>, key: K, keys: Pick<PickKeys, "shiftKey">): Picking<K> {
  const selected = new Set(current.selected);
  const from = current.anchor === null ? -1 : order.indexOf(current.anchor);
  const to = order.indexOf(key);
  if (keys.shiftKey && from >= 0 && to >= 0) {
    const [lo, hi] = from <= to ? [from, to] : [to, from];
    for (let i = lo; i <= hi; i++) selected.add(order[i]);
  } else if (selected.has(key)) {
    selected.delete(key);
  } else {
    selected.add(key);
  }
  return { selected, anchor: key };
}
