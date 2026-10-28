import { test } from "node:test";
import assert from "node:assert/strict";

const { dayLabel, groupByDay } = await import("./gallery-days.ts");

// A Wednesday afternoon.
const now = new Date(2026, 9, 28, 15, 30);

test("the last two days are named, the rest of the week by weekday", () => {
  assert.equal(dayLabel(new Date(2026, 9, 28, 0, 5), now, "en-GB"), "Today");
  assert.equal(dayLabel(new Date(2026, 9, 27, 23, 59), now, "en-GB"), "Yesterday");
  assert.equal(dayLabel(new Date(2026, 9, 24, 12), now, "en-GB"), "Saturday");
});

test("older days are dates, with the year only when it is not this one", () => {
  assert.equal(dayLabel(new Date(2026, 8, 3, 12), now, "en-GB"), "Thu 3 September");
  assert.equal(dayLabel(new Date(2025, 11, 31, 12), now, "en-GB"), "31 December 2025");
});

test("pictures fall into runs of one day, in the order they came", () => {
  const groups = groupByDay([
    { name: "a", created: new Date(2026, 9, 28, 14).toISOString() },
    { name: "b", created: new Date(2026, 9, 28, 9).toISOString() },
    { name: "c", created: new Date(2026, 9, 27, 22).toISOString() },
    { name: "d" },
    { name: "e", created: "not a date" },
    { name: "f", created: new Date(2026, 9, 20).toISOString() },
  ], now, "en-GB");
  assert.deepEqual(groups.map((g) => [g.label, g.items.map((i) => i.name).join("")]), [
    ["Today", "ab"], ["Yesterday", "c"], ["Undated", "de"], ["Tue 20 October", "f"],
  ]);
});
