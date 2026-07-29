// Things a chat message can point at, and the pictures it should not point at again.
//
// Shared by the Chat screen and the browse-together session because both are the
// same conversation seen from different chairs: both send turns to /api/chat, both
// have to say which pictures have already been shown, and both draw the library
// items a reply named.

import { css, html, nothing, type TemplateResult } from "lit";
import { api, type LibbyAction, type LibbyLink, type StoredChatMessage } from "./api.js";

/**
 * The pictures already seen in this conversation, oldest first.
 *
 * The server keeps no memory between requests — the client owns the log — so
 * "you have already sent this one" has to travel with every turn. Both roles
 * count: a photo the user shared is just as much on screen as one she sent, and
 * handing it back to them is the same non-answer either way.
 *
 * Bounded because it rides in the request body and because a picture ruled out
 * forever is a picture removed from the gallery.
 */
export function recentlySent(messages: StoredChatMessage[], limit = 12): string[] {
  const ids: string[] = [];
  for (const message of messages) {
    if (message.imageId && ids[ids.length - 1] !== message.imageId) ids.push(message.imageId);
  }
  return ids.slice(-limit);
}

/** Asks the app shell to open a library item. Chat lives inside Library, which
    knows how to route it; nothing below here needs to know that. */
export const OPEN_MEDIA_EVENT = "oppai-open-media";

export function requestOpenMedia(source: EventTarget, id: number): void {
  source.dispatchEvent(new CustomEvent<{ id: number }>(OPEN_MEDIA_EVENT, {
    detail: { id }, bubbles: true, composed: true,
  }));
}

/** Icon per library kind, matching the nav so a chip reads as the same object. */
const KIND_ICONS: Record<string, string> = {
  video: "movie", gif: "gif_box", image: "image", comic: "menu_book", game: "sports_esports",
};

/** Styles for the chips below. Shadow DOM means each host has to include these
    itself; exporting them is what keeps the two call sites looking identical. */
export const linkChipStyles = css`
  .links { display:flex; flex-wrap:wrap; gap:8px; margin-top:8px; }
  .link-chip {
    display:flex; align-items:center; gap:8px; padding:6px 12px 6px 6px; max-width:100%;
    border:1px solid var(--md-sys-color-outline-variant, rgba(255,255,255,.14));
    border-radius:12px; background:var(--md-sys-color-surface-container-high, rgba(255,255,255,.05));
    color:inherit; font:inherit; font-size:13px; text-align:left; cursor:pointer;
  }
  .link-chip:hover { border-color:var(--md-sys-color-primary, #f97316); }
  .link-chip img, .link-chip .link-icon {
    width:36px; height:36px; border-radius:8px; flex:0 0 auto; object-fit:cover;
    display:grid; place-items:center; background:rgba(255,255,255,.07);
  }
  .link-chip .link-copy { display:flex; flex-direction:column; min-width:0; }
  .link-chip strong { font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .link-chip span { opacity:.6; font-size:11px; text-transform:capitalize; }
`;

/**
 * Draws what a reply pointed at, as things you can open.
 *
 * The title is already in the prose — the server substitutes it for the link tag —
 * so this is deliberately a chip rather than a card: it is the "open it" affordance
 * for something she has already named, not a second copy of the sentence.
 */
/**
 * The state of one offer, from the user's side.
 *
 * "pending" is the only state with buttons. Once a card has been allowed or declined
 * it stays on screen as a record of what was decided rather than disappearing, because
 * an approval that leaves no trace is indistinguishable from one that never happened.
 */
export type ActionState = "pending" | "running" | "done" | "declined" | "failed";

/** Icon per action kind. Falls back to a generic mark, so a kind this build has
    never heard of still renders as a card the user can read and refuse. */
const ACTION_ICONS: Record<string, string> = {
  generate: "auto_awesome", import: "download", tag: "sell", favorite: "favorite",
};

export const actionCardStyles = css`
  .actions-offered { display:flex; flex-direction:column; gap:8px; margin-top:10px; }
  .action-card {
    display:flex; align-items:flex-start; gap:10px; padding:10px 12px;
    border:1px solid var(--md-sys-color-outline-variant, rgba(255,255,255,.14));
    border-radius:14px; background:var(--md-sys-color-surface-container-high, rgba(255,255,255,.05));
    font-size:13px;
  }
  .action-card.done { border-color:var(--oppai-accent, #f97316); }
  .action-card.failed { border-color:var(--oppai-danger, #ff6b6b); }
  .action-card.declined { opacity:.55; }
  .action-card > .material-symbols-rounded { font-size:20px; opacity:.8; flex:0 0 auto; margin-top:1px; }
  .action-body { flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
  .action-label { font-weight:600; }
  .action-detail { opacity:.7; font-size:12px; overflow-wrap:anywhere; }
  .action-status { font-size:12px; opacity:.7; }
  .action-status.failed { color:var(--oppai-danger, #ff6b6b); opacity:1; }
  .action-buttons { display:flex; gap:6px; flex-wrap:wrap; margin-top:6px; }
  .action-buttons button {
    border:1px solid var(--md-sys-color-outline-variant, rgba(255,255,255,.14));
    background:none; color:inherit; border-radius:999px; padding:5px 14px;
    font:inherit; font-size:12px; cursor:pointer;
  }
  .action-buttons .allow {
    background:var(--oppai-accent, #f97316); color:var(--oppai-on-accent, #1b1206); border-color:transparent; font-weight:600;
  }
  .action-buttons button:disabled { opacity:.5; cursor:default; }
`;

/**
 * Draws what Libby has offered to do, as things you have to say yes to.
 *
 * The card states the action in full — what will happen, and to what — because this is
 * the only place the user gets to check it. Nothing runs until Allow is pressed, and
 * Allow is the only control that calls `api.libbyAct`.
 */
export function renderActionCards(
  actions: LibbyAction[] | undefined,
  stateOf: (action: LibbyAction) => { state: ActionState; message?: string },
  decide: (action: LibbyAction, allow: boolean) => void,
): TemplateResult | typeof nothing {
  if (!actions?.length) return nothing;
  return html`<div class="actions-offered">${actions.map((action) => {
    const { state, message } = stateOf(action);
    return html`<div class="action-card ${state}">
      <span class="material-symbols-rounded">${ACTION_ICONS[action.kind] ?? "bolt"}</span>
      <div class="action-body">
        <span class="action-label">${action.label}</span>
        <span class="action-detail">${action.detail}</span>
        ${state === "pending"
          ? html`<div class="action-buttons">
              <button class="allow" @click=${() => decide(action, true)}>Allow</button>
              <button @click=${() => decide(action, false)}>Not now</button>
            </div>`
          : html`<span class="action-status ${state === "failed" ? "failed" : ""}">
              ${message ?? DEFAULT_STATUS[state]}
            </span>`}
      </div>
    </div>`;
  })}</div>`;
}

/**
 * Which offers have been decided, and how they went.
 *
 * Kept outside the message log deliberately. A decision is about this session — you
 * approved this, just now — whereas the log is a document that round-trips through the
 * server and the phone. Persisting "already allowed" would also make an old card look
 * pressable again after a reload, which is either a lie or a second import.
 *
 * Shared by the Chat screen and the drawer so an approval behaves identically in both.
 */
export class ActionApprovals {
  private states = new Map<string, { state: ActionState; message?: string }>();

  /** `onChange` is the host's requestUpdate: this is plain state, not reactive. */
  constructor(private onChange: () => void) {}

  stateOf = (action: LibbyAction) => this.states.get(action.id) ?? { state: "pending" as ActionState };

  /**
   * Acts on a decision. The `false` branch never touches the network at all — a
   * declined offer is a local fact, and there is nothing to tell the server about
   * something it was never going to do on its own.
   */
  decide = async (action: LibbyAction, allow: boolean) => {
    if (!allow) {
      this.set(action.id, "declined");
      return;
    }
    this.set(action.id, "running");
    try {
      await api.libbyAct(action);
      this.set(action.id, "done", SUCCESS_STATUS[action.kind]);
    } catch (error) {
      this.set(action.id, "failed", (error as Error).message);
    }
  };

  private set(id: string, state: ActionState, message?: string) {
    this.states.set(id, { state, message });
    this.onChange();
  }
}

/** What a completed action says. Specific where it can be: "Done" is true but tells
    the user nothing about where the thing went. */
const SUCCESS_STATUS: Record<string, string> = {
  generate: "Made it — it's in your library.",
  import: "Added to your library.",
  tag: "Tags added.",
  favorite: "Favorited.",
};

const DEFAULT_STATUS: Record<ActionState, string> = {
  pending: "",
  running: "Working on it…",
  done: "Done.",
  declined: "You said no.",
  failed: "That didn't work.",
};

export function renderLinkChips(links: LibbyLink[] | undefined, open: (id: number) => void): TemplateResult | typeof nothing {
  if (!links?.length) return nothing;
  return html`<div class="links">${links.map((link) => html`
    <button class="link-chip" title=${`Open ${link.title}`} @click=${() => open(link.id)}>
      ${link.hasThumb
        ? html`<img src=${api.thumbURL(link.id)} alt="" loading="lazy"/>`
        : html`<span class="link-icon"><span class="material-symbols-rounded" style="font-size:20px">${KIND_ICONS[link.kind] ?? "folder"}</span></span>`}
      <span class="link-copy"><strong>${link.title}</strong><span>${link.kind}</span></span>
    </button>`)}</div>`;
}
