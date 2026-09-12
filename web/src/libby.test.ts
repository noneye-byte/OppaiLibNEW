import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { LIBBY_EMOTIONS, defaultLibbyActivityArt, defaultLibbyArt, libbyAssetCandidates } from "./libby.ts";

// The bundled art is addressed by a naming convention rather than a lookup table, so
// a single typo in that convention breaks every portrait in the app at once and does
// it silently — a missing PNG is a blank frame, not an error. Checking the paths
// against the files that actually ship is the only thing that catches it.
test("the bundled wardrobe covers every emotion at every tier", () => {
  for (let intensity = 1; intensity <= 5; intensity++) {
    for (const emotion of LIBBY_EMOTIONS) {
      const src = defaultLibbyArt(emotion, intensity);
      assert.ok(
        existsSync(`public${src}`),
        `no bundled art at ${src} for ${emotion} at intensity ${intensity}`,
      );
    }
  }
});

test("an unknown mood or an out-of-range tier still lands on a real file", () => {
  for (const src of [defaultLibbyArt("elated", 9), defaultLibbyArt("", 0), defaultLibbyArt("worried", 4)]) {
    assert.ok(existsSync(`public${src}`), `no bundled art at ${src}`);
  }
});

// The fallback chain ends on the bundled art, so its last entry has to be a file that
// is really in the build; a chain that runs out is a broken image with nothing behind it.
test("the fallback chain ends on bundled art that exists", () => {
  const chain = libbyAssetCandidates("shy", 4, "some-outfit");
  assert.ok(chain.length > 1, "an outfit should be tried before the default art");
  assert.ok(existsSync(`public${chain[chain.length - 1]}`), `chain ended on ${chain[chain.length - 1]}`);
});

// The MISC vocabulary lives on the server (libby_activities.go); this is the list as it
// stood when the bundled set was drawn. A state added there without a file here is not
// a failure — the chain falls to the emotion art — but a file that goes missing is.
const BUNDLED_ACTIVITIES = [
  "typing", "reading", "gaming", "lounging", "drinking", "eating", "stretching", "napping",
  "dancing", "tidying", "drawing", "waving",
  "undressing", "teasing", "touching", "rubbing", "fingering", "spread", "vibrator", "dildo",
  "riding", "grinding", "climax", "afterglow",
];

test("the bundled wardrobe draws every MISC state", () => {
  for (const activity of BUNDLED_ACTIVITIES) {
    const src = defaultLibbyActivityArt(activity);
    assert.ok(existsSync(`public${src}`), `no bundled art at ${src} for ${activity}`);
  }
});

test("a state is drawn from the bundled set before the emotion art, after the outfit's own", () => {
  const chain = libbyAssetCandidates("happy", 2, "some-outfit", "reading");
  assert.equal(chain[0], "/api/libby/outfits/some-outfit/emotions/reading");
  assert.equal(chain[1], defaultLibbyActivityArt("reading"));
  assert.ok(chain.indexOf(defaultLibbyArt("happy", 2)) > 1);
  // With no outfit the state art leads outright.
  assert.equal(libbyAssetCandidates("happy", 2, "", "reading")[0], defaultLibbyActivityArt("reading"));
});
