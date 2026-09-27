// Watching a picture being made, from a conversation.
//
// A picture she takes used to arrive out of nowhere: the typing dots, then — twenty or
// forty seconds later, or never — a photo. The studio has shown a run's progress since
// it could be cancelled (api.genProgress), and a generation the chat asks for is the
// same kind of run, so it is named with a job id and watched the same way: a poll a
// second, the step count and the picture so far.
//
// The merge is the part worth testing, so it is here and not inside a component. The
// server withholds a preview that has not changed since the sequence number the poll
// sent, and a report without one means "keep the picture you have", not "no picture".

import type { GenProgress } from "./api.js";

/** A fresh job id, in the shape the server accepts (4–64 of [A-Za-z0-9_-]). */
export function newJobId(): string {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  return "chat-" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** The progress to show after a poll: the new report, keeping the last preview when the
    server withheld an unchanged one, and the last known step total when it has none. */
export function mergeProgress(prev: GenProgress | null, next: GenProgress): GenProgress {
  return {
    ...next,
    image: next.image ?? prev?.image,
    total: next.total || prev?.total || 0,
  };
}

/** A few words for where a run is: "Starting…", "Step 12 of 30", "Finishing…". */
export function progressLabel(progress: GenProgress | null): string {
  if (!progress || (!progress.step && !progress.percent)) return "Starting…";
  if (progress.done || progress.percent >= 1) return "Finishing…";
  if (progress.total) return `Step ${Math.min(progress.step, progress.total)} of ${progress.total}`;
  return `${Math.round(progress.percent * 100)}%`;
}

/** How far along a run is, 0–100, for a bar. The server's `percent` is a fraction. */
export function progressPercent(progress: GenProgress | null): number {
  if (!progress) return 0;
  if (progress.done) return 100;
  if (progress.percent > 0) return Math.min(100, progress.percent * 100);
  if (progress.total) return Math.min(100, (progress.step / progress.total) * 100);
  return 0;
}

/**
 * Polls a named run until it is done or the returned stop is called, handing each
 * merged report to `onProgress`. Errors — a 404 before the server has registered the
 * job, a blip — are polled through, the way the studio does.
 */
export function watchGeneration(
  jobId: string,
  onProgress: (progress: GenProgress) => void,
  poll: (jobId: string, seen: number) => Promise<GenProgress>,
): () => void {
  let stopped = false;
  let timer = 0;
  let last: GenProgress | null = null;
  const tick = async () => {
    if (stopped) return;
    try {
      const next = await poll(jobId, last?.seq ?? 0);
      if (stopped) return;
      last = mergeProgress(last, next);
      onProgress(last);
      if (next.done) return;
    } catch {
      /* Not registered yet, or a blip: keep polling. */
    }
    timer = window.setTimeout(() => void tick(), 1000);
  };
  timer = window.setTimeout(() => void tick(), 600);
  return () => {
    stopped = true;
    window.clearTimeout(timer);
  };
}
