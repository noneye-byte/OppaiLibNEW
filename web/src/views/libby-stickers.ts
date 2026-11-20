import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { api, type LibbySticker } from "../api.js";
import { iconStyles } from "../theme.js";

/**
 * Her shelf of reaction images.
 *
 * Memes and gifs the user puts here for her to send, the way anyone drops a reaction gif
 * into a chat. She picks one by its label — the label is the whole of what she knows
 * about it — so the label is the field every card leads with, edited where it is shown,
 * and a file arrives already labelled from its own name ("happy_dance.gif" is a "happy
 * dance") so a folder can be dropped on in one go and tidied after.
 *
 * Files are sent to the server as they are: re-encoding a GIF is how it stops moving.
 */
@customElement("oppai-libby-stickers")
export class OppaiLibbyStickers extends LitElement {
  /** Set when a panel that has its own heading embeds this; the head is dropped. */
  @property({ type: Boolean }) embedded = false;
  @state() private items: LibbySticker[] = [];
  @state() private loading = true;
  @state() private uploading = 0;
  @state() private note = "";
  @state() private bad = false;
  @state() private dragging = false;

  static styles = [iconStyles, css`
    :host { display: block; }
    .head { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 14px; }
    .head h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 4px; font-size: 15px; }
    .head p { margin: 0; color: var(--oppai-text-muted); font-size: 12.5px; line-height: 1.5; max-width: 62ch; }
    .head .spacer { flex: 1; }
    .drop { border: 1px dashed var(--oppai-border); border-radius: 14px; padding: 12px; transition: border-color .12s ease, background .12s ease; }
    .drop.over { border-color: var(--oppai-primary); background: color-mix(in srgb, var(--oppai-primary) 8%, transparent); }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
    .card { display: flex; flex-direction: column; min-width: 0; border: 1px solid var(--oppai-border); border-radius: 12px;
      background: var(--oppai-surface-2); overflow: hidden; }
    .shot { position: relative; aspect-ratio: 1; background: var(--oppai-surface); display: grid; place-items: center; }
    .shot img, .shot video { width: 100%; height: 100%; object-fit: contain; display: block; }
    .remove { position: absolute; top: 6px; right: 6px; width: 26px; height: 26px; padding: 0; justify-content: center;
      border-radius: 50%; background: rgba(0,0,0,.55); border-color: transparent; color: #fff; }
    .body { display: grid; gap: 3px; padding: 7px 8px 8px; }
    .label { width: 100%; box-sizing: border-box; border: 1px solid transparent; border-radius: 8px; padding: 4px 6px;
      background: transparent; color: var(--oppai-text); font: inherit; font-size: 13px; font-weight: 600; }
    .label:hover, .label:focus { border-color: var(--oppai-border); background: var(--oppai-surface); outline: none; }
    .sent { color: var(--oppai-text-muted); font-size: 11px; padding: 0 6px; }
    .empty { color: var(--oppai-text-muted); font-size: 12.5px; padding: 18px 6px; text-align: center; }
    button, .file { display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px;
      border: 1px solid var(--oppai-border); border-radius: 999px; background: transparent;
      color: var(--oppai-text-dim); cursor: pointer; font: inherit; font-size: 12px; }
    button:hover:not(:disabled), .file:hover { color: var(--oppai-text); border-color: var(--oppai-border-strong); }
    .file.primary { background: var(--oppai-primary); border-color: var(--oppai-primary); color: var(--oppai-on-primary); }
    .file input { display: none; }
    .material-symbols-rounded { font-size: 16px; }
    .note { margin: 10px 0 0; font-size: 12px; color: var(--oppai-text-muted); }
    .note.bad { color: #f2b8b5; }
  `];

  connectedCallback() {
    super.connectedCallback();
    void this.load();
  }

  private async load() {
    try {
      this.items = (await api.libbyStickers()).items ?? [];
    } catch (error) {
      this.tell((error as Error).message, true);
    } finally {
      this.loading = false;
    }
  }

  private tell(note: string, bad = false) {
    this.note = note;
    this.bad = bad;
  }

  private changed() {
    this.dispatchEvent(new CustomEvent("changed", { bubbles: true, composed: true }));
  }

  /** One file at a time, in the order chosen: a shelf of gifs is tens of megabytes, and
      a failure names the file it was. */
  private async add(files: File[]) {
    if (!files.length) return;
    this.uploading = files.length;
    const failed: string[] = [];
    for (const file of files) {
      try {
        const item = await api.uploadLibbySticker(file);
        this.items = [...this.items, item];
      } catch (error) {
        failed.push(`${file.name}: ${(error as Error).message}`);
      }
      this.uploading--;
    }
    if (failed.length) this.tell(failed.join(" · "), true);
    else this.tell(`Added ${files.length}. Each is labelled from its file name — rename any she should know by something else.`);
    this.changed();
  }

  private async rename(item: LibbySticker, label: string) {
    label = label.trim();
    if (!label || label.toLowerCase() === item.label) return;
    try {
      const saved = await api.updateLibbySticker(item.id, { label });
      this.items = this.items.map((it) => (it.id === item.id ? saved : it));
      this.changed();
    } catch (error) {
      this.tell((error as Error).message, true);
    }
  }

  private async takeOff(item: LibbySticker) {
    if (!window.confirm(`Take “${item.label}” off her shelf?`)) return;
    try {
      await api.deleteLibbySticker(item.id);
      this.items = this.items.filter((it) => it.id !== item.id);
      this.changed();
    } catch (error) {
      this.tell((error as Error).message, true);
    }
  }

  private onDrop(event: DragEvent) {
    event.preventDefault();
    this.dragging = false;
    void this.add([...(event.dataTransfer?.files ?? [])]);
  }

  private renderCard(item: LibbySticker) {
    const url = api.libbyStickerURL(item.id);
    return html`<article class="card">
      <div class="shot">
        ${item.mime.startsWith("video/")
          ? html`<video src=${url} autoplay muted loop playsinline aria-label=${item.label}></video>`
          : html`<img src=${url} alt=${item.label} loading="lazy"/>`}
        <button class="remove" title="Remove ${item.label}" aria-label="Remove ${item.label}" @click=${() => void this.takeOff(item)}>
          <span class="material-symbols-rounded">close</span></button>
      </div>
      <div class="body">
        <input class="label" .value=${item.label} aria-label="Label for this reaction image" title="What she knows it by"
          @change=${(event: Event) => void this.rename(item, (event.target as HTMLInputElement).value)}
          @keydown=${(event: KeyboardEvent) => { if (event.key === "Enter") (event.target as HTMLInputElement).blur(); }}/>
        <span class="sent">${item.sent ? `Sent ${item.sent}×` : "Not sent yet"}</span>
      </div>
    </article>`;
  }

  render() {
    return html`
      ${this.embedded ? nothing : html`<div class="head"><div><h3><span class="material-symbols-rounded">mood</span>Reaction images</h3></div></div>`}
      <div class="head">
        <p>Memes and gifs for her to send in chat, when one says it better than words. She picks them by their label, so name each for the moment it's for — “facepalm”, “happy dance”, “not impressed”. GIFs, pictures and short MP4/WebM clips, up to 16 MB each.</p>
        <span class="spacer"></span>
        <label class="file primary"><span class="material-symbols-rounded">upload</span>${this.uploading ? `Adding ${this.uploading}…` : "Add"}
          <input type="file" multiple accept="image/gif,image/png,image/jpeg,image/webp,video/mp4,video/webm"
            @change=${(event: Event) => { const input = event.target as HTMLInputElement; void this.add([...(input.files ?? [])]); input.value = ""; }}/></label>
      </div>
      <div class="drop ${this.dragging ? "over" : ""}"
        @dragover=${(event: DragEvent) => { event.preventDefault(); this.dragging = true; }}
        @dragleave=${() => (this.dragging = false)}
        @drop=${this.onDrop}>
        ${this.loading ? html`<div class="empty">Loading…</div>`
          : this.items.length ? html`<div class="grid">${this.items.map((item) => this.renderCard(item))}</div>`
          : html`<div class="empty">No reaction images yet. Drop some here, or press Add.</div>`}
      </div>
      ${this.note ? html`<p class="note ${this.bad ? "bad" : ""}">${this.note}</p>` : nothing}`;
  }
}

declare global {
  interface HTMLElementTagNameMap { "oppai-libby-stickers": OppaiLibbyStickers }
}
