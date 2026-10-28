import type { GenCharacter, GenLora, RegionsParams } from "./api.js";

/**
 * Several people in one picture, each in a part of it of their own.
 *
 * A prompt that names two characters draws two people who look alike, because every
 * word of it — and every LoRA, a character LoRA most of all — pulls on the whole
 * canvas. A1111's Regional Prompter draws each part from its own words and, with
 * LoRAs, applies each person's LoRA to their part alone (regions.go). The studio's
 * prompt becomes what the whole picture shares — the place, the light, "2girls" —
 * and each person here is a saved character, words of their own, and a LoRA.
 *
 * Side by side, the face pass also redoes each face with its person's words, left
 * to right, so the LoRA that drew a body draws its face too.
 */

export interface RegionPerson {
  /** A saved character's id, or "" for words alone. */
  character: string;
  words: string;
  lora: string;
  loraWeight: number;
  /** The part's width (or height) beside the others'. */
  share: number;
}

export const MAX_PEOPLE = 4;

export function newPerson(): RegionPerson {
  return { character: "", words: "", lora: "", loraWeight: 0.8, share: 1 };
}

type LoraInfo = Pick<GenLora, "name" | "triggerPhrases" | "categoryKey">;

/**
 * What a person is drawn from: their character's words, their own, then their LoRA's
 * trigger words. A recipe LoRA brings its trigger words into the prompt; a person's
 * LoRA did not, and a character LoRA without the words that call the character up
 * draws a stranger in that character's colours.
 */
export function personPrompt(p: RegionPerson, characters: GenCharacter[], loras: LoraInfo[] = []): string {
  const c = characters.find((ch) => ch.id === p.character);
  const words = [c?.prompt.trim() ?? "", p.words.trim()].filter(Boolean).join(", ");
  const said = words.toLowerCase();
  const triggers = p.lora
    ? (loras.find((l) => l.name === p.lora)?.triggerPhrases ?? []).map((t) => t.trim()).filter((t) => t && !said.includes(t.toLowerCase()))
    : [];
  return [words, ...triggers].filter(Boolean).join(", ");
}

/** The regions to send, or nothing when there are not two people to draw. */
export function regionParams(
  on: boolean, rows: boolean, people: RegionPerson[], characters: GenCharacter[], loras: LoraInfo[] = [],
): RegionsParams | undefined {
  if (!on) return undefined;
  const parts = people.slice(0, MAX_PEOPLE).map((p) => ({
    prompt: personPrompt(p, characters, loras),
    loras: p.lora ? [{ name: p.lora, weight: p.loraWeight }] : undefined,
    share: p.share > 0 && p.share !== 1 ? p.share : undefined,
  }));
  if (parts.length < 2) return undefined;
  return { enabled: true, rows: rows || undefined, parts };
}

/** What the people's characters ask to keep out, for the shared negative prompt —
    Regional Prompter splits the positive prompt only. */
export function regionNegatives(people: RegionPerson[], characters: GenCharacter[]): string[] {
  const out: string[] = [];
  for (const p of people) {
    const neg = characters.find((ch) => ch.id === p.character)?.negativePrompt?.trim();
    if (neg && !out.includes(neg)) out.push(neg);
  }
  return out;
}

/** The parts as fractions of the picture, for the little layout drawn above the
    list: where each starts and how much of the side it takes. */
export function regionBoxes(people: RegionPerson[]): { start: number; size: number }[] {
  const shares = people.map((p) => (p.share > 0 ? p.share : 1));
  const total = shares.reduce((a, b) => a + b, 0) || 1;
  let at = 0;
  return shares.map((s) => {
    const box = { start: at / total, size: s / total };
    at += s;
    return box;
  });
}

/** A picture's regions back into people. Which saved character drew a part isn't
    kept — its words were — so each comes back as words, with its first LoRA. */
export function peopleFrom(regions: RegionsParams | undefined): RegionPerson[] {
  return (regions?.parts ?? []).map((part) => ({
    character: "",
    words: part.prompt,
    lora: part.loras?.[0]?.name ?? "",
    loraWeight: part.loras?.[0]?.weight ?? 0.8,
    share: part.share ?? 1,
  }));
}

/**
 * The recipe's LoRAs for a run with people in it: the ones no person wears. The
 * recipe's LoRAs go in the part of the prompt every person shares, so a LoRA that is
 * both on a person and in the recipe was put on everyone, and the people came out as
 * one blend of it.
 */
export function sharedLoras(selected: Record<string, number>, people: RegionPerson[]): Record<string, number> {
  const worn = new Set(people.map((p) => p.lora).filter(Boolean));
  return Object.fromEntries(Object.entries(selected).filter(([name]) => !worn.has(name)));
}

/** The recipe's trigger words for a run with people: without those of the LoRAs that
    moved onto a person, unless a LoRA still shared says them too. */
export function sharedTriggers(triggers: string[], selected: Record<string, number>, people: RegionPerson[], loras: LoraInfo[]): string[] {
  const shared = new Set(Object.keys(sharedLoras(selected, people)));
  const worn = new Set(people.map((p) => p.lora).filter(Boolean));
  const keep = new Set(loras.filter((l) => shared.has(l.name)).flatMap((l) => l.triggerPhrases ?? []));
  const drop = new Set(loras.filter((l) => worn.has(l.name)).flatMap((l) => l.triggerPhrases ?? []));
  return triggers.filter((t) => keep.has(t) || !drop.has(t));
}

export interface PeopleAdvice {
  /** Each person's part is a thin strip of the picture, which draws squashed bodies. */
  narrow: boolean;
  /** Recipe LoRAs filed as characters: they apply to every person. */
  everyone: string[];
}

/**
 * What would make a picture of several people come out wrong, said beside them
 * before it is drawn. Side by side, each person gets the picture's width shared out:
 * two in an 832×1216 portrait are 416 pixels wide each, too thin for a figure. A
 * character LoRA left in the recipe is put on all of them.
 */
export function peopleAdvice(
  rows: boolean, people: RegionPerson[], width: number, height: number,
  selected: Record<string, number>, loras: LoraInfo[],
): PeopleAdvice {
  const n = Math.max(1, people.length);
  const part = rows ? (height / n) / Math.max(1, width) : (width / n) / Math.max(1, height);
  const shared = new Set(Object.keys(sharedLoras(selected, people)));
  const everyone = loras.filter((l) => shared.has(l.name) && l.categoryKey === "character").map((l) => l.name);
  return { narrow: n > 1 && part < 0.45, everyone };
}
