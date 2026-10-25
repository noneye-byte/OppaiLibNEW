import "@material/web/progress/circular-progress.js";
import { LitElement, html, css, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { iconStyles } from "../theme.js";
import { api, type GenLora, type GenModel, type Training } from "../api.js";
import { comparePlan, parseWeights, planSize, type CompareCell, type CompareLora, type CompareRow } from "../lora-compare.js";
import { loraStyles } from "./lora-styles.js";

/**
 * Every LoRA side by side: one prompt and one seed, a row per LoRA and a column per
 * weight, so two runs of the same set — or a LoRA trained here and one downloaded —
 * can be told apart by looking. The plan is lora-compare.ts; this draws it one
 * picture at a time through the studio's own generate call, so a picture here is
 * made exactly as one made by hand would be, and can be stopped between pictures.
 */

interface CellResult {
  state: "waiting" | "drawing" | "done" | "failed";
  preview?: string;
  error?: string;
}

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
  @state() private negative = DEFAULT_NEGATIVE;
  @state() private seed = randomSeed();
  @state() private weightsText = "0.6, 0.8, 1";
  @state() private baseline = true;
  @state() private ownCheckpoint = true;
  @state() private base = "";
  @state() private selected = new Set<string>();
  @state() private picked = false;
  @state() private showOthers = false;
  @state() private filter = "";
  @state() private plan: CompareRow[] = [];
  @state() private results = new Map<string, CellResult>();
  @state() private running = false;
  @state() private error = "";
  @state() private open: { preview: string; label: string } | null = null;

  private jobId = "";
  private stopped = false;

  static styles = [
    iconStyles,
    loraStyles,
    css`
      :host { display: block; }
      .layout { display: grid; grid-template-columns: minmax(280px, 360px) minmax(0, 1fr); gap: 16px; align-items: start; }
      @media (max-width: 900px) { .layout { grid-template-columns: minmax(0, 1fr); } }
      .side { position: sticky; top: 72px; }
      @media (max-width: 900px) { .side { position: static; } }
      .loras { display: flex; flex-direction: column; gap: 4px; max-height: 320px; overflow-y: auto; margin: 0 -6px; padding: 0 6px; }
      .lora {
        display: flex; align-items: center; gap: 10px; padding: 6px 8px; border-radius: 10px; cursor: pointer; font-size: 13px;
      }
      .lora:hover { background: var(--oppai-surface-2); }
      .lora input { accent-color: var(--oppai-primary); width: 16px; height: 16px; flex: none; }
      .lora img { width: 36px; height: 36px; border-radius: 8px; object-fit: cover; background: var(--oppai-surface-2); flex: none; }
      .lora .nm { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .lora .nm small { display: block; color: var(--oppai-text-dim); font-size: 11px; }
      .group { font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--oppai-text-muted, var(--oppai-text-dim)); margin: 14px 0 6px; }
      .seedrow { display: flex; gap: 8px; }
      .seedrow input { flex: 1; }
      .go { display: flex; gap: 8px; margin-top: 16px; align-items: center; flex-wrap: wrap; }
      .go .count { font-size: 12px; color: var(--oppai-text-dim); margin-left: auto; }
      .sheet { overflow-x: auto; }
      table { border-collapse: separate; border-spacing: 8px; margin: -8px; }
      th { font-size: 12px; font-weight: 600; color: var(--oppai-text-dim); text-align: center; padding: 0 0 2px; }
      th.rowhead { text-align: left; vertical-align: middle; width: 140px; max-width: 160px; }
      th.rowhead .nm { display: block; color: var(--oppai-text); font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      th.rowhead small { display: block; font-weight: 400; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      td { padding: 0; vertical-align: top; }
      .cell {
        width: 200px; aspect-ratio: 1; border-radius: 12px; background: var(--oppai-surface-2); overflow: hidden;
        display: grid; place-items: center; position: relative; border: none; padding: 0; cursor: default; color: var(--oppai-text-dim);
        font: inherit; font-size: 12px; text-align: center;
      }
      .cell.done { cursor: zoom-in; }
      .cell img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .cell .err { padding: 10px; color: var(--oppai-error, #f2b8b5); line-height: 1.35; }
      md-circular-progress { --md-circular-progress-size: 32px; }
      @media (max-width: 600px) { .cell { width: 140px; } th.rowhead { width: 90px; } }
      .lightbox {
        position: fixed; inset: 0; z-index: 10; background: var(--oppai-scrim, rgba(0,0,0,0.7));
        display: grid; place-items: center; padding: 16px; cursor: zoom-out;
      }
      .lightbox figure { margin: 0; max-width: min(1024px, 100%); max-height: 100%; display: flex; flex-direction: column; gap: 8px; }
      .lightbox img { max-width: 100%; max-height: calc(100vh - 80px); object-fit: contain; border-radius: 12px; }
      .lightbox figcaption { color: #fff; font-size: 13px; text-align: center; }
    `,
  ];

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

  disconnectedCallback() {
    super.disconnectedCallback();
    this.stop();
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

  private currentPlan(): CompareRow[] {
    const loras = this.loras.filter((l) => this.selected.has(l.name)).map((l) => this.compareLora(l));
    return comparePlan({
      loras, weights: parseWeights(this.weightsText), baseline: this.baseline,
      prompt: this.prompt, checkpoint: this.base, ownCheckpoint: this.ownCheckpoint,
    });
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
    this.error = "";
    this.stopped = false;
    this.running = true;
    this.results = new Map(plan.flatMap((r) => r.cells.map((c) => [c.key, { state: "waiting" } as CellResult])));
    try {
      for (const row of plan) {
        for (const cell of row.cells) {
          if (this.stopped) return;
          await this.draw(cell);
        }
      }
    } finally {
      this.running = false;
      this.jobId = "";
    }
  }

  private async draw(cell: CompareCell) {
    this.setResult(cell.key, { state: "drawing" });
    this.jobId = `cmp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      const res = await api.generate({
        jobId: this.jobId,
        prompt: cell.prompt,
        negativePrompt: this.negative,
        checkpoint: cell.checkpoint || undefined,
        seed: this.seed,
        count: 1,
        loras: cell.lora ? [{ name: cell.lora.name, weight: cell.weight }] : [],
      });
      const id = res.images[0]?.id;
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

  render() {
    if (!this.loras.length) {
      return html`<div class="card empty"><span class="material-symbols-rounded">compare</span>
        No LoRAs installed yet. Once a run has finished, it can be compared here with the others.</div>`;
    }
    return html`<div class="layout">${this.renderSetup()}${this.renderSheet()}</div>
      ${this.open
        ? html`<div class="lightbox" @click=${() => (this.open = null)}>
            <figure><img src=${api.genPreviewURL(this.open.preview)} alt="" /><figcaption>${this.open.label}</figcaption></figure>
          </div>`
        : nothing}`;
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
    const size = planSize(this.currentPlan());
    return html`<div class="side"><div class="card">
      <h3><span class="material-symbols-rounded">compare</span> Compare LoRAs</h3>
      <p class="sub">The same prompt and seed for each, so the only difference between two pictures is the LoRA.</p>

      ${trained.length
        ? html`<div class="group">Trained here</div>
            <div class="loras">${trained.map((t) => this.renderLora(t.lora, `${t.run.images} pictures · ${new Date(t.run.createdAt * 1000).toLocaleDateString()}`))}</div>`
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
      <label class="field">Negative prompt</label>
      <textarea .value=${this.negative} @input=${(e: Event) => (this.negative = (e.target as HTMLTextAreaElement).value)}></textarea>

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

      ${this.error ? html`<div class="banner"><span class="material-symbols-rounded">warning</span>${this.error}</div>` : nothing}
      <div class="go">
        ${this.running
          ? html`<button class="btn danger" @click=${() => this.stop()}><span class="material-symbols-rounded">stop</span> Stop</button>`
          : html`<button class="btn primary" ?disabled=${!size || !this.prompt.trim()} @click=${() => this.run()}>
              <span class="material-symbols-rounded">play_arrow</span> Make ${size} picture${size === 1 ? "" : "s"}
            </button>`}
        <span class="count">${this.selected.size} LoRA${this.selected.size === 1 ? "" : "s"} × ${parseWeights(this.weightsText).length} weight${parseWeights(this.weightsText).length === 1 ? "" : "s"}</span>
      </div>
    </div></div>`;
  }

  private renderSheet() {
    if (!this.plan.length) {
      return html`<div class="card empty"><span class="material-symbols-rounded">grid_view</span>
        Tick the LoRAs to compare and press <b>Make</b>.<br />The pictures appear here in a grid, a row per LoRA.</div>`;
    }
    const weights = Math.max(...this.plan.map((r) => r.cells.length));
    const header = this.plan.find((r) => r.lora)?.cells.map((c) => c.weight) ?? [];
    const done = [...this.results.values()].filter((r) => r.state === "done" || r.state === "failed").length;
    return html`<div class="card">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap;">
        <h3 style="margin:0;">Seed ${this.plan.length ? this.seed : ""}</h3>
        <span class="note" style="margin:0;">${this.running ? `Drawing ${Math.min(done + 1, this.results.size)} of ${this.results.size}…` : `${done} of ${this.results.size} drawn`}</span>
      </div>
      <div class="sheet"><table>
        <thead><tr><th></th>${Array.from({ length: weights }, (_, i) => html`<th>${header[i] !== undefined ? `Weight ${header[i]}` : ""}</th>`)}</tr></thead>
        <tbody>${this.plan.map((row) => html`<tr>
          <th class="rowhead">
            <span class="nm">${row.lora ? row.lora.name : "No LoRA"}</span>
            ${row.lora?.trigger ? html`<small>${row.lora.trigger}</small>` : nothing}
          </th>
          ${row.cells.map((c) => html`<td>${this.renderCell(c)}</td>`)}
        </tr>`)}</tbody>
      </table></div>
    </div>`;
  }

  private renderCell(c: CompareCell) {
    const r = this.results.get(c.key) ?? { state: "waiting" };
    const label = c.lora ? `${c.lora.name} at ${c.weight}` : "Without a LoRA";
    if (r.state === "done" && r.preview) {
      return html`<button class="cell done" title=${c.prompt} @click=${() => (this.open = { preview: r.preview!, label })}>
        <img src=${api.genPreviewURL(r.preview)} alt=${label} />
      </button>`;
    }
    if (r.state === "drawing") return html`<div class="cell"><md-circular-progress indeterminate></md-circular-progress></div>`;
    if (r.state === "failed") return html`<div class="cell"><span class="err">${r.error ?? "Failed"}</span></div>`;
    return html`<div class="cell"><span class="material-symbols-rounded">hourglass_empty</span></div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oppai-lora-comparison": OppaiLoraComparison;
  }
}
