import { generatorName } from "../model-manage.js";
import { LitElement, html, css, nothing } from "lit";
import { property, customElement, state } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { iconStyles, motionStyles } from "../theme.js";
import { pageStyles } from "./page-styles.js";
import {
  api,
  type CivitaiCategory,
  type CivitaiCollection,
  type CivitaiComment,
  type CivitaiCommentEntity,
  type CivitaiImage,
  type CivitaiInstalled,
  type CivitaiMe,
  type CivitaiModel,
  type CivitaiPost,
  type CivitaiVersion,
  type ComfyFolderKind,
  type ComfyPlaces,
  type InstallJob,
} from "../api.js";
import { mergeCivitaiPosts, postDate } from "../civitai-posts.js";
import { comfyFolderOf } from "../clip-models.js";
import { promptSettingsFrom, type PromptSettings } from "../civitai-prompt.js";
import { civitaiSized, compactNumber, mergeComments, mergeImages, neighbours, postPictures, reactionsOf, timeAgo } from "../civitai-browse.js";

/**
 * A full-screen browser over the Civitai catalogue (reached via the civitai.red
 * mirror, proxied by the server).
 *
 * Three pages. Browse searches the catalogue with the site's own filters and opens
 * a model's page, laid out the way the site's is: its versions, a showcase beside what
 * to install, the creator's description, the discussion under it, and the gallery of
 * every picture people posted with it. A picture opens over the page on a dark stage
 * with the rest of its post, who posted it, its reactions, the prompt and resources
 * that made it ("use in the studio" hands that over) and its comments; the poster's
 * name opens everything they posted. Comments are the site's own tRPC, read with the
 * user's key (civitai_comments.go). Account is the person the API key belongs to,
 * laid out like their profile on the site: models, posts, images and collections,
 * newest first. Installed is the studio's own models seen from the catalogue's
 * side — matched by file hash, with the cover, description and trigger words a
 * click away, a note when a newer version has been published, and, per model, the
 * version to follow, which showcase picture is the cover, an update to a newer
 * version, and deletion.
 *
 * Installing hands a version's download URL to the generator's side: InvokeAI
 * fetches the file on its own box, and for Automatic1111 the server downloads it into
 * A1111's models folder. Either way the catalogue's cover, description and trigger
 * words are written onto the model once the download completes — InvokeAI's record,
 * or the sidecar files A1111's cards read — so a model arrives looking the way it did
 * on the site. An A1111 without its models folder set can be browsed and linked but
 * not installed into, and the controls that would need the folder are not shown. An update is the same, plus the old record
 * is deleted once the new one is in. The install log stays folded away until
 * asked for: a finished download is not news the next time the browser opens.
 *
 * Video mode is the same browser for ComfyUI's clips: the catalogue narrowed to Wan's
 * models and LoRAs, installed into ComfyUI's mounted models folder rather than the
 * picture generator, and a Wan 2.2 version with the other half of its high/low pair,
 * since half a pair makes no clip (civitai_wan.go on the server).
 *
 * The host mounts it conditionally; closing dispatches "close", and picking a
 * prompt dispatches "use-prompt" with PromptSettings.
 */

type Tab = "browse" | "account" | "installed";
export type CivitaiMode = "pictures" | "video";
type AccountTab = "models" | "posts" | "images" | "collections";
type ThreadSort = "newest" | "oldest" | "reactions";

/** One comment section as loaded so far. */
interface Thread {
  items: CivitaiComment[];
  cursor: string;
  loading: boolean;
  error: string;
  /** Civitai answered that comments need a signed-in account (no key is set). */
  needsKey: boolean;
  /** Where the section is on the site. */
  page: string;
  sort: ThreadSort;
}

const TYPES: { id: string; label: string }[] = [
  { id: "", label: "All" },
  { id: "checkpoint", label: "Checkpoints" },
  { id: "lora", label: "LoRAs" },
  { id: "embedding", label: "Embeddings" },
  { id: "vae", label: "VAEs" },
  { id: "controlnet", label: "ControlNet" },
  { id: "upscaler", label: "Upscalers" },
  { id: "detection", label: "Detectors" },
];

/** Video mode's types: "video" is models and LoRAs together, without the workflows
    the catalogue files under the same base models. */
const VIDEO_TYPES: { id: string; label: string }[] = [
  { id: "video", label: "Models & LoRAs" },
  { id: "checkpoint", label: "Models" },
  { id: "lora", label: "LoRAs" },
];

/** Wan's base models as the catalogue names them, newest first. With none picked,
    video mode searches all of them. */
const VIDEO_BASES: { id: string; label: string }[] = [
  { id: "Wan Video 2.2 I2V-A14B", label: "Wan 2.2 · picture to video" },
  { id: "Wan Video 2.2 T2V-A14B", label: "Wan 2.2 · words to video" },
  { id: "Wan Video 2.2 TI2V-5B", label: "Wan 2.2 5B" },
  { id: "Wan Video 14B i2v 480p", label: "Wan 2.1 · picture to video, 480p" },
  { id: "Wan Video 14B i2v 720p", label: "Wan 2.1 · picture to video, 720p" },
  { id: "Wan Video 14B t2v", label: "Wan 2.1 · words to video" },
  { id: "Wan Video", label: "Wan, unspecified" },
];

const SORTS: { id: string; label: string }[] = [
  { id: "", label: "Most downloaded" },
  { id: "rated", label: "Highest rated" },
  { id: "liked", label: "Most liked" },
  { id: "newest", label: "Newest" },
  { id: "collected", label: "Most collected" },
  { id: "discussed", label: "Most discussed" },
  { id: "images", label: "Most images" },
];

const PERIODS: { id: string; label: string }[] = [
  { id: "", label: "All time" },
  { id: "year", label: "This year" },
  { id: "month", label: "This month" },
  { id: "week", label: "This week" },
  { id: "day", label: "Today" },
];

// The base models worth a filter, as the catalogue names them (its /enums), newest of
// each kind first. The list is what people actually run rather than every value the
// API has ever seen.
const BASES: string[] = [
  "Illustrious", "NoobAI", "Pony", "SDXL 1.0", "SD 1.5", "SD 2.1",
  "Anima", "Flux.2 Klein 9B", "Flux.2 Klein 4B", "Flux.1 D", "Flux.1 S", "Flux.1 Kontext", "Flux.1 Krea", "Chroma",
  "ZImageTurbo", "ZImageBase", "Qwen 2.1", "Qwen", "Krea 2", "Krea 2 Turbo", "Lumina", "Ernie", "MOSS Image",
  "Kolors", "Hunyuan 1", "Wan Video",
];

@customElement("oppai-civitai")
export class OppaiCivitai extends LitElement {
  /** Which generator the studio is connected to, "invokeai" or "a1111". */
  @property() backend = "invokeai";
  /** Whether models can be installed, updated and deleted there; see ImageGenStatus. */
  @property({ type: Boolean }) canManage = true;
  /** Why not, when canManage is off: what the server found wrong with A1111's models
      folder, or where to mount it. See model-manage.ts. */
  @property() manageNote = "";
  /** "video" browses Wan's models and LoRAs for ComfyUI instead; a toggle in the top
      bar switches between the two. */
  @property() mode: CivitaiMode = "pictures";

  private get genName(): string {
    return generatorName({ backend: this.backend });
  }

  @state() private tab: Tab = "browse";

  // ── browse ──
  @state() private q = "";
  @state() private type = "";
  @state() private sort = "";
  @state() private period = "";
  @state() private base = "";
  @state() private category = "";
  @state() private creator = "";
  @state() private nsfw = true;
  @state() private categories: CivitaiCategory[] = [];
  @state() private items: CivitaiModel[] = [];
  @state() private cursor = "";
  @state() private loading = false;
  @state() private error = "";

  // ── the model page ──
  @state() private detail: CivitaiModel | null = null;
  @state() private detailLoading = false;
  @state() private versionId = 0;
  @state() private shownImage = "";
  @state() private zoomed = "";
  @state() private gallery: CivitaiImage[] = [];
  @state() private galleryCursor = "";
  @state() private galleryLoading = false;
  @state() private gallerySort = "";
  /** The about text is folded when it runs long. */
  @state() private descOpen = false;
  /** Where the results were scrolled to when a page was opened over them. */
  private browseScroll = 0;

  // ── a picture, opened ──
  /** The picture opened over the page, and the list its arrows step through. */
  @state() private viewing: { image: CivitaiImage; list: CivitaiImage[] } | null = null;
  /** Each post's pictures, by post id, once asked for ([] while loading). */
  @state() private postPics: Record<number, CivitaiImage[]> = {};
  /** Which comments the opened picture shows: its own, or its post's. */
  @state() private viewTab: "picture" | "post" = "picture";
  /** Comment sections by "entity:id". */
  @state() private threads: Record<string, Thread> = {};
  /** Someone's pictures, opened from their name under a picture. */
  @state() private person: { username: string; items: CivitaiImage[]; cursor: string; loading: boolean } | null = null;
  @state() private copied = false;
  /** Civitai shares the prompt behind a picture only with an API key. When a page
   *  of pictures came back with none and no key is set, the gallery says why. */
  @state() private promptsNeedKey = false;

  // ── installs ──
  @state() private jobs: InstallJob[] = [];
  @state() private installing = false;
  /** The install log is folded by default; a chip in the top bar opens it. */
  @state() private jobsOpen = false;
  /** Video mode: ComfyUI's models folder, or why there is none to install into. */
  @state() private comfyPlaces: ComfyPlaces | null = null;
  /** The mode the browse page was last loaded for; see willUpdate. */
  private shownMode: CivitaiMode | "" = "";
  /** Bumped by each fresh search, so a slow answer for the last mode is dropped. */
  private searchGen = 0;

  // ── the account ──
  @state() private me: CivitaiMe | null = null;
  @state() private meError = "";
  @state() private meLoading = false;
  @state() private accountTab: AccountTab = "models";
  @state() private myImages: CivitaiImage[] = [];
  @state() private myImagesCursor = "";
  @state() private myModels: CivitaiModel[] = [];
  @state() private myModelsCursor = "";
  @state() private myModelsLoading = false;
  @state() private posts: CivitaiPost[] = [];
  @state() private postsCursor = "";
  @state() private postsLoading = false;
  /** A post opened to see every picture in it. */
  @state() private openPost: CivitaiPost | null = null;
  @state() private collections: CivitaiCollection[] = [];
  @state() private collectionsCursor = "";
  @state() private collectionsLoading = false;
  @state() private collectionQuery = "";
  @state() private collectionSort: "newest" | "followers" = "newest";
  /** A collection opened to its pictures, which load into `collectionImages`. */
  @state() private openCollection: CivitaiCollection | null = null;
  @state() private collectionImages: CivitaiImage[] = [];
  @state() private collectionImagesCursor = "";

  // ── installed ──
  @state() private installed: CivitaiInstalled[] = [];
  @state() private installedLoading = false;
  @state() private installedError = "";
  @state() private installedFilter: "all" | "linked" | "unlinked" | "updates" = "all";
  @state() private syncing = "";
  @state() private syncNote = "";
  /** Sync by hand: the model key whose version id is being typed. */
  @state() private pinning = "";
  @state() private pinVersion = "";
  /** The installed model whose management panel is open, with its catalogue page
   *  (every version and its showcase pictures) once loaded. */
  @state() private manageKey = "";
  @state() private managePage: CivitaiModel | null = null;
  @state() private manageVersion = 0;
  @state() private manageBusy = false;

  private jobTimer?: number;

  static styles = [
    iconStyles,
    motionStyles,
    pageStyles,
    css`
      :host {
        position: fixed;
        inset: 0;
        /* Above the studio's drawer, which on a phone is a sheet at 91 and is where
           "Find more on Civitai" is clicked from. */
        z-index: 95;
        display: block;
        background: var(--oppai-bg);
        color: var(--oppai-text);
        overflow-y: auto;
        overscroll-behavior: contain;
        scrollbar-gutter: stable;
      }
      /* The bar stays while the page scrolls under it, as the library's does. */
      .page-top { position: sticky; top: 0; z-index: 6; }
      .body { max-width: 1480px; margin: 0 auto; padding: 20px 28px 80px; box-sizing: border-box; }
      @media (max-width: 980px) {
        .page-top { height: auto; flex-wrap: wrap; padding: 10px 14px; row-gap: 8px; }
        .body { padding: 14px 14px 72px; }
      }
      @media (max-width: 560px) {
        .page-top .seg > button { padding: 0 9px; }
        .page-top .seg-label { display: none; }
      }

      /* The install log, folded under a chip. */
      .jobs {
        max-width: 1480px; margin: 12px auto 0; padding: 0 28px; box-sizing: border-box;
        display: flex; flex-direction: column; gap: 6px; font-size: 12px;
      }
      .jobs > div { background: var(--oppai-surface); border: 1px solid var(--oppai-border); border-radius: 12px; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; }
      .job { display: flex; gap: 8px; align-items: center; color: var(--oppai-text-dim); min-width: 0; }
      .job .st { font-weight: 600; flex-shrink: 0; }
      .job .st.error { color: var(--oppai-error); }
      .job .st.completed { color: var(--oppai-success); }
      .job .src { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .jobs-chip { position: relative; }
      .jobs-chip .dot {
        position: absolute; top: -3px; right: -3px; width: 8px; height: 8px; border-radius: 50%;
        background: var(--oppai-primary); animation: pulse 1.2s ease-in-out infinite;
      }
      @keyframes pulse { 50% { opacity: .3; } }

      /* ── browse ───────────────────────────────────────────────────────── */
      .filters { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 12px; }
      .filters .searchbox { flex: 1 1 280px; max-width: 520px; }
      .filters select.tool { max-width: 220px; }
      .types { margin-bottom: 18px; }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 22px 14px;
      }
      @media (max-width: 560px) { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px 10px; } }
      /* A model as the library draws a picture: the art, then its name under it. */
      .mtile {
        display: flex; flex-direction: column; gap: 8px; min-width: 0; padding: 0; border: none; background: none;
        color: var(--oppai-text); font: inherit; text-align: left; cursor: pointer;
      }
      .mtile .art {
        position: relative; aspect-ratio: 3 / 4; border-radius: var(--oppai-radius-md); overflow: hidden;
        background: var(--oppai-surface); transition: transform 0.22s var(--oppai-ease-spring), box-shadow 0.22s ease;
      }
      .mtile:hover .art { transform: translateY(-3px); box-shadow: var(--oppai-shadow-pop); }
      .mtile:focus-visible .art { outline: 2px solid var(--oppai-primary); outline-offset: 2px; }
      .art img, .art video, .art .noimg { width: 100%; height: 100%; object-fit: cover; display: block; }
      .art .noimg { display: grid; place-items: center; color: var(--oppai-text-muted); }
      .mtile .name {
        font-size: 13.5px; font-weight: 600; line-height: 1.3; overflow: hidden; text-overflow: ellipsis;
        display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; padding: 0 2px;
      }
      .mtile .sub { font-size: 12px; color: var(--oppai-text-muted); display: flex; gap: 8px; flex-wrap: wrap; padding: 0 2px; margin-top: -4px; }
      .badges { position: absolute; left: 8px; top: 8px; right: 8px; display: flex; gap: 5px; pointer-events: none; }
      .badge {
        background: rgba(0, 0, 0, .55); color: #fff; font-size: 11px; font-weight: 600;
        border-radius: 999px; padding: 3px 8px; display: inline-flex; align-items: center; gap: 4px;
        backdrop-filter: blur(6px);
      }
      .badge .material-symbols-rounded { font-size: 13px; }
      .badge.right { margin-left: auto; }
      .badge.ok { background: var(--oppai-primary); color: var(--oppai-on-primary); }
      .clip-mark {
        position: absolute; right: 8px; bottom: 8px; width: 26px; height: 26px; border-radius: 13px; display: grid; place-items: center;
        background: rgba(0, 0, 0, 0.55); color: #fff; pointer-events: none; backdrop-filter: blur(6px);
      }
      .clip-mark .material-symbols-rounded { font-size: 17px; }
      .more {
        display: flex; margin: 26px auto 0; height: 40px; padding: 0 22px; border-radius: 12px; align-items: center; gap: 8px;
        border: 1px solid var(--oppai-border-strong); background: none; color: var(--oppai-text-dim); font: inherit; font-size: 13.5px; cursor: pointer;
      }
      .more:hover { color: var(--oppai-text); background: var(--oppai-surface); }
      .sentinel { height: 1px; }
      .note { color: var(--oppai-text-muted); font-size: 13px; padding: 30px 0; text-align: center; line-height: 1.5; }
      .note.slim { padding: 12px 0; text-align: left; }
      .err { color: var(--oppai-error); font-size: 13px; margin-bottom: 12px; }
      /* The install log's and the account pages' own buttons, as tools. */
      .ghost {
        height: 34px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--oppai-border-strong); background: none;
        color: var(--oppai-text-dim); font: inherit; font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;
        text-decoration: none; white-space: nowrap; transition: background 0.15s ease, color 0.15s ease;
      }
      .ghost:hover:not(:disabled) { color: var(--oppai-text); background: var(--oppai-surface); }
      .ghost:disabled { opacity: .5; cursor: default; }
      .ghost.on { background: var(--oppai-selected); color: var(--oppai-primary-bright); border-color: transparent; }
      .ghost.danger { color: var(--oppai-error); }
      .controls { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 14px; }
      input[type="search"], input[type="text"] {
        background: var(--oppai-surface); border: 1px solid var(--oppai-border); border-radius: 12px; color: var(--oppai-text);
        font: inherit; font-size: 14px; padding: 9px 12px; outline: none;
      }
      .controls > input { flex: 1; min-width: 200px; }
      .searchbox input { padding: 0; border: none; background: none; border-radius: 0; }
      input:focus { border-color: color-mix(in srgb, var(--oppai-primary) 55%, transparent); }
      .crumb {
        display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 10px 0 6px; margin: 0 0 14px -6px; border: none;
        border-radius: 10px; background: none; color: var(--oppai-text-dim); font: inherit; font-size: 13px; cursor: pointer;
      }
      .crumb:hover { background: var(--oppai-surface); color: var(--oppai-text); }
      .crumb .material-symbols-rounded { font-size: 19px; }

      /* ── the model page ──────────────────────────────────────────────── */
      .mp-head { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
      .mp-head h1 { margin: 0; font-size: 28px; font-weight: 650; letter-spacing: -0.015em; line-height: 1.15; }
      .mp-meta { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; font-size: 13px; color: var(--oppai-text-dim); }
      .stat { display: inline-flex; align-items: center; gap: 5px; font-variant-numeric: tabular-nums; }
      .stat .material-symbols-rounded { font-size: 17px; color: var(--oppai-text-muted); }
      .creator {
        display: inline-flex; align-items: center; gap: 8px; height: 32px; padding: 0 12px 0 4px; border-radius: 999px; cursor: pointer;
        border: 1px solid var(--oppai-border); background: var(--oppai-surface); color: var(--oppai-text); font: inherit; font-size: 13px; font-weight: 600;
      }
      .creator:hover { border-color: var(--oppai-border-strong); background: var(--oppai-surface-2); }
      .creator img, .face {
        width: 24px; height: 24px; border-radius: 50%; object-fit: cover; flex: none; display: grid; place-items: center;
        background: var(--oppai-surface-3); color: var(--oppai-text); font-size: 11px; font-weight: 700; text-transform: uppercase;
      }
      .versions { margin-bottom: 18px; }
      .mp-grid { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 28px; align-items: start; }
      @media (max-width: 980px) { .mp-grid { grid-template-columns: minmax(0, 1fr); } }
      .showcase {
        position: relative; height: min(68vh, 760px); min-height: 320px; border-radius: var(--oppai-radius-lg); overflow: hidden;
        background: #050405; display: grid; place-items: center;
      }
      /* Filled and contained rather than max-sized: a percentage max-height on a grid
         item resolves against a track sized by its content, which is no limit at all. */
      .showcase > img, .showcase > video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; display: block; cursor: zoom-in; }
      .showcase .nav {
        position: absolute; top: 50%; width: 42px; height: 42px; margin-top: -21px; border-radius: 21px; border: none; cursor: pointer;
        background: rgba(0, 0, 0, .5); color: #fff; display: grid; place-items: center; backdrop-filter: blur(6px);
        opacity: 0; transition: opacity 0.15s ease;
      }
      .showcase:hover .nav, .showcase .nav:focus-visible { opacity: 1; }
      .showcase .nav:disabled { display: none; }
      .showcase .nav.prev { left: 12px; }
      .showcase .nav.next { right: 12px; }
      .showcase .count { position: absolute; right: 12px; top: 12px; }
      .thumbs { display: flex; gap: 8px; margin-top: 10px; overflow-x: auto; scrollbar-width: thin; padding-bottom: 4px; }
      .thumbs button { flex: none; width: 64px; height: 84px; padding: 0; border: 2px solid transparent; border-radius: 10px; overflow: hidden; background: var(--oppai-surface); cursor: pointer; opacity: .65; transition: opacity .15s ease; }
      .thumbs button:hover { opacity: 1; }
      .thumbs button.on { opacity: 1; border-color: var(--oppai-primary); }
      .thumbs img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .block { margin-top: 30px; }
      .desc {
        font-size: 14px; line-height: 1.65; color: var(--oppai-text-dim); word-break: break-word; position: relative;
      }
      .desc.folded { max-height: 320px; overflow: hidden; }
      .desc.folded::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 80px; background: linear-gradient(to bottom, transparent, var(--oppai-bg)); }
      .desc h1, .desc h2, .desc h3, .desc h4 { font-size: 15px; margin: 14px 0 6px; color: var(--oppai-text); }
      .desc p { margin: 0 0 10px; }
      .desc a { color: var(--oppai-primary-bright); }
      .desc img { max-width: 100%; border-radius: 10px; }
      .desc pre, .desc code { font-size: 12.5px; background: var(--oppai-surface); border-radius: 6px; padding: 2px 5px; white-space: pre-wrap; }
      .desc pre { padding: 10px 12px; }
      .desc ul, .desc ol { padding-left: 22px; margin: 4px 0 10px; }
      .desc table { border-collapse: collapse; font-size: 12.5px; }
      .desc td, .desc th { border: 1px solid var(--oppai-border); padding: 4px 8px; }
      .unfold { margin-top: 6px; border: none; background: none; color: var(--oppai-primary-bright); font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; padding: 4px 0; }

      .mp-side { position: sticky; top: 84px; display: flex; flex-direction: column; gap: 14px; }
      @media (max-width: 980px) { .mp-side { position: static; } }
      .side-card { padding: 16px; display: flex; flex-direction: column; gap: 14px; }
      .side-card .primary-btn { width: 100%; }
      .install-note { font-size: 12px; line-height: 1.5; color: var(--oppai-text-muted); }
      .install-note code { font-size: 11.5px; }
      .facts { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 8px 14px; margin: 0; font-size: 13px; }
      .facts dt { color: var(--oppai-text-muted); }
      .facts dd { margin: 0; color: var(--oppai-text); text-align: right; font-variant-numeric: tabular-nums; overflow: hidden; text-overflow: ellipsis; }
      .words {
        font-size: 12.5px; line-height: 1.5; color: var(--oppai-text); background: var(--oppai-bg); border: 1px solid var(--oppai-border);
        border-radius: 12px; padding: 10px 12px; word-break: break-word; display: flex; align-items: flex-start; gap: 8px; justify-content: space-between;
      }
      .files { display: flex; flex-direction: column; gap: 6px; }
      .file { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--oppai-text-dim); min-width: 0; }
      .file .fn { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--oppai-text); }
      .file .material-symbols-rounded { font-size: 17px; color: var(--oppai-text-muted); }
      .tags { display: flex; flex-wrap: wrap; gap: 6px; }

      /* The gallery: what people made with it, at each picture's own shape. */
      .masonry { columns: 5 220px; column-gap: 12px; }
      @media (max-width: 560px) { .masonry { columns: 2 150px; column-gap: 8px; } }
      .gcard {
        display: block; width: 100%; margin: 0 0 12px; padding: 0; border: none; border-radius: var(--oppai-radius-md); overflow: hidden;
        background: var(--oppai-surface); cursor: pointer; position: relative; break-inside: avoid; color: #fff; font: inherit; text-align: left;
      }
      .gcard img, .gcard video { width: 100%; height: auto; display: block; }
      .gcard .foot {
        position: absolute; left: 0; right: 0; bottom: 0; display: flex; align-items: center; gap: 8px; padding: 26px 10px 8px;
        background: linear-gradient(to top, rgba(0,0,0,.68), transparent); font-size: 12px; font-weight: 600;
        opacity: 0; transition: opacity 0.15s ease;
      }
      .gcard:hover .foot, .gcard:focus-visible .foot { opacity: 1; }
      .gcard .foot .who { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .gcard .foot .stat .material-symbols-rounded { color: #fff; font-size: 15px; }
      .gcard .mark { position: absolute; right: 8px; top: 8px; }
      .gcard:focus-visible { outline: 2px solid var(--oppai-primary); outline-offset: 2px; }
      @media (hover: none) { .gcard .foot { opacity: 1; } }

      /* Comments. */
      .thread { display: flex; flex-direction: column; gap: 2px; }
      .cmt { display: grid; grid-template-columns: 32px minmax(0, 1fr); gap: 10px; padding: 10px 0; border-top: 1px solid var(--oppai-border); }
      .cmt.reply { border-top: none; padding-top: 4px; }
      .cmt:first-child { border-top: none; }
      .cmt .face { width: 32px; height: 32px; font-size: 13px; }
      .cmt-head { display: flex; align-items: baseline; gap: 8px; font-size: 13px; flex-wrap: wrap; }
      .cmt-head b { font-weight: 600; }
      .cmt-head .when { font-size: 12px; color: var(--oppai-text-muted); }
      .cmt-body { font-size: 13.5px; line-height: 1.55; color: var(--oppai-text-dim); word-break: break-word; margin-top: 2px; }
      .cmt-body p { margin: 0 0 6px; }
      .cmt-body a { color: var(--oppai-primary-bright); }
      .cmt-body img { max-width: 100%; max-height: 260px; border-radius: 8px; }
      .cmt-foot { display: flex; align-items: center; gap: 12px; margin-top: 4px; font-size: 12px; color: var(--oppai-text-muted); }
      .cmt-foot a { color: var(--oppai-text-muted); }
      .cmt-foot a:hover { color: var(--oppai-text); }
      .pin { color: var(--oppai-primary); display: inline-flex; align-items: center; gap: 3px; font-size: 11.5px; font-weight: 600; }
      .pin .material-symbols-rounded { font-size: 14px; }
      .keynote {
        display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border-radius: 12px; font-size: 13px; line-height: 1.5;
        background: var(--oppai-surface); border: 1px solid var(--oppai-border); color: var(--oppai-text-dim);
      }
      .keynote .material-symbols-rounded { font-size: 19px; color: var(--oppai-primary); }
      .keynote a { color: var(--oppai-primary-bright); }

      /* ── a picture, opened: the picture on a dark stage, its post beside it ─ */
      .pv {
        position: fixed; inset: 0; z-index: 100; display: grid; grid-template-columns: minmax(0, 1fr) 420px;
        background: #050405; animation: oppai-fade-in 0.16s ease both;
      }
      @media (max-width: 900px) { .pv { grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 58vh) minmax(0, 1fr); } }
      .pv-stage { position: relative; min-width: 0; min-height: 0; display: grid; place-items: center; padding: 20px 64px; box-sizing: border-box; }
      @media (max-width: 900px) { .pv-stage { padding: 12px 48px; } }
      .pv-stage > img, .pv-stage > video { position: absolute; inset: 20px 64px; width: calc(100% - 128px); height: calc(100% - 40px); object-fit: contain; display: block; }
      @media (max-width: 900px) { .pv-stage > img, .pv-stage > video { inset: 12px 48px; width: calc(100% - 96px); height: calc(100% - 24px); } }
      .pv-x, .pv-nav {
        position: absolute; border: none; cursor: pointer; display: grid; place-items: center; color: #fff;
        background: rgba(255, 255, 255, .08); backdrop-filter: blur(8px);
      }
      .pv-x:hover, .pv-nav:hover:not(:disabled) { background: rgba(255, 255, 255, .16); }
      .pv-x { left: 14px; top: 14px; width: 40px; height: 40px; border-radius: 20px; }
      .pv-nav { top: 50%; width: 44px; height: 64px; margin-top: -32px; border-radius: 14px; }
      .pv-nav.prev { left: 10px; }
      .pv-nav.next { right: 10px; }
      .pv-nav:disabled { opacity: 0; pointer-events: none; }
      .pv-count { position: absolute; left: 50%; bottom: 14px; transform: translateX(-50%); }
      .pv-side {
        min-width: 0; min-height: 0; overflow-y: auto; overscroll-behavior: contain; background: var(--oppai-nav);
        border-left: 1px solid var(--oppai-border); padding: 18px 18px 40px; box-sizing: border-box;
        display: flex; flex-direction: column; gap: 18px; color: var(--oppai-text);
      }
      @media (max-width: 900px) { .pv-side { border-left: none; border-top: 1px solid var(--oppai-border); } }
      .pv-who { display: flex; align-items: center; gap: 10px; }
      .pv-who .face { width: 40px; height: 40px; font-size: 15px; }
      .pv-who .n { display: flex; flex-direction: column; min-width: 0; flex: 1; }
      .pv-who .n button { border: none; background: none; color: var(--oppai-text); font: inherit; font-size: 15px; font-weight: 650; padding: 0; text-align: left; cursor: pointer; }
      .pv-who .n button:hover { color: var(--oppai-primary-bright); }
      .pv-who .n span { font-size: 12px; color: var(--oppai-text-muted); }
      .reacts { display: flex; flex-wrap: wrap; gap: 6px; }
      .react {
        display: inline-flex; align-items: center; gap: 5px; height: 30px; padding: 0 11px; border-radius: 999px; font-size: 13px;
        background: var(--oppai-surface); border: 1px solid var(--oppai-border); color: var(--oppai-text); font-variant-numeric: tabular-nums;
      }
      .react .material-symbols-rounded { font-size: 16px; color: var(--oppai-primary); }
      .strip { display: grid; grid-template-columns: repeat(auto-fill, minmax(64px, 1fr)); gap: 6px; }
      .strip button { aspect-ratio: 3 / 4; padding: 0; border: 2px solid transparent; border-radius: 10px; overflow: hidden; background: var(--oppai-surface); cursor: pointer; opacity: .7; }
      .strip button:hover { opacity: 1; }
      .strip button.on { opacity: 1; border-color: var(--oppai-primary); }
      .strip img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .gen { display: flex; flex-direction: column; gap: 10px; }
      .gen .p {
        white-space: pre-wrap; word-break: break-word; background: var(--oppai-bg); border: 1px solid var(--oppai-border); border-radius: 12px;
        padding: 10px 12px; font-size: 13px; line-height: 1.55; max-height: 220px; overflow-y: auto; color: var(--oppai-text-dim);
      }
      .gen .p.neg { max-height: 120px; }
      .gen .facts { grid-template-columns: repeat(2, auto minmax(0, 1fr)); font-size: 12.5px; }
      .gen .facts dd { text-align: left; }
      .res { display: flex; flex-wrap: wrap; gap: 6px; }
      .res .tag b { font-weight: 600; margin-left: 5px; color: var(--oppai-text-muted); }
      .acts { display: flex; gap: 8px; flex-wrap: wrap; }
      .acts .primary-btn { flex: 1; }
      .side-sec { display: flex; flex-direction: column; gap: 10px; }
      .side-sec > .kicker { display: flex; align-items: center; gap: 8px; }
      .side-sec > .kicker .page-sub { text-transform: none; letter-spacing: 0; font-weight: 500; }

      /* A person's pictures. */
      .person-head { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; flex-wrap: wrap; }
      .person-head .face { width: 56px; height: 56px; font-size: 22px; }
      .person-head h1 { margin: 0; font-size: 24px; font-weight: 650; }

      /* A zoomed still. */
      .zoom { position: fixed; inset: 0; z-index: 100; background: rgba(0, 0, 0, 0.92); display: grid; place-items: center; cursor: zoom-out; }
      .zoom img { max-width: 100%; max-height: 100vh; object-fit: contain; }

      /* Account: a banner with the profile picture over its bottom edge, the way
         the site lays it out, then the profile's own tabs. */
      .banner { position: relative; margin: 4px 0 56px; }
      /* The picture clips to its rounded corners; the profile picture, hanging
         over the bottom edge, is a sibling so the clip does not cut it. */
      .banner .art {
        position: relative; border-radius: var(--oppai-radius-lg); overflow: hidden; background: var(--oppai-surface);
        aspect-ratio: 4 / 1; min-height: 120px; max-height: 260px;
      }
      .banner img.cover { width: 100%; height: 100%; object-fit: cover; display: block; }
      .banner .fade { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,.55), transparent 60%); }
      .who { position: absolute; left: 18px; bottom: -44px; display: flex; align-items: flex-end; gap: 14px; }
      .who img, .who .noface {
        width: 88px; height: 88px; border-radius: 50%; object-fit: cover; background: var(--oppai-surface);
        border: 4px solid var(--oppai-bg); display: grid; place-items: center; color: var(--oppai-text-muted);
      }
      .who .n { font-size: 20px; font-weight: 650; padding-bottom: 10px; }
      .banner .profile-link { position: absolute; right: 12px; bottom: 12px; color: #fff; background: rgba(0,0,0,.4); border-color: transparent; }
      .subtabs { display: flex; gap: 4px; margin: 0 0 16px; border-bottom: 1px solid var(--oppai-border); overflow-x: auto; scrollbar-width: none; }
      .subtabs button {
        border: none; background: none; color: var(--oppai-text-dim); font: inherit; font-size: 14px; flex: none;
        padding: 10px 14px; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px;
      }
      .subtabs button:hover { color: var(--oppai-text); }
      .subtabs button.on { color: var(--oppai-text); font-weight: 600; border-bottom-color: var(--oppai-primary); }
      .post-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 18px 12px; }
      .post {
        border: none; padding: 0; background: none; cursor: pointer; position: relative; text-align: left; color: var(--oppai-text); font: inherit;
        display: flex; flex-direction: column; gap: 6px;
      }
      .post .art { aspect-ratio: 3 / 4; border-radius: var(--oppai-radius-md); overflow: hidden; background: var(--oppai-surface); position: relative; }
      .post .pm { font-size: 12px; color: var(--oppai-text-muted); display: flex; justify-content: space-between; gap: 6px; padding: 0 2px; }
      .coll {
        display: grid; grid-template-columns: 64px minmax(0, 1fr) auto; gap: 12px; align-items: center;
        background: var(--oppai-surface); border: 1px solid var(--oppai-border); border-radius: 14px; padding: 8px 10px; color: inherit; font: inherit;
        text-align: left; width: 100%; cursor: pointer;
      }
      .coll:hover:not(:disabled) { border-color: var(--oppai-border-strong); }
      .coll img, .coll .noimg { width: 64px; height: 64px; border-radius: 10px; object-fit: cover; background: var(--oppai-surface-2); display: grid; place-items: center; color: var(--oppai-text-muted); }
      .coll .t { font-size: 13.5px; font-weight: 600; }
      .coll .d { font-size: 12px; color: var(--oppai-text-muted); margin-top: 2px; }
      .coll:disabled { cursor: default; opacity: .7; }
      .sub { font-size: 12.5px; color: var(--oppai-text-muted); line-height: 1.5; }

      /* Managing an installed model: its versions and the pictures to choose a cover from. */
      .vlabel { font-size: 11px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--oppai-text-muted); margin: 14px 0 8px; }
      .manage { grid-column: 1 / -1; background: var(--oppai-bg); border: 1px solid var(--oppai-border); border-radius: 12px; padding: 12px 14px; margin-top: 4px; }
      .manage .vlabel { margin-top: 10px; }
      .manage .actions { display: flex; gap: 8px; flex-wrap: wrap; }
      .versions-wrap { display: flex; flex-wrap: wrap; gap: 6px; }
      .covers { display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: 6px; }
      .covers button { border: 2px solid transparent; padding: 0; border-radius: 10px; overflow: hidden; background: var(--oppai-surface-2); cursor: pointer; position: relative; }
      .covers button.on { border-color: var(--oppai-primary); }
      .covers img { width: 100%; aspect-ratio: 3 / 4; object-fit: cover; display: block; }
      .covers .tick { position: absolute; top: 4px; right: 4px; background: var(--oppai-primary); color: var(--oppai-on-primary); border-radius: 50%; width: 18px; height: 18px; display: grid; place-items: center; }

      /* Installed. */
      .rows { display: flex; flex-direction: column; gap: 8px; }
      .row {
        display: grid; grid-template-columns: 64px minmax(0, 1fr) auto; gap: 14px; align-items: center;
        background: var(--oppai-surface); border: 1px solid var(--oppai-border); border-radius: 14px; padding: 10px 12px;
      }
      @media (max-width: 600px) { .row { grid-template-columns: 64px minmax(0, 1fr); } .row .rb { grid-column: 1 / -1; } }
      .row img, .row .noimg { width: 64px; height: 84px; border-radius: 10px; object-fit: cover; background: var(--oppai-surface-2); display: grid; place-items: center; color: var(--oppai-text-muted); }
      .row .t { font-size: 14px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .row .d { font-size: 12px; color: var(--oppai-text-muted); margin-top: 3px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
      .row .rb { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
      .upd { color: var(--oppai-primary-bright); font-weight: 600; display: inline-flex; align-items: center; gap: 3px; }
      .previews { display: flex; gap: 4px; margin-top: 6px; }
      .previews img { width: 34px; height: 44px; border-radius: 6px; object-fit: cover; cursor: zoom-in; }
      .pin-row { display: flex; gap: 6px; align-items: center; margin-top: 6px; }
      .pin-row input { min-width: 0; width: 140px; padding: 6px 8px; font-size: 12px; }
      .sync-note { font-size: 12.5px; color: var(--oppai-text-dim); margin: 0 0 12px; line-height: 1.5; }
    `,
  ];


  connectedCallback() {
    super.connectedCallback();
    // The first search waits for willUpdate, which knows the mode the host asked for.
    void this.loadCategories();
    this.jobTimer = window.setInterval(() => void this.pollJobs(), 5000);
    window.addEventListener("keydown", this.onKey);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.jobTimer) clearInterval(this.jobTimer);
    window.removeEventListener("keydown", this.onKey);
    this.sentinelWatch?.disconnect();
  }

  private async loadCategories() {
    try {
      this.categories = (await api.civitaiCategories()).categories;
    } catch {
      // Searching still works when an older mirror does not expose /tags.
      this.categories = [];
    }
  }

  protected willUpdate() {
    if (this.mode !== this.shownMode) this.applyMode();
  }

  private get video(): boolean {
    return this.mode === "video";
  }

  /** Starts the browse page over for the mode: its own types and base models, and
      its own install log. */
  private applyMode() {
    this.shownMode = this.mode;
    this.type = this.video ? "video" : "";
    this.base = "";
    this.category = "";
    this.tab = "browse";
    this.items = [];
    this.cursor = "";
    this.jobs = [];
    this.closeDetail();
    void this.search(true);
    void this.pollJobs();
  }

  private async pollJobs() {
    if (this.video) {
      try {
        const { jobs, places } = await api.comfyInstalls();
        this.comfyPlaces = places;
        this.jobs = jobs.slice(0, 5);
      } catch {
        /* the strip just stays as it was */
      }
      return;
    }
    try {
      const res = await api.civitaiInstalls();
      const jobs = res.jobs.filter((j) => j.status !== "cancelled").slice(0, 5);
      // A download that just completed changes what the Installed page shows.
      const finished = jobs.some((j) => j.status === "completed") &&
        !this.jobs.some((j) => j.status === "completed");
      this.jobs = jobs;
      if (finished && this.tab === "installed") void this.loadInstalled(false);
    } catch {
      /* the strip just stays as it was */
    }
  }

  // ── browse ──

  private async search(reset: boolean) {
    // A fresh search goes ahead over one still running, whose answer is then dropped;
    // only "load more" waits its turn.
    if (this.loading && !reset) return;
    const gen = reset ? ++this.searchGen : this.searchGen;
    this.loading = true;
    this.error = "";
    try {
      const res = await api.civitaiSearch({
        q: this.q || undefined,
        type: this.type || undefined,
        category: this.category || undefined,
        sort: this.sort || undefined,
        period: this.period || undefined,
        base: this.base || (this.video ? VIDEO_BASES.map((b) => b.id) : undefined),
        creator: this.creator || undefined,
        nsfw: this.nsfw,
        cursor: reset ? undefined : this.cursor || undefined,
      });
      if (gen !== this.searchGen) return;
      this.items = reset ? res.items : [...this.items, ...res.items];
      this.cursor = res.nextCursor ?? "";
    } catch (e) {
      if (gen === this.searchGen) this.error = (e as Error).message;
    } finally {
      if (gen === this.searchGen) this.loading = false;
    }
  }

  private setAnd(key: "type" | "sort" | "period" | "base" | "category" | "creator", value: string) {
    switch (key) {
      case "type": this.type = value; break;
      case "sort": this.sort = value; break;
      case "period": this.period = value; break;
      case "base": this.base = value; break;
      case "category": this.category = value; break;
      case "creator": this.creator = value; break;
    }
    this.tab = "browse";
    void this.search(true);
  }

  // ── the model page ──

  private async openDetail(m: CivitaiModel | number) {
    const id = typeof m === "number" ? m : m.id;
    // Where the results were scrolled to, so going back lands on the same row.
    if (!this.detail && !this.person) this.browseScroll = this.scrollTop;
    this.person = null;
    if (typeof m !== "number") {
      // Show what the card already knows while the page loads.
      this.detail = m;
      const v = m.versions[0];
      this.versionId = v?.id ?? 0;
      this.shownImage = v?.images[0] ?? "";
    } else {
      this.detail = null;
    }
    this.descOpen = false;
    this.gallery = [];
    this.galleryCursor = "";
    this.scrollTo({ top: 0 });
    this.detailLoading = true;
    void this.loadThread("model", id);
    try {
      const full = await api.civitaiModel(id);
      this.detail = full;
      const v = full.versions.find((x) => x.id === this.versionId) ?? full.versions[0];
      this.versionId = v?.id ?? 0;
      this.shownImage = v?.images[0] ?? this.shownImage;
    } catch (e) {
      this.error = (e as Error).message;
      if (!this.detail) this.detail = null;
    } finally {
      this.detailLoading = false;
    }
    void this.loadGallery(true);
  }

  private closeDetail() {
    const wasOpen = !!this.detail || !!this.person;
    this.detail = null;
    this.person = null;
    this.viewing = null;
    if (wasOpen) {
      const top = this.browseScroll;
      void this.updateComplete.then(() => this.scrollTo({ top }));
    }
  }

  private currentVersion(): CivitaiVersion | undefined {
    return this.detail?.versions.find((v) => v.id === this.versionId);
  }

  private pickVersion(ver: CivitaiVersion) {
    this.versionId = ver.id;
    this.shownImage = ver.images[0] ?? "";
    this.gallery = [];
    this.galleryCursor = "";
    void this.loadGallery(true);
  }

  /** The showcase steps through the version's own pictures. */
  private stepShowcase(delta: number) {
    const v = this.currentVersion();
    if (!v?.images.length) return;
    const i = Math.max(0, v.images.indexOf(this.shownImage));
    const next = v.images[i + delta];
    if (next) this.shownImage = next;
  }

  private async install(v: CivitaiVersion) {
    if (this.installing || !v.downloadUrl || !this.detail) return;
    this.installing = true;
    this.error = "";
    try {
      await api.civitaiInstall(v.downloadUrl, this.video
        ? { modelId: this.detail.id, versionId: v.id, target: "comfy", pair: true }
        : { modelId: this.detail.id, versionId: v.id });
      await this.pollJobs();
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.installing = false;
    }
  }

  /** The pictures people posted with the version on screen, a page at a time. */
  private async loadGallery(reset: boolean) {
    if (this.galleryLoading || !this.versionId) return;
    if (!reset && !this.galleryCursor) return;
    const asked = this.versionId;
    this.galleryLoading = true;
    try {
      const res = await api.civitaiImages({
        versionId: asked,
        sort: this.gallerySort || undefined,
        nsfw: this.nsfw,
        cursor: reset ? undefined : this.galleryCursor || undefined,
      });
      if (asked !== this.versionId) return;
      this.gallery = reset ? res.items : mergeImages(this.gallery, res.items);
      this.galleryCursor = res.nextCursor ?? "";
      this.promptsNeedKey = res.items.length > 0 && res.withPrompts === 0 && !res.keySet;
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.galleryLoading = false;
    }
  }

  private usePrompt(img: CivitaiImage) {
    const settings = promptSettingsFrom(img);
    if (!settings) return;
    this.dispatchEvent(new CustomEvent<PromptSettings>("use-prompt", { detail: settings, bubbles: true, composed: true }));
    this.viewing = null;
    this.zoomed = "";
  }

  private async copyPrompt(img: CivitaiImage) {
    try {
      await navigator.clipboard.writeText(img.prompt ?? "");
      this.copied = true;
      setTimeout(() => (this.copied = false), 1500);
    } catch {
      /* clipboard denied; the text is on screen to select */
    }
  }

  // ── a picture, opened ──

  /** Opens a picture over the page: `list` is what the arrows step through — the
   *  gallery it was clicked in, or its post. */
  private openPicture(image: CivitaiImage, list: CivitaiImage[]) {
    this.viewing = { image, list: list.length ? list : [image] };
    this.viewTab = "picture";
    this.copied = false;
    void this.loadPost(image.postId);
    void this.loadThread("image", image.id);
  }

  private showPicture(image: CivitaiImage, list?: CivitaiImage[]) {
    if (!this.viewing) return;
    this.viewing = { image, list: list ?? this.viewing.list };
    this.copied = false;
    void this.loadPost(image.postId);
    if (this.viewTab === "picture") void this.loadThread("image", image.id);
  }

  private stepPicture(delta: number) {
    if (!this.viewing) return;
    const { prev, next } = neighbours(this.viewing.list, this.viewing.image.id);
    const to = delta < 0 ? prev : next;
    if (to) this.showPicture(to);
    // Near the end of the gallery it was opened from: the next page, so the arrows go on.
    if (this.viewing.list === this.gallery && !next?.id && this.galleryCursor) void this.loadGallery(false);
  }

  /** The rest of a picture's post, once per post. */
  private async loadPost(postId?: number) {
    if (!postId || postId <= 0 || this.postPics[postId]) return;
    this.postPics = { ...this.postPics, [postId]: [] };
    try {
      const res = await api.civitaiImages({ postId, sort: "newest", nsfw: this.nsfw });
      // The feed lists a post newest first; the post was made in the order uploaded.
      const items = res.items.slice().sort((a, b) => a.id - b.id);
      this.postPics = { ...this.postPics, [postId]: items };
      // A gallery picture opened from the post's strip has its full data in here.
      const v = this.viewing;
      if (v) {
        const fresh = items.find((i) => i.id === v.image.id);
        if (fresh && !v.image.prompt && fresh.prompt) this.viewing = { ...v, image: { ...v.image, ...fresh } };
      }
    } catch {
      /* the strip shows the opened picture alone */
    }
  }

  private onKey = (e: KeyboardEvent) => {
    if (e.defaultPrevented || (e.target as HTMLElement | null)?.closest?.("input, textarea, select")) return;
    if (this.viewing) {
      if (e.key === "Escape") { this.viewing = null; e.preventDefault(); }
      else if (e.key === "ArrowLeft") { this.stepPicture(-1); e.preventDefault(); }
      else if (e.key === "ArrowRight") { this.stepPicture(1); e.preventDefault(); }
      return;
    }
    if (this.zoomed && e.key === "Escape") { this.zoomed = ""; e.preventDefault(); return; }
    if ((this.detail || this.person) && e.key === "Escape") { this.closeDetail(); e.preventDefault(); return; }
    if (this.detail && e.key === "ArrowLeft") this.stepShowcase(-1);
    if (this.detail && e.key === "ArrowRight") this.stepShowcase(1);
  };

  // ── comments ──

  private threadOf(entity: CivitaiCommentEntity, id: number): Thread | undefined {
    return this.threads[`${entity}:${id}`];
  }

  /** A comment section, the first page or the next; `sort` starts it over in that order. */
  private async loadThread(entity: CivitaiCommentEntity, id: number, more = false, sort?: ThreadSort) {
    const key = `${entity}:${id}`;
    const had = this.threads[key];
    if (had?.loading || (had && !more && !sort)) return;
    if (more && !had?.cursor) return;
    const order = sort ?? had?.sort ?? "newest";
    const base: Thread = more && had ? had : { items: [], cursor: "", loading: true, error: "", needsKey: false, page: had?.page ?? "", sort: order };
    this.threads = { ...this.threads, [key]: { ...base, loading: true, sort: order } };
    try {
      const res = await api.civitaiThread(entity, id, { cursor: more ? had?.cursor : undefined, sort: order });
      this.threads = {
        ...this.threads,
        [key]: { ...base, items: more ? mergeComments(base.items, res.items) : res.items, cursor: res.nextCursor ?? "", loading: false, page: res.page, sort: order },
      };
    } catch (e) {
      const err = e as Error & { body?: { needsKey?: boolean; page?: string } };
      this.threads = {
        ...this.threads,
        [key]: { ...base, loading: false, error: err.message, needsKey: !!err.body?.needsKey || /API key/.test(err.message), page: err.body?.page ?? base.page, sort: order },
      };
    }
  }

  // ── a person's pictures ──

  private openPerson(username: string) {
    if (!username) return;
    if (!this.detail && !this.person) this.browseScroll = this.scrollTop;
    this.viewing = null;
    this.detail = null;
    this.tab = "browse";
    this.person = { username, items: [], cursor: "", loading: false };
    this.scrollTo({ top: 0 });
    void this.loadPerson(true);
  }

  private async loadPerson(reset: boolean) {
    const p = this.person;
    if (!p || p.loading || (!reset && !p.cursor)) return;
    this.person = { ...p, loading: true };
    try {
      const res = await api.civitaiImages({ username: p.username, sort: "newest", nsfw: this.nsfw, cursor: reset ? undefined : p.cursor });
      if (this.person?.username !== p.username) return;
      this.person = { ...p, items: reset ? res.items : mergeImages(p.items, res.items), cursor: res.nextCursor ?? "", loading: false };
    } catch (e) {
      if (this.person?.username === p.username) this.person = { ...p, loading: false };
      this.error = (e as Error).message;
    }
  }

  /** "Load more" by scrolling: the sentinel under a list, seen, asks for its next page. */
  private watchSentinels() {
    this.sentinelWatch?.disconnect();
    const sentinels = this.renderRoot.querySelectorAll<HTMLElement>(".sentinel");
    if (!sentinels.length) return;
    this.sentinelWatch = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const which = (e.target as HTMLElement).dataset.feed;
        if (which === "browse" && this.cursor && !this.loading) void this.search(false);
        else if (which === "gallery") void this.loadGallery(false);
        else if (which === "person") void this.loadPerson(false);
      }
    }, { root: this, rootMargin: "900px 0px" });
    sentinels.forEach((s) => this.sentinelWatch!.observe(s));
  }
  private sentinelWatch?: IntersectionObserver;

  protected updated() {
    this.watchSentinels();
  }

  // ── the account ──

  private async loadMe() {
    if (this.meLoading) return;
    if (this.me) {
      void this.loadAccountTab(false);
      return;
    }
    this.meLoading = true;
    this.meError = "";
    try {
      this.me = await api.civitaiMe();
      this.myImages = [];
      this.myImagesCursor = "";
      // The feed's newest picture stands in for a cover the API keeps to itself,
      // so it is fetched first whichever tab is open.
      void this.loadMyImages(true).then(() => this.loadAccountTab(false));
    } catch (e) {
      this.meError = (e as Error).message;
    } finally {
      this.meLoading = false;
    }
  }

  private selectAccountTab(tab: AccountTab) {
    this.accountTab = tab;
    this.openPost = null;
    this.openCollection = null;
    void this.loadAccountTab(false);
  }

  /** Fills the open account tab the first time it is shown; `more` pages on. */
  private loadAccountTab(more: boolean): Promise<void> {
    if (!this.me) return Promise.resolve();
    switch (this.accountTab) {
      case "models":
        return more || this.myModels.length === 0 ? this.loadMyModels(!more) : Promise.resolve();
      case "posts":
        return more || this.posts.length === 0 ? this.loadPosts(!more) : Promise.resolve();
      case "images":
        return more || this.myImages.length === 0 ? this.loadMyImages(!more) : Promise.resolve();
      case "collections":
        return more || this.collections.length === 0 ? this.loadCollections(!more) : Promise.resolve();
    }
  }

  private async loadMyImages(reset: boolean) {
    if (!this.me || this.galleryLoading) return;
    this.galleryLoading = true;
    try {
      const res = await api.civitaiImages({
        username: this.me.username, sort: "newest", nsfw: this.nsfw,
        cursor: reset ? undefined : this.myImagesCursor || undefined,
      });
      this.myImages = reset ? res.items : [...this.myImages, ...res.items];
      this.myImagesCursor = res.nextCursor ?? "";
    } catch (e) {
      this.meError = (e as Error).message;
    } finally {
      this.galleryLoading = false;
    }
  }

  private async loadMyModels(reset: boolean) {
    if (!this.me || this.myModelsLoading) return;
    this.myModelsLoading = true;
    try {
      const res = await api.civitaiSearch({
        creator: this.me.username, sort: "newest", nsfw: this.nsfw,
        cursor: reset ? undefined : this.myModelsCursor || undefined,
      });
      this.myModels = reset ? res.items : [...this.myModels, ...res.items];
      this.myModelsCursor = res.nextCursor ?? "";
    } catch (e) {
      this.meError = (e as Error).message;
    } finally {
      this.myModelsLoading = false;
    }
  }

  private async loadPosts(reset: boolean) {
    if (!this.me || this.postsLoading) return;
    this.postsLoading = true;
    try {
      const res = await api.civitaiPosts({
        username: this.me.username, nsfw: this.nsfw,
        cursor: reset ? undefined : this.postsCursor || undefined,
      });
      this.posts = reset ? res.items : mergeCivitaiPosts(this.posts, res.items);
      this.postsCursor = res.nextCursor ?? "";
    } catch (e) {
      this.meError = (e as Error).message;
    } finally {
      this.postsLoading = false;
    }
  }

  private async loadCollections(reset: boolean) {
    if (this.collectionsLoading) return;
    this.collectionsLoading = true;
    try {
      const res = await api.civitaiCollections({
        q: this.collectionQuery || undefined, sort: this.collectionSort,
        cursor: reset ? undefined : this.collectionsCursor || undefined,
      });
      this.collections = reset ? res.items : [...this.collections, ...res.items];
      this.collectionsCursor = res.nextCursor ?? "";
    } catch (e) {
      this.meError = (e as Error).message;
    } finally {
      this.collectionsLoading = false;
    }
  }

  private async openCollectionPictures(c: CivitaiCollection, reset: boolean) {
    if (this.galleryLoading) return;
    if (reset) {
      this.openCollection = c;
      this.collectionImages = [];
      this.collectionImagesCursor = "";
    }
    this.galleryLoading = true;
    try {
      const res = await api.civitaiImages({
        collectionId: c.id, sort: "newest", nsfw: this.nsfw,
        cursor: reset ? undefined : this.collectionImagesCursor || undefined,
      });
      this.collectionImages = reset ? res.items : [...this.collectionImages, ...res.items];
      this.collectionImagesCursor = res.nextCursor ?? "";
    } catch (e) {
      this.meError = (e as Error).message;
    } finally {
      this.galleryLoading = false;
    }
  }

  // ── installed ──

  private async loadInstalled(refresh: boolean) {
    if (this.installedLoading) return;
    this.installedLoading = true;
    this.installedError = "";
    try {
      this.installed = (await api.civitaiInstalled(refresh)).models;
    } catch (e) {
      this.installedError = (e as Error).message;
    } finally {
      this.installedLoading = false;
    }
  }

  private async sync(m: CivitaiInstalled, versionId?: number) {
    if (this.syncing) return;
    this.syncing = m.key;
    this.syncNote = "";
    try {
      const link = await api.civitaiSync(m.key, versionId);
      const linked = "modelId" in link && link.modelId;
      this.syncNote = linked
        ? `${m.name}: cover, description and trigger words set from “${link.modelName}”.`
        : `${m.name}: Civitai does not know this file. Paste a version id to link it by hand.`;
      this.pinning = "";
      this.pinVersion = "";
      await this.loadInstalled(false);
    } catch (e) {
      this.syncNote = `${m.name}: ${(e as Error).message}`;
    } finally {
      this.syncing = "";
    }
  }

  /** Opens the management panel under an installed model: the catalogue page is
   *  fetched for its versions and their showcase pictures. */
  private async manage(m: CivitaiInstalled) {
    if (this.manageKey === m.key) {
      this.manageKey = "";
      this.managePage = null;
      return;
    }
    const c = m.civitai;
    if (!c) return;
    this.manageKey = m.key;
    this.managePage = null;
    this.manageVersion = c.versionId;
    try {
      const page = await api.civitaiModel(c.modelId);
      if (this.manageKey === m.key) this.managePage = page;
    } catch (e) {
      this.syncNote = `${m.name}: ${(e as Error).message}`;
    }
  }

  private async chooseCover(m: CivitaiInstalled, url: string) {
    if (this.manageBusy) return;
    this.manageBusy = true;
    try {
      await api.civitaiCover(m.key, url);
      this.syncNote = `${m.name}: cover set.`;
      await this.loadInstalled(false);
    } catch (e) {
      this.syncNote = `${m.name}: ${(e as Error).message}`;
    } finally {
      this.manageBusy = false;
    }
  }

  /** Moves the model to another version: the new file is downloaded, and this one
   *  is deleted once it is in. */
  private async updateModel(m: CivitaiInstalled, versionId?: number) {
    if (this.manageBusy) return;
    const target = this.managePage?.versions.find((v) => v.id === (versionId ?? m.civitai?.latestVersionId));
    const label = target ? `version ${target.name}` : "the newest version";
    if (!confirm(`Update “${m.name}” to ${label}? It is downloaded into ${this.genName}, then the current file is deleted.`)) return;
    this.manageBusy = true;
    try {
      await api.civitaiUpdate(m.key, versionId);
      this.syncNote = `${m.name}: downloading ${label}; the current file goes once it is in.`;
      this.manageKey = "";
      this.managePage = null;
      await this.pollJobs();
    } catch (e) {
      this.syncNote = `${m.name}: ${(e as Error).message}`;
    } finally {
      this.manageBusy = false;
    }
  }

  private async deleteInstalled(m: CivitaiInstalled) {
    if (this.manageBusy) return;
    if (!confirm(`Delete “${m.name}” from ${this.genName}? The file goes with it.`)) return;
    this.manageBusy = true;
    try {
      await api.deleteModel(m.key);
      this.syncNote = `${m.name}: deleted.`;
      if (this.manageKey === m.key) {
        this.manageKey = "";
        this.managePage = null;
      }
      this.installed = this.installed.filter((x) => x.key !== m.key);
    } catch (e) {
      this.syncNote = `${m.name}: ${(e as Error).message}`;
    } finally {
      this.manageBusy = false;
    }
  }

  private selectTab(tab: Tab) {
    this.tab = tab;
    this.closeDetail();
    if (tab === "account") void this.loadMe();
    if (tab === "installed" && this.installed.length === 0) void this.loadInstalled(false);
  }

  private jobLabel(j: InstallJob): string {
    if (j.status === "downloading" && j.totalBytes) {
      const pct = Math.round(((j.bytes ?? 0) / j.totalBytes) * 100);
      return `downloading ${pct}%`;
    }
    return j.status;
  }

  // ── render ──

  render() {
    const tabs: [Tab, string, string][] = this.video
      ? [["browse", "Browse", "explore"], ["account", "My account", "account_circle"]]
      : [["browse", "Browse", "explore"], ["account", "My account", "account_circle"], ["installed", "Installed", "inventory_2"]];
    return html`
      <header class="page-top">
        <button class="tool icon bare" title="Back to the studio" aria-label="Back to the studio"
          @click=${() => this.dispatchEvent(new CustomEvent("close"))}>
          <span class="material-symbols-rounded">arrow_back</span>
        </button>
        <h1 class="page-title"><span class="material-symbols-rounded">travel_explore</span>Civitai</h1>
        <div class="seg" role="radiogroup" aria-label="What for">
          ${(["pictures", "video"] as CivitaiMode[]).map(
            (m) => html`<button role="radio" aria-checked=${this.mode === m ? "true" : "false"}
              title=${m === "video" ? "Wan models and LoRAs for ComfyUI's clips" : `Models for ${this.genName}`}
              @click=${() => (this.mode = m)}>
              <span class="material-symbols-rounded">${m === "video" ? "movie" : "image"}</span>
              <span class="seg-label">${m === "video" ? "Video" : "Pictures"}</span>
            </button>`,
          )}
        </div>
        <div class="seg" role="tablist" aria-label="Pages">
          ${tabs.map(
            ([t, label, icon]) => html`<button role="tab" aria-selected=${this.tab === t ? "true" : "false"} @click=${() => this.selectTab(t)}>
              <span class="material-symbols-rounded">${icon}</span><span class="seg-label">${label}</span>
            </button>`,
          )}
        </div>
        <span class="page-spacer"></span>
        ${this.jobs.length ? this.renderJobsChip() : nothing}
      </header>
      ${this.jobs.length && this.jobsOpen
        ? html`<div class="jobs"><div>
            ${this.jobs.map(
              (j) => html`<div class="job">
                <span class="material-symbols-rounded" style="font-size:15px;">download</span>
                <span class="st ${j.status}">${this.jobLabel(j)}</span>
                <span class="src">${j.error || j.source}</span>
              </div>`,
            )}
          </div></div>`
        : nothing}
      <main class="body">
        ${this.tab === "browse"
          ? this.detail ? this.renderModelPage(this.detail) : this.person ? this.renderPerson() : this.renderBrowse()
          : this.tab === "account" ? this.renderAccount() : this.renderInstalled()}
      </main>
      ${this.viewing ? this.renderViewer() : this.zoomed
        ? html`<div class="zoom" @click=${() => (this.zoomed = "")}>
            <img src=${api.civitaiImageURL(this.zoomed)} alt="Preview" />
          </div>`
        : nothing}
    `;
  }

  /** The install log, folded: one chip saying how many downloads there are and
   *  whether one is still running, which opens the log. */
  private renderJobsChip() {
    const active = this.jobs.filter((j) => j.status === "downloading" || j.status === "running" || j.status === "waiting");
    const failed = this.jobs.some((j) => j.status === "error");
    const label = active.length
      ? active.length === 1 ? this.jobLabel(active[0]) : `${active.length} downloading`
      : `${this.jobs.length} download${this.jobs.length === 1 ? "" : "s"}`;
    return html`<button class="tool jobs-chip ${this.jobsOpen ? "on" : ""}"
      title=${this.jobsOpen ? "Hide the install log" : "Show the install log"} aria-expanded=${this.jobsOpen ? "true" : "false"}
      @click=${() => (this.jobsOpen = !this.jobsOpen)}>
      <span class="material-symbols-rounded">${failed ? "error" : "download"}</span> ${label}
      ${active.length ? html`<span class="dot"></span>` : nothing}
    </button>`;
  }

  private renderBrowse() {
    return html`
      <div class="filters">
        <label class="searchbox">
          <span class="material-symbols-rounded">search</span>
          <input type="search" placeholder="Search models…" aria-label="Search models" .value=${this.q}
            @input=${(e: Event) => (this.q = (e.target as HTMLInputElement).value)}
            @keydown=${(e: KeyboardEvent) => { if (e.key === "Enter") void this.search(true); }} />
        </label>
        <select class="tool" aria-label="Sort" .value=${this.sort} @change=${(e: Event) => this.setAnd("sort", (e.target as HTMLSelectElement).value)}>
          ${SORTS.map((s) => html`<option value=${s.id} ?selected=${s.id === this.sort}>${s.label}</option>`)}
        </select>
        <select class="tool" aria-label="Period" .value=${this.period} @change=${(e: Event) => this.setAnd("period", (e.target as HTMLSelectElement).value)}>
          ${PERIODS.map((p) => html`<option value=${p.id} ?selected=${p.id === this.period}>${p.label}</option>`)}
        </select>
        <select class="tool" aria-label="Base model" .value=${this.base} @change=${(e: Event) => this.setAnd("base", (e.target as HTMLSelectElement).value)}>
          ${this.video
            ? html`<option value="">Any Wan</option>
                ${VIDEO_BASES.map((b) => html`<option value=${b.id} ?selected=${b.id === this.base}>${b.label}</option>`)}`
            : html`<option value="">Any base model</option>
                ${BASES.map((b) => html`<option value=${b} ?selected=${b === this.base}>${b}</option>`)}`}
        </select>
        <select class="tool" aria-label="Category" .value=${this.category} @change=${(e: Event) => this.setAnd("category", (e.target as HTMLSelectElement).value)}>
          <option value="">All categories</option>
          ${this.categories.map((c) => html`<option value=${c.name} ?selected=${c.name === this.category}>${c.name} (${fmtCount(c.count)})</option>`)}
        </select>
        <button class="tool" title="Show adult models and pictures" aria-pressed=${this.nsfw ? "true" : "false"}
          @click=${() => { this.nsfw = !this.nsfw; void this.search(true); }}>
          <span class="material-symbols-rounded">explicit</span> Adult
        </button>
      </div>
      <div class="chip-row types">
        ${(this.video ? VIDEO_TYPES : TYPES).map((t) => html`<button class="chip" aria-pressed=${this.type === t.id ? "true" : "false"} @click=${() => this.setAnd("type", t.id)}>${t.label}</button>`)}
        ${this.creator
          ? html`<button class="chip" aria-pressed="true" title="Showing one creator's models" @click=${() => this.setAnd("creator", "")}>
              <span class="material-symbols-rounded">person</span> ${this.creator}
              <span class="material-symbols-rounded">close</span>
            </button>`
          : nothing}
      </div>
      ${this.error ? html`<div class="err">${this.error}</div>` : nothing}
      <div class="grid">${this.items.map((m) => this.renderCard(m))}</div>
      ${this.loading
        ? html`<div class="note">Searching Civitai…</div>`
        : this.items.length
          ? this.cursor
            ? html`<div class="sentinel" data-feed="browse"></div>
                <button class="more" @click=${() => this.search(false)}>More models</button>`
            : nothing
          : html`<div class="note">No models matched. Try another search.</div>`}
    `;
  }

  /**
   * A tile's picture. A still that stands in for a showcase clip is the clip's poster,
   * and the clip plays while the tile is pointed at (or always, for the one being
   * looked at): a grid of thirty clips all playing is thirty downloads at once, and the
   * CDN answers a burst like that with 429s. The still stays if the clip never loads.
   */
  private tileMedia(still: string, clip: string | undefined, alt: string, always = false, width = 450) {
    const poster = api.civitaiImageURL(civitaiSized(still, width));
    if (!clip) return html`<img src=${poster} alt=${alt} loading="lazy" />`;
    return html`<video poster=${poster} src=${api.civitaiImageURL(clip)} muted loop playsinline
      preload=${always ? "auto" : "none"} ?autoplay=${always} aria-label=${alt}
      @mouseenter=${(e: Event) => void (e.target as HTMLVideoElement).play().catch(() => {})}
      @mouseleave=${(e: Event) => { if (!always) (e.target as HTMLVideoElement).pause(); }}></video>
      ${always ? nothing : html`<span class="clip-mark" title="A clip — point at it to play"><span class="material-symbols-rounded">play_arrow</span></span>`}`;
  }

  private renderCard(m: CivitaiModel) {
    const img = m.versions[0]?.images[0];
    return html`
      <button class="mtile" @click=${() => this.openDetail(m)}
        @mouseenter=${(e: Event) => void (e.currentTarget as HTMLElement).querySelector("video")?.play().catch(() => {})}
        @mouseleave=${(e: Event) => (e.currentTarget as HTMLElement).querySelector("video")?.pause()}>
        <div class="art">
          ${img
            ? this.tileMedia(img, m.versions[0]?.videos?.[0], m.name)
            : html`<div class="noimg"><span class="material-symbols-rounded" style="font-size:34px;">image</span></div>`}
          <div class="badges">
            <span class="badge">${typeLabel(m.type)}</span>
            ${m.installed && !this.video ? html`<span class="badge ok"><span class="material-symbols-rounded">check</span> Installed</span>` : nothing}
            ${m.nsfw ? html`<span class="badge right">18+</span>` : nothing}
          </div>
        </div>
        <span class="name">${m.name}</span>
        <span class="sub">
          ${m.versions[0]?.base ? html`<span>${m.versions[0].base}</span>` : nothing}
          <span class="stat"><span class="material-symbols-rounded">download</span>${fmtCount(m.downloads)}</span>
          ${m.likes ? html`<span class="stat"><span class="material-symbols-rounded">thumb_up</span>${fmtCount(m.likes)}</span>` : nothing}
        </span>
      </button>
    `;
  }

  /** A model's page, laid out as the site lays it out: what it is and who made it, its
   *  versions, its showcase beside what to install, what its creator wrote, what people
   *  said, and every picture people made with it. */
  private renderModelPage(m: CivitaiModel) {
    const v = this.currentVersion();
    const shown = v ? Math.max(0, v.images.indexOf(this.shownImage)) : 0;
    const long = (m.description?.length ?? 0) > 1400;
    const site = `https://civitai.com/models/${m.id}${v ? `?modelVersionId=${v.id}` : ""}`;
    return html`
      <button class="crumb" @click=${() => this.closeDetail()}>
        <span class="material-symbols-rounded">arrow_back</span> ${this.creator ? `Models by ${this.creator}` : "All models"}
      </button>
      <header class="mp-head">
        <span class="kicker">${typeLabel(m.type)}${v?.base ? ` · ${v.base}` : ""}${m.nsfw ? " · 18+" : ""}</span>
        <h1>${m.name}</h1>
        <div class="mp-meta">
          ${m.creator
            ? html`<button class="creator" title="Their other models" @click=${() => { this.closeDetail(); this.setAnd("creator", m.creator ?? ""); }}>
                ${m.creatorImage ? html`<img src=${api.civitaiImageURL(m.creatorImage)} alt="" />` : html`<span class="face">${m.creator.slice(0, 1)}</span>`}
                ${m.creator}
              </button>`
            : nothing}
          <span class="stat" title="Downloads"><span class="material-symbols-rounded">download</span>${fmtCount(m.downloads)}</span>
          <span class="stat" title="Likes"><span class="material-symbols-rounded">thumb_up</span>${fmtCount(m.likes)}</span>
          ${m.comments ? html`<span class="stat" title="Comments"><span class="material-symbols-rounded">chat_bubble</span>${fmtCount(m.comments)}</span>` : nothing}
          ${m.collected ? html`<span class="stat" title="Collected"><span class="material-symbols-rounded">bookmarks</span>${fmtCount(m.collected)}</span>` : nothing}
          <a class="tool" target="_blank" rel="noopener noreferrer" href=${site}>
            <span class="material-symbols-rounded">open_in_new</span> civitai.com
          </a>
        </div>
      </header>
      ${m.versions.length > 1
        ? html`<div class="chip-row versions" role="tablist" aria-label="Versions">
            ${m.versions.map(
              (ver) => html`<button class="chip" role="tab" aria-pressed=${ver.id === this.versionId ? "true" : "false"} @click=${() => this.pickVersion(ver)}>
                ${ver.installed && !this.video ? html`<span class="material-symbols-rounded">check</span>` : nothing}
                ${ver.name}
              </button>`,
            )}
          </div>`
        : nothing}
      <div class="mp-grid">
        <div class="mp-main">
          <div class="showcase">
            ${this.shownImage && clipOf(v, this.shownImage)
              ? html`<video poster=${api.civitaiImageURL(this.shownImage)} src=${api.civitaiImageURL(clipOf(v, this.shownImage))}
                  autoplay muted loop playsinline controls aria-label=${m.name}></video>`
              : this.shownImage
              ? html`<img src=${api.civitaiImageURL(civitaiSized(this.shownImage, 1400))} alt=${m.name} @click=${() => (this.zoomed = this.shownImage)} />`
              : html`<span class="material-symbols-rounded" style="font-size:44px; color:var(--oppai-text-muted);">image</span>`}
            ${v && v.images.length > 1
              ? html`<button class="nav prev" aria-label="Previous picture" ?disabled=${shown === 0} @click=${() => this.stepShowcase(-1)}>
                  <span class="material-symbols-rounded">chevron_left</span>
                </button>
                <button class="nav next" aria-label="Next picture" ?disabled=${shown >= v.images.length - 1} @click=${() => this.stepShowcase(1)}>
                  <span class="material-symbols-rounded">chevron_right</span>
                </button>
                <span class="badge count">${shown + 1} / ${v.images.length}</span>`
              : nothing}
          </div>
          ${v && v.images.length > 1
            ? html`<div class="thumbs">
                ${v.images.map(
                  (u) => html`<button class=${u === this.shownImage ? "on" : ""} aria-label="Show this picture" @click=${() => (this.shownImage = u)}>
                    <img src=${api.civitaiImageURL(civitaiSized(u, 160))} alt="" loading="lazy" />
                  </button>`,
                )}
              </div>`
            : nothing}
          ${this.detailLoading && !m.description ? html`<div class="note slim">Loading the model page…</div>` : nothing}
          ${m.description
            ? html`<section class="block">
                <div class="sec-head"><h2>About</h2></div>
                <div class="desc ${long && !this.descOpen ? "folded" : ""}">${unsafeHTML(m.description)}</div>
                ${long ? html`<button class="unfold" @click=${() => (this.descOpen = !this.descOpen)}>${this.descOpen ? "Show less" : "Show all of it"}</button>` : nothing}
              </section>`
            : nothing}
          ${v?.description && v.description !== m.description
            ? html`<section class="block">
                <div class="sec-head"><h2>About ${v.name}</h2></div>
                <div class="desc">${unsafeHTML(v.description)}</div>
              </section>`
            : nothing}
          <section class="block">
            <div class="sec-head">
              <h2>Discussion</h2>
              ${m.comments ? html`<span class="page-sub">${fmtCount(m.comments)} comments</span>` : nothing}
              <span class="page-spacer"></span>
              ${this.renderThreadSorts("model", m.id)}
            </div>
            ${this.renderThread("model", m.id)}
          </section>
        </div>
        <aside class="mp-side">
          <div class="panel side-card">
            ${v ? this.renderInstallButton(m, v) : nothing}
            <div class="install-note">${this.installNote(m, v)}</div>
            ${v
              ? html`<dl class="facts">
                  <dt>Version</dt><dd>${v.name}</dd>
                  <dt>Base model</dt><dd>${v.base || "—"}</dd>
                  ${v.publishedAt ? html`<dt>Published</dt><dd>${fmtDate(v.publishedAt)}</dd>` : nothing}
                  ${v.downloads ? html`<dt>Downloads</dt><dd>${fmtCount(v.downloads)}</dd>` : nothing}
                  ${v.likes ? html`<dt>Likes</dt><dd>${fmtCount(v.likes)}</dd>` : nothing}
                  ${v.sizeMB ? html`<dt>Size</dt><dd>${fmtSize(v.sizeMB)}</dd>` : nothing}
                </dl>`
              : nothing}
            ${v?.trainedWords.length
              ? html`<div class="side-sec">
                  <span class="kicker">Trigger words</span>
                  <div class="words">
                    <span>${v.trainedWords.join(", ")}</span>
                    <button class="tool icon bare" style="width:28px; height:28px;" title="Copy the trigger words"
                      @click=${() => void navigator.clipboard?.writeText(v.trainedWords.join(", "))}>
                      <span class="material-symbols-rounded" style="font-size:16px;">content_copy</span>
                    </button>
                  </div>
                </div>`
              : nothing}
            ${v?.files?.length
              ? html`<div class="side-sec">
                  <span class="kicker">Files</span>
                  <div class="files">
                    ${v.files.map(
                      (f) => html`<div class="file" title=${f.name}>
                        <span class="material-symbols-rounded">${f.primary ? "star" : "draft"}</span>
                        <span class="fn">${f.name}</span>
                        <span>${fmtSize(f.sizeMB)}</span>
                        ${f.precision ? html`<span>${f.precision}</span>` : nothing}
                      </div>`,
                    )}
                  </div>
                </div>`
              : nothing}
          </div>
          ${m.tags.length
            ? html`<div class="panel side-card">
                <span class="kicker">Tags</span>
                <div class="tags">
                  ${m.tags.slice(0, 20).map((t) => html`<button class="chip small" title="Models in this category" @click=${() => { this.closeDetail(); this.setAnd("category", t); }}>${t}</button>`)}
                </div>
              </div>`
            : nothing}
        </aside>
      </div>
      <section class="block">
        <div class="sec-head">
          <h2>Gallery</h2>
          <span class="page-sub">What people made with ${v ? v.name : "it"}</span>
          <span class="page-spacer"></span>
          <div class="chip-row">
            ${[["", "Most reactions"], ["newest", "Newest"], ["comments", "Most discussed"]].map(
              ([id, label]) => html`<button class="chip small" aria-pressed=${this.gallerySort === id ? "true" : "false"}
                @click=${() => { this.gallerySort = id; this.gallery = []; this.galleryCursor = ""; void this.loadGallery(true); }}>${label}</button>`,
            )}
          </div>
        </div>
        ${this.promptsNeedKey
          ? html`<div class="keynote" style="margin-bottom:14px;">
              <span class="material-symbols-rounded">key</span>
              <span>Civitai shares the prompt behind a picture, and its comments, only with an API key. Add yours under Settings → Image generation to read them here.</span>
            </div>`
          : nothing}
        ${this.renderMasonry(this.gallery)}
        ${this.galleryLoading
          ? html`<div class="note">Loading pictures…</div>`
          : this.gallery.length
            ? this.galleryCursor
              ? html`<div class="sentinel" data-feed="gallery"></div>
                  <button class="more" @click=${() => this.loadGallery(false)}>More pictures</button>`
              : nothing
            : html`<div class="note">Nobody has posted a picture with this version yet.</div>`}
      </section>
    `;
  }

  private renderInstallButton(m: CivitaiModel, v: CivitaiVersion) {
    if (this.video) return this.renderComfyInstall(m, v);
    if (v.installed) {
      return html`<button class="primary-btn" disabled>
        <span class="material-symbols-rounded">check_circle</span> Installed in ${this.genName}
      </button>`;
    }
    if (!this.canManage) return nothing;
    return html`<button class="primary-btn" ?disabled=${this.installing || !v.downloadUrl} @click=${() => this.install(v)}>
      <span class="material-symbols-rounded">download</span>
      Install to ${this.genName}${v.sizeMB ? ` · ${fmtSize(v.sizeMB)}` : ""}
    </button>`;
  }

  private installNote(m: CivitaiModel, v: CivitaiVersion | undefined) {
    if (this.video) {
      const place = this.comfyPlace(m, v);
      return place.dir
        ? html`The server downloads into <code>${place.dir}</code>, named so the high- and low-noise
            halves read as a pair. Press <b>Refresh</b> under Settings → Image generation → Video to pick them.`
        : place.problem || html`ComfyUI has no API that takes a download, so installing from here
            needs the folder ComfyUI keeps ${place.what} in set under Settings → Image generation → Video.`;
    }
    if (!this.canManage) {
      return this.manageNote || "Automatic1111 has no API that takes a download, so installing from here needs its models folder mapped into the OppaiLib container.";
    }
    switch (this.backend) {
      case "invokeai": return "InvokeAI downloads the file itself; the cover, description and trigger words follow once it is in.";
      case "comfyui": return "The server downloads the file into ComfyUI's folder for it; the cover, description and trigger words land beside it.";
      default: return "The server downloads the file into Automatic1111's models folder and asks it to rescan; the cover, description and trigger words follow as A1111's own sidecar files.";
    }
  }

  /** The folder a version would be installed into — dir "" when there is none, with
      the problem when its folder is set wrong — and what the folder holds, in words. */
  private comfyPlace(m: CivitaiModel, v: CivitaiVersion | undefined): { dir: string; problem: string; what: string } {
    const file = v?.files?.find((f) => f.downloadUrl === v.downloadUrl) ?? v?.files?.find((f) => f.primary);
    const kind = comfyFolderOf(m.type, file?.name ?? "");
    const what = kind ? COMFY_FOLDER_WHAT[kind] : "files of this kind";
    const place = kind && this.comfyPlaces?.[kind];
    return { dir: place ? place.dir : "", problem: place ? place.problem : "", what };
  }

  /** Video mode's install: into ComfyUI, the other half of a Wan 2.2 pair with it. */
  private renderComfyInstall(m: CivitaiModel, v: CivitaiVersion) {
    if (!this.comfyPlace(m, v).dir) return nothing;
    const twin = v.twin ? m.versions.find((x) => x.id === v.twin) : undefined;
    const size = (v.sizeMB ?? 0) + (twin?.sizeMB ?? 0);
    const label = twin
      ? `Install the pair — ${v.stage} and ${twin.stage} noise`
      : v.stage
        ? `Install the ${v.stage}-noise half`
        : "Install to ComfyUI";
    return html`<button class="primary-btn" ?disabled=${this.installing || !v.downloadUrl} @click=${() => this.install(v)}>
      <span class="material-symbols-rounded">download</span>
      ${label}${size ? ` · ${fmtSize(size)}` : ""}
    </button>`;
  }

  /** Pictures at their own shapes, each with who posted it and what people made of it;
   *  one opens with the rest of `images` to step through. */
  private renderMasonry(images: CivitaiImage[]) {
    if (!images.length) return nothing;
    return html`<div class="masonry">
      ${images.map((img) => {
        const r = reactionsOf(img.stats);
        return html`<button class="gcard" style=${img.width && img.height ? `aspect-ratio:${img.width}/${img.height}` : ""}
          title=${img.prompt ? "Has its prompt" : ""} @click=${() => this.openPicture(img, images)}
          @mouseenter=${(e: Event) => void (e.currentTarget as HTMLElement).querySelector("video")?.play().catch(() => {})}
          @mouseleave=${(e: Event) => (e.currentTarget as HTMLElement).querySelector("video")?.pause()}>
          ${this.tileMedia(img.url, img.video, "")}
          ${img.prompt ? html`<span class="badge mark" title="Its prompt is kept"><span class="material-symbols-rounded">description</span></span>` : nothing}
          <span class="foot">
            <span class="who">${img.username ?? ""}</span>
            ${r.total ? html`<span class="stat"><span class="material-symbols-rounded">favorite</span>${compactNumber(r.total)}</span>` : nothing}
            ${r.comments ? html`<span class="stat"><span class="material-symbols-rounded">chat_bubble</span>${compactNumber(r.comments)}</span>` : nothing}
          </span>
        </button>`;
      })}
    </div>`;
  }

  private renderThreadSorts(entity: CivitaiCommentEntity, id: number) {
    const t = this.threadOf(entity, id);
    if (!t || t.needsKey || (t.error && !t.items.length)) return nothing;
    return html`<div class="chip-row">
      ${(["newest", "oldest", "reactions"] as ThreadSort[]).map(
        (s) => html`<button class="chip small" aria-pressed=${t.sort === s ? "true" : "false"} @click=${() => this.loadThread(entity, id, false, s)}>
          ${s === "newest" ? "Newest" : s === "oldest" ? "Oldest" : "Most reactions"}
        </button>`,
      )}
    </div>`;
  }

  /** A comment section: its threads in reading order, or why it cannot be read here. */
  private renderThread(entity: CivitaiCommentEntity, id: number) {
    const t = this.threadOf(entity, id);
    const page = t?.page || `https://civitai.com/${entity === "model" ? "models" : entity === "post" ? "posts" : "images"}/${id}`;
    if (!t || (t.loading && !t.items.length)) return html`<div class="note slim">Loading comments…</div>`;
    if (t.needsKey) {
      return html`<div class="keynote">
        <span class="material-symbols-rounded">key</span>
        <span>Civitai shares comments only with a signed-in account. Add your Civitai API key under Settings → Image generation,
          or <a href=${page} target="_blank" rel="noopener noreferrer">read them on civitai.com</a>.</span>
      </div>`;
    }
    if (t.error && !t.items.length) {
      return html`<div class="keynote">
        <span class="material-symbols-rounded">forum</span>
        <span>${t.error} <a href=${page} target="_blank" rel="noopener noreferrer">Open on civitai.com</a></span>
      </div>`;
    }
    if (!t.items.length) return html`<div class="note slim">No comments yet.</div>`;
    return html`<div class="thread">
      ${t.items.map((c) => html`<article class="cmt ${c.depth ? "reply" : ""}" style=${c.depth ? `margin-left:${Math.min(c.depth, 4) * 26}px` : ""}>
        ${c.avatar ? html`<img class="face" src=${api.civitaiImageURL(c.avatar)} alt="" loading="lazy" />` : html`<span class="face">${(c.user || "?").slice(0, 1)}</span>`}
        <div>
          <div class="cmt-head">
            ${c.user ? html`<b>${c.user}</b>` : nothing}
            <span class="when">${timeAgo(c.createdAt)}</span>
            ${c.pinned ? html`<span class="pin"><span class="material-symbols-rounded">push_pin</span>Pinned</span>` : nothing}
          </div>
          <div class="cmt-body">${unsafeHTML(c.html)}</div>
          <div class="cmt-foot">
            ${c.likes ? html`<span class="stat"><span class="material-symbols-rounded" style="font-size:15px;">favorite</span>${c.likes}</span>` : nothing}
            ${c.moreReplies
              ? html`<a href=${page} target="_blank" rel="noopener noreferrer">${c.moreReplies} more ${c.moreReplies === 1 ? "reply" : "replies"} on civitai.com</a>`
              : nothing}
          </div>
        </div>
      </article>`)}
      ${t.cursor
        ? html`<button class="more" ?disabled=${t.loading} @click=${() => this.loadThread(entity, id, true)}>${t.loading ? "Loading…" : "More comments"}</button>`
        : nothing}
    </div>`;
  }

  /** One picture, opened: on a dark stage, with the rest of its post, who made it and
   *  how, what people made of it, and what they said. */
  private renderViewer() {
    const { image: img, list } = this.viewing!;
    const { index, prev, next } = neighbours(list, img.id);
    const settings = promptSettingsFrom(img);
    const r = reactionsOf(img.stats);
    const post = img.postId && img.postId > 0 ? postPictures(img, this.postPics[img.postId]) : [img];
    const date = img.createdAt ? fmtDate(img.createdAt) : "";
    return html`
      <div class="pv" role="dialog" aria-modal="true" aria-label="Picture">
        <div class="pv-stage" @click=${(e: Event) => { if (e.target === e.currentTarget) this.viewing = null; }}>
          ${img.video
            ? html`<video poster=${api.civitaiImageURL(img.url)} src=${api.civitaiImageURL(img.video)} autoplay muted loop playsinline controls></video>`
            : html`<img src=${api.civitaiImageURL(img.url)} alt="" />`}
          <button class="pv-x" title="Close (Esc)" aria-label="Close" @click=${() => (this.viewing = null)}>
            <span class="material-symbols-rounded">close</span>
          </button>
          <button class="pv-nav prev" aria-label="Previous picture" ?disabled=${!prev} @click=${() => this.stepPicture(-1)}>
            <span class="material-symbols-rounded" style="font-size:28px;">chevron_left</span>
          </button>
          <button class="pv-nav next" aria-label="Next picture" ?disabled=${!next} @click=${() => this.stepPicture(1)}>
            <span class="material-symbols-rounded" style="font-size:28px;">chevron_right</span>
          </button>
          ${list.length > 1 ? html`<span class="badge pv-count">${index + 1} / ${list.length}${this.galleryCursor && list === this.gallery ? "+" : ""}</span>` : nothing}
        </div>
        <aside class="pv-side">
          <div class="pv-who">
            <span class="face">${(img.username || "?").slice(0, 1)}</span>
            <div class="n">
              ${img.username
                ? html`<button title="Everything they posted" @click=${() => this.openPerson(img.username!)}>${img.username}</button>`
                : html`<b>Someone</b>`}
              <span>${[date, img.baseModel].filter(Boolean).join(" · ")}</span>
            </div>
            <a class="tool icon" title="Open on civitai.com" target="_blank" rel="noopener noreferrer" href=${`https://civitai.com/images/${img.id}`}>
              <span class="material-symbols-rounded">open_in_new</span>
            </a>
          </div>
          ${r.list.length || r.comments
            ? html`<div class="reacts">
                ${r.list.map((x) => html`<span class="react" title=${x.label}><span class="material-symbols-rounded">${x.icon}</span>${compactNumber(x.n)}</span>`)}
                ${r.comments ? html`<span class="react" title="Comments"><span class="material-symbols-rounded">chat_bubble</span>${compactNumber(r.comments)}</span>` : nothing}
              </div>`
            : nothing}
          ${post.length > 1
            ? html`<div class="side-sec">
                <span class="kicker">In this post <span class="page-sub">${post.length} pictures</span></span>
                <div class="strip">
                  ${post.map((p) => html`<button class=${p.id === img.id ? "on" : ""} aria-label="Show this picture" @click=${() => this.showPicture(p, post)}>
                    <img src=${api.civitaiImageURL(civitaiSized(p.url, 160))} alt="" loading="lazy" />
                  </button>`)}
                </div>
              </div>`
            : nothing}
          <div class="side-sec gen">
            <span class="kicker">How it was made</span>
            ${settings
              ? html`<div class="p">${settings.prompt}</div>
                  ${settings.negativePrompt ? html`<span class="kicker" style="font-size:10.5px;">Negative</span><div class="p neg">${settings.negativePrompt}</div>` : nothing}
                  <dl class="facts">
                    ${img.model ? html`<dt>Model</dt><dd title=${img.model}>${img.model}</dd>` : nothing}
                    ${img.sampler ? html`<dt>Sampler</dt><dd title=${img.sampler}>${img.sampler}</dd>` : nothing}
                    ${settings.steps ? html`<dt>Steps</dt><dd>${settings.steps}</dd>` : nothing}
                    ${settings.cfgScale ? html`<dt>CFG</dt><dd>${settings.cfgScale}</dd>` : nothing}
                    ${settings.seed ? html`<dt>Seed</dt><dd>${settings.seed}</dd>` : nothing}
                    ${settings.width ? html`<dt>Size</dt><dd>${settings.width}×${settings.height}</dd>` : nothing}
                    ${img.clipSkip ? html`<dt>Clip skip</dt><dd>${img.clipSkip}</dd>` : nothing}
                    ${img.denoise ? html`<dt>Denoise</dt><dd>${img.denoise}</dd>` : nothing}
                  </dl>
                  ${img.resources?.length
                    ? html`<div class="res">${img.resources.map((x) => html`<span class="tag" title=${x.type ?? ""}>${x.name}${x.weight ? html`<b>${x.weight}</b>` : nothing}</span>`)}</div>`
                    : nothing}
                  <div class="acts">
                    <button class="primary-btn" @click=${() => this.usePrompt(img)}>
                      <span class="material-symbols-rounded">auto_awesome</span> Use in the studio
                    </button>
                    <button class="tool" style="height:42px;" @click=${() => this.copyPrompt(img)}>
                      <span class="material-symbols-rounded">content_copy</span> ${this.copied ? "Copied" : "Copy"}
                    </button>
                  </div>`
              : html`<div class="sub">${this.promptsNeedKey || !img.prompt
                  ? "Civitai keeps the prompt behind a picture to itself without an API key — or the person who posted it left it off."
                  : "No generation data was posted with this picture."}</div>`}
          </div>
          <div class="side-sec">
            <div class="sec-head" style="margin:0;">
              <span class="kicker">Comments</span>
              <span class="page-spacer"></span>
              ${img.postId && img.postId > 0
                ? html`<div class="seg" role="tablist">
                    <button role="tab" aria-selected=${this.viewTab === "picture" ? "true" : "false"}
                      @click=${() => { this.viewTab = "picture"; void this.loadThread("image", img.id); }}>Picture</button>
                    <button role="tab" aria-selected=${this.viewTab === "post" ? "true" : "false"}
                      @click=${() => { this.viewTab = "post"; void this.loadThread("post", img.postId!); }}>Post</button>
                  </div>`
                : nothing}
            </div>
            ${this.viewTab === "post" && img.postId ? this.renderThread("post", img.postId) : this.renderThread("image", img.id)}
          </div>
        </aside>
      </div>
    `;
  }

  /** Everything one person posted, newest first. */
  private renderPerson() {
    const p = this.person!;
    return html`
      <button class="crumb" @click=${() => this.closeDetail()}>
        <span class="material-symbols-rounded">arrow_back</span> Back
      </button>
      <div class="person-head">
        <span class="face">${p.username.slice(0, 1)}</span>
        <div style="flex:1; min-width:0;">
          <h1>${p.username}</h1>
          <div class="sub">Pictures they posted, newest first</div>
        </div>
        <button class="tool" title="Models they published" @click=${() => { const who = p.username; this.closeDetail(); this.setAnd("creator", who); }}>
          <span class="material-symbols-rounded">deployed_code</span> Their models
        </button>
        <a class="tool" target="_blank" rel="noopener noreferrer" href=${`https://civitai.com/user/${encodeURIComponent(p.username)}`}>
          <span class="material-symbols-rounded">open_in_new</span> Profile
        </a>
      </div>
      ${this.renderMasonry(p.items)}
      ${p.loading
        ? html`<div class="note">Loading pictures…</div>`
        : p.items.length
          ? p.cursor ? html`<div class="sentinel" data-feed="person"></div><button class="more" @click=${() => this.loadPerson(false)}>More pictures</button>` : nothing
          : html`<div class="note">Nothing they posted shows here${this.nsfw ? "" : " with adult pictures off"}.</div>`}
    `;
  }

  private renderAccount() {
    if (this.meLoading) return html`<div class="note">Asking Civitai whose key this is…</div>`;
    if (!this.me) {
      return html`<div class="note">
        ${this.meError || "No account to show."}
        <div style="margin-top:8px; font-size:12px;">
          Add your Civitai API key under Settings → Image generation and this page shows your models, posts, pictures and collections.
        </div>
      </div>`;
    }
    const me = this.me;
    // The profile cover when the catalogue shares it; the newest posted picture
    // when it does not, which is most of the time.
    const cover = me.cover || this.myImages[0]?.url || "";
    return html`
      <div class="banner">
        <div class="art">
          ${cover ? html`<img class="cover" src=${api.civitaiImageURL(cover)} alt="" />` : nothing}
          <div class="fade"></div>
          <a class="ghost profile-link" style="text-decoration:none; background:rgba(0,0,0,.4);" target="_blank" rel="noopener noreferrer"
            href=${`https://civitai.com/user/${encodeURIComponent(me.username)}`}>
            <span class="material-symbols-rounded" style="font-size:16px;">open_in_new</span> Profile on civitai.com
          </a>
        </div>
        <div class="who">
          ${me.image
            ? html`<img src=${api.civitaiImageURL(me.image)} alt="" />`
            : html`<div class="noface"><span class="material-symbols-rounded" style="font-size:44px;">account_circle</span></div>`}
          <div class="n">${me.username}</div>
        </div>
      </div>
      <div class="subtabs" role="tablist">
        ${([["models", "Models"], ["posts", "Posts"], ["images", "Images"], ["collections", "Collections"]] as [AccountTab, string][]).map(
          ([id, label]) => html`<button role="tab" aria-selected=${this.accountTab === id ? "true" : "false"}
            class=${this.accountTab === id ? "on" : ""} @click=${() => this.selectAccountTab(id)}>${label}</button>`,
        )}
      </div>
      ${this.meError ? html`<div class="err">${this.meError}</div>` : nothing}
      ${this.accountTab === "models" ? this.renderMyModels()
        : this.accountTab === "posts" ? this.renderPosts()
        : this.accountTab === "images" ? this.renderMyImages()
        : this.renderCollections()}
    `;
  }

  private renderMyModels() {
    return html`
      <div class="grid">${this.myModels.map((m) => this.renderCard(m))}</div>
      ${this.myModelsLoading
        ? html`<div class="note">Loading models…</div>`
        : this.myModels.length
          ? this.myModelsCursor
            ? html`<button class="more" @click=${() => this.loadMyModels(false)}>More models</button>`
            : nothing
          : html`<div class="note">No models published.
              <div style="margin-top:6px; font-size:12px;">Uploading goes through civitai.com itself — the site has no public API for it.</div>
            </div>`}
    `;
  }

  private renderPosts() {
    if (this.openPost) {
      const p = this.openPost;
      return html`
        <div class="controls">
          <button class="ghost" @click=${() => (this.openPost = null)}>
            <span class="material-symbols-rounded" style="font-size:16px;">arrow_back</span> All posts
          </button>
          <span style="font-size:12px; color:var(--oppai-text-muted);">
            ${p.images.length} picture${p.images.length === 1 ? "" : "s"}${postDate(p) ? ` · ${postDate(p)}` : ""}
          </span>
          ${p.id > 0
            ? html`<a class="ghost" style="margin-left:auto; text-decoration:none;" target="_blank" rel="noopener noreferrer" href=${`https://civitai.com/posts/${p.id}`}>
                <span class="material-symbols-rounded" style="font-size:16px;">open_in_new</span> civitai.com
              </a>`
            : nothing}
        </div>
        ${this.renderImageGrid(p.images)}
      `;
    }
    return html`
      <div class="post-grid">
        ${this.posts.map(
          (p) => html`<button class="post" @click=${() => (this.openPost = p)}>
            <div class="art">
              ${p.images[0] ? html`<img src=${api.civitaiImageURL(civitaiSized(p.images[0].url, 450))} alt="" loading="lazy" />` : nothing}
              ${p.images.length > 1 ? html`<div class="badges"><span class="badge right"><span class="material-symbols-rounded">photo_library</span> ${p.images.length}</span></div>` : nothing}
            </div>
            <div class="pm"><span>${postDate(p)}</span>${p.images.some((i) => i.prompt) ? html`<span>prompt</span>` : nothing}</div>
          </button>`,
        )}
      </div>
      ${this.postsLoading
        ? html`<div class="note">Loading posts…</div>`
        : this.posts.length
          ? this.postsCursor
            ? html`<button class="more" @click=${() => this.loadPosts(false)}>More posts</button>`
            : nothing
          : html`<div class="note">No posts.</div>`}
    `;
  }

  private renderMyImages() {
    return html`
      ${this.renderImageGrid(this.myImages)}
      ${this.galleryLoading
        ? html`<div class="note" style="padding:12px 0;">Loading pictures…</div>`
        : this.myImages.length
          ? this.myImagesCursor
            ? html`<button class="more" @click=${() => this.loadMyImages(false)}>More pictures</button>`
            : nothing
          : html`<div class="note" style="padding:12px 0;">No posted pictures.</div>`}
    `;
  }

  /** Pictures at their own shapes; one opens in the viewer with the rest to step through. */
  private renderImageGrid(images: CivitaiImage[]) {
    return this.renderMasonry(images);
  }

  private renderCollections() {
    if (this.openCollection) {
      const c = this.openCollection;
      return html`
        <div class="controls">
          <button class="ghost" @click=${() => (this.openCollection = null)}>
            <span class="material-symbols-rounded" style="font-size:16px;">arrow_back</span> Collections
          </button>
          <span style="font-size:13px; font-weight:600;">${c.name}</span>
          <span style="font-size:12px; color:var(--oppai-text-muted);">${c.username ? `by ${c.username} · ` : ""}${c.count} item${c.count === 1 ? "" : "s"}</span>
          <a class="ghost" style="margin-left:auto; text-decoration:none;" target="_blank" rel="noopener noreferrer" href=${`https://civitai.com/collections/${c.id}`}>
            <span class="material-symbols-rounded" style="font-size:16px;">open_in_new</span> civitai.com
          </a>
        </div>
        ${c.description ? html`<div class="sub" style="margin-bottom:8px;">${c.description}</div>` : nothing}
        ${this.renderImageGrid(this.collectionImages)}
        ${this.galleryLoading
          ? html`<div class="note" style="padding:12px 0;">Loading pictures…</div>`
          : this.collectionImages.length
            ? this.collectionImagesCursor
              ? html`<button class="more" @click=${() => this.openCollectionPictures(c, false)}>More pictures</button>`
              : nothing
            : html`<div class="note" style="padding:12px 0;">Nothing the feed will show for this collection.</div>`}
      `;
    }
    return html`
      <div class="controls">
        <input type="search" placeholder="Search public collections…" .value=${this.collectionQuery}
          @input=${(e: Event) => (this.collectionQuery = (e.target as HTMLInputElement).value)}
          @keydown=${(e: KeyboardEvent) => { if (e.key === "Enter") void this.loadCollections(true); }} />
        ${([["newest", "Newest"], ["followers", "Most followed"]] as const).map(
          ([id, label]) => html`<button class="chip ${this.collectionSort === id ? "on" : ""}"
            @click=${() => { this.collectionSort = id; void this.loadCollections(true); }}>${label}</button>`,
        )}
        <button class="ghost" @click=${() => this.loadCollections(true)}>
          <span class="material-symbols-rounded" style="font-size:16px;">search</span> Search
        </button>
      </div>
      <div class="sub" style="margin-bottom:10px;">
        Civitai's public API lists collections by name only, never by owner — your own are on
        <a style="color:var(--oppai-primary-bright);" target="_blank" rel="noopener noreferrer"
          href=${`https://civitai.com/user/${encodeURIComponent(this.me?.username ?? "")}/collections`}>civitai.com</a>.
        Image and post collections open here; model collections the API will not list.
      </div>
      <div class="rows">
        ${this.collections.map(
          (c) => html`<button class="coll" ?disabled=${c.type !== "Image" && c.type !== "Post"} @click=${() => this.openCollectionPictures(c, true)}>
            ${c.cover
              ? html`<img src=${api.civitaiImageURL(c.cover)} alt="" loading="lazy" />`
              : html`<div class="noimg"><span class="material-symbols-rounded" style="font-size:26px;">collections_bookmark</span></div>`}
            <div style="min-width:0;">
              <div class="t">${c.name}${c.nsfw ? html` <span style="font-weight:400; color:var(--oppai-text-muted);">18+</span>` : nothing}</div>
              <div class="d">${c.type} · ${c.count} item${c.count === 1 ? "" : "s"}${c.username ? ` · by ${c.username}` : ""}</div>
            </div>
            <span class="material-symbols-rounded" style="font-size:18px; color:var(--oppai-text-muted);">${c.type === "Image" || c.type === "Post" ? "chevron_right" : "block"}</span>
          </button>`,
        )}
      </div>
      ${this.collectionsLoading
        ? html`<div class="note">Loading collections…</div>`
        : this.collections.length
          ? this.collectionsCursor
            ? html`<button class="more" @click=${() => this.loadCollections(false)}>More collections</button>`
            : nothing
          : html`<div class="note">No collections matched.</div>`}
    `;
  }
  private renderInstalled() {
    const rows = this.installed.filter((m) => {
      switch (this.installedFilter) {
        case "linked": return !!m.civitai;
        case "unlinked": return !m.civitai;
        case "updates": return !!m.civitai?.updateAvailable;
        default: return true;
      }
    });
    const updates = this.installed.filter((m) => m.civitai?.updateAvailable).length;
    return html`
      <div class="controls">
        ${([["all", "All"], ["linked", "On Civitai"], ["unlinked", "Not matched"], ["updates", `Updates${updates ? ` (${updates})` : ""}`]] as const).map(
          ([id, label]) => html`<button class="chip ${this.installedFilter === id ? "on" : ""}" @click=${() => (this.installedFilter = id)}>${label}</button>`,
        )}
        <button class="ghost" style="margin-left:auto;" ?disabled=${this.installedLoading} @click=${() => this.loadInstalled(true)}>
          <span class="material-symbols-rounded" style="font-size:16px;">refresh</span> Check Civitai again
        </button>
      </div>
      <p class="sync-note">
        ${this.genName}'s models matched to Civitai by file hash. “Fetch from Civitai” writes the catalogue's cover,
        description and trigger words onto the model — the same dressing an install from here gets${this.canManage ? "" : ". Until OppaiLib can write into A1111's models folder they are only linked: the picker shows Civitai's cover, but nothing is written to A1111"}.
        ${this.backend === "invokeai" ? nothing : html`A1111 knows a file by a short hash until it has been read once, so a model may take a minute to match after it first appears.`}
      </p>
      ${this.syncNote ? html`<div class="sync-note" style="color:var(--oppai-text);">${this.syncNote}</div>` : nothing}
      ${this.installedError ? html`<div class="err">${this.installedError}</div>` : nothing}
      ${this.installedLoading && !this.installed.length
        ? html`<div class="note">Reading the studio's models and asking Civitai about the new ones…</div>`
        : nothing}
      <div class="rows">
        ${rows.map((m) => this.renderInstalledRow(m))}
      </div>
      ${!this.installedLoading && this.installed.length && !rows.length
        ? html`<div class="note">Nothing here.</div>`
        : nothing}
    `;
  }

  private renderInstalledRow(m: CivitaiInstalled) {
    const c = m.civitai;
    const thumb = m.hasCover ? (m.type === "lora" ? api.loraThumbURL(m.name) : api.modelThumbURL(m.key)) : "";
    const open = this.manageKey === m.key;
    return html`
      <div class="row">
        ${thumb
          ? html`<img src=${thumb} alt="" loading="lazy" />`
          : html`<div class="noimg"><span class="material-symbols-rounded" style="font-size:26px;">deployed_code</span></div>`}
        <div style="min-width:0;">
          <div class="t">${m.name}</div>
          <div class="d">
            <span>${m.type}</span>
            ${m.base ? html`<span>${m.base}</span>` : nothing}
            ${c
              ? html`<span>· ${c.modelName}${c.versionName ? ` (${c.versionName})` : ""}${c.creator ? ` by ${c.creator}` : ""}</span>
                  ${c.updateAvailable
                    ? html`<span class="upd"><span class="material-symbols-rounded" style="font-size:14px;">new_releases</span> newer version</span>`
                    : nothing}`
              : html`<span>· not found on Civitai by hash</span>`}
          </div>
          ${c?.previews.length && !open
            ? html`<div class="previews">
                ${c.previews.slice(0, 6).map((u) => html`<img src=${api.civitaiImageURL(u)} alt="" loading="lazy" @click=${() => (this.zoomed = u)} />`)}
              </div>`
            : nothing}
          ${this.pinning === m.key
            ? html`<div class="pin-row">
                <input type="text" placeholder="Civitai version id" .value=${this.pinVersion}
                  @input=${(e: Event) => (this.pinVersion = (e.target as HTMLInputElement).value)} />
                <button class="ghost" ?disabled=${!/^\d+$/.test(this.pinVersion.trim())} @click=${() => this.sync(m, Number(this.pinVersion.trim()))}>Link</button>
                <button class="ghost" @click=${() => (this.pinning = "")}>Cancel</button>
              </div>`
            : nothing}
        </div>
        <div class="rb">
          ${c
            ? html`<button class="ghost" title="Open the model page" @click=${() => this.openDetail(c.modelId)}>
                <span class="material-symbols-rounded" style="font-size:16px;">travel_explore</span> Page
              </button>`
            : nothing}
          ${c?.updateAvailable && this.canManage
            ? html`<button class="ghost" title="Download the newest version and delete this one once it is in"
                ?disabled=${this.manageBusy} @click=${() => this.updateModel(m)}>
                <span class="material-symbols-rounded" style="font-size:16px;">published_with_changes</span> Update
              </button>`
            : nothing}
          <button class="ghost" ?disabled=${this.syncing === m.key} title="Write the cover, description and trigger words from Civitai onto this model"
            @click=${() => this.sync(m)}>
            <span class="material-symbols-rounded" style="font-size:16px;">${this.syncing === m.key ? "downloading" : "sync"}</span>
            ${c ? "Fetch again" : "Fetch from Civitai"}
          </button>
          ${c
            ? html`<button class="ghost ${open ? "on" : ""}" title="Choose the version and the cover picture" aria-expanded=${open ? "true" : "false"}
                @click=${() => this.manage(m)}>
                <span class="material-symbols-rounded" style="font-size:16px;">tune</span> ${open ? "Close" : "Version & cover"}
              </button>`
            : html`<button class="ghost" title="Link by a version id from the site" @click=${() => { this.pinning = m.key; this.pinVersion = ""; }}>
                <span class="material-symbols-rounded" style="font-size:16px;">link</span>
              </button>`}
          ${this.canManage ? html`<button class="ghost danger" title=${`Delete from ${this.genName}, file included`} ?disabled=${this.manageBusy} @click=${() => this.deleteInstalled(m)}>
            <span class="material-symbols-rounded" style="font-size:16px;">delete</span>
          </button>` : nothing}
        </div>
        ${open && c ? this.renderManage(m) : nothing}
      </div>
    `;
  }

  /** The panel under an installed model: which version to follow, an update to
   *  another version, and which of that version's showcase pictures is the cover. */
  private renderManage(m: CivitaiInstalled) {
    const c = m.civitai!;
    const page = this.managePage;
    if (!page) return html`<div class="manage"><div class="note" style="padding:8px 0;">Loading the model page…</div></div>`;
    const ver = page.versions.find((v) => v.id === this.manageVersion) ?? page.versions[0];
    const current = ver?.id === c.versionId;
    const chosen = c.coverUrl || c.previews[0] || "";
    return html`
      <div class="manage">
        <div class="vlabel" style="margin-top:0;">Version</div>
        <div class="versions-wrap">
          ${page.versions.map(
            (v) => html`<button class="chip small ${v.id === ver?.id ? "on" : ""}" @click=${() => (this.manageVersion = v.id)}>
              ${v.id === c.versionId ? html`<span class="material-symbols-rounded" style="font-size:14px;">check</span>` : nothing}
              ${v.name}<span style="opacity:.7;"> · ${v.base}</span>
            </button>`,
          )}
        </div>
        ${ver && !current
          ? html`<div class="actions" style="margin-top:8px;">
              ${this.canManage ? html`<button class="ghost" ?disabled=${this.manageBusy} title="Download this version and delete the current file once it is in"
                @click=${() => this.updateModel(m, ver.id)}>
                <span class="material-symbols-rounded" style="font-size:16px;">published_with_changes</span> Install ${ver.name}, replacing the current file
              </button>` : nothing}
              <button class="ghost" ?disabled=${this.syncing === m.key} title="Keep the current file, but take this version's description, trigger words and pictures"
                @click=${() => this.sync(m, ver.id)}>
                <span class="material-symbols-rounded" style="font-size:16px;">link</span> Link to ${ver.name} without downloading
              </button>
            </div>`
          : nothing}
        ${ver?.images.length
          ? html`<div class="vlabel">Cover${current ? "" : ` (from ${ver.name})`}</div>
              <div class="covers">
                ${ver.images.map(
                  (u) => html`<button class=${u === chosen ? "on" : ""} title="Use as the cover" ?disabled=${this.manageBusy} @click=${() => this.chooseCover(m, u)}>
                    <img src=${api.civitaiImageURL(u)} alt="" loading="lazy" />
                    ${u === chosen ? html`<span class="tick"><span class="material-symbols-rounded" style="font-size:13px;">check</span></span>` : nothing}
                  </button>`,
                )}
              </div>`
          : html`<div class="sub" style="margin-top:8px;">This version has no showcase pictures.</div>`}
      </div>
    `;
  }
}

/** Which of ComfyUI's folders a catalogue type installs into, as the server files it
    (imagegen/comfy_install.go). */
const COMFY_FOLDER_WHAT: Record<ComfyFolderKind, string> = {
  diffusion_models: "Wan models",
  checkpoints: "all-in-one checkpoints",
  loras: "LoRAs",
  vae: "VAEs",
};

/** The showcase clip a version's still stands in for, "" for a picture. */
function clipOf(v: CivitaiVersion | undefined, still: string): string {
  if (!v?.videos) return "";
  return v.videos[v.images.indexOf(still)] ?? "";
}

function typeLabel(t: string): string {
  switch (t) {
    case "Checkpoint": return "Checkpoint";
    case "LORA": return "LoRA";
    case "LoCon": return "LoCon";
    case "DoRA": return "DoRA";
    case "TextualInversion": return "Embedding";
    case "Controlnet": return "ControlNet";
    default: return t;
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

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

declare global {
  interface HTMLElementTagNameMap {
    "oppai-civitai": OppaiCivitai;
  }
}
