import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeCivitaiPosts, postDate } from "./civitai-posts.ts";
import type { CivitaiImage, CivitaiPost } from "./api.ts";

const img = (id: number): CivitaiImage => ({ id, url: `u${id}`, width: 1, height: 1, nsfwLevel: 1 });
const post = (id: number, ...ids: number[]): CivitaiPost => ({ id, images: ids.map(img) });

test("a post that continues onto the next page is folded into the card already shown", () => {
  const have = [post(10, 1, 2), post(11, 3)];
  const got = mergeCivitaiPosts(have, [post(11, 4, 5), post(12, 6)]);
  assert.deepEqual(got.map((p) => p.id), [10, 11, 12]);
  assert.deepEqual(got[1].images.map((i) => i.id), [3, 4, 5]);
  // The list on screen is not mutated in place.
  assert.equal(have[1].images.length, 1);
});

test("a repeat that is not a continuation is dropped, and a picture seen twice appears once", () => {
  const got = mergeCivitaiPosts([post(10, 1), post(11, 2)], [post(10, 9), post(11, 2, 3)]);
  assert.deepEqual(got.map((p) => p.id), [10, 11]);
  assert.deepEqual(got[0].images.map((i) => i.id), [1]);
  assert.deepEqual(got[1].images.map((i) => i.id), [2, 3]);
});

test("the first page is taken as it is", () => {
  const page = [post(1, 1)];
  const got = mergeCivitaiPosts([], page);
  assert.deepEqual(got, page);
  assert.notEqual(got, page);
});

test("a post is dated by itself, else by its first picture, else not at all", () => {
  assert.equal(postDate({ id: 1, images: [] }), "");
  assert.equal(postDate({ id: 1, images: [{ ...img(1), createdAt: "not a date" }] }), "");
  assert.notEqual(postDate({ id: 1, createdAt: "2024-02-22T16:25:40.445Z", images: [] }), "");
  assert.notEqual(postDate({ id: 1, images: [{ ...img(1), createdAt: "2024-02-22T16:25:40.445Z" }] }), "");
});
