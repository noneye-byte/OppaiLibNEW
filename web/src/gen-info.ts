import type { GalleryImageMetadata, GenerateParams } from "./api.js";

/**
 * The complete record of how one image was made, and how to write it down.
 *
 * Two formats, because they are read by different things.
 *
 * `infotext` is A1111's parameters format — the one every tool in this ecosystem
 * understands. Paste it into A1111, Forge, ComfyUI's parameter reader or a metadata
 * viewer and it repopulates. That interoperability is the whole reason to keep the
 * quirks of the format (the fixed three-line shape, "Negative prompt:" on its own
 * line, comma-separated key/value pairs) instead of inventing something tidier.
 *
 * `json` is the lossless one. Some of what this app tracks has no place in A1111's
 * format at all — an InvokeAI board, the outfit-cutout reference, a per-run VAE
 * precision — and squeezing those into infotext would either drop them or emit keys
 * nothing else can read. So the JSON carries everything and the infotext carries what
 * travels.
 */

/** One LoRA as it was applied. */
export interface GenInfoLora {
  name: string;
  weight: number;
  hash?: string;
}

/** Everything known about one generation run. Captured at submit time from the state
    that was actually sent, never re-derived from the controls afterwards — the whole
    point is that it still describes this image after the sliders have moved on. */
export interface GenInfo {
  prompt: string;
  negativePrompt: string;
  /** The checkpoint, as the backend names it. */
  model: string;
  /** SHA-256 reported by the generator, used by Civitai to identify the resource. */
  modelHash?: string;
  vae: string;
  vaePrecision: string;
  /** InvokeAI calls this the scheduler and A1111 the sampler; they are the same
      choice, so it is recorded once and written under both names. */
  sampler: string;
  seed: number;
  steps: number;
  cfgScale: number;
  cfgRescale: number;
  clipSkip: number;
  width: number;
  height: number;
  seamlessX: boolean;
  seamlessY: boolean;
  cpuNoise: boolean;
  loras: GenInfoLora[];
  /** Trigger phrases the selected models declare — the embeddings/activation text
      that was folded into the prompt. */
  triggers: string[];
  /** Named characters whose descriptions were folded in. */
  characters: string[];
  /** The outfit layer, when it was on: what it contributed. */
  outfit?: string;
  /** A control input: the cutout reference image in play, by name. */
  controlImage?: string;
  /** The face/detail refiner pass, when enabled. */
  refiner?: {
    model: string;
    prompt: string;
    negativePrompt: string;
    confidence: number;
    denoise: number;
    maskBlur: number;
  };
  /** Destination board, for backends that have them. */
  board?: string;
  /** Which API produced this — "invokeai" or "a1111". The same parameters do not
      mean quite the same thing across the two, so the record says which. */
  backend: string;
  /** Wall-clock seconds the run took, measured client-side. */
  seconds?: number;
  /** When it finished, epoch millis. */
  at: number;
}

/** Builds the record from the parameters that were actually submitted, plus the
    context the request itself doesn't carry. */
export function buildGenInfo(
  params: GenerateParams,
  extra: {
    seed: number;
    backend: string;
    modelHash?: string;
    loraHashes?: Record<string, string>;
    triggers?: string[];
    characters?: string[];
    outfit?: string;
    controlImage?: string;
    seconds?: number;
  },
): GenInfo {
  return {
    prompt: params.prompt,
    negativePrompt: params.negativePrompt ?? "",
    model: params.checkpoint ?? "",
    modelHash: extra.modelHash || undefined,
    vae: params.vae ?? "",
    vaePrecision: params.vaePrecision ?? "fp32",
    sampler: params.sampler ?? "",
    // The submitted seed may be -1 ("surprise me"); the seed that came back is the
    // one that reproduces the image, so the caller passes it in.
    seed: extra.seed,
    steps: params.steps ?? 0,
    cfgScale: params.cfgScale ?? 0,
    cfgRescale: params.cfgRescale ?? 0,
    clipSkip: params.clipSkip ?? 0,
    width: params.width ?? 0,
    height: params.height ?? 0,
    seamlessX: !!params.seamlessX,
    seamlessY: !!params.seamlessY,
    cpuNoise: params.cpuNoise !== false,
    loras: (params.loras ?? []).map((l) => ({
      name: l.name,
      weight: l.weight,
      hash: extra.loraHashes?.[l.name] || undefined,
    })),
    triggers: extra.triggers ?? [],
    characters: extra.characters ?? [],
    outfit: extra.outfit || undefined,
    controlImage: extra.controlImage || undefined,
    refiner:
      params.detailer?.enabled
        ? {
            model: params.detailer.model ?? "",
            prompt: params.detailer.prompt ?? "",
            negativePrompt: params.detailer.negativePrompt ?? "",
            confidence: params.detailer.confidence ?? 0,
            denoise: params.detailer.denoise ?? 0,
            maskBlur: params.detailer.maskBlur ?? 0,
          }
        : undefined,
    board: params.board && params.board !== "none" ? params.board : undefined,
    backend: extra.backend,
    seconds: extra.seconds,
    at: Date.now(),
  };
}

/**
 * A1111 parameters format.
 *
 * Shape is load-bearing, not stylistic: line one is the prompt, line two is
 * "Negative prompt: …" if there is one, and the last line is comma-separated
 * key: value pairs. Readers parse by exactly that, so a prettier layout would make
 * the output non-interoperable — which is the only reason to emit this format.
 *
 * Keys with no A1111 equivalent are emitted under their own names at the end. A
 * reader that doesn't know them ignores them; one that does gets the detail.
 */
export function toInfotext(info: GenInfo): string {
  // InvokeAI applies LoRAs as graph nodes, so its prompt does not contain A1111's
  // portable <lora:...> tokens. Add any missing tokens in the exported record; this is
  // what lets Civitai and A1111 see both the resource and its strength.
  const loraTokens = info.loras
    .filter((l) => !info.prompt.includes(`<lora:${l.name}:`))
    .map((l) => `<lora:${l.name}:${l.weight}>`)
    .join(" ");
  const portablePrompt = [info.prompt, loraTokens].filter(Boolean).join(" ");
  const lines: string[] = [portablePrompt];
  if (info.negativePrompt) lines.push(`Negative prompt: ${info.negativePrompt}`);

  const kv: string[] = [
    `Steps: ${info.steps}`,
    `Sampler: ${info.sampler || "default"}`,
    `CFG scale: ${info.cfgScale}`,
    `Seed: ${info.seed}`,
    `Size: ${info.width}x${info.height}`,
  ];
  if (info.model) kv.push(`Model: ${info.model}`);
  if (info.modelHash) kv.push(`Model hash: ${info.modelHash}`);
  if (info.vae) kv.push(`VAE: ${info.vae}`);
  if (info.clipSkip > 0) kv.push(`Clip skip: ${info.clipSkip}`);
  if (info.cfgRescale > 0) kv.push(`CFG Rescale: ${info.cfgRescale}`);
  // The prompt tokens above carry the strengths. Civitai additionally recognises the
  // hashes as exact resource identities, avoiding ambiguous filename matching.
  const hashedLoras = info.loras.filter((l) => l.hash);
  if (hashedLoras.length) {
    kv.push(`Lora hashes: "${hashedLoras.map((l) => `${l.name}: ${l.hash}`).join(", ")}"`);
  }
  if (info.seamlessX || info.seamlessY) {
    kv.push(`Seamless: ${[info.seamlessX ? "x" : "", info.seamlessY ? "y" : ""].filter(Boolean).join("+")}`);
  }
  if (info.vaePrecision) kv.push(`VAE precision: ${info.vaePrecision}`);
  if (!info.cpuNoise) kv.push("Noise device: gpu");
  if (info.refiner) {
    kv.push(`ADetailer model: ${info.refiner.model}`);
    kv.push(`ADetailer confidence: ${info.refiner.confidence}`);
    kv.push(`ADetailer denoising strength: ${info.refiner.denoise}`);
    kv.push(`ADetailer mask blur: ${info.refiner.maskBlur}`);
    if (info.refiner.prompt) kv.push(`ADetailer prompt: ${info.refiner.prompt}`);
    if (info.refiner.negativePrompt) kv.push(`ADetailer negative prompt: ${info.refiner.negativePrompt}`);
  }
  if (info.triggers.length) kv.push(`Trigger phrases: ${info.triggers.join(" ")}`);
  if (info.characters.length) kv.push(`Characters: ${info.characters.join(", ")}`);
  if (info.controlImage) kv.push(`Control image: ${info.controlImage}`);
  if (info.board) kv.push(`Board: ${info.board}`);
  kv.push(`Backend: ${info.backend}`);
  if (info.seconds !== undefined) kv.push(`Generation time: ${info.seconds.toFixed(1)}s`);

  lines.push(kv.join(", "));
  return lines.join("\n");
}

/** The lossless form, for putting back into this app. */
export function toJSON(info: GenInfo): string {
  return JSON.stringify(info, null, 2);
}

/** Converts stored gallery metadata into the complete client-side record. */
export function fromGalleryMetadata(meta: GalleryImageMetadata): GenInfo {
  return {
    prompt: meta.prompt,
    negativePrompt: meta.negativePrompt ?? "",
    model: meta.model ?? "",
    modelHash: meta.modelHash || undefined,
    vae: meta.vae ?? "",
    vaePrecision: "fp32",
    sampler: meta.sampler ?? "",
    seed: meta.seed,
    steps: meta.steps,
    cfgScale: meta.cfgScale,
    cfgRescale: meta.cfgRescale,
    clipSkip: meta.clipSkip,
    width: meta.width,
    height: meta.height,
    seamlessX: meta.seamlessX,
    seamlessY: meta.seamlessY,
    cpuNoise: meta.cpuNoise,
    loras: meta.loras ?? [],
    triggers: [],
    characters: [],
    backend: meta.backend || "invokeai",
    at: Date.now(),
  };
}

/** Parameters that can be loaded back into the studio for another generation. */
export function toGenerateParams(info: GenInfo): GenerateParams {
  return {
    prompt: info.prompt,
    negativePrompt: info.negativePrompt || undefined,
    checkpoint: info.model || undefined,
    vae: info.vae || undefined,
    sampler: info.sampler || undefined,
    seed: info.seed,
    steps: info.steps,
    cfgScale: info.cfgScale,
    cfgRescale: info.cfgRescale,
    clipSkip: info.clipSkip,
    width: info.width,
    height: info.height,
    seamlessX: info.seamlessX,
    seamlessY: info.seamlessY,
    vaePrecision: info.vaePrecision === "fp16" ? "fp16" : "fp32",
    cpuNoise: info.cpuNoise,
    count: 1,
    loras: info.loras.map(({ name, weight }) => ({ name, weight })),
    detailer: info.refiner ? { enabled: true, ...info.refiner } : undefined,
    board: info.board,
  };
}

/**
 * Copies text, with a fallback for the case the Clipboard API refuses.
 *
 * navigator.clipboard needs a secure context, and this app is routinely reached over
 * plain HTTP on a LAN address — where it is simply absent. Without the fallback,
 * "copy" would silently do nothing on the deployment this is most used from.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through: a rejected permission is not different from an absent API here.
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    // Off-screen but focusable, and readonly so mobile keyboards stay down.
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
