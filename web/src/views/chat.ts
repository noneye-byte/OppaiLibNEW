import { LitElement, css, html, nothing, type PropertyValues, type TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { keyed } from "lit/directives/keyed.js";
import {
  api, PROFILE_IMAGE_OWNER, type ChatCharacter, type ChatConversation, type ChatImage, type ChatMessage,
  type ChatBackendInfo, type ChatDebug, type ChatModelInspection, type ChatModels, type ChatOptions, type ChatPhotoReport, type ChatProfile, type ChatSampling, type ChatStatus, type ChatWorkspace,
  type LibbyAutoDecision, type LibbyAutoSettings, type LibbyAutoState, type LibbyBond, type LibbyContext,
  type DiscordPlace, type DiscordState, type LibbyIdentity, type LibbyMemory, type LibbyThought, type LibbyWant, type SharedLink,
  type StoredChatMessage, type User, type ChatReplyRef, type LibbyAttachment, type LibbyBackground, type LibbyLink, type Media,
  SEND_WEIGHTS,
} from "../api.js";
import { iconStyles, motionStyles } from "../theme.js";
import { formatBytes } from "../media-meta.js";
import { markArrival } from "../motion.js";
import { loadSpeakPref, saveSpeakPref, speak, stopSpeaking } from "../speech.js";
import {
  activityLabel, AMBIENT_MAX_INTENSITY, DEFAULT_LIBBY_PFP, applyImageFallback, libbyAssetCandidates, libbyHidden, loadLibbyOutfit,
  EMOTION_LABELS, LIBBY_EMOTIONS, normalizeEmotion, normalizeIntensity, type LibbyEmotion,
} from "../libby.js";
import { applyProgression, getIntensity, setIntensity } from "../libby-meter.js";
import { libbyHeatDelta, libbyLibraryAnswer, libbyOpener, libbyReact, libbyReply, type LibbyLine } from "../libby-voice.js";
import { menuDivider, nativeMenuWanted, openMenu, type MenuItem } from "../context-menu.js";
import { SHARE_EVENT, takePendingShare } from "../chat-share.js";
import { excerptOf } from "../chat-replies.js";
import { libbyMotion } from "../libby-motion.js";
import { profileUpdates } from "../ui-metrics.js";
import { characterToCard, readCardFile } from "../character-card.js";
import {
  ActionApprovals, actionCardStyles, attachmentStyles, KIND_ICONS, linkChipStyles, recentlyAttached, recentHeat, recentMoods, recentlySent,
  renderActionCards, renderAttachments, renderLinkChips, requestOpenMedia,
} from "../chat-links.js";

const MODES = [
  { id: "sweet", label: "sweet", emotion: "happy", topic: "Soft, warm, and unhurried." },
  { id: "playful", label: "playful", emotion: "mischievous", topic: "Teasing and quick on their feet." },
  { id: "bold", label: "bold", emotion: "surprised", topic: "Blunt, uninhibited, and direct." },
  { id: "roleplay", label: "roleplay", emotion: "thinking", topic: "In character, in scene, in detail." },
  { id: "horny", label: "horny", emotion: "mischievous", topic: "Explicit, leading, and sending pictures." },
] as const;

type EditorTab = "character" | "model" | "images" | "profile";

/**
 * A picture attached to the composer but not yet sent. It is already uploaded and
 * tagged by the time it lands here — the upload is what produces the tags, and the
 * tags are what a text-only model needs in order to react to it.
 */
interface PendingPhoto {
  imageId: string;
  tags: string[];
  name: string;
}

/** Chat settings categories, laid out as a Discord-style left rail. */
const EDITOR_TABS: { id: EditorTab; label: string; icon: string; group: string }[] = [
  { id: "character", label: "Character card", icon: "badge", group: "Friend" },
  { id: "images", label: "Images", icon: "image", group: "Friend" },
  { id: "model", label: "Model & generation", icon: "memory", group: "Chat" },
  { id: "profile", label: "Your profile", icon: "person", group: "Chat" },
];

/** How long the AI waits before speaking again unprompted, and how many turns it
    may take before it stops and waits for the user. Both are deliberately modest:
    a self-driving conversation is a party trick until it fills the log unattended. */
const AUTO_DELAY_MS = 14_000;
const AUTO_MAX_TURNS = 8;

/**
 * One turn's captured working, for the conversation export.
 *
 * Kept per conversation and only in memory: the assembled prompt is several kilobytes
 * and round-tripping it through the stored workspace would put every debugging session
 * permanently into the user's chat file.
 */
interface CapturedTurn {
  at: number;
  request: { photoTags: string[]; photoImageId: string; task: string };
  debug: ChatDebug;
}

/** How many captured turns a conversation keeps. An evening is hundreds of turns and
    each one is the whole system prompt; this is enough to see a pattern. */
const MAX_CAPTURED_TURNS = 40;
const AUTO_KEY = "oppai_chat_autopilot";

/** How long after Libby's own last message a quiet, visible chat waits before she
    sends one unprompted follow-up. A few minutes: long enough to be sure the lull is
    real, short enough that she reads as present rather than absent. Unlike autopilot
    this fires once per idle stretch, not on a loop — see armIdle/idleNudge. */
const IDLE_NUDGE_MS = 210_000;

/** Post-processes a finished reply into the 2–3 short messages a person would send
    back to back, instead of one paragraph. Real texting arrives in bursts, so a reply
    with a natural seam is split on it; one without stays whole.

    Blank lines win — they are where the model was told to break intentionally-separate
    texts, so a paragraph break is an explicit boundary. Failing that it falls back to
    sentence boundaries, grouped so the pieces stay message-sized. Short replies are
    never split: an eight-word line arriving as three bubbles is fragmentation, not
    texture. Capped so a long reply becomes a few texts, not a wall of them. */
/** Finds a link in what is being typed, matching the server's own rule: an explicit
    scheme or a bare "www." host, with sentence punctuation left out of the address.
    Narrow on purpose — treating any dotted word as a hostname turns "see notes.txt"
    into a fetch. The server normalizes and re-checks whatever this finds. */
function findLinkInText(text: string): string {
  const found = /(?:https?:\/\/|www\.)[^\s<>"'`]{2,}/i.exec(text)?.[0] ?? "";
  return found.replace(/[.,;:!?)\]}'"]+$/, "");
}

/** How long an incoming call rings before it counts as missed. */
const RING_MS = 40_000;

const MAX_BUBBLES = 5;
function splitIntoBubbles(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [trimmed];
  // A blank line is an intended break and is honoured whatever the length: she is
  // told to text in short separate messages, and "oh hey\n\nyou've been gone three
  // days" arriving as one bubble with a paragraph gap in it was the bug. The length
  // floor below only guards the *sentence* splitting, which is a guess.
  let parts = trimmed.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) {
    // Below this a reply is a single thought; splitting it only fragments.
    if (trimmed.length < 160) return [trimmed];
    // No paragraph seam — fall back to grouping sentences into message-sized runs.
    const sentences = trimmed.match(/[^.!?…]+[.!?…]+["')\]]*\s*|[^.!?…]+$/g)?.map((s) => s.trim()).filter(Boolean);
    if (!sentences || sentences.length < 2) return [trimmed];
    parts = [];
    let current = "";
    for (const sentence of sentences) {
      // Break when the run is already message-sized, but stop breaking once one more
      // group would blow the cap — everything left then accretes into the last bubble.
      if (current && current.length + sentence.length > 200 && parts.length < MAX_BUBBLES - 1) {
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

/** The emoji offered when you react to one of her messages. A short row, like a
    phone's: the point of a reaction is that it is quicker than words. */
const REACTIONS = ["❤️", "😂", "😮", "😢", "🔥", "👍", "👀", "😘"];

/** How far a message has to be dragged sideways before letting go replies to it, and
    how far the bubble follows the finger at most. */
const SWIPE_REPLY_PX = 56;
const SWIPE_MAX_PX = 72;

/** How long she takes to pick the phone up and read what you sent, before the
    receipt turns to "Read" and the dots start. Scales with how much there is to
    read; a burst of texts resets it, so she reads them together. Capped, because a
    read receipt that takes ten seconds reads as her ignoring you. */
function readingDelay(chars: number, quietMs: number): number {
  const jitter = (base: number) => base * (0.7 + Math.random() * 0.6);
  // A beat to notice it, then ~35 characters a second — reading, not typing.
  let ms = jitter(700 + chars * 28);
  // A conversation that has been quiet for a while means the phone was down.
  if (quietMs > 10 * 60_000) ms += jitter(1500);
  return Math.min(6500, ms);
}

/** Reserved image owner for a character's avatar, so a picture set as the face
    never joins that character's gallery nor gets attached to a reply. Mirrors
    PROFILE_IMAGE_OWNER, which does the same for the user's own picture. */
const avatarOwner = (characterID: string) => `avatar:${characterID}`;

/**
 * A 32-hex id, the shape the server validates conversation and message ids against.
 *
 * crypto.randomUUID only exists in a secure context, so it is missing when the server
 * is reached over plain HTTP on a LAN — a supported way to run this. Falling back to
 * getRandomValues keeps ids working there instead of throwing on the first render.
 */
const newID = () => {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID().replaceAll("-", "");
  return [...crypto.getRandomValues(new Uint8Array(16))]
    .map((byte) => byte.toString(16).padStart(2, "0")).join("");
};
const timeOf = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
/** The date chip between runs of messages: today and yesterday by name, the rest by date. */
/** A stored send weight as the scale reads it: absent or 0 is normal; the server
    keeps "never" as -1 so it survives being omitted from JSON. */
function weightOf(weight: number | undefined): number {
  if (!weight) return 1;
  if (weight < 0) return -1;
  const known = SEND_WEIGHTS.map((w) => w.value).filter((v) => v > 0);
  return known.reduce((best, v) => Math.abs(v - weight) < Math.abs(best - weight) ? v : best, 1);
}

function dayOf(ms: number): string {
  const day = new Date(ms), today = new Date();
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const gap = Math.round((startOf(today) - startOf(day)) / 86_400_000);
  if (gap === 0) return "Today";
  if (gap === 1) return "Yesterday";
  if (gap < 7) return day.toLocaleDateString([], { weekday: "long" });
  return day.toLocaleDateString([], { month: "short", day: "numeric", year: day.getFullYear() === today.getFullYear() ? undefined : "numeric" });
}
/** When a chat last moved, as a list shows it: a time today, a weekday this week, a date otherwise. */
function listTimeOf(ms: number): string {
  const label = dayOf(ms);
  if (label === "Today") return timeOf(ms);
  if (label === "Yesterday") return label;
  return new Date(ms).toLocaleDateString([], { month: "short", day: "numeric" });
}
/** One line of what was last said, with the markup that formats a message stripped out. */
function previewText(text: string): string {
  return text.replace(/\*\*|~~|`|\*/g, "").replace(/\s+/g, " ").trim();
}
/**
 * No sampler settings by default — the server tunes them per turn.
 *
 * This used to ship `temperature 0.8, top_p 0.95, repetition_penalty 1.1, max_tokens 400`
 * with every request, and those numbers were wrong for most of what she does: 400 tokens
 * invites a paragraph where a one-line reaction was wanted, and 0.8/0.95 is loose enough
 * that a factual question about the library gets a confidently invented answer. The server
 * now picks from what the turn is for (see its chat_sampling.go) and returns what it chose.
 *
 * An empty object is therefore the *correct* default, and anything in here is an explicit
 * override that beats the server's choice. Which is what the sliders in the advanced panel
 * write — untouched, they only display what came back.
 */
const defaultOptions = (): ChatOptions => ({});

/** A line with its markup off, for places that quote her rather than render her. */
function plainSpeech(text: string): string {
  return text.replace(/\[[^\]\n]{0,200}\]/g, " ").replace(/\*\*|__|~~|\*|`/g, "").replace(/\s+/g, " ").trim();
}

/** localStorage key for the portrait column's width, per device. */
const STAGE_WIDTH_KEY = "oppai_stage_width";

/**
 * One loader argument as the panel asks for it. `keys` are the backend's own argument
 * names, first the current one; where a name moved between text-generation-webui
 * releases both are listed and both are sent. `loaders` limits a field to the loaders
 * it means anything for; absent means every loader.
 */
interface LoaderField {
  label: string;
  keys: string[];
  kind: "number" | "text" | "check" | "select";
  hint?: string;
  placeholder?: string;
  options?: string[];
  loaders?: string[];
}

const LOADER_KEY: LoaderField = { label: "Loader", keys: ["loader"], kind: "select" };

const LLAMA = ["llama.cpp"];
const EXLLAMA = ["ExLlamav3_HF", "ExLlamav3", "ExLlamav2_HF", "ExLlamav2"];
const TRANSFORMERS = ["Transformers", "HQQ"];

/** The Model tab, in argument form. Ordered as the WebUI lays them out. */
const LOADER_FIELDS: LoaderField[] = [
  { label: "Context length", keys: ["ctx_size", "n_ctx", "max_seq_len"], kind: "number", placeholder: "model default" },
  { label: "GPU layers", keys: ["gpu_layers", "n_gpu_layers"], kind: "number", hint: "0 = CPU only", loaders: LLAMA },
  { label: "Batch size", keys: ["batch_size", "n_batch"], kind: "number", loaders: LLAMA },
  { label: "Threads", keys: ["threads"], kind: "number", loaders: LLAMA },
  { label: "Batch threads", keys: ["threads_batch"], kind: "number", loaders: LLAMA },
  { label: "KV cache type", keys: ["cache_type"], kind: "select", options: ["fp16", "q8_0", "q4_0", "q8", "q6", "q4"], hint: "q8_0/q4_0 for llama.cpp; q8/q6/q4 for ExLlama" },
  { label: "Tensor split", keys: ["tensor_split"], kind: "text", placeholder: "e.g. 20,10", loaders: LLAMA },
  { label: "GPU split (GB)", keys: ["gpu_split"], kind: "text", placeholder: "e.g. 20,7", loaders: EXLLAMA },
  { label: "RoPE base", keys: ["rope_freq_base"], kind: "number", placeholder: "model default" },
  { label: "Positional compression", keys: ["compress_pos_emb"], kind: "number", placeholder: "1" },
  { label: "Experts per token", keys: ["num_experts_per_token"], kind: "number", placeholder: "model default", loaders: EXLLAMA },
  { label: "Compute dtype", keys: ["compute_dtype"], kind: "select", options: ["float16", "bfloat16", "float32"], loaders: TRANSFORMERS },
  { label: "Quant type", keys: ["quant_type"], kind: "select", options: ["nf4", "fp4"], loaders: TRANSFORMERS },
  { label: "Flash attention", keys: ["flash_attn"], kind: "check" },
  { label: "mlock", keys: ["mlock"], kind: "check", hint: "keep in RAM", loaders: LLAMA },
  { label: "No mmap", keys: ["no_mmap"], kind: "check", loaders: LLAMA },
  { label: "NUMA", keys: ["numa"], kind: "check", loaders: LLAMA },
  { label: "CPU only", keys: ["cpu"], kind: "check" },
  { label: "Load in 4-bit", keys: ["load_in_4bit"], kind: "check", loaders: TRANSFORMERS },
  { label: "Load in 8-bit", keys: ["load_in_8bit"], kind: "check", loaders: TRANSFORMERS },
  { label: "bf16", keys: ["bf16"], kind: "check", loaders: TRANSFORMERS },
  { label: "Auto devices", keys: ["auto_devices"], kind: "check", loaders: TRANSFORMERS },
  { label: "Disk offload", keys: ["disk"], kind: "check", loaders: TRANSFORMERS },
  { label: "Trust remote code", keys: ["trust_remote_code"], kind: "check", loaders: TRANSFORMERS },
  { label: "No flash attention", keys: ["no_flash_attn"], kind: "check", loaders: EXLLAMA },
  { label: "CFG cache", keys: ["cfg_cache"], kind: "check", loaders: EXLLAMA },
  { label: "Tensor parallel", keys: ["enable_tp"], kind: "check", loaders: EXLLAMA },
  { label: "Streaming LLM", keys: ["streaming_llm"], kind: "check", loaders: LLAMA },
];

/**
 * How each memory kind is labelled in the panel.
 *
 * The server's own words for these are written *at* Libby ("Lines you do not cross with
 * them"), which is right for a prompt and wrong for a chip beside a list item. Keyed by the
 * server's vocabulary, with the raw name as the fallback so a kind added server-side shows up
 * as itself rather than disappearing.
 */
const MEMORY_KIND_LABELS: Record<string, string> = {
  boundary: "boundary",
  relationship: "us",
  preference: "likes",
  user: "about you",
  libby: "about her",
  emotional: "feelings",
  shared: "together",
};

/** How many unanswered messages she sends before backing off, matching the server's
    casualUnansweredLimit. Duplicated as prose rather than fetched: it is one word in one
    sentence of explanation, and an endpoint round-trip to render it would be absurd. */
const casualUnansweredNote = "two";

/** A relative-time phrase for the bond panel: "just now", "3 hours ago", "5 days ago". */
function timeAgo(atMillis: number): string {
  const seconds = Math.max(0, (Date.now() - atMillis) / 1000);
  if (seconds < 90) return "just now";
  if (seconds < 5400) return `${Math.round(seconds / 60)} minutes ago`;
  if (seconds < 172800) return `${Math.round(seconds / 3600)} hours ago`;
  return `${Math.round(seconds / 86400)} days ago`;
}

/** Puts her closeness (0–1) into words for the bond panel, matching the server's tiers. */
function closenessLabel(warmth: number): string {
  if (warmth < 0.15) return "Still getting to know each other";
  if (warmth < 0.5) return "Comfortable with each other by now";
  if (warmth < 0.85) return "Close — you know each other well";
  return "Deeply close after all this time";
}

function emptyWorkspace(): ChatWorkspace {
  return { profile: { displayName: "", persona: "" }, characters: [], conversations: [], images: [] };
}

/**
 * The stand-in workspace used when the stored one cannot be read.
 *
 * Libby answers locally with no server round trip, so a failed load leaves the screen
 * usable rather than dead. It is deliberately never persisted — see workspaceLoaded,
 * which blocks saving while this is what is on screen, so a transient read failure
 * cannot overwrite the real workspace with this shell.
 */
function fallbackWorkspace(): ChatWorkspace {
  return {
    ...emptyWorkspace(),
    characters: [{
      id: "libby", name: "Libby", builtIn: true, promptWeight: 1, defaultMode: "sweet",
      description: "OppaiLib's librarian and resident mascot.",
    }],
  };
}

/**
 * Repairs a workspace that arrived with holes in it.
 *
 * The server normalizes these too, and that is the real fix — but this component
 * indexes the arrays directly all through its render pass, so it should not be one
 * malformed field away from drawing nothing at all. An older server, a cached
 * response, or a future client that omits a key all land here instead of throwing.
 */
function normalizeWorkspace(workspace: ChatWorkspace): ChatWorkspace {
  return {
    ...workspace,
    profile: workspace.profile ?? { displayName: "", persona: "" },
    characters: (workspace.characters ?? []).filter((character) => character && character.id),
    images: (workspace.images ?? []).map((image) => ({ ...image, tags: image.tags ?? [] })),
    conversations: (workspace.conversations ?? []).map((conversation) => ({
      ...conversation,
      messages: (conversation.messages ?? []).filter((message) => message && typeof message.content === "string"),
    })),
  };
}

function optionNumber(options: ChatOptions | undefined, key: string, fallback: number): number {
  const value = options?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** Safe, tiny chat formatter: quotes are speech, **double stars** are actions. */
function formatted(text: string, links?: LibbyLink[], open?: (id: number) => void): TemplateResult {
  const token = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|~~[^~\n]+~~|`[^`\n]+`|"[^"\n]+")/g;
  const chunks = text.split(token);
  return html`${chunks.map((part) => {
    if (part.startsWith("**") && part.endsWith("**")) return html`<strong class="action">${linked(part.slice(2, -2), links, open)}</strong>`;
    if (part.startsWith("*") && part.endsWith("*")) return html`<em>${linked(part.slice(1, -1), links, open)}</em>`;
    if (part.startsWith("~~") && part.endsWith("~~")) return html`<s>${part.slice(2, -2)}</s>`;
    if (part.startsWith("`") && part.endsWith("`")) return html`<code>${part.slice(1, -1)}</code>`;
    if (part.startsWith('"') && part.endsWith('"')) return html`<span class="speech">${linked(part, links, open)}</span>`;
    return linked(part, links, open);
  })}`;
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Makes the name of a linked item clickable where it sits in the sentence.
 *
 * The server writes the real title into the prose in place of her tag and sends the
 * item alongside; the chip under the bubble is the "open it" affordance, and this is
 * the name itself reading as the link it is. Without it the title sat in the text as
 * plain words next to a chip, which is what "pretend hyperlink" looks like.
 */
function linked(part: string, links?: LibbyLink[], open?: (id: number) => void): TemplateResult | string {
  if (!links?.length || !open || !part) return part;
  const titles = links.filter((link) => link.title.trim().length >= 3);
  if (!titles.length) return part;
  const pattern = new RegExp(`(${titles.map((link) => escapeRegExp(link.title)).join("|")})`, "i");
  const pieces = part.split(pattern);
  if (pieces.length === 1) return part;
  return html`${pieces.map((piece) => {
    const hit = titles.find((link) => link.title.toLowerCase() === piece.toLowerCase());
    if (!hit) return piece;
    const go = (event: Event) => { event.stopPropagation(); open(hit.id); };
    return html`<a class="inline-link" role="link" tabindex="0" title=${`Open ${hit.title}`} @click=${go}
      @keydown=${(event: KeyboardEvent) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); go(event); } }}>${piece}</a>`;
  })}`;
}

@customElement("oppai-chat")
export class OppaiChat extends LitElement {
  @property({ attribute: false }) user?: User;

  @state() private status: ChatStatus | null = null;
  @state() private workspace: ChatWorkspace = emptyWorkspace();
  @state() private characterID = "libby";
  @state() private conversationID = "";
  @state() private draft = "";
  @state() private busy = false;
  @state() private loading = true;
  /**
   * Whether the workspace on screen is the stored one.
   *
   * False means the fetch failed and fallbackWorkspace() is standing in. Saving is
   * blocked while it is false, so a server that was briefly unreachable cannot have
   * the user's characters and conversations overwritten by the empty stand-in the
   * moment they type anything.
   */
  @state() private workspaceLoaded = true;
  /** Why the initial load failed, shown as a banner with a retry. */
  @state() private loadError = "";
  @state() private settingsOpen = false;
  /** Whether her replies are read aloud on this device. See speech.ts. */
  @state() private speakOn = loadSpeakPref();
  @state() private editorTab: EditorTab = "character";
  @state() private notice = "";
  @state() private noticeError = false;
  @state() private imageTags = "";
  /** Libby's kept facts, loaded when the profile tab opens; null until then. */
  @state() private memories: LibbyMemory[] | null = null;
  /** The kind vocabulary and the store's cap, both server-owned. See loadMemories. */
  @state() private memoryKinds: string[] = [];
  @state() private memoryLimit = 0;
  /** The "tell her something" box, and the in-place editor for one existing memory. */
  @state() private memoryDraft = "";
  @state() private editingMemory: string | null = null;
  @state() private memoryDraftEdit = "";
  @state() private memoryKindEdit = "";
  /** Her messaging policy and its log. null = not fetched yet, undefined = this server has
      no such endpoint, which is how an older server degrades rather than erroring. */
  @state() private autoState: LibbyAutoState | null | undefined = null;
  /** Libby's own standing wants, loaded alongside her memory; null until then. */
  @state() private wants: LibbyWant[] | null = null;
  /** Which pictures in the library are of her. undefined = not fetched, or this server
      has no such endpoint — the panel degrades to a spinner rather than erroring. */
  @state() private identity: LibbyIdentity | undefined = undefined;
  /** A link found in what is being typed, and what the server made of it. The URL is
      held separately so a preview that arrives after the box has moved on can be
      recognised as stale. */
  @state() private pendingLink: SharedLink | null = null;
  private pendingLinkURL = "";
  /** The Discord connection. undefined = not fetched, or this server has no such
      endpoint — the panel degrades to a spinner rather than erroring. */
  @state() private discord: DiscordState | undefined = undefined;
  /** The servers the bot is in, fetched only when the picker is opened: it is a
      round trip to Discord per server, so it is not paid for by everyone. */
  @state() private discordPlaces: DiscordPlace[] | null = null;
  /** The token being pasted, and the user id being added. Both are cleared as soon
      as they are used — a bot token should not sit in a field on screen. */
  @state() private discordToken = "";
  @state() private discordUserDraft = "";
  /** Where the two of you stand, shown in the profile tab; null until loaded. */
  @state() private bond: LibbyBond | null = null;
  /** Her bond as read at startup, used to open a fresh conversation warm rather than
      cold. Separate from the panel copy above so seeding never waits on the tab. */
  private openingBond: LibbyBond | null = null;
  @state() private models: ChatModels | null = null;
  @state() private modelChoice = "";
  @state() private modelBusy = false;
  /** The rest of text-generation-webui — loaders, remembered arguments, LoRAs. Null
      until the model tab is opened against a backend that has them. */
  @state() private backend: ChatBackendInfo | null = null;
  /** The loader arguments being edited for the selected model. Keyed by the backend's
      own argument names; see LOADER_FIELDS. */
  @state() private loadArgs: Record<string, unknown> = {};
  /** Extra arguments as JSON, for anything LOADER_FIELDS does not name. */
  @state() private loadExtra = "";
  @state() private loadSettings = "";
  /** The LoRAs ticked for the next apply. */
  @state() private loraPicks: string[] = [];
  /** How many tokens the character card costs, measured by the model's tokenizer. */
  @state() private cardTokens: { tokens: number; exact: boolean } | null = null;

  /** The model whose deletion is being confirmed, with what is on disk behind it.
      Deleting is a filesystem operation on a directory shared with the backend, so the
      endpoints are admin-only and the button is hidden rather than shown-and-refused. */
  @state() private deleteTarget: ChatModelInspection | null = null;
  @state() private deleteConfirm = "";
  @state() private deletePermanent = false;
  @state() private deleteError = "";

  /** Deleting a model touches a directory shared with text-generation-webui, so the
      endpoints are admin-only and the control is hidden for everyone else rather than
      shown and refused. */
  private get canManageModels(): boolean {
    return !!this.user?.isAdmin;
  }
  @state() private mobileNavOpen = false;
  /** The chat list's search box. Filters by who, by title, and by what was last said. */
  @state() private chatSearch = "";
  /** The "new chat" screen is open in place of the list: who to start one with. */
  @state() private pickerOpen = false;
  /**
   * Whether turns are asked to return their working.
   *
   * Off by default and deliberately not remembered across reloads: it multiplies the
   * size of every reply, and a debugging switch left on for a month is one nobody
   * knows is on. See exportConversation.
   */
  @state() private captureTurns = false;
  /** The captured turns, by conversation id. Session-only, like the switch. */
  private turnLog = new Map<string, CapturedTurn[]>();
  /** True while a card file is being dragged over the roster. */
  @state() private cardDrop = false;
  /** What the last import found, kept on screen until the next one. */
  @state() private cardNote: { text: string; bad: boolean } | null = null;
  /** The AI is driving the conversation on its own. */
  @state() private autopilot = localStorage.getItem(AUTO_KEY) === "1";
  @state() private autoPaused = false;
  /** Counts down the auto turns left before it waits for the user again. */
  @state() private autoTurns = 0;
  @state() private stageOpen = true;
  /** The portrait column's width on this device, 0 for the default. See stageDragStart. */
  @state() private stageWidth = (() => { try { return Number(localStorage.getItem(STAGE_WIDTH_KEY)) || 0; } catch { return 0; } })();
  @state() private stageDragging = false;
  /** A picture the user has attached but not yet sent. */
  @state() private pendingPhoto: PendingPhoto | null = null;
  /**
   * What the typing indicator is doing right now.
   *
   * "typing" shows the dots; "thinking" clears them while leaving the turn in
   * progress — which is what a pause mid-message looks like from the other side of a
   * chat window. The reply is already in hand by then; this is purely about when the
   * user gets to see it.
   */
  @state() private typingPhase: "idle" | "typing" | "thinking" = "idle";
  /** The full-screen sprite view. Text chat keeps running underneath it. */
  @state() private callOpen = false;
  @state() private callSeconds = 0;
  /** She rang: the popup is up until it is answered, declined, or rings out. */
  @state() private incomingCall = false;
  private ringTimer = 0;
  /** The places she can be, for the call screen and its picker. Loaded when a call
      opens; refreshed when the picker is opened, since backgrounds are edited in the
      studio and this view has no other way to hear about it. */
  @state() private backgrounds: LibbyBackground[] = [];
  /** Where she is when a conversation has not said: the background the user marked
      as the default in the outfit studio. Empty means the plain stage. */
  @state() private defaultBackground = "";
  @state() private scenePickerOpen = false;
  @state() private callCaptions = true;
  /** The message the next thing you send is a reply to. */
  @state() private replyTarget: StoredChatMessage | null = null;
  /** Which message has its reaction row open, if any. */
  @state() private reactionPicker: string | null = null;
  /** The snap being looked at full-screen, if any. Closing it marks it opened. */
  @state() private snapOpen: StoredChatMessage | null = null;
  /** New tag for the send-weights editor. */
  @state() private weightTagDraft = "";
  /** Her reading time: the timer between your message landing and her picking it
      up. Sending again while it runs restarts it, so a burst is read together. */
  private readTimer = 0;
  /** What the pending turn carries — the photo, the link, the attached items from
      every message in the burst — merged until she reads them. */
  private turnOptions: { photoTags?: string[]; photoImageID?: string; link?: string; sharedMediaIds?: number[] } = {};
  /** Set when you sent something while she was still replying: she owes another
      turn once this one lands. */
  private pendingReply = false;
  /** A drag in progress on a message, for swipe-to-reply. */
  private swipe: { id: string; startX: number; startY: number; dx: number; live: boolean; el: HTMLElement } | null = null;
  /** Library items attached to the composer, sent with the next message. */
  @state() private pendingItems: LibbyAttachment[] = [];
  /** The library picker: its search box and what it found. */
  @state() private picker: { query: string; items: Media[]; loading: boolean } | null = null;
  private pickerSeq = 0;
  @query(".log") private log?: HTMLElement;
  @query(".composer textarea") private composer?: HTMLTextAreaElement;
  private callTimer = 0;
  private autoTimer = 0;
  /** Cached library snapshot for her no-model answers; see libraryFacts(). */
  private facts: LibbyContext | null = null;
  private factsAt = 0;
  private saveTimer = 0;
  /** Bumped on every local mutation so an in-flight save can tell it went stale. */
  private editSeq = 0;
  private idleTimer = 0;
  /** One nudge per idle stretch: set when she sends her unprompted follow-up, cleared
      whenever the user acts (which re-arms the timer). Keeps re-engagement a one-shot,
      not the loop autopilot is. */
  private idleNudged = false;
  private noticeTimer = 0;
  private resize?: ResizeObserver;
  /** What the server sampled the last turn with. State, not a plain field, because the
      advanced panel renders it: with no override set the sliders show these rather than a
      made-up default, so what is on screen is what was actually used. */
  @state() private lastSampling?: ChatSampling;
  /** Why the last reply carried the picture it did. Shown beside the sampling line
      so a wrong picture is a thing that can be read rather than guessed at. */
  @state() private lastPhoto?: ChatPhotoReport;
  /** Who the next gallery upload is of: "self", "other", or "" to let the scanner
      decide. Defaults to her — the panel is her gallery, and someone uploading here
      is adding pictures of her; photos shared in chat are scanned instead. */
  @state() private imageSubject = "self";

  /** Which of her offers have been decided this session; see ActionApprovals. */
  private approvals = new ActionApprovals(() => this.requestUpdate());

  static styles = [iconStyles, motionStyles, linkChipStyles, attachmentStyles, actionCardStyles, libbyMotion, css`
    :host { display:block; height:100%; color:var(--md-sys-color-on-surface);
      font:400 15px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans",system-ui,sans-serif;
      --side:var(--md-sys-color-surface-container-low); --main:var(--md-sys-color-surface);
      --hover:var(--md-sys-color-surface-container-high); --input:var(--md-sys-color-surface-container-highest);
      --bubble:var(--md-sys-color-surface-container-high); --muted:var(--md-sys-color-on-surface-variant);
      --line:var(--md-sys-color-outline-variant); --accent:var(--md-sys-color-primary); --on-accent:var(--md-sys-color-on-primary);
      --side-w:340px; --bar:60px;
      /* The portrait column. Sized to the viewport rather than fixed, so a wide screen
         shows more of her and a narrow one keeps room for the conversation. */
      --stage-w:clamp(236px,26vw,400px); --call-side-w:clamp(340px,32vw,460px); }
    button,input,textarea,select { font:inherit; }
    button { color:inherit; }
    /* Two panes, the way every messenger is laid out: the list of chats and the open
       chat. The portrait is a third pane that exists only when there is art to show. */
    .client { position:relative; display:grid; grid-template-columns:var(--side-w) minmax(0,1fr); height:100%; min-height:0;
      overflow:hidden; background:var(--main); }
    .client.with-stage { grid-template-columns:var(--side-w) minmax(0,1fr) var(--stage-w); }
    .avatar img,.chat-avatar img,.top-avatar img,.me-avatar img,.intro-avatar img,.pick-avatar img {
      width:100%; height:100%; object-fit:cover; object-position:top center; display:block; }
    .initial { font-weight:700; color:var(--on-accent); background:var(--accent); display:grid; place-items:center; }
    .icon-btn { border:0; background:transparent; border-radius:50%; width:38px; height:38px; display:grid; place-items:center;
      cursor:pointer; color:var(--muted); transition:background .12s ease,color .12s ease; }
    .icon-btn:hover,.icon-btn.on { background:var(--hover); color:var(--md-sys-color-on-surface); }
    .icon-btn.on { color:var(--accent); }
    .icon-btn:disabled { opacity:.4; cursor:default; }

    /* ── the chat list ───────────────────────────────────────────────────── */
    .side { min-width:0; display:flex; flex-direction:column; background:var(--side); border-right:1px solid var(--line); }
    .side-head { min-height:var(--bar); flex:0 0 var(--bar); display:flex; align-items:center; gap:4px; padding:0 8px 0 18px; }
    .side-head h1 { flex:1; min-width:0; margin:0; font-size:22px; font-weight:750; letter-spacing:-.01em; }
    .me-avatar { width:34px; height:34px; flex:0 0 34px; border-radius:50%; overflow:hidden; display:grid; place-items:center; font-size:12px; }
    .me-btn { border:0; background:transparent; padding:2px; border-radius:50%; cursor:pointer; }
    .search { margin:2px 12px 10px; display:flex; align-items:center; gap:8px; padding:7px 12px; border-radius:999px; background:var(--input); color:var(--muted); }
    .search input { flex:1; min-width:0; border:0; outline:0; background:transparent; color:var(--md-sys-color-on-surface); }
    .search input::placeholder { color:var(--muted); }
    .chats { flex:1; min-height:0; overflow-y:auto; padding:0 8px 10px; }
    .chat-wrap { position:relative; }
    .chat-row { width:100%; display:grid; grid-template-columns:52px minmax(0,1fr) auto; grid-template-rows:auto auto; gap:1px 12px; align-items:center;
      padding:9px 10px; border:0; border-radius:14px; background:transparent; color:inherit; text-align:left; cursor:pointer;
      transition:background .12s ease; }
    .chat-row:hover { background:var(--hover); }
    .chat-wrap.on .chat-row { background:color-mix(in srgb,var(--accent) 14%,transparent); }
    .chat-avatar { grid-row:1/3; width:52px; height:52px; border-radius:50%; overflow:hidden; display:grid; place-items:center; background:var(--input); font-size:16px; }
    .chat-name { font-weight:650; font-size:15px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .chat-name small { font-weight:500; color:var(--muted); }
    .chat-time { grid-column:3; font-size:11px; color:var(--muted); white-space:nowrap; align-self:start; padding-top:3px; }
    .chat-preview { grid-column:2/4; font-size:13px; color:var(--muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .chat-preview .material-symbols-rounded { font-size:14px; vertical-align:-2px; margin-right:3px; }
    .chat-delete { position:absolute; right:10px; bottom:8px; opacity:0; border:0; border-radius:50%; width:28px; height:28px; display:grid;
      place-items:center; background:var(--main); color:var(--muted); cursor:pointer; box-shadow:0 1px 4px rgba(0,0,0,.25); }
    .chat-wrap:hover .chat-delete,.chat-wrap:focus-within .chat-delete { opacity:1; }
    .chat-delete:hover { color:var(--md-sys-color-error); }
    .chats-empty { padding:32px 18px; color:var(--muted); font-size:13px; text-align:center; }
    /* Starting a chat: who with. Replaces the list rather than floating over it, so
       it works identically as a phone screen and as a desktop pane.
       NOT called .picker — that is the library picker's full-screen scrim further
       down this same stylesheet, and the later rule won: this panel rendered as a
       dark sheet across the whole app. One stylesheet, one shadow root, so a class
       name used twice here is a collision, not two scopes. */
    .friends { flex:1; min-height:0; overflow-y:auto; padding:0 8px 10px; display:flex; flex-direction:column; gap:2px; }
    .pick-wrap { position:relative; display:flex; align-items:center; border-radius:12px; }
    .pick-wrap:hover { background:var(--hover); }
    .pick { width:100%; display:grid; grid-template-columns:44px minmax(0,1fr); gap:0 12px; align-items:center; padding:8px 10px;
      border:0; border-radius:12px; background:transparent; color:inherit; text-align:left; cursor:pointer; }
    .pick:hover { background:var(--hover); }
    .pick-wrap .pick:hover { background:transparent; }
    /* The row's own actions. Hidden until the row is touched, so a roster of twelve
       is a list of people rather than a toolbar; always shown on coarse pointers,
       which have no hover to reveal them with. */
    .pick-acts { position:absolute; right:6px; display:flex; gap:2px; opacity:0; transition:opacity .12s ease; }
    .pick-wrap:hover .pick-acts, .pick-wrap:focus-within .pick-acts { opacity:1; }
    @media (hover:none) { .pick-acts { opacity:1; } }
    .pick-act { border:0; background:var(--side); color:var(--muted); cursor:pointer; display:grid; place-items:center;
      width:28px; height:28px; border-radius:8px; }
    .pick-act:hover { color:inherit; background:var(--input); }
    .pick-act.danger:hover { color:#f2b8b5; }
    .pick-act .material-symbols-rounded { font-size:16px; }
    /* Importing: a real target you can drop onto, not a file input hidden in a
       button's label. */
    .dropzone { margin:10px 2px 4px; padding:16px 14px; border:1.5px dashed var(--line); border-radius:14px;
      display:flex; flex-direction:column; align-items:center; gap:4px; text-align:center; cursor:pointer;
      color:var(--muted); font-size:12px; transition:border-color .12s ease, background .12s ease; }
    .dropzone:hover, .dropzone.over { border-color:var(--accent); background:color-mix(in srgb,var(--accent) 8%,transparent); }
    .dropzone input { display:none; }
    .dropzone strong { color:var(--text); font-size:13px; }
    .dropzone .material-symbols-rounded { font-size:26px; color:var(--accent); }
    .card-note { margin:2px; padding:9px 11px; border-radius:10px; background:var(--input); font-size:12px; line-height:1.45; }
    .card-note.bad { background:color-mix(in srgb,#f2b8b5 16%,transparent); color:#f2b8b5; }
    .pick-avatar { grid-row:1/3; width:44px; height:44px; border-radius:50%; overflow:hidden; display:grid; place-items:center; background:var(--input); font-size:14px; }
    .pick-name { font-weight:650; }
    .pick-sub { font-size:12px; color:var(--muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .pick.add .pick-avatar { background:color-mix(in srgb,var(--accent) 18%,transparent); color:var(--accent); }
    .pick-cat { padding:14px 12px 6px; color:var(--muted); font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; }

    /* ── the open chat ───────────────────────────────────────────────────── */
    .main { display:flex; min-width:0; min-height:0; flex-direction:column; background:var(--main); position:relative; }
    .top { min-height:var(--bar); flex:0 0 var(--bar); display:flex; align-items:center; gap:12px; padding:0 10px 0 16px; border-bottom:1px solid var(--line); }
    .mobile-nav { display:none!important; }
    .top-avatar { width:40px; height:40px; flex:0 0 40px; border-radius:50%; overflow:hidden; display:grid; place-items:center; background:var(--input); font-size:13px; }
    .top-title { min-width:0; flex:1; display:grid; gap:1px; }
    .top .name { font-weight:700; font-size:16px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .presence { display:flex; align-items:center; gap:6px; color:var(--muted); font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .status-dot { width:8px; height:8px; flex:0 0 8px; border-radius:50%; background:#8a8f98; }
    .status-dot.online { background:#35c46a; }
    .quick-mode { width:auto; max-width:124px; border-radius:999px; padding:6px 28px 6px 10px; font-size:12px; font-weight:650; background-color:var(--input); }
    .top-actions { display:flex; gap:2px; }

    .log { min-height:0; flex:1 1 0; overflow-y:auto; overflow-anchor:auto; padding:14px 18px 10px; display:flex; flex-direction:column; scroll-behavior:smooth; }
    .log > :first-child { margin-top:auto; } /* a short chat sits at the bottom, like a phone */
    .day { align-self:center; margin:12px 0 6px; padding:3px 11px; border-radius:999px; background:var(--input); color:var(--muted);
      font-size:11px; font-weight:650; }
    .intro { align-self:center; margin:auto 0 28px; padding:12px; display:grid; justify-items:center; gap:6px; max-width:460px; text-align:center; }
    .intro-avatar { width:92px; height:92px; border-radius:50%; overflow:hidden; display:grid; place-items:center; background:var(--input); font-size:28px; margin-bottom:6px; }
    .intro h2 { margin:0; font-size:20px; font-weight:750; }
    .intro p { margin:0; color:var(--muted); font-size:13px; line-height:1.5; }

    /* A message is a bubble. Theirs sit left with their avatar closing the run; yours
       sit right in the accent, with no avatar — you know who you are. Radii tighten on
       the side where a run continues, so a run reads as one voice speaking. */
    .msg { position:relative; display:grid; grid-template-columns:34px minmax(0,min(76%,680px)); gap:0 8px; align-items:end; margin-top:2px; }
    .msg.mine { grid-template-columns:minmax(0,min(76%,680px)); justify-content:end; }
    .msg.first { margin-top:10px; }
    .msg .avatar { width:34px; height:34px; border-radius:50%; overflow:hidden; display:grid; place-items:center; visibility:hidden; background:var(--input); font-size:11px; }
    .msg.last .avatar { visibility:visible; }
    .bubble-wrap { position:relative; min-width:0; display:grid; justify-items:start; }
    .msg.mine .bubble-wrap { justify-items:end; }
    .bubble { position:relative; min-width:0; max-width:100%; padding:8px 13px 6px; border-radius:18px; background:var(--bubble); }
    .msg.mine .bubble { background:var(--accent); color:var(--on-accent); }
    .msg.theirs:not(.last) .bubble { border-bottom-left-radius:6px; }
    .msg.theirs:not(.first) .bubble { border-top-left-radius:6px; }
    .msg.mine:not(.last) .bubble { border-bottom-right-radius:6px; }
    .msg.mine:not(.first) .bubble { border-top-right-radius:6px; }
    .text { white-space:pre-wrap; overflow-wrap:anywhere; }
    /* Roleplay prose is read by scanning for its parts — who spoke, what they did,
       what was stressed — so each keeps a hue of its own in their bubbles. In yours
       the bubble is already the accent, so the parts separate by weight instead. */
    .text .speech { color:var(--accent); font-weight:500; }
    .text .action { font-style:italic; font-weight:700;
      color:var(--md-sys-color-tertiary,color-mix(in srgb,var(--accent) 45%,var(--md-sys-color-on-surface))); }
    .text em { color:var(--md-sys-color-secondary,var(--muted)); font-style:italic; }
    .text code { background:var(--input); color:var(--md-sys-color-tertiary,var(--accent));
      padding:1px 4px; border-radius:3px; font-family:ui-monospace,"Cascadia Code",Consolas,monospace; font-size:.92em; }
    .text s { opacity:.55; }
    .msg.mine .text .speech,.msg.mine .text .action,.msg.mine .text em { color:inherit; }
    .msg.mine .text .speech { font-weight:600; }
    .msg.mine .text em { opacity:.85; }
    .msg.mine .text code { background:rgba(0,0,0,.18); color:inherit; }
    .meta { display:flex; justify-content:flex-end; align-items:center; gap:5px; margin-top:2px; font-size:10px; opacity:.6; line-height:1; }
    .sent-image { display:block; max-width:min(420px,100%); max-height:420px; border-radius:12px; margin-top:6px; object-fit:contain; background:var(--input); }
    /* A quoted reply: the earlier line sits above the new one on a bar, the way every
       messenger draws it. Clickable, because the point of a quote is to find what it
       quotes. In your own bubble the accent is the bubble, so the bar goes white. */
    .quote { display:grid; gap:1px; margin:0 0 6px; padding:5px 9px; border-left:3px solid var(--accent); border-radius:6px;
      background:color-mix(in srgb,var(--md-sys-color-on-surface) 7%,transparent); font-size:12.5px; cursor:pointer; text-align:left; border-top:0; border-right:0; border-bottom:0; color:inherit; width:100%; }
    .quote strong { font-size:11px; color:var(--accent); }
    .quote span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; opacity:.85; }
    .msg.mine .quote { border-left-color:rgba(255,255,255,.75); background:rgba(0,0,0,.16); }
    .msg.mine .quote strong { color:rgba(255,255,255,.9); }
    .msg.flash .bubble { animation:chat-flash 1.2s ease both; }
    /* Swipe to reply: the bubble follows the finger; the arrow behind it brightens
       when letting go will quote the message. */
    .msg { touch-action:pan-y; }
    .bubble-wrap.swiping { transition:none; }
    .bubble-wrap:not(.swiping) { transition:transform .18s var(--oppai-ease-standard,cubic-bezier(.2,0,0,1)); }
    .swipe-hint { position:absolute; left:-30px; top:50%; transform:translateY(-50%); font-size:20px; color:var(--muted); opacity:0; transition:opacity .15s; pointer-events:none; }
    .msg.mine .swipe-hint { left:-30px; }
    .bubble-wrap.swiping .swipe-hint { opacity:.5; }
    .bubble-wrap.will-reply .swipe-hint { opacity:1; color:var(--accent); }
    /* Receipts under your latest message. */
    .receipt { font-size:10.5px; color:var(--muted); margin:2px 6px 0; line-height:1; }
    .receipt.read { color:var(--accent); }
    /* Reactions: emoji tucked into the bubble's lower corner, overlapping the edge. */
    .reactions { position:absolute; bottom:-10px; right:8px; display:flex; gap:2px; }
    .msg.mine .reactions { right:auto; left:8px; }
    .reaction { border:1px solid var(--line); background:var(--surface,var(--bubble)); color:inherit; border-radius:999px; font-size:13px; line-height:1; padding:2px 6px; cursor:default; box-shadow:0 1px 2px rgba(0,0,0,.18); }
    .msg.theirs .reaction.user { cursor:pointer; }
    .msg:has(.reactions) .bubble { margin-bottom:8px; }
    .react-row { position:absolute; bottom:calc(100% + 6px); left:0; z-index:2; display:flex; gap:2px; padding:4px; border:1px solid var(--line); border-radius:999px; background:var(--surface,var(--bubble)); box-shadow:0 6px 18px rgba(0,0,0,.24); animation:chat-rise .18s ease both; }
    .msg.mine .react-row { left:auto; right:0; }
    .react-row button { border:0; background:transparent; font-size:20px; line-height:1; padding:5px 6px; border-radius:999px; cursor:pointer; transition:transform .12s; }
    .react-row button:hover { transform:scale(1.3); background:var(--hover); }
    .react-row button.on { background:var(--hover); }
    .react-row button.close { color:var(--muted); display:grid; place-items:center; }
    /* Snaps: a tile, never the picture. */
    .snap { display:grid; grid-template-columns:auto 1fr; grid-template-rows:auto auto; column-gap:10px; align-items:center; margin-top:6px; padding:10px 14px 10px 12px; border:0; border-radius:12px; cursor:pointer; text-align:left; font:inherit; color:inherit;
      background:linear-gradient(135deg,rgba(255,255,255,.14),rgba(255,255,255,.04)); box-shadow:inset 0 0 0 1.5px var(--accent); min-width:180px; }
    .snap .material-symbols-rounded { grid-row:1/3; font-size:28px; color:var(--accent); }
    .snap > span:not(.material-symbols-rounded) { font-weight:700; font-size:13px; }
    .snap em { font-style:normal; font-size:11px; opacity:.7; }
    .snap.opened { cursor:default; box-shadow:inset 0 0 0 1.5px var(--line); opacity:.6; grid-template-rows:auto; }
    .snap.opened .material-symbols-rounded { color:var(--muted); grid-row:auto; }
    .snap-viewer { position:fixed; inset:0; z-index:40; display:grid; place-items:center; background:rgba(0,0,0,.92); cursor:pointer; animation:chat-fade .2s ease both; }
    .snap-viewer img { max-width:100vw; max-height:100vh; object-fit:contain; }
    .snap-viewer p { color:#fff; }
    .snap-close { position:absolute; bottom:24px; left:0; right:0; text-align:center; color:rgba(255,255,255,.7); font-size:12px; }
    /* Send weights. */
    .image-card .weight { display:flex; align-items:center; gap:5px; font-size:11px; color:var(--muted); }
    .shelf { margin:14px 0 8px; font-size:13px; font-weight:650; display:grid; gap:2px; }
    .shelf span { font-size:11px; font-weight:400; color:var(--muted); }
    .upload-row select.field { min-width:0; width:100%; }
    .image-card .weight select { font:inherit; font-size:11px; background:var(--surface,var(--input)); color:inherit; border:1px solid var(--line); border-radius:6px; padding:2px 4px; }
    .weights { margin-top:14px; }
    .weight-rows { display:grid; gap:4px; }
    .weight-row { display:grid; grid-template-columns:1fr auto auto; align-items:center; gap:8px; padding:4px 0 4px 8px; border-radius:8px; background:var(--input); }
    .weight-tag { font-weight:600; overflow-wrap:anywhere; }
    .weight-row select { font:inherit; background:var(--surface,var(--bubble)); color:inherit; border:1px solid var(--line); border-radius:6px; padding:3px 6px; }
    .weight-add { display:flex; gap:6px; align-items:center; margin-top:8px; flex-wrap:wrap; }
    .weight-add .field { flex:1 1 90px; min-width:0; }
    .weight-suggest { display:flex; flex-wrap:wrap; gap:5px; margin-top:8px; }
    .weight-suggest .chip { border:1px solid var(--line); background:transparent; color:var(--muted); border-radius:999px; padding:3px 9px; font:inherit; font-size:11px; cursor:pointer; }
    .weight-suggest .chip:hover { color:inherit; background:var(--hover); }
    @keyframes chat-flash { 0%,100% { box-shadow:0 0 0 0 transparent; } 25% { box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 70%,transparent); } }
    /* Hover actions sit just above the bubble, on the side away from the edge. */
    .msg-actions { opacity:0; position:absolute; top:-14px; right:6px; z-index:1; display:flex; border:1px solid var(--line); border-radius:8px;
      overflow:hidden; background:var(--main); box-shadow:0 2px 8px rgba(0,0,0,.18); transition:opacity .12s ease; }
    .msg.mine .msg-actions { right:auto; left:6px; }
    .msg:hover .msg-actions,.msg:focus-within .msg-actions { opacity:1; }
    .msg-actions button { border:0; background:transparent; padding:5px; cursor:pointer; color:var(--muted); display:grid; }
    .msg-actions button:hover { color:inherit; background:var(--hover); }
    /* Something she thought, or muttered to herself. It has to be impossible to read
       as a message to you, so it shares none of a message's furniture: no bubble, no
       avatar, and it sits in the middle the way a system line does. An overheard
       mutter is drawn warmer than a private thought, since one of them reached you. */
    .thought { align-self:center; max-width:min(72%,560px); margin:8px 0 2px; text-align:center; font-size:13px; font-style:italic;
      color:color-mix(in srgb,var(--md-sys-color-on-surface) 68%,transparent);
      animation:chat-rise .3s var(--oppai-ease-standard,cubic-bezier(.2,0,0,1)) both; }
    .thought-label { display:flex; justify-content:center; align-items:center; gap:5px; font-style:normal; font-size:11px; color:var(--muted); margin-bottom:2px; }
    .thought-label .material-symbols-rounded { font-size:15px; }
    .thought.aloud { font-style:normal; color:color-mix(in srgb,var(--md-sys-color-on-surface) 84%,transparent); }
    .thought.aloud .thought-label .material-symbols-rounded { color:var(--md-sys-color-tertiary,var(--accent)); }
    .typing-row .bubble { padding:11px 14px; }
    .dots { display:inline-flex; gap:4px; }
    .dots i { width:7px; height:7px; border-radius:50%; background:var(--muted); animation:chat-bounce 1.1s infinite ease-in-out; }
    .dots i:nth-child(2) { animation-delay:.16s; } .dots i:nth-child(3) { animation-delay:.32s; }
    @keyframes chat-bounce { 0%,60%,100% { transform:translateY(0); opacity:.55; } 30% { transform:translateY(-4px); opacity:1; } }
    @keyframes chat-rise { from { opacity:0; transform:translateY(8px); } }
    @keyframes chat-fade { from { opacity:0; } }
    @keyframes chat-sprite-in { from { opacity:0; transform:translateY(10px) scale(.985); } }
    /* Only the run-opening row animates. Lit reuses a row's DOM across renders, so
       this fires when a message is appended and not on every state change. */
    .msg.first,.typing-row { animation:chat-rise .26s var(--oppai-ease-standard,cubic-bezier(.2,0,0,1)) both; }
    .sent-image { animation:chat-fade .35s ease both; }
    .intro { animation:chat-rise .34s var(--oppai-ease-standard,cubic-bezier(.2,0,0,1)) both; }

    /* ── composer ────────────────────────────────────────────────────────── */
    form.composer-form { padding:8px 14px 12px; border-top:1px solid var(--line); background:var(--main); }
    .composer { display:flex; align-items:flex-end; gap:8px; }
    .box { flex:1; min-width:0; display:flex; align-items:flex-end; gap:4px; background:var(--input); border:1px solid transparent; border-radius:22px; padding:6px 6px 6px 8px; }
    .box:focus-within { border-color:color-mix(in srgb,var(--accent) 55%,transparent); }
    .composer textarea { resize:none; border:0; outline:0; background:transparent; color:inherit; max-height:160px; min-height:24px; line-height:24px; flex:1; padding:6px 6px; }
    .attach-btn { position:relative; width:36px; height:36px; flex:0 0 36px; display:grid; place-items:center; border-radius:50%; color:var(--muted); cursor:pointer; }
    .attach-btn:hover { color:var(--md-sys-color-on-surface); background:var(--hover); }
    .attach-btn.off { opacity:.4; pointer-events:none; }
    .attach-btn input { position:absolute; inset:0; opacity:0; cursor:pointer; }
    .attach-btn.off input { cursor:default; }
    .send { width:42px; height:42px; flex:0 0 42px; border:0; border-radius:50%; background:var(--accent); color:var(--on-accent); display:grid; place-items:center; cursor:pointer;
      transition:transform .12s var(--oppai-ease-spring,cubic-bezier(.34,1.4,.64,1)),opacity .12s ease; }
    .send:disabled { opacity:.35; cursor:default; }
    .send:not(:disabled):active { transform:scale(.9); }
    .format-help { color:var(--muted); font-size:10px; padding:5px 6px 0; display:flex; justify-content:space-between; }
    .send-help::after { content:"Enter to send · Shift+Enter for a new line"; }
    /* Attached photo, held in the composer until the message is sent. */
    .attachment { display:flex; align-items:center; gap:10px; margin:0 0 8px; padding:8px; border:1px solid var(--line);
      border-radius:14px; background:var(--input); }
    .attachment img { width:44px; height:44px; flex:0 0 44px; border-radius:9px; object-fit:cover; }
    .attachment-copy { min-width:0; flex:1; display:grid; }
    .attachment-copy strong { font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .attachment-copy span { color:var(--muted); font-size:11px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    /* The link found in the box, previewed before the message goes. Deliberately text
       only: nothing here renders the page, and the address is shown plainly so where
       the link goes is visible rather than hidden behind whatever it called itself. */
    .link-preview .link-icon { width:44px; flex:0 0 44px; text-align:center; color:var(--muted); }
    .link-preview .link-host { color:var(--muted); font-size:11px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    /* What the next message answers, and what it carries. Both sit above the box the
       way a messenger stacks them, each with its own close. */
    .reply-preview { border-left:3px solid var(--accent); }
    .reply-preview .link-icon { color:var(--accent); }
    .items-preview { display:flex; flex-wrap:wrap; gap:6px; margin:0 0 8px; }
    .item-chip { display:flex; align-items:center; gap:6px; padding:4px 6px 4px 4px; border:1px solid var(--line); border-radius:10px; background:var(--side); font-size:12px; max-width:100%; }
    .item-chip img,.item-chip .chip-icon { width:28px; height:28px; border-radius:6px; object-fit:cover; flex:0 0 28px; display:grid; place-items:center; background:var(--input); color:var(--muted); }
    .item-chip .chip-icon .material-symbols-rounded { font-size:18px; }
    .item-chip strong { font-weight:500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:180px; }
    .item-chip button { border:0; background:transparent; color:var(--muted); cursor:pointer; display:grid; padding:2px; border-radius:50%; }
    .item-chip button:hover { color:inherit; background:var(--hover); }
    /* The library picker: a sheet over the log, search on top, a grid of what matched. */
    .picker { position:absolute; inset:0; z-index:55; display:grid; place-items:center; background:rgba(0,0,0,.45); animation:chat-fade .15s ease both; }
    .picker-card { width:min(720px,94%); max-height:min(80%,640px); display:flex; flex-direction:column; border-radius:18px; background:var(--main); box-shadow:0 20px 60px rgba(0,0,0,.4); overflow:hidden; }
    .picker-head { display:flex; align-items:center; gap:8px; padding:12px 12px 8px 16px; }
    .picker-head input { flex:1; min-width:0; border:0; outline:0; border-radius:999px; padding:9px 14px; background:var(--input); color:inherit; }
    .picker-grid { flex:1; min-height:0; overflow:auto; display:grid; grid-template-columns:repeat(auto-fill,minmax(120px,1fr)); gap:8px; padding:6px 16px 16px; }
    .picker-tile { position:relative; border:2px solid transparent; border-radius:12px; overflow:hidden; background:var(--input); cursor:pointer; aspect-ratio:1; display:grid; padding:0; color:inherit; }
    .picker-tile img { width:100%; height:100%; object-fit:cover; grid-area:1/1; }
    .picker-tile .tile-kind { grid-area:1/1; place-self:center; color:var(--muted); font-size:34px; }
    .picker-tile .tile-name { grid-area:1/1; align-self:end; padding:18px 7px 6px; font-size:11px; text-align:left; color:#fff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
      background:linear-gradient(to top,rgba(0,0,0,.75),transparent); }
    .picker-tile.on { border-color:var(--accent); }
    .picker-tile.on::after { content:"check"; font-family:"Material Symbols Rounded"; position:absolute; top:6px; right:6px; width:22px; height:22px; border-radius:50%; background:var(--accent); color:var(--on-accent); display:grid; place-items:center; font-size:16px; }
    .picker-foot { display:flex; align-items:center; gap:8px; padding:10px 16px; border-top:1px solid var(--line); color:var(--muted); font-size:12px; }
    .picker-foot .autobar-btn { margin-left:auto; }
    .picker-empty { grid-column:1/-1; padding:30px; text-align:center; color:var(--muted); font-size:13px; }

    /* ── autopilot ───────────────────────────────────────────────────────── */
    .autobar { display:flex; align-items:center; gap:9px; padding:8px 16px; font-size:12px;
      border-bottom:1px solid var(--line); background:color-mix(in srgb,var(--accent) 12%,var(--side));
      animation:chat-rise .24s var(--oppai-ease-standard,cubic-bezier(.2,0,0,1)) both; }
    .autobar.idle { background:var(--side); color:var(--muted); }
    .autobar .material-symbols-rounded { font-size:18px; color:var(--accent); }
    .autobar.idle .material-symbols-rounded { color:var(--muted); animation:none; }
    .autobar:not(.idle) .material-symbols-rounded { animation:chat-bounce 2.4s infinite ease-in-out; }
    .autobar-copy { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .autobar-btn { border:1px solid var(--line); border-radius:999px; padding:3px 11px; background:transparent;
      color:inherit; font-size:11px; font-weight:650; cursor:pointer; }
    .autobar-btn:hover { background:var(--hover); }

    /* ── portrait stage ──────────────────────────────────────────────────── */
    /* The column is a scene, not a strip with a picture at the top of it. The room
       she is in (the call's background, when there is one) fills it behind her, the
       sprite stands in it as large as the column allows, and what there is to say
       about her — who she is, what she is feeling and doing, where, how warm the
       conversation has run — sits on a frosted card at the foot, the way a video
       call overlays the person rather than putting a caption under a frame. */
    .stage { position:relative; min-width:0; display:flex; flex-direction:column; background:var(--side); border-left:1px solid var(--line); overflow:hidden; }
    .stage-scene { position:relative; flex:1; min-height:0; isolation:isolate; overflow:hidden; }
    .stage-bg { position:absolute; inset:-3%; background-size:cover; background-position:center; z-index:0; }
    .stage-bg.room { filter:blur(10px) saturate(1.05) brightness(.7); transform:scale(1.04); }
    .stage-bg.plain { background:
      radial-gradient(90% 55% at 50% 18%,color-mix(in srgb,var(--accent) 34%,transparent),transparent 70%),
      radial-gradient(120% 40% at 50% 100%,color-mix(in srgb,var(--accent) 22%,transparent),transparent 60%),
      linear-gradient(to bottom,color-mix(in srgb,var(--main) 60%,var(--side)),var(--side)); }
    .stage-veil { position:absolute; inset:0; z-index:0; pointer-events:none;
      background:linear-gradient(to bottom,rgba(0,0,0,.28),transparent 22%,transparent 58%,rgba(0,0,0,.55)); }
    /* A soft pool of light where she stands, so she reads as *in* the room. */
    .stage-floor { position:absolute; left:0; right:0; bottom:40px; height:46%; z-index:0; pointer-events:none;
      background:radial-gradient(60% 70% at 50% 100%,color-mix(in srgb,var(--accent) 32%,transparent),transparent 72%); opacity:.9; }
    /* The sprite wrapper carries the idle breathing and the sprite itself carries the
       per-line reaction, so a rock into a new message does not cancel the idle loop.
       The art is a cowboy shot — head to mid-thigh, 1024×1344 — kept whole (contain)
       and as large as the scene allows, standing on the card rather than behind it:
       the card overlaps her thighs, which the shot ends at anyway. */
    .stage-art { position:absolute; inset:60px 8px 100px; z-index:1; display:grid; place-items:center; }
    .stage-art .sprite-hold { display:grid; place-items:center; width:100%; height:100%; transform-origin:50% 100%; }
    .stage-art .sprite { width:100%; height:100%; object-fit:contain; object-position:center;
      transform-origin:50% 100%; filter:drop-shadow(0 14px 30px rgba(0,0,0,.5)); }
    .stage-art.empty-art { place-items:center; gap:8px; align-content:center; padding:16px; text-align:center; color:var(--muted); font-size:12px; }
    .stage-art.empty-art .material-symbols-rounded { font-size:44px; opacity:.5; }
    /* Her typing, shown on her rather than only in the log: a speech bubble of dots
       up by her head, with a tail — and, between replies, her last line in the same
       place, so the column reads as her talking rather than a still. */
    .stage-bubble { position:absolute; top:10px; right:10px; max-width:70%; padding:9px 12px; border-radius:16px; border-bottom-left-radius:4px; background:var(--bubble);
      box-shadow:0 3px 10px rgba(0,0,0,.22); animation:chat-rise .2s var(--oppai-ease-standard,cubic-bezier(.2,0,0,1)) both; z-index:2; }
    .stage-bubble::after { content:""; position:absolute; left:-6px; bottom:6px; border:7px solid transparent; border-right-color:var(--bubble); border-left:0; }
    .stage-bubble.quote { font-size:12px; line-height:1.35; color:var(--md-sys-color-on-surface); }
    /* The card at the foot. */
    .stage-glass { position:absolute; left:10px; right:10px; bottom:10px; z-index:3; display:grid; gap:7px; padding:10px 12px 11px; border-radius:16px;
      background:color-mix(in srgb,var(--main) 72%,transparent); backdrop-filter:blur(12px) saturate(1.2); border:1px solid color-mix(in srgb,var(--line) 70%,transparent);
      box-shadow:0 10px 30px rgba(0,0,0,.3); }
    .stage-who { display:flex; align-items:center; gap:8px; min-width:0; }
    .stage-name { font-weight:750; font-size:15px; color:var(--md-sys-color-on-surface); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .stage-status { flex:1; min-width:0; color:var(--muted); font-size:11px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .stage-chips { display:flex; flex-wrap:wrap; gap:5px; }
    .stage-chip { display:inline-flex; align-items:center; gap:4px; padding:3px 9px 3px 7px; border-radius:999px; background:var(--input); font-size:11px; font-weight:650; letter-spacing:.01em; color:var(--md-sys-color-on-surface); }
    .stage-chip .material-symbols-rounded { font-size:14px; color:var(--accent); }
    .stage-chip.doing { background:color-mix(in srgb,var(--accent) 18%,var(--input)); }
    /* The heat run: five segments, filled to the meter, warming in colour as it climbs. */
    .stage-heat { display:flex; align-items:center; gap:6px; font-size:10.5px; color:var(--muted); text-transform:uppercase; letter-spacing:.06em; }
    .stage-heat .segs { display:flex; gap:3px; flex:1; }
    .stage-heat i { flex:1; height:4px; border-radius:2px; background:var(--line); transition:background .3s ease; }
    .stage-heat i.on { background:var(--accent); }
    .stage-heat.h4 i.on { background:color-mix(in srgb,var(--accent) 60%,#ff7a3d); }
    .stage-heat.h5 i.on { background:color-mix(in srgb,var(--accent) 35%,#ff3d5a); }
    /* Tools, shown on hover: the actions the column is for. */
    .stage-tools { position:absolute; top:8px; right:8px; z-index:4; display:flex; gap:2px; padding:3px; border-radius:999px;
      background:color-mix(in srgb,var(--main) 70%,transparent); backdrop-filter:blur(8px); opacity:0; transition:opacity .15s ease; }
    .stage:hover .stage-tools,.stage:focus-within .stage-tools { opacity:1; }
    .stage-tools .icon-btn { width:32px; height:32px; }
    .stage-tools .icon-btn .material-symbols-rounded { font-size:19px; }
    .stage .call-tray { right:10px; left:10px; bottom:118px; width:auto; }
    /* Drag the column's edge to size it; the width is kept per device. */
    .stage-grip { position:absolute; left:-3px; top:0; bottom:0; width:7px; cursor:col-resize; z-index:5; }
    .stage-grip:hover,.stage-grip.dragging { background:color-mix(in srgb,var(--accent) 40%,transparent); }
    /* Under this width the column goes and the banner below takes over: same art,
       same reactions, along the top of the conversation instead of beside it. */
    @media(max-width:960px){ .client.with-stage { grid-template-columns:var(--side-w) minmax(0,1fr); } .stage { display:none; } .client.with-stage .hero { display:block; } }

    /* ── the banner ──────────────────────────────────────────────────────── */
    /* Her bust along the top of the chat, for screens with no room for the column.
       The sprite is drawn at a fixed width and the box crops it at the chest, which
       on a cowboy shot is a head-and-shoulders framing rather than a figure shrunk to
       fit. Tapping it opens the call, where all of her fits. */
    .hero { position:relative; display:none; height:124px; flex:0 0 auto; overflow:hidden; border-bottom:1px solid var(--line); cursor:pointer;
      background:radial-gradient(120% 160% at 84% 10%,color-mix(in srgb,var(--accent) 30%,transparent),transparent 62%),var(--side); }
    .hero-hold { position:absolute; right:10px; top:4px; width:156px; height:100%; transform-origin:50% 100%; }
    .hero-sprite { width:100%; height:auto; display:block; object-fit:contain; object-position:top center;
      transform-origin:50% 100%; filter:drop-shadow(0 6px 16px rgba(0,0,0,.4)); }
    .hero-copy { position:absolute; left:16px; right:180px; bottom:12px; display:grid; gap:3px; min-width:0; }
    .hero-name { font-weight:750; font-size:16px; color:var(--accent); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .hero-status { font-size:12px; color:var(--muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .stage-doing { margin:0 auto; padding:3px 11px; border-radius:999px; background:var(--input); font-size:11px; font-weight:650; letter-spacing:.02em; opacity:.85; }
    .hero .stage-doing { margin:0; justify-self:start; }
    .hero-bubble { position:absolute; right:168px; top:16px; padding:8px 11px; border-radius:16px; border-bottom-right-radius:4px; background:var(--bubble);
      box-shadow:0 3px 10px rgba(0,0,0,.22); animation:chat-rise .2s var(--oppai-ease-standard,cubic-bezier(.2,0,0,1)) both; z-index:2; }
    .hero-bubble::after { content:""; position:absolute; right:-6px; bottom:6px; border:7px solid transparent; border-left-color:var(--bubble); border-right:0; }
    .hero-open { position:absolute; right:10px; bottom:8px; z-index:2; display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:999px;
      background:rgba(0,0,0,.35); color:#fff; font-size:11px; font-weight:650; backdrop-filter:blur(4px); }
    .hero-open .material-symbols-rounded { font-size:14px; }
    .notice { margin:0 16px 8px; padding:9px 12px; border-left:3px solid var(--accent); background:var(--side); border-radius:9px; font-size:13px; }
    .notice.error { border-color:var(--md-sys-color-error); color:var(--md-sys-color-error); }
    .backend-state { padding:9px 16px; border-bottom:1px solid var(--line); background:var(--side); color:var(--muted); font-size:12px; }
    .backend-state strong { color:var(--md-sys-color-error); }
    .backend-state.load-error { display:flex; align-items:center; flex-wrap:wrap; gap:8px;
      border-left:3px solid var(--md-sys-color-error); }
    .backend-state.load-error .autobar-btn { margin-left:auto; }
    .load-failed { grid-column:1/-1; padding:24px; display:grid; gap:10px; justify-items:start; align-content:start; }
    .load-failed h2 { margin:0; font-size:18px; }
    .load-failed p { margin:0; color:var(--muted); overflow-wrap:anywhere; }
    .load-failed .hint { font-size:12px; }
    /* Settings read as their own room, the way Discord's do: a category rail on the
       left, one panel on the right, and no tab strip competing with the header. */
    .settings { position:absolute; inset:var(--bar) 0 0 0; z-index:5; display:grid; grid-template-columns:212px minmax(0,1fr);
      overflow:hidden; background:var(--main); box-shadow:0 10px 28px rgba(0,0,0,.28);
      animation:chat-fade .16s ease both; }
    .settings-nav { display:flex; flex-direction:column; gap:2px; padding:14px 8px; overflow-y:auto; background:var(--side); }
    .nav-cat { padding:12px 10px 4px; color:var(--muted); font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; }
    .nav-row { display:flex; align-items:center; gap:10px; border:0; border-radius:5px; padding:8px 10px; background:transparent;
      color:var(--muted); font-size:14px; font-weight:550; text-align:left; cursor:pointer; transition:background .12s ease,color .12s ease; }
    .nav-row span:last-child { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .nav-row .material-symbols-rounded { font-size:18px; }
    .nav-row:hover { background:var(--hover); color:var(--md-sys-color-on-surface); }
    .nav-row.on { background:var(--hover); color:var(--md-sys-color-on-surface); }
    .nav-sep { height:1px; margin:8px 10px; background:var(--line); }
    .settings-body { min-width:0; overflow-y:auto; background:var(--main); }
    .settings-head { position:sticky; top:0; z-index:2; display:flex; align-items:center; gap:8px; padding:16px 16px 10px; background:var(--main); }
    .settings-head strong { flex:1; font-size:19px; }.settings-head span { display:block; color:var(--muted); font-size:11px; font-weight:400; }
    /* Capped rather than full-bleed: settings are a reading column, and stretched
       across a wide desktop the label/control pairs drift far apart. */
    .panel { padding:14px 16px 22px; display:grid; gap:16px; max-width:760px; }
    .grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
    .group { display:grid; gap:11px; padding:14px; border:1px solid var(--line); border-radius:10px; background:var(--main); }
    .group h3 { margin:0; font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:var(--muted); display:grid; gap:3px; }
    .group h3 span { font-size:11px; font-weight:400; text-transform:none; letter-spacing:0; }
    details summary { cursor:pointer; color:var(--muted); font-size:12px; padding:2px 0; }
    details[open] summary { margin-bottom:6px; }
    label { display:grid; gap:4px; color:var(--muted); font-size:11px; font-weight:650; text-transform:uppercase; }.field,select { box-sizing:border-box; width:100%; color:var(--md-sys-color-on-surface);
      background:var(--input); border:1px solid var(--line); border-radius:5px; padding:8px; outline:0; text-transform:none; font-weight:400; }
    textarea.field { min-height:66px; resize:vertical; }.range { display:grid; grid-template-columns:1fr 48px; gap:8px; align-items:center; }.range input { accent-color:var(--accent); }.range output { text-align:right; color:inherit; }
    /* "auto" beside a slider the server is still choosing for. Inline so it sits on the
       caption line rather than becoming a second grid row under it. */
    .grid label .hint { display:inline; margin-left:5px; color:var(--accent); font-weight:600; letter-spacing:.02em; }
    .sampling { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:8px;
      font-size:12px; color:var(--muted); text-transform:none; }
    .sampling strong { color:var(--md-sys-color-on-surface); font-weight:650; }
    .mem-panel { display:grid; gap:8px; border-top:1px solid var(--line); padding-top:16px; }
    .mem-list { list-style:none; margin:0; padding:0; display:grid; gap:6px; }
    .mem-list li { display:flex; align-items:flex-start; gap:8px; background:var(--side); border-radius:8px; padding:8px 10px; font-size:13px; }
    .mem-list li span { flex:1; }
    .mem-forget { flex:none; border:0; border-radius:6px; padding:3px; background:transparent; color:var(--muted); cursor:pointer; display:flex; }
    .mem-forget:hover { color:var(--md-sys-color-error); background:var(--main); }
    /* Only the last of the three per-memory buttons is destructive, so the error colour is
       scoped to it — a pin turning red on hover reads as "this will delete it". */
    .mem-forget:not(:last-child):hover { color:var(--accent); }
    /* A pinned memory shows it at rest, not only on hover: it is a state, not an action. */
    .mem-forget.pinned { color:var(--accent); }
    .mem-tags { display:inline-flex; flex-wrap:wrap; gap:4px; margin-left:6px; vertical-align:middle; }
    .mem-kind { font-style:normal; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.04em;
      border-radius:4px; padding:1px 5px; background:var(--main); color:var(--muted); }
    .mem-kind.boundary { color:var(--md-sys-color-error); }
    .mem-kind.unsure { color:var(--muted); font-style:italic; }
    .mem-kind.mine { color:var(--accent); }
    .mem-list li.mem-editing { display:grid; gap:6px; }
    .mem-add { display:grid; grid-template-columns:1fr auto; gap:6px; align-items:center; }
    /* A checkbox and its wording on one line — the generic label rule stacks them. */
    .mem-toggle { display:flex; align-items:center; gap:8px; text-transform:none; font-size:13px; font-weight:400;
      color:var(--md-sys-color-on-surface); cursor:pointer; }
    .mem-toggle input { accent-color:var(--accent); margin:0; }
    details summary { cursor:pointer; color:var(--muted); font-size:12px; padding:4px 0; }
    .panel-actions { display:flex; flex-wrap:wrap; gap:7px; }.primary,.secondary,.danger { border:1px solid var(--line); border-radius:5px; padding:7px 11px; cursor:pointer; background:transparent; }
    .primary { background:var(--accent); border-color:var(--accent); color:var(--on-accent); }.danger { color:var(--md-sys-color-error); }    /* A span, not a label: the generic label rule sets display:grid and an
       uppercase caption, which fought the button styling and misaligned the old
       upload control. The transparent input covers the span, so a click on the
       chip is a click on the input. */
    .pfp-row { display:grid; grid-template-columns:80px minmax(0,1fr); gap:14px; align-items:center; }
    .pfp { width:80px; height:80px; border-radius:50%; overflow:hidden; background:var(--input); display:grid; place-items:center; }
    .pfp img { width:100%; height:100%; object-fit:cover; object-position:top center; display:block; }
    .pfp-initial { font-size:24px; font-weight:700; color:var(--on-accent); background:var(--accent); width:100%; height:100%; display:grid; place-items:center; }
    /* The character card reuses avatar() for its preview, which brings its own
       .initial fallback rather than the .pfp-initial span the profile panel uses. */
    .pfp.initial { font-size:24px; }
    .pfp-actions { display:grid; gap:5px; justify-items:start; }.pfp-actions strong { font-size:14px; }
    /* Three cells that wrap: the tags field and the subject select share a row when
       there is room, and the upload button takes a row of its own when there is not.
       The panel is narrow whenever the portrait is open, which is most of the time. */
    .upload-row { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:10px; align-items:end; }
    .upload-row label { display:grid; gap:4px; min-width:0; }
    .file-btn { position:relative; overflow:hidden; display:inline-grid; place-items:center; white-space:nowrap;
      border:1px solid var(--line); border-radius:5px; padding:9px 12px; cursor:pointer; font-size:13px; }
    .file-btn:hover { background:var(--hover); }
    .file-btn input { position:absolute; inset:0; opacity:0; cursor:pointer; font-size:0; }
    @media(max-width:700px){ .upload-row { grid-template-columns:1fr; } }
    .image-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(120px,1fr)); gap:9px; }.image-card { background:var(--input); border-radius:7px; overflow:hidden; position:relative; }
    .image-card img { width:100%; height:110px; object-fit:cover; display:block; }
    .image-card .card-body { padding:6px; font-size:11px; overflow-wrap:anywhere; display:grid; gap:5px; justify-items:start; }
    .image-card .card-name { font-weight:600; overflow-wrap:anywhere; }.image-card .card-tags { color:var(--muted); }
    /* Scoped to the remove control. This used to select .image-card button, which
       also caught the "Use avatar" button in the card body and stacked it on top
       of the delete control in the same absolute corner. */
    .image-card .remove { position:absolute; right:4px; top:4px; width:22px; height:22px; display:grid; place-items:center;
      border:0; border-radius:50%; background:rgba(0,0,0,.7); color:white; cursor:pointer; line-height:1; }
    .image-card .remove:hover { background:var(--md-sys-color-error); }
    .image-card .card-body button { border:1px solid var(--line); border-radius:5px; padding:4px 8px; background:transparent; cursor:pointer; }
    .badge { background:var(--accent); color:var(--on-accent); border-radius:3px; padding:1px 5px; font-size:10px; font-weight:700; }
    .empty { color:var(--muted); font-size:13px; }
    /* Model deletion. Deliberately shows facts rather than asking "are you sure": a
       model is gigabytes over someone's connection, and that is not a question anyone
       can answer without the path, the size and the file list. */
    .model-delete { margin-top:10px; padding:12px; border-radius:12px; background:var(--oppai-surface-2); display:flex; flex-direction:column; gap:10px; }
    .model-delete > strong { font-size:13px; }
    .model-delete-facts { display:flex; flex-direction:column; gap:5px; font-size:12px; }
    .model-delete-facts > div { display:flex; gap:8px; align-items:baseline; }
    .model-delete-facts span { min-width:46px; color:var(--oppai-text-muted); text-transform:uppercase; font-size:10px; letter-spacing:.05em; }
    /* A model path can be long and there is no useful way to shorten one, so it wraps
       rather than making the panel scroll sideways. */
    .model-delete code { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:11px; word-break:break-all; }
    .model-delete-files { margin:8px 0 0; padding-left:18px; max-height:150px; overflow-y:auto; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:11px; line-height:1.6; }
    /* A checkbox with its explanation beside it, used by the profile's memory consent
       and the model-delete confirmation. Text-transform is reset because these sit
       inside <label>s the panel otherwise uppercases. */
    .inline-check { display:flex; gap:8px; align-items:flex-start; font-size:12px; text-transform:none; letter-spacing:normal; }
    .inline-check input { margin-top:2px; flex-shrink:0; }
    .empty.error { color:var(--md-sys-color-error); }
    .send.stop { background:var(--md-sys-color-error); color:var(--md-sys-color-on-error); }
    .loader,.samplers { border:1px solid var(--line); border-radius:12px; padding:8px 12px; display:grid; gap:10px; }
    .loader summary,.samplers summary { cursor:pointer; font-size:12px; font-weight:650; text-transform:uppercase; letter-spacing:.04em; color:var(--muted); display:flex; gap:8px; align-items:center; }
    .loader summary .hint,.samplers summary .hint { margin-left:auto; text-transform:none; letter-spacing:normal; font-weight:500; }
    .loader details { display:grid; gap:10px; }
    .loader details summary { font-weight:600; }
    .loader-grid { grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); }
    .loader-check { align-self:end; padding-bottom:8px; }
    .loader code,.samplers code { font-size:11px; }
    .lora-list { display:grid; gap:4px; }
    .model-row { display:flex; align-items:center; gap:9px; }.model-row strong { min-width:0; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:600; text-transform:none; }
    @media(max-width:1000px){ :host { --side-w:300px; } }
    @media(max-width:700px){
      /* A phone shows one screen at a time: the list, or the chat with a back arrow. */
      .client{display:block;height:100%;min-height:0}.main{height:100%}
      .side{display:none;position:absolute;inset:0;z-index:12;width:100%;border-right:0}
      .client.nav-open .side{display:flex}
      .mobile-nav{display:grid!important}.top{padding-left:6px;gap:8px}.quick-mode{max-width:96px;padding-left:8px}.grid{grid-template-columns:1fr}
      .msg{grid-template-columns:28px minmax(0,84%)}.msg.mine{grid-template-columns:minmax(0,84%)}.msg .avatar{width:28px;height:28px}
      .log{padding:10px 10px 8px}.destructive-action{display:none}.format-help{display:none}
      /* Long-press opens the message menu on a phone; a row of buttons under every bubble is noise. */
      .msg-actions{display:none}
      .intro{margin-bottom:16px}.panel{padding-left:12px;padding-right:12px}
      /* No room for a rail: the categories become a scrolling strip above the panel. */
      .settings{inset:var(--bar) 0 0;grid-template-columns:minmax(0,1fr);grid-template-rows:auto minmax(0,1fr)}
      .settings-nav{flex-direction:row;align-items:center;gap:4px;padding:8px;overflow-x:auto;overflow-y:hidden;border-bottom:1px solid var(--line)}
      .nav-cat,.nav-sep,.nav-row.close{display:none}
      .nav-row{flex:0 0 auto;padding:7px 12px;border-radius:999px}
      .pfp-row{grid-template-columns:64px minmax(0,1fr)}.pfp{width:64px;height:64px}
      .call-caption{max-width:100%}
    }
    /* She is ringing you. A notification, not a screen: it floats over whatever you
       were doing, rings for a while, and either you pick up or it stops. */
    .incoming { position:absolute; top:14px; left:50%; transform:translateX(-50%); z-index:70; display:flex; align-items:center; gap:12px;
      padding:10px 12px 10px 10px; border-radius:20px; background:var(--side); border:1px solid var(--line); box-shadow:0 14px 40px rgba(0,0,0,.35);
      animation:chat-rise .25s var(--oppai-ease-standard,cubic-bezier(.2,0,0,1)) both; max-width:calc(100% - 28px); }
    .incoming .avatar { width:46px; height:46px; flex:0 0 46px; border-radius:50%; overflow:hidden; display:grid; place-items:center; animation:call-ring 1.3s ease-out infinite; }
    @keyframes call-ring { 0% { box-shadow:0 0 0 0 color-mix(in srgb,var(--accent) 60%,transparent); } 100% { box-shadow:0 0 0 14px transparent; } }
    .incoming-copy { display:grid; gap:1px; min-width:0; }
    .incoming-copy strong { font-size:14px; }
    .incoming-copy span { font-size:12px; color:var(--muted); }
    .incoming-btn { width:42px; height:42px; flex:0 0 42px; border:0; border-radius:50%; display:grid; place-items:center; cursor:pointer; color:#fff; }
    .incoming-btn.yes { background:#2fb35a; animation:call-nudge 1.3s ease-in-out infinite; }
    .incoming-btn.no { background:var(--md-sys-color-error); color:var(--md-sys-color-on-error,#fff); }
    @keyframes call-nudge { 0%,100% { transform:rotate(0); } 15% { transform:rotate(-12deg); } 30% { transform:rotate(10deg); } 45% { transform:rotate(0); } }

    /* ── video call ──────────────────────────────────────────────────────── */
    /* Covers the whole client. The room she is in fills the frame, she stands in it,
       and everything else — who, how long, how she feels, what was said — is laid
       over it in the thinnest chrome that still reads. */
    .call { position:absolute; inset:0; z-index:60; display:grid; grid-template-rows:minmax(0,1fr) auto; grid-template-columns:minmax(0,1fr);
      background:#000; color:#fff; animation:chat-fade .2s ease both; }
    .call-scene { position:relative; min-width:0; min-height:0; overflow:hidden; isolation:isolate; }
    .call-bg { position:absolute; inset:-2%; background-size:cover; background-position:center; transform:scale(1.02);
      transition:background-image .4s ease, filter .4s ease; }
    .call-bg.plain { background:radial-gradient(120% 90% at 50% 12%,color-mix(in srgb,var(--accent) 30%,transparent),transparent 68%),
      linear-gradient(180deg,#1a1620,#0b0a0d); }
    .call-bg.blurred { filter:blur(14px) saturate(1.1) brightness(.85); }
    .call-veil { position:absolute; inset:0; background:linear-gradient(to bottom,rgba(0,0,0,.55),transparent 22%,transparent 62%,rgba(0,0,0,.6)); pointer-events:none; }
    /* Same two-layer arrangement as the stage: the hold breathes, the sprite reacts. */
    /* The hold's one row is sized 1fr rather than auto. That is what makes the
       sprite's percentage max-height mean anything: a grid item's percentage
       resolves against its grid area, and an auto row is indefinite, so
       "max-height:100%" was being treated as none — which is why she overflowed the
       scene and stood far too close on every screen. */
    .call-hold { position:absolute; inset:0; display:grid; grid-template-rows:minmax(0,1fr); grid-template-columns:minmax(0,1fr);
      place-items:end center; transform-origin:50% 100%; padding-top:52px; box-sizing:border-box; }
    .call-sprite { max-height:100%; max-width:min(100%,720px); object-fit:contain; object-position:bottom center; transform-origin:50% 100%;
      filter:drop-shadow(0 14px 26px rgba(0,0,0,.5)); animation:call-pose .32s var(--oppai-ease-standard,cubic-bezier(.2,0,0,1)) both; }
    @keyframes call-pose { from { opacity:0; transform:translateY(10px) scale(.99); } }
    .call-top { position:absolute; top:0; left:0; right:0; z-index:2; display:flex; align-items:center; gap:10px; padding:12px 14px; }
    .call-who { display:flex; align-items:center; gap:10px; padding:6px 12px 6px 6px; border-radius:999px; background:rgba(0,0,0,.42); backdrop-filter:blur(8px); }
    .call-who .avatar { width:32px; height:32px; flex:0 0 32px; border-radius:50%; overflow:hidden; display:grid; place-items:center; font-size:12px; }
    .call-who strong { font-size:14px; display:block; line-height:1.15; }
    .call-who span { font-size:11px; opacity:.8; display:flex; align-items:center; gap:5px; }
    .call-live { width:7px; height:7px; border-radius:50%; background:#f04747; animation:call-blink 1.6s ease-in-out infinite; }
    @keyframes call-blink { 50% { opacity:.25; } }
    .call-mood { margin-left:auto; display:flex; align-items:center; gap:7px; padding:6px 11px; border-radius:999px;
      background:rgba(0,0,0,.42); backdrop-filter:blur(8px); font-size:12px; font-weight:650; text-transform:capitalize; }
    .call-mood .material-symbols-rounded { font-size:16px; }
    .call-doing { padding-left:7px; border-left:1px solid rgba(255,255,255,.22); opacity:.85; font-weight:600; }
    .call-place { font-size:11px; opacity:.85; font-weight:500; text-transform:none; padding-left:7px; border-left:1px solid rgba(255,255,255,.22); }
    /* Subtitles: the last few lines, hers and yours, newest at the bottom and
       brightest, older ones dimmer above it. Yours are tinted so a glance tells who
       said what without a name on each. */
    .call-captions { position:absolute; left:0; right:0; bottom:12px; z-index:2; display:grid; gap:6px; justify-items:center; padding:0 14px; pointer-events:none; }
    .call-caption { max-width:min(680px,92%); margin:0; padding:9px 14px; border-radius:14px; background:rgba(0,0,0,.56); backdrop-filter:blur(6px);
      font-size:15px; line-height:1.4; white-space:pre-wrap; overflow-wrap:anywhere; animation:chat-rise .25s var(--oppai-ease-standard,cubic-bezier(.2,0,0,1)) both; }
    .call-caption.older { opacity:.62; font-size:13px; }
    .call-caption.mine { background:color-mix(in srgb,var(--accent) 62%,rgba(0,0,0,.6)); }
    .call-caption .speech { color:color-mix(in srgb,var(--accent) 70%,#fff); }
    .call-caption.mine .speech { color:#fff; }
    .call-caption .action { color:rgba(255,255,255,.82); }
    .call-caption.typing { padding:11px 16px; }
    .call-caption.typing .dots i { background:rgba(255,255,255,.8); }
    /* The scene picker: a tray over the bar with the rooms she can be in, plus the plain
       stage, plus letting her choose. */
    .call-tray { position:absolute; right:12px; bottom:76px; z-index:3; width:min(420px,calc(100% - 24px)); padding:12px; border-radius:16px; background:rgba(14,14,18,.94); backdrop-filter:blur(10px);
      box-shadow:0 14px 40px rgba(0,0,0,.5); animation:chat-rise .18s var(--oppai-ease-standard,cubic-bezier(.2,0,0,1)) both; }
    .call-tray h4 { margin:0 0 8px; font-size:12px; font-weight:650; color:rgba(255,255,255,.7); text-transform:uppercase; letter-spacing:.06em; }
    .call-scenes { display:grid; grid-template-columns:repeat(auto-fill,minmax(96px,1fr)); gap:8px; max-height:240px; overflow:auto; }
    .call-scene-btn { position:relative; aspect-ratio:16/10; border:2px solid transparent; border-radius:10px; overflow:hidden; background:#26242c; padding:0; cursor:pointer; color:#fff; display:grid; }
    .call-scene-btn img { width:100%; height:100%; object-fit:cover; grid-area:1/1; }
    .call-scene-btn .scene-name { grid-area:1/1; align-self:end; padding:14px 6px 5px; font-size:11px; text-align:left; background:linear-gradient(to top,rgba(0,0,0,.8),transparent); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .call-scene-btn .scene-icon { grid-area:1/1; place-self:center; font-size:26px; opacity:.7; }
    .call-scene-btn.on { border-color:var(--accent); }
    .call-tray p { margin:8px 0 0; font-size:12px; color:rgba(255,255,255,.6); }
    .call-tray p a { color:var(--accent); cursor:pointer; }
    .call-bar { display:flex; align-items:center; gap:8px; min-width:0; padding:10px 14px; background:#0c0c10; }
    .call-input { flex:1; width:0; min-width:0; border:0; border-radius:999px; padding:11px 16px; background:rgba(255,255,255,.1); color:#fff; }
    .call-input::placeholder { color:rgba(255,255,255,.5); }
    .call-input:focus { outline:2px solid var(--accent); outline-offset:-2px; }
    .call-btn { width:44px; height:44px; flex:0 0 44px; border:0; border-radius:50%; background:rgba(255,255,255,.1); color:#fff;
      display:grid; place-items:center; cursor:pointer; transition:background .12s ease; }
    .call-btn:hover:not(:disabled) { background:rgba(255,255,255,.2); }
    .call-btn.on { background:color-mix(in srgb,var(--accent) 80%,#000); }
    .call-btn:disabled { opacity:.45; cursor:default; }
    .call-btn.send { background:var(--accent); color:var(--on-accent); }
    .call-btn.end { background:#e5484d; color:#fff; }
    .call-note { position:absolute; top:64px; left:50%; transform:translateX(-50%); z-index:3; padding:6px 12px; border-radius:999px; background:rgba(0,0,0,.6); font-size:12px; animation:chat-rise .2s ease both; }
    @media (max-width:640px) { .call-mood .call-place,.call-mood .call-doing { display:none; } .call-btn.captions { display:none; } }
    /* On a screen with the room for it the call is the screen: she and her room take
       the main pane and the conversation moves into a sidebar on the right — the same
       log, composer and attachments as before, so nothing is lost by picking up. The
       chat list and the portrait column step aside; the call bar keeps only what the
       sidebar does not already do. Narrower than this it stays a full-screen overlay
       with subtitles and its own input, since there is no room for both. */
    @media (min-width:901px) {
      .client.in-call { grid-template-columns:minmax(0,1fr) var(--call-side-w); }
      .client.in-call .side,.client.in-call .stage,.client.in-call .hero,.client.in-call .mobile-nav { display:none; }
      .client.in-call .call { position:relative; inset:auto; order:-1; z-index:auto; min-height:0; animation:none; }
      .client.in-call .main { border-left:1px solid var(--line); }
      .client.in-call .call-input,.client.in-call .call-btn.send { display:none; }
      /* The log is right there: the subtitles keep only her latest line, under her. */
      .client.in-call .call-caption.older,.client.in-call .call-caption.mine { display:none; }
      .client.in-call .call-bar { justify-content:center; }
      /* On a desktop the call fills a large window, and a sprite scaled to its full
         height was a woman standing far too close to the camera. She is framed at a
         conversational distance instead: about four fifths of the room, with air
         above her and room either side, the way a webcam actually frames a person. */
      .client.in-call .call-hold { padding-top:72px; }
      .client.in-call .call-sprite { max-height:min(82%,900px); max-width:min(50%,600px); }
      .client.in-call .msg { grid-template-columns:28px minmax(0,88%); }
      .client.in-call .msg.mine { grid-template-columns:minmax(0,88%); }
      .client.in-call .msg .avatar { width:28px; height:28px; }
      .client.in-call .log { padding:10px 12px 8px; }
      .client.in-call .format-help,.client.in-call .destructive-action { display:none; }
      /* Settings opened from the sidebar get the phone treatment: no room for a rail. */
      .client.in-call .settings { grid-template-columns:minmax(0,1fr); grid-template-rows:auto minmax(0,1fr); }
      .client.in-call .settings-nav { flex-direction:row; align-items:center; gap:4px; padding:8px; overflow-x:auto; overflow-y:hidden; border-bottom:1px solid var(--line); }
      .client.in-call .nav-cat,.client.in-call .nav-sep,.client.in-call .nav-row.close { display:none; }
      .client.in-call .nav-row { flex:0 0 auto; padding:7px 12px; border-radius:999px; }
    }
    /* A linked title in the prose. Underlined the way a link is, in the accent on her
       side and in the bubble's own ink on yours. */
    .inline-link { color:var(--accent); text-decoration:underline; text-decoration-style:dotted; text-decoration-thickness:1.5px; text-underline-offset:3px; cursor:pointer; font-weight:600; }
    .inline-link:hover { text-decoration-style:solid; }
    .msg.mine .inline-link,.call-caption .inline-link { color:inherit; }
    @media (prefers-reduced-motion:reduce) { .call,.call-sprite { animation:none; } }
  `];

  connectedCallback() {
    super.connectedCallback();
    profileUpdates(this, "chat");
    // Library may have queued a picture before this element existed, so the share
    // is claimed after the workspace loads as well as on the event.
    void this.load().then(() => void this.claimShare());
    window.addEventListener("keydown", this.onGlobalKey);
    window.addEventListener(SHARE_EVENT, this.onShared);
  }

  disconnectedCallback() {
    window.clearTimeout(this.ringTimer);
    super.disconnectedCallback();
    window.clearTimeout(this.saveTimer); window.clearTimeout(this.idleTimer); window.clearTimeout(this.noticeTimer);
    window.clearTimeout(this.autoTimer); window.clearInterval(this.callTimer); window.clearTimeout(this.readTimer);
    window.removeEventListener("keydown", this.onGlobalKey);
    window.removeEventListener(SHARE_EVENT, this.onShared);
    this.resize?.disconnect();
  }

  private onShared = () => { void this.claimShare(); };

  /**
   * Takes a picture handed over from Library and attaches it to the composer for
   * the character it was shared with.
   *
   * It is left as a draft attachment rather than sent: sharing chose the picture,
   * not the words to go with it, and the message is still the user's to write.
   */
  private async claimShare() {
    const share = takePendingShare();
    if (!share) return;
    const target = this.workspace.characters.find((character) => character.id === share.characterId);
    if (!target) { this.say("That character no longer exists.", true); return; }
    if (this.characterID !== target.id) this.activateCharacter(target.id);
    try {
      this.say(`Scanning ${share.name} locally…`);
      const image = await api.uploadChatImage({
        characterId:target.id, name:share.name, imageData:share.imageData, tags:[],
      });
      this.workspace.images.push(image);
      this.pendingPhoto = { imageId:image.id, tags:image.tags ?? [], name:image.name };
      this.touchWorkspace();
      this.say(`Ready to show ${target.name} — add a message and send.`);
      this.focusComposer();
    } catch (error) { this.say((error as Error).message, true); }
  }

  /** Escape hangs up, the way it dismisses every other overlay in the app. */
  private onGlobalKey = (event: KeyboardEvent) => {
    if (event.key === "Escape" && this.callOpen) { event.stopPropagation(); this.endCall(); }
  };

  protected firstUpdated() {
    this.resize = new ResizeObserver(() => void this.scrollToEnd(false));
    if (this.log) this.resize.observe(this.log);
    this.focusComposer();
  }

  /**
   * Returns the caret to the message box after anything that could have taken it.
   *
   * Chat is a typing surface: every button here is something you press between
   * sentences, so leaving focus on the button you just clicked means reaching for
   * the mouse again to carry on. Focus is not stolen while a dialog is open —
   * settings and the call overlay own the caret for as long as they are up.
   */
  private focusComposer() {
    if (this.settingsOpen) return;
    void this.updateComplete.then(() => {
      // During a call the call's own field is the message box; focusing the one
      // buried under the overlay would put the caret somewhere invisible.
      const box = (this.callOpen
        ? this.renderRoot.querySelector(".call-input")
        : this.composer) as HTMLInputElement | HTMLTextAreaElement | null;
      if (!box || box.disabled) return;
      // preventScroll: the composer sits below a scrolling log, and focusing it
      // otherwise yanks the log to the bottom mid-read.
      box.focus({ preventScroll: true });
      box.setSelectionRange(box.value.length, box.value.length);
    });
  }

  // Unparameterised PropertyValues: these are private fields, and PropertyValues<this>
  // only admits public keys.
  protected updated(changed: PropertyValues) {
    // Generating a reply is the common case where focus would otherwise be lost:
    // the send button goes disabled under the cursor and the browser drops it.
    if (changed.has("busy") && !this.busy) this.focusComposer();
    if (changed.has("conversationID") || changed.has("characterID")) this.focusComposer();
    if (changed.has("settingsOpen") && !this.settingsOpen) this.focusComposer();
    if (changed.has("callOpen")) this.focusComposer();
    this.animateArrival();
  }

  /** The id of the last message we animated, so one arrival plays once. */
  private lastArrivalID = "";

  /**
   * Animates the newest message in, once.
   *
   * Done here rather than with a class in the template because a template class replays
   * on every re-render: any unrelated state change would re-animate the whole log. This
   * stamps only the last row, only when its id has changed since the previous pass, and
   * markArrival removes the class when the animation ends so a long conversation does
   * not accumulate a hundred "new" markers.
   */
  private animateArrival() {
    const messages = this.activeConversation?.messages;
    const last = messages?.[messages.length - 1];
    if (!last) {
      this.lastArrivalID = "";
      return;
    }
    if (last.id === this.lastArrivalID) return;
    // A conversation switch replaces the whole log; animating one row of it would single
    // out an arbitrary message. Adopt the id silently instead.
    const switching = !this.lastArrivalID;
    this.lastArrivalID = last.id;
    if (switching) return;
    markArrival(this.renderRoot.querySelector(".log article.msg:last-of-type"));
  }

  private get activeCharacter(): ChatCharacter | undefined {
    const roster = this.visibleCharacters;
    return roster.find((character) => character.id === this.characterID) ?? roster[0];
  }

  /** The signed-in workspace stays complete while the public login wears its disguise. */
  private get visibleCharacters(): ChatCharacter[] {
    return this.workspace.characters;
  }

  /**
   * How many times the character has spoken in this conversation.
   *
   * Used purely as an animation key: it changes at exactly the moment a new reply
   * lands, which is what makes the portrait rock into each line rather than only
   * when her mood happens to change.
   */
  private get spoken(): number {
    return this.activeConversation?.messages.reduce((n, m) => n + (m.role === "assistant" ? 1 : 0), 0) ?? 0;
  }

  private get activeConversation(): ChatConversation | undefined {
    return this.workspace.conversations.find((conversation) => conversation.id === this.conversationID);
  }

  private conversationsFor(characterID = this.characterID): ChatConversation[] {
    return this.workspace.conversations.filter((conversation) => conversation.characterId === characterID)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * Brings the chat screen up.
   *
   * The two fetches are settled independently. Only one of them talks to the text
   * generation box, and whether that box is up has nothing to do with whether the
   * user's own conversations can be shown — joining them with Promise.all meant a
   * slow or unreachable generator decided if the screen loaded at all. Whichever
   * answers is used, and a workspace that cannot be read falls back to a local
   * Libby rather than an empty view, so the screen always ends up interactive.
   */
  private async load() {
    const [status, workspace, bond] = await Promise.allSettled([api.chatStatus(), api.chatWorkspace(), api.libbyBond()]);
    try {
      if (status.status === "fulfilled") this.status = status.value;
      if (workspace.status === "fulfilled") {
        this.workspace = normalizeWorkspace(workspace.value);
        this.workspaceLoaded = true;
      } else {
        this.workspace = fallbackWorkspace();
        this.workspaceLoaded = false;
        this.loadError = (workspace.reason as Error)?.message || "Couldn't load your chat workspace.";
      }
      // Open where she actually is, not cold. If she has a bond, seed the session meter
      // from her decayed heat — capped so she reopens warm but never at peak out of
      // nowhere. A fresh conversation reads this via getIntensity(); an existing one keeps
      // its own stored heat when activated below.
      if (bond.status === "fulfilled" && bond.value.lastSeenAt) {
        this.openingBond = bond.value;
        setIntensity(Math.min(Math.max(1, Math.round(bond.value.heatNow || 1)), AMBIENT_MAX_INTENSITY));
      }
      this.characterID = this.workspace.characters[0]?.id ?? "libby";
      const existing = this.conversationsFor(this.characterID)[0];
      if (existing) this.activateConversation(existing.id);
      else this.newConversation(false);
      if (this.status?.modelBackend) void this.refreshModels(true);
    } catch (error) {
      // Anything thrown while building the opening conversation would otherwise
      // leave the spinner up forever, since a render that throws leaves the last
      // DOM in place. Report it and let the finally clause hand over a usable view.
      this.loadError = (error as Error).message || "Chat failed to start.";
    } finally { this.loading = false; }
  }

  /** Re-runs the initial load after a failure, from the banner's Retry button. */
  private async retryLoad() {
    if (this.loading) return;
    this.loadError = ""; this.loading = true;
    await this.load();
  }

  private say(message: string, error = false) {
    this.notice = message; this.noticeError = error;
    window.clearTimeout(this.noticeTimer); this.noticeTimer = window.setTimeout(() => (this.notice = ""), 4200);
  }

  /**
   * The library snapshot Libby answers from when no model is loaded.
   *
   * Cached for a minute: it is fetched on the reply path, so asking her three things
   * in a row should not mean three round trips, and the numbers do not move fast
   * enough for a fresher copy to read any differently. A failure is swallowed —
   * she loses the facts, not the reply.
   */
  private async libraryFacts(): Promise<LibbyContext | null> {
    if (this.facts && Date.now() - this.factsAt < 60_000) return this.facts;
    try {
      this.facts = await api.libbyContext();
      this.factsAt = Date.now();
    } catch { /* The ordinary reply engine still answers. */ }
    return this.facts;
  }

  /** Guards the lazy load in renderProfilePanel from firing on every re-render. */
  private memoriesLoading = false;

  /** Loads what Libby remembers, once, when the profile tab first needs it. */
  private async loadMemories(force = false) {
    if (this.memoriesLoading) return;
    this.memoriesLoading = true;
    try {
      const listing = await api.libbyMemory();
      this.memories = listing.memories;
      // The kind vocabulary and the cap come from the server so the editor's picker and the
      // panel's explanation cannot drift from what the store actually enforces.
      this.memoryKinds = listing.kinds ?? [];
      this.memoryLimit = listing.limit ?? 0;
    } catch { if (!force) this.memories = []; }
    finally { this.memoriesLoading = false; }
  }

  private async forgetMemory(id: string) {
    try {
      await api.forgetLibbyMemory(id);
      this.memories = (this.memories ?? []).filter((memory) => memory.id !== id);
    } catch (error) { this.say(error instanceof Error ? error.message : "Couldn't forget that.", true); }
  }

  /** Adds a fact she has not picked up on. Certain, and attributed to the user. */
  private async addMemory() {
    const text = this.memoryDraft.trim();
    if (text.length < 8) return;
    try {
      await api.addLibbyMemory({ text });
      this.memoryDraft = "";
      // Refetched rather than appended: the server may have merged this into a memory she
      // already had, and may have forgotten something else to make room.
      await this.loadMemories(true);
      this.say("She'll remember that.");
    } catch (error) { this.say(error instanceof Error ? error.message : "Couldn't save that.", true); }
  }

  /** Pins a memory so it is never forgotten, or lets it fade normally again. */
  private async togglePin(memory: LibbyMemory) {
    try {
      const updated = await api.updateLibbyMemory(memory.id, { pinned: !memory.pinned });
      this.memories = (this.memories ?? []).map((m) => (m.id === memory.id ? updated : m));
    } catch (error) { this.say(error instanceof Error ? error.message : "Couldn't pin that.", true); }
  }

  private async saveMemoryEdit(memory: LibbyMemory) {
    const text = this.memoryDraftEdit.trim();
    if (text.length < 8) { this.say("A memory needs to be a sentence, not a fragment.", true); return; }
    try {
      const updated = await api.updateLibbyMemory(memory.id, {
        text,
        // Only sent when the picker actually moved, so a text-only fix leaves the kind alone.
        kind: this.memoryKindEdit && this.memoryKindEdit !== memory.kind ? this.memoryKindEdit : undefined,
      });
      this.memories = (this.memories ?? []).map((m) => (m.id === memory.id ? updated : m));
      this.editingMemory = null;
    } catch (error) { this.say(error instanceof Error ? error.message : "Couldn't save that.", true); }
  }

  private async clearMemories() {
    if (!confirm("Clear everything Libby remembers about you? This can't be undone.")) return;
    try {
      await api.clearLibbyMemory();
      this.memories = [];
    } catch (error) { this.say(error instanceof Error ? error.message : "Couldn't clear her memory.", true); }
  }

  /** Guards the lazy load of her wants from firing on every re-render. */
  private wantsLoading = false;

  /** Loads Libby's own wants, once, when the profile tab first needs them. */
  private async loadWants() {
    if (this.wantsLoading) return;
    this.wantsLoading = true;
    try {
      this.wants = (await api.libbyWants()).wants;
    } catch { this.wants = []; }
    finally { this.wantsLoading = false; }
  }

  private async forgetWant(id: string) {
    try {
      await api.forgetLibbyWant(id);
      this.wants = (this.wants ?? []).filter((want) => want.id !== id);
    } catch (error) { this.say(error instanceof Error ? error.message : "Couldn't drop that.", true); }
  }

  private async clearWants() {
    if (!confirm("Clear everything Libby has been wanting? This can't be undone.")) return;
    try {
      await api.clearLibbyWants();
      this.wants = [];
    } catch (error) { this.say(error instanceof Error ? error.message : "Couldn't clear her wants.", true); }
  }

  /** Guards the lazy load of the bond from firing on every re-render. */
  private bondLoading = false;

  /** Loads where the two of you stand, once, when the profile tab first needs it. */
  private async loadBond() {
    if (this.bondLoading) return;
    this.bondLoading = true;
    try {
      this.bond = await api.libbyBond();
    } catch { this.bond = null; }
    finally { this.bondLoading = false; }
  }

  private async resetBond() {
    if (!confirm("Start fresh with Libby? She'll forget where you left off — the time, the mood, how close you've grown. Your memories and her wants are kept.")) return;
    try {
      await api.resetLibbyBond();
      this.bond = null; this.openingBond = null;
      setIntensity(1);
      this.say("Reset. Your next chat with Libby starts fresh.");
    } catch (error) { this.say(error instanceof Error ? error.message : "Couldn't reset that.", true); }
  }

  private async refreshModels(quiet = false) {
    try {
      const [models, status] = await Promise.all([api.chatModels(), api.chatStatus()]);
      this.models = models;
      this.status = status;
      if (!quiet) this.say(status.enabled ? `Connected to ${status.model || "the loaded model"}.` : status.message || "No model is loaded.", !status.enabled);
      // The loader menu and the LoRAs are two more round trips to the backend, and
      // only text-generation-webui answers them; a generic server keeps its cheap panel.
      if (models.supported) void this.refreshBackend();
      else this.backend = null;
    } catch (error) { if (!quiet) this.say((error as Error).message, true); }
  }

  private async refreshBackend() {
    try {
      this.backend = await api.chatBackendInfo();
      this.loraPicks = [...(this.backend.loras?.loaded ?? [])];
      this.seedLoadArgs(this.modelChoice || this.models?.loaded || this.models?.models[0] || "");
    } catch { this.backend = null; }
  }

  /**
   * Starts the loader form from what the model was last loaded with. A model never
   * loaded from here starts blank, which means "whatever the backend has set" — the
   * behaviour before the form existed.
   */
  private seedLoadArgs(model: string) {
    const remembered = this.backend?.loads?.[model];
    const args = { ...(remembered?.args ?? {}) };
    const known = new Set<string>(LOADER_FIELDS.flatMap((f) => f.keys));
    const extra: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(args)) if (!known.has(key)) extra[key] = value;
    for (const key of Object.keys(extra)) delete args[key];
    this.loadArgs = args;
    this.loadExtra = Object.keys(extra).length ? JSON.stringify(extra, null, 2) : "";
    this.loadSettings = remembered?.settings && Object.keys(remembered.settings).length ? JSON.stringify(remembered.settings, null, 2) : "";
  }

  /** The arguments the load will send: the form, then the extra JSON on top. */
  private composeLoadArgs(): { args: Record<string, unknown>; settings: Record<string, unknown> } {
    const args: Record<string, unknown> = {};
    for (const field of LOADER_FIELDS) {
      const value = this.loadArgs[field.keys[0]];
      if (value === undefined || value === "" || value === null) continue;
      if (field.kind === "check" && !value) continue;
      // The names moved between releases (n_ctx became ctx_size); the backend takes
      // the one it knows and ignores the other, so both go.
      for (const key of field.keys) args[key] = value;
    }
    if (this.loadExtra.trim()) Object.assign(args, JSON.parse(this.loadExtra) as Record<string, unknown>);
    const settings = this.loadSettings.trim() ? JSON.parse(this.loadSettings) as Record<string, unknown> : {};
    return { args, settings };
  }

  private setLoadArg(field: LoaderField, raw: string | boolean) {
    const next = { ...this.loadArgs };
    const key = field.keys[0];
    if (field.kind === "check") { if (raw) next[key] = true; else delete next[key]; }
    else if (field.kind === "number") { const n = Number(raw); if (raw === "" || Number.isNaN(n)) delete next[key]; else next[key] = n; }
    else if (raw === "") delete next[key];
    else next[key] = raw;
    this.loadArgs = next;
  }

  private async applyLoras() {
    if (this.modelBusy) return;
    this.modelBusy = true;
    try {
      const loras = await api.setChatLoras(this.loraPicks);
      if (this.backend) this.backend = { ...this.backend, loras };
      this.loraPicks = [...loras.loaded];
      this.say(loras.loaded.length ? `Applied ${loras.loaded.join(", ")}.` : "LoRAs cleared.");
    } catch (error) { this.say((error as Error).message, true); }
    finally { this.modelBusy = false; }
  }

  /**
   * Stops the reply being written. The backend returns what it had so far, which the
   * turn then delivers as the reply — so this is "that's enough", not "throw it away".
   */
  private async stopGeneration() {
    try { await api.stopChat(); this.say("Stopping…"); }
    catch (error) { this.say((error as Error).message, true); }
  }

  /** Measures the card the way the model will read it. */
  private async measureCard(character: ChatCharacter) {
    const text = [character.description, character.personality, character.scenario, character.kinks, character.systemPrompt, character.exampleDialogue, character.firstMessage]
      .filter(Boolean).join("\n\n");
    try { this.cardTokens = await api.countChatTokens(text); }
    catch (error) { this.say((error as Error).message, true); }
  }

  private touchWorkspace() {
    // profile is copied too. It was the one branch left shared, which is exactly how the
    // orphaned-reference bug editProfile documents came about.
    this.workspace = { ...this.workspace, profile: { ...this.workspace.profile }, characters: [...this.workspace.characters], conversations: [...this.workspace.conversations], images: [...this.workspace.images] };
    this.editSeq++;
    window.clearTimeout(this.saveTimer); this.saveTimer = window.setTimeout(() => void this.saveWorkspace(), 450);
  }

  private async saveWorkspace() {
    window.clearTimeout(this.saveTimer);
    // The stand-in workspace is not the user's: writing it back would replace real
    // characters and conversations with an empty shell. Retry is the way out.
    if (!this.workspaceLoaded) return;
    const seq = this.editSeq;
    try {
      const saved = await api.saveChatWorkspace(this.workspace);
      // Only adopt the server's copy when nothing changed locally while the PUT
      // was in flight. A reply that arrives mid-request was never in the payload,
      // so overwriting with the response would silently discard it — and
      // touchWorkspace has already scheduled the save that will persist it.
      if (seq === this.editSeq) this.workspace = normalizeWorkspace(saved);
    }
    catch (error) { this.say(`Couldn't save chat: ${(error as Error).message}`, true); }
  }

  /**
   * Re-resolves a conversation by id, and must be used after every await.
   *
   * saveWorkspace() replaces this.workspace wholesale with the server's parsed
   * response, so every conversation becomes a new object. A reference captured
   * before an await is orphaned the moment the 450ms autosave fires, and
   * mutating it still "succeeds" while writing into something nothing renders.
   * That is silent: a reply generated in more than 450ms simply vanishes.
   */
  private liveConversation(id: string): ChatConversation | undefined {
    return this.workspace.conversations.find((conversation) => conversation.id === id);
  }

  /** Characters are replaced by the same autosave; see liveConversation. */
  private liveCharacter(id: string): ChatCharacter | undefined {
    return this.workspace.characters.find((character) => character.id === id);
  }

  private async scrollToEnd(smooth = true) {
    await this.updateComplete;
    requestAnimationFrame(() => {
      if (!this.log) return;
      this.log.scrollTo({ top: this.log.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    });
  }

  /**
   * (Re)arms the one-shot idle nudge. Any activity that calls this — the user
   * speaking, tapping, switching conversations — resets it, so the clock only runs
   * during genuine silence and each idle stretch earns at most one follow-up.
   *
   * Only Libby re-engages: an imported card is somebody else's character with no life
   * on this server. It works whether or not a model is loaded — a model gets a real
   * continuation turn, the offline voice gets a canned idle line — but never while
   * autopilot is already filling the silence in her own voice.
   */
  private armIdle = () => {
    window.clearTimeout(this.idleTimer);
    this.idleNudged = false;
    if (this.characterID !== "libby") return;
    this.idleTimer = window.setTimeout(() => void this.idleNudge(), IDLE_NUDGE_MS);
  };

  /**
   * Sends exactly one unprompted follow-up when the chat has gone quiet after *her*
   * last message. Fired once per idle stretch (armIdle resets the guard on any user
   * action), never looping the way autopilot does, and only while the tab is being
   * looked at — mirroring autoTick's visibility check so a backgrounded tab neither
   * burns tokens nor talks to itself.
   */
  private async idleNudge() {
    // Wait for a better moment rather than firing into a hidden tab, over a reply
    // still generating, or on top of autopilot — but don't consume the one nudge to
    // do it, so it still gets its turn once the moment is right.
    if (this.busy || document.visibilityState !== "visible" || this.autoRunning) {
      window.clearTimeout(this.idleTimer);
      this.idleTimer = window.setTimeout(() => void this.idleNudge(), IDLE_NUDGE_MS);
      return;
    }
    if (this.idleNudged) return;
    const conversation = this.activeConversation;
    if (!conversation || conversation.characterId !== "libby") return;
    // Only break a silence that followed *her* — going quiet after your own message is
    // you thinking, not a lull for her to fill.
    const last = conversation.messages[conversation.messages.length - 1];
    if (!last || last.role !== "assistant") return;
    // The server owns whether she may speak first at all: quiet hours, how often, and how
    // many times she will try before giving up on being answered. This client keeps the
    // timer because it is the only thing that knows whether anyone is looking at the screen,
    // but the decision is not its to make — and unlike the in-memory guard above, the
    // server's state survives the reload that used to buy another nudge every time.
    const decision = await this.mayLibbySpeak("idle");
    if (!decision?.allow) {
      // Not consumed: this idle stretch has not had its nudge, it was only refused for now.
      // Re-armed from the server's own arithmetic when it told us when to ask again.
      window.clearTimeout(this.idleTimer);
      const wait = decision?.retryAfterSec ? Math.min(decision.retryAfterSec * 1000, 30 * 60_000) : IDLE_NUDGE_MS;
      this.idleTimer = window.setTimeout(() => void this.idleNudge(), wait);
      return;
    }
    this.idleNudged = true;
    if (this.status?.enabled) {
      // A model is loaded: ask for one unprompted turn, exactly as autopilot does —
      // just once, not a run.
      const sent = await this.generateReply(conversation.id, "", { continuation:true });
      if (sent) void this.recordLibbySpoke("idle", "the conversation went quiet after her message");
      return;
    }
    // No model: her canned idle voice, the same pool autopilot's continuation replaces.
    const line = libbyReact("idle", { intensity: conversation.intensity });
    const live = this.liveConversation(conversation.id); if (!live) return;
    live.emotion = line.emotion;
    await this.typeAndPushBubbles(live.id, [line.message], 0);
    void this.recordLibbySpoke("idle", "the conversation went quiet (no model loaded)");
  }

  /**
   * Asks the server whether she may start something, and why not if she may not.
   *
   * Returns undefined when the question could not be asked at all — an old server with no
   * such endpoint, or a network blip. That is treated as "no" by the caller: an unprompted
   * message is never so important that it is worth sending against an unknown policy, and
   * the failure mode of guessing "yes" is her talking through the night.
   */
  private async mayLibbySpeak(trigger: string): Promise<LibbyAutoDecision | undefined> {
    try {
      return await api.libbyAutoCheck({ trigger });
    } catch {
      return undefined;
    }
  }

  /** Tells the server she did speak first, and why, for the back-off and the log. */
  private async recordLibbySpoke(trigger: string, detail: string) {
    try { await api.libbyAutoSent({ trigger, detail }); } catch { /* Best-effort: the message is already sent. */ }
  }

  private activateCharacter(id: string) {
    this.characterID = id;
    this.mobileNavOpen = false;
    const conversation = this.conversationsFor(id)[0];
    if (conversation) this.activateConversation(conversation.id); else this.newConversation();
  }

  private activateConversation(id: string) {
    const conversation = this.workspace.conversations.find((item) => item.id === id); if (!conversation) return;
    this.conversationID = id; this.characterID = conversation.characterId;
    this.mobileNavOpen = false;
    this.autoTurns = AUTO_MAX_TURNS;
    setIntensity(conversation.intensity); this.armIdle(); this.scheduleAuto(); void this.scrollToEnd(false);
  }

  private newConversation(save = true) {
    const character = this.activeCharacter; if (!character) return;
    const now = Date.now();
    let opener = character.firstMessage?.trim() ?? "";
    let emotion: LibbyEmotion = normalizeEmotion(MODES.find((mode) => mode.id === character.defaultMode)?.emotion);
    if (character.id === "libby") {
      // Open in the mood she last left off in, so a fresh chat picks up her disposition
      // rather than resetting to the mode default. normalizeEmotion drops anything unknown.
      if (this.openingBond?.mood) emotion = normalizeEmotion(this.openingBond.mood);
      if (!opener) { const line = libbyOpener(character.defaultMode, getIntensity()); opener = line.message; emotion = line.emotion; }
    }
    const conversation: ChatConversation = {
      id:newID(), characterId:character.id, title:"New conversation", mode:character.defaultMode || "sweet",
      emotion, intensity:character.id === "libby" ? getIntensity() : 1, progress:character.id === "libby" ? getIntensity() : 1,
      options:{ ...(this.workspace.defaults ?? defaultOptions()) },
      messages:opener ? [{ id:newID(), role:"assistant", content:opener, at:now }] : [], createdAt:now, updatedAt:now,
    };
    this.workspace.conversations.push(conversation); this.conversationID = conversation.id;
    this.mobileNavOpen = false;
    this.touchWorkspace(); if (save) this.say(`Started a new chat with ${character.name}.`); this.armIdle(); void this.scrollToEnd(false);
  }

  private clearConversation() {
    const conversation = this.activeConversation; if (!conversation || !confirm("Clear every message in this conversation?")) return;
    conversation.messages = []; conversation.title = "New conversation"; conversation.updatedAt = Date.now(); this.touchWorkspace(); this.say("Conversation cleared.");
  }

  private deleteConversation(id: string) {
    if (!confirm("Delete this conversation?")) return;
    this.workspace.conversations = this.workspace.conversations.filter((conversation) => conversation.id !== id);
    const next = this.conversationsFor()[0]; if (next) this.conversationID = next.id; else this.newConversation(false);
    this.touchWorkspace();
  }

  private updateConversation(patch: Partial<ChatConversation>) {
    const conversation = this.activeConversation; if (!conversation) return;
    Object.assign(conversation, patch, { updatedAt:Date.now() });
    if (patch.intensity != null) { conversation.progress = patch.intensity; setIntensity(patch.intensity); }
    this.touchWorkspace();
  }

  private updateOption(key: string, value: number) {
    this.updateOptionValue(key, value);
  }

  /** Sets one API option; undefined removes it, handing the choice back to the tuner. */
  private updateOptionValue(key: string, value: unknown) {
    const conversation = this.activeConversation; if (!conversation) return;
    const options = { ...(conversation.options ?? {}) };
    if (value === undefined) delete options[key]; else options[key] = value;
    conversation.options = options; conversation.updatedAt = Date.now(); this.touchWorkspace();
  }

  private onKey(event: KeyboardEvent) { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void this.send(); } }

  /**
   * Notices a link as it is typed and asks the server what is on the other end.
   *
   * Previewing before sending rather than after is the whole point: the user gets to
   * see what she is about to be told, and can drop the link if the answer is not what
   * they meant to share. It also keeps the fetch on the one endpoint that is allowed
   * to make one, so the message itself never causes network traffic.
   */
  private noticeLink() {
    const url = findLinkInText(this.draft);
    if (url === this.pendingLinkURL) return;
    this.pendingLinkURL = url;
    this.pendingLink = null;
    if (!url) return;
    void (async () => {
      try {
        const preview = await api.libbyLink(url);
        // The draft moves on while a fetch is in flight; a preview for a link that is
        // no longer in the box belongs to a message that is no longer being written.
        if (this.pendingLinkURL === url) this.pendingLink = preview;
      } catch {
        // A refusal (an unsupported scheme, credentials in the address) is not worth a
        // banner while someone is mid-sentence. Nothing is attached, and the message
        // sends as ordinary text.
        if (this.pendingLinkURL === url) this.pendingLinkURL = "";
      }
    })();
  }

  private dropLink() { this.pendingLink = null; this.pendingLinkURL = ""; }

  private async send() {
    const photo = this.pendingPhoto, items = this.pendingItems, conversation = this.activeConversation;
    // A photo or an attached item is a message on its own, so an empty box is only
    // empty without one.
    const content = this.draft.trim()
      || (photo ? `*shares a photo with you*` : "")
      || (items.length ? `*shares ${items.length === 1 ? items[0].title : `${items.length} things`} from the library*` : "");
    if (!content || !conversation) return;
    // Everything after an await must go through liveConversation(id): this object
    // is replaced by the autosave that fires 450ms from now.
    const conversationID = conversation.id;
    const reply = this.replyTarget;
    const userMessage: StoredChatMessage = {
      id:newID(), role:"user", content, at:Date.now(), imageId:photo?.imageId,
      attachments: items.length ? items : undefined,
      replyTo: reply ? { id:reply.id, role:reply.role, excerpt:excerptOf(reply.content) } : undefined,
    };
    conversation.messages.push(userMessage); conversation.updatedAt = Date.now();
    if (conversation.title === "New conversation") conversation.title = content.slice(0, 42);
    // Read before the box is cleared, and only when the preview is for the link that
    // is actually in the message being sent.
    const link = this.pendingLink && !this.pendingLink.failed && this.pendingLinkURL ? this.pendingLinkURL : "";
    this.draft = ""; this.pendingPhoto = null; this.pendingItems = []; this.replyTarget = null; this.dropLink(); this.notice = "";
    // Cleared on the element too: a send that lands in the same tick as the last
    // keystroke never gets a render in between, and Lit sees "" → "" as no change.
    const box = this.renderRoot.querySelector<HTMLTextAreaElement>("textarea");
    if (box) box.value = "";
    this.touchWorkspace(); this.armIdle(); void this.scrollToEnd();
    // Speaking re-arms the autopilot's budget: it exists to fill your silence, so a
    // run that stopped after its last turn should start again once you rejoin.
    this.autoTurns = AUTO_MAX_TURNS;
    // And it clears her back-off. Someone answering is the signal that she was not being
    // ignored, so the count resets rather than being carried — a penalty that outlived the
    // reply would make her cagey with the people who do talk to her. Only for Libby, and
    // only fire-and-forget: this must never delay the reply.
    if (conversation.characterId === "libby") {
      void api.libbyAutoAnswered().catch(() => { /* Best-effort; an old server has no endpoint. */ });
    }
    // Everything the burst carries rides the one turn that answers it: the last photo
    // and link win, the attached items accumulate.
    const carried = this.turnOptions;
    this.turnOptions = {
      photoTags: photo ? photo.tags : carried.photoTags,
      photoImageID: photo ? photo.imageId : carried.photoImageID,
      link: link || carried.link,
      sharedMediaIds: [...(carried.sharedMediaIds ?? []), ...items.map((item) => item.id)],
    };
    this.scheduleReply(conversationID, content.length);
  }

  // --- Her reading, and replying ------------------------------------------
  // You can keep typing while she reads and while she replies. A message lands as
  // "Sent"; after a moment she picks the phone up, it turns to "Read", the dots
  // start, and she answers the whole burst at once. Anything sent while she is
  // typing is answered by another turn straight after, so nothing is ever ignored.

  /** Starts, or restarts, her reading time. Each new text in a burst pushes it back a
      little so she reads them together rather than answering the first one alone. */
  private scheduleReply(conversationID: string, chars: number) {
    window.clearTimeout(this.readTimer);
    const live = this.liveConversation(conversationID);
    const hers = live ? [...live.messages].reverse().find((m) => m.role === "assistant") : undefined;
    const quiet = hers ? Date.now() - hers.at : 0;
    // While she is already typing there is no reading to simulate: the turn is owed,
    // and runs as soon as this one lands.
    if (this.busy) { this.pendingReply = true; return; }
    this.readTimer = window.setTimeout(() => void this.runTurn(conversationID), readingDelay(chars, quiet));
  }

  /** Marks the burst read, pauses a beat, and answers it. */
  private async runTurn(conversationID: string) {
    if (this.busy) { this.pendingReply = true; return; }
    const live = this.liveConversation(conversationID);
    if (!live) return;
    const now = Date.now();
    let seed = "";
    for (const message of live.messages) {
      if (message.role === "user" && !message.readAt) { message.readAt = now; seed = message.content; }
    }
    if (!seed) return;
    this.touchWorkspace();
    // Read, then a beat before the dots: the gap between reading and starting to type.
    await this.pause(250 + Math.random() * 500);
    const options = this.turnOptions;
    this.turnOptions = {};
    await this.generateReply(conversationID, seed, {
      photoTags: options.photoTags ?? [], photoImageID: options.photoImageID ?? "", link: options.link ?? "",
      sharedMediaIds: options.sharedMediaIds ?? [],
    });
    this.scheduleAuto();
    // Anything sent while she was typing is still unread: read it and answer it.
    const after = this.liveConversation(conversationID);
    const unread = after?.messages.some((m) => m.role === "user" && !m.readAt) ?? false;
    if (this.pendingReply || unread) {
      this.pendingReply = false;
      if (unread) this.scheduleReply(conversationID, 40);
    }
  }

  /** The receipt under your last message: sent, or read and when. Only the latest of
      yours carries one — a column of "Read" under every bubble is noise. */
  private receiptFor(message: StoredChatMessage, conversation: ChatConversation): string {
    if (message.role !== "user") return "";
    const mine = conversation.messages.filter((m) => m.role === "user");
    if (mine[mine.length - 1] !== message) return "";
    if (message.readAt) return `Read ${timeOf(message.readAt)}`;
    // A message written before receipts existed, or answered by an older client:
    // she replied to it, so she read it.
    const at = conversation.messages.indexOf(message);
    if (conversation.messages.slice(at + 1).some((m) => m.role === "assistant" && !m.thought)) return "Read";
    return "Sent";
  }

  // --- Reactions ------------------------------------------------------------

  /** Puts your emoji on one of her messages, or takes it off again if it is the same
      one. Yours replaces yours; hers stays. She is told on the next turn. */
  private react(message: StoredChatMessage, emoji: string) {
    const conversation = this.activeConversation;
    if (!conversation) return;
    const mine = (message.reactions ?? []).find((r) => r.by === "user");
    const others = (message.reactions ?? []).filter((r) => r.by !== "user");
    message.reactions = mine?.emoji === emoji ? others : [...others, { emoji, by: "user" }];
    if (!message.reactions.length) delete message.reactions;
    this.reactionPicker = null;
    conversation.updatedAt = Date.now();
    this.touchWorkspace();
  }

  /** Lands her reaction on the message it was for — by id, or your latest. */
  private applyReaction(conversation: ChatConversation, emoji: string, to?: string) {
    const target = (to && conversation.messages.find((m) => m.id === to))
      || [...conversation.messages].reverse().find((m) => m.role === "user");
    if (!target) return;
    const others = (target.reactions ?? []).filter((r) => r.by !== "assistant");
    target.reactions = [...others, { emoji, by: "assistant" }];
  }

  // --- Snaps ----------------------------------------------------------------

  /** Opens a snap full-screen. It can only be opened once: closing it marks it
      opened, and the tile draws as gone from then on. */
  private openSnap(message: StoredChatMessage) {
    if (message.opened) return;
    this.snapOpen = message;
  }

  private closeSnap() {
    const snap = this.snapOpen;
    this.snapOpen = null;
    if (!snap) return;
    snap.opened = true;
    const conversation = this.activeConversation;
    if (conversation) { conversation.updatedAt = Date.now(); this.touchWorkspace(); }
  }

  // --- Swipe to reply --------------------------------------------------------
  // Touch and pen only: with a mouse, dragging selects text, and the hover buttons
  // are right there. The bubble follows the finger a little way, and letting go past
  // the threshold quotes the message in the composer.

  private swipeStart(message: StoredChatMessage, event: PointerEvent) {
    if (event.pointerType === "mouse" || message.thought) return;
    const el = (event.currentTarget as HTMLElement).querySelector<HTMLElement>(".bubble-wrap");
    if (!el) return;
    this.swipe = { id: message.id, startX: event.clientX, startY: event.clientY, dx: 0, live: false, el };
  }

  private swipeMove(event: PointerEvent) {
    const swipe = this.swipe;
    if (!swipe) return;
    const dx = event.clientX - swipe.startX, dy = event.clientY - swipe.startY;
    if (!swipe.live) {
      // Decide the gesture once: mostly vertical is a scroll, and the browser has it.
      if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) { this.swipe = null; return; }
      if (dx < 10) return;
      swipe.live = true;
      swipe.el.classList.add("swiping");
      try { (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId); } catch { /* Not every target captures. */ }
    }
    swipe.dx = Math.max(0, Math.min(SWIPE_MAX_PX, dx));
    swipe.el.style.transform = `translateX(${swipe.dx}px)`;
    swipe.el.classList.toggle("will-reply", swipe.dx >= SWIPE_REPLY_PX);
    event.preventDefault();
  }

  private swipeEnd(message: StoredChatMessage) {
    const swipe = this.swipe;
    this.swipe = null;
    if (!swipe) return;
    swipe.el.classList.remove("swiping", "will-reply");
    swipe.el.style.transform = "";
    if (swipe.live && swipe.dx >= SWIPE_REPLY_PX) this.replyTo(message);
  }

  // --- Replying to a particular message ------------------------------------

  /** Marks what the next message answers. The composer shows the quote until it is
      sent or dismissed. */
  private replyTo(message: StoredChatMessage) {
    if (message.thought) return;
    this.replyTarget = message;
    this.focusComposer();
  }

  /** Scrolls to and flashes the message a quote points at, if it is still here. */
  private jumpTo(ref?: ChatReplyRef) {
    if (!ref?.id) return;
    const row = this.renderRoot.querySelector<HTMLElement>(`[data-message-id="${ref.id}"]`);
    if (!row) { this.say("That message isn't in this conversation any more."); return; }
    row.scrollIntoView({ block:"center", behavior:"smooth" });
    row.classList.remove("flash"); void row.offsetWidth; row.classList.add("flash");
  }

  // --- Attaching library items ---------------------------------------------
  // A video, a game, a comic: things that cannot be copied into her gallery as a
  // picture and do not need to be. They travel by reference, the way her own
  // attachments do, and the server tells her what they are.

  private openPicker() {
    this.picker = { query:"", items:[], loading:true };
    void this.searchLibrary("");
    window.setTimeout(() => this.renderRoot.querySelector<HTMLInputElement>(".picker-head input")?.focus(), 30);
  }

  private closePicker() { this.picker = null; this.focusComposer(); }

  /** Lists the library, newest first, filtered by title on the client. The list
      endpoint is the same one the grid uses; a few hundred titles is a cheap search. */
  private async searchLibrary(query: string) {
    if (!this.picker) return;
    const seq = ++this.pickerSeq;
    this.picker = { ...this.picker, query, loading:true };
    try {
      const { items } = await api.listMedia("", 400, 0);
      if (seq !== this.pickerSeq || !this.picker) return;
      const words = query.toLowerCase().split(/\s+/).filter(Boolean);
      const hits = items.filter((item) => {
        if (!words.length) return true;
        const hay = `${item.title} ${item.kind} ${(item.tags ?? []).map((tag) => tag.name).join(" ")}`.toLowerCase();
        return words.every((word) => hay.includes(word));
      });
      this.picker = { query, items:hits.slice(0, 120), loading:false };
    } catch (error) {
      if (seq !== this.pickerSeq || !this.picker) return;
      this.picker = { ...this.picker, loading:false };
      this.say((error as Error).message, true);
    }
  }

  private toggleItem(item: Media) {
    const picked = this.pendingItems.some((it) => it.id === item.id);
    if (picked) this.pendingItems = this.pendingItems.filter((it) => it.id !== item.id);
    else if (this.pendingItems.length < 6) {
      this.pendingItems = [...this.pendingItems, { id:item.id, title:item.title || `Item ${item.id}`, kind:item.kind, hasThumb:item.hasThumb === true }];
    } else this.say("Six at a time is plenty.");
  }

  private removeItem(id: number) { this.pendingItems = this.pendingItems.filter((it) => it.id !== id); }

  /**
   * Uploads a picture for the composer and holds it until the message is sent.
   *
   * It is filed under the active character, so a shared photo also joins the pool
   * they can send back to you later — sharing and receiving draw on one gallery
   * rather than two. Tagging happens server-side during the upload; those tags are
   * what let a text-only model respond to what is in the picture.
   */
  private async attachPhoto(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0], character = this.activeCharacter;
    if (!file || !character) return;
    try {
      this.say("Scanning photo locally…");
      const image = await api.uploadChatImage({
        characterId:character.id, name:file.name, imageData:await this.readDataURL(file), tags:[],
      });
      this.workspace.images.push(image);
      this.pendingPhoto = { imageId:image.id, tags:image.tags ?? [], name:image.name };
      this.touchWorkspace();
      this.say(image.tags?.length ? `Photo ready: ${image.tags.slice(0, 6).join(", ")}.` : "Photo ready to send.");
      this.focusComposer();
    } catch (error) { this.say((error as Error).message, true); }
    finally { input.value = ""; }
  }

  /** Opens the file picker from somewhere other than the composer button. */
  private pickPhoto() {
    (this.renderRoot.querySelector(".attach-btn input") as HTMLInputElement | null)?.click();
  }

  /** Drops the attachment and the copy that was uploaded for it. */
  private async discardPhoto() {
    const photo = this.pendingPhoto;
    if (!photo) return;
    this.pendingPhoto = null;
    this.workspace.images = this.workspace.images.filter((image) => image.id !== photo.imageId);
    this.touchWorkspace();
    this.focusComposer();
    try { await api.deleteChatImage(photo.imageId); } catch { /* The gallery entry is already gone locally. */ }
  }

  private pause(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Holds a finished reply back for as long as it would plausibly have taken to
   * write, so the character reads as someone typing rather than a service responding.
   *
   * Three things are being imitated. Reading what you said before starting. Typing
   * time that scales with what she actually wrote. And second thoughts: sometimes the
   * dots stop partway, sit quiet for a beat, and start again — the shape a message
   * that got half-typed, deleted, and rewritten leaves in a chat window.
   *
   * The generation time already spent counts against all of it, so a slow model does
   * not pay twice; on a slow backend this adds nothing at all. The total is capped
   * because charm wears off fast when you are waiting for it.
   */
  private async typeLikeAPerson(text: string, spentMs: number) {
    const jitter = (base: number) => base * (0.7 + Math.random() * 0.6);
    // ~22 characters a second, which reads as a quick but human phone typist.
    const budget = Math.min(7000, jitter(420 + text.length * 45));
    let remaining = Math.max(0, budget - spentMs);
    if (remaining < 120) return;

    this.typingPhase = "thinking";
    const reading = Math.min(remaining, jitter(500));
    await this.pause(reading);
    remaining -= reading;

    // Longer messages are likelier to get rewritten, and never on a one-liner: an
    // eight-word reply that visibly took three attempts is a tell, not a texture.
    if (text.length > 90 && remaining > 900 && Math.random() < 0.35) {
      const firstAttempt = remaining * (0.3 + Math.random() * 0.3);
      this.typingPhase = "typing";
      await this.pause(firstAttempt);
      this.typingPhase = "thinking";
      const reconsider = jitter(650);
      await this.pause(reconsider);
      remaining -= firstAttempt + reconsider;
    }
    if (remaining > 0) {
      this.typingPhase = "typing";
      await this.pause(remaining);
    }
    this.typingPhase = "idle";
  }

  /**
   * Lands a reply as the 2–3 back-to-back texts a person would send instead of one
   * block, each bubble taking its own turn through the typing/thinking phases so the
   * indicator stops and restarts between them like someone pausing between messages.
   *
   * Only the first bubble is credited the time already spent generating; the rest are
   * fresh pauses, since a person does not pre-write their follow-ups. Any per-message
   * extras — a sent picture, link chips, action cards — ride the final bubble, so they
   * appear once, after she has finished talking. Each push goes through liveConversation
   * because the debounced autosave keeps swapping the object out from under us.
   */
  private async typeAndPushBubbles(
    conversationID: string, chunks: string[], spentMs: number, extra: Partial<StoredChatMessage> = {}, first: Partial<StoredChatMessage> = {},
  ): Promise<boolean> {
    for (let i = 0; i < chunks.length; i++) {
      await this.typeLikeAPerson(chunks[i], i === 0 ? spentMs : 0);
      const live = this.liveConversation(conversationID);
      if (!live) return false;
      const last = i === chunks.length - 1;
      live.messages.push({ id:newID(), role:"assistant", content:chunks[i], at:Date.now(), ...(i === 0 ? first : {}), ...(last ? extra : {}) });
      live.updatedAt = Date.now(); this.touchWorkspace(); void this.scrollToEnd();
      // Read aloud as it lands, in order; the queue in speech.ts keeps bubbles from
      // talking over each other while the next one is still being typed.
      if (this.speakOn && conversationID === this.conversationID) void speak(chunks[i]);
    }
    return true;
  }

  private toggleSpeak() {
    this.speakOn = !this.speakOn;
    saveSpeakPref(this.speakOn);
    this.say(this.speakOn ? "She'll read her replies aloud on this device." : "Voice off.");
  }

  /**
   * Appends what she thought or muttered, as entries of their own.
   *
   * No typing indicator and no pause: thinking is not typing, and putting one in front
   * of a thought would be the interface claiming she was composing it for you. They
   * land immediately, before whatever she goes on to say.
   *
   * Returns false only when the conversation went away mid-turn, matching
   * typeAndPushBubbles so the caller can abandon the turn the same way.
   */
  private pushThoughts(conversationID: string, thoughts?: LibbyThought[]): boolean {
    if (!thoughts?.length) return true;
    const live = this.liveConversation(conversationID);
    if (!live) return false;
    for (const { kind, text } of thoughts) {
      if (!text.trim()) continue;
      live.messages.push({ id:newID(), role:"assistant", content:text, at:Date.now(), thought:kind });
    }
    live.updatedAt = Date.now(); this.touchWorkspace(); void this.scrollToEnd();
    return true;
  }

  /**
   * Produces one assistant turn from the conversation's own history and appends it.
   *
   * Sending, re-responding, and the autopilot all end here; they differ only in what
   * they do to the log first. `seed` is the line being reacted to, which is what
   * Libby's offline voice writes from. `continuation` asks for an unprompted turn —
   * the character speaks again with no new user message to answer.
   */
  private async generateReply(conversationID: string, seed: string, options: {
    continuation?: boolean; photoTags?: string[]; photoImageID?: string; link?: string; sharedMediaIds?: number[];
    /** A one-off steer for this turn — "shorter", "don't change the subject" — sent
        as a bracketed note on the history and never stored. See regenerate. */
    nudge?: string;
  } = {}): Promise<boolean> {
    const { continuation = false, photoTags = [], photoImageID = "", link = "", sharedMediaIds = [], nudge = "" } = options;
    const conversation = this.liveConversation(conversationID);
    const character = conversation && this.liveCharacter(conversation.characterId);
    if (!conversation || !character || this.busy) return false;
    this.busy = true;
    if (!this.status?.enabled && (this.status?.configured || this.status?.modelBackend)) {
      try { this.status = await api.chatStatus(); } catch { /* The chat request or local fallback below provides the user-facing result. */ }
    }
    if (!this.status?.enabled) {
      if (character.id !== "libby") { this.busy = false; this.say(this.status?.message || "Load a model in text-generation-webui, then refresh backend status.", true); return false; }
      const progression = applyProgression(conversation.progress ?? conversation.intensity, continuation ? 0 : libbyHeatDelta(seed, conversation.mode));
      // Read before any await: the autosave replaces this object, and everything past
      // that point has to go through liveConversation.
      const mode = conversation.mode, mood = normalizeEmotion(conversation.emotion);
      let line: LibbyLine;
      if (continuation) {
        line = libbyReact("idle", { intensity: progression.intensity });
      } else {
        // Library and server questions get a real answer even with no model loaded —
        // she is the librarian of this collection, and "what did I add lately?" has a
        // factual answer that does not need one. Anything else falls through.
        const facts = await this.libraryFacts();
        line = (facts && libbyLibraryAnswer(seed, facts, { intensity: progression.intensity }))
          ?? libbyReply(seed, mode, mood, progression.intensity, false);
      }
      // Mood and meter settle before the bubbles land, so the portrait matches what
      // she is about to say. Offline lines are short and usually stay one bubble.
      const live = this.liveConversation(conversationID);
      if (!live) { this.busy = false; this.typingPhase = "idle"; return false; }
      live.emotion = line.emotion; live.progress = progression.progress; live.intensity = setIntensity(progression.intensity);
      live.updatedAt = Date.now(); this.touchWorkspace();
      const ok = await this.typeAndPushBubbles(conversationID, splitIntoBubbles(line.message), 0);
      this.busy = false; this.typingPhase = "idle"; return ok;
    }
    try {
      // Thoughts are left out: they were never said, so replaying them as assistant
      // lines both hands the model words she did not speak and teaches it that the
      // format belongs inline. Her emotional continuity is carried by the bond and
      // her memory, which is the right place for it.
      // Each message travels with the ids of what it carried — the photo, the library
      // items — so the server can say what they were on every turn, not just the one
      // they were sent on. Ids only; the server owns the descriptions.
      const history: ChatMessage[] = conversation.messages
        .filter((message) => !message.thought)
        .map(({ id, role, content:text, replyTo, imageId, attachments, reactions }) => ({
          id, role, content:text, replyTo,
          imageId: imageId || undefined,
          mediaIds: attachments?.length ? attachments.map((item) => item.id) : undefined,
          reactions: reactions?.length ? reactions : undefined,
        }));
      // A nudge, not a message: it steers this one request and is never stored, so
      // the log stays a record of what was actually said.
      if (continuation) history.push({ role:"user", content:"(Continue the scene on your own. Speak or act again without waiting for a reply, and do not answer for me.)" });
      else if (nudge) history.push({ role:"user", content:`(Try that reply again. ${nudge} Do not mention this note.)` });
      const startedAt = Date.now();
      this.typingPhase = "typing";
      const result = await api.chat({
        mode: conversation.mode, messages: history, emotion: conversation.emotion,
        intensity: conversation.intensity, options: conversation.options, characterId: character.id,
        // So her recall of the *other* conversations leaves this one out of it.
        conversationId: conversation.id,
        photoTags, photoImageId: photoImageID, recentImageIds: recentlySent(conversation.messages),
        recentMediaIds: recentlyAttached(conversation.messages),
        // How long she has been wearing one expression. The server has no memory
        // between turns, so a mood stuck for a dozen replies is indistinguishable
        // from a fresh one unless the log says otherwise.
        recentMoods: recentMoods(conversation.messages),
        recentHeat: recentHeat(conversation.messages),
        // What she is already doing, and where. The server keeps nothing between
        // turns, so a state set three replies ago only survives because this says so.
        activity: conversation.activity || undefined,
        background: conversation.background || undefined,
        // Library items attached to this message, by id.
        sharedMediaIds: sharedMediaIds.length ? sharedMediaIds : undefined,
        // That they have her on screen rather than in a transcript. Opening a call is
        // a thing that happens on this device and the server never hears about it.
        call: this.callOpen || undefined,
        outfit: character.id === "libby" ? loadLibbyOutfit() : "",
        // The address only. What she is told about the page is the server's own
        // summary of what it already fetched for the preview — a turn never causes a
        // fetch, and the client cannot describe a page on the server's behalf.
        link: link || undefined,
        // The server cannot see that this turn is her speaking first — a continuation
        // reads as an ordinary message — and an unprompted line wants very different
        // sampling from a reply. Everything else it classifies itself.
        task: continuation ? "autonomous" : undefined,
        // Only while the user has capture switched on. See exportConversation.
        debug: this.captureTurns || undefined,
      });
      // The turn's working, kept against the conversation rather than the message: it
      // describes how a reply was *built*, which is a fact about the request, and a
      // reply that was regenerated should not carry the receipts of the one before it.
      if (result.debug) {
        const log = this.turnLog.get(conversationID) ?? [];
        log.push({ at: startedAt, request: { photoTags, photoImageId: photoImageID, task: continuation ? "autonomous" : "" }, debug: result.debug });
        // Bounded: this is several kilobytes a turn and an evening is hundreds.
        this.turnLog.set(conversationID, log.slice(-MAX_CAPTURED_TURNS));
      }
      // What the server chose, kept for the advanced panel, and the diagnostic when
      // something had to be cut to fit the model's window. Shown rather than swallowed:
      // silent truncation of her memory or her card is the failure this reports.
      this.lastSampling = result.sampling;
      this.lastPhoto = result.photo;
      // Context fitting is a diagnostic, not a failed reply. Keep it visible without the
      // red error treatment that made routine summarisation look like a crash.
      if (result.context?.note) this.say(result.context.note);
      // Deleting the conversation mid-generation is the one case with nowhere to
      // put the reply; dropping it is correct, and the user asked for that.
      const live = this.liveConversation(conversationID);
      if (!live) return false;
      live.emotion = normalizeEmotion(result.emotion ?? live.emotion);
      // An older server sends no activity field at all, which has to read as "leave it
      // alone" rather than "she stopped" — the empty string is a real answer here, and
      // means she is doing nothing in particular.
      if (result.activity !== undefined) live.activity = result.activity;
      if (result.background !== undefined) live.background = result.background;
      const requested = normalizeIntensity(result.intensity ?? live.intensity);
      if (result.declared) {
        // The character named this mood, so it lands where it asked. Running it
        // through the drift multiplier is what used to halve every deliberate swing:
        // a jump from 1 to 5 arrived as a 3, and the scene never caught up.
        live.progress = requested; live.intensity = setIntensity(requested);
      } else {
        const progression = applyProgression(live.progress ?? live.intensity, requested - live.intensity);
        live.progress = progression.progress; live.intensity = setIntensity(progression.intensity);
      }
      live.updatedAt = Date.now(); this.touchWorkspace();
      // She rang, or hung up. The ring is a popup and only answering opens the call;
      // the hang-up ends one that is open, with a line saying so.
      if (result.callRequest && !this.callOpen) this.ring();
      if (result.callEnd && this.callOpen) { this.endCall(); this.say(`${character.name} ended the call.`); }
      // Anything she thought rather than said lands first and on its own, because that
      // is the order it happened in: she looked, reacted, and then decided what to say.
      if (!this.pushThoughts(conversationID, result.thoughts)) return false;
      // Her emoji on your message goes on before she says anything — a reaction is the
      // quick thing, the words come after.
      if (result.reaction?.emoji) { this.applyReaction(live, result.reaction.emoji, result.reaction.to); this.touchWorkspace(); }
      const picture = !!(result.imageId || result.attachments?.length);
      // An empty message with a thought attached is her deciding to say nothing at all.
      // That is a turn, not a failure — the thought above is what she did with it. A
      // reaction alone is the same. A picture alone still lands, as a bubble of its own.
      if (!result.message.trim() && !picture) return (result.thoughts?.length ?? 0) > 0 || !!result.reaction;
      // A long reply lands as the few short texts a person would send back to back,
      // each taking its own turn through the typing indicator. The picture, link chips,
      // and action cards ride the last bubble. Whatever the model already spent counts
      // as time she was "writing" on that first bubble, so a slow model never pays twice.
      // A picture with no words still needs a line in the log — the store refuses an
      // empty message — so it gets the same stage direction your own photo share does.
      const said = result.message.trim() || (result.snap ? "*sends a snap*" : "*sends a picture*");
      return await this.typeAndPushBubbles(conversationID, splitIntoBubbles(said), Date.now() - startedAt, {
        // On the last bubble, so one reply contributes one mood to the run the next
        // turn reports. See recentMoods.
        mood: live.emotion,
        heat: live.intensity,
        imageId: result.imageId || undefined,
        snap: result.snap && picture ? true : undefined,
        links: result.links?.length ? result.links : undefined,
        attachments: result.attachments?.length ? result.attachments : undefined,
        actions: result.actions?.length ? result.actions : undefined,
      }, {
        // The quote rides the first bubble: it is what the reply *starts* by answering.
        replyTo: result.replyTo ?? undefined,
      });
    } catch (error) {
      if (this.status?.configured || this.status?.modelBackend) {
        try { this.status = await api.chatStatus(); } catch { /* Keep the generation error when the readiness check also fails. */ }
      }
      this.typingPhase = "idle";
      this.say(!this.status?.enabled && this.status?.message ? this.status.message : (error as Error).message, true);
      return false;
    }
    finally { this.busy = false; this.typingPhase = "idle"; }
  }

  /**
   * Re-rolls the character's last turn: drops the trailing assistant messages and
   * asks again from the same history, so the reply you keep is the one you liked.
   *
   * The discarded text is not recoverable, which matches how every other chat client
   * behaves — and unlike deleting a message, the exchange it belonged to survives.
   */
  private async regenerate(nudge = "") {
    const conversation = this.activeConversation;
    if (!conversation || this.busy) return;
    const messages = conversation.messages;
    let cut = messages.length;
    while (cut > 0 && messages[cut - 1].role === "assistant") cut--;
    if (cut === messages.length) { this.say("There is no reply to redo yet.", true); return; }
    const conversationID = conversation.id;
    // The last thing the user said is what the offline voice answers; an opener that
    // was never prompted has no seed and simply gets rewritten.
    const seed = cut > 0 ? messages[cut - 1].content : "";
    conversation.messages = messages.slice(0, cut);
    conversation.updatedAt = Date.now();
    this.touchWorkspace(); void this.scrollToEnd();
    // The items they attached to the message being answered go again, or a retry
    // would answer a message she can no longer see the attachments of.
    const answered = cut > 0 ? messages[cut - 1] : undefined;
    await this.generateReply(conversationID, seed, {
      continuation: cut === 0, nudge,
      sharedMediaIds: answered?.role === "user" ? (answered.attachments ?? []).map((item) => item.id) : [],
    });
  }

  /** Re-rolls with a word of direction: "shorter", "answer the question", "less
      pouty". The note steers this one attempt and is never stored. */
  private async regenerateWithNote() {
    const note = prompt("Ask her to try again — what should be different?", "")?.trim();
    if (note === undefined) return;
    await this.regenerate(note ? (note.endsWith(".") ? note : note + ".") : "");
  }

  /**
   * Retries from one of your messages: everything after it is dropped and she
   * answers it again. The message itself stays as written; edit it first if that
   * is what you wanted.
   */
  private async retryFrom(message: StoredChatMessage) {
    const conversation = this.activeConversation;
    if (!conversation || this.busy || message.role !== "user") return;
    const at = conversation.messages.indexOf(message);
    if (at < 0) return;
    const conversationID = conversation.id;
    conversation.messages = conversation.messages.slice(0, at + 1);
    conversation.updatedAt = Date.now();
    this.touchWorkspace(); void this.scrollToEnd();
    await this.generateReply(conversationID, message.content, {
      sharedMediaIds: (message.attachments ?? []).map((item) => item.id),
    });
  }

  // --- Autopilot ------------------------------------------------------------
  // With a model connected the character can keep the conversation going on its
  // own. It is budgeted (AUTO_MAX_TURNS) and pausable, and any turn you take
  // refills the budget: it fills silence rather than talking over you.

  private toggleAutopilot() {
    this.autopilot = !this.autopilot;
    this.autoPaused = false;
    this.autoTurns = AUTO_MAX_TURNS;
    try { localStorage.setItem(AUTO_KEY, this.autopilot ? "1" : "0"); } catch { /* private mode */ }
    if (this.autopilot && !this.status?.enabled) this.say("Autopilot needs a connected model — it stays off until one is loaded.", true);
    this.scheduleAuto();
  }

  private pauseAutopilot(paused: boolean) {
    this.autoPaused = paused;
    if (paused) window.clearTimeout(this.autoTimer); else { this.autoTurns = Math.max(this.autoTurns, 1); this.scheduleAuto(); }
  }

  /** Hands the run a fresh budget after it stopped and waited for you. */
  private refillAutopilot() {
    this.autoTurns = AUTO_MAX_TURNS;
    this.pauseAutopilot(false);
  }

  private get autoRunning(): boolean {
    return this.autopilot && !this.autoPaused && !!this.status?.enabled && this.autoTurns > 0;
  }

  private scheduleAuto() {
    window.clearTimeout(this.autoTimer);
    if (!this.autoRunning) return;
    this.autoTimer = window.setTimeout(() => void this.autoTick(), AUTO_DELAY_MS);
  }

  private async autoTick() {
    // A backgrounded tab shouldn't quietly burn tokens; wait for it to be looked at.
    if (this.busy || document.visibilityState !== "visible") { this.scheduleAuto(); return; }
    const conversation = this.activeConversation;
    if (!conversation || !this.autoRunning) return;
    this.autoTurns--;
    const ok = await this.generateReply(conversation.id, "", { continuation:true });
    if (ok) this.scheduleAuto();
    else this.autoPaused = true;
  }

  private editMessage(message: StoredChatMessage) {
    const changed = prompt("Edit message", message.content)?.trim(); if (!changed || changed === message.content) return;
    message.content = changed; const conversation = this.activeConversation; if (conversation) conversation.updatedAt = Date.now(); this.touchWorkspace();
  }

  private deleteMessage(id: string) {
    const conversation = this.activeConversation; if (!conversation) return;
    conversation.messages = conversation.messages.filter((message) => message.id !== id); conversation.updatedAt = Date.now(); this.touchWorkspace();
  }

  private updateCharacter(field: keyof ChatCharacter, value: string | number) {
    const character = this.activeCharacter; if (!character) return;
    (character as unknown as Record<string, string | number>)[field] = value; this.touchWorkspace();
  }

  private addCharacter() {
    const character: ChatCharacter = { id:newID(), name:"New friend", promptWeight:1, defaultMode:"sweet", firstMessage:"Hey! It's nice to meet you." };
    this.workspace.characters.push(character); this.characterID = character.id; this.touchWorkspace(); this.newConversation(false); this.settingsOpen = true; this.editorTab = "character";
  }

  private deleteCharacter() {
    const character = this.activeCharacter; if (!character || character.builtIn || !confirm(`Remove ${character.name} and all of their conversations?`)) return;
    this.workspace.characters = this.workspace.characters.filter((item) => item.id !== character.id);
    this.workspace.conversations = this.workspace.conversations.filter((item) => item.characterId !== character.id);
    this.characterID = this.workspace.characters[0]?.id ?? "libby"; const next = this.conversationsFor()[0]; if (next) this.conversationID = next.id; else this.newConversation(false); this.touchWorkspace();
  }

  private async importCard(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (files.length) await this.ingestCards(files);
    input.value = "";
  }

  /**
   * Imports one or more character cards, and says what it found.
   *
   * Three things this does that the old one-file handler did not. It reports rather
   * than guesses: a PNG with no card chunk used to become a character named after the
   * file with every field blank, which looks like a successful import and is not, so
   * it now says the picture had no card in it and offers it as a portrait instead.
   * It tells you what came across — a card's alternate greetings and lorebook are the
   * two things this app cannot fully hold, and silently dropping them is how you find
   * out six conversations later. And a failure names the file, because importing a
   * folder of forty cards and being told "couldn't import card" is not a diagnosis.
   */
  private async ingestCards(files: File[]) {
    const added: string[] = [];
    const notes: string[] = [];
    const failed: string[] = [];
    for (const file of files) {
      try {
        const parsed = await readCardFile(file);
        const isPNG = file.name.toLowerCase().endsWith(".png") || file.type === "image/png";
        if (!parsed) {
          if (!isPNG && !file.type.startsWith("image/")) { failed.push(`${file.name}: no character card inside`); continue; }
          // A picture with no card in it is still a face. Offered as one rather than
          // turned into an empty character named after the file.
          failed.push(`${file.name}: no card data in that image — add a friend first, then set their picture`);
          continue;
        }
        if (this.workspace.characters.length >= 40) { failed.push(`${file.name}: workspace is full`); break; }
        const character: ChatCharacter = { ...parsed.character, id: newID() };
        this.workspace.characters.push(character);
        this.characterID = character.id;
        added.push(character.name);
        if (parsed.leftovers.alternateGreetings > 0) {
          notes.push(`${character.name}: kept ${parsed.leftovers.alternateGreetings} alternate greeting${parsed.leftovers.alternateGreetings === 1 ? "" : "s"}`);
        }
        if (parsed.leftovers.characterBook) {
          notes.push(`${character.name}: the card's lorebook was dropped — this app has nowhere to put one`);
        }
        // The card's own art becomes their portrait. Saved first so the upload has a
        // character to belong to; saveWorkspace replaces the workspace wholesale, so
        // the avatar id goes onto the stored copy rather than the local one.
        if (isPNG) {
          await this.saveWorkspace();
          try {
            const image = await api.uploadChatImage({
              characterId: character.id, name: `${character.name} avatar`,
              imageData: await this.readDataURL(file), tags: ["portrait"],
            });
            this.workspace.images.push(image);
            const stored = this.liveCharacter(character.id);
            if (stored) stored.avatarImageId = image.id;
          } catch (error) {
            notes.push(`${character.name}: card imported, but the portrait didn't upload (${(error as Error).message})`);
          }
        }
      } catch (error) {
        failed.push(`${file.name}: ${(error as Error).message}`);
      }
    }
    if (added.length) { this.touchWorkspace(); this.newConversation(false); }
    const summary = [
      added.length ? `Imported ${added.join(", ")}.` : "",
      ...notes,
      ...failed.map((line) => `Couldn't import ${line}.`),
    ].filter(Boolean).join(" ");
    this.cardNote = summary ? { text: summary, bad: !added.length } : null;
    if (summary) this.say(summary, !added.length);
  }

  private readDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); });
  }

  private async uploadImage(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0], character = this.activeCharacter; if (!file || !character) return;
    try {
      this.say("Scanning image locally…");
      const tags = this.imageTags.split(",").map((tag) => tag.trim()).filter(Boolean);
      const image = await api.uploadChatImage({ characterId:character.id, name:file.name, imageData:await this.readDataURL(file), tags, subject:this.imageSubject || undefined });
      this.workspace.images.push(image);
      const stored = this.liveCharacter(character.id);
      if (stored && !stored.avatarImageId) stored.avatarImageId = image.id;
      this.imageTags = ""; this.touchWorkspace(); this.say(`Image scanned: ${image.tags.join(", ") || "no content tags found"}.`);
    } catch (error) { this.say((error as Error).message, true); }
    finally { (event.target as HTMLInputElement).value = ""; }
  }

  /**
   * Uploads the user's own avatar under the reserved profile owner, so it never
   * lands in a character's gallery or gets picked as a reply attachment. The old
   * picture is deleted afterwards: it has no other referent once replaced.
   */
  private async uploadProfilePicture(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return;
    const previous = this.workspace.profile.avatarImageId;
    try {
      this.say("Uploading profile picture…");
      const image = await api.uploadChatImage({ characterId:PROFILE_IMAGE_OWNER, name:file.name, imageData:await this.readDataURL(file), tags:[] });
      this.workspace.images.push(image);
      // editProfile already schedules a save; this one is immediate so the picture is
      // persisted before the old blob is discarded below.
      this.editProfile({ avatarImageId: image.id });
      await this.saveWorkspace();
      if (previous) await this.discardProfileImage(previous);
      this.say("Profile picture updated.");
    } catch (error) { this.say((error as Error).message, true); }
    finally { (event.target as HTMLInputElement).value = ""; }
  }

  private async removeProfilePicture() {
    const current = this.workspace.profile.avatarImageId; if (!current) return;
    this.editProfile({ avatarImageId: "" });
    await this.saveWorkspace();
    await this.discardProfileImage(current);
    this.say("Profile picture removed.");
  }

  /**
   * Sets the character's face from the character card, not from their gallery.
   *
   * The picture is filed under a reserved owner (`avatar:<id>`), so it is not one of
   * the character's images: it never appears in the Images tab and is never picked as
   * an attachment for a reply. That is the distinction the two upload paths exist to
   * keep — a face is not a photo the character might send you.
   */
  private async uploadCharacterPicture(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0], character = this.activeCharacter;
    if (!file || !character) return;
    const characterID = character.id;
    const previous = character.avatarImageId;
    try {
      this.say("Uploading picture…");
      const image = await api.uploadChatImage({ characterId:avatarOwner(characterID), name:`${character.name} avatar`, imageData:await this.readDataURL(file), tags:[] });
      this.workspace.images.push(image);
      const stored = this.liveCharacter(characterID);
      if (stored) stored.avatarImageId = image.id;
      this.touchWorkspace();
      await this.saveWorkspace();
      // Only a picture that was itself an avatar upload is ours to delete: an avatar
      // chosen from the gallery is still one of the character's images.
      if (previous && this.isAvatarUpload(previous, characterID)) await this.discardProfileImage(previous);
      this.say("Picture updated.");
    } catch (error) { this.say((error as Error).message, true); }
    finally { (event.target as HTMLInputElement).value = ""; }
  }

  private async removeCharacterPicture() {
    const character = this.activeCharacter; const current = character?.avatarImageId;
    if (!character || !current) return;
    const characterID = character.id;
    character.avatarImageId = "";
    this.touchWorkspace();
    await this.saveWorkspace();
    if (this.isAvatarUpload(current, characterID)) await this.discardProfileImage(current);
    this.say("Picture removed.");
  }

  private isAvatarUpload(imageID: string, characterID: string): boolean {
    return this.workspace.images.find((image) => image.id === imageID)?.characterId === avatarOwner(characterID);
  }

  /** A stale picture failing to delete is not worth surfacing: the reference is already gone. */
  private async discardProfileImage(id: string) {
    try {
      await api.deleteChatImage(id);
      this.workspace.images = this.workspace.images.filter((image) => image.id !== id);
      this.touchWorkspace();
    } catch { /* The record is unreferenced either way. */ }
  }

  private async deleteImage(image: ChatImage) {
    if (!confirm(`Delete ${image.name}?`)) return;
    try { await api.deleteChatImage(image.id); this.workspace.images = this.workspace.images.filter((item) => item.id !== image.id); const c = this.activeCharacter; if (c?.avatarImageId === image.id) c.avatarImageId = ""; this.touchWorkspace(); }
    catch (error) { this.say((error as Error).message, true); }
  }

  private avatar(character: ChatCharacter, className: string) {
    // A pfp is a face. Libby's is the picture set on her character card, or the
    // bundled face crop of her; the live sprite is a figure, and it belongs on the
    // stage, the banner and the call, where there is room to see all of it. See
    // DEFAULT_LIBBY_PFP for why a crop of the current sprite is not an option.
    if (character.avatarImageId) return html`<span class=${className}><img src=${api.chatImageURL(character.avatarImageId)} alt="" /></span>`;
    if (character.id === "libby" && !libbyHidden()) return html`<span class=${className}><img src=${DEFAULT_LIBBY_PFP} alt="Libby" /></span>`;
    return html`<span class="${className} initial">${character.name.slice(0,2).toUpperCase()}</span>`;
  }

  /** The user's message avatar, from the same profile image already shown in the
   * account strip. Keeping this beside avatar() makes both sides of a message row
   * follow the same image/fallback rules. */
  private profileAvatar(name: string, className: string) {
    const imageID = this.workspace.profile.avatarImageId;
    return imageID
      ? html`<span class=${className}><img src=${api.chatImageURL(imageID)} alt="" /></span>`
      : html`<span class="${className} initial">${name.slice(0,2).toUpperCase()}</span>`;
  }

  /**
   * The character's full artwork beside the log — Libby's sprite for her tier and
   * mood, a character's own picture for anyone else.
   *
   * The pose is keyed on emotion and intensity so switching moods crossfades rather
   * than cutting, and the whole column collapses on narrow screens where the log
   * needs the room.
   */
  /**
   * The artwork to show for a character at a given mood.
   *
   * Sprites only — deliberately not the character's pfp. A pfp is a face for the
   * message log, and blowing it up to fill the stage and the call screen meant
   * setting one changed the character everywhere at once. Somewhere that is supposed
   * to react to mood is the wrong place for a picture that cannot.
   *
   * So this is the emotion-reactive wardrobe or nothing: today only Libby has one,
   * which is why other characters currently have no stage art and cannot be called.
   */
  private spriteFor(character: ChatCharacter, emotion: LibbyEmotion, intensity: number, activity?: string): string[] {
    return character.id === "libby" ? libbyAssetCandidates(emotion, intensity, loadLibbyOutfit(), activity) : [];
  }

  // --- Video call -----------------------------------------------------------
  // A face-to-face framing of the same conversation: the sprite fills the screen
  // and changes pose as the character's mood moves, with a caption of what they
  // just said. It is a presentation of the existing chat, not a second channel —
  // messages sent here land in the same log.

  private startCall() {
    const character = this.activeCharacter;
    if (!character) return;
    if (!this.spriteFor(character, "neutral", 1).length) {
      this.say(`${character.name} has no picture to show — set one on their character card first.`, true);
      return;
    }
    this.stopRinging();
    this.callOpen = true; this.callSeconds = 0; this.settingsOpen = false; this.scenePickerOpen = false;
    window.clearInterval(this.callTimer);
    this.callTimer = window.setInterval(() => (this.callSeconds += 1), 1000);
    void this.loadBackgrounds();
    this.focusComposer();
  }

  private endCall() {
    stopSpeaking();
    this.callOpen = false; this.scenePickerOpen = false;
    window.clearInterval(this.callTimer);
    this.focusComposer();
  }

  /** She is ringing. The popup stays up until answered, declined, or it rings out. */
  private ring() {
    if (this.callOpen || libbyHidden()) return;
    this.incomingCall = true;
    window.clearTimeout(this.ringTimer);
    this.ringTimer = window.setTimeout(() => this.declineCall(true), RING_MS);
    try { navigator.vibrate?.([220, 120, 220]); } catch { /* not every browser rings */ }
  }

  private stopRinging() { this.incomingCall = false; window.clearTimeout(this.ringTimer); }

  private acceptCall() { this.stopRinging(); this.startCall(); }

  private declineCall(missed = false) {
    if (!this.incomingCall) return;
    this.stopRinging();
    if (missed) this.say("Missed a call from " + (this.activeCharacter?.name ?? "her") + ".");
  }

  /** The places she can be. Best-effort: an old server has none and the call simply
      shows its plain stage. */
  private async loadBackgrounds() {
    try {
      const res = await api.libbyBackgrounds();
      this.backgrounds = res.backgrounds;
      this.defaultBackground = res.default ?? "";
    }
    catch { this.backgrounds = []; }
  }

  /** Puts her somewhere by hand. Conversation state, so she is told next turn and
      stays there until one of you moves her. */
  private setBackground(id: string) {
    const conversation = this.activeConversation;
    if (!conversation) return;
    conversation.background = id; conversation.updatedAt = Date.now();
    this.touchWorkspace(); this.scenePickerOpen = false;
  }

  private toggleScenePicker() {
    this.scenePickerOpen = !this.scenePickerOpen;
    if (this.scenePickerOpen) void this.loadBackgrounds();
  }

  private renderCall(character: ChatCharacter, conversation: ChatConversation) {
    if (!this.callOpen) return nothing;
    const pose = this.poseOf(character, conversation);
    if (!pose) return nothing;
    const { emotion, intensity, typing, activity, assets } = pose;
    const place = this.backgrounds.find((bg) => bg.id === (conversation.background || this.defaultBackground) && bg.hasImage);
    // The last few lines as subtitles, newest at the bottom. Thoughts are not speech.
    const recent = conversation.messages.filter((message) => !message.thought).slice(-3);
    const clock = `${Math.floor(this.callSeconds / 60)}:${String(this.callSeconds % 60).padStart(2, "0")}`;
    return html`<div class="call" role="dialog" aria-modal="true" aria-label=${`Video call with ${character.name}`}>
      <div class="call-scene" @click=${() => { if (this.scenePickerOpen) this.scenePickerOpen = false; }}>
        <div class="call-bg ${place ? "" : "plain"}" style=${place ? `background-image:url("${api.libbyBackgroundURL(place.id)}")` : ""}></div>
        <div class="call-veil"></div>
        <!-- Keyed on the pose: a mood change replaces the element instead of
             mutating src, so the fade-in replays and the fallback chain restarts
             from the top for the new emotion's art. -->
        <span class="call-hold libby-breathe">${keyed(`${emotion}-${intensity}-${activity}-${this.spoken}`, html`<img
          class="call-sprite" src=${assets[0]} data-fallback-index="0"
          alt=${`${character.name} looking ${emotion}`}
          @error=${(event:Event) => applyImageFallback(event.target as HTMLImageElement, assets)} />`)}</span>
        <div class="call-top">
          <span class="call-who">${this.avatar(character, "avatar")}<span><strong>${character.name}</strong><span><i class="call-live"></i>${typing ? "typing…" : this.busy ? "thinking…" : clock}</span></span></span>
          <span class="call-mood" title=${`Feeling ${emotion}`}>
            <span class="material-symbols-rounded">mood</span>${emotion}
            ${conversation.activity ? html`<span class="call-doing" title=${`She is ${conversation.activity}`}>${activityLabel(conversation.activity)}</span>` : nothing}
            ${place ? html`<span class="call-place" title="Where she is">${place.name}</span>` : nothing}
          </span>
        </div>
        ${this.callCaptions ? html`<div class="call-captions" aria-live="polite">
          ${recent.map((message, index) => html`<p class="call-caption ${message.role === "user" ? "mine" : ""} ${index < recent.length - 1 ? "older" : ""}">${formatted(message.content, message.links, (id) => requestOpenMedia(this, id))}</p>`)}
          ${typing ? html`<p class="call-caption typing" aria-label="${character.name} is typing"><span class="dots"><i></i><i></i><i></i></span></p>` : nothing}
        </div>` : nothing}
        ${this.scenePickerOpen ? this.renderScenePicker(conversation) : nothing}
      </div>
      <div class="call-bar">
        <input class="call-input" placeholder=${`Say something to ${character.name}…`} aria-label=${`Message ${character.name}`}
          .value=${this.draft} @input=${(event:Event)=>(this.draft=(event.target as HTMLInputElement).value)}
          @keydown=${(event:KeyboardEvent)=>{ if (event.key === "Enter") { event.preventDefault(); void this.send(); } }} />
        <button class="call-btn send" title="Send" aria-label="Send" ?disabled=${!this.draft.trim() || this.busy} @click=${()=>void this.send()}><span class="material-symbols-rounded">send</span></button>
        <button class="call-btn ${this.scenePickerOpen ? "on" : ""}" title="Change where she is" aria-label="Change the background" @click=${()=>this.toggleScenePicker()}><span class="material-symbols-rounded">wallpaper</span></button>
        <button class="call-btn captions ${this.callCaptions ? "on" : ""}" title=${this.callCaptions ? "Hide captions" : "Show captions"} aria-pressed=${this.callCaptions ? "true" : "false"} @click=${()=>(this.callCaptions=!this.callCaptions)}><span class="material-symbols-rounded">closed_caption</span></button>
        <button class="call-btn" title="Re-respond" aria-label="Ask for a different reply" ?disabled=${this.busy} @click=${()=>void this.regenerate()}><span class="material-symbols-rounded">refresh</span></button>
        <button class="call-btn end" title="End call" aria-label="End call" @click=${()=>this.endCall()}><span class="material-symbols-rounded">call_end</span></button>
      </div>
    </div>`;
  }

  /** The rooms she can be in, on the call. "Plain" is the stage with no room; she
      moves herself with a tag, and this is how you move her by hand. */
  private renderScenePicker(conversation: ChatConversation) {
    const usable = this.backgrounds.filter((bg) => bg.hasImage);
    return html`<div class="call-tray" @click=${(event:Event) => event.stopPropagation()}>
      <h4>Where she is</h4>
      <div class="call-scenes">
        ${this.defaultBackground ? nothing : html`<button class="call-scene-btn ${!conversation.background ? "on" : ""}" title="No background" @click=${() => this.setBackground("")}>
          <span class="scene-icon material-symbols-rounded">blur_on</span><span class="scene-name">Plain</span>
        </button>`}
        ${usable.map((bg) => html`<button class="call-scene-btn ${(conversation.background || this.defaultBackground) === bg.id ? "on" : ""}" title=${bg.tags.join(", ") || bg.name} @click=${() => this.setBackground(bg.id)}>
          <img src=${api.libbyBackgroundURL(bg.id)} alt="" loading="lazy"/><span class="scene-name">${bg.name}${bg.id === this.defaultBackground ? " · default" : ""}</span>
        </button>`)}
      </div>
      <p>${usable.length ? "She picks a room herself when the scene moves; this overrides her until she moves again." : "No backgrounds yet — add and tag some in the outfit studio, and she'll choose between them."}</p>
    </div>`;
  }

  /**
   * What she looks like right now, for the stage, the banner and the call: the mood
   * and tier from the conversation, the typing art while a reply is on its way, and
   * the fallback chain for that pose. Null when there is nothing to draw — Libby is
   * hidden on this device, or the character has no reactive art.
   */
  private poseOf(character: ChatCharacter, conversation: ChatConversation) {
    if (character.id === "libby" && libbyHidden()) return null;
    const emotion = normalizeEmotion(conversation.emotion), intensity = normalizeIntensity(conversation.intensity);
    const typing = this.busy && this.typingPhase === "typing";
    // While she writes, the outfit's typing art (if it drew one) stands in for a state
    // she is not otherwise in, and a bubble of dots sits by her head either way.
    const activity = conversation.activity || (typing ? "typing" : "");
    const assets = this.spriteFor(character, emotion, intensity, activity);
    // Nothing to stand on the stage: a character with no art gets no column at all
    // rather than an empty one. Their picture is set from the character card.
    if (!assets.length) return null;
    return { emotion, intensity, typing, activity, assets, key: `${emotion}-${intensity}-${activity}-${this.spoken}` };
  }

  /**
   * Her bust along the top of the conversation, where the portrait column does not
   * fit. Same pose, same reactions, same key as the stage, so she rocks into a line
   * here exactly as she does there. Tapping it opens the call.
   */
  private renderHero(character: ChatCharacter, conversation: ChatConversation) {
    const pose = this.poseOf(character, conversation);
    if (!pose) return nothing;
    const { emotion, typing, activity, assets, key } = pose;
    const status = this.busy ? "Typing…" : this.autoRunning ? "Talking on their own" : this.status?.enabled ? this.status.model : "Local replies";
    return html`<div class="hero" role="button" tabindex="0" aria-label=${`${character.name} — open the call`} title="Open the call"
      @click=${() => this.startCall()} @keydown=${(event:KeyboardEvent) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); this.startCall(); } }}>
      <span class="hero-hold libby-breathe">${keyed(key, html`<img
        class="hero-sprite ${this.busy ? "" : "libby-speak"}" src=${assets[0]} data-fallback-index="0"
        alt=${activity ? `${character.name} ${activity}, looking ${emotion}` : `${character.name} looking ${emotion}`}
        @error=${(event:Event) => applyImageFallback(event.target as HTMLImageElement, assets)} />`)}</span>
      ${typing ? html`<div class="hero-bubble" aria-hidden="true"><span class="dots"><i></i><i></i><i></i></span></div>` : nothing}
      <div class="hero-copy">
        <span class="hero-name">${character.name}</span>
        <span class="hero-status">${status}${character.id === "libby" ? ` · ${emotion}` : ""}</span>
        ${conversation.activity ? html`<div class="stage-doing" role="status">${activityLabel(conversation.activity)}</div>` : nothing}
      </div>
      <span class="hero-open"><span class="material-symbols-rounded">videocam</span>Call</span>
    </div>`;
  }

  private renderStage(character: ChatCharacter, conversation: ChatConversation) {
    const pose = this.poseOf(character, conversation);
    if (!pose) return nothing;
    const { emotion, intensity, typing, activity, assets } = pose;
    const status = this.busy ? "Typing…" : this.autoRunning ? "Talking on their own" : this.status?.enabled ? this.status.model : "Local replies";
    const place = this.backgrounds.find((bg) => bg.id === (conversation.background || this.defaultBackground) && bg.hasImage);
    // Her last line, up by her head, between replies. Thoughts are not speech, and a
    // bubble that is only a picture has nothing to quote.
    const lastLine = typing ? undefined : [...conversation.messages].reverse().find((m) => m.role === "assistant" && !m.thought && m.content.trim());
    const quote = lastLine ? excerptOf(plainSpeech(lastLine.content), 110) : "";
    const online = !!this.status?.enabled;
    return html`<aside class="stage" aria-label="${character.name} portrait">
      <div class="stage-grip ${this.stageDragging ? "dragging" : ""}" title="Drag to resize" @pointerdown=${this.stageDragStart}></div>
      <div class="stage-scene" @click=${() => { if (this.scenePickerOpen) this.scenePickerOpen = false; }}>
        <div class="stage-bg ${place ? "room" : "plain"}" style=${place ? `background-image:url("${api.libbyBackgroundURL(place.id)}")` : ""}></div>
        <div class="stage-veil"></div>
        <div class="stage-floor"></div>
        <div class="stage-art">
          <!-- Keyed on the pose *and* on how many things have been said, so the sprite
               rocks into every new line rather than only when her mood changes — and
               so a mood change still replaces the element, restarting the artwork
               fallback chain for the new pose. -->
          <span class="sprite-hold libby-breathe">${keyed(`${emotion}-${intensity}-${activity}-${this.spoken}`, html`<img
            class="sprite ${this.busy ? "" : "libby-speak"}" src=${assets[0]} data-fallback-index="0"
            alt=${activity ? `${character.name} ${activity}, looking ${emotion}` : `${character.name} looking ${emotion}`}
            @error=${(event:Event) => applyImageFallback(event.target as HTMLImageElement, assets)} />`)}</span>
        </div>
        ${typing ? html`<div class="stage-bubble" aria-hidden="true"><span class="dots"><i></i><i></i><i></i></span></div>`
          : quote ? html`<div class="stage-bubble quote" aria-hidden="true">${quote}</div>` : nothing}
        <div class="stage-tools">
          ${character.id === "libby" ? html`<button class="icon-btn" title="Video call" aria-label="Start a video call" @click=${() => this.startCall()}><span class="material-symbols-rounded">videocam</span></button>
          <button class="icon-btn ${this.scenePickerOpen ? "on" : ""}" title="Change where she is" aria-label="Change the background" @click=${(event:Event) => { event.stopPropagation(); this.toggleScenePicker(); }}><span class="material-symbols-rounded">wallpaper</span></button>` : nothing}
          <button class="icon-btn ${this.speakOn ? "on" : ""}" title=${this.speakOn ? "Stop reading replies aloud" : "Read replies aloud"} aria-label="Voice" @click=${() => this.toggleSpeak()}><span class="material-symbols-rounded">${this.speakOn ? "volume_up" : "volume_off"}</span></button>
          <button class="icon-btn" title="Hide portrait" aria-label="Hide portrait" @click=${() => (this.stageOpen = false)}><span class="material-symbols-rounded">close</span></button>
        </div>
        ${this.scenePickerOpen && !this.callOpen ? this.renderScenePicker(conversation) : nothing}
        <div class="stage-glass">
          <div class="stage-who">
            <span class="stage-name">${character.name}</span>
            <span class="stage-status"><span class="status-dot ${online ? "online" : ""}"></span> ${status}</span>
          </div>
          <div class="stage-chips">
            <span class="stage-chip" title="How she feels"><span class="material-symbols-rounded">mood</span>${EMOTION_LABELS[emotion] ?? emotion}</span>
            ${conversation.activity ? html`<span class="stage-chip doing" role="status" title=${`She is ${conversation.activity}`}><span class="material-symbols-rounded">directions_walk</span>${activityLabel(conversation.activity)}</span>` : nothing}
            ${place ? html`<span class="stage-chip" title="Where she is"><span class="material-symbols-rounded">location_on</span>${place.name}</span>` : nothing}
          </div>
          ${character.id === "libby" ? html`<div class="stage-heat h${intensity}" title=${`Heat ${intensity} of 5`}>
            <span>Heat</span><span class="segs">${[1, 2, 3, 4, 5].map((n) => html`<i class=${n <= intensity ? "on" : ""}></i>`)}</span>
          </div>` : nothing}
        </div>
      </div>
    </aside>`;
  }

  /**
   * Resizing the column by its edge. The width is per device, like the theme, and
   * bounded so it can neither vanish nor swallow the conversation.
   */
  private stageDragStart = (event: PointerEvent) => {
    event.preventDefault();
    const startX = event.clientX;
    const startW = this.stageWidth || (this.shadowRoot?.querySelector(".stage") as HTMLElement | null)?.offsetWidth || 300;
    this.stageDragging = true;
    const move = (e: PointerEvent) => {
      const next = Math.round(Math.max(220, Math.min(window.innerWidth * 0.5, startW + (startX - e.clientX))));
      this.stageWidth = next;
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      this.stageDragging = false;
      try { localStorage.setItem(STAGE_WIDTH_KEY, String(this.stageWidth)); } catch { /* private mode */ }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  private renderAutopilotBar(character: ChatCharacter) {
    if (!this.autopilot) return nothing;
    const stalled = this.autoTurns <= 0;
    const state = !this.status?.enabled ? `Autopilot is waiting for a model.`
      : this.autoPaused ? `Autopilot paused.`
      : stalled ? `${character.name} is waiting for you to say something.`
      : `${character.name} keeps the conversation going · ${this.autoTurns} turn${this.autoTurns === 1 ? "" : "s"} left`;
    return html`<div class="autobar ${this.autoPaused || stalled || !this.status?.enabled ? "idle" : ""}" role="status">
      <span class="material-symbols-rounded">${this.autoPaused ? "pause_circle" : "smart_toy"}</span>
      <span class="autobar-copy">${state}</span>
      ${this.status?.enabled ? html`<button class="autobar-btn" @click=${() => stalled ? this.refillAutopilot() : this.pauseAutopilot(!this.autoPaused)}>
        ${stalled ? "Continue" : this.autoPaused ? "Resume" : "Pause"}
      </button>` : nothing}
      <button class="autobar-btn" @click=${() => this.toggleAutopilot()}>Turn off</button>
    </div>`;
  }

  /**
   * The chat list, the way every messenger lays one out: one row per conversation,
   * newest first, with who it is with, when it last moved, and what was last said.
   *
   * Every character's conversations are in one list rather than filed under the
   * character, because that is how a chat app is read — you scan for the person and
   * the last line, not for a folder. A character with more than one open conversation
   * shows its title after the name so the rows are still told apart.
   */
  private renderSidebar() {
    const me = this.workspace.profile.displayName || this.user?.username || "You";
    return html`<aside class="side">
      <div class="side-head">
        <h1>${this.pickerOpen ? "New chat" : "Chats"}</h1>
        ${this.pickerOpen
          ? html`<button class="icon-btn" title="Back to chats" aria-label="Back to chats" @click=${() => (this.pickerOpen = false)}><span class="material-symbols-rounded">close</span></button>`
          : html`<button class="icon-btn" title="New chat" aria-label="New chat" @click=${() => (this.pickerOpen = true)}><span class="material-symbols-rounded">edit_square</span></button>
            <button class="me-btn" title="Your profile" aria-label="Your profile" @click=${() => { this.settingsOpen = true; this.editorTab = "profile"; this.mobileNavOpen = false; }}>${this.profileAvatar(me, "me-avatar")}</button>`}
      </div>
      ${this.pickerOpen ? this.renderFriends() : html`
        <label class="search"><span class="material-symbols-rounded" style="font-size:18px">search</span>
          <input type="search" placeholder="Search" aria-label="Search chats" .value=${this.chatSearch} @input=${(event: Event) => (this.chatSearch = (event.target as HTMLInputElement).value)} /></label>
        <div class="chats">${this.renderChatRows()}</div>`}
    </aside>`;
  }

  private renderChatRows() {
    const query = this.chatSearch.trim().toLowerCase();
    const count = new Map<string, number>();
    for (const conversation of this.workspace.conversations) count.set(conversation.characterId, (count.get(conversation.characterId) ?? 0) + 1);
    const rows = [...this.workspace.conversations]
      .map((conversation) => ({ conversation, character: this.visibleCharacters.find((c) => c.id === conversation.characterId) }))
      .filter((row): row is { conversation: ChatConversation; character: ChatCharacter } => !!row.character)
      .sort((a, b) => b.conversation.updatedAt - a.conversation.updatedAt)
      .filter(({ conversation, character }) => !query
        || character.name.toLowerCase().includes(query)
        || conversation.title.toLowerCase().includes(query)
        || previewText(this.lastLine(conversation)).toLowerCase().includes(query));
    if (!rows.length) return html`<div class="chats-empty">${query ? "No chats match that." : "No chats yet — start one."}</div>`;
    return rows.map(({ conversation, character }) => {
      const last = [...conversation.messages].reverse().find((message) => !message.thought);
      const several = (count.get(character.id) ?? 0) > 1;
      return html`<div class="chat-wrap ${conversation.id === this.conversationID ? "on" : ""}" data-id=${conversation.id}>
        <button class="chat-row" @click=${() => this.activateConversation(conversation.id)} aria-current=${conversation.id === this.conversationID ? "page" : "false"}>
          ${this.avatar(character, "chat-avatar")}
          <span class="chat-name">${character.name}${several ? html` <small>· ${conversation.title}</small>` : nothing}</span>
          <span class="chat-time">${listTimeOf(conversation.updatedAt)}</span>
          <span class="chat-preview">${last
            ? html`${last.role === "user" ? "You: " : ""}${last.imageId && !last.content.trim() ? html`<span class="material-symbols-rounded">photo_camera</span>Photo` : previewText(last.content)}`
            : html`<em>${character.firstMessage?.trim() ? "Say hello" : "No messages yet"}</em>`}</span>
        </button>
        <button class="chat-delete" title="Delete chat" aria-label="Delete chat with ${character.name}" @click=${() => this.deleteConversation(conversation.id)}><span class="material-symbols-rounded" style="font-size:16px">delete</span></button>
      </div>`;
    });
  }

  /** The most recent thing said in a conversation, for search and the row preview. */
  private lastLine(conversation: ChatConversation): string {
    return [...conversation.messages].reverse().find((message) => !message.thought)?.content ?? "";
  }

  /**
   * Who to start a chat with, and everything you can do to them from here.
   *
   * This is a panel inside the sidebar, not an overlay. It used to say so with the
   * class `.picker` — which is also the library picker's full-screen scrim, defined
   * further down the same stylesheet and therefore winning. The roster rendered as a
   * dark sheet across the whole app. Named `.friends` now, which nothing else claims.
   *
   * Each row carries its own management, because the only place a character could be
   * acted on before was inside a conversation with them: to export a card or delete
   * somebody you had to start talking to them first. Duplicate is here rather than in
   * the editor for the reason the others are — the roster is where you are when you
   * think "another one like that".
   */
  private renderFriends() {
    const characters = this.visibleCharacters;
    return html`<div class="friends"
      @dragover=${(event: DragEvent) => { event.preventDefault(); this.cardDrop = true; }}
      @dragleave=${() => (this.cardDrop = false)}
      @drop=${this.dropCard}>
      <div class="pick-cat">Friends</div>
      ${characters.map((character) => html`
        <div class="pick-wrap">
          <button class="pick" @click=${() => this.startChatWith(character.id)}>
            ${this.avatar(character, "pick-avatar")}
            <span class="pick-name">${character.name}</span>
            <span class="pick-sub">${character.description?.trim() || (character.id === "libby" ? "Your library's companion" : "Custom character")}</span>
          </button>
          <div class="pick-acts">
            <button class="pick-act" title="Duplicate ${character.name}" aria-label="Duplicate ${character.name}"
              @click=${() => this.duplicateCharacter(character.id)}><span class="material-symbols-rounded">content_copy</span></button>
            <button class="pick-act" title="Export ${character.name} as a card" aria-label="Export ${character.name} as a card"
              @click=${() => this.exportCharacter(character.id)}><span class="material-symbols-rounded">download</span></button>
            ${character.builtIn ? nothing : html`<button class="pick-act danger" title="Remove ${character.name}" aria-label="Remove ${character.name}"
              @click=${() => this.removeCharacter(character.id)}><span class="material-symbols-rounded">delete</span></button>`}
          </div>
        </div>`)}
      <div class="pick-cat">Add someone</div>
      <button class="pick add" @click=${() => { this.pickerOpen = false; this.addCharacter(); }}>
        <span class="pick-avatar"><span class="material-symbols-rounded">person_add</span></span>
        <span class="pick-name">Write a new card</span>
        <span class="pick-sub">Start from a blank character</span>
      </button>
      <label class="dropzone ${this.cardDrop ? "over" : ""}">
        <input type="file" accept=".json,.png,application/json,image/png" multiple @change=${this.importCard} />
        <span class="material-symbols-rounded">upload_file</span>
        <strong>Import a character card</strong>
        <span>Drop a .png or .json here, or click to choose. SillyTavern V1, V2 and V3 cards all work.</span>
      </label>
      ${this.cardNote ? html`<div class="card-note ${this.cardNote.bad ? "bad" : ""}">${this.cardNote.text}</div>` : nothing}
    </div>`;
  }

  /**
   * Writes a conversation out as one JSON file.
   *
   * The point is to be able to hand somebody — or a debugger — the whole of what
   * happened, rather than a screenshot and a description of it. So it carries the log
   * as stored (every message, with the ids of the pictures and items that went with
   * it), the character card that was in force, and, for every turn captured while the
   * switch was on, exactly what the server assembled and what the model said before
   * anything parsed it.
   *
   * Turns are matched to the log by time rather than merged into it: a regenerated
   * reply leaves two captures against one message, and flattening them would hide the
   * thing you opened the file to look at.
   *
   * Nothing is redacted, because there is nothing here that is not the user's: their
   * own messages, their own character, and the prompt built out of their own workspace.
   * The file is written locally and goes nowhere on its own.
   */
  private exportConversation(conversationID?: string) {
    const conversation = conversationID ? this.workspace.conversations.find((c) => c.id === conversationID) : this.activeConversation;
    if (!conversation) return;
    const character = this.workspace.characters.find((c) => c.id === conversation.characterId);
    const turns = this.turnLog.get(conversation.id) ?? [];
    const dump = {
      exportedAt: new Date().toISOString(),
      app: "oppailib",
      // Bumped when the shape changes, so a reader can tell what it is holding.
      format: 1,
      conversation: {
        id: conversation.id,
        title: conversation.title,
        characterId: conversation.characterId,
        mode: conversation.mode,
        emotion: conversation.emotion,
        intensity: conversation.intensity,
        activity: conversation.activity ?? "",
        background: conversation.background ?? "",
        options: conversation.options ?? {},
        updatedAt: conversation.updatedAt,
        messages: conversation.messages,
      },
      character: character ?? null,
      // The gallery rows for every picture this conversation referred to, so a tag
      // list in the log can be checked against what the picture is actually tagged.
      images: this.workspace.images.filter((image) =>
        conversation.messages.some((message) => message.imageId === image.id)),
      profile: this.workspace.profile,
      turns,
      capture: turns.length
        ? `${turns.length} turn(s) captured with full prompts`
        : "No turns captured — switch on 'Capture turns' in the chat menu and send a message first",
    };
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    link.href = url;
    link.download = `oppailib-chat-${(character?.name ?? "chat").replace(/[^\w.-]+/g, "-").toLowerCase()}-${stamp}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.say(turns.length
      ? `Exported ${conversation.messages.length} messages and ${turns.length} captured turn(s).`
      : `Exported ${conversation.messages.length} messages. Turn capture was off, so no prompts are included.`);
  }

  /** Files dropped onto the roster are read as cards, same as the file input. */
  private dropCard(event: DragEvent) {
    event.preventDefault();
    this.cardDrop = false;
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (files.length) void this.ingestCards(files);
  }

  /**
   * Copies a character, conversations excluded.
   *
   * The copy is a fresh id with "(copy)" appended, and it keeps the original's avatar
   * id: both point at the same gallery image, which is right — duplicating somebody to
   * make a variant should not make you re-upload their face.
   */
  private duplicateCharacter(id: string) {
    const source = this.workspace.characters.find((character) => character.id === id);
    if (!source) return;
    if (this.workspace.characters.length >= 40) { this.say("That's as many friends as a workspace holds.", true); return; }
    const copy: ChatCharacter = { ...source, id: newID(), name: `${source.name} (copy)`, builtIn: false };
    this.workspace.characters.push(copy);
    this.touchWorkspace();
    this.say(`${copy.name} added.`);
  }

  /** Writes a character out as a V2 card, which is what every other tool reads. */
  private exportCharacter(id: string) {
    const character = this.workspace.characters.find((item) => item.id === id);
    if (!character) return;
    const card = characterToCard(character);
    const blob = new Blob([JSON.stringify(card, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${character.name.replace(/[^\w.-]+/g, "-").toLowerCase() || "character"}.card.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.say(`Exported ${character.name}.`);
  }

  /** Removes a character and their conversations from the roster. */
  private removeCharacter(id: string) {
    const character = this.workspace.characters.find((item) => item.id === id);
    if (!character || character.builtIn) return;
    if (!confirm(`Remove ${character.name} and every chat with them?`)) return;
    this.workspace.characters = this.workspace.characters.filter((item) => item.id !== id);
    this.workspace.conversations = this.workspace.conversations.filter((item) => item.characterId !== id);
    if (this.characterID === id) this.characterID = this.workspace.characters[0]?.id ?? "libby";
    const next = this.conversationsFor()[0];
    if (next) this.conversationID = next.id; else this.newConversation(false);
    this.touchWorkspace();
    this.say(`${character.name} removed.`);
  }

  private startChatWith(id: string) {
    this.pickerOpen = false;
    this.characterID = id;
    this.newConversation();
  }

  private renderSettings() {
    const character = this.activeCharacter, conversation = this.activeConversation; if (!character || !conversation) return nothing;
    const active = EDITOR_TABS.find((tab) => tab.id === this.editorTab) ?? EDITOR_TABS[0];
    let group = "";
    return html`<section class="settings">
      <nav class="settings-nav" aria-label="Chat settings">
        ${EDITOR_TABS.map((tab) => {
          const heading = tab.group === group ? nothing : html`<div class="nav-cat">${tab.group}</div>`;
          group = tab.group;
          return html`${heading}
            <button class="nav-row ${tab.id === this.editorTab ? "on" : ""}" aria-current=${tab.id === this.editorTab ? "page" : "false"} @click=${() => (this.editorTab = tab.id)}>
              <span class="material-symbols-rounded">${tab.icon}</span>
              <span>${tab.id === "character" ? character.name : tab.label}</span>
            </button>`;
        })}
        <div class="nav-sep"></div>
        <button class="nav-row close" @click=${() => (this.settingsOpen=false)}>
          <span class="material-symbols-rounded">arrow_back</span><span>Back to chat</span>
        </button>
      </nav>
      <div class="settings-body">
        <div class="settings-head">
          <strong>${active.id === "character" ? character.name : active.label}<span>Changes sync between WebUI and Android</span></strong>
          <button class="icon-btn" title="Close settings" aria-label="Close settings" @click=${() => (this.settingsOpen=false)}><span class="material-symbols-rounded">close</span></button>
        </div>
        ${this.editorTab === "character" ? this.renderCharacterPanel(character) : nothing}
        ${this.editorTab === "model" ? this.renderModelPanel(conversation, character) : nothing}
        ${this.editorTab === "images" ? this.renderImagesPanel(character) : nothing}
        ${this.editorTab === "profile" ? this.renderProfilePanel() : nothing}
      </div>
    </section>`;
  }

  private field(label: string, key: keyof ChatCharacter, value: string, rows = 1) {
    return html`<label>${label}${rows > 1
      ? html`<textarea class="field" rows=${rows} .value=${value} @change=${(event:Event) => this.updateCharacter(key, (event.target as HTMLTextAreaElement).value)}></textarea>`
      : html`<input class="field" .value=${value} @change=${(event:Event) => this.updateCharacter(key, (event.target as HTMLInputElement).value)} />`}</label>`;
  }

  private renderCharacterPanel(character: ChatCharacter) {
    const libby = character.id === "libby" && !libbyHidden();
    return html`<div class="panel">
      <section class="group">
        <h3>Picture<span>Their face in the chat list, the header, and every message.</span></h3>
        <div class="pfp-row">
          ${this.avatar(character, "pfp")}
          <div class="pfp-actions">
            <strong>${character.name}</strong>
            <span class="empty">${libby
              ? "Libby wears her artwork by default. A picture set here replaces it everywhere."
              : "Kept apart from this character's images — a face is never offered as a photo to send."}</span>
            <div class="panel-actions">
              <span class="file-btn">${character.avatarImageId ? "Replace picture" : "Upload picture"}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" @change=${this.uploadCharacterPicture}/></span>
              ${character.avatarImageId ? html`<button class="secondary" @click=${() => void this.removeCharacterPicture()}>Remove</button>` : nothing}
            </div>
          </div>
        </div>
      </section>
      <div class="grid">${this.field("Name", "name", character.name)}${character.id === "libby" ? nothing : html`<label>Default mode<select .value=${character.defaultMode} @change=${(event:Event) => this.updateCharacter("defaultMode", (event.target as HTMLSelectElement).value)}>${MODES.map((mode) => html`<option value=${mode.id}>${mode.label}</option>`)}</select></label>`}</div>
      ${this.field("Description", "description", character.description ?? "", 2)}
      ${this.field("Appearance — written as picture tags. Also how they recognise a photo of themselves.", "appearance", character.appearance ?? "", 2)}
      <div class="grid">${this.field("Personality", "personality", character.personality ?? "", 3)}${this.field("Scenario", "scenario", character.scenario ?? "", 3)}</div>
      ${this.field("Kinks and turn-ons — colours how they flirt; never recited as a list.", "kinks", character.kinks ?? "", 3)}
      ${this.field("First message", "firstMessage", character.firstMessage ?? "", 2)}
      ${this.field("System prompt / card instructions", "systemPrompt", character.systemPrompt ?? "", 3)}
      ${this.field("Example dialogue", "exampleDialogue", character.exampleDialogue ?? "", 3)}
      ${this.field("Creator notes (not sent to model)", "creatorNotes", character.creatorNotes ?? "", 2)}
      <label>Character-card weight <span class="range"><input type="range" min="0.1" max="2" step="0.05" .value=${String(character.promptWeight || 1)} @input=${(event:Event) => this.updateCharacter("promptWeight", Number((event.target as HTMLInputElement).value))}/><output>${(character.promptWeight || 1).toFixed(2)}</output></span></label>
      <div class="panel-actions"><button class="primary" @click=${() => void this.saveWorkspace()}>Save card</button><span class="file-btn">Import a card<input type="file" accept=".json,.png,application/json,image/png" multiple @change=${this.importCard}/></span><button @click=${() => this.exportCharacter(character.id)}>Export card</button>${character.builtIn ? html`<span class="empty">Libby's built-in card is editable.</span>` : html`<button class="danger" @click=${this.deleteCharacter}>Remove friend</button>`}</div>
    </div>`;
  }

  /** Loads a model, then re-probes. Long-running: the backend caps it at 10 minutes. */
  private async loadModel() {
    const target = this.modelChoice || this.models?.models[0];
    if (!target || this.modelBusy) return;
    let composed: { args: Record<string, unknown>; settings: Record<string, unknown> };
    try { composed = this.composeLoadArgs(); }
    catch { this.say("Extra loader arguments and settings must be valid JSON.", true); return; }
    this.modelBusy = true; this.say(`Loading ${target}… this can take a few minutes.`);
    try {
      await api.loadChatModel(target, composed.args, composed.settings, true);
      await this.refreshModels(true);
      this.say(`Loaded ${this.models?.loaded || target}.`);
    } catch (error) { this.say((error as Error).message, true); }
    finally { this.modelBusy = false; }
  }

  /** Unloading frees VRAM but leaves the backend with no model, so it is confirmed. */
  private async unloadModel() {
    if (this.modelBusy || !confirm("Unload the current model? Chat stops working until a model is loaded again.")) return;
    this.modelBusy = true; this.say("Unloading…");
    try {
      await api.unloadChatModel();
      await this.refreshModels(true);
      this.say("Model unloaded.");
    } catch (error) { this.say((error as Error).message, true); }
    finally { this.modelBusy = false; }
  }

  private renderModelControls() {
    const models = this.models?.models ?? [], loaded = this.models?.loaded || this.status?.model || "";
    return html`<label>Text-generation backend
      <div class="model-row">
        <strong>${loaded || "No model loaded"}${this.status?.contextLimit ? ` · ${this.status.contextLimit.toLocaleString()} token context` : ""}</strong>
        <button class="secondary" ?disabled=${this.modelBusy} @click=${() => void this.refreshModels()}>Refresh</button>
      </div>
    </label>
    ${this.models?.supported === false
      ? html`<div class="empty">This backend serves an OpenAI-compatible API but does not expose model load/unload. Manage the model where it runs.</div>`
      : html`
        <label>Model
          <select class="field" ?disabled=${this.modelBusy || !models.length}
            .value=${this.modelChoice || loaded}
            @change=${(event: Event) => { this.modelChoice = (event.target as HTMLSelectElement).value; this.seedLoadArgs(this.modelChoice); }}>
            ${models.length ? nothing : html`<option value="">No models found</option>`}
            ${models.map((model) => html`<option value=${model} ?selected=${model === (this.modelChoice || loaded)}>${model}</option>`)}
          </select>
        </label>
        ${this.renderLoaderForm()}
        <div class="panel-actions">
          <button class="primary" ?disabled=${this.modelBusy || !models.length} @click=${() => void this.loadModel()}>
            ${this.modelBusy ? "Working…" : "Load model"}
          </button>
          <button class="danger" ?disabled=${this.modelBusy || !loaded} @click=${() => void this.unloadModel()}>Unload</button>
          ${this.canManageModels
            ? html`<button class="secondary" ?disabled=${this.modelBusy || !models.length}
                title="See what deleting the selected model would remove"
                @click=${() => void this.inspectModel()}>Delete…</button>`
            : nothing}
        </div>
        ${this.modelBusy ? html`<div class="empty">Loading a large model can take several minutes. Leaving this page will not cancel it.</div>` : nothing}
        ${this.deleteTarget ? this.renderDeleteModel(this.deleteTarget) : nothing}
        ${this.deleteError ? html`<div class="empty error">${this.deleteError}</div>` : nothing}
        ${this.renderLoras()}`}`;
  }

  /**
   * The loader arguments: what the WebUI's Model tab asks before loading, asked here
   * instead so the WebUI need not be open beside this one. Remembered per model on the
   * server once a load with them has worked.
   */
  private renderLoaderForm() {
    if (!this.backend?.supported) return nothing;
    const loader = String(this.loadArgs.loader ?? "");
    const fields = LOADER_FIELDS.filter((f) => !f.loaders || !loader || f.loaders.includes(loader));
    return html`<details class="loader" open>
      <summary>Loader settings<span class="hint">${Object.keys(this.loadArgs).length || this.loadExtra.trim() ? "set" : "backend defaults"}</span></summary>
      <div class="grid loader-grid">
        <label>Loader<select class="field" .value=${loader} ?disabled=${this.modelBusy}
          @change=${(event:Event) => this.setLoadArg(LOADER_KEY, (event.target as HTMLSelectElement).value)}>
          <option value="">Backend decides</option>
          ${(this.backend.loaders ?? []).map((name) => html`<option value=${name} ?selected=${name === loader}>${name}</option>`)}
        </select></label>
        ${fields.map((field) => field.kind === "check"
          ? html`<label class="inline-check loader-check"><input type="checkbox" .checked=${!!this.loadArgs[field.keys[0]]} ?disabled=${this.modelBusy}
              @change=${(event:Event) => this.setLoadArg(field, (event.target as HTMLInputElement).checked)}/>${field.label}${field.hint ? html`<span class="hint">${field.hint}</span>` : nothing}</label>`
          : field.kind === "select"
          ? html`<label>${field.label}<select class="field" .value=${String(this.loadArgs[field.keys[0]] ?? "")} ?disabled=${this.modelBusy}
              @change=${(event:Event) => this.setLoadArg(field, (event.target as HTMLSelectElement).value)}>
              <option value="">Default</option>${(field.options ?? []).map((o) => html`<option value=${o} ?selected=${o === String(this.loadArgs[field.keys[0]] ?? "")}>${o}</option>`)}
            </select></label>`
          : html`<label>${field.label}${field.hint ? html`<span class="hint">${field.hint}</span>` : nothing}<input class="field" type=${field.kind === "number" ? "number" : "text"} placeholder=${field.placeholder ?? "default"}
              .value=${String(this.loadArgs[field.keys[0]] ?? "")} ?disabled=${this.modelBusy}
              @change=${(event:Event) => this.setLoadArg(field, (event.target as HTMLInputElement).value)}/></label>`)}
      </div>
      <details>
        <summary>More arguments and generation defaults</summary>
        <label>Extra loader arguments (JSON) — anything text-generation-webui's <code>--help</code> lists, by its argument name
          <textarea class="field" rows="3" placeholder='{"rope_freq_base": 1000000, "numa": true}' .value=${this.loadExtra} ?disabled=${this.modelBusy}
            @change=${(event:Event) => (this.loadExtra = (event.target as HTMLTextAreaElement).value)}></textarea></label>
        <label>Generation defaults applied at load (JSON) — <code>truncation_length</code>, <code>instruction_template</code>, <code>custom_stopping_strings</code>…
          <textarea class="field" rows="3" placeholder='{"instruction_template": "ChatML"}' .value=${this.loadSettings} ?disabled=${this.modelBusy}
            @change=${(event:Event) => (this.loadSettings = (event.target as HTMLTextAreaElement).value)}></textarea></label>
      </details>
      <div class="empty">Names that moved between releases (<code>n_ctx</code>/<code>ctx_size</code>, <code>n_gpu_layers</code>/<code>gpu_layers</code>) are sent both ways; the backend keeps the one it knows. Settings are remembered per model once a load succeeds.</div>
    </details>`;
  }

  /** The LoRAs installed beside the models, ticked to apply on top of the loaded one. */
  private renderLoras() {
    if (!this.backend?.supported) return nothing;
    if (this.backend.lorasError) return html`<div class="empty">LoRAs: ${this.backend.lorasError}</div>`;
    const loras = this.backend.loras;
    if (!loras || !loras.available.length) return nothing;
    const loaded = new Set(loras.loaded);
    const picked = new Set(this.loraPicks);
    const changed = loras.available.some((name) => loaded.has(name) !== picked.has(name));
    return html`<label>LoRAs<span class="hint">${loras.loaded.length ? `${loras.loaded.length} applied` : "none applied"}</span>
      <div class="lora-list">${loras.available.map((name) => html`<label class="inline-check"><input type="checkbox" .checked=${picked.has(name)} ?disabled=${this.modelBusy}
        @change=${(event:Event) => { const on = (event.target as HTMLInputElement).checked; this.loraPicks = on ? [...new Set([...this.loraPicks, name])] : this.loraPicks.filter((n) => n !== name); }}/>${name}${loaded.has(name) ? html`<span class="hint">applied</span>` : nothing}</label>`)}</div>
    </label>
    <div class="panel-actions">
      <button class="secondary" ?disabled=${this.modelBusy || !changed} @click=${() => void this.applyLoras()}>${this.loraPicks.length ? "Apply LoRAs" : "Clear LoRAs"}</button>
    </div>`;
  }

  /**
   * The delete confirmation.
   *
   * It shows what is on disk rather than asking "are you sure": the name, the resolved
   * path, every file, and the size against the free space. A model is gigabytes fetched
   * over someone's connection, and "are you sure" is not a question anyone can answer
   * without those.
   *
   * Typing the name is the confirmation, and it is what the server requires too. A
   * checkbox or an OK button is satisfied by a mis-click and by a replayed request; the
   * name proves which model was on screen.
   */
  private renderDeleteModel(target: ChatModelInspection) {
    const matches = this.deleteConfirm.trim() === target.name;
    return html`
      <div class="model-delete">
        <strong>Delete ${target.name}?</strong>
        ${target.loaded
          ? html`<div class="empty error">
              This model is loaded right now. Unload it first — deleting the weights under
              a running model leaves the backend serving something whose files are gone.
            </div>`
          : nothing}
        <div class="model-delete-facts">
          <div><span>Path</span><code>${target.path}</code></div>
          <div><span>Frees</span>${formatBytes(target.bytes)}${target.freeBytes ? ` · ${formatBytes(target.freeBytes)} free now` : ""}</div>
          <div><span>Files</span>${target.files.length}${target.split ? " · a split model, every shard goes together" : ""}</div>
        </div>
        <details>
          <summary>Show the ${target.files.length} file${target.files.length === 1 ? "" : "s"}</summary>
          <ul class="model-delete-files">${target.files.map((f) => html`<li>${f}</li>`)}</ul>
        </details>
        <label>Type <code>${target.name}</code> to confirm
          <input class="field" .value=${this.deleteConfirm} ?disabled=${this.modelBusy}
            @input=${(e: Event) => (this.deleteConfirm = (e.target as HTMLInputElement).value)} />
        </label>
        <label class="inline-check">
          <input type="checkbox" .checked=${this.deletePermanent}
            @change=${(e: Event) => (this.deletePermanent = (e.target as HTMLInputElement).checked)} />
          Delete permanently instead of moving it to
          <code>${target.trashPath}</code>
        </label>
        <div class="panel-actions">
          <button class="secondary" @click=${this.cancelDeleteModel}>Cancel</button>
          <button class="danger" ?disabled=${!matches || target.loaded || this.modelBusy}
            @click=${() => void this.confirmDeleteModel()}>
            ${this.modelBusy ? "Deleting…" : this.deletePermanent ? "Delete permanently" : "Move to trash"}
          </button>
        </div>
      </div>
    `;
  }

  /** Reads what the delete would remove, before asking for it. */
  private async inspectModel() {
    const target = this.modelChoice || this.models?.models[0];
    if (!target) return;
    this.deleteError = "";
    this.deleteConfirm = "";
    this.deletePermanent = false;
    try {
      this.deleteTarget = await api.inspectChatModel(target);
    } catch (error) {
      this.deleteError = (error as Error).message;
    }
  }

  private cancelDeleteModel = () => {
    this.deleteTarget = null;
    this.deleteConfirm = "";
    this.deleteError = "";
  };

  private async confirmDeleteModel() {
    const target = this.deleteTarget;
    if (!target || this.modelBusy) return;
    this.modelBusy = true;
    this.deleteError = "";
    try {
      const res = await api.deleteChatModel(target.name, this.deleteConfirm.trim(), this.deletePermanent);
      // The response carries the refreshed list, so the panel is correct without a
      // second round trip — and the selection is cleared, since it may name what just went.
      if (this.models) this.models = { ...this.models, models: res.models };
      this.modelChoice = "";
      this.deleteTarget = null;
      this.deleteConfirm = "";
      this.say(
        res.movedTo
          ? `${res.name} moved to the trash — ${formatBytes(res.bytes)} recoverable at ${res.movedTo}.`
          : `${res.name} deleted permanently — ${formatBytes(res.bytes)} freed.`,
      );
    } catch (error) {
      this.deleteError = (error as Error).message;
    } finally {
      this.modelBusy = false;
    }
  }

  /**
   * Puts the last generation's settings on the clipboard as one line.
   *
   * The brief asks for the selected values to be copyable, and the server already renders
   * them as a fixed-order key=value summary for its own log — so this hands over exactly
   * what the log records, which is what makes a bug report and a log line comparable.
   */
  private async copySampling() {
    const summary = this.lastSampling?.summary;
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary);
      this.say("Generation settings copied.");
    } catch {
      // Clipboard access is refused outright in some mobile browsers and over plain HTTP.
      this.say(summary, true);
    }
  }

  /** Copies this conversation's sampler settings to the workspace seed for new chats. */
  private saveOptionsGlobally(conversation: ChatConversation) {
    this.workspace.defaults = { ...(conversation.options ?? defaultOptions()) };
    this.touchWorkspace();
    void this.saveWorkspace();
    this.say("Saved as the default for new conversations.");
  }

  private renderModelPanel(conversation: ChatConversation, character: ChatCharacter) {
    // A slider with no override set shows what the *server* last chose for this kind of
    // turn, not a hardcoded default — so the panel reads as "here is what it used" until
    // you drag one, at which point that key becomes yours and beats the tuner.
    const auto = (key:string, fallback:number) => optionNumber(this.lastSampling?.values, key, fallback);
    const range = (label:string,key:string,min:number,max:number,step:number,fallback:number) => {
      const value = optionNumber(conversation.options,key,auto(key,fallback));
      const overridden = conversation.options?.[key] != null;
      return html`<label>${label}${overridden ? nothing : html`<span class="hint">auto</span>`}<span class="range"><input type="range" min=${min} max=${max} step=${step} .value=${String(value)} @input=${(event:Event) => this.updateOption(key,Number((event.target as HTMLInputElement).value))}/><output>${value}</output></span></label>`;
    };
    const hasGlobal = !!this.workspace.defaults;
    return html`<div class="panel">
      <section class="group">
        <h3>Backend</h3>
        ${this.renderModelControls()}
      </section>

      <section class="group">
        <h3>Generation<span>Tuned automatically for each kind of turn. Anything you set here overrides that for this conversation.</span></h3>
        <div class="grid">
          ${range("Temperature","temperature",0,2,.05,.85)}${range("Top P","top_p",.05,1,.05,.92)}
          ${range("Repetition penalty","repetition_penalty",1,2,.05,1.1)}${range("Max reply tokens","max_tokens",64,1536,32,512)}
          ${range("Min P","min_p",0,.5,.01,.05)}${range("Top K","top_k",0,200,1,40)}
        </div>
        ${this.status?.modelManagement ? html`<details class="samplers">
          <summary>All text-generation-webui samplers<span class="hint">${Object.keys(conversation.options ?? {}).length ? `${Object.keys(conversation.options ?? {}).length} set` : "auto"}</span></summary>
          <div class="grid">
            ${range("Typical P","typical_p",0,1,.05,1)}${range("Repetition range","repetition_penalty_range",0,4096,128,1024)}
            ${range("Presence penalty","presence_penalty",-2,2,.05,0)}${range("Frequency penalty","frequency_penalty",-2,2,.05,0)}
            ${range("Smoothing factor","smoothing_factor",0,5,.05,0)}${range("No-repeat n-gram","no_repeat_ngram_size",0,20,1,0)}
            ${range("DRY multiplier","dry_multiplier",0,5,.05,0)}${range("DRY base","dry_base",1,4,.05,1.75)}${range("DRY allowed length","dry_allowed_length",1,20,1,2)}
            ${range("XTC threshold","xtc_threshold",0,.5,.01,.1)}${range("XTC probability","xtc_probability",0,1,.05,0)}
            ${range("Mirostat mode","mirostat_mode",0,2,1,0)}${range("Mirostat tau","mirostat_tau",0,10,.1,5)}${range("Mirostat eta","mirostat_eta",0,1,.01,.1)}
            ${range("Dynatemp low","dynatemp_low",0,2,.05,1)}${range("Dynatemp high","dynatemp_high",0,2,.05,1)}${range("Dynatemp exponent","dynatemp_exponent",0,5,.05,1)}
            ${range("Seed (-1 random)","seed",-1,99999,1,-1)}
          </div>
          <div class="grid">
            ${(["dynamic_temperature", "temperature_last", "do_sample", "ban_eos_token", "add_bos_token", "skip_special_tokens", "auto_max_new_tokens"] as const).map((key) => html`<label class="inline-check">
              <input type="checkbox" .checked=${conversation.options?.[key] === true} .indeterminate=${conversation.options?.[key] == null}
                @change=${(event:Event) => this.updateOptionValue(key, (event.target as HTMLInputElement).checked)}/>${key.replace(/_/g, " ")}${conversation.options?.[key] == null ? html`<span class="hint">auto</span>` : nothing}</label>`)}
          </div>
          <label>Grammar (GBNF)<textarea class="field" rows="2" .value=${String(conversation.options?.grammar_string ?? "")} @change=${(event:Event) => this.updateOptionValue("grammar_string", (event.target as HTMLTextAreaElement).value || undefined)}></textarea></label>
          <label>Custom stop strings (one per line)<textarea class="field" rows="2" .value=${Array.isArray(conversation.options?.stop) ? (conversation.options!.stop as string[]).join("\n") : ""} @change=${(event:Event) => { const lines = (event.target as HTMLTextAreaElement).value.split("\n").map((l) => l.trim()).filter(Boolean); this.updateOptionValue("stop", lines.length ? lines : undefined); }}></textarea></label>
          <div class="panel-actions">
            <button class="secondary" ?disabled=${!this.status?.enabled} @click=${() => void this.stopGeneration()}>Stop generating now</button>
            <button class="secondary" @click=${() => void this.measureCard(character)}>Measure the card</button>
            ${this.cardTokens ? html`<span class="empty">Card: ${this.cardTokens.tokens.toLocaleString()} tokens${this.cardTokens.exact ? "" : " (estimated)"}${this.status?.contextLimit ? ` of ${this.status.contextLimit.toLocaleString()}` : ""}</span>` : nothing}
          </div>
        </details>` : nothing}
        ${this.lastSampling ? html`<div class="sampling">
          <span>Last reply sampled as <strong>${this.lastSampling.task}</strong>${this.lastSampling.overridden?.length ? html` — you overrode ${this.lastSampling.overridden.join(", ")}` : nothing}</span>
          <button class="secondary" @click=${() => void this.copySampling()}>Copy settings</button>
        </div>` : nothing}
        ${this.lastPhoto?.source ? html`<div class="sampling">
          <span>Last picture chosen <strong>${describePhotoSource(this.lastPhoto.source)}</strong> — fit ${this.lastPhoto.fit} of ${this.lastPhoto.candidates} candidate${this.lastPhoto.candidates === 1 ? "" : "s"}${this.lastPhoto.tags?.length ? html`; it shows ${this.lastPhoto.tags.slice(0, 6).join(", ")}` : nothing}</span>
        </div>` : nothing}
        <details>
          <summary>Advanced API options</summary>
          <textarea class="field" rows="5" .value=${JSON.stringify(conversation.options ?? {}, null, 2)} @change=${(event:Event) => { try { const parsed=JSON.parse((event.target as HTMLTextAreaElement).value) as ChatOptions; this.updateConversation({options:parsed}); } catch { this.say("Advanced options must be valid JSON.",true); } }}></textarea>
        </details>
        <div class="panel-actions">
          <button class="primary" @click=${() => void this.saveWorkspace()}>Save for this chat</button>
          <button class="secondary" @click=${() => this.saveOptionsGlobally(conversation)}>Save as global default</button>
          <button class="secondary" @click=${() => { conversation.options = { ...(this.workspace.defaults ?? defaultOptions()) }; this.touchWorkspace(); }}>Reset${hasGlobal ? " to global" : ""}</button>
        </div>
      </section>

      ${character.id === "libby" ? html`<section class="group">
        <h3>Her mood<span>Libby chooses her own tone, emotion, and intensity from the conversation. There is no user preset.</span></h3>
      </section>` : html`<section class="group">
        <h3>This conversation<span>Mood and pacing for the current chat only.</span></h3>
        <div class="grid">
          <label>Conversation mode<select .value=${conversation.mode} @change=${(event:Event) => this.updateConversation({mode:(event.target as HTMLSelectElement).value})}>${MODES.map((mode) => html`<option value=${mode.id}>${mode.label}</option>`)}</select></label>
          <label>Displayed emotion<select .value=${conversation.emotion} @change=${(event:Event) => this.updateConversation({emotion:(event.target as HTMLSelectElement).value})}>${LIBBY_EMOTIONS.map((emotion) => html`<option value=${emotion}>${EMOTION_LABELS[emotion]}</option>`)}</select></label>
        </div>
        <label>Intensity <span class="range"><input type="range" min="1" max="5" step="1" .value=${String(conversation.intensity)} @input=${(event:Event) => this.updateConversation({intensity:Number((event.target as HTMLInputElement).value)})}/><output>${conversation.intensity}/5</output></span></label>
      </section>`}
    </div>`;
  }

  private renderImagesPanel(character: ChatCharacter) {
    const images = this.workspace.images.filter((image) => image.characterId === character.id);
    // Two shelves. Only pictures of her are ever sent as selfies; photos shared in chat
    // of other people and things sit on the second shelf, where she knows them as what
    // they are. The scanner files each upload; either shelf can be corrected by hand.
    const hers = images.filter((image) => image.subject !== "other");
    const others = images.filter((image) => image.subject === "other");
    return html`<div class="panel">
      <p class="empty">Images are scanned locally. ${character.name} may attach one when its tags match the current exchange. Your own profile picture is set under Profile and is kept separate from these.</p>
      <div class="upload-row">
        <label>Extra matching tags<input class="field" placeholder="beach, happy, bedroom" .value=${this.imageTags} @input=${(event:Event) => (this.imageTags=(event.target as HTMLInputElement).value)}/></label>
        <label>Who it shows<select class="field" aria-label="Who the uploaded picture shows" .value=${this.imageSubject} @change=${(event:Event) => (this.imageSubject=(event.target as HTMLSelectElement).value)}>
          <option value="self" ?selected=${this.imageSubject === "self"}>${character.name}</option>
          <option value="other" ?selected=${this.imageSubject === "other"}>Someone or something else</option>
          <option value="" ?selected=${this.imageSubject === ""}>Let the scanner decide</option>
        </select></label>
        <span class="file-btn">Upload and scan<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" @change=${this.uploadImage}/></span>
      </div>
      <h3 class="shelf">Pictures of ${character.name}<span>What she can send as a selfie.</span></h3>
      <div class="image-grid">${hers.map((image) => this.renderImageCard(character, image))}</div>
      ${hers.length ? nothing : html`<div class="empty">No pictures of ${character.name} yet.</div>`}
      ${others.length ? html`
        <h3 class="shelf">Someone or something else<span>Photos shared with her. She remembers these but never sends them as herself. Wrong shelf? Tap “That's her”.</span></h3>
        <div class="image-grid">${others.map((image) => this.renderImageCard(character, image))}</div>` : nothing}
      ${character.id === "libby" ? this.renderWeightsPanel(hers) : nothing}
    </div>`;
  }

  private renderImageCard(character: ChatCharacter, image: ChatImage) {
    const hers = image.subject !== "other";
    return html`<article class="image-card">
      <img src=${api.chatImageURL(image.id)} alt=${image.name}/>
      <button class="remove" title="Delete ${image.name}" aria-label="Delete ${image.name}" @click=${() => void this.deleteImage(image)}>×</button>
      <div class="card-body">
        <span class="card-name">${image.name}</span>
        <span class="card-tags">${image.tags.join(", ") || "No tags"}</span>
        ${hers ? html`<label class="weight">Sends<select aria-label=${`How often to send ${image.name}`} .value=${String(image.weight || 1)} @change=${(event:Event) => this.setImageWeight(image, Number((event.target as HTMLSelectElement).value))}>
          ${SEND_WEIGHTS.map((w) => html`<option value=${String(w.value)} ?selected=${(image.weight || 1) === w.value}>${w.label}</option>`)}
        </select></label>` : nothing}
        <button title=${hers ? `Move ${image.name} to the other shelf: not a picture of ${character.name}` : `Move ${image.name} to her shelf: this is ${character.name}`}
          @click=${() => this.setImageSubject(image, hers ? "other" : "self")}>${hers ? "Not her" : "That's her"}</button>
        ${hers ? (character.avatarImageId === image.id
          ? html`<span class="badge">Avatar</span>`
          : html`<button @click=${() => this.updateCharacter("avatarImageId", image.id)}>Use as avatar</button>`) : nothing}
      </div>
    </article>`;
  }

  /** Moves a picture between the two shelves. The user's word beats the scanner's,
      and the server keeps it that way across saves. */
  private setImageSubject(image: ChatImage, subject: "self" | "other") {
    const live = this.workspace.images.find((it) => it.id === image.id);
    if (!live) return;
    live.subject = subject;
    this.touchWorkspace();
  }

  /** Sets how readily she reaches for one gallery picture. Normal is stored as
      absent, so a workspace that never touched this looks exactly as it did. */
  private setImageWeight(image: ChatImage, weight: number) {
    const live = this.workspace.images.find((it) => it.id === image.id);
    if (!live) return;
    if (weight === 1) delete live.weight; else live.weight = weight;
    this.touchWorkspace();
  }

  /** The tag weights: more of this, less of that, none of the other — for everything
      she sends or hands over that carries the tag, pictures and library items alike. */
  private renderWeightsPanel(images: ChatImage[]) {
    const weights = this.workspace.sendWeights ?? {};
    const tags = Object.keys(weights).sort();
    // The tags her pictures actually carry, offered as one-tap suggestions.
    const seen = new Map<string, number>();
    for (const image of images) for (const tag of image.tags) seen.set(tag.toLowerCase(), (seen.get(tag.toLowerCase()) ?? 0) + 1);
    const suggestions = [...seen.entries()].filter(([tag]) => !(tag in weights)).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([tag]) => tag);
    return html`<section class="group weights">
      <h3>What she reaches for<span>Weight a tag and it applies to every picture and library item carrying it — more of this, less of that, none of the other. It steers her choice; it never overrides what you actually asked for.</span></h3>
      ${tags.length ? html`<div class="weight-rows">${tags.map((tag) => html`<div class="weight-row">
        <span class="weight-tag">${tag}</span>
        <select aria-label=${`Weight for ${tag}`} @change=${(event:Event) => this.setTagWeight(tag, Number((event.target as HTMLSelectElement).value))}>
          ${SEND_WEIGHTS.map((w) => html`<option value=${String(w.value)} ?selected=${weightOf(weights[tag]) === w.value}>${w.label}</option>`)}
        </select>
        <button type="button" class="icon-btn" title=${`Forget the weight for ${tag}`} aria-label=${`Forget the weight for ${tag}`} @click=${() => this.setTagWeight(tag, 1)}><span class="material-symbols-rounded" style="font-size:18px">close</span></button>
      </div>`)}</div>` : html`<div class="empty">No tag weights yet. Everything is at normal odds.</div>`}
      <form class="weight-add" @submit=${(event:Event) => { event.preventDefault(); this.addTagWeight(this.weightTagDraft, 2.5); }}>
        <input class="field" placeholder="tag, e.g. lingerie" .value=${this.weightTagDraft} @input=${(event:Event) => (this.weightTagDraft = (event.target as HTMLInputElement).value)}/>
        <button type="button" class="secondary" ?disabled=${!this.weightTagDraft.trim()} @click=${() => this.addTagWeight(this.weightTagDraft, 2.5)}>More</button>
        <button type="button" class="secondary" ?disabled=${!this.weightTagDraft.trim()} @click=${() => this.addTagWeight(this.weightTagDraft, 0.35)}>Less</button>
        <button type="button" class="secondary" ?disabled=${!this.weightTagDraft.trim()} @click=${() => this.addTagWeight(this.weightTagDraft, -1)}>Never</button>
      </form>
      ${suggestions.length ? html`<div class="weight-suggest">${suggestions.map((tag) => html`<button type="button" class="chip" title=${`Weight ${tag}`} @click=${() => { this.weightTagDraft = tag; }}>${tag}</button>`)}</div>` : nothing}
    </section>`;
  }

  private addTagWeight(tag: string, weight: number) {
    const key = tag.trim().toLowerCase().replace(/\s+/g, " ");
    if (!key) return;
    this.setTagWeight(key, weight);
    this.weightTagDraft = "";
  }

  private setTagWeight(tag: string, weight: number) {
    const weights = { ...(this.workspace.sendWeights ?? {}) };
    if (weight === 1) delete weights[tag]; else weights[tag] = weight;
    this.workspace.sendWeights = Object.keys(weights).length ? weights : undefined;
    this.touchWorkspace();
  }

  private renderProfilePanel() {
    const profile = this.workspace.profile, me = profile.displayName || this.user?.username || "You";
    return html`<div class="panel"><p class="empty">This profile is shared by WebUI and APK and is included in character context.</p>
      <div class="pfp-row">
        <span class="pfp">${profile.avatarImageId
          ? html`<img src=${api.chatImageURL(profile.avatarImageId)} alt="Your profile picture"/>`
          : html`<span class="pfp-initial">${me.slice(0,2).toUpperCase()}</span>`}</span>
        <div class="pfp-actions">
          <strong>Profile picture</strong>
          <span class="empty">Yours alone — it is never offered as a character image or attached to a reply.</span>
          <div class="panel-actions">
            <span class="file-btn">${profile.avatarImageId ? "Replace picture" : "Upload picture"}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" @change=${this.uploadProfilePicture}/></span>
            ${profile.avatarImageId ? html`<button class="danger" @click=${() => void this.removeProfilePicture()}>Remove</button>` : nothing}
          </div>
        </div>
      </div>
      <label>Display name<input class="field" .value=${profile.displayName}
        @change=${(event:Event) => this.editProfile({ displayName: (event.target as HTMLInputElement).value })}/></label>
      <label>Pronouns or how to address you <span class="empty">— optional; left blank, nothing is assumed</span>
        <input class="field" placeholder="she/her · “sir” · just my name" .value=${profile.address ?? ""}
          @change=${(event:Event) => this.editProfile({ address: (event.target as HTMLInputElement).value })}/></label>
      <label>Your persona<textarea class="field" rows="4" placeholder="How friends should know and address you…" .value=${profile.persona}
        @change=${(event:Event) => this.editProfile({ persona: (event.target as HTMLTextAreaElement).value })}></textarea></label>

      <label>Content boundaries <span class="empty">— treated as hard rules, above any character card</span>
        <textarea class="field" rows="3" placeholder="Nothing involving… · don't bring up…" .value=${profile.boundaries ?? ""}
          @change=${(event:Event) => this.editProfile({ boundaries: (event.target as HTMLTextAreaElement).value })}></textarea></label>
      <label>How you like to be talked to
        <textarea class="field" rows="2" placeholder="Short replies · don't ask lots of questions · take the lead" .value=${profile.communication ?? ""}
          @change=${(event:Event) => this.editProfile({ communication: (event.target as HTMLTextAreaElement).value })}></textarea></label>
      <div class="grid">
        <label>Interests
          <textarea class="field" rows="3" placeholder="Horror films, mechanical keyboards, cooking…" .value=${profile.interests ?? ""}
            @change=${(event:Event) => this.editProfile({ interests: (event.target as HTMLTextAreaElement).value })}></textarea></label>
        <label>Preferences
          <textarea class="field" rows="3" placeholder="Subs over dubs, physical media, no spoilers…" .value=${profile.preferences ?? ""}
            @change=${(event:Event) => this.editProfile({ preferences: (event.target as HTMLTextAreaElement).value })}></textarea></label>
      </div>

      <label class="inline-check">
        <input type="checkbox" .checked=${profile.memoryConsent !== false}
          @change=${(event:Event) => this.editProfile({ memoryConsent: (event.target as HTMLInputElement).checked })}/>
        <span>
          Libby may remember things about me
          <span class="empty">
            — off, she stops keeping notes entirely and isn't asked to. What she already
            remembers stays until you clear it below.
          </span>
        </span>
      </label>

      <div class="panel-actions"><button class="primary" @click=${() => void this.saveWorkspace()}>Save profile</button></div>
      <p class="empty">
        Everything above is what <strong>you</strong> said. What Libby worked out on her
        own is kept separately, below, and labelled as hers — you can correct or delete
        any of it, and nothing there ever changes this.
      </p>
      ${this.renderBondPanel()}
      ${this.renderMemoryPanel()}
      ${this.renderWantsPanel()}
      ${this.renderIdentityPanel()}
      ${this.renderAutoPanel()}
      ${this.renderDiscordPanel()}</div>`;
  }

  /**
   * Applies a profile edit.
   *
   * This exists because the old handlers mutated the profile object captured by the
   * render closure, and that is the same hazard liveConversation documents: saveWorkspace
   * replaces this.workspace wholesale with the server's response, so a profile reference
   * taken before the 450ms autosave fired is orphaned. Writing into it still "succeeds"
   * while nothing renders or persists it — so editing one field, then another after the
   * autosave landed, silently lost the second. Reading this.workspace.profile fresh and
   * reassigning it is the fix.
   *
   * touchWorkspace deliberately does not copy `profile` when it clones, which is why the
   * new object is built here rather than relying on it.
   */
  private editProfile(patch: Partial<ChatProfile>) {
    this.workspace = { ...this.workspace, profile: { ...this.workspace.profile, ...patch } };
    this.touchWorkspace();
  }

  /** Guards the lazy load of her messaging policy from firing on every re-render. */
  private autoStateLoading = false;

  private async loadAutoState() {
    if (this.autoStateLoading) return;
    this.autoStateLoading = true;
    try { this.autoState = await api.libbyAuto(); }
    catch { this.autoState = undefined; }
    finally { this.autoStateLoading = false; }
  }

  private async saveAutoSettings(patch: Partial<LibbyAutoSettings>) {
    const current = this.autoState?.settings;
    if (!current) return;
    try {
      await api.saveLibbyAuto({ ...current, ...patch });
      // Refetched rather than patched locally: saving clears a stale back-off and the panel's
      // "why she is quiet" line is computed server-side, so a local merge would show the old
      // reason beside the new setting.
      await this.loadAutoState();
    } catch (error) { this.say(error instanceof Error ? error.message : "Couldn't save that.", true); }
  }

  /**
   * When Libby is allowed to start a conversation, and the record of when she has.
   *
   * The log is the part that earns its place: "she keeps messaging me" and "she never messages
   * me" are both complaints about invisible policy, and this makes both answerable — what
   * fired, when, whether it was important, and whether it was ever answered.
   */
  private renderAutoPanel() {
    if (this.autoState === null) { void this.loadAutoState(); }
    const state = this.autoState;
    if (!state) {
      return html`<div class="mem-panel"><strong>When Libby messages first</strong>
        <p class="empty">${this.autoState === null ? "Loading…" : "This server doesn't support messaging controls yet."}</p></div>`;
    }
    const settings = state.settings;
    const hours = Array.from({ length: 24 }, (_, hour) => hour);
    return html`<div class="mem-panel">
      <strong>When Libby messages first</strong>
      <p class="empty">She'll start a conversation on her own now and then. These are the limits on that: she stops after ${casualUnansweredNote} unanswered messages, waits out your quiet hours, and never replies to herself.</p>
      <label class="mem-toggle">
        <input type="checkbox" .checked=${settings.enabled} @change=${(event: Event) => void this.saveAutoSettings({ enabled: (event.target as HTMLInputElement).checked })}/>
        <span>Let her message me first</span>
      </label>
      ${settings.enabled ? html`
        <div class="grid">
          <label>Quiet from
            <select class="field" .value=${String(settings.quietFrom)} @change=${(event: Event) => void this.saveAutoSettings({ quietFrom: Number((event.target as HTMLSelectElement).value) })}>
              ${hours.map((hour) => html`<option value=${hour} ?selected=${hour === settings.quietFrom}>${String(hour).padStart(2, "0")}:00</option>`)}
            </select>
          </label>
          <label>Quiet until
            <select class="field" .value=${String(settings.quietTo)} @change=${(event: Event) => void this.saveAutoSettings({ quietTo: Number((event.target as HTMLSelectElement).value) })}>
              ${hours.map((hour) => html`<option value=${hour} ?selected=${hour === settings.quietTo}>${String(hour).padStart(2, "0")}:00</option>`)}
            </select>
          </label>
          <label>At least this far apart
            <select class="field" .value=${String(settings.minGapMinutes)} @change=${(event: Event) => void this.saveAutoSettings({ minGapMinutes: Number((event.target as HTMLSelectElement).value) })}>
              ${[20, 30, 60, 120, 240, 480].map((mins) => html`<option value=${mins} ?selected=${mins === settings.minGapMinutes}>${mins < 60 ? `${mins} minutes` : `${mins / 60} hour${mins === 60 ? "" : "s"}`}</option>`)}
            </select>
          </label>
          <label>Most per day
            <select class="field" .value=${String(settings.maxPerDay)} @change=${(event: Event) => void this.saveAutoSettings({ maxPerDay: Number((event.target as HTMLSelectElement).value) })}>
              ${[0, 2, 4, 6, 10, 20].map((count) => html`<option value=${count} ?selected=${count === settings.maxPerDay}>${count === 0 ? "No limit" : count}</option>`)}
            </select>
          </label>
        </div>
        <label class="mem-toggle">
          <input type="checkbox" .checked=${settings.allowImportant} @change=${(event: Event) => void this.saveAutoSettings({ allowImportant: (event.target as HTMLInputElement).checked })}/>
          <span>Let something genuinely worth saying through anyway</span>
        </label>
        <p class="empty"><strong>Right now:</strong> ${state.idle.reason}</p>
      ` : nothing}
      ${state.log.length ? html`
        <details>
          <summary>Why she messaged (${state.log.length})</summary>
          <ul class="mem-list">${[...state.log].reverse().map((event) => html`
            <li><span>
              ${event.detail || event.trigger}
              <span class="mem-tags">
                <em class="mem-kind">${event.trigger}</em>
                ${event.importance >= 2 ? html`<em class="mem-kind mine">important</em>` : nothing}
                ${event.answered ? nothing : html`<em class="mem-kind unsure">no reply</em>`}
              </span>
            </span><span class="empty">${timeAgo(event.at)}</span></li>`)}</ul>
        </details>` : nothing}
    </div>`;
  }

  /** Where the two of you stand — the last time you talked, the mood she carries, how
      close you've grown, the name she calls you — with a reset that starts her fresh.
      Read-only summary: it is written from her own turns, not edited here. Libby's alone,
      lazily loaded like the memory and wants panels. */
  private renderBondPanel() {
    if (this.bond === null && !this.bondLoading) { void this.loadBond(); }
    const bond = this.bond;
    const has = !!bond && bond.lastSeenAt > 0;
    return html`<div class="mem-panel">
      <strong>Where you stand with Libby</strong>
      <p class="empty">Libby carries a sense of the two of you between chats — how long it's been, the mood she left off in, and how close you've grown. Reset it to start fresh; your memories and her wants are kept.</p>
      ${this.bond === null && this.bondLoading
        ? html`<p class="empty">Loading…</p>`
        : !has
          ? html`<p class="empty">Nothing yet. This fills in as you talk.</p>`
          : html`<ul class="mem-list">
              <li><span>Last talked ${timeAgo(bond!.lastSeenAt)}</span></li>
              ${bond!.mood ? html`<li><span>She left off feeling ${bond!.mood}</span></li>` : nothing}
              <li><span>${closenessLabel(bond!.warmth)}</span></li>
              ${bond!.petname ? html`<li><span>She calls you “${bond!.petname}”</span></li>` : nothing}
            </ul>`}
      ${has ? html`<div class="panel-actions"><button class="danger" @click=${() => void this.resetBond()}>Start fresh</button></div>` : nothing}
    </div>`;
  }

  /** What Libby has learned about you across conversations, with the controls to prune
      or wipe it. Loaded lazily the first time the profile tab renders. Only Libby keeps
      a memory, so this belongs to the shared profile she reads. */
  private renderMemoryPanel() {
    if (this.memories === null) { void this.loadMemories(); }
    const memories = this.memories ?? [];
    // Strongest first, as the server ordered them, so what she leans on most is at the top
    // and what is on its way to being forgotten is at the bottom.
    return html`<div class="mem-panel">
      <strong>What Libby remembers</strong>
      <p class="empty">Libby quietly keeps things you tell her and carries them into later chats. Correct anything she got wrong, pin what she must never forget, or add something she hasn't picked up on.${this.memoryLimit ? html` She holds up to ${this.memoryLimit}; past that the least important fade, but pinned notes and boundaries never do.` : nothing}</p>
      ${this.memories === null
        ? html`<p class="empty">Loading…</p>`
        : memories.length === 0
          ? html`<p class="empty">Nothing yet. She'll start remembering as you talk.</p>`
          : html`<ul class="mem-list">${memories.map((memory) => this.renderMemory(memory))}</ul>`}
      <div class="mem-add">
        <input class="field" placeholder="Tell her something to remember…" .value=${this.memoryDraft}
          @input=${(event: Event) => (this.memoryDraft = (event.target as HTMLInputElement).value)}
          @keydown=${(event: KeyboardEvent) => { if (event.key === "Enter") { event.preventDefault(); void this.addMemory(); } }}/>
        <button class="secondary" ?disabled=${this.memoryDraft.trim().length < 8} @click=${() => void this.addMemory()}>Remember</button>
      </div>
      ${memories.length > 0 ? html`<div class="panel-actions"><button class="danger" @click=${() => void this.clearMemories()}>Clear all memories</button></div>` : nothing}
    </div>`;
  }

  /**
   * One memory: its text, what sort of thing it is, and the controls over it.
   *
   * Editing is in place rather than in a dialog. The whole point of the panel is that a
   * memory she got slightly wrong is quick to fix — a modal per correction is enough friction
   * that the user leaves the wrong version there, which is how she stays wrong about someone.
   */
  private renderMemory(memory: LibbyMemory) {
    const editing = this.editingMemory === memory.id;
    if (editing) {
      return html`<li class="mem-editing">
        <input class="field" .value=${this.memoryDraftEdit}
          @input=${(event: Event) => (this.memoryDraftEdit = (event.target as HTMLInputElement).value)}
          @keydown=${(event: KeyboardEvent) => {
            if (event.key === "Enter") { event.preventDefault(); void this.saveMemoryEdit(memory); }
            if (event.key === "Escape") { this.editingMemory = null; }
          }}/>
        <select class="field" .value=${memory.kind ?? "user"}
          @change=${(event: Event) => (this.memoryKindEdit = (event.target as HTMLSelectElement).value)}>
          ${(this.memoryKinds.length ? this.memoryKinds : [memory.kind ?? "user"]).map((kind) =>
            html`<option value=${kind} ?selected=${kind === (memory.kind ?? "user")}>${MEMORY_KIND_LABELS[kind] ?? kind}</option>`)}
        </select>
        <div class="panel-actions">
          <button class="primary" @click=${() => void this.saveMemoryEdit(memory)}>Save</button>
          <button class="secondary" @click=${() => (this.editingMemory = null)}>Cancel</button>
        </div>
      </li>`;
    }
    return html`<li>
      <span>
        ${memory.text}
        <span class="mem-tags">
          ${memory.kind ? html`<em class="mem-kind ${memory.kind}">${MEMORY_KIND_LABELS[memory.kind] ?? memory.kind}</em>` : nothing}
          ${memory.uncertain ? html`<em class="mem-kind unsure" title="She wrote this as a guess, so she'll offer it rather than assert it">unsure</em>` : nothing}
          ${memory.source === "user" ? html`<em class="mem-kind mine" title="You told her this, so she treats it as certain">yours</em>` : nothing}
          ${(memory.recalls ?? 0) > 0 ? html`<em class="mem-kind" title="She has learned this ${(memory.recalls ?? 0) + 1} times">×${(memory.recalls ?? 0) + 1}</em>` : nothing}
        </span>
      </span>
      <button class="mem-forget ${memory.pinned ? "pinned" : ""}" title=${memory.pinned ? "Let this fade normally" : "Never forget this"}
        aria-label=${memory.pinned ? `Unpin: ${memory.text}` : `Pin: ${memory.text}`}
        aria-pressed=${memory.pinned ? "true" : "false"}
        @click=${() => void this.togglePin(memory)}>
        <span class="material-symbols-rounded" style="font-size:16px">${memory.pinned ? "push_pin" : "keep"}</span>
      </button>
      <button class="mem-forget" title="Correct this" aria-label="Edit: ${memory.text}"
        @click=${() => { this.editingMemory = memory.id; this.memoryDraftEdit = memory.text; this.memoryKindEdit = memory.kind ?? ""; }}>
        <span class="material-symbols-rounded" style="font-size:16px">edit</span>
      </button>
      <button class="mem-forget" title="Forget this" aria-label="Forget: ${memory.text}" @click=${() => void this.forgetMemory(memory.id)}>
        <span class="material-symbols-rounded" style="font-size:16px">close</span>
      </button>
    </li>`;
  }

  /** Libby's own standing wants — outfits she'd like, media she wishes were here, how
      she wants a night to go — with the controls to prune or wipe them. Mirrors the
      memory panel: server-owned, lazily loaded, Libby's alone. */
  private renderWantsPanel() {
    if (this.wants === null) { void this.loadWants(); }
    const wants = this.wants ?? [];
    return html`<div class="mem-panel">
      <strong>What Libby wants</strong>
      <p class="empty">Libby has wants of her own — an outfit she'd like, something she wishes were on the shelves, how she wants a night to go — and she'll bring them up herself. This is what she's been wanting lately; drop any of it, or clear it all.</p>
      ${this.wants === null
        ? html`<p class="empty">Loading…</p>`
        : wants.length === 0
          ? html`<p class="empty">Nothing yet. She'll let you know when she's wanting something.</p>`
          : html`<ul class="mem-list">${wants.map((want) => html`
              <li><span>${want.text}</span>
                <button class="mem-forget" title="Drop this" aria-label="Drop: ${want.text}" @click=${() => void this.forgetWant(want.id)}><span class="material-symbols-rounded" style="font-size:16px">close</span></button>
              </li>`)}</ul>`}
      ${wants.length > 0 ? html`<div class="panel-actions"><button class="danger" @click=${() => void this.clearWants()}>Clear all wants</button></div>` : nothing}
    </div>`;
  }

  // --- Discord --------------------------------------------------------------

  /** Guards the lazy load of the Discord connection from firing on every re-render. */
  private discordLoading = false;

  private async loadDiscord() {
    if (this.discordLoading) return;
    this.discordLoading = true;
    try { this.discord = await api.discord(); }
    catch { this.discord = undefined; }
    finally { this.discordLoading = false; }
  }

  private async connectDiscord() {
    const token = this.discordToken.trim();
    if (!token) return;
    try {
      this.discord = await api.connectDiscord(token);
      // Cleared on success and on failure alike: a bot token should not sit in a form
      // field on screen once it has been handed over.
      this.discordToken = "";
      this.say(`Connected to Discord as ${this.discord.botName}.`);
    } catch (error) {
      this.discordToken = "";
      this.say(error instanceof Error ? error.message : "Couldn't connect to Discord.", true);
    }
  }

  private async disconnectDiscord() {
    try {
      const result = await api.disconnectDiscord();
      this.say(result.note);
      this.discordPlaces = null;
      await this.loadDiscord();
    } catch (error) { this.say(error instanceof Error ? error.message : "Couldn't disconnect.", true); }
  }

  private async saveDiscord(patch: Parameters<typeof api.saveDiscordSettings>[0]) {
    try { this.discord = await api.saveDiscordSettings(patch); }
    catch (error) { this.say(error instanceof Error ? error.message : "Couldn't save that.", true); }
  }

  private async loadDiscordPlaces() {
    try { this.discordPlaces = (await api.discordPlaces()).servers; }
    catch (error) { this.say(error instanceof Error ? error.message : "Couldn't ask Discord which servers it's in.", true); }
  }

  /** Adds or removes a channel from the allowlist, or changes one of its two grants. */
  private setDiscordChannel(place: DiscordPlace, channelId: string, name: string, patch: { read?: boolean; write?: boolean }) {
    const current = this.discord?.channels ?? [];
    const existing = current.find((channel) => channel.channelId === channelId);
    const next = { guildId: place.guildId, guildName: place.name, channelId, name, read: false, write: false, ...existing, ...patch };
    // A channel with neither grant is not on the list at all: leaving an entry that
    // permits nothing would make the allowlist read as longer than it is.
    const kept = current.filter((channel) => channel.channelId !== channelId);
    void this.saveDiscord({ channels: next.read || next.write ? [...kept, next] : kept });
  }

  private addDiscordUser() {
    const id = this.discordUserDraft.trim();
    if (!/^\d{5,24}$/.test(id)) { this.say("That doesn't look like a Discord user id — turn on Developer Mode in Discord and copy the id.", true); return; }
    this.discordUserDraft = "";
    void this.saveDiscord({ users: [...new Set([...(this.discord?.users ?? []), id])] });
  }

  /**
   * The Discord connection: the token, who may talk to her, where she may read and
   * post, and the record of what she actually did.
   *
   * The log is the part that earns its place, exactly as it does for her autonomous
   * messaging. "Why did she answer that" and "why didn't she" are both complaints
   * about invisible policy, and every refusal here names the rule that refused it.
   */
  private renderDiscordPanel() {
    if (this.discord === undefined && !this.discordLoading) { void this.loadDiscord(); }
    const state = this.discord;
    return html`<div class="mem-panel">
      <strong>Libby on Discord</strong>
      <p class="empty">An optional bot connection, so she can talk to you outside OppaiLib. She reads only the channels you list, posts only where you allow it, and answers only the people you name. Everything she does is logged below.</p>
      ${state === undefined ? html`<p class="empty">Loading…</p>` : html`
        <p class="empty"><strong>${state.note}</strong></p>
        ${!state.hasToken ? html`
          <p class="empty">Create an application at discord.com/developers, add a bot to it, and paste its token here. Invite it to your server with the fewest permissions that work: View Channel, Read Message History, and Send Messages.</p>
          <label>Bot token<input class="field" type="password" autocomplete="off" placeholder="Paste the bot token…" .value=${this.discordToken}
            @change=${(event:Event) => (this.discordToken = (event.target as HTMLInputElement).value)}/></label>
          <div class="panel-actions"><button class="primary" @click=${() => void this.connectDiscord()}>Connect</button></div>`
        : html`
          <label class="mem-toggle">
            <input type="checkbox" .checked=${state.enabled} @change=${(event:Event) => void this.saveDiscord({ enabled:(event.target as HTMLInputElement).checked })}/>
            <span>Let her read and post on Discord</span>
          </label>
          <div class="grid">
            <label>What she remembers from Discord
              <select class="field" .value=${state.memory} @change=${(event:Event) => void this.saveDiscord({ memory:(event.target as HTMLSelectElement).value })}>
                <option value="shared" ?selected=${state.memory === "shared"}>One memory — same her, both places</option>
                <option value="none" ?selected=${state.memory === "none"}>Keep Discord out of her memory</option>
              </select>
            </label>
            <label>Checks for new messages every
              <input class="field" type="number" min="10" max="600" .value=${String(state.pollSeconds)}
                @change=${(event:Event) => void this.saveDiscord({ pollSeconds:Number((event.target as HTMLInputElement).value) })}/>
            </label>
            <label>Most messages per channel per hour
              <input class="field" type="number" min="1" max="60" .value=${String(state.perHour)}
                @change=${(event:Event) => void this.saveDiscord({ perHour:Number((event.target as HTMLInputElement).value) })}/>
            </label>
          </div>

          <p class="empty">Who she'll answer. Nobody else gets a reply, even in a channel she's reading.</p>
          ${state.users.length === 0 ? html`<p class="empty">Nobody yet.</p>` : html`<ul class="mem-list">${state.users.map((id) => html`
            <li><span>${id}</span>
              <button class="mem-forget" title="Remove" aria-label="Remove ${id}" @click=${() => void this.saveDiscord({ users: state.users.filter((other) => other !== id) })}><span class="material-symbols-rounded" style="font-size:16px">close</span></button>
            </li>`)}</ul>`}
          <label>Add a Discord user id<input class="field" placeholder="e.g. 123456789012345678" .value=${this.discordUserDraft}
            @change=${(event:Event) => (this.discordUserDraft = (event.target as HTMLInputElement).value)}/></label>
          <div class="panel-actions"><button class="secondary" @click=${() => this.addDiscordUser()}>Add person</button></div>

          <p class="empty">Where she may read and post. Being in a server isn't permission to read it — every channel is off until you say otherwise.</p>
          ${this.discordPlaces === null
            ? html`<div class="panel-actions"><button class="secondary" @click=${() => void this.loadDiscordPlaces()}>Show her servers and channels</button></div>`
            : html`${this.discordPlaces.map((place) => html`
                <p class="empty"><strong>${place.name}</strong></p>
                ${place.channels.length === 0 ? html`<p class="empty">No channels it can see here — check the bot's permissions in that server.</p>` : html`
                  <ul class="mem-list">${place.channels.map((channel) => {
                    const entry = state.channels.find((allowed) => allowed.channelId === channel.channelId);
                    return html`<li><span>#${channel.name}</span>
                      <label class="mem-toggle"><input type="checkbox" .checked=${!!entry?.read} @change=${(event:Event) => this.setDiscordChannel(place, channel.channelId, channel.name, { read:(event.target as HTMLInputElement).checked })}/><span>read</span></label>
                      <label class="mem-toggle"><input type="checkbox" .checked=${!!entry?.write} @change=${(event:Event) => this.setDiscordChannel(place, channel.channelId, channel.name, { write:(event.target as HTMLInputElement).checked })}/><span>post</span></label>
                    </li>`;
                  })}</ul>`}`)}`}

          ${state.log.length === 0 ? nothing : html`
            <p class="empty">What she's done on Discord, and what was refused and why.</p>
            <ul class="mem-list">${[...state.log].reverse().slice(0, 25).map((event) => html`
              <li><span><strong>${event.kind}</strong>${event.channel ? ` · ${event.channel}` : ""}${event.user ? ` · ${event.user}` : ""} — ${event.detail ?? ""}</span></li>`)}</ul>`}

          <div class="panel-actions"><button class="danger" @click=${() => void this.disconnectDiscord()}>Disconnect and delete the token</button></div>`}`}
    </div>`;
  }

  /** Guards the lazy load of her likeness settings from firing on every re-render. */
  private identityLoading = false;

  private async loadIdentity() {
    if (this.identityLoading) return;
    this.identityLoading = true;
    try { this.identity = await api.libbyIdentity(); }
    catch { this.identity = undefined; }
    finally { this.identityLoading = false; }
  }

  private async saveIdentity(patch: { auto?: boolean; floor?: number }) {
    try { this.identity = await api.saveLibbyIdentity(patch); }
    catch (error) { this.say(error instanceof Error ? error.message : "Couldn't save that.", true); }
  }

  private async scanForHerself() {
    this.say("Looking through the library…");
    try {
      const result = await api.scanLibbyIdentity();
      this.say(result.tagged > 0
        ? `Found ${result.tagged} more picture${result.tagged === 1 ? "" : "s"} of her in ${result.checked}.`
        : `Checked ${result.checked} items and found nothing new.`);
      await this.loadIdentity();
    } catch (error) { this.say(error instanceof Error ? error.message : "The sweep failed.", true); }
  }

  /**
   * Which pictures in the library are of her.
   *
   * The panel exists because the automation needs to be answerable: "why does she think
   * that's her" and "why doesn't she recognise this one" are both questions about a
   * threshold and a likeness, and both are shown here. Marking a picture is done where
   * the pictures are — the library's own menu — rather than duplicated into a picker.
   */
  private renderIdentityPanel() {
    if (this.identity === undefined && !this.identityLoading) { void this.loadIdentity(); }
    const identity = this.identity;
    return html`<div class="mem-panel">
      <strong>Pictures of Libby</strong>
      <p class="empty">A picture judged to be her is labelled <code>${identity?.tag ?? "character:libby"}</code> in the library itself, so she knows herself when you open one, and you can search for them. Right-click any picture and use "Is this Libby?" to say so yourself — including saying no, which she remembers.</p>
      ${identity === undefined
        ? html`<p class="empty">Loading…</p>`
        : html`
          <p class="empty">${identity.tagged} picture${identity.tagged === 1 ? "" : "s"} labelled as her${identity.rejected > 0 ? `, ${identity.rejected} ruled out by hand` : ""}.</p>
          <label class="mem-toggle">
            <input type="checkbox" .checked=${identity.auto} @change=${(event:Event) => void this.saveIdentity({ auto:(event.target as HTMLInputElement).checked })}/>
            <span>Recognise her in new pictures automatically</span>
          </label>
          <label>How sure she has to be — matching features required
            <input class="field" type="number" min="2" max="6" .value=${String(identity.floor)}
              @change=${(event:Event) => void this.saveIdentity({ floor:Number((event.target as HTMLInputElement).value) })}/></label>
          <p class="empty">Matched against how her card says she looks: ${identity.features.length ? identity.features.join(", ") : "nothing yet — fill in her appearance"}.</p>
          ${identity.references.length
            ? html`<p class="empty">Reference pictures — what she looks like across outfits, poses and expressions:</p>
              <ul class="mem-list">${identity.references.map((pic) => html`<li><span>${pic.title}</span></li>`)}</ul>`
            : html`<p class="empty">No reference pictures yet. Mark a few from the library and she has more than one angle to go on.</p>`}
          <div class="panel-actions"><button class="secondary" @click=${() => void this.scanForHerself()}>Look through the library now</button></div>`}
    </div>`;
  }

  /**
   * The link in the box, as the server read it — shown before the message is sent.
   *
   * This is the "safe preview" the brief asks for, and it is safe in a specific sense:
   * nothing here renders the page. It is the server's own summary of what it fetched,
   * as text, with the address shown plainly so where the link actually goes is visible
   * rather than hidden behind whatever the page called itself.
   */
  private renderLinkPreview() {
    if (!this.pendingLinkURL) return nothing;
    const link = this.pendingLink;
    return html`<div class="attachment link-preview">
      <span class="material-symbols-rounded link-icon">${link?.failed ? "link_off" : link?.internal ? "collections_bookmark" : "link"}</span>
      <span class="attachment-copy">
        <strong>${link ? (link.title || link.host) : "Reading that link…"}</strong>
        <span>${link?.failed ? link.error : link?.internal ? "In your library — she'll talk about it as one of your own items." : (link?.text || this.pendingLinkURL)}</span>
        ${link && !link.failed && !link.internal ? html`<span class="link-host">${link.host}${link.media ? ` · ${link.media} file${link.media === 1 ? "" : "s"}` : ""}</span>` : nothing}
      </span>
      <button type="button" class="icon-btn" title="Don't send this link" aria-label="Don't send this link" @click=${() => this.dropLink()}><span class="material-symbols-rounded">close</span></button>
    </div>`;
  }

  /** Whether re-responding would redo this message: only the last assistant run can be. */
  private canRedo(message: StoredChatMessage): boolean {
    const messages = this.activeConversation?.messages ?? [];
    if (message.role !== "assistant") return false;
    const at = messages.indexOf(message);
    return at >= 0 && messages.slice(at + 1).every((later) => later.role === "assistant");
  }

  /**
   * The chat pane's own menu, for right-clicks that miss a message. Message rows
   * stop the event before it reaches here, so the two never both fire.
   */
  private chatMenu = (event: MouseEvent) => {
    if (nativeMenuWanted(event)) return;
    event.preventDefault();
    const character = this.activeCharacter, conversation = this.activeConversation;
    const path = event.composedPath();
    // A right-click on a conversation row acts on that conversation, not the open one.
    const row = path.find((node) => (node as HTMLElement)?.classList?.contains?.("convo-wrap")) as HTMLElement | undefined;
    const rowID = row?.dataset.id;
    const items: MenuItem[] = rowID
      ? [
          { label:"Open", icon:"forum", run:() => this.activateConversation(rowID) },
          { label:"New conversation", icon:"add_comment", run:() => this.newConversation() },
          { label:"Export conversation…", icon:"download", run:() => this.exportConversation(rowID) },
          menuDivider,
          { label:"Delete conversation", icon:"delete", danger:true, run:() => this.deleteConversation(rowID) },
        ]
      : [
          { label:"Re-respond", icon:"refresh", disabled:this.busy || !conversation?.messages.some((m) => m.role === "assistant"), run:() => void this.regenerate() },
          { label:"Retry with a note…", icon:"edit_note", disabled:this.busy || !conversation?.messages.some((m) => m.role === "assistant"), run:() => void this.regenerateWithNote() },
          { label:this.callOpen ? "End video call" : "Video call", icon:this.callOpen ? "call_end" : "videocam", run:() => this.callOpen ? this.endCall() : this.startCall() },
          { label:"Share a photo", icon:"add_photo_alternate", disabled:this.busy, run:() => this.pickPhoto() },
          { label:"Attach from the library", icon:"collections_bookmark", disabled:this.busy, run:() => this.openPicker() },
          { label:this.autopilot ? "Turn off autopilot" : "Let the AI continue on its own", icon:"smart_toy", run:() => this.toggleAutopilot() },
          { label:this.stageOpen ? "Hide portrait" : "Show portrait", icon:"wallpaper", run:() => (this.stageOpen = !this.stageOpen) },
          { label:this.speakOn ? "Stop reading aloud" : "Read replies aloud", icon:this.speakOn ? "volume_off" : "volume_up", run:() => this.toggleSpeak() },
          menuDivider,
          { label:"New conversation", icon:"add_comment", run:() => this.newConversation() },
          { label:"Chat settings", icon:"tune", run:() => { this.settingsOpen = true; this.editorTab = "character"; } },
          { label:"Refresh model status", icon:"sync", run:() => void this.refreshModels() },
          menuDivider,
          // The debugging pair. Capture has to be switched on *before* the turn you
          // want to look at, so it sits directly above the export that reads it.
          {
            label: this.captureTurns ? "Stop capturing turns" : "Capture turns (prompt + raw reply)",
            icon: this.captureTurns ? "bug_report" : "pest_control",
            run: () => {
              this.captureTurns = !this.captureTurns;
              this.say(this.captureTurns
                ? "Capturing every turn's prompt and raw reply. Export the conversation to read them."
                : "Stopped capturing turns.");
            },
          },
          { label:"Export conversation…", icon:"download", run:() => this.exportConversation() },
          menuDivider,
          { label:"Clear messages", icon:"delete_sweep", danger:true, run:() => this.clearConversation() },
        ];
    openMenu({ x:event.clientX, y:event.clientY, title:character?.name, items });
  };

  private messageMenu(message: StoredChatMessage, event: MouseEvent) {
    if (nativeMenuWanted(event)) return;
    // The pane-level menu is the fallback for clicks that miss a message; without
    // this it would open on top of the one built here.
    event.preventDefault(); event.stopPropagation();
    const redo = this.canRedo(message);
    const items: MenuItem[] = [
      ...(message.thought ? [] : [{ label:"Reply", icon:"reply", run:() => this.replyTo(message) }]),
      ...(message.thought || message.role !== "assistant" ? [] : [{ label:"React…", icon:"add_reaction", run:() => (this.reactionPicker = message.id) }]),
      { label:"Copy text", icon:"content_copy", run:() => void navigator.clipboard.writeText(message.content) },
      { label:"Edit message", icon:"edit", run:() => this.editMessage(message) },
      ...(redo ? [
        { label:"Retry", icon:"refresh", disabled:this.busy, run:() => void this.regenerate() },
        { label:"Retry with a note…", icon:"edit_note", disabled:this.busy, run:() => void this.regenerateWithNote() },
      ] : []),
      ...(message.role === "user" && !message.thought ? [{ label:"Retry from here", icon:"replay", disabled:this.busy, run:() => void this.retryFrom(message) }] : []),
      menuDivider,
      { label:"Delete message", icon:"delete", danger:true, run:() => this.deleteMessage(message.id) },
    ];
    openMenu({ x:event.clientX, y:event.clientY, title:message.role === "assistant" ? "Message" : "Your message", items });
  }

  /**
   * Draws something she thought or muttered rather than said.
   *
   * Deliberately not a message: no avatar, no author line, no bubble, no hover
   * actions — it is set inside the column with a marker and a hairline, italic and
   * dimmed. The brief asks for this to be visually unmistakable, and the only way to
   * be sure of that is for it to share none of a message's furniture.
   *
   * A private thought and something muttered aloud are labelled differently, because
   * whether the user was supposed to have heard it is the whole distinction.
   */
  private renderThought(message: StoredChatMessage, character: ChatCharacter) {
    const aloud = message.thought === "aside";
    return html`<div class="thought ${aloud ? "aloud" : ""}" @contextmenu=${(event:MouseEvent) => this.messageMenu(message, event)}>
      <span class="thought-label"><span class="material-symbols-rounded" aria-hidden="true">${aloud ? "graphic_eq" : "psychology_alt"}</span>${aloud ? `${character.name}, to herself` : `${character.name} thinks`}</span>
      <div>${message.content}</div>
    </div>`;
  }

  /**
   * Whether two neighbouring messages belong to one run: same speaker, close in time,
   * nothing thought in between. A thought breaks a run rather than continuing one —
   * what follows it is her speaking again, and it comes back with her avatar.
   */
  private sameRun(a?: StoredChatMessage, b?: StoredChatMessage): boolean {
    return !!a && !!b && !a.thought && !b.thought && a.role === b.role && Math.abs(b.at - a.at) < 5 * 60_000;
  }

  private renderEntry(message: StoredChatMessage, previous?: StoredChatMessage, next?: StoredChatMessage) {
    const character = this.activeCharacter, conversation = this.activeConversation; if (!character || !conversation) return nothing;
    const day = !previous || dayOf(previous.at) !== dayOf(message.at) ? html`<div class="day">${dayOf(message.at)}</div>` : nothing;
    if (message.thought) return html`${day}${this.renderThought(message, character)}`;
    const first = !this.sameRun(previous, message) || day !== nothing, last = !this.sameRun(message, next);
    const friend = message.role === "assistant", name = friend ? character.name : (this.workspace.profile.displayName || this.user?.username || "You");
    const receipt = last ? this.receiptFor(message, conversation) : "";
    const reactions = message.reactions ?? [];
    const picking = this.reactionPicker === message.id;
    const mine = reactions.find((r) => r.by === "user")?.emoji;
    return html`${day}<article class="msg ${friend ? "theirs" : "mine"} ${first ? "first" : ""} ${last ? "last" : ""}" data-message-id=${message.id}
      @contextmenu=${(event:MouseEvent) => this.messageMenu(message, event)}
      @pointerdown=${(event:PointerEvent) => this.swipeStart(message, event)}
      @pointermove=${(event:PointerEvent) => this.swipeMove(event)}
      @pointerup=${() => this.swipeEnd(message)} @pointercancel=${() => this.swipeEnd(message)}>
      ${friend ? this.avatar(character, "avatar") : nothing}
      <div class="bubble-wrap">
        <span class="swipe-hint material-symbols-rounded" aria-hidden="true">reply</span>
        ${picking ? html`<div class="react-row" role="menu" aria-label="React">${REACTIONS.map((emoji) => html`<button type="button" class=${mine === emoji ? "on" : ""} @click=${() => this.react(message, emoji)}>${emoji}</button>`)}<button type="button" class="close" title="Close" aria-label="Close" @click=${() => (this.reactionPicker = null)}><span class="material-symbols-rounded" style="font-size:16px">close</span></button></div>` : nothing}
        <div class="bubble ${message.snap ? "has-snap" : ""}">
          ${message.replyTo ? html`<button type="button" class="quote" title="Go to that message" @click=${() => this.jumpTo(message.replyTo)}>
            <strong>${message.replyTo.role === "assistant" ? character.name : (this.workspace.profile.displayName || this.user?.username || "You")}</strong>
            <span>${message.replyTo.excerpt}</span></button>` : nothing}
          ${message.content.trim() ? html`<div class="text">${formatted(message.content, message.links, (id) => requestOpenMedia(this, id))}</div>` : nothing}
          ${message.snap ? this.renderSnapTile(message, name) : html`
            ${message.imageId ? html`<img class="sent-image" src=${api.chatImageURL(message.imageId)} alt="Image sent by ${name}"/>` : nothing}
            ${renderAttachments(message.attachments, (id) => requestOpenMedia(this, id), name)}`}
          ${renderLinkChips(message.links, (id) => requestOpenMedia(this, id))}
          ${renderActionCards(message.actions, this.approvals.stateOf, this.approvals.decide)}
          <div class="meta"><span>${timeOf(message.at)}</span></div>
          ${reactions.length ? html`<div class="reactions">${reactions.map((r) => html`<button type="button" class="reaction ${r.by}" title=${r.by === "assistant" ? `${character.name} reacted ${r.emoji}` : `You reacted ${r.emoji}`}
            @click=${() => friend && r.by === "user" ? this.react(message, r.emoji) : undefined}>${r.emoji}</button>`)}</div>` : nothing}
        </div>
        ${receipt ? html`<span class="receipt ${message.readAt ? "read" : ""}">${receipt}</span>` : nothing}
        <span class="msg-actions"><button title="Reply" aria-label="Reply to this message" @click=${() => this.replyTo(message)}><span class="material-symbols-rounded" style="font-size:16px">reply</span></button>${friend ? html`<button title="React" aria-label="React to this message" @click=${() => (this.reactionPicker = picking ? null : message.id)}><span class="material-symbols-rounded" style="font-size:16px">add_reaction</span></button><button title="Read aloud" aria-label="Read this message aloud" @click=${() => { stopSpeaking(); void speak(message.content); }}><span class="material-symbols-rounded" style="font-size:16px">volume_up</span></button>` : nothing}${this.canRedo(message) ? html`<button title="Retry" aria-label="Ask for a different reply" ?disabled=${this.busy} @click=${() => void this.regenerate()}><span class="material-symbols-rounded" style="font-size:16px">refresh</span></button>` : nothing}${message.role === "user" ? html`<button title="Retry from here" aria-label="Retry from this message" ?disabled=${this.busy} @click=${() => void this.retryFrom(message)}><span class="material-symbols-rounded" style="font-size:16px">replay</span></button>` : nothing}<button title="Copy" @click=${() => void navigator.clipboard.writeText(message.content)}><span class="material-symbols-rounded" style="font-size:16px">content_copy</span></button><button title="Edit" @click=${() => this.editMessage(message)}><span class="material-symbols-rounded" style="font-size:16px">edit</span></button><button title="Delete" @click=${() => this.deleteMessage(message.id)}><span class="material-symbols-rounded" style="font-size:16px">delete</span></button></span>
      </div>
    </article>`;
  }

  /** A snap in the log: a tile to tap while it is unopened, and "Opened" after. The
      picture is never drawn inline — that is the whole difference from a photo. */
  private renderSnapTile(message: StoredChatMessage, name: string) {
    if (message.opened) {
      return html`<div class="snap opened" aria-label="Snap from ${name}, opened"><span class="material-symbols-rounded">check_box_outline_blank</span><span>Opened</span></div>`;
    }
    return html`<button type="button" class="snap" title="Tap to view — you only get to see it once" @click=${() => this.openSnap(message)}>
      <span class="material-symbols-rounded">photo_camera</span><span>Tap to view</span><em>Snap from ${name}</em>
    </button>`;
  }

  /** The snap, full-screen, until you tap it away. */
  private renderSnapViewer() {
    const snap = this.snapOpen;
    if (!snap) return nothing;
    const src = snap.imageId ? api.chatImageURL(snap.imageId) : snap.attachments?.[0] ? api.streamURL(snap.attachments[0].id) : "";
    return html`<div class="snap-viewer" role="dialog" aria-modal="true" aria-label="Snap" @click=${() => this.closeSnap()}>
      ${src ? html`<img src=${src} alt="Snap"/>` : html`<p>This snap is gone.</p>`}
      <span class="snap-close">Tap anywhere to close — it won't open again</span>
    </div>`;
  }

  /**
   * Draws the screen, or says why it couldn't.
   *
   * Lit has no error boundary: a throw during an update aborts the pass and leaves
   * the previously drawn DOM in place, with the cause only in the console. Since the
   * first thing this component ever draws is its loading spinner, *any* render bug
   * presents identically — as a chat screen that spins forever in every browser,
   * including a fresh incognito window. That is precisely how a single
   * "messages": null in the stored workspace hid, so the failure is now caught and
   * shown rather than left to look like a hang.
   */
  render() {
    try {
      return this.renderClient();
    } catch (error) {
      console.error("chat render failed", error);
      return html`<div class="client"><section class="main load-failed">
        <h2>Chat couldn't be drawn.</h2>
        <p>${(error as Error)?.message || String(error)}</p>
        <p class="hint">This is a bug — the detail above and the browser console say which part of the workspace is malformed.</p>
        <button class="autobar-btn" @click=${() => void this.retryLoad()}>Reload chat</button>
      </section></div>`;
    }
  }

  private renderClient() {
    const character=this.activeCharacter, conversation=this.activeConversation;
    if (this.loading) return html`<div class="client"><section class="main" style="grid-column:1/-1;place-items:center;display:grid"><md-circular-progress indeterminate></md-circular-progress></section></div>`;
    if (!character || !conversation) return html`<div class="client"><section class="main" style="grid-column:1/-1;padding:24px">Chat workspace is unavailable.</section></div>`;
    const channel=MODES.find((mode)=>mode.id===conversation.mode)??MODES[0];
    const stage=this.stageOpen?this.renderStage(character,conversation):nothing;
    const online = !!this.status?.enabled;
    const presence = online ? this.status!.model : character.id === "libby" ? "Local replies" : "Model offline";
    const messages = conversation.messages;
    const hero=this.stageOpen?this.renderHero(character,conversation):nothing;
    return html`<div class="client ${this.mobileNavOpen ? "nav-open" : ""} ${stage!==nothing ? "with-stage" : ""} ${this.callOpen ? "in-call" : ""}" style=${this.stageWidth ? `--stage-w:${this.stageWidth}px` : ""} @pointerdown=${this.armIdle} @contextmenu=${this.chatMenu}>${this.renderSidebar()}
      <main class="main"><header class="top">
        <button class="icon-btn mobile-nav" title="Chats" aria-label="Back to chats" @click=${() => (this.mobileNavOpen=true)}><span class="material-symbols-rounded">arrow_back</span></button>
        ${this.avatar(character,"top-avatar")}
        <span class="top-title"><span class="name">${character.name}</span><span class="presence"><span class="status-dot ${online ? "online" : ""}"></span>${presence}${character.id === "libby" ? ` · ${conversation.emotion}${conversation.activity ? `, ${conversation.activity}` : ""}` : ` · ${channel.topic}`}</span></span>
        ${character.id === "libby" ? nothing : html`<select class="quick-mode" aria-label="Conversation mode" title="Conversation mode" .value=${conversation.mode} @change=${(event:Event) => this.updateConversation({mode:(event.target as HTMLSelectElement).value})}>${MODES.map((mode)=>html`<option value=${mode.id}>${mode.label}</option>`)}</select>`}
        <span class="top-actions"><button class="icon-btn ${this.callOpen?"on":""}" title=${this.callOpen?"End call":"Video call"} aria-label=${this.callOpen?"End call":"Video call"} @click=${()=>this.callOpen?this.endCall():this.startCall()}><span class="material-symbols-rounded">${this.callOpen?"call_end":"videocam"}</span></button><button class="icon-btn ${this.autopilot?"on":""}" title=${this.autopilot?"Turn off autopilot":"Let the AI continue on its own"} aria-label="Autopilot" aria-pressed=${this.autopilot?"true":"false"} @click=${()=>this.toggleAutopilot()}><span class="material-symbols-rounded">smart_toy</span></button><button class="icon-btn stage-toggle ${this.stageOpen?"on":""}" title=${this.stageOpen?"Hide portrait":"Show portrait"} aria-label="Portrait" aria-pressed=${this.stageOpen?"true":"false"} @click=${()=>(this.stageOpen=!this.stageOpen)}><span class="material-symbols-rounded">wallpaper</span></button><button class="icon-btn ${this.speakOn?"on":""}" title=${this.speakOn?"Stop reading replies aloud":"Read replies aloud"} aria-label="Voice" aria-pressed=${this.speakOn?"true":"false"} @click=${()=>this.toggleSpeak()}><span class="material-symbols-rounded">${this.speakOn?"volume_up":"volume_off"}</span></button><button class="icon-btn destructive-action" title="Clear messages" aria-label="Clear messages" @click=${this.clearConversation}><span class="material-symbols-rounded">delete_sweep</span></button><button class="icon-btn ${this.settingsOpen?"on":""}" title="Chat settings" aria-label="Chat settings" @click=${()=>(this.settingsOpen=!this.settingsOpen)}><span class="material-symbols-rounded">tune</span></button></span>
      </header>
        ${this.settingsOpen?this.renderSettings():nothing}
        ${this.loadError ? html`<div class="backend-state load-error" role="alert"><strong>Chat didn't load.</strong> ${this.loadError}
          ${this.workspaceLoaded ? nothing : html` Your saved characters and conversations aren't shown, and nothing is being saved until this succeeds.`}
          <button class="autobar-btn" @click=${() => void this.retryLoad()}>Retry</button></div>` : nothing}
        ${this.status?.modelBackend && !this.status.enabled ? html`<div class="backend-state" role="status"><strong>Text generation offline.</strong> ${this.status.message || "Load a model in text-generation-webui, then refresh status."}</div>` : nothing}
        ${hero}
        ${this.renderAutopilotBar(character)}
        <section class="log">${messages.length ? nothing : html`<div class="intro">${this.avatar(character,"intro-avatar")}<h2>${character.name}</h2><p>${character.description || `This is the beginning of your conversation with ${character.name}.`}</p><p>${online?`Running on ${this.status!.model}.`:character.id === "libby" ? "Libby is using built-in local replies." : "Connect a local model to start chatting."}</p></div>`}
          ${messages.map((message,index)=>this.renderEntry(message,messages[index-1],messages[index+1]))}${this.busy&&this.typingPhase==="typing"?html`<div class="msg theirs last typing-row">${this.avatar(character,"avatar")}<div class="bubble-wrap"><div class="bubble" aria-label="${character.name} is typing"><span class="dots"><i></i><i></i><i></i></span></div></div></div>`:nothing}
        </section>${this.notice?html`<div class="notice ${this.noticeError?"error":""}" role=${this.noticeError?"alert":"status"}>${this.notice}</div>`:nothing}
        <form class="composer-form" @submit=${(event:Event)=>{event.preventDefault();void this.send();}}>
          ${this.pendingPhoto ? html`<div class="attachment"><img src=${api.chatImageURL(this.pendingPhoto.imageId)} alt=${`Attached photo: ${this.pendingPhoto.name}`}/>
            <span class="attachment-copy"><strong>${this.pendingPhoto.name}</strong><span>${this.pendingPhoto.tags.length ? this.pendingPhoto.tags.slice(0,8).join(", ") : "No content tags found"}</span></span>
            <button type="button" class="icon-btn" title="Remove photo" aria-label="Remove photo" @click=${()=>void this.discardPhoto()}><span class="material-symbols-rounded">close</span></button></div>` : nothing}
          ${this.renderLinkPreview()}
          ${this.replyTarget ? html`<div class="attachment reply-preview">
            <span class="material-symbols-rounded link-icon">reply</span>
            <span class="attachment-copy"><strong>Replying to ${this.replyTarget.role === "assistant" ? character.name : "yourself"}</strong><span>${excerptOf(this.replyTarget.content)}</span></span>
            <button type="button" class="icon-btn" title="Cancel reply" aria-label="Cancel reply" @click=${() => (this.replyTarget = null)}><span class="material-symbols-rounded">close</span></button></div>` : nothing}
          ${this.pendingItems.length ? html`<div class="items-preview">${this.pendingItems.map((item) => html`<span class="item-chip">
            ${item.hasThumb ? html`<img src=${api.thumbURL(item.id)} alt=""/>` : html`<span class="chip-icon"><span class="material-symbols-rounded">${KIND_ICONS[item.kind] ?? "folder"}</span></span>`}
            <strong>${item.title}</strong>
            <button type="button" title="Remove" aria-label=${`Remove ${item.title}`} @click=${() => this.removeItem(item.id)}><span class="material-symbols-rounded" style="font-size:16px">close</span></button>
          </span>`)}</div>` : nothing}
          <div class="composer">
            <div class="box">
              <span class="attach-btn" title="Share a photo"><span class="material-symbols-rounded">add_photo_alternate</span><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" aria-label="Share a photo" @change=${(event:Event)=>void this.attachPhoto(event)}/></span>
              <button type="button" class="attach-btn" style="border:0;background:transparent" title="Attach from the library" aria-label="Attach from the library" @click=${()=>this.openPicker()}><span class="material-symbols-rounded">collections_bookmark</span></button>
              <textarea rows="1" aria-label=${`Message ${character.name}`} placeholder=${this.busy?`${character.name} is replying — you can keep going…`:`Message ${character.name}…`} .value=${this.draft} @input=${(event:Event)=>{this.draft=(event.target as HTMLTextAreaElement).value;this.noticeLink();}} @keydown=${this.onKey}></textarea>
            </div>
            ${this.busy && this.status?.modelManagement ? html`<button class="send stop" type="button" title="Stop the reply" aria-label="Stop the reply" @click=${() => void this.stopGeneration()}><span class="material-symbols-rounded">stop</span></button>` : nothing}
            <button class="send" type="submit" title="Send message" aria-label="Send message" ?disabled=${!this.draft.trim()&&!this.pendingPhoto&&!this.pendingItems.length}><span class="material-symbols-rounded">send</span></button>
          </div><div class="format-help"><span>"speech" · **action** · *emphasis* · ~~strike~~ · &#96;code&#96;</span><span class="send-help"></span></div></form>
      </main>${stage}${this.renderPicker2()}${this.renderIncomingCall(character)}${this.renderCall(character,conversation)}${this.renderSnapViewer()}
    </div>`;
  }

  /** The library picker sheet. Named apart from the character picker above. */
  private renderPicker2() {
    const picker = this.picker;
    if (!picker) return nothing;
    const chosen = new Set(this.pendingItems.map((item) => item.id));
    return html`<div class="picker" @click=${() => this.closePicker()}>
      <div class="picker-card" role="dialog" aria-modal="true" aria-label="Attach from the library" @click=${(event:Event) => event.stopPropagation()}>
        <div class="picker-head">
          <span class="material-symbols-rounded" style="color:var(--muted)">search</span>
          <input placeholder="Search your library…" .value=${picker.query}
            @input=${(event:Event) => void this.searchLibrary((event.target as HTMLInputElement).value)}
            @keydown=${(event:KeyboardEvent) => { if (event.key === "Escape") this.closePicker(); }} />
          <button type="button" class="icon-btn" title="Close" aria-label="Close" @click=${() => this.closePicker()}><span class="material-symbols-rounded">close</span></button>
        </div>
        <div class="picker-grid">
          ${picker.loading && !picker.items.length ? html`<div class="picker-empty">Looking…</div>` : nothing}
          ${!picker.loading && !picker.items.length ? html`<div class="picker-empty">Nothing matches.</div>` : nothing}
          ${picker.items.map((item) => html`<button type="button" class="picker-tile ${chosen.has(item.id) ? "on" : ""}" title=${item.title} @click=${() => this.toggleItem(item)}>
            ${item.hasThumb || item.kind === "image" || item.kind === "gif"
              ? html`<img src=${api.thumbURL(item.id)} alt="" loading="lazy"/>`
              : html`<span class="tile-kind material-symbols-rounded">${KIND_ICONS[item.kind] ?? "folder"}</span>`}
            <span class="tile-name">${item.title || `Item ${item.id}`}</span>
          </button>`)}
        </div>
        <div class="picker-foot">
          <span>${chosen.size ? `${chosen.size} chosen` : "Pick videos, pictures, gifs, comics or games to show her."}</span>
          <button type="button" class="autobar-btn" @click=${() => this.closePicker()}>${chosen.size ? "Done" : "Close"}</button>
        </div>
      </div>
    </div>`;
  }

  /** Her ringing you: a notification over the chat, with answer and decline. */
  private renderIncomingCall(character: ChatCharacter) {
    if (!this.incomingCall) return nothing;
    return html`<div class="incoming" role="alertdialog" aria-label=${`${character.name} is calling`}>
      ${this.avatar(character, "avatar")}
      <span class="incoming-copy"><strong>${character.name} is calling</strong><span>Video call</span></span>
      <button type="button" class="incoming-btn no" title="Decline" aria-label="Decline" @click=${() => this.declineCall()}><span class="material-symbols-rounded">call_end</span></button>
      <button type="button" class="incoming-btn yes" title="Answer" aria-label="Answer" @click=${() => this.acceptCall()}><span class="material-symbols-rounded">videocam</span></button>
    </div>`;
  }
}

/** The photo report's source, in words. */
function describePhotoSource(source: string): string {
  switch (source) {
    case "ready": return "from your words, before she wrote";
    case "model": return "from the tags she wrote";
    case "rescue": return "as a rescue: she said she was sending one and nothing fitted";
    case "inferred": return "unprompted, because her words matched it";
    default: return source;
  }
}

declare global { interface HTMLElementTagNameMap { "oppai-chat": OppaiChat; } }
