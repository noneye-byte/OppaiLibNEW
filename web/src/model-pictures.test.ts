import { test } from "node:test";
import assert from "node:assert/strict";
import { addCommunityPage, creatorPictures } from "./model-pictures.ts";
import type { CivitaiImage, CivitaiModel } from "./api.ts";

const model = {
  id: 1, name: "Ink", type: "LORA", downloads: 0, likes: 0, nsfw: false, tags: [], installed: true,
  versions: [
    { id: 10, name: "v1", base: "SDXL 1.0", trainedWords: [], downloadUrl: "", images: ["a", "b"] },
    { id: 11, name: "v2", base: "SDXL 1.0", trainedWords: [], downloadUrl: "", images: ["c", "a", ""] },
  ],
} as CivitaiModel;

test("the linked version's showcase comes first, and a picture two versions share comes once", () => {
  assert.deepEqual(creatorPictures(model, 11), ["c", "a", "b"]);
  assert.deepEqual(creatorPictures(model, 10), ["a", "b", "c"]);
  assert.deepEqual(creatorPictures(null, 10), []);
});

const pic = (id: number, username: string): CivitaiImage =>
  ({ id, url: `u${id}`, width: 1, height: 1, nsfwLevel: 1, username });

test("the community feed leaves out the creator's own posts and pictures already shown", () => {
  const first = addCommunityPage([], [pic(1, "fan"), pic(2, "Maker"), pic(3, "other")], "maker");
  assert.deepEqual(first.map((i) => i.id), [1, 3]);
  const second = addCommunityPage(first, [pic(3, "other"), pic(4, "fan")], "maker");
  assert.deepEqual(second.map((i) => i.id), [1, 3, 4]);
});
