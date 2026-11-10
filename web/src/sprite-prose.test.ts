import { test } from "node:test";
import assert from "node:assert/strict";
import { asSentence, backdropProse, pubicProse, spriteSquareProse, SPRITE_SOLO_PROSE } from "./sprite-prose.ts";

const square = {
  shot: "A cowboy shot, framed from her head to mid-thigh.",
  doing: "She smirks with half-lidded eyes, one hand resting on her hip.",
  stance: "She stands up straight, her weight even on both feet.",
  mood: "She is composed.",
  wearing: "She is wearing a cream white fitted top and black ankle boots.",
  undress: [] as string[],
  pubic: "",
  extra: "",
  backdrop: "white" as const,
};

test("a green backdrop is said as a chroma-key screen, not a green room", () => {
  const said = spriteSquareProse({ ...square, backdrop: "green" as const });
  assert.ok(said.endsWith("solid chroma-key green screen, seamless and evenly lit, with no texture."));
  assert.ok(!said.includes("green studio backdrop"));
});

test("a square is said in sentences, one person first and the backdrop last", () => {
  const said = spriteSquareProse(square);
  assert.ok(said.startsWith(`${SPRITE_SOLO_PROSE} A cowboy shot`));
  assert.ok(said.endsWith(backdropProse("white")));
  // Sentences follow each other after a space; no tag commas between them.
  assert.ok(!said.includes(".,"));
  assert.ok(said.includes("She is composed. She is wearing"));
});

test("the outfit's own words typed as tags come out a sentence of their own", () => {
  const said = spriteSquareProse({ ...square, extra: "thigh highs, choker" });
  assert.ok(said.includes("black ankle boots. Thigh highs, choker. The background"));
});

test("an empty part leaves no gap behind", () => {
  const said = spriteSquareProse({ ...square, stance: "", mood: "  " });
  assert.ok(said.includes("on her hip. She is wearing"));
});

test("a phrase is opened with a capital and closed with a full stop only when it lacks one", () => {
  assert.equal(asSentence("thigh highs"), "Thigh highs.");
  assert.equal(asSentence("She waves!"), "She waves!");
  assert.equal(asSentence("   "), "");
});

test("the nude level says the pubic hair, or that there is none", () => {
  assert.equal(pubicProse(true, " auburn "), "Her auburn pubic hair is visible.");
  assert.equal(pubicProse(true, ""), "Her dark brown pubic hair is visible.");
  assert.match(pubicProse(false, "auburn"), /clean-shaven/);
});
