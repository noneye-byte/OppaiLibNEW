import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { iconStyles, motionStyles } from "../theme.js";
import { api, type ClipModels, type ClipParams, type ClipUpscaleParams, type ClipWorkflow, type ComfyModels, type GenClip, type GenerateResult } from "../api.js";
import { CLIP_ASPECTS, CLIP_SIDES, clipFrames, clipSize, lastFrameTime, type ClipAspect } from "../clip-shape.js";
import {
  clipIsFast, clipLoraChoices, clipModelChoiceOf, clipModelChoices, settleSpeed, SPEED_SETTINGS, speedAtFullCFG, studioClipModels,
  studioClipRecipe, withClipModel, type ClipLoraChoice, type ClipModelChoice, type StudioClipRecipe,
} from "../clip-models.js";
import { MOTION_PRESETS, hasPhrase, togglePhrase } from "../motion-presets.js";
import { GALLERY_DRAG_TYPE } from "./imagegen-gallery.js";

/**
 * The Video studio: a few seconds of moving picture, from words or from a still.
 *
 * Neither generator behind the studio makes video, so this is ComfyUI's work, through
 * the two workflows set up in Settings → Image generation → Video (api/gen_clips.go).
 * The inspector shows a control only for what the workflow has a placeholder for — a
 * length slider over a workflow with its frame count written in would move nothing.
 *
 * It was a drawer on the Create screen's rail, 320 pixels wide, with the clips stacked
 * under the form. A clip is the one thing in the studio that is watched rather than
 * looked at, so it has a stage of its own now: the clip that is selected plays large,
 * every clip of the session waits in the reel under it, and a clip's last frame can
 * start the next one, which is how a five-second model makes anything longer.
 *
 * A clip takes minutes, so the run is not the element's: it lives in `session` below,
 * and goes on while the studio is on another mode or another screen. What comes back
 * is a preview like a picture's, and on Automatic1111 it is kept in the gallery beside
 * the pictures, reaching the library only once moved there.
 *
 * The files are picked here, as a checkpoint and LoRAs are in the Image studio:
 * Settings' are where each direction starts, and a clip sends the studio's whole
 * recipe. A finished clip can be enlarged through ComfyUI, which comes back as a take
 * of its own beside it.
 */

/** A picture a clip starts from, as Animate hands it over. */
export interface ClipPicture {
  url: string;
  name: string;
  width: number;
  height: number;
  /** Its name in the studio's gallery, which the server reads rather than being sent. */
  gallery?: string;
  /** Made in this page (a grabbed frame, a file): released when it is let go. */
  objectURL?: boolean;
}

interface ClipRun {
  jobId: string;
  from: "image" | "text";
  prompt: string;
  /** The still it started from, shown while it runs and in the reel. */
  thumb?: string;
  /** Frames a second it was asked for, so its last frame can be found again. */
  fps: number;
  percent: number;
  done: boolean;
  startedAt: number;
  endedAt?: number;
  error?: string;
  /** `recipe` is the steps, CFG and shift a built clip ran at. A clip opened from the
      gallery has no preview id, and plays from the gallery. */
  clip?: GenClip;
  /** The take it is an enlargement of, by its number in the reel. */
  upscaleOf?: number;
  /** The library row once saved. */
  savedId?: number;
  saving?: boolean;
}

/** Where a clip plays from: its preview, or the gallery when it has none. */
function clipURL(clip: GenClip): string {
  return clip.id ? api.genPreviewURL(clip.id) : api.galleryFullURL(clip.gallery ?? "");
}

function newJobId(): string {
  return `clip-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** What the studio was left at, and its runs: kept for the page, not the element. */
const session = {
  from: "image" as "image" | "text",
  picture: null as ClipPicture | null,
  prompt: "",
  negative: "",
  aspect: "portrait" as ClipAspect,
  long: 832,
  seconds: 5,
  fps: 16,
  steps: 20,
  /** How many clips one press makes, each from its own seed. */
  variations: 1,
  /** Reuse the selected clip's seed, to see what a changed prompt does to the same take. */
  keepSeed: false,
  /** Each direction's files once the studio has changed them from Settings'. */
  recipes: {} as Partial<Record<"image" | "text", StudioClipRecipe>>,
  loraQuery: "",
  /** How a clip is enlarged: an upscale model ComfyUI has ("" is Lanczos), and by how much. */
  upscaler: "",
  upscaleBy: 2,
  runs: [] as ClipRun[],
  /** The run on the stage. */
  selected: "" as string,
  loop: true,
  speed: 1,
};

const listeners = new Set<() => void>();
function changed() {
  for (const fn of listeners) fn();
}

/** Calls fn whenever the clips change; returns the unsubscribe. */
export function onClipsChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** How many clips are being made, for the mode switch's badge. */
export function clipsRunning(): number {
  return session.runs.filter((r) => !r.done).length;
}

const keptListeners = new Set<() => void>();

/** Calls fn when a finished clip has been kept in the gallery, so the gallery beside
    the studio can show it — whichever mode is open by then. */
export function onClipKept(fn: () => void): () => void {
  keptListeners.add(fn);
  return () => keptListeners.delete(fn);
}

/** A clip from the gallery, put on the stage as a take: to watch, carry on from,
    enlarge or move to the library. */
export interface GalleryClip {
  gallery: string;
  name: string;
  width?: number;
  height?: number;
}

export function openGalleryClip(c: GalleryClip, upscale = false) {
  let run = session.runs.find((r) => r.clip?.gallery === c.gallery);
  if (!run) {
    run = {
      jobId: newJobId(), from: "image", prompt: c.name, fps: ASSUMED_FPS, percent: 1, done: true, startedAt: Date.now(), endedAt: Date.now(),
      thumb: api.galleryThumbURL(c.gallery), clip: { id: "", mime: "video/mp4", seed: 0, gallery: c.gallery, width: c.width, height: c.height },
    };
    session.runs = [run, ...session.runs];
  }
  session.selected = run.jobId;
  pendingUpscale = upscale;
  changed();
}

/** The upscale panel opens on the next render, for a clip opened to be enlarged. */
let pendingUpscale = false;

/** Makes a picture the one the next clip starts from. */
export function animatePicture(pic: ClipPicture) {
  const old = session.picture;
  if (old?.objectURL && old.url !== pic.url && !session.runs.some((r) => r.thumb === old.url)) URL.revokeObjectURL(old.url);
  session.picture = pic;
  session.from = "image";
  changed();
}

/**
 * ComfyUI's models, LoRAs, samplers and upscalers, asked for once a page: it is a live
 * call to ComfyUI rather than something the studio's status carries, since the status
 * is read on every visit and ComfyUI may be another machine that is asleep. Until it
 * answers, a clip runs on Settings' files.
 */
const comfy = {
  lists: null as ComfyModels | null,
  loras: null as ClipLoraChoice[] | null,
  models: [] as ClipModelChoice[],
  loading: false,
  error: "",
};

async function loadComfyLists() {
  if (comfy.loading) return;
  comfy.loading = true;
  comfy.error = "";
  changed();
  try {
    const lists = await api.comfyModels();
    comfy.lists = lists;
    comfy.loras = clipLoraChoices(lists.loras);
    comfy.models = clipModelChoices(lists);
  } catch (e) {
    comfy.error = (e as Error).message;
  } finally {
    comfy.loading = false;
    changed();
  }
}

/** How many choices the list shows before the search has to narrow it. */
const LORA_LIST = 40;

/** When the workflow takes no frame rate, so the length still has one to count in. */
const ASSUMED_FPS = 16;

const SPEEDS = [0.5, 1, 2] as const;

/** How many times larger a clip can be made. Past 4× of Wan's 720p is past 4K, with
    every frame of it held in ComfyUI's memory at once. */
const UPSCALES = [1.5, 2, 3, 4] as const;

function elapsed(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

@customElement("oppai-video-studio")
export class OppaiVideoStudio extends LitElement {
  /** The workflows set up, from the studio's status. */
  @property({ attribute: false }) clips: { image?: ClipWorkflow; text?: ClipWorkflow } = {};
  /** The gallery folder open beside the studio, which a clip is filed in. */
  @property() board = "";
  @state() private negOpen = false;
  @state() private upscaleOpen = false;
  @state() private error = "";
  @state() private dropping = false;
  @state() private playing = true;
  @state() private time = 0;
  @state() private duration = 0;
  @state() private grabbing = false;
  private unsubscribe?: () => void;
  private ticker = 0;

  static styles = [
    iconStyles,
    motionStyles,
    css`
      :host {
        display: grid;
        grid-template-columns: 340px minmax(0, 1fr);
        height: 100%;
        min-height: 0;
        color: var(--oppai-text);
      }
      button, textarea, select, input { font: inherit; }
      .material-symbols-rounded { font-size: 18px; }

      /* ── inspector ── */
      .inspector {
        min-height: 0; display: flex; flex-direction: column;
        background: var(--oppai-surface); border-right: 1px solid var(--oppai-border-strong);
      }
      .ins-scroll { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; padding: 14px 16px 18px; }
      .ins-foot { flex: none; padding: 12px 16px 14px; border-top: 1px solid var(--oppai-border); background: var(--oppai-surface); }
      .k {
        display: flex; align-items: center; gap: 8px; margin: 20px 0 8px; font-size: 11px; font-weight: 700;
        letter-spacing: 0.7px; text-transform: uppercase; color: var(--oppai-text-muted);
      }
      .k:first-child { margin-top: 2px; }
      .k small { margin-left: auto; font-weight: 500; letter-spacing: 0; text-transform: none; font-variant-numeric: tabular-nums; }
      .note { font-size: 12px; line-height: 1.5; color: var(--oppai-text-muted); }
      .err { margin-top: 8px; font-size: 12px; line-height: 1.45; color: var(--oppai-error, #f2b8b5); }

      .modes { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 4px; border-radius: 14px; background: var(--oppai-bg); }
      .modes button {
        display: flex; align-items: center; justify-content: center; gap: 6px; height: 36px; border-radius: 10px; border: none;
        background: none; color: var(--oppai-text-dim); font-size: 12.5px; font-weight: 650; cursor: pointer;
      }
      .modes button.on { background: var(--oppai-surface-2); color: var(--oppai-text); box-shadow: 0 1px 0 var(--oppai-border-strong) inset, 0 2px 8px rgba(0,0,0,.25); }
      .modes button:disabled { opacity: 0.4; cursor: default; }

      /* The start frame is a drop target: a file from the desktop or a tile from the
         gallery beside it. */
      .frame {
        position: relative; display: grid; place-items: center; min-height: 168px; border-radius: 16px; overflow: hidden;
        border: 1.5px dashed var(--oppai-border-strong); background: var(--oppai-bg); text-align: center;
        transition: border-color 0.15s ease, background 0.15s ease;
      }
      .frame.drop { border-color: var(--oppai-primary); background: color-mix(in srgb, var(--oppai-primary) 12%, var(--oppai-bg)); }
      .frame.has { border-style: solid; border-color: var(--oppai-border); min-height: 0; }
      .frame img { display: block; width: 100%; max-height: 260px; object-fit: contain; background: #000; }
      .frame-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 22px 16px; color: var(--oppai-text-muted); font-size: 12px; line-height: 1.5; }
      .frame-empty .material-symbols-rounded { font-size: 32px; opacity: 0.75; }
      .frame-bar {
        position: absolute; left: 8px; right: 8px; bottom: 8px; display: flex; align-items: center; gap: 6px; padding: 6px 6px 6px 10px;
        border-radius: 12px; background: rgba(0,0,0,.62); backdrop-filter: blur(8px); color: #fff; font-size: 11.5px; text-align: left;
      }
      .frame-bar .nm { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .frame-bar .nm small { opacity: 0.7; margin-left: 6px; font-variant-numeric: tabular-nums; }
      .frame-bar button { width: 28px; height: 28px; border-radius: 9px; border: none; background: rgba(255,255,255,.12); color: #fff; cursor: pointer; display: grid; place-items: center; }
      .frame-bar button:hover { background: rgba(255,255,255,.24); }
      input[type="file"] { display: none; }

      .chip {
        display: inline-flex; align-items: center; gap: 5px; height: 30px; padding: 0 11px; border-radius: 15px; flex: none;
        border: 1px solid var(--oppai-border-strong); background: transparent; color: var(--oppai-text-dim); font-size: 12px; cursor: pointer;
        transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
      }
      .chip:hover { border-color: var(--oppai-text-muted); color: var(--oppai-text); }
      .chip.on { background: var(--oppai-primary-container); border-color: transparent; color: var(--oppai-on-primary-container, var(--oppai-text)); }
      .chip .material-symbols-rounded { font-size: 16px; }
      .chip.primary { background: var(--oppai-primary); color: var(--oppai-on-primary); border-color: transparent; font-weight: 650; }
      .chip:disabled { opacity: 0.5; cursor: default; }
      .row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
      .presets { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
      .presets .row { gap: 5px; }
      .preset-group { font-size: 10.5px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: var(--oppai-text-muted); width: 52px; flex: none; }
      .presets .chip { height: 26px; padding: 0 9px; font-size: 11.5px; }

      textarea {
        width: 100%; box-sizing: border-box; min-height: 92px; resize: vertical; padding: 10px 12px; border-radius: 12px;
        border: 1px solid var(--oppai-border-strong); background: var(--oppai-bg); color: var(--oppai-text); font-size: 13px; line-height: 1.5;
      }
      textarea:focus { outline: none; border-color: var(--oppai-primary); }
      .link { border: none; background: none; padding: 6px 0 0; color: var(--oppai-primary-bright, var(--oppai-primary)); font-size: 12px; cursor: pointer; }

      /* LoRAs, laid out as the Image studio's picker lays them: the ones on, with their
         weights, above the rest. ComfyUI keeps no pictures of its LoRAs, so the rest
         are a list of names rather than cards. */
      .k-btn { border: none; background: none; padding: 0; width: 22px; height: 22px; border-radius: 11px; color: var(--oppai-text-muted); cursor: pointer; display: grid; place-items: center; }
      .k-btn:hover { color: var(--oppai-text); background: var(--oppai-surface-2); }
      .k-btn .material-symbols-rounded { font-size: 16px; }
      .loras-on { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
      .lora-row {
        display: grid; grid-template-columns: 28px minmax(0, 1fr) auto; column-gap: 8px; row-gap: 2px; align-items: center;
        padding: 7px 6px 7px 8px; border-radius: 12px; background: var(--oppai-bg); border: 1px solid var(--oppai-border);
      }
      .lora-row.fixed { opacity: 0.75; }
      .lora-ic { grid-row: 1 / 3; width: 28px; height: 28px; border-radius: 9px; display: grid; place-items: center; font-size: 17px; background: var(--oppai-surface-2); color: var(--oppai-text-muted); }
      .lora-row.speed .lora-ic { color: var(--oppai-primary-bright, var(--oppai-primary)); }
      .lora-name { min-width: 0; font-size: 12.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .lora-tag { margin-left: 6px; font-size: 10.5px; font-weight: 600; color: var(--oppai-text-muted); }
      .lora-x { border: none; background: none; width: 26px; height: 26px; border-radius: 13px; color: var(--oppai-text-muted); cursor: pointer; display: grid; place-items: center; }
      .lora-x:hover { background: var(--oppai-surface-2); color: var(--oppai-text); }
      .lora-x .material-symbols-rounded { font-size: 17px; }
      .lora-weight { grid-column: 2 / 4; display: flex; align-items: center; gap: 8px; }
      .lora-weight input { flex: 1; min-width: 0; accent-color: var(--oppai-primary); }
      .lora-weight b { min-width: 34px; text-align: right; font-size: 11.5px; font-variant-numeric: tabular-nums; }
      .lora-search { position: relative; display: block; margin-bottom: 6px; }
      .lora-search input {
        width: 100%; box-sizing: border-box; height: 32px; padding: 0 10px 0 32px; border-radius: 16px;
        border: 1px solid var(--oppai-border-strong); background: var(--oppai-bg); color: var(--oppai-text); font-size: 12.5px; outline: none;
      }
      .lora-search input:focus { border-color: var(--oppai-primary); }
      .lora-search .material-symbols-rounded { position: absolute; left: 9px; top: 50%; transform: translateY(-50%); font-size: 18px; color: var(--oppai-text-muted); pointer-events: none; }
      .lora-list { display: flex; flex-direction: column; max-height: 232px; overflow-y: auto; scrollbar-width: thin; border-radius: 12px; border: 1px solid var(--oppai-border); }
      .lora-pick {
        display: flex; align-items: center; gap: 8px; min-height: 34px; padding: 4px 10px; border: none; border-bottom: 1px solid var(--oppai-border);
        background: none; color: var(--oppai-text-dim); font-size: 12.5px; text-align: left; cursor: pointer;
      }
      .lora-pick:last-child { border-bottom: none; }
      .lora-pick:hover { background: var(--oppai-surface-2); color: var(--oppai-text); }
      .lora-pick .material-symbols-rounded { font-size: 17px; flex: none; }
      .lora-pick .lora-name { flex: 1; font-weight: 500; }
      select {
        height: 30px; padding: 0 8px; border-radius: 15px; border: 1px solid var(--oppai-border-strong);
        background: var(--oppai-bg); color: var(--oppai-text); font-size: 12px;
      }
      /* The model, as the Image studio's checkpoint: one picker, the files beside it
         folded away, since they follow from the model nearly always. */
      .model-pick { width: 100%; height: 38px; border-radius: 12px; padding: 0 10px; font-size: 12.5px; }
      .model-note { display: flex; align-items: center; gap: 6px; margin-top: 6px; font-size: 11.5px; color: var(--oppai-text-muted); }
      .model-note .material-symbols-rounded { font-size: 15px; }
      .model-note.speed { color: var(--oppai-primary-bright, var(--oppai-primary)); }
      details.files { margin-top: 8px; border-radius: 12px; border: 1px solid var(--oppai-border); background: var(--oppai-bg); }
      details.files summary {
        display: flex; align-items: center; gap: 6px; min-height: 32px; padding: 0 10px; font-size: 12px; color: var(--oppai-text-dim);
        cursor: pointer; list-style: none;
      }
      details.files summary::-webkit-details-marker { display: none; }
      details.files summary .nm { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--oppai-text-muted); }
      details.files[open] summary .chev { transform: rotate(180deg); }
      .files-grid { display: grid; grid-template-columns: 84px minmax(0, 1fr); gap: 6px 8px; align-items: center; padding: 4px 10px 10px; font-size: 11.5px; color: var(--oppai-text-muted); }
      .files-grid select, .sampling select { width: 100%; min-width: 0; }
      .sampling { display: grid; grid-template-columns: 52px minmax(0, 1fr) 54px; gap: 6px 8px; align-items: center; font-size: 12px; color: var(--oppai-text-dim); }
      .sampling input[type="range"] { width: 100%; accent-color: var(--oppai-primary); }
      .sampling b { text-align: right; font-size: 12px; font-variant-numeric: tabular-nums; }
      .sampling b.auto { color: var(--oppai-text-muted); font-weight: 500; }
      .sampling .two { grid-column: 2 / 4; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
      .warn { margin-top: 8px; padding: 8px 10px; border-radius: 10px; font-size: 12px; line-height: 1.45;
        background: color-mix(in srgb, var(--oppai-error, #f2b8b5) 14%, transparent); color: var(--oppai-text); }
      .warn .link { padding: 4px 0 0; display: block; }
      .k-btns { margin-left: auto; display: flex; align-items: center; gap: 2px; }
      .k-btns .link { padding: 0 6px; font-size: 11px; font-weight: 600; letter-spacing: 0; text-transform: none; }
      .k-btns + small { margin-left: 6px; }

      /* Enlarging the clip on the stage: a bar over the transport. */
      .upscale {
        flex: none; display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; padding: 10px 16px;
        border-top: 1px solid var(--oppai-border); background: color-mix(in srgb, var(--oppai-primary) 7%, var(--oppai-surface));
        animation: oppai-fade-in 0.16s ease both;
      }
      .upscale .lbl { font-size: 12px; font-weight: 650; color: var(--oppai-text-dim); display: flex; align-items: center; gap: 6px; }
      .upscale select { flex: 0 1 200px; min-width: 120px; }
      .upscale .to { font-size: 11.5px; color: var(--oppai-text-muted); font-variant-numeric: tabular-nums; }

      .slider { display: flex; align-items: center; gap: 10px; }
      .slider input { flex: 1; accent-color: var(--oppai-primary); }
      .slider b { min-width: 44px; text-align: right; font-size: 12.5px; font-variant-numeric: tabular-nums; }
      .seg { display: inline-flex; border: 1px solid var(--oppai-border-strong); border-radius: 12px; overflow: hidden; }
      .seg button { min-width: 34px; height: 30px; border: none; background: none; color: var(--oppai-text-dim); font-size: 12px; font-weight: 650; cursor: pointer; padding: 0 8px; }
      .seg button + button { border-left: 1px solid var(--oppai-border); }
      .seg button.on { background: var(--oppai-primary-container); color: var(--oppai-on-primary-container, var(--oppai-text)); }
      .switch { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--oppai-text-dim); cursor: pointer; margin-top: 10px; }
      .switch input { accent-color: var(--oppai-primary); width: 16px; height: 16px; }
      .switch:has(input:disabled) { opacity: 0.5; cursor: default; }

      .make {
        width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; height: 48px; border-radius: 24px;
        border: none; color: var(--oppai-on-primary); font-size: 14.5px; font-weight: 700; cursor: pointer;
        background: linear-gradient(135deg, var(--oppai-primary), color-mix(in srgb, var(--oppai-primary) 62%, #c58af9));
        box-shadow: 0 8px 22px color-mix(in srgb, var(--oppai-primary) 30%, transparent);
        transition: transform 0.16s var(--oppai-ease-spring), filter 0.16s ease;
      }
      .make:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.06); }
      .make:disabled { opacity: 0.5; cursor: default; box-shadow: none; }
      .make .material-symbols-rounded { font-size: 20px; }
      .make-sub { margin-top: 7px; text-align: center; font-size: 11.5px; color: var(--oppai-text-muted); font-variant-numeric: tabular-nums; }

      /* ── stage ── */
      .main { min-width: 0; min-height: 0; display: flex; flex-direction: column; background: color-mix(in srgb, var(--oppai-bg) 86%, #000); }
      /* Sized as a container so the clip fits whatever room the transport and the
         reel leave it, rather than guessing from the window's height. */
      .stage { position: relative; flex: 1; min-height: 0; display: grid; place-items: center; padding: 18px; overflow: hidden; container-type: size; }
      .player { position: relative; max-width: 100%; max-height: 100%; display: grid; place-items: center; }
      .player video, .player img.still {
        display: block; max-width: 100cqw; max-height: 100cqh; min-height: 160px; border-radius: 14px; background: #000;
        box-shadow: 0 20px 60px rgba(0,0,0,.5); cursor: pointer;
      }
      .waiting {
        position: relative; height: min(100cqh, 640px); max-width: 100cqw; aspect-ratio: 4 / 5; border-radius: 18px; overflow: hidden;
        display: grid; place-items: center; background: var(--oppai-surface); box-shadow: 0 20px 60px rgba(0,0,0,.45);
      }
      .waiting img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: blur(14px) brightness(0.55); transform: scale(1.1); }
      .waiting .ring { position: relative; display: grid; place-items: center; width: 132px; height: 132px; }
      .waiting svg { position: absolute; inset: 0; transform: rotate(-90deg); }
      .waiting circle { fill: none; stroke-width: 6; }
      .waiting .track { stroke: rgba(255,255,255,.14); }
      .waiting .fill { stroke: var(--oppai-primary); stroke-linecap: round; transition: stroke-dashoffset 0.6s ease; }
      .waiting .pct { position: relative; display: flex; flex-direction: column; align-items: center; color: #fff; font-size: 11.5px; gap: 2px; }
      .waiting .pct b { font-size: 28px; font-variant-numeric: tabular-nums; }
      .waiting .what { position: absolute; left: 18px; right: 18px; bottom: 18px; color: rgba(255,255,255,.85); font-size: 12.5px; text-align: center; line-height: 1.45;
        display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      .failed { max-width: 420px; display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; color: var(--oppai-text-dim); font-size: 13px; line-height: 1.5; }
      .failed .material-symbols-rounded { font-size: 36px; color: var(--oppai-error, #f2b8b5); }

      .hero { max-width: 460px; display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center; color: var(--oppai-text-muted); font-size: 13px; line-height: 1.55; }
      .hero strong { color: var(--oppai-text); font-size: 17px; }
      .hero .glyph {
        width: 76px; height: 76px; border-radius: 24px; display: grid; place-items: center;
        background: color-mix(in srgb, var(--oppai-primary) 16%, var(--oppai-surface)); color: var(--oppai-primary-bright, var(--oppai-primary));
      }
      .hero .glyph .material-symbols-rounded { font-size: 38px; }
      /* A picture waiting to be animated breathes slowly, as a promise of the motion. */
      .hero-frame { width: min(300px, 70vw); border-radius: 18px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,.45); }
      .hero-frame img { display: block; width: 100%; animation: vs-breathe 7s ease-in-out infinite alternate; }
      @keyframes vs-breathe { from { transform: scale(1); } to { transform: scale(1.07) translateY(-1.5%); } }
      @media (prefers-reduced-motion: reduce) { .hero-frame img { animation: none; } }
      .steps { display: grid; gap: 8px; text-align: left; width: 100%; margin-top: 4px; }
      .steps div { display: flex; gap: 10px; align-items: flex-start; padding: 10px 12px; border-radius: 12px; background: var(--oppai-surface); border: 1px solid var(--oppai-border); }
      .steps b { flex: none; width: 22px; height: 22px; border-radius: 11px; display: grid; place-items: center; font-size: 11px; background: var(--oppai-primary-container); color: var(--oppai-text); }

      /* ── transport ── */
      .transport {
        flex: none; display: flex; align-items: center; flex-wrap: wrap; gap: 8px 10px; padding: 10px 16px;
        border-top: 1px solid var(--oppai-border); background: var(--oppai-surface);
      }
      .icon-btn {
        width: 34px; height: 34px; border-radius: 17px; border: none; background: none; color: var(--oppai-text-dim);
        cursor: pointer; display: grid; place-items: center; flex: none;
      }
      .icon-btn:hover:not(:disabled) { background: var(--oppai-surface-2); color: var(--oppai-text); }
      .icon-btn.on { color: var(--oppai-primary-bright, var(--oppai-primary)); background: color-mix(in srgb, var(--oppai-primary) 14%, transparent); }
      .icon-btn:disabled { opacity: 0.4; cursor: default; }
      .scrub { flex: 1 1 180px; min-width: 120px; display: flex; align-items: center; gap: 8px; font-size: 11.5px; color: var(--oppai-text-muted); font-variant-numeric: tabular-nums; }
      .scrub input { flex: 1; accent-color: var(--oppai-primary); }
      .t-sep { width: 1px; height: 22px; background: var(--oppai-border-strong); flex: none; }
      .t-meta { font-size: 11.5px; color: var(--oppai-text-muted); font-variant-numeric: tabular-nums; white-space: nowrap; }
      a.chip { text-decoration: none; }

      /* ── reel ── */
      .reel {
        flex: none; display: flex; gap: 10px; padding: 10px 16px 14px; overflow-x: auto; scrollbar-width: thin;
        border-top: 1px solid var(--oppai-border); background: var(--oppai-surface);
      }
      .reel-label { flex: none; writing-mode: vertical-rl; transform: rotate(180deg); align-self: center; font-size: 10px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: var(--oppai-text-muted); }
      .take {
        position: relative; flex: none; width: 96px; height: 120px; border-radius: 12px; overflow: hidden; padding: 0; cursor: pointer;
        border: 2px solid transparent; background: var(--oppai-bg); color: #fff;
        animation: oppai-scale-in 0.22s var(--oppai-ease-emphasized) both;
      }
      .take.on { border-color: var(--oppai-primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--oppai-primary) 22%, transparent); }
      .take video, .take img { width: 100%; height: 100%; object-fit: cover; display: block; pointer-events: none; }
      .take.running img { filter: blur(3px) brightness(0.55); }
      .take .badge {
        position: absolute; left: 6px; bottom: 6px; display: inline-flex; align-items: center; gap: 3px; padding: 2px 6px; border-radius: 8px;
        background: rgba(0,0,0,.6); font-size: 10.5px; font-weight: 650; font-variant-numeric: tabular-nums;
      }
      .take .badge .material-symbols-rounded { font-size: 13px; }
      .take .badge.saved { background: color-mix(in srgb, #2e7d4f 85%, transparent); }
      .take .badge.err { background: color-mix(in srgb, #b3261e 85%, transparent); }
      .take .mini-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: rgba(255,255,255,.15); }
      .take .mini-bar span { display: block; height: 100%; background: var(--oppai-primary); transition: width 0.6s ease; }
      .take-n { position: absolute; top: 5px; left: 7px; font-size: 10.5px; font-weight: 700; text-shadow: 0 1px 3px rgba(0,0,0,.7); }

      @media (max-width: 900px) {
        :host { display: flex; flex-direction: column; height: auto; }
        .main { order: -1; }
        /* flex: 1 is a basis of 0%, which wins over a height in a column of auto height. */
        .stage { flex: none; height: 56vh; padding: 12px; }
        .inspector { border-right: 0; border-top: 1px solid var(--oppai-border-strong); }
        .ins-scroll { overflow: visible; }
        .ins-foot { position: sticky; bottom: 0; z-index: 4; padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px)); box-shadow: 0 -10px 30px rgba(0,0,0,.3); }
        .transport { padding: 8px 10px; }
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this.unsubscribe = onClipsChange(() => this.requestUpdate());
    // A studio that opens on a mode with no workflow behind it opens on the other one.
    if (session.from === "image" && !this.clips.image && this.clips.text) session.from = "text";
    if (!comfy.lists && (this.clips.image || this.clips.text)) void loadComfyLists();
    // Running clips show how long they have taken; a second's tick is enough for that.
    this.ticker = window.setInterval(() => { if (clipsRunning()) this.requestUpdate(); }, 1000);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.unsubscribe?.();
    window.clearInterval(this.ticker);
  }

  protected updated() {
    if (pendingUpscale) {
      pendingUpscale = false;
      this.upscaleOpen = true;
    }
  }

  private get workflow(): ClipWorkflow | undefined {
    return session.from === "image" ? this.clips.image : this.clips.text;
  }

  /** The files this direction's next clip runs: the studio's once changed, Settings'
      until then — null while ComfyUI's lists are not in, when Settings' run as they are. */
  private recipe(): StudioClipRecipe | null {
    const own = session.recipes[session.from];
    if (own) return own;
    return comfy.loras ? studioClipRecipe(this.workflow?.models, comfy.loras) : null;
  }

  /** Whether the next clip is built from picked files rather than a pasted workflow. */
  private get built(): boolean {
    return !!this.recipe()?.models.model;
  }

  private takes(name: string): boolean {
    const w = this.workflow;
    return !!(this.built ? w?.built ?? w?.takes : w?.takes)?.includes(name);
  }

  /** Changes this direction's recipe. A change that brings a speed file in, or takes
      the last one out, settles the steps and CFG with it, as Settings does. */
  private edit(fn: (r: StudioClipRecipe) => StudioClipRecipe) {
    const r = this.recipe();
    if (!r || !comfy.loras) return;
    const next = fn(r);
    const settled = settleSpeed(studioClipModels(r, comfy.loras), studioClipModels(next, comfy.loras));
    session.recipes = { ...session.recipes, [session.from]: { ...next, models: { ...next.models, steps: settled.steps, cfg: settled.cfg } } };
    changed();
  }

  private editModels(patch: Partial<ClipModels>) {
    this.edit((r) => ({ ...r, models: { ...r.models, ...patch } }));
  }

  private pickModel(value: string) {
    if (!value) {
      // Back to Settings' pasted workflow, which has no files to pick.
      this.edit((r) => ({ ...r, models: { ...r.models, model: "", lowModel: "", checkpoint: false } }));
      return;
    }
    const choice = comfy.models.find((c) => `${c.kind}:${c.key}` === value);
    if (!choice || !comfy.lists || !comfy.loras) return;
    const loras = comfy.loras;
    const lists = comfy.lists;
    this.edit((r) => ({ ...r, models: { ...withClipModel(studioClipModels(r, loras), choice, lists), loras: [] } }));
  }

  /** Back to Settings' files for this direction. */
  private resetRecipe() {
    const next = { ...session.recipes };
    delete next[session.from];
    session.recipes = next;
    changed();
  }

  private set<K extends keyof typeof session>(key: K, value: (typeof session)[K]) {
    session[key] = value;
    changed();
  }

  private get selectedRun(): ClipRun | undefined {
    return session.runs.find((r) => r.jobId === session.selected) ?? session.runs[0];
  }

  /** The size the clip is drawn at: the picture's shape, or the shape picked. */
  private size(): { width: number; height: number } {
    const pic = session.picture;
    if (session.from === "image" && pic) return clipSize(pic.width, pic.height, session.long);
    const a = CLIP_ASPECTS.find((x) => x.id === session.aspect) ?? CLIP_ASPECTS[0];
    return clipSize(a.w, a.h, session.long);
  }

  private fps(): number {
    return this.takes("fps") ? session.fps : ASSUMED_FPS;
  }

  private pickFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      this.error = "That file isn't a picture.";
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => animatePicture({ url, name: file.name, width: img.naturalWidth, height: img.naturalHeight, objectURL: true });
    img.onerror = () => { URL.revokeObjectURL(url); this.error = "That file isn't a picture this browser can read."; };
    img.src = url;
  }

  // ── dropping a start frame ──────────────────────────────────────────────────

  private onDragOver(e: DragEvent) {
    const types = e.dataTransfer?.types ?? [];
    if (!types.includes("Files") && !types.includes(GALLERY_DRAG_TYPE)) return;
    e.preventDefault();
    // The gallery offers its tiles as a move (onto folders); a copy would be refused.
    if (e.dataTransfer) e.dataTransfer.dropEffect = types.includes(GALLERY_DRAG_TYPE) ? "move" : "copy";
    this.dropping = true;
  }

  private onDrop(e: DragEvent) {
    e.preventDefault();
    this.dropping = false;
    const gallery = e.dataTransfer?.getData(GALLERY_DRAG_TYPE);
    if (gallery) {
      try {
        const name = (JSON.parse(gallery) as string[])[0];
        if (name) void this.useGalleryPicture(name);
      } catch {
        // Not ours after all.
      }
      return;
    }
    this.pickFile(e.dataTransfer?.files?.[0]);
  }

  private async useGalleryPicture(name: string) {
    const url = api.galleryFullURL(name);
    const img = new Image();
    img.onload = () => animatePicture({ url, name, width: img.naturalWidth, height: img.naturalHeight, gallery: name });
    img.onerror = () => (this.error = "Couldn't read that picture from the gallery.");
    img.src = url;
  }

  // ── making ──────────────────────────────────────────────────────────────────

  private async make() {
    this.error = "";
    const from = session.from;
    const pic = session.picture;
    if (from === "image" && !pic) {
      this.error = "Pick a picture to animate first — drop one here, or press Animate on one in the gallery.";
      return;
    }
    if (from === "text" && !session.prompt.trim()) {
      this.error = "Say what the clip should show.";
      return;
    }
    const recipe = this.recipe();
    if (this.workflow?.needsModel && !recipe?.models.model) {
      this.error = comfy.error
        ? `ComfyUI didn't list its models, so there is nothing to pick from: ${comfy.error}`
        : "Pick a model under Model first.";
      return;
    }
    let initImage: string | undefined;
    try {
      if (from === "image" && pic && !pic.gallery) initImage = await pictureDataURL(pic.url);
    } catch (e) {
      this.error = (e as Error).message;
      return;
    }
    const kept = session.keepSeed ? this.selectedRun?.clip?.seed : undefined;
    const made: ClipRun[] = [];
    for (let i = 0; i < Math.max(1, session.variations); i++) {
      const params: ClipParams = {
        jobId: newJobId(),
        from,
        prompt: session.prompt.trim(),
        negativePrompt: session.negative.trim(),
        board: this.board,
        detach: true,
      };
      if (this.takes("width") || this.takes("height")) Object.assign(params, this.size());
      if (this.takes("frames")) params.frames = clipFrames(session.seconds, this.fps());
      if (this.takes("fps")) params.fps = session.fps;
      if (this.takes("steps")) params.steps = session.steps;
      if (recipe?.models.model && comfy.loras) params.models = studioClipModels(recipe, comfy.loras);
      // Variations of a kept seed walk along from it, so they are still variations.
      if (kept) params.seed = kept + i;
      if (from === "image" && pic) {
        if (pic.gallery) params.initGallery = pic.gallery;
        else params.initImage = initImage;
      }
      const run: ClipRun = {
        jobId: params.jobId!, from, prompt: params.prompt, thumb: from === "image" ? pic?.url : undefined,
        fps: this.fps(), percent: 0, done: false, startedAt: Date.now(),
      };
      made.push(run);
      void runClip(run, () => api.makeClip(params));
    }
    session.runs = [...made.reverse(), ...session.runs];
    session.selected = session.runs[0].jobId;
    changed();
  }

  /** Enlarges a finished clip: a new take beside it, so the two can be compared. */
  private upscale(run: ClipRun) {
    if (!run.clip) return;
    const params: ClipUpscaleParams = { jobId: newJobId(), upscaler: session.upscaler, scale: session.upscaleBy, board: this.board, detach: true };
    if (run.clip.gallery) params.gallery = run.clip.gallery;
    else params.id = run.clip.id;
    const up: ClipRun = {
      jobId: params.jobId!, from: run.from, prompt: run.prompt, thumb: run.thumb, fps: run.fps,
      percent: 0, done: false, startedAt: Date.now(), upscaleOf: session.runs.length - session.runs.indexOf(run),
    };
    session.runs = [up, ...session.runs];
    session.selected = up.jobId;
    this.upscaleOpen = false;
    changed();
    void runClip(up, () => api.upscaleClip(params));
  }

  private async save(run: ClipRun) {
    if (!run.clip || run.saving || run.savedId) return;
    run.saving = true;
    changed();
    try {
      const title = run.prompt ? `Clip: ${run.prompt.slice(0, 80)}` : "Generated clip";
      run.savedId = run.clip.id
        ? (await api.saveGenerated({ id: run.clip.id, title, tags: ["clip"] })).id
        // Opened from the gallery: moved from there, as the gallery's own button does.
        : (await api.saveGalleryImage({ name: run.clip.gallery ?? "", tags: ["clip"] })).id;
    } catch (e) {
      run.error = (e as Error).message;
    } finally {
      run.saving = false;
      changed();
    }
  }

  private dismiss(run: ClipRun) {
    // An unsaved clip is a few megabytes of the server's memory; let it go now.
    // Its gallery copy stays where it is.
    if (run.clip?.id && !run.savedId) void api.deleteGenPreview(run.clip.id).catch(() => {});
    const at = session.runs.indexOf(run);
    session.runs = session.runs.filter((r) => r !== run);
    if (session.selected === run.jobId) session.selected = session.runs[Math.min(at, session.runs.length - 1)]?.jobId ?? "";
    changed();
  }

  // ── frames out of a clip ────────────────────────────────────────────────────
  //
  // A frame is drawn off the playing <video> into a canvas. The preview is served from
  // this origin, so the canvas is not tainted and can be read back as a PNG.

  private get video(): HTMLVideoElement | null {
    return this.renderRoot.querySelector<HTMLVideoElement>(".player video");
  }

  private async grabFrame(where: "current" | "last", run: ClipRun): Promise<ClipPicture | null> {
    const v = this.video;
    if (!v || !v.videoWidth) return null;
    this.grabbing = true;
    try {
      v.pause();
      this.playing = false;
      if (where === "last") {
        const t = lastFrameTime(v.duration, run.fps);
        if (Math.abs(v.currentTime - t) > 0.01) {
          await new Promise<void>((resolve) => {
            v.addEventListener("seeked", () => resolve(), { once: true });
            v.currentTime = t;
          });
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = v.videoWidth;
      canvas.height = v.videoHeight;
      canvas.getContext("2d")!.drawImage(v, 0, 0);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) return null;
      const n = session.runs.length - session.runs.indexOf(run);
      return {
        url: URL.createObjectURL(blob), objectURL: true, width: canvas.width, height: canvas.height,
        name: `clip ${n} · ${where === "last" ? "last frame" : `${v.currentTime.toFixed(1)}s`}`,
      };
    } catch (e) {
      this.error = `Couldn't take that frame: ${(e as Error).message}`;
      return null;
    } finally {
      this.grabbing = false;
    }
  }

  /** The clip carries on: its last frame starts the next one, prompt kept. */
  private async continueFrom(run: ClipRun) {
    const pic = await this.grabFrame("last", run);
    if (!pic) return;
    animatePicture(pic);
    this.renderRoot.querySelector<HTMLTextAreaElement>(".motion")?.focus();
  }

  /** The frame on screen, handed to the Image studio to start a picture from. */
  private async frameToImage(run: ClipRun) {
    const pic = await this.grabFrame("current", run);
    if (!pic) return;
    this.dispatchEvent(new CustomEvent<ClipPicture>("use-frame", { detail: pic, bubbles: true, composed: true }));
  }

  private togglePlay() {
    const v = this.video;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
    this.playing = !v.paused;
  }

  // ── render ──────────────────────────────────────────────────────────────────

  render() {
    const { image, text } = this.clips;
    if (!image && !text) return this.renderSetup();
    return html`${this.renderInspector()}
      <section class="main">
        <div class="stage">${this.renderStage()}</div>
        ${this.renderTransport()}
        ${session.runs.length ? this.renderReel() : nothing}
      </section>`;
  }

  private renderSetup() {
    return html`<div class="main" style="grid-column:1 / -1">
      <div class="stage"><div class="hero">
        <span class="glyph"><span class="material-symbols-rounded">movie</span></span>
        <strong>Video needs ComfyUI</strong>
        <span>Neither Automatic1111 nor InvokeAI makes video, so clips are made by a ComfyUI running Wan.</span>
        <div class="steps">
          <div><b>1</b><span>Open <b>Settings → Image generation → Video</b> and give ComfyUI's address.</span></div>
          <div><b>2</b><span>Pick the Wan model, text encoder and VAE it has — or paste a workflow of your own.</span></div>
          <div><b>3</b><span>Press <b>Test ComfyUI</b>, then come back here.</span></div>
        </div>
        <div class="row" style="justify-content:center">
          <button class="chip primary" @click=${() => this.dispatchEvent(new CustomEvent("open-settings", { bubbles: true, composed: true }))}>
            <span class="material-symbols-rounded">settings</span>Open Settings</button>
          <button class="chip" @click=${() => this.dispatchEvent(new CustomEvent("find-video-models", { bubbles: true, composed: true }))}>
            <span class="material-symbols-rounded">travel_explore</span>Find Wan models on Civitai</button>
        </div>
      </div></div>
    </div>`;
  }

  private renderInspector() {
    const { image, text } = this.clips;
    const from = session.from;
    const size = this.size();
    const frames = clipFrames(session.seconds, this.fps());
    const running = clipsRunning();
    const keptSeed = this.selectedRun?.clip?.seed;
    return html`<aside class="inspector">
      <div class="ins-scroll">
        <div class="modes" role="tablist" aria-label="What the clip starts from">
          <button role="tab" class=${from === "image" ? "on" : ""} aria-selected=${from === "image" ? "true" : "false"} ?disabled=${!image}
            title=${image ? "Bring a picture to life" : "No picture-to-video workflow is set up"} @click=${() => this.set("from", "image")}>
            <span class="material-symbols-rounded">animation</span>From a picture</button>
          <button role="tab" class=${from === "text" ? "on" : ""} aria-selected=${from === "text" ? "true" : "false"} ?disabled=${!text}
            title=${text ? "Make a clip from words alone" : "No words-to-video workflow is set up"} @click=${() => this.set("from", "text")}>
            <span class="material-symbols-rounded">text_fields</span>From words</button>
        </div>

        ${from === "image" ? this.renderFrame() : nothing}

        ${this.takes("prompt") ? html`
          <div class="k">${from === "image" ? "What happens" : "What it shows"}</div>
          <textarea class="motion" .value=${session.prompt}
            @input=${(e: Event) => this.set("prompt", (e.target as HTMLTextAreaElement).value)}
            @keydown=${(e: KeyboardEvent) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void this.make(); } }}
            placeholder=${from === "image"
              ? "She turns to the camera, smiles and waves; her hair moves in the breeze"
              : "A woman with silver hair in a red dress turns to the camera and waves, soft evening light"}></textarea>
          <div class="presets">
            ${(["camera", "her", "scene"] as const).map((group) => html`<div class="row">
              <span class="preset-group">${group === "her" ? "Her" : group === "camera" ? "Camera" : "Scene"}</span>
              ${MOTION_PRESETS.filter((p) => p.group === group).map((p) => html`<button class="chip ${hasPhrase(session.prompt, p.phrase) ? "on" : ""}"
                title=${p.phrase} @click=${() => this.set("prompt", togglePhrase(session.prompt, p.phrase))}>${p.label}</button>`)}
            </div>`)}
          </div>
          ${this.takes("negative") ? (this.negOpen || session.negative ? html`
            <div class="k">What it should avoid</div>
            <textarea style="min-height:56px" .value=${session.negative} placeholder="blurry, distorted hands, flicker, static"
              @input=${(e: Event) => this.set("negative", (e.target as HTMLTextAreaElement).value)}></textarea>`
            : html`<button class="link" @click=${() => (this.negOpen = true)}>+ What it should avoid</button>`) : nothing}
        ` : nothing}

        ${this.renderModel()}
        ${this.takes("loras") ? this.renderLoras() : nothing}

        ${this.takes("width") || this.takes("height") ? html`
          <div class="k">Shape<small>${size.width}×${size.height}</small></div>
          <div class="row">
            ${from === "text" ? CLIP_ASPECTS.map((a) => html`<button class="chip ${session.aspect === a.id ? "on" : ""}"
              @click=${() => this.set("aspect", a.id)}>${a.label}</button>`) : nothing}
            <select aria-label="Longer side" @change=${(e: Event) => this.set("long", Number((e.target as HTMLSelectElement).value))}>
              ${CLIP_SIDES.map((s) => html`<option value=${s} ?selected=${s === session.long}>${s}px long side</option>`)}
            </select>
          </div>
          ${from === "image" ? html`<div class="note" style="margin-top:6px">In the picture's shape. Bigger is slower, by a lot.</div>` : nothing}
        ` : nothing}

        ${this.takes("frames") ? html`
          <div class="k">Length<small>${frames} frames${this.takes("fps") ? "" : ` at ${ASSUMED_FPS} fps`}</small></div>
          <label class="slider">
            <input type="range" min="1" max="10" step="0.5" .value=${String(session.seconds)} aria-label="Length in seconds"
              @input=${(e: Event) => this.set("seconds", Number((e.target as HTMLInputElement).value))} />
            <b>${session.seconds}s</b>
          </label>
        ` : nothing}

        ${this.takes("fps") ? html`
          <div class="k">Frame rate</div>
          <div class="seg" role="group" aria-label="Frame rate">${[8, 12, 16, 24].map((f) => html`<button class=${session.fps === f ? "on" : ""}
            aria-pressed=${session.fps === f ? "true" : "false"} @click=${() => this.set("fps", f)}>${f}</button>`)}</div>
        ` : nothing}

        ${this.takes("steps") ? html`
          <div class="k">Steps</div>
          <label class="slider">
            <input type="range" min="2" max="50" step="1" .value=${String(session.steps)} aria-label="Steps"
              @input=${(e: Event) => this.set("steps", Number((e.target as HTMLInputElement).value))} />
            <b>${session.steps}</b>
          </label>
        ` : nothing}

        <div class="k">Takes</div>
        <div class="seg" role="group" aria-label="Clips per press">${[1, 2, 3].map((n) => html`<button class=${session.variations === n ? "on" : ""}
          aria-pressed=${session.variations === n ? "true" : "false"} @click=${() => this.set("variations", n)}>${n}</button>`)}</div>
        ${this.takes("seed") ? html`<label class="switch" title=${keptSeed ? `Seed ${keptSeed}` : "Make a clip first — the selected clip's seed is the one kept"}>
          <input type="checkbox" .checked=${session.keepSeed && !!keptSeed} ?disabled=${!keptSeed}
            @change=${(e: Event) => this.set("keepSeed", (e.target as HTMLInputElement).checked)} />
          Keep the selected clip's seed${keptSeed ? html` <span style="opacity:.7;font-variant-numeric:tabular-nums">· ${keptSeed}</span>` : nothing}
        </label>` : nothing}
        ${this.error ? html`<div class="err">${this.error}</div>` : nothing}
      </div>
      <div class="ins-foot">
        <button class="make" ?disabled=${(from === "image" && !session.picture) || (!!this.workflow?.needsModel && !this.built)}
          title="Make the clip (Ctrl+Enter)" @click=${() => void this.make()}>
          <span class="material-symbols-rounded">movie</span>${session.variations > 1 ? `Make ${session.variations} clips` : "Make the clip"}</button>
        <div class="make-sub">${running ? `${running} clip${running === 1 ? "" : "s"} in the works · ` : ""}${session.seconds}s at ${size.width}×${size.height} · takes minutes</div>
      </div>
    </aside>`;
  }

  /**
   * The model, picked as the Image studio's checkpoint is: a Wan 2.2 pair is one
   * choice, its two experts wired by the server; its text encoder and VAE follow from
   * it and are folded away beside it. Then how it samples.
   */
  private renderModel() {
    const w = this.workflow;
    if (!w) return nothing;
    const r = this.recipe();
    const pasted = !w.needsModel && !w.models;
    const own = !!session.recipes[session.from];
    const head = html`<div class="k">Model
      <span class="k-btns">
        ${own ? html`<button class="link" title="Back to the files in Settings → Image generation → Video" @click=${() => this.resetRecipe()}>Settings'</button>` : nothing}
        <button class="k-btn" title="Read ComfyUI's models again" aria-label="Read ComfyUI's models again" ?disabled=${comfy.loading}
          @click=${() => void loadComfyLists()}><span class="material-symbols-rounded">refresh</span></button>
      </span></div>`;
    if (!r || !comfy.lists) {
      return html`${head}<div class=${comfy.error ? "err" : "note"}>${comfy.error
        ? `ComfyUI didn't list its models: ${comfy.error}. ${w.needsModel ? "" : "Clips run on Settings' files meanwhile."}`
        : "Asking ComfyUI what it has…"}</div>`;
    }
    const m = r.models;
    const lists = comfy.lists;
    const choice = clipModelChoiceOf(m, comfy.models);
    const value = choice ? `${choice.kind}:${choice.key}` : m.model ? "current" : "";
    const group = (label: string, kind: ClipModelChoice["kind"]) => {
      const list = comfy.models.filter((c) => c.kind === kind);
      return list.length ? html`<optgroup label=${label}>${list.map((c) =>
        html`<option value="${c.kind}:${c.key}" ?selected=${`${c.kind}:${c.key}` === value}>${c.label}${c.speed ? " ⚡" : ""}</option>`)}</optgroup>` : nothing;
    };
    const fileSelect = (aria: string, list: readonly string[], current: string, blank: string, set: (v: string) => void) => html`
      <select aria-label=${aria} @change=${(e: Event) => set((e.target as HTMLSelectElement).value)}>
        <option value="" ?selected=${!current}>${blank}</option>
        ${(current && !list.includes(current) ? [current, ...list] : list).map((n) => html`<option value=${n} ?selected=${n === current}>${n}</option>`)}
      </select>`;
    const full = studioClipModels(r, comfy.loras ?? []);
    const fast = clipIsFast(full);
    const auto = (v: number, fastV: number, slowV: number) => (v ? String(v) : `${fast ? fastV : slowV}`);
    return html`${head}
      <select class="model-pick" aria-label="Model" @change=${(e: Event) => this.pickModel((e.target as HTMLSelectElement).value)}>
        ${!m.model || pasted ? html`<option value="" ?selected=${!m.model}>${pasted ? "Settings' pasted workflow" : "Pick a model…"}</option>` : nothing}
        ${m.model && !choice ? html`<option value="current" selected>${m.model} (not listed)</option>` : nothing}
        ${group("Wan 2.2 pairs — high + low noise", "pair")}
        ${group("Single models", "single")}
        ${group("All-in-one checkpoints", "checkpoint")}
      </select>
      ${!comfy.models.length ? html`<div class="note" style="margin-top:6px">ComfyUI has no Wan models yet.
        <button class="link" @click=${() => this.dispatchEvent(new CustomEvent("find-video-models", { bubbles: true, composed: true }))}>Find them on Civitai</button></div>` : nothing}
      ${m.model ? html`
        ${choice?.kind === "pair" ? html`<div class="model-note"><span class="material-symbols-rounded">animation</span>
          High noise lays out the motion, then ${choiceShort(m.lowModel)} finishes it</div>` : nothing}
        ${fast ? html`<div class="model-note speed"><span class="material-symbols-rounded">bolt</span>A speed file is in: ${SPEED_SETTINGS.steps} steps at CFG 1, several times faster</div>` : nothing}
        <details class="files">
          <summary><span class="material-symbols-rounded" style="font-size:16px">description</span>Encoder · VAE
            <span class="nm">${m.checkpoint && !m.textEncoder && !m.vae ? "the checkpoint's own" : [m.textEncoder || "—", m.vae || "—"].join(" · ")}</span>
            <span class="material-symbols-rounded chev" style="font-size:18px">expand_more</span></summary>
          <div class="files-grid">
            <span>Text encoder</span>${fileSelect("Text encoder", lists.textEncoders, m.textEncoder, m.checkpoint ? "The checkpoint's own" : "Pick one (umt5_xxl)", (v) => this.editModels({ textEncoder: v }))}
            <span>VAE</span>${fileSelect("VAE", lists.vaes, m.vae, m.checkpoint ? "The checkpoint's own" : "Pick one (wan_2.1_vae)", (v) => this.editModels({ vae: v }))}
          </div>
        </details>
        ${!m.checkpoint && (!m.textEncoder || !m.vae) ? html`<div class="err">A model from diffusion_models needs a text encoder and a VAE beside it.</div>` : nothing}

        <div class="k">Sampling<small>0 is Wan's own</small></div>
        <div class="sampling">
          <span>Steps</span>
          <input type="range" min="0" max="40" step="1" .value=${String(m.steps)} aria-label="Steps"
            @input=${(e: Event) => this.editModels({ steps: Number((e.target as HTMLInputElement).value) })} />
          <b class=${m.steps ? "" : "auto"}>${auto(m.steps, SPEED_SETTINGS.steps, 20)}</b>
          <span>CFG</span>
          <input type="range" min="0" max="10" step="0.5" .value=${String(m.cfg)} aria-label="CFG"
            @input=${(e: Event) => this.editModels({ cfg: Number((e.target as HTMLInputElement).value) })} />
          <b class=${m.cfg ? "" : "auto"}>${auto(m.cfg, SPEED_SETTINGS.cfg, 3.5)}</b>
          <span>Shift</span>
          <input type="range" min="0" max="20" step="0.5" .value=${String(m.shift)} aria-label="Shift"
            @input=${(e: Event) => this.editModels({ shift: Number((e.target as HTMLInputElement).value) })} />
          <b class=${m.shift ? "" : "auto"}>${m.shift || 8}</b>
          <span>Sampler</span>
          <div class="two">
            ${fileSelect("Sampler", lists.samplers ?? [], m.sampler ?? "", "euler", (v) => this.editModels({ sampler: v }))}
            ${fileSelect("Scheduler", lists.schedulers ?? [], m.scheduler ?? "", "simple", (v) => this.editModels({ scheduler: v }))}
          </div>
        </div>
        ${speedAtFullCFG(full) ? html`<div class="warn">A speed file at CFG ${m.cfg} comes out burned, and takes many times as long.
          <button class="link" @click=${() => this.editModels({ steps: SPEED_SETTINGS.steps, cfg: SPEED_SETTINGS.cfg })}>Use ${SPEED_SETTINGS.steps} steps at CFG 1</button></div>` : nothing}
      ` : nothing}`;
  }

  /**
   * LoRAs for the next clips, Settings' among them to start with; a pair's two files
   * are one choice, put on each at its own expert.
   */
  private renderLoras() {
    const r = this.recipe();
    if (!r) return nothing;
    const all = comfy.loras ?? [];
    const on = all.filter((c) => r.loras[c.key] !== undefined);
    const q = session.loraQuery.trim().toLowerCase();
    const rest = all.filter((c) => r.loras[c.key] === undefined
      && (!q || c.label.toLowerCase().includes(q) || c.key.toLowerCase().includes(q)));
    const count = on.length;
    const put = (key: string, weight: number) => this.edit((x) => ({ ...x, loras: { ...x.loras, [key]: weight } }));
    const takeOff = (key: string) => this.edit((x) => {
      const loras = { ...x.loras };
      delete loras[key];
      return { ...x, loras };
    });
    return html`
      <div class="k">LoRAs<small>${count ? `${count} on` : ""}</small></div>
      ${count ? html`<div class="loras-on">
        ${on.map((c) => {
          const weight = r.loras[c.key];
          return html`<div class="lora-row ${c.speed ? "speed" : ""}">
            <span class="lora-ic material-symbols-rounded">${c.speed ? "bolt" : "style"}</span>
            <span class="lora-name" title=${c.files.map((f) => f.name).join("\n")}>${c.label}${c.files.length > 1 ? html`<span class="lora-tag">high + low</span>` : nothing}</span>
            <button class="lora-x" title="Take it off" aria-label="Take ${c.label} off" @click=${() => takeOff(c.key)}>
              <span class="material-symbols-rounded">close</span></button>
            <label class="lora-weight">
              <input type="range" min="-1" max="2" step="0.05" .value=${String(weight)} aria-label="${c.label} strength"
                @input=${(e: Event) => put(c.key, Number((e.target as HTMLInputElement).value))} />
              <b>${weight.toFixed(2)}</b>
            </label>
          </div>`;
        })}
      </div>` : nothing}
      ${!all.length ? html`<div class="note">ComfyUI has no LoRAs in models/loras.
            <button class="link" @click=${() => this.dispatchEvent(new CustomEvent("find-video-models", { bubbles: true, composed: true }))}>Find Wan LoRAs on Civitai</button></div>`
        : html`
          ${all.length > 6 ? html`<label class="lora-search"><span class="material-symbols-rounded">search</span>
            <input type="search" placeholder="Search ${all.length} LoRAs" .value=${session.loraQuery} aria-label="Search LoRAs"
              @input=${(e: Event) => this.set("loraQuery", (e.target as HTMLInputElement).value)} /></label>` : nothing}
          ${rest.length ? html`<div class="lora-list">
            ${rest.slice(0, LORA_LIST).map((c) => html`<button class="lora-pick" title=${c.files.map((f) => f.name).join("\n")} @click=${() => put(c.key, 1)}>
              <span class="material-symbols-rounded">${c.speed ? "bolt" : "add"}</span>
              <span class="lora-name">${c.label}</span>
              ${c.files.length > 1 ? html`<span class="lora-tag">pair</span>` : nothing}
            </button>`)}
          </div>
          ${rest.length > LORA_LIST ? html`<div class="note" style="margin-top:6px">${rest.length - LORA_LIST} more — search to find them.</div>` : nothing}`
          : html`<div class="note">${q ? "No LoRA by that name." : "Every LoRA ComfyUI has is on."}</div>`}`}
    `;
  }

  private renderFrame() {
    const pic = session.picture;
    const file = html`<input type="file" accept="image/*" @change=${(e: Event) => {
      const input = e.target as HTMLInputElement;
      this.pickFile(input.files?.[0]);
      input.value = "";
    }} />`;
    const choose = () => (this.renderRoot.querySelector<HTMLInputElement>(".frame input[type=file]"))?.click();
    return html`<div class="k">Starts from</div>
      <div class="frame ${pic ? "has" : ""} ${this.dropping ? "drop" : ""}"
        @dragover=${(e: DragEvent) => this.onDragOver(e)} @dragleave=${() => (this.dropping = false)} @drop=${(e: DragEvent) => this.onDrop(e)}>
        ${file}
        ${pic
          ? html`<img src=${pic.url} alt="" />
              <div class="frame-bar">
                <span class="nm">${pic.name}<small>${pic.width}×${pic.height}</small></span>
                <button title="Choose another picture" aria-label="Choose another picture" @click=${choose}><span class="material-symbols-rounded">upload</span></button>
                <button title="Let it go" aria-label="Let the picture go" @click=${() => this.set("picture", null)}><span class="material-symbols-rounded">close</span></button>
              </div>`
          : html`<div class="frame-empty">
              <span class="material-symbols-rounded">add_photo_alternate</span>
              <span>Drag a picture here from the gallery or your desktop, or press <b>Animate</b> on one.</span>
              <button class="chip" @click=${choose}><span class="material-symbols-rounded">upload</span>Choose a picture</button>
            </div>`}
      </div>`;
  }

  private renderStage() {
    const run = this.selectedRun;
    if (!run) {
      const pic = session.from === "image" ? session.picture : null;
      return pic
        ? html`<div class="hero">
            <div class="hero-frame"><img src=${pic.url} alt="" /></div>
            <span>Say what happens under <b>What happens</b>, then <b>Make the clip</b>. It takes a few minutes and carries on while you do other things.</span>
          </div>`
        : html`<div class="hero">
            <span class="glyph"><span class="material-symbols-rounded">theaters</span></span>
            <strong>${session.from === "image" ? "Bring a picture to life" : "A clip from words"}</strong>
            <span>${session.from === "image"
              ? "Drop a picture on Starts from, or press Animate on one in the gallery, the Image studio or a clip's frame."
              : "Describe the scene and what moves in it, in sentences — video models read words better than tags."}</span>
          </div>`;
    }
    if (run.clip) {
      const url = clipURL(run.clip);
      return run.clip.mime.startsWith("video/")
        ? html`<div class="player"><video src=${url} autoplay playsinline muted .loop=${session.loop} .playbackRate=${session.speed}
            @click=${() => this.togglePlay()}
            @play=${() => (this.playing = true)} @pause=${() => (this.playing = false)}
            @loadedmetadata=${(e: Event) => { const v = e.target as HTMLVideoElement; this.duration = v.duration; v.playbackRate = session.speed; }}
            @timeupdate=${(e: Event) => (this.time = (e.target as HTMLVideoElement).currentTime)}></video></div>`
        : html`<div class="player"><img class="still" src=${url} alt="Generated clip" /></div>`;
    }
    if (!run.done) {
      const pct = Math.round(run.percent * 100);
      const c = 2 * Math.PI * 60;
      return html`<div class="waiting">
        ${run.thumb ? html`<img src=${run.thumb} alt="" />` : nothing}
        <div class="ring">
          <svg viewBox="0 0 132 132"><circle class="track" cx="66" cy="66" r="60" /><circle class="fill" cx="66" cy="66" r="60"
            stroke-dasharray=${c} stroke-dashoffset=${c * (1 - run.percent)} /></svg>
          <span class="pct"><b>${pct}%</b>${elapsed(Date.now() - run.startedAt)}</span>
        </div>
        <span class="what">${run.upscaleOf ? `Enlarging take ${run.upscaleOf} ${session.upscaleBy}×…` : run.prompt || "Animating the picture…"}</span>
      </div>`;
    }
    return html`<div class="failed"><span class="material-symbols-rounded">error</span>
      <span>${run.error ?? "ComfyUI finished without a clip."}</span>
      <button class="chip" @click=${() => this.dismiss(run)}><span class="material-symbols-rounded">close</span>Dismiss</button></div>`;
  }

  private renderTransport() {
    const run = this.selectedRun;
    if (!run) return nothing;
    const isVideo = !!run.clip?.mime.startsWith("video/");
    const took = run.endedAt ? elapsed(run.endedAt - run.startedAt) : "";
    return html`${this.upscaleOpen && isVideo ? this.renderUpscale(run) : nothing}<div class="transport">
      ${isVideo ? html`
        <button class="icon-btn" title=${this.playing ? "Pause" : "Play"} aria-label=${this.playing ? "Pause" : "Play"} @click=${() => this.togglePlay()}>
          <span class="material-symbols-rounded">${this.playing ? "pause" : "play_arrow"}</span></button>
        <label class="scrub">
          <span>${this.time.toFixed(1)}s</span>
          <input type="range" min="0" max=${this.duration || 1} step="0.01" .value=${String(this.time)} aria-label="Position in the clip"
            @input=${(e: Event) => { const v = this.video; if (v) { v.pause(); v.currentTime = Number((e.target as HTMLInputElement).value); } }} />
          <span>${this.duration ? `${this.duration.toFixed(1)}s` : ""}</span>
        </label>
        <button class="icon-btn ${session.loop ? "on" : ""}" title="Loop" aria-pressed=${session.loop ? "true" : "false"} @click=${() => this.set("loop", !session.loop)}>
          <span class="material-symbols-rounded">replay</span></button>
        <div class="seg" role="group" aria-label="Playback speed">${SPEEDS.map((s) => html`<button class=${session.speed === s ? "on" : ""}
          @click=${() => { this.set("speed", s); const v = this.video; if (v) v.playbackRate = s; }}>${s}×</button>`)}</div>
        <span class="t-sep"></span>
        <button class="chip" ?disabled=${this.grabbing || !this.clips.image} title="Start the next clip from this one's last frame — how a few seconds become longer"
          @click=${() => void this.continueFrom(run)}><span class="material-symbols-rounded">start</span>Continue from last frame</button>
        <button class="chip" ?disabled=${this.grabbing} title="Start a picture in the Image studio from the frame on screen"
          @click=${() => void this.frameToImage(run)}><span class="material-symbols-rounded">screenshot</span>Frame to Image</button>
        <button class="chip ${this.upscaleOpen ? "on" : ""}" title="Enlarge this clip through ComfyUI; the enlarged one is a new take beside it"
          aria-expanded=${this.upscaleOpen ? "true" : "false"} @click=${() => (this.upscaleOpen = !this.upscaleOpen)}>
          <span class="material-symbols-rounded">open_in_full</span>Upscale</button>
      ` : html`<span class="t-meta" style="flex:1">${!run.done ? `Started ${elapsed(Date.now() - run.startedAt)} ago` : run.error ? "Didn't finish" : ""}</span>`}
      <span class="toolbar-spacer" style="flex:1"></span>
      ${run.clip ? html`<span class="t-meta">${run.clip.seed ? `seed ${run.clip.seed}` : "from the gallery"}${run.clip.recipe ? ` · ${run.clip.recipe}` : ""}${took && run.clip.id ? ` · ${took}` : ""}</span>` : nothing}
      ${!run.done ? html`<button class="chip" @click=${() => void api.cancelGenerate(run.jobId).catch(() => {})}>
        <span class="material-symbols-rounded">stop</span>Stop</button>` : nothing}
      ${run.clip ? html`
        <a class="chip" href=${clipURL(run.clip)} download="clip-${run.clip.seed || run.clip.gallery}" title="Download">
          <span class="material-symbols-rounded">download</span></a>
        <button class="chip ${run.savedId ? "" : "primary"}" ?disabled=${run.saving || !!run.savedId} @click=${() => void this.save(run)}>
          <span class="material-symbols-rounded">${run.savedId ? "check" : "save"}</span>${run.savedId ? "In the library" : run.clip.gallery ? "Move to library" : "Save"}</button>` : nothing}
      ${run.done ? html`<button class="icon-btn" title="Dismiss this clip" aria-label="Dismiss this clip" @click=${() => this.dismiss(run)}>
        <span class="material-symbols-rounded">delete</span></button>` : nothing}
    </div>`;
  }

  /** The enlargement's choices, over the transport: an upscale model ComfyUI has, or
      Lanczos alone, and by how much. */
  private renderUpscale(run: ClipRun) {
    const upscalers = comfy.lists?.upscalers ?? [];
    const c = run.clip!;
    const to = c.width && c.height
      ? `→ ${Math.round((c.width * session.upscaleBy) / 16) * 16}×${Math.round((c.height * session.upscaleBy) / 16) * 16}`
      : "";
    return html`<div class="upscale" role="group" aria-label="Upscale the clip">
      <span class="lbl"><span class="material-symbols-rounded">open_in_full</span>Upscale with</span>
      <select aria-label="Upscaler" @change=${(e: Event) => this.set("upscaler", (e.target as HTMLSelectElement).value)}>
        <option value="" ?selected=${!session.upscaler}>Lanczos — quick, softer</option>
        ${upscalers.map((u) => html`<option value=${u} ?selected=${u === session.upscaler}>${u}</option>`)}
      </select>
      <div class="seg" role="group" aria-label="How much larger">${UPSCALES.map((s) => html`<button class=${session.upscaleBy === s ? "on" : ""}
        aria-pressed=${session.upscaleBy === s ? "true" : "false"} @click=${() => this.set("upscaleBy", s)}>${s}×</button>`)}</div>
      ${to ? html`<span class="to" title="From ${c.width}×${c.height}">${to}</span>` : nothing}
      <span style="flex:1"></span>
      ${!upscalers.length && comfy.lists ? html`<span class="to" title="Put ESRGAN-style models (4x-UltraSharp, RealESRGAN) in ComfyUI's models/upscale_models">No upscale models in ComfyUI</span>` : nothing}
      <button class="chip primary" @click=${() => this.upscale(run)}><span class="material-symbols-rounded">auto_awesome</span>Upscale</button>
      <button class="icon-btn" title="Close" aria-label="Close" @click=${() => (this.upscaleOpen = false)}><span class="material-symbols-rounded">close</span></button>
    </div>`;
  }

  private renderReel() {
    const current = this.selectedRun?.jobId;
    const count = session.runs.length;
    return html`<div class="reel" role="listbox" aria-label="Clips this session">
      <span class="reel-label">Takes</span>
      ${session.runs.map((r, i) => {
        const pct = Math.round(r.percent * 100);
        const media = r.clip
          ? r.clip.mime.startsWith("video/")
            ? html`<video src=${`${clipURL(r.clip)}#t=0.1`} muted playsinline preload="metadata"></video>`
            : html`<img src=${clipURL(r.clip)} alt="" />`
          : r.thumb ? html`<img src=${r.thumb} alt="" />` : nothing;
        return html`<button class="take ${r.jobId === current ? "on" : ""} ${r.done ? "" : "running"}" role="option"
          aria-selected=${r.jobId === current ? "true" : "false"} title=${r.prompt || "Clip"}
          @click=${() => this.set("selected", r.jobId)}>
          ${media}
          <span class="take-n">${count - i}${r.upscaleOf ? html` · ${r.upscaleOf}↑` : nothing}</span>
          ${!r.done
            ? html`<span class="badge">${pct}%</span><span class="mini-bar"><span style="width:${pct}%"></span></span>`
            : r.savedId ? html`<span class="badge saved"><span class="material-symbols-rounded">check</span>Saved</span>`
            : r.error && !r.clip ? html`<span class="badge err"><span class="material-symbols-rounded">error</span></span>`
            : nothing}
        </button>`;
      })}
    </div>`;
  }
}

/**
 * Runs a clip and keeps its card up to date. The call is detached: the server answers
 * as soon as it has checked the request and the clip is followed by polling its job,
 * because a call held open for the minutes a clip takes is cut off — by a proxy, and
 * by Firefox itself at five minutes ("NetworkError when attempting to fetch resource").
 * A server from before detaching answers with the clip itself, and a call cut off
 * anyway is followed the same way.
 */
async function runClip(run: ClipRun, call: () => Promise<GenerateResult>) {
  const progress = (percent: number) => {
    if (!run.done) {
      run.percent = percent;
      changed();
    }
  };
  let res: GenerateResult | undefined;
  try {
    let answer: GenerateResult;
    try {
      answer = await call();
    } catch (e) {
      answer = await collect(run.jobId, progress, e as Error);
    }
    res = answer.clip || !answer.accepted ? answer : await collect(run.jobId, progress);
  } catch (failure) {
    const msg = (failure as Error).message;
    run.error = /cancelled/i.test(msg) ? "Stopped." : msg;
  }
  run.done = true;
  run.percent = 1;
  run.endedAt = Date.now();
  if (res?.clip) run.clip = res.clip;
  else if (!run.error) run.error = "ComfyUI finished without a clip.";
  changed();
  if (res?.clip?.gallery) for (const fn of keptListeners) fn();
}

/** The low-noise file's name without its folder or extension, to say what it does. */
function choiceShort(name: string): string {
  return name.split(/[\\/]/).pop()!.replace(/\.(safetensors|gguf|ckpt|pt)$/i, "") || "the low-noise model";
}

/** How long polls may keep failing — a proxy hiccup, the server restarting — before
    the clip is given up on. It goes on regardless, and lands in the gallery. */
const LOST_TOUCH_MS = 2 * 60_000;

/**
 * Follows a run's job to its end. `failure` is the call's own error when the call was
 * cut off: a job the server has never heard of then means the call never reached it,
 * and that is the error to show. One it stops knowing part way means it restarted.
 */
async function collect(jobId: string, progress: (percent: number) => void, failure?: Error): Promise<GenerateResult> {
  if (failure?.name === "AbortError") throw failure;
  const deadline = Date.now() + 20 * 60_000;
  let seen = false;
  let lastAnswer = Date.now();
  while (Date.now() < deadline) {
    let state;
    try {
      state = await api.genProgress(jobId, -1);
      seen = true;
      lastAnswer = Date.now();
    } catch (e) {
      const msg = (e as Error).message;
      if (/no such generation/i.test(msg)) {
        if (!seen && failure) throw failure;
        throw new Error(seen
          ? "The server restarted while the clip was being made and lost track of it. If ComfyUI finished it, it isn't in the gallery — make it again."
          : "The server never started the clip.");
      }
      if (Date.now() - lastAnswer > LOST_TOUCH_MS) {
        throw new Error(`Lost touch with the server while the clip was being made (${msg}). If it finishes, it lands in the gallery.`);
      }
    }
    if (state?.done) {
      if (state.result) return state.result;
      throw new Error(state.error || failure?.message || "ComfyUI finished without a clip.");
    }
    if (state) progress(state.percent);
    await new Promise((r) => setTimeout(r, 2500));
  }
  throw new Error("The clip ran past twenty minutes without finishing. If it does finish, it lands in the gallery.");
}

async function pictureDataURL(url: string): Promise<string> {
  // A picture made in this page (a file, a grabbed frame) that has since been let go
  // of fails as a bare network error; say what it means instead.
  const res = await fetch(url, { credentials: "same-origin" }).catch(() => {
    throw new Error("Couldn't read the picture to start from any more — pick it again.");
  });
  if (!res.ok) throw new Error("Couldn't read the picture — a result on the canvas expires after a while; pick it again.");
  const blob = await res.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("couldn't read the picture"));
    reader.readAsDataURL(blob);
  });
}

declare global {
  interface HTMLElementTagNameMap {
    "oppai-video-studio": OppaiVideoStudio;
  }
}
