import type { GenCharacter, RegionsParams } from "./api.js";

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

/** What a person is drawn from: their character's words, then their own. */
export function personPrompt(p: RegionPerson, characters: GenCharacter[]): string {
  const c = characters.find((ch) => ch.id === p.character);
  return [c?.prompt.trim() ?? "", p.words.trim()].filter(Boolean).join(", ");
}

/** The regions to send, or nothing when there are not two people to draw. */
export function regionParams(
  on: boolean, rows: boolean, people: RegionPerson[], characters: GenCharacter[],
): RegionsParams | undefined {
  if (!on) return undefined;
  const parts = people.slice(0, MAX_PEOPLE).map((p) => ({
    prompt: personPrompt(p, characters),
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
