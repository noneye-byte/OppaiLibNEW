import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { LIBBY_EMOTIONS, defaultLibbyArt, libbyAssetCandidates } from "./libby.ts";

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
