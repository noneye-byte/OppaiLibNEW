/**
 * Comparing LoRAs side by side: the same prompt, the same seed, the same checkpoint,
 * one picture per LoRA at each weight — so the only thing that differs between two
 * pictures is the LoRA, and which of several runs came out best can be seen rather
 * than guessed. A row without any LoRA is the baseline, what the checkpoint draws on
 * its own.
 *
 * The sheet is a row per LoRA and a column per combination of what is being varied
 * across it: the weight, and optionally the seed (a LoRA that only looks good on one
 * seed is a lucky seed, not a good LoRA) and the prompt (one that only works on the
 * prompt it was sampled with has learnt the prompt).
 *
 * Each LoRA's trigger word goes into its own row's prompt: a LoRA trained on a
 * trigger does little without it, and one prompt typed for all of them cannot name
 * every trigger. "{trigger}" in the prompt marks where it goes; without it, it leads.
 * Leaving the triggers out altogether shows how much of the LoRA leaks in without
 * being asked for.
 */

export interface CompareLora {
  /** The name the generate call's loras list wants. */
  name: string;
  trigger?: string;
  /** The checkpoint it was trained against, when it was trained here. */
  checkpoint?: string;
}

/** One column of the sheet: a weight, a seed and a prompt. */
export interface CompareColumn {
  key: string;
  weight: number;
  seed: number;
  /** Which of the prompts, from 0. */
  prompt: number;
  /** What sets this column apart from the others, for its header. */
  label: string;
}

export interface CompareCell {
  key: string;
  lora: CompareLora | null;
  weight: number;
  seed: number;
  prompt: string;
  checkpoint: string;
}

export interface CompareRow {
  lora: CompareLora | null;
  /** One per column; null where the row has nothing to draw (the baseline's other weights). */
  cells: (CompareCell | null)[];
}

export interface ComparePlan {
  columns: CompareColumn[];
  rows: CompareRow[];
}

/** The most seeds, and prompts, a sheet varies across. */
export const MAX_SEEDS = 4;
export const MAX_PROMPTS = 4;

const TRIGGER_MARK = /\{trigger\}/gi;

/** The prompt for one LoRA: its trigger where {trigger} is, or first. */
export function withTrigger(prompt: string, trigger: string | undefined): string {
  const t = (trigger ?? "").trim();
  if (prompt.toLowerCase().includes("{trigger}")) return tidyCommas(prompt.replace(TRIGGER_MARK, t));
  if (!t) return prompt.trim();
  const already = new RegExp(`(^|[\\s,(])${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[\\s,):])`, "i");
  if (already.test(prompt)) return prompt.trim();
  return prompt.trim() ? `${t}, ${prompt.trim()}` : t;
}

/** Commas left doubled or dangling where an empty trigger was taken out. */
function tidyCommas(s: string): string {
  return s
    .replace(/\s*,\s*(,\s*)+/g, ", ")
    .replace(/^\s*,\s*|\s*,\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** The weights to try, from what was typed: "0.6, 0.8 1" → [0.6, 0.8, 1]. At most
 *  five, each within what a generator takes, in the order given; [1] when none. */
export function parseWeights(text: string): number[] {
  const out: number[] = [];
  for (const part of text.split(/[\s,;]+/)) {
    if (!part) continue;
    const n = Number(part);
    if (!Number.isFinite(n)) continue;
    const w = Math.round(Math.max(-2, Math.min(2, n)) * 100) / 100;
    if (w !== 0 && !out.includes(w)) out.push(w);
    if (out.length === 5) break;
  }
  return out.length ? out : [1];
}

/** The seeds for a sheet: the one chosen and the ones after it, so the same sheet
 *  can be drawn again from the first seed alone. */
export function seedsFrom(first: number, count: number): number[] {
  const n = Math.max(1, Math.min(MAX_SEEDS, Math.floor(count) || 1));
  return Array.from({ length: n }, (_, i) => first + i);
}

/** The prompts for a sheet: the main one, then one per non-empty line of the extras. */
export function promptsFrom(main: string, extra: string): string[] {
  const more = extra.split("\n").map((l) => l.trim()).filter(Boolean);
  return [main, ...more].slice(0, MAX_PROMPTS);
}

/** Every column, weights innermost so a LoRA's weights for one seed sit together. */
export function compareColumns(weights: number[], seeds: number[], prompts: number): CompareColumn[] {
  const cols: CompareColumn[] = [];
  for (let p = 0; p < Math.max(1, prompts); p++) {
    for (const seed of seeds) {
      for (const weight of weights) {
        const parts: string[] = [];
        if (prompts > 1) parts.push(`Prompt ${p + 1}`);
        if (seeds.length > 1) parts.push(`Seed ${seed}`);
        if (weights.length > 1 || !parts.length) parts.push(`Weight ${weight}`);
        cols.push({ key: `p${p}s${seed}w${weight}`, weight, seed, prompt: p, label: parts.join(" · ") });
      }
    }
  }
  return cols;
}

/**
 * Every picture to make, row by row. The baseline is one picture per seed and
 * prompt, not one per weight: without a LoRA, the weight changes nothing, so it sits
 * under each group's first weight. With ownCheckpoint, a LoRA trained here is drawn
 * on the checkpoint it was trained against — a Pony LoRA on an SD 1.5 checkpoint
 * draws noise — and anything else on the one chosen.
 */
export function comparePlan(opts: {
  loras: CompareLora[];
  weights: number[];
  seeds: number[];
  prompts: string[];
  baseline: boolean;
  checkpoint: string;
  ownCheckpoint: boolean;
  /** False draws every row without its trigger word. */
  triggers?: boolean;
}): ComparePlan {
  const prompts = opts.prompts.length ? opts.prompts : [""];
  const columns = compareColumns(opts.weights, opts.seeds, prompts.length);
  const first = opts.weights[0];
  const rows: CompareRow[] = [];
  if (opts.baseline) {
    rows.push({
      lora: null,
      cells: columns.map((c) =>
        c.weight === first
          ? { key: `base:${c.key}`, lora: null, weight: 0, seed: c.seed, prompt: withTrigger(prompts[c.prompt], ""), checkpoint: opts.checkpoint }
          : null),
    });
  }
  for (const lora of opts.loras) {
    const checkpoint = opts.ownCheckpoint && lora.checkpoint ? lora.checkpoint : opts.checkpoint;
    const trigger = opts.triggers === false ? "" : lora.trigger;
    rows.push({
      lora,
      cells: columns.map((c) => ({
        key: `${lora.name}:${c.key}`,
        lora,
        weight: c.weight,
        seed: c.seed,
        prompt: withTrigger(prompts[c.prompt], trigger),
        checkpoint,
      })),
    });
  }
  return { columns, rows };
}

/** How many pictures a plan makes. */
export function planSize(plan: ComparePlan): number {
  return plan.rows.reduce((n, r) => n + r.cells.filter(Boolean).length, 0);
}

/** Where each part of a downloaded sheet goes: a label column, a header row, and
 *  square cells with a gap between. */
export function sheetLayout(columns: number, rows: number, cell: number) {
  const gap = Math.round(cell / 32);
  const label = Math.round(cell * 0.75);
  const header = Math.round(cell / 6);
  return {
    width: label + columns * (cell + gap) + gap,
    height: header + rows * (cell + gap) + gap,
    label,
    header,
    gap,
    x: (col: number) => label + gap + col * (cell + gap),
    y: (row: number) => header + gap + row * (cell + gap),
  };
}
