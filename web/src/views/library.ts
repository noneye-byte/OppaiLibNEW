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
  type Bookmark,
  type SourceItem,
  type TagCount,
  type User,
} from "../api.js";
import { canShare, saveForCharacter, shareWithCharacter } from "../chat-share.js";
import { attachLongPress } from "../long-press.js";
import { isPickClick, pickClick } from "../pick-range.js";
import { formatMoment, OPEN_MEDIA_EVENT } from "../chat-links.js";
import { isExplicit, loadSafeMode, safeKeyAction, saveSafeMode } from "../safe-mode.js";
import {
  activeFilterCount, buildQuery, filterScope, filtersApply, NO_FILTERS, type LibraryFilters,
} from "../library-filters.js";
import { libbyReact, type LibbyItemFacts } from "../libby-voice.js";
import { DEFAULT_LIBBY_PFP, libbyHidden } from "../libby.js";
import {
  compactCount, DENSITY_LABEL, DENSITY_MIN, DENSITY_PHONE_COLUMNS, isLibrarySection, loadDensity, loadNavWidth,
  navIsRail, nextDensity, phoneTabFor, saveDensity, saveNavWidth, type Density, type NavWidth, type PhoneTab,
} from "../shell-prefs.js";
import { loadLayout } from "../studio-session.js";
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
import { suggestionLine } from "../suggested.js";
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
  // The Games section's other faces — itch.io, F95zone, updates waiting — are one
  // module, fetched when a face other than the library is first picked.
  gamebrowse: () => import("./game-browse.js"),
};

/** Which chunk a section lives in. Create and the studio are one module in two modes,
 *  so both map to the same key. */
type ViewKey = "settings" | "browse" | "imagegen" | "chat" | "viewer" | "scrape" | "gamebrowse";
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

type GameFace = "library" | "itch" | "f95" | "updates";

const GAME_FACES: { id: GameFace; label: string; icon: string }[] = [
  { id: "library", label: "Library", icon: "sports_esports" },
  { id: "itch", label: "itch.io", icon: "travel_explore" },
  { id: "f95", label: "F95zone", icon: "travel_explore" },
  { id: "updates", label: "Updates", icon: "update" },
];

/** Image and Video are one studio element in two modes; the nav names both. */
type CreateMode = "image" | "video";

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
    /** Libby Suggested: what she picked, and the tags that did the most to pick it. */
    suggested: Media[];
    because: string[];
    favorites: Media[];
    newest: Media[];
    byKind: Record<Kind, Media[]>;
    /** The latest bookmarked moments across the library. See handlers_bookmarks.go. */
    moments: Bookmark[];
  } | null = null;
  /** A moment to open the next viewer at — a bookmark handed over in chat, or one
      picked off the Moments row. Cleared once the viewer has it. */
  @state() private viewerStartAt = 0;
  /** The safe toggle: explicit tiles veiled, Libby off screen. Per device. */
  @state() private safe = loadSafeMode();
  /** The filter chips for the current kind, counted by the server. */
  @state() private chipTags: TagCount[] = [];
  /** Named, ordered lists. The tables were in the schema from the first commit with
   *  nothing to reach them; see handlers_collections.go. */
  @state() private collections: Collection[] = [];
  /** Which face of the Games section is showing: the shelf, one of the two
   *  catalogues, or the updates waiting. The catalogues are not the library — nothing
   *  is in it until added — but they are how games get onto the shelf, and a game's
   *  update is a fact about the shelf, so all four live under the one tab. */
  @state() private gameFace: GameFace = "library";

  /** Which collection is open, when the section is "collections". */
  @state() private openCollection: Collection | null = null;
  /** What has been opened on this device, newest first. Feeds Home's hero, and tells
      Libby Suggested what has been seen. Per-device and client-owned; see recents.ts. */
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
  /** Grid tile size, per device. */
  @state() private density: Density = loadDensity();
  /** The sidebar width the user chose, or null for the shell's own (see navIsRail). */
  @state() private navPref: NavWidth | null = loadNavWidth();
  /** Too narrow for the open sidebar beside a grid. */
  @state() private narrow = window.matchMedia("(max-width: 1180px)").matches;
  /** Which of the studio's modes the Create items light; the studio reports its own. */
  @state() private createMode: CreateMode = loadLayout().mode;
  /** A mode the nav asked the studio for, not yet taken up. See go(). */
  @state() private createRequest: { mode: CreateMode } | null = null;
  /** The phone's More sheet. */
  @state() private moreOpen = false;
  /** Where the phone's Library and Create tabs go back to. */
  private lastLibrary: Section = "home";
  private lastCreate: Section = "imagegen";
  private narrowQuery = window.matchMedia("(max-width: 1180px)");
  private onNarrow = (e: MediaQueryListEvent) => (this.narrow = e.matches);
  @state() private selectedId: number | null = null;
  /** A library picture handed to the Create screen to be redone. See studioEditable. */
  @state() private editMediaId = 0;
  /** The Settings panel to open on, when another screen sends someone to one. */
  @state() private settingsTab: "imagegen" | "" = "";
  @state() private search = "";
  @state() private filters: Record<string, string> = {};
  /** The header's Filters menu: kind, favourites and a minimum rating, on top of
   *  whatever the section and the chip decide. See library-filters.ts. */
  @state() private refine: LibraryFilters = NO_FILTERS;
  @state() private filtersOpen = false;
  @state() private favorites = loadFavorites();
  @state() private uploadOpen = false;
  @state() private dragActive = false;
  @state() private selectMode = false;
  @state() private selected = new Set<number>();
  /** The tile a Shift-click range runs from; see pick-range.ts. */
  private pickAnchor: number | null = null;
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
        --side-w: 248px;
      }
      button {
        font-family: inherit;
      }
      .also-title, .also-sub { display: block; }
      input::placeholder {
        color: var(--oppai-text-muted);
      }

      /* ── The sidebar ────────────────────────────────────────────────────
         Grouped in the order the app is for: the library first, then the people you
         talk to, then the studios. Open, it names everything and counts the library;
         as a rail it is the same list as icons, its group headings drawn as rules so
         the three groups still read as three. */
      nav.side {
        width: var(--side-w);
        flex-shrink: 0;
        height: 100%;
        box-sizing: border-box;
        overflow: hidden;
        background: var(--oppai-nav);
        border-right: 1px solid var(--oppai-border);
        display: flex;
        flex-direction: column;
        padding: 14px 12px max(12px, env(safe-area-inset-bottom));
        gap: 12px;
        transition: width 0.22s var(--oppai-ease-emphasized), padding 0.22s var(--oppai-ease-emphasized);
      }
      nav.side.rail {
        --side-w: 72px;
        padding-inline: 10px;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 10px;
        height: 40px;
        padding: 0 6px;
        flex-shrink: 0;
      }
      .rail .brand { justify-content: center; padding: 0; }
      /* The mark, inlined so it takes currentColor and follows the theme. */
      .logo {
        width: 32px;
        height: 32px;
        padding: 0;
        border: none;
        background: none;
        cursor: pointer;
        flex-shrink: 0;
        color: var(--oppai-primary);
        transition: transform 0.22s var(--oppai-ease-spring), color 0.2s ease;
      }
      .logo:hover { transform: scale(1.08); color: var(--oppai-primary-bright); }
      .logo svg { width: 100%; height: 100%; display: block; }
      .wordmark {
        font-size: 17px;
        font-weight: 700;
        letter-spacing: -0.01em;
        white-space: nowrap;
      }
      .rail .wordmark { display: none; }
      .add-btn {
        height: 44px;
        flex-shrink: 0;
        border-radius: 12px;
        border: none;
        background: var(--oppai-primary);
        color: var(--oppai-on-primary);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 6px 18px color-mix(in srgb, var(--oppai-primary) 20%, transparent);
        transition: filter 0.15s ease, transform 0.2s var(--oppai-ease-spring);
      }
      .add-btn:hover { filter: brightness(1.06); transform: translateY(-1px); }
      .add-btn:active { transform: scale(0.97); }
      .add-btn .material-symbols-rounded { font-size: 22px; }
      .rail .add-label { display: none; }
      .nav-list {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        overscroll-behavior: contain;
        scrollbar-width: none;
        display: flex;
        flex-direction: column;
        gap: 16px;
        margin: 2px -4px 0;
        padding: 0 4px;
      }
      .nav-list::-webkit-scrollbar { display: none; }
      /* None of these may shrink. In a scrolling flex column a child that can shrink
         does, rather than overflow: the rail crushed Video to a row of dots and lost
         Sprites off the bottom before anything scrolled. */
      .nav-group { display: flex; flex-direction: column; gap: 1px; flex-shrink: 0; }
      .nav-heading {
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--oppai-text-muted);
        padding: 2px 10px 6px;
        white-space: nowrap;
      }
      .rail .nav-heading {
        height: 1px;
        padding: 0;
        margin: 0 12px 8px;
        background: var(--oppai-border-strong);
        color: transparent;
        overflow: hidden;
      }
      .rail .nav-group:first-child .nav-heading { display: none; }
      .nav-item {
        position: relative;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        height: 38px;
        padding: 0 10px;
        border: none;
        border-radius: 10px;
        background: none;
        color: var(--oppai-text-dim);
        font-size: 14px;
        font-weight: 500;
        text-align: left;
        cursor: pointer;
        transition: background 0.15s ease, color 0.15s ease;
      }
      .nav-item:hover { background: var(--oppai-nav-hover); color: var(--oppai-text); }
      .nav-item:active { transform: scale(0.98); }
      .nav-item.on { background: var(--oppai-selected); color: var(--oppai-text); font-weight: 600; }
      .nav-item.on::before {
        content: "";
        position: absolute;
        left: -12px;
        top: 9px;
        bottom: 9px;
        width: 3px;
        border-radius: 0 3px 3px 0;
        background: var(--oppai-primary);
      }
      .rail .nav-item.on::before { left: -10px; }
      .nav-item .material-symbols-rounded { font-size: 21px; flex-shrink: 0; }
      .nav-item.on .material-symbols-rounded { color: var(--oppai-primary); }
      .nav-label { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .nav-count {
        font-size: 12px;
        color: var(--oppai-text-muted);
        font-variant-numeric: tabular-nums;
      }
      .nav-item.on .nav-count { color: inherit; opacity: 0.75; }
      .nav-avatar {
        width: 22px;
        height: 22px;
        flex-shrink: 0;
        border-radius: 50%;
        object-fit: cover;
        object-position: top;
        background: var(--oppai-surface-2);
      }
      .nav-item.on .nav-avatar { box-shadow: 0 0 0 2px var(--oppai-primary); }
      .rail .nav-item { justify-content: center; padding: 0; height: 40px; }
      .rail .nav-label, .rail .nav-count { display: none; }

      .side-foot {
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding-top: 10px;
        border-top: 1px solid var(--oppai-border);
      }
      /* What the vault holds, and that it is locked. The lock is the brand promise, so
         it is said quietly in the one place that is always on screen. */
      .vault {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 4px 10px;
        color: var(--oppai-text-muted);
        font-size: 12px;
        line-height: 1.35;
      }
      .vault .material-symbols-rounded { font-size: 18px; color: var(--oppai-primary); flex-shrink: 0; }
      .vault strong { display: block; color: var(--oppai-text-dim); font-weight: 600; font-size: 12.5px; }
      .rail .vault { display: none; }
      .foot-row { display: flex; align-items: center; gap: 4px; }
      .rail .foot-row { flex-direction: column; gap: 6px; }
      .foot-btn {
        width: 36px;
        height: 36px;
        flex-shrink: 0;
        border-radius: 10px;
        border: none;
        background: none;
        color: var(--oppai-text-dim);
        display: grid;
        place-items: center;
        cursor: pointer;
        transition: background 0.15s ease, color 0.15s ease;
      }
      .foot-btn:hover { background: var(--oppai-nav-hover); color: var(--oppai-text); }
      .foot-btn.on { background: var(--oppai-selected); color: var(--oppai-primary-bright); }
      .foot-btn .material-symbols-rounded { font-size: 20px; }
      .account {
        flex: 1;
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 10px;
        height: 40px;
        padding: 0 6px;
        border: none;
        border-radius: 10px;
        background: none;
        color: var(--oppai-text);
        text-align: left;
        cursor: pointer;
      }
      .account:hover { background: var(--oppai-nav-hover); }
      .avatar {
        width: 30px;
        height: 30px;
        flex-shrink: 0;
        border-radius: 50%;
        background: var(--oppai-accent);
        color: var(--oppai-on-accent);
        display: grid;
        place-items: center;
        font-size: 12px;
        font-weight: 700;
      }
      .account-text { min-width: 0; display: grid; }
      .account-name { font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .account-sub { font-size: 11px; color: var(--oppai-text-muted); }
      .rail .account { flex: none; width: 40px; padding: 0; justify-content: center; }
      .rail .account-text { display: none; }
      .icon-btn {
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }

      /* ── The main column ─────────────────────────────────────────────── */
      .main-col {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        height: 100%;
        position: relative;
      }
      /* The top bar is the library's: a title, the search and the grid's tools. The
         workspaces (Chat, the studios, Settings) bring headers of their own, and a
         library search box over a conversation was a second header saying nothing. */
      header.top {
        height: 64px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 0 28px;
        border-bottom: 1px solid var(--oppai-border);
      }
      .h-titles { display: flex; align-items: baseline; gap: 10px; min-width: 0; flex-shrink: 1; }
      .h-title {
        font-size: 20px;
        font-weight: 600;
        letter-spacing: -0.01em;
        margin: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 340px;
      }
      .h-count { font-size: 13px; color: var(--oppai-text-muted); white-space: nowrap; font-variant-numeric: tabular-nums; }
      .back-btn {
        width: 38px;
        height: 38px;
        flex-shrink: 0;
        border-radius: 10px;
        background: none;
        color: var(--oppai-text);
      }
      .back-btn:hover { background: var(--oppai-surface); }
      .searchbox {
        flex: 1;
        max-width: 560px;
        margin: 0 auto;
        height: 40px;
        background: var(--oppai-surface);
        border: 1px solid var(--oppai-border);
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 0 8px 0 12px;
        transition: border-color 0.15s ease, background 0.15s ease;
      }
      .searchbox:focus-within {
        border-color: color-mix(in srgb, var(--oppai-primary) 55%, transparent);
        background: var(--oppai-surface-2);
      }
      .searchbox > .material-symbols-rounded { font-size: 20px; color: var(--oppai-text-muted); }
      .searchbox input {
        flex: 1;
        min-width: 0;
        background: none;
        border: none;
        outline: none;
        color: var(--oppai-text);
        font: inherit;
        font-size: 14px;
      }
      .searchbox input::-webkit-search-cancel-button { display: none; }
      .searchbox kbd {
        font: 600 11px ui-monospace, "Cascadia Mono", monospace;
        color: var(--oppai-text-muted);
        border: 1px solid var(--oppai-border-strong);
        border-radius: 5px;
        padding: 1px 6px;
      }
      .searchbox:focus-within kbd { display: none; }
      .search-clear { background: none; color: var(--oppai-text-dim); width: 28px; height: 28px; border-radius: 8px; }
      .search-clear:hover { background: var(--oppai-surface); }
      .h-spacer { flex: 1; }
      .tools { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
      .tool {
        height: 36px;
        padding: 0 12px;
        border-radius: 10px;
        border: 1px solid var(--oppai-border-strong);
        background: none;
        color: var(--oppai-text-dim);
        display: flex;
        align-items: center;
        gap: 6px;
        font: inherit;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        flex-shrink: 0;
        transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
      }
      .tool:hover { color: var(--oppai-text); background: var(--oppai-surface); }
      .tool.icon { width: 36px; padding: 0; justify-content: center; }
      .tool .material-symbols-rounded { font-size: 19px; }
      .tool.on {
        background: var(--oppai-selected);
        color: var(--oppai-primary-bright);
        border-color: transparent;
      }
      .phone-only { display: none !important; }
      /* The library's places, as a chip row: the phone's answer to the sidebar. */
      .scope {
        display: none;
        gap: 6px;
        overflow-x: auto;
        scrollbar-width: none;
        margin: 0 -14px;
        padding: 0 14px 2px;
      }
      .scope::-webkit-scrollbar { display: none; }
      .scope .chip { flex-shrink: 0; }
      /* The Filters menu hangs off its button, under the header, so it never pushes
         the grid around while it is open. */
      .filters-wrap { position: relative; flex-shrink: 0; }
      .fbadge {
        min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px;
        background: var(--oppai-primary); color: var(--oppai-on-primary);
        font-size: 11px; font-weight: 700; display: grid; place-items: center;
      }
      .filters-pop {
        position: absolute; right: 0; top: 46px; z-index: 30;
        width: min(340px, calc(100vw - 32px));
        background: var(--oppai-surface-2); color: var(--oppai-text);
        border: 1px solid var(--oppai-border-strong); border-radius: 16px;
        box-shadow: var(--oppai-shadow-pop);
        padding: 12px 14px 10px;
        animation: fpop .16s var(--oppai-ease-spring, ease-out);
      }
      @keyframes fpop { from { opacity: 0; transform: translateY(-6px); } }
      @media (prefers-reduced-motion: reduce) { .filters-pop { animation: none; } }
      .frow-label {
        font-size: 11px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase;
        color: var(--oppai-text-muted); margin: 10px 0 6px;
      }
      .frow-label:first-child { margin-top: 0; }
      .frow { display: flex; flex-wrap: wrap; gap: 6px; }
      .fchip {
        height: 32px; padding: 0 12px; border-radius: 999px; font: inherit; font-size: 13px;
        display: inline-flex; align-items: center; gap: 5px; cursor: pointer;
        background: transparent; color: var(--oppai-text-dim);
        border: 1px solid var(--oppai-border-strong);
      }
      .fchip.on {
        background: var(--oppai-text); color: var(--oppai-bg); border-color: var(--oppai-text);
      }
      .ffoot {
        display: flex; align-items: center; justify-content: space-between;
        margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--oppai-border-strong);
        font-size: 12px; color: var(--oppai-text-muted);
      }
      .flink {
        border: none; background: none; color: var(--oppai-primary-bright); font: inherit;
        font-size: 13px; font-weight: 500; cursor: pointer; padding: 4px 6px;
      }
      .flink:disabled { color: var(--oppai-text-muted); cursor: default; }
      main {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        padding: 24px 28px 64px;
      }
      /* Chat and the studios are full-bleed clients, not cards inside the library
         shell: they own their own scrolling regions, so the shell's padding and
         scrollbar would produce a nested-scroller feel and a visible inset frame. */
      main.flush {
        padding: 0;
        overflow: hidden;
      }

      /* ── Home ───────────────────────────────────────────────────────────
         The hero is the thing you were in the middle of, shown the way a gallery
         hangs one picture: the picture itself framed on the right, its own colours
         blurred out to fill the wall behind it, and what it is on the left. */
      .hero {
        position: relative;
        isolation: isolate;
        overflow: hidden;
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 28px;
        min-height: 300px;
        padding: 28px 32px;
        border-radius: var(--oppai-radius-lg);
        background: var(--oppai-surface);
        border: 1px solid var(--oppai-border);
        margin-bottom: 12px;
      }
      .hero-wall {
        position: absolute;
        inset: -60px;
        z-index: -2;
        width: calc(100% + 120px);
        height: calc(100% + 120px);
        object-fit: cover;
        filter: blur(48px) saturate(1.3);
        opacity: 0.5;
      }
      .hero::after {
        content: "";
        position: absolute;
        inset: 0;
        z-index: -1;
        background:
          linear-gradient(90deg, color-mix(in srgb, var(--oppai-bg) 86%, transparent) 0%,
            color-mix(in srgb, var(--oppai-bg) 50%, transparent) 60%, transparent 100%),
          linear-gradient(0deg, color-mix(in srgb, var(--oppai-bg) 45%, transparent), transparent 70%);
      }
      .hero.veiled .hero-wall { opacity: 0.25; }
      .hero-body { display: grid; gap: 10px; min-width: 0; max-width: 560px; }
      .hero-eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: var(--oppai-primary-bright);
        font-size: 11.5px;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }
      .hero-title {
        margin: 0;
        font-size: 34px;
        font-weight: 700;
        letter-spacing: -0.02em;
        line-height: 1.1;
        overflow-wrap: anywhere;
      }
      .hero-tags { display: flex; flex-wrap: wrap; gap: 6px; }
      .hero-tags span {
        padding: 3px 10px;
        border-radius: 999px;
        background: color-mix(in srgb, var(--oppai-text) 9%, transparent);
        color: var(--oppai-text-dim);
        font-size: 12px;
      }
      .hero-acts { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
      .hero-open, .hero-more {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        height: 42px;
        padding: 0 20px;
        border: 1px solid color-mix(in srgb, var(--oppai-text) 22%, transparent);
        border-radius: 12px;
        background: color-mix(in srgb, var(--oppai-bg) 30%, transparent);
        color: var(--oppai-text);
        cursor: pointer;
        font: inherit;
        font-size: 14px;
        font-weight: 600;
        backdrop-filter: blur(8px);
      }
      .hero-open {
        background: var(--oppai-primary);
        border-color: var(--oppai-primary);
        color: var(--oppai-on-primary);
      }
      .hero-open:hover { filter: brightness(1.06); }
      .hero-more:hover { background: color-mix(in srgb, var(--oppai-text) 10%, transparent); }
      .hero-open .material-symbols-rounded { font-size: 20px; }
      .hero-art {
        flex-shrink: 0;
        display: grid;
        place-items: center;
        height: 244px;
        max-width: 42%;
        aspect-ratio: var(--ratio, 0.8);
        padding: 0;
        border: 0;
        border-radius: 14px;
        overflow: hidden;
        background: var(--oppai-surface-2);
        box-shadow: var(--oppai-shadow-pop);
        cursor: pointer;
        transition: transform 0.3s var(--oppai-ease-emphasized);
      }
      .hero-art:hover { transform: translateY(-3px) rotate(-0.4deg); }
      .hero-art img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .hero-icon { font-size: 52px; color: var(--oppai-text-muted); }
      .hero.veiled .hero-art img { filter: blur(22px) saturate(.6); transform: scale(1.15); }
      /* The counts, said as a line rather than four cards: they are facts about the
         library, not places to go — the two that are places are links. */
      .vault-strip {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px 22px;
        padding: 6px 4px 0;
        margin-bottom: 26px;
        color: var(--oppai-text-muted);
        font-size: 13px;
      }
      .vs-item {
        display: inline-flex;
        align-items: baseline;
        gap: 5px;
        padding: 0;
        border: none;
        background: none;
        color: inherit;
        font: inherit;
      }
      button.vs-item { cursor: pointer; }
      button.vs-item:hover strong { color: var(--oppai-primary-bright); }
      .vs-item strong { color: var(--oppai-text); font-weight: 600; font-size: 15px; font-variant-numeric: tabular-nums; }
      .vs-lock { display: inline-flex; align-items: center; gap: 6px; margin-left: auto; }
      .vs-lock .material-symbols-rounded { font-size: 16px; color: var(--oppai-primary); }
      /* The other two things the app is for, one card each and no bigger than that:
         the library leads, and these are the doors beside it. */
      .also {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 12px;
        margin-bottom: 34px;
      }
      .also-card {
        display: flex;
        align-items: center;
        gap: 14px;
        min-width: 0;
        min-height: 80px;
        padding: 14px 16px;
        border-radius: 16px;
        background: var(--oppai-surface);
        border: 1px solid var(--oppai-border);
        color: inherit;
        font: inherit;
        text-align: left;
      }
      button.also-card { cursor: pointer; transition: background 0.15s ease, border-color 0.15s ease; }
      button.also-card:hover { background: var(--oppai-surface-2); border-color: var(--oppai-border-strong); }
      .also-face {
        width: 50px;
        height: 50px;
        flex-shrink: 0;
        border-radius: 50%;
        object-fit: cover;
        object-position: top;
        background: var(--oppai-surface-2);
        box-shadow: 0 0 0 2px var(--oppai-surface), 0 0 0 4px color-mix(in srgb, var(--oppai-primary) 65%, transparent);
      }
      .also-icon {
        width: 50px;
        height: 50px;
        flex-shrink: 0;
        border-radius: 14px;
        display: grid;
        place-items: center;
        background: var(--oppai-selected);
        color: var(--oppai-primary-bright);
      }
      .also-icon .material-symbols-rounded { font-size: 26px; }
      .also-copy { min-width: 0; flex: 1; }
      .also-title { font-size: 15px; font-weight: 600; }
      .also-sub { font-size: 12.5px; color: var(--oppai-text-muted); margin-top: 2px; }
      .also-go { color: var(--oppai-text-muted); }
      .also-acts { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
      .also-btn {
        height: 34px;
        padding: 0 12px;
        border-radius: 10px;
        border: 1px solid var(--oppai-border-strong);
        background: none;
        color: var(--oppai-text-dim);
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font: inherit;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
      }
      .also-btn:hover { color: var(--oppai-text); background: var(--oppai-surface-2); }
      .also-btn .material-symbols-rounded { font-size: 18px; }
      .greeting {
        font-size: 13px;
        font-weight: 500;
        color: var(--oppai-text-muted);
        margin: 0 0 10px 4px;
      }
      .empty-home {
        display: grid;
        justify-items: center;
        gap: 10px;
        padding: 80px 20px;
        text-align: center;
        color: var(--oppai-text-muted);
      }
      .empty-home h2 { margin: 0; color: var(--oppai-text); font-size: 24px; font-weight: 700; letter-spacing: -0.01em; }
      .empty-home .material-symbols-rounded { font-size: 44px; color: var(--oppai-primary); }
      .empty-home .hero-open { margin-top: 8px; }
      .row-sub {
        color: var(--oppai-text-muted);
        font-size: 12.5px;
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      @media (max-width: 900px) {
        .hero { flex-direction: column-reverse; align-items: stretch; min-height: 0; padding: 18px; gap: 18px; }
        .hero-art { height: auto; max-width: none; aspect-ratio: 16 / 10; }
        .hero-art img { object-position: 50% 25%; }
        .hero-title { font-size: 26px; }
      }
      .row {
        margin-bottom: 34px;
      }
      .row-head {
        display: flex;
        align-items: baseline;
        gap: 10px;
        margin-bottom: 12px;
      }
      .row-title {
        font-size: 17px;
        font-weight: 600;
        letter-spacing: -0.005em;
        margin: 0;
        white-space: nowrap;
      }
      .row-face {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        object-fit: cover;
        object-position: top;
        align-self: center;
      }
      .see-all {
        margin-left: auto;
        background: none;
        border: none;
        color: var(--oppai-primary-bright);
        font: inherit;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 2px;
        flex-shrink: 0;
      }
      .row-scroll {
        display: flex;
        gap: 14px;
        overflow-x: auto;
        padding-bottom: 8px;
        scroll-snap-type: x proximity;
        scrollbar-width: thin;
      }
      .row-scroll > * { scroll-snap-align: start; }

      /* ── The grid ────────────────────────────────────────────────────── */
      .grid-bar {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 18px;
      }
      .grid-bar .chips { flex: 1; min-width: 0; margin: 0; }
      .grid-tools { display: flex; align-items: center; gap: 8px; margin-left: auto; flex-shrink: 0; }
      .grid-tools .sort { margin-left: 0; }
      .grid-head {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 18px;
        flex-wrap: wrap;
      }
      .grid-title {
        font-size: 20px;
        font-weight: 600;
        margin: 0;
      }
      .grid-count {
        font-size: 13px;
        color: var(--oppai-text-muted);
      }
      /* The sort control sits at the far end of the chip row, so the row reads "narrow
         it down, then order it". */
      .sort {
        margin-left: auto;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        flex-shrink: 0;
      }
      .sort-label {
        color: var(--oppai-text-muted);
      }
      .sort select {
        height: 34px;
        padding: 0 8px;
        border-radius: 10px;
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
        border-radius: 12px;
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
        gap: 6px;
        margin: 0 0 18px;
        flex-wrap: wrap;
      }
      /* The Games section's face strip sits above the tag chips. */
      .chips.game-faces {
        margin: 0 0 14px;
      }
      .chip {
        height: 32px;
        padding: 0 13px;
        border-radius: 999px;
        border: 1px solid var(--oppai-border-strong);
        background: none;
        color: var(--oppai-text-dim);
        font: inherit;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        white-space: nowrap;
        transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
      }
      .chip:hover { color: var(--oppai-text); border-color: var(--oppai-text-muted); }
      .chip .material-symbols-rounded { font-size: 17px; }
      /* A picked chip is inverted rather than tinted: on a wall of thumbnails, a tint is
         one more colour among many, and the inverse is the one thing that stands out. */
      .chip[aria-pressed="true"] {
        background: var(--oppai-text);
        color: var(--oppai-bg);
        border-color: var(--oppai-text);
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(var(--tile-min, 210px), 1fr));
        gap: 20px 14px;
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
        min-width: 0;
      }
      .row-scroll .tile { flex-shrink: 0; width: 184px; }
      /* A focused tile has to be visible as such, now that one can be reached by
         keyboard. focus-visible rather than focus, so a mouse click does not leave a
         ring behind it. */
      .tile:focus {
        outline: none;
      }
      .tile:focus-visible .tile-media {
        outline: 2px solid var(--oppai-primary);
        outline-offset: 3px;
      }
      .tile-media {
        position: relative;
        width: 100%;
        border-radius: var(--oppai-radius-md);
        overflow: hidden;
        transition: transform 0.28s var(--oppai-ease-emphasized),
          box-shadow 0.28s var(--oppai-ease-emphasized);
        will-change: transform;
      }
      /* A shade along the bottom edge, so the badge reads over a white picture and the
         heart over a bright one, without darkening the picture at rest. */
      .tile-media::after {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, rgba(0, 0, 0, 0.32) 0%, transparent 28%, transparent 70%, rgba(0, 0, 0, 0.38) 100%);
        opacity: 0;
        transition: opacity 0.2s ease;
        pointer-events: none;
      }
      .tile:hover .tile-media::after { opacity: 1; }
      .tile:hover .tile-media {
        transform: translateY(-3px);
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.36);
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
        transition: transform 0.5s var(--oppai-ease-emphasized);
      }
      .tile:hover .tile-media img {
        transform: scale(1.04);
      }
      .moment-tile {
        position: relative;
        flex: 0 0 auto;
        width: 232px;
        padding: 0;
        border: 0;
        border-radius: var(--oppai-radius-md);
        overflow: hidden;
        background: var(--oppai-surface);
        color: inherit;
        font: inherit;
        text-align: left;
        cursor: pointer;
      }
      .moment-tile img { display: block; width: 232px; height: 130px; object-fit: cover; background: #000; }
      .moment-tile.veiled img { filter: blur(22px) saturate(.6); }
      .moment-caption { display: flex; flex-direction: column; gap: 2px; padding: 8px 10px 10px; }
      .moment-caption strong { font-size: 13px; font-variant-numeric: tabular-nums; color: var(--oppai-primary-bright); }
      .moment-caption span {
        font-size: 12px; color: var(--oppai-text-muted);
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }
      /* The safe toggle: a rated-explicit tile is a blur until it is switched off. */
      .tile.veiled .tile-media img {
        filter: blur(22px) saturate(.6);
        transform: scale(1.15);
      }
      .tile.veiled:hover .tile-media img { transform: scale(1.15); }
      .viewer-veil { filter: blur(30px) saturate(.5); pointer-events: none; }
      .tile-overlay {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 6px;
        opacity: 0.6;
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
        z-index: 1;
        width: 32px;
        height: 32px;
        border-radius: 10px;
        background: rgba(0, 0, 0, 0.42);
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        opacity: 0;
        transform: scale(0.85);
        transition: opacity 0.2s ease, transform 0.2s var(--oppai-ease-spring),
          background 0.2s ease;
        backdrop-filter: blur(6px);
      }
      .tile:hover .fav-btn,
      .tile:focus-visible .fav-btn,
      .fav-btn.is-fav {
        opacity: 1;
        transform: scale(1);
      }
      .fav-btn:hover {
        background: rgba(0, 0, 0, 0.62);
      }
      .fav-btn:active .material-symbols-rounded {
        animation: oppai-pop 0.35s var(--oppai-ease-spring);
      }
      .tile-stat {
        position: absolute;
        z-index: 1;
        bottom: 7px;
        right: 7px;
        font-size: 11px;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        color: #fff;
        background: rgba(0, 0, 0, 0.52);
        padding: 2px 7px;
        border-radius: 6px;
        backdrop-filter: blur(6px);
      }
      .tile-meta {
        padding: 8px 2px 0;
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
        margin-top: 1px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* ── The phone's bottom bar and its More sheet ──────────────────────
         In the column's flow rather than fixed over it, so every screen above it —
         the chat's composer, the studio's dock — ends where the bar begins without
         each one having to know how tall it is. */
      .phone-bar {
        display: none;
        flex-shrink: 0;
        align-items: center;
        justify-content: space-around;
        height: calc(64px + env(safe-area-inset-bottom));
        padding: 0 max(6px, env(safe-area-inset-right)) env(safe-area-inset-bottom) max(6px, env(safe-area-inset-left));
        background: var(--oppai-nav);
        border-top: 1px solid var(--oppai-border);
      }
      .pb-item {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3px;
        padding: 6px 0;
        border: none;
        background: none;
        color: var(--oppai-text-muted);
        font: inherit;
        font-size: 11px;
        font-weight: 500;
        cursor: pointer;
      }
      .pb-pill {
        width: 54px;
        height: 30px;
        border-radius: 15px;
        display: grid;
        place-items: center;
        transition: background 0.2s var(--oppai-ease-emphasized);
      }
      .pb-pill .material-symbols-rounded { font-size: 22px; }
      .pb-pill img { width: 24px; height: 24px; border-radius: 50%; object-fit: cover; object-position: top; }
      .pb-item.on { color: var(--oppai-text); }
      .pb-item.on .pb-pill { background: var(--oppai-selected); color: var(--oppai-primary-bright); }
      .pb-add {
        flex: none;
        width: 50px;
        height: 50px;
        margin: 0 4px;
        border-radius: 16px;
        border: none;
        background: var(--oppai-primary);
        color: var(--oppai-on-primary);
        display: grid;
        place-items: center;
        cursor: pointer;
        box-shadow: 0 6px 18px color-mix(in srgb, var(--oppai-primary) 28%, transparent);
      }
      .pb-add .material-symbols-rounded { font-size: 28px; }
      /* Above Libby's drawer (60), whose tab otherwise sat over the sheet's rows, and
         below the upload manager (150) and the menu (400). */
      .sheet-scrim {
        position: absolute;
        inset: 0;
        z-index: 80;
        background: var(--oppai-scrim);
        display: flex;
        align-items: flex-end;
        animation: oppai-fade-in 0.18s var(--oppai-ease-standard) both;
      }
      .sheet {
        width: 100%;
        max-height: 80%;
        overflow-y: auto;
        padding: 8px 12px calc(16px + env(safe-area-inset-bottom));
        border-radius: 24px 24px 0 0;
        background: var(--oppai-surface);
        box-shadow: var(--oppai-shadow-pop);
        animation: oppai-fade-in-up 0.26s var(--oppai-ease-emphasized) both;
      }
      .sheet-grip {
        width: 36px;
        height: 4px;
        margin: 4px auto 10px;
        border-radius: 2px;
        background: var(--oppai-border-strong);
      }
      .sheet-who {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 6px 8px 14px;
        border-bottom: 1px solid var(--oppai-border);
        margin-bottom: 6px;
      }
      .sheet-item {
        display: flex;
        align-items: center;
        gap: 14px;
        width: 100%;
        height: 50px;
        padding: 0 10px;
        border: none;
        border-radius: 12px;
        background: none;
        color: var(--oppai-text);
        font: inherit;
        font-size: 15px;
        text-align: left;
        cursor: pointer;
      }
      .sheet-item:hover { background: var(--oppai-surface-2); }
      .sheet-item .material-symbols-rounded { font-size: 22px; color: var(--oppai-text-dim); }
      .sheet-item.on .material-symbols-rounded { color: var(--oppai-primary-bright); }
      .sheet-item .sheet-note { margin-left: auto; font-size: 12px; color: var(--oppai-text-muted); }
      .sheet-item.danger, .sheet-item.danger .material-symbols-rounded { color: var(--oppai-error); }

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
        max-width: calc(100% - 32px);
        overflow-x: auto;
        scrollbar-width: none;
        padding: 8px 10px 8px 18px;
        border-radius: 16px;
        border: 1px solid var(--oppai-border-strong);
        background: var(--oppai-surface-2);
        box-shadow: var(--oppai-shadow-pop);
        animation: oppai-scale-in 0.28s var(--oppai-ease-spring) both;
      }
      .bulk-count {
        font-size: 14px;
        font-weight: 600;
        margin-right: 6px;
        white-space: nowrap;
      }
      .bulk-btn {
        white-space: nowrap;
        flex-shrink: 0;
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

      /* Phone navigation is a real bottom bar, not the desktop sidebar squeezed into a
         short viewport. It was one: eleven destinations in a sideways scroll, of which a
         phone showed Home, Photos and GIFs — Chat, the second thing the app is for, was
         off the edge. Now the bar holds the four places and Add, and the library's own
         places are the chip row under its search. Dynamic viewport units follow
         collapsing browser chrome; safe-area padding keeps the bar above home
         indicators, notches, and rounded landscape corners. */
      @media (max-width: 700px) {
        :host {
          flex-direction: column;
          height: 100dvh;
          min-height: -webkit-fill-available;
        }
        nav.side { display: none; }
        .phone-bar { display: flex; }
        .phone-only { display: flex !important; }
        .desk-only { display: none !important; }
        .main-col { min-height: 0; height: auto; flex: 1; }
        header.top {
          height: auto;
          flex-wrap: wrap;
          gap: 10px 8px;
          padding: calc(env(safe-area-inset-top) + 10px) max(14px, env(safe-area-inset-right)) 10px max(14px, env(safe-area-inset-left));
        }
        header.top.viewing { flex-wrap: nowrap; }
        /* The chip row says where you are, so the title would only say it again. */
        header.top:not(.viewing) .h-titles { display: none; }
        .h-title { font-size: 17px; max-width: 60vw; }
        .searchbox { margin: 0; max-width: none; height: 42px; min-width: 0; }
        .tools { gap: 4px; }
        .searchbox kbd { display: none; }
        .tool-label { display: none; }
        .tool { width: 42px; height: 42px; padding: 0; justify-content: center; }
        .tool .fbadge { position: absolute; top: -4px; right: -4px; }
        .filters-wrap .tool { position: relative; }
        .scope { display: flex; flex-basis: 100%; }
        main {
          padding: 14px max(14px, env(safe-area-inset-right)) max(24px, env(safe-area-inset-bottom)) max(14px, env(safe-area-inset-left));
        }
        main.flush { padding: 0; }
        .grid { grid-template-columns: repeat(var(--tile-cols, 2), minmax(0, 1fr)); gap: 14px 8px; }
        .grid.cols-3 .tile-meta { display: none; }
        .row-scroll .tile { width: 150px; }
        .hero-title { font-size: 23px; }
        .vs-lock { margin-left: 0; flex-basis: 100%; }
        .also { grid-template-columns: minmax(0, 1fr); }
        .also-card.create { flex-wrap: wrap; }
        .also-card.create .also-acts { flex-basis: 100%; justify-content: flex-start; }
        .grid-bar { flex-direction: column-reverse; align-items: stretch; gap: 10px; }
        .grid-bar .chips { flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; margin: 0 -14px; padding: 0 14px; }
        .grid-tools { margin-left: 0; justify-content: space-between; }
        .grid-tools .sort-label { display: none; }
        .download-area { right: max(10px, env(safe-area-inset-right)); bottom: calc(76px + env(safe-area-inset-bottom)); }
        .bulk-bar { bottom: calc(76px + env(safe-area-inset-bottom)); max-width: calc(100vw - 20px); overflow-x: auto; }
      }
    `,
  ];

  // Ordered ids of the list the viewer was opened from, so arrow keys can page
  // between neighbours (see onKey / stepItem).
  private viewerList: number[] = [];
  /**
   * The items of that list, by id, for the ones the grid's page does not hold.
   *
   * The viewer used to look its item up in `items` alone, which is the grid's current
   * page. Home's rows are their own queries, so a tile there was only found when it
   * happened to be on that page too: Recently added mostly was, and Libby Suggested,
   * which is by design what you have not opened, mostly was not — "Item not found".
   */
  private viewerItems = new Map<number, Media>();

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
    this.narrowQuery.addEventListener("change", this.onNarrow);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("popstate", this.onPopState);
    this.narrowQuery.removeEventListener("change", this.onNarrow);
    this.removeEventListener("contextmenu", this.onContextMenu);
    this.detachLongPress?.();
    this.removeEventListener(OPEN_MEDIA_EVENT, this.onOpenMedia);
    window.removeEventListener("keydown", this.onKey);
    window.removeEventListener("oppai-downloads", this.onDownloads as EventListener);
    window.removeEventListener("oppai-download-complete", this.onDownloadComplete);
    window.removeEventListener("oppai-upload-complete", this.onUploadDone);
    window.removeEventListener("oppai-incognito", this.onIncognito);
    document.removeEventListener("pointerdown", this.onFiltersOutside, true);
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
    if (changed.has("filtersOpen")) {
      if (this.filtersOpen) document.addEventListener("pointerdown", this.onFiltersOutside, true);
      else document.removeEventListener("pointerdown", this.onFiltersOutside, true);
    }
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
    const item = this.knownItem(id);
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
      // The two ways to hand her a picture, one entry each and Libby's by name. Both
      // disabled rather than hidden when there is nothing showable, so the entry not
      // being there reads as "this build can't do it" instead of "not this item".
      // There is no "Share with…" any more: the library is Libby's, and a card
      // character is a SillyTavern card with no part in it.
      { label: "Show Libby now", icon: "send", disabled: shareable ? false : true,
        hint: "attach to a message",
        run: () => void this.share(item, { id: "libby", name: "Libby" } as ChatCharacter) },
      { label: "Save for Libby to send later", icon: "add_photo_alternate", disabled: shareable ? false : true,
        hint: "her gallery",
        run: () => void this.saveForLater(item) },
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
      { label: "Sprite studio", icon: "face_retouching_natural", run: () => this.selectSection("studio") },
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
    const item = this.knownItem(id);
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
    if (isTypingTarget(e)) return;
    // The safe keys work everywhere, viewer or not: they exist for the moment
    // somebody walks in, which is not a moment to be on the right screen first.
    switch (safeKeyAction(e)) {
      case "toggle":
        e.preventDefault();
        this.toggleSafe();
        return;
      case "lock":
        e.preventDefault();
        this.logout();
        return;
    }
    if (e.key === "/" && this.selectedId == null && isLibrarySection(this.section) && this.section !== "browse"
      && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const box = this.renderRoot.querySelector<HTMLInputElement>(".searchbox input");
      if (box) {
        e.preventDefault();
        box.focus();
        return;
      }
    }
    if (this.selectedId == null || this.uploadOpen) return;
    const reading = this.knownItem(this.selectedId)?.kind === "comic";
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
    return buildQuery(this.section, this.search, this.filters[this.section], this.refine, this.sort);
  }

  /** A string that changes exactly when the query does, for deciding whether a
   *  page that has arrived still belongs on screen. */
  private queryKey(q: MediaQuery): string {
    return [q.kind ?? "", q.q ?? "", q.tag ?? "", q.favorite ? "fav" : "", q.minRating ?? 0, q.sort ?? "newest"].join("|");
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
      const [stats, resume, suggested, favorites, newest, moments, ...kinds] = await Promise.all([
        api.libraryStats(abort.signal).catch(() => null),
        api.resumeShelf(abort.signal).then((r) => r.items ?? []).catch(() => []),
        api.suggestedMedia(this.recents.map((r) => r.id), abort.signal)
          .catch(() => ({ items: [] as Media[], because: [] as string[] })),
        row({ favorite: true }),
        row({}),
        api.recentBookmarks(12, abort.signal).then((r) => r.bookmarks ?? []).catch(() => [] as Bookmark[]),
        ...KIND_ORDER.map((k) => row({ kind: k })),
      ]);
      if (abort.signal.aborted) return;
      const byKind = {} as Record<Kind, Media[]>;
      KIND_ORDER.forEach((k, i) => (byKind[k] = kinds[i] ?? []));
      this.stats = stats;
      this.home = {
        resume, favorites, newest, byKind, moments,
        suggested: suggested.items ?? [], because: suggested.because ?? [],
      };
      this.noteServerFavorites([...favorites, ...newest, ...resume, ...this.home.suggested]);
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
  /** The studio's mode switch crossing between Create and Sprites, which are two
      elements behind one header. */
  private onStudioMode = (e: CustomEvent<{ section: "imagegen" | "studio" }>) => this.selectSection(e.detail.section);

  /** The studio saying which of Image and Video it is showing, so the nav lights the
      right one whichever switch changed it. Hearing it also means a request from the
      nav has been taken up, and must not be re-applied to the next studio built. */
  private onCreateMode = (e: CustomEvent<{ mode: CreateMode }>) => {
    this.createMode = e.detail.mode;
    this.createRequest = null;
  };

  /** The Video studio's setup card, sending someone to where ComfyUI is set up. */
  private openImageGenSettings = () => {
    this.selectSection("settings");
    this.settingsTab = "imagegen";
  };

  private selectSection(id: Section) {
    if (isLibrarySection(id)) this.lastLibrary = id;
    else if (id === "imagegen" || id === "studio") this.lastCreate = id;
    if (id === this.section) return;
    this.settingsTab = "";
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
    const { id, at } = (event as CustomEvent<{ id: number; at?: number }>).detail;
    this.viewerStartAt = at && at > 0 ? at : 0;
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
    if (list && list.length) {
      this.viewerList = list.map((m) => m.id);
      this.viewerItems = new Map(list.map((m) => [m.id, m]));
    } else if (!this.viewerList.includes(id)) {
      this.viewerList = [id];
    }
    // Opening the viewer is a place you can go back from. One history entry per
    // viewer session, however many items are paged through inside it, so the back
    // button — or the phone's back gesture — closes the viewer and lands where you
    // opened it: the chat, with the conversation still there, rather than leaving
    // the app. See onPopState and willUpdate.
    if (!this.viewerPushed) {
      try { history.pushState({ oppaiViewer: true }, ""); this.viewerPushed = true; } catch { /* file: URLs, sandboxed frames */ }
    }
    // What Home's hero is built from. Recorded here rather than in the viewer
    // because this is the one place an item is opened from, whichever screen
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
  private setRefine(change: Partial<LibraryFilters>) {
    this.refine = { ...this.refine, ...change };
    void this.reload();
  }
  private clearRefine() {
    if (this.refine === NO_FILTERS) return;
    this.refine = NO_FILTERS;
    void this.reload();
  }
  /** Closes the Filters menu on a click outside it. Listening only while it is open
   *  keeps a document-wide listener off every other click. */
  private onFiltersOutside = (e: Event) => {
    if (e.composedPath().some((n) => n instanceof HTMLElement && n.classList.contains("filters-wrap"))) return;
    this.filtersOpen = false;
  };
  private toggleFilters() {
    this.filtersOpen = !this.filtersOpen;
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
    this.pickAnchor = null;
  };
  private exitSelect() {
    this.selectMode = false;
    this.selected = new Set();
    this.pickAnchor = null;
  }
  private toggleSelected(id: number, e?: Event) {
    e?.stopPropagation();
    const next = new Set(this.selected);
    next.has(id) ? next.delete(id) : next.add(id);
    this.selected = next;
    this.pickAnchor = id;
  }
  /** A tile's click: opens it, or picks it in select mode — and Ctrl or Shift with
      the click picks from anywhere, starting select mode on the way. */
  private clickTile(e: MouseEvent, id: number, list?: Media[]) {
    if (!this.selectMode && !isPickClick(e)) {
      this.openItem(id, list);
      return;
    }
    // Shift-click is also the browser's extend-the-text-selection.
    if (e.shiftKey) window.getSelection()?.removeAllRanges();
    this.selectMode = true;
    const order = (list ?? this.items).map((m) => m.id);
    const next = pickClick(order, { selected: this.selected, anchor: this.pickAnchor }, id, e);
    this.selected = next.selected;
    this.pickAnchor = next.anchor;
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

  /** Veils explicit tiles and takes Libby off the screen, or puts it all back. */
  private toggleSafe() {
    this.safe = !this.safe;
    saveSafeMode(this.safe);
    // Whatever is playing goes quiet with the screen.
    if (this.safe) {
      for (const video of this.renderRoot.querySelectorAll("video")) video.muted = true;
      this.renderRoot.querySelector("oppai-viewer")?.renderRoot?.querySelectorAll("video").forEach((video) => (video.muted = true));
    }
  }

  /** Where the open viewer's video is, for the Libby drawer's "watching together". */
  private viewerPlayback = () => this.renderRoot.querySelector("oppai-viewer")?.playback() ?? null;

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
      .map((id) => this.knownItem(id))
      .filter((m): m is Media => m != null);
  }

  /** An item on screen somewhere: the grid's copy when it has one, being the one a
      refresh keeps current, else the copy from the row the viewer was opened from,
      else one of Home's rows (whose tiles have menus too). */
  private knownItem(id: number): Media | null {
    const found = this.items.find((m) => m.id === id) ?? this.viewerItems.get(id);
    if (found || !this.home) return found ?? null;
    const h = this.home;
    for (const list of [h.suggested, h.favorites, h.newest, h.resume, ...Object.values(h.byKind)]) {
      const m = list.find((x) => x.id === id);
      if (m) return m;
    }
    return null;
  }

  /** After an edit in the viewer: a row's copy is not refreshed with the grid, so the
      edited item is asked for again rather than shown as it was before. */
  private async refetchViewerItem(id: number) {
    if (!this.viewerItems.has(id)) return;
    try {
      const fresh = await api.getMedia(id);
      this.viewerItems = new Map(this.viewerItems).set(id, fresh);
    } catch { /* deleted meanwhile; the viewer's own deleted event closes it */ }
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

    const activeItem = isViewer && this.selectedId != null ? this.knownItem(this.selectedId) : null;

    let headerTitle = "Library";
    if (isViewer) headerTitle = activeItem ? activeItem.title : "Library";
    else if (isSearch) headerTitle = "Search results";
    else if (isSettings) headerTitle = "Settings";
    else if (isBrowse) headerTitle = "Browse sources";
    else if (isImageGen) headerTitle = "Create";
    else if (isStudio) headerTitle = "Create";
    // Named after her because she is who you are usually talking to.
    else if (isChat) headerTitle = "Chat with Libby";
    else if (isFavorites) headerTitle = "Favorites";
    else if (isCollections) headerTitle = this.openCollection?.name ?? "Collections";
    else if (isHome) headerTitle = "Library";
    else headerTitle = KIND_META[this.section as Kind]?.label ?? "Library";

    // The library's screens and the viewer have the top bar; the workspaces do not.
    const libraryScreen = !isViewer && !isSettings && !isImageGen && !isStudio && !isChat;
    const gridScreen = isGrid || isFavorites || isSearch || (isCollections && !!this.openCollection);
    // The server's count of everything matching, not the length of what has loaded.
    let count = "";
    if (gridScreen && !(isGrid && this.section === "game" && this.gameFace !== "library")) {
      const n = isCollections && this.openCollection ? this.openCollection.count : this.total;
      count = this.loading && !this.items.length
        ? ""
        : n === this.items.length || isCollections
          ? `${n.toLocaleString()} ${n === 1 ? "item" : "items"}`
          : `${this.items.length.toLocaleString()} of ${n.toLocaleString()}`;
    } else if (isCollections) {
      count = this.collections.length ? this.collections.length.toLocaleString() : "";
    }

    return html`
      ${this.renderNav()}
      <div class="main-col">
        ${isViewer || libraryScreen
          ? this.renderHeader(headerTitle, isViewer ? "" : count, {
              isViewer,
              search: !isBrowse,
              grid: gridScreen,
              select: gridScreen || isHome,
            })
          : nothing}
        <main class=${isChat || isImageGen || isStudio ? "flush" : ""}>
          ${isHome ? this.renderHome() : nothing}
          ${isSettings
            ? this.ready("settings")
              ? html`<oppai-settings .user=${this.user} .startTab=${this.settingsTab}
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
              ? html`<oppai-imagegen .editMedia=${this.editMediaId} .startMode=${this.createRequest}
                  @create-mode=${this.onCreateMode} @imported=${() => this.refresh()}
                  @open-chat=${() => this.selectSection("chat")} @studio-mode=${this.onStudioMode}
                  @open-settings=${this.openImageGenSettings}></oppai-imagegen>`
              : this.renderViewLoading()
            : nothing}
          <!-- Keyed so switching between Create and the studio rebuilds the element
               rather than reusing one whose studio setup ran (or did not run) for the
               other mode. They share a draft on purpose; they must not share an
               instance. -->
          ${isStudio
            ? this.ready("studio")
              ? keyed("studio", html`<oppai-imagegen studio @imported=${() => this.refresh()}
                  @open-chat=${() => this.selectSection("chat")} @studio-mode=${this.onStudioMode}></oppai-imagegen>`)
              : this.renderViewLoading()
            : nothing}
          ${chatMounted
            ? this.ready("chat")
              ? html`<oppai-chat .user=${this.user} style=${isViewer ? "display:none" : ""}
                  @open-section=${(e: CustomEvent<{ section: "studio" | "settings" }>) => this.selectSection(e.detail.section)} @open-studio=${() => this.selectSection("studio")}></oppai-chat>`
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
                .startAt=${this.viewerStartAt}
                .favorite=${this.favorites.has(activeItem.id)}
                @toggle-favorite=${() => this.toggleFavorite(activeItem.id)}
                @navigate=${(e: CustomEvent<{ dir: number }>) => this.stepItem(e.detail.dir)}
                @jump=${(e: CustomEvent<{ id: number }>) => (this.selectedId = e.detail.id)}
                @changed=${() => { this.refresh(); void this.refetchViewerItem(activeItem.id); }}
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
        <!-- In the main column, not the shell: centred on the whole window it ran under
             the sidebar's half and off the right edge. -->
        ${this.renderBulkBar()}
        ${this.renderPhoneBar()}
      </div>
      ${this.renderMoreSheet()}
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
        .playback=${this.viewerPlayback}
        .externalItems=${isBrowse ? this.browseFrame.items : []}
        .externalFocused=${isBrowse ? this.browseFrame.focused : null}
        .where=${isBrowse ? this.browseFrame.where : libbyWhere(isSearch ? "search" : this.section)}
        ?suppressed=${isChat}
      ></oppai-libby-drawer>
      ${this.renderUpload()}
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

  /** Whether her picture may be on screen: not while she is hidden, and not under the
   *  safe view, which takes her off screen with everything else that would give the
   *  app away. */
  private get libbyShown(): boolean {
    return !libbyHidden() && !this.safe;
  }

  /** Whether the sidebar is folded to a rail right now. See navIsRail. */
  private get navRail(): boolean {
    return navIsRail(this.navPref, this.section, this.narrow);
  }

  /**
   * Goes somewhere from the navigation.
   *
   * The one entrance every nav control uses, so they all agree on two things the bare
   * selectSection does not do: a studio mode named by the item (Image and Video are one
   * element), and a viewer open over the section you are already in, which the item
   * for that section should close rather than do nothing about.
   */
  private go(id: Section, mode?: CreateMode) {
    this.moreOpen = false;
    if (mode) {
      this.createMode = mode;
      // A new object per request, so asking for Image again after the studio's own
      // switch went to Video still lands: the property changes even when the mode
      // asked for is the one last asked for.
      this.createRequest = { mode };
    }
    if (id === this.section && this.selectedId != null) {
      this.closeItem();
      return;
    }
    this.selectSection(id);
  }

  private toggleNavWidth = () => {
    this.navPref = this.navRail ? "full" : "rail";
    saveNavWidth(this.navPref);
  };

  private cycleDensity = () => {
    this.density = nextDensity(this.density);
    saveDensity(this.density);
  };

  /** The account button's menu: who is signed in, and the ways out. */
  private openAccountMenu = (e: MouseEvent) => {
    openMenu({
      x: e.clientX,
      y: e.clientY,
      title: this.user?.username ?? "",
      items: [
        { label: "Settings", icon: "settings", run: () => this.go("settings") },
        {
          label: this.safe ? "Turn safe view off" : "Turn safe view on",
          icon: this.safe ? "visibility" : "visibility_off",
          hint: "`",
          run: () => this.toggleSafe(),
        },
        menuDivider,
        { label: "Sign out", icon: "logout", hint: "~", run: () => this.logout() },
      ],
    });
  };

  private renderNav() {
    const rail = this.navRail;
    const viewing = this.selectedId != null;
    const byKind = this.stats?.byKind ?? {};
    const item = (id: Section, label: string, icon: string, opts: { count?: number; mode?: CreateMode; face?: boolean } = {}) => {
      const active = !viewing && this.section === id && (!opts.mode || this.createMode === opts.mode);
      return html`<button
        class="nav-item ${active ? "on" : ""}"
        aria-current=${active ? "page" : nothing}
        title=${rail ? label : nothing}
        @click=${() => this.go(id, opts.mode)}
      >
        ${opts.face && this.libbyShown
          ? html`<img class="nav-avatar" src=${DEFAULT_LIBBY_PFP} alt="" />`
          : html`<span aria-hidden="true" class="material-symbols-rounded ${active ? "fill-icon" : ""}">${icon}</span>`}
        <span class="nav-label">${label}</span>
        ${opts.count ? html`<span class="nav-count">${compactCount(opts.count)}</span>` : nothing}
      </button>`;
    };
    const name = this.user?.username ?? "?";
    const settingsActive = this.section === "settings" && !viewing;
    return html`
      <nav class="side ${rail ? "rail" : ""}" aria-label="Sections">
        <div class="brand">
          <button class="logo" title=${isIncognito() ? "Home" : "OppaiLib"} aria-label="Home"
            @click=${() => this.go("home")}>${logoSVG}</button>
          <span class="wordmark">${isIncognito() ? "Library" : "OppaiLib"}</span>
        </div>
        <button class="add-btn" title="Add media" aria-label="Add media" @click=${this.toggleUpload}>
          <span aria-hidden="true" class="material-symbols-rounded">add</span><span class="add-label">Add media</span>
        </button>

        <div class="nav-list">
          <div class="nav-group" role="group" aria-label="Library">
            <div class="nav-heading" aria-hidden="true">Library</div>
            ${item("home", "Overview", "home")}
            ${KIND_ORDER.map((k) => item(k, KIND_META[k].label, KIND_META[k].icon, { count: byKind[k] }))}
            ${item("favorites", "Favorites", "favorite", { count: this.stats?.favorites })}
            ${item("collections", "Collections", "bookmarks", { count: this.collections.length })}
            ${item("browse", "Browse sources", "explore")}
          </div>
          <div class="nav-group" role="group" aria-label="Chat">
            <div class="nav-heading" aria-hidden="true">Chat</div>
            ${item("chat", "Libby & chats", "forum", { face: true })}
          </div>
          <div class="nav-group" role="group" aria-label="Create">
            <div class="nav-heading" aria-hidden="true">Create</div>
            ${item("imagegen", "Image", "image", { mode: "image" })}
            ${item("imagegen", "Video", "movie", { mode: "video" })}
            ${item("studio", "Sprites", "face_retouching_natural")}
          </div>
        </div>

        <div class="side-foot">
          <div class="vault" title="Encrypted at rest with AES-256-GCM. The key lives only in the server's memory.">
            <span aria-hidden="true" class="material-symbols-rounded fill-icon">lock</span>
            <span class="vault-text">
              <strong>Encrypted vault</strong>
              ${this.stats
                ? `${formatBytes(this.stats.bytes)} · ${this.stats.total.toLocaleString()} ${this.stats.total === 1 ? "item" : "items"}`
                : "Unlocked"}
            </span>
          </div>
          <div class="foot-row">
            <button class="account" title=${`Signed in as ${name}`} @click=${this.openAccountMenu}>
              <span class="avatar" aria-hidden="true">${name.slice(0, 2).toUpperCase()}</span>
              <span class="account-text">
                <span class="account-name">${name}</span>
                <span class="account-sub">${this.user?.isAdmin ? "Admin" : "Signed in"}</span>
              </span>
            </button>
            <button
              class="foot-btn ${this.safe ? "on" : ""}"
              title=${this.safe ? "Safe view is on — press ` to show everything" : "Safe view: veil explicit tiles (`), or ~ to lock"}
              aria-label="Safe view"
              aria-pressed=${this.safe ? "true" : "false"}
              @click=${() => this.toggleSafe()}
            >
              <span aria-hidden="true" class="material-symbols-rounded">${this.safe ? "visibility_off" : "visibility"}</span>
            </button>
            <button class="foot-btn ${settingsActive ? "on" : ""}" title="Settings" aria-label="Settings"
              aria-current=${settingsActive ? "page" : nothing} @click=${() => this.go("settings")}>
              <span aria-hidden="true" class="material-symbols-rounded ${settingsActive ? "fill-icon" : ""}">settings</span>
            </button>
            <button class="foot-btn" title=${rail ? "Open the sidebar" : "Fold the sidebar to icons"}
              aria-label=${rail ? "Open the sidebar" : "Fold the sidebar"} @click=${this.toggleNavWidth}>
              <span aria-hidden="true" class="material-symbols-rounded">${rail ? "left_panel_open" : "left_panel_close"}</span>
            </button>
          </div>
        </div>
      </nav>
    `;
  }

  /** The phone's bar: Library, Chat, Add, Create, More. Hidden while an item is open,
   *  which on a phone is a screen of its own with its own way back. */
  private renderPhoneBar() {
    if (this.selectedId != null) return nothing;
    const tab = phoneTabFor(this.section);
    const b = (id: PhoneTab, label: string, icon: string, run: () => void, face = false) => html`<button
      class="pb-item ${tab === id ? "on" : ""}" aria-current=${tab === id ? "page" : nothing} @click=${run}>
      <span class="pb-pill">${face && this.libbyShown
        ? html`<img src=${DEFAULT_LIBBY_PFP} alt="" />`
        : html`<span aria-hidden="true" class="material-symbols-rounded ${tab === id ? "fill-icon" : ""}">${icon}</span>`}</span>
      ${label}
    </button>`;
    return html`<div class="phone-bar" role="navigation" aria-label="Sections">
      ${b("library", "Library", "photo_library", () => this.go(isLibrarySection(this.section) ? "home" : this.lastLibrary))}
      ${b("chat", "Chat", "forum", () => this.go("chat"), true)}
      <button class="pb-add" aria-label="Add media" title="Add media" @click=${this.toggleUpload}>
        <span aria-hidden="true" class="material-symbols-rounded">add</span>
      </button>
      ${b("create", "Create", "auto_awesome", () => this.go(this.lastCreate))}
      ${b("more", "More", "menu", () => (this.moreOpen = true))}
    </div>`;
  }

  /** The phone's More sheet: what the sidebar's footer holds on a desktop, and the
   *  studios by name, since Sprites would otherwise be two taps behind Create. */
  private renderMoreSheet() {
    if (!this.moreOpen) return nothing;
    const close = () => (this.moreOpen = false);
    const name = this.user?.username ?? "?";
    const row = (icon: string, label: string, run: () => void, opts: { on?: boolean; note?: string } = {}) => html`<button
      class="sheet-item ${opts.on ? "on" : ""}" @click=${() => { close(); run(); }}>
      <span aria-hidden="true" class="material-symbols-rounded">${icon}</span>${label}
      ${opts.note ? html`<span class="sheet-note">${opts.note}</span>` : nothing}
    </button>`;
    return html`<div class="sheet-scrim" @click=${(e: Event) => { if (e.target === e.currentTarget) close(); }}>
      <div class="sheet" role="dialog" aria-label="More" @keydown=${(e: KeyboardEvent) => { if (e.key === "Escape") close(); }}>
        <div class="sheet-grip" aria-hidden="true"></div>
        <div class="sheet-who">
          <span class="avatar" aria-hidden="true">${name.slice(0, 2).toUpperCase()}</span>
          <span class="account-text">
            <span class="account-name">${name}</span>
            <span class="account-sub">Encrypted vault${this.stats ? ` · ${formatBytes(this.stats.bytes)}` : ""}</span>
          </span>
        </div>
        ${row("image", "Image studio", () => this.go("imagegen", "image"))}
        ${row("movie", "Video studio", () => this.go("imagegen", "video"))}
        ${row("face_retouching_natural", "Sprites", () => this.go("studio"))}
        ${row(this.safe ? "visibility_off" : "visibility", "Safe view", () => this.toggleSafe(), { on: this.safe, note: this.safe ? "On" : "Off" })}
        ${row("settings", "Settings", () => this.go("settings"))}
        ${row("logout", "Sign out", () => this.logout())}
      </div>
    </div>`;
  }

  /**
   * The library's top bar: where you are, the search, and the grid's tools.
   *
   * Only the library has one. Chat and the studios open with headers of their own, and
   * the shell's search box over them searched something that was not on screen.
   */
  /** The tile-size button, beside the sort: both are about how the grid is shown. */
  private renderDensity() {
    return html`<button class="tool icon" aria-label="Tile size"
      title=${`${DENSITY_LABEL[this.density]} — switch to ${DENSITY_LABEL[nextDensity(this.density)].toLowerCase()}`}
      @click=${this.cycleDensity}>
      <span aria-hidden="true" class="material-symbols-rounded"
        >${this.density === "s" ? "apps" : this.density === "m" ? "grid_view" : "photo_size_select_large"}</span>
    </button>`;
  }

  private renderHeader(title: string, count: string, opts: { isViewer: boolean; search: boolean; grid: boolean; select: boolean }) {
    const hasSearch = this.search.trim().length > 0;
    return html`
      <header class="top ${opts.isViewer ? "viewing" : ""}">
        ${opts.isViewer
          ? html`<button class="icon-btn back-btn" title="Back" aria-label="Back" @click=${this.closeItem}>
              <span aria-hidden="true" class="material-symbols-rounded" style="font-size:24px;">arrow_back</span>
            </button>`
          : nothing}
        <div class="h-titles">
          <h1 class="h-title">${title}</h1>
          ${count ? html`<span class="h-count">${count}</span>` : nothing}
        </div>

        ${!opts.isViewer && opts.search
          ? html`<div class="searchbox">
              <span aria-hidden="true" class="material-symbols-rounded">search</span>
              <input
                type="search"
                aria-label="Search the library"
                .value=${this.search}
                @input=${this.onSearchInput}
                placeholder="Search titles, tags, notes…"
              />
              ${hasSearch
                ? html`<button class="icon-btn search-clear" aria-label="Clear the search" title="Clear the search"
                    @click=${this.clearSearch}>
                    <span aria-hidden="true" class="material-symbols-rounded" style="font-size:18px;">close</span>
                  </button>`
                : html`<kbd aria-hidden="true" title="Press / to search">/</kbd>`}
            </div>`
          : html`<span class="h-spacer"></span>`}

        ${!opts.isViewer
          ? html`<div class="tools">
              <button
                class="tool icon phone-only ${this.safe ? "on" : ""}"
                aria-label="Safe view"
                aria-pressed=${this.safe ? "true" : "false"}
                title="Safe view"
                @click=${() => this.toggleSafe()}
              >
                <span aria-hidden="true" class="material-symbols-rounded">${this.safe ? "visibility_off" : "visibility"}</span>
              </button>
              ${opts.select
                ? html`<button class="tool ${this.selectMode ? "on" : ""}" title="Select multiple"
                    aria-pressed=${this.selectMode ? "true" : "false"} @click=${this.toggleSelectMode}>
                    <span aria-hidden="true" class="material-symbols-rounded"
                      >${this.selectMode ? "check_circle" : "check_box_outline_blank"}</span>
                    <span class="tool-label">Select</span>
                  </button>`
                : nothing}
              ${filtersApply(this.section, this.search) ? this.renderFilters() : nothing}
            </div>
            ${this.renderScope()}`
          : nothing}
      </header>
    `;
  }

  /** The library's places as chips, for the phone, where there is no sidebar to hold
   *  them. Drawn on every size and shown only on a phone by the stylesheet. */
  private renderScope() {
    const chip = (id: Section, label: string) => {
      const on = this.section === id;
      return html`<button class="chip" aria-pressed=${on ? "true" : "false"} @click=${() => this.go(id)}>${label}</button>`;
    };
    return html`<div class="scope" role="group" aria-label="Library">
      ${chip("home", "Overview")}
      ${KIND_ORDER.map((k) => chip(k, KIND_META[k].label))}
      ${chip("favorites", "Favorites")}
      ${chip("collections", "Collections")}
      ${chip("browse", "Browse")}
    </div>`;
  }

  /**
   * The Filters menu. It offers exactly what the screen cannot already say: the kind
   * on Favorites and in a search, favourites-only on a kind section and in a search,
   * and a minimum rating everywhere. The sort is repeated here because on a phone the
   * grid's sort menu is a long scroll away.
   */
  private renderFilters() {
    const scope = filterScope(this.section, this.search);
    const active = activeFilterCount(this.refine, scope);
    const chip = (on: boolean, label: unknown, click: () => void) => html`<button
      class="fchip ${on ? "on" : ""}" aria-pressed=${on ? "true" : "false"} @click=${click}>${label}</button>`;
    const sorts: { id: MediaSort; label: string }[] = [
      { id: "newest", label: "Newest" }, { id: "oldest", label: "Oldest" },
      { id: "rating", label: "Top rated" }, { id: "largest", label: "Largest" },
    ];
    return html`<div class="filters-wrap">
      <button
        class="tool ${active || this.filtersOpen ? "on" : ""}"
        aria-haspopup="dialog"
        aria-expanded=${this.filtersOpen ? "true" : "false"}
        title="Filter the grid"
        @click=${this.toggleFilters}
      >
        <span aria-hidden="true" class="material-symbols-rounded">tune</span>
        <span class="tool-label">Filters</span>
        ${active ? html`<span class="fbadge">${active}</span>` : nothing}
      </button>
      ${this.filtersOpen
        ? html`<div class="filters-pop" role="dialog" aria-label="Filters"
            @keydown=${(e: KeyboardEvent) => { if (e.key === "Escape") this.filtersOpen = false; }}>
            ${scope.kind
              ? html`<div class="frow-label">Kind</div>
                  <div class="frow">
                    ${chip(!this.refine.kind, "All", () => this.setRefine({ kind: "" }))}
                    ${KIND_ORDER.map((k) => chip(this.refine.kind === k, html`<span aria-hidden="true"
                      class="material-symbols-rounded" style="font-size:16px;">${KIND_META[k].icon}</span>${KIND_META[k].label}`,
                      () => this.setRefine({ kind: this.refine.kind === k ? "" : k })))}
                  </div>`
              : nothing}
            <div class="frow-label">Rating</div>
            <div class="frow">
              ${chip(this.refine.minRating === 0, "Any", () => this.setRefine({ minRating: 0 }))}
              ${[3, 4, 5].map((n) => chip(this.refine.minRating === n, html`<span aria-hidden="true"
                class="material-symbols-rounded" style="font-size:16px;">star</span>${n === 5 ? "5" : n + "+"}`,
                () => this.setRefine({ minRating: this.refine.minRating === n ? 0 : n })))}
            </div>
            ${scope.favorite
              ? html`<div class="frow-label">Only</div>
                  <div class="frow">
                    ${chip(this.refine.favorite, html`<span aria-hidden="true" class="material-symbols-rounded"
                      style="font-size:16px;">favorite</span>Favourites`, () => this.setRefine({ favorite: !this.refine.favorite }))}
                  </div>`
              : nothing}
            <div class="frow-label">Sort</div>
            <div class="frow">
              ${sorts.map((s) => chip(this.sort === s.id, s.label, () => this.setSort(s.id)))}
            </div>
            <div class="ffoot">
              <span>${this.loading ? "Loading…" : `${this.total.toLocaleString()} ${this.total === 1 ? "item" : "items"}`}</span>
              <button class="flink" ?disabled=${!active} @click=${() => this.clearRefine()}>Clear filters</button>
            </div>
          </div>`
        : nothing}
    </div>`;
  }

  /**
   * Home, as a dashboard rather than a list of lists.
   *
   * It leads with the one thing you were in the middle of, hung like a picture on a
   * wall made of its own colours, then a line of what the vault holds, then — one card
   * each and no larger — the other two things the app is for: her, and the studios.
   * Only then the rows: what you were partway through, what she suggests, what you have
   * starred, the moments you marked, what is new, and each kind.
   *
   * Every section renders only when it has something in it: a new install shows the
   * hero and Recently added and nothing else, rather than four empty headings.
   */
  private renderHome() {
    const hour = new Date().getHours();
    const greeting = hour < 5 ? "Up late" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

    if (!this.home) {
      return html`<div class="empty" aria-busy="true">Opening the vault…</div>`;
    }
    if ((this.stats?.total ?? this.home.newest.length) === 0) {
      return html`<div class="empty-home anim-rise">
        <span aria-hidden="true" class="material-symbols-rounded fill-icon">lock</span>
        <h2>The vault is empty</h2>
        <div>Everything you add is encrypted before it reaches the disk.</div>
        <button class="hero-open" @click=${this.toggleUpload}>
          <span aria-hidden="true" class="material-symbols-rounded">add</span>Add media
        </button>
        <button class="link-btn" @click=${this.openScrape}>or import from a URL</button>
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

    const kindRows = KIND_ORDER.map((k) => ({
      kind: k,
      label: KIND_META[k].label,
      items: this.itemsForKind(k),
    })).filter((r) => r.items.length > 0);

    const row = (
      title: string,
      items: Media[],
      seeAll: (() => void) | null,
      delay: number,
      sub?: string,
      face = false,
    ) => items.length === 0 ? nothing : html`
      <section class="row anim-rise" style="animation-delay:${delay}ms;">
        <div class="row-head">
          ${face && this.libbyShown ? html`<img class="row-face" src=${DEFAULT_LIBBY_PFP} alt="" />` : nothing}
          <h3 class="row-title">${title}</h3>
          ${sub ? html`<span class="row-sub">${sub}</span>` : nothing}
          ${seeAll ? html`<button class="see-all" @click=${seeAll}>
            See all<span aria-hidden="true" class="material-symbols-rounded" style="font-size:16px;">chevron_right</span>
          </button>` : nothing}
        </div>
        <div class="row-scroll">${items.map((m) => this.renderTile(m, undefined, items))}</div>
      </section>`;

    return html`
      <div>
        <p class="greeting anim-rise">${greeting}${continueRow.length ? " — pick up where you left off" : " — here's what's new"}</p>
        ${hero ? this.renderHero(hero, continueRow.length ? continueRow : newest, continueRow.length > 0) : nothing}
        ${this.renderVaultStrip()}
        ${this.renderAlso()}

        ${row("Keep going", continueRow.slice(1), null, 110)}
        ${row("Libby suggests", this.home.suggested, null, 130, suggestionLine(this.home.because, this.safe), true)}
        ${row("Favourites", favorites, () => this.go("favorites"), 170)}
        ${this.renderMoments(this.home.moments)}
        ${row("Recently added", newest.slice(0, 12), null, 220)}

        ${kindRows.map((r, i) => row(r.label, r.items, () => this.go(r.kind), 270 + i * 60))}
      </div>
    `;
  }

  /** The hero: the picture framed on the right, its own colours as the wall. */
  private renderHero(hero: Media, list: Media[], continuing: boolean) {
    const veiled = this.safe && isExplicit(hero.tags);
    // hasThumbnail, not hasThumb: a photo is its own thumbnail and the server never
    // sets hasThumb for one, so the hero showed a placeholder icon for every picture.
    const thumb = hasThumbnail(hero) ? api.thumbURL(hero.id) : "";
    const ratio = hero.width && hero.height
      ? Math.min(1.78, Math.max(0.66, hero.width / hero.height))
      : hero.kind === "video" ? 16 / 9 : 4 / 5;
    const kind = KIND_META[hero.kind];
    return html`
      <section class="hero anim-rise ${veiled ? "veiled" : ""}" style="animation-delay:40ms;">
        ${thumb ? html`<img class="hero-wall" src=${thumb} alt="" aria-hidden="true" />` : nothing}
        <div class="hero-body">
          <span class="hero-eyebrow">${continuing ? "Continue" : "Latest addition"} · ${kind.label}</span>
          <h2 class="hero-title">${hero.title}</h2>
          ${hero.tags?.length
            ? html`<div class="hero-tags">${hero.tags.slice(0, 6).map((t) => html`<span>${t.name}</span>`)}</div>`
            : nothing}
          <div class="hero-acts">
            <button class="hero-open" @click=${() => this.openItem(hero.id, list)}>
              <span aria-hidden="true" class="material-symbols-rounded">${hero.kind === "video" || hero.kind === "gif" ? "play_arrow" : "open_in_full"}</span>
              ${continuing ? "Carry on" : "Open"}
            </button>
            <button class="hero-more" @click=${() => this.go(hero.kind)}>
              More ${kind.label.toLowerCase()}
            </button>
          </div>
        </div>
        <button class="hero-art" style=${`--ratio:${ratio.toFixed(3)};`} @click=${() => this.openItem(hero.id, list)}
          aria-label=${`Open ${hero.title}`}>
          ${thumb
            ? html`<img src=${thumb} alt="" />`
            : html`<span aria-hidden="true" class="material-symbols-rounded hero-icon">${kind.icon}</span>`}
        </button>
      </section>`;
  }

  /** What the vault holds, as one line. Every figure is the server's
   *  (GET /api/media/stats); they used to be counted from the library in browser
   *  memory, which is why the dashboard could not draw until all of it had arrived. */
  private renderVaultStrip() {
    const s = this.stats;
    if (!s) return nothing;
    return html`<div class="vault-strip anim-rise" style="animation-delay:70ms;">
      <span class="vs-item"><strong>${s.total.toLocaleString()}</strong>${s.total === 1 ? "item" : "items"}</span>
      <button class="vs-item" @click=${() => this.go("favorites")}>
        <strong>${s.favorites.toLocaleString()}</strong>${s.favorites === 1 ? "favourite" : "favourites"}</button>
      <span class="vs-item"><strong>${formatBytes(s.bytes)}</strong>stored</span>
      <span class="vs-item"><strong>${s.thisWeek.toLocaleString()}</strong>added this week</span>
      <span class="vs-lock" title="The key lives only in the server's memory; the disk holds ciphertext.">
        <span aria-hidden="true" class="material-symbols-rounded fill-icon">lock</span>Encrypted at rest · AES-256-GCM
      </span>
    </div>`;
  }

  /** The doors to the other two things the app is for. */
  private renderAlso() {
    const shown = this.libbyShown;
    return html`<div class="also anim-rise" style="animation-delay:90ms;">
      <button class="also-card" @click=${() => this.go("chat")}>
        ${shown
          ? html`<img class="also-face" src=${DEFAULT_LIBBY_PFP} alt="" />`
          : html`<span class="also-icon"><span aria-hidden="true" class="material-symbols-rounded">forum</span></span>`}
        <span class="also-copy">
          <span class="also-title">${shown ? "Talk to Libby" : "Chat"}</span>
          <span class="also-sub">${shown
            ? "She can search the library, open things for you and send pictures back"
            : "Your conversations and characters"}</span>
        </span>
        <span aria-hidden="true" class="material-symbols-rounded also-go">chevron_right</span>
      </button>
      <div class="also-card create">
        <span class="also-icon"><span aria-hidden="true" class="material-symbols-rounded">auto_awesome</span></span>
        <span class="also-copy">
          <span class="also-title">Create</span>
          <span class="also-sub">Pictures, clips and her sprites</span>
        </span>
        <span class="also-acts">
          <button class="also-btn" @click=${() => this.go("imagegen", "image")}>
            <span aria-hidden="true" class="material-symbols-rounded">image</span>Image</button>
          <button class="also-btn" @click=${() => this.go("imagegen", "video")}>
            <span aria-hidden="true" class="material-symbols-rounded">movie</span>Video</button>
          <button class="also-btn" @click=${() => this.go("studio")}>
            <span aria-hidden="true" class="material-symbols-rounded">face_retouching_natural</span>Sprites</button>
        </span>
      </div>
    </div>`;
  }

  /**
   * The Moments row: the latest bookmarked parts of videos, each opening the video
   * at that second. Frames rather than posters, because the point of a bookmark is
   * that it is *not* the start of the thing.
   */
  private renderMoments(moments: Bookmark[]) {
    if (!moments.length) return nothing;
    return html`
      <section class="row anim-rise" style="animation-delay:200ms;">
        <div class="row-head">
          <h3 class="row-title">Moments</h3>
          <span class="row-sub">The parts you marked · press B in a video to add one</span>
        </div>
        <div class="row-scroll">
          ${moments.map((mark) => html`
            <button class="moment-tile ${this.safe ? "veiled" : ""}" title=${`${mark.title ?? ""} at ${formatMoment(mark.position)}`}
              @click=${() => { this.viewerStartAt = mark.position; void this.onOpenMedia(new CustomEvent(OPEN_MEDIA_EVENT, { detail: { id: mark.mediaId, at: mark.position } })); }}>
              <img src=${api.bookmarkThumbURL(mark.id)} alt="" loading="lazy" />
              <span class="moment-caption">
                <strong>${formatMoment(mark.position)}</strong>
                <span>${mark.label || mark.title || ""}</span>
              </span>
            </button>`)}
        </div>
      </section>`;
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

    const activeChip = kind ? (this.filters[kind] ?? "All") : "All";
    const chips = kind
      ? ["All", ...this.chipTags.map((t) => t.name)].map((label) => ({
          label,
          active: activeChip === label,
        }))
      : [];

    const faces = kind === "game" ? this.renderGameFaces() : nothing;
    if (kind === "game" && this.gameFace !== "library") {
      return html`
        <div>
          ${faces}
          ${this.ready("gamebrowse")
            ? html`<oppai-game-browse .site=${this.gameFace} @imported=${() => this.refresh()}></oppai-game-browse>`
            : this.renderViewLoading()}
        </div>
      `;
    }

    return html`
      <div>
        ${faces}
        <div class="grid-bar">
          ${chips.length > 1
            ? html`<div class="chips" role="group" aria-label="Filter by tag">
                ${chips.map((c) => html`<button class="chip" aria-pressed=${c.active ? "true" : "false"}
                  @click=${() => this.setFilter(this.section, c.label)}>
                  ${c.active ? html`<span aria-hidden="true" class="material-symbols-rounded">check</span>` : nothing}
                  ${c.label}
                </button>`)}
              </div>`
            : html`<span class="h-spacer"></span>`}
          <div class="grid-tools">${this.renderSort()}${this.renderDensity()}</div>
        </div>

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
                class="grid cols-${DENSITY_PHONE_COLUMNS[this.density]}"
                style=${this.gridStyle}
                role="list"
                aria-label=${title}
                aria-busy=${this.loading ? "true" : "false"}
              >
                ${gridItems.map((m, i) => this.renderTile(m, i, gridItems))}
              </div>
              ${this.renderMore()}`}
      </div>
    `;
  }

  /** The Games section's face strip. Picking a catalogue starts its chunk loading;
   *  the element is written out once the chunk is in (see ready). */
  private renderGameFaces() {
    return html`<div class="chips game-faces" role="tablist" aria-label="Games">
      ${GAME_FACES.map((f) => html`<button
        class="chip"
        role="tab"
        aria-selected=${this.gameFace === f.id ? "true" : "false"}
        aria-pressed=${this.gameFace === f.id ? "true" : "false"}
        @click=${() => this.pickGameFace(f.id)}
      >
        <span aria-hidden="true" class="material-symbols-rounded">${f.icon}</span>
        ${f.label}
      </button>`)}
    </div>`;
  }

  private pickGameFace(face: GameFace) {
    if (face !== "library") this.ensureView("gamebrowse");
    this.gameFace = face;
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
            <button class="see-all" @click=${() => void this.renameOpenCollection(open)}>Rename</button>
            <button class="see-all" @click=${() => void this.deleteCollection(open)}>Delete</button>
          </div>
          ${this.items.length === 0
            ? html`<div class="empty">
                ${this.loading
                  ? "Loading…"
                  : "Nothing on this collection yet — add items from a tile's menu."}
              </div>`
            : html`<div class="grid cols-${DENSITY_PHONE_COLUMNS[this.density]}" style=${this.gridStyle} role="list" aria-label=${open.name}>
                ${this.items.map((m, i) => this.renderTile(m, i, this.items))}
              </div>`}
        </div>
      `;
    }
    return html`
      <div>
        <div class="grid-head">
          <button class="see-all" style="margin-left:0" @click=${() => void this.newCollection()}>
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
          : html`<div class="grid cols-${DENSITY_PHONE_COLUMNS[this.density]}" style=${this.gridStyle} role="list" aria-label="Collections">
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

  /** The grid's column sizing for the chosen density, as custom properties the
   *  stylesheet reads: a minimum width on a wide screen, a column count on a phone. */
  private get gridStyle(): string {
    return `--tile-min:${DENSITY_MIN[this.density]}px; --tile-cols:${DENSITY_PHONE_COLUMNS[this.density]};`;
  }

  private renderTile(m: Media, index?: number, list?: Media[]) {
    const meta = KIND_META[m.kind];
    const fav = this.favorites.has(m.id);
    const stat = statFor(m);
    // Grid tiles (index provided) fade+rise in with a capped stagger; home-row
    // tiles inherit their section's entrance instead.
    const anim = index != null ? "anim-rise" : "";
    const delay = index != null ? `animation-delay:${Math.min(index, 12) * 45}ms;` : "";
    const isSel = this.selected.has(m.id);
    const veiled = this.safe && isExplicit(m.tags);
    const cls = `tile ${anim} ${this.selectMode ? "selecting" : ""} ${isSel ? "selected" : ""} ${veiled ? "veiled" : ""}`;
    return html`
      <div
        class=${cls}
        data-id=${m.id}
        role=${index != null ? "listitem" : "button"}
        tabindex="0"
        aria-label=${`${m.title}${stat ? `, ${stat}` : ""}, ${meta.typeLabel}`}
        aria-pressed=${this.selectMode ? (isSel ? "true" : "false") : nothing}
        @click=${(e: MouseEvent) => this.clickTile(e, m.id, list)}
        @keydown=${(e: KeyboardEvent) => {
          // Enter and Space open, the same as a click. A grid of items you can see but
          // cannot reach without a mouse is not a grid a keyboard user can use at all.
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          if (this.selectMode) this.toggleSelected(m.id);
          else this.openItem(m.id, list);
        }}
        style=${delay}
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
          ${/* A photo's badge was its size in kilobytes, on every tile, which is noise in
               a photo library. Time and page counts are what a badge is for. */
            stat && m.kind !== "image" ? html`<span class="tile-stat">${stat}</span>` : nothing}
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
