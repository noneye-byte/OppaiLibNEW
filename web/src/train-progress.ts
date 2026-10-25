import type { Training, TrainingStatus } from "./api.js";

/**
 * How a LoRA training run reads on the Train screen: one line saying where it is,
 * and how far along, from what the trainer reports. The trainer's phases come off
 * sd-scripts' own output (trainer/server.py), so the words here are the ones a
 * person would use for them rather than the log's.
 */

const PHASES: Record<string, string> = {
  waiting: "Waiting for the GPU",
  receiving: "Receiving the pictures",
  loading: "Loading the checkpoint",
  caching: "Preparing the pictures",
  training: "Training",
  sampling: "Rendering a sample",
  saving: "Saving",
  // The trainer has finished; the server has not looked since.
  done: "Finished — installing next",
  error: "Stopping",
  cancelled: "Stopping",
};

const STATUSES: Record<TrainingStatus, string> = {
  preparing: "Sending the pictures",
  queued: "Waiting for the GPU",
  training: "Training",
  installing: "Installing into the generator",
  done: "Ready to use",
  failed: "Failed",
  cancelled: "Cancelled",
};

/** Whether the run still has something to do. */
export function trainingActive(t: Pick<Training, "status">): boolean {
  return t.status === "preparing" || t.status === "queued" || t.status === "training" || t.status === "installing";
}

/** How far along a run is, 0–1, or null when there is no measure yet. Steps are
 *  the whole of it: caching and loading take minutes, but there is no count to
 *  show for them, so the bar waits rather than inventing one. */
export function trainingFraction(t: Training): number | null {
  if (t.status === "done" || t.status === "installing") return 1;
  if (!t.total || t.total <= 0 || t.step === undefined) return null;
  return Math.max(0, Math.min(1, t.step / t.total));
}

/** The one line under a run's name. */
export function trainingLine(t: Training): string {
  if (t.status === "failed") return t.error ? `Failed: ${t.error}` : "Failed";
  if (t.status !== "training") return STATUSES[t.status] ?? t.status;
  const phase = PHASES[t.phase ?? ""] ?? "Training";
  if (t.phase !== "training" || !t.total) return phase;
  const parts = [`Step ${t.step ?? 0} of ${t.total}`];
  if (t.epoch && t.epochs) parts.push(`epoch ${t.epoch}/${t.epochs}`);
  if (t.eta && t.eta !== "?" && t.eta !== "00:00") parts.push(`${t.eta} left`);
  if (t.loss) parts.push(`loss ${t.loss.toFixed(3)}`);
  return parts.join(" · ");
}

/** A trigger word from a LoRA's name: one unusual token, lower-case, which is what
 *  a trigger has to be to mean this LoRA and nothing the checkpoint already knows. */
export function triggerFrom(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/** Adds a tag to the leave-out list, or takes it out if it is there. */
export function toggleTag(list: string[], tag: string): string[] {
  const key = tag.trim().toLowerCase();
  return list.some((t) => t.trim().toLowerCase() === key) ? list.filter((t) => t.trim().toLowerCase() !== key) : [...list, tag.trim()];
}
