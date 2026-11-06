import { test } from "node:test";
import assert from "node:assert/strict";
import { jobShare, jobSummary, planHasWork, planRoomWarning, planSummary, type TransferJob, type TransferPlan } from "./model-transfer.ts";

const plan = (over: Partial<TransferPlan> = {}): TransferPlan => ({
  files: 0, bytes: 0, have: 0, clashes: 0, byKind: {}, missing: [], free: 0, ...over,
});

const size = (n: number) => `${n} bytes`;

const job = (over: Partial<TransferJob> = {}): TransferJob => ({
  state: "done", from: "Automatic1111", to: "ComfyUI", files: 10, bytes: 100, done: 10, doneBytes: 100,
  linked: 0, copied: 10, have: 0, clashes: 0, ...over,
});

test("a plan says what comes across by kind", () => {
  const text = planSummary(plan({ files: 5, bytes: 2048, byKind: { checkpoints: 2, loras: 3 } }), size);
  assert.match(text, /2 checkpoints, 3 LoRAs to bring across/);
});

test("one of a kind reads as one", () => {
  const text = planSummary(plan({ files: 3, bytes: 10, byKind: { checkpoints: 1, loras: 1, vae: 1 } }), size);
  assert.match(text, /1 checkpoint, 1 LoRA, 1 VAE to bring across/);
});

test("a plan with everything already there has nothing to do and says so", () => {
  const p = plan({ have: 7 });
  assert.equal(planHasWork(p), false);
  assert.match(planSummary(p, size), /Nothing to bring across\. 7 files already there/);
});

test("a file that clashes is said to be left alone", () => {
  assert.match(planSummary(plan({ files: 1, byKind: { loras: 1 }, clashes: 1 }), size), /1 file there by the same name but a different size, left alone/);
});

test("a kind with nowhere to go is named rather than dropped", () => {
  assert.match(planSummary(plan({ missing: ["vae"] }), size), /VAEs are skipped/);
});

test("too little room warns but only as a maybe, since linking takes none", () => {
  assert.match(planRoomWarning(plan({ bytes: 200, free: 100 }), size), /only fits if both folders are on one disk/);
  assert.equal(planRoomWarning(plan({ bytes: 50, free: 100 }), size), "");
});

test("room that could not be read is no warning", () => {
  assert.equal(planRoomWarning(plan({ bytes: 200, free: 0 }), size), "");
});

test("progress follows the bytes, with files to go on when there are none", () => {
  assert.equal(jobShare(job({ doneBytes: 25 })), 0.25);
  assert.equal(jobShare(job({ bytes: 0, done: 5 })), 0.5);
  assert.equal(jobShare(job({ bytes: 0, files: 0, done: 0 })), 1);
});

test("a finished transfer says how each file arrived and that the originals are safe", () => {
  const text = jobSummary(job({ linked: 3, copied: 7, have: 2, clashes: 1 }));
  assert.match(text, /3 linked, taking no room, 7 copied, 2 already there, 1 left alone/);
  assert.match(text, /originals are still where they were/);
});

test("a stopped transfer says it can be picked up", () => {
  assert.match(jobSummary(job({ state: "stopped", done: 4 })), /stopped at 4 of 10 files\. Running it again carries on/);
});

test("a failed transfer says why", () => {
  assert.match(jobSummary(job({ state: "failed", done: 4, error: "disk full" })), /disk full/);
});
