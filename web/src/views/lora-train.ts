import "@material/web/progress/circular-progress.js";
import { LitElement, html, css, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { iconStyles, motionStyles } from "../theme.js";
import {
  api,
  type Collection,
  type GenLora,
  type GenModel,
  type TrainerHealth,
  type Training,
  type TrainPreview,
  type TrainPreviewItem,
  type TrainRequest,
  type TrainSource,
  type TrainTask,
} from "../api.js";
import { toggleTag, trainingActive, trainingFraction, trainingLine, triggerFrom } from "../train-progress.js";
import {
  EFFORTS, PRESETS, captionOf, datasetAdvice, epochsFor, estimateSteps, minSideFor, presetById, suggestLeaveOut, tagKey,
  wantsLowVram, type Effort, type PresetId,
} from "../lora-presets.js";
import { loraStyles } from "./lora-styles.js";
import "./lora-gather.js";
import "./lora-comparison.js";

/**
 * Training a LoRA on the library's own pictures.
 *
 * The training runs on the trainer — its own container on the box with the GPU —
 * and the server follows it from start to installed (backend/internal/api/
 * lora_training.go), so this screen is a way to set a run up and a window onto the
 * runs there are: closing it, or the browser, stops nothing.
 *
 * Setting one up is four steps, in the order a first-timer needs to think about
 * them: what kind of LoRA it is (lora-presets.ts, which makes the technical choices
 * for each kind), which pictures — from the library, from this computer, or from an
 * X account (lora-gather.ts) — and which of those to drop, how they are captioned —
 * with the tagger offered for the ones that have no tags, and every picture's tags
 * editable — and finally the checkpoint and how long to train. Every step says what
 * it is for and warns about what will make a poor LoRA before the GPU is spent on it.
 *
 * The Compare tab (lora-comparison.ts) draws the installed LoRAs side by side.
 *
 * The host mounts it conditionally; closing dispatches "close", and a run that
 * installs dispatches "trained" so the studio can list the new LoRA.
 */

type Tab = "new" | "runs" | "compare";
type SourceKind = "collection" | "tag" | "upload" | "x";
type Step = 1 | 2 | 3 | 4;

const STEPS: { n: Step; title: string; icon: string }[] = [
  { n: 1, title: "Kind", icon: "category" },
  { n: 2, title: "Pictures", icon: "photo_library" },
  { n: 3, title: "Tags", icon: "sell" },
  { n: 4, title: "Train", icon: "model_training" },
];

const SOURCES: { id: SourceKind; title: string; icon: string }[] = [
  { id: "collection", title: "A collection", icon: "collections" },
  { id: "tag", title: "A library tag", icon: "label" },
  { id: "upload", title: "Upload", icon: "upload_file" },
  { id: "x", title: "An X account", icon: "public" },
];

@customElement("oppai-lora-train")
export class OppaiLoraTrain extends LitElement {
  /** The generator's checkpoints, to train against. */
  @property({ attribute: false }) models: GenModel[] = [];
  /** The generator's installed LoRAs, for the comparison. */
  @property({ attribute: false }) loras: GenLora[] = [];
  /** The checkpoint picked in the studio, the default base. */
  @property() checkpoint = "";

  @state() private tab: Tab = "new";
  @state() private step: Step = 1;

  @state() private configured = true;
  @state() private trainer: TrainerHealth | null = null;
  @state() private trainerError = "";
  @state() private tagger = false;
  @state() private runs: Training[] = [];
  @state() private loaded = false;

  @state() private preset: PresetId | "" = "";
  @state() private effort: Effort = "balanced";
  @state() private name = "";
  @state() private trigger = "";
  @state() private triggerTouched = false;
  @state() private base = "";

  @state() private sourceKind: SourceKind = "collection";
  @state() private collections: Collection[] = [];
  @state() private collectionId = 0;
  @state() private tag = "";
  @state() private exclude: number[] = [];
  /** The collection this setup has imported into, so a second batch joins the first. */
  @state() private gatheredInto = 0;

  @state() private captions: "tags" | "trigger" = "tags";
  @state() private leaveOut: string[] = [];
  @state() private leaveOutTouched = false;
  @state() private suggested: string[] = [];
  @state() private preview: TrainPreview | null = null;
  @state() private previewing = false;
  @state() private tagTask: TrainTask | null = null;
  /** What the last tagging run has to say, shown in its own card. */
  @state() private tagNote = "";
  @state() private editing = 0;
  @state() private newTag = "";

  @state() private advanced = false;
  @state() private epochs = 10;
  @state() private repeats = 0;
  @state() private rank = 0;
  @state() private alpha = 0;
  @state() private resolution = 0;
  @state() private learningRate = 0.0001;
  @state() private textEncoderLr = 0;
  @state() private optimizer = "AdamW8bit";
  @state() private noiseOffset = 0;
  @state() private lowVram = false;
  @state() private lowVramTouched = false;
  @state() private flip = false;
  @state() private freeGpu = true;
  @state() private samples = true;
  @state() private starting = false;
  @state() private error = "";
  @state() private openLog = 0;
  @state() private compareFocus = "";

  private timer = 0;
  private previewTimer = 0;
  private previewAbort: AbortController | null = null;
  private installed = new Set<number>();

  static styles = [
    iconStyles,
    motionStyles,
    loraStyles,
    css`
      :host {
        position: fixed;
        inset: 0;
        /* Above the studio's drawer, which on a phone is a sheet at 91. */
        z-index: 95;
        display: block;
        background: var(--oppai-bg, #141218);
        color: var(--oppai-text);
        overflow-y: auto;
      }
      .wrap { max-width: 1240px; margin: 0 auto; padding: 0 16px 80px; }
      .topbar {
        position: sticky; top: 0; z-index: 3; background: var(--oppai-bg, #141218);
        display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 12px 0;
        border-bottom: 1px solid var(--oppai-border); margin-bottom: 18px;
      }
      .topbar h2 { margin: 0; font-size: 18px; display: inline-flex; align-items: center; gap: 8px; }
      .topbar h2 .material-symbols-rounded { color: var(--oppai-primary); }
      .trainer {
        font-size: 12px; color: var(--oppai-text-dim); display: inline-flex; align-items: center; gap: 6px;
        background: var(--oppai-surface); border: 1px solid var(--oppai-border); border-radius: 999px; padding: 4px 10px;
      }
      .trainer .dot { width: 8px; height: 8px; border-radius: 50%; background: #7fcf8a; }
      .trainer .dot.busy { background: #e8b04a; }
      .trainer .dot.off { background: var(--oppai-error, #f2b8b5); }
      .tabs { display: inline-flex; gap: 4px; margin-left: auto; }
      .tabs button {
        border: none; background: none; color: var(--oppai-text-dim); font: inherit; font-size: 14px; cursor: pointer;
        padding: 8px 14px; border-radius: 999px; display: inline-flex; align-items: center; gap: 6px;
      }
      .tabs button .material-symbols-rounded { font-size: 18px; }
      .tabs button.on { background: var(--oppai-primary-container); color: var(--oppai-on-accent, var(--oppai-text)); font-weight: 600; }
      .tabs .n {
        font-size: 11px; background: var(--oppai-primary); color: var(--oppai-on-primary, #1d1b20); border-radius: 999px;
        padding: 0 6px; min-width: 16px; text-align: center;
      }
      @media (max-width: 760px) {
        /* Title and the way out on one row, the trainer under them, the tabs last. */
        .close { order: 1; margin-left: auto; }
        .trainer { order: 2; }
        .tabs { margin-left: 0; order: 3; width: 100%; justify-content: space-between; }
        .tabs button { flex: 1; justify-content: center; padding: 8px 6px; }
      }

      .stepper { display: flex; gap: 6px; margin-bottom: 18px; }
      .stepper button {
        flex: 1; border: none; background: var(--oppai-surface); color: var(--oppai-text-dim); font: inherit; cursor: pointer;
        border-radius: 14px; padding: 10px 12px; display: flex; align-items: center; gap: 10px; text-align: left;
        border: 1px solid var(--oppai-border); min-width: 0;
      }
      .stepper button:disabled { cursor: default; opacity: 0.55; }
      .stepper .num {
        width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; flex: none;
        background: var(--oppai-surface-2); font-size: 13px; font-weight: 700;
      }
      .stepper .num .material-symbols-rounded { font-size: 17px; }
      .stepper .t { font-size: 13px; font-weight: 600; color: var(--oppai-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .stepper .t small { display: block; font-weight: 400; font-size: 11px; color: var(--oppai-text-dim); overflow: hidden; text-overflow: ellipsis; }
      .stepper button.on { border-color: var(--oppai-primary); background: color-mix(in srgb, var(--oppai-primary) 8%, var(--oppai-surface)); }
      .stepper button.on .num, .stepper button.done .num { background: var(--oppai-primary); color: var(--oppai-on-primary, #1d1b20); }
      @media (max-width: 760px) {
        .stepper button { flex-direction: column; gap: 4px; padding: 8px 4px; text-align: center; }
        .stepper .t small { display: none; }
      }

      .presets { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 10px; }
      .preset {
        border: 1px solid var(--oppai-border-strong); background: var(--oppai-bg, #141218); color: var(--oppai-text);
        border-radius: 16px; padding: 14px; text-align: left; font: inherit; cursor: pointer; display: flex; flex-direction: column; gap: 6px;
        transition: border-color 0.15s ease, background 0.15s ease;
      }
      .preset:hover { border-color: var(--oppai-primary); }
      .preset.on { border-color: var(--oppai-primary); background: color-mix(in srgb, var(--oppai-primary) 10%, var(--oppai-bg, #141218)); box-shadow: 0 0 0 1px var(--oppai-primary) inset; }
      .preset .ic {
        width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center;
        background: var(--oppai-primary-container); color: var(--oppai-on-accent, var(--oppai-text));
      }
      .preset .ic .material-symbols-rounded { font-size: 22px; }
      .preset b { font-size: 14px; }
      .preset span.d { font-size: 12px; color: var(--oppai-text-dim); line-height: 1.4; }
      .preset span.e { font-size: 11px; color: var(--oppai-text-muted, var(--oppai-text-dim)); }
      .tips { margin: 10px 0 0; padding-left: 18px; font-size: 13px; color: var(--oppai-text-dim); line-height: 1.6; }

      .navbar {
        position: sticky; bottom: 0; z-index: 2; margin-top: 18px; padding: 12px 0;
        background: linear-gradient(to top, var(--oppai-bg, #141218) 70%, transparent);
        display: flex; gap: 10px; align-items: center;
      }
      .navbar .spacer { flex: 1; }
      .navbar .hint { font-size: 12px; color: var(--oppai-text-dim); }

      .two { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 14px; align-items: start; }
      @media (max-width: 900px) { .two { grid-template-columns: minmax(0, 1fr); } }
      .two > .card + .card { margin-top: 0; }
      .two + .card, .card + .two, .two + .two { margin-top: 14px; }

      .advice { display: flex; flex-direction: column; gap: 6px; margin: 12px 0 0; }
      .advice .banner { margin: 0; }
      .sethead { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin: 16px 0 10px; }
      .card > .sethead:first-child { margin-top: 0; }
      .sethead h4 { margin: 0; font-size: 14px; margin-right: auto; }
      .pick .drop {
        position: absolute; top: 6px; right: 6px; width: 26px; height: 26px; border-radius: 50%; border: none; cursor: pointer;
        background: rgba(0, 0, 0, 0.6); color: #fff; display: grid; place-items: center; padding: 0;
        opacity: 0; transition: opacity 0.12s ease;
      }
      .pick:hover .drop, .pick:focus-within .drop { opacity: 1; }
      @media (hover: none) { .pick .drop { opacity: 1; } }
      .pick .drop .material-symbols-rounded { font-size: 16px; }
      .pick.cap { aspect-ratio: auto; display: flex; flex-direction: column; text-align: left; background: var(--oppai-bg, #141218); border: 1px solid var(--oppai-border); }
      .pick.cap img { aspect-ratio: 1; height: auto; }
      .pick.cap .c {
        font-family: ui-monospace, monospace; font-size: 10.5px; color: var(--oppai-text-dim); padding: 6px 8px; line-height: 1.35;
        display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; word-break: break-word;
      }
      .pick.cap.bare .c { color: var(--oppai-error, #f2b8b5); }
      .captions-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }

      .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-top: 4px; }
      .stat { background: var(--oppai-bg, #141218); border-radius: 12px; padding: 10px 12px; }
      .stat small { display: block; font-size: 11px; color: var(--oppai-text-dim); margin-bottom: 2px; }
      .stat b { font-size: 15px; }
      .caption {
        font-family: ui-monospace, monospace; font-size: 12px; background: var(--oppai-bg, #141218);
        border-radius: 10px; padding: 8px 10px; margin-top: 8px; word-break: break-word; line-height: 1.45;
      }

      .runs { display: flex; flex-direction: column; gap: 12px; }
      .run { background: var(--oppai-surface); border: 1px solid var(--oppai-border); border-radius: 16px; padding: 14px 16px; display: flex; gap: 14px; }
      .run > img, .run > .ph { width: 112px; height: 112px; object-fit: cover; border-radius: 12px; flex: none; background: var(--oppai-surface-2); }
      .run > .ph { display: grid; place-items: center; color: var(--oppai-text-muted, var(--oppai-text-dim)); position: relative; overflow: hidden; }
      .run > .ph img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
      .run > .ph .material-symbols-rounded { font-size: 36px; }
      .run .body { flex: 1; min-width: 0; }
      .run-head { display: flex; align-items: center; gap: 10px; }
      .run-head .name { font-weight: 600; font-size: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .run-head .spacer { flex: 1; }
      .status { font-size: 11px; padding: 3px 10px; border-radius: 999px; background: var(--oppai-surface-2); white-space: nowrap; font-weight: 600; }
      .status.done { background: color-mix(in srgb, #7fcf8a 25%, transparent); }
      .status.failed { background: color-mix(in srgb, var(--oppai-error, #f2b8b5) 25%, transparent); }
      .status.training, .status.installing { background: color-mix(in srgb, var(--oppai-primary) 25%, transparent); }
      .line { font-size: 13px; color: var(--oppai-text-dim); margin-top: 6px; word-break: break-word; }
      .meta { font-size: 12px; color: var(--oppai-text-muted, var(--oppai-text-dim)); margin-top: 4px; display: flex; flex-wrap: wrap; gap: 4px 12px; }
      .run .bar { margin-top: 10px; }
      .run-actions { display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap; }
      pre.log {
        font-size: 11px; background: var(--oppai-bg, #141218); border-radius: 10px; padding: 8px 10px;
        max-height: 220px; overflow: auto; white-space: pre-wrap; word-break: break-word; margin: 10px 0 0;
      }
      @media (max-width: 600px) {
        .run { flex-direction: column; }
        .run > img, .run > .ph { width: 100%; height: 180px; }
      }

      .editor {
        position: fixed; inset: 0; z-index: 5; background: var(--oppai-scrim, rgba(0, 0, 0, 0.6));
        display: grid; place-items: center; padding: 16px;
      }
      .editor .panel {
        background: var(--oppai-surface); border-radius: 20px; width: min(920px, 100%); max-height: calc(100vh - 32px);
        overflow: auto; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 0;
      }
      @media (max-width: 760px) { .editor .panel { grid-template-columns: minmax(0, 1fr); } }
      .editor .pic { background: #000; display: grid; place-items: center; min-height: 280px; }
      .editor .pic img { max-width: 100%; max-height: 70vh; object-fit: contain; display: block; }
      .editor .side { padding: 18px; display: flex; flex-direction: column; gap: 10px; }
      .editor .side .head { display: flex; align-items: center; gap: 6px; }
      .editor .side .head b { margin-right: auto; font-size: 14px; }
      .editor .chip .x { border: none; background: none; color: inherit; padding: 0; cursor: pointer; display: inline-flex; }
      .editor form { display: flex; gap: 8px; }
      .editor form input { flex: 1; }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    void this.refresh();
    void this.loadCollections();
  }

  protected willUpdate(changed: PropertyValues<this>) {
    // The studio's checkpoint is the default base, once it is known.
    if (changed.has("checkpoint") && !this.base) this.base = this.checkpoint;
    // Low VRAM follows the card and the checkpoint's family until it is set by hand.
    // (Private state is not in PropertyValues' key type, hence the widening.)
    const own = changed as Map<string, unknown>;
    if ((own.has("base") || own.has("trainer")) && !this.lowVramTouched) {
      this.lowVram = wantsLowVram(this.trainer?.vramMB, this.baseFamily());
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.clearTimeout(this.timer);
    window.clearTimeout(this.previewTimer);
    this.previewAbort?.abort();
  }

  private async loadCollections(select = 0) {
    try {
      const r = await api.listCollections();
      this.collections = r.items;
      if (select) this.collectionId = select;
      else if (!this.collectionId && r.items.length) this.collectionId = r.items[0].id;
    } catch {
      /* the collection list stays as it was */
    }
  }

  /** Reads the runs, again in a few seconds while any is going. */
  private async refresh() {
    window.clearTimeout(this.timer);
    try {
      const r = await api.trainList();
      this.configured = r.configured;
      this.trainer = r.trainer ?? null;
      this.trainerError = r.trainerError ?? "";
      this.tagger = !!r.tagger;
      this.runs = r.trainings;
      for (const t of r.trainings) {
        if (t.status === "done" && !this.installed.has(t.id)) {
          // The first sighting of a finished run after it was live on this screen.
          if (this.loaded && t.finishedAt && Date.now() / 1000 - t.finishedAt < 120) {
            this.dispatchEvent(new CustomEvent("trained", { detail: { name: t.name } }));
          }
          this.installed.add(t.id);
        }
      }
    } catch (e) {
      this.trainerError = (e as Error).message;
    } finally {
      this.loaded = true;
    }
    if (!this.isConnected) return;
    const live = this.runs.some(trainingActive);
    this.timer = window.setTimeout(() => void this.refresh(), live ? 3000 : 20000);
  }

  // ── the set ───────────────────────────────────────────────────────────────

  private source(): TrainSource | null {
    if (this.sourceKind === "tag") return this.tag.trim() ? { tag: this.tag.trim(), exclude: this.exclude } : null;
    // Uploads and X imports land in a collection, which is what is trained on.
    return this.collectionId > 0 ? { collectionId: this.collectionId, exclude: this.exclude } : null;
  }

  /** A different set: nothing dropped, nothing struck, and a fresh look at it. */
  private sourceChanged() {
    this.exclude = [];
    this.leaveOutTouched = false;
    this.leaveOut = [];
    this.suggested = [];
    this.preview = null;
    this.tagNote = "";
    this.schedulePreview(this.sourceKind === "tag" ? 450 : 0);
  }

  private schedulePreview(delay = 0) {
    window.clearTimeout(this.previewTimer);
    this.previewTimer = window.setTimeout(() => void this.loadPreview(), delay);
  }

  private async loadPreview() {
    const source = this.source();
    if (!source) {
      this.preview = null;
      return;
    }
    this.previewAbort?.abort();
    const abort = new AbortController();
    this.previewAbort = abort;
    this.previewing = true;
    try {
      const p = await api.trainPreview({ source, trigger: this.trigger, captions: this.captions, leaveOut: this.leaveOut }, abort.signal);
      if (abort.signal.aborted) return;
      this.preview = p;
      this.error = "";
      if (!this.leaveOutTouched) this.applySuggestions();
    } catch (e) {
      if (abort.signal.aborted) return;
      this.error = (e as Error).message;
      this.preview = null;
    } finally {
      if (this.previewAbort === abort) this.previewing = false;
    }
  }

  /** Strikes the shared tags the preset says the trigger word should stand for. */
  private applySuggestions() {
    const p = this.preview;
    if (!p || !this.preset) return;
    this.suggested = suggestLeaveOut(presetById(this.preset), p.commonTags, p.count);
    this.leaveOut = [...this.suggested];
  }

  private dropPicture(id: number) {
    this.exclude = [...this.exclude, id];
    if (this.preview) {
      // Gone from the grid at once; the shared tags are counted again behind it.
      const items = this.preview.items.filter((i) => i.id !== id);
      this.preview = { ...this.preview, items, count: items.length };
    }
    if (this.editing === id) this.editing = 0;
    this.schedulePreview(600);
  }

  private bringBack() {
    this.exclude = [];
    this.schedulePreview();
  }

  private caption(item: TrainPreviewItem): string {
    return captionOf(this.trigger, item.tags.map((t) => t.name), this.leaveOut, this.captions);
  }

  private smallCount(): number {
    const min = minSideFor(this.baseFamily());
    return (this.preview?.items ?? []).filter((i) => i.width && i.height && Math.min(i.width, i.height) < min).length;
  }

  private baseFamily(): string {
    const m = this.models.find((x) => x.title === this.base);
    return `${m?.base ?? ""} ${m?.model_name ?? ""}`;
  }

  // ── tagging ───────────────────────────────────────────────────────────────

  private async autotag(redo: boolean) {
    const source = this.source();
    if (!source || this.tagTask) return;
    this.tagNote = "";
    try {
      const before = this.preview?.untagged ?? 0;
      let task = await api.trainAutotag({ source, redo });
      this.tagTask = task;
      while (!task.finished) {
        await new Promise((r) => setTimeout(r, 1200));
        if (!this.isConnected) return;
        task = await api.trainTask(task.id);
        this.tagTask = task;
      }
      if (task.failed) this.tagNote = `The tagger couldn't read ${task.failed} picture${task.failed === 1 ? "" : "s"}.`;
      // New tags can change what the set shares, so the suggestions are made again.
      this.leaveOutTouched = false;
      await this.loadPreview();
      if (!redo && task.done && (this.preview?.untagged ?? 0) >= before) {
        // It read them all and still said nothing captionable: the build without the
        // AI model falls back to a tagger that only knows a picture's shape and size.
        this.tagNote = "The tagger looked at every picture but found nothing to caption them with — this install may only have the simple fallback tagger. Tag them by hand below, or caption with the trigger word alone.";
      }
    } catch (e) {
      this.tagNote = (e as Error).message;
    } finally {
      this.tagTask = null;
    }
  }

  private editedItem(id: number, tags: TrainPreviewItem["tags"]) {
    if (!this.preview) return;
    this.preview = { ...this.preview, items: this.preview.items.map((i) => (i.id === id ? { ...i, tags } : i)) };
  }

  private async removeTag(item: TrainPreviewItem, name: string) {
    this.editedItem(item.id, item.tags.filter((t) => t.name !== name));
    try {
      // The library spells tags with underscores; either spelling is the same tag.
      await api.updateMedia(item.id, { removeTags: [name, name.replace(/ /g, "_")] });
    } catch (e) {
      this.error = (e as Error).message;
      this.editedItem(item.id, item.tags);
    }
  }

  private async addTag(item: TrainPreviewItem) {
    const names = this.newTag.split(",").map((t) => t.trim()).filter(Boolean);
    if (!names.length) return;
    const have = new Set(item.tags.map((t) => tagKey(t.name)));
    const added = names.filter((n) => !have.has(tagKey(n)));
    this.newTag = "";
    if (!added.length) return;
    this.editedItem(item.id, [...added.map((name) => ({ name: name.replace(/_/g, " "), manual: true })), ...item.tags]);
    try {
      await api.updateMedia(item.id, { addTags: added.map((n) => n.replace(/ /g, "_")) });
    } catch (e) {
      this.error = (e as Error).message;
      this.editedItem(item.id, item.tags);
    }
  }

  private closeEditor() {
    this.editing = 0;
    // Edited tags change what the set shares; count it again.
    this.schedulePreview(200);
  }

  // ── presets and starting ──────────────────────────────────────────────────

  private choosePreset(id: PresetId) {
    const p = presetById(id);
    this.preset = id;
    const s = p.settings;
    this.captions = s.captions;
    this.epochs = epochsFor(p, this.effort);
    this.repeats = s.repeats;
    this.rank = s.rank;
    this.alpha = s.alpha;
    this.resolution = s.resolution;
    this.learningRate = s.learningRate;
    this.textEncoderLr = s.textEncoderLr;
    this.optimizer = s.optimizer;
    this.noiseOffset = s.noiseOffset;
    this.flip = s.flip;
    if (id === "custom") this.advanced = true;
    if (!this.leaveOutTouched) this.applySuggestions();
  }

  private chooseEffort(e: Effort) {
    this.effort = e;
    if (this.preset) this.epochs = epochsFor(presetById(this.preset), e);
  }

  private stepReady(step: Step): boolean {
    switch (step) {
      case 1:
        return true;
      case 2:
        return !!this.preset && !!this.name.trim();
      case 3:
      case 4:
        return this.stepReady(2) && !!this.preview?.count;
    }
  }

  private goTo(step: Step) {
    if (!this.stepReady(step)) return;
    this.step = step;
    if (step >= 2 && !this.preview && this.sourceKind !== "upload" && this.sourceKind !== "x") this.schedulePreview();
    this.renderRoot.querySelector(".wrap")?.scrollIntoView({ block: "start" });
    this.scrollTop = 0;
  }

  private async start() {
    const source = this.source();
    if (this.starting || !source) return;
    this.starting = true;
    this.error = "";
    const req: TrainRequest = {
      name: this.name.trim(),
      trigger: this.trigger.trim(),
      base: this.base,
      source,
      captions: this.captions,
      leaveOut: this.leaveOut,
      preset: this.preset || undefined,
      epochs: this.epochs || undefined,
      repeats: this.repeats || undefined,
      rank: this.rank || undefined,
      alpha: this.alpha || undefined,
      resolution: this.resolution || undefined,
      learningRate: this.learningRate || undefined,
      textEncoderLr: this.textEncoderLr || undefined,
      optimizer: this.optimizer,
      noiseOffset: this.noiseOffset || undefined,
      lowVram: this.lowVram,
      flip: this.flip,
      freeGpu: this.freeGpu,
      samples: this.samples,
    };
    try {
      await api.trainStart(req);
      await this.refresh();
      this.tab = "runs";
      this.step = 1;
      this.preset = "";
      this.name = "";
      this.trigger = "";
      this.triggerTouched = false;
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.starting = false;
    }
  }

  /** Fills the setup with a past run's settings, on its last step. */
  private again(t: Training) {
    const r = t.request;
    if (!r) return;
    this.preset = (r.preset as PresetId) || "custom";
    this.name = r.name;
    this.trigger = r.trigger;
    this.triggerTouched = true;
    if (this.models.some((m) => m.title === r.base)) this.base = r.base;
    if (r.source.collectionId) {
      this.sourceKind = "collection";
      this.collectionId = r.source.collectionId;
    } else if (r.source.tag) {
      this.sourceKind = "tag";
      this.tag = r.source.tag;
    }
    this.exclude = r.source.exclude ?? [];
    this.captions = r.captions ?? "tags";
    this.leaveOut = r.leaveOut ?? [];
    this.leaveOutTouched = true;
    this.suggested = [];
    this.epochs = r.epochs ?? 10;
    this.repeats = r.repeats ?? 0;
    this.rank = r.rank ?? 0;
    this.alpha = r.alpha ?? 0;
    this.resolution = r.resolution ?? 0;
    this.learningRate = r.learningRate ?? 0.0001;
    this.textEncoderLr = r.textEncoderLr ?? 0;
    this.optimizer = r.optimizer ?? "AdamW8bit";
    this.noiseOffset = r.noiseOffset ?? 0;
    this.lowVram = !!r.lowVram;
    this.lowVramTouched = true;
    this.flip = !!r.flip;
    this.freeGpu = r.freeGpu ?? true;
    this.samples = r.samples ?? true;
    this.preview = null;
    this.tab = "new";
    void this.loadPreview().then(() => {
      if (this.preview?.count) this.step = 4;
      else this.step = 2;
    });
    this.step = 2;
  }

  private async cancel(t: Training) {
    try {
      await api.trainCancel(t.id);
    } catch (e) {
      this.error = (e as Error).message;
    }
    await this.refresh();
  }

  private async forget(t: Training) {
    try {
      await api.trainDelete(t.id);
      this.runs = this.runs.filter((r) => r.id !== t.id);
    } catch (e) {
      this.error = (e as Error).message;
    }
  }

  private compare(t: Training) {
    const lora = this.loras.find((l) => (t.modelKey && l.key === t.modelKey) || l.name === t.name);
    this.compareFocus = lora?.name ?? "";
    this.tab = "compare";
  }

  // ── rendering ─────────────────────────────────────────────────────────────

  render() {
    const live = this.runs.filter(trainingActive).length;
    return html`
      <div class="wrap">
        <div class="topbar">
          <h2><span class="material-symbols-rounded">model_training</span> LoRA trainer</h2>
          ${this.renderTrainer()}
          <div class="tabs" role="tablist">
            <button class=${this.tab === "new" ? "on" : ""} @click=${() => (this.tab = "new")}>
              <span class="material-symbols-rounded">add</span> New LoRA
            </button>
            <button class=${this.tab === "runs" ? "on" : ""} @click=${() => (this.tab = "runs")}>
              <span class="material-symbols-rounded">history</span> Runs ${live ? html`<span class="n">${live}</span>` : nothing}
            </button>
            <button class=${this.tab === "compare" ? "on" : ""} @click=${() => (this.tab = "compare")}>
              <span class="material-symbols-rounded">compare</span> Compare
            </button>
          </div>
          <button class="btn ghost close" @click=${() => this.dispatchEvent(new CustomEvent("close"))}>
            <span class="material-symbols-rounded">close</span> Studio
          </button>
        </div>
        ${!this.loaded
          ? html`<div class="empty"><md-circular-progress indeterminate></md-circular-progress></div>`
          : this.tab === "compare"
            ? html`<oppai-lora-comparison .models=${this.models} .loras=${this.loras} .runs=${this.runs}
                .checkpoint=${this.checkpoint} .focusLora=${this.compareFocus}></oppai-lora-comparison>`
            : !this.configured
              ? this.renderNotSetUp()
              : this.tab === "runs"
                ? this.renderRuns()
                : this.renderWizard()}
      </div>
      ${this.editing ? this.renderEditor() : nothing}
    `;
  }

  private renderTrainer() {
    if (!this.configured) return nothing;
    if (this.trainerError) {
      return html`<span class="trainer" title=${this.trainerError}><span class="dot off"></span>Trainer unreachable</span>`;
    }
    const t = this.trainer;
    if (!t) return nothing;
    const vram = t.vramMB ? ` · ${Math.round(t.vramMB / 1024)} GB` : "";
    const state = t.busy ? `training${t.queued ? `, ${t.queued} waiting` : ""}` : t.queued ? `${t.queued} waiting` : "idle";
    return html`<span class="trainer"><span class="dot ${t.busy ? "busy" : ""}"></span>${t.gpu || "Trainer"}${vram} · ${state}</span>`;
  }

  private renderNotSetUp() {
    return html`<div class="card empty">
      <span class="material-symbols-rounded">model_training</span>
      LoRAs are trained by the OppaiLib trainer, a container of its own on the box with the GPU<br />
      (<code>ghcr.io/noneye-byte/oppailib-trainer</code>; setup is in <code>trainer/README.md</code>).<br />
      Once it is running, put its address and token under <strong>Settings → Image generation</strong>.
    </div>`;
  }

  private renderWizard() {
    const p = this.preview;
    const subs: Record<Step, string> = {
      1: this.preset ? presetById(this.preset).title : "What it learns",
      2: p ? `${p.count} picture${p.count === 1 ? "" : "s"}` : "What it learns from",
      3: this.captions === "trigger" ? "Trigger word only" : this.leaveOut.length ? `${this.leaveOut.length} struck` : "Captions",
      4: "Checkpoint and length",
    };
    return html`
      <nav class="stepper">
        ${STEPS.map((s) => html`<button class="${this.step === s.n ? "on" : ""} ${this.step > s.n ? "done" : ""}"
          ?disabled=${!this.stepReady(s.n)} @click=${() => this.goTo(s.n)}>
          <span class="num">${this.step > s.n ? html`<span class="material-symbols-rounded">check</span>` : s.n}</span>
          <span class="t">${s.title}<small>${subs[s.n]}</small></span>
        </button>`)}
      </nav>
      ${this.trainerError ? html`<div class="banner"><span class="material-symbols-rounded">warning</span>The trainer didn't answer: ${this.trainerError}</div>` : nothing}
      ${this.step === 1 ? this.renderKind() : this.step === 2 ? this.renderPictures() : this.step === 3 ? this.renderTags() : this.renderTrain()}
      ${this.error && this.step !== 4 ? html`<div class="banner"><span class="material-symbols-rounded">warning</span>${this.error}</div>` : nothing}
      ${this.renderNav()}
    `;
  }

  private renderNav() {
    const next = (this.step + 1) as Step;
    const why: Record<number, string> = {
      1: !this.preset ? "Pick a kind to go on" : !this.name.trim() ? "Give it a name to go on" : "",
      2: this.previewing ? "Looking at the set…" : !this.preview?.count ? "Add some pictures to go on" : "",
      3: "",
    };
    return html`<div class="navbar">
      ${this.step > 1
        ? html`<button class="btn" @click=${() => this.goTo((this.step - 1) as Step)}><span class="material-symbols-rounded">arrow_back</span> Back</button>`
        : nothing}
      <span class="spacer"></span>
      ${this.step < 4
        ? html`${why[this.step] ? html`<span class="hint">${why[this.step]}</span>` : nothing}
            <button class="btn primary" ?disabled=${!this.stepReady(next)} @click=${() => this.goTo(next)}>
              Next: ${STEPS[this.step].title} <span class="material-symbols-rounded">arrow_forward</span>
            </button>`
        : nothing}
    </div>`;
  }

  // Step 1 ------------------------------------------------------------------

  private renderKind() {
    const chosen = this.preset ? presetById(this.preset) : null;
    return html`
      <div class="card">
        <h3><span class="material-symbols-rounded">category</span> What should it learn?</h3>
        <p class="sub">Pick the closest. It sets everything technical for you — how the pictures are captioned, how long it trains — and all of it can be changed later.</p>
        <div class="presets">
          ${PRESETS.map((p) => html`<button class="preset ${this.preset === p.id ? "on" : ""}" @click=${() => this.choosePreset(p.id)}>
            <span class="ic"><span class="material-symbols-rounded">${p.icon}</span></span>
            <b>${p.title}</b>
            <span class="d">${p.blurb}</span>
            <span class="e">${p.examples} · ${p.pictures.ideal[0]}–${p.pictures.ideal[1]} pictures</span>
          </button>`)}
        </div>
        ${chosen
          ? html`<div class="banner info" style="margin-top:14px;"><span class="material-symbols-rounded">info</span>
              <div><b>Good pictures for ${chosen.title.toLowerCase().replace(/^an? /, "")}</b><ul class="tips" style="margin-top:4px;">${chosen.tips.map((t) => html`<li>${t}</li>`)}</ul></div>
            </div>`
          : nothing}
      </div>
      ${chosen
        ? html`<div class="card">
            <h3><span class="material-symbols-rounded">edit</span> Name it</h3>
            <p class="sub">The name is the file the generator lists it under. The trigger word is what you put in a prompt to call it up — one made-up word works best, so it means nothing to the checkpoint yet.</p>
            <div class="row">
              <div>
                <label class="field">Name</label>
                <input type="text" .value=${this.name} placeholder=${chosen.id === "style" ? "ink_style" : chosen.id === "character" ? "my_character" : "my_lora"}
                  @input=${(e: Event) => {
                    this.name = (e.target as HTMLInputElement).value;
                    if (!this.triggerTouched) this.trigger = triggerFrom(this.name);
                  }} />
              </div>
              <div>
                <label class="field">Trigger word</label>
                <input type="text" .value=${this.trigger} placeholder="mychar"
                  @input=${(e: Event) => {
                    this.trigger = (e.target as HTMLInputElement).value;
                    this.triggerTouched = true;
                  }} />
              </div>
            </div>
          </div>`
        : nothing}
    `;
  }

  // Step 2 ------------------------------------------------------------------

  private setSourceKind(kind: SourceKind) {
    if (kind === this.sourceKind) return;
    this.sourceKind = kind;
    if (kind === "upload" || kind === "x") return;
    this.sourceChanged();
  }

  private async gathered(collectionId: number) {
    this.gatheredInto = collectionId;
    await this.loadCollections(collectionId);
    this.sourceKind = "collection";
    this.sourceChanged();
  }

  private renderPictures() {
    const p = this.preview;
    const preset = presetById(this.preset || "custom");
    const advice = p
      ? datasetAdvice(preset, { count: p.count, untagged: p.untagged, small: this.smallCount(), captions: this.captions })
      : [];
    return html`
      <div class="card">
        <h3><span class="material-symbols-rounded">photo_library</span> Where are the pictures?</h3>
        <p class="sub">Use pictures already in your library, or bring new ones in — they're added to your library in a collection for this LoRA, and only the ones you keep.</p>
        <div class="seg">
          ${SOURCES.map((s) => html`<button class=${this.sourceKind === s.id ? "on" : ""} @click=${() => this.setSourceKind(s.id)}>
            <span class="material-symbols-rounded">${s.icon}</span>${s.title}
          </button>`)}
        </div>
        <div style="margin-top:14px;">${this.renderSourcePicker()}</div>
      </div>
      ${(this.sourceKind === "collection" || this.sourceKind === "tag") && (p || this.previewing)
        ? html`<div class="card">
            <div class="sethead">
              <h4>The set ${p ? html`· ${p.count} picture${p.count === 1 ? "" : "s"}${p.count >= p.limit ? html` <span class="muted">(the first ${p.limit})</span>` : nothing}` : nothing}</h4>
              ${this.previewing ? html`<md-circular-progress indeterminate style="--md-circular-progress-size:22px;"></md-circular-progress>` : nothing}
              ${this.exclude.length
                ? html`<button class="btn small ghost" @click=${() => this.bringBack()}><span class="material-symbols-rounded">undo</span> Bring back ${this.exclude.length} dropped</button>`
                : nothing}
            </div>
            <div class="advice">${advice.map((a) => html`<div class="banner ${a.level === "good" ? "good" : a.level === "warn" ? "info" : ""}">
              <span class="material-symbols-rounded">${a.level === "good" ? "check_circle" : a.level === "warn" ? "info" : "error"}</span>${a.text}</div>`)}</div>
            ${p?.items.length
              ? html`<div class="note">Drop anything that doesn't fit — blurry, cropped badly, or with someone else in it. Dropped pictures stay in your library.</div>
                  <div class="picks" style="margin-top:10px;">${p.items.map((i) => this.renderSetPicture(i))}</div>`
              : nothing}
          </div>`
        : nothing}
    `;
  }

  private renderSourcePicker() {
    const target = this.gatheredInto;
    const collectionName = `LoRA · ${this.name.trim() || "training"}`;
    switch (this.sourceKind) {
      case "collection":
        return this.collections.length
          ? html`<select @change=${(e: Event) => { this.collectionId = Number((e.target as HTMLSelectElement).value); this.sourceChanged(); }}>
              ${this.collections.map((c) => html`<option value=${String(c.id)} ?selected=${c.id === this.collectionId}>${c.name} (${c.count})</option>`)}
            </select>`
          : html`<div class="note">No collections yet — upload pictures or pick an X account, and one is made for you.</div>`;
      case "tag":
        return html`<input type="text" .value=${this.tag} placeholder="A tag in your library: a character's name, an artist, a style…"
          @input=${(e: Event) => { this.tag = (e.target as HTMLInputElement).value; this.sourceChanged(); }} />`;
      case "upload":
        return html`<oppai-lora-gather mode="upload" .collectionId=${target} .collectionName=${collectionName}
          @gathered=${(e: CustomEvent<{ collectionId: number }>) => this.gathered(e.detail.collectionId)}></oppai-lora-gather>`;
      case "x":
        return html`<oppai-lora-gather mode="x" .collectionId=${target} .collectionName=${this.name.trim() ? collectionName : ""}
          @gathered=${(e: CustomEvent<{ collectionId: number }>) => this.gathered(e.detail.collectionId)}></oppai-lora-gather>`;
    }
  }

  private renderSetPicture(i: TrainPreviewItem) {
    const min = minSideFor(this.baseFamily());
    const small = i.width && i.height && Math.min(i.width, i.height) < min;
    return html`<div class="pick on" style="outline-color:transparent;cursor:default;">
      <img src=${api.thumbURL(i.id)} alt="" loading="lazy" />
      <button class="drop" title="Drop from the set" @click=${() => this.dropPicture(i.id)}><span class="material-symbols-rounded">close</span></button>
      ${small ? html`<span class="badge">${i.width}×${i.height}</span>` : nothing}
    </div>`;
  }

  // Step 3 ------------------------------------------------------------------

  private renderTags() {
    const p = this.preview;
    if (!p) return nothing;
    const preset = presetById(this.preset || "custom");
    const task = this.tagTask;
    return html`
      <div class="two">
        <div class="card">
          <h3><span class="material-symbols-rounded">auto_awesome</span> Auto-tag</h3>
          <p class="sub">Every picture is captioned from its tags, so a picture with none teaches almost nothing. The tagger looks at each one and writes its tags into your library.</p>
          ${!this.tagger
            ? html`<div class="banner info"><span class="material-symbols-rounded">info</span>The tagger is off. Turn on AI tagging under Settings → AI, or tag pictures by hand below${this.captions === "tags" ? ", or caption with the trigger word alone" : ""}.</div>`
            : task
              ? html`<div class="note">Tagging ${task.done + task.failed} of ${task.total}…</div>
                  <div class="bar" style="margin-top:8px;"><div style="width:${task.total ? ((task.done + task.failed) / task.total) * 100 : 100}%"></div></div>`
              : html`<div class="banner ${p.untagged ? "info" : "good"}"><span class="material-symbols-rounded">${p.untagged ? "info" : "check_circle"}</span>
                    ${p.untagged ? `${p.untagged} of ${p.count} picture${p.count === 1 ? " has" : "s have"} no tags yet.` : "Every picture has tags."}</div>
                  <div class="row" style="margin-top:10px;flex-wrap:wrap;">
                    ${p.untagged
                      ? html`<button class="btn primary" style="flex:none;" @click=${() => this.autotag(false)}><span class="material-symbols-rounded">auto_awesome</span> Tag ${p.untagged} picture${p.untagged === 1 ? "" : "s"}</button>`
                      : nothing}
                    <button class="btn" style="flex:none;" @click=${() => this.autotag(true)}><span class="material-symbols-rounded">refresh</span> Re-tag all ${p.count}</button>
                  </div>
                  <div class="note">Re-tagging replaces what the tagger said before. Tags you typed yourself are kept.</div>`}
          ${this.tagNote ? html`<div class="banner"><span class="material-symbols-rounded">warning</span>${this.tagNote}</div>` : nothing}
        </div>
        <div class="card">
          <h3><span class="material-symbols-rounded">text_fields</span> Captions</h3>
          <div class="seg">
            <button class=${this.captions === "tags" ? "on" : ""} @click=${() => (this.captions = "tags")}>Trigger + tags</button>
            <button class=${this.captions === "trigger" ? "on" : ""} @click=${() => (this.captions = "trigger")}>Trigger only</button>
          </div>
          <div class="note">${this.captions === "trigger"
            ? "Every picture is captioned with the trigger word alone, so everything the pictures share — and much of what they don't — goes into it. Simple, but less flexible."
            : preset.captionsWhy}</div>
          ${p.items[0] ? html`<div class="caption">${this.caption(p.items[0])}</div>` : nothing}
        </div>
      </div>
      ${this.captions === "tags" && p.commonTags.length
        ? html`<div class="card">
            <h3><span class="material-symbols-rounded">label_off</span> What the trigger word stands for</h3>
            <p class="sub">The tags these pictures share, with how many have each. A struck tag is left out of every caption, so the trigger word learns it instead — strike what should always come with the LoRA, keep what you want to be able to change with the prompt.</p>
            ${this.suggested.length && !this.leaveOutTouched
              ? html`<div class="banner info"><span class="material-symbols-rounded">auto_fix_high</span>
                  <div>Struck for you: <b>${this.suggested.join(", ")}</b>. Click a tag to change it.</div></div>`
              : nothing}
            <div class="chips" style="margin-top:8px;">${p.commonTags.map((t) => {
              const out = this.leaveOut.some((x) => tagKey(x) === tagKey(t.name));
              return html`<button class="chip ${out ? "out" : ""}" @click=${() => { this.leaveOut = toggleTag(this.leaveOut, t.name); this.leaveOutTouched = true; }}>
                ${t.name} <b>${t.count}</b></button>`;
            })}</div>
          </div>`
        : nothing}
      <div class="card">
        <h3><span class="material-symbols-rounded">edit_note</span> Every picture</h3>
        <p class="sub">Each caption as it will be written. Click a picture to fix its tags or drop it from the set.</p>
        <div class="picks captions-grid">${p.items.map((i) => {
          const cap = this.caption(i);
          return html`<button class="pick cap ${i.tags.length ? "" : "bare"}" @click=${() => { this.editing = i.id; this.newTag = ""; }}>
            <img src=${api.thumbURL(i.id)} alt="" loading="lazy" />
            <span class="c">${i.tags.length || this.captions === "trigger" ? cap : "No tags"}</span>
          </button>`;
        })}</div>
      </div>
    `;
  }

  private renderEditor() {
    const items = this.preview?.items ?? [];
    const at = items.findIndex((i) => i.id === this.editing);
    const item = items[at];
    if (!item) return nothing;
    const go = (d: number) => {
      const next = items[(at + d + items.length) % items.length];
      if (next) {
        this.editing = next.id;
        this.newTag = "";
      }
    };
    return html`<div class="editor" @click=${(e: Event) => { if (e.target === e.currentTarget) this.closeEditor(); }}
      @keydown=${(e: KeyboardEvent) => { if (e.key === "Escape") this.closeEditor(); }}>
      <div class="panel">
        <div class="pic"><img src=${api.streamURL(item.id)} alt="" /></div>
        <div class="side">
          <div class="head">
            <b>Picture ${at + 1} of ${items.length}</b>
            <button class="btn small ghost" title="Previous" @click=${() => go(-1)}><span class="material-symbols-rounded">chevron_left</span></button>
            <button class="btn small ghost" title="Next" @click=${() => go(1)}><span class="material-symbols-rounded">chevron_right</span></button>
            <button class="btn small ghost" title="Close" @click=${() => this.closeEditor()}><span class="material-symbols-rounded">close</span></button>
          </div>
          <label class="field">Tags <span class="muted" style="font-weight:400;">— outlined ones you typed; struck ones are left out of every caption</span></label>
          <div class="chips">
            ${item.tags.length
              ? item.tags.map((t) => {
                  const out = this.leaveOut.some((x) => tagKey(x) === tagKey(t.name));
                  return html`<span class="chip ${t.manual ? "manual" : ""} ${out ? "out" : ""}">${t.name}
                    <button class="x" title="Remove this tag" @click=${() => this.removeTag(item, t.name)}><span class="material-symbols-rounded">close</span></button></span>`;
                })
              : html`<span class="note" style="margin:0;">No tags yet.</span>`}
          </div>
          <form @submit=${(e: Event) => { e.preventDefault(); void this.addTag(item); }}>
            <input type="text" placeholder="Add tags, separated by commas" .value=${this.newTag}
              @input=${(e: Event) => (this.newTag = (e.target as HTMLInputElement).value)} />
            <button class="btn tonal" type="submit" ?disabled=${!this.newTag.trim()}><span class="material-symbols-rounded">add</span> Add</button>
          </form>
          <label class="field">Caption</label>
          <div class="caption" style="margin:0;">${this.caption(item) || html`<span class="muted">empty</span>`}</div>
          <div class="note">Tags are saved to the picture in your library as you change them.</div>
          <div style="margin-top:auto;display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn danger" @click=${() => { const next = items[at + 1] ?? items[at - 1]; this.dropPicture(item.id); if (next && next.id !== item.id) this.editing = next.id; }}>
              <span class="material-symbols-rounded">delete</span> Drop from the set
            </button>
          </div>
        </div>
      </div>
    </div>`;
  }

  // Step 4 ------------------------------------------------------------------

  private renderTrain() {
    const p = this.preview;
    const preset = presetById(this.preset || "custom");
    const steps = estimateSteps(p?.count ?? 0, this.epochs, this.repeats);
    const canStart = !!this.name.trim() && !!this.base && !this.starting && !this.trainerError && !!p?.count;
    const vramGB = this.trainer?.vramMB ? Math.round(this.trainer.vramMB / 1024) : 0;
    return html`
      <div class="two">
        <div class="card">
          <h3><span class="material-symbols-rounded">deployed_code</span> Train against</h3>
          <p class="sub">A LoRA works on the family it was trained on: one trained on a Pony checkpoint suits Pony and its merges, not SD 1.5. Pick the checkpoint you'll generate with.</p>
          <select @change=${(e: Event) => (this.base = (e.target as HTMLSelectElement).value)}>
            ${!this.base ? html`<option value="">Choose a checkpoint</option>` : nothing}
            ${this.models.map((m) => html`<option value=${m.title} ?selected=${m.title === this.base}>${m.model_name || m.title}${m.base ? ` · ${m.base}` : ""}</option>`)}
          </select>

          <label class="field">How long</label>
          <div class="seg">
            ${EFFORTS.map((e) => html`<button class=${this.effort === e.id ? "on" : ""} title=${e.blurb} @click=${() => this.chooseEffort(e.id)}>${e.title}</button>`)}
          </div>
          <div class="note">${EFFORTS.find((e) => e.id === this.effort)?.blurb}.</div>

          <label class="check">
            <input type="checkbox" .checked=${this.freeGpu} @change=${(e: Event) => (this.freeGpu = (e.target as HTMLInputElement).checked)} />
            <span>Free the generator's GPU while training<small>Asks the generator to unload its checkpoint when training starts, and to load it again after. Leave on if they share a card.</small></span>
          </label>
          <label class="check">
            <input type="checkbox" .checked=${this.samples} @change=${(e: Event) => (this.samples = (e.target as HTMLInputElement).checked)} />
            <span>Render a sample at the end<small>A picture made with the new LoRA, which becomes its cover.</small></span>
          </label>
          <label class="check">
            <input type="checkbox" .checked=${this.lowVram} @change=${(e: Event) => { this.lowVram = (e.target as HTMLInputElement).checked; this.lowVramTouched = true; }} />
            <span>Low VRAM${vramGB ? ` (the trainer's card has ${vramGB} GB)` : ""}<small>For a card under 12 GB with SDXL: trains at 768 and leaves the text encoder alone.</small></span>
          </label>
        </div>
        <div class="card">
          <h3><span class="material-symbols-rounded">steps</span> Summary</h3>
          <div class="summary">
            <div class="stat"><small>Kind</small><b>${preset.title.replace(/^An? /, "").replace(/^./, (c) => c.toUpperCase())}</b></div>
            <div class="stat"><small>Pictures</small><b>${p?.count ?? 0}</b></div>
            <div class="stat"><small>Trigger word</small><b>${this.trigger || "—"}</b></div>
            <div class="stat"><small>Training steps</small><b>≈ ${steps.toLocaleString()}</b></div>
          </div>
          ${p?.items[0] ? html`<label class="field">A caption</label><div class="caption" style="margin:0;">${this.caption(p.items[0])}</div>` : nothing}
          <div class="note">${this.epochs} passes over the set (epochs), each picture shown ${this.repeats || (p ? Math.max(1, Math.round(steps / Math.max(1, p.count * this.epochs))) : 0)}× a pass.</div>
          <button class="btn ghost" style="margin-top:10px;" @click=${() => (this.advanced = !this.advanced)}>
            <span class="material-symbols-rounded">${this.advanced ? "expand_less" : "tune"}</span> ${this.advanced ? "Hide" : "Show"} the settings
          </button>
          ${this.advanced ? this.renderAdvanced() : nothing}
        </div>
      </div>
      ${this.error ? html`<div class="banner"><span class="material-symbols-rounded">warning</span>${this.error}</div>` : nothing}
      <div class="card" style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
        <div class="note" style="margin:0;flex:1;min-width:220px;">The pictures are decrypted and sent to the trainer, which deletes them the moment training ends. The finished LoRA installs itself into the generator — this screen can be closed while it trains.</div>
        <button class="btn primary" style="padding:10px 22px;font-size:14px;" ?disabled=${!canStart} @click=${() => this.start()}>
          <span class="material-symbols-rounded">model_training</span> ${this.starting ? "Starting…" : "Start training"}
        </button>
      </div>
    `;
  }

  private renderAdvanced() {
    const num = (value: number, set: (n: number) => void, opts: { min: number; max: number; step?: number; placeholder?: string }) =>
      html`<input type="number" min=${opts.min} max=${opts.max} step=${opts.step ?? 1} .value=${value ? String(value) : ""}
        placeholder=${opts.placeholder ?? "Auto"} @input=${(e: Event) => set(Number((e.target as HTMLInputElement).value) || 0)} />`;
    return html`
      <div class="row" style="margin-top:6px;">
        <div><label class="field">Epochs</label>${num(this.epochs, (n) => (this.epochs = n), { min: 1, max: 100, placeholder: "10" })}</div>
        <div><label class="field">Repeats</label>${num(this.repeats, (n) => (this.repeats = n), { min: 1, max: 100 })}</div>
      </div>
      <div class="row">
        <div><label class="field">Rank</label>${num(this.rank, (n) => (this.rank = n), { min: 1, max: 128, placeholder: "16 (SDXL) / 32" })}</div>
        <div><label class="field">Alpha</label>${num(this.alpha, (n) => (this.alpha = n), { min: 0, max: 128, step: 0.5, placeholder: "Half the rank" })}</div>
      </div>
      <div class="row">
        <div><label class="field">Learning rate</label>${num(this.learningRate, (n) => (this.learningRate = n), { min: 0, max: 1, step: 0.00001, placeholder: "0.0001" })}</div>
        <div><label class="field">Text encoder rate</label>${num(this.textEncoderLr, (n) => (this.textEncoderLr = n), { min: 0, max: 1, step: 0.00001, placeholder: "Half the rate" })}</div>
      </div>
      <div class="row">
        <div><label class="field">Resolution</label>${num(this.resolution, (n) => (this.resolution = n), { min: 256, max: 2048, step: 64, placeholder: "1024 (SDXL) / 512" })}</div>
        <div><label class="field">Noise offset</label>${num(this.noiseOffset, (n) => (this.noiseOffset = n), { min: 0, max: 1, step: 0.01, placeholder: "None" })}</div>
      </div>
      <label class="field">Optimizer</label>
      <select @change=${(e: Event) => (this.optimizer = (e.target as HTMLSelectElement).value)}>
        ${["AdamW8bit", "AdamW", "Prodigy", "Adafactor", "Lion"].map((o) => html`<option value=${o} ?selected=${o === this.optimizer}>${o}</option>`)}
      </select>
      <label class="check">
        <input type="checkbox" .checked=${this.flip} @change=${(e: Event) => (this.flip = (e.target as HTMLInputElement).checked)} />
        <span>Mirror the pictures<small>Doubles a small set; leave off for anything asymmetric — a scar, a side parting, text.</small></span>
      </label>
      <div class="note">Prodigy sets its own learning rate. Repeats are worked out from the number of pictures when left blank — some two hundred steps a pass. Noise offset helps a style with very dark or very bright pictures.</div>
    `;
  }

  // Runs --------------------------------------------------------------------

  private renderRuns() {
    if (!this.runs.length) {
      return html`<div class="card empty">
        <span class="material-symbols-rounded">history</span>No runs yet. Set one up under <b>New LoRA</b>; it carries on with this screen closed.
        <div style="margin-top:12px;"><button class="btn primary" @click=${() => (this.tab = "new")}><span class="material-symbols-rounded">add</span> New LoRA</button></div>
      </div>`;
    }
    return html`
      ${this.error ? html`<div class="banner"><span class="material-symbols-rounded">warning</span>${this.error}</div>` : nothing}
      <div class="runs">${this.runs.map((t) => this.renderRun(t))}</div>`;
  }

  private renderRun(t: Training) {
    const fraction = trainingFraction(t);
    const live = trainingActive(t);
    const sample = t.samples?.length ? [...t.samples].sort()[t.samples.length - 1] : "";
    const preset = t.request?.preset ? presetById(t.request.preset) : null;
    return html`<div class="run">
      ${sample
        ? html`<img src=${api.trainSampleURL(t.id, sample)} alt="Sample" />`
        : t.status === "done"
          ? html`<div class="ph"><span class="material-symbols-rounded">${preset?.icon ?? "model_training"}</span>
              <img src=${api.loraThumbURL(t.name)} alt="" @error=${(e: Event) => (e.target as HTMLImageElement).remove()} /></div>`
          : html`<div class="ph"><span class="material-symbols-rounded">${preset?.icon ?? "model_training"}</span></div>`}
      <div class="body">
        <div class="run-head">
          <span class="name" title=${t.name}>${t.name}</span>
          <span class="spacer"></span>
          <span class="status ${t.status}">${t.status}</span>
        </div>
        <div class="line">${trainingLine(t)}</div>
        ${live ? html`<div class="bar ${fraction === null ? "unknown" : ""}"><div style=${fraction === null ? "" : `width:${(fraction * 100).toFixed(1)}%`}></div></div>` : nothing}
        <div class="meta">
          ${preset ? html`<span>${preset.title}</span>` : nothing}
          ${t.trigger ? html`<span>Trigger <b>${t.trigger}</b></span>` : nothing}
          <span>${t.images} pictures</span>
          <span>${t.baseModel}${t.family ? ` (${t.family === "sdxl" ? "SDXL" : "SD 1.5"})` : ""}</span>
          <span>${new Date(t.createdAt * 1000).toLocaleString()}</span>
        </div>
        ${t.status === "done" ? html`<div class="note">Installed — pick it under LoRAs in the studio${t.trigger ? html`, and put <b>${t.trigger}</b> in the prompt` : ""}.</div>` : nothing}
        ${this.openLog === t.id && t.log?.length ? html`<pre class="log">${t.log.join("\n")}</pre>` : nothing}
        <div class="run-actions">
          ${live && t.status !== "installing"
            ? html`<button class="btn small danger" @click=${() => this.cancel(t)}><span class="material-symbols-rounded">stop</span> Stop</button>`
            : nothing}
          ${t.status === "done"
            ? html`<button class="btn small tonal" @click=${() => this.compare(t)}><span class="material-symbols-rounded">compare</span> Compare</button>`
            : nothing}
          ${t.log?.length
            ? html`<button class="btn small" @click=${() => (this.openLog = this.openLog === t.id ? 0 : t.id)}>
                <span class="material-symbols-rounded">terminal</span> ${this.openLog === t.id ? "Hide log" : "Log"}</button>`
            : nothing}
          ${!live && t.request
            ? html`<button class="btn small" @click=${() => this.again(t)}><span class="material-symbols-rounded">replay</span> Train again</button>`
            : nothing}
          ${!live
            ? html`<button class="btn small ghost" @click=${() => this.forget(t)}><span class="material-symbols-rounded">delete</span> Remove</button>`
            : nothing}
        </div>
      </div>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oppai-lora-train": OppaiLoraTrain;
  }
}
