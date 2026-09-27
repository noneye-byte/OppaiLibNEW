import assert from "node:assert/strict";
import test from "node:test";
import type { GenProgress } from "./api.ts";
import { mergeProgress, newJobId, progressLabel, progressPercent } from "./gen-watch.ts";

const report = (over: Partial<GenProgress>): GenProgress =>
  ({ index: 0, step: 0, total: 0, percent: 0, seq: 0, done: false, cancelled: false, ...over });

test("a withheld preview keeps the picture already on screen", () => {
  const first = mergeProgress(null, report({ step: 4, total: 30, percent: 0.13, seq: 1, image: "data:a" }));
  const second = mergeProgress(first, report({ step: 8, total: 30, percent: 0.27, seq: 1 }));
  assert.equal(second.image, "data:a");
  assert.equal(second.step, 8);
  const third = mergeProgress(second, report({ step: 12, total: 30, percent: 0.4, seq: 2, image: "data:b" }));
  assert.equal(third.image, "data:b");
});

test("a report without a step total keeps the one already known", () => {
  const known = mergeProgress(null, report({ step: 3, total: 25 }));
  assert.equal(mergeProgress(known, report({ step: 5 })).total, 25);
});

test("the label says where the run is", () => {
  assert.equal(progressLabel(null), "Starting…");
  assert.equal(progressLabel(report({ step: 12, total: 30, percent: 0.4 })), "Step 12 of 30");
  assert.equal(progressLabel(report({ percent: 0.55 })), "55%");
  assert.equal(progressLabel(report({ step: 30, total: 30, percent: 1 })), "Finishing…");
});

test("the bar fills from the percent, or from the steps when there is none", () => {
  assert.equal(progressPercent(null), 0);
  assert.equal(progressPercent(report({ percent: 0.4 })), 40);
  assert.equal(progressPercent(report({ step: 15, total: 30 })), 50);
  assert.equal(progressPercent(report({ done: true })), 100);
});

test("a job id is one the server accepts", () => {
  assert.match(newJobId(), /^[A-Za-z0-9_-]{4,64}$/);
  assert.notEqual(newJobId(), newJobId());
});
