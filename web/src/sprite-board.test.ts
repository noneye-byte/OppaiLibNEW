import { test } from "node:test";
import assert from "node:assert/strict";

const { filterCounts, matchesFilter, moveOnMatrix, nextFilled } = await import("./sprite-board.ts");

test("each filter lights up only the squares it is named for", () => {
  assert.ok(matchesFilter("missing", "none"));
  assert.ok(!matchesFilter("missing", "needs"));
  assert.ok(matchesFilter("review", "needs"));
  assert.ok(!matchesFilter("review", "ready"));
  assert.ok(matchesFilter("stale", "stale"));
  for (const s of ["none", "needs", "ready", "stale"] as const) assert.ok(matchesFilter("all", s));
});

test("a finished square is in no filter but All", () => {
  for (const f of ["missing", "review", "stale"] as const) assert.ok(!matchesFilter(f, "ready"));
});

test("the counts say how many squares each filter finds", () => {
  assert.deepEqual(filterCounts(["none", "none", "needs", "ready", "stale"]), { all: 5, missing: 2, review: 1, stale: 1 });
});

test("up and down move through the heat tiers and stop at the ends", () => {
  assert.deepEqual(moveOnMatrix(3, 0, "ArrowUp", 12, 5), { face: 3, tier: 0 });
  assert.deepEqual(moveOnMatrix(3, 0, "ArrowDown", 12, 5), { face: 3, tier: 1 });
  assert.deepEqual(moveOnMatrix(3, 4, "ArrowDown", 12, 5), { face: 3, tier: 4 });
});

test("right off the end of a tier carries on at the start of the next", () => {
  assert.deepEqual(moveOnMatrix(11, 1, "ArrowRight", 12, 5), { face: 0, tier: 2 });
  assert.deepEqual(moveOnMatrix(0, 2, "ArrowLeft", 12, 5), { face: 11, tier: 1 });
});

test("the first and last squares of the board stay put", () => {
  assert.deepEqual(moveOnMatrix(0, 0, "ArrowLeft", 12, 5), { face: 0, tier: 0 });
  assert.deepEqual(moveOnMatrix(11, 4, "ArrowRight", 12, 5), { face: 11, tier: 4 });
});

test("the flip-through skips empty squares and comes round to the start", () => {
  assert.equal(nextFilled([true, false, true, false], 0), 2);
  assert.equal(nextFilled([true, false, true, false], 2), 0);
  assert.equal(nextFilled([false, true, false], 1), 1);
  assert.equal(nextFilled([false, false], 0), -1);
});

test("every expression has its own line and anything else gets one about itself", async () => {
  const { sampleLine, SAMPLE_LINES } = await import("./sprite-board.ts");
  assert.equal(Object.keys(SAMPLE_LINES).length, 12);
  assert.equal(sampleLine("happy", "Happy"), SAMPLE_LINES.happy);
  assert.match(sampleLine("reading", "Reading"), /reading/);
});
