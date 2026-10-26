import { test } from "node:test";
import assert from "node:assert/strict";
import {
  compareColumns, comparePlan, parseWeights, planSize, promptsFrom, seedsFrom, sheetLayout, withTrigger,
} from "./lora-compare.ts";

test("a trigger word leads the prompt when no {trigger} marks its place", () => {
  assert.equal(withTrigger("1girl, smile, beach", "inkstyle"), "inkstyle, 1girl, smile, beach");
});

test("{trigger} puts the trigger word where it is written", () => {
  assert.equal(withTrigger("masterpiece, {trigger}, 1girl", "ohwx"), "masterpiece, ohwx, 1girl");
});

test("an empty {trigger} leaves no stray commas behind", () => {
  assert.equal(withTrigger("masterpiece, {trigger}, 1girl", ""), "masterpiece, 1girl");
  assert.equal(withTrigger("{trigger}, 1girl", undefined), "1girl");
});

test("a trigger already in the prompt is not added twice", () => {
  assert.equal(withTrigger("1girl, OHWX, smile", "ohwx"), "1girl, OHWX, smile");
  assert.equal(withTrigger("(ohwx:1.2), smile", "ohwx"), "(ohwx:1.2), smile");
});

test("a trigger that is only part of a word is still added", () => {
  assert.equal(withTrigger("inkstyles everywhere", "inkstyle"), "inkstyle, inkstyles everywhere");
});

test("weights are read however they are typed, kept in range and in order", () => {
  assert.deepEqual(parseWeights("0.6, 0.8 1"), [0.6, 0.8, 1]);
  assert.deepEqual(parseWeights("1;1;3;-5"), [1, 2, -2]);
  assert.deepEqual(parseWeights("0, nonsense"), [1]);
  assert.deepEqual(parseWeights("0.1 0.2 0.3 0.4 0.5 0.6"), [0.1, 0.2, 0.3, 0.4, 0.5]);
});

test("the seeds after the chosen one are used, at most four", () => {
  assert.deepEqual(seedsFrom(100, 3), [100, 101, 102]);
  assert.deepEqual(seedsFrom(7, 9), [7, 8, 9, 10]);
  assert.deepEqual(seedsFrom(7, 0), [7]);
});

test("every non-empty extra line is another prompt to compare", () => {
  assert.deepEqual(promptsFrom("1girl", "\n  beach  \n\nnight city\n"), ["1girl", "beach", "night city"]);
  assert.equal(promptsFrom("a", "b\nc\nd\ne\nf").length, 4);
});

test("a column's header names only what changes across the sheet", () => {
  assert.deepEqual(compareColumns([1], [5], 1).map((c) => c.label), ["Weight 1"]);
  assert.deepEqual(compareColumns([0.6, 1], [5], 1).map((c) => c.label), ["Weight 0.6", "Weight 1"]);
  assert.deepEqual(compareColumns([1], [5, 6], 1).map((c) => c.label), ["Seed 5", "Seed 6"]);
  assert.deepEqual(compareColumns([0.5, 1], [5], 2).map((c) => c.label),
    ["Prompt 1 · Weight 0.5", "Prompt 1 · Weight 1", "Prompt 2 · Weight 0.5", "Prompt 2 · Weight 1"]);
});

test("the baseline is one picture per seed and each LoRA one per column", () => {
  const plan = comparePlan({
    loras: [{ name: "ink", trigger: "inkstyle" }, { name: "her" }],
    weights: [0.6, 1],
    seeds: [5, 6],
    prompts: ["1girl"],
    baseline: true,
    checkpoint: "pony",
    ownCheckpoint: false,
  });
  assert.equal(plan.columns.length, 4);
  assert.equal(plan.rows.length, 3);
  assert.equal(plan.rows[0].lora, null);
  assert.deepEqual(plan.rows[0].cells.map((c) => c?.seed ?? null), [5, null, 6, null]);
  assert.equal(plan.rows[1].cells[0]?.prompt, "inkstyle, 1girl");
  assert.equal(plan.rows[2].cells[1]?.prompt, "1girl");
  assert.deepEqual(plan.rows[1].cells.map((c) => `${c?.seed}@${c?.weight}`), ["5@0.6", "5@1", "6@0.6", "6@1"]);
  assert.equal(planSize(plan), 10);
});

test("each prompt is drawn with the row's trigger, or none when triggers are left out", () => {
  const opts = {
    loras: [{ name: "ink", trigger: "inkstyle" }],
    weights: [1], seeds: [1], prompts: ["{trigger}, a cat", "a dog"],
    baseline: false, checkpoint: "pony", ownCheckpoint: false,
  };
  assert.deepEqual(comparePlan(opts).rows[0].cells.map((c) => c?.prompt), ["inkstyle, a cat", "inkstyle, a dog"]);
  assert.deepEqual(comparePlan({ ...opts, triggers: false }).rows[0].cells.map((c) => c?.prompt), ["a cat", "a dog"]);
});

test("a LoRA trained here is drawn on its own checkpoint when asked, others on the chosen one", () => {
  const plan = comparePlan({
    loras: [{ name: "ink", checkpoint: "sd15-base" }, { name: "downloaded" }],
    weights: [1],
    seeds: [1],
    prompts: ["a cat"],
    baseline: false,
    checkpoint: "pony",
    ownCheckpoint: true,
  });
  assert.equal(plan.rows[0].cells[0]?.checkpoint, "sd15-base");
  assert.equal(plan.rows[1].cells[0]?.checkpoint, "pony");
});

test("a downloaded sheet fits its label column, header and every cell", () => {
  const l = sheetLayout(3, 2, 320);
  assert.equal(l.x(0), l.label + l.gap);
  assert.equal(l.x(2) + 320 + l.gap, l.width);
  assert.equal(l.y(1) + 320 + l.gap, l.height);
});
