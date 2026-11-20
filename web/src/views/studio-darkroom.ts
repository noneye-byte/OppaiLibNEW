import { css } from "lit";

/**
 * The studios in the darkroom: Image, Video and Sprites drawn with the shell's
 * vocabulary rather than the one they had before it.
 *
 * The studios predate the darkroom and kept three habits it gave up: a coral-to-violet
 * gradient on whatever was picked (the mode, Generate, the welcome's glyph), the deep
 * coral-brown container as the fill of every "on" state, and panels on the raised
 * surface with strong rules between them. Against the library each of those read as a
 * different app. Here, as in the shell: panels sit on the sidebar's ink with quiet rules,
 * where you are is the accent's tint with its colour on the icon, the one thing to press
 * is plain coral, and the header is the library's 64-pixel bar. The same class names run
 * through imagegen.ts (studio-styles.ts) and the Video studio (imagegen-video.ts), so one
 * sheet, last in both, redraws all three; the layout is theirs and untouched.
 */
export const studioDarkroom = css`
  /* ── the header: the library's bar (its height is studio-styles.ts's, which a phone
     lets wrap to two rows) ─────────────────────────────────────────────── */
  .mode-switch { padding: 3px; border-radius: 12px; background: var(--oppai-surface); border: 1px solid var(--oppai-border); }
  .mode {
    height: 34px; padding: 0 14px 0 11px; border-radius: 9px; color: var(--oppai-text-muted); font-weight: 500; font-size: 13.5px;
  }
  .mode:hover { color: var(--oppai-text); }
  .mode.on { background: var(--oppai-selected); color: var(--oppai-text); font-weight: 600; box-shadow: none; }
  .mode.on .material-symbols-rounded { color: var(--oppai-primary); }
  .mode.on .mode-badge { background: var(--oppai-primary); color: var(--oppai-on-primary); }
  .mode.on .mode-dot { background: var(--oppai-primary); }
  .sub-switch button { border-radius: 10px; font-weight: 500; }
  .sub-switch button.on { background: var(--oppai-selected); border-color: transparent; color: var(--oppai-text); font-weight: 600; }
  .sub-switch button.on .material-symbols-rounded { color: var(--oppai-primary); }
  .gen-pill { border-color: var(--oppai-border); background: var(--oppai-surface); border-radius: 12px; }
  .gen-pill:not(.static):hover { border-color: var(--oppai-border-strong); background: var(--oppai-surface-2); }
  .gen-pill img, .gen-icon { background: var(--oppai-surface-2); border-radius: 8px; }
  .head-btn { height: 36px; border-radius: 10px; color: var(--oppai-text-dim); font-weight: 500; font-size: 13px; }
  .head-btn:hover { background: var(--oppai-surface); color: var(--oppai-text); }
  .head-btn.lit { background: var(--oppai-selected); border-color: transparent; color: var(--oppai-primary-bright); }
  .head-icon { border-radius: 10px; color: var(--oppai-text-dim); }
  .head-icon:hover { background: var(--oppai-surface); }
  .head-icon.on { background: var(--oppai-selected); color: var(--oppai-primary-bright); }
  .head-sep { background: var(--oppai-border); }
  .pop { background: var(--oppai-surface-2); border-color: var(--oppai-border-strong); border-radius: var(--oppai-radius-lg); box-shadow: var(--oppai-shadow-pop); }
  .pop-head > .material-symbols-rounded { color: var(--oppai-primary); }
  .recent-row:hover { background: var(--oppai-selected); }

  /* ── the rail and the drawers: the sidebar's ink ────────────────────── */
  .create-rail, .rail { background: var(--oppai-nav); border-right: 1px solid var(--oppai-border); }
  .rail-tab { color: var(--oppai-text-muted); font-weight: 500; }
  .rail-tab:hover .rail-icon { background: var(--oppai-nav-hover); }
  .rail-tab.on { color: var(--oppai-text); font-weight: 600; }
  .rail-tab.on .rail-icon, .rail .rail-tab.on .rail-icon { background: var(--oppai-selected); color: var(--oppai-primary); }
  .rail-badge { background: var(--oppai-primary); color: var(--oppai-on-primary); }
  .create-drawer, .drawer, .inspector { background: var(--oppai-nav); border-color: var(--oppai-border); }
  .create-drawer, .drawer { border-right: 1px solid var(--oppai-border); }
  .right { background: var(--oppai-nav); border-left: 1px solid var(--oppai-border); }
  .drawer-head { height: 56px; flex-basis: 56px; font-size: 15px; font-weight: 600; border-bottom-color: var(--oppai-border); }
  .drawer-head > .material-symbols-rounded { color: var(--oppai-primary); }
  .drawer-action { border-radius: 10px; }
  .drawer-action:hover { background: var(--oppai-surface); }
  .pane-title, .k { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; color: var(--oppai-text-muted); }
  .pane-title::after { background: var(--oppai-border); }
  .picker-search input, .lora-search input {
    border-radius: 12px; border-color: var(--oppai-border); background: var(--oppai-surface);
  }
  .picker-search input:focus, .lora-search input:focus {
    border-color: color-mix(in srgb, var(--oppai-primary) 55%, transparent); background: var(--oppai-surface-2);
  }
  /* Cards on the drawer: the library's tiles, the picked one ringed in the accent. */
  .create-drawer .card, .drawer .card { border-radius: var(--oppai-radius-md); background: var(--oppai-surface); box-shadow: none; }
  .create-drawer .card:hover, .drawer .card:hover { border-color: var(--oppai-border-strong); }
  .create-drawer .card.on, .drawer .card.on { border-color: var(--oppai-primary); box-shadow: 0 0 0 3px var(--oppai-selected); }
  .manage-note {
    background: var(--oppai-surface); border-color: var(--oppai-border); border-radius: var(--oppai-radius-md);
  }
  .manage-note .material-symbols-rounded { color: var(--oppai-primary); }

  /* ── chips and switches: lit like the shell's tools ─────────────────── */
  .chip { border-color: var(--oppai-border-strong); color: var(--oppai-text-dim); }
  .chip:hover { color: var(--oppai-text); border-color: var(--oppai-text-muted); }
  .chip.on { background: var(--oppai-selected); color: var(--oppai-primary-bright); border-color: transparent; }
  .chip.primary { background: var(--oppai-primary); color: var(--oppai-on-primary); border-color: transparent; }
  .count-seg { border-color: var(--oppai-border-strong); border-radius: 12px; }
  .count-seg button.on, .seg button.on { background: var(--oppai-selected); color: var(--oppai-primary-bright); }
  .recipe-chip { border-color: var(--oppai-border); }
  .recipe-chip:hover { background: var(--oppai-surface); }
  .recipe-chip.on { border-color: transparent; background: var(--oppai-selected); color: var(--oppai-text); }
  .recipe-chip.lora { border-color: transparent; background: var(--oppai-selected); }
  .trig-chip, .drop-lora, .q-n { background: var(--oppai-selected-strong); color: var(--oppai-text); }
  .people-cycle.on { background: var(--oppai-selected); color: var(--oppai-primary-bright); }
  .people-layout span { background: var(--oppai-selected); }

  /* ── the one thing to press: plain coral ────────────────────────────── */
  .btn.primary, .btn.primary:hover:not(:disabled) { background: var(--oppai-primary); color: var(--oppai-on-primary); }
  .composer .generate, .make {
    background: var(--oppai-primary); color: var(--oppai-on-primary); border-radius: 14px;
    box-shadow: 0 6px 18px color-mix(in srgb, var(--oppai-primary) 22%, transparent);
  }
  .make.wide { border-radius: 14px; }
  .composer .generate.cancel { background: var(--oppai-surface); color: var(--oppai-text); box-shadow: none; }
  .queue-btn { border-radius: 14px; background: transparent; }
  .queue-btn.hot:not(:disabled) { background: var(--oppai-selected); border-color: transparent; color: var(--oppai-primary-bright); }
  .vb.on { background: var(--oppai-selected); color: var(--oppai-primary-bright); }
  .vb.save { border-radius: 10px; }

  /* ── the stage and the composer ─────────────────────────────────────── */
  .recipe { background: var(--oppai-bg); border-bottom-color: var(--oppai-border); }
  .session-strip, .prompt-dock, .dock { background: var(--oppai-bg); border-top-color: var(--oppai-border); }
  .composer {
    background: var(--oppai-surface); border-color: var(--oppai-border); border-radius: var(--oppai-radius-lg);
    box-shadow: none;
  }
  .composer:focus-within {
    border-color: color-mix(in srgb, var(--oppai-primary) 55%, transparent);
    box-shadow: 0 0 0 3px var(--oppai-selected);
  }
  .composer .prompt-field textarea { background: var(--oppai-bg); border-color: var(--oppai-border); border-radius: 12px; }
  .composer .mic { background: transparent; border-color: var(--oppai-border-strong); border-radius: 12px; }
  .canvas-empty { border-color: var(--oppai-border-strong); background: color-mix(in srgb, var(--oppai-surface) 70%, transparent); border-radius: var(--oppai-radius-lg); }
  .canvas-empty.welcome { background: var(--oppai-surface); border-color: var(--oppai-border); }
  .welcome-glyph, .hero .glyph { background: var(--oppai-selected); color: var(--oppai-primary); }
  .welcome-tips > span { background: var(--oppai-bg); border: 1px solid var(--oppai-border); }
  .canvas-empty .welcome-tips .material-symbols-rounded { color: var(--oppai-primary); }
  .recent-line:hover { border-color: var(--oppai-border-strong); background: var(--oppai-surface-2); }
  .strip-thumb.on { border-color: var(--oppai-primary); box-shadow: 0 0 0 3px var(--oppai-selected); }
  .view-bar { background: color-mix(in srgb, var(--oppai-surface-2) 90%, transparent); border-color: var(--oppai-border-strong); border-radius: 14px; }
  .restored { border-color: var(--oppai-border-strong); border-radius: var(--oppai-radius-md); box-shadow: var(--oppai-shadow-pop); }
`;
