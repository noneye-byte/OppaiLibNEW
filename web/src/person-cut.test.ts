import { test } from "node:test";
import assert from "node:assert/strict";

const { personRect, outlineOnPage, keptPeople, outlineGrow } = await import("./person-cut.ts");

const panel = { x: 100, y: 200, w: 400, h: 300 };

test("a person's box is widened a little and moved onto the page", () => {
  assert.deepEqual(personRect([100, 50, 200, 250], panel, 0.1), { x: 190, y: 230, w: 120, h: 240 });
});

test("a person at the panel's edge is kept inside the panel, not the page", () => {
  const r = personRect([0, 0, 390, 300], panel, 0.1);
  assert.equal(r.x, 100);
  assert.equal(r.y, 200);
  assert.equal(r.x + r.w, 500);
  assert.equal(r.y + r.h, 500);
});

test("the outline goes where the panel is on the page", () => {
  assert.deepEqual(outlineOnPage([[0, 0], [10, 20]], panel), [[100, 200], [110, 220]]);
});

test("only people sure enough and big enough to train on are kept", () => {
  const people = [
    { box: [0, 0, 100, 200] as [number, number, number, number], score: 0.8, outline: [] },
    { box: [0, 0, 100, 200] as [number, number, number, number], score: 0.2, outline: [] },
    { box: [0, 0, 30, 200] as [number, number, number, number], score: 0.9, outline: [] },
  ];
  assert.equal(keptPeople(people, 0.3).length, 1);
  assert.equal(keptPeople(people, 0.15).length, 2);
});

test("the outline grows with the cut, by two pixels at least", () => {
  assert.equal(outlineGrow({ x: 0, y: 0, w: 100, h: 80 }), 2);
  assert.equal(outlineGrow({ x: 0, y: 0, w: 1000, h: 2000 }), 12);
});
