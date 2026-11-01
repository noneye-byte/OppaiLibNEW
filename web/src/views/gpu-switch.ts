import { LitElement, html, css, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { iconStyles, motionStyles } from "../theme.js";
import { api, type GpuApp, type GpuState } from "../api.js";
import { GPU_SHORT, cardHolder, vramShare, vramText } from "../gpu-card.js";

/**
 * The studio header's graphics-card switch: which of her chat model, the image
 * generator and ComfyUI has the card, and a button to give it to another.
 *
 * The server moves the card on its own as work starts (api/gpu_share.go); this is for
 * the times it can't know — someone about to use one of the three programs' own UIs,
 * or an evening of clips after one of pictures, where the first clip would spend its
 * first minute evicting the checkpoint. Giving it to her model waits for the load, a
 * minute or two, so the button says what it is waiting on.
 */

const ICONS: Record<GpuApp["id"], string> = { chat: "chat", images: "image", video: "movie" };

@customElement("oppai-gpu-switch")
export class OppaiGpuSwitch extends LitElement {
  @state() private open = false;
  @state() private card: GpuState | null = null;
  @state() private loading = false;
  @state() private moving: GpuApp["id"] | "" = "";
  @state() private problems: string[] = [];
  @state() private error = "";
  private onDocClick = (e: MouseEvent) => {
    if (this.open && !e.composedPath().includes(this)) this.open = false;
  };

  static styles = [
    iconStyles,
    motionStyles,
    css`
      :host { position: relative; display: inline-flex; flex: none; }
      button { font: inherit; }
      .material-symbols-rounded { font-size: 18px; }
      .btn {
        height: 36px; display: inline-flex; align-items: center; gap: 6px; padding: 0 12px;
        border: 1px solid var(--oppai-border-strong); border-radius: 10px; background: transparent; color: var(--oppai-text-dim);
        font-size: 12.5px; font-weight: 600; cursor: pointer;
      }
      .btn:hover, .btn.on { background: var(--oppai-surface-2); color: var(--oppai-text); }
      .btn .who { color: var(--oppai-text); }
      .spin { animation: gs-spin 1s linear infinite; }
      @keyframes gs-spin { to { transform: rotate(360deg); } }
      @media (prefers-reduced-motion: reduce) { .spin { animation: none; } }
      .pop {
        position: absolute; z-index: 45; top: calc(100% + 6px); right: 0; width: min(380px, calc(100vw - 24px));
        border: 1px solid var(--oppai-border-strong); border-radius: 16px; background: var(--oppai-surface-2);
        box-shadow: 0 22px 60px rgba(0,0,0,.5); animation: oppai-scale-in 0.16s var(--oppai-ease-emphasized) both;
        transform-origin: top right; overflow: hidden;
      }
      .head { display: flex; align-items: center; gap: 8px; padding: 12px 10px 10px 14px; font-size: 13px; font-weight: 700; border-bottom: 1px solid var(--oppai-border); }
      .head .material-symbols-rounded { color: var(--oppai-primary-bright, var(--oppai-primary)); }
      .head .x { margin-left: auto; width: 28px; height: 28px; border-radius: 14px; border: none; background: none; color: var(--oppai-text-muted); cursor: pointer; display: grid; place-items: center; }
      .head .x:hover { background: var(--oppai-surface); color: var(--oppai-text); }
      .vram { padding: 10px 14px 4px; font-size: 11.5px; color: var(--oppai-text-muted); font-variant-numeric: tabular-nums; }
      .bar { height: 6px; border-radius: 3px; background: var(--oppai-surface); overflow: hidden; margin-top: 5px; }
      .bar span { display: block; height: 100%; background: var(--oppai-primary); border-radius: 3px; transition: width 0.4s ease; }
      ul { list-style: none; margin: 0; padding: 6px; display: flex; flex-direction: column; gap: 2px; }
      li { display: grid; grid-template-columns: 30px minmax(0, 1fr) auto; align-items: center; gap: 10px; padding: 9px 8px; border-radius: 12px; }
      li.has { background: color-mix(in srgb, var(--oppai-primary) 12%, transparent); }
      li .ic { width: 30px; height: 30px; border-radius: 10px; display: grid; place-items: center; background: var(--oppai-surface); color: var(--oppai-text-muted); }
      li.has .ic { color: var(--oppai-primary-bright, var(--oppai-primary)); }
      li b { display: block; font-size: 12.5px; }
      li small { display: block; font-size: 11px; line-height: 1.4; color: var(--oppai-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      li.off { opacity: 0.55; }
      .give {
        height: 28px; padding: 0 10px; border-radius: 14px; border: 1px solid var(--oppai-border-strong); background: transparent;
        color: var(--oppai-text-dim); font-size: 11.5px; font-weight: 650; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;
      }
      .give:hover:not(:disabled) { border-color: var(--oppai-primary); color: var(--oppai-text); }
      .give:disabled { opacity: 0.5; cursor: default; }
      .tag { font-size: 11px; font-weight: 650; color: var(--oppai-primary-bright, var(--oppai-primary)); display: inline-flex; align-items: center; gap: 3px; }
      .tag .material-symbols-rounded, .give .material-symbols-rounded { font-size: 15px; }
      .foot { padding: 8px 14px 12px; font-size: 11.5px; line-height: 1.5; color: var(--oppai-text-muted); }
      .err { color: var(--oppai-error, #f2b8b5); }
      @media (max-width: 760px) {
        .label { display: none; }
        .btn { padding: 0 9px; }
        .pop { position: fixed; top: auto; bottom: 12px; left: 12px; right: 12px; width: auto; }
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener("click", this.onDocClick);
    void this.load();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener("click", this.onDocClick);
  }

  private async load() {
    this.loading = true;
    try {
      this.card = await api.gpuState();
      this.error = "";
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.loading = false;
    }
  }

  private toggle() {
    this.open = !this.open;
    if (this.open) {
      this.problems = [];
      void this.load();
    }
  }

  private async give(to: GpuApp["id"]) {
    this.moving = to;
    this.problems = [];
    this.error = "";
    try {
      const res = await api.gpuSwitch(to);
      this.card = res.state;
      this.problems = res.problems ?? [];
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.moving = "";
    }
  }

  render() {
    const holder = cardHolder(this.card);
    return html`<button class="btn ${this.open ? "on" : ""}" aria-expanded=${this.open ? "true" : "false"}
        title="Which program has the graphics card — her chat, the image generator or ComfyUI" @click=${() => this.toggle()}>
        <span class="material-symbols-rounded ${this.moving ? "spin" : ""}">${this.moving ? "refresh" : "memory"}</span>
        <span class="label">Card${holder || this.moving ? html`: <span class="who">${GPU_SHORT[this.moving || holder as GpuApp["id"]]}</span>` : nothing}</span>
      </button>
      ${this.open ? this.renderPop(holder) : nothing}`;
  }

  private renderPop(holder: GpuApp["id"] | "") {
    const card = this.card;
    const vram = vramText(card);
    const apps = card?.apps ?? [];
    return html`<div class="pop" role="dialog" aria-label="The graphics card">
      <div class="head"><span class="material-symbols-rounded">memory</span>The graphics card
        <button class="x" title="Close" aria-label="Close" @click=${() => (this.open = false)}><span class="material-symbols-rounded">close</span></button></div>
      ${vram ? html`<div class="vram">${vram}<div class="bar"><span style="width:${Math.round(vramShare(card) * 100)}%"></span></div></div>` : nothing}
      ${!card && this.loading ? html`<div class="foot">Asking each program…</div>` : nothing}
      <ul>
        ${apps.map((a) => {
          const has = a.id === holder;
          return html`<li class="${has ? "has" : ""} ${a.set ? "" : "off"}">
            <span class="ic"><span class="material-symbols-rounded">${ICONS[a.id]}</span></span>
            <span><b>${a.name}</b><small title=${a.detail}>${a.set ? a.detail : "not set up"}</small></span>
            ${this.moving === a.id
              ? html`<span class="tag"><span class="material-symbols-rounded spin">refresh</span>${a.id === "chat" ? "Loading…" : "Moving…"}</span>`
              : has ? html`<span class="tag"><span class="material-symbols-rounded">check</span>Has it</span>`
              : html`<button class="give" ?disabled=${!a.set || !a.canTake || !!this.moving || !!card?.busy}
                  title=${card?.busy ? `Wait — ${card.busy}` : !a.canTake ? "Can't be given the card from here" : `The other two let go, and ${a.name} has the whole card`}
                  @click=${() => void this.give(a.id)}><span class="material-symbols-rounded">swap_horiz</span>Give it the card</button>`}
          </li>`;
        })}
      </ul>
      <div class="foot">
        ${card?.busy ? html`<div>Wait — ${card.busy}.</div>` : nothing}
        ${this.problems.map((p) => html`<div class="err">${p}</div>`)}
        ${this.error ? html`<div class="err">${this.error}</div>` : nothing}
        ${!this.problems.length && !this.error ? html`Pictures, clips and her replies take the card when they need it anyway; this is for
          using one of the three in its own window, or getting a long run of one kind ready.` : nothing}
      </div>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oppai-gpu-switch": OppaiGpuSwitch;
  }
}
