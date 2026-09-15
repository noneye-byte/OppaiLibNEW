import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// The icon font is subset to the glyphs the source asks for, which is 240 of the 4,284
// Material Symbols — 57 kB instead of 3.5 MB. The cost of that is a failure mode with
// no error message: add an icon to a menu and forget to re-run the subset, and the
// button renders the *word* "bookmarks" in the icon font, which comes out as garbled
// capitals. It happened once already, in the Collections nav item.
//
// So the invariant is checked here instead of remembered: every glyph name the source
// names outright must be in web/public/fonts/icon-names.txt. Refresh it with the
// commands in web/public/fonts/README.md.

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = here;
const namesFile = join(here, "..", "public", "fonts", "icon-names.txt");

function tsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...tsFiles(p));
    else if (entry.endsWith(".ts") && !entry.endsWith(".test.ts")) out.push(p);
  }
  return out;
}

/**
 * Glyph names in positions that can only be glyph names.
 *
 * Deliberately narrower than the extraction script, which takes every snake_case token
 * and intersects it with the official list: that needs the 4,284-name codepoints file,
 * which is not vendored and should not be downloaded by a unit test. These two shapes
 * — the literal text of an icon span, and an `icon:` field — are where icons are
 * actually written, and they cannot be anything else.
 */
function iconNamesIn(source: string): string[] {
  const names: string[] = [];
  const spanText = /material-symbols-rounded[^>]*>\s*([a-z][a-z0-9_]{1,40})\s*</g;
  const iconField = /\bicon:\s*"([a-z][a-z0-9_]{1,40})"/g;
  for (const re of [spanText, iconField]) {
    for (const m of source.matchAll(re)) names.push(m[1]);
  }
  return names;
}

test("every icon the source names is in the subset the font was built from", () => {
  const subset = new Set(
    readFileSync(namesFile, "utf8")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean),
  );
  assert.ok(subset.size > 100, `icon-names.txt looks empty or truncated (${subset.size} names)`);

  const missing = new Map<string, string[]>();
  for (const file of tsFiles(srcDir)) {
    for (const name of iconNamesIn(readFileSync(file, "utf8"))) {
      if (subset.has(name)) continue;
      const where = missing.get(name) ?? [];
      const short = file.slice(srcDir.length + 1).replaceAll("\\", "/");
      if (!where.includes(short)) where.push(short);
      missing.set(name, where);
    }
  }

  assert.deepEqual(
    [...missing.entries()].map(([name, files]) => `${name} (${files.join(", ")})`),
    [],
    "these icons would render as their own names — re-run the subset in web/public/fonts/README.md",
  );
});
