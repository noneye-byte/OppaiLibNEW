import assert from "node:assert/strict";
import test from "node:test";
import { SPEAK_WHOLE, speechPieces } from "./speech-pieces.ts";

test("a short line is spoken whole", () => {
  assert.deepEqual(speechPieces("  hey. missed you. come here  "), ["hey. missed you. come here"]);
  assert.deepEqual(speechPieces("   "), []);
});

test("a long line starts with its first sentence alone", () => {
  const line = "Okay so here is the thing. " + "I have been thinking about this all day and I cannot stop, honestly. ".repeat(4);
  assert.ok(line.length > SPEAK_WHOLE);
  const pieces = speechPieces(line);
  assert.equal(pieces[0], "Okay so here is the thing.");
  assert.ok(pieces.length >= 2);
  // Nothing lost, nothing reordered.
  assert.equal(pieces.join(" ").replace(/\s+/g, " "), line.trim().replace(/\s+/g, " "));
});

test("later pieces gather sentences rather than going one by one", () => {
  const line = Array.from({ length: 12 }, (_, i) => `Sentence number ${i}.`).join(" ");
  const pieces = speechPieces(line);
  assert.ok(pieces.length < 12, `got ${pieces.length} pieces`);
  assert.equal(pieces[0], "Sentence number 0.");
});
