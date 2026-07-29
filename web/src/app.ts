import { LitElement, html, css } from "lit";
import { customElement, state } from "lit/decorators.js";
import { keyed } from "lit/directives/keyed.js";
import { api, getToken, setToken, mascotSay, type User } from "./api.js";
import { ambientIntensity, applyImageFallback, inferErrorEmotion, libbyAssetCandidates, libbyHidden } from "./libby.js";
import { isIncognito } from "./incognito.js";
import { libbyMotion, typeDuration } from "./libby-motion.js";
import { bumpIntensity } from "./libby-meter.js";
import { libbyOnUpload, type LibbyItemFacts } from "./libby-voice.js";
import { profileUpdates } from "./ui-metrics.js";
import "./views/login.js";
import "./views/library.js";
import "./views/upload-manager.js";

/**
 * How often to ask the server whether our session is still good.
 *
 * A browser session dies of inactivity, and it dies when the server restarts — but
 * without a probe we would only find that out on the next request the user happened
 * to make, leaving a signed-out UI sitting there looking signed in. The probe
 * (`/api/auth/me`) does not count as activity server-side, so polling it cannot itself
 * keep an idle tab alive: an untouched tab still idles out, it just notices promptly.
 */
const SESSION_PROBE_MS = 60_000;

@customElement("oppai-app")
export class OppaiApp extends LitElement {
  @state() private user: User | null = null;
  @state() private ready = false;
  @state() private mascotMessage = "";
  @state() private mascotTone: "success" | "error" = "success";
  // When an event tells us Libby's pose (a happy library-add reaction, say) we honor
  // it; errors that arrive without one still infer their mood from the message text.
  @state() private mascotEmotion = "";
  @state() private mascotIntensity = 0;

  /**
   * How much of the current line has been revealed.
   *
   * A dialogue box types its line out; that is most of what makes one feel like a
   * dialogue box rather than a toast. The full text is in the DOM's aria-label from
   * the first frame, so a screen reader is never made to wait for the flourish.
   */
  @state() private typed = "";
  /** Bumped per line so the sprite's reaction animation restarts on each one. */
  @state() private beat = 0;

  private probeTimer?: number;
  private mascotTimer?: number;
  private typeTimer?: number;

  static styles = [libbyMotion, css`
    :host { display: block; min-height: 100vh; min-height: 100dvh; }
    .center { display: grid; place-items: center; height: 100vh; height: 100dvh; }

    /* Libby's pop-up follows the peach pixel dialogue reference: warm paper, dark
       stepped outline, coral lower edge and a pointed lower-right tail. Her sprite
       remains beside it as the speaker instead of being replaced by a toast icon. */
    .mascot-talk {
      position: fixed;
      right: 18px;
      top: 72px;
      z-index: 200;
      display: flex;
      align-items: flex-end;
      gap: 0;
      pointer-events: none;
      --pixel-ink: #29262a;
      --pixel-bg: #f3bd86;
      --pixel-bg-top: #f7c994;
      --pixel-shadow: #c96f5b;
      --pixel-accent: #7b3f2e;
    }
    .mascot-talk.error { --pixel-ink: #6f2928; --pixel-accent: #8d302d; }

    /* The sprite stands cleanly beside the box. The reference's tail points toward
       this space, so framing her in a second box would make two competing bubbles. */
    .pixel-sprite {
      flex: 0 0 auto;
      position: relative;
      width: 96px;
      height: 132px;
      margin-left: 14px;
    }
    .pixel-sprite img {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
      object-position: bottom center;
      filter: drop-shadow(0 5px 5px rgba(0,0,0,.3));
      transform-origin: 50% 100%;
    }

    .speech {
      position: relative;
      max-width: min(330px, 55vw);
      margin: 0 0 20px 0;
      padding: 13px 16px 17px;
      background: linear-gradient(180deg, var(--pixel-bg-top), var(--pixel-bg));
      color: #35282a;
      border: 3px solid var(--pixel-ink);
      border-radius: 6px;
      box-shadow:
        inset 0 0 0 2px rgba(255, 225, 183, .42),
        inset 0 -5px 0 var(--pixel-shadow),
        0 3px 0 var(--pixel-shadow);
      font: 500 13px/1.5 ui-monospace, "Cascadia Mono", Consolas, "DejaVu Sans Mono", monospace;
      letter-spacing: .02em;
    }
    /* Two clipped layers make the outlined, lower-right speech tail from the
       reference. The fill sits inside the dark silhouette and inherits its peach. */
    .speech::before,
    .speech::after {
      content: "";
      position: absolute;
      clip-path: polygon(0 0, 100% 100%, 74% 0);
    }
    .speech::before { right: -16px; bottom: -17px; width: 27px; height: 31px; background: var(--pixel-ink); }
    .speech::after { right: -10px; bottom: -10px; width: 18px; height: 23px; background: var(--pixel-shadow); }
    /* Libby hidden: the frame alone, without the sprite's footprint. */
    .mascot-talk.plain .speech::before,
    .mascot-talk.plain .speech::after { display: none; }

    .libby-name {
      display: block;
      margin-bottom: 3px;
      color: var(--pixel-accent);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: .14em;
      text-transform: uppercase;
    }
    /* The box is sized by the *whole* line from the first frame, with the typed
       portion laid over the top. Without this it grows a character at a time — and
       since the pop-up is anchored to the right edge, a growing box drags itself and
       her portrait leftwards across the screen for the length of the animation. The
       ghost is what a dialogue box's fixed frame is, done in flow layout. */
    .line { position: relative; display: block; }
    .ghost { visibility: hidden; }
    .shown { position: absolute; inset: 0; }
    /* The "there is more" marker every dialogue box has. It appears only once the
       line has finished typing, so it means what it looks like it means — and the
       ghost reserves its width so its arrival cannot reflow the last word. */
    .caret {
      display: inline-block;
      margin-left: 4px;
      color: var(--pixel-accent);
      font-size: 11px;
    }

    @media (max-width: 600px) {
      .mascot-talk { top: 64px; right: 14px; }
      .pixel-sprite { width: 70px; height: 96px; margin-left: 10px; }
      .speech { max-width: 66vw; padding: 10px 12px 14px; font-size: 12px; }
    }

    /* ── Standard errors ──────────────────────────────────────────────────
       The incognito error surface: an ordinary snackbar, bottom-centre, in the
       app's own colours.

       Hiding Libby already drops her artwork and her name, but what is left is
       still a peach pixel dialogue box that types its line out — which is a
       character even with nobody in it. Under the disguise that is exactly
       wrong, so this is a different element rather than the same one with the
       sprite removed: no typing, no caret, no tail, and it appears where a
       notification appears rather than where a mascot stands. */
    .snackbar {
      position: fixed;
      left: 50%;
      bottom: 22px;
      z-index: 200;
      transform: translateX(-50%);
      max-width: min(520px, calc(100vw - 32px));
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 16px;
      border-radius: 8px;
      background: #323232;
      color: #fff;
      box-shadow: 0 6px 22px rgba(0, 0, 0, 0.4);
      font: 400 14px/1.45 Roboto, system-ui, sans-serif;
      animation: oppai-snackbar-in 0.18s ease-out both;
    }
    .snackbar.error { background: #b3261e; }
    .snackbar .material-symbols-rounded { font-size: 19px; flex: 0 0 auto; }
    @keyframes oppai-snackbar-in {
      from { opacity: 0; transform: translate(-50%, 12px); }
      to { opacity: 1; transform: translate(-50%, 0); }
    }
    @media (prefers-reduced-motion: reduce) {
      .snackbar { animation: none; }
    }
  `];

  connectedCallback() {
    super.connectedCallback();
    profileUpdates(this, "app shell");
    window.addEventListener("oppai-logout", this.onLogout);
    window.addEventListener("oppai-mascot", this.onMascot as EventListener);
    window.addEventListener("oppai-libby-pref", this.onLibbyPref);
    window.addEventListener("imported", this.onImported as EventListener);
    // A tab that was in the background while the session died should find out the
    // moment it's looked at again, rather than on the next tick.
    document.addEventListener("visibilitychange", this.onVisible);
    this.bootstrap();
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("oppai-logout", this.onLogout);
    window.removeEventListener("oppai-mascot", this.onMascot as EventListener);
    window.removeEventListener("oppai-libby-pref", this.onLibbyPref);
    window.removeEventListener("imported", this.onImported as EventListener);
    document.removeEventListener("visibilitychange", this.onVisible);
    this.stopProbe();
    if (this.mascotTimer) clearTimeout(this.mascotTimer);
    if (this.typeTimer) cancelAnimationFrame(this.typeTimer);
  }

  private onMascot = (event: CustomEvent<{ message: string; tone: "success" | "error"; emotion?: string; intensity?: number }>) => {
    // Libby reacts in character to things happening around the app — errors and
    // successes alike. An event that names her pose (a happy library-add, say) is
    // shown as-is; a bare error still infers its mood from the message text at render.
    // (The login screen owns its own always-on Libby; this popup only shows once
    // you're inside, see render().)
    const d = event.detail;
    this.mascotMessage = d.message;
    this.mascotTone = d.tone;
    this.mascotEmotion = d.emotion ?? "";
    this.mascotIntensity = d.intensity ?? 0;
    this.beat++;
    this.typeLine(d.message);
    if (this.mascotTimer) clearTimeout(this.mascotTimer);
    // The line stays up long enough to read *after* it has finished typing, rather
    // than spending part of its five seconds still arriving.
    this.mascotTimer = window.setTimeout(() => (this.mascotMessage = ""), 5000 + typeDuration(d.message));
  };

  /**
   * Reveals a line character by character.
   *
   * Driven off rAF rather than a per-character timer: the reveal is time-based, so
   * it lands in the same place regardless of frame rate, and a line that arrives
   * while another is still typing simply takes over. Honours the OS
   * reduced-motion setting by showing the whole line at once.
   */
  private typeLine(text: string) {
    if (this.typeTimer) cancelAnimationFrame(this.typeTimer);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      this.typed = text;
      return;
    }
    const total = typeDuration(text), startedAt = performance.now();
    this.typed = "";
    const step = () => {
      const progress = Math.min(1, (performance.now() - startedAt) / Math.max(1, total));
      this.typed = text.slice(0, Math.ceil(text.length * progress));
      if (progress < 1) this.typeTimer = requestAnimationFrame(step);
      else this.typeTimer = undefined;
    };
    this.typeTimer = requestAnimationFrame(step);
  }

  // Adding to the library warms Libby up (her session horniness) and gets a reaction.
  // The event bubbles composed from whichever view did the import. Her wording comes
  // from the local voice (libby-voice.ts), so it shifts with the meter she just moved.
  //
  // A view that knows what it just added says so in the detail, and she remarks on
  // the thing itself rather than on the act of saving. Views that only know a count
  // still get the generic line, so nothing has to be updated in lockstep.
  private onImported = (event: CustomEvent<LibbyItemFacts>) => {
    const facts = event.detail ?? {};
    const count = Math.max(1, facts.count ?? 1);
    const intensity = bumpIntensity(count > 1 ? 2 : 1);
    const line = libbyOnUpload({ ...facts, count }, { intensity });
    mascotSay(line.message, "success", { emotion: line.emotion, intensity: line.intensity });
  };

  // The Settings toggle fires this; re-render so a popup that's on screen right now
  // sheds (or regains) the mascot immediately.
  private onLibbyPref = () => this.requestUpdate();

  private onLogout = () => {
    this.user = null;
    this.stopProbe();
  };

  private onVisible = () => {
    if (document.visibilityState === "visible" && this.user) void this.probe();
  };

  private async bootstrap() {
    if (getToken()) {
      try {
        this.user = await api.me();
        this.startProbe();
      } catch {
        setToken(null);
      }
    }
    this.ready = true;
  }

  // The session probe. `api.me()` already routes a 401 through the shared logout
  // event, so a rejected session lands us back on the login screen on its own; a
  // network blip is not a logout, and is ignored.
  private async probe() {
    if (!getToken()) return;
    try {
      await api.me();
    } catch {
      /* 401 has already logged us out; anything else is transient */
    }
  }

  private startProbe() {
    this.stopProbe();
    this.probeTimer = window.setInterval(() => void this.probe(), SESSION_PROBE_MS);
  }

  private stopProbe() {
    if (this.probeTimer) {
      clearInterval(this.probeTimer);
      this.probeTimer = undefined;
    }
  }

  private onLoggedIn(e: CustomEvent<User>) {
    this.mascotMessage = "";
    this.user = e.detail;
    this.startProbe();
  }

  private async logout() {
    try { await api.logout(); } catch { /* ignore */ }
    setToken(null);
    this.user = null;
    this.stopProbe();
  }

  /**
   * The incognito notice: whatever was said, said plainly.
   *
   * Same messages, same timing, same roles for assistive technology — only the
   * delivery changes. It is still the app's one error surface, so a disguise can
   * no more swallow a message than hiding Libby can.
   */
  private renderSnackbar() {
    if (!this.mascotMessage) return null;
    return html`<div class="snackbar ${this.mascotTone}"
      role=${this.mascotTone === "error" ? "alert" : "status"}>
      <span class="material-symbols-rounded" aria-hidden="true"
        >${this.mascotTone === "error" ? "error" : "check_circle"}</span>
      <span>${this.mascotMessage}</span>
    </div>`;
  }

  render() {
    // This popup is the app's error surface, so hiding Libby can't hide the message —
    // it just drops the character: same bubble, no artwork, no name. Incognito goes
    // one step further and swaps the bubble for an ordinary snackbar, since a pixel
    // dialogue box is itself a character even when nobody is standing in it.
    const plainErrors = isIncognito();
    const hideLibby = libbyHidden();
    // Prefer the pose the event carried; fall back to inferring one from an error's text.
    const cue = this.mascotEmotion
      ? { emotion: this.mascotEmotion, intensity: this.mascotIntensity || 1 }
      : inferErrorEmotion(this.mascotMessage);
    // Capped like the sign-in screen: this pop-up appears over whatever the user was
    // doing, on any screen, unasked. See AMBIENT_MAX_INTENSITY.
    const assets = libbyAssetCandidates(cue.emotion, ambientIntensity(cue.intensity));
    const done = this.typed.length >= this.mascotMessage.length;
    // She rocks into a line she is pleased with and jolts on an error. Keyed on the
    // beat so the animation replays per line rather than only on the first one, and
    // on the pose so a mood change swaps the sprite instead of mutating src — which
    // is what restarts the fallback chain for the new artwork.
    const reaction = this.mascotTone === "error" ? "libby-startle" : "libby-speak";
    const mascot = plainErrors
      ? this.renderSnackbar()
      : this.mascotMessage
      ? html`<div class="mascot-talk libby-enter ${this.mascotTone} ${hideLibby ? "plain" : ""}">
          <div class="speech" role=${this.mascotTone === "error" ? "alert" : "status"}
            aria-label=${this.mascotMessage}>
            ${hideLibby ? null : html`<span class="libby-name">Libby</span>`}
            <span class="line" aria-hidden="true"
              ><span class="ghost">${this.mascotMessage}<span class="caret">▼</span></span
              ><span class="shown">${this.typed}${done
                ? html`<span class="caret libby-caret">▼</span>`
                : null}</span
            ></span>
          </div>
          ${hideLibby
            ? null
            : html`<span class="pixel-sprite libby-breathe">${keyed(`${this.beat}-${cue.emotion}-${cue.intensity}`,
                html`<img class=${reaction} src=${assets[0]} data-fallback-index="0"
                  alt=${`Libby feeling ${cue.emotion}`}
                  @error=${(e: Event) => applyImageFallback(e.target as HTMLImageElement, assets)} />`)}</span>`}
        </div>`
      : null;
    if (!this.ready) {
      return html`<div class="center"><md-circular-progress indeterminate></md-circular-progress></div>${mascot}`;
    }
    if (!this.user) {
      return html`<oppai-login @logged-in=${this.onLoggedIn}></oppai-login>`;
    }
    // The upload manager is mounted here, beside the whole app rather than inside
    // it, which is what makes an upload survive navigating away from the screen that
    // started it — the fix the brief asks for in as many words.
    return html`<oppai-library
      .user=${this.user}
      @logout=${this.logout}
    ></oppai-library><oppai-upload-manager></oppai-upload-manager>${mascot}`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oppai-app": OppaiApp;
  }
}
