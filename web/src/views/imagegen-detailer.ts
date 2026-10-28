import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { iconStyles, motionStyles } from "../theme.js";
import { api, type CivitaiDetector, type DetectorInfo, type GenLora, type InstallJob } from "../api.js";
import {
  FACE_DETECTORS, customDetectors, detectorIcon, detectorLabel, passSummary,
  type CustomPass, type DetailerValue,
} from "../detailer.js";

/**
 * The ADetailer drawer: the passes that redo parts of a picture after it is drawn,
 * and the detectors they find those parts with.
 *
 * It was a form — a checkbox, two chips, a dropdown, eight bare number fields and a
 * list of detector file names as chips — that said nothing about what would happen.
 * Now every pass is a card in the order the passes run (the faces, the hands, then
 * her own), each saying what it finds and what it does there, with the words and
 * strength every pass shares below them as sliders rather than numbers to guess.
 *
 * Adding a pass picks from the detectors ADetailer has; the ones it does not have
 * come from Civitai without leaving the drawer (api/detectors.go). ADetailer reads
 * its folder once, when Automatic1111 starts, so a detector that has just arrived is
 * shown as needing a restart rather than offered as a pass that would do nothing.
 *
 * The studio keeps the settings (they are its draft and its generate call); a change
 * comes back as "detailer-change" with the fields that moved, and a new detector in
 * the folder as "detectors-changed".
 */

/** A detector ADetailer finds things with, as the drawer shows it. */
interface Detector {
  name: string;
  label: string;
  icon: string;
  cover?: string;
  key?: string;
  size?: number;
  /** ADetailer has read it; false is a file that wants Automatic1111 restarted. */
  listed: boolean;
  /** One of ADetailer's own, which live in its install rather than the folder. */
  builtIn: boolean;
}

@customElement("oppai-detailer-panel")
export class OppaiDetailerPanel extends LitElement {
  @property({ attribute: false }) value!: DetailerValue;
  @property({ type: Boolean }) invoke = false;
  /** The generator can detail at all: ADetailer is installed (A1111), or InvokeAI. */
  @property({ type: Boolean }) available = false;
  /** What ADetailer lists, from the studio's status. */
  @property({ attribute: false }) detectors: string[] = [];
  @property({ attribute: false }) loras: GenLora[] = [];
  /** The Civitai catalogue is reachable. */
  @property({ type: Boolean }) civitai = false;
  /** Detectors can be written into A1111's models folder. */
  @property({ type: Boolean }) canInstall = false;
  /** Why not, when canInstall is off; see model-manage.ts. */
  @property() manageNote = "";

  @state() private view: "passes" | "shop" = "passes";
  @state() private files: DetectorInfo[] | null = null;
  @state() private picking = false;

  // ── the Civitai shop ──
  @state() private q = "";
  @state() private nsfw = true;
  @state() private items: CivitaiDetector[] = [];
  @state() private cursor = "";
  @state() private loading = false;
  @state() private shopError = "";
  @state() private shopLoaded = false;
  /** Downloads under way and finished, by catalogue version. */
  @state() private jobs = new Map<number, InstallJob>();
  /** The version each card would install, when it has several. */
  @state() private versionOf = new Map<number, number>();
  @state() private failedCovers = new Set<string>();
  private searchTimer = 0;
  private pollTimer = 0;

  static styles = [
    iconStyles,
    motionStyles,
    css`
      :host { display: block; color: var(--oppai-text); }
      .k {
        display: flex; align-items: center; gap: 8px; margin: 20px 0 9px; font-size: 11px; font-weight: 700;
        letter-spacing: 0.7px; text-transform: uppercase; color: var(--oppai-text-muted);
      }
      .k .grow { flex: 1; }
      .k small { font-weight: 500; letter-spacing: 0; text-transform: none; }
      .note { font-size: 12px; line-height: 1.5; color: var(--oppai-text-muted); }
      .callout {
        display: flex; gap: 9px; padding: 11px 12px; border-radius: 12px; font-size: 12px; line-height: 1.5; color: var(--oppai-text-dim);
        background: color-mix(in srgb, var(--oppai-primary) 10%, var(--oppai-surface));
        border: 1px solid color-mix(in srgb, var(--oppai-primary) 30%, transparent);
      }
      .callout.warn { background: color-mix(in srgb, var(--oppai-accent) 10%, var(--oppai-surface)); border-color: color-mix(in srgb, var(--oppai-accent) 35%, transparent); }
      .callout > .material-symbols-rounded { font-size: 18px; color: var(--oppai-primary-bright, var(--oppai-primary)); }
      .callout.warn > .material-symbols-rounded { color: var(--oppai-accent); }

      /* The switch: a checkbox drawn as a track and thumb. */
      .switch { position: relative; flex: none; width: 44px; height: 26px; cursor: pointer; }
      .switch input { position: absolute; inset: 0; opacity: 0; margin: 0; cursor: pointer; }
      .switch .track { position: absolute; inset: 0; border-radius: 13px; background: var(--oppai-surface-2); border: 2px solid var(--oppai-border-strong); box-sizing: border-box; transition: background 0.18s ease, border-color 0.18s ease; }
      .switch .track::after {
        content: ""; position: absolute; top: 4px; left: 4px; width: 14px; height: 14px; border-radius: 7px; background: var(--oppai-text-muted);
        transition: transform 0.2s var(--oppai-ease-spring, ease), background 0.18s ease, width 0.18s ease;
      }
      .switch input:checked + .track { background: var(--oppai-primary); border-color: var(--oppai-primary); }
      .switch input:checked + .track::after { transform: translateX(18px); background: var(--oppai-on-primary); }
      .switch input:focus-visible + .track { outline: 2px solid var(--oppai-primary); outline-offset: 2px; }
      .switch.small { width: 38px; height: 22px; }
      .switch.small .track::after { width: 10px; height: 10px; }
      .switch.small input:checked + .track::after { transform: translateX(16px); }

      .hero {
        display: flex; align-items: center; gap: 12px; padding: 14px; border-radius: 18px; background: var(--oppai-surface);
        border: 1px solid var(--oppai-border); transition: background 0.2s ease, border-color 0.2s ease;
      }
      .hero.on {
        background: linear-gradient(135deg, color-mix(in srgb, var(--oppai-primary) 22%, var(--oppai-surface)), var(--oppai-surface) 70%);
        border-color: color-mix(in srgb, var(--oppai-primary) 40%, transparent);
      }
      .hero-icon {
        flex: none; width: 44px; height: 44px; border-radius: 14px; display: grid; place-items: center; font-size: 24px;
        background: var(--oppai-surface-2); color: var(--oppai-text-muted); transition: background 0.2s ease, color 0.2s ease;
      }
      .hero.on .hero-icon { background: var(--oppai-primary); color: var(--oppai-on-primary); }
      .hero-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
      .hero-text b { font-size: 15px; }
      .hero-text span { font-size: 12px; color: var(--oppai-text-dim); line-height: 1.4; }

      .passes { display: flex; flex-direction: column; gap: 8px; transition: opacity 0.2s ease; }
      .passes.off { opacity: 0.55; }
      .pass {
        border-radius: 16px; background: var(--oppai-surface); border: 1px solid var(--oppai-border); overflow: hidden;
        animation: oppai-fade-in-up 0.2s var(--oppai-ease-emphasized, ease) both;
      }
      .pass.on { border-color: color-mix(in srgb, var(--oppai-primary) 35%, var(--oppai-border)); }
      .pass-head { display: flex; align-items: center; gap: 10px; padding: 10px 10px 10px 10px; }
      .pass-icon {
        flex: none; width: 38px; height: 38px; border-radius: 11px; display: grid; place-items: center; overflow: hidden;
        background: var(--oppai-surface-2); color: var(--oppai-text-muted);
      }
      .pass.on .pass-icon { background: color-mix(in srgb, var(--oppai-primary) 22%, var(--oppai-surface-2)); color: var(--oppai-primary-bright, var(--oppai-primary)); }
      .pass-icon img { width: 100%; height: 100%; object-fit: cover; }
      .pass-icon .material-symbols-rounded { font-size: 21px; }
      .pass-title { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
      .pass-title b { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .pass-title span { font-size: 11.5px; color: var(--oppai-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .pass-step { flex: none; font-size: 11px; font-weight: 700; color: var(--oppai-text-muted); width: 16px; text-align: center; }
      .pass-body { display: flex; flex-direction: column; gap: 8px; padding: 0 10px 12px; }
      .seg { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px; }
      .seg button {
        height: 30px; border-radius: 9px; border: 1px solid var(--oppai-border-strong); background: transparent; color: var(--oppai-text-dim);
        font: inherit; font-size: 11.5px; font-weight: 600; cursor: pointer;
      }
      .seg button.on { background: var(--oppai-primary-container); border-color: transparent; color: var(--oppai-text); }
      .icon-x {
        flex: none; width: 30px; height: 30px; border-radius: 15px; border: none; background: none; color: var(--oppai-text-muted);
        display: grid; place-items: center; cursor: pointer;
      }
      .icon-x:hover { background: var(--oppai-surface-2); color: var(--oppai-text); }
      .icon-x .material-symbols-rounded { font-size: 18px; }

      .field { display: flex; flex-direction: column; gap: 4px; }
      .field > span { font-size: 11px; color: var(--oppai-text-muted); }
      input.text, select.text, textarea.text {
        width: 100%; box-sizing: border-box; border: 1px solid var(--oppai-border-strong); border-radius: 10px; background: var(--oppai-surface-2);
        color: var(--oppai-text); font: inherit; font-size: 12.5px; padding: 7px 9px; outline: none;
      }
      textarea.text { resize: vertical; min-height: 54px; line-height: 1.4; }
      input.text:focus, select.text:focus, textarea.text:focus { border-color: var(--oppai-primary); }
      .row { display: flex; gap: 6px; align-items: center; }
      .row select.text { flex: 1; min-width: 0; }
      .row input.num { width: 64px; flex: none; }

      .slider { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 2px 10px; align-items: center; }
      .slider label { font-size: 12.5px; color: var(--oppai-text); }
      .slider output { font-size: 12px; font-variant-numeric: tabular-nums; color: var(--oppai-text-dim); text-align: right; min-width: 38px; }
      .slider input { grid-column: 1 / 3; width: 100%; accent-color: var(--oppai-primary); margin: 2px 0 0; }
      .slider small { grid-column: 1 / 3; font-size: 11px; color: var(--oppai-text-muted); line-height: 1.35; }
      .sliders { display: flex; flex-direction: column; gap: 14px; padding: 12px; border-radius: 16px; background: var(--oppai-surface); border: 1px solid var(--oppai-border); }
      .words { display: flex; flex-direction: column; gap: 10px; padding: 12px; border-radius: 16px; background: var(--oppai-surface); border: 1px solid var(--oppai-border); }

      .add {
        display: flex; align-items: center; justify-content: center; gap: 6px; height: 42px; border-radius: 14px;
        border: 1.5px dashed var(--oppai-border-strong); background: none; color: var(--oppai-text-dim); font: inherit; font-size: 13px;
        font-weight: 600; cursor: pointer;
      }
      .add:hover { border-color: var(--oppai-primary); color: var(--oppai-text); }
      .add .material-symbols-rounded { font-size: 19px; }
      .picker { padding: 10px; border-radius: 16px; background: var(--oppai-surface); border: 1px solid var(--oppai-border-strong); animation: oppai-fade-in-up 0.18s var(--oppai-ease-emphasized, ease) both; }
      .picker-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
      .tile {
        display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 9px 4px 8px; border-radius: 12px; border: 1px solid transparent;
        background: var(--oppai-surface-2); color: var(--oppai-text); font: inherit; font-size: 11px; font-weight: 600; text-align: center; cursor: pointer; min-width: 0;
      }
      .tile:hover { border-color: var(--oppai-primary); }
      .tile .ico { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; overflow: hidden; background: var(--oppai-surface); color: var(--oppai-primary-bright, var(--oppai-primary)); }
      .tile .ico img { width: 100%; height: 100%; object-fit: cover; }
      .tile .ico .material-symbols-rounded { font-size: 19px; }
      .tile .lbl { width: 100%; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-height: 1.25; }
      .tile.wait { opacity: 0.6; }
      .tile.shop { border: 1px dashed var(--oppai-border-strong); background: none; color: var(--oppai-text-dim); }
      .picker-foot { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; font-size: 11.5px; color: var(--oppai-text-muted); }
      .link { border: none; background: none; color: var(--oppai-primary-bright, var(--oppai-primary)); font: inherit; font-size: 12px; cursor: pointer; padding: 3px 4px; }

      .dets { display: flex; flex-direction: column; border-radius: 16px; background: var(--oppai-surface); border: 1px solid var(--oppai-border); overflow: hidden; }
      .det { display: flex; align-items: center; gap: 10px; padding: 8px 8px 8px 10px; border-top: 1px solid var(--oppai-border); }
      .det:first-child { border-top: none; }
      .det .ico { flex: none; width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; overflow: hidden; background: var(--oppai-surface-2); color: var(--oppai-text-muted); }
      .det .ico img { width: 100%; height: 100%; object-fit: cover; }
      .det .ico .material-symbols-rounded { font-size: 19px; }
      .det-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
      .det-text b { font-size: 12.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .det-text span { font-size: 11px; color: var(--oppai-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .chip { flex: none; display: inline-flex; align-items: center; gap: 3px; height: 20px; padding: 0 7px; border-radius: 10px; font-size: 10.5px; font-weight: 700; background: var(--oppai-surface-2); color: var(--oppai-text-dim); }
      .chip.ready { background: color-mix(in srgb, #4caf50 22%, var(--oppai-surface-2)); color: color-mix(in srgb, #81c784 80%, var(--oppai-text)); }
      .chip.restart { background: color-mix(in srgb, var(--oppai-accent) 25%, var(--oppai-surface-2)); color: var(--oppai-text); }
      .big-btn {
        display: flex; align-items: center; justify-content: center; gap: 7px; width: 100%; height: 42px; margin-top: 10px; border-radius: 14px; border: none;
        background: var(--oppai-primary); color: var(--oppai-on-primary); font: inherit; font-size: 13px; font-weight: 700; cursor: pointer;
      }
      .big-btn .material-symbols-rounded { font-size: 19px; }

      /* The shop. */
      .shop-head { display: flex; align-items: center; gap: 6px; margin-bottom: 12px; }
      .shop-head b { font-size: 14px; flex: 1; }
      .search { position: relative; flex: 1; min-width: 0; }
      .search input {
        width: 100%; height: 38px; box-sizing: border-box; padding: 0 12px 0 36px; border-radius: 19px; border: 1px solid var(--oppai-border-strong);
        background: var(--oppai-surface); color: var(--oppai-text); font: inherit; font-size: 13px; outline: none;
      }
      .search input:focus { border-color: var(--oppai-primary); }
      .search .material-symbols-rounded { position: absolute; left: 11px; top: 9px; font-size: 20px; color: var(--oppai-text-muted); pointer-events: none; }
      .toggle {
        flex: none; height: 38px; padding: 0 11px; border-radius: 19px; border: 1px solid var(--oppai-border-strong); background: transparent;
        color: var(--oppai-text-dim); font: inherit; font-size: 12px; font-weight: 600; cursor: pointer;
      }
      .toggle.on { background: color-mix(in srgb, var(--oppai-primary) 14%, transparent); border-color: color-mix(in srgb, var(--oppai-primary) 55%, transparent); color: var(--oppai-text); }
      .quick { display: flex; flex-wrap: wrap; gap: 5px; margin: 10px 0 12px; }
      .quick button {
        flex: none; height: 28px; padding: 0 10px; border-radius: 14px; border: none; background: var(--oppai-surface); color: var(--oppai-text-dim);
        font: inherit; font-size: 12px; cursor: pointer;
      }
      .quick button.on { background: var(--oppai-primary-container); color: var(--oppai-text); }
      .shop { display: flex; flex-direction: column; gap: 8px; }
      .item {
        display: grid; grid-template-columns: 74px minmax(0, 1fr); gap: 10px; padding: 8px; border-radius: 16px; background: var(--oppai-surface);
        border: 1px solid var(--oppai-border); animation: oppai-fade-in-up 0.2s var(--oppai-ease-emphasized, ease) both;
      }
      .item-art { position: relative; width: 74px; height: 92px; border-radius: 11px; overflow: hidden; background: var(--oppai-surface-2); display: grid; place-items: center; color: var(--oppai-text-muted); }
      .item-art img { width: 100%; height: 100%; object-fit: cover; }
      .item-art .material-symbols-rounded { font-size: 26px; }
      .item-body { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
      .item-body b { font-size: 12.5px; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      .item-meta { display: flex; flex-wrap: wrap; gap: 4px 8px; font-size: 11px; color: var(--oppai-text-muted); }
      .item-meta span { display: inline-flex; align-items: center; gap: 2px; }
      .item-meta .material-symbols-rounded { font-size: 13px; }
      .item-acts { margin-top: auto; display: flex; gap: 6px; align-items: center; }
      .item-acts select { flex: 1; min-width: 0; height: 30px; padding: 0 6px; font-size: 11.5px; }
      .install {
        flex: none; display: inline-flex; align-items: center; gap: 4px; height: 30px; padding: 0 12px; border-radius: 15px; border: none;
        background: var(--oppai-primary); color: var(--oppai-on-primary); font: inherit; font-size: 12px; font-weight: 700; cursor: pointer;
      }
      .install:disabled { opacity: 0.5; cursor: default; }
      .install.ghost { background: var(--oppai-surface-2); color: var(--oppai-text); }
      .install .material-symbols-rounded { font-size: 16px; }
      .bar { flex: 1; height: 6px; border-radius: 3px; background: var(--oppai-surface-2); overflow: hidden; }
      .bar span { display: block; height: 100%; background: var(--oppai-primary); transition: width 0.4s ease; }
      .err { font-size: 11.5px; color: var(--oppai-error, #f2b8b5); line-height: 1.35; }
      .more-btn { height: 38px; border-radius: 12px; border: 1px dashed var(--oppai-border-strong); background: none; color: var(--oppai-text-dim); font: inherit; font-size: 12.5px; cursor: pointer; }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    if (!this.invoke && this.available) void this.loadFiles();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.clearTimeout(this.searchTimer);
    window.clearTimeout(this.pollTimer);
  }

  private set(patch: Partial<DetailerValue>) {
    this.dispatchEvent(new CustomEvent<Partial<DetailerValue>>("detailer-change", { detail: patch, bubbles: true, composed: true }));
  }

  private setPass(i: number, patch: Partial<CustomPass>) {
    this.set({ custom: this.value.custom.map((p, j) => (j === i ? { ...p, ...patch } : p)) });
  }

  private async loadFiles() {
    try {
      this.files = (await api.detectors()).detectors;
    } catch {
      this.files = null;
    }
  }

  /**
   * Every detector a pass can name: ADetailer's list, the files in its folder that it
   * has not read yet, each with its catalogue name and picture when it came from
   * Civitai. Without the folder's listing, ADetailer's list alone.
   */
  private get allDetectors(): Detector[] {
    const byName = new Map<string, DetectorInfo>();
    for (const f of this.files ?? []) byName.set(f.name, f);
    const names = customDetectors([...this.detectors, ...(this.files ?? []).map((f) => f.name)]);
    return names.map((name) => {
      const f = byName.get(name);
      return {
        name,
        label: f?.civitai?.name || detectorLabel(name),
        icon: detectorIcon(name),
        cover: f?.civitai?.cover,
        key: f?.key,
        size: f?.size,
        listed: f ? f.listed : this.detectors.includes(name),
        builtIn: !f?.key,
      };
    });
  }

  private detector(name: string): Detector {
    return this.allDetectors.find((d) => d.name === name)
      ?? { name, label: detectorLabel(name), icon: detectorIcon(name), listed: false, builtIn: false };
  }

  private addPass(model: string) {
    this.set({ custom: [...this.value.custom, { model, prompt: "", lora: "", loraWeight: 0.8, denoise: 0 }] });
    this.picking = false;
  }

  // ── render: the pieces ──────────────────────────────────────────────────────

  private renderSwitch(checked: boolean, label: string, onChange: (on: boolean) => void, small = false) {
    return html`<label class="switch ${small ? "small" : ""}" title=${label}>
      <input type="checkbox" role="switch" aria-label=${label} .checked=${checked}
        @change=${(e: Event) => onChange((e.target as HTMLInputElement).checked)} />
      <span class="track"></span>
    </label>`;
  }

  private renderIcon(d: Pick<Detector, "cover" | "icon">) {
    return d.cover && !this.failedCovers.has(d.cover)
      ? html`<img src=${api.civitaiImageURL(d.cover)} alt="" loading="lazy"
          @error=${() => (this.failedCovers = new Set(this.failedCovers).add(d.cover!))} />`
      : html`<span class="material-symbols-rounded">${d.icon}</span>`;
  }

  private renderSlider(label: string, value: number, min: number, max: number, step: number,
    onInput: (v: number) => void, show: (v: number) => string, hint = "") {
    const id = `s-${label.replace(/\W+/g, "-").toLowerCase()}`;
    return html`<div class="slider">
      <label for=${id}>${label}</label>
      <output for=${id}>${show(value)}</output>
      <input id=${id} type="range" min=${min} max=${max} step=${step} .value=${String(value)}
        @input=${(e: Event) => onInput(Number((e.target as HTMLInputElement).value))} />
      ${hint ? html`<small>${hint}</small>` : nothing}
    </div>`;
  }

  private renderHero() {
    const v = this.value;
    const summary = passSummary(v, this.invoke ? [] : v.custom, (m) => this.detector(m).label);
    return html`<div class="hero ${v.enabled ? "on" : ""}">
      <span class="material-symbols-rounded hero-icon">face_retouching_natural</span>
      <div class="hero-text">
        <b>${v.enabled ? "On after every picture" : "Off"}</b>
        <span>${v.enabled
          ? summary ? `Redoes ${summary.toLowerCase().replace(/ · /g, ", ")} once a picture is drawn.` : "No pass is on, so pictures are left as drawn. Turn one on below."
          : "Pictures are left as drawn. Turn it on to redo faces, hands or anything a detector finds."}</span>
      </div>
      ${this.renderSwitch(v.enabled, "ADetailer after every picture", (on) => this.set({ enabled: on }))}
    </div>`;
  }

  private renderFacePass(step: number) {
    const v = this.value;
    const whole = v.faceModel === "person_yolov8n-seg.pt";
    return html`<div class="pass ${v.faces ? "on" : ""}">
      <div class="pass-head">
        <span class="pass-step">${v.faces ? step : ""}</span>
        <span class="pass-icon"><span class="material-symbols-rounded">${whole ? "person" : "face"}</span></span>
        <div class="pass-title"><b>${whole ? "Whole person" : "Faces"}</b>
          <span>${whole ? "Redraws each figure — for people drawn small" : "Redraws every face it finds, sharper"}</span></div>
        ${this.renderSwitch(v.faces, "Faces pass", (on) => this.set({ faces: on }), true)}
      </div>
      ${v.faces ? html`<div class="pass-body">
        <div class="seg" role="radiogroup" aria-label="Face detector">
          ${FACE_DETECTORS.map((d) => html`<button class=${d.id === v.faceModel ? "on" : ""} role="radio"
            aria-checked=${d.id === v.faceModel ? "true" : "false"} @click=${() => this.set({ faceModel: d.id })}>${d.label}</button>`)}
        </div>
      </div>` : nothing}
    </div>`;
  }

  private renderHandPass(step: number) {
    const v = this.value;
    return html`<div class="pass ${v.hands ? "on" : ""}">
      <div class="pass-head">
        <span class="pass-step">${v.hands ? step : ""}</span>
        <span class="pass-icon"><span class="material-symbols-rounded">back_hand</span></span>
        <div class="pass-title"><b>Hands</b><span>Redraws hands, for the extra and missing fingers</span></div>
        ${this.renderSwitch(v.hands, "Hands pass", (on) => this.set({ hands: on }), true)}
      </div>
    </div>`;
  }

  private renderCustomPass(p: CustomPass, i: number, step: number) {
    const d = this.detector(p.model);
    const choices = this.allDetectors;
    return html`<div class="pass on">
      <div class="pass-head">
        <span class="pass-step">${step}</span>
        <span class="pass-icon">${this.renderIcon(d)}</span>
        <div class="pass-title"><b title=${d.label}>${d.label}</b><span title=${p.model}>${p.model}</span></div>
        <button class="icon-x" title="Remove this pass" aria-label="Remove this pass"
          @click=${() => this.set({ custom: this.value.custom.filter((_, j) => j !== i) })}>
          <span class="material-symbols-rounded">close</span>
        </button>
      </div>
      <div class="pass-body">
        ${!d.listed && this.files ? html`<div class="callout warn"><span class="material-symbols-rounded">restart_alt</span>
          <span>ADetailer hasn't read this detector yet — restart Automatic1111, or this pass is skipped.</span></div>` : nothing}
        <label class="field"><span>Detector</span>
          <select class="text" @change=${(e: Event) => this.setPass(i, { model: (e.target as HTMLSelectElement).value })}>
            ${choices.some((c) => c.name === p.model) ? nothing : html`<option value=${p.model} selected>${d.label} — not in ADetailer now</option>`}
            ${choices.map((c) => html`<option value=${c.name} ?selected=${c.name === p.model}>${c.label}${c.listed ? "" : " (restart A1111)"}</option>`)}
          </select>
        </label>
        <label class="field"><span>Words for what it finds</span>
          <textarea class="text" rows="2" .value=${p.prompt} placeholder="Blank: the words every pass shares"
            @input=${(e: Event) => this.setPass(i, { prompt: (e.target as HTMLTextAreaElement).value })}></textarea>
        </label>
        <div class="field"><span>A LoRA that draws it well</span>
          <div class="row">
            <select class="text" aria-label="LoRA for this pass" @change=${(e: Event) => this.setPass(i, { lora: (e.target as HTMLSelectElement).value })}>
              <option value="" ?selected=${!p.lora}>No LoRA</option>
              ${this.loras.map((l) => html`<option value=${l.name} ?selected=${l.name === p.lora}>${l.alias || l.name}</option>`)}
            </select>
            ${p.lora ? html`<input class="text num" type="number" min="-2" max="2" step="0.05" aria-label="LoRA weight" title="LoRA weight"
              .value=${String(p.loraWeight)}
              @input=${(e: Event) => { const n = Number((e.target as HTMLInputElement).value); this.setPass(i, { loraWeight: Number.isFinite(n) ? Math.max(-2, Math.min(2, n)) : 0.8 }); }} />` : nothing}
          </div>
        </div>
        ${this.renderSlider("Redraw strength", p.denoise, 0, 1, 0.05, (n) => this.setPass(i, { denoise: n }),
          (n) => (n > 0 ? n.toFixed(2) : "Shared"), p.denoise > 0 ? "" : "At the left end it uses the strength every pass shares.")}
      </div>
    </div>`;
  }

  private renderPicker() {
    const used = new Set(this.value.custom.map((p) => p.model));
    const offer = this.allDetectors.filter((d) => !used.has(d.name));
    return html`<div class="picker">
      <div class="picker-grid">
        ${offer.map((d) => html`<button class="tile ${d.listed ? "" : "wait"}" title=${d.listed ? d.name : `${d.name} — restart Automatic1111 to use it`}
          @click=${() => this.addPass(d.name)}>
          <span class="ico">${this.renderIcon(d)}</span><span class="lbl">${d.label}</span>
        </button>`)}
        ${this.civitai ? html`<button class="tile shop" @click=${() => this.openShop()}>
          <span class="ico"><span class="material-symbols-rounded">travel_explore</span></span><span class="lbl">More on Civitai</span>
        </button>` : nothing}
      </div>
      <div class="picker-foot">
        <span>${offer.length ? "Pick what this pass looks for." : "Every detector already has a pass."}</span>
        <button class="link" @click=${() => (this.picking = false)}>Cancel</button>
      </div>
    </div>`;
  }

  private renderDetectorList() {
    const all = this.allDetectors;
    const fmt = (b?: number) => (b ? `${(b / 1048576).toFixed(b < 10485760 ? 1 : 0)} MB` : "");
    return html`<div class="k">Detectors ADetailer has<span class="grow"></span><small>${all.length}</small></div>
      ${all.length ? html`<div class="dets">
        ${all.map((d) => html`<div class="det">
          <span class="ico">${this.renderIcon(d)}</span>
          <div class="det-text"><b title=${d.label}>${d.label}</b>
            <span title=${d.name}>${[d.name, fmt(d.size)].filter(Boolean).join(" · ")}</span></div>
          ${d.builtIn ? html`<span class="chip">Built in</span>`
            : d.listed ? html`<span class="chip ready">Ready</span>`
            : html`<span class="chip restart" title="ADetailer reads its folder when Automatic1111 starts">Restart A1111</span>`}
          <button class="icon-x" title="Add a pass with it" aria-label=${`Add a pass with ${d.label}`} @click=${() => this.addPass(d.name)}>
            <span class="material-symbols-rounded">add</span></button>
          ${d.key && this.canInstall ? html`<button class="icon-x" title="Delete it from ADetailer's folder" aria-label=${`Delete ${d.label}`}
            @click=${() => void this.deleteDetector(d)}><span class="material-symbols-rounded">delete</span></button>` : nothing}
        </div>`)}
      </div>` : html`<div class="note">ADetailer didn't list its detectors — it may be an old version; update it under Extensions in Automatic1111.</div>`}
      ${this.civitai
        ? html`<button class="big-btn" @click=${() => this.openShop()}>
            <span class="material-symbols-rounded">travel_explore</span>Get detectors from Civitai</button>`
        : html`<div class="note" style="margin-top:8px;">Detectors for other parts of a body are YOLO .pt files: drop one into A1111's
            models/adetailer folder and restart it — or set Civitai up under Settings to browse them here.</div>`}`;
  }

  private async deleteDetector(d: Detector) {
    if (!d.key || !confirm(`Delete ${d.label} (${d.name}) from ADetailer's folder?`)) return;
    try {
      await api.deleteDetector(d.key);
      if (this.value.custom.some((p) => p.model === d.name)) {
        this.set({ custom: this.value.custom.filter((p) => p.model !== d.name) });
      }
      await this.loadFiles();
      this.dispatchEvent(new CustomEvent("detectors-changed", { bubbles: true, composed: true }));
    } catch (e) {
      alert((e as Error).message);
    }
  }

  private renderPasses() {
    const v = this.value;
    if (!this.available && this.invoke) {
      return html`<div class="note">This InvokeAI has no detailer node, so pictures can't have their faces or hands redone here.</div>`;
    }
    if (!this.available) {
      return html`<div class="callout"><span class="material-symbols-rounded">face_retouching_natural</span>
        <span>The passes that redo faces, hands and anything else a detector finds show up here once the ADetailer
          extension is installed in Automatic1111 — Extensions → Available → ADetailer, then restart it. It also lets a
          finished picture's faces be redone on their own.</span></div>`;
    }
    let step = 0;
    const waiting = (this.files ?? []).filter((f) => !f.listed).length;
    return html`
      ${this.renderHero()}
      ${waiting && !this.invoke ? html`<div class="callout warn" style="margin-top:10px;"><span class="material-symbols-rounded">restart_alt</span>
        <span>${waiting === 1 ? "A new detector is" : `${waiting} new detectors are`} in ADetailer's folder. It reads the folder when
          Automatic1111 starts — restart it to use ${waiting === 1 ? "it" : "them"}.</span></div>` : nothing}
      <div class="k">Passes<span class="grow"></span><small>run top to bottom</small></div>
      <div class="passes ${v.enabled ? "" : "off"}">
        ${this.renderFacePass(v.faces ? ++step : 0)}
        ${this.renderHandPass(v.hands ? ++step : 0)}
        ${this.invoke ? nothing : html`
          ${v.custom.map((p, i) => this.renderCustomPass(p, i, ++step))}
          ${this.picking ? this.renderPicker()
            : html`<button class="add" ?disabled=${v.custom.length >= 6} @click=${() => (this.picking = true)}
                title=${v.custom.length >= 6 ? "Six passes of your own is the most" : "Redo another part — eyes, feet, anything a detector finds"}>
                <span class="material-symbols-rounded">add</span>Add a pass</button>`}`}
      </div>

      <div class="k">Words every pass shares</div>
      <div class="words">
        <label class="field"><span>Detail prompt</span>
          <textarea class="text" rows="2" .value=${v.prompt} placeholder="Blank: the picture's own prompt"
            @input=${(e: Event) => this.set({ prompt: (e.target as HTMLTextAreaElement).value })}></textarea></label>
        <label class="field"><span>Negative</span>
          <textarea class="text" rows="2" .value=${v.negative} placeholder="What the redone parts should not have"
            @input=${(e: Event) => this.set({ negative: (e.target as HTMLTextAreaElement).value })}></textarea></label>
      </div>

      <div class="k">Strength and mask</div>
      <div class="sliders">
        ${this.renderSlider("Redraw strength", v.denoise, 0.05, 1, 0.05, (n) => this.set({ denoise: n }), (n) => n.toFixed(2),
          "How far a pass may move from what was drawn. 0.3–0.45 keeps the likeness; higher invents more.")}
        ${this.renderSlider("Detection confidence", v.confidence, 0.05, 1, 0.05, (n) => this.set({ confidence: n }), (n) => n.toFixed(2),
          "Lower finds more, including things that aren't there; raise it if a pass redraws the wrong part.")}
        ${this.renderSlider("Mask blur", v.maskBlur, 0, 64, 1, (n) => this.set({ maskBlur: Math.round(n) }), (n) => `${Math.round(n)} px`,
          "Softens the edge where the redone part meets the rest.")}
      </div>
      ${this.invoke ? nothing : this.renderDetectorList()}
    `;
  }

  // ── the shop ────────────────────────────────────────────────────────────────

  private openShop() {
    this.view = "shop";
    this.picking = false;
    if (!this.shopLoaded) void this.search(true);
  }

  private queueSearch() {
    window.clearTimeout(this.searchTimer);
    this.searchTimer = window.setTimeout(() => void this.search(true), 350);
  }

  private async search(reset: boolean) {
    if (this.loading && !reset) return;
    this.loading = true;
    this.shopError = "";
    const q = this.q.trim();
    try {
      const page = await api.detectorShop({ q, nsfw: this.nsfw, cursor: reset ? "" : this.cursor });
      if (q !== this.q.trim()) return; // a newer search is on its way
      this.items = reset ? page.items : [...this.items, ...page.items.filter((m) => !this.items.some((i) => i.id === m.id))];
      this.cursor = page.nextCursor ?? "";
      this.shopLoaded = true;
    } catch (e) {
      this.shopError = (e as Error).message;
    } finally {
      this.loading = false;
    }
  }

  private async install(m: CivitaiDetector) {
    const versionId = this.versionOf.get(m.id) ?? m.versions[0]?.id ?? 0;
    this.jobs = new Map(this.jobs).set(versionId, { id: 0, status: "waiting", source: "" });
    try {
      const job = await api.installDetector(m.id, versionId);
      this.jobs = new Map(this.jobs).set(versionId, job);
      this.poll();
    } catch (e) {
      this.jobs = new Map(this.jobs).set(versionId, { id: 0, status: "error", source: "", error: (e as Error).message });
    }
  }

  /** Follows the downloads until none is running, then reads the folder again. */
  private poll() {
    window.clearTimeout(this.pollTimer);
    this.pollTimer = window.setTimeout(async () => {
      let running = false;
      let finished = false;
      try {
        const { jobs } = await api.civitaiInstalls();
        const next = new Map(this.jobs);
        for (const [version, job] of this.jobs) {
          const now = jobs.find((j) => j.id === job.id);
          if (!now || !job.id) continue;
          if (job.status !== now.status && now.status === "completed") finished = true;
          next.set(version, now);
          if (now.status === "waiting" || now.status === "downloading" || now.status === "running") running = true;
        }
        this.jobs = next;
      } catch {
        running = true;
      }
      if (finished) {
        await this.loadFiles();
        this.dispatchEvent(new CustomEvent("detectors-changed", { bubbles: true, composed: true }));
      }
      if (running && this.isConnected) this.poll();
    }, 1200);
  }

  private renderInstall(m: CivitaiDetector) {
    const versionId = this.versionOf.get(m.id) ?? m.versions[0]?.id ?? 0;
    const job = this.jobs.get(versionId);
    const have = m.installedVersions.includes(versionId) || job?.status === "completed";
    if (job && (job.status === "waiting" || job.status === "downloading" || job.status === "running")) {
      const pct = job.totalBytes ? Math.round(((job.bytes ?? 0) / job.totalBytes) * 100) : 0;
      return html`<div class="bar" role="progressbar" aria-valuenow=${pct} aria-valuemin="0" aria-valuemax="100"><span style="width:${Math.max(4, pct)}%"></span></div>
        <span class="note">${pct ? `${pct}%` : "Starting…"}</span>`;
    }
    if (have) {
      const name = job?.files?.[0] ?? job?.modelKey?.split("/").pop();
      return html`<button class="install ghost" disabled><span class="material-symbols-rounded">check</span>In ADetailer</button>
        ${name && !this.value.custom.some((p) => p.model === name)
          ? html`<button class="install ghost" @click=${() => { this.addPass(name); this.view = "passes"; }} title="Add a pass with it">
              <span class="material-symbols-rounded">add</span>Pass</button>` : nothing}`;
    }
    return html`<button class="install" ?disabled=${!this.canInstall} title=${this.canInstall ? "Download it into ADetailer's folder" : this.manageNote}
      @click=${() => void this.install(m)}><span class="material-symbols-rounded">download</span>Install</button>`;
  }

  private renderShop() {
    const fmtN = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n));
    const quick = ["eyes", "hands", "feet", "nipples", "pussy", "penis", "face", "text"];
    return html`
      <div class="shop-head">
        <button class="icon-x" title="Back to the passes" aria-label="Back" @click=${() => (this.view = "passes")}>
          <span class="material-symbols-rounded">arrow_back</span></button>
        <b>Detectors on Civitai</b>
      </div>
      <div class="row">
        <label class="search"><span class="material-symbols-rounded">search</span>
          <input type="search" placeholder="What should it find?" aria-label="Search detectors" .value=${this.q}
            @input=${(e: Event) => { this.q = (e.target as HTMLInputElement).value; this.queueSearch(); }} /></label>
        <button class="toggle ${this.nsfw ? "on" : ""}" aria-pressed=${this.nsfw ? "true" : "false"} title="Show adult detectors"
          @click=${() => { this.nsfw = !this.nsfw; void this.search(true); }}>18+</button>
      </div>
      <div class="quick">
        ${quick.map((w) => html`<button class=${this.q.trim().toLowerCase() === w ? "on" : ""}
          @click=${() => { this.q = this.q.trim().toLowerCase() === w ? "" : w; void this.search(true); }}>${w}</button>`)}
      </div>
      ${this.canInstall ? nothing : html`<div class="callout warn" style="margin-bottom:10px;"><span class="material-symbols-rounded">folder_off</span>
        <span>${this.manageNote || "Installing needs Automatic1111's models folder."}</span></div>`}
      ${this.shopError ? html`<div class="err" style="margin-bottom:8px;">${this.shopError}</div>` : nothing}
      <div class="shop">
        ${this.items.map((m) => {
          const versionId = this.versionOf.get(m.id) ?? m.versions[0]?.id ?? 0;
          const version = m.versions.find((v) => v.id === versionId);
          const job = this.jobs.get(versionId);
          const cover = m.cover;
          return html`<div class="item">
            <div class="item-art">${cover && !this.failedCovers.has(cover)
              ? html`<img src=${api.civitaiImageURL(cover)} alt="" loading="lazy" @error=${() => (this.failedCovers = new Set(this.failedCovers).add(cover))} />`
              : html`<span class="material-symbols-rounded">${detectorIcon(m.name)}</span>`}</div>
            <div class="item-body">
              <b title=${m.name}>${m.name}</b>
              <div class="item-meta">
                ${m.creator ? html`<span>${m.creator}</span>` : nothing}
                <span><span class="material-symbols-rounded">download</span>${fmtN(m.downloads)}</span>
                ${m.likes ? html`<span><span class="material-symbols-rounded">thumb_up</span>${fmtN(m.likes)}</span>` : nothing}
                ${version?.sizeMB ? html`<span>${version.sizeMB} MB</span>` : nothing}
              </div>
              <div class="item-acts">
                ${m.versions.length > 1 ? html`<select class="text" aria-label="Version"
                  @change=${(e: Event) => (this.versionOf = new Map(this.versionOf).set(m.id, Number((e.target as HTMLSelectElement).value)))}>
                  ${m.versions.map((v) => html`<option value=${v.id} ?selected=${v.id === versionId}>${v.name}${m.installedVersions.includes(v.id) ? " ✓" : ""}</option>`)}
                </select>` : nothing}
                ${this.renderInstall(m)}
              </div>
              ${job?.status === "error" ? html`<div class="err">${job.error}</div>` : nothing}
            </div>
          </div>`;
        })}
      </div>
      ${this.loading ? html`<div class="note" style="padding:12px 2px;">Asking Civitai…</div>` : nothing}
      ${!this.loading && this.shopLoaded && !this.items.length ? html`<div class="note" style="padding:12px 2px;">Nothing on Civitai matches that.</div>` : nothing}
      ${!this.loading && this.cursor ? html`<button class="more-btn" style="width:100%; margin-top:10px;" @click=${() => void this.search(false)}>Show more</button>` : nothing}
      <div class="note" style="margin-top:14px;">A detector arrives in A1111's models/adetailer folder, unpacked if it comes as a .zip.
        ADetailer reads that folder when Automatic1111 starts, so restart it before a new one can be used.</div>
    `;
  }

  render() {
    if (!this.value) return nothing;
    return this.view === "shop" && !this.invoke ? this.renderShop() : this.renderPasses();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oppai-detailer-panel": OppaiDetailerPanel;
  }
}
