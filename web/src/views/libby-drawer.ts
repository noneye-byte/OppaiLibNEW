import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { keyed } from "lit/directives/keyed.js";
import {
  api, type ChatCharacter, type ChatMessage, type ChatProfile, type ChatStatus, type ChatViewingItem,
  type LibbyAction, type LibbyLink, type Media, type SourceItem,
} from "../api.js";
import { iconStyles, motionStyles } from "../theme.js";
import {
  applyImageFallback, libbyAssetCandidates, libbyHidden, loadLibbyOutfit,
  normalizeEmotion, normalizeIntensity, type LibbyEmotion,
} from "../libby.js";
import { applyProgression, getIntensity, setIntensity } from "../libby-meter.js";
import { libbyHeatDelta, libbyOnBrowse, libbyReply } from "../libby-voice.js";
import {
  ActionApprovals, actionCardStyles, linkChipStyles, renderActionCards, renderLinkChips, requestOpenMedia,
} from "../chat-links.js";
import { libbyMotion } from "../libby-motion.js";
import { KIND_META, type Kind } from "../media-meta.js";

/**
 * Browsing together, from wherever you already are.
 *
 * This used to have a twin: a standalone Together screen that rendered its own copy of
 * the library with her beside it. Two entrances to one idea, and the copy was the weaker
 * half — this drawer opens over the *real* grid, with the real filters and the real
 * selection, so there is nothing to keep in sync. The screen is gone and this is the
 * single way in.
 *
 * The former screen was a place you go: a shelf with her beside it. This is the same
 * conversation as a drawer that pulls out over whatever you are already doing — the
 * grid, a video, the image studio — so "look at this with me" stops being a section
 * you navigate to and becomes something available wherever you happen to be.
 *
 * The shell tells it what is on screen (`items`, `focused`, `where`), and it tells the
 * shell when she points at something (the shared OPEN_MEDIA_EVENT). It reacts on its
 * own when the focused item changes while the drawer is open — that is the whole
 * premise, that opening something *is* the message — and stays quiet when it is shut,
 * because a mascot narrating a closed drawer is a mascot talking to nobody.
 *
 * Nothing said here is written to the chat workspace, for two reasons: a running
 * commentary is not correspondence anyone wants filed, and the Chat screen owns that
 * document. The mood meter *is* shared — it is per-session, not per-screen.
 */

interface Remark {
  id: string;
  role: "user" | "assistant";
  content: string;
  at: number;
  links?: LibbyLink[];
  actions?: LibbyAction[];
  /** Libby's pose when she sent this line, so each message owns its expressive
      sprite instead of borrowing a static character pfp. */
  emotion?: LibbyEmotion;
  intensity?: number;
}

const newID = () => {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID().replaceAll("-", "");
  return [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, "0")).join("");
};

/** How many on-screen items travel with a turn. The server caps this too. */
const VIEWING_WINDOW = 16;

/** Whether the drawer starts open, per-device like the rest of Libby's presentation. */
const OPEN_KEY = "oppai_libby_drawer";

const MODES = [
  { id: "sweet", label: "sweet" },
  { id: "playful", label: "playful" },
  { id: "bold", label: "bold" },
  { id: "horny", label: "horny" },
] as const;

@customElement("oppai-libby-drawer")
export class OppaiLibbyDrawer extends LitElement {
  /** What is on screen right now, most relevant first. The shell decides what that
      means for the section the user is in. */
  @property({ attribute: false }) items: Media[] = [];
  /** The one item the user is actually looking at, when there is one. */
  @property({ attribute: false }) focused: Media | null = null;
  /** Outside-site tiles in frame. Kept separate because they do not have local media
      ids and must never masquerade as downloaded library records. */
  @property({ attribute: false }) externalItems: SourceItem[] = [];
  @property({ attribute: false }) externalFocused: SourceItem | null = null;
  /** Where they are, in words she can use — "their videos", "the image studio". */
  @property() where = "their library";
  /** Set while a screen owns the conversation itself (the Chat and Together views),
      so she is not running two conversations at the user in parallel. */
  @property({ type: Boolean }) suppressed = false;

  @state() private open = localStorage.getItem(OPEN_KEY) === "1";
  @state() private characters: ChatCharacter[] = [];
  @state() private profile: ChatProfile | null = null;
  @state() private characterID = "libby";
  @state() private status: ChatStatus | null = null;
  @state() private remarks: Remark[] = [];
  @state() private draft = "";
  @state() private busy = false;
  @state() private notice = "";
  @state() private noticeError = false;
  @state() private mode = "playful";
  @state() private emotion: LibbyEmotion = "happy";
  @state() private intensity = getIntensity();
  /** Set once the character list has been fetched, so the first open does it once. */
  private loaded = false;
  /** Fractional heat behind the displayed tier; see applyProgression. */
  private progress = getIntensity();
  /** The last item she was told about, so a re-render with the same focus does not
      make her say something twice. */
  private remarkedOn: string | null = null;

  /** Which of her offers have been decided this session; see ActionApprovals. */
  private approvals = new ActionApprovals(() => this.requestUpdate());

  static styles = [iconStyles, motionStyles, linkChipStyles, actionCardStyles, libbyMotion, css`
    :host { position: fixed; inset: 0 0 0 auto; z-index: 60; pointer-events: none; display: block; }

    /* The handle: a tab on the right edge, the drawer's only permanent footprint. It
       is deliberately small and vertical — this sits over every screen in the app, so
       anything larger is a thing in the way rather than a thing available. */
    .handle {
      position: absolute;
      right: 0;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: 6px;
      writing-mode: vertical-rl;
      border: 0;
      border-radius: 12px 0 0 12px;
      padding: 14px 7px;
      background: var(--oppai-primary-container, #3b2411);
      color: var(--oppai-primary-bright, #ffb877);
      font: inherit;
      font-size: 12px;
      letter-spacing: .06em;
      cursor: pointer;
      box-shadow: -2px 0 12px rgba(0, 0, 0, .35);
    }
    .handle:hover { filter: brightness(1.12); }
    .handle .material-symbols-rounded { font-size: 18px; writing-mode: horizontal-tb; }

    .panel {
      position: absolute;
      right: 0; top: 0; bottom: 0;
      width: min(420px, 100vw);
      pointer-events: auto;
      display: flex;
      flex-direction: column;
      gap: 0;
      padding: 0;
      box-sizing: border-box;
      background: var(--oppai-surface, #17120e);
      border-left: 1px solid var(--oppai-surface-2, rgba(255,255,255,.08));
      box-shadow: -8px 0 28px rgba(0, 0, 0, .45);
    }
    @media (prefers-reduced-motion: no-preference) {
      .panel { animation: drawer-in .18s ease-out; }
    }
    @keyframes drawer-in { from { transform: translateX(16px); opacity: 0; } }

    /* Discord's mobile conversation structure, expressed in OppaiLib's palette: a
       compact channel bar, a flat avatar-led log, and a composer fixed at the foot. */
    .head {
      min-height: 56px; flex: 0 0 auto; display: flex; align-items: center; gap: 8px;
      padding: max(0px, env(safe-area-inset-top)) 10px 0 14px;
      border-bottom: 1px solid var(--oppai-surface-2, rgba(255,255,255,.08));
      box-shadow: 0 1px 6px rgba(0,0,0,.2);
    }
    .channel-mark { opacity: .55; font-size: 24px; font-weight: 500; }
    .head .who { font-weight: 750; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .head select, .head button {
      background: var(--oppai-surface-2, rgba(255,255,255,.06)); color: inherit; border: 0;
      border-radius: 10px; padding: 6px 8px; font: inherit; font-size: 13px; cursor: pointer;
    }
    .watching {
      flex: 0 0 auto; padding: 8px 14px; font-size: 11px; opacity: .66;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      border-bottom: 1px solid var(--oppai-surface-2, rgba(255,255,255,.06));
    }
    .log { flex: 1; min-height: 0; overflow: auto; padding: 10px 0 18px; }
    .remark {
      display: grid; grid-template-columns: 50px minmax(0,1fr); align-items: start;
      padding: 7px 12px 7px 8px; font-size: 14px; line-height: 1.42;
    }
    .remark:hover { background: color-mix(in srgb, currentColor 4%, transparent); }
    .remark-avatar {
      width: 40px; height: 40px; border-radius: 50%; overflow: hidden; display: grid;
      place-items: center; background: var(--oppai-surface-2, rgba(255,255,255,.07));
      font-size: 12px; font-weight: 750; color: var(--oppai-primary-bright, #ffb877);
    }
    .remark-avatar img { width: 100%; height: 100%; display: block; object-fit: cover; object-position: top center; }
    .remark-avatar.libby img { object-fit: contain; object-position: bottom center; }
    .remark-body { min-width: 0; }
    .remark-meta { display: flex; align-items: baseline; gap: 7px; min-width: 0; margin-bottom: 1px; }
    .remark-author { font-weight: 720; color: var(--oppai-primary-bright, #ffb877); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .remark.from-user .remark-author { color: inherit; }
    .remark-time { opacity: .45; font-size: 10px; white-space: nowrap; }
    .remark .said { display: block; white-space: pre-wrap; overflow-wrap: anywhere; }
    .thinking { margin: 5px 14px 5px 58px; opacity: .6; font-size: 13px; font-style: italic; }
    .notice { margin: 4px 12px; font-size: 12px; opacity: .75; }
    .notice.error { color: var(--oppai-danger, #ff6b6b); opacity: 1; }

    .actions { display: flex; gap: 7px; flex-wrap: wrap; padding: 7px 12px 0; }
    .actions button { flex: 1; min-width: 110px; border: 1px solid var(--oppai-surface-2, rgba(255,255,255,.08));
      background: none; color: inherit; border-radius: 12px; padding: 8px 10px; font: inherit; font-size: 12px; cursor: pointer; }
    .actions button:hover:not(:disabled) { border-color: var(--oppai-primary, #f97316); color: var(--oppai-primary-bright, #ffb877); }
    .actions button:disabled { opacity: .4; cursor: default; }

    .say {
      display: flex; gap: 8px; align-items: flex-end; padding: 8px 12px max(10px, env(safe-area-inset-bottom));
      background: var(--oppai-surface, #17120e);
    }
    .say textarea { flex: 1; resize: none; background: var(--oppai-surface-2, rgba(255,255,255,.06)); color: inherit;
      border: 0; border-radius: 12px; padding: 10px 12px; font: inherit; font-size: 14px; max-height: 110px; }
    .icon-btn { border: 0; background: var(--oppai-surface-2, rgba(255,255,255,.06)); color: inherit; border-radius: 12px;
      padding: 9px; cursor: pointer; display: grid; place-items: center; }
    .icon-btn:hover { background: var(--oppai-primary-container, #3b2411); color: var(--oppai-primary-bright, #ffb877); }
    .icon-btn:disabled { opacity: .4; cursor: default; }
    @media (max-width: 600px) {
      .panel { width: 100vw; }
      .handle { top: auto; bottom: max(92px, calc(74px + env(safe-area-inset-bottom))); transform: none; }
    }
  `];

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("oppai-libby-pref", this.onPref);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("oppai-libby-pref", this.onPref);
  }

  private onPref = () => this.requestUpdate();

  updated(changed: Map<string, unknown>) {
    if (!changed.has("focused") && !changed.has("externalFocused")) return;
    // She reacts to what you opened, but only while she is out and only when the model
    // can actually answer. A closed drawer that quietly racks up commentary would spend
    // the user's GPU on text nobody asked for and nobody will read.
    // The same three conditions render() draws nothing under. A hidden drawer that
    // still asked for turns would spend the user's GPU on commentary they have said
    // they do not want to see.
    const focused = this.externalFocused ?? this.focused;
    if (!this.open || this.suppressed || libbyHidden() || !focused) return;
    const key = `${this.externalFocused ? "external" : "library"}:${focused.id}`;
    if (key === this.remarkedOn) return;
    this.remarkedOn = key;
    // An outside title is untrusted catalogue text. It already travels in the fenced
    // viewing block, so never splice it into a user-role instruction here.
    const prompt = this.externalFocused
      ? "(I have just opened the focused item from Browse. Say what you think of it.)"
      : `(I have just opened "${focused.title}". Say what you think of it.)`;
    void this.ask("", prompt);
  }

  private async load() {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const workspace = await api.chatWorkspace();
      this.profile = workspace.profile ?? null;
      this.characters = (workspace.characters ?? []).filter((character) => character?.id);
      if (!this.characters.some((character) => character.id === this.characterID)) {
        this.characterID = this.characters[0]?.id ?? "libby";
      }
      const character = this.character;
      if (character?.defaultMode && MODES.some((mode) => mode.id === character.defaultMode)) {
        this.mode = character.defaultMode;
      }
    } catch (error) {
      this.say((error as Error).message || "Couldn't load your characters.", true);
    }
    try { this.status = await api.chatStatus(); } catch { /* The first turn reports it. */ }
    if (!this.remarks.length) {
      this.push({ role: "assistant", content: libbyOnBrowse({}, { intensity: this.intensity }).message });
    }
  }

  private get character(): ChatCharacter | undefined {
    return this.characters.find((character) => character.id === this.characterID);
  }

  private toggle() {
    this.open = !this.open;
    try { localStorage.setItem(OPEN_KEY, this.open ? "1" : "0"); } catch { /* private mode */ }
    if (this.open) void this.load();
  }

  private say(message: string, error = false) {
    this.notice = message;
    this.noticeError = error;
    if (!error) window.setTimeout(() => { if (this.notice === message) this.notice = ""; }, 4000);
  }

  private push(remark: Omit<Remark, "id" | "at">) {
    const posed = remark.role === "assistant"
      ? { emotion: remark.emotion ?? this.emotion, intensity: remark.intensity ?? this.intensity }
      : {};
    this.remarks = [...this.remarks, { ...remark, ...posed, id: newID(), at: Date.now() }].slice(-60);
    void this.scrollLog();
  }

  private async scrollLog() {
    await this.updateComplete;
    const log = this.renderRoot.querySelector(".log");
    if (log) log.scrollTop = log.scrollHeight;
  }

  /** What is on screen, as ids: the focused item first, then the rest of what the
      shell handed down. Titles and tags are read server-side from these. */
  private viewing() {
    const ids = this.items.slice(0, VIEWING_WINDOW).map((item) => item.id);
    const external = this.externalItems
      .filter((item) => item.id !== this.externalFocused?.id)
      .slice(0, VIEWING_WINDOW)
      .map(toViewingItem);
    return {
      focusId: this.focused?.id,
      ids,
      external,
      focusExternal: this.externalFocused ? toViewingItem(this.externalFocused) : undefined,
      section: this.where,
    };
  }

  /** Asks for one turn and appends it. Mirrors the Together screen's `ask`, including
      the local-voice fallback when no model is loaded. */
  private async ask(spoken: string, prompt?: string) {
    const character = this.character;
    if (!character || this.busy) return;
    this.busy = true;
    const heat = applyProgression(this.progress, libbyHeatDelta(spoken || prompt || "", this.mode));
    try {
      if (!this.status?.enabled && (this.status?.configured || this.status?.modelBackend)) {
        try { this.status = await api.chatStatus(); } catch { /* The branch below still answers. */ }
      }
      if (!this.status?.enabled) {
        const item = this.externalFocused ?? this.focused;
        const tags = item
          ? this.externalFocused
            ? this.externalFocused.tags ?? []
            : (this.focused?.tags ?? []).map((tag) => tag.name)
          : [];
        const line = spoken
          ? libbyReply(spoken, this.mode, this.emotion, heat.intensity, false)
          : libbyOnBrowse({ kind: item?.kind, tags }, { intensity: heat.intensity });
        this.applyMood(line.emotion, heat.progress, line.intensity);
        this.push({ role: "assistant", content: line.message });
        return;
      }
      const history: ChatMessage[] = this.remarks.map(({ role, content }) => ({ role, content }));
      if (prompt) history.push({ role: "user", content: prompt });
      const result = await api.chat({
        mode: this.mode, messages: history, emotion: this.emotion, intensity: this.intensity,
        characterId: character.id, viewing: this.viewing(),
        outfit: character.id === "libby" ? loadLibbyOutfit() : "",
      });
      const requested = normalizeIntensity(result.intensity ?? this.intensity);
      if (result.declared) this.applyMood(normalizeEmotion(result.emotion), requested, requested);
      else {
        const drift = applyProgression(this.progress, requested - this.intensity);
        this.applyMood(normalizeEmotion(result.emotion), drift.progress, drift.intensity);
      }
      this.push({ role: "assistant", content: result.message, links: result.links, actions: result.actions });
    } catch (error) {
      this.say((error as Error).message || "She didn't answer.", true);
    } finally {
      this.busy = false;
    }
  }

  private applyMood(emotion: LibbyEmotion, progress: number, intensity: number) {
    this.emotion = emotion;
    this.progress = progress;
    this.intensity = setIntensity(intensity);
  }

  private send() {
    const spoken = this.draft.trim();
    if (!spoken || this.busy) return;
    this.draft = "";
    this.push({ role: "user", content: spoken });
    void this.ask(spoken);
  }

  private onKey(event: KeyboardEvent) {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); this.send(); }
  }

  render() {
    // Hiding Libby hides her everywhere, and this is the most ambient surface she has.
    // The Chat screen owns the conversation where it runs, so the drawer stands down
    // rather than competing with it. It is otherwise available everywhere, because it is
    // now the only way to browse with her — the standalone Together screen is gone.
    if (libbyHidden() || this.suppressed) return nothing;
    return this.open ? this.renderPanel() : this.renderHandle();
  }

  private renderHandle() {
    const name = this.character?.name ?? "Libby";
    return html`<button class="handle" title=${`Browse with ${name}`} aria-label=${`Open ${name}'s drawer`}
      @click=${() => this.toggle()}>
      <span class="material-symbols-rounded">interests</span>
      Together
    </button>`;
  }

  private renderPanel() {
    const character = this.character;
    const name = character?.name ?? "Libby";
    const focused = this.externalFocused ?? this.focused;
    const itemCount = this.externalItems.length || this.items.length;
    return html`<aside class="panel" aria-label=${`Browsing with ${name}`}>
      <div class="head">
        <span class="channel-mark" aria-hidden="true">#</span>
        ${this.characters.length > 1
          ? html`<select aria-label="Who you are browsing with" .value=${this.characterID}
              @change=${(event: Event) => { this.characterID = (event.target as HTMLSelectElement).value; }}>
              ${this.characters.map((entry) => html`<option value=${entry.id}>${entry.name}</option>`)}
            </select>`
          : html`<span class="who">${name}</span>`}
        <select aria-label="Mood" .value=${this.mode}
          @change=${(event: Event) => (this.mode = (event.target as HTMLSelectElement).value)}>
          ${MODES.map((mode) => html`<option value=${mode.id}>${mode.label}</option>`)}
        </select>
        <button title="Close" aria-label="Close the drawer" @click=${() => this.toggle()}>
          <span class="material-symbols-rounded" style="font-size:18px; display:block;">right_panel_close</span>
        </button>
      </div>
      <div class="watching">
        ${focused
          ? `Looking at “${focused.title}”`
          : `Watching ${this.where}${itemCount ? ` · ${itemCount} items` : ""}`}
      </div>
      <div class="log">
        ${this.remarks.map((remark) => this.renderRemark(remark, character))}
        ${this.busy ? html`<div class="thinking">${name} is looking…</div>` : nothing}
      </div>
      ${this.notice
        ? html`<div class="notice ${this.noticeError ? "error" : ""}" role=${this.noticeError ? "alert" : "status"}>${this.notice}</div>`
        : nothing}
      <div class="actions">
        <button ?disabled=${this.busy || !focused} @click=${() => {
          const item = focused;
          if (item) void this.ask("", this.externalFocused
            ? "(Tell me what you think of the focused Browse item — be specific about it.)"
            : `(Tell me what you think of "${item.title}" — be specific about it.)`);
        }}>What do you think?</button>
        <button ?disabled=${this.busy || !itemCount} @click=${() => {
          this.push({ role: "user", content: "Pick something for me." });
          void this.ask("Pick something for me.");
        }}>Pick one for me</button>
      </div>
      <div class="say">
        <textarea rows="1" aria-label=${`Say something to ${name}`} placeholder=${`Say something to ${name}…`}
          .value=${this.draft} @input=${(event: Event) => (this.draft = (event.target as HTMLTextAreaElement).value)}
          @keydown=${(event: KeyboardEvent) => this.onKey(event)}></textarea>
        <button class="icon-btn" title="Send" aria-label="Send" ?disabled=${!this.draft.trim() || this.busy}
          @click=${() => this.send()}>
          <span class="material-symbols-rounded">send</span>
        </button>
      </div>
    </aside>`;
  }

  private renderRemark(remark: Remark, character?: ChatCharacter) {
    const fromUser = remark.role === "user";
    const author = fromUser ? (this.profile?.displayName || "You") : (character?.name || "Libby");
    const time = new Date(remark.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return html`<article class="remark ${fromUser ? "from-user" : ""}">
      ${this.renderRemarkAvatar(remark, character, author)}
      <div class="remark-body">
        <div class="remark-meta"><span class="remark-author">${author}</span><span class="remark-time">${time}</span></div>
        <span class="said">${remark.content}</span>
        ${renderLinkChips(remark.links, (id) => requestOpenMedia(this, id))}
        ${renderActionCards(remark.actions, this.approvals.stateOf, this.approvals.decide)}
      </div>
    </article>`;
  }

  private renderRemarkAvatar(remark: Remark, character: ChatCharacter | undefined, author: string) {
    if (remark.role === "user") {
      return this.profile?.avatarImageId
        ? html`<span class="remark-avatar"><img src=${api.chatImageURL(this.profile.avatarImageId)} alt="" /></span>`
        : html`<span class="remark-avatar">${author.slice(0, 2).toUpperCase()}</span>`;
    }
    if (character?.id === "libby" || !character) {
      const emotion = remark.emotion ?? this.emotion;
      const intensity = remark.intensity ?? this.intensity;
      const assets = libbyAssetCandidates(emotion, intensity, loadLibbyOutfit());
      return html`<span class="remark-avatar libby libby-breathe">${keyed(`${remark.id}-${emotion}-${intensity}`,
        html`<img class="libby-speak" src=${assets[0]} data-fallback-index="0"
          alt=${`Libby looking ${emotion}`}
          @error=${(event: Event) => applyImageFallback(event.target as HTMLImageElement, assets)}/>`)}</span>`;
    }
    return character.avatarImageId
      ? html`<span class="remark-avatar"><img src=${api.chatImageURL(character.avatarImageId)} alt="" /></span>`
      : html`<span class="remark-avatar">${author.slice(0, 2).toUpperCase()}</span>`;
  }
}

function toViewingItem(item: SourceItem): ChatViewingItem {
  return { title: item.title, kind: item.kind, tags: item.tags };
}

/** A phrase for where the user is, for the `where` property. Kept here so the shell
    does not have to know how she talks about the app. */
export function libbyWhere(section: string): string {
  if (section === "home" || section === "search") return "their whole library";
  if (section === "favorites") return "their favorites";
  if (section === "browse") return "an outside site they are browsing";
  if (section === "imagegen") return "the image studio, making pictures";
  if (section === "studio") return "the outfit studio, dressing me up";
  if (section === "settings") return "the settings screen";
  const label = KIND_META[section as Kind]?.label;
  return label ? `their ${label.toLowerCase()}` : "their library";
}

declare global { interface HTMLElementTagNameMap { "oppai-libby-drawer": OppaiLibbyDrawer; } }
