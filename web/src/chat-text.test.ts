import { test } from "node:test";
import assert from "node:assert/strict";

import {
  MAX_BUBBLES,
  closenessLabel,
  findLinkInText,
  plainSpeech,
  previewText,
  readingDelay,
  splitIntoBubbles,
  timeAgo,
} from "./chat-text.ts";

// A paragraph break is her saying two things, and it is honoured however short they
// are. This was the bug the blank-line rule exists for: "oh hey\n\nyou've been gone
// three days" arrived as one bubble with a gap in it.
test("a blank line splits however short the halves are", () => {
  assert.deepEqual(splitIntoBubbles("oh hey\n\nyou've been gone three days"), [
    "oh hey",
    "you've been gone three days",
  ]);
});

test("a short reply stays one bubble", () => {
  assert.deepEqual(splitIntoBubbles("just got in, give me a minute"), [
    "just got in, give me a minute",
  ]);
  assert.deepEqual(splitIntoBubbles("  "), [""]);
});

// The sentence grouper is a guess, so it only runs on something long enough for the
// guess to be worth making.
test("a long reply with no paragraph seam is grouped into message-sized runs", () => {
  const sentence = "She walked the length of the pier and watched the boats come in. ";
  const parts = splitIntoBubbles(sentence.repeat(6));
  assert.ok(parts.length > 1, "a 400-character reply should not arrive as one bubble");
  assert.ok(parts.length <= MAX_BUBBLES, `got ${parts.length} bubbles, cap is ${MAX_BUBBLES}`);
  // Nothing may be dropped on the way: every word still has to be there.
  assert.equal(parts.join(" ").replace(/\s+/g, " ").trim(), sentence.repeat(6).replace(/\s+/g, " ").trim());
});

test("just under the floor is left alone, and no text is ever lost", () => {
  const under = "a".repeat(150) + ". and more.";
  assert.deepEqual(splitIntoBubbles(under.slice(0, 159)), [under.slice(0, 159)]);
});

// More paragraphs than the cap: the overflow folds into the last bubble rather than
// being thrown away.
test("more paragraphs than the cap fold into the last bubble", () => {
  const parts = splitIntoBubbles(["one", "two", "three", "four", "five", "six", "seven"].join("\n\n"));
  assert.equal(parts.length, MAX_BUBBLES);
  assert.equal(parts[MAX_BUBBLES - 1], "five\n\nsix\n\nseven");
});

// Link detection is deliberately narrow: a dotted word is not a host.
test("a link is found, and its trailing punctuation is not part of it", () => {
  assert.equal(findLinkInText("look at https://example.com/page."), "https://example.com/page");
  assert.equal(findLinkInText("try www.example.com, it's good"), "www.example.com");
  assert.equal(findLinkInText("(see https://example.com/a)"), "https://example.com/a");
});

test("a filename is not a link", () => {
  assert.equal(findLinkInText("see notes.txt for the rest"), "");
  assert.equal(findLinkInText("nothing here at all"), "");
});

// Markup off, for the places that quote her rather than render her.
test("speech is stripped of markup and stage directions", () => {
  assert.equal(plainSpeech("**hey** [she waves] *there*  you"), "hey there you");
  assert.equal(previewText("**bold** and `code`   spaced"), "bold and code spaced");
});

// The reading delay has a shape worth pinning: it grows with length, it is longer after
// a quiet spell, and it is capped.
test("the reading delay grows with length and stays capped", () => {
  const steady = () => 0.5; // no jitter
  const short = readingDelay(10, 0, steady);
  const long = readingDelay(200, 0, steady);
  assert.ok(long > short, `${long} should exceed ${short}`);
  assert.ok(readingDelay(100_000, 0, steady) <= 6500, "the cap has to hold for any length");
});

test("a quiet conversation adds a beat before she reads", () => {
  const steady = () => 0.5;
  const fresh = readingDelay(50, 0, steady);
  const stale = readingDelay(50, 60 * 60_000, steady);
  assert.ok(stale > fresh, "after an hour the phone was down");
});

test("even the fastest jitter never goes negative or past the cap", () => {
  for (const r of [0, 0.5, 1]) {
    const ms = readingDelay(500, 30 * 60_000, () => r);
    assert.ok(ms >= 0 && ms <= 6500, `jitter ${r} gave ${ms}`);
  }
});

test("how long ago, in words", () => {
  const now = 1_700_000_000_000;
  assert.equal(timeAgo(now - 1000, now), "just now");
  assert.equal(timeAgo(now - 10 * 60_000, now), "10 minutes ago");
  assert.equal(timeAgo(now - 3 * 3600_000, now), "3 hours ago");
  assert.equal(timeAgo(now - 5 * 86400_000, now), "5 days ago");
  // A clock that has run backwards reads as now, not as a negative age.
  assert.equal(timeAgo(now + 60_000, now), "just now");
});

test("closeness tiers cover the whole range in order", () => {
  const labels = [0, 0.14, 0.15, 0.49, 0.5, 0.84, 0.85, 1].map(closenessLabel);
  assert.deepEqual(new Set(labels).size, 4);
  assert.equal(labels[0], labels[1]);
  assert.notEqual(labels[1], labels[2]);
  assert.equal(closenessLabel(1), "Deeply close after all this time");
});
