/**
 * The sizes an upscale comes out at, worked out the way the server holds them
 * (clampUpscale and upscaleFactor in api/handlers_imagegen.go), so the studio can
 * say "1024×1536" before the run rather than after it.
 *
 * Two kinds. A hires fix draws the picture at the size asked for, enlarges it and
 * draws it again at the larger size, so the detail is the model's — but the second
 * pass costs as much as the first and more, so the larger side stops at 4096. An
 * upscale of a finished picture only enlarges it (ESRGAN and the like), which is
 * cheap, so it may go to 8192.
 */

export const MAX_HIRES_SIDE = 4096;
export const MAX_UPSCALED_SIDE = 8192;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** The factor a hires fix of a w×h picture will really use. */
export function hiresScale(w: number, h: number, scale: number): number {
  const asked = scale > 1 ? scale : 2;
  return round2(Math.max(1, Math.min(asked, 4, MAX_HIRES_SIDE / Math.max(w, h, 1))));
}

/** The factor an upscale of a w×h picture will really use. */
export function upscaleFactor(w: number, h: number, factor: number): number {
  const asked = Math.min(factor > 1 ? factor : 2, 4);
  const side = Math.max(w, h);
  if (side > 0 && side * asked > MAX_UPSCALED_SIDE) return Math.max(1, MAX_UPSCALED_SIDE / side);
  return asked;
}

/** A picture's size once enlarged by factor, rounded as A1111 rounds it. */
export function scaledSize(w: number, h: number, factor: number): { width: number; height: number } {
  return { width: Math.round(w * factor), height: Math.round(h * factor) };
}

/** The hires fix's choices: latent modes first (A1111's own default), then the
    upscaler models, without repeats. */
export function hiresUpscalers(latent: string[] | undefined, models: string[] | undefined): string[] {
  return [...new Set([...(latent ?? []), ...(models ?? [])])];
}
