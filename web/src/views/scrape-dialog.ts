import { LitElement, html, css } from "lit";
import { customElement, state, query } from "lit/decorators.js";
import { api, type ScrapeResult } from "../api.js";
import { motionStyles } from "../theme.js";
import { KIND_ORDER, KIND_META } from "../media-meta.js";
import { runDownload } from "../downloads.js";

// Paste one or more URLs (one per line) → preview extracted metadata + media →
// import selected assets. A single URL and a bulk paste share the same flow.
@customElement("oppai-scrape-dialog")
export class OppaiScrapeDialog extends LitElement {
  @query("md-dialog") private dialog!: HTMLDialogElement & { show(): void; close(): void };
  @state() private urls = "";
  @state() private results: ScrapeResult[] = [];
  @state() private failures: { url: string; error: string }[] = [];
  @state() private chosen = new Set<string>();
  @state() private busy = false;
  @state() private phase: "" | "fetching" | "importing" = "";
  @state() private fetchCount = 0;
  @state() private error = "";
  @state() private kind = "image";
  // Whether the user picked the type themselves. Until they do, each result
  // imports as whatever the scraper detected *it* to be — one chip can't speak
  // for a mixed bulk paste, but an explicit choice overrides every result.
  @state() private kindTouched = false;

  static styles = [
    motionStyles,
    css`
      md-dialog { max-width: 620px; }
      .row { display: flex; gap: .5rem; align-items: end; }
      md-outlined-text-field { flex: 1; }
      .hint { font-size: .78rem; opacity: .7; margin: .35rem 0 0; }
      .group { margin-top: 1rem; }
      .group + .group { border-top: 1px solid var(--md-sys-color-outline-variant); padding-top: 1rem; }
      .previews {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
        gap: 8px;
        margin-top: .5rem;
        animation: oppai-fade-in-up 0.32s var(--oppai-ease-emphasized) both;
      }
      .pv {
        position: relative;
        aspect-ratio: 1;
        border-radius: 10px;
        overflow: hidden;
        cursor: pointer;
        border: 2px solid transparent;
        transition: transform 0.18s var(--oppai-ease-spring), border-color 0.18s ease;
      }
      .pv:hover { transform: translateY(-2px) scale(1.03); }
      .pv.sel { border-color: var(--md-sys-color-primary); }
      .pv.sel::after {
        content: "check";
        font-family: "Material Symbols Rounded";
        font-feature-settings: "liga" 1;
        line-height: 1;
        position: absolute;
        top: 4px;
        right: 4px;
        font-size: 16px;
        color: var(--md-sys-color-on-primary);
        background: var(--md-sys-color-primary);
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: grid;
        place-items: center;
      }
      .pv img { width: 100%; height: 100%; object-fit: cover; }
      .src { font-size: .78rem; opacity: .6; word-break: break-all; }
      .meta {
        font-size: .85rem;
        opacity: .8;
        margin-top: .35rem;
        animation: oppai-fade-in 0.3s var(--oppai-ease-standard) both;
      }
      .err { color: var(--md-sys-color-error); font-size: .85rem; margin-top: .5rem; }
      .typerow { display: flex; gap: 6px; margin: .9rem 0 .3rem; flex-wrap: wrap; align-items: center; }
      .typerow .lbl { font-size: .8rem; opacity: .7; margin-right: 4px; }
      .shots { display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 8px; margin-top: .5rem; }
      .shots img { width: 100%; aspect-ratio: 16/9; object-fit: cover; border-radius: 8px; }
      .game-hint { font-size: .8rem; opacity: .75; margin-top: .5rem; }
      .progress {
        display: flex;
        align-items: center;
        gap: .6rem;
        margin-top: .9rem;
        font-size: .85rem;
        opacity: .85;
      }
      .progress md-circular-progress { --md-circular-progress-size: 22px; }
      .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: .5rem; }
    `,
  ];

  open() {
    this.results = [];
    this.failures = [];
    this.chosen = new Set();
    this.error = "";
    this.urls = "";
    this.phase = "";
    this.fetchCount = 0;
    this.kind = "image";
    this.kindTouched = false;
    this.dialog.show();
  }

  private get isGame(): boolean {
    return this.kind === "game";
  }

  private get isComic(): boolean {
    return this.kind === "comic";
  }

  private get urlList(): string[] {
    const seen = new Set<string>();
    return this.urls
      .split(/[\n,]/)
      .map((u) => u.trim())
      .filter((u) => u && !seen.has(u) && (seen.add(u), true));
  }

  private get totalMedia(): number {
    return this.results.reduce((n, r) => n + r.mediaUrls.length, 0);
  }

  private onUrlKeydown = (e: KeyboardEvent) => {
    // Enter inserts a newline (multi-URL); Ctrl/Cmd+Enter fetches.
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.fetch();
    }
  };

  private async fetch() {
    const urls = this.urlList;
    if (urls.length === 0 || this.busy) return;
    this.busy = true;
    this.phase = "fetching";
    this.fetchCount = urls.length;
    this.error = "";
    this.results = [];
    this.failures = [];
    try {
      const { items } = await api.scrapeBulk(urls);
      const chosen = new Set<string>();
      for (const it of items) {
        if (it.result) {
          // Go serializes empty slices as null; normalize to arrays so render()
          // and import() can rely on .length/.map without crashing (a crash in
          // render leaves the spinner frozen on screen — "fetch never returns").
          const res: ScrapeResult = {
            ...it.result,
            tags: it.result.tags ?? [],
            performers: it.result.performers ?? [],
            mediaUrls: it.result.mediaUrls ?? [],
            screenshots: it.result.screenshots ?? [],
            categorizedTags: it.result.categorizedTags ?? [],
          };
          this.results = [...this.results, res];
          res.mediaUrls.forEach((u) => chosen.add(u));
        } else {
          this.failures = [...this.failures, { url: it.url, error: it.error || "failed" }];
        }
      }
      this.chosen = chosen;
      // Default the import type to what the scraper detected (itch.io pages come
      // back as "game", comic readers as "comic"), letting the user override.
      const detected = this.results.find((r) => r.kind)?.kind;
      if (detected) this.kind = detected;
      this.kindTouched = false;
      if (this.results.length === 0 && this.failures.length > 0) {
        this.error = "Nothing could be fetched from those links.";
      }
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.busy = false;
      this.phase = "";
    }
  }

  private pickKind(k: string) {
    this.kind = k;
    this.kindTouched = true;
  }

  private toggle(u: string) {
    const next = new Set(this.chosen);
    next.has(u) ? next.delete(u) : next.add(u);
    this.chosen = next;
  }

  private import() {
    if (this.busy) return;
    if (!this.isGame && this.chosen.size === 0) return;
    if (this.isGame && this.results.length === 0) return;
    this.error = "";
    const results = [...this.results];
    const chosen = new Set(this.chosen);
    const kindTouched = this.kindTouched;
    const selectedKind = this.kind;
    const label = results.length === 1 ? results[0].title || "Import" : `${results.length} imports`;
    runDownload(label, async (report) => {
      let imported = 0;
      let finished = 0;
      for (const r of results) {
        const kind = kindTouched ? selectedKind : r.kind || selectedKind;
        if (kind === "game") {
          // One enriched game entry per page (cover, description, screenshots,
          // download link) — the server re-scrapes and builds the row.
          const res = await api.scrapeImport({
            url: r.sourceUrl,
            title: r.title,
            tags: r.tags,
            categorizedTags: r.categorizedTags,
            kind: "game",
          });
          imported += res.count;
          report(++finished / results.length);
          continue;
        }
        const picked = r.mediaUrls.filter((u) => chosen.has(u));
        if (picked.length === 0) {
          report(++finished / results.length);
          continue;
        }
        // A comic's pages are bundled server-side into one CBZ entry; every other
        // kind imports one row per selected asset.
        const res = await api.scrapeImport({
          url: r.sourceUrl,
          mediaUrls: picked,
          title: r.title,
          tags: r.tags,
          categorizedTags: r.categorizedTags,
          kind,
        });
        imported += res.count;
        report(++finished / results.length);
      }
      this.dispatchEvent(
        new CustomEvent("imported", { detail: { count: imported }, bubbles: true, composed: true }),
      );
    });
    this.dialog.close();
  }

  private renderGroup(r: ScrapeResult) {
    return html`
      <div class="group">
        <div class="meta"><strong>${r.title || "(untitled)"}</strong></div>
        ${r.description ? html`<div class="meta">${r.description}</div>` : ""}
        ${r.tags.length
          ? html`<div class="tags">
              ${r.tags.map((t) => html`<md-filter-chip label=${t} selected></md-filter-chip>`)}
            </div>`
          : ""}
        ${this.isGame ? this.renderGameGroup(r) : this.renderMediaGroup(r)}
        ${this.isComic ? this.renderComicHint(r) : ""}
      </div>
    `;
  }

  private renderComicHint(r: ScrapeResult) {
    const pages = r.mediaUrls.filter((u) => this.chosen.has(u)).length;
    if (pages === 0) return html`<div class="game-hint">Select the pages to include.</div>`;
    if (pages === 1) {
      return html`<div class="game-hint">
        A single page imports as one file. Select more pages to bundle them into a comic.
      </div>`;
    }
    return html`<div class="game-hint">
      Imports as one <strong>comic</strong> entry — ${pages} pages bundled into a CBZ, in the order
      shown. Deselect any covers or banners that aren't pages.
    </div>`;
  }

  private renderMediaGroup(r: ScrapeResult) {
    return r.mediaUrls.length
      ? html`<div class="previews">
          ${r.mediaUrls.map(
            (u) => html`<div class="pv ${this.chosen.has(u) ? "sel" : ""}" @click=${() => this.toggle(u)}>
              <img src=${api.proxyURL(u)} loading="lazy" />
            </div>`,
          )}
        </div>`
      : html`<div class="meta">No media found on that page.</div>`;
  }

  private renderGameGroup(r: ScrapeResult) {
    const cover = r.cover || r.mediaUrls[0];
    return html`
      ${cover
        ? html`<div class="previews">
            <div class="pv sel"><img src=${api.proxyURL(cover)} loading="lazy" /></div>
          </div>`
        : html`<div class="meta">No cover image found.</div>`}
      ${r.screenshots?.length
        ? html`<div class="shots">
            ${r.screenshots.slice(0, 8).map((u) => html`<img src=${api.proxyURL(u)} loading="lazy" />`)}
          </div>`
        : ""}
      <div class="game-hint">
        Imports as one <strong>game</strong> entry — cover art, description, tags${r.screenshots?.length
          ? `, ${r.screenshots.length} screenshot${r.screenshots.length === 1 ? "" : "s"}`
          : ""} and a download link.
      </div>
    `;
  }

  private renderTypeRow() {
    if (this.results.length === 0) return "";
    return html`
      <div class="typerow">
        <span class="lbl">Import as</span>
        ${KIND_ORDER.map(
          (k) => html`<md-filter-chip
            label=${KIND_META[k].label}
            ?selected=${this.kind === k}
            @click=${() => this.pickKind(k)}
          ></md-filter-chip>`,
        )}
      </div>
    `;
  }

  render() {
    return html`
      <md-dialog>
        <div slot="headline">Import from URL</div>
        <form slot="content" method="dialog" @submit=${(e: Event) => e.preventDefault()}>
          <div class="row">
            <md-outlined-text-field label="Page or media URL(s)" type="textarea" rows="3"
              .value=${this.urls}
              @input=${(e: Event) => (this.urls = (e.target as HTMLInputElement).value)}
              @keydown=${this.onUrlKeydown}></md-outlined-text-field>
            <md-filled-button type="button" @click=${this.fetch}
              ?disabled=${this.busy || this.urlList.length === 0}>
              ${this.busy ? "Fetching…" : "Fetch"}
            </md-filled-button>
          </div>
          <p class="hint">
            One URL per line for bulk import. Direct image/video links (e.g. Discord CDN) work too.
            Press ${navigator.platform.startsWith("Mac") ? "⌘" : "Ctrl"}+Enter to fetch.
          </p>
          ${this.error ? html`<div class="err">${this.error}</div>` : ""}
          ${this.phase === "fetching"
            ? html`<div class="progress">
                <md-circular-progress indeterminate></md-circular-progress>
                <span>Fetching ${this.fetchCount} link${this.fetchCount === 1 ? "" : "s"}… some sites can take a few seconds each.</span>
              </div>`
            : ""}
          ${this.renderTypeRow()}
          ${this.results.map((r) => this.renderGroup(r))}
          ${this.failures.length
            ? html`<div class="err">
                ${this.failures.length} link(s) failed:
                ${this.failures.map((f) => html`<div class="src">${f.url} — ${f.error}</div>`)}
              </div>`
            : ""}
        </form>
        <div slot="actions">
          <md-text-button type="button" @click=${() => this.dialog.close()}>Cancel</md-text-button>
          <md-filled-button type="button" @click=${this.import}
            ?disabled=${this.busy ||
            (this.isGame ? this.results.length === 0 : this.chosen.size === 0)}>
            ${this.busy && this.results.length
              ? "Importing…"
              : this.isGame
                ? html`Import ${this.results.length === 1 ? "game" : `${this.results.length} games`}`
                : this.isComic
                  ? html`Import ${this.results.length === 1 ? "comic" : `${this.results.length} comics`}`
                  : html`Import ${this.chosen.size || ""}${this.totalMedia ? ` / ${this.totalMedia}` : ""}`}
          </md-filled-button>
        </div>
      </md-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap { "oppai-scrape-dialog": OppaiScrapeDialog; }
}
