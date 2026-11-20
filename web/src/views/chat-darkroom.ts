import { css } from "lit";

/**
 * Chat in the darkroom: the library's ink and its one coral accent, its 64-pixel bar,
 * its search box, its lit row with the coral mark, its outlined tools.
 *
 * Chat was drawn on Material's palette through a layer of its own names (--side, --main,
 * --bubble, --accent…), which is why it read as a second app beside the library after
 * the shell moved to the darkroom. Those names are kept — eight hundred rules read them
 * — and pointed at the darkroom's tokens here, with the shapes that differed redrawn
 * after them. This sheet comes last in chat's styles, so it wins wherever the two meet;
 * the rules it does not touch are chat's own and still right.
 */
export const chatDarkroom = css`
  :host {
    font: 400 15px/1.45 "Roboto", system-ui, -apple-system, sans-serif;
    --side: var(--oppai-nav);
    --main: var(--oppai-bg);
    --hover: var(--oppai-nav-hover);
    --input: var(--oppai-surface);
    --bubble: var(--oppai-surface-2);
    --muted: var(--oppai-text-muted);
    --line: var(--oppai-border);
    --accent: var(--oppai-primary);
    --on-accent: var(--oppai-on-primary);
    --bar: 64px;
  }

  /* Icon buttons are the shell's bare tools: squared, quiet until pointed at. */
  .icon-btn { border-radius: 10px; width: 36px; height: 36px; color: var(--oppai-text-dim); }
  .icon-btn:hover, .icon-btn.on { background: var(--oppai-surface); color: var(--oppai-text); }
  .icon-btn.on { color: var(--oppai-primary-bright); background: var(--oppai-selected); }

  /* ── the list ── */
  .side { background: var(--oppai-nav); border-right-color: var(--oppai-border); }
  .side-head { padding: 0 10px 0 20px; gap: 6px; border-bottom: 1px solid transparent; }
  .side-head h1 { font-size: 20px; font-weight: 600; letter-spacing: -0.01em; }
  .search {
    margin: 2px 12px 12px; height: 40px; padding: 0 12px; box-sizing: border-box; border-radius: 12px; gap: 10px;
    background: var(--oppai-surface); border: 1px solid var(--oppai-border); color: var(--oppai-text-muted);
    transition: border-color 0.15s ease, background 0.15s ease;
  }
  .search:focus-within { border-color: color-mix(in srgb, var(--oppai-primary) 55%, transparent); background: var(--oppai-surface-2); }
  .search input { font-size: 14px; }
  .chats, .friends { padding: 0 12px 12px; }
  .chat-row { border-radius: 10px; padding: 8px 10px; grid-template-columns: 46px minmax(0, 1fr) auto; gap: 1px 12px; }
  .chat-row:hover { background: var(--oppai-nav-hover); }
  .chat-avatar { width: 46px; height: 46px; }
  .chat-name { font-weight: 600; font-size: 14.5px; }
  .chat-preview { color: var(--oppai-text-muted); }
  /* Where you are: the shell's lit row, with the coral mark at its edge. */
  .chat-wrap.on .chat-row { background: var(--oppai-selected); }
  .chat-wrap.on::before {
    content: ""; position: absolute; left: -12px; top: 14px; bottom: 14px; width: 3px; border-radius: 0 3px 3px 0;
    background: var(--oppai-primary); z-index: 1;
  }
  .chat-wrap.on .chat-name { color: var(--oppai-text); }
  .pick { border-radius: 10px; }
  .pick-cat, .nav-cat { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; color: var(--oppai-text-muted); }
  .dropzone { border-color: var(--oppai-border-strong); border-radius: var(--oppai-radius-md); background: transparent; }
  .dropzone .material-symbols-rounded { color: var(--oppai-primary); }

  /* ── the open chat ── */
  .main { background: var(--oppai-bg); }
  .top { padding: 0 14px 0 20px; gap: 12px; border-bottom-color: var(--oppai-border); background: var(--oppai-glass); backdrop-filter: blur(14px); }
  .top .name { font-weight: 600; font-size: 16px; }
  .top-actions { gap: 4px; }
  .quick-mode { border-radius: 10px; background-color: var(--oppai-surface); border: 1px solid var(--oppai-border-strong); }
  .day { background: transparent; border: 1px solid var(--oppai-border); color: var(--oppai-text-muted); font-weight: 500; }
  .intro h2 { font-weight: 650; }
  /* Her side on the raised ink, yours lit with the accent rather than filled with it: a
     screen of coral bubbles was the one colour everywhere, which is no longer a signal. */
  .bubble { background: var(--oppai-surface-2); }
  .msg.mine .bubble {
    background: color-mix(in srgb, var(--oppai-primary) 24%, var(--oppai-surface-2));
    color: var(--oppai-text);
  }
  .msg.mine .text .speech { color: var(--oppai-primary-bright); }
  .msg.mine .text code { background: color-mix(in srgb, var(--oppai-bg) 40%, transparent); }
  .msg.mine .quote { border-left-color: var(--oppai-primary); background: color-mix(in srgb, var(--oppai-bg) 30%, transparent); }
  .msg.mine .quote strong { color: var(--oppai-primary-bright); }
  .reaction, .react-row { background: var(--oppai-surface-2); border-color: var(--oppai-border-strong); }

  /* ── the composer: the library's search box, grown ── */
  form.composer-form { padding: 10px 18px 14px; border-top: none; background: var(--oppai-bg); }
  .box {
    border-radius: 16px; background: var(--oppai-surface); border: 1px solid var(--oppai-border); padding: 6px 6px 6px 8px;
    transition: border-color 0.15s ease, background 0.15s ease;
  }
  .box:focus-within { border-color: color-mix(in srgb, var(--oppai-primary) 55%, transparent); background: var(--oppai-surface-2); }
  .attach-btn { border-radius: 10px; color: var(--oppai-text-dim); }
  .attach-btn:hover { background: var(--oppai-surface-2); color: var(--oppai-text); }
  .send {
    width: 44px; height: 44px; flex: 0 0 44px; border-radius: 12px;
    box-shadow: 0 6px 18px color-mix(in srgb, var(--oppai-primary) 20%, transparent);
  }
  .send:disabled { box-shadow: none; }
  .format-help { color: var(--oppai-text-muted); font-size: 10.5px; padding: 6px 8px 0; }
  .attachment { border-radius: var(--oppai-radius-md); background: var(--oppai-surface); }

  /* ── her portrait ── */
  .stage { background: var(--oppai-nav); border-left-color: var(--oppai-border); }

  /* ── settings opened over the chat ── */
  .settings-nav { background: var(--oppai-nav); padding: 14px 10px; }
  .nav-row { border-radius: 10px; color: var(--oppai-text-dim); }
  .nav-row:hover { background: var(--oppai-nav-hover); color: var(--oppai-text); }
  .nav-row.on { background: var(--oppai-selected); color: var(--oppai-text); font-weight: 600; }
  .nav-row.on .material-symbols-rounded { color: var(--oppai-primary); }
  .settings-head strong { font-size: 20px; font-weight: 600; }
  .group { border-radius: var(--oppai-radius-md); background: var(--oppai-surface); border-color: var(--oppai-border); }
  .group h3 { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; }
  .primary, .secondary, .danger { border-radius: 10px; }
  .primary { background: var(--oppai-primary); color: var(--oppai-on-primary); border-color: transparent; font-weight: 600; }
  .mem-list li { background: var(--oppai-surface); border-radius: 10px; }

  @media (max-width: 900px) {
    .side-head { padding: 0 8px 0 16px; }
    form.composer-form { padding: 8px 10px 10px; }
  }
  /* Chat's own phone rules, which the ones above would otherwise win over. */
  @media (max-width: 700px) {
    .top { padding-left: 6px; gap: 8px; }
    .settings-nav { padding: 8px; }
    .nav-row { border-radius: 999px; }
  }
`;
