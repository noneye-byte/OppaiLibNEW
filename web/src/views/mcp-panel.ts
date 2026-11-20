import { LitElement, html, css, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { api, type LaunchyKey } from "../api.js";
import { iconStyles, motionStyles } from "../theme.js";
import { sinceLabel } from "../launchy.js";

/**
 * Settings → MCP: the library as a Model Context Protocol server.
 *
 * Libby reads the shelves through these tools already (api/library_mcp.go); this is the
 * door for anything else that speaks MCP — Claude Desktop, Claude Code, an agent of your
 * own. A client gets a key of its own, shown once when it is made, and that key opens
 * /api/mcp and nothing else: not the library's other routes, not the chat, not this
 * list. Everything the tools do is reading.
 */
@customElement("oppai-mcp-panel")
export class OppaiMcpPanel extends LitElement {
  @state() private keys: LaunchyKey[] | null = null;
  @state() private tools: string[] = [];
  @state() private error = "";
  @state() private name = "";
  @state() private making = false;
  /** The key just made: shown until the panel is left, and never again. */
  @state() private fresh = "";
  @state() private copied = "";

  static styles = [
    iconStyles,
    motionStyles,
    css`
      :host { display: block; }
      .card { border-top: 1px solid var(--oppai-border); padding: 20px 0 4px; margin-bottom: 12px; }
      .card:first-of-type { border-top: 0; padding-top: 0; }
      h3 { display: flex; align-items: center; gap: 10px; font-size: 12px; font-weight: 700; letter-spacing: 0.04em;
        text-transform: uppercase; color: var(--oppai-text-dim); margin: 0 0 4px; }
      h3 .material-symbols-rounded { font-size: 17px; color: var(--oppai-primary-bright); }
      .sub { font-size: 13px; color: var(--oppai-text-muted); margin: 0 0 14px; line-height: 1.5; max-width: 70ch; }
      .row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 10px 0; border-top: 1px solid var(--oppai-border); }
      .row:first-of-type { border-top: 0; }
      .grow { flex: 1; min-width: 180px; }
      .label { font-size: 14px; font-weight: 500; }
      .help { font-size: 12px; color: var(--oppai-text-muted); margin-top: 2px; }
      .box { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin: 10px 0 4px; padding: 12px;
        border-radius: 12px; background: var(--oppai-surface-2); }
      .box input, .box code, pre { flex: 1; min-width: 200px; background: var(--oppai-surface); border: 1px solid var(--oppai-border-strong);
        border-radius: 10px; color: var(--oppai-text); font: 12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; padding: 8px 10px; }
      pre { margin: 8px 0 0; white-space: pre-wrap; word-break: break-all; }
      .box.fresh { border: 1px solid var(--oppai-primary); }
      .tools { display: flex; flex-wrap: wrap; gap: 6px; }
      .tools code { font-size: 12px; padding: 3px 8px; border-radius: 8px; background: var(--oppai-surface-2); }
      .btn-primary, .btn-inline { display: inline-flex; align-items: center; gap: 6px; font: inherit; cursor: pointer; }
      .btn-primary { height: 40px; padding: 0 20px; border-radius: 20px; border: none; background: var(--oppai-primary);
        color: var(--oppai-on-primary); font-size: 14px; font-weight: 600; }
      .btn-inline { border: 1px solid var(--oppai-border-strong); border-radius: 10px; background: transparent;
        color: var(--oppai-text-dim); font-size: 12px; padding: 7px 10px; }
      .btn-primary[disabled], .btn-inline[disabled] { opacity: 0.5; cursor: default; }
      .btn-primary .material-symbols-rounded, .btn-inline .material-symbols-rounded { font-size: 17px; }
      .name { background: var(--oppai-surface); border: 1px solid var(--oppai-border-strong); border-radius: 10px;
        color: var(--oppai-text); font: inherit; font-size: 13px; padding: 9px 12px; min-width: 200px; }
      .banner { display: flex; align-items: center; gap: 8px; font-size: 13px; border-radius: 12px; padding: 10px 14px; margin-bottom: 16px;
        background: color-mix(in srgb, var(--oppai-fav) 18%, transparent); color: var(--oppai-fav); }
      .empty { font-size: 13px; color: var(--oppai-text-muted); padding: 6px 0 10px; }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    void this.load();
  }

  private get endpoint() {
    return `${location.origin}/api/mcp`;
  }

  private async load() {
    try {
      const out = await api.mcpKeys();
      this.keys = out.items ?? [];
      this.tools = out.tools ?? [];
      this.error = "";
    } catch (err) {
      this.error = (err as Error).message;
      this.keys = [];
    }
  }

  private async make() {
    this.making = true;
    try {
      const out = await api.createMcpKey(this.name.trim());
      this.fresh = out.key;
      this.name = "";
      await this.load();
    } catch (err) {
      this.error = (err as Error).message;
    } finally {
      this.making = false;
    }
  }

  private async revoke(key: LaunchyKey) {
    if (!window.confirm(`Revoke the key for “${key.name}”? It stops working at once.`)) return;
    try {
      await api.revokeMcpKey(key.id);
      await this.load();
    } catch (err) {
      this.error = (err as Error).message;
    }
  }

  private async copy(what: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      this.copied = what;
      window.setTimeout(() => { if (this.copied === what) this.copied = ""; }, 1800);
    } catch { /* the field is selectable by hand */ }
  }

  render() {
    const key = this.fresh || "<your key>";
    const claudeCode = `claude mcp add --transport http oppailib ${this.endpoint} --header "Authorization: Bearer ${key}"`;
    const json = JSON.stringify({ mcpServers: { oppailib: { type: "http", url: this.endpoint, headers: { Authorization: `Bearer ${key}` } } } }, null, 2);
    return html`
      ${this.error ? html`<div class="banner"><span class="material-symbols-rounded" style="font-size:18px;">error</span>${this.error}</div>` : nothing}
      <section class="card">
        <h3><span class="material-symbols-rounded">key</span>Library over MCP</h3>
        <p class="sub">Libby reads your shelves through these tools. Any other client that speaks the Model Context Protocol can too, with a key made here. A key opens this one endpoint and nothing else, and every tool only reads.</p>
        <div class="box">
          <code>${this.endpoint}</code>
          <button class="btn-inline" @click=${() => void this.copy("url", this.endpoint)}><span class="material-symbols-rounded">content_copy</span>${this.copied === "url" ? "Copied" : "Copy"}</button>
        </div>
        ${this.tools.length ? html`<div class="row"><div class="grow"><div class="label">Tools</div>
          <div class="tools">${this.tools.map((t) => html`<code>${t}</code>`)}</div></div></div>` : nothing}
      </section>
      <section class="card">
        <h3><span class="material-symbols-rounded">add</span>New key</h3>
        <div class="row">
          <input class="name" placeholder="What it's for, e.g. Claude Desktop" .value=${this.name}
            @input=${(e: Event) => (this.name = (e.target as HTMLInputElement).value)}
            @keydown=${(e: KeyboardEvent) => { if (e.key === "Enter") void this.make(); }}/>
          <button class="btn-primary" ?disabled=${this.making} @click=${() => void this.make()}>${this.making ? "Making…" : "Make a key"}</button>
        </div>
        ${this.fresh ? html`
          <div class="box fresh">
            <input readonly .value=${this.fresh} @focus=${(e: Event) => (e.target as HTMLInputElement).select()}/>
            <button class="btn-inline" @click=${() => void this.copy("key", this.fresh)}><span class="material-symbols-rounded">content_copy</span>${this.copied === "key" ? "Copied" : "Copy"}</button>
          </div>
          <p class="help">This is the only time the key is shown. Keep it in the client's settings; if it's lost, revoke it and make another.</p>` : nothing}
        <div class="row"><div class="grow">
          <div class="label">Claude Code</div>
          <pre>${claudeCode}</pre>
          <div class="label" style="margin-top:12px">A client configured with JSON</div>
          <pre>${json}</pre>
        </div></div>
      </section>
      <section class="card">
        <h3><span class="material-symbols-rounded">key</span>Keys</h3>
        ${this.keys === null ? html`<div class="empty">Loading…</div>`
          : this.keys.length === 0 ? html`<div class="empty">No keys yet. Libby doesn't need one — she's inside.</div>`
          : this.keys.map((k) => html`<div class="row">
              <div class="grow"><div class="label">${k.name}</div>
                <div class="help">…${k.hint} · made ${sinceLabel(k.createdAt)}${k.lastUsedAt ? html` · last used ${sinceLabel(k.lastUsedAt)}` : " · never used"}</div></div>
              <button class="btn-inline" @click=${() => void this.revoke(k)}><span class="material-symbols-rounded">delete</span>Revoke</button>
            </div>`)}
      </section>`;
  }
}

declare global {
  interface HTMLElementTagNameMap { "oppai-mcp-panel": OppaiMcpPanel }
}
