import type { PlayDown, PlayDownShare } from "./api.js";

/**
 * The kinds of LoRA the Train screen offers, and the advice it gives about a set.
 *
 * Someone training their first LoRA does not know what a rank is, and should not
 * have to: they know whether they want a character, a style, a pose or an outfit,
 * and each of those wants the same handful of choices made the same way. A preset
 * is those choices — how the pictures are captioned, how long it trains, whether
 * mirrored copies help — plus which of the tags every picture shares the trigger
 * word should stand for. That last one matters most and is the least obvious: a tag
 * in every caption is learnt as that tag, so a character captioned "blonde hair"
 * every time only comes out blonde when the prompt says so. The preset strikes
 * those tags out for you, and says it did.
 *
 * Everything a preset sets stays editable under the advanced settings; "custom" is
 * the trainer's own defaults with nothing struck.
 */

export type PresetId = "character" | "style" | "concept" | "outfit" | "custom";

/** The numbers a run is started with. Zero is "the trainer's default". */
export interface TrainSettings {
  captions: "tags" | "trigger";
  epochs: number;
  repeats: number;
  rank: number;
  alpha: number;
  resolution: number;
  learningRate: number;
  textEncoderLr: number;
  optimizer: string;
  noiseOffset: number;
  flip: boolean;
}

export interface LoraPreset {
  id: PresetId;
  icon: string;
  title: string;
  blurb: string;
  examples: string;
  /** Fewer than min is too few to learn from; ideal is the range worth aiming for. */
  pictures: { min: number; ideal: [number, number] };
  /** What makes a good set of pictures for this kind, in a sentence or two each. */
  tips: string[];
  /** Why the captions are what they are, for the Tags step. */
  captionsWhy: string;
  settings: TrainSettings;
  /** Shared tags the trigger word should absorb, matched against the tag's words. */
  absorb?: RegExp;
}

const BASE: TrainSettings = {
  captions: "tags", epochs: 10, repeats: 0, rank: 0, alpha: 0, resolution: 0,
  learningRate: 0.0001, textEncoderLr: 0, optimizer: "AdamW8bit", noiseOffset: 0, flip: false,
};

// What a character is drawn with every time: her hair, eyes, skin and build. Not her
// clothes — those change from picture to picture and should stay promptable.
const BODY = /\b(hair|bangs|ahoge|sidelocks|ponytail|twintails|braids?|bun|eyes|pupils|heterochromia|eyebrows|eyelashes|skin|skinned|freckles|mole|scar|breasts|ears|tail|horns|wings|halo|fangs?|lips|muscular|tan|tanlines|body)\b/i;

// What a style is: its medium, its rendering, its line. "Monochrome" belongs here —
// for an ink artist it is the style, not a property of one picture.
const STYLE = /\b(style|medium|traditional|digital|painting|watercolor|watercolour|oil|acrylic|sketch|lineart|line art|ink|inking|monochrome|greyscale|grayscale|sepia|realistic|photorealistic|3d|cel|shading|flat color|flat colour|pixel art|retro|oekaki|pastel|limited palette|halftone|screentone|chibi|anime coloring|painterly|impasto|chromatic aberration|film grain|bokeh)\b/i;

// What an outfit or a thing is made of. The preset strikes only the ones nearly every
// picture shares, so a skirt that comes with the outfit goes and one that doesn't stays.
const GARMENT = /\b(dress|shirt|blouse|skirt|shorts|pants|jeans|jacket|coat|hoodie|sweater|cardigan|vest|uniform|suit|armor|armour|kimono|yukata|apron|cape|cloak|robe|bodysuit|leotard|swimsuit|bikini|lingerie|bra|panties|thighhighs|pantyhose|stockings|socks|boots|shoes|heels|sandals|gloves|sleeves|collar|choker|necklace|earrings|ribbon|bow|hat|cap|helmet|headband|hairband|hair ornament|belt|tie|necktie|scarf|frills|lace|buttons|zipper|hood|mask|glasses|eyewear|bag|weapon|sword|staff)\b/i;

export const PRESETS: LoraPreset[] = [
  {
    id: "character",
    icon: "face",
    title: "A character or person",
    blurb: "One face and body, in whatever outfit or pose the prompt asks for.",
    examples: "Your OC, a game character, yourself",
    pictures: { min: 8, ideal: [15, 40] },
    tips: [
      "Vary everything except who it is: outfits, poses, backgrounds, lighting.",
      "Mix close-ups of the face with half- and full-body pictures.",
      "Leave out pictures with other people in them, or crop them away first.",
    ],
    captionsWhy: "Each picture is captioned with its tags, minus her hair, eyes and build — so those go into the trigger word, and her clothes and pose stay up to the prompt.",
    settings: { ...BASE, textEncoderLr: 0.00005 },
    absorb: BODY,
  },
  {
    id: "style",
    icon: "palette",
    title: "An art style",
    blurb: "A way of drawing or rendering, applied to anything you prompt.",
    examples: "An artist's look, a medium, a game's art",
    pictures: { min: 20, ideal: [30, 100] },
    tips: [
      "Many different subjects drawn the same way — the style is what they share.",
      "Avoid one character dominating the set, or the style comes with her face.",
      "Skip pictures with text, watermarks or signatures where you can.",
    ],
    captionsWhy: "Each picture is captioned with what is in it, minus the tags about how it is drawn — so the subject stays promptable and the look goes into the trigger word.",
    settings: { ...BASE, epochs: 12, flip: true, noiseOffset: 0.05, textEncoderLr: 0.00005 },
    absorb: STYLE,
  },
  {
    id: "concept",
    icon: "directions_walk",
    title: "A pose or concept",
    blurb: "An action, a composition, an effect — on anyone.",
    examples: "A pose, a camera angle, a lighting effect",
    pictures: { min: 10, ideal: [20, 60] },
    tips: [
      "The concept is the only thing every picture should have in common.",
      "Use different characters, outfits and places so none of them sticks.",
    ],
    captionsWhy: "Each picture is captioned with its tags. Strike out the ones that describe the concept itself, so the trigger word comes to mean it.",
    settings: { ...BASE, flip: true },
  },
  {
    id: "outfit",
    icon: "checkroom",
    title: "An outfit or object",
    blurb: "A piece of clothing or a thing, worn or held by anyone.",
    examples: "A uniform, a dress, a weapon, a prop",
    pictures: { min: 10, ideal: [15, 50] },
    tips: [
      "Show it from several angles, on different people if you can.",
      "Leave mirroring off if it has text, a logo or a one-sided detail.",
    ],
    captionsWhy: "Each picture is captioned with its tags, minus the parts of the outfit every picture shares — those go into the trigger word, everything else stays promptable.",
    settings: { ...BASE, flip: true },
    absorb: GARMENT,
  },
  {
    id: "custom",
    icon: "tune",
    title: "Something else",
    blurb: "The trainer's defaults, with every setting yours to change.",
    examples: "For when you know what you want",
    pictures: { min: 5, ideal: [15, 60] },
    tips: ["Pictures that share what you want learnt, and differ in everything else."],
    captionsWhy: "Each picture is captioned with its tags. Strike out what the trigger word should stand for.",
    settings: { ...BASE },
  },
];

export function presetById(id: string | undefined): LoraPreset {
  return PRESETS.find((p) => p.id === id) ?? PRESETS[PRESETS.length - 1];
}

/**
 * How long to train, as a beginner chooses it: a quick look at whether the set
 * works at all, the preset's own length, or longer for a set that is large or
 * subtle. It scales the epochs and nothing else.
 */
export type Effort = "quick" | "balanced" | "thorough";

export const EFFORTS: { id: Effort; title: string; blurb: string; scale: number }[] = [
  { id: "quick", title: "Quick test", blurb: "About half as long — to see whether the set works", scale: 0.5 },
  { id: "balanced", title: "Balanced", blurb: "The preset's own length", scale: 1 },
  { id: "thorough", title: "Thorough", blurb: "Half as long again, for a large or subtle set", scale: 1.5 },
];

export function epochsFor(preset: LoraPreset, effort: Effort): number {
  const scale = EFFORTS.find((e) => e.id === effort)?.scale ?? 1;
  return Math.max(2, Math.round(preset.settings.epochs * scale));
}

/** The server's repeats when none are set (lora_dataset.go's loraRepeats): some two
 *  hundred steps an epoch, whatever the size of the set. */
export function autoRepeats(images: number): number {
  if (images <= 0) return 10;
  return Math.max(1, Math.min(Math.floor((200 + Math.floor(images / 2)) / images), 40));
}

/** How many steps a run takes: each picture, its repeats, every epoch. */
export function estimateSteps(images: number, epochs: number, repeats = 0): number {
  if (images <= 0) return 0;
  return images * (repeats > 0 ? repeats : autoRepeats(images)) * Math.max(1, epochs);
}

/**
 * The shared tags a preset strikes out: the ones its absorb pattern names, carried
 * by at least half the pictures. Half, not all — the tagger misses a tag now and
 * then, and "blonde hair" on 19 of 20 pictures is still her hair.
 */
export function suggestLeaveOut(preset: LoraPreset, common: { name: string; count: number }[], total: number): string[] {
  if (!preset.absorb || total <= 0) return [];
  const floor = Math.max(2, Math.ceil(total / 2));
  return common
    .filter((t) => t.count >= Math.min(floor, total) && preset.absorb!.test(t.name.replace(/_/g, " ")))
    .map((t) => t.name);
}

export type AdviceLevel = "good" | "warn" | "bad";

export interface Advice {
  level: AdviceLevel;
  text: string;
}

/** What to say about a set before it trains, worst first. */
export function datasetAdvice(
  preset: LoraPreset,
  set: { count: number; untagged: number; small: number; captions: "tags" | "trigger" },
): Advice[] {
  const out: Advice[] = [];
  const { min, ideal } = preset.pictures;
  const kind = preset.title.toLowerCase().replace(/^an? /, "");
  if (set.count === 0) {
    return [{ level: "bad", text: "No pictures yet. Add some from the library, your computer or an X account." }];
  }
  if (set.count < min) {
    out.push({ level: "bad", text: `${set.count} picture${set.count === 1 ? "" : "s"} is too few for ${kind} — aim for ${ideal[0]}–${ideal[1]}, and at least ${min}.` });
  } else if (set.count < ideal[0]) {
    out.push({ level: "warn", text: `${set.count} pictures will work, but ${ideal[0]}–${ideal[1]} train a steadier LoRA.` });
  } else if (set.count > ideal[1] * 3) {
    out.push({ level: "warn", text: `${set.count} pictures is more than ${kind} needs — it will train slower, not better. The best ${ideal[1]} or so are plenty.` });
  }
  if (set.captions === "tags" && set.untagged > 0) {
    out.push({ level: "warn", text: `${set.untagged} picture${set.untagged === 1 ? " has" : "s have"} no tags, so ${set.untagged === 1 ? "it" : "they"} would be captioned with the trigger word alone. Tag them in the next step.` });
  }
  if (set.small > 0) {
    out.push({ level: "warn", text: `${set.small} picture${set.small === 1 ? " is" : "s are"} small for this checkpoint and will come out soft. Drop ${set.small === 1 ? "it" : "them"} if you have larger ones.` });
  }
  if (out.length === 0) {
    out.push({ level: "good", text: `${set.count} pictures — a good size for ${kind}.` });
  }
  return out;
}

/** How two spellings of a tag are told to be the same: lora_dataset.go's loraTagKey. */
export function tagKey(name: string): string {
  let t = name.trim();
  if (/[a-z]/i.test(t)) t = t.replace(/_/g, " ");
  return t.toLowerCase().split(/\s+/).filter(Boolean).join(" ");
}

/**
 * A picture's caption as the server writes it (lora_dataset.go's loraCaption): the
 * trigger word, then its tags strongest first, less the struck ones and repeats, at
 * most forty. Worked out here too so striking a tag or retyping the trigger shows at
 * once, without asking the server for the whole set again. Played-down tags (`named`)
 * the picture has come straight after the trigger, struck or not, in either mode.
 */
export function captionOf(trigger: string, tags: string[], leaveOut: string[], mode: "tags" | "trigger", named: string[] = []): string {
  const t = trigger.trim();
  const parts = t ? [t] : [];
  const seen = new Set([tagKey(t)]);
  const always = new Set(named.map(tagKey));
  for (const tag of tags) {
    const k = tagKey(tag);
    if (always.has(k) && !seen.has(k)) {
      seen.add(k);
      parts.push(tag);
    }
  }
  if (mode === "trigger") return parts.join(", ");
  const out = new Set(leaveOut.map(tagKey));
  for (const tag of tags) {
    const k = tagKey(tag);
    if (!k || seen.has(k) || out.has(k)) continue;
    seen.add(k);
    parts.push(tag);
    if (parts.length > 40) break;
  }
  return parts.join(", ");
}

/** The short side a picture wants for a checkpoint family to train sharp. */
export function minSideFor(base: string | undefined): number {
  return /xl|pony|illustrious|noob/i.test(base ?? "") ? 768 : 448;
}

/** Whether a run should be started in low-VRAM mode for this card and family. */
export function wantsLowVram(vramMB: number | undefined, base: string | undefined): boolean {
  if (!vramMB) return false;
  return minSideFor(base) > 448 ? vramMB < 12 * 1024 : vramMB < 6 * 1024;
}

// ── playing a tag down ──────────────────────────────────────────────────────
//
// A tag on most of a set's pictures — glasses on a style's, say — is learnt as part of
// the LoRA and then turns up in everything it draws. Striking it makes that worse (the
// trigger word takes it in). Playing it down keeps it named in every caption that has
// it and trains its pictures less often than the rest, so it comes when asked for and
// less often when not. The repeats are worked out by the server (lora_dataset.go's
// loraPlayDownRepeats), which also says what share of training each tag comes to.

/** How much of a tag's share of training to keep, in words. */
export const KEEP_STEPS: { keep: number; label: string }[] = [
  { keep: 0.66, label: "A bit less" },
  { keep: 0.5, label: "Half as often" },
  { keep: 0.25, label: "Rarely" },
];

/** A tag newly played down keeps half its share: noticeable, and still learnable. */
export const DEFAULT_KEEP = 0.5;

export function isPlayedDown(list: PlayDown[], tag: string): boolean {
  const k = tagKey(tag);
  return list.some((p) => tagKey(p.tag) === k);
}

/** Plays a tag down, or stops playing it down. */
export function togglePlayDown(list: PlayDown[], tag: string): PlayDown[] {
  const k = tagKey(tag);
  return isPlayedDown(list, tag) ? list.filter((p) => tagKey(p.tag) !== k) : [...list, { tag, keep: DEFAULT_KEEP }];
}

export function setKeep(list: PlayDown[], tag: string, keep: number): PlayDown[] {
  const k = tagKey(tag);
  return list.map((p) => (tagKey(p.tag) === k ? { ...p, keep } : p));
}

/** The tags a played-down list names in every caption. */
export function playDownNames(list: PlayDown[]): string[] {
  return list.map((p) => p.tag);
}

function percent(v: number): string {
  return `${Math.round(v * 100)}%`;
}

/** What playing a tag down comes to, in a line for under its chip. */
export function shareLine(share: PlayDownShare | undefined, total: number): string {
  if (!share || total <= 0) return "";
  if (share.pictures === 0) return "No picture has this tag any more.";
  if (share.pictures >= total) {
    return `Every picture has it, so there is nothing to show more often instead — it is named in the captions, but can't be made rarer. Add pictures without it.`;
  }
  const before = percent(share.before);
  const after = percent(share.after);
  if (after === before) return `${share.pictures} of ${total} pictures (${before}) — too few repeats to shift; it is still named in their captions.`;
  return `${share.pictures} of ${total} pictures (${before}) — trained as about ${after}, and named in their captions.`;
}
