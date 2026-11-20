/**
 * Her face on a Live2D model, as numbers.
 *
 * The renderer (views/libby-live2d.ts) owns the model; this owns what it is told each
 * frame. Kept apart so it can be tested without WebGL, a model or Live2D's runtime.
 *
 * Expressions are layered here rather than through the plugin's expression manager,
 * which holds one at a time. She wears several: the ones her mood calls for, plus any
 * worn all the time — glasses, a hat — and a change of mood fades one face out while
 * the next fades in, instead of the snap of swapping a single expression.
 */

/** One parameter an expression moves, as an .exp3.json writes it. */
export interface ExpressionParam {
  Id: string;
  Value: number;
  Blend?: "Add" | "Multiply" | "Overwrite" | string;
}

/** Her model's settings, as the server keeps them (api/libby_live2d.go). */
export interface Live2DSettings {
  name: string;
  enabled: boolean;
  expressions: { name: string; file: string; label?: string }[];
  idle?: string;
  motions: number;
  moods: Record<string, string[]>;
  worn?: string[];
  scale: number;
  x: number;
  y: number;
  files: string[];
  size: number;
  texture: number;
  createdAt: number;
}

/** How long a face takes to come and go, in seconds. */
export const FACE_FADE_SECONDS = 0.45;

/**
 * What each expression should be weighted at: 1 for the ones her mood calls for and the
 * ones she always wears, 0 for the rest. Every expression is named, so one leaving has a
 * target to fade to.
 */
export function faceTargets(emotion: string, settings: Pick<Live2DSettings, "expressions" | "moods" | "worn">): Map<string, number> {
  const on = new Set<string>([...(settings.worn ?? []), ...(settings.moods[emotion] ?? [])]);
  const out = new Map<string, number>();
  for (const e of settings.expressions) out.set(e.name, on.has(e.name) ? 1 : 0);
  return out;
}

/**
 * Moves each weight toward its target by at most dt/fade, so a face fades over `fade`
 * seconds whatever the frame rate. Returns a new map; a weight with no target fades out.
 */
export function stepWeights(current: Map<string, number>, targets: Map<string, number>, dt: number, fade = FACE_FADE_SECONDS): Map<string, number> {
  const step = fade <= 0 ? 1 : Math.max(0, dt) / fade;
  const out = new Map<string, number>();
  const names = new Set([...current.keys(), ...targets.keys()]);
  for (const name of names) {
    const from = current.get(name) ?? 0;
    const to = targets.get(name) ?? 0;
    const next = from < to ? Math.min(to, from + step) : Math.max(to, from - step);
    if (next > 0 || targets.has(name)) out.set(name, next);
  }
  return out;
}

/**
 * One parameter's value with an expression applied at a weight, by the expression's own
 * blend — Live2D's three: Add moves it by the value, Multiply scales it, Overwrite
 * replaces it — each eased in by the weight.
 */
export function blendParam(current: number, param: ExpressionParam, weight: number): number {
  if (weight <= 0) return current;
  switch (param.Blend) {
    case "Multiply": return current * (1 + (param.Value - 1) * weight);
    case "Overwrite": return current * (1 - weight) + param.Value * weight;
    default: return current + param.Value * weight;
  }
}

/**
 * How open her mouth is, from the loudness of what she is saying: quick to open, slower
 * to close, so it follows syllables without chattering on every sample. `level` is the
 * signal's RMS, 0 to about 0.5 for speech.
 */
export function mouthOpen(previous: number, level: number, dt: number): number {
  const target = Math.min(1, Math.max(0, (level - 0.02) * 6));
  const rate = target > previous ? 18 : 9;
  const k = 1 - Math.exp(-rate * Math.max(0, dt));
  return previous + (target - previous) * k;
}

/**
 * A mouth moving when there is no sound to follow — the device's own speech, which the
 * page cannot listen to. Two slow waves, so it reads as talking rather than a metronome.
 */
export function mouthWithoutSound(seconds: number): number {
  const v = 0.5 + 0.35 * Math.sin(seconds * 13) + 0.25 * Math.sin(seconds * 7.3 + 1.1);
  return Math.min(1, Math.max(0, v));
}

/**
 * Where the model goes in a frame: contained, so the whole of her fits, standing on the
 * bottom edge, then the user's own scale and nudge — x and y as fractions of the frame,
 * positive moving her right and down.
 */
export function fitModel(frame: { width: number; height: number }, model: { width: number; height: number }, adjust: { scale: number; x: number; y: number }) {
  if (model.width <= 0 || model.height <= 0 || frame.width <= 0 || frame.height <= 0) return { scale: 1, x: 0, y: 0 };
  const scale = Math.min(frame.width / model.width, frame.height / model.height) * (adjust.scale || 1);
  const width = model.width * scale, height = model.height * scale;
  return {
    scale,
    x: (frame.width - width) / 2 + adjust.x * frame.width,
    y: frame.height - height + adjust.y * frame.height,
  };
}
