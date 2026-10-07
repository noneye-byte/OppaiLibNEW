/**
 * The client half of a turn that runs on the server.
 *
 * A turn used to be one JSON reply that this client then acted on: it split the text
 * into bubbles, ran the picture generation itself, made the room she moved to, kept her
 * mood run and her sent-picture list, and sent all of that back on the next turn. The
 * server does all of it now (backend/internal/api/libby_turn.go) and streams what
 * happens as it happens — her messages, the camera's progress, her state settling — as
 * Server-Sent Events. What is left here is reading that stream and folding each event
 * into the conversation on screen, which is pure, so it lives here with its tests
 * rather than inside chat.ts.
 */
import type { ChatConversation, StoredChatMessage } from "./api";

/** Announced on window when she says something outside the chat screen — watching a
    video with you — so an open chat adds it to the conversation it went into. */
export const LIBBY_MESSAGE_EVENT = "oppai-libby-message";

export interface LibbyMessageDetail {
  conversationId: string;
  message: StoredChatMessage;
  rev?: number;
}

export interface TurnEvent {
  event: string;
  // The shape depends on the event; each consumer narrows it.
  data: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

/**
 * Reads a text/event-stream incrementally. Chunks arrive split anywhere — mid-line,
 * mid-event — so text is buffered until a blank line ends an event.
 */
export class EventStreamParser {
  private buffer = "";

  feed(chunk: string): TurnEvent[] {
    this.buffer += chunk.replace(/\r\n/g, "\n");
    const out: TurnEvent[] = [];
    let at: number;
    while ((at = this.buffer.indexOf("\n\n")) >= 0) {
      const block = this.buffer.slice(0, at);
      this.buffer = this.buffer.slice(at + 2);
      const event = parseEventBlock(block);
      if (event) out.push(event);
    }
    return out;
  }
}

/** One event block: "event:" names it, "data:" lines carry JSON. Comments and blocks
    without data are skipped; a data payload that is not JSON is passed as text. */
export function parseEventBlock(block: string): TurnEvent | null {
  let event = "message";
  const data: string[] = [];
  for (const line of block.split("\n")) {
    if (!line || line.startsWith(":")) continue;
    const colon = line.indexOf(":");
    const field = colon < 0 ? line : line.slice(0, colon);
    const value = colon < 0 ? "" : line.slice(colon + 1).replace(/^ /, "");
    if (field === "event") event = value;
    else if (field === "data") data.push(value);
  }
  if (!data.length) return null;
  const raw = data.join("\n");
  try {
    return { event, data: JSON.parse(raw) };
  } catch {
    return { event, data: raw };
  }
}

/** Puts a message into a log by id — replacing the copy already there, or inserting it
    in time order — and returns the log. The server resends a message it amended (an
    offer added to it, her mood stamped on it), so arriving twice is normal. */
export function upsertMessage(messages: StoredChatMessage[], message: StoredChatMessage): StoredChatMessage[] {
  const at = messages.findIndex((m) => m.id === message.id);
  if (at >= 0) {
    messages[at] = { ...messages[at], ...message };
    return messages;
  }
  let i = messages.length;
  while (i > 0 && messages[i - 1].at > message.at) i--;
  messages.splice(i, 0, message);
  return messages;
}

/** Puts her reaction on one of your messages, replacing any reaction of hers already on it. */
export function applyHerReaction(messages: StoredChatMessage[], to: string, emoji: string): void {
  const target = messages.find((m) => m.id === to);
  if (!target) return;
  target.reactions = [...(target.reactions ?? []).filter((r) => r.by !== "assistant"), { emoji, by: "assistant" }];
}

/** The state a turn settles her in. */
export interface TurnState {
  emotion: string;
  intensity: number;
  activity: string;
  background: string;
  wearing: string;
  scene?: ChatConversation["scene"] | null;
  messageId?: string;
  rev?: number;
}

/** Folds the settled state into the conversation, and stamps the mood and heat on her
    last bubble the way the server stored them. */
export function applyTurnState(conversation: ChatConversation, state: TurnState): void {
  conversation.emotion = state.emotion || conversation.emotion;
  conversation.intensity = state.intensity || conversation.intensity;
  conversation.progress = conversation.intensity;
  conversation.activity = state.activity ?? "";
  conversation.background = state.background ?? "";
  conversation.wearing = state.wearing ?? "";
  conversation.scene = state.scene ?? undefined;
  if (state.rev) conversation.rev = Math.max(conversation.rev ?? 0, state.rev);
  const last = state.messageId && conversation.messages.find((m) => m.id === state.messageId);
  if (last) {
    last.mood = state.emotion;
    last.heat = state.intensity;
  }
}

/** The pictures a message carries: a set, or the one. */
export function picturesOf(message: StoredChatMessage): string[] {
  if (message.images?.length) return message.images;
  return message.imageId ? [message.imageId] : [];
}

/** Whether a message's text is only the placeholder a picture, clip or card carries
    when she sent it without a word ("*sends a picture*"). Drawn as the thing itself,
    not as a line of italics above it. */
export function isStageDirection(content: string): boolean {
  return /^\*(?:sends|hands over|offers)\b[^*]*\*$/.test(content.trim());
}

/** Her messages of yours not yet on the server, oldest first — what a turn sends.
    Everything after the last of hers that you wrote; the server ignores any it has. */
export function unsentMessages(messages: StoredChatMessage[]): StoredChatMessage[] {
  let i = messages.length;
  while (i > 0 && messages[i - 1].role === "user") i--;
  return messages.slice(i).map(({ id, role, content, at, imageId, attachments, replyTo }) => ({ id, role, content, at, imageId, attachments, replyTo }));
}

/** Words for the camera's phase, for the progress card. */
export function cameraPhaseLabel(phase: string, of = 1): string {
  switch (phase) {
    case "generating": return of > 1 ? `Taking ${of} shots…` : "Taking the picture…";
    case "judging": return "Picking the best one…";
    case "retaking": return "Not happy with it — retaking…";
    case "saving": return "Sending…";
    case "animating": return "Making the clip…";
    case "making the room": return "Going somewhere new…";
    default: return "Taking the picture…";
  }
}
