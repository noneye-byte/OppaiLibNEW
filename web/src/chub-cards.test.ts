import { test } from "node:test";
import assert from "node:assert/strict";

import { cardSections, compactCount, fillNames, roleplayRuns, saysItHasExpressions, shownTopics } from "./chub-cards.ts";

test("a count reads short past a thousand", () => {
  assert.equal(compactCount(950), "950");
  assert.equal(compactCount(1200), "1.2k");
  assert.equal(compactCount(1000), "1k");
  assert.equal(compactCount(34_400), "34k");
  assert.equal(compactCount(1_520_000), "1.5M");
  assert.equal(compactCount(Number.NaN), "0");
});

test("a card's topics leave out what its badges already say, and repeats", () => {
  assert.deepEqual(shownTopics(["NSFW", "Female", "Expressions Pack", "female", "OC", "Maid", "Fantasy"], 3), ["Female", "OC", "Maid"]);
});

test("an expressions topic says a card has a pack", () => {
  assert.equal(saysItHasExpressions(["Female", "Expressions Pack"]), true);
  assert.equal(saysItHasExpressions(["Female"]), false);
});

test("a greeting's placeholders read as the character's name and you", () => {
  assert.equal(fillNames("{{char}} smiles at {{user}}. <BOT> waves.", "Mira"), "Mira smiles at you. Mira waves.");
  assert.equal(fillNames("{{ Char }} and {{USER}}", "Mira", "Owl"), "Mira and Owl");
});

test("a roleplay message is cut into narration, actions and speech, and a lone asterisk stays as written", () => {
  assert.deepEqual(roleplayRuns(`*She wipes the bar.* "What'll it be?" she asks.`), [
    { text: "She wipes the bar.", kind: "action" },
    { text: " ", kind: "plain" },
    { text: `"What'll it be?"`, kind: "speech" },
    { text: " she asks.", kind: "plain" },
  ]);
  assert.deepEqual(roleplayRuns("5 * 3 is fifteen"), [{ text: "5 * 3 is fifteen", kind: "plain" }]);
  assert.deepEqual(roleplayRuns(""), []);
});

test("a card's sections come in reading order, the empty ones out, each with chub's token count", () => {
  const s = cardSections({
    creatorNotes: "Made for fun.", description: "{{char}} runs the bar.", personality: "  ", scenario: "A tavern.",
    exampleDialogs: "", systemPrompt: "", postHistory: "", tokenCounts: { description: 849, scenario: 0 },
  });
  assert.deepEqual(s.map((x) => x.key), ["notes", "description", "scenario"]);
  assert.equal(s[1].tokens, 849);
  assert.equal(s[2].tokens, undefined);
});
