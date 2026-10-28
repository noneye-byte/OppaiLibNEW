/**
 * What fitting does to a set's pictures before they are sent to the trainer, said on
 * the Train step before the run starts.
 *
 * The server fits every picture to its training bucket — its own shape, filling
 * resolution² in sides of 64 — and enlarges the small ones through the generator's
 * upscaler first (backend/internal/api/lora_fit.go, which this mirrors). This is that
 * arithmetic again, so the screen can say how many pictures will be enlarged and to
 * what, without asking.
 */

const MIN_SIDE = 256;

/** The resolution a run trains at: the one asked for, else the trainer's for the
    checkpoint's family, held to 768 for a low-VRAM run. An unknown family is SDXL,
    as the server takes it. */
export function trainResolution(asked: number, family: string, lowVram: boolean): number {
  let res = asked > 0 ? asked : looksSD1(family) ? 512 : 1024;
  if (lowVram && res > 768) res = 768;
  return Math.floor(res / 64) * 64;
}

export function looksSD1(family: string): boolean {
  const f = family.toLowerCase();
  if (/xl|pony|illustrious|noob/.test(f)) return false;
  return /sd ?1|1\.5|sd15/.test(f);
}

/** The size a w×h picture is trained at. */
export function trainBucket(w: number, h: number, res: number): { width: number; height: number } {
  if (w <= 0 || h <= 0 || res <= 0) return { width: 0, height: 0 };
  const scale = Math.sqrt((res * res) / (w * h));
  const maxSide = Math.max(res * 2, 1024);
  const clamp = (v: number) => Math.min(Math.max(Math.floor(v / 64) * 64, MIN_SIDE), maxSide);
  let bw = clamp(w * scale);
  let bh = clamp(h * scale);
  while (bw * bh > res * res && (bw > MIN_SIDE || bh > MIN_SIDE)) {
    if (bw >= bh) bw -= 64;
    else bh -= 64;
  }
  return { width: bw, height: bh };
}

/** How many of the pictures are smaller than their bucket by enough that the
    generator's upscaler enlarges them (more than a quarter), of those whose size is
    known. */
export function picturesToEnlarge(items: { width?: number; height?: number }[], res: number): number {
  let n = 0;
  for (const it of items) {
    if (!it.width || !it.height) continue;
    const b = trainBucket(it.width, it.height, res);
    if (Math.max(b.width / it.width, b.height / it.height) > 1.25) n++;
  }
  return n;
}
