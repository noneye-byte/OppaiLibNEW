import "@material/web/progress/circular-progress.js";
import { LitElement, html, css, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { iconStyles } from "../theme.js";
import { api, type GenLora, type GenModel, type Training } from "../api.js";
import { RESOLUTIONS, SCHEDULERS } from "../gen-options.js";
import {
  MAX_SEEDS, comparePlan, parseWeights, planSize, promptsFrom, seedsFrom, sheetLayout,
  type CompareCell, type CompareLora, type ComparePlan,
} from "../lora-compare.js";
import { loraStyles } from "./lora-styles.js";

/**
 * Every LoRA side by side: the same prompts and seeds, a row per LoRA and a column per
 * weight (and seed, and prompt, when those are varied too), so two runs of the same
 * set — or a LoRA trained here and one downloaded — can be told apart by looking.
 * The plan is lora-compare.ts; this draws it one picture at a time through the
 * studio's own generate call, so a picture here is made exactly as one made by hand
 * would be, and can be stopped between pictures. The finished sheet can be saved as
 * one picture, labels and all, and any picture in it kept in the library.
 */

interface CellResult {
  state: "waiting" | "drawing" | "done" | "failed";
  preview?: string;
  error?: string;
}

type CellSize = "s" | "m" | "l";
const CELL_PX: Record<CellSize, number> = { s: 130, m: 200, l: 300 };

const DEFAULT_PROMPT = "masterpiece, best quality, {trigger}, solo, looking at viewer, upper body";
const DEFAULT_NEGATIVE = "lowres, worst quality, bad anatomy, bad hands, watermark, text";

function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

@customElement("oppai-lora-comparison")
export class OppaiLoraComparison extends LitElement {
  @property({ attribute: false }) models: GenModel[] = [];
  @property({ attribute: false }) loras: GenLora[] = [];
  @property({ attribute: false }) runs: Training[] = [];
  @property() checkpoint = "";
  /** A LoRA to have ticked when the screen opens on it, from a run's "Compare". */
  @property() focusLora = "";

  @state() private prompt = DEFAULT_PROMPT;
  @state() private extraPrompts = "";
  @state() private negative = DEFAULT_NEGATIVE;
  @state() private seed = randomSeed();
  @state() private seedCount = 1;
  @state() private weightsText = "0.6, 0.8, 1";
  @state() private triggers = true;
  @state() private baseline = true;
  @state() private ownCheckpoint = true;
  @state() private base = "";
  /** The generation settings; zero and "" leave each to the generator's default. */
  @state() private sampler = "";
  @state() private steps = 0;
  @state() private cfg = 0;
  @state() private size = "";
  @state() private clipSkip = 0;
  @state() private more = false;
  @state() private selected = new Set<string>();
  @state() private picked = false;
  @state() private showOthers = false;
  @state() private filter = "";
  @state() private plan: ComparePlan | null = null;
  @state() private results = new Map<string, CellResult>();
  @state() private running = false;
  @state() private error = "";
  @state() private cellSize: CellSize = "m";
  /** The cell open in the lightbox, by key. */
  @state() private open = "";
  @state() private saved = new Set<string>();
  @state() private exporting = false;

  private jobId = "";
  private stopped = false;

  static styles = [
    iconStyles,
    loraStyles,
    css`
      :host { display: block; }
      .layout { display: grid; grid-template-columns: minmax(280px, 360px) minmax(0, 1fr); gap: 16px; align-items: start; }
      @media (max-width: 900px) { .layout { grid-template-columns: minmax(0, 1fr); } }
      .side { position: sticky; top: 72px; max-height: calc(100vh - 88px); overflow-y: auto; border-radius: 16px; }
      @media (max-width: 900px) { .side { position: static; max-height: none; } }
      .loras { display: flex; flex-direction: column; gap: 4px; max-height: 280px; overflow-y: auto; margin: 0 -6px; padding: 0 6px; }
      .lora {
        display: flex; align-items: center; gap: 10px; padding: 6px 8px; border-radius: 10px; cursor: pointer; font-size: 13px;
      }
      .lora:hover { background: var(--oppai-surface-2); }
      .lora input { accent-color: var(--oppai-primary); width: 16px; height: 16px; flex: none; }
      .lora img { width: 36px; height: 36px; border-radius: 8px; object-fit: cover; background: var(--oppai-surface-2); flex: none; }
      .lora .nm { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .lora .nm small { display: block; color: var(--oppai-text-dim); font-size: 11px; }
      .group { font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--oppai-text-muted, var(--oppai-text-dim)); margin: 14px 0 6px; }
      .quick { display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap; }
      .seedrow { display: flex; gap: 8px; }
      .seedrow input { flex: 1; min-width: 0; }
      .seedrow select { width: auto; flex: none; }
      .go {
        display: flex; gap: 8px; margin-top: 16px; align-items: center; flex-wrap: wrap;
        position: sticky; bottom: -18px; background: var(--oppai-surface); padding: 10px 0 2px;
      }
      .go .count { font-size: 12px; color: var(--oppai-text-dim); margin-left: auto; }
      .toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
      .toolbar h3 { margin: 0; }
      .toolbar .spacer { flex: 1; }
      .sheet { overflow-x: auto; }
      table { border-collapse: separate; border-spacing: 8px; margin: -8px; }
      th { font-size: 12px; font-weight: 600; color: var(--oppai-text-dim); text-align: center; padding: 0 0 2px; }
      th.rowhead { text-align: left; vertical-align: middle; width: 140px; max-width: 160px; }
      th.rowhead .nm { display: block; color: var(--oppai-text); font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      th.rowhead small { display: block; font-weight: 400; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      td { padding: 0; vertical-align: top; }
      .cell {
        width: var(--cell, 200px); aspect-ratio: 1; border-radius: 12px; background: var(--oppai-surface-2); overflow: hidden;
        display: grid; place-items: center; position: relative; border: none; padding: 0; cursor: default; color: var(--oppai-text-dim);
        font: inherit; font-size: 12px; text-align: center;
      }
      .cell.empty { background: transparent; }
      .cell.done { cursor: zoom-in; }
      .cell img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .cell .err { padding: 10px; color: var(--oppai-error, #f2b8b5); line-height: 1.35; }
      md-circular-progress { --md-circular-progress-size: 32px; }
      @media (max-width: 600px) { th.rowhead { width: 90px; } }
      .lightbox {
        position: fixed; inset: 0; z-index: 10; background: var(--oppai-scrim, rgba(0,0,0,0.78));
        display: grid; place-items: center; padding: 16px;
      }
      .lightbox figure { margin: 0; max-width: min(1100px, 100%); max-height: 100%; display: flex; flex-direction: column; gap: 10px; position: relative; }
      .lightbox img { max-width: 100%; max-height: calc(100vh - 140px); object-fit: contain; border-radius: 12px; }
      .lightbox figcaption { color: #fff; font-size: 13px; text-align: center; line-height: 1.4; }
      .lightbox figcaption small { display: block; opacity: 0.7; font-size: 12px; }
      .lightbox .acts { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
      .lightbox .nav {
        position: absolute; top: calc(50% - 40px); width: 44px; height: 44px; border-radius: 22px; border: none; cursor: pointer;
        background: rgba(0, 0, 0, 0.55); color: #fff; display: grid; place-items: center;
      }
      .lightbox .nav.prev { left: 8px; }
      .lightbox .nav.next { right: 8px; }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("keydown", this.onKey);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("keydown", this.onKey);
    this.stop();
  }

  private onKey = (e: KeyboardEvent) => {
    if (!this.open) return;
    if (e.key === "ArrowLeft") this.stepOpen(-1);
    else if (e.key === "ArrowRight") this.stepOpen(1);
    else if (e.key === "Escape") this.open = "";
    else return;
    e.preventDefault();
  };

  protected willUpdate(changed: PropertyValues<this>) {
    if ((changed.has("checkpoint") || changed.has("models")) && !this.base) {
      this.base = this.checkpoint || this.models[0]?.title || "";
    }
    // The trained LoRAs are ticked until the person ticks something themselves: the
    // runs and the LoRA list arrive separately, in either order.
    if ((changed.has("loras") || changed.has("runs") || changed.has("focusLora")) && this.loras.length) {
      if (!this.picked) {
        const trained = this.trained().map((t) => t.lora.name).slice(0, 6);
        const focus = this.focusLora && this.loras.some((l) => l.name === this.focusLora) ? [this.focusLora] : [];
        this.selected = new Set([...focus, ...trained]);
      } else if (changed.has("focusLora") && this.focusLora && this.loras.some((l) => l.name === this.focusLora)) {
        this.selected = new Set([...this.selected, this.focusLora]);
      }
    }
  }

  /** The installed LoRAs that were trained here, newest run first, with the run. */
  private trained(): { lora: GenLora; run: Training }[] {
    const out: { lora: GenLora; run: Training }[] = [];
    const seen = new Set<string>();
    for (const run of this.runs) {
      if (run.status !== "done") continue;
      const lora = this.loras.find((l) => (run.modelKey && l.key === run.modelKey) || l.name === run.name);
      if (lora && !seen.has(lora.name)) {
        seen.add(lora.name);
        out.push({ lora, run });
      }
    }
    return out;
  }

  private compareLora(l: GenLora): CompareLora {
    const run = this.trained().find((t) => t.lora.name === l.name)?.run;
    const own = run?.request?.base;
    return {
      name: l.name,
      trigger: run?.trigger || l.triggerPhrases?.[0] || "",
      checkpoint: own && this.models.some((m) => m.title === own) ? own : undefined,
    };
  }

  private toggle(name: string) {
    this.picked = true;
    const next = new Set(this.selected);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    this.selected = next;
  }

  private selectAll(names: string[], on: boolean) {
    this.picked = true;
    const next = new Set(this.selected);
    for (const n of names) {
      if (on) next.add(n);
      else next.delete(n);
    }
    this.selected = next;
  }

  private currentPlan(): ComparePlan {
    const loras = this.loras.filter((l) => this.selected.has(l.name)).map((l) => this.compareLora(l));
    return comparePlan({
      loras, weights: parseWeights(this.weightsText), seeds: seedsFrom(this.seed, this.seedCount),
      prompts: promptsFrom(this.prompt, this.extraPrompts), baseline: this.baseline,
      checkpoint: this.base, ownCheckpoint: this.ownCheckpoint, triggers: this.triggers,
    });
  }

  private cells(plan: ComparePlan | null = this.plan): CompareCell[] {
    return (plan?.rows ?? []).flatMap((r) => r.cells.filter((c): c is CompareCell => !!c));
  }

  private setResult(key: string, r: CellResult) {
    const next = new Map(this.results);
    next.set(key, r);
    this.results = next;
  }

  private async run() {
    if (this.running) return;
    const plan = this.currentPlan();
    if (!planSize(plan)) return;
    this.plan = plan;
    this.saved = new Set();
    this.results = new Map(this.cells(plan).map((c) => [c.key, { state: "waiting" } as CellResult]));
    await this.drawAll(this.cells(plan));
  }

  /** Draws the cells that failed or were stopped, keeping the ones already drawn. */
  private async retry() {
    if (this.running || !this.plan) return;
    const again = this.cells().filter((c) => this.results.get(c.key)?.state !== "done");
    for (const c of again) this.setResult(c.key, { state: "waiting" });
    await this.drawAll(again);
  }

  private async drawAll(cells: CompareCell[]) {
    this.error = "";
    this.stopped = false;
    this.running = true;
    try {
      for (const cell of cells) {
        if (this.stopped) return;
        await this.draw(cell);
      }
    } finally {
      this.running = false;
      this.jobId = "";
    }
  }

  private async draw(cell: CompareCell) {
    this.setResult(cell.key, { state: "drawing" });
    this.jobId = `cmp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const res = RESOLUTIONS.find((r) => r.hint === this.size);
    try {
      const out = await api.generate({
        jobId: this.jobId,
        prompt: cell.prompt,
        negativePrompt: this.negative,
        checkpoint: cell.checkpoint || undefined,
        sampler: this.sampler || undefined,
        steps: this.steps || undefined,
        cfgScale: this.cfg || undefined,
        width: res?.w,
        height: res?.h,
        clipSkip: this.clipSkip || undefined,
        seed: cell.seed,
        count: 1,
        loras: cell.lora ? [{ name: cell.lora.name, weight: cell.weight }] : [],
      });
      const id = out.images[0]?.id;
      this.setResult(cell.key, id ? { state: "done", preview: id } : { state: "failed", error: "No picture came back" });
    } catch (e) {
      const msg = (e as Error).message;
      this.setResult(cell.key, { state: "failed", error: this.stopped ? "Stopped" : msg });
      if (!this.stopped && /not configured|unreachable|refused/i.test(msg)) {
        this.error = msg;
        this.stopped = true;
      }
    }
  }

  private stop() {
    this.stopped = true;
    if (this.jobId) void api.cancelGenerate(this.jobId).catch(() => undefined);
  }

  private label(c: CompareCell): string {
    return c.lora ? `${c.lora.name} at ${c.weight}` : "Without a LoRA";
  }

  // ── the finished pictures ─────────────────────────────────────────────────

  private doneCells(): CompareCell[] {
    return this.cells().filter((c) => this.results.get(c.key)?.state === "done");
  }

  private stepOpen(d: number) {
    const done = this.doneCells();
    const at = done.findIndex((c) => c.key === this.open);
    const next = done[at + d];
    if (next) this.open = next.key;
  }

  private async keep(c: CompareCell) {
    const r = this.results.get(c.key);
    if (!r?.preview || this.saved.has(c.key)) return;
    try {
      await api.saveGenerated({
        id: r.preview,
        title: `${this.label(c)} · seed ${c.seed}`,
        tags: c.lora ? ["lora-comparison", c.lora.name] : ["lora-comparison"],
      });
      this.saved = new Set(this.saved).add(c.key);
    } catch (e) {
      this.error = (e as Error).message;
    }
  }

  /** The whole sheet as one PNG, labelled as it is on screen, for keeping or sharing. */
  private async downloadSheet() {
    const plan = this.plan;
    if (!plan || this.exporting) return;
    this.exporting = true;
    try {
      const cell = 384;
      const l = sheetLayout(plan.columns.length, plan.rows.length, cell);
      const canvas = document.createElement("canvas");
      canvas.width = l.width;
      canvas.height = l.height;
      const g = canvas.getContext("2d")!;
      g.fillStyle = "#16121a";
      g.fillRect(0, 0, l.width, l.height);
      g.fillStyle = "#e8e0ea";
      g.textBaseline = "middle";
      const font = (px: number, weight = 600) => `${weight} ${px}px Roboto, system-ui, sans-serif`;
      g.font = font(Math.round(cell / 22));
      g.textAlign = "center";
      plan.columns.forEach((col, i) => g.fillText(col.label, l.x(i) + cell / 2, l.header / 2 + l.gap / 2, cell));
      g.textAlign = "left";
      const load = (src: string) => new Promise<HTMLImageElement>((ok, fail) => {
        const img = new Image();
        img.onload = () => ok(img);
        img.onerror = () => fail(new Error("a picture couldn't be read"));
        img.src = src;
      });
      for (const [ri, row] of plan.rows.entries()) {
        const y = l.y(ri);
        g.fillStyle = "#e8e0ea";
        g.font = font(Math.round(cell / 18));
        g.fillText(row.lora ? row.lora.name : "No LoRA", l.gap, y + cell / 2 - cell / 28, l.label - l.gap * 2);
        if (row.lora?.trigger && this.triggers) {
          g.fillStyle = "#a89cae";
          g.font = font(Math.round(cell / 24), 400);
          g.fillText(row.lora.trigger, l.gap, y + cell / 2 + cell / 22, l.label - l.gap * 2);
        }
        for (const [ci, c] of row.cells.entries()) {
          const r = c && this.results.get(c.key);
          if (!r?.preview) continue;
          const img = await load(api.genPreviewURL(r.preview));
          // Cover the square, as the sheet on screen does.
          const s = Math.min(img.naturalWidth, img.naturalHeight);
          g.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, l.x(ci), y, cell, cell);
        }
      }
      const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/png"));
      if (!blob) throw new Error("The sheet couldn't be made");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `lora-comparison-${this.seed}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.exporting = false;
    }
  }

  // ── rendering ─────────────────────────────────────────────────────────────

  render() {
    if (!this.loras.length) {
      return html`<div class="card empty"><span class="material-symbols-rounded">compare</span>
        No LoRAs installed yet. Once a run has finished, it can be compared here with the others.</div>`;
    }
    return html`<div class="layout">${this.renderSetup()}${this.renderSheet()}</div>${this.renderLightbox()}`;
  }

  private renderLora(l: GenLora, note: string) {
    return html`<label class="lora">
      <input type="checkbox" .checked=${this.selected.has(l.name)} @change=${() => this.toggle(l.name)} />
      <img src=${api.loraThumbURL(l.name)} alt="" loading="lazy" @error=${(e: Event) => ((e.target as HTMLImageElement).style.opacity = "0")} />
      <span class="nm">${l.alias || l.name}${note ? html`<small>${note}</small>` : nothing}</span>
    </label>`;
  }

  private renderSetup() {
    const trained = this.trained();
    const trainedNames = new Set(trained.map((t) => t.lora.name));
    const q = this.filter.trim().toLowerCase();
    const others = this.loras.filter((l) => !trainedNames.has(l.name) && (!q || l.name.toLowerCase().includes(q)));
    const plan = this.currentPlan();
    const size = planSize(plan);
    const weights = parseWeights(this.weightsText).length;
    const prompts = promptsFrom(this.prompt, this.extraPrompts).length;
    return html`<div class="side"><div class="card">
      <h3><span class="material-symbols-rounded">compare</span> Compare LoRAs</h3>
      <p class="sub">The same prompt and seed for each, so the only difference between two pictures is the LoRA.</p>

      ${trained.length
        ? html`<div class="group">Trained here</div>
            <div class="loras">${trained.map((t) => this.renderLora(t.lora, `${t.run.images} pictures · ${new Date(t.run.createdAt * 1000).toLocaleDateString()}`))}</div>
            <div class="quick">
              <button class="btn small ghost" @click=${() => this.selectAll(trained.map((t) => t.lora.name), true)}>All trained</button>
              <button class="btn small ghost" @click=${() => this.selectAll([...this.selected], false)}>None</button>
            </div>`
        : html`<div class="note">None of the installed LoRAs were trained here yet — pick any below.</div>`}
      <button class="btn small ghost" style="margin-top:8px;" @click=${() => (this.showOthers = !this.showOthers)}>
        <span class="material-symbols-rounded">${this.showOthers ? "expand_less" : "expand_more"}</span>
        ${this.showOthers ? "Hide" : "Show"} other LoRAs (${this.loras.length - trained.length})
      </button>
      ${this.showOthers || !trained.length
        ? html`<input type="search" style="margin-top:8px;" placeholder="Filter" .value=${this.filter}
              @input=${(e: Event) => (this.filter = (e.target as HTMLInputElement).value)} />
            <div class="loras" style="margin-top:6px;">${others.map((l) => this.renderLora(l, l.base ?? ""))}</div>`
        : nothing}

      <label class="field">Prompt</label>
      <textarea .value=${this.prompt} @input=${(e: Event) => (this.prompt = (e.target as HTMLTextAreaElement).value)}></textarea>
      <div class="note">Each LoRA's trigger word goes where <b>{trigger}</b> is, or first if it isn't there.</div>
      <label class="field">More prompts <span class="muted" style="font-weight:400;">— optional, one per line</span></label>
      <textarea rows="2" placeholder="1girl, {trigger}, full body, beach&#10;{trigger}, portrait, night city" .value=${this.extraPrompts}
        @input=${(e: Event) => (this.extraPrompts = (e.target as HTMLTextAreaElement).value)}></textarea>
      <div class="note">Each one is another set of columns. A LoRA that only looks right on one prompt has learnt the prompt.</div>
      <label class="field">Negative prompt</label>
      <textarea .value=${this.negative} @input=${(e: Event) => (this.negative = (e.target as HTMLTextAreaElement).value)}></textarea>
      <label class="check">
        <input type="checkbox" .checked=${this.triggers} @change=${(e: Event) => (this.triggers = (e.target as HTMLInputElement).checked)} />
        <span>Use each LoRA's trigger word<small>Off shows how much of a LoRA comes through without being asked for.</small></span>
      </label>

      <div class="row">
        <div>
          <label class="field">Weights</label>
          <input type="text" .value=${this.weightsText} placeholder="0.6, 0.8, 1"
            @input=${(e: Event) => (this.weightsText = (e.target as HTMLInputElement).value)} />
        </div>
        <div>
          <label class="field">Seed</label>
          <div class="seedrow">
            <input type="number" .value=${String(this.seed)} @input=${(e: Event) => (this.seed = Number((e.target as HTMLInputElement).value) || 0)} />
            <button class="btn" title="Another seed" @click=${() => (this.seed = randomSeed())}><span class="material-symbols-rounded">casino</span></button>
          </div>
        </div>
      </div>
      <label class="field">Seeds per LoRA</label>
      <div class="seg small">
        ${Array.from({ length: MAX_SEEDS }, (_, i) => i + 1).map((n) => html`<button class=${this.seedCount === n ? "on" : ""} @click=${() => (this.seedCount = n)}>${n}</button>`)}
      </div>
      <div class="note">More than one draws the seeds after this one too: a LoRA that's only good on one seed was lucky.</div>

      <label class="field">Checkpoint</label>
      <select @change=${(e: Event) => (this.base = (e.target as HTMLSelectElement).value)}>
        ${this.models.map((m) => html`<option value=${m.title} ?selected=${m.title === this.base}>${m.model_name || m.title}</option>`)}
      </select>
      <label class="check">
        <input type="checkbox" .checked=${this.ownCheckpoint} @change=${(e: Event) => (this.ownCheckpoint = (e.target as HTMLInputElement).checked)} />
        <span>Draw each trained LoRA on its own checkpoint<small>A LoRA only works on the family it was trained on.</small></span>
      </label>
      <label class="check">
        <input type="checkbox" .checked=${this.baseline} @change=${(e: Event) => (this.baseline = (e.target as HTMLInputElement).checked)} />
        <span>Include a picture without any LoRA<small>What the checkpoint draws on its own, to compare against.</small></span>
      </label>

      <button class="btn small ghost" style="margin-top:10px;" @click=${() => (this.more = !this.more)}>
        <span class="material-symbols-rounded">${this.more ? "expand_less" : "tune"}</span> ${this.more ? "Fewer settings" : "Generation settings"}
      </button>
      ${this.more
        ? html`
            <div class="row">
              <div>
                <label class="field">Sampler</label>
                <select @change=${(e: Event) => (this.sampler = (e.target as HTMLSelectElement).value)}>
                  ${SCHEDULERS.map((s) => html`<option value=${s.id} ?selected=${s.id === this.sampler}>${s.label}</option>`)}
                </select>
              </div>
              <div>
                <label class="field">Size</label>
                <select @change=${(e: Event) => (this.size = (e.target as HTMLSelectElement).value)}>
                  <option value="" ?selected=${!this.size}>Generator's default</option>
                  ${RESOLUTIONS.map((r) => html`<option value=${r.hint} ?selected=${r.hint === this.size}>${r.label} · ${r.hint}</option>`)}
                </select>
              </div>
            </div>
            <div class="row">
              <div>
                <label class="field">Steps</label>
                <input type="number" min="0" max="150" placeholder="Default" .value=${this.steps ? String(this.steps) : ""}
                  @input=${(e: Event) => (this.steps = Math.max(0, Math.min(150, Number((e.target as HTMLInputElement).value) || 0)))} />
              </div>
              <div>
                <label class="field">CFG</label>
                <input type="number" min="0" max="30" step="0.5" placeholder="Default" .value=${this.cfg ? String(this.cfg) : ""}
                  @input=${(e: Event) => (this.cfg = Math.max(0, Math.min(30, Number((e.target as HTMLInputElement).value) || 0)))} />
              </div>
              <div>
                <label class="field">Clip skip</label>
                <input type="number" min="0" max="12" placeholder="Default" .value=${this.clipSkip ? String(this.clipSkip) : ""}
                  @input=${(e: Event) => (this.clipSkip = Math.max(0, Math.min(12, Number((e.target as HTMLInputElement).value) || 0)))} />
              </div>
            </div>
            <div class="note">Left empty, each is the generator's (or the checkpoint's recommended) setting.</div>`
        : nothing}

      ${this.error ? html`<div class="banner"><span class="material-symbols-rounded">warning</span>${this.error}</div>` : nothing}
      <div class="go">
        ${this.running
          ? html`<button class="btn danger" @click=${() => this.stop()}><span class="material-symbols-rounded">stop</span> Stop</button>`
          : html`<button class="btn primary" ?disabled=${!size || !this.prompt.trim()} @click=${() => this.run()}>
              <span class="material-symbols-rounded">play_arrow</span> Make ${size} picture${size === 1 ? "" : "s"}
            </button>`}
        <span class="count">${this.selected.size} LoRA${this.selected.size === 1 ? "" : "s"} × ${weights} weight${weights === 1 ? "" : "s"}${this.seedCount > 1 ? ` × ${this.seedCount} seeds` : ""}${prompts > 1 ? ` × ${prompts} prompts` : ""}</span>
      </div>
    </div></div>`;
  }

  private renderSheet() {
    const plan = this.plan;
    if (!plan) {
      return html`<div class="card empty"><span class="material-symbols-rounded">grid_view</span>
        Tick the LoRAs to compare and press <b>Make</b>.<br />The pictures appear here in a grid, a row per LoRA.</div>`;
    }
    const states = [...this.results.values()];
    const done = states.filter((r) => r.state === "done").length;
    const failed = states.filter((r) => r.state === "failed").length;
    const seeds = [...new Set(plan.columns.map((c) => c.seed))];
    return html`<div class="card">
      <div class="toolbar">
        <h3>${seeds.length > 1 ? `Seeds ${seeds[0]}–${seeds[seeds.length - 1]}` : `Seed ${seeds[0]}`}</h3>
        <span class="note" style="margin:0;">${this.running ? `Drawing ${Math.min(done + failed + 1, this.results.size)} of ${this.results.size}…` : `${done} of ${this.results.size} drawn`}</span>
        <span class="spacer"></span>
        ${!this.running && failed ? html`<button class="btn small" @click=${() => this.retry()}><span class="material-symbols-rounded">refresh</span> Retry ${failed}</button>` : nothing}
        <div class="seg small" title="Picture size">
          ${(["s", "m", "l"] as CellSize[]).map((s) => html`<button class=${this.cellSize === s ? "on" : ""} @click=${() => (this.cellSize = s)}>${s.toUpperCase()}</button>`)}
        </div>
        <button class="btn small" ?disabled=${!done || this.running || this.exporting} @click=${() => this.downloadSheet()}>
          <span class="material-symbols-rounded">download</span> ${this.exporting ? "Making…" : "Save sheet"}
        </button>
      </div>
      <div class="sheet" style="--cell:${CELL_PX[this.cellSize]}px"><table>
        <thead><tr><th></th>${plan.columns.map((c) => html`<th>${c.label}</th>`)}</tr></thead>
        <tbody>${plan.rows.map((row) => html`<tr>
          <th class="rowhead">
            <span class="nm">${row.lora ? row.lora.name : "No LoRA"}</span>
            ${row.lora?.trigger && this.triggers ? html`<small>${row.lora.trigger}</small>` : nothing}
          </th>
          ${row.cells.map((c) => html`<td>${c ? this.renderCell(c) : html`<div class="cell empty"></div>`}</td>`)}
        </tr>`)}</tbody>
      </table></div>
    </div>`;
  }

  private renderCell(c: CompareCell) {
    const r = this.results.get(c.key) ?? { state: "waiting" };
    if (r.state === "done" && r.preview) {
      return html`<button class="cell done" title=${c.prompt} @click=${() => (this.open = c.key)}>
        <img src=${api.genPreviewURL(r.preview)} alt=${this.label(c)} />
      </button>`;
    }
    if (r.state === "drawing") return html`<div class="cell"><md-circular-progress indeterminate></md-circular-progress></div>`;
    if (r.state === "failed") return html`<div class="cell"><span class="err">${r.error ?? "Failed"}</span></div>`;
    return html`<div class="cell"><span class="material-symbols-rounded">hourglass_empty</span></div>`;
  }

  private renderLightbox() {
    if (!this.open) return nothing;
    const done = this.doneCells();
    const at = done.findIndex((c) => c.key === this.open);
    const c = done[at];
    const r = c && this.results.get(c.key);
    if (!c || !r?.preview) return nothing;
    const kept = this.saved.has(c.key);
    return html`<div class="lightbox" @click=${(e: Event) => { if (e.target === e.currentTarget) this.open = ""; }}>
      <figure>
        <img src=${api.genPreviewURL(r.preview)} alt="" />
        ${at > 0 ? html`<button class="nav prev" title="Previous (←)" @click=${() => this.stepOpen(-1)}><span class="material-symbols-rounded">chevron_left</span></button>` : nothing}
        ${at < done.length - 1 ? html`<button class="nav next" title="Next (→)" @click=${() => this.stepOpen(1)}><span class="material-symbols-rounded">chevron_right</span></button>` : nothing}
        <figcaption>${this.label(c)} · seed ${c.seed}<small>${c.prompt}</small></figcaption>
        <div class="acts">
          <button class="btn tonal" ?disabled=${kept} @click=${() => this.keep(c)}>
            <span class="material-symbols-rounded">${kept ? "check" : "save"}</span> ${kept ? "In library" : "Save to library"}
          </button>
          <button class="btn" @click=${() => (this.open = "")}><span class="material-symbols-rounded">close</span> Close</button>
        </div>
      </figure>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oppai-lora-comparison": OppaiLoraComparison;
  }
}
