import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_OUTFIT_GEAR,
  EMPTY_OUTFIT_GEAR,
  OUTFIT_EXPOSURE_TIERS,
  OUTFIT_GEAR_SLOTS,
  colorFamilies,
  emphasize,
  gearColorNegatives,
  gearKey,
  gearPhrase,
  isOutfitGear,
  normalizeOutfitGear,
  rollOutfitExposure,
} from "./outfit-loadout.ts";

const slotFor = (key: string) => OUTFIT_GEAR_SLOTS.find((s) => s.key === key)!;

test("the RPG loadout exposes exactly the requested ten slots", () => {
  assert.deepEqual(
    OUTFIT_GEAR_SLOTS.map(({ key }) => key),
    ["head", "top", "bottoms", "shoes", "panties", "bra", "hand1", "hand2", "extra1", "extra2"],
  );
});

test("every exposure table is a complete percentage distribution", () => {
  for (const tier of OUTFIT_EXPOSURE_TIERS) {
    assert.equal(tier.clothes.reduce((sum, [, weight]) => sum + weight, 0), 100);
    assert.equal(tier.bra.reduce((sum, [, weight]) => sum + weight, 0), 100);
    assert.equal(tier.panties.reduce((sum, [, weight]) => sum + weight, 0), 100);
  }
});

test("calm is stable while peak can roll fully dressed or fully undressed", () => {
  assert.deepEqual(rollOutfitExposure(0, () => 0.999), {
    clothes: "on", bra: "hidden", panties: "hidden",
  });
  assert.deepEqual(rollOutfitExposure(4, () => 0), {
    clothes: "on", bra: "hidden", panties: "hidden",
  });
  assert.deepEqual(rollOutfitExposure(4, () => 0.999), {
    clothes: "off", bra: "off", panties: "off",
  });
});

test("underwear cannot be described as hidden after outer clothes roll off", () => {
  const rolls = [0.99, 0, 0];
  const result = rollOutfitExposure(4, () => rolls.shift() ?? 0);
  assert.deepEqual(result, { clothes: "off", bra: "showing", panties: "showing" });
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
