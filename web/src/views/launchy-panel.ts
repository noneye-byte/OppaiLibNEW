import { LitElement, html, css, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import {
  api,
  mascotSay,
  type GameSite,
  type LaunchyKey,
  type LaunchyRequest,
  type LaunchyStatus,
} from "../api.js";
import { iconStyles, motionStyles } from "../theme.js";
import {
  DOWNLOAD_STATUS_LABELS,
  awaitOutcome,
  downloadActive,
  launchyCan,
  launchyLink,
  sinceLabel,
} from "../launchy.js";

const SITE_LABELS: Record<GameSite, string> = { itch: "itch.io", f95: "F95zone" };

/** How often the panel re-reads Launchy's state while it is on screen. The launcher
 *  reports within a couple of seconds of anything changing, so this is the lag a
 *  person sees — and it only runs while the panel is open. */
const REFRESH_MS = 4000;

/**
 * Settings → Launchy: linking the desktop launcher, and everything OppaiLib can see
 * and do on the PC through it.
 *
 * Linking is a button that makes a one-time code and opens a launchy://link link;
 * Launchy asks the person at the PC to confirm, then trades the code for a key that
 * lasts until it is revoked here. The rest is the launcher's own report — its
 * sign-ins, what it is running, its downloads — and the requests that act on them.
 * Nothing here talks to the PC: every request is queued on the server and picked up
 * by the launcher's poll, and refused outright when it is not connected.
 */
@customElement("oppai-launchy-panel")
export class OppaiLaunchyPanel extends LitElement {
  @state() private status: LaunchyStatus | null = null;
  @state() private keys: LaunchyKey[] | null = null;
  @state() private loadError = "";
  /** The link just made, and when its code runs out. */
  @state() private link = "";
  @state() private linkExpires = 0;
  @state() private linking = false;
  /** Requests in flight, by a key naming what they act on, so each button shows its own. */
  @state() private busy: Record<string, boolean> = {};

  private timer: number | null = null;
  private linkIssuedAt = 0;

  static styles = [
    iconStyles,
    motionStyles,
    css`
      :host { display: block; }
      .card {
        border-top: 1px solid var(--oppai-border);
        padding: 20px 0 4px;
        margin-bottom: 12px;
        animation: oppai-fade-in-up 0.28s var(--oppai-ease-emphasized) both;
      }
      .card:first-of-type { border-top: 0; padding-top: 0; }
      h3 {
        display: flex; align-items: center; gap: 10px;
        font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
        color: var(--oppai-text-dim); margin: 0 0 4px;
      }
      h3 .material-symbols-rounded { font-size: 17px; color: var(--oppai-primary-bright); }
      .sub { font-size: 13px; color: var(--oppai-text-muted); margin: 0 0 14px; }
      .row {
        display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
        padding: 10px 0; border-top: 1px solid var(--oppai-border);
      }
      .row:first-of-type { border-top: 0; }
      .row .grow { flex: 1; min-width: 180px; }
      .label { font-size: 14px; font-weight: 500; }
      .help { font-size: 12px; color: var(--oppai-text-muted); margin-top: 2px; }
      .warn { color: var(--oppai-fav); }
      .dot {
        width: 9px; height: 9px; border-radius: 50%; flex: 0 0 auto;
        background: var(--oppai-text-muted);
      }
      .dot.on { background: var(--oppai-primary-bright); }
      .dot.warn { background: var(--oppai-fav); }
      .btn-primary, .btn-inline {
        display: inline-flex; align-items: center; gap: 6px;
        font: inherit; cursor: pointer; text-decoration: none;
      }
      .btn-primary {
        height: 40px; padding: 0 20px; border-radius: 20px; border: none;
        background: var(--oppai-primary); color: var(--oppai-on-primary);
        font-size: 14px; font-weight: 600;
      }
      .btn-inline {
        border: 1px solid var(--oppai-border-strong); border-radius: 10px;
        background: transparent; color: var(--oppai-text-dim);
        font-size: 12px; padding: 7px 10px;
      }
      .btn-primary[disabled], .btn-inline[disabled] { opacity: 0.5; cursor: default; }
      .btn-primary .material-symbols-rounded, .btn-inline .material-symbols-rounded { font-size: 17px; }
      .linkbox {
        display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
        margin: 12px 0 4px; padding: 12px; border-radius: 12px; background: var(--oppai-surface-2);
      }
      .linkbox input {
        flex: 1; min-width: 200px;
        background: var(--oppai-surface); border: 1px solid var(--oppai-border-strong);
        border-radius: 10px; color: var(--oppai-text); font: inherit; font-size: 12px; padding: 8px 10px;
      }
      .banner {
        display: flex; align-items: center; gap: 8px; font-size: 13px;
        border-radius: 12px; padding: 10px 14px; margin-bottom: 16px;
      }
      .banner.error { background: color-mix(in srgb, var(--oppai-fav) 18%, transparent); color: var(--oppai-fav); }
      .banner.info { background: var(--oppai-surface-2); color: var(--oppai-text-dim); }
      .empty { font-size: 13px; color: var(--oppai-text-muted); padding: 6px 0 10px; }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    void this.refresh();
    void this.loadKeys();
    this.timer = window.setInterval(() => void this.refresh(), REFRESH_MS);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.timer != null) clearInterval(this.timer);
    this.timer = null;
  }

  private async refresh() {
    try {
      this.status = await api.launchyStatus();
      this.loadError = "";
    } catch (err) {
      this.loadError = (err as Error).message;
    }
    // A link waiting to be used: the new key is how we learn it was.
    if (this.link) {
      if (Date.now() / 1000 > this.linkExpires) {
        this.link = "";
      } else {
        await this.loadKeys();
        // A key made since the link was — new, or replacing the PC's old one.
        const made = (this.keys ?? []).find((k) => k.createdAt >= this.linkIssuedAt);
        if (made) {
          this.link = "";
          mascotSay(`Launchy on ${made.name} is linked.`);
        }
      }
    }
  }

  private async loadKeys() {
    try {
      this.keys = (await api.launchyKeys()).items;
    } catch (err) {
      this.loadError = (err as Error).message;
    }
  }

  /** Makes a code, builds the link, and opens it — the click is still fresh enough for
   *  the browser to hand a custom scheme to Windows. The link stays on screen to copy,
   *  for linking a PC other than this one or a browser that would not open it. */
  private async makeLink() {
    this.linking = true;
    try {
      const { code, expiresAt } = await api.launchyPairing();
      this.linkIssuedAt = Math.floor(Date.now() / 1000) - 5;
      this.link = launchyLink(location.origin, code);
      this.linkExpires = expiresAt;
      window.location.assign(this.link);
    } catch (err) {
      mascotSay((err as Error).message, "error");
    } finally {
      this.linking = false;
    }
  }

  private async copyLink(e: Event) {
    const input = (e.currentTarget as HTMLElement).parentElement?.querySelector("input");
    try {
      await navigator.clipboard.writeText(this.link);
      mascotSay("Copied the link.");
    } catch {
      // No clipboard API on a plain-http LAN address; select it for Ctrl+C instead.
      input?.select();
      mascotSay("Press Ctrl+C to copy the selected link.");
    }
  }

  private async revoke(key: LaunchyKey) {
    if (!confirm(`Unlink Launchy on ${key.name}? It stops syncing until it is linked again.`)) return;
    try {
      await api.revokeLaunchyKey(key.id);
      await this.loadKeys();
    } catch (err) {
      mascotSay((err as Error).message, "error");
    }
  }

  /** Sends a request and waits for Launchy's answer, saying it either way. */
  private async run(busyKey: string, req: LaunchyRequest, done: string) {
    this.busy = { ...this.busy, [busyKey]: true };
    try {
      const cmd = await api.launchyRequest(req);
      const out = await awaitOutcome(api.launchyRequestStatus, cmd.id, { timeout: req.action === "sync" ? 180_000 : 60_000 });
      if (out.status === "done") mascotSay(out.message || done);
      else mascotSay(out.error || "Launchy could not do that.", "error");
    } catch (err) {
      mascotSay((err as Error).message, "error");
    } finally {
      this.busy = { ...this.busy, [busyKey]: false };
      void this.refresh();
    }
  }

  render() {
    return html`
      ${this.loadError ? html`<div class="banner error"><span class="material-symbols-rounded" style="font-size:18px;">error</span>${this.loadError}</div>` : nothing}
      ${this.renderLink()}
      ${this.renderPC()}
      ${this.renderRunning()}
      ${this.renderDownloads()}
    `;
  }

  private renderLink() {
    const keys = this.keys ?? [];
    return html`
      <section class="card">
        <h3><span class="material-symbols-rounded">link</span>Link</h3>
        <p class="sub">
          Launchy is the desktop launcher. Linked, it keeps its games and this library in step,
          backs saves up here, and lets this app start, close and download games on the PC —
          and OppaiLib reads F95zone through it, because that site now only shows itself to a
          person at a real browser. Open this page on the PC and press the button; Launchy asks
          there before it links.
        </p>
        <div class="row">
          <div class="grow">
            <div class="label">${keys.length ? "Link another PC, or this one again" : "Link Launchy"}</div>
            <div class="help">The link works once, for ten minutes. Linking a PC again replaces its old key.</div>
          </div>
          <button class="btn-primary" ?disabled=${this.linking} @click=${() => void this.makeLink()}>
            <span class="material-symbols-rounded">link</span>${this.linking ? "Making a link…" : "Link Launchy"}
          </button>
        </div>
        ${this.link
          ? html`<div class="linkbox">
              <input readonly .value=${this.link} @focus=${(e: Event) => (e.target as HTMLInputElement).select()} />
              <a class="btn-inline" href=${this.link}><span class="material-symbols-rounded">open_in_new</span>Open Launchy</a>
              <button class="btn-inline" @click=${(e: Event) => void this.copyLink(e)}>
                <span class="material-symbols-rounded">content_copy</span>Copy
              </button>
              <div class="help" style="flex-basis:100%;">
                Nothing happened? Launchy 0.5 or newer registers the link when it is installed — or paste it
                into Launchy under Settings → OppaiLib.
              </div>
            </div>`
          : nothing}
        ${keys.map(
          (k) => html`<div class="row">
            <span class="material-symbols-rounded" style="font-size:18px; color:var(--oppai-text-muted);">key</span>
            <div class="grow">
              <div class="label">${k.name}</div>
              <div class="help">
                Key …${k.hint} · linked ${new Date(k.createdAt * 1000).toLocaleDateString()} ·
                ${k.lastUsedAt ? `last used ${sinceLabel(k.lastUsedAt)}` : "not used yet"}
              </div>
            </div>
            <button class="btn-inline" @click=${() => void this.revoke(k)}>
              <span class="material-symbols-rounded">link_off</span>Unlink
            </button>
          </div>`,
        )}
      </section>
    `;
  }

  private renderPC() {
    const st = this.status;
    if (!st) return nothing;
    const reported = !!st.reportedAt;
    return html`
      <section class="card">
        <h3><span class="material-symbols-rounded">sports_esports</span>The PC</h3>
        <div class="row">
          <span class="dot ${st.connected ? "on" : ""}"></span>
          <div class="grow">
            <div class="label">${st.connected ? `Launchy is running on ${st.name || "the PC"}` : "Launchy is offline"}</div>
            <div class="help">
              ${st.version ? `Version ${st.version} · ` : ""}last checked in ${sinceLabel(st.lastSeen)}
              ${st.connected && !reported ? html` · <span class="warn">an older Launchy — update it to control it from here</span>` : nothing}
            </div>
          </div>
          ${launchyCan(st, "sync")
            ? html`<button class="btn-inline" ?disabled=${this.busy.sync || st.sync?.running}
                @click=${() => void this.run("sync", { action: "sync" }, "Synced.")}>
                <span class="material-symbols-rounded">sync</span>${this.busy.sync || st.sync?.running ? "Syncing…" : "Sync now"}
              </button>`
            : nothing}
        </div>
        ${st.sync?.lastSync || st.sync?.lastError
          ? html`<div class="row"><div class="grow">
              <div class="label">Library sync</div>
              <div class="help">
                ${st.sync.lastSync ? `Last synced ${sinceLabel(st.sync.lastSync)}` : "Not synced yet"}
                ${st.sync.lastError ? html` · <span class="warn">${st.sync.lastError}</span>` : nothing}
              </div>
            </div></div>`
          : nothing}
        ${(st.accounts ?? []).map(
          (a) => html`<div class="row">
            <span class="dot ${a.challenged ? "warn" : a.signedIn ? "on" : ""}"></span>
            <div class="grow">
              <div class="label">${SITE_LABELS[a.site] ?? a.site}</div>
              <div class="help">
                ${a.challenged
                  ? html`<span class="warn">Wants a person to prove they are one — press Verify next to it in Launchy on the PC.</span>`
                  : a.signedIn
                    ? `Signed in${a.user ? ` as ${a.user}` : ""} in Launchy`
                    : "Not signed in in Launchy — sign in there, under Settings → Accounts"}
              </div>
            </div>
          </div>`,
        )}
      </section>
    `;
  }

  private renderRunning() {
    const st = this.status;
    if (!st?.connected || !st.reportedAt) return nothing;
    const sessions = st.sessions ?? [];
    return html`
      <section class="card">
        <h3><span class="material-symbols-rounded">play_arrow</span>Running</h3>
        ${sessions.length === 0 ? html`<div class="empty">Nothing is running on the PC.</div>` : nothing}
        ${sessions.map((s) => {
          const key = `stop:${s.gameId}`;
          return html`<div class="row">
            <div class="grow">
              <div class="label">${s.title || "A game"}</div>
              <div class="help">Started ${sinceLabel(s.startedAt)}</div>
            </div>
            ${launchyCan(st, "stop")
              ? html`<button class="btn-inline" ?disabled=${this.busy[key]}
                  @click=${() => {
                    if (confirm(`Close ${s.title || "this game"} on the PC? Anything unsaved in it is lost.`)) {
                      void this.run(key, { action: "stop", gameId: s.gameId }, "Closed.");
                    }
                  }}>
                  <span class="material-symbols-rounded">stop_circle</span>${this.busy[key] ? "Closing…" : "Close"}
                </button>`
              : nothing}
          </div>`;
        })}
      </section>
    `;
  }

  private renderDownloads() {
    const st = this.status;
    if (!st?.connected || !st.reportedAt) return nothing;
    const downloads = st.downloads ?? [];
    if (!downloads.length) return nothing;
    return html`
      <section class="card">
        <h3><span class="material-symbols-rounded">download</span>Downloads on the PC</h3>
        ${downloads.map((d) => {
          const key = `cancel:${d.id}`;
          return html`<div class="row">
            <div class="grow">
              <div class="label">${d.title}${d.label ? html` <span class="help">· ${d.label}</span>` : nothing}</div>
              <div class="help">
                ${DOWNLOAD_STATUS_LABELS[d.status] ?? d.status}${d.message ? ` — ${d.message}` : ""}
              </div>
            </div>
            ${downloadActive(d) && launchyCan(st, "download")
              ? html`<button class="btn-inline" ?disabled=${this.busy[key]}
                  @click=${() => void this.run(key, { action: "cancel-download", downloadId: d.id }, "Cancelled.")}>
                  <span class="material-symbols-rounded">close</span>Cancel
                </button>`
              : nothing}
          </div>`;
        })}
      </section>
    `;
  }
}
