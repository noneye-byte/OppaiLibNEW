import test from "node:test";
import assert from "node:assert/strict";
import type { ForgeFamily, GenModel, ImageGenStatus } from "./api.js";
import { NO_FORGE_CHOICES, familyFor, forgeParams, needsLine, needsState, samplerOptions, tuneLabel } from "./forge.ts";

const anima: ForgeFamily = {
  key: "anima", id: "anima", label: "Anima", tune: "shift", reference: "anima_do_reference", ready: false,
  needs: [
    { kind: "te", label: "Qwen3 0.6B text encoder", have: [], get: { name: "qwen_3_06b_base.safetensors", url: "", gb: 1.19 } },
    { kind: "vae", label: "Qwen-Image VAE", have: ["qwen_image_vae.safetensors"], get: { name: "", url: "", gb: 0.25 } },
  ],
};

test("a form left alone sends nothing for Forge", () => {
  assert.equal(forgeParams(NO_FORGE_CHOICES, anima), undefined);
});

test("only what was changed goes out", () => {
  assert.deepEqual(forgeParams({ ...NO_FORGE_CHOICES, shift: 2.5, spectrum: true }, anima), { shift: 2.5, spectrum: true });
});

test("a shift is not sent to a family it means nothing to", () => {
  const sdxl: ForgeFamily = { key: "sdxl", id: "sdxl", label: "SDXL", ready: true };
  assert.equal(forgeParams({ ...NO_FORGE_CHOICES, shift: 3 }, sdxl), undefined);
});

test("reference pictures go only to a family that takes them", () => {
  const sdxl: ForgeFamily = { key: "sdxl", id: "sdxl", label: "SDXL", ready: true };
  assert.equal(forgeParams(NO_FORGE_CHOICES, sdxl, ["data:a"]), undefined);
  assert.deepEqual(forgeParams(NO_FORGE_CHOICES, anima, ["data:a"]), { references: ["data:a"] });
});

test("a refiner brings where it takes over with it", () => {
  assert.deepEqual(forgeParams({ ...NO_FORGE_CHOICES, refiner: "x" }, anima), { refiner: "x", refinerAt: 0.8 });
});

test("Klein's larger size finds its own entry", () => {
  const status = { forgeFamilies: [{ key: "flux2", ready: true }, { key: "flux2-9b", ready: false }] } as ImageGenStatus;
  const model = (variant: string) => ({ family: "flux2", variant }) as GenModel;
  assert.equal(familyFor(status, model("4b"))?.key, "flux2");
  assert.equal(familyFor(status, model("9b"))?.key, "flux2-9b");
  assert.equal(familyFor(status, undefined), undefined);
});

test("what a family is short of decides what it offers", () => {
  assert.equal(needsState(anima), "get");
  assert.equal(needsState({ ...anima, downloading: true }), "downloading");
  assert.equal(needsState(undefined), "ready");
  const onDisk = { ...anima, needs: anima.needs!.map((s) => (s.have.length ? s : { ...s, onDisk: true })) };
  assert.equal(needsState(onDisk), "restart");
});

test("a family's needs are said in a sentence with the size to fetch", () => {
  assert.equal(needsLine(anima), "Anima needs Qwen3 0.6B text encoder beside it — 1.2 GB to fetch.");
  assert.equal(needsLine(undefined), "");
});

test("a file on the disk is not offered for download again", () => {
  const onDisk = { ...anima, needs: anima.needs!.map((s) => (s.have.length ? s : { ...s, onDisk: true })) };
  assert.match(needsLine(onDisk), /Restart Forge/);
});

test("Forge's one field is said as what it means", () => {
  assert.equal(tuneLabel("shift"), "Shift");
  assert.equal(tuneLabel("distilled"), "Distilled CFG");
  assert.equal(tuneLabel(undefined), "");
});

test("a sampler Forge does not list stays selectable", () => {
  assert.deepEqual(samplerOptions(["Euler"], "dpmpp_2m_k"), ["dpmpp_2m_k", "Euler"]);
  assert.deepEqual(samplerOptions(["Euler"], "Euler"), ["Euler"]);
  assert.deepEqual(samplerOptions(undefined, ""), []);
});
