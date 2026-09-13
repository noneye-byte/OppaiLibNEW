/**
 * Reading and writing character cards.
 *
 * A card is the portable format the rest of the world trades characters in, and
 * "the rest of the world" means three overlapping specs and two container formats.
 * This used to be forty lines inlined in the chat view that understood exactly one
 * of them — V2 JSON in a PNG `tEXt` chunk — and silently produced a blank character
 * called after the filename for everything else. A card that imports as an empty
 * shell is worse than one that refuses to import, because the failure is only
 * visible later, as a character with no personality.
 *
 * So: every shape is read, the fields that have nowhere to go are reported rather
 * than dropped, and anything that cannot be read at all throws with a reason a
 * person can act on.
 *
 * What is understood:
 *
 *   V1  — a flat JSON object. No `spec`, fields at the top level.
 *   V2  — `{ spec: "chara_card_v2", data: {…} }`. Adds system_prompt,
 *         post_history_instructions, alternate_greetings, tags, creator, and a
 *         character_book (a lorebook, which this app has nowhere to put).
 *   V3  — `{ spec: "chara_card_v3", data: {…} }`. A superset of V2 for our
 *         purposes; the extras it adds (assets, groups, decorators) are not fields
 *         this app has a home for either.
 *
 * And the containers:
 *
 *   .json — the object itself.
 *   .png  — the object, base64'd, inside a text chunk. `tEXt` is the common case,
 *           but `iTXt` (uncompressed and deflate-compressed) and `zTXt` are all
 *           legal PNG and all produced in the wild. Keyword `ccv3` wins over
 *           `chara` when both are present, because a writer that emits both is
 *           writing V3 and down-levelling for old readers.
 */

import type { ChatCharacter } from "./api";

/** What a card carried that this app has no field for. Shown, not silently dropped. */
export interface CardLeftovers {
  /** Greetings past the first. Kept on the character; see ChatCharacter.altGreetings. */
  alternateGreetings: number;
  /** A lorebook. Genuinely unsupported — there is nowhere to put it. */
  characterBook: boolean;
  /** Free-text tags from the card's author. */
  tags: string[];
  creator: string;
  characterVersion: string;
}

export interface ParsedCard {
  character: Omit<ChatCharacter, "id">;
  spec: "v1" | "v2" | "v3";
  leftovers: CardLeftovers;
}

/** Reads a string field, trying each name in order. Cards disagree on casing. */
function pick(data: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim() !== "") return value;
  }
  return "";
}

function pickStrings(data: Record<string, unknown>, ...keys: string[]): string[] {
  for (const key of keys) {
    const value = data[key];
    if (Array.isArray(value)) {
      const strings = value.filter((entry): entry is string => typeof entry === "string" && entry.trim() !== "");
      if (strings.length) return strings;
    }
  }
  return [];
}

/**
 * Turns a parsed card object into a character.
 *
 * `fallbackName` is used only when the card has no name of its own — a real case,
 * since a PNG whose chunk holds `{"description": …}` and nothing else is still a
 * card somebody wants imported, and the filename is the best name available.
 */
export function parseCharacterCard(parsed: unknown, fallbackName: string): ParsedCard {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("that file isn't a character card (expected a JSON object)");
  }
  const root = parsed as Record<string, unknown>;
  const specName = typeof root.spec === "string" ? root.spec.toLowerCase() : "";
  const nested = root.data && typeof root.data === "object" && !Array.isArray(root.data)
    ? (root.data as Record<string, unknown>)
    : null;
  // V2/V3 put everything under `data`. A card that declares a spec but has no data
  // object is malformed; fall back to the root rather than refusing, since the
  // fields are usually still there.
  const data = nested ?? root;
  const spec: ParsedCard["spec"] = specName.includes("v3") ? "v3" : specName.includes("v2") ? "v2" : nested ? "v2" : "v1";

  const name = pick(data, "name", "char_name", "charName") || fallbackName;
  // V2 renamed nothing but added system_prompt; V1 exporters used a dozen spellings
  // for the same four fields, so each one lists the ones actually seen.
  const description = pick(data, "description", "char_persona", "persona");
  const personality = pick(data, "personality", "personalitySummary");
  const scenario = pick(data, "scenario", "world_scenario");
  const firstMessage = pick(data, "first_mes", "firstMessage", "char_greeting", "greeting");
  const exampleDialogue = pick(data, "mes_example", "exampleDialogue", "example_dialogue");
  const creatorNotes = pick(data, "creator_notes", "creatorNotes", "creatorcomment", "creator_comment");

  // system_prompt and post_history_instructions are two different instructions in
  // the spec and one field here. Joined rather than one dropped: a card that puts
  // its jailbreak in post_history and nothing in system_prompt is common, and
  // taking only the first would import the half that is usually empty.
  const systemPrompt = [
    pick(data, "system_prompt", "systemPrompt"),
    pick(data, "post_history_instructions", "postHistoryInstructions"),
  ].filter(Boolean).join("\n\n");

  const alternateGreetings = pickStrings(data, "alternate_greetings", "alternateGreetings");
  const tags = pickStrings(data, "tags");

  // A card this app wrote carries its own two fields in a namespaced extension, so
  // an export/import round-trip does not quietly lose the appearance a character was
  // recognised by. Anything else's extensions are left alone.
  const extensions = data.extensions && typeof data.extensions === "object"
    ? (data.extensions as Record<string, unknown>)
    : {};
  const ours = extensions.oppailib && typeof extensions.oppailib === "object"
    ? (extensions.oppailib as Record<string, unknown>)
    : {};

  const character: Omit<ChatCharacter, "id"> = {
    name,
    description,
    personality,
    scenario,
    firstMessage,
    exampleDialogue,
    systemPrompt,
    creatorNotes,
    appearance: pick(ours, "appearance"),
    kinks: pick(ours, "kinks"),
    promptWeight: typeof ours.promptWeight === "number" && Number.isFinite(ours.promptWeight) ? ours.promptWeight : 1,
    defaultMode: pick(ours, "defaultMode") || "roleplay",
  };
  if (alternateGreetings.length) character.altGreetings = alternateGreetings;

  return {
    character,
    spec,
    leftovers: {
      alternateGreetings: alternateGreetings.length,
      characterBook: !!data.character_book || !!data.characterBook,
      tags,
      creator: pick(data, "creator"),
      characterVersion: pick(data, "character_version", "characterVersion"),
    },
  };
}

/** Decodes the base64 payload of a card chunk into the JSON text it holds. */
function decodeBase64UTF8(base64: string): string {
  // atob yields one byte per char; the payload is UTF-8, so it has to be decoded
  // as bytes. Doing this with escape()/decodeURIComponent — the old trick — mangles
  // any character outside Latin-1, which is most card art's worth of names.
  const binary = atob(base64.replace(/\s+/g, ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}

async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  // PNG's compressed text chunks are zlib-wrapped deflate.
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

interface PNGTextChunk {
  keyword: string;
  text: string;
}

/**
 * Walks a PNG's chunks and returns every text chunk, decompressing the compressed
 * kinds. Stops at IEND, and stops rather than throws on a truncated chunk — a
 * half-downloaded card should report "no card found", not a decode error.
 */
async function pngTextChunks(bytes: Uint8Array): Promise<PNGTextChunk[]> {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 8 || signature.some((byte, i) => bytes[i] !== byte)) return [];
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ascii = new TextDecoder("latin1");
  const utf8 = new TextDecoder("utf-8");
  const out: PNGTextChunk[] = [];
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset);
    const type = ascii.decode(bytes.subarray(offset + 4, offset + 8));
    if (type === "IEND") break;
    const start = offset + 8;
    const end = start + length;
    if (end + 4 > bytes.length) break;
    const body = bytes.subarray(start, end);
    if (type === "tEXt" || type === "zTXt" || type === "iTXt") {
      const split = body.indexOf(0);
      if (split > 0) {
        const keyword = ascii.decode(body.subarray(0, split));
        try {
          if (type === "tEXt") {
            out.push({ keyword, text: ascii.decode(body.subarray(split + 1)) });
          } else if (type === "zTXt") {
            // keyword \0 method(1) compressed-data
            out.push({ keyword, text: ascii.decode(await inflate(body.subarray(split + 2))) });
          } else {
            // iTXt: keyword \0 flag(1) method(1) lang \0 translated \0 text
            let cursor = split + 1;
            const compressed = body[cursor] === 1;
            cursor += 2;
            const langEnd = body.indexOf(0, cursor);
            if (langEnd < 0) throw new Error("bad iTXt");
            const translatedEnd = body.indexOf(0, langEnd + 1);
            if (translatedEnd < 0) throw new Error("bad iTXt");
            const payload = body.subarray(translatedEnd + 1);
            out.push({ keyword, text: compressed ? utf8.decode(await inflate(payload)) : utf8.decode(payload) });
          }
        } catch {
          // One unreadable chunk is not a reason to abandon the others.
        }
      }
    }
    offset = end + 4;
  }
  return out;
}

/**
 * Pulls a card out of a PNG, or returns null when there isn't one.
 *
 * `ccv3` beats `chara` when both are present: a writer emitting both is writing V3
 * and keeping a V2 copy for readers that only know the old keyword, so the V3 one
 * is the more complete record.
 */
export async function readCardFromPNG(bytes: Uint8Array, fallbackName: string): Promise<ParsedCard | null> {
  const chunks = await pngTextChunks(bytes);
  const byKeyword = (want: string) => chunks.find((chunk) => chunk.keyword.toLowerCase() === want);
  const chunk = byKeyword("ccv3") ?? byKeyword("chara");
  if (!chunk) return null;
  let json: string;
  try {
    json = decodeBase64UTF8(chunk.text);
  } catch {
    throw new Error("the card data inside that PNG is not valid base64");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("the card data inside that PNG is not valid JSON");
  }
  return parseCharacterCard(parsed, fallbackName);
}

/**
 * Reads a card from any supported file. Throws with a readable reason when the file
 * is not one — the caller shows the message verbatim.
 */
export async function readCardFile(file: File): Promise<ParsedCard | null> {
  const stem = file.name.replace(/\.[^.]+$/, "") || "New friend";
  const isPNG = file.name.toLowerCase().endsWith(".png") || file.type === "image/png";
  if (isPNG) return readCardFromPNG(new Uint8Array(await file.arrayBuffer()), stem);
  if (file.type.startsWith("image/")) return null; // A plain portrait, not a card.
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error("that file is neither a PNG card nor valid JSON");
  }
  return parseCharacterCard(parsed, stem);
}

/**
 * Writes a character back out as a V2 card, for exporting a friend.
 *
 * V2 rather than V3 deliberately: everything reads V2, nothing this app stores needs
 * V3, and a card that every other tool can open is the point of exporting one.
 */
export function characterToCard(character: ChatCharacter): Record<string, unknown> {
  const data = {
    name: character.name,
    description: character.description ?? "",
    personality: character.personality ?? "",
    scenario: character.scenario ?? "",
    first_mes: character.firstMessage ?? "",
    mes_example: character.exampleDialogue ?? "",
    system_prompt: character.systemPrompt ?? "",
    post_history_instructions: "",
    creator_notes: character.creatorNotes ?? "",
    alternate_greetings: character.altGreetings ?? [],
    tags: [],
    creator: "",
    character_version: "",
    extensions: {
      // The two fields that are this app's own. Namespaced so another reader ignores
      // them and a round-trip back into OppaiLib keeps them.
      oppailib: {
        appearance: character.appearance ?? "",
        kinks: character.kinks ?? "",
        defaultMode: character.defaultMode,
        promptWeight: character.promptWeight,
      },
    },
  };
  return { spec: "chara_card_v2", spec_version: "2.0", data, ...data };
}
