import { test } from "node:test";
import assert from "node:assert/strict";

import { compileCamera, outfitShotPrompt, scaleFor, DEFAULT_CAMERA, CAMERA_OPTIONS, type CameraSpec } from "./camera.ts";

const spec = (over: Partial<CameraSpec> = {}): CameraSpec => ({ ...DEFAULT_CAMERA, ...over });

test("the same choice always compiles to the same terms in the same order", () => {
  // The point of a closed vocabulary. A wardrobe is built over several sittings, and
  // "close up" vs "closeup" between them is a different conditioning.
  const a = compileCamera(spec({ shot: "bust", angle: "low", view: "side" }));
  const b = compileCamera(spec({ shot: "bust", angle: "low", view: "side" }));
  assert.equal(a.prompt, b.prompt);
  assert.equal(a.negative, b.negative);
});

test("a close-up negates full body, or the model frames a mid shot instead", () => {
  // Appending only positive terms is why camera prompts usually don't take: the model is
  // pulled two ways and nothing says which to drop.
  const c = compileCamera(spec({ shot: "closeup" }));
  assert.match(c.negative, /full body/);
  assert.match(c.prompt, /close-up portrait/);
  // ...and it must not negate what it is asking for.
  assert.ok(!c.negative.includes("close-up portrait"));
});

test("a full-body shot negates the crop, not the close-up framing terms it needs", () => {
  const c = compileCamera(spec({ shot: "full-body" }));
  assert.match(c.prompt, /full body shot/);
  assert.match(c.negative, /cropped legs/);
  assert.ok(!c.negative.includes("full body"), "a shot size must never negate itself");
});

test("the outfit helper gets only the selected positive shot phrase", () => {
  const outfit = outfitShotPrompt("closeup");
  const full = compileCamera(spec({ shot: "closeup", angle: "low", view: "rear", lens: "portrait-85" }));
  assert.equal(outfit, "close-up portrait, face and hair fill the frame");
  assert.ok(!outfit.includes("low angle"));
  assert.ok(!outfit.includes("from behind"));
  assert.ok(!outfit.includes("85mm"));
  assert.ok(!outfit.includes("full body"), `negative terms leaked into the outfit prompt: ${outfit}`);
  assert.notEqual(outfit, full.prompt);
});

test("every shot size declares what it is not", () => {
  for (const { id } of CAMERA_OPTIONS.shots) {
    const c = compileCamera(spec({ shot: id, lockIdentity: false }));
    assert.ok(c.negative.length > 0, `${id} has no negatives, so nothing stops the model splitting the difference`);
  }
});

test("a rear view negates the model turning the face back to the lens", () => {
  // The specific cheat a model pulls on a rear view, and the one that ruins a wardrobe
  // slot: the body faces away and the face is rotated back.
  const c = compileCamera(spec({ view: "rear" }));
  assert.match(c.negative, /looking at viewer/);
  assert.match(c.negative, /face visible/);
});

test("framing is a size, not a phrase", () => {
  // "landscape framing" in the prompt while generating 512x768 gets a tall image with
  // the words ignored.
  const portrait = compileCamera(spec({ framing: "portrait" }));
  const landscape = compileCamera(spec({ framing: "landscape" }));
  const square = compileCamera(spec({ framing: "square" }));

  assert.ok(portrait.height > portrait.width);
  assert.ok(landscape.width > landscape.height);
  assert.equal(square.width, square.height);
});

test("framing maps to the resolution family the model was trained for", () => {
  // Asking either family to work far from its own scale is the fastest way to a
  // duplicated head.
  const sd = compileCamera(spec({ framing: "portrait" }), "sd");
  const xl = compileCamera(spec({ framing: "portrait" }), "xl");
  assert.deepEqual([sd.width, sd.height], [512, 768]);
  assert.deepEqual([xl.width, xl.height], [832, 1216]);
});

test("scaleFor reads the family off the pixel count, not a model name", () => {
  assert.equal(scaleFor(512, 768), "sd");
  assert.equal(scaleFor(768, 512), "sd");
  assert.equal(scaleFor(1024, 1024), "xl");
  assert.equal(scaleFor(832, 1216), "xl");
});

test("the identity lock is on by default and leads the prompt", () => {
  const c = compileCamera(spec());
  // Earliest tokens weigh most, and identity is the thing that has to survive the rest.
  assert.ok(
    c.prompt.startsWith("consistent character design"),
    `identity terms must come first, got: ${c.prompt}`,
  );
  assert.match(c.negative, /different person/);
  assert.match(c.negative, /deformed proportions/);
});

test("turning the lock off removes the identity terms entirely", () => {
  // "unless the user intentionally changes them" — off means off, not weakened.
  const c = compileCamera(spec({ lockIdentity: false }));
  assert.ok(!c.prompt.includes("consistent character design"));
  assert.ok(!c.negative.includes("different person"));
});

test("a low angle negates the exaggeration it invites", () => {
  // A low angle is the classic way to get unintended proportions: the model reads
  // "looking up at her" as an instruction to exaggerate.
  const c = compileCamera(spec({ angle: "low" }));
  assert.match(c.prompt, /low angle/);
  assert.match(c.negative, /distorted proportions/);
  assert.match(c.negative, /high angle/);
});

test("terms appearing on two axes are emitted once", () => {
  // Every backend here weights a repeated term twice, so a duplicate silently
  // strengthens one instruction over the others. A side view and a rear view both
  // exclude "front view", which is how this arises in practice.
  const c = compileCamera(spec({ view: "side", shot: "closeup" }));
  const counted = (haystack: string, needle: string) =>
    haystack.split(", ").filter((t) => t.toLowerCase() === needle).length;
  for (const term of c.negative.split(", ")) {
    assert.equal(counted(c.negative, term.toLowerCase()), 1, `"${term}" appears more than once`);
  }
  for (const term of c.prompt.split(", ")) {
    assert.equal(counted(c.prompt, term.toLowerCase()), 1, `"${term}" appears more than once`);
  }
});

test("an unspecified lens contributes nothing", () => {
  const none = compileCamera(spec({ lens: "none" }));
  const lens = compileCamera(spec({ lens: "portrait-85" }));
  assert.ok(!none.prompt.includes("mm"));
  assert.match(lens.prompt, /85mm portrait lens/);
});

test("composition instructions do not ask the model to draw camera equipment", () => {
  for (const { id: angle } of CAMERA_OPTIONS.angles) {
    for (const { id: view } of CAMERA_OPTIONS.views) {
      const c = compileCamera(spec({ angle, view }));
      assert.ok(!/\bcamera\b/i.test(c.prompt), `physical camera leaked into the prompt: ${c.prompt}`);
      assert.match(c.negative, /camera/);
      assert.match(c.negative, /tripod/);
      assert.match(c.negative, /photographer/);
    }
  }
});

test("no compiled output has stray or empty terms", () => {
  // An empty fragment becomes ", ," which some parsers read as a weighted blank.
  for (const { id: shot } of CAMERA_OPTIONS.shots) {
    for (const { id: view } of CAMERA_OPTIONS.views) {
      for (const { id: angle } of CAMERA_OPTIONS.angles) {
        const c = compileCamera(spec({ shot, view, angle }));
        for (const text of [c.prompt, c.negative]) {
          assert.ok(!text.includes(", ,"), `empty term in: ${text}`);
          assert.ok(!text.startsWith(","), `leading comma in: ${text}`);
          assert.ok(!text.endsWith(","), `trailing comma in: ${text}`);
        }
      }
    }
  }
});

test("the option lists cover exactly what the compiler knows", () => {
  // The labels and the compiled terms come from the same tables, so a new option can
  // never appear in the UI without terms behind it.
  assert.equal(CAMERA_OPTIONS.shots.length, 7, "the brief lists seven shot sizes");
  assert.equal(CAMERA_OPTIONS.angles.length, 3);
  assert.equal(CAMERA_OPTIONS.views.length, 4);
  assert.equal(CAMERA_OPTIONS.framings.length, 3);
  for (const { id, label, hint } of CAMERA_OPTIONS.shots) {
    assert.ok(label && hint, `${id} is missing a label or hint`);
  }
});
