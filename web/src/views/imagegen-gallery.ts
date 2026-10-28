import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { iconStyles, motionStyles } from "../theme.js";
import { api, mascotSay, type ChatCharacter, type GalleryBoard, type GalleryImage, type GallerySort } from "../api.js";
import { libbyReact, type LibbyItemFacts } from "../libby-voice.js";
import { shareImageWithCharacter } from "../chat-share.js";
import { openMenu } from "../context-menu.js";
import { copyText, fromGalleryMetadata, toInfotext, toJSON, type GenInfo } from "../gen-info.js";
import { downloadGenerationPNG } from "../png-metadata.js";
import { profileUpdates } from "../ui-metrics.js";
import { isPickClick, pickClick } from "../pick-range.js";

const PAGE = 40;

/**
 * The studio's gallery panel. On InvokeAI it is the generator's own gallery, sorted
 * into its boards; on Automatic1111, which keeps none a client can list, it is the
 * one the server keeps of every picture made in Create (api/gen_gallery.go), sorted
 * into folders — and apart from the library, which a picture reaches only when it
 * is moved there from here. Browse it in any order, open a picture with its settings
 * beside it and step through the rest, file pictures into folders, make one a LoRA's
 * cover, or delete them.
 *
 * Pictures are picked with the Select button, or straight from the grid with Ctrl
 * (one at a time) and Shift (a run of them) — see pick-range.ts.
 *
 * The host view calls refresh() after a generation so new images appear without
 * a manual reload. A picture can go back to the studio as the one to start from
 * ("use-picture": image to image, paint to fix, its faces redone, or enlarged).
 */

/** How a gallery picture is sent back to the studio to be started from. */
export type UsePictureMode = "img2img" | "inpaint" | "faces" | "upscale";

export interface UsePicture {
  url: string;
  name: string;
  mode: UsePictureMode;
  /** The picture's gallery name, so the server can read it rather than be sent it. */
  gallery: string;
}

const SORTS: { id: GallerySort; label: string; ownOnly?: boolean }[] = [
  { id: "newest", label: "Newest first" },
  { id: "oldest", label: "Oldest first" },
  { id: "largest", label: "Largest first", ownOnly: true },
];
@customElement("oppai-invoke-gallery")
export class OppaiInvokeGallery extends LitElement {
  /** Whose gallery: InvokeAI's own, or the one OppaiLib keeps for A1111. */
  @property() backend: "invokeai" | "oppailib" = "invokeai";
  /** The generator can repaint part of a picture (A1111), and redo its faces
      (A1111 with ADetailer). */
  @property({ type: Boolean }) canPaint = false;
  @property({ type: Boolean }) canFixFaces = false;
  /** What the fix does with the studio's detailer passes: "Fix faces", "Fix hands"… */
  @property() fixLabel = "Fix faces";
  /** The upscale the studio would run ("Upscale 2×"); blank when it can't (InvokeAI,
      or an A1111 listing no upscalers). */
  @property() upscaleLabel = "";
  /** The generator's LoRAs by name, for "use as a LoRA's cover". */
  @property({ attribute: false }) loras: string[] = [];
  /** Covers can be written (A1111 with its models folder, or InvokeAI). */
  @property({ type: Boolean }) canSetCovers = false;
  /** The board to open on: the one the host was last told of. The studio re-renders
      the panel from scratch whenever it reloads its status, and a panel that always
      opened on Unsorted dropped you out of the folder you had just made. */
  @property({ attribute: false }) startBoard = "";
  @state() private boards: GalleryBoard[] = [];
  @state() private sort: GallerySort = "newest";
  /** The open picture's settings, once read. */
  @state() private info: GenInfo | null = null;
  @state() private infoError = "";
  @state() private board = "none";
  @state() private items: GalleryImage[] = [];
  @state() private total = 0;
  @state() private loading = false;
  @state() private error = "";
  @state() private expanded: GalleryImage | null = null;
  @state() private busy = false;
  @state() private newBoard = "";
  /** Covers whose tile would not load (deleted since the list came), drawn as icons. */
  @state() private failedCovers = new Set<string>();
  /** Names saved to the library this session, so the button can say "Saved". */
  @state() private savedNames = new Set<string>();
  /** Multi-select mode: tiles become checkboxes and a toolbar acts on the set. */
  @state() private selecting = false;
  @state() private selected = new Set<string>();
  /** Where a Shift-click range runs from. */
  private pickAnchor: string | null = null;
  /** The cover picker in the open picture's panel, and what it would cover. */
  @state() private coverOpen = false;
  @state() private coverFor = "";
  private metadata = new Map<string, GenInfo>();

  static styles = [
    iconStyles,
    motionStyles,
    css`
      :host {
        display: block;
        color: var(--oppai-text);
      }
      .panel {
        background: var(--oppai-surface-2);
        border-radius: 14px;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .head {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 0.3px;
      }
      .head .count {
        margin-left: auto;
        font-weight: 400;
        font-size: 12px;
        color: var(--oppai-text-muted);
      }
      .folder-cards {
        display: grid; grid-auto-flow: column; grid-auto-columns: 92px; gap: 8px;
        overflow-x: auto; overscroll-behavior-x: contain; scrollbar-width: thin; padding-bottom: 4px;
        scroll-snap-type: x proximity;
      }
      .folder-card {
        display: flex; flex-direction: column; gap: 3px; padding: 0 0 6px; border: none; border-radius: 12px;
        background: var(--oppai-surface); color: var(--oppai-text); font: inherit; text-align: left; cursor: pointer;
        overflow: hidden; scroll-snap-align: start; outline: 2px solid transparent; outline-offset: -2px;
        transition: outline-color 0.12s ease, background 0.12s ease;
      }
      .folder-card:hover { background: var(--oppai-surface-2); }
      .folder-card.on { outline-color: var(--oppai-accent, var(--oppai-primary)); }
      .folder-cover {
        display: grid; place-items: center; aspect-ratio: 4 / 3; background: var(--oppai-surface-2);
        color: var(--oppai-text-muted); overflow: hidden;
      }
      .folder-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .folder-cover .material-symbols-rounded { font-size: 26px; }
      .folder-name {
        padding: 0 8px; font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .folder-count { padding: 0 8px; font-size: 11px; color: var(--oppai-text-muted); }
      .sort-label {
        flex: 1; min-width: 0; font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        align-self: center;
      }
      .board-select {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid var(--oppai-border-strong);
        border-radius: 10px;
        background: var(--oppai-surface);
        color: var(--oppai-text);
        font: inherit;
        font-size: 12px;
        padding: 8px 10px;
      }
      .new-board {
        display: flex;
        gap: 6px;
      }
      .new-board input {
        min-width: 0;
        flex: 1;
        border: 1px solid var(--oppai-border-strong);
        border-radius: 9px;
        background: var(--oppai-surface);
        color: var(--oppai-text);
        font: inherit;
        font-size: 12px;
        padding: 7px 9px;
      }
      .new-board button {
        border: none;
        border-radius: 9px;
        background: var(--oppai-primary);
        color: var(--oppai-on-primary);
        font: inherit;
        padding: 7px 10px;
        cursor: pointer;
      }
      .board-del {
        margin-top: 6px;
        border: 1px solid var(--oppai-border-strong);
        background: transparent;
        color: var(--oppai-error, #f2b8b5);
        border-radius: 9px;
        font: inherit;
        font-size: 12px;
        padding: 5px 10px;
        cursor: pointer;
      }
      .board-del:disabled {
        opacity: 0.5;
        cursor: default;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
        gap: 8px;
      }
      .tile {
        position: relative;
        border: none;
        padding: 0;
        border-radius: 10px;
        overflow: hidden;
        cursor: pointer;
        background: var(--oppai-surface);
        aspect-ratio: 1;
      }
      .tile img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .tile .del {
        position: absolute;
        top: 3px;
        right: 3px;
        width: 22px;
        height: 22px;
        border: none;
        border-radius: 11px;
        background: rgba(0, 0, 0, 0.55);
        color: #fff;
        display: none;
        place-items: center;
        cursor: pointer;
      }
      .tile:hover .del {
        display: grid;
      }
      .tile.picked {
        outline: 2px solid var(--oppai-primary);
        outline-offset: -2px;
      }
      .tile.picked img {
        opacity: 0.8;
      }
      /* The selection tick sits where the delete button would; always visible in
         select mode so tapping a tile toggles it. */
      .tile .check {
        position: absolute;
        top: 3px;
        left: 3px;
        width: 22px;
        height: 22px;
        border-radius: 11px;
        background: rgba(0, 0, 0, 0.55);
        color: #fff;
        display: grid;
        place-items: center;
      }
      .tile.picked .check {
        background: var(--oppai-primary);
        color: var(--oppai-on-primary);
      }
      /* Head "Select" toggle and the selection action bar. */
      .sel-toggle {
        margin-left: 8px;
        border: 1px solid var(--oppai-border-strong);
        background: transparent;
        color: var(--oppai-text-dim);
        border-radius: 999px;
        font: inherit;
        font-size: 12px;
        padding: 3px 10px;
        cursor: pointer;
      }
      .sel-toggle.on {
        background: var(--oppai-primary);
        color: var(--oppai-on-primary);
        border-color: var(--oppai-primary);
      }
      .sel-bar {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .sel-count {
        font-size: 12px;
        color: var(--oppai-text-muted);
      }
      .sel-move {
        border: 1px solid var(--oppai-border-strong);
        border-radius: 9px;
        background: var(--oppai-surface);
        color: var(--oppai-text);
        font: inherit;
        font-size: 12px;
        padding: 6px 8px;
      }
      .sel-move:disabled {
        opacity: 0.5;
      }
      .sel-lib {
        border: none;
        border-radius: 9px;
        background: var(--oppai-primary);
        color: var(--oppai-on-primary);
        font: inherit;
        font-size: 12px;
        font-weight: 600;
        padding: 6px 12px;
        cursor: pointer;
      }
      .sel-lib:disabled {
        opacity: 0.5;
        cursor: default;
      }
      .board-acts {
        display: flex;
        gap: 6px;
      }
      .board-del.rename {
        color: var(--oppai-text-dim);
      }
      .cover-pick {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 10px;
        border-radius: 10px;
        background: var(--oppai-surface-2);
      }
      .sel-del {
        margin-left: auto;
        border: none;
        border-radius: 9px;
        background: var(--oppai-surface);
        color: var(--oppai-error, #f2b8b5);
        font: inherit;
        font-size: 12px;
        font-weight: 600;
        padding: 6px 12px;
        cursor: pointer;
      }
      .sel-del:disabled {
        opacity: 0.5;
        cursor: default;
      }
      .note {
        font-size: 12px;
        color: var(--oppai-text-muted);
      }
      .more {
        border: 1px dashed var(--oppai-border-strong);
        background: none;
        color: var(--oppai-text-dim);
        border-radius: 10px;
        font: inherit;
        font-size: 13px;
        padding: 8px;
        cursor: pointer;
      }
      .err {
        font-size: 12px;
        color: var(--oppai-error, #f2b8b5);
      }

      /* Expanded (lightbox) overlay. */
      .overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.82);
        z-index: 70;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 14px;
        padding: 20px;
      }
      /* The picture fills its side of the viewer whatever its own size: a 512px
         render shown at 512px leaves most of the screen to the scrim. */
      .overlay img {
        width: 100%;
        height: 78vh;
        object-fit: contain;
        border-radius: 10px;
      }
      @media (max-width: 900px) { .overlay img { height: 60vh; } }
      .viewer {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 320px;
        gap: 16px;
        width: min(96vw, 1500px);
        align-items: center;
      }
      .viewer .stage { position: relative; display: grid; place-items: center; min-height: 0; }
      .viewer .nav {
        position: absolute; top: 50%; transform: translateY(-50%);
        width: 44px; height: 44px; border-radius: 22px; border: none; cursor: pointer;
        background: rgba(0, 0, 0, 0.55); color: #fff; display: grid; place-items: center;
      }
      .viewer .nav.prev { left: 6px; }
      .viewer .nav.next { right: 6px; }
      .viewer .nav:disabled { opacity: 0.3; cursor: default; }
      .meta {
        background: var(--oppai-surface); color: var(--oppai-text); border-radius: 14px; padding: 14px;
        max-height: 78vh; overflow: auto; font-size: 12.5px; display: flex; flex-direction: column; gap: 10px;
      }
      .meta h4 { margin: 0; font-size: 13px; display: flex; align-items: center; gap: 6px; }
      .meta h4 small { margin-left: auto; font-weight: 400; color: var(--oppai-text-muted); }
      .meta .k { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--oppai-text-muted); margin-bottom: 3px; }
      .meta .prompt { white-space: pre-wrap; word-break: break-word; line-height: 1.45; background: var(--oppai-surface-2); border-radius: 9px; padding: 8px 10px; }
      .meta dl { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 4px 12px; margin: 0; }
      .meta dt { color: var(--oppai-text-muted); }
      .meta dd { margin: 0; overflow-wrap: anywhere; }
      .meta .acts { display: flex; gap: 6px; flex-wrap: wrap; }
      .meta .k { display: flex; align-items: center; gap: 6px; }
      .meta .copy-k {
        margin-left: auto; border: none; background: none; color: var(--oppai-primary); font: inherit; font-size: 11px;
        text-transform: none; letter-spacing: 0; cursor: pointer; display: inline-flex; align-items: center; gap: 3px; padding: 2px 4px;
        border-radius: 6px;
      }
      .meta .copy-k:hover { background: var(--oppai-surface-2); }
      .meta .copy-k .material-symbols-rounded { font-size: 14px; }
      .setup { display: flex; flex-direction: column; gap: 8px; padding: 6px 2px; font-size: 13px; line-height: 1.45; }
      .setup > .material-symbols-rounded { font-size: 32px; color: var(--oppai-text-muted); }
      .setup p { margin: 0; color: var(--oppai-text-dim); overflow-wrap: anywhere; }
      .setup code { font-size: 12px; }
      .meta .acts button {
        border: 1px solid var(--oppai-border-strong); background: transparent; color: var(--oppai-text); border-radius: 9px;
        font: inherit; font-size: 12px; padding: 6px 10px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;
      }
      @media (max-width: 900px) {
        .viewer { grid-template-columns: minmax(0, 1fr); }
        .overlay { justify-content: flex-start; overflow-y: auto; }
        .meta { max-height: none; }
      }
      .sort-row { display: flex; gap: 6px; }
      .sort-row .board-select { flex: 1; min-width: 0; }
      .overlay-actions {
        display: flex;
        gap: 10px;
      }
      .obtn {
        border: none;
        border-radius: 10px;
        background: var(--oppai-surface-2);
        color: var(--oppai-text);
        font: inherit;
        font-size: 13px;
        font-weight: 600;
        padding: 10px 16px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .obtn.primary {
        background: var(--oppai-primary);
        color: var(--oppai-on-primary);
      }
      .obtn.danger {
        color: var(--oppai-error, #f2b8b5);
      }
      .obtn:disabled {
        opacity: 0.55;
        cursor: default;
      }

      /* Full-height gallery rail in the generation workspace. The host attribute keeps
         the component reusable while matching Invoke's always-present board browser. */
      :host([workspace]) {
        height: 100%;
        min-height: 0;
      }
      :host([workspace]) .panel {
        height: 100%;
        min-height: 0;
        box-sizing: border-box;
        overflow-y: auto;
        overscroll-behavior: contain;
        scrollbar-width: thin;
        border-radius: 0;
        background: transparent;
        padding: 0 10px 12px;
        gap: 9px;
      }
      :host([workspace]) .head {
        position: sticky;
        top: 0;
        z-index: 2;
        min-height: 42px;
        margin: 0 -10px;
        padding: 0 10px;
        background: var(--oppai-surface-2);
        border-bottom: 1px solid var(--oppai-border);
        text-transform: uppercase;
        letter-spacing: .65px;
        font-size: 11px;
      }
      :host([workspace]) .board-select {
        height: 34px;
        border-radius: 8px;
        padding: 5px 8px;
      }
      :host([workspace]) .note { line-height: 1.4; }
      :host([workspace]) .new-board input,
      :host([workspace]) .new-board button { height: 32px; box-sizing: border-box; }
      :host([workspace]) .grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 6px;
      }
      :host([workspace]) .tile {
        border-radius: 6px;
        outline-offset: -2px;
      }
      @media (max-width: 1240px) {
        :host([workspace]) .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      }
      @media (max-width: 1020px) {
        :host([workspace]) .panel { overflow-y: visible; }
        :host([workspace]) .grid { grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); }
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    profileUpdates(this, "generation gallery");
    window.addEventListener("keydown", this.onKey);
    if (this.startBoard) this.board = this.startBoard;
    void this.refresh();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("keydown", this.onKey);
  }

  /** Arrow keys step through the open picture's board; Escape closes it. */
  private onKey = (e: KeyboardEvent) => {
    if (!this.expanded) return;
    // Typing in the cover picker is not stepping through pictures.
    if (e.composedPath().some((t) => t instanceof HTMLSelectElement || t instanceof HTMLInputElement)) return;
    if (e.key === "ArrowLeft") this.step(-1);
    else if (e.key === "ArrowRight") this.step(1);
    else if (e.key === "Escape") this.expanded = null;
    else return;
    e.preventDefault();
  };

  /** The gallery is OppaiLib's own (A1111) rather than InvokeAI's. */
  private get own(): boolean {
    return this.backend === "oppailib";
  }

  private labelOf(img: GalleryImage): string {
    return img.label || img.name;
  }

  /** Opens a picture and reads its settings for the side panel. */
  private open(img: GalleryImage) {
    this.expanded = img;
    this.coverOpen = false;
    this.info = this.metadata.get(img.name) ?? null;
    this.infoError = "";
    if (this.info) return;
    void this.imageInfo(img).then(
      (info) => { if (this.expanded?.name === img.name) this.info = info; },
      (e) => { if (this.expanded?.name === img.name) this.infoError = (e as Error).message; },
    );
  }

  /** The next or previous picture, reading the next page when the end is reached. */
  private async step(d: number) {
    const at = this.items.findIndex((i) => i.name === this.expanded?.name);
    if (at < 0) return;
    let next = this.items[at + d];
    if (!next && d > 0 && this.items.length < this.total) {
      await this.loadPage(false);
      next = this.items[at + d];
    }
    if (next) this.open(next);
  }

  private pickSort(sort: GallerySort) {
    if (sort === this.sort) return;
    this.sort = sort;
    this.items = [];
    void this.loadPage(true);
  }

  /** The board on screen. New generations are filed here — see the host view. */
  get selectedBoard(): string {
    return this.board;
  }

  /** Tells the host which board new generations should be filed into. */
  private announceBoard() {
    this.dispatchEvent(
      new CustomEvent("board-changed", { detail: { board: this.board }, bubbles: true, composed: true }),
    );
  }

  /** Reloads boards and the current board's first page. */
  async refresh() {
    this.error = "";
    try {
      const res = await api.galleryBoards();
      this.boards = res.boards;
      if (!this.boards.some((b) => b.id === this.board) && this.boards.length) {
        this.board = this.boards[0].id;
      }
      // Always announce, not just on a change: the host files new generations into
      // whichever board is open here, and it needs that on first load too.
      this.announceBoard();
    } catch (e) {
      this.error = (e as Error).message;
      return;
    }
    await this.loadPage(true);
  }

  private async loadPage(reset: boolean) {
    if (this.loading) return;
    this.loading = true;
    try {
      const offset = reset ? 0 : this.items.length;
      const page = await api.galleryImages(this.board, offset, PAGE, this.sort);
      this.items = reset ? page.items : [...this.items, ...page.items];
      this.total = page.total;
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.loading = false;
    }
  }

  private pickBoard(id: string) {
    if (this.board === id) return;
    this.board = id;
    this.items = [];
    this.announceBoard();
    void this.loadPage(true);
  }

  private async createBoard() {
    const name = this.newBoard.trim();
    if (!name || this.busy) return;
    this.busy = true;
    this.error = "";
    try {
      const created = await api.createGalleryBoard(name);
      this.newBoard = "";
      await this.refresh();
      this.pickBoard(created.id);
      if (!this.own) this.dispatchEvent(new CustomEvent("boards-changed", { bubbles: true, composed: true }));
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.busy = false;
    }
  }

  /** Deletes the currently-viewed board. Its images are not lost — InvokeAI returns
      them to Uncategorized — so the confirm says as much. */
  private async deleteBoard() {
    const current = this.boards.find((b) => b.id === this.board);
    if (!current || !this.isFolder(current.id) || this.busy) return;
    const back = this.own ? "Unsorted" : "Uncategorized";
    if (!confirm(`Delete the “${current.name}” ${this.own ? "folder" : "gallery"}? Its pictures move back to ${back}.`)) return;
    this.busy = true;
    this.error = "";
    try {
      await api.deleteGalleryBoard(current.id);
      const line = libbyReact("galleryDelete");
      mascotSay(line.message, "success", { emotion: line.emotion, intensity: line.intensity });
      this.board = "none";
      this.items = [];
      await this.refresh();
      if (!this.own) this.dispatchEvent(new CustomEvent("boards-changed", { bubbles: true, composed: true }));
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.busy = false;
    }
  }

  /** A board that is a folder of pictures rather than "all of them" or "in none". */
  private isFolder(id: string): boolean {
    return id !== "none" && id !== "all";
  }

  private async renameBoard() {
    const current = this.boards.find((b) => b.id === this.board);
    if (!current || !this.isFolder(current.id) || this.busy) return;
    const name = window.prompt("Rename this folder", current.name)?.trim();
    if (!name || name === current.name) return;
    this.busy = true;
    try {
      await api.renameGalleryBoard(current.id, name);
      await this.refresh();
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.busy = false;
    }
  }

  /** Takes pictures off the grid after they left the board on screen: deleted, moved
      to the library, or filed into another folder. */
  private dropFromView(names: Set<string>) {
    const before = this.items.length;
    this.items = this.items.filter((i) => !names.has(i.name));
    const gone = before - this.items.length;
    this.total = Math.max(0, this.total - gone);
    this.boards = this.boards.map((b) => (b.id === this.board ? { ...b, count: Math.max(0, b.count - gone) } : b));
    if (this.expanded && names.has(this.expanded.name)) this.expanded = null;
  }

  private async deleteImage(img: GalleryImage) {
    if (this.busy) return;
    this.busy = true;
    try {
      await api.deleteGalleryImage(img.name);
      const line = libbyReact("galleryDelete");
      mascotSay(line.message, "success", { emotion: line.emotion, intensity: line.intensity });
      this.items = this.items.filter((i) => i.name !== img.name);
      this.total = Math.max(0, this.total - 1);
      this.boards = this.boards.map((b) =>
        b.id === this.board ? { ...b, count: Math.max(0, b.count - 1) } : b,
      );
      if (this.expanded?.name === img.name) this.expanded = null;
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.busy = false;
    }
  }

  /** InvokeAI's picture is copied into the library; OppaiLib's own is moved there,
      and leaves the gallery. */
  private async saveToLibrary(img: GalleryImage) {
    if (this.busy || this.savedNames.has(img.name)) return;
    this.busy = true;
    try {
      await api.saveGalleryImage({ name: img.name });
      if (this.own) {
        // Step on before it goes, so moving a run of keepers is a click each.
        const at = this.items.findIndex((i) => i.name === img.name);
        const next = this.items[at + 1] ?? this.items[at - 1];
        this.dropFromView(new Set([img.name]));
        this.boards = this.boards.map((b) => (b.id === "all" && this.board !== "all" ? { ...b, count: Math.max(0, b.count - 1) } : b));
        if (next && this.items.includes(next) && at >= 0) this.open(next);
        mascotSay("Moved to the library.", "success");
      } else {
        this.savedNames = new Set(this.savedNames).add(img.name);
      }
      this.dispatchEvent(new CustomEvent<LibbyItemFacts>("imported", {
        detail: { count: 1, kind: "image", title: this.labelOf(img) },
        bubbles: true, composed: true,
      }));
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.busy = false;
    }
  }

  private async moveSelectedToLibrary() {
    const names = [...this.selected];
    if (!names.length || this.busy) return;
    this.busy = true;
    try {
      await api.saveGalleryImage({ names });
      this.dropFromView(new Set(names));
      this.selected = new Set();
      this.selecting = false;
      mascotSay(names.length === 1 ? "Moved to the library." : `Moved ${names.length} pictures to the library.`, "success");
      this.dispatchEvent(new CustomEvent<LibbyItemFacts>("imported", {
        detail: { count: names.length, kind: "image" },
        bubbles: true, composed: true,
      }));
      await this.refresh();
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.busy = false;
    }
  }

  // ── covers ──────────────────────────────────────────────────────────────────

  /** What a picture can be the cover of: the LoRAs it was made with first, since
      that is nearly always the one meant, then every other LoRA. */
  private coverChoices(info: GenInfo | null): { used: string[]; rest: string[] } {
    const used = [...new Set((info?.loras ?? []).map((l) => l.name).filter(Boolean))];
    const rest = this.loras.filter((n) => !used.includes(n)).sort((a, b) => a.localeCompare(b));
    return { used, rest };
  }

  private openCover(img: GalleryImage) {
    if (this.expanded?.name !== img.name) this.open(img);
    this.coverOpen = true;
    this.coverFor = "";
    // The picker opens on the picture's own LoRA once its settings are read.
    void this.imageInfo(img).then((info) => {
      if (this.expanded?.name === img.name && !this.coverFor) this.coverFor = this.coverChoices(info).used[0] ?? "";
    }, () => undefined);
  }

  private async setCover(img: GalleryImage) {
    const target = this.coverFor;
    if (!target || this.busy) return;
    this.busy = true;
    try {
      if (target.startsWith("model:")) {
        await api.setModelThumb({ model: target.slice(6), galleryName: img.name });
      } else {
        await api.setLoraThumb({ model: target, galleryName: img.name });
      }
      this.coverOpen = false;
      mascotSay(`Set as ${target.startsWith("model:") ? "the model's" : `${target}'s`} cover.`, "success");
      this.dispatchEvent(new CustomEvent("covers-changed", { bubbles: true, composed: true }));
    } catch (e) {
      mascotSay((e as Error).message || "Couldn't set that cover.", "error");
    } finally {
      this.busy = false;
    }
  }

  // ── share with a character ──────────────────────────────────────────────────
  // The same handoff Library offers, from the generator's own gallery: an image you
  // just made is the one you most want to show someone. It goes through chat-share
  // so Chat needs to know nothing about InvokeAI, exactly as it knows nothing about
  // the library grid.

  private async openShareMenu(img: GalleryImage, x: number, y: number) {
    let characters: ChatCharacter[] = [];
    try {
      characters = (await api.chatWorkspace()).characters ?? [];
    } catch (e) {
      mascotSay((e as Error).message || "Couldn't load your chat characters.", "error");
      return;
    }
    if (!characters.length) {
      mascotSay("No chat characters yet — add one in Chat first.", "error");
      return;
    }
    openMenu({
      x, y, title: "Show this to",
      items: characters.map((character) => ({
        label: character.name, icon: "person",
        run: () => void this.share(img, character),
      })),
    });
  }

  private async imageInfo(img: GalleryImage): Promise<GenInfo> {
    const cached = this.metadata.get(img.name);
    if (cached) return cached;
    const info = fromGalleryMetadata(await api.galleryImageMetadata(img.name));
    this.metadata.set(img.name, info);
    return info;
  }

  private openImageMenu(img: GalleryImage, e: MouseEvent) {
    e.preventDefault();
    openMenu({
      x: e.clientX,
      y: e.clientY,
      title: this.labelOf(img),
      items: [
        { label: "Copy prompt", icon: "content_copy", run: () => void this.copyField(img, "prompt") },
        { label: "Copy generation metadata", icon: "content_copy", run: () => void this.copyMetadata(img) },
        { label: "Use same generation parameters", icon: "replay", run: () => void this.reuseMetadata(img) },
        { label: "Start from this picture", icon: "add_photo_alternate", run: () => this.usePicture(img, "img2img") },
        ...(this.canPaint ? [{ label: "Paint to fix", icon: "brush", run: () => this.usePicture(img, "inpaint") }] : []),
        ...(this.canFixFaces ? [{ label: this.fixLabel, icon: "face_retouching_natural", run: () => this.usePicture(img, "faces") }] : []),
        ...(this.upscaleLabel ? [{ label: this.upscaleLabel, icon: "open_in_full", run: () => this.usePicture(img, "upscale") }] : []),
        ...(this.isFolder(this.board) ? [{ label: "Set as folder cover", icon: "folder_special", run: () => void this.setFolderCover(img) }] : []),
        ...(this.canSetCovers ? [{ label: "Use as a LoRA's cover…", icon: "photo_library", run: () => this.openCover(img) }] : []),
        ...(this.own ? [{ label: "Move to library", icon: "save", run: () => void this.saveToLibrary(img) }] : []),
        { label: "Export PNG for Civitai", icon: "download", run: () => void this.exportImage(img) },
        { label: "Send to chat", icon: "forum", run: () => void this.openShareMenu(img, e.clientX, e.clientY) },
      ],
    });
  }

  private async copyMetadata(img: GalleryImage) {
    try {
      if (!await copyText(toInfotext(await this.imageInfo(img)))) throw new Error("Clipboard permission was denied.");
      mascotSay("Generation metadata copied.", "success");
    } catch (e) {
      mascotSay((e as Error).message || "Couldn't copy generation metadata.", "error");
    }
  }

  /** Copies the prompt or the negative alone — what is wanted far more often than
      the whole record, to paste into a prompt box here or anywhere. */
  private async copyField(img: GalleryImage, field: "prompt" | "negativePrompt") {
    try {
      const text = (await this.imageInfo(img))[field];
      if (!text) throw new Error(field === "prompt" ? "This picture has no prompt saved with it." : "This picture has no negative prompt.");
      if (!await copyText(text)) throw new Error("Clipboard permission was denied.");
      mascotSay(field === "prompt" ? "Prompt copied." : "Negative prompt copied.", "success");
    } catch (e) {
      mascotSay((e as Error).message || "Couldn't copy that.", "error");
    }
  }

  /** Hands a picture to the studio to start the next run from. */
  private usePicture(img: GalleryImage, mode: UsePictureMode) {
    this.dispatchEvent(new CustomEvent<UsePicture>("use-picture", {
      detail: { url: api.galleryFullURL(img.name), name: this.labelOf(img), mode, gallery: img.name },
      bubbles: true, composed: true,
    }));
    this.expanded = null;
  }

  private async reuseMetadata(img: GalleryImage) {
    try {
      const info = await this.imageInfo(img);
      this.dispatchEvent(new CustomEvent<GenInfo>("reuse-generation", {
        detail: info,
        bubbles: true,
        composed: true,
      }));
      // The settings are on their way to the form; the form is what's wanted next.
      this.expanded = null;
    } catch (e) {
      mascotSay((e as Error).message || "Couldn't load generation metadata.", "error");
    }
  }

  private async exportImage(img: GalleryImage) {
    try {
      const info = await this.imageInfo(img);
      const base = this.labelOf(img).replace(/\.[a-z0-9]+$/i, "") || "generated-image";
      await downloadGenerationPNG(
        api.galleryFullURL(img.name),
        `${base}-civitai.png`,
        toInfotext(info),
        toJSON(info),
      );
      mascotSay("PNG exported with Civitai metadata.", "success");
    } catch (e) {
      mascotSay((e as Error).message || "Couldn't export that image.", "error");
    }
  }

  private async share(img: GalleryImage, character: ChatCharacter) {
    try {
      await shareImageWithCharacter(api.galleryFullURL(img.name), character.id, this.labelOf(img));
      // Only leave the generator once the bytes are in hand, so a failed read does
      // not strand the user in Chat with nothing to show.
      this.expanded = null;
      this.dispatchEvent(new CustomEvent("open-chat", { bubbles: true, composed: true }));
    } catch (e) {
      mascotSay((e as Error).message || `Couldn't share with ${character.name}.`, "error");
    }
  }

  // ── multi-select ────────────────────────────────────────────────────────────

  private toggleSelecting() {
    this.selecting = !this.selecting;
    if (!this.selecting) this.selected = new Set();
    this.pickAnchor = null;
  }

  /** A tile's click: opens it, or picks it in select mode — and Ctrl or Shift with
      the click picks from anywhere, starting select mode on the way. */
  private clickTile(e: MouseEvent, img: GalleryImage) {
    if (!this.selecting && !isPickClick(e)) {
      this.open(img);
      return;
    }
    if (e.shiftKey) window.getSelection()?.removeAllRanges();
    this.selecting = true;
    const next = pickClick(this.items.map((i) => i.name), { selected: this.selected, anchor: this.pickAnchor }, img.name, e);
    this.selected = next.selected;
    this.pickAnchor = next.anchor;
  }

  private selectAll() {
    this.selected = new Set(this.items.map((i) => i.name));
  }

  private async deleteSelected() {
    const names = [...this.selected];
    if (!names.length || this.busy) return;
    // A Shift range picks a lot in one click, and these were never in the library:
    // the gallery's copy is the only one.
    if (this.own && !confirm(`Delete ${names.length === 1 ? "this picture" : `these ${names.length} pictures`}? They are only kept here.`)) {
      return;
    }
    this.busy = true;
    try {
      await api.deleteGalleryImages(names);
      const line = libbyReact("galleryDelete", { count: names.length });
      mascotSay(line.message, "success", { emotion: line.emotion, intensity: line.intensity });
      this.dropFromView(new Set(names));
      this.selected = new Set();
      this.selecting = false;
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.busy = false;
    }
  }

  private async addSelectedToBoard(boardId: string) {
    const names = [...this.selected];
    if (!names.length || !boardId || boardId === this.board || this.busy) return;
    this.busy = true;
    try {
      await api.addGalleryImagesToBoard(boardId, names);
      // The moved images leave the board we're viewing — except "All pictures",
      // which still holds them wherever they are filed.
      if (this.board !== "all") this.dropFromView(new Set(names));
      this.selected = new Set();
      this.selecting = false;
      await this.refresh();
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.busy = false;
    }
  }

  /**
   * The folders, as cards: each its cover, its name and how many it holds. They were
   * a dropdown, which said nothing about what was in a folder until it was opened.
   * A folder's cover is the picture chosen for it (the picture menu's "Set as folder
   * cover"), else its newest.
   */
  private renderFolderCards() {
    return html`<div class="folder-cards" role="listbox" aria-label=${this.own ? "Folders" : "Galleries"}>
      ${this.boards.map((b) => html`<button class="folder-card ${b.id === this.board ? "on" : ""}" role="option"
        aria-selected=${b.id === this.board ? "true" : "false"} title=${b.name} @click=${() => this.pickBoard(b.id)}>
        <span class="folder-cover">
          ${b.cover && !this.failedCovers.has(b.cover)
            ? html`<img src=${api.galleryThumbURL(b.cover)} alt="" loading="lazy"
                @error=${() => (this.failedCovers = new Set(this.failedCovers).add(b.cover!))} />`
            : html`<span class="material-symbols-rounded">${b.id === "all" ? "photo_library" : this.isFolder(b.id) ? "folder" : "inbox"}</span>`}
        </span>
        <span class="folder-name">${b.name}</span>
        <span class="folder-count">${b.count}</span>
      </button>`)}
    </div>`;
  }

  /** Makes a picture its folder's cover, on the card at once and then for real. */
  private async setFolderCover(img: GalleryImage) {
    const id = this.board;
    if (!this.isFolder(id)) return;
    const before = this.boards;
    this.boards = this.boards.map((b) => (b.id === id ? { ...b, cover: img.name } : b));
    try {
      await api.setGalleryBoardCover(id, img.name);
      mascotSay("That's the folder's cover now.", "success");
    } catch (e) {
      this.boards = before;
      mascotSay((e as Error).message || "Couldn't set the cover.", "error");
    }
  }

  /** Where the next run lands, said under the board picker. */
  private filingNote(current: GalleryBoard | undefined) {
    if (!this.own) return html`New generations are filed into ${current?.name ?? "this gallery"}.`;
    const into = current && this.isFolder(current.id) ? current.name : "Unsorted";
    return html`Every picture made here is kept, and new ones go into <b>${into}</b>. They reach the library
      only when you move them there. Ctrl- or Shift-click to pick several.`;
  }

  render() {
    const current = this.boards.find((b) => b.id === this.board);
    return html`
      <div class="panel">
        <div class="head">
          <span class="material-symbols-rounded" style="font-size:18px;">photo_library</span>
          ${this.own ? "Gallery" : "Invoke gallery"}
          <span class="count">${current ? `${this.total || current.count} images` : ""}</span>
          ${this.items.length
            ? html`<button class="sel-toggle ${this.selecting ? "on" : ""}"
                @click=${() => this.toggleSelecting()}>
                ${this.selecting ? "Done" : "Select"}
              </button>`
            : nothing}
        </div>
        ${this.selecting
          ? html`<div class="sel-bar">
              <span class="sel-count">${this.selected.size} selected</span>
              ${this.selected.size < this.items.length
                ? html`<button class="sel-toggle" @click=${() => this.selectAll()}>All ${this.items.length}</button>`
                : nothing}
              <select class="sel-move" aria-label=${this.own ? "Move to folder" : "Move to gallery"} .value=${""}
                ?disabled=${this.busy || !this.selected.size}
                @change=${(e: Event) => {
                  const el = e.target as HTMLSelectElement;
                  void this.addSelectedToBoard(el.value);
                  el.value = "";
                }}>
                <option value="">${this.own ? "Move to folder…" : "Add to gallery…"}</option>
                ${this.boards
                  .filter((b) => b.id !== this.board && b.id !== "all")
                  .map((b) => html`<option value=${b.id}>${b.name}</option>`)}
              </select>
              ${this.own ? html`<button class="sel-lib" ?disabled=${this.busy || !this.selected.size}
                title="Move the picked pictures into the library; they leave the gallery"
                @click=${() => this.moveSelectedToLibrary()}>
                <span class="material-symbols-rounded" style="font-size:15px; vertical-align:-3px;">save</span>
                To library
              </button>` : nothing}
              <button class="sel-del" ?disabled=${this.busy || !this.selected.size}
                @click=${() => this.deleteSelected()}>
                <span class="material-symbols-rounded" style="font-size:15px; vertical-align:-3px;">delete</span>
                Delete
              </button>
            </div>`
          : nothing}
        ${this.boards.length
          ? html`
              ${this.renderFolderCards()}
              <div class="sort-row">
                <span class="sort-label">${current?.name ?? ""}</span>
                <select class="board-select" aria-label="Order" style="flex:none;width:auto;"
                  @change=${(e: Event) => this.pickSort((e.target as HTMLSelectElement).value as GallerySort)}>
                  ${SORTS.filter((s) => this.own || !s.ownOnly).map((s) => html`<option value=${s.id} ?selected=${s.id === this.sort}>${s.label}</option>`)}
                </select>
              </div>
              ${this.isFolder(this.board)
                ? html`<div class="board-acts">
                    ${this.own ? html`<button class="board-del rename" ?disabled=${this.busy} @click=${() => this.renameBoard()}>
                      <span class="material-symbols-rounded" style="font-size:15px; vertical-align:-3px;">edit</span>
                      Rename
                    </button>` : nothing}
                    <button class="board-del" ?disabled=${this.busy}
                      title=${this.own ? "Delete this folder (its pictures move to Unsorted)" : "Delete this gallery (its images move to Uncategorized)"}
                      @click=${() => this.deleteBoard()}>
                      <span class="material-symbols-rounded" style="font-size:15px; vertical-align:-3px;">delete</span>
                      ${this.own ? "Delete folder" : "Delete gallery"}
                    </button>
                  </div>`
                : nothing}
            `
          : nothing}
        <div class="note">${this.filingNote(current)}</div>
        <div class="new-board">
          <input maxlength="120" placeholder=${this.own ? "New folder" : "New Invoke gallery"} .value=${this.newBoard}
            @input=${(e: Event) => (this.newBoard = (e.target as HTMLInputElement).value)}
            @keydown=${(e: KeyboardEvent) => { if (e.key === "Enter") void this.createBoard(); }} />
          <button ?disabled=${this.busy || !this.newBoard.trim()} @click=${() => this.createBoard()}>Create</button>
        </div>
        ${this.error ? html`<div class="err">${this.error}</div>` : nothing}
        ${this.items.length
          ? html`<div class="grid">
              ${this.items.map((img) => {
                const picked = this.selected.has(img.name);
                return html`
                  <button
                    class="tile ${this.selecting ? "selectable" : ""} ${picked ? "picked" : ""}"
                    title=${this.labelOf(img)}
                    @contextmenu=${(e: MouseEvent) => {
                      if (this.selecting) return;
                      e.preventDefault();
                      this.openImageMenu(img, e);
                    }}
                    @click=${(e: MouseEvent) => this.clickTile(e, img)}
                  >
                    <img src=${api.galleryThumbURL(img.name)} alt="Generated image" loading="lazy" />
                    ${this.selecting
                      ? html`<span class="check">
                          <span class="material-symbols-rounded" style="font-size:15px;">
                            ${picked ? "check_circle" : "radio_button_unchecked"}
                          </span>
                        </span>`
                      : html`<span
                          class="del"
                          role="button"
                          title=${this.own ? "Delete from the gallery" : "Delete from InvokeAI"}
                          @click=${(e: Event) => {
                            e.stopPropagation();
                            void this.deleteImage(img);
                          }}
                        >
                          <span class="material-symbols-rounded" style="font-size:14px;">delete</span>
                        </span>`}
                  </button>
                `;
              })}
            </div>`
          : this.loading
            ? nothing
            : html`<div class="note">${this.own && this.board !== "none" ? "No pictures in here yet." : "Nothing here yet — generated images land in this gallery."}</div>`}
        ${this.loading ? html`<div class="note">Loading…</div>` : nothing}
        ${!this.loading && this.items.length < this.total
          ? html`<button class="more" @click=${() => this.loadPage(false)}>
              Load more (${this.total - this.items.length} left)
            </button>`
          : nothing}
      </div>
      ${this.expanded ? this.renderExpanded(this.expanded) : nothing}
    `;
  }

  private renderExpanded(img: GalleryImage) {
    const saved = this.savedNames.has(img.name);
    const at = this.items.findIndex((i) => i.name === img.name);
    const hasNext = at + 1 < this.items.length || this.items.length < this.total;
    return html`
      <div class="overlay" @click=${(e: Event) => { if (e.target === e.currentTarget) this.expanded = null; }}>
        <div class="viewer">
          <div class="stage">
            <img src=${api.galleryFullURL(img.name)} alt="Generated image"
              @contextmenu=${(e: MouseEvent) => this.openImageMenu(img, e)} />
            <button class="nav prev" title="Previous (←)" ?disabled=${at <= 0} @click=${() => this.step(-1)}>
              <span class="material-symbols-rounded">chevron_left</span></button>
            <button class="nav next" title="Next (→)" ?disabled=${!hasNext} @click=${() => this.step(1)}>
              <span class="material-symbols-rounded">chevron_right</span></button>
          </div>
          ${this.renderInfo(img, at)}
        </div>
        <div class="overlay-actions">
          <button class="obtn primary" ?disabled=${this.busy || saved} @click=${() => this.saveToLibrary(img)}
            title=${this.own ? "Move it into the library; it leaves the gallery" : "Copy it into the library"}>
            <span class="material-symbols-rounded" style="font-size:17px;">${saved ? "check" : "save"}</span>
            ${saved ? "In library" : this.own ? "Move to library" : "Save to library"}
          </button>
          ${this.isFolder(this.board) ? html`<button class="obtn" title="Show it on this folder's card" @click=${() => void this.setFolderCover(img)}>
            <span class="material-symbols-rounded" style="font-size:17px;">folder_special</span> Folder cover
          </button>` : nothing}
          ${this.canSetCovers ? html`<button class="obtn" title="Make it a LoRA's or a model's cover" @click=${() => this.openCover(img)}>
            <span class="material-symbols-rounded" style="font-size:17px;">photo_library</span> Use as cover
          </button>` : nothing}
          <button class="obtn" ?disabled=${this.busy}
            @click=${(e: MouseEvent) => void this.openShareMenu(img, e.clientX, e.clientY)}>
            <span class="material-symbols-rounded" style="font-size:17px;">forum</span> Send to chat
          </button>
          <button class="obtn" title="Start the next picture from this one" @click=${() => this.usePicture(img, "img2img")}>
            <span class="material-symbols-rounded" style="font-size:17px;">add_photo_alternate</span> Start from
          </button>
          ${this.canPaint ? html`<button class="obtn" title="Paint over a part to redo it" @click=${() => this.usePicture(img, "inpaint")}>
            <span class="material-symbols-rounded" style="font-size:17px;">brush</span> Paint to fix
          </button>` : nothing}
          ${this.canFixFaces ? html`<button class="obtn" title="Redo it with ADetailer's passes, and nothing else" @click=${() => this.usePicture(img, "faces")}>
            <span class="material-symbols-rounded" style="font-size:17px;">face_retouching_natural</span> ${this.fixLabel}
          </button>` : nothing}
          ${this.upscaleLabel ? html`<button class="obtn" title="Enlarge it without redrawing; the copy lands in the gallery" @click=${() => this.usePicture(img, "upscale")}>
            <span class="material-symbols-rounded" style="font-size:17px;">open_in_full</span> ${this.upscaleLabel}
          </button>` : nothing}
          <button class="obtn" @click=${() => this.dispatchEvent(new CustomEvent("cut-out", {
            detail: { url: api.galleryFullURL(img.name), name: img.name }, bubbles: true, composed: true,
          }))}>
            <span class="material-symbols-rounded" style="font-size:17px;">background_replace</span> Cut out
          </button>
          <button class="obtn" ?disabled=${this.busy} @click=${() => void this.exportImage(img)}>
            <span class="material-symbols-rounded" style="font-size:17px;">download</span> Export for Civitai
          </button>
          <button class="obtn danger" ?disabled=${this.busy} @click=${() => this.deleteImage(img)}>
            <span class="material-symbols-rounded" style="font-size:17px;">delete</span> Delete
          </button>
          <button class="obtn" @click=${() => (this.expanded = null)}>
            <span class="material-symbols-rounded" style="font-size:17px;">close</span> Close
          </button>
        </div>
      </div>
    `;
  }

  private copyButton(img: GalleryImage, field: "prompt" | "negativePrompt") {
    return html`<button class="copy-k" title=${field === "prompt" ? "Copy the prompt" : "Copy the negative prompt"}
      @click=${() => void this.copyField(img, field)}>
      <span class="material-symbols-rounded">content_copy</span> Copy
    </button>`;
  }

  /** Which LoRA (or the model) the open picture is to be the cover of. */
  private renderCoverPicker(img: GalleryImage, info: GenInfo | null) {
    const { used, rest } = this.coverChoices(info);
    const model = info?.model;
    return html`<div class="cover-pick">
      <div class="k">Use as the cover of</div>
      <select class="board-select" aria-label="Cover of" .value=${this.coverFor}
        @change=${(e: Event) => (this.coverFor = (e.target as HTMLSelectElement).value)}>
        <option value="" ?selected=${!this.coverFor}>Choose a LoRA…</option>
        ${used.length ? html`<optgroup label="Made with">
          ${used.map((n) => html`<option value=${n} ?selected=${n === this.coverFor}>${n}</option>`)}
        </optgroup>` : nothing}
        ${model ? html`<optgroup label="Its model">
          <option value=${`model:${model}`} ?selected=${this.coverFor === `model:${model}`}>${model}</option>
        </optgroup>` : nothing}
        ${rest.length ? html`<optgroup label="Every LoRA">
          ${rest.map((n) => html`<option value=${n} ?selected=${n === this.coverFor}>${n}</option>`)}
        </optgroup>` : nothing}
      </select>
      <div class="acts">
        <button ?disabled=${this.busy || !this.coverFor} @click=${() => void this.setCover(img)}>
          <span class="material-symbols-rounded" style="font-size:15px;">check</span> Set cover
        </button>
        <button @click=${() => (this.coverOpen = false)}>Cancel</button>
      </div>
    </div>`;
  }

  /** The open picture's settings, read from the generator's record of it. */
  private renderInfo(img: GalleryImage, at: number) {
    const i = this.info;
    const size = img.width && img.height ? `${img.width}×${img.height}` : i?.width ? `${i.width}×${i.height}` : "";
    const when = img.created ? new Date(img.created).toLocaleString() : "";
    return html`<div class="meta">
      <h4>${this.labelOf(img)}<small>${at + 1} of ${this.total}</small></h4>
      ${this.coverOpen ? this.renderCoverPicker(img, i) : nothing}
      ${!i
        ? html`<div class="note">${this.infoError || "Reading its settings…"}</div>`
        : html`
            ${i.prompt ? html`<div><div class="k">Prompt ${this.copyButton(img, "prompt")}</div><div class="prompt">${i.prompt}</div></div>` : html`<div class="note">No generation settings were saved with this picture.</div>`}
            ${i.negativePrompt ? html`<div><div class="k">Negative ${this.copyButton(img, "negativePrompt")}</div><div class="prompt">${i.negativePrompt}</div></div>` : nothing}
            <dl>
              ${i.model ? html`<dt>Model</dt><dd>${i.model}</dd>` : nothing}
              ${i.seed ? html`<dt>Seed</dt><dd>${i.seed}</dd>` : nothing}
              ${i.steps ? html`<dt>Steps</dt><dd>${i.steps}</dd>` : nothing}
              ${i.cfgScale ? html`<dt>CFG</dt><dd>${i.cfgScale}</dd>` : nothing}
              ${i.sampler ? html`<dt>Sampler</dt><dd>${i.sampler}</dd>` : nothing}
              ${i.clipSkip ? html`<dt>Clip skip</dt><dd>${i.clipSkip}</dd>` : nothing}
              ${i.loras.length ? html`<dt>LoRAs</dt><dd>${i.loras.map((l) => `${l.name} ${l.weight}`).join(", ")}</dd>` : nothing}
              ${size ? html`<dt>Size</dt><dd>${size}</dd>` : nothing}
              ${img.size ? html`<dt>File</dt><dd>${img.size < 1048576 ? `${Math.max(1, Math.round(img.size / 1024))} KB` : `${(img.size / 1048576).toFixed(1)} MB`}</dd>` : nothing}
              ${when ? html`<dt>Made</dt><dd>${when}</dd>` : nothing}
            </dl>
            ${i.prompt
              ? html`<div class="acts">
                  <button @click=${() => void this.reuseMetadata(img)}><span class="material-symbols-rounded" style="font-size:15px;">replay</span> Use these settings</button>
                  <button title="Copy everything, as A1111 writes it" @click=${() => void this.copyMetadata(img)}><span class="material-symbols-rounded" style="font-size:15px;">content_copy</span> Copy all</button>
                </div>`
              : nothing}`}
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oppai-invoke-gallery": OppaiInvokeGallery;
  }
}
