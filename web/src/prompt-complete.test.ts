import { test } from "node:test";
import assert from "node:assert/strict";

import {
  applyCompletion,
  escapeTag,
  formatCount,
  localCompletions,
  mergeCompletions,
  moveSelection,
  tokenAt,
} from "./prompt-complete.ts";

/** Puts the caret where "|" is and returns the text without it. */
function at(marked: string): [string, number] {
  const caret = marked.indexOf("|");
  return [marked.slice(0, caret) + marked.slice(caret + 1), caret];
}

test("the token is the tag the caret is in, not the prompt's last one", () => {
  const [text, caret] = at("1girl, blue ey|, smile");
  const t = tokenAt(text, caret)!;
  assert.equal(t.mode, "tag");
  assert.equal(t.query, "blue ey");
  assert.equal(text.slice(t.start, t.end), "blue ey");
});

test("accepting mid-prompt replaces just that tag and leaves its neighbours", () => {
  const [text, caret] = at("1girl, blue ey|, smile");
  const out = applyCompletion(text, tokenAt(text, caret)!, "blue eyes");
  assert.equal(out.text, "1girl, blue eyes, smile");
  assert.equal(out.text.slice(0, out.caret), "1girl, blue eyes");
});

test("accepting at the end leaves a separator for the next tag", () => {
  const [text, caret] = at("1girl, lon|");
  const out = applyCompletion(text, tokenAt(text, caret)!, "long hair");
  assert.equal(out.text, "1girl, long hair, ");
  assert.equal(out.caret, out.text.length);
});

test("a weighted tag keeps its weight when completed", () => {
  const [text, caret] = at("(red dre|:1.2), smile");
  const t = tokenAt(text, caret)!;
  assert.equal(t.query, "red dre");
  const out = applyCompletion(text, t, "red dress");
  assert.equal(out.text, "(red dress:1.2), smile");
});

test("typing a weight is not something to complete", () => {
  const [text, caret] = at("(red dress:1.|");
  assert.equal(tokenAt(text, caret), null);
});

test("escaped brackets are part of the tag rather than a group", () => {
  const [text, caret] = at("ganyu \\(genshin|");
  const t = tokenAt(text, caret)!;
  assert.equal(t.query, "ganyu (genshin");
  assert.equal(escapeTag("ganyu (genshin impact)"), "ganyu \\(genshin impact\\)");
});

test("a LoRA reference completes to the whole token with a weight", () => {
  const [text, caret] = at("1girl, <lora:in|");
  const t = tokenAt(text, caret)!;
  assert.equal(t.mode, "lora");
  assert.equal(t.query, "in");
  const [c] = localCompletions(t, { loras: [{ name: "ink_wash", weight: 0.8 }, { name: "film" }], wildcards: [], triggers: [] });
  assert.equal(c.insert, "<lora:ink_wash:0.8>");
  assert.equal(applyCompletion(text, t, c.insert).text, "1girl, <lora:ink_wash:0.8>");
});

test("re-completing a finished LoRA reference replaces it whole", () => {
  const [text, caret] = at("<lora:in|k_wash:0.8>, smile");
  const t = tokenAt(text, caret)!;
  assert.equal(applyCompletion(text, t, "<lora:inky:1>").text, "<lora:inky:1>, smile");
});

test("a wildcard reference completes from the lists by name", () => {
  const [text, caret] = at("1girl, __ha|");
  const t = tokenAt(text, caret)!;
  assert.equal(t.mode, "wildcard");
  const got = localCompletions(t, { loras: [], wildcards: [{ name: "hair", lines: 12 }, { name: "pose" }], triggers: [] });
  assert.deepEqual(got.map((c) => c.insert), ["__hair__"]);
  assert.equal(applyCompletion(text, t, "__hair__").text, "1girl, __hair__, ");
});

test("a switched-on LoRA's trigger words come before the tag list", () => {
  const t = tokenAt("ink", 3)!;
  const local = localCompletions(t, { loras: [], wildcards: [], triggers: ["inkwash style", "sumi-e"] });
  const merged = mergeCompletions(local, [
    { kind: "tag", label: "ink", insert: "ink", count: 9000 },
    { kind: "tag", label: "inkwash style", insert: "inkwash style" },
  ]);
  assert.deepEqual(merged.map((c) => c.insert), ["inkwash style", "ink"]);
});

test("the highlighted row wraps at both ends", () => {
  assert.equal(moveSelection(-1, 4, 1), 0);
  assert.equal(moveSelection(-1, 4, -1), 3);
  assert.equal(moveSelection(3, 4, 1), 0);
  assert.equal(moveSelection(0, 4, -1), 3);
  assert.equal(moveSelection(0, 0, 1), -1);
});

test("post counts read the way a person says them", () => {
  assert.equal(formatCount(6_008_644), "6.0M");
  assert.equal(formatCount(52_340), "52k");
  assert.equal(formatCount(1_250), "1.3k");
  assert.equal(formatCount(870), "870");
  assert.equal(formatCount(undefined), "");
});
