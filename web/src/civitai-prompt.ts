import type { CivitaiImage } from "./api.js";

/**
 * Turning a Civitai showcase image into studio settings.
 *
 * The reason to open a version's gallery is to find a picture that works and make
 * one like it. The metadata Civitai keeps is A1111-flavoured — "DPM++ 2M Karras",
 * "Size": "512x768", numbers that arrive as strings — while the studio speaks
 * InvokeAI's scheduler ids and separate width/height. This maps one onto the other
 * and leaves out whatever the poster did not keep, so a gap in the metadata leaves
 * the form's own value alone rather than resetting it.
 */
export interface PromptSettings {
  prompt: string;
  negativePrompt?: string;
  sampler?: string;
  steps?: number;
  cfgScale?: number;
  seed?: number;
  width?: number;
  height?: number;
}

/** A1111 sampler names, lower-cased, to InvokeAI scheduler ids. */
const SAMPLERS: Record<string, string> = {
  "euler a": "euler_a", "euler": "euler", "euler karras": "euler_k",
  "lms": "lms", "lms karras": "lms_k", "heun": "heun", "heun karras": "heun_k",
  "dpm2": "kdpm_2", "dpm2 karras": "kdpm_2_k", "dpm2 a": "kdpm_2_a", "dpm2 a karras": "kdpm_2_a_k",
  "dpm++ 2s a": "dpmpp_2s", "dpm++ 2s a karras": "dpmpp_2s_k",
  "dpm++ 2m": "dpmpp_2m", "dpm++ 2m karras": "dpmpp_2m_k",
  "dpm++ 2m sde": "dpmpp_2m_sde", "dpm++ 2m sde karras": "dpmpp_2m_sde_k",
  "dpm++ 3m sde": "dpmpp_3m", "dpm++ 3m sde karras": "dpmpp_3m_k",
  "dpm++ sde": "dpmpp_sde", "dpm++ sde karras": "dpmpp_sde_k",
  "ddim": "ddim", "ddpm": "ddpm", "deis": "deis", "unipc": "unipc", "lcm": "lcm", "pndm": "pndm",
  "tcd": "tcd",
};

/** The studio's id for a sampler as Civitai names it, or "" for one it cannot map
 *  (the form keeps its own choice rather than being handed a name InvokeAI would
 *  reject). Already-valid ids pass through, since some posters use those. */
export function schedulerIdFor(name: string | undefined): string {
  if (!name) return "";
  const key = name.trim().toLowerCase().replace(/\s+/g, " ");
  if (SAMPLERS[key]) return SAMPLERS[key];
  if (Object.values(SAMPLERS).includes(key)) return key;
  // "DPM++ 2M Karras Exponential" and the like: try the leading words.
  const words = key.split(" ");
  for (let n = words.length - 1; n >= 1; n--) {
    const head = words.slice(0, n).join(" ");
    if (SAMPLERS[head]) return SAMPLERS[head];
  }
  return "";
}

/** "512x768" as [width, height], or null for anything else. */
export function parseSize(size: string | undefined): [number, number] | null {
  const m = /^\s*(\d{2,5})\s*[x×]\s*(\d{2,5})\s*$/i.exec(size ?? "");
  if (!m) return null;
  const w = Number(m[1]), h = Number(m[2]);
  return w >= 64 && h >= 64 ? [w, h] : null;
}

export function promptSettingsFrom(img: CivitaiImage): PromptSettings | null {
  const prompt = (img.prompt ?? "").trim();
  if (!prompt) return null;
  const out: PromptSettings = { prompt };
  if (img.negativePrompt?.trim()) out.negativePrompt = img.negativePrompt.trim();
  const sampler = schedulerIdFor(img.sampler);
  if (sampler) out.sampler = sampler;
  if (img.steps && img.steps > 0 && img.steps <= 150) out.steps = Math.round(img.steps);
  if (img.cfgScale && img.cfgScale > 0 && img.cfgScale <= 30) out.cfgScale = img.cfgScale;
  if (img.seed && img.seed > 0) out.seed = img.seed;
  const size = parseSize(img.size) ?? (img.width >= 64 && img.height >= 64 ? [img.width, img.height] as [number, number] : null);
  if (size) [out.width, out.height] = size;
  return out;
}
