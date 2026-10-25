import "@material/web/progress/circular-progress.js";
import { LitElement, html, css, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { iconStyles, motionStyles } from "../theme.js";
import {
  api,
  type Collection,
  type GenModel,
  type TrainerHealth,
  type Training,
  type TrainPreview,
  type TrainRequest,
} from "../api.js";
import { toggleTag, trainingActive, trainingFraction, trainingLine, triggerFrom } from "../train-progress.js";

/**
 * Training a LoRA on the library's own pictures.
 *
 * The training runs on the trainer — its own container on the box with the GPU —
 * and the server follows it from start to installed (backend/internal/api/
 * lora_training.go), so this screen is a form to start a run and a window onto the
 * runs there are: closing it, or the browser, stops nothing. A run picks its
 * pictures from a collection or a tag, captions them with their tags behind the
 * trigger word, and the preview shows what it would be trained on — the pictures,
 * the tags they share, a caption as written — before anything is sent. The shared
 * tags are the ones worth leaving out: a tag in every caption is learnt as that
 * tag, not as the trigger word.
 *
 * The host mounts it conditionally; closing dispatches "close", and a run that
 * installs dispatches "trained" so the studio can list the new LoRA.
 */

type SourceKind = "collection" | "tag";

@customElement("oppai-lora-train")
export class OppaiLoraTrain extends LitElement {
  /** The generator's checkpoints, to train against. */
  @property({ attribute: false }) models: GenModel[] = [];
  /** The checkpoint picked in the studio, the default base. */
  @property() checkpoint = "";

  @state() private configured = true;
  @state() private trainer: TrainerHealth | null = null;
  @state() private trainerError = "";
  @state() private runs: Training[] = [];
  @state() private loaded = false;

  @state() private name = "";
  @state() private trigger = "";
  @state() private triggerTouched = false;
  @state() private base = "";
  @state() private sourceKind: SourceKind = "collection";
  @state() private collections: Collection[] = [];
  @state() private collectionId = 0;
  @state() private tag = "";
  @state() private captions: "tags" | "trigger" = "tags";
  @state() private leaveOut: string[] = [];
  @state() private preview: TrainPreview | null = null;
  @state() private previewing = false;
  @state() private advanced = false;
  @state() private epochs = 10;
  @state() private repeats = 0;
  @state() private rank = 0;
  @state() private resolution = 0;
  @state() private learningRate = 0.0001;
  @state() private optimizer = "AdamW8bit";
  @state() private lowVram = false;
  @state() private flip = false;
  @state() private freeGpu = true;
  @state() private samples = true;
  @state() private starting = false;
  @state() private error = "";
  @state() private openLog = 0;

  private timer = 0;
  private installed = new Set<number>();

  static styles = [
    iconStyles,
    motionStyles,
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
      .wrap { max-width: 1240px; margin: 0 auto; padding: 18px 16px 60px; }
      .topbar {
        display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
        position: sticky; top: 0; z-index: 2;
        background: var(--oppai-bg, #141218); padding: 8px 0 12px;
      }
      .topbar h2 { margin: 0; font-size: 17px; display: inline-flex; align-items: center; gap: 8px; }
      .trainer { font-size: 12px; color: var(--oppai-text-dim); display: inline-flex; align-items: center; gap: 6px; }
      .trainer .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--oppai-primary); }
      .trainer .dot.busy { background: #e8b04a; }
      .trainer .dot.off { background: var(--oppai-error, #f2b8b5); }
      .btn {
        border: none; background: var(--oppai-surface-2); color: var(--oppai-text); border-radius: 10px;
        font: inherit; font-size: 13px; padding: 8px 14px; cursor: pointer;
        display: inline-flex; align-items: center; gap: 6px;
      }
      .btn:disabled { opacity: 0.5; cursor: default; }
      .btn.primary { background: var(--oppai-primary); color: var(--oppai-on-primary, #1d1b20); font-weight: 600; }
      .btn.danger { color: var(--oppai-error, #f2b8b5); }
      .btn .material-symbols-rounded { font-size: 17px; }
      .close { margin-left: auto; }
      .grid { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: 18px; align-items: start; }
      @media (max-width: 900px) { .grid { grid-template-columns: minmax(0, 1fr); } }
      .card { background: var(--oppai-surface); border: 1px solid var(--oppai-border); border-radius: 16px; padding: 16px; }
      .card h3 { margin: 0 0 12px; font-size: 15px; }
      label.field { display: block; font-size: 12px; color: var(--oppai-text-dim); margin: 12px 0 5px; }
      .card h3 + .row label.field, .card h3 + .banner + .row label.field { margin-top: 0; }
      input[type="text"], input[type="number"], select {
        width: 100%; box-sizing: border-box; background: var(--oppai-bg, #141218);
        border: 1px solid var(--oppai-border-strong); border-radius: 10px; color: var(--oppai-text);
        font: inherit; font-size: 14px; padding: 8px 10px; outline: none;
      }
      input:focus, select:focus { border-color: var(--oppai-primary); }
      .row { display: flex; gap: 10px; flex-wrap: wrap; }
      .row > * { flex: 1; min-width: 120px; }
      .seg { display: inline-flex; background: var(--oppai-bg, #141218); border-radius: 10px; padding: 3px; gap: 2px; }
      .seg button {
        border: none; background: none; color: var(--oppai-text-dim); font: inherit; font-size: 13px;
        padding: 6px 12px; border-radius: 8px; cursor: pointer;
      }
      .seg button.on { background: var(--oppai-surface-2); color: var(--oppai-text); font-weight: 600; }
      .check { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; margin-top: 10px; cursor: pointer; }
      .check input { margin-top: 2px; }
      .check small { display: block; color: var(--oppai-text-dim); font-size: 12px; }
      .note { font-size: 12px; color: var(--oppai-text-dim); line-height: 1.45; margin-top: 8px; }
      .banner {
        background: color-mix(in srgb, var(--oppai-error, #f2b8b5) 16%, transparent);
        color: var(--oppai-text); border-radius: 12px; padding: 10px 12px; font-size: 13px; margin: 10px 0;
      }
      .thumbs { display: grid; grid-template-columns: repeat(auto-fill, minmax(64px, 1fr)); gap: 6px; margin: 10px 0; }
      .thumbs img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 8px; background: var(--oppai-surface-2); }
      .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
      .tag {
        border: 1px solid var(--oppai-border-strong); background: transparent; color: var(--oppai-text);
        border-radius: 999px; font: inherit; font-size: 12px; padding: 4px 10px; cursor: pointer;
      }
      .tag b { color: var(--oppai-text-dim); font-weight: 400; margin-left: 4px; }
      .tag.out { text-decoration: line-through; color: var(--oppai-text-dim); border-style: dashed; }
      .caption {
        font-family: ui-monospace, monospace; font-size: 12px; background: var(--oppai-bg, #141218);
        border-radius: 10px; padding: 8px 10px; margin-top: 8px; word-break: break-word;
      }
      .actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; flex-wrap: wrap; }
      .runs { display: flex; flex-direction: column; gap: 10px; }
      .run { background: var(--oppai-surface); border: 1px solid var(--oppai-border); border-radius: 14px; padding: 12px 14px; }
      .run-head { display: flex; align-items: center; gap: 10px; }
      .run-head .name { font-weight: 600; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .run-head .spacer { flex: 1; }
      .status { font-size: 11px; padding: 2px 8px; border-radius: 999px; background: var(--oppai-surface-2); white-space: nowrap; }
      .status.done { background: color-mix(in srgb, var(--oppai-primary) 25%, transparent); }
      .status.failed { background: color-mix(in srgb, var(--oppai-error, #f2b8b5) 25%, transparent); }
      .line { font-size: 12px; color: var(--oppai-text-dim); margin-top: 6px; word-break: break-word; }
      .meta { font-size: 11px; color: var(--oppai-text-dim); margin-top: 4px; }
      .bar { height: 6px; border-radius: 3px; background: var(--oppai-surface-2); overflow: hidden; margin-top: 8px; }
      .bar > div { height: 100%; background: var(--oppai-primary); transition: width 0.6s ease; }
      .bar.unknown > div { width: 30%; animation: slide 1.4s ease-in-out infinite; }
      @keyframes slide { from { margin-left: -30%; } to { margin-left: 100%; } }
      .run-body { display: flex; gap: 12px; margin-top: 10px; align-items: flex-start; }
      .run-body img { width: 96px; height: 96px; object-fit: cover; border-radius: 10px; flex: none; }
      .run-actions { display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap; }
      .run-actions .btn { padding: 6px 10px; font-size: 12px; }
      pre.log {
        font-size: 11px; background: var(--oppai-bg, #141218); border-radius: 10px; padding: 8px 10px;
        max-height: 220px; overflow: auto; white-space: pre-wrap; word-break: break-word; margin: 8px 0 0;
      }
      .empty { text-align: center; color: var(--oppai-text-dim); padding: 40px 16px; font-size: 14px; line-height: 1.5; }
      .empty .material-symbols-rounded { font-size: 40px; display: block; margin-bottom: 8px; }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    void this.refresh();
    void api.listCollections().then((r) => {
      this.collections = r.items;
      if (!this.collectionId && r.items.length) this.collectionId = r.items[0].id;
    }).catch(() => undefined);
  }

  protected willUpdate(changed: PropertyValues<this>) {
    // The studio's checkpoint is the default base, once it is known.
    if (changed.has("checkpoint") && !this.base) this.base = this.checkpoint;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.clearTimeout(this.timer);
  }

  /** Reads the runs, again in a few seconds while any is going. */
  private async refresh() {
    window.clearTimeout(this.timer);
    try {
      const r = await api.trainList();
      this.configured = r.configured;
      this.trainer = r.trainer ?? null;
      this.trainerError = r.trainerError ?? "";
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

  private source() {
    return this.sourceKind === "collection" ? { collectionId: this.collectionId } : { tag: this.tag.trim() };
  }

  private async loadPreview() {
    if (this.previewing) return;
    if (this.sourceKind === "tag" && !this.tag.trim()) {
      this.error = "Type the tag to train on";
      return;
    }
    this.previewing = true;
    this.error = "";
    try {
      this.preview = await api.trainPreview({
        source: this.source(), trigger: this.trigger, captions: this.captions, leaveOut: this.leaveOut,
      });
    } catch (e) {
      this.error = (e as Error).message;
      this.preview = null;
    } finally {
      this.previewing = false;
    }
  }

  private async start() {
    if (this.starting) return;
    this.starting = true;
    this.error = "";
    const req: TrainRequest = {
      name: this.name.trim(),
      trigger: this.trigger.trim(),
      base: this.base,
      source: this.source(),
      captions: this.captions,
      leaveOut: this.leaveOut,
      epochs: this.epochs || undefined,
      repeats: this.repeats || undefined,
      rank: this.rank || undefined,
      resolution: this.resolution || undefined,
      learningRate: this.learningRate || undefined,
      optimizer: this.optimizer,
      lowVram: this.lowVram,
      flip: this.flip,
      freeGpu: this.freeGpu,
      samples: this.samples,
    };
    try {
      await api.trainStart(req);
      this.preview = null;
      await this.refresh();
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.starting = false;
    }
  }

  /** Fills the form with a past run's settings. */
  private again(t: Training) {
    const r = t.request;
    if (!r) return;
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
    this.captions = r.captions ?? "tags";
    this.leaveOut = r.leaveOut ?? [];
    this.epochs = r.epochs ?? 10;
    this.repeats = r.repeats ?? 0;
    this.rank = r.rank ?? 0;
    this.resolution = r.resolution ?? 0;
    this.learningRate = r.learningRate ?? 0.0001;
    this.optimizer = r.optimizer ?? "AdamW8bit";
    this.lowVram = !!r.lowVram;
    this.flip = !!r.flip;
    this.freeGpu = r.freeGpu ?? true;
    this.samples = r.samples ?? true;
    this.preview = null;
    this.renderRoot.querySelector(".wrap")?.scrollIntoView({ behavior: "smooth" });
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

  render() {
    return html`
      <div class="wrap">
        <div class="topbar">
          <h2><span class="material-symbols-rounded">model_training</span> Train a LoRA</h2>
          ${this.renderTrainer()}
          <button class="btn close" @click=${() => this.dispatchEvent(new CustomEvent("close"))}>
            <span class="material-symbols-rounded">close</span> Back to studio
          </button>
        </div>
        ${!this.loaded
          ? html`<div class="empty"><md-circular-progress indeterminate></md-circular-progress></div>`
          : !this.configured
            ? this.renderNotSetUp()
            : html`<div class="grid">${this.renderForm()}${this.renderRuns()}</div>`}
      </div>
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
    return html`<div class="empty">
      <span class="material-symbols-rounded">model_training</span>
      LoRAs are trained by the OppaiLib trainer, a container of its own on the box with the GPU<br />
      (<code>ghcr.io/noneye-byte/oppailib-trainer</code>; the Unraid template is <code>oppailib-trainer.xml</code>).<br />
      Once it is running, put its address and token under <strong>Settings → Image generation</strong>.
    </div>`;
  }

  private renderForm() {
    const checkpoints = this.models;
    const canStart = !!this.name.trim() && !!this.base && !this.starting && !this.trainerError &&
      (this.sourceKind === "collection" ? this.collectionId > 0 : !!this.tag.trim());
    return html`<div class="card">
      <h3>New LoRA</h3>
      ${this.trainerError ? html`<div class="banner">The trainer didn't answer: ${this.trainerError}</div>` : nothing}
      <div class="row">
        <div>
          <label class="field">Name</label>
          <input type="text" .value=${this.name} placeholder="ink_style"
            @input=${(e: Event) => {
              this.name = (e.target as HTMLInputElement).value;
              if (!this.triggerTouched) this.trigger = triggerFrom(this.name);
            }} />
        </div>
        <div>
          <label class="field">Trigger word</label>
          <input type="text" .value=${this.trigger} placeholder="inkstyle"
            @input=${(e: Event) => {
              this.trigger = (e.target as HTMLInputElement).value;
              this.triggerTouched = true;
            }} />
        </div>
      </div>
      <label class="field">Train against</label>
      <select .value=${this.base} @change=${(e: Event) => (this.base = (e.target as HTMLSelectElement).value)}>
        ${!this.base ? html`<option value="">Choose a checkpoint</option>` : nothing}
        ${checkpoints.map((m) => html`<option value=${m.title} ?selected=${m.title === this.base}>${m.model_name || m.title}</option>`)}
      </select>
      <div class="note">A LoRA works on the family it was trained on: one trained on a Pony checkpoint suits Pony and its merges.</div>

      <label class="field">Pictures</label>
      <div class="seg">
        <button class=${this.sourceKind === "collection" ? "on" : ""} @click=${() => { this.sourceKind = "collection"; this.preview = null; }}>A collection</button>
        <button class=${this.sourceKind === "tag" ? "on" : ""} @click=${() => { this.sourceKind = "tag"; this.preview = null; }}>Everything tagged</button>
      </div>
      <div style="margin-top:8px;">
        ${this.sourceKind === "collection"
          ? this.collections.length
            ? html`<select .value=${String(this.collectionId)}
                @change=${(e: Event) => { this.collectionId = Number((e.target as HTMLSelectElement).value); this.preview = null; }}>
                ${this.collections.map((c) => html`<option value=${String(c.id)} ?selected=${c.id === this.collectionId}>${c.name} (${c.count})</option>`)}
              </select>`
            : html`<div class="note">No collections yet — gather the pictures into one in the library first, or train on a tag.</div>`
          : html`<input type="text" .value=${this.tag} placeholder="character name, style, …"
              @input=${(e: Event) => { this.tag = (e.target as HTMLInputElement).value; this.preview = null; }} />`}
      </div>

      <label class="field">Captions</label>
      <div class="seg">
        <button class=${this.captions === "tags" ? "on" : ""} @click=${() => { this.captions = "tags"; this.preview = null; }}>Trigger + tags</button>
        <button class=${this.captions === "trigger" ? "on" : ""} @click=${() => { this.captions = "trigger"; this.preview = null; }}>Trigger only</button>
      </div>
      <div class="note">Trigger + tags suits a character or a concept; trigger only folds everything the pictures share into the word, which suits a style.</div>

      <div class="actions" style="justify-content:flex-start;">
        <button class="btn" ?disabled=${this.previewing} @click=${() => this.loadPreview()}>
          <span class="material-symbols-rounded">visibility</span> ${this.previewing ? "Looking…" : this.preview ? "Look again" : "See what it trains on"}
        </button>
      </div>
      ${this.preview ? this.renderPreview(this.preview) : nothing}

      <label class="check">
        <input type="checkbox" .checked=${this.freeGpu} @change=${(e: Event) => (this.freeGpu = (e.target as HTMLInputElement).checked)} />
        <span>Free the generator's GPU while training<small>Asks the generator to unload its checkpoint when training starts, and to load it again after.</small></span>
      </label>
      <label class="check">
        <input type="checkbox" .checked=${this.samples} @change=${(e: Event) => (this.samples = (e.target as HTMLInputElement).checked)} />
        <span>Render a sample at the end<small>A picture made with the new LoRA, which becomes its cover.</small></span>
      </label>
      <label class="check">
        <input type="checkbox" .checked=${this.lowVram} @change=${(e: Event) => (this.lowVram = (e.target as HTMLInputElement).checked)} />
        <span>Low VRAM<small>For a card under 12 GB: trains at 768 and leaves the text encoder alone.</small></span>
      </label>

      <button class="btn" style="margin-top:12px;" @click=${() => (this.advanced = !this.advanced)}>
        <span class="material-symbols-rounded">${this.advanced ? "expand_less" : "expand_more"}</span> Training settings
      </button>
      ${this.advanced ? this.renderAdvanced() : nothing}

      ${this.error ? html`<div class="banner">${this.error}</div>` : nothing}
      <div class="actions">
        <button class="btn primary" ?disabled=${!canStart} @click=${() => this.start()}>
          <span class="material-symbols-rounded">model_training</span> ${this.starting ? "Starting…" : "Start training"}
        </button>
      </div>
      <div class="note">The pictures are decrypted and sent to the trainer, which deletes them the moment training ends. The finished LoRA is installed into the generator by itself — this screen can be closed.</div>
    </div>`;
  }

  private renderPreview(p: TrainPreview) {
    if (!p.count) return html`<div class="banner">There are no pictures there to train on (GIFs and videos are left out).</div>`;
    return html`
      <div class="note">${p.count} picture${p.count === 1 ? "" : "s"}${p.count >= p.limit ? ` (the first ${p.limit})` : ""}.
        Each is shown ${this.repeats || p.suggestedRepeats}× an epoch.${p.count < 10 ? " Ten or more train a steadier LoRA." : ""}</div>
      <div class="thumbs">${p.mediaIds.map((id) => html`<img loading="lazy" src=${api.thumbURL(id)} alt="" />`)}</div>
      ${this.captions === "tags" && p.commonTags.length
        ? html`<div class="note">The tags they share. Strike out what the trigger word should stand for — her hair, her eyes, the style's medium — and it is learnt as the trigger rather than as the tag:</div>
            <div class="tags">${p.commonTags.map((t) => {
              const out = this.leaveOut.some((x) => x.toLowerCase() === t.name.toLowerCase());
              return html`<button class="tag ${out ? "out" : ""}" @click=${() => { this.leaveOut = toggleTag(this.leaveOut, t.name); void this.loadPreview(); }}>
                ${t.name}<b>${t.count}</b></button>`;
            })}</div>`
        : nothing}
      ${p.exampleCaption ? html`<div class="caption">${p.exampleCaption}</div>` : nothing}
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
        <div><label class="field">Rank</label>${num(this.rank, (n) => (this.rank = n), { min: 1, max: 128, placeholder: "16 (SDXL) / 32" })}</div>
      </div>
      <div class="row">
        <div><label class="field">Resolution</label>${num(this.resolution, (n) => (this.resolution = n), { min: 256, max: 2048, step: 64, placeholder: "1024 (SDXL) / 512" })}</div>
        <div><label class="field">Learning rate</label>${num(this.learningRate, (n) => (this.learningRate = n), { min: 0, max: 1, step: 0.00001, placeholder: "0.0001" })}</div>
        <div>
          <label class="field">Optimizer</label>
          <select .value=${this.optimizer} @change=${(e: Event) => (this.optimizer = (e.target as HTMLSelectElement).value)}>
            ${["AdamW8bit", "AdamW", "Prodigy", "Adafactor", "Lion"].map((o) => html`<option value=${o} ?selected=${o === this.optimizer}>${o}</option>`)}
          </select>
        </div>
      </div>
      <label class="check">
        <input type="checkbox" .checked=${this.flip} @change=${(e: Event) => (this.flip = (e.target as HTMLInputElement).checked)} />
        <span>Mirror the pictures<small>Doubles a small set; leave off for anything asymmetric — a scar, a side parting, text.</small></span>
      </label>
      <div class="note">Prodigy sets its own learning rate. Some two hundred steps an epoch is the aim: repeats are worked out from the number of pictures when left blank.</div>
    `;
  }

  private renderRuns() {
    return html`<div>
      <div class="runs">
        ${this.runs.length === 0
          ? html`<div class="card empty" style="padding:30px 16px;">
              <span class="material-symbols-rounded">history</span>Runs appear here, and carry on with this screen closed.
            </div>`
          : this.runs.map((t) => this.renderRun(t))}
      </div>
    </div>`;
  }

  private renderRun(t: Training) {
    const fraction = trainingFraction(t);
    const live = trainingActive(t);
    const sample = t.samples?.length ? t.samples[t.samples.length - 1] : "";
    return html`<div class="run">
      <div class="run-head">
        <span class="name" title=${t.name}>${t.name}</span>
        ${t.trigger ? html`<span class="meta" style="margin:0;">${t.trigger}</span>` : nothing}
        <span class="spacer"></span>
        <span class="status ${t.status}">${t.status}</span>
      </div>
      <div class="line">${trainingLine(t)}</div>
      ${live ? html`<div class="bar ${fraction === null ? "unknown" : ""}"><div style=${fraction === null ? "" : `width:${(fraction * 100).toFixed(1)}%`}></div></div>` : nothing}
      <div class="meta">${t.images} pictures · ${t.baseModel}${t.family ? ` (${t.family === "sdxl" ? "SDXL" : "SD 1.5"})` : ""} · ${new Date(t.createdAt * 1000).toLocaleString()}</div>
      ${sample || (t.status === "done" && t.modelKey)
        ? html`<div class="run-body">
            ${sample ? html`<img src=${api.trainSampleURL(t.id, sample)} alt="Sample" />` : nothing}
            ${t.status === "done" ? html`<div class="note" style="margin:0;">Installed — pick it under LoRAs${t.trigger ? html`, and put <b>${t.trigger}</b> in the prompt` : ""}.</div>` : nothing}
          </div>`
        : nothing}
      ${this.openLog === t.id && t.log?.length ? html`<pre class="log">${t.log.join("\n")}</pre>` : nothing}
      <div class="run-actions">
        ${live && t.status !== "installing"
          ? html`<button class="btn danger" @click=${() => this.cancel(t)}><span class="material-symbols-rounded">stop</span> Stop</button>`
          : nothing}
        ${t.log?.length
          ? html`<button class="btn" @click=${() => (this.openLog = this.openLog === t.id ? 0 : t.id)}>
              <span class="material-symbols-rounded">terminal</span> ${this.openLog === t.id ? "Hide log" : "Log"}</button>`
          : nothing}
        ${!live && t.request
          ? html`<button class="btn" @click=${() => this.again(t)}><span class="material-symbols-rounded">replay</span> Train again</button>`
          : nothing}
        ${!live
          ? html`<button class="btn" @click=${() => this.forget(t)}><span class="material-symbols-rounded">delete</span> Remove</button>`
          : nothing}
      </div>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oppai-lora-train": OppaiLoraTrain;
  }
}
