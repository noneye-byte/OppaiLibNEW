import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { iconStyles, motionStyles } from "../theme.js";
import { api, type ClipParams, type ClipWorkflow, type GenerateResult } from "../api.js";
import { CLIP_ASPECTS, CLIP_SIDES, clipFrames, clipSize, type ClipAspect } from "../clip-shape.js";

/**
 * The Video drawer: a few seconds of moving picture, from words or from a still.
 *
 * Neither generator behind the studio makes video, so this is ComfyUI's work, through
 * the two workflows set up in Settings → Image generation → Video (api/gen_clips.go).
 * The drawer shows a control only for what the workflow has a placeholder for — a
 * length slider over a workflow with its frame count written in would move nothing.
 *
 * A clip takes minutes, and the drawer is one of several on the rail, so the run is
 * not the drawer's: it lives in `session` below, and goes on while the drawer is shut.
 * What comes back is a preview like a picture's, kept on the server for a few hours
 * and in the library only once saved.
 */

/** A picture a clip starts from, as Animate hands it over. */
export interface ClipPicture {
  url: string;
  name: string;
  width: number;
  height: number;
  /** Its name in the studio's gallery, which the server reads rather than being sent. */
  gallery?: string;
}

interface ClipRun {
  jobId: string;
  from: "image" | "text";
  prompt: string;
  /** The still it started from, shown while it runs. */
  thumb?: string;
  percent: number;
  done: boolean;
  error?: string;
  clip?: { id: string; mime: string; seed: number };
  /** The library row once saved. */
  savedId?: number;
  saving?: boolean;
}

/** What the drawer was left at, and its runs: kept for the page, not the drawer. */
const session = {
  from: "image" as "image" | "text",
  picture: null as ClipPicture | null,
  prompt: "",
  negative: "",
  aspect: "portrait" as ClipAspect,
  long: 832,
  seconds: 5,
  fps: 16,
  steps: 20,
  runs: [] as ClipRun[],
};

const listeners = new Set<() => void>();
function changed() {
  for (const fn of listeners) fn();
}

/** Calls fn whenever the clips change; returns the unsubscribe. */
export function onClipsChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** How many clips are being made, for the rail's badge. */
export function clipsRunning(): number {
  return session.runs.filter((r) => !r.done).length;
}

/** Makes a picture the one the next clip starts from. */
export function animatePicture(pic: ClipPicture) {
  session.picture = pic;
  session.from = "image";
  changed();
}

/** When the drawer is not shown, so the length still has a frame rate to count in. */
const ASSUMED_FPS = 16;

@customElement("oppai-clip-panel")
export class OppaiClipPanel extends LitElement {
  /** The workflows set up, from the studio's status. */
  @property({ attribute: false }) clips: { image?: ClipWorkflow; text?: ClipWorkflow } = {};
  @state() private negOpen = false;
  @state() private error = "";
  private unsubscribe?: () => void;

  static styles = [
    iconStyles,
    motionStyles,
    css`
      :host { display: block; color: var(--oppai-text); }
      button, textarea, select, input { font: inherit; }
      .k {
        display: flex; align-items: center; gap: 8px; margin: 18px 0 8px; font-size: 11px; font-weight: 700;
        letter-spacing: 0.7px; text-transform: uppercase; color: var(--oppai-text-muted);
      }
      .k small { margin-left: auto; font-weight: 500; letter-spacing: 0; text-transform: none; font-variant-numeric: tabular-nums; }
      .note { font-size: 12px; line-height: 1.5; color: var(--oppai-text-muted); }
      .callout {
        display: flex; gap: 9px; padding: 11px 12px; border-radius: 12px; font-size: 12px; line-height: 1.5; color: var(--oppai-text-dim);
        background: color-mix(in srgb, var(--oppai-primary) 10%, var(--oppai-surface));
        border: 1px solid color-mix(in srgb, var(--oppai-primary) 30%, transparent);
      }
      .callout > .material-symbols-rounded { font-size: 18px; color: var(--oppai-primary-bright, var(--oppai-primary)); }
      .callout code { font-size: 11px; }
      .err { margin-top: 8px; font-size: 12px; color: var(--oppai-error, #f2b8b5); }

      .modes { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding: 4px; border-radius: 14px; background: var(--oppai-surface); }
      .modes button {
        display: flex; align-items: center; justify-content: center; gap: 6px; height: 36px; border-radius: 10px; border: none;
        background: none; color: var(--oppai-text-dim); font-size: 12.5px; font-weight: 600; cursor: pointer;
      }
      .modes button.on { background: var(--oppai-primary); color: var(--oppai-on-primary); }
      .modes button:disabled { opacity: 0.4; cursor: default; }
      .modes .material-symbols-rounded { font-size: 18px; }

      .picture { display: flex; gap: 10px; align-items: center; padding: 8px; border-radius: 14px; background: var(--oppai-surface); border: 1px solid var(--oppai-border); }
      .picture img { width: 64px; height: 64px; flex: none; border-radius: 10px; object-fit: cover; background: var(--oppai-surface-2); }
      .picture .nm { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; font-size: 12.5px; }
      .picture .nm b { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .picture .nm span { color: var(--oppai-text-muted); font-size: 11.5px; font-variant-numeric: tabular-nums; }
      .pick {
        display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 18px 12px; border-radius: 14px; text-align: center;
        border: 1.5px dashed var(--oppai-border-strong); color: var(--oppai-text-muted); font-size: 12px; line-height: 1.45;
      }
      .pick .material-symbols-rounded { font-size: 28px; opacity: 0.7; }
      .chip {
        display: inline-flex; align-items: center; gap: 4px; height: 30px; padding: 0 11px; border-radius: 15px; flex: none;
        border: 1px solid var(--oppai-border-strong); background: transparent; color: var(--oppai-text); font-size: 12px; cursor: pointer;
      }
      .chip:hover { border-color: var(--oppai-text-muted); }
      .chip.on { background: var(--oppai-primary-container); border-color: transparent; }
      .chip .material-symbols-rounded { font-size: 16px; }
      .icon-btn { width: 32px; height: 32px; border-radius: 16px; border: none; background: none; color: var(--oppai-text-muted); cursor: pointer; display: grid; place-items: center; flex: none; }
      .icon-btn:hover { background: var(--oppai-surface-2); color: var(--oppai-text); }
      input[type="file"] { display: none; }

      textarea {
        width: 100%; box-sizing: border-box; min-height: 74px; resize: vertical; padding: 9px 11px; border-radius: 12px;
        border: 1px solid var(--oppai-border-strong); background: var(--oppai-surface); color: var(--oppai-text); font-size: 13px; line-height: 1.45;
      }
      textarea:focus { outline: none; border-color: var(--oppai-primary); }
      .link { border: none; background: none; padding: 4px 0; color: var(--oppai-primary-bright, var(--oppai-primary)); font-size: 12px; cursor: pointer; }
      .row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
      select {
        height: 30px; padding: 0 8px; border-radius: 15px; border: 1px solid var(--oppai-border-strong);
        background: var(--oppai-surface); color: var(--oppai-text); font-size: 12px;
      }
      .slider { display: flex; align-items: center; gap: 10px; }
      .slider input { flex: 1; accent-color: var(--oppai-primary); }
      .slider b { min-width: 44px; text-align: right; font-size: 12.5px; font-variant-numeric: tabular-nums; }

      .make {
        width: 100%; margin-top: 18px; display: flex; align-items: center; justify-content: center; gap: 8px; height: 46px; border-radius: 15px;
        border: none; background: var(--oppai-primary); color: var(--oppai-on-primary); font-size: 14px; font-weight: 700; cursor: pointer;
      }
      .make:disabled { opacity: 0.5; cursor: default; }

      .runs { display: flex; flex-direction: column; gap: 10px; }
      .run {
        border-radius: 16px; overflow: hidden; background: var(--oppai-surface); border: 1px solid var(--oppai-border);
        animation: oppai-fade-in-up 0.2s var(--oppai-ease-emphasized, ease) both;
      }
      .run video, .run .still { display: block; width: 100%; max-height: 420px; background: #000; object-fit: contain; }
      .run .waiting { position: relative; aspect-ratio: 16 / 10; display: grid; place-items: center; background: var(--oppai-surface-2); overflow: hidden; }
      .run .waiting img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: blur(6px) brightness(0.6); }
      .run .waiting .pct { position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; color: #fff; font-size: 12px; }
      .run .waiting .pct b { font-size: 22px; font-variant-numeric: tabular-nums; }
      .bar { height: 3px; background: var(--oppai-surface-2); }
      .bar span { display: block; height: 100%; background: var(--oppai-primary); transition: width 0.6s ease; }
      .run-foot { display: flex; align-items: center; gap: 6px; padding: 8px 8px 8px 12px; }
      .run-foot .what { flex: 1; min-width: 0; font-size: 12px; color: var(--oppai-text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .run-err { padding: 10px 12px 0; font-size: 12px; line-height: 1.45; color: var(--oppai-error, #f2b8b5); }
      .primary { background: var(--oppai-primary); color: var(--oppai-on-primary); border-color: transparent; }
      a.chip { text-decoration: none; }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this.unsubscribe = onClipsChange(() => this.requestUpdate());
    // A drawer that opens on a mode with no workflow behind it opens on the other one.
    if (session.from === "image" && !this.clips.image && this.clips.text) session.from = "text";
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.unsubscribe?.();
  }

  private get workflow(): ClipWorkflow | undefined {
    return session.from === "image" ? this.clips.image : this.clips.text;
  }

  private takes(name: string): boolean {
    return !!this.workflow?.takes.includes(name);
  }

  private set<K extends keyof typeof session>(key: K, value: (typeof session)[K]) {
    session[key] = value;
    changed();
  }

  /** The size the clip is drawn at: the picture's shape, or the shape picked. */
  private size(): { width: number; height: number } {
    const pic = session.picture;
    if (session.from === "image" && pic) return clipSize(pic.width, pic.height, session.long);
    const a = CLIP_ASPECTS.find((x) => x.id === session.aspect) ?? CLIP_ASPECTS[0];
    return clipSize(a.w, a.h, session.long);
  }

  private fps(): number {
    return this.takes("fps") ? session.fps : ASSUMED_FPS;
  }

  private onFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => animatePicture({ url, name: file.name, width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => { URL.revokeObjectURL(url); this.error = "That file isn't a picture this browser can read."; };
    img.src = url;
  }

  private async make() {
    this.error = "";
    const from = session.from;
    const pic = session.picture;
    if (from === "image" && !pic) {
      this.error = "Pick a picture to animate first.";
      return;
    }
    if (from === "text" && !session.prompt.trim()) {
      this.error = "Say what the clip should show.";
      return;
    }
    const params: ClipParams = {
      jobId: `clip-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      from,
      prompt: session.prompt.trim(),
      negativePrompt: session.negative.trim(),
    };
    if (this.takes("width") || this.takes("height")) Object.assign(params, this.size());
    if (this.takes("frames")) params.frames = clipFrames(session.seconds, this.fps());
    if (this.takes("fps")) params.fps = session.fps;
    if (this.takes("steps")) params.steps = session.steps;
    const run: ClipRun = { jobId: params.jobId!, from, prompt: params.prompt, thumb: from === "image" ? pic?.url : undefined, percent: 0, done: false };
    try {
      if (from === "image" && pic) {
        if (pic.gallery) params.initGallery = pic.gallery;
        else params.initImage = await pictureDataURL(pic.url);
      }
    } catch (e) {
      this.error = (e as Error).message;
      return;
    }
    session.runs = [run, ...session.runs];
    changed();
    void runClip(run, params);
  }

  private async save(run: ClipRun) {
    if (!run.clip || run.saving || run.savedId) return;
    run.saving = true;
    changed();
    try {
      const title = run.prompt ? `Clip: ${run.prompt.slice(0, 80)}` : "Generated clip";
      run.savedId = (await api.saveGenerated({ id: run.clip.id, title, tags: ["clip"] })).id;
    } catch (e) {
      run.error = (e as Error).message;
    } finally {
      run.saving = false;
      changed();
    }
  }

  private dismiss(run: ClipRun) {
    // An unsaved clip is a few megabytes of the server's memory; let it go now.
    if (run.clip && !run.savedId) void api.deleteGenPreview(run.clip.id).catch(() => {});
    session.runs = session.runs.filter((r) => r !== run);
    changed();
  }

  render() {
    const { image, text } = this.clips;
    if (!image && !text) {
      return html`<div class="callout"><span class="material-symbols-rounded">movie</span>
        <span>Clips are made by ComfyUI. In <b>Settings → Image generation → Video</b>, give its address and paste the
        workflows you use (Wan, LTX, AnimateDiff), exported with <em>Save (API Format)</em> — one that starts from a
        picture, one from words, or both.</span></div>`;
    }
    const from = session.from;
    const size = this.size();
    const frames = clipFrames(session.seconds, this.fps());
    return html`
      <div class="modes" role="tablist">
        <button role="tab" class=${from === "image" ? "on" : ""} aria-selected=${from === "image" ? "true" : "false"} ?disabled=${!image}
          title=${image ? "Bring a picture to life" : "No picture-to-video workflow is set up"} @click=${() => this.set("from", "image")}>
          <span class="material-symbols-rounded">animation</span>From a picture</button>
        <button role="tab" class=${from === "text" ? "on" : ""} aria-selected=${from === "text" ? "true" : "false"} ?disabled=${!text}
          title=${text ? "Make a clip from words alone" : "No words-to-video workflow is set up"} @click=${() => this.set("from", "text")}>
          <span class="material-symbols-rounded">text_fields</span>From words</button>
      </div>

      ${from === "image" ? this.renderPicture() : nothing}

      ${this.takes("prompt") ? html`
        <div class="k">${from === "image" ? "What happens" : "What it shows"}</div>
        <textarea .value=${session.prompt} @input=${(e: Event) => { session.prompt = (e.target as HTMLTextAreaElement).value; }}
          placeholder=${from === "image"
            ? "She turns to the camera, smiles and waves; her hair moves in the breeze"
            : "A woman with silver hair in a red dress turns to the camera and waves, soft evening light"}></textarea>
        <div class="note">Say what moves, in sentences — video models read words better than tags.</div>
        ${this.takes("negative") ? (this.negOpen || session.negative ? html`
          <div class="k">What it should avoid</div>
          <textarea style="min-height:52px" .value=${session.negative} placeholder="blurry, distorted hands, flicker, static"
            @input=${(e: Event) => { session.negative = (e.target as HTMLTextAreaElement).value; }}></textarea>`
          : html`<button class="link" @click=${() => (this.negOpen = true)}>+ What it should avoid</button>`) : nothing}
      ` : nothing}

      ${this.takes("width") || this.takes("height") ? html`
        <div class="k">Size<small>${size.width}×${size.height}</small></div>
        <div class="row">
          ${from === "text" ? CLIP_ASPECTS.map((a) => html`<button class="chip ${session.aspect === a.id ? "on" : ""}"
            @click=${() => this.set("aspect", a.id)}>${a.label}</button>`) : nothing}
          <select aria-label="Longer side" .value=${String(session.long)} @change=${(e: Event) => this.set("long", Number((e.target as HTMLSelectElement).value))}>
            ${CLIP_SIDES.map((s) => html`<option value=${s} ?selected=${s === session.long}>${s}px long side</option>`)}
          </select>
        </div>
        ${from === "image" ? html`<div class="note" style="margin-top:6px">In the picture's shape. Bigger is slower, by a lot.</div>` : nothing}
      ` : nothing}

      ${this.takes("frames") ? html`
        <div class="k">Length<small>${frames} frames${this.takes("fps") ? "" : ` at ${ASSUMED_FPS} fps`}</small></div>
        <label class="slider">
          <input type="range" min="1" max="10" step="0.5" .value=${String(session.seconds)} aria-label="Length in seconds"
            @input=${(e: Event) => this.set("seconds", Number((e.target as HTMLInputElement).value))} />
          <b>${session.seconds}s</b>
        </label>
      ` : nothing}

      ${this.takes("fps") ? html`
        <div class="k">Frame rate</div>
        <div class="row">${[8, 12, 16, 24].map((f) => html`<button class="chip ${session.fps === f ? "on" : ""}" @click=${() => this.set("fps", f)}>${f} fps</button>`)}</div>
      ` : nothing}

      ${this.takes("steps") ? html`
        <div class="k">Steps</div>
        <label class="slider">
          <input type="range" min="2" max="50" step="1" .value=${String(session.steps)} aria-label="Steps"
            @input=${(e: Event) => this.set("steps", Number((e.target as HTMLInputElement).value))} />
          <b>${session.steps}</b>
        </label>
      ` : nothing}

      <button class="make" ?disabled=${from === "image" && !session.picture} @click=${() => void this.make()}>
        <span class="material-symbols-rounded">movie</span>Make the clip</button>
      ${this.error ? html`<div class="err">${this.error}</div>` : nothing}
      <div class="note" style="margin-top:8px">A clip takes minutes. It carries on with this drawer shut, and waits here until you save it to the library.</div>

      ${session.runs.length ? html`<div class="k">Clips</div><div class="runs">${session.runs.map((r) => this.renderRun(r))}</div>` : nothing}
    `;
  }

  private renderPicture() {
    const pic = session.picture;
    const file = html`<input type="file" accept="image/*" @change=${(e: Event) => this.onFile(e)} />`;
    const choose = (label: string) => html`<button class="chip" @click=${(e: Event) =>
      ((e.currentTarget as HTMLElement).parentElement?.querySelector("input[type=file]") as HTMLInputElement | null)?.click()}>
      <span class="material-symbols-rounded">upload</span>${label}</button>`;
    return html`<div class="k">Starts from</div>${pic
      ? html`<div class="picture">
          <img src=${pic.url} alt="" />
          <span class="nm"><b>${pic.name}</b><span>${pic.width}×${pic.height}</span></span>
          ${file}${choose("Change")}
          <button class="icon-btn" title="Let it go" aria-label="Let the picture go" @click=${() => this.set("picture", null)}>
            <span class="material-symbols-rounded">close</span></button>
        </div>`
      : html`<div class="pick">
          <span class="material-symbols-rounded">add_photo_alternate</span>
          Press <b>Animate</b> on a picture in the gallery or on the canvas, or choose one from this computer.
          ${file}${choose("Choose a picture")}
        </div>`}`;
  }

  private renderRun(r: ClipRun) {
    const pct = Math.round(r.percent * 100);
    const media = r.clip
      ? r.clip.mime.startsWith("video/")
        ? html`<video src=${api.genPreviewURL(r.clip.id)} autoplay loop muted playsinline controls></video>`
        : html`<img class="still" src=${api.genPreviewURL(r.clip.id)} alt="Generated clip" />`
      : !r.done
        ? html`<div class="waiting">${r.thumb ? html`<img src=${r.thumb} alt="" />` : nothing}
            <span class="pct"><b>${pct}%</b>Making the clip…</span></div>
          <div class="bar"><span style="width:${pct}%"></span></div>`
        : nothing;
    return html`<div class="run">
      ${media}
      ${r.error ? html`<div class="run-err">${r.error}</div>` : nothing}
      <div class="run-foot">
        <span class="what" title=${r.prompt}>${r.prompt || (r.from === "image" ? "From the picture" : "")}${r.clip ? ` · seed ${r.clip.seed}` : ""}</span>
        ${!r.done ? html`<button class="chip" @click=${() => void api.cancelGenerate(r.jobId).catch(() => {})}>
          <span class="material-symbols-rounded">stop</span>Stop</button>` : nothing}
        ${r.clip ? html`
          <a class="chip" href=${api.genPreviewURL(r.clip.id)} download="clip-${r.clip.seed}" title="Download">
            <span class="material-symbols-rounded">download</span></a>
          <button class="chip ${r.savedId ? "" : "primary"}" ?disabled=${r.saving || !!r.savedId} @click=${() => void this.save(r)}>
            <span class="material-symbols-rounded">${r.savedId ? "check" : "save"}</span>${r.savedId ? "In the library" : "Save"}</button>` : nothing}
        ${r.done ? html`<button class="icon-btn" title="Dismiss" aria-label="Dismiss" @click=${() => this.dismiss(r)}>
          <span class="material-symbols-rounded">close</span></button>` : nothing}
      </div>
    </div>`;
  }
}

/**
 * Runs a clip and keeps its card up to date. The call may be cut off by a proxy long
 * before the clip is done; the server finishes it anyway, so a failed call is followed
 * by polling the job, as the studio's own runs are (collectRun in imagegen.ts). A job
 * the server never heard of means the call itself was refused: that is the error.
 */
async function runClip(run: ClipRun, params: ClipParams) {
  const poll = window.setInterval(async () => {
    try {
      const p = await api.genProgress(run.jobId, -1);
      if (!run.done) {
        run.percent = p.percent;
        changed();
      }
    } catch {
      // Not registered yet, or a blip.
    }
  }, 2000);
  let res: GenerateResult | undefined;
  try {
    res = await api.makeClip(params);
  } catch (e) {
    try {
      res = await collect(run.jobId, e as Error);
    } catch (failure) {
      const msg = (failure as Error).message;
      run.error = /cancelled/i.test(msg) ? "Stopped." : msg;
    }
  } finally {
    window.clearInterval(poll);
  }
  run.done = true;
  run.percent = 1;
  if (res?.clip) run.clip = res.clip;
  else if (!run.error) run.error = "ComfyUI finished without a clip.";
  changed();
}

async function collect(jobId: string, failure: Error): Promise<GenerateResult> {
  if (failure.name === "AbortError") throw failure;
  const deadline = Date.now() + 16 * 60_000;
  while (Date.now() < deadline) {
    let state;
    try {
      state = await api.genProgress(jobId, -1);
    } catch {
      throw failure;
    }
    if (state.done) {
      if (state.result) return state.result;
      throw state.error ? new Error(state.error) : failure;
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw failure;
}

async function pictureDataURL(url: string): Promise<string> {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) throw new Error("Couldn't read the picture — a result on the canvas expires after a while; pick it again.");
  const blob = await res.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("couldn't read the picture"));
    reader.readAsDataURL(blob);
  });
}

declare global {
  interface HTMLElementTagNameMap {
    "oppai-clip-panel": OppaiClipPanel;
  }
}
