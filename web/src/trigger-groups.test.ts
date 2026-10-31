import { test } from "node:test";
import assert from "node:assert/strict";

const { filterTriggerGroups, inlineTriggers, triggerGroups } = await import("./trigger-groups.ts");

const loras = [
  { name: "masturbation_h", triggerPhrases: ["1girl", "lying", "spread legs"] },
  { name: "Filian__Indie_Vtuber", alias: "Filian", triggerPhrases: ["Filian", "fox girl", "1girl", "police hat"] },
  { name: "styles/gueya_style", triggerPhrases: ["gueyastyle"] },
  { name: "not_on", triggerPhrases: ["never"] },
  { name: "no_words", triggerPhrases: [] },
];
const on = { masturbation_h: 1, Filian__Indie_Vtuber: 0.85, "styles/gueya_style": 0.7, no_words: 1 };

test("each LoRA that is on gets its own group, a shared phrase listed once under the first", () => {
  const groups = triggerGroups(loras, on);
  assert.deepEqual(groups.map((g) => g.label), ["masturbation_h", "Filian", "gueya_style"]);
  assert.deepEqual(groups[1].phrases, ["Filian", "fox girl", "police hat"]);
});

test("a search keeps the phrases that hold every word, or the whole LoRA when its name does", () => {
  const groups = triggerGroups(loras, on);
  assert.deepEqual(filterTriggerGroups(groups, "fox").map((g) => g.phrases), [["fox girl"]]);
  assert.deepEqual(filterTriggerGroups(groups, "gueya").map((g) => g.phrases), [["gueyastyle"]]);
  assert.deepEqual(filterTriggerGroups(groups, "  ").length, 3);
  assert.deepEqual(filterTriggerGroups(groups, "police cap"), []);
});

test("the composer shows as many picked phrases as it has room for and counts the rest, ignoring ones no longer offered", () => {
  const groups = triggerGroups(loras, on);
  assert.deepEqual(inlineTriggers(["1girl", "never", "lying", "fox girl"], groups, 2), { shown: ["1girl", "lying"], folded: 1 });
  assert.deepEqual(inlineTriggers([], groups, 6), { shown: [], folded: 0 });
});
