import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { iconStyles, motionStyles } from "../theme.js";
import { api, type ModelRename, type NameSuggestion, type NamedKind } from "../api.js";
import { renameRows, renamesToSend, withExtension, type RenameRow } from "../model-rename.js";

/**
 * Naming LoRAs or ADetailer's detectors after what Civitai says they are.
 *
 * It asks the catalogue about each one a batch at a time (so two hundred LoRAs show
 * how far it has got), lists what each would be called — every name editable, the
 * changes ticked — and renames the ticked ones when asked; nothing is renamed before
 * that. One LoRA opened from its card's menu is the same list of one, which is how a
 * name is typed by hand: its box starts with Civitai's name, or its own when Civitai
 * does not know it.
 *
 * Fires "renamed" {renamed} with what the server renamed (on itself, not bubbling), so the studio can move the
 * LoRAs that are on, the people's and the prompt's tags; and "close".
 */

const BATCH = 24;

@customElement("oppai-rename-dialog")
export class OppaiRenameDialog extends LitElement {
  @property() kind: NamedKind = "lora";
  /** The ones to name. */
  @property({ attribute: false }) names: string[] = [];
  /** Every name of this kind there is, so a new name does not take another's. */
  @property({ attribute: false }) existing: string[] = [];

  @state() private suggestions: NameSuggestion[] = [];
  @state() private rows: RenameRow[] = [];
  @state() private asked = 0;
  @state() private askError = "";
  @state() private showAll = false;
  @state() private applying = false;
  @state() private failed: { name: string; error: string }[] = [];
  private cancelled = false;

  static styles = [
    iconStyles,
    motionStyles,
    css`
      :host { position: fixed; inset: 0; z-index: 60; display: grid; place-items: center; padding: 16px; box-sizing: border-box; }
      .scrim { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.55); animation: oppai-fade-in 0.15s ease both; }
      .card {
        position: relative; width: min(640px, 100%); max-height: min(720px, calc(100vh - 32px)); display: flex; flex-direction: column;
        border-radius: 20px; background: var(--oppai-surface); color: var(--oppai-text); border: 1px solid var(--oppai-border-strong);
        box-shadow: 0 18px 50px rgba(0, 0, 0, 0.45); animation: oppai-fade-in-up 0.2s var(--oppai-ease-emphasized, ease) both;
      }
      .head { display: flex; align-items: center; gap: 10px; padding: 16px 18px 10px; }
      .head .material-symbols-rounded { color: var(--oppai-primary-bright, var(--oppai-primary)); }
      .head h2 { margin: 0; font-size: 16px; font-weight: 650; flex: 1; }
      .x { border: none; background: none; color: var(--oppai-text-muted); width: 32px; height: 32px; border-radius: 16px; cursor: pointer; display: grid; place-items: center; }
      .x:hover { background: var(--oppai-surface-2); color: var(--oppai-text); }
      .intro { padding: 0 18px 10px; font-size: 12.5px; line-height: 1.45; color: var(--oppai-text-dim); }
      .progress { height: 4px; margin: 0 18px 10px; border-radius: 2px; background: var(--oppai-surface-2); overflow: hidden; }
      .progress span { display: block; height: 100%; background: var(--oppai-primary); transition: width 0.3s ease; }
      .list { flex: 1; min-height: 80px; overflow-y: auto; padding: 0 18px; display: flex; flex-direction: column; gap: 6px; }
      .row {
        display: grid; grid-template-columns: 24px minmax(0, 1fr); column-gap: 8px; row-gap: 3px; align-items: center;
        padding: 8px 10px; border-radius: 12px; background: var(--oppai-surface-2);
      }
      .row.off { opacity: 0.65; }
      .row input[type="checkbox"] { grid-row: 1 / 3; width: 18px; height: 18px; accent-color: var(--oppai-primary); margin: 0; }
      .old { font-size: 11.5px; color: var(--oppai-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .old .why { color: var(--oppai-text-dim); }
      .new {
        width: 100%; box-sizing: border-box; height: 32px; padding: 0 10px; border-radius: 8px; border: 1px solid var(--oppai-border-strong);
        background: var(--oppai-surface); color: var(--oppai-text); font: inherit; font-size: 13px; outline: none;
      }
      .new:focus { border-color: var(--oppai-primary); }
      .summary { padding: 10px 18px 0; font-size: 12px; color: var(--oppai-text-muted); display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
      .summary button { border: none; background: none; color: var(--oppai-primary-bright, var(--oppai-primary)); font: inherit; font-size: 12px; cursor: pointer; padding: 2px 4px; }
      .error { margin: 8px 18px 0; padding: 8px 10px; border-radius: 10px; font-size: 12px; line-height: 1.4;
        background: color-mix(in srgb, var(--oppai-error, #f2b8b5) 16%, transparent); color: var(--oppai-text); }
      .foot { display: flex; align-items: center; gap: 8px; padding: 14px 18px 16px; }
      .foot .grow { flex: 1; font-size: 12px; color: var(--oppai-text-dim); }
      .btn {
        height: 36px; padding: 0 16px; border-radius: 18px; border: 1px solid var(--oppai-border-strong); background: none;
        color: var(--oppai-text); font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;
      }
      .btn.primary { background: var(--oppai-primary); border-color: var(--oppai-primary); color: var(--oppai-on-primary); }
      .btn:disabled { opacity: 0.5; cursor: default; }
      .empty { padding: 18px 2px; font-size: 12.5px; color: var(--oppai-text-muted); text-align: center; }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("keydown", this.onKey);
  }

  // Not connectedCallback: an element can connect before its property bindings are
  // applied (CLAUDE.md, "Lazy views upgrade late"), and `names` would be empty.
  firstUpdated() {
    this.showAll = this.names.length <= 3;
    void this.ask();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.cancelled = true;
    window.removeEventListener("keydown", this.onKey);
  }

  private onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape" && !this.applying) this.close();
  };

  private close() {
    this.dispatchEvent(new CustomEvent("close"));
  }

  /** Asks the catalogue a batch at a time; each answer goes on screen as it comes. */
  private async ask() {
    for (let i = 0; i < this.names.length && !this.cancelled; i += BATCH) {
      try {
        const { suggestions } = await api.suggestNames(this.kind, this.names.slice(i, i + BATCH));
        this.suggestions = [...this.suggestions, ...suggestions];
      } catch (e) {
        // What could not be asked about can still be named by hand.
        this.askError = `Civitai stopped answering: ${(e as Error).message}`;
        this.suggestions = [...this.suggestions, ...this.names.slice(i).map((name) => ({ name, outcome: "error" as const }))];
        i = this.names.length;
      }
      this.asked = this.suggestions.length;
      this.mergeRows();
    }
  }

  /** The rows from every answer so far, keeping what has been typed or unticked. */
  private mergeRows() {
    const before = new Map(this.rows.map((r) => [r.name, r]));
    this.rows = renameRows(this.kind, this.suggestions, this.existing).map((r) => {
      const was = before.get(r.name);
      return was ? { ...r, to: was.to, pick: was.pick } : { ...r, to: r.to || r.name };
    });
  }

  private edit(name: string, to: string) {
    this.rows = this.rows.map((r) => (r.name === name ? { ...r, to, pick: withExtension(this.kind, to) !== r.name && !!withExtension(this.kind, to) } : r));
  }

  private tick(name: string, pick: boolean) {
    this.rows = this.rows.map((r) => (r.name === name ? { ...r, pick } : r));
  }

  private async apply() {
    const renames = renamesToSend(this.kind, this.rows);
    if (!renames.length) return;
    this.applying = true;
    this.failed = [];
    const renamed: ModelRename[] = [];
    try {
      for (let i = 0; i < renames.length; i += 100) {
        const res = await api.renameModels(this.kind, renames.slice(i, i + 100));
        renamed.push(...res.renamed);
        this.failed = [...this.failed, ...res.failed];
      }
    } catch (e) {
      this.failed = [...this.failed, { name: "", error: (e as Error).message }];
    } finally {
      this.applying = false;
    }
    if (renamed.length) this.dispatchEvent(new CustomEvent("renamed", { detail: { renamed } }));
    if (!this.failed.length) {
      this.close();
      return;
    }
    // What was renamed is out of the list; what failed stays, to be fixed and retried.
    const done = new Set(renamed.map((r) => r.oldName));
    this.rows = this.rows.filter((r) => !done.has(r.name));
  }

  private why(r: RenameRow): string {
    switch (r.outcome) {
      case "named": return r.civitai ? `on Civitai as “${r.civitai}”` : "";
      case "same": return "already named after Civitai";
      case "unknown": return "Civitai doesn't know it";
      case "unhashed": return "not hashed yet — try again in a minute";
      default: return r.error ? `couldn't ask: ${r.error}` : "couldn't ask Civitai";
    }
  }

  render() {
    const total = this.names.length;
    const asking = this.asked < total && !this.askError;
    const shown = this.showAll ? this.rows : this.rows.filter((r) => r.outcome === "named" || r.pick);
    const hidden = this.rows.length - shown.length;
    const count = renamesToSend(this.kind, this.rows).length;
    const what = this.kind === "detector" ? "detector" : "LoRA";
    return html`
      <div class="scrim" @click=${() => !this.applying && this.close()}></div>
      <div class="card" role="dialog" aria-modal="true" aria-label=${`Name ${what}s after Civitai`}>
        <div class="head">
          <span class="material-symbols-rounded">edit_note</span>
          <h2>${total === 1 ? `Rename this ${what}` : `Name ${total} ${what}s after Civitai`}</h2>
          <button class="x" title="Close" aria-label="Close" ?disabled=${this.applying} @click=${() => this.close()}>
            <span class="material-symbols-rounded">close</span></button>
        </div>
        <div class="intro">
          ${this.kind === "detector"
            ? "Each detector is named for what it finds and which YOLO it is, as ADetailer's own are. ADetailer reads the new names when Automatic1111 restarts."
            : "Each LoRA is named after its model and version on Civitai. Its cover, trigger words and category go with it, and the LoRAs that are on follow the new name."}
        </div>
        ${asking ? html`<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax=${total} aria-valuenow=${this.asked}>
          <span style="width:${Math.round((this.asked / Math.max(1, total)) * 100)}%"></span></div>` : nothing}
        <div class="list">
          ${shown.map((r) => html`<div class="row ${r.pick ? "" : "off"}">
            <input type="checkbox" .checked=${r.pick} aria-label=${`Rename ${r.name}`}
              ?disabled=${!withExtension(this.kind, r.to) || withExtension(this.kind, r.to) === r.name}
              @change=${(e: Event) => this.tick(r.name, (e.target as HTMLInputElement).checked)} />
            <span class="old" title=${r.name}>${r.name}${this.why(r) ? html` <span class="why">· ${this.why(r)}</span>` : nothing}</span>
            <input class="new" .value=${r.to} aria-label=${`New name for ${r.name}`} spellcheck="false"
              @input=${(e: Event) => this.edit(r.name, (e.target as HTMLInputElement).value)} />
          </div>`)}
          ${!shown.length
            ? html`<div class="empty">${asking ? "Asking Civitai…" : this.rows.length ? "Civitai has no new names for these." : ""}</div>`
            : nothing}
        </div>
        <div class="summary">
          ${asking ? html`<span>Asking Civitai… ${this.asked} of ${total}</span>` : nothing}
          ${hidden ? html`<span>${hidden} more without a new name</span>` : nothing}
          ${hidden || (this.showAll && total > 3)
            ? html`<button @click=${() => (this.showAll = !this.showAll)}>${this.showAll ? "Only the ones to rename" : "Show them to name by hand"}</button>`
            : nothing}
        </div>
        ${this.askError ? html`<div class="error">${this.askError}</div>` : nothing}
        ${this.failed.length ? html`<div class="error">${this.failed.map((f) => html`<div>${f.name ? html`<b>${f.name}</b>: ` : nothing}${f.error}</div>`)}</div>` : nothing}
        <div class="foot">
          <span class="grow">${count ? `${count} to rename` : ""}</span>
          <button class="btn" ?disabled=${this.applying} @click=${() => this.close()}>Cancel</button>
          <button class="btn primary" ?disabled=${!count || this.applying} @click=${() => void this.apply()}>
            ${this.applying ? "Renaming…" : count === 1 ? "Rename" : `Rename ${count || ""}`}</button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oppai-rename-dialog": OppaiRenameDialog;
  }
}
