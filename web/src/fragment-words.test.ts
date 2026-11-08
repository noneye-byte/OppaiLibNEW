import { test } from "node:test";
import assert from "node:assert/strict";
import { fragmentWords, joinPrompt, readsProse } from "./fragment-words.ts";

const ink = { prompt: "1girl, long red hair, green eyes", description: "  A woman with long red hair and green eyes.  " };

test("an Anima checkpoint gets the description and every other model the tags", () => {
  assert.equal(readsProse({ family: "anima" }), true);
  assert.equal(readsProse({ family: "sdxl" }), false);
  assert.equal(readsProse(undefined), false);
  assert.equal(fragmentWords(ink, true), "A woman with long red hair and green eyes.");
  assert.equal(fragmentWords(ink, false), "1girl, long red hair, green eyes");
});

test("a character with no description keeps its tags on Anima too", () => {
  assert.equal(fragmentWords({ prompt: " sitting, mug " }, true), "sitting, mug");
  assert.equal(fragmentWords({ prompt: "sitting", description: "   " }, true), "sitting");
});

test("a piece that ends a sentence is followed by a space, and tags by a comma", () => {
  assert.equal(joinPrompt(["masterpiece", "A woman with red hair.", "sitting", " ", "smiling"]),
    "masterpiece, A woman with red hair. sitting, smiling");
  assert.equal(joinPrompt(["She waves.", "She smiles."]), "She waves. She smiles.");
  assert.equal(joinPrompt(["", "  "]), "");
});
