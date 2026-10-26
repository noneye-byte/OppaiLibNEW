import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { iconStyles } from "../theme.js";
import { api, type TrainTask, type TwitterMediaPage, type TwitterPicture } from "../api.js";
import { loraStyles } from "./lora-styles.js";

/**
 * Bringing pictures into a training set: files from this computer, or an X
 * account's pictures. Either way the person sees every candidate first and keeps
 * what they want, and only what is kept is stored — uploaded to the set, or
 * downloaded into it by the server (lora_sources.go). A set is not the library
 * (lora_sets.go): nothing kept here turns up in a grid or gets tagged behind the
 * Train screen's back.
 *
 * Dispatches "gathered" with the set's id once the pictures are in.
 */

type Mode = "upload" | "x";

interface LocalFile {
  key: string;
  file: File;
  url: string;
  keep: boolean;
}

// What sd-scripts can read. A GIF is left out: it trains on stills.
const STILL = /^image\/(jpeg|png|webp|bmp)$/;

// How many uploads go at once. Pictures are small; three keeps the bar moving
// without one slow file holding up the rest.
const UPLOADS_AT_ONCE = 3;

@customElement("oppai-lora-gather")
export class OppaiLoraGather extends LitElement {
  @property() mode: Mode = "upload";
  /** The training set to add to; 0 makes (or joins) the one named setName. */
  @property({ type: Number }) setId = 0;
  @property() setName = "";

  @state() private files: LocalFile[] = [];
  @state() private dragging = false;
  @state() private progress: { done: number; total: number; failed: number } | null = null;

  @state() private user = "";
  @state() private page: TwitterMediaPage | null = null;
  @state() private pictures: TwitterPicture[] = [];
  @state() private dropped = new Set<string>();
  @state() private cursor = "";
  @state() private loading = false;
  @state() private reposts = false;
  @state() private task: TrainTask | null = null;
  @state() private error = "";

  static styles = [
    iconStyles,
    loraStyles,
    css`
      :host { display: block; }
      .drop {
        border: 2px dashed var(--oppai-border-strong); border-radius: 16px; padding: 28px 16px; text-align: center;
        color: var(--oppai-text-dim); font-size: 14px; line-height: 1.5; transition: border-color 0.15s ease, background 0.15s ease;
      }
      .drop.over { border-color: var(--oppai-primary); background: color-mix(in srgb, var(--oppai-primary) 8%, transparent); }
      .drop > .material-symbols-rounded { font-size: 40px; display: block; margin: 0 auto 6px; color: var(--oppai-primary); }
      .drop .btns { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-top: 12px; }
      input[type="file"] { display: none; }
      .toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin: 14px 0 10px; font-size: 13px; }
      .toolbar .count { font-weight: 600; margin-right: auto; }
      .search { display: flex; gap: 8px; }
      .search input { flex: 1; }
      .account { display: flex; align-items: center; gap: 12px; margin: 14px 0 4px; }
      .account img { width: 44px; height: 44px; border-radius: 50%; background: var(--oppai-surface-2); }
      .account .who { font-weight: 600; font-size: 14px; }
      .account .who small { display: block; font-weight: 400; color: var(--oppai-text-dim); font-size: 12px; }
      .footer {
        position: sticky; bottom: 0; margin: 14px -18px -18px; padding: 12px 18px;
        background: color-mix(in srgb, var(--oppai-surface) 92%, transparent); backdrop-filter: blur(6px);
        border-top: 1px solid var(--oppai-border); border-radius: 0 0 16px 16px;
        display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
      }
      .footer .bar { flex: 1; min-width: 120px; }
      .footer .what { font-size: 13px; color: var(--oppai-text-dim); flex: 1; min-width: 160px; }
      .more { display: flex; justify-content: center; margin-top: 12px; }
      @media (max-width: 600px) { .footer { margin: 14px -14px -14px; padding: 10px 14px; } }
    `,
  ];

  disconnectedCallback() {
    super.disconnectedCallback();
    for (const f of this.files) URL.revokeObjectURL(f.url);
  }

  render() {
    return this.mode === "upload" ? this.renderUpload() : this.renderX();
  }

  // ── from this computer ────────────────────────────────────────────────────

  private addFiles(list: FileList | File[] | null) {
    if (!list) return;
    const seen = new Set(this.files.map((f) => f.key));
    const added: LocalFile[] = [];
    let skipped = 0;
    for (const file of Array.from(list)) {
      if (!STILL.test(file.type)) {
        skipped++;
        continue;
      }
      const key = `${file.name}:${file.size}:${file.lastModified}`;
      if (seen.has(key)) continue;
      seen.add(key);
      added.push({ key, file, url: URL.createObjectURL(file), keep: true });
    }
    this.files = [...this.files, ...added];
    this.error = skipped ? `${skipped} file${skipped === 1 ? " isn't a still picture" : "s aren't still pictures"} (GIFs and videos can't be trained on) and ${skipped === 1 ? "was" : "were"} left out.` : "";
  }

  private toggleFile(key: string) {
    this.files = this.files.map((f) => (f.key === key ? { ...f, keep: !f.keep } : f));
  }

  private setAllFiles(keep: boolean) {
    this.files = this.files.map((f) => ({ ...f, keep }));
  }

  private clearFiles() {
    for (const f of this.files) URL.revokeObjectURL(f.url);
    this.files = [];
    this.error = "";
  }

  /** The set the pictures go into, made now when there isn't one. The server joins
   *  a set by the same name, so an earlier try at the same LoRA is added to. */
  private async target(): Promise<number> {
    if (this.setId > 0) return this.setId;
    const set = await api.trainSetCreate(this.setName.trim() || "Training set");
    this.setId = set.id;
    return set.id;
  }

  private async uploadKept() {
    const kept = this.files.filter((f) => f.keep);
    if (!kept.length || this.progress) return;
    this.error = "";
    this.progress = { done: 0, total: kept.length, failed: 0 };
    try {
      const set = await this.target();
      let next = 0;
      let lastError = "";
      const worker = async () => {
        while (next < kept.length) {
          const f = kept[next++];
          try {
            await api.trainSetUpload(set, f.file);
            this.progress = { ...this.progress!, done: this.progress!.done + 1 };
          } catch (e) {
            lastError = (e as Error).message;
            this.progress = { ...this.progress!, failed: this.progress!.failed + 1 };
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(UPLOADS_AT_ONCE, kept.length) }, worker));
      if (!this.progress.done) throw new Error(lastError || "None of the pictures could be uploaded.");
      const failed = this.progress.failed;
      this.clearFiles();
      if (failed) this.error = `${failed} picture${failed === 1 ? "" : "s"} couldn't be added (${lastError}).`;
      this.dispatchEvent(new CustomEvent("gathered", { detail: { setId: set } }));
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.progress = null;
    }
  }

  private renderUpload() {
    const kept = this.files.filter((f) => f.keep).length;
    return html`
      <div class="drop ${this.dragging ? "over" : ""}"
        @dragover=${(e: DragEvent) => { e.preventDefault(); this.dragging = true; }}
        @dragleave=${() => (this.dragging = false)}
        @drop=${(e: DragEvent) => { e.preventDefault(); this.dragging = false; this.addFiles(e.dataTransfer?.files ?? null); }}>
        <span class="material-symbols-rounded">upload_file</span>
        Drop pictures here, or choose them.<br />
        <span class="muted">JPEG, PNG or WebP. You'll pick which to keep before anything is uploaded.</span>
        <div class="btns">
          <button class="btn tonal" @click=${() => this.renderRoot.querySelector<HTMLInputElement>("#files")?.click()}>
            <span class="material-symbols-rounded">image</span> Choose pictures
          </button>
          <button class="btn" @click=${() => this.renderRoot.querySelector<HTMLInputElement>("#folder")?.click()}>
            <span class="material-symbols-rounded">folder</span> Choose a folder
          </button>
        </div>
        <input id="files" type="file" accept="image/jpeg,image/png,image/webp,image/bmp" multiple
          @change=${(e: Event) => { const i = e.target as HTMLInputElement; this.addFiles(i.files); i.value = ""; }} />
        <input id="folder" type="file" webkitdirectory multiple
          @change=${(e: Event) => { const i = e.target as HTMLInputElement; this.addFiles(i.files); i.value = ""; }} />
      </div>
      ${this.error ? html`<div class="banner"><span class="material-symbols-rounded">warning</span>${this.error}</div>` : nothing}
      ${this.files.length
        ? html`
            <div class="toolbar">
              <span class="count">${kept} of ${this.files.length} kept</span>
              <button class="btn small ghost" @click=${() => this.setAllFiles(true)}>Keep all</button>
              <button class="btn small ghost" @click=${() => this.setAllFiles(false)}>Keep none</button>
              <button class="btn small ghost" @click=${() => this.clearFiles()}><span class="material-symbols-rounded">delete</span> Clear</button>
            </div>
            <div class="picks">
              ${this.files.map((f) => html`<button class="pick ${f.keep ? "on" : "off"}" title=${f.file.name} @click=${() => this.toggleFile(f.key)}>
                <img src=${f.url} alt="" loading="lazy" />
                <span class="mark"><span class="material-symbols-rounded">${f.keep ? "check" : "close"}</span></span>
              </button>`)}
            </div>
            <div class="footer">
              ${this.progress
                ? html`<div class="what">Uploading ${this.progress.done + this.progress.failed} of ${this.progress.total}…</div>
                    <div class="bar"><div style="width:${((this.progress.done + this.progress.failed) / this.progress.total) * 100}%"></div></div>`
                : html`<div class="what">Kept pictures go into the training set <b>${this.setName || "Training set"}</b>, not your library.</div>
                    <button class="btn primary" ?disabled=${!kept} @click=${() => this.uploadKept()}>
                      <span class="material-symbols-rounded">upload</span> Add ${kept} to the set
                    </button>`}
            </div>`
        : nothing}
    `;
  }

  // ── from an X account ─────────────────────────────────────────────────────

  private get shown(): TwitterPicture[] {
    return this.reposts ? this.pictures : this.pictures.filter((p) => !p.repost);
  }

  private get kept(): TwitterPicture[] {
    return this.shown.filter((p) => !this.dropped.has(p.id));
  }

  private async find() {
    const user = this.user.trim();
    if (!user || this.loading) return;
    this.loading = true;
    this.error = "";
    this.page = null;
    this.pictures = [];
    this.dropped = new Set();
    this.cursor = "";
    try {
      const page = await api.trainTwitter(user);
      this.page = page;
      this.pictures = page.pictures;
      this.cursor = page.cursor ?? "";
      // A first page that is all reposts would look empty; show them instead.
      if (page.pictures.length && page.pictures.every((p) => p.repost)) this.reposts = true;
      // The first page is twenty posts; most sets want more than that to choose from.
      if (this.cursor) await this.more(2);
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.loading = false;
    }
  }

  /** Reads up to `pages` more pages, stopping at the end or the first failure. */
  private async more(pages = 3) {
    if (!this.page?.account || !this.cursor) return;
    const handle = this.page.account.screenName;
    this.loading = true;
    this.error = "";
    try {
      for (let i = 0; i < pages && this.cursor; i++) {
        const page = await api.trainTwitter(handle, this.cursor);
        const have = new Set(this.pictures.map((p) => p.id));
        this.pictures = [...this.pictures, ...page.pictures.filter((p) => !have.has(p.id))];
        this.cursor = page.cursor ?? "";
      }
    } catch (e) {
      this.error = `${(e as Error).message}`;
    } finally {
      this.loading = false;
    }
  }

  private togglePicture(id: string) {
    const next = new Set(this.dropped);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.dropped = next;
  }

  private async importKept() {
    const kept = this.kept;
    if (!kept.length || this.task) return;
    const handle = this.page?.account?.screenName ?? "";
    this.error = "";
    try {
      let task = await api.trainImport({
        items: kept.map((p) => ({
          url: p.url,
          source: p.tweetUrl,
          title: `@${handle}${p.text ? ` — ${p.text.split("\n")[0]}` : ""}`,
        })),
        setId: this.setId || undefined,
        setName: this.setName || `@${handle}`,
      });
      this.task = task;
      while (!task.finished) {
        await new Promise((r) => setTimeout(r, 1000));
        if (!this.isConnected) return;
        task = await api.trainTask(task.id);
        this.task = task;
      }
      if (task.error) throw new Error(task.error);
      if (task.failed) this.error = `${task.failed} picture${task.failed === 1 ? "" : "s"} couldn't be downloaded and ${task.failed === 1 ? "was" : "were"} skipped.`;
      this.setId = task.setId ?? this.setId;
      this.pictures = [];
      this.page = null;
      this.dispatchEvent(new CustomEvent("gathered", { detail: { setId: task.setId } }));
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.task = null;
    }
  }

  private renderX() {
    const shown = this.shown;
    const kept = this.kept.length;
    const reposts = this.pictures.filter((p) => p.repost).length;
    const acct = this.page?.account;
    return html`
      <form class="search" @submit=${(e: Event) => { e.preventDefault(); void this.find(); }}>
        <input type="text" placeholder="@artist, or a link to their profile" .value=${this.user}
          @input=${(e: Event) => (this.user = (e.target as HTMLInputElement).value)} />
        <button class="btn primary" type="submit" ?disabled=${!this.user.trim() || this.loading}>
          <span class="material-symbols-rounded">search</span> ${this.loading && !this.pictures.length ? "Looking…" : "Find pictures"}
        </button>
      </form>
      <div class="note">Reads the account's Media tab through a public mirror — no X account needed. Only the pictures you keep are downloaded.</div>
      ${this.error ? html`<div class="banner"><span class="material-symbols-rounded">warning</span>${this.error}</div>` : nothing}
      ${acct
        ? html`<div class="account">
            ${acct.avatar ? html`<img src=${api.proxyURL(acct.avatar)} alt="" />` : nothing}
            <div class="who">${acct.name}<small>@${acct.screenName} · ${acct.mediaCount.toLocaleString()} posts with media</small></div>
          </div>
          ${acct.protected ? html`<div class="banner info"><span class="material-symbols-rounded">lock</span>This account is protected, so its posts can't be seen from outside.</div>` : nothing}`
        : nothing}
      ${this.pictures.length
        ? html`
            <div class="toolbar">
              <span class="count">${kept} of ${shown.length} kept</span>
              ${reposts
                ? html`<label class="check" style="margin:0;"><input type="checkbox" .checked=${this.reposts}
                    @change=${(e: Event) => (this.reposts = (e.target as HTMLInputElement).checked)} />Show ${reposts} repost${reposts === 1 ? "" : "s"}</label>`
                : nothing}
              <button class="btn small ghost" @click=${() => (this.dropped = new Set())}>Keep all</button>
              <button class="btn small ghost" @click=${() => (this.dropped = new Set(shown.map((p) => p.id)))}>Keep none</button>
            </div>
            <div class="picks">
              ${shown.map((p) => {
                const on = !this.dropped.has(p.id);
                const small = p.width && p.height && Math.min(p.width, p.height) < 640;
                return html`<button class="pick ${on ? "on" : "off"}" title=${p.text ?? ""} @click=${() => this.togglePicture(p.id)}>
                  <img src=${api.proxyURL(p.thumb)} alt="" loading="lazy" />
                  <span class="mark"><span class="material-symbols-rounded">${on ? "check" : "close"}</span></span>
                  ${p.repost ? html`<span class="badge">repost</span>` : small ? html`<span class="badge">small</span>` : nothing}
                </button>`;
              })}
            </div>
            ${this.cursor
              ? html`<div class="more"><button class="btn" ?disabled=${this.loading} @click=${() => this.more()}>
                  <span class="material-symbols-rounded">${this.loading ? "hourglass_top" : "expand_more"}</span> ${this.loading ? "Loading…" : "Load more"}
                </button></div>`
              : html`<div class="note" style="text-align:center;">That's everything the mirror shows for this account.</div>`}
            <div class="footer">
              ${this.task
                ? html`<div class="what">Downloading ${this.task.done + this.task.failed} of ${this.task.total}…</div>
                    <div class="bar"><div style="width:${this.task.total ? ((this.task.done + this.task.failed) / this.task.total) * 100 : 0}%"></div></div>`
                : html`<div class="what">Kept pictures go into the training set <b>${this.setName || `@${acct?.screenName ?? ""}`}</b>, not your library.</div>
                    <button class="btn primary" ?disabled=${!kept} @click=${() => this.importKept()}>
                      <span class="material-symbols-rounded">download</span> Keep ${kept}
                    </button>`}
            </div>`
        : acct && !this.loading && !acct.protected
          ? html`<div class="empty"><span class="material-symbols-rounded">image</span>No pictures on this account's Media tab.</div>`
          : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oppai-lora-gather": OppaiLoraGather;
  }
}
