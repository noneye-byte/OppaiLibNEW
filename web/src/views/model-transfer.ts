import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { api } from "../api.js";
import { formatBytes } from "../media-meta.js";
import { iconStyles } from "../theme.js";
import {
  TRANSFER_KINDS, jobShare, jobSummary, planHasWork, planRoomWarning, planSummary,
  type TransferJob, type TransferKind, type TransferPlace, type TransferPlan,
} from "../model-transfer.js";

/** How often a running transfer is asked how it is doing. It is hours of disk, and the
    bar moves slowly; every couple of seconds is plenty. */
const POLL_MS = 2000;

/**
 * Bringing models across from one generator to another, in Settings. The work is the
 * server's and goes on without this screen; on coming back it finds the transfer
 * running and follows it. See imagegen/model_transfer.go.
 */
@customElement("oppai-model-transfer")
export class OppaiModelTransfer extends LitElement {
  @property({ type: Boolean }) canEdit = false;

  @state() private places: TransferPlace[] = [];
  @state() private job: TransferJob | null = null;
  @state() private from = "models";
  @state() private to = "comfy";
  @state() private kinds = new Set<TransferKind>(["checkpoints", "loras", "vae"]);
  @state() private plan: TransferPlan | null = null;
  @state() private busy = false;
  @state() private error = "";

  private timer = 0;

  static styles = [iconStyles, css`
    :host { display: block; }
    .route { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 10px; }
    .route label { display: grid; gap: 4px; flex: 1 1 180px; min-width: 0; font-size: 12px; color: var(--oppai-text-muted); }
    .route .material-symbols-rounded { color: var(--oppai-text-muted); margin-top: 18px; }
    select { height: 38px; border-radius: 10px; border: 1px solid var(--oppai-border-strong); background: transparent; color: var(--oppai-text); font: inherit; font-size: 13px; padding: 0 8px; min-width: 0; width: 100%; }
    select option { background: var(--oppai-surface, #1b1512); color: var(--oppai-text); }
    .dir { font-size: 11.5px; color: var(--oppai-text-muted); overflow-wrap: anywhere; min-height: 15px; }
    .dir.bad { color: var(--oppai-error); }
    .kinds { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 12px; font-size: 13px; color: var(--oppai-text-dim); }
    .kinds label { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    button { border: 1px solid var(--oppai-border-strong); border-radius: 10px; background: transparent; color: var(--oppai-text-dim); font: inherit; font-size: 13px; padding: 8px 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
    button.primary { background: var(--oppai-primary); color: var(--oppai-on-primary); border-color: transparent; font-weight: 600; }
    button[disabled] { opacity: 0.5; cursor: default; }
    button .material-symbols-rounded { font-size: 17px; }
    .note { margin-top: 10px; font-size: 12.5px; line-height: 1.45; color: var(--oppai-text-dim); }
    .note.warn { color: var(--oppai-primary-bright); }
    .note.bad { color: var(--oppai-error); }
    .bar { height: 6px; border-radius: 3px; background: var(--oppai-border-strong); overflow: hidden; margin-top: 12px; }
    .bar span { display: block; height: 100%; background: var(--oppai-primary); transition: width 0.4s; }
    .current { font-size: 11.5px; color: var(--oppai-text-muted); margin-top: 4px; overflow-wrap: anywhere; }
  `];

  connectedCallback() {
    super.connectedCallback();
    void this.load();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.clearTimeout(this.timer);
  }

  private async load() {
    try {
      const st = await api.modelTransfer();
      this.places = st.places;
      this.job = st.job;
      this.error = "";
      window.clearTimeout(this.timer);
      if (st.job?.state === "running") this.timer = window.setTimeout(() => void this.load(), POLL_MS);
    } catch (e) {
      this.error = (e as Error).message;
    }
  }

  private place(id: string) {
    return this.places.find((p) => p.id === id);
  }

  private get request() {
    return { from: this.from, to: this.to, kinds: [...this.kinds] };
  }

  private pick(side: "from" | "to", id: string) {
    this[side] = id;
    // Picking one side's place for the other swaps them, rather than leaving a route
    // from somewhere to itself on the screen.
    const other = side === "from" ? "to" : "from";
    if (this[other] === id) this[other] = this.places.find((p) => p.id !== id)?.id ?? this[other];
    this.plan = null;
    this.error = "";
  }

  private toggleKind(kind: TransferKind) {
    const next = new Set(this.kinds);
    if (!next.delete(kind)) next.add(kind);
    this.kinds = next;
    this.plan = null;
  }

  private async look() {
    this.busy = true;
    this.error = "";
    try {
      this.plan = await api.planModelTransfer(this.request);
    } catch (e) {
      this.plan = null;
      this.error = (e as Error).message;
    } finally {
      this.busy = false;
    }
  }

  private async start() {
    this.busy = true;
    this.error = "";
    try {
      this.job = await api.startModelTransfer(this.request);
      this.plan = null;
      void this.load();
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.busy = false;
    }
  }

  private async stop() {
    try {
      await api.stopModelTransfer();
      void this.load();
    } catch (e) {
      this.error = (e as Error).message;
    }
  }

  private renderSide(side: "from" | "to", label: string) {
    const here = this.place(this[side]);
    const dir = here ? Object.values(here.dirs)[0] : "";
    return html`<label>${label}
      <select aria-label=${label} ?disabled=${!this.canEdit} .value=${this[side]}
        @change=${(e: Event) => this.pick(side, (e.target as HTMLSelectElement).value)}>
        ${this.places.map((p) => html`<option value=${p.id} ?selected=${p.id === this[side]}>${p.label}</option>`)}
      </select>
      ${here?.problem ? html`<span class="dir bad">${here.problem}</span>` : html`<span class="dir">${dir ?? ""}</span>`}
    </label>`;
  }

  render() {
    const job = this.job;
    const running = job?.state === "running";
    const usable = !this.place(this.from)?.problem && !this.place(this.to)?.problem;
    const room = this.plan ? planRoomWarning(this.plan, formatBytes) : "";
    return html`
      <div class="route">
        ${this.renderSide("from", "From")}
        <span class="material-symbols-rounded">arrow_forward</span>
        ${this.renderSide("to", "To")}
      </div>
      <div class="kinds" role="group" aria-label="What to transfer">
        ${TRANSFER_KINDS.map((k) => html`<label><input type="checkbox" .checked=${this.kinds.has(k.id)} ?disabled=${!this.canEdit}
          @change=${() => this.toggleKind(k.id)} />${k.label}</label>`)}
      </div>
      ${this.plan ? html`<div class="note">${planSummary(this.plan, formatBytes)}</div>` : nothing}
      ${room ? html`<div class="note warn">${room}</div>` : nothing}
      ${this.error ? html`<div class="note bad">${this.error}</div>` : nothing}
      ${running ? html`<div class="bar"><span style=${`width:${Math.round(jobShare(job) * 100)}%`}></span></div>` : nothing}
      ${job ? html`<div class="note ${job.state === "failed" ? "bad" : ""}" role="status">${jobSummary(job)}</div>` : nothing}
      ${running && job.current ? html`<div class="current">${job.current}</div>` : nothing}
      <div class="actions">
        ${running
          ? html`<button @click=${() => void this.stop()}><span class="material-symbols-rounded">stop_circle</span>Stop</button>`
          : html`
            <button ?disabled=${!this.canEdit || this.busy || !usable || !this.kinds.size} @click=${() => void this.look()}>
              <span class="material-symbols-rounded">swap_horiz</span>See what would move</button>
            ${this.plan && planHasWork(this.plan) ? html`<button class="primary" ?disabled=${!this.canEdit || this.busy} @click=${() => void this.start()}>
              <span class="material-symbols-rounded">drive_file_move</span>Transfer</button>` : nothing}`}
      </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oppai-model-transfer": OppaiModelTransfer;
  }
}
