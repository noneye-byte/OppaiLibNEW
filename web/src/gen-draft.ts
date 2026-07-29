import type { GenInfo } from "./gen-info.js";
import type { CameraSpec } from "./camera.js";
import type { OutfitGear } from "./outfit-loadout.js";

/**
 * Local draft persistence for the Creation tab.
 *
 * Leaving the tab used to erase everything. The state lived only in the component's
 * fields, and switching to the library or reloading the page destroyed the component
 * — so a long prompt with a dozen LoRAs balanced by hand was gone, with no way back.
 *
 * The draft is per-device rather than server-side on purpose. It is genuinely
 * unfinished work in progress, saved every few keystrokes, and pushing that to the
 * server would mean a write per keystroke and a second device fighting over the same
 * row. What is worth sharing across devices is a *finished* generation, which already
 * lives in the gallery.
 *
 * Everything here is defensive about shape. The stored blob outlives the code that
 * wrote it: a draft saved before a field existed will not have it, and one saved after
 * a field is removed will have a stray. So loading validates field by field and
 * discards anything it does not recognise, and a corrupt or foreign blob restores
 * nothing rather than throwing during startup.
 */

const DRAFT_KEY = "oppai_gen_draft";

/** Bump when a change makes old drafts actively wrong rather than merely incomplete.
    A mismatch discards silently — a draft is convenience, never data to migrate. */
const DRAFT_VERSION = 1;

/** How long an untouched draft is kept. Restoring a prompt from last month as though
    it were in progress is more confusing than starting clean. */
const DRAFT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** The output history kept with the draft: enough to redisplay what was made, and
    the record of how. The image bytes are not stored — they live server-side until
    saved, and a base64 image per shot would blow the storage quota immediately. */
export interface DraftShot {
  id: string;
  seed: number;
  saved: boolean;
  info?: GenInfo;
  /** Filename captured from the outfit slot at generation time. */
  outfitFilename?: string;
  /** The exact wardrobe square this image was generated for. Keeping this with the
      image prevents a later selector change from relabelling an earlier result. */
  outfitSlot?: DraftOutfitSlot;
  /** Settings shared by one outfit run (backdrop/underwear/body-hair choices). */
  outfitConfig?: string;
  /** True after the automatic cutout has been inspected/corrected by hand and applied
      back to this outfit square. */
  cutoutReviewed?: boolean;
  /** Cache buster for a preview whose bytes were replaced by the reviewed cutout. */
  previewVersion?: number;
  /** The wardrobe this square is stored in server-side, as work in progress. Set for
      outfit squares, and what makes them outlive the in-memory preview cache: the
      picture is read back from the wardrobe rather than from a preview id that expires
      six hours after it was generated. */
  wipOutfitId?: string;
  /** Freeform position on the generation workspace, in CSS pixels. */
  workspaceX?: number;
  workspaceY?: number;
}

export interface DraftOutfitSlot {
  emotion: string;
  emotionLabel: string;
  tier: number;
  tierLabel: string;
  index: number;
}

/** Everything the Creation tab restores. All optional: an older draft simply has
    fewer fields, and each is applied only if it survived validation. */
export interface GenDraft {
  version: number;
  at: number;

  prompt?: string;
  negative?: string;
  checkpoint?: string;
  vae?: string;
  templateId?: string;
  scheduler?: string;

  width?: number;
  height?: number;
  steps?: number;
  cfg?: number;
  cfgRescale?: number;
  clipSkip?: number;
  seamlessX?: boolean;
  seamlessY?: boolean;
  vaePrecision?: "fp32" | "fp16";
  cpuNoise?: boolean;
  count?: number;
  seed?: number;
  board?: string;

  selectedLoras?: Record<string, number>;
  selectedTriggers?: string[];
  selectedChars?: string[];

  outfitOn?: boolean;
  outfitText?: string;
  outfitGear?: OutfitGear;
  outfitFace?: number;
  outfitTier?: number;
  outfitBackground?: "black" | "white";
  outfitUnderwearColor?: string;
  outfitPubicHair?: boolean;
  outfitPubicHairColor?: string;
  outfitCutout?: boolean;
  /** Whether equipped colours are weighted and defended with colour negatives. */
  outfitLockColors?: boolean;
  /** The saved loadout preset this board came from, if any. */
  outfitLoadoutId?: string;
  /** The wardrobe reviewed sprites are filed into as they are approved. */
  outfitWardrobeId?: string;
  /** Camera and shot composition. Stored as a partial and merged over the defaults on
      restore, because a draft written before an axis existed must not leave that axis
      undefined and index a lookup table with it. */
  camera?: Partial<CameraSpec>;

  detailerEnabled?: boolean;
  detailerModel?: string;
  detailerPrompt?: string;
  detailerNegative?: string;
  detailerConfidence?: number;
  detailerDenoise?: number;
  detailerMaskBlur?: number;

  /** Panels the user had expanded. Restoring these is what makes a return to the tab
      feel like coming back rather than starting over. */
  open?: Record<string, boolean>;
  showOptions?: boolean;

  shots?: DraftShot[];
  /** Vertical scroll of the creator column, so a long form comes back where it was. */
  scrollTop?: number;
}

/** Saves the draft. Never throws: a full or disabled localStorage (private mode,
    quota) must not break generating, which is the actual feature. */
export function saveDraft(draft: Omit<GenDraft, "version" | "at">) {
  try {
    const blob: GenDraft = { ...draft, version: DRAFT_VERSION, at: Date.now() };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(blob));
  } catch {
    // Out of quota or storage denied. The draft is a convenience; losing it is not
    // worth surfacing an error over.
  }
}

/** Loads the draft, or null when there is nothing usable to restore. */
export function loadDraft(): GenDraft | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(DRAFT_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    clearDraft();
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const d = parsed as Record<string, unknown>;
  if (d.version !== DRAFT_VERSION) {
    clearDraft();
    return null;
  }
  const at = typeof d.at === "number" ? d.at : 0;
  if (!at || Date.now() - at > DRAFT_TTL_MS) {
    clearDraft();
    return null;
  }

  const out: GenDraft = { version: DRAFT_VERSION, at };
  const str = (k: keyof GenDraft) => {
    const v = d[k as string];
    if (typeof v === "string") (out[k] as unknown) = v;
  };
  const bool = (k: keyof GenDraft) => {
    const v = d[k as string];
    if (typeof v === "boolean") (out[k] as unknown) = v;
  };
  const num = (k: keyof GenDraft) => {
    const v = d[k as string];
    // A NaN or Infinity that reached a slider would render as an empty control the
    // user cannot fix without knowing to retype it.
    if (typeof v === "number" && Number.isFinite(v)) (out[k] as unknown) = v;
  };

  (["prompt", "negative", "checkpoint", "vae", "templateId", "scheduler", "board",
    "outfitText", "outfitUnderwearColor", "outfitPubicHairColor",
    "outfitLoadoutId", "outfitWardrobeId",
    "detailerModel", "detailerPrompt", "detailerNegative"] as const).forEach(str);
  (["width", "height", "steps", "cfg", "cfgRescale", "clipSkip", "count", "seed",
    "outfitFace", "outfitTier", "detailerConfidence", "detailerDenoise",
    "detailerMaskBlur", "scrollTop"] as const).forEach(num);
  (["seamlessX", "seamlessY", "cpuNoise", "outfitOn", "outfitCutout", "outfitPubicHair",
    "outfitLockColors", "detailerEnabled", "showOptions"] as const).forEach(bool);

  if (d.vaePrecision === "fp16" || d.vaePrecision === "fp32") out.vaePrecision = d.vaePrecision;
  if (d.outfitBackground === "black" || d.outfitBackground === "white") {
    out.outfitBackground = d.outfitBackground;
  }

  // The camera axes are enums; anything not a string is dropped, and an unrecognised
  // string is caught by the merge over DEFAULT_CAMERA on the consuming side.
  if (d.camera && typeof d.camera === "object" && !Array.isArray(d.camera)) {
    const cam: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(d.camera as object)) {
      if (typeof v === "string" || typeof v === "boolean") cam[k] = v;
    }
    if (Object.keys(cam).length) out.camera = cam as Partial<CameraSpec>;
  }

  if (isRecordOfNumbers(d.selectedLoras)) out.selectedLoras = d.selectedLoras;
  if (isRecordOfBooleans(d.open)) out.open = d.open;
  if (isStringArray(d.selectedTriggers)) out.selectedTriggers = d.selectedTriggers;
  if (isStringArray(d.selectedChars)) out.selectedChars = d.selectedChars;
  // Gear predates per-slot colours, so a stored draft may hold either the old
  // `{ top: "sweater" }` or the current `{ top: { color, item } }`. Both are carried
  // through as-is; the studio normalizes on restore, because migrating a shape is the
  // job of the code that uses it and this module's job is only to reject garbage.
  if (isDraftOutfitGear(d.outfitGear)) out.outfitGear = d.outfitGear as OutfitGear;

  if (Array.isArray(d.shots)) {
    out.shots = d.shots
      .filter((s): s is DraftShot =>
        !!s && typeof s === "object" &&
        typeof (s as DraftShot).id === "string" &&
        typeof (s as DraftShot).seed === "number")
      .map((s) => ({
        id: s.id,
        seed: s.seed,
        saved: !!s.saved,
        info: s.info,
        ...(typeof s.outfitFilename === "string" ? { outfitFilename: s.outfitFilename } : {}),
        ...(isOutfitSlot(s.outfitSlot) ? { outfitSlot: s.outfitSlot } : {}),
        ...(typeof s.outfitConfig === "string" ? { outfitConfig: s.outfitConfig } : {}),
        ...(typeof s.cutoutReviewed === "boolean" ? { cutoutReviewed: s.cutoutReviewed } : {}),
        ...(typeof s.wipOutfitId === "string" ? { wipOutfitId: s.wipOutfitId } : {}),
        ...(typeof s.previewVersion === "number" && Number.isFinite(s.previewVersion)
          ? { previewVersion: s.previewVersion }
          : {}),
        ...(typeof s.workspaceX === "number" && Number.isFinite(s.workspaceX)
          ? { workspaceX: Math.max(0, s.workspaceX) }
          : {}),
        ...(typeof s.workspaceY === "number" && Number.isFinite(s.workspaceY)
          ? { workspaceY: Math.max(0, s.workspaceY) }
          : {}),
      }));
  }
  return out;
}

/**
 * Whether the stored gear is worth handing on: any plain record of slots.
 *
 * Deliberately loose, and checked only at the top level. Slot values are validated
 * where the shape is actually used — refusing the whole record because one slot holds
 * something absurd would throw away the nine good garments beside it.
 */
function isDraftOutfitGear(value: unknown): boolean {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isOutfitSlot(v: unknown): v is DraftOutfitSlot {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const s = v as Record<string, unknown>;
  return typeof s.emotion === "string" && typeof s.emotionLabel === "string" &&
    typeof s.tier === "number" && Number.isInteger(s.tier) &&
    typeof s.tierLabel === "string" && typeof s.index === "number" && Number.isInteger(s.index);
}

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Nothing useful to do.
  }
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function isRecordOfNumbers(v: unknown): v is Record<string, number> {
  return !!v && typeof v === "object" && !Array.isArray(v) &&
    Object.values(v as object).every((x) => typeof x === "number" && Number.isFinite(x));
}

function isRecordOfBooleans(v: unknown): v is Record<string, boolean> {
  return !!v && typeof v === "object" && !Array.isArray(v) &&
    Object.values(v as object).every((x) => typeof x === "boolean");
}
