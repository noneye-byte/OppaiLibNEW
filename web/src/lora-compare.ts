/**
 * Comparing LoRAs side by side: the same prompt, the same seed, the same checkpoint,
 * one picture per LoRA at each weight — so the only thing that differs between two
 * pictures is the LoRA, and which of several runs came out best can be seen rather
 * than guessed. A row without any LoRA is the baseline, what the checkpoint draws on
 * its own.
 *
 * Each LoRA's trigger word goes into its own row's prompt: a LoRA trained on a
 * trigger does little without it, and one prompt typed for all of them cannot name
 * every trigger. "{trigger}" in the prompt marks where it goes; without it, it leads.
 */

export interface CompareLora {
  /** The name the generate call's loras list wants. */
  name: string;
  trigger?: string;
  /** The checkpoint it was trained against, when it was trained here. */
  checkpoint?: string;
}

export interface CompareCell {
  key: string;
  lora: CompareLora | null;
  weight: number;
  prompt: string;
  checkpoint: string;
}

export interface CompareRow {
  lora: CompareLora | null;
  cells: CompareCell[];
}

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

/**
 * Every picture to make, row by row. The baseline is one picture, not one per
 * weight: without a LoRA, the weight changes nothing. With ownCheckpoint, a LoRA
 * trained here is drawn on the checkpoint it was trained against — a Pony LoRA on
 * an SD 1.5 checkpoint draws noise — and anything else on the one chosen.
 */
export function comparePlan(opts: {
  loras: CompareLora[];
  weights: number[];
  baseline: boolean;
  prompt: string;
  checkpoint: string;
  ownCheckpoint: boolean;
}): CompareRow[] {
  const rows: CompareRow[] = [];
  if (opts.baseline) {
    rows.push({
      lora: null,
      cells: [{ key: "base", lora: null, weight: 0, prompt: withTrigger(opts.prompt, ""), checkpoint: opts.checkpoint }],
    });
  }
  for (const lora of opts.loras) {
    const checkpoint = opts.ownCheckpoint && lora.checkpoint ? lora.checkpoint : opts.checkpoint;
    rows.push({
      lora,
      cells: opts.weights.map((weight) => ({
        key: `${lora.name}@${weight}`,
        lora,
        weight,
        prompt: withTrigger(opts.prompt, lora.trigger),
        checkpoint,
      })),
    });
  }
  return rows;
}

/** How many pictures a plan makes. */
export function planSize(rows: CompareRow[]): number {
  return rows.reduce((n, r) => n + r.cells.length, 0);
}
