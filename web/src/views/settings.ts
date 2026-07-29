import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { api, mascotSay, type APKInfo, type Diagnostics, type Passkey, type PasskeyList, type Settings, type ReadOnlyInfo, type Stats, type StorageReport, type Timing, type User } from "../api.js";
import { passkeyErrorMessage, registerPasskey } from "../passkeys.js";
import { withViewTransition } from "../motion.js";
import { profileUpdates, resetUIMetrics, uiMetricsSnapshot, type UIMetricsSnapshot } from "../ui-metrics.js";
import {
  iconStyles,
  motionStyles,
  type ThemePref,
  loadTheme,
  saveTheme,
  applyTheme,
} from "../theme.js";
import { KIND_META, type Kind, type ComicFit, loadComicFit, saveComicFit } from "../media-meta.js";
import { loadHideLibby, saveHideLibby } from "../libby.js";
import { isIncognito, setIncognito } from "../incognito.js";
import { LIBBY_PROGRESSION_MULTIPLIERS, getProgressionMultiplier, setProgressionMultiplier } from "../libby-meter.js";


type SettingsTab =
  | "appearance" | "libby" | "ai" | "scraping" | "library" | "android" | "account" | "storage"
  | "diagnostics" | "privacy" | "about";

/**
 * The settings categories, as a Discord-style rail: grouped, one panel at a time.
 * `server` marks the panels an admin writes back to the server, which are the only
 * ones that can be read-only.
 */
const SETTINGS_TABS: { id: SettingsTab; label: string; icon: string; group: string; server?: boolean; adminOnly?: boolean }[] = [
  { id: "appearance", label: "Appearance", icon: "palette", group: "You" },
  { id: "libby", label: "Libby", icon: "auto_awesome", group: "You" },
  { id: "account", label: "Account", icon: "account_circle", group: "You" },
  { id: "ai", label: "AI tagging", icon: "smart_toy", group: "Server", server: true },
  { id: "scraping", label: "Scraping", icon: "travel_explore", group: "Server", server: true },
  { id: "library", label: "Library", icon: "inventory_2", group: "Server" },
  { id: "android", label: "Android app", icon: "android", group: "Server" },
  // Admin-only, and hidden rather than disabled for everyone else: the snapshot
  // names every route and every third-party host this install talks to.
  // Not admin-only: "why did my upload fail" is a question the person uploading
  // needs answered, and the paths here are already in the read-only server info.
  { id: "storage", label: "Storage", icon: "hard_drive", group: "Server" },
  { id: "diagnostics", label: "Diagnostics", icon: "speed", group: "Server", adminOnly: true },
  // Admin-only and server-side because incognito is not a preference: it changes
  // what this host answers to everyone, including people who never sign in.
  { id: "privacy", label: "Privacy", icon: "visibility_off", group: "Server", server: true, adminOnly: true },
  { id: "about", label: "About", icon: "info", group: "Server" },
];

// The Settings screen. Server-side settings (AI tagging, scraping) are loaded
// from and saved back to /api/settings and only an admin may write them —
// non-admins see the same values, read-only. Appearance and reader preferences
// are per-device and live in localStorage, so they apply the moment you pick
// them, with no save step.
@customElement("oppai-settings")
export class OppaiSettings extends LitElement {
  @property({ attribute: false }) user!: User;

  @state() private tab: SettingsTab = "appearance";
  @state() private settings: Settings | null = null;
  @state() private info: ReadOnlyInfo | null = null;
  @state() private stats: Stats | null = null;
  // null while we're still asking; {available:false} when this image has no APK.
  @state() private apk: APKInfo | null = null;
  @state() private loadError = "";

  // Server performance snapshot. Loaded only when the Diagnostics panel is opened,
  // and refreshed only on demand: this is a debugging page, and a page that polls
  // adds load to the thing being measured.
  // Passkeys. Loaded when the Account panel is opened; null while still asking.
  @state() private passkeyList: PasskeyList | null = null;
  @state() private passkeyBusy = false;
  @state() private passkeyError = "";
  @state() private passkeyMsg = "";
  /** Shared by the "add" field and the inline rename — only one of them is ever on
      screen, and two separate buffers would just be two things to keep in sync. */
  @state() private passkeyName = "";
  @state() private passkeyRenaming: number | null = null;
  @state() private passkeyRevoking: number | null = null;
  @state() private passkeyPassword = "";

  @state() private diag: Diagnostics | null = null;
  @state() private uiDiag: UIMetricsSnapshot | null = null;
  // Storage mappings and usage, loaded when the Storage panel is opened. See §27:
  // the point is to name *which* mapping is the one to expand.
  @state() private storage: StorageReport | null = null;
  @state() private storageBusy = false;
  @state() private storageErr = "";
  @state() private diagBusy = false;
  @state() private diagErr = "";

  @state() private dirty = false;
  @state() private saving = false;
  @state() private saved = false;

  @state() private theme: ThemePref = loadTheme();
  @state() private fit: ComicFit = loadComicFit();
  @state() private hideLibby = loadHideLibby();

  // The generator's own lists, so Libby's image-generation fields are pickers rather
  // than free text. Empty when it is unreachable; see loadGenLists.
  @state() private genModels: string[] = [];
  @state() private genLoras: string[] = [];
  @state() private genBoards: string[] = [];
  @state() private genError = "";

  @state() private pwCurrent = "";
  @state() private pwNew = "";
  @state() private pwConfirm = "";
  @state() private pwBusy = false;
  @state() private pwMsg = "";
  @state() private pwErr = "";

  static styles = [
    iconStyles,
    motionStyles,
    css`
      :host {
        display: block;
      }

      /* Discord's settings shape: a grouped category rail on the left, one panel on
         the right. Sections inside a panel are flat and separated by rules rather
         than floated as cards — with only one panel visible, card edges are noise. */
      .shell {
        display: grid;
        grid-template-columns: 218px minmax(0, 1fr);
        gap: 8px;
        align-items: start;
      }
      .cat-rail {
        position: sticky;
        top: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 4px 8px 24px;
      }
      .cat-head {
        padding: 14px 10px 4px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--oppai-text-muted);
      }
      .cat-row {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 10px;
        border: 0;
        border-radius: 6px;
        background: transparent;
        color: var(--oppai-text-muted);
        font: inherit;
        font-size: 14px;
        font-weight: 500;
        text-align: left;
        cursor: pointer;
        transition: background 0.12s ease, color 0.12s ease;
      }
      .cat-row .material-symbols-rounded {
        font-size: 19px;
      }
      .cat-label {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .cat-row:hover,
      .cat-row.on {
        background: var(--oppai-nav-hover);
        color: var(--oppai-text);
      }
      .cat-row.danger {
        color: var(--oppai-fav);
      }
      .cat-sep {
        height: 1px;
        margin: 10px;
        background: var(--oppai-border);
      }
      .panel-col {
        min-width: 0;
        max-width: 760px;
        padding: 4px 8px 48px;
      }
      .panel-title {
        margin: 0 0 18px;
        font-size: 20px;
        font-weight: 600;
      }
      .card {
        background: transparent;
        border: 0;
        border-top: 1px solid var(--oppai-border);
        border-radius: 0;
        padding: 20px 0 4px;
        margin-bottom: 12px;
        animation: oppai-fade-in-up 0.28s var(--oppai-ease-emphasized) both;
      }
      /* The first section sits directly under the panel title, so its rule would be
         a line under a heading that already reads as one. */
      .card:first-of-type {
        border-top: 0;
        padding-top: 0;
      }
      .card h3 {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--oppai-text-dim);
        margin: 0 0 4px;
      }
      .card h3 .material-symbols-rounded {
        font-size: 17px;
        color: var(--oppai-primary-bright);
      }
      @media (max-width: 860px) {
        /* The rail becomes a scrolling strip above the panel; a 218px column and a
           readable panel do not both fit. */
        .shell {
          grid-template-columns: minmax(0, 1fr);
        }
        .cat-rail {
          position: static;
          flex-direction: row;
          overflow-x: auto;
          gap: 4px;
          padding: 4px 4px 12px;
          border-bottom: 1px solid var(--oppai-border);
        }
        .cat-head,
        .cat-sep {
          display: none;
        }
        .cat-row {
          flex: 0 0 auto;
          border-radius: 999px;
          padding: 7px 12px;
        }
      }
      .card-sub {
        font-size: 13px;
        color: var(--oppai-text-muted);
        margin: 0 0 18px;
      }
      .field {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 12px 0;
        border-top: 1px solid var(--oppai-border);
      }
      .field:first-of-type {
        border-top: none;
      }
      .field-text {
        flex: 1;
        min-width: 0;
      }
      .field-label {
        font-size: 14px;
        font-weight: 500;
      }
      .field-help {
        font-size: 12px;
        color: var(--oppai-text-muted);
        margin-top: 2px;
      }
      .field-control {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      /* Stacked variant for controls too wide to sit beside their label. */
      .field.stack {
        display: block;
      }
      .field.stack .field-control {
        margin-top: 10px;
      }

      input[type="text"],
      input[type="number"],
      input[type="password"] {
        background: var(--oppai-surface-2);
        border: 1px solid var(--oppai-border-strong);
        border-radius: 12px;
        color: var(--oppai-text);
        font: inherit;
        font-size: 14px;
        padding: 10px 12px;
        outline: none;
        width: 100%;
        box-sizing: border-box;
      }
      input:focus {
        border-color: var(--oppai-primary);
      }
      input[disabled] {
        opacity: 0.55;
      }
      input[type="number"] {
        width: 110px;
      }
      input[type="range"] {
        width: 160px;
        accent-color: var(--oppai-primary);
      }

      /* Switch */
      .switch {
        width: 52px;
        height: 30px;
        border-radius: 15px;
        border: none;
        background: var(--oppai-surface-2);
        position: relative;
        cursor: pointer;
        transition: background 0.2s ease;
        flex-shrink: 0;
      }
      .switch.on {
        background: var(--oppai-primary);
      }
      .switch[disabled] {
        opacity: 0.5;
        cursor: default;
      }
      .switch::after {
        content: "";
        position: absolute;
        top: 4px;
        left: 4px;
        width: 22px;
        height: 22px;
        border-radius: 11px;
        background: var(--oppai-text-muted);
        transition: transform 0.22s var(--oppai-ease-spring), background 0.2s ease;
      }
      .switch.on::after {
        transform: translateX(22px);
        background: var(--oppai-on-primary);
      }

      /* Segmented choice */
      .seg {
        display: flex;
        gap: 6px;
      }
      .seg button {
        height: 36px;
        padding: 0 14px;
        border-radius: 18px;
        border: 1px solid var(--oppai-border-strong);
        background: none;
        color: var(--oppai-text-dim);
        font: inherit;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .seg button.on {
        background: var(--oppai-accent);
        border-color: var(--oppai-accent);
        color: var(--oppai-on-accent);
      }

      .value {
        font: 600 13px ui-monospace, monospace;
        color: var(--oppai-text-dim);
        min-width: 40px;
        text-align: right;
      }
      .ro {
        font: 500 12px ui-monospace, monospace;
        color: var(--oppai-text-muted);
        word-break: break-all;
        text-align: right;
      }

      .btn-primary {
        height: 44px;
        padding: 0 24px;
        border-radius: 22px;
        background: var(--oppai-primary);
        color: var(--oppai-on-primary);
        border: none;
        font: inherit;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .btn-primary[disabled] {
        opacity: 0.5;
        cursor: default;
      }
      .btn-inline {
        border: 1px solid var(--oppai-border-strong);
        border-radius: 10px;
        background: transparent;
        color: var(--oppai-text-dim);
        font: inherit;
        font-size: 12px;
        padding: 7px 10px;
        cursor: pointer;
      }

      .banner {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        border-radius: 12px;
        padding: 10px 14px;
        margin-bottom: 20px;
      }
      .banner.info {
        background: var(--oppai-surface-2);
        color: var(--oppai-text-dim);
      }
      .banner.error {
        background: color-mix(in srgb, var(--oppai-fav) 18%, transparent);
        color: var(--oppai-fav);
      }
      .banner.ok {
        background: var(--oppai-primary-container);
        color: var(--oppai-primary-bright);
      }

      /* Sticky save bar for the server-side settings. */
      .savebar {
        position: sticky;
        bottom: 12px;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        border-radius: 22px;
        background: var(--oppai-surface-2);
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
        animation: oppai-scale-in 0.28s var(--oppai-ease-spring) both;
      }
      .savebar .grow {
        flex: 1;
        font-size: 13px;
        color: var(--oppai-text-dim);
      }

      .stat-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        gap: 12px;
      }
      .stat {
        background: var(--oppai-surface-2);
        border-radius: 14px;
        padding: 12px 14px;
      }
      .stat-num {
        font-size: 20px;
        font-weight: 500;
      }
      .stat-label {
        font-size: 12px;
        color: var(--oppai-text-muted);
        margin-top: 2px;
      }
      /* Passkeys. Each row has to read as a physical thing you either still have or have
         lost, since this list is the revocation screen as much as an inventory. */
      .pk-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 14px;
      }
      .pk-row {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        background: var(--oppai-surface-2);
        border-radius: 14px;
        padding: 11px 13px;
      }
      .pk-icon {
        font-size: 22px;
        color: var(--oppai-text-dim);
        flex-shrink: 0;
      }
      .pk-body {
        flex: 1;
        min-width: 0;
      }
      .pk-name {
        font-size: 14px;
        font-weight: 500;
      }
      .pk-meta {
        font-size: 12px;
        color: var(--oppai-text-muted);
        margin-top: 2px;
      }
      .pk-actions {
        display: flex;
        gap: 4px;
        flex-shrink: 0;
      }
      .pk-rename {
        display: flex;
        gap: 6px;
        align-items: center;
      }
      .pk-rename input {
        flex: 1;
        min-width: 0;
      }
      .pk-revoke {
        margin-top: 10px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .pk-revoke-actions {
        display: flex;
        gap: 8px;
      }
      .pk-revoke-actions .danger,
      .pk-row .danger {
        color: var(--md-sys-color-error);
      }
      .pk-add {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        align-items: center;
      }
      .pk-add input {
        flex: 1 1 220px;
        min-width: 0;
      }
      /* Diagnostics panel. */
      .diag-actions {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
        margin-bottom: 14px;
      }
      .diag-actions .grow {
        flex: 1 1 200px;
      }
      .diag-head {
        margin: 22px 0 4px;
        font-size: 14px;
        font-weight: 600;
      }
      /* A metric name can be long (a route plus a hostname) and there is no useful
         way to shorten one. The table scrolls inside its own box so the panel
         itself never scrolls sideways. */
      .diag-scroll {
        overflow-x: auto;
        margin-top: 10px;
        border-radius: 12px;
        background: var(--oppai-surface-2);
      }
      .diag-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
        font-variant-numeric: tabular-nums;
      }
      .diag-table th,
      .diag-table td {
        padding: 7px 12px;
        text-align: right;
        white-space: nowrap;
      }
      .diag-table th {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--oppai-text-muted);
        font-weight: 600;
      }
      .diag-table tbody tr + tr td {
        border-top: 1px solid var(--oppai-border);
      }
      .diag-name {
        text-align: left !important;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 12px;
      }
      .diag-bad {
        color: var(--md-sys-color-error);
        font-weight: 600;
      }
      .diag-stat-num {
        font-size: 15px;
      }
      .diag-row {
        font-size: 13px;
        padding: 4px 0;
      }
      .pw {
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-width: 360px;
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    profileUpdates(this, "settings");
    this.load();
    void this.loadGenLists();
  }

  private async load() {
    try {
      const [s, st] = await Promise.all([api.getSettings(), api.stats()]);
      this.settings = s.settings;
      this.info = s.readOnly;
      this.stats = st;
    } catch (e) {
      this.loadError = (e as Error).message;
    }
    // Separate from the load above: an image built without an APK is a normal state,
    // not a settings failure, and it must not surface as "couldn't load settings".
    try {
      this.apk = await api.apkInfo();
    } catch {
      this.apk = { available: false };
    }
  }

  private get canEdit(): boolean {
    return !!this.user?.isAdmin;
  }

  /** Switch panels, fetching anything that panel needs and doesn't have yet.
      Diagnostics is loaded here rather than with the rest of the settings so that
      opening Settings at all doesn't pull a snapshot nobody asked for. */
  private openTab(id: SettingsTab) {
    // A whole pane is being replaced, which is the one case a cross-fade genuinely helps:
    // without it the swap is a hard cut. Progressive — no support means the plain
    // assignment — and skipped under reduced motion. See motion.ts.
    withViewTransition(() => {
      this.tab = id;
    });
    if (id === "diagnostics" && !this.diag && !this.diagBusy) void this.loadDiagnostics();
    if (id === "storage" && !this.storage && !this.storageBusy) void this.loadStorage();
    if (id === "account" && !this.passkeyList) void this.loadPasskeys();
  }

  // Edit server-side settings locally; nothing is sent until Save.
  private edit(patch: Partial<Settings>) {
    if (!this.settings || !this.canEdit) return;
    this.settings = { ...this.settings, ...patch };
    this.dirty = true;
    this.saved = false;
  }

  private async save() {
    if (!this.settings) return;
    this.saving = true;
    try {
      const res = await api.saveSettings(this.settings);
      this.settings = res.settings; // the server clamps; show what it actually stored
      this.info = res.readOnly;
      this.dirty = false;
      this.saved = true;
      // The next page load would pick the disguise up from the server anyway. This
      // is so the switch does something visible when you flip it: the tab's title and
      // icon change under you, and the mascot leaves (or comes back) without a reload.
      setIncognito(!!res.settings.incognito);
    } catch (e) {
      this.loadError = (e as Error).message;
    } finally {
      this.saving = false;
    }
  }

  private pickTheme(pref: ThemePref) {
    this.theme = pref;
    saveTheme(pref);
    applyTheme(pref);
  }

  private pickFit(fit: ComicFit) {
    this.fit = fit;
    saveComicFit(fit);
  }

  private async changePassword() {
    this.pwMsg = "";
    this.pwErr = "";
    if (this.pwNew !== this.pwConfirm) {
      this.pwErr = "The new passwords don't match.";
      return;
    }
    if (this.pwNew.length < 8) {
      this.pwErr = "Use at least 8 characters.";
      return;
    }
    this.pwBusy = true;
    try {
      await api.changePassword(this.pwCurrent, this.pwNew);
      this.pwMsg = "Password changed.";
      this.pwCurrent = this.pwNew = this.pwConfirm = "";
    } catch (e) {
      this.pwErr = (e as Error).message;
    } finally {
      this.pwBusy = false;
    }
  }

  render() {
    // Admin-only panels are hidden rather than shown-and-refused: a rail entry that
    // always 403s is just a dead end. Libby's panel goes the same way under the
    // disguise — a settings category named after the mascot would reintroduce her on
    // the one screen someone is most likely to go looking through.
    const tabs = SETTINGS_TABS.filter((tab) => (!tab.adminOnly || this.canEdit) &&
      !(tab.id === "libby" && isIncognito()));
    const active = tabs.find((tab) => tab.id === this.tab) ?? tabs[0];
    // Only the server-side panels have anything to save, but an edit made on one and
    // left unsaved has to stay visible after switching away from it.
    const showSave = this.dirty || this.saved;
    let group = "";
    return html`
      <div class="shell">
        <nav class="cat-rail" aria-label="Settings categories">
          ${tabs.map((tab) => {
            const heading = tab.group === group ? nothing : html`<div class="cat-head">${tab.group}</div>`;
            group = tab.group;
            return html`${heading}
              <button
                class="cat-row ${tab.id === this.tab ? "on" : ""}"
                aria-current=${tab.id === this.tab ? "page" : "false"}
                @click=${() => this.openTab(tab.id)}
              >
                <span class="material-symbols-rounded">${tab.icon}</span>
                <span class="cat-label">${tab.label}</span>
              </button>`;
          })}
          <div class="cat-sep"></div>
          <button class="cat-row danger" @click=${() => this.dispatchEvent(new CustomEvent("logout", { bubbles: true, composed: true }))}>
            <span class="material-symbols-rounded">logout</span>
            <span class="cat-label">Sign out</span>
          </button>
        </nav>

        <div class="panel-col">
          <h2 class="panel-title">${active.label}</h2>
          ${this.loadError
            ? html`<div class="banner error">
                <span class="material-symbols-rounded" style="font-size:18px;">error</span>
                ${this.loadError}
              </div>`
            : nothing}
          ${!this.canEdit && this.settings && active.server
            ? html`<div class="banner info">
                <span class="material-symbols-rounded" style="font-size:18px;">lock</span>
                Server settings are read-only — only an admin can change them.
              </div>`
            : nothing}
          ${this.renderTab()}
          ${showSave ? this.renderSaveBar() : nothing}
        </div>
      </div>
    `;
  }

  private renderTab() {
    switch (this.tab) {
      case "appearance": return this.renderAppearance();
      case "libby": return this.renderLibby();
      case "ai": return this.renderAI();
      case "scraping": return this.renderScraping();
      case "library": return this.renderLibrary();
      case "android": return this.renderAndroid();
      case "account": return this.renderAccount();
      case "storage": return this.renderStorage();
      case "diagnostics": return this.renderDiagnostics();
      case "privacy": return this.renderPrivacy();
      default: return this.renderAbout();
    }
  }

  private renderSaveBar() {
    return html`
      <div class="savebar">
        <span class="grow">
          ${this.saved && !this.dirty ? "Settings saved — they're live now." : "You have unsaved changes."}
        </span>
        <button class="btn-primary" ?disabled=${this.saving || !this.dirty} @click=${this.save}>
          <span class="material-symbols-rounded" style="font-size:20px;">save</span>
          ${this.saving ? "Saving…" : "Save"}
        </button>
      </div>
    `;
  }

  /**
   * The Android client, downloaded from the box that holds the library.
   *
   * There is no app store for this, so the server hands out its own client. The QR
   * code is the point: you scan it with the phone you want the app on, rather than
   * emailing yourself an APK.
   */
  private renderAndroid() {
    const apk = this.apk;
    return html`
      <section class="card">
        <h3><span class="material-symbols-rounded">android</span>Android app</h3>
        <p class="card-sub">
          Install the companion app straight from this server — no app store, no
          sideloading from a third party.
        </p>

        ${apk === null
          ? html`<p class="field-help">Checking…</p>`
          : !apk.available
            ? html`<p class="field-help">
                No APK is bundled with this server build. Drop one at
                <code>/config/oppailib.apk</code>, or grab it from the Actions run that
                built this image.
              </p>`
            : html`
                <div class="field">
                  <div class="field-text">
                    <div class="field-label">oppailib.apk</div>
                    <div class="field-help">
                      ${formatBytes(apk.size ?? 0)} · built
                      ${new Date((apk.modified ?? 0) * 1000).toLocaleDateString()}
                      ${apk.sha256
                        ? html`<br /><span style="font-family:monospace; font-size:11px;"
                            >sha256 ${apk.sha256.slice(0, 16)}…</span
                          >`
                        : nothing}
                    </div>
                  </div>
                  <div class="field-control">
                    <a href="/api/apk" download="oppailib.apk">
                      <button class="btn-primary">
                        <span class="material-symbols-rounded" style="font-size:20px;">download</span>
                        Download
                      </button>
                    </a>
                  </div>
                </div>

                <div class="field">
                  <div class="field-text">
                    <div class="field-label">Install on a phone</div>
                    <div class="field-help">
                      Open this page on the phone, sign in, and tap Download. Android
                      asks you to allow installing from the browser the first time.
                    </div>
                  </div>
                  <div class="field-control">
                    <code style="font-size:12px; opacity:0.8;">${location.origin}/api/apk</code>
                  </div>
                </div>
              `}
      </section>
    `;
  }

  private renderAppearance() {
    return html`
      <section class="card">
        <h3><span class="material-symbols-rounded">palette</span>Appearance</h3>
        <p class="card-sub">Per-device — applies as soon as you pick it.</p>

        <div class="field">
          <div class="field-text">
            <div class="field-label">Theme</div>
            <div class="field-help">"System" follows your OS light/dark setting.</div>
          </div>
          <div class="field-control seg">
            ${(
              [
                ["dark", "Dark", "dark_mode"],
                ["light", "Light", "light_mode"],
                ["system", "System", "contrast"],
              ] as [ThemePref, string, string][]
            ).map(
              ([id, label, icon]) => html`<button
                class=${this.theme === id ? "on" : ""}
                @click=${() => this.pickTheme(id)}
              >
                <span class="material-symbols-rounded" style="font-size:18px;">${icon}</span>${label}
              </button>`,
            )}
          </div>
        </div>

        <div class="field">
          <div class="field-text">
            <div class="field-label">Comic page size</div>
            <div class="field-help">
              How pages are sized in the reader. Fit page shows the whole page; fit width fills the
              column and scrolls.
            </div>
          </div>
          <div class="field-control seg">
            ${(
              [
                ["page", "Fit page", "fit_screen"],
                ["width", "Fit width", "fit_width"],
              ] as [ComicFit, string, string][]
            ).map(
              ([id, label, icon]) => html`<button
                class=${this.fit === id ? "on" : ""}
                @click=${() => this.pickFit(id)}
              >
                <span class="material-symbols-rounded" style="font-size:18px;">${icon}</span>${label}
              </button>`,
            )}
          </div>
        </div>
      </section>
    `;
  }

  /**
   * Incognito: what this install says it is.
   *
   * The one server setting that changes what people who never sign in can see, so
   * it says plainly what it does — and, just as plainly, what it does not. A
   * disguise that is oversold is worse than none: someone who believes it hides
   * their traffic will act on that belief.
   */
  private renderPrivacy() {
    const s = this.settings;
    const on = !!s?.incognito;
    return html`
      <section class="card">
        <h3><span class="material-symbols-rounded">visibility_off</span>Incognito</h3>
        <p class="card-sub">Server-wide — every browser and device sees it.</p>

        <div class="field">
          <div class="field-text">
            <div class="field-label">Appear as a Nextcloud instance</div>
            <div class="field-help">
              The sign-in page becomes a Nextcloud login, the tab is titled
              <strong>Nextcloud</strong> with a cloud icon, and the server answers
              <code>/status.php</code>, the OCS and DAV endpoints and its response
              headers the way a Nextcloud behind Apache does. Inside, Libby is absent —
              no mascot, no Chat or Studio — and errors show as plain notices. Your real
              username and password still sign you in.
            </div>
          </div>
          <div class="field-control">
            <button
              class="switch ${on ? "on" : ""}"
              role="switch"
              aria-checked=${on ? "true" : "false"}
              aria-label="Appear as a Nextcloud instance"
              ?disabled=${!s || !this.canEdit}
              @click=${() => this.edit({ incognito: !on })}
            ></button>
          </div>
        </div>

        <!-- Stated because the failure mode of a disguise is being trusted for more
             than it does. Everything below is true of any such skin, and none of it
             is fixable from inside the app. -->
        <div class="banner info">
          <span class="material-symbols-rounded" style="font-size:18px;">info</span>
          <div>
            <strong>What this doesn't do.</strong> It is a disguise, not encryption or
            anonymity. Over HTTPS the hostname is still visible to your network and to
            DNS, so point a matching subdomain at this server. Anyone who signs in sees
            the real library, and anyone with your browser sees its history. Media
            filenames, page titles and any file you download are unchanged.
          </div>
        </div>
      </section>
    `;
  }

  /**
   * Libby, the mascot. Per-device like Appearance — whether she's on screen is a
   * preference of whoever is looking, so no admin rights and no save step. Hiding her
   * removes the artwork everywhere (login, error popups, chat); the features stay.
   */
  private renderLibby() {
    return html`
      <section class="card">
        <h3><span class="material-symbols-rounded">face_3</span>Libby</h3>
        <p class="card-sub">Per-device — applies as soon as you pick it.</p>

        <div class="field">
          <div class="field-text">
            <div class="field-label">Hide Libby</div>
            <div class="field-help">
              Take the mascot off the login screen, error popups, and the Chat tab.
              Errors still show as plain messages, and Chat keeps working — just without
              the artwork.
            </div>
          </div>
          <div class="field-control">
            <button
              class="switch ${this.hideLibby ? "on" : ""}"
              role="switch"
              aria-checked=${this.hideLibby ? "true" : "false"}
              aria-label="Hide Libby"
              @click=${() => {
                this.hideLibby = !this.hideLibby;
                saveHideLibby(this.hideLibby);
              }}
            ></button>
          </div>
        </div>

        <div class="field">
          <div class="field-text">
            <div class="field-label">Mood progression speed</div>
            <div class="field-help">
              Controls how quickly normal app activity moves Libby between tiers. Chat tabs keep
              their own progress. Manual mood changes still apply immediately.
            </div>
          </div>
          <div class="field-control seg">
            ${LIBBY_PROGRESSION_MULTIPLIERS.map((value) => html`<button
              class=${getProgressionMultiplier() === value ? "on" : ""}
              @click=${() => { setProgressionMultiplier(value); this.requestUpdate(); }}
            >${value}×</button>`)}
          </div>
        </div>

        <div class="field stack">
          <div class="field-text">
            <div class="field-label">Outfits</div>
            <div class="field-help">
              Dressing Libby up now lives in the <strong>Studio</strong>, beside the board
              that generates the artwork — building a wardrobe is creative work rather
              than a preference, and it belongs next to the thing that makes the sprites.
            </div>
          </div>
          <div class="field-control">
            <button class="btn" @click=${() => this.dispatchEvent(new CustomEvent("open-studio", {
              bubbles: true, composed: true,
            }))}>
              Open the outfit studio
            </button>
          </div>
        </div>
      </section>
      ${this.renderLibbyImageGen()}
    `;
  }

  /**
   * How Libby makes a picture when you approve one of her offers.
   *
   * Server-side settings on an otherwise per-device panel, and they belong here rather
   * than beside the studio's own URL box: these are about *her*, not about the
   * generator. The studio is a workbench whose settings change with every experiment;
   * this is the fixed setup that makes "make me a picture of you on the balcony"
   * produce her, consistently, without leaving the conversation.
   *
   * The model and LoRA lists are read live from the generator, so the fields are
   * pickers rather than free text wherever it is reachable — a mistyped checkpoint
   * name fails at generation time, minutes after the mistake.
   */
  private renderLibbyImageGen() {
    const s = this.settings;
    if (!s) return nothing;
    if (!s.imageGenEnabled) {
      return html`<section class="card">
        <h3><span class="material-symbols-rounded">auto_awesome</span>Libby’s image generation</h3>
        <p class="card-sub">
          Set an image generator URL under <strong>Library</strong> and Libby can offer to make
          pictures for you in chat. She always asks first — nothing is generated or saved until
          you press Allow.
        </p>
      </section>`;
    }
    const models = this.genModels;
    const loras = this.genLoras;
    const boards = this.genBoards;
    return html`<section class="card">
      <h3><span class="material-symbols-rounded">auto_awesome</span>Libby’s image generation</h3>
      <p class="card-sub">
        What she uses when she offers to make you a picture. She always asks first — nothing is
        generated or saved until you press Allow.
        ${this.genError ? html`<br /><span style="color:var(--oppai-danger,#ff6b6b);">${this.genError}</span>` : nothing}
      </p>

      <div class="field">
        <div class="field-text">
          <div class="field-label">Model</div>
          <div class="field-help">The checkpoint her pictures are made with. Leave on the
            generator’s default to use whatever it loads.</div>
        </div>
        <div class="field-control">
          ${models.length
            ? html`<select ?disabled=${!this.canEdit}
                @change=${(e: Event) => this.edit({ libbyGenModel: (e.target as HTMLSelectElement).value })}>
                <option value="" ?selected=${!s.libbyGenModel}>Generator’s default</option>
                ${models.map((m) => html`<option value=${m} ?selected=${m === s.libbyGenModel}>${m}</option>`)}
              </select>`
            : html`<input type="text" autocomplete="off" placeholder="Generator’s default"
                .value=${s.libbyGenModel} ?disabled=${!this.canEdit}
                @change=${(e: Event) => this.edit({ libbyGenModel: (e.target as HTMLInputElement).value })} />`}
        </div>
      </div>

      <div class="field">
        <div class="field-text">
          <div class="field-label">LoRA</div>
          <div class="field-help">One LoRA applied to everything she makes — usually the one
            that makes the picture look like her.</div>
        </div>
        <div class="field-control" style="display:flex; gap:8px; align-items:center;">
          ${loras.length
            ? html`<select ?disabled=${!this.canEdit}
                @change=${(e: Event) => this.edit({ libbyGenLora: (e.target as HTMLSelectElement).value })}>
                <option value="" ?selected=${!s.libbyGenLora}>None</option>
                ${loras.map((l) => html`<option value=${l} ?selected=${l === s.libbyGenLora}>${l}</option>`)}
              </select>`
            : html`<input type="text" autocomplete="off" placeholder="None"
                .value=${s.libbyGenLora} ?disabled=${!this.canEdit}
                @change=${(e: Event) => this.edit({ libbyGenLora: (e.target as HTMLInputElement).value })} />`}
          <input type="number" step="0.05" min="-2" max="2" style="width:90px;"
            aria-label="LoRA strength"
            .value=${String(s.libbyGenLoraWeight || 1)} ?disabled=${!this.canEdit || !s.libbyGenLora}
            @change=${(e: Event) => this.edit({ libbyGenLoraWeight: Number((e.target as HTMLInputElement).value) })} />
        </div>
      </div>

      ${boards.length
        ? html`<div class="field">
            <div class="field-text">
              <div class="field-label">Board</div>
              <div class="field-help">The InvokeAI board her pictures are filed into, so what she
                makes stays separate from your own generations.</div>
            </div>
            <div class="field-control">
              <select ?disabled=${!this.canEdit}
                @change=${(e: Event) => this.edit({ libbyGenBoard: (e.target as HTMLSelectElement).value })}>
                <option value="" ?selected=${!s.libbyGenBoard}>Uncategorized</option>
                ${boards.map((b) => html`<option value=${b} ?selected=${b === s.libbyGenBoard}>${b}</option>`)}
              </select>
            </div>
          </div>`
        : nothing}

      <div class="field stack">
        <div class="field-text">
          <div class="field-label">Her prompt</div>
          <div class="field-help">
            Who she is, in generator words — the tokens that make the picture look like Libby
            rather than a stranger. This goes in front of whatever she describes, so her offer
            only has to say what is happening in the picture.
          </div>
        </div>
        <div class="field-control">
          <textarea rows="3" style="width:100%;"
            placeholder="1girl, long orange hair, red eyes, glasses, …"
            .value=${s.libbyGenPrompt} ?disabled=${!this.canEdit}
            @change=${(e: Event) => this.edit({ libbyGenPrompt: (e.target as HTMLTextAreaElement).value })}></textarea>
        </div>
      </div>

      <div class="field stack">
        <div class="field-text">
          <div class="field-label">Negative prompt</div>
          <div class="field-help">What to keep out of every picture she makes.</div>
        </div>
        <div class="field-control">
          <textarea rows="2" style="width:100%;"
            placeholder="lowres, bad anatomy, watermark, …"
            .value=${s.libbyGenNegativePrompt} ?disabled=${!this.canEdit}
            @change=${(e: Event) => this.edit({ libbyGenNegativePrompt: (e.target as HTMLTextAreaElement).value })}></textarea>
        </div>
      </div>
    </section>`;
  }

  /**
   * Reads the generator's model, LoRA and board lists so the fields above can be
   * pickers. Failures are reported and then dropped: the fields fall back to free text,
   * which is worse but still usable, and a settings screen that will not open because
   * an optional service is down is a bad trade.
   */
  private async loadGenLists() {
    try {
      const status = await api.imageGenStatus();
      if (!status.enabled || !status.reachable) {
        if (status.enabled) this.genError = status.error || "The image generator isn't reachable.";
        return;
      }
      // The generate request takes a checkpoint *title* and a LoRA *name*, so these
      // lists carry exactly what will be sent — not a prettier label the backend would
      // then fail to resolve.
      this.genModels = (status.models ?? []).map((m) => m.title || m.model_name).filter(Boolean);
      this.genLoras = (status.loras ?? []).map((l) => l.name).filter(Boolean);
      this.genBoards = (status.boards ?? []).map((b) => b.name).filter(Boolean);
    } catch (e) {
      this.genError = (e as Error).message;
    }
  }

  private renderAI() {
    const s = this.settings;
    const info = this.info;
    return html`
      <section class="card">
        <h3><span class="material-symbols-rounded">auto_awesome</span>AI auto-tagging</h3>
        <p class="card-sub">
          Tagging runs entirely on this box — no image ever leaves it. The heuristic tagger needs no
          model; a real classifier requires an ONNX build with a model in the model directory.
        </p>

        ${!s
          ? html`<div class="field-help">Loading…</div>`
          : html`
              ${this.switchField(
                "Enable auto-tagging",
                "Master switch. Off means no tagging at all, including the ✨ button.",
                s.aiEnabled,
                (v) => this.edit({ aiEnabled: v }),
              )}
              ${this.switchField(
                "Tag on import",
                "Tag new uploads and imports automatically. With this off, tagging only happens when you ask for it.",
                s.aiAutoTag,
                (v) => this.edit({ aiAutoTag: v }),
                !s.aiEnabled,
              )}

              <div class="field">
                <div class="field-text">
                  <div class="field-label">Minimum confidence</div>
                  <div class="field-help">Suggestions the tagger is less sure of than this are dropped.</div>
                </div>
                <div class="field-control">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    .value=${String(s.aiMinScore)}
                    ?disabled=${!this.canEdit || !s.aiEnabled}
                    @input=${(e: Event) =>
                      this.edit({ aiMinScore: Number((e.target as HTMLInputElement).value) })}
                  />
                  <span class="value">${s.aiMinScore.toFixed(2)}</span>
                </div>
              </div>

              <div class="field">
                <div class="field-text">
                  <div class="field-label">Maximum tags per item</div>
                  <div class="field-help">Only the highest-scoring suggestions are kept (1–100).</div>
                </div>
                <div class="field-control">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    .value=${String(s.aiMaxTags)}
                    ?disabled=${!this.canEdit || !s.aiEnabled}
                    @change=${(e: Event) =>
                      this.edit({ aiMaxTags: Number((e.target as HTMLInputElement).value) })}
                  />
                </div>
              </div>

              ${info
                ? html`
                    ${this.readOnlyField("Active tagger", "Chosen at startup.", info.aiTagger)}
                    ${this.readOnlyField(
                      "Inference device",
                      "OPPAI_AI_DEVICE — needs a restart to change.",
                      info.aiDevice,
                    )}
                    ${this.readOnlyField(
                      "Model directory",
                      "OPPAI_AI_MODEL_DIR — needs a restart to change.",
                      info.aiModelDir,
                    )}
                  `
                : nothing}
            `}
      </section>
    `;
  }

  private renderScraping() {
    const s = this.settings;
    return html`
      <section class="card">
        <h3><span class="material-symbols-rounded">travel_explore</span>Import &amp; scraping</h3>
        <p class="card-sub">How OppaiLib behaves toward the sites you import from.</p>

        ${!s
          ? html`<div class="field-help">Loading…</div>`
          : html`
              ${this.switchField(
                "Respect robots.txt",
                "Skip URLs a site asks crawlers not to fetch.",
                s.scrapeRespectRobots,
                (v) => this.edit({ scrapeRespectRobots: v }),
              )}

              <div class="field">
                <div class="field-text">
                  <div class="field-label">Delay between requests</div>
                  <div class="field-help">
                    Minimum gap between two requests to the same host, in milliseconds (250–60000).
                  </div>
                </div>
                <div class="field-control">
                  <input
                    type="number"
                    min="250"
                    max="60000"
                    step="250"
                    .value=${String(s.scrapeDelayMs)}
                    ?disabled=${!this.canEdit}
                    @change=${(e: Event) =>
                      this.edit({ scrapeDelayMs: Number((e.target as HTMLInputElement).value) })}
                  />
                  <span class="value">ms</span>
                </div>
              </div>

              <div class="field stack">
                <div class="field-text">
                  <div class="field-label">User agent</div>
                  <div class="field-help">
                    Sent with every scrape. The default impersonates a browser because many sites only
                    serve metadata to one; clear it back to that default by leaving it blank.
                  </div>
                </div>
                <div class="field-control">
                  <input
                    type="text"
                    .value=${s.scrapeUserAgent}
                    ?disabled=${!this.canEdit}
                    @change=${(e: Event) =>
                      this.edit({ scrapeUserAgent: (e.target as HTMLInputElement).value })}
                  />
                </div>
              </div>

              <div class="field stack">
                <div class="field-text">
                  <div class="field-label">Civitai API</div>
                  <div class="field-help">
                    Catalogue API base and optional token. The public mirror works without a token;
                    use <code>https://civitai.com/api/v1</code> with your key for authenticated access.
                    The key is stored on this server and is never sent back to the browser.
                  </div>
                </div>
                <div class="field-control">
                  <input type="text" autocomplete="off" placeholder="https://civitai.red/api/v1"
                    .value=${s.civitaiApiUrl} ?disabled=${!this.canEdit}
                    @change=${(e: Event) => this.edit({ civitaiApiUrl: (e.target as HTMLInputElement).value })} />
                </div>
                <div class="field-control">
                  <input type="password" autocomplete="new-password"
                    placeholder=${s.civitaiKeySet ? "•••••••• (unchanged)" : "Civitai API key (optional)"}
                    ?disabled=${!this.canEdit}
                    @change=${(e: Event) => this.edit({ civitaiApiKey: (e.target as HTMLInputElement).value })} />
                </div>
                ${s.civitaiKeySet ? html`<div class="field-control">
                  <button type="button" class="btn-inline" ?disabled=${!this.canEdit}
                    @click=${() => this.edit({ civitaiApiKey: "", civitaiKeySet: false })}>Clear saved key</button>
                </div>` : nothing}
              </div>

              <div class="field stack">
                <div class="field-text">
                  <div class="field-label">Rule34.xxx API</div>
                  <div class="field-help">
                    The authenticated JSON API makes browsing faster and supplies original media URLs,
                    dimensions, and reliable video types. Find the user id and API key in your Rule34 account options.
                    The key is write-only.
                  </div>
                </div>
                <div class="field-control">
                  <input type="text" inputmode="numeric" autocomplete="off" placeholder="Rule34 user id"
                    .value=${s.rule34UserId} ?disabled=${!this.canEdit}
                    @change=${(e: Event) => this.edit({ rule34UserId: (e.target as HTMLInputElement).value })} />
                </div>
                <div class="field-control">
                  <input type="password" autocomplete="new-password"
                    placeholder=${s.rule34ApiKeySet ? "•••••••• (unchanged)" : "Rule34 API key"}
                    ?disabled=${!this.canEdit}
                    @change=${(e: Event) => this.edit({ rule34ApiKey: (e.target as HTMLInputElement).value })} />
                </div>
                ${s.rule34ApiKeySet ? html`<div class="field-control">
                  <button type="button" class="btn-inline" ?disabled=${!this.canEdit}
                    @click=${() => this.edit({ rule34ApiKey: "", rule34ApiKeySet: false })}>Clear saved key</button>
                </div>` : nothing}
              </div>

              <div class="field stack">
                <div class="field-text">
                  <div class="field-label">F95zone login</div>
                  <div class="field-help">
                    Most f95zone.to game threads are members-only. Sign in with your F95 account and
                    OppaiLib can fetch those when you scrape a thread URL. Leave blank to scrape only
                    public threads. Stored on your server; the password is never sent back to this page.
                  </div>
                </div>
                <div class="field-control">
                  <input
                    type="text"
                    autocomplete="off"
                    placeholder="F95 username"
                    .value=${s.f95Username}
                    ?disabled=${!this.canEdit}
                    @change=${(e: Event) =>
                      this.edit({ f95Username: (e.target as HTMLInputElement).value })}
                  />
                </div>
                <div class="field-control">
                  <input
                    type="password"
                    autocomplete="new-password"
                    placeholder=${s.f95PasswordSet ? "•••••••• (unchanged)" : "F95 password"}
                    ?disabled=${!this.canEdit}
                    @change=${(e: Event) =>
                      this.edit({ f95Password: (e.target as HTMLInputElement).value })}
                  />
                </div>
              </div>

              <div class="field stack">
                <div class="field-text">
                  <div class="field-label">Image generation</div>
                  <div class="field-help">
                    URL of a local image generator on your network — an InvokeAI server
                    (e.g. <code>http://192.168.1.10:9090</code>) or an Automatic1111 / SD.Next
                    one (e.g. <code>http://192.168.1.10:7860</code>). Which API it speaks is
                    detected automatically. Set it to turn on the <strong>Create</strong> tab;
                    leave blank to keep it off. Prompts stay on your own hardware — nothing is
                    sent to a cloud service.
                  </div>
                </div>
                <div class="field-control">
                  <input
                    type="text"
                    autocomplete="off"
                    placeholder="http://host:7860"
                    .value=${s.imageGenUrl}
                    ?disabled=${!this.canEdit}
                    @change=${(e: Event) =>
                      this.edit({ imageGenUrl: (e.target as HTMLInputElement).value })}
                  />
                </div>
              </div>

              <div class="field stack">
                <div class="field-text">
                  <div class="field-label">Libby chat</div>
                  <div class="field-help">
                    OpenAI-compatible API base URL for your local LLM, such as
                    <code>http://host:5000/v1</code>. The model name is an optional fallback;
                    OppaiLib detects the model actually loaded by text-generation-webui.
                    Load and unload models in that backend's own WebUI—OppaiLib never changes its model lifecycle.
                  </div>
                </div>
                <div class="field-control">
                  <input
                    type="text"
                    autocomplete="off"
                    placeholder="http://host:5000/v1"
                    .value=${s.chatUrl}
                    ?disabled=${!this.canEdit}
                    @change=${(e: Event) => this.edit({ chatUrl: (e.target as HTMLInputElement).value })}
                  />
                </div>
                <div class="field-control">
                  <input
                    type="text"
                    autocomplete="off"
                    placeholder="Optional fallback model name"
                    .value=${s.chatModel}
                    ?disabled=${!this.canEdit}
                    @change=${(e: Event) => this.edit({ chatModel: (e.target as HTMLInputElement).value })}
                  />
                </div>
                <div class="field-control">
                  <input
                    type="password"
                    autocomplete="new-password"
                    placeholder=${s.chatApiKeySet ? "API key saved — enter to replace" : "API key (optional)"}
                    .value=${s.chatApiKey}
                    ?disabled=${!this.canEdit}
                    @change=${(e: Event) => this.edit({ chatApiKey: (e.target as HTMLInputElement).value })}
                  />
                </div>
              </div>

              <div class="field stack">
                <div class="field-text">
                  <div class="field-label">Model folder (for deleting models)</div>
                  <div class="field-help">
                    Where text-generation-webui keeps its models, <em>as this container sees
                    it</em> — map the same host folder into both. Needed only so a model can
                    be deleted from here; that backend exposes no delete API, so it is a
                    file operation. Leave blank and the delete control is simply absent.
                    Deleting moves a model to a recoverable folder inside this directory
                    unless you ask for a permanent delete, and never touches the model that
                    is currently loaded.
                  </div>
                </div>
                <div class="field-control">
                  <input
                    type="text"
                    autocomplete="off"
                    placeholder="/models"
                    .value=${s.chatModelDir}
                    ?disabled=${!this.canEdit}
                    @change=${(e: Event) => this.edit({ chatModelDir: (e.target as HTMLInputElement).value })}
                  />
                </div>
              </div>
            `}
      </section>
    `;
  }

  private renderLibrary() {
    const st = this.stats;
    if (!st) return nothing;
    const byKind = new Map(st.kinds.map((k) => [k.kind, k] as const));
    return html`
      <section class="card">
        <h3><span class="material-symbols-rounded">inventory_2</span>Library</h3>
        <p class="card-sub">
          ${st.items} ${st.items === 1 ? "item" : "items"} · ${formatBytes(st.bytes)} stored ·
          ${st.tags} ${st.tags === 1 ? "tag" : "tags"}
        </p>
        <div class="stat-grid">
          ${(Object.keys(KIND_META) as Kind[]).map((k) => {
            const row = byKind.get(k);
            return html`<div class="stat">
              <div class="stat-num">${row?.count ?? 0}</div>
              <div class="stat-label">${KIND_META[k].label} · ${formatBytes(row?.bytes ?? 0)}</div>
            </div>`;
          })}
        </div>
      </section>
    `;
  }

  /**
   * Passkeys.
   *
   * The list is the revocation screen as much as it is an inventory, which drives the
   * design: each entry has to be identifiable as a physical thing you either still have
   * or have lost. So it shows the name you gave it, whether it is synced to an account
   * (a synced key survives losing the device; a device-bound one does not, and that
   * changes whether you need a second one), and when it was last used.
   *
   * Password sign-in is stated as still working rather than left implied. It is the
   * fallback the brief requires and it is the recovery path — a lost authenticator must
   * not be a lost account — and someone deciding whether to add a passkey needs to know
   * that before they commit.
   */
  private renderPasskeys() {
    const list = this.passkeyList;
    return html`
      <section class="card">
        <h3><span class="material-symbols-rounded">passkey</span>Passkeys</h3>
        <p class="card-sub">
          Sign in with your device's fingerprint, face or PIN instead of typing a password.
          Nothing guessable crosses the network and the server only ever stores a public
          key — your device keeps the private half.
        </p>

        ${this.passkeyError
          ? html`<div class="banner error">
              <span class="material-symbols-rounded" style="font-size:18px;">error</span>${this.passkeyError}
            </div>`
          : nothing}
        ${this.passkeyMsg
          ? html`<div class="banner ok">
              <span class="material-symbols-rounded" style="font-size:18px;">check_circle</span>${this.passkeyMsg}
            </div>`
          : nothing}

        ${list && !list.available
          ? html`<div class="banner info">
              <span class="material-symbols-rounded" style="font-size:18px;">lock</span>
              ${list.reason}
            </div>`
          : nothing}

        ${list === null
          ? html`<p class="field-help">Checking…</p>`
          : list.passkeys.length === 0
            ? html`<p class="field-help">
                No passkeys yet. Your password keeps working either way — it's also how you
                get back in if you lose a device.
              </p>`
            : html`
                <div class="pk-list">
                  ${list.passkeys.map((pk) => this.renderPasskeyRow(pk))}
                </div>
              `}

        ${list?.available
          ? html`
              <div class="pk-add">
                <input
                  type="text"
                  placeholder="Name this device — e.g. “Work laptop”"
                  .value=${this.passkeyName}
                  ?disabled=${this.passkeyBusy}
                  @input=${(e: Event) => (this.passkeyName = (e.target as HTMLInputElement).value)}
                />
                <button class="btn-primary" ?disabled=${this.passkeyBusy} @click=${this.addPasskey}>
                  <span class="material-symbols-rounded" style="font-size:20px;">add</span>
                  ${this.passkeyBusy ? "Waiting for your device…" : "Add a passkey"}
                </button>
              </div>
            `
          : nothing}

        ${list?.relyingPartyId
          ? html`<p class="field-help">
              Passkeys added here are tied to <code>${list.relyingPartyId}</code>. That's how
              WebAuthn works — reach OppaiLib at a different address and your device won't
              offer them, so add one per address you actually use.
            </p>`
          : nothing}
      </section>
    `;
  }

  private renderPasskeyRow(pk: Passkey) {
    const renaming = this.passkeyRenaming === pk.id;
    const revoking = this.passkeyRevoking === pk.id;
    return html`
      <div class="pk-row">
        <span class="material-symbols-rounded pk-icon">${pk.synced ? "cloud_sync" : "key"}</span>
        <div class="pk-body">
          ${renaming
            ? html`<div class="pk-rename">
                <input
                  type="text"
                  .value=${this.passkeyName}
                  @input=${(e: Event) => (this.passkeyName = (e.target as HTMLInputElement).value)}
                />
                <button @click=${() => void this.savePasskeyName(pk)}>Save</button>
                <button @click=${() => (this.passkeyRenaming = null)}>Cancel</button>
              </div>`
            : html`<div class="pk-name">${pk.name}</div>`}
          <div class="pk-meta">
            ${pk.synced ? "Synced to your account" : "This device only"}
            · added ${formatWhen(pk.createdAt)}
            · ${pk.lastUsedAt ? `last used ${formatWhen(pk.lastUsedAt)}` : "never used"}
          </div>
          ${revoking
            ? html`<div class="pk-revoke">
                <p class="field-help">
                  Confirm with your password. A signed-in browser isn't proof of who's at
                  the keyboard, and this is the first thing someone taking over an account
                  would do.
                </p>
                <input
                  type="password"
                  autocomplete="current-password"
                  placeholder="Your password"
                  .value=${this.passkeyPassword}
                  @input=${(e: Event) => (this.passkeyPassword = (e.target as HTMLInputElement).value)}
                />
                <div class="pk-revoke-actions">
                  <button @click=${this.cancelRevoke}>Cancel</button>
                  <button class="danger" ?disabled=${this.passkeyBusy || !this.passkeyPassword}
                    @click=${() => void this.revokePasskey(pk)}>
                    ${this.passkeyBusy ? "Removing…" : "Remove it"}
                  </button>
                </div>
              </div>`
            : nothing}
        </div>
        ${renaming || revoking
          ? nothing
          : html`<div class="pk-actions">
              <button title="Rename" @click=${() => this.startRename(pk)}>
                <span class="material-symbols-rounded" style="font-size:18px;">edit</span>
              </button>
              <button title="Remove" @click=${() => this.startRevoke(pk)}>
                <span class="material-symbols-rounded" style="font-size:18px;">delete</span>
              </button>
            </div>`}
      </div>
    `;
  }

  private async loadPasskeys() {
    try {
      this.passkeyList = await api.passkeys();
    } catch (e) {
      this.passkeyError = (e as Error).message;
    }
  }

  private addPasskey = async () => {
    this.passkeyBusy = true;
    this.passkeyError = "";
    this.passkeyMsg = "";
    try {
      const created = await registerPasskey(this.passkeyName.trim());
      this.passkeyName = "";
      this.passkeyMsg = `Added “${created.name}”. You can sign in with it now.`;
      await this.loadPasskeys();
    } catch (e) {
      // An empty message means the user dismissed the prompt, which is not a failure.
      const message = passkeyErrorMessage(e);
      if (message) this.passkeyError = message;
    } finally {
      this.passkeyBusy = false;
    }
  };

  private startRename(pk: Passkey) {
    this.passkeyRenaming = pk.id;
    this.passkeyRevoking = null;
    this.passkeyName = pk.name;
  }

  private async savePasskeyName(pk: Passkey) {
    const name = this.passkeyName.trim();
    if (!name) return;
    try {
      await api.renamePasskey(pk.id, name);
      this.passkeyRenaming = null;
      this.passkeyName = "";
      await this.loadPasskeys();
    } catch (e) {
      this.passkeyError = (e as Error).message;
    }
  }

  private startRevoke(pk: Passkey) {
    this.passkeyRevoking = pk.id;
    this.passkeyRenaming = null;
    this.passkeyPassword = "";
    this.passkeyError = "";
  }

  private cancelRevoke = () => {
    this.passkeyRevoking = null;
    this.passkeyPassword = "";
  };

  private async revokePasskey(pk: Passkey) {
    this.passkeyBusy = true;
    this.passkeyError = "";
    try {
      await api.revokePasskey(pk.id, this.passkeyPassword);
      this.passkeyRevoking = null;
      this.passkeyPassword = "";
      this.passkeyMsg = `Removed “${pk.name}”.`;
      await this.loadPasskeys();
    } catch (e) {
      this.passkeyError = (e as Error).message;
    } finally {
      this.passkeyBusy = false;
    }
  }

  private renderAccount() {
    return html`
      ${this.renderPasskeys()}
      <section class="card">
        <h3><span class="material-symbols-rounded">account_circle</span>Account</h3>
        <p class="card-sub">
          Signed in as <strong>${this.user?.username}</strong>${this.user?.isAdmin ? " (admin)" : ""}.
        </p>

        ${this.pwErr
          ? html`<div class="banner error">
              <span class="material-symbols-rounded" style="font-size:18px;">error</span>${this.pwErr}
            </div>`
          : nothing}
        ${this.pwMsg
          ? html`<div class="banner ok">
              <span class="material-symbols-rounded" style="font-size:18px;">check_circle</span>${this.pwMsg}
            </div>`
          : nothing}

        <div class="pw">
          <input
            type="password"
            placeholder="Current password"
            autocomplete="current-password"
            .value=${this.pwCurrent}
            @input=${(e: Event) => (this.pwCurrent = (e.target as HTMLInputElement).value)}
          />
          <input
            type="password"
            placeholder="New password (8+ characters)"
            autocomplete="new-password"
            .value=${this.pwNew}
            @input=${(e: Event) => (this.pwNew = (e.target as HTMLInputElement).value)}
          />
          <input
            type="password"
            placeholder="Confirm new password"
            autocomplete="new-password"
            .value=${this.pwConfirm}
            @input=${(e: Event) => (this.pwConfirm = (e.target as HTMLInputElement).value)}
          />
          <div>
            <button
              class="btn-primary"
              ?disabled=${this.pwBusy || !this.pwCurrent || !this.pwNew}
              @click=${this.changePassword}
            >
              <span class="material-symbols-rounded" style="font-size:20px;">key</span>
              ${this.pwBusy ? "Changing…" : "Change password"}
            </button>
          </div>
        </div>
      </section>
    `;
  }

  /**
   * Where the server's time went.
   *
   * The point of this panel is to answer "why does this feel slow?" without an SSH
   * session. It is built around two facts that are otherwise invisible:
   *
   *  - Whether the database is in WAL mode. When it isn't, every query in the
   *    process queues on a single connection and nothing else on this page matters
   *    until it's fixed, so it's stated first and in plain words.
   *  - Whether a slow interaction was slow *here* or slow at the far end. Request
   *    routes and outbound hosts share one list, sorted by total time spent, so a
   *    scrape stuck behind someone else's website reads as exactly that instead of
   *    looking like an OppaiLib problem.
   */
  /**
   * Storage: what is mapped where, how full it is, and what to do about it.
   *
   * The volume bars are the whole point. From inside the container every mapping is
   * just a directory, so a share filling up shows as an upload that dies rather than
   * as anything to do with disks — and the operator has no way to tell which of six
   * mappings is the one to make bigger. Every row therefore names its environment
   * variable, and a warning says which one to expand in as many words.
   */
  private renderStorage() {
    const s = this.storage;
    return html`
      <section class="card">
        <h3><span class="material-symbols-rounded">hard_drive</span>Storage</h3>
        <p class="card-sub">
          Where OppaiLib keeps things, and how much room is left. Nothing here lives
          inside the container image unless you left a mapping unset — which is what
          the warnings are for.
        </p>

        ${this.storageErr
          ? html`<div class="banner error">
              <span class="material-symbols-rounded" style="font-size:18px;">error</span>${this.storageErr}
            </div>`
          : nothing}

        ${(s?.warnings ?? []).map((w) => html`<div class="banner error">
          <span class="material-symbols-rounded" style="font-size:18px;">warning</span>${w}
        </div>`)}

        <div class="diag-actions">
          <button class="btn-primary" ?disabled=${this.storageBusy} @click=${this.loadStorage}>
            <span class="material-symbols-rounded" style="font-size:20px;">refresh</span>
            ${this.storageBusy ? "Reading…" : "Refresh"}
          </button>
          ${this.user?.isAdmin
            ? html`<button ?disabled=${this.storageBusy} @click=${this.runCleanup}>
                <span class="material-symbols-rounded" style="font-size:20px;">mop</span>
                Reclaim space
              </button>`
            : nothing}
          <span class="field-help grow">
            Reclaiming removes only what can be recreated: chunks of uploads nobody
            came back to finish, and scratch files from jobs that have ended. It never
            touches your media, Libby's memories or model files.
          </span>
        </div>

        ${!s
          ? html`<p class="field-help">${this.storageBusy ? "Reading…" : "No reading yet."}</p>`
          : html`
              ${s.pendingBytes > 0
                ? html`<p class="field-help">
                    Uploads in progress still need about ${formatBytes(s.pendingBytes)}.
                  </p>`
                : nothing}
              ${s.mappings.map((m) => this.renderMapping(m))}
              <h4 style="margin:18px 0 6px;">Reclaimable now</h4>
              ${s.reclaimable.map((r) => html`<p class="field-help">
                ${r.label}: <strong>${formatBytes(r.bytes)}</strong>${r.note ? html` — ${r.note}` : nothing}
              </p>`)}
            `}
      </section>
    `;
  }

  private renderMapping(m: StorageReport["mappings"][number]) {
    const pct = m.totalBytes > 0 ? Math.round((m.usedBytes / m.totalBytes) * 100) : 0;
    return html`
      <div class="setting-row" style="display:block;">
        <div style="display:flex; align-items:baseline; gap:8px; flex-wrap:wrap;">
          <strong>${m.label}</strong>
          <code style="font-size:12px; opacity:.8;">${m.path}</code>
          ${m.exists
            ? nothing
            : html`<span class="field-help" style="color:var(--oppai-error);">not mapped</span>`}
          ${m.exists && !m.writable
            ? html`<span class="field-help" style="color:var(--oppai-error);">read-only</span>`
            : nothing}
        </div>
        <div style="height:6px; border-radius:999px; background:var(--oppai-surface-2); overflow:hidden; margin:6px 0;">
          <span style="display:block; height:100%; width:${pct}%; background:${pct >= 90 ? "var(--oppai-error)" : "var(--oppai-primary)"};"></span>
        </div>
        <p class="field-help">
          ${m.error
            ? m.error
            : html`${formatBytes(m.freeBytes)} free of ${formatBytes(m.totalBytes)} (${pct}% used)`}
          ${(m.contents ?? []).map((c) => html` · ${c.label}: ${formatBytes(c.bytes)}${c.count ? html` (${c.count})` : nothing}`)}
        </p>
        <p class="field-help">${m.purpose} Set with <code>${m.env}</code>.</p>
      </div>
    `;
  }

  private loadStorage = async () => {
    this.storageBusy = true;
    this.storageErr = "";
    try {
      this.storage = await api.storage();
    } catch (e) {
      this.storageErr = (e as Error).message;
    } finally {
      this.storageBusy = false;
    }
  };

  private runCleanup = async () => {
    this.storageBusy = true;
    this.storageErr = "";
    try {
      const res = await api.cleanupStorage(["uploads", "temp"]);
      this.storage = res.storage;
      mascotSay(`Reclaimed ${res.freedHuman}.`, "success");
    } catch (e) {
      this.storageErr = (e as Error).message;
    } finally {
      this.storageBusy = false;
    }
  };

  private renderDiagnostics() {
    const d = this.diag;
    const ui = this.uiDiag;
    return html`
      <section class="card">
        <h3><span class="material-symbols-rounded">speed</span>Performance</h3>
        <p class="card-sub">
          Counters and latencies since the server started, or since you last reset them.
          Nothing here is sent anywhere — it's read straight off this box.
        </p>

        ${this.diagErr
          ? html`<div class="banner error">
              <span class="material-symbols-rounded" style="font-size:18px;">error</span>${this.diagErr}
            </div>`
          : nothing}

        <div class="diag-actions">
          <button class="btn-primary" ?disabled=${this.diagBusy} @click=${this.loadDiagnostics}>
            <span class="material-symbols-rounded" style="font-size:20px;">refresh</span>
            ${this.diagBusy ? "Reading…" : "Refresh"}
          </button>
          <button ?disabled=${this.diagBusy || !d} @click=${this.resetDiagnostics}>
            <span class="material-symbols-rounded" style="font-size:20px;">restart_alt</span>
            Reset counters
          </button>
          <span class="field-help grow">
            Reset, reproduce the slow thing, then refresh — totals for the whole
            uptime are hard to read anything out of.
          </span>
        </div>

        ${!d
          ? html`<p class="field-help">${this.diagBusy ? "Reading…" : "No snapshot yet."}</p>`
          : html`
              ${d.dbWal
                ? nothing
                : html`<div class="banner error">
                    <span class="material-symbols-rounded" style="font-size:18px;">warning</span>
                    The database isn't in WAL mode, so every query runs one at a time.
                    This is usually because it lives on a network share — move it to a
                    local disk and restart.
                  </div>`}

              <div class="stat-grid">
                ${this.diagStat("Uptime", formatDuration(d.uptimeSeconds))}
                ${this.diagStat("Requests", String(d.metrics.counters["http.requests"] ?? 0))}
                ${this.diagStat("Server errors", String(d.metrics.counters["http.status.5xx"] ?? 0))}
                ${this.diagStat("Memory", `${d.heapMB} MB heap · ${d.sysMB} MB total`)}
                ${this.diagStat("Goroutines", `${d.goroutines} on ${d.numCpu} CPUs`)}
                ${this.diagStat("Database", d.dbWal ? `WAL · ${d.dbInUse}/${d.dbOpenConns} in use` : "serialized (no WAL)")}
              </div>

              <h4 class="diag-head">Slowest by total time</h4>
              <p class="field-help">
                <code>http.…</code> is this server handling a request;
                <code>scrape.fetch.…</code> is it waiting on someone else's site.
                Percentiles are estimates from fixed buckets.
              </p>
              ${d.metrics.timings.length === 0
                ? html`<p class="field-help">Nothing measured in this window yet.</p>`
                : html`
                    <div class="diag-scroll">
                      <table class="diag-table">
                        <thead>
                          <tr>
                            <th>What</th><th>Calls</th><th>Avg</th><th>p95</th><th>Worst</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${d.metrics.timings.slice(0, 25).map(
                            (t: Timing) => html`<tr>
                              <td class="diag-name">${t.name}</td>
                              <td>${t.count}</td>
                              <td>${t.avgMs} ms</td>
                              <td>${t.p95Ms} ms</td>
                              <td class=${t.maxMs >= 3000 ? "diag-bad" : ""}>${t.maxMs} ms</td>
                            </tr>`,
                          )}
                        </tbody>
                      </table>
                    </div>
                  `}

              ${this.renderFetchHealth(d)}

              <h4 class="diag-head">This browser</h4>
              <p class="field-help">
                Complete Lit component updates include template work and the DOM commit.
                A slow update takes over one 16 ms frame. Long tasks are browser main-thread
                stalls over 50 ms; layout shift excludes movement caused by your input.
              </p>
              ${!ui
                ? html`<p class="field-help">Refresh to read browser timings.</p>`
                : html`
                    <div class="stat-grid">
                      ${this.diagStat("UI updates", String(ui.updates))}
                      ${this.diagStat("Slow updates", String(ui.slowUpdates))}
                      ${this.diagStat("Long tasks", `${ui.longTasks} · ${Math.round(ui.longTaskMs)} ms`)}
                      ${this.diagStat("Layout shift", `${ui.layoutShifts} · ${ui.layoutShiftScore}`)}
                    </div>
                    ${ui.timings.length === 0
                      ? html`<p class="field-help">No profiled component has updated in this window yet.</p>`
                      : html`
                          <div class="diag-scroll">
                            <table class="diag-table">
                              <thead>
                                <tr><th>Component</th><th>Updates</th><th>Avg</th><th>p95</th><th>Slow</th><th>Worst</th></tr>
                              </thead>
                              <tbody>
                                ${ui.timings.map((timing) => html`<tr>
                                  <td class="diag-name">${timing.name}</td>
                                  <td>${timing.count}</td>
                                  <td>${timing.avgMs} ms</td>
                                  <td>${timing.p95Ms} ms</td>
                                  <td class=${timing.slow ? "diag-bad" : ""}>${timing.slow}</td>
                                  <td class=${timing.maxMs > 16 ? "diag-bad" : ""}>${timing.maxMs} ms</td>
                                </tr>`)}
                              </tbody>
                            </table>
                          </div>
                        `}
                  `}
            `}
      </section>
    `;
  }

  /** The outbound-fetch counters, in words. Raw counter names are unreadable, and
      these four are the ones that actually diagnose a struggling Browse tab. */
  private renderFetchHealth(d: Diagnostics) {
    const c = d.metrics.counters;
    const rows: [string, number, string][] = [
      ["Fetches completed", c["scrape.fetch.ok"] ?? 0, "Pages and listings fetched successfully."],
      ["Retried", c["scrape.fetch.retry"] ?? 0, "A site failed transiently and we tried again."],
      ["Gave up", c["scrape.fetch.exhausted"] ?? 0, "Still failing after every retry."],
      ["Queued behind another request", c["scrape.host_queued"] ?? 0, "A steady number here means we're fanning out wider than the site allows."],
      ["Asked to back off", c["scrape.fetch.backoff_too_long"] ?? 0, "A site asked for a longer wait than we'll hold a click open for."],
    ];
    if (rows.every(([, n]) => n === 0)) return nothing;
    return html`
      <h4 class="diag-head">Outbound fetches</h4>
      ${rows.map(([label, n, help]) =>
        n === 0 ? nothing : html`<div class="diag-row"><strong>${n}</strong> ${label} <span class="field-help">— ${help}</span></div>`,
      )}
    `;
  }

  private diagStat(label: string, value: string) {
    return html`<div class="stat">
      <div class="stat-num diag-stat-num">${value}</div>
      <div class="stat-label">${label}</div>
    </div>`;
  }

  private loadDiagnostics = async () => {
    this.diagBusy = true;
    this.diagErr = "";
    try {
      this.diag = await api.diagnostics();
      this.uiDiag = uiMetricsSnapshot();
    } catch (e) {
      this.diagErr = (e as Error).message;
    } finally {
      this.diagBusy = false;
    }
  };

  private resetDiagnostics = async () => {
    this.diagBusy = true;
    this.diagErr = "";
    try {
      resetUIMetrics();
      await api.resetDiagnostics();
      this.diag = await api.diagnostics();
      this.uiDiag = uiMetricsSnapshot();
    } catch (e) {
      this.diagErr = (e as Error).message;
    } finally {
      this.diagBusy = false;
    }
  };

  private renderAbout() {
    const i = this.info;
    if (!i) return nothing;
    return html`
      <section class="card">
        <h3><span class="material-symbols-rounded">info</span>About this server</h3>
        <p class="card-sub">Set by environment variables; changing them needs a restart.</p>
        ${this.readOnlyField("Version", "The running build.", i.version)}
        ${this.readOnlyField("Libby features", "Included in this exact server build.", (i.features ?? []).join(" · ") || "legacy build")}
        ${this.readOnlyField(
          "Video thumbnails",
          "Posters need ffmpeg on the server's PATH.",
          i.ffmpeg ? "ffmpeg available" : "ffmpeg missing — posters disabled",
        )}
        ${this.readOnlyField("Media directory", "Where encrypted blobs live.", i.mediaDir)}
        ${this.readOnlyField("Database", "SQLite metadata store.", i.dbPath)}
        ${this.readOnlyField("Session length", "How long a login stays valid.", `${i.sessionHours} hours`)}
      </section>
    `;
  }

  // --- Field builders -----------------------------------------------------
  private switchField(
    label: string,
    help: string,
    value: boolean,
    onChange: (v: boolean) => void,
    forceDisabled = false,
  ) {
    const disabled = !this.canEdit || forceDisabled;
    return html`
      <div class="field">
        <div class="field-text">
          <div class="field-label">${label}</div>
          <div class="field-help">${help}</div>
        </div>
        <div class="field-control">
          <button
            class="switch ${value ? "on" : ""}"
            role="switch"
            aria-checked=${value ? "true" : "false"}
            aria-label=${label}
            ?disabled=${disabled}
            @click=${() => onChange(!value)}
          ></button>
        </div>
      </div>
    `;
  }

  private readOnlyField(label: string, help: string, value: string) {
    return html`
      <div class="field">
        <div class="field-text">
          <div class="field-label">${label}</div>
          <div class="field-help">${help}</div>
        </div>
        <div class="field-control"><span class="ro">${value}</span></div>
      </div>
    `;
  }
}

/** A past moment, phrased the way someone recalling a device would.
 *
 * Relative near the present ("2 days ago") because that is what answers "do I still have
 * this?", and an absolute date beyond a month, where "47 days ago" stops meaning
 * anything. */
function formatWhen(epochMillis: number): string {
  if (!epochMillis) return "never";
  const seconds = Math.max(0, (Date.now() - epochMillis) / 1000);
  if (seconds < 90) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days <= 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(epochMillis).toLocaleDateString();
}

/** Uptime, in the largest two units that matter. "3d 4h" reads; "277481s" doesn't. */
function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n < 10 && i > 0 ? n.toFixed(1) : Math.round(n)} ${units[i]}`;
}

declare global {
  interface HTMLElementTagNameMap {
    "oppai-settings": OppaiSettings;
  }
}
