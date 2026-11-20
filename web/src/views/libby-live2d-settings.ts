import { LitElement, css, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { api, type Live2DView } from "../api.js";
import { iconStyles } from "../theme.js";
import { LIBBY_EMOTIONS } from "../libby.js";
import type { Live2DSettings } from "../live2d-face.js";
import "./libby-live2d.js";

/**
 * Her Live2D model: giving her one, and how she wears it.
 *
 * Three things have to be true before she is drawn as one, and this panel says which is
 * missing: Live2D's runtime on the server (an admin's to add, once), a model of hers,
 * and the model switched on. The rest is the model's expressions put to work — which she
 * wears for each mood, which she always wears — and where she stands in her frame, all
 * of it shown live in the preview beside it as it is changed.
 */
@customElement("oppai-libby-live2d-settings")
export class OppaiLibbyLive2DSettings extends LitElement {
  @state() private view: Live2DView | null = null;
  @state() private busy = "";
  @state() private note = "";
  @state() private bad = false;
  /** The mood the preview shows. */
  @state() private previewMood = "neutral";
  private saveTimer = 0;

  static styles = [iconStyles, css`
    :host { display: block; container-type: inline-size; }
    h3 { display: flex; align-items: center; gap: 8px; margin: 18px 0 6px; font-size: 14px; }
    h3:first-child { margin-top: 0; }
    p { margin: 0 0 10px; color: var(--oppai-text-muted); font-size: 12.5px; line-height: 1.5; max-width: 66ch; }
    /* Side by side only when the panel is wide enough for both; it usually is not, since
       it sits in the chat's settings column, so the preview goes on top. */
    .layout { display: grid; grid-template-columns: 1fr; gap: 18px; align-items: start; }
    .preview { order: -1; display: grid; gap: 8px; width: min(100%, 300px); justify-self: center; }
    @container (min-width: 760px) {
      .layout { grid-template-columns: minmax(0, 1fr) 280px; }
      .preview { order: 0; position: sticky; top: 0; width: auto; }
    }
    .stage { height: 380px; border-radius: 14px; overflow: hidden; border: 1px solid var(--oppai-border);
      background: radial-gradient(circle at 50% 30%, var(--oppai-surface-2), var(--oppai-surface)); }
    .row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 6px 0; }
    .grid { display: grid; grid-template-columns: 100px minmax(0, 1fr); gap: 6px 12px; align-items: center; }
    .grid select { width: 100%; }
    .grid span { font-size: 13px; text-transform: capitalize; }
    select, input[type="range"] { font: inherit; font-size: 13px; }
    select { padding: 6px 8px; border-radius: 8px; border: 1px solid var(--oppai-border); background: var(--oppai-surface); color: var(--oppai-text); min-width: 0; }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 999px; border: 1px solid var(--oppai-border);
      font-size: 12.5px; cursor: pointer; user-select: none; }
    .chip input { margin: 0; }
    .chip.on { border-color: var(--oppai-primary); }
    label.slider { display: grid; grid-template-columns: 90px minmax(0, 1fr) 44px; align-items: center; gap: 8px; font-size: 13px; }
    button, .file { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border: 1px solid var(--oppai-border);
      border-radius: 999px; background: transparent; color: var(--oppai-text-dim); cursor: pointer; font: inherit; font-size: 12.5px; }
    button:hover:not(:disabled), .file:hover { color: var(--oppai-text); border-color: var(--oppai-border-strong); }
    button:disabled { opacity: .5; cursor: default; }
    .primary { background: var(--oppai-primary); border-color: var(--oppai-primary); color: var(--oppai-on-primary); }
    .danger:hover:not(:disabled) { color: #f2b8b5; border-color: #f2b8b5; }
    .file input { display: none; }
    .material-symbols-rounded { font-size: 17px; }
    .note { margin: 10px 0 0; padding: 9px 12px; border-radius: 10px; background: var(--oppai-surface-2); font-size: 12.5px; }
    .note.bad { background: color-mix(in srgb, #f2b8b5 16%, transparent); color: #f2b8b5; }
    .facts { font-size: 12.5px; color: var(--oppai-text-muted); }
    .warn { color: #f2c37a; }
  `];

  connectedCallback() {
    super.connectedCallback();
    void this.load();
  }

  private async load() {
    try { this.view = await api.libbyLive2D(); }
    catch (error) { this.tell((error as Error).message, true); }
  }

  private tell(note: string, bad = false) { this.note = note; this.bad = bad; }

  private changed() {
    this.dispatchEvent(new CustomEvent("changed", { bubbles: true, composed: true }));
  }

  private async run(what: string, job: () => Promise<void>) {
    this.busy = what;
    try { await job(); }
    catch (error) { this.tell((error as Error).message, true); }
    finally { this.busy = ""; }
  }

  private fetchCore() {
    return this.run("core", async () => {
      await api.fetchLive2DCore();
      await this.load();
      this.tell("Cubism Core is on the server now.");
      this.changed();
    });
  }

  private uploadCore(file: File) {
    return this.run("core", async () => {
      await api.uploadLive2DCore(file);
      await this.load();
      this.tell("Cubism Core is on the server now.");
      this.changed();
    });
  }

  private uploadModel(file: File) {
    return this.run("model", async () => {
      this.tell(`Reading ${file.name}…`);
      this.view = await api.uploadLive2D(file);
      const m = this.view.model;
      const guessed = m ? Object.keys(m.moods).length : 0;
      this.tell(`${m?.name ?? "Her model"} is in: ${m?.expressions.length ?? 0} expressions, ${guessed} of them put on her moods by their names. Check the moods below.`);
      this.changed();
    });
  }

  private removeModel() {
    if (!window.confirm("Remove her Live2D model? Her portrait goes back to her pictures.")) return;
    return this.run("remove", async () => {
      await api.deleteLive2D();
      await this.load();
      this.tell("Removed.");
      this.changed();
    });
  }

  /** Applies a change here at once, so the preview moves with the control, and saves it
      a moment later — a dragged slider is one save, not sixty. */
  private edit(change: Partial<Pick<Live2DSettings, "enabled" | "moods" | "worn" | "scale" | "x" | "y">>) {
    const model = this.view?.model;
    if (!model) return;
    this.view = { ...this.view!, model: { ...model, ...change } };
    // Gathered, so a mood picked and a prop ticked inside one wait are both saved.
    this.pending = { ...this.pending, ...change };
    window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => void this.save(), 400);
  }

  private pending: Partial<Live2DSettings> = {};

  private async save() {
    const body = this.pending;
    this.pending = {};
    try {
      await api.updateLive2D(body);
      this.changed();
    } catch (error) { this.tell((error as Error).message, true); }
  }

  private setMood(mood: string, expression: string) {
    const model = this.view?.model;
    if (!model) return;
    const moods = { ...model.moods };
    if (expression) moods[mood] = [expression]; else delete moods[mood];
    this.previewMood = mood;
    this.edit({ moods });
  }

  private toggleWorn(name: string, on: boolean) {
    const model = this.view?.model;
    if (!model) return;
    const worn = new Set(model.worn ?? []);
    if (on) worn.add(name); else worn.delete(name);
    this.edit({ worn: [...worn] });
  }

  private label(e: { name: string; label?: string }) {
    return e.label ? `${e.label} (${e.name})` : e.name;
  }

  private renderCore(view: Live2DView) {
    if (view.core) return nothing;
    return html`<h3><span class="material-symbols-rounded">memory</span>Live2D's runtime</h3>
      <p>Live2D models are drawn by Cubism Core, which belongs to Live2D Inc. and can't be shipped with OppaiLib. It's added to the server once, by fetching it from Live2D or uploading <code>live2dcubismcore.min.js</code> from the Cubism SDK for Web. Using it means accepting <a href="https://www.live2d.com/eula/live2d-proprietary-software-license-agreement_en.html" target="_blank" rel="noopener noreferrer">Live2D's licence</a>.</p>
      ${view.coreAdmin ? html`<div class="row">
          <button class="primary" ?disabled=${!!this.busy} @click=${() => void this.fetchCore()}><span class="material-symbols-rounded">download</span>${this.busy === "core" ? "Fetching…" : "Fetch from Live2D"}</button>
          <label class="file"><span class="material-symbols-rounded">upload</span>Upload it
            <input type="file" accept=".js,text/javascript" @change=${(e: Event) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) void this.uploadCore(f); }}/></label>
        </div>`
        : html`<p class="warn">Only an admin can add it. Her model can be uploaded now and will show once it's there.</p>`}`;
  }

  private renderModel(model: Live2DSettings) {
    const tooBig = model.texture > 4096;
    return html`
      <h3><span class="material-symbols-rounded">face</span>${model.name}</h3>
      <div class="facts">${model.expressions.length} expressions · ${model.motions} motions${model.idle ? " (an idle loop)" : ""} · ${(model.size / 1048576).toFixed(1)} MB · textures ${model.texture}px
        ${tooBig ? html`<span class="warn"> — larger than many phones can draw</span>` : nothing}</div>
      <div class="row">
        <label class="chip ${model.enabled ? "on" : ""}"><input type="checkbox" .checked=${model.enabled}
          @change=${(e: Event) => this.edit({ enabled: (e.target as HTMLInputElement).checked })}/>Show her as this model</label>
        <label class="file"><span class="material-symbols-rounded">upload</span>Replace
          <input type="file" accept=".zip,application/zip" @change=${(e: Event) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) void this.uploadModel(f); }}/></label>
        <button class="danger" ?disabled=${!!this.busy} @click=${() => void this.removeModel()}><span class="material-symbols-rounded">delete</span>Remove</button>
      </div>

      <h3><span class="material-symbols-rounded">mood</span>Her moods</h3>
      <p>Which of the model's expressions she makes for each mood. Guessed from their names; anything left at “her own face” is just the model at rest.</p>
      <div class="grid">${LIBBY_EMOTIONS.map((mood) => html`
        <span>${mood}</span>
        <select aria-label=${`Expression for ${mood}`} @change=${(e: Event) => this.setMood(mood, (e.target as HTMLSelectElement).value)}
          @focus=${() => (this.previewMood = mood)}>
          <option value="" ?selected=${!model.moods[mood]?.length}>Her own face</option>
          ${model.expressions.map((e) => html`<option value=${e.name} ?selected=${model.moods[mood]?.[0] === e.name}>${this.label(e)}</option>`)}
        </select>`)}
      </div>

      <h3><span class="material-symbols-rounded">checkroom</span>Always wearing</h3>
      <p>Expressions that are really props — a hat, glasses — that she keeps on whatever her mood.</p>
      <div class="chips">${model.expressions.map((e) => {
        const on = (model.worn ?? []).includes(e.name);
        return html`<label class="chip ${on ? "on" : ""}"><input type="checkbox" .checked=${on}
          @change=${(ev: Event) => this.toggleWorn(e.name, (ev.target as HTMLInputElement).checked)}/>${this.label(e)}</label>`;
      })}</div>

      <h3><span class="material-symbols-rounded">crop</span>Framing</h3>
      <label class="slider">Size<input type="range" min="0.5" max="3" step="0.05" .value=${String(model.scale)}
        @input=${(e: Event) => this.edit({ scale: Number((e.target as HTMLInputElement).value) })}/><span>${model.scale.toFixed(2)}×</span></label>
      <label class="slider">Left / right<input type="range" min="-0.6" max="0.6" step="0.01" .value=${String(model.x)}
        @input=${(e: Event) => this.edit({ x: Number((e.target as HTMLInputElement).value) })}/><span>${Math.round(model.x * 100)}%</span></label>
      <label class="slider">Up / down<input type="range" min="-0.6" max="1" step="0.01" .value=${String(model.y)}
        @input=${(e: Event) => this.edit({ y: Number((e.target as HTMLInputElement).value) })}/><span>${Math.round(model.y * 100)}%</span></label>`;
  }

  render() {
    const view = this.view;
    if (!view) return html`<p>Loading…</p>`;
    const model = view.model;
    return html`<div class="layout">
      <div>
        <p>A Live2D model draws her moving: breathing, blinking, following your pointer with her eyes, her mouth moving as she speaks, her face changing with her mood. Cubism 3 and later models only — zip the whole model folder, the one with the <code>.model3.json</code> in it.</p>
        ${this.renderCore(view)}
        ${model ? this.renderModel(model) : html`
          <h3><span class="material-symbols-rounded">face</span>Her model</h3>
          <div class="row"><label class="file primary"><span class="material-symbols-rounded">upload</span>${this.busy === "model" ? "Reading…" : "Upload a model (.zip)"}
            <input type="file" accept=".zip,application/zip" ?disabled=${!!this.busy} @change=${(e: Event) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) void this.uploadModel(f); }}/></label></div>`}
        ${this.note ? html`<p class="note ${this.bad ? "bad" : ""}">${this.note}</p>` : nothing}
      </div>
      ${model && view.core ? html`<div class="preview">
        <div class="stage"><oppai-libby-live2d .settings=${model} emotion=${this.previewMood}></oppai-libby-live2d></div>
        <select aria-label="Mood to preview" @change=${(e: Event) => (this.previewMood = (e.target as HTMLSelectElement).value)}>
          ${LIBBY_EMOTIONS.map((m) => html`<option value=${m} ?selected=${m === this.previewMood}>Preview: ${m}</option>`)}
        </select>
      </div>` : nothing}
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap { "oppai-libby-live2d-settings": OppaiLibbyLive2DSettings }
}
