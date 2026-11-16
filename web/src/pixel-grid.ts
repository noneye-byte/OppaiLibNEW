// Pixel-art sprites.
//
// A sprite set can be drawn as pixel art. The picture itself is made so on Forge, by
// the sd-pixel extension (backend/internal/imagegen/pixel.go): shrunk by a whole factor
// to a grid of int(width / size) × int(height / size) cells, optionally held to a
// palette, and blown back up to its size with nearest-neighbour, so every cell is one
// flat colour and the rest of the studio takes it as any other picture.
//
// What it does not reach is the transparency. The cutout's edge is cut a pixel at a
// time and feathered, which on pixel art leaves cells half-cut and soft: no pixel-art
// sprite has a cell that is partly there. So the cutout of a pixel-art square is put
// on the same grid — each cell her or not, by how much of it the cut kept — and so is
// its clip, on the server (matte/grid.go), whose frames Wan draws soft at its own size.
//
// The grid is kept in cells rather than pixels for that reason: a clip is not the
// picture's size, and a cell is placed as a nearest-neighbour enlargement places it, at
// any size.

/** The cell sizes offered, in the picture's pixels. Small enough to keep her face
    readable at a sprite's size; sd-pixel goes to 32. */
export const PIXEL_SIZES = [4, 6, 8, 12, 16] as const;

/** The palettes offered; 0 leaves the colours be. */
export const PIXEL_PALETTES = [0, 64, 32, 16] as const;

/** A stored cell size as one the board offers, 0 (off) for anything else: a draft or a
    saved set is whatever some client wrote. */
export function pixelSize(v: unknown): number {
  return typeof v === "number" && (PIXEL_SIZES as readonly number[]).includes(v) ? v : 0;
}

/** A stored palette as one the board offers, 0 (any colours) for anything else. */
export function pixelPalette(v: unknown): number {
  return typeof v === "number" && (PIXEL_PALETTES as readonly number[]).includes(v) ? v : 0;
}

export interface PixelArt {
  /** The side of a cell in the picture's pixels; under 2 is not pixel art. */
  size: number;
  /** How many colours the picture is held to; 0 for any. */
  palette: number;
}

export interface Grid {
  cols: number;
  rows: number;
}

/** A square's pixel art, from the config it was drawn with; null when it is not. */
export function pixelOfConfig(config: string | undefined): PixelArt | null {
  if (!config) return null;
  try {
    const c = JSON.parse(config) as { pixel?: unknown; palette?: unknown };
    const size = typeof c.pixel === "number" ? Math.floor(c.pixel) : 0;
    if (size < 2) return null;
    return { size, palette: typeof c.palette === "number" ? Math.max(0, Math.floor(c.palette)) : 0 };
  } catch {
    return null;
  }
}

/** The cells sd-pixel shrinks a width×height picture to with cells of side size. */
export function gridFor(width: number, height: number, size: number): Grid {
  return { cols: Math.max(1, Math.trunc(width / size)), rows: Math.max(1, Math.trunc(height / size)) };
}

/** The cell of each of n pixels across a side of `cells` cells: where a
    nearest-neighbour enlargement from cells to n takes each pixel from. */
export function cellsAcross(n: number, cells: number): Int32Array {
  const out = new Int32Array(n);
  for (let x = 0; x < n; x++) out[x] = Math.min(cells - 1, Math.floor(((x + 0.5) * cells) / n));
  return out;
}

/** The alpha of a w×h picture put on the grid: each cell all there or not at all, by
    whether at least half of it was kept. */
export function snapAlpha(alpha: ArrayLike<number>, w: number, h: number, grid: Grid): Uint8Array {
  const cols = Math.min(grid.cols, w), rows = Math.min(grid.rows, h);
  const colOf = cellsAcross(w, cols), rowOf = cellsAcross(h, rows);
  const sum = new Float64Array(cols * rows), count = new Uint32Array(cols * rows);
  for (let y = 0; y < h; y++) {
    const row = rowOf[y] * cols;
    for (let x = 0; x < w; x++) {
      const c = row + colOf[x];
      sum[c] += alpha[y * w + x];
      count[c]++;
    }
  }
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const row = rowOf[y] * cols;
    for (let x = 0; x < w; x++) {
      const c = row + colOf[x];
      out[y * w + x] = sum[c] >= 128 * count[c] ? 255 : 0;
    }
  }
  return out;
}
