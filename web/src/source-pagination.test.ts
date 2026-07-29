import assert from "node:assert/strict";
import test from "node:test";
import type { SourceItem } from "./api.ts";
import { mergeSourcePage } from "./source-pagination.ts";

const item = (id: string): SourceItem => ({ id, title: id, kind: "image", thumbUrl: `${id}.jpg` });

test("source paging appends new items and drops an overlapping pinned item", () => {
  const merged = mergeSourcePage([item("a"), item("pinned")], {
    items: [item("pinned"), item("b")], cursor: "3",
  }, "2", false);
  assert.deepEqual(merged.items.map((entry) => entry.id), ["a", "pinned", "b"]);
  assert.equal(merged.cursor, "3");
  assert.equal(merged.error, "");
});

test("source paging stops when an adapter repeats a page", () => {
  const current = [item("a"), item("b")];
  const merged = mergeSourcePage(current, { items: [item("a"), item("b")], cursor: "3" }, "2", false);
  assert.equal(merged.items, current);
  assert.equal(merged.cursor, "");
  assert.match(merged.error, /repeated/i);
});

test("source paging stops a cursor that does not advance", () => {
  const current = [item("a")];
  const merged = mergeSourcePage(current, { items: [item("b")], cursor: "2" }, "2", false);
  assert.equal(merged.items, current);
  assert.equal(merged.cursor, "");
  assert.match(merged.error, /cursor/i);
});

test("reset replaces the feed and removes duplicate IDs in its first page", () => {
  const merged = mergeSourcePage([item("old")], { items: [item("a"), item("a")], cursor: "2" }, "", true);
  assert.deepEqual(merged.items.map((entry) => entry.id), ["a"]);
  assert.equal(merged.cursor, "2");
});
