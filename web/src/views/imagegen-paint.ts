import { LitElement, html, css } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { iconStyles } from "../theme.js";
import { brushPixels, paintedShare, paintsAnything, pictureAt, stampsBetween, type PaintStroke } from "../paint-mask.js";

/** What the painter hands back: the strokes (to paint over again later), the mask
    as a PNG data URL, the strength, and whether to repaint straight away. */
export interface PaintResult {
  strokes: PaintStroke[];
  mask: string;
  denoise: number;
  generate: boolean;
}

/** The brush sizes, as a share of the picture's short side. */
const BRUSHES = [
  { fraction: 0.025, label: "Fine" },
  { fraction: 0.06, label: "Medium" },
  { fraction: 0.12, label: "Broad" },
];

/**
 * Paint to fix: mark the part of a picture to redo, and the generator repaints only
 * that — a hand, a face, a stray object — and keeps every other pixel. The strokes
 * are kept in the picture's own pixels (paint-mask.ts), drawn translucent over it
 * here and white on black, at full size, as the mask that is sent.
 *
 * Opened by the studio over a picture it is starting from; "apply" carries the mask
 * back, and the composer's prompt says what goes in the painted part.
 */
@customElement("oppai-paint-mask")
export class OppaiPaintMask extends LitElement {
  @property() src = "";
  @property() name = "";
  /** The picture's own size, which the mask has to match. */
  @property({ type: Number }) width = 0;
  @property({ type: Number }) height = 0;
  @property({ attribute: false }) strokes: PaintStroke[] = [];
  @property({ type: Number }) denoise = 0.6;

  @state() private erase = false;
  @state() private brush = BRUSHES[1].fraction;
  @state() private strength = 0.6;
  @state() private drawn: PaintStroke[] = [];
  @state() private error = "";
  /** Where the brush ring is drawn, over the picture; hidden off it. */
  @state() private ring: { x: number; y: number; d: number } | null = null;
  private live: PaintStroke | null = null;

  @query("canvas") private canvas?: HTMLCanvasElement;

  static styles = [
    iconStyles,
    css`
      :host {
        position: fixed; inset: 0; z-index: 30; background: var(--oppai-scrim, rgba(0, 0, 0, 0.72));
        display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 16px;
      }
      .stage { position: relative; display: inline-block; line-height: 0; touch-action: none; }
      .stage img {
        display: block; max-width: min(100%, calc(100vw - 32px)); max-height: calc(100vh - 210px);
        border-radius: 10px; user-select: none; -webkit-user-drag: none;
      }
      canvas { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0.55; cursor: none; border-radius: 10px; }
      .ring {
        position: absolute; border: 2px solid #fff; border-radius: 50%; pointer-events: none;
        box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.6); transform: translate(-50%, -50%);
      }
      .ring.erase { border-style: dashed; }
      .bar {
        background: var(--oppai-surface); color: var(--oppai-text); border-radius: 16px; padding: 10px 12px;
        display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: center;
        max-width: min(980px, 100%); font-size: 13px;
      }
      .seg { display: inline-flex; background: var(--oppai-surface-2); border-radius: 999px; padding: 3px; gap: 2px; }
      .seg button {
        border: none; background: transparent; color: var(--oppai-text-dim); font: inherit; font-size: 12.5px;
        border-radius: 999px; padding: 5px 11px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;
      }
      .seg button.on { background: var(--oppai-surface); color: var(--oppai-text); font-weight: 600; }
      .seg .material-symbols-rounded { font-size: 17px; }
      .btn {
        border: 1px solid var(--oppai-border-strong); background: transparent; color: var(--oppai-text);
        border-radius: 999px; font: inherit; font-size: 13px; padding: 6px 12px; cursor: pointer;
        display: inline-flex; align-items: center; gap: 5px;
      }
      .btn:disabled { opacity: 0.45; cursor: default; }
      .btn.primary { background: var(--oppai-primary); color: var(--oppai-on-primary, #fff); border-color: transparent; font-weight: 600; }
      .btn .material-symbols-rounded { font-size: 17px; }
      label.strength { display: inline-flex; align-items: center; gap: 6px; color: var(--oppai-text-dim); }
      label.strength input { width: 120px; }
      .spacer { flex: 1; }
      .hint { color: var(--oppai-text-dim); font-size: 12.5px; text-align: center; max-width: 720px; }
      .err { color: var(--oppai-error, #f2b8b5); }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this.drawn = [...this.strokes];
    this.strength = this.denoise;
    window.addEventListener("keydown", this.onKey);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("keydown", this.onKey);
  }

  protected firstUpdated() {
    this.redraw();
  }

  private onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") this.close();
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      this.undo();
    }
  };

  private size(): number {
    return brushPixels(this.brush, this.width, this.height);
  }

  /** Draws every stroke onto a context at the picture's size: in colour over the
      picture, or white on black for the mask. The eraser cuts out in the first and
      paints black in the second, which comes to the same thing. */
  private paint(ctx: CanvasRenderingContext2D, strokes: PaintStroke[], mask: boolean) {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const s of strokes) {
      if (!s.points.length) continue;
      ctx.globalCompositeOperation = s.erase && !mask ? "destination-out" : "source-over";
      const colour = mask ? (s.erase ? "#000" : "#fff") : "#ff3d6e";
      ctx.strokeStyle = colour;
      ctx.fillStyle = colour;
      ctx.lineWidth = s.size;
      if (s.points.length === 1) {
        ctx.beginPath();
        ctx.arc(s.points[0].x, s.points[0].y, s.size / 2, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      ctx.beginPath();
      ctx.moveTo(s.points[0].x, s.points[0].y);
      for (const p of s.points.slice(1)) ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
  }

  private redraw() {
    const c = this.canvas;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    this.paint(ctx, this.live ? [...this.drawn, this.live] : this.drawn, false);
  }

  private at(e: PointerEvent) {
    return pictureAt(e.clientX, e.clientY, this.canvas!.getBoundingClientRect(), this.width, this.height);
  }

  private moveRing(e: PointerEvent) {
    const rect = this.canvas!.getBoundingClientRect();
    this.ring = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      d: (this.size() / this.width) * rect.width,
    };
  }

  private down(e: PointerEvent) {
    if (e.button !== 0) return;
    this.canvas!.setPointerCapture(e.pointerId);
    this.live = { erase: this.erase, size: this.size(), points: [this.at(e)] };
    this.error = "";
    this.redraw();
  }

  private move(e: PointerEvent) {
    this.moveRing(e);
    const s = this.live;
    if (!s) return;
    s.points.push(...stampsBetween(s.points[s.points.length - 1], this.at(e), s.size));
    this.redraw();
  }

  private up() {
    if (!this.live) return;
    this.drawn = [...this.drawn, this.live];
    this.live = null;
    this.redraw();
  }

  private undo() {
    this.drawn = this.drawn.slice(0, -1);
    this.redraw();
  }

  private clear() {
    this.drawn = [];
    this.redraw();
  }

  private close() {
    this.dispatchEvent(new CustomEvent("close", { bubbles: true, composed: true }));
  }

  /** The mask at the picture's own size: white where it is to be redone. */
  private maskData(): { url: string; share: number } {
    const c = document.createElement("canvas");
    c.width = this.width;
    c.height = this.height;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, c.width, c.height);
    this.paint(ctx, this.drawn, true);
    const share = paintedShare(ctx.getImageData(0, 0, c.width, c.height).data);
    return { url: c.toDataURL("image/png"), share };
  }

  private apply(generate: boolean) {
    if (!paintsAnything(this.drawn)) {
      this.error = "Paint over the part to redo first.";
      return;
    }
    const mask = this.maskData();
    if (mask.share === 0) {
      this.error = "Everything painted was rubbed out again — paint over the part to redo.";
      return;
    }
    this.dispatchEvent(new CustomEvent<PaintResult>("apply", {
      detail: { strokes: this.drawn, mask: mask.url, denoise: this.strength, generate },
      bubbles: true, composed: true,
    }));
  }

  render() {
    const ring = this.ring;
    return html`
      <div class="stage">
        <img src=${this.src} alt=${this.name} draggable="false" @load=${() => this.redraw()} />
        <canvas width=${this.width} height=${this.height}
          @pointerdown=${(e: PointerEvent) => this.down(e)}
          @pointermove=${(e: PointerEvent) => this.move(e)}
          @pointerup=${() => this.up()}
          @pointercancel=${() => this.up()}
          @pointerleave=${() => (this.ring = null)}></canvas>
        ${ring ? html`<div class="ring ${this.erase ? "erase" : ""}"
          style=${`left:${ring.x}px;top:${ring.y}px;width:${ring.d}px;height:${ring.d}px;`}></div>` : null}
      </div>
      <div class="hint ${this.error ? "err" : ""}">${this.error
        || "Paint over what to redo. The prompt below the canvas says what goes there; everything unpainted stays exactly as it is."}</div>
      <div class="bar">
        <div class="seg" role="group" aria-label="Tool">
          <button class=${this.erase ? "" : "on"} @click=${() => (this.erase = false)}>
            <span class="material-symbols-rounded">brush</span>Brush</button>
          <button class=${this.erase ? "on" : ""} @click=${() => (this.erase = true)}>
            <span class="material-symbols-rounded">ink_eraser</span>Eraser</button>
        </div>
        <div class="seg" role="group" aria-label="Brush size">
          ${BRUSHES.map((b) => html`<button class=${this.brush === b.fraction ? "on" : ""} @click=${() => (this.brush = b.fraction)}>${b.label}</button>`)}
        </div>
        <button class="btn" title="Undo (Ctrl+Z)" ?disabled=${!this.drawn.length} @click=${() => this.undo()}>
          <span class="material-symbols-rounded">undo</span>Undo</button>
        <button class="btn" ?disabled=${!this.drawn.length} @click=${() => this.clear()}>
          <span class="material-symbols-rounded">delete_sweep</span>Clear</button>
        <label class="strength" title="How far the painted part may change: low touches it up, high redraws it">
          Change
          <input type="range" min="0.2" max="1" step="0.05" .value=${String(this.strength)}
            @input=${(e: Event) => (this.strength = Number((e.target as HTMLInputElement).value))} />
          ${Math.round(this.strength * 100)}%
        </label>
        <span class="spacer"></span>
        <button class="btn" @click=${() => this.close()}>Cancel</button>
        <button class="btn" @click=${() => this.apply(false)}>
          <span class="material-symbols-rounded">check</span>Done</button>
        <button class="btn primary" @click=${() => this.apply(true)}>
          <span class="material-symbols-rounded">auto_awesome</span>Repaint</button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oppai-paint-mask": OppaiPaintMask;
  }
}
