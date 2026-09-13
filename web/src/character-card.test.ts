import { test } from "node:test";
import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";

import { parseCharacterCard, readCardFromPNG, characterToCard } from "./character-card.ts";
import type { ChatCharacter } from "./api.ts";

test("a flat V1 card reads its fields from the top level", () => {
  const parsed = parseCharacterCard(
    { name: "Ayla", description: "A ranger.", char_greeting: "You again.", world_scenario: "A forest." },
    "fallback",
  );
  assert.equal(parsed.spec, "v1");
  assert.equal(parsed.character.name, "Ayla");
  assert.equal(parsed.character.description, "A ranger.");
  // V1 exporters used char_greeting/world_scenario for what V2 calls first_mes/scenario.
  assert.equal(parsed.character.firstMessage, "You again.");
  assert.equal(parsed.character.scenario, "A forest.");
});

test("a V2 card reads from data and keeps both instruction fields", () => {
  const parsed = parseCharacterCard(
    {
      spec: "chara_card_v2",
      data: {
        name: "Bex",
        first_mes: "Hi.",
        system_prompt: "Be terse.",
        post_history_instructions: "Stay in character.",
        alternate_greetings: ["Oh, it's you.", "Back already?"],
        tags: ["oc", "fantasy"],
        creator: "someone",
      },
    },
    "fallback",
  );
  assert.equal(parsed.spec, "v2");
  assert.equal(parsed.character.name, "Bex");
  // Joined, not one-or-the-other: cards routinely fill only the second.
  assert.equal(parsed.character.systemPrompt, "Be terse.\n\nStay in character.");
  assert.deepEqual(parsed.character.altGreetings, ["Oh, it's you.", "Back already?"]);
  assert.equal(parsed.leftovers.alternateGreetings, 2);
  assert.deepEqual(parsed.leftovers.tags, ["oc", "fantasy"]);
  assert.equal(parsed.leftovers.creator, "someone");
});

test("a V3 card is recognised as V3", () => {
  const parsed = parseCharacterCard({ spec: "chara_card_v3", data: { name: "Cy" } }, "fallback");
  assert.equal(parsed.spec, "v3");
  assert.equal(parsed.character.name, "Cy");
});

test("a nameless card falls back to the filename, and a lorebook is reported", () => {
  const parsed = parseCharacterCard(
    { spec: "chara_card_v2", data: { description: "no name here", character_book: { entries: [] } } },
    "from-file",
  );
  assert.equal(parsed.character.name, "from-file");
  assert.equal(parsed.leftovers.characterBook, true);
});

test("a non-object is refused with a readable reason", () => {
  assert.throws(() => parseCharacterCard("nope", "x"), /isn't a character card/);
  assert.throws(() => parseCharacterCard([1, 2], "x"), /isn't a character card/);
});

test("this app's own fields survive an export/import round-trip", () => {
  const character: ChatCharacter = {
    id: "c1", name: "Dee", appearance: "long red hair, green eyes", kinks: "teasing",
    description: "d", promptWeight: 1.5, defaultMode: "roleplay", altGreetings: ["again?"],
  };
  const round = parseCharacterCard(characterToCard(character), "fallback");
  assert.equal(round.character.appearance, "long red hair, green eyes");
  assert.equal(round.character.kinks, "teasing");
  assert.equal(round.character.promptWeight, 1.5);
  assert.equal(round.character.defaultMode, "roleplay");
  assert.deepEqual(round.character.altGreetings, ["again?"]);
});

// --- PNG containers ---------------------------------------------------------

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** Builds a minimal PNG carrying one text chunk, for the reader to find. */
function pngWith(type: "tEXt" | "zTXt" | "iTXt", keyword: string, payload: string): Uint8Array {
  const parts: number[] = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const push = (chunkType: string, body: Uint8Array) => {
    const typeBytes = new TextEncoder().encode(chunkType);
    const full = new Uint8Array(typeBytes.length + body.length);
    full.set(typeBytes); full.set(body, typeBytes.length);
    const length = body.length;
    parts.push((length >>> 24) & 255, (length >>> 16) & 255, (length >>> 8) & 255, length & 255);
    for (const byte of full) parts.push(byte);
    const crc = crc32(full);
    parts.push((crc >>> 24) & 255, (crc >>> 16) & 255, (crc >>> 8) & 255, crc & 255);
  };
  const key = new TextEncoder().encode(keyword);
  const text = new TextEncoder().encode(payload);
  let body: Uint8Array;
  if (type === "tEXt") {
    body = new Uint8Array([...key, 0, ...text]);
  } else if (type === "zTXt") {
    body = new Uint8Array([...key, 0, 0, ...deflateSync(Buffer.from(payload))]);
  } else {
    // keyword \0 compressed(0) method(0) lang \0 translated \0 text
    body = new Uint8Array([...key, 0, 0, 0, 0, 0, ...text]);
  }
  push(type, body);
  push("IEND", new Uint8Array());
  return new Uint8Array(parts);
}

const cardJSON = JSON.stringify({ spec: "chara_card_v2", data: { name: "Píxel", first_mes: "hola" } });
const cardB64 = Buffer.from(cardJSON, "utf8").toString("base64");

test("reads a V2 card out of a tEXt chunk", async () => {
  const parsed = await readCardFromPNG(pngWith("tEXt", "chara", cardB64), "fallback");
  assert.ok(parsed);
  // Non-ASCII survives: the payload is UTF-8 bytes, not Latin-1 characters.
  assert.equal(parsed.character.name, "Píxel");
  assert.equal(parsed.character.firstMessage, "hola");
});

test("reads a card out of a zTXt chunk", async () => {
  const parsed = await readCardFromPNG(pngWith("zTXt", "chara", cardB64), "fallback");
  assert.ok(parsed);
  assert.equal(parsed.character.name, "Píxel");
});

test("reads a card out of an uncompressed iTXt chunk", async () => {
  const parsed = await readCardFromPNG(pngWith("iTXt", "chara", cardB64), "fallback");
  assert.ok(parsed);
  assert.equal(parsed.character.name, "Píxel");
});

test("a PNG with no card chunk returns null rather than throwing", async () => {
  assert.equal(await readCardFromPNG(pngWith("tEXt", "parameters", "steps: 20"), "fallback"), null);
});

test("a PNG whose card chunk is not JSON reports which half was wrong", async () => {
  const notJSON = Buffer.from("hello", "utf8").toString("base64");
  await assert.rejects(() => readCardFromPNG(pngWith("tEXt", "chara", notJSON), "x"), /not valid JSON/);
});

test("something that is not a PNG at all returns null", async () => {
  assert.equal(await readCardFromPNG(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]), "x"), null);
});
