import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PRESETS, autoRepeats, captionOf, datasetAdvice, epochsFor, estimateSteps, minSideFor, presetById, suggestLeaveOut, tagKey, wantsLowVram,
} from "./lora-presets.ts";

const character = presetById("character");
const style = presetById("style");
const outfit = presetById("outfit");

test("an unknown preset is the custom one", () => {
  assert.equal(presetById("nonsense").id, "custom");
  assert.equal(presetById(undefined).id, "custom");
});

test("every preset has an icon, a range of pictures and settings", () => {
  for (const p of PRESETS) {
    assert.ok(p.icon && p.title && p.tips.length, p.id);
    assert.ok(p.pictures.min <= p.pictures.ideal[0] && p.pictures.ideal[0] < p.pictures.ideal[1], p.id);
    assert.ok(p.settings.epochs > 0 && p.settings.learningRate > 0, p.id);
  }
});

test("a character strikes the hair and eyes most pictures share, and not her clothes", () => {
  const common = [
    { name: "1girl", count: 20 },
    { name: "blonde hair", count: 19 },
    { name: "blue_eyes", count: 18 },
    { name: "school uniform", count: 15 },
    { name: "ponytail", count: 6 },
    { name: "smile", count: 12 },
  ];
  assert.deepEqual(suggestLeaveOut(character, common, 20), ["blonde hair", "blue_eyes"]);
});

test("a style strikes its medium, an outfit the garments every picture shares", () => {
  const common = [
    { name: "monochrome", count: 30 },
    { name: "traditional media", count: 28 },
    { name: "1girl", count: 25 },
    { name: "outdoors", count: 9 },
  ];
  assert.deepEqual(suggestLeaveOut(style, common, 30), ["monochrome", "traditional media"]);
  assert.deepEqual(
    suggestLeaveOut(outfit, [{ name: "serafuku", count: 10 }, { name: "pleated skirt", count: 10 }, { name: "sailor collar", count: 9 }], 10),
    ["pleated skirt", "sailor collar"],
  );
});

test("a concept and custom strike nothing for you", () => {
  assert.deepEqual(suggestLeaveOut(presetById("concept"), [{ name: "blonde hair", count: 10 }], 10), []);
  assert.deepEqual(suggestLeaveOut(presetById("custom"), [{ name: "blonde hair", count: 10 }], 10), []);
});

test("with two pictures a tag on one of them is not 'shared'", () => {
  assert.deepEqual(suggestLeaveOut(character, [{ name: "red hair", count: 1 }], 2), []);
  assert.deepEqual(suggestLeaveOut(character, [{ name: "red hair", count: 2 }], 2), ["red hair"]);
});

test("repeats match the server's: some two hundred steps an epoch", () => {
  assert.equal(autoRepeats(20), 10);
  assert.equal(autoRepeats(3), 40);
  assert.equal(autoRepeats(400), 1);
  assert.equal(autoRepeats(0), 10);
  assert.equal(estimateSteps(20, 10), 2000);
  assert.equal(estimateSteps(20, 10, 5), 1000);
  assert.equal(estimateSteps(0, 10), 0);
});

test("effort scales the preset's epochs, never below two", () => {
  assert.equal(epochsFor(style, "balanced"), 12);
  assert.equal(epochsFor(style, "quick"), 6);
  assert.equal(epochsFor(style, "thorough"), 18);
  assert.equal(epochsFor({ ...style, settings: { ...style.settings, epochs: 2 } }, "quick"), 2);
});

test("too few pictures is bad, a good set says so, and the worst comes first", () => {
  const few = datasetAdvice(character, { count: 4, untagged: 2, small: 0, captions: "tags" });
  assert.equal(few[0].level, "bad");
  assert.match(few[0].text, /too few for character or person/);
  assert.match(few[1].text, /2 pictures have no tags/);
  const good = datasetAdvice(character, { count: 25, untagged: 0, small: 0, captions: "tags" });
  assert.deepEqual(good.map((a) => a.level), ["good"]);
});

test("untagged pictures do not matter when the captions are the trigger alone", () => {
  const a = datasetAdvice(style, { count: 40, untagged: 40, small: 0, captions: "trigger" });
  assert.deepEqual(a.map((x) => x.level), ["good"]);
});

test("an empty set asks for pictures, and a huge one says it is more than needed", () => {
  assert.match(datasetAdvice(style, { count: 0, untagged: 0, small: 0, captions: "tags" })[0].text, /No pictures yet/);
  assert.match(datasetAdvice(character, { count: 300, untagged: 0, small: 1, captions: "tags" })[0].text, /slower, not better/);
});

test("SDXL-family checkpoints want larger pictures and more VRAM", () => {
  assert.equal(minSideFor("sdxl"), 768);
  assert.equal(minSideFor("Pony Diffusion"), 768);
  assert.equal(minSideFor("sd-1"), 448);
  assert.equal(wantsLowVram(8192, "sdxl"), true);
  assert.equal(wantsLowVram(24576, "sdxl"), false);
  assert.equal(wantsLowVram(8192, "sd-1"), false);
  assert.equal(wantsLowVram(undefined, "sdxl"), false);
});

test("a caption is the trigger, then the tags not struck out, as the server writes it", () => {
  const tags = ["blonde hair", "smile", "Blonde_Hair", "beach", "ohwx"];
  assert.equal(captionOf("ohwx", tags, ["blonde_hair"], "tags"), "ohwx, smile, beach");
  assert.equal(captionOf("", tags, [], "tags"), "blonde hair, smile, beach, ohwx");
  assert.equal(captionOf("ohwx", tags, [], "trigger"), "ohwx");
  assert.equal(captionOf("ohwx", Array.from({ length: 60 }, (_, i) => `tag${i}`), [], "tags").split(", ").length, 41);
});

test("a tag key ignores case, spacing and underscores, but not an emoticon's", () => {
  assert.equal(tagKey(" Long_Hair "), "long hair");
  assert.equal(tagKey("^_^"), "^_^");
});
