import { LitElement, css, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { api, mascotSay, type LibbyOutfit } from "../api.js";
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

/** Key for a staged/existing (emotion, tier) slot. */
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
  /** Which tier the editor is currently showing. */
  level: number;
}

@customElement("oppai-outfit-wardrobe")
export class OppaiOutfitWardrobe extends LitElement {
  @state() private outfits: LibbyOutfit[] = [];
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

  private async loadOutfits() {
    try {
      const res = await api.libbyOutfits();
      this.outfits = res.outfits;
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
        ${TOTAL_SLOTS} in all for a complete wardrobe. Anything left empty falls back to
        the calmer art, and then to the bundled default. Which outfit she wears is
        per-device.
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
          @click=${() => (this.outfitDraft = { name: "", existing: [], staged: {}, level: 0 })}
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
    `;
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
    this.outfitDraft = { id: o.id, name: o.name, existing, staged: {}, level: 0, hasCover: o.hasThumb !== false };
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
      emotion at the tier currently open in the editor. */
  private stageEmotion(emotion: string, file: File | undefined) {
    if (!file || !file.type.startsWith("image/") || !this.outfitDraft) return;
    const key = slotKey(emotion, this.outfitDraft.level);
    const reader = new FileReader();
    reader.onload = () => {
      if (!this.outfitDraft) return;
      this.outfitDraft = {
        ...this.outfitDraft,
        staged: { ...this.outfitDraft.staged, [key]: String(reader.result) },
      };
    };
    reader.readAsDataURL(file);
  }

  private async saveOutfit() {
    const d = this.outfitDraft;
    if (!d || !d.name.trim() || this.outfitBusy) return;
    this.outfitBusy = true;
    try {
      // Create (or rename) first so the emotion uploads have an id to hang off.
      const saved = await api.saveLibbyOutfit({ id: d.id, name: d.name.trim() });
      for (const [key, dataUrl] of Object.entries(d.staged)) {
        const [emotion, level] = key.split(":");
        await api.setLibbyEmotion(saved.id, emotion, dataUrl, Number(level));
      }
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
            : nothing}
          <!-- Unfinished squares are the reason a wardrobe with no sprites is not an
               empty wardrobe: they are hours of generation the studio is holding. -->
          ${o.wip ? html`<br />${o.wip} in progress` : nothing}
        </div>
      </div>
    </button>`;
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
            ${LIBBY_EMOTION_SLOTS.map((em) => {
              const key = slotKey(em.id, d.level);
              const staged = d.staged[key];
              const existing = !staged && d.id && d.existing.includes(key)
                ? api.libbyEmotionURL(d.id, em.id, d.level)
                : "";
              return html`
                <label
                  class="slot"
                  @dragover=${(e: DragEvent) => {
                    e.preventDefault();
                    (e.currentTarget as HTMLElement).classList.add("dragover");
                  }}
                  @dragleave=${(e: DragEvent) =>
                    (e.currentTarget as HTMLElement).classList.remove("dragover")}
                  @drop=${(e: DragEvent) => {
                    e.preventDefault();
                    (e.currentTarget as HTMLElement).classList.remove("dragover");
                    this.stageEmotion(em.id, e.dataTransfer?.files?.[0]);
                  }}
                >
                  ${staged
                    ? html`<img src=${staged} alt=${em.label} />`
                    : existing
                      ? html`<img src=${existing} alt=${em.label} />`
                      : html`<div class="drop-hint">Drop an image here<br />or click to browse</div>`}
                  <div class="slot-label">${em.label}</div>
                  <div class="slot-hint">
                    ${em.hint}${em.borrows
                      ? html`<br /><span style="opacity:.75;">Optional — borrows ${em.borrows}</span>`
                      : nothing}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    style="display:none;"
                    @change=${(e: Event) => {
                      const input = e.target as HTMLInputElement;
                      this.stageEmotion(em.id, input.files?.[0]);
                      input.value = "";
                    }}
                  />
                </label>
              `;
            })}
          </div>
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
