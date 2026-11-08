import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_YOU, YOU_STYLES, hexFromCss, readYouPref, storedYou, youCss, youIsStale, youTokens } from "./material-you.ts";

/** Relative luminance, for "is this dark" without trusting the names. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

test("OppaiLib's own palette is the default and needs no stylesheet", () => {
  assert.deepEqual(readYouPref(null), DEFAULT_YOU);
  assert.equal(youCss(DEFAULT_YOU), "");
});

test("a stored preference that is not a colour or a style falls back rather than breaking the page", () => {
  assert.deepEqual(readYouPref('{"seed":"red","style":"sparkly"}'), DEFAULT_YOU);
  assert.deepEqual(readYouPref("not json"), DEFAULT_YOU);
  assert.deepEqual(readYouPref('{"seed":"#1E88E5","style":"vibrant"}'), { seed: "#1e88e5", style: "vibrant" });
});

test("every style gives a dark page with readable text, and a light one", () => {
  for (const { id } of YOU_STYLES) {
    const dark = youTokens("#1e88e5", id, true);
    const light = youTokens("#1e88e5", id, false);
    assert.ok(luminance(dark["--oppai-bg"]) < 0.05, `${id} dark page is ${dark["--oppai-bg"]}`);
    assert.ok(luminance(light["--oppai-bg"]) > 0.8, `${id} light page is ${light["--oppai-bg"]}`);
    assert.ok(contrast(dark["--oppai-text"], dark["--oppai-bg"]) >= 7, `${id} dark text`);
    assert.ok(contrast(light["--oppai-text"], light["--oppai-bg"]) >= 7, `${id} light text`);
    assert.ok(contrast(dark["--md-sys-color-on-primary"], dark["--md-sys-color-primary"]) >= 4.5, `${id} on-primary`);
  }
});

test("both halves of the tokens are set, so Material Web and the shell agree", () => {
  const t = youTokens("#e53935", "tonal", true);
  assert.equal(t["--oppai-primary"], t["--md-sys-color-primary"]);
  assert.equal(t["--oppai-bg"], t["--md-sys-color-surface"]);
  assert.ok(t["--md-sys-color-surface-container-highest"], "the field fill Material Web falls back on");
  const css = youCss({ seed: "#e53935", style: "tonal" });
  assert.match(css, /^:root \{/);
  assert.match(css, /:root\[data-theme="light"\] \{/);
});

test("a red seed gives a red primary, not the default orange", () => {
  const t = youTokens("#e53935", "tonal", false);
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(t["--oppai-primary"].slice(i, i + 2), 16));
  assert.ok(r > g && r > b, `primary ${t["--oppai-primary"]}`);
});

test("a computed colour reads back as a seed, and a transparent one as none", () => {
  assert.equal(hexFromCss("rgb(30, 136, 229)"), "#1e88e5");
  assert.equal(hexFromCss("rgba(0, 0, 0, 0)"), null);
  assert.equal(hexFromCss("AccentColor"), null);
});

test("the stored choice carries its stylesheet, and an older one is known to be stale", () => {
  const raw = storedYou({ seed: "#1e88e5", style: "vibrant" });
  assert.match(JSON.parse(raw).css, /^:root \{/);
  assert.equal(youIsStale(raw), false);
  assert.equal(youIsStale(JSON.stringify({ seed: "#1e88e5", style: "vibrant", css: ":root {}" })), true);
  assert.equal(youIsStale(JSON.stringify({ seed: null, style: "tonal" })), false);
  assert.equal(youIsStale(null), false);
});
