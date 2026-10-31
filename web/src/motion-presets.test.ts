import { test } from "node:test";
import assert from "node:assert/strict";

const { MOTION_PRESETS, SHOWCASE_PRESETS, hasPhrase, isShowcase, togglePhrase, toggleShowcase } = await import("./motion-presets.ts");

test("a preset pressed on an empty box writes one sentence", () => {
  assert.equal(togglePhrase("", "She blinks naturally"), "She blinks naturally.");
});

test("a preset is added after what was typed, as a sentence of its own", () => {
  assert.equal(togglePhrase("She turns and smiles", "She blinks naturally"), "She turns and smiles. She blinks naturally.");
});

test("pressing a preset again takes its sentence back out", () => {
  const once = togglePhrase("She turns and smiles.", "She blinks naturally");
  assert.equal(togglePhrase(once, "She blinks naturally"), "She turns and smiles.");
});

test("taking out the only sentence leaves the box empty", () => {
  assert.equal(togglePhrase("She blinks naturally.", "She blinks naturally"), "");
});

test("a preset is recognised whatever its case or full stop", () => {
  assert.ok(hasPhrase("she BLINKS naturally", "She blinks naturally"));
  assert.ok(hasPhrase("Rain. She blinks naturally!", "She blinks naturally"));
});

test("an edited preset is the user's and is not taken out", () => {
  const edited = "She blinks naturally and slowly.";
  assert.equal(hasPhrase(edited, "She blinks naturally"), false);
  assert.equal(togglePhrase(edited, "She blinks naturally"), "She blinks naturally and slowly. She blinks naturally.");
});

test("sentences on lines of their own are read as sentences", () => {
  assert.ok(hasPhrase("Rain falls\nShe blinks naturally", "She blinks naturally"));
});

test("every preset has a phrase that reads as a sentence and a unique id", () => {
  const ids = new Set(MOTION_PRESETS.map((p) => p.id));
  assert.equal(ids.size, MOTION_PRESETS.length);
  for (const p of MOTION_PRESETS) assert.match(p.phrase, /^[A-Z][^.!?]+$/, p.id);
});

test("the showcase puts her blink, breath, hair, clothes and a still camera in front of what was typed", () => {
  const on = toggleShowcase("She is on a balcony at night.");
  assert.ok(isShowcase(on));
  assert.match(on, /^The camera stays perfectly still\. She holds her pose/);
  assert.match(on, /She blinks naturally\./);
  assert.match(on, /Her hair flows/);
  assert.match(on, /Her clothes sway/);
  assert.match(on, /She is on a balcony at night\.$/);
  // Pressed again it leaves only what was hers.
  assert.equal(toggleShowcase(on), "She is on a balcony at night.");
});

test("a showcase part already typed is not written twice, and one pressed off ends the showcase", () => {
  const on = toggleShowcase("She blinks naturally.");
  assert.equal(on.match(/She blinks naturally/g)?.length, 1);
  const blink = MOTION_PRESETS.find((p) => p.id === "blink")!;
  assert.equal(isShowcase(togglePhrase(on, blink.phrase)), false);
  assert.equal(SHOWCASE_PRESETS.every((id) => MOTION_PRESETS.some((p) => p.id === id)), true);
});
