// Picking the files for a Wan clip, as the Video settings do it.
//
// Wan 2.2's 14B models come as a pair of experts, high noise and low noise, and so do
// the LoRAs made for them — a file per expert, told apart only by "high" or "low"
// somewhere in the name. Which is which is the part people get wrong in ComfyUI, so
// these read it off the names: what a LoRA is for, its other half, and a first guess
// at the whole set from what ComfyUI has installed.

import type { ClipLora, ClipModels, ComfyModels } from "./api.js";

// "high noise" and "HighNoise" need no boundary before them; a bare "high" or "low"
// stands alone, so "slow" and "highres" are words rather than halves.
const STAGE = /(high|low)[\s_-]?noise|(?<![a-z])(high|low)(?![a-z])/gi;

/** The last word in a name that says a half, where it is: a pair installed from
    Civitai ends in its half, and the model's own name before it may say "high" or
    "low" for another reason. */
function lastStage(name: string): { stage: "high" | "low"; at: number; text: string } | null {
  let last: { stage: "high" | "low"; at: number; text: string } | null = null;
  for (const m of name.matchAll(STAGE)) {
    const word = (m[1] ?? m[2]) as string;
    const at = m.index! + m[0].toLowerCase().indexOf(word.toLowerCase());
    last = { stage: word.toLowerCase() as "high" | "low", at, text: word };
  }
  return last;
}

/** Which expert a file is for, by its name: "high", "low", or "" for both. */
export function loraStage(name: string): ClipLora["stage"] {
  return lastStage(name)?.stage ?? "";
}

/** The other half of a high/low pair among the files offered, or "" when it has none.
    The half swapped is the last one named, in the case it was written in. */
export function loraTwin(name: string, offered: readonly string[]): string {
  const found = lastStage(name);
  if (!found) return "";
  const to = found.stage === "high" ? "low" : "high";
  const m = found.text;
  const swapped = m === m.toUpperCase() ? to.toUpperCase() : m[0] === m[0].toUpperCase() ? to[0].toUpperCase() + to.slice(1) : to;
  const twin = name.slice(0, found.at) + swapped + name.slice(found.at + m.length);
  return offered.includes(twin) ? twin : "";
}

/** A LoRA that distils Wan down to a handful of steps. It is only right at its own few
    steps and CFG 1; at Wan's usual 20 and 3.5 it burns the clip. */
export function isSpeedLora(name: string): boolean {
  return /lightx2v|lightning|causvid|distill|(?<![0-9])4[\s_-]?steps?/i.test(name);
}

/** The steps and CFG a speed LoRA wants. */
export const SPEED_SETTINGS = { steps: 4, cfg: 1 } as const;

/** A first guess at the files for one direction from what ComfyUI has, or null when
    nothing there looks like Wan. A pair is preferred to a single model, and an
    all-in-one checkpoint is the fallback, since it brings its own encoder and VAE. */
export function suggestClipModels(lists: ComfyModels, fromImage: boolean): ClipModels | null {
  // The 5B model does both directions (ti2v); the 14B ones are one each.
  const direction = fromImage ? /i2v/i : /t2v|ti2v/i;
  // A pair installed from Civitai may be named after its uploader's file, which need
  // not say Wan; its half says it is one.
  const wan = (n: string) => (/wan/i.test(n) || !!loraStage(n)) && direction.test(n);
  const high = lists.diffusion.find((n) => wan(n) && loraStage(n) === "high");
  const low = high ? loraTwin(high, lists.diffusion) || lists.diffusion.find((n) => wan(n) && loraStage(n) === "low") : undefined;
  const textEncoder = lists.textEncoders.find((n) => /umt5/i.test(n)) ?? "";
  const base: ClipModels = { model: "", checkpoint: false, lowModel: "", textEncoder, vae: "", loras: [], steps: 0, cfg: 0, shift: 0 };
  if (high && low) return { ...base, model: high, lowModel: low, vae: wanVAE(lists.vaes, false) };
  const single = lists.diffusion.find((n) => wan(n) && !loraStage(n));
  if (single) return { ...base, model: single, vae: wanVAE(lists.vaes, /5b/i.test(single)) };
  const aio = lists.checkpoints.find(wan);
  if (aio) return { ...base, model: aio, checkpoint: true, textEncoder: "" };
  return null;
}

/** Wan 2.1's VAE serves every model but the 5B, which has a 2.2 VAE of its own. */
function wanVAE(vaes: readonly string[], fiveB: boolean): string {
  const v22 = (n: string) => /wan[\s_.-]?2[._]?2/i.test(n);
  const own = vaes.filter((n) => /wan/i.test(n) && v22(n) === fiveB);
  return own[0] ?? "";
}
