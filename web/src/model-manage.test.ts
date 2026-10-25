import { test } from "node:test";
import assert from "node:assert/strict";
import { manageModelsNote } from "./model-manage.ts";

test("a generator that manages its models has nothing to explain", () => {
  assert.equal(manageModelsNote({ backend: "invokeai", manageModels: true }), "");
  assert.equal(manageModelsNote({ backend: "a1111", manageModels: true }), "");
  assert.equal(manageModelsNote(null), "");
});

test("a folder that is set but wrong is described, not asked for again", () => {
  const note = manageModelsNote({ backend: "a1111", manageModels: false, modelsDirProblem: "/a1111-models holds neither Stable-diffusion nor Lora" });
  assert.match(note, /^\/a1111-models holds neither/);
  assert.doesNotMatch(note, /Map that folder/);
});

test("with nothing mounted the note says where to mount it", () => {
  assert.match(manageModelsNote({ backend: "a1111", manageModels: false }), /\/a1111-models/);
});
