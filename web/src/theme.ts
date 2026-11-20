import { css } from "lit";

// Design tokens for the OppaiLib UI: the "darkroom" palette.
//
// A photo library is judged by its pictures, and a tinted page tints them: the old
// orange/tan surfaces put a brown cast on every thumbnail beside them, which is the
// one thing a gallery's chrome must not do. So the surfaces are near-neutral ink (a
// whisper of warmth, never enough to read as a colour) and the warmth lives in one
// coral-apricot accent — a darkroom's safelight, used for where you are and what to
// press, and nowhere else.
//
// @material/web components read the --md-sys-color-* custom properties; the
// hand-authored views read the parallel --oppai-* tokens. Both are defined for a full
// dark scheme and a full light override under [data-theme="light"]. Custom properties
// inherit through shadow boundaries, so these values reach every component's shadow
// root. Material You (material-you.ts) writes the same names in a later stylesheet,
// which is why nothing here may be renamed: a token it does not know about would keep
// this palette's value under someone else's colours. The few tokens below that it
// does not write are derived from ones it does, with color-mix, so they follow it.
//
// NOTE: a COMPLETE --md-sys-color-* set is intentional. Material Web filled
// fields fall back to their light-theme defaults for any token you leave
// undefined (surface-container-highest in particular), which is what produced
// the old "white text field on a white fill" login boxes.
export const globalStyles = `
  :root {
    color-scheme: dark;

    /* ── M3 tokens · dark ────────────────────────────────────────── */
    --md-sys-color-primary: #FFAA8C;
    --md-sys-color-on-primary: #561F0C;
    --md-sys-color-primary-container: #5E2A18;
    --md-sys-color-on-primary-container: #FFDBCF;
    --md-sys-color-secondary: #E2BFB4;
    --md-sys-color-on-secondary: #422B23;
    --md-sys-color-secondary-container: #3B2D29;
    --md-sys-color-on-secondary-container: #FFDBCF;
    --md-sys-color-tertiary: #E3C58C;
    --md-sys-color-on-tertiary: #3F2E04;

    --md-sys-color-surface: #0F0E10;
    --md-sys-color-surface-dim: #0F0E10;
    --md-sys-color-surface-bright: #363338;
    --md-sys-color-surface-container-lowest: #0A090B;
    --md-sys-color-surface-container-low: #141315;
    --md-sys-color-surface-container: #19181B;
    --md-sys-color-surface-container-high: #222024;
    --md-sys-color-surface-container-highest: #2C2A2F;

    --md-sys-color-on-surface: #F2EDEF;
    --md-sys-color-on-surface-variant: #C9C1C6;
    --md-sys-color-outline: #8E868C;
    --md-sys-color-outline-variant: #3A373D;
    --md-sys-color-error: #FFB4AB;
    --md-sys-color-on-error: #690005;
    --md-sys-color-background: #0F0E10;
    --md-sys-color-on-background: #F2EDEF;
    --md-icon-font: 'Material Symbols Rounded';

    /* ── Raw shell palette (parallel to the M3 tokens above) ─────── */
    --oppai-bg: #0F0E10;
    --oppai-nav: #131214;
    --oppai-nav-hover: #1D1B1F;
    --oppai-surface: #19181B;
    --oppai-surface-2: #222024;
    --oppai-accent: #3B2D29;
    --oppai-on-accent: #FFDBCF;
    --oppai-primary: #FFAA8C;
    --oppai-primary-bright: #FFCDBB;
    --oppai-primary-container: #5E2A18;
    --oppai-on-primary: #561F0C;
    --oppai-text: #F2EDEF;
    --oppai-text-dim: #C9C1C6;
    --oppai-text-muted: #8E868C;
    --oppai-border: #232125;
    --oppai-border-strong: #3A373D;
    --oppai-fav: #FF8FA3;
    --oppai-scrim: rgba(4, 3, 5, 0.66);

    /* Motion — Material 3 easing sets */
    --oppai-ease-emphasized: cubic-bezier(0.2, 0, 0, 1);
    --oppai-ease-standard: cubic-bezier(0.2, 0, 0, 1);
    --oppai-ease-spring: cubic-bezier(0.34, 1.4, 0.64, 1);

    --oppai-radius: 16px;
    font-family: "Roboto", system-ui, -apple-system, sans-serif;
  }

  :root[data-theme="light"] {
    color-scheme: light;

    /* ── M3 tokens · light ───────────────────────────────────────── */
    --md-sys-color-primary: #A23F22;
    --md-sys-color-on-primary: #FFFFFF;
    --md-sys-color-primary-container: #FFDBCF;
    --md-sys-color-on-primary-container: #3A0B00;
    --md-sys-color-secondary: #77574C;
    --md-sys-color-on-secondary: #FFFFFF;
    --md-sys-color-secondary-container: #FCE3DA;
    --md-sys-color-on-secondary-container: #2C160E;
    --md-sys-color-tertiary: #6D5C2F;

    --md-sys-color-surface: #FAF8F8;
    --md-sys-color-surface-dim: #E2DEDF;
    --md-sys-color-surface-bright: #FAF8F8;
    --md-sys-color-surface-container-lowest: #FFFFFF;
    --md-sys-color-surface-container-low: #F4F1F2;
    --md-sys-color-surface-container: #EFEBEC;
    --md-sys-color-surface-container-high: #E8E4E6;
    --md-sys-color-surface-container-highest: #E2DEE0;

    --md-sys-color-on-surface: #1C1A1D;
    --md-sys-color-on-surface-variant: #4C464B;
    --md-sys-color-outline: #7E777C;
    --md-sys-color-outline-variant: #D3CDD1;
    --md-sys-color-error: #BA1A1A;
    --md-sys-color-background: #FAF8F8;
    --md-sys-color-on-background: #1C1A1D;

    /* ── Raw shell palette · light ───────────────────────────────── */
    --oppai-bg: #FAF8F8;
    --oppai-nav: #F3F0F1;
    --oppai-nav-hover: #E8E4E6;
    --oppai-surface: #F1EEEF;
    --oppai-surface-2: #E9E5E7;
    --oppai-accent: #FCE3DA;
    --oppai-on-accent: #2C160E;
    --oppai-primary: #A23F22;
    --oppai-primary-bright: #A23F22;
    --oppai-primary-container: #FFDBCF;
    --oppai-on-primary: #FFFFFF;
    --oppai-text: #1C1A1D;
    --oppai-text-dim: #4C464B;
    --oppai-text-muted: #7E777C;
    --oppai-border: #E6E1E3;
    --oppai-border-strong: #D3CDD1;
    --oppai-fav: #C9184A;
    --oppai-scrim: rgba(28, 20, 24, 0.36);
  }

  /* ── Derived tokens ─────────────────────────────────────────────────
     Names the views had been reading with an inline fallback each, so the same
     "error" was five different reds across the app, and names the redesign adds.
     All are mixed from the tokens above rather than given colours of their own, so a
     Material You palette (which writes only those) carries them along. They sit in
     their own :root rule after both schemes; a var() in a custom property resolves
     against whichever scheme won, so one definition serves dark and light. */
  :root {
    --oppai-error: var(--md-sys-color-error);
    --oppai-danger: var(--md-sys-color-error);
    --oppai-success: color-mix(in srgb, #4CC38A 78%, var(--oppai-text));
    --oppai-warning: color-mix(in srgb, #F2B84B 82%, var(--oppai-text));
    --oppai-outline: var(--oppai-border-strong);
    --oppai-on-primary-container: var(--md-sys-color-on-primary-container);
    --oppai-hover: var(--oppai-nav-hover);
    --oppai-surface-1: var(--oppai-surface);
    --oppai-surface-3: color-mix(in srgb, var(--oppai-surface-2) 84%, var(--oppai-text));
    /* Where you are: the selected row, tab or chip. A tint of the accent rather than a
       container fill, so it reads as "lit" on any surface it lands on. */
    --oppai-selected: color-mix(in srgb, var(--oppai-primary) 15%, transparent);
    --oppai-selected-strong: color-mix(in srgb, var(--oppai-primary) 24%, transparent);
    /* Frosted bars over content: the top bar and the phone's bottom bar. */
    --oppai-glass: color-mix(in srgb, var(--oppai-bg) 78%, transparent);
    --oppai-shadow-pop: 0 18px 48px rgba(0, 0, 0, 0.42), 0 2px 6px rgba(0, 0, 0, 0.2);
    --oppai-radius-sm: 8px;
    --oppai-radius-md: 12px;
    --oppai-radius-lg: 20px;
  }

  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; }
  body {
    background: var(--md-sys-color-background);
    color: var(--md-sys-color-on-surface);
    font-family: "Roboto", system-ui, -apple-system, sans-serif;
    transition: background 0.3s var(--oppai-ease-standard), color 0.3s var(--oppai-ease-standard);
  }
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-thumb { background: var(--oppai-border-strong); border-radius: 8px; }
  ::-webkit-scrollbar-track { background: transparent; }
`;

// Material Symbols Rounded icon helper, included in each shadow root that
// renders <span class="material-symbols-rounded">. The @font-face itself is
// declared document-side in index.html (self-hosted from /fonts) and applies
// inside shadow DOM.
export const iconStyles = css`
  .material-symbols-rounded {
    font-family: "Material Symbols Rounded";
    font-weight: normal;
    font-style: normal;
    line-height: 1;
    letter-spacing: normal;
    text-transform: none;
    display: inline-block;
    white-space: nowrap;
    word-wrap: normal;
    direction: ltr;
    font-feature-settings: "liga";
    -webkit-font-smoothing: antialiased;
    user-select: none;
  }
  /* The filled weight is its own face, not an axis sweep. It was written as
     font-variation-settings, which never did anything: the font the page loaded
     was pinned to FILL 0 and carried no axis to move, so a filled star rendered
     outlined. Switching families is what actually fills it. */
  .fill-icon {
    font-family: "Material Symbols Rounded Fill";
  }
`;

// Shared motion primitives: M3-flavoured keyframes + easing helpers. Included
// in each component's shadow root (keyframes don't cross shadow boundaries).
// Honors prefers-reduced-motion by collapsing every animation to a no-op.
export const motionStyles = css`
  @keyframes oppai-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes oppai-fade-in-up {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes oppai-scale-in {
    from { opacity: 0; transform: scale(0.94) translateY(8px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes oppai-pop {
    0% { transform: scale(1); }
    40% { transform: scale(1.28); }
    100% { transform: scale(1); }
  }
  /* Exits. Faster than the matching entrance on purpose: an entrance is the interface
     arriving and can afford to be seen, while an exit is time between the user asking
     for something and getting it. */
  @keyframes oppai-fade-out {
    to { opacity: 0; }
  }
  @keyframes oppai-scale-out {
    to { opacity: 0; transform: scale(0.97) translateY(4px); }
  }
  @keyframes oppai-slide-out-down {
    to { opacity: 0; transform: translateY(10px); }
  }
  /* Arrival: a new message or tile. Transform and opacity only — animating height or
     margin would reflow everything below it on every frame. */
  @keyframes oppai-arrive {
    from { opacity: 0; transform: translateY(8px) scale(0.995); }
    to { opacity: 1; transform: none; }
  }

  .anim-fade { animation: oppai-fade-in 0.28s var(--oppai-ease-standard) both; }
  .anim-rise { animation: oppai-fade-in-up 0.42s var(--oppai-ease-emphasized) both; }
  .anim-pop { animation: oppai-scale-in 0.32s var(--oppai-ease-spring) both; }
  .anim-arrive { animation: oppai-arrive 0.26s var(--oppai-ease-emphasized) both; }
  /* Applied by motion.ts's playExit, which awaits it before the element is removed. */
  .anim-exit { animation: oppai-scale-out 0.16s var(--oppai-ease-standard) forwards; }
  .anim-exit-fade { animation: oppai-fade-out 0.16s var(--oppai-ease-standard) forwards; }
  .anim-exit-down { animation: oppai-slide-out-down 0.18s var(--oppai-ease-standard) forwards; }

  /* Collapse and expand, without measuring anything.
     A 0fr→1fr grid row animates the same effect as a height transition with no JS, no
     forced layout per frame, and no need to know the content's size in advance. The
     inner element needs min-height:0 or it refuses to shrink below its content. */
  .collapsible {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.24s var(--oppai-ease-emphasized);
  }
  .collapsible > * {
    overflow: hidden;
    min-height: 0;
  }
  .collapsible.open {
    grid-template-rows: 1fr;
  }

  /* Reduced motion is a request for no motion, not less of it — so this removes
     animation and transition outright rather than shortening them. The collapsible has
     to be pinned open/closed instantly rather than left mid-transition. */
  @media (prefers-reduced-motion: reduce) {
    *, .anim-fade, .anim-rise, .anim-pop, .anim-arrive,
    .anim-exit, .anim-exit-fade, .anim-exit-down, .collapsible {
      animation: none !important;
      transition: none !important;
    }
  }
`;

// --- Theme preference -------------------------------------------------------
// "system" follows the OS setting and keeps following it as it changes; the two
// explicit modes pin the app. Persisted client-side (a theme is per-device, not
// per-library) and applied by stamping data-theme on <html>, which the token
// blocks above key off.

export type ThemePref = "dark" | "light" | "system";

const THEME_KEY = "oppai_theme";

export function loadTheme(): ThemePref {
  const v = localStorage.getItem(THEME_KEY);
  return v === "light" || v === "dark" || v === "system" ? v : "dark";
}

export function saveTheme(pref: ThemePref): void {
  try {
    localStorage.setItem(THEME_KEY, pref);
  } catch {
    /* ignore quota / private-mode errors */
  }
}

/** Resolve "system" against the OS and stamp the result on <html>. */
export function applyTheme(pref: ThemePref): void {
  const light =
    pref === "light" ||
    (pref === "system" && window.matchMedia("(prefers-color-scheme: light)").matches);
  document.documentElement.dataset.theme = light ? "light" : "";
  syncThemeColor();
}

// --- Material You ------------------------------------------------------------
// The palette worked out from a colour (material-you.ts), per device like the theme.
// Applied as a stylesheet after the base tokens, so clearing it is removing it.
//
// What is stored is the stylesheet itself, worked out when the colour was picked, beside
// the colour and style it came from. The colour maths is a library of some sixty
// kilobytes, and this file is in the bundle everyone downloads before anything draws;
// keeping the answer means the library is fetched only by the Settings screen, which
// picks colours, and never by a page that only shows them.

const YOU_KEY = "oppai_you";

/** The stored choice as written, for material-you.ts to read: {seed, style, css, v}. */
export function loadYouRaw(): string | null {
  try {
    return localStorage.getItem(YOU_KEY);
  } catch {
    return null;
  }
}

export function saveYouRaw(value: string): void {
  try {
    localStorage.setItem(YOU_KEY, value);
  } catch {
    /* ignore quota / private-mode errors */
  }
}

/** The stylesheet stored with the choice, "" for OppaiLib's own palette. */
export function storedYouCss(): string {
  try {
    const css = (JSON.parse(loadYouRaw() ?? "null") as { css?: unknown } | null)?.css;
    // Only ever a stylesheet this app wrote: token blocks on :root.
    return typeof css === "string" && css.startsWith(":root {") ? css : "";
  } catch {
    return "";
  }
}

export function applyYou(text: string): void {
  let sheet = document.getElementById("oppai-you") as HTMLStyleElement | null;
  if (!text) {
    sheet?.remove();
  } else {
    if (!sheet) {
      sheet = document.createElement("style");
      sheet.id = "oppai-you";
      document.head.appendChild(sheet);
    }
    sheet.textContent = text;
  }
  syncThemeColor();
}

/** The browser's own chrome (the address bar on a phone) takes the page's colour. */
function syncThemeColor(): void {
  const meta = document.querySelector('meta[name="theme-color"]');
  const bg = getComputedStyle(document.documentElement).getPropertyValue("--oppai-bg").trim();
  if (meta && bg) meta.setAttribute("content", bg);
}

/** Re-apply on OS changes while the preference is "system". */
export function watchSystemTheme(): void {
  window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => {
    if (loadTheme() === "system") applyTheme("system");
  });
}
