import { LitElement, html, css, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { keyed } from "lit/directives/keyed.js";
import { iconStyles, motionStyles } from "../theme.js";
import { api, mascotSay, type ChatCharacter, type GalleryBoard, type GalleryImage, type GallerySort } from "../api.js";
import { libbyReact, type LibbyItemFacts } from "../libby-voice.js";
import { shareImageWithCharacter } from "../chat-share.js";
import { openMenu, menuDivider, type MenuItem } from "../context-menu.js";
import { copyText, fromGalleryMetadata, toInfotext, toJSON, type GenInfo } from "../gen-info.js";
import { downloadGenerationPNG } from "../png-metadata.js";
import { profileUpdates } from "../ui-metrics.js";
import { isPickClick, pickClick } from "../pick-range.js";
import { groupByDay } from "../gallery-days.js";

const PAGE = 40;
const DRAG_TYPE = "application/x-oppai-gallery";
const SIZE_KEY = "oppai.gallerySize";

/**
 * The studio's gallery. On InvokeAI it is the generator's own gallery, sorted into
 * its boards; on Automatic1111, which keeps none a client can list, it is the one the
 * server keeps of every picture made in Create (api/gen_gallery.go), sorted into
 * folders — and apart from the library, which a picture reaches only when it is moved
 * there from here.
 *
 * It lives in two sizes. Beside the canvas it is a rail: the folders as cover cards,
 * the newest pictures under the day they were made, enough to grab the last few runs.
 * Expanded it fills the screen — the folders down the side, the grid as big as she
 * likes — because a gallery of hundreds was only ever browsed through a slot three
 * tiles wide.
 *
 * Pictures are picked by the tick on a tile (it shows on hover), with the Select
 * button, or with Ctrl (one at a time) and Shift (a run of them) — see pick-range.ts.
 * Picked pictures, or one alone, are filed by dragging them onto a folder, or with
 * the bar that appears along the bottom; the viewer files the open picture and steps
 * on, so a run of keepers is a click each. More pages arrive as the grid is scrolled.
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

/** The expanded grid's tile sizes, smallest first. */
const SIZES = [{ id: "s", px: 120 }, { id: "m", px: 170 }, { id: "l", px: 250 }] as const;
type TileSize = (typeof SIZES)[number]["id"];

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
  /** The picture open in the viewer. */
  @state() private viewing: GalleryImage | null = null;
  /** The gallery fills the screen rather than the rail beside the canvas. */
  @state() private browsing = false;
  @state() private tileSize: TileSize = "m";
  @state() private busy = false;
  /** A folder being named: the "+" card turns into a field. */
  @state() private naming = false;
  @state() private newBoard = "";
  /** Covers whose tile would not load (deleted since the list came), drawn as icons. */
  @state() private failedCovers = new Set<string>();
  /** Names saved to the library this session, so the button can say "Saved". */
  @state() private savedNames = new Set<string>();
  /** Multi-select mode: tiles become checkboxes and a bar acts on the set. */
  @state() private selecting = false;
  @state() private selected = new Set<string>();
  /** Where a Shift-click range runs from. */
  private pickAnchor: string | null = null;
  /** The folder a drag is over. */
  @state() private dropOn = "";
  @state() private dragging = false;
  /** The cover picker in the open picture's panel, and what it would cover. */
  @state() private coverOpen = false;
  @state() private coverFor = "";
  private metadata = new Map<string, GenInfo>();
  private more?: IntersectionObserver;

  static styles = [
    iconStyles,
    motionStyles,
    css`
      :host { display: block; color: var(--oppai-text); }
      button { font: inherit; }

      /* ── the rail ─────────────────────────────────────────────────────────── */
      .panel {
        display: flex; flex-direction: column; gap: 10px; padding: 0 10px 12px; box-sizing: border-box;
        background: var(--oppai-surface-2); border-radius: 14px;
      }
      :host([workspace]) { height: 100%; min-height: 0; }
      :host([workspace]) .panel {
        height: 100%; min-height: 0; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; border-radius: 0; background: transparent;
      }
      .head {
        position: sticky; top: 0; z-index: 4; display: flex; align-items: center; gap: 4px; min-height: 46px; margin: 0 -10px; padding: 0 6px 0 12px;
        background: var(--oppai-surface-2); border-bottom: 1px solid var(--oppai-border);
      }
      .head .title { font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 7px; }
      .head .title .material-symbols-rounded { font-size: 19px; color: var(--oppai-primary-bright, var(--oppai-primary)); }
      .head .count { margin-left: 4px; font-size: 11.5px; color: var(--oppai-text-muted); font-variant-numeric: tabular-nums; }
      .grow { flex: 1; }
      .hbtn {
        width: 34px; height: 34px; border-radius: 17px; border: none; background: transparent; color: var(--oppai-text-muted);
        display: grid; place-items: center; cursor: pointer; flex: none;
      }
      .hbtn:hover { background: var(--oppai-surface); color: var(--oppai-text); }
      .hbtn.on { background: var(--oppai-primary); color: var(--oppai-on-primary); }
      .hbtn .material-symbols-rounded { font-size: 20px; }

      .folders {
        display: grid; grid-auto-flow: column; grid-auto-columns: 96px; gap: 8px; overflow-x: auto; overscroll-behavior-x: contain;
        scrollbar-width: thin; padding: 2px 0 4px; scroll-snap-type: x proximity;
      }
      .folder {
        position: relative; display: flex; flex-direction: column; gap: 2px; padding: 0 0 7px; border: none; border-radius: 13px; cursor: pointer;
        background: var(--oppai-surface); color: var(--oppai-text); text-align: left; overflow: hidden; scroll-snap-align: start;
        outline: 2px solid transparent; outline-offset: -2px; transition: outline-color 0.12s ease, transform 0.15s var(--oppai-ease-spring, ease);
      }
      .folder:hover { transform: translateY(-1px); }
      .folder.on { outline-color: var(--oppai-primary); }
      .folder.drop { outline-color: var(--oppai-accent); transform: scale(1.05); }
      .folder-cover { display: grid; place-items: center; aspect-ratio: 4 / 3; background: var(--oppai-surface-2); color: var(--oppai-text-muted); overflow: hidden; }
      .folder-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .folder-cover .material-symbols-rounded { font-size: 26px; }
      .folder-name { padding: 0 8px; font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .folder-count { padding: 0 8px; font-size: 11px; color: var(--oppai-text-muted); font-variant-numeric: tabular-nums; }
      .folder.add { justify-content: center; align-items: center; gap: 4px; padding: 0; border: 1.5px dashed var(--oppai-border-strong); background: none; color: var(--oppai-text-muted); font-size: 11.5px; font-weight: 600; }
      .folder.add .material-symbols-rounded { font-size: 24px; }
      .naming { display: flex; flex-direction: column; gap: 5px; padding: 8px; border-radius: 13px; background: var(--oppai-surface); grid-column: span 2; }
      .naming input, .side-naming input {
        min-width: 0; border: 1px solid var(--oppai-primary); border-radius: 8px; background: var(--oppai-surface-2); color: var(--oppai-text);
        font: inherit; font-size: 12px; padding: 6px 8px; outline: none;
      }
      .naming .row, .side-naming .row { display: flex; gap: 5px; }
      .naming button, .side-naming button { flex: 1; height: 28px; border-radius: 8px; border: none; font-size: 12px; font-weight: 600; cursor: pointer; background: var(--oppai-surface-2); color: var(--oppai-text); }
      .naming button.ok, .side-naming button.ok { background: var(--oppai-primary); color: var(--oppai-on-primary); }

      .bar { display: flex; align-items: center; gap: 6px; min-width: 0; }
      .bar .where { flex: 1; min-width: 0; display: flex; flex-direction: column; }
      .bar .where b { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .bar .where span { font-size: 11px; color: var(--oppai-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .bar .where span b { font-size: 11px; color: var(--oppai-text-dim); }
      .pill {
        flex: none; display: inline-flex; align-items: center; gap: 4px; height: 30px; padding: 0 10px; border-radius: 15px;
        border: 1px solid var(--oppai-border-strong); background: transparent; color: var(--oppai-text-dim); font-size: 12px; cursor: pointer;
      }
      .pill:hover { color: var(--oppai-text); border-color: var(--oppai-text-muted); }
      .pill .material-symbols-rounded { font-size: 17px; }

      .day { display: flex; align-items: baseline; gap: 8px; margin: 6px 2px 6px; font-size: 12px; font-weight: 700; color: var(--oppai-text-dim); }
      .day small { font-weight: 500; color: var(--oppai-text-muted); font-variant-numeric: tabular-nums; }
      .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 5px; }
      .tile {
        position: relative; border-radius: 8px; overflow: hidden; background: var(--oppai-surface); aspect-ratio: 1; cursor: pointer;
        outline: 2px solid transparent; outline-offset: -2px; transition: outline-color 0.12s ease;
      }
      .tile img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.25s var(--oppai-ease-emphasized, ease); }
      .tile:hover img { transform: scale(1.04); }
      .tile.picked { outline-color: var(--oppai-primary); }
      .tile.picked img { transform: scale(0.88); border-radius: 6px; }
      .tile.dragged { opacity: 0.45; }
      .tile .shade {
        position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity 0.15s ease;
        background: linear-gradient(to bottom, rgba(0, 0, 0, 0.45), transparent 35%, transparent 60%, rgba(0, 0, 0, 0.55));
      }
      .tile:hover .shade, .tile:focus-within .shade, .selecting .tile .shade { opacity: 1; }
      .tick {
        position: absolute; top: 4px; left: 4px; width: 24px; height: 24px; border-radius: 12px; border: none; padding: 0;
        background: rgba(0, 0, 0, 0.35); color: #fff; display: grid; place-items: center; cursor: pointer; opacity: 0; transition: opacity 0.15s ease;
      }
      .tick .material-symbols-rounded { font-size: 18px; }
      .tile:hover .tick, .tile:focus-within .tick, .selecting .tick, .tile.picked .tick { opacity: 1; }
      .tile.picked .tick { background: var(--oppai-primary); color: var(--oppai-on-primary); }
      .acts { position: absolute; right: 4px; bottom: 4px; display: flex; gap: 3px; opacity: 0; transition: opacity 0.15s ease; }
      .tile:hover .acts, .tile:focus-within .acts { opacity: 1; }
      .selecting .acts { display: none; }
      .acts button {
        width: 26px; height: 26px; border-radius: 13px; border: none; padding: 0; background: rgba(0, 0, 0, 0.55); color: #fff;
        display: grid; place-items: center; cursor: pointer;
      }
      .acts button:hover { background: rgba(0, 0, 0, 0.8); }
      .acts .material-symbols-rounded { font-size: 15px; }
      .note { font-size: 12px; color: var(--oppai-text-muted); line-height: 1.45; }
      .empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 28px 12px; text-align: center; font-size: 12.5px; color: var(--oppai-text-muted); }
      .empty .material-symbols-rounded { font-size: 36px; opacity: 0.6; }
      .err { font-size: 12px; color: var(--oppai-error, #f2b8b5); }
      .sentinel { height: 1px; }
      .loading { display: flex; justify-content: center; padding: 10px; font-size: 12px; color: var(--oppai-text-muted); }

      /* What is picked, and what to do with it: along the bottom, over the grid. */
      .selbar {
        position: sticky; bottom: 0; z-index: 5; display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0 -10px -12px;
        padding: 9px 10px 11px; background: color-mix(in srgb, var(--oppai-surface-2) 94%, transparent); backdrop-filter: blur(10px);
        border-top: 1px solid var(--oppai-border-strong); animation: oppai-fade-in-up 0.18s var(--oppai-ease-emphasized, ease) both;
      }
      .selbar .n { font-size: 12.5px; font-weight: 700; margin-right: 2px; }
      .selbar .link { border: none; background: none; color: var(--oppai-primary-bright, var(--oppai-primary)); font-size: 12px; cursor: pointer; padding: 3px 4px; }
      .sbtn {
        display: inline-flex; align-items: center; gap: 4px; height: 30px; padding: 0 10px; border-radius: 15px; border: none;
        background: var(--oppai-surface); color: var(--oppai-text); font-size: 12px; font-weight: 600; cursor: pointer;
      }
      .sbtn .material-symbols-rounded { font-size: 16px; }
      .sbtn.primary { background: var(--oppai-primary); color: var(--oppai-on-primary); }
      .sbtn.danger { color: var(--oppai-error, #f2b8b5); }
      .sbtn:disabled { opacity: 0.45; cursor: default; }
      .sbtn.x { width: 30px; padding: 0; justify-content: center; margin-left: auto; }
      .drag-hint { margin-left: auto; font-size: 11.5px; color: var(--oppai-text-muted); }
      .drag-hint + .sbtn.x { margin-left: 0; }

      /* ── expanded ─────────────────────────────────────────────────────────── */
      .browse {
        position: fixed; inset: 0; z-index: 65; display: grid; grid-template-columns: 230px minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr);
        background: var(--oppai-bg); animation: oppai-fade-in 0.18s ease both;
      }
      .browse-top {
        grid-column: 1 / 3; display: flex; align-items: center; gap: 8px; height: 58px; padding: 0 12px 0 8px; box-sizing: border-box;
        background: var(--oppai-surface); border-bottom: 1px solid var(--oppai-border-strong);
      }
      .browse-top .where { display: flex; flex-direction: column; min-width: 0; }
      .browse-top .where b { font-size: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .browse-top .where span { font-size: 12px; color: var(--oppai-text-muted); }
      .browse-top .where span b { font-size: inherit; color: var(--oppai-text-dim); }
      .size { display: inline-flex; align-items: center; gap: 6px; color: var(--oppai-text-muted); }
      .size input { width: 90px; accent-color: var(--oppai-primary); }
      .side { overflow-y: auto; padding: 12px 8px; background: var(--oppai-surface); border-right: 1px solid var(--oppai-border); display: flex; flex-direction: column; gap: 2px; }
      .side .k { margin: 4px 10px 8px; font-size: 11px; font-weight: 700; letter-spacing: 0.7px; text-transform: uppercase; color: var(--oppai-text-muted); }
      .side-item {
        display: flex; align-items: center; gap: 10px; padding: 6px 8px; border-radius: 12px; border: none; background: none; color: var(--oppai-text-dim);
        text-align: left; cursor: pointer; outline: 2px solid transparent; outline-offset: -2px;
      }
      .side-item:hover { background: var(--oppai-surface-2); color: var(--oppai-text); }
      .side-item.on { background: var(--oppai-primary-container); color: var(--oppai-text); }
      .side-item.drop { outline-color: var(--oppai-accent); background: color-mix(in srgb, var(--oppai-accent) 15%, transparent); }
      .side-item .thumb { width: 38px; height: 38px; flex: none; border-radius: 9px; overflow: hidden; display: grid; place-items: center; background: var(--oppai-surface-2); color: var(--oppai-text-muted); }
      .side-item .thumb img { width: 100%; height: 100%; object-fit: cover; }
      .side-item .thumb .material-symbols-rounded { font-size: 20px; }
      .side-item .nm { flex: 1; min-width: 0; font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .side-item .ct { font-size: 11.5px; color: var(--oppai-text-muted); font-variant-numeric: tabular-nums; }
      .side-naming { display: flex; flex-direction: column; gap: 5px; padding: 8px; }
      .side-new { margin-top: 6px; color: var(--oppai-text-muted); }
      .side-new .thumb { border: 1.5px dashed var(--oppai-border-strong); background: none; }
      .browse-main { overflow-y: auto; overscroll-behavior: contain; padding: 14px 18px 0; display: flex; flex-direction: column; gap: 8px; }
      .browse .grid { grid-template-columns: repeat(auto-fill, minmax(var(--tile, 170px), 1fr)); gap: 8px; }
      .browse .tile { border-radius: 12px; }
      .browse .day { font-size: 14px; margin: 14px 2px 4px; }
      .browse .selbar { margin: 8px -18px 0; padding: 12px 18px 14px; }
      @media (max-width: 760px) {
        .browse { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto auto minmax(0, 1fr); }
        .browse-top { grid-column: 1; }
        .side { flex-direction: row; overflow-x: auto; overflow-y: hidden; padding: 8px; border-right: none; border-bottom: 1px solid var(--oppai-border); }
        .side .k, .side-item .ct { display: none; }
        .side-item { flex-direction: column; gap: 3px; flex: none; width: 74px; padding: 4px; }
        .side-item .nm { font-size: 11px; width: 100%; text-align: center; }
        .size { display: none; }
        .browse-main { padding: 10px 10px 0; }
        .browse .selbar { margin: 8px -10px 0; }
      }

      /* ── the viewer ───────────────────────────────────────────────────────── */
      .viewer {
        position: fixed; inset: 0; z-index: 70; display: grid; grid-template-columns: minmax(0, 1fr) 340px; background: rgb(8, 8, 12);
        animation: oppai-fade-in 0.16s ease both;
      }
      .stage { position: relative; min-width: 0; min-height: 0; display: grid; grid-template-rows: auto minmax(0, 1fr) auto; }
      .stage-top { display: flex; align-items: center; gap: 8px; padding: 10px 12px; color: #fff; }
      .stage-top .pos { font-size: 13px; font-weight: 600; font-variant-numeric: tabular-nums; }
      .stage-top .nm { font-size: 12px; opacity: 0.6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
      .vbtn {
        flex: none; width: 40px; height: 40px; border-radius: 20px; border: none; background: rgba(255, 255, 255, 0.08); color: #fff;
        display: grid; place-items: center; cursor: pointer;
      }
      .vbtn:hover { background: rgba(255, 255, 255, 0.18); }
      .vbtn:disabled { opacity: 0.25; cursor: default; }
      .picture { position: relative; min-height: 0; overflow: hidden; }
      /* Laid over its row rather than sized by it: a percentage height on a grid
         item has nothing to resolve against, and a tall picture ran on under the
         filmstrip. */
      .picture img {
        position: absolute; inset: 0; width: 100%; height: 100%; padding: 0 64px; box-sizing: border-box; object-fit: contain;
        animation: oppai-fade-in 0.2s ease both;
      }
      .picture .nav { position: absolute; top: 50%; transform: translateY(-50%); }
      .picture .nav.prev { left: 12px; }
      .picture .nav.next { right: 12px; }
      .strip { display: flex; gap: 6px; justify-content: center; padding: 10px 12px 14px; overflow-x: auto; scrollbar-width: none; }
      .strip button { flex: none; width: 54px; height: 54px; padding: 0; border-radius: 9px; overflow: hidden; border: 2px solid transparent; background: #111; cursor: pointer; opacity: 0.55; transition: opacity 0.15s ease; }
      .strip button:hover { opacity: 0.9; }
      .strip button.on { border-color: var(--oppai-primary); opacity: 1; }
      .strip img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .info {
        min-height: 0; overflow-y: auto; background: var(--oppai-surface); color: var(--oppai-text); padding: 16px; box-sizing: border-box;
        display: flex; flex-direction: column; gap: 14px; font-size: 12.5px; border-left: 1px solid var(--oppai-border-strong);
      }
      .info .big {
        display: flex; align-items: center; justify-content: center; gap: 7px; height: 44px; border-radius: 14px; border: none;
        background: var(--oppai-primary); color: var(--oppai-on-primary); font-size: 14px; font-weight: 700; cursor: pointer;
      }
      .info .big:disabled { opacity: 0.6; cursor: default; }
      .info .k { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; color: var(--oppai-text-muted); margin-bottom: 6px; }
      .uses { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
      .uses button {
        display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 4px 9px; border-radius: 12px; border: none;
        background: var(--oppai-surface-2); color: var(--oppai-text); font-size: 11.5px; font-weight: 600; cursor: pointer; text-align: center; line-height: 1.2;
      }
      .uses button:hover { background: var(--oppai-primary-container); }
      .uses .material-symbols-rounded { font-size: 21px; color: var(--oppai-primary-bright, var(--oppai-primary)); }
      .rowbtns { display: flex; flex-wrap: wrap; gap: 6px; }
      .rowbtns button, .rowbtns select {
        display: inline-flex; align-items: center; gap: 5px; height: 32px; padding: 0 11px; border-radius: 16px; border: 1px solid var(--oppai-border-strong);
        background: transparent; color: var(--oppai-text); font-size: 12px; cursor: pointer;
      }
      .rowbtns select { padding: 0 8px; max-width: 100%; }
      .rowbtns .material-symbols-rounded { font-size: 16px; }
      .prompt { white-space: pre-wrap; word-break: break-word; line-height: 1.45; background: var(--oppai-surface-2); border-radius: 10px; padding: 8px 10px; max-height: 180px; overflow-y: auto; }
      .copy { margin-left: auto; border: none; background: none; color: var(--oppai-primary-bright, var(--oppai-primary)); font-size: 11px; letter-spacing: 0; text-transform: none; cursor: pointer; display: inline-flex; align-items: center; gap: 3px; padding: 2px 4px; border-radius: 6px; }
      .copy:hover { background: var(--oppai-surface-2); }
      .copy .material-symbols-rounded { font-size: 14px; }
      dl { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 5px 12px; margin: 0; }
      dt { color: var(--oppai-text-muted); }
      dd { margin: 0; overflow-wrap: anywhere; }
      .cover-pick { display: flex; flex-direction: column; gap: 6px; padding: 10px; border-radius: 12px; background: var(--oppai-surface-2); }
      .cover-pick select { border: 1px solid var(--oppai-border-strong); border-radius: 9px; background: var(--oppai-surface); color: var(--oppai-text); font: inherit; font-size: 12px; padding: 7px 8px; }
      .danger-row { margin-top: auto; padding-top: 6px; border-top: 1px solid var(--oppai-border); }
      .danger-row button { width: 100%; justify-content: center; color: var(--oppai-error, #f2b8b5); border-color: color-mix(in srgb, var(--oppai-error, #f2b8b5) 40%, transparent); }
      @media (max-width: 900px) {
        .viewer { grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(55vh, 1fr) auto; overflow-y: auto; }
        .stage { min-height: 55vh; }
        .picture img { padding: 0 8px; }
        .picture .nav { display: none; }
        .info { border-left: none; overflow: visible; }
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    profileUpdates(this, "generation gallery");
    window.addEventListener("keydown", this.onKey);
    if (this.startBoard) this.board = this.startBoard;
    try {
      const size = localStorage.getItem(SIZE_KEY);
      if (SIZES.some((s) => s.id === size)) this.tileSize = size as TileSize;
    } catch {
      // A private window keeps the default size.
    }
    void this.refresh();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("keydown", this.onKey);
    this.more?.disconnect();
  }

  /** The next page is read as the end of the grid scrolls into sight; a button to
      press for it was the only way, and was easy to scroll past. */
  protected updated(changed: PropertyValues) {
    super.updated(changed);
    const sentinel = this.renderRoot.querySelector(this.browsing ? ".browse .sentinel" : ".panel .sentinel");
    this.more?.disconnect();
    if (!sentinel || this.loading || this.items.length >= this.total) return;
    this.more ??= new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting) && !this.loading && this.items.length < this.total) void this.loadPage(false);
    }, { rootMargin: "400px" });
    this.more.observe(sentinel);
  }

  /** Arrow keys step through the open picture's board; Escape closes the viewer,
      then the expanded gallery; Delete deletes the open picture. */
  private onKey = (e: KeyboardEvent) => {
    if (!this.viewing && !this.browsing) return;
    // Typing in the cover picker or a folder's name is not stepping through pictures.
    if (e.composedPath().some((t) => t instanceof HTMLSelectElement || t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement)) return;
    if (this.viewing) {
      if (e.key === "ArrowLeft") void this.step(-1);
      else if (e.key === "ArrowRight") void this.step(1);
      else if (e.key === "Escape") this.viewing = null;
      else if (e.key === "Delete") void this.deleteImage(this.viewing, true);
      else return;
    } else if (e.key === "Escape") {
      if (this.selecting) this.toggleSelecting();
      else this.browsing = false;
    } else return;
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
    this.viewing = img;
    this.coverOpen = false;
    this.info = this.metadata.get(img.name) ?? null;
    this.infoError = "";
    if (this.info) return;
    void this.imageInfo(img).then(
      (info) => { if (this.viewing?.name === img.name) this.info = info; },
      (e) => { if (this.viewing?.name === img.name) this.infoError = (e as Error).message; },
    );
  }

  /** The next or previous picture, reading the next page when the end is reached. */
  private async step(d: number) {
    const at = this.items.findIndex((i) => i.name === this.viewing?.name);
    if (at < 0) return;
    let next = this.items[at + d];
    if (!next && d > 0 && this.items.length < this.total) {
      await this.loadPage(false);
      next = this.items[at + d];
    }
    if (next) this.open(next);
  }

  /** The picture to show once the open one leaves the board: the next, else the one before. */
  private neighbour(name: string): GalleryImage | undefined {
    const at = this.items.findIndex((i) => i.name === name);
    return at < 0 ? undefined : this.items[at + 1] ?? this.items[at - 1];
  }

  private pickSort(sort: GallerySort) {
    if (sort === this.sort) return;
    this.sort = sort;
    this.items = [];
    void this.loadPage(true);
  }

  private setTileSize(size: TileSize) {
    this.tileSize = size;
    try {
      localStorage.setItem(SIZE_KEY, size);
    } catch {
      // Not remembered, which is all.
    }
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
    if (!await this.reloadBoards()) return;
    // Always announce, not just on a change: the host files new generations into
    // whichever board is open here, and it needs that on first load too.
    this.announceBoard();
    await this.loadPage(true);
  }

  /** The boards alone, for the counts after pictures move between them. */
  private async reloadBoards(): Promise<boolean> {
    try {
      const res = await api.galleryBoards();
      this.boards = res.boards;
      if (!this.boards.some((b) => b.id === this.board) && this.boards.length) {
        this.board = this.boards[0].id;
      }
      return true;
    } catch (e) {
      this.error = (e as Error).message;
      return false;
    }
  }

  private async loadPage(reset: boolean) {
    if (this.loading) return;
    this.loading = true;
    try {
      const offset = reset ? 0 : this.items.length;
      const page = await api.galleryImages(this.board, offset, PAGE, this.sort);
      this.items = reset ? page.items : [...this.items, ...page.items.filter((i) => !this.items.some((o) => o.name === i.name))];
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
    this.selected = new Set();
    this.selecting = false;
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
      this.naming = false;
      await this.reloadBoards();
      this.pickBoard(created.id);
      if (!this.own) this.dispatchEvent(new CustomEvent("boards-changed", { bubbles: true, composed: true }));
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.busy = false;
    }
  }

  /** Deletes a board. Its images are not lost — InvokeAI returns them to
      Uncategorized, OppaiLib to Unsorted — so the confirm says as much. */
  private async deleteBoard(board: GalleryBoard) {
    if (!this.isFolder(board.id) || this.busy) return;
    const back = this.own ? "Unsorted" : "Uncategorized";
    if (!confirm(`Delete the “${board.name}” ${this.own ? "folder" : "gallery"}? Its pictures move back to ${back}.`)) return;
    this.busy = true;
    this.error = "";
    try {
      await api.deleteGalleryBoard(board.id);
      const line = libbyReact("galleryDelete");
      mascotSay(line.message, "success", { emotion: line.emotion, intensity: line.intensity });
      if (this.board === board.id) {
        this.board = "none";
        this.items = [];
      }
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

  private async renameBoard(board: GalleryBoard) {
    if (!this.isFolder(board.id) || this.busy) return;
    const name = window.prompt("Rename this folder", board.name)?.trim();
    if (!name || name === board.name) return;
    this.busy = true;
    try {
      await api.renameGalleryBoard(board.id, name);
      await this.reloadBoards();
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.busy = false;
    }
  }

  /** A folder's menu: what can be done to it, from its card or its row. */
  private openBoardMenu(e: MouseEvent, board: GalleryBoard) {
    e.preventDefault();
    e.stopPropagation();
    const items: MenuItem[] = [{ label: "Open", icon: "folder_open", run: () => this.pickBoard(board.id) }];
    if (this.isFolder(board.id)) {
      if (this.own) items.push({ label: "Rename", icon: "edit", run: () => void this.renameBoard(board) });
      items.push({ label: this.own ? "Delete folder" : "Delete gallery", icon: "delete", danger: true, run: () => void this.deleteBoard(board) });
    }
    openMenu({ x: e.clientX, y: e.clientY, title: board.name, items });
  }

  /** Takes pictures off the grid after they left the board on screen: deleted, moved
      to the library, or filed into another folder. */
  private dropFromView(names: Set<string>) {
    const before = this.items.length;
    this.items = this.items.filter((i) => !names.has(i.name));
    const gone = before - this.items.length;
    this.total = Math.max(0, this.total - gone);
    this.boards = this.boards.map((b) => (b.id === this.board ? { ...b, count: Math.max(0, b.count - gone) } : b));
    this.selected = new Set([...this.selected].filter((n) => !names.has(n)));
    if (this.viewing && names.has(this.viewing.name)) this.viewing = null;
  }

  /** Deletes one picture. From the viewer it steps on to the next rather than
      closing, so clearing out a run of misses is a key each. */
  private async deleteImage(img: GalleryImage, stepOn = false) {
    if (this.busy) return;
    this.busy = true;
    const next = stepOn ? this.neighbour(img.name) : undefined;
    try {
      await api.deleteGalleryImage(img.name);
      const line = libbyReact("galleryDelete");
      mascotSay(line.message, "success", { emotion: line.emotion, intensity: line.intensity });
      this.dropFromView(new Set([img.name]));
      if (next) this.open(next);
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
        const next = this.viewing?.name === img.name ? this.neighbour(img.name) : undefined;
        this.dropFromView(new Set([img.name]));
        this.boards = this.boards.map((b) => (b.id === "all" && this.board !== "all" ? { ...b, count: Math.max(0, b.count - 1) } : b));
        if (next) this.open(next);
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

  /** Files pictures into a board — picked ones from the bar, dragged ones, or the one
      open in the viewer, which steps on to the next. */
  private async moveNames(names: string[], boardId: string) {
    if (!names.length || !boardId || boardId === this.board || boardId === "all" || this.busy) return;
    this.busy = true;
    const next = this.viewing && names.includes(this.viewing.name) && this.board !== "all" ? this.neighbour(this.viewing.name) : undefined;
    try {
      await api.addGalleryImagesToBoard(boardId, names);
      // The moved images leave the board on screen — except "All pictures", which
      // still holds them wherever they are filed.
      if (this.board !== "all") this.dropFromView(new Set(names));
      if (!this.selected.size) this.selecting = false;
      await this.reloadBoards();
      if (next) this.open(next);
      const to = this.boards.find((b) => b.id === boardId)?.name ?? "the folder";
      mascotSay(`${names.length === 1 ? "Moved" : `Moved ${names.length} pictures`} to ${to}.`, "success");
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.busy = false;
    }
  }

  // ── dragging pictures onto folders ──────────────────────────────────────────

  private dragStart(e: DragEvent, img: GalleryImage) {
    const names = this.selected.has(img.name) ? [...this.selected] : [img.name];
    e.dataTransfer?.setData(DRAG_TYPE, JSON.stringify(names));
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      // The tile under the pointer stands for the lot.
      const tile = (e.currentTarget as HTMLElement).querySelector("img");
      if (tile) e.dataTransfer.setDragImage(tile, 30, 30);
    }
    this.dragging = true;
  }

  private dragEnd() {
    this.dragging = false;
    this.dropOn = "";
  }

  /** The handlers that make a folder take a drop. "All" holds everything already. */
  private dropTarget(board: GalleryBoard) {
    const can = board.id !== "all" && board.id !== this.board;
    return {
      over: (e: DragEvent) => {
        if (!can || !e.dataTransfer?.types.includes(DRAG_TYPE)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        this.dropOn = board.id;
      },
      leave: () => { if (this.dropOn === board.id) this.dropOn = ""; },
      drop: (e: DragEvent) => {
        this.dropOn = "";
        const raw = e.dataTransfer?.getData(DRAG_TYPE);
        if (!can || !raw) return;
        e.preventDefault();
        try {
          void this.moveNames(JSON.parse(raw) as string[], board.id);
        } catch {
          // Not ours.
        }
      },
    };
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
    if (this.viewing?.name !== img.name) this.open(img);
    this.coverOpen = true;
    this.coverFor = "";
    // The picker opens on the picture's own LoRA once its settings are read.
    void this.imageInfo(img).then((info) => {
      if (this.viewing?.name === img.name && !this.coverFor) this.coverFor = this.coverChoices(info).used[0] ?? "";
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

  /** The folders a picture can be moved into from where it is. */
  private moveTargets(): GalleryBoard[] {
    return this.boards.filter((b) => b.id !== this.board && b.id !== "all");
  }

  private openImageMenu(img: GalleryImage, e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const targets = this.moveTargets();
    openMenu({
      x: e.clientX,
      y: e.clientY,
      title: this.labelOf(img),
      items: [
        { label: "Open", icon: "open_in_full", run: () => this.open(img) },
        { label: "Copy prompt", icon: "content_copy", run: () => void this.copyField(img, "prompt") },
        { label: "Copy generation metadata", icon: "content_copy", run: () => void this.copyMetadata(img) },
        { label: "Use same generation parameters", icon: "replay", run: () => void this.reuseMetadata(img) },
        { label: "Start from this picture", icon: "add_photo_alternate", run: () => this.usePicture(img, "img2img") },
        ...(this.canPaint ? [{ label: "Paint to fix", icon: "brush", run: () => this.usePicture(img, "inpaint") }] : []),
        ...(this.canFixFaces ? [{ label: this.fixLabel, icon: "face_retouching_natural", run: () => this.usePicture(img, "faces") }] : []),
        ...(this.upscaleLabel ? [{ label: this.upscaleLabel, icon: "open_in_full", run: () => this.usePicture(img, "upscale") }] : []),
        menuDivider,
        ...targets.map((b) => ({ label: `Move to ${b.name}`, icon: b.id === "none" ? "inbox" : "drive_file_move", run: () => void this.moveNames([img.name], b.id) })),
        ...(this.isFolder(this.board) ? [{ label: "Set as folder cover", icon: "folder_special", run: () => void this.setFolderCover(img) }] : []),
        ...(this.canSetCovers ? [{ label: "Use as a LoRA's cover…", icon: "photo_library", run: () => this.openCover(img) }] : []),
        ...(this.own ? [{ label: "Move to library", icon: "save", run: () => void this.saveToLibrary(img) }] : []),
        { label: "Export PNG for Civitai", icon: "download", run: () => void this.exportImage(img) },
        { label: "Send to chat", icon: "forum", run: () => void this.openShareMenu(img, e.clientX, e.clientY) },
        menuDivider,
        { label: "Delete", icon: "delete", danger: true, run: () => void this.deleteImage(img) },
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
    this.viewing = null;
    this.browsing = false;
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
      this.viewing = null;
      this.browsing = false;
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
      this.viewing = null;
      this.browsing = false;
      this.dispatchEvent(new CustomEvent("open-chat", { bubbles: true, composed: true }));
    } catch (e) {
      mascotSay((e as Error).message || `Couldn't share with ${character.name}.`, "error");
    }
  }

  // ── picking ─────────────────────────────────────────────────────────────────

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
    this.pick(e, img);
  }

  /** Picks a tile: its tick, or a click in select mode. */
  private pick(e: MouseEvent, img: GalleryImage) {
    e.stopPropagation();
    if (e.shiftKey) window.getSelection()?.removeAllRanges();
    this.selecting = true;
    const next = pickClick(this.items.map((i) => i.name), { selected: this.selected, anchor: this.pickAnchor }, img.name, e);
    this.selected = next.selected;
    this.pickAnchor = next.anchor;
    if (!this.selected.size) this.selecting = false;
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

  // ── render ──────────────────────────────────────────────────────────────────

  private folderIcon(b: GalleryBoard): string {
    return b.id === "all" ? "photo_library" : this.isFolder(b.id) ? "folder" : "inbox";
  }

  private renderCover(b: GalleryBoard) {
    return b.cover && !this.failedCovers.has(b.cover)
      ? html`<img src=${api.galleryThumbURL(b.cover)} alt="" loading="lazy" draggable="false"
          @error=${() => (this.failedCovers = new Set(this.failedCovers).add(b.cover!))} />`
      : html`<span class="material-symbols-rounded">${this.folderIcon(b)}</span>`;
  }

  /** The folder being named, in place of the "+" that started it. */
  private renderNaming(cls: string) {
    return html`<div class=${cls}>
      <input maxlength="120" placeholder=${this.own ? "Folder name" : "Gallery name"} aria-label="New folder's name" .value=${this.newBoard}
        @input=${(e: Event) => (this.newBoard = (e.target as HTMLInputElement).value)}
        @keydown=${(e: KeyboardEvent) => {
          if (e.key === "Enter") void this.createBoard();
          if (e.key === "Escape") { e.stopPropagation(); this.naming = false; }
        }} />
      <div class="row">
        <button @click=${() => { this.naming = false; this.newBoard = ""; }}>Cancel</button>
        <button class="ok" ?disabled=${this.busy || !this.newBoard.trim()} @click=${() => void this.createBoard()}>Create</button>
      </div>
    </div>`;
  }

  /**
   * The folders, as cards: each its cover, its name and how many it holds. A
   * folder's cover is the picture chosen for it (the picture menu's "Set as folder
   * cover"), else its newest. A card takes dropped pictures; its menu (right-click)
   * renames or deletes it.
   */
  private renderFolderCards() {
    // A mouse wheel scrolls up and down; over a row of cards that only scrolls
    // sideways it would do nothing, and the folders past the edge were out of reach.
    const wheel = (e: WheelEvent) => {
      const el = e.currentTarget as HTMLElement;
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || el.scrollWidth <= el.clientWidth) return;
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    };
    return html`<div class="folders" role="listbox" aria-label=${this.own ? "Folders" : "Galleries"} @wheel=${wheel}>
      ${this.boards.map((b) => {
        const d = this.dropTarget(b);
        return html`<button class="folder ${b.id === this.board ? "on" : ""} ${this.dropOn === b.id ? "drop" : ""}" role="option"
          aria-selected=${b.id === this.board ? "true" : "false"} title=${b.name} @click=${() => this.pickBoard(b.id)}
          @contextmenu=${(e: MouseEvent) => this.openBoardMenu(e, b)}
          @dragover=${d.over} @dragleave=${d.leave} @drop=${d.drop}>
          <span class="folder-cover">${this.renderCover(b)}</span>
          <span class="folder-name">${b.name}</span>
          <span class="folder-count">${b.count}</span>
        </button>`;
      })}
      ${this.naming
        ? this.renderNaming("naming")
        : html`<button class="folder add" title=${this.own ? "New folder" : "New Invoke gallery"} @click=${() => (this.naming = true)}>
            <span class="material-symbols-rounded">create_new_folder</span>New
          </button>`}
    </div>`;
  }

  /** The folders down the side of the expanded gallery. */
  private renderSide() {
    return html`<nav class="side" aria-label=${this.own ? "Folders" : "Galleries"}>
      <div class="k">${this.own ? "Folders" : "Galleries"}</div>
      ${this.boards.map((b) => {
        const d = this.dropTarget(b);
        return html`<button class="side-item ${b.id === this.board ? "on" : ""} ${this.dropOn === b.id ? "drop" : ""}"
          @click=${() => this.pickBoard(b.id)} @contextmenu=${(e: MouseEvent) => this.openBoardMenu(e, b)}
          @dragover=${d.over} @dragleave=${d.leave} @drop=${d.drop}>
          <span class="thumb">${this.renderCover(b)}</span><span class="nm">${b.name}</span><span class="ct">${b.count}</span>
        </button>`;
      })}
      ${this.naming
        ? this.renderNaming("side-naming")
        : html`<button class="side-item side-new" @click=${() => (this.naming = true)}>
            <span class="thumb"><span class="material-symbols-rounded">add</span></span><span class="nm">New folder</span>
          </button>`}
    </nav>`;
  }

  private openSortMenu(e: MouseEvent) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    openMenu({
      x: r.left, y: r.bottom + 4, title: "Order",
      items: SORTS.filter((s) => this.own || !s.ownOnly).map((s) => ({
        label: s.label, icon: s.id === this.sort ? "check" : "", run: () => this.pickSort(s.id),
      })),
    });
  }

  /** Where the next run lands, said under the folders. */
  private filingNote(current: GalleryBoard | undefined) {
    if (!this.own) return html`New pictures go to <b>${current?.name ?? "this gallery"}</b>`;
    const into = current && this.isFolder(current.id) ? current.name : "Unsorted";
    return html`New pictures go to <b>${into}</b>`;
  }

  private renderTile(img: GalleryImage) {
    const picked = this.selected.has(img.name);
    return html`<div class="tile ${picked ? "picked" : ""} ${this.dragging && picked ? "dragged" : ""}" draggable="true"
      title=${this.labelOf(img)} role="button" tabindex="0" aria-pressed=${this.selecting ? (picked ? "true" : "false") : nothing}
      @click=${(e: MouseEvent) => this.clickTile(e, img)}
      @keydown=${(e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this.selecting ? this.pick(e as unknown as MouseEvent, img) : this.open(img); } }}
      @contextmenu=${(e: MouseEvent) => { if (!this.selecting) this.openImageMenu(img, e); }}
      @dragstart=${(e: DragEvent) => this.dragStart(e, img)} @dragend=${() => this.dragEnd()}>
      <img src=${api.galleryThumbURL(img.name)} alt="Generated image" loading="lazy" draggable="false" />
      <span class="shade"></span>
      <button class="tick" title=${picked ? "Unpick" : "Pick — then drag onto a folder, or use the bar below"} aria-label="Pick"
        @click=${(e: MouseEvent) => this.pick(e, img)}>
        <span class="material-symbols-rounded">${picked ? "check" : "radio_button_unchecked"}</span>
      </button>
      <span class="acts">
        ${this.own ? html`<button title="Move to the library" aria-label="Move to the library"
          @click=${(e: Event) => { e.stopPropagation(); void this.saveToLibrary(img); }}><span class="material-symbols-rounded">save</span></button>` : nothing}
        <button title="More" aria-label="More" @click=${(e: MouseEvent) => this.openImageMenu(img, e)}>
          <span class="material-symbols-rounded">more_horiz</span></button>
      </span>
    </div>`;
  }

  /** The pictures, under the day each was made while the order is by date. */
  private renderGrid() {
    if (!this.items.length) {
      if (this.loading) return html`<div class="loading">Loading…</div>`;
      return html`<div class="empty"><span class="material-symbols-rounded">${this.board === "none" || this.board === "all" ? "image" : "folder_open"}</span>
        ${this.own && this.board !== "none" && this.board !== "all"
          ? "Nothing in here yet. Drag pictures onto this folder, or pick some and use Move."
          : "Nothing here yet — every picture you make lands here."}</div>`;
    }
    const byDate = this.sort !== "largest";
    const groups = byDate ? groupByDay(this.items, new Date()) : [{ key: "all", label: "", items: this.items }];
    return html`
      ${groups.map((g) => html`
        ${g.label ? html`<div class="day">${g.label}<small>${g.items.length}</small></div>` : nothing}
        <div class="grid">${g.items.map((img) => this.renderTile(img))}</div>`)}
      ${this.items.length < this.total ? html`<div class="sentinel"></div>` : nothing}
      ${this.loading ? html`<div class="loading">Loading more…</div>` : nothing}
    `;
  }

  private renderSelBar() {
    if (!this.selecting) return nothing;
    const n = this.selected.size;
    return html`<div class="selbar">
      <span class="n">${n} picked</span>
      ${n < this.items.length ? html`<button class="link" @click=${() => this.selectAll()}>All ${this.items.length}</button>` : nothing}
      <button class="sbtn" ?disabled=${this.busy || !n} @click=${(e: MouseEvent) => {
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        openMenu({
          x: r.left, y: r.top - 8, title: this.own ? "Move to folder" : "Add to gallery",
          items: this.moveTargets().map((b) => ({ label: b.name, icon: b.id === "none" ? "inbox" : "folder", run: () => void this.moveNames([...this.selected], b.id) })),
        });
      }}><span class="material-symbols-rounded">drive_file_move</span>Move</button>
      ${this.own ? html`<button class="sbtn primary" ?disabled=${this.busy || !n} title="Move them into the library; they leave the gallery"
        @click=${() => void this.moveSelectedToLibrary()}><span class="material-symbols-rounded">save</span>Library</button>` : nothing}
      <button class="sbtn danger" ?disabled=${this.busy || !n} @click=${() => void this.deleteSelected()}>
        <span class="material-symbols-rounded">delete</span>Delete</button>
      ${this.browsing && n ? html`<span class="drag-hint">Or drag them onto a folder.</span>` : nothing}
      <button class="sbtn x" title="Stop picking" aria-label="Stop picking" @click=${() => this.toggleSelecting()}>
        <span class="material-symbols-rounded">close</span></button>
    </div>`;
  }

  render() {
    const current = this.boards.find((b) => b.id === this.board);
    const count = this.total || current?.count || 0;
    return html`
      <div class="panel ${this.selecting ? "selecting" : ""}">
        <div class="head">
          <span class="title"><span class="material-symbols-rounded">photo_library</span>${this.own ? "Gallery" : "Invoke gallery"}</span>
          <span class="count">${count ? count : ""}</span>
          <span class="grow"></span>
          ${this.items.length ? html`<button class="hbtn ${this.selecting ? "on" : ""}" title=${this.selecting ? "Stop picking" : "Pick pictures"}
            aria-pressed=${this.selecting ? "true" : "false"} @click=${() => this.toggleSelecting()}>
            <span class="material-symbols-rounded">checklist</span></button>` : nothing}
          <button class="hbtn" title="Open the gallery full screen" aria-label="Open the gallery full screen" @click=${() => (this.browsing = true)}>
            <span class="material-symbols-rounded">open_in_full</span></button>
        </div>
        ${this.boards.length ? this.renderFolderCards() : nothing}
        <div class="bar">
          <div class="where"><b>${current?.name ?? ""}</b><span>${this.filingNote(current)}</span></div>
          <button class="pill" title="Order" @click=${(e: MouseEvent) => this.openSortMenu(e)}>
            <span class="material-symbols-rounded">sort</span>${SORTS.find((s) => s.id === this.sort)?.label.replace(" first", "")}
          </button>
          ${current && this.isFolder(current.id) ? html`<button class="hbtn" title="Folder options" aria-label="Folder options"
            @click=${(e: MouseEvent) => this.openBoardMenu(e, current)}><span class="material-symbols-rounded">more_vert</span></button>` : nothing}
        </div>
        ${this.error ? html`<div class="err">${this.error}</div>` : nothing}
        ${this.browsing ? html`<div class="note">The gallery is open full screen.</div>` : this.renderGrid()}
        ${this.browsing ? nothing : this.renderSelBar()}
      </div>
      ${this.browsing ? this.renderBrowse(current, count) : nothing}
      ${this.viewing ? this.renderViewer(this.viewing) : nothing}
    `;
  }

  private renderBrowse(current: GalleryBoard | undefined, count: number) {
    const size = SIZES.find((s) => s.id === this.tileSize) ?? SIZES[1];
    return html`<div class="browse ${this.selecting ? "selecting" : ""}" role="dialog" aria-label="Gallery">
      <div class="browse-top">
        <button class="hbtn" title="Back to the studio (Esc)" aria-label="Back to the studio" @click=${() => (this.browsing = false)}>
          <span class="material-symbols-rounded">arrow_back</span></button>
        <div class="where"><b>${current?.name ?? "Gallery"}</b><span>${count} ${count === 1 ? "picture" : "pictures"} · ${this.filingNote(current)}</span></div>
        <span class="grow"></span>
        <label class="size" title="Tile size">
          <span class="material-symbols-rounded">photo_size_select_small</span>
          <input type="range" min="0" max="2" step="1" .value=${String(SIZES.indexOf(size))} aria-label="Tile size"
            @input=${(e: Event) => this.setTileSize(SIZES[Number((e.target as HTMLInputElement).value)].id)} />
          <span class="material-symbols-rounded">photo_size_select_large</span>
        </label>
        <button class="pill" @click=${(e: MouseEvent) => this.openSortMenu(e)}>
          <span class="material-symbols-rounded">sort</span>${SORTS.find((s) => s.id === this.sort)?.label}</button>
        ${this.items.length ? html`<button class="pill" @click=${() => this.toggleSelecting()}>
          <span class="material-symbols-rounded">checklist</span>${this.selecting ? "Done" : "Select"}</button>` : nothing}
        ${current && this.isFolder(current.id) ? html`<button class="hbtn" title="Folder options" aria-label="Folder options"
          @click=${(e: MouseEvent) => this.openBoardMenu(e, current)}><span class="material-symbols-rounded">more_vert</span></button>` : nothing}
      </div>
      ${this.renderSide()}
      <div class="browse-main" style="--tile:${size.px}px">
        ${this.error ? html`<div class="err">${this.error}</div>` : nothing}
        ${this.renderGrid()}
        <div style="flex:1; min-height:18px;"></div>
        ${this.renderSelBar()}
      </div>
    </div>`;
  }

  private renderViewer(img: GalleryImage) {
    const saved = this.savedNames.has(img.name);
    const at = this.items.findIndex((i) => i.name === img.name);
    const hasNext = at + 1 < this.items.length || this.items.length < this.total;
    const strip = this.items.slice(Math.max(0, at - 6), at + 7);
    const targets = this.moveTargets();
    const use = (icon: string, label: string, title: string, run: () => void) =>
      html`<button title=${title} @click=${run}><span class="material-symbols-rounded">${icon}</span>${label}</button>`;
    return html`
      <div class="viewer" role="dialog" aria-label=${this.labelOf(img)}>
        <div class="stage" @click=${(e: Event) => { if (e.target === e.currentTarget) this.viewing = null; }}>
          <div class="stage-top">
            <span class="pos">${at + 1} of ${this.total}</span>
            <span class="nm">${this.labelOf(img)}</span>
            <span class="grow"></span>
            <button class="vbtn" title="More" aria-label="More" @click=${(e: MouseEvent) => this.openImageMenu(img, e)}>
              <span class="material-symbols-rounded">more_horiz</span></button>
            <button class="vbtn" title="Close (Esc)" aria-label="Close" @click=${() => (this.viewing = null)}>
              <span class="material-symbols-rounded">close</span></button>
          </div>
          <div class="picture" @click=${(e: Event) => { if (e.target === e.currentTarget) this.viewing = null; }}>
            ${keyed(img.name, html`<img src=${api.galleryFullURL(img.name)} alt="Generated image"
              @contextmenu=${(e: MouseEvent) => this.openImageMenu(img, e)} />`)}
            <button class="vbtn nav prev" title="Previous (←)" aria-label="Previous" ?disabled=${at <= 0} @click=${() => void this.step(-1)}>
              <span class="material-symbols-rounded">chevron_left</span></button>
            <button class="vbtn nav next" title="Next (→)" aria-label="Next" ?disabled=${!hasNext} @click=${() => void this.step(1)}>
              <span class="material-symbols-rounded">chevron_right</span></button>
          </div>
          <div class="strip">
            ${strip.map((i) => html`<button class=${i.name === img.name ? "on" : ""} title=${this.labelOf(i)} @click=${() => this.open(i)}>
              <img src=${api.galleryThumbURL(i.name)} alt="" loading="lazy" /></button>`)}
          </div>
        </div>
        <aside class="info">
          <button class="big" ?disabled=${this.busy || saved} @click=${() => void this.saveToLibrary(img)}
            title=${this.own ? "Move it into the library; it leaves the gallery and the next one opens" : "Copy it into the library"}>
            <span class="material-symbols-rounded">${saved ? "check" : "save"}</span>
            ${saved ? "In the library" : this.own ? "Move to library" : "Save to library"}
          </button>
          <div>
            <div class="k">Make another from it</div>
            <div class="uses">
              ${use("add_photo_alternate", "Start from", "Start the next picture from this one", () => this.usePicture(img, "img2img"))}
              ${use("replay", "Same settings", "Put its settings back into the form", () => void this.reuseMetadata(img))}
              ${this.canPaint ? use("brush", "Paint to fix", "Paint over a part to redo it", () => this.usePicture(img, "inpaint")) : nothing}
              ${this.canFixFaces ? use("face_retouching_natural", this.fixLabel, "Redo it with ADetailer's passes, and nothing else", () => this.usePicture(img, "faces")) : nothing}
              ${this.upscaleLabel ? use("open_in_full", this.upscaleLabel, "Enlarge it without redrawing; the copy lands in the gallery", () => this.usePicture(img, "upscale")) : nothing}
              ${use("background_replace", "Cut out", "Cut the figure out of its background", () => this.dispatchEvent(new CustomEvent("cut-out", {
                detail: { url: api.galleryFullURL(img.name), name: img.name }, bubbles: true, composed: true,
              })))}
            </div>
          </div>
          <div>
            <div class="k">File it</div>
            <div class="rowbtns">
              ${targets.length ? html`<select aria-label="Move to folder" .value=${""} ?disabled=${this.busy}
                @change=${(e: Event) => { const el = e.target as HTMLSelectElement; const to = el.value; el.value = ""; void this.moveNames([img.name], to); }}>
                <option value="">${this.own ? "Move to folder…" : "Add to gallery…"}</option>
                ${targets.map((b) => html`<option value=${b.id}>${b.name}</option>`)}
              </select>` : nothing}
              ${this.isFolder(this.board) ? html`<button title="Show it on this folder's card" @click=${() => void this.setFolderCover(img)}>
                <span class="material-symbols-rounded">folder_special</span>Folder cover</button>` : nothing}
              ${this.canSetCovers ? html`<button title="Make it a LoRA's or a model's cover" @click=${() => this.openCover(img)}>
                <span class="material-symbols-rounded">photo_library</span>LoRA cover</button>` : nothing}
            </div>
          </div>
          ${this.coverOpen ? this.renderCoverPicker(img, this.info) : nothing}
          <div>
            <div class="k">Share</div>
            <div class="rowbtns">
              <button ?disabled=${this.busy} @click=${(e: MouseEvent) => void this.openShareMenu(img, e.clientX, e.clientY)}>
                <span class="material-symbols-rounded">forum</span>Send to chat</button>
              <button ?disabled=${this.busy} @click=${() => void this.exportImage(img)}>
                <span class="material-symbols-rounded">download</span>Export for Civitai</button>
            </div>
          </div>
          ${this.renderInfo(img)}
          <div class="rowbtns danger-row">
            <button ?disabled=${this.busy} title="Delete it (Del); the next one opens" @click=${() => void this.deleteImage(img, true)}>
              <span class="material-symbols-rounded">delete</span>Delete</button>
          </div>
        </aside>
      </div>
    `;
  }

  private copyButton(img: GalleryImage, field: "prompt" | "negativePrompt") {
    return html`<button class="copy" title=${field === "prompt" ? "Copy the prompt" : "Copy the negative prompt"}
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
      <select aria-label="Cover of" .value=${this.coverFor}
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
      <div class="rowbtns">
        <button ?disabled=${this.busy || !this.coverFor} @click=${() => void this.setCover(img)}>
          <span class="material-symbols-rounded">check</span>Set cover
        </button>
        <button @click=${() => (this.coverOpen = false)}>Cancel</button>
      </div>
    </div>`;
  }

  /** The open picture's settings, read from the generator's record of it. */
  private renderInfo(img: GalleryImage) {
    const i = this.info;
    const size = img.width && img.height ? `${img.width}×${img.height}` : i?.width ? `${i.width}×${i.height}` : "";
    const when = img.created ? new Date(img.created).toLocaleString() : "";
    if (!i) return html`<div class="note">${this.infoError || "Reading its settings…"}</div>`;
    return html`
      ${i.prompt
        ? html`<div><div class="k">Prompt ${this.copyButton(img, "prompt")}</div><div class="prompt">${i.prompt}</div></div>`
        : html`<div class="note">No generation settings were saved with this picture.</div>`}
      ${i.negativePrompt ? html`<div><div class="k">Negative ${this.copyButton(img, "negativePrompt")}</div><div class="prompt">${i.negativePrompt}</div></div>` : nothing}
      <div>
        <div class="k">Settings ${i.prompt ? html`<button class="copy" title="Copy everything, as A1111 writes it" @click=${() => void this.copyMetadata(img)}>
          <span class="material-symbols-rounded">content_copy</span> Copy all</button>` : nothing}</div>
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
      </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oppai-invoke-gallery": OppaiInvokeGallery;
  }
}
