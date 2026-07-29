import { test } from "node:test";
import assert from "node:assert/strict";
import { embedGenerationMetadata } from "./png-metadata.ts";

const signature = [137, 80, 78, 71, 13, 10, 26, 10];
const iend = [0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130];

function chunks(bytes: Uint8Array): { type: string; data: Uint8Array }[] {
  const out: { type: string; data: Uint8Array }[] = [];
  for (let at = 8; at + 12 <= bytes.length;) {
    const len = (((bytes[at] << 24) | (bytes[at + 1] << 16) | (bytes[at + 2] << 8) | bytes[at + 3]) >>> 0);
    const type = String.fromCharCode(...bytes.subarray(at + 4, at + 8));
    out.push({ type, data: bytes.subarray(at + 8, at + 8 + len) });
    at += 12 + len;
  }
  return out;
}

test("Civitai-compatible parameters are inserted before IEND", () => {
  const source = Uint8Array.from([...signature, ...iend]);
  const result = embedGenerationMetadata(source, "portrait\nSteps: 20, Seed: 7", '{"seed":7}');
  const found = chunks(result);
  assert.deepEqual(found.map((c) => c.type), ["tEXt", "tEXt", "IEND"]);
  assert.equal(new TextDecoder().decode(found[0].data).split("\0")[0], "parameters");
  assert.match(new TextDecoder().decode(found[0].data), /Seed: 7/);
  assert.equal(new TextDecoder().decode(found[1].data).split("\0")[0], "oppailib");
});

test("unicode prompts use a standards-compliant iTXt chunk", () => {
  const source = Uint8Array.from([...signature, ...iend]);
  const found = chunks(embedGenerationMetadata(source, "初音ミク, portrait"));
  assert.equal(found[0].type, "iTXt");
  assert.equal(new TextDecoder().decode(found[0].data.subarray("parameters".length + 5)), "初音ミク, portrait");
});

test("re-export replaces old metadata instead of creating ambiguous duplicates", () => {
  const source = Uint8Array.from([...signature, ...iend]);
  const once = embedGenerationMetadata(source, "old", '{"seed":1}');
  const twice = embedGenerationMetadata(once, "new", '{"seed":2}');
  const found = chunks(twice);
  assert.deepEqual(found.map((c) => c.type), ["tEXt", "tEXt", "IEND"]);
  assert.match(new TextDecoder().decode(found[0].data), /new/);
  assert.doesNotMatch(new TextDecoder().decode(found[0].data), /old/);
});

test("non-PNG data is rejected instead of downloading a mislabeled file", () => {
  assert.throws(() => embedGenerationMetadata(new Uint8Array([1, 2, 3]), "data"), /not a PNG/);
});
