// What a transfer of models between generators says for itself. The transfer runs on
// the server (imagegen/model_transfer.go); this is its plan and its progress in words,
// apart from the panel so the wording can be tested. A size is passed in as formatted by
// the caller, since this module stands alone for the tests to run it.

export type TransferKind = "checkpoints" | "loras" | "vae";

/** The kinds, in the order they are offered and run, as they are called. */
export const TRANSFER_KINDS: { id: TransferKind; label: string; one: string }[] = [
  { id: "checkpoints", label: "Checkpoints", one: "checkpoint" },
  { id: "loras", label: "LoRAs", one: "LoRA" },
  { id: "vae", label: "VAEs", one: "VAE" },
];

export interface TransferPlace {
  id: string;
  label: string;
  dirs: Partial<Record<TransferKind, string>>;
  problem?: string;
}

export interface TransferPlan {
  files: number;
  bytes: number;
  have: number;
  clashes: number;
  byKind: Partial<Record<TransferKind, number>>;
  missing: TransferKind[];
  free: number;
}

export interface TransferJob {
  state: "running" | "done" | "stopped" | "failed";
  from: string;
  to: string;
  files: number;
  bytes: number;
  done: number;
  doneBytes: number;
  current?: string;
  linked: number;
  copied: number;
  have: number;
  clashes: number;
  error?: string;
}

const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function kindName(kind: TransferKind): string {
  return TRANSFER_KINDS.find((k) => k.id === kind)?.label ?? kind;
}

/** Whether a plan has anything to do. */
export function planHasWork(plan: TransferPlan): boolean {
  return plan.files > 0;
}

/** The plan in a sentence or two: what would come across, and what would not. */
export function planSummary(plan: TransferPlan, size: (bytes: number) => string): string {
  const parts: string[] = [];
  if (plan.files > 0) {
    const kinds = TRANSFER_KINDS
      .filter((k) => plan.byKind[k.id])
      .map((k) => count(plan.byKind[k.id]!, k.one));
    parts.push(`${kinds.join(", ")} to bring across, ${size(plan.bytes)}.`);
  } else {
    parts.push("Nothing to bring across.");
  }
  if (plan.have > 0) parts.push(`${count(plan.have, "file")} already there.`);
  if (plan.clashes > 0) {
    parts.push(`${count(plan.clashes, "file")} there by the same name but a different size, left alone.`);
  }
  for (const kind of plan.missing) parts.push(`${kindName(kind)} are skipped: the other side has no folder for them.`);
  return parts.join(" ");
}

/**
 * A warning when the destination may not have room. Only "may": on one filesystem the
 * files are hard linked and take none, and whether they can be is only known by trying.
 */
export function planRoomWarning(plan: TransferPlan, size: (bytes: number) => string): string {
  if (!plan.free || plan.bytes <= plan.free) return "";
  return `That is more than the ${size(plan.free)} free there. It only fits if both folders are on one disk, where files are linked and take no room.`;
}

/** How far a transfer has got, 0–1. */
export function jobShare(job: TransferJob): number {
  if (job.bytes > 0) return Math.min(1, job.doneBytes / job.bytes);
  return job.files > 0 ? Math.min(1, job.done / job.files) : 1;
}

/** A transfer, finished or going, in a line. */
export function jobSummary(job: TransferJob): string {
  const route = `${job.from} to ${job.to}`;
  switch (job.state) {
    case "running":
      return `${job.done} of ${count(job.files, "file")} from ${route}`;
    case "failed":
      return `${route} stopped at ${job.done} of ${count(job.files, "file")}: ${job.error ?? "something went wrong"}`;
    case "stopped":
      return `${route} stopped at ${job.done} of ${count(job.files, "file")}. Running it again carries on from there.`;
  }
  const how = [
    job.linked ? `${job.linked} linked, taking no room` : "",
    job.copied ? `${job.copied} copied` : "",
    job.have ? `${job.have} already there` : "",
    job.clashes ? `${job.clashes} left alone, a different file by that name` : "",
  ].filter(Boolean).join(", ");
  return `${route} finished${how ? `: ${how}` : ""}. The originals are still where they were.`;
}
