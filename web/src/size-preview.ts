/**
 * The Size pane's picture of the size: a frame drawn to scale, so 512×768 and
 * 832×1216 look like the same shape at two sizes rather than two pairs of numbers.
 *
 * The frame is scaled against a fixed reference rather than fitted to its box, which
 * is the point — a fitted frame would draw every portrait size the same. The
 * reference is the largest an SDXL size goes on its long side, and anything past it
 * is drawn at the box's edge.
 */

/** The long side, in pixels, that fills the preview box. */
export const PREVIEW_REFERENCE = 1280;

function gcd(a: number, b: number): number {
  while (b) [a, b] = [b, a % b];
  return a;
}

/** The common ratios a size is close enough to be called by, and what they are. */
const NAMED: { w: number; h: number; name: string }[] = [
  { w: 1, h: 1, name: "square" },
  { w: 2, h: 3, name: "portrait photo" },
  { w: 3, h: 2, name: "landscape photo" },
  { w: 3, h: 4, name: "portrait" },
  { w: 4, h: 3, name: "classic screen" },
  { w: 9, h: 16, name: "phone screen" },
  { w: 16, h: 9, name: "widescreen" },
  { w: 9, h: 21, name: "tall phone" },
  { w: 21, h: 9, name: "ultrawide" },
  { w: 4, h: 5, name: "portrait post" },
  { w: 5, h: 4, name: "landscape print" },
];

/**
 * The size's ratio as a person says it ("2:3"), with a name when it is near one of
 * the common ones. Sizes snap to multiples of 8 and SDXL's buckets are not exact
 * ratios (832×1216 is 13:19), so within 3% counts as the named ratio.
 */
export function aspectLabel(width: number, height: number): { ratio: string; name: string } {
  if (width <= 0 || height <= 0) return { ratio: "", name: "" };
  const r = width / height;
  const near = NAMED.find((n) => Math.abs(r / (n.w / n.h) - 1) <= 0.03);
  if (near) return { ratio: `${near.w}:${near.h}`, name: near.name };
  const g = gcd(width, height);
  const w = width / g;
  const h = height / g;
  // A ratio of large numbers says nothing; a decimal against 1 reads better.
  if (w > 32 || h > 32) {
    return r >= 1 ? { ratio: `${r.toFixed(2)}:1`, name: "" } : { ratio: `1:${(1 / r).toFixed(2)}`, name: "" };
  }
  return { ratio: `${w}:${h}`, name: "" };
}

/** Megapixels, as one decimal ("0.4 MP"). */
export function megapixels(width: number, height: number): string {
  return `${((width * height) / 1_000_000).toFixed(1)} MP`;
}

/** The frame's size in a square box of `box` CSS pixels: to scale against the
    reference, and never bigger than the box. */
export function previewFrame(width: number, height: number, box: number): { width: number; height: number } {
  const long = Math.max(width, height, 1);
  const scale = box / Math.max(PREVIEW_REFERENCE, long);
  return { width: Math.max(4, Math.round(width * scale)), height: Math.max(4, Math.round(height * scale)) };
}
