// Paint to fix: the arithmetic behind the mask painter (views/imagegen-paint.ts).
//
// The painter draws over a picture shown at whatever size the screen allows, but the
// mask it hands the generator has to be the picture's own size, pixel for pixel — the
// generator keeps everything outside the white exactly as it was. So the strokes are
// kept in the picture's pixels from the start and drawn twice: scaled onto the screen,
// and at full size, white on black, as the mask.

/** A point on the picture, in its own pixels. */
export interface PaintPoint {
  x: number;
  y: number;
}

/** One stroke of the brush or the eraser, in the picture's pixels. */
export interface PaintStroke {
  erase: boolean;
  /** The brush's diameter, in the picture's pixels. */
  size: number;
  points: PaintPoint[];
}

/** Where a pointer is on a picture drawn to fill `rect`, in the picture's pixels. */
export function pictureAt(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  width: number,
  height: number,
): PaintPoint {
  const x = rect.width > 0 ? ((clientX - rect.left) / rect.width) * width : 0;
  const y = rect.height > 0 ? ((clientY - rect.top) / rect.height) * height : 0;
  return { x: Math.max(0, Math.min(width, x)), y: Math.max(0, Math.min(height, y)) };
}

/**
 * The brush's diameter in the picture's pixels, from the slider's share of the
 * picture's short side — so "a medium brush" covers the same part of a face on a
 * 512-pixel picture as on a 2048-pixel one.
 */
export function brushPixels(fraction: number, width: number, height: number): number {
  return Math.max(2, Math.round(Math.min(width, height) * fraction));
}

/**
 * The size to generate at when starting from a picture: its own, scaled down to fit
 * the generator's limit with its shape kept, in the multiples of eight a latent
 * needs. The server clamps width and height each on its own, which would squash a
 * tall picture; this keeps it tall.
 */
export function sourceSize(width: number, height: number, max = 2048): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: 512, height: 512 };
  const scale = Math.min(1, max / Math.max(width, height));
  const fit = (v: number) => Math.max(64, Math.floor((v * scale) / 8) * 8);
  return { width: fit(width), height: fit(height) };
}

/** How much of a mask is painted: the share of its pixels that are white enough to
    be repainted, read off the red channel of RGBA pixels. */
export function paintedShare(rgba: Uint8ClampedArray): number {
  const pixels = Math.floor(rgba.length / 4);
  if (pixels === 0) return 0;
  let white = 0;
  for (let i = 0; i < pixels; i++) if (rgba[i * 4] >= 128) white++;
  return white / pixels;
}

/** Whether the strokes paint anything at all — an eraser on an empty mask does not. */
export function paintsAnything(strokes: PaintStroke[]): boolean {
  return strokes.some((s) => !s.erase && s.points.length > 0);
}

/**
 * The points to stamp between two pointer readings, so a fast drag draws a line and
 * not a row of dots: one every third of the brush, which overlaps into a smooth edge.
 */
export function stampsBetween(from: PaintPoint, to: PaintPoint, size: number): PaintPoint[] {
  const step = Math.max(1, size / 3);
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  const n = Math.max(1, Math.ceil(dist / step));
  const out: PaintPoint[] = [];
  for (let i = 1; i <= n; i++) {
    out.push({ x: from.x + ((to.x - from.x) * i) / n, y: from.y + ((to.y - from.y) * i) / n });
  }
  return out;
}
