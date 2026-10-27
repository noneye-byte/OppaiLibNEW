import { test } from "node:test";
import assert from "node:assert/strict";

const { rule34Query, rule34Keeps } = await import("./rule34-search.ts");

test("a search leaves out moving pictures and, by default, AI ones", () => {
  assert.equal(rule34Query("  artist_x  solo ", true),
    "artist_x solo -animated -video -ai_generated -ai-created -ai_assisted -stable_diffusion -novelai -midjourney");
  assert.equal(rule34Query("artist_x", false), "artist_x -animated -video");
});

test("a tag already in the search is not added again, either way round", () => {
  assert.equal(rule34Query("artist_x -video ai_generated", true),
    "artist_x -video ai_generated -animated -ai-created -ai_assisted -stable_diffusion -novelai -midjourney");
});

test("a post tagged as a model's drawing is dropped even if the search let it through", () => {
  const post = (id: string, kind: "image" | "thread" | "video", tags: string[]) =>
    ({ id, title: id, kind, thumbUrl: "", tags });
  const kept = rule34Keeps([
    post("1", "image", ["solo", "AI_Generated"]),
    post("2", "thread", ["solo"]),
    post("3", "video", ["solo"]),
    post("4", "image", ["solo"]),
  ], true);
  assert.deepEqual(kept.map((p) => p.id), ["2", "4"]);
  assert.deepEqual(rule34Keeps([post("1", "image", ["ai_generated"])], false).map((p) => p.id), ["1"]);
});
