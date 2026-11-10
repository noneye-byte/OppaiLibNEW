import { test } from "node:test";
import assert from "node:assert/strict";

const { proseBehind, squareWords, withChange, wordChange } = await import("./sprite-words.ts");

const base = { face: "focused expression", pose: "holding her phone", prose: "She types on her phone." };

test("a square keeps the studio's words wherever the user changed nothing", () => {
  assert.deepEqual(squareWords(base), base);
  assert.deepEqual(squareWords(base, { pose: "phone in one hand" }), { ...base, pose: "phone in one hand" });
  assert.deepEqual(squareWords(base, { face: "   " }), base, "a blank change is no change");
});

test("only what an edit changes is kept", () => {
  assert.deepEqual(wordChange(base, { ...base, face: " smiling " }), { face: "smiling" });
  assert.equal(wordChange(base, { ...base }), undefined);
  assert.equal(wordChange(base, { ...base, pose: "" }), undefined, "clearing a field gives the studio's words back");
  assert.equal(wordChange(base, { ...base, prose: "She types on her phone.  " }), undefined, "the studio's words put back are no change");
});

test("a square with no changes left is dropped from the set", () => {
  const set = withChange({}, "typing", { face: "smiling" });
  assert.deepEqual(set, { typing: { face: "smiling" } });
  assert.deepEqual(withChange(set, "typing", undefined), {});
  assert.deepEqual(withChange(set, "happy", { prose: "She beams." }), { typing: { face: "smiling" }, happy: { prose: "She beams." } });
});

test("rewritten tags with the sentence left alone are out of step for Anima", () => {
  assert.ok(proseBehind({ pose: "phone in one hand" }));
  assert.ok(!proseBehind({ pose: "phone in one hand", prose: "She holds her phone in one hand." }));
  assert.ok(!proseBehind({ prose: "She holds her phone in one hand." }), "a sentence alone is fine: tags are the other checkpoints'");
  assert.ok(!proseBehind(undefined));
});
