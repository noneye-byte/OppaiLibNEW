import { css } from "lit";

// Material 3 design tokens for the OppaiLib Media Server UI: a warm
// orange/tan scheme. @material/web components read the --md-sys-color-*
// custom properties; the hand-authored shell (library.ts, viewer.ts, …) reads
// the parallel --oppai-* tokens. Both are defined for a full dark scheme and a
// full light override under [data-theme="light"]. Because CSS custom
// properties inherit through shadow boundaries, these values reach every
// component's shadow root — themes just work.
//
// NOTE: a COMPLETE --md-sys-color-* set is intentional. Material Web filled
// fields fall back to their light-theme defaults for any token you leave
// undefined (surface-container-highest in particular), which is what produced
// the old "white text field on a white fill" login boxes.
export const globalStyles = `
  :root {
    color-scheme: dark;

    /* ── M3 tokens · dark (orange/tan) ───────────────────────────── */
    --md-sys-color-primary: #FFB77C;
    --md-sys-color-on-primary: #4E2600;
    --md-sys-color-primary-container: #6F3A0C;
    --md-sys-color-on-primary-container: #FFDCC2;
    --md-sys-color-secondary: #E4C0A4;
    --md-sys-color-on-secondary: #422B18;
    --md-sys-color-secondary-container: #5B412C;
    --md-sys-color-on-secondary-container: #FFDCC2;
    --md-sys-color-tertiary: #D2C78C;
    --md-sys-color-on-tertiary: #383010;

    --md-sys-color-surface: #191410;
    --md-sys-color-surface-dim: #191410;
    --md-sys-color-surface-bright: #413A34;
    --md-sys-color-surface-container-lowest: #130F0B;
    --md-sys-color-surface-container-low: #211B15;
    --md-sys-color-surface-container: #251F19;
    --md-sys-color-surface-container-high: #302A23;
    --md-sys-color-surface-container-highest: #3B342D;

    --md-sys-color-on-surface: #EFE0D5;
    --md-sys-color-on-surface-variant: #D7C3B4;
    --md-sys-color-outline: #9F8C7E;
    --md-sys-color-outline-variant: #52453A;
    --md-sys-color-error: #FFB4AB;
    --md-sys-color-on-error: #690005;
    --md-sys-color-background: #191410;
    --md-sys-color-on-background: #EFE0D5;
    --md-icon-font: 'Material Symbols Rounded';

    /* ── Raw shell palette (parallel to the M3 tokens above) ─────── */
    --oppai-bg: #191410;
    --oppai-nav: #211B15;
    --oppai-nav-hover: #2C2620;
    --oppai-surface: #251F19;
    --oppai-surface-2: #302A23;
    --oppai-accent: #5B412C;
    --oppai-on-accent: #FFDCC2;
    --oppai-primary: #FFB77C;
    --oppai-primary-bright: #FFD3B0;
    --oppai-primary-container: #6F3A0C;
    --oppai-on-primary: #4E2600;
    --oppai-text: #EFE0D5;
    --oppai-text-dim: #D7C3B4;
    --oppai-text-muted: #A8917F;
    --oppai-border: #2C2620;
    --oppai-border-strong: #52453A;
    --oppai-fav: #FFB4AB;
    --oppai-scrim: rgba(0, 0, 0, 0.55);

    /* Motion — Material 3 easing sets */
    --oppai-ease-emphasized: cubic-bezier(0.2, 0, 0, 1);
    --oppai-ease-standard: cubic-bezier(0.2, 0, 0, 1);
    --oppai-ease-spring: cubic-bezier(0.34, 1.4, 0.64, 1);

    --oppai-radius: 16px;
    font-family: "Roboto", system-ui, -apple-system, sans-serif;
  }

  :root[data-theme="light"] {
    color-scheme: light;

    /* ── M3 tokens · light (orange/tan) ──────────────────────────── */
    --md-sys-color-primary: #8F4C00;
    --md-sys-color-on-primary: #FFFFFF;
    --md-sys-color-primary-container: #FFDCC2;
    --md-sys-color-on-primary-container: #2E1500;
    --md-sys-color-secondary: #755847;
    --md-sys-color-on-secondary: #FFFFFF;
    --md-sys-color-secondary-container: #FFDCC2;
    --md-sys-color-on-secondary-container: #2A1707;
    --md-sys-color-tertiary: #6A5F30;

    --md-sys-color-surface: #FFF8F4;
    --md-sys-color-surface-dim: #E8D7CC;
    --md-sys-color-surface-bright: #FFF8F4;
    --md-sys-color-surface-container-lowest: #FFFFFF;
    --md-sys-color-surface-container-low: #FEF1E8;
    --md-sys-color-surface-container: #F8EBE1;
    --md-sys-color-surface-container-high: #F2E5DB;
    --md-sys-color-surface-container-highest: #ECE0D6;

    --md-sys-color-on-surface: #211A14;
    --md-sys-color-on-surface-variant: #52453A;
    --md-sys-color-outline: #857567;
    --md-sys-color-outline-variant: #D8C3B4;
    --md-sys-color-error: #BA1A1A;
    --md-sys-color-background: #FFF8F4;
    --md-sys-color-on-background: #211A14;

    /* ── Raw shell palette · light ───────────────────────────────── */
    --oppai-bg: #FFF8F4;
    --oppai-nav: #FEF1E8;
    --oppai-nav-hover: #F2E5DB;
    --oppai-surface: #F8EBE1;
    --oppai-surface-2: #F2E5DB;
    --oppai-accent: #FFDCC2;
    --oppai-on-accent: #2A1707;
    --oppai-primary: #8F4C00;
    --oppai-primary-bright: #8F4C00;
    --oppai-primary-container: #FFDCC2;
    --oppai-on-primary: #FFFFFF;
    --oppai-text: #211A14;
    --oppai-text-dim: #52453A;
    --oppai-text-muted: #857567;
    --oppai-border: #EADBCF;
    --oppai-border-strong: #D8C3B4;
    --oppai-fav: #BA1A1A;
    --oppai-scrim: rgba(60, 40, 24, 0.32);
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
// loaded document-side via <link> in index.html and applies inside shadow DOM.
export const iconStyles = css`
  .material-symbols-rounded {
    font-family: "Material Symbols Rounded";
    font-weight: normal;
    font-style: normal;
    font-variation-settings: "opsz" 24, "wght" 400, "FILL" 0, "GRAD" 0;
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
  .fill-icon {
    font-variation-settings: "opsz" 24, "wght" 500, "FILL" 1, "GRAD" 0;
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
}

/** Re-apply on OS changes while the preference is "system". */
export function watchSystemTheme(): void {
  window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => {
    if (loadTheme() === "system") applyTheme("system");
  });
}

// Shared component-level styles.
export const cardStyles = css`
  .card {
    background: var(--md-sys-color-surface-container);
    border-radius: var(--oppai-radius);
    overflow: hidden;
  }
`;
