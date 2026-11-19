import { test } from "node:test";
import assert from "node:assert/strict";
const { CLIP_CUT_MODELS, clipCutModelHelp } = await import("./clip-cut-models.ts");

test("the anime model is offered first, as the server's default is", () => {
  assert.equal(CLIP_CUT_MODELS[0].id, "BiRefNet_toonout");
});

test("no model chosen explains the default", () => {
  assert.equal(clipCutModelHelp(""), CLIP_CUT_MODELS[0].help);
  assert.equal(clipCutModelHelp(undefined), CLIP_CUT_MODELS[0].help);
});

test("the video model says it has to be put in place by hand", () => {
  assert.match(clipCutModelHelp("VRMBG-3.0"), /does not download itself/);
});

test("a model no longer offered says so rather than explaining another", () => {
  assert.match(clipCutModelHelp("u2net"), /"u2net" is not one/);
});
