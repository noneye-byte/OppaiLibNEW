import { LitElement, html, css, nothing } from "lit";
import { customElement, state, query } from "lit/decorators.js";
import { keyed } from "lit/directives/keyed.js";
import { api, mascotSay, setToken, type User } from "../api.js";
import { motionStyles } from "../theme.js";
import { logoSVG } from "../logo.js";
import { ambientIntensity, applyImageFallback, inferErrorEmotion, libbyAssetCandidates,
  libbyHidden, normalizeEmotion, type LibbyEmotion } from "../libby.js";
import { isIncognito } from "../incognito.js";
import { libbyReact } from "../libby-voice.js";
import { libbyMotion } from "../libby-motion.js";
import { getIntensity } from "../libby-meter.js";
import { loginWithPasskey, passkeyErrorMessage, passkeysSupported } from "../passkeys.js";
import "@material/web/button/text-button.js";

/**
 * The sign-in page is the one screen shown before anyone has consented to
 * anything, and the one most likely to be seen over a shoulder — so it takes the
 * shared ambient cap rather than the meter. See AMBIENT_MAX_INTENSITY, which the
 * pop-up she speaks through applies for the same reason.
 */
const loginIntensity = ambientIntensity;

const loginGreeting = libbyReact("greeting", { intensity: loginIntensity(getIntensity()) });
const loginEmotions: LibbyEmotion[] = ["happy", "neutral", "thinking", "mischievous", "surprised"];

@customElement("oppai-login")
export class OppaiLogin extends LitElement {
  @state() private error = "";
  @state() private busy = false;
  @state() private libbyMessage = loginGreeting.message;
  @state() private libbyTone: "success" | "error" = "success";
  @state() private libbyEmotion: LibbyEmotion = loginEmotions[Math.floor(Math.random() * loginEmotions.length)];
  @state() private libbyIntensity = loginIntensity(getIntensity());

  /** Whether to offer the passkey button. False on a browser without WebAuthn and on a
      plain-HTTP LAN address, where the browser refuses and the button would do nothing
      visible. Resolved once on mount — neither condition changes while the page is up. */
  @state() private passkeyReady = false;
  private libbyTimer?: number;

  static styles = [
    motionStyles,
    libbyMotion,
    css`
      :host {
        display: grid;
        place-items: center;
        min-height: 100vh;
        padding: 1rem;
        position: relative;
        overflow: hidden;
        background:
          radial-gradient(1200px 600px at 50% -10%, color-mix(in srgb, var(--md-sys-color-primary) 14%, transparent), transparent 70%),
          var(--md-sys-color-background);
      }

      /* The mascot is anchored to the bottom edge and bleeds off it — she has no legs,
         so any gap under her reads as a cut-off. She sits behind the card and must
         never swallow a click meant for the form. */
      .libby {
        position: absolute;
        right: 0;
        bottom: 0;
        width: min(48vw, 540px);
        height: min(82vh, 720px);
        pointer-events: none;
        user-select: none;
      }
      /* Three layers, and they have to stay three. The outer .libby owns the
         positioning — including the translateX that centres her on narrow screens —
         so no animation may touch its transform. The figure breathes, the image
         inside it reacts to a line; splitting them is also what keeps a reaction
         from cancelling the idle loop, since one element runs one animation. */
      .libby-figure {
        display: block;
        height: 100%;
        width: 100%;
        transform-origin: 50% 100%;
      }
      .libby img {
        display: block;
        height: 100%;
        width: 100%;
        object-fit: contain;
        object-position: right bottom;
        /* Motion pivots at her feet: she is anchored to the bottom edge, so scaling
           or rocking about the centre would lift her off it. */
        transform-origin: 50% 100%;
      }
      .libby.error img { filter: saturate(.82); }
      /* Clear of the sign-in card, not behind it. At 72%/12% the bubble's left half
         sat under the card — the card is position:relative and therefore paints
         over her — so most of what she said was invisible. Above and to the right
         of the card is empty space at every width this breakpoint covers, and the
         z-index makes the overlap harmless if a longer line does reach the card. */
      .libby-speech {
        position: absolute;
        right: 30%;
        top: -2%;
        z-index: 2;
        width: min(260px, 42vw);
        padding: 11px 14px;
        border-radius: 18px 18px 4px 18px;
        background: var(--md-sys-color-surface-container-high);
        color: var(--md-sys-color-on-surface);
        border: 1px solid var(--md-sys-color-primary);
        box-shadow: 0 8px 28px rgba(0,0,0,.3);
        font: 500 14px/1.4 Roboto, system-ui, sans-serif;
      }
      .libby.error .libby-speech { border-color: var(--md-sys-color-error); }
      .libby-name { display: block; color: var(--md-sys-color-primary); font-size: 11px; font-weight: 700; }
      @media (max-width: 900px) {
        .libby {
          right: 50%;
          transform: translateX(50%);
          width: min(88vw, 390px);
          height: min(42vh, 360px);
          opacity: 0.78;
        }
        .libby-speech { right: 58%; top: -8%; }
      }

      .card {
        position: relative;
        background: var(--md-sys-color-surface-container);
        border: 1px solid var(--md-sys-color-outline-variant);
        border-radius: 28px;
        padding: 2.25rem 2rem;
        width: min(380px, 100%);
        display: flex;
        flex-direction: column;
        gap: 1rem;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
        animation: oppai-scale-in 0.42s var(--oppai-ease-spring) both;
      }
      /* Above the mascot, and pulled up off the bottom edge she occupies. */
      @media (max-width: 900px) {
        .card { margin-bottom: 22vh; }
      }
      h1 {
        margin: 0 0 0.25rem;
        text-align: center;
        letter-spacing: 0.5px;
        font-weight: 600;
      }
      .brand { text-align: center; color: var(--md-sys-color-primary); }
      /* The mark takes its colour from here, which is what makes it themeable. */
      .logo {
        display: block;
        width: 84px;
        height: 84px;
        margin: 0 auto;
        color: var(--md-sys-color-primary);
      }
      .logo svg {
        width: 100%;
        height: 100%;
        display: block;
      }
      .tagline {
        text-align: center;
        margin: 0 0 0.5rem;
        font-size: 0.85rem;
        color: var(--md-sys-color-on-surface-variant);
      }
      md-filled-text-field { width: 100%; }
      md-filled-button { --md-filled-button-container-shape: 14px; }
      .err {
        color: var(--md-sys-color-error);
        font-size: 0.85rem;
        min-height: 1.2em;
        text-align: center;
      }
      /* Separates the two ways in without implying one is the real one — password stays
         the fallback and the recovery path, so neither is demoted visually. */
      .or {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--md-sys-color-on-surface-variant);
      }
      .or::before,
      .or::after {
        content: "";
        flex: 1;
        height: 1px;
        background: var(--md-sys-color-outline-variant);
      }

      /* ── Incognito sign-in ────────────────────────────────────────────────
         The disguise, and the only screen it has to be convincing on: this is
         what someone who opens the bookmark sees, and all they see unless they
         have the password.

         It is written as its own block rather than as overrides of the card
         above because almost nothing carries over. The app's sign-in is a
         Material card on a dark warm background with a mascot leaning into it;
         this is a flat blue field, a centred wordmark, two stacked rounded
         inputs and a full-width button. Trying to reach one from the other with
         a class or two would leave the tells that give a skin away — a radius
         that is 28px where it should be 8, a stray elevation shadow. */
      :host(.cloud) {
        background: #0082c9;
        background: linear-gradient(40deg, #0082c9 0%, #1cafff 100%);
      }
      .cloud-card {
        width: min(300px, 100%);
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
        color: #fff;
        font-family: "Noto Sans", "Open Sans", Roboto, system-ui, sans-serif;
      }
      .cloud-mark {
        display: block;
        width: 128px;
        margin: 0 auto 4px;
      }
      .cloud-word {
        margin: 0 0 18px;
        text-align: center;
        font-size: 26px;
        font-weight: 300;
        letter-spacing: 0.4px;
      }
      /* Plain inputs, not Material fields: the label sits inside as a
         placeholder, the corners are gently rounded, and focus is a white ring. */
      .cloud-card input {
        width: 100%;
        box-sizing: border-box;
        height: 44px;
        padding: 0 14px;
        border: 2px solid rgba(255, 255, 255, 0.45);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.95);
        color: #222;
        font: inherit;
        font-size: 15px;
        outline: none;
      }
      .cloud-card input:focus { border-color: #fff; }
      .cloud-card button.cloud-submit {
        height: 44px;
        border: 2px solid rgba(255, 255, 255, 0.7);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.15);
        color: #fff;
        font: inherit;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }
      .cloud-card button.cloud-submit:hover:not(:disabled) { background: rgba(255, 255, 255, 0.27); }
      .cloud-card button.cloud-submit:disabled { opacity: 0.7; cursor: default; }
      .cloud-link {
        margin: 4px auto 0;
        border: 0;
        background: none;
        padding: 4px;
        color: #fff;
        font: inherit;
        font-size: 13px;
        opacity: 0.85;
        cursor: pointer;
      }
      .cloud-link:hover { text-decoration: underline; }
      /* A plain error line, in the shape this kind of page uses: a tinted strip
         above the form, not a mascot with an opinion about it. */
      .cloud-err {
        padding: 9px 12px;
        border-radius: 8px;
        background: rgba(0, 0, 0, 0.25);
        color: #fff;
        font-size: 13px;
        text-align: center;
      }
      .cloud-foot {
        margin-top: 22px;
        text-align: center;
        color: rgba(255, 255, 255, 0.8);
        font-size: 12px;
        line-height: 1.6;
      }
    `,
  ];

  @query("form") private form!: HTMLFormElement;

  connectedCallback() {
    super.connectedCallback();
    // The host element carries the background, and under the disguise that is a
    // flat blue field rather than the app's warm gradient. Set here rather than
    // in render so it is not a DOM mutation performed during rendering.
    this.classList.toggle("cloud", isIncognito());
    window.addEventListener("oppai-mascot", this.onLibby as EventListener);
    this.libbyTimer = window.setTimeout(() => (this.libbyMessage = ""), 5000);
    // isSecureContext is the browser's own answer to whether WebAuthn is permitted here,
    // which beats guessing from the URL.
    this.passkeyReady = passkeysSupported() && window.isSecureContext;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("oppai-mascot", this.onLibby as EventListener);
    if (this.libbyTimer) clearTimeout(this.libbyTimer);
  }

  private onLibby = (event: CustomEvent<{ message: string; tone: "success" | "error"; emotion?: string; intensity?: number }>) => {
    this.libbyMessage = event.detail.message;
    this.libbyTone = event.detail.tone;
    const inferred = event.detail.tone === "error" ? inferErrorEmotion(event.detail.message) : { emotion: "happy" as const, intensity: 1 };
    this.libbyEmotion = normalizeEmotion(event.detail.emotion ?? inferred.emotion);
    this.libbyIntensity = loginIntensity(event.detail.intensity ?? inferred.intensity);
    if (this.libbyTimer) clearTimeout(this.libbyTimer);
    this.libbyTimer = window.setTimeout(() => {
      this.libbyMessage = "";
    }, 5000);
  };

  // Material web text fields live in shadow DOM, so Enter doesn't trigger the
  // form's native implicit submission. Wire it up explicitly.
  private onKeydown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !this.busy) {
      e.preventDefault();
      this.form.requestSubmit();
    }
  };

  /**
   * Signs in with a passkey, no username typed.
   *
   * Deliberately a button rather than the browser's conditional autofill: a conditional
   * request that finds no credential waits silently and forever, which behind a button
   * would look like the app hanging. A modal prompt either offers something or is
   * dismissed, and both are outcomes the user can see.
   *
   * The password form is untouched by any of this. It is the fallback the brief requires
   * and the recovery path when an authenticator is lost, so a passkey failure says so
   * rather than blocking the screen.
   */
  private passkeySignIn = async () => {
    if (this.busy) return;
    this.error = "";
    this.busy = true;
    try {
      const res = await loginWithPasskey();
      this.welcome(res.user.username);
      this.dispatchEvent(
        new CustomEvent<User>("logged-in", { detail: res.user, bubbles: true, composed: true }),
      );
    } catch (err) {
      // An empty message means the user cancelled, which is not a failure to report.
      const message = passkeyErrorMessage(err);
      if (message) {
        this.error = message;
        mascotSay(message);
      }
    } finally {
      this.busy = false;
    }
  };

  /**
   * The sign-in page as a self-hosted cloud's.
   *
   * Deliberately a separate render path rather than the same form with different
   * styling. It has to be able to differ in wording ("Account name", not
   * "Username"), in what it offers (a dead "Forgot password?" link, because every
   * such page has one and its absence is a tell), and in what it must never show
   * — no mascot, no product name, no error phrased like a character.
   *
   * The form beneath is the real one: these are the real credentials, posted to
   * the real endpoint. Passkeys stay available for the same reason they always
   * were, and a passkey prompt names "Nextcloud" here because the server hands the
   * browser that display name while the disguise is on (see loginRealm).
   */
  private renderCloudLogin() {
    return html`
      <form class="cloud-card" @submit=${this.submit} @keydown=${this.onKeydown}>
        <!-- A cloud drawn from three lobes: the shape this kind of service always
             uses, drawn here rather than borrowed from anyone's trademark. -->
        <svg class="cloud-mark" viewBox="0 0 56 40" aria-hidden="true">
          <circle cx="26" cy="20" r="13" fill="#fff" />
          <circle cx="42" cy="24" r="9" fill="#fff" />
          <circle cx="12" cy="25" r="8" fill="#fff" />
          <rect x="12" y="24" width="30" height="9" fill="#fff" />
        </svg>
        <h1 class="cloud-word">Nextcloud</h1>
        ${this.error ? html`<div class="cloud-err" role="alert">${this.error}</div>` : nothing}
        <input name="username" type="text" placeholder="Account name" autocomplete="username"
          autofocus required aria-label="Account name" />
        <input name="password" type="password" placeholder="Password" autocomplete="current-password"
          required aria-label="Password" />
        <button class="cloud-submit" type="submit" ?disabled=${this.busy}>
          ${this.busy ? "Logging in…" : html`Log in <span aria-hidden="true">→</span>`}
        </button>
        ${this.passkeyReady
          ? html`<button class="cloud-link" type="button" ?disabled=${this.busy} @click=${this.passkeySignIn}>
              Log in with a device
            </button>`
          : nothing}
        <!-- Present because every such page has one, and its absence is a tell.
             It says the true thing a self-hosted instance's does say. -->
        <button class="cloud-link" type="button"
          @click=${() => (this.error = "Contact your administrator to reset your password.")}>
          Forgot password?
        </button>
        <div class="cloud-foot">Nextcloud – a safe home for all your data</div>
      </form>
    `;
  }

  private async submit(e: Event) {
    e.preventDefault();
    if (this.busy) return;
    this.error = "";
    this.busy = true;
    const form = e.target as HTMLFormElement;
    const u = (form.elements.namedItem("username") as HTMLInputElement).value;
    const p = (form.elements.namedItem("password") as HTMLInputElement).value;
    try {
      const res = await api.login(u, p);
      setToken(res.token);
      this.welcome(res.user.username);
      this.dispatchEvent(
        new CustomEvent<User>("logged-in", { detail: res.user, bubbles: true, composed: true }),
      );
    } catch (err) {
      const raw = (err as Error).message || "login failed";
      // Under the disguise the failure is worded the way a login page words it.
      // "unauthorized" is the API's own word and belongs to neither audience.
      this.error = raw === "unauthorized"
        ? "Wrong account name or password."
        : raw;
      if (isIncognito()) return; // the strip above the form is the whole report
      if (raw === "unauthorized") {
        const nope = libbyReact("loginFail");
        mascotSay(nope.message, "error", { emotion: nope.emotion, intensity: nope.intensity });
      } else {
        mascotSay(this.error);
      }
    } finally {
      this.busy = false;
    }
  }

  /** Greets a successful sign-in — in character, or not at all. */
  private welcome(username: string) {
    if (isIncognito()) return;
    const line = libbyReact("login");
    mascotSay(`${line.message.replace(/\.$/, "")}, ${username}.`, "success",
      { emotion: line.emotion, intensity: line.intensity });
  }

  render() {
    if (isIncognito()) return this.renderCloudLogin();
    // With Libby hidden the mascot (and her speech) stays off the login screen
    // entirely; errors still land in the form's own error line below.
    const assets = libbyAssetCandidates(this.libbyEmotion, this.libbyIntensity);
    const libby = libbyHidden()
      ? null
      : html`<div class="libby ${this.libbyMessage ? "talking" : ""} ${this.libbyTone}">
          ${this.libbyMessage ? html`<div class="libby-speech libby-enter" role=${this.libbyTone === "error" ? "alert" : "status"}>
            <span class="libby-name">LIBBY</span>${this.libbyMessage}
          </div>` : null}
          <!-- Keyed on the pose and on the line she is saying, so she rocks into a
               new one and a mood change replaces the element — which is what
               restarts the artwork fallback chain for the new pose. -->
          <span class="libby-figure libby-breathe">${keyed(`${this.libbyEmotion}-${this.libbyIntensity}-${this.libbyMessage}`, html`<img
            class=${this.libbyTone === "error" ? "libby-startle" : "libby-speak"}
            src=${assets[0]} data-fallback-index="0" alt=${`Libby feeling ${this.libbyEmotion}`}
            @error=${(e: Event) => applyImageFallback(e.target as HTMLImageElement, assets)} />`)}</span>
        </div>`;
    return html`
      ${libby}
      <form class="card" @submit=${this.submit} @keydown=${this.onKeydown}>
        <span class="logo">${logoSVG}</span>
        <h1 class="brand">OppaiLib</h1>
        <p class="tagline">Your private media library</p>
        <md-filled-text-field label="Username" name="username" autofocus required></md-filled-text-field>
        <md-filled-text-field label="Password" name="password" type="password" required>
        </md-filled-text-field>
        <div class="err">${this.error}</div>
        <md-filled-button type="submit" ?disabled=${this.busy}>
          ${this.busy ? "Signing in…" : "Sign in"}
        </md-filled-button>
        ${this.passkeyReady
          ? html`
              <div class="or">or</div>
              <!-- type="button": inside a form, a bare button submits, which would fire
                   the password path with empty fields. -->
              <md-text-button type="button" ?disabled=${this.busy} @click=${this.passkeySignIn}>
                <span class="material-symbols-rounded" slot="icon" style="font-size:18px;">passkey</span>
                Use a passkey
              </md-text-button>
            `
          : nothing}
      </form>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap { "oppai-login": OppaiLogin; }
}
