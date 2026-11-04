import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const { MISC_MOTION, miscClipForm, miscMotionLabel } = await import("./misc-motion.ts");
const { toggleShowcase } = await import("./motion-presets.ts");

const here = dirname(fileURLToPath(import.meta.url));

test("every state the server knows has a length, and nothing else does", () => {
  // The vocabulary is the server's (libby_activities.go); a state added there with no
  // length here would be animated at the expression squares' length, which is wrong
  // for a moment the app plays once.
  const source = readFileSync(join(here, "../../backend/internal/api/libby_activities.go"), "utf8");
  const ids = [...source.matchAll(/\{ID: "([a-z]+)"/g)].map((m) => m[1]);
  assert.ok(ids.length > 20);
  assert.deepEqual(Object.keys(MISC_MOTION).sort(), [...ids].sort());
});

test("a misc square takes its own length and loop, with its movement leading the prompt", () => {
  const form = { seconds: 5, makeLoop: true, prompt: toggleShowcase(""), steps: 20 };
  const greeting = miscClipForm(form, "greeting");
  assert.equal(greeting.seconds, 2);
  assert.equal(greeting.makeLoop, false);
  assert.equal(greeting.steps, 20);
  assert.ok(greeting.prompt.startsWith("She looks up, smiles and gives a small wave hello. "));
  // "Holds her pose" is right for a face and wrong for someone moving.
  assert.ok(!/holds her pose/i.test(greeting.prompt));
  assert.ok(greeting.prompt.includes("She blinks naturally."));
});

test("an expression square keeps the Motion tab's choices untouched", () => {
  const form = { seconds: 5, makeLoop: true, prompt: "She blinks naturally." };
  assert.equal(miscClipForm(form, "happy"), form);
});

test("an empty prompt becomes the movement alone", () => {
  assert.equal(miscClipForm({ seconds: 3, makeLoop: true, prompt: "" }, "typing").prompt, "Her fingers tap quickly at the keys.");
});

test("the panel says how a square's clip is cut", () => {
  assert.equal(miscMotionLabel("typing"), "2 s, loops");
  assert.equal(miscMotionLabel("startled"), "1 s, plays once");
  assert.equal(miscMotionLabel("happy"), "");
});
