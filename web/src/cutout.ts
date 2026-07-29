// Cutting a background off an image.
//
// This exists to make sprite art usable. Libby's wardrobe (and any character portrait
// laid over the app) needs a transparent PNG, but a diffusion model will only ever hand
// back an opaque rectangle. Generating against a flat backdrop and removing it
// afterwards is the practical route — no segmentation model to install, nothing to run
// on the generator box, and it works on any image the server serves.
//
// The architecture is a *mask*, and that is the whole design.
//
// The first version computed a finished canvas in one pass. Every knob therefore meant
// redoing the whole thing from the source, there was no way to combine two operations,
// and nothing could be undone because nothing was kept. A mask fixes all three: each
// operation edits an alpha buffer, operations compose because they all write to the same
// buffer, and undo is a snapshot of it.
//
// The split between *mask* operations and *compose* settings is deliberate and load
// bearing:
//
//   - Mask operations (auto-remove, remove a sampled colour, brush) are destructive and
//     go on the undo stack. They answer "which pixels are background".
//   - Compose settings (feather, spill suppression) are not destructive and are
//     re-applied from the mask on every render. They answer "how should the cut edge
//     look", which is a judgement the user re-tunes constantly — baking those into the
//     mask would make feather radius a one-way door.
//
// The automatic pass remains a *solid background* remover rather than a subject matte:
// it floods inward from the edges and stops at anything that is not the backdrop, so it
// follows the border first, then considers enclosed backdrop-coloured components with a
// stricter edge test. A white highlight surrounded by skin stays; white showing through
// dark hair goes. Clicking and brushing remain the final authority for ambiguous gaps.

/** How the cut edge is rendered from the mask. Non-destructive: changing any of these
    re-composes from the same mask rather than re-cutting. */
export interface ComposeOptions {
  /** Pixels of softening across the cut edge. 0 is a hard edge. */
  feather: number;
  /**
   * How strongly to pull the backdrop's colour out of surviving edge pixels, 0–1.
   *
   * "Spill" is the backdrop bleeding into the subject's anti-aliased rim: cut a figure
   * off a green screen and the hair keeps a green fringe, because those pixels really
   * are part green. Removing them would eat the hair; leaving them looks wrong against
   * a new background. So they are kept and their tint is walked back toward the
   * subject's own colour instead.
   */
  spill: number;
}

export const DEFAULT_COMPOSE: ComposeOptions = { feather: 2, spill: 0.5 };

/** RGBA pixels, structurally what an ImageData is. Named so the pipeline can be driven
    without a browser — see CutoutSession's constructor. */
export interface RawPixels {
  // Pinned to ArrayBuffer rather than the default ArrayBufferLike so this stays
  // assignable to ImageData's constructor, which will not accept a SharedArrayBuffer.
  data: Uint8ClampedArray<ArrayBuffer>;
  width: number;
  height: number;
}

/** Where a colour-removal starts and how far it spreads. */
export interface RemoveOptions {
  /** 1–160ish. Straight RGB distance from the sampled colour. */
  tolerance: number;
  /**
   * Contiguous limits removal to the region connected to the sampled point; global
   * removes every matching pixel in the image.
   *
   * Both are needed and neither is a safe default. Contiguous is what you want for a
   * backdrop that shows through a gap — it takes that gap and nothing else. Global is
   * what you want for a checkerboard or a backdrop broken into disconnected patches,
   * and it is also the one that will happily delete the subject's eyes if they happen
   * to match, which is why it is a deliberate choice rather than the default.
   */
  contiguous: boolean;
}

const KEEP = 255;
const CUT = 0;

/** How many undo steps to keep.
 *
 * Each is a full mask — one byte per pixel, so about a megabyte at 1024×1024. Twenty
 * of those is 20 MB, which is more than enough history for this kind of editing and
 * still small enough not to matter on a phone. */
const HISTORY_LIMIT = 20;

/**
 * An editing session over one image.
 *
 * The source pixels are read once and never written. Everything is expressed as edits
 * to `mask`, so "preserve the original image" is structural rather than a promise —
 * there is no code path here that can modify the source, and the before/after preview
 * is simply the source drawn without the mask.
 */
export class CutoutSession {
  readonly width: number;
  readonly height: number;

  /** The untouched source pixels. */
  private readonly source: RawPixels;
  /** Per-pixel alpha, KEEP or CUT. Feathering happens at compose time. */
  private mask: Uint8Array;

  private undoStack: Uint8Array[] = [];
  private redoStack: Uint8Array[] = [];

  /** The backdrop colour the automatic pass found, kept for spill suppression — the
      colour to pull *out* of the rim is the colour that was removed. */
  private key: [number, number, number];

  /**
   * `source` may be an image, a canvas, or raw pixels.
   *
   * Raw pixels are accepted so the whole mask and compose pipeline can be exercised
   * without a browser — every operation below is arithmetic over buffers, and the only
   * DOM in this class is the canvas `compose` hands back at the very end.
   */
  constructor(source: HTMLImageElement | HTMLCanvasElement | RawPixels) {
    if ("data" in source) {
      this.width = source.width;
      this.height = source.height;
      this.source = { data: source.data, width: source.width, height: source.height };
    } else {
      this.width = "naturalWidth" in source ? source.naturalWidth : source.width;
      this.height = "naturalHeight" in source ? source.naturalHeight : source.height;

      const canvas = document.createElement("canvas");
      canvas.width = this.width;
      canvas.height = this.height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("This browser wouldn't give us a canvas to work on.");
      context.drawImage(source, 0, 0);
      this.source = context.getImageData(0, 0, this.width, this.height);
    }

    this.mask = new Uint8Array(this.width * this.height).fill(KEEP);
    this.key = backdropColor(this.source.data, this.width, this.height);
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }
  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** How much of the image has been cut, 0–1. Shown so "nothing happened" and "it took
      the whole picture" are distinguishable without squinting at a checkerboard. */
  get cutFraction(): number {
    let cut = 0;
    for (let i = 0; i < this.mask.length; i++) if (this.mask[i] === CUT) cut++;
    return cut / this.mask.length;
  }

  /** Snapshots the mask before an edit. Every destructive operation calls this first. */
  private checkpoint() {
    this.undoStack.push(this.mask.slice());
    if (this.undoStack.length > HISTORY_LIMIT) this.undoStack.shift();
    // A new edit invalidates the redo branch — the usual, expected behaviour, and the
    // alternative (a tree) is not something anyone wants from a cutout tool.
    this.redoStack = [];
  }

  undo(): boolean {
    const prev = this.undoStack.pop();
    if (!prev) return false;
    this.redoStack.push(this.mask);
    this.mask = prev;
    return true;
  }

  redo(): boolean {
    const next = this.redoStack.pop();
    if (!next) return false;
    this.undoStack.push(this.mask);
    this.mask = next;
    return true;
  }

  /** Back to a fully opaque image, with the reset itself undoable. */
  reset() {
    this.checkpoint();
    this.mask.fill(KEEP);
  }

  /**
   * The automatic pass: flood inward from every border pixel, removing whatever matches
   * the backdrop.
   *
   * Replaces the mask rather than adding to it, because this is the "start again from
   * the automatic result" button — a version that accumulated would make the tolerance
   * slider a ratchet that could only ever remove more.
   */
  autoRemove(tolerance: number) {
    this.checkpoint();
    this.mask.fill(KEEP);
    this.key = backdropColor(this.source.data, this.width, this.height);

    const seeds: number[] = [];
    for (let x = 0; x < this.width; x++) {
      seeds.push(x, x + (this.height - 1) * this.width);
    }
    for (let y = 0; y < this.height; y++) {
      seeds.push(y * this.width, this.width - 1 + y * this.width);
    }
    this.flood(seeds, this.key, tolerance);
    this.removeEnclosedBackdrop(tolerance);
  }

  /** Removes enclosed backdrop holes only when the ring around them looks unlike the
   * backdrop. This is deliberately stricter than the border flood: highlights and
   * reflections can match a white screen, but their skin-toned boundary is much closer
   * in brightness than the dark hair surrounding a real background gap. */
  private removeEnclosedBackdrop(tolerance: number) {
    const data = this.source.data;
    const seen = new Uint8Array(this.mask.length);
    const [kr, kg, kb] = this.key;
    const limit = Math.max(1, tolerance);
    const keyLuma = luma(kr, kg, kb);
    const achromatic = Math.max(kr, kg, kb) - Math.min(kr, kg, kb) < 28;
    const maxArea = Math.max(16, Math.floor(this.mask.length * 0.08));

    for (let start = 0; start < this.mask.length; start++) {
      if (seen[start] || this.mask[start] === CUT || distance(data, start * 4, kr, kg, kb) > limit) continue;
      const component: number[] = [];
      const boundary = new Set<number>();
      const stack = [start];
      seen[start] = 1;

      while (stack.length) {
        const pixel = stack.pop() as number;
        component.push(pixel);
        const x = pixel % this.width;
        const y = (pixel - x) / this.width;
        const neighbors = [
          x > 0 ? pixel - 1 : -1,
          x < this.width - 1 ? pixel + 1 : -1,
          y > 0 ? pixel - this.width : -1,
          y < this.height - 1 ? pixel + this.width : -1,
        ];
        for (const next of neighbors) {
          if (next < 0 || this.mask[next] === CUT) continue;
          if (distance(data, next * 4, kr, kg, kb) <= limit) {
            if (!seen[next]) {
              seen[next] = 1;
              stack.push(next);
            }
          } else {
            boundary.add(next);
          }
        }
      }

      if (!boundary.size || component.length > maxArea) continue;
      let boundaryLuma = 0;
      let boundaryDistance = 0;
      for (const pixel of boundary) {
        const at = pixel * 4;
        boundaryLuma += luma(data[at], data[at + 1], data[at + 2]);
        boundaryDistance += distance(data, at, kr, kg, kb);
      }
      boundaryLuma /= boundary.size;
      boundaryDistance /= boundary.size;

      // On a black/white studio backdrop brightness is the clean discriminator:
      // white trapped in dark hair is far from white, while a skin highlight is not.
      const strongEdge = achromatic && keyLuma >= 200
        ? keyLuma - boundaryLuma >= 110
        : achromatic && keyLuma <= 55
          ? boundaryLuma - keyLuma >= 110
          : boundaryDistance >= Math.max(90, limit * 2.25);
      if (strongEdge) for (const pixel of component) this.mask[pixel] = CUT;
    }
  }

  /**
   * Removes the colour at (x, y) — the click-to-remove the brief asks for.
   *
   * The sampled colour also becomes the spill key, because the thing to pull out of the
   * remaining rim is whatever was just taken away.
   */
  removeAt(x: number, y: number, options: RemoveOptions) {
    const px = clamp(Math.round(x), 0, this.width - 1);
    const py = clamp(Math.round(y), 0, this.height - 1);
    const at = (py * this.width + px) * 4;
    const key: [number, number, number] = [
      this.source.data[at],
      this.source.data[at + 1],
      this.source.data[at + 2],
    ];
    this.checkpoint();
    this.key = key;

    if (options.contiguous) {
      this.flood([py * this.width + px], key, options.tolerance);
      return;
    }
    // Global: every matching pixel, connected or not.
    const limit = Math.max(1, options.tolerance);
    for (let pixel = 0; pixel < this.mask.length; pixel++) {
      if (this.mask[pixel] === CUT) continue;
      if (distance(this.source.data, pixel * 4, key[0], key[1], key[2]) <= limit) {
        this.mask[pixel] = CUT;
      }
    }
  }

  /**
   * Paints the mask. `mode` "subtract" cuts (removes from the visible image); "add"
   * restores.
   *
   * A round brush, and a plain one: no falloff in the mask itself, because the compose
   * step's feather already softens every edge including these. Baking a soft brush into
   * the mask as well would double-soften and make the feather control behave oddly at
   * the boundary between painted and flooded regions.
   */
  paint(x: number, y: number, radius: number, mode: "add" | "subtract") {
    const value = mode === "add" ? KEEP : CUT;
    const r = Math.max(1, Math.round(radius));
    const cx = Math.round(x);
    const cy = Math.round(y);
    const rr = r * r;
    const x0 = Math.max(0, cx - r);
    const x1 = Math.min(this.width - 1, cx + r);
    const y0 = Math.max(0, cy - r);
    const y1 = Math.min(this.height - 1, cy + r);
    for (let py = y0; py <= y1; py++) {
      const dy = py - cy;
      for (let px = x0; px <= x1; px++) {
        const dx = px - cx;
        if (dx * dx + dy * dy > rr) continue;
        this.mask[py * this.width + px] = value;
      }
    }
  }

  /** Opens a stroke: one checkpoint per stroke, not per pointer move.
      Without this, undo would step back through a drag one mouse event at a time. */
  beginStroke() {
    this.checkpoint();
  }

  /**
   * Renders the current state into a canvas.
   *
   * `showOriginal` draws the untouched source — the "before" of the before/after
   * preview. It reads from the same session and the same source buffer, so what it
   * shows is provably the original rather than a separately-held copy that could drift.
   */
  compose(options: ComposeOptions, showOriginal = false): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = this.width;
    canvas.height = this.height;
    const context = canvas.getContext("2d");
    if (!context) return canvas;
    const pixels = this.composePixels(options, showOriginal);
    context.putImageData(new ImageData(pixels.data, pixels.width, pixels.height), 0, 0);
    return canvas;
  }

  /**
   * The composed pixels, without a canvas.
   *
   * Split out from `compose` so the arithmetic — feathering and spill suppression — can
   * be tested directly. It is also the honest shape of this code: everything except the
   * final handoff to a canvas is buffer maths.
   */
  composePixels(options: ComposeOptions, showOriginal = false): RawPixels {
    const out: RawPixels = {
      data: new Uint8ClampedArray(this.source.data),
      width: this.width,
      height: this.height,
    };
    if (showOriginal) return out;

    const alpha = this.featheredAlpha(Math.max(0, Math.round(options.feather)));
    const spill = clamp(options.spill, 0, 1);
    const [kr, kg, kb] = this.key;

    for (let pixel = 0; pixel < alpha.length; pixel++) {
      const at = pixel * 4;
      const a = alpha[pixel];
      out.data[at + 3] = a;
      if (a === 0 || a === KEEP || spill === 0) continue;
      // A partially transparent pixel is one that was part backdrop. Pull it away from
      // the key colour in proportion to how much of it survived: the more transparent
      // it is, the more of what remains was backdrop, and the harder it is corrected.
      const strength = spill * (1 - a / KEEP);
      out.data[at] = unmix(out.data[at], kr, strength);
      out.data[at + 1] = unmix(out.data[at + 1], kg, strength);
      out.data[at + 2] = unmix(out.data[at + 2], kb, strength);
    }
    return out;
  }

  /**
   * The mask with a soft ramp across the cut boundary.
   *
   * Implemented as a distance ramp rather than a blur, and only over kept pixels. A
   * plain box blur of the mask would also make *cut* pixels partly opaque, which
   * reintroduces a halo of backdrop-coloured pixels — precisely the artefact feathering
   * is meant to remove. So a kept pixel within `radius` of the cut is scaled by how far
   * it is from it, and a cut pixel stays fully transparent.
   */
  private featheredAlpha(radius: number): Uint8Array {
    const out = new Uint8Array(this.mask.length);
    if (radius <= 0) {
      out.set(this.mask);
      return out;
    }
    // Distance to the nearest cut pixel, for kept pixels only, by two-pass chamfer —
    // O(pixels) rather than O(pixels × radius²), which matters at 1024×1024 with the
    // slider being dragged.
    const far = 1e6;
    const dist = new Float32Array(this.mask.length);
    for (let i = 0; i < this.mask.length; i++) dist[i] = this.mask[i] === CUT ? 0 : far;

    const w = this.width;
    const h = this.height;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        let d = dist[i];
        if (x > 0) d = Math.min(d, dist[i - 1] + 1);
        if (y > 0) d = Math.min(d, dist[i - w] + 1);
        if (x > 0 && y > 0) d = Math.min(d, dist[i - w - 1] + 1.414);
        if (x < w - 1 && y > 0) d = Math.min(d, dist[i - w + 1] + 1.414);
        dist[i] = d;
      }
    }
    for (let y = h - 1; y >= 0; y--) {
      for (let x = w - 1; x >= 0; x--) {
        const i = y * w + x;
        let d = dist[i];
        if (x < w - 1) d = Math.min(d, dist[i + 1] + 1);
        if (y < h - 1) d = Math.min(d, dist[i + w] + 1);
        if (x < w - 1 && y < h - 1) d = Math.min(d, dist[i + w + 1] + 1.414);
        if (x > 0 && y < h - 1) d = Math.min(d, dist[i + w - 1] + 1.414);
        dist[i] = d;
      }
    }

    for (let i = 0; i < out.length; i++) {
      if (this.mask[i] === CUT) {
        out[i] = 0;
        continue;
      }
      const d = dist[i];
      out[i] = d >= radius ? KEEP : Math.round((d / radius) * KEEP);
    }
    return out;
  }

  /** Iterative flood fill from the given seeds. An explicit stack, because a recursive
      fill blows the call stack on anything above a thumbnail — a 1024×1024 backdrop is
      a million pixels. */
  private flood(seeds: number[], key: [number, number, number], tolerance: number) {
    const limit = Math.max(1, tolerance);
    const data = this.source.data;
    const seen = new Uint8Array(this.mask.length);
    const stack = seeds.slice();
    const [kr, kg, kb] = key;

    while (stack.length) {
      const pixel = stack.pop() as number;
      if (seen[pixel]) continue;
      seen[pixel] = 1;
      if (distance(data, pixel * 4, kr, kg, kb) > limit) continue;
      this.mask[pixel] = CUT;
      const x = pixel % this.width;
      const y = (pixel - x) / this.width;
      if (x > 0) stack.push(pixel - 1);
      if (x < this.width - 1) stack.push(pixel + 1);
      if (y > 0) stack.push(pixel - this.width);
      if (y < this.height - 1) stack.push(pixel + this.width);
    }
  }
}

/** Straight RGB distance. Good enough against a flat backdrop, and cheap per pixel. */
function distance(data: Uint8ClampedArray, at: number, r: number, g: number, b: number): number {
  const dr = data[at] - r, dg = data[at + 1] - g, db = data[at + 2] - b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function luma(r: number, g: number, b: number): number {
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}

/**
 * The backdrop colour, averaged over the four corners.
 *
 * Corners rather than a histogram: on a portrait the subject is centred and the corners
 * are the pixels most reliably *not* it. Averaging four rides out a little noise or a
 * gentle vignette without needing a real mode.
 */
function backdropColor(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): [number, number, number] {
  const corners = [
    0,
    (width - 1) * 4,
    (height - 1) * width * 4,
    ((height - 1) * width + (width - 1)) * 4,
  ];
  let r = 0, g = 0, b = 0;
  for (const at of corners) {
    r += data[at];
    g += data[at + 1];
    b += data[at + 2];
  }
  return [r / 4, g / 4, b / 4];
}

/** Moves a channel away from the key colour by `strength`, clamped to a byte. */
function unmix(value: number, key: number, strength: number): number {
  return clamp(Math.round(value + (value - key) * strength), 0, 255);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** Loads a same-origin image and waits for it to decode. */
export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Couldn't load that image."));
    image.src = url;
  });
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // PNG, always: it is the only format here that carries an alpha channel, and the
    // entire point of this tool is the alpha channel.
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Couldn't encode the PNG."))),
      "image/png",
    );
  });
}
