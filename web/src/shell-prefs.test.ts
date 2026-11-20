import { test } from "node:test";
import assert from "node:assert/strict";
import { compactCount, isLibrarySection, navIsRail, nextDensity, parseDensity, parseNavWidth, phoneTabFor } from "./shell-prefs.ts";

test("a stored density that is not one reads as medium", () => {
  assert.equal(parseDensity("xl"), "m");
  assert.equal(parseDensity(null), "m");
  assert.equal(parseDensity("s"), "s");
  assert.equal(parseDensity("l"), "l");
});

test("stepping the density grows the tiles and then wraps to small", () => {
  assert.equal(nextDensity("s"), "m");
  assert.equal(nextDensity("m"), "l");
  assert.equal(nextDensity("l"), "s");
});

test("a sidebar width that was never chosen reads as unchosen, not as either choice", () => {
  assert.equal(parseNavWidth(null), null);
  assert.equal(parseNavWidth("wide"), null);
  assert.equal(parseNavWidth("rail"), "rail");
});

test("an unchosen sidebar is open beside the library and a rail in the workspaces", () => {
  assert.equal(navIsRail(null, "home", false), false);
  assert.equal(navIsRail(null, "image", false), false);
  assert.equal(navIsRail(null, "settings", false), false);
  assert.equal(navIsRail(null, "chat", false), true);
  assert.equal(navIsRail(null, "imagegen", false), true);
  assert.equal(navIsRail(null, "studio", false), true);
});

test("an unchosen sidebar is a rail everywhere on a narrow screen", () => {
  assert.equal(navIsRail(null, "home", true), true);
});

test("a chosen sidebar width wins on every screen and at every size", () => {
  assert.equal(navIsRail("full", "imagegen", true), false);
  assert.equal(navIsRail("rail", "home", false), true);
});

test("the phone lights Library for every part of the library, browsing included", () => {
  for (const s of ["home", "image", "video", "gif", "comic", "game", "favorites", "collections", "browse"]) {
    assert.equal(phoneTabFor(s), "library", s);
    assert.ok(isLibrarySection(s), s);
  }
});

test("the phone lights Create for the image, video and sprite studios alike", () => {
  assert.equal(phoneTabFor("imagegen"), "create");
  assert.equal(phoneTabFor("studio"), "create");
  assert.equal(phoneTabFor("chat"), "chat");
  assert.equal(phoneTabFor("settings"), "more");
  assert.ok(!isLibrarySection("chat"));
  assert.ok(!isLibrarySection("settings"));
});

test("a sidebar count stays short however large the library grows", () => {
  assert.equal(compactCount(7), "7");
  assert.equal(compactCount(1204), "1,204");
  assert.equal(compactCount(12_400), "12.4k");
  assert.equal(compactCount(12_490), "12.4k");
  assert.equal(compactCount(250_000), "250k");
  assert.equal(compactCount(3_210_000), "3.2M");
});
