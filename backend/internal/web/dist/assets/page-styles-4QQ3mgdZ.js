import{i as n}from"./index-CIL7RzoI.js";const a={typing:{seconds:2,loop:!0,motion:"Her thumbs tap quickly across her phone's screen"},reading:{seconds:4,loop:!0,motion:"Her eyes move slowly along the lines of the page"},gaming:{seconds:3,loop:!0,motion:"Her thumbs work the buttons of the controller"},lounging:{seconds:4,loop:!0,motion:"She shifts lazily and settles back into the sofa"},drinking:{seconds:3,loop:!0,motion:"She lifts the mug, takes a slow sip and lowers it"},eating:{seconds:3,loop:!0,motion:"She takes a bite and chews contentedly"},stretching:{seconds:3,loop:!0,motion:"She stretches her arms higher, then eases back down"},napping:{seconds:4,loop:!0,motion:"She sleeps, her shoulders rising and falling with slow breaths"},dancing:{seconds:2,loop:!0,motion:"She sways her hips and shoulders to the music"},tidying:{seconds:3,loop:!0,motion:"She slides something onto the shelf and straightens it"},drawing:{seconds:3,loop:!0,motion:"Her pencil moves in small strokes across the sketchbook"},waving:{seconds:2,loop:!0,motion:"She waves her raised hand from side to side"},undressing:{seconds:3,loop:!0,motion:"She slowly slides her clothing down off her shoulder"},teasing:{seconds:3,loop:!0,motion:"She sways her hips slowly, watching the camera"},touching:{seconds:3,loop:!0,motion:"Her hands move slowly over her body"},rubbing:{seconds:3,loop:!0,motion:"Her hand rubs slowly between her thighs"},fingering:{seconds:3,loop:!0,motion:"Her fingers move rhythmically and her hips rock"},spread:{seconds:3,loop:!0,motion:"Her thighs tremble slightly as she holds the pose"},vibrator:{seconds:3,loop:!0,motion:"Her thighs quiver and press together around the vibrator"},dildo:{seconds:3,loop:!0,motion:"She moves the toy slowly and rhythmically"},riding:{seconds:2,loop:!0,motion:"She rises and sinks rhythmically, hips rolling"},grinding:{seconds:2,loop:!0,motion:"Her hips roll forward and back against the pillow"},climax:{seconds:4,loop:!0,motion:"Her whole body shudders and tenses in waves"},afterglow:{seconds:4,loop:!0,motion:"She lies still, breathing slowly, eyes drifting shut"},talking:{seconds:2,loop:!0,motion:"She talks to the camera, her lips moving as she speaks"},greeting:{seconds:2,loop:!1,motion:"She looks up, smiles and gives a small wave hello"},startled:{seconds:1,loop:!1,motion:"She flinches back in surprise"}},s="She holds her pose and moves only a little";function l(e,o){const r=a[o];if(!r)return e;const t=e.prompt.split(new RegExp("(?<=[.!?])\\s+")).filter(i=>i.replace(/[.!?]+$/,"").trim().toLowerCase()!==s.toLowerCase()).join(" ").trim();return{...e,seconds:r.seconds,makeLoop:r.loop,prompt:t?`${r.motion}. ${t}`:`${r.motion}.`}}function d(e){const o=a[e];return o?`${o.seconds} s, ${o.loop?"loops":"plays once"}`:""}const c=n`
  /* ── the bar across the top ─────────────────────────────────────────── */
  .page-top {
    height: 64px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 24px;
    box-sizing: border-box;
    border-bottom: 1px solid var(--oppai-border);
    background: var(--oppai-glass);
    backdrop-filter: blur(14px) saturate(1.2);
  }
  .page-title {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }
  .page-title .material-symbols-rounded { font-size: 22px; color: var(--oppai-primary); }
  .page-sub { font-size: 13px; color: var(--oppai-text-muted); white-space: nowrap; font-variant-numeric: tabular-nums; }
  .page-spacer { flex: 1; min-width: 4px; }

  /* ── tools: outlined, quiet until pointed at; lit when on ───────────── */
  .tool {
    height: 36px;
    padding: 0 12px;
    border-radius: 10px;
    border: 1px solid var(--oppai-border-strong);
    background: none;
    color: var(--oppai-text-dim);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font: inherit;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    flex-shrink: 0;
    text-decoration: none;
    white-space: nowrap;
    transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
  }
  .tool:hover:not(:disabled) { color: var(--oppai-text); background: var(--oppai-surface); }
  .tool:disabled { opacity: 0.5; cursor: default; }
  .tool.icon { width: 36px; padding: 0; }
  .tool.bare { border-color: transparent; }
  .tool .material-symbols-rounded { font-size: 19px; }
  .tool.on, .tool[aria-pressed="true"] { background: var(--oppai-selected); color: var(--oppai-primary-bright); border-color: transparent; }
  .tool.danger { color: var(--oppai-error); }

  /* The one thing to do on a page. */
  .primary-btn {
    height: 42px;
    padding: 0 18px;
    border-radius: 12px;
    border: none;
    background: var(--oppai-primary);
    color: var(--oppai-on-primary);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font: inherit;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    flex-shrink: 0;
    box-shadow: 0 6px 18px color-mix(in srgb, var(--oppai-primary) 20%, transparent);
    transition: filter 0.15s ease, transform 0.2s var(--oppai-ease-spring);
  }
  .primary-btn:hover:not(:disabled) { filter: brightness(1.06); transform: translateY(-1px); }
  .primary-btn:active:not(:disabled) { transform: scale(0.97); }
  .primary-btn:disabled { opacity: 0.55; cursor: default; box-shadow: none; }
  .primary-btn .material-symbols-rounded { font-size: 20px; }

  /* ── chips: the picked one inverted, as the library's are ───────────── */
  .chip {
    height: 32px;
    padding: 0 13px;
    border-radius: 999px;
    border: 1px solid var(--oppai-border-strong);
    background: none;
    color: var(--oppai-text-dim);
    font: inherit;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
    flex-shrink: 0;
    transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
  }
  .chip:hover { color: var(--oppai-text); border-color: var(--oppai-text-muted); }
  .chip .material-symbols-rounded { font-size: 17px; }
  .chip.on, .chip[aria-pressed="true"] { background: var(--oppai-text); color: var(--oppai-bg); border-color: var(--oppai-text); }
  .chip.small { height: 28px; padding: 0 11px; font-size: 12px; }
  .chip-row { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; padding: 1px 0; min-width: 0; }
  .chip-row::-webkit-scrollbar { display: none; }
  /* A tag: smaller and flat, not a control. */
  .tag {
    display: inline-flex; align-items: center; height: 24px; padding: 0 9px; border-radius: 999px;
    background: var(--oppai-surface-2); color: var(--oppai-text-dim); font-size: 12px; white-space: nowrap;
  }

  /* ── a search box, as the library's top bar has ─────────────────────── */
  .searchbox {
    flex: 1;
    min-width: 0;
    height: 40px;
    background: var(--oppai-surface);
    border: 1px solid var(--oppai-border);
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 12px;
    box-sizing: border-box;
    transition: border-color 0.15s ease, background 0.15s ease;
  }
  .searchbox:focus-within { border-color: color-mix(in srgb, var(--oppai-primary) 55%, transparent); background: var(--oppai-surface-2); }
  .searchbox > .material-symbols-rounded { font-size: 20px; color: var(--oppai-text-muted); }
  .searchbox input {
    flex: 1; min-width: 0; background: none; border: none; outline: none; color: var(--oppai-text); font: inherit; font-size: 14px;
  }
  .searchbox input::-webkit-search-cancel-button { display: none; }

  /* A select dressed as a tool. */
  select.tool { padding: 0 30px 0 12px; appearance: none; -webkit-appearance: none; background-image:
      linear-gradient(45deg, transparent 50%, currentColor 50%), linear-gradient(135deg, currentColor 50%, transparent 50%);
    background-position: calc(100% - 16px) 15px, calc(100% - 11px) 15px; background-size: 5px 5px; background-repeat: no-repeat; }
  select.tool option { background: var(--oppai-surface-2); color: var(--oppai-text); }

  /* ── a segmented switch: two to four places, one lit ────────────────── */
  .seg {
    display: inline-flex; gap: 2px; padding: 3px; border-radius: 12px; flex-shrink: 0;
    background: var(--oppai-surface); border: 1px solid var(--oppai-border);
  }
  .seg > button {
    height: 30px; padding: 0 12px; border: none; border-radius: 9px; background: none; color: var(--oppai-text-muted);
    font: inherit; font-size: 13px; font-weight: 500; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap;
    transition: background 0.15s ease, color 0.15s ease;
  }
  .seg > button:hover { color: var(--oppai-text); }
  .seg > button.on, .seg > button[aria-selected="true"], .seg > button[aria-checked="true"] {
    background: var(--oppai-selected); color: var(--oppai-text); font-weight: 600;
  }
  .seg > button.on .material-symbols-rounded, .seg > button[aria-selected="true"] .material-symbols-rounded,
  .seg > button[aria-checked="true"] .material-symbols-rounded { color: var(--oppai-primary); }
  .seg .material-symbols-rounded { font-size: 18px; }

  /* ── sections of a page ─────────────────────────────────────────────── */
  .sec-head { display: flex; align-items: center; gap: 10px; margin: 0 0 12px; flex-wrap: wrap; }
  .sec-head h2, .sec-head h3 { margin: 0; font-size: 17px; font-weight: 600; letter-spacing: -0.005em; }
  .sec-head .page-sub { font-size: 13px; }
  .kicker {
    font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--oppai-text-muted);
  }
  .panel {
    background: var(--oppai-surface); border: 1px solid var(--oppai-border); border-radius: var(--oppai-radius-lg, 20px);
  }
  .empty-note { color: var(--oppai-text-muted); font-size: 13px; padding: 36px 0; text-align: center; line-height: 1.5; }
  .err-note { color: var(--oppai-error); font-size: 13px; margin: 0 0 12px; }

  @media (max-width: 720px) {
    .page-top { padding: 0 12px; gap: 8px; }
    .page-title { font-size: 18px; }
  }
`;export{a as M,d as a,l as m,c as p};
