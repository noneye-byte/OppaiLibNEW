import { test } from "node:test";
import assert from "node:assert/strict";
import { civitaiSized, compactNumber, mergeComments, mergeImages, neighbours, postPictures, reactionsOf, timeAgo } from "./civitai-browse.ts";
import type { CivitaiImage } from "./api.ts";

const pic = (id: number): CivitaiImage => ({ id, url: `https://image.civitai.com/x/${id}.jpeg`, width: 512, height: 768, nsfwLevel: 1 });

test("a picture's reactions leave out the ones nobody gave, and comments are counted apart", () => {
  const r = reactionsOf({ likes: 3, hearts: 10, laughs: 0, cries: 1, comments: 4 });
  assert.deepEqual(r.list.map((x) => x.kind), ["hearts", "likes", "cries"]);
  assert.equal(r.total, 14);
  assert.equal(r.comments, 4);
  assert.deepEqual(reactionsOf(undefined), { list: [], total: 0, comments: 0 });
});

test("a page that repeats the end of the last one adds only the pictures not already shown", () => {
  const merged = mergeImages([pic(1), pic(2), pic(3)], [pic(3), pic(4), pic(4), pic(5)]);
  assert.deepEqual(merged.map((p) => p.id), [1, 2, 3, 4, 5]);
});

test("the arrows step through the list a picture was opened from, and stop at its ends", () => {
  const list = [pic(1), pic(2), pic(3)];
  assert.deepEqual(neighbours(list, 2), { index: 1, prev: list[0], next: list[2] });
  assert.equal(neighbours(list, 1).prev, undefined);
  assert.equal(neighbours(list, 3).next, undefined);
  assert.equal(neighbours(list, 9).index, -1);
});

test("a post's strip shows the opened picture before the post has loaded, and the post's order after", () => {
  assert.deepEqual(postPictures(pic(7), undefined).map((p) => p.id), [7]);
  assert.deepEqual(postPictures(pic(7), [pic(5), pic(7), pic(9)]).map((p) => p.id), [5, 7, 9]);
  // A feed that leaves the opened one out of its post (an adult picture with adult off)
  // still shows it.
  assert.deepEqual(postPictures(pic(7), [pic(5), pic(9)]).map((p) => p.id), [7, 5, 9]);
});

test("a comment's age reads the way the site writes it", () => {
  const now = Date.parse("2026-11-20T12:00:00Z");
  assert.equal(timeAgo("2026-11-20T11:59:30Z", now), "just now");
  assert.equal(timeAgo("2026-11-20T11:15:00Z", now), "45m");
  assert.equal(timeAgo("2026-11-20T07:00:00Z", now), "5h");
  assert.equal(timeAgo("2026-11-17T12:00:00Z", now), "3d");
  assert.notEqual(timeAgo("2025-01-02T12:00:00Z", now), "");
  assert.equal(timeAgo("not a date", now), "");
  assert.equal(timeAgo(undefined, now), "");
});

test("a comment repeated across a page boundary is listed once", () => {
  const c = (id: number) => ({ id, user: "u", html: "<p>x</p>" });
  assert.deepEqual(mergeComments([c(1), c(2)], [c(2), c(3)]).map((x) => x.id), [1, 2, 3]);
});

test("counts are compact without trailing noughts", () => {
  assert.equal(compactNumber(0), "0");
  assert.equal(compactNumber(950), "950");
  assert.equal(compactNumber(1000), "1k");
  assert.equal(compactNumber(1540), "1.5k");
  assert.equal(compactNumber(53_000), "53k");
  assert.equal(compactNumber(2_400_000), "2.4M");
});

test("a tile asks the CDN for a picture its own width, and leaves other addresses alone", () => {
  const original = "https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/b1feb284/original=true/b1feb284.jpeg";
  assert.equal(civitaiSized(original, 450), "https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/b1feb284/width=450/b1feb284.jpeg");
  assert.equal(civitaiSized(original.replace("original=true", "width=1200"), 320), "https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/b1feb284/width=320/b1feb284.jpeg");
  // A clip's still keeps the options that make it a still.
  const still = "https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/abc/anim=false,transcode=true,width=450,optimized=true/abc.jpeg";
  assert.equal(civitaiSized(still, 160), "https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/abc/anim=false,transcode=true,width=160,optimized=true/abc.jpeg");
  assert.equal(civitaiSized("https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/abc/anim=false,transcode=true/abc.jpeg", 160),
    "https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/abc/anim=false,transcode=true/abc.jpeg");
  assert.equal(civitaiSized("https://example.com/a/b/c.jpeg", 450), "https://example.com/a/b/c.jpeg");
  assert.equal(civitaiSized("https://image.civitai.com/a.jpeg", 450), "https://image.civitai.com/a.jpeg");
});
