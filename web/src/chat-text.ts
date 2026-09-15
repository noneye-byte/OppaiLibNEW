/**
 * How her words are shaped before they reach the screen.
 *
 * These lived inside chat.ts, a five-thousand-line component with no test file of its
 * own. They are pure functions of their arguments — a string in, a string or a list
 * out — and they decide things worth being sure about: whether a reply arrives as one
 * paragraph or four bubbles, whether a link in what you are typing is a link, how long
 * she appears to spend reading. None of that needs a DOM, so none of it needed to be in
 * a component; it only was because that is where it was written.
 *
 * The pattern the repo already uses (gen-draft.ts, outfit-loadout.ts, upload-queue.ts):
 * pure logic in its own module, with the test beside it.
 */

/**
 * Finds a link in what is being typed, matching the server's own rule: an explicit
 * scheme or a bare "www." host, with sentence punctuation left out of the address.
 *
 * Narrow on purpose — treating any dotted word as a hostname turns "see notes.txt" into
 * a fetch. The server normalizes and re-checks whatever this finds.
 */
export function findLinkInText(text: string): string {
  const found = /(?:https?:\/\/|www\.)[^\s<>"'`]{2,}/i.exec(text)?.[0] ?? "";
  return found.replace(/[.,;:!?)\]}'"]+$/, "");
}

/** The most bubbles one reply is ever broken into. */
export const MAX_BUBBLES = 5;

/** Below this many characters a reply is a single thought, and splitting only
 *  fragments it. */
const SPLIT_FLOOR = 160;

/** Roughly a text message's worth; the sentence grouper breaks after this. */
const BUBBLE_TARGET = 200;

/**
 * Breaks one reply into the messages it should arrive as.
 *
 * A blank line is an intended break and is honoured whatever the length: she is told to
 * text in short separate messages, and "oh hey\n\nyou've been gone three days" arriving
 * as one bubble with a paragraph gap in it was the bug. The length floor only guards the
 * *sentence* splitting, which is a guess about where a thought ends.
 */
export function splitIntoBubbles(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [trimmed];
  let parts = trimmed.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) {
    if (trimmed.length < SPLIT_FLOOR) return [trimmed];
    // No paragraph seam — fall back to grouping sentences into message-sized runs.
    const sentences = trimmed
      .match(/[^.!?…]+[.!?…]+["')\]]*\s*|[^.!?…]+$/g)
      ?.map((s) => s.trim())
      .filter(Boolean);
    if (!sentences || sentences.length < 2) return [trimmed];
    parts = [];
    let current = "";
    for (const sentence of sentences) {
      // Break when the run is already message-sized, but stop breaking once one more
      // group would blow the cap — everything left then accretes into the last bubble.
      if (current && current.length + sentence.length > BUBBLE_TARGET && parts.length < MAX_BUBBLES - 1) {
        parts.push(current.trim());
        current = sentence;
      } else {
        current = current ? `${current} ${sentence}` : sentence;
      }
    }
    if (current.trim()) parts.push(current.trim());
  }
  if (parts.length <= MAX_BUBBLES) return parts;
  // More paragraphs than the cap allows: keep the first few, fold the rest together so
  // nothing is dropped.
  return [...parts.slice(0, MAX_BUBBLES - 1), parts.slice(MAX_BUBBLES - 1).join("\n\n")];
}

/**
 * How long she takes to pick the phone up and read what you sent, before the receipt
 * turns to "Read" and the dots start.
 *
 * Scales with how much there is to read; a conversation that has been quiet means the
 * phone was down. Capped, because a read receipt that takes ten seconds reads as her
 * ignoring you. `random` is injectable so the shape can be tested without the jitter —
 * production passes nothing and gets Math.random.
 */
export function readingDelay(chars: number, quietMs: number, random: () => number = Math.random): number {
  const jitter = (base: number) => base * (0.7 + random() * 0.6);
  // A beat to notice it, then ~35 characters a second — reading, not typing.
  let ms = jitter(700 + chars * 28);
  if (quietMs > 10 * 60_000) ms += jitter(1500);
  return Math.min(6500, ms);
}

/** A conversation's last line, with its markup off, for the list of conversations. */
export function previewText(text: string): string {
  return text.replace(/\*\*|~~|`|\*/g, "").replace(/\s+/g, " ").trim();
}

/** A line with its markup off, for places that quote her rather than render her —
 *  a notification, or the text handed to the voice. */
export function plainSpeech(text: string): string {
  return text
    .replace(/\[[^\]\n]{0,200}\]/g, " ")
    .replace(/\*\*|__|~~|\*|`/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** How long ago something happened, in words. `nowMillis` is injectable so a test does
 *  not have to race the clock. */
export function timeAgo(atMillis: number, nowMillis: number = Date.now()): string {
  const seconds = Math.max(0, (nowMillis - atMillis) / 1000);
  if (seconds < 90) return "just now";
  if (seconds < 5400) return `${Math.round(seconds / 60)} minutes ago`;
  if (seconds < 172800) return `${Math.round(seconds / 3600)} hours ago`;
  return `${Math.round(seconds / 86400)} days ago`;
}

/** Puts her closeness (0–1) into words for the bond panel, matching the server's tiers. */
export function closenessLabel(warmth: number): string {
  if (warmth < 0.15) return "Still getting to know each other";
  if (warmth < 0.5) return "Comfortable with each other by now";
  if (warmth < 0.85) return "Close — you know each other well";
  return "Deeply close after all this time";
}
