// A sprite's clip on a green or blue screen.
//
// A square's clip used to start from her picture laid back on the white (or black) it
// was drawn on, and the cut then had to take that white off her again. It is the one
// colour the cut cannot read: her eye glints, a trim and the whites of her eyes are
// that white exactly, and pale skin is orange hair mixed with it. A saturated screen
// is none of her colours, so the cut (backend/internal/matte/screen.go) can tell her,
// the screen and a mix of the two apart at every pixel of her edge. On the real
// segmentation model and real squares made into clip frames, the screen ate a quarter
// as much of her edge as white did and lost half as many of her whites.
//
// The reviewed cutout is what goes on the screen, so the square has to be cut out
// first. And its rim still carries the white it was drawn on: a cutout's edge pixels
// are part white, which on white vanished into the cut and on a screen would be drawn
// into the clip as a pale fringe round her. So the rim is cleaned before she goes on
// the screen: an edge pixel that is a mix of her nearest solid colour and the backdrop
// she was drawn on takes her colour back. Her dark outline is no such mix and stays.

export type SpriteScreen = "green" | "blue" | "drawn";

type RGB = readonly [number, number, number];

/** The screens' colours: as saturated as video's limited range keeps them unclipped. */
export const SCREEN_COLOURS: Record<Exclude<SpriteScreen, "drawn">, RGB> = {
  green: [16, 235, 24],
  blue: [24, 56, 230],
};

/** The backdrop a square was drawn on, as its cutout's rim is mixed with. */
export function drawnColour(background: "white" | "black"): RGB {
  return background === "black" ? [8, 8, 8] : [248, 248, 248];
}

/** How far into her the rim is looked at, and how far her colour is fetched from. */
const RIM = 2;
const REACH = 6;
/** As edge.go's mixContrast and mixResidual: a mix has to be told apart from her. */
const CONTRAST = 60;
const RESIDUAL = 48;

/**
 * Lays a cutout on a screen, in place: the rim cleaned of the backdrop it was drawn on,
 * then every pixel over the screen's colour and made opaque. Returns false, leaving the
 * pixels as they were, when the picture is not cut out — there is no transparency to
 * put the screen behind.
 */
export function onScreen(px: Uint8ClampedArray, w: number, h: number, drawn: RGB, screen: RGB): boolean {
  const n = w * h;
  let clear = 0;
  for (let i = 0; i < n; i++) if (px[i * 4 + 3] < 128) clear++;
  // A handful of pixels is a stray, not a cutout: an opaque square has none, and a cut
  // one has its whole backdrop.
  if (clear < n / 50) return false;

  // Rings out from the transparency: what is within RIM of it is the rim, the rest is
  // her solid middle, which is where her colour is fetched from.
  const ring = new Uint8Array(n);
  let queue: number[] = [];
  for (let i = 0; i < n; i++) if (px[i * 4 + 3] < 128) { ring[i] = 1; queue.push(i); }
  const around = (i: number, fn: (j: number) => void) => {
    const x = i % w;
    if (x > 0) fn(i - 1);
    if (x < w - 1) fn(i + 1);
    if (i >= w) fn(i - w);
    if (i < n - w) fn(i + w);
  };
  for (let r = 2; r <= RIM + 1 && queue.length; r++) {
    const next: number[] = [];
    for (const i of queue) around(i, (j) => { if (!ring[j]) { ring[j] = r; next.push(j); } });
    queue = next;
  }
  // The nearest solid pixel to each pixel near the edge.
  const src = new Int32Array(n).fill(-1);
  queue = [];
  for (let i = 0; i < n; i++) if (!ring[i]) { src[i] = i; queue.push(i); }
  for (let pass = 0; pass < REACH + RIM && queue.length; pass++) {
    const next: number[] = [];
    for (const i of queue) around(i, (j) => { if (src[j] < 0) { src[j] = src[i]; next.push(j); } });
    queue = next;
  }

  for (let i = 0; i < n; i++) {
    const a = px[i * 4 + 3];
    const s = src[i];
    // The rim and anything partly see-through: a mix of her and the backdrop?
    if (ring[i] && a > 0 && s >= 0 && s !== i) {
      let contrast = 0, dot = 0, den = 0;
      const fb = [0, 0, 0], cb = [0, 0, 0];
      for (let c = 0; c < 3; c++) {
        fb[c] = px[s * 4 + c] - drawn[c];
        cb[c] = px[i * 4 + c] - drawn[c];
        contrast += Math.abs(fb[c]);
        dot += cb[c] * fb[c];
        den += fb[c] * fb[c];
      }
      if (contrast >= CONTRAST) {
        const t = Math.min(Math.max(dot / den, 0), 1);
        let off = 0;
        for (let c = 0; c < 3; c++) off += Math.abs(cb[c] - t * fb[c]);
        if (off <= RESIDUAL) for (let c = 0; c < 3; c++) px[i * 4 + c] = px[s * 4 + c];
      }
    }
    const k = a / 255;
    for (let c = 0; c < 3; c++) px[i * 4 + c] = Math.round(px[i * 4 + c] * k + screen[c] * (1 - k));
    px[i * 4 + 3] = 255;
  }
  return true;
}

/** What Wan is told of the screen, after the motion: so the screen stays flat and plain
    rather than becoming a room, and stays the colour the cut keys out. */
export function screenPrompt(prompt: string, screen: SpriteScreen): string {
  if (screen === "drawn") return prompt;
  const said = `The background is a flat, evenly lit, plain ${screen} screen.`;
  const p = prompt.trim();
  if (p.includes(said)) return p;
  return p ? `${p}${/[.!?]$/.test(p) ? "" : "."} ${said}` : said;
}
