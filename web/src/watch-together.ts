/**
 * Watching a video with her: when to show her the screen, and how big.
 *
 * The viewer sends her a frame of what is playing every so often and she decides
 * whether it is worth a word (backend/internal/api/libby_watch.go). The frame comes
 * from the playing <video> itself, drawn to a canvas, because the video is already
 * decoded here — the server would otherwise decrypt the whole file to read one frame.
 * The pacing is pure, so it is here with its tests rather than in the viewer.
 */

/** How often a frame goes to her while the video plays. The server holds its own,
    longer floor between things she says; this only bounds how often she is asked. */
export const WATCH_EVERY_MS = 45_000;

/** How long something she said stays over the video. */
export const WATCH_LINE_MS = 9_000;

/** The longest side of a frame sent to her. Her eyes downscale to 768 anyway; this
    keeps the upload a few dozen kilobytes. */
export const WATCH_FRAME_EDGE = 640;

const PREF_KEY = "oppai_watch_with_libby";

/** Whether this tick should send a frame: on, playing, nothing in flight, and long
    enough since the last. A video just opened waits a while before the first one. */
export function watchDue(opts: { on: boolean; playing: boolean; inFlight: boolean; now: number; last: number }): boolean {
  if (!opts.on || !opts.playing || opts.inFlight) return false;
  return opts.now - opts.last >= WATCH_EVERY_MS;
}

/** The size a frame is drawn at: the video's own shape, its longer side at most edge. */
export function frameSize(width: number, height: number, edge = WATCH_FRAME_EDGE): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: edge, height: Math.round(edge * 9 / 16) };
  const scale = Math.min(1, edge / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export function loadWatchPref(): boolean {
  try { return localStorage.getItem(PREF_KEY) === "1"; } catch { return false; }
}

export function saveWatchPref(on: boolean): void {
  try { localStorage.setItem(PREF_KEY, on ? "1" : "0"); } catch { /* private mode: it lasts the session */ }
}
