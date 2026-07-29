import { LitElement, html, css, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { api, type SourceItem, type SourceProposal } from "../api.js";
import { playExit } from "../motion.js";
import { motionStyles } from "../theme.js";

/**
 * Add a browsable site to the Browse tab.
 *
 * The flow is paste a URL → look at what came out → save. The middle step is the
 * whole design: what the server proposes is a set of CSS selectors, and nobody can
 * tell by reading selectors whether they pull the right things out of a page. So this
 * shows the tiles the proposal actually extracted from the page that was just
 * fetched, and asks the user to approve *those*. The generated YAML is present, and
 * editable, underneath — for the person who wants it and for the day the site
 * restyles — but it is not what the decision rests on.
 *
 * Nothing generated is executed. A saved adapter is selectors and a URL template
 * interpreted by the server's YAML source; there is no code path from this dialog to
 * running anything the website supplied.
 */
@customElement("oppai-add-source")
export class OppaiAddSource extends LitElement {
  /** Set while a source with the proposed id already exists, so Save replaces it. */
  @property({ attribute: false }) existingNames: string[] = [];

  @state() private url = "";
  @state() private busy = false;
  @state() private error = "";
  @state() private proposal: SourceProposal | null = null;
  /** The YAML as the user may have edited it. Kept separate from the proposal so
      "start over" is always possible without a second fetch. */
  @state() private yaml = "";
  @state() private showYaml = false;
  @state() private saving = false;

  /** The sheet element, so its exit can be awaited before it is removed. */
  @query(".sheet") private sheet?: HTMLElement;

  static styles = [motionStyles, css`
    :host {
      display: block;
    }
    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.55);
      display: grid;
      place-items: center;
      z-index: 60;
      padding: 16px;
      /* Notches and the home indicator: the sheet must not run under either. */
      padding: max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right))
        max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
    }
    .sheet {
      background: var(--oppai-surface);
      color: var(--oppai-text);
      border-radius: 20px;
      width: min(720px, 100%);
      max-height: 100%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.45);
    }
    header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 16px 18px;
      border-bottom: 1px solid var(--oppai-border);
    }
    header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      flex: 1;
    }
    .body {
      padding: 16px 18px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    footer {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      padding: 14px 18px;
      border-top: 1px solid var(--oppai-border);
    }
    .hint {
      font-size: 13px;
      color: var(--oppai-text-muted);
      margin: 0;
    }
    label.row {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--oppai-surface-2);
      border-radius: 12px;
      padding: 8px 12px;
    }
    label.row input {
      flex: 1;
      background: none;
      border: 0;
      color: inherit;
      font: inherit;
      outline: none;
      min-width: 0;
    }
    button {
      font: inherit;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 1px solid var(--oppai-border);
      background: var(--oppai-surface-2);
      color: inherit;
      border-radius: 999px;
      padding: 8px 14px;
      cursor: pointer;
    }
    button:disabled {
      opacity: 0.5;
      cursor: default;
    }
    button.primary {
      background: var(--md-sys-color-primary, #7c5cff);
      color: var(--md-sys-color-on-primary, #fff);
      border-color: transparent;
    }
    .banner {
      display: flex;
      gap: 8px;
      align-items: flex-start;
      border-radius: 12px;
      padding: 10px 12px;
      font-size: 13px;
      line-height: 1.45;
    }
    .banner.error {
      background: color-mix(in srgb, var(--md-sys-color-error) 16%, transparent);
    }
    .banner.warn {
      background: color-mix(in srgb, #e0a030 18%, transparent);
    }
    .banner.info {
      background: var(--oppai-surface-2);
    }
    .tiles {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
      gap: 8px;
    }
    .tile {
      background: var(--oppai-surface-2);
      border-radius: 10px;
      overflow: hidden;
    }
    .tile img {
      display: block;
      width: 100%;
      aspect-ratio: 3 / 4;
      object-fit: cover;
      background: var(--oppai-surface-3, #222);
    }
    .tile .cap {
      font-size: 11px;
      padding: 5px 6px;
      color: var(--oppai-text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    textarea {
      width: 100%;
      box-sizing: border-box;
      min-height: 260px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 12px;
      line-height: 1.5;
      background: var(--oppai-surface-2);
      color: inherit;
      border: 1px solid var(--oppai-border);
      border-radius: 12px;
      padding: 10px 12px;
      resize: vertical;
    }
    h4 {
      margin: 0;
      font-size: 13px;
      font-weight: 600;
    }
    @media (prefers-reduced-motion: no-preference) {
      .sheet {
        animation: pop 160ms ease-out;
      }
      @keyframes pop {
        from {
          opacity: 0;
          transform: translateY(8px) scale(0.99);
        }
      }
    }
  `];

  render() {
    return html`
      <div class="backdrop" @click=${this.backdropClick}>
        <div class="sheet" role="dialog" aria-modal="true" aria-label="Add a site to browse">
          <header>
            <span class="material-symbols-rounded">travel_explore</span>
            <h3>Add a site</h3>
            <button @click=${() => void this.close()} aria-label="Close">
              <span class="material-symbols-rounded">close</span>
            </button>
          </header>

          <div class="body">
            ${this.error
              ? html`<div class="banner error">
                  <span class="material-symbols-rounded" style="font-size:18px;">error</span>
                  <span>${this.error}</span>
                </div>`
              : nothing}

            <p class="hint">
              Paste the address of a <strong>listing page</strong> — the page showing the
              grid, not one item from it. The server fetches it once and works out how to
              read it.
            </p>

            <form @submit=${this.analyze}>
              <label class="row">
                <span class="material-symbols-rounded" style="font-size:20px; color:var(--oppai-text-dim);">link</span>
                <input
                  type="url"
                  placeholder="https://example.com/gallery"
                  .value=${this.url}
                  ?disabled=${this.busy}
                  @input=${(e: Event) => (this.url = (e.target as HTMLInputElement).value)}
                />
                <button class="primary" type="submit" ?disabled=${this.busy || !this.url.trim()}>
                  ${this.busy ? "Looking…" : "Inspect"}
                </button>
              </label>
            </form>

            ${this.proposal ? this.renderProposal(this.proposal) : nothing}
          </div>

          <footer>
            <button @click=${() => void this.close()}>Cancel</button>
            <button
              class="primary"
              ?disabled=${!this.proposal || this.saving || this.blocked}
              @click=${this.save}
            >
              <span class="material-symbols-rounded" style="font-size:20px;">add</span>
              ${this.saving ? "Adding…" : "Add site"}
            </button>
          </footer>
        </div>
      </div>
    `;
  }

  /** A blocking note means the proposal can't work as it stands. Saving is disabled
      until the user edits the YAML, which clears the block — at that point they have
      taken responsibility for it, which is the right place for that decision. */
  private get blocked(): boolean {
    if (!this.proposal) return true;
    if (this.yaml !== this.proposal.yaml) return false;
    return this.proposal.notes.some((n) => n.blocking);
  }

  private renderProposal(p: SourceProposal) {
    const blocking = p.notes.filter((n) => n.blocking);
    const advisory = p.notes.filter((n) => !n.blocking);
    return html`
      ${p.existing
        ? html`<div class="banner warn">
            <span class="material-symbols-rounded" style="font-size:18px;">swap_horiz</span>
            <span>This will replace the existing <strong>${p.existing}</strong> source. Its
              definition is overridden, not deleted — remove the new one to get it back.</span>
          </div>`
        : nothing}

      ${blocking.map(
        (n) => html`<div class="banner error">
          <span class="material-symbols-rounded" style="font-size:18px;">block</span>
          <span>${n.field ? html`<strong>${n.field}</strong> — ` : nothing}${n.text}</span>
        </div>`,
      )}

      <div>
        <h4>What it found on that page</h4>
        ${p.previewError
          ? html`<div class="banner error" style="margin-top:8px;">
              <span class="material-symbols-rounded" style="font-size:18px;">visibility_off</span>
              <span>${p.previewError}</span>
            </div>`
          : html`
              <p class="hint" style="margin:4px 0 8px;">
                These are real items the proposed adapter pulled out. If they look right,
                the site will work.
              </p>
              <div class="tiles">
                ${p.preview.map((it: SourceItem) => html`
                  <div class="tile">
                    <img
                      src=${api.sourceStreamURL(it.thumbUrl)}
                      alt=""
                      loading="lazy"
                      @error=${(e: Event) => ((e.target as HTMLImageElement).style.visibility = "hidden")}
                    />
                    <div class="cap" title=${it.title || it.id}>${it.title || it.id}</div>
                  </div>
                `)}
              </div>
            `}
      </div>

      ${advisory.length
        ? html`<div>
            <h4>Worth knowing</h4>
            ${advisory.map(
              (n) => html`<div class="banner info" style="margin-top:6px;">
                <span class="material-symbols-rounded" style="font-size:18px;">info</span>
                <span>${n.field ? html`<strong>${n.field}</strong> — ` : nothing}${n.text}</span>
              </div>`,
            )}
          </div>`
        : nothing}

      <div>
        <button @click=${() => (this.showYaml = !this.showYaml)}>
          <span class="material-symbols-rounded" style="font-size:20px;">
            ${this.showYaml ? "expand_less" : "code"}
          </span>
          ${this.showYaml ? "Hide the definition" : "Show and edit the definition"}
        </button>
        ${this.showYaml
          ? html`
              <p class="hint" style="margin:10px 0 6px;">
                Selectors and a URL template — nothing here is executed as code. Edit it if
                the tiles above are wrong, then add the site.
              </p>
              <textarea
                spellcheck="false"
                .value=${this.yaml}
                @input=${(e: Event) => (this.yaml = (e.target as HTMLTextAreaElement).value)}
              ></textarea>
            `
          : nothing}
      </div>
    `;
  }

  private analyze = async (e: Event) => {
    e.preventDefault();
    const url = this.url.trim();
    if (!url) return;
    this.busy = true;
    this.error = "";
    this.proposal = null;
    try {
      const p = await api.analyzeSource(url);
      this.proposal = p;
      this.yaml = p.yaml;
    } catch (err) {
      this.error = (err as Error).message;
    } finally {
      this.busy = false;
    }
  };

  private save = async () => {
    if (!this.proposal) return;
    this.saving = true;
    this.error = "";
    try {
      const saved = await api.saveSource(this.yaml);
      this.dispatchEvent(
        new CustomEvent("added", { detail: saved, bubbles: true, composed: true }),
      );
    } catch (err) {
      this.error = (err as Error).message;
    } finally {
      this.saving = false;
    }
  };

  private backdropClick(e: Event) {
    // Only a click on the backdrop itself closes — a click inside the sheet must not,
    // and losing a half-edited definition to a stray click would be infuriating.
    if (e.target === e.currentTarget) void this.close();
  }

  /** Plays the exit before telling the parent to drop us.
   *
   * The parent removes this element the instant it hears "close", so the animation has
   * to finish first — a fade-in with no fade-out reads as a dropped frame. playExit
   * resolves immediately under reduced motion and on a timer if no animation fires, so
   * this can never leave the dialog stuck on screen. */
  private close = async () => {
    await playExit(this.sheet);
    this.dispatchEvent(new CustomEvent("close", { bubbles: true, composed: true }));
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "oppai-add-source": OppaiAddSource;
  }
}
