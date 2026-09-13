import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { api, type LibbyBackground } from "../api.js";
import { iconStyles } from "../theme.js";

/**
 * Managing the rooms she can be in.
 *
 * These existed on the server and on Android, and on the desktop they could only be
 * reached from inside the outfit studio's wardrobe screen — which is where you go to
 * dress her, not to decide where she is. So on the big screen the feature was
 * effectively undiscoverable, and the half of it the studio never exposed (choosing
 * which room is the default) could not be reached at all.
 *
 * This is the Android section's counterpart: the same four operations, laid out the
 * way a desktop can afford to lay them out — the pictures big enough to tell apart,
 * and every control on the card it belongs to rather than behind a dialog.
 *
 * A background with no picture is kept and shown, greyed: the record and its image are
 * two separate writes on the server, so a half-made background is a real state the user
 * can land in, and hiding it would leave something that exists and cannot be finished.
 * She is never moved to one — see backgroundDirective, which skips them.
 */
@customElement("oppai-libby-backgrounds")
export class OppaiLibbyBackgrounds extends LitElement {
  /** Set when a panel that has its own heading embeds this; the head is dropped. */
  @property({ type: Boolean }) embedded = false;
  @state() private backgrounds: LibbyBackground[] = [];
  @state() private defaultID = "";
  @state() private loading = true;
  @state() private busy = false;
  @state() private note = "";
  @state() private bad = false;
  /** Which card is open for editing; "new" while adding one. */
  @state() private editing: string | null = null;
  @state() private draftName = "";
  @state() private draftTags = "";
  /**
   * Bumped after every picture upload and used as a cache-buster on the image URL.
   * The URL is by id and never changes, so a replaced picture would otherwise keep
   * showing the old one until a hard reload — which reads as the upload having failed.
   */
  @state() private version = Date.now();

  static styles = [iconStyles, css`
    :host { display: block; }
    .head { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 14px; }
    .head h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 4px; font-size: 15px; }
    .head p { margin: 0; color: var(--oppai-text-muted); font-size: 12.5px; line-height: 1.5; max-width: 62ch; }
    .head .spacer { flex: 1; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 12px; }
    .card {
      display: flex; flex-direction: column; min-width: 0;
      border: 1px solid var(--oppai-border); border-radius: 14px;
      background: var(--oppai-surface-2); overflow: hidden;
    }
    .card.is-default { border-color: var(--oppai-primary); }
    .shot { position: relative; aspect-ratio: 16 / 10; background: var(--oppai-surface); display: grid; place-items: center; }
    .shot img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .shot .none { color: var(--oppai-text-muted); font-size: 12px; text-align: center; padding: 8px; }
    .flag {
      position: absolute; top: 8px; left: 8px; padding: 3px 8px; border-radius: 999px;
      background: var(--oppai-primary); color: var(--oppai-on-primary); font-size: 10.5px; font-weight: 700;
      letter-spacing: .04em; text-transform: uppercase;
    }
    .body { display: grid; gap: 4px; padding: 10px 12px; }
    .name { font-weight: 650; font-size: 13.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .tags { color: var(--oppai-text-muted); font-size: 11.5px; line-height: 1.4; min-height: 1.4em; }
    .acts { display: flex; flex-wrap: wrap; gap: 4px; padding: 0 8px 9px; }
    button, .file {
      display: inline-flex; align-items: center; gap: 4px; padding: 5px 10px;
      border: 1px solid var(--oppai-border); border-radius: 999px;
      background: transparent; color: var(--oppai-text-dim); cursor: pointer; font: inherit; font-size: 11.5px;
    }
    button:hover:not(:disabled), .file:hover { color: var(--oppai-text); border-color: var(--oppai-border-strong); }
    button:disabled { opacity: .5; cursor: default; }
    button.primary { background: var(--oppai-primary); border-color: var(--oppai-primary); color: var(--oppai-on-primary); }
    button.danger:hover:not(:disabled) { color: #f2b8b5; border-color: #f2b8b5; }
    .file input { display: none; }
    .material-symbols-rounded { font-size: 15px; }
    .edit { display: grid; gap: 8px; padding: 10px 12px; border-top: 1px solid var(--oppai-border); }
    .edit label { display: grid; gap: 3px; font-size: 11px; font-weight: 700; letter-spacing: .04em;
      text-transform: uppercase; color: var(--oppai-text-muted); }
    .edit input {
      padding: 7px 9px; border: 1px solid var(--oppai-border); border-radius: 8px;
      background: var(--oppai-surface); color: var(--oppai-text); font: inherit; font-size: 13px;
      letter-spacing: normal; text-transform: none;
    }
    .edit .row { display: flex; gap: 6px; }
    .new {
      display: grid; place-items: center; gap: 6px; min-height: 150px;
      border: 1.5px dashed var(--oppai-border); border-radius: 14px;
      background: transparent; color: var(--oppai-text-muted); cursor: pointer; font-size: 12.5px;
    }
    .new:hover { border-color: var(--oppai-primary); color: var(--oppai-text); }
    .new .material-symbols-rounded { font-size: 28px; }
    .note { margin: 12px 0 0; padding: 9px 12px; border-radius: 10px; background: var(--oppai-surface-2); font-size: 12.5px; }
    .note.bad { background: color-mix(in srgb, #f2b8b5 16%, transparent); color: #f2b8b5; }
    .empty { padding: 26px; text-align: center; color: var(--oppai-text-muted); font-size: 13px; }
  `];

  connectedCallback() {
    super.connectedCallback();
    void this.reload();
  }

  private async reload() {
    this.loading = true;
    try {
      const res = await api.libbyBackgrounds();
      this.backgrounds = res.backgrounds ?? [];
      this.defaultID = res.default ?? "";
    } catch (error) {
      this.say((error as Error).message, true);
    } finally {
      this.loading = false;
    }
  }

  private say(text: string, bad = false) { this.note = text; this.bad = bad; }

  /** Tells whoever embeds this that the rooms or the default moved — the chat stage
      draws the default room and would otherwise keep the old one until remounted. */
  private changed() { this.dispatchEvent(new CustomEvent("changed", { bubbles: true, composed: true })); }

  private startNew() {
    this.editing = "new";
    this.draftName = "";
    this.draftTags = "";
  }

  private startEdit(bg: LibbyBackground) {
    this.editing = bg.id;
    this.draftName = bg.name;
    this.draftTags = bg.tags.join(", ");
  }

  private async save(id?: string) {
    const name = this.draftName.trim();
    if (!name) { this.say("A background needs a name.", true); return; }
    this.busy = true;
    try {
      await api.saveLibbyBackground({
        id,
        name,
        tags: this.draftTags.split(",").map((tag) => tag.trim()).filter(Boolean),
      });
      this.editing = null;
      await this.reload();
      this.changed();
      this.say(id ? `Saved ${name}.` : `Added ${name}. Give it a picture so she can go there.`);
    } catch (error) {
      this.say((error as Error).message, true);
    } finally {
      this.busy = false;
    }
  }

  private async uploadPicture(id: string, event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    this.busy = true;
    try {
      const dataURL = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      await api.setLibbyBackgroundImage(id, dataURL);
      this.version = Date.now();
      await this.reload();
      this.changed();
      this.say("Picture saved.");
    } catch (error) {
      this.say((error as Error).message, true);
    } finally {
      this.busy = false;
    }
  }

  private async makeDefault(id: string) {
    this.busy = true;
    try {
      // Tapping the current default clears it, which is how "nowhere in particular"
      // is expressed — there is no third state to toggle through.
      const next = this.defaultID === id ? "" : id;
      await api.setLibbyDefaultBackground(next);
      this.defaultID = next;
      this.changed();
      this.say(next ? "She starts here now." : "No default room — she starts nowhere in particular.");
    } catch (error) {
      this.say((error as Error).message, true);
    } finally {
      this.busy = false;
    }
  }

  private async deleteBackground(bg: LibbyBackground) {
    if (!confirm(`Delete ${bg.name}?`)) return;
    this.busy = true;
    try {
      await api.deleteLibbyBackground(bg.id);
      await this.reload();
      this.changed();
      this.say(`Deleted ${bg.name}.`);
    } catch (error) {
      this.say((error as Error).message, true);
    } finally {
      this.busy = false;
    }
  }

  private renderEditor(id?: string) {
    return html`<div class="edit">
      <label>Name
        <input type="text" .value=${this.draftName} placeholder="Bedroom" ?disabled=${this.busy}
          @input=${(e: Event) => (this.draftName = (e.target as HTMLInputElement).value)} /></label>
      <label>Tags, comma separated
        <input type="text" .value=${this.draftTags} placeholder="bedroom, night, lamp, cosy" ?disabled=${this.busy}
          @input=${(e: Event) => (this.draftTags = (e.target as HTMLInputElement).value)} /></label>
      <div class="row">
        <button class="primary" ?disabled=${this.busy} @click=${() => void this.save(id)}>${id ? "Save" : "Add"}</button>
        <button ?disabled=${this.busy} @click=${() => (this.editing = null)}>Cancel</button>
      </div>
    </div>`;
  }

  render() {
    return html`
      ${this.embedded ? nothing : html`<div class="head">
        <div>
          <h3><span class="material-symbols-rounded">wallpaper</span>Backgrounds</h3>
          <p>
            The rooms behind her on a video call. Tag each one with what it is —
            "bedroom, night, cosy" — and she moves herself between them as the
            conversation goes, the same way she picks an expression. A background with
            no picture is never used.
          </p>
        </div>
        <div class="spacer"></div>
      </div>`}

      ${this.loading
        ? html`<div class="empty">Loading…</div>`
        : html`<div class="grid">
            ${this.backgrounds.map((bg) => html`
              <div class="card ${bg.id === this.defaultID ? "is-default" : ""}">
                <div class="shot">
                  ${bg.hasImage
                    ? html`<img src=${api.libbyBackgroundURL(bg.id, this.version)} alt=${`${bg.name} background`} />`
                    : html`<span class="none">No picture yet —<br />she won't go here</span>`}
                  ${bg.id === this.defaultID ? html`<span class="flag">Default</span>` : nothing}
                </div>
                <div class="body">
                  <span class="name">${bg.name}</span>
                  <span class="tags">${bg.tags.length ? bg.tags.join(", ") : "No tags — she can only reach it by name"}</span>
                </div>
                ${this.editing === bg.id ? this.renderEditor(bg.id) : html`
                  <div class="acts">
                    <label class="file">
                      <input type="file" accept="image/*" @change=${(e: Event) => void this.uploadPicture(bg.id, e)} />
                      <span class="material-symbols-rounded">image</span>${bg.hasImage ? "Replace" : "Add picture"}
                    </label>
                    <button ?disabled=${this.busy} @click=${() => this.startEdit(bg)}>
                      <span class="material-symbols-rounded">edit</span>Rename</button>
                    <button ?disabled=${this.busy || !bg.hasImage}
                      title=${bg.hasImage ? "Where she is when nobody has said" : "Needs a picture first"}
                      @click=${() => void this.makeDefault(bg.id)}>
                      <span class="material-symbols-rounded">${bg.id === this.defaultID ? "star" : "star_outline"}</span>
                      ${bg.id === this.defaultID ? "Default" : "Make default"}</button>
                    <button class="danger" ?disabled=${this.busy} @click=${() => void this.deleteBackground(bg)}>
                      <span class="material-symbols-rounded">delete</span>Delete</button>
                  </div>`}
              </div>`)}
            ${this.editing === "new"
              ? html`<div class="card">${this.renderEditor()}</div>`
              : html`<button class="new" ?disabled=${this.busy} @click=${() => this.startNew()}>
                  <span class="material-symbols-rounded">add_photo_alternate</span>
                  New background</button>`}
          </div>`}

      ${!this.loading && !this.backgrounds.length && this.editing !== "new"
        ? html`<div class="empty">No rooms yet. Add one, give it a picture, and she can start moving around.</div>`
        : nothing}
      ${this.note ? html`<p class="note ${this.bad ? "bad" : ""}">${this.note}</p>` : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap { "oppai-libby-backgrounds": OppaiLibbyBackgrounds }
}
