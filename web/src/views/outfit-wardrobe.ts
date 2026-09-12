import { LitElement, css, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { api, mascotSay, type LibbyActivityDef, type LibbyBackground, type LibbyOutfit } from "../api.js";
import { iconStyles } from "../theme.js";
import { defaultLibbyArt, loadLibbyOutfit, saveLibbyOutfit } from "../libby.js";
import { libbyReact } from "../libby-voice.js";

/**
 * Libby's wardrobes: the finished sprites she actually wears.
 *
 * This used to live in Settings, beside the theme and the reader preferences, which
 * was the wrong shelf for it — dressing the mascot is a piece of creative work, not a
 * preference, and it was the one thing on that screen you could spend an hour inside.
 * It now sits in the outfit studio next to the board that generates the art, so the
 * whole loop — describe the clothes, render the sixty squares, review the cutouts, see
 * her wearing them — happens on one screen.
 *
 * Which outfit is *worn* stays per-device, like hiding her: the server holds the art
 * and the browser holds the choice.
 */

/**
 * Libby's emotion slots, in the order the outfit editor lays them out.
 *
 * The first five are drawn by the bundled wardrobe and are what every outfit should
 * cover — leave one empty and she falls all the way back to the default art. The rest
 * are finer moods she can express but that no bundled picture distinguishes: each
 * borrows a drawn pose (see `borrows`) until an outfit gives it one of its own.
 * They are optional by construction, which is why they come second.
 */
const LIBBY_EMOTION_SLOTS: { id: string; label: string; hint: string; borrows?: string }[] = [
  { id: "neutral", label: "Neutral", hint: "Login screen and error popups" },
  { id: "happy", label: "Happy", hint: "Chat · Sweet mode" },
  { id: "mischievous", label: "Mischievous", hint: "Chat · Playful mode" },
  { id: "surprised", label: "Surprised", hint: "Chat · Bold mode" },
  { id: "thinking", label: "Thinking", hint: "Chat · Roleplay mode" },
  { id: "shy", label: "Shy", hint: "Bashful, flustered, caught out", borrows: "Surprised" },
  { id: "smug", label: "Smug", hint: "Proud of herself, vindicated", borrows: "Mischievous" },
  { id: "sad", label: "Sad", hint: "Hurt, wistful, let down", borrows: "Thinking" },
  { id: "annoyed", label: "Annoyed", hint: "Irritated, pouty, impatient", borrows: "Thinking" },
  { id: "sleepy", label: "Sleepy", hint: "Tired, dozy, winding down", borrows: "Neutral" },
  { id: "loving", label: "Loving", hint: "Tender, adoring, soft on you", borrows: "Happy" },
  { id: "excited", label: "Excited", hint: "Thrilled, eager, buzzing", borrows: "Happy" },
];

/** Horniness art tiers 0..4, calmest first — the level Libby wears rises with the
    session meter. Tier 0 is the baseline every outfit falls back to. */
const LIBBY_TIERS: string[] = ["Calm", "Warm", "Flirty", "Heated", "Peak"];

/** A complete wardrobe: one sprite per expression per tier. The studio generates
    exactly this many squares, and the two counts must not drift apart. */
const TOTAL_SLOTS = LIBBY_EMOTION_SLOTS.length * LIBBY_TIERS.length;

/** Key for a staged/existing (emotion, tier) slot. A MISC state has one square, at
    tier 0, whatever tier the editor happens to be showing. */
const slotKey = (emotion: string, level: number) => `${emotion}:${level}`;

/**
 * An outfit being created or edited. Staged images are data URLs dropped onto the
 * emotion slots; they upload on Save, so backing out costs nothing. Slots are keyed
 * by "emotion:level" so each of the five tiers has its own emotion images.
 */
interface OutfitDraft {
  id?: string;
  name: string;
  /** A newly picked cover, as a data URL. Uploads with the rest on Save. */
  cover?: string;
  /** Whether the server already has a cover for this outfit (explicit or borrowed
      from its slot art), so the editor can show the current card without probing. */
  hasCover?: boolean;
  /** "emotion:level" pairs that already have art on the server. */
  existing: string[];
  /** Newly dropped art as data URLs, keyed "emotion:level". */
  staged: Record<string, string>;
  /** Squares whose art is to be removed on Save, keyed the same way. Staged like a
      drop, so backing out of the editor costs nothing. */
  removed: string[];
  /** Which tier the editor is currently showing. */
  level: number;
}

@customElement("oppai-outfit-wardrobe")
export class OppaiOutfitWardrobe extends LitElement {
  @state() private outfits: LibbyOutfit[] = [];
  /**
   * The MISC states an outfit may also be drawn in — what she is doing rather than
   * what she is feeling.
   *
   * Served with the wardrobe list rather than declared here, unlike LIBBY_EMOTION_SLOTS
   * above. The emotions are load-bearing in this client — the portrait, the fallback
   * table, the labels — so they are worth keeping in sync by hand. These are slots and
   * nothing else, so the server owning the vocabulary means a new state needs no client
   * release. An older server sends none, and the section simply does not appear.
   */
  @state() private activities: LibbyActivityDef[] = [];
  /** The places she can be on a call, managed below the wardrobes. */
  @state() private backgrounds: LibbyBackground[] = [];
  /** Which room she is in when a conversation has not said. See libby_backgrounds.go. */
  @state() private defaultBackground = "";
  @state() private backgroundDraft: { id?: string; name: string; tags: string; image?: string; hasImage?: boolean } | null = null;
  @state() private backgroundBusy = false;
  @state() private backgroundVersion = 0;
  @state() private wornOutfit = loadLibbyOutfit();
  @state() private outfitDraft: OutfitDraft | null = null;
  @state() private outfitBusy = false;
  @state() private outfitError = "";
  @state() private outfitCoverVersion = 0;

  static styles = [iconStyles, css`
    :host { display: block; }
    .wardrobe-intro {
      margin-bottom: 10px;
      color: var(--oppai-text-muted);
      font-size: 13px;
      line-height: 1.45;
    }
    .wardrobe-error { color: var(--oppai-error, #f2b8b5); font-size: 13px; margin-bottom: 8px; }
    /* The rooms, as cards like the outfits — wider, because they are rooms. */
    .scene-head { display: flex; align-items: baseline; gap: 10px; margin: 26px 0 4px; }
    .scene-head h3 { margin: 0; font-size: 16px; }
    .scene-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(168px, 1fr)); gap: 12px; margin-top: 10px; }
    .scene-card { position: relative; display: flex; flex-direction: column; border: 1px solid var(--oppai-border); border-radius: 14px; overflow: hidden;
      background: var(--oppai-surface-2, rgba(255, 255, 255, 0.03)); text-align: left; cursor: pointer; padding: 0; font: inherit; color: inherit;
      transition: border-color 0.12s, transform 0.12s; }
    .scene-card:hover { transform: translateY(-2px); border-color: var(--oppai-border-strong); }
    .scene-card .cover, .scene-card .cover-empty { aspect-ratio: 16 / 10; width: 100%; object-fit: cover; display: block; background: var(--oppai-surface); }
    .scene-card .cover-empty { display: grid; place-items: center; color: var(--oppai-text-muted); font-size: 13px; text-align: center; }
    .scene-card .card-body { padding: 8px 10px 10px; display: grid; gap: 2px; }
    .scene-card .card-name { font-weight: 600; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .scene-card .card-meta { font-size: 12px; color: var(--oppai-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .scene-editor { margin-top: 12px; padding: 14px; border: 1px solid var(--oppai-border); border-radius: 14px; display: grid; gap: 10px;
      grid-template-columns: 220px minmax(0, 1fr); align-items: start; }
    .scene-editor .drop { aspect-ratio: 16 / 10; border: 1px dashed var(--oppai-border-strong); border-radius: 10px; display: grid; place-items: center;
      overflow: hidden; cursor: pointer; color: var(--oppai-text-muted); font-size: 12px; text-align: center; padding: 8px; background: var(--oppai-surface); }
    .scene-editor .drop img { width: 100%; height: 100%; object-fit: cover; grid-area: 1 / 1; }
    .scene-editor .drop.dragover { border-color: var(--oppai-accent); }
    .scene-fields { display: grid; gap: 8px; }
    .scene-fields label { display: grid; gap: 3px; font-size: 12px; color: var(--oppai-text-muted); }
    .scene-fields input { font: inherit; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--oppai-border-strong); background: var(--oppai-surface); color: inherit; }
    .scene-actions { display: flex; gap: 8px; flex-wrap: wrap; grid-column: 1 / -1; }
    .outfit-btn.danger { color: var(--oppai-error, #f2b8b5); border-color: var(--oppai-error, #f2b8b5); }
    @media (max-width: 640px) { .scene-editor { grid-template-columns: 1fr; } }
      .outfit-row {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 0;
        border-top: 1px solid var(--oppai-border);
        font-size: 14px;
      }
      .outfit-row .name {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .outfit-row .meta {
        font-size: 12px;
        color: var(--oppai-text-muted);
      }
      .outfit-btn {
        border: 1px solid var(--oppai-border-strong);
        background: transparent;
        color: var(--oppai-text-dim);
        border-radius: 999px;
        font: inherit;
        font-size: 12px;
        padding: 5px 12px;
        cursor: pointer;
      }
      .outfit-btn.on {
        background: var(--oppai-accent);
        color: var(--oppai-on-accent);
        border-color: var(--oppai-accent);
      }
      /* The wardrobe, as cards. A list of names could not answer the only question
         being asked here — "which one is this?" — and outfits are pictures. */
      .outfit-cards {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
        gap: 12px;
        margin-top: 10px;
      }
      .outfit-card {
        position: relative;
        display: flex;
        flex-direction: column;
        border: 1px solid var(--oppai-border);
        border-radius: 14px;
        overflow: hidden;
        background: var(--oppai-surface-2, rgba(255, 255, 255, 0.03));
        text-align: left;
        cursor: pointer;
        padding: 0;
        font: inherit;
        color: inherit;
        transition: border-color 0.12s, transform 0.12s;
      }
      .outfit-card:hover { transform: translateY(-2px); border-color: var(--oppai-border-strong); }
      .outfit-card.on { border-color: var(--oppai-accent); }
      /* Portraits are tall; 3:4 shows the pose without letterboxing the common case. */
      .outfit-card .cover {
        aspect-ratio: 3 / 4;
        width: 100%;
        object-fit: cover;
        display: block;
        background: var(--oppai-surface);
      }
      .outfit-card .cover-empty {
        aspect-ratio: 3 / 4;
        display: grid;
        place-items: center;
        color: var(--oppai-text-muted);
        font-size: 12px;
        text-align: center;
        padding: 8px;
      }
      .outfit-card .card-body { padding: 8px 10px 10px; }
      .outfit-card .card-name {
        font-size: 13px;
        font-weight: 600;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .outfit-card .card-meta { font-size: 11px; color: var(--oppai-text-muted); margin-top: 2px; }
      /* "Wearing" sits on the art, because that is the one fact you scan a grid for. */
      .outfit-card .worn-badge {
        position: absolute;
        top: 8px;
        left: 8px;
        background: var(--oppai-accent);
        color: var(--oppai-on-accent);
        border-radius: 999px;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        padding: 3px 8px;
      }
      .outfit-card .card-edit {
        position: absolute;
        top: 6px;
        right: 6px;
        border: 0;
        border-radius: 8px;
        background: rgba(0, 0, 0, 0.55);
        color: #fff;
        font: inherit;
        font-size: 11px;
        padding: 4px 8px;
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.12s;
      }
      .outfit-card:hover .card-edit,
      .outfit-card:focus-within .card-edit { opacity: 1; }
      /* The cover picker inside the editor. */
      .cover-picker {
        display: flex;
        gap: 12px;
        align-items: center;
        margin: 10px 0 4px;
      }
      .cover-picker img,
      .cover-picker .cover-blank {
        width: 84px;
        aspect-ratio: 3 / 4;
        object-fit: cover;
        border-radius: 10px;
        border: 1px solid var(--oppai-border);
        background: var(--oppai-surface-2, rgba(255, 255, 255, 0.03));
        display: grid;
        place-items: center;
        font-size: 11px;
        color: var(--oppai-text-muted);
        text-align: center;
      }
      .cover-picker .cover-copy { flex: 1; min-width: 0; font-size: 12px; color: var(--oppai-text-muted); }
      .cover-picker .cover-copy .row { display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap; }
      .outfit-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.55);
        display: grid;
        place-items: center;
        z-index: 50;
        padding: 20px;
      }
      .outfit-dialog {
        background: var(--oppai-surface);
        border: 1px solid var(--oppai-border);
        border-radius: 18px;
        padding: 18px;
        width: min(640px, 100%);
        max-height: 92vh;
        overflow-y: auto;
      }
      .outfit-dialog h3 {
        margin: 0 0 12px;
        font-size: 16px;
      }
      /* Horniness tier picker across the top of the editor. */
      .tier-tabs {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        margin-top: 12px;
      }
      .tier-tab {
        border: 1px solid var(--oppai-border-strong);
        background: transparent;
        color: var(--oppai-text-dim);
        border-radius: 999px;
        font: inherit;
        font-size: 12px;
        padding: 5px 12px;
        cursor: pointer;
      }
      .tier-tab.on {
        background: var(--oppai-primary);
        color: var(--oppai-on-primary);
        border-color: var(--oppai-primary);
      }
      .tier-note {
        margin: 8px 0 0;
        font-size: 12px;
        color: var(--oppai-text-muted);
      }
      .slots {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 12px;
        margin-top: 14px;
      }
      .slot {
        border: 2px dashed var(--oppai-border-strong);
        border-radius: 14px;
        padding: 10px;
        text-align: center;
        cursor: pointer;
        transition: border-color 0.15s ease, background 0.15s ease;
      }
      .slot.dragover {
        border-color: var(--oppai-primary);
        background: var(--oppai-surface-2);
      }
      .slot img {
        width: 100%;
        aspect-ratio: 3 / 4;
        object-fit: contain;
        border-radius: 10px;
        background: var(--oppai-surface-2);
      }
      .slot .drop-hint {
        aspect-ratio: 3 / 4;
        display: grid;
        place-items: center;
        color: var(--oppai-text-muted);
        font-size: 12px;
        padding: 6px;
      }
      .slot .slot-label {
        font-size: 13px;
        font-weight: 600;
        margin-top: 6px;
      }
      .slot .slot-hint {
        font-size: 11px;
        color: var(--oppai-text-muted);
      }
      .slot { position: relative; }
      .slot.removed img { opacity: 0.3; filter: grayscale(1); }
      /* Edit and remove sit on the art and appear on hover, like the card's Edit:
         the common case is dropping a picture on the square, and two permanent
         buttons under every one of sixty squares would bury that. */
      .slot .slot-actions {
        position: absolute; top: 14px; right: 14px; display: flex; gap: 4px; opacity: 0; transition: opacity 0.12s;
      }
      .slot:hover .slot-actions, .slot:focus-within .slot-actions { opacity: 1; }
      .slot-act {
        width: 26px; height: 26px; border: 0; border-radius: 7px; display: grid; place-items: center; cursor: pointer;
        background: rgba(0, 0, 0, 0.6); color: #fff; font: inherit;
      }
      .slot-act.danger { color: #f2b8b5; }
      .default-badge {
        position: absolute; top: 8px; left: 8px; background: var(--oppai-accent); color: var(--oppai-on-accent);
        border-radius: 999px; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; padding: 3px 8px;
      }
      .outfit-card .card-build {
        position: absolute; top: 6px; right: 52px; border: 0; border-radius: 8px; background: rgba(0, 0, 0, 0.55); color: #fff;
        font: inherit; font-size: 11px; padding: 4px 8px; cursor: pointer; opacity: 0; transition: opacity 0.12s;
      }
      .outfit-card:hover .card-build, .outfit-card:focus-within .card-build { opacity: 1; }
      /* The heading over the MISC grid. A heading rather than a second panel: these
         squares upload through the same endpoint and save with the same button, so
         framing them as a separate thing would be lying about how they work. */
      .slot-group {
        margin: 22px 0 4px;
        font-size: 13px;
        font-weight: 650;
        letter-spacing: 0.02em;
        text-transform: uppercase;
        color: var(--oppai-text-muted);
      }
      .outfit-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        margin-top: 16px;
      }
      .outfit-actions .danger {
        margin-right: auto;
        color: var(--oppai-error, #f2b8b5);
      }
  `];

  connectedCallback() {
    super.connectedCallback();
    void this.loadOutfits();
  }

  /** Re-reads the wardrobe list. The studio calls this after filing a sprite, so the
   * counts on these cards stay in step with the art actually on disk. */
  async refresh() {
    await this.loadOutfits();
  }

  private async loadBackgrounds() {
    try {
      const res = await api.libbyBackgrounds();
      this.backgrounds = res.backgrounds;
      this.defaultBackground = res.default ?? "";
    } catch { /* An older server has none; the section simply shows nothing to pick. */ }
  }

  /** Marks a room as where she is by default, or clears it. */
  private async setDefaultBackground(id: string) {
    try {
      const res = await api.setLibbyDefaultBackground(id);
      this.defaultBackground = res.default;
      mascotSay(id ? "That's where she'll be unless a conversation moves her." : "No default room — the plain stage until she moves.", "success");
    } catch (e) {
      mascotSay((e as Error).message || "Couldn't set the default background.", "error");
    }
  }

  private async loadOutfits() {
    void this.loadBackgrounds();
    try {
      const res = await api.libbyOutfits();
      this.outfits = res.outfits;
      this.activities = res.activities ?? [];
      this.outfitError = "";
      // A worn outfit that has been deleted (possibly from another device) must not
      // leave the browser asking for art that is never coming.
      if (this.wornOutfit && !res.outfits.some((o) => o.id === this.wornOutfit)) {
        this.wornOutfit = "";
        saveLibbyOutfit("");
      }
    } catch (e) {
      this.outfitError = (e as Error).message || "Couldn't load your wardrobes.";
    }
  }

  render() {
    return html`
      <div class="wardrobe-intro">
        An outfit swaps Libby's artwork: one sprite per expression, per heat tier —
        ${TOTAL_SLOTS} in all for a complete wardrobe — plus one picture for each of the
        optional Misc states she can put herself into. An empty expression falls back to
        the calmer art, then to the bundled default; an empty Misc state falls back to
        the bundled Libby doing the same thing, then to her expression. Which outfit
        she wears is per-device. Click a card to wear it; Build opens it on the board.
      </div>
      ${this.outfitError ? html`<div class="wardrobe-error" role="alert">${this.outfitError}</div>` : nothing}
      <div class="outfit-cards">
        <!-- The bundled wardrobe is a card like any other, shown in its own art rather
             than as a "none" row: it is a look you choose, not the absence of one. -->
        <button
          class="outfit-card ${this.wornOutfit === "" ? "on" : ""}"
          @click=${() => this.wearOutfit("")}
          title="Wear Libby's default artwork"
        >
          <img class="cover" src=${defaultLibbyArt("happy", 1)} alt="Default Libby" />
          ${this.wornOutfit === "" ? html`<span class="worn-badge">Wearing</span>` : nothing}
          <div class="card-body">
            <div class="card-name">Default Libby</div>
            <div class="card-meta">Bundled artwork</div>
          </div>
        </button>
        ${this.outfits.map((o) => this.renderOutfitCard(o))}
        <button
          class="outfit-card"
          @click=${() => (this.outfitDraft = { name: "", existing: [], staged: {}, removed: [], level: 0 })}
          title="Create a new outfit"
        >
          <div class="cover-empty">
            <span>
              <span class="material-symbols-rounded" style="font-size:26px; display:block;">add</span>
              New outfit
            </span>
          </div>
          <div class="card-body">
            <div class="card-name">New outfit</div>
            <div class="card-meta">Drop in your own art</div>
          </div>
        </button>
      </div>
      ${this.outfitDraft ? this.renderOutfitEditor(this.outfitDraft) : nothing}
      ${this.renderBackgrounds()}
    `;
  }

  // ── backgrounds ─────────────────────────────────────────────────────────
  // Where she is on a video call. Each is a picture plus a name and a few tags —
  // "bedroom, night, lamp" — and the tags are what let her pick one herself when
  // the scene moves. Stored beside the outfits, chosen per conversation.

  private renderBackgrounds() {
    const d = this.backgroundDraft;
    return html`
      <div class="scene-head"><h3>Backgrounds</h3><span class="wardrobe-intro" style="margin:0">Rooms for the video call. Tag them so she can choose where she is; mark one as the default and every conversation starts there. A generated picture can become one from its right-click menu.</span></div>
      <div class="scene-cards">
        ${this.backgrounds.map((bg) => html`<button class="scene-card" title="Edit ${bg.name}" @click=${() => this.openBackgroundEditor(bg)}>
          ${bg.hasImage
            ? html`<img class="cover" src=${api.libbyBackgroundURL(bg.id, this.backgroundVersion)} alt=${bg.name} loading="lazy" />`
            : html`<div class="cover-empty">No picture yet</div>`}
          ${bg.id === this.defaultBackground ? html`<span class="default-badge">Default</span>` : nothing}
          <div class="card-body"><div class="card-name">${bg.name}</div><div class="card-meta">${bg.tags.length ? bg.tags.join(", ") : "No tags — she can only pick it by name"}</div></div>
        </button>`)}
        <button class="scene-card" title="Add a background" @click=${() => (this.backgroundDraft = { name: "", tags: "" })}>
          <div class="cover-empty"><span><span class="material-symbols-rounded" style="font-size:26px; display:block;">add</span>New background</span></div>
          <div class="card-body"><div class="card-name">New background</div><div class="card-meta">A room, a bed, a balcony…</div></div>
        </button>
      </div>
      ${d ? html`<div class="scene-editor">
        <label class="drop"
          @dragover=${(e: DragEvent) => { e.preventDefault(); (e.currentTarget as HTMLElement).classList.add("dragover"); }}
          @dragleave=${(e: DragEvent) => (e.currentTarget as HTMLElement).classList.remove("dragover")}
          @drop=${(e: DragEvent) => { e.preventDefault(); (e.currentTarget as HTMLElement).classList.remove("dragover"); this.stageBackground(e.dataTransfer?.files?.[0]); }}>
          ${d.image ? html`<img src=${d.image} alt="" />`
            : d.id && d.hasImage ? html`<img src=${api.libbyBackgroundURL(d.id, this.backgroundVersion)} alt="" />`
            : html`<span>Drop a picture here<br />or click to browse<br /><small>Landscape works best</small></span>`}
          <input type="file" accept="image/*" style="display:none;" @change=${(e: Event) => { const input = e.target as HTMLInputElement; this.stageBackground(input.files?.[0]); input.value = ""; }} />
        </label>
        <div class="scene-fields">
          <label>Name<input .value=${d.name} placeholder="Bedroom" maxlength="60" @input=${(e: Event) => (this.backgroundDraft = { ...d, name: (e.target as HTMLInputElement).value })} /></label>
          <label>Tags — what it is, comma separated<input .value=${d.tags} placeholder="bedroom, night, lamp, cosy" @input=${(e: Event) => (this.backgroundDraft = { ...d, tags: (e.target as HTMLInputElement).value })} /></label>
          <span class="wardrobe-intro" style="margin:0">She reads the name and the tags when deciding where to be: "going to bed" finds a room tagged bed, "somewhere darker" one tagged night.</span>
        </div>
        <div class="scene-actions">
          <button class="outfit-btn on" ?disabled=${this.backgroundBusy || !d.name.trim()} @click=${() => void this.saveBackground()}>${d.id ? "Save" : "Add background"}</button>
          <button class="outfit-btn" ?disabled=${this.backgroundBusy} @click=${() => (this.backgroundDraft = null)}>Cancel</button>
          ${d.id && d.hasImage ? html`<button class="outfit-btn ${d.id === this.defaultBackground ? "on" : ""}" ?disabled=${this.backgroundBusy}
            title="Where she is when a conversation has not moved her"
            @click=${() => void this.setDefaultBackground(d.id === this.defaultBackground ? "" : d.id!)}>
            ${d.id === this.defaultBackground ? "Default room ✓" : "Make this the default"}
          </button>` : nothing}
          ${d.id ? html`<button class="outfit-btn danger" ?disabled=${this.backgroundBusy} @click=${() => void this.deleteBackground()}>Delete</button>` : nothing}
        </div>
      </div>` : nothing}
    `;
  }

  private openBackgroundEditor(bg: LibbyBackground) {
    this.backgroundDraft = { id: bg.id, name: bg.name, tags: bg.tags.join(", "), hasImage: bg.hasImage };
  }

  private stageBackground(file: File | undefined) {
    if (!file || !this.backgroundDraft) return;
    const reader = new FileReader();
    reader.onload = () => { if (this.backgroundDraft) this.backgroundDraft = { ...this.backgroundDraft, image: String(reader.result) }; };
    reader.readAsDataURL(file);
  }

  private async saveBackground() {
    const d = this.backgroundDraft;
    if (!d || !d.name.trim()) return;
    this.backgroundBusy = true;
    try {
      const saved = await api.saveLibbyBackground({ id: d.id, name: d.name.trim(), tags: d.tags.split(",").map((t) => t.trim()).filter(Boolean) });
      if (d.image) await api.setLibbyBackgroundImage(saved.id, d.image);
      this.backgroundVersion++;
      this.backgroundDraft = null;
      await this.loadBackgrounds();
      if (!d.image && !d.hasImage) mascotSay("Saved — add a picture and she can go there.", "success");
    } catch (e) {
      mascotSay((e as Error).message || "Couldn't save that background.", "error");
    } finally { this.backgroundBusy = false; }
  }

  private async deleteBackground() {
    const d = this.backgroundDraft;
    if (!d?.id || !confirm(`Delete "${d.name}"?`)) return;
    this.backgroundBusy = true;
    try {
      await api.deleteLibbyBackground(d.id);
      this.backgroundDraft = null;
      await this.loadBackgrounds();
    } catch (e) {
      mascotSay((e as Error).message || "Couldn't delete that background.", "error");
    } finally { this.backgroundBusy = false; }
  }

  private wearOutfit(id: string) {
    this.wornOutfit = id;
    saveLibbyOutfit(id);
  }

  private openOutfitEditor(o: LibbyOutfit) {
    // Flatten the server's per-emotion tier lists into "emotion:level" keys; fall
    // back to the plain emotions list (tier 0) for older responses.
    const existing: string[] = [];
    if (o.emotionLevels) {
      for (const [emotion, levels] of Object.entries(o.emotionLevels)) {
        for (const level of levels) existing.push(slotKey(emotion, level));
      }
    } else {
      for (const emotion of o.emotions) existing.push(slotKey(emotion, 0));
    }
    // The MISC states share the emotion slots' storage and their "slot:level" keys, so
    // from here down the editor treats the two identically — one staging map, one save
    // loop, one upload endpoint.
    for (const [activity, levels] of Object.entries(o.activityLevels ?? {})) {
      for (const level of levels) existing.push(slotKey(activity, level));
    }
    this.outfitDraft = { id: o.id, name: o.name, existing, staged: {}, removed: [], level: 0, hasCover: o.hasThumb !== false };
  }

  /** Whether a slot id is one of the MISC states, which have one square each. */
  private isActivity(id: string): boolean {
    return this.activities.some((activity) => activity.id === id);
  }

  /** Stages a square's art for removal on Save, or un-stages it. */
  private toggleRemove(key: string) {
    const d = this.outfitDraft;
    if (!d) return;
    const removed = d.removed.includes(key) ? d.removed.filter((k) => k !== key) : [...d.removed, key];
    // Removing wins over a drop staged for the same square: the drop is discarded.
    const staged = { ...d.staged };
    if (!d.removed.includes(key)) delete staged[key];
    this.outfitDraft = { ...d, removed, staged };
  }

  /**
   * One droppable square: an expression or a MISC state, at the tier currently open.
   *
   * Shared by both grids deliberately. The two vocabularies mean different things to
   * Libby but nothing at all to the editor — the same staging map, the same key, the
   * same upload endpoint — and a second copy of this markup would be the place the two
   * quietly stopped behaving the same way.
   */
  private renderSlot(d: OutfitDraft, id: string, label: string, hint: string) {
    const level = this.isActivity(id) ? 0 : d.level;
    const key = slotKey(id, level);
    const staged = d.staged[key];
    const removed = d.removed.includes(key);
    const existing = !staged && d.id && d.existing.includes(key) ? api.libbyEmotionURL(d.id, id, level, this.outfitCoverVersion) : "";
    return html`
      <label
        class="slot ${removed ? "removed" : ""}"
        @dragover=${(e: DragEvent) => { e.preventDefault(); (e.currentTarget as HTMLElement).classList.add("dragover"); }}
        @dragleave=${(e: DragEvent) => (e.currentTarget as HTMLElement).classList.remove("dragover")}
        @drop=${(e: DragEvent) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement).classList.remove("dragover");
          this.stageEmotion(id, e.dataTransfer?.files?.[0]);
        }}
      >
        ${staged
          ? html`<img src=${staged} alt=${label} />`
          : existing
            ? html`<img src=${existing} alt=${label} />`
            : html`<div class="drop-hint">Drop an image here<br />or click to browse</div>`}
        ${existing || staged ? html`<span class="slot-actions">
          ${existing && d.id ? html`<button type="button" class="slot-act" title="Edit this sprite in the studio — adjust the cutout, redo it, or replace it"
            @click=${(e: Event) => { e.preventDefault(); e.stopPropagation(); this.requestEdit(d.id!, id, level); }}>
            <span class="material-symbols-rounded" style="font-size:16px;">edit</span></button>` : nothing}
          <button type="button" class="slot-act danger" title=${removed ? "Keep this sprite after all" : staged ? "Discard the dropped picture" : "Remove this sprite on save"}
            @click=${(e: Event) => { e.preventDefault(); e.stopPropagation(); staged ? this.unstage(key) : this.toggleRemove(key); }}>
            <span class="material-symbols-rounded" style="font-size:16px;">${removed ? "undo" : "delete"}</span></button>
        </span>` : nothing}
        <div class="slot-label">${label}${removed ? " — removing" : ""}</div>
        <div class="slot-hint">${hint}</div>
        <input
          type="file"
          accept="image/*"
          style="display:none;"
          @change=${(e: Event) => {
            const input = e.target as HTMLInputElement;
            this.stageEmotion(id, input.files?.[0]);
            input.value = "";
          }}
        />
      </label>
    `;
  }

  /**
   * The outfit's card art.
   *
   * A cover is optional by design — the server falls back to the outfit's own slot art
   * — so this is framed as an override rather than a required step. It is worth having
   * separately because covers and poses want different pictures: the slots are
   * portraits cropped to stand beside a conversation, and a good card is often a wider,
   * posed shot that would look wrong there.
   */
  private renderCoverPicker(d: OutfitDraft) {
    const showing = d.cover
      || (d.id && d.hasCover ? api.libbyOutfitThumbURL(d.id, this.outfitCoverVersion) : "");
    return html`<div class="cover-picker">
      ${showing
        ? html`<img src=${showing} alt="Outfit cover" />`
        : html`<div class="cover-blank">No cover</div>`}
      <div class="cover-copy">
        Card art for the wardrobe. Leave it empty and the card uses this outfit’s own
        artwork.
        <div class="row">
          <label class="outfit-btn">
            Choose cover
            <input
              type="file"
              accept="image/*"
              style="display:none;"
              @change=${(e: Event) => {
                const input = e.target as HTMLInputElement;
                this.stageCover(input.files?.[0]);
                input.value = "";
              }}
            />
          </label>
          ${d.cover || d.hasCover
            ? html`<button class="outfit-btn" @click=${() => this.clearCover()}>Use outfit art</button>`
            : nothing}
        </div>
      </div>
    </div>`;
  }

  private stageCover(file: File | undefined) {
    if (!file || !file.type.startsWith("image/") || !this.outfitDraft) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (!this.outfitDraft) return;
      this.outfitDraft = { ...this.outfitDraft, cover: String(reader.result) };
    };
    reader.readAsDataURL(file);
  }

  /**
   * Drops the chosen cover, returning the card to the outfit's own art.
   *
   * The server call happens now rather than on Save, unlike everything else in the
   * editor: there is nothing to stage — an absence cannot be previewed as a data URL —
   * and the operation is idempotent, so a cancelled edit that already cleared the cover
   * is a smaller surprise than a Save button that silently means two different things.
   */
  private async clearCover() {
    const d = this.outfitDraft;
    if (!d) return;
    this.outfitDraft = { ...d, cover: undefined, hasCover: false };
    if (!d.id) return;
    try {
      await api.clearLibbyOutfitThumb(d.id);
      this.outfitCoverVersion = Date.now();
      await this.loadOutfits();
    } catch (e) {
      this.outfitError = (e as Error).message;
    }
  }

  /** Reads a dropped/picked image file into the draft's staging area for the given
      slot at the tier currently open in the editor (a MISC state is always tier 0). */
  private stageEmotion(emotion: string, file: File | undefined) {
    if (!file || !file.type.startsWith("image/") || !this.outfitDraft) return;
    const key = slotKey(emotion, this.isActivity(emotion) ? 0 : this.outfitDraft.level);
    const reader = new FileReader();
    reader.onload = () => {
      if (!this.outfitDraft) return;
      this.outfitDraft = {
        ...this.outfitDraft,
        staged: { ...this.outfitDraft.staged, [key]: String(reader.result) },
        removed: this.outfitDraft.removed.filter((k) => k !== key),
      };
    };
    reader.readAsDataURL(file);
  }

  /** Drops a staged picture without touching what the server has. */
  private unstage(key: string) {
    const d = this.outfitDraft;
    if (!d) return;
    const staged = { ...d.staged };
    delete staged[key];
    this.outfitDraft = { ...d, staged };
  }

  /**
   * Asks the studio to open a finished sprite for editing.
   *
   * The wardrobe editor can replace a square but cannot adjust one — the cutout
   * editor and the generator live on the board — so it hands the square over. The
   * editor closes; the studio, if it is listening, takes it from here.
   */
  private requestEdit(outfitId: string, slot: string, level: number) {
    this.outfitDraft = null;
    this.dispatchEvent(new CustomEvent("edit-slot", {
      detail: { outfitId, slot, level }, bubbles: true, composed: true,
    }));
  }

  private async saveOutfit() {
    const d = this.outfitDraft;
    if (!d || !d.name.trim() || this.outfitBusy) return;
    this.outfitBusy = true;
    try {
      // Create (or rename) first so the emotion uploads have an id to hang off.
      const saved = await api.saveLibbyOutfit({ id: d.id, name: d.name.trim() });
      for (const key of d.removed) {
        const [emotion, level] = key.split(":");
        await api.deleteLibbyEmotion(saved.id, emotion, Number(level)).catch(() => undefined);
      }
      for (const [key, dataUrl] of Object.entries(d.staged)) {
        const [emotion, level] = key.split(":");
        await api.setLibbyEmotion(saved.id, emotion, dataUrl, Number(level));
      }
      // Sprite URLs are stable, so a replaced square would keep showing the picture
      // the browser already has. Bumping the version is what makes the save visible.
      this.outfitCoverVersion = Date.now();
      if (d.cover) {
        await api.setLibbyOutfitThumb(saved.id, d.cover);
        // The cover URL is otherwise stable, so a card would keep showing the picture
        // the browser already has. Bumping the version is what makes the save visible.
        this.outfitCoverVersion = Date.now();
      }
      this.outfitDraft = null;
      await this.loadOutfits();
    } catch (e) {
      this.outfitError = (e as Error).message;
    } finally {
      this.outfitBusy = false;
    }
  }

  private async deleteOutfit() {
    const d = this.outfitDraft;
    if (!d?.id || this.outfitBusy) return;
    // Deleting a wardrobe is the only thing that discards the studio's work in
    // progress, so the count is named here rather than found out afterwards.
    const wip = this.outfits.find((o) => o.id === d.id)?.wip ?? 0;
    const warning = wip
      ? `\n\nThis also deletes ${wip} generated square${wip === 1 ? "" : "s"} the outfit studio is holding for it.`
      : "";
    if (!confirm(`Delete the “${d.name}” outfit?${warning}`)) return;
    this.outfitBusy = true;
    try {
      await api.deleteLibbyOutfit(d.id);
      const line = libbyReact("libraryDelete");
      mascotSay(line.message, "success", { emotion: line.emotion, intensity: line.intensity });
      if (this.wornOutfit === d.id) this.wearOutfit("");
      this.outfitDraft = null;
      await this.loadOutfits();
    } catch (e) {
      this.outfitError = (e as Error).message;
    } finally {
      this.outfitBusy = false;
    }
  }

  /**
   * One outfit as a card.
   *
   * The card itself wears the outfit — that is the action you take on a wardrobe nine
   * times out of ten — and Edit is a corner affordance that only appears on hover, so
   * the common case is a single click on a picture. Clicking the worn one takes it
   * off, matching the old toggle.
   */
  private renderOutfitCard(o: LibbyOutfit) {
    const worn = this.wornOutfit === o.id;
    const slots = o.slots ?? o.emotions.length;
    return html`<button
      class="outfit-card ${worn ? "on" : ""}"
      @click=${() => this.wearOutfit(worn ? "" : o.id)}
      title=${worn ? `Take off “${o.name}”` : `Wear “${o.name}”`}
    >
      ${o.hasThumb === false
        ? html`<div class="cover-empty">No art yet</div>`
        : html`<img
            class="cover"
            src=${api.libbyOutfitThumbURL(o.id, this.outfitCoverVersion)}
            alt=${o.name}
            loading="lazy"
            @error=${(e: Event) => {
              // An outfit with no art at all 404s here. Swap in the placeholder rather
              // than leaving a broken image: "not drawn yet" is a real state, and the
              // list flag can be stale on an older server that never sent it.
              const img = e.target as HTMLImageElement;
              img.replaceWith(Object.assign(document.createElement("div"), {
                className: "cover-empty", textContent: "No art yet",
              }));
            }}
          />`}
      ${worn ? html`<span class="worn-badge">Wearing</span>` : nothing}
      <span
        class="card-build"
        role="button"
        tabindex="0"
        title=${`Open “${o.name}” on the board to generate or fix its squares`}
        @click=${(e: Event) => { e.stopPropagation(); this.requestBuild(o.id); }}
        @keydown=${(e: KeyboardEvent) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          e.stopPropagation();
          this.requestBuild(o.id);
        }}
      >Build</span>
      <span
        class="card-edit"
        role="button"
        tabindex="0"
        title=${`Edit “${o.name}”`}
        @click=${(e: Event) => { e.stopPropagation(); this.openOutfitEditor(o); }}
        @keydown=${(e: KeyboardEvent) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          e.stopPropagation();
          this.openOutfitEditor(o);
        }}
      >Edit</span>
      <div class="card-body">
        <div class="card-name">${o.name}</div>
        <div class="card-meta">
          ${o.emotions.length}/${LIBBY_EMOTION_SLOTS.length} emotions${slots > o.emotions.length
            ? html` · ${slots} images`
            : nothing}${o.activitySlots ? html` · ${o.activitySlots} misc` : nothing}
          <!-- Unfinished squares are the reason a wardrobe with no sprites is not an
               empty wardrobe: they are hours of generation the studio is holding. -->
          ${o.wip ? html`<br />${o.wip} in progress` : nothing}
        </div>
      </div>
    </button>`;
  }

  /** Asks the studio to open this wardrobe on its board. */
  private requestBuild(outfitId: string) {
    this.dispatchEvent(new CustomEvent("build-outfit", { detail: { outfitId }, bubbles: true, composed: true }));
  }

  private renderOutfitEditor(d: OutfitDraft) {
    return html`
      <div class="outfit-overlay" @click=${(e: Event) => { if (e.target === e.currentTarget) this.outfitDraft = null; }}>
        <div class="outfit-dialog">
          <h3>${d.id ? "Edit outfit" : "New outfit"}</h3>
          <input
            type="text"
            placeholder="Outfit name (Summer dress, Maid, …)"
            .value=${d.name}
            @input=${(e: Event) => (this.outfitDraft = { ...d, name: (e.target as HTMLInputElement).value })}
          />
          <div class="tier-tabs">
            ${LIBBY_TIERS.map(
              (label, level) => html`<button
                class="tier-tab ${d.level === level ? "on" : ""}"
                @click=${() => (this.outfitDraft = { ...d, level })}
                title="Shown as the horniness meter reaches this tier"
              >${label}</button>`,
            )}
          </div>
          <p class="tier-note">
            ${d.level === 0
              ? "Baseline art — worn when the meter is low, and the fallback for any tier you leave empty."
              : `Shown as Libby’s horniness meter climbs into the “${LIBBY_TIERS[d.level]}” range.`}
          </p>
          ${this.renderCoverPicker(d)}
          <div class="slots">
            ${LIBBY_EMOTION_SLOTS.map((em) => this.renderSlot(d, em.id, em.label,
              em.borrows ? `${em.hint} · Optional, borrows ${em.borrows}` : em.hint))}
          </div>
          ${this.activities.length ? html`
            <h4 class="slot-group">Misc — what she is doing</h4>
            <p class="tier-note">
              Optional, and separate from her expressions: these are the states she can
              put herself into — curled up reading, dozing, or a good deal less idle. One
              picture each, whatever the heat tier above says. She chooses one to fit the
              scene, and a state you have not drawn simply falls back to her expression,
              so there is no wrong number to leave empty. The intimate ones only become
              available to her as the heat climbs. Typing is the exception: the app shows
              it while she is writing you a reply.
            </p>
            <div class="slots">
              ${this.activities.map((activity) => this.renderSlot(d, activity.id, activity.auto ? `${activity.label} — while she writes` : activity.label,
                activity.auto ? "Shown with a speech bubble while a reply is on its way; she never picks it herself"
                  : activity.minIntensity > 1 ? `${activity.says} · from tier ${LIBBY_TIERS[activity.minIntensity - 1]}` : activity.says))}
            </div>
          ` : nothing}
          <div class="outfit-actions">
            ${d.id
              ? html`<button class="outfit-btn danger" ?disabled=${this.outfitBusy} @click=${() => this.deleteOutfit()}>
                  Delete outfit
                </button>`
              : nothing}
            <button class="outfit-btn" @click=${() => (this.outfitDraft = null)}>Cancel</button>
            <button
              class="btn-primary"
              ?disabled=${!d.name.trim() || this.outfitBusy}
              @click=${() => this.saveOutfit()}
            >
              ${this.outfitBusy ? "Saving…" : "Save outfit"}
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap { "oppai-outfit-wardrobe": OppaiOutfitWardrobe; }
}
