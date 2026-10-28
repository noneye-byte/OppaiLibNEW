import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { iconStyles, motionStyles } from "../theme.js";
import { api, type GenLora, type LoraCivitaiResult } from "../api.js";
import { openMenu, menuDivider, type MenuItem } from "../context-menu.js";
import { isPickClick, pickClick } from "../pick-range.js";
import {
  LORA_CATEGORIES, LORA_ORDERS, baseFamily, browseLoras, categoryCounts, categoryOf, civitaiSortSummary,
  familyLabel, fitsModel, loraLabel, unfitCount, type CategoryFilter, type LoraCategoryKey, type LoraOrder,
} from "../lora-categories.js";

/**
 * The studio's LoRA picker: finding a LoRA to put on, and keeping a few hundred of
 * them sorted.
 *
 * The LoRAs that are on sit at the top with their weights, as sliders, so turning
 * one down does not mean finding its card again. Under them is the library, one tab
 * per category on a single line (the chips used to wrap across three), narrowed by
 * the search, by whether a LoRA can work with the checkpoint that is picked, and put
 * in an order of her choosing — see lora-categories.ts.
 *
 * Filing was a select laid over each card's corner, one LoRA at a time, and an
 * unsorted pile of two hundred stayed one. Now there are three ways, each for a
 * different size of job: a card's menu files that one; Sort mode picks a run of
 * cards (click, Ctrl and Shift, as in the gallery) and files them all with one tap
 * on the bar along the bottom; and a card, or the picked run, can be dragged onto a
 * category's tab. "Sort with Civitai" does the unsorted pile at once, by what each
 * LoRA's model is filed under on the catalogue (api/lora_categories.go).
 *
 * The studio owns which LoRAs are on, their weights and the filing itself; this
 * element asks for each through an event:
 *   lora-toggle {name}, lora-weight {name, weight}, lora-edit {name},
 *   lora-file {names, category} ("" for none), loras-sorted {results}.
 */

const DRAG_TYPE = "application/x-oppai-loras";
const PAGE = 60;
const PREFS_KEY = "oppai.loraPicker";

interface Prefs {
  order?: LoraOrder;
  fitOnly?: boolean;
  category?: CategoryFilter;
}

function readPrefs(): Prefs {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}") as Prefs;
  } catch {
    return {};
  }
}

@customElement("oppai-lora-picker")
export class OppaiLoraPicker extends LitElement {
  @property({ attribute: false }) loras: GenLora[] = [];
  /** The LoRAs that are on, by name, with their weights. */
  @property({ attribute: false }) selected: Record<string, number> = {};
  /** The picked checkpoint's base, which LoRAs are matched against. */
  @property() modelBase = "";
  @property({ type: Number }) thumbVersion = 0;
  /** LoRA settings can be edited (A1111 with its models folder, or InvokeAI). */
  @property({ type: Boolean }) canEdit = false;
  /** The Civitai catalogue is reachable, so the unsorted can be sorted by it. */
  @property({ type: Boolean }) civitai = false;
  /** Why the generator listed no LoRAs, when it failed to. */
  @property() error = "";

  @state() private query = "";
  @state() private category: CategoryFilter = "all";
  @state() private order: LoraOrder = "name";
  @state() private fitOnly = true;
  @state() private limit = PAGE;
  /** Sort mode: a click picks a card instead of putting it on. */
  @state() private sorting = false;
  @state() private picked = new Set<string>();
  private anchor: string | null = null;
  @state() private dropOn = "";
  @state() private civitaiRun: { done: number; total: number } | null = null;
  @state() private civitaiNote = "";
  @state() private failedThumbs = new Set<string>();

  static styles = [
    iconStyles,
    motionStyles,
    css`
      :host { display: block; color: var(--oppai-text); }
      .bar { display: flex; gap: 6px; align-items: center; margin-bottom: 10px; }
      .search { position: relative; flex: 1; min-width: 0; }
      .search input {
        width: 100%; height: 38px; box-sizing: border-box; padding: 0 12px 0 36px;
        border: 1px solid var(--oppai-border-strong); border-radius: 19px; background: var(--oppai-surface);
        color: var(--oppai-text); font: inherit; font-size: 13px; outline: none;
      }
      .search input:focus { border-color: var(--oppai-primary); }
      .search .material-symbols-rounded { position: absolute; left: 11px; top: 9px; font-size: 20px; color: var(--oppai-text-muted); pointer-events: none; }
      .icon-btn {
        flex: none; height: 38px; min-width: 38px; padding: 0 10px; box-sizing: border-box; border-radius: 19px;
        border: 1px solid var(--oppai-border-strong); background: var(--oppai-surface); color: var(--oppai-text-dim);
        display: inline-flex; align-items: center; justify-content: center; gap: 5px; font: inherit; font-size: 12px;
        font-weight: 600; cursor: pointer;
      }
      .icon-btn:hover { color: var(--oppai-text); border-color: var(--oppai-text-muted); }
      .icon-btn.on { background: var(--oppai-primary); border-color: var(--oppai-primary); color: var(--oppai-on-primary); }
      .icon-btn .material-symbols-rounded { font-size: 19px; }

      /* One line of tabs that scrolls, rather than nine chips wrapping over three. */
      .tabs {
        display: flex; gap: 4px; overflow-x: auto; scrollbar-width: none; overscroll-behavior-x: contain;
        margin: 0 -16px 10px; padding: 0 16px 2px; scroll-padding: 0 16px;
      }
      .tabs::-webkit-scrollbar { display: none; }
      .tab {
        flex: none; display: inline-flex; align-items: center; gap: 5px; height: 32px; padding: 0 11px;
        border-radius: 16px; border: 1px solid transparent; background: var(--oppai-surface); color: var(--oppai-text-dim);
        font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap;
        transition: background 0.15s ease, color 0.15s ease, transform 0.15s var(--oppai-ease-spring, ease);
      }
      .tab .material-symbols-rounded { font-size: 16px; }
      .tab .n { font-weight: 500; color: var(--oppai-text-muted); font-variant-numeric: tabular-nums; }
      .tab:hover { color: var(--oppai-text); }
      .tab.on { background: var(--oppai-primary-container); color: var(--oppai-text); }
      .tab.on .n { color: var(--oppai-text-dim); }
      .tab.zero:not(.on) { opacity: 0.5; }
      .tab.unsorted { border-color: color-mix(in srgb, var(--oppai-accent) 45%, transparent); }
      .tab.drop { background: var(--oppai-primary); color: var(--oppai-on-primary); transform: scale(1.06); }
      .tab.drop .n { color: inherit; }

      .filters { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-bottom: 12px; font-size: 12px; color: var(--oppai-text-muted); }
      .toggle {
        display: inline-flex; align-items: center; gap: 5px; height: 28px; padding: 0 10px; border-radius: 14px;
        border: 1px solid var(--oppai-border-strong); background: transparent; color: var(--oppai-text-dim);
        font: inherit; font-size: 12px; cursor: pointer;
      }
      .toggle .material-symbols-rounded { font-size: 15px; }
      .toggle.on { border-color: color-mix(in srgb, var(--oppai-primary) 60%, transparent); color: var(--oppai-text); background: color-mix(in srgb, var(--oppai-primary) 12%, transparent); }

      .section-k {
        display: flex; align-items: center; gap: 8px; margin: 2px 0 8px; font-size: 11px; font-weight: 700;
        letter-spacing: 0.7px; text-transform: uppercase; color: var(--oppai-text-muted);
      }
      .section-k .grow { flex: 1; }
      .section-k button { border: none; background: none; color: var(--oppai-primary-bright, var(--oppai-primary)); font: inherit; font-size: 11px; letter-spacing: 0; text-transform: none; cursor: pointer; padding: 2px 4px; }

      .inuse { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
      .inuse-row {
        display: grid; grid-template-columns: 40px minmax(0, 1fr) auto; grid-template-rows: auto auto; column-gap: 10px; row-gap: 2px;
        align-items: center; padding: 8px 8px 8px 8px; border-radius: 14px; background: var(--oppai-surface);
        border: 1px solid color-mix(in srgb, var(--oppai-primary) 35%, transparent);
        animation: oppai-fade-in-up 0.2s var(--oppai-ease-emphasized, ease) both;
      }
      .inuse-row .thumb { grid-column: 1; grid-row: 1 / 4; width: 40px; height: 52px; border-radius: 9px; overflow: hidden; background: var(--oppai-surface-2); display: grid; place-items: center; color: var(--oppai-text-muted); }
      .inuse-row .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .inuse-row .name { grid-column: 2; grid-row: 1; font-size: 12.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .inuse-row .x { grid-column: 3; grid-row: 1; border: none; background: none; color: var(--oppai-text-muted); width: 28px; height: 28px; border-radius: 14px; cursor: pointer; display: grid; place-items: center; }
      .inuse-row .x:hover { background: var(--oppai-surface-2); color: var(--oppai-text); }
      .weight { grid-column: 2 / 4; grid-row: 2; display: flex; align-items: center; gap: 8px; }
      .weight input[type="range"] { flex: 1; min-width: 0; accent-color: var(--oppai-primary); }
      .weight input[type="number"] {
        width: 58px; box-sizing: border-box; height: 28px; padding: 0 6px; border-radius: 8px; border: 1px solid var(--oppai-border-strong);
        background: var(--oppai-surface-2); color: var(--oppai-text); font: inherit; font-size: 12px; font-variant-numeric: tabular-nums;
      }
      .hint { grid-column: 2 / 4; grid-row: 3; font-size: 11px; color: var(--oppai-text-muted); }

      .callout {
        display: flex; flex-direction: column; gap: 8px; padding: 12px; margin-bottom: 14px; border-radius: 14px;
        background: color-mix(in srgb, var(--oppai-accent) 9%, var(--oppai-surface));
        border: 1px solid color-mix(in srgb, var(--oppai-accent) 30%, transparent); font-size: 12.5px; line-height: 1.45; color: var(--oppai-text-dim);
      }
      .callout b { color: var(--oppai-text); }
      .callout .acts { display: flex; gap: 6px; flex-wrap: wrap; }
      .callout button {
        display: inline-flex; align-items: center; gap: 5px; height: 30px; padding: 0 12px; border-radius: 15px; border: none;
        background: var(--oppai-surface-2); color: var(--oppai-text); font: inherit; font-size: 12px; font-weight: 600; cursor: pointer;
      }
      .callout button.primary { background: var(--oppai-primary); color: var(--oppai-on-primary); }
      .callout button:disabled { opacity: 0.55; cursor: default; }
      .callout button .material-symbols-rounded { font-size: 16px; }
      .progress { height: 4px; border-radius: 2px; background: var(--oppai-surface-2); overflow: hidden; }
      .progress span { display: block; height: 100%; background: var(--oppai-primary); transition: width 0.3s ease; }

      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
      .card {
        position: relative; border-radius: 14px; background: var(--oppai-surface); border: 2px solid transparent;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.16); transition: transform 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;
      }
      .card:hover { transform: translateY(-2px); border-color: var(--oppai-border-strong); }
      .card.on { border-color: var(--oppai-primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--oppai-primary) 22%, transparent); }
      .card.picked { border-color: var(--oppai-accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--oppai-accent) 25%, transparent); }
      .card.unfit { opacity: 0.55; }
      .card.dragging { opacity: 0.4; }
      .card-main { display: block; width: 100%; padding: 0; border: none; background: none; color: inherit; font: inherit; text-align: left; cursor: pointer; border-radius: 12px; overflow: hidden; }
      .art { position: relative; aspect-ratio: 3 / 4; background: var(--oppai-surface-2); display: grid; place-items: center; color: var(--oppai-text-muted); }
      .art img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .art .material-symbols-rounded.blank { font-size: 34px; }
      .badge {
        position: absolute; display: inline-flex; align-items: center; gap: 3px; height: 20px; padding: 0 7px; border-radius: 10px;
        background: rgba(0, 0, 0, 0.6); color: #fff; font-size: 10.5px; font-weight: 700; letter-spacing: 0.3px; backdrop-filter: blur(4px);
      }
      .badge .material-symbols-rounded { font-size: 13px; }
      .badge.base { left: 6px; top: 6px; }
      .badge.warn { background: color-mix(in srgb, var(--oppai-error, #f2b8b5) 80%, #000); }
      .badge.on { right: 6px; top: 6px; background: var(--oppai-primary); color: var(--oppai-on-primary); }
      .pick {
        position: absolute; right: 6px; top: 6px; width: 24px; height: 24px; border-radius: 12px; display: grid; place-items: center;
        background: rgba(0, 0, 0, 0.55); color: #fff;
      }
      .card.picked .pick { background: var(--oppai-accent); color: var(--oppai-on-accent); }
      .pick .material-symbols-rounded { font-size: 17px; }
      .card-text { padding: 7px 34px 8px 10px; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
      .card-name { font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .card-cat { display: inline-flex; align-items: center; gap: 3px; font-size: 11px; color: var(--oppai-text-muted); white-space: nowrap; overflow: hidden; }
      .card-cat .material-symbols-rounded { font-size: 13px; }
      .card-cat.none { color: color-mix(in srgb, var(--oppai-accent) 75%, var(--oppai-text-muted)); }
      .more {
        position: absolute; right: 4px; bottom: 6px; width: 28px; height: 28px; border-radius: 14px; border: none; background: none;
        color: var(--oppai-text-muted); display: grid; place-items: center; cursor: pointer;
      }
      .more:hover { background: var(--oppai-surface-2); color: var(--oppai-text); }
      .more .material-symbols-rounded { font-size: 18px; }

      .note { font-size: 12.5px; color: var(--oppai-text-muted); line-height: 1.45; padding: 6px 2px 12px; }
      .more-btn {
        width: 100%; margin-top: 12px; height: 36px; border-radius: 12px; border: 1px dashed var(--oppai-border-strong);
        background: none; color: var(--oppai-text-dim); font: inherit; font-size: 12.5px; cursor: pointer;
      }

      /* Sort mode's bar: what is picked, and a button per category to file it under. */
      .sortbar {
        position: sticky; bottom: -24px; z-index: 3; margin: 14px -16px -24px; padding: 10px 12px 14px;
        background: color-mix(in srgb, var(--oppai-surface-2) 92%, transparent); backdrop-filter: blur(10px);
        border-top: 1px solid var(--oppai-border-strong); display: flex; flex-direction: column; gap: 8px;
        animation: oppai-fade-in-up 0.2s var(--oppai-ease-emphasized, ease) both;
      }
      .sortbar-head { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--oppai-text-dim); }
      .sortbar-head b { color: var(--oppai-text); }
      .sortbar-head .grow { flex: 1; }
      .sortbar-head button { border: none; background: none; color: var(--oppai-primary-bright, var(--oppai-primary)); font: inherit; font-size: 12px; cursor: pointer; padding: 3px 6px; border-radius: 6px; }
      .sortbar-head button.done { background: var(--oppai-primary); color: var(--oppai-on-primary); font-weight: 600; padding: 4px 12px; border-radius: 12px; }
      .file-to { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 5px; }
      .file-to button {
        display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 6px 2px; border-radius: 10px; border: none;
        background: var(--oppai-surface); color: var(--oppai-text); font: inherit; font-size: 10.5px; font-weight: 600; cursor: pointer;
      }
      .file-to button .material-symbols-rounded { font-size: 18px; color: var(--oppai-primary-bright, var(--oppai-primary)); }
      .file-to button:hover:not(:disabled) { background: var(--oppai-primary-container); }
      .file-to button:disabled { opacity: 0.4; cursor: default; }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    const p = readPrefs();
    if (p.order && LORA_ORDERS.some((o) => o.id === p.order)) this.order = p.order;
    if (typeof p.fitOnly === "boolean") this.fitOnly = p.fitOnly;
    if (p.category && (p.category === "all" || p.category === "none" || LORA_CATEGORIES.some((c) => c.key === p.category))) {
      this.category = p.category;
    }
  }

  private savePrefs() {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ order: this.order, fitOnly: this.fitOnly, category: this.category } satisfies Prefs));
    } catch {
      // A private window: the picker forgets its tab, which is all.
    }
  }

  private emit<T>(name: string, detail: T) {
    this.dispatchEvent(new CustomEvent<T>(name, { detail, bubbles: true, composed: true }));
  }

  private pickCategory(c: CategoryFilter) {
    this.category = c;
    this.limit = PAGE;
    this.savePrefs();
  }

  private file(names: string[], category: LoraCategoryKey | "") {
    if (!names.length) return;
    this.emit("lora-file", { names, category });
    this.picked = new Set([...this.picked].filter((n) => !names.includes(n)));
  }

  // ── sort mode and dragging ─────────────────────────────────────────────────

  private setSorting(on: boolean) {
    this.sorting = on;
    this.picked = new Set();
    this.anchor = null;
  }

  private clickCard(e: MouseEvent, l: GenLora, order: string[]) {
    if (!this.sorting && !isPickClick(e)) {
      this.emit("lora-toggle", { name: l.name });
      return;
    }
    if (e.shiftKey) window.getSelection()?.removeAllRanges();
    this.sorting = true;
    const next = pickClick(order, { selected: this.picked, anchor: this.anchor }, l.name, e);
    this.picked = next.selected;
    this.anchor = next.anchor;
  }

  /** What a drag carries: the picked run when the card is one of it, else the card. */
  private dragStart(e: DragEvent, l: GenLora) {
    const names = this.picked.has(l.name) ? [...this.picked] : [l.name];
    e.dataTransfer?.setData(DRAG_TYPE, JSON.stringify(names));
    e.dataTransfer?.setData("text/plain", names.join(", "));
    if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
    (e.currentTarget as HTMLElement).classList.add("dragging");
  }

  private dropProps(target: CategoryFilter) {
    if (target === "all") return {};
    const key = target === "none" ? "" : target;
    return {
      over: (e: DragEvent) => {
        if (!e.dataTransfer?.types.includes(DRAG_TYPE)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        this.dropOn = target;
      },
      leave: () => { if (this.dropOn === target) this.dropOn = ""; },
      drop: (e: DragEvent) => {
        this.dropOn = "";
        const raw = e.dataTransfer?.getData(DRAG_TYPE);
        if (!raw) return;
        e.preventDefault();
        try {
          this.file(JSON.parse(raw) as string[], key);
        } catch {
          // Not ours.
        }
      },
    };
  }

  // ── Civitai ────────────────────────────────────────────────────────────────

  /** Asks Civitai about every unsorted LoRA, a batch at a time, filing as it goes. */
  private async sortWithCivitai() {
    const names = this.loras.filter((l) => !categoryOf(l)).map((l) => l.name);
    if (!names.length || this.civitaiRun) return;
    this.civitaiNote = "";
    this.civitaiRun = { done: 0, total: names.length };
    const all: LoraCivitaiResult[] = [];
    try {
      for (let i = 0; i < names.length; i += 24) {
        const { results } = await api.loraCategoryCivitai(names.slice(i, i + 24));
        all.push(...results);
        this.emit("loras-sorted", { results });
        this.civitaiRun = { done: Math.min(names.length, i + 24), total: names.length };
      }
      this.civitaiNote = civitaiSortSummary(all);
    } catch (e) {
      this.civitaiNote = `${all.length ? `${civitaiSortSummary(all)}. ` : ""}Civitai stopped answering: ${(e as Error).message}`;
    } finally {
      this.civitaiRun = null;
    }
  }

  // ── menus ──────────────────────────────────────────────────────────────────

  private openOrderMenu(e: MouseEvent) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    openMenu({
      x: r.left, y: r.bottom + 4, title: "Order",
      items: LORA_ORDERS.map((o) => ({
        label: o.label, icon: o.id === this.order ? "check" : "", run: () => { this.order = o.id; this.savePrefs(); },
      })),
    });
  }

  private openCardMenu(e: MouseEvent, l: GenLora) {
    e.preventDefault();
    e.stopPropagation();
    const on = l.name in this.selected;
    const filed = categoryOf(l);
    const names = this.picked.has(l.name) && this.picked.size > 1 ? [...this.picked] : [l.name];
    const items: MenuItem[] = [
      { label: on ? "Take it off" : "Put it on", icon: on ? "remove_circle" : "add_circle", run: () => this.emit("lora-toggle", { name: l.name }) },
      ...(this.canEdit ? [{ label: "Edit its settings", icon: "edit", run: () => this.emit("lora-edit", { name: l.name }) }] : []),
      ...(l.triggerPhrases?.length ? [{ label: "Copy trigger words", icon: "content_copy", run: () => void navigator.clipboard?.writeText(l.triggerPhrases!.join(", ")) }] : []),
      menuDivider,
      ...LORA_CATEGORIES.map((c) => ({
        label: c.label, icon: c.icon, hint: c.key === filed ? "here" : "", disabled: names.length === 1 && c.key === filed,
        run: () => this.file(names, c.key),
      })),
      { label: "Unsorted", icon: "inbox", hint: filed ? "" : "here", disabled: names.length === 1 && !filed, run: () => this.file(names, "") },
    ];
    openMenu({ x: e.clientX, y: e.clientY, title: names.length > 1 ? `File ${names.length} LoRAs under` : loraLabel(l), items });
  }

  // ── render ─────────────────────────────────────────────────────────────────

  private thumb(l: GenLora): string {
    return `${api.loraThumbURL(l.name)}&v=${this.thumbVersion}`;
  }

  private renderArt(l: GenLora, icon = "style") {
    const url = this.thumb(l);
    return this.failedThumbs.has(url)
      ? html`<span class="material-symbols-rounded blank">${icon}</span>`
      : html`<img src=${url} alt="" loading="lazy" draggable="false"
          @error=${() => (this.failedThumbs = new Set(this.failedThumbs).add(url))} />`;
  }

  private renderTabs() {
    const counts = categoryCounts(this.loras);
    const tab = (id: CategoryFilter, label: string, icon: string, n: number, extra = "") => {
      const d = this.dropProps(id);
      return html`<button class="tab ${this.category === id ? "on" : ""} ${n ? "" : "zero"} ${this.dropOn === id ? "drop" : ""} ${extra}"
        role="tab" aria-selected=${this.category === id ? "true" : "false"} @click=${() => this.pickCategory(id)}
        @dragover=${d.over} @dragleave=${d.leave} @drop=${d.drop}
        title=${id === "all" ? "Every LoRA" : `${label} — drop LoRAs here to file them`}>
        ${icon ? html`<span class="material-symbols-rounded">${icon}</span>` : nothing}${label}<span class="n">${n}</span>
      </button>`;
    };
    return html`<div class="tabs" role="tablist" aria-label="LoRA categories">
      ${tab("all", "All", "apps", counts.all)}
      ${counts.none || this.category === "none" ? tab("none", "Unsorted", "inbox", counts.none, "unsorted") : nothing}
      ${LORA_CATEGORIES.map((c) => tab(c.key, c.label, c.icon, counts[c.key]))}
    </div>`;
  }

  private renderInUse() {
    const on = this.loras.filter((l) => l.name in this.selected);
    if (!on.length) return nothing;
    return html`<div class="section-k">In use · ${on.length}<span class="grow"></span>
        ${on.length > 1 ? html`<button @click=${() => on.forEach((l) => this.emit("lora-toggle", { name: l.name }))}>Take all off</button>` : nothing}
      </div>
      <div class="inuse">
        ${on.map((l) => {
          const w = this.selected[l.name];
          const set = (v: number) => this.emit("lora-weight", { name: l.name, weight: Number.isFinite(v) ? Math.max(-2, Math.min(2, v)) : 1 });
          const range = l.weightMin && l.weightMax ? `Works at ${l.weightMin}–${l.weightMax}` : "";
          return html`<div class="inuse-row">
            <span class="thumb">${this.renderArt(l)}</span>
            <span class="name" title=${l.name}>${loraLabel(l)}</span>
            <button class="x" title="Take it off" aria-label=${`Take ${loraLabel(l)} off`} @click=${() => this.emit("lora-toggle", { name: l.name })}>
              <span class="material-symbols-rounded">close</span>
            </button>
            <div class="weight">
              <input type="range" min="-1" max="2" step="0.05" .value=${String(w)} aria-label=${`${loraLabel(l)} weight`}
                @input=${(e: Event) => set(Number((e.target as HTMLInputElement).value))} />
              <input type="number" min="-2" max="2" step="0.05" .value=${String(w)} aria-label=${`${loraLabel(l)} weight`}
                @input=${(e: Event) => set(Number((e.target as HTMLInputElement).value))} />
            </div>
            ${range || !fitsModel(l.base, this.modelBase)
              ? html`<span class="hint">${!fitsModel(l.base, this.modelBase)
                  ? `Made for ${familyLabel(baseFamily(l.base))}, not this model's ${familyLabel(baseFamily(this.modelBase))}`
                  : range}</span>`
              : nothing}
          </div>`;
        })}
      </div>`;
  }

  /** The word on the unsorted pile, and the two ways through it. */
  private renderUnsortedCallout(unsorted: number) {
    if (!unsorted || (this.category !== "none" && this.category !== "all")) return nothing;
    if (this.category === "all" && !this.civitai && !this.civitaiNote) return nothing;
    const run = this.civitaiRun;
    return html`<div class="callout">
      <span><b>${unsorted} ${unsorted === 1 ? "LoRA isn't" : "LoRAs aren't"} filed yet.</b>
        ${this.civitai ? "Civitai can file the ones it knows by what they are there; the rest can be picked and filed by hand." : "Pick them in Sort mode and file them with one tap."}</span>
      ${run ? html`<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax=${run.total} aria-valuenow=${run.done}>
          <span style="width:${Math.round((run.done / Math.max(1, run.total)) * 100)}%"></span></div>
        <span>Asking Civitai… ${run.done} of ${run.total}</span>` : nothing}
      ${this.civitaiNote ? html`<span>${this.civitaiNote}</span>` : nothing}
      <div class="acts">
        ${this.civitai ? html`<button class="primary" ?disabled=${!!run} @click=${() => void this.sortWithCivitai()}>
          <span class="material-symbols-rounded">travel_explore</span>Sort with Civitai</button>` : nothing}
        <button @click=${() => { this.pickCategory("none"); this.setSorting(true); }}>
          <span class="material-symbols-rounded">checklist</span>Sort by hand</button>
      </div>
    </div>`;
  }

  private renderCard(l: GenLora, order: string[]) {
    const on = l.name in this.selected;
    const picked = this.picked.has(l.name);
    const filed = LORA_CATEGORIES.find((c) => c.key === categoryOf(l));
    const fam = baseFamily(l.base);
    const fits = fitsModel(l.base, this.modelBase);
    return html`<div class="card ${on ? "on" : ""} ${picked ? "picked" : ""} ${fits ? "" : "unfit"}" draggable="true"
      @dragstart=${(e: DragEvent) => this.dragStart(e, l)}
      @dragend=${(e: DragEvent) => { (e.currentTarget as HTMLElement).classList.remove("dragging"); this.dropOn = ""; }}
      @contextmenu=${(e: MouseEvent) => this.openCardMenu(e, l)}>
      <button class="card-main" title=${l.name} aria-pressed=${this.sorting ? (picked ? "true" : "false") : (on ? "true" : "false")}
        @click=${(e: MouseEvent) => this.clickCard(e, l, order)}>
        <span class="art">
          ${this.renderArt(l)}
          ${fam ? html`<span class="badge base ${fits ? "" : "warn"}" title=${fits ? familyLabel(fam) : `Made for ${familyLabel(fam)} — not this model`}>${familyLabel(fam)}</span>` : nothing}
          ${this.sorting
            ? html`<span class="pick"><span class="material-symbols-rounded">${picked ? "check" : "radio_button_unchecked"}</span></span>`
            : on ? html`<span class="badge on"><span class="material-symbols-rounded">check</span>${this.selected[l.name]}</span>` : nothing}
        </span>
        <span class="card-text">
          <span class="card-name">${loraLabel(l)}</span>
          <span class="card-cat ${filed ? "" : "none"}">
            <span class="material-symbols-rounded">${filed?.icon ?? "inbox"}</span>${filed?.label ?? "Unsorted"}
          </span>
        </span>
      </button>
      <button class="more" title="More — file it, edit it" aria-label=${`More for ${loraLabel(l)}`} @click=${(e: MouseEvent) => this.openCardMenu(e, l)}>
        <span class="material-symbols-rounded">more_vert</span>
      </button>
    </div>`;
  }

  private renderSortBar(shown: GenLora[]) {
    if (!this.sorting) return nothing;
    const names = [...this.picked];
    return html`<div class="sortbar">
      <div class="sortbar-head">
        <span><b>${names.length}</b> picked</span>
        ${names.length < shown.length ? html`<button @click=${() => (this.picked = new Set(shown.map((l) => l.name)))}>Pick all ${shown.length}</button>` : nothing}
        ${names.length ? html`<button @click=${() => (this.picked = new Set())}>Clear</button>` : nothing}
        <span class="grow"></span>
        <button class="done" @click=${() => this.setSorting(false)}>Done</button>
      </div>
      <div class="file-to" role="group" aria-label="File the picked LoRAs under">
        ${LORA_CATEGORIES.map((c) => html`<button ?disabled=${!names.length} @click=${() => this.file(names, c.key)}>
          <span class="material-symbols-rounded">${c.icon}</span>${c.label}</button>`)}
        <button ?disabled=${!names.length} @click=${() => this.file(names, "")}>
          <span class="material-symbols-rounded">inbox</span>Unsorted</button>
      </div>
    </div>`;
  }

  render() {
    if (!this.loras.length) {
      return html`<div class="note">${this.error ? `LoRAs aren't available from this generator: ${this.error}` : "No LoRAs installed."}</div>`;
    }
    const fam = baseFamily(this.modelBase);
    const fitOnly = this.fitOnly && !!fam;
    const shown = browseLoras(this.loras, {
      category: this.category, query: this.query, fitOnly, modelBase: this.modelBase, order: this.order,
    });
    const order = shown.map((l) => l.name);
    const hidden = fam ? unfitCount(this.loras, this.modelBase) : 0;
    const unsorted = categoryCounts(this.loras).none;
    const orderLabel = LORA_ORDERS.find((o) => o.id === this.order)?.label ?? "";
    return html`
      <div class="bar">
        <label class="search">
          <span class="material-symbols-rounded">search</span>
          <input type="search" placeholder="Search names and trigger words" aria-label="Search LoRAs" .value=${this.query}
            @input=${(e: Event) => { this.query = (e.target as HTMLInputElement).value; this.limit = PAGE; }} />
        </label>
        <button class="icon-btn" title=${`Order: ${orderLabel}`} aria-label="Order" @click=${(e: MouseEvent) => this.openOrderMenu(e)}>
          <span class="material-symbols-rounded">sort</span>
        </button>
        <button class="icon-btn ${this.sorting ? "on" : ""}" aria-pressed=${this.sorting ? "true" : "false"}
          title="Sort mode: pick LoRAs and file them under a category" @click=${() => this.setSorting(!this.sorting)}>
          <span class="material-symbols-rounded">checklist</span>Sort
        </button>
      </div>
      ${this.renderTabs()}
      ${fam && hidden
        ? html`<div class="filters">
            <button class="toggle ${fitOnly ? "on" : ""}" aria-pressed=${fitOnly ? "true" : "false"}
              @click=${() => { this.fitOnly = !this.fitOnly; this.savePrefs(); }}>
              <span class="material-symbols-rounded">${fitOnly ? "filter_alt" : "filter_alt_off"}</span>
              ${fitOnly ? `Only ${familyLabel(fam)} · ${hidden} hidden` : `Showing all · ${hidden} not for ${familyLabel(fam)}`}
            </button>
            ${this.order !== "name" ? html`<span>${orderLabel}</span>` : nothing}
          </div>`
        : this.order !== "name" ? html`<div class="filters"><span>${orderLabel}</span></div>` : nothing}
      ${this.sorting ? nothing : this.renderInUse()}
      ${this.renderUnsortedCallout(unsorted)}
      ${!shown.length
        ? html`<div class="note">${this.query.trim()
            ? `No LoRA here matches “${this.query.trim()}”.`
            : this.category === "none" ? "Every LoRA is filed." : "Nothing filed here yet — drag a LoRA onto this tab, or use Sort."}</div>`
        : html`${this.sorting || this.loras.some((l) => l.name in this.selected) ? html`<div class="section-k">${this.sorting ? "Pick the ones to file" : "Library"}</div>` : nothing}
          <div class="grid">${shown.slice(0, this.limit).map((l) => this.renderCard(l, order))}</div>
          ${shown.length > this.limit
            ? html`<button class="more-btn" @click=${() => (this.limit += PAGE)}>Show more (${shown.length - this.limit} left)</button>`
            : nothing}`}
      ${this.renderSortBar(shown)}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oppai-lora-picker": OppaiLoraPicker;
  }
}
