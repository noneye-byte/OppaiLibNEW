import { LitElement, html, css, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { iconStyles } from "../theme.js";
import type { ForgeFamily, GenModel, ImageGenStatus } from "../api.js";
import { type ForgeChoices, tuneLabel } from "../forge.js";

/**
 * What Forge Neo offers beyond a sampler and a step count: the part of Model settings
 * that only shows on Forge. Nothing here needs touching: the server settles a family's
 * schedule, shift and files on its own, and this is for overriding them. See forge.ts.
 *
 * A script is shown only when this Forge has it, since several hide behind a setting of
 * Forge's, and a run that asks for one it has not loaded fails with a 422.
 *
 * The studio owns the choices and reference pictures; this asks through two events:
 *   forge-change {changes}, forge-references {references}.
 */
@customElement("oppai-forge-panel")
export class OppaiForgePanel extends LitElement {
  @property({ attribute: false }) status: ImageGenStatus | null = null;
  @property({ attribute: false }) family: ForgeFamily | undefined;
  @property({ attribute: false }) model: GenModel | undefined;
  @property({ attribute: false }) choices!: ForgeChoices;
  /** Pictures an edit model works from, as data URLs. */
  @property({ attribute: false }) references: string[] = [];
  /** The run starts from a picture, which is what makes reference mode mean anything. */
  @property({ type: Boolean }) fromPicture = false;

  static styles = [
    iconStyles,
    css`
      :host { display: grid; gap: 10px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .full { grid-column: 1 / -1; }
      label.field { display: block; font-size: 12px; color: var(--oppai-text-muted); margin-bottom: 4px; }
      select, input[type="number"] {
        width: 100%; box-sizing: border-box; padding: 7px 8px; border-radius: 8px; font: inherit; font-size: 13px;
        color: var(--oppai-text); background: var(--oppai-surface-2, transparent);
        border: 1px solid var(--oppai-border, rgba(127, 127, 127, 0.3));
      }
      .switch-row { display: flex; align-items: center; gap: 8px; font-size: 13px; }
      .switch-row small { color: var(--oppai-text-muted); }
      .refs { display: flex; flex-wrap: wrap; gap: 6px; }
      .ref { position: relative; width: 56px; height: 56px; }
      .ref img { width: 100%; height: 100%; object-fit: cover; border-radius: 8px; display: block; }
      .ref button {
        position: absolute; top: 2px; right: 2px; width: 20px; height: 20px; padding: 0; display: grid; place-items: center;
        border: none; border-radius: 50%; color: #fff; background: rgba(0, 0, 0, 0.6); cursor: pointer;
      }
      .ref .material-symbols-rounded { font-size: 14px; }
      .add {
        width: 56px; height: 56px; display: grid; place-items: center; border-radius: 8px; cursor: pointer;
        border: 1px dashed var(--oppai-border, rgba(127, 127, 127, 0.4)); color: var(--oppai-text-muted);
      }
      .add input { display: none; }
      .note { font-size: 12px; color: var(--oppai-text-muted); }
    `,
  ];

  private has(script: string): boolean {
    return (this.status?.forgeExtras ?? []).includes(script);
  }

  private change(changes: Partial<ForgeChoices>) {
    this.dispatchEvent(new CustomEvent("forge-change", { detail: { changes }, bubbles: true, composed: true }));
  }

  private setReferences(references: string[]) {
    this.dispatchEvent(new CustomEvent("forge-references", { detail: { references }, bubbles: true, composed: true }));
  }

  private async addReferences(e: Event) {
    const input = e.target as HTMLInputElement;
    const read = (f: File) => new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error);
      r.readAsDataURL(f);
    });
    const added = await Promise.all([...(input.files ?? [])].map(read));
    input.value = "";
    this.setReferences([...this.references, ...added]);
  }

  /** Files for one slot, or nothing to pick between. Choosing one takes the place of
      whatever else of its kind and name was chosen, leaving the other slots' picks. */
  private renderModules() {
    const needs = (this.family?.needs ?? []).filter((s) => s.have.length > 1);
    return needs.map((slot) => {
      const chosen = this.choices.modules.find((m) => slot.have.includes(m)) ?? "";
      return html`<div class="full">
        <label class="field">${slot.label}</label>
        <select @change=${(e: Event) => {
          const value = (e.target as HTMLSelectElement).value;
          const others = this.choices.modules.filter((m) => !slot.have.includes(m));
          this.change({ modules: value ? [...others, value] : others });
        }}>
          <option value="" ?selected=${!chosen}>Automatic (${slot.have[0]})</option>
          ${slot.have.map((name) => html`<option value=${name} ?selected=${name === chosen}>${name}</option>`)}
        </select>
      </div>`;
    });
  }

  private renderRefiner() {
    if (!this.has("Refiner")) return nothing;
    const models = (this.status?.models ?? []).filter((m) => m.title !== this.model?.title && m.family === this.model?.family);
    if (!models.length) return nothing;
    return html`
      <div class=${this.choices.refiner ? "" : "full"}>
        <label class="field">Refiner</label>
        <select @change=${(e: Event) => this.change({ refiner: (e.target as HTMLSelectElement).value })}>
          <option value="" ?selected=${!this.choices.refiner}>None</option>
          ${models.map((m) => html`<option value=${m.title} ?selected=${m.title === this.choices.refiner}>${m.model_name}</option>`)}
        </select>
      </div>
      ${this.choices.refiner ? html`<div>
        <label class="field">Takes over at</label>
        <input type="number" min="0.05" max="0.95" step="0.05" .value=${String(this.choices.refinerAt)}
          @change=${(e: Event) => this.change({ refinerAt: Number((e.target as HTMLInputElement).value) || 0.8 })} />
      </div>` : nothing}
    `;
  }

  private toggle(key: "spectrum" | "sparse" | "offload" | "tiledVae" | "mahiro", script: string, label: string, hint: string) {
    if (!this.has(script)) return nothing;
    return html`<label class="switch-row full"><input type="checkbox" .checked=${this.choices[key]}
      @change=${(e: Event) => this.change({ [key]: (e.target as HTMLInputElement).checked })} />
      ${label} <small>${hint}</small></label>`;
  }

  render() {
    const c = this.choices;
    const fam = this.family;
    const tune = tuneLabel(fam?.tune);
    const schedulers = this.status?.forgeSchedulers ?? [];
    const pids = this.has("PiD Integrated") ? (this.status?.models ?? []).filter((m) => m.family === "pid") : [];
    return html`
      <div class="grid">
        ${schedulers.length
          ? html`<div>
              <label class="field">Noise schedule</label>
              <select @change=${(e: Event) => this.change({ scheduler: (e.target as HTMLSelectElement).value })}>
                <option value="" ?selected=${!c.scheduler}>Automatic${fam?.scheduler ? ` (${fam.scheduler})` : ""}</option>
                ${schedulers.map((s) => html`<option value=${s} ?selected=${s === c.scheduler}>${s}</option>`)}
              </select>
            </div>`
          : nothing}
        ${tune
          ? html`<div>
              <label class="field">${tune}</label>
              <input type="number" min="0" max="24" step="0.05" .value=${String(c.shift || (fam?.shift ?? 0))}
                @change=${(e: Event) => this.change({ shift: Number((e.target as HTMLInputElement).value) || 0 })} />
            </div>`
          : nothing}
        ${this.renderModules()}
        ${this.renderRefiner()}
        ${this.has("RescaleCFG")
          ? html`<div>
              <label class="field">Rescale CFG</label>
              <input type="number" min="0" max="1" step="0.05" .value=${String(c.rescaleCfg)}
                @change=${(e: Event) => this.change({ rescaleCfg: Number((e.target as HTMLInputElement).value) || 0 })} />
            </div>`
          : nothing}
        ${pids.length
          ? html`<div class="full">
              <label class="field">Finish with PiD</label>
              <select @change=${(e: Event) => this.change({ pid: (e.target as HTMLSelectElement).value })}>
                <option value="" ?selected=${!c.pid}>No</option>
                ${pids.map((m) => html`<option value=${m.title} ?selected=${m.title === c.pid}>${m.model_name}</option>`)}
              </select>
            </div>`
          : nothing}
        ${this.toggle("spectrum", "Spectrum Integrated", "Spectrum", "skips steps it can predict")}
        ${this.toggle("sparse", "Sparse Attention Integrated", "Sol attention", "faster, at some cost to detail")}
        ${this.toggle("mahiro", "MaHiRo", "MaHiRo", "follows the prompt more closely")}
        ${this.toggle("offload", "Never OOM Integrated", "Keep the model off the card", "slow, for a run that won't fit")}
        ${this.toggle("tiledVae", "Never OOM Integrated", "Decode in tiles", "for a large picture that won't fit")}
        ${fam?.reference && this.fromPicture
          ? html`<label class="switch-row full"><input type="checkbox" .checked=${c.asReference}
              @change=${(e: Event) => this.change({ asReference: (e.target as HTMLInputElement).checked })} />
              Edit from the picture <small>rather than drawing over it</small></label>`
          : nothing}
        ${fam?.reference && this.has("ImageStitch Integrated")
          ? html`<div class="full">
              <label class="field">More pictures to work from</label>
              <div class="refs">
                ${this.references.map((r, i) => html`<div class="ref"><img src=${r} alt="Reference ${i + 1}" />
                  <button aria-label="Remove" @click=${() => this.setReferences(this.references.filter((_, n) => n !== i))}>
                    <span class="material-symbols-rounded">close</span>
                  </button></div>`)}
                <label class="add" title="Add a picture">
                  <span class="material-symbols-rounded">add</span>
                  <input type="file" accept="image/*" multiple @change=${this.addReferences} />
                </label>
              </div>
            </div>`
          : nothing}
      </div>
      ${c.pid ? html`<div class="note">PiD can't follow a hires fix, so one is left off when it finishes a picture.</div>` : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oppai-forge-panel": OppaiForgePanel;
  }
}
