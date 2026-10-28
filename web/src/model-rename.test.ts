import { test } from "node:test";
import assert from "node:assert/strict";

const { cleanModelName, withExtension, uniqueName, renameRows, renamesToSend, renameKeys, renameLorasInPrompt } =
  await import("./model-rename.ts");

test("a name keeps letters of any script and drops what a prompt or a folder can't carry", () => {
  assert.equal(cleanModelName("Makima (Chainsaw Man) | Pony"), "Makima Chainsaw Man Pony");
  assert.equal(cleanModelName("a:b>c/d"), "a b c d");
  assert.equal(cleanModelName("雷電将軍 v1.0"), "雷電将軍 v1.0");
  assert.equal(cleanModelName(" -- "), "");
});

test("a detector's name always ends in .pt, typed with it or not", () => {
  assert.equal(withExtension("detector", "feet_yolov8s"), "feet_yolov8s.pt");
  assert.equal(withExtension("detector", "feet_yolov8s.PT"), "feet_yolov8s.pt");
  assert.equal(withExtension("lora", "Ink: Style"), "Ink Style");
});

test("a name that is taken gets a number, without regard to case", () => {
  const taken = new Set(["makima - pony", "makima - pony 2", "eyes.pt"]);
  assert.equal(uniqueName("lora", "Makima - Pony", taken), "Makima - Pony 3");
  assert.equal(uniqueName("lora", "Ink", taken), "Ink");
  assert.equal(uniqueName("detector", "Eyes.pt", taken), "Eyes_2.pt");
});

test("two LoRAs Civitai gives one name are told apart instead of the second failing", () => {
  const rows = renameRows("lora", [
    { name: "makima_a", to: "Makima - Pony", outcome: "named" },
    { name: "makima_b", to: "Makima - Pony", outcome: "named" },
    { name: "Ink", to: "Ink", outcome: "same" },
    { name: "mystery", outcome: "unknown" },
  ], ["makima_a", "makima_b", "Ink", "mystery", "Makima - Pony"]);
  assert.deepEqual(rows.map((r) => [r.name, r.to, r.pick]), [
    ["makima_a", "Makima - Pony 2", true],
    ["makima_b", "Makima - Pony 3", true],
    ["Ink", "Ink", false],
    ["mystery", "", false],
  ]);
});

test("a file may keep its own name in a different case", () => {
  const rows = renameRows("lora", [{ name: "ink style", to: "Ink Style", outcome: "named" }], ["ink style"]);
  assert.equal(rows[0].to, "Ink Style");
  assert.equal(rows[0].pick, true);
});

test("only the ticked rows that change are sent, cleaned as the server will", () => {
  const sent = renamesToSend("detector", [
    { name: "a.pt", to: "feet", outcome: "named", pick: true },
    { name: "b.pt", to: "b.pt", outcome: "same", pick: true },
    { name: "c.pt", to: "eyes.pt", outcome: "named", pick: false },
    { name: "d.pt", to: "::", outcome: "named", pick: true },
  ]);
  assert.deepEqual(sent, [{ name: "a.pt", to: "feet.pt" }]);
});

test("the LoRAs that are on and the prompt's tags follow a rename", () => {
  const to = new Map([["ink_v1", "Ink Style"], ["a.b", "Dotted"]]);
  assert.deepEqual(renameKeys({ ink_v1: 0.7, other: 1 }, to), { "Ink Style": 0.7, other: 1 });
  assert.equal(
    renameLorasInPrompt("1girl, <lora:ink_v1:0.8>, <lora:ink_v12:1>, <lora:a.b>, <lora:aXb:1>", to),
    "1girl, <lora:Ink Style:0.8>, <lora:ink_v12:1>, <lora:Dotted>, <lora:aXb:1>",
  );
});
