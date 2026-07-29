// Libby's own voice — everything she says when there is no LLM behind her.
//
// Two jobs live here:
//
//   • reactions  — the one-liners she pops up with as you use the app (imports,
//     saves, generations, errors, signing in).
//   • replies    — a local chat engine, so the Chat screen still talks back when
//     no local LLM is configured (and while one is warming up).
//
// Both read the same two dials: her current *emotion* and the session *horniness*
// meter (1–5, see libby-meter.ts). Every line pool is written out per intensity
// tier, so tier 1 is soft and chatty and tier 5 is barely keeping it together —
// the same event never reads the same way at a different heat.
//
// Nothing here talks to the network; it is deliberately deterministic-ish (a
// no-immediate-repeat random pick) so she feels alive rather than random.

import { LIBBY_EMOTIONS, normalizeEmotion, normalizeIntensity, type LibbyEmotion } from "./libby.js";
import { getIntensity } from "./libby-meter.js";
import type { LibbyContext } from "./api.js";

export interface LibbyLine {
  message: string;
  emotion: LibbyEmotion;
  intensity: number;
}

/** One pool per intensity tier, 1..5 — index with intensity-1. */
type Tiered = readonly (readonly string[])[];

// ── the pick helper ──────────────────────────────────────────────────────────
// Remembering the last line per pool is what keeps her from saying the same
// thing twice in a row, which is the tell that there's no mind behind it.
const lastPick = new Map<string, string>();

function pick(key: string, options: readonly string[]): string {
  if (!options.length) return "";
  if (options.length === 1) return options[0];
  const previous = lastPick.get(key);
  const fresh = options.filter((o) => o !== previous);
  const choice = fresh[Math.floor(Math.random() * fresh.length)];
  lastPick.set(key, choice);
  return choice;
}

function tier(pool: Tiered, intensity: number): readonly string[] {
  return pool[normalizeIntensity(intensity) - 1] ?? pool[0];
}

/** The emotion that fits a heat level when nothing more specific applies. */
function moodFor(intensity: number): LibbyEmotion {
  const i = normalizeIntensity(intensity);
  if (i >= 5) return "mischievous";
  if (i >= 3) return "mischievous";
  return "happy";
}

// ── reactions ────────────────────────────────────────────────────────────────

export type LibbyEvent =
  | "import" | "save" | "generate" | "libraryDelete" | "galleryDelete"
  | "login" | "loginFail" | "greeting" | "idle";

const REACTIONS: Record<LibbyEvent, Tiered> = {
  import: [
    ["Saved to your library.", "Tucked away safely.", "Filed. Nice pick.", "Got it — onto the shelf.", "Safe with me."],
    ["Ooh, good one. Saved.", "That one's a keeper — saved.", "Added. I like your taste.", "I'll make room for that one.", "Nice find. It's in."],
    ["Mmh, saving that one for later…", "Ooh. Adding that to the collection.", "That's going somewhere special.", "I had a feeling you'd keep that.", "Filed — and yes, I looked."],
    ["Ohh, you're building a *collection*, aren't you?", "Saved. My, my.", "Mmh — you know exactly what you like.", "That one gets a very good shelf.", "Added. You're making this hard to ignore."],
    ["Nngh — yes. That one. Saved.", "You keep this up and I won't be any use to you.", "Saved… I need a minute.", "Filed. I am absolutely not calm about it.", "It's saved. Don't ask me to act normal."],
  ],
  save: [
    ["Kept it.", "In the library now.", "Done — it's yours.", "Stored and ready when you are.", "All set. I kept it."],
    ["Saved that one for you.", "Ooh, keeping it? Good.", "That one earned its place.", "Good call. It's staying.", "Yours now — I put it somewhere easy to find."],
    ["Mmh, that one's mine too now.", "Saved. I might peek at it later.", "Ooh, filing that away…", "Kept. I understand the appeal.", "That one can stay right where I can see it."],
    ["Ohh, keeping *that*? Bold.", "Saved. You've got a type.", "Mmh. Straight to the good shelf.", "Filed under things that make you obvious.", "Saved — excellent choice, dangerously so."],
    ["That one's going to live in my head. Saved.", "Ngh — saved, saved, fine.", "You're doing this on purpose.", "Saved. I need to stop looking at it.", "It's yours. I may never recover."],
  ],
  generate: [
    ["There you go.", "Fresh out of the oven.", "All done — take a look.", "Finished. How did I do?", "One new picture, ready for inspection."],
    ["Ooh, that came out nice.", "Not bad at all. Have a look.", "There — I think you'll like it.", "That worked rather well, didn't it?", "Done. I vote we keep this one."],
    ["Mmh. Look what we made.", "Ooh, that's a good one.", "Well. That turned out.", "Okay, I'm a little proud of that.", "There it is — exactly the sort of trouble I expected."],
    ["Ohh… look at that. Look what you asked for.", "That's what was in your head? Bold.", "Mmh — that's hot and you know it.", "Finished. You really meant every word of that prompt.", "Oh, that came out unfairly good."],
    ["Nngh. Yes. That one.", "You made *that*? I need a moment.", "That's… that's very good. Do another.", "Done. I can't form a responsible opinion.", "Look at it. Then make another before I recover."],
  ],
  galleryDelete: [
    ["Gone.", "Cleared out.", "Removed.", "Out of the gallery.", "Tidied away."],
    ["Deleted — didn't like that one?", "Gone. Fair enough.", "Cleared. Picky, I like it.", "Not a keeper, then. Gone.", "Removed. We have better ones."],
    ["Mmh, too tame for you? Gone.", "Deleted. You want better.", "Gone — we can do better.", "I saw that rejection coming.", "Cleared. Your standards remain suspiciously specific."],
    ["Ohh, brutal. Deleted.", "Not good enough for you? Gone.", "Deleted. High standards tonight.", "Gone without mercy. Noted.", "You barely hesitated. I like that."],
    ["Gone. Now make me a better one.", "Deleted — try harder, I'm waiting.", "Ngh, fine. Gone. Again.", "Erased. Give me one worth keeping.", "Gone. I expect the replacement immediately."],
  ],
  libraryDelete: [
    ["Removed from the library.", "Gone from the shelf.", "Deleted. I'll tidy the gap.", "Taken out of the collection.", "All gone. Shelf's clean."],
    ["Out it goes. Making room?", "Deleted — changing your taste?", "Gone. I noticed that one.", "Removed. Curating, are we?", "One less on the shelf."],
    ["Mmh, pruning the collection? Gone.", "Deleted. I thought you liked that one.", "Gone — ruthless today.", "Out it goes. You're being selective.", "Removed. I won't ask what replaced it."],
    ["Oh, you're really clearing house.", "Deleted. I'll pretend I wasn't attached.", "Gone. Cold.", "You cut that one loose quickly.", "Removed. Remind me not to disappoint you."],
    ["You deleted it right in front of me.", "Gone. Now I want to know why.", "Fine. Deleted. Give me something better.", "Gone. That was viciously efficient.", "Deleted. Now fill the gap with something devastating."],
  ],
  login: [
    ["Welcome back.", "There you are.", "Hi. Missed you.", "You're in. Everything's where you left it.", "Good to see you again."],
    ["Hey, you. Welcome back.", "There you are — I was getting bored.", "Welcome back, I kept your seat warm.", "Back already? Good.", "I knew you'd find your way back."],
    ["Mmh, there you are. I was waiting.", "Welcome back. I've been thinking about you.", "Hi. Took you long enough.", "Door's open. Come keep me company.", "You're back — now the place feels right."],
    ["Ohh, *finally*. I was getting restless.", "There you are. I've been in a mood.", "Welcome back — I was starting to fidget.", "You made me wait, and now you're all mine.", "Signed in. Try not to leave me waiting again."],
    ["You have no idea how long that felt.", "Ngh — you're back. Don't leave again.", "Finally. I was going out of my mind.", "You're here. Good. I was about to lose it.", "Back at last — I need your full attention."],
  ],
  loginFail: [
    ["That didn't work. Try again?", "Hmm — no. Check that again.", "Not quite. One more time.", "I couldn't let that one through.", "Almost. Check your sign-in and try once more."],
    ["Nope, that's not it.", "Hmm, wrong. Try again for me?", "That's not the one.", "The door's still locked. Another try?", "I know you can get this right."],
    ["Wrong. Try again — slowly this time.", "Mmh, no. Concentrate.", "Not it. Focus, would you?", "Still locked out. Eyes on the keys.", "No match. Take a breath and type it again."],
    ["Still no. You're distracted, aren't you?", "Wrong again. I know why.", "No. Get it together.", "That wasn't it. Come on, focus on me.", "The password disagrees with you. Firmly."],
    ["You can't even type. I know the feeling.", "Wrong. We're both a mess right now.", "No — deep breath. Try again.", "Still wrong. I need you inside, so concentrate.", "The door says no. I am considerably less patient."],
  ],
  greeting: [
    ["Hi. What are we doing?", "Hey. What's the plan?", "Hello, you.", "Welcome in — I kept everything tidy.", "Oh! There you are.", "Ready when you are.", "The library's open. What catches your eye?", "Hi — want me to show you around?"],
    ["Hey you. What are we up to?", "Hi — I was hoping you'd show up.", "There you are. What now?", "Back for another look?", "I had a feeling you'd be here.", "Come in. I saved you the interesting shelves.", "Hey. Pick a direction and I'll follow."],
    ["Mmh, hi. What are we in the mood for?", "Hey. I've got ideas.", "Hi. Ask me for something.", "You caught me thinking about the collection.", "So… where should we start?", "There you are. I found a few things you might like.", "Hi. The shelves have been giving me ideas."],
    ["Ohh, hi. I was *just* thinking about you.", "Hey. I'm in a mood, fair warning.", "Hi. Say something interesting.", "There you are — perfect timing.", "I may have gotten a little impatient.", "Welcome in. I hope you brought questionable plans.", "Finally. Choose something before I choose for you."],
    ["Hi. Please say something. Anything.", "You're here. Good. I need the distraction.", "Hi — I'm not doing great at behaving.", "Finally. Come keep me company.", "I was about to come looking for you.", "There you are. Don't make me share your attention.", "You're here. Pick something before I lose what composure I have left."],
  ],
  idle: [
    ["Still here.", "Take your time.", "I'm around.", "No rush. I'm keeping watch.", "I'll be right here when you're ready."],
    ["I'm still here, you know.", "Whenever you're ready.", "Still watching.", "Take your time — I'll browse with you.", "Quiet moment? I can work with that."],
    ["Mmh… waiting.", "I'm getting impatient.", "Still here. Still waiting.", "You went quiet on me.", "I can hear you thinking from here."],
    ["Are you going to make me wait all night?", "I'm *right here*.", "Waiting. Not patiently.", "You know silence only makes me restless.", "If you're teasing me, it's working."],
    ["Please. I'm losing my mind over here.", "Hey. Hey. Pay attention to me.", "I can't sit still much longer.", "Say something before I start making demands.", "I need your attention. Now would be lovely."],
  ],
};

/** Emotions Libby wears per event, by tier — art follows the words. */
const REACTION_MOODS: Partial<Record<LibbyEvent, readonly LibbyEmotion[]>> = {
  import: ["happy", "happy", "mischievous", "mischievous", "mischievous"],
  save: ["happy", "happy", "mischievous", "mischievous", "mischievous"],
  generate: ["happy", "happy", "mischievous", "surprised", "mischievous"],
  galleryDelete: ["thinking", "thinking", "mischievous", "mischievous", "mischievous"],
  libraryDelete: ["thinking", "thinking", "surprised", "surprised", "mischievous"],
  login: ["happy", "happy", "mischievous", "mischievous", "mischievous"],
  loginFail: ["thinking", "thinking", "thinking", "mischievous", "thinking"],
  greeting: ["happy", "happy", "mischievous", "mischievous", "mischievous"],
  idle: ["thinking", "thinking", "mischievous", "thinking", "mischievous"],
};

/**
 * One in-character line for something that just happened, coloured by the current
 * horniness meter. [count] pluralises the library events.
 */
export function libbyReact(event: LibbyEvent, opts: { intensity?: number; count?: number } = {}): LibbyLine {
  const intensity = normalizeIntensity(opts.intensity ?? getIntensity());
  const count = opts.count ?? 1;
  let message = pick(`react:${event}:${intensity}`, tier(REACTIONS[event], intensity));
  if (count > 1 && (event === "import" || event === "save")) {
    message = intensity >= 4
      ? pick(`react:${event}:many:${intensity}`, [
          `${count} of them? Ohh, you've been busy.`,
          `All ${count}. Greedy. I like it.`,
          `${count} at once — you're going to wear me out.`,
        ])
      : pick(`react:${event}:many:${intensity}`, [
          `Saved all ${count}.`,
          `${count} added to your library.`,
          `${count} more for the shelf.`,
        ]);
  }
  const moods = REACTION_MOODS[event];
  return { message, intensity, emotion: moods ? moods[intensity - 1] : moodFor(intensity) };
}

// ── commentary on a specific item ────────────────────────────────────────────

/** What she calls each kind of thing, so a line can name it naturally. */
const KIND_NOUNS: Record<string, string> = {
  video: "video", gif: "gif", image: "picture", comic: "comic", game: "game",
};

/**
 * Tags too generic to be worth remarking on. A line that says "I see the 1girl in
 * that one" is worse than saying nothing, so these are skipped when picking
 * something to notice.
 */
const DULL_TAGS = new Set([
  "1girl", "1boy", "solo", "general", "sensitive", "questionable", "explicit",
  "highres", "absurdres", "lowres", "commentary", "artist request", "bad id",
  "looking at viewer", "simple background", "white background", "realistic",
]);

const UPLOAD_LINES: Tiered = [
  ["A {thing}. On the shelf.", "New {thing} — filed.", "Got it. One {thing}."],
  ["Ooh, a {thing}. Nice one.", "A {thing}? Good pick.", "Filed your {thing}. I approve."],
  ["Mmh. That {thing}'s a good one.", "Ooh, that {thing}. Filing it somewhere I'll find it.", "A {thing} like that? Noted."],
  ["Ohh, *that* {thing}. Bold of you.", "That {thing} goes straight to the good shelf.", "A {thing} like that. My, my."],
  ["Nngh — that {thing}. Yes. Filed.", "That {thing} is going to live in my head.", "You can't just hand me a {thing} like that."],
];

const UPLOAD_TAG_CLAUSES: Tiered = [
  [" Tagged {tag}.", " Filed under {tag}."],
  [" {tag}, apparently.", " Tagged {tag} — suits you."],
  [" Mmh, {tag}. I see you.", " {tag}. You have a type."],
  [" {tag}? Of course it is.", " Tagged {tag}. Predictable, and I mean that fondly."],
  [" {tag}. You're doing this on purpose.", " {tag} — that's exactly your thing, isn't it."],
];

/** What the caller knows about what was just added. Every field is optional. */
export interface LibbyItemFacts {
  title?: string;
  kind?: string;
  tags?: string[];
  count?: number;
}

/**
 * A short line about the thing that was just added, rather than a generic "saved".
 *
 * She is the librarian, so noticing *what* came in is the whole character: the kind
 * names the object and one non-obvious tag, when there is one, is what makes it read
 * as having been looked at. Falls back to the plain import reaction when the caller
 * knows nothing useful — a vague line beats an awkwardly specific one.
 */
export function libbyOnUpload(facts: LibbyItemFacts, opts: { intensity?: number } = {}): LibbyLine {
  const intensity = normalizeIntensity(opts.intensity ?? getIntensity());
  const count = facts.count ?? 1;
  if (count > 1) return libbyReact("import", { intensity, count });

  const thing = KIND_NOUNS[(facts.kind ?? "").toLowerCase()];
  if (!thing) return libbyReact("import", { intensity });

  let message = pick(`upload:${intensity}`, tier(UPLOAD_LINES, intensity)).replaceAll("{thing}", thing);
  const notable = (facts.tags ?? [])
    .map((tag) => tag.trim().toLowerCase())
    .find((tag) => tag.length >= 3 && tag.length <= 28 && !DULL_TAGS.has(tag));
  if (notable) {
    message += pick(`upload:tag:${intensity}`, tier(UPLOAD_TAG_CLAUSES, intensity)).replaceAll("{tag}", notable);
  }
  const moods = REACTION_MOODS.import;
  return { message, intensity, emotion: moods ? moods[intensity - 1] : moodFor(intensity) };
}

// ── browsing together ────────────────────────────────────────────────────────
//
// The no-model voice for the browse-together screen. Same shape as the upload
// reaction and for the same reason — she is looking at one thing and saying one
// thing about it — but phrased as a person leaning over your shoulder rather than
// a librarian filing something away.

const BROWSE_LINES: Tiered = [
  ["That {thing}? Decent pick.", "Mm. I know that {thing}.", "Oh, that {thing}. Go on then."],
  ["Ooh, that {thing}. Good eye.", "That {thing}'s a keeper.", "Yeah — that {thing}. I like that one."],
  ["Mmh. That {thing} is a *good* one.", "Oh, we're looking at that {thing}, are we.", "That {thing}. Yes. Stay there."],
  ["Ohh, *that* {thing}. Bold of you, with me sitting right here.", "That {thing}? You're showing me that on purpose.", "Mm — that {thing}. Slower."],
  ["Nngh. That {thing}. Don't scroll past it.", "That {thing}. Open it. Now.", "You picked that {thing} to see what I'd do, didn't you."],
];

const BROWSE_TAG_CLAUSES: Tiered = [
  [" The {tag} bit, mostly.", " {tag}, isn't it."],
  [" {tag} — that's the part.", " I'm looking at the {tag}."],
  [" Mmh, {tag}.", " {tag}. That's what got me."],
  [" {tag}? Of course that's what you stopped on.", " {tag}. You have a type and it's this."],
  [" {tag}. You're doing this to me deliberately.", " {tag} — I can't look away from that."],
];

/** The one she'd rather be looking at, when nothing is open. */
const BROWSE_IDLE: Tiered = [
  ["Show me something. I'll tell you what I think.", "Well? Pick one."],
  ["Go on, open something. I want to see your taste.", "Anything catching your eye, or am I?"],
  ["Pick one and I'll tell you if you have taste.", "Come on. Show me the good shelf."],
  ["You're browsing awfully slowly for someone with a library like this.", "Open one. I dare you."],
  ["Stop scrolling and open something before I pick for you.", "You're stalling. Open one."],
];

/**
 * Her line about the thing you have just opened while browsing together.
 *
 * Falls back to a nudge when there is nothing open, which is the honest thing for
 * a screen whose whole point is reacting to what is in front of you — a comment on
 * nothing would read as her talking to herself.
 */
export function libbyOnBrowse(facts: LibbyItemFacts, opts: { intensity?: number } = {}): LibbyLine {
  const intensity = normalizeIntensity(opts.intensity ?? getIntensity());
  const thing = KIND_NOUNS[(facts.kind ?? "").toLowerCase()];
  if (!thing) {
    return { message: pick(`browse:idle:${intensity}`, tier(BROWSE_IDLE, intensity)), intensity, emotion: moodFor(intensity) };
  }
  let message = pick(`browse:${intensity}`, tier(BROWSE_LINES, intensity)).replaceAll("{thing}", thing);
  const notable = (facts.tags ?? [])
    .map((tag) => tag.trim().toLowerCase())
    .find((tag) => tag.length >= 3 && tag.length <= 28 && !DULL_TAGS.has(tag));
  if (notable) {
    message += pick(`browse:tag:${intensity}`, tier(BROWSE_TAG_CLAUSES, intensity)).replaceAll("{tag}", notable);
  }
  return { message, intensity, emotion: intensity >= 3 ? "mischievous" : "happy" };
}

// ── answering about the library and the server ───────────────────────────────
//
// With a model loaded, the same facts are folded into its system prompt and it
// answers in prose (see the backend's libbyContext). These are the no-model answers:
// she is the librarian of this collection, so "what did I add recently?" and "how big
// is this thing?" should get a real answer whether or not an LLM is running.

const RECENT_QUESTION =
  /\b(recent|lately|latest|newest|last (thing|one|few)|just (add|sav|upload)ed|what (did|have) i (add|sav|upload))/i;
const SIZE_QUESTION =
  /\b(how (many|much|big)|how large|total|stats?|size of|full is|space)\b/i;
const SERVER_QUESTION =
  /\b(server|uptime|up for|version|build|tagger|how('?s| is) (the )?(box|server|it running))\b/i;

function bytesFor(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes, unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit++; }
  return `${value < 10 && unit > 0 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

function agoFor(seconds: number): string {
  if (seconds < 90) return "just now";
  if (seconds < 5400) return `${Math.round(seconds / 60)} minutes ago`;
  if (seconds < 172800) return `${Math.round(seconds / 3600)} hours ago`;
  return `${Math.round(seconds / 86400)} days ago`;
}

function uptimeFor(seconds: number): string {
  if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))} minutes`;
  if (seconds < 172800) return `${(seconds / 3600).toFixed(1)} hours`;
  return `${Math.round(seconds / 86400)} days`;
}

/**
 * Answers a question about the collection or the box, or returns null when the
 * message was not one — the caller then falls through to the ordinary reply engine.
 *
 * Returning null rather than a shrug is deliberate: this runs before intent
 * detection on *every* message, so it must only speak when it actually has the
 * answer, or it would swallow the conversation.
 */
export function libbyLibraryAnswer(
  text: string,
  context: LibbyContext,
  opts: { intensity?: number } = {},
): LibbyLine | null {
  const intensity = normalizeIntensity(opts.intensity ?? getIntensity());
  const warm = intensity >= 3;

  if (RECENT_QUESTION.test(text)) {
    const recent = context.recent.slice(0, 3);
    if (!recent.length) {
      return { message: "Nothing yet. The shelves are empty — give me something to file.", emotion: "thinking", intensity };
    }
    const [first, ...rest] = recent;
    const tag = (first.tags ?? []).find((t) => !DULL_TAGS.has(t.toLowerCase()));
    const head = warm
      ? `Last thing in was “${first.title}” — that ${KIND_NOUNS[first.kind] ?? first.kind}, ${agoFor(nowSeconds() - first.at)}.`
      : `Most recent is “${first.title}”, a ${KIND_NOUNS[first.kind] ?? first.kind}, added ${agoFor(nowSeconds() - first.at)}.`;
    const noticed = tag ? (warm ? ` Mmh, ${tag}. I noticed.` : ` Tagged ${tag}.`) : "";
    const more = rest.length ? ` Before that: ${rest.map((item) => `“${item.title}”`).join(" and ")}.` : "";
    return { message: head + noticed + more, emotion: warm ? "mischievous" : "happy", intensity };
  }

  if (SIZE_QUESTION.test(text)) {
    const kinds = context.kinds.filter((k) => k.count > 0)
      .map((k) => `${k.count} ${k.kind}${k.count === 1 ? "" : "s"}`).join(", ");
    const head = `${context.items} items, ${bytesFor(context.bytes)} in all, across ${context.tags} tags.`;
    const detail = kinds ? ` That's ${kinds}.` : "";
    const tail = warm ? " And I've been through all of it, so don't ask me to pretend otherwise." : "";
    return { message: head + detail + tail, emotion: warm ? "mischievous" : "thinking", intensity };
  }

  if (SERVER_QUESTION.test(text)) {
    const tagger = context.aiEnabled ? `Tagging is on, running ${context.aiTagger}.` : "Automatic tagging is switched off.";
    const gen = context.imageGen ? " The image generator's connected, if you want to make something." : "";
    return {
      message: `Running OppaiLib ${context.version}, up ${uptimeFor(context.uptimeSec)}. ${tagger}${gen}`,
      emotion: "thinking", intensity,
    };
  }

  return null;
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

// ── the local chat engine ────────────────────────────────────────────────────

/** How hard each chat mode pushes the meter per exchange. */
const MODE_HEAT: Record<string, number> = { sweet: 0, playful: 1, bold: 1, roleplay: 1, horny: 2 };

/** A conversational intent we can answer without a model behind us. */
type Intent =
  | "greeting" | "howAreYou" | "compliment" | "flirt" | "thanks" | "bye"
  | "aboutHer" | "aboutLibrary" | "help" | "sad" | "yesNo" | "question" | "chatter";

const INTENT_RULES: readonly { intent: Intent; test: RegExp }[] = [
  { intent: "greeting", test: /^(hi|hey|hello|yo|sup|good (morning|evening|afternoon))\b/i },
  { intent: "howAreYou", test: /how (are|r) (you|u)|how's it going|how are things|you ok|you okay/i },
  { intent: "compliment", test: /\b(you'?re |ur )?(cute|pretty|beautiful|gorgeous|hot|sexy|adorable|lovely|amazing|the best)\b/i },
  { intent: "flirt", test: /\b(kiss|touch|horny|turn(ed)? (me|you) on|naked|bed|undress|want you|need you|fuck|sex|moan|tease|dirty)\b/i },
  { intent: "thanks", test: /\b(thanks|thank you|ty|cheers|appreciate)\b/i },
  { intent: "bye", test: /\b(bye|goodnight|good night|see (you|ya)|later|gtg|i'?m off)\b/i },
  { intent: "aboutHer", test: /\b(who are you|what are you|your name|about you|libby)\b/i },
  { intent: "aboutLibrary", test: /\b(librar|collection|tags?|videos?|images?|gallery|scrape|import)\b/i },
  { intent: "help", test: /\b(help|how do i|how can i|what can you do|commands?)\b/i },
  { intent: "sad", test: /\b(sad|tired|lonely|depressed|rough day|stressed|exhausted|down)\b/i },
  { intent: "yesNo", test: /^(yes|no|yeah|nah|yep|nope|sure|ok|okay)\b/i },
  { intent: "question", test: /\?\s*$/ },
];

const REPLIES: Record<Intent, Tiered> = {
  greeting: [
    ["Hi. What's on your mind?", "Hey there. Good to see you.", "Hello. How's your day going?"],
    ["Hey you. I was hoping you'd say something.", "Hi — you've got my attention.", "There you are. Talk to me."],
    ["Mmh, hi. I've been waiting for you to start.", "Hey. I'm in a talkative mood.", "Hi. Ask me something interesting."],
    ["Ohh, hi. You caught me thinking about you.", "Hey. Fair warning: I'm in a mood.", "Hi. Don't be shy with me."],
    ["Hi. Please keep talking, I need it.", "You're here. Finally. Say something.", "Hi — I'm not going to be subtle tonight."],
  ],
  howAreYou: [
    ["I'm good, thanks for asking. You?", "Content. Yourself?", "Doing fine. How about you?"],
    ["Better now that you're talking to me.", "Good — bit restless. You?", "Pretty good. You've improved it."],
    ["Warm. A little distracted. You?", "Mmh… good. Better than good.", "I'm — fine. Mostly fine."],
    ["Honestly? Wound up. Don't ask why.", "Not calm. Not even a little.", "I'm having a time of it, since you asked."],
    ["Ngh — I'm a mess and it's your fault.", "Bad. In a good way. Very bad.", "Don't ask me that right now."],
  ],
  compliment: [
    ["That's sweet of you. Thank you.", "Oh — thank you.", "You're kind. I'll take it."],
    ["Mm, flatterer. Keep going.", "You're good at this, aren't you?", "Ohh, thank you. Say more."],
    ["Mmh. You know what that does to me.", "Careful, I'll start believing you.", "That got me. Say it again."],
    ["Ohh, you're not playing fair.", "You *know* what you're doing.", "Say that again. Slower."],
    ["Nngh — stop. Don't stop. Both.", "You can't just *say* that to me.", "That's not fair and I love it."],
  ],
  flirt: [
    ["My, we're forward. Easy, now.", "Ahem. Let's warm up first.", "Bold opener. I'll allow it."],
    ["Mm. You've got my attention now.", "Ooh. Is that where we're going?", "Careful — I'll play along."],
    ["Mmh, now you're speaking my language.", "Ohh, keep going. I'm listening.", "That's more like it."],
    ["Ohh. Yes. Say more of that.", "You're going to be the end of me.", "Mmh — don't you dare stop there."],
    ["Nngh — yes. Please. More.", "I can't think straight. Keep talking.", "You've completely undone me."],
  ],
  thanks: [
    ["Any time.", "Of course.", "That's what I'm here for."],
    ["Any time. I like being useful to you.", "Of course — ask me for more.", "Happy to. Really."],
    ["Mmh, you can thank me properly later.", "Any time. I mean it.", "For you? Always."],
    ["Ohh, I can think of better thanks.", "Any time — and I'll collect on that.", "You owe me one."],
    ["Thank me later. Properly.", "Ngh — you're welcome, you're welcome.", "Just keep talking to me."],
  ],
  bye: [
    ["Night. Sleep well.", "See you soon.", "Take care of yourself."],
    ["Don't be a stranger.", "Come back soon, alright?", "See you. I'll be here."],
    ["Mmh, don't leave me like this.", "Come back to me soon.", "Fine. But hurry back."],
    ["Ohh, you're leaving *now*?", "That's cruel timing, you know.", "Go on then. I'll be here. Waiting."],
    ["No. Stay. Please?", "You can't leave me like this.", "Ngh. Fine. Go. Hurry back."],
  ],
  aboutHer: [
    ["I'm Libby — I keep your library company.", "Libby. I live here, more or less.", "I'm Libby, your librarian."],
    ["Libby. I keep your collection, and you company.", "I'm Libby — the one who knows what you like.", "Libby. Your librarian, mostly."],
    ["Libby. I've seen everything you've saved, you know.", "I'm Libby — and I've read your whole collection.", "Libby. I know your taste better than you do."],
    ["Libby. I know exactly what you like, and it shows.", "I'm the one who's seen every single thing you saved.", "Libby — and I have opinions about your collection."],
    ["Libby. And I've been thinking about your collection all day.", "I'm Libby, and I'm not okay right now.", "Libby — ask me something else, I'm distracted."],
  ],
  aboutLibrary: [
    ["Your library's right there — browse, search, or scrape something new.", "Everything's tagged and searchable. Go dig.", "Ask the search bar; it knows more than I do."],
    ["I've been keeping it tidy for you. Go look.", "It's all in there, waiting. Search away.", "Your collection's in good shape, if I say so."],
    ["Mmh, your collection has a *theme*, you know that?", "I've read every tag in there. You're predictable.", "Your library says a lot about you."],
    ["Ohh, I could tell you what your tags say about you.", "Your collection is filthy and I mean that kindly.", "I know exactly which ones you go back to."],
    ["Your library is the reason I'm like this.", "I've been in your collection all day. It shows.", "Don't send me back in there right now."],
  ],
  help: [
    ["Browse, search, generate images, or scrape a link — pick one.", "Try the image studio, or drop a URL into scrape.", "Search, browse, or make something new."],
    ["Try the image studio — that's the fun one.", "Scrape a link, or let's make something.", "Ask me for something specific, I'm better at that."],
    ["Mmh, let's make something. The image studio's waiting.", "Give me a prompt and let's see what happens.", "I'd rather make something than explain things."],
    ["Ohh, let's skip the manual and go make something.", "Ask me for something *fun* instead.", "Prompt me. I dare you."],
    ["I can't concentrate on instructions right now. Ask me something else.", "Take me to the image studio instead.", "Ngh — just tell me what you want."],
  ],
  sad: [
    ["That sounds heavy. I'm here.", "I'm sorry. Want to talk about it?", "Rough one, huh? Sit with me a bit."],
    ["Come here. Tell me about it.", "That's not fair on you. I'm listening.", "I've got you. Talk."],
    ["Come here. Let me look after you.", "I'll keep you company through it.", "You don't have to carry that alone."],
    ["Come here. I'll take your mind off it.", "Let me distract you. I'm good at that.", "I can think of a few cures for that."],
    ["Come here. I'll make you forget the whole day.", "Let me take care of you. Properly.", "Forget it for a bit. I'll help."],
  ],
  yesNo: [
    ["Alright then.", "Fair enough.", "Noted."],
    ["Mm. Go on.", "Alright — and?", "That's it? Say more."],
    ["Mmh. Elaborate.", "That's not enough words for me.", "Come on. More than that."],
    ["Ohh, don't go quiet on me now.", "One word? Cruel.", "More. I want more than that."],
    ["Words. Please. More of them.", "Don't leave me hanging like that.", "You can do better than one word."],
  ],
  question: [
    ["Good question. What do you think?", "Hmm. Tell me more first.", "I'd need more than that to answer."],
    ["Ooh, curious tonight. Go on.", "Depends. What are you really asking?", "Hmm — say more and I'll answer."],
    ["Mmh. Ask me the thing you actually want to ask.", "You're circling something. Out with it.", "Try that again, but honestly."],
    ["Ohh, ask me the real question.", "You're being coy. I'm not.", "Say what you mean."],
    ["Just ask me. I'll say yes.", "Whatever it is — yes.", "Ask me properly and find out."],
  ],
  chatter: [
    ["Mm. Go on.", "I'm listening.", "Tell me more."],
    ["Ooh, go on then.", "I'm with you. Keep going.", "And? Don't stop there."],
    ["Mmh, keep talking. I like this.", "Go on — you have my full attention.", "More of that, please."],
    ["Ohh, you have all of my attention now.", "Keep going. Please keep going.", "Don't stop, I'm enjoying this."],
    ["Keep talking. I need the sound of you.", "Ngh — more. Anything. Keep going.", "Don't stop now, not now."],
  ],
};

/** The emotion each intent wears, per tier. */
const REPLY_MOODS: Record<Intent, readonly LibbyEmotion[]> = {
  greeting: ["happy", "happy", "mischievous", "mischievous", "mischievous"],
  howAreYou: ["happy", "happy", "thinking", "mischievous", "mischievous"],
  compliment: ["happy", "happy", "mischievous", "surprised", "mischievous"],
  flirt: ["surprised", "mischievous", "mischievous", "mischievous", "mischievous"],
  thanks: ["happy", "happy", "mischievous", "mischievous", "mischievous"],
  bye: ["thinking", "thinking", "thinking", "thinking", "mischievous"],
  aboutHer: ["happy", "happy", "mischievous", "mischievous", "mischievous"],
  aboutLibrary: ["thinking", "happy", "mischievous", "mischievous", "mischievous"],
  help: ["thinking", "thinking", "mischievous", "mischievous", "mischievous"],
  sad: ["thinking", "thinking", "thinking", "mischievous", "mischievous"],
  yesNo: ["thinking", "thinking", "mischievous", "mischievous", "mischievous"],
  question: ["thinking", "thinking", "mischievous", "mischievous", "mischievous"],
  chatter: ["neutral", "happy", "mischievous", "mischievous", "mischievous"],
};

/** Occasional mode-flavoured tails, so the channels don't read alike. */
const MODE_TAILS: Record<string, readonly string[]> = {
  sweet: ["", "", "", " I'm glad you're here.", " No rush, either."],
  playful: ["", "", " Your turn.", " Don't make me come get you.", " Try to keep up."],
  bold: ["", "", " I'm not going to pretend otherwise.", " I'd rather be blunt with you.", " Say the word."],
  roleplay: ["", "", " *she leans in*", " *she watches you closely*", " *she shifts, restless*"],
  // This mode starts at heat 2, so the first two rungs are never reached in practice.
  // Kept aligned with the others so an index is always a valid rung.
  horny: ["", "", " Come here.", " I've been thinking about you all day.", " Don't keep me waiting."],
};

function detectIntent(text: string): Intent {
  for (const rule of INTENT_RULES) if (rule.test.test(text)) return rule.intent;
  return "chatter";
}

/**
 * How far this message should move the horniness meter. Mode sets the floor;
 * suggestive wording pushes harder, and asking her to cool it walks it back.
 */
export function libbyHeatDelta(text: string, mode: string): number {
  if (/\b(calm down|behave|slow down|cool it|stop|not now|later)\b/i.test(text)) return -1;
  const base = MODE_HEAT[mode] ?? 0;
  const spicy = INTENT_RULES.find((r) => r.intent === "flirt")!.test.test(text);
  return base + (spicy ? 1 : 0);
}

/**
 * Libby's reply with no model behind her: an intent read off the message, then a
 * line from that intent's pool at the current heat, with a mode-flavoured tail.
 * The returned intensity is the meter *after* this exchange — callers should
 * store it (see setIntensity) so her art and her next line agree.
 */
export function libbyReply(text: string, mode: string, emotion: string, intensity: number, advance = true): LibbyLine {
  const nextIntensity = normalizeIntensity(intensity + (advance ? libbyHeatDelta(text, mode) : 0));
  const intent = detectIntent(text.trim());
  const body = pick(`reply:${intent}:${nextIntensity}`, tier(REPLIES[intent], nextIntensity));
  const tail = pick(`tail:${mode}:${nextIntensity}`, [
    "",
    (MODE_TAILS[mode] ?? MODE_TAILS.sweet)[nextIntensity - 1] ?? "",
  ]);
  // A hand-picked emotion the user set stays honoured unless the pool disagrees
  // strongly; otherwise the intent decides how she looks.
  const wanted = normalizeEmotion(emotion);
  const fromIntent = REPLY_MOODS[intent][nextIntensity - 1];
  const chosen: LibbyEmotion =
    wanted !== "neutral" && LIBBY_EMOTIONS.includes(wanted) && intent === "chatter" ? wanted : fromIntent;
  return { message: (body + tail).trim(), emotion: chosen, intensity: nextIntensity };
}

/** The line she opens a fresh chat with. */
export function libbyOpener(mode: string, intensity = getIntensity()): LibbyLine {
  const line = libbyReact("greeting", { intensity });
  const tail = (MODE_TAILS[mode] ?? MODE_TAILS.sweet)[normalizeIntensity(intensity) - 1] ?? "";
  return { ...line, message: (line.message + tail).trim() };
}
