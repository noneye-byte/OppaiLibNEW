import { LitElement, html, css, nothing, type PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { iconStyles, motionStyles } from "../theme.js";
import {
  api,
  mascotSay,
  type GenCharacter,
  type GenLora,
  type GenModel,
  type GenModelMeta,
  type GenPreview,
  type GenTemplate,
  type GenVae,
  type GalleryBoard,
  type GenerateParams,
  type ImageGenStatus,
  type LibbyLoadout,
  type LibbyOutfit,
} from "../api.js";
import {
  buildGenInfo,
  copyText,
  toGenerateParams,
  toInfotext,
  toJSON,
  type GenInfo,
} from "../gen-info.js";
import { clearDraft, loadDraft, saveDraft, type DraftOutfitSlot } from "../gen-draft.js";
import { openMenu } from "../context-menu.js";
import { playExit } from "../motion.js";
import { downloadGenerationPNG, embedGenerationMetadata } from "../png-metadata.js";
import {
  CAMERA_OPTIONS,
  compileCamera,
  DEFAULT_CAMERA,
  outfitShotPrompt,
  scaleFor,
  type CameraSpec,
  type ShotSize,
} from "../camera.js";
import { libbyReact } from "../libby-voice.js";
import { canvasToBlob, CutoutSession, DEFAULT_COMPOSE, loadImage } from "../cutout.js";
import { outfitArchiveFilename, outfitImageFilename } from "../outfit-name.js";
import {
  DEFAULT_OUTFIT_GEAR,
  OUTFIT_EXPOSURE_TIERS,
  EMPTY_OUTFIT_GEAR,
  OUTFIT_GEAR_SLOTS,
  gearColorNegatives,
  gearKey,
  gearPhrase,
  normalizeOutfitGear,
  rollOutfitExposure,
  type OutfitExposure,
  type GearPiece,
  type OutfitGear,
  type OutfitGearKey,
} from "../outfit-loadout.js";
import type { LibbyEmotion } from "../libby.js";
import "./outfit-wardrobe.js";
import { createZip, type ZipEntry } from "../zip.js";
import "./imagegen-gallery.js";
import "./civitai.js";
import type { OppaiInvokeGallery } from "./imagegen-gallery.js";

// ── Web Speech typings ─────────────────────────────────────────────────────────
// The Speech Recognition API isn't in the standard DOM lib, and it's still vendor-
// prefixed in most browsers (webkitSpeechRecognition). These are the minimal shapes
// this view uses; the runtime feature-detects before touching any of it.
interface SpeechRecognitionResultLike {
  0: { transcript: string };
  isFinal: boolean;
}
interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function speechRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// A generated image, plus the local state that hangs off it (saved yet?).
interface Shot extends GenPreview {
  saved: boolean;
  /** How this image was made, captured at submit time. Absent on a shot restored from
      a draft written before generation data was recorded. */
  info?: GenInfo;
  /** Wardrobe slot filename captured before the controls can move to another pose. */
  outfitFilename?: string;
  outfitSlot?: DraftOutfitSlot;
  outfitConfig?: string;
  cutoutReviewed?: boolean;
  previewVersion?: number;
  /** The wardrobe holding this square as work in progress. Present means the picture
      comes from disk rather than from the expiring preview cache. */
  wipOutfitId?: string;
  workspaceX?: number;
  workspaceY?: number;
}

// Resolution presets under the prompt's Options menu. SD 1.x models train at ~512,
// SDXL at ~1024 — offering both families beats making people type pixel counts.
const RESOLUTIONS: { label: string; hint: string; w: number; h: number }[] = [
  { label: "Portrait", hint: "512×768", w: 512, h: 768 },
  { label: "Square", hint: "512×512", w: 512, h: 512 },
  { label: "Landscape", hint: "768×512", w: 768, h: 512 },
  { label: "Tall", hint: "640×960", w: 640, h: 960 },
  { label: "XL Portrait", hint: "832×1216", w: 832, h: 1216 },
  { label: "XL Square", hint: "1024×1024", w: 1024, h: 1024 },
  { label: "XL Landscape", hint: "1216×832", w: 1216, h: 832 },
];

// Schedulers offered under Model settings. The server maps A1111-style names onto
// InvokeAI ids, so the same values work against either backend.
const SCHEDULERS: { id: string; label: string }[] = [
  { id: "", label: "Default (Euler a)" },
  ...[
    ["ddim", "DDIM"], ["ddpm", "DDPM"], ["deis", "DEIS"], ["deis_k", "DEIS Karras"],
    ["dpmpp_2s", "DPM++ 2S"], ["dpmpp_2s_k", "DPM++ 2S Karras"],
    ["dpmpp_2m", "DPM++ 2M"], ["dpmpp_2m_k", "DPM++ 2M Karras"],
    ["dpmpp_2m_sde", "DPM++ 2M SDE"], ["dpmpp_2m_sde_k", "DPM++ 2M SDE Karras"],
    ["dpmpp_3m", "DPM++ 3M"], ["dpmpp_3m_k", "DPM++ 3M Karras"],
    ["dpmpp_sde", "DPM++ SDE"], ["dpmpp_sde_k", "DPM++ SDE Karras"],
    ["er_sde", "ER-SDE"], ["euler", "Euler"], ["euler_k", "Euler Karras"],
    ["euler_a", "Euler Ancestral"], ["heun", "Heun"], ["heun_k", "Heun Karras"],
    ["kdpm_2", "KDPM 2"], ["kdpm_2_k", "KDPM 2 Karras"],
    ["kdpm_2_a", "KDPM 2 Ancestral"], ["kdpm_2_a_k", "KDPM 2 Ancestral Karras"],
    ["lcm", "LCM"], ["lms", "LMS"], ["lms_k", "LMS Karras"],
    ["pndm", "PNDM"], ["tcd", "TCD"], ["unipc", "UniPC"], ["unipc_k", "UniPC Karras"],
  ].map(([id, label]) => ({ id, label })),
];

// ── outfit helper ──────────────────────────────────────────────────────────────
//
// Libby's wardrobe wants one image per expression per heat tier — sixty of
// them for a complete outfit, all of the same character in the same clothes. Typing
// that by hand is where consistency goes to die, so the helper owns the parts that
// have to stay identical across the set and varies only the face and the mood.
//
// It composes a prompt *fragment* rather than writing into the prompt box, so it
// stays live as the pose is stepped through and can be switched off without having
// to unpick text someone has since edited.

/** Every expression the wardrobe accepts, and the face each one wants. Kept in the
 * same order as LIBBY_EMOTIONS so Next pose walks the editor's slot grid exactly. */
const OUTFIT_FACES: { id: LibbyEmotion; label: string; face: string; pose: string }[] = [
  { id: "neutral", label: "Neutral", face: "calm neutral expression, relaxed face, looking at viewer", pose: "both arms hanging naturally at her sides, relaxed hands" },
  { id: "happy", label: "Happy", face: "warm genuine smile, bright eyes, cheerful expression", pose: "hands loosely clasped behind her lower back, open cheerful posture" },
  { id: "mischievous", label: "Mischievous", face: "smirk, half-lidded eyes, teasing knowing expression", pose: "one hand resting on her hip, other arm relaxed at her side" },
  { id: "surprised", label: "Surprised", face: "surprised expression, wide eyes, slightly open mouth", pose: "hands open near her waist, elbows bent slightly in surprise" },
  { id: "thinking", label: "Thinking", face: "thoughtful expression, looking to the side", pose: "one fingertip resting at her chin, other arm folded gently across her waist" },
  { id: "shy", label: "Shy", face: "bashful shy expression, blushing cheeks, averted eyes, hesitant small smile", pose: "hands clasped low in front of her skirt, shoulders tucked slightly inward" },
  { id: "smug", label: "Smug", face: "self-satisfied smug expression, raised eyebrow, confident knowing smirk", pose: "one hand planted on her hip, other arm loose, confident stance" },
  { id: "sad", label: "Sad", face: "sad wistful expression, downcast eyes, slight frown, vulnerable face", pose: "arms hanging softly at her sides, shoulders slightly slumped" },
  { id: "annoyed", label: "Annoyed", face: "annoyed irritated expression, furrowed brows, impatient pout", pose: "arms crossed low beneath her chest, weight shifted impatiently" },
  { id: "sleepy", label: "Sleepy", face: "sleepy drowsy expression, heavy half-closed eyes, relaxed tired face", pose: "arms loose at her sides, languid slouched posture" },
  { id: "loving", label: "Loving", face: "tender loving expression, soft adoring eyes, affectionate gentle smile", pose: "hands gently clasped low over her abdomen, body leaning affectionately forward" },
  { id: "excited", label: "Excited", face: "excited thrilled expression, sparkling wide eyes, eager open smile", pose: "hands held eagerly near her hips, lively forward-leaning stance" },
];

/** Heat still owns the emotional performance. Clothing exposure is rolled separately
 * from tier-weighted tables, so the upper rows do not all become the same nude pose. */
const OUTFIT_TIERS: { label: string; mood: string }[] = [
  { label: "Calm", mood: "composed posture" },
  { label: "Warm", mood: "soft light blush, inviting posture, slight lean forward" },
  { label: "Flirty", mood: "flirty confident stance, visible blush" },
  { label: "Heated", mood: "heavy blush, sultry posture, parted lips, heavy-lidded eyes" },
  { label: "Peak", mood: "deep blush, flushed skin, breathless needy expression" },
];

// A character being edited (or created — id undefined until saved).
interface CharDraft {
  id?: string;
  name: string;
  prompt: string;
  negativePrompt: string;
  /** A newly-chosen thumbnail as a data URL; undefined keeps the existing one. */
  imageData?: string;
}

/**
 * The image-generation studio: pick a checkpoint (and LoRAs, VAE, templates,
 * characters) in the sidebar, speak or type a prompt, generate, and — only on an
 * explicit Save — keep one in the library.
 *
 * The *library* gains nothing until Save: the server holds generated previews in
 * memory and streams them from there, so an unsaved batch never touches the library.
 * InvokeAI, meanwhile, keeps every finished image in its own gallery on the
 * generator box — the right-hand panel browses that gallery, saves picks into the
 * library, and deletes the rest.
 *
 * It talks to a local InvokeAI or Automatic1111 / SD.Next backend through the server
 * (the browser never reaches the generator directly), so it works the same on a phone
 * as on a desktop; speech uses the browser's own recognition where available.
 */
@customElement("oppai-imagegen")
export class OppaiImageGen extends LitElement {
  /**
   * Outfit studio mode.
   *
   * The same generator, pointed at one job: dressing Libby and rendering her sixty
   * expressions. It is a mode rather than a second component because everything below
   * the outfit board — the checkpoint, the LoRAs, the cutout editor, the draft that
   * survives a reload — is the same machinery, and a copy of it would be a second
   * thing to keep in step for no gain. What changes is what the screen is *about*:
   * the equipment board and the wardrobe lead, the free-form canvas steps back, and
   * the outfit controls exist here and nowhere else in the app.
   */
  @property({ type: Boolean }) studio = false;

  @state() private status: ImageGenStatus | null = null;
  @state() private checkpoint = "";
  @state() private vae = "";
  @state() private templateId = "";
  /** Built-in style presets are hidden by default; the picker shows the user's own. */
  @state() private showBuiltInTemplates = false;
  @state() private selectedLoras: Record<string, number> = {};
  @state() private selectedTriggers: string[] = [];
  @state() private loraPage = 0;
  // Outfit helper. `outfitOn` gates the whole fragment so it can be switched off
  // without losing the wardrobe being worked on.
  @state() private outfitOn = false;
  @state() private outfitText = "";
  @state() private outfitGear: OutfitGear = { ...DEFAULT_OUTFIT_GEAR };
  @state() private outfitFace = 0;
  @state() private outfitTier = 0;
  @state() private outfitBackground: "black" | "white" = "white";
  @state() private outfitUnderwearColor = "black";
  @state() private outfitPubicHair = false;
  @state() private outfitPubicHairColor = "dark brown";
  /** Weights each equipped colour and names every colour it is not in the negative
      prompt. On by default: a wardrobe whose colours drift is the whole set wasted. */
  @state() private outfitLockColors = true;
  @state() private outfitBatchRunning = false;
  @state() private outfitExporting = false;
  @state() private outfitProgress = "";
  private stopOutfitBatch = false;

  // ── outfit studio ───────────────────────────────────────────────────────────
  /** Saved equipment recipes, and which one the board came from. */
  @state() private loadouts: LibbyLoadout[] = [];
  @state() private outfitLoadoutId = "";
  @state() private loadoutBusy = false;
  @state() private loadoutCoverVersion = 0;
  /** Wardrobes reviewed sprites are filed into, and the chosen one. Empty means
      sprites stay in the workspace and leave only through the ZIP. */
  @state() private wardrobes: LibbyOutfit[] = [];
  @state() private outfitWardrobeId = "";
  /** Set once the studio's own lists have been fetched, so entering it does it once. */
  private studioLoaded = false;
  /** Camera and shot composition. Compiled into terms, negatives and a frame size rather
      than appended as text — see camera.ts. */
  @state() private camera: CameraSpec = { ...DEFAULT_CAMERA };

  /** The cut-out being previewed, if any. */
  @state() private cutout: {
    url: string;
    name: string;
    outputName?: string;
    /** Present when the editor is reviewing one generated outfit square. */
    outfitShotId?: string;
  } | null = null;
  @state() private cutoutTolerance = 42;
  @state() private cutoutBusy = false;
  @state() private cutoutError = "";
  @query(".cutout-canvas") private cutoutHost?: HTMLElement;
  /** Held so it can be encoded on demand without redoing the fill. */
  private cutoutCanvas: HTMLCanvasElement | null = null;

  /** The cut-out editing session: the source pixels plus the mask and its history.
      Not reactive — it is mutated in place and nothing renders it directly; the derived
      flags below are what the buttons watch. See cutout.ts. */
  private session: CutoutSession | null = null;
  /** Which pointer action the canvas performs. "remove" samples and deletes a colour;
      the brushes add to or subtract from the mask by hand. */
  @state() private cutoutTool: "remove" | "add" | "subtract" = "remove";
  /** Non-destructive edge settings, re-applied from the mask on every render. */
  @state() private cutoutFeather = DEFAULT_COMPOSE.feather;
  @state() private cutoutSpill = DEFAULT_COMPOSE.spill;
  /** Display magnification only; mask coordinates continue to use source pixels. */
  @state() private cutoutZoom = 1;
  @state() private cutoutContrast = false;
  /** Contiguous keeps a colour removal to the region under the cursor; off removes
      every matching pixel in the image. */
  @state() private contiguous = true;
  @state() private brushSize = 24;
  /** The "before" half of the before/after preview. */
  @state() private showOriginal = false;
  @state() private canUndo = false;
  @state() private canRedo = false;
  /** How much of the image is currently cut, so "nothing happened" and "it took the
      whole picture" are distinguishable without squinting at a checkerboard. */
  @state() private cutFraction = 0;
  /** Mid-drag on a brush. Not reactive — it gates pointer moves, nothing renders it. */
  private painting = false;

  @state() private characters: GenCharacter[] = [];
  @state() private selectedChars: string[] = [];
  @state() private charDraft: CharDraft | null = null;
  @state() private charBusy = false;
  @state() private scanBusy = false;

  // Which sidebar sections are unfolded. Models start open — it's the choice that
  // shapes everything else; the rest unfold on demand.
  @state() private open: Record<string, boolean> = { models: true, settings: true };

  @state() private speech = "";
  @state() private listening = false;
  @state() private optimizing = false;

  @state() private prompt = "";
  @state() private tagSuggestions: string[] = [];
  @state() private tagCorrection = "";
  @state() private negative = "";
  @state() private showOptions = false;

  @state() private width = 512;
  @state() private height = 768;
  @state() private steps = 25;
  @state() private cfg = 7;
  @state() private cfgRescale = 0;
  @state() private clipSkip = 0;
  @state() private seamlessX = false;
  @state() private seamlessY = false;
  @state() private vaePrecision: "fp32" | "fp16" = "fp32";
  @state() private cpuNoise = true;
  @state() private board = "none";
  @state() private scheduler = "";
  @state() private count = 1;
  @state() private seed = -1;
  @state() private detailerEnabled = false;
  @state() private detailerModel = "face_yolov8n.pt";
  @state() private detailerPrompt = "";
  @state() private detailerNegative = "";
  @state() private detailerConfidence = 0.3;
  @state() private detailerDenoise = 0.4;
  @state() private detailerMaskBlur = 4;

  @state() private generating = false;
  @state() private shots: Shot[] = [];
  @state() private activeNodeId: string | null = null;
  private draggingNode: { id: string; pointerId: number; clientX: number; clientY: number; x: number; y: number } | null = null;

  /** Shown once after a draft is restored, so it is clear the form was filled in from
      last time rather than left in a state the user doesn't remember choosing. */
  @state() private restoredNotice = false;
  /** Which shot's generation-data menu is open, if any. */
  @state() private infoFor: string | null = null;

  /** Draft bookkeeping. Not reactive — nothing renders these.
      `draftRestored` gates saving: writing before the restore has run would overwrite
      a good draft with the component's empty initial state. */
  private draftRestored = false;
  private draftTimer: number | undefined;
  /** A restored scroll position, applied after the form has actually rendered — there
      is nothing to scroll before then. */
  private pendingScroll = 0;
  @state() private error = "";
  @state() private toast = "";

  // Bumps thumbnail query strings so a freshly-set preview repaints without a full
  // reload fighting the browser cache.
  @state() private thumbVersion = 0;

  // Thumbnail URLs that 404'd, so their tiles render a proper placeholder instead
  // of a black box. Tracked as state (not by mutating the <img> in its error
  // handler) because Lit reuses DOM nodes across renders — a style hack stuck to
  // one <img> used to bleed onto other cards and survive a successful reload,
  // which is why freshly-set previews appeared to "stay black".
  @state() private failedThumbs = new Set<string>();

  /** A result shot expanded to full size, by preview id. */
  @state() private expandedShot: Shot | null = null;

  /** The model/LoRA record being edited, or null. */
  @state() private metaDraft: GenModelMeta | null = null;
  @state() private metaBusy = false;
  @state() private metaTriggerText = "";

  /** Whether the Civitai browser is on screen. */
  @state() private civitaiOpen = false;

  @query("oppai-invoke-gallery") private galleryPanel?: OppaiInvokeGallery;

  private recognition: SpeechRecognitionLike | null = null;

  static styles = [
    iconStyles,
    motionStyles,
    css`
      :host {
        display: block;
        color: var(--oppai-text);
      }
      .wrap {
        max-width: 1240px;
        margin: 0 auto;
        padding-bottom: 40px;
      }
      /* Camera controls. Two columns in a 300px sidebar: five short selects stacked
         would push everything below them off the screen. */
      .cam-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .cam-wide {
        grid-column: 1 / -1;
      }
      .cam-grid select {
        width: 100%;
        min-width: 0;
      }
      .cam-terms {
        font-size: 12px;
        color: var(--oppai-text-muted);
      }
      .cam-terms summary {
        cursor: pointer;
      }
      .cam-terms-body {
        display: grid;
        gap: 8px;
        margin-top: 8px;
      }
      .cam-terms pre {
        margin: 3px 0 0;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 11px;
        line-height: 1.45;
        white-space: pre-wrap;
        word-break: break-word;
        background: var(--oppai-surface-2);
        border-radius: 8px;
        padding: 6px 8px;
      }
      /* Draft-restored notice. */
      .restored {
        display: flex;
        align-items: center;
        gap: 10px;
        background: var(--oppai-surface-2);
        border-radius: 12px;
        padding: 9px 12px;
        margin: 0 0 16px;
        font-size: 13px;
      }
      .restored .grow {
        flex: 1;
      }
      /* Generation data, under the shot it belongs to. */
      .geninfo {
        margin-top: 8px;
        background: var(--oppai-surface-2);
        border-radius: 12px;
        padding: 10px 12px;
      }
      .geninfo-text {
        margin: 0 0 10px;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 11px;
        line-height: 1.5;
        /* The parameters line is long and its line breaks are load-bearing for other
           readers, so it wraps here rather than scrolling — this is for reading a
           value out of, and the copied text keeps the real shape either way. */
        white-space: pre-wrap;
        word-break: break-word;
        max-height: 220px;
        overflow-y: auto;
        user-select: text;
      }
      .geninfo-note {
        margin: 0;
        font-size: 12px;
        color: var(--oppai-text-muted);
      }
      .geninfo-row {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .layout {
        display: grid;
        grid-template-columns: 300px minmax(0, 1fr) 300px;
        gap: 20px;
        align-items: start;
      }
      @media (max-width: 1220px) {
        .layout {
          grid-template-columns: 300px minmax(0, 1fr);
        }
        /* The gallery drops under the main column rather than vanishing. */
        .layout > .right {
          grid-column: 2;
        }
      }
      @media (max-width: 940px) {
        .layout {
          grid-template-columns: minmax(0, 1fr);
        }
        .layout > .right {
          grid-column: 1;
        }
      }
      .empty {
        text-align: center;
        padding: 70px 20px;
        color: var(--oppai-text-muted);
      }
      .empty .material-symbols-rounded {
        font-size: 44px;
        display: block;
        margin-bottom: 12px;
      }

      /* Sidebar: stacked, collapsible sections. */
      .side {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .sec {
        background: var(--oppai-surface-2);
        border-radius: 14px;
        overflow: hidden;
      }
      .sec-head {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 8px;
        border: none;
        background: none;
        color: var(--oppai-text);
        font: inherit;
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 0.3px;
        padding: 12px 14px;
        cursor: pointer;
        text-align: left;
      }
      .sec-head .count {
        margin-left: auto;
        font-weight: 400;
        font-size: 12px;
        color: var(--oppai-text-muted);
      }
      .sec-body {
        padding: 0 12px 12px;
      }
      /* The chevron rotates rather than being swapped for a different glyph: swapping
         the icon replaces the element, which restarts the font's own paint and reads as
         a flicker at the exact moment the section is moving. */
      .sec-chevron {
        transition: transform 0.22s var(--oppai-ease-emphasized);
      }
      .sec-chevron.open {
        transform: rotate(90deg);
      }
      .sec-note {
        font-size: 12px;
        color: var(--oppai-text-muted);
        padding: 0 2px 4px;
      }
      /* A quiet text-button used for reveal toggles (e.g. showing built-in presets). */
      .link-toggle {
        align-self: flex-start;
        margin-top: 6px;
        border: none;
        background: none;
        padding: 2px;
        font: inherit;
        font-size: 12px;
        color: var(--oppai-primary-bright);
        cursor: pointer;
      }
      .link-toggle:hover {
        text-decoration: underline;
      }

      /* Picker cards (models, LoRAs, characters) — a 2-up grid in the sidebar. */
      .cards {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }
      .card-wrap {
        position: relative;
        min-width: 0;
        max-width: 100%;
      }
      .card {
        width: 100%;
        border: 2px solid transparent;
        border-radius: 12px;
        overflow: hidden;
        background: var(--oppai-surface);
        cursor: pointer;
        padding: 0;
        text-align: left;
        transition: transform 0.18s var(--oppai-ease-spring), border-color 0.18s ease;
        min-width: 0;
        max-width: 100%;
        color: var(--oppai-text);
      }
      .card:hover {
        transform: translateY(-2px);
      }
      .card.on {
        border-color: var(--oppai-accent);
      }
      .card-art {
        width: 100%;
        aspect-ratio: 3 / 4;
        object-fit: cover;
        display: block;
        background: var(--oppai-surface-3, var(--oppai-surface-2));
      }
      .card-blank {
        width: 100%;
        aspect-ratio: 3 / 4;
        display: grid;
        place-items: center;
        color: var(--oppai-text-muted);
        background: var(--oppai-surface-3, var(--oppai-surface-2));
      }
      .card-name {
        font-size: 11px;
        padding: 6px 8px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .card-edit {
        position: absolute;
        top: 4px;
        right: 4px;
        width: 26px;
        height: 26px;
        border-radius: 13px;
        border: none;
        background: rgba(0, 0, 0, 0.55);
        color: #fff;
        display: grid;
        place-items: center;
        cursor: pointer;
      }
      .card-edit.left {
        right: auto;
        left: 4px;
      }
      .lora-weight {
        width: 100%;
        box-sizing: border-box;
        margin-top: 5px;
        padding: 5px 7px;
        border: 1px solid var(--oppai-border-strong);
        border-radius: 8px;
        background: var(--oppai-surface);
        color: var(--oppai-text);
      }
      .pager {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-top: 10px;
        font-size: 12px;
        color: var(--oppai-text-muted);
      }
      .pager button {
        border: 1px solid var(--oppai-border-strong);
        border-radius: 8px;
        background: var(--oppai-surface);
        color: var(--oppai-text);
        padding: 6px 9px;
        cursor: pointer;
      }
      .pager button:disabled { opacity: 0.4; cursor: default; }
      .switch-row {
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 34px;
        font-size: 12px;
        color: var(--oppai-text-dim);
      }

      /* Compact settings rows in the sidebar. */
      .settings {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
      }
      .settings .full {
        grid-column: 1 / -1;
      }
      label.field {
        font-size: 12px;
        font-weight: 600;
        color: var(--oppai-text-dim);
        display: block;
        margin-bottom: 6px;
      }
      .num,
      select.num {
        width: 100%;
        box-sizing: border-box;
        background: var(--oppai-surface);
        border: 1px solid var(--oppai-border-strong);
        border-radius: 10px;
        color: var(--oppai-text);
        font: inherit;
        font-size: 13px;
        padding: 8px 10px;
        outline: none;
      }

      /* Template / VAE rows. */
      .rows {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .row-pick {
        border: 1px solid var(--oppai-border-strong);
        background: var(--oppai-surface);
        color: var(--oppai-text);
        border-radius: 10px;
        font: inherit;
        font-size: 13px;
        text-align: left;
        padding: 8px 10px;
        cursor: pointer;
      }
      .row-pick.on {
        border-color: var(--oppai-accent);
        background: var(--oppai-accent);
        color: var(--oppai-on-accent);
      }
      .row-sub {
        display: block;
        font-size: 11px;
        opacity: 0.75;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .side-add {
        margin-top: 10px;
        width: 100%;
        height: 36px;
        border: 1px dashed var(--oppai-border-strong);
        border-radius: 10px;
        background: none;
        color: var(--oppai-text-dim);
        font: inherit;
        font-size: 13px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }

      /* Prompt block. */
      .prompt-card {
        background: var(--oppai-surface-2);
        border-radius: 18px;
        padding: 14px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .speech-row {
        display: flex;
        gap: 10px;
        align-items: center;
      }
      .mic {
        flex: 0 0 auto;
        width: 46px;
        height: 46px;
        border-radius: 23px;
        border: none;
        cursor: pointer;
        background: var(--oppai-primary);
        color: var(--oppai-on-primary);
        display: grid;
        place-items: center;
        transition: transform 0.15s var(--oppai-ease-spring), filter 0.15s ease;
      }
      .mic.live {
        background: var(--oppai-error, #f2b8b5);
        color: #000;
        animation: oppai-pulse 1.1s ease-in-out infinite;
      }
      @keyframes oppai-pulse {
        0%, 100% { filter: brightness(1); }
        50% { filter: brightness(1.35); }
      }
      .speech-hint {
        font-size: 13px;
        color: var(--oppai-text-muted);
        flex: 1;
      }
      textarea {
        width: 100%;
        box-sizing: border-box;
        background: var(--oppai-surface);
        border: 1px solid var(--oppai-border-strong);
        border-radius: 12px;
        color: var(--oppai-text);
        font: inherit;
        font-size: 14px;
        padding: 10px 12px;
        resize: vertical;
        min-height: 64px;
        outline: none;
      }
      textarea:focus {
        border-color: var(--oppai-primary);
      }
      .adv-toggle {
        background: none;
        border: none;
        color: var(--oppai-primary-bright);
        font: inherit;
        font-size: 13px;
        cursor: pointer;
        padding: 0;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .chips {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .chip {
        min-height: 34px;
        padding: 4px 14px;
        border-radius: 17px;
        font-size: 13px;
        font-family: inherit;
        cursor: pointer;
        background: transparent;
        color: var(--oppai-text-dim);
        border: 1px solid var(--oppai-border-strong);
        text-align: center;
      }
      .chip.on {
        background: var(--oppai-accent);
        color: var(--oppai-on-accent);
        border-color: var(--oppai-accent);
      }
      .chip .hint {
        display: block;
        font-size: 10px;
        opacity: 0.75;
      }
      .custom-size {
        display: flex;
        gap: 10px;
        align-items: center;
      }
      .custom-size .num {
        width: 90px;
      }
      .generate {
        margin-top: 16px;
        height: 50px;
        width: 100%;
        border: none;
        border-radius: 25px;
        background: var(--oppai-primary);
        color: var(--oppai-on-primary);
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }
      .generate:disabled {
        opacity: 0.6;
        cursor: default;
      }

      /* Results. */
      .results {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 16px;
        margin-top: 14px;
      }
      .shot {
        border-radius: 16px;
        overflow: hidden;
        background: var(--oppai-surface-2);
        position: relative;
      }
      .shot img {
        width: 100%;
        display: block;
        aspect-ratio: 3 / 4;
        object-fit: cover;
        background: #000;
      }
      .shot-actions {
        display: flex;
        gap: 6px;
        padding: 8px;
      }
      .act {
        flex: 1;
        height: 36px;
        border: none;
        border-radius: 10px;
        background: var(--oppai-surface-3, var(--oppai-surface));
        color: var(--oppai-text);
        font: inherit;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
      }
      .act.primary {
        background: var(--oppai-primary);
        color: var(--oppai-on-primary);
      }
      .act:disabled {
        opacity: 0.55;
        cursor: default;
      }
      .banner {
        background: var(--oppai-surface-2);
        border: 1px solid var(--oppai-border-strong);
        border-radius: 12px;
        padding: 12px 14px;
        font-size: 13px;
        color: var(--oppai-text-dim);
        margin-top: 12px;
      }
      .section-label {
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.4px;
        text-transform: uppercase;
        color: var(--oppai-text-muted);
        margin: 22px 0 10px;
      }
      .toast {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--oppai-surface-2);
        color: var(--oppai-text);
        padding: 12px 20px;
        border-radius: 12px;
        z-index: 60;
        box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
        animation: oppai-fade-in-up 0.28s var(--oppai-ease-emphasized) both;
      }
      .hidden-file {
        display: none;
      }

      /* Character editor dialog. */
      .overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.55);
        display: grid;
        place-items: center;
        z-index: 50;
        padding: 20px;
      }
      .dialog {
        background: var(--oppai-surface-2);
        border-radius: 18px;
        padding: 18px;
        width: min(440px, 100%);
        max-height: 90vh;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .dialog h3 {
        margin: 0;
        font-size: 16px;
      }
      .dialog input[type="text"] {
        width: 100%;
        box-sizing: border-box;
        background: var(--oppai-surface);
        border: 1px solid var(--oppai-border-strong);
        border-radius: 10px;
        color: var(--oppai-text);
        font: inherit;
        font-size: 14px;
        padding: 9px 11px;
        outline: none;
      }
      .dialog-thumb {
        display: flex;
        gap: 12px;
        align-items: center;
      }
      .dialog-thumb img {
        width: 72px;
        height: 96px;
        object-fit: cover;
        border-radius: 10px;
        background: var(--oppai-surface);
      }
      .dialog-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }
      .dialog-actions .danger {
        margin-right: auto;
        color: var(--oppai-error, #f2b8b5);
      }
      /* Outfit helper: plain checkbox rows, wide enough to hit on a phone. */
      .switch {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: var(--oppai-text-dim);
        cursor: pointer;
      }
      .switch input {
        accent-color: var(--oppai-primary);
        width: 16px;
        height: 16px;
      }
      /* ── The equipment loadout ─────────────────────────────────────────────
         Ten slots, built from the same materials as every other panel in the
         app: its surfaces, its radii, its accent for the equipped state.

         It used to be drawn as a 16-bit console menu — fixed palette, monospace
         type, square bevels, a paper doll between two columns of cells. That
         cannot survive a sidebar. The three-column grid needed ~280px before
         padding, so it overflowed the panel it lives in, and the borrowed
         palette made the one part of the studio you actually type into look
         like a different program embedded in the page.

         So each slot is one row instead: icon, name, then colour and garment
         side by side. Colour leads because that is the order the prompt is
         built in, and it is narrower because it is a modifier on the garment
         beside it. Ten rows stack in any sidebar width without a media query. */
      .loadout-board {
        margin-top: 4px;
        padding: 10px;
        border: 1px solid var(--oppai-border);
        border-radius: 12px;
        background: var(--oppai-surface);
      }
      .loadout-heading {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 9px;
        color: var(--oppai-text-dim);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.7px;
        text-transform: uppercase;
      }
      .loadout-heading .equipped-count {
        margin-left: auto;
        color: var(--oppai-text-muted);
        font-weight: 600;
        letter-spacing: 0.3px;
        font-variant-numeric: tabular-nums;
      }
      .loadout-clear {
        border: 1px solid var(--oppai-border-strong);
        border-radius: 999px;
        padding: 3px 10px;
        background: transparent;
        color: var(--oppai-text-dim);
        font: inherit;
        font-size: 11px;
        letter-spacing: 0.2px;
        text-transform: none;
        cursor: pointer;
      }
      .loadout-clear:hover:not(:disabled) {
        border-color: var(--oppai-primary);
        color: var(--oppai-primary-bright);
      }
      .loadout-clear:disabled { opacity: 0.45; cursor: default; }
      .loadout-slots { display: grid; gap: 6px; }
      /* One equipped piece. The whole row tints when it holds something, which is
         the single fact worth reading at a glance down ten of them. */
      .gear-slot {
        display: grid;
        grid-template-columns: 28px minmax(0, 1fr);
        gap: 3px 8px;
        min-width: 0;
        padding: 6px 8px;
        border: 1px solid var(--oppai-border);
        border-radius: 10px;
        background: var(--oppai-surface-2);
        transition: border-color 0.14s, background 0.14s;
      }
      .gear-slot.filled {
        border-color: color-mix(in srgb, var(--oppai-primary) 55%, transparent);
        background: color-mix(in srgb, var(--oppai-primary-container) 30%, var(--oppai-surface-2));
      }
      .gear-slot-icon {
        grid-row: 1 / 3;
        align-self: center;
        display: grid;
        place-items: center;
        width: 28px;
        height: 28px;
        border-radius: 8px;
        background: var(--oppai-surface);
        color: var(--oppai-text-muted);
        font-size: 17px;
      }
      .gear-slot.filled .gear-slot-icon {
        background: color-mix(in srgb, var(--oppai-primary) 22%, transparent);
        color: var(--oppai-primary-bright);
      }
      .gear-slot-name {
        overflow: hidden;
        color: var(--oppai-text-muted);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.6px;
        line-height: 1.2;
        text-overflow: ellipsis;
        text-transform: uppercase;
        white-space: nowrap;
      }
      .gear-slot.filled .gear-slot-name { color: var(--oppai-text-dim); }
      /* Colour is the narrower of the two fields for the same reason it comes
         first: it modifies the garment named beside it. */
      .gear-slot-fields {
        display: grid;
        grid-template-columns: minmax(0, 0.68fr) minmax(0, 1fr);
        gap: 6px;
        min-width: 0;
      }
      .gear-slot input {
        min-width: 0;
        width: 100%;
        box-sizing: border-box;
        border: 1px solid var(--oppai-border);
        border-radius: 8px;
        outline: 0;
        background: var(--oppai-surface);
        color: var(--oppai-text);
        font: inherit;
        font-size: 12px;
        padding: 5px 7px;
      }
      .gear-color { color: var(--oppai-primary-bright); }
      .gear-slot input::placeholder { color: var(--oppai-text-muted); }
      .gear-slot input:focus { border-color: var(--oppai-primary); }
      .gear-slot input:disabled { opacity: 0.5; }
      /* Saved recipes, as a picture grid. Text cannot tell ten garment descriptions
         apart at a glance; a thumbnail of the outfit can, which is the entire reason
         a loadout carries one. */
      .loadout-cards {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
        gap: 8px;
        margin: 8px 0;
      }
      .loadout-card {
        position: relative;
        border: 1px solid var(--oppai-border-strong);
        border-radius: 10px;
        background: var(--oppai-surface);
        overflow: hidden;
      }
      .loadout-card.on { border-color: var(--oppai-primary); }
      .loadout-card .card-hit {
        display: block;
        width: 100%;
        padding: 0 0 6px;
        border: 0;
        background: none;
        color: inherit;
        font: inherit;
        text-align: left;
        cursor: pointer;
      }
      .loadout-card .card-hit:disabled { cursor: default; opacity: 0.6; }
      .loadout-card .cover {
        display: block;
        width: 100%;
        aspect-ratio: 3 / 4;
        object-fit: cover;
        object-position: top center;
        background: var(--oppai-surface-2);
      }
      .loadout-card .cover-empty {
        display: grid;
        place-items: center;
        font-size: 30px;
        color: var(--oppai-text-muted);
      }
      .loadout-card .card-name {
        display: block;
        padding: 6px 8px 0;
        font-size: 11px;
        line-height: 1.25;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .loadout-card .worn-badge {
        position: absolute;
        top: 5px;
        left: 5px;
        padding: 2px 6px;
        border-radius: 6px;
        background: var(--oppai-primary);
        color: var(--oppai-on-primary);
        font-size: 9px;
        font-weight: 700;
      }
      .loadout-card .card-del {
        position: absolute;
        top: 4px;
        right: 4px;
        display: grid;
        place-items: center;
        padding: 3px;
        border: 0;
        border-radius: 6px;
        background: color-mix(in srgb, var(--oppai-surface) 78%, transparent);
        color: var(--oppai-text-muted);
        cursor: pointer;
        opacity: 0;
      }
      .loadout-card:hover .card-del,
      .loadout-card:focus-within .card-del { opacity: 1; }
      .loadout-card .card-del:hover { color: var(--oppai-error, #f2b8b5); }
      .exposure-note {
        margin-top: 8px;
        padding: 8px 9px;
        border-left: 3px solid #bd67ee;
        background: color-mix(in srgb, var(--oppai-surface) 84%, #6c267c);
        color: var(--oppai-text-dim);
        font-size: 11px;
        line-height: 1.35;
      }
      .outfit-actions { display: grid; gap: 7px; margin-top: 8px; }
      .outfit-actions .side-add { margin-top: 0; }
      .outfit-actions .primary {
        border-style: solid;
        border-color: var(--oppai-primary);
        background: var(--oppai-primary);
        color: var(--oppai-on-primary);
      }
      .outfit-actions button:disabled { opacity: 0.5; cursor: default; }
      .cutout-dialog {
        width: min(980px, 100%);
        max-height: 96vh;
      }
      /* The checkerboard is the point: transparency has to be visible to be judged. */
      .cutout-canvas {
        display: grid;
        place-items: center;
        min-height: min(560px, 60vh);
        max-height: 68vh;
        overflow: auto;
        border-radius: 12px;
        background-color: #6b6b6b;
        background-image:
          linear-gradient(45deg, #4a4a4a 25%, transparent 25%, transparent 75%, #4a4a4a 75%),
          linear-gradient(45deg, #4a4a4a 25%, transparent 25%, transparent 75%, #4a4a4a 75%);
        background-size: 20px 20px;
        background-position: 0 0, 10px 10px;
      }
      .cutout-canvas.contrast {
        background-color: #ff00d4;
        background-image: none;
      }
      .cutout-canvas canvas {
        max-width: none;
        max-height: none;
        object-fit: contain;
      }
      .cut-zoom {
        display: grid;
        grid-template-columns: auto minmax(100px, 1fr) auto;
        gap: 8px;
        align-items: center;
        width: 100%;
      }
      .cut-zoom output {
        min-width: 44px;
        text-align: right;
        color: var(--oppai-text-muted);
        font-size: 12px;
        font-variant-numeric: tabular-nums;
      }
      .cutout-dialog input[type="range"] {
        width: 100%;
        accent-color: var(--oppai-primary);
      }
      /* The cursor is the only affordance saying what a click will do, so it changes
         with the tool: an eyedropper for sampling a colour, a crosshair for painting. */
      .cutout-canvas.picking canvas {
        cursor: crosshair;
      }
      .cutout-canvas.brushing canvas {
        cursor: cell;
      }
      /* While the "before" is held, the canvas is read-only — showing it as such stops
         a click from feeling ignored. */
      .cutout-canvas.before canvas {
        cursor: not-allowed;
        outline: 2px solid var(--oppai-primary-bright);
        outline-offset: -2px;
      }
      /* Painting drags across the canvas; without this the browser starts a text or
         image selection instead and the stroke breaks up. */
      .cutout-canvas canvas {
        touch-action: none;
        user-select: none;
        -webkit-user-drag: none;
      }
      .cut-row {
        display: flex;
        gap: 8px;
        align-items: center;
        flex-wrap: wrap;
      }
      .cut-stat {
        flex: 1;
        font-size: 12px;
        color: var(--oppai-text-muted);
        font-variant-numeric: tabular-nums;
      }
      .cut-check {
        display: flex;
        gap: 8px;
        align-items: flex-start;
        font-size: 13px;
      }
      .cut-check input {
        margin-top: 2px;
        accent-color: var(--oppai-primary);
        flex-shrink: 0;
      }
      .cut-hint {
        font-size: 12px;
        color: var(--oppai-text-muted);
        line-height: 1.45;
      }
      .btn {
        border: none;
        border-radius: 10px;
        background: var(--oppai-surface-3, var(--oppai-surface));
        color: var(--oppai-text);
        font: inherit;
        font-size: 13px;
        font-weight: 600;
        padding: 9px 14px;
        cursor: pointer;
      }
      .btn.primary {
        background: var(--oppai-primary);
        color: var(--oppai-on-primary);
      }
      .btn:disabled {
        opacity: 0.55;
        cursor: default;
      }

      /* ── The outfit contact sheet ──────────────────────────────────────────
         Sixty squares are a set, not sixty independent pictures, so the studio
         lays them out as the wardrobe grid they will become: one row per heat
         tier, expressions in the same order everywhere else uses them, and a
         cell for every slot whether or not it has art yet.

         The free-floating draggable nodes the Create screen uses are right for
         a handful of variations and wrong for this — twelve columns of them
         had to be dragged into place by hand to be compared at all, and the
         gaps in a set are exactly what you need to see. Here an empty cell is
         a real cell: it says which square is missing and clicking it aims the
         generator at that slot. */
      .outfit-sheet { display: grid; gap: 12px; }
      .sheet-tier {
        border: 1px solid var(--oppai-border);
        border-radius: 14px;
        background: var(--oppai-surface);
        overflow: hidden;
      }
      .sheet-tier-head {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-bottom: 1px solid var(--oppai-border);
        color: var(--oppai-text-dim);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.7px;
        text-transform: uppercase;
      }
      .sheet-tier-head .tier-count {
        margin-left: auto;
        color: var(--oppai-text-muted);
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        letter-spacing: 0.2px;
        text-transform: none;
      }
      .sheet-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(118px, 1fr));
        gap: 10px;
        padding: 12px;
      }
      .sheet-cell {
        position: relative;
        display: flex;
        flex-direction: column;
        border: 1px solid var(--oppai-border);
        border-radius: 10px;
        background: var(--oppai-surface-2);
        overflow: hidden;
      }
      .sheet-cell.current {
        border-color: var(--oppai-primary);
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--oppai-primary) 28%, transparent);
      }
      .sheet-hit {
        display: block;
        width: 100%;
        padding: 0;
        border: 0;
        background: none;
        color: inherit;
        font: inherit;
        text-align: left;
        cursor: pointer;
      }
      /* Reviewed squares are transparent PNGs. A checkerboard behind them is the
         only way the cut edge is visible at thumbnail size. */
      .sheet-cell .art {
        display: block;
        width: 100%;
        aspect-ratio: 3 / 4;
        object-fit: contain;
        background-color: #6b6b6b;
        background-image:
          linear-gradient(45deg, #565656 25%, transparent 25%, transparent 75%, #565656 75%),
          linear-gradient(45deg, #565656 25%, transparent 25%, transparent 75%, #565656 75%);
        background-size: 14px 14px;
        background-position: 0 0, 7px 7px;
      }
      .sheet-cell .art-empty {
        display: grid;
        place-items: center;
        aspect-ratio: 3 / 4;
        border-radius: 9px;
        border: 1px dashed var(--oppai-border-strong);
        margin: 4px;
        color: var(--oppai-text-muted);
        font-size: 11px;
      }
      .sheet-cell .cell-label {
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 6px 8px;
        border-top: 1px solid var(--oppai-border);
        color: var(--oppai-text-dim);
        font-size: 11px;
      }
      .sheet-cell .cell-label span:first-child {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      /* Two states worth distinguishing, and only two: a square that still needs
         its cutout looked at, and one that is finished. */
      .cell-state {
        flex: 0 0 auto;
        margin-left: auto;
        width: 8px;
        height: 8px;
        border-radius: 50%;
      }
      .cell-state.needs { background: #f5c469; }
      .cell-state.ready { background: #6ef7a5; }
      .sheet-actions {
        position: absolute;
        top: 5px;
        right: 5px;
        display: flex;
        gap: 4px;
        opacity: 0;
        transition: opacity 0.12s;
      }
      .sheet-cell:hover .sheet-actions,
      .sheet-cell:focus-within .sheet-actions { opacity: 1; }
      .sheet-act {
        display: grid;
        place-items: center;
        padding: 4px;
        border: 0;
        border-radius: 7px;
        background: rgba(0, 0, 0, 0.62);
        color: #fff;
        cursor: pointer;
      }
      .sheet-act:hover { background: rgba(0, 0, 0, 0.85); }
      .sheet-act.danger:hover { color: var(--oppai-error, #f2b8b5); }
      /* The sheet scrolls as a document; the blueprint grid belongs to the free
         canvas it replaces. */
      .canvas-stage.sheet {
        display: block;
        padding: 14px;
        background-image: none;
      }

      /* Result lightbox. */
      .lightbox {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.85);
        z-index: 60;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 14px;
        padding: 20px;
      }
      .lightbox img {
        max-width: min(96vw, 1400px);
        max-height: 82vh;
        object-fit: contain;
        border-radius: 10px;
      }
      .lightbox .row {
        display: flex;
        gap: 10px;
      }

      /* Model/LoRA edit dialog fields. */
      .meta-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      .meta-grid .full {
        grid-column: 1 / -1;
      }
      .topline {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 14px;
      }
      .topline .spacer {
        flex: 1;
      }
      .ghost {
        border: 1px solid var(--oppai-border-strong);
        background: transparent;
        color: var(--oppai-text-dim);
        border-radius: 12px;
        font: inherit;
        font-size: 13px;
        padding: 8px 14px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }

      /* Invoke-style generation workspace. OppaiLib still owns the palette, type and
         controls; this only adopts the productive three-pane studio geometry. */
      .wrap {
        width: 100%;
        max-width: none;
        height: 100%;
        min-height: 0;
        margin: 0;
        padding: 0;
        overflow: hidden;
      }
      :host {
        height: 100%;
        min-height: 0;
        overflow: hidden;
      }
      .workspace {
        height: 100%;
        min-height: 0;
        display: flex;
        flex-direction: column;
        background: var(--oppai-bg);
      }
      .workspace-bar {
        height: 48px;
        flex: 0 0 48px;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 0 12px;
        box-sizing: border-box;
        background: var(--oppai-surface-2);
        border-bottom: 1px solid var(--oppai-border-strong);
      }
      .workspace-tab {
        align-self: stretch;
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 0 8px;
        border-bottom: 2px solid var(--oppai-primary);
        color: var(--oppai-text);
        font-size: 13px;
        font-weight: 700;
      }
      .workspace-context {
        margin-left: auto;
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .backend-pill,
      .model-pill {
        min-width: 0;
        height: 30px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 0 10px;
        border: 1px solid var(--oppai-border-strong);
        border-radius: 8px;
        color: var(--oppai-text-dim);
        font-size: 11px;
        white-space: nowrap;
      }
      .model-pill {
        max-width: 280px;
      }
      .model-pill span:last-child {
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .status-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--oppai-primary);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--oppai-primary) 18%, transparent);
      }
      .workspace-bar .ghost {
        height: 32px;
        padding: 0 10px;
        border-radius: 8px;
        font-size: 12px;
      }
      .layout {
        flex: 1;
        min-height: 0;
        display: grid;
        grid-template-columns: 296px minmax(420px, 1fr) 316px;
        gap: 0;
        align-items: stretch;
      }
      .layout.no-gallery {
        grid-template-columns: 296px minmax(420px, 1fr);
      }
      /* The studio's panels carry more than the Create screen's: ten equipment rows
         with two fields each on the left, and a gallery being picked over on the
         right. Both get room here rather than being asked to wrap inside 296px. */
      .layout.studio { grid-template-columns: 368px minmax(380px, 1fr) 360px; }
      .layout.studio.no-gallery { grid-template-columns: 368px minmax(380px, 1fr); }
      .side,
      .right {
        min-width: 0;
        min-height: 0;
        background: var(--oppai-surface-2);
      }
      .side {
        display: flex;
        flex-direction: column;
        gap: 0;
        border-right: 1px solid var(--oppai-border-strong);
      }
      .right {
        grid-column: auto;
        border-left: 1px solid var(--oppai-border-strong);
        overflow: hidden;
      }
      .panel-heading {
        height: 42px;
        flex: 0 0 42px;
        box-sizing: border-box;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 0 12px;
        border-bottom: 1px solid var(--oppai-border);
        color: var(--oppai-text-dim);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.7px;
        text-transform: uppercase;
      }
      .panel-scroll {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        overscroll-behavior: contain;
        scrollbar-width: thin;
      }
      .sec {
        border-radius: 0;
        background: transparent;
        border-bottom: 1px solid var(--oppai-border);
      }
      .sec-head {
        min-height: 42px;
        padding: 9px 12px;
      }
      .sec-body {
        padding: 0 12px 14px;
      }
      .sec-models .cards {
        grid-template-columns: 1fr;
        gap: 7px;
      }
      .sec-models .card {
        display: grid;
        grid-template-columns: 52px minmax(0, 1fr);
        align-items: center;
        border-width: 1px;
        border-color: var(--oppai-border);
        border-radius: 9px;
      }
      .sec-models .card-art,
      .sec-models .card-blank {
        width: 52px;
        height: 52px;
        aspect-ratio: 1;
      }
      .sec-models .card-name {
        padding: 7px 9px;
        font-size: 12px;
      }
      .sec-models .card:hover {
        transform: none;
        border-color: var(--oppai-border-strong);
      }
      .sec-models .card.on {
        border-color: var(--oppai-primary);
        background: color-mix(in srgb, var(--oppai-primary-container) 48%, var(--oppai-surface));
      }
      .workbench {
        min-width: 0;
        min-height: 0;
        display: flex;
        flex-direction: column;
        background: color-mix(in srgb, var(--oppai-bg) 82%, #000);
      }
      .canvas-toolbar {
        height: 42px;
        flex: 0 0 42px;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 0 12px;
        box-sizing: border-box;
        border-bottom: 1px solid var(--oppai-border);
        background: var(--oppai-surface);
        color: var(--oppai-text-muted);
        font-size: 11px;
        font-variant-numeric: tabular-nums;
      }
      .canvas-toolbar .canvas-name {
        color: var(--oppai-text);
        font-weight: 700;
      }
      .toolbar-spacer { flex: 1; }
      .toolbar-stat {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        white-space: nowrap;
      }
      .toolbar-clear {
        border: 0;
        background: transparent;
        color: var(--oppai-text-muted);
        font: inherit;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        cursor: pointer;
        padding: 5px 7px;
        border-radius: 7px;
      }
      .toolbar-clear:hover { background: var(--oppai-surface-2); color: var(--oppai-text); }
      .canvas-stage {
        position: relative;
        flex: 1;
        min-height: 260px;
        overflow: auto;
        display: grid;
        place-items: start;
        padding: 22px;
        box-sizing: border-box;
        background-image:
          linear-gradient(color-mix(in srgb, var(--oppai-border) 34%, transparent) 1px, transparent 1px),
          linear-gradient(90deg, color-mix(in srgb, var(--oppai-border) 34%, transparent) 1px, transparent 1px);
        background-size: 24px 24px;
      }
      .canvas-empty {
        width: min(420px, 88%);
        min-height: 260px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        border: 1px dashed var(--oppai-border-strong);
        border-radius: 14px;
        background: color-mix(in srgb, var(--oppai-surface) 78%, transparent);
        color: var(--oppai-text-muted);
        text-align: center;
        padding: 28px;
        box-sizing: border-box;
        place-self: center;
      }
      .canvas-empty .material-symbols-rounded { font-size: 38px; }
      .canvas-empty strong { color: var(--oppai-text-dim); font-size: 14px; }
      .canvas-empty span:last-child { max-width: 300px; font-size: 12px; line-height: 1.5; }
      .generating-overlay {
        position: absolute;
        inset: 0;
        z-index: 3;
        display: grid;
        place-items: center;
        background: color-mix(in srgb, var(--oppai-bg) 58%, transparent);
        backdrop-filter: blur(2px);
      }
      .generating-card {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 16px;
        border: 1px solid var(--oppai-border-strong);
        border-radius: 10px;
        background: var(--oppai-surface-2);
        box-shadow: 0 10px 30px rgba(0,0,0,.3);
        font-size: 13px;
        font-weight: 600;
      }
      .prompt-dock {
        flex: 0 0 auto;
        padding: 10px 12px 12px;
        background: var(--oppai-surface-2);
        border-top: 1px solid var(--oppai-border-strong);
      }
      .prompt-card {
        border: 1px solid var(--oppai-border-strong);
        border-radius: 12px;
        background: var(--oppai-surface);
        padding: 10px;
        gap: 9px;
        box-shadow: 0 5px 18px rgba(0,0,0,.16);
      }
      .prompt-head {
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 24px;
      }
      .prompt-title {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: .65px;
        text-transform: uppercase;
        color: var(--oppai-text-dim);
      }
      .prompt-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.45fr) minmax(180px, .75fr);
        gap: 8px;
      }
      .prompt-field {
        position: relative;
      }
      .prompt-field textarea {
        min-height: 76px;
        max-height: 180px;
        resize: vertical;
        border-radius: 8px;
        padding-top: 25px;
        font-size: 13px;
      }
      .field-tag {
        position: absolute;
        z-index: 1;
        top: 7px;
        left: 10px;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: .55px;
        text-transform: uppercase;
        color: var(--oppai-text-muted);
        pointer-events: none;
      }
      .field-tag.negative { color: var(--oppai-error, #f2b8b5); }
      .prompt-footer {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .prompt-summary {
        color: var(--oppai-text-muted);
        font-size: 11px;
        white-space: nowrap;
      }
      .prompt-footer .generate {
        width: auto;
        min-width: 142px;
        height: 40px;
        margin: 0 0 0 auto;
        padding: 0 18px;
        border-radius: 9px;
        font-size: 13px;
      }
      .speech-row { min-height: 24px; gap: 7px; }
      .speech-hint { font-size: 11px; }
      .mic {
        width: 30px;
        height: 30px;
        border-radius: 8px;
        background: var(--oppai-surface-3, var(--oppai-surface-2));
        color: var(--oppai-text-dim);
      }
      .mic .material-symbols-rounded { font-size: 18px; }
      .prompt-options {
        max-height: 220px;
        overflow-y: auto;
        padding: 9px;
        border: 1px solid var(--oppai-border);
        border-radius: 8px;
        background: var(--oppai-surface-2);
      }
      .results {
        width: 100%;
        min-width: 100%;
        min-height: 100%;
        position: relative;
        margin: 0;
      }
      .shot {
        position: absolute;
        width: min(260px, calc(100vw - 56px));
        border: 1px solid var(--oppai-border-strong);
        border-radius: 10px;
        box-shadow: 0 12px 38px rgba(0,0,0,.32);
      }
      .shot.active { z-index: 2; box-shadow: 0 18px 48px rgba(0,0,0,.46); }
      .node-handle {
        height: 30px;
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 0 9px;
        border-bottom: 1px solid var(--oppai-border);
        background: var(--oppai-surface-3, var(--oppai-surface-2));
        color: var(--oppai-text-muted);
        font-size: 11px;
        cursor: grab;
        touch-action: none;
        user-select: none;
      }
      .node-handle:active { cursor: grabbing; }
      .node-handle .node-title {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .shot img {
        width: 100%;
        height: auto;
        max-height: 360px;
        min-height: 140px;
        margin: 0 auto;
        aspect-ratio: auto;
        object-fit: contain;
      }
      .shot-actions {
        justify-content: center;
        flex-wrap: wrap;
        border-top: 1px solid var(--oppai-border);
        background: var(--oppai-surface-2);
      }
      .shot-slot {
        padding: 8px 10px 0;
        color: var(--oppai-text-dim);
        font-size: 12px;
        font-weight: 600;
      }
      .shot-actions .act { flex: 0 1 auto; min-width: 36px; }
      .canvas-stage > .banner {
        position: absolute;
        top: 10px;
        left: 50%;
        z-index: 4;
        transform: translateX(-50%);
        margin: 0;
        max-width: min(560px, 90%);
        background: var(--oppai-surface-2);
      }
      .restored {
        position: absolute;
        top: 56px;
        left: 50%;
        z-index: 8;
        width: min(520px, calc(100% - 24px));
        transform: translateX(-50%);
        box-sizing: border-box;
        margin: 0;
        border: 1px solid var(--oppai-border-strong);
        box-shadow: 0 10px 30px rgba(0,0,0,.35);
      }
      @media (max-width: 1240px) {
        .layout { grid-template-columns: 270px minmax(380px, 1fr) 270px; }
        .layout.no-gallery { grid-template-columns: 270px minmax(380px, 1fr); }
        /* Still wider than the Create screen's, but the workbench keeps a usable
           middle: the equipment rows tolerate 330px, a 20-square grid does not
           tolerate 300. */
        .layout.studio { grid-template-columns: 330px minmax(340px, 1fr) 300px; }
        .layout.studio.no-gallery { grid-template-columns: 330px minmax(340px, 1fr); }
        .model-pill { display: none; }
      }
      @media (max-width: 1020px) {
        .wrap { overflow-y: auto; }
        .workspace { height: auto; min-height: 100%; }
        .layout,
        .layout.no-gallery,
        .layout.studio,
        .layout.studio.no-gallery {
          min-height: 0;
          grid-template-columns: 280px minmax(0, 1fr);
        }
        .side { min-height: 720px; }
        .workbench { min-height: 720px; }
        .right {
          grid-column: 1 / -1;
          min-height: 420px;
          border-left: 0;
          border-top: 1px solid var(--oppai-border-strong);
        }
      }
      @media (max-width: 700px) {
        .workspace-bar { padding: 0 8px; }
        .backend-pill { display: none; }
        .workspace-bar .ghost span:last-child { display: none; }
        .layout,
        .layout.no-gallery,
        .layout.studio,
        .layout.studio.no-gallery { display: flex; flex-direction: column; }
        .side,
        .workbench,
        .right { min-height: 0; border: 0; }
        .side { max-height: 52vh; border-bottom: 1px solid var(--oppai-border-strong); }
        .panel-scroll { max-height: calc(52vh - 42px); }
        .workbench { min-height: 700px; }
        .canvas-stage { min-height: 310px; padding: 12px; }
        .prompt-grid { grid-template-columns: 1fr; }
        .prompt-footer { flex-wrap: wrap; }
        .prompt-summary { order: 3; width: 100%; }
        .prompt-footer .generate { min-width: 126px; }
        .right { min-height: 430px; border-top: 1px solid var(--oppai-border-strong); }
        .shot img { max-height: 52vh; }
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    // Before the network work: restoring is local and instant, and a user who left
    // mid-prompt should see their text back immediately rather than after a round
    // trip to the generator.
    this.restoreDraft();
    void this.loadStatus();
    void this.loadCharacters();
    if (this.studio) this.enterStudio();
  }

  /**
   * Sets the screen up for the job it exists to do.
   *
   * The outfit fragment is switched on because a studio with it off is a blank screen
   * with a checkbox, and the outfit panel is opened because it is the thing the user
   * came here for. Neither is forced afterwards — turning the fragment off to check a
   * plain prompt against the same model stays possible.
   */
  private enterStudio() {
    this.outfitOn = true;
    this.open = { ...this.open, outfit: true, loadouts: true, models: false, settings: false };
    void this.loadStudio();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // A full wardrobe can take a while. Leaving Creation finishes only the request
    // already accepted by the generator, then stops the client-side queue.
    this.stopOutfitBatch = true;
    this.stopListening();
    // Leaving the tab is exactly the moment the old version threw the work away.
    // Flushing here (rather than relying on the debounce having fired) is what makes
    // the last few keystrokes survive.
    this.flushDraft();
  }

  /**
   * Everything that belongs in the draft, by property name.
   *
   * Explicit rather than "any changed state", because most of this component's state
   * is not draft material: a toast, an open menu, the loading flags and the fetched
   * model lists all change constantly and none of them is work in progress. Saving on
   * those would mean a write per animation frame.
   */
  private static readonly DRAFT_FIELDS = new Set<string>([
    "prompt", "negative", "checkpoint", "vae", "templateId", "scheduler",
    "width", "height", "steps", "cfg", "cfgRescale", "clipSkip",
    "seamlessX", "seamlessY", "vaePrecision", "cpuNoise", "count", "seed", "board",
    "selectedLoras", "selectedTriggers", "selectedChars",
    "outfitOn", "outfitText", "outfitGear", "outfitFace", "outfitTier", "outfitBackground",
    "outfitLockColors", "outfitLoadoutId", "outfitWardrobeId",
    "outfitUnderwearColor", "outfitPubicHair", "outfitPubicHairColor", "camera",
    "detailerEnabled", "detailerModel", "detailerPrompt", "detailerNegative",
    "detailerConfidence", "detailerDenoise", "detailerMaskBlur",
    "open", "showOptions", "shots",
  ]);

  /**
   * The element that actually scrolls this view.
   *
   * It is not in this component's shadow root — the creator is a tall form inside the
   * library shell, and the shell's <main> is the scroller. So the search walks up from
   * the host, stepping out through each shadow boundary, and takes the first ancestor
   * that both overflows and is allowed to scroll. Guessing at document.scrollingElement
   * instead would silently do nothing, which is the failure mode worth avoiding: a
   * scroll restore that quietly no-ops looks identical to one that was never written.
   */
  private get scrollHost(): HTMLElement | null {
    let node: Node | null = this;
    while (node) {
      if (node instanceof HTMLElement && node !== this) {
        const style = getComputedStyle(node);
        const scrolls = /(auto|scroll|overlay)/.test(style.overflowY);
        if (scrolls && node.scrollHeight > node.clientHeight + 1) return node;
      }
      const parent: Node | null = node.parentNode;
      // Crossing out of a shadow root: its parentNode is null, and the way up is the
      // host element it is attached to.
      node = parent ?? (node instanceof ShadowRoot ? node.host : null);
      if (node === document.documentElement) break;
    }
    return null;
  }

  protected updated(changed: PropertyValues) {
    // Apply a restored scroll position once there is something to scroll. Doing it in
    // connectedCallback would be a no-op — the form has not rendered yet.
    if (this.pendingScroll && this.scrollHost) {
      this.scrollHost.scrollTop = this.pendingScroll;
      this.pendingScroll = 0;
    }
    for (const key of changed.keys()) {
      if (OppaiImageGen.DRAFT_FIELDS.has(String(key))) {
        this.persistDraft();
        break;
      }
    }
  }

  /** Persists the draft, coalescing bursts of typing.
   *
   * Debounced rather than written per keystroke: this serialises the whole form, and
   * a synchronous localStorage write on every character in a long prompt is felt. */
  private persistDraft() {
    if (this.draftTimer !== undefined) clearTimeout(this.draftTimer);
    this.draftTimer = window.setTimeout(() => {
      this.draftTimer = undefined;
      this.flushDraft();
    }, 600);
  }

  private flushDraft() {
    if (this.draftTimer !== undefined) {
      clearTimeout(this.draftTimer);
      this.draftTimer = undefined;
    }
    if (!this.draftRestored) return; // never overwrite a draft with an empty initial state
    saveDraft({
      prompt: this.prompt,
      negative: this.negative,
      checkpoint: this.checkpoint,
      vae: this.vae,
      templateId: this.templateId,
      scheduler: this.scheduler,
      width: this.width,
      height: this.height,
      steps: this.steps,
      cfg: this.cfg,
      cfgRescale: this.cfgRescale,
      clipSkip: this.clipSkip,
      seamlessX: this.seamlessX,
      seamlessY: this.seamlessY,
      vaePrecision: this.vaePrecision,
      cpuNoise: this.cpuNoise,
      count: this.count,
      seed: this.seed,
      board: this.board,
      selectedLoras: this.selectedLoras,
      selectedTriggers: this.selectedTriggers,
      selectedChars: this.selectedChars,
      outfitOn: this.outfitOn,
      outfitText: this.outfitText,
      outfitGear: this.outfitGear,
      outfitFace: this.outfitFace,
      outfitTier: this.outfitTier,
      outfitBackground: this.outfitBackground,
      outfitUnderwearColor: this.outfitUnderwearColor,
      outfitPubicHair: this.outfitPubicHair,
      outfitPubicHairColor: this.outfitPubicHairColor,
      outfitLockColors: this.outfitLockColors,
      outfitLoadoutId: this.outfitLoadoutId,
      outfitWardrobeId: this.outfitWardrobeId,
      camera: this.camera,
      detailerEnabled: this.detailerEnabled,
      detailerModel: this.detailerModel,
      detailerPrompt: this.detailerPrompt,
      detailerNegative: this.detailerNegative,
      detailerConfidence: this.detailerConfidence,
      detailerDenoise: this.detailerDenoise,
      detailerMaskBlur: this.detailerMaskBlur,
      open: this.open,
      showOptions: this.showOptions,
      shots: this.shots.map((s) => ({
        id: s.id, seed: s.seed, saved: s.saved, info: s.info,
        outfitFilename: s.outfitFilename, outfitSlot: s.outfitSlot,
        outfitConfig: s.outfitConfig,
        cutoutReviewed: s.cutoutReviewed, previewVersion: s.previewVersion,
        workspaceX: s.workspaceX, workspaceY: s.workspaceY,
      })),
      scrollTop: this.scrollHost?.scrollTop ?? 0,
    });
  }

  private restoreDraft() {
    const d = loadDraft();
    // The flag is set either way: it is what allows saving to begin, and a first visit
    // with nothing stored is still a state worth keeping from then on.
    this.draftRestored = true;
    if (!d) return;

    // Field by field, and only when present. A draft written by an older build simply
    // has fewer keys, and the defaults already in place are the right fallback.
    if (d.prompt !== undefined) this.prompt = d.prompt;
    if (d.negative !== undefined) this.negative = d.negative;
    if (d.checkpoint !== undefined) this.checkpoint = d.checkpoint;
    if (d.vae !== undefined) this.vae = d.vae;
    if (d.templateId !== undefined) this.templateId = d.templateId;
    if (d.scheduler !== undefined) this.scheduler = d.scheduler;
    if (d.width !== undefined) this.width = d.width;
    if (d.height !== undefined) this.height = d.height;
    if (d.steps !== undefined) this.steps = d.steps;
    if (d.cfg !== undefined) this.cfg = d.cfg;
    if (d.cfgRescale !== undefined) this.cfgRescale = d.cfgRescale;
    if (d.clipSkip !== undefined) this.clipSkip = d.clipSkip;
    if (d.seamlessX !== undefined) this.seamlessX = d.seamlessX;
    if (d.seamlessY !== undefined) this.seamlessY = d.seamlessY;
    if (d.vaePrecision !== undefined) this.vaePrecision = d.vaePrecision;
    if (d.cpuNoise !== undefined) this.cpuNoise = d.cpuNoise;
    if (d.count !== undefined) this.count = d.count;
    if (d.seed !== undefined) this.seed = d.seed;
    if (d.board !== undefined) this.board = d.board;
    if (d.selectedLoras) this.selectedLoras = d.selectedLoras;
    if (d.selectedTriggers) this.selectedTriggers = d.selectedTriggers;
    if (d.selectedChars) this.selectedChars = d.selectedChars;
    if (d.outfitOn !== undefined) this.outfitOn = d.outfitOn;
    if (d.outfitText !== undefined) this.outfitText = d.outfitText;
    // Normalized rather than spread: a draft written before colours existed stores a
    // plain description per slot, and that is still every garment the user typed.
    if (d.outfitGear !== undefined) this.outfitGear = normalizeOutfitGear(d.outfitGear);
    if (d.outfitFace !== undefined) this.outfitFace = Math.max(0, Math.min(OUTFIT_FACES.length - 1, Math.round(d.outfitFace)));
    if (d.outfitTier !== undefined) this.outfitTier = Math.max(0, Math.min(OUTFIT_TIERS.length - 1, Math.round(d.outfitTier)));
    if (d.outfitBackground !== undefined) this.outfitBackground = d.outfitBackground;
    if (d.outfitUnderwearColor !== undefined) this.outfitUnderwearColor = d.outfitUnderwearColor;
    if (d.outfitPubicHair !== undefined) this.outfitPubicHair = d.outfitPubicHair;
    if (d.outfitPubicHairColor !== undefined) this.outfitPubicHairColor = d.outfitPubicHairColor;
    if (d.outfitLockColors !== undefined) this.outfitLockColors = d.outfitLockColors;
    if (d.outfitLoadoutId !== undefined) this.outfitLoadoutId = d.outfitLoadoutId;
    if (d.outfitWardrobeId !== undefined) this.outfitWardrobeId = d.outfitWardrobeId;
    // Merged over the defaults rather than assigned: a draft written before an axis
    // existed must not leave that axis undefined and index a lookup table with it.
    if (d.camera) this.camera = { ...DEFAULT_CAMERA, ...d.camera };
    if (d.detailerEnabled !== undefined) this.detailerEnabled = d.detailerEnabled;
    if (d.detailerModel !== undefined) this.detailerModel = d.detailerModel;
    if (d.detailerPrompt !== undefined) this.detailerPrompt = d.detailerPrompt;
    if (d.detailerNegative !== undefined) this.detailerNegative = d.detailerNegative;
    if (d.detailerConfidence !== undefined) this.detailerConfidence = d.detailerConfidence;
    if (d.detailerDenoise !== undefined) this.detailerDenoise = d.detailerDenoise;
    if (d.detailerMaskBlur !== undefined) this.detailerMaskBlur = d.detailerMaskBlur;
    if (d.open) this.open = d.open;
    if (d.showOptions !== undefined) this.showOptions = d.showOptions;
    if (d.shots) this.shots = d.shots.map((s) => ({ ...s }));

    if (d.scrollTop) this.pendingScroll = d.scrollTop;
    this.restoredNotice = true;
  }

  private async loadStatus() {
    this.status = null;
    this.error = "";
    try {
      const st = await api.imageGenStatus();
      this.status = st;
      // Default to the generator's first checkpoint so a first-time user can generate
      // without picking one.
      if (!this.checkpoint && st.models && st.models.length) {
        this.pickModel(st.models[0]);
      }
      // The destination board is not chosen here — the Invoke gallery panel owns it
      // and announces it (board-changed), so generations land in the gallery on screen.
    } catch (e) {
      this.status = { enabled: true, reachable: false, error: (e as Error).message };
    }
  }

  private async loadCharacters() {
    try {
      const res = await api.characters();
      this.characters = res.characters;
      // A deleted character must not linger in the selection.
      const ids = new Set(res.characters.map((c) => c.id));
      this.selectedChars = this.selectedChars.filter((id) => ids.has(id));
    } catch {
      /* the section just stays empty */
    }
  }

  // Selecting a model applies the generator's per-model defaults (InvokeAI keeps
  // steps/CFG/size/VAE per model) — everything stays editable afterwards.
  private pickModel(m: GenModel) {
    this.checkpoint = m.title;
    const d = m.defaults;
    if (!d) return;
    if (d.steps) this.steps = d.steps;
    if (d.cfgScale) this.cfg = d.cfgScale;
    if (d.cfgRescale !== undefined) this.cfgRescale = d.cfgRescale;
    if (d.scheduler) this.scheduler = d.scheduler;
    if (d.width) this.width = d.width;
    if (d.height) this.height = d.height;
    if (d.vae) this.vae = d.vae;
    // fp16 VAE decoding can yield valid but all-black PNGs. The server now always
    // uses fp32, even when an older InvokeAI model default recommends fp16.
    this.vaePrecision = "fp32";
  }

  // ── speech ────────────────────────────────────────────────────────────────
  private get speechSupported(): boolean {
    return speechRecognitionCtor() != null;
  }

  private toggleListening() {
    if (this.listening) {
      this.stopListening();
      return;
    }
    const Ctor = speechRecognitionCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = navigator.language || "en-US";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      this.speech = text;
    };
    rec.onerror = (e) => {
      this.error = e.error === "not-allowed" ? "Microphone permission was denied." : `Speech error: ${e.error}`;
      this.stopListening();
    };
    // When the recogniser stops on its own (a pause in speech), turn what it heard into
    // a prompt — that's the "convert speech to an optimised prompt" step.
    rec.onend = () => {
      this.listening = false;
      if (this.speech.trim()) void this.optimize(this.speech);
    };
    this.recognition = rec;
    this.listening = true;
    this.error = "";
    try {
      rec.start();
    } catch {
      this.listening = false;
    }
  }

  private stopListening() {
    this.listening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        /* already stopped */
      }
      this.recognition = null;
    }
  }

  // Rule-based prompt building lives on the server so the same logic is available
  // everywhere; here we just hand over the transcript and drop the result into the
  // editable boxes.
  private async optimize(text: string) {
    this.optimizing = true;
    try {
      const { prompt, negativePrompt } = await api.optimizePrompt(text);
      this.prompt = prompt;
      if (!this.negative) this.negative = negativePrompt;
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.optimizing = false;
    }
  }

  // ── prompt assembly ─────────────────────────────────────────────────────────

  /**
   * The final prompt pair sent to the generator: the typed prompt, plus the selected
   * characters' fragments, threaded through the selected template's "{prompt}" slot.
   */
  /** The outfit helper keeps the variable visual ideas small, then adds explicit solo
   * guidance. An outfit square has no useful interpretation with a second subject: it
   * makes both character consistency and a clean sprite cutout much less reliable. */
  private equippedOutfitTerms(): string[] {
    const dialect = this.status?.backend ?? "";
    return OUTFIT_GEAR_SLOTS.flatMap((slot) => {
      const phrase = gearPhrase(slot, this.pieceFor(slot.key), dialect, this.outfitLockColors);
      return phrase ? [phrase] : [];
    });
  }

  /**
   * One equipped piece, with the underwear colour standing in where a slot has none.
   *
   * Bra and panties keep the single shared "underwear colour" control as their default
   * so the common case — a matching set — stays one field. Typing a colour into either
   * slot overrides it, which is how a mismatched set is expressed.
   */
  private pieceFor(key: OutfitGearKey) {
    const piece = this.outfitGear[key];
    if (piece.color.trim() || (key !== "bra" && key !== "panties")) return piece;
    return { color: this.outfitUnderwearColor.trim() || "black", item: piece.item };
  }

  /** Every colour the equipped pieces must not come back as. This is the half of the
   * colour fix that acts on the generator rather than on the prompt: naming the wrong
   * answers is what stops a crimson top arriving blue. */
  private outfitColorNegatives(): string[] {
    if (!this.outfitLockColors) return [];
    const seen = new Set<string>();
    for (const slot of OUTFIT_GEAR_SLOTS) {
      for (const term of gearColorNegatives(slot, this.pieceFor(slot.key))) seen.add(term);
    }
    return [...seen];
  }

  private outfitExposurePrompt(exposure: OutfitExposure): string {
    // Each garment is described in its own colour, so a bra and panties that were
    // given different colours stay different in the exposure clauses too.
    const braColor = this.pieceFor("bra").color;
    const pantyColor = this.pieceFor("panties").color;
    const hasTop = !!this.outfitGear.top.item.trim();
    const hasBottoms = !!this.outfitGear.bottoms.item.trim();
    const hasBra = !!this.outfitGear.bra.item.trim();
    const hasPanties = !!this.outfitGear.panties.item.trim();
    const parts: string[] = [];

    if (!hasTop && !hasBottoms) {
      parts.push("no outer top or bottoms equipped");
    } else if (exposure.clothes === "on") {
      parts.push("equipped outer clothes fully on and properly worn");
    } else if (exposure.clothes === "displaced") {
      parts.push("equipped outer clothes loosened and partly displaced, clothing slipping or pulled aside");
    } else {
      parts.push("equipped outer clothes removed or mostly off her body");
    }

    if (!hasBra) {
      parts.push(hasTop && exposure.clothes === "on"
        ? "no bra equipped, breasts covered by the top"
        : "no bra equipped, bare breasts and nipples visible");
    } else if (exposure.bra === "hidden" && hasTop && exposure.clothes === "on") {
      parts.push(`${braColor} bra completely covered, bra not showing`);
    } else if (exposure.bra === "off") {
      parts.push(hasTop && exposure.clothes === "on"
        ? "bra removed but breasts covered by the top"
        : "bra removed, bare breasts and nipples visible");
    } else {
      parts.push(`${braColor} bra clearly showing, top shifted enough to reveal it`);
    }

    if (!hasPanties) {
      parts.push(hasBottoms && exposure.clothes === "on"
        ? "no panties equipped, vulva covered by the bottoms"
        : "no panties equipped, vulva visible");
    } else if (exposure.panties === "hidden" && hasBottoms && exposure.clothes === "on") {
      parts.push(`${pantyColor} panties completely covered, panties not showing`);
    } else if (exposure.panties === "off") {
      parts.push(hasBottoms && exposure.clothes === "on"
        ? "panties removed but vulva covered by the bottoms"
        : "panties removed, vulva visible");
    } else {
      parts.push(`${pantyColor} panties clearly showing, bottoms shifted enough to reveal them`);
    }
    return parts.join(", ");
  }

  private outfitFragment(): { prompt: string; negative: string } {
    if (!this.outfitOn) return { prompt: "", negative: "" };
    const face = OUTFIT_FACES[this.outfitFace];
    const tier = OUTFIT_TIERS[this.outfitTier];
    const exposure = rollOutfitExposure(this.outfitTier);
    const background = this.outfitBackground === "black"
      ? "perfectly solid pure black studio background, seamless black backdrop, background evenly lit with no texture"
      : "perfectly solid pure white studio background, seamless white backdrop, background evenly lit with no texture";
    const lowerBodyCovered = !!this.outfitGear.bottoms.item.trim() && exposure.clothes === "on";
    const pubic = this.outfitTier === OUTFIT_TIERS.length - 1
      ? this.outfitPubicHair
        ? lowerBodyCovered
          ? `${this.outfitPubicHairColor.trim() || "dark brown"} pubic hair present beneath the bottoms`
          : `${this.outfitPubicHairColor.trim() || "dark brown"} pubic hair visible`
        : "clean-shaven pubic area, no pubic hair"
      : "";
    const parts = [
      "solo, one person, single subject",
      outfitShotPrompt(this.camera.shot),
      face.face,
      face.pose,
      tier.mood,
      ...this.equippedOutfitTerms(),
      this.outfitExposurePrompt(exposure),
      pubic,
      this.outfitText.trim(),
      background,
    ];
    return {
      prompt: parts.filter(Boolean).join(", "),
      negative: [
        "multiple people, two people, group, crowd, 2girls, 2boys, extra person, duplicate person",
        "arms raised, hands above head, arms behind head, hands in hair, both hands near face",
        "detailed background, scenery, gradient background, patterned background, background shadows",
        this.outfitBackground === "black" ? "white background" : "black background",
        !this.outfitPubicHair ? "pubic hair" : "",
        // Every colour the equipped clothes are not. See outfitColorNegatives.
        ...this.outfitColorNegatives(),
        this.outfitLockColors ? "recolored clothing, wrong clothing color, color bleed" : "",
      ].filter(Boolean).join(", "),
    };
  }

  /** Applies the camera's framing to the generation size.
   *
   * This is the half of "converted into generation instructions" that isn't text: a
   * landscape frame is a width and a height, and asking for one in words while generating
   * 512×768 produces a tall image with the words ignored. It keeps the current resolution
   * family, so switching framing never moves an SDXL model down to 512. */
  private applyCameraFraming() {
    const { width, height } = compileCamera(this.camera, scaleFor(this.width, this.height));
    this.width = width;
    this.height = height;
  }

  private editCamera(patch: Partial<CameraSpec>) {
    this.camera = { ...this.camera, ...patch };
    if (patch.framing) this.applyCameraFraming();
  }

  /**
   * Steps to the next slot in the wardrobe: through every expression, then on to the
   * next heat tier. Generate, Next pose, generate — that loop is the helper.
   */
  private nextOutfitPose() {
    const face = this.outfitFace + 1;
    if (face < OUTFIT_FACES.length) { this.outfitFace = face; return; }
    this.outfitFace = 0;
    this.outfitTier = (this.outfitTier + 1) % OUTFIT_TIERS.length;
  }

  private assemblePrompts(): { prompt: string; negative: string } {
    const outfit = this.outfitFragment();
    const parts = [this.prompt.trim(), ...this.selectedTriggers, outfit.prompt];
    const negParts = [this.negative.trim(), outfit.negative];
    for (const id of this.selectedChars) {
      const c = this.characters.find((ch) => ch.id === id);
      if (!c) continue;
      if (c.prompt.trim()) parts.push(c.prompt.trim());
      if (c.negativePrompt?.trim()) negParts.push(c.negativePrompt.trim());
    }
    let prompt = parts.filter(Boolean).join(", ");
    let negative = negParts.filter(Boolean).join(", ");

    const tpl = (this.status?.templates ?? []).find((t) => t.id === this.templateId);
    if (tpl) {
      if (tpl.prompt.includes("{prompt}")) prompt = tpl.prompt.replaceAll("{prompt}", prompt);
      else if (tpl.prompt.trim()) prompt = `${prompt}, ${tpl.prompt.trim()}`;
      if (tpl.negativePrompt.includes("{prompt}")) {
        negative = tpl.negativePrompt.replaceAll("{prompt}", negative);
      } else if (tpl.negativePrompt.trim()) {
        negative = negative ? `${negative}, ${tpl.negativePrompt.trim()}` : tpl.negativePrompt.trim();
      }
    }
    return { prompt, negative };
  }

  // ── generate / save ─────────────────────────────────────────────────────────
  private outfitSlot(tier = this.outfitTier, face = this.outfitFace) {
    const expression = OUTFIT_FACES[face];
    const heat = OUTFIT_TIERS[tier];
    const slot: DraftOutfitSlot = {
      emotion: expression.id,
      emotionLabel: expression.label,
      tier,
      tierLabel: heat.label,
      index: face + tier * OUTFIT_FACES.length,
    };
    return {
      slot,
      filename: outfitImageFilename(this.outfitText, heat.label, expression.id),
    };
  }

  /** Results belonging to the outfit currently described, ordered exactly like the
   * wardrobe grid. A map makes a regenerated square replace its earlier take. */
  private currentOutfitShots(): Shot[] {
    const byName = new Map(this.shots.filter((shot) => shot.outfitFilename && this.shotMatchesCurrentOutfit(shot))
      .map((shot) => [shot.outfitFilename!, shot]));
    const ordered: Shot[] = [];
    for (let tier = 0; tier < OUTFIT_TIERS.length; tier++) {
      for (let face = 0; face < OUTFIT_FACES.length; face++) {
        const shot = byName.get(this.outfitSlot(tier, face).filename);
        if (shot) ordered.push(shot);
      }
    }
    return ordered;
  }

  /**
   * A fingerprint of everything that changes what the clothes look like.
   *
   * Squares are matched to the board by this rather than by name, so editing the
   * loadout detaches the old previews instead of letting a sixty-image set quietly mix
   * two different outfits. Colour is part of it: a crimson top and a navy one are not
   * the same wardrobe even when every other word matches.
   */
  private outfitConfigKey(): string {
    const pubicHair = this.outfitPubicHair;
    return JSON.stringify({
      v: 2,
      background: this.outfitBackground,
      underwear: this.outfitUnderwearColor.trim().toLowerCase() || "black",
      pubicHair,
      // An inactive colour must not make an otherwise identical wardrobe look missing.
      pubicHairColor: pubicHair
        ? this.outfitPubicHairColor.trim().toLowerCase() || "dark brown"
        : "",
      lockColors: this.outfitLockColors,
      gear: gearKey(this.outfitGear),
    });
  }

  private shotMatchesCurrentOutfit(shot: Shot): boolean {
    if (shot.outfitConfig) return shot.outfitConfig === this.outfitConfigKey();
    // Drafts from before these controls existed were generated with these defaults.
    return this.outfitBackground === "white" &&
      (this.outfitUnderwearColor.trim().toLowerCase() || "black") === "black" &&
      !this.outfitPubicHair &&
      OUTFIT_GEAR_SLOTS.every(({ key }) =>
        this.outfitGear[key].item.trim() === DEFAULT_OUTFIT_GEAR[key].item);
  }

  /**
   * Where one result's pixels come from.
   *
   * An outfit square filed into a wardrobe is read from disk, because that copy is the
   * one that lasts: the preview cache is capped, expires in six hours and empties on a
   * restart, and a sixty-square wardrobe outlives all three. Everything else — ordinary
   * generations, and squares from before a wardrobe existed — still reads the preview.
   * Either way the URL is stable across a redo, so a version bumps the cache.
   */
  private previewURL(shot: Pick<Shot, "id" | "previewVersion" | "wipOutfitId" | "outfitSlot">): string {
    if (shot.wipOutfitId && shot.outfitSlot) {
      return api.libbyOutfitWipImageURL(
        shot.wipOutfitId, shot.outfitSlot.emotion, shot.outfitSlot.tier, shot.previewVersion,
      );
    }
    const url = api.genPreviewURL(shot.id);
    return shot.previewVersion ? `${url}?v=${shot.previewVersion}` : url;
  }

  // ── outfit work in progress ─────────────────────────────────────────────────
  //
  // Squares are written to the wardrobe as they are generated, unreviewed, and are
  // read back from there. That is what makes a sixty-image set survive a closed tab,
  // a restarted server and an expired preview — the failure that showed up as a board
  // full of blank pictures after a long session.

  /**
   * The wardrobe generated squares are filed into, creating one if the user has not
   * picked any.
   *
   * A studio run with nowhere to put its work is the state that loses it, and there is
   * nothing to decide at that moment — the theme on the board already names the outfit.
   * The wardrobe is a real one from the start, so it appears in the picker, and it is
   * only ever removed by the user deleting it.
   */
  private async ensureWardrobe(): Promise<string> {
    if (this.outfitWardrobeId) return this.outfitWardrobeId;
    const name = this.outfitText.trim() || "Work in progress";
    const saved = await api.saveLibbyOutfit({ name });
    this.outfitWardrobeId = saved.id;
    this.wardrobes = (await api.libbyOutfits()).outfits;
    void this.renderRoot.querySelector("oppai-outfit-wardrobe")?.refresh();
    this.persistDraft();
    this.showToast(`Keeping this outfit in a new wardrobe, “${saved.name}”.`);
    return saved.id;
  }

  /**
   * Files one square's bytes into the wardrobe's work in progress.
   *
   * Returns the id it was stored under so the caller can point the shot at it; on
   * failure it returns "" and says so, because a square that only exists in the preview
   * cache is worth generating on top of rather than silently pretending is safe.
   */
  private async storeOutfitWip(
    shot: Shot, imageURL: string, wardrobeId: string, reviewed = false,
  ): Promise<string> {
    if (!shot.outfitSlot) return "";
    try {
      const response = await fetch(imageURL, { credentials: "same-origin" });
      if (!response.ok) throw new Error(`preview returned ${response.status}`);
      const dataURL = await blobToDataURL(await response.blob());
      await api.putLibbyOutfitWip(wardrobeId, shot.outfitSlot.emotion, shot.outfitSlot.tier, {
        imageData: dataURL,
        filename: shot.outfitFilename,
        seed: shot.seed,
        reviewed,
        config: shot.outfitConfig,
        info: shot.info,
      });
      return wardrobeId;
    } catch (e) {
      this.showToast(`Couldn't keep this square: ${(e as Error).message}`);
      return "";
    }
  }

  /**
   * Rebuilds the board from what the wardrobe holds.
   *
   * Called on entering the studio and whenever the target wardrobe changes, so a fresh
   * browser — or one whose previews died hours ago — shows the work that exists rather
   * than sixty broken images. Stored squares replace whatever the local draft claimed
   * for the same slot: the server copy is the one with pixels behind it.
   */
  private async loadWipBoard(wardrobeId: string) {
    if (!wardrobeId) return;
    let squares;
    try {
      squares = (await api.libbyOutfitWip(wardrobeId)).squares;
    } catch {
      return; // an older server, or a wardrobe deleted elsewhere; the board still works
    }
    const restored: Shot[] = squares.map((square) => {
      const face = OUTFIT_FACES.findIndex((f) => f.id === square.emotion);
      const tier = Math.max(0, Math.min(OUTFIT_TIERS.length - 1, square.level));
      const slot = this.outfitSlot(tier, Math.max(0, face));
      return {
        // No live preview stands behind a restored square; the id only has to be
        // stable and unique, and the picture is read from the wardrobe.
        id: `wip-${wardrobeId}-${square.emotion}-${square.level}`,
        seed: square.seed ?? -1,
        saved: false,
        info: square.info as GenInfo | undefined,
        outfitFilename: square.filename || slot.filename,
        outfitSlot: slot.slot,
        outfitConfig: square.config,
        cutoutReviewed: square.reviewed,
        previewVersion: square.updatedAt,
        wipOutfitId: wardrobeId,
      };
    });
    const replaced = new Set(restored.map((shot) => `${shot.outfitSlot!.emotion}:${shot.outfitSlot!.tier}`));
    this.shots = [
      ...this.shots.filter((shot) => {
        if (!shot.outfitSlot) return true; // ordinary generations are not part of a set
        // Squares belonging to a different wardrobe leave with it: two sets sharing one
        // board is how a mixed export happens.
        if (shot.wipOutfitId && shot.wipOutfitId !== wardrobeId) return false;
        return !replaced.has(`${shot.outfitSlot.emotion}:${shot.outfitSlot.tier}`);
      }),
      ...restored,
    ];
    this.persistDraft();
  }

  private defaultNodePosition(index: number): { workspaceX: number; workspaceY: number } {
    return {
      workspaceX: 18 + (index % 4) * 282,
      workspaceY: 18 + Math.floor(index / 4) * 430,
    };
  }

  private selectOutfitSlot(index: number) {
    this.outfitTier = Math.floor(index / OUTFIT_FACES.length);
    this.outfitFace = index % OUTFIT_FACES.length;
  }

  /** Makes one request using a snapshot of the selected outfit square. */
  private async generateOne(appendOutfit: boolean): Promise<number> {
    const { prompt, negative } = this.assemblePrompts();
    const capturedOutfitText = this.outfitText.trim();
    const outfit = this.outfitOn ? this.outfitSlot() : undefined;
    const capturedOutfitConfig = outfit ? this.outfitConfigKey() : undefined;
    const superseded = outfit
      ? this.shots.find((shot) => shot.outfitFilename === outfit.filename)
      : undefined;
    const supersededPosition = superseded
      ? this.nodePosition(superseded, this.shots.indexOf(superseded))
      : undefined;
    const startedAt = performance.now();
    // The parameters are built once and kept, so the record attached to each image
    // describes what was actually sent. Re-reading the sliders afterwards would make
    // the "copy generation data" of an image change as soon as a control moved.
    const params: GenerateParams = {
      prompt,
        negativePrompt: negative || undefined,
        checkpoint: this.checkpoint || undefined,
        vae: this.vae || undefined,
        sampler: this.scheduler || undefined,
        steps: this.steps,
        width: this.width,
        height: this.height,
        cfgScale: this.cfg,
        cfgRescale: this.cfgRescale,
        clipSkip: this.clipSkip,
        seamlessX: this.seamlessX,
        seamlessY: this.seamlessY,
        vaePrecision: this.vaePrecision,
        cpuNoise: this.cpuNoise,
        board: this.board,
        // A wardrobe square needs one final image. Multiple variants with the same
        // state cannot be named or imported unambiguously, so outfit runs are 1-up.
        count: this.outfitOn ? 1 : this.count,
        seed: this.seed,
        loras: Object.entries(this.selectedLoras).map(([name, weight]) => ({ name, weight })),
        detailer: this.status?.detailerAvailable && this.detailerEnabled
          ? {
              enabled: true,
              model: this.detailerModel,
              prompt: this.detailerPrompt || undefined,
              negativePrompt: this.detailerNegative || undefined,
              confidence: this.detailerConfidence,
              denoise: this.detailerDenoise,
              maskBlur: this.detailerMaskBlur,
            }
          : undefined,
    };
    const res = await api.generate(params);
    const seconds = (performance.now() - startedAt) / 1000;
    const made: Shot[] = res.images.map((g: GenPreview, index: number) => ({
        ...g,
        saved: false,
        outfitFilename: outfit?.filename,
        outfitSlot: outfit?.slot,
        outfitConfig: capturedOutfitConfig,
        ...(supersededPosition && outfit
          ? { workspaceX: supersededPosition.x, workspaceY: supersededPosition.y }
          : this.defaultNodePosition((appendOutfit ? this.shots.length : 0) + index)),
        // The seed that came back, not the one submitted: a submitted -1 means
        // "surprise me", and it is the returned value that reproduces this image.
        info: buildGenInfo(params, {
          seed: g.seed,
          backend: this.status?.backend ?? "unknown",
          modelHash: this.status?.models?.find((model) => model.title === params.checkpoint)?.hash,
          loraHashes: Object.fromEntries(
            (this.status?.loras ?? []).filter((lora) => lora.hash).map((lora) => [lora.name, lora.hash!]),
          ),
          triggers: this.selectedTriggers,
          characters: this.selectedChars
            .map((id) => this.characters.find((c) => c.id === id)?.name ?? "")
            .filter(Boolean),
          outfit: this.outfitOn ? capturedOutfitText : "",
          controlImage: this.cutout?.name,
          seconds,
        }),
      }));
    if (appendOutfit && outfit) {
      // Before anything else is touched: put the bytes somewhere that outlives the
      // preview cache. A square that only exists in memory is one restart away from
      // being a blank tile the user has to generate again.
      if (made.length) {
        try {
          const wardrobeId = await this.ensureWardrobe();
          const stored = await this.storeOutfitWip(made[0], this.previewURL(made[0]), wardrobeId);
          if (stored) {
            made[0].wipOutfitId = stored;
            made[0].previewVersion = Date.now();
          }
        } catch (e) {
          this.showToast(`Couldn't keep this square: ${(e as Error).message}`);
        }
      }
      // A redo is replacement, not another hidden cache entry. Delete only after the
      // new image exists so a failed generation never destroys the usable take.
      // A restored square has no preview behind its id, so only a real one is dropped.
      if (superseded && made.length && !superseded.id.startsWith("wip-")) {
        await api.deleteGenPreview(superseded.id);
      }
      this.shots = [
        ...this.shots.filter((shot) => shot.outfitFilename !== outfit.filename),
        ...made,
      ];
    } else {
      // Ordinary generation remains a canvas for the newest request. Outfit work is
      // the exception because all sixty named squares are one deliverable.
      this.shots = made;
    }
    void this.galleryPanel?.refresh();
    return made.length;
  }

  private async generate() {
    // The outfit helper can carry the whole prompt on its own, so what matters is
    // whether anything assembles — not whether the box itself has text in it.
    if (this.generating || !this.assemblePrompts().prompt.trim()) return;
    this.generating = true;
    this.error = "";
    try {
      await this.generateOne(this.outfitOn);
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.generating = false;
      // A finished run is worth persisting immediately rather than on the next
      // keystroke: the output history is the part of the draft it would hurt to lose.
      this.persistDraft();
    }
  }

  /** Generates the selected wardrobe square and moves the selector only after the
   * image has returned, removing the old generate/remember/click-next loop. */
  private async generateOutfitAndNext() {
    if (this.generating || !this.outfitOn || !this.assemblePrompts().prompt.trim()) return;
    this.generating = true;
    this.error = "";
    try {
      if (await this.generateOne(true)) this.nextOutfitPose();
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.generating = false;
      this.persistDraft();
    }
  }

  /** Runs every missing square sequentially. Sequential requests keep the generator
   * responsive, retain progress on failure, and make Stop deterministic. */
  private async generateAllOutfit() {
    if (this.generating || !this.outfitOn || !this.assemblePrompts().prompt.trim()) return;
    this.generating = true;
    this.outfitBatchRunning = true;
    this.stopOutfitBatch = false;
    this.error = "";
    const total = OUTFIT_FACES.length * OUTFIT_TIERS.length;
    try {
      for (let index = 0; index < total; index++) {
        if (this.stopOutfitBatch) break;
        this.selectOutfitSlot(index);
        const expected = this.outfitSlot().filename;
        if (this.shots.some((shot) => shot.outfitFilename === expected && this.shotMatchesCurrentOutfit(shot))) continue;
        this.outfitProgress = `Generating ${index + 1} of ${total} · ${OUTFIT_TIERS[this.outfitTier].label} · ${OUTFIT_FACES[this.outfitFace].label}`;
        await this.generateOne(true);
        this.persistDraft();
      }
      const complete = this.currentOutfitShots().length;
      this.outfitProgress = this.stopOutfitBatch
        ? `Stopped with ${complete} of ${total} ready.`
        : `Outfit complete · ${complete} of ${total} ready.`;
    } catch (e) {
      this.error = (e as Error).message;
      this.outfitProgress = `Paused with ${this.currentOutfitShots().length} of ${total} ready. Run missing images to resume.`;
    } finally {
      this.generating = false;
      this.outfitBatchRunning = false;
      this.persistDraft();
    }
  }

  private cancelOutfitBatch() {
    this.stopOutfitBatch = true;
    this.outfitProgress = "Stopping after the current image…";
  }

  /** Copies one image's full generation data.
   *
   * Two formats because they are read by different things: A1111 parameters text is
   * what every other tool in this ecosystem understands, and the JSON is lossless for
   * the fields A1111's format has no room for. See gen-info.ts. */
  private async copyGenInfo(shot: Shot, format: "text" | "json") {
    if (!shot.info) {
      this.showToast("No generation data was recorded for this image.");
      return;
    }
    const payload = format === "json" ? toJSON(shot.info) : toInfotext(shot.info);
    if (await copyText(payload)) {
      this.showToast(format === "json" ? "Full data copied as JSON" : "Generation data copied");
    } else {
      this.showToast("Couldn't reach the clipboard — this needs HTTPS or a permission.");
    }
  }

  /** Loads a result back into the form without composing its already-final prompt a
   * second time through templates, characters, triggers, or the outfit helper. */
  private reuseGenInfo(info: GenInfo) {
    const params = toGenerateParams(info);
    this.prompt = params.prompt;
    this.negative = params.negativePrompt ?? "";
    this.checkpoint = params.checkpoint ?? "";
    this.vae = params.vae ?? "";
    this.scheduler = params.sampler ?? "";
    this.seed = params.seed ?? -1;
    this.steps = params.steps ?? 25;
    this.cfg = params.cfgScale ?? 7;
    this.cfgRescale = params.cfgRescale ?? 0;
    this.clipSkip = params.clipSkip ?? 0;
    this.width = params.width ?? 512;
    this.height = params.height ?? 768;
    this.seamlessX = !!params.seamlessX;
    this.seamlessY = !!params.seamlessY;
    this.vaePrecision = params.vaePrecision ?? "fp32";
    this.cpuNoise = params.cpuNoise !== false;
    this.count = 1;
    this.selectedLoras = Object.fromEntries((params.loras ?? []).map((lora) => [lora.name, lora.weight]));
    this.board = params.board ?? "none";
    this.detailerEnabled = !!params.detailer?.enabled;
    if (params.detailer) {
      this.detailerModel = params.detailer.model ?? "face_yolov8n.pt";
      this.detailerPrompt = params.detailer.prompt ?? "";
      this.detailerNegative = params.detailer.negativePrompt ?? "";
      this.detailerConfidence = params.detailer.confidence ?? 0.3;
      this.detailerDenoise = params.detailer.denoise ?? 0.4;
      this.detailerMaskBlur = params.detailer.maskBlur ?? 4;
    }
    this.templateId = "";
    this.selectedTriggers = [];
    this.selectedChars = [];
    this.outfitOn = false;
    this.showOptions = true;
    this.showToast("Generation parameters loaded");
  }

  private async exportShot(shot: Shot) {
    if (!shot.info) {
      this.showToast("No generation data was recorded for this image.");
      return;
    }
    try {
      await downloadGenerationPNG(
        this.previewURL(shot),
        shot.outfitFilename ?? `oppailib-seed-${shot.seed}.png`,
        toInfotext(shot.info),
        toJSON(shot.info),
      );
      this.showToast("PNG exported with Civitai metadata");
    } catch (e) {
      this.showToast((e as Error).message);
    }
  }

  /** Exports the completed squares as one archive. Each file uses the state captured
   * before its request began; the live selectors are never consulted for naming. */
  private async exportOutfitZip() {
    const shots = this.currentOutfitShots();
    if (!shots.length || this.outfitExporting) return;
    const unreviewed = shots.filter((shot) => !shot.cutoutReviewed);
    if (unreviewed.length) {
      this.error = `Review the automatic background cutout for all ${unreviewed.length} remaining outfit image${unreviewed.length === 1 ? "" : "s"} before exporting.`;
      return;
    }
    this.outfitExporting = true;
    const entries: ZipEntry[] = [];
    const failed: string[] = [];
    try {
      for (let index = 0; index < shots.length; index++) {
        const shot = shots[index];
        this.outfitProgress = `Preparing ${index + 1} of ${shots.length} for the outfit ZIP…`;
        try {
          const response = await fetch(this.previewURL(shot), { credentials: "same-origin" });
          if (!response.ok) throw new Error(`preview returned ${response.status}`);
          let bytes: Uint8Array<ArrayBufferLike> = new Uint8Array(await response.arrayBuffer());
          if (shot.info) bytes = embedGenerationMetadata(bytes, toInfotext(shot.info), toJSON(shot.info));
          entries.push({ name: shot.outfitFilename!, data: bytes });
        } catch {
          failed.push(shot.outfitFilename ?? `seed-${shot.seed}.png`);
        }
      }
      if (failed.length) {
        const expired = new Set(failed);
        this.shots = this.shots.filter((shot) => !shot.outfitFilename || !expired.has(shot.outfitFilename));
        this.persistDraft();
      }
      if (!entries.length) throw new Error("The generated previews expired. Generate the missing outfit images again.");

      const manifest = {
        outfit: this.outfitText.trim(),
        loadout: this.outfitGear,
        expected: OUTFIT_FACES.length * OUTFIT_TIERS.length,
        exported: entries.length,
        generationBackground: this.outfitBackground,
        colorsLocked: this.outfitLockColors,
        underwearColor: this.outfitUnderwearColor.trim() || "black",
        pubicHair: this.outfitPubicHair,
        pubicHairColor: this.outfitPubicHair ? this.outfitPubicHairColor.trim() || "dark brown" : undefined,
        backgroundRemoved: true,
        cutoutReviewed: true,
        images: shots
          .filter((shot) => !failed.includes(shot.outfitFilename ?? ""))
          .map((shot) => ({ file: shot.outfitFilename, ...shot.outfitSlot })),
      };
      entries.push({
        name: "outfit-manifest.json",
        data: new TextEncoder().encode(JSON.stringify(manifest, null, 2)),
      });
      const archive = await createZip(entries);
      const url = URL.createObjectURL(archive);
      const link = document.createElement("a");
      link.href = url;
      link.download = outfitArchiveFilename(this.outfitText);
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      this.outfitProgress = failed.length
        ? `Exported ${entries.length - 1} images; ${failed.length} expired preview${failed.length === 1 ? "" : "s"} need regenerating.`
        : `Exported ${entries.length - 1} correctly named outfit images in one ZIP.`;
      this.showToast(failed.length ? "Outfit ZIP exported with missing previews." : "Outfit ZIP exported.");
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.outfitExporting = false;
    }
  }

  private openShotMenu(shot: Shot, e: MouseEvent) {
    e.preventDefault();
    openMenu({
      x: e.clientX,
      y: e.clientY,
      title: `Seed ${shot.seed}`,
      items: [
        { label: "Copy generation metadata", icon: "content_copy", run: () => void this.copyGenInfo(shot, "text") },
        { label: "Use same generation parameters", icon: "replay", disabled: !shot.info,
          run: () => { if (shot.info) this.reuseGenInfo(shot.info); } },
        { label: "Export PNG for Civitai", icon: "download", disabled: !shot.info,
          run: () => void this.exportShot(shot) },
      ],
    });
  }

  private async save(shot: Shot) {
    if (shot.saved) return;
    try {
      const title = (this.prompt.trim() || this.outfitText.trim()).slice(0, 80) || "Generated image";
      await api.saveGenerated({ id: shot.id, title });
      this.shots = this.shots.map((s) => (s.id === shot.id ? { ...s, saved: true } : s));
      this.showToast("Saved to library");
      // The library grid behind this view is now stale.
      this.dispatchEvent(new CustomEvent("imported", { bubbles: true, composed: true }));
    } catch (e) {
      this.showToast((e as Error).message);
    }
  }

  /** Repaint every picker thumbnail and retry the ones that had failed. */
  private bumpThumbs() {
    this.thumbVersion++;
    this.failedThumbs = new Set();
  }

  /**
   * A picker card's artwork: the image when it loads, a proper placeholder when it
   * can't. The failure is tracked per-URL in state so a miss can't leak hidden
   * styles onto reused <img> nodes (the old approach left cards black).
   */
  private renderArt(url: string, alt: string, icon: string) {
    if (this.failedThumbs.has(url)) {
      return html`<div class="card-blank">
        <span class="material-symbols-rounded" style="font-size:34px;">${icon}</span>
      </div>`;
    }
    return html`<img
      class="card-art"
      src=${url}
      alt=${alt}
      loading="lazy"
      @error=${() => {
        this.failedThumbs = new Set(this.failedThumbs).add(url);
      }}
    />`;
  }

  private async useAsModelThumb(shot: Shot) {
    if (!this.checkpoint) {
      this.showToast("Pick a model first");
      return;
    }
    try {
      await api.setModelThumb({ model: this.checkpoint, previewId: shot.id });
      this.bumpThumbs();
      this.showToast("Model preview synced to InvokeAI");
    } catch (e) {
      this.showToast((e as Error).message);
    }
  }

  // ── model / LoRA metadata editor ────────────────────────────────────────────
  // Edits the generator's own record (via the server), so name, description,
  // trigger phrases and recommended settings match InvokeAI's model manager.

  private async openMetaEditor(name: string) {
    this.metaBusy = true;
    try {
      const meta = await api.modelMeta(name);
      this.metaDraft = meta;
      this.metaTriggerText = meta.triggerPhrases.join(", ");
    } catch (e) {
      this.showToast((e as Error).message);
    } finally {
      this.metaBusy = false;
    }
  }

  private setMetaDefaults(patch: Partial<NonNullable<GenModelMeta["defaults"]>>) {
    const d = this.metaDraft;
    if (!d) return;
    this.metaDraft = { ...d, defaults: { ...(d.defaults ?? {}), ...patch } };
  }

  private async saveMeta() {
    const d = this.metaDraft;
    if (!d || this.metaBusy) return;
    this.metaBusy = true;
    try {
      await api.patchModelMeta({
        key: d.key,
        name: d.name,
        description: d.description ?? "",
        triggerPhrases: this.metaTriggerText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        defaults: d.defaults,
      });
      this.metaDraft = null;
      this.showToast("Model updated");
      // Names and defaults may have changed; the status payload carries both.
      await this.loadStatus();
    } catch (e) {
      this.showToast((e as Error).message);
    } finally {
      this.metaBusy = false;
    }
  }

  private toggleLora(name: string) {
    const next = { ...this.selectedLoras };
    if (name in next) {
      delete next[name];
      const phrases = new Set(
        (this.status?.loras ?? []).find((l) => l.name === name)?.triggerPhrases ?? [],
      );
      const remaining = new Set(
        (this.status?.loras ?? [])
          .filter((l) => l.name in next)
          .flatMap((l) => l.triggerPhrases ?? []),
      );
      this.selectedTriggers = this.selectedTriggers.filter((p) => !phrases.has(p) || remaining.has(p));
    } else {
      const preferred = (this.status?.loras ?? []).find((l) => l.name === name)?.weight;
      next[name] = preferred && Number.isFinite(preferred) ? preferred : 1;
    }
    this.selectedLoras = next;
  }

  private toggleTrigger(phrase: string) {
    this.selectedTriggers = this.selectedTriggers.includes(phrase)
      ? this.selectedTriggers.filter((p) => p !== phrase)
      : [...this.selectedTriggers, phrase];
  }

  private toggleCharacter(id: string) {
    this.selectedChars = this.selectedChars.includes(id)
      ? this.selectedChars.filter((c) => c !== id)
      : [...this.selectedChars, id];
  }

  private toggleSection(id: string) {
    this.open = { ...this.open, [id]: !this.open[id] };
  }

  // ── character editor ────────────────────────────────────────────────────────

  private onCharThumbFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file || !this.charDraft) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (this.charDraft) this.charDraft = { ...this.charDraft, imageData: String(reader.result) };
    };
    reader.readAsDataURL(file);
  }

  /** Scans a chosen image with the AI tagger and folds the booru tags it finds
      into the character's prompt fragment (skipping ones already present). */
  private onCharScanFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file || !this.charDraft || this.scanBusy) return;
    const reader = new FileReader();
    reader.onload = () => void this.scanCharImage(String(reader.result));
    reader.readAsDataURL(file);
  }

  private async scanCharImage(dataUrl: string) {
    if (!this.charDraft || this.scanBusy) return;
    this.scanBusy = true;
    try {
      const res = await api.scanImage(dataUrl);
      // Booru tags carry underscores and a rating we don't want in a prompt; turn
      // them into prompt-style phrases and drop the content rating.
      const tags = res.tags
        .filter((t) => t.category !== "rating")
        .map((t) => t.tag.replace(/_/g, " ").trim())
        .filter(Boolean);
      const d = this.charDraft;
      if (!d) return;
      const existing = d.prompt.trim();
      const have = new Set(
        existing
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean),
      );
      const additions = tags.filter((t) => !have.has(t.toLowerCase()));
      if (!additions.length) {
        this.showToast("No new tags found");
        return;
      }
      const merged = existing ? `${existing}, ${additions.join(", ")}` : additions.join(", ");
      this.charDraft = { ...d, prompt: merged };
      this.showToast(`Added ${additions.length} tag${additions.length === 1 ? "" : "s"}`);
    } catch (e) {
      this.showToast((e as Error).message);
    } finally {
      this.scanBusy = false;
    }
  }

  private async saveCharacter() {
    const d = this.charDraft;
    if (!d || !d.name.trim() || this.charBusy) return;
    this.charBusy = true;
    try {
      await api.saveCharacter({
        id: d.id,
        name: d.name.trim(),
        prompt: d.prompt,
        negativePrompt: d.negativePrompt,
        imageData: d.imageData,
      });
      this.charDraft = null;
      this.bumpThumbs();
      await this.loadCharacters();
      this.showToast("Character saved");
    } catch (e) {
      this.showToast((e as Error).message);
    } finally {
      this.charBusy = false;
    }
  }

  private async deleteCharacter() {
    const d = this.charDraft;
    if (!d?.id || this.charBusy) return;
    if (!confirm(`Delete “${d.name}” from the character library?`)) return;
    this.charBusy = true;
    try {
      await api.deleteCharacter(d.id);
      const line = libbyReact("libraryDelete");
      mascotSay(line.message, "success", { emotion: line.emotion, intensity: line.intensity });
      this.charDraft = null;
      await this.loadCharacters();
      this.showToast("Character deleted");
    } catch (e) {
      this.showToast((e as Error).message);
    } finally {
      this.charBusy = false;
    }
  }

  private showToast(msg: string) {
    this.toast = msg;
    setTimeout(() => (this.toast = ""), 2600);
  }

  // ── render ────────────────────────────────────────────────────────────────
  render() {
    return html`<div class="wrap">
        ${this.restoredNotice ? this.renderRestoredNotice() : nothing}
        ${this.renderBody()}
      </div>
      ${this.charDraft ? this.renderCharEditor(this.charDraft) : nothing}
      ${this.metaDraft ? this.renderMetaEditor(this.metaDraft) : nothing}
      ${this.expandedShot ? this.renderLightbox(this.expandedShot) : nothing}
      ${this.renderCutoutDialog()}
      ${this.toast ? html`<div class="toast">${this.toast}</div>` : nothing}`;
  }

  /**
   * Says that the form was filled in from last time.
   *
   * Without this, a restored draft is indistinguishable from a form someone else left
   * in a strange state — a prompt you don't remember writing and eleven LoRAs at odd
   * weights. Saying so, with one click to clear it, turns a confusing surprise into a
   * convenience. Dismissing the notice keeps the draft; "Start fresh" is the one that
   * discards it, and the labels are written so that distinction is obvious.
   */
  private renderRestoredNotice() {
    return html`
      <div class="restored">
        <span class="material-symbols-rounded" style="font-size:18px;">history</span>
        <span class="grow">Picked up where you left off.</span>
        <button class="act" @click=${() => (this.restoredNotice = false)}>Keep it</button>
        <button class="act" @click=${this.startFresh}>Start fresh</button>
      </div>
    `;
  }

  /** Clears the draft and the form. */
  private startFresh = () => {
    clearDraft();
    this.prompt = "";
    this.negative = "";
    this.selectedLoras = {};
    this.selectedTriggers = [];
    this.selectedChars = [];
    this.outfitOn = false;
    this.outfitText = "";
    this.outfitGear = { ...DEFAULT_OUTFIT_GEAR };
    this.outfitFace = 0;
    this.outfitTier = 0;
    this.outfitBackground = "white";
    this.outfitUnderwearColor = "black";
    this.outfitPubicHair = false;
    this.outfitPubicHairColor = "dark brown";
    this.outfitLockColors = true;
    this.outfitLoadoutId = "";
    this.outfitWardrobeId = "";
    this.outfitProgress = "";
    this.shots = [];
    this.activeNodeId = null;
    this.seed = -1;
    this.restoredNotice = false;
    // The reactive updates above will queue a save of the now-empty state, which is
    // what we want: "start fresh" should survive leaving the tab too.
  };

  /** Item 4: a generated result expanded to full size, with its actions to hand. */
  private renderLightbox(shot: Shot) {
    const current = this.shots.find((s) => s.id === shot.id) ?? shot;
    // A square restored from the wardrobe has pixels but no entry in the generator's
    // preview cache, and both of these actions are addressed to that cache by id.
    // Offering them would produce "preview expired" on a picture plainly on screen.
    const live = !current.id.startsWith("wip-");
    const kept = "This square was restored from the wardrobe — regenerate it to save it elsewhere.";
    return html`
      <div class="lightbox" @click=${(e: Event) => { if (e.target === e.currentTarget) this.expandedShot = null; }}>
        <img src=${this.previewURL(current)} alt="Generated image"
          @contextmenu=${(e: MouseEvent) => this.openShotMenu(current, e)} />
        <div class="row">
          <button class="btn primary" ?disabled=${current.saved || !live}
            title=${live ? "Keep this image in the library" : kept}
            @click=${() => this.save(current)}>
            <span class="material-symbols-rounded" style="font-size:17px;">${current.saved ? "check" : "save"}</span>
            ${current.saved ? "Saved" : "Save to library"}
          </button>
          ${this.status?.backend === "invokeai" ? html`<button class="btn" ?disabled=${!live}
            title=${live ? "Set as this model's preview in InvokeAI" : kept}
            @click=${() => this.useAsModelThumb(current)}>
            <span class="material-symbols-rounded" style="font-size:17px;">photo_camera</span> Sync model preview
          </button>` : nothing}
          <button class="btn" @click=${() => void this.exportShot(current)}>
            <span class="material-symbols-rounded" style="font-size:17px;">download</span> Export for Civitai
          </button>
          <button class="btn" @click=${() => (this.expandedShot = null)}>
            <span class="material-symbols-rounded" style="font-size:17px;">close</span> Close
          </button>
        </div>
      </div>
    `;
  }

  private renderMetaEditor(d: GenModelMeta) {
    const defaults = d.defaults ?? {};
    const isLora = d.type === "lora";
    return html`
      <div class="overlay" @click=${(e: Event) => { if (e.target === e.currentTarget) this.metaDraft = null; }}>
        <div class="dialog">
          <h3>Edit ${isLora ? "LoRA" : "model"} — synced with InvokeAI</h3>
          <div>
            <label class="field">Name</label>
            <input type="text" .value=${d.name}
              @input=${(e: Event) => (this.metaDraft = { ...d, name: (e.target as HTMLInputElement).value })} />
          </div>
          <div>
            <label class="field">Description</label>
            <textarea .value=${d.description ?? ""}
              @input=${(e: Event) => (this.metaDraft = { ...d, description: (e.target as HTMLTextAreaElement).value })}></textarea>
          </div>
          <div>
            <label class="field">Trigger phrases (comma-separated)</label>
            <input type="text" .value=${this.metaTriggerText} placeholder="my-style, detailed face"
              @input=${(e: Event) => (this.metaTriggerText = (e.target as HTMLInputElement).value)} />
          </div>
          ${isLora
            ? html`<div>
                <label class="field">Recommended weight</label>
                <input class="num" type="number" min="-2" max="2" step="0.05"
                  .value=${String(defaults.weight ?? "")} placeholder="1"
                  @input=${(e: Event) =>
                    this.setMetaDefaults({ weight: Number((e.target as HTMLInputElement).value) || 0 })} />
              </div>`
            : html`
                <div class="meta-grid">
                  <div>
                    <label class="field">Steps</label>
                    <input class="num" type="number" min="1" max="80" .value=${String(defaults.steps ?? "")}
                      @input=${(e: Event) =>
                        this.setMetaDefaults({ steps: Number((e.target as HTMLInputElement).value) || 0 })} />
                  </div>
                  <div>
                    <label class="field">CFG scale</label>
                    <input class="num" type="number" min="1" max="30" step="0.5" .value=${String(defaults.cfgScale ?? "")}
                      @input=${(e: Event) =>
                        this.setMetaDefaults({ cfgScale: Number((e.target as HTMLInputElement).value) || 0 })} />
                  </div>
                  <div>
                    <label class="field">CFG rescale</label>
                    <input class="num" type="number" min="0" max="0.99" step="0.05"
                      .value=${String(defaults.cfgRescale ?? "")}
                      @input=${(e: Event) =>
                        this.setMetaDefaults({ cfgRescale: Number((e.target as HTMLInputElement).value) || 0 })} />
                  </div>
                  <div>
                    <label class="field">Width</label>
                    <input class="num" type="number" min="64" max="2048" step="8" .value=${String(defaults.width ?? "")}
                      @input=${(e: Event) =>
                        this.setMetaDefaults({ width: Number((e.target as HTMLInputElement).value) || 0 })} />
                  </div>
                  <div>
                    <label class="field">Height</label>
                    <input class="num" type="number" min="64" max="2048" step="8" .value=${String(defaults.height ?? "")}
                      @input=${(e: Event) =>
                        this.setMetaDefaults({ height: Number((e.target as HTMLInputElement).value) || 0 })} />
                  </div>
                  <div class="full">
                    <label class="field">Scheduler</label>
                    <select class="num" .value=${defaults.scheduler ?? ""}
                      @change=${(e: Event) =>
                        this.setMetaDefaults({ scheduler: (e.target as HTMLSelectElement).value })}>
                      <option value="">No preference</option>
                      ${["euler_a", "euler", "dpmpp_2m", "dpmpp_2m_k", "dpmpp_2m_sde_k", "dpmpp_sde_k", "unipc"].map(
                        (s) => html`<option value=${s} ?selected=${s === defaults.scheduler}>${s}</option>`,
                      )}
                    </select>
                  </div>
                  <div class="full">
                    <label class="field">Default VAE</label>
                    <select class="num" .value=${defaults.vae ?? ""}
                      @change=${(e: Event) => this.setMetaDefaults({ vae: (e.target as HTMLSelectElement).value })}>
                      <option value="">Model's own</option>
                      ${(this.status?.vaes ?? []).map(
                        (v) => html`<option value=${v.key} ?selected=${v.key === defaults.vae}>${v.name}</option>`,
                      )}
                    </select>
                  </div>
                  <div class="full">
                    <label class="field">VAE precision</label>
                    <select class="num" .value=${defaults.vaePrecision ?? ""}
                      @change=${(e: Event) => this.setMetaDefaults({
                        vaePrecision: (e.target as HTMLSelectElement).value as "fp32" | "fp16",
                      })}>
                      <option value="">No preference</option>
                      <option value="fp32">fp32</option>
                      <option value="fp16">fp16</option>
                    </select>
                  </div>
                </div>
              `}
          <div class="dialog-actions">
            <button class="btn" @click=${() => (this.metaDraft = null)}>Cancel</button>
            <button class="btn primary" ?disabled=${this.metaBusy || !d.name.trim()} @click=${() => this.saveMeta()}>
              Save
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private renderBody() {
    const st = this.status;
    if (st === null) {
      return html`<div class="empty"><md-circular-progress indeterminate></md-circular-progress></div>`;
    }
    if (!st.enabled) {
      return html`<div class="empty">
        <span class="material-symbols-rounded">auto_awesome</span>
        <div style="font-size:15px; margin-bottom:6px;">Image generation isn't set up yet.</div>
        <div style="font-size:13px;">
          Add the URL of your local InvokeAI or Automatic1111 / SD.Next server under
          <strong>Settings → Image generation</strong>, then come back here.
        </div>
      </div>`;
    }
    if (!st.reachable) {
      return html`<div class="empty">
        <span class="material-symbols-rounded">cloud_off</span>
        <div style="font-size:15px; margin-bottom:6px;">Can't reach the image generator.</div>
        <div style="font-size:13px; margin-bottom:14px;">${st.error ?? "It didn't answer."}</div>
        <button class="chip" @click=${() => this.loadStatus()}>Retry</button>
      </div>`;
    }

    const invoke = st.backend === "invokeai";
    // The studio shows the wardrobe as a sheet; the Create screen shows a free canvas.
    const sheet = this.studio && this.outfitOn;
    const activeModel = (st.models ?? []).find((model) => model.title === this.checkpoint);
    const modelName = activeModel?.model_name || this.checkpoint || "Choose a model";
    return html`
      <div class="workspace">
        <div class="workspace-bar">
          <div class="workspace-tab">
            <span class="material-symbols-rounded" style="font-size:18px;"
              >${this.studio ? "checkroom" : "auto_awesome"}</span>
            ${this.studio ? "Outfit studio" : "Generate"}
          </div>
          <div class="workspace-context">
            <div class="backend-pill" title="Connected generation backend">
              <span class="status-dot"></span>
              ${invoke ? "InvokeAI" : "A1111 / SD.Next"}
            </div>
            <div class="model-pill" title=${modelName}>
              <span class="material-symbols-rounded" style="font-size:15px;">deployed_code</span>
              <span>${modelName}</span>
            </div>
            ${invoke ? html`<button class="ghost" @click=${() => (this.civitaiOpen = true)}>
              <span class="material-symbols-rounded" style="font-size:17px;">travel_explore</span>
              <span>Browse Civitai</span>
            </button>` : nothing}
          </div>
        </div>
        <div class="layout ${this.studio ? "studio" : ""} ${invoke ? "" : "no-gallery"}">
          <aside class="side">
            <div class="panel-heading">
              <span class="material-symbols-rounded" style="font-size:16px;"
                >${this.studio ? "checkroom" : "tune"}</span>
              ${this.studio ? "Outfit setup" : "Generation setup"}
            </div>
            <!-- Order is the mode. In the studio the outfit work comes first and the
                 model plumbing sits beneath it; on the Create screen the outfit
                 sections are not rendered at all — the studio is the only place they
                 exist now, which is the point of having a studio. -->
            <div class="panel-scroll">
              ${this.studio ? html`
                ${this.renderOutfitSection()}
                ${this.renderLoadoutSection()}
                ${this.renderWardrobeSection()}
              ` : nothing}
              ${this.renderModelSection(st.models ?? [])}
              ${this.renderLoraSection(st.loras ?? [], st.loraError)}
              ${this.renderVaeSection(st.vaes ?? [])}
              ${this.renderSettingsSection(invoke, st.boards ?? [])}
              ${this.renderTemplateSection(st.templates ?? [])}
              ${this.renderCharacterSection()}
            </div>
          </aside>
          <section class="workbench">${this.renderCanvasToolbar(sheet)}
            <div class="canvas-stage ${sheet ? "sheet" : ""}">
              ${this.renderResults()}
              ${this.error ? html`<div class="banner">${this.error}</div>` : nothing}
              ${this.generating ? html`<div class="generating-overlay">
                <div class="generating-card">
                  <md-circular-progress indeterminate style="--md-circular-progress-size:22px;"></md-circular-progress>
                  ${invoke ? "Invoking generation…" : "Generating image…"}
                </div>
              </div>` : nothing}
            </div>
            <div class="prompt-dock">${this.renderPrompt()}</div>
          </section>
          ${invoke
            ? html`<aside class="right">
                <oppai-invoke-gallery workspace
                  @boards-changed=${() => this.loadStatus()}
                  @board-changed=${(e: CustomEvent<{ board: string }>) => (this.board = e.detail.board)}
                  @cut-out=${(e: CustomEvent<{ url: string; name: string }>) =>
                    void this.openCutout(e.detail.url, e.detail.name)}
                  @reuse-generation=${(e: CustomEvent<GenInfo>) => this.reuseGenInfo(e.detail)}
                ></oppai-invoke-gallery>
              </aside>`
            : nothing}
        </div>
      </div>
      ${this.civitaiOpen ? html`<oppai-civitai @close=${() => this.onCivitaiClose()}></oppai-civitai>` : nothing}
    `;
  }

  /**
   * The strip above the workbench.
   *
   * In the studio it names the wardrobe being built and counts the set, because those
   * are the two facts you look up while working through sixty squares. On the Create
   * screen it stays what it was: the size and seed the next generation will use.
   */
  private renderCanvasToolbar(sheet: boolean) {
    if (!sheet) {
      return html`<div class="canvas-toolbar">
        <span class="canvas-name">Generation canvas</span>
        <span class="toolbar-spacer"></span>
        ${this.shots.length ? html`<button class="toolbar-clear" @click=${() => this.clearWorkspace()}>
          <span class="material-symbols-rounded" style="font-size:15px;">delete_sweep</span>
          Clear workspace
        </button>` : nothing}
        <span class="toolbar-stat" title="Output size">
          <span class="material-symbols-rounded" style="font-size:14px;">aspect_ratio</span>
          ${this.width} × ${this.height}
        </span>
        <span class="toolbar-stat" title="Seed">
          <span class="material-symbols-rounded" style="font-size:14px;">casino</span>
          ${this.seed < 0 ? "Random" : this.seed}
        </span>
      </div>`;
    }
    const shots = this.currentOutfitShots();
    const reviewed = shots.filter((shot) => shot.cutoutReviewed).length;
    const total = OUTFIT_FACES.length * OUTFIT_TIERS.length;
    const wardrobe = this.wardrobes.find((o) => o.id === this.outfitWardrobeId);
    return html`<div class="canvas-toolbar">
      <span class="canvas-name">${wardrobe?.name ?? (this.outfitText.trim() || "New wardrobe")}</span>
      <span class="toolbar-spacer"></span>
      <span class="toolbar-stat" title="Squares generated">
        <span class="material-symbols-rounded" style="font-size:14px;">grid_view</span>
        ${shots.length}/${total} generated
      </span>
      <span class="toolbar-stat" title="Squares whose cutout has been reviewed">
        <span class="material-symbols-rounded" style="font-size:14px;">check_circle</span>
        ${reviewed} reviewed
      </span>
      <span class="toolbar-stat" title="Every square is kept until you delete it">
        <span class="material-symbols-rounded" style="font-size:14px;">save</span>
        ${this.outfitWardrobeId ? "Saved" : "Saves on first square"}
      </span>
    </div>`;
  }

  // Closing the Civitai browser refreshes the model list: an install may have
  // finished while it was open, and a new checkpoint should appear right away.
  private onCivitaiClose() {
    this.civitaiOpen = false;
    void this.loadStatus();
  }

  private section(id: string, label: string, count: string, body: unknown) {
    const open = !!this.open[id];
    return html`
      <div class="sec sec-${id}">
        <button class="sec-head" @click=${() => this.toggleSection(id)}>
          <span class="material-symbols-rounded sec-chevron ${open ? "open" : ""}" style="font-size:18px;"
            >chevron_right</span
          >
          ${label}
          <span class="count">${count}</span>
        </button>
        <!-- The body stays in the tree and is collapsed by a 0fr grid row rather than
             being removed. That is what makes the open/close animate at all, and it
             animates without measuring a height or reflowing everything below on each
             frame. See .collapsible in theme.ts. Kept out of the tab order and out of
             the accessibility tree while shut, since it is still rendered. -->
        <div class="collapsible ${open ? "open" : ""}">
          <div class="sec-body" ?inert=${!open} aria-hidden=${open ? "false" : "true"}>${body}</div>
        </div>
      </div>
    `;
  }

  private renderModelSection(models: GenModel[]) {
    if (!models.length) {
      return this.section(
        "models",
        "Models",
        "0",
        html`<div class="sec-note">
          Connected, but the generator lists no checkpoints. Add a model to it and reload.
        </div>`,
      );
    }
    const body = html`
      <div class="cards">
        ${models.map((m) => {
          const on = m.title === this.checkpoint;
          const thumb = `${api.modelThumbURL(m.title)}&v=${this.thumbVersion}`;
          return html`
            <div class="card-wrap">
              <button class="card ${on ? "on" : ""}" title=${m.title} @click=${() => this.pickModel(m)}>
                ${this.renderArt(thumb, m.model_name, "texture")}
                <div class="card-name">${m.model_name}${m.base ? html`<span class="row-sub">${m.base}</span>` : nothing}</div>
              </button>
              <button class="card-edit left" title="Edit model settings" @click=${() => this.openMetaEditor(m.title)}>
                <span class="material-symbols-rounded" style="font-size:15px;">edit</span>
              </button>
            </div>
          `;
        })}
      </div>
    `;
    return this.section("models", "Models", String(models.length), body);
  }

  private renderLoraSection(loras: GenLora[], loraError?: string) {
    if (!loras.length) {
      return this.section(
        "loras",
        "LoRAs",
        "0",
        html`<div class="sec-note">
          ${loraError ? `LoRAs aren't available from this generator: ${loraError}` : "No LoRAs installed."}
        </div>`,
      );
    }
    const pages = Math.ceil(loras.length / 6);
    const page = Math.min(this.loraPage, pages - 1);
    const visible = loras.slice(page * 6, page * 6 + 6);
    const body = html`
      <div class="cards">
        ${visible.map((lora) => {
          const on = lora.name in this.selectedLoras;
          const thumb = `${api.loraThumbURL(lora.name)}&v=${this.thumbVersion}`;
          return html`
            <div class="card-wrap">
              <button class="card ${on ? "on" : ""}" title=${lora.name} @click=${() => this.toggleLora(lora.name)}>
                ${this.renderArt(thumb, lora.alias || lora.name, "style")}
                <div class="card-name">${lora.alias || lora.name}</div>
              </button>
              <button class="card-edit left" title="Edit LoRA settings" @click=${() => this.openMetaEditor(lora.name)}>
                <span class="material-symbols-rounded" style="font-size:15px;">edit</span>
              </button>
              ${on ? html`<input class="lora-weight" type="number" min="-2" max="2" step="0.05"
                aria-label=${`${lora.alias || lora.name} weight`}
                .value=${String(this.selectedLoras[lora.name])}
                @input=${(e: Event) => {
                  const value = Number((e.target as HTMLInputElement).value);
                  this.selectedLoras = { ...this.selectedLoras,
                    [lora.name]: Number.isFinite(value) ? Math.max(-2, Math.min(2, value)) : 1 };
                }} />` : nothing}
            </div>
          `;
        })}
      </div>
      ${pages > 1 ? html`<div class="pager">
        <button ?disabled=${page === 0} @click=${() => (this.loraPage = page - 1)}>Previous</button>
        <span>${page + 1} / ${pages}</span>
        <button ?disabled=${page >= pages - 1} @click=${() => (this.loraPage = page + 1)}>Next</button>
      </div>` : nothing}
    `;
    return this.section("loras", "LoRAs", String(Object.keys(this.selectedLoras).length || loras.length), body);
  }

  private renderVaeSection(vaes: GenVae[]) {
    const body = !vaes.length
      ? html`<div class="sec-note">The generator lists no standalone VAEs; the model's own is used.</div>`
      : html`
          <div class="rows">
            <button class="row-pick ${this.vae === "" ? "on" : ""}" @click=${() => (this.vae = "")}>
              Model default
            </button>
            ${vaes.map(
              (v) => html`<button
                class="row-pick ${this.vae === v.key ? "on" : ""}"
                @click=${() => (this.vae = this.vae === v.key ? "" : v.key)}
              >
                ${v.name}
                ${v.base ? html`<span class="row-sub">${v.base}</span>` : nothing}
              </button>`,
            )}
          </div>
        `;
    return this.section("vaes", "VAEs", this.vae ? "1 picked" : "default", body);
  }

  private renderSettingsSection(invoke: boolean, boards: GalleryBoard[]) {
    const body = html`
      <div class="settings">
        <div class="full">
          <label class="field">Scheduler</label>
          <select
            class="num"
            .value=${this.scheduler}
            @change=${(e: Event) => (this.scheduler = (e.target as HTMLSelectElement).value)}
          >
            ${SCHEDULERS.map((s) => html`<option value=${s.id} ?selected=${s.id === this.scheduler}>${s.label}</option>`)}
          </select>
        </div>
        <div>
          <label class="field">Steps</label>
          <input class="num" type="number" min="1" max="80" .value=${String(this.steps)}
            @input=${(e: Event) => (this.steps = clampNum((e.target as HTMLInputElement).value, 1, 80, 25))} />
        </div>
        <div>
          <label class="field">CFG scale</label>
          <input class="num" type="number" min="1" max="30" step="0.5" .value=${String(this.cfg)}
            @input=${(e: Event) => (this.cfg = clampFloat((e.target as HTMLInputElement).value, 1, 30, 7))} />
        </div>
        ${invoke ? html`
          <div>
            <label class="field">CFG rescale</label>
            <input class="num" type="number" min="0" max="0.99" step="0.05" .value=${String(this.cfgRescale)}
              @input=${(e: Event) => (this.cfgRescale = clampFloat((e.target as HTMLInputElement).value, 0, 0.99, 0))} />
          </div>
          <div>
            <label class="field">CLIP skip</label>
            <input class="num" type="number" min="0" max="12" .value=${String(this.clipSkip)}
              @input=${(e: Event) => (this.clipSkip = clampNum((e.target as HTMLInputElement).value, 0, 12, 0))} />
          </div>
        ` : nothing}
        <div>
          <label class="field">Count</label>
          <input class="num" type="number" min="1" max="8" .value=${String(this.count)}
            @input=${(e: Event) => (this.count = clampNum((e.target as HTMLInputElement).value, 1, 8, 1))} />
        </div>
        <div>
          <label class="field">Seed (-1 random)</label>
          <input class="num" type="number" .value=${String(this.seed)}
            @input=${(e: Event) => (this.seed = clampNum((e.target as HTMLInputElement).value, -1, 2 ** 31, -1))} />
        </div>
        ${invoke ? html`
          <!-- Which gallery a generation lands in is no longer a second setting here:
               it follows whichever gallery the Invoke gallery panel has open, so the
               place you're looking at is the place new images appear. -->
          <div class="full" style="font-size:12px; color:var(--oppai-text-muted);">
            Generations are added to <b>${boards.find((b) => b.id === this.board)?.name ?? "the open gallery"}</b> —
            switch galleries in the Invoke gallery panel.
          </div>
          <label class="switch-row"><input type="checkbox" .checked=${this.cpuNoise}
            @change=${(e: Event) => (this.cpuNoise = (e.target as HTMLInputElement).checked)} /> CPU noise</label>
          <label class="switch-row"><input type="checkbox" .checked=${this.seamlessX}
            @change=${(e: Event) => (this.seamlessX = (e.target as HTMLInputElement).checked)} /> Seamless X</label>
          <label class="switch-row"><input type="checkbox" .checked=${this.seamlessY}
            @change=${(e: Event) => (this.seamlessY = (e.target as HTMLInputElement).checked)} /> Seamless Y</label>
        ` : nothing}
        ${this.status?.detailerAvailable ? html`
          <label class="switch-row full"><input type="checkbox" .checked=${this.detailerEnabled}
            @change=${(e: Event) => (this.detailerEnabled = (e.target as HTMLInputElement).checked)} />
            ADetailer face/hand pass</label>
          ${this.detailerEnabled ? html`
            <div class="full">
              <label class="field">ADetailer detector</label>
              <select class="num" .value=${this.detailerModel}
                @change=${(e: Event) => (this.detailerModel = (e.target as HTMLSelectElement).value)}>
                <option value="face_yolov8n.pt">Face (fast)</option>
                <option value="face_yolov8s.pt">Face (accurate)</option>
                <option value="hand_yolov8n.pt">Hands</option>
                <option value="person_yolov8n-seg.pt">Person</option>
                <option value="mediapipe_face_full">MediaPipe face</option>
              </select>
            </div>
            <div class="full">
              <label class="field">Detail prompt (blank reuses prompt)</label>
              <input class="num" .value=${this.detailerPrompt}
                @input=${(e: Event) => (this.detailerPrompt = (e.target as HTMLInputElement).value)} />
            </div>
            <div class="full">
              <label class="field">Detail negative prompt</label>
              <input class="num" .value=${this.detailerNegative}
                @input=${(e: Event) => (this.detailerNegative = (e.target as HTMLInputElement).value)} />
            </div>
            <div>
              <label class="field">Confidence</label>
              <input class="num" type="number" min="0.05" max="1" step="0.05" .value=${String(this.detailerConfidence)}
                @input=${(e: Event) => (this.detailerConfidence = clampFloat((e.target as HTMLInputElement).value, 0.05, 1, 0.3))} />
            </div>
            <div>
              <label class="field">Denoise</label>
              <input class="num" type="number" min="0.05" max="1" step="0.05" .value=${String(this.detailerDenoise)}
                @input=${(e: Event) => (this.detailerDenoise = clampFloat((e.target as HTMLInputElement).value, 0.05, 1, 0.4))} />
            </div>
            <div>
              <label class="field">Mask blur</label>
              <input class="num" type="number" min="0" max="64" .value=${String(this.detailerMaskBlur)}
                @input=${(e: Event) => (this.detailerMaskBlur = clampNum((e.target as HTMLInputElement).value, 0, 64, 4))} />
            </div>
          ` : nothing}
        ` : nothing}
      </div>
    `;
    return this.section("settings", "Model settings", `${this.steps} steps`, body);
  }

  private renderTemplateSection(templates: GenTemplate[]) {
    // The user's own presets come first; the generator's built-ins are hidden
    // behind a toggle so the list isn't buried under InvokeAI's shipped defaults.
    const builtInCount = templates.filter((t) => t.builtIn).length;
    const visible = this.showBuiltInTemplates
      ? templates
      : templates.filter((t) => !t.builtIn);
    const list = !visible.length
      ? html`<div class="sec-note">
          ${templates.length
            ? "No templates you created. Built-in presets are hidden — turn them on below."
            : "No templates on the generator. In InvokeAI they're called style presets; add some there and reload."}
        </div>`
      : html`
          <div class="rows">
            ${visible.map(
              (t) => html`<button
                class="row-pick ${this.templateId === t.id ? "on" : ""}"
                title=${t.prompt}
                @click=${() => (this.templateId = this.templateId === t.id ? "" : t.id)}
              >
                ${t.name}
                <span class="row-sub">${t.prompt}</span>
              </button>`,
            )}
          </div>
        `;
    const body = html`
      ${list}
      ${builtInCount
        ? html`<button
            class="link-toggle"
            @click=${() => (this.showBuiltInTemplates = !this.showBuiltInTemplates)}
          >
            ${this.showBuiltInTemplates
              ? "Hide built-in presets"
              : `Show built-in presets (${builtInCount})`}
          </button>`
        : nothing}
    `;
    const current = templates.find((t) => t.id === this.templateId);
    return this.section("templates", "Invoke templates", current ? current.name : "none", body);
  }

  private renderCharacterSection() {
    const body = html`
      ${this.characters.length
        ? html`<div class="cards">
            ${this.characters.map((c) => {
              const on = this.selectedChars.includes(c.id);
              const thumb = `${api.characterThumbURL(c.id)}?v=${this.thumbVersion}`;
              return html`
                <div class="card-wrap">
                  <button class="card ${on ? "on" : ""}" title=${c.prompt} @click=${() => this.toggleCharacter(c.id)}>
                    ${c.hasThumb
                      ? this.renderArt(thumb, c.name, "person")
                      : html`<div class="card-blank">
                          <span class="material-symbols-rounded" style="font-size:34px;">person</span>
                        </div>`}
                    <div class="card-name">${c.name}</div>
                  </button>
                  <button
                    class="card-edit"
                    title="Edit ${c.name}"
                    @click=${() =>
                      (this.charDraft = {
                        id: c.id,
                        name: c.name,
                        prompt: c.prompt,
                        negativePrompt: c.negativePrompt ?? "",
                      })}
                  >
                    <span class="material-symbols-rounded" style="font-size:15px;">edit</span>
                  </button>
                </div>
              `;
            })}
          </div>`
        : html`<div class="sec-note">
            Save the people you keep drawing: a character bundles a prompt fragment and a
            portrait, and clicking one adds them to the next generation.
          </div>`}
      <button
        class="side-add"
        @click=${() => (this.charDraft = { name: "", prompt: "", negativePrompt: "" })}
      >
        <span class="material-symbols-rounded" style="font-size:17px;">person_add</span> New character
      </button>
    `;
    const picked = this.selectedChars.length;
    return this.section("characters", "Characters", picked ? `${picked} picked` : String(this.characters.length), body);
  }

  /**
   * One equipment slot: colour first, then the garment.
   *
   * The two fields are in that order because that is the order the prompt is built in
   * and the order the failure happens in — a wardrobe that comes back the wrong colour
   * is the colour being an afterthought, in the UI and in the prompt alike. The swatch
   * is a real colour input so a shade can be picked rather than spelled, and it writes
   * the nearest colour *word* into the text field, because that is what a generator
   * reads. Typing over it is always allowed: "dusty rose" beats any hex.
   */
  private renderGearSlot(key: OutfitGearKey) {
    const slot = OUTFIT_GEAR_SLOTS.find((item) => item.key === key)!;
    const piece = this.outfitGear[key];
    const equipped = !!piece.item.trim();
    const edit = (patch: Partial<GearPiece>) => {
      this.outfitGear = { ...this.outfitGear, [key]: { ...piece, ...patch } };
    };
    return html`<div class="gear-slot ${equipped ? "filled" : ""}" title=${slot.hint}>
      <span class="gear-slot-icon material-symbols-rounded" aria-hidden="true">${slot.icon}</span>
      <span class="gear-slot-name">${slot.label}</span>
      <div class="gear-slot-fields">
        <input class="gear-color" type="text" .value=${piece.color}
          ?disabled=${this.outfitBatchRunning}
          aria-label=${`${slot.label} colour`} placeholder="colour"
          @input=${(e: Event) => edit({ color: (e.target as HTMLInputElement).value })} />
        <input class="gear-item" type="text" .value=${piece.item}
          ?disabled=${this.outfitBatchRunning}
          aria-label=${`${slot.label}: ${slot.hint}`} placeholder=${slot.hint}
          @input=${(e: Event) => edit({ item: (e.target as HTMLInputElement).value })} />
      </div>
    </div>`;
  }

  private clearOutfitLoadout() {
    this.outfitGear = { ...EMPTY_OUTFIT_GEAR };
  }

  /** The saved-recipe gallery: pictures, because ten lines of garment text do not
   * distinguish one outfit from another and a thumbnail does. */
  private renderLoadoutSection() {
    const current = this.loadouts.find((l) => l.id === this.outfitLoadoutId);
    const body = html`
      <div class="sec-note">
        A loadout is the recipe — every slot, colour and studio setting on the board.
        Save one to come back to it, or to render the same clothes again on another model.
      </div>
      <div class="loadout-cards">
        ${this.loadouts.map((saved) => html`<div
          class="loadout-card ${saved.id === this.outfitLoadoutId ? "on" : ""}"
          title=${saved.name}>
          <button class="card-hit" ?disabled=${this.outfitBatchRunning}
            aria-label=${`Equip ${saved.name}`} @click=${() => this.applyLoadout(saved)}>
            ${saved.hasThumb
              ? html`<img class="cover" src=${api.libbyLoadoutThumbURL(saved.id, this.loadoutCoverVersion)} alt="" />`
              : html`<span class="cover cover-empty material-symbols-rounded">checkroom</span>`}
            <span class="card-name">${saved.name}</span>
          </button>
          ${saved.id === this.outfitLoadoutId
            ? html`<span class="worn-badge">Equipped</span>` : nothing}
          <button class="card-del" title=${`Delete ${saved.name}`} aria-label=${`Delete ${saved.name}`}
            ?disabled=${this.loadoutBusy} @click=${() => void this.deleteLoadout(saved)}>
            <span class="material-symbols-rounded" style="font-size:15px;">delete</span>
          </button>
        </div>`)}
        ${this.loadouts.length ? nothing : html`<div class="sec-note">No saved loadouts yet.</div>`}
      </div>
      <div class="outfit-actions">
        <button class="side-add" ?disabled=${this.loadoutBusy || this.outfitBatchRunning}
          @click=${() => void this.saveLoadout(false)}>
          <span class="material-symbols-rounded" style="font-size:17px;">save</span>
          ${current ? `Save over “${current.name}”` : "Save this loadout"}
        </button>
        ${current ? html`
          <button class="side-add" ?disabled=${this.loadoutBusy || this.outfitBatchRunning}
            @click=${() => void this.saveLoadout(true)}>
            <span class="material-symbols-rounded" style="font-size:17px;">content_copy</span>
            Save as a new loadout
          </button>
          <button class="side-add" ?disabled=${this.loadoutBusy}
            @click=${() => void this.setLoadoutCoverFromSelection()}>
            <span class="material-symbols-rounded" style="font-size:17px;">image</span>
            Use the selected square as its cover
          </button>` : nothing}
      </div>
    `;
    return this.section("loadouts", "Saved loadouts", String(this.loadouts.length), body);
  }

  /**
   * Where the work lives.
   *
   * A wardrobe is now the home of a set from its first square, not just the shelf its
   * approved sprites land on: every generation is written into it as work in progress
   * and read back from there. Leaving the picker unset no longer means "keep nothing" —
   * it means a wardrobe is created the moment there is something to keep.
   */
  private renderWardrobeSection() {
    const total = OUTFIT_FACES.length * OUTFIT_TIERS.length;
    const target = this.wardrobes.find((o) => o.id === this.outfitWardrobeId);
    const filled = target?.slots ?? 0;
    const inProgress = target?.wip ?? 0;
    const body = html`
      <div class="sec-note">
        Every square is saved into this wardrobe as it is generated, and stays there
        until you delete the wardrobe — a closed tab or a restarted generator costs you
        nothing. Approving a cutout promotes that square into the matching expression
        and heat tier, so Libby wears it immediately.
      </div>
      <oppai-outfit-wardrobe></oppai-outfit-wardrobe>
      <div>
        <label class="field">File approved sprites into</label>
        <select class="num" .value=${this.outfitWardrobeId}
          @change=${(e: Event) => {
            this.outfitWardrobeId = (e.target as HTMLSelectElement).value;
            this.persistDraft();
            // Switching wardrobes switches boards: the squares already generated into
            // the chosen one come back rather than the board looking empty.
            void this.loadWipBoard(this.outfitWardrobeId);
          }}>
          <option value="">Start a new wardrobe when I generate</option>
          ${this.wardrobes.map((o) => html`<option value=${o.id}>${o.name}</option>`)}
        </select>
      </div>
      ${target
        ? html`<div class="sec-note">
            <strong>${target.name}</strong> has ${filled} of ${total} finished sprites,
            ${inProgress} square${inProgress === 1 ? "" : "s"} kept in progress.
            ${filled >= total ? "This wardrobe is complete." : nothing}
          </div>`
        : nothing}
      <div class="outfit-actions">
        <button class="side-add" @click=${() => void this.createWardrobe()}>
          <span class="material-symbols-rounded" style="font-size:17px;">add</span>
          New wardrobe
        </button>
      </div>
    `;
    return this.section("wardrobe", "Wardrobe", target ? `${filled}/${total}` : "off", body);
  }

  private renderOutfitSection() {
    const face = OUTFIT_FACES[this.outfitFace], tier = OUTFIT_TIERS[this.outfitTier];
    const slot = this.outfitFace + 1 + this.outfitTier * OUTFIT_FACES.length;
    const total = OUTFIT_FACES.length * OUTFIT_TIERS.length;
    const outfitShots = this.currentOutfitShots();
    const completed = new Map(outfitShots.map((shot) => [shot.outfitFilename, shot]));
    const reviewed = outfitShots.filter((shot) => shot.cutoutReviewed).length;
    const selectedReady = completed.has(this.outfitSlot().filename);
    const equipped = OUTFIT_GEAR_SLOTS.filter(({ key }) => this.outfitGear[key].item.trim()).length;
    const body = html`
      <div class="sec-note">
        Builds one wardrobe: the same character in the same clothes, once per expression
        and heat tier — <strong>${total} sprites</strong> for a complete set. Outfit
        prompts explicitly ask for one person, because groups make both consistent
        clothing and clean background cutouts unreliable.
      </div>
      ${this.selectedChars.length > 1 ? html`<div class="banner">
        ${this.selectedChars.length} characters are selected. Use one character for a
        reliable outfit set; the solo prompt will still discourage extra people.
      </div>` : nothing}
      <label class="switch">
        <input type="checkbox" .checked=${this.outfitOn} ?disabled=${this.outfitBatchRunning}
          @change=${(e: Event) => (this.outfitOn = (e.target as HTMLInputElement).checked)} />
        Add outfit terms to the prompt
      </label>
      <div>
        <label class="field">Loadout name / overall theme</label>
        <input class="num" type="text" .value=${this.outfitText} ?disabled=${this.outfitBatchRunning}
          placeholder="Midnight rogue, beach date, office uniform…"
          @input=${(e: Event) => (this.outfitText = (e.target as HTMLInputElement).value)} />
      </div>
      <div class="loadout-board">
        <div class="loadout-heading">
          <span>Equipment</span>
          <span class="equipped-count">${equipped}/${OUTFIT_GEAR_SLOTS.length}</span>
          <button class="loadout-clear" ?disabled=${this.outfitBatchRunning || !equipped}
            @click=${() => this.clearOutfitLoadout()}>Unequip all</button>
        </div>
        <!-- Head down: outerwear, then underwear, then what she is holding, then
             anything extra. Reading order is roughly dressing order. -->
        <div class="loadout-slots">
          ${OUTFIT_GEAR_SLOTS.map((slot) => this.renderGearSlot(slot.key))}
        </div>
      </div>
      <div>
        <label class="field">Solid generation background</label>
        <div class="chips">
          ${(["white", "black"] as const).map((background) => html`<button
            class="chip ${this.outfitBackground === background ? "on" : ""}"
            ?disabled=${this.outfitBatchRunning}
            @click=${() => (this.outfitBackground = background)}>
            ${background === "white" ? "White background" : "Black background"}
          </button>`)}
        </div>
        <div class="sec-note">Choose the background that contrasts most strongly with her hair and outfit.</div>
      </div>
      <div>
        <label class="field">Default underwear color</label>
        <input class="num" type="text" .value=${this.outfitUnderwearColor}
          ?disabled=${this.outfitBatchRunning} placeholder="black, red, pale pink…"
          @input=${(e: Event) => (this.outfitUnderwearColor = (e.target as HTMLInputElement).value)} />
        <div class="sec-note">
          Used for the bra and panties when those slots have no colour of their own.
          Give either slot a colour to break up a matching set.
        </div>
      </div>
      <label class="switch">
        <input type="checkbox" .checked=${this.outfitLockColors} ?disabled=${this.outfitBatchRunning}
          @change=${(e: Event) => (this.outfitLockColors = (e.target as HTMLInputElement).checked)} />
        Lock equipped colours
      </label>
      <div class="sec-note">
        Weights each colour in the prompt and names every colour the garment is
        <em>not</em> in the negative prompt. Leave this on unless a piece is meant to be
        multicoloured — that is the fix for clothes coming back the wrong colour.
      </div>
      <label class="switch">
        <input type="checkbox" .checked=${this.outfitPubicHair} ?disabled=${this.outfitBatchRunning}
          @change=${(e: Event) => (this.outfitPubicHair = (e.target as HTMLInputElement).checked)} />
        Pubic hair at the Peak state
      </label>
      ${this.outfitPubicHair ? html`<div>
        <label class="field">Pubic hair color</label>
        <input class="num" type="text" .value=${this.outfitPubicHairColor}
          ?disabled=${this.outfitBatchRunning} placeholder="dark brown, blonde…"
          @input=${(e: Event) => (this.outfitPubicHairColor = (e.target as HTMLInputElement).value)} />
      </div>` : nothing}
      <div>
        <label class="field">Expression</label>
        <select class="num" .value=${String(this.outfitFace)} ?disabled=${this.outfitBatchRunning}
          @change=${(e: Event) => (this.outfitFace = Number((e.target as HTMLSelectElement).value))}>
          ${OUTFIT_FACES.map((item, index) => html`<option value=${index}>${item.label}</option>`)}
        </select>
      </div>
      <div>
        <label class="field">Heat tier</label>
        <select class="num" .value=${String(this.outfitTier)} ?disabled=${this.outfitBatchRunning}
          @change=${(e: Event) => (this.outfitTier = Number((e.target as HTMLSelectElement).value))}>
          ${OUTFIT_TIERS.map((item, index) => html`<option value=${index}>${index + 1} · ${item.label}</option>`)}
        </select>
        <div class="exposure-note">
          <strong>${tier.label} exposure roll:</strong>
          ${OUTFIT_EXPOSURE_TIERS[this.outfitTier].description}
          Outer clothes, bra, and panties roll separately for every generation.
        </div>
      </div>
      ${this.renderCameraControls()}
      <!-- The completion grid used to be repeated here as sixty dots. The board in
           the middle of the screen is that grid, at a size where the pictures are
           visible, and picking a square there is what moves the selection. -->
      <div class="sec-note">
        Square ${slot} of ${total} selected: <strong>${tier.label} · ${face.label}</strong>.
        ${completed.size} generated · ${reviewed} cutout${reviewed === 1 ? "" : "s"} reviewed.
      </div>
      <div class="sec-note">Every result starts with automatic background removal and must be reviewed by hand before export.</div>
      <div class="outfit-actions">
        <button class="side-add" ?disabled=${this.generating || !this.outfitOn}
          @click=${() => void this.generateOutfitAndNext()}>
          <span class="material-symbols-rounded" style="font-size:17px;">${selectedReady ? "refresh" : "skip_next"}</span>
          ${selectedReady ? "Redo selected emotion + move next" : "Generate selected + move next"}
        </button>
        ${this.outfitBatchRunning
          ? html`<button class="side-add" @click=${() => this.cancelOutfitBatch()}>
              <span class="material-symbols-rounded" style="font-size:17px;">stop_circle</span>
              Stop after current image
            </button>`
          : html`<button class="side-add primary" ?disabled=${this.generating || !this.outfitOn || completed.size >= total}
              @click=${() => void this.generateAllOutfit()}>
              <span class="material-symbols-rounded" style="font-size:17px;">auto_awesome</span>
              Generate ${total - completed.size} missing image${total - completed.size === 1 ? "" : "s"}
            </button>`}
        <button class="side-add" ?disabled=${this.generating || this.outfitExporting || !completed.size || reviewed !== completed.size}
          @click=${() => void this.exportOutfitZip()}>
          <span class="material-symbols-rounded" style="font-size:17px;">folder_zip</span>
          ${this.outfitExporting ? "Building ZIP…" : `Export ${completed.size} image${completed.size === 1 ? "" : "s"} as ZIP`}
        </button>
      </div>
      ${this.outfitProgress ? html`<div class="sec-note">${this.outfitProgress}</div>` : nothing}
      <div class="sec-note">A redo deletes the old preview after its replacement finishes successfully.</div>
    `;
    return this.section("outfit", "Outfit workflow", this.outfitOn ? `${completed.size}/${total}` : "off", body);
  }

  /** Outfit slots need only a shot size. The studio keeps the richer camera model in
   * the saved draft for compatibility, but none of those extra axes enter this prompt. */
  private renderCameraControls() {
    const shot = CAMERA_OPTIONS.shots.find((s) => s.id === this.camera.shot);
    return html`
      <div>
        <label class="field">Shot</label>
        <select class="num" .value=${this.camera.shot} ?disabled=${this.outfitBatchRunning}
          @change=${(e: Event) => this.editCamera({ shot: (e.target as HTMLSelectElement).value as ShotSize })}>
          ${CAMERA_OPTIONS.shots.map((s) => html`<option value=${s.id}>${s.label}</option>`)}
        </select>
      </div>
      ${shot?.hint ? html`<div class="sec-note">${shot.hint}.</div>` : nothing}
    `;
  }

  // ── background cut-out ──────────────────────────────────────────────────────

  private async openCutout(url: string, name: string, outputName?: string, outfitShotId?: string) {
    this.cutout = { url, name, outputName, outfitShotId };
    this.cutoutError = "";
    this.cutoutBusy = true;
    this.showOriginal = false;
    this.cutoutZoom = 1;
    this.cutoutContrast = false;
    try {
      const image = await loadImage(url);
      // A fresh session: the source pixels are read once here and never written again,
      // which is what makes "preserve the original image" structural rather than a
      // promise. See cutout.ts.
      this.session = new CutoutSession(image);
      this.session.autoRemove(this.cutoutTolerance);
      // The automatic pass is the starting point, not an edit to step back behind.
      this.cutoutTool = "remove";
      await this.paintCutout();
    } catch (e) {
      this.cutoutError = (e as Error).message;
    } finally {
      this.cutoutBusy = false;
    }
  }

  /**
   * Re-composes from the mask and puts the result on screen.
   *
   * Cheap on purpose: the mask is untouched, so this is one pass over the pixels and can
   * run on every drag of the feather or spill sliders. The mask-editing operations are
   * the expensive ones and they are only triggered by an explicit action.
   */
  private async paintCutout() {
    const session = this.session;
    if (!session) return;
    this.cutoutCanvas = session.compose(
      { feather: this.cutoutFeather, spill: this.cutoutSpill },
      this.showOriginal,
    );
    this.cutFraction = session.cutFraction;
    this.canUndo = session.canUndo;
    this.canRedo = session.canRedo;
    await this.updateComplete;
    const host = this.cutoutHost;
    if (host && this.cutoutCanvas) {
      host.replaceChildren(this.cutoutCanvas);
      this.applyCutoutZoom();
    }
  }

  /** Fits at 100%, then lets the editor magnify into a scrollable pixel-accurate view.
   * This changes only CSS dimensions; pointer mapping reads the displayed rectangle and
   * therefore remains correct at every zoom level. */
  private applyCutoutZoom() {
    const canvas = this.cutoutCanvas;
    const host = this.cutoutHost;
    if (!canvas || !host) return;
    const availableWidth = Math.max(1, host.clientWidth);
    const availableHeight = Math.max(280, Math.min(window.innerHeight * 0.62, canvas.height));
    const fit = Math.min(1, availableWidth / canvas.width, availableHeight / canvas.height);
    const scale = fit * this.cutoutZoom;
    canvas.style.width = `${Math.max(1, Math.round(canvas.width * scale))}px`;
    canvas.style.height = `${Math.max(1, Math.round(canvas.height * scale))}px`;
  }

  private setCutoutZoom(zoom: number) {
    this.cutoutZoom = Math.max(0.25, Math.min(4, zoom));
    void this.updateComplete.then(() => this.applyCutoutZoom());
  }

  /** Re-runs the automatic pass. Destructive and undoable — it replaces the mask, so a
      tolerance change is a fresh result rather than a ratchet that only removes more. */
  private async autoCutout() {
    if (!this.session) return;
    this.session.autoRemove(this.cutoutTolerance);
    await this.paintCutout();
  }

  /** Turns a pointer event into source-image coordinates.
   *
   * The canvas is displayed scaled to fit the dialog, so the ratio between its intrinsic
   * size and its box on screen has to be applied — without it every click lands in the
   * wrong place on any image that isn't displayed at exactly 1:1, which is most of them. */
  private cutoutPoint(e: PointerEvent): { x: number; y: number } | null {
    const canvas = this.cutoutCanvas;
    if (!canvas) return null;
    const box = canvas.getBoundingClientRect();
    if (!box.width || !box.height) return null;
    return {
      x: ((e.clientX - box.left) / box.width) * canvas.width,
      y: ((e.clientY - box.top) / box.height) * canvas.height,
    };
  }

  private async onCutoutPointerDown(e: PointerEvent) {
    const session = this.session;
    const at = this.cutoutPoint(e);
    if (!session || !at) return;
    // The "before" view is a read-only preview; editing through it would apply strokes
    // the user cannot see landing.
    if (this.showOriginal) return;
    e.preventDefault();

    if (this.cutoutTool === "remove") {
      session.removeAt(at.x, at.y, {
        tolerance: this.cutoutTolerance,
        contiguous: this.contiguous,
      });
      await this.paintCutout();
      return;
    }
    // Brushes: one checkpoint per stroke, so undo steps back a whole drag rather than
    // one pointer event at a time.
    session.beginStroke();
    this.painting = true;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    session.paint(at.x, at.y, this.brushSize, this.cutoutTool === "add" ? "add" : "subtract");
    await this.paintCutout();
  }

  private async onCutoutPointerMove(e: PointerEvent) {
    if (!this.painting || !this.session) return;
    const at = this.cutoutPoint(e);
    if (!at) return;
    this.session.paint(at.x, at.y, this.brushSize, this.cutoutTool === "add" ? "add" : "subtract");
    await this.paintCutout();
  }

  private onCutoutPointerUp() {
    this.painting = false;
  }

  private async undoCutout() {
    if (this.session?.undo()) await this.paintCutout();
  }

  private async redoCutout() {
    if (this.session?.redo()) await this.paintCutout();
  }

  private async resetCutout() {
    this.session?.reset();
    await this.paintCutout();
  }

  private async toggleOriginal(show: boolean) {
    this.showOriginal = show;
    await this.paintCutout();
  }

  private async closeCutout() {
    // The dialog is removed the moment `cutout` is cleared, so the exit has to finish
    // first. playExit degrades to an immediate resolve under reduced motion and cannot
    // hang, so this never leaves the overlay stuck up. See motion.ts.
    await playExit(this.renderRoot.querySelector(".cutout-dialog"));
    this.cutout = null;
    this.cutoutCanvas = null;
    this.cutoutError = "";
    // Dropped explicitly: the session holds the full source pixels plus up to twenty
    // mask snapshots, which is worth releasing rather than leaving to the next GC.
    this.session = null;
    this.painting = false;
    this.showOriginal = false;
    this.cutoutZoom = 1;
    this.cutoutContrast = false;
  }

  private cutoutName(): string {
    if (this.cutout?.outputName) return this.cutout.outputName;
    const base = (this.cutout?.name ?? "cutout").replace(/\.[a-z0-9]+$/i, "").slice(0, 60);
    return `${base || "cutout"}-cutout.png`;
  }

  /** The canvas to export.
   *
   * Deliberately re-composed rather than reusing what is on screen: while the
   * before/after preview is showing "before", the displayed canvas *is* the original,
   * and exporting that would silently hand back an opaque image. */
  private exportCanvas(): HTMLCanvasElement | null {
    if (!this.session) return null;
    return this.session.compose({ feather: this.cutoutFeather, spill: this.cutoutSpill });
  }

  private async downloadCutout() {
    const canvas = this.exportCanvas();
    if (!canvas) return;
    try {
      const blob = await canvasToBlob(canvas);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = this.cutoutName();
      link.click();
      // Revoked on the next tick: revoking synchronously can beat the download in
      // some browsers, and the object is small enough that a tick costs nothing.
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (e) {
      this.cutoutError = (e as Error).message;
    }
  }

  private async saveCutout() {
    const canvas = this.exportCanvas();
    if (!canvas || this.cutoutBusy) return;
    this.cutoutBusy = true;
    try {
      const blob = await canvasToBlob(canvas);
      const name = this.cutoutName();
      await api.upload(new File([blob], name, { type: "image/png" }), name);
      this.dispatchEvent(new CustomEvent("imported", {
        detail: { count: 1, kind: "image", title: name },
        bubbles: true, composed: true,
      }));
      this.showToast("Cut-out saved to your library.");
      void this.closeCutout();
    } catch (e) {
      this.cutoutError = (e as Error).message;
    } finally {
      this.cutoutBusy = false;
    }
  }

  /**
   * The cut-out editor.
   *
   * Laid out in the order the work actually happens: the automatic pass has already run
   * by the time this opens, so the canvas comes first and everything below it is repair.
   * The tool row is what turns this from a one-slider filter into an editor — click a
   * region the automatic fill couldn't reach, or paint the bits it got wrong.
   *
   * The before/after toggle is press-and-hold rather than a checkbox. Comparing means
   * flicking between the two, and a checkbox makes that two deliberate clicks in
   * opposite corners of your attention.
   */
  private renderCutoutDialog() {
    if (!this.cutout) return nothing;
    const brushing = this.cutoutTool !== "remove";
    const cutPct = Math.round(this.cutFraction * 100);
    const reviewingOutfit = !!this.cutout.outfitShotId;
    return html`
      <div class="overlay" @click=${(e: Event) => { if (e.target === e.currentTarget) void this.closeCutout(); }}>
        <div class="dialog cutout-dialog">
          <h3>Cut out the background</h3>
          <div class="sec-note">
            The automatic pass clears the outer backdrop and strongly contrasted gaps
            through hair while protecting skin-toned reflections. Inspect it by hand,
            repair ambiguous edges with the tools, and zoom in for fine details.
          </div>

          <div class="cut-zoom">
            <button class="btn" title="Zoom out" @click=${() => this.setCutoutZoom(this.cutoutZoom - 0.25)}>
              <span class="material-symbols-rounded" style="font-size:17px;">zoom_out</span>
            </button>
            <input aria-label="Cutout zoom" type="range" min="25" max="400" step="25"
              .value=${String(Math.round(this.cutoutZoom * 100))}
              @input=${(e: Event) => this.setCutoutZoom(Number((e.target as HTMLInputElement).value) / 100)} />
            <output>${Math.round(this.cutoutZoom * 100)}%</output>
          </div>

          <div
            class="cutout-canvas ${brushing ? "brushing" : "picking"} ${this.showOriginal ? "before" : ""} ${this.cutoutContrast ? "contrast" : ""}"
            @pointerdown=${(e: PointerEvent) => void this.onCutoutPointerDown(e)}
            @pointermove=${(e: PointerEvent) => void this.onCutoutPointerMove(e)}
            @pointerup=${() => this.onCutoutPointerUp()}
            @pointercancel=${() => this.onCutoutPointerUp()}
          ></div>

          ${this.cutoutError ? html`<div class="banner">${this.cutoutError}</div>` : nothing}

          <div class="cut-row">
            <span class="cut-stat">
              ${this.showOriginal ? "Showing the original" : `${cutPct}% removed`}
            </span>
            <button
              class="btn"
              title="Hold to see the untouched image"
              @pointerdown=${() => void this.toggleOriginal(true)}
              @pointerup=${() => void this.toggleOriginal(false)}
              @pointerleave=${() => this.showOriginal && void this.toggleOriginal(false)}
            >
              <span class="material-symbols-rounded" style="font-size:17px;">compare</span> Before
            </button>
            <button class="btn ${this.cutoutContrast ? "primary" : ""}"
              title="Put vivid magenta behind transparency so leftover background and missing subject pixels stand out"
              @click=${() => (this.cutoutContrast = !this.cutoutContrast)}>
              <span class="material-symbols-rounded" style="font-size:17px;">contrast</span>
              Contrast layer
            </button>
            <button class="btn" ?disabled=${!this.canUndo} title="Undo (one step per stroke)"
              @click=${() => void this.undoCutout()}>
              <span class="material-symbols-rounded" style="font-size:17px;">undo</span>
            </button>
            <button class="btn" ?disabled=${!this.canRedo} title="Redo"
              @click=${() => void this.redoCutout()}>
              <span class="material-symbols-rounded" style="font-size:17px;">redo</span>
            </button>
            <button class="btn" title="Put every pixel back" @click=${() => void this.resetCutout()}>
              <span class="material-symbols-rounded" style="font-size:17px;">restart_alt</span>
            </button>
          </div>

          <div class="cut-row">
            ${([
              ["remove", "colorize", "Remove colour"],
              ["subtract", "ink_eraser", "Erase"],
              ["add", "brush", "Restore"],
            ] as const).map(
              ([tool, icon, label]) => html`<button
                class="btn ${this.cutoutTool === tool ? "primary" : ""}"
                @click=${() => (this.cutoutTool = tool)}
              >
                <span class="material-symbols-rounded" style="font-size:17px;">${icon}</span>
                ${label}
              </button>`,
            )}
          </div>

          ${brushing
            ? html`<div>
                <label class="field">Brush size · ${this.brushSize} px</label>
                <input type="range" min="4" max="160" step="2" .value=${String(this.brushSize)}
                  @input=${(e: Event) => (this.brushSize = Number((e.target as HTMLInputElement).value))} />
              </div>`
            : html`
                <div>
                  <label class="field">Colour tolerance · ${this.cutoutTolerance}</label>
                  <input type="range" min="4" max="140" step="2" .value=${String(this.cutoutTolerance)}
                    @input=${(e: Event) => (this.cutoutTolerance = Number((e.target as HTMLInputElement).value))} />
                </div>
                <label class="cut-check">
                  <input type="checkbox" .checked=${this.contiguous}
                    @change=${(e: Event) => (this.contiguous = (e.target as HTMLInputElement).checked)} />
                  <span>
                    Contiguous only
                    <span class="cut-hint">
                      — takes just the patch you clicked. Turn it off to remove that colour
                      everywhere, which is what a broken-up backdrop needs and what will
                      also take the subject's eyes if they happen to match.
                    </span>
                  </span>
                </label>
                <div class="cut-row">
                  <button class="btn" ?disabled=${this.cutoutBusy} @click=${() => void this.autoCutout()}>
                    <span class="material-symbols-rounded" style="font-size:17px;">auto_fix_high</span>
                    Re-run automatic pass
                  </button>
                </div>
              `}

          <div>
            <label class="field">Edge feather · ${this.cutoutFeather} px</label>
            <input type="range" min="0" max="12" step="1" .value=${String(this.cutoutFeather)}
              @input=${(e: Event) => {
                this.cutoutFeather = Number((e.target as HTMLInputElement).value);
                void this.paintCutout();
              }} />
          </div>
          <div>
            <label class="field">
              Spill suppression · ${Math.round(this.cutoutSpill * 100)}%
            </label>
            <input type="range" min="0" max="100" step="5" .value=${String(Math.round(this.cutoutSpill * 100))}
              @input=${(e: Event) => {
                this.cutoutSpill = Number((e.target as HTMLInputElement).value) / 100;
                void this.paintCutout();
              }} />
            <div class="cut-hint">
              Pulls the backdrop's colour out of the soft rim, so hair cut off a green
              screen stops looking green. Feather and spill are re-applied from the mask
              every time, so neither is a one-way door.
            </div>
          </div>

          <div class="dialog-actions">
            <button class="btn" @click=${() => void this.closeCutout()}>Close</button>
            <button class="btn" ?disabled=${this.cutoutBusy || !this.session}
              @click=${() => void this.downloadCutout()}>
              <span class="material-symbols-rounded" style="font-size:17px;">download</span> Download PNG
            </button>
            <button class="btn primary" ?disabled=${this.cutoutBusy || !this.session}
              @click=${() => void (reviewingOutfit ? this.applyOutfitCutout() : this.saveCutout())}>
              <span class="material-symbols-rounded" style="font-size:17px;">${reviewingOutfit ? "check" : "save"}</span>
              ${this.cutoutBusy
                ? "Working…"
                : reviewingOutfit ? "Use for outfit" : "Save to library"}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private renderCharEditor(d: CharDraft) {
    const existingThumb =
      d.imageData ?? (d.id && this.characters.find((c) => c.id === d.id)?.hasThumb
        ? `${api.characterThumbURL(d.id)}?v=${this.thumbVersion}`
        : undefined);
    return html`
      <div class="overlay" @click=${(e: Event) => { if (e.target === e.currentTarget) this.charDraft = null; }}>
        <div class="dialog">
          <h3>${d.id ? "Edit character" : "New character"}</h3>
          <div>
            <label class="field">Name</label>
            <input type="text" .value=${d.name} placeholder="Rin"
              @input=${(e: Event) => (this.charDraft = { ...d, name: (e.target as HTMLInputElement).value })} />
          </div>
          <div>
            <label class="field">Prompt fragment</label>
            <textarea .value=${d.prompt} placeholder="1girl, red hair, green eyes, …"
              @input=${(e: Event) => (this.charDraft = { ...d, prompt: (e.target as HTMLTextAreaElement).value })}></textarea>
          </div>
          <div>
            <label class="field">Negative fragment (optional)</label>
            <textarea .value=${d.negativePrompt} placeholder="blonde, …"
              @input=${(e: Event) => (this.charDraft = { ...d, negativePrompt: (e.target as HTMLTextAreaElement).value })}></textarea>
          </div>
          <div class="dialog-thumb">
            ${existingThumb
              ? html`<img src=${existingThumb} alt="Thumbnail" />`
              : html`<div class="card-blank" style="width:72px; height:96px; aspect-ratio:auto; border-radius:10px;">
                  <span class="material-symbols-rounded">person</span>
                </div>`}
            <label class="btn">
              Choose thumbnail…
              <input class="hidden-file" type="file" accept="image/*" @change=${(e: Event) => this.onCharThumbFile(e)} />
            </label>
            <label class="btn ${this.scanBusy ? "disabled" : ""}"
              title="Read booru tags off an image and add them to the prompt">
              <span class="material-symbols-rounded" style="font-size:16px; vertical-align:-3px;">
                ${this.scanBusy ? "hourglass_top" : "auto_awesome"}
              </span>
              ${this.scanBusy ? "Scanning…" : "Scan image for tags"}
              <input class="hidden-file" type="file" accept="image/*"
                ?disabled=${this.scanBusy}
                @change=${(e: Event) => this.onCharScanFile(e)} />
            </label>
          </div>
          <div class="dialog-actions">
            ${d.id
              ? html`<button class="btn danger" ?disabled=${this.charBusy} @click=${() => this.deleteCharacter()}>
                  Delete
                </button>`
              : nothing}
            <button class="btn" @click=${() => (this.charDraft = null)}>Cancel</button>
            <button class="btn primary" ?disabled=${!d.name.trim() || this.charBusy} @click=${() => this.saveCharacter()}>
              Save
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private renderPrompt() {
    const outputCount = this.outfitOn ? 1 : this.count;
    const triggerPhrases = [...new Set(
      (this.status?.loras ?? [])
        .filter((lora) => lora.name in this.selectedLoras)
        .flatMap((lora) => lora.triggerPhrases ?? []),
    )];
    return html`
      <div class="prompt-card">
        <div class="prompt-head">
          <span class="prompt-title">Prompt</span>
          <span class="toolbar-spacer"></span>
          <div class="speech-row">
            <div class="speech-hint">
              ${this.listening
                ? this.speech || "Listening…"
                : this.optimizing
                  ? "Turning that into a prompt…"
                  : this.speechSupported
                    ? "Voice prompt"
                    : "Voice unavailable"}
            </div>
            ${this.speechSupported
              ? html`<button
                  class="mic ${this.listening ? "live" : ""}"
                  title=${this.listening ? "Stop listening" : "Speak your idea"}
                  @click=${() => this.toggleListening()}
                >
                  <span class="material-symbols-rounded">${this.listening ? "stop" : "mic"}</span>
                </button>`
              : nothing}
          </div>
        </div>

        <div class="prompt-grid">
          <div class="prompt-field">
            <span class="field-tag">Positive</span>
            <textarea
              aria-label="Positive prompt"
              .value=${this.prompt}
              placeholder="Describe what you want to create…"
              @input=${(e: Event) => {
                this.prompt = (e.target as HTMLTextAreaElement).value;
                void this.updateTagSuggestions();
              }}
            ></textarea>
          </div>
          <div class="prompt-field">
            <span class="field-tag negative">Negative</span>
            <textarea
              aria-label="Negative prompt"
              .value=${this.negative}
              placeholder="What should be excluded…"
              @input=${(e: Event) => (this.negative = (e.target as HTMLTextAreaElement).value)}
            ></textarea>
          </div>
        </div>

        ${this.tagCorrection ? html`<div class="sec-note">Did you mean
          <button class="chip" @click=${() => this.applySuggestedTag(this.tagCorrection)}>${this.tagCorrection}</button>?
        </div>` : nothing}
        ${this.tagSuggestions.length ? html`<div class="chips">
          ${this.tagSuggestions.map((tag) => html`<button class="chip" @click=${() => this.applySuggestedTag(tag)}>${tag}</button>`)}
        </div>` : nothing}
        ${triggerPhrases.length ? html`<div class="chips">
          ${triggerPhrases.map((phrase) => html`<button
            class="chip ${this.selectedTriggers.includes(phrase) ? "on" : ""}"
            title="Add or remove LoRA trigger phrase"
            @click=${() => this.toggleTrigger(phrase)}>${phrase}</button>`)}
        </div>` : nothing}

        ${this.showOptions ? html`<div class="prompt-options">${this.renderPromptOptions()}</div>` : nothing}

        <div class="prompt-footer">
          <button class="adv-toggle" @click=${() => (this.showOptions = !this.showOptions)}>
            <span class="material-symbols-rounded" style="font-size:17px;">${this.showOptions ? "expand_less" : "tune"}</span>
            ${this.showOptions ? "Hide size" : "Size"}
          </button>
          <span class="prompt-summary">${this.steps} steps · CFG ${this.cfg} · ${outputCount} image${outputCount === 1 ? "" : "s"}</span>
          <button class="generate" ?disabled=${this.generating || !this.assemblePrompts().prompt.trim()} @click=${() => this.generate()}>
            ${this.generating
              ? html`<md-circular-progress indeterminate style="--md-circular-progress-size:20px;"></md-circular-progress>
                  ${this.status?.backend === "invokeai" ? "Invoking…" : "Generating…"}`
              : html`<span class="material-symbols-rounded" style="font-size:19px;">auto_awesome</span>
                  ${this.status?.backend === "invokeai" ? "Invoke" : "Generate"}`}
          </button>
        </div>
      </div>
    `;
  }

  /** Applies the automatically-started, manually-reviewed mask to its outfit square.
   * The generated preview is replaced in memory so display, ZIP export, ordinary
   * download and a later library save all agree on the exact corrected PNG. */
  private async applyOutfitCutout() {
    const canvas = this.exportCanvas();
    const shotId = this.cutout?.outfitShotId;
    const reviewing = this.shots.find((shot) => shot.id === shotId);
    if (!canvas || !shotId || !reviewing || this.cutoutBusy) return;
    this.cutoutBusy = true;
    try {
      const png = canvas.toDataURL("image/png");
      // The kept copy is corrected first. If only one of the two writes can happen it
      // must be this one — the preview is a cache, and this is the wardrobe.
      const wardrobeId = reviewing.wipOutfitId || await this.ensureWardrobe();
      await api.putLibbyOutfitWip(
        wardrobeId, reviewing.outfitSlot!.emotion, reviewing.outfitSlot!.tier,
        {
          imageData: png,
          filename: reviewing.outfitFilename,
          seed: reviewing.seed,
          reviewed: true,
          config: reviewing.outfitConfig,
          info: reviewing.info,
        },
      );
      // Best effort: an expired preview is exactly the case this store exists for, and
      // failing here would throw away a cutout that is already safely on disk.
      if (!shotId.startsWith("wip-")) {
        try {
          await api.replaceGenPreview(shotId, png);
        } catch { /* the wardrobe copy is the one that is read back */ }
      }
      const version = Date.now();
      this.shots = this.shots.map((shot) => shot.id === shotId
        ? { ...shot, cutoutReviewed: true, previewVersion: version, wipOutfitId: wardrobeId }
        : shot);
      this.persistDraft();
      this.showToast("Reviewed cutout applied to this outfit state.");
      void this.closeCutout();
      // A reviewed square is a finished sprite, so it goes into the wardrobe now
      // rather than waiting for a ZIP the user then has to upload by hand. Filing is
      // best-effort: a wardrobe that cannot be written must not cost the user the
      // cutout they just reviewed, so it reports and leaves the square in place.
      void this.fileSpriteToWardrobe(shotId, canvas, wardrobeId);
    } catch (e) {
      this.cutoutError = (e as Error).message;
    } finally {
      this.cutoutBusy = false;
    }
  }

  /**
   * Puts one reviewed sprite into the chosen wardrobe's (emotion, tier) slot.
   *
   * This is what makes the studio a wardrobe builder rather than a ZIP factory: the
   * mascot is wearing the square seconds after it is approved, which is also the only
   * honest way to judge whether the cutout was good enough.
   */
  private async fileSpriteToWardrobe(shotId: string, canvas: HTMLCanvasElement, into?: string) {
    // The wardrobe already holding this square wins over the picker, so approving an
    // older square files it where the rest of its set lives.
    const wardrobeId = into || this.outfitWardrobeId;
    if (!wardrobeId) return;
    const slot = this.shots.find((shot) => shot.id === shotId)?.outfitSlot;
    if (!slot) return;
    try {
      await api.setLibbyEmotion(wardrobeId, slot.emotion, canvas.toDataURL("image/png"), slot.tier);
      this.wardrobes = await api.libbyOutfits().then((r) => r.outfits);
      // The wardrobe panel keeps its own copy of the list for its cards, so it is told
      // to re-read rather than left showing a count that is now one sprite behind.
      void this.renderRoot.querySelector("oppai-outfit-wardrobe")?.refresh();
      const name = this.wardrobes.find((o) => o.id === wardrobeId)?.name ?? "the wardrobe";
      this.showToast(`Filed ${slot.tierLabel} · ${slot.emotionLabel} into ${name}.`);
    } catch (e) {
      this.showToast(`Saved the cutout, but filing it failed: ${(e as Error).message}`);
    }
  }

  // ── outfit studio: saved recipes and target wardrobes ───────────────────────

  /** Fetches the studio's own two lists. Only the studio needs them, so the Create
   * screen never pays for the round-trips. */
  private async loadStudio() {
    if (this.studioLoaded) return;
    this.studioLoaded = true;
    try {
      const [loadouts, outfits] = await Promise.all([api.libbyLoadouts(), api.libbyOutfits()]);
      this.loadouts = loadouts.loadouts;
      this.wardrobes = outfits.outfits;
      // A target wardrobe deleted on another device must not keep being written to.
      if (this.outfitWardrobeId && !this.wardrobes.some((o) => o.id === this.outfitWardrobeId)) {
        this.outfitWardrobeId = "";
      }
      if (this.outfitLoadoutId && !this.loadouts.some((l) => l.id === this.outfitLoadoutId)) {
        this.outfitLoadoutId = "";
      }
      // Whatever is on disk is the truth about what has been generated, so the board is
      // rebuilt from it rather than from a local draft whose previews may be long gone.
      await this.loadWipBoard(this.outfitWardrobeId);
    } catch (e) {
      // Not fatal: the board still generates and still exports a ZIP without them.
      this.showToast(`Couldn't load your saved outfits: ${(e as Error).message}`);
      this.studioLoaded = false;
    }
  }

  /** Everything about the board worth keeping, as the opaque body the server stores. */
  private loadoutBody(): Record<string, unknown> {
    return {
      version: 1,
      gear: this.outfitGear,
      theme: this.outfitText.trim(),
      background: this.outfitBackground,
      underwearColor: this.outfitUnderwearColor,
      pubicHair: this.outfitPubicHair,
      pubicHairColor: this.outfitPubicHairColor,
      lockColors: this.outfitLockColors,
      shot: this.camera.shot,
    };
  }

  /** Applies a saved recipe to the board. Every field is read defensively and merged
   * over what is already there, because the body is whatever some client wrote. */
  private applyLoadout(saved: LibbyLoadout) {
    const body = saved.loadout ?? {};
    const str = (key: string, fallback: string) =>
      typeof body[key] === "string" ? (body[key] as string) : fallback;
    this.outfitGear = normalizeOutfitGear(body.gear);
    this.outfitText = str("theme", saved.name);
    this.outfitBackground = body.background === "black" ? "black" : "white";
    this.outfitUnderwearColor = str("underwearColor", this.outfitUnderwearColor);
    this.outfitPubicHair = body.pubicHair === true;
    this.outfitPubicHairColor = str("pubicHairColor", this.outfitPubicHairColor);
    this.outfitLockColors = body.lockColors !== false;
    const shot = str("shot", "");
    if (shot && CAMERA_OPTIONS.shots.some((s) => s.id === shot)) {
      this.editCamera({ shot: shot as ShotSize });
    }
    this.outfitLoadoutId = saved.id;
    this.outfitOn = true;
    this.persistDraft();
    this.showToast(`Equipped “${saved.name}”.`);
  }

  /** Saves the board. `asNew` forces a new record rather than overwriting the recipe
   * the board came from — the difference between editing an outfit and basing one on it. */
  private async saveLoadout(asNew: boolean) {
    if (this.loadoutBusy) return;
    const fallback = this.outfitText.trim();
    const current = this.loadouts.find((l) => l.id === this.outfitLoadoutId);
    const suggested = asNew ? fallback : (current?.name ?? fallback);
    const name = window.prompt("Name this loadout", suggested || "New loadout")?.trim();
    if (!name) return;
    this.loadoutBusy = true;
    try {
      const saved = await api.saveLibbyLoadout({
        id: asNew ? undefined : this.outfitLoadoutId || undefined,
        name,
        loadout: this.loadoutBody(),
      });
      this.outfitLoadoutId = saved.id;
      this.loadouts = (await api.libbyLoadouts()).loadouts;
      this.persistDraft();
      this.showToast(`Saved “${saved.name}”.`);
    } catch (e) {
      this.showToast((e as Error).message);
    } finally {
      this.loadoutBusy = false;
    }
  }

  private async deleteLoadout(saved: LibbyLoadout) {
    if (this.loadoutBusy || !window.confirm(`Delete the loadout “${saved.name}”?`)) return;
    this.loadoutBusy = true;
    try {
      await api.deleteLibbyLoadout(saved.id);
      this.loadouts = this.loadouts.filter((l) => l.id !== saved.id);
      if (this.outfitLoadoutId === saved.id) this.outfitLoadoutId = "";
      this.showToast(`Deleted “${saved.name}”.`);
    } catch (e) {
      this.showToast((e as Error).message);
    } finally {
      this.loadoutBusy = false;
    }
  }

  /**
   * Uses the selected square as the saved recipe's cover.
   *
   * A loadout's thumbnail is the whole point of the gallery — ten lines of garment
   * text all look alike, and a picture of the outfit does not. It comes from a square
   * that has already been generated and reviewed, so there is nothing extra to make.
   */
  private async setLoadoutCoverFromSelection() {
    const saved = this.loadouts.find((l) => l.id === this.outfitLoadoutId);
    if (!saved || this.loadoutBusy) return;
    const shot = this.currentOutfitShots().find((s) => s.outfitFilename === this.outfitSlot().filename)
      ?? this.currentOutfitShots()[0];
    if (!shot) {
      this.showToast("Generate a square first — its picture becomes the cover.");
      return;
    }
    this.loadoutBusy = true;
    try {
      const response = await fetch(this.previewURL(shot), { credentials: "same-origin" });
      if (!response.ok) throw new Error(`preview returned ${response.status}`);
      const dataURL = await blobToDataURL(await response.blob());
      await api.setLibbyLoadoutThumb(saved.id, dataURL);
      this.loadoutCoverVersion = Date.now();
      this.loadouts = (await api.libbyLoadouts()).loadouts;
      this.showToast("Cover updated.");
    } catch (e) {
      this.showToast((e as Error).message);
    } finally {
      this.loadoutBusy = false;
    }
  }

  private async createWardrobe() {
    const name = window.prompt("Name the wardrobe these sprites go into",
      this.outfitText.trim() || "New wardrobe")?.trim();
    if (!name) return;
    try {
      const made = await api.saveLibbyOutfit({ name });
      this.wardrobes = (await api.libbyOutfits()).outfits;
      this.outfitWardrobeId = made.id;
      this.persistDraft();
      // An empty wardrobe, so this clears the board of the previous set rather than
      // leaving squares that belong to a different one on screen.
      await this.loadWipBoard(made.id);
      this.showToast(`Squares will be kept in “${made.name}”.`);
    } catch (e) {
      this.showToast((e as Error).message);
    }
  }

  private async updateTagSuggestions() {
    const query = this.prompt.split(",").at(-1)?.trim() ?? "";
    if (query.length < 2) { this.tagSuggestions = []; this.tagCorrection = ""; return; }
    try {
      const result = await api.booruTags(query);
      this.tagSuggestions = result.suggestions;
      this.tagCorrection = result.correction ?? "";
    } catch { this.tagSuggestions = []; this.tagCorrection = ""; }
  }

  private applySuggestedTag(tag: string) {
    const parts = this.prompt.split(",");
    parts[parts.length - 1] = ` ${tag}`;
    this.prompt = parts.join(",").trimStart() + ", ";
    this.tagSuggestions = [];
    this.tagCorrection = "";
  }

  private renderPromptOptions() {
    return html`
      <div>
        <label class="field">Resolution</label>
        <div class="chips">
          ${RESOLUTIONS.map((r) => {
            const on = r.w === this.width && r.h === this.height;
            return html`<button
              class="chip ${on ? "on" : ""}"
              @click=${() => {
                this.width = r.w;
                this.height = r.h;
              }}
            >${r.label}<span class="hint">${r.hint}</span></button>`;
          })}
        </div>
      </div>
      <div class="custom-size">
        <div>
          <label class="field">Width</label>
          <input class="num" type="number" min="64" max="2048" step="8" .value=${String(this.width)}
            @input=${(e: Event) => (this.width = clampNum((e.target as HTMLInputElement).value, 64, 2048, 512))} />
        </div>
        <span class="material-symbols-rounded" style="margin-top:22px; color:var(--oppai-text-muted);">close</span>
        <div>
          <label class="field">Height</label>
          <input class="num" type="number" min="64" max="2048" step="8" .value=${String(this.height)}
            @input=${(e: Event) => (this.height = clampNum((e.target as HTMLInputElement).value, 64, 2048, 768))} />
        </div>
      </div>
    `;
  }

  /**
   * One image's complete generation data, shown before it is copied.
   *
   * Shown rather than copied blind, because the useful thing about generation data is
   * usually reading one value out of it — what seed was that, what CFG — and a button
   * that silently fills the clipboard makes you paste somewhere to find out. The text
   * is selectable, so a single field can be taken without the whole block.
   */
  private renderGenInfo(shot: Shot) {
    const info = shot.info;
    if (!info) {
      return html`<div class="geninfo">
        <p class="geninfo-note">
          No data was recorded for this image — it was restored from a saved draft by an
          older build. Generate again to capture it.
        </p>
      </div>`;
    }
    return html`
      <div class="geninfo">
        <pre class="geninfo-text">${toInfotext(info)}</pre>
        <div class="geninfo-row">
          <button class="act primary" @click=${() => void this.copyGenInfo(shot, "text")}>
            <span class="material-symbols-rounded" style="font-size:16px;">content_copy</span>
            Copy parameters
          </button>
          <button class="act" title="Everything, including the fields A1111's format has no room for"
            @click=${() => void this.copyGenInfo(shot, "json")}>
            <span class="material-symbols-rounded" style="font-size:16px;">data_object</span>
            Copy JSON
          </button>
          <button class="act" @click=${() => (this.infoFor = null)}>
            <span class="material-symbols-rounded" style="font-size:16px;">close</span>
          </button>
        </div>
      </div>
    `;
  }

  private nodePosition(shot: Shot, index: number) {
    const fallback = this.defaultNodePosition(index);
    return {
      x: shot.workspaceX ?? fallback.workspaceX,
      y: shot.workspaceY ?? fallback.workspaceY,
    };
  }

  private beginNodeDrag(shot: Shot, index: number, e: PointerEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    const at = this.nodePosition(shot, index);
    this.activeNodeId = shot.id;
    this.draggingNode = {
      id: shot.id,
      pointerId: e.pointerId,
      clientX: e.clientX,
      clientY: e.clientY,
      x: at.x,
      y: at.y,
    };
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  }

  private moveNode(e: PointerEvent) {
    const drag = this.draggingNode;
    if (!drag || drag.pointerId !== e.pointerId) return;
    e.preventDefault();
    const workspaceX = Math.max(0, Math.round(drag.x + e.clientX - drag.clientX));
    const workspaceY = Math.max(0, Math.round(drag.y + e.clientY - drag.clientY));
    this.shots = this.shots.map((shot) => shot.id === drag.id
      ? { ...shot, workspaceX, workspaceY }
      : shot);
  }

  private endNodeDrag(e: PointerEvent) {
    if (!this.draggingNode || this.draggingNode.pointerId !== e.pointerId) return;
    this.draggingNode = null;
    this.persistDraft();
  }

  /** Clears result nodes only. Prompt, model and outfit controls deliberately remain in
   * place so this behaves like clearing a canvas rather than starting the studio over. */
  private clearWorkspace() {
    if (!this.shots.length || !confirm("Clear every generated image from this workspace? Unsaved previews will no longer be shown.")) return;
    this.shots = [];
    this.expandedShot = null;
    this.infoFor = null;
    this.activeNodeId = null;
    this.outfitProgress = "";
    this.persistDraft();
  }

  /**
   * The wardrobe as a contact sheet: every slot, in wardrobe order.
   *
   * This is the studio's main view rather than the free canvas because the work is a
   * set. What you need to see is which of the sixty squares exist, which still need
   * their cutout reviewed, and which are missing — and all three are answered by
   * looking at the grid rather than by dragging nodes around to line them up.
   */
  private renderOutfitSheet() {
    const byName = new Map(this.currentOutfitShots().map((shot) => [shot.outfitFilename, shot]));
    const selected = this.outfitSlot().filename;
    return html`
      <div class="outfit-sheet">
        ${OUTFIT_TIERS.map((tier, tierIndex) => {
          const cells = OUTFIT_FACES.map((face, faceIndex) => {
            const state = this.outfitSlot(tierIndex, faceIndex);
            return { face, faceIndex, state, shot: byName.get(state.filename) };
          });
          const made = cells.filter((cell) => cell.shot).length;
          const done = cells.filter((cell) => cell.shot?.cutoutReviewed).length;
          return html`<section class="sheet-tier">
            <header class="sheet-tier-head">
              <span class="material-symbols-rounded" style="font-size:15px;">local_fire_department</span>
              ${tier.label}
              <span class="tier-count">
                ${made}/${OUTFIT_FACES.length} generated${made ? ` · ${done} reviewed` : ""}
              </span>
            </header>
            <div class="sheet-grid">
              ${cells.map(({ face, state, shot }) => {
                const current = state.filename === selected;
                return html`<div class="sheet-cell ${current ? "current" : ""}">
                  <button
                    class="sheet-hit"
                    title=${shot
                      ? `${tier.label} · ${face.label} — click to aim the generator here`
                      : `Not generated yet — click to aim the generator at ${tier.label} · ${face.label}`}
                    @click=${() => this.selectOutfitSlot(state.slot.index)}
                  >
                    ${shot
                      ? html`<img class="art" src=${this.previewURL(shot)} alt=${face.label} loading="lazy" />`
                      : html`<div class="art-empty">
                          <span class="material-symbols-rounded" style="font-size:22px;">add_photo_alternate</span>
                        </div>`}
                    <div class="cell-label">
                      <span>${face.label}</span>
                      ${shot
                        ? html`<span class="cell-state ${shot.cutoutReviewed ? "ready" : "needs"}"
                            title=${shot.cutoutReviewed ? "Cutout reviewed" : "Needs a cutout review"}></span>`
                        : nothing}
                    </div>
                  </button>
                  ${shot ? html`<div class="sheet-actions">
                    <button class="sheet-act" title="Expand" @click=${() => (this.expandedShot = shot)}>
                      <span class="material-symbols-rounded" style="font-size:15px;">zoom_in</span>
                    </button>
                    <button class="sheet-act"
                      title=${shot.cutoutReviewed ? "Adjust this cutout again" : "Review the automatic cutout"}
                      @click=${() => void this.openCutout(
                        this.previewURL(shot), `seed-${shot.seed}`, shot.outfitFilename, shot.id,
                      )}>
                      <span class="material-symbols-rounded" style="font-size:15px;">background_replace</span>
                    </button>
                    <button class="sheet-act danger" title="Delete this square"
                      @click=${() => void this.deleteOutfitSquare(shot)}>
                      <span class="material-symbols-rounded" style="font-size:15px;">delete</span>
                    </button>
                  </div>` : nothing}
                </div>`;
              })}
            </div>
          </section>`;
        })}
      </div>
    `;
  }

  /**
   * Throws one square away, on disk as well as on screen.
   *
   * The only route by which a generated square is lost, short of deleting the whole
   * wardrobe — everything else (a redo, a cleared canvas, a closed tab, a restart)
   * keeps it. So it asks first.
   */
  private async deleteOutfitSquare(shot: Shot) {
    const slot = shot.outfitSlot;
    if (!slot) return;
    if (!confirm(`Delete the ${slot.tierLabel} · ${slot.emotionLabel} square? It will need generating again.`)) return;
    try {
      if (shot.wipOutfitId) await api.deleteLibbyOutfitWip(shot.wipOutfitId, slot.emotion, slot.tier);
      if (!shot.id.startsWith("wip-")) await api.deleteGenPreview(shot.id).catch(() => undefined);
      this.shots = this.shots.filter((s) => s.id !== shot.id);
      this.persistDraft();
      this.showToast(`Deleted ${slot.tierLabel} · ${slot.emotionLabel}.`);
    } catch (e) {
      this.showToast((e as Error).message);
    }
  }

  private renderResults() {
    // The studio shows the set; the Create screen shows the canvas.
    if (this.studio && this.outfitOn) return this.renderOutfitSheet();
    if (!this.shots.length) {
      return html`<div class="canvas-empty">
        <span class="material-symbols-rounded">image</span>
        <strong>Your generation canvas</strong>
        <span>Choose a model and write a prompt. New images appear here while the full history stays in the gallery.</span>
      </div>`;
    }
    const positions = this.shots.map((shot, index) => this.nodePosition(shot, index));
    const extentX = Math.max(600, ...positions.map((p) => p.x + 290));
    const extentY = Math.max(480, ...positions.map((p) => p.y + 450));
    return html`
      <div class="results" style=${`width:${extentX}px;height:${extentY}px;`}>
        ${this.shots.map(
          (shot, index) => {
            const at = positions[index];
            return html`
            <div class="shot ${this.activeNodeId === shot.id ? "active" : ""}"
              style=${`left:${at.x}px;top:${at.y}px;`}>
              <div class="node-handle"
                title="Drag to move this image"
                @pointerdown=${(e: PointerEvent) => this.beginNodeDrag(shot, index, e)}
                @pointermove=${(e: PointerEvent) => this.moveNode(e)}
                @pointerup=${(e: PointerEvent) => this.endNodeDrag(e)}
                @pointercancel=${(e: PointerEvent) => this.endNodeDrag(e)}>
                <span class="material-symbols-rounded" style="font-size:16px;">drag_indicator</span>
                <span class="node-title">${shot.outfitSlot
                  ? `${shot.outfitSlot.tierLabel} · ${shot.outfitSlot.emotionLabel}`
                  : `Seed ${shot.seed}`}</span>
              </div>
              <img
                src=${this.previewURL(shot)}
                alt="Generated image"
                loading="lazy"
                style="cursor: zoom-in;"
                title="Expand"
                @click=${() => (this.expandedShot = shot)}
                @contextmenu=${(e: MouseEvent) => this.openShotMenu(shot, e)}
              />
              ${shot.outfitSlot ? html`<div class="shot-slot">
                ${shot.outfitSlot.tierLabel} · ${shot.outfitSlot.emotionLabel}
              </div>` : nothing}
              <div class="shot-actions">
                <button class="act primary" ?disabled=${shot.saved} @click=${() => this.save(shot)}>
                  <span class="material-symbols-rounded" style="font-size:16px;"
                    >${shot.saved ? "check" : "save"}</span
                  >
                  ${shot.saved ? "Saved" : "Save"}
                </button>
                <button class="act" title=${shot.outfitSlot
                  ? shot.cutoutReviewed ? "Review or adjust this outfit cutout again" : "Review the automatic cutout by hand"
                  : "Cut the background out"}
                  @click=${() => void this.openCutout(
                    this.previewURL(shot), `seed-${shot.seed}`, shot.outfitFilename,
                    shot.outfitSlot ? shot.id : undefined,
                  )}>
                  <span class="material-symbols-rounded" style="font-size:16px;">background_replace</span>
                  ${shot.outfitSlot ? (shot.cutoutReviewed ? "Reviewed" : "Review cutout") : nothing}
                </button>
                ${this.status?.backend === "invokeai" ? html`<button class="act"
                  title="Set as this model's preview in InvokeAI" @click=${() => this.useAsModelThumb(shot)}>
                  <span class="material-symbols-rounded" style="font-size:16px;">photo_camera</span>
                </button>` : nothing}
                <button class="act" title="Copy this image's generation data"
                  @click=${() => (this.infoFor = this.infoFor === shot.id ? null : shot.id)}>
                  <span class="material-symbols-rounded" style="font-size:16px;">content_copy</span>
                </button>
                <button class="act" title="Export PNG with Civitai-compatible metadata"
                  @click=${() => void this.exportShot(shot)}>
                  <span class="material-symbols-rounded" style="font-size:16px;">download</span>
                </button>
              </div>
              ${this.infoFor === shot.id ? this.renderGenInfo(shot) : nothing}
            </div>
          `; },
        )}
      </div>
    `;
  }
}

/** Reads a fetched image into the base64 data URL the storage endpoints take. */
function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("couldn't read the image"));
    reader.readAsDataURL(blob);
  });
}

/** Clamp a numeric input's string value to an integer range, falling back to a default. */
function clampNum(v: string, lo: number, hi: number, def: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.min(hi, Math.max(lo, Math.round(n)));
}

/** Like clampNum but keeps fractional values (CFG scale moves in halves). */
function clampFloat(v: string, lo: number, hi: number, def: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.min(hi, Math.max(lo, n));
}

declare global {
  interface HTMLElementTagNameMap {
    "oppai-imagegen": OppaiImageGen;
  }
}
