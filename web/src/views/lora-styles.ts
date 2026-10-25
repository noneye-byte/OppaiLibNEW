import { css } from "lit";

/**
 * The Train screen's pieces — the wizard, the picture gatherer, the comparison —
 * are separate elements with shadow roots of their own, so the controls they share
 * are written once here rather than drifting apart in three copies.
 */
export const loraStyles = css`
  .btn {
    border: none; background: var(--oppai-surface-2); color: var(--oppai-text); border-radius: 999px;
    font: inherit; font-size: 13px; padding: 8px 16px; cursor: pointer; min-height: 36px; box-sizing: border-box;
    display: inline-flex; align-items: center; justify-content: center; gap: 6px; white-space: nowrap;
    transition: background 0.15s ease, opacity 0.15s ease;
  }
  .btn:hover:not(:disabled) { background: color-mix(in srgb, var(--oppai-surface-2) 80%, var(--oppai-text) 8%); }
  .btn:disabled { opacity: 0.45; cursor: default; }
  .btn.primary { background: var(--oppai-primary); color: var(--oppai-on-primary, #1d1b20); font-weight: 600; }
  .btn.primary:hover:not(:disabled) { background: var(--oppai-primary-bright, var(--oppai-primary)); }
  .btn.tonal { background: var(--oppai-primary-container); color: var(--oppai-on-accent, var(--oppai-text)); }
  .btn.ghost { background: transparent; color: var(--oppai-text-dim); }
  .btn.ghost:hover:not(:disabled) { background: var(--oppai-surface-2); color: var(--oppai-text); }
  .btn.danger { color: var(--oppai-error, #f2b8b5); }
  .btn.small { padding: 5px 12px; min-height: 30px; font-size: 12px; }
  .btn .material-symbols-rounded { font-size: 18px; }
  .btn.small .material-symbols-rounded { font-size: 16px; }

  .card {
    background: var(--oppai-surface); border: 1px solid var(--oppai-border); border-radius: var(--oppai-radius, 16px);
    padding: 18px;
  }
  .card + .card { margin-top: 14px; }
  .card h3 { margin: 0 0 4px; font-size: 16px; display: flex; align-items: center; gap: 8px; }
  .card h3 .material-symbols-rounded { font-size: 20px; color: var(--oppai-primary); }
  .card .sub { margin: 0 0 14px; font-size: 13px; color: var(--oppai-text-dim); line-height: 1.45; }

  label.field { display: block; font-size: 12px; font-weight: 600; color: var(--oppai-text-dim); margin: 14px 0 6px; }
  label.field:first-child { margin-top: 0; }
  input[type="text"], input[type="number"], input[type="search"], select, textarea {
    width: 100%; box-sizing: border-box; background: var(--oppai-bg, #141218);
    border: 1px solid var(--oppai-border-strong); border-radius: 12px; color: var(--oppai-text);
    font: inherit; font-size: 14px; padding: 9px 12px; outline: none; min-height: 40px;
  }
  textarea { resize: vertical; min-height: 64px; line-height: 1.4; }
  input:focus, select:focus, textarea:focus { border-color: var(--oppai-primary); }
  .row { display: flex; gap: 12px; flex-wrap: wrap; }
  .row > * { flex: 1; min-width: 140px; }

  .seg { display: inline-flex; background: var(--oppai-bg, #141218); border-radius: 999px; padding: 3px; gap: 2px; flex-wrap: wrap; }
  .seg button {
    border: none; background: none; color: var(--oppai-text-dim); font: inherit; font-size: 13px;
    padding: 6px 14px; border-radius: 999px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;
  }
  .seg button .material-symbols-rounded { font-size: 17px; }
  .seg button.on { background: var(--oppai-surface-2); color: var(--oppai-text); font-weight: 600; }

  .check { display: flex; align-items: flex-start; gap: 10px; font-size: 13px; margin-top: 12px; cursor: pointer; }
  .check input { margin-top: 2px; accent-color: var(--oppai-primary); width: 16px; height: 16px; flex: none; }
  .check small { display: block; color: var(--oppai-text-dim); font-size: 12px; margin-top: 2px; line-height: 1.4; }

  .note { font-size: 12px; color: var(--oppai-text-dim); line-height: 1.5; margin-top: 8px; }
  .muted { color: var(--oppai-text-muted, var(--oppai-text-dim)); }
  .banner {
    display: flex; gap: 10px; align-items: flex-start;
    background: color-mix(in srgb, var(--oppai-error, #f2b8b5) 16%, transparent);
    color: var(--oppai-text); border-radius: 12px; padding: 10px 12px; font-size: 13px; margin: 10px 0; line-height: 1.45;
  }
  .banner .material-symbols-rounded { font-size: 18px; flex: none; }
  .banner.info { background: color-mix(in srgb, var(--oppai-primary) 12%, transparent); }
  .banner.good { background: color-mix(in srgb, #7fcf8a 16%, transparent); }

  .bar { height: 6px; border-radius: 3px; background: var(--oppai-surface-2); overflow: hidden; }
  .bar > div { height: 100%; background: var(--oppai-primary); transition: width 0.6s ease; border-radius: 3px; }
  .bar.unknown > div { width: 30%; animation: slide 1.4s ease-in-out infinite; }
  @keyframes slide { from { margin-left: -30%; } to { margin-left: 100%; } }

  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip {
    border: 1px solid var(--oppai-border-strong); background: transparent; color: var(--oppai-text);
    border-radius: 999px; font: inherit; font-size: 12px; padding: 4px 10px; cursor: pointer;
    display: inline-flex; align-items: center; gap: 4px; line-height: 1.3;
  }
  .chip b { color: var(--oppai-text-dim); font-weight: 400; }
  .chip.out { text-decoration: line-through; color: var(--oppai-text-dim); border-style: dashed; }
  .chip.manual { border-color: var(--oppai-primary); }
  .chip .material-symbols-rounded { font-size: 14px; }

  .picks { display: grid; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 8px; }
  .pick {
    position: relative; border: none; padding: 0; background: var(--oppai-surface-2); border-radius: 12px;
    overflow: hidden; aspect-ratio: 1; cursor: pointer; display: block; width: 100%;
    outline: 2px solid transparent; outline-offset: -2px; transition: outline-color 0.12s ease, opacity 0.12s ease;
  }
  .pick img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .pick.on { outline-color: var(--oppai-primary); }
  .pick.off img { opacity: 0.35; filter: grayscale(0.6); }
  .pick .mark {
    position: absolute; top: 6px; right: 6px; width: 24px; height: 24px; border-radius: 50%;
    background: rgba(0, 0, 0, 0.55); color: #fff; display: grid; place-items: center;
  }
  .pick.on .mark { background: var(--oppai-primary); color: var(--oppai-on-primary, #1d1b20); }
  .pick .mark .material-symbols-rounded { font-size: 16px; }
  .pick .badge {
    position: absolute; left: 6px; bottom: 6px; font-size: 10px; padding: 2px 6px; border-radius: 999px;
    background: rgba(0, 0, 0, 0.6); color: #fff;
  }

  .empty { text-align: center; color: var(--oppai-text-dim); padding: 36px 16px; font-size: 14px; line-height: 1.55; }
  .empty .material-symbols-rounded { font-size: 40px; display: block; margin-bottom: 8px; color: var(--oppai-text-muted, var(--oppai-text-dim)); }

  @media (max-width: 600px) {
    .card { padding: 14px; }
    .picks { grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: 6px; }
  }
`;
