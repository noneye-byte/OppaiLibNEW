/**
 * The words around a chub.ai search: its orders, a card's counts and its topics.
 * Pure, beside its test; the screen is views/chub-browse.ts and the fetching is the
 * server's (chub.go).
 */

/** chub's orders, as it names them, and what a person reads. */
export const CHUB_SORTS: { id: string; label: string }[] = [
  { id: "download_count", label: "Most downloaded" },
  { id: "trending_downloads", label: "Trending" },
  { id: "star_count", label: "Most starred" },
  { id: "rating", label: "Best rated" },
  { id: "created_at", label: "Newest" },
  { id: "last_activity_at", label: "Recently updated" },
];

/** A count as a card shows it: 950, 1.2k, 34k, 1.5M. */
export function compactCount(n: number): string {
  if (!Number.isFinite(n) || n < 1000) return String(Math.max(0, Math.round(n || 0)));
  const [div, unit] = n >= 1_000_000 ? [1_000_000, "M"] : [1000, "k"];
  const v = n / div;
  return `${v < 10 ? v.toFixed(1).replace(/\.0$/, "") : Math.round(v)}${unit}`;
}

/**
 * The topics worth showing on a card: not "NSFW", which the card's badge already says,
 * nor the "Expressions" topics that only say there is a pack, and at most `limit`.
 */
export function shownTopics(topics: readonly string[], limit = 4): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of topics) {
    const t = raw.trim();
    const key = t.toLowerCase();
    if (!t || key === "nsfw" || key.startsWith("expressions") || seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length === limit) break;
  }
  return out;
}

/** Whether a card's topics say it comes with an expression pack. */
export function saysItHasExpressions(topics: readonly string[]): boolean {
  return topics.some((t) => t.trim().toLowerCase().startsWith("expressions"));
}

// ── a card's page ───────────────────────────────────────────────────────────

/**
 * A card's text with its placeholders read out: {{char}} is the character's name and
 * {{user}} is you, as a chat would fill them. Read on a page with the braces left in, a
 * greeting is hard to picture as the first thing someone says to you.
 */
export function fillNames(text: string, name: string, user = "you"): string {
  return text
    .replace(/\{\{\s*char\s*\}\}|<BOT>/gi, name || "them")
    .replace(/\{\{\s*user\s*\}\}|<USER>/gi, user);
}

/** One run of a roleplay message: plain narration, an *action*, or "speech". */
export interface RoleplayRun {
  text: string;
  kind: "plain" | "action" | "speech";
}

/**
 * A roleplay message cut into the runs a chat draws differently: *actions* in italics
 * and "speech" brighter. An asterisk or a quote with no partner is left as written, so
 * a stray one does not turn the rest of a greeting into an action.
 */
export function roleplayRuns(text: string): RoleplayRun[] {
  const out: RoleplayRun[] = [];
  const re = /\*([^*\n][^*]*?)\*|"([^"\n]+?)"|“([^”\n]+?)”/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), kind: "plain" });
    if (m[1] !== undefined) out.push({ text: m[1], kind: "action" });
    else out.push({ text: m[0], kind: "speech" });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), kind: "plain" });
  return out.filter((r) => r.text.length > 0);
}

/** The card's own fields, in the order a person reads a card, with the tokens chub
 *  counted for each where it did. Empty ones are left out. */
export interface CardSection {
  key: string;
  label: string;
  text: string;
  tokens?: number;
}

export function cardSections(card: {
  creatorNotes: string; description: string; personality: string; scenario: string;
  exampleDialogs: string; systemPrompt: string; postHistory: string; tokenCounts?: Record<string, number>;
}): CardSection[] {
  const t = card.tokenCounts ?? {};
  const all: CardSection[] = [
    { key: "notes", label: "Creator's notes", text: card.creatorNotes },
    { key: "description", label: "Description", text: card.description, tokens: t.description },
    { key: "personality", label: "Personality", text: card.personality, tokens: t.personality },
    { key: "scenario", label: "Scenario", text: card.scenario, tokens: t.scenario },
    { key: "examples", label: "Example dialogue", text: card.exampleDialogs, tokens: t.mes_example },
    { key: "system", label: "System prompt", text: card.systemPrompt, tokens: t.system_prompt },
    { key: "post", label: "After the history", text: card.postHistory, tokens: t.post_history_instructions },
  ];
  return all
    .map((s) => ({ ...s, text: s.text.trim(), tokens: s.tokens && s.tokens > 0 ? s.tokens : undefined }))
    .filter((s) => s.text.length > 0);
}
