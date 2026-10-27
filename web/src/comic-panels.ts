/**
 * Cutting a comic page into its panels.
 *
 * A LoRA trained on whole comic pages learns the page: the gutters, the panel
 * borders, the grid of little pictures. What it was wanted for is the art inside
 * them, so the pages are cut along their gutters first and each panel is a picture
 * of its own. A page with no gutters — a cover, a pin-up, a character sheet — comes
 * out whole.
 *
 * The cut is the recursive XY cut the document-layout people use: find the page's
 * background (the gutter colour, from its edge), split the page along every run of
 * rows that is all background, split each piece along its runs of background
 * columns, and so on until nothing splits. Each piece left is trimmed of the
 * background around it and shaved of the line that framed it.
 *
 * It runs on a small copy of the page (the caller scales it down and the rectangles
 * back up): a gutter is still a gutter at 800 pixels, and it is 20 times less to read.
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PanelOptions {
  /** How far a pixel may be from the background and still count as gutter, 0–255. */
  tolerance?: number;
  /** The narrowest gutter that splits panels, as a fraction of the page's shorter side. */
  minGap?: number;
  /** The smallest panel kept, as a fraction of the page's shorter side. */
  minSide?: number;
  /** A piece with less of its area drawn on than this is a caption box or a margin. */
  minInk?: number;
}

const DEFAULTS: Required<PanelOptions> = { tolerance: 28, minGap: 0.008, minSide: 0.12, minInk: 0.12 };

/** The page's background: the commonest colour round its edge, in steps of 16. */
export function backgroundOf(px: Uint8ClampedArray, w: number, h: number): [number, number, number] {
  const counts = new Map<number, { n: number; r: number; g: number; b: number }>();
  const add = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    const key = ((px[i] >> 4) << 8) | ((px[i + 1] >> 4) << 4) | (px[i + 2] >> 4);
    const c = counts.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    c.n++;
    c.r += px[i];
    c.g += px[i + 1];
    c.b += px[i + 2];
    counts.set(key, c);
  };
  for (let x = 0; x < w; x++) {
    add(x, 0);
    add(x, h - 1);
  }
  for (let y = 1; y < h - 1; y++) {
    add(0, y);
    add(w - 1, y);
  }
  let best = { n: 0, r: 255, g: 255, b: 255 };
  for (const c of counts.values()) if (c.n > best.n) best = c;
  return best.n ? [best.r / best.n, best.g / best.n, best.b / best.n] : [255, 255, 255];
}

/** The panels of a page, in reading order (top to bottom, then left to right). */
export function findPanels(px: Uint8ClampedArray, w: number, h: number, options: PanelOptions = {}): Rect[] {
  const o = { ...DEFAULTS, ...options };
  if (w < 4 || h < 4) return [{ x: 0, y: 0, w, h }];
  const [br, bg, bb] = backgroundOf(px, w, h);
  // 1 where something is drawn, 0 on the background.
  const ink = new Uint8Array(w * h);
  for (let i = 0, p = 0; p < ink.length; i += 4, p++) {
    const d = Math.max(Math.abs(px[i] - br), Math.abs(px[i + 1] - bg), Math.abs(px[i + 2] - bb));
    ink[p] = d > o.tolerance ? 1 : 0;
  }
  const short = Math.min(w, h);
  const gap = Math.max(2, Math.round(short * o.minGap));
  const minSide = Math.max(8, Math.round(short * o.minSide));

  const rowInk = (r: Rect, y: number) => {
    let n = 0;
    for (let x = r.x, i = y * w + r.x; x < r.x + r.w; x++, i++) n += ink[i];
    return n;
  };
  const colInk = (r: Rect, x: number) => {
    let n = 0;
    for (let y = r.y, i = r.y * w + x; y < r.y + r.h; y++, i += w) n += ink[i];
    return n;
  };
  // A line is blank when nearly none of it is drawn on: a speck of scan noise, or
  // the tail of a speech bubble poking into the gutter, does not join two panels.
  const blankRow = (r: Rect, y: number) => rowInk(r, y) <= r.w * 0.004;
  const blankCol = (r: Rect, x: number) => colInk(r, x) <= r.h * 0.004;

  const trim = (r: Rect): Rect | null => {
    let { x, y } = r;
    let x2 = r.x + r.w, y2 = r.y + r.h;
    while (y < y2 && blankRow({ x, y, w: x2 - x, h: 1 }, y)) y++;
    while (y2 > y && blankRow({ x, y, w: x2 - x, h: 1 }, y2 - 1)) y2--;
    while (x < x2 && blankCol({ x, y, w: 1, h: y2 - y }, x)) x++;
    while (x2 > x && blankCol({ x, y, w: 1, h: y2 - y }, x2 - 1)) x2--;
    return x2 > x && y2 > y ? { x, y, w: x2 - x, h: y2 - y } : null;
  };

  // The stretches of drawn lines between runs of at least `gap` blank ones.
  const segments = (from: number, to: number, blank: (i: number) => boolean): [number, number][] => {
    const out: [number, number][] = [];
    let start = -1, blankRun = 0;
    for (let i = from; i < to; i++) {
      if (blank(i)) {
        blankRun++;
        if (start >= 0 && blankRun >= gap) {
          out.push([start, i - blankRun + 1]);
          start = -1;
        }
      } else {
        if (start < 0) start = i;
        blankRun = 0;
      }
    }
    if (start >= 0) out.push([start, to - blankRun]);
    return out;
  };

  const leaves: Rect[] = [];
  const cut = (r0: Rect, depth: number) => {
    const r = trim(r0);
    if (!r) return;
    if (depth < 16) {
      const rows = segments(r.y, r.y + r.h, (y) => blankRow(r, y));
      if (rows.length > 1) {
        for (const [a, b] of rows) cut({ x: r.x, y: a, w: r.w, h: b - a }, depth + 1);
        return;
      }
      const cols = segments(r.x, r.x + r.w, (x) => blankCol(r, x));
      if (cols.length > 1) {
        for (const [a, b] of cols) cut({ x: a, y: r.y, w: b - a, h: r.h }, depth + 1);
        return;
      }
    }
    leaves.push(r);
  };
  cut({ x: 0, y: 0, w, h }, 0);

  const inkShare = (r: Rect) => {
    let n = 0;
    for (let y = r.y; y < r.y + r.h; y++) n += rowInk(r, y);
    return n / (r.w * r.h);
  };
  const panels = leaves
    .filter((r) => Math.min(r.w, r.h) >= minSide && inkShare(r) >= o.minInk)
    .map((r) => shaveFrame(px, w, r));
  if (panels.length) return panels;
  // Nothing big enough split off: the page is one picture.
  const whole = trim({ x: 0, y: 0, w, h });
  return [whole ?? { x: 0, y: 0, w, h }];
}

/**
 * Shaves the line a panel is framed in. A border is a run of rows (or columns) at
 * the panel's edge that are one flat colour all the way along; art that runs to
 * the edge is not, so it is left alone. At most a twentieth of the side goes.
 */
export function shaveFrame(px: Uint8ClampedArray, w: number, r: Rect): Rect {
  const flat = (x0: number, y0: number, dx: number, dy: number, n: number) => {
    let i = (y0 * w + x0) * 4;
    const step = (dy * w + dx) * 4;
    // The line is measured against its middle, not its end: on a page read small,
    // the corner pixel is the frame blurred into the gutter beside it.
    const mid = i + step * Math.floor(n / 2);
    const [r0, g0, b0] = [px[mid], px[mid + 1], px[mid + 2]];
    let same = 0;
    for (let k = 0; k < n; k++, i += step) {
      if (Math.max(Math.abs(px[i] - r0), Math.abs(px[i + 1] - g0), Math.abs(px[i + 2] - b0)) <= 40) same++;
    }
    return same >= n * 0.92;
  };
  let { x, y } = r;
  let x2 = r.x + r.w, y2 = r.y + r.h;
  const maxY = Math.max(1, Math.floor(r.h / 20)), maxX = Math.max(1, Math.floor(r.w / 20));
  for (let k = 0; k < maxY && y < y2 - 1 && flat(x, y, 1, 0, x2 - x); k++) y++;
  for (let k = 0; k < maxY && y2 - 1 > y && flat(x, y2 - 1, 1, 0, x2 - x); k++) y2--;
  for (let k = 0; k < maxX && x < x2 - 1 && flat(x, y, 0, 1, y2 - y); k++) x++;
  for (let k = 0; k < maxX && x2 - 1 > x && flat(x2 - 1, y, 0, 1, y2 - y); k++) x2--;
  return { x, y, w: x2 - x, h: y2 - y };
}

/** A rectangle found on a page scaled by `scale`, back on the page at full size. */
export function scaleRect(r: Rect, scale: number, fullW: number, fullH: number): Rect {
  const x = Math.max(0, Math.floor(r.x * scale));
  const y = Math.max(0, Math.floor(r.y * scale));
  return {
    x, y,
    w: Math.min(fullW - x, Math.ceil(r.w * scale)),
    h: Math.min(fullH - y, Math.ceil(r.h * scale)),
  };
}

/**
 * The box a drag across a picture drew, as a crop: corners in either order, kept
 * inside the picture, and no smaller than `minSide` either way — a mis-click is
 * not a picture to train on. Null when the drag was too small.
 */
export function dragRect(
  x0: number, y0: number, x1: number, y1: number, w: number, h: number, minSide = 32,
): Rect | null {
  const cx = (v: number, max: number) => Math.max(0, Math.min(max, v));
  const left = cx(Math.min(x0, x1), w), right = cx(Math.max(x0, x1), w);
  const top = cx(Math.min(y0, y1), h), bottom = cx(Math.max(y0, y1), h);
  if (right - left < minSide || bottom - top < minSide) return null;
  return { x: Math.round(left), y: Math.round(top), w: Math.round(right - left), h: Math.round(bottom - top) };
}
