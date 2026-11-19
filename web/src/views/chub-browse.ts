import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { iconStyles } from "../theme.js";
import { api, type ChubCard } from "../api.js";
import { CHUB_SORTS, compactCount, saysItHasExpressions, shownTopics } from "../chub-cards.js";

/**
 * Finding a card on chub.ai, for chat's "Add someone".
 *
 * A search, an order, two switches (adult cards, and only cards with an expression
 * pack — SillyTavern's sprites, which the stage draws), a grid of what came back and
 * a button to have more. Picking a card says so to the host with `chub-pick`; the
 * host imports it, as it imports a card file, and fetches its pack. Everything goes
 * through this server (chub.go): the page may not reach chub itself.
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
  /** Each search's number, so a slow answer to an old one is not drawn over a new one. */
  private asked = 0;
  private typing = 0;

  static styles = [iconStyles, css`
    :host { position:absolute; inset:0; z-index:60; display:grid; place-items:center; background:rgba(0,0,0,.5); }
    .card { width:min(1040px,96%); height:min(88%,860px); display:flex; flex-direction:column; border-radius:18px;
      background:var(--main, var(--md-sys-color-surface)); color:var(--md-sys-color-on-surface); box-shadow:0 20px 60px rgba(0,0,0,.45); overflow:hidden; }
    .head { display:flex; align-items:center; gap:8px; padding:14px 14px 8px 18px; }
    .head h2 { margin:0; font-size:17px; flex:1; }
    .bar { display:flex; flex-wrap:wrap; align-items:center; gap:8px; padding:0 14px 10px 18px; }
    .search { flex:1 1 260px; min-width:0; border:0; outline:0; border-radius:999px; padding:9px 14px;
      background:var(--input, var(--md-sys-color-surface-container-highest)); color:inherit; font:inherit; }
    select { border:1px solid var(--line, var(--md-sys-color-outline-variant)); border-radius:999px; padding:7px 10px; background:transparent; color:inherit; font:inherit; }
    label.switch { display:flex; align-items:center; gap:6px; font-size:13px; color:var(--muted, var(--md-sys-color-on-surface-variant)); cursor:pointer; }
    .icon-btn { width:36px; height:36px; display:grid; place-items:center; border:0; border-radius:50%; background:transparent; color:inherit; cursor:pointer; }
    .icon-btn:hover { background:var(--hover, var(--md-sys-color-surface-container-high)); }
    .note { padding:4px 18px 10px; font-size:12px; color:var(--muted, var(--md-sys-color-on-surface-variant)); }
    .note.bad { color:var(--md-sys-color-error); }
    /* The scroller and the grid are two boxes: a grid that is itself the flex:1 scroller
       had its rows squeezed to the box in Edge, each tile cut to the top of its art. */
    .scroll { flex:1; min-height:0; overflow:auto; }
    .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); grid-auto-rows:max-content; gap:12px; padding:4px 18px 18px; }
    .tile { display:flex; flex-direction:column; border-radius:12px; overflow:hidden; background:var(--side, var(--md-sys-color-surface-container-low));
      border:1px solid var(--line, var(--md-sys-color-outline-variant)); min-width:0; }
    .art { position:relative; aspect-ratio:3/4; background:var(--input, var(--md-sys-color-surface-container-highest)); }
    .art img { width:100%; height:100%; object-fit:cover; display:block; }
    .badges { position:absolute; left:6px; top:6px; display:flex; gap:4px; }
    .badge { font-size:10px; font-weight:700; padding:2px 6px; border-radius:999px; background:rgba(0,0,0,.6); color:#fff; display:flex; align-items:center; gap:2px; }
    .badge .material-symbols-rounded { font-size:13px; }
    .body { flex:1; display:flex; flex-direction:column; gap:4px; padding:9px 10px 10px; min-width:0; }
    .name { font-weight:700; font-size:14px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .tagline { font-size:12px; color:var(--muted, var(--md-sys-color-on-surface-variant)); display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; min-height:3.6em; }
    .topics { display:flex; flex-wrap:wrap; gap:4px; }
    .topic { font-size:10px; padding:1px 6px; border-radius:999px; border:1px solid var(--line, var(--md-sys-color-outline-variant)); color:var(--muted, var(--md-sys-color-on-surface-variant)); }
    .meta { font-size:11px; color:var(--muted, var(--md-sys-color-on-surface-variant)); }
    .add { margin-top:auto; border:0; border-radius:999px; padding:7px 10px; font:inherit; font-weight:600; cursor:pointer;
      background:var(--accent, var(--md-sys-color-primary)); color:var(--on-accent, var(--md-sys-color-on-primary)); display:flex; align-items:center; justify-content:center; gap:4px; }
    .add[disabled] { opacity:.55; cursor:default; }
    .add .material-symbols-rounded { font-size:17px; }
    .more { grid-column:1/-1; justify-self:center; border:1px solid var(--line, var(--md-sys-color-outline-variant)); border-radius:999px; padding:8px 18px; background:transparent; color:inherit; font:inherit; cursor:pointer; }
    .empty { grid-column:1/-1; text-align:center; padding:40px 0; color:var(--muted, var(--md-sys-color-on-surface-variant)); }
    @media (max-width:600px) { .card { width:100%; height:100%; border-radius:0; } .grid { grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); padding:4px 12px 12px; } }
  `];

  connectedCallback() {
    super.connectedCallback();
    void this.search(1);
  }

  private async search(page: number) {
    const ask = ++this.asked;
    this.loading = true;
    this.error = "";
    try {
      const out = await api.chubSearch({ q: this.query, page, sort: this.sort, nsfw: this.nsfw, expressions: this.expressions });
      if (ask !== this.asked) return;
      this.items = page === 1 ? out.items : [...this.items, ...out.items];
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
    this.typing = window.setTimeout(() => void this.search(1), 400);
  }

  private close() { this.dispatchEvent(new CustomEvent("close")); }

  private pick(card: ChubCard) {
    this.dispatchEvent(new CustomEvent("chub-pick", { detail: { card } }));
  }

  render() {
    return html`<div class="card" role="dialog" aria-modal="true" aria-label="Find a character on chub.ai" @click=${(e: Event) => e.stopPropagation()}>
      <div class="head">
        <span class="material-symbols-rounded">travel_explore</span>
        <h2>Find a character on chub.ai</h2>
        <button class="icon-btn" title="Close" aria-label="Close" @click=${() => this.close()}><span class="material-symbols-rounded">close</span></button>
      </div>
      <div class="bar">
        <input class="search" type="search" placeholder="Search names, taglines and tags…" aria-label="Search chub.ai" .value=${this.query} @input=${this.onQuery}
          @keydown=${(e: KeyboardEvent) => { if (e.key === "Enter") { window.clearTimeout(this.typing); void this.search(1); } }} />
        <select aria-label="Order" .value=${this.sort} @change=${(e: Event) => { this.sort = (e.target as HTMLSelectElement).value; void this.search(1); }}>
          ${CHUB_SORTS.map((s) => html`<option value=${s.id} ?selected=${s.id === this.sort}>${s.label}</option>`)}
        </select>
        <label class="switch"><input type="checkbox" .checked=${this.nsfw} @change=${(e: Event) => { this.nsfw = (e.target as HTMLInputElement).checked; void this.search(1); }} />Adult cards</label>
        <label class="switch"><input type="checkbox" .checked=${this.expressions} @change=${(e: Event) => { this.expressions = (e.target as HTMLInputElement).checked; void this.search(1); }} />With expressions</label>
      </div>
      <div class="note ${this.error ? "bad" : ""}">${this.error || (this.loading && !this.items.length ? "Searching chub.ai…" : `${compactCount(this.total)} cards. Adding one imports its card and portrait, and its expression pack when it has one.`)}</div>
      <div class="scroll"><div class="grid">
        ${!this.loading && !this.error && !this.items.length ? html`<div class="empty">Nothing on chub.ai matched that.</div>` : nothing}
        ${this.items.map((card) => this.renderTile(card))}
        ${this.more ? html`<button class="more" ?disabled=${this.loading} @click=${() => void this.search(this.page + 1)}>${this.loading ? "Loading…" : "Show more"}</button>` : nothing}
      </div></div>
    </div>`;
  }

  private renderTile(card: ChubCard) {
    const busy = this.importing === card.path;
    const added = this.added.has(card.path);
    return html`<article class="tile">
      <div class="art">
        <img src=${card.avatar} alt="" loading="lazy" @error=${(e: Event) => ((e.target as HTMLImageElement).style.visibility = "hidden")} />
        <div class="badges">
          ${card.nsfw ? html`<span class="badge">18+</span>` : nothing}
          ${saysItHasExpressions(card.topics) ? html`<span class="badge" title="Has an expression pack"><span class="material-symbols-rounded">mood</span></span>` : nothing}
        </div>
      </div>
      <div class="body">
        <span class="name" title=${card.name}>${card.name}</span>
        <span class="tagline">${card.tagline || "No tagline."}</span>
        <div class="topics">${shownTopics(card.topics).map((t) => html`<span class="topic">${t}</span>`)}</div>
        <span class="meta">★ ${compactCount(card.stars)} · ${compactCount(card.chats)} chats · ${compactCount(card.tokens)} tokens</span>
        <button class="add" ?disabled=${busy || !!this.importing || added} @click=${() => this.pick(card)}>
          <span class="material-symbols-rounded">${added ? "check" : "download"}</span>${added ? "Added" : busy ? "Adding…" : "Add"}
        </button>
      </div>
    </article>`;
  }
}

declare global { interface HTMLElementTagNameMap { "oppai-chub-browse": OppaiChubBrowse; } }
