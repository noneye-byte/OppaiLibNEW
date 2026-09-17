import "@material/web/progress/circular-progress.js";
import { LitElement, html, css, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { iconStyles, motionStyles } from "../theme.js";
import {
  api,
  mascotSay,
  type GameSite,
  type GameSiteAccount,
  type GameSiteItem,
  type GameSitesResponse,
  type GameUpdatesResponse,
} from "../api.js";
import { requestOpenMedia } from "../chat-links.js";

/**
 * The Games tab's other three faces: itch.io, F95zone, and the updates waiting.
 *
 * Both catalogues are read through the server and only while signed in — itch.io
 * keeps its adult games from anyone who has not asked for them and F95zone hides
 * threads and every download link from guests, so a catalogue browsed signed out
 * would quietly show half of what is there. The sign-in lives here, on the tab that
 * needs it, rather than in Settings: F95zone takes a username and password; itch.io
 * cannot (its login page is behind a browser check no server can pass) and is
 * signed in by pasting its session cookie, or by Launchy handing its own over.
 *
 * Adding a result goes through the same import a pasted URL does, and the page is
 * remembered as where the game came from — which is what the Updates face reads.
 */
@customElement("oppai-game-browse")
export class OppaiGameBrowse extends LitElement {
  /** Which face: a site, or the updates list. */
  @property() site: GameSite | "updates" = "itch";

  @state() private sites: GameSitesResponse | null = null;
  @state() private sitesError = "";

  // Sign-in form state. The password never leaves this element except to the server.
  @state() private username = "";
  @state() private password = "";
  @state() private cookie = "";
  @state() private signingIn = false;
  @state() private signInError = "";

  /** The committed search term — what was fetched. The box holds a draft. */
  @state() private query = "";
  @state() private draft = "";
  @state() private sort = "";
  @state() private items: GameSiteItem[] = [];
  @state() private page = 1;
  @state() private hasMore = false;
  @state() private loading = false;
  @state() private error = "";

  /** The result open in the detail sheet, and whether its page has been read. */
  @state() private detail: GameSiteItem | null = null;
  @state() private detailLoading = false;
  @state() private adding = false;
  @state() private shot = "";

  @state() private updates: GameUpdatesResponse | null = null;
  @state() private updatesLoading = false;
  private sweepTimer: number | null = null;

  static styles = [
    iconStyles,
    motionStyles,
    css`
      :host { display: block; color: var(--oppai-text); }

      .bar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 16px; }
      .searchbox {
        flex: 1; min-width: 220px; max-width: 520px; height: 44px;
        background: var(--oppai-surface-2); border-radius: 22px;
        display: flex; align-items: center; gap: 10px; padding: 0 16px;
      }
      .searchbox input {
        flex: 1; background: none; border: none; outline: none; color: var(--oppai-text);
        font: inherit; font-size: 14px; min-width: 0;
      }
      .account { margin-left: auto; display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--oppai-text-muted); }

      .chips { display: flex; gap: 8px; margin: 0 0 18px; flex-wrap: wrap; }
      .chip {
        height: 36px; padding: 0 16px; border-radius: 18px; font-size: 13px; font-weight: 500;
        font-family: inherit; cursor: pointer; display: flex; align-items: center; gap: 6px;
        background: transparent; color: var(--oppai-text-dim); border: 1px solid var(--oppai-border-strong);
        transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
      }
      .chip:hover { background: var(--oppai-nav-hover); }
      .chip[aria-pressed="true"] { background: var(--oppai-accent); color: var(--oppai-on-accent); border-color: var(--oppai-accent); }
      .chip:disabled { opacity: 0.5; cursor: default; }
      .chip.ghost { color: var(--oppai-primary-bright); }

      .btn-primary, .btn-outline {
        display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 20px;
        border-radius: 20px; font: inherit; font-size: 14px; font-weight: 500; cursor: pointer;
        text-decoration: none; white-space: nowrap;
      }
      .btn-primary { background: var(--oppai-accent); color: var(--oppai-on-accent); border: none; }
      .btn-outline { background: transparent; color: var(--oppai-text); border: 1px solid var(--oppai-border-strong); }
      .btn-primary:disabled, .btn-outline:disabled { opacity: 0.5; cursor: default; }

      /* The sign-in card. */
      .signin {
        max-width: 560px; margin: 24px auto; padding: 22px 24px; border-radius: 18px;
        background: var(--oppai-surface-1); border: 1px solid var(--oppai-border, rgba(255,255,255,.08));
      }
      .signin h3 { margin: 0 0 6px; font-size: 18px; font-weight: 500; }
      .signin p { margin: 0 0 14px; font-size: 13px; color: var(--oppai-text-muted); line-height: 1.5; }
      .signin label { display: block; font-size: 12px; color: var(--oppai-text-muted); margin: 10px 0 4px; }
      .signin input, .signin textarea {
        width: 100%; box-sizing: border-box; padding: 10px 12px; border-radius: 10px; font: inherit;
        background: var(--oppai-surface-2); color: var(--oppai-text); border: 1px solid var(--oppai-border-strong);
      }
      .signin textarea { min-height: 72px; resize: vertical; font-family: ui-monospace, monospace; font-size: 12px; }
      .signin .row { display: flex; gap: 10px; align-items: center; margin-top: 16px; flex-wrap: wrap; }
      .err { color: var(--oppai-error, #ff6b6b); font-size: 13px; margin-top: 8px; }
      .or { margin: 18px 0 4px; font-size: 12px; color: var(--oppai-text-muted); text-transform: uppercase; letter-spacing: .06em; }

      /* Result cards. */
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 20px; }
      .tile { cursor: pointer; border: none; padding: 0; background: none; text-align: left; font: inherit; color: inherit; }
      .tile-media {
        position: relative; width: 100%; aspect-ratio: 4 / 3; border-radius: 14px; overflow: hidden;
        background: var(--oppai-surface-2);
        transition: transform 0.28s var(--oppai-ease-emphasized), box-shadow 0.28s var(--oppai-ease-emphasized);
      }
      .tile:hover .tile-media { transform: translateY(-4px) scale(1.02); box-shadow: 0 12px 28px rgba(0,0,0,.4); }
      .tile-media img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
      .tile-blank { position: absolute; inset: 0; display: grid; place-items: center; color: var(--oppai-text-muted); }
      .badge {
        position: absolute; top: 8px; left: 8px; display: inline-flex; align-items: center; gap: 4px;
        font-size: 11px; font-weight: 600; color: #fff; background: rgba(0,0,0,.55); padding: 3px 8px; border-radius: 8px;
      }
      .badge.owned { background: var(--oppai-accent); color: var(--oppai-on-accent); }
      .tile-meta { padding: 10px 2px 0; }
      .tile-title { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .tile-sub { font-size: 12px; color: var(--oppai-text-muted); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

      .empty { text-align: center; padding: 80px 0; color: var(--oppai-text-muted); }
      .more { display: grid; place-items: center; padding: 28px 0 8px; }

      /* Detail sheet. */
      .sheet-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.55); z-index: 40; display: grid; place-items: center; padding: 24px; }
      .sheet {
        width: min(860px, 100%); max-height: 90vh; overflow: auto; border-radius: 22px;
        background: var(--oppai-surface-1); border: 1px solid var(--oppai-border, rgba(255,255,255,.1));
        padding: 22px 24px;
      }
      .sheet-head { display: flex; align-items: flex-start; gap: 12px; }
      .sheet-head h2 { margin: 0; font-size: 22px; font-weight: 500; flex: 1; }
      .sheet-sub { font-size: 13px; color: var(--oppai-text-muted); margin: 4px 0 14px; }
      .close { border: none; background: transparent; color: var(--oppai-text-dim); cursor: pointer; padding: 4px; border-radius: 50%; }
      .close:hover { background: var(--oppai-nav-hover); }
      .shots { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 6px; margin: 0 0 14px; }
      .shot { flex: 0 0 auto; height: 130px; border-radius: 10px; overflow: hidden; border: none; padding: 0; background: var(--oppai-surface-2); cursor: pointer; }
      .shot img { height: 100%; width: auto; display: block; }
      .desc { white-space: pre-wrap; font-size: 14px; line-height: 1.55; color: var(--oppai-text-dim); margin: 0 0 14px; }
      .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px; }
      .tag { font-size: 12px; padding: 4px 10px; border-radius: 10px; background: var(--oppai-surface-2); color: var(--oppai-text-dim); }
      .actions { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
      .lightbox { position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,.9); display: grid; place-items: center; cursor: zoom-out; }
      .lightbox img { max-width: 96vw; max-height: 96vh; object-fit: contain; }

      /* Updates list. */
      .sweep { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; font-size: 13px; color: var(--oppai-text-muted); flex-wrap: wrap; }
      .urow {
        display: flex; gap: 14px; align-items: center; padding: 12px; border-radius: 14px;
        background: var(--oppai-surface-1); border: 1px solid var(--oppai-border, rgba(255,255,255,.08)); margin-bottom: 10px;
      }
      .urow img { width: 56px; height: 56px; border-radius: 10px; object-fit: cover; background: var(--oppai-surface-2); flex: 0 0 auto; }
      .urow .cover-blank { width: 56px; height: 56px; border-radius: 10px; display: grid; place-items: center; background: var(--oppai-surface-2); color: var(--oppai-text-muted); flex: 0 0 auto; }
      .urow .body { flex: 1; min-width: 0; }
      .urow .t { font-size: 15px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .urow .v { font-size: 13px; color: var(--oppai-text-muted); margin-top: 2px; }
      .urow .log { font-size: 12px; color: var(--oppai-text-dim); margin-top: 6px; white-space: pre-wrap; max-height: 96px; overflow: hidden; }
      .urow .acts { display: flex; gap: 6px; flex: 0 0 auto; }
      .icon-btn { border: 1px solid var(--oppai-border-strong); background: transparent; color: var(--oppai-text); border-radius: 50%; width: 38px; height: 38px; display: grid; place-items: center; cursor: pointer; }
      .icon-btn:hover { background: var(--oppai-nav-hover); }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    void this.loadSites();
    if (this.site === "updates") void this.loadUpdates();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.stopSweepPoll();
  }

  protected updated(changed: PropertyValues<this>) {
    if (changed.has("site")) {
      this.items = [];
      this.query = "";
      this.draft = "";
      this.sort = "";
      this.error = "";
      this.detail = null;
      if (this.site === "updates") void this.loadUpdates();
      else if (this.account?.signedIn) void this.search(1);
    }
  }

  private get account(): GameSiteAccount | null {
    if (!this.sites || this.site === "updates") return null;
    return this.sites.sites.find((s) => s.site === this.site) ?? null;
  }

  private async loadSites() {
    try {
      this.sites = await api.gameSites();
      this.sitesError = "";
      if (this.site !== "updates" && this.account?.signedIn && !this.items.length) void this.search(1);
    } catch (err) {
      this.sitesError = (err as Error).message;
    }
  }

  private async signIn() {
    if (this.site === "updates") return;
    const site = this.site;
    this.signingIn = true;
    this.signInError = "";
    try {
      const body = this.cookie.trim()
        ? { cookie: this.cookie.trim() }
        : { username: this.username.trim(), password: this.password };
      const acct = await api.gameSiteLogin(site, body);
      this.sites = this.sites
        ? { ...this.sites, sites: this.sites.sites.map((s) => (s.site === site ? acct : s)) }
        : this.sites;
      this.password = "";
      this.cookie = "";
      if (acct.signedIn) void this.search(1);
    } catch (err) {
      this.signInError = (err as Error).message;
    } finally {
      this.signingIn = false;
    }
  }

  private async signOut() {
    if (this.site === "updates") return;
    const site = this.site;
    try {
      const acct = await api.gameSiteLogout(site);
      this.sites = this.sites
        ? { ...this.sites, sites: this.sites.sites.map((s) => (s.site === site ? acct : s)) }
        : this.sites;
      this.items = [];
    } catch (err) {
      mascotSay((err as Error).message, "error");
    }
  }

  private async toggleNsfw() {
    if (!this.sites) return;
    const next = !this.sites.itchNsfw;
    try {
      await api.saveSettings({ itchNsfw: next });
      this.sites = { ...this.sites, itchNsfw: next };
      void this.search(1);
    } catch (err) {
      mascotSay((err as Error).message, "error");
    }
  }

  private async search(page: number) {
    if (this.site === "updates") return;
    const site = this.site;
    this.loading = true;
    this.error = "";
    if (page === 1) this.items = [];
    try {
      const listing = await api.gameBrowse(site, this.query, this.sort, page);
      if (this.site !== site) return;
      this.items = page === 1 ? listing.items : [...this.items, ...listing.items];
      this.page = listing.page;
      this.hasMore = listing.hasMore;
    } catch (err) {
      this.error = (err as Error).message;
      // The session may have lapsed underneath us: re-read who is signed in.
      if (/sign in/i.test(this.error)) void this.loadSites();
    } finally {
      this.loading = false;
    }
  }

  private submit(e: Event) {
    e.preventDefault();
    this.query = this.draft.trim();
    void this.search(1);
  }

  private async open(item: GameSiteItem) {
    this.detail = item;
    this.shot = "";
    this.detailLoading = true;
    try {
      const { item: full } = await api.gameBrowseDetail(item);
      if (this.detail?.id === item.id) this.detail = full;
    } catch {
      /* the listing's own data stays on screen */
    } finally {
      this.detailLoading = false;
    }
  }

  private async add() {
    const item = this.detail;
    if (!item) return;
    this.adding = true;
    try {
      const result = await api.gameBrowseAdd({ url: item.url, id: item.id, version: item.version });
      this.items = this.items.map((it) => (it.id === item.id && it.site === item.site ? { ...it, libraryId: result.id } : it));
      this.detail = { ...item, libraryId: result.id };
      mascotSay(result.created ? `Added ${item.title} to the library.` : `${item.title} was already in the library.`);
      this.dispatchEvent(new CustomEvent("imported", { bubbles: true, composed: true }));
    } catch (err) {
      mascotSay((err as Error).message, "error");
    } finally {
      this.adding = false;
    }
  }

  /* -------------------------------------------------------------- updates */

  private async loadUpdates() {
    this.updatesLoading = true;
    try {
      this.updates = await api.gameUpdates();
      if (this.updates.sweep.running) this.startSweepPoll();
      else this.stopSweepPoll();
    } catch (err) {
      mascotSay((err as Error).message, "error");
    } finally {
      this.updatesLoading = false;
    }
  }

  private async checkAll() {
    try {
      await api.gameUpdatesCheck();
      this.startSweepPoll();
      void this.loadUpdates();
    } catch (err) {
      mascotSay((err as Error).message, "error");
    }
  }

  private startSweepPoll() {
    if (this.sweepTimer != null) return;
    this.sweepTimer = window.setInterval(() => void this.loadUpdates(), 2500);
  }

  private stopSweepPoll() {
    if (this.sweepTimer != null) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = null;
    }
  }

  private async acknowledge(id: number) {
    try {
      await api.acknowledgeGameRemote(id);
      void this.loadUpdates();
      this.dispatchEvent(new CustomEvent("imported", { bubbles: true, composed: true }));
    } catch (err) {
      mascotSay((err as Error).message, "error");
    }
  }

  /* --------------------------------------------------------------- render */

  render() {
    if (this.site === "updates") return this.renderUpdates();
    if (this.sitesError) return html`<div class="empty">${this.sitesError}</div>`;
    if (!this.sites) return html`<div class="empty"><md-circular-progress indeterminate></md-circular-progress></div>`;
    const acct = this.account;
    if (!acct?.signedIn) return this.renderSignIn(acct);
    return html`
      ${this.renderBar(acct)}
      ${this.renderChips()}
      ${this.renderGrid()}
      ${this.detail ? this.renderDetail(this.detail) : nothing}
      ${this.shot ? html`<div class="lightbox" @click=${() => (this.shot = "")}><img src=${api.proxyURL(this.shot)} alt="" /></div>` : nothing}
    `;
  }

  private renderSignIn(acct: GameSiteAccount | null) {
    const label = acct?.label ?? this.site;
    const itch = this.site === "itch";
    return html`
      <div class="signin">
        <h3>Sign in to ${label}</h3>
        ${itch
          ? html`<p>
              itch.io only shows adult games to an account that has asked for them, and
              its login page sits behind a browser check that a server cannot pass — so
              sign in here with the session cookie from a browser where you are already
              signed in. Open itch.io, open the developer tools (F12 → Application →
              Cookies) and copy the value of the <code>itchio</code> cookie. If Launchy is
              paired and signed in to itch.io, it hands its sign-in over on its own.
            </p>
            <label>itchio cookie</label>
            <textarea .value=${this.cookie} placeholder="itchio=…  (or just the value)"
              @input=${(e: Event) => (this.cookie = (e.target as HTMLTextAreaElement).value)}></textarea>`
          : html`<p>
              F95zone hides most game threads and every download link from guests.
              Sign in with your F95zone account; the login is kept on the server and
              used only for reading the site.
            </p>
            <form @submit=${(e: Event) => { e.preventDefault(); void this.signIn(); }}>
              <label>Username</label>
              <input type="text" autocomplete="username" .value=${this.username}
                @input=${(e: Event) => (this.username = (e.target as HTMLInputElement).value)} />
              <label>Password</label>
              <input type="password" autocomplete="current-password" .value=${this.password}
                @input=${(e: Event) => (this.password = (e.target as HTMLInputElement).value)} />
              <button type="submit" hidden></button>
            </form>
            <div class="or">or, for an account with two-step verification</div>
            <label>xf_user cookie</label>
            <textarea .value=${this.cookie} placeholder="xf_user=…; xf_session=…  (or just the xf_user value)"
              @input=${(e: Event) => (this.cookie = (e.target as HTMLTextAreaElement).value)}></textarea>`}
        <div class="row">
          <button class="btn-primary" ?disabled=${this.signingIn || (!this.cookie.trim() && (itch || !this.username.trim() || !this.password))}
            @click=${() => void this.signIn()}>
            <span class="material-symbols-rounded" style="font-size:20px;">login</span>
            ${this.signingIn ? "Signing in…" : "Sign in"}
          </button>
        </div>
        ${this.signInError ? html`<div class="err">${this.signInError}</div>` : nothing}
      </div>
    `;
  }

  private renderBar(acct: GameSiteAccount) {
    return html`
      <form class="bar" @submit=${this.submit}>
        <label class="searchbox">
          <span class="material-symbols-rounded" style="font-size:19px; color:var(--oppai-text-dim);">search</span>
          <input type="search" placeholder=${`Search ${acct.label}…`} .value=${this.draft}
            @input=${(e: Event) => (this.draft = (e.target as HTMLInputElement).value)} />
        </label>
        <button class="btn-outline" type="submit" ?disabled=${this.loading}>Search</button>
        <div class="account">
          <span class="material-symbols-rounded" style="font-size:18px;">account_circle</span>
          ${acct.user || "Signed in"}
          <button class="chip ghost" type="button" @click=${() => void this.signOut()}>
            <span class="material-symbols-rounded" style="font-size:16px;">logout</span>Sign out
          </button>
        </div>
      </form>
    `;
  }

  private renderChips() {
    if (!this.sites || this.site === "updates") return nothing;
    const sorts = this.sites.sorts[this.site] ?? [];
    const active = this.sort || sorts[0]?.key || "";
    // itch.io's search has no sort, and answers every page with the same batch.
    const searching = this.site === "itch" && this.query !== "";
    return html`
      <div class="chips" role="group" aria-label="Sort">
        ${searching
          ? html`<span class="chip" aria-pressed="true">Search results</span>`
          : sorts.map((s) => html`<button class="chip" aria-pressed=${active === s.key ? "true" : "false"}
              @click=${() => { this.sort = s.key; void this.search(1); }}>${s.label}</button>`)}
        ${this.site === "itch"
          ? html`<button class="chip" style="margin-left:auto" aria-pressed=${this.sites.itchNsfw ? "true" : "false"}
              title="Ask itch.io for its adult listing" @click=${() => void this.toggleNsfw()}>
              <span class="material-symbols-rounded" style="font-size:16px;">explicit</span>Adult
            </button>`
          : nothing}
      </div>
    `;
  }

  private renderGrid() {
    if (this.error) return html`<div class="empty">${this.error}</div>`;
    if (!this.items.length) {
      return this.loading
        ? html`<div class="empty"><md-circular-progress indeterminate></md-circular-progress></div>`
        : html`<div class="empty"><span class="material-symbols-rounded" style="font-size:40px; display:block; margin-bottom:12px;">search_off</span>Nothing here.</div>`;
    }
    return html`
      <div class="grid" role="list">
        ${this.items.map((it) => html`<button class="tile" role="listitem" @click=${() => void this.open(it)}>
          <div class="tile-media">
            ${it.thumbnail
              ? html`<img loading="lazy" src=${api.proxyURL(it.thumbnail)} alt="" />`
              : html`<div class="tile-blank"><span class="material-symbols-rounded" style="font-size:40px;">sports_esports</span></div>`}
            ${it.libraryId
              ? html`<span class="badge owned"><span class="material-symbols-rounded" style="font-size:14px;">check</span>In library</span>`
              : it.webPlayable
                ? html`<span class="badge"><span class="material-symbols-rounded" style="font-size:14px;">play_arrow</span>Browser</span>`
                : nothing}
          </div>
          <div class="tile-meta">
            <div class="tile-title" title=${it.title}>${it.title}</div>
            <div class="tile-sub">${[it.developer, it.version ? `v${it.version}` : ""].filter(Boolean).join(" · ") || it.tags.join(", ")}</div>
          </div>
        </button>`)}
      </div>
      <div class="more">
        ${this.loading
          ? html`<md-circular-progress indeterminate></md-circular-progress>`
          : this.hasMore
            ? html`<button class="btn-outline" @click=${() => void this.search(this.page + 1)}>Load more</button>`
            : nothing}
      </div>
    `;
  }

  private renderDetail(it: GameSiteItem) {
    return html`
      <div class="sheet-backdrop" @click=${(e: Event) => { if (e.target === e.currentTarget) this.detail = null; }}>
        <div class="sheet" role="dialog" aria-label=${it.title}>
          <div class="sheet-head">
            <h2>${it.title}</h2>
            <button class="close" title="Close" @click=${() => (this.detail = null)}>
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <div class="sheet-sub">
            ${[it.developer, it.version ? `v${it.version}` : "", it.rating ? `★ ${it.rating.toFixed(1)}` : "", it.nsfw ? "Adult" : ""].filter(Boolean).join(" · ")}
            ${this.detailLoading ? html` · reading the page…` : nothing}
          </div>
          ${it.images.length
            ? html`<div class="shots">${it.images.map((u) => html`<button class="shot" @click=${() => (this.shot = u)}>
                <img loading="lazy" src=${api.proxyURL(u)} alt="" /></button>`)}</div>`
            : nothing}
          ${it.description ? html`<p class="desc">${it.description}</p>` : nothing}
          ${it.tags.length ? html`<div class="tags">${it.tags.map((t) => html`<span class="tag">${t}</span>`)}</div>` : nothing}
          <div class="actions">
            ${it.libraryId
              ? html`<button class="btn-primary" @click=${() => { requestOpenMedia(this, it.libraryId!); this.detail = null; }}>
                  <span class="material-symbols-rounded" style="font-size:20px;">check_circle</span>In library — open
                </button>`
              : html`<button class="btn-primary" ?disabled=${this.adding} @click=${() => void this.add()}>
                  <span class="material-symbols-rounded" style="font-size:20px;">library_add</span>
                  ${this.adding ? "Adding…" : "Add to library"}
                </button>`}
            <a class="btn-outline" href=${it.url} target="_blank" rel="noreferrer">
              <span class="material-symbols-rounded" style="font-size:20px;">open_in_new</span>Open page
            </a>
          </div>
        </div>
      </div>
    `;
  }

  private renderUpdates() {
    const u = this.updates;
    const sweep = u?.sweep;
    return html`
      <div class="sweep">
        <button class="btn-primary" ?disabled=${sweep?.running} @click=${() => void this.checkAll()}>
          <span class="material-symbols-rounded" style="font-size:20px;">update</span>
          ${sweep?.running ? `Checking ${sweep.done}/${sweep.total}…` : "Check for updates"}
        </button>
        ${sweep?.running && sweep.current ? html`<span>${sweep.current}</span>` : nothing}
        ${!sweep?.running && sweep?.lastRun
          ? html`<span>Last checked ${new Date(sweep.lastRun * 1000).toLocaleString()} · ${u?.tracked ?? 0} tracked${sweep.errors ? ` · ${sweep.errors} could not be read` : ""}</span>`
          : nothing}
      </div>
      ${this.updatesLoading && !u
        ? html`<div class="empty"><md-circular-progress indeterminate></md-circular-progress></div>`
        : !u || !u.items.length
          ? html`<div class="empty">
              <span class="material-symbols-rounded" style="font-size:40px; display:block; margin-bottom:12px;">check_circle</span>
              ${u && u.tracked ? "Everything is up to date." : "No game here came from itch.io or F95zone yet — add one from those tabs and its version will be watched."}
            </div>`
          : u.items.map((g) => html`<div class="urow">
              ${g.hasThumb
                ? html`<img src=${api.thumbURL(g.id)} alt="" />`
                : html`<div class="cover-blank"><span class="material-symbols-rounded">sports_esports</span></div>`}
              <div class="body">
                <div class="t">${g.title}</div>
                <div class="v">${g.remote.knownVersion || "unknown"} → <b>${g.remote.latestVersion}</b> on ${g.remote.label}</div>
                ${g.remote.changelog ? html`<div class="log">${g.remote.changelog}</div>` : nothing}
              </div>
              <div class="acts">
                <button class="icon-btn" title="Open in the library" @click=${() => requestOpenMedia(this, g.id)}>
                  <span class="material-symbols-rounded">sports_esports</span>
                </button>
                <a class="icon-btn" title="Open the page" href=${g.remote.url} target="_blank" rel="noreferrer">
                  <span class="material-symbols-rounded">open_in_new</span>
                </a>
                <button class="icon-btn" title="I have this version now" @click=${() => void this.acknowledge(g.id)}>
                  <span class="material-symbols-rounded">done</span>
                </button>
              </div>
            </div>`)}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oppai-game-browse": OppaiGameBrowse;
  }
}
