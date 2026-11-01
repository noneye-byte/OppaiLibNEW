import { test } from "node:test";
import assert from "node:assert/strict";

const { cardHolder, vramShare, vramText } = await import("./gpu-card.ts");

const app = (id: "chat" | "images" | "video", holding: boolean, set = true) =>
  ({ id, name: id, set, holding, detail: "", canTake: true });

test("the card is with whichever program it was given to last", () => {
  assert.equal(cardHolder({ holder: "video", apps: [app("chat", true), app("video", false)] }), "video");
});

test("without a hand-over yet, the one program holding a model has it", () => {
  assert.equal(cardHolder({ holder: "", apps: [app("chat", true), app("images", false), app("video", false)] }), "chat");
});

test("two programs each holding a model is nobody in particular", () => {
  assert.equal(cardHolder({ holder: "", apps: [app("chat", true), app("images", true)] }), "");
});

test("a program given the card that has since been unset is not named", () => {
  assert.equal(cardHolder({ holder: "images", apps: [app("images", false, false), app("chat", true)] }), "chat");
});

test("the card's memory reads in gigabytes", () => {
  const gb = 1024 ** 3;
  assert.equal(vramText({ holder: "", apps: [], vramTotal: 32 * gb, vramFree: 10.6 * gb }), "21 of 32 GB used");
  assert.equal(vramText({ holder: "", apps: [], vramTotal: 8 * gb, vramFree: 6.5 * gb }), "1.5 of 8.0 GB used");
  assert.equal(vramText({ holder: "", apps: [] }), "");
  assert.equal(vramShare({ holder: "", apps: [], vramTotal: 4, vramFree: 1 }), 0.75);
});
