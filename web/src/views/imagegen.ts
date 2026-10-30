import "@material/web/progress/circular-progress.js";
import { LitElement, html, css, nothing, type PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
// The board's index arithmetic and the input clamps, extracted so they can be tested
// without a component. See gen-grid.ts.
import {
  clampFloat,
  clampNum,
  slotKeyOf,
  squareAddress as addressOfSquare,
  squareIndex as indexOfSquare,
  type SquareAddress,
  type SquareLayout,
} from "../gen-grid.js";
import { iconStyles, motionStyles } from "../theme.js";
import {
  api,
  mascotSay,
  type GenCharacter,
  type GenLora,
  type LoraCivitaiResult,
  type ModelRename,
  type GenModel,
  type GenModelMeta,
  type GenPose,
  type GenPreview,
  type GenProgress,
  type GenWildcard,
  type GenTemplate,
  type GenVae,
  type GalleryBoard,
  type GenerateParams,
  type GenerateResult,
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
import { manageModelsNote } from "../model-manage.js";
import { importSuggestion, loraNegatives, swapPromptDefault } from "../model-defaults.js";
import {
  DEFAULT_OUTFIT_GEAR,
  OUTFIT_EXPOSURE_TIERS,
  EMPTY_OUTFIT_GEAR,
  OUTFIT_GEAR_SLOTS,
  gearColorNegatives,
  gearKey,
  gearPhrase,
  gearPromptLabel,
  gearPromptNoun,
  gearWorn,
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
import { LORA_DRAG_TYPE } from "./imagegen-loras.js";
import "./rename-dialog.js";
import "./imagegen-detailer.js";
import { animatePicture, clipsRunning, onClipsChange, type ClipPicture } from "./imagegen-video.js";
import { GALLERY_DRAG_TYPE } from "./imagegen-gallery.js";
import {
  loadLayout, loadPrompts, moveItem, patchShot, rememberPrompt, rememberShots, saveLayout, savePrompts, stepThrough,
  type RecentPrompt, type StudioMode,
} from "../studio-session.js";
import {
  BOARD_FILTERS, filterCounts, matchesFilter, moveOnMatrix, nextFilled, sampleLine,
  type BoardFilter, type BoardKey, type SquareState,
} from "../sprite-board.js";
import { RESOLUTIONS, SCHEDULERS } from "../gen-options.js";
import { studioStyles } from "./studio-styles.js";
import { aspectLabel, megapixels, previewFrame } from "../size-preview.js";
import "./civitai.js";
import type { CivitaiMode } from "./civitai.js";
import "./lora-train.js";
import type { PromptSettings } from "../civitai-prompt.js";
import {
  applyCompletion,
  escapeTag,
  formatCount,
  localCompletions,
  mergeCompletions,
  moveSelection,
  tokenAt,
  type Completion,
  type LocalSources,
  type PromptToken,
} from "../prompt-complete.js";
import type { OppaiInvokeGallery, UsePicture, UsePictureMode } from "./imagegen-gallery.js";
import "./imagegen-paint.js";
import type { PaintResult } from "./imagegen-paint.js";
import { sourceSize, type PaintStroke } from "../paint-mask.js";
import {
  customPassParams, customPassesFrom, detailerModels, fixLabel,
  passesFromModels, type CustomPass, type DetailerPasses, type DetailerValue,
} from "../detailer.js";
import {
  MAX_PEOPLE, newPerson, peopleAdvice, peopleFrom, putLoraOn, regionBoxes, regionNegatives, regionParams, sharedLoras,
  sharedTriggers, unwearLora, type RegionPerson,
} from "../regions.js";
import { renameKeys, renameLorasInPrompt, renamedMap } from "../model-rename.js";
import { hiresScale, hiresUpscalers, scaledSize, upscaleFactor } from "../upscale.js";
import {
  LORA_CATEGORIES, filedByCategory, moveToCategory, type LoraCategoryKey,
} from "../lora-categories.js";

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
}

type CreateTab = "models" | "loras" | "look" | "wildcards" | "detailer" | "settings";

/** A picture a run starts from instead of noise: the whole of it (image to image),
    the painted part of it (paint to fix), or only its faces (the detailer alone). */
interface StartPicture {
  url: string;
  name: string;
  width: number;
  height: number;
  /** Never "animate": a clip's picture is the Video studio's, not a run's start. */
  mode: Exclude<UsePictureMode, "animate">;
  /** Made from a file on this computer, and released when it is let go. */
  objectURL?: boolean;
  /** Its name in the studio's gallery, when it is there: the server reads it from
      there rather than being sent it back. */
  gallery?: string;
}

/** The Image studio's inspector tabs, down its rail in this order. Video used to be one
    of these; it is a mode of the studio now, with a stage of its own. */
const CREATE_TABS: { id: CreateTab; label: string; icon: string }[] = [
  { id: "models", label: "Models", icon: "deployed_code" },
  { id: "loras", label: "LoRAs", icon: "style" },
  { id: "look", label: "Look", icon: "face" },
  { id: "wildcards", label: "Wildcards", icon: "category" },
  { id: "detailer", label: "ADetailer", icon: "face_retouching_natural" },
  { id: "settings", label: "Settings", icon: "tune" },
];

/** The Sprites inspector's tabs. The recipe was one accordion of eleven sections, read
    top to bottom; these are the four things it is actually about. */
type SpriteTab = "outfit" | "look" | "prompt" | "generator";
const SPRITE_TABS: { id: SpriteTab; label: string; icon: string }[] = [
  { id: "outfit", label: "Outfit", icon: "checkroom" },
  { id: "look", label: "Look", icon: "photo_camera" },
  { id: "prompt", label: "Prompt", icon: "edit_note" },
  { id: "generator", label: "Generator", icon: "deployed_code" },
];

const MODES: { id: StudioMode; label: string; icon: string }[] = [
  { id: "image", label: "Image", icon: "image" },
  { id: "video", label: "Video", icon: "movie" },
  { id: "sprites", label: "Sprites", icon: "face_retouching_natural" },
];

/** A run made ready while another is drawing: its parameters were read off the form
    when it was queued, so the form can go on changing without changing it. */
interface QueuedRun {
  id: string;
  label: string;
  prepared: PreparedRun;
}

/** Everything a run needs that is read off the form, read at once. */
interface PreparedRun {
  params: GenerateParams;
  from: StartPicture | null;
  outfit?: { slot: DraftOutfitSlot; filename: string };
  outfitConfig?: string;
  /** What the generation record says beyond the parameters, as the form had it. */
  extras: {
    triggers: string[];
    characters: string[];
    poses: string[];
    outfit: string;
    controlImage?: string;
    startedFrom?: { name: string; mode: Exclude<UsePictureMode, "animate"> };
  };
}

/**
 * The session's pictures and the queue, for the page rather than the element: the
 * shell rebuilds the studio when it moves between Create and Sprites, and four
 * pictures or three queued runs must not vanish because someone looked at the board.
 */
const store = {
  history: [] as Shot[],
  queue: [] as QueuedRun[],
};
const storeListeners = new Set<() => void>();
function storeChanged() {
  for (const fn of storeListeners) fn();
}
function onStoreChange(fn: () => void): () => void {
  storeListeners.add(fn);
  return () => storeListeners.delete(fn);
}

/** The keyboard, as the shortcuts sheet lists it. */
const SHORTCUTS: { keys: string; what: string; mode?: StudioMode }[] = [
  { keys: "Ctrl Enter", what: "Generate" },
  { keys: "Ctrl Shift Enter", what: "Add to the queue", mode: "image" },
  { keys: "← →", what: "Previous / next picture", mode: "image" },
  { keys: "C", what: "Compare with the next picture", mode: "image" },
  { keys: "S", what: "Save the picture on the stage", mode: "image" },
  { keys: "← → ↑ ↓", what: "Move around the board", mode: "sprites" },
  { keys: "Enter", what: "Generate the square, then the next", mode: "sprites" },
  { keys: "R", what: "Review the square's cutout", mode: "sprites" },
  { keys: "[", what: "Show or hide the inspector" },
  { keys: "]", what: "Show or hide the gallery / square panel" },
  { keys: "\\", what: "Focus: hide both panels" },
  { keys: "Alt 1 · 2 · 3", what: "Image · Video · Sprites" },
  { keys: "?", what: "This sheet" },
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

/**
 * The MISC states, as poses: what she is doing rather than what she is feeling.
 *
 * The ids mirror the server's vocabulary exactly (libby_activities.go), because the id
 * *is* the wardrobe slot the finished square is filed into. Adding one here without
 * adding it there produces a square the upload endpoint refuses.
 *
 * They sit on the board as a second block under the sixty expression squares, with
 * their own rows per heat tier, and are addressed in the same index space (see
 * squareAddress). A complete wardrobe is still the twelve expressions; these are
 * extras, so the default batch leaves them out and a switch brings them in. Each
 * carries a `face` of its own rather than borrowing the expression picker's — a pose
 * this specific reads wrong with an unrelated expression stapled to it.
 */
const OUTFIT_ACTIVITIES: { id: string; label: string; face: string; pose: string; heat: number; intimate?: boolean }[] = [
  { id: "typing", label: "Typing", heat: 0, face: "focused expression, eyes on a screen, faint smile", pose: "sitting at a desk, both hands on a keyboard, leaning slightly toward the monitor" },
  { id: "reading", label: "Reading", heat: 0, face: "absorbed expression, eyes lowered to the page", pose: "curled up holding an open book, one leg tucked under her" },
  { id: "gaming", label: "Gaming", heat: 0, face: "intent expression, eyes wide on the screen, tongue at the corner of her mouth", pose: "sitting cross-legged holding a game controller in both hands" },
  { id: "lounging", label: "Lounging", heat: 0, face: "relaxed expression, eyes half closed, easy smile", pose: "sprawled back across a sofa, arms loose, one knee raised" },
  { id: "drinking", label: "Drinking", heat: 0, face: "contented expression, eyes closed over the rim", pose: "holding a steaming mug in both hands near her chest" },
  { id: "eating", label: "Eating", heat: 0, face: "cheeks slightly full, pleased expression", pose: "holding food up to her mouth mid-bite, other hand cupped beneath it" },
  { id: "stretching", label: "Stretching", heat: 0, face: "eyes shut, mouth open in a small yawn", pose: "arms stretched overhead, back arched, rising onto her toes" },
  { id: "napping", label: "Napping", heat: 0, face: "sleeping, eyes closed, lips parted, peaceful", pose: "curled on her side asleep, hands tucked under her cheek" },
  { id: "dancing", label: "Dancing", heat: 0, face: "eyes closed, delighted open smile", pose: "mid-step with hips turned, one arm raised loosely, hair in motion" },
  { id: "tidying", label: "Tidying", heat: 0, face: "mildly absorbed expression, glancing at what she is holding", pose: "reaching to shelve something, weight on one foot" },
  { id: "drawing", label: "Drawing", heat: 0, face: "concentrating, brow faintly furrowed, tongue between her teeth", pose: "hunched over a sketchbook, pencil in hand, other arm steadying the page" },
  { id: "waving", label: "Waving", heat: 0, face: "bright welcoming smile, eyes on the viewer", pose: "one arm raised waving at the viewer, weight on one hip" },

  // The intimate states carry the heat their picture is drawn at, since a MISC square
  // has no tier of its own: "spread" with every stitch neatly on is not the picture.
  { id: "undressing", label: "Undressing", heat: 2, intimate: true, face: "half-lidded eyes, small knowing smile, watching the viewer", pose: "peeling clothing off one shoulder, other hand at her waistband" },
  { id: "teasing", label: "Teasing", heat: 2, intimate: true, face: "smirking, heavy-lidded eyes locked on the viewer", pose: "posing for the viewer, back arched, hands framing her hips" },
  { id: "touching", label: "Touching herself", heat: 2, intimate: true, face: "flushed, lips parted, eyes on the viewer", pose: "one hand pressed between her thighs over her clothes, other hand at her chest" },
  { id: "rubbing", label: "Rubbing", heat: 3, intimate: true, face: "deep blush, mouth open, eyes unfocused", pose: "reclining with one hand rubbing between her spread thighs" },
  { id: "fingering", label: "Fingering", heat: 4, intimate: true, face: "flushed, head tipped back, brow drawn, panting", pose: "lying back with her fingers inside herself, knees fallen open" },
  { id: "spread", label: "Spread", heat: 4, intimate: true, face: "flushed, watching the viewer, mouth open", pose: "lying back holding herself open with both hands, legs spread wide" },
  { id: "vibrator", label: "Vibrator", heat: 3, intimate: true, face: "eyes squeezed shut, mouth open, deep blush", pose: "holding a vibrator against herself, thighs tensed together" },
  { id: "dildo", label: "Dildo", heat: 4, intimate: true, face: "flushed, half-lidded, biting her lip", pose: "using a dildo on herself, one hand braced behind her" },
  { id: "riding", label: "Riding", heat: 4, intimate: true, face: "flushed, head thrown back, mouth open", pose: "straddling and riding a toy, hands braced on her thighs, back arched" },
  { id: "grinding", label: "Grinding", heat: 3, intimate: true, face: "flushed, eyes shut, teeth in her lip", pose: "straddling a pillow, hips rolling forward, hands gripping it" },
  { id: "climax", label: "Climax", heat: 4, intimate: true, face: "eyes rolled up, mouth wide open, whole face flushed", pose: "body arched taut mid-orgasm, toes curled, hands fisted" },
  { id: "afterglow", label: "Afterglow", heat: 3, intimate: true, face: "dazed exhausted smile, heavy-lidded eyes, deep blush", pose: "collapsed limp on her back, limbs loose, chest heaving" },
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

/**
 * One index space for every square the studio can aim at.
 *
 * The sixty expression squares come first — face-major within a tier, which is the
 * order the wardrobe editor lays them out in — and the MISC squares follow as a second
 * block, one per state. A MISC state is a single picture whatever the heat (what she is
 * doing does not change with the meter the way her face does), so the block is
 * twenty-four squares, not a hundred and twenty. Keeping both in one integer is what
 * lets the batch runner, the sheet, the draft and "aim the generator here" share a
 * single selectOutfitSlot without any of them knowing which kind of square they hold.
 */
const EXPRESSION_SQUARES = OUTFIT_FACES.length * OUTFIT_TIERS.length;
const MISC_SQUARES = OUTFIT_ACTIVITIES.length;

/** The board's shape, as gen-grid.ts takes it: how many of each kind of square there
 * are, without what any of them is. */
const SQUARE_LAYOUT: SquareLayout = {
  faces: OUTFIT_FACES.length,
  tiers: OUTFIT_TIERS.length,
  miscIds: OUTFIT_ACTIVITIES.map((item) => item.id),
};

/** Decodes a square index into the tier, the expression, and the MISC state ("" for an
 * expression square). The arithmetic is in gen-grid.ts, where it is round-tripped over
 * every square in the tests; these two bind it to this board. */
function squareAddress(index: number): SquareAddress {
  return addressOfSquare(index, SQUARE_LAYOUT);
}

/** The inverse: where a (tier, face | misc) square sits in the index space. */
function squareIndex(tier: number, face: number, misc: string): number {
  return indexOfSquare(tier, face, misc, SQUARE_LAYOUT);
}

/** The studio's cell sizes, as the width of one square. 0 means fit the row to the
 * stage, however narrow that makes a square; the others are fixed and scroll. */
const SHEET_ZOOMS = [0, 96, 128] as const;

// A character being edited (or created — id undefined until saved).
interface CharDraft {
  id?: string;
  name: string;
  prompt: string;
  negativePrompt: string;
  /** A newly-chosen thumbnail as a data URL; undefined keeps the existing one. */
  imageData?: string;
  /** A just-generated preview to use as the thumbnail instead of an upload. */
  previewId?: string;
}

/** A run's name for the progress endpoints: random, URL-safe, unique enough. */
function newJobId(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * The studio: Image, Video and Sprites behind one header. As Create it is Image — pick
 * a checkpoint (and LoRAs, VAE, templates, characters) in the inspector, speak or type
 * a prompt, generate, and — only on an explicit Save — keep one in the library — and
 * Video, whose stage is views/imagegen-video.ts. With `studio` set it is Sprites.
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
   * The Sprites mode.
   *
   * The same generator, pointed at one job: dressing Libby and rendering her sixty
   * expressions. It is a mode rather than a second component because everything below
   * the outfit board — the checkpoint, the LoRAs, the cutout editor, the draft that
   * survives a reload — is the same machinery, and a copy of it would be a second
   * thing to keep in step for no gain. What changes is what the screen is *about*:
   * the equipment board and the wardrobe lead, the stage and its strip step back, and
   * the outfit controls exist here and nowhere else in the app. The shell keeps it as
   * a second element (library.ts keys it), and the header's mode switch crosses
   * between the two.
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
  // Outfit helper. `outfitOn` gates the whole fragment so it can be switched off
  // without losing the wardrobe being worked on.
  @state() private outfitOn = false;
  @state() private outfitText = "";
  @state() private outfitGear: OutfitGear = { ...DEFAULT_OUTFIT_GEAR };
  @state() private outfitFace = 0;
  /**
   * The MISC state being rendered, or "" for an ordinary expression square.
   *
   * A separate dial rather than more entries in the pose picker, because the pose
   * picker indexes the sixty-square board: making it longer would renumber the board
   * and turn "a complete wardrobe" into a hundred and eighty squares nobody asked for.
   * When this is set it overrides the pose and redirects the finished square into the
   * MISC slot of the same name — everything downstream (the work-in-progress store, the
   * review, the filing) is already generic on the slot name. See OUTFIT_ACTIVITIES.
   */
  @state() private outfitMisc = "";
  /** Whether "Generate all" also renders the MISC block. Off by default: a complete
      wardrobe is sixty squares, and tripling a batch nobody asked to triple is the sort
      of thing that gets discovered four hours in. */
  @state() private outfitMiscBatch = false;
  @state() private outfitTier = 0;
  @state() private outfitBackground: "black" | "white" = "white";
  @state() private outfitUnderwearColor = "black";
  @state() private outfitPubicHair = false;
  @state() private outfitPubicHairColor = "dark brown";
  /** Weights each equipped colour and names every colour it is not in the negative
      prompt. On by default: a wardrobe whose colours drift is the whole set wasted. */
  @state() private outfitLockColors = true;
  /** Which gear slot has its prompt-wording editor open, if any. One at a time:
      the board is ten slots and ten open editors is not a board. */
  @state() private gearPromptOpen: OutfitGearKey | null = null;
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
  /** Which of the studio's two screens is up: the build board, or the wardrobes and
      rooms she actually wears and stands in. */
  @state() private studioView: "build" | "wardrobe" = "build";
  /** Which block of the sheet is open. Follows the selection: aiming at a MISC square
      opens the MISC tab, and the other way round. */
  @state() private sheetTab: "faces" | "misc" = "faces";
  /** How big the sheet's squares are drawn, as an index into SHEET_ZOOMS. */
  @state() private sheetZoom = 1;
  /** Whether the assembled prompt is unfolded in the focus panel. */
  @state() private showSquarePrompt = false;
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

  /** The pose library: what the subject is doing, as clickable cards like the
      characters. Several can be picked — "sitting" and "holding a mug" compose. */
  @state() private poses: GenPose[] = [];
  @state() private selectedPoses: string[] = [];
  @state() private poseDraft: CharDraft | null = null;
  @state() private poseBusy = false;

  /** Wildcard lists, and the one being written. The server rolls `__name__` on
      every generate; this side only lists, edits, and inserts the reference. */
  @state() private wildcards: GenWildcard[] = [];
  @state() private wildcardDraft: { id?: string; name: string; text: string } | null = null;
  @state() private wildcardBusy = false;

  /**
   * A library picture opened here to be edited: its controls are loaded back into the
   * form, and a result can be saved beside it or in its place. Set through editMedia
   * by the library, which is how "Edit in the studio" on a picture of Libby lands.
   */
  @property({ type: Number }) editMedia = 0;
  @state() private editing: { id: number; title: string; tags: string[] } | null = null;
  /**
   * The picture the next run starts from — a result on the canvas, a gallery picture
   * or one from this computer — and how far the run may move from it. Kept out of the
   * draft: it is a picture's worth of bytes, and rarely still wanted after a reload.
   */
  @state() private source: StartPicture | null = null;
  @state() private sourceDenoise = 0.55;
  @state() private paintOpen = false;
  /** The strokes painted over the source, and the mask they make (paint-mask.ts). */
  private sourceStrokes: PaintStroke[] = [];
  private sourceMask = "";
  /** The source's bytes as a data URL, read once and sent with every run from it. */
  private sourceData = "";
  @query("input.source-file") private sourceFile?: HTMLInputElement;
  private unwatchClips?: () => void;


  @state() private speech = "";
  @state() private listening = false;
  @state() private optimizing = false;

  @state() private prompt = "";
  /** The suggestions open under whichever prompt is being typed in. */
  @state() private completions: Completion[] = [];
  @state() private completionIndex = -1;
  private completionToken: PromptToken | null = null;
  @state() private completionField: "prompt" | "negative" = "prompt";
  private completionSeq = 0;
  private completionTimer = 0;
  /** Which inspector tab the Image studio has open beside the stage; "" puts the
      inspector away. A phone starts with it away, since there it is a sheet over the
      stage; elsewhere it opens as it was last left. */
  private readonly startLayout = loadLayout();
  @state() private createTab: CreateTab | "" =
    (typeof matchMedia === "function" && matchMedia("(max-width: 900px)").matches) || !this.startLayout.inspector
      ? "" : CREATE_TABS.find((t) => t.id === this.startLayout.tab)?.id ?? "models";
  /** Image or Video, when this is the Create element. Sprites is the other element. */
  @state() private mode: "image" | "video" = this.startLayout.mode;
  /** The gallery beside the stage (Create) or the selected square's panel (Sprites). */
  @state() private sidePanel = this.startLayout.gallery;
  /** Every picture made this session, newest first; the strip under the stage. */
  @state() private history: Shot[] = store.history;
  /** The picture on the stage, by id; null is the newest. */
  @state() private viewing: string | null = null;
  /** The picture the stage is compared against, by id, while comparing. */
  @state() private compareWith: string | null = null;
  /** Where the compare divider sits, as a percentage of the picture's width. */
  @state() private compareSplit = 50;
  @state() private queue: QueuedRun[] = store.queue;
  @state() private queueOpen = false;
  @state() private recentPrompts: RecentPrompt[] = loadPrompts();
  @state() private promptsOpen = false;
  @state() private shortcutsOpen = false;
  /** A gallery picture or a file is being dragged over the stage. */
  @state() private stageDrop = false;
  @state() private spriteTab: SpriteTab = "outfit";
  /** Whether the Sprites recipe is out beside the board. */
  @state() private spriteInspector = true;
  @state() private boardFilter: BoardFilter = "all";
  /** The selected square drawn cut out on a checkerboard, or as she appears in chat. */
  @state() private focusView: "cutout" | "scene" = "cutout";
  /** The tier's expressions played one after another, to see whether they are one girl. */
  @state() private flipping = false;
  @state() private flipFace = -1;
  private flipTimer = 0;
  private unsubscribeStore?: () => void;
  /** Narrows the Models and LoRAs drawers. */
  @state() private pickerFilter = "";
  /** Set while the Create drawer draws the studio's sections, which then come out flat. */
  /** Set while the Sprites recipe draws its sections, which then carry titles of their
      own; the Image inspector's header names the one section it shows. */
  private flatTitles = false;
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
  // The detailer's passes: the faces, with detailerModel's detector, and the hands.
  @state() private detailerFaces = true;
  @state() private detailerHands = false;
  // The passes after the faces and hands, each with a detector of its own (A1111).
  @state() private detailerCustom: CustomPass[] = [];
  // Several people, each drawn in a part of the picture of their own (regions.ts).
  @state() private regionsOn = false;
  @state() private regionsRows = false;
  @state() private regionPeople: RegionPerson[] = [newPerson(), newPerson()];
  // A1111's hires fix on runs drawn from noise, and what a finished picture is
  // enlarged with when it is upscaled. Blank upscalers mean the first offered.
  @state() private hiresEnabled = false;
  @state() private hiresUpscaler = "";
  @state() private hiresScale = 1.5;
  @state() private hiresDenoise = 0.45;
  @state() private hiresSteps = 0;
  @state() private upscaleUpscaler = "";
  @state() private upscaleBy = 2;
  /** Which of the LoRA categories the picker shows. */

  @state() private generating = false;
  /** The run in flight, named so it can be watched and cancelled; see genProgress. */
  private jobId = "";
  /** What the generator has drawn so far of the current run. */
  @state() private progress: GenProgress | null = null;
  private progressTimer = 0;
  private progressSeen = 0;
  @state() private shots: Shot[] = [];

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
  /** What the Civitai browser opens for: the picture generator's models, or Wan's
      for the Video studio's clips. */
  @state() private civitaiMode: CivitaiMode = "pictures";
  /** The LoRA being dragged from the picker, "" when none: while it is, the canvas
      shows where it can go — the whole picture, or each person's part of it. */
  @state() private loraDrag = "";
  /** The drop target a dragged LoRA is over: a person by index, or everyone. */
  @state() private loraOver: number | "all" | null = null;
  /** The LoRAs being named after Civitai, while that dialog is open. */
  @state() private renamingLoras: string[] | null = null;
  /** Automatic1111 was asked to restart and has not come back yet. */
  @state() private restarting = false;
  /** The Train a LoRA screen, over the studio like the Civitai browser. */
  @state() private trainOpen = false;

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
      /* The select fills the button invisibly, so a tap anywhere on it opens the menu. */
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

      /* Wildcard lists: a chip per list, the name inserting its reference. */
      .wildcard-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
      .wildcard-chip {
        display: inline-flex; align-items: center; border: 1px solid var(--oppai-border-strong);
        border-radius: 999px; background: var(--oppai-surface-2, rgba(255,255,255,0.04)); overflow: hidden;
      }
      .wildcard-name, .wildcard-edit, .wildcard-ro {
        border: 0; background: none; color: inherit; font: inherit; font-size: 12px; cursor: pointer;
        display: inline-flex; align-items: center; padding: 4px 9px;
      }
      .wildcard-name { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
      .wildcard-name:hover { background: var(--oppai-hover, rgba(255,255,255,0.06)); }
      .wildcard-edit { padding: 4px 7px 4px 4px; opacity: 0.7; border-left: 1px solid var(--oppai-border-strong); }
      .wildcard-edit:hover { opacity: 1; }
      .wildcard-ro { padding: 4px 7px 4px 4px; opacity: 0.5; cursor: default; }
      .wildcard-text { min-height: 180px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
      .sec-note code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11.5px; }

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
      .size-preview { display: flex; gap: 14px; align-items: center; margin-bottom: 12px; }
      .size-stage {
        position: relative; flex: none; display: grid; place-items: center; border-radius: 12px;
        background: repeating-conic-gradient(var(--oppai-surface-2) 0% 25%, transparent 0% 50%) 50% / 12px 12px;
      }
      .size-stage > span { grid-area: 1 / 1; box-sizing: border-box; border-radius: 4px; }
      .size-frame {
        position: relative; overflow: hidden; background: color-mix(in srgb, var(--oppai-primary) 22%, var(--oppai-surface));
        border: 2px solid var(--oppai-primary); transition: width 0.18s ease, height 0.18s ease;
      }
      .size-frame img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.85; }
      .size-hires { border: 1.5px dashed var(--oppai-text-dim); transition: width 0.18s ease, height 0.18s ease; }
      .size-facts { display: flex; flex-direction: column; gap: 2px; font-size: 12px; color: var(--oppai-text-dim); min-width: 0; }
      .size-facts b { font-size: 15px; color: var(--oppai-text); font-variant-numeric: tabular-nums; }
      .size-hires-note { color: var(--oppai-text); }
      .size-glyph {
        display: inline-block; border: 1.5px solid currentColor; border-radius: 2px; margin-right: 6px;
        vertical-align: middle; box-sizing: border-box; opacity: 0.8;
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
      .editing-bar {
        display: flex; align-items: center; gap: 8px; margin-bottom: 10px; padding: 8px 12px;
        border-radius: 10px; border: 1px solid var(--oppai-border-strong);
        background: color-mix(in srgb, var(--oppai-accent, #c58af9) 12%, var(--oppai-surface-2));
        font-size: 12.5px; color: var(--oppai-text-dim);
      }
      .editing-bar .editing-copy { flex: 1; min-width: 0; }
      .editing-bar strong { color: var(--oppai-text); }
      .source-bar {
        display: flex; align-items: center; gap: 10px; margin-bottom: 10px; padding: 8px 10px;
        border-radius: 12px; border: 1px solid var(--oppai-border-strong);
        background: color-mix(in srgb, var(--oppai-primary) 10%, var(--oppai-surface-2));
        font-size: 12.5px; color: var(--oppai-text-dim); flex-wrap: wrap;
      }
      .source-bar > img { width: 52px; height: 52px; object-fit: cover; border-radius: 8px; flex: none; }
      .source-copy { flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 3px; }
      .source-copy strong { color: var(--oppai-text); overflow-wrap: anywhere; }
      .source-strength { display: inline-flex; align-items: center; gap: 6px; }
      .source-strength input { width: 140px; }
      .source-strength b { color: var(--oppai-text); font-weight: 600; min-width: 3ch; }
      .source-hint { font-size: 11.5px; }
      .source-acts { display: flex; gap: 6px; flex-wrap: wrap; }
      .source-acts .chip { display: inline-flex; align-items: center; gap: 4px; }

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
        /* Three columns now: the icon, the fields, and the button that opens the
           prompt-wording editor. The editor itself spans the lot on its own row. */
        grid-template-columns: 28px minmax(0, 1fr) 22px;
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
      /* The prompt-wording toggle. Quiet until the slot has actually been renamed,
         because for most wardrobes the built-in words are right and a lit button on
         all ten slots would read as ten things needing attention. */
      .gear-slot-prompt {
        grid-column: 3;
        grid-row: 1;
        display: grid;
        place-items: center;
        width: 22px;
        height: 20px;
        padding: 0;
        border: 0;
        border-radius: 6px;
        background: transparent;
        color: var(--oppai-text-muted);
        cursor: pointer;
        opacity: 0.55;
        transition: opacity 0.14s, color 0.14s, background 0.14s;
      }
      .gear-slot-prompt .material-symbols-rounded { font-size: 15px; }
      .gear-slot-prompt:hover:not(:disabled) { opacity: 1; background: var(--oppai-surface); }
      .gear-slot-prompt.on { opacity: 1; color: var(--oppai-primary-bright); }
      .gear-slot-prompt.open { opacity: 1; background: var(--oppai-surface); color: var(--oppai-text); }
      .gear-slot-prompt:disabled { opacity: 0.25; cursor: default; }
      .gear-prompt-edit {
        grid-column: 1 / -1;
        display: grid;
        gap: 6px;
        margin-top: 5px;
        padding-top: 7px;
        border-top: 1px dashed var(--oppai-border);
      }
      .gear-prompt-edit label {
        display: grid;
        gap: 2px;
        color: var(--oppai-text-muted);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.5px;
        text-transform: uppercase;
      }
      .gear-prompt-edit input {
        min-width: 0;
        padding: 5px 7px;
        border: 1px solid var(--oppai-border);
        border-radius: 7px;
        background: var(--oppai-surface);
        color: var(--oppai-text);
        font: inherit;
        font-size: 12px;
        letter-spacing: normal;
        text-transform: none;
      }
      .gear-prompt-preview {
        margin: 0;
        color: var(--oppai-text-muted);
        font-size: 11px;
        line-height: 1.45;
        overflow-wrap: anywhere;
      }
      .gear-prompt-preview code {
        padding: 1px 4px;
        border-radius: 4px;
        background: var(--oppai-surface);
        color: var(--oppai-text-dim);
        font-size: 10.5px;
      }
      .gear-prompt-reset {
        justify-self: start;
        padding: 4px 9px;
        border: 1px solid var(--oppai-border);
        border-radius: 999px;
        background: transparent;
        color: var(--oppai-text-muted);
        cursor: pointer;
        font-size: 11px;
      }
      .gear-prompt-reset:hover:not(:disabled) { color: var(--oppai-text); border-color: var(--oppai-border-strong); }
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

    `,
    studioStyles,
  ];

  connectedCallback() {
    super.connectedCallback();
    // Before the network work: restoring is local and instant, and a user who left
    // mid-prompt should see their text back immediately rather than after a round
    // trip to the generator.
    this.restoreDraft();
    void this.loadStatus();
    void this.loadCharacters();
    void this.loadPoses();
    void this.loadWildcards();
    if (this.studio) this.enterStudio();
    // The mode switch counts the clips being made, which go on in any mode.
    this.unwatchClips = onClipsChange(() => this.requestUpdate());
    this.unsubscribeStore = onStoreChange(() => {
      this.history = store.history;
      this.queue = store.queue;
    });
    // A draft from before the strip existed still has its last run: that is the
    // session so far, as far as anyone can tell.
    if (!store.history.length && !this.studio && this.shots.length) {
      store.history = rememberShots([], this.shots);
      this.history = store.history;
    }
    window.addEventListener("keydown", this.onKey);
  }

  /**
   * Sets the screen up for the job it exists to do.
   *
   * The outfit fragment is switched on because a studio with it off is a blank screen
   * with a checkbox. It is not forced afterwards — turning the fragment off to check a
   * plain prompt against the same model stays possible.
   */
  private enterStudio() {
    this.outfitOn = true;
    void this.loadStudio();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.unwatchClips?.();
    this.unsubscribeStore?.();
    window.removeEventListener("keydown", this.onKey);
    this.stopFlip();
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
    "selectedLoras", "selectedTriggers", "selectedChars", "selectedPoses",
    "outfitOn", "outfitText", "outfitGear", "outfitFace", "outfitMisc", "outfitMiscBatch", "outfitTier", "outfitBackground",
    "outfitLockColors", "outfitLoadoutId", "outfitWardrobeId", "sheetZoom",
    "outfitUnderwearColor", "outfitPubicHair", "outfitPubicHairColor", "camera",
    "detailerEnabled", "detailerModel", "detailerPrompt", "detailerNegative",
    "detailerConfidence", "detailerDenoise", "detailerMaskBlur", "detailerFaces", "detailerHands", "detailerCustom",
    "regionsOn", "regionsRows", "regionPeople",
    "hiresEnabled", "hiresUpscaler", "hiresScale", "hiresDenoise", "hiresSteps", "upscaleUpscaler", "upscaleBy",
    "showOptions", "shots",
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
    // A picture handed in by the library to edit, loaded once per id.
    if (changed.has("editMedia") && this.editMedia > 0 && this.editing?.id !== this.editMedia) {
      void this.loadFromMedia(this.editMedia);
    }
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
    // The panels and the mode are per device, and kept as they are left. Sprites has
    // no inspector toggle of its own to remember, so only Create writes the tab.
    if (changed.has("createTab") || changed.has("mode") || changed.has("sidePanel")) {
      const was = loadLayout();
      saveLayout({
        inspector: this.studio ? was.inspector : this.createTab !== "",
        tab: this.createTab || was.tab,
        gallery: this.sidePanel,
        mode: this.studio ? was.mode : this.mode,
      });
    }
  }

  // ── the keyboard ────────────────────────────────────────────────────────────
  //
  // Read off the window, because the studio is a whole screen: arrows step through the
  // pictures or the board wherever the pointer is. A key typed into a field is the
  // field's, and nothing here fires while a dialog is over the studio.

  private onKey = (e: KeyboardEvent) => {
    if (!this.isConnected || e.defaultPrevented) return;
    const target = e.composedPath()[0] as HTMLElement | undefined;
    const typing = !!target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
    if (e.key === "Escape") {
      if (this.shortcutsOpen || this.queueOpen || this.promptsOpen) {
        this.shortcutsOpen = this.queueOpen = this.promptsOpen = false;
        e.preventDefault();
      } else if (this.compareWith && !typing) {
        this.compareWith = null;
        e.preventDefault();
      }
      return;
    }
    if (typing || e.ctrlKey || e.metaKey) return;
    if (this.charDraft || this.poseDraft || this.wildcardDraft || this.metaDraft || this.expandedShot
      || this.cutout || this.paintOpen || this.civitaiOpen || this.trainOpen || this.renamingLoras) return;
    if (e.altKey) {
      const mode = MODES[Number(e.key) - 1];
      if (mode) {
        e.preventDefault();
        this.switchMode(mode.id);
      }
      return;
    }
    const studioMode = this.currentMode;
    let handled = true;
    switch (e.key) {
      case "?": this.shortcutsOpen = !this.shortcutsOpen; break;
      case "[": this.toggleInspector(); break;
      case "]": this.sidePanel = !this.sidePanel; break;
      case "\\": this.toggleFocus(); break;
      default: handled = false;
    }
    if (!handled && studioMode === "image") {
      handled = true;
      switch (e.key) {
        case "ArrowLeft": this.stepViewer(-1); break;
        case "ArrowRight": this.stepViewer(1); break;
        case "c": case "C": this.toggleCompare(); break;
        case "s": case "S": { const shot = this.viewedShot; if (shot) void this.save(shot); break; }
        default: handled = false;
      }
    }
    if (!handled && studioMode === "sprites" && this.studioView === "build") {
      handled = true;
      switch (e.key) {
        case "ArrowLeft": case "ArrowRight": case "ArrowUp": case "ArrowDown": this.moveOnBoard(e.key); break;
        case "Enter": if (!this.generating) void this.generateOutfitAndNext(); break;
        case "r": case "R": {
          const shot = this.shotAt(this.outfitSlot().slot);
          if (shot) void this.openCutout(this.previewURL(shot), `seed-${shot.seed}`, shot.outfitFilename, shot.id);
          break;
        }
        default: handled = false;
      }
    }
    if (handled) e.preventDefault();
  };

  /** Which of the three modes is on screen. */
  private get currentMode(): StudioMode {
    return this.studio ? "sprites" : this.mode;
  }

  /** Changes mode: within this element between Image and Video, or by asking the shell
      for the other element. The shell rebuilds the studio, which opens on the mode
      written to the layout here. */
  private switchMode(next: StudioMode) {
    if (next === this.currentMode) return;
    if (next !== "sprites" && !this.studio) {
      this.mode = next;
      return;
    }
    if (next !== "sprites") saveLayout({ ...loadLayout(), mode: next });
    this.dispatchEvent(new CustomEvent("studio-mode", {
      detail: { section: next === "sprites" ? "studio" : "imagegen" }, bubbles: true, composed: true,
    }));
  }

  private toggleInspector() {
    if (this.studio) {
      this.spriteInspector = !this.spriteInspector;
      return;
    }
    this.openCreateTab(this.createTab ? this.createTab : (CREATE_TABS.find((t) => t.id === loadLayout().tab)?.id ?? "models"), true);
  }

  /** Both panels away for the stage alone, or both back. */
  private toggleFocus() {
    const anyOut = this.sidePanel || (this.studio ? this.spriteInspector : this.createTab !== "");
    this.sidePanel = !anyOut;
    if (this.studio) this.spriteInspector = !anyOut;
    else if (anyOut) this.createTab = "";
    else this.toggleInspector();
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
      selectedPoses: this.selectedPoses,
      outfitOn: this.outfitOn,
      outfitText: this.outfitText,
      outfitGear: this.outfitGear,
      outfitFace: this.outfitFace,
      outfitMisc: this.outfitMisc,
      outfitMiscBatch: this.outfitMiscBatch,
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
      detailerFaces: this.detailerFaces,
      detailerHands: this.detailerHands,
      detailerCustom: this.detailerCustom,
      regionsOn: this.regionsOn,
      regionsRows: this.regionsRows,
      regionPeople: this.regionPeople,
      hiresEnabled: this.hiresEnabled,
      hiresUpscaler: this.hiresUpscaler,
      hiresScale: this.hiresScale,
      hiresDenoise: this.hiresDenoise,
      hiresSteps: this.hiresSteps,
      upscaleUpscaler: this.upscaleUpscaler,
      upscaleBy: this.upscaleBy,
      showOptions: this.showOptions,
      shots: this.shots.map((s) => ({
        id: s.id, seed: s.seed, saved: s.saved, info: s.info,
        outfitFilename: s.outfitFilename, outfitSlot: s.outfitSlot,
        outfitConfig: s.outfitConfig,
        cutoutReviewed: s.cutoutReviewed, previewVersion: s.previewVersion,
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
    if (d.selectedPoses) this.selectedPoses = d.selectedPoses;
    if (d.outfitOn !== undefined) this.outfitOn = d.outfitOn;
    if (d.outfitText !== undefined) this.outfitText = d.outfitText;
    // Normalized rather than spread: a draft written before colours existed stores a
    // plain description per slot, and that is still every garment the user typed.
    if (d.outfitGear !== undefined) this.outfitGear = normalizeOutfitGear(d.outfitGear);
    if (d.outfitFace !== undefined) this.outfitFace = Math.max(0, Math.min(OUTFIT_FACES.length - 1, Math.round(d.outfitFace)));
    // Checked against the table rather than trusted: a draft saved by a build that had
    // a state this one does not would otherwise render a square with no pose at all.
    if (d.outfitMisc !== undefined) {
      this.outfitMisc = OUTFIT_ACTIVITIES.some((item) => item.id === d.outfitMisc) ? d.outfitMisc : "";
    }
    if (d.outfitMiscBatch !== undefined) this.outfitMiscBatch = d.outfitMiscBatch;
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
    // A draft from before the face and hand switches named one detector, "Hands"
    // among them, and comes back as the pass it ran.
    if (d.detailerFaces === undefined && d.detailerHands === undefined) {
      const p = passesFromModels(undefined, d.detailerModel);
      this.detailerFaces = p.faces;
      this.detailerHands = p.hands;
      this.detailerModel = p.faceModel;
    }
    if (d.detailerFaces !== undefined) this.detailerFaces = d.detailerFaces;
    if (d.detailerHands !== undefined) this.detailerHands = d.detailerHands;
    if (d.detailerCustom) this.detailerCustom = d.detailerCustom;
    if (d.regionsOn !== undefined) this.regionsOn = d.regionsOn;
    if (d.regionsRows !== undefined) this.regionsRows = d.regionsRows;
    if (d.regionPeople?.length) this.regionPeople = d.regionPeople;
    if (d.hiresEnabled !== undefined) this.hiresEnabled = d.hiresEnabled;
    if (d.hiresUpscaler !== undefined) this.hiresUpscaler = d.hiresUpscaler;
    if (d.hiresScale !== undefined) this.hiresScale = d.hiresScale;
    if (d.hiresDenoise !== undefined) this.hiresDenoise = d.hiresDenoise;
    if (d.hiresSteps !== undefined) this.hiresSteps = d.hiresSteps;
    if (d.upscaleUpscaler !== undefined) this.upscaleUpscaler = d.upscaleUpscaler;
    if (d.upscaleBy !== undefined) this.upscaleBy = d.upscaleBy;
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

  /** Reads the status again without blanking the screen first, for a change made from
      inside a drawer (a detector arrived) that should not close the drawer it came from. */
  private async refreshStatus() {
    try {
      this.status = await api.imageGenStatus();
    } catch {
      // The status on screen stays; the next full load will say what is wrong.
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

  private async loadPoses() {
    try {
      const res = await api.poses();
      this.poses = res.poses;
      const ids = new Set(res.poses.map((p) => p.id));
      this.selectedPoses = this.selectedPoses.filter((id) => ids.has(id));
    } catch {
      /* the section just stays empty */
    }
  }

  private async loadWildcards() {
    try {
      this.wildcards = (await api.wildcards()).wildcards;
    } catch {
      /* the section just stays empty */
    }
  }

  /**
   * Opens a library picture for editing.
   *
   * The studio's own record, when the save carried one, puts every control back where
   * it was. An older picture — or one Libby made herself — has only its prompt in the
   * notes, and that is loaded as the prompt with any LoRA tokens picked out of it, so
   * there is still something to start from rather than a blank form.
   */
  async loadFromMedia(id: number) {
    try {
      const generation = await api.mediaGeneration(id);
      const info = generation.info as unknown as GenInfo | undefined;
      if (info && typeof info.prompt === "string" && Array.isArray(info.loras)) {
        this.reuseGenInfo({ ...info, loras: info.loras.filter((l) => l && typeof l.name === "string") });
      } else {
        const loras: Record<string, number> = {};
        const prompt = (generation.prompt || "").replace(/<lora:([^:>]+):([-\d.]+)>/g, (_m, name: string, weight: string) => {
          loras[name] = Number(weight) || 1;
          return "";
        }).replace(/\s{2,}/g, " ").trim();
        this.prompt = prompt || generation.title;
        this.selectedLoras = loras;
        this.templateId = "";
        this.selectedChars = [];
        this.selectedPoses = [];
        this.outfitOn = false;
        this.showOptions = true;
      }
      this.editing = { id, title: generation.title, tags: generation.tags ?? [] };
      this.showToast(`Editing “${generation.title}” — generate, then save beside it or in its place.`);
    } catch (e) {
      this.showToast(`Couldn't open that picture here: ${(e as Error).message}`);
    }
  }

  /** Whether the library item being edited is one of Libby's own pictures. */
  private get editingLibby(): boolean {
    return !!this.editing?.tags.some((tag) => tag === "character:libby" || tag === "libby");
  }

  // Selecting a model applies the generator's per-model defaults (InvokeAI keeps
  // steps/CFG/size/VAE per model) — everything stays editable afterwards. Its
  // recommended prompts replace the last model's (model-defaults.ts).
  private pickModel(m: GenModel) {
    const prev = (this.status?.models ?? []).find((x) => x.title === this.checkpoint)?.defaults;
    this.checkpoint = m.title;
    const d = m.defaults;
    if (prev?.positive || d?.positive) this.prompt = swapPromptDefault(this.prompt, prev?.positive, d?.positive, "start");
    if (prev?.negative || d?.negative) this.negative = swapPromptDefault(this.negative, prev?.negative, d?.negative, "end");
    if (!d) return;
    if (d.clipSkip) this.clipSkip = d.clipSkip;
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
  private pieceFor(key: OutfitGearKey): GearPiece {
    const piece = this.outfitGear[key];
    // Switched off reads as not there, to every consumer: the prompt, the negatives,
    // the exposure clauses and the fingerprint.
    if (piece.off) return { color: "", item: "" };
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
    const hasTop = gearWorn(this.outfitGear.top);
    const hasBottoms = gearWorn(this.outfitGear.bottoms);
    const hasBra = gearWorn(this.outfitGear.bra);
    const hasPanties = gearWorn(this.outfitGear.panties);
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
    // A MISC state replaces both halves of the expression: these poses carry their own
    // face because "collapsed limp on her back" with a cheerful smile stapled on is not
    // the picture anybody asked for. It also brings its own heat, since it has no tier.
    const misc = OUTFIT_ACTIVITIES.find((item) => item.id === this.outfitMisc);
    const heat = misc ? misc.heat : this.outfitTier;
    const tier = OUTFIT_TIERS[heat];
    const exposure = rollOutfitExposure(heat);
    const background = this.outfitBackground === "black"
      ? "perfectly solid pure black studio background, seamless black backdrop, background evenly lit with no texture"
      : "perfectly solid pure white studio background, seamless white backdrop, background evenly lit with no texture";
    const lowerBodyCovered = gearWorn(this.outfitGear.bottoms) && exposure.clothes === "on";
    const pubic = heat === OUTFIT_TIERS.length - 1
      ? this.outfitPubicHair
        ? lowerBodyCovered
          ? `${this.outfitPubicHairColor.trim() || "dark brown"} pubic hair present beneath the bottoms`
          : `${this.outfitPubicHairColor.trim() || "dark brown"} pubic hair visible`
        : "clean-shaven pubic area, no pubic hair"
      : "";
    const parts = [
      "solo, one person, single subject",
      outfitShotPrompt(this.camera.shot),
      misc ? misc.face : face.face,
      misc ? misc.pose : face.pose,
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
        // The arms rule keeps the board's twelve portraits consistent, and fights most
        // of the MISC poses outright — half of them are defined by where her hands are.
        misc ? "" : "arms raised, hands above head, arms behind head, hands in hair, both hands near face",
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
    if (this.outfitMisc) {
      // Through the MISC states and round again: one square each, no tiers.
      const at = OUTFIT_ACTIVITIES.findIndex((item) => item.id === this.outfitMisc) + 1;
      this.outfitMisc = OUTFIT_ACTIVITIES[at % OUTFIT_ACTIVITIES.length].id;
      return;
    }
    const face = this.outfitFace + 1;
    if (face < OUTFIT_FACES.length) { this.outfitFace = face; return; }
    this.outfitFace = 0;
    this.outfitTier = (this.outfitTier + 1) % OUTFIT_TIERS.length;
  }

  private assemblePrompts(): { prompt: string; negative: string } {
    const outfit = this.outfitFragment();
    // With people in parts of their own, this is the prompt they all share: a LoRA
    // that moved onto a person takes its trigger words with it, and the characters
    // picked in the Look drawer sit out — each person has a character of their own,
    // and one in the shared words was drawn on every one of them.
    const people = this.regionsActive;
    const triggers = people
      ? sharedTriggers(this.selectedTriggers, this.selectedLoras, this.regionPeople, this.status?.loras ?? [])
      : this.selectedTriggers;
    const parts = [this.prompt.trim(), ...triggers, outfit.prompt];
    const negParts = [this.negative.trim(), outfit.negative];
    for (const id of people ? [] : this.selectedChars) {
      const c = this.characters.find((ch) => ch.id === id);
      if (!c) continue;
      if (c.prompt.trim()) parts.push(c.prompt.trim());
      if (c.negativePrompt?.trim()) negParts.push(c.negativePrompt.trim());
    }
    // Poses come after the characters: who, then what they are doing. The outfit
    // board carries its own pose per square, so a picked pose sits it out there.
    if (!this.outfitOn) {
      for (const id of this.selectedPoses) {
        const p = this.poses.find((pose) => pose.id === id);
        if (!p) continue;
        if (p.prompt.trim()) parts.push(p.prompt.trim());
        if (p.negativePrompt?.trim()) negParts.push(p.negativePrompt.trim());
      }
    }
    // Regional Prompter splits the positive prompt only, so the people's characters
    // keep their negatives in the shared one.
    if (this.regionsActive) negParts.push(...regionNegatives(this.regionPeople, this.characters));
    // What the LoRAs that are on ask to keep out of the picture.
    negParts.push(loraNegatives(negParts.join(", "),
      (this.status?.loras ?? []).filter((l) => l.name in this.selectedLoras).map((l) => l.negative)));
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
  private outfitSlot(tier = this.outfitTier, face = this.outfitFace, miscId = this.outfitMisc) {
    // A MISC square is filed by its state name, which is also what keeps its filename
    // and previews apart from an expression's. It has one tier — level 0 — and its
    // index lives in the block after the sixty expression squares; see squareAddress.
    const misc = OUTFIT_ACTIVITIES.find((item) => item.id === miscId);
    const expression = misc ?? OUTFIT_FACES[face];
    const level = misc ? 0 : tier;
    const heat = misc ? { label: "Misc" } : OUTFIT_TIERS[tier];
    const slot: DraftOutfitSlot = {
      emotion: expression.id,
      emotionLabel: expression.label,
      tier: level,
      tierLabel: heat.label,
      index: squareIndex(level, face, misc ? misc.id : ""),
    };
    return {
      slot,
      filename: outfitImageFilename(this.outfitText, heat.label, expression.id),
    };
  }

  /** The square on the board at one slot, if any. Matched by slot, never by name. */
  private shotAt(slot: Pick<DraftOutfitSlot, "emotion" | "tier">): Shot | undefined {
    const key = slotKeyOf(slot);
    return this.shots.find((shot) => shot.outfitSlot && slotKeyOf(shot.outfitSlot) === key);
  }

  /** Squares generated under a different recipe than the one on the board. They stay
   * on the sheet — a set is not thrown away because a colour changed — but they are
   * marked, and can be redone together. */
  private staleShots(): Shot[] {
    return this.currentOutfitShots().filter((shot) => !this.shotMatchesCurrentOutfit(shot));
  }

  /** Every square on the board, ordered exactly like the wardrobe grid. One per slot:
   * a regenerated square replaces its earlier take rather than sitting beside it.
   *
   * Squares from an older recipe are included. The board used to hide them the moment
   * a colour changed, which read as sixty squares vanishing; now they stay, marked
   * stale (see staleShots), until they are redone or deleted. */
  private currentOutfitShots(): Shot[] {
    const bySlot = new Map<string, Shot>();
    for (const shot of this.shots) {
      if (shot.outfitSlot) bySlot.set(slotKeyOf(shot.outfitSlot), shot);
    }
    const ordered: Shot[] = [];
    for (let index = 0; index < EXPRESSION_SQUARES + MISC_SQUARES; index++) {
      const { tier, face, misc } = squareAddress(index);
      const shot = bySlot.get(slotKeyOf(this.outfitSlot(tier, face, misc).slot));
      if (shot) ordered.push(shot);
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
        // The clothes as the generator was told them, so the wardrobe knows its own
        // outfit and Libby can be drawn in it from chat. See libbyOutfit.Prompt.
        clothing: [...this.equippedOutfitTerms(), this.outfitText.trim()].filter(Boolean).join(", "),
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
      const misc = OUTFIT_ACTIVITIES.some((item) => item.id === square.emotion) ? square.emotion : "";
      const tier = misc ? 0 : Math.max(0, Math.min(OUTFIT_TIERS.length - 1, square.level));
      const slot = this.outfitSlot(tier, Math.max(0, face), misc);
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

  private selectOutfitSlot(index: number) {
    this.stopFlip();
    const { tier, face, misc } = squareAddress(index);
    this.outfitMisc = misc;
    if (misc) {
      this.sheetTab = "misc";
    } else {
      this.outfitTier = tier;
      this.outfitFace = face;
      this.sheetTab = "faces";
    }
  }

  /**
   * The overlay while a run is in flight: the picture forming, as the generator
   * publishes it every few steps, with the step count under it and a way to stop a
   * run that is plainly going wrong before it has cost the whole wait.
   */
  private renderGenerating(invoke: boolean) {
    const p = this.progress;
    const total = p?.total ?? 0;
    const percent = p ? Math.max(0, Math.min(1, p.percent)) : 0;
    const label = p?.cancelled ? "Stopping…"
      : total > 0 ? `Step ${p!.step} of ${total}`
      : invoke ? "Invoking generation…" : "Generating image…";
    return html`<div class="generating-overlay">
      <div class="generating-card ${p?.image ? "with-preview" : ""}">
        ${p?.image ? html`<img class="progress-preview" src=${p.image} alt="The picture so far" />` : nothing}
        <div class="progress-row">
          <md-circular-progress indeterminate style="--md-circular-progress-size:22px;"></md-circular-progress>
          <span class="progress-label">${label}</span>
          <button class="progress-cancel" type="button" ?disabled=${p?.cancelled} title="Stop this generation" @click=${() => void this.cancelGeneration()}>
            <span class="material-symbols-rounded" style="font-size:18px;">close</span>Cancel
          </button>
        </div>
        <div class="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow=${Math.round(percent * 100)}>
          <span style=${`width:${Math.round(percent * 100)}%`}></span>
        </div>
      </div>
    </div>`;
  }

  private get detailerPasses(): DetailerPasses {
    return { faces: this.detailerFaces, faceModel: this.detailerModel, hands: this.detailerHands };
  }

  /** The detailer as the Settings drawer has it, for a run that asks for it. A fix
      asked for with both passes switched off redoes the faces. */
  private detailerParams(): NonNullable<GenerateParams["detailer"]> {
    const models = detailerModels(this.detailerPasses);
    const custom = this.status?.detectors?.length ? customPassParams(this.detailerCustom) : [];
    if (!models.length && !custom.length) models.push(this.detailerModel);
    return {
      enabled: true,
      model: models[0],
      models,
      custom: custom.length ? custom : undefined,
      prompt: this.detailerPrompt || undefined,
      negativePrompt: this.detailerNegative || undefined,
      confidence: this.detailerConfidence,
      denoise: this.detailerDenoise,
      maskBlur: this.detailerMaskBlur,
    };
  }

  /** Whether the detailer has anything to run: faces, hands or a pass of its own. */
  private get detailerHasPasses(): boolean {
    return detailerModels(this.detailerPasses).length > 0
      || (!!this.status?.detectors?.length && customPassParams(this.detailerCustom).length > 0);
  }

  /** Whether the next run draws its people in parts of their own. */
  private get regionsActive(): boolean {
    return !!this.status?.regionsAvailable && this.regionsOn && this.regionPeople.length >= 2;
  }

  /** Whether this generator can enlarge pictures: A1111 listing its upscalers. */
  private get canUpscale(): boolean {
    return this.status?.backend !== "invokeai" && !!this.status?.upscalers?.length;
  }

  /** The hires fix's upscaler: the one picked, while the generator still has it. */
  private get hiresChoice(): string {
    const list = hiresUpscalers(this.status?.latentUpscalers, this.status?.upscalers);
    return list.includes(this.hiresUpscaler) ? this.hiresUpscaler : (list[0] ?? "");
  }

  /** The upscale's upscaler: the one picked, else an ESRGAN, which is what most
      people mean by upscaling, else the first there is. */
  private get upscaleChoice(): string {
    const list = this.status?.upscalers ?? [];
    if (list.includes(this.upscaleUpscaler)) return this.upscaleUpscaler;
    return list.find((u) => /esrgan/i.test(u)) ?? list[0] ?? "";
  }

  /** The hires fix, for a run drawn from noise that has it switched on. */
  private hiresParams(): GenerateParams["upscale"] {
    if (!this.hiresEnabled || !this.canUpscale) return undefined;
    return {
      enabled: true,
      upscaler: this.hiresChoice || undefined,
      scale: hiresScale(this.width, this.height, this.hiresScale),
      denoise: this.hiresDenoise,
      steps: this.hiresSteps || undefined,
    };
  }

  /** Makes one request using a snapshot of the selected outfit square. `from` is a
      picture to start from other than the composer's own (a face pass, run at once). */
  private async generateOne(appendOutfit: boolean, from?: StartPicture): Promise<number> {
    return this.executeRun(await this.prepareRun(from), appendOutfit);
  }

  /**
   * Reads everything a run needs off the form, at once.
   *
   * Split from sending it so the queue can hold a run while the form goes on changing:
   * a run queued with one prompt must be drawn with that prompt, not with whatever the
   * box says by the time its turn comes. The picture it starts from is read into bytes
   * here for the same reason — a canvas result expires.
   */
  private async prepareRun(from?: StartPicture): Promise<PreparedRun> {
    const src = from ?? this.source;
    let { prompt, negative } = this.assemblePrompts();
    // A face pass needs no prompt of its own: the faces are already there.
    if (!prompt.trim() && src?.mode === "faces") prompt = "detailed face, best quality";
    const outfit = this.outfitOn ? this.outfitSlot() : undefined;
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
      loras: Object.entries(!src && this.regionsActive ? sharedLoras(this.selectedLoras, this.regionPeople) : this.selectedLoras)
        .map(([name, weight]) => ({ name, weight })),
      detailer: this.status?.detailerAvailable && this.detailerEnabled && this.detailerHasPasses
        ? this.detailerParams() : undefined,
      upscale: src ? undefined : this.hiresParams(),
      regions: src || !this.regionsActive ? undefined
        : regionParams(true, this.regionsRows, this.regionPeople, this.characters, this.status?.loras ?? []),
    };
    if (src) {
      // A run from a picture comes out the picture's shape, not the size controls'.
      Object.assign(params, sourceSize(src.width, src.height));
      if (src.gallery) params.initGallery = src.gallery;
      else params.initImage = await this.sourceDataURL(src);
      if (src.mode === "upscale") {
        params.upscaleOnly = true;
        params.count = 1;
        params.detailer = undefined;
        params.upscale = { enabled: false, upscaler: this.upscaleChoice || undefined,
          scale: upscaleFactor(src.width, src.height, this.upscaleBy) };
      } else if (src.mode === "faces") {
        params.detailOnly = true;
        params.count = 1;
        params.detailer = this.detailerParams();
      } else {
        params.denoise = this.sourceDenoise;
        if (src.mode === "inpaint" && this.sourceMask) {
          params.mask = this.sourceMask;
          params.maskBlur = 8;
        }
      }
    }
    return {
      params,
      from: src ?? null,
      outfit,
      outfitConfig: outfit ? this.outfitConfigKey() : undefined,
      extras: {
        triggers: [...this.selectedTriggers],
        characters: this.selectedChars.map((id) => this.characters.find((c) => c.id === id)?.name ?? "").filter(Boolean),
        poses: this.outfitOn ? [] : this.selectedPoses.map((id) => this.poses.find((p) => p.id === id)?.name ?? "").filter(Boolean),
        outfit: this.outfitOn ? this.outfitText.trim() : "",
        controlImage: this.cutout?.name,
        startedFrom: src ? { name: src.name, mode: src.mode === "inpaint" && !params.mask ? "img2img" : src.mode } : undefined,
      },
    };
  }

  /** Sends a prepared run and puts what comes back on the board, the stage and the
      session strip. */
  private async executeRun(run: PreparedRun, appendOutfit: boolean): Promise<number> {
    const params: GenerateParams = { ...run.params };
    const outfit = run.outfit;
    const superseded = outfit ? this.shotAt(outfit.slot) : undefined;
    const startedAt = performance.now();
    // Named, so the overlay can watch the picture form and the user can stop it.
    params.jobId = newJobId();
    this.startProgressWatch(params.jobId, params.count ?? 1);
    let res: GenerateResult;
    try {
      res = await api.generate(params);
    } catch (e) {
      res = await this.collectRun(params.jobId, e as Error);
    } finally {
      this.stopProgressWatch();
    }
    // Wildcards were rolled server-side: the record has to say what was actually
    // sent, or "use the same parameters" would roll again instead of reproducing.
    if (res.rolled && typeof res.positive === "string") {
      params.prompt = res.positive;
      params.negativePrompt = res.negative || undefined;
    }
    const seconds = (performance.now() - startedAt) / 1000;
    const made: Shot[] = res.images.map((g: GenPreview) => ({
        ...g,
        saved: false,
        outfitFilename: outfit?.filename,
        outfitSlot: outfit?.slot,
        outfitConfig: run.outfitConfig,
        // The seed that came back, not the one submitted: a submitted -1 means
        // "surprise me", and it is the returned value that reproduces this image.
        info: buildGenInfo(params, {
          seed: g.seed,
          backend: this.status?.backend ?? "unknown",
          modelHash: this.status?.models?.find((model) => model.title === params.checkpoint)?.hash,
          loraHashes: Object.fromEntries(
            (this.status?.loras ?? []).filter((lora) => lora.hash).map((lora) => [lora.name, lora.hash!]),
          ),
          ...run.extras,
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
      const key = slotKeyOf(outfit.slot);
      this.shots = [
        ...this.shots.filter((shot) => !shot.outfitSlot || slotKeyOf(shot.outfitSlot) !== key),
        ...made,
      ];
    } else {
      // The draft keeps the newest run; the strip keeps the session. Outfit squares
      // stay off the strip: they are one deliverable, and the board is where they live.
      this.shots = made;
      if (made.length && !outfit) {
        store.history = rememberShots(store.history, made);
        storeChanged();
        this.viewing = made[0].id;
        this.recentPrompts = rememberPrompt(this.recentPrompts, {
          prompt: run.params.prompt, negative: run.params.negativePrompt ?? "", at: Date.now(),
        });
        savePrompts(this.recentPrompts);
      }
    }
    void this.galleryPanel?.refresh();
    return made.length;
  }

  /**
   * The result of a run whose generate call failed, when the run did not. A proxy in
   * front of the server that gives up on a long run answers the studio with its own
   * error page while the run goes on to the end (handleImageGenGenerate detaches it),
   * so the job is asked how it ended: its pictures, or the server's own error. A job
   * the server does not know — a restart, an older server — leaves the call's error.
   */
  private async collectRun(jobId: string | undefined, failure: Error): Promise<GenerateResult> {
    if (!jobId || failure.name === "AbortError") throw failure;
    const deadline = Date.now() + 15 * 60_000;
    while (Date.now() < deadline) {
      let state: GenProgress;
      try {
        state = await api.genProgress(jobId, -1);
      } catch {
        throw failure;
      }
      if (state.done) {
        if (state.result) return state.result;
        throw state.error ? new Error(state.error) : failure;
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    throw failure;
  }

  /**
   * Polls the run's progress while the generate call is in flight. A second a poll:
   * the generator publishes a preview every few steps, and the poll is a few bytes
   * when nothing has changed (the server withholds an unchanged preview).
   */
  private startProgressWatch(jobId: string, count: number) {
    this.stopProgressWatch();
    this.jobId = jobId;
    this.progress = { index: 0, step: 0, total: 0, percent: 0, seq: 0, done: false, cancelled: false };
    this.progressSeen = 0;
    const tick = async () => {
      if (this.jobId !== jobId) return;
      try {
        const next = await api.genProgress(jobId, this.progressSeen);
        if (this.jobId !== jobId) return;
        // An unchanged preview is withheld by the server; keep the one on screen.
        const image = next.image ?? (next.seq === this.progressSeen ? this.progress?.image : undefined);
        this.progress = { ...next, image, total: next.total || this.progress?.total || 0 };
        this.progressSeen = next.seq;
        if (next.done) return;
      } catch {
        // A 404 before the server has registered the job, or a blip: keep polling.
      }
      this.progressTimer = window.setTimeout(() => void tick(), 1000);
    };
    this.progressTimer = window.setTimeout(() => void tick(), 600);
    void count;
  }

  private stopProgressWatch() {
    window.clearTimeout(this.progressTimer);
    this.progressTimer = 0;
    this.jobId = "";
    this.progress = null;
  }

  /** Stops the run in flight. The generate call rejects as cancelled, not failed. */
  private async cancelGeneration() {
    const jobId = this.jobId;
    if (!jobId) return;
    if (this.progress) this.progress = { ...this.progress, cancelled: true };
    try { await api.cancelGenerate(jobId); }
    catch (e) { this.showToast(`Couldn't cancel: ${(e as Error).message}`); }
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
      // Stopped from the overlay: not an error, and nothing to show but the toast.
      if (/cancelled/i.test((e as Error).message)) this.showToast("Generation cancelled.");
      else this.error = (e as Error).message;
    } finally {
      this.generating = false;
      // A finished run is worth persisting immediately rather than on the next
      // keystroke: the output history is the part of the draft it would hurt to lose.
      this.persistDraft();
    }
    void this.drainQueue();
  }

  // ── the queue ───────────────────────────────────────────────────────────────
  //
  // The generator draws one run at a time, and the wait is when the next idea arrives.
  // A queued run is read off the form when it is queued (prepareRun), so the prompt can
  // be rewritten for the run after it straight away. Outfit squares are not queued:
  // the board has its own batch, which walks the squares in order.

  /** Queues the form as it is now, or starts it at once when nothing is drawing. */
  private async enqueue() {
    if (this.outfitOn || !this.assemblePrompts().prompt.trim()) return;
    if (!this.generating) {
      void this.generate();
      return;
    }
    let prepared: PreparedRun;
    try {
      prepared = await this.prepareRun();
    } catch (e) {
      this.showToast((e as Error).message);
      return;
    }
    const label = prepared.params.prompt.replace(/\s+/g, " ").trim().slice(0, 90);
    store.queue = [...store.queue, { id: newJobId(), label, prepared }];
    storeChanged();
    this.showToast(`Queued — ${store.queue.length} waiting`);
  }

  /** Runs what is queued, one after another, until it is empty or a run fails. */
  private async drainQueue() {
    while (store.queue.length && !this.generating && this.isConnected) {
      const [next, ...rest] = store.queue;
      store.queue = rest;
      storeChanged();
      this.generating = true;
      this.error = "";
      try {
        await this.executeRun(next.prepared, false);
      } catch (e) {
        if (/cancelled/i.test((e as Error).message)) this.showToast("Generation cancelled.");
        else this.error = (e as Error).message;
        // A failure that would fail the next run the same way (the generator gone)
        // should not burn through the queue; it waits for the next Generate.
        this.generating = false;
        return;
      } finally {
        this.generating = false;
        this.persistDraft();
      }
    }
  }

  private unqueue(id: string) {
    store.queue = store.queue.filter((q) => q.id !== id);
    storeChanged();
  }

  private moveQueued(id: string, dir: -1 | 1) {
    const at = store.queue.findIndex((q) => q.id === id);
    store.queue = moveItem(store.queue, at, at + dir);
    storeChanged();
  }

  // ── starting from a picture ───────────────────────────────────────────────
  //
  // Image to image, paint to fix and the face pass all start from a picture rather
  // than from noise. The picture comes from the canvas, the gallery or this computer;
  // the bytes go to the generator with the run (initImage), the painted mask with it.

  /** Makes a picture the one the next run starts from. A face pass runs at once. */
  private async usePicture(url: string, name: string, mode: UsePictureMode, objectURL = false, gallery?: string) {
    let img: HTMLImageElement;
    try {
      img = await loadImage(url);
    } catch (e) {
      this.showToast((e as Error).message);
      return;
    }
    if (mode === "animate") {
      // A clip is not the next picture's start: the Video studio keeps its own.
      animatePicture({ url, name, width: img.naturalWidth, height: img.naturalHeight, gallery, objectURL });
      this.switchMode("video");
      return;
    }
    // A picture to start from is the Image studio's, whichever mode handed it over.
    if (!this.studio) this.mode = "image";
    const pic: StartPicture = { url, name, width: img.naturalWidth, height: img.naturalHeight, mode, objectURL, gallery };
    if (mode === "faces" || mode === "upscale") {
      void this.runOnPicture(pic, mode);
      return;
    }
    this.setSource(pic);
    if (mode === "inpaint") this.paintOpen = true;
  }

  private setSource(pic: StartPicture | null) {
    if (this.source?.objectURL && this.source.url !== pic?.url) URL.revokeObjectURL(this.source.url);
    this.source = pic;
    this.sourceStrokes = [];
    this.sourceMask = "";
    this.sourceData = "";
    this.paintOpen = false;
  }

  private async sourceDataURL(pic: StartPicture): Promise<string> {
    const current = pic.url === this.source?.url;
    if (current && this.sourceData) return this.sourceData;
    const res = await fetch(pic.url, { credentials: "same-origin" });
    if (!res.ok) throw new Error("Couldn't read the picture to start from — a result on the canvas expires after a while; pick it again.");
    const data = await blobToDataURL(await res.blob());
    if (current) this.sourceData = data;
    return data;
  }

  private onSourceFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (file) void this.usePicture(URL.createObjectURL(file), file.name, "img2img", true);
  }

  private onPainted(r: PaintResult) {
    this.sourceStrokes = r.strokes;
    this.sourceMask = r.mask;
    this.sourceDenoise = r.denoise;
    if (this.source) this.source = { ...this.source, mode: "inpaint" };
    this.paintOpen = false;
    if (r.generate) void this.generate();
  }

  /** The painter shut without a mask: what is left is the whole picture to start from. */
  private closePainter() {
    this.paintOpen = false;
    if (this.source && !this.sourceMask) this.source = { ...this.source, mode: "img2img" };
  }

  /** Redoes a picture's faces and hands with the detailer and nothing else
      (A1111 + ADetailer), or enlarges it with the upscaler (A1111). */
  private async runOnPicture(pic: StartPicture, mode: "faces" | "upscale") {
    if (this.generating) return;
    this.generating = true;
    this.error = "";
    try {
      await this.generateOne(false, { ...pic, mode });
    } catch (e) {
      if (/cancelled/i.test((e as Error).message)) this.showToast("Generation cancelled.");
      else this.error = (e as Error).message;
    } finally {
      this.generating = false;
      this.persistDraft();
    }
  }

  /** The strip over the prompt while a run starts from a picture. */
  private renderSourceBar() {
    const src = this.source;
    if (!src) return nothing;
    const a1111 = this.status?.backend !== "invokeai";
    const painted = src.mode === "inpaint" && !!this.sourceMask;
    const size = sourceSize(src.width, src.height);
    return html`<div class="source-bar">
      <img src=${src.url} alt="" />
      <div class="source-copy">
        <span>${painted ? "Repainting the painted part of" : "Starting from"} <strong>${src.name}</strong> · ${size.width}×${size.height}</span>
        <label class="source-strength" title=${painted ? "How far the painted part may change" : "Low keeps the picture; high lets the prompt take over"}>
          Change
          <input type="range" min="0.05" max="1" step="0.05" .value=${String(this.sourceDenoise)}
            @input=${(e: Event) => (this.sourceDenoise = Number((e.target as HTMLInputElement).value))} />
          <b>${Math.round(this.sourceDenoise * 100)}%</b>
        </label>
        <span class="source-hint">${painted
          ? "The prompt says what goes in the painted part; the rest stays exactly as it is."
          : "The prompt is applied to the whole picture."}</span>
      </div>
      <div class="source-acts">
        ${a1111 ? html`<button class="chip" title="Paint over a part to redo only that" @click=${() => (this.paintOpen = true)}>
          <span class="material-symbols-rounded" style="font-size:16px;">brush</span>${painted ? "Edit painting" : "Paint a part"}</button>` : nothing}
        ${painted ? html`<button class="chip" title="Start from the whole picture again" @click=${() => {
          this.sourceStrokes = [];
          this.sourceMask = "";
          this.source = { ...src, mode: "img2img" };
        }}>Whole picture</button>` : nothing}
        ${a1111 && this.status?.detailerAvailable ? html`<button class="chip" title="Redo it with ADetailer's passes, and nothing else"
          ?disabled=${this.generating} @click=${() => void this.runOnPicture(src, "faces")}>
          <span class="material-symbols-rounded" style="font-size:16px;">face_retouching_natural</span>${fixLabel(this.detailerPasses)}</button>` : nothing}
        ${this.canUpscale ? (() => {
          const out = scaledSize(src.width, src.height, upscaleFactor(src.width, src.height, this.upscaleBy));
          return html`<button class="chip" title=${`Enlarge it to ${out.width}×${out.height} with ${this.upscaleChoice}, redrawing nothing`}
            ?disabled=${this.generating} @click=${() => void this.runOnPicture(src, "upscale")}>
            <span class="material-symbols-rounded" style="font-size:16px;">open_in_full</span>Upscale ${this.upscaleBy}×</button>`;
        })() : nothing}
        <button class="chip" title="Draw from noise again" @click=${() => this.setSource(null)}>
          <span class="material-symbols-rounded" style="font-size:16px;">close</span>Remove</button>
      </div>
    </div>`;
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
    const total = EXPRESSION_SQUARES + (this.outfitMiscBatch ? MISC_SQUARES : 0);
    try {
      for (let index = 0; index < total; index++) {
        if (this.stopOutfitBatch) break;
        this.selectOutfitSlot(index);
        const { slot } = this.outfitSlot();
        // Missing means missing. A square from an older recipe is kept and marked, and
        // is redone through regenerateStale rather than swept up here.
        if (this.shotAt(slot)) continue;
        this.outfitProgress = `Generating ${index + 1} of ${total} · ${slot.tierLabel} · ${slot.emotionLabel}`;
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

  /** Redoes every square generated under an older recipe, in board order. */
  private async regenerateStale() {
    if (this.generating || !this.outfitOn || !this.assemblePrompts().prompt.trim()) return;
    const stale = this.staleShots();
    if (!stale.length) return;
    this.generating = true;
    this.outfitBatchRunning = true;
    this.stopOutfitBatch = false;
    this.error = "";
    try {
      for (let n = 0; n < stale.length; n++) {
        if (this.stopOutfitBatch) break;
        const slot = stale[n].outfitSlot!;
        this.selectOutfitSlot(slot.index);
        this.outfitProgress = `Redoing ${n + 1} of ${stale.length} · ${slot.tierLabel} · ${slot.emotionLabel}`;
        await this.generateOne(true);
        this.persistDraft();
      }
      const left = this.staleShots().length;
      this.outfitProgress = left ? `Stopped with ${left} square${left === 1 ? "" : "s"} still on the old recipe.` : "Every square is on the current recipe.";
    } catch (e) {
      this.error = (e as Error).message;
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
      const passes = passesFromModels(params.detailer.models, params.detailer.model);
      this.detailerModel = passes.faceModel;
      this.detailerFaces = passes.faces;
      this.detailerHands = passes.hands;
      this.detailerPrompt = params.detailer.prompt ?? "";
      this.detailerNegative = params.detailer.negativePrompt ?? "";
      this.detailerConfidence = params.detailer.confidence ?? 0.3;
      this.detailerDenoise = params.detailer.denoise ?? 0.4;
      this.detailerMaskBlur = params.detailer.maskBlur ?? 4;
      this.detailerCustom = customPassesFrom(params.detailer.custom);
    }
    const people = peopleFrom(params.regions);
    this.regionsOn = people.length >= 2;
    if (this.regionsOn) {
      this.regionPeople = people;
      this.regionsRows = !!params.regions?.rows;
    }
    // A picture made with a hires fix is made the same way again; one made without
    // leaves the switch as it was, since most records are from before it existed.
    if (params.upscale?.enabled) {
      this.hiresEnabled = true;
      if (params.upscale.upscaler) this.hiresUpscaler = params.upscale.upscaler;
      if (params.upscale.scale) this.hiresScale = params.upscale.scale;
      if (params.upscale.denoise) this.hiresDenoise = params.upscale.denoise;
      this.hiresSteps = params.upscale.steps ?? 0;
    }
    this.templateId = "";
    this.selectedTriggers = [];
    this.selectedChars = [];
    this.selectedPoses = [];
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
        { label: "Start from this picture", icon: "add_photo_alternate",
          run: () => void this.usePicture(this.previewURL(shot), `seed ${shot.seed}`, "img2img", false, shot.gallery) },
        ...(this.status?.backend !== "invokeai" ? [{ label: "Paint to fix", icon: "brush",
          run: () => void this.usePicture(this.previewURL(shot), `seed ${shot.seed}`, "inpaint", false, shot.gallery) }] : []),
        ...(this.status?.backend !== "invokeai" && this.status?.detailerAvailable ? [{ label: fixLabel(this.detailerPasses), icon: "face_retouching_natural",
          disabled: this.generating,
          run: () => void this.usePicture(this.previewURL(shot), `seed ${shot.seed}`, "faces", false, shot.gallery) }] : []),
        ...(this.canUpscale ? [{ label: `Upscale ${this.upscaleBy}×`, icon: "open_in_full",
          disabled: this.generating,
          run: () => void this.usePicture(this.previewURL(shot), `seed ${shot.seed}`, "upscale", false, shot.gallery) }] : []),
        ...(this.status?.clips?.image ? [{ label: "Animate", icon: "animation",
          run: () => void this.usePicture(this.previewURL(shot), `seed ${shot.seed}`, "animate", false, shot.gallery) }] : []),
        { label: "Use as a Libby background", icon: "wallpaper",
          run: () => void this.useAsBackground(shot) },
        { label: "Save as a pose…", icon: "accessibility_new",
          run: () => this.poseFromShot(shot) },
        { label: "Send in chat as Libby…", icon: "send",
          run: () => void this.sendAsLibby(shot) },
        ...(this.editing ? [{ label: `Replace “${this.editing.title}” in the library`, icon: "published_with_changes",
          run: () => void this.replaceOriginal(shot) }] : []),
      ],
    });
  }

  /** Starts a pose from a result: the picture becomes its thumbnail, and the prompt
      is the starting text — usually more than a pose, so it is there to be cut down. */
  private poseFromShot(shot: Shot) {
    this.poseDraft = {
      name: "",
      prompt: shot.info?.prompt ?? this.prompt,
      negativePrompt: "",
      previewId: shot.id.startsWith("wip-") ? undefined : shot.id,
    };
  }

  /**
   * Puts a result into her chat as something she sent.
   *
   * It goes into the library first — a message can only carry a library item — and is
   * saved as one of her, so from now on she knows the picture is her and can reach for
   * it again herself. Then the server writes the message; the chat screen shows it the
   * next time it is opened.
   */
  private async sendAsLibby(shot: Shot) {
    const text = window.prompt("What does she say with it? (leave blank for just the picture)", "");
    if (text === null) return;
    try {
      const saved = await this.saveShot(shot, ["libby"]);
      const sent = await api.libbySend({ mediaId: saved, text: text.trim() });
      this.showToast("She sent it — it's in her chat.");
      this.dispatchEvent(new CustomEvent("libby-sent", { bubbles: true, composed: true, detail: sent }));
    } catch (e) {
      this.showToast(`Couldn't send that: ${(e as Error).message}`);
    }
  }

  /**
   * Saves a result in place of the picture being edited: the new one takes the old
   * one's title and its tags — a picture of Libby stays a picture of Libby — and the
   * old one is removed. The library cannot swap bytes under an id, so this is what
   * "replace" can honestly mean.
   */
  private async replaceOriginal(shot: Shot) {
    const editing = this.editing;
    if (!editing) return;
    if (!confirm(`Replace “${editing.title}” with this picture? The original is deleted.`)) return;
    try {
      const tags = editing.tags.filter((tag) => tag !== "ai-generated");
      const saved = await this.saveShot(shot, tags, editing.title);
      if (saved !== editing.id) await api.deleteMedia(editing.id);
      this.editing = { ...editing, id: saved };
      this.showToast(`Replaced “${editing.title}”.`);
      this.dispatchEvent(new CustomEvent("imported", { bubbles: true, composed: true }));
    } catch (e) {
      this.showToast(`Couldn't replace it: ${(e as Error).message}`);
    }
  }

  /** Files one result into the library and returns its media id. The record of how
      it was made rides along so it can be opened here again. */
  private async saveShot(shot: Shot, tags: string[] = [], title?: string): Promise<number> {
    // Titled from what actually made it — after wildcards — rather than the reference.
    const name = title ?? ((shot.info?.prompt?.trim() || this.prompt.trim() || this.outfitText.trim()).slice(0, 80) || "Generated image");
    const res = await api.saveGenerated({ id: shot.id, title: name, tags, info: shot.info });
    // Saving moved its gallery copy into the library: it is no longer there to start from.
    this.shots = this.shots.map((s) => (s.id === shot.id ? { ...s, saved: true, gallery: undefined } : s));
    store.history = patchShot(store.history, shot.id, { saved: true, gallery: undefined });
    storeChanged();
    if (shot.gallery) void this.galleryPanel?.refresh();
    this.dispatchEvent(new CustomEvent("imported", { bubbles: true, composed: true }));
    return res.id;
  }

  /** Downloads one outfit square as a PNG under its wardrobe filename, with the
      generation record embedded, without going through the whole-set ZIP. */
  private async exportOutfitSquare(shot: Shot) {
    const name = shot.outfitFilename ?? `oppailib-seed-${shot.seed}.png`;
    try {
      const response = await fetch(this.previewURL(shot), { credentials: "same-origin" });
      if (!response.ok) throw new Error(`preview returned ${response.status}`);
      let bytes: Uint8Array<ArrayBufferLike> = new Uint8Array(await response.arrayBuffer());
      if (shot.info) {
        try { bytes = embedGenerationMetadata(bytes, toInfotext(shot.info), toJSON(shot.info)); }
        catch { /* a reviewed cutout may have been re-encoded; the pixels still export */ }
      }
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "image/png" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      this.showToast(shot.cutoutReviewed ? `Exported ${name}` : `Exported ${name} — its cutout hasn't been reviewed yet.`);
    } catch (e) {
      this.showToast(`Couldn't export that square: ${(e as Error).message}`);
    }
  }

  /**
   * Makes a generated picture one of the rooms she can be in on a call.
   *
   * A background is a picture plus a name and a few tags — the tags are what let her
   * choose it herself — so the prompt that made the picture is mined for both: its
   * first few words name the room, and its nouns tag it. Both are shown for editing
   * before anything is saved, because a prompt's first words are often a quality
   * incantation rather than a place.
   */
  private async useAsBackground(shot: Shot) {
    const prompt = shot.info?.prompt ?? this.prompt;
    const words = prompt.split(/[,\n]/).map((part) => part.trim()).filter(Boolean);
    const suggestedName = (words.find((part) => /^[a-z][a-z ]{2,40}$/i.test(part) && !/masterpiece|quality|detailed|resolution|score_/i.test(part)) ?? "Generated room")
      .replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 60);
    const name = window.prompt("Name this background", suggestedName)?.trim();
    if (!name) return;
    const stop = new Set(["masterpiece", "best", "quality", "detailed", "highly", "ultra", "high", "resolution", "the", "and", "with", "very", "background", "scenery", "score", "absurdres"]);
    const suggestedTags = [...new Set(prompt.toLowerCase().match(/[a-z]{4,}/g) ?? [])].filter((word) => !stop.has(word)).slice(0, 8);
    const tags = window.prompt("Tags — what it is, comma separated (she reads these to pick a room)", suggestedTags.join(", "));
    if (tags === null) return;
    try {
      const response = await fetch(this.previewURL(shot), { credentials: "same-origin" });
      if (!response.ok) throw new Error(`preview returned ${response.status}`);
      const dataURL = await blobToDataURL(await response.blob());
      const saved = await api.saveLibbyBackground({ name, tags: tags.split(",").map((t) => t.trim()).filter(Boolean) });
      await api.setLibbyBackgroundImage(saved.id, dataURL);
      this.showToast(`Added “${name}” to the rooms Libby can be in.`);
      void this.renderRoot.querySelector("oppai-outfit-wardrobe")?.refresh();
    } catch (e) {
      this.showToast(`Couldn't add that background: ${(e as Error).message}`);
    }
  }

  private async save(shot: Shot) {
    if (shot.saved) return;
    try {
      // A redo of one of her pictures stays one of hers when saved beside the original.
      await this.saveShot(shot, this.editingLibby ? ["libby"] : []);
      this.showToast("Saved to library");
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
      this.showToast("Set as the model's cover");
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

  /** Fills the editor with what the model's Civitai page recommends. Nothing is
   *  saved until Save, so the import can be read over first. */
  private async importCivitaiDefaults() {
    const d = this.metaDraft;
    if (!d || this.metaBusy) return;
    this.metaBusy = true;
    try {
      const { suggestion, keySet } = await api.civitaiSuggest({ key: d.key });
      const cur = this.metaDraft;
      if (!cur) return;
      const out = importSuggestion(cur.defaults ?? {}, this.metaTriggerText, suggestion, cur.type === "lora");
      this.metaDraft = { ...cur, defaults: out.defaults };
      this.metaTriggerText = out.triggerText;
      const said = out.applied.length ? `Imported ${out.applied.join(", ")} — check them and Save` : "The Civitai page recommends nothing new";
      this.showToast(keySet ? said : `${said}. A Civitai API key adds what the showcase pictures used.`);
    } catch (e) {
      this.showToast((e as Error).message);
    } finally {
      this.metaBusy = false;
    }
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

  /** Removes the model from InvokeAI — file included when InvokeAI manages it
   *  (an install from Civitai is) — and drops it from the form if it was picked. */
  private async deleteMetaModel() {
    const d = this.metaDraft;
    if (!d || this.metaBusy) return;
    const what = d.type === "lora" ? "LoRA" : "model";
    if (!confirm(`Delete the ${what} “${d.name}” from InvokeAI? The file goes with it.`)) return;
    this.metaBusy = true;
    try {
      await api.deleteModel(d.key);
      this.metaDraft = null;
      if (d.type === "lora") {
        const next = { ...this.selectedLoras };
        delete next[d.name];
        delete next[d.key];
        this.selectedLoras = next;
      } else if (this.checkpoint === d.key) {
        this.checkpoint = "";
      }
      this.showToast(`${what} deleted`);
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
      ${this.poseDraft ? this.renderPoseEditor(this.poseDraft) : nothing}
      ${this.wildcardDraft ? this.renderWildcardEditor(this.wildcardDraft) : nothing}
      ${this.metaDraft ? this.renderMetaEditor(this.metaDraft) : nothing}
      ${this.expandedShot ? this.renderLightbox(this.expandedShot) : nothing}
      ${this.renderCutoutDialog()}
      ${this.trainOpen
        // Out here rather than in renderBody, which shows a spinner while the status
        // reloads: a finished run reloads it, and the form must not be torn down.
        ? html`<oppai-lora-train .models=${this.status?.models ?? []} .loras=${this.status?.loras ?? []} .checkpoint=${this.checkpoint}
            @close=${() => (this.trainOpen = false)}
            @trained=${(e: CustomEvent<{ name: string }>) => {
              this.showToast(`${e.detail.name} is trained and installed`);
              void this.loadStatus();
            }}></oppai-lora-train>`
        : nothing}
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
          <h3>Edit ${isLora ? "LoRA" : "model"} — saved on ${this.status?.backend === "invokeai" ? "InvokeAI" : "Automatic1111"}</h3>
          <div>
            <label class="field">Name</label>
            <!-- Automatic1111 names a model by its file, so the name is not edited there. -->
            <input type="text" .value=${d.name} ?readonly=${this.status?.backend !== "invokeai"}
              title=${this.status?.backend !== "invokeai" ? "Automatic1111 names a model by its file" : ""}
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
            ? html`<div class="meta-grid">
                <div class="full">
                  <label class="field">Recommended weight</label>
                  <input class="num" type="number" min="-2" max="2" step="0.05"
                    .value=${String(defaults.weight ?? "")} placeholder="1"
                    @input=${(e: Event) =>
                      this.setMetaDefaults({ weight: Number((e.target as HTMLInputElement).value) || 0 })} />
                </div>
                <div>
                  <label class="field">Works from</label>
                  <input class="num" type="number" min="-5" max="5" step="0.05" .value=${String(defaults.weightMin || "")}
                    @input=${(e: Event) =>
                      this.setMetaDefaults({ weightMin: Number((e.target as HTMLInputElement).value) || 0 })} />
                </div>
                <div>
                  <label class="field">to</label>
                  <input class="num" type="number" min="-5" max="5" step="0.05" .value=${String(defaults.weightMax || "")}
                    @input=${(e: Event) =>
                      this.setMetaDefaults({ weightMax: Number((e.target as HTMLInputElement).value) || 0 })} />
                </div>
                <div class="full">
                  <label class="field">Negative prompt while it's on</label>
                  <textarea rows="2" .value=${defaults.negative ?? ""} placeholder="3d, realistic"
                    @input=${(e: Event) => this.setMetaDefaults({ negative: (e.target as HTMLTextAreaElement).value })}></textarea>
                </div>
              </div>`
            : html`
                <div>
                  <label class="field">Recommended positive (put at the front of the prompt)</label>
                  <textarea rows="2" .value=${defaults.positive ?? ""} placeholder="masterpiece, best quality"
                    @input=${(e: Event) => this.setMetaDefaults({ positive: (e.target as HTMLTextAreaElement).value })}></textarea>
                </div>
                <div>
                  <label class="field">Recommended negative</label>
                  <textarea rows="2" .value=${defaults.negative ?? ""} placeholder="lowres, worst quality"
                    @input=${(e: Event) => this.setMetaDefaults({ negative: (e.target as HTMLTextAreaElement).value })}></textarea>
                </div>
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
                    <label class="field">Clip skip</label>
                    <input class="num" type="number" min="0" max="12" .value=${String(defaults.clipSkip || "")} placeholder="Model's own"
                      @input=${(e: Event) =>
                        this.setMetaDefaults({ clipSkip: Number((e.target as HTMLInputElement).value) || 0 })} />
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
            <button class="btn danger" ?disabled=${this.metaBusy} title="Remove from the generator, file included"
              @click=${() => this.deleteMetaModel()}>Delete</button>
            <button class="btn" ?disabled=${this.metaBusy}
              title="Fill in the trigger words, prompts and settings the model's Civitai page recommends"
              @click=${() => this.importCivitaiDefaults()}>
              <span class="material-symbols-rounded" style="font-size:17px;">download</span> Import from Civitai
            </button>
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
    // InvokeAI keeps a gallery; on A1111 the server keeps one of everything made here.
    const gallery = st.gallery ?? (invoke ? "invokeai" : "oppailib");
    return html`
      <div class="studio mode-${this.currentMode}">
        ${this.renderStudioHeader(st, invoke)}
        ${this.studio ? this.renderSprites(st, invoke) : this.renderCreate(st, invoke, gallery)}
      </div>
      ${this.paintOpen && this.source
        ? html`<oppai-paint-mask .src=${this.source.url} .name=${this.source.name}
            .width=${this.source.width} .height=${this.source.height}
            .strokes=${this.sourceStrokes} .denoise=${Math.max(0.2, this.sourceDenoise)}
            @apply=${(e: CustomEvent<PaintResult>) => this.onPainted(e.detail)}
            @close=${() => this.closePainter()}></oppai-paint-mask>`
        : nothing}
      ${this.civitaiOpen
        ? html`<oppai-civitai backend=${this.status?.backend ?? "invokeai"} .mode=${this.civitaiMode} .canManage=${!!this.status?.manageModels}
            .manageNote=${manageModelsNote(this.status)}
            @close=${() => this.onCivitaiClose()}
            @use-prompt=${(e: CustomEvent<PromptSettings>) => this.onCivitaiPrompt(e.detail)}></oppai-civitai>`
        : nothing}
      ${this.renamingLoras
        ? html`<oppai-rename-dialog kind="lora" .names=${this.renamingLoras} .existing=${(st.loras ?? []).map((l) => l.name)}
            @renamed=${(e: CustomEvent<{ renamed: ModelRename[] }>) => this.onLorasRenamed(e.detail.renamed)}
            @close=${() => (this.renamingLoras = null)}></oppai-rename-dialog>`
        : nothing}
      ${this.shortcutsOpen ? this.renderShortcuts() : nothing}
    `;
  }

  // ── the studio's header ─────────────────────────────────────────────────────
  //
  // Three modes behind one header: Image and Video are this element, Sprites is the
  // other one the shell keeps, and the switch hides that seam. The generator, the
  // queue and the panels sit on the right, the same in every mode, so nothing moves
  // when the mode does.

  private renderStudioHeader(st: ImageGenStatus, invoke: boolean) {
    const mode = this.currentMode;
    const model = (st.models ?? []).find((m) => m.title === this.checkpoint);
    const thumb = model ? `${api.modelThumbURL(model.title)}&v=${this.thumbVersion}` : "";
    const running = clipsRunning();
    const inspectorOut = this.studio ? this.spriteInspector : this.createTab !== "";
    const busy = (m: StudioMode) => (m === "video" ? running > 0 : m === "sprites" ? this.studio && this.generating : !this.studio && this.generating);
    const wardrobe = this.wardrobes.find((o) => o.id === this.outfitWardrobeId);
    return html`<header class="studio-head">
      <div class="mode-switch" role="tablist" aria-label="Studio">
        ${MODES.map((m, i) => html`<button role="tab" class="mode ${mode === m.id ? "on" : ""}"
          aria-selected=${mode === m.id ? "true" : "false"} title=${`${m.label} studio (Alt+${i + 1})`}
          @click=${() => this.switchMode(m.id)}>
          <span class="material-symbols-rounded">${m.icon}</span><span class="mode-label">${m.label}</span>
          ${m.id === "video" && running ? html`<span class="mode-badge" title=${`${running} clip${running === 1 ? "" : "s"} in the works`}>${running}</span>`
            : busy(m.id) ? html`<span class="mode-dot" title="Working"></span>` : nothing}
        </button>`)}
      </div>
      ${this.studio ? html`<div class="sub-switch" role="tablist" aria-label="Sprites view">
        <button role="tab" class=${this.studioView === "build" ? "on" : ""} aria-selected=${this.studioView === "build" ? "true" : "false"}
          @click=${() => (this.studioView = "build")}>
          <span class="material-symbols-rounded">grid_view</span>Board${wardrobe ? html`<span class="sub-note">${wardrobe.name}</span>` : nothing}
        </button>
        <button role="tab" class=${this.studioView === "wardrobe" ? "on" : ""} aria-selected=${this.studioView === "wardrobe" ? "true" : "false"}
          @click=${() => { this.studioView = "wardrobe"; void this.renderRoot.querySelector("oppai-outfit-wardrobe")?.refresh(); }}>
          <span class="material-symbols-rounded">styler</span>Wardrobe &amp; rooms
        </button>
      </div>` : nothing}
      <span class="head-spacer"></span>
      ${mode === "video"
        ? html`<span class="gen-pill static" title="Clips are made by ComfyUI"><span class="gen-icon"><span class="material-symbols-rounded">movie</span></span>
            <span class="gen-text"><span class="gen-kicker"><span class="status-dot ${st.clips?.image || st.clips?.text ? "" : "off"}"></span>ComfyUI</span>
            <span class="gen-name">${st.clips?.image || st.clips?.text ? "Wan video" : "Not set up"}</span></span></span>`
        : html`<button class="gen-pill" title=${model?.title ?? "Choose a model"}
            @click=${() => { if (this.studio) { this.spriteTab = "generator"; this.spriteInspector = true; } else this.openCreateTab("models"); }}>
            ${thumb && !this.failedThumbs.has(thumb)
              ? html`<img src=${thumb} alt="" @error=${() => (this.failedThumbs = new Set(this.failedThumbs).add(thumb))} />`
              : html`<span class="gen-icon"><span class="material-symbols-rounded">deployed_code</span></span>`}
            <span class="gen-text">
              <span class="gen-kicker"><span class="status-dot"></span>${invoke ? "InvokeAI" : "Automatic1111"}${model?.base ? html` · ${model.base}` : nothing}</span>
              <span class="gen-name">${model?.model_name || this.checkpoint || "Choose a model"}</span>
            </span>
            <span class="material-symbols-rounded gen-caret">expand_more</span>
          </button>`}
      ${mode === "image" ? html`<button class="head-btn ${this.queue.length ? "lit" : ""}" aria-expanded=${this.queueOpen ? "true" : "false"}
          title="Runs waiting their turn" @click=${() => (this.queueOpen = !this.queueOpen)}>
          <span class="material-symbols-rounded">queue</span><span class="head-label">Queue</span>
          ${this.queue.length ? html`<span class="head-count">${this.queue.length}</span>` : nothing}
        </button>` : nothing}
      ${st.civitai ? html`<button class="head-btn" title=${mode === "video" ? "Find Wan models and LoRAs on Civitai" : "Find models and LoRAs on Civitai"}
          @click=${() => { this.civitaiMode = mode === "video" ? "video" : "pictures"; this.civitaiOpen = true; }}>
          <span class="material-symbols-rounded">travel_explore</span><span class="head-label">Civitai</span>
        </button>` : nothing}
      ${mode !== "video" ? html`<button class="head-btn" title="Train a LoRA on your own pictures" @click=${() => (this.trainOpen = true)}>
          <span class="material-symbols-rounded">model_training</span><span class="head-label">Train</span>
        </button>` : nothing}
      <span class="head-sep"></span>
      ${mode !== "video" ? html`<button class="head-icon ${inspectorOut ? "on" : ""}" aria-pressed=${inspectorOut ? "true" : "false"}
          title=${this.studio ? "The recipe ([)" : "The inspector ([)"} @click=${() => this.toggleInspector()}>
          <span class="material-symbols-rounded">${inspectorOut ? "left_panel_close" : "left_panel_open"}</span>
        </button>` : nothing}
      <button class="head-icon ${this.sidePanel ? "on" : ""}" aria-pressed=${this.sidePanel ? "true" : "false"}
        title=${this.studio ? "The selected square (])" : "The gallery (])"} @click=${() => (this.sidePanel = !this.sidePanel)}>
        <span class="material-symbols-rounded">${this.sidePanel ? "right_panel_close" : "right_panel_open"}</span>
      </button>
      <button class="head-icon" title="Keyboard shortcuts (?)" @click=${() => (this.shortcutsOpen = true)}>
        <span class="material-symbols-rounded">keyboard</span>
      </button>
      ${this.queueOpen && mode === "image" ? this.renderQueue() : nothing}
    </header>`;
  }

  /** The queue, dropped from its header button: what is waiting, in order. */
  private renderQueue() {
    return html`<div class="pop queue-pop" role="dialog" aria-label="The queue">
      <div class="pop-head">
        <span class="material-symbols-rounded">queue</span>Queue
        <span class="pop-note">${this.generating ? "Drawing now; these follow" : "Nothing drawing"}</span>
        <button class="pop-x" aria-label="Close" @click=${() => (this.queueOpen = false)}><span class="material-symbols-rounded">close</span></button>
      </div>
      ${this.queue.length
        ? html`<ol class="queue-list">${this.queue.map((q, i) => html`<li>
            <span class="q-n">${i + 1}</span>
            <span class="q-what" title=${q.prepared.params.prompt}>${q.label || "(no prompt)"}
              <small>${q.prepared.params.width}×${q.prepared.params.height} · ${q.prepared.params.count ?? 1} picture${(q.prepared.params.count ?? 1) === 1 ? "" : "s"}${q.prepared.from ? ` · from ${q.prepared.from.name}` : ""}</small></span>
            <button class="q-btn" title="Sooner" aria-label="Move up" ?disabled=${i === 0} @click=${() => this.moveQueued(q.id, -1)}><span class="material-symbols-rounded">arrow_upward</span></button>
            <button class="q-btn" title="Later" aria-label="Move down" ?disabled=${i === this.queue.length - 1} @click=${() => this.moveQueued(q.id, 1)}><span class="material-symbols-rounded">arrow_downward</span></button>
            <button class="q-btn" title="Take it out" aria-label="Remove" @click=${() => this.unqueue(q.id)}><span class="material-symbols-rounded">close</span></button>
          </li>`)}</ol>`
        : html`<p class="pop-empty">While a picture draws, press <b>Queue</b> beside Generate (or Ctrl+Shift+Enter) and the form as it is goes in line.
            Change the prompt and queue again — each run keeps the settings it was queued with.</p>`}
    </div>`;
  }

  private renderShortcuts() {
    const mode = this.currentMode;
    return html`<div class="overlay" @click=${(e: Event) => { if (e.target === e.currentTarget) this.shortcutsOpen = false; }}>
      <div class="dialog shortcuts" role="dialog" aria-label="Keyboard shortcuts">
        <h3><span class="material-symbols-rounded">keyboard</span> Keyboard shortcuts</h3>
        <div class="keys">
          ${SHORTCUTS.filter((k) => !k.mode || k.mode === mode).map((k) => html`<div class="key-row">
            <span class="key-caps">${k.keys.split(" ").map((c) => html`<kbd>${c}</kbd>`)}</span><span>${k.what}</span>
          </div>`)}
        </div>
        <div class="dialog-actions"><button class="btn" @click=${() => (this.shortcutsOpen = false)}>Close</button></div>
      </div>
    </div>`;
  }

  // ── the Image and Video studios ─────────────────────────────────────────────

  private renderCreate(st: ImageGenStatus, invoke: boolean, gallery: string) {
    const tab = this.createTab;
    const video = this.mode === "video";
    const galleryOut = !!gallery && this.sidePanel;
    return html`<div class="workspace create">
      <div class="create-shell ${video ? "video" : "image"} ${tab && !video ? "drawer-open" : ""} ${galleryOut ? "with-gallery" : ""} ${this.loraDrag ? "lora-dragging" : ""}">
        ${video
          ? html`<oppai-video-studio .clips=${st.clips ?? {}}
              @use-frame=${(e: CustomEvent<ClipPicture>) => void this.usePicture(e.detail.url, e.detail.name, "img2img", true)}
              @find-video-models=${() => { this.civitaiMode = "video"; this.civitaiOpen = true; }}></oppai-video-studio>`
          : html`${this.renderCreateRail()}
            ${tab
              ? html`<div class="drawer-scrim" @click=${() => (this.createTab = "")}></div>
                  <aside class="create-drawer" aria-label=${CREATE_TABS.find((t) => t.id === tab)?.label ?? ""}>
                    ${this.renderCreateDrawer(st, invoke)}
                  </aside>`
              : nothing}
            <section class="create-stage">
              ${this.renderRecipeStrip(st)}
              <div class="canvas-wrap">
                <div class="canvas-stage viewer-stage ${this.stageDrop ? "drop" : ""}"
                  @dragover=${(e: DragEvent) => this.onStageDragOver(e)} @dragleave=${(e: DragEvent) => { if (e.target === e.currentTarget) this.stageDrop = false; }}
                  @drop=${(e: DragEvent) => this.onStageDrop(e)}>
                  ${this.renderViewer()}
                  ${this.restarting || this.error
                    ? html`<div class="banner">${this.restarting ? "Restarting Automatic1111 — it takes a minute or two…" : this.error}</div>`
                    : nothing}
                  ${this.generating ? this.renderGenerating(invoke) : nothing}
                </div>
                ${this.loraDrag ? this.renderLoraDrop() : nothing}
              </div>
              ${this.renderSessionStrip()}
              <div class="prompt-dock">${this.renderPrompt()}</div>
            </section>`}
        ${gallery
          ? html`<aside class="right create-gallery ${galleryOut ? "" : "stowed"}" aria-hidden=${galleryOut ? "false" : "true"}>
              <oppai-invoke-gallery workspace backend=${gallery}
                .startBoard=${this.board}
                .canPaint=${!invoke}
                .canFixFaces=${!invoke && !!st.detailerAvailable}
                .fixLabel=${fixLabel(this.detailerPasses)}
                .upscaleLabel=${this.canUpscale ? `Upscale ${this.upscaleBy}×` : ""}
                .canAnimate=${!!st.clips?.image}
                .canSetCovers=${invoke || !!st.manageModels}
                .loras=${(st.loras ?? []).map((l) => l.name)}
                @covers-changed=${() => this.bumpThumbs()}
                @use-picture=${(e: CustomEvent<UsePicture>) =>
                  void this.usePicture(e.detail.url, e.detail.name, e.detail.mode, false, e.detail.gallery)}
                @boards-changed=${() => this.loadStatus()}
                @board-changed=${(e: CustomEvent<{ board: string }>) => (this.board = e.detail.board)}
                @cut-out=${(e: CustomEvent<{ url: string; name: string }>) =>
                  void this.openCutout(e.detail.url, e.detail.name)}
                @reuse-generation=${(e: CustomEvent<GenInfo>) => this.reuseGenInfo(e.detail)}
              ></oppai-invoke-gallery>
            </aside>`
          : nothing}
      </div>
    </div>`;
  }

  /** A gallery tile or a file dragged over the stage: the next run starts from it. */
  private onStageDragOver(e: DragEvent) {
    const types = e.dataTransfer?.types ?? [];
    if (!types.includes(GALLERY_DRAG_TYPE) && !types.includes("Files")) return;
    e.preventDefault();
    // The gallery offers its tiles as a move (onto folders); a copy would be refused.
    if (e.dataTransfer) e.dataTransfer.dropEffect = types.includes(GALLERY_DRAG_TYPE) ? "move" : "copy";
    this.stageDrop = true;
  }

  private onStageDrop(e: DragEvent) {
    const names = e.dataTransfer?.getData(GALLERY_DRAG_TYPE);
    const file = e.dataTransfer?.files?.[0];
    if (!names && !file) return;
    e.preventDefault();
    this.stageDrop = false;
    if (names) {
      try {
        const name = (JSON.parse(names) as string[])[0];
        if (name) void this.usePicture(api.galleryFullURL(name), name, "img2img", false, name);
      } catch {
        // Not a gallery payload after all.
      }
      return;
    }
    if (file?.type.startsWith("image/")) void this.usePicture(URL.createObjectURL(file), file.name, "img2img", true);
  }

  // ── the Create screen ───────────────────────────────────────────────────────
  //
  // Three things, in the order they are used: what to draw with (the rail down the
  // left, each tab a drawer beside the canvas), what is being drawn with right now
  // (the recipe strip over the canvas — the model, the LoRAs that are on, the size,
  // the seed — each one a button back to where it is changed), and what to draw (the
  // composer under the canvas). It used to be one long accordion of eight sections,
  // which showed the half-cut top of a section while it was closed and on a phone put
  // all of them above the canvas. Only one drawer is open at a time, and shutting it
  // gives the canvas the room.

  private openCreateTab(id: CreateTab, toggle = false) {
    const next = toggle && this.createTab === id ? "" : id;
    if (next !== this.createTab) this.pickerFilter = "";
    this.createTab = next;
  }

  private renderCreateRail() {
    const badges: Partial<Record<CreateTab, number>> = {
      loras: Object.keys(this.selectedLoras).length,
      look: this.selectedChars.length + this.selectedPoses.length + (this.regionsActive ? this.regionPeople.length : 0),
      detailer: this.status?.detailerAvailable && this.detailerEnabled && this.detailerHasPasses
        ? detailerModels(this.detailerPasses).length + (this.status?.detectors?.length ? customPassParams(this.detailerCustom).length : 0)
        : 0,
      settings: this.templateId ? 1 : 0,
    };
    return html`<nav class="create-rail" aria-label="Generation setup">
      ${CREATE_TABS.map((t) => html`<button class="rail-tab ${this.createTab === t.id ? "on" : ""}"
          aria-pressed=${this.createTab === t.id ? "true" : "false"} title=${t.label}
          @click=${() => this.openCreateTab(t.id, true)}>
          <span class="material-symbols-rounded rail-icon">${t.icon}</span>
          <span class="rail-label">${t.label}</span>
          ${badges[t.id] ? html`<span class="rail-badge">${badges[t.id]}</span>` : nothing}
        </button>`)}
    </nav>`;
  }

  private renderPickerSearch(placeholder: string) {
    return html`<label class="picker-search">
      <span class="material-symbols-rounded">search</span>
      <input type="search" .value=${this.pickerFilter} placeholder=${placeholder} aria-label=${placeholder}
        @input=${(e: Event) => (this.pickerFilter = (e.target as HTMLInputElement).value)} />
    </label>`;
  }

  /** Why the edit, cover and Civitai-install controls are missing on an A1111. */
  private renderManageNote(st: ImageGenStatus, invoke: boolean) {
    const note = invoke ? "" : manageModelsNote(st);
    if (!note) return nothing;
    return html`<div class="manage-note">
      <span class="material-symbols-rounded">info</span>
      <span>${note}</span>
    </div>`;
  }

  private renderCreateDrawer(st: ImageGenStatus, invoke: boolean) {
    const tab = this.createTab as CreateTab;
    const meta = CREATE_TABS.find((t) => t.id === tab)!;
    // The sections come out with no title of their own: the inspector's header
    // already says what this is.
    let body: unknown = nothing;
    {
      switch (tab) {
        case "models":
          body = html`${this.renderPickerSearch("Search models")}
            ${this.renderModelSection(st.models ?? [])}
            ${this.renderManageNote(st, invoke)}`;
          break;
        case "loras":
          // The picker has its own search, beside its order and Sort mode.
          body = this.renderLoraSection(st.loras ?? [], st.loraError);
          break;
        case "look":
          body = html`<div class="pane-title">Characters</div>${this.renderCharacterSection()}
            <div class="pane-title">Poses</div>${this.renderPoseSection()}
            ${invoke ? nothing : html`<div class="pane-title">People in parts of their own</div>${this.renderPeopleSection()}`}`;
          break;
        case "wildcards":
          body = this.renderWildcardSection();
          break;
        case "detailer":
          body = this.renderDetailerSection(invoke);
          break;
        case "settings":
          // Saved prompt styles were a rail tab of their own, and read as LoRA styles
          // beside the LoRA categories; they are a setting, and an occasional one.
          body = html`<div class="pane-title">Size</div><div class="pane">${this.renderPromptOptions()}</div>
            <div class="pane-title">Sampling</div>${this.renderSettingsSection(invoke, st.boards ?? [])}
            <div class="pane-title">VAE</div>${this.renderVaeSection(st.vaes ?? [])}
            <div class="pane-title">Saved prompt styles</div>${this.renderTemplateSection(st.templates ?? [])}
            ${this.renderGeneratorPane(st, invoke)}`;
          break;
      }
    }
    return html`
      <div class="drawer-head">
        <span class="material-symbols-rounded">${meta.icon}</span>
        ${meta.label}
        <span class="toolbar-spacer"></span>
        ${tab === "loras"
          ? html`<button class="drawer-action" title="Train a LoRA on your own pictures" @click=${() => (this.trainOpen = true)}>
              <span class="material-symbols-rounded">model_training</span>
            </button>`
          : nothing}
        ${tab === "models" || tab === "loras"
          ? html`<button class="drawer-action" title="Find more on Civitai"
              @click=${() => { this.civitaiMode = "pictures"; this.civitaiOpen = true; }}>
              <span class="material-symbols-rounded">travel_explore</span>
            </button>`
          : nothing}
        <button class="drawer-action" title="Close" aria-label="Close" @click=${() => (this.createTab = "")}>
          <span class="material-symbols-rounded">close</span>
        </button>
      </div>
      <div class="drawer-scroll">${body}</div>
    `;
  }

  /**
   * The recipe: what the next generation will be made with, readable at a glance and
   * each part a button to where it is changed. The LoRAs that are on show here with
   * their weights and can be taken off without opening anything. The model is in the
   * studio's header, which every mode shares.
   */
  private renderRecipeStrip(st: ImageGenStatus) {
    const loras = (st.loras ?? []).filter((l) => l.name in this.selectedLoras);
    const detailer = st.detailerAvailable && this.detailerEnabled && this.detailerHasPasses;
    return html`<div class="recipe">
      <div class="recipe-chips">
        ${loras.map((l) => html`<span class="recipe-chip lora">
          <button class="recipe-chip-main" title="Change the weight in the LoRAs tab" @click=${() => this.openCreateTab("loras")}>
            <span class="material-symbols-rounded">style</span>${l.alias || l.name}<b>${this.selectedLoras[l.name]}</b>
          </button>
          <button class="recipe-chip-x" title="Take this LoRA off" aria-label=${`Remove ${l.alias || l.name}`} @click=${() => this.toggleLora(l.name)}>
            <span class="material-symbols-rounded">close</span>
          </button>
        </span>`)}
        ${this.regionsActive ? this.regionPeople.map((p, i) => p.lora ? html`<span class="recipe-chip lora">
          <button class="recipe-chip-main" title=${`Person ${i + 1}'s LoRA — change it under Look`} @click=${() => this.openCreateTab("look")}>
            <span class="material-symbols-rounded">person</span>${i + 1} · ${this.loraLabel(p.lora)}<b>${p.loraWeight}</b>
          </button>
          <button class="recipe-chip-x" title=${`Take this LoRA off person ${i + 1}`} aria-label=${`Take ${this.loraLabel(p.lora)} off person ${i + 1}`}
            @click=${() => this.takeLoraOffPerson(i)}>
            <span class="material-symbols-rounded">close</span>
          </button>
        </span>` : nothing) : nothing}
        ${loras.length ? nothing : html`<button class="recipe-chip add" @click=${() => this.openCreateTab("loras")}>
          <span class="material-symbols-rounded">add</span>LoRA
        </button>`}
        <span class="recipe-sep"></span>
        <button class="recipe-chip" title="Output size" @click=${() => this.openCreateTab("settings")}>
          <span class="material-symbols-rounded">aspect_ratio</span>${this.sizeLabel()}
        </button>
        <button class="recipe-chip" title="Sampling settings" @click=${() => this.openCreateTab("settings")}>
          <span class="material-symbols-rounded">tune</span>${this.steps} steps · CFG ${this.cfg}
        </button>
        ${this.hiresEnabled && this.canUpscale ? html`<button class="recipe-chip on" title="Hires fix is on" @click=${() => this.openCreateTab("settings")}>
          <span class="material-symbols-rounded">open_in_full</span>Hires ${this.hiresScale}×
        </button>` : nothing}
        ${detailer ? html`<button class="recipe-chip on" title="ADetailer runs after each picture" @click=${() => this.openCreateTab("detailer")}>
          <span class="material-symbols-rounded">face_retouching_natural</span>${fixLabel(this.detailerPasses)}
        </button>` : nothing}
        <button class="recipe-chip ${this.seed >= 0 ? "on" : ""}"
          title=${this.seed < 0 ? "A new seed every time — click to keep the last picture's" : "This seed is kept — click to go back to random"}
          @click=${() => this.toggleSeedLock()}>
          <span class="material-symbols-rounded">${this.seed < 0 ? "casino" : "lock"}</span>${this.seed < 0 ? "Random seed" : this.seed}
        </button>
      </div>
    </div>`;
  }

  private loraLabel(name: string): string {
    const l = (this.status?.loras ?? []).find((x) => x.name === name);
    return l?.alias || name;
  }

  private takeLoraOffPerson(i: number) {
    this.regionPeople = this.regionPeople.map((p, j) => (j === i ? { ...p, lora: "" } : p));
  }

  // ── dragging a LoRA onto the picture ────────────────────────────────────────
  //
  // A card dragged out of the LoRA picker is put on where it is dropped: anywhere on
  // the picture with one person, and with two or more, on one person's part of it —
  // the parts drawn to the picture's shape, the way Regional Prompter divides it —
  // or on the band for everyone. It used to take the Look drawer's dropdown per
  // person, which listed two hundred LoRAs by file name.

  /** Over the canvas while a LoRA is dragged: where it can go. */
  private renderLoraDrop() {
    const name = this.loraLabel(this.loraDrag);
    const people = this.regionsActive;
    const target = (t: number | "all") => ({
      over: (e: DragEvent) => this.loraDragOver(e, t),
      drop: (e: DragEvent) => this.loraDrop(e, t),
    });
    const all = target("all");
    return html`<div class="lora-drop" @dragover=${(e: DragEvent) => { if (e.target === e.currentTarget) this.loraOver = null; }}
      @drop=${(e: DragEvent) => { e.preventDefault(); this.loraDrag = ""; }}>
      <div class="drop-title"><span class="material-symbols-rounded">style</span><b>${name}</b>
        ${people ? html`<span>— on a person, or on everyone</span>` : nothing}</div>
      ${people
        ? html`${this.renderPeopleFrame(true)}
            <div class="drop-all slim ${this.loraOver === "all" ? "over" : ""}" @dragover=${all.over} @drop=${all.drop}>
              <span class="material-symbols-rounded">group</span>Everyone — in the prompt they all share</div>`
        : html`<div class="drop-all ${this.loraOver === "all" ? "over" : ""}" @dragover=${all.over} @drop=${all.drop}>
            <span class="material-symbols-rounded">add_circle</span>${this.selectedLoras[this.loraDrag] !== undefined ? "It's on already" : "Drop to put it on"}</div>`}
    </div>`;
  }

  /** The picture as its people divide it, each part a place to drop a LoRA for that
      person and showing the one they wear: over the canvas while a LoRA is dragged,
      and on the canvas while it is empty. */
  private renderPeopleFrame(dragging: boolean) {
    const people = this.regionPeople;
    const boxes = regionBoxes(people);
    const ratio = this.width / Math.max(1, this.height);
    // Over the canvas, as big as the room under the title and above the band for
    // everyone allows (the overlay is a size container); on the empty canvas, which
    // scrolls, a fixed size.
    const width = dragging
      ? `min(100%, ${Math.round(420 * ratio)}px, calc((100cqh - 128px) * ${ratio.toFixed(4)}))`
      : `min(100%, ${Math.round(260 * ratio)}px)`;
    return html`<div class="people-frame ${this.regionsRows ? "rows" : ""}"
      style=${`width:${width};aspect-ratio:${this.width} / ${this.height};`}>
      ${people.map((p, i) => html`<div class="drop-part ${this.loraOver === i ? "over" : ""}" style=${`flex:${boxes[i].size} 1 0;`}
        @dragover=${(e: DragEvent) => this.loraDragOver(e, i)} @drop=${(e: DragEvent) => this.loraDrop(e, i)}>
        <span class="drop-n">${i + 1}</span>
        ${p.lora
          ? html`<span class="drop-lora" title=${p.lora}><span class="material-symbols-rounded">style</span><span class="nm">${this.loraLabel(p.lora)}</span>
              ${dragging ? nothing : html`<button title=${`Take it off person ${i + 1}`} aria-label=${`Take ${this.loraLabel(p.lora)} off person ${i + 1}`}
                @click=${() => this.takeLoraOffPerson(i)}><span class="material-symbols-rounded">close</span></button>`}</span>`
          : html`<span class="drop-empty">${dragging ? `Person ${i + 1}` : "Drop a LoRA here"}</span>`}
      </div>`)}
    </div>`;
  }

  private loraDragOver(e: DragEvent, target: number | "all") {
    if (!e.dataTransfer?.types.includes(LORA_DRAG_TYPE)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    if (this.loraOver !== target) this.loraOver = target;
  }

  private loraDrop(e: DragEvent, target: number | "all") {
    const name = e.dataTransfer?.getData(LORA_DRAG_TYPE) || this.loraDrag;
    if (!name) return;
    e.preventDefault();
    e.stopPropagation();
    this.loraDrag = "";
    this.loraOver = null;
    this.wearLora(name, target);
  }

  /** Puts a LoRA on one person, or on the whole picture (and off whoever wore it). */
  private wearLora(name: string, target: number | "all") {
    const label = this.loraLabel(name);
    if (target === "all") {
      const worn = this.regionPeople.some((p) => p.lora === name);
      this.regionPeople = unwearLora(this.regionPeople, name);
      if (!(name in this.selectedLoras)) this.toggleLora(name);
      else if (!worn) {
        this.showToast(`${label} is on already`);
        return;
      }
      if (this.regionsActive) this.showToast(`${label} is on everyone`);
      return;
    }
    const weight = (this.status?.loras ?? []).find((l) => l.name === name)?.weight;
    this.regionPeople = putLoraOn(this.regionPeople, target, name, weight);
    this.showToast(`${label} is on person ${target + 1}`);
  }

  /** What was renamed, followed everywhere the studio names a LoRA: the ones that are
      on, the people's, the passes' and the tags typed into the prompts. */
  private onLorasRenamed(renamed: ModelRename[]) {
    const to = renamedMap(renamed);
    if (!to.size) return;
    this.selectedLoras = renameKeys(this.selectedLoras, to);
    this.regionPeople = this.regionPeople.map((p) => (to.has(p.lora) ? { ...p, lora: to.get(p.lora)! } : p));
    this.detailerCustom = this.detailerCustom.map((p) => ({
      ...p, lora: to.get(p.lora) ?? p.lora, prompt: renameLorasInPrompt(p.prompt, to),
    }));
    this.prompt = renameLorasInPrompt(this.prompt, to);
    this.negative = renameLorasInPrompt(this.negative, to);
    this.detailerPrompt = renameLorasInPrompt(this.detailerPrompt, to);
    // On screen at once; the status read after says the same with the rest moved.
    if (this.status?.loras) {
      const keys = new Map(renamed.map((r) => [r.oldName, r.newKey]));
      this.status = {
        ...this.status,
        loras: this.status.loras.map((l) => (to.has(l.name) ? { ...l, name: to.get(l.name)!, key: keys.get(l.name) ?? l.key } : l)),
      };
    }
    this.showToast(renamed.length === 1 ? `Renamed to ${renamed[0].newName}` : `Renamed ${renamed.length} LoRAs`);
    void this.refreshStatus();
  }

  // ── restarting Automatic1111 ────────────────────────────────────────────────

  /** The generator itself, at the foot of the settings drawer: restarting it, for
      what it reads only when it starts. */
  private renderGeneratorPane(st: ImageGenStatus, invoke: boolean) {
    if (invoke) return nothing;
    return html`<div class="pane-title">Automatic1111</div>
      <div class="pane restart-pane">
        <span>${st.canRestart
          ? "Restart it to read new detectors and extensions. It is back in a minute or two; a picture it is drawing is lost."
          : "To restart it from here, start Automatic1111 with --api-server-stop (in COMMANDLINE_ARGS, beside --api) once by hand."}</span>
        <button class="chip" ?disabled=${this.restarting} @click=${() => void this.restartGenerator()}>
          <span class="material-symbols-rounded">restart_alt</span>${this.restarting ? "Restarting…" : "Restart"}
        </button>
      </div>`;
  }

  /** Asks Automatic1111 to restart, then follows the status until it is back: down
      first, then answering again (or answering after long enough that the going
      down was missed between two looks). */
  private async restartGenerator() {
    if (this.restarting) return;
    if (!confirm("Restart Automatic1111? It takes a minute or two, and a picture it is drawing now is lost.")) return;
    this.restarting = true;
    try {
      await api.restartGenerator();
    } catch (e) {
      this.restarting = false;
      this.showToast((e as Error).message);
      return;
    }
    const started = Date.now();
    let wentDown = false;
    while (this.isConnected && Date.now() - started < 5 * 60_000) {
      await new Promise((r) => setTimeout(r, 3000));
      try {
        const st = await api.imageGenStatus();
        if (!st.reachable) {
          wentDown = true;
          continue;
        }
        if (wentDown || Date.now() - started > 45_000) {
          this.status = st;
          this.restarting = false;
          this.showToast("Automatic1111 is back");
          return;
        }
      } catch {
        wentDown = true;
      }
    }
    this.restarting = false;
    this.showToast("Automatic1111 hasn't come back yet — look at it where it runs");
    void this.refreshStatus();
  }

  /** Keeps the seed of the picture on the canvas, or goes back to a new one each time. */
  private toggleSeedLock() {
    if (this.seed >= 0) {
      this.seed = -1;
      return;
    }
    const last = this.shots[0]?.seed;
    if (last === undefined || last < 0) {
      this.showToast("Generate a picture first — its seed is the one kept");
      return;
    }
    this.seed = last;
  }

  // ── the Sprites studio ──────────────────────────────────────────────────────
  //
  // Two views. The board is the recipe on the left — in four tabs rather than one
  // accordion of eleven sections — the sheet of squares in the middle, and the square
  // that is selected on the right with everything that can be done to it. "Wardrobe &
  // rooms" is what she actually wears and where she stands, full width, because it is
  // a gallery and was never a sidebar section.

  private renderSprites(st: ImageGenStatus, invoke: boolean) {
    if (this.studioView === "wardrobe") {
      return html`<div class="workspace"><div class="studio-wardrobe">
        <oppai-outfit-wardrobe
          @edit-slot=${(e: CustomEvent<{ outfitId: string; slot: string; level: number }>) =>
            void this.editWardrobeSlot(e.detail.outfitId, e.detail.slot, e.detail.level)}
          @build-outfit=${(e: CustomEvent<{ outfitId: string }>) => {
            this.outfitWardrobeId = e.detail.outfitId;
            this.persistDraft();
            this.studioView = "build";
            void this.loadWipBoard(e.detail.outfitId);
          }}
        ></oppai-outfit-wardrobe>
      </div></div>`;
    }
    return html`<div class="workspace">
      <div class="sprite-shell ${this.spriteInspector ? "with-inspector" : ""} ${this.sidePanel ? "with-focus" : ""}">
        ${this.spriteInspector ? html`<aside class="sprite-inspector">
          <div class="ins-tabs" role="tablist" aria-label="The recipe">
            ${SPRITE_TABS.map((t) => html`<button role="tab" class=${this.spriteTab === t.id ? "on" : ""}
              aria-selected=${this.spriteTab === t.id ? "true" : "false"} @click=${() => (this.spriteTab = t.id)}>
              <span class="material-symbols-rounded">${t.icon}</span>${t.label}
            </button>`)}
          </div>
          <div class="panel-scroll ins-body">${this.renderSpriteTab(st, invoke)}</div>
        </aside>` : nothing}
        <section class="workbench">
          ${this.renderStudioToolbar()}
          <div class="canvas-stage sheet">
            ${this.renderStudioSheet()}
            ${this.error ? html`<div class="banner">${this.error}</div>` : nothing}
          </div>
          ${this.generating ? this.renderSheetProgress() : nothing}
          ${this.renderBatchBar()}
        </section>
        ${this.sidePanel ? html`<aside class="right studio-focus">${this.renderFocusPanel()}</aside>` : nothing}
      </div>
    </div>`;
  }

  /** One tab of the recipe. The sections are the same ones the old accordion had,
      drawn under titles of their own. */
  private renderSpriteTab(st: ImageGenStatus, invoke: boolean) {
    this.flatTitles = true;
    try {
      switch (this.spriteTab) {
        case "outfit":
          return html`${this.renderDressSection()}${this.renderLoadoutSection()}`;
        case "look":
          return this.renderLookSection();
        case "prompt":
          return html`${this.renderPromptExtrasSection()}${this.renderCharacterSection()}${this.renderTemplateSection(st.templates ?? [])}`;
        case "generator":
          return html`${this.renderModelSection(st.models ?? [])}
            ${this.renderLoraSection(st.loras ?? [], st.loraError)}
            ${this.renderVaeSection(st.vaes ?? [])}
            ${this.renderSettingsSection(invoke, st.boards ?? [])}
            ${this.renderDetailerSection(invoke)}
            ${this.renderGeneratorPane(st, invoke)}`;
      }
    } finally {
      this.flatTitles = false;
    }
  }

  /** While a square draws: the picture forming, small, over the top of the sheet. */
  private renderSheetProgress() {
    const p = this.progress;
    const percent = p ? Math.max(0, Math.min(1, p.percent)) : 0;
    const { slot } = this.outfitSlot();
    return html`<div class="sheet-progress">
      ${p?.image ? html`<img src=${p.image} alt="" />` : html`<md-circular-progress indeterminate style="--md-circular-progress-size:22px;"></md-circular-progress>`}
      <span class="sp-text"><b>${slot.tierLabel === "Misc" ? slot.emotionLabel : `${slot.tierLabel} · ${slot.emotionLabel}`}</b>
        ${p?.cancelled ? "Stopping…" : p?.total ? `Step ${p.step} of ${p.total}` : "Starting…"}
        <span class="sp-bar"><span style=${`width:${Math.round(percent * 100)}%`}></span></span></span>
      <button class="icon-btn" title="Stop this square" aria-label="Stop" ?disabled=${p?.cancelled} @click=${() => void this.cancelGeneration()}>
        <span class="material-symbols-rounded">close</span></button>
    </div>`;
  }

  /** Every square of the open block, with the state each is in. */
  private sheetStates(): SquareState[] {
    const slots = this.sheetTab === "misc"
      ? OUTFIT_ACTIVITIES.map((item) => this.outfitSlot(0, 0, item.id).slot)
      : OUTFIT_TIERS.flatMap((_, tier) => OUTFIT_FACES.map((__, face) => this.outfitSlot(tier, face, "").slot));
    return slots.map((slot) => this.squareStatus(this.shotAt(slot)).tone as SquareState);
  }

  /**
   * The strip above the sheet: which wardrobe the squares go into, which block is
   * open, what is being looked for, and how big the squares are drawn.
   */
  private renderStudioToolbar() {
    const shots = this.currentOutfitShots();
    const expressions = shots.filter((shot) => (shot.outfitSlot?.index ?? 0) < EXPRESSION_SQUARES).length;
    const misc = shots.length - expressions;
    const counts = filterCounts(this.sheetStates());
    return html`<div class="canvas-toolbar studio-toolbar">
      <label class="wardrobe-pick" title="Every square is saved into this wardrobe as it is generated">
        <span class="material-symbols-rounded" style="font-size:16px;">inventory_2</span>
        <select ?disabled=${this.outfitBatchRunning}
          @change=${(e: Event) => {
            this.outfitWardrobeId = (e.target as HTMLSelectElement).value;
            this.persistDraft();
            void this.loadWipBoard(this.outfitWardrobeId);
          }}>
          <!-- Selected per option rather than .value on the select: the list arrives
               after the first render, and a value that has not changed is not re-applied. -->
          <option value="" ?selected=${!this.outfitWardrobeId}>New wardrobe on first square</option>
          ${this.wardrobes.map((o) => html`<option value=${o.id} ?selected=${o.id === this.outfitWardrobeId}>${o.name}</option>`)}
        </select>
      </label>
      <button class="toolbar-clear" title="Start a new wardrobe" ?disabled=${this.outfitBatchRunning} @click=${() => void this.createWardrobe()}>
        <span class="material-symbols-rounded" style="font-size:15px;">add</span>
      </button>
      <div class="sheet-tabs" role="tablist">
        <button class="sheet-tab ${this.sheetTab === "faces" ? "on" : ""}" role="tab" @click=${() => (this.sheetTab = "faces")}>
          Expressions <span class="sheet-tab-count">${expressions}/${EXPRESSION_SQUARES}</span>
        </button>
        <button class="sheet-tab ${this.sheetTab === "misc" ? "on" : ""}" role="tab" @click=${() => (this.sheetTab = "misc")}>
          Misc <span class="sheet-tab-count">${misc}/${MISC_SQUARES}</span>
        </button>
      </div>
      <div class="board-filters" role="group" aria-label="Show">
        ${BOARD_FILTERS.map((f) => html`<button class="bf ${this.boardFilter === f.id ? "on" : ""} bf-${f.id}"
          aria-pressed=${this.boardFilter === f.id ? "true" : "false"} ?disabled=${f.id !== "all" && !counts[f.id]}
          @click=${() => (this.boardFilter = this.boardFilter === f.id ? "all" : f.id)}>
          ${f.id === "all" ? nothing : html`<span class="bf-dot"></span>`}${f.label}${f.id === "all" ? nothing : html`<b>${counts[f.id]}</b>`}
        </button>`)}
      </div>
      <span class="toolbar-spacer"></span>
      <div class="zoom-tabs" title="Square size">
        ${SHEET_ZOOMS.map((_, index) => html`<button class="zoom-tab ${this.sheetZoom === index ? "on" : ""}"
          title=${["Fit the row to the screen", "Medium squares", "Large squares"][index]}
          @click=${() => { this.sheetZoom = index; this.persistDraft(); }}>${["Fit", "M", "L"][index]}</button>`)}
      </div>
    </div>`;
  }

  /** The sheet: the expression matrix, or the MISC grid. */
  private renderStudioSheet() {
    if (!this.outfitOn) {
      return html`<div class="canvas-empty">
        <span class="material-symbols-rounded">checkroom</span>
        <strong>Outfit terms are switched off</strong>
        <span>Turn them back on under Outfit to build a wardrobe.</span>
      </div>`;
    }
    const cell = SHEET_ZOOMS[this.sheetZoom];
    const style = cell ? `--cell:${cell}px` : "";
    return this.sheetTab === "misc" ? this.renderMiscGrid(style) : this.renderFaceMatrix(style, !cell);
  }

  /**
   * The sixty expression squares as the matrix they are: one row per heat tier, one
   * column per expression. A gap in a set is exactly what you need to see, and a
   * matrix shows it in a way a wrapped list of tiles never did.
   */
  private renderFaceMatrix(style: string, fit: boolean) {
    const selected = slotKeyOf(this.outfitSlot().slot);
    return html`<div class="face-matrix ${fit ? "fit" : ""}" style=${style}>
      <div class="matrix-corner"></div>
      ${OUTFIT_FACES.map((face, i) => html`<div class="matrix-col-head ${i === this.outfitFace && !this.outfitMisc ? "on" : ""}" title=${face.face}>${face.label}</div>`)}
      ${OUTFIT_TIERS.map((tier, tierIndex) => {
        const row = OUTFIT_FACES.map((_, faceIndex) => this.outfitSlot(tierIndex, faceIndex, "").slot);
        const made = row.filter((slot) => this.shotAt(slot)).length;
        return html`
          <div class="matrix-row-head ${tierIndex === this.outfitTier && !this.outfitMisc ? "on" : ""}">
            <span class="row-heat">${[0, 1, 2, 3, 4].map((h) => html`<i class=${h <= tierIndex ? "lit" : ""}></i>`)}</span>
            <span class="matrix-row-name">${tier.label}</span>
            <span class="matrix-row-count">${made}/${row.length}</span>
            <span class="row-bar"><span style=${`width:${(made / row.length) * 100}%`}></span></span>
          </div>
          ${row.map((slot) => this.renderSheetCell(slot, slotKeyOf(slot) === selected))}
        `;
      })}
    </div>`;
  }

  /** The MISC block: what she is doing, one square each, the idle states first. */
  private renderMiscGrid(style: string) {
    const selected = slotKeyOf(this.outfitSlot().slot);
    const group = (title: string, note: string, items: typeof OUTFIT_ACTIVITIES) => html`
      <section class="sheet-tier misc">
        <header class="sheet-tier-head">
          <span class="material-symbols-rounded" style="font-size:15px;">interests</span>
          ${title}
          <span class="tier-count">${items.filter((item) => this.shotAt(this.outfitSlot(0, 0, item.id).slot)).length}/${items.length} generated</span>
        </header>
        <p class="sheet-note">${note}</p>
        <div class="sheet-grid" style=${style}>
          ${items.map((item) => {
            const slot = this.outfitSlot(0, 0, item.id).slot;
            return this.renderSheetCell(slot, slotKeyOf(slot) === selected);
          })}
        </div>
      </section>`;
    return html`<div class="outfit-sheet" style=${style}>
      ${group("Around the place", "One picture per state, whatever the heat — a state with no square falls back to her expression. Typing is shown while she writes to you.",
        OUTFIT_ACTIVITIES.filter((item) => !item.intimate))}
      ${group("With them", "Drawn at their own heat. She can only put herself into these once a conversation has got there.",
        OUTFIT_ACTIVITIES.filter((item) => item.intimate))}
    </div>`;
  }

  /**
   * One square on the sheet. Clicking it selects it — the panel on the right is where
   * things are done to it — so the cell itself carries only the picture and its state:
   * empty, generated, reviewed, or on an older recipe. A square the filter is not
   * looking for is dimmed, not hidden, so the matrix keeps its shape.
   */
  private renderSheetCell(slot: DraftOutfitSlot, current: boolean) {
    const shot = this.shotAt(slot);
    const state = this.squareStatus(shot).tone as SquareState;
    const label = slot.tier === 0 && slot.tierLabel === "Misc" ? slot.emotionLabel : `${slot.tierLabel} · ${slot.emotionLabel}`;
    const dim = !matchesFilter(this.boardFilter, state);
    return html`<button
      class="sheet-cell ${current ? "current" : ""} ${shot ? "" : "empty"} ${dim ? "dim" : ""} st-${state}"
      title=${shot ? `${label}${state === "stale" ? " — older recipe" : state === "ready" ? " — reviewed" : " — needs a cutout review"}` : `${label} — not generated yet`}
      @click=${() => this.selectOutfitSlot(slot.index)}
      @dblclick=${() => { this.selectOutfitSlot(slot.index); void this.generateOutfitAndNext(); }}
    >
      ${shot
        ? html`<img class="art" src=${this.previewURL(shot)} alt=${label} loading="lazy" />`
        : html`<span class="art-empty"><span class="material-symbols-rounded">add</span></span>`}
      <span class="cell-foot">
        <span class="cell-name">${slot.emotionLabel}</span>
        ${shot ? html`<span class="cell-state ${state}"></span>` : nothing}
      </span>
    </button>`;
  }

  /** What state one square is in, in words, for the focus panel. */
  private squareStatus(shot: Shot | undefined): { label: string; tone: string } {
    if (!shot) return { label: "Not generated yet", tone: "none" };
    if (!this.shotMatchesCurrentOutfit(shot)) return { label: "Generated with an older recipe", tone: "stale" };
    if (shot.cutoutReviewed) return { label: "Reviewed and filed — she can wear it", tone: "ready" };
    return { label: "Generated — the cutout needs a look", tone: "needs" };
  }

  /** The arrow keys on the board: through the matrix, or along the MISC states. */
  private moveOnBoard(key: BoardKey) {
    this.stopFlip();
    if (this.sheetTab === "misc") {
      const at = OUTFIT_ACTIVITIES.findIndex((item) => item.id === this.outfitMisc);
      const step = key === "ArrowLeft" || key === "ArrowUp" ? -1 : 1;
      const next = at < 0 ? 0 : Math.min(OUTFIT_ACTIVITIES.length - 1, Math.max(0, at + step));
      this.selectOutfitSlot(squareIndex(0, 0, OUTFIT_ACTIVITIES[next].id));
    } else {
      const next = this.outfitMisc
        ? { face: this.outfitFace, tier: this.outfitTier }
        : moveOnMatrix(this.outfitFace, this.outfitTier, key, OUTFIT_FACES.length, OUTFIT_TIERS.length);
      this.selectOutfitSlot(squareIndex(next.tier, next.face, ""));
    }
    void this.updateComplete.then(() =>
      this.renderRoot.querySelector(".sheet-cell.current")?.scrollIntoView({ block: "nearest", inline: "nearest" }));
  }

  // ── the flip-through ────────────────────────────────────────────────────────
  //
  // Twelve expressions of one girl should read as one girl. Playing the tier's squares
  // one after another, in place, shows a face that drifts — a different jaw, a hair
  // colour a shade off — far faster than comparing thumbnails side by side does.

  private toggleFlip() {
    if (this.flipping) {
      this.stopFlip();
      return;
    }
    this.flipping = true;
    this.flipFace = this.outfitFace;
    this.flipTimer = window.setInterval(() => {
      const filled = OUTFIT_FACES.map((_, i) => !!this.shotAt(this.outfitSlot(this.outfitTier, i, "").slot));
      const next = nextFilled(filled, this.flipFace);
      if (next < 0) this.stopFlip();
      else this.flipFace = next;
    }, 450);
  }

  private stopFlip() {
    window.clearInterval(this.flipTimer);
    this.flipTimer = 0;
    this.flipping = false;
    this.flipFace = -1;
  }

  /**
   * The selected square, large, with everything that can be done to it.
   *
   * The picture can be shown as it will be seen — beside her speech box, saying a line
   * in that mood — because an expression is right or wrong next to its words, not on a
   * checkerboard. Under it, the same expression up the heat tiers, the one comparison
   * a set most often needs. Generating sits first; the square's other tools are a row
   * of icons rather than six full-width buttons.
   */
  private renderFocusPanel() {
    const { slot } = this.outfitSlot();
    const shot = this.shotAt(slot);
    const status = this.squareStatus(shot);
    const isMisc = slot.tierLabel === "Misc";
    const activity = isMisc ? OUTFIT_ACTIVITIES.find((item) => item.id === slot.emotion) : undefined;
    const face = isMisc ? undefined : OUTFIT_FACES[this.outfitFace];
    const { prompt, negative } = this.assemblePrompts();
    const busy = this.generating;
    const canGenerate = !busy && this.outfitOn && !!prompt.trim();
    const flipSlot = this.flipping && this.flipFace >= 0 ? this.outfitSlot(this.outfitTier, this.flipFace, "").slot : undefined;
    const shown = flipSlot ? this.shotAt(flipSlot) : shot;
    const shownSlot = flipSlot ?? slot;
    return html`
      <div class="focus-head">
        <div class="focus-title">
          <strong>${isMisc ? slot.emotionLabel : `${slot.tierLabel} · ${slot.emotionLabel}`}</strong>
          <span class="focus-status ${status.tone}"><i></i>${status.label}</span>
        </div>
        <div class="seg small" role="group" aria-label="Show the square">
          <button class=${this.focusView === "cutout" ? "on" : ""} aria-pressed=${this.focusView === "cutout" ? "true" : "false"}
            title="The cutout, on a checkerboard" @click=${() => (this.focusView = "cutout")}>Cutout</button>
          <button class=${this.focusView === "scene" ? "on" : ""} aria-pressed=${this.focusView === "scene" ? "true" : "false"}
            title="As she appears in chat, saying something in that mood" @click=${() => (this.focusView = "scene")}>In chat</button>
        </div>
      </div>
      <div class="panel-scroll focus-scroll">
        <div class="focus-art ${this.focusView}">
          ${shown
            ? html`<img src=${this.previewURL(shown)} alt=${shownSlot.emotionLabel} style="cursor:zoom-in" title="Expand"
                @click=${() => (this.expandedShot = shown)} @contextmenu=${(e: MouseEvent) => this.openShotMenu(shown, e)} />`
            : html`<span class="focus-empty"><span class="material-symbols-rounded">add_photo_alternate</span>Nothing here yet</span>`}
          ${this.focusView === "scene" ? html`<div class="scene-speech">${sampleLine(shownSlot.emotion, shownSlot.emotionLabel)}</div>` : nothing}
          ${!isMisc ? html`<button class="flip-btn ${this.flipping ? "on" : ""}" title="Play this tier's expressions one after another, to check they are one face"
            @click=${() => this.toggleFlip()}>
            <span class="material-symbols-rounded">${this.flipping ? "stop" : "play_arrow"}</span>${this.flipping ? shownSlot.emotionLabel : "Flip through"}
          </button>` : nothing}
        </div>
        ${!isMisc ? this.renderHeatLadder() : nothing}
        <div class="focus-primary">
          <button class="btn primary" ?disabled=${!canGenerate} title="Enter" @click=${() => void this.generateOutfitAndNext()}>
            <span class="material-symbols-rounded" style="font-size:17px;">${shot ? "refresh" : "auto_awesome"}</span>
            ${shot ? "Redo, then next" : "Generate, then next"}
          </button>
          <button class="btn" ?disabled=${!canGenerate} title=${shot ? "Redo this square and stay on it" : "Generate this square and stay on it"}
            @click=${() => void this.generate()}>
            <span class="material-symbols-rounded" style="font-size:17px;">${shot ? "replay" : "add"}</span>
            ${shot ? "Redo" : "Just this"}
          </button>
        </div>
        <div class="focus-tools">
          <button class="tool" ?disabled=${!shot || busy} title=${shot?.cutoutReviewed ? "Adjust the cutout (R)" : "Review the cutout (R)"}
            @click=${() => { if (shot) void this.openCutout(this.previewURL(shot), `seed-${shot.seed}`, shot.outfitFilename, shot.id); }}>
            <span class="material-symbols-rounded">background_replace</span><span>${shot?.cutoutReviewed ? "Adjust" : "Review"}</span>
          </button>
          <label class="tool ${busy ? "disabled" : ""}" title=${shot ? "Replace with a picture of your own" : "Use a picture of your own for this square"}>
            <span class="material-symbols-rounded">upload</span><span>Own image</span>
            <input type="file" accept="image/*" style="display:none;" ?disabled=${busy}
              @change=${(e: Event) => { const input = e.target as HTMLInputElement; void this.uploadSquare(input.files?.[0]); input.value = ""; }} />
          </label>
          <button class="tool" ?disabled=${!shot || busy} title="Just this square, as a PNG under its wardrobe filename"
            @click=${() => { if (shot) void this.exportOutfitSquare(shot); }}>
            <span class="material-symbols-rounded">download</span><span>Export</span>
          </button>
          <button class="tool" ?disabled=${!shot?.info} title="Copy this square's generation data"
            @click=${() => { if (shot) void this.copyGenInfo(shot, "text"); }}>
            <span class="material-symbols-rounded">content_copy</span><span>Data</span>
          </button>
          ${this.outfitLoadoutId ? html`<button class="tool" ?disabled=${!shot || this.loadoutBusy} title="Use this square as the loadout's cover"
            @click=${() => void this.setLoadoutCoverFromSelection()}>
            <span class="material-symbols-rounded">photo_camera</span><span>Cover</span>
          </button>` : nothing}
          <button class="tool danger" ?disabled=${!shot || busy} title="Delete this square"
            @click=${() => { if (shot) void this.deleteOutfitSquare(shot); }}>
            <span class="material-symbols-rounded">delete</span><span>Delete</span>
          </button>
        </div>
        <div class="sec-note focus-desc">${activity ? `${activity.face}; ${activity.pose}.` : face ? `${face.face}; ${face.pose}.` : nothing}</div>
        ${shot ? html`<div class="focus-meta">
          <span title="Seed"><span class="material-symbols-rounded" style="font-size:14px;">casino</span>${shot.seed}</span>
          ${shot.info?.model ? html`<span title="Model"><span class="material-symbols-rounded" style="font-size:14px;">deployed_code</span>${shot.info.model}</span>` : nothing}
        </div>` : nothing}
        <button class="adv-toggle" @click=${() => (this.showSquarePrompt = !this.showSquarePrompt)}>
          <span class="material-symbols-rounded" style="font-size:17px;">${this.showSquarePrompt ? "expand_less" : "code"}</span>
          ${this.showSquarePrompt ? "Hide the prompt" : "The prompt this square gets"}
        </button>
        ${this.showSquarePrompt ? html`<div class="focus-prompt">
          <span class="focus-tag">Positive</span>
          <pre>${prompt}</pre>
          <span class="focus-tag negative">Negative</span>
          <pre>${negative}</pre>
          <div class="sec-note">Exposure is rolled fresh for every generation, so the undress clauses change between takes.</div>
        </div>` : nothing}
      </div>
    `;
  }

  /** The selected expression at every heat, Calm to Peak: how it climbs. */
  private renderHeatLadder() {
    return html`<div class="heat-ladder" role="group" aria-label="This expression up the heat tiers">
      ${OUTFIT_TIERS.map((tier, t) => {
        const slot = this.outfitSlot(t, this.outfitFace, "").slot;
        const shot = this.shotAt(slot);
        const on = t === this.outfitTier;
        return html`<button class="rung ${on ? "on" : ""}" title=${`${tier.label} · ${slot.emotionLabel}`}
          @click=${() => { this.stopFlip(); this.selectOutfitSlot(squareIndex(t, this.outfitFace, "")); }}>
          ${shot ? html`<img src=${this.previewURL(shot)} alt="" loading="lazy" />` : html`<span class="rung-empty"></span>`}
          <span class="rung-label">${tier.label}</span>
        </button>`;
      })}
    </div>`;
  }

  /** The bar under the sheet: the whole set's progress, and the batch controls. */
  private renderBatchBar() {
    const shots = this.currentOutfitShots();
    const expressions = shots.filter((shot) => (shot.outfitSlot?.index ?? 0) < EXPRESSION_SQUARES).length;
    const misc = shots.length - expressions;
    const reviewed = shots.filter((shot) => shot.cutoutReviewed).length;
    const stale = this.staleShots().length;
    const total = EXPRESSION_SQUARES + (this.outfitMiscBatch ? MISC_SQUARES : 0);
    const have = expressions + (this.outfitMiscBatch ? misc : 0);
    const missing = Math.max(0, total - have);
    const canRun = !this.generating && this.outfitOn && !!this.assemblePrompts().prompt.trim();
    const c = 2 * Math.PI * 17;
    const made = total ? Math.min(1, have / total) : 0;
    const done = total ? Math.min(1, reviewed / total) : 0;
    return html`<div class="batch-bar">
      <div class="batch-ring" title=${`${have} of ${total} made, ${reviewed} reviewed`}>
        <svg viewBox="0 0 40 40"><circle class="r-track" cx="20" cy="20" r="17" />
          <circle class="r-made" cx="20" cy="20" r="17" stroke-dasharray=${c} stroke-dashoffset=${c * (1 - made)} />
          <circle class="r-done" cx="20" cy="20" r="17" stroke-dasharray=${c} stroke-dashoffset=${c * (1 - done)} /></svg>
        <b>${Math.round(made * 100)}<small>%</small></b>
      </div>
      <div class="batch-progress">
        <span class="batch-head">${have === total && total ? "The set is complete" : `${missing} square${missing === 1 ? "" : "s"} to go`}</span>
        <span class="batch-count">${expressions}/${EXPRESSION_SQUARES} expressions · ${misc}/${MISC_SQUARES} misc · ${reviewed} reviewed${stale ? html` · <em>${stale} on an older recipe</em>` : nothing}</span>
      </div>
      <label class="switch compact" title="Whether Generate missing also renders the Misc states">
        <input type="checkbox" .checked=${this.outfitMiscBatch} ?disabled=${this.outfitBatchRunning}
          @change=${(e: Event) => { this.outfitMiscBatch = (e.target as HTMLInputElement).checked; this.persistDraft(); }} />
        Include Misc
      </label>
      ${this.outfitBatchRunning
        ? html`<button class="btn" @click=${() => this.cancelOutfitBatch()}>
            <span class="material-symbols-rounded" style="font-size:17px;">stop_circle</span>
            Stop after this one
          </button>`
        : html`<button class="btn primary" ?disabled=${!canRun || !missing} @click=${() => void this.generateAllOutfit()}>
            <span class="material-symbols-rounded" style="font-size:17px;">auto_awesome</span>
            Generate ${missing} missing
          </button>
          ${stale ? html`<button class="btn" ?disabled=${!canRun} @click=${() => void this.regenerateStale()}>
            <span class="material-symbols-rounded" style="font-size:17px;">history</span>
            Redo ${stale} stale
          </button>` : nothing}`}
      <button class="btn" ?disabled=${this.generating || this.outfitExporting || !shots.length || reviewed !== shots.length}
        title=${reviewed !== shots.length ? "Review every cutout first" : "Every square, correctly named, in one ZIP"}
        @click=${() => void this.exportOutfitZip()}>
        <span class="material-symbols-rounded" style="font-size:17px;">folder_zip</span>
        ${this.outfitExporting ? "Building ZIP…" : "Export ZIP"}
      </button>
      ${this.outfitProgress ? html`<span class="batch-note">${this.outfitProgress}</span>` : nothing}
    </div>`;
  }

  /**
   * Drops a picture of the user's own into the selected square.
   *
   * It goes through the same door a generated square does — stored as work in
   * progress, then reviewed — so a hand-drawn sprite and a generated one are the same
   * thing to the board, and the cutout editor opens on it straight away because that
   * is what "use my own image" nearly always needs next.
   */
  private async uploadSquare(file: File | undefined) {
    if (!file || !file.type.startsWith("image/") || this.generating) return;
    const { slot, filename } = this.outfitSlot();
    try {
      const dataURL = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("couldn't read that file"));
        reader.readAsDataURL(file);
      });
      const wardrobeId = await this.ensureWardrobe();
      await api.putLibbyOutfitWip(wardrobeId, slot.emotion, slot.tier, {
        imageData: dataURL, filename, seed: -1, reviewed: false, config: this.outfitConfigKey(),
      });
      const previous = this.shotAt(slot);
      if (previous && !previous.id.startsWith("wip-")) await api.deleteGenPreview(previous.id).catch(() => undefined);
      const key = slotKeyOf(slot);
      const shot: Shot = {
        id: `wip-${wardrobeId}-${slot.emotion}-${slot.tier}`, seed: -1, saved: false,
        outfitFilename: filename, outfitSlot: slot, outfitConfig: this.outfitConfigKey(),
        cutoutReviewed: false, previewVersion: Date.now(), wipOutfitId: wardrobeId,
      };
      this.shots = [...this.shots.filter((s) => !s.outfitSlot || slotKeyOf(s.outfitSlot) !== key), shot];
      this.persistDraft();
      void this.openCutout(this.previewURL(shot), file.name, filename, shot.id);
    } catch (e) {
      this.showToast(`Couldn't use that image: ${(e as Error).message}`);
    }
  }

  /**
   * Opens a finished sprite from the wardrobe screen in the editor.
   *
   * A sprite already filed into an outfit is not necessarily on the board — it may
   * have been dropped in by hand months ago — so it is pulled back through the
   * work-in-progress store first, which makes it a square like any other: reviewable,
   * redoable, replaceable. Then the board switches to it.
   */
  private async editWardrobeSlot(outfitId: string, slotName: string, level: number) {
    const face = OUTFIT_FACES.findIndex((f) => f.id === slotName);
    const misc = OUTFIT_ACTIVITIES.some((item) => item.id === slotName) ? slotName : "";
    if (face < 0 && !misc) return;
    if (this.outfitWardrobeId !== outfitId) {
      this.outfitWardrobeId = outfitId;
      this.persistDraft();
      await this.loadWipBoard(outfitId);
    }
    this.outfitOn = true;
    const { slot, filename } = this.outfitSlot(misc ? 0 : level, Math.max(0, face), misc);
    this.selectOutfitSlot(slot.index);
    this.studioView = "build";
    let shot = this.shotAt(slot);
    if (!shot) {
      try {
        const response = await fetch(api.libbyEmotionURL(outfitId, slotName, level, Date.now()), { credentials: "same-origin" });
        if (!response.ok) throw new Error(`the sprite returned ${response.status}`);
        const dataURL = await blobToDataURL(await response.blob());
        await api.putLibbyOutfitWip(outfitId, slot.emotion, slot.tier, {
          imageData: dataURL, filename, seed: -1, reviewed: true, config: this.outfitConfigKey(),
        });
        shot = {
          id: `wip-${outfitId}-${slot.emotion}-${slot.tier}`, seed: -1, saved: false,
          outfitFilename: filename, outfitSlot: slot, outfitConfig: this.outfitConfigKey(),
          cutoutReviewed: true, previewVersion: Date.now(), wipOutfitId: outfitId,
        };
        this.shots = [...this.shots, shot];
        this.persistDraft();
      } catch (e) {
        this.showToast(`Couldn't open that sprite: ${(e as Error).message}`);
        return;
      }
    }
    void this.openCutout(this.previewURL(shot), slotName, shot.outfitFilename, shot.id);
  }

  /** The clothes: the theme line and the equipment board, each piece with a switch. */
  private renderDressSection() {
    const worn = OUTFIT_GEAR_SLOTS.filter(({ key }) => gearWorn(this.outfitGear[key])).length;
    const body = html`
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
        <label class="field">Theme</label>
        <input class="num" type="text" .value=${this.outfitText} ?disabled=${this.outfitBatchRunning}
          placeholder="Midnight rogue, beach date, office uniform…"
          @input=${(e: Event) => (this.outfitText = (e.target as HTMLInputElement).value)} />
      </div>
      <div class="loadout-board">
        <div class="loadout-heading">
          <span>Equipment</span>
          <span class="equipped-count">${worn}/${OUTFIT_GEAR_SLOTS.length} worn</span>
          <button class="loadout-clear" ?disabled=${this.outfitBatchRunning || !worn}
            @click=${() => this.clearOutfitLoadout()}>Unequip all</button>
        </div>
        <div class="sec-note">Switch a piece off to keep it in the recipe without wearing it.</div>
        <div class="loadout-slots">
          ${OUTFIT_GEAR_SLOTS.map((slot) => this.renderGearSlot(slot.key))}
        </div>
      </div>
    `;
    return this.section("outfit", "Clothes", `${worn} worn`, body);
  }

  /** How the squares are shot: backdrop, underwear default, colour lock, body hair,
   * framing. Everything that is not a garment and not the generator. */
  private renderLookSection() {
    const body = html`
      <div>
        <label class="field">Solid generation background</label>
        <div class="chips">
          ${(["white", "black"] as const).map((background) => html`<button
            class="chip ${this.outfitBackground === background ? "on" : ""}"
            ?disabled=${this.outfitBatchRunning}
            @click=${() => (this.outfitBackground = background)}>
            ${background === "white" ? "White" : "Black"}
          </button>`)}
        </div>
        <div class="sec-note">Pick whichever contrasts most with her hair and clothes — it is what the cutout removes.</div>
      </div>
      <div>
        <label class="field">Default underwear colour</label>
        <input class="num" type="text" .value=${this.outfitUnderwearColor}
          ?disabled=${this.outfitBatchRunning} placeholder="black, red, pale pink…"
          @input=${(e: Event) => (this.outfitUnderwearColor = (e.target as HTMLInputElement).value)} />
        <div class="sec-note">Used for the bra and panties when those slots have no colour of their own.</div>
      </div>
      <label class="switch">
        <input type="checkbox" .checked=${this.outfitLockColors} ?disabled=${this.outfitBatchRunning}
          @change=${(e: Event) => (this.outfitLockColors = (e.target as HTMLInputElement).checked)} />
        Lock equipped colours
      </label>
      <div class="sec-note">Weights each colour and names every colour the garment is <em>not</em> in the negative. Leave on unless a piece is meant to be multicoloured.</div>
      <label class="switch">
        <input type="checkbox" .checked=${this.outfitPubicHair} ?disabled=${this.outfitBatchRunning}
          @change=${(e: Event) => (this.outfitPubicHair = (e.target as HTMLInputElement).checked)} />
        Pubic hair at Peak
      </label>
      ${this.outfitPubicHair ? html`<div>
        <label class="field">Pubic hair colour</label>
        <input class="num" type="text" .value=${this.outfitPubicHairColor}
          ?disabled=${this.outfitBatchRunning} placeholder="dark brown, blonde…"
          @input=${(e: Event) => (this.outfitPubicHairColor = (e.target as HTMLInputElement).value)} />
      </div>` : nothing}
      ${this.renderCameraControls()}
      <div>
        <label class="field">Exposure by tier</label>
        <div class="sec-note">${OUTFIT_TIERS.map((tier, index) => html`<div><strong>${tier.label}:</strong> ${OUTFIT_EXPOSURE_TIERS[index].description}</div>`)}</div>
      </div>
    `;
    return this.section("look", "Look & framing", this.outfitBackground, body);
  }

  /** The free-text prompt and negative, which the outfit fragment is added to. On
   * the Create screen these are the dock; here they are extras, because the recipe
   * writes most of the prompt. */
  private renderPromptExtrasSection() {
    const body = html`
      <div class="sec-note">Added to every square alongside the recipe: quality tags, a style, the character's name.</div>
      <div>
        <label class="field">Extra positive</label>
        <textarea class="num extras" rows="3" .value=${this.prompt} placeholder="masterpiece, best quality, …"
          @input=${(e: Event) => (this.prompt = (e.target as HTMLTextAreaElement).value)}></textarea>
      </div>
      <div>
        <label class="field">Extra negative</label>
        <textarea class="num extras" rows="2" .value=${this.negative} placeholder="lowres, bad anatomy, …"
          @input=${(e: Event) => (this.negative = (e.target as HTMLTextAreaElement).value)}></textarea>
      </div>
    `;
    return this.section("extras", "Prompt extras", this.prompt.trim() || this.negative.trim() ? "set" : "none", body);
  }

  // Closing the Civitai browser refreshes the model list: an install may have
  // finished while it was open, and a new checkpoint should appear right away.
  private onCivitaiClose() {
    this.civitaiOpen = false;
    void this.loadStatus();
  }

  /**
   * A prompt picked off a Civitai showcase picture. Only what the poster kept is
   * written: a picture with no sampler leaves the form's sampler alone, and the
   * model is never switched — theirs is on their box, and the studio's checkpoint
   * is the one being tried. The template, characters and triggers are cleared as
   * they are for any reused prompt, since the text is already the finished prompt.
   */
  private onCivitaiPrompt(p: PromptSettings) {
    this.prompt = p.prompt;
    this.negative = p.negativePrompt ?? "";
    if (p.sampler) this.scheduler = p.sampler;
    if (p.steps) this.steps = p.steps;
    if (p.cfgScale) this.cfg = p.cfgScale;
    if (p.seed) this.seed = p.seed;
    if (p.width && p.height) {
      this.width = p.width;
      this.height = p.height;
    }
    this.templateId = "";
    this.selectedTriggers = [];
    this.onCivitaiClose();
  }

  /** One part of the recipe, as a pane. The panes were an accordion once, read top to
      bottom in a 300px sidebar; the inspector's tabs do that job now. */
  private section(id: string, label: string, count: string, body: unknown) {
    if (this.flatTitles) {
      return html`<div class="pane-title">${label}<span class="pane-count">${count}</span></div><div class="pane sec-${id}">${body}</div>`;
    }
    return html`<div class="pane sec-${id}">${body}</div>`;
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
    const filter = this.pickerFilter.trim().toLowerCase();
    const shown = filter
      ? models.filter((m) => `${m.model_name} ${m.title} ${m.base ?? ""}`.toLowerCase().includes(filter))
      : models;
    const body = html`
      ${filter && !shown.length ? html`<div class="sec-note">No model matches “${this.pickerFilter}”.</div>` : nothing}
      <div class="cards">
        ${shown.map((m) => {
          const on = m.title === this.checkpoint;
          const thumb = `${api.modelThumbURL(m.title)}&v=${this.thumbVersion}`;
          return html`
            <div class="card-wrap">
              <button class="card ${on ? "on" : ""}" title=${m.title} @click=${() => this.pickModel(m)}>
                ${this.renderArt(thumb, m.model_name, "texture")}
                <div class="card-name">${m.model_name}${m.base ? html`<span class="row-sub">${m.base}</span>` : nothing}</div>
              </button>
              ${this.status?.manageModels ? html`<button class="card-edit left" title="Edit model settings" @click=${() => this.openMetaEditor(m.title)}>
                <span class="material-symbols-rounded" style="font-size:15px;">edit</span>
              </button>` : nothing}
            </div>
          `;
        })}
      </div>
    `;
    return this.section("models", "Models", String(models.length), body);
  }

  private renderLoraSection(loras: GenLora[], loraError?: string) {
    const model = (this.status?.models ?? []).find((m) => m.title === this.checkpoint);
    const body = html`<oppai-lora-picker .loras=${loras} .selected=${this.selectedLoras} .modelBase=${model?.base ?? ""}
      .thumbVersion=${this.thumbVersion} ?canEdit=${!!this.status?.manageModels} ?civitai=${!!this.status?.civitai}
      ?canRename=${!!this.status?.canRename}
      .people=${this.regionsActive ? this.regionPeople.map((p) => p.lora) : []}
      .error=${loraError ?? ""}
      @lora-drag=${(e: CustomEvent<{ name: string }>) => { this.loraDrag = e.detail.name; this.loraOver = null; }}
      @lora-person=${(e: CustomEvent<{ name: string; person: number }>) => this.wearLora(e.detail.name, e.detail.person)}
      @lora-rename=${(e: CustomEvent<{ names: string[] }>) => (this.renamingLoras = e.detail.names)}
      @lora-toggle=${(e: CustomEvent<{ name: string }>) => this.toggleLora(e.detail.name)}
      @lora-weight=${(e: CustomEvent<{ name: string; weight: number }>) =>
        (this.selectedLoras = { ...this.selectedLoras, [e.detail.name]: e.detail.weight })}
      @lora-edit=${(e: CustomEvent<{ name: string }>) => this.openMetaEditor(e.detail.name)}
      @lora-file=${(e: CustomEvent<{ names: string[]; category: LoraCategoryKey | "" }>) =>
        void this.setLoraCategory(e.detail.names, e.detail.category)}
      @loras-sorted=${(e: CustomEvent<{ results: LoraCivitaiResult[] }>) => this.applyCivitaiSort(e.detail.results)}
    ></oppai-lora-picker>`;
    return this.section("loras", "LoRAs", String(Object.keys(this.selectedLoras).length || loras.length), body);
  }

  /** Files LoRAs under a category ("" for none), on screen at once and then for real;
      a refusal puts them back. */
  private async setLoraCategory(names: string[], category: LoraCategoryKey | "") {
    const before = this.status;
    if (!before || !names.length) return;
    this.status = { ...before, loras: moveToCategory(before.loras ?? [], names, category) };
    try {
      await api.loraCategoryAssign(category, names);
      if (names.length > 1) {
        const label = LORA_CATEGORIES.find((c) => c.key === category)?.label ?? "Unsorted";
        this.showToast(`Filed ${names.length} LoRAs under ${label}`);
      }
    } catch (e) {
      this.status = before;
      this.showToast((e as Error).message);
    }
  }

  /** What a round of sorting with Civitai filed, put on the picker's LoRAs — the
      server has filed them already. */
  private applyCivitaiSort(results: LoraCivitaiResult[]) {
    let loras = this.status?.loras ?? [];
    for (const [category, names] of filedByCategory(results)) loras = moveToCategory(loras, names, category);
    if (this.status) this.status = { ...this.status, loras };
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
        ${this.canUpscale ? this.renderUpscaleSettings() : nothing}
      </div>
    `;
    return this.section("settings", "Model settings", `${this.steps} steps`, body);
  }

  /**
   * ADetailer: the passes that redo faces, hands and anything else a detector finds,
   * after a picture is drawn — views/imagegen-detailer.ts. Its own tab on the rail;
   * it was the bottom of Settings, under the sampler, where it was only found by
   * scrolling past it.
   */
  private renderDetailerSection(invoke: boolean) {
    const st = this.status;
    const body = html`<oppai-detailer-panel .value=${this.detailerValue} ?invoke=${invoke} ?available=${!!st?.detailerAvailable}
      .detectors=${st?.detectors ?? []} .loras=${st?.loras ?? []} ?civitai=${!!st?.civitai} ?canInstall=${!!st?.manageModels}
      .manageNote=${manageModelsNote(st)} ?canRename=${!!st?.canRename} ?restarting=${this.restarting}
      @restart-generator=${() => void this.restartGenerator()}
      @detailer-change=${(e: CustomEvent<Partial<DetailerValue>>) => this.onDetailerChange(e.detail)}
      @detectors-changed=${() => void this.refreshStatus()}></oppai-detailer-panel>`;
    const on = st?.detailerAvailable && this.detailerEnabled && this.detailerHasPasses;
    return this.section("detailer", "ADetailer", on ? "on" : "off", body);
  }

  private get detailerValue(): DetailerValue {
    return {
      enabled: this.detailerEnabled, faces: this.detailerFaces, faceModel: this.detailerModel, hands: this.detailerHands,
      prompt: this.detailerPrompt, negative: this.detailerNegative, confidence: this.detailerConfidence,
      denoise: this.detailerDenoise, maskBlur: this.detailerMaskBlur, custom: this.detailerCustom,
    };
  }

  private onDetailerChange(p: Partial<DetailerValue>) {
    if (p.enabled !== undefined) this.detailerEnabled = p.enabled;
    if (p.faces !== undefined) this.detailerFaces = p.faces;
    if (p.faceModel !== undefined) this.detailerModel = p.faceModel;
    if (p.hands !== undefined) this.detailerHands = p.hands;
    if (p.prompt !== undefined) this.detailerPrompt = p.prompt;
    if (p.negative !== undefined) this.detailerNegative = p.negative;
    if (p.confidence !== undefined) this.detailerConfidence = p.confidence;
    if (p.denoise !== undefined) this.detailerDenoise = p.denoise;
    if (p.maskBlur !== undefined) this.detailerMaskBlur = p.maskBlur;
    if (p.custom !== undefined) this.detailerCustom = p.custom;
  }

  /** The Look drawer's word on people: where they are set, or what to install first. */
  private renderPeopleSection() {
    if (!this.status?.regionsAvailable) {
      return html`<div class="manage-note">
        <span class="material-symbols-rounded">group</span>
        <span>To draw two or more people with a character LoRA each, without their faces blending into one, install
          the Regional Prompter extension in Automatic1111 — Extensions → Available → Regional Prompter — and restart it.
          Each person then gets a part of the picture of their own.</span>
      </div>`;
    }
    return html`<div class="sec-note">Pick how many people under the prompt, beside the picture count — each then
      gets a character, words and a LoRA of their own there.</div>`;
  }

  /** How many people the picture has, beside the picture count: one, or two to four
      each in a part of their own (Regional Prompter, on A1111). */
  private renderPeopleCount() {
    const n = this.regionsActive ? this.regionPeople.length : 1;
    return html`<div class="count-seg people-seg" role="group" aria-label="People in the picture"
      title="People in the picture — two or more each get a part of their own, with their own character and LoRA">
      <span class="material-symbols-rounded" aria-hidden="true">group</span>
      ${Array.from({ length: MAX_PEOPLE }, (_, i) => i + 1).map((k) => html`<button class=${n === k ? "on" : ""} aria-pressed=${n === k ? "true" : "false"}
        @click=${() => this.setPeopleCount(k)}>${k}</button>`)}
    </div>
    <!-- On a phone the four buttons pushed Generate off the bar: one that steps
         through them instead. -->
    <button class="people-cycle ${n > 1 ? "on" : ""}" title="People in the picture — tap for more"
      aria-label=${`${n} ${n === 1 ? "person" : "people"} in the picture`}
      @click=${() => this.setPeopleCount(n >= MAX_PEOPLE ? 1 : n + 1)}>
      <span class="material-symbols-rounded">group</span>${n}
    </button>`;
  }

  private setPeopleCount(n: number) {
    if (n < 2) {
      this.regionsOn = false;
      return;
    }
    if (!this.status?.regionsAvailable) {
      this.showToast("Two or more people need the Regional Prompter extension in Automatic1111 — Extensions → Available → Regional Prompter, then restart it");
      return;
    }
    const people = this.regionPeople.slice(0, n);
    while (people.length < n) people.push(newPerson());
    this.regionPeople = people;
    this.regionsOn = true;
  }

  /**
   * The people, under the prompt: each a part of the picture drawn from a saved
   * character, words and a LoRA of their own. It was a section at the foot of the
   * Look drawer, where it was not found; the prompt is where a picture is described,
   * so who is in it is said beside it.
   */
  private renderPeopleStrip() {
    if (!this.regionsActive) return nothing;
    const chars = this.characters;
    const loras = this.status?.loras ?? [];
    const people = this.regionPeople;
    const set = (i: number, patch: Partial<RegionPerson>) =>
      (this.regionPeople = this.regionPeople.map((p, j) => (j === i ? { ...p, ...patch } : p)));
    const boxes = regionBoxes(people);
    return html`<div class="people-strip">
      <div class="people-head">
        <div class="people-layout ${this.regionsRows ? "rows" : ""}" aria-hidden="true">
          ${boxes.map((b, i) => html`<span style="flex:${b.size}">${i + 1}</span>`)}
        </div>
        <div class="chips">
          <button class="chip small ${this.regionsRows ? "" : "on"}" aria-pressed=${this.regionsRows ? "false" : "true"}
            @click=${() => (this.regionsRows = false)}>Side by side</button>
          <button class="chip small ${this.regionsRows ? "on" : ""}" aria-pressed=${this.regionsRows ? "true" : "false"}
            @click=${() => (this.regionsRows = true)}>Stacked</button>
        </div>
        <span class="people-hint">The prompt is what they share — say how many (2girls) and where.
          ${this.regionsRows ? "" : "The face pass redoes each face with its person's words and LoRA, left to right."}</span>
      </div>
      ${this.renderPeopleAdvice()}
      <div class="people-grid" style="--people:${people.length}">
        ${people.map((p, i) => html`<div class="pass-card">
          <div class="pass-row">
            <b class="person-n">${i + 1}</b>
            <select class="num" aria-label="Character for person ${i + 1}"
              @change=${(e: Event) => set(i, { character: (e.target as HTMLSelectElement).value })}>
              <option value="" ?selected=${!p.character}>No saved character</option>
              ${chars.map((c) => html`<option value=${c.id} ?selected=${c.id === p.character}>${c.name}</option>`)}
            </select>
            <button class="pass-remove" title="Remove person ${i + 1}" aria-label="Remove person ${i + 1}"
              @click=${() => {
                const rest = this.regionPeople.filter((_, j) => j !== i);
                if (rest.length < 2) this.regionsOn = false;
                else this.regionPeople = rest;
              }}>
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <textarea class="num person-words" rows="2" .value=${p.words} placeholder="Their words: hair, clothes, what they're doing"
            aria-label="Words for person ${i + 1}"
            @input=${(e: Event) => set(i, { words: (e.target as HTMLTextAreaElement).value })}></textarea>
          <div class="pass-row">
            <select class="num" aria-label="LoRA for person ${i + 1}"
              @change=${(e: Event) => set(i, { lora: (e.target as HTMLSelectElement).value })}>
              <option value="" ?selected=${!p.lora}>No LoRA</option>
              ${loras.map((l) => html`<option value=${l.name} ?selected=${l.name === p.lora}>${l.alias || l.name}</option>`)}
            </select>
            ${p.lora ? html`<input class="lora-weight" type="number" min="-2" max="2" step="0.05" title="LoRA weight"
              aria-label="LoRA weight" .value=${String(p.loraWeight)}
              @input=${(e: Event) => set(i, { loraWeight: clampFloat((e.target as HTMLInputElement).value, -2, 2, 0.8) })} />` : nothing}
            <input class="lora-weight share" type="number" min="0.5" max="4" step="0.5"
              title=${this.regionsRows ? "How tall their part is beside the others" : "How wide their part is beside the others"}
              aria-label="Size of their part" .value=${String(p.share)}
              @input=${(e: Event) => set(i, { share: clampFloat((e.target as HTMLInputElement).value, 0.5, 4, 1) })} />
          </div>
        </div>`)}
      </div>
    </div>`;
  }

  /** What would make this picture of several people come out wrong, each with the
      one click that fixes it — see peopleAdvice in regions.ts. */
  private renderPeopleAdvice() {
    const loras = this.status?.loras ?? [];
    const advice = peopleAdvice(this.regionsRows, this.regionPeople, this.width, this.height, this.selectedLoras, loras);
    const picked = this.selectedChars.map((id) => this.characters.find((c) => c.id === id)?.name).filter(Boolean);
    if (!advice.narrow && !advice.everyone.length && !picked.length) return nothing;
    const label = (name: string) => loras.find((l) => l.name === name)?.alias || name;
    return html`<div class="people-advice">
      ${advice.narrow ? html`<div class="advice-row">
        <span class="material-symbols-rounded">aspect_ratio</span>
        <span>${this.regionsRows
          ? `Stacked in a ${this.width}×${this.height} picture, each person is a thin band — they come out squashed.`
          : `Side by side in a ${this.width}×${this.height} picture, each person gets a strip ${Math.round(this.width / this.regionPeople.length)} pixels wide — too thin to draw a figure.`}</span>
        <button class="chip small" @click=${() => { const w = this.width; this.width = this.height; this.height = w; }}>
          ${this.regionsRows ? "Make it tall" : "Make it wide"}</button>
      </div>` : nothing}
      ${advice.everyone.map((name) => html`<div class="advice-row">
        <span class="material-symbols-rounded">group_off</span>
        <span><b>${label(name)}</b> is a character LoRA in the recipe, so it is put on everyone. Put it on one person instead.</span>
        <button class="chip small" @click=${() => this.toggleLora(name)}>Take it off the recipe</button>
      </div>`)}
      ${picked.length ? html`<div class="advice-row">
        <span class="material-symbols-rounded">person_off</span>
        <span>${picked.join(", ")} ${picked.length === 1 ? "is" : "are"} picked in Look, which sits out while people have parts of
          their own — pick a character for each person here instead.</span>
      </div>` : nothing}
    </div>`;
  }

  /** The hires fix, and what an upscale of a finished picture uses (A1111). */
  private renderUpscaleSettings() {
    const hiresChoices = hiresUpscalers(this.status?.latentUpscalers, this.status?.upscalers);
    const hires = this.hiresChoice;
    const scale = hiresScale(this.width, this.height, this.hiresScale);
    const out = scaledSize(this.width, this.height, scale);
    const up = this.upscaleChoice;
    return html`
      <label class="switch-row full"><input type="checkbox" .checked=${this.hiresEnabled}
        @change=${(e: Event) => (this.hiresEnabled = (e.target as HTMLInputElement).checked)} />
        Hires fix — draw it again bigger</label>
      ${this.hiresEnabled ? html`
        <div class="full">
          <label class="field">Hires upscaler</label>
          <select class="num" @change=${(e: Event) => (this.hiresUpscaler = (e.target as HTMLSelectElement).value)}>
            ${hiresChoices.map((u) => html`<option value=${u} ?selected=${u === hires}>${u}</option>`)}
          </select>
        </div>
        <div>
          <label class="field">Scale</label>
          <input class="num" type="number" min="1" max="4" step="0.25" .value=${String(this.hiresScale)}
            @input=${(e: Event) => (this.hiresScale = clampFloat((e.target as HTMLInputElement).value, 1, 4, 1.5))} />
        </div>
        <div>
          <label class="field">Hires denoise</label>
          <input class="num" type="number" min="0.05" max="1" step="0.05" .value=${String(this.hiresDenoise)}
            @input=${(e: Event) => (this.hiresDenoise = clampFloat((e.target as HTMLInputElement).value, 0.05, 1, 0.45))} />
        </div>
        <div>
          <label class="field">Hires steps (0 = same)</label>
          <input class="num" type="number" min="0" max="80" .value=${String(this.hiresSteps)}
            @input=${(e: Event) => (this.hiresSteps = clampNum((e.target as HTMLInputElement).value, 0, 80, 0))} />
        </div>
        <div class="full sec-note">Drawn at ${this.width}×${this.height}, then again at ${out.width}×${out.height}${
          scale < this.hiresScale ? " — as large as a hires fix goes" : ""}. Pictures started from another keep their size.</div>
      ` : nothing}
      <div class="full">
        <label class="field">Upscale a finished picture with</label>
        <select class="num" @change=${(e: Event) => (this.upscaleUpscaler = (e.target as HTMLSelectElement).value)}>
          ${(this.status?.upscalers ?? []).map((u) => html`<option value=${u} ?selected=${u === up}>${u}</option>`)}
        </select>
      </div>
      <div>
        <label class="field">Upscale by</label>
        <select class="num" @change=${(e: Event) => (this.upscaleBy = Number((e.target as HTMLSelectElement).value))}>
          ${[1.5, 2, 3, 4].map((n) => html`<option value=${n} ?selected=${n === this.upscaleBy}>${n}×</option>`)}
        </select>
      </div>
      <div class="full sec-note">Upscale is on a picture's menu, in the gallery and over a picture you start from. It
        enlarges without redrawing, so nothing in the picture changes.</div>
    `;
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
            : this.status?.backend === "invokeai"
              ? "No style presets in InvokeAI yet; add some there and reload."
              : "No styles saved in Automatic1111 yet; save one from its Styles menu and reload."}
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
    return this.section("templates", "Styles", current ? current.name : "none", body);
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

  /** The pose library: the same cards as the characters, for what she is doing. */
  private renderPoseSection() {
    const body = html`
      ${this.outfitOn ? html`<div class="sec-note">
        The outfit board sets a pose per square, so picked poses sit out while it is on.
      </div>` : nothing}
      ${this.poses.length
        ? html`<div class="cards">
            ${this.poses.map((p) => {
              const on = this.selectedPoses.includes(p.id);
              const thumb = `${api.poseThumbURL(p.id)}?v=${this.thumbVersion}`;
              return html`
                <div class="card-wrap">
                  <button class="card ${on ? "on" : ""}" title=${p.prompt} @click=${() => this.togglePose(p.id)}>
                    ${p.hasThumb
                      ? this.renderArt(thumb, p.name, "accessibility_new")
                      : html`<div class="card-blank">
                          <span class="material-symbols-rounded" style="font-size:34px;">accessibility_new</span>
                        </div>`}
                    <div class="card-name">${p.name}</div>
                  </button>
                  <button class="card-edit" title="Edit ${p.name}"
                    @click=${() => (this.poseDraft = { id: p.id, name: p.name, prompt: p.prompt, negativePrompt: p.negativePrompt ?? "" })}>
                    <span class="material-symbols-rounded" style="font-size:15px;">edit</span>
                  </button>
                </div>`;
            })}
          </div>`
        : html`<div class="sec-note">
            Save the poses you keep asking for: a pose is a prompt fragment with a
            picture, and clicking one adds it to the next generation. Right-click any
            result for "Save as a pose" to start one from a picture you like.
          </div>`}
      <button class="side-add" @click=${() => (this.poseDraft = { name: "", prompt: "", negativePrompt: "" })}>
        <span class="material-symbols-rounded" style="font-size:17px;">add</span> New pose
      </button>
    `;
    const picked = this.selectedPoses.length;
    return this.section("poses", "Poses", picked ? `${picked} picked` : String(this.poses.length), body);
  }

  /**
   * Wildcards: the lists, each a chip that drops its reference into the prompt, and
   * an editor. The rolling itself happens on the server at generate time, so the
   * prompt keeps the reference and every take draws again.
   */
  private renderWildcardSection() {
    const body = html`
      <div class="sec-note">
        Write <code>__name__</code> in a prompt to draw a random line from that list on
        every generate, or <code>{red|blue|green}</code> to pick one of a few words in
        place. Click a list to insert it.
      </div>
      ${this.wildcards.length
        ? html`<div class="wildcard-chips">
            ${this.wildcards.map((w) => html`
              <span class="wildcard-chip">
                <button class="wildcard-name" title=${`${w.entries.length} line${w.entries.length === 1 ? "" : "s"} — insert __${w.name}__`}
                  @click=${() => this.insertWildcard(w.name)}>__${w.name}__</button>
                ${w.readOnly
                  ? html`<span class="wildcard-ro" title="A .txt file in the server's wildcards folder — edit the file to change it">
                      <span class="material-symbols-rounded" style="font-size:14px;">lock</span></span>`
                  : html`<button class="wildcard-edit" title="Edit ${w.name}"
                      @click=${() => (this.wildcardDraft = { id: w.id, name: w.name, text: w.entries.join("\n") })}>
                      <span class="material-symbols-rounded" style="font-size:14px;">edit</span></button>`}
              </span>`)}
          </div>`
        : nothing}
      <button class="side-add" @click=${() => (this.wildcardDraft = { name: "", text: "" })}>
        <span class="material-symbols-rounded" style="font-size:17px;">add</span> New wildcard list
      </button>
    `;
    return this.section("wildcards", "Wildcards", String(this.wildcards.length), body);
  }

  /** Drops a wildcard reference into the prompt at the cursor, or on the end. */
  private insertWildcard(name: string) {
    const ref = `__${name}__`;
    const area = this.renderRoot.querySelector<HTMLTextAreaElement>(".prompt-area");
    const at = area && document.activeElement === area ? area.selectionStart : this.prompt.length;
    const before = this.prompt.slice(0, at).replace(/\s+$/, "");
    const after = this.prompt.slice(at).replace(/^\s+/, "");
    const lead = before && !before.endsWith(",") ? `${before}, ` : before;
    const tail = after ? (after.startsWith(",") ? after : `, ${after}`) : "";
    this.prompt = `${lead}${ref}${tail}`;
  }

  private togglePose(id: string) {
    this.selectedPoses = this.selectedPoses.includes(id)
      ? this.selectedPoses.filter((p) => p !== id)
      : [...this.selectedPoses, id];
  }

  private onPoseThumbFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file || !this.poseDraft) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (this.poseDraft) this.poseDraft = { ...this.poseDraft, imageData: String(reader.result), previewId: undefined };
    };
    reader.readAsDataURL(file);
  }

  private async savePose() {
    const d = this.poseDraft;
    if (!d || !d.name.trim() || this.poseBusy) return;
    this.poseBusy = true;
    try {
      const saved = await api.savePose({
        id: d.id, name: d.name.trim(), prompt: d.prompt, negativePrompt: d.negativePrompt,
        imageData: d.imageData, previewId: d.previewId,
      });
      this.poseDraft = null;
      this.bumpThumbs();
      await this.loadPoses();
      if (!d.id) this.selectedPoses = [...this.selectedPoses, saved.id];
      this.showToast("Pose saved");
    } catch (e) {
      this.showToast((e as Error).message);
    } finally {
      this.poseBusy = false;
    }
  }

  private async deletePose() {
    const d = this.poseDraft;
    if (!d?.id || this.poseBusy) return;
    if (!confirm(`Delete “${d.name}” from the pose library?`)) return;
    this.poseBusy = true;
    try {
      await api.deletePose(d.id);
      this.poseDraft = null;
      await this.loadPoses();
      this.showToast("Pose deleted");
    } catch (e) {
      this.showToast((e as Error).message);
    } finally {
      this.poseBusy = false;
    }
  }

  private async saveWildcard() {
    const d = this.wildcardDraft;
    if (!d || !d.name.trim() || !d.text.trim() || this.wildcardBusy) return;
    this.wildcardBusy = true;
    try {
      await api.saveWildcard({ id: d.id, name: d.name.trim(), text: d.text });
      this.wildcardDraft = null;
      await this.loadWildcards();
      this.showToast("Wildcard list saved");
    } catch (e) {
      this.showToast((e as Error).message);
    } finally {
      this.wildcardBusy = false;
    }
  }

  private async deleteWildcard() {
    const d = this.wildcardDraft;
    if (!d?.id || this.wildcardBusy) return;
    if (!confirm(`Delete the wildcard list “${d.name}”?`)) return;
    this.wildcardBusy = true;
    try {
      await api.deleteWildcard(d.id);
      this.wildcardDraft = null;
      await this.loadWildcards();
      this.showToast("Wildcard list deleted");
    } catch (e) {
      this.showToast((e as Error).message);
    } finally {
      this.wildcardBusy = false;
    }
  }

  private renderPoseEditor(d: CharDraft) {
    const existingThumb =
      d.imageData ?? (d.previewId ? api.genPreviewURL(d.previewId)
        : d.id && this.poses.find((p) => p.id === d.id)?.hasThumb
          ? `${api.poseThumbURL(d.id)}?v=${this.thumbVersion}`
          : undefined);
    return html`
      <div class="overlay" @click=${(e: Event) => { if (e.target === e.currentTarget) this.poseDraft = null; }}>
        <div class="dialog">
          <h3>${d.id ? "Edit pose" : "New pose"}</h3>
          <div>
            <label class="field">Name</label>
            <input type="text" .value=${d.name} placeholder="Sitting with a mug"
              @input=${(e: Event) => (this.poseDraft = { ...d, name: (e.target as HTMLInputElement).value })} />
          </div>
          <div>
            <label class="field">Prompt fragment</label>
            <textarea .value=${d.prompt} placeholder="sitting cross-legged, holding a steaming mug in both hands, …"
              @input=${(e: Event) => (this.poseDraft = { ...d, prompt: (e.target as HTMLTextAreaElement).value })}></textarea>
          </div>
          <div>
            <label class="field">Negative fragment (optional)</label>
            <textarea .value=${d.negativePrompt} placeholder="standing, …"
              @input=${(e: Event) => (this.poseDraft = { ...d, negativePrompt: (e.target as HTMLTextAreaElement).value })}></textarea>
          </div>
          <div class="dialog-thumb">
            ${existingThumb
              ? html`<img src=${existingThumb} alt="Thumbnail" />`
              : html`<div class="card-blank" style="width:72px; height:96px; aspect-ratio:auto; border-radius:10px;">
                  <span class="material-symbols-rounded">accessibility_new</span>
                </div>`}
            <label class="btn">
              Choose thumbnail…
              <input class="hidden-file" type="file" accept="image/*" @change=${(e: Event) => this.onPoseThumbFile(e)} />
            </label>
          </div>
          <div class="dialog-actions">
            ${d.id
              ? html`<button class="btn danger" ?disabled=${this.poseBusy} @click=${() => this.deletePose()}>Delete</button>`
              : nothing}
            <button class="btn" @click=${() => (this.poseDraft = null)}>Cancel</button>
            <button class="btn primary" ?disabled=${!d.name.trim() || this.poseBusy} @click=${() => this.savePose()}>Save</button>
          </div>
        </div>
      </div>
    `;
  }

  private renderWildcardEditor(d: { id?: string; name: string; text: string }) {
    const lines = d.text.split("\n").map((line) => line.trim()).filter((line) => line && !line.startsWith("#")).length;
    return html`
      <div class="overlay" @click=${(e: Event) => { if (e.target === e.currentTarget) this.wildcardDraft = null; }}>
        <div class="dialog">
          <h3>${d.id ? "Edit wildcard list" : "New wildcard list"}</h3>
          <div>
            <label class="field">Name — used as <code>__name__</code></label>
            <input type="text" .value=${d.name} placeholder="hair_colour" ?disabled=${!!d.id}
              @input=${(e: Event) => (this.wildcardDraft = { ...d, name: (e.target as HTMLInputElement).value })} />
          </div>
          <div>
            <label class="field">One line per option${lines ? ` — ${lines}` : ""}</label>
            <textarea class="wildcard-text" .value=${d.text} placeholder="red hair&#10;blue hair&#10;silver hair, {braid|ponytail}"
              @input=${(e: Event) => (this.wildcardDraft = { ...d, text: (e.target as HTMLTextAreaElement).value })}></textarea>
            <div class="sec-note">A line can itself hold <code>{a|b}</code> choices or another <code>__list__</code>. Lines starting with # are ignored.</div>
          </div>
          <div class="dialog-actions">
            ${d.id
              ? html`<button class="btn danger" ?disabled=${this.wildcardBusy} @click=${() => this.deleteWildcard()}>Delete</button>`
              : nothing}
            <button class="btn" @click=${() => (this.wildcardDraft = null)}>Cancel</button>
            <button class="btn primary" ?disabled=${!d.name.trim() || !d.text.trim() || this.wildcardBusy} @click=${() => this.saveWildcard()}>Save</button>
          </div>
        </div>
      </div>
    `;
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
    const described = !!piece.item.trim();
    const equipped = gearWorn(piece);
    const edit = (patch: Partial<GearPiece>) => {
      this.outfitGear = { ...this.outfitGear, [key]: { ...piece, ...patch } };
    };
    const renamed = !!piece.prompt?.trim() || !!piece.noun?.trim();
    const open = this.gearPromptOpen === key;
    return html`<div class="gear-slot ${equipped ? "filled" : ""} ${piece.off ? "off" : ""}" title=${slot.hint}>
      <button class="gear-slot-icon material-symbols-rounded ${described ? "" : "inert"}" aria-hidden=${described ? "false" : "true"}
        title=${piece.off ? `Wear the ${slot.label.toLowerCase()} again` : described ? `Take the ${slot.label.toLowerCase()} off without clearing it` : slot.hint}
        ?disabled=${this.outfitBatchRunning || !described}
        @click=${() => edit({ off: !piece.off })}>${piece.off ? "visibility_off" : slot.icon}</button>
      <span class="gear-slot-name">${slot.label}${piece.off ? " · off" : ""}</span>
      <button class="gear-slot-prompt ${renamed ? "on" : ""} ${open ? "open" : ""}"
        title=${`What the generator calls this slot — currently "${gearPromptLabel(slot, piece)}"`}
        aria-label=${`Edit the prompt wording for ${slot.label}`} aria-expanded=${open ? "true" : "false"}
        ?disabled=${this.outfitBatchRunning}
        @click=${() => (this.gearPromptOpen = open ? null : key)}>
        <span class="material-symbols-rounded">text_fields</span></button>
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
      ${open ? html`<div class="gear-prompt-edit">
        <label>Prompt word
          <input type="text" .value=${piece.prompt ?? ""} placeholder=${slot.prompt}
            ?disabled=${this.outfitBatchRunning}
            aria-label=${`Prompt word for ${slot.label}`}
            @input=${(e: Event) => edit({ prompt: (e.target as HTMLInputElement).value })} /></label>
        <label>Colour-lock noun
          <input type="text" .value=${piece.noun ?? ""} placeholder=${gearPromptNoun(slot, piece)}
            ?disabled=${this.outfitBatchRunning}
            aria-label=${`Colour-lock noun for ${slot.label}`}
            @input=${(e: Event) => edit({ noun: (e.target as HTMLInputElement).value })} /></label>
        <p class="gear-prompt-preview">
          ${equipped
            ? html`Sends: <code>${gearPhrase(slot, piece, this.status?.backend ?? "", this.outfitLockColors)}</code>`
            : html`Describe something in this slot to see the phrase it sends.`}
        </p>
        ${renamed ? html`<button class="gear-prompt-reset" ?disabled=${this.outfitBatchRunning}
          @click=${() => edit({ prompt: "", noun: "" })}>Reset to "${slot.prompt}"</button>` : nothing}
      </div>` : nothing}
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
    const triggerPhrases = this.activeTriggerPhrases();
    return html`
      <div class="prompt-card composer">
        ${this.editing ? html`<div class="editing-bar">
          <span class="material-symbols-rounded" style="font-size:17px;">brush</span>
          <span class="editing-copy">Editing <strong>${this.editing.title}</strong>${this.editingLibby ? " — one of Libby's pictures" : ""}.
            Generate, then Save to keep it beside the original, or right-click a result to replace it.</span>
          <button class="chip" @click=${() => (this.editing = null)}>Done</button>
        </div>` : nothing}
        ${this.renderSourceBar()}

        <div class="composer-fields">
          <div class="prompt-field positive">
            <textarea
              class="prompt-area"
              aria-label="Positive prompt"
              aria-autocomplete="list"
              .value=${this.prompt}
              placeholder="Describe what you want to create — tags complete as you type, and so do <lora: and __wildcards__"
              @input=${(e: Event) => {
                this.prompt = (e.target as HTMLTextAreaElement).value;
                this.onPromptTyping("prompt");
              }}
              @click=${() => this.onPromptTyping("prompt")}
              @keydown=${(e: KeyboardEvent) => this.onPromptKey(e, "prompt")}
              @blur=${() => this.closeCompletionsSoon()}
            ></textarea>
            ${this.completionField === "prompt" ? this.renderCompletions() : nothing}
          </div>
          <div class="prompt-field negative">
            <span class="field-tag negative">Negative</span>
            <textarea
              class="negative-area"
              aria-label="Negative prompt"
              aria-autocomplete="list"
              .value=${this.negative}
              placeholder="What to leave out…"
              @input=${(e: Event) => {
                this.negative = (e.target as HTMLTextAreaElement).value;
                this.onPromptTyping("negative");
              }}
              @click=${() => this.onPromptTyping("negative")}
              @keydown=${(e: KeyboardEvent) => this.onPromptKey(e, "negative")}
              @blur=${() => this.closeCompletionsSoon()}
            ></textarea>
            ${this.completionField === "negative" ? this.renderCompletions() : nothing}
          </div>
        </div>
        ${this.outfitOn ? nothing : this.renderPeopleStrip()}

        ${triggerPhrases.length ? html`<div class="trigger-row">
          <span class="trigger-label">Trigger words</span>
          ${triggerPhrases.map((phrase) => html`<button
            class="chip small ${this.selectedTriggers.includes(phrase) ? "on" : ""}"
            title="Add or remove this LoRA trigger phrase"
            @click=${() => this.toggleTrigger(phrase)}>${phrase}</button>`)}
        </div>` : nothing}

        ${this.promptsOpen ? this.renderRecentPrompts() : nothing}
        <div class="composer-bar">
          <button class="mic" title="Start from a picture on this computer" @click=${() => this.sourceFile?.click()}>
            <span class="material-symbols-rounded">add_photo_alternate</span>
          </button>
          <button class="mic ${this.promptsOpen ? "on" : ""}" title="Recent prompts" aria-expanded=${this.promptsOpen ? "true" : "false"}
            @click=${() => (this.promptsOpen = !this.promptsOpen)}>
            <span class="material-symbols-rounded">history</span>
          </button>
          <input class="source-file" type="file" accept="image/png,image/jpeg,image/webp" hidden
            @change=${(e: Event) => this.onSourceFile(e)} />
          ${this.speechSupported
            ? html`<button
                class="mic ${this.listening ? "live" : ""}"
                title=${this.listening ? "Stop listening" : "Speak your idea"}
                @click=${() => this.toggleListening()}
              >
                <span class="material-symbols-rounded">${this.listening ? "stop" : "mic"}</span>
              </button>`
            : nothing}
          ${this.listening || this.optimizing
            ? html`<span class="speech-hint">${this.listening ? this.speech || "Listening…" : "Turning that into a prompt…"}</span>`
            : html`<div class="count-seg" role="group" aria-label="Pictures per run" title=${this.outfitOn ? "The outfit board makes one square at a time" : "Pictures per run"}>
                ${[1, 2, 3, 4].map((n) => html`<button class=${outputCount === n ? "on" : ""} ?disabled=${this.outfitOn}
                  aria-pressed=${outputCount === n ? "true" : "false"} @click=${() => (this.count = n)}>${n}</button>`)}
              </div>
              ${this.status?.backend === "invokeai" || this.outfitOn ? nothing : this.renderPeopleCount()}
              <span class="prompt-summary">${outputCount} picture${outputCount === 1 ? "" : "s"} · ${this.sizeLabel()}</span>`}
          ${this.generating
            ? html`<button class="generate cancel" type="button" ?disabled=${this.progress?.cancelled} title="Stop this generation" @click=${() => void this.cancelGeneration()}>
                <span class="material-symbols-rounded" style="font-size:19px;">close</span>
                ${this.progress?.cancelled ? "Stopping…" : this.progress?.total ? `Cancel · ${this.progress.step}/${this.progress.total}` : "Cancel"}
              </button>`
            : html`<button class="generate" title="Generate (Ctrl+Enter)" ?disabled=${!this.assemblePrompts().prompt.trim()} @click=${() => this.generate()}>
                <span class="material-symbols-rounded" style="font-size:20px;">auto_awesome</span>
                ${this.source?.mode === "inpaint" && this.sourceMask ? "Repaint" : this.status?.backend === "invokeai" ? "Invoke" : "Generate"}
              </button>`}
          ${this.outfitOn ? nothing : html`<button class="queue-btn ${this.generating ? "hot" : ""}" title="Add to the queue (Ctrl+Shift+Enter) — it keeps these settings"
            ?disabled=${!this.assemblePrompts().prompt.trim()} @click=${() => void this.enqueue()}>
            <span class="material-symbols-rounded">playlist_add</span><span class="queue-label">Queue</span>
            ${this.queue.length ? html`<b>${this.queue.length}</b>` : nothing}
          </button>`}
        </div>
      </div>
    `;
  }

  /** The size the next run comes out at: the source picture's, when there is one. */
  private sizeLabel(): string {
    if (!this.source) return `${this.width}×${this.height}`;
    const size = sourceSize(this.source.width, this.source.height);
    return `${size.width}×${size.height}, as the picture`;
  }

  /** The trigger phrases of the LoRAs that are switched on. */
  private activeTriggerPhrases(): string[] {
    return [...new Set(
      (this.status?.loras ?? [])
        .filter((lora) => lora.name in this.selectedLoras)
        .flatMap((lora) => lora.triggerPhrases ?? []),
    )];
  }

  private renderCompletions() {
    if (!this.completions.length) return nothing;
    return html`<div class="complete" role="listbox" aria-label="Suggestions"
      @mousedown=${(e: Event) => e.preventDefault()}>
      ${this.completions.map((c, i) => html`<button class="complete-row ${i === this.completionIndex ? "on" : ""}"
          role="option" aria-selected=${i === this.completionIndex ? "true" : "false"}
          @mouseenter=${() => (this.completionIndex = i)}
          @click=${() => void this.acceptCompletion(i)}>
          <span class="complete-dot cat-${c.kind === "tag" ? String(c.category ?? 0) : c.kind}"></span>
          <span class="complete-label">${c.label}</span>
          ${c.detail ? html`<span class="complete-detail">${c.detail}</span>` : nothing}
          <span class="complete-count">${formatCount(c.count)}</span>
        </button>`)}
      <div class="complete-hint">↑ ↓ choose · Tab or Enter inserts · Esc closes</div>
    </div>`;
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
      // A fresh browser with nothing picked opens on the wardrobe that has work in it,
      // rather than an empty board beside sixty squares nobody can see.
      if (!this.outfitWardrobeId) {
        const busiest = [...this.wardrobes].sort((a, b) => (b.wip ?? 0) - (a.wip ?? 0))[0];
        if (busiest?.wip) this.outfitWardrobeId = busiest.id;
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
    const shot = this.shotAt(this.outfitSlot().slot) ?? this.currentOutfitShots()[0];
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

  private promptArea(field: "prompt" | "negative") {
    return this.renderRoot.querySelector<HTMLTextAreaElement>(field === "prompt" ? ".prompt-area" : ".negative-area");
  }

  /**
   * Reads the token at the caret and fills the completion list: LoRAs, wildcard lists
   * and trigger words at once from what the screen already has, tags from the server
   * a moment after typing pauses. A reply that arrives after more typing is dropped,
   * so a slow answer for "lo" never replaces the list for "long h".
   */
  private onPromptTyping(field: "prompt" | "negative") {
    const area = this.promptArea(field);
    if (!area) return;
    const token = tokenAt(area.value, area.selectionStart ?? area.value.length);
    const seq = ++this.completionSeq;
    window.clearTimeout(this.completionTimer);
    this.completionField = field;
    this.completionToken = token;
    if (!token) {
      this.closeCompletions();
      return;
    }
    const sources: LocalSources = {
      loras: (this.status?.loras ?? []).map((l) => ({ name: l.name, alias: l.alias, weight: l.weight })),
      wildcards: this.wildcards.map((w) => ({ name: w.name, lines: w.entries.length })),
      triggers: field === "prompt" ? this.activeTriggerPhrases() : [],
    };
    const local = localCompletions(token, sources);
    if (token.mode !== "tag" || token.query.length < 2) {
      this.showCompletions(local);
      return;
    }
    if (local.length) this.showCompletions(local);
    this.completionTimer = window.setTimeout(async () => {
      try {
        const res = await api.booruTags(token.query, 10);
        if (seq !== this.completionSeq) return;
        const items = res.items ?? res.suggestions.map((tag) => ({ tag, category: 0, count: 0 }));
        const tags: Completion[] = items.map((t) => ({
          kind: "tag" as const, label: t.tag, insert: escapeTag(t.tag),
          category: t.category, count: t.count,
          detail: "alias" in t && t.alias ? `“${t.alias}”` : undefined,
        }));
        if (!tags.length && res.correction) {
          tags.push({ kind: "tag", label: res.correction, insert: escapeTag(res.correction), detail: "did you mean" });
        }
        this.showCompletions(mergeCompletions(local, tags, 10));
      } catch {
        if (seq === this.completionSeq) this.showCompletions(local);
      }
    }, 110);
  }

  private showCompletions(list: Completion[]) {
    const token = this.completionToken;
    const area = this.promptArea(this.completionField);
    // The tag already typed out in full is not a suggestion worth a popup.
    const typed = token && area ? area.value.slice(token.start, token.end).trim().toLowerCase() : "";
    if (list.length === 1 && list[0].insert.toLowerCase() === typed) list = [];
    this.completions = list;
    this.completionIndex = list.length ? 0 : -1;
  }

  private closeCompletions() {
    this.completionSeq++;
    window.clearTimeout(this.completionTimer);
    this.completions = [];
    this.completionIndex = -1;
  }

  private closeCompletionsSoon() {
    // Later rather than now: a click on a suggestion is a blur first, and the list
    // has to still be there for the click to land on.
    window.setTimeout(() => {
      if ((this.renderRoot as ShadowRoot).activeElement !== this.promptArea(this.completionField)) {
        this.closeCompletions();
      }
    }, 120);
  }

  private onPromptKey(e: KeyboardEvent, field: "prompt" | "negative") {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.closeCompletions();
      if (e.shiftKey) void this.enqueue();
      else if (!this.generating && this.assemblePrompts().prompt.trim()) void this.generate();
      return;
    }
    if (!this.completions.length || this.completionField !== field) return;
    switch (e.key) {
      case "ArrowDown":
      case "ArrowUp":
        e.preventDefault();
        this.completionIndex = moveSelection(this.completionIndex, this.completions.length, e.key === "ArrowDown" ? 1 : -1);
        break;
      case "Tab":
      case "Enter":
        if (e.shiftKey || e.altKey || this.completionIndex < 0) return;
        e.preventDefault();
        void this.acceptCompletion(this.completionIndex);
        break;
      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        this.closeCompletions();
        break;
    }
  }

  /**
   * Writes the chosen completion over the token. A LoRA is switched on in the picker
   * rather than written as "<lora:…>" text: InvokeAI does not read that syntax, and
   * on either backend the picker is where its weight and trigger words live.
   */
  private async acceptCompletion(index: number) {
    const c = this.completions[index];
    const token = this.completionToken;
    const field = this.completionField;
    const area = this.promptArea(field);
    if (!c || !token || !area) return;
    let out = applyCompletion(area.value, token, c.insert);
    if (c.kind === "lora") {
      const name = /^<lora:(.*):[^:]*>$/.exec(c.insert)?.[1] ?? "";
      out = applyCompletion(area.value, token, "");
      if (name && !(name in this.selectedLoras)) this.toggleLora(name);
      this.showToast(`${c.label} is on — its weight is in the recipe above`);
    }
    if (field === "prompt") this.prompt = out.text;
    else this.negative = out.text;
    this.closeCompletions();
    await this.updateComplete;
    area.value = out.text;
    area.focus();
    area.setSelectionRange(out.caret, out.caret);
  }

  private renderPromptOptions() {
    return html`
      ${this.renderSizePreview()}
      <div>
        <label class="field">Resolution</label>
        <div class="chips">
          ${RESOLUTIONS.map((r) => {
            const on = r.w === this.width && r.h === this.height;
            // The chip's glyph is the shape alone, fitted; the frame above is the size.
            const k = 14 / Math.max(r.w, r.h);
            const glyph = { width: Math.round(r.w * k), height: Math.round(r.h * k) };
            return html`<button
              class="chip ${on ? "on" : ""}"
              @click=${() => {
                this.width = r.w;
                this.height = r.h;
              }}
            ><span class="size-glyph" style="width:${glyph.width}px;height:${glyph.height}px"></span>${r.label}<span class="hint">${r.hint}</span></button>`;
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
   * The size, drawn: a frame to scale against the largest SDXL size, the picture on
   * the canvas cropped into it the way a new one at this size will be framed, and a
   * hires fix's final size as a dashed outline around it.
   */
  private renderSizePreview() {
    const box = 132;
    const frame = previewFrame(this.width, this.height, box);
    const { ratio, name } = aspectLabel(this.width, this.height);
    const hires = this.canUpscale && this.hiresEnabled && !this.source
      ? scaledSize(this.width, this.height, hiresScale(this.width, this.height, this.hiresScale))
      : null;
    const outer = hires ? previewFrame(hires.width, hires.height, box) : null;
    const latest = this.shots[0];
    return html`<div class="size-preview">
      <div class="size-stage" style="width:${box}px;height:${box}px">
        ${outer ? html`<span class="size-hires" style="width:${outer.width}px;height:${outer.height}px"
          title="After the hires fix: ${hires!.width}×${hires!.height}"></span>` : nothing}
        <span class="size-frame" style="width:${frame.width}px;height:${frame.height}px">
          ${latest ? html`<img src=${this.previewURL(latest)} alt="" />` : nothing}
        </span>
      </div>
      <div class="size-facts">
        <b>${this.width} × ${this.height}</b>
        <span>${ratio}${name ? html` · ${name}` : nothing}</span>
        <span>${megapixels(this.width, this.height)}</span>
        ${hires ? html`<span class="size-hires-note">hires → ${hires.width} × ${hires.height}</span>` : nothing}
      </div>
    </div>`;
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

  /** Clears the stage and the session strip. Prompt, model and outfit controls stay as
   * they are, so this is clearing a table rather than starting the studio over; the
   * pictures themselves are still in the gallery. */
  private clearWorkspace() {
    if (!this.history.length || !confirm("Clear this session's pictures off the stage? They stay in the gallery; unsaved ones are still there until the gallery is tidied.")) return;
    this.shots = [];
    store.history = [];
    storeChanged();
    this.viewing = null;
    this.compareWith = null;
    this.expandedShot = null;
    this.infoFor = null;
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

  // ── the stage ───────────────────────────────────────────────────────────────
  //
  // One picture large, with its tools under it, and the session in a strip below. It
  // was a canvas of draggable cards, which suited nothing: four results had to be
  // dragged apart to be compared, and a new run cleared the lot.

  /** The picture on the stage: the one picked, else the newest. */
  private get viewedShot(): Shot | undefined {
    return this.history.find((s) => s.id === this.viewing) ?? this.history[0];
  }

  /** Left is newer and right is older, as the strip lays them out. */
  private stepViewer(dir: 1 | -1) {
    this.viewing = stepThrough(this.history, this.viewedShot?.id ?? null, dir);
    this.infoFor = null;
  }

  /** Compares the stage with the picture beside it in the strip, or stops comparing. */
  private toggleCompare() {
    if (this.compareWith) {
      this.compareWith = null;
      return;
    }
    const current = this.viewedShot;
    if (!current || this.history.length < 2) {
      this.showToast("Make another picture first — there is nothing to compare this one with");
      return;
    }
    const older = stepThrough(this.history, current.id, 1);
    this.compareWith = older && older !== current.id ? older : stepThrough(this.history, current.id, -1);
    this.compareSplit = 50;
  }

  /** A click on the strip views a picture; with Shift it becomes the one compared. */
  private pickFromStrip(shot: Shot, e: MouseEvent) {
    if (e.shiftKey || e.altKey) {
      if (shot.id === this.viewedShot?.id) return;
      this.compareWith = this.compareWith === shot.id ? null : shot.id;
      this.compareSplit = 50;
      return;
    }
    if (this.compareWith === shot.id) this.compareWith = null;
    this.viewing = shot.id;
    this.infoFor = null;
  }

  private renderViewer() {
    const list = this.history;
    if (!list.length && this.regionsActive) {
      return html`<div class="people-empty">
        <span class="hint">${this.regionPeople.length} people, ${this.regionsRows ? "stacked" : "side by side"}. Drag a LoRA from the
          LoRAs tab onto a person to put it on them alone.</span>
        ${this.renderPeopleFrame(false)}
      </div>`;
    }
    const shot = this.viewedShot;
    if (!shot) {
      const go = this.status?.backend === "invokeai" ? "Invoke" : "Generate";
      return html`<div class="canvas-empty welcome">
        <span class="welcome-glyph"><span class="material-symbols-rounded">auto_awesome</span></span>
        <strong>What are we making?</strong>
        <span>Write a prompt below and press ${go} — or Ctrl+Enter from the prompt.</span>
        <div class="welcome-tips">
          <span><span class="material-symbols-rounded">add_photo_alternate</span>Drop a gallery picture here to start from it</span>
          <span><span class="material-symbols-rounded">queue</span>Queue the next idea while one draws</span>
          <span><span class="material-symbols-rounded">compare</span>Compare two takes with C</span>
        </div>
        ${this.recentPrompts.length ? html`<div class="welcome-recent">
          <span class="welcome-k">Pick up a recent prompt</span>
          ${this.recentPrompts.slice(0, 3).map((r) => html`<button class="recent-line" title=${r.prompt} @click=${() => this.useRecentPrompt(r)}>
            <span class="material-symbols-rounded">history</span><span>${r.prompt}</span></button>`)}
        </div>` : nothing}
      </div>`;
    }
    const other = this.compareWith ? list.find((s) => s.id === this.compareWith) : undefined;
    if (other && other.id !== shot.id) return this.renderCompare(shot, other);
    const at = list.indexOf(shot);
    const info = shot.info;
    return html`<div class="viewer">
      <button class="view-nav prev" ?disabled=${at <= 0} title="Newer (←)" aria-label="Newer picture" @click=${() => this.stepViewer(-1)}>
        <span class="material-symbols-rounded">chevron_left</span></button>
      <figure class="view-frame">
        <img class="view-img" src=${this.previewURL(shot)} alt="Generated image" title="Expand"
          @click=${() => (this.expandedShot = shot)} @contextmenu=${(e: MouseEvent) => this.openShotMenu(shot, e)} />
        <figcaption class="view-cap">
          <span>${at + 1} of ${list.length}</span>
          <span><span class="material-symbols-rounded">casino</span>${shot.seed}</span>
          ${info ? html`<span>${info.width}×${info.height}</span>` : nothing}
          ${info?.seconds ? html`<span>${info.seconds.toFixed(1)}s</span>` : nothing}
          ${shot.saved ? html`<span class="cap-saved"><span class="material-symbols-rounded">check</span>In the library</span>` : nothing}
        </figcaption>
      </figure>
      <button class="view-nav next" ?disabled=${at >= list.length - 1} title="Older (→)" aria-label="Older picture" @click=${() => this.stepViewer(1)}>
        <span class="material-symbols-rounded">chevron_right</span></button>
      ${this.renderViewBar(shot)}
      ${this.infoFor === shot.id ? html`<div class="view-info">${this.renderGenInfo(shot)}</div>` : nothing}
    </div>`;
  }

  /** The tools for the picture on the stage, in the order they are reached for. */
  private renderViewBar(shot: Shot) {
    const a1111 = this.status?.backend !== "invokeai";
    const url = this.previewURL(shot);
    const name = `seed ${shot.seed}`;
    const tool = (icon: string, label: string, run: () => void, on = false) => html`<button class="vb ${on ? "on" : ""}" title=${label} aria-label=${label} @click=${run}>
      <span class="material-symbols-rounded">${icon}</span></button>`;
    return html`<div class="view-bar">
      <button class="vb save ${shot.saved ? "done" : ""}" ?disabled=${shot.saved} title="Keep this picture in the library (S)" @click=${() => void this.save(shot)}>
        <span class="material-symbols-rounded">${shot.saved ? "check" : "save"}</span>${shot.saved ? "Saved" : "Save"}
      </button>
      <span class="vb-sep"></span>
      ${tool("add_photo_alternate", "Start the next picture from this one", () => void this.usePicture(url, name, "img2img", false, shot.gallery))}
      ${a1111 ? tool("brush", "Paint over a part to redo it", () => void this.usePicture(url, name, "inpaint", false, shot.gallery)) : nothing}
      ${a1111 && this.status?.detailerAvailable ? tool("face_retouching_natural", fixLabel(this.detailerPasses), () => void this.usePicture(url, name, "faces", false, shot.gallery)) : nothing}
      ${this.canUpscale ? tool("open_in_full", `Upscale ${this.upscaleBy}×`, () => void this.usePicture(url, name, "upscale", false, shot.gallery)) : nothing}
      ${this.status?.clips?.image ? tool("animation", "Animate it in the Video studio", () => void this.usePicture(url, name, "animate", false, shot.gallery)) : nothing}
      ${tool("background_replace", "Cut the background out", () => void this.openCutout(url, `seed-${shot.seed}`))}
      <span class="vb-sep"></span>
      ${tool("compare", this.compareWith ? "Stop comparing (C)" : "Compare with the picture beside it (C) — or Shift-click one in the strip", () => this.toggleCompare(), !!this.compareWith)}
      ${tool("data_object", "Generation data", () => (this.infoFor = this.infoFor === shot.id ? null : shot.id), this.infoFor === shot.id)}
      ${tool("download", "Export a PNG with Civitai-compatible metadata", () => void this.exportShot(shot))}
      ${this.status?.manageModels ? tool("photo_camera", "Use as this model's cover", () => void this.useAsModelThumb(shot)) : nothing}
      <button class="vb" title="More" aria-label="More" @click=${(e: MouseEvent) => {
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        this.openShotMenu(shot, new MouseEvent("contextmenu", { clientX: r.left, clientY: r.top }));
      }}><span class="material-symbols-rounded">more_horiz</span></button>
    </div>`;
  }

  /** Two pictures in one frame, a divider between them to drag. */
  private renderCompare(a: Shot, b: Shot) {
    const drag = (e: PointerEvent) => {
      const frame = e.currentTarget as HTMLElement;
      const img = frame.querySelector(".cmp-b") as HTMLElement;
      const r = img.getBoundingClientRect();
      this.compareSplit = Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100));
    };
    return html`<div class="viewer compare">
      <figure class="view-frame cmp-frame" style=${`--split:${this.compareSplit}%`}
        @pointerdown=${(e: PointerEvent) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); drag(e); }}
        @pointermove=${(e: PointerEvent) => { if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) drag(e); }}>
        <img class="view-img cmp-b" src=${this.previewURL(b)} alt="Compared picture" draggable="false" />
        <img class="view-img cmp-a" src=${this.previewURL(a)} alt="Picture on the stage" draggable="false" />
        <span class="cmp-line"><span class="cmp-knob"><span class="material-symbols-rounded">swap_horiz</span></span></span>
        <span class="cmp-tag left">A · ${a.seed}</span>
        <span class="cmp-tag right">B · ${b.seed}</span>
      </figure>
      <div class="view-bar">
        <span class="vb-note">Drag across the picture</span>
        <button class="vb" title="Swap the two" aria-label="Swap" @click=${() => { this.viewing = b.id; this.compareWith = a.id; }}>
          <span class="material-symbols-rounded">swap_horiz</span></button>
        <button class="vb save" @click=${() => (this.compareWith = null)}><span class="material-symbols-rounded">close</span>Done</button>
      </div>
    </div>`;
  }

  /** The session, newest first, with the run drawing now at its head. */
  private renderSessionStrip() {
    if (!this.history.length && !this.generating && !this.queue.length) return nothing;
    const current = this.viewedShot?.id;
    const p = this.progress;
    return html`<div class="session-strip">
      <span class="strip-label">This session<b>${this.history.length}</b></span>
      <div class="strip-scroll" role="listbox" aria-label="Pictures this session">
        ${this.queue.length ? html`<button class="strip-q" title="Runs waiting their turn" @click=${() => (this.queueOpen = true)}>
          <span class="material-symbols-rounded">queue</span>${this.queue.length}</button>` : nothing}
        ${this.generating ? html`<div class="strip-live" title="Drawing now">
          ${p?.image ? html`<img src=${p.image} alt="" />` : nothing}
          <span>${p?.total ? `${Math.round(Math.max(0, Math.min(1, p.percent)) * 100)}%` : "…"}</span>
        </div>` : nothing}
        ${this.history.map((s) => {
          const url = this.previewURL(s);
          return html`<button class="strip-thumb ${s.id === current ? "on" : ""} ${s.id === this.compareWith ? "cmp" : ""}" role="option"
            aria-selected=${s.id === current ? "true" : "false"} title=${`Seed ${s.seed} — Shift-click to compare`}
            @click=${(e: MouseEvent) => this.pickFromStrip(s, e)}>
            ${this.failedThumbs.has(url)
              ? html`<span class="strip-gone" title="This preview has expired — it is still in the gallery"><span class="material-symbols-rounded">hourglass_empty</span></span>`
              : html`<img src=${url} alt="" loading="lazy" @error=${() => (this.failedThumbs = new Set(this.failedThumbs).add(url))} />`}
            ${s.saved ? html`<span class="strip-saved"><span class="material-symbols-rounded">check</span></span>` : nothing}
            ${s.id === this.compareWith ? html`<span class="strip-b">B</span>` : nothing}
          </button>`;
        })}
      </div>
      ${this.history.length ? html`<button class="strip-clear" title="Clear the session off the stage" aria-label="Clear the session" @click=${() => this.clearWorkspace()}>
        <span class="material-symbols-rounded">delete_sweep</span></button>` : nothing}
    </div>`;
  }

  /** Puts a remembered prompt back in the box. */
  private useRecentPrompt(r: RecentPrompt) {
    this.prompt = r.prompt;
    this.negative = r.negative;
    this.templateId = "";
    this.selectedTriggers = [];
    this.promptsOpen = false;
    void this.updateComplete.then(() => this.renderRoot.querySelector<HTMLTextAreaElement>(".prompt-area")?.focus());
  }

  private renderRecentPrompts() {
    return html`<div class="pop prompts-pop" role="dialog" aria-label="Recent prompts">
      <div class="pop-head">
        <span class="material-symbols-rounded">history</span>Recent prompts
        <span class="pop-note">On this device</span>
        <button class="pop-x" aria-label="Close" @click=${() => (this.promptsOpen = false)}><span class="material-symbols-rounded">close</span></button>
      </div>
      ${this.recentPrompts.length
        ? html`<div class="recent-list">${this.recentPrompts.map((r) => html`<button class="recent-row" @click=${() => this.useRecentPrompt(r)}>
            <span class="recent-text">${r.prompt}</span>
            ${r.negative ? html`<span class="recent-neg">− ${r.negative}</span>` : nothing}
            <span class="recent-when">${new Date(r.at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
          </button>`)}</div>`
        : html`<p class="pop-empty">Every prompt you generate with is remembered here, so a good one edited into a bad one is a click away.</p>`}
    </div>`;
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

declare global {
  interface HTMLElementTagNameMap {
    "oppai-imagegen": OppaiImageGen;
  }
}
