import { test } from "node:test";
import assert from "node:assert/strict";
import { toggleTag, trainingFraction, trainingLine, triggerFrom } from "./train-progress.ts";
import type { Training } from "./api.ts";

const run = (over: Partial<Training>): Training => ({
  id: 1, name: "ink", trigger: "ink", baseModel: "pony", images: 20, status: "training", createdAt: 0, ...over,
});

test("a run in its steps says which, the epoch, the time left and the loss", () => {
  const t = run({ phase: "training", step: 120, total: 1000, epoch: 3, epochs: 10, eta: "10:12", loss: 0.09123 });
  assert.equal(trainingLine(t), "Step 120 of 1000 · epoch 3/10 · 10:12 left · loss 0.091");
  assert.equal(trainingFraction(t), 0.12);
});

test("before the first step there is a phase and no bar", () => {
  const t = run({ phase: "caching" });
  assert.equal(trainingLine(t), "Preparing the pictures");
  assert.equal(trainingFraction(t), null);
});

test("a failure says why", () => {
  assert.equal(trainingLine(run({ status: "failed", error: "the GPU ran out of memory" })), "Failed: the GPU ran out of memory");
});

test("a trigger word is one lower-case token", () => {
  assert.equal(triggerFrom("Ink Style v2!"), "inkstylev2");
});

test("a tag goes into the leave-out list and back out, whatever its case", () => {
  assert.deepEqual(toggleTag(["Blonde hair"], "blonde hair"), []);
  assert.deepEqual(toggleTag([], "blue eyes"), ["blue eyes"]);
});
