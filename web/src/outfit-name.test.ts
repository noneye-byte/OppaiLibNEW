import assert from "node:assert/strict";
import test from "node:test";
import { outfitArchiveFilename, outfitImageFilename } from "./outfit-name.ts";

test("outfit filenames identify the wardrobe mood and emotion", () => {
  assert.equal(
    outfitImageFilename("Black lace lingerie, thigh highs", "Warm", "Mischievous"),
    "black-lace-lingerie-thigh-highs-warm-mischievous.png",
  );
});

test("outfit filenames remain usable when the description is blank or punctuated", () => {
  assert.equal(outfitImageFilename("  !!!  ", "Peak", "Happy"), "outfit-peak-happy.png");
});

test("one stable archive name represents the complete wardrobe", () => {
  assert.equal(outfitArchiveFilename("Café date dress"), "cafe-date-dress-wardrobe.zip");
});
