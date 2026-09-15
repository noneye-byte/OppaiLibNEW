import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { keyed } from "lit/directives/keyed.js";
import {
  api,
  mascotSay,
  MEDIA_PAGE_SIZE,
  type ChatCharacter,
  type Collection,
  type LibraryStats,
  type Media,
  type MediaQuery,
  type MediaSort,
  type SourceItem,
  type TagCount,
  type User,
} from "../api.js";
import { canShare, saveForCharacter, shareWithCharacter } from "../chat-share.js";
import { attachLongPress } from "../long-press.js";
import { OPEN_MEDIA_EVENT } from "../chat-links.js";
import { libbyReact, type LibbyItemFacts } from "../libby-voice.js";
import { isIncognito } from "../incognito.js";
import { iconStyles, motionStyles, loadTheme, saveTheme, applyTheme } from "../theme.js";
import { logoSVG } from "../logo.js";
import { dismissDownload, downloadTasks, type DownloadTask } from "../downloads.js";
import { uploads } from "../uploads.js";
import { withViewTransition } from "../motion.js";
import { profileUpdates } from "../ui-metrics.js";
import { menuDivider, nativeMenuWanted, openMenu, type MenuItem } from "../context-menu.js";
import {
  KIND_META,
  KIND_ORDER,
  type Kind,
  swatchFor,
  hasThumbnail,
  statFor,
  primaryTag,
  loadFavorites,
  saveFavorites,
  isTypingTarget,
  formatBytes,
  studioEditable,
} from "../media-meta.js";
import { loadRecents, noteOpened, recentlyOpened } from "../recents.js";
import "../context-menu.js";
import { libbyWhere } from "./libby-drawer.js";
import "./libby-drawer.js";

/**
 * The screens, loaded when they are first needed.
 *
 * These were static imports, which put every screen in the first bundle: the studio
 * and the chat view alone are some twelve thousand lines, and they were parsed before
 * the login form could paint, for someone who only wanted to look at a thumbnail. One
 * chunk of 1.2 MB became the price of opening the app at all.
 *
 * A custom element can be written into the template before its module has loaded — the
 * browser upgrades the element when the definition arrives — so the section switches
 * immediately and fills in a moment later. Nothing waits on the import; there is
 * nothing to wait for.
 *
 * Keyed by section so each module is fetched once, and the promise is kept rather than
 * a boolean: two quick taps on Chat must not start two fetches.
 */
const VIEW_MODULES: Record<ViewKey, () => Promise<unknown>> = {
  settings: () => import("./settings.js"),
  browse: () => import("./browse.js"),
  imagegen: () => import("./imagegen.js"),
  chat: () => import("./chat.js"),
  // Not sections, but loaded the same way and on the same terms: the viewer the first
  // time an item is opened, the import dialog when one is opened. Separately, so
  // opening a picture does not also fetch the dialog's text fields and chips.
  viewer: () => import("./viewer.js"),
  scrape: () => import("./scrape-dialog.js"),
};

/** Which chunk a section lives in. Create and the studio are one module in two modes,
 *  so both map to the same key. */
type ViewKey = "settings" | "browse" | "imagegen" | "chat" | "viewer" | "scrape";
function viewKey(section: string): ViewKey | null {
  if (section === "studio") return "imagegen";
  return section in VIEW_MODULES ? (section as ViewKey) : null;
}

const loadedViews = new Map<string, Promise<unknown>>();

/** Starts a chunk loading (or returns the load already in flight). */
function loadView(section: string): Promise<unknown> {
  const key = viewKey(section);
  if (!key) return Promise.resolve();
  const existing = loadedViews.get(key);
  if (existing) return existing;
  const load = VIEW_MODULES[key];
  const p = load().catch((err) => {
    // A failed chunk must be retryable: leaving the rejected promise in the map would
    // make the section permanently blank.
    loadedViews.delete(key);
    throw err;
  });
  loadedViews.set(key, p);
  return p;
}

/** Where the shell can be.
 *
 * "together" is deliberately absent. Browsing with her used to be a destination *and* a
 * drawer available on every screen, which is one idea with two entrances. The drawer is
 * the better of the two: it opens over the real library grid, where the screen had to
 * render a second copy of it. Old state naming that section is handled in selectSection.
 */
type Section =
  | "home"
  | "favorites"
  | "collections"
  | "browse"
  | "imagegen"
  | "studio"
  | "chat"
  | "settings"
  | Kind;

interface NavSection {
  id: Section;
  label: string;
  icon: string;
}

const NAV_SECTIONS: NavSection[] = [
  { id: "home", label: "Home", icon: "home" },
  ...KIND_ORDER.map((k) => ({ id: k, label: KIND_META[k].label, icon: KIND_META[k].icon })),
  { id: "favorites", label: "Favorites", icon: "favorite" },
  // A named, ordered list of items — the one thing a tag cannot express, since a tag
  // says what something is and says it about everything it is on equally.
  { id: "collections", label: "Collections", icon: "bookmarks" },
  // Remote catalogues. Not part of the library — nothing here is imported until the
  // user saves it — but it's how things get *into* the library, so it sits with them.
  { id: "browse", label: "Browse", icon: "explore" },
  // Image generation. Like Browse, nothing is in the library until saved; it's another
  // way things get *into* it, so it sits alongside.
  { id: "imagegen", label: "Create", icon: "auto_awesome" },
  // The outfit studio: the same generator pointed at one job, dressing Libby and
  // rendering her sixty expressions. It owns every outfit surface in the app — the
  // Create screen and Settings deliberately have none.
  { id: "studio", label: "Studio", icon: "checkroom" },
  { id: "chat", label: "Chat", icon: "chat_bubble" },
];

// Search itself lives on the server now — see media_search.go. It matches the same
// fields this file used to (title, notes, tag names, tag categories) and ANDs the
// terms the same way, but against the whole collection rather than against whatever
// the browser had downloaded.

// Main application shell for the OppaiLib Media Server UI: a nav rail, top app
// bar with search, and a content area that routes between the home dashboard,
// category/favorites/search grids, and the single-item viewer.
@customElement("oppai-library")
export class OppaiLibrary extends LitElement {
  @property({ attribute: false }) user!: User;

  /** The pages of the current query that have been loaded — what the grid draws.
   *
   *  Not the library. This held every row until the server learned to search and
   *  filter (see reload / media_search.go), which put the whole collection in one
   *  tab's memory and made every screen wait for all of it. */
  @state() private items: Media[] = [];
  /** How many items the current query matches in total, from the server. What makes
   *  "1–60 of 4,312" sayable, and what tells the sentinel whether to ask for more. */
  @state() private total = 0;
  /** The order the grid is in. Title is absent on purpose: titles are encrypted, so
   *  the server cannot sort by one. */
  @state() private sort: MediaSort = "newest";
  /** The library's shape, for Home's counts. Null until it arrives. */
  @state() private stats: LibraryStats | null = null;
  /** Home's shelves, each a bounded query rather than a slice of everything. */
  @state() private home: {
    resume: Media[];
    favorites: Media[];
    newest: Media[];
    byKind: Record<Kind, Media[]>;
  } | null = null;
  /** The filter chips for the current kind, counted by the server. */
  @state() private chipTags: TagCount[] = [];
  /** Named, ordered lists. The tables were in the schema from the first commit with
   *  nothing to reach them; see handlers_collections.go. */
  @state() private collections: Collection[] = [];
  /** Which collection is open, when the section is "collections". */
  @state() private openCollection: Collection | null = null;
  /** What has been opened on this device, newest first. Feeds Home's hero and its
      "Jump back in" row. Per-device and client-owned; see recents.ts. */
  @state() private recents = loadRecents();
  @state() private loading = false;
  /** A further page on its way. Separate from `loading` so appending never blanks
   *  what is already on screen. */
  @state() private loadingMore = false;
  /** Which lazily-loaded screens are ready to render.
   *
   *  A view is rendered only once its chunk is in. Writing the element out early and
   *  letting the browser upgrade it looks free, but Lit runs connectedCallback at
   *  upgrade time and only re-applies the property bindings afterwards — so a view that
   *  reads a property on connect (the viewer does, to fetch the item) sees undefined
   *  and throws. */
  @state() private viewReady = new Set<ViewKey>();
  /** Cancels the page the query has moved on from. */
  private pageAbort?: AbortController;
  private homeAbort?: AbortController;
  /** Waits for the typing to stop before asking the server. */
  private searchDebounce?: number;
  /** Watches the end of the grid, to ask for the next page before it is reached. */
  private moreObserver?: IntersectionObserver;
  @state() private section: Section = "home";
  @state() private selectedId: number | null = null;
  /** A library picture handed to the Create screen to be redone. See studioEditable. */
  @state() private editMediaId = 0;
  @state() private search = "";
  @state() private filters: Record<string, string> = {};
  @state() private favorites = loadFavorites();
  @state() private uploadOpen = false;
  @state() private dragActive = false;
  @state() private selectMode = false;
  @state() private selected = new Set<number>();
  @state() private busy = false;
  @state() private downloads: DownloadTask[] = downloadTasks();
  /** Remote tiles currently visible in Browse. They are separate from downloaded
      Media records because saving is the action that turns one into library content. */
  @state() private browseFrame: { items: SourceItem[]; focused: SourceItem | null; where: string } = {
    items: [], focused: null, where: "Browse",
  };
  /** Ids of uploads that have landed but not yet been announced — see onUploadDone. */
  private pendingUploads: (number | undefined)[] = [];
  private uploadSettle?: number;
  /** Unwires hold-to-menu; see attachLongPress. */
  private detachLongPress?: () => void;

  static styles = [
    iconStyles,
    motionStyles,
    css`
      :host {
        display: flex;
        width: 100vw;
        height: 100vh;
        height: 100dvh;
        background: var(--oppai-bg);
        color: var(--oppai-text);
        overflow: hidden;
        position: relative;
        font-family: "Roboto", system-ui, sans-serif;
      }
      button {
        font-family: inherit;
      }
      input::placeholder {
        color: var(--oppai-text-muted);
      }

      /* Nav rail */
      nav {
        width: 96px;
        flex-shrink: 0;
        height: 100%;
        box-sizing: border-box;
        overflow: hidden;
        background: var(--oppai-nav);
        border-right: 1px solid var(--oppai-surface-2);
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 20px 0 max(16px, env(safe-area-inset-bottom));
        gap: 20px;
      }
      nav .logo, nav .add-btn, nav .nav-utility { flex-shrink: 0; }
      /* The mark, inlined so it takes currentColor and follows the theme. */
      .logo {
        width: 44px;
        height: 44px;
        padding: 0;
        border: none;
        background: none;
        cursor: pointer;
        color: var(--oppai-primary);
        transition: transform 0.22s var(--oppai-ease-spring), color 0.2s ease;
      }
      .logo:hover {
        transform: scale(1.08);
        color: var(--oppai-primary-bright);
      }
      .logo svg {
        width: 100%;
        height: 100%;
        display: block;
      }
      .add-btn {
        width: 56px;
        height: 56px;
        border-radius: 16px;
        background: var(--oppai-primary-container);
        border: none;
        color: var(--oppai-primary-bright);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
        transition: transform 0.2s var(--oppai-ease-spring), filter 0.15s ease,
          box-shadow 0.2s ease;
      }
      .add-btn:hover {
        filter: brightness(1.1);
        transform: translateY(-2px) rotate(90deg);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.45);
      }
      .add-btn:active {
        transform: scale(0.94) rotate(90deg);
      }
      .add-btn span {
        transition: transform 0.2s var(--oppai-ease-spring);
      }
      .nav-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
        width: 100%;
        min-height: 0;
        overflow-y: auto;
        overscroll-behavior: contain;
        scrollbar-width: none;
        align-items: center;
      }
      .nav-list::-webkit-scrollbar { display: none; }
      .nav-item {
        background: none;
        border: none;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 0;
        width: 64px;
      }
      .nav-pill {
        width: 56px;
        height: 32px;
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.22s var(--oppai-ease-emphasized),
          transform 0.22s var(--oppai-ease-spring);
      }
      .nav-item:hover .nav-pill {
        background: var(--oppai-nav-hover);
      }
      .nav-item:active .nav-pill {
        transform: scale(0.9);
      }
      .nav-pill span {
        transition: color 0.2s ease;
      }
      .nav-label {
        transition: color 0.2s ease;
      }
      .nav-label {
        font-size: 11px;
        font-weight: 500;
        letter-spacing: 0.2px;
      }
      .icon-btn {
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }

      /* Layout */
      .main-col {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      header {
        height: 72px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 0 28px;
        border-bottom: 1px solid var(--oppai-border);
      }
      .h-title {
        font-size: 20px;
        font-weight: 500;
        margin: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 280px;
        flex-shrink: 0;
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
        font-size: 14px;
      }
      .filters-btn {
        background: none;
        border: 1px solid var(--oppai-border-strong);
        border-radius: 20px;
        height: 40px;
        padding: 0 14px;
        display: flex;
        align-items: center;
        gap: 6px;
        color: var(--oppai-text-dim);
        cursor: pointer;
        flex-shrink: 0;
      }
      main {
        flex: 1;
        overflow-y: auto;
        padding: 28px 32px 60px;
      }
      /* Chat is a full-bleed client, not a card inside the library shell: it
         owns its own scrolling regions, so the shell's padding and scrollbar
         would produce a nested-scroller feel and a visible inset frame. */
      main.flush {
        padding: 0;
        overflow: hidden;
        min-height: 0;
      }

      /* Home */
      .greeting {
        font-size: 28px;
        font-weight: 400;
        margin: 0 0 4px;
      }
      .greeting-sub {
        font-size: 14px;
        color: var(--oppai-text-dim);
        margin: 0 0 24px;
      }
      /* The hero: one item at full width, art beside its details. Collapses to art
         over details on a phone, where side-by-side would leave neither room. */
      .hero {
        display: grid;
        grid-template-columns: minmax(0, 300px) minmax(0, 1fr);
        gap: 20px;
        align-items: center;
        margin-bottom: 14px;
        padding: 16px;
        border: 1px solid var(--oppai-border);
        border-radius: 20px;
        background: var(--oppai-surface-2);
      }
      .hero-art {
        display: grid;
        place-items: center;
        width: 100%;
        aspect-ratio: 16 / 10;
        padding: 0;
        border: 0;
        border-radius: 14px;
        overflow: hidden;
        background: var(--oppai-surface);
        cursor: pointer;
      }
      .hero-art img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .hero-icon { font-size: 52px; color: var(--oppai-text-muted); }
      .hero-body { display: grid; gap: 8px; min-width: 0; }
      .hero-eyebrow {
        color: var(--oppai-primary-bright);
        font-size: 11.5px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .hero-title {
        margin: 0;
        font-size: 25px;
        font-weight: 500;
        line-height: 1.2;
        overflow-wrap: anywhere;
      }
      .hero-tags { display: flex; flex-wrap: wrap; gap: 6px; }
      .hero-tags span {
        padding: 3px 9px;
        border: 1px solid var(--oppai-border-strong);
        border-radius: 999px;
        color: var(--oppai-text-dim);
        font-size: 11.5px;
      }
      .hero-acts { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
      .hero-open, .hero-more {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 9px 18px;
        border: 1px solid var(--oppai-border-strong);
        border-radius: 999px;
        background: transparent;
        color: var(--oppai-text-dim);
        cursor: pointer;
        font: inherit;
        font-size: 13.5px;
        font-weight: 600;
      }
      .hero-open {
        background: var(--oppai-primary);
        border-color: var(--oppai-primary);
        color: var(--oppai-on-primary);
      }
      .hero-more:hover { color: var(--oppai-text); }
      .hero-open .material-symbols-rounded { font-size: 19px; }
      /* The counts. Two of them are links to the screens they describe; the other two
         are facts with nowhere to go, so they are not buttons. */
      .stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
        gap: 10px;
        margin-bottom: 34px;
      }
      .stat {
        display: grid;
        gap: 1px;
        padding: 12px 14px;
        border: 1px solid var(--oppai-border);
        border-radius: 14px;
        background: var(--oppai-surface-2);
        color: inherit;
        text-align: left;
        font: inherit;
      }
      button.stat { cursor: pointer; }
      button.stat:hover { border-color: var(--oppai-border-strong); }
      .stat strong { font-size: 19px; font-weight: 600; }
      .stat span { color: var(--oppai-text-muted); font-size: 11.5px; }
      .row-sub {
        color: var(--oppai-text-muted);
        font-size: 12px;
      }
      @media (max-width: 760px) {
        .hero { grid-template-columns: minmax(0, 1fr); gap: 14px; padding: 12px; }
        .hero-title { font-size: 21px; }
      }
      .row {
        margin-bottom: 36px;
      }
      .row-head {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 14px;
      }
      .row-title {
        font-size: 18px;
        font-weight: 500;
        margin: 0;
        flex: 1;
      }
      .see-all {
        background: none;
        border: none;
        color: var(--oppai-primary-bright);
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 2px;
      }
      .row-scroll {
        display: flex;
        gap: 16px;
        overflow-x: auto;
        padding-bottom: 8px;
      }

      /* Grid */
      .grid-head {
        display: flex;
        align-items: baseline;
        gap: 12px;
        margin-bottom: 6px;
      }
      .grid-title {
        font-size: 26px;
        font-weight: 400;
        margin: 0;
      }
      .grid-count {
        font-size: 13px;
        color: var(--oppai-text-muted);
      }
      /* The sort control sits at the far end of the grid heading, so the heading reads
         "what this is, how much of it, in what order". */
      .sort {
        margin-left: auto;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
      }
      .sort-label {
        color: var(--oppai-text-muted);
      }
      .sort select {
        height: 34px;
        padding: 0 8px;
        border-radius: 8px;
        border: 1px solid var(--oppai-border-strong);
        background: var(--oppai-surface);
        color: var(--oppai-text);
        font-family: inherit;
        font-size: 13px;
      }
      /* The end of what has loaded. The sentinel is what the observer watches; the
         button behind it is for anyone the observer does not reach. */
      .more-sentinel,
      .more-end {
        display: grid;
        place-items: center;
        padding: 28px 0 8px;
        font-size: 13px;
        color: var(--oppai-text-muted);
      }
      .more-btn {
        height: 40px;
        padding: 0 20px;
        border-radius: 20px;
        border: 1px solid var(--oppai-border-strong);
        background: var(--oppai-surface);
        color: var(--oppai-text);
        font-family: inherit;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
      }
      .more-btn:hover {
        background: var(--oppai-surface-2);
      }
      .chips {
        display: flex;
        gap: 8px;
        margin: 18px 0 24px;
        flex-wrap: wrap;
      }
      .chip {
        height: 36px;
        padding: 0 16px;
        border-radius: 18px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 22px;
      }
      .empty {
        text-align: center;
        padding: 80px 0;
        color: var(--oppai-text-muted);
      }

      /* Tiles. A hold opens the menu (see long-press.ts), so the browser's own
         hold behaviours — the image callout, a text selection — are switched off
         here rather than fighting it. */
      .tile {
        cursor: pointer;
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        user-select: none;
      }
      /* A focused tile has to be visible as such, now that one can be reached by
         keyboard. focus-visible rather than focus, so a mouse click does not leave a
         ring behind it. */
      .tile:focus {
        outline: none;
      }
      .tile:focus-visible {
        outline: 2px solid var(--oppai-primary);
        outline-offset: 3px;
        border-radius: 18px;
      }
      .tile-media {
        position: relative;
        border-radius: 16px;
        overflow: hidden;
        transition: transform 0.28s var(--oppai-ease-emphasized),
          box-shadow 0.28s var(--oppai-ease-emphasized);
        will-change: transform;
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
      .tile-overlay {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 6px;
        opacity: 0.55;
      }
      .type-label {
        font: 600 10px ui-monospace, monospace;
        color: #fff;
        letter-spacing: 1px;
      }
      .fav-btn {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 32px;
        height: 32px;
        border-radius: 16px;
        background: rgba(0, 0, 0, 0.4);
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        opacity: 0;
        transform: scale(0.8);
        transition: opacity 0.2s ease, transform 0.2s var(--oppai-ease-spring),
          background 0.2s ease;
        backdrop-filter: blur(2px);
      }
      .tile:hover .fav-btn,
      .fav-btn.is-fav {
        opacity: 1;
        transform: scale(1);
      }
      .fav-btn:hover {
        background: rgba(0, 0, 0, 0.6);
      }
      .fav-btn:active .material-symbols-rounded {
        animation: oppai-pop 0.35s var(--oppai-ease-spring);
      }
      .tile-stat {
        position: absolute;
        bottom: 6px;
        right: 8px;
        font-size: 11px;
        font-weight: 600;
        color: #fff;
        background: rgba(0, 0, 0, 0.5);
        padding: 2px 6px;
        border-radius: 6px;
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

      /* Upload dialog */
      .scrim {
        position: absolute;
        inset: 0;
        background: var(--oppai-scrim);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 20;
        animation: oppai-fade-in 0.2s var(--oppai-ease-standard) both;
      }
      .dialog {
        width: 480px;
        max-width: calc(100vw - 32px);
        background: var(--oppai-surface-2);
        border-radius: 28px;
        padding: 28px;
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
        animation: oppai-scale-in 0.32s var(--oppai-ease-spring) both;
      }
      .dialog h2 {
        font-size: 20px;
        font-weight: 500;
        margin: 0 0 20px;
      }
      .dropzone {
        border: 1.5px dashed var(--oppai-border-strong);
        border-radius: 16px;
        padding: 40px 20px;
        text-align: center;
        color: var(--oppai-text-dim);
        cursor: pointer;
        transition: border-color 0.12s ease, background 0.12s ease;
      }
      .dropzone.drag {
        border-color: var(--oppai-primary);
        background: color-mix(in srgb, var(--oppai-primary) 12%, transparent);
      }
      .dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 24px;
      }
      .btn-text {
        height: 40px;
        padding: 0 20px;
        border-radius: 20px;
        background: none;
        border: none;
        color: var(--oppai-primary-bright);
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
      }
      .btn-filled {
        height: 40px;
        padding: 0 20px;
        border-radius: 20px;
        background: var(--oppai-primary);
        border: none;
        color: var(--oppai-on-primary);
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
      }
      .link-btn {
        display: block;
        margin: 14px auto 0;
        background: none;
        border: none;
        color: var(--oppai-primary-bright);
        font-size: 13px;
        cursor: pointer;
      }
      input[type="file"] {
        display: none;
      }

      /* Selection mode */
      .tile.selecting .tile-media {
        transform: none;
      }
      .tile.selected .tile-media {
        outline: 3px solid var(--oppai-primary);
        outline-offset: 2px;
      }
      .select-check {
        position: absolute;
        top: 8px;
        left: 8px;
        width: 26px;
        height: 26px;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.5);
        border: 2px solid #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2;
        backdrop-filter: blur(2px);
      }
      .select-check.on {
        background: var(--oppai-primary);
        border-color: var(--oppai-primary);
      }
      .select-check .material-symbols-rounded {
        font-size: 18px;
        color: #fff;
      }
      .bulk-bar {
        position: absolute;
        left: 50%;
        bottom: 24px;
        transform: translateX(-50%);
        z-index: 25;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px 10px 18px;
        border-radius: 28px;
        background: var(--oppai-surface-2);
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
        animation: oppai-scale-in 0.28s var(--oppai-ease-spring) both;
      }
      .bulk-count {
        font-size: 14px;
        font-weight: 600;
        margin-right: 6px;
        white-space: nowrap;
      }
      .bulk-btn {
        height: 40px;
        padding: 0 14px;
        border-radius: 20px;
        background: none;
        border: none;
        color: var(--oppai-text);
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .bulk-btn:hover {
        background: var(--oppai-surface);
      }
      .bulk-btn.danger {
        color: var(--oppai-error, #f2b8b5);
      }
      .bulk-btn[disabled] {
        opacity: 0.5;
        cursor: default;
      }
      .download-area {
        position: absolute; right: 22px; bottom: 86px; z-index: 24;
        width: min(360px, calc(100vw - 44px)); padding: 12px;
        border: 1px solid var(--oppai-border); border-radius: 18px;
        background: color-mix(in srgb, var(--oppai-surface-2) 94%, transparent);
        box-shadow: 0 14px 44px rgba(0, 0, 0, .48); backdrop-filter: blur(16px);
        animation: oppai-scale-in .24s var(--oppai-ease-spring) both;
      }
      .download-heading { font-size: 12px; font-weight: 700; opacity: .72; padding: 0 4px 7px; }
      .download-row { display: flex; align-items: center; gap: 11px; min-height: 48px; padding: 5px 4px; }
      .download-row + .download-row { border-top: 1px solid var(--oppai-border); }
      .download-ring {
        width: 36px; height: 36px; flex: 0 0 36px; border-radius: 50%;
        display: grid; place-items: center; color: var(--oppai-primary-bright);
        background: conic-gradient(var(--oppai-primary) calc(var(--p) * 1turn), var(--oppai-border) 0);
        transition: background .8s linear; position: relative;
      }
      .download-ring::before { content: ""; position: absolute; inset: 3px; border-radius: 50%; background: var(--oppai-surface-2); }
      .download-ring span { position: relative; z-index: 1; font-size: 19px; }
      .download-copy { min-width: 0; flex: 1; }
      .download-title { font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .download-status { font-size: 11px; opacity: .68; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .download-dismiss { border: 0; background: none; color: inherit; opacity: .66; cursor: pointer; padding: 5px; }
      .header-toggle.on {
        background: var(--oppai-primary-container);
        color: var(--oppai-primary-bright);
        border-color: var(--oppai-primary);
      }

      /* Phone navigation is a real bottom bar, not the desktop rail squeezed into a
         short viewport. The destinations scroll horizontally while Add, Settings,
         and the account remain reachable at the edges. Dynamic viewport units follow
         collapsing browser chrome; safe-area padding keeps the bar above home
         indicators, notches, and rounded landscape corners. */
      @media (max-width: 700px) {
        :host {
          flex-direction: column;
          height: 100dvh;
          min-height: -webkit-fill-available;
        }
        nav {
          order: 2;
          width: 100%;
          height: auto;
          flex: 0 0 auto;
          flex-direction: row;
          align-items: center;
          gap: 4px;
          padding:
            6px max(8px, env(safe-area-inset-right))
            calc(6px + env(safe-area-inset-bottom))
            max(8px, env(safe-area-inset-left));
          border-right: 0;
          border-top: 1px solid var(--oppai-surface-2);
        }
        nav .logo, .nav-spacer { display: none; }
        .add-btn { width: 44px; height: 44px; border-radius: 14px; flex: 0 0 44px; }
        .nav-list {
          min-width: 0;
          flex: 1 1 auto;
          width: auto;
          flex-direction: row;
          justify-content: flex-start;
          gap: 2px;
          overflow-x: auto;
          overflow-y: hidden;
          overscroll-behavior-x: contain;
          scrollbar-width: none;
          scroll-snap-type: x proximity;
        }
        .nav-item { width: 58px; flex: 0 0 58px; scroll-snap-align: nearest; }
        .nav-pill { width: 48px; height: 28px; }
        .nav-label { font-size: 10px; }
        .nav-utility { flex: 0 0 auto; }
        .main-col { order: 1; min-height: 0; height: auto; }
        header {
          height: calc(60px + env(safe-area-inset-top));
          padding: env(safe-area-inset-top) max(14px, env(safe-area-inset-right)) 0 max(14px, env(safe-area-inset-left));
          gap: 10px;
        }
        .h-title { max-width: 38vw; font-size: 17px; }
        main {
          padding: 20px max(16px, env(safe-area-inset-right)) max(24px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
        }
        main.flush { padding: 0; }
        .grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 14px; }
        .download-area { right: max(10px, env(safe-area-inset-right)); bottom: calc(76px + env(safe-area-inset-bottom)); }
        .bulk-bar { bottom: calc(76px + env(safe-area-inset-bottom)); max-width: calc(100vw - 20px); overflow-x: auto; }
      }
    `,
  ];

  // Ordered ids of the list the viewer was opened from, so arrow keys can page
  // between neighbours (see onKey / stepItem).
  private viewerList: number[] = [];

  connectedCallback() {
    super.connectedCallback();
    profileUpdates(this, "library");
    // Hearts from before favourites were server-side go up first, so the first page
    // that comes back already knows about them.
    void this.migrateLocalFavorites().then(() => this.refresh());
    // The shell's menu is the fallback for the whole app: it catches right-clicks
    // that bubble out of any view, including through a child's shadow root. A view
    // that built its own menu has already called preventDefault, which is how the
    // two stay out of each other's way (see onContextMenu).
    this.addEventListener("contextmenu", this.onContextMenu);
    // And a press-and-hold is the same request from a finger.
    this.detachLongPress = attachLongPress(this);
    // Anything nested can ask for a library item to be opened — a link Libby put in
    // a reply, a tile in the browse-together shelf. The shell owns the viewer, so
    // the request rises to here rather than each view learning how to route.
    this.addEventListener(OPEN_MEDIA_EVENT, this.onOpenMedia);
    window.addEventListener("keydown", this.onKey);
    window.addEventListener("oppai-downloads", this.onDownloads as EventListener);
    window.addEventListener("oppai-download-complete", this.onDownloadComplete);
    window.addEventListener("oppai-upload-complete", this.onUploadDone);
    // The disguise can be switched on from Settings without a reload; repaint the
    // few shell labels that describe its public identity.
    window.addEventListener("oppai-incognito", this.onIncognito);
    window.addEventListener("popstate", this.onPopState);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("popstate", this.onPopState);
    this.removeEventListener("contextmenu", this.onContextMenu);
    this.detachLongPress?.();
    this.removeEventListener(OPEN_MEDIA_EVENT, this.onOpenMedia);
    window.removeEventListener("keydown", this.onKey);
    window.removeEventListener("oppai-downloads", this.onDownloads as EventListener);
    window.removeEventListener("oppai-download-complete", this.onDownloadComplete);
    window.removeEventListener("oppai-upload-complete", this.onUploadDone);
    window.removeEventListener("oppai-incognito", this.onIncognito);
    if (this.uploadSettle) clearTimeout(this.uploadSettle);
    // Nothing in flight should outlive the view: an abandoned page would land on a
    // disconnected element, and the observer would keep the grid's last node alive.
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.pageAbort?.abort();
    this.homeAbort?.abort();
    this.moreObserver?.disconnect();
  }

  /**
   * Keeps the "load more" sentinel observed as the grid re-renders.
   *
   * An observer rather than a button or a scroll handler: it fires once, early, off
   * the main thread, and asks for the next page before the end of this one is reached.
   * rootMargin gives it a screen of warning so the grid rarely shows a gap.
   */
  protected updated(changed: Map<string, unknown>) {
    super.updated?.(changed as never);
    const sentinel = this.renderRoot?.querySelector(".more-sentinel");
    if (!sentinel) {
      this.moreObserver?.disconnect();
      this.moreObserver = undefined;
      return;
    }
    if (!this.moreObserver) {
      this.moreObserver = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) void this.loadMore();
        },
        { rootMargin: "600px 0px" },
      );
    }
    this.moreObserver.disconnect();
    this.moreObserver.observe(sentinel);
  }

  private onIncognito = () => {
    this.requestUpdate();
  };

  /**
   * The application-wide right-click menu.
   *
   * Three cases, most specific first: a library tile acts on that item, the open
   * item in the viewer acts on that item, and anything else gets the shell menu. A
   * view that owns its own menu (Chat) has already handled the event, and text
   * fields keep the browser's own menu so Paste stays reachable.
   *
   * The viewer case is what makes "send this to Libby" reachable from the place
   * you are actually looking at a picture. Before, the picture you had open was the
   * one thing on screen with no menu: right-clicking it gave the shell's, and the
   * item had to be closed and found again in the grid to be shared.
   */
  private onContextMenu = (event: MouseEvent) => {
    if (event.defaultPrevented || nativeMenuWanted(event)) return;
    const path = event.composedPath();
    const at = (selector: string) =>
      path.find((node) => (node as HTMLElement)?.classList?.contains?.(selector)) as HTMLElement | undefined;
    const inViewer = path.some((node) => (node as HTMLElement)?.tagName?.toLowerCase?.() === "oppai-viewer");

    const tileID = Number(at("tile")?.dataset.id);
    let items: MenuItem[];
    if (Number.isFinite(tileID) && tileID > 0) items = this.tileMenuItems(tileID, event);
    else if (inViewer && this.selectedId != null) items = this.tileMenuItems(this.selectedId, event, true);
    else items = this.shellMenuItems();
    if (!items.length) return;
    event.preventDefault();
    openMenu({ x: event.clientX, y: event.clientY, items });
  };

  private tileMenuItems(id: number, event: MouseEvent, open = false): MenuItem[] {
    const item = this.items.find((m) => m.id === id);
    if (!item) return [];
    const fav = this.favorites.has(id);
    const shareable = canShare(item);
    return [
      ...(open ? [] : [{ label: "Open", icon: "open_in_full", run: () => this.openItem(id) }]),
      { label: fav ? "Remove from favorites" : "Add to favorites", icon: fav ? "heart_minus" : "favorite", run: () => this.toggleFavorite(id) },
      ...(open ? [] : [{ label: this.selectMode ? "Toggle selection" : "Select items", icon: "check_box", run: () => this.selectMode ? this.toggleSelected(id) : this.toggleSelectMode() }]),
      // A list in an order you chose, which is the one thing the tags cannot express.
      { label: "Add to collection…", icon: "playlist_add",
        run: () => this.openCollectionMenu([id], event.clientX, event.clientY) },
      // Only while looking at one: "remove from collection" needs a collection to
      // mean, and on any other screen it would be a menu entry with no referent.
      ...(this.openCollection
        ? [{ label: `Take off "${this.openCollection.name}"`, icon: "playlist_remove",
             run: () => void this.removeFromOpenCollection(id) }]
        : []),
      menuDivider,
      // The two ways to hand her a picture, one entry each and Libby's by name: she
      // is who you are nearly always sending to, and "Share with…" then a list of
      // one was two taps for the common case. Both disabled rather than hidden when
      // there is nothing showable, so the entry not being there reads as "this
      // build can't do it" instead of "not this item".
      { label: "Show Libby now", icon: "send", disabled: shareable ? false : true,
        hint: "attach to a message",
        run: () => void this.share(item, { id: "libby", name: "Libby" } as ChatCharacter) },
      { label: "Save for Libby to send later", icon: "add_photo_alternate", disabled: shareable ? false : true,
        hint: "her gallery",
        run: () => void this.saveForLater(item) },
      { label: "Share with…", icon: "ios_share", disabled: !shareable,
        run: () => void this.openShareMenu(item, event.clientX, event.clientY) },
      // Who the picture is *of*, which is a different question from what is in it.
      // Only offered for stills: a video is not a portrait of anyone, and tagging one
      // as her would put her face on something she is not in for most of its length.
      ...((item.kind === "image" || item.kind === "gif")
        ? [{ label: "Is this Libby?", icon: "face_retouching_natural",
             run: () => this.openIdentityMenu(item, event.clientX, event.clientY) }]
        : []),
      // A picture made here, or one of hers, can be redone with its own recipe.
      ...(studioEditable(item)
        ? [{ label: "Edit in the studio", icon: "brush", run: () => this.editInStudio(item.id) }]
        : []),
      { label: "Copy title", icon: "content_copy", run: () => void navigator.clipboard.writeText(item.title) },
      { label: "Open the file", icon: "open_in_new", run: () => window.open(api.streamURL(id), "_blank") },
      menuDivider,
      { label: "Delete", icon: "delete", danger: true, run: () => void this.deleteOne(id) },
    ];
  }

  /**
   * Second step of "Is this Libby?": the verdict.
   *
   * Three answers rather than a toggle, because "yes, and this is one of the pictures
   * that define what she looks like" is a genuinely different thing to say than "yes".
   * "No" is an answer too, not an absence — it is recorded, so recognition does not put
   * the tag straight back on the next pass.
   */
  private openIdentityMenu(item: Media, x: number, y: number) {
    const decide = async (isLibby: boolean, reference = false) => {
      try {
        await api.markLibbyIdentity({ mediaId: item.id, isLibby, reference });
        mascotSay(isLibby
          ? (reference ? `Saved as one of the pictures of me.` : `Noted — that one's me.`)
          : `Noted — that one isn't me.`);
        // The tag lives on the item, so what the grid shows is now out of date.
        void this.refresh();
      } catch (error) {
        mascotSay((error as Error).message || "Couldn't save that.", "error");
      }
    };
    openMenu({
      x, y, title: `"${item.title}"`,
      items: [
        { label: "Yes, that's Libby", icon: "check", run: () => void decide(true) },
        { label: "Yes — and use it as a reference", icon: "star", run: () => void decide(true, true) },
        menuDivider,
        { label: "No, that isn't her", icon: "close", run: () => void decide(false) },
      ],
    });
  }

  /**
   * Second step of "Share with…": the characters to choose from.
   *
   * The workspace is fetched here rather than kept loaded, so a library session that
   * never shares anything never asks for it. The menu re-opens at the same point the
   * first one did, which reads as the submenu it stands in for.
   */
  private async openShareMenu(item: Media, x: number, y: number) {
    let characters: ChatCharacter[] = [];
    try {
      characters = (await api.chatWorkspace()).characters ?? [];
    } catch (error) {
      mascotSay((error as Error).message || "Couldn't load your chat characters.", "error");
      return;
    }
    if (!characters.length) {
      mascotSay("No chat characters yet — add one in Chat first.", "error");
      return;
    }
    openMenu({
      x, y, title: `Share "${item.title}" with`,
      items: characters.map((character) => ({
        label: character.name, icon: "person",
        run: () => void this.share(item, character),
      })),
    });
  }

  private async share(item: Media, character: ChatCharacter) {
    try {
      await shareWithCharacter(item, character.id);
      // Only switch once the bytes are in hand: landing in Chat and then failing
      // would leave the user in the wrong view with nothing to show for it.
      this.closeItem();
      this.selectSection("chat");
    } catch (error) {
      mascotSay((error as Error).message || `Couldn't share with ${character.name}.`, "error");
    }
  }

  /**
   * Gives her the picture to keep, staying where you are.
   *
   * The scan is local and takes a moment, so it is announced; the result says which
   * shelf it landed on, because that decides whether she can ever send it — a
   * picture filed as "someone else" is one she remembers but never sends as herself,
   * and the Images panel in Chat is where to correct that.
   */
  private async saveForLater(item: Media) {
    mascotSay(`Saving "${item.title}" for me…`);
    try {
      const image = await saveForCharacter(item, "libby");
      mascotSay(image.subject === "other"
        ? `Kept it. It doesn't look like me, so it's on my "someone else" shelf — tell me otherwise under Chat › Images.`
        : `Kept it — I can send that one later.`);
    } catch (error) {
      mascotSay((error as Error).message || "Couldn't save that for Libby.", "error");
    }
  }

  private shellMenuItems(): MenuItem[] {
    const dark = loadTheme() !== "light";
    return [
      { label: "Add media", icon: "add", run: () => this.toggleUpload() },
      { label: "Import from a URL", icon: "link", run: () => this.openScrape() },
      { label: "Refresh library", icon: "refresh", run: () => void this.refresh() },
      menuDivider,
      { label: "Home", icon: "home", run: () => this.selectSection("home") },
      { label: "Favorites", icon: "favorite", run: () => this.selectSection("favorites") },
      { label: "Chat", icon: "chat_bubble", run: () => this.selectSection("chat") },
      { label: "Create", icon: "auto_awesome", run: () => this.selectSection("imagegen") },
      { label: "Outfit studio", icon: "checkroom", run: () => this.selectSection("studio") },
      menuDivider,
      { label: dark ? "Switch to light theme" : "Switch to dark theme", icon: dark ? "light_mode" : "dark_mode", run: () => this.flipTheme() },
      { label: "Settings", icon: "settings", run: () => this.selectSection("settings") },
    ];
  }

  private flipTheme() {
    const next = loadTheme() === "light" ? "dark" : "light";
    saveTheme(next);
    applyTheme(next);
  }

  /** Deletes one item, used by the tile menu — the bulk bar handles selections. */
  private async deleteOne(id: number) {
    const item = this.items.find((m) => m.id === id);
    if (!item || !confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    this.busy = true;
    try {
      await api.deleteMedia(id);
      if (this.selectedId === id) this.closeItem();
      await this.refresh();
    } catch (err) {
      mascotSay(`Couldn't delete that: ${(err as Error).message}`, "error");
    } finally {
      this.busy = false;
    }
  }

  private onDownloads = (event: CustomEvent<DownloadTask[]>) => {
    this.downloads = event.detail;
  };

  private onDownloadComplete = () => this.refresh();

  // In the viewer, Left/Right page between items and Escape closes it. Guarded so
  // it never fires while typing in the search box or with the upload dialog open.
  // Comics are the exception: there the arrows turn pages (the viewer owns them),
  // so the shell stands down and only Escape still closes.
  private onKey = (e: KeyboardEvent) => {
    if (this.selectedId == null || this.uploadOpen) return;
    if (isTypingTarget(e)) return;
    const reading = this.items.find((m) => m.id === this.selectedId)?.kind === "comic";
    switch (e.key) {
      case "ArrowRight":
        if (reading) return;
        e.preventDefault();
        this.stepItem(1);
        break;
      case "ArrowLeft":
        if (reading) return;
        e.preventDefault();
        this.stepItem(-1);
        break;
      case "Escape":
        this.closeItem();
        break;
    }
  };

  private stepItem = (dir: number) => {
    if (this.selectedId == null) return;
    const i = this.viewerList.indexOf(this.selectedId);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= this.viewerList.length) return;
    this.selectedId = this.viewerList[j];
  };

  /**
   * The query the grid is currently showing, as the server takes it.
   *
   * One place decides what is on screen, so the loader, the "load more" and the
   * cancellation all agree about what they are loading. Section, search box, sort
   * and filter chip are the whole of it.
   */
  private get query(): MediaQuery {
    const search = this.search.trim();
    if (search) return { q: search, sort: this.sort };
    if (this.section === "favorites") return { favorite: true, sort: this.sort };
    if (KIND_ORDER.includes(this.section as Kind)) {
      const kind = this.section as Kind;
      const chip = this.filters[kind];
      return { kind, tag: chip && chip !== "All" ? chip : undefined, sort: this.sort };
    }
    return { sort: this.sort };
  }

  /** A string that changes exactly when the query does, for deciding whether a
   *  page that has arrived still belongs on screen. */
  private queryKey(q: MediaQuery): string {
    return [q.kind ?? "", q.q ?? "", q.tag ?? "", q.favorite ? "fav" : "", q.sort ?? "newest"].join("|");
  }

  /**
   * Loads the first page of the current query, replacing what is on screen.
   *
   * This used to be the whole library: pages of 200 in a loop until the server ran
   * out, held in one tab's memory, because search and favourites were filters applied
   * in the browser. Both are the server's now (see media_search.go), so a screen costs
   * a screenful — and the collection is allowed to be as large as the disk.
   *
   * The in-flight page is cancelled when a newer one starts. Without that, typing in
   * the search box raced its own requests and the grid could settle on the results for
   * a prefix of what had been typed.
   */
  private async reload() {
    const q = this.query;
    const key = this.queryKey(q);
    this.pageAbort?.abort();
    const abort = new AbortController();
    this.pageAbort = abort;
    this.loading = true;
    try {
      const page = await api.listMedia({ ...q, limit: MEDIA_PAGE_SIZE, offset: 0, signal: abort.signal });
      if (this.queryKey(this.query) !== key) return;
      this.items = page.items ?? [];
      this.total = page.total ?? this.items.length;
      this.noteServerFavorites(this.items);
    } catch (err) {
      if (abort.signal.aborted) return;
      mascotSay((err as Error).message || "Couldn't load the library.", "error");
    } finally {
      if (this.pageAbort === abort) this.loading = false;
    }
  }

  /** Appends the next page. Called by the sentinel at the end of the grid. */
  private async loadMore() {
    if (this.loading || this.loadingMore || this.items.length >= this.total) return;
    const q = this.query;
    const key = this.queryKey(q);
    this.loadingMore = true;
    try {
      const page = await api.listMedia({ ...q, limit: MEDIA_PAGE_SIZE, offset: this.items.length });
      // A page that arrives after the query moved on is discarded rather than mixed
      // into results it does not belong to.
      if (this.queryKey(this.query) !== key) return;
      const seen = new Set(this.items.map((m) => m.id));
      this.items = [...this.items, ...(page.items ?? []).filter((m) => !seen.has(m.id))];
      this.total = page.total ?? this.total;
      this.noteServerFavorites(page.items ?? []);
    } catch {
      /* A page that failed to load is retried by scrolling; nothing to say. */
    } finally {
      this.loadingMore = false;
    }
  }

  /**
   * Home's shelves, each a bounded query rather than a slice of the whole library.
   *
   * Nine small requests in parallel, every one of them indexed and none of them larger
   * than a row of twelve tiles. The dashboard used to be derived from the entire
   * collection in memory, which is why it could not draw until all of it had arrived.
   */
  private async loadHome() {
    const abort = new AbortController();
    this.homeAbort?.abort();
    this.homeAbort = abort;
    const row = (q: MediaQuery) =>
      api.listMedia({ ...q, limit: 12, signal: abort.signal }).then((p) => p.items ?? []).catch(() => []);
    try {
      const [stats, resume, favorites, newest, ...kinds] = await Promise.all([
        api.libraryStats(abort.signal).catch(() => null),
        api.resumeShelf(abort.signal).then((r) => r.items ?? []).catch(() => []),
        row({ favorite: true }),
        row({}),
        ...KIND_ORDER.map((k) => row({ kind: k })),
      ]);
      if (abort.signal.aborted) return;
      const byKind = {} as Record<Kind, Media[]>;
      KIND_ORDER.forEach((k, i) => (byKind[k] = kinds[i] ?? []));
      this.stats = stats;
      this.home = { resume, favorites, newest, byKind };
      this.noteServerFavorites([...favorites, ...newest, ...resume]);
    } catch {
      /* Home degrades to whatever shelves did arrive. */
    }
  }

  /** The filter chips for a kind: the tags most of that kind's items carry.
   *
   *  Asked of the server, which can count them. The client used to work them out from
   *  every row it had downloaded, so which chips appeared depended on how much had
   *  loaded. */
  private async loadChips(kind: Kind) {
    try {
      const { items } = await api.topTags(kind, 8);
      if (this.section === kind) this.chipTags = items ?? [];
    } catch {
      this.chipTags = [];
    }
  }

  /**
   * Starts a screen's chunk loading and re-renders when it arrives.
   *
   * Idempotent, and safe to call on every navigation: loadView keeps one promise per
   * chunk, so two quick taps on Chat do not start two fetches.
   */
  private ensureView(section: string) {
    const key = viewKey(section);
    if (!key || this.viewReady.has(key)) return;
    void loadView(section)
      .then(() => {
        // A new Set rather than a mutation: Lit compares by identity.
        this.viewReady = new Set(this.viewReady).add(key);
      })
      .catch(() => {
        mascotSay("That screen failed to load. Try again?", "error");
      });
  }

  /** Whether a screen can be rendered yet. */
  private ready(section: string): boolean {
    const key = viewKey(section);
    return !key || this.viewReady.has(key);
  }

  /** Reloads whatever the current screen is, after something changed it. */
  private refresh() {
    void this.loadHome();
    void this.reload();
    if (KIND_ORDER.includes(this.section as Kind)) void this.loadChips(this.section as Kind);
    void this.loadCollections();
  }

  // --- Navigation / state -------------------------------------------------
  private selectSection(id: Section) {
    if (id === this.section) return;
    // A picture being edited belongs to one visit to Create; coming back later
    // should not reopen it.
    if (id !== "imagegen") this.editMediaId = 0;
    // Switching sections swaps the entire content pane, so a cross-fade is worth having
    // here where an element-level animation would not help. Progressive and skipped
    // under reduced motion; the state change is applied either way. See motion.ts.
    // Fetch the screen's code as the section changes, not before.
    this.ensureView(id);
    withViewTransition(() => {
      this.section = id;
      this.selectedId = null;
      this.search = "";
      // A new section is a new query, so what is on screen goes rather than lingering
      // under the next heading while its replacement loads.
      this.items = [];
      this.total = 0;
      this.openCollection = null;
      // Inside the callback, and after the assignments above. startViewTransition runs
      // what it is given asynchronously, so a load started outside it reads the section
      // the user is leaving — and then has its results wiped by the reset above. That
      // is what made a kind's grid come up empty while its filter chips worked.
      if (id === "home") void this.loadHome();
      else if (id === "collections") void this.loadCollections();
      else void this.reload();
      if (KIND_ORDER.includes(id as Kind)) void this.loadChips(id as Kind);
    });
  }
  /**
   * Opens an item something else asked for.
   *
   * The queue is the whole library rather than whatever grid happens to be on
   * screen: what she linked need not be in the current section at all, and arrow
   * keys paging into a list the item is not part of would be worse than a broad
   * one. Refreshes first if it is unknown here — a link can name something added
   * since this view last loaded.
   */
  private onOpenMedia = async (event: Event) => {
    const { id } = (event as CustomEvent<{ id: number }>).detail;
    if (!this.items.some((item) => item.id === id)) {
      // One item, by id. This used to reload the library to find out whether the id
      // existed — which, while the client held all of it, meant a link Libby sent
      // could cost a full re-fetch of the collection.
      try {
        const item = await api.getMedia(id);
        this.items = [item, ...this.items];
        this.noteServerFavorites([item]);
      } catch {
        mascotSay("That one isn't in the library any more.", "error");
        return;
      }
    }
    this.openItem(id, this.items);
  };

  /** Opens the Create screen with a library picture's settings loaded. */
  private editInStudio(id: number) {
    this.editMediaId = id;
    this.selectedId = null;
    this.selectSection("imagegen");
  }

  private openItem(id: number, list?: Media[]) {
    this.ensureView("viewer");
    if (list && list.length) this.viewerList = list.map((m) => m.id);
    else if (!this.viewerList.includes(id)) this.viewerList = [id];
    // Opening the viewer is a place you can go back from. One history entry per
    // viewer session, however many items are paged through inside it, so the back
    // button — or the phone's back gesture — closes the viewer and lands where you
    // opened it: the chat, with the conversation still there, rather than leaving
    // the app. See onPopState and willUpdate.
    if (!this.viewerPushed) {
      try { history.pushState({ oppaiViewer: true }, ""); this.viewerPushed = true; } catch { /* file: URLs, sandboxed frames */ }
    }
    // What Home's "Jump back in" row is built from. Recorded here rather than in the
    // viewer because this is the one place an item is opened from, whichever screen
    // asked for it. See recents.ts.
    this.recents = noteOpened(id);
    this.selectedId = id;
  }
  private closeItem = () => {
    this.selectedId = null;
  };
  /** Whether the open viewer put an entry on the history stack. */
  private viewerPushed = false;
  /** Back closes the viewer. The flag is cleared first so willUpdate does not pop
      the entry the browser has just popped. */
  private onPopState = () => {
    if (!this.viewerPushed) return;
    this.viewerPushed = false;
    if (this.selectedId != null) this.selectedId = null;
  };
  protected willUpdate(changed: Map<PropertyKey, unknown>) {
    // Every other way of closing the viewer — its own close button, a search, a
    // section change — retires the history entry too, so back never has a dead
    // press to spend on an entry the viewer left behind.
    if (changed.has("selectedId") && this.selectedId == null && this.viewerPushed) {
      this.viewerPushed = false;
      try { history.back(); } catch { /* nothing to go back to */ }
    }
  }
  /**
   * Typing in the search box.
   *
   * Debounced, because each query is now a request: firing one per keystroke would
   * send six for "beach" and leave the grid settling on whichever came back last.
   * reload() cancels the previous request as well, so the pair of them means the
   * server is asked once, for what was actually typed.
   */
  private onSearchInput(e: Event) {
    this.search = (e.target as HTMLInputElement).value;
    this.selectedId = null;
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchDebounce = window.setTimeout(() => void this.reload(), 250);
  }
  private clearSearch() {
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.search = "";
    void this.reload();
  }
  private setFilter(section: string, tag: string) {
    this.filters = { ...this.filters, [section]: tag };
    void this.reload();
  }
  private setSort(sort: MediaSort) {
    if (sort === this.sort) return;
    this.sort = sort;
    void this.reload();
  }
  /**
   * Stars an item, on the server.
   *
   * Favourites used to be a Set in localStorage, which made them per-device: a heart
   * tapped on the desktop was not a heart on the phone, and the Favorites section
   * could only be a filter the browser applied over the whole downloaded library. The
   * media table has had a `favorite` column and the PATCH has accepted it all along.
   *
   * The local Set stays as a mirror of what the loaded rows say, so the heart is drawn
   * without a lookup, and it is updated before the request so the tap feels immediate.
   * A failure puts it back.
   */
  private async toggleFavorite(id: number, e?: Event) {
    e?.stopPropagation();
    const wanted = !this.favorites.has(id);
    this.setLocalFavorite(id, wanted);
    try {
      await api.updateMedia(id, { favorite: wanted });
      // The Favorites grid is a server query now, so an item removed there has to
      // leave the page rather than sit on it with an empty heart.
      if (!wanted && this.query.favorite) {
        this.items = this.items.filter((m) => m.id !== id);
        this.total = Math.max(0, this.total - 1);
      }
      if (this.stats) {
        this.stats = { ...this.stats, favorites: Math.max(0, this.stats.favorites + (wanted ? 1 : -1)) };
      }
    } catch (err) {
      this.setLocalFavorite(id, !wanted);
      mascotSay((err as Error).message || "Couldn't save that.", "error");
    }
  }

  /** Moves the heart without asking the server. */
  private setLocalFavorite(id: number, on: boolean) {
    const next = new Set(this.favorites);
    on ? next.add(id) : next.delete(id);
    this.favorites = next;
    this.items = this.items.map((m) => (m.id === id ? { ...m, favorite: on } : m));
  }

  /** Folds what the server says about a page of rows into the local mirror. */
  private noteServerFavorites(rows: Media[]) {
    if (!rows.length) return;
    const next = new Set(this.favorites);
    let changed = false;
    for (const m of rows) {
      const had = next.has(m.id);
      if (m.favorite && !had) {
        next.add(m.id);
        changed = true;
      } else if (!m.favorite && had) {
        next.delete(m.id);
        changed = true;
      }
    }
    if (changed) this.favorites = next;
  }

  /**
   * Moves a localStorage favourites list onto the server, once.
   *
   * Runs before the first load so the hearts someone spent time on do not vanish the
   * release favourites became server-side. One bulk PATCH, and the local key is
   * cleared so a later device with its own list is migrated on its own first run
   * rather than this one re-uploading a stale set.
   */
  private async migrateLocalFavorites() {
    const local = loadFavorites();
    if (local.size === 0) return;
    try {
      await api.bulkMedia("update", [...local], { favorite: true });
      saveFavorites(new Set());
    } catch {
      /* Left in place to try again next time rather than lost. */
    }
  }

  // --- Collections --------------------------------------------------------
  private async loadCollections() {
    try {
      const { items } = await api.listCollections();
      this.collections = items ?? [];
    } catch {
      this.collections = [];
    }
  }

  private async newCollection(withItems: number[] = []) {
    const name = prompt("Name this collection:");
    if (name == null || !name.trim()) return;
    try {
      const { id } = await api.createCollection(name.trim());
      if (withItems.length) await api.addToCollection(id, withItems);
      await this.loadCollections();
      mascotSay(withItems.length
        ? `Made "${name.trim()}" with ${withItems.length} item${withItems.length === 1 ? "" : "s"}.`
        : `Made "${name.trim()}".`, "success");
    } catch (err) {
      mascotSay((err as Error).message || "Couldn't make that collection.", "error");
    }
  }

  /** The "add to collection" menu: the existing lists, plus making a new one. */
  private openCollectionMenu(ids: number[], x: number, y: number) {
    const add = async (collection: Collection) => {
      try {
        const { added } = await api.addToCollection(collection.id, ids);
        await this.loadCollections();
        mascotSay(added === 0
          ? `Already on "${collection.name}".`
          : `Added ${added} to "${collection.name}".`, "success");
      } catch (err) {
        mascotSay((err as Error).message || "Couldn't add that.", "error");
      }
    };
    openMenu({
      x, y,
      title: ids.length === 1 ? "Add to collection" : `Add ${ids.length} items to…`,
      items: [
        ...this.collections.map((c) => ({
          label: c.name,
          icon: "playlist_add",
          hint: `${c.count} item${c.count === 1 ? "" : "s"}`,
          run: () => void add(c),
        })),
        ...(this.collections.length ? [menuDivider] : []),
        { label: "New collection…", icon: "create_new_folder", run: () => void this.newCollection(ids) },
      ],
    });
  }

  private async openCollectionItems(c: Collection) {
    this.openCollection = c;
    this.search = "";
    this.section = "collections";
    this.loading = true;
    try {
      const page = await api.collectionItems(c.id, MEDIA_PAGE_SIZE, 0);
      this.items = page.items ?? [];
      this.total = page.total ?? this.items.length;
      this.openCollection = page.collection ?? c;
      this.noteServerFavorites(this.items);
    } catch (err) {
      mascotSay((err as Error).message || "Couldn't open that collection.", "error");
    } finally {
      this.loading = false;
    }
  }

  private async removeFromOpenCollection(mediaId: number) {
    const c = this.openCollection;
    if (!c) return;
    try {
      await api.removeFromCollection(c.id, mediaId);
      this.items = this.items.filter((m) => m.id !== mediaId);
      this.total = Math.max(0, this.total - 1);
      await this.loadCollections();
    } catch (err) {
      mascotSay((err as Error).message || "Couldn't take that off.", "error");
    }
  }

  private async renameOpenCollection(c: Collection) {
    const name = prompt("Rename this collection:", c.name);
    if (name == null || !name.trim() || name.trim() === c.name) return;
    try {
      await api.renameCollection(c.id, name.trim());
      this.openCollection = { ...c, name: name.trim() };
      await this.loadCollections();
    } catch (err) {
      mascotSay((err as Error).message || "Couldn't rename that.", "error");
    }
  }

  private async deleteCollection(c: Collection) {
    if (!confirm(`Delete the collection "${c.name}"? The items stay in your library.`)) return;
    try {
      await api.deleteCollection(c.id);
      if (this.openCollection?.id === c.id) {
        this.openCollection = null;
        this.items = [];
        this.total = 0;
      }
      await this.loadCollections();
    } catch (err) {
      mascotSay((err as Error).message || "Couldn't delete that.", "error");
    }
  }

  // --- Bulk selection -----------------------------------------------------
  private toggleSelectMode = () => {
    this.selectMode = !this.selectMode;
    if (!this.selectMode) this.selected = new Set();
  };
  private exitSelect() {
    this.selectMode = false;
    this.selected = new Set();
  }
  private toggleSelected(id: number, e?: Event) {
    e?.stopPropagation();
    const next = new Set(this.selected);
    next.has(id) ? next.delete(id) : next.add(id);
    this.selected = next;
  }
  private async bulkDelete() {
    const ids = [...this.selected];
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} item${ids.length === 1 ? "" : "s"}? This cannot be undone.`))
      return;
    this.busy = true;
    try {
      await api.bulkMedia("delete", ids);
      const line = libbyReact("libraryDelete", { count: ids.length });
      mascotSay(line.message, "success", { emotion: line.emotion, intensity: line.intensity });
      // The favourite went with the row (it is a column on it), so only the local
      // mirror needs clearing.
      const favs = new Set(this.favorites);
      ids.forEach((id) => favs.delete(id));
      this.favorites = favs;
      this.exitSelect();
      await this.refresh();
    } catch (err) {
      console.error("bulk delete", err);
    } finally {
      this.busy = false;
    }
  }
  private async bulkTags(mode: "add" | "remove") {
    const ids = [...this.selected];
    if (!ids.length) return;
    const raw = prompt(
      mode === "add" ? "Add tags (comma-separated):" : "Remove tags (comma-separated):",
    );
    if (raw == null) return;
    const tags = raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (!tags.length) return;
    this.busy = true;
    try {
      await api.bulkMedia("update", ids, mode === "add" ? { addTags: tags } : { removeTags: tags });
      await this.refresh();
    } catch (err) {
      console.error("bulk tags", err);
    } finally {
      this.busy = false;
    }
  }
  private async bulkChangeKind() {
    const ids = [...this.selected];
    if (!ids.length) return;
    const kind = prompt("Change type to (video, gif, image, comic, game):");
    if (kind == null) return;
    const k = kind.trim().toLowerCase();
    if (!KIND_ORDER.includes(k as Kind)) {
      alert(`Unknown type "${k}".`);
      return;
    }
    this.busy = true;
    try {
      await api.bulkMedia("update", ids, { kind: k as Media["kind"] });
      this.exitSelect();
      await this.refresh();
    } catch (err) {
      console.error("bulk kind", err);
    } finally {
      this.busy = false;
    }
  }
  private async bulkFavorite() {
    // One PATCH for the selection. Favourites are the server's now, so this is the
    // same thing the heart on a tile does, in bulk.
    const ids = [...this.selected];
    if (!ids.length) return;
    ids.forEach((id) => this.setLocalFavorite(id, true));
    try {
      await api.bulkMedia("update", ids, { favorite: true });
      if (this.stats) this.stats = { ...this.stats, favorites: this.stats.favorites + ids.length };
    } catch (err) {
      ids.forEach((id) => this.setLocalFavorite(id, false));
      mascotSay((err as Error).message || "Couldn't star those.", "error");
    }
    this.exitSelect();
  }
  private logout() {
    this.dispatchEvent(new CustomEvent("logout", { bubbles: true, composed: true }));
  }

  // --- Upload -------------------------------------------------------------
  private toggleUpload = () => {
    this.uploadOpen = !this.uploadOpen;
    this.dragActive = false;
  };
  private browse() {
    (this.renderRoot.querySelector("#file") as HTMLInputElement)?.click();
  }
  /**
   * Hands the chosen files to the upload manager.
   *
   * This used to be a loop of whole-file POSTs awaited right here, which is why a
   * long video could not survive leaving the screen and why nothing said how far it
   * had got. The queue owns all of that now — progress, retries, resume, and the
   * fact that it keeps going while the user browses somewhere else. Libby's remark
   * and the grid refresh happen when an upload actually lands (see onUploadDone),
   * rather than being the reason to block here.
   */
  private onFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;
    this.uploadOpen = false;
    uploads.add(list);
  }

  /**
   * One upload finished. Refreshes the grid, and lets Libby remark on it.
   *
   * Batched through a short timer because a queue of ten files produces ten of these
   * within a minute, and refetching the library ten times — or having her comment ten
   * times — is worse than useless.
   */
  private onUploadDone = (event: Event) => {
    const detail = (event as CustomEvent<{ id: number; name: string }>).detail;
    this.pendingUploads.push(detail?.id);
    if (this.uploadSettle) clearTimeout(this.uploadSettle);
    this.uploadSettle = window.setTimeout(() => void this.announceUploads(), 900);
  };

  private async announceUploads() {
    const ids = this.pendingUploads.filter((id): id is number => typeof id === "number" && id > 0);
    this.pendingUploads = [];
    if (!ids.length) return;
    // Fetched rather than guessed from the File: the server decides the kind and the
    // title, and one upload is the case where Libby has something specific to say
    // about it — worth a round trip to let her say it. A failure here is not an
    // upload failure, so it costs the detail and nothing else.
    const only = ids.length === 1 ? await api.getMedia(ids[0]).catch(() => undefined) : undefined;
    this.dispatchEvent(new CustomEvent<LibbyItemFacts>("imported", {
      detail: {
        count: ids.length,
        title: only?.title,
        kind: only?.kind,
        tags: only?.tags?.map((tag) => tag.name),
      },
      bubbles: true, composed: true,
    }));
    this.refresh();
  }
  private onFileInput(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files) this.onFiles(input.files);
    input.value = "";
  }
  private onDrop(e: DragEvent) {
    e.preventDefault();
    this.dragActive = false;
    if (e.dataTransfer?.files?.length) this.onFiles(e.dataTransfer.files);
  }
  private openScrape() {
    this.ensureView("scrape");
    this.uploadOpen = false;
    (this.renderRoot.querySelector("oppai-scrape-dialog") as any)?.open();
  }

  // --- Derived view state -------------------------------------------------
  /** Home's shelf for a kind, from the bounded query loadHome made. */
  private itemsForKind(kind: Kind): Media[] {
    return this.home?.byKind[kind] ?? [];
  }

  /**
   * The run of items the viewer is paging through, as records rather than ids — what
   * the arrow keys walk and what the viewer's "up next" carousel is made of.
   *
   * An id whose item has since been deleted is dropped rather than rendered as a hole.
   */
  /**
   * What Libby's drawer is looking at, for whichever screen is showing.
   *
   * The same lists the grid draws, so "what is on screen" means literally that rather
   * than the whole library. Screens with no shelf of their own (settings, the studio,
   * an outside site) fall back to the collection, which is still true — she is beside
   * the user in their library — and is what makes "pick something for me" work from
   * anywhere.
   */
  private onScreenItems(isGrid: boolean, isFavorites: boolean, isSearch: boolean): Media[] {
    // Every grid screen — a kind, favourites, a search, a collection — is now the same
    // thing: the page the server returned for this query. No client-side filtering to
    // repeat, because there is nothing loaded that does not belong on screen.
    if (isGrid || isFavorites || isSearch) return this.items;
    return this.home?.newest ?? this.items;
  }

  private get viewerQueue(): Media[] {
    return this.viewerList
      .map((id) => this.items.find((m) => m.id === id))
      .filter((m): m is Media => m != null);
  }

  render() {
    const hasSearch = this.search.trim().length > 0;
    const isViewer = this.selectedId != null;
    const isSettings = !isViewer && this.section === "settings" && !hasSearch;
    const isBrowse = !isViewer && this.section === "browse" && !hasSearch;
    const isImageGen = !isViewer && this.section === "imagegen" && !hasSearch;
    const isStudio = !isViewer && this.section === "studio" && !hasSearch;
    // Chat stays mounted underneath the viewer rather than being torn down: a link
    // opened from a conversation must come back to that conversation, scrolled where
    // it was, with a reply still generating if one was. It is hidden, not removed.
    const chatMounted = this.section === "chat" && !hasSearch;
    const isChat = !isViewer && chatMounted;
    const isFavorites = !isViewer && this.section === "favorites" && !hasSearch;
    const isCollections = !isViewer && this.section === "collections" && !hasSearch;
    const isHome = !isViewer && this.section === "home" && !hasSearch && !isFavorites;
    const isSearch = !isViewer && hasSearch;
    const isGrid =
      !isViewer && !isHome && !isFavorites && !isCollections && !isSearch && !isSettings &&
      !isBrowse && !isImageGen && !isStudio && !isChat;

    const activeItem = isViewer ? this.items.find((m) => m.id === this.selectedId) ?? null : null;

    let headerTitle = "Library";
    if (isViewer) headerTitle = activeItem ? activeItem.title : "Library";
    else if (isSearch) headerTitle = "Search results";
    else if (isSettings) headerTitle = "Settings";
    else if (isBrowse) headerTitle = "Browse sources";
    else if (isImageGen) headerTitle = "Create";
    else if (isStudio) headerTitle = "Outfit studio";
    // Named after her because she is who you are usually talking to.
    else if (isChat) headerTitle = "Chat with Libby";
    else if (isFavorites) headerTitle = "Favorites";
    else if (isCollections) headerTitle = this.openCollection?.name ?? "Collections";
    else if (isHome) headerTitle = "Library";
    else headerTitle = KIND_META[this.section as Kind]?.label ?? "Library";

    return html`
      ${this.renderNav()}
      <div class="main-col">
        ${this.renderHeader(headerTitle, hasSearch, isViewer, isSettings)}
        <main class=${isChat || isImageGen ? "flush" : ""}>
          ${isHome ? this.renderHome() : nothing}
          ${isSettings
            ? this.ready("settings")
              ? html`<oppai-settings .user=${this.user}
                  @open-studio=${() => this.selectSection("studio")}></oppai-settings>`
              : this.renderViewLoading()
            : nothing}
          ${isBrowse
            ? this.ready("browse")
              ? html`<oppai-browse
                  ?can-add-sites=${!!this.user?.isAdmin}
                  @imported=${() => this.refresh()}
                  @browse-frame-changed=${(event: CustomEvent<typeof this.browseFrame>) => {
                    this.browseFrame = event.detail;
                  }}
                ></oppai-browse>`
              : this.renderViewLoading()
            : nothing}
          ${isImageGen
            ? this.ready("imagegen")
              ? html`<oppai-imagegen .editMedia=${this.editMediaId} @imported=${() => this.refresh()}
                  @open-chat=${() => this.selectSection("chat")}></oppai-imagegen>`
              : this.renderViewLoading()
            : nothing}
          <!-- Keyed so switching between Create and the studio rebuilds the element
               rather than reusing one whose studio setup ran (or did not run) for the
               other mode. They share a draft on purpose; they must not share an
               instance. -->
          ${isStudio
            ? this.ready("studio")
              ? keyed("studio", html`<oppai-imagegen studio @imported=${() => this.refresh()}
                  @open-chat=${() => this.selectSection("chat")}></oppai-imagegen>`)
              : this.renderViewLoading()
            : nothing}
          ${chatMounted
            ? this.ready("chat")
              ? html`<oppai-chat .user=${this.user} style=${isViewer ? "display:none" : ""}
                  @open-section=${(e: CustomEvent<{ section: "studio" | "settings" }>) => this.selectSection(e.detail.section)}></oppai-chat>`
              : this.renderViewLoading()
            : nothing}
          ${isCollections ? this.renderCollections() : nothing}
          ${isGrid || isFavorites || isSearch
            ? this.renderGrid(isGrid, isFavorites, isSearch)
            : nothing}
          ${isViewer && activeItem && !this.ready("viewer") ? this.renderViewLoading() : nothing}
          ${isViewer && activeItem && this.ready("viewer")
            ? html`<oppai-viewer
                .media=${activeItem}
                .queue=${this.viewerQueue}
                .favorite=${this.favorites.has(activeItem.id)}
                @toggle-favorite=${() => this.toggleFavorite(activeItem.id)}
                @navigate=${(e: CustomEvent<{ dir: number }>) => this.stepItem(e.detail.dir)}
                @jump=${(e: CustomEvent<{ id: number }>) => (this.selectedId = e.detail.id)}
                @changed=${() => this.refresh()}
                @deleted=${() => {
                  this.closeItem();
                  this.refresh();
                }}
                @edit-in-studio=${(e: CustomEvent<{ id: number }>) => this.editInStudio(e.detail.id)}
              ></oppai-viewer>`
            : nothing}
          ${isViewer && !activeItem
            ? html`<div class="empty">Item not found.</div>`
            : nothing}
        </main>
      </div>
      <!-- Libby, available from anywhere rather than only on the screen named after
           her. She is told what is on screen so she can react to it; the Chat and
           screen suppresses her, since it already is the conversation. Together is no
           longer a screen — this drawer is the only way in now, which is why it must
           stay available everywhere else. -->
      <oppai-libby-drawer
        .items=${isBrowse
          ? []
          : activeItem
            ? [activeItem, ...this.onScreenItems(isGrid, isFavorites, isSearch)]
            : this.onScreenItems(isGrid, isFavorites, isSearch)}
        .focused=${activeItem}
        .externalItems=${isBrowse ? this.browseFrame.items : []}
        .externalFocused=${isBrowse ? this.browseFrame.focused : null}
        .where=${isBrowse ? this.browseFrame.where : libbyWhere(isSearch ? "search" : this.section)}
        ?suppressed=${isChat}
      ></oppai-libby-drawer>
      ${this.renderUpload()}
      ${this.renderBulkBar()}
      ${this.renderDownloads()}
      ${this.ready("scrape")
        ? html`<oppai-scrape-dialog @imported=${() => this.refresh()}></oppai-scrape-dialog>`
        : nothing}
      <oppai-context-menu></oppai-context-menu>
      <!-- display:none, and only ever reached through the "Add media" button, but a
           control with no name is a control with no name if anything does reach it. -->
      <input id="file" type="file" multiple aria-label="Choose files to add" @change=${this.onFileInput} />
    `;
  }

  private renderDownloads() {
    if (this.downloads.length === 0) return nothing;
    return html`<aside class="download-area" aria-label="Downloads">
      <div class="download-heading">Downloads</div>
      ${this.downloads.slice(0, 5).map((task) => html`
        <div class="download-row">
          <div class="download-ring" style=${`--p:${task.progress}`}>
            <span aria-hidden="true" class="material-symbols-rounded">${task.state === "done" ? "check" : task.state === "error" ? "error" : "download"}</span>
          </div>
          <div class="download-copy">
            <div class="download-title">${task.label}</div>
            <div class="download-status">${task.state === "running"
              ? `${Math.round(task.progress * 100)}% · running in background`
              : task.state === "done" ? "Complete" : task.error || "Failed"}</div>
          </div>
          ${task.state !== "running" ? html`<button class="download-dismiss" title="Dismiss" @click=${() => dismissDownload(task.id)}>
            <span aria-hidden="true" class="material-symbols-rounded">close</span>
          </button>` : nothing}
        </div>`)}
    </aside>`;
  }

  private renderBulkBar() {
    if (!this.selectMode || this.selected.size === 0) return nothing;
    const n = this.selected.size;
    return html`
      <div class="bulk-bar">
        <span class="bulk-count">${n} selected</span>
        <button class="bulk-btn" ?disabled=${this.busy} @click=${() => this.bulkTags("add")}>
          <span aria-hidden="true" class="material-symbols-rounded" style="font-size:18px;">sell</span>Add tags
        </button>
        <button class="bulk-btn" ?disabled=${this.busy} @click=${() => this.bulkTags("remove")}>
          <span aria-hidden="true" class="material-symbols-rounded" style="font-size:18px;">label_off</span>Remove tags
        </button>
        <button class="bulk-btn" ?disabled=${this.busy} @click=${this.bulkChangeKind}>
          <span aria-hidden="true" class="material-symbols-rounded" style="font-size:18px;">category</span>Type
        </button>
        <button class="bulk-btn" ?disabled=${this.busy} @click=${this.bulkFavorite}>
          <span aria-hidden="true" class="material-symbols-rounded" style="font-size:18px;">favorite</span>Favorite
        </button>
        <button
          class="bulk-btn"
          ?disabled=${this.busy}
          @click=${(e: MouseEvent) => this.openCollectionMenu([...this.selected], e.clientX, e.clientY)}
        >
          <span aria-hidden="true" class="material-symbols-rounded" style="font-size:18px;">playlist_add</span>Collection
        </button>
        <button class="bulk-btn danger" ?disabled=${this.busy} @click=${this.bulkDelete}>
          <span aria-hidden="true" class="material-symbols-rounded" style="font-size:18px;">delete</span>Delete
        </button>
        <button class="bulk-btn" @click=${() => this.exitSelect()}>
          <span aria-hidden="true" class="material-symbols-rounded" style="font-size:18px;">close</span>
        </button>
      </div>
    `;
  }

  private renderNav() {
    const initials = (this.user?.username ?? "?").slice(0, 2).toUpperCase();
    const settingsActive = this.section === "settings" && this.selectedId == null;
    return html`
      <nav>
        <button class="logo" title=${isIncognito() ? "Home" : "OppaiLib"}
          @click=${() => this.selectSection("home")}>
          ${logoSVG}
        </button>
        <button class="add-btn" title="Add media" @click=${this.toggleUpload}>
          <span aria-hidden="true" class="material-symbols-rounded" style="font-size:26px;">add</span>
        </button>

        <div class="nav-list">
          ${NAV_SECTIONS.map((n) => {
            const active = this.section === n.id && this.selectedId == null;
            return html`
              <button
                class="nav-item"
                aria-current=${active ? "page" : nothing}
                @click=${() => this.selectSection(n.id)}
              >
                <span
                  class="nav-pill"
                  style="background:${active ? "var(--oppai-primary-container)" : "transparent"};"
                >
                  <span
                    aria-hidden="true" class="material-symbols-rounded ${active ? "fill-icon" : ""}"
                    style="font-size:22px; color:${active ? "var(--oppai-primary-bright)" : "var(--oppai-text-dim)"};"
                    >${n.icon}</span
                  >
                </span>
                <span class="nav-label" style="color:${active ? "var(--oppai-text)" : "var(--oppai-text-muted)"};"
                  >${n.label}</span
                >
              </button>
            `;
          })}
        </div>

        <div class="nav-spacer" style="flex:1;"></div>

        <button
          class="icon-btn nav-utility"
          title="Settings"
          @click=${() => this.selectSection("settings")}
          style="width:48px; height:48px; border-radius:24px; background:${settingsActive
            ? "var(--oppai-primary-container)"
            : "var(--oppai-surface-2)"}; color:${settingsActive
            ? "var(--oppai-primary-bright)"
            : "var(--oppai-text-dim)"};"
        >
          <span aria-hidden="true" class="material-symbols-rounded ${settingsActive ? "fill-icon" : ""}" style="font-size:22px;"
            >settings</span
          >
        </button>
        <button
          class="icon-btn nav-utility"
          title="Sign out (${this.user?.username})"
          @click=${this.logout}
          style="width:40px; height:40px; border-radius:20px; background:var(--oppai-accent); color:var(--oppai-on-accent); font-size:13px; font-weight:600;"
        >
          ${initials}
        </button>
      </nav>
    `;
  }

  private renderHeader(title: string, hasSearch: boolean, isViewer: boolean, isSettings = false) {
    return html`
      <header>
        ${isViewer
          ? html`<button
              class="icon-btn"
              title="Back"
              @click=${this.closeItem}
              style="width:40px; height:40px; border-radius:20px; background:none; color:var(--oppai-text); flex-shrink:0;"
            >
              <span aria-hidden="true" class="material-symbols-rounded" style="font-size:24px;">arrow_back</span>
            </button>`
          : nothing}

        <h1 class="h-title">${title}</h1>

        <div class="searchbox">
          <span aria-hidden="true" class="material-symbols-rounded" style="font-size:20px; color:var(--oppai-text-dim);">search</span>
          <input
            type="search"
            aria-label="Search the library"
            .value=${this.search}
            @input=${this.onSearchInput}
            placeholder="Search titles, tags, notes..."
          />
          ${hasSearch
            ? html`<button
                class="icon-btn"
                aria-label="Clear the search"
                title="Clear the search"
                @click=${this.clearSearch}
                style="background:none; color:var(--oppai-text-dim);"
              >
                <span aria-hidden="true" class="material-symbols-rounded" style="font-size:18px;">close</span>
              </button>`
            : nothing}
        </div>

        <div style="flex:1;"></div>

        ${!isViewer && !isSettings
          ? html`<button
              class="filters-btn header-toggle ${this.selectMode ? "on" : ""}"
              title="Select multiple"
              @click=${this.toggleSelectMode}
            >
              <span aria-hidden="true" class="material-symbols-rounded" style="font-size:18px;"
                >${this.selectMode ? "check_circle" : "check_box_outline_blank"}</span
              >
              <span style="font-size:13px; font-weight:500;">Select</span>
            </button>`
          : nothing}
        ${!isSettings
          ? html`<button class="filters-btn">
              <span aria-hidden="true" class="material-symbols-rounded" style="font-size:18px;">tune</span>
              <span style="font-size:13px; font-weight:500;">Filters</span>
            </button>`
          : nothing}
      </header>
    `;
  }

  /**
   * Home, as a dashboard rather than a list of lists.
   *
   * What it used to be: a greeting and one horizontal row per kind, each showing the
   * twelve newest of that kind. Which meant Home answered exactly one question — what
   * did I import most recently — and answered it five times in a row. Everything a
   * person actually opens this app for (carry on with that thing; what have I got;
   * show me the good stuff) needed the sidebar.
   *
   * So it leads with one item at full width, then the two rows that are about *you*
   * rather than about the import date — what you were in the middle of, and what
   * you've starred — and only then the per-kind rows that were the whole page before.
   * A strip of counts sits under the hero because "1,204 items, 38 GB" is the other
   * thing a library page is for and nothing in this app said it.
   *
   * Every section renders only when it has something in it: a new install shows the
   * hero and Recently added and nothing else, rather than four empty headings.
   */
  private renderHome() {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

    if (!this.home) {
      return html`<div class="empty">Loading your library…</div>`;
    }
    if ((this.stats?.total ?? this.home.newest.length) === 0) {
      return html`<div>
        <h2 class="greeting">${greeting}</h2>
        <p class="greeting-sub">Your library is empty — add media or import from a URL.</p>
        <div class="empty">
          <span aria-hidden="true" class="material-symbols-rounded" style="font-size:40px; display:block; margin-bottom:12px;"
            >library_add</span
          >
          <div style="font-size:14px;">Nothing here yet.</div>
        </div>
      </div>`;
    }

    const newest = this.home.newest;
    // Two "carry on" lists, and they answer different questions. The server's knows
    // where you were in something and is the same on every device; recents.ts knows
    // what this device opened, however briefly. The server's leads, and what it does
    // not cover is filled in from the device's own memory.
    const resumeRow = this.home.resume;
    const openedHere = recentlyOpened(newest, this.recents).slice(0, 12);
    const continueRow = resumeRow.length ? resumeRow : openedHere;
    // The hero is what you last opened, because the most likely reason you are here is
    // to carry on with it. Falls back to the newest import on a fresh device, which is
    // the only other thing we can honestly claim to know you want.
    const hero = continueRow[0] ?? newest[0];
    const favorites = this.home.favorites;
    // Counted by the server. This was worked out from the library in browser memory,
    // and "added this week" compared a millisecond clock against the server's seconds,
    // so it always read zero.
    const addedThisWeek = this.stats?.thisWeek ?? 0;

    const kindRows = KIND_ORDER.map((k) => ({
      kind: k,
      label: KIND_META[k].label,
      icon: KIND_META[k].icon,
      items: this.itemsForKind(k),
    })).filter((r) => r.items.length > 0);

    const row = (
      title: string,
      icon: string,
      items: Media[],
      seeAll: (() => void) | null,
      delay: number,
      sub?: string,
    ) => items.length === 0 ? nothing : html`
      <section class="row anim-rise" style="animation-delay:${delay}ms;">
        <div class="row-head">
          <span aria-hidden="true" class="material-symbols-rounded" style="font-size:22px; color:var(--oppai-primary-bright);">${icon}</span>
          <h3 class="row-title">${title}</h3>
          ${sub ? html`<span class="row-sub">${sub}</span>` : nothing}
          ${seeAll ? html`<button class="see-all" @click=${seeAll}>
            See all<span aria-hidden="true" class="material-symbols-rounded" style="font-size:16px;">chevron_right</span>
          </button>` : nothing}
        </div>
        <div class="row-scroll">${items.map((m) => this.renderTile(m, "200px", undefined, items))}</div>
      </section>`;

    return html`
      <div>
        <h2 class="greeting anim-rise">${greeting}</h2>
        <p class="greeting-sub anim-rise" style="animation-delay:40ms;">
          ${continueRow.length ? "Pick up where you left off" : "Here's what's new across your library"}
        </p>

        ${hero ? html`
          <section class="hero anim-rise" style="animation-delay:70ms;">
            <button class="hero-art" @click=${() => this.openItem(hero.id, newest)}
              aria-label=${`Open ${hero.title}`}>
              ${hero.hasThumb
                ? html`<img src=${api.thumbURL(hero.id)} alt="" loading="lazy" />`
                : html`<span aria-hidden="true" class="material-symbols-rounded hero-icon">${KIND_META[hero.kind].icon}</span>`}
            </button>
            <div class="hero-body">
              <span class="hero-eyebrow">
                ${continueRow.length ? "Continue" : "Latest addition"} · ${KIND_META[hero.kind].label}
              </span>
              <h3 class="hero-title">${hero.title}</h3>
              ${hero.tags?.length
                ? html`<div class="hero-tags">${hero.tags.slice(0, 6).map((t) => html`<span>${t.name}</span>`)}</div>`
                : nothing}
              <div class="hero-acts">
                <button class="hero-open" @click=${() => this.openItem(hero.id, newest)}>
                  <span aria-hidden="true" class="material-symbols-rounded">play_arrow</span>
                  ${continueRow.length ? "Carry on" : "Open"}
                </button>
                <button class="hero-more" @click=${() => this.selectSection(hero.kind)}>
                  More ${KIND_META[hero.kind].label.toLowerCase()}
                </button>
              </div>
            </div>
          </section>

          <!-- Every figure here is counted by the server (GET /api/media/stats).
               They used to be derived from the library in browser memory, which is
               why the dashboard could not draw until all of it had arrived. -->
          <div class="stats anim-rise" style="animation-delay:90ms;">
            <button class="stat" @click=${() => this.selectSection("home")}>
              <strong>${(this.stats?.total ?? 0).toLocaleString()}</strong><span>items</span></button>
            <button class="stat" @click=${() => this.selectSection("favorites")}>
              <strong>${(this.stats?.favorites ?? 0).toLocaleString()}</strong><span>favourites</span></button>
            <div class="stat">
              <strong>${formatBytes(this.stats?.bytes ?? 0)}</strong><span>stored</span></div>
            <div class="stat">
              <strong>${addedThisWeek.toLocaleString()}</strong><span>added this week</span></div>
          </div>` : nothing}

        ${row("Jump back in", "history", continueRow, null, 120,
          resumeRow.length ? "Where you left off, on any device" : "What you've opened on this device")}
        ${row("Favourites", "star", favorites, () => this.selectSection("favorites"), 170)}
        ${row("Recently added", "new_releases", newest.slice(0, 12), null, 220)}

        ${kindRows.map((r, i) => row(r.label, r.icon, r.items, () => this.selectSection(r.kind), 270 + i * 60))}
      </div>
    `;
  }

  /**
   * The grid: one page of a server-side query, with the rest fetched as it is
   * reached.
   *
   * Everything here used to be worked out from the whole library in memory — the
   * filter, the favourites, the search, the item count, even which filter chips
   * existed. All five are the server's answers now, which is what lets this screen
   * cost a screenful instead of a collection.
   */
  private renderGrid(isGrid: boolean, isFavorites: boolean, isSearch: boolean) {
    const kind = isGrid ? (this.section as Kind) : null;
    const title = isFavorites
      ? "Favorites"
      : isSearch
        ? "Search results"
        : (KIND_META[kind as Kind]?.label ?? "");
    const gridItems = this.items;
    // The server's count of everything matching, not the length of what has loaded.
    const count = this.loading
      ? "Loading…"
      : this.total === gridItems.length
        ? `${this.total.toLocaleString()} ${this.total === 1 ? "item" : "items"}`
        : `${gridItems.length.toLocaleString()} of ${this.total.toLocaleString()}`;

    const activeChip = kind ? (this.filters[kind] ?? "All") : "All";
    const chips = kind
      ? ["All", ...this.chipTags.map((t) => t.name)].map((label) => ({
          label,
          active: activeChip === label,
        }))
      : [];

    return html`
      <div>
        <div class="grid-head">
          <h2 class="grid-title">${title}</h2>
          <span class="grid-count">${count}</span>
          ${this.renderSort()}
        </div>

        ${chips.length > 1
          ? html`<div class="chips" role="group" aria-label="Filter by tag">
              ${chips.map(
                (c) => html`<button
                  class="chip"
                  aria-pressed=${c.active ? "true" : "false"}
                  @click=${() => this.setFilter(this.section, c.label)}
                  style="background:${c.active ? "var(--oppai-accent)" : "transparent"}; color:${c.active
                    ? "var(--oppai-on-accent)"
                    : "var(--oppai-text-dim)"}; border:1px solid ${c.active ? "var(--oppai-accent)" : "var(--oppai-border-strong)"};"
                >
                  ${c.active
                    ? html`<span aria-hidden="true" class="material-symbols-rounded" style="font-size:16px;">check</span>`
                    : nothing}
                  ${c.label}
                </button>`,
              )}
            </div>`
          : html`<div style="height:24px;"></div>`}

        ${gridItems.length === 0
          ? this.loading
            ? html`<div class="empty" aria-busy="true">Loading…</div>`
            : html`<div class="empty">
                <span aria-hidden="true" class="material-symbols-rounded" style="font-size:40px; display:block; margin-bottom:12px;"
                  >${isFavorites ? "favorite_border" : "search_off"}</span
                >
                <div style="font-size:14px;">
                  ${isFavorites
                    ? "No favorites yet. Tap the heart on any item."
                    : "No items match your search or filter."}
                </div>
              </div>`
          : html`<div
                class="grid"
                role="list"
                aria-label=${title}
                aria-busy=${this.loading ? "true" : "false"}
              >
                ${gridItems.map((m, i) => this.renderTile(m, "100%", i, gridItems))}
              </div>
              ${this.renderMore()}`}
      </div>
    `;
  }

  /** The gap between asking for a screen and having its code. */
  private renderViewLoading() {
    return html`<div class="empty" role="status" aria-live="polite">
      <md-circular-progress indeterminate style="--md-circular-progress-size:36px"></md-circular-progress>
    </div>`;
  }

  /** How the grid is ordered. Four orders, none by title: titles are encrypted, so
   *  the server cannot sort by one. */
  private renderSort() {
    const options: { id: MediaSort; label: string }[] = [
      { id: "newest", label: "Newest first" },
      { id: "oldest", label: "Oldest first" },
      { id: "rating", label: "Highest rated" },
      { id: "largest", label: "Largest first" },
    ];
    return html`<label class="sort">
      <span class="sort-label">Sort</span>
      <select
        aria-label="Sort order"
        @change=${(e: Event) => this.setSort((e.target as HTMLSelectElement).value as MediaSort)}
      >
        ${options.map((o) => html`<option value=${o.id} ?selected=${o.id === this.sort}>${o.label}</option>`)}
      </select>
    </label>`;
  }

  /**
   * The end of the loaded pages.
   *
   * A sentinel the observer in updated() watches, so the next page is asked for before
   * this one runs out, with a button behind it for anyone whose browser or settings
   * make the observer moot. It is also the honest place to say there is no more, which
   * a grid that had quietly stopped at its first 50 rows could not.
   */
  private renderMore() {
    if (this.items.length >= this.total) {
      return this.total > MEDIA_PAGE_SIZE
        ? html`<div class="more-end" role="status">That is everything — ${this.total.toLocaleString()} items.</div>`
        : nothing;
    }
    return html`<div class="more-sentinel" role="status" aria-live="polite">
      ${this.loadingMore
        ? html`<span>Loading more…</span>`
        : html`<button class="more-btn" @click=${() => void this.loadMore()}>Show more</button>`}
    </div>`;
  }

  /**
   * Collections: the lists, or the one that is open.
   *
   * The open list is drawn with the same tiles as every other grid, in the collection's
   * own order — which is the whole point of it, and the one thing a tag cannot say.
   * Items can be taken off here; deleting the collection never touches what was on it.
   */
  private renderCollections() {
    const open = this.openCollection;
    if (open) {
      return html`
        <div>
          <div class="grid-head">
            <button
              class="see-all"
              @click=${() => {
                this.openCollection = null;
                this.items = [];
                this.total = 0;
              }}
            >
              <span aria-hidden="true" class="material-symbols-rounded" style="font-size:16px;">chevron_left</span>All
              collections
            </button>
            <h2 class="grid-title">${open.name}</h2>
            <span class="grid-count">
              ${open.count.toLocaleString()} ${open.count === 1 ? "item" : "items"}
            </span>
            <button class="see-all" @click=${() => void this.renameOpenCollection(open)}>Rename</button>
            <button class="see-all" @click=${() => void this.deleteCollection(open)}>Delete</button>
          </div>
          ${this.items.length === 0
            ? html`<div class="empty">
                ${this.loading
                  ? "Loading…"
                  : "Nothing on this collection yet — add items from a tile's menu."}
              </div>`
            : html`<div class="grid" role="list" aria-label=${open.name}>
                ${this.items.map((m, i) => this.renderTile(m, "100%", i, this.items))}
              </div>`}
        </div>
      `;
    }
    return html`
      <div>
        <div class="grid-head">
          <h2 class="grid-title">Collections</h2>
          <span class="grid-count">${this.collections.length.toLocaleString()}</span>
          <button class="see-all" @click=${() => void this.newCollection()}>
            <span aria-hidden="true" class="material-symbols-rounded" style="font-size:16px;">add</span>New
          </button>
        </div>
        ${this.collections.length === 0
          ? html`<div class="empty">
              <span
                aria-hidden="true" class="material-symbols-rounded"
                style="font-size:40px; display:block; margin-bottom:12px;"
                >bookmarks</span
              >
              <div style="font-size:14px;">
                No collections yet. A collection is a list in an order you choose — a series to
                read through, a set to work along.
              </div>
            </div>`
          : html`<div class="grid" role="list" aria-label="Collections">
              ${this.collections.map(
                (c) => html`<div
                  class="tile"
                  role="listitem"
                  tabindex="0"
                  aria-label=${`${c.name}, ${c.count} ${c.count === 1 ? "item" : "items"}`}
                  @click=${() => void this.openCollectionItems(c)}
                  @keydown=${(e: KeyboardEvent) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      void this.openCollectionItems(c);
                    }
                  }}
                  @contextmenu=${(e: MouseEvent) => {
                    e.preventDefault();
                    openMenu({
                      x: e.clientX, y: e.clientY, title: c.name,
                      items: [
                        { label: "Open", icon: "open_in_full", run: () => void this.openCollectionItems(c) },
                        { label: "Rename…", icon: "edit", run: () => void this.renameOpenCollection(c) },
                        menuDivider,
                        { label: "Delete collection", icon: "delete", danger: true,
                          hint: "the items stay in your library",
                          run: () => void this.deleteCollection(c) },
                      ],
                    });
                  }}
                >
                  <div
                    class="tile-media"
                    style="width:100%; aspect-ratio:1; background:var(--oppai-surface-2); display:grid; place-items:center;"
                  >
                    ${c.cover
                      ? html`<img src=${api.thumbURL(c.cover)} alt="" loading="lazy" />`
                      : html`<span aria-hidden="true" class="material-symbols-rounded" style="font-size:34px; color:var(--oppai-text-dim);"
                          >bookmarks</span
                        >`}
                  </div>
                  <div class="tile-meta">
                    <div class="tile-title">${c.name}</div>
                    <div class="tile-tag">${c.count} ${c.count === 1 ? "item" : "items"}</div>
                  </div>
                </div>`,
              )}
            </div>`}
      </div>
    `;
  }

  private renderTile(m: Media, width: string, index?: number, list?: Media[]) {
    const meta = KIND_META[m.kind];
    const fav = this.favorites.has(m.id);
    const stat = statFor(m);
    // Grid tiles (index provided) fade+rise in with a capped stagger; home-row
    // tiles inherit their section's entrance instead.
    const anim = index != null ? "anim-rise" : "";
    const delay = index != null ? `animation-delay:${Math.min(index, 12) * 45}ms;` : "";
    const isSel = this.selected.has(m.id);
    const cls = `tile ${anim} ${this.selectMode ? "selecting" : ""} ${isSel ? "selected" : ""}`;
    return html`
      <div
        class=${cls}
        data-id=${m.id}
        role=${index != null ? "listitem" : "button"}
        tabindex="0"
        aria-label=${`${m.title}${stat ? `, ${stat}` : ""}, ${meta.typeLabel}`}
        aria-pressed=${this.selectMode ? (isSel ? "true" : "false") : nothing}
        @click=${() => (this.selectMode ? this.toggleSelected(m.id) : this.openItem(m.id, list))}
        @keydown=${(e: KeyboardEvent) => {
          // Enter and Space open, the same as a click. A grid of items you can see but
          // cannot reach without a mouse is not a grid a keyboard user can use at all.
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          if (this.selectMode) this.toggleSelected(m.id);
          else this.openItem(m.id, list);
        }}
        style="flex-shrink:0; width:${width}; ${delay}"
      >
        <div
          class="tile-media"
          style="width:100%; aspect-ratio:${meta.aspect}; background:${swatchFor(m)};"
        >
          ${hasThumbnail(m)
            ? html`<img loading="lazy" src=${api.thumbURL(m.id)} alt=${m.title} />`
            : html`<div class="tile-overlay">
                <span aria-hidden="true" class="material-symbols-rounded" style="font-size:30px; color:#fff;"
                  >${meta.icon}</span
                >
                <span class="type-label">${meta.typeLabel}</span>
              </div>`}
          ${this.selectMode
            ? html`<div class="select-check ${isSel ? "on" : ""}">
                ${isSel
                  ? html`<span aria-hidden="true" class="material-symbols-rounded">check</span>`
                  : nothing}
              </div>`
            : html`<button
                class="fav-btn ${fav ? "is-fav" : ""}"
                aria-label=${fav ? `Remove ${m.title} from favourites` : `Add ${m.title} to favourites`}
                aria-pressed=${fav ? "true" : "false"}
                title=${fav ? "Remove from favourites" : "Add to favourites"}
                @click=${(e: Event) => this.toggleFavorite(m.id, e)}
              >
                <span
                  aria-hidden="true" class="material-symbols-rounded fill-icon"
                  style="font-size:18px; color:${fav ? "var(--oppai-fav)" : "rgba(255,255,255,0.9)"};"
                  >${fav ? "favorite" : "favorite_border"}</span
                >
              </button>`}
          ${stat ? html`<span class="tile-stat">${stat}</span>` : nothing}
        </div>
        <div class="tile-meta">
          <div class="tile-title">${m.title}</div>
          <div class="tile-tag">${primaryTag(m)}</div>
        </div>
      </div>
    `;
  }

  private renderUpload() {
    if (!this.uploadOpen) return nothing;
    return html`
      <div class="scrim" @click=${this.toggleUpload}>
        <div class="dialog" @click=${(e: Event) => e.stopPropagation()}>
          <h2>Upload media</h2>
          <div
            class="dropzone ${this.dragActive ? "drag" : ""}"
            @click=${this.browse}
            @dragover=${(e: DragEvent) => {
              e.preventDefault();
              this.dragActive = true;
            }}
            @dragleave=${() => (this.dragActive = false)}
            @drop=${this.onDrop}
          >
            <span aria-hidden="true" class="material-symbols-rounded" style="font-size:36px; display:block; margin-bottom:10px;"
              >upload_file</span
            >
            <div style="font-size:14px;">Drag files here, or click to browse</div>
            <div style="font-size:12px; color:var(--oppai-text-muted); margin-top:4px;">
              Photos, GIFs, videos, games, comics
            </div>
          </div>
          <button class="link-btn" @click=${this.openScrape}>or import from a URL</button>
          <div class="dialog-actions">
            <button class="btn-text" @click=${this.toggleUpload}>Cancel</button>
            <button class="btn-filled" @click=${this.browse}>Choose files</button>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oppai-library": OppaiLibrary;
  }
}
