import type { ModelRename, NameSuggestion, NamedKind } from "./api.js";

/**
 * Naming LoRAs and detectors after what Civitai says they are, as the rename dialog
 * plans it (backend/internal/api/model_names.go makes the names).
 *
 * A1111 names a LoRA by its file, so a rename is a file moving — and a name already
 * taken is refused, not overwritten. The server checks one file at a time; the plan
 * here sees them all, so two LoRAs Civitai would give one name ("Makima - Pony" twice,
 * from two uploaders) come out as "Makima - Pony" and "Makima - Pony 2" instead of the
 * second one failing. Names are compared without case: on Windows and on an SMB share
 * "Ink" and "ink" are one file.
 */

/** A name a file and a prompt can both carry — the server's CleanModelName. */
export function cleanModelName(name: string): string {
  const out = name.replace(/[^\p{L}\p{N} ._-]+/gu, " ").split(/\s+/).filter(Boolean).join(" ").replace(/^[ ._-]+|[ ._-]+$/g, "");
  const chars = [...out];
  return chars.length > 100 ? chars.slice(0, 100).join("").replace(/[ ._-]+$/, "") : out;
}

/** A detector's name always ends in ".pt"; a LoRA's never has an extension. */
export function withExtension(kind: NamedKind, name: string): string {
  if (kind !== "detector") return cleanModelName(name);
  const stem = cleanModelName(name.replace(/\.pt$/i, ""));
  return stem ? `${stem}.pt` : "";
}

/** The first of want, "want 2", "want 3"… (a detector's "want_2.pt") not in taken. */
export function uniqueName(kind: NamedKind, want: string, taken: Set<string>): string {
  if (!taken.has(want.toLowerCase())) return want;
  const stem = kind === "detector" ? want.replace(/\.pt$/i, "") : want;
  for (let n = 2; ; n++) {
    const next = kind === "detector" ? `${stem}_${n}.pt` : `${stem} ${n}`;
    if (!taken.has(next.toLowerCase())) return next;
  }
}

export interface RenameRow {
  name: string;
  /** What it would be called; "" when Civitai has nothing to say. */
  to: string;
  civitai?: string;
  outcome: NameSuggestion["outcome"];
  error?: string;
  /** Ticked to be renamed. */
  pick: boolean;
}

/**
 * The dialog's rows from the catalogue's answers: each suggestion made unique among
 * every other file's name and the names given before it, and ticked when it is a
 * change. `existing` is every name of that kind, not only the ones asked about.
 */
export function renameRows(kind: NamedKind, suggestions: NameSuggestion[], existing: string[]): RenameRow[] {
  const asked = new Set(suggestions.map((s) => s.name));
  const taken = new Set(existing.filter((n) => !asked.has(n)).map((n) => n.toLowerCase()));
  // A file that keeps its name keeps it from the others.
  for (const s of suggestions) if (s.outcome !== "named") taken.add(s.name.toLowerCase());
  return suggestions.map((s) => {
    let to = s.to ? withExtension(kind, s.to) : "";
    if (to && s.outcome === "named") {
      const own = new Set(taken);
      own.delete(s.name.toLowerCase());
      to = to.toLowerCase() === s.name.toLowerCase() ? to : uniqueName(kind, to, own);
      taken.add(to.toLowerCase());
    }
    return { name: s.name, to, civitai: s.civitai, outcome: s.outcome, error: s.error, pick: s.outcome === "named" && to !== s.name };
  });
}

/** The renames to send: the ticked rows whose name changes, cleaned as the server will. */
export function renamesToSend(kind: NamedKind, rows: RenameRow[]): { name: string; to: string }[] {
  return rows
    .filter((r) => r.pick)
    .map((r) => ({ name: r.name, to: withExtension(kind, r.to) }))
    .filter((r) => r.to && r.to !== r.name);
}

/** Old name → new, from what the server renamed. */
export function renamedMap(renamed: ModelRename[]): Map<string, string> {
  return new Map(renamed.map((r) => [r.oldName, r.newName]));
}

/** A record keyed by name with its keys renamed — the LoRAs that are on, by weight. */
export function renameKeys<T>(rec: Record<string, T>, to: Map<string, string>): Record<string, T> {
  return Object.fromEntries(Object.entries(rec).map(([k, v]) => [to.get(k) ?? k, v]));
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The <lora:…> tags typed into a prompt, pointed at the new names. */
export function renameLorasInPrompt(prompt: string, to: Map<string, string>): string {
  let out = prompt;
  for (const [from, name] of to) {
    out = out.replace(new RegExp(`<lora:${escapeRe(from)}(?=[:>])`, "g"), `<lora:${name}`);
  }
  return out;
}
