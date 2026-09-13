import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

// A localStorage stand-in, since these run in node. Installed before the module under
// test reads it — every access in recents.ts goes through the global.
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => void store.set(key, value),
  removeItem: (key: string) => void store.delete(key),
  clear: () => store.clear(),
  key: (index: number) => [...store.keys()][index] ?? null,
  get length() { return store.size; },
} as Storage;

const { loadRecents, noteOpened, forgetOpened, recentlyOpened } = await import("./recents.ts");

beforeEach(() => store.clear());

test("nothing stored reads as an empty list", () => {
  assert.deepEqual(loadRecents(), []);
});

test("opens are newest first", () => {
  noteOpened(1, 1000);
  noteOpened(2, 2000);
  noteOpened(3, 3000);
  assert.deepEqual(loadRecents().map((entry) => entry.id), [3, 2, 1]);
});

test("re-opening moves an item to the front instead of duplicating it", () => {
  noteOpened(1, 1000);
  noteOpened(2, 2000);
  noteOpened(1, 3000);
  assert.deepEqual(loadRecents().map((entry) => entry.id), [1, 2]);
});

test("the list is capped", () => {
  for (let i = 0; i < 50; i++) noteOpened(i, i * 1000);
  const recents = loadRecents();
  assert.equal(recents.length, 24);
  // The cap keeps the newest, not the first seen.
  assert.equal(recents[0].id, 49);
});

test("a deleted item can be forgotten", () => {
  noteOpened(1, 1000);
  noteOpened(2, 2000);
  assert.deepEqual(forgetOpened(1).map((entry) => entry.id), [2]);
});

test("corrupt or foreign stored values read as empty rather than throwing", () => {
  store.set("oppai.recents.v1", "not json");
  assert.deepEqual(loadRecents(), []);
  store.set("oppai.recents.v1", JSON.stringify({ nope: true }));
  assert.deepEqual(loadRecents(), []);
  // A list whose entries are the wrong shape keeps only the usable ones.
  store.set("oppai.recents.v1", JSON.stringify([{ id: 1, at: 5 }, { id: "x", at: 6 }, null]));
  assert.deepEqual(loadRecents().map((entry) => entry.id), [1]);
});

test("items are ordered by when they were opened, and unopened ones are left out", () => {
  noteOpened(3, 3000);
  noteOpened(1, 1000);
  const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
  // 2 was never opened, so it is not in a row that means "carry on with this".
  assert.deepEqual(recentlyOpened(items).map((item) => item.id), [3, 1]);
});

test("an id whose item is gone from the library is skipped", () => {
  noteOpened(99, 5000);
  noteOpened(1, 1000);
  assert.deepEqual(recentlyOpened([{ id: 1 }]).map((item) => item.id), [1]);
});
