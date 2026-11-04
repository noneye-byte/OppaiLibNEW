import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_OUTFIT_GEAR,
  EMPTY_OUTFIT_GEAR,
  OUTFIT_UNDRESS_LEVELS,
  OUTFIT_GEAR_SLOTS,
  colorFamilies,
  emphasize,
  gearColorNegatives,
  gearKey,
  gearPhrase,
  gearWorn,
  isOutfitGear,
  normalizeOutfitGear,
  undressLevel,
  undressPrompt,
  type GearPiece,
} from "./outfit-loadout.ts";

const slotFor = (key: string) => OUTFIT_GEAR_SLOTS.find((s) => s.key === key)!;

test("the RPG loadout exposes exactly the requested ten slots", () => {
  assert.deepEqual(
    OUTFIT_GEAR_SLOTS.map(({ key }) => key),
    ["head", "top", "bottoms", "shoes", "panties", "bra", "hand1", "hand2", "extra1", "extra2"],
  );
});

test("each tier is one step further undressed than the last", () => {
  assert.deepEqual(OUTFIT_UNDRESS_LEVELS.map(({ exposure }) => exposure), [
    { outer: "on", bra: "hidden", panties: "hidden" },
    { outer: "loosened", bra: "hidden", panties: "hidden" },
    { outer: "open", bra: "showing", panties: "hidden" },
    { outer: "off", bra: "showing", panties: "showing" },
    { outer: "off", bra: "off", panties: "off" },
  ]);
  assert.deepEqual(undressLevel(9), undressLevel(4));
  assert.deepEqual(undressLevel(-1), undressLevel(0));
});

test("a dressed square names no underwear and keeps it out in the negative", () => {
  const calm = undressPrompt(DEFAULT_OUTFIT_GEAR, undressLevel(0));
  assert.deepEqual(calm.hidden, ["bra", "panties"]);
  assert.deepEqual(calm.prompt, []);
  assert.deepEqual(calm.negative, ["bra", "panties", "underwear, lingerie"]);
  assert.deepEqual(undressPrompt(DEFAULT_OUTFIT_GEAR, undressLevel(1)).hidden, ["bra", "panties"]);
});

test("an open top shows the bra and still hides the panties", () => {
  const flirty = undressPrompt(DEFAULT_OUTFIT_GEAR, undressLevel(2));
  assert.deepEqual(flirty.hidden, ["panties"]);
  assert.deepEqual(flirty.prompt, ["open clothes, top pulled open", "bra visible"]);
  assert.deepEqual(flirty.negative, ["panties"]);
});

test("down to her underwear, the outer clothes are left out and negated by name", () => {
  const heated = undressPrompt(DEFAULT_OUTFIT_GEAR, undressLevel(3));
  assert.deepEqual(heated.hidden, ["top", "bottoms"]);
  assert.deepEqual(heated.prompt, ["underwear only"]);
  assert.deepEqual(heated.negative, ["fitted top", "pleated skirt"]);
});

test("nude leaves every garment out", () => {
  const peak = undressPrompt(DEFAULT_OUTFIT_GEAR, undressLevel(4));
  assert.deepEqual(peak.hidden, ["top", "bottoms", "bra", "panties"]);
  assert.deepEqual(peak.prompt, ["completely nude, naked", "bare breasts, nipples", "pussy, vulva visible"]);
});

test("with no bra on, an open top shows her rather than a bra", () => {
  const gear = { ...DEFAULT_OUTFIT_GEAR, bra: { color: "", item: "" } };
  assert.deepEqual(undressPrompt(gear, undressLevel(0)).prompt, []);
  assert.deepEqual(undressPrompt(gear, undressLevel(2)).prompt, ["open clothes, top pulled open", "bare breasts, nipples"]);
});

test("underwear with nothing over it is what she is wearing, at any level", () => {
  const gear = { ...DEFAULT_OUTFIT_GEAR, top: { color: "", item: "" } };
  const calm = undressPrompt(gear, undressLevel(0));
  assert.deepEqual(calm.hidden, ["panties"]);
  assert.deepEqual(calm.prompt, []);
});

test("draft gear validation requires a colour and an item in every slot", () => {
  assert.equal(isOutfitGear(DEFAULT_OUTFIT_GEAR), true);
  assert.equal(isOutfitGear({ ...DEFAULT_OUTFIT_GEAR, bra: 7 }), false);
  assert.equal(isOutfitGear({ ...DEFAULT_OUTFIT_GEAR, bra: "lace bra" }), false);
  assert.equal(isOutfitGear({ ...DEFAULT_OUTFIT_GEAR, bra: { item: "lace bra" } }), false);
  const { extra2: _missing, ...incomplete } = DEFAULT_OUTFIT_GEAR;
  assert.equal(isOutfitGear(incomplete), false);
});

test("a loadout saved before colours existed keeps its garments", () => {
  const legacy = { top: "fitted top", bottoms: "pleated skirt", bra: "lace bra" };
  const gear = normalizeOutfitGear(legacy);
  assert.equal(isOutfitGear(gear), true);
  assert.deepEqual(gear.top, { color: "", item: "fitted top" });
  assert.deepEqual(gear.bottoms, { color: "", item: "pleated skirt" });
  // Slots the old record never mentioned come back empty, not defaulted.
  assert.deepEqual(gear.shoes, { color: "", item: "" });
});

test("normalizing junk yields a complete empty loadout", () => {
  assert.deepEqual(normalizeOutfitGear(null), EMPTY_OUTFIT_GEAR);
  assert.deepEqual(normalizeOutfitGear([1, 2]), EMPTY_OUTFIT_GEAR);
  assert.deepEqual(normalizeOutfitGear({ top: 7 }), EMPTY_OUTFIT_GEAR);
});

test("colour words are resolved to their family, including shades", () => {
  assert.deepEqual(colorFamilies("crimson"), ["red"]);
  assert.deepEqual(colorFamilies("charcoal"), ["black"]);
  assert.deepEqual(colorFamilies("cream white"), ["white"]);
  assert.deepEqual(colorFamilies("black and white striped"), ["white", "black"]);
  assert.deepEqual(colorFamilies("iridescent"), []);
});

test("emphasis follows the generator's own weighting syntax", () => {
  assert.equal(emphasize("crimson top", 1.25, "a1111"), "(crimson top:1.25)");
  assert.equal(emphasize("crimson top", 1.25, "invokeai"), "(crimson top)1.25");
  // An unknown backend gets plain text: a wrong marker is worse than no marker.
  assert.equal(emphasize("crimson top", 1.25, "something-else"), "crimson top");
  assert.equal(emphasize("   ", 1.25, "a1111"), "");
});

test("a coloured piece leads with its colour and repeats it against the garment noun", () => {
  const phrase = gearPhrase(slotFor("top"), { color: "crimson", item: "fitted top" }, "invokeai", true);
  assert.equal(phrase, "top: (crimson fitted top)1.25, crimson top");
});

test("colour locking off keeps the phrase plain, and an uncoloured piece is never weighted", () => {
  assert.equal(
    gearPhrase(slotFor("top"), { color: "crimson", item: "fitted top" }, "invokeai", false),
    "top: crimson fitted top",
  );
  assert.equal(
    gearPhrase(slotFor("top"), { color: "", item: "fitted top" }, "invokeai", true),
    "top: fitted top",
  );
  assert.equal(gearPhrase(slotFor("top"), { color: "crimson", item: "" }, "invokeai", true), "");
});

test("colour negatives name every family the chosen colour is not", () => {
  const negatives = gearColorNegatives(slotFor("top"), { color: "crimson", item: "fitted top" });
  assert.ok(negatives.includes("blue top"));
  assert.ok(negatives.includes("green top"));
  // The colour that was asked for must never be pushed into the negative prompt.
  assert.ok(!negatives.some((n) => n.startsWith("red ")));
});

test("a piece with no colour, no item, or an unrecognised colour contributes no negatives", () => {
  assert.deepEqual(gearColorNegatives(slotFor("top"), { color: "", item: "fitted top" }), []);
  assert.deepEqual(gearColorNegatives(slotFor("top"), { color: "crimson", item: "" }), []);
  assert.deepEqual(gearColorNegatives(slotFor("top"), { color: "iridescent", item: "fitted top" }), []);
});

test("the gear key ignores case and whitespace but not the colour", () => {
  const a = { ...EMPTY_OUTFIT_GEAR, top: { color: "Crimson", item: " Fitted Top " } };
  const b = { ...EMPTY_OUTFIT_GEAR, top: { color: "crimson", item: "fitted top" } };
  const c = { ...EMPTY_OUTFIT_GEAR, top: { color: "navy", item: "fitted top" } };
  assert.equal(gearKey(a), gearKey(b));
  assert.notEqual(gearKey(b), gearKey(c));
});

test("a piece switched off is kept in the recipe but not worn", () => {
  const gear = normalizeOutfitGear({ ...DEFAULT_OUTFIT_GEAR, top: { color: "red", item: "jacket", off: true } });
  assert.equal(gear.top.off, true);
  assert.equal(gearWorn(gear.top), false);
  assert.equal(gearPhrase(OUTFIT_GEAR_SLOTS[1], gear.top, "a1111", true), "");
  assert.deepEqual(gearColorNegatives(OUTFIT_GEAR_SLOTS[1], gear.top), []);
  // Off keys the same as empty: the generator sees the same clothes either way.
  const cleared = normalizeOutfitGear({ ...DEFAULT_OUTFIT_GEAR, top: { color: "", item: "" } });
  assert.equal(gearKey(gear), gearKey(cleared));
  // Loadouts saved before the switch existed read as worn.
  assert.equal(gearWorn(normalizeOutfitGear({ top: "fitted top" }).top), true);
});

// --- Per-slot prompt wording -------------------------------------------------

test("a slot's prompt word can be overridden, and the colour-lock noun follows it", () => {
  const slot = slotFor("top");
  const piece: GearPiece = { color: "crimson", item: "pauldron", prompt: "armour" };
  // The override leads the clause where the built-in "top" used to.
  assert.equal(gearPhrase(slot, piece, "a1111", false), "armour: crimson pauldron");
  // And the noun repeated after the weighted colour follows it rather than
  // contradicting it with the built-in word.
  assert.equal(
    gearPhrase(slot, piece, "a1111", true),
    "armour: (crimson pauldron:1.25), crimson armour",
  );
});

test("the colour-lock noun can be set apart from the prompt word", () => {
  const slot = slotFor("top");
  const piece: GearPiece = { color: "crimson", item: "pauldron", prompt: "armour", noun: "shoulder plate" };
  assert.equal(
    gearPhrase(slot, piece, "a1111", true),
    "armour: (crimson pauldron:1.25), crimson shoulder plate",
  );
  // Negatives name the same noun, so what it must not be matches what it is.
  assert.ok(gearColorNegatives(slot, piece).every((entry) => entry.endsWith("shoulder plate")));
});

test("an empty or blank override falls back to the built-in wording", () => {
  const slot = slotFor("top");
  assert.equal(gearPhrase(slot, { color: "", item: "tee", prompt: "   " }, "a1111", false), "top: tee");
  assert.equal(gearPhrase(slot, { color: "", item: "tee" }, "a1111", false), "top: tee");
});

test("overrides survive being stored and read back", () => {
  const stored = JSON.parse(JSON.stringify({
    ...EMPTY_OUTFIT_GEAR,
    top: { color: "crimson", item: "pauldron", prompt: "armour", noun: "shoulder plate" },
  }));
  const gear = normalizeOutfitGear(stored);
  assert.equal(gear.top.prompt, "armour");
  assert.equal(gear.top.noun, "shoulder plate");
});

test("renaming a slot changes the loadout's key, so old squares stop matching", () => {
  const base = { ...EMPTY_OUTFIT_GEAR, top: { color: "red", item: "tee" } };
  const renamed = { ...EMPTY_OUTFIT_GEAR, top: { color: "red", item: "tee", prompt: "armour" } };
  assert.notEqual(gearKey(base), gearKey(renamed));
});
