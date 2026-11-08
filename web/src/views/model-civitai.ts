import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { iconStyles } from "../theme.js";
import { api, type CivitaiComment, type CivitaiImage, type CivitaiModel, type GenModelMeta } from "../api.js";
import { addCommunityPage, creatorPictures } from "../model-pictures.js";

/**
 * The top of the checkpoint / LoRA editor: its picture, and its Civitai page.
 *
 * The cover could only be changed from the Civitai screen's management panel, and only to
 * one of the creator's showcase pictures. Here it is changed where the model is edited, to
 * any of the creator's pictures or any picture someone else posted made with it — the
 * pictures under its reviews and comments. And the comments themselves are here, for
 * reading what people found before trusting a weight.
 *
 * Nothing is saved from here: a pick is sent up as `cover-pick` and the editor applies it
 * with everything else on Save.
 */
type Pane = "" | "creator" | "community" | "comments";

@customElement("oppai-model-civitai")
export class OppaiModelCivitai extends LitElement {
  @property({ attribute: false }) meta: GenModelMeta | null = null;
  /** The picture it has now. */
  @property() thumb = "";
  /** A picture picked and not saved yet, by its Civitai URL. */
  @property() chosen = "";

  @state() private pane: Pane = "";
  @state() private model: CivitaiModel | null = null;
  @state() private community: CivitaiImage[] = [];
  @state() private communityCursor = "";
  @state() private comments: CivitaiComment[] = [];
  @state() private commentsCursor = "";
  @state() private loading = false;
  @state() private problem = "";
  @state() private linking = false;
  private loaded = new Set<Pane>();

  static styles = [
    iconStyles,
    css`
      :host { display: block; }
      button { font: inherit; }
      .head { display: grid; grid-template-columns: 84px minmax(0, 1fr); gap: 12px; align-items: center; }
      .pic {
        width: 84px; aspect-ratio: 4 / 5; border-radius: 12px; overflow: hidden; background: var(--oppai-surface);
        border: 1px solid var(--oppai-border-strong); display: grid; place-items: center; color: var(--oppai-text-muted);
      }
      .pic img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .who { min-width: 0; display: flex; flex-direction: column; gap: 6px; }
      .who b { font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .who small { font-size: 11.5px; color: var(--oppai-text-muted); line-height: 1.4; }
      .who a { color: var(--oppai-primary-bright, var(--oppai-primary)); text-decoration: none; }
      .who a:hover { text-decoration: underline; }
      .tabs { display: flex; flex-wrap: wrap; gap: 6px; }
      .tab {
        height: 30px; padding: 0 11px; border-radius: 15px; border: 1px solid var(--oppai-border-strong); background: none;
        color: var(--oppai-text-dim); font-size: 12px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;
      }
      .tab .material-symbols-rounded { font-size: 16px; }
      .tab.on { background: var(--oppai-accent); border-color: var(--oppai-accent); color: var(--oppai-on-accent); }
      .tab:disabled { opacity: 0.5; cursor: default; }
      .body { margin-top: 10px; }
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); gap: 6px; max-height: 300px; overflow-y: auto; padding: 2px; }
      .tile {
        position: relative; aspect-ratio: 4 / 5; border-radius: 10px; overflow: hidden; padding: 0; cursor: pointer;
        border: 2px solid transparent; background: var(--oppai-surface);
      }
      .tile img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .tile.on { border-color: var(--oppai-primary); }
      .tile .by {
        position: absolute; left: 0; right: 0; bottom: 0; padding: 10px 5px 3px; font-size: 10px; color: #fff; text-align: left;
        background: linear-gradient(transparent, rgba(0, 0, 0, 0.7)); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }
      .tile .check {
        position: absolute; top: 4px; right: 4px; width: 22px; height: 22px; border-radius: 11px; display: grid; place-items: center;
        background: var(--oppai-primary); color: var(--oppai-on-primary); font-size: 15px;
      }
      .note { font-size: 12px; color: var(--oppai-text-muted); line-height: 1.5; padding: 6px 2px; }
      .note a { color: var(--oppai-primary-bright, var(--oppai-primary)); }
      .err { color: var(--oppai-error, #f2b8b5); }
      .more { margin-top: 8px; }
      .comments { display: flex; flex-direction: column; gap: 10px; max-height: 340px; overflow-y: auto; padding-right: 4px; }
      .comment { display: grid; grid-template-columns: 28px minmax(0, 1fr); gap: 8px; }
      .avatar { width: 28px; height: 28px; border-radius: 14px; background: var(--oppai-surface); object-fit: cover; }
      .comment .meta { font-size: 11.5px; color: var(--oppai-text-muted); display: flex; gap: 8px; flex-wrap: wrap; }
      .comment .meta b { color: var(--oppai-text); }
      .comment .text { font-size: 12.5px; line-height: 1.5; color: var(--oppai-text-dim); overflow-wrap: anywhere; }
      .comment .text p { margin: 2px 0; }
      .comment .text a { color: var(--oppai-primary-bright, var(--oppai-primary)); }
    `,
  ];

  protected willUpdate(changed: Map<PropertyKey, unknown>) {
    // Another model in the same editor starts from nothing.
    const before = changed.get("meta") as GenModelMeta | null | undefined;
    if (changed.has("meta") && before?.key !== this.meta?.key) {
      this.pane = "";
      this.model = null;
      this.community = [];
      this.comments = [];
      this.communityCursor = this.commentsCursor = this.problem = "";
      this.loaded = new Set();
    }
  }

  private get link() {
    return this.meta?.civitai;
  }

  private open(pane: Pane) {
    this.pane = this.pane === pane ? "" : pane;
    this.problem = "";
    if (this.pane && !this.loaded.has(this.pane)) void this.load(this.pane);
  }

  private async load(pane: Pane, more = false) {
    const link = this.link;
    if (!link || this.loading) return;
    this.loading = true;
    this.problem = "";
    try {
      if (pane === "creator") {
        this.model ??= await api.civitaiModel(link.modelId);
      } else if (pane === "community") {
        const page = await api.civitaiImages({
          versionId: link.versionId || undefined, modelId: link.versionId ? undefined : link.modelId,
          sort: "Most Reactions", nsfw: true, cursor: more ? this.communityCursor : undefined,
        });
        this.community = addCommunityPage(more ? this.community : [], page.items ?? [], link.creator);
        this.communityCursor = page.nextCursor ?? "";
      } else if (pane === "comments") {
        const page = await api.civitaiComments(link.modelId, more ? this.commentsCursor : undefined);
        this.comments = more ? [...this.comments, ...page.items] : page.items;
        this.commentsCursor = page.nextCursor ?? "";
      }
      this.loaded = new Set(this.loaded).add(pane);
    } catch (e) {
      this.problem = (e as Error).message;
    } finally {
      this.loading = false;
    }
  }

  private pick(url: string) {
    this.dispatchEvent(new CustomEvent("cover-pick", { detail: { url: this.chosen === url ? "" : url } }));
  }

  /** Looks the file up on Civitai by its hash, for a model that was never linked. */
  private async findOnCivitai() {
    if (!this.meta || this.linking) return;
    this.linking = true;
    this.problem = "";
    try {
      const link = await api.civitaiSync(this.meta.key);
      if ("modelId" in link && link.modelId) this.dispatchEvent(new CustomEvent("linked"));
      else this.problem = "Civitai does not know this file — it may be a private or retrained copy.";
    } catch (e) {
      this.problem = (e as Error).message;
    } finally {
      this.linking = false;
    }
  }

  render() {
    const link = this.link;
    const shown = this.chosen ? api.civitaiImageURL(this.chosen) : this.thumb;
    return html`
      <div class="head">
        <div class="pic">
          ${shown
            ? html`<img src=${shown} alt="" @error=${(e: Event) => ((e.target as HTMLImageElement).style.display = "none")} />`
            : html`<span class="material-symbols-rounded">image</span>`}
        </div>
        <div class="who">
          ${link
            ? html`<b title=${link.modelName}>${link.modelName}</b>
                <small>${link.versionName ? `${link.versionName} · ` : ""}${link.creator ? `by ${link.creator} · ` : ""}<a
                  href=${link.page} target="_blank" rel="noopener noreferrer">Open on Civitai</a>
                  ${this.chosen ? html` · <span>new picture, saved with Save</span>` : nothing}</small>
                <div class="tabs">
                  <button class="tab ${this.pane === "creator" ? "on" : ""}" @click=${() => this.open("creator")}>
                    <span class="material-symbols-rounded">photo_library</span>Creator's pictures</button>
                  <button class="tab ${this.pane === "community" ? "on" : ""}" @click=${() => this.open("community")}>
                    <span class="material-symbols-rounded">group</span>From the community</button>
                  <button class="tab ${this.pane === "comments" ? "on" : ""}" @click=${() => this.open("comments")}>
                    <span class="material-symbols-rounded">forum</span>Comments</button>
                </div>`
            : html`<b>Not linked to Civitai</b>
                <small>Linked, its picture can be any from its Civitai page, and its comments read here.</small>
                <div class="tabs">
                  <button class="tab" ?disabled=${this.linking} @click=${() => void this.findOnCivitai()}>
                    <span class="material-symbols-rounded">search</span>${this.linking ? "Looking…" : "Find it on Civitai"}</button>
                </div>`}
        </div>
      </div>
      ${this.problem && !this.pane ? html`<div class="note err">${this.problem}</div>` : nothing}
      ${this.pane ? html`<div class="body">${this.renderPane()}</div>` : nothing}
    `;
  }

  private renderPane() {
    if (this.pane === "comments") return this.renderComments();
    const pictures: { url: string; by?: string }[] = this.pane === "creator"
      ? creatorPictures(this.model, this.link?.versionId ?? 0).map((url) => ({ url }))
      : this.community.map((i) => ({ url: i.url, by: i.username }));
    return html`
      ${this.problem ? html`<div class="note err">${this.problem}</div>` : nothing}
      ${pictures.length
        ? html`<div class="grid">${pictures.map((p) => html`<button class="tile ${this.chosen === p.url ? "on" : ""}"
            title=${p.by ? `Posted by ${p.by}` : "From the creator's showcase"} @click=${() => this.pick(p.url)}>
            <img src=${api.civitaiImageURL(p.url)} alt="" loading="lazy" />
            ${p.by ? html`<span class="by">${p.by}</span>` : nothing}
            ${this.chosen === p.url ? html`<span class="material-symbols-rounded check">check</span>` : nothing}
          </button>`)}</div>`
        : html`<div class="note">${this.loading ? "Asking Civitai…" : this.problem ? "" : this.pane === "creator"
            ? "The creator posted no pictures with it." : "Nobody else has posted a picture made with it yet."}</div>`}
      ${this.pane === "community" && this.communityCursor
        ? html`<button class="tab more" ?disabled=${this.loading} @click=${() => void this.load("community", true)}>
            ${this.loading ? "Loading…" : "More"}</button>`
        : nothing}
    `;
  }

  private renderComments() {
    const link = this.link!;
    if (this.problem) {
      return html`<div class="note err">${this.problem}</div>
        <div class="note"><a href=${`${link.page}#comments`} target="_blank" rel="noopener noreferrer">Read them on Civitai</a></div>`;
    }
    if (!this.comments.length) {
      return html`<div class="note">${this.loading ? "Asking Civitai…" : "Nobody has commented on it yet."}</div>`;
    }
    return html`
      <div class="comments">
        ${this.comments.map((c) => html`<div class="comment">
          ${c.avatar
            ? html`<img class="avatar" src=${api.civitaiImageURL(c.avatar)} alt="" loading="lazy"
                @error=${(e: Event) => ((e.target as HTMLImageElement).style.visibility = "hidden")} />`
            : html`<span class="avatar"></span>`}
          <div>
            <div class="meta"><b>${c.user || "someone"}</b>${c.createdAt ? html`<span>${new Date(c.createdAt).toLocaleDateString()}</span>` : nothing}
              ${c.likes ? html`<span>♥ ${c.likes}</span>` : nothing}${c.replies ? html`<span>${c.replies} ${c.replies === 1 ? "reply" : "replies"}</span>` : nothing}</div>
            <div class="text">${unsafeHTML(c.html)}</div>
          </div>
        </div>`)}
      </div>
      ${this.commentsCursor
        ? html`<button class="tab more" ?disabled=${this.loading} @click=${() => void this.load("comments", true)}>
            ${this.loading ? "Loading…" : "More"}</button>`
        : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oppai-model-civitai": OppaiModelCivitai;
  }
}
