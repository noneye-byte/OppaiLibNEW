import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { iconStyles, motionStyles } from "../theme.js";
import { pageStyles } from "./page-styles.js";
import { api, type ChubCard, type ChubDetails, type ChubGalleryPage } from "../api.js";
import { CHUB_SORTS, cardSections, compactCount, fillNames, roleplayRuns, saysItHasExpressions, shownTopics } from "../chub-cards.js";

type Tab = "card" | "greetings" | "lorebook" | "expressions" | "gallery";

/**
 * Finding a card on chub.ai, for chat's "Add someone".
 *
 * A page over chat, as the library's screens are pages: a search, an order, two
 * switches (adult cards, and only cards with an expression pack — SillyTavern's
 * sprites, which the stage draws), and a wall of what came back. A card opens to its
 * own page before it is added, because choosing someone to talk to is choosing what
 * they were written as: its art and figures, then the card itself — the creator's
 * notes, description, personality and scenario, the first message and every other,
 * the example dialogue, the lorebook, the expression pack, and the pictures people
 * posted to its gallery (chub_details.go). Picking a card says so to the host with
 * `chub-pick`; the host imports it, as it imports a card file, and fetches its pack.
 * Everything goes through this server (chub.go): the page may not reach chub itself.
 */
@customElement("oppai-chub-browse")
export class OppaiChubBrowse extends LitElement {
  /** The card being imported, by path, so its button can say so. */
  @property() importing = "";
  /** Paths already imported this session, marked as added. */
  @property({ attribute: false }) added: ReadonlySet<string> = new Set();

  @state() private query = "";
  @state() private sort = "download_count";
  @state() private nsfw = true;
  @state() private expressions = false;
  @state() private items: ChubCard[] = [];
  @state() private page = 1;
  @state() private more = false;
  @state() private total = 0;
  @state() private loading = false;
  @state() private error = "";

  /** The card whose page is open: what the tile knew at once, the rest once fetched. */
  @state() private open: ChubCard | null = null;
  @state() private details: ChubDetails | null = null;
  @state() private detailsError = "";
  @state() private tab: Tab = "card";
  @state() private greeting = 0;
  @state() private unfolded: ReadonlySet<string> = new Set();
  @state() private gallery: ChubGalleryPage["items"] = [];
  @state() private galleryPage = 0;
  @state() private galleryMore = false;
  @state() private galleryLoading = false;
  @state() private zoom: { url: string; caption?: string } | null = null;

  /** Each search's number, so a slow answer to an old one is not drawn over a new one. */
  private asked = 0;
  private typing = 0;
  private resultsScroll = 0;

  static styles = [iconStyles, motionStyles, pageStyles, css`
    :host {
      position: absolute; inset: 0; z-index: 60; display: flex; flex-direction: column;
      background: var(--oppai-bg); color: var(--oppai-text); animation: oppai-fade-in 0.16s ease both;
    }
    .page-top { flex-wrap: nowrap; }
    .page-top .searchbox { max-width: 520px; }
    .scroll { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
    .body { max-width: 1400px; margin: 0 auto; padding: 18px 28px 64px; box-sizing: border-box; }
    .bar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 18px; }
    .bar .page-sub { margin-left: auto; }
    .note-line { font-size: 12.5px; color: var(--oppai-text-muted); }
    .note-line.bad { color: var(--oppai-error); }

    /* The wall: a card as the library draws a picture, its words under it. */
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 24px 14px; }
    .tile { display: flex; flex-direction: column; gap: 6px; min-width: 0; padding: 0; border: none; background: none; color: inherit; font: inherit; text-align: left; cursor: pointer; }
    .art { position: relative; aspect-ratio: 3 / 4; border-radius: var(--oppai-radius-md); overflow: hidden; background: var(--oppai-surface);
      transition: transform 0.22s var(--oppai-ease-spring), box-shadow 0.22s ease; }
    .tile:hover .art { transform: translateY(-3px); box-shadow: var(--oppai-shadow-pop); }
    .tile:focus-visible .art { outline: 2px solid var(--oppai-primary); outline-offset: 2px; }
    .art img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .badges { position: absolute; left: 8px; top: 8px; right: 8px; display: flex; gap: 5px; pointer-events: none; }
    .badge { font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 999px; background: rgba(0,0,0,.55); color: #fff;
      display: inline-flex; align-items: center; gap: 3px; backdrop-filter: blur(6px); }
    .badge .material-symbols-rounded { font-size: 14px; }
    .badge.ok { background: var(--oppai-primary); color: var(--oppai-on-primary); margin-left: auto; }
    .name { font-weight: 600; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 0 2px; margin-top: 2px; }
    .tagline { font-size: 12.5px; line-height: 1.4; color: var(--oppai-text-dim); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; padding: 0 2px; }
    .meta { font-size: 12px; color: var(--oppai-text-muted); display: flex; gap: 10px; flex-wrap: wrap; padding: 0 2px; }
    .stat { display: inline-flex; align-items: center; gap: 4px; font-variant-numeric: tabular-nums; }
    .stat .material-symbols-rounded { font-size: 15px; }
    .more { display: flex; margin: 28px auto 0; height: 40px; padding: 0 22px; border-radius: 12px; align-items: center; gap: 8px;
      border: 1px solid var(--oppai-border-strong); background: none; color: var(--oppai-text-dim); font: inherit; font-size: 13.5px; cursor: pointer; }
    .more:hover:not(:disabled) { color: var(--oppai-text); background: var(--oppai-surface); }

    /* A card's page. */
    .crumb { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 10px 0 6px; margin: 0 0 16px -6px; border: none;
      border-radius: 10px; background: none; color: var(--oppai-text-dim); font: inherit; font-size: 13px; cursor: pointer; }
    .crumb:hover { background: var(--oppai-surface); color: var(--oppai-text); }
    .crumb .material-symbols-rounded { font-size: 19px; }
    .hero { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 32px; align-items: start; margin-bottom: 26px; }
    @media (max-width: 760px) { .hero { grid-template-columns: minmax(0, 1fr); gap: 18px; } .hero .portrait { max-width: 320px; } }
    .portrait { position: relative; aspect-ratio: 3 / 4; border-radius: var(--oppai-radius-lg); overflow: hidden; background: var(--oppai-surface); cursor: zoom-in; border: none; padding: 0; }
    .portrait img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .who { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
    .who h1 { margin: 0; font-size: 32px; font-weight: 650; letter-spacing: -0.02em; line-height: 1.1; }
    .who .line { font-size: 15px; line-height: 1.55; color: var(--oppai-text-dim); }
    .figures { display: flex; flex-wrap: wrap; gap: 8px; }
    .fig { display: flex; flex-direction: column; gap: 1px; padding: 9px 14px; border-radius: 14px; background: var(--oppai-surface); border: 1px solid var(--oppai-border); min-width: 84px; }
    .fig b { font-size: 17px; font-weight: 650; font-variant-numeric: tabular-nums; }
    .fig span { font-size: 11.5px; color: var(--oppai-text-muted); }
    .topics { display: flex; flex-wrap: wrap; gap: 6px; }
    .acts { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-top: 4px; }
    .acts .primary-btn { min-width: 200px; }
    .tabs { margin-bottom: 18px; overflow-x: auto; max-width: 100%; scrollbar-width: none; }
    .seg > button b { font-weight: 500; color: var(--oppai-text-muted); font-variant-numeric: tabular-nums; }

    .sections { display: flex; flex-direction: column; gap: 14px; max-width: 920px; }
    .sec { padding: 16px 18px; }
    .sec-label { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .sec-label .page-sub { font-size: 12px; }
    .text { font-size: 14px; line-height: 1.65; color: var(--oppai-text-dim); white-space: pre-wrap; word-break: break-word; position: relative; }
    .text.folded { max-height: 230px; overflow: hidden; }
    .text.folded::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 70px; background: linear-gradient(to bottom, transparent, var(--oppai-surface)); }
    .unfold { margin-top: 6px; border: none; background: none; color: var(--oppai-primary-bright); font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; padding: 2px 0; }
    .act { font-style: italic; color: var(--oppai-text-muted); }
    .speech { color: var(--oppai-text); }

    /* Greetings, as the first message would arrive. */
    .greet { max-width: 820px; display: flex; flex-direction: column; gap: 12px; }
    .greet-pick { margin-bottom: 4px; }
    .bubble { display: grid; grid-template-columns: 40px minmax(0, 1fr); gap: 12px; align-items: start; }
    .bubble img { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; object-position: top; background: var(--oppai-surface-2); }
    .bubble .text { background: var(--oppai-surface); border: 1px solid var(--oppai-border); border-radius: 4px 18px 18px 18px; padding: 12px 16px; }

    .lore { display: flex; flex-direction: column; gap: 10px; max-width: 920px; }
    .entry { padding: 12px 16px; }
    .entry-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
    .entry-head b { font-size: 14px; }
    .flag { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 999px; background: var(--oppai-selected); color: var(--oppai-primary-bright); }
    .flag.off { background: var(--oppai-surface-2); color: var(--oppai-text-muted); }
    .keys { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 8px; }

    .faces { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 12px; }
    .face { display: flex; flex-direction: column; gap: 6px; border: none; background: none; padding: 0; color: inherit; font: inherit; cursor: zoom-in; }
    .face .pic { aspect-ratio: 3 / 4; border-radius: var(--oppai-radius-md); overflow: hidden;
      background: repeating-conic-gradient(var(--oppai-surface) 0 25%, var(--oppai-surface-2) 0 50%) 0 0 / 18px 18px; }
    .face img { width: 100%; height: 100%; object-fit: contain; display: block; }
    .face span { font-size: 12.5px; color: var(--oppai-text-dim); text-transform: capitalize; text-align: center; }

    .masonry { columns: 4 220px; column-gap: 12px; }
    .shot { display: block; width: 100%; margin: 0 0 12px; padding: 0; border: none; border-radius: var(--oppai-radius-md); overflow: hidden; background: var(--oppai-surface); cursor: zoom-in; break-inside: avoid; }
    .shot img { width: 100%; display: block; }

    .zoom { position: fixed; inset: 0; z-index: 80; background: rgba(4, 3, 5, .94); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 24px; box-sizing: border-box; cursor: zoom-out; animation: oppai-fade-in .14s ease both; }
    .zoom img { max-width: 100%; max-height: calc(100% - 60px); object-fit: contain; border-radius: 8px; }
    .zoom p { margin: 0; max-width: 720px; font-size: 13px; line-height: 1.5; color: #d9d3d6; text-align: center; }

    @media (max-width: 720px) {
      .page-top { flex-wrap: wrap; height: auto; padding: 10px 12px; }
      .page-top .searchbox { order: 5; flex-basis: 100%; max-width: none; }
      .body { padding: 14px 12px 56px; }
      .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px 10px; }
      .who h1 { font-size: 26px; }
      .masonry { columns: 2 140px; column-gap: 8px; }
    }
  `];

  connectedCallback() {
    super.connectedCallback();
    void this.search(1);
    window.addEventListener("keydown", this.onKey);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("keydown", this.onKey);
  }

  private onKey = (e: KeyboardEvent) => {
    if (e.key !== "Escape" || e.defaultPrevented) return;
    e.preventDefault();
    if (this.zoom) this.zoom = null;
    else if (this.open) this.back();
    else this.close();
  };

  private get scroller(): HTMLElement | null {
    return this.renderRoot.querySelector(".scroll");
  }

  private async search(page: number) {
    const ask = ++this.asked;
    this.loading = true;
    this.error = "";
    try {
      const out = await api.chubSearch({ q: this.query, page, sort: this.sort, nsfw: this.nsfw, expressions: this.expressions });
      if (ask !== this.asked) return;
      this.items = page === 1 ? out.items : [...this.items, ...out.items.filter((c) => !this.items.some((x) => x.path === c.path))];
      this.page = page; this.more = out.more; this.total = out.total;
    } catch (error) {
      if (ask === this.asked) this.error = (error as Error).message || "chub.ai couldn't be searched.";
    } finally {
      if (ask === this.asked) this.loading = false;
    }
  }

  /** Searching as they type, a moment after they stop. */
  private onQuery(event: Event) {
    this.query = (event.target as HTMLInputElement).value;
    window.clearTimeout(this.typing);
    this.typing = window.setTimeout(() => { this.back(); void this.search(1); }, 400);
  }

  private close() { this.dispatchEvent(new CustomEvent("close")); }

  private pick(card: ChubCard) {
    this.dispatchEvent(new CustomEvent("chub-pick", { detail: { card } }));
  }

  // ── a card's page ──

  private async openCard(card: ChubCard) {
    this.resultsScroll = this.scroller?.scrollTop ?? 0;
    this.open = card;
    this.details = null;
    this.detailsError = "";
    this.tab = "card";
    this.greeting = 0;
    this.unfolded = new Set();
    this.gallery = [];
    this.galleryPage = 0;
    this.galleryMore = false;
    this.scroller?.scrollTo({ top: 0 });
    try {
      const d = await api.chubDetails(card.path);
      if (this.open?.path === card.path) this.details = d;
    } catch (error) {
      if (this.open?.path === card.path) this.detailsError = (error as Error).message;
    }
  }

  private back() {
    if (!this.open) return;
    this.open = null;
    this.details = null;
    const top = this.resultsScroll;
    void this.updateComplete.then(() => this.scroller?.scrollTo({ top }));
  }

  private async loadGallery() {
    const d = this.details;
    if (!d || this.galleryLoading) return;
    this.galleryLoading = true;
    try {
      const page = this.galleryPage + 1;
      const out = await api.chubGallery(d.id, page);
      if (this.details?.id !== d.id) return;
      this.gallery = [...this.gallery, ...out.items];
      this.galleryPage = page;
      this.galleryMore = out.more;
    } catch (error) {
      this.detailsError = (error as Error).message;
    } finally {
      this.galleryLoading = false;
    }
  }

  private selectTab(tab: Tab) {
    this.tab = tab;
    if (tab === "gallery" && !this.galleryPage) void this.loadGallery();
  }

  private toggleFold(key: string) {
    const next = new Set(this.unfolded);
    if (next.has(key)) next.delete(key); else next.add(key);
    this.unfolded = next;
  }

  // ── render ──

  render() {
    return html`
      <header class="page-top" @click=${(e: Event) => e.stopPropagation()}>
        <button class="tool icon bare" title="Back to chat" aria-label="Back to chat" @click=${() => this.close()}>
          <span class="material-symbols-rounded">arrow_back</span>
        </button>
        <h1 class="page-title"><span class="material-symbols-rounded">travel_explore</span>chub.ai</h1>
        <label class="searchbox">
          <span class="material-symbols-rounded">search</span>
          <input type="search" placeholder="Search names, taglines and tags…" aria-label="Search chub.ai" .value=${this.query} @input=${this.onQuery}
            @keydown=${(e: KeyboardEvent) => { if (e.key === "Enter") { window.clearTimeout(this.typing); this.back(); void this.search(1); } }} />
        </label>
        <span class="page-spacer"></span>
      </header>
      <div class="scroll" @click=${(e: Event) => e.stopPropagation()}>
        <div class="body">${this.open ? this.renderCard(this.open) : this.renderResults()}</div>
      </div>
      ${this.zoom
        ? html`<div class="zoom" @click=${(e: Event) => { e.stopPropagation(); this.zoom = null; }}>
            <img src=${this.zoom.url} alt="" />
            ${this.zoom.caption ? html`<p>${this.zoom.caption}</p>` : nothing}
          </div>`
        : nothing}
    `;
  }

  private renderResults() {
    return html`
      <div class="bar">
        <select class="tool" aria-label="Order" .value=${this.sort} @change=${(e: Event) => { this.sort = (e.target as HTMLSelectElement).value; void this.search(1); }}>
          ${CHUB_SORTS.map((s) => html`<option value=${s.id} ?selected=${s.id === this.sort}>${s.label}</option>`)}
        </select>
        <button class="chip" aria-pressed=${this.nsfw ? "true" : "false"} @click=${() => { this.nsfw = !this.nsfw; void this.search(1); }}>
          <span class="material-symbols-rounded">explicit</span> Adult cards
        </button>
        <button class="chip" aria-pressed=${this.expressions ? "true" : "false"} title="Only cards that come with a SillyTavern expression pack"
          @click=${() => { this.expressions = !this.expressions; void this.search(1); }}>
          <span class="material-symbols-rounded">mood</span> With expressions
        </button>
        <span class="page-sub note-line ${this.error ? "bad" : ""}">
          ${this.error || (this.loading && !this.items.length ? "Searching chub.ai…" : `${compactCount(this.total)} cards`)}
        </span>
      </div>
      <div class="grid">
        ${this.items.map((card) => this.renderTile(card))}
      </div>
      ${!this.loading && !this.error && !this.items.length ? html`<div class="empty-note">Nothing on chub.ai matched that.</div>` : nothing}
      ${this.more ? html`<button class="more" ?disabled=${this.loading} @click=${() => void this.search(this.page + 1)}>${this.loading ? "Loading…" : "More cards"}</button>` : nothing}
    `;
  }

  private renderTile(card: ChubCard) {
    const added = this.added.has(card.path);
    return html`<button class="tile" @click=${() => void this.openCard(card)}>
      <div class="art">
        <img src=${card.avatar} alt="" loading="lazy" @error=${(e: Event) => ((e.target as HTMLImageElement).style.visibility = "hidden")} />
        <div class="badges">
          ${card.nsfw ? html`<span class="badge">18+</span>` : nothing}
          ${saysItHasExpressions(card.topics) ? html`<span class="badge" title="Has an expression pack"><span class="material-symbols-rounded">mood</span></span>` : nothing}
          ${added ? html`<span class="badge ok"><span class="material-symbols-rounded">check</span>Added</span>` : nothing}
        </div>
      </div>
      <span class="name" title=${card.name}>${card.name}</span>
      <span class="tagline">${card.tagline || "No tagline."}</span>
      <span class="meta">
        <span class="stat"><span class="material-symbols-rounded">star</span>${compactCount(card.stars)}</span>
        <span class="stat"><span class="material-symbols-rounded">chat_bubble</span>${compactCount(card.chats)}</span>
        <span class="stat"><span class="material-symbols-rounded">description</span>${compactCount(card.tokens)}</span>
      </span>
    </button>`;
  }

  private renderCard(card: ChubCard) {
    const d = this.details;
    const busy = this.importing === card.path;
    const added = this.added.has(card.path);
    const name = d?.name || card.name;
    const topics = shownTopics(card.topics, 14);
    return html`
      <button class="crumb" @click=${() => this.back()}><span class="material-symbols-rounded">arrow_back</span> All cards</button>
      <div class="hero">
        <button class="portrait" aria-label="See the art full size" @click=${() => (this.zoom = { url: d?.art || card.avatar })}>
          <img src=${d?.art || card.avatar} alt="" @error=${(e: Event) => { const img = e.target as HTMLImageElement; if (img.src !== new URL(card.avatar, location.href).href) img.src = card.avatar; }} />
        </button>
        <div class="who">
          <span class="kicker">by ${d?.creator ?? card.path.split("/")[0]}${card.nsfw ? " · 18+" : ""}</span>
          <h1>${name}</h1>
          ${card.tagline ? html`<div class="line">${card.tagline}</div>` : nothing}
          <div class="figures">
            ${this.fig(compactCount(card.stars), "stars")}
            ${d ? this.fig(compactCount(d.favorites), "favourites") : nothing}
            ${this.fig(compactCount(card.chats), "chats")}
            ${d?.messages ? this.fig(compactCount(d.messages), "messages") : nothing}
            ${d?.ratingCount ? this.fig(`${d.rating.toFixed(1)}★`, `${compactCount(d.ratingCount)} ratings`) : nothing}
            ${this.fig(compactCount(card.tokens), "tokens")}
            ${d?.forks ? this.fig(compactCount(d.forks), "forks") : nothing}
          </div>
          ${topics.length ? html`<div class="topics">${topics.map((t) => html`<span class="tag">${t}</span>`)}</div>` : nothing}
          <div class="acts">
            <button class="primary-btn" ?disabled=${busy || !!this.importing || added} @click=${() => this.pick(d ?? card)}>
              <span class="material-symbols-rounded">${added ? "check" : "person_add"}</span>${added ? "Added to chats" : busy ? "Adding…" : `Add ${name}`}
            </button>
            <a class="tool" href=${`https://chub.ai/characters/${card.path}`} target="_blank" rel="noopener noreferrer">
              <span class="material-symbols-rounded">open_in_new</span> chub.ai
            </a>
            ${d?.updated ? html`<span class="page-sub">Updated ${new Date(d.updated).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</span>` : nothing}
          </div>
          ${d && d.expressions.length ? html`<span class="note-line">Comes with ${d.expressions.length} expressions${d.expressionPack ? ` (${d.expressionPack.replace(/_/g, " ")})` : ""}; they are added with the card.</span>` : nothing}
        </div>
      </div>
      ${this.detailsError ? html`<div class="err-note">${this.detailsError}</div>` : nothing}
      ${!d && !this.detailsError ? html`<div class="empty-note">Reading the card…</div>` : nothing}
      ${d ? this.renderTabs(d) : nothing}
    `;
  }

  private fig(value: string, label: string) {
    return html`<div class="fig"><b>${value}</b><span>${label}</span></div>`;
  }

  private renderTabs(d: ChubDetails) {
    const greetings = 1 + d.greetings.length;
    const tabs: [Tab, string, number | undefined][] = [
      ["card", "The card", undefined],
      ["greetings", "Greetings", d.firstMessage ? greetings : d.greetings.length],
      ["lorebook", "Lorebook", d.lorebook.length + (d.lorebookMore ?? 0)],
      ["expressions", "Expressions", d.expressions.length],
      ["gallery", "Gallery", undefined],
    ];
    return html`
      <div class="seg tabs" role="tablist">
        ${tabs
          .filter(([id, , n]) => id === "card" || (id === "gallery" ? d.hasGallery : (n ?? 0) > 0))
          .map(([id, label, n]) => html`<button role="tab" aria-selected=${this.tab === id ? "true" : "false"} @click=${() => this.selectTab(id)}>
            ${label}${n ? html` <b>${n}</b>` : nothing}
          </button>`)}
      </div>
      ${this.tab === "card" ? this.renderSections(d)
        : this.tab === "greetings" ? this.renderGreetings(d)
        : this.tab === "lorebook" ? this.renderLorebook(d)
        : this.tab === "expressions" ? this.renderExpressions(d)
        : this.renderGallery()}
    `;
  }

  /** Text as a chat draws it: placeholders read out, *actions* and "speech" set apart. */
  private prose(text: string, name: string) {
    return roleplayRuns(fillNames(text, name)).map((r) =>
      r.kind === "action" ? html`<span class="act">${r.text}</span>` : r.kind === "speech" ? html`<span class="speech">${r.text}</span>` : r.text);
  }

  private folded(key: string, text: string, name: string, limit = 900) {
    const long = text.length > limit;
    const open = this.unfolded.has(key);
    return html`<div class="text ${long && !open ? "folded" : ""}">${this.prose(text, name)}</div>
      ${long ? html`<button class="unfold" @click=${() => this.toggleFold(key)}>${open ? "Show less" : "Show all of it"}</button>` : nothing}`;
  }

  private renderSections(d: ChubDetails) {
    const sections = cardSections(d);
    if (!sections.length) return html`<div class="empty-note">This card has nothing written in it beyond its greeting.</div>`;
    return html`<div class="sections">
      ${sections.map((s) => html`<section class="panel sec">
        <div class="sec-label"><span class="kicker">${s.label}</span>${s.tokens ? html`<span class="page-sub">${compactCount(s.tokens)} tokens</span>` : nothing}</div>
        ${this.folded(s.key, s.text, d.name)}
      </section>`)}
    </div>`;
  }

  private renderGreetings(d: ChubDetails) {
    const all = [d.firstMessage, ...d.greetings].filter((g) => g.trim());
    const i = Math.min(this.greeting, all.length - 1);
    if (i < 0) return html`<div class="empty-note">No greeting.</div>`;
    return html`<div class="greet">
      ${all.length > 1
        ? html`<div class="chip-row greet-pick">
            ${all.map((_, n) => html`<button class="chip small" aria-pressed=${n === i ? "true" : "false"} @click=${() => (this.greeting = n)}>
              ${n === 0 && d.firstMessage ? "First message" : `Alternate ${d.firstMessage ? n : n + 1}`}
            </button>`)}
          </div>`
        : nothing}
      <div class="bubble">
        <img src=${d.avatar} alt="" />
        <div class="text">${this.prose(all[i], d.name)}</div>
      </div>
    </div>`;
  }

  private renderLorebook(d: ChubDetails) {
    return html`<div class="lore">
      ${d.lorebookName ? html`<div class="sec-head"><h3>${d.lorebookName}</h3><span class="page-sub">${d.lorebook.length + (d.lorebookMore ?? 0)} entries</span></div>` : nothing}
      ${d.lorebook.map((e, n) => html`<article class="panel entry">
        <div class="entry-head">
          <b>${e.name || e.keys[0] || `Entry ${n + 1}`}</b>
          ${e.constant ? html`<span class="flag" title="Always in the prompt">Always on</span>` : nothing}
          ${e.disabled ? html`<span class="flag off">Off</span>` : nothing}
        </div>
        ${e.keys.length ? html`<div class="keys">${e.keys.map((k) => html`<span class="tag">${k}</span>`)}</div>` : nothing}
        ${this.folded(`lore-${n}`, e.content, d.name, 420)}
      </article>`)}
      ${d.lorebookMore ? html`<div class="note-line">${d.lorebookMore} more entries are on chub.ai.</div>` : nothing}
    </div>`;
  }

  private renderExpressions(d: ChubDetails) {
    return html`<div class="faces">
      ${d.expressions.map((x) => html`<button class="face" @click=${() => (this.zoom = { url: x.url, caption: x.label })}>
        <div class="pic"><img src=${x.url} alt=${x.label} loading="lazy" /></div>
        <span>${x.label}</span>
      </button>`)}
    </div>`;
  }

  private renderGallery() {
    return html`
      ${this.gallery.length
        ? html`<div class="masonry">
            ${this.gallery.map((g) => html`<button class="shot" title=${g.description ?? ""} @click=${() => (this.zoom = { url: g.url, caption: g.description })}>
              <img src=${g.url} alt=${g.description ?? ""} loading="lazy" />
            </button>`)}
          </div>`
        : nothing}
      ${this.galleryLoading
        ? html`<div class="empty-note">Loading the gallery…</div>`
        : !this.gallery.length ? html`<div class="empty-note">Nobody has posted to this card's gallery.</div>` : nothing}
      ${this.galleryMore && !this.galleryLoading ? html`<button class="more" @click=${() => void this.loadGallery()}>More pictures</button>` : nothing}
    `;
  }
}

declare global { interface HTMLElementTagNameMap { "oppai-chub-browse": OppaiChubBrowse; } }
