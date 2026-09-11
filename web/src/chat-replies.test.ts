import assert from "node:assert/strict";
import test from "node:test";
import { excerptOf } from "./chat-replies.ts";

test("a quote is the first line, whole when short", () => {
  assert.equal(excerptOf("  did you finish it?\n\nthe comic i mean  "), "did you finish it?");
  assert.equal(excerptOf("\n\nsecond line only"), "second line only");
});

test("a long quote is cut at a word with an ellipsis", () => {
  const long = "word ".repeat(60).trim();
  const quote = excerptOf(long, 40);
  assert.ok(quote.endsWith("…"));
  assert.ok(quote.length <= 41);
  assert.ok(!quote.includes("  "));
  assert.match(quote, /^(word )+word…$/);
});
