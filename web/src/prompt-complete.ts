/**
 * Prompt autocomplete: what is being typed, what it could become, and how accepting a
 * completion rewrites the prompt.
 *
 * The first version completed only the text after the prompt's last comma, so editing
 * a tag in the middle of a prompt suggested things for whatever was at the end of it,
 * and accepting one replaced the wrong tag. Everything here works from the caret
 * instead: the token is the run of text around it between the prompt's own
 * delimiters — commas, line breaks, and the brackets that weight a tag — so
 * "(red dre|ss:1.2)" completes "red dre" and accepting keeps the weight around it.
 *
 * Three kinds of token, because a prompt holds three kinds of name: a tag (completed
 * from Danbooru's vocabulary by the server), a LoRA reference "<lora:name:weight>",
 * and a wildcard reference "__name__". The last two complete from lists the screen
 * already has, so they need no round trip.
 */

export type TokenMode = "tag" | "lora" | "wildcard";

export interface PromptToken {
  /** Where the token starts and ends in the prompt; accepting replaces this span. */
  start: number;
  end: number;
  /** What has been typed of it, up to the caret, unescaped. */
  query: string;
  mode: TokenMode;
}

export interface Completion {
  kind: "tag" | "lora" | "wildcard" | "trigger";
  /** What the list shows. */
  label: string;
  /** What accepting writes into the prompt. */
  insert: string;
  /** A second line: the alias that matched, a LoRA's file name, a list's length. */
  detail?: string;
  /** Danbooru's category for a tag (0 general, 1 artist, 3 copyright, 4 character,
      5 meta, 100 this library's own). */
  category?: number;
  count?: number;
}

const DELIMS = new Set([",", "\n", "|", "(", ")", "[", "]", "{", "}"]);

function isDelimiter(text: string, i: number): boolean {
  if (!DELIMS.has(text[i])) return false;
  // "\(" is a literal bracket inside a tag — "ganyu \(genshin impact\)" — not the
  // start of a weighted group.
  return !(i > 0 && text[i - 1] === "\\" && "()[]{}".includes(text[i]));
}

/** The token the caret is in, or null when there is nothing to complete there. */
export function tokenAt(text: string, caret: number): PromptToken | null {
  caret = Math.max(0, Math.min(caret, text.length));
  const before = text.slice(0, caret);

  // A LoRA reference being typed: "<lora:" and a name, no closing bracket yet.
  const lora = /<lora:([^:>]*)$/i.exec(before);
  if (lora) {
    const start = lora.index;
    let end = caret;
    const close = text.indexOf(">", caret);
    const nextOpen = text.indexOf("<", caret);
    if (close >= 0 && (nextOpen < 0 || close < nextOpen)) end = close + 1;
    return { start, end, query: lora[1].trim(), mode: "lora" };
  }

  let start = caret;
  while (start > 0 && !isDelimiter(text, start - 1)) start--;
  let end = caret;
  while (end < text.length && !isDelimiter(text, end)) end++;

  const rawBefore = text.slice(start, caret);
  const lead = rawBefore.length - rawBefore.trimStart().length;
  start += lead;
  // A weight being typed ("tag:1.") is not a tag to complete.
  if (text.slice(start, caret).includes(":")) return null;
  // Nor is the inside of a LoRA reference the caret has already passed.
  if (/<[^>]*$/.test(text.slice(start, caret))) return null;
  // The tag ends where its weight starts, so accepting keeps ":1.2" in place.
  const colon = text.slice(caret, end).indexOf(":");
  if (colon >= 0) end = caret + colon;
  while (end > caret && /\s/.test(text[end - 1])) end--;

  const typed = text.slice(start, caret);
  const wildcard = /^__([^_]*(?:_[^_]+)*)_{0,2}$/.exec(typed);
  if (typed.startsWith("__") && wildcard) {
    // A finished reference ("__hair__") followed by more typing is not this.
    let wend = end;
    const closeAt = text.indexOf("__", start + 2);
    if (closeAt >= 0 && closeAt + 2 <= end) wend = closeAt + 2;
    return { start, end: wend, query: wildcard[1], mode: "wildcard" };
  }
  return { start, end, query: unescapeTag(typed).trim(), mode: "tag" };
}

/** Writes a tag so a prompt parser reads its brackets as part of the name. */
export function escapeTag(tag: string): string {
  return tag.replace(/([()[\]{}])/g, "\\$1");
}

export function unescapeTag(tag: string): string {
  return tag.replace(/\\([()[\]{}])/g, "$1");
}

/**
 * Replaces the token with the completion. A tag accepted at the end of the prompt is
 * followed by ", " so the next one can be typed straight away; one accepted in the
 * middle is not, because what follows it already separates it.
 */
export function applyCompletion(
  text: string,
  token: PromptToken,
  insert: string,
): { text: string; caret: number } {
  const after = text.slice(token.end);
  let tail = "";
  if (token.mode !== "lora" && after.trim() === "") tail = ", ";
  const next = text.slice(0, token.start) + insert + tail + after.replace(/^\s+$/, "");
  return { text: next, caret: token.start + insert.length + tail.length };
}

export interface LocalSources {
  loras: { name: string; alias?: string; weight?: number }[];
  wildcards: { name: string; lines?: number }[];
  /** Trigger phrases of the LoRAs that are switched on. */
  triggers: string[];
}

function score(name: string, q: string): number {
  const n = name.toLowerCase();
  if (!q) return 2;
  if (n === q) return 0;
  if (n.startsWith(q)) return 1;
  if (n.split(/[\s_\-.]+/).some((w) => w.startsWith(q))) return 2;
  if (n.includes(q)) return 3;
  return -1;
}

function ranked<T>(items: T[], name: (t: T) => string, q: string, limit: number): T[] {
  return items
    .map((t) => ({ t, s: score(name(t), q) }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => a.s - b.s || name(a.t).localeCompare(name(b.t)))
    .slice(0, limit)
    .map((x) => x.t);
}

/** Completions the screen can answer itself: LoRAs, wildcard lists, trigger phrases. */
export function localCompletions(token: PromptToken, sources: LocalSources, limit = 8): Completion[] {
  const q = token.query.toLowerCase();
  if (token.mode === "lora") {
    return ranked(sources.loras, (l) => l.alias || l.name, q, limit).map((l) => ({
      kind: "lora" as const,
      label: l.alias || l.name,
      insert: `<lora:${l.name}:${formatWeight(l.weight ?? 1)}>`,
      detail: l.alias && l.alias !== l.name ? l.name : undefined,
    }));
  }
  if (token.mode === "wildcard") {
    return ranked(sources.wildcards, (w) => w.name, q, limit).map((w) => ({
      kind: "wildcard" as const,
      label: `__${w.name}__`,
      insert: `__${w.name}__`,
      detail: w.lines ? `${w.lines} line${w.lines === 1 ? "" : "s"}` : undefined,
    }));
  }
  if (q.length < 1) return [];
  // In a plain tag, the switched-on LoRAs' trigger words come first: they are the
  // words this prompt most needs and the ones least likely to be remembered.
  return ranked(sources.triggers, (t) => t, q, Math.min(3, limit)).map((t) => ({
    kind: "trigger" as const,
    label: t,
    insert: t,
    detail: "trigger word",
  }));
}

function formatWeight(w: number): string {
  return Number.isInteger(w) ? String(w) : String(Math.round(w * 100) / 100);
}

/** Merges the screen's own completions with the server's tags, without repeats. */
export function mergeCompletions(local: Completion[], tags: Completion[], limit = 10): Completion[] {
  const seen = new Set<string>();
  const out: Completion[] = [];
  for (const c of [...local, ...tags]) {
    const key = c.insert.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
    if (out.length >= limit) break;
  }
  return out;
}

/** How a post count reads in the list: 6.0M, 52k, 870. */
export function formatCount(n: number | undefined): string {
  if (!n) return "";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

/** Moves the highlighted row, wrapping at both ends. */
export function moveSelection(index: number, length: number, delta: number): number {
  if (length <= 0) return -1;
  if (index < 0) return delta > 0 ? 0 : length - 1;
  return (index + delta + length) % length;
}
