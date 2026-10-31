// Picking the files for a Wan clip, as the Video settings and the Video studio do it.
//
// Wan 2.2's 14B models come as a pair of experts, high noise and low noise, and so do
// the LoRAs made for them — a file per expert, told apart only by "high" or "low"
// somewhere in the name. Which is which is the part people get wrong in ComfyUI, so
// these read it off the names: what a LoRA is for, its other half, and a first guess
// at the whole set from what ComfyUI has installed. The studio offers a pair as one
// model and a pair's LoRA as one LoRA, and sends the files back out as ComfyUI has them.

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
  return clipIsFast(m) && m.cfg > 1.5;
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
  const base: ClipModels = { ...NO_CLIP_MODELS, textEncoder };
  if (high && low) return { ...base, model: high, lowModel: low, vae: wanVAE(lists.vaes, false) };
  const single = lists.diffusion.find((n) => wan(n) && !loraStage(n));
  if (single) return { ...base, model: single, vae: wanVAE(lists.vaes, /5b/i.test(single)) };
  const aio = lists.checkpoints.find(wan);
  if (aio) return { ...base, model: aio, checkpoint: true, textEncoder: "" };
  return null;
}

/** Wan 2.1's VAE serves every model but the 5B, which has a 2.2 VAE of its own. */
function wanVAE(vaes: readonly string[], fiveB: boolean): string {
  const own = vaes.filter((n) => /wan/i.test(n) && isWan22VAE(n) === fiveB);
  return own[0] ?? "";
}

function isWan22VAE(name: string): boolean {
  return /wan[\s_.-]?2[._]?2/i.test(name);
}

/** No files at all: what a direction Settings has nothing for starts from. Zero steps,
    CFG and shift, and a blank sampler, are Wan's own. */
export const NO_CLIP_MODELS: ClipModels = {
  model: "", checkpoint: false, lowModel: "", textEncoder: "", vae: "", loras: [], steps: 0, cfg: 0, shift: 0, sampler: "", scheduler: "",
};

/** One model as the Video studio offers it: a Wan 2.2 pair's two experts are one. */
export interface ClipModelChoice {
  /** The file it is picked by: the high-noise expert's for a pair. */
  key: string;
  label: string;
  /** A high/low pair from diffusion_models, one model from there, or an all-in-one
      checkpoint with its own text encoder and VAE. */
  kind: "pair" | "single" | "checkpoint";
  lowModel: string;
  speed: boolean;
}

/** ComfyUI's models as choices: each high-noise expert folded with its low-noise twin,
    the rest one by one, then the checkpoints, each kind in name order. */
export function clipModelChoices(lists: Pick<ComfyModels, "diffusion" | "checkpoints">): ClipModelChoice[] {
  const taken = new Set<string>();
  const pairs: ClipModelChoice[] = [];
  const singles: ClipModelChoice[] = [];
  for (const name of lists.diffusion) {
    if (taken.has(name)) continue;
    taken.add(name);
    const stage = loraStage(name);
    const twin = stage ? loraTwin(name, lists.diffusion) : "";
    if (twin && !taken.has(twin)) {
      taken.add(twin);
      const [high, low] = stage === "high" ? [name, twin] : [twin, name];
      pairs.push({ key: high, label: choiceLabel(high, true), kind: "pair", lowModel: low, speed: isSpeedFile(high) || isSpeedFile(low) });
    } else {
      singles.push({ key: name, label: choiceLabel(name, false), kind: "single", lowModel: "", speed: isSpeedFile(name) });
    }
  }
  const checkpoints = lists.checkpoints.map((name): ClipModelChoice =>
    ({ key: name, label: choiceLabel(name, false), kind: "checkpoint", lowModel: "", speed: isSpeedFile(name) }));
  const byLabel = (a: ClipModelChoice, b: ClipModelChoice) => a.label.localeCompare(b.label, undefined, { sensitivity: "base", numeric: true });
  return [...pairs.sort(byLabel), ...singles.sort(byLabel), ...checkpoints.sort(byLabel)];
}

/** The choice a recipe's files are, when ComfyUI still lists them. */
export function clipModelChoiceOf(m: ClipModels, choices: readonly ClipModelChoice[]): ClipModelChoice | undefined {
  return choices.find((c) => c.key === m.model && (c.kind === "checkpoint") === m.checkpoint);
}

/** A recipe with a model picked. A pair brings its twin; a checkpoint its own text
    encoder and VAE; a bare model keeps the encoder it had, or is given umt5, and the
    VAE it had when that fits it — Wan 2.1's for everything but the 5B, which has
    2.2's — or the one that does. */
export function withClipModel(m: ClipModels, c: ClipModelChoice, lists: Pick<ComfyModels, "textEncoders" | "vaes">): ClipModels {
  if (c.kind === "checkpoint") return settleSpeed(m, { ...m, model: c.key, checkpoint: true, lowModel: "", textEncoder: "", vae: "" });
  const fiveB = /5b/i.test(c.key);
  const vae = m.vae && isWan22VAE(m.vae) === fiveB ? m.vae : wanVAE(lists.vaes, fiveB) || m.vae;
  const textEncoder = m.textEncoder || lists.textEncoders.find((n) => /umt5/i.test(n)) || "";
  return settleSpeed(m, { ...m, model: c.key, checkpoint: false, lowModel: c.lowModel, textEncoder, vae });
}

/** Whether anything a recipe samples with is a speed file. */
export function clipIsFast(m: ClipModels): boolean {
  return [m.model, m.lowModel, ...m.loras.filter((l) => l.weight !== 0).map((l) => l.name)].some((n) => !!n && isSpeedFile(n));
}

/** Past this many steps the numbers are a full model's: a speed file is run at four to
    eight, and twenty with one is minutes spent for nothing. */
const FEW_STEPS = 8;

/** A recipe that has just taken on a speed file loses the numbers set for a full
    model, which would burn it, and one that has just lost its last keeps no 4 steps
    at CFG 1, which a full model makes mush of. Both go back to blank — the server's
    own, which knows which is which. Numbers a speed file can take stand. */
export function settleSpeed(before: ClipModels, after: ClipModels): ClipModels {
  const was = clipIsFast(before);
  const is = clipIsFast(after);
  if (!was && is && (after.steps > FEW_STEPS || after.cfg > 1.5)) return { ...after, steps: 0, cfg: 0 };
  if (was && !is && after.steps === SPEED_SETTINGS.steps && after.cfg === SPEED_SETTINGS.cfg) return { ...after, steps: 0, cfg: 0 };
  return after;
}

/** A clip's files as the studio holds them: the files and numbers, and the LoRAs on by
    the choice they are picked as, with their weights. */
export interface StudioClipRecipe {
  models: ClipModels;
  loras: Record<string, number>;
}

/** The studio's start: what Settings has, its LoRAs read as choices. A LoRA ComfyUI no
    longer lists has nothing to be picked as, and would not load anyway. */
export function studioClipRecipe(settings: ClipModels | undefined, loraChoices: readonly ClipLoraChoice[]): StudioClipRecipe {
  const models = { ...NO_CLIP_MODELS, ...settings, loras: [] };
  const loras: Record<string, number> = {};
  for (const l of settings?.loras ?? []) {
    const c = loraChoices.find((x) => x.files.some((f) => f.name === l.name));
    if (c && loras[c.key] === undefined && l.weight !== 0) loras[c.key] = l.weight;
  }
  return { models, loras };
}

/** The recipe as the clip call takes it, every file of each LoRA at its weight. */
export function studioClipModels(r: StudioClipRecipe, loraChoices: readonly ClipLoraChoice[]): ClipModels {
  const pair = !!r.models.lowModel && !r.models.checkpoint;
  return { ...r.models, loras: clipLoraPicks(r.loras, loraChoices, pair) };
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

/**
 * Whether a clip on these files can loop. A loop is the start picture given again as
 * the last frame, and Wan 2.2's 5B model — the one with its own VAE — has no way to
 * take a last frame (checkLoop in imagegen/comfy_wan.go says the same). Its VAE's name
 * is the tell, as it is on the server.
 */
export function canLoop(m: Pick<ClipModels, "vae"> | undefined): boolean {
  return !/wan2\.2|wan2_2|wan22/i.test(m?.vae ?? "");
}
