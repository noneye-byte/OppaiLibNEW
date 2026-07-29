import { LitElement, html, css, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { iconStyles, motionStyles } from "../theme.js";
import { api, type CivitaiCategory, type CivitaiModel, type CivitaiVersion, type InstallJob } from "../api.js";

/**
 * A full-screen browser over the Civitai catalogue (reached via the civitai.red
 * mirror, proxied by the server). Search checkpoints and LoRAs, flip through
 * their preview images, and hand a version's download URL to InvokeAI to install
 * — the download runs on the generator's box, with progress shown here.
 *
 * The host mounts it conditionally; closing dispatches "close".
 */
@customElement("oppai-civitai")
export class OppaiCivitai extends LitElement {
  @state() private q = "";
  @state() private type = "";
  @state() private sort = "";
  @state() private category = "";
  @state() private categories: CivitaiCategory[] = [];
  @state() private items: CivitaiModel[] = [];
  @state() private cursor = "";
  @state() private loading = false;
  @state() private error = "";
  @state() private detail: CivitaiModel | null = null;
  @state() private versionId = 0;
  @state() private shownImage = "";
  @state() private jobs: InstallJob[] = [];
  @state() private installing = false;

  private jobTimer?: number;

  static styles = [
    iconStyles,
    motionStyles,
    css`
      :host {
        position: fixed;
        inset: 0;
        z-index: 65;
        display: block;
        background: var(--oppai-bg, #141218);
        color: var(--oppai-text);
        overflow-y: auto;
      }
      .wrap {
        max-width: 1240px;
        margin: 0 auto;
        padding: 18px 16px 60px;
      }
      .topbar {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
        position: sticky;
        top: 0;
        background: var(--oppai-bg, #141218);
        padding: 8px 0 12px;
        z-index: 2;
      }
      .topbar h2 {
        margin: 0;
        font-size: 17px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .close {
        margin-left: auto;
        border: none;
        background: var(--oppai-surface-2);
        color: var(--oppai-text);
        border-radius: 10px;
        font: inherit;
        padding: 8px 14px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .controls {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        align-items: center;
        margin-bottom: 14px;
      }
      input[type="search"] {
        flex: 1;
        min-width: 200px;
        background: var(--oppai-surface);
        border: 1px solid var(--oppai-border-strong);
        border-radius: 12px;
        color: var(--oppai-text);
        font: inherit;
        font-size: 14px;
        padding: 9px 12px;
        outline: none;
      }
      input[type="search"]:focus {
        border-color: var(--oppai-primary);
      }
      .chip {
        border: 1px solid var(--oppai-border-strong);
        background: transparent;
        color: var(--oppai-text-dim);
        border-radius: 999px;
        font: inherit;
        font-size: 13px;
        padding: 6px 13px;
        cursor: pointer;
      }
      .chip.on {
        background: var(--oppai-accent);
        color: var(--oppai-on-accent);
        border-color: var(--oppai-accent);
      }
      select {
        background: var(--oppai-surface);
        border: 1px solid var(--oppai-border-strong);
        border-radius: 10px;
        color: var(--oppai-text);
        font: inherit;
        font-size: 13px;
        padding: 7px 10px;
      }
      .jobs {
        background: var(--oppai-surface-2);
        border-radius: 12px;
        padding: 10px 12px;
        margin-bottom: 14px;
        font-size: 12px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .job {
        display: flex;
        gap: 8px;
        align-items: center;
        color: var(--oppai-text-dim);
      }
      .job .st {
        font-weight: 600;
      }
      .job .st.error { color: var(--oppai-error, #f2b8b5); }
      .job .st.completed { color: var(--oppai-primary-bright); }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 14px;
      }
      .card {
        border: none;
        padding: 0;
        text-align: left;
        background: var(--oppai-surface-2);
        border-radius: 14px;
        overflow: hidden;
        cursor: pointer;
        color: var(--oppai-text);
        font: inherit;
        transition: transform 0.18s var(--oppai-ease-spring);
      }
      .card:hover {
        transform: translateY(-2px);
      }
      .card img,
      .card .noimg {
        width: 100%;
        aspect-ratio: 3 / 4;
        object-fit: cover;
        display: block;
        background: var(--oppai-surface);
      }
      .card .noimg {
        display: grid;
        place-items: center;
        color: var(--oppai-text-muted);
      }
      .card .meta {
        padding: 8px 10px 10px;
      }
      .card .name {
        font-size: 13px;
        font-weight: 600;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }
      .card .sub {
        font-size: 11px;
        color: var(--oppai-text-muted);
        margin-top: 3px;
        display: flex;
        gap: 8px;
      }
      .more {
        margin-top: 16px;
        width: 100%;
        border: 1px dashed var(--oppai-border-strong);
        background: none;
        color: var(--oppai-text-dim);
        border-radius: 12px;
        font: inherit;
        font-size: 14px;
        padding: 12px;
        cursor: pointer;
      }
      .note {
        color: var(--oppai-text-muted);
        font-size: 13px;
        padding: 30px 0;
        text-align: center;
      }
      .err {
        color: var(--oppai-error, #f2b8b5);
        font-size: 13px;
        margin-bottom: 12px;
      }

      /* Detail overlay. */
      .overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.65);
        z-index: 80;
        display: grid;
        place-items: center;
        padding: 18px;
      }
      .detail {
        background: var(--oppai-surface-2);
        border-radius: 18px;
        width: min(880px, 100%);
        max-height: 92vh;
        overflow-y: auto;
        padding: 18px;
        display: grid;
        grid-template-columns: minmax(0, 320px) minmax(0, 1fr);
        gap: 16px;
      }
      @media (max-width: 720px) {
        .detail {
          grid-template-columns: minmax(0, 1fr);
        }
      }
      .detail .big {
        width: 100%;
        border-radius: 12px;
        background: var(--oppai-surface);
        aspect-ratio: 3 / 4;
        object-fit: cover;
        cursor: zoom-in;
      }
      .thumbs {
        display: flex;
        gap: 6px;
        margin-top: 8px;
        flex-wrap: wrap;
      }
      .thumbs img {
        width: 52px;
        height: 68px;
        object-fit: cover;
        border-radius: 8px;
        cursor: pointer;
        opacity: 0.7;
      }
      .thumbs img.on {
        opacity: 1;
        outline: 2px solid var(--oppai-accent);
      }
      .detail h3 {
        margin: 0 0 4px;
        font-size: 17px;
      }
      .detail .sub {
        font-size: 12px;
        color: var(--oppai-text-muted);
        margin-bottom: 12px;
      }
      .vlabel {
        font-size: 12px;
        font-weight: 600;
        color: var(--oppai-text-dim);
        margin: 10px 0 6px;
      }
      .versions {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .words {
        font-size: 12px;
        color: var(--oppai-text-dim);
        background: var(--oppai-surface);
        border-radius: 10px;
        padding: 8px 10px;
        margin-top: 10px;
        word-break: break-word;
      }
      .install {
        margin-top: 14px;
        border: none;
        border-radius: 12px;
        background: var(--oppai-primary);
        color: var(--oppai-on-primary);
        font: inherit;
        font-size: 14px;
        font-weight: 600;
        padding: 12px 18px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .install:disabled {
        opacity: 0.6;
        cursor: default;
      }
      /* Zoomed image on top of everything. */
      .zoom {
        position: fixed;
        inset: 0;
        z-index: 90;
        background: rgba(0, 0, 0, 0.88);
        display: grid;
        place-items: center;
        cursor: zoom-out;
      }
      .zoom img {
        max-width: 96vw;
        max-height: 94vh;
        object-fit: contain;
      }
    `,
  ];

  @state() private zoomed = "";

  connectedCallback() {
    super.connectedCallback();
    void this.search(true);
    void this.loadCategories();
    void this.pollJobs();
    this.jobTimer = window.setInterval(() => void this.pollJobs(), 5000);
  }

  private async loadCategories() {
    try {
      this.categories = (await api.civitaiCategories()).categories;
    } catch {
      // Searching still works when an older mirror does not expose /tags.
      this.categories = [];
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.jobTimer) clearInterval(this.jobTimer);
  }

  private async pollJobs() {
    try {
      const res = await api.civitaiInstalls();
      this.jobs = res.jobs.filter((j) => j.status !== "cancelled").slice(0, 5);
    } catch {
      /* the strip just stays as it was */
    }
  }

  private async search(reset: boolean) {
    if (this.loading) return;
    this.loading = true;
    this.error = "";
    try {
      const res = await api.civitaiSearch({
        q: this.q || undefined,
        type: this.type || undefined,
        category: this.category || undefined,
        sort: this.sort || undefined,
        cursor: reset ? undefined : this.cursor || undefined,
      });
      this.items = reset ? res.items : [...this.items, ...res.items];
      this.cursor = res.nextCursor ?? "";
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.loading = false;
    }
  }

  private openDetail(m: CivitaiModel) {
    this.detail = m;
    const v = m.versions[0];
    this.versionId = v?.id ?? 0;
    this.shownImage = v?.images[0] ?? "";
  }

  private currentVersion(): CivitaiVersion | undefined {
    return this.detail?.versions.find((v) => v.id === this.versionId);
  }

  private async install(v: CivitaiVersion) {
    if (this.installing || !v.downloadUrl) return;
    this.installing = true;
    this.error = "";
    try {
      await api.civitaiInstall(v.downloadUrl);
      await this.pollJobs();
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.installing = false;
    }
  }

  private jobLabel(j: InstallJob): string {
    if (j.status === "downloading" && j.totalBytes) {
      const pct = Math.round(((j.bytes ?? 0) / j.totalBytes) * 100);
      return `downloading ${pct}%`;
    }
    return j.status;
  }

  render() {
    return html`
      <div class="wrap">
        <div class="topbar">
          <h2><span class="material-symbols-rounded">travel_explore</span> Civitai</h2>
          <button class="close" @click=${() => this.dispatchEvent(new CustomEvent("close"))}>
            <span class="material-symbols-rounded" style="font-size:17px;">close</span> Back to studio
          </button>
        </div>
        <div class="controls">
          <input
            type="search"
            placeholder="Search models…"
            .value=${this.q}
            @input=${(e: Event) => (this.q = (e.target as HTMLInputElement).value)}
            @keydown=${(e: KeyboardEvent) => { if (e.key === "Enter") void this.search(true); }}
          />
          ${[
            { id: "", label: "All" },
            { id: "checkpoint", label: "Checkpoints" },
            { id: "lora", label: "LoRAs" },
          ].map(
            (t) => html`<button class="chip ${this.type === t.id ? "on" : ""}"
              @click=${() => { this.type = t.id; void this.search(true); }}>${t.label}</button>`,
          )}
          <select
            .value=${this.sort}
            @change=${(e: Event) => { this.sort = (e.target as HTMLSelectElement).value; void this.search(true); }}
          >
            <option value="">Most downloaded</option>
            <option value="rated">Highest rated</option>
            <option value="newest">Newest</option>
          </select>
          <select
            aria-label="Category"
            .value=${this.category}
            @change=${(e: Event) => {
              this.category = (e.target as HTMLSelectElement).value;
              void this.search(true);
            }}
          >
            <option value="">All categories</option>
            ${this.categories.map((c) => html`<option value=${c.name}>${c.name} (${fmtCount(c.count)})</option>`)}
          </select>
        </div>
        ${this.jobs.length
          ? html`<div class="jobs">
              ${this.jobs.map(
                (j) => html`<div class="job">
                  <span class="material-symbols-rounded" style="font-size:15px;">download</span>
                  <span class="st ${j.status}">${this.jobLabel(j)}</span>
                  <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${j.error || j.source}</span>
                </div>`,
              )}
            </div>`
          : nothing}
        ${this.error ? html`<div class="err">${this.error}</div>` : nothing}
        <div class="grid">
          ${this.items.map((m) => {
            const img = m.versions[0]?.images[0];
            return html`
              <button class="card" @click=${() => this.openDetail(m)}>
                ${img
                  ? html`<img src=${api.civitaiImageURL(img)} alt=${m.name} loading="lazy" />`
                  : html`<div class="noimg"><span class="material-symbols-rounded" style="font-size:34px;">image</span></div>`}
                <div class="meta">
                  <div class="name">${m.name}</div>
                  <div class="sub">
                    <span>${m.type}</span>
                    ${m.versions[0]?.base ? html`<span>${m.versions[0].base}</span>` : nothing}
                    <span>⤓ ${fmtCount(m.downloads)}</span>
                  </div>
                </div>
              </button>
            `;
          })}
        </div>
        ${this.loading
          ? html`<div class="note">Searching Civitai…</div>`
          : this.items.length
            ? this.cursor
              ? html`<button class="more" @click=${() => this.search(false)}>Load more</button>`
              : nothing
            : html`<div class="note">No models matched. Try another search.</div>`}
      </div>
      ${this.detail ? this.renderDetail(this.detail) : nothing}
      ${this.zoomed
        ? html`<div class="zoom" @click=${() => (this.zoomed = "")}>
            <img src=${api.civitaiImageURL(this.zoomed)} alt="Preview" />
          </div>`
        : nothing}
    `;
  }

  private renderDetail(m: CivitaiModel) {
    const v = this.currentVersion();
    return html`
      <div class="overlay" @click=${(e: Event) => { if (e.target === e.currentTarget) this.detail = null; }}>
        <div class="detail">
          <div>
            ${this.shownImage
              ? html`<img class="big" src=${api.civitaiImageURL(this.shownImage)} alt=${m.name}
                  @click=${() => (this.zoomed = this.shownImage)} />`
              : html`<div class="big" style="display:grid; place-items:center;">
                  <span class="material-symbols-rounded" style="font-size:40px; color:var(--oppai-text-muted);">image</span>
                </div>`}
            ${v && v.images.length > 1
              ? html`<div class="thumbs">
                  ${v.images.map(
                    (u) => html`<img src=${api.civitaiImageURL(u)} class=${u === this.shownImage ? "on" : ""}
                      alt="Preview" @click=${() => (this.shownImage = u)} />`,
                  )}
                </div>`
              : nothing}
          </div>
          <div>
            <h3>${m.name}</h3>
            <div class="sub">
              ${m.type}${m.creator ? ` · by ${m.creator}` : ""} · ⤓ ${fmtCount(m.downloads)} · ♥ ${fmtCount(m.likes)}
            </div>
            ${m.versions.length > 1
              ? html`<div class="vlabel">Version</div>
                  <div class="versions">
                    ${m.versions.map(
                      (ver) => html`<button class="chip ${ver.id === this.versionId ? "on" : ""}"
                        @click=${() => {
                          this.versionId = ver.id;
                          this.shownImage = ver.images[0] ?? "";
                        }}>${ver.name}<span style="opacity:.7;"> · ${ver.base}</span></button>`,
                    )}
                  </div>`
              : nothing}
            ${v?.trainedWords.length
              ? html`<div class="vlabel">Trigger words</div>
                  <div class="words">${v.trainedWords.join(", ")}</div>`
              : nothing}
            ${v
              ? html`<button class="install" ?disabled=${this.installing || !v.downloadUrl} @click=${() => this.install(v)}>
                  <span class="material-symbols-rounded" style="font-size:18px;">download</span>
                  Install to InvokeAI${v.sizeMB ? ` (${fmtSize(v.sizeMB)})` : ""}
                </button>`
              : nothing}
            <div class="sub" style="margin-top:10px;">
              InvokeAI downloads the file itself; progress appears in the strip on the search page.
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function fmtSize(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb} MB`;
}

declare global {
  interface HTMLElementTagNameMap {
    "oppai-civitai": OppaiCivitai;
  }
}
