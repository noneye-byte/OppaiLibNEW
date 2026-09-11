// Quoted replies, the part with no DOM in it.
//
// A reply — yours to one of her messages, or hers to one of yours from earlier —
// carries the first line of what it answers, cut at a word. The server has the same
// rule (excerptOf in chat_replies.go), so a quote drawn from a message here and one
// the server resolved from her tag read identically.

/** The first line of a message, cut at a word, for a quoted reply. */
export function excerptOf(content: string, max = 140): string {
  let text = content.trim();
  const nl = text.indexOf("\n");
  if (nl >= 0 && text.slice(0, nl).trim()) text = text.slice(0, nl).trim();
  if (text.length <= max) return text;
  let cut = text.slice(0, max);
  const space = cut.lastIndexOf(" ");
  if (space > max / 2) cut = cut.slice(0, space);
  return cut.trim() + "…";
}
