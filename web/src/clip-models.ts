// Picking the files for a Wan clip, as the Video settings do it.
//
// Wan 2.2's 14B models come as a pair of experts, high noise and low noise, and so do
// the LoRAs made for them — a file per expert, told apart only by "high" or "low"
// somewhere in the name. Which is which is the part people get wrong in ComfyUI, so
// these read it off the names: what a LoRA is for, its other half, and a first guess
// at the whole set from what ComfyUI has installed.

import type { ClipLora, ClipModels, ComfyFolderKind, ComfyModels } from "./api.js";

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

/** A LoRA, or a merge with one baked in (the "Rapid" all-in-ones), that distils Wan
    down to a handful of steps. It is only right at its own few steps and CFG 1; at
    Wan's usual 20 and 3.5 it burns the clip. The server reads names the same way
    (imagegen/comfy_wan.go) to settle the numbers left blank. */
export function isSpeedFile(name: string): boolean {
  return /lightx2v|lightning|causvid|distill|rapid|fastwan|(?<![a-z])aio(?![a-z])|(?<![0-9])4[\s_-]?steps?/i.test(name);
}

/** The steps and CFG a speed LoRA wants. */
export const SPEED_SETTINGS = { steps: 4, cfg: 1 } as const;

/** Whether picked files are a speed one at a CFG that burns it, as the Test says. */
export function speedAtFullCFG(m: ClipModels): boolean {
  const files = [m.model, m.lowModel, ...m.loras.filter((l) => l.weight !== 0).map((l) => l.name)];
  return files.some((n) => n && isSpeedFile(n)) && m.cfg > 1.5;
}

/** One LoRA as the Video studio offers it: a pair's two halves are one choice. */
export interface ClipLoraChoice {
  /** The name it is picked by: the high half's for a pair. */
  key: string;
  /** Its name without folder, extension or the word saying which half. */
  label: string;
  /** The files it puts on, each with the expert it is for. */
  files: { name: string; stage: ClipLora["stage"] }[];
  speed: boolean;
}

/** ComfyUI's LoRAs as choices, a high/low pair folded into one, in name order. */
export function clipLoraChoices(names: readonly string[]): ClipLoraChoice[] {
  const taken = new Set<string>();
  const out: ClipLoraChoice[] = [];
  for (const name of names) {
    if (taken.has(name)) continue;
    const twin = loraTwin(name, names);
    let files: ClipLoraChoice["files"] = [{ name, stage: loraStage(name) }];
    if (twin && !taken.has(twin)) {
      const pair = [{ name, stage: loraStage(name) }, { name: twin, stage: loraStage(twin) }];
      files = pair.sort((a) => (a.stage === "high" ? -1 : 1));
      taken.add(twin);
    }
    taken.add(name);
    out.push({ key: files[0].name, label: choiceLabel(files[0].name, files.length > 1), files, speed: isSpeedFile(name) });
  }
  return out.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base", numeric: true }));
}

function choiceLabel(name: string, pair: boolean): string {
  // ComfyUI on Windows lists a subfolder with a backslash.
  let stem = name.split(/[\\/]/).pop()!.replace(/\.(safetensors|ckpt|pt|gguf|bin)$/i, "");
  const half = pair ? lastStage(stem) : null;
  if (half) {
    // The half's word goes, with the "noise" after it and the separator before it.
    const after = stem.slice(half.at + half.text.length).replace(/^[\s_-]?noise/i, "");
    stem = stem.slice(0, half.at).replace(/[\s_-]+$/, "") + after;
  }
  return stem.replace(/[_]+/g, " ").replace(/\s+/g, " ").trim() || name;
}

/** The studio's picks as the clip call takes them: every file of each, at its weight.
    On one model rather than the pair, a pair's LoRA puts on its low-noise half alone —
    the half that finishes the picture, which is what a single model does all of. */
export function clipLoraPicks(picked: Record<string, number>, choices: readonly ClipLoraChoice[], pair: boolean): ClipLora[] {
  const out: ClipLora[] = [];
  for (const c of choices) {
    const weight = picked[c.key];
    if (weight === undefined) continue;
    const files = pair || c.files.length < 2 ? c.files : c.files.filter((f) => f.stage === "low");
    for (const f of files) out.push({ name: f.name, weight, stage: pair ? f.stage : "" });
  }
  return out;
}

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

// The merges that bundle their own text encoder and VAE say so in their name, and the
// server reads the same words to file them (imagegen/comfy_install.go).
const ALL_IN_ONE = /(^|[^a-z])(aio|all[\s_-]?in[\s_-]?one)([^a-z]|$)/i;

/** The ComfyUI folder the server installs a Civitai file into, by the catalogue's type
    and the file's name, or null for a kind a Wan clip has no use for. Most Wan
    "checkpoints" are the bare model, for diffusion_models. */
export function comfyFolderOf(type: string, fileName: string): ComfyFolderKind | null {
  switch (type) {
    case "Checkpoint": return ALL_IN_ONE.test(fileName) ? "checkpoints" : "diffusion_models";
    case "LORA": case "LoCon": case "DoRA": case "LyCORIS": return "loras";
    case "VAE": return "vae";
    default: return null;
  }
}
