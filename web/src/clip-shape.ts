// The size and length of a clip, as the Video studio asks for them.
//
// Video models are fussier than picture ones. Every one of them wants sides in
// multiples of 16 for its latent, and Wan wants a frame count of 4n+1 and LTX one of
// 8n+1 — the first frame plus whole blocks of motion. So the drawer talks in seconds
// and a longer side, and these turn them into what a workflow will accept.

/** The longer sides offered, smallest first. 832 is what Wan 2.x is trained at. */
export const CLIP_SIDES = [480, 640, 832, 1024, 1280] as const;

/** The shapes a clip from words can take; one from a picture takes the picture's. */
export const CLIP_ASPECTS = [
  { id: "portrait", label: "Portrait", w: 9, h: 16 },
  { id: "square", label: "Square", w: 1, h: 1 },
  { id: "landscape", label: "Landscape", w: 16, h: 9 },
] as const;

export type ClipAspect = (typeof CLIP_ASPECTS)[number]["id"];

/** A size in the shape of w×h whose longer side is `long`, both sides in sixteens. */
export function clipSize(w: number, h: number, long: number): { width: number; height: number } {
  const side = (v: number) => Math.max(64, Math.round(v / 16) * 16);
  if (!(w > 0) || !(h > 0)) return { width: side(long), height: side(long) };
  const short = (long * Math.min(w, h)) / Math.max(w, h);
  return w >= h ? { width: side(long), height: side(short) } : { width: side(short), height: side(long) };
}

/** The frame count for a length: the nearest 8n+1, which suits Wan and LTX both. */
export function clipFrames(seconds: number, fps: number): number {
  const n = Math.round((Math.max(0, seconds) * Math.max(1, fps)) / 8);
  return Math.max(1, n) * 8 + 1;
}

/** How long a frame count plays for, to a tenth of a second. */
export function clipSeconds(frames: number, fps: number): number {
  return Math.round(((frames - 1) / Math.max(1, fps)) * 10) / 10;
}

/**
 * Where to seek a clip to show its last frame, for carrying a clip on from where it
 * ended. Not the duration itself: seeking to the very end lands past the last frame in
 * some browsers and paints nothing, so it stops half a frame short.
 */
export function lastFrameTime(duration: number, fps: number): number {
  if (!(duration > 0)) return 0;
  return Math.max(0, duration - 0.5 / Math.max(1, fps));
}

/** The longest side a picture to start a clip from is sent at. Wan draws at 832 and the
    studio offers up to 1280, so a phone's 4000-pixel photo is fifteen times the pixels
    it needs — and, as a data URL in the request, enough to be turned away by a reverse
    proxy's body limit before the server sees it. */
export const MAX_START_SIDE = 1536;

/** The size a picture is sent at: as it is, or shrunk to fit MAX_START_SIDE. */
export function startFrameSize(w: number, h: number, max = MAX_START_SIDE): { width: number; height: number; shrunk: boolean } {
  const long = Math.max(w, h);
  if (!(long > max)) return { width: w, height: h, shrunk: false };
  const k = max / long;
  return { width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)), shrunk: true };
}
