// Handing a library item to a character in Chat.
//
// The two views never talk directly: Library drops a share here and switches to
// Chat, and Chat collects it when it mounts. That keeps the direction of the
// dependency one-way — Library needs to know nothing about conversations, images,
// or which character is open, and Chat needs to know nothing about the grid.
//
// The share is held in memory rather than localStorage on purpose. It is a handoff
// between two views in one session, not a preference; surviving a reload would mean
// a picture silently arriving in a conversation days later.

import { api, type ChatImage, type Media } from "./api.js";

export interface PendingShare {
  /** The character the picture is being shown to. */
  characterId: string;
  /** A data URL, already resolved: Chat should not have to know how to fetch media. */
  imageData: string;
  /** Names the upload, so the picture is recognisable in the character's gallery. */
  name: string;
}

let pending: PendingShare | null = null;

/** Chat listens for this when it is already on screen and has nothing left to mount. */
export const SHARE_EVENT = "oppai-chat-share";

/**
 * Only a still picture can be shown to a character: everything else is offered as
 * its thumbnail, which is the frame the library already chose to represent it.
 */
function shareSourceURL(item: Media): string {
  return item.kind === "image" || item.kind === "gif" ? api.streamURL(item.id) : api.thumbURL(item.id);
}

/** True when there is anything to send — a video with no thumbnail has no frame to show. */
export function canShare(item: Media): boolean {
  return item.kind === "image" || item.kind === "gif" || item.hasThumb === true;
}

/**
 * Resolves any same-origin image URL to a data URL.
 *
 * Throws if the image cannot be read, so the caller can report it rather than
 * switching to Chat with nothing to show.
 */
export async function readImageData(url: string, name: string): Promise<string> {
  const response = await fetch(url, { credentials: "same-origin" });
  if (!response.ok) throw new Error(`Couldn't read "${name}" to share it.`);
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Couldn't read the file."));
    reader.readAsDataURL(blob);
  });
}

/**
 * Resolves any same-origin image URL to bytes and queues it for Chat.
 *
 * This is the general form. It takes a URL rather than a library item so that
 * anything the server will serve can be handed to a character — the library grid,
 * and the generator's own gallery, which holds images that were never imported and
 * so have no Media record to pass around.
 */
export async function shareImageWithCharacter(url: string, characterId: string, name: string): Promise<void> {
  const imageData = await readImageData(url, name);
  pending = { characterId, imageData, name };
  window.dispatchEvent(new CustomEvent<PendingShare>(SHARE_EVENT, { detail: pending }));
}

function shareName(item: Media): string {
  return item.title || `Library item ${item.id}`;
}

/** Shares a library item, picking the frame the library already chose to represent it. */
export function shareWithCharacter(item: Media, characterId: string): Promise<void> {
  return shareImageWithCharacter(shareSourceURL(item), characterId, shareName(item));
}

/**
 * Gives a library item to a character to keep — into their encrypted chat gallery,
 * where it can be sent later — without opening Chat.
 *
 * The other half of sharing. "Show her now" attaches the picture to a message you
 * are about to write; this is "have this", for a picture she should be able to reach
 * for on her own some other evening. The phone has had both on a long-press for a
 * while; the desktop only had the first.
 *
 * Who the picture is of is the server's scanner's call, as it is for any upload —
 * except when the library already says: an item labelled as her (the identity tag,
 * see "Is this Libby?") is filed on her shelf outright rather than re-guessed.
 */
export async function saveForCharacter(item: Media, characterId: string): Promise<ChatImage> {
  const imageData = await readImageData(shareSourceURL(item), shareName(item));
  const hers = characterId === "libby" && (item.tags ?? []).some((tag) => tag.name === "character:libby");
  return api.uploadChatImage({
    characterId, name: shareName(item), imageData, tags: [],
    subject: hers ? "self" : undefined,
  });
}

/** Claims the queued share. Returns null when there is none; a share is delivered once. */
export function takePendingShare(): PendingShare | null {
  const share = pending;
  pending = null;
  return share;
}
