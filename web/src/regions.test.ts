import { test } from "node:test";
import assert from "node:assert/strict";

const { regionParams, regionNegatives, regionBoxes, peopleFrom, newPerson, personPrompt } = await import("./regions.ts");

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
