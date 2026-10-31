import { css } from "lit";

/**
 * The studio's frame: the header the three modes share, the Image studio's rail,
 * inspector, stage and strip, and the Sprites board, recipe and square panel.
 *
 * Kept apart from imagegen.ts's own styles, which are the parts of the studio rather
 * than its layout — the loadout board, the cutout editor, the dialogs — and come
 * first, so these win where the two meet. The Video studio is an element of its own
 * and styles itself; only the slot it sits in is laid out here.
 */
export const studioStyles = css`
  /* ── the frame ─────────────────────────────────────────────────────────── */
  :host { height: 100%; min-height: 0; overflow: hidden; }
  .wrap { width: 100%; max-width: none; height: 100%; min-height: 0; margin: 0; padding: 0; overflow: hidden; }
  .studio { height: 100%; min-height: 0; display: flex; flex-direction: column; background: var(--oppai-bg); }
  .workspace { flex: 1; min-height: 0; display: flex; flex-direction: column; background: var(--oppai-bg); }
  .status-dot {
    flex: none; width: 7px; height: 7px; border-radius: 50%; background: #6fcf8a;
    box-shadow: 0 0 0 3px color-mix(in srgb, #6fcf8a 20%, transparent);
  }
  .status-dot.off { background: var(--oppai-text-muted); box-shadow: none; }
  .toolbar-spacer { flex: 1; }
  /* Tinted from the text colour rather than a surface token, so a secondary button is
     visible on the panel, the dialog and the stage alike. */
  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px; border: 1px solid var(--oppai-border-strong);
    background: color-mix(in srgb, var(--oppai-text) 6%, transparent); transition: background 0.12s ease, border-color 0.12s ease;
  }
  .btn:hover:not(:disabled) { background: color-mix(in srgb, var(--oppai-text) 11%, transparent); }
  .btn.primary { border-color: transparent; background: linear-gradient(135deg, var(--oppai-primary), color-mix(in srgb, var(--oppai-primary) 70%, #c58af9)); }
  .btn.primary:hover:not(:disabled) { background: linear-gradient(135deg, var(--oppai-primary), color-mix(in srgb, var(--oppai-primary) 70%, #c58af9)); filter: brightness(1.07); }
  .btn.danger { color: var(--oppai-error, #f2b8b5); }
  .toast { bottom: auto; top: 142px; }
  .icon-btn {
    width: 32px; height: 32px; border-radius: 16px; border: none; background: none; color: var(--oppai-text-muted);
    display: grid; place-items: center; cursor: pointer; flex: none;
  }
  .icon-btn:hover:not(:disabled) { background: var(--oppai-surface-2); color: var(--oppai-text); }
  .icon-btn .material-symbols-rounded { font-size: 18px; }

  /* ── the header ── */
  .studio-head {
    position: relative; z-index: 20; flex: 0 0 auto; height: 58px; display: flex; align-items: center; gap: 8px;
    padding: 8px 12px; box-sizing: border-box; background: var(--oppai-surface); border-bottom: 1px solid var(--oppai-border-strong);
  }
  .mode-switch { display: inline-flex; gap: 2px; padding: 3px; border-radius: 14px; background: var(--oppai-bg); border: 1px solid var(--oppai-border); flex: none; }
  .mode {
    position: relative; display: inline-flex; align-items: center; gap: 7px; height: 34px; padding: 0 14px 0 11px; border: none;
    border-radius: 11px; background: transparent; color: var(--oppai-text-muted); font: inherit; font-size: 13px; font-weight: 650; cursor: pointer;
    transition: background 0.18s var(--oppai-ease-emphasized), color 0.15s ease;
  }
  .mode .material-symbols-rounded { font-size: 19px; }
  .mode:hover { color: var(--oppai-text); }
  .mode.on {
    background: linear-gradient(135deg, var(--oppai-primary), color-mix(in srgb, var(--oppai-primary) 70%, #c58af9));
    color: var(--oppai-on-primary); box-shadow: 0 4px 14px color-mix(in srgb, var(--oppai-primary) 28%, transparent);
  }
  .mode-badge {
    min-width: 17px; height: 17px; padding: 0 5px; box-sizing: border-box; border-radius: 9px; font-size: 10px; font-weight: 800; line-height: 17px;
    text-align: center; background: var(--oppai-primary); color: var(--oppai-on-primary);
  }
  .mode.on .mode-badge { background: var(--oppai-on-primary); color: var(--oppai-primary); }
  .mode-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--oppai-primary); animation: studio-pulse 1.2s ease-in-out infinite; }
  .mode.on .mode-dot { background: var(--oppai-on-primary); }
  @keyframes studio-pulse { 50% { opacity: 0.35; transform: scale(0.8); } }
  .sub-switch { display: inline-flex; gap: 2px; margin-left: 6px; flex: none; }
  .sub-switch button {
    display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border: 1px solid transparent; border-radius: 10px;
    background: transparent; color: var(--oppai-text-muted); font: inherit; font-size: 12.5px; font-weight: 650; cursor: pointer;
  }
  .sub-switch button .material-symbols-rounded { font-size: 17px; }
  .sub-switch button:hover { color: var(--oppai-text); }
  .sub-switch button.on { background: var(--oppai-surface-2); border-color: var(--oppai-border-strong); color: var(--oppai-text); }
  .sub-note { font-weight: 500; color: var(--oppai-text-muted); max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sub-note::before { content: "· "; }
  .head-spacer { flex: 1; min-width: 4px; }
  .gen-pill {
    min-width: 0; max-width: 300px; height: 40px; display: inline-flex; align-items: center; gap: 9px; padding: 3px 10px 3px 3px; flex: 0 1 auto;
    border: 1px solid var(--oppai-border-strong); border-radius: 12px; background: var(--oppai-bg); color: var(--oppai-text);
    font: inherit; text-align: left; cursor: pointer; transition: border-color 0.15s ease;
  }
  .gen-pill:not(.static):hover { border-color: var(--oppai-primary); }
  .gen-pill.static { cursor: default; }
  .gen-pill img, .gen-icon {
    flex: 0 0 32px; width: 32px; height: 32px; border-radius: 9px; object-fit: cover; display: grid; place-items: center;
    background: var(--oppai-surface-2); color: var(--oppai-text-muted);
  }
  .gen-icon .material-symbols-rounded { font-size: 18px; }
  .gen-text { min-width: 0; display: flex; flex-direction: column; gap: 1px; }
  .gen-kicker { display: flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 700; letter-spacing: 0.55px; text-transform: uppercase; color: var(--oppai-text-muted); white-space: nowrap; }
  .gen-kicker .status-dot { width: 6px; height: 6px; box-shadow: none; }
  .gen-name { font-size: 13px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .gen-caret { color: var(--oppai-text-muted); font-size: 18px; flex: none; }
  .head-btn {
    position: relative; height: 36px; display: inline-flex; align-items: center; gap: 6px; padding: 0 12px; flex: none;
    border: 1px solid var(--oppai-border-strong); border-radius: 10px; background: transparent; color: var(--oppai-text-dim);
    font: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer;
  }
  .head-btn .material-symbols-rounded { font-size: 18px; }
  .head-btn:hover { background: var(--oppai-surface-2); color: var(--oppai-text); }
  .head-btn.lit { border-color: color-mix(in srgb, var(--oppai-primary) 60%, transparent); color: var(--oppai-text); }
  .head-count {
    min-width: 18px; height: 18px; padding: 0 5px; box-sizing: border-box; border-radius: 9px; background: var(--oppai-primary);
    color: var(--oppai-on-primary); font-size: 10.5px; font-weight: 800; line-height: 18px; text-align: center;
  }
  .head-sep { width: 1px; height: 24px; background: var(--oppai-border-strong); margin: 0 2px; flex: none; }
  .head-icon {
    width: 36px; height: 36px; border-radius: 10px; border: none; background: transparent; color: var(--oppai-text-muted);
    display: grid; place-items: center; cursor: pointer; flex: none;
  }
  .head-icon:hover { background: var(--oppai-surface-2); color: var(--oppai-text); }
  .head-icon.on { color: var(--oppai-primary-bright, var(--oppai-primary)); }
  .head-icon .material-symbols-rounded { font-size: 20px; }

  /* Popovers off the header and the composer. */
  .pop {
    position: absolute; z-index: 40; width: min(440px, calc(100vw - 24px)); max-height: min(460px, 70vh); display: flex; flex-direction: column;
    border: 1px solid var(--oppai-border-strong); border-radius: 16px; background: var(--oppai-surface-2);
    box-shadow: 0 22px 60px rgba(0,0,0,.5); animation: oppai-scale-in 0.16s var(--oppai-ease-emphasized) both; overflow: hidden;
  }
  .queue-pop { top: calc(100% + 6px); right: 12px; transform-origin: top right; }
  .prompts-pop { left: 0; bottom: calc(100% + 8px); transform-origin: bottom left; width: min(560px, 100%); }
  .pop-head {
    display: flex; align-items: center; gap: 8px; padding: 12px 10px 12px 14px; border-bottom: 1px solid var(--oppai-border);
    font-size: 13px; font-weight: 700;
  }
  .pop-head > .material-symbols-rounded { font-size: 18px; color: var(--oppai-primary-bright, var(--oppai-primary)); }
  .pop-note { margin-left: auto; font-size: 11.5px; font-weight: 500; color: var(--oppai-text-muted); }
  .pop-x { width: 28px; height: 28px; border-radius: 14px; border: none; background: none; color: var(--oppai-text-muted); display: grid; place-items: center; cursor: pointer; }
  .pop-x:hover { background: var(--oppai-surface); color: var(--oppai-text); }
  .pop-x .material-symbols-rounded { font-size: 17px; }
  .pop-empty { margin: 0; padding: 18px 16px; font-size: 12.5px; line-height: 1.55; color: var(--oppai-text-muted); }
  .queue-list { list-style: none; margin: 0; padding: 6px; overflow-y: auto; }
  .queue-list li { display: flex; align-items: center; gap: 6px; padding: 8px 6px 8px 8px; border-radius: 10px; }
  .queue-list li:hover { background: var(--oppai-surface); }
  .q-n {
    flex: none; width: 22px; height: 22px; border-radius: 11px; display: grid; place-items: center; font-size: 11px; font-weight: 800;
    background: var(--oppai-primary-container); color: var(--oppai-text);
  }
  .q-what { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; font-size: 12.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .q-what small { font-size: 11px; color: var(--oppai-text-muted); font-variant-numeric: tabular-nums; }
  .q-btn { flex: none; width: 28px; height: 28px; border-radius: 8px; border: none; background: none; color: var(--oppai-text-muted); display: grid; place-items: center; cursor: pointer; }
  .q-btn:hover:not(:disabled) { background: var(--oppai-surface-2); color: var(--oppai-text); }
  .q-btn:disabled { opacity: 0.3; cursor: default; }
  .q-btn .material-symbols-rounded { font-size: 17px; }
  .recent-list { overflow-y: auto; padding: 6px; display: flex; flex-direction: column; gap: 2px; }
  .recent-row {
    display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 2px 10px; padding: 9px 10px; border: none; border-radius: 10px;
    background: transparent; color: var(--oppai-text); font: inherit; text-align: left; cursor: pointer;
  }
  .recent-row:hover { background: color-mix(in srgb, var(--oppai-primary) 14%, transparent); }
  .recent-text { font-size: 12.5px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .recent-when { grid-column: 2; grid-row: 1; font-size: 11px; color: var(--oppai-text-muted); white-space: nowrap; }
  .recent-neg { grid-column: 1; font-size: 11px; color: color-mix(in srgb, var(--oppai-error, #f2b8b5) 80%, var(--oppai-text-muted)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* The shortcuts sheet. */
  .dialog.shortcuts { width: min(480px, 100%); }
  .dialog.shortcuts h3 { display: flex; align-items: center; gap: 8px; }
  .keys { display: grid; gap: 4px; }
  .key-row { display: flex; align-items: center; gap: 12px; padding: 6px 4px; font-size: 13px; color: var(--oppai-text-dim); border-bottom: 1px solid var(--oppai-border); }
  .key-caps { flex: 0 0 150px; display: flex; gap: 4px; flex-wrap: wrap; }
  kbd {
    min-width: 22px; padding: 2px 7px; box-sizing: border-box; border-radius: 6px; border: 1px solid var(--oppai-border-strong);
    border-bottom-width: 2px; background: var(--oppai-surface); color: var(--oppai-text); font: 600 11.5px/1.4 ui-monospace, Consolas, monospace; text-align: center;
  }

  /* ── the Image and Video studios ───────────────────────────────────────── */
  .create-shell { flex: 1; min-height: 0; display: grid; grid-template-columns: 72px minmax(0, 1fr); background: var(--oppai-bg); }
  .create-shell.drawer-open { grid-template-columns: 72px 340px minmax(0, 1fr); }
  .create-shell.with-gallery { grid-template-columns: 72px minmax(0, 1fr) 320px; }
  .create-shell.drawer-open.with-gallery { grid-template-columns: 72px 340px minmax(0, 1fr) 320px; }
  .create-shell.video { grid-template-columns: minmax(0, 1fr); }
  .create-shell.video.with-gallery { grid-template-columns: minmax(0, 1fr) 320px; }
  .create-shell > oppai-video-studio { min-width: 0; min-height: 0; }
  .create-gallery.stowed { display: none; }
  .drawer-scrim { display: none; }
  .right { min-width: 0; min-height: 0; background: var(--oppai-surface); border-left: 1px solid var(--oppai-border-strong); overflow: hidden; }

  /* The rail. */
  .create-rail {
    display: flex; flex-direction: column; gap: 4px; padding: 10px 6px; background: var(--oppai-surface);
    border-right: 1px solid var(--oppai-border-strong); overflow-y: auto; scrollbar-width: none;
  }
  .rail-tab {
    position: relative; display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 4px 0 6px; border: 0;
    background: transparent; color: var(--oppai-text-muted); font: inherit; font-size: 10.5px; font-weight: 650; cursor: pointer;
  }
  .rail-icon {
    width: 48px; height: 32px; display: grid; place-items: center; border-radius: 12px; font-size: 21px;
    transition: background 0.2s var(--oppai-ease-emphasized), color 0.2s ease;
  }
  .rail-tab:hover { color: var(--oppai-text); }
  .rail-tab:hover .rail-icon { background: var(--oppai-surface-2); }
  .rail-tab.on { color: var(--oppai-text); }
  .rail-tab.on .rail-icon { background: var(--oppai-primary-container); color: var(--oppai-on-primary-container, var(--oppai-text)); }
  .rail-badge {
    position: absolute; top: 0; right: 6px; min-width: 16px; height: 16px; padding: 0 4px; box-sizing: border-box; border-radius: 8px;
    background: var(--oppai-primary); color: var(--oppai-on-primary); font-size: 9.5px; font-weight: 800; line-height: 16px; text-align: center;
  }

  /* The inspector, docked beside the stage. */
  .create-drawer {
    min-width: 0; min-height: 0; display: flex; flex-direction: column; background: var(--oppai-surface);
    border-right: 1px solid var(--oppai-border-strong); animation: studio-drawer-in 0.22s var(--oppai-ease-emphasized) both;
  }
  @keyframes studio-drawer-in { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: none; } }
  .drawer-head {
    height: 50px; flex: 0 0 50px; display: flex; align-items: center; gap: 9px; padding: 0 8px 0 16px; box-sizing: border-box;
    font-size: 14.5px; font-weight: 700; border-bottom: 1px solid var(--oppai-border);
  }
  .drawer-head > .material-symbols-rounded { font-size: 19px; color: var(--oppai-primary-bright, var(--oppai-primary)); }
  .drawer-action { width: 34px; height: 34px; border-radius: 17px; border: 0; background: transparent; color: var(--oppai-text-muted); display: grid; place-items: center; cursor: pointer; }
  .drawer-action:hover { background: var(--oppai-surface-2); color: var(--oppai-text); }
  .drawer-action .material-symbols-rounded { font-size: 19px; }
  .drawer-scroll { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; padding: 14px 14px 24px; }
  .pane { margin-bottom: 18px; }
  .pane-title {
    display: flex; align-items: center; gap: 8px; margin: 4px 0 10px; font-size: 11px; font-weight: 700; letter-spacing: 0.7px;
    text-transform: uppercase; color: var(--oppai-text-muted);
  }
  .pane-title::after { content: ""; flex: 1; height: 1px; background: var(--oppai-border); order: 2; }
  .pane-count { order: 3; font-weight: 600; letter-spacing: 0; text-transform: none; font-variant-numeric: tabular-nums; }
  .picker-search { position: relative; display: block; margin-bottom: 14px; }
  .picker-search input {
    width: 100%; height: 38px; box-sizing: border-box; padding: 0 14px 0 36px; border: 1px solid var(--oppai-border-strong);
    border-radius: 19px; background: var(--oppai-bg); color: var(--oppai-text); font: inherit; font-size: 13px; outline: none;
  }
  .picker-search input:focus { border-color: var(--oppai-primary); }
  .picker-search .material-symbols-rounded { position: absolute; left: 11px; top: 9px; font-size: 20px; color: var(--oppai-text-muted); pointer-events: none; }
  /* Cover cards, two up: a checkpoint or a LoRA is recognised by its picture long
     before its file name. */
  .create-drawer .cards, .sprite-inspector .cards { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .create-drawer .card, .sprite-inspector .card {
    display: block; border: 2px solid transparent; border-radius: 14px; background: var(--oppai-bg); box-shadow: 0 2px 10px rgba(0,0,0,.16);
  }
  .create-drawer .card:hover, .sprite-inspector .card:hover { transform: translateY(-2px); border-color: var(--oppai-border-strong); }
  .create-drawer .card.on, .sprite-inspector .card.on {
    border-color: var(--oppai-primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--oppai-primary) 22%, transparent);
  }
  .create-drawer .card-art, .create-drawer .card-blank, .sprite-inspector .card-art, .sprite-inspector .card-blank { width: 100%; height: auto; aspect-ratio: 3 / 4; }
  .create-drawer .card-name, .sprite-inspector .card-name { padding: 7px 9px 8px; font-size: 12px; font-weight: 600; }
  .sprite-inspector .sec-models .cards { grid-template-columns: 1fr; gap: 6px; }
  .sprite-inspector .sec-models .card { display: grid; grid-template-columns: 46px minmax(0, 1fr); align-items: center; border-width: 1px; border-color: var(--oppai-border); border-radius: 10px; }
  .sprite-inspector .sec-models .card-art, .sprite-inspector .sec-models .card-blank { width: 46px; height: 46px; aspect-ratio: 1; }
  .sprite-inspector .sec-models .card-blank .material-symbols-rounded { font-size: 22px !important; }
  .sprite-inspector .sec-models .card:hover { transform: none; }
  .sprite-inspector .sec-models .card.on { border-color: var(--oppai-primary); background: color-mix(in srgb, var(--oppai-primary-container) 45%, var(--oppai-bg)); box-shadow: none; }
  .manage-note {
    display: flex; gap: 9px; margin-top: 14px; padding: 11px 12px; border-radius: 12px; font-size: 12px; line-height: 1.5; color: var(--oppai-text-dim);
    background: color-mix(in srgb, var(--oppai-primary) 10%, var(--oppai-surface)); border: 1px solid color-mix(in srgb, var(--oppai-primary) 30%, transparent);
  }
  .manage-note .material-symbols-rounded { font-size: 18px; color: var(--oppai-primary-bright, var(--oppai-primary)); }
  .restart-pane { display: flex; align-items: center; gap: 12px; font-size: 12.5px; line-height: 1.45; color: var(--oppai-text-dim); }
  .restart-pane > span { flex: 1; }
  .restart-pane .chip { flex: none; display: inline-flex; align-items: center; gap: 5px; }
  .restart-pane .chip .material-symbols-rounded { font-size: 17px; }
  .custom-passes, .people { display: flex; flex-direction: column; gap: 8px; }
  .pass-card {
    display: flex; flex-direction: column; gap: 6px; padding: 9px; border-radius: 12px;
    border: 1px solid var(--oppai-border); background: color-mix(in srgb, var(--oppai-surface-2) 60%, transparent);
  }
  .pass-row { display: flex; gap: 6px; align-items: center; }
  .pass-row select { flex: 1; min-width: 0; }
  .pass-row .lora-weight { width: 84px; flex: none; }
  .pass-row .lora-weight.share { width: 58px; }
  .pass-remove { flex: none; width: 30px; height: 30px; display: grid; place-items: center; border-radius: 8px; border: none; background: none; color: var(--oppai-text-dim); cursor: pointer; }
  .pass-remove:hover:not(:disabled) { background: var(--oppai-surface-2); color: var(--oppai-text); }
  .pass-remove:disabled { opacity: 0.35; cursor: default; }
  .pass-remove .material-symbols-rounded { font-size: 18px; }
  .person-n { width: 18px; text-align: center; color: var(--oppai-primary-bright, var(--oppai-primary)); }
  .people-layout { display: flex; height: 54px; gap: 3px; border-radius: 10px; overflow: hidden; border: 1px solid var(--oppai-border); }
  .people-layout.rows { flex-direction: column; height: 84px; }
  .people-layout span {
    display: grid; place-items: center; font-size: 12px; font-weight: 600; color: var(--oppai-text-dim);
    background: color-mix(in srgb, var(--oppai-primary) 14%, var(--oppai-surface));
  }
  .people-strip {
    display: flex; flex-direction: column; gap: 8px; padding: 10px; border-radius: 14px;
    border: 1px solid var(--oppai-border); background: color-mix(in srgb, var(--oppai-primary) 5%, transparent);
  }
  .people-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .people-head .people-layout { width: 64px; height: 40px; flex: none; }
  .people-head .people-layout.rows { height: 48px; width: 48px; }
  .people-hint { font-size: 12px; color: var(--oppai-text-dim); flex: 1; min-width: 200px; line-height: 1.4; }
  .people-grid { display: grid; grid-template-columns: repeat(var(--people, 2), minmax(0, 1fr)); gap: 8px; }
  .person-words { resize: vertical; min-height: 44px; font: inherit; font-size: 13px; line-height: 1.35; }
  .people-advice { display: flex; flex-direction: column; gap: 6px; }
  .advice-row {
    display: flex; align-items: center; gap: 8px; padding: 7px 10px; border-radius: 10px; font-size: 12px; line-height: 1.4; color: var(--oppai-text-dim);
    background: color-mix(in srgb, var(--oppai-accent) 12%, var(--oppai-surface)); border: 1px solid color-mix(in srgb, var(--oppai-accent) 35%, transparent);
  }
  .advice-row > span:nth-child(2) { flex: 1; min-width: 0; }
  .advice-row b { color: var(--oppai-text); }
  .advice-row > .material-symbols-rounded { font-size: 18px; color: var(--oppai-accent); }
  .advice-row .chip { flex: none; }
  .people-seg { flex: none; align-items: center; }
  .people-cycle {
    display: none; align-items: center; gap: 4px; flex: none; height: 38px; padding: 0 12px; border: 1px solid var(--oppai-border-strong);
    border-radius: 999px; background: transparent; color: var(--oppai-text-dim); font: inherit; font-size: 14px; font-weight: 600; cursor: pointer;
  }
  .people-cycle .material-symbols-rounded { font-size: 18px; }
  .people-cycle.on { background: var(--oppai-primary-container); color: var(--oppai-text); border-color: transparent; }
  .people-seg > .material-symbols-rounded { font-size: 17px; color: var(--oppai-text-dim); padding: 0 4px 0 6px; }

  /* The stage column. */
  .create-stage { min-width: 0; min-height: 0; display: flex; flex-direction: column; background: color-mix(in srgb, var(--oppai-bg) 84%, #000); }
  .recipe {
    flex: 0 0 auto; display: flex; align-items: center; min-width: 0; padding: 8px 12px;
    background: color-mix(in srgb, var(--oppai-surface) 70%, transparent); border-bottom: 1px solid var(--oppai-border);
  }
  .recipe-chips { flex: 1 1 auto; min-width: 0; display: flex; align-items: center; gap: 6px; overflow-x: auto; scrollbar-width: none; padding: 1px 0; }
  .recipe-sep { flex: none; width: 1px; height: 20px; background: var(--oppai-border-strong); margin: 0 2px; }
  .recipe-chip {
    flex: 0 0 auto; height: 30px; display: inline-flex; align-items: center; gap: 6px; padding: 0 11px; border: 1px solid var(--oppai-border-strong);
    border-radius: 15px; background: transparent; color: var(--oppai-text-dim); font: inherit; font-size: 12px; font-variant-numeric: tabular-nums;
    white-space: nowrap; cursor: pointer;
  }
  .recipe-chip .material-symbols-rounded { font-size: 16px; }
  .recipe-chip:hover { background: var(--oppai-surface-2); color: var(--oppai-text); }
  .recipe-chip.on { border-color: color-mix(in srgb, var(--oppai-primary) 70%, transparent); color: var(--oppai-text); }
  .recipe-chip.add { border-style: dashed; }
  .recipe-chip.lora { padding: 0; gap: 0; border-color: color-mix(in srgb, var(--oppai-primary) 50%, transparent); background: color-mix(in srgb, var(--oppai-primary) 14%, transparent); color: var(--oppai-text); }
  .recipe-chip-main, .recipe-chip-x { height: 100%; display: inline-flex; align-items: center; gap: 6px; border: 0; background: transparent; color: inherit; font: inherit; cursor: pointer; }
  .recipe-chip-main { padding: 0 4px 0 10px; }
  .recipe-chip-main b { font-weight: 700; opacity: 0.75; }
  .recipe-chip-x { padding: 0 8px 0 3px; opacity: 0.65; }
  .recipe-chip-x:hover { opacity: 1; }

  .canvas-wrap { position: relative; flex: 1; min-height: 0; display: flex; flex-direction: column; }
  .canvas-stage {
    position: relative; flex: 1; min-height: 240px; overflow: auto; display: grid; place-items: center; padding: 18px; box-sizing: border-box;
    background-image: radial-gradient(color-mix(in srgb, var(--oppai-border-strong) 55%, transparent) 1px, transparent 1px);
    background-size: 22px 22px;
  }
  .viewer-stage { overflow: hidden; container-type: size; }
  .viewer-stage.drop::after {
    content: "Drop to start the next picture from it"; position: absolute; inset: 12px; z-index: 9; display: grid; place-items: center;
    border: 2px dashed var(--oppai-primary); border-radius: 18px; background: color-mix(in srgb, var(--oppai-primary) 12%, transparent);
    color: var(--oppai-text); font-size: 14px; font-weight: 650; pointer-events: none;
  }
  /* What went wrong, above the stage: in the flow, so it pushes the picture down rather
     than covering it and its tools. */
  .stage-alert {
    flex: none; display: flex; align-items: flex-start; gap: 10px; margin: 10px 12px 0; padding: 10px 10px 10px 12px; border-radius: 14px;
    border: 1px solid color-mix(in srgb, var(--oppai-error, #f2b8b5) 45%, transparent);
    background: color-mix(in srgb, var(--oppai-error, #f2b8b5) 10%, var(--oppai-surface-2)); color: var(--oppai-text); font-size: 12.5px;
    animation: oppai-fade-in-up 0.18s ease both;
  }
  .stage-alert > .material-symbols-rounded { font-size: 20px; color: var(--oppai-error, #f2b8b5); margin-top: 1px; }
  .stage-alert.info { border-color: var(--oppai-border-strong); background: var(--oppai-surface-2); }
  .stage-alert.info > .material-symbols-rounded { color: var(--oppai-primary-bright, var(--oppai-primary)); }
  .sa-copy { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; line-height: 1.45; }
  .sa-copy b { font-size: 13px; }
  .sa-copy > span { color: var(--oppai-text-dim); }
  .sa-raw {
    display: block; max-height: 96px; overflow: auto; margin-top: 4px; padding: 6px 8px; border-radius: 8px; background: var(--oppai-bg);
    font-size: 11.5px; color: var(--oppai-text-dim); white-space: pre-wrap; word-break: break-word;
  }
  .sa-acts { flex: none; display: flex; align-items: center; gap: 4px; flex-wrap: wrap; justify-content: flex-end; }
  .sa-acts .chip { height: 28px; padding: 0 10px; font-size: 12px; }
  .sa-x { width: 30px; height: 30px; border-radius: 15px; border: none; background: none; color: var(--oppai-text-muted); display: grid; place-items: center; cursor: pointer; }
  .sa-x:hover { background: var(--oppai-surface); color: var(--oppai-text); }
  .sa-x .material-symbols-rounded { font-size: 17px; }
  .canvas-empty {
    width: min(420px, 88%); min-height: 220px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
    border: 1px dashed var(--oppai-border-strong); border-radius: 18px; background: color-mix(in srgb, var(--oppai-surface) 78%, transparent);
    color: var(--oppai-text-muted); text-align: center; padding: 28px; box-sizing: border-box; place-self: center;
  }
  .canvas-empty .material-symbols-rounded { font-size: 36px; }
  .canvas-empty strong { color: var(--oppai-text-dim); font-size: 14px; }
  .canvas-empty > span:last-child { max-width: 300px; font-size: 12px; line-height: 1.5; }
  .canvas-empty.welcome { width: min(480px, 92%); border-style: solid; border-color: var(--oppai-border); gap: 10px; padding: 30px 26px; }
  .canvas-empty.welcome strong { font-size: 18px; color: var(--oppai-text); }
  .welcome-glyph {
    width: 64px; height: 64px; border-radius: 20px; display: grid; place-items: center; margin-bottom: 2px;
    background: linear-gradient(135deg, color-mix(in srgb, var(--oppai-primary) 26%, var(--oppai-surface)), color-mix(in srgb, #c58af9 18%, var(--oppai-surface)));
    color: var(--oppai-primary-bright, var(--oppai-primary));
  }
  .canvas-empty .welcome-glyph .material-symbols-rounded { font-size: 32px; }
  .welcome-tips { display: flex; flex-direction: column; gap: 6px; margin-top: 6px; width: 100%; }
  .welcome-tips > span {
    display: flex; align-items: center; gap: 9px; padding: 8px 12px; border-radius: 10px; background: var(--oppai-bg); font-size: 12px; color: var(--oppai-text-dim); text-align: left;
  }
  .canvas-empty .welcome-tips .material-symbols-rounded { font-size: 17px; color: var(--oppai-primary-bright, var(--oppai-primary)); }
  .welcome-recent { width: 100%; display: flex; flex-direction: column; gap: 4px; margin-top: 8px; text-align: left; }
  .welcome-k { font-size: 10.5px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; color: var(--oppai-text-muted); margin-bottom: 2px; }
  .recent-line {
    display: flex; align-items: center; gap: 8px; padding: 7px 10px; border: 1px solid var(--oppai-border); border-radius: 10px;
    background: transparent; color: var(--oppai-text-dim); font: inherit; font-size: 12px; text-align: left; cursor: pointer; min-width: 0;
  }
  .recent-line span:last-child { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .recent-line:hover { border-color: var(--oppai-primary); color: var(--oppai-text); }
  .canvas-empty .recent-line .material-symbols-rounded { font-size: 16px; }

  /* The viewer: one picture, fitted to the stage, its tools floating under it. */
  .viewer { position: relative; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; }
  .view-frame { position: relative; margin: 0; display: grid; place-items: center; min-height: 0; }
  .view-img {
    display: block; max-width: calc(100cqw - 104px); max-height: calc(100cqh - 28px); min-width: 120px; border-radius: 12px; object-fit: contain;
    background: #000; box-shadow: 0 22px 70px rgba(0,0,0,.55); cursor: zoom-in; animation: oppai-fade-in 0.2s ease both;
  }
  /* The picture's facts, in the stage's corner rather than on the picture: on a short
     window the picture is small, and four chips over it hid half of it. */
  .view-cap {
    position: absolute; left: 12px; top: 10px; z-index: 2; display: flex; gap: 6px; pointer-events: none; max-width: calc(100% - 24px); overflow: hidden;
  }
  .view-cap > span {
    display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 8px; background: rgba(0,0,0,.55); backdrop-filter: blur(6px);
    color: #fff; font-size: 11px; font-weight: 600; font-variant-numeric: tabular-nums;
  }
  .view-cap .material-symbols-rounded { font-size: 13px; }
  .view-cap .cap-saved { background: color-mix(in srgb, #2e7d4f 85%, transparent); }
  .view-nav {
    position: absolute; top: 50%; z-index: 2; width: 40px; height: 64px; margin-top: -38px; border-radius: 14px; border: 1px solid var(--oppai-border);
    background: color-mix(in srgb, var(--oppai-surface) 80%, transparent); backdrop-filter: blur(8px); color: var(--oppai-text);
    display: grid; place-items: center; cursor: pointer; transition: opacity 0.15s ease;
  }
  .view-nav.prev { left: 6px; }
  .view-nav.next { right: 6px; }
  .view-nav:disabled { opacity: 0.2; cursor: default; }
  .view-nav .material-symbols-rounded { font-size: 26px; }
  .view-bar {
    flex: none; display: flex; align-items: center; gap: 2px; padding: 4px; border-radius: 16px; border: 1px solid var(--oppai-border-strong);
    background: color-mix(in srgb, var(--oppai-surface-2) 88%, transparent); backdrop-filter: blur(10px); box-shadow: 0 10px 30px rgba(0,0,0,.35);
    max-width: calc(100% - 24px); overflow-x: auto; scrollbar-width: none;
  }
  /* In the session row the tools sit at its end, and give way to the thumbnails last. */
  .session-strip > .view-bar { flex: 0 1 auto; min-width: 0; max-width: none; margin-left: auto; box-shadow: none; backdrop-filter: none; }
  .canvas-empty.gone { min-height: 0; }
  .vb {
    flex: none; height: 36px; min-width: 36px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 0 8px;
    border: none; border-radius: 12px; background: transparent; color: var(--oppai-text-dim); font: inherit; font-size: 12.5px; font-weight: 650; cursor: pointer;
  }
  .vb:hover:not(:disabled) { background: var(--oppai-surface); color: var(--oppai-text); }
  .vb.on { background: color-mix(in srgb, var(--oppai-primary) 18%, transparent); color: var(--oppai-primary-bright, var(--oppai-primary)); }
  .vb .material-symbols-rounded { font-size: 19px; }
  .vb.save { padding: 0 14px 0 11px; background: var(--oppai-primary); color: var(--oppai-on-primary); }
  .vb.save:hover:not(:disabled) { background: var(--oppai-primary); filter: brightness(1.08); color: var(--oppai-on-primary); }
  .vb.save.done { background: color-mix(in srgb, #2e7d4f 70%, var(--oppai-surface)); color: #fff; opacity: 1; cursor: default; }
  .vb-sep { flex: none; width: 1px; height: 20px; background: var(--oppai-border-strong); margin: 0 3px; }
  .vb-note { padding: 0 8px; font-size: 12px; color: var(--oppai-text-muted); white-space: nowrap; }
  .view-info { position: absolute; right: 12px; top: 12px; z-index: 5; width: min(420px, calc(100% - 24px)); animation: oppai-fade-in-up 0.18s ease both; }
  .view-info .geninfo { margin: 0; border: 1px solid var(--oppai-border-strong); box-shadow: 0 16px 40px rgba(0,0,0,.45); }

  /* Compare: picture B under picture A, A clipped at the divider. */
  .cmp-frame { cursor: ew-resize; touch-action: none; user-select: none; }
  .cmp-frame > .view-img { grid-area: 1 / 1; cursor: ew-resize; animation: none; }
  .cmp-a { clip-path: inset(0 calc(100% - var(--split, 50%)) 0 0); box-shadow: none; }
  .cmp-line { position: absolute; top: 0; bottom: 0; left: var(--split, 50%); width: 2px; margin-left: -1px; background: #fff; box-shadow: 0 0 10px rgba(0,0,0,.6); pointer-events: none; }
  .cmp-knob {
    position: absolute; top: 50%; left: 50%; width: 34px; height: 34px; margin: -17px 0 0 -17px; border-radius: 17px; display: grid; place-items: center;
    background: #fff; color: #222; box-shadow: 0 4px 14px rgba(0,0,0,.45);
  }
  .cmp-knob .material-symbols-rounded { font-size: 20px; }
  .cmp-tag {
    position: absolute; top: 10px; padding: 3px 9px; border-radius: 8px; background: rgba(0,0,0,.6); color: #fff;
    font-size: 11px; font-weight: 700; font-variant-numeric: tabular-nums; pointer-events: none;
  }
  .cmp-tag.left { left: 10px; }
  .cmp-tag.right { right: 10px; top: auto; bottom: 10px; }

  /* The generating overlay: the picture forming, over the stage. */
  .generating-overlay {
    position: absolute; inset: 0; z-index: 3; display: grid; place-items: center;
    background: color-mix(in srgb, var(--oppai-bg) 55%, transparent); backdrop-filter: blur(3px);
  }
  .generating-card {
    display: grid; gap: 10px; padding: 12px 16px; border: 1px solid var(--oppai-border-strong); border-radius: 16px; background: var(--oppai-surface-2);
    box-shadow: 0 16px 44px rgba(0,0,0,.4); font-size: 13px; font-weight: 600; max-width: min(92%, 420px);
  }
  .generating-card.with-preview { padding: 10px; }
  .progress-preview { display: block; width: 100%; max-height: 52vh; object-fit: contain; border-radius: 10px; background: #000; }
  .progress-row { display: flex; align-items: center; gap: 10px; }
  .progress-label { flex: 1; min-width: 0; }
  .progress-cancel {
    display: inline-flex; align-items: center; gap: 4px; border: 1px solid var(--oppai-border-strong); border-radius: 999px;
    padding: 5px 12px 5px 8px; background: transparent; color: inherit; font: inherit; font-size: 12px; cursor: pointer;
  }
  .progress-cancel:hover:not(:disabled) { background: color-mix(in srgb, var(--oppai-error, #f66) 18%, transparent); }
  .progress-cancel:disabled { opacity: .5; cursor: default; }
  .progress-bar { height: 4px; border-radius: 2px; background: var(--oppai-border); overflow: hidden; }
  .progress-bar span { display: block; height: 100%; background: var(--oppai-primary); transition: width .4s ease; }

  /* The session strip. */
  .session-strip {
    flex: none; display: flex; align-items: center; gap: 10px; padding: 8px 12px; min-width: 0;
    border-top: 1px solid var(--oppai-border); background: color-mix(in srgb, var(--oppai-surface) 80%, transparent);
  }
  .strip-label {
    flex: none; display: flex; flex-direction: column; align-items: center; gap: 1px; width: 52px; font-size: 9.5px; font-weight: 700;
    letter-spacing: 0.5px; text-transform: uppercase; color: var(--oppai-text-muted); text-align: center; line-height: 1.2;
  }
  .strip-label b { font-size: 15px; color: var(--oppai-text); letter-spacing: 0; font-variant-numeric: tabular-nums; }
  .strip-scroll { flex: 1 1 120px; min-width: 0; display: flex; align-items: center; gap: 6px; overflow-x: auto; scrollbar-width: thin; padding: 3px 2px; }
  .strip-thumb, .strip-live, .strip-q {
    position: relative; flex: none; width: 54px; height: 66px; border-radius: 10px; overflow: hidden; padding: 0; border: 2px solid transparent;
    background: var(--oppai-bg); cursor: pointer;
  }
  .strip-thumb img, .strip-live img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .strip-thumb { opacity: 0.72; transition: opacity 0.12s ease, transform 0.15s var(--oppai-ease-spring); animation: oppai-scale-in 0.2s var(--oppai-ease-emphasized) both; }
  .strip-thumb:hover { opacity: 1; transform: translateY(-2px); }
  .strip-thumb.on { opacity: 1; border-color: var(--oppai-primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--oppai-primary) 22%, transparent); }
  .strip-thumb.cmp { opacity: 1; border-color: #8ab4f8; }
  .strip-saved {
    position: absolute; right: 3px; bottom: 3px; width: 16px; height: 16px; border-radius: 8px; display: grid; place-items: center;
    background: #2e7d4f; color: #fff;
  }
  .strip-saved .material-symbols-rounded { font-size: 12px; }
  .strip-b {
    position: absolute; left: 3px; top: 3px; padding: 0 5px; border-radius: 6px; background: #8ab4f8; color: #10213f; font-size: 10px; font-weight: 800;
  }
  .strip-gone { width: 100%; height: 100%; display: grid; place-items: center; color: var(--oppai-text-muted); }
  .strip-gone .material-symbols-rounded { font-size: 18px; }
  .strip-live { cursor: default; border-style: dashed; border-color: var(--oppai-primary); display: grid; place-items: center; }
  .strip-live img { position: absolute; inset: 0; filter: brightness(0.6); }
  .strip-live span { position: relative; font-size: 12px; font-weight: 800; color: #fff; font-variant-numeric: tabular-nums; text-shadow: 0 1px 3px rgba(0,0,0,.6); }
  .strip-q {
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; border: 1.5px dashed var(--oppai-border-strong);
    color: var(--oppai-text-dim); font: inherit; font-size: 13px; font-weight: 800;
  }
  .strip-q .material-symbols-rounded { font-size: 18px; }
  .strip-clear { flex: none; width: 34px; height: 34px; border-radius: 17px; border: none; background: none; color: var(--oppai-text-muted); display: grid; place-items: center; cursor: pointer; }
  .strip-clear:hover { background: var(--oppai-surface-2); color: var(--oppai-text); }

  /* The composer. */
  .prompt-dock { flex: 0 0 auto; position: relative; padding: 10px 14px 14px; background: color-mix(in srgb, var(--oppai-surface) 80%, transparent); container-type: inline-size; }
  .composer {
    position: relative; display: flex; flex-direction: column; gap: 9px; padding: 11px; border: 1px solid var(--oppai-border-strong); border-radius: 20px;
    background: var(--oppai-surface-2); box-shadow: 0 -4px 30px rgba(0,0,0,.2); transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }
  .composer:focus-within {
    border-color: color-mix(in srgb, var(--oppai-primary) 65%, var(--oppai-border-strong));
    box-shadow: 0 -4px 30px rgba(0,0,0,.2), 0 0 0 3px color-mix(in srgb, var(--oppai-primary) 14%, transparent);
  }
  .composer-fields { display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(200px, 0.8fr); gap: 9px; }
  .prompt-field { position: relative; }
  .composer .prompt-field textarea {
    min-height: 74px; max-height: 220px; padding: 11px 13px; border-radius: 14px; border-color: var(--oppai-border); background: var(--oppai-bg);
    font-size: 14px; line-height: 1.55; resize: vertical;
  }
  .composer .prompt-field textarea:focus { border-color: var(--oppai-primary); }
  .composer .prompt-field.negative textarea { padding-top: 28px; font-size: 13px; }
  .field-tag {
    position: absolute; z-index: 1; top: 9px; left: 13px; font-size: 10px; font-weight: 700; letter-spacing: .55px; text-transform: uppercase;
    color: var(--oppai-text-muted); pointer-events: none;
  }
  .field-tag.negative { color: var(--oppai-error, #f2b8b5); }
  /* Trigger words: one line, the picked ones and a way to the rest. */
  .trigger-row { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .trig-open {
    flex: none; display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 8px 0 10px; border-radius: 15px;
    border: 1px solid var(--oppai-border-strong); background: transparent; color: var(--oppai-text-dim); font: inherit; font-size: 12px; font-weight: 650; cursor: pointer;
  }
  .trig-open:hover, .trig-open.on { color: var(--oppai-text); border-color: color-mix(in srgb, var(--oppai-primary) 60%, transparent); }
  .trig-open .material-symbols-rounded { font-size: 16px; }
  .trig-n { font-weight: 500; color: var(--oppai-text-muted); font-variant-numeric: tabular-nums; }
  .trig-picked { flex: 1; min-width: 0; display: flex; align-items: center; gap: 5px; overflow-x: auto; scrollbar-width: none; }
  .trig-chip {
    flex: none; display: inline-flex; align-items: center; gap: 2px; height: 26px; padding: 0 3px 0 10px; border-radius: 13px; max-width: 180px;
    background: var(--oppai-primary-container); color: var(--oppai-text); font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .trig-chip button { flex: none; width: 20px; height: 20px; border-radius: 10px; border: none; background: none; color: inherit; opacity: 0.6; display: grid; place-items: center; cursor: pointer; padding: 0; }
  .trig-chip button:hover { opacity: 1; background: rgba(0,0,0,.18); }
  .trig-chip .material-symbols-rounded { font-size: 14px; }
  .trig-more { flex: none; height: 26px; padding: 0 9px; border-radius: 13px; border: 1px dashed var(--oppai-border-strong); background: none; color: var(--oppai-text-dim); font: inherit; font-size: 12px; cursor: pointer; }
  .trig-none { font-size: 12px; color: var(--oppai-text-muted); white-space: nowrap; }
  .triggers-pop { left: 0; bottom: calc(100% + 8px); transform-origin: bottom left; width: min(620px, 100%); max-height: min(520px, 62vh); }
  .triggers-pop .link { border: none; background: none; color: var(--oppai-primary-bright, var(--oppai-primary)); font: inherit; font-size: 12px; font-weight: 650; cursor: pointer; padding: 2px 4px; }
  .trig-search { display: flex; align-items: center; gap: 6px; margin: 8px 10px 4px; padding: 0 10px; height: 34px; border-radius: 10px; background: var(--oppai-bg); border: 1px solid var(--oppai-border); }
  .trig-search input { flex: 1; min-width: 0; border: none; background: none; color: var(--oppai-text); font: inherit; font-size: 13px; outline: none; }
  .trig-search .material-symbols-rounded { font-size: 18px; color: var(--oppai-text-muted); }
  .trig-groups { overflow-y: auto; padding: 4px 10px 12px; display: flex; flex-direction: column; gap: 12px; }
  .trig-group-head { display: flex; align-items: baseline; gap: 8px; margin-bottom: 6px; font-size: 12px; }
  .trig-group-head b { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .trig-group-head small { color: var(--oppai-text-muted); font-variant-numeric: tabular-nums; }
  .trig-group-head .link { margin-left: auto; }
  .trig-chips { display: flex; flex-wrap: wrap; gap: 5px; }
  .chip.small { min-height: 28px; padding: 2px 11px; font-size: 12px; border-radius: 14px; }
  .composer-bar { display: flex; align-items: center; gap: 8px; min-height: 44px; }
  .composer .mic {
    flex: none; width: 38px; height: 38px; border-radius: 19px; background: var(--oppai-bg); border: 1px solid var(--oppai-border-strong);
    color: var(--oppai-text-dim); display: grid; place-items: center; cursor: pointer;
  }
  .composer .mic:hover { color: var(--oppai-text); border-color: var(--oppai-text-muted); }
  .composer .mic.on { color: var(--oppai-primary-bright, var(--oppai-primary)); border-color: var(--oppai-primary); }
  .composer .mic .material-symbols-rounded { font-size: 19px; }
  .composer .mic.live { border-color: transparent; background: var(--oppai-error, #f2b8b5); color: #000; }
  .composer .speech-hint { font-size: 13px; }
  .count-seg { flex: none; display: inline-flex; border: 1px solid var(--oppai-border-strong); border-radius: 12px; overflow: hidden; }
  .count-seg button {
    width: 34px; height: 34px; border: 0; background: transparent; color: var(--oppai-text-dim); font: inherit; font-size: 13px; font-weight: 700; cursor: pointer;
  }
  .count-seg button + button { border-left: 1px solid var(--oppai-border); }
  .count-seg button:hover:not(:disabled) { background: var(--oppai-surface); }
  .count-seg button.on { background: var(--oppai-primary-container); color: var(--oppai-on-primary-container, var(--oppai-text)); }
  .count-seg button:disabled { cursor: default; opacity: 0.5; }
  .prompt-summary { min-width: 0; flex: 0 1 auto; color: var(--oppai-text-muted); font-size: 11.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  @container (max-width: 860px) {
    .prompt-summary { display: none; }
  }
  @container (max-width: 720px) {
    .queue-label { display: none; }
    .people-seg { display: none; }
    .people-cycle { display: inline-flex; }
    .composer .generate { min-width: 0; padding: 0 18px; }
  }
  @container (max-width: 560px) {
    .composer-fields { grid-template-columns: 1fr; }
    .composer .prompt-field.negative textarea { min-height: 40px; height: 40px; padding-top: 22px; }
    /* The tools on one row and Generate on its own below, full width: squeezed onto
       one row, Generate was the thing pushed off the edge. */
    .composer-bar { flex-wrap: wrap; row-gap: 8px; }
    .composer .generate { order: 5; flex: 1 1 auto; margin: 0; }
    .queue-btn { order: 6; }
  }
  .composer .generate {
    width: auto; min-width: 160px; height: 46px; margin: 0 0 0 auto; padding: 0 24px; border: none; border-radius: 23px; flex: none;
    font-size: 15px; font-weight: 700; letter-spacing: 0.2px; color: var(--oppai-on-primary); display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer;
    background: linear-gradient(135deg, var(--oppai-primary), color-mix(in srgb, var(--oppai-primary) 62%, #c58af9));
    box-shadow: 0 8px 22px color-mix(in srgb, var(--oppai-primary) 34%, transparent);
    transition: transform 0.16s var(--oppai-ease-spring), box-shadow 0.16s ease, filter 0.16s ease;
  }
  .composer .generate:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.06); }
  .composer .generate:disabled { box-shadow: none; opacity: 0.55; cursor: default; }
  .composer .generate.cancel { background: var(--oppai-surface); color: var(--oppai-text); border: 1px solid var(--oppai-border-strong); box-shadow: none; }
  .queue-btn {
    flex: none; height: 46px; display: inline-flex; align-items: center; gap: 6px; padding: 0 14px; border-radius: 23px;
    border: 1px solid var(--oppai-border-strong); background: var(--oppai-bg); color: var(--oppai-text-dim); font: inherit; font-size: 13px; font-weight: 650; cursor: pointer;
  }
  .queue-btn:hover:not(:disabled) { color: var(--oppai-text); border-color: var(--oppai-text-muted); }
  .queue-btn.hot:not(:disabled) { border-color: var(--oppai-primary); color: var(--oppai-text); background: color-mix(in srgb, var(--oppai-primary) 12%, var(--oppai-bg)); }
  .queue-btn:disabled { opacity: 0.45; cursor: default; }
  .queue-btn b {
    min-width: 18px; height: 18px; padding: 0 5px; box-sizing: border-box; border-radius: 9px; background: var(--oppai-primary); color: var(--oppai-on-primary);
    font-size: 10.5px; line-height: 18px; text-align: center;
  }
  .queue-btn .material-symbols-rounded { font-size: 19px; }

  /* The suggestion list opens upward: the composer sits at the bottom of the screen. */
  .complete {
    position: absolute; left: 0; right: 0; bottom: calc(100% + 8px); z-index: 20; max-height: 340px; overflow-y: auto; padding: 6px;
    border: 1px solid var(--oppai-border-strong); border-radius: 16px; background: var(--oppai-surface-2); box-shadow: 0 16px 44px rgba(0,0,0,.45);
    animation: oppai-fade-in-up 0.14s ease both;
  }
  .complete-row {
    width: 100%; display: flex; align-items: center; gap: 10px; padding: 8px 10px; border: 0; border-radius: 10px; background: transparent;
    color: var(--oppai-text); font: inherit; font-size: 13px; text-align: left; cursor: pointer;
  }
  .complete-row.on { background: color-mix(in srgb, var(--oppai-primary) 22%, transparent); }
  /* Danbooru's own colours for its categories, so a character or an artist reads as
     one before its name does. */
  .complete-dot { flex: 0 0 9px; width: 9px; height: 9px; border-radius: 50%; background: #8ab4f8; }
  .complete-dot.cat-1 { background: #f28b82; }
  .complete-dot.cat-3 { background: #c58af9; }
  .complete-dot.cat-4 { background: #81c995; }
  .complete-dot.cat-5 { background: #fdd663; }
  .complete-dot.cat-100 { background: var(--oppai-primary); }
  .complete-dot.cat-lora, .complete-dot.cat-wildcard, .complete-dot.cat-trigger { border-radius: 3px; }
  .complete-dot.cat-lora { background: var(--oppai-primary); }
  .complete-dot.cat-wildcard { background: #78d9ec; }
  .complete-dot.cat-trigger { background: #fdd663; }
  .complete-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .complete-detail { color: var(--oppai-text-muted); font-size: 11.5px; white-space: nowrap; }
  .complete-count { min-width: 38px; color: var(--oppai-text-muted); font-size: 11.5px; font-variant-numeric: tabular-nums; text-align: right; }
  .complete-hint { margin-top: 4px; padding: 7px 10px 3px; border-top: 1px solid var(--oppai-border); color: var(--oppai-text-muted); font-size: 11px; }
  .prompt-options { max-height: 220px; overflow-y: auto; padding: 9px; border: 1px solid var(--oppai-border); border-radius: 8px; background: var(--oppai-surface-2); }

  /* A LoRA dragged over the stage. */
  .lora-drop {
    position: absolute; inset: 0; z-index: 12; display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 12px; padding: 18px; box-sizing: border-box; background: color-mix(in srgb, var(--oppai-bg) 74%, transparent);
    backdrop-filter: blur(3px); animation: oppai-fade-in 0.12s ease both; container-type: size; overflow: hidden;
  }
  .drop-title { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; justify-content: center; font-size: 13px; color: var(--oppai-text-dim); }
  .drop-title b { color: var(--oppai-text); }
  .drop-title .material-symbols-rounded { font-size: 18px; color: var(--oppai-primary-bright, var(--oppai-primary)); }
  .drop-all {
    flex: 1 1 auto; width: 100%; max-width: 560px; max-height: 320px; display: flex; align-items: center; justify-content: center; gap: 8px;
    border: 2px dashed color-mix(in srgb, var(--oppai-primary) 50%, var(--oppai-border-strong)); border-radius: 18px;
    color: var(--oppai-text-dim); font-size: 15px; font-weight: 600; transition: background 0.12s ease, border-color 0.12s ease;
  }
  .drop-all.slim { flex: none; height: 52px; font-size: 13px; }
  .drop-all.over, .drop-part.over {
    border-style: solid; border-color: var(--oppai-primary); color: var(--oppai-text); background: color-mix(in srgb, var(--oppai-primary) 16%, transparent);
  }
  .people-frame {
    display: flex; gap: 6px; padding: 6px; box-sizing: border-box; max-height: 100%; border-radius: 14px;
    border: 1px solid var(--oppai-border-strong); background: color-mix(in srgb, var(--oppai-surface) 72%, transparent);
  }
  .people-frame.rows { flex-direction: column; }
  .drop-part {
    position: relative; min-width: 0; min-height: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 6px; padding: 26px 6px 8px; box-sizing: border-box; border-radius: 10px; text-align: center; font-size: 12px;
    color: var(--oppai-text-muted); border: 2px dashed color-mix(in srgb, var(--oppai-primary) 45%, var(--oppai-border-strong));
    transition: background 0.12s ease, border-color 0.12s ease;
  }
  .drop-n { position: absolute; top: 5px; left: 9px; font-size: 13px; font-weight: 700; color: var(--oppai-primary-bright, var(--oppai-primary)); }
  .drop-lora {
    display: inline-flex; align-items: center; gap: 4px; max-width: 100%; box-sizing: border-box; padding: 4px 4px 4px 8px;
    border-radius: 14px; background: var(--oppai-primary-container); color: var(--oppai-text); font-size: 12px; font-weight: 600;
  }
  .drop-lora .nm { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .drop-lora .material-symbols-rounded { font-size: 15px; }
  .drop-lora button { flex: none; width: 20px; height: 20px; padding: 0; border: none; border-radius: 10px; background: none; color: inherit; display: grid; place-items: center; cursor: pointer; }
  .people-empty { place-self: center; width: 100%; display: flex; flex-direction: column; align-items: center; gap: 12px; }
  .people-empty .hint { max-width: 360px; font-size: 12px; line-height: 1.5; color: var(--oppai-text-muted); text-align: center; }

  .restored {
    position: absolute; top: 64px; left: 50%; z-index: 30; width: min(520px, calc(100% - 24px)); transform: translateX(-50%); box-sizing: border-box;
    margin: 0; border: 1px solid var(--oppai-border-strong); box-shadow: 0 10px 30px rgba(0,0,0,.35);
  }

  /* ── the Sprites studio ────────────────────────────────────────────────── */
  .sprite-shell { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr); }
  .sprite-shell.with-inspector { grid-template-columns: 360px minmax(0, 1fr); }
  .sprite-shell.with-focus { grid-template-columns: minmax(0, 1fr) 340px; }
  .sprite-shell.with-inspector.with-focus { grid-template-columns: 360px minmax(0, 1fr) 340px; }
  .sprite-inspector {
    min-width: 0; min-height: 0; display: flex; flex-direction: column; background: var(--oppai-surface); border-right: 1px solid var(--oppai-border-strong);
  }
  .ins-tabs { flex: none; display: grid; grid-template-columns: repeat(4, 1fr); gap: 2px; padding: 8px; border-bottom: 1px solid var(--oppai-border); }
  .ins-tabs button {
    display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 7px 2px 6px; border: none; border-radius: 10px;
    background: transparent; color: var(--oppai-text-muted); font: inherit; font-size: 11px; font-weight: 650; cursor: pointer;
  }
  .ins-tabs button .material-symbols-rounded { font-size: 20px; }
  .ins-tabs button:hover { color: var(--oppai-text); background: var(--oppai-surface-2); }
  .ins-tabs button.on { color: var(--oppai-text); background: var(--oppai-primary-container); }
  .panel-scroll { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; }
  .ins-body { padding: 14px 14px 26px; }
  .gear-slot .gear-slot-icon { border: 0; cursor: pointer; font: inherit; font-family: "Material Symbols Rounded"; }
  .gear-slot .gear-slot-icon.inert { cursor: default; }
  .gear-slot.off { opacity: 0.55; }
  .gear-slot.off input { text-decoration: line-through; }
  textarea.num.extras { resize: vertical; min-height: 54px; font-size: 12px; line-height: 1.4; }
  .studio-wardrobe { flex: 1; min-height: 0; overflow: auto; padding: 20px 24px 40px; }

  .workbench { position: relative; min-width: 0; min-height: 0; display: flex; flex-direction: column; background: color-mix(in srgb, var(--oppai-bg) 84%, #000); }
  .canvas-toolbar {
    flex: 0 0 auto; min-height: 48px; display: flex; align-items: center; flex-wrap: wrap; gap: 8px 10px; padding: 7px 12px; box-sizing: border-box;
    border-bottom: 1px solid var(--oppai-border); background: var(--oppai-surface); color: var(--oppai-text-muted); font-size: 11px; font-variant-numeric: tabular-nums;
  }
  .toolbar-clear {
    border: 0; background: transparent; color: var(--oppai-text-muted); font: inherit; display: inline-flex; align-items: center; gap: 4px; cursor: pointer;
    padding: 6px; border-radius: 8px;
  }
  .toolbar-clear:hover { background: var(--oppai-surface-2); color: var(--oppai-text); }
  .wardrobe-pick { display: inline-flex; align-items: center; gap: 6px; min-width: 0; color: var(--oppai-text-dim); }
  .wardrobe-pick select {
    max-width: 210px; min-width: 0; height: 32px; border: 1px solid var(--oppai-border-strong); border-radius: 10px; padding: 0 8px;
    background: var(--oppai-bg); color: var(--oppai-text); font: inherit; font-size: 12.5px; font-weight: 600;
  }
  .sheet-tabs { display: inline-flex; gap: 2px; padding: 3px; border-radius: 12px; background: var(--oppai-bg); border: 1px solid var(--oppai-border); }
  .sheet-tab { border: 0; border-radius: 9px; padding: 5px 11px; background: transparent; color: var(--oppai-text-muted); font: inherit; font-size: 12px; font-weight: 650; cursor: pointer; }
  .sheet-tab.on { background: var(--oppai-primary); color: var(--oppai-on-primary); }
  .sheet-tab-count { font-weight: 500; opacity: 0.8; font-variant-numeric: tabular-nums; }
  .board-filters { display: inline-flex; gap: 4px; flex-wrap: wrap; }
  .bf {
    display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border-radius: 14px; border: 1px solid var(--oppai-border-strong);
    background: transparent; color: var(--oppai-text-dim); font: inherit; font-size: 12px; font-weight: 600; cursor: pointer;
  }
  .bf b { font-weight: 800; font-variant-numeric: tabular-nums; }
  .bf:hover:not(:disabled) { color: var(--oppai-text); border-color: var(--oppai-text-muted); }
  .bf.on { background: var(--oppai-surface-2); border-color: var(--oppai-text-dim); color: var(--oppai-text); }
  .bf:disabled { opacity: 0.4; cursor: default; }
  .bf-dot { width: 8px; height: 8px; border-radius: 50%; }
  .bf-missing .bf-dot { background: transparent; border: 1.5px dashed var(--oppai-text-muted); box-sizing: border-box; }
  .bf-review .bf-dot { background: #f5c469; }
  .bf-stale .bf-dot { background: #d9a441; box-shadow: inset 0 0 0 2px var(--oppai-surface); border: 1px solid #d9a441; box-sizing: border-box; }
  .zoom-tabs { display: inline-flex; gap: 2px; padding: 2px; border-radius: 9px; border: 1px solid var(--oppai-border); }
  .zoom-tab { min-width: 26px; padding: 0 6px; height: 24px; border: none; border-radius: 7px; background: transparent; color: var(--oppai-text-muted); font: inherit; font-size: 11px; font-weight: 700; cursor: pointer; }
  .zoom-tab.on { background: var(--oppai-surface-2); color: var(--oppai-text); }

  /* place-items back to normal too: block layout honours justify-items now, and a
     centred matrix wider than the stage overflows off its left edge, out of reach. */
  .canvas-stage.sheet { display: block; place-items: normal; padding: 14px; background-image: none; }
  /* The expression matrix: rows are heat tiers, columns are expressions, both headers
     sticky so a wide sheet scrolled to the edge still says where you are. */
  .face-matrix { display: grid; grid-template-columns: 96px repeat(12, var(--cell, 88px)); gap: 6px; align-items: stretch; width: max-content; min-width: 100%; }
  .face-matrix.fit { grid-template-columns: 96px repeat(12, minmax(0, 1fr)); width: 100%; min-width: 0; }
  .face-matrix.fit .matrix-col-head { font-size: 10px; padding: 4px 2px; }
  .face-matrix.fit .cell-foot { padding: 3px 4px; font-size: 9px; }
  .matrix-corner { position: sticky; top: 0; left: 0; z-index: 3; background: color-mix(in srgb, var(--oppai-bg) 84%, #000); }
  .matrix-col-head {
    position: sticky; top: 0; z-index: 2; padding: 8px 4px 6px; text-align: center; background: color-mix(in srgb, var(--oppai-bg) 84%, #000);
    color: var(--oppai-text-muted); font-size: 11px; font-weight: 700; letter-spacing: 0.3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .matrix-col-head.on { color: var(--oppai-primary-bright, var(--oppai-primary)); }
  .matrix-row-head {
    position: sticky; left: 0; z-index: 2; display: flex; flex-direction: column; justify-content: center; gap: 4px; padding: 8px 9px;
    border-radius: 12px; background: var(--oppai-surface); border: 1px solid var(--oppai-border); color: var(--oppai-text-dim); font-size: 11px; font-weight: 700;
  }
  .matrix-row-head.on { border-color: color-mix(in srgb, var(--oppai-primary) 55%, var(--oppai-border)); }
  .row-heat { display: flex; gap: 2px; }
  .row-heat i { width: 9px; height: 4px; border-radius: 2px; background: var(--oppai-border-strong); }
  .row-heat i.lit { background: linear-gradient(90deg, #f5c469, #e8705a); }
  .matrix-row-name { letter-spacing: 0.5px; text-transform: uppercase; }
  .matrix-row-count { color: var(--oppai-text-muted); font-weight: 600; font-variant-numeric: tabular-nums; }
  .row-bar { height: 3px; border-radius: 2px; background: var(--oppai-border); overflow: hidden; }
  .row-bar span { display: block; height: 100%; background: var(--oppai-primary); }
  .outfit-sheet { display: grid; gap: 12px; }
  .sheet-tier { border: 1px solid var(--oppai-border); border-radius: 16px; background: var(--oppai-surface); overflow: hidden; }
  .sheet-tier-head {
    display: flex; align-items: center; gap: 8px; padding: 9px 12px; border-bottom: 1px solid var(--oppai-border); color: var(--oppai-text-dim);
    font-size: 11px; font-weight: 700; letter-spacing: 0.7px; text-transform: uppercase;
  }
  .sheet-tier-head .tier-count { margin-left: auto; color: var(--oppai-text-muted); font-weight: 600; font-variant-numeric: tabular-nums; letter-spacing: 0.2px; text-transform: none; }
  .sheet-note { margin: 0; padding: 8px 12px 0; color: var(--oppai-text-muted); font-size: 12px; }
  .sheet-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(calc(var(--cell, 88px) + 30px), 1fr)); gap: 10px; padding: 12px; }
  .sheet-cell {
    position: relative; display: flex; flex-direction: column; padding: 0; border: 1px solid var(--oppai-border); border-radius: 12px;
    background: var(--oppai-surface); color: var(--oppai-text); font: inherit; text-align: left; overflow: hidden; cursor: pointer;
    transition: opacity 0.18s ease, transform 0.15s var(--oppai-ease-spring), border-color 0.15s ease;
  }
  .sheet-cell:hover { transform: translateY(-2px); border-color: var(--oppai-border-strong); }
  .sheet-cell.current { border-color: var(--oppai-primary); box-shadow: 0 0 0 2px color-mix(in srgb, var(--oppai-primary) 34%, transparent); }
  .sheet-cell.dim { opacity: 0.18; }
  .sheet-cell.dim:hover { opacity: 0.6; }
  .sheet-cell.st-stale .art { filter: saturate(0.4) brightness(0.85); }
  /* Reviewed squares are transparent PNGs. A checkerboard behind them is the only way
     the cut edge is visible at thumbnail size. */
  .sheet-cell .art {
    display: block; width: 100%; aspect-ratio: 3 / 4; object-fit: contain; background-color: #6b6b6b;
    background-image: linear-gradient(45deg, #565656 25%, transparent 25%, transparent 75%, #565656 75%), linear-gradient(45deg, #565656 25%, transparent 25%, transparent 75%, #565656 75%);
    background-size: 14px 14px; background-position: 0 0, 7px 7px;
  }
  .sheet-cell .art-empty {
    display: grid; place-items: center; aspect-ratio: 3 / 4; border-radius: 9px; border: 1.5px dashed var(--oppai-border-strong); margin: 4px;
    color: var(--oppai-text-muted); transition: color 0.15s ease, border-color 0.15s ease;
  }
  .sheet-cell .art-empty .material-symbols-rounded { font-size: 20px; opacity: 0.6; }
  .sheet-cell:hover .art-empty, .sheet-cell.current .art-empty { color: var(--oppai-primary-bright, var(--oppai-primary)); border-color: color-mix(in srgb, var(--oppai-primary) 55%, transparent); }
  .sheet-cell .cell-foot { display: flex; align-items: center; gap: 4px; padding: 4px 6px; font-size: 10px; font-weight: 650; color: var(--oppai-text-dim); }
  .sheet-cell .cell-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  /* Two states worth distinguishing at a glance: a square that still needs its cutout
     looked at, and one that is finished; stale is a ring rather than a fill. */
  .cell-state { flex: 0 0 auto; margin-left: auto; width: 8px; height: 8px; border-radius: 50%; box-sizing: border-box; }
  .cell-state.needs { background: #f5c469; }
  .cell-state.ready { background: #6ef7a5; }
  .cell-state.stale { background: transparent; border: 2px solid #d9a441; }
  .sheet-progress {
    position: absolute; top: 58px; left: 50%; z-index: 6; transform: translateX(-50%); display: flex; align-items: center; gap: 10px; padding: 6px 6px 6px 6px;
    border-radius: 16px; border: 1px solid var(--oppai-border-strong); background: color-mix(in srgb, var(--oppai-surface-2) 94%, transparent);
    backdrop-filter: blur(8px); box-shadow: 0 12px 34px rgba(0,0,0,.45); animation: oppai-fade-in-up 0.2s ease both; max-width: calc(100% - 24px);
  }
  .sheet-progress img { width: 44px; height: 56px; border-radius: 10px; object-fit: cover; background: #000; }
  .sheet-progress md-circular-progress { margin: 0 8px; }
  .sp-text { display: flex; flex-direction: column; gap: 3px; min-width: 150px; font-size: 11.5px; color: var(--oppai-text-muted); font-variant-numeric: tabular-nums; }
  .sp-text b { color: var(--oppai-text); font-size: 12.5px; }
  .sp-bar { height: 3px; border-radius: 2px; background: var(--oppai-border); overflow: hidden; }
  .sp-bar span { display: block; height: 100%; background: var(--oppai-primary); transition: width .4s ease; }

  /* The batch bar. */
  .batch-bar {
    flex: 0 0 auto; display: flex; align-items: center; flex-wrap: wrap; gap: 8px 12px; padding: 10px 14px;
    background: var(--oppai-surface); border-top: 1px solid var(--oppai-border-strong);
  }
  .batch-ring { position: relative; flex: none; width: 44px; height: 44px; display: grid; place-items: center; }
  .batch-ring svg { position: absolute; inset: 0; transform: rotate(-90deg); }
  .batch-ring circle { fill: none; stroke-width: 4; }
  .r-track { stroke: var(--oppai-border-strong); }
  .r-made { stroke: color-mix(in srgb, var(--oppai-primary) 45%, transparent); stroke-linecap: round; transition: stroke-dashoffset .4s ease; }
  .r-done { stroke: var(--oppai-primary); stroke-linecap: round; transition: stroke-dashoffset .4s ease; }
  .batch-ring b { position: relative; font-size: 12px; font-variant-numeric: tabular-nums; }
  .batch-ring b small { font-size: 8px; opacity: 0.7; }
  .batch-progress { flex: 1 1 220px; min-width: 180px; display: grid; gap: 2px; }
  .batch-head { font-size: 13px; font-weight: 700; color: var(--oppai-text); }
  .batch-count { color: var(--oppai-text-muted); font-size: 11px; font-variant-numeric: tabular-nums; }
  .batch-count em { font-style: normal; color: #d9a441; }
  .batch-note { flex-basis: 100%; color: var(--oppai-text-muted); font-size: 11px; }
  .switch.compact { margin: 0; font-size: 12px; white-space: nowrap; }

  /* The selected square. */
  .studio-focus { display: flex; flex-direction: column; }
  .focus-head { flex: none; display: flex; align-items: flex-start; gap: 10px; padding: 12px 12px 10px 14px; border-bottom: 1px solid var(--oppai-border); }
  .focus-title { flex: 1; min-width: 0; display: grid; gap: 4px; }
  .focus-title strong { font-size: 15px; }
  .focus-status { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--oppai-text-muted); }
  .focus-status i { width: 7px; height: 7px; border-radius: 50%; background: var(--oppai-text-muted); flex: none; }
  .focus-status.ready { color: #6fcf8a; }
  .focus-status.ready i { background: #6ef7a5; }
  .focus-status.needs, .focus-status.stale { color: #d9a441; }
  .focus-status.needs i { background: #f5c469; }
  .focus-status.stale i { background: transparent; border: 2px solid #d9a441; box-sizing: border-box; }
  .seg { display: inline-flex; border: 1px solid var(--oppai-border-strong); border-radius: 10px; overflow: hidden; flex: none; }
  .seg button { height: 28px; padding: 0 10px; border: none; background: none; color: var(--oppai-text-dim); font: inherit; font-size: 11.5px; font-weight: 650; cursor: pointer; }
  .seg button + button { border-left: 1px solid var(--oppai-border); }
  .seg button.on { background: var(--oppai-primary-container); color: var(--oppai-on-primary-container, var(--oppai-text)); }
  .focus-scroll { padding: 12px; display: flex; flex-direction: column; gap: 10px; }
  .focus-art {
    position: relative; flex: 0 0 auto; width: 100%; aspect-ratio: 3 / 4; box-sizing: border-box; border-radius: 14px; overflow: hidden;
    display: grid; place-items: center; border: 1px solid var(--oppai-border); background-color: #6b6b6b;
    background-image: linear-gradient(45deg, #5a5a5a 25%, transparent 25%), linear-gradient(-45deg, #5a5a5a 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #5a5a5a 75%), linear-gradient(-45deg, transparent 75%, #5a5a5a 75%);
    background-size: 16px 16px; background-position: 0 0, 0 8px, 8px -8px, -8px 0;
  }
  .focus-art img { width: 100%; height: 100%; object-fit: contain; display: block; }
  /* As she appears in chat: standing in a warm room, her speech box above her in the
     peach pixel style the app's own pop-up uses (app.ts). */
  .focus-art.scene {
    background: radial-gradient(120% 70% at 50% 100%, #5b3a2c 0%, transparent 60%),
      linear-gradient(180deg, #2a2233 0%, #3d2b36 55%, #4a3128 100%);
  }
  .focus-art.scene img { align-self: end; height: 82%; object-position: bottom center; filter: drop-shadow(0 6px 8px rgba(0,0,0,.45)); }
  .scene-speech {
    position: absolute; top: 12px; left: 12px; right: 12px; padding: 10px 12px 13px; border: 3px solid #29262a; border-radius: 6px;
    background: linear-gradient(180deg, #f7c994, #f3bd86); color: #35282a;
    box-shadow: inset 0 0 0 2px rgba(255,225,183,.42), inset 0 -5px 0 #c96f5b, 0 3px 0 #c96f5b;
    font: 500 12px/1.45 ui-monospace, "Cascadia Mono", Consolas, monospace; letter-spacing: .02em;
    animation: oppai-fade-in-up 0.25s ease both;
  }
  .focus-empty { display: grid; place-items: center; gap: 6px; color: rgba(255,255,255,.75); font-size: 12px; text-align: center; }
  .focus-empty .material-symbols-rounded { font-size: 30px; }
  .flip-btn {
    position: absolute; right: 8px; bottom: 8px; display: inline-flex; align-items: center; gap: 4px; height: 30px; padding: 0 11px 0 8px;
    border: none; border-radius: 15px; background: rgba(0,0,0,.6); backdrop-filter: blur(6px); color: #fff; font: inherit; font-size: 11.5px; font-weight: 650; cursor: pointer;
  }
  .flip-btn.on { background: var(--oppai-primary); color: var(--oppai-on-primary); }
  .flip-btn .material-symbols-rounded { font-size: 17px; }
  .heat-ladder { display: grid; grid-template-columns: repeat(5, 1fr); gap: 5px; }
  .rung {
    position: relative; padding: 0; border: 1.5px solid var(--oppai-border); border-radius: 9px; overflow: hidden; background: var(--oppai-bg);
    aspect-ratio: 3 / 4; cursor: pointer;
  }
  .rung img { width: 100%; height: 100%; object-fit: cover; object-position: top; display: block; }
  .rung-empty { position: absolute; inset: 4px; border: 1px dashed var(--oppai-border-strong); border-radius: 6px; }
  .rung.on { border-color: var(--oppai-primary); }
  .rung-label {
    position: absolute; left: 0; right: 0; bottom: 0; padding: 8px 2px 2px; font-size: 9px; font-weight: 700; color: #fff; text-align: center;
    background: linear-gradient(transparent, rgba(0,0,0,.7)); letter-spacing: 0.2px;
  }
  .focus-primary { display: grid; grid-template-columns: 1.5fr 1fr; gap: 6px; }
  .focus-primary .btn { justify-content: center; }
  .focus-tools { display: grid; grid-template-columns: repeat(auto-fill, minmax(58px, 1fr)); gap: 4px; }
  .tool {
    display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 8px 2px 6px; border: 1px solid var(--oppai-border); border-radius: 10px;
    background: transparent; color: var(--oppai-text-dim); font: inherit; font-size: 10.5px; font-weight: 600; cursor: pointer;
  }
  .tool .material-symbols-rounded { font-size: 19px; }
  .tool:hover:not(:disabled):not(.disabled) { background: var(--oppai-surface-2); color: var(--oppai-text); border-color: var(--oppai-border-strong); }
  .tool:disabled, .tool.disabled { opacity: 0.4; cursor: default; pointer-events: none; }
  .tool.danger:hover:not(:disabled) { color: var(--oppai-error, #f2b8b5); }
  .focus-desc { line-height: 1.5; }
  .focus-meta { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: center; color: var(--oppai-text-muted); font-size: 11px; }
  .focus-meta span { display: inline-flex; align-items: center; gap: 3px; }
  .link-btn { border: 0; background: none; padding: 0; color: var(--oppai-primary-bright); font: inherit; font-size: 11px; cursor: pointer; }
  .link-btn:disabled { opacity: 0.5; cursor: default; }
  .focus-prompt { display: grid; gap: 6px; }
  .focus-tag { font-size: 10px; font-weight: 700; letter-spacing: .55px; text-transform: uppercase; color: var(--oppai-text-muted); }
  .focus-tag.negative { color: var(--oppai-error, #f2b8b5); }
  .focus-prompt pre { margin: 0; padding: 8px; border-radius: 8px; background: var(--oppai-bg); font-size: 11px; line-height: 1.4; white-space: pre-wrap; overflow-wrap: anywhere; max-height: 220px; overflow: auto; }

  /* ── narrower screens ──────────────────────────────────────────────────── */
  @media (max-width: 1360px) {
    .create-shell.drawer-open.with-gallery { grid-template-columns: 72px 320px minmax(0, 1fr) 290px; }
    .sprite-shell.with-inspector { grid-template-columns: 330px minmax(0, 1fr); }
    .sprite-shell.with-inspector.with-focus { grid-template-columns: 330px minmax(0, 1fr) 300px; }
    .sprite-shell.with-focus { grid-template-columns: minmax(0, 1fr) 300px; }
    .head-label { display: none; }
    .head-btn { padding: 0 9px; }
  }
  /* Narrower than an inspector, a stage and a gallery side by side: the inspector
     floats over the stage instead of pushing it. */
  @media (max-width: 1180px) {
    .create-shell, .create-shell.drawer-open { grid-template-columns: 72px minmax(0, 1fr); position: relative; }
    .create-shell.with-gallery, .create-shell.drawer-open.with-gallery { grid-template-columns: 72px minmax(0, 1fr) 280px; }
    .create-shell.video.with-gallery { grid-template-columns: minmax(0, 1fr) 280px; }
    .create-drawer { position: absolute; z-index: 30; top: 0; bottom: 0; left: 72px; width: 340px; box-shadow: 18px 0 46px rgba(0,0,0,.42); }
    /* filter, not opacity: the drawer's entrance animation fills forwards and would
       hold its opacity at 1. */
    .create-shell.lora-dragging .create-drawer { filter: opacity(0.35); pointer-events: none; transition: filter 0.15s ease; }
    .sprite-shell.with-inspector.with-focus { grid-template-columns: 290px minmax(0, 1fr) 270px; }
    .gen-pill { max-width: 220px; }
    .sub-note { display: none; }
  }
  /* Below this the square panel is what goes when the recipe is out: the recipe can be
     put away with [ and the panel comes back, but three columns would leave the board
     no room to show a row. */
  @media (max-width: 1000px) and (min-width: 901px) {
    .sprite-shell.with-inspector.with-focus { grid-template-columns: 290px minmax(0, 1fr); }
    .sprite-shell.with-inspector.with-focus .studio-focus { display: none; }
  }
  /* A short window: the session row thinner, so the picture keeps the height. */
  @media (max-height: 880px) and (min-width: 901px) {
    .session-strip { padding: 5px 12px; gap: 8px; }
    .strip-thumb, .strip-live, .strip-q { width: 42px; height: 52px; border-radius: 8px; }
    .strip-label { width: 44px; }
    .vb { height: 32px; min-width: 32px; }
    .composer .prompt-field textarea { min-height: 62px; }
  }
  /* A tablet or a phone: one column that scrolls, the panels as sheets or below. */
  @media (max-width: 900px) {
    :host, .wrap { overflow: visible; height: auto; }
    .studio, .workspace { height: auto; min-height: 100%; }
    .studio-head { flex-wrap: wrap; position: sticky; top: 0; height: auto; gap: 6px; padding: 8px 10px; }
    .toast { top: 12px; bottom: auto; }
    .mode-switch { order: -2; flex: 1 1 100%; }
    .mode { flex: 1; justify-content: center; padding: 0 8px; }
    .sub-switch { order: -1; margin: 0; }
    .gen-pill { max-width: none; flex: 1 1 auto; }
    .head-spacer { display: none; }
    /* No panels to toggle beside a one-column page, and no keyboard to list. */
    .head-sep, .head-icon { display: none; }
    .create-shell, .create-shell.drawer-open, .create-shell.with-gallery, .create-shell.drawer-open.with-gallery,
    .create-shell.video, .create-shell.video.with-gallery { display: flex; flex-direction: column; }
    .create-rail {
      flex-direction: row; gap: 2px; padding: 6px 8px; overflow-x: auto; flex: none;
      border-right: 0; border-bottom: 1px solid var(--oppai-border-strong);
    }
    .rail-tab { flex: 1 0 58px; }
    .rail-icon { width: 44px; height: 28px; font-size: 20px; }
    .rail-badge { right: calc(50% - 24px); }
    .create-stage { min-height: 0; }
    .canvas-wrap { flex: none; }
    .viewer-stage { flex: none; height: 56vh; padding: 10px; }
    .view-img { max-width: calc(100cqw - 20px); max-height: calc(100cqh - 70px); }
    .view-nav { display: none; }
    .view-cap { left: 8px; top: 8px; }
    .view-bar { max-width: 100%; }
    .vb-sep { display: none; }
    /* A phone has no width for the tools beside the session: they take the row above it. */
    .session-strip { flex-wrap: wrap; }
    .session-strip > .view-bar { order: -1; flex: 1 1 100%; margin: 0; }
    /* The composer stays in reach while the page scrolls under it: on a phone the
       picture fills the screen, and the prompt is what is changed next. */
    .prompt-dock { position: sticky; bottom: 0; z-index: 6; padding: 8px 10px 10px; background: linear-gradient(to bottom, transparent, var(--oppai-bg) 22%); }
    .create-gallery { min-height: 440px; border-left: 0; border-top: 1px solid var(--oppai-border-strong); }
    .drawer-scrim { display: block; position: fixed; inset: 0; z-index: 90; background: rgba(0,0,0,.5); animation: oppai-fade-in 0.2s ease both; }
    .create-drawer {
      position: fixed; z-index: 91; left: 0; right: 0; top: auto; bottom: 0; width: auto; max-height: 78vh; border: 1px solid var(--oppai-border-strong);
      border-bottom: 0; border-radius: 24px 24px 0 0; box-shadow: 0 -18px 50px rgba(0,0,0,.5); animation: studio-sheet-in 0.28s var(--oppai-ease-emphasized) both;
    }
    @keyframes studio-sheet-in { from { transform: translateY(40px); opacity: 0; } to { transform: none; opacity: 1; } }
    .drawer-scroll { padding-bottom: calc(24px + env(safe-area-inset-bottom, 0px)); }
    .create-drawer .cards { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
    .composer { gap: 7px; padding: 9px; border-radius: 18px; }
    .composer-fields { grid-template-columns: 1fr; gap: 6px; }
    /* A row to scroll sideways, one person tall: stacked, three of them pushed the
       canvas off a phone's screen. */
    .people-grid {
      grid-template-columns: none; grid-auto-flow: column; grid-auto-columns: 86%;
      overflow-x: auto; scroll-snap-type: x mandatory; overscroll-behavior-x: contain; padding-bottom: 2px;
    }
    .people-grid > .pass-card { scroll-snap-align: start; }
    .people-hint { display: none; }
    .people-seg { display: none; }
    .people-cycle { display: inline-flex; }
    .composer .prompt-field textarea { min-height: 58px; font-size: 14px; }
    .composer .prompt-field.negative textarea { min-height: 40px; height: 40px; padding-top: 22px; }
    .composer .field-tag { top: 6px; }
    .prompt-summary { display: none; }
    .composer .mic { width: 36px; height: 36px; }
    .count-seg button { width: 30px; }
    .composer .generate { flex: 1 1 auto; min-width: 0; height: 44px; margin: 0; padding: 0 14px; }
    .queue-btn { height: 44px; padding: 0 11px; }
    .queue-label { display: none; }
    .session-strip { padding: 6px 10px; }
    .strip-label { display: none; }
    .queue-pop { position: fixed; top: auto; bottom: 12px; left: 12px; right: 12px; width: auto; }

    .sprite-shell, .sprite-shell.with-inspector, .sprite-shell.with-focus, .sprite-shell.with-inspector.with-focus { display: flex; flex-direction: column; }
    .sprite-shell .workbench { order: -2; }
    .sprite-shell .studio-focus, .sprite-shell.with-inspector.with-focus .studio-focus { display: flex; order: -1; border-left: 0; border-top: 1px solid var(--oppai-border-strong); }
    .sprite-inspector { border-right: 0; border-top: 1px solid var(--oppai-border-strong); }
    .ins-tabs { background: var(--oppai-surface); }
    .panel-scroll { overflow: visible; }
    .canvas-stage.sheet { max-height: 62vh; overflow: auto; }
    .studio-wardrobe { padding: 14px 12px 40px; }
  }
`;
