import { test } from "node:test";
import assert from "node:assert/strict";
import { comparePlan, parseWeights, planSize, withTrigger } from "./lora-compare.ts";

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

test("the baseline is one picture and each LoRA one per weight", () => {
  const rows = comparePlan({
    loras: [{ name: "ink", trigger: "inkstyle" }, { name: "her" }],
    weights: [0.6, 1],
    baseline: true,
    prompt: "1girl",
    checkpoint: "pony",
    ownCheckpoint: false,
  });
  assert.equal(rows.length, 3);
  assert.equal(rows[0].lora, null);
  assert.equal(rows[0].cells.length, 1);
  assert.equal(rows[1].cells[0].prompt, "inkstyle, 1girl");
  assert.equal(rows[2].cells[1].prompt, "1girl");
  assert.deepEqual(rows[1].cells.map((c) => c.weight), [0.6, 1]);
  assert.equal(planSize(rows), 5);
});

test("a LoRA trained here is drawn on its own checkpoint when asked, others on the chosen one", () => {
  const rows = comparePlan({
    loras: [{ name: "ink", checkpoint: "sd15-base" }, { name: "downloaded" }],
    weights: [1],
    baseline: false,
    prompt: "a cat",
    checkpoint: "pony",
    ownCheckpoint: true,
  });
  assert.equal(rows[0].cells[0].checkpoint, "sd15-base");
  assert.equal(rows[1].cells[0].checkpoint, "pony");
});
