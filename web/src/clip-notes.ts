// A Video studio LoRA's cover and trigger words, as OppaiLib keeps them for ComfyUI
// (api/comfy_notes.go), and what putting one on does to the prompt.
//
// The Image studio types a LoRA's trigger words into the prompt as it goes on, because
// a LoRA trained on a word does little without it. A clip's prompt is sentences, not
// tags — video models read words better — so a LoRA's words go in as a sentence of
// their own at the front, where the motion presets will not split them, and come out
// as that sentence when the LoRA is taken off. Words since edited into the user's own
// sentence are the user's, and stay.

import type { ComfyNote } from "./api.js";

/** The note for a choice: the first of its files that has one, since a pair's two
    halves are one LoRA and either may have been the one given words or a cover. */
export function noteFor(files: readonly { name: string }[], notes: Record<string, ComfyNote>): { name: string; note: ComfyNote } | null {
  for (const f of files) {
    const note = notes[f.name];
    if (note) return { name: f.name, note };
  }
  return null;
}

/** Trigger words as typed: separated by commas or lines, trimmed, each once. */
export function parseTriggers(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.split(/[,\n]+/)) {
    const t = raw.trim();
    if (t && !out.some((o) => o.toLowerCase() === t.toLowerCase())) out.push(t);
  }
  return out;
}

/** A prompt with a LoRA's words put in front as a sentence of their own, unless every
    one of them is already in it somewhere. */
export function withTriggers(prompt: string, words: readonly string[]): string {
  const lower = prompt.toLowerCase();
  const missing = words.filter((w) => w.trim() && !lower.includes(w.toLowerCase()));
  if (!missing.length) return prompt;
  const rest = sentences(prompt);
  return `${[missing.join(", "), ...rest].join(". ")}.`;
}

/** A prompt with a LoRA's words taken back out: the sentence they were put in as, or
    a sentence that is one of them alone. */
export function withoutTriggers(prompt: string, words: readonly string[]): string {
  if (!words.length) return prompt;
  const joined = words.map((w) => w.toLowerCase());
  const parts = sentences(prompt);
  const kept = parts.filter((s) => {
    const l = s.toLowerCase();
    if (joined.includes(l)) return false;
    // The sentence withTriggers wrote: some of the words, comma-joined, nothing else.
    const bits = l.split(/\s*,\s*/);
    return !bits.every((b) => joined.includes(b));
  });
  if (kept.length === parts.length) return prompt;
  return kept.length ? `${kept.join(". ")}.` : "";
}

/** Splits a prompt into its sentences, trimmed, without their full stops — as the
    motion presets do (motion-presets.ts), so the two agree on what a sentence is. */
function sentences(prompt: string): string[] {
  return prompt.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim().replace(/[.!?]+$/, "").trim()).filter(Boolean);
}
