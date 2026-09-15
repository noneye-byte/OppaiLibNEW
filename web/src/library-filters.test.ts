import { test } from "node:test";
import assert from "node:assert/strict";
import { activeFilterCount, buildQuery, filterScope, filtersApply, NO_FILTERS } from "./library-filters.ts";

test("the menu belongs on the grid screens and nowhere else", () => {
  assert.equal(filtersApply("video", ""), true);
  assert.equal(filtersApply("favorites", ""), true);
  assert.equal(filtersApply("home", "blue hair"), true);
  assert.equal(filtersApply("home", ""), false);
  assert.equal(filtersApply("chat", ""), false);
  assert.equal(filtersApply("browse", "  "), false);
});

test("a kind section fixes the kind and Favorites fixes the favourite", () => {
  assert.deepEqual(filterScope("video", ""), { kind: false, favorite: true });
  assert.deepEqual(filterScope("favorites", ""), { kind: true, favorite: false });
  assert.deepEqual(filterScope("video", "cats"), { kind: true, favorite: true });
});

test("a search carries every filter beside the words", () => {
  const q = buildQuery("home", " red dress ", undefined, { kind: "image", favorite: true, minRating: 4 }, "rating");
  assert.deepEqual(q, { sort: "rating", q: "red dress", kind: "image", favorite: true, minRating: 4 });
});

test("on a kind section the chip narrows and the menu's kind is ignored", () => {
  const q = buildQuery("video", "", "swimsuit", { kind: "image", favorite: true, minRating: 0 }, "newest");
  assert.deepEqual(q, { sort: "newest", kind: "video", tag: "swimsuit", favorite: true });
  assert.deepEqual(buildQuery("video", "", "All", NO_FILTERS, "newest"), { sort: "newest", kind: "video" });
});

test("Favorites is favourites whatever the menu says, and can still pick a kind", () => {
  const q = buildQuery("favorites", "", undefined, { kind: "gif", favorite: false, minRating: 5 }, "oldest");
  assert.deepEqual(q, { sort: "oldest", favorite: true, kind: "gif", minRating: 5 });
});

test("the badge counts only what the screen lets the menu do", () => {
  const all = { kind: "image", favorite: true, minRating: 3 };
  assert.equal(activeFilterCount(all, filterScope("home", "x")), 3);
  assert.equal(activeFilterCount(all, filterScope("video", "")), 2);
  assert.equal(activeFilterCount(all, filterScope("favorites", "")), 2);
  assert.equal(activeFilterCount(NO_FILTERS, filterScope("home", "x")), 0);
});
