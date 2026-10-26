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

const PAGE = 40;

/**
 * The generator's gallery panel: every image the generator itself has kept. On
 * InvokeAI that is its own gallery, sorted into boards; on Automatic1111 it is the
 * outputs folder, read by the server (imagegen/a1111_gallery.go), with a board for
 * each folder A1111 writes into. Browse it in any order, open a picture with its
 * settings beside it and step through the rest, copy one into the library, or
 * delete it from the generator. Boards can be made and filed into on InvokeAI only.
 *
 * The host view calls refresh() after a generation so new images appear without
 * a manual reload.
 */

const SORTS: { id: GallerySort; label: string; a1111Only?: boolean }[] = [
  { id: "newest", label: "Newest first" },
  { id: "oldest", label: "Oldest first" },
  { id: "name", label: "By name", a1111Only: true },
  { id: "largest", label: "Largest first", a1111Only: true },
];
@customElement("oppai-invoke-gallery")
export class OppaiInvokeGallery extends LitElement {
  /** Whose gallery: InvokeAI's own, or A1111's outputs folder. */
  @property() backend: "invokeai" | "a1111" = "invokeai";
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
  /** Names saved to the library this session, so the button can say "Saved". */
  @state() private savedNames = new Set<string>();
  /** Multi-select mode: tiles become checkboxes and a toolbar acts on the set. */
  @state() private selecting = false;
  @state() private selected = new Set<string>();
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
      .boards {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
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
      .board {
        border: 1px solid var(--oppai-border-strong);
        background: transparent;
        color: var(--oppai-text-dim);
        border-radius: 999px;
        font: inherit;
        font-size: 12px;
        padding: 4px 10px;
        cursor: pointer;
      }
      .board.on {
        background: var(--oppai-accent);
        color: var(--oppai-on-accent);
        border-color: var(--oppai-accent);
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
      :host([workspace]) .boards { display: none; }
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
    void this.refresh();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("keydown", this.onKey);
  }

  /** Arrow keys step through the open picture's board; Escape closes it. */
  private onKey = (e: KeyboardEvent) => {
    if (!this.expanded) return;
    if (e.key === "ArrowLeft") this.step(-1);
    else if (e.key === "ArrowRight") this.step(1);
    else if (e.key === "Escape") this.expanded = null;
    else return;
    e.preventDefault();
  };

  private get a1111(): boolean {
    return this.backend === "a1111";
  }

  private labelOf(img: GalleryImage): string {
    return img.label || img.name;
  }

  /** Opens a picture and reads its settings for the side panel. */
  private open(img: GalleryImage) {
    this.expanded = img;
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
      this.dispatchEvent(new CustomEvent("boards-changed", { bubbles: true, composed: true }));
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
    if (!current || current.id === "none" || this.busy) return;
    if (!confirm(`Delete the “${current.name}” gallery? Its images move back to Uncategorized.`)) return;
    this.busy = true;
    this.error = "";
    try {
      await api.deleteGalleryBoard(current.id);
      const line = libbyReact("galleryDelete");
      mascotSay(line.message, "success", { emotion: line.emotion, intensity: line.intensity });
      this.board = "none";
      this.items = [];
      await this.refresh();
      this.dispatchEvent(new CustomEvent("boards-changed", { bubbles: true, composed: true }));
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.busy = false;
    }
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

  private async saveToLibrary(img: GalleryImage) {
    if (this.busy || this.savedNames.has(img.name)) return;
    this.busy = true;
    try {
      await api.saveGalleryImage({ name: img.name });
      this.savedNames = new Set(this.savedNames).add(img.name);
      this.dispatchEvent(new CustomEvent<LibbyItemFacts>("imported", {
        detail: { count: 1, kind: "image", title: img.name },
        bubbles: true, composed: true,
      }));
    } catch (e) {
      this.error = (e as Error).message;
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
        { label: "Copy generation metadata", icon: "content_copy", run: () => void this.copyMetadata(img) },
        { label: "Use same generation parameters", icon: "replay", run: () => void this.reuseMetadata(img) },
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
  }

  private toggleSelected(name: string) {
    const next = new Set(this.selected);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    this.selected = next;
  }

  private async deleteSelected() {
    const names = [...this.selected];
    if (!names.length || this.busy) return;
    this.busy = true;
    try {
      await api.deleteGalleryImages(names);
      const line = libbyReact("galleryDelete", { count: names.length });
      mascotSay(line.message, "success", { emotion: line.emotion, intensity: line.intensity });
      const gone = this.selected;
      this.items = this.items.filter((i) => !gone.has(i.name));
      this.total = Math.max(0, this.total - names.length);
      this.boards = this.boards.map((b) =>
        b.id === this.board ? { ...b, count: Math.max(0, b.count - names.length) } : b,
      );
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
      // The moved images leave the board we're viewing.
      const moved = this.selected;
      this.items = this.items.filter((i) => !moved.has(i.name));
      this.total = Math.max(0, this.total - names.length);
      this.selected = new Set();
      this.selecting = false;
      await this.refresh();
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.busy = false;
    }
  }

  render() {
    const current = this.boards.find((b) => b.id === this.board);
    return html`
      <div class="panel">
        <div class="head">
          <span class="material-symbols-rounded" style="font-size:18px;">photo_library</span>
          ${this.a1111 ? "A1111 outputs" : "Invoke gallery"}
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
              ${this.a1111 ? nothing : html`<select class="sel-move" aria-label="Move to gallery" .value=${""}
                ?disabled=${this.busy || !this.selected.size}
                @change=${(e: Event) => {
                  const el = e.target as HTMLSelectElement;
                  void this.addSelectedToBoard(el.value);
                  el.value = "";
                }}>
                <option value="">Add to gallery…</option>
                ${this.boards
                  .filter((b) => b.id !== this.board)
                  .map((b) => html`<option value=${b.id}>${b.name}</option>`)}
              </select>`}
              <button class="sel-del" ?disabled=${this.busy || !this.selected.size}
                @click=${() => this.deleteSelected()}>
                <span class="material-symbols-rounded" style="font-size:15px; vertical-align:-3px;">delete</span>
                Delete
              </button>
            </div>`
          : nothing}
        ${this.boards.length
          ? html`
              <div class="sort-row">
                <select class="board-select" aria-label="Gallery" .value=${this.board}
                  @change=${(e: Event) => this.pickBoard((e.target as HTMLSelectElement).value)}>
                  ${this.boards.map((b) => html`<option value=${b.id} ?selected=${b.id === this.board}>${b.name}${b.count ? ` · ${b.count}` : ""}</option>`)}
                </select>
                <select class="board-select" aria-label="Order" style="flex:none;width:auto;"
                  @change=${(e: Event) => this.pickSort((e.target as HTMLSelectElement).value as GallerySort)}>
                  ${SORTS.filter((s) => this.a1111 || !s.a1111Only).map((s) => html`<option value=${s.id} ?selected=${s.id === this.sort}>${s.label}</option>`)}
                </select>
              </div>
              ${this.boards.length <= 6 ? html`<div class="boards">
                ${this.boards.map(
                  (b) => html`<button class="board ${b.id === this.board ? "on" : ""}"
                    @click=${() => this.pickBoard(b.id)}>${b.name}${b.count ? ` · ${b.count}` : ""}</button>`,
                )}
              </div>` : nothing}
              ${this.board !== "none" && !this.a1111
                ? html`<button class="board-del" ?disabled=${this.busy}
                    title="Delete this gallery (its images move to Uncategorized)"
                    @click=${() => this.deleteBoard()}>
                    <span class="material-symbols-rounded" style="font-size:15px; vertical-align:-3px;">delete</span>
                    Delete gallery
                  </button>`
                : nothing}
            `
          : nothing}
        ${this.a1111
          ? html`<div class="note">What Automatic1111 saved to its outputs folder — each folder it writes into is a board.</div>`
          : html`<div class="note">New generations are filed into ${current?.name ?? "this gallery"}.</div>
            <div class="new-board">
              <input maxlength="300" placeholder="New Invoke gallery" .value=${this.newBoard}
                @input=${(e: Event) => (this.newBoard = (e.target as HTMLInputElement).value)}
                @keydown=${(e: KeyboardEvent) => { if (e.key === "Enter") void this.createBoard(); }} />
              <button ?disabled=${this.busy || !this.newBoard.trim()} @click=${() => this.createBoard()}>Create</button>
            </div>`}
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
                    @click=${() =>
                      this.selecting ? this.toggleSelected(img.name) : this.open(img)}
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
                          title=${this.a1111 ? "Delete from the outputs folder" : "Delete from InvokeAI"}
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
            : html`<div class="note">${this.a1111 ? "No pictures in this folder." : "Nothing here yet — generated images land in this gallery."}</div>`}
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
          <button class="obtn primary" ?disabled=${this.busy || saved} @click=${() => this.saveToLibrary(img)}>
            <span class="material-symbols-rounded" style="font-size:17px;">${saved ? "check" : "save"}</span>
            ${saved ? "In library" : "Save to library"}
          </button>
          <button class="obtn" ?disabled=${this.busy}
            @click=${(e: MouseEvent) => void this.openShareMenu(img, e.clientX, e.clientY)}>
            <span class="material-symbols-rounded" style="font-size:17px;">forum</span> Send to chat
          </button>
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

  /** The open picture's settings, read from the generator's record of it. */
  private renderInfo(img: GalleryImage, at: number) {
    const i = this.info;
    const size = img.width && img.height ? `${img.width}×${img.height}` : i?.width ? `${i.width}×${i.height}` : "";
    const when = img.created ? new Date(img.created).toLocaleString() : "";
    return html`<div class="meta">
      <h4>${this.labelOf(img)}<small>${at + 1} of ${this.total}</small></h4>
      ${!i
        ? html`<div class="note">${this.infoError || "Reading its settings…"}</div>`
        : html`
            ${i.prompt ? html`<div><div class="k">Prompt</div><div class="prompt">${i.prompt}</div></div>` : html`<div class="note">No generation settings were saved with this picture.</div>`}
            ${i.negativePrompt ? html`<div><div class="k">Negative</div><div class="prompt">${i.negativePrompt}</div></div>` : nothing}
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
                  <button @click=${() => void this.copyMetadata(img)}><span class="material-symbols-rounded" style="font-size:15px;">content_copy</span> Copy</button>
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
