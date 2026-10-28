import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { iconStyles } from "../theme.js";
import { api } from "../api.js";
import { loadImage } from "../cutout.js";
import { dragRect, findPanels, scaleRect, type Rect } from "../comic-panels.js";
import { SURENESS, keptPeople, outlineGrow, outlineOnPage, personRect } from "../person-cut.js";
import { loraStyles } from "./lora-styles.js";

/**
 * Bringing a comic into a training set: one from the library, or a 3hentai gallery.
 *
 * Whole pages teach a LoRA the page — gutters, frames, a grid of small pictures —
 * when what was wanted is the art. So every page is cut along its gutters first
 * (comic-panels.ts) and each panel is a picture of its own; a page that doesn't
 * split, a cover or a pin-up, stays whole. For a LoRA of one character, "Cut out"
 * turns a click on a panel into a box drawn round her, and the box is what's kept;
 * "Find people" has the trainer find everyone in the panels instead (person-cut.ts),
 * and keeps each one alone on white or black.
 *
 * Everything runs here, on pages the browser already has from this origin: the
 * server sees only the cut pictures that are kept, uploaded into the set as the
 * other gatherers do. Dispatches "gathered" with the set's id.
 */

type From = "library" | "3hentai";

interface Found {
  key: string;
  title: string;
  thumb: string;
  /** Where the comic came from, for the note on what was taken. */
  source: string;
  /** The page images, in order, as same-origin URLs a canvas can read. */
  pages: () => Promise<string[]>;
}

interface Cut {
  key: string;
  page: number;
  rect: Rect;
  thumb: string;
  keep: boolean;
  kind: "panel" | "page" | "crop" | "person";
  /** A found person's outline on the page; outside it is the plain background. */
  outline?: [number, number][];
}

type Backdrop = "white" | "black";

interface Cropping {
  cut: Cut;
  /** The cut, drawn no larger than it is shown. */
  url: string;
  /** The boxes drawn so far, on the page. */
  made: Rect[];
}

// What a page is read at to find its gutters: enough to see a thin one, small
// enough that a 3000-pixel scan is read in a few milliseconds.
const READ_SIDE = 800;
// A tile in the grid.
const THUMB_SIDE = 240;
// Under this on its shorter side a picture is marked small: it trains, but blurrily.
const SMALL_SIDE = 512;
const UPLOADS_AT_ONCE = 2;

@customElement("oppai-lora-comic")
export class OppaiLoraComic extends LitElement {
  /** The training set to add to; 0 makes (or joins) the one named setName. */
  @property({ type: Number }) setId = 0;
  @property() setName = "";
  /** The trainer can find people (it lists "detect-people"). */
  @property({ type: Boolean }) canDetect = false;
  /** A trainer is set up at all, so a missing feature means updating it. */
  @property({ type: Boolean }) trainerSet = false;

  @state() private from: From = "library";
  @state() private query = "";
  @state() private found: Found[] = [];
  @state() private searching = false;
  @state() private comic: { title: string; source: string; pages: string[] } | null = null;
  @state() private split = true;
  @state() private cuts: Cut[] = [];
  @state() private reading: { done: number; total: number } | null = null;
  @state() private cutOut = false;
  @state() private cropping: Cropping | null = null;
  @state() private drag: { x0: number; y0: number; x1: number; y1: number } | null = null;
  @state() private progress: { done: number; total: number; failed: number } | null = null;
  @state() private error = "";
  @state() private finding: { done: number; total: number; found: number } | null = null;
  @state() private backdrop: Backdrop = "white";
  @state() private sureness = "normal";

  // Bumped whenever the comic or the split changes, so a read still going for the
  // last one stops adding its pieces to this one's.
  private generation = 0;

  static styles = [
    iconStyles,
    loraStyles,
    css`
      :host { display: block; }
      .search { display: flex; gap: 8px; margin-top: 10px; }
      .search input { flex: 1; }
      .comics { display: grid; grid-template-columns: repeat(auto-fill, minmax(112px, 1fr)); gap: 10px; margin-top: 12px; }
      .comic {
        border: 1px solid var(--oppai-border); border-radius: 12px; overflow: hidden; background: var(--oppai-surface-2);
        padding: 0; cursor: pointer; color: var(--oppai-text); font: inherit; text-align: left;
      }
      .comic:hover { border-color: var(--oppai-primary); }
      .comic img { width: 100%; aspect-ratio: 3 / 4; object-fit: cover; display: block; background: var(--oppai-bg); }
      .comic span { display: block; font-size: 12px; padding: 6px 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin: 14px 0 10px; font-size: 13px; }
      .toolbar .count { font-weight: 600; margin-right: auto; }
      .head { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
      .head h4 { margin: 0; font-size: 14px; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .picks.cutting .pick { cursor: crosshair; }
      .pick img { object-fit: contain; background: var(--oppai-bg); }
      .footer {
        position: sticky; bottom: 0; margin: 14px -18px -18px; padding: 12px 18px;
        background: color-mix(in srgb, var(--oppai-surface) 92%, transparent); backdrop-filter: blur(6px);
        border-top: 1px solid var(--oppai-border); border-radius: 0 0 16px 16px;
        display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
      }
      .footer .bar { flex: 1; min-width: 120px; }
      .footer .what { font-size: 13px; color: var(--oppai-text-dim); flex: 1; min-width: 160px; }
      .crop-veil {
        position: fixed; inset: 0; z-index: 50; background: rgba(0, 0, 0, 0.78);
        display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 16px;
      }
      .crop-stage { position: relative; user-select: none; touch-action: none; cursor: crosshair; line-height: 0; }
      .crop-stage img { max-width: min(92vw, 1100px); max-height: calc(100vh - 150px); display: block; border-radius: 6px; }
      .box { position: absolute; border: 2px solid var(--oppai-primary); background: color-mix(in srgb, var(--oppai-primary) 18%, transparent); pointer-events: none; }
      .box.live { border-style: dashed; }
      .crop-bar { display: flex; gap: 10px; align-items: center; color: #fff; font-size: 13px; flex-wrap: wrap; justify-content: center; }
      .small-select { width: auto; min-height: 30px; padding: 4px 10px; font-size: 12px; border-radius: 999px; }
      .swatch { width: 12px; height: 12px; border-radius: 50%; border: 1px solid var(--oppai-border-strong); display: inline-block; }
      .swatch.white { background: #fff; }
      .swatch.black { background: #000; }
      @media (max-width: 600px) { .footer { margin: 14px -14px -14px; padding: 10px 14px; } }
    `,
  ];

  disconnectedCallback() {
    super.disconnectedCallback();
    this.generation++;
  }

  // ── finding a comic ───────────────────────────────────────────────────────

  private async search() {
    if (this.searching) return;
    this.searching = true;
    this.error = "";
    this.found = [];
    const q = this.query.trim();
    try {
      if (this.from === "library") {
        const page = await api.listMedia({ kind: "comic", q: q || undefined, limit: 36 });
        this.found = page.items.map((m) => ({
          key: `lib:${m.id}`, title: m.title, thumb: api.thumbURL(m.id), source: `${m.title} (library)`,
          pages: async () => {
            const info = await api.comicInfo(m.id);
            if (!info.readable) throw new Error(info.reason || "That comic can't be opened.");
            return Array.from({ length: info.pages }, (_, i) => api.pageURL(m.id, i + 1));
          },
        }));
      } else {
        const listing = await api.browseSource("3hentai", q ? { feed: "search", q } : { feed: "recent" });
        this.found = listing.items.filter((it) => it.kind === "comic").map((it) => ({
          key: `3h:${it.id}`, title: it.title, thumb: api.sourceStreamURL(it.thumbUrl), source: it.pageUrl || it.title,
          pages: async () => (await api.sourcePages("3hentai", it.id)).pages.map((p) => api.sourceStreamURL(p)),
        }));
      }
      if (!this.found.length) this.error = q ? `No comics match “${q}”.` : "There are no comics to show.";
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.searching = false;
    }
  }

  private async open(f: Found) {
    this.error = "";
    this.cuts = [];
    try {
      const pages = await f.pages();
      if (!pages.length) throw new Error("That comic has no pages.");
      this.comic = { title: f.title, source: f.source, pages };
      void this.readPages();
    } catch (e) {
      this.error = (e as Error).message;
    }
  }

  private close() {
    this.generation++;
    this.comic = null;
    this.cuts = [];
    this.reading = null;
    this.cutOut = false;
  }

  // ── cutting the pages ─────────────────────────────────────────────────────

  /** Reads every page in turn and lays out its panels (or the page) as tiles. */
  private async readPages() {
    const comic = this.comic;
    if (!comic) return;
    const gen = ++this.generation;
    this.cuts = [];
    this.reading = { done: 0, total: comic.pages.length };
    let failed = 0;
    for (let i = 0; i < comic.pages.length; i++) {
      if (gen !== this.generation) return;
      try {
        const img = await loadImage(comic.pages[i]);
        if (gen !== this.generation) return;
        const rects = this.split ? panelsOf(img) : [{ x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight }];
        const kind = rects.length > 1 ? "panel" : "page";
        this.cuts = [...this.cuts, ...rects.map((rect, n) => ({
          key: `${i}:${n}`, page: i, rect, thumb: drawRect(img, rect, THUMB_SIDE), keep: true, kind,
        } as Cut))];
      } catch {
        failed++;
      }
      this.reading = { done: i + 1, total: comic.pages.length };
    }
    this.reading = null;
    if (failed) this.error = `${failed} page${failed === 1 ? "" : "s"} couldn't be read and ${failed === 1 ? "is" : "are"} left out.`;
  }

  private setSplit(on: boolean) {
    if (on === this.split) return;
    this.split = on;
    void this.readPages();
  }

  /** A found person is kept or dropped; Cut out does not apply to one. */
  private dropOrKeep(cut: Cut) {
    this.cuts = this.cuts.map((c) => (c.key === cut.key ? { ...c, keep: !c.keep } : c));
  }

  private toggle(cut: Cut) {
    if (this.cutOut) {
      void this.startCrop(cut);
      return;
    }
    this.cuts = this.cuts.map((c) => (c.key === cut.key ? { ...c, keep: !c.keep } : c));
  }

  // ── cutting a character out ───────────────────────────────────────────────

  private async startCrop(cut: Cut) {
    if (!this.comic) return;
    try {
      const img = await loadImage(this.comic.pages[cut.page]);
      const side = Math.min(1400, Math.max(cut.rect.w, cut.rect.h));
      const url = drawRect(img, cut.rect, side, "image/png");
      this.cropping = { cut, url, made: [] };
    } catch (e) {
      this.error = (e as Error).message;
    }
  }

  /** A pointer position on the stage, in pixels of the shown picture. */
  private stagePoint(e: PointerEvent): { x: number; y: number; w: number; h: number } {
    const img = (e.currentTarget as HTMLElement).querySelector("img")!;
    const box = img.getBoundingClientRect();
    return { x: e.clientX - box.left, y: e.clientY - box.top, w: box.width, h: box.height };
  }

  private dragStart(e: PointerEvent) {
    const p = this.stagePoint(e);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    this.drag = { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
  }

  private dragMove(e: PointerEvent) {
    if (!this.drag) return;
    const p = this.stagePoint(e);
    this.drag = { ...this.drag, x1: p.x, y1: p.y };
  }

  private dragEnd(e: PointerEvent) {
    const c = this.cropping;
    const d = this.drag;
    this.drag = null;
    if (!c || !d) return;
    const { w, h } = this.stagePoint(e);
    // Shown pixels to the cut's pixels, then onto the page.
    const kx = c.cut.rect.w / w, ky = c.cut.rect.h / h;
    const r = dragRect(d.x0 * kx, d.y0 * ky, d.x1 * kx, d.y1 * ky, c.cut.rect.w, c.cut.rect.h, 48);
    if (!r) return;
    const onPage = { x: c.cut.rect.x + r.x, y: c.cut.rect.y + r.y, w: r.w, h: r.h };
    this.cropping = { ...c, made: [...c.made, onPage] };
  }

  /** Keeps what was cut out, and drops the panel it was cut from: wanting her out
      of it is wanting the rest of it left out. */
  private async finishCrop() {
    const c = this.cropping;
    this.cropping = null;
    if (!c || !c.made.length || !this.comic) return;
    try {
      const img = await loadImage(this.comic.pages[c.cut.page]);
      const added: Cut[] = c.made.map((rect, n) => ({
        key: `${c.cut.key}:c${Date.now()}${n}`, page: c.cut.page, rect,
        thumb: drawRect(img, rect, THUMB_SIDE), keep: true, kind: "crop",
      }));
      const at = this.cuts.findIndex((x) => x.key === c.cut.key);
      const next = this.cuts.map((x) => (x.key === c.cut.key ? { ...x, keep: false } : x));
      next.splice(at + 1, 0, ...added);
      this.cuts = next;
    } catch (e) {
      this.error = (e as Error).message;
    }
  }

  // ── finding the people ────────────────────────────────────────────────────

  /**
   * Sends each kept panel to the trainer and puts the people it finds in after it,
   * each cut out alone; a panel with anyone in it is dropped, as a hand cut drops its
   * panel. One at a time: the trainer runs one detection at a time anyway.
   */
  private async findPeople() {
    const comic = this.comic;
    if (!comic || this.finding || this.reading) return;
    const panels = this.cuts.filter((c) => c.keep && (c.kind === "panel" || c.kind === "page"));
    if (!panels.length) return;
    const conf = SURENESS.find((s) => s.id === this.sureness)?.conf ?? 0.3;
    const gen = this.generation;
    this.error = "";
    this.finding = { done: 0, total: panels.length, found: 0 };
    const pages = new Map<number, HTMLImageElement>();
    let lastError = "";
    try {
      for (const panel of panels) {
        try {
          let img = pages.get(panel.page);
          if (!img) {
            img = await loadImage(comic.pages[panel.page]);
            pages.set(panel.page, img);
          }
          const res = await api.trainDetect(await cropBlob(img, panel.rect), conf);
          if (gen !== this.generation) return;
          const people = keptPeople(res.people, conf).map((p, n): Cut => {
            const rect = personRect(p.box, panel.rect);
            const outline = outlineOnPage(p.outline, panel.rect);
            return {
              key: `${panel.key}:p${n}`, page: panel.page, rect, outline, keep: true, kind: "person",
              thumb: personCanvas(img!, rect, outline, null, THUMB_SIDE).toDataURL("image/png"),
            };
          });
          if (people.length) {
            const at = this.cuts.findIndex((x) => x.key === panel.key);
            const next = this.cuts.filter((x) => !x.key.startsWith(`${panel.key}:p`))
              .map((x) => (x.key === panel.key ? { ...x, keep: false } : x));
            next.splice(at + 1, 0, ...people);
            this.cuts = next;
          }
          this.finding = { ...this.finding!, found: this.finding!.found + people.length };
        } catch (e) {
          lastError = (e as Error).message;
          // The trainer saying it can't is the same answer for every panel.
          if (/update|trainer/i.test(lastError) && !this.finding!.found) throw e;
        }
        this.finding = { ...this.finding!, done: this.finding!.done + 1 };
      }
      if (!this.finding!.found) {
        this.error = lastError ? `No one was found (${lastError}).` : "No one was found — try “Everyone it can”, or cut her out by hand.";
      }
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      if (gen === this.generation) this.finding = null;
    }
  }

  // ── keeping them ──────────────────────────────────────────────────────────

  private async target(): Promise<number> {
    if (this.setId > 0) return this.setId;
    const set = await api.trainSetCreate(this.setName.trim() || this.comic?.title || "Training set");
    this.setId = set.id;
    return set.id;
  }

  private async uploadKept() {
    const comic = this.comic;
    const kept = this.cuts.filter((c) => c.keep);
    if (!comic || !kept.length || this.progress) return;
    this.error = "";
    this.progress = { done: 0, total: kept.length, failed: 0 };
    let lastError = "";
    try {
      const set = await this.target();
      // A page is loaded once for all of its pieces.
      const byPage = new Map<number, Cut[]>();
      for (const c of kept) byPage.set(c.page, [...(byPage.get(c.page) ?? []), c]);
      const pages = [...byPage.keys()];
      let next = 0;
      const worker = async () => {
        while (next < pages.length) {
          const page = pages[next++];
          const pieces = byPage.get(page)!;
          let img: HTMLImageElement | null = null;
          try {
            img = await loadImage(comic.pages[page]);
          } catch (e) {
            lastError = (e as Error).message;
          }
          for (const [n, c] of pieces.entries()) {
            try {
              if (!img) throw new Error(lastError || "page didn't load");
              const blob = c.kind === "person" && c.outline?.length
                ? await canvasBlob(personCanvas(img, c.rect, c.outline, BACKDROPS[this.backdrop], 0))
                : await cropBlob(img, c.rect);
              const file = new File([blob], `page${String(page + 1).padStart(3, "0")}-${n + 1}.png`, { type: "image/png" });
              await api.trainSetUpload(set, file);
              this.progress = { ...this.progress!, done: this.progress!.done + 1 };
            } catch (e) {
              lastError = (e as Error).message;
              this.progress = { ...this.progress!, failed: this.progress!.failed + 1 };
            }
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(UPLOADS_AT_ONCE, pages.length) }, worker));
      if (!this.progress.done) throw new Error(lastError || "None of the pictures could be added.");
      const failed = this.progress.failed;
      this.close();
      if (failed) this.error = `${failed} picture${failed === 1 ? "" : "s"} couldn't be added (${lastError}).`;
      this.dispatchEvent(new CustomEvent("gathered", { detail: { setId: set } }));
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.progress = null;
    }
  }

  // ── drawing ───────────────────────────────────────────────────────────────

  render() {
    return html`
      ${this.comic ? this.renderComic() : this.renderFind()}
      ${this.error ? html`<div class="banner"><span class="material-symbols-rounded">warning</span>${this.error}</div>` : nothing}
      ${this.cropping ? this.renderCrop(this.cropping) : nothing}
    `;
  }

  private renderFind() {
    return html`
      <div class="seg small">
        <button class=${this.from === "library" ? "on" : ""} @click=${() => { this.from = "library"; this.found = []; }}>
          <span class="material-symbols-rounded">photo_library</span> Your library</button>
        <button class=${this.from === "3hentai" ? "on" : ""} @click=${() => { this.from = "3hentai"; this.found = []; }}>
          <span class="material-symbols-rounded">auto_stories</span> 3hentai</button>
      </div>
      <form class="search" @submit=${(e: Event) => { e.preventDefault(); void this.search(); }}>
        <input type="search" .value=${this.query}
          placeholder=${this.from === "library" ? "A comic's title, artist or tag (blank: the latest)" : "Search 3hentai: an artist, a parody, a tag"}
          @input=${(e: Event) => (this.query = (e.target as HTMLInputElement).value)} />
        <button class="btn primary" type="submit" ?disabled=${this.searching}>
          <span class="material-symbols-rounded">search</span> ${this.searching ? "Looking…" : "Find"}
        </button>
      </form>
      <div class="note">Every page is cut into its panels, and each panel is a picture of its own, so the LoRA learns the
        drawing rather than the page. Pages with no gutters — covers, pin-ups, character sheets — stay whole.</div>
      ${this.found.length
        ? html`<div class="comics">${this.found.map((f) => html`<button class="comic" title=${f.title} @click=${() => this.open(f)}>
            <img src=${f.thumb} alt="" loading="lazy" /><span>${f.title}</span></button>`)}</div>`
        : nothing}
    `;
  }

  private renderComic() {
    const comic = this.comic!;
    const kept = this.cuts.filter((c) => c.keep).length;
    const crops = this.cuts.filter((c) => c.kind === "crop").length;
    const people = this.cuts.filter((c) => c.kind === "person").length;
    return html`
      <div class="head">
        <button class="btn small ghost" @click=${() => this.close()}><span class="material-symbols-rounded">arrow_back</span> Comics</button>
        <h4 title=${comic.title}>${comic.title} · ${comic.pages.length} page${comic.pages.length === 1 ? "" : "s"}</h4>
      </div>
      <div class="toolbar">
        <div class="seg small">
          <button class=${this.split ? "on" : ""} @click=${() => this.setSplit(true)}>
            <span class="material-symbols-rounded">grid_view</span> Panels</button>
          <button class=${this.split ? "" : "on"} @click=${() => this.setSplit(false)}>
            <span class="material-symbols-rounded">image</span> Whole pages</button>
        </div>
        <button class="btn small ${this.cutOut ? "tonal" : ""}" aria-pressed=${this.cutOut ? "true" : "false"}
          title="Click a panel to draw a box round the character you want"
          @click=${() => (this.cutOut = !this.cutOut)}>
          <span class="material-symbols-rounded">person</span> Cut out${this.cutOut ? ": on" : ""}
        </button>
        ${this.canDetect
          ? html`<button class="btn small" ?disabled=${!!this.finding || !!this.reading}
              title="Have the trainer find every person in the kept panels and cut each out alone"
              @click=${() => this.findPeople()}>
              <span class="material-symbols-rounded">person_search</span> ${this.finding
                ? `Finding… ${this.finding.done}/${this.finding.total}` : "Find people"}
            </button>
            <select class="small-select" aria-label="How sure" .value=${this.sureness}
              @change=${(e: Event) => (this.sureness = (e.target as HTMLSelectElement).value)}>
              ${SURENESS.map((s) => html`<option value=${s.id} ?selected=${s.id === this.sureness}>${s.label}</option>`)}
            </select>`
          : nothing}
        ${people || this.canDetect ? html`<div class="seg small" role="group" aria-label="Background of a person cut out">
          ${(["white", "black"] as Backdrop[]).map((b) => html`<button class=${this.backdrop === b ? "on" : ""}
            aria-pressed=${this.backdrop === b ? "true" : "false"} @click=${() => (this.backdrop = b)}>
            <span class="swatch ${b}"></span> ${b === "white" ? "On white" : "On black"}</button>`)}
        </div>` : nothing}
        <span class="count">${kept} of ${this.cuts.length} kept${crops ? ` · ${crops} cut out` : ""}${people ? ` · ${people} found` : ""}</span>
        <button class="btn small ghost" @click=${() => (this.cuts = this.cuts.map((c) => ({ ...c, keep: true })))}>Keep all</button>
        <button class="btn small ghost" @click=${() => (this.cuts = this.cuts.map((c) => ({ ...c, keep: false })))}>Keep none</button>
      </div>
      <div class="note">${this.cutOut
        ? "Click a panel, then drag a box round her — as many boxes as there are good ones. What you cut out is kept and the panel it came from is dropped."
        : this.canDetect
          ? "Click a picture to drop it. Find people cuts everyone in the kept panels out on their own, on white or black — then drop the ones who aren't her. Training fits each to its size."
          : html`Click a picture to drop it: text-heavy panels, someone else, a close-up of nothing. For one character, turn on Cut out.${
            this.trainerSet ? " Update the oppailib-trainer container and it can find the people for you." : ""}`}</div>
      ${this.reading
        ? html`<div class="toolbar"><span class="what">Reading page ${this.reading.done + 1} of ${this.reading.total}…</span>
            <div class="bar" style="flex:1;"><div style="width:${(this.reading.done / this.reading.total) * 100}%"></div></div></div>`
        : nothing}
      <div class="picks ${this.cutOut ? "cutting" : ""}" style="margin-top:10px;">
        ${this.cuts.map((c) => html`<button class="pick ${c.keep ? "on" : "off"}"
            title=${`Page ${c.page + 1} · ${c.rect.w}×${c.rect.h}`} @click=${() => (c.kind === "person" ? this.dropOrKeep(c) : this.toggle(c))}>
          <img src=${c.thumb} alt="" loading="lazy" style=${c.kind === "person" ? `background:${BACKDROPS[this.backdrop]}` : ""} />
          <span class="mark"><span class="material-symbols-rounded">${c.keep ? "check" : "close"}</span></span>
          ${c.kind === "person" ? html`<span class="badge">person</span>`
            : c.kind === "crop" ? html`<span class="badge">cut out</span>`
            : Math.min(c.rect.w, c.rect.h) < SMALL_SIDE ? html`<span class="badge">small</span>` : nothing}
        </button>`)}
      </div>
      ${this.cuts.length
        ? html`<div class="footer">
            ${this.progress
              ? html`<div class="what">Adding ${this.progress.done + this.progress.failed} of ${this.progress.total}…</div>
                  <div class="bar"><div style="width:${((this.progress.done + this.progress.failed) / this.progress.total) * 100}%"></div></div>`
              : html`<div class="what">Kept pictures go into the training set <b>${this.setName || comic.title}</b>, not your library.
                    Leave the tagger's speech bubble and text tags in the captions: the LoRA then puts those on the tags, not on its trigger.</div>
                  <button class="btn primary" ?disabled=${!kept || !!this.reading} @click=${() => this.uploadKept()}>
                    <span class="material-symbols-rounded">upload</span> Add ${kept} to the set
                  </button>`}
          </div>`
        : nothing}
    `;
  }

  private renderCrop(c: Cropping) {
    const d = this.drag;
    // Boxes are drawn in percentages of the cut, so they sit right at any size.
    const pct = (r: Rect) => ({
      left: `${((r.x - c.cut.rect.x) / c.cut.rect.w) * 100}%`, top: `${((r.y - c.cut.rect.y) / c.cut.rect.h) * 100}%`,
      width: `${(r.w / c.cut.rect.w) * 100}%`, height: `${(r.h / c.cut.rect.h) * 100}%`,
    });
    const style = (s: Record<string, string>) => Object.entries(s).map(([k, v]) => `${k}:${v}`).join(";");
    return html`<div class="crop-veil" @keydown=${(e: KeyboardEvent) => e.key === "Escape" && (this.cropping = null)}>
      <div class="crop-stage"
        @pointerdown=${(e: PointerEvent) => this.dragStart(e)}
        @pointermove=${(e: PointerEvent) => this.dragMove(e)}
        @pointerup=${(e: PointerEvent) => this.dragEnd(e)}
        @pointercancel=${() => (this.drag = null)}>
        <img src=${c.url} alt="" draggable="false" />
        ${c.made.map((r) => html`<div class="box" style=${style(pct(r))}></div>`)}
        ${d ? html`<div class="box live" style=${style({
          left: `${Math.min(d.x0, d.x1)}px`, top: `${Math.min(d.y0, d.y1)}px`,
          width: `${Math.abs(d.x1 - d.x0)}px`, height: `${Math.abs(d.y1 - d.y0)}px`,
        })}></div>` : nothing}
      </div>
      <div class="crop-bar">
        <span>Drag a box round her. ${c.made.length ? `${c.made.length} cut out.` : ""}</span>
        ${c.made.length ? html`<button class="btn small" @click=${() => (this.cropping = { ...c, made: c.made.slice(0, -1) })}>
          <span class="material-symbols-rounded">undo</span> Undo</button>` : nothing}
        <button class="btn small" @click=${() => (this.cropping = null)}>Cancel</button>
        <button class="btn small primary" ?disabled=${!c.made.length} @click=${() => this.finishCrop()}>
          <span class="material-symbols-rounded">check</span> Keep ${c.made.length || ""}</button>
      </div>
    </div>`;
  }
}

/** A page's panels, found on a small copy of it and put back at full size. */
function panelsOf(img: HTMLImageElement): Rect[] {
  const w = img.naturalWidth, h = img.naturalHeight;
  const scale = Math.max(1, Math.max(w, h) / READ_SIDE);
  const sw = Math.max(1, Math.round(w / scale)), sh = Math.max(1, Math.round(h / scale));
  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, sw, sh);
  const data = ctx.getImageData(0, 0, sw, sh).data;
  return findPanels(data, sw, sh).map((r) => scaleRect(r, w / sw, w, h));
}

/** Part of a picture, no larger than `side` either way, as a data URL. */
function drawRect(img: HTMLImageElement, r: Rect, side: number, type = "image/jpeg"): string {
  const k = Math.min(1, side / Math.max(r.w, r.h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(r.w * k));
  canvas.height = Math.max(1, Math.round(r.h * k));
  canvas.getContext("2d")!.drawImage(img, r.x, r.y, r.w, r.h, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL(type, 0.85);
}

/** The plain colours a person is laid on. */
const BACKDROPS: Record<Backdrop, string> = { white: "#ffffff", black: "#000000" };

/**
 * A found person alone: her box out of the page, with everything outside her outline
 * on the backdrop (transparent with none, for a tile whose colour CSS sets). The
 * outline is grown a little first (outlineGrow) and its edge softened by a pixel, so
 * the ink line round her stays hers. `side` caps the larger side; 0 is full size.
 */
function personCanvas(img: HTMLImageElement, r: Rect, outline: [number, number][], backdrop: string | null, side: number): HTMLCanvasElement {
  const k = side > 0 ? Math.min(1, side / Math.max(r.w, r.h)) : 1;
  const w = Math.max(1, Math.round(r.w * k)), h = Math.max(1, Math.round(r.h * k));
  const figure = document.createElement("canvas");
  figure.width = w;
  figure.height = h;
  const fctx = figure.getContext("2d")!;
  fctx.drawImage(img, r.x, r.y, r.w, r.h, 0, 0, w, h);
  if (outline.length > 2) {
    const path = new Path2D();
    outline.forEach(([x, y], i) => (i ? path.lineTo : path.moveTo).call(path, (x - r.x) * k, (y - r.y) * k));
    path.closePath();
    const mask = document.createElement("canvas");
    mask.width = w;
    mask.height = h;
    const mctx = mask.getContext("2d")!;
    mctx.filter = "blur(1px)";
    mctx.fillStyle = mctx.strokeStyle = "#000";
    mctx.lineJoin = "round";
    mctx.lineWidth = outlineGrow(r) * 2 * k;
    mctx.fill(path);
    mctx.stroke(path);
    fctx.globalCompositeOperation = "destination-in";
    fctx.drawImage(mask, 0, 0);
  }
  if (!backdrop) return figure;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const octx = out.getContext("2d")!;
  octx.fillStyle = backdrop;
  octx.fillRect(0, 0, w, h);
  octx.drawImage(figure, 0, 0);
  return out;
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("couldn't encode the picture"))), "image/png"));
}

/** Part of a picture at full size, as the PNG that is uploaded. */
function cropBlob(img: HTMLImageElement, r: Rect): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = r.w;
  canvas.height = r.h;
  canvas.getContext("2d")!.drawImage(img, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("couldn't encode the picture"))), "image/png"));
}

declare global {
  interface HTMLElementTagNameMap {
    "oppai-lora-comic": OppaiLoraComic;
  }
}
