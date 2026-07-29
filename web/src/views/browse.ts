import { LitElement, html, css, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { iconStyles, motionStyles } from "../theme.js";
import {
  api,
  type RemoteSource,
  type SourceComment,
  type SourceFeed,
  type SourceItem,
} from "../api.js";
import { runDownload } from "../downloads.js";
import { profileUpdates } from "../ui-metrics.js";
import { mergeSourcePage } from "../source-pagination.js";
import "./add-source.js";

/**
 * Browses a remote catalogue — a 4chan board, a doujin listing — without importing
 * anything.
 *
 * Nothing here touches the library: tiles stream from the origin through the
 * server's proxy, and only Save copies an item across. That's also why every remote
 * URL goes through `api.sourceStreamURL` rather than straight into a `src` — the
 * origin never sees the browser's IP, and hotlink-guarded hosts still render.
 *
 * Some items are *containers*: a 4chan board lists threads, and a thread is a set you
 * browse into rather than a file you view (see `SourceItem.feedId`). `container` holds
 * the one we're inside; clearing it goes back to the board.
 *
 * The visual language is the library's, deliberately — the same chips, the same tiles,
 * the same empty states. This view sits inside the same shell, and a browse grid that
 * invents its own greys reads as a different application.
 */
@customElement("oppai-browse")
export class OppaiBrowse extends LitElement {
  /** Whether the signed-in user may add or remove sites. Saving a source widens the
      server's proxy allowlist, so the endpoints are admin-only; the buttons are
      hidden rather than shown-and-refused. */
  @property({ type: Boolean, attribute: "can-add-sites" }) canAddSites = false;

  @state() private sources: RemoteSource[] = [];
  @state() private sourceId = "";

  /** Sources whose favicon didn't load, drawn as a monogram instead. A tab with a
      broken image in it reads as a bug, and some of these sites have no icon at all. */
  @state() private iconFailed = new Set<string>();
  @state() private addingSite = false;

  /** The feed chosen from the chips. `container` is the thread opened from it, if any. */
  @state() private feedId = "";
  @state() private container: SourceItem | null = null;
  @state() private sort = "";

  /** The committed search term — what was actually fetched. The box holds a draft. */
  @state() private query = "";
  @state() private draft = "";

  @state() private items: SourceItem[] = [];
  @state() private cursor = "";
  @state() private loading = false;
  @state() private loadingSources = true;
  @state() private error = "";

  /** The item open in the preview overlay, if any. */
  @state() private active: SourceItem | null = null;
  @state() private pages: string[] = [];
  @state() private pageAt = 0;
  @state() private saving = false;
  @state() private toast = "";

  /** The item whose thread is open in the comments panel, if any. */
  @state() private commentsFor: SourceItem | null = null;
  @state() private comments: SourceComment[] = [];
  @state() private commentsLoading = false;
  @state() private commentsError = "";
  @state() private commentQuery = "";
  @state() private threadQuery = "";
  @state() private threadDraft = "";

  /**
   * Stamps each browse request so a late reply from a board we've left can't land in
   * the grid of the board we're on. Not reactive — nothing renders it. See `load`.
   */
  private reqId = 0;
  private pageObserver?: IntersectionObserver;
  private pageSentinel?: Element;

  static styles = [
    iconStyles,
    motionStyles,
    css`
      :host {
        display: block;
        color: var(--oppai-text);
      }

      /* Header — mirrors the library's grid head. */
      .head {
        display: flex;
        align-items: baseline;
        gap: 12px;
        margin-bottom: 6px;
      }
      .title {
        font-size: 26px;
        font-weight: 400;
        margin: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .count {
        font-size: 13px;
        color: var(--oppai-text-muted);
        white-space: nowrap;
      }
      .head-actions {
        margin-left: auto;
        display: flex;
        gap: 8px;
      }

      /* Chips — same shape as the library's filter chips. */
      .chips {
        display: flex;
        gap: 8px;
        margin: 18px 0 24px;
        flex-wrap: wrap;
      }
      .chips.tight {
        margin: 0 0 18px;
      }
      .chip {
        height: 36px;
        padding: 0 16px;
        border-radius: 18px;
        font-size: 13px;
        font-weight: 500;
        font-family: inherit;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        background: transparent;
        color: var(--oppai-text-dim);
        border: 1px solid var(--oppai-border-strong);
        transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
      }
      .chip:hover {
        background: var(--oppai-nav-hover);
      }
      .chip[aria-pressed="true"] {
        background: var(--oppai-accent);
        color: var(--oppai-on-accent);
        border-color: var(--oppai-accent);
      }
      .chip:disabled {
        opacity: 0.5;
        cursor: default;
      }
      .chip.ghost {
        color: var(--oppai-primary-bright);
        border-color: var(--oppai-border-strong);
      }
      /* Site strip — one tab per source, identified by its favicon.
         Scrolls rather than wraps: adding a tenth site must not push the grid down
         the page. The scrollbar is hidden because the tabs are wide enough to drag
         and a visible bar under six icons looks like a mistake. */
      .site-tabs {
        display: flex;
        gap: 6px;
        margin: 16px 0 18px;
        overflow-x: auto;
        scrollbar-width: none;
        padding-bottom: 2px;
      }
      .site-tabs::-webkit-scrollbar {
        display: none;
      }
      .site-tab {
        flex: 0 0 auto;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 5px;
        width: 76px;
        padding: 9px 4px 7px;
        border-radius: 14px;
        border: 1px solid transparent;
        background: transparent;
        color: var(--oppai-text-dim);
        font: inherit;
        cursor: pointer;
        transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease;
      }
      .site-tab:hover {
        background: var(--oppai-nav-hover);
      }
      .site-tab.on {
        background: var(--oppai-surface-2);
        border-color: var(--oppai-border-strong);
        color: var(--oppai-text);
      }
      .site-icon,
      .site-mono {
        width: 26px;
        height: 26px;
        border-radius: 7px;
        object-fit: contain;
        background: var(--oppai-surface-2);
      }
      .site-mono {
        display: grid;
        place-items: center;
        font-size: 14px;
        font-weight: 600;
        color: var(--oppai-text-dim);
      }
      .site-name {
        font-size: 11px;
        line-height: 1.2;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .site-tab.add {
        color: var(--oppai-primary-bright);
      }
      .feed-select {
        min-width: 190px;
        height: 40px;
        padding: 0 38px 0 14px;
        border-radius: 12px;
        border: 1px solid var(--oppai-border-strong);
        background: var(--oppai-surface-2);
        color: var(--oppai-text);
        font: inherit;
        cursor: pointer;
      }
      .thread-tools {
        display: flex;
        gap: 10px;
        align-items: center;
        margin: 14px 0 22px;
        flex-wrap: wrap;
      }
      .thread-tools .searchbox { max-width: 420px; }
      .add-thread { margin-left: auto; margin-top: 0; margin-bottom: 0; }

      /* Search */
      .searchbar {
        display: flex;
        gap: 10px;
        align-items: center;
        margin-bottom: 20px;
      }
      .searchbox {
        flex: 1;
        max-width: 520px;
        height: 44px;
        background: var(--oppai-surface-2);
        border-radius: 22px;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 0 16px;
      }
      .searchbox input {
        flex: 1;
        background: none;
        border: none;
        outline: none;
        color: var(--oppai-text);
        font: inherit;
        font-size: 14px;
      }
      .searchbox input::placeholder {
        color: var(--oppai-text-muted);
      }

      /* Grid + tiles — the library's tile, with the remote item's badges. */
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 22px;
      }
      .tile {
        cursor: pointer;
        border: none;
        padding: 0;
        background: none;
        text-align: left;
        font: inherit;
        color: inherit;
      }
      .tile-media {
        position: relative;
        width: 100%;
        aspect-ratio: 3 / 4;
        border-radius: 16px;
        overflow: hidden;
        background: var(--oppai-surface-2);
        transition: transform 0.28s var(--oppai-ease-emphasized),
          box-shadow 0.28s var(--oppai-ease-emphasized);
      }
      .tile:hover .tile-media {
        transform: translateY(-4px) scale(1.02);
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.4);
      }
      .tile:active .tile-media {
        transform: translateY(-1px) scale(0.99);
      }
      .tile-media img {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.4s var(--oppai-ease-emphasized);
      }
      .tile:hover .tile-media img {
        transform: scale(1.06);
      }
      .tile-blank {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        color: var(--oppai-text-muted);
      }
      .tile-stat {
        position: absolute;
        bottom: 6px;
        right: 8px;
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 11px;
        font-weight: 600;
        color: #fff;
        background: rgba(0, 0, 0, 0.5);
        padding: 2px 6px;
        border-radius: 6px;
      }
      .play {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        color: #fff;
        text-shadow: 0 0 8px rgba(0, 0, 0, 0.8);
        opacity: 0.85;
      }
      .tile-meta {
        padding: 10px 2px 0;
      }
      .tile-title {
        font-size: 13px;
        font-weight: 500;
        color: var(--oppai-text);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .tile-tag {
        font-size: 12px;
        color: var(--oppai-text-muted);
        margin-top: 2px;
      }

      .empty {
        text-align: center;
        padding: 80px 0;
        color: var(--oppai-text-muted);
      }
      .more {
        display: grid;
        place-items: center;
        padding: 28px;
      }
      .source-notice, .feed-error {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        margin: 0 0 18px;
        padding: 11px 13px;
        border: 1px solid var(--oppai-border-strong);
        border-radius: 12px;
        color: var(--oppai-text-dim);
        background: var(--oppai-surface-2);
        font-size: 13px;
        line-height: 1.45;
      }
      .source-notice.warning { border-color: color-mix(in srgb, var(--oppai-primary) 50%, var(--oppai-border-strong)); }
      .source-notice.auth { border-color: color-mix(in srgb, #ffb4ab 55%, var(--oppai-border-strong)); }
      .feed-error { color: var(--oppai-error, #ffb4ab); }

      /* Preview overlay */
      .overlay {
        position: fixed;
        inset: 0;
        z-index: 50;
        background: rgba(0, 0, 0, 0.92);
        display: flex;
        flex-direction: column;
        animation: oppai-fade-in 0.2s var(--oppai-ease-standard) both;
      }
      .obar {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        color: #fff;
      }
      .obar .t {
        flex: 1;
        font-size: 14px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .obtn {
        background: rgba(255, 255, 255, 0.12);
        color: #fff;
        border: none;
        border-radius: 20px;
        height: 36px;
        padding: 0 16px;
        font: inherit;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .obtn:hover {
        background: rgba(255, 255, 255, 0.2);
      }
      .obtn:disabled {
        opacity: 0.5;
        cursor: default;
      }
      .ostage {
        flex: 1;
        display: grid;
        place-items: center;
        overflow: auto;
        padding: 8px;
        min-height: 0;
      }
      .ostage img,
      .ostage video {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }
      .pager {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 16px;
        color: #fff;
        padding: 12px;
        font-size: 13px;
      }

      /* "Up next" — the rest of the feed as a scrubbable strip under the player.

         The rigid flex basis and the top padding are both about the scrubber. The
         player's controls are drawn inside the video along its bottom edge, so the
         strip's top edge is the only thing between them and the pointer — and as a
         shrinkable flex item the strip could be squeezed right up against the video on a
         short viewport. It keeps its size; the stage gives way instead. */
      .upnext {
        flex: 0 0 auto;
        padding: 24px 16px 14px;
        color: #fff;
      }
      .upnext-label {
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.4px;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.7);
        margin-bottom: 8px;
      }
      .strip {
        display: flex;
        gap: 10px;
        overflow-x: auto;
        scroll-snap-type: x proximity;
        padding-bottom: 6px;
        /* A thin rail: this is a filmstrip, not a second grid. */
        scrollbar-width: thin;
        scrollbar-color: rgba(255, 255, 255, 0.35) transparent;
      }
      .strip::-webkit-scrollbar {
        height: 6px;
      }
      .strip::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.35);
        border-radius: 3px;
      }
      .strip-item {
        position: relative;
        flex: 0 0 auto;
        width: 128px;
        aspect-ratio: 16 / 10;
        border: 2px solid transparent;
        border-radius: 10px;
        overflow: hidden;
        padding: 0;
        background: var(--oppai-surface-2);
        cursor: pointer;
        scroll-snap-align: start;
        transition: transform 0.18s var(--oppai-ease-spring), border-color 0.18s ease;
      }
      .strip-item:hover {
        transform: scale(1.03);
      }
      .strip-item.on {
        border-color: var(--oppai-accent);
      }
      .strip-item img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .strip-play {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        font-size: 28px;
        color: #fff;
        text-shadow: 0 0 8px rgba(0, 0, 0, 0.8);
      }
      .strip-next {
        position: absolute;
        left: 4px;
        bottom: 4px;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.3px;
        background: var(--oppai-accent);
        color: var(--oppai-on-accent);
        padding: 1px 6px;
        border-radius: 6px;
      }
      /* Keep landscape playback unobstructed on phones. Items stay in the feed and
         remain preloaded/navigable; portrait restores the visible queue. */
      @media (orientation: landscape) and (max-height: 600px) {
        .upnext { display: none; }
        .obar { padding-left: max(16px, env(safe-area-inset-left)); padding-right: max(16px, env(safe-area-inset-right)); }
        .pager { padding-bottom: max(12px, env(safe-area-inset-bottom)); }
      }

      /* Comments — the thread the file was posted in. */
      .comments {
        justify-content: flex-end;
        align-items: stretch;
        flex-direction: row;
        z-index: 55;
      }
      .cpanel {
        width: min(460px, 100%);
        background: var(--oppai-surface);
        display: flex;
        flex-direction: column;
        box-shadow: -12px 0 40px rgba(0, 0, 0, 0.5);
        animation: oppai-fade-in 0.2s var(--oppai-ease-standard) both;
      }
      .chead {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 14px 16px;
        border-bottom: 1px solid var(--oppai-border-strong);
      }
      .chead .t {
        flex: 1;
        font-size: 14px;
        font-weight: 500;
        color: var(--oppai-text);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .chead .obtn {
        background: var(--oppai-surface-2);
        color: var(--oppai-text);
      }
      .clist {
        flex: 1;
        overflow-y: auto;
        padding: 8px 12px 20px;
      }
      .cempty {
        flex: 1;
        display: grid;
        place-items: center;
        color: var(--oppai-text-muted);
        font-size: 14px;
        padding: 40px 20px;
        text-align: center;
      }
      .cpost {
        border-radius: 12px;
        padding: 10px 12px;
        margin-top: 8px;
        background: var(--oppai-surface-2);
      }
      .cpost.op {
        background: var(--oppai-nav-hover);
      }
      /* The post the open file came from. Without this the list is a wall of
         anonymous text with no way to find your place in it. */
      .cpost.here {
        outline: 2px solid var(--oppai-accent);
      }
      .cmeta {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
        font-size: 11px;
        color: var(--oppai-text-muted);
        margin-bottom: 6px;
      }
      .cname {
        font-weight: 600;
        color: var(--oppai-primary-bright);
      }
      .cbadge {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.3px;
        background: var(--oppai-surface);
        color: var(--oppai-text-dim);
        padding: 1px 6px;
        border-radius: 6px;
      }
      .cbadge.here-badge {
        background: var(--oppai-accent);
        color: var(--oppai-on-accent);
      }
      .csub {
        font-size: 13px;
        font-weight: 600;
        color: var(--oppai-text);
        margin-bottom: 4px;
      }
      /* A post's own upload. It is a button, not a link: the file is already something
         this app can play, and sending a .webm out to a raw browser tab was throwing
         away the viewer, the thread it belongs to, and the way back. */
      .cattach {
        position: relative;
        display: block;
        padding: 0;
        border: none;
        background: none;
        cursor: pointer;
        margin: 4px 0 6px;
        border-radius: 8px;
        line-height: 0;
        transition: transform 0.18s var(--oppai-ease-spring);
      }
      .cattach:hover {
        transform: scale(1.02);
      }
      .cthumb {
        max-width: 140px;
        border-radius: 8px;
        display: block;
      }
      .cplay {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        font-size: 34px;
        color: #fff;
        text-shadow: 0 0 8px rgba(0, 0, 0, 0.8);
        pointer-events: none;
      }
      .ctext {
        font-size: 13px;
        line-height: 1.5;
        color: var(--oppai-text-dim);
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }
      /* Greentext is green; a quote points at another post. Flattening both into plain
         text would lose what the post is actually saying. */
      .cgreen {
        color: #789922;
      }
      .cquote {
        color: var(--oppai-primary-bright);
      }
      button.cquote {
        border: 0;
        padding: 0;
        background: none;
        font: inherit;
        cursor: pointer;
        text-decoration: underline;
        text-underline-offset: 2px;
      }
      .comment-search { padding: 10px 12px 2px; }
      .comment-search .searchbox { max-width: none; height: 40px; }

      .toast {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--oppai-surface-2);
        color: var(--oppai-text);
        padding: 12px 20px;
        border-radius: 12px;
        z-index: 60;
        box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
        animation: oppai-fade-in-up 0.28s var(--oppai-ease-emphasized) both;
      }
      @media (max-width: 600px) {
        .head { align-items: flex-start; flex-wrap: wrap; }
        .head-actions { width: 100%; margin-left: 0; flex-wrap: wrap; }
        .cthumb { width: min(240px, 72vw); max-width: 100%; }
        .thread-tools { align-items: stretch; }
        .thread-tools .searchbox { max-width: none; width: 100%; }
        .add-thread { margin-left: 0; width: 100%; }
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    profileUpdates(this, "browse");
    if (typeof IntersectionObserver !== "undefined") {
      this.pageObserver = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void this.load(false);
      }, { rootMargin: "500px 0px" });
    }
    this.loadSources();
  }

  disconnectedCallback() {
    this.pageObserver?.disconnect();
    super.disconnectedCallback();
  }

  protected updated(changed: PropertyValues<this>) {
    super.updated(changed);
    const didChange = (key: string) => (changed as unknown as Map<string, unknown>).has(key);
    if (didChange("active") || didChange("items")) this.centerCurrentInQueue();
    if (["active", "items", "sourceId", "feedId", "container"].some(didChange)) {
      this.announceFrame();
    }
    const sentinel = this.renderRoot.querySelector("[data-page-sentinel]");
    if (sentinel === this.pageSentinel) return;
    if (this.pageSentinel) this.pageObserver?.unobserve(this.pageSentinel);
    this.pageSentinel = sentinel ?? undefined;
    if (sentinel) this.pageObserver?.observe(sentinel);
  }

  /** Tell the shell what the remote catalogue currently has in frame for Libby. */
  private announceFrame() {
    const source = this.source?.name ?? "Browse";
    const place = this.container?.title ?? this.feed?.label;
    this.dispatchEvent(new CustomEvent("browse-frame-changed", {
      detail: {
        items: this.items.slice(0, 16),
        focused: this.active,
        where: place ? `${source} · ${place}` : source,
      },
      bubbles: true,
      composed: true,
    }));
  }

  /** Start the video strip at the open item, with the surrounding feed visible. */
  private centerCurrentInQueue() {
    const strip = this.renderRoot.querySelector<HTMLElement>(".upnext .strip");
    const current = strip?.querySelector<HTMLElement>(".strip-item.on");
    if (!strip || !current) return;
    strip.scrollLeft = Math.max(0, current.offsetLeft - (strip.clientWidth - current.offsetWidth) / 2);
  }

  private get source(): RemoteSource | undefined {
    return this.sources.find((s) => s.id === this.sourceId);
  }
  private get feed(): SourceFeed | undefined {
    return this.source?.feeds.find((f) => f.id === this.feedId);
  }
  /** Inside a thread there is no chip selected, so search and sort don't apply. */
  private get isSearch(): boolean {
    return !this.container && this.feed?.query === true;
  }
  private get searchTarget(): string {
    const name = this.source?.name ?? "";
    const label = this.feed?.label.trim() ?? "";
    return label && label.toLowerCase() !== "search" ? `${name} ${label.toLowerCase()}` : name;
  }
  /** The feed actually being fetched: the thread if we're in one, else the chip. */
  private get activeFeed(): string {
    return this.container?.feedId ?? this.feedId;
  }
  private get isFourChan(): boolean {
    return this.sourceId === "4chan";
  }

  private async loadSources() {
    try {
      const { sources } = await api.sources();
      this.sources = sources;
      // Keep the selection across a reload where possible: this runs again after a
      // site is added or removed, and snapping back to the first source every time
      // would throw the user out of whatever they were looking at.
      const keep = sources.find((s) => s.id === this.sourceId);
      const pick = keep ?? sources[0];
      if (pick) {
        this.sourceId = pick.id;
        if (!keep) this.feedId = pick.feeds[0]?.id ?? "";
      } else {
        this.sourceId = "";
        this.feedId = "";
      }
    } catch (e) {
      this.error = e instanceof Error ? e.message : "Couldn't reach the server";
    } finally {
      this.loadingSources = false;
    }
    if (this.sourceId) void this.load(true);
  }

  private async load(reset: boolean) {
    if (!this.sourceId) return;
    // A declarative YAML adapter has no generic way to perform a login safely. It
    // may describe a required login, but it must not fetch around it and hope the
    // upstream happens to answer. A purpose-built authenticated adapter can expose
    // a public/optional policy once its own credential flow is actually available.
    if (this.source?.authentication === "required") return;
    // Paging is one-at-a-time and stops at the end. A *reset* is never refused: it
    // means the user picked a different board, and that has to win over whatever is
    // in flight — see `req` below.
    if (!reset && (this.loading || !this.cursor)) return;
    // A search feed with no term would 400 upstream; wait for one instead.
    if (this.isSearch && !this.query) return;

    // Every request is stamped, and only the newest one is allowed to land.
    //
    // This is what stopped one board's threads appearing under another's. Switching
    // feeds fires a fresh request while the previous board's is still in flight, and
    // whichever *returns* last used to win — so /h/'s reply would overwrite /gif/'s
    // grid, or worse, land as `reset` and repopulate the new board with the old
    // board's threads. The tiles came from the right server and the wrong place.
    const req = ++this.reqId;
    this.loading = true;
    try {
      const page = await api.browseSource(this.sourceId, {
        feed: this.activeFeed,
        cursor: reset ? undefined : this.cursor,
        // A thread is its own feed; the board's search term means nothing inside it.
        q: this.container ? undefined : this.query || undefined,
        sort: this.container ? undefined : this.sort || undefined,
      });
      if (req !== this.reqId) return; // superseded — these tiles belong to a feed we've left
      const merged = mergeSourcePage(this.items, page, reset ? "" : this.cursor, reset);
      this.items = merged.items;
      this.cursor = merged.cursor;
      this.error = merged.error;
    } catch (e) {
      if (req !== this.reqId) return; // a feed we've left failing is not this feed's error
      this.error = e instanceof Error ? e.message : "Couldn't load that feed";
    } finally {
      if (req === this.reqId) this.loading = false;
    }
  }

  /** Restarts the feed from page one. */
  private reset() {
    this.items = [];
    this.cursor = "";
    this.error = "";
    void this.load(true);
  }

  /**
   * The site strip: one tab per source, identified by its own favicon, plus a button
   * to add another.
   *
   * A favicon rather than a name because that is how people recognise a website, and
   * because the names are long and the strip is horizontal. The name is still there —
   * as the label under the icon and in the tooltip — so a site whose icon fails to
   * load, or whose icon is indistinguishable from another's, is never a mystery. The
   * icon comes from the server, not the site (see api.sourceIconURL), and falls back
   * to a monogram; a broken image would otherwise leave a hole where the tab is.
   *
   * The strip scrolls horizontally instead of wrapping, so adding a tenth site never
   * pushes the grid down the page.
   */
  private renderSiteTabs() {
    return html`
      <div class="site-tabs" role="tablist" aria-label="Sites">
        ${this.sources.map((s) => {
          const on = s.id === this.sourceId;
          const failed = this.iconFailed.has(s.id);
          return html`
            <button
              class="site-tab ${on ? "on" : ""}"
              role="tab"
              aria-selected=${on}
              title=${s.host ? `${s.name} — ${s.host}` : s.name}
              @click=${() => this.pickSource(s.id)}
            >
              ${failed
                ? html`<span class="site-mono" aria-hidden="true">${s.name.slice(0, 1).toUpperCase()}</span>`
                : html`<img
                    class="site-icon"
                    src=${api.sourceIconURL(s.id)}
                    alt=""
                    loading="lazy"
                    @error=${() => this.markIconFailed(s.id)}
                  />`}
              <span class="site-name">${s.name}</span>
            </button>
          `;
        })}
        ${this.canAddSites
          ? html`<button
              class="site-tab add"
              title="Add another site to browse"
              aria-label="Add a site"
              @click=${() => (this.addingSite = true)}
            >
              <span class="material-symbols-rounded">add</span>
              <span class="site-name">Add</span>
            </button>`
          : nothing}
      </div>
      ${this.removableSource
        ? html`<div class="chips tight">
            <button class="chip" @click=${this.removeCurrentSource}>
              <span class="material-symbols-rounded" style="font-size:18px;">delete</span>
              Remove ${this.removableSource.name}
            </button>
          </div>`
        : nothing}
      ${this.addingSite
        ? html`<oppai-add-source
            @close=${() => (this.addingSite = false)}
            @added=${this.onSiteAdded}
          ></oppai-add-source>`
        : nothing}
    `;
  }

  private renderAccessNotices() {
    const source = this.source;
    if (!source) return nothing;
    const auth = source.authentication ?? "unknown";
    const authText = auth === "required"
      ? "Authentication is required. OppaiLib will not bypass the site's access controls."
      : auth === "optional"
        ? "Authentication is optional."
        : auth === "unknown"
          ? "This older adapter did not declare its authentication requirements."
          : "";
    return html`
      ${authText || source.authNote
        ? html`<div class="source-notice ${auth === "required" || auth === "unknown" ? "auth" : ""}">
            <span class="material-symbols-rounded" aria-hidden="true">${auth === "none" ? "public" : "lock"}</span>
            <span><strong>${authText}</strong>${source.authNote ? html` ${source.authNote}` : nothing}</span>
          </div>`
        : nothing}
      ${source.contentWarning
        ? html`<div class="source-notice warning">
            <span class="material-symbols-rounded" aria-hidden="true">warning</span>
            <span><strong>Content notice.</strong> ${source.contentWarning}</span>
          </div>`
        : nothing}
    `;
  }

  /** The current source, if it is one that was added from the UI and so can be
      removed again. A built-in is overridden rather than deleted. */
  private get removableSource(): RemoteSource | undefined {
    if (!this.canAddSites) return undefined;
    const s = this.source;
    return s?.userAdded ? s : undefined;
  }

  private markIconFailed(id: string) {
    // Lit only re-renders on an assignment it can see, so the Set is replaced rather
    // than mutated.
    this.iconFailed = new Set(this.iconFailed).add(id);
  }

  private onSiteAdded = async (e: Event) => {
    const added = (e as CustomEvent<{ id: string; name: string }>).detail;
    this.addingSite = false;
    await this.loadSources();
    if (added?.id) this.pickSource(added.id);
    this.toast = `${added?.name ?? "Site"} added.`;
  };

  private removeCurrentSource = async () => {
    const s = this.removableSource;
    if (!s) return;
    try {
      await api.deleteSource(s.id);
      this.toast = `${s.name} removed.`;
      // The removed source may have been shadowing a built-in of the same id, which
      // comes back on reload — so re-read the list rather than splicing it out here.
      this.sourceId = "";
      await this.loadSources();
    } catch (err) {
      this.error = (err as Error).message;
    }
  };

  private pickSource(id: string) {
    if (id === this.sourceId) return;
    this.sourceId = id;
    this.feedId = this.sources.find((s) => s.id === id)?.feeds[0]?.id ?? "";
    this.container = null;
    this.sort = "";
    this.query = "";
    this.draft = "";
    this.reset();
  }

  private pickFeed(id: string) {
    if (id === this.feedId && !this.container) return;
    this.feedId = id;
    this.container = null;
    // Each feed carries its own orderings; the previous feed's sort is meaningless
    // here, so fall back to the new feed's default.
    this.sort = "";
    if (this.source?.feeds.find((f) => f.id === id)?.query !== true) {
      this.query = "";
      this.draft = "";
    }
    this.reset();
  }

  private addThread(e: Event) {
    e.preventDefault();
    const raw = this.threadDraft.trim();
	const boardOnly = raw.match(/^(?:https?:\/\/)?(?:boards\.4chan\.org\/)?\/?([a-z0-9]+)\/?$/i);
	if (boardOnly) {
	  this.threadDraft = "";
	  this.pickFeed(boardOnly[1].toLowerCase());
	  return;
	}
    const match = raw.match(/(?:boards\.4chan\.org\/)?([a-z0-9]+)\/(?:thread\/)?(\d+)/i)
      ?? raw.match(/^\/?([a-z0-9]+):t?(\d+)$/i);
    if (!match) {
      this.showToast("Enter a board such as /b/, or a 4chan thread URL");
      return;
    }
    const board = match[1].toLowerCase();
    const no = match[2];
    const threadId = `${board}:t${no}`;
    if (this.source?.feeds.some((f) => f.id === board)) this.feedId = board;
    this.threadDraft = "";
    this.openContainer({
      id: threadId,
      title: `/${board}/ thread No.${no}`,
      kind: "thread",
      thumbUrl: "",
      feedId: threadId,
      threadId,
    });
  }

  private pickSort(id: string) {
    if (id === this.sort) return;
    this.sort = id;
    this.reset();
  }

  /** Opens a container — a thread — as a feed of its own. */
  private openContainer(item: SourceItem) {
    this.container = item;
    this.threadQuery = "";
    this.reset();
  }

  private leaveContainer = () => {
    this.container = null;
    this.reset();
  };

  // Committing on submit, not on every keystroke: each commit is a request to
  // someone else's site.
  private submitSearch(e: Event) {
    e.preventDefault();
    this.query = this.draft.trim();
    this.container = null;
    this.reset();
  }

  private async open(item: SourceItem) {
    this.active = item;
    this.pages = [];
    this.pageAt = 0;
    if (item.kind !== "comic") return;
    try {
      const { pages } = await api.sourcePages(this.sourceId, item.id);
      // A slow gallery can resolve after the user has already closed it or opened
      // another; don't shove its pages into whatever is on screen now.
      if (this.active?.id !== item.id) return;
      this.pages = pages;
      this.warmPages(0);
    } catch (e) {
      if (this.active?.id !== item.id) return;
      this.error = e instanceof Error ? e.message : "Couldn't open that comic";
      this.active = null;
    }
  }

  /**
   * Pulls the pages around `from` into the browser cache so a page turn is instant.
   *
   * Opening a comic used to show a spinner, then fetch page 1, and then fetch page 2
   * only once you asked for it — every turn paying a full round trip to the origin
   * through our proxy. The pages are immutable and already served with a cache
   * header, so fetching the next couple ahead of time costs nothing but a little
   * bandwidth and removes the wait entirely. The window is small on purpose: warming
   * a 200-page gallery on open would hammer the site we're being polite to.
   */
  private warmPages(from: number) {
    for (let n = from; n < Math.min(from + PAGE_LOOKAHEAD, this.pages.length); n++) {
      new Image().src = api.sourceStreamURL(this.pages[n]);
    }
  }

  private goPage(n: number) {
    const next = Math.min(Math.max(n, 0), this.pages.length - 1);
    if (next === this.pageAt) return;
    this.pageAt = next;
    this.warmPages(next + 1);
  }

  private close = () => {
    this.active = null;
    this.pages = [];
  };

  // ── comments ───────────────────────────────────────────────────────────
  // The conversation an item was posted in. On 4chan the thread *is* the context —
  // who posted what, what they were replying to, and the running commentary that a
  // grid of files throws away.

  private async openComments(item: SourceItem) {
    const thread = item.threadId;
    if (!thread) return;
    this.commentsFor = item;
    this.comments = [];
    this.commentsError = "";
    this.commentQuery = "";
    this.commentsLoading = true;
    try {
      const { comments } = await api.sourceComments(this.sourceId, thread);
      if (this.commentsFor?.id !== item.id) return; // superseded
      this.comments = comments;
    } catch (e) {
      if (this.commentsFor?.id !== item.id) return;
      this.commentsError = e instanceof Error ? e.message : "Couldn't load the thread";
    } finally {
      if (this.commentsFor?.id === item.id) this.commentsLoading = false;
    }
  }

  private closeComments = () => {
    this.commentsFor = null;
    this.comments = [];
    this.commentsError = "";
  };

  /** Saves one item, or — from the thread header — the whole thread as a comic. */
  private save(item: SourceItem | null) {
    if (!item || this.saving) return;
    // A thread's payload is its run of images, which only the server can resolve; it
    // lands in the library as a comic. So does a gallery. Everything else is one file.
    const multiPage = item.kind === "comic" || item.kind === "thread";
    this.saving = true;
    runDownload(item.title || "Source download", async (report) => {
      try {
        report(0.08);
        await api.saveFromSource(this.sourceId, {
          itemId: multiPage ? item.id : undefined,
          mediaUrl: multiPage ? undefined : item.mediaUrl,
          pageUrl: item.pageUrl,
          title: item.title,
          kind: multiPage ? "comic" : item.kind,
          tags: item.tags,
        });
        report(1);
        this.dispatchEvent(new CustomEvent("imported", { bubbles: true, composed: true }));
      } finally {
        this.saving = false;
      }
    });
    this.showToast(item.kind === "thread" ? "Downloading thread in background" : "Downloading in background");
  }

  private showToast(msg: string) {
    this.toast = msg;
    setTimeout(() => {
      this.toast = "";
    }, 2600);
  }

  private renderTile(item: SourceItem, index: number) {
    const isThread = item.kind === "thread";
    const stat = isThread
      ? `${item.count ?? 0}`
      : item.width && item.height
        ? `${item.width}×${item.height}`
        : "";
    return html`
      <button
        class="tile anim-rise"
        style="animation-delay:${Math.min(index, 12) * 45}ms;"
        @click=${() => (isThread ? this.openContainer(item) : this.open(item))}
        title=${item.title}
      >
        <div class="tile-media">
          ${item.thumbUrl
            ? html`<img src=${api.sourceStreamURL(item.thumbUrl)} loading="lazy" alt=${item.title} />`
            : html`<div class="tile-blank">
                <span class="material-symbols-rounded" style="font-size:36px;">forum</span>
              </div>`}
          ${item.kind === "video"
            ? html`<span class="play material-symbols-rounded" style="font-size:44px;">play_circle</span>`
            : nothing}
          ${stat
            ? html`<span class="tile-stat">
                ${isThread
                  ? html`<span class="material-symbols-rounded" style="font-size:13px;">image</span>`
                  : nothing}
                ${stat}
              </span>`
            : nothing}
        </div>
        <div class="tile-meta">
          <div class="tile-title">${item.title}</div>
          <div class="tile-tag">
            ${isThread ? "Thread" : item.kind === "comic" ? "Gallery" : item.kind}
          </div>
        </div>
      </button>
    `;
  }

  private renderOverlay(item: SourceItem) {
    const isComic = item.kind === "comic";
    const page = this.pages[this.pageAt];
    return html`
      <div class="overlay" @click=${(e: Event) => { if (e.target === e.currentTarget) this.close(); }}>
        <div class="obar">
          <button class="obtn" @click=${this.close}>
            <span class="material-symbols-rounded" style="font-size:18px;">arrow_back</span>Back
          </button>
          <span class="t">${item.title}</span>
          ${item.threadId
            ? html`<button class="obtn" @click=${() => this.openComments(item)}>
                <span class="material-symbols-rounded" style="font-size:18px;">forum</span>Comments
              </button>`
            : nothing}
          ${item.pageUrl
            ? html`<a href=${item.pageUrl} target="_blank" rel="noopener noreferrer">
                <button class="obtn">
                  <span class="material-symbols-rounded" style="font-size:18px;">open_in_new</span>Source
                </button>
              </a>`
            : nothing}
          <button class="obtn" ?disabled=${this.saving} @click=${() => this.save(item)}>
            <span class="material-symbols-rounded" style="font-size:18px;">download</span>
            ${this.saving ? "Saving…" : "Save to library"}
          </button>
        </div>

        <div class="ostage">
          ${isComic
            ? page
              ? html`<img src=${api.sourceStreamURL(page)} alt="Page ${this.pageAt + 1}" />`
              : html`<md-circular-progress indeterminate></md-circular-progress>`
            : item.kind === "video"
              ? html`<video
                  src=${api.sourceStreamURL(item.mediaUrl ?? "")}
                  controls
                  autoplay
                  loop
                  playsinline
                  preload="metadata"
                ></video>`
              : html`<img src=${api.sourceStreamURL(item.mediaUrl ?? item.thumbUrl)} alt=${item.title} />`}
        </div>

        ${item.kind === "video" || item.kind === "image" ? this.renderUpNext(item) : nothing}

        ${isComic && this.pages.length
          ? html`
              <div class="pager">
                <button
                  class="obtn"
                  ?disabled=${this.pageAt === 0}
                  @click=${() => this.goPage(this.pageAt - 1)}
                >
                  <span class="material-symbols-rounded" style="font-size:18px;">chevron_left</span>
                </button>
                <span>${this.pageAt + 1} / ${this.pages.length}</span>
                <button
                  class="obtn"
                  ?disabled=${this.pageAt >= this.pages.length - 1}
                  @click=${() => this.goPage(this.pageAt + 1)}
                >
                  <span class="material-symbols-rounded" style="font-size:18px;">chevron_right</span>
                </button>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  /**
   * The "up next" carousel under an open video or image: nearby visual items from the
   * feed as a strip of thumbnails you can scrub through and jump from.
   *
   * The point is to answer "what's after this?" without leaving the video — the same
   * question the grid answers, asked from inside the player. Containers are left out:
   * a thread isn't something the viewer can jump to.
   */
  private renderUpNext(current: SourceItem) {
	// A video opened from a comment can be absent from the board-level listing (which
	// contains threads). Put it into the visible video timeline explicitly, then add
	// the other videos from the current feed without duplicates.
	const feed = this.items.filter((i) => i.kind === "video" || i.kind === "image");
	if (!feed.some((i) => i.id === current.id)) feed.unshift(current);
    if (feed.length < 2) return nothing;
    const at = feed.findIndex((i) => i.id === current.id);
    return html`
      <div class="upnext">
        <div class="upnext-label">Videos & images</div>
        <div class="strip">
          ${feed.map(
            (i, n) => html`
              <button
                class="strip-item ${i.id === current.id ? "on" : ""}"
                title=${i.title}
                aria-current=${i.id === current.id}
                @click=${() => this.open(i)}
              >
                <img src=${api.sourceStreamURL(i.thumbUrl)} loading="lazy" alt=${i.title} />
                ${i.kind === "video"
                  ? html`<span class="strip-play material-symbols-rounded">play_circle</span>`
                  : nothing}
                ${n === at + 1 ? html`<span class="strip-next">Next</span>` : nothing}
              </button>
            `,
          )}
        </div>
      </div>
    `;
  }

  /**
   * A thread's comments, as the site shows them: every post in order, its picture, and
   * the >>numbers it was replying to. Flat rather than nested — a post can quote
   * several others, so the conversation is a graph and pretending otherwise would
   * mean picking an arbitrary parent.
   */
  private renderComments(item: SourceItem) {
    const at = item.postNo;
    const needle = this.commentQuery.trim().toLowerCase();
    const comments = needle
      ? this.comments.filter((c) =>
          [String(c.no), c.name, c.subject, c.text].some((v) => (v ?? "").toLowerCase().includes(needle)),
        )
      : this.comments;
    return html`
      <div
        class="overlay comments"
        @click=${(e: Event) => { if (e.target === e.currentTarget) this.closeComments(); }}
      >
        <div class="cpanel">
          <div class="chead">
            <span class="t">${item.title}</span>
            <button class="obtn" @click=${this.closeComments}>
              <span class="material-symbols-rounded" style="font-size:18px;">close</span>Close
            </button>
          </div>

          <div class="comment-search">
            <label class="searchbox">
              <span class="material-symbols-rounded" style="font-size:19px; color:var(--oppai-text-dim);">search</span>
              <input
                type="search"
                placeholder="Search this thread…"
                .value=${this.commentQuery}
                @input=${(e: Event) => (this.commentQuery = (e.target as HTMLInputElement).value)}
              />
            </label>
          </div>

          ${this.commentsLoading
            ? html`<div class="cempty"><md-circular-progress indeterminate></md-circular-progress></div>`
            : this.commentsError
              ? html`<div class="cempty">${this.commentsError}</div>`
              : !comments.length
                ? html`<div class="cempty">${needle ? "No matching posts." : "No posts in this thread."}</div>`
                : html`<div class="clist">
                    ${comments.map((c) => this.renderComment(c, c.no === at))}
                  </div>`}
        </div>
      </div>
    `;
  }

  private renderComment(c: SourceComment, here: boolean) {
    return html`
      <article id=${`post-${c.no}`} class="cpost ${here ? "here" : ""} ${c.op ? "op" : ""}">
        <header class="cmeta">
          ${c.op ? html`<span class="cbadge">OP</span>` : nothing}
          ${here ? html`<span class="cbadge here-badge">This file</span>` : nothing}
          <span class="cname">${c.name || "Anonymous"}</span>
          <span class="cno">No.${c.no}</span>
          <span class="ctime">${formatPostTime(c.time)}</span>
        </header>
        ${c.subject ? html`<div class="csub">${c.subject}</div>` : nothing}
        ${this.renderAttachment(c)}
        ${c.text ? html`<div class="ctext">${renderPostText(c.text, (no) => this.goToPost(no))}</div>` : nothing}
      </article>
    `;
  }

  private goToPost(no: number) {
    // Restore a filtered-out target before navigating to it.
    this.commentQuery = "";
    void this.updateComplete.then(() => {
      this.renderRoot.querySelector<HTMLElement>(`#post-${no}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }

  /**
   * The file a post was made with, as something you can open.
   *
   * The thumbnail 4chan serves is a JPEG even for a .webm, so a video in the thread
   * looked exactly like a picture and clicking it dumped the raw file into a browser
   * tab. It gets a play badge and opens in the viewer instead — which is where the
   * thing can actually be watched, with the rest of the thread still around it.
   */
  private renderAttachment(c: SourceComment) {
    if (!c.thumbUrl) return nothing;
    const video = c.kind === "video";
    return html`
      <button
        class="cattach"
        title=${video ? "Play this video" : "Open this file"}
        @click=${() => this.openAttachment(c)}
      >
        <img class="cthumb" src=${api.sourceStreamURL(c.thumbUrl)} loading="lazy" alt="" />
        ${video ? html`<span class="cplay material-symbols-rounded">play_circle</span>` : nothing}
      </button>
    `;
  }

  /**
   * Opens a post's file in the viewer, closing the thread panel over it.
   *
   * Prefer the item the feed already holds — inside a thread that's the same file, and
   * using it keeps the "up next" strip pointed at the right place in the run. From a
   * board listing there is no such item (the feed holds threads, not files), so the
   * comment is enough to build one: it carries the id the thread feed would have given
   * it anyway.
   */
  private openAttachment(c: SourceComment) {
    const known = c.itemId ? this.items.find((i) => i.id === c.itemId) : undefined;
    const item: SourceItem = known ?? {
      id: c.itemId ?? `post-${c.no}`,
      title: c.subject || `No.${c.no}`,
      kind: c.kind ?? "image",
      thumbUrl: c.thumbUrl ?? "",
      mediaUrl: c.mediaUrl,
      threadId: this.commentsFor?.threadId,
      postNo: c.no,
    };
    this.closeComments();
    void this.open(item);
  }

  /** The thread header: what we're inside, how to get out, and how to keep it. */
  private renderContainerHead(thread: SourceItem) {
    return html`
      <div class="head">
        <h2 class="title">${thread.title}</h2>
        <span class="count">
          ${this.items.length} ${this.items.length === 1 ? "file" : "files"}
        </span>
        <div class="head-actions">
          <button class="chip ghost" @click=${this.leaveContainer}>
            <span class="material-symbols-rounded" style="font-size:16px;">arrow_back</span>
            Back to ${this.feed?.label ?? "the board"}
          </button>
          ${thread.threadId
            ? html`<button class="chip ghost" @click=${() => this.openComments(thread)}>
                <span class="material-symbols-rounded" style="font-size:16px;">forum</span>
                Comments
              </button>`
            : nothing}
          <button class="chip ghost" ?disabled=${this.saving} @click=${() => this.save(thread)}>
            <span class="material-symbols-rounded" style="font-size:16px;">download</span>
            ${this.saving ? "Saving…" : "Save whole thread"}
          </button>
        </div>
      </div>
      <div class="thread-tools">
        <label class="searchbox">
          <span class="material-symbols-rounded" style="font-size:20px; color:var(--oppai-text-dim);">search</span>
          <input
            type="search"
            placeholder="Search files in this thread…"
            .value=${this.threadQuery}
            @input=${(e: Event) => (this.threadQuery = (e.target as HTMLInputElement).value)}
          />
        </label>
      </div>
    `;
  }

  render() {
    if (this.loadingSources) {
      return html`<div class="empty"><md-circular-progress indeterminate></md-circular-progress></div>`;
    }
    if (!this.sources.length) {
      return html`<div class="empty">No remote sources are configured.</div>`;
    }

    const sorts = this.feed?.sorts ?? [];
    const thread = this.container;
    const needle = this.threadQuery.trim().toLowerCase();
    const visibleItems = thread && needle
      ? this.items.filter((i) =>
          [i.title, String(i.postNo ?? ""), i.kind].some((v) => v.toLowerCase().includes(needle)),
        )
      : this.items;

    return html`
      ${thread
        ? this.renderContainerHead(thread)
        : html`
            <div class="head">
              <h2 class="title">${this.source?.name ?? "Browse"}</h2>
              <span class="count">${this.items.length ? `${this.items.length} shown` : ""}</span>
            </div>

            ${this.renderSiteTabs()}
            ${this.renderAccessNotices()}

            ${this.isFourChan
              ? html`<div class="thread-tools">
                  <select
                    class="feed-select"
                    aria-label="4chan board"
                    @change=${(e: Event) => this.pickFeed((e.target as HTMLSelectElement).value)}
                  >
                    ${(this.source?.feeds ?? []).map(
                      (f) => html`<option value=${f.id} ?selected=${f.id === this.feedId}>${f.label}</option>`,
                    )}
					${this.source?.feeds.some((f) => f.id === this.feedId)
					  ? nothing
					  : html`<option value=${this.feedId} selected>/${this.feedId}/ — Custom board</option>`}
                  </select>
                  <form class="thread-tools add-thread" @submit=${this.addThread}>
                    <label class="searchbox">
                      <span class="material-symbols-rounded" style="font-size:20px; color:var(--oppai-text-dim);">add_link</span>
                      <input
                        placeholder="Type /b/ or paste a thread URL"
                        .value=${this.threadDraft}
                        @input=${(e: Event) => (this.threadDraft = (e.target as HTMLInputElement).value)}
                      />
                    </label>
                    <button class="chip" type="submit">Open</button>
                  </form>
                </div>`
              : html`<div class="chips ${this.isSearch ? "tight" : ""}">
                  ${(this.source?.feeds ?? []).map(
                    (f) => html`<button
                      class="chip"
                      aria-pressed=${f.id === this.feedId}
                      @click=${() => this.pickFeed(f.id)}
                    >${f.label}</button>`,
                  )}
                </div>`}

            ${this.isSearch
              ? html`
                  <form class="searchbar" @submit=${this.submitSearch}>
                    <label class="searchbox">
                      <span class="material-symbols-rounded" style="font-size:20px; color:var(--oppai-text-dim);"
                        >search</span
                      >
                      <input
                        type="search"
                        placeholder="Search ${this.searchTarget}…"
                        .value=${this.draft}
                        @input=${(e: Event) => { this.draft = (e.target as HTMLInputElement).value; }}
                      />
                    </label>
                    <button class="chip" type="submit">Search</button>
                  </form>
                  ${sorts.length
                    ? html`<div class="chips tight">
                        ${sorts.map(
                          (s) => html`<button
                            class="chip"
                            aria-pressed=${s.id === (this.sort || sorts[0].id)}
                            @click=${() => this.pickSort(s.id)}
                          >${s.label}</button>`,
                        )}
                      </div>`
                    : nothing}
                `
              : nothing}
          `}

      ${this.source?.authentication === "required"
        ? html`<div class="empty">
            <span class="material-symbols-rounded" style="font-size:40px; display:block; margin-bottom:12px;">lock</span>
            <div style="font-size:14px;">This source requires authentication that its adapter has not configured.</div>
          </div>`
        : this.error && !this.items.length
        ? html`<div class="empty">
            <span class="material-symbols-rounded" style="font-size:40px; display:block; margin-bottom:12px;"
            >cloud_off</span
            >
            <div style="font-size:14px;">${this.error}</div>
            <button class="chip" style="margin-top:14px;" @click=${() => this.load(true)}>Try again</button>
          </div>`
        : this.isSearch && !this.query
          ? html`<div class="empty">
              <span class="material-symbols-rounded" style="font-size:40px; display:block; margin-bottom:12px;"
                >search</span
              >
              <div style="font-size:14px;">Search ${this.searchTarget} to see results.</div>
            </div>`
          : this.loading && !this.items.length
            ? html`<div class="empty"><md-circular-progress indeterminate></md-circular-progress></div>`
            : !visibleItems.length
              ? html`<div class="empty">
                  <span class="material-symbols-rounded" style="font-size:40px; display:block; margin-bottom:12px;"
                    >search_off</span
                  >
                  <div style="font-size:14px;">
                    ${thread
                      ? needle
                        ? html`Nothing in this thread matched “${this.threadQuery.trim()}”.`
                        : "Nothing left in this thread — it may have 404'd."
                      : this.query
                        ? html`Nothing matched “${this.query}”.`
                        : "Nothing on this feed."}
                  </div>
                </div>`
              : html`
                  <div class="grid">${visibleItems.map((i, n) => this.renderTile(i, n))}</div>
                  ${this.error ? html`<div class="feed-error" role="status">
                    <span class="material-symbols-rounded" aria-hidden="true">warning</span><span>${this.error}</span>
                  </div>` : nothing}
                  ${this.cursor
                    ? html`<div class="more" data-page-sentinel>
                        <button class="chip" ?disabled=${this.loading} @click=${() => this.load(false)}>
                          ${this.loading ? "Loading next page…" : "Load more"}
                        </button>
                      </div>`
                    : nothing}
                `}

      ${this.active ? this.renderOverlay(this.active) : nothing}
      ${this.commentsFor ? this.renderComments(this.commentsFor) : nothing}
      ${this.toast ? html`<div class="toast">${this.toast}</div>` : nothing}
    `;
  }
}

/** How many pages ahead of the one on screen to warm. See `warmPages`. */
const PAGE_LOOKAHEAD = 3;

/** "12 Mar, 21:04" — enough to place a post in the thread without the year. */
function formatPostTime(unix: number): string {
  if (!unix) return "";
  return new Date(unix * 1000).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Renders a post's text, keeping the two things that carry its meaning: greentext
 * (a line starting ">") and quotes (">>12345"). Both are just lines to the browser,
 * so they're classed here rather than being left as undifferentiated text — strip the
 * distinction and a quoted line becomes indistinguishable from the reply to it, which
 * is most of what a 4chan post is doing.
 *
 * The text arrives as plain text (the server stripped the markup), so this is styling
 * a string, not parsing HTML — nothing here can inject markup.
 */
function renderPostText(text: string, onQuote: (no: number) => void) {
  return text.split("\n").map((line) => {
    const green = !/^>>\d+/.test(line) && line.startsWith(">");
    const parts = line.split(/(>>\d+)/g);
    return html`<div class=${green ? "cgreen" : ""}>${parts.map((part) => {
      const match = part.match(/^>>(\d+)$/);
      return match
        ? html`<button class="cquote" @click=${() => onQuote(Number(match[1]))}>${part}</button>`
        : part;
    })}</div>`;
  });
}

declare global {
  interface HTMLElementTagNameMap {
    "oppai-browse": OppaiBrowse;
  }
}
