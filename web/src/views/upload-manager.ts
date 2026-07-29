import { LitElement, html, css, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { motionStyles } from "../theme.js";
import { profileUpdates } from "../ui-metrics.js";
import {
  canCancel,
  canPause,
  canRemove,
  canResume,
  canRetry,
  formatBytes,
  formatEta,
  formatSpeed,
  isLive,
  isTerminal,
  progressOf,
  stateLabel,
  uploads,
  type UploadEntry,
} from "../uploads.js";

/**
 * The upload manager: one place that knows what is being uploaded, how far it has
 * got, and what went wrong.
 *
 * It lives in the app shell rather than in the library view, which is the fix for
 * the thing that was actually broken — progress that disappeared the moment you
 * navigated away from the screen that started it. Collapsed to a small bar by
 * default, because a queue quietly finishing in the background should not occupy the
 * screen; expanded, it is the full list with per-upload controls.
 *
 * Everything on a row is here because it answers a question someone asks while
 * waiting: what is it, where is it going, how fast, how much longer, and — when it
 * failed — what the server actually said, rather than "upload failed".
 */
@customElement("oppai-upload-manager")
export class OppaiUploadManager extends LitElement {
  @state() private entries: UploadEntry[] = [];
  @state() private open = false;
  /** Set once the user closes the bar on a finished queue, so it does not pop back
      up for uploads they have already seen the end of. */
  @state() private dismissed = false;

  private unsubscribe?: () => void;

  static styles = [motionStyles, css`
    :host { display: contents; }

    .dock {
      position: fixed;
      right: 16px;
      bottom: 16px;
      /* Above the mobile bottom bar and clear of the home indicator. */
      bottom: max(16px, calc(env(safe-area-inset-bottom) + 16px));
      z-index: 150;
      width: min(420px, calc(100vw - 32px));
      background: var(--oppai-surface, #1b1b1f);
      color: var(--oppai-text, #e5e1e6);
      border-radius: 16px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, .45);
      overflow: hidden;
      font-size: 13px;
    }
    @media (max-width: 600px) {
      .dock { right: 8px; left: 8px; width: auto; bottom: max(84px, calc(env(safe-area-inset-bottom) + 84px)); }
    }

    header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      cursor: pointer;
      user-select: none;
    }
    header .title { flex: 1; font-weight: 600; }
    header .sub { color: var(--oppai-text-muted, #a5a0a8); font-weight: 400; font-size: 12px; }

    .icon-btn {
      background: none;
      border: 0;
      color: inherit;
      cursor: pointer;
      padding: 4px;
      border-radius: 999px;
      display: grid;
      place-items: center;
      line-height: 1;
    }
    .icon-btn:hover { background: rgba(255, 255, 255, .08); }
    .icon-btn[disabled] { opacity: .35; cursor: default; }
    .material-symbols-rounded { font-family: "Material Symbols Rounded"; font-size: 20px; }

    /* Collapse without measuring anything: a grid row animating 0fr → 1fr needs no
       height, forces no per-frame layout, and reflows nothing beneath it. */
    .body-wrap {
      display: grid;
      grid-template-rows: 0fr;
      transition: grid-template-rows .18s ease;
    }
    .body-wrap.open { grid-template-rows: 1fr; }
    .body { overflow: hidden; }
    .list { max-height: min(52vh, 420px); overflow-y: auto; }
    @media (prefers-reduced-motion: reduce) { .body-wrap { transition: none; } }

    .row {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 4px 8px;
      padding: 10px 12px;
      border-top: 1px solid var(--oppai-outline, #49454f);
    }
    .name {
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .meta { grid-column: 1 / -1; color: var(--oppai-text-muted, #a5a0a8); font-size: 12px; }
    .meta .sep { opacity: .5; margin: 0 6px; }
    .err { grid-column: 1 / -1; color: var(--oppai-error, #f2b8b5); font-size: 12px; }
    .controls { display: flex; gap: 2px; align-items: center; }

    .bar {
      grid-column: 1 / -1;
      height: 4px;
      border-radius: 999px;
      background: rgba(255, 255, 255, .12);
      overflow: hidden;
    }
    .bar > span {
      display: block;
      height: 100%;
      background: var(--oppai-primary, #cfbcff);
      transition: width .2s linear;
    }
    .bar.failed > span { background: var(--oppai-error, #f2b8b5); }
    .bar.done > span { background: var(--oppai-success, #7ddc9a); }
    @media (prefers-reduced-motion: reduce) { .bar > span { transition: none; } }

    footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      border-top: 1px solid var(--oppai-outline, #49454f);
    }
    .link {
      background: none;
      border: 0;
      color: var(--oppai-primary, #cfbcff);
      cursor: pointer;
      font: inherit;
      padding: 4px;
    }
    .hint { color: var(--oppai-text-muted, #a5a0a8); font-size: 12px; }
  `];

  connectedCallback() {
    super.connectedCallback();
    profileUpdates(this, "upload manager");
    this.unsubscribe = uploads.subscribe((entries) => {
      // An arriving upload re-opens a bar the user dismissed: they asked for this one.
      if (entries.some((e) => isLive(e.state)) && this.entries.every((e) => !isLive(e.state))) {
        this.dismissed = false;
        this.open = true;
      }
      this.entries = entries;
    });
    void uploads.restore();
    window.addEventListener("beforeunload", this.warnOnLeave);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.unsubscribe?.();
    window.removeEventListener("beforeunload", this.warnOnLeave);
  }

  /**
   * Warns before leaving with an upload running.
   *
   * Not because the upload is lost — the session survives, which is the point of the
   * whole design — but because the browser is the thing sending the bytes, and
   * closing the tab stops it. The upload can be resumed, and saying so is better than
   * letting it stop silently.
   */
  private warnOnLeave = (e: BeforeUnloadEvent) => {
    if (this.entries.some((entry) => entry.state === "uploading" || entry.state === "processing")) {
      e.preventDefault();
      e.returnValue = "";
    }
  };

  private toggle = () => {
    this.open = !this.open;
    if (!this.open && !this.entries.some((e) => isLive(e.state))) this.dismissed = true;
  };

  private close = (e: Event) => {
    e.stopPropagation();
    this.dismissed = true;
    this.open = false;
  };

  render() {
    if (!this.entries.length || this.dismissed) return nothing;
    const live = this.entries.filter((e) => isLive(e.state));
    const failed = this.entries.filter((e) => e.state === "failed");
    const done = this.entries.filter((e) => e.state === "completed");

    const summary = live.length
      ? `${live.length} upload${live.length === 1 ? "" : "s"} in progress`
      : failed.length
        ? `${failed.length} upload${failed.length === 1 ? "" : "s"} failed`
        : `${done.length} upload${done.length === 1 ? "" : "s"} finished`;

    return html`
      <section class="dock libby-enter" aria-label="Uploads">
        <header @click=${this.toggle}>
          <span class="material-symbols-rounded">${live.length ? "cloud_upload" : failed.length ? "error" : "cloud_done"}</span>
          <span class="title">Uploads <span class="sub">${summary}</span></span>
          <button class="icon-btn" aria-label=${this.open ? "Collapse" : "Expand"} @click=${this.toggle}>
            <span class="material-symbols-rounded">${this.open ? "expand_more" : "expand_less"}</span>
          </button>
          <button class="icon-btn" aria-label="Hide uploads" @click=${this.close}>
            <span class="material-symbols-rounded">close</span>
          </button>
        </header>
        <div class="body-wrap ${this.open ? "open" : ""}">
          <div class="body">
            <div class="list">${this.entries.map((e) => this.renderRow(e))}</div>
            <footer>
              <span class="hint">${live.length ? "One at a time, in order." : "Finished uploads stay here until cleared."}</span>
              <button class="link" ?disabled=${!this.entries.some((e) => isTerminal(e.state))}
                @click=${() => uploads.clearFinished()}>
                Clear finished
              </button>
            </footer>
          </div>
        </div>
      </section>
    `;
  }

  private renderRow(e: UploadEntry) {
    const pct = Math.round(progressOf(e) * 100);
    const speed = formatSpeed(e.bytesPerSecond);
    const eta = formatEta(e.etaSeconds);
    return html`
      <div class="row">
        <div class="name" title=${e.name}>${e.name}</div>
        <div class="controls">
          ${canPause(e) ? html`<button class="icon-btn" aria-label="Pause" @click=${() => uploads.pause(e.id)}>
            <span class="material-symbols-rounded">pause</span></button>` : nothing}
          ${canResume(e) ? html`<button class="icon-btn" aria-label="Resume" @click=${() => uploads.resume(e.id)}>
            <span class="material-symbols-rounded">play_arrow</span></button>` : nothing}
          ${canRetry(e) ? html`<button class="icon-btn" aria-label="Retry" @click=${() => uploads.retry(e.id)}>
            <span class="material-symbols-rounded">refresh</span></button>` : nothing}
          ${e.state === "completed" && e.mediaId
            ? html`<button class="icon-btn" aria-label="Open in the library" @click=${() => this.openItem(e)}>
                <span class="material-symbols-rounded">open_in_new</span></button>`
            : nothing}
          ${e.state === "queued" || e.state === "paused"
            ? html`
              <button class="icon-btn" aria-label="Move up" @click=${() => uploads.move(e.id, -1)}>
                <span class="material-symbols-rounded">arrow_upward</span></button>
              <button class="icon-btn" aria-label="Move down" @click=${() => uploads.move(e.id, 1)}>
                <span class="material-symbols-rounded">arrow_downward</span></button>`
            : nothing}
          ${canCancel(e) ? html`<button class="icon-btn" aria-label="Cancel" @click=${() => uploads.cancel(e.id)}>
            <span class="material-symbols-rounded">stop_circle</span></button>` : nothing}
          ${canRemove(e) ? html`<button class="icon-btn" aria-label="Remove" @click=${() => uploads.remove(e.id)}>
            <span class="material-symbols-rounded">close</span></button>` : nothing}
        </div>
        <div class="bar ${e.state === "failed" ? "failed" : e.state === "completed" ? "done" : ""}">
          <span style="width:${pct}%"></span>
        </div>
        <div class="meta">
          ${stateLabel(e)}
          <span class="sep">·</span>${formatBytes(e.sentBytes)} of ${formatBytes(e.size)} (${pct}%)
          <span class="sep">·</span>${e.destination}
          ${e.mime ? html`<span class="sep">·</span>${e.mime}` : nothing}
          ${speed ? html`<span class="sep">·</span>${speed}` : nothing}
          ${eta ? html`<span class="sep">·</span>${eta}` : nothing}
          ${e.retries ? html`<span class="sep">·</span>${e.retries} retr${e.retries === 1 ? "y" : "ies"}` : nothing}
        </div>
        ${e.needsFile
          ? html`<div class="err">The server still has ${formatBytes(e.sentBytes)} of this. Choose the same file again to carry on.</div>`
          : nothing}
        ${e.error ? html`<div class="err">${e.error}</div>` : nothing}
      </div>
    `;
  }

  private openItem(e: UploadEntry) {
    if (!e.mediaId) return;
    this.dispatchEvent(new CustomEvent("open-media", {
      detail: { id: e.mediaId },
      bubbles: true,
      composed: true,
    }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oppai-upload-manager": OppaiUploadManager;
  }
}
