import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import {
  api,
  mascotSay,
  type ComicInfo,
  type GamePlayInfo,
  type GameSave,
  type Media,
  type MediaTag,
} from "../api.js";
import { libbyReact } from "../libby-voice.js";
import { iconStyles, motionStyles } from "../theme.js";
import { profileUpdates } from "../ui-metrics.js";
import {
  KIND_META,
  KIND_ORDER,
  type ComicFit,
  swatchFor,
  statFor,
  isTypingTarget,
  formatTimecode,
  formatBytes,
  loadComicFit,
  saveComicFit,
  loadComicPage,
  saveComicPage,
} from "../media-meta.js";

// Inline single-item viewer, rendered inside the library content column (the
// app bar's back button closes it). Renders a kind-specific stage — video/GIF
// player, photo, comic reader, or game detail — plus shared metadata, the tag
// list, and the auto-tag action.
@customElement("oppai-viewer")
export class OppaiViewer extends LitElement {
  @property({ attribute: false }) media!: Media;
  @property({ type: Boolean }) favorite = false;
  /**
   * The run of items the viewer was opened from — the same list the arrow keys page
   * through. It's what the "up next" carousel under a video is made of; empty (or
   * one-long) and no carousel is drawn.
   */
  @property({ attribute: false }) queue: Media[] = [];

  @state() private full: Media | null = null;
  // Id of the tag whose detections are drawn on the video timeline, if any.
  @state() private activeTag: number | null = null;
  @state() private tagging = false;
  @state() private editing = false;
  @state() private saving = false;
  @state() private editTitle = "";
  @state() private editNotes = "";
  @state() private editKind: Media["kind"] = "image";
  @state() private editTags: string[] = [];
  @state() private newTag = "";
  @state() private screenshot = "";
  @state() private userGallery: Media[] = [];
  @state() private galleryUploading = false;

  // Save-file backup (games). Loaded alongside the gallery when a game is opened.
  @state() private saves: GameSave[] = [];
  @state() private saveUploading = false;
  @state() private saveError = "";

  // HTML5 builds. `play` stays null until the probe answers, so the Play button
  // appears once rather than flickering in for every game and then out again.
  @state() private play: GamePlayInfo | null = null;
  @state() private playing = false;

  // Poster picker (videos only). `posterFrames` is empty until the strip is asked
  // for — reading it costs a full decrypt of the video server-side, so it is never
  // fetched just because the edit form was opened.
  @state() private posterFrames: { at: number; image: string }[] = [];
  @state() private posterLoading = false;
  @state() private posterSaving = -1;
  @state() private posterChosen = -1;
  @state() private posterError = "";
  /** Cache-buster for the thumbnail URL, bumped once a new poster is stored. */
  @state() private posterVersion = 0;

  // Comic reader: null while the archive is being probed, then either a page
  // count to read or readable=false (a .cbr/.pdf we can't open in-app).
  @state() private comic: ComicInfo | null = null;
  @state() private page = 1;
  @state() private fit: ComicFit = loadComicFit();

  static styles = [
    iconStyles,
    motionStyles,
    css`
      :host {
        display: block;
      }
      .wrap {
        max-width: 1100px;
        margin: 0 auto;
        animation: oppai-fade-in-up 0.4s var(--oppai-ease-emphasized) both;
      }
      .round-btn,
      .icon-round,
      .btn-primary,
      .btn-outline {
        transition: transform 0.18s var(--oppai-ease-spring), filter 0.15s ease,
          background 0.2s ease;
      }
      .round-btn:hover:not([disabled]),
      .icon-round:hover,
      .btn-outline:hover {
        transform: translateY(-1px);
        filter: brightness(1.08);
      }
      .btn-primary:hover {
        transform: translateY(-1px);
        filter: brightness(1.05);
      }
      .btn-primary:active,
      .btn-outline:active,
      .icon-round:active {
        transform: scale(0.96);
      }
      .stage {
        border-radius: 20px;
        overflow: hidden;
        position: relative;
      }
      .stage video {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: contain;
        background: #000;
      }
      .video-stage { margin-inline: auto; max-height: 76vh; }
      /* Photos and GIFs are laid out around the image rather than inside a fixed
         frame: the picture keeps its own aspect ratio and the container shrinks
         to it, so nothing is letterboxed and no filler bars are drawn. */
      .stage-fit {
        display: flex;
        justify-content: center;
      }
      .stage-fit img {
        display: block;
        width: auto;
        height: auto;
        max-width: 100%;
        max-height: 76vh;
        border-radius: 20px;
      }
      .placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 8px;
        color: #fff;
      }
      .mono {
        font: 600 12px ui-monospace, monospace;
        color: var(--oppai-text-dim);
        letter-spacing: 1px;
      }

      /* Comic reader */
      .reader {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
      }
      .reader-stage {
        position: relative;
        width: 100%;
        display: flex;
        justify-content: center;
        min-height: 240px;
      }
      .page-img {
        display: block;
        width: auto;
        height: auto;
        border-radius: 12px;
      }
      .page-img.fit-page {
        max-width: 100%;
        max-height: 74vh;
      }
      .page-img.fit-width {
        width: 100%;
        max-width: 1000px;
      }
      /* Click the left/right of the page to turn it, like any reader. The zones
         sit over the image and only show their chevron on hover. */
      .turn {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 30%;
        border: none;
        background: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.18s ease;
      }
      .turn:hover:not([disabled]) {
        opacity: 1;
      }
      .turn[disabled] {
        cursor: default;
      }
      .turn.prev {
        left: 0;
        justify-content: flex-start;
      }
      .turn.next {
        right: 0;
        justify-content: flex-end;
      }
      .turn span {
        background: rgba(0, 0, 0, 0.45);
        border-radius: 50%;
        padding: 8px;
        color: #fff;
        backdrop-filter: blur(2px);
      }
      .reader-bar {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        max-width: 640px;
      }
      .reader-bar input[type="range"] {
        flex: 1;
        accent-color: var(--oppai-primary);
      }
      .reader-fallback {
        width: 340px;
        max-width: 60vw;
        aspect-ratio: 2 / 3;
        border-radius: 16px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 8px;
        text-align: center;
        padding: 0 20px;
      }
      .round-btn {
        width: 44px;
        height: 44px;
        border-radius: 22px;
        background: var(--oppai-surface-2);
        border: none;
        color: var(--oppai-text);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        flex-shrink: 0;
      }
      .game {
        display: flex;
        gap: 32px;
        flex-wrap: wrap;
      }
      .game-cover {
        width: 260px;
        aspect-ratio: 3 / 4;
        border-radius: 20px;
        overflow: hidden;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .game h2 {
        font-size: 26px;
        font-weight: 500;
        margin: 0 0 8px;
      }
      .sub {
        font-size: 13px;
        color: var(--oppai-text-muted);
        margin-bottom: 18px;
      }
      .actions {
        display: flex;
        gap: 12px;
        margin-bottom: 20px;
        flex-wrap: wrap;
      }
      .btn-primary {
        height: 44px;
        padding: 0 24px;
        border-radius: 22px;
        background: var(--oppai-primary);
        color: var(--oppai-on-primary);
        border: none;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        text-decoration: none;
      }
      .btn-outline {
        height: 44px;
        padding: 0 20px;
        border-radius: 22px;
        background: none;
        color: var(--oppai-text);
        border: 1px solid var(--oppai-border-strong);
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .desc {
        font-size: 14px;
        line-height: 1.6;
        color: var(--oppai-text-dim);
        max-width: 640px;
      }
      .meta {
        margin-top: 24px;
      }
      .meta-head {
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .meta-title {
        font-size: 24px;
        font-weight: 500;
        margin: 0;
        flex: 1;
      }
      .icon-round {
        width: 44px;
        height: 44px;
        border-radius: 22px;
        background: var(--oppai-surface-2);
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }
      .chips {
        display: flex;
        gap: 8px;
        margin-top: 14px;
        flex-wrap: wrap;
      }
      .chip {
        font-size: 12px;
        font-weight: 500;
        padding: 6px 14px;
        border-radius: 14px;
      }
      .chip-accent {
        background: var(--oppai-accent);
        color: var(--oppai-on-accent);
      }
      .chip-muted {
        background: var(--oppai-surface-2);
        color: var(--oppai-text-dim);
      }
      /* A tag whose detections can be shown on the timeline. */
      button.chip {
        border: none;
        font: inherit;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        transition: background 0.18s ease, color 0.18s ease, transform 0.18s var(--oppai-ease-spring);
      }
      button.chip:hover {
        transform: translateY(-1px);
      }
      button.chip.on {
        background: var(--oppai-accent);
        color: var(--oppai-on-accent);
      }

      /* Timeline of AI detections for the selected tag. */
      .timeline {
        margin-top: 12px;
        animation: oppai-fade-in 0.3s var(--oppai-ease-standard) both;
      }
      .rail {
        position: relative;
        height: 22px;
        border-radius: 11px;
        background: var(--oppai-surface-2);
        overflow: hidden;
      }
      .marker {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 8px;
        margin-left: -4px; /* centre the marker on its timestamp */
        padding: 0;
        border: none;
        border-radius: 4px;
        background: var(--oppai-accent);
        cursor: pointer;
        transition: transform 0.15s var(--oppai-ease-spring), filter 0.15s ease;
      }
      .marker:hover,
      .marker:focus-visible {
        transform: scaleX(1.6);
        filter: brightness(1.2);
        outline: none;
      }
      .rail-legend {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: var(--oppai-text-muted);
        margin-top: 8px;
      }
      .meta-note {
        font-size: 12px;
        color: var(--oppai-text-muted);
        margin-top: 12px;
      }

      /* Edit form */
      .edit {
        margin-top: 20px;
        display: flex;
        flex-direction: column;
        gap: 14px;
        max-width: 560px;
      }
      .edit label {
        font-size: 12px;
        font-weight: 600;
        color: var(--oppai-text-dim);
        display: block;
        margin-bottom: 6px;
      }
      .edit input,
      .edit textarea,
      .edit select {
        width: 100%;
        box-sizing: border-box;
        background: var(--oppai-surface-2);
        border: 1px solid var(--oppai-border-strong);
        border-radius: 12px;
        color: var(--oppai-text);
        font: inherit;
        font-size: 14px;
        padding: 10px 12px;
        outline: none;
      }
      .edit input:focus,
      .edit textarea:focus,
      .edit select:focus {
        border-color: var(--oppai-primary);
      }
      .edit textarea {
        resize: vertical;
        min-height: 72px;
      }
      .tag-edit {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        align-items: center;
      }
      .tag-pill {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: var(--oppai-surface-2);
        color: var(--oppai-text-dim);
        border-radius: 14px;
        padding: 6px 8px 6px 12px;
        font-size: 12px;
        font-weight: 500;
      }
      .tag-pill button {
        background: none;
        border: none;
        color: var(--oppai-text-muted);
        cursor: pointer;
        display: flex;
        padding: 0;
      }
      .tag-add {
        flex: 1;
        min-width: 120px;
      }
      .edit-actions {
        display: flex;
        gap: 10px;
        margin-top: 4px;
      }
      /* Poster picker: the current thumbnail, and a horizontal strip of candidate
         frames laid out in time order so it reads as a timeline you scrub. */
      .poster-picker {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .poster-head {
        display: flex;
        gap: 12px;
        align-items: center;
      }
      .poster-current {
        width: 108px;
        aspect-ratio: 16 / 9;
        object-fit: cover;
        border-radius: 8px;
        background: var(--oppai-surface-2, rgba(255, 255, 255, 0.05));
      }
      .poster-copy {
        display: flex;
        flex-direction: column;
        gap: 8px;
        align-items: flex-start;
        font-size: 13px;
        color: var(--oppai-text-muted);
      }
      .poster-error {
        font-size: 12px;
        color: var(--oppai-danger, #ff6b6b);
      }
      .poster-strip {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        padding-bottom: 6px;
        scroll-snap-type: x proximity;
      }
      .poster-frame {
        flex: 0 0 auto;
        position: relative;
        width: 132px;
        padding: 0;
        border: 2px solid transparent;
        border-radius: 10px;
        overflow: hidden;
        background: none;
        cursor: pointer;
        scroll-snap-align: start;
        transition: border-color 0.12s;
      }
      .poster-frame:hover:not(:disabled) { border-color: var(--oppai-border-strong); }
      .poster-frame.on { border-color: var(--oppai-accent); }
      .poster-frame:disabled { cursor: default; opacity: 0.6; }
      .poster-frame img {
        display: block;
        width: 100%;
        aspect-ratio: 16 / 9;
        object-fit: cover;
      }
      /* The timestamp sits on the frame: it is what tells you where in the video you
         are looking, and a strip of unlabelled stills is a guessing game. */
      .poster-time {
        position: absolute;
        right: 4px;
        bottom: 4px;
        background: rgba(0, 0, 0, 0.66);
        color: #fff;
        font-size: 11px;
        padding: 1px 5px;
        border-radius: 5px;
      }
      /* "Up next" — the rest of the queue as a scrubbable strip under the player.
         The gap is deliberately larger than it looks like it needs to be: the
         player's control bar is drawn *inside* the video, along its bottom edge, so
         the strip's top edge and the scrubber are only ever this far apart. At 14px
         reaching for the scrubber meant crossing the tiles — and the tiles lifted on
         hover, into the very gap you were aiming through. Hence both the clearance
         and the lift being a scale rather than a translate. */
      .upnext {
        margin-top: 32px;
      }
      .upnext-label {
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.4px;
        text-transform: uppercase;
        color: var(--oppai-text-muted);
        margin-bottom: 8px;
      }
      .strip {
        display: flex;
        gap: 10px;
        overflow-x: auto;
        scroll-snap-type: x proximity;
        padding-bottom: 6px;
        scrollbar-width: thin;
      }
      .strip-item {
        position: relative;
        flex: 0 0 auto;
        width: 140px;
        aspect-ratio: 16 / 10;
        border: 2px solid transparent;
        border-radius: 12px;
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
      .strip-item img,
      .strip-blank {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .strip-play {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        font-size: 30px;
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
      /* A phone held sideways has room for the film, not a second filmstrip. The
         queue remains intact for arrow/swipe navigation and returns in portrait;
         only its visual chrome is suppressed. */
      @media (orientation: landscape) and (max-height: 600px) {
        .upnext { display: none; }
        .video-stage { max-height: calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom)); }
      }

      /* Game gallery */
      .shots {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 10px;
        margin-top: 18px;
        max-width: 640px;
      }
      .shot {
        border: 0;
        padding: 0;
        background: none;
        cursor: zoom-in;
      }
      .shots img {
        width: 100%;
        aspect-ratio: 16 / 9;
        object-fit: cover;
        border-radius: 10px;
        background: var(--oppai-surface-2);
      }
      .shot-lightbox {
        position: fixed;
        inset: 0;
        z-index: 100;
        display: grid;
        place-items: center;
        padding: 24px;
        border: 0;
        background: rgba(0, 0, 0, 0.92);
        cursor: zoom-out;
      }
      .shot-lightbox img {
        display: block;
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }
      .gallery-upload { margin-top:12px; display:inline-flex; align-items:center; gap:6px; cursor:pointer; }
      .user-shot { position:relative; }
      .user-shot video { width:100%; height:100%; object-fit:cover; background:#000; }
      .remove-shot { position:absolute; right:4px; top:4px; border:0; border-radius:50%; color:#fff;
        background:rgba(0,0,0,.7); width:26px; height:26px; cursor:pointer; }

      /* Save files */
      .saves { margin-top:10px; max-width:640px; display:flex; flex-direction:column; gap:6px; }
      .save-row {
        display:flex; align-items:center; gap:10px;
        padding:8px 10px; border-radius:10px; background:var(--oppai-surface-2);
      }
      .save-name { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .save-meta { color:var(--oppai-text-dim); font-size:12px; white-space:nowrap; }
      .save-act {
        border:0; background:none; cursor:pointer; color:var(--oppai-text-dim);
        display:inline-flex; align-items:center; padding:4px; border-radius:8px;
      }
      .save-act:hover { color:var(--oppai-text); background:rgba(255,255,255,.08); }
      .save-empty { color:var(--oppai-text-dim); font-size:13px; margin-top:8px; }
      .save-error { color:var(--oppai-danger, #ff6b6b); font-size:13px; margin-top:8px; }

      /* HTML5 game player */
      .play-stage {
        position:relative; margin-top:14px; width:100%; max-width:960px;
        aspect-ratio:16 / 9; border-radius:12px; overflow:hidden;
        background:#000; border:1px solid var(--oppai-surface-2);
      }
      .play-stage iframe { width:100%; height:100%; border:0; display:block; background:#000; }
      .play-close {
        position:absolute; right:8px; top:8px; z-index:2;
        border:0; border-radius:50%; width:32px; height:32px; cursor:pointer;
        color:#fff; background:rgba(0,0,0,.75);
      }
      .play-note { color:var(--oppai-text-dim); font-size:12px; margin-top:6px; max-width:640px; }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    profileUpdates(this, "viewer");
    this.loadItem();
    window.addEventListener("keydown", this.onKey);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("keydown", this.onKey);
    this.clearMediaSession();
  }

  // Re-fetch when the shell swaps in a different item without remounting.
  updated(changed: Map<string, unknown>) {
    if (changed.has("media")) {
      const prev = changed.get("media") as Media | undefined;
      if (prev && prev.id !== this.media.id) {
        this.editing = false;
        this.activeTag = null;
        this.loadItem();
      }
    }
    if (changed.has("media") || changed.has("queue")) this.centerCurrentInQueue();
    // (Re)bind OS/hardware media controls to whatever video is now on stage.
    this.setupMediaSession();
  }

  /** Keep the playing video in view with its neighbours on both sides.
   *
   * The queue is intentionally left in navigation order; moving scrollLeft rather
   * than reordering it means “previous” stays on the left and “next” on the right.
   */
  private centerCurrentInQueue() {
    const strip = this.renderRoot.querySelector<HTMLElement>(".upnext .strip");
    const current = strip?.querySelector<HTMLElement>(".strip-item.on");
    if (!strip || !current) return;
    strip.scrollLeft = Math.max(0, current.offsetLeft - (strip.clientWidth - current.offsetWidth) / 2);
  }

  // Fetch the full record (tags, notes) and, for a comic, probe its archive.
  private loadItem() {
    const m = this.media;
    this.full = m;
    api
      .getMedia(m.id)
      .then((x) => (this.full = x))
      .catch(() => (this.full = m));
    this.comic = null;
    if (m.kind === "comic") this.loadComic(m.id);
    this.userGallery = [];
    this.saves = [];
    this.saveError = "";
    this.play = null;
    this.playing = false;
    if (m.kind === "game") {
      void this.loadGameGallery(m.id);
      void this.loadSaves(m.id);
      void this.probePlayable(m.id);
    }
  }

  private async loadSaves(id: number) {
    try {
      const result = await api.gameSaves(id);
      if (this.media.id === id) this.saves = result.items;
    } catch {
      if (this.media.id === id) this.saves = [];
    }
  }

  /** A 404 here is the normal answer for a game that is only a download, so it is
   *  a "no", not an error worth showing. */
  private async probePlayable(id: number) {
    try {
      const info = await api.gamePlayInfo(id);
      if (this.media.id === id) this.play = info.playable ? info : null;
    } catch {
      if (this.media.id === id) this.play = null;
    }
  }

  private async uploadSave(e: Event, gameID: number) {
    const input = e.target as HTMLInputElement;
    const files = [...(input.files ?? [])];
    input.value = "";
    if (!files.length || this.saveUploading) return;
    this.saveUploading = true;
    this.saveError = "";
    try {
      for (const file of files) {
        const created = await api.uploadGameSave(gameID, file);
        // Newest first, matching the order the server lists them in.
        this.saves = [created, ...this.saves];
      }
    } catch (err) {
      this.saveError = err instanceof Error ? err.message : "Couldn't upload that save.";
    } finally {
      this.saveUploading = false;
    }
  }

  private async deleteSave(gameID: number, saveID: number) {
    try {
      await api.deleteGameSave(gameID, saveID);
      this.saves = this.saves.filter((s) => s.id !== saveID);
    } catch (err) {
      this.saveError = err instanceof Error ? err.message : "Couldn't delete that save.";
    }
  }

  private async loadGameGallery(id: number) {
    try {
      const result = await api.gameGallery(id);
      if (this.media.id === id) this.userGallery = result.items;
    } catch { this.userGallery = []; }
  }

  private async uploadGameGallery(e: Event, gameID: number) {
    const input = e.target as HTMLInputElement;
    const files = [...(input.files ?? [])]; input.value = "";
    if (!files.length || this.galleryUploading) return;
    this.galleryUploading = true;
    try {
      for (const file of files) this.userGallery = [...this.userGallery, await api.uploadGameGallery(gameID, file)];
    } finally { this.galleryUploading = false; }
  }

  private async removeGameGallery(gameID: number, mediaID: number) {
    await api.removeGameGallery(gameID, mediaID);
    this.userGallery = this.userGallery.filter((item) => item.id !== mediaID);
  }

  // --- Comic reader -------------------------------------------------------
  private async loadComic(id: number) {
    try {
      const info = await api.comicInfo(id);
      // A slow probe can land after the user has already paged to another item.
      if (this.media.id !== id) return;
      this.comic = info;
      if (info.readable && info.pages > 0) {
        this.page = Math.min(Math.max(loadComicPage(id), 1), info.pages);
        this.preloadPage(id, this.page + 1);
      }
    } catch (e) {
      if (this.media.id !== id) return;
      this.comic = { readable: false, pages: 0, reason: (e as Error).message };
    }
  }

  // Warm the next page so a page turn is instant. The browser cache does the
  // rest — pages are immutable, so flipping back is free too.
  private preloadPage(id: number, n: number) {
    if (!this.comic?.readable || n < 1 || n > this.comic.pages) return;
    new Image().src = api.pageURL(id, n);
  }

  private goPage(n: number) {
    if (!this.comic?.readable) return;
    const m = this.full ?? this.media;
    const next = Math.min(Math.max(n, 1), this.comic.pages);
    if (next === this.page) return;
    this.page = next;
    saveComicPage(m.id, next);
    this.preloadPage(m.id, next + 1);
    // In width-fit the page is taller than the viewport; start the new one at
    // its top rather than wherever the last one was scrolled to.
    if (this.fit === "width") {
      this.renderRoot.querySelector(".reader-stage")?.scrollIntoView({ block: "start" });
    }
  }

  private setFit(fit: ComicFit) {
    this.fit = fit;
    saveComicFit(fit);
  }

  private videoEl(): HTMLVideoElement | null {
    return this.renderRoot?.querySelector("video") ?? null;
  }

  // Keyboard shortcuts for the stage. On a video, arrow keys are intentionally
  // left to the library shell (they page between items — see library.ts) and
  // seeking uses j/l plus the on-screen scrubber. In a comic they turn pages
  // instead, and the shell stands down for comics.
  private onKey = (e: KeyboardEvent) => {
    if (isTypingTarget(e)) return;
    const m = this.full ?? this.media;
    if (m.kind === "comic") {
      this.onComicKey(e);
      return;
    }
    if (m.kind !== "video") return;
    const v = this.videoEl();
    if (!v) return;
    switch (e.key) {
      case " ":
      case "k":
        e.preventDefault();
        v.paused ? void v.play() : v.pause();
        break;
      case "j":
        v.currentTime = Math.max(0, v.currentTime - 10);
        break;
      case "l":
        v.currentTime = Math.min(v.duration || Infinity, v.currentTime + 10);
        break;
      case "m":
        v.muted = !v.muted;
        break;
      case "f":
        e.preventDefault();
        if (document.fullscreenElement) void document.exitFullscreen();
        else void v.requestFullscreen?.();
        break;
    }
  };

  private onComicKey(e: KeyboardEvent) {
    if (!this.comic?.readable) return;
    switch (e.key) {
      case "ArrowRight":
      case "PageDown":
      case " ":
        e.preventDefault();
        this.goPage(this.page + 1);
        break;
      case "ArrowLeft":
      case "PageUp":
        e.preventDefault();
        this.goPage(this.page - 1);
        break;
      case "Home":
        e.preventDefault();
        this.goPage(1);
        break;
      case "End":
        e.preventDefault();
        this.goPage(this.comic.pages);
        break;
    }
  }

  private emitNavigate(dir: number) {
    this.dispatchEvent(
      new CustomEvent("navigate", { detail: { dir }, bubbles: true, composed: true }),
    );
  }

  // Wire the current video to the OS media-session (lock screen / hardware media
  // keys / notification transport). Prev/next-track page through the library.
  private setupMediaSession() {
    const m = this.full ?? this.media;
    if (m.kind !== "video" || !("mediaSession" in navigator)) return;
    const v = this.videoEl();
    if (!v) return;
    const ms = navigator.mediaSession;
    try {
      ms.metadata = new MediaMetadata({ title: m.title, artist: "OppaiLib" });
    } catch {
      /* MediaMetadata unavailable */
    }
    const set = (a: MediaSessionAction, h: MediaSessionActionHandler | null) => {
      try {
        ms.setActionHandler(a, h);
      } catch {
        /* unsupported action on this platform */
      }
    };
    set("play", () => void v.play());
    set("pause", () => v.pause());
    set("seekbackward", (d) => {
      v.currentTime = Math.max(0, v.currentTime - (d.seekOffset ?? 10));
    });
    set("seekforward", (d) => {
      v.currentTime = Math.min(v.duration || Infinity, v.currentTime + (d.seekOffset ?? 10));
    });
    set("seekto", (d) => {
      if (d.seekTime != null) v.currentTime = d.seekTime;
    });
    set("previoustrack", () => this.emitNavigate(-1));
    set("nexttrack", () => this.emitNavigate(1));
  }

  private clearMediaSession() {
    if (!("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    const actions: MediaSessionAction[] = [
      "play",
      "pause",
      "seekbackward",
      "seekforward",
      "seekto",
      "previoustrack",
      "nexttrack",
    ];
    for (const a of actions) {
      try {
        ms.setActionHandler(a, null);
      } catch {
        /* ignore */
      }
    }
    ms.metadata = null;
  }

  private toggleFav() {
    this.dispatchEvent(new CustomEvent("toggle-favorite", { bubbles: true, composed: true }));
  }

  private async retag() {
    this.tagging = true;
    try {
      const res = await api.autotag(this.media.id);
      if (this.full) this.full = { ...this.full, tags: res.tags };
      // The previous run's moments are gone; a stale selection would point at a
      // tag id that no longer carries a timeline.
      this.activeTag = null;
      this.dispatchEvent(new CustomEvent("changed", { bubbles: true, composed: true }));
      mascotSay(res.tags.length ? `Tags refreshed — ${res.tags.length} found.` : "Tagging finished, but nothing cleared your confidence threshold.", "success");
    } catch (e) {
      console.error("autotag", e);
      mascotSay(`Auto-tagging failed: ${(e as Error).message}`, "error");
    } finally {
      this.tagging = false;
    }
  }

  // --- Tag timeline -------------------------------------------------------
  // The AI records which sampled frames each tag appeared in. For a video whose
  // duration we know, those offsets can be drawn on a rail beneath the player,
  // so clicking a tag answers "where does this actually happen?" and clicking a
  // marker jumps there.
  private hasTimeline(t: MediaTag): boolean {
    const m = this.full ?? this.media;
    return m.kind === "video" && !!m.duration && !!t.moments?.length;
  }

  private toggleTagTimeline(t: MediaTag) {
    if (!this.hasTimeline(t)) return;
    this.activeTag = this.activeTag === t.id ? null : t.id;
  }

  private seekTo(seconds: number) {
    const v = this.videoEl();
    if (!v) return;
    v.currentTime = seconds;
    void v.play();
  }

  private renderTimeline(m: Media) {
    if (m.kind !== "video" || !m.duration) return nothing;
    const tag = (m.tags ?? []).find((t) => t.id === this.activeTag);
    if (!tag?.moments?.length) return nothing;
    const duration = m.duration;
    return html`
      <div class="timeline">
        <div class="rail">
          ${tag.moments.map(
            (t) => html`<button
              class="marker"
              style="left:${Math.min(100, (t / duration) * 100)}%"
              title="Jump to ${formatTimecode(t)}"
              aria-label="Jump to ${formatTimecode(t)}"
              @click=${() => this.seekTo(t)}
            ></button>`,
          )}
        </div>
        <div class="rail-legend">
          <span class="material-symbols-rounded" style="font-size:16px;">auto_awesome</span>
          <span
            >“${tag.name}” detected at ${tag.moments.map((t) => formatTimecode(t)).join(", ")} — click a
            marker to jump.</span
          >
        </div>
      </div>
    `;
  }

  // --- Edit / delete ------------------------------------------------------
  private startEdit() {
    const m = this.full ?? this.media;
    this.editTitle = m.title;
    this.editNotes = m.notes ?? "";
    this.editKind = m.kind;
    this.editTags = (m.tags ?? []).map((t) => t.name);
    this.newTag = "";
    this.editing = true;
  }
  private cancelEdit = () => {
    this.editing = false;
  };
  private removeEditTag(name: string) {
    this.editTags = this.editTags.filter((t) => t !== name);
  }
  private commitNewTag() {
    const t = this.newTag.trim();
    if (t && !this.editTags.includes(t)) this.editTags = [...this.editTags, t];
    this.newTag = "";
  }
  private onTagKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      this.commitNewTag();
    }
  }
  private async saveEdit() {
    const m = this.full ?? this.media;
    this.commitNewTag();
    const orig = (m.tags ?? []).map((t) => t.name);
    const addTags = this.editTags.filter((t) => !orig.includes(t));
    const removeTags = orig.filter((t) => !this.editTags.includes(t));
    this.saving = true;
    try {
      const updated = await api.updateMedia(m.id, {
        title: this.editTitle,
        notes: this.editNotes,
        kind: this.editKind,
        addTags,
        removeTags,
      });
      this.full = updated;
      this.editing = false;
      this.dispatchEvent(new CustomEvent("changed", { bubbles: true, composed: true }));
    } catch (e) {
      console.error("save edit", e);
    } finally {
      this.saving = false;
    }
  }
  private async doDelete() {
    const m = this.full ?? this.media;
    if (!confirm(`Delete "${m.title}"? This cannot be undone.`)) return;
    try {
      await api.deleteMedia(m.id);
      const line = libbyReact("libraryDelete");
      mascotSay(line.message, "success", { emotion: line.emotion, intensity: line.intensity });
      this.dispatchEvent(new CustomEvent("deleted", { detail: { id: m.id }, bubbles: true, composed: true }));
    } catch (e) {
      console.error("delete", e);
    }
  }

  private renderEdit() {
    return html`
      <div class="edit">
        <div>
          <label>Title</label>
          <input
            .value=${this.editTitle}
            @input=${(e: Event) => (this.editTitle = (e.target as HTMLInputElement).value)}
          />
        </div>
        <div>
          <label>Type</label>
          <select
            .value=${this.editKind}
            @change=${(e: Event) => (this.editKind = (e.target as HTMLSelectElement).value as Media["kind"])}
          >
            ${KIND_ORDER.map(
              (k) => html`<option value=${k} ?selected=${k === this.editKind}>${KIND_META[k].label}</option>`,
            )}
          </select>
        </div>
        <div>
          <label>Notes</label>
          <textarea
            .value=${this.editNotes}
            @input=${(e: Event) => (this.editNotes = (e.target as HTMLTextAreaElement).value)}
          ></textarea>
        </div>
        <div>
          <label>Tags</label>
          <div class="tag-edit">
            ${this.editTags.map(
              (t) => html`<span class="tag-pill"
                >${t}
                <button title="Remove" @click=${() => this.removeEditTag(t)}>
                  <span class="material-symbols-rounded" style="font-size:16px;">close</span>
                </button></span
              >`,
            )}
            <input
              class="tag-add"
              placeholder="Add tag…"
              .value=${this.newTag}
              @input=${(e: Event) => (this.newTag = (e.target as HTMLInputElement).value)}
              @keydown=${this.onTagKeydown}
              @blur=${() => this.commitNewTag()}
            />
          </div>
        </div>
        ${(this.full ?? this.media).kind === "video" ? this.renderPosterPicker() : nothing}
        <div class="edit-actions">
          <button class="btn-primary" @click=${this.saveEdit} ?disabled=${this.saving}>
            <span class="material-symbols-rounded" style="font-size:20px;">save</span>
            ${this.saving ? "Saving…" : "Save"}
          </button>
          <button class="btn-outline" @click=${this.cancelEdit} ?disabled=${this.saving}>Cancel</button>
        </div>
      </div>
    `;
  }

  // --- Poster frame -------------------------------------------------------

  /**
   * Choosing which frame represents a video.
   *
   * The automatic poster is a frame 10% in, which is a decent guess and regularly the
   * wrong one — a title card, a fade, the back of somebody's head. This is a strip of
   * frames spread across the running time that you scroll through and click.
   *
   * It is behind a button rather than loading with the form because the server has to
   * decrypt the whole video to read any frame from it. That is a real cost on a
   * feature-length file, and most edits are a title or a tag.
   */
  private async loadPosterFrames() {
    const m = this.full ?? this.media;
    if (this.posterLoading) return;
    this.posterLoading = true;
    this.posterError = "";
    try {
      const res = await api.posterFrames(m.id);
      // The viewer pages with the arrow keys, so the user may well have moved on
      // during a decrypt. Dropping a late response beats showing one video's frames
      // under another's title.
      if ((this.full ?? this.media).id !== m.id) return;
      this.posterFrames = res.frames;
    } catch (e) {
      this.posterError = (e as Error).message || "Couldn't read frames from this video.";
    } finally {
      this.posterLoading = false;
    }
  }

  private async choosePoster(index: number) {
    const m = this.full ?? this.media;
    const frame = this.posterFrames[index];
    if (!frame || this.posterSaving >= 0) return;
    this.posterSaving = index;
    this.posterError = "";
    try {
      await api.setPoster(m.id, frame.at);
      this.posterChosen = index;
      // The thumbnail URL is stable, so the grid and this form would both keep the
      // picture the browser already has. The bump is what makes the change visible.
      this.posterVersion = Date.now();
      const line = libbyReact("save");
      mascotSay("New thumbnail set.", "success", { emotion: line.emotion, intensity: line.intensity });
    } catch (e) {
      this.posterError = (e as Error).message || "Couldn't set that frame as the thumbnail.";
    } finally {
      this.posterSaving = -1;
    }
  }

  private renderPosterPicker() {
    const m = this.full ?? this.media;
    return html`<div class="poster-picker">
      <label>Thumbnail</label>
      <div class="poster-head">
        <img
          class="poster-current"
          src=${`${api.thumbURL(m.id)}${this.posterVersion ? `?v=${this.posterVersion}` : ""}`}
          alt="Current thumbnail"
          @error=${(e: Event) => ((e.target as HTMLImageElement).style.visibility = "hidden")}
        />
        <div class="poster-copy">
          <span>Pick the frame this video shows in the library.</span>
          ${this.posterFrames.length
            ? nothing
            : html`<button class="btn-outline" ?disabled=${this.posterLoading} @click=${() => this.loadPosterFrames()}>
                ${this.posterLoading ? "Reading frames…" : "Choose a frame"}
              </button>`}
        </div>
      </div>
      ${this.posterError ? html`<div class="poster-error" role="alert">${this.posterError}</div>` : nothing}
      ${this.posterFrames.length
        ? html`<div class="poster-strip">
            ${this.posterFrames.map((frame, i) => html`<button
              class="poster-frame ${this.posterChosen === i ? "on" : ""}"
              title=${`Use the frame at ${formatTimecode(frame.at)}`}
              ?disabled=${this.posterSaving >= 0}
              @click=${() => this.choosePoster(i)}
            >
              <img src=${frame.image} alt="" loading="lazy" />
              <span class="poster-time">
                ${this.posterSaving === i ? "Saving…" : formatTimecode(frame.at)}
              </span>
            </button>`)}
          </div>`
        : nothing}
    </div>`;
  }

  private favIcon() {
    return html`<span
      class="material-symbols-rounded fill-icon"
      style="font-size:22px; color:${this.favorite ? "var(--oppai-fav)" : "var(--oppai-text)"};"
      >${this.favorite ? "favorite" : "favorite_border"}</span
    >`;
  }

  render() {
    const m = this.full ?? this.media;
    const url = api.streamURL(m.id);
    return html`
      <div class="wrap">
        ${this.renderStage(m, url)}
        ${m.kind === "video" || m.kind === "image" ? this.renderUpNext(m) : nothing}
        ${this.renderTimeline(m)}
        ${m.kind === "game" ? nothing : this.renderMeta(m)}
      </div>
      ${this.screenshot
        ? html`<button class="shot-lightbox" aria-label="Close screenshot" @click=${() => (this.screenshot = "")}>
            <img src=${this.screenshot} alt="Full-size game screenshot" />
          </button>`
        : nothing}
    `;
  }

  /**
   * The "up next" carousel: nearby videos and images as a strip of posters you can
   * scrub through and jump from, sat directly under the open item.
   *
   * It answers "what's after this?" without making you close the video and go back to
   * the grid to find out — the arrow keys already page through exactly this list, so
   * this is that list made visible.
   */
  private renderUpNext(current: Media) {
	const media = this.queue.filter((x) => x.kind === "video" || x.kind === "image");
	if (!media.some((x) => x.id === current.id)) media.unshift(current);
    if (media.length < 2) return nothing;
    const at = media.findIndex((x) => x.id === current.id);
    return html`
      <div class="upnext">
        <div class="upnext-label">Videos & images</div>
        <div class="strip">
          ${media.map(
            (x, n) => html`
              <button
                class="strip-item ${x.id === current.id ? "on" : ""}"
                title=${x.title}
                aria-current=${x.id === current.id}
                @click=${() => this.jumpTo(x.id)}
              >
                ${x.hasThumb
                  ? html`<img src=${api.thumbURL(x.id)} loading="lazy" alt=${x.title} />`
                  : html`<span class="strip-blank" style="background:${swatchFor(x)};"></span>`}
                ${x.kind === "video"
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

  private jumpTo(id: number) {
    if (id === this.media.id) return;
    this.dispatchEvent(new CustomEvent("jump", { detail: { id }, bubbles: true, composed: true }));
  }

  private renderStage(m: Media, url: string) {
    switch (m.kind) {
      case "video":
        const aspect = m.width && m.height ? m.width / m.height : 16 / 9;
        return html`<div
          class="stage video-stage"
          style="aspect-ratio:${aspect}; width:100%; max-width:${76 * aspect}vh; background:${swatchFor(m)};"
        >
          <video
            src=${url}
            poster=${m.hasThumb ? api.thumbURL(m.id) : nothing}
            controls
            autoplay
            playsinline
            preload="metadata"
          ></video>
        </div>`;
      case "gif":
      case "image":
        return html`<div class="stage-fit">
          <img src=${url} alt=${m.title} />
        </div>`;
      case "comic":
        return this.renderComic(m);
      case "game":
        return this.renderGame(m, url);
      default:
        return nothing;
    }
  }

  private renderComic(m: Media) {
    return html`
      <div class="reader">
        ${this.comic === null
          ? html`<div class="reader-fallback" style="background:${swatchFor(m)};">
              <span class="mono" style="color:#fff;">OPENING…</span>
            </div>`
          : this.comic.readable
            ? this.renderReader(m, this.comic)
            : this.renderComicFallback(m, this.comic)}
      </div>
    `;
  }

  // The reader proper: one page at a time, streamed from the archive server-side.
  private renderReader(m: Media, info: ComicInfo) {
    const first = this.page <= 1;
    const last = this.page >= info.pages;
    return html`
      <div class="reader-stage">
        <img
          class="page-img ${this.fit === "width" ? "fit-width" : "fit-page"}"
          src=${api.pageURL(m.id, this.page)}
          alt="Page ${this.page} of ${m.title}"
        />
        <button
          class="turn prev"
          title="Previous page"
          ?disabled=${first}
          @click=${() => this.goPage(this.page - 1)}
        >
          ${first
            ? nothing
            : html`<span class="material-symbols-rounded" style="font-size:28px;">chevron_left</span>`}
        </button>
        <button
          class="turn next"
          title="Next page"
          ?disabled=${last}
          @click=${() => this.goPage(this.page + 1)}
        >
          ${last
            ? nothing
            : html`<span class="material-symbols-rounded" style="font-size:28px;">chevron_right</span>`}
        </button>
      </div>

      <div class="reader-bar">
        <button class="round-btn" title="Previous page" ?disabled=${first} @click=${() => this.goPage(this.page - 1)}>
          <span class="material-symbols-rounded" style="font-size:22px;">chevron_left</span>
        </button>
        <input
          type="range"
          min="1"
          max=${info.pages}
          .value=${String(this.page)}
          @input=${(e: Event) => this.goPage(Number((e.target as HTMLInputElement).value))}
          aria-label="Page"
        />
        <span class="mono">${this.page} / ${info.pages}</span>
        <button class="round-btn" title="Next page" ?disabled=${last} @click=${() => this.goPage(this.page + 1)}>
          <span class="material-symbols-rounded" style="font-size:22px;">chevron_right</span>
        </button>
        <button
          class="round-btn"
          title=${this.fit === "width" ? "Fit whole page" : "Fit to width"}
          @click=${() => this.setFit(this.fit === "width" ? "page" : "width")}
        >
          <span class="material-symbols-rounded" style="font-size:22px;"
            >${this.fit === "width" ? "fit_screen" : "fit_width"}</span
          >
        </button>
      </div>
    `;
  }

  // Archives we can't decode in-app (.cbr, .pdf) still get an honest way out.
  private renderComicFallback(m: Media, info: ComicInfo) {
    return html`
      <div class="reader-fallback" style="background:${swatchFor(m)};">
        <span class="material-symbols-rounded" style="font-size:40px; color:#fff;">auto_stories</span>
        <span class="mono" style="color:#fff;">CAN'T READ IN APP</span>
        <span style="font-size:12px; color:rgba(255,255,255,0.75);">
          ${info.reason ?? "Unsupported archive."} Only .cbz / .zip comics can be paged through here.
        </span>
        <a href=${api.streamURL(m.id)} download style="color:#fff; font-size:12px; font-weight:600; margin-top:6px;"
          >Download the file</a
        >
      </div>
    `;
  }

  private renderGame(m: Media, url: string) {
    const host = m.download ? this.hostOf(m.download) : "";
    return html`
      <div class="game">
        <div class="game-cover" style="background:${swatchFor(m)};">
          ${m.hasThumb
            ? html`<img
                src=${api.thumbURL(m.id)}
                alt=${m.title}
                style="width:100%; height:100%; object-fit:cover;"
              />`
            : html`<span class="material-symbols-rounded" style="font-size:48px; color:#fff;">sports_esports</span>`}
        </div>
        <div style="flex:1; min-width:260px; padding-top:8px;">
          <div class="meta-head">
            <h2 class="meta-title">${m.title}</h2>
            ${this.renderActions(false)}
          </div>
          ${this.editing
            ? this.renderEdit()
            : html`
                <div class="sub">${KIND_META.game.label.replace(/s$/, "")}</div>
                <div class="actions">
                  ${this.play
                    ? html`<button class="btn-primary" @click=${() => (this.playing = true)}>
                        <span class="material-symbols-rounded fill-icon" style="font-size:20px;">play_arrow</span>
                        Play in browser
                      </button>`
                    : nothing}
                  ${m.download
                    ? html`<a class="btn-primary" href=${m.download} target="_blank" rel="noreferrer">
                        <span class="material-symbols-rounded fill-icon" style="font-size:20px;">open_in_new</span>
                        ${host ? `Get it on ${host}` : "Get it"}
                      </a>`
                    : html`<a class="btn-primary" href=${url} download>
                        <span class="material-symbols-rounded fill-icon" style="font-size:20px;">download</span>
                        Download
                      </a>`}
                  <button class="btn-outline" @click=${this.toggleFav}>
                    <span
                      class="material-symbols-rounded"
                      style="font-size:20px; color:${this.favorite ? "var(--oppai-fav)" : "var(--oppai-text)"};"
                      >${this.favorite ? "favorite" : "favorite_border"}</span
                    >
                    Favorite
                  </button>
                </div>
                ${this.playing ? this.renderPlayer(m) : nothing}
                ${m.notes
                  ? html`<p class="desc">${m.notes}</p>`
                  : html`<p class="desc">A title from your library.</p>`}
                ${this.renderTags(m)}
                ${this.renderSaves(m)}
                ${m.gallery && m.gallery.length
                   ? html`<div class="shots">
                      ${m.gallery.map((u) => html`<button
                        class="shot"
                        title="Open full-size screenshot"
                        @click=${() => (this.screenshot = api.proxyURL(u))}
                      ><img loading="lazy" src=${api.proxyURL(u)} alt="screenshot" /></button>`)}
                    </div>`
                  : nothing}
                <div class="section-label">User gallery</div>
                <div class="shots">
                  ${this.userGallery.map((item) => html`<div class="shot user-shot">
                    ${item.kind === "video"
                      ? html`<video controls preload="metadata" src=${api.streamURL(item.id)}></video>`
                      : html`<button class="shot" title="Open full-size upload"
                          @click=${() => (this.screenshot = api.streamURL(item.id))}>
                          <img loading="lazy" src=${api.thumbURL(item.id)} alt=${item.title} />
                        </button>`}
                    <button class="remove-shot" title="Remove from game gallery"
                      @click=${() => void this.removeGameGallery(m.id, item.id)}>×</button>
                  </div>`)}
                </div>
                <label class="btn-outline gallery-upload">
                  <span class="material-symbols-rounded">add_photo_alternate</span>
                  ${this.galleryUploading ? "Uploading…" : "Add photos or videos"}
                  <input type="file" accept="image/*,video/*" multiple hidden ?disabled=${this.galleryUploading}
                    @change=${(e: Event) => void this.uploadGameGallery(e, m.id)} />
                </label>
                ${m.source
                  ? html`<div class="meta-note">
                      Source:
                      <a href=${m.source} target="_blank" rel="noreferrer" style="color:var(--oppai-primary-bright);">link</a>
                    </div>`
                  : nothing}
              `}
        </div>
      </div>
    `;
  }

  /** The HTML5 player.
   *
   *  The `sandbox` attribute is the security boundary, not a nicety. It deliberately
   *  omits allow-same-origin: without it the build runs in an opaque origin, so its
   *  scripts get no session cookie, no localStorage, no access to this page, and no
   *  credentialed reach into the API — which matters because the thing being run is
   *  a zip someone downloaded off the internet. Do not add allow-same-origin; with
   *  allow-scripts it cancels the sandbox entirely and hands the library to the game.
   *
   *  The trade-off is that storage APIs are unavailable to the game, so a build that
   *  autosaves to localStorage won't persist between sessions. That is what the save
   *  file backup below is for. */
  private renderPlayer(m: Media) {
    const info = this.play;
    if (!info) return nothing;
    const embed = info.mode === "embed" && info.embedUrl;
    return html`
      <div class="play-stage">
        <button class="play-close" title="Stop playing" @click=${() => (this.playing = false)}>×</button>
        ${embed
          ? // itch's own build, on itch's origin. `allow-same-origin` is correct here
            // and not a hole: the frame is cross-origin, so it grants the game its own
            // itch origin (letting it save), never ours — the browser still refuses it
            // any access to this page.
            html`<iframe
              src=${info.embedUrl}
              title=${m.title}
              allow="fullscreen; gamepad; autoplay; cross-origin-isolated"
              sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-popups"
              referrerpolicy="no-referrer"
            ></iframe>`
          : html`<iframe
              src=${api.gamePlayURL(m.id)}
              title=${m.title}
              allow="fullscreen; gamepad; autoplay"
              sandbox="allow-scripts allow-pointer-lock allow-popups"
            ></iframe>`}
      </div>
      <p class="play-note">
        ${embed
          ? html`Streaming from itch.io — this game has no downloadable build, so it
              isn't stored in your library and needs a connection to play.`
          : html`Running sandboxed, so the game can't reach the rest of your library —
              which also means it can't save to browser storage. Back its saves up below.`}
      </p>
    `;
  }

  private renderSaves(m: Media) {
    return html`
      <div class="section-label">Save files</div>
      ${this.saves.length
        ? html`<div class="saves">
            ${this.saves.map(
              (s) => html`<div class="save-row">
                <span class="save-name" title=${s.label}>${s.label}</span>
                <span class="save-meta">${formatBytes(s.size)} · ${saveDate(s.createdAt)}</span>
                <a class="save-act" title="Download this save" href=${api.gameSaveURL(m.id, s.id)} download>
                  <span class="material-symbols-rounded" style="font-size:20px;">download</span>
                </a>
                <button class="save-act" title="Delete this save"
                  @click=${() => void this.deleteSave(m.id, s.id)}>
                  <span class="material-symbols-rounded" style="font-size:20px;">delete</span>
                </button>
              </div>`,
            )}
          </div>`
        : html`<div class="save-empty">No saves backed up yet.</div>`}
      ${this.saveError ? html`<div class="save-error">${this.saveError}</div>` : nothing}
      <label class="btn-outline gallery-upload">
        <span class="material-symbols-rounded">backup</span>
        ${this.saveUploading ? "Uploading…" : "Back up a save"}
        <input type="file" multiple hidden ?disabled=${this.saveUploading}
          @change=${(e: Event) => void this.uploadSave(e, m.id)} />
      </label>
    `;
  }

  private hostOf(u: string): string {
    try {
      return new URL(u).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  }

  // Shared icon-button cluster (auto-tag, edit, delete, favorite) used by the
  // generic meta panel and the game detail view.
  private renderActions(showAutotag = true) {
    return html`
      ${showAutotag
        ? html`<button class="icon-round" title="Auto-tag" @click=${this.retag} ?disabled=${this.tagging}>
            <span class="material-symbols-rounded" style="font-size:22px; color:var(--oppai-text-dim);"
              >${this.tagging ? "hourglass_empty" : "auto_awesome"}</span
            >
          </button>`
        : nothing}
      <button class="icon-round" title="Edit" @click=${() => this.startEdit()}>
        <span class="material-symbols-rounded" style="font-size:22px; color:var(--oppai-text-dim);">edit</span>
      </button>
      <button class="icon-round" title="Delete" @click=${this.doDelete}>
        <span class="material-symbols-rounded" style="font-size:22px; color:var(--oppai-error, #f2b8b5);">delete</span>
      </button>
      <button class="icon-round" title="Favorite" @click=${this.toggleFav}>${this.favIcon()}</button>
    `;
  }

  private renderMeta(m: Media) {
    const meta = KIND_META[m.kind];
    return html`
      <div class="meta">
        <div class="meta-head">
          <h2 class="meta-title">${m.title}</h2>
          ${this.renderActions()}
        </div>
        ${this.editing
          ? this.renderEdit()
          : html`
              <div class="chips">
                <span class="chip chip-accent">${statFor(m) || meta.label}</span>
                <span class="chip chip-muted">${meta.typeLabel}</span>
              </div>
              ${this.renderTags(m)}
              ${m.notes
                ? html`<p class="desc" style="margin-top:16px;">${m.notes}</p>`
                : nothing}
              ${m.source
                ? html`<div class="meta-note">
                    Source:
                    <a href=${m.source} target="_blank" rel="noreferrer" style="color:var(--oppai-primary-bright);">link</a>
                  </div>`
                : nothing}
            `}
      </div>
    `;
  }

  private renderTags(m: Media) {
    const tags = m.tags ?? [];
    if (tags.length === 0) {
      return html`<div class="meta-note" style="margin-top:14px;">
        No tags yet — use the ✨ auto-tag button.
      </div>`;
    }
    const anyTimeline = tags.some((t) => this.hasTimeline(t));
    return html`
      <div class="chips">
        ${tags.map((t) => this.renderTagChip(t))}
      </div>
      ${anyTimeline && this.activeTag == null
        ? html`<div class="meta-note" style="margin-top:10px;">
            Tap a ✨ tag to see where it appears in this video.
          </div>`
        : nothing}
    `;
  }

  private renderTagChip(t: MediaTag) {
    const detail = `${t.category}${t.source ? " · " + t.source : ""}`;
    if (!this.hasTimeline(t)) {
      return html`<span class="chip chip-muted" title=${detail}>${t.name}</span>`;
    }
    const on = this.activeTag === t.id;
    const n = t.moments!.length;
    return html`<button
      class="chip ${on ? "on" : "chip-muted"}"
      title="${detail} · seen at ${n} point${n === 1 ? "" : "s"}"
      aria-pressed=${on}
      @click=${() => this.toggleTagTimeline(t)}
    >
      <span class="material-symbols-rounded" style="font-size:14px;">auto_awesome</span>
      ${t.name}
    </button>`;
  }
}

/** Timestamps arrive as unix seconds. Saves are picked from a list by "which one is
 *  which", so the date is shown short and local rather than absolute-precise. */
function saveDate(unixSeconds: number): string {
  if (!unixSeconds) return "";
  return new Date(unixSeconds * 1000).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

declare global {
  interface HTMLElementTagNameMap {
    "oppai-viewer": OppaiViewer;
  }
}
