import { LitElement, html, css, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { iconStyles, motionStyles } from "../theme.js";
import {
  api,
  type CivitaiCategory,
  type CivitaiImage,
  type CivitaiInstalled,
  type CivitaiModel,
  type CivitaiVersion,
  type InstallJob,
} from "../api.js";
import { promptSettingsFrom, type PromptSettings } from "../civitai-prompt.js";

/**
 * A full-screen browser over the Civitai catalogue (reached via the civitai.red
 * mirror, proxied by the server).
 *
 * Three pages. Browse searches the catalogue with the site's own filters and opens
 * a model's page: its description, versions, files, trigger words and the gallery
 * of pictures people posted with it, each with the prompt that made it — "use this
 * prompt" hands that to the studio. Account is the person the API key belongs to:
 * their models and their posted images. Installed is the studio's own models seen
 * from the catalogue's side — matched by file hash, with the cover, description and
 * trigger words a click away, and a note when a newer version has been published.
 *
 * Installing hands a version's download URL to InvokeAI, which fetches the file on
 * its own box; the server then writes the catalogue's cover, description and
 * trigger words onto the record once the download completes, so a model arrives
 * looking the way it did on the site.
 *
 * The host mounts it conditionally; closing dispatches "close", and picking a
 * prompt dispatches "use-prompt" with PromptSettings.
 */

type Tab = "browse" | "account" | "installed";

const TYPES: { id: string; label: string }[] = [
  { id: "", label: "All" },
  { id: "checkpoint", label: "Checkpoints" },
  { id: "lora", label: "LoRAs" },
  { id: "embedding", label: "Embeddings" },
  { id: "vae", label: "VAEs" },
  { id: "controlnet", label: "ControlNet" },
  { id: "upscaler", label: "Upscalers" },
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

// The base models worth a filter, as the catalogue names them. The list is what
// people actually run rather than every value the API has ever seen.
const BASES: string[] = [
  "SD 1.5", "SD 2.1", "SDXL 1.0", "Pony", "Illustrious", "NoobAI",
  "Flux.1 D", "Flux.1 S", "SD 3.5", "Kolors", "Hunyuan 1", "Wan Video",
];

@customElement("oppai-civitai")
export class OppaiCivitai extends LitElement {
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
  @state() private galleryOpen = false;
  @state() private gallery: CivitaiImage[] = [];
  @state() private galleryCursor = "";
  @state() private galleryLoading = false;
  @state() private gallerySort = "";
  @state() private picked: CivitaiImage | null = null;
  @state() private copied = false;
  /** Civitai shares the prompt behind a picture only with an API key. When a page
   *  of pictures came back with none and no key is set, the gallery says why. */
  @state() private promptsNeedKey = false;

  // ── installs ──
  @state() private jobs: InstallJob[] = [];
  @state() private installing = false;

  // ── the account ──
  @state() private me: { username: string; image?: string } | null = null;
  @state() private meError = "";
  @state() private meLoading = false;
  @state() private myImages: CivitaiImage[] = [];
  @state() private myImagesCursor = "";

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
      .tabs { display: flex; gap: 4px; margin-left: 8px; }
      .tabs button {
        border: none; background: none; color: var(--oppai-text-dim); font: inherit; font-size: 13px;
        padding: 8px 12px; border-radius: 10px; cursor: pointer;
      }
      .tabs button.on { background: var(--oppai-surface-2); color: var(--oppai-text); font-weight: 600; }
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
        margin-bottom: 10px;
      }
      input[type="search"], input[type="text"] {
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
      input:focus { border-color: var(--oppai-primary); }
      .chip {
        border: 1px solid var(--oppai-border-strong);
        background: transparent;
        color: var(--oppai-text-dim);
        border-radius: 999px;
        font: inherit;
        font-size: 13px;
        padding: 6px 13px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 5px;
      }
      .chip.on {
        background: var(--oppai-accent);
        color: var(--oppai-on-accent);
        border-color: var(--oppai-accent);
      }
      .chip.small { font-size: 12px; padding: 4px 10px; }
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
      .job { display: flex; gap: 8px; align-items: center; color: var(--oppai-text-dim); }
      .job .st { font-weight: 600; }
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
        position: relative;
      }
      .card:hover { transform: translateY(-2px); }
      .card img,
      .card .noimg {
        width: 100%;
        aspect-ratio: 3 / 4;
        object-fit: cover;
        display: block;
        background: var(--oppai-surface);
      }
      .card .noimg { display: grid; place-items: center; color: var(--oppai-text-muted); }
      .card .meta { padding: 8px 10px 10px; }
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
        flex-wrap: wrap;
      }
      .badge {
        position: absolute; top: 8px; left: 8px;
        background: rgba(0, 0, 0, .62); color: #fff; font-size: 11px; font-weight: 600;
        border-radius: 999px; padding: 3px 8px; display: inline-flex; align-items: center; gap: 4px;
        backdrop-filter: blur(4px);
      }
      .badge.right { left: auto; right: 8px; }
      .badge.ok { background: var(--oppai-primary); color: var(--oppai-on-primary); }
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
      .note { color: var(--oppai-text-muted); font-size: 13px; padding: 30px 0; text-align: center; }
      .err { color: var(--oppai-error, #f2b8b5); font-size: 13px; margin-bottom: 12px; }
      .ghost {
        border: 1px solid var(--oppai-border-strong); background: none; color: var(--oppai-text);
        border-radius: 10px; font: inherit; font-size: 13px; padding: 7px 12px; cursor: pointer;
        display: inline-flex; align-items: center; gap: 6px;
      }
      .ghost:disabled { opacity: .55; cursor: default; }
      .primary {
        border: none; border-radius: 12px; background: var(--oppai-primary); color: var(--oppai-on-primary);
        font: inherit; font-size: 14px; font-weight: 600; padding: 12px 18px; cursor: pointer;
        display: inline-flex; align-items: center; gap: 8px;
      }
      .primary:disabled { opacity: 0.6; cursor: default; }

      /* The model page. */
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
        width: min(1000px, 100%);
        max-height: 92vh;
        overflow-y: auto;
        padding: 18px;
        display: grid;
        grid-template-columns: minmax(0, 340px) minmax(0, 1fr);
        gap: 18px;
      }
      @media (max-width: 760px) {
        .detail { grid-template-columns: minmax(0, 1fr); }
      }
      .detail .big {
        width: 100%;
        border-radius: 12px;
        background: var(--oppai-surface);
        aspect-ratio: 3 / 4;
        object-fit: cover;
        cursor: zoom-in;
      }
      .thumbs { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
      .thumbs img {
        width: 52px; height: 68px; object-fit: cover; border-radius: 8px; cursor: pointer; opacity: 0.7;
      }
      .thumbs img.on { opacity: 1; outline: 2px solid var(--oppai-accent); }
      .detail h3 { margin: 0 0 4px; font-size: 18px; }
      .detail .sub { font-size: 12px; color: var(--oppai-text-muted); margin-bottom: 10px; display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
      .creator { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; color: var(--oppai-text-dim); border: none; background: none; font: inherit; font-size: 12px; padding: 0; }
      .creator img { width: 20px; height: 20px; border-radius: 50%; object-fit: cover; }
      .vlabel { font-size: 12px; font-weight: 600; color: var(--oppai-text-dim); margin: 12px 0 6px; }
      .versions, .tags { display: flex; flex-wrap: wrap; gap: 6px; }
      .words {
        font-size: 12px; color: var(--oppai-text-dim); background: var(--oppai-surface);
        border-radius: 10px; padding: 8px 10px; word-break: break-word;
        display: flex; align-items: flex-start; gap: 8px; justify-content: space-between;
      }
      .desc {
        font-size: 13px; line-height: 1.5; color: var(--oppai-text-dim);
        max-height: 260px; overflow-y: auto; padding-right: 6px; word-break: break-word;
      }
      .desc.open { max-height: none; }
      .desc h1, .desc h2, .desc h3, .desc h4 { font-size: 14px; margin: 10px 0 4px; color: var(--oppai-text); }
      .desc p { margin: 0 0 8px; }
      .desc a { color: var(--oppai-primary-bright); }
      .desc pre, .desc code { font-size: 12px; background: var(--oppai-surface); border-radius: 6px; padding: 2px 5px; white-space: pre-wrap; }
      .desc ul, .desc ol { padding-left: 20px; margin: 4px 0 8px; }
      .desc table { border-collapse: collapse; font-size: 12px; }
      .desc td, .desc th { border: 1px solid var(--oppai-border); padding: 3px 6px; }
      .files { font-size: 12px; color: var(--oppai-text-dim); display: flex; flex-direction: column; gap: 4px; }
      .files .f { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
      .files code { font-size: 11px; color: var(--oppai-text-muted); }
      .actions { margin-top: 14px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }

      /* The gallery of posted pictures. */
      .gal-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; margin-top: 8px; }
      .gal-grid button { border: none; padding: 0; background: var(--oppai-surface); border-radius: 10px; overflow: hidden; cursor: pointer; position: relative; }
      .gal-grid img { width: 100%; aspect-ratio: 3 / 4; object-fit: cover; display: block; }
      .gal-grid .has { position: absolute; right: 6px; bottom: 6px; background: rgba(0,0,0,.6); color: #fff; border-radius: 6px; font-size: 10px; padding: 2px 6px; }

      /* Zoomed picture, with its prompt when there is one. */
      .zoom {
        position: fixed; inset: 0; z-index: 90; background: rgba(0, 0, 0, 0.9);
        display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 360px); cursor: zoom-out;
      }
      .zoom.plain { grid-template-columns: minmax(0, 1fr); place-items: center; }
      .zoom img { max-width: 100%; max-height: 100vh; object-fit: contain; margin: auto; display: block; }
      .zoom .pane {
        background: var(--oppai-surface-2); color: var(--oppai-text); padding: 16px; overflow-y: auto; cursor: default;
        font-size: 13px; display: flex; flex-direction: column; gap: 10px;
      }
      @media (max-width: 760px) {
        .zoom { grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) auto; }
        .zoom .pane { max-height: 45vh; }
      }
      .pane h4 { margin: 0; font-size: 12px; color: var(--oppai-text-muted); text-transform: uppercase; letter-spacing: .04em; }
      .pane .p { white-space: pre-wrap; word-break: break-word; background: var(--oppai-surface); border-radius: 8px; padding: 8px 10px; }
      .pane .kv { display: grid; grid-template-columns: auto 1fr; gap: 3px 10px; font-size: 12px; color: var(--oppai-text-dim); }

      /* Account. */
      .who { display: flex; align-items: center; gap: 12px; margin: 6px 0 16px; }
      .who img { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; background: var(--oppai-surface); }
      .who .n { font-size: 16px; font-weight: 600; }
      .who .s { font-size: 12px; color: var(--oppai-text-muted); }
      h3.sec { font-size: 14px; margin: 18px 0 8px; color: var(--oppai-text-dim); }

      /* Installed. */
      .rows { display: flex; flex-direction: column; gap: 8px; }
      .row {
        display: grid; grid-template-columns: 64px minmax(0, 1fr) auto; gap: 12px; align-items: center;
        background: var(--oppai-surface-2); border-radius: 12px; padding: 8px 10px;
      }
      @media (max-width: 600px) { .row { grid-template-columns: 64px minmax(0, 1fr); } .row .rb { grid-column: 1 / -1; } }
      .row img, .row .noimg { width: 64px; height: 84px; border-radius: 8px; object-fit: cover; background: var(--oppai-surface); display: grid; place-items: center; color: var(--oppai-text-muted); }
      .row .t { font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .row .d { font-size: 12px; color: var(--oppai-text-muted); margin-top: 2px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
      .row .rb { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
      .upd { color: var(--oppai-primary-bright); font-weight: 600; display: inline-flex; align-items: center; gap: 3px; }
      .previews { display: flex; gap: 4px; margin-top: 6px; }
      .previews img { width: 34px; height: 44px; border-radius: 6px; object-fit: cover; cursor: zoom-in; }
      .pin { display: flex; gap: 6px; align-items: center; margin-top: 6px; }
      .pin input { min-width: 0; width: 140px; padding: 6px 8px; font-size: 12px; }
      .sync-note { font-size: 12px; color: var(--oppai-text-dim); margin: 0 0 10px; }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    void this.search(true);
    void this.loadCategories();
    void this.pollJobs();
    this.jobTimer = window.setInterval(() => void this.pollJobs(), 5000);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.jobTimer) clearInterval(this.jobTimer);
  }

  private async loadCategories() {
    try {
      this.categories = (await api.civitaiCategories()).categories;
    } catch {
      // Searching still works when an older mirror does not expose /tags.
      this.categories = [];
    }
  }

  private async pollJobs() {
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
    if (this.loading) return;
    this.loading = true;
    this.error = "";
    try {
      const res = await api.civitaiSearch({
        q: this.q || undefined,
        type: this.type || undefined,
        category: this.category || undefined,
        sort: this.sort || undefined,
        period: this.period || undefined,
        base: this.base || undefined,
        creator: this.creator || undefined,
        nsfw: this.nsfw,
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
    if (typeof m !== "number") {
      // Show what the card already knows while the page loads.
      this.detail = m;
      const v = m.versions[0];
      this.versionId = v?.id ?? 0;
      this.shownImage = v?.images[0] ?? "";
    } else {
      this.detail = null;
    }
    this.galleryOpen = false;
    this.gallery = [];
    this.galleryCursor = "";
    this.detailLoading = true;
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
  }

  private closeDetail() {
    this.detail = null;
    this.galleryOpen = false;
    this.picked = null;
  }

  private currentVersion(): CivitaiVersion | undefined {
    return this.detail?.versions.find((v) => v.id === this.versionId);
  }

  private pickVersion(ver: CivitaiVersion) {
    this.versionId = ver.id;
    this.shownImage = ver.images[0] ?? "";
    if (this.galleryOpen) {
      this.gallery = [];
      this.galleryCursor = "";
      void this.loadGallery(true);
    }
  }

  private async install(v: CivitaiVersion) {
    if (this.installing || !v.downloadUrl || !this.detail) return;
    this.installing = true;
    this.error = "";
    try {
      await api.civitaiInstall(v.downloadUrl, { modelId: this.detail.id, versionId: v.id });
      await this.pollJobs();
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.installing = false;
    }
  }

  private async loadGallery(reset: boolean, username?: string) {
    if (this.galleryLoading) return;
    this.galleryLoading = true;
    try {
      const res = await api.civitaiImages({
        versionId: username ? undefined : this.versionId || undefined,
        username,
        sort: this.gallerySort || undefined,
        nsfw: this.nsfw,
        cursor: reset ? undefined : this.galleryCursor || undefined,
      });
      if (username) {
        this.myImages = reset ? res.items : [...this.myImages, ...res.items];
        this.myImagesCursor = res.nextCursor ?? "";
      } else {
        this.gallery = reset ? res.items : [...this.gallery, ...res.items];
        this.galleryCursor = res.nextCursor ?? "";
        this.promptsNeedKey = res.items.length > 0 && res.withPrompts === 0 && !res.keySet;
      }
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.galleryLoading = false;
    }
  }

  private toggleGallery() {
    this.galleryOpen = !this.galleryOpen;
    if (this.galleryOpen && this.gallery.length === 0) void this.loadGallery(true);
  }

  private usePrompt(img: CivitaiImage) {
    const settings = promptSettingsFrom(img);
    if (!settings) return;
    this.dispatchEvent(new CustomEvent<PromptSettings>("use-prompt", { detail: settings, bubbles: true, composed: true }));
    this.picked = null;
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

  // ── the account ──

  private async loadMe() {
    if (this.me || this.meLoading) return;
    this.meLoading = true;
    this.meError = "";
    try {
      this.me = await api.civitaiMe();
      this.myImages = [];
      this.myImagesCursor = "";
      void this.loadGallery(true, this.me.username);
    } catch (e) {
      this.meError = (e as Error).message;
    } finally {
      this.meLoading = false;
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
    return html`
      <div class="wrap">
        <div class="topbar">
          <h2><span class="material-symbols-rounded">travel_explore</span> Civitai</h2>
          <div class="tabs" role="tablist">
            ${(["browse", "account", "installed"] as Tab[]).map(
              (t) => html`<button role="tab" aria-selected=${this.tab === t ? "true" : "false"}
                class=${this.tab === t ? "on" : ""} @click=${() => this.selectTab(t)}>
                ${t === "browse" ? "Browse" : t === "account" ? "My account" : "Installed"}
              </button>`,
            )}
          </div>
          <button class="close" @click=${() => this.dispatchEvent(new CustomEvent("close"))}>
            <span class="material-symbols-rounded" style="font-size:17px;">close</span> Back to studio
          </button>
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
        ${this.tab === "browse" ? this.renderBrowse() : this.tab === "account" ? this.renderAccount() : this.renderInstalled()}
      </div>
      ${this.detail ? this.renderDetail(this.detail) : nothing}
      ${this.picked ? this.renderPicked(this.picked) : this.zoomed
        ? html`<div class="zoom plain" @click=${() => (this.zoomed = "")}>
            <img src=${api.civitaiImageURL(this.zoomed)} alt="Preview" />
          </div>`
        : nothing}
    `;
  }

  private renderBrowse() {
    return html`
      <div class="controls">
        <input
          type="search"
          placeholder="Search models…"
          .value=${this.q}
          @input=${(e: Event) => (this.q = (e.target as HTMLInputElement).value)}
          @keydown=${(e: KeyboardEvent) => { if (e.key === "Enter") void this.search(true); }}
        />
        <select aria-label="Sort" .value=${this.sort} @change=${(e: Event) => this.setAnd("sort", (e.target as HTMLSelectElement).value)}>
          ${SORTS.map((s) => html`<option value=${s.id} ?selected=${s.id === this.sort}>${s.label}</option>`)}
        </select>
        <select aria-label="Period" .value=${this.period} @change=${(e: Event) => this.setAnd("period", (e.target as HTMLSelectElement).value)}>
          ${PERIODS.map((p) => html`<option value=${p.id} ?selected=${p.id === this.period}>${p.label}</option>`)}
        </select>
        <select aria-label="Base model" .value=${this.base} @change=${(e: Event) => this.setAnd("base", (e.target as HTMLSelectElement).value)}>
          <option value="">Any base model</option>
          ${BASES.map((b) => html`<option value=${b} ?selected=${b === this.base}>${b}</option>`)}
        </select>
        <select aria-label="Category" .value=${this.category} @change=${(e: Event) => this.setAnd("category", (e.target as HTMLSelectElement).value)}>
          <option value="">All categories</option>
          ${this.categories.map((c) => html`<option value=${c.name} ?selected=${c.name === this.category}>${c.name} (${fmtCount(c.count)})</option>`)}
        </select>
        <button class="chip ${this.nsfw ? "on" : ""}" title="Show adult models" aria-pressed=${this.nsfw ? "true" : "false"}
          @click=${() => { this.nsfw = !this.nsfw; void this.search(true); }}>
          <span class="material-symbols-rounded" style="font-size:15px;">explicit</span> NSFW
        </button>
      </div>
      <div class="controls">
        ${TYPES.map((t) => html`<button class="chip ${this.type === t.id ? "on" : ""}" @click=${() => this.setAnd("type", t.id)}>${t.label}</button>`)}
        ${this.creator
          ? html`<button class="chip on" title="Showing one creator's models" @click=${() => this.setAnd("creator", "")}>
              <span class="material-symbols-rounded" style="font-size:15px;">person</span> ${this.creator}
              <span class="material-symbols-rounded" style="font-size:15px;">close</span>
            </button>`
          : nothing}
      </div>
      ${this.error ? html`<div class="err">${this.error}</div>` : nothing}
      <div class="grid">${this.items.map((m) => this.renderCard(m))}</div>
      ${this.loading
        ? html`<div class="note">Searching Civitai…</div>`
        : this.items.length
          ? this.cursor
            ? html`<button class="more" @click=${() => this.search(false)}>Load more</button>`
            : nothing
          : html`<div class="note">No models matched. Try another search.</div>`}
    `;
  }

  private renderCard(m: CivitaiModel) {
    const img = m.versions[0]?.images[0];
    return html`
      <button class="card" @click=${() => this.openDetail(m)}>
        ${img
          ? html`<img src=${api.civitaiImageURL(img)} alt=${m.name} loading="lazy" />`
          : html`<div class="noimg"><span class="material-symbols-rounded" style="font-size:34px;">image</span></div>`}
        ${m.installed ? html`<span class="badge ok"><span class="material-symbols-rounded" style="font-size:13px;">check</span> Installed</span>` : nothing}
        ${m.nsfw ? html`<span class="badge right">18+</span>` : nothing}
        <div class="meta">
          <div class="name">${m.name}</div>
          <div class="sub">
            <span>${typeLabel(m.type)}</span>
            ${m.versions[0]?.base ? html`<span>${m.versions[0].base}</span>` : nothing}
            <span>⤓ ${fmtCount(m.downloads)}</span>
          </div>
        </div>
      </button>
    `;
  }

  private renderDetail(m: CivitaiModel) {
    const v = this.currentVersion();
    return html`
      <div class="overlay" @click=${(e: Event) => { if (e.target === e.currentTarget) this.closeDetail(); }}>
        <div class="detail" role="dialog" aria-label=${m.name}>
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
                      alt="Preview" loading="lazy" @click=${() => (this.shownImage = u)} />`,
                  )}
                </div>`
              : nothing}
            ${v?.files?.length
              ? html`<div class="vlabel">Files</div>
                  <div class="files">
                    ${v.files.map(
                      (f) => html`<div class="f">
                        <span>${f.name}</span>
                        <span>${fmtSize(f.sizeMB)}</span>
                        ${f.format ? html`<span>${f.format}</span>` : nothing}
                        ${f.precision ? html`<span>${f.precision}</span>` : nothing}
                        ${f.primary ? html`<span class="material-symbols-rounded" title="Primary file" style="font-size:14px;">star</span>` : nothing}
                      </div>`,
                    )}
                  </div>`
              : nothing}
          </div>
          <div>
            <h3>${m.name}</h3>
            <div class="sub">
              <span>${typeLabel(m.type)}</span>
              ${m.creator
                ? html`<button class="creator" title="Show this creator's models" @click=${() => { this.closeDetail(); this.setAnd("creator", m.creator ?? ""); }}>
                    ${m.creatorImage ? html`<img src=${api.civitaiImageURL(m.creatorImage)} alt="" />` : html`<span class="material-symbols-rounded" style="font-size:16px;">person</span>`}
                    ${m.creator}
                  </button>`
                : nothing}
              <span>⤓ ${fmtCount(m.downloads)}</span>
              <span>♥ ${fmtCount(m.likes)}</span>
              ${m.nsfw ? html`<span>18+</span>` : nothing}
              <a class="ghost" style="padding:3px 8px; font-size:12px; text-decoration:none;" target="_blank" rel="noopener noreferrer"
                href=${`https://civitai.com/models/${m.id}${v ? `?modelVersionId=${v.id}` : ""}`}>
                <span class="material-symbols-rounded" style="font-size:14px;">open_in_new</span> civitai.com
              </a>
            </div>
            ${m.versions.length > 1
              ? html`<div class="vlabel">Version</div>
                  <div class="versions">
                    ${m.versions.map(
                      (ver) => html`<button class="chip small ${ver.id === this.versionId ? "on" : ""}" @click=${() => this.pickVersion(ver)}>
                        ${ver.installed ? html`<span class="material-symbols-rounded" style="font-size:14px;">check</span>` : nothing}
                        ${ver.name}<span style="opacity:.7;"> · ${ver.base}</span>
                      </button>`,
                    )}
                  </div>`
              : v
                ? html`<div class="vlabel">Version ${v.name} · ${v.base}${v.publishedAt ? ` · ${fmtDate(v.publishedAt)}` : ""}</div>`
                : nothing}
            ${v?.trainedWords.length
              ? html`<div class="vlabel">Trigger words</div>
                  <div class="words">
                    <span>${v.trainedWords.join(", ")}</span>
                    <button class="ghost" style="padding:3px 8px; font-size:12px; flex-shrink:0;" title="Copy the trigger words"
                      @click=${() => void navigator.clipboard?.writeText(v.trainedWords.join(", "))}>
                      <span class="material-symbols-rounded" style="font-size:14px;">content_copy</span>
                    </button>
                  </div>`
              : nothing}
            ${m.tags.length
              ? html`<div class="vlabel">Tags</div>
                  <div class="tags">
                    ${m.tags.slice(0, 14).map((t) => html`<button class="chip small" @click=${() => { this.closeDetail(); this.setAnd("category", t); }}>${t}</button>`)}
                  </div>`
              : nothing}
            ${this.detailLoading && !m.description
              ? html`<div class="note" style="padding:14px 0;">Loading the model page…</div>`
              : nothing}
            ${m.description
              ? html`<div class="vlabel">About</div>
                  <div class="desc">${unsafeHTML(m.description)}</div>`
              : nothing}
            ${v?.description && v.description !== m.description
              ? html`<div class="vlabel">About this version</div>
                  <div class="desc">${unsafeHTML(v.description)}</div>`
              : nothing}
            <div class="actions">
              ${v
                ? v.installed
                  ? html`<button class="primary" disabled>
                      <span class="material-symbols-rounded" style="font-size:18px;">check_circle</span> Installed in InvokeAI
                    </button>`
                  : html`<button class="primary" ?disabled=${this.installing || !v.downloadUrl} @click=${() => this.install(v)}>
                      <span class="material-symbols-rounded" style="font-size:18px;">download</span>
                      Install to InvokeAI${v.sizeMB ? ` (${fmtSize(v.sizeMB)})` : ""}
                    </button>`
                : nothing}
              <button class="ghost" @click=${() => this.toggleGallery()}>
                <span class="material-symbols-rounded" style="font-size:16px;">photo_library</span>
                ${this.galleryOpen ? "Hide posted pictures" : "Posted pictures & prompts"}
              </button>
            </div>
            ${this.galleryOpen ? this.renderGallery() : nothing}
            <div class="sub" style="margin-top:10px;">
              InvokeAI downloads the file itself; the cover, description and trigger words follow once it is in.
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderGallery() {
    return html`
      <div class="controls" style="margin-top:10px;">
        ${[["", "Most reactions"], ["newest", "Newest"], ["comments", "Most comments"]].map(
          ([id, label]) => html`<button class="chip small ${this.gallerySort === id ? "on" : ""}"
            @click=${() => { this.gallerySort = id; this.gallery = []; this.galleryCursor = ""; void this.loadGallery(true); }}>${label}</button>`,
        )}
      </div>
      ${this.promptsNeedKey
        ? html`<div class="sub" style="margin-top:8px;">
            Civitai only shares the prompts behind pictures with an API key — add yours under Settings → Image generation to see them here.
          </div>`
        : nothing}
      ${this.gallery.length
        ? html`<div class="gal-grid">
            ${this.gallery.map(
              (img) => html`<button title=${img.prompt ? "Has a prompt" : "No prompt kept"} @click=${() => (this.picked = img)}>
                <img src=${api.civitaiImageURL(img.url)} alt="" loading="lazy" />
                ${img.prompt ? html`<span class="has">prompt</span>` : nothing}
              </button>`,
            )}
          </div>`
        : nothing}
      ${this.galleryLoading
        ? html`<div class="note" style="padding:12px 0;">Loading pictures…</div>`
        : this.gallery.length
          ? this.galleryCursor
            ? html`<button class="more" style="margin-top:8px;" @click=${() => this.loadGallery(false)}>More pictures</button>`
            : nothing
          : html`<div class="note" style="padding:12px 0;">Nobody has posted a picture with this version.</div>`}
    `;
  }

  /** One posted picture, full size, with everything the poster kept about it. */
  private renderPicked(img: CivitaiImage) {
    const settings = promptSettingsFrom(img);
    return html`
      <div class="zoom ${settings ? "" : "plain"}" @click=${(e: Event) => { if (e.target === e.currentTarget) this.picked = null; }}>
        <img src=${api.civitaiImageURL(img.url)} alt="" @click=${() => (this.picked = null)} />
        ${settings
          ? html`<div class="pane">
              <div style="display:flex; align-items:center; gap:8px; justify-content:space-between;">
                <h4>Prompt${img.username ? ` · by ${img.username}` : ""}</h4>
                <button class="ghost" style="padding:4px 8px;" @click=${() => (this.picked = null)}>
                  <span class="material-symbols-rounded" style="font-size:16px;">close</span>
                </button>
              </div>
              <div class="p">${settings.prompt}</div>
              ${settings.negativePrompt ? html`<h4>Negative</h4><div class="p">${settings.negativePrompt}</div>` : nothing}
              <div class="kv">
                ${img.model ? html`<span>Model</span><span>${img.model}</span>` : nothing}
                ${img.sampler ? html`<span>Sampler</span><span>${img.sampler}${settings.sampler ? "" : " (not in InvokeAI)"}</span>` : nothing}
                ${settings.steps ? html`<span>Steps</span><span>${settings.steps}</span>` : nothing}
                ${settings.cfgScale ? html`<span>CFG</span><span>${settings.cfgScale}</span>` : nothing}
                ${settings.seed ? html`<span>Seed</span><span>${settings.seed}</span>` : nothing}
                ${settings.width ? html`<span>Size</span><span>${settings.width}×${settings.height}</span>` : nothing}
              </div>
              <div class="actions" style="margin-top:4px;">
                <button class="primary" @click=${() => this.usePrompt(img)}>
                  <span class="material-symbols-rounded" style="font-size:18px;">auto_awesome</span> Use in the studio
                </button>
                <button class="ghost" @click=${() => this.copyPrompt(img)}>
                  <span class="material-symbols-rounded" style="font-size:16px;">content_copy</span> ${this.copied ? "Copied" : "Copy prompt"}
                </button>
              </div>
            </div>`
          : nothing}
      </div>
    `;
  }

  private renderAccount() {
    if (this.meLoading) return html`<div class="note">Asking Civitai whose key this is…</div>`;
    if (!this.me) {
      return html`<div class="note">
        ${this.meError || "No account to show."}
        <div style="margin-top:8px; font-size:12px;">
          Add your Civitai API key under Settings → Image generation and this page shows your models and posted pictures.
        </div>
      </div>`;
    }
    return html`
      <div class="who">
        ${this.me.image
          ? html`<img src=${api.civitaiImageURL(this.me.image)} alt="" />`
          : html`<span class="material-symbols-rounded" style="font-size:44px; color:var(--oppai-text-muted);">account_circle</span>`}
        <div>
          <div class="n">${this.me.username}</div>
          <div class="s">The account the API key belongs to</div>
        </div>
        <a class="ghost" style="margin-left:auto; text-decoration:none;" target="_blank" rel="noopener noreferrer" href=${`https://civitai.com/user/${encodeURIComponent(this.me.username)}`}>
          <span class="material-symbols-rounded" style="font-size:16px;">open_in_new</span> Profile
        </a>
      </div>
      <div class="controls">
        <button class="chip on" @click=${() => this.setAnd("creator", this.me?.username ?? "")}>
          <span class="material-symbols-rounded" style="font-size:15px;">deployed_code</span> My models
        </button>
        <span style="font-size:12px; color:var(--oppai-text-muted);">
          Uploading goes through civitai.com itself — the site has no public API for it.
        </span>
      </div>
      <h3 class="sec">Pictures I posted</h3>
      ${this.myImages.length
        ? html`<div class="gal-grid">
            ${this.myImages.map(
              (img) => html`<button @click=${() => (this.picked = img)}>
                <img src=${api.civitaiImageURL(img.url)} alt="" loading="lazy" />
                ${img.prompt ? html`<span class="has">prompt</span>` : nothing}
              </button>`,
            )}
          </div>`
        : nothing}
      ${this.galleryLoading
        ? html`<div class="note" style="padding:12px 0;">Loading pictures…</div>`
        : this.myImages.length
          ? this.myImagesCursor
            ? html`<button class="more" @click=${() => this.loadGallery(false, this.me?.username)}>More pictures</button>`
            : nothing
          : html`<div class="note" style="padding:12px 0;">No posted pictures.</div>`}
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
        InvokeAI's models matched to Civitai by file hash. “Fetch from Civitai” writes the catalogue's cover, description
        and trigger words onto the InvokeAI record — the same dressing an install from here gets.
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
          ${c?.previews.length
            ? html`<div class="previews">
                ${c.previews.slice(0, 6).map((u) => html`<img src=${api.civitaiImageURL(u)} alt="" loading="lazy" @click=${() => (this.zoomed = u)} />`)}
              </div>`
            : nothing}
          ${this.pinning === m.key
            ? html`<div class="pin">
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
          <button class="ghost" ?disabled=${this.syncing === m.key} title="Write the cover, description and trigger words from Civitai onto this model"
            @click=${() => this.sync(m)}>
            <span class="material-symbols-rounded" style="font-size:16px;">${this.syncing === m.key ? "downloading" : "sync"}</span>
            ${c ? "Fetch again" : "Fetch from Civitai"}
          </button>
          ${!c
            ? html`<button class="ghost" title="Link by a version id from the site" @click=${() => { this.pinning = m.key; this.pinVersion = ""; }}>
                <span class="material-symbols-rounded" style="font-size:16px;">link</span>
              </button>`
            : nothing}
        </div>
      </div>
    `;
  }
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
