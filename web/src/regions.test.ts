import { test } from "node:test";
import assert from "node:assert/strict";

const { regionParams, regionNegatives, regionBoxes, peopleFrom, newPerson, personPrompt, sharedLoras, sharedTriggers, peopleAdvice } =
  await import("./regions.ts");

const chars = [
  { id: "a", name: "Alice", prompt: "red hair, green eyes", negativePrompt: "freckles", hasThumb: false },
  { id: "b", name: "Bea", prompt: "black hair", hasThumb: false },
];

test("a person is drawn from their character's words and then their own", () => {
  assert.equal(personPrompt({ ...newPerson(), character: "a", words: "smiling" }, chars), "red hair, green eyes, smiling");
  assert.equal(personPrompt({ ...newPerson(), words: " waving " }, chars), "waving");
  assert.equal(personPrompt({ ...newPerson(), character: "gone" }, chars), "");
});

test("two people are sent as two parts, each with their own LoRA", () => {
  const people = [
    { ...newPerson(), character: "a", lora: "alice_v2", loraWeight: 0.7, share: 2 },
    { ...newPerson(), character: "b" },
  ];
  assert.deepEqual(regionParams(true, false, people, chars), {
    enabled: true, rows: undefined,
    parts: [
      { prompt: "red hair, green eyes", loras: [{ name: "alice_v2", weight: 0.7 }], share: 2 },
      { prompt: "black hair", loras: undefined, share: undefined },
    ],
  });
});

test("one person, or the switch off, sends no regions at all", () => {
  assert.equal(regionParams(true, false, [newPerson()], chars), undefined);
  assert.equal(regionParams(false, false, [newPerson(), newPerson()], chars), undefined);
});

test("no more than four people are sent", () => {
  const five = Array.from({ length: 5 }, () => newPerson());
  assert.equal(regionParams(true, true, five, chars)?.parts.length, 4);
  assert.equal(regionParams(true, true, five, chars)?.rows, true);
});

test("the characters' negatives go to the shared negative once each", () => {
  const people = [{ ...newPerson(), character: "a" }, { ...newPerson(), character: "a" }, { ...newPerson(), character: "b" }];
  assert.deepEqual(regionNegatives(people, chars), ["freckles"]);
});

test("the layout splits the side by the people's shares", () => {
  const boxes = regionBoxes([{ ...newPerson(), share: 2 }, { ...newPerson(), share: 1 }, { ...newPerson(), share: 0 }]);
  assert.deepEqual(boxes.map((b) => b.size), [0.5, 0.25, 0.25]);
  assert.deepEqual(boxes.map((b) => b.start), [0, 0.5, 0.75]);
});

test("a picture's parts come back as people with their words and first LoRA", () => {
  assert.deepEqual(peopleFrom({ enabled: true, parts: [{ prompt: "red hair", loras: [{ name: "x", weight: 0.5 }], share: 2 }] }),
    [{ character: "", words: "red hair", lora: "x", loraWeight: 0.5, share: 2 }]);
  assert.deepEqual(peopleFrom(undefined), []);
});

const loras = [
  { name: "alice_v2", triggerPhrases: ["alice", "school uniform"], categoryKey: "character" },
  { name: "detail", triggerPhrases: ["detailed"], categoryKey: "tools" },
  { name: "bea_xl", triggerPhrases: ["bea"], categoryKey: "character" },
];

test("a person's LoRA brings its trigger words, the ones their words do not already say", () => {
  const p = { ...newPerson(), character: "a", words: "wearing a School Uniform", lora: "alice_v2" };
  assert.equal(personPrompt(p, chars, loras), "red hair, green eyes, wearing a School Uniform, alice");
  assert.equal(regionParams(true, false, [p, newPerson()], chars, loras)?.parts[0].prompt, "red hair, green eyes, wearing a School Uniform, alice");
});

test("a LoRA a person wears leaves the recipe the people share, with its trigger words", () => {
  const people = [{ ...newPerson(), lora: "alice_v2" }, { ...newPerson() }];
  assert.deepEqual(sharedLoras({ alice_v2: 1, detail: 0.5 }, people), { detail: 0.5 });
  assert.deepEqual(sharedTriggers(["alice", "detailed", "by hand"], { alice_v2: 1, detail: 0.5 }, people, loras), ["detailed", "by hand"]);
});

test("thin strips and a character LoRA left in the recipe are pointed out", () => {
  const two = [{ ...newPerson(), lora: "alice_v2" }, newPerson()];
  assert.deepEqual(peopleAdvice(false, two, 832, 1216, { bea_xl: 1, detail: 1 }, loras), { narrow: true, everyone: ["bea_xl"] });
  assert.deepEqual(peopleAdvice(false, two, 1216, 832, { alice_v2: 1 }, loras), { narrow: false, everyone: [] });
  assert.equal(peopleAdvice(true, two, 832, 1216, {}, loras).narrow, false);
  assert.equal(peopleAdvice(true, two, 1216, 832, {}, loras).narrow, true);
});

const { putLoraOn, unwearLora } = await import("./regions.ts");

test("a LoRA dropped on a person's part replaces theirs, at its own weight", () => {
  const two = [{ ...newPerson(), lora: "old", loraWeight: 0.6 }, newPerson()];
  assert.deepEqual(putLoraOn(two, 0, "alice_v2", 0.7).map((p) => [p.lora, p.loraWeight]), [["alice_v2", 0.7], ["", 0.8]]);
  assert.equal(putLoraOn(two, 1, "bea_xl").at(1)?.loraWeight, 0.8);
});

test("a LoRA dropped on the whole picture comes off the people who wore it", () => {
  const two = [{ ...newPerson(), lora: "detail" }, { ...newPerson(), lora: "bea_xl" }];
  assert.deepEqual(unwearLora(two, "detail").map((p) => p.lora), ["", "bea_xl"]);
  assert.equal(unwearLora(two, "nobody"), two);
});
