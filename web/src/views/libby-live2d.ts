import { LitElement, css, html, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import {
  blendParam, faceTargets, fitModel, mouthOpen, mouthWithoutSound, stepWeights,
  type ExpressionParam, type Live2DSettings,
} from "../live2d-face.js";

/**
 * Her, as a Live2D model.
 *
 * Draws the model the user gave her (api/libby_live2d.go) where her portrait art would
 * be: blinking, breathing and swaying on its own physics, its idle loop playing, her face
 * changing with her mood through the model's expressions (live2d-face.ts), her eyes
 * following the pointer, and her mouth moving with her voice.
 *
 * Everything heavy is loaded on first use, in order, because the order is the point:
 * Live2D's Cubism Core first — a script from this server, since it may not be bundled —
 * then PixiJS with its eval-free patch (the CSP refuses `new Function`), then the plugin,
 * whose module throws on load if the Core is not already there. A page that never shows
 * a Live2D model never loads any of it.
 */

const FILES = "/api/libby/live2d/files/";

let coreLoad: Promise<void> | null = null;

function loadCore(): Promise<void> {
  if ((window as unknown as { Live2DCubismCore?: unknown }).Live2DCubismCore) return Promise.resolve();
  coreLoad ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/api/libby/live2d/core.js";
    script.onload = () => resolve();
    script.onerror = () => {
      coreLoad = null;
      script.remove();
      reject(new Error("Live2D's Cubism Core isn't on this server yet — add it in her Live2D settings."));
    };
    document.head.append(script);
  });
  return coreLoad;
}

type Runtime = {
  PIXI: typeof import("pixi.js");
  Live2DModel: typeof import("pixi-live2d-display-lipsyncpatch/cubism4").Live2DModel;
  Shader: ShaderSingleton;
};

// Cubism's WebGL shaders, as far as this file reaches into them.
interface ShaderSingleton {
  getInstance(): { gl?: WebGLRenderingContext; _shaderSets: unknown[]; setGl(gl: WebGLRenderingContext): void };
}
let runtimeLoad: Promise<Runtime> | null = null;

function loadRuntime(): Promise<Runtime> {
  runtimeLoad ??= (async () => {
    await loadCore();
    await import("@pixi/unsafe-eval");
    const PIXI = await import("pixi.js");
    const cubism = await import("pixi-live2d-display-lipsyncpatch/cubism4");
    cubism.Live2DModel.registerTicker(PIXI.Ticker);
    // Exported by the build, though not by its type declarations.
    const Shader = (cubism as unknown as { CubismShader_WebGL: ShaderSingleton }).CubismShader_WebGL;
    return { PIXI, Live2DModel: cubism.Live2DModel, Shader };
  })();
  runtimeLoad.catch(() => { runtimeLoad = null; });
  return runtimeLoad;
}

// The model's core, as far as this file touches it.
interface CoreModel {
  getParameterValueById(id: string): number;
  setParameterValueById(id: string, value: number, weight?: number): void;
}

// One audio context for every element: browsers cap how many a page may hold.
let audioContext: AudioContext | null = null;

/** Numbers each element's textures apart; see modelSettings. */
let instances = 0;

/** Each WebGL context's own compiled Cubism shaders; see ownShaders. */
const shaderSets = new WeakMap<WebGLRenderingContext, unknown[]>();

/**
 * Makes a model draw with shaders compiled for its own canvas.
 *
 * Cubism's WebGL renderer keeps its shader programs in one global, compiled for
 * whichever context set it up last. With her on the stage and in the settings preview —
 * two canvases, two contexts — the stage drew with the preview's programs, which in
 * WebGL draws nothing at all: she vanished whenever her settings were open. Before each
 * draw the global is handed the set belonging to this canvas's context, compiled on
 * first use, and the set it held is kept for the context it came from. A swap of two
 * arrays, so it costs nothing per frame.
 */
function ownShaders(internal: { draw(gl: WebGLRenderingContext): void }, Shader: ShaderSingleton) {
  const draw = internal.draw.bind(internal);
  internal.draw = (gl: WebGLRenderingContext) => {
    const shader = Shader.getInstance();
    if (shader.gl !== gl) {
      if (shader.gl) shaderSets.set(shader.gl, shader._shaderSets);
      shader._shaderSets = shaderSets.get(gl) ?? [];
      shader.setGl(gl);
    }
    draw(gl);
    shaderSets.set(gl, shader._shaderSets);
  };
}

/**
 * The model's settings file, with its textures made this element's own.
 *
 * PixiJS caches a texture by its URL, so two elements drawing her — the portrait and
 * the preview in her settings — shared one set, and the first to be torn down destroyed
 * the other's: she vanished from the stage the moment the settings tab was closed. A
 * query only this element uses keeps each set apart (the server ignores it), and each
 * element destroys only what it loaded.
 */
async function modelSettings(): Promise<Record<string, unknown>> {
  const res = await fetch(FILES + "model.model3.json", { credentials: "same-origin" });
  if (!res.ok) throw new Error(res.status === 404 ? "She has no Live2D model." : `Her model couldn't be read (${res.status}).`);
  const json = await res.json() as { FileReferences?: { Textures?: string[] } } & Record<string, unknown>;
  const instance = ++instances;
  const refs = json.FileReferences;
  if (refs?.Textures) refs.Textures = refs.Textures.map((t) => `${t}?for=${instance}`);
  json.url = FILES + "model.model3.json";
  return json;
}

@customElement("oppai-libby-live2d")
export class OppaiLibbyLive2D extends LitElement {
  @property({ attribute: false }) settings: Live2DSettings | null = null;
  /** Her mood, one of her twelve. */
  @property() emotion = "neutral";
  @state() private problem = "";
  @state() private loading = false;

  private app: import("pixi.js").Application | null = null;
  private model: InstanceType<Runtime["Live2DModel"]> | null = null;
  private natural = { width: 0, height: 0 };
  /** The model this element has loaded, by upload time; 0 for none. */
  private loadedAt = 0;
  private loadSeq = 0;
  private expressions = new Map<string, ExpressionParam[]>();
  private weights = new Map<string, number>();
  private mouth = 0;
  private analyser: AnalyserNode | null = null;
  private samples: Float32Array<ArrayBuffer> | null = null;
  private speaking = false;
  private resize?: ResizeObserver;

  static styles = css`
    :host { display: block; position: relative; width: 100%; height: 100%; min-height: 0; }
    canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
    .note { position: absolute; left: 8px; right: 8px; bottom: 8px; padding: 8px 10px; border-radius: 10px; font-size: 12px;
      line-height: 1.4; background: rgba(0, 0, 0, .6); color: #fff; text-align: center; }
  `;

  render() {
    return html`<canvas aria-hidden="true"></canvas>
      ${this.problem ? html`<div class="note" role="status">${this.problem}</div>`
        : this.loading ? html`<div class="note" role="status">Loading her model…</div>` : nothing}`;
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("oppai-libby-voice", this.onVoice as EventListener);
    window.addEventListener("oppai-libby-speaking", this.onSpeaking as EventListener);
    window.addEventListener("pointermove", this.onPointer);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("oppai-libby-voice", this.onVoice as EventListener);
    window.removeEventListener("oppai-libby-speaking", this.onSpeaking as EventListener);
    window.removeEventListener("pointermove", this.onPointer);
    this.teardown();
  }

  protected updated(changed: PropertyValues<this>) {
    if (changed.has("settings")) {
      if (this.settings && this.settings.createdAt !== this.loadedAt) void this.load();
      else this.place();
    }
  }

  private teardown() {
    this.resize?.disconnect();
    this.resize = undefined;
    this.model = null;
    this.app?.destroy(false, { children: true, texture: true, baseTexture: true });
    this.app = null;
    this.loadedAt = 0;
    this.analyser = null;
  }

  private async load() {
    const settings = this.settings;
    if (!settings) return;
    const seq = ++this.loadSeq;
    this.teardown();
    this.problem = "";
    this.loading = true;
    try {
      const { PIXI, Live2DModel, Shader } = await loadRuntime();
      if (seq !== this.loadSeq) return;
      await this.updateComplete;
      const canvas = this.renderRoot.querySelector("canvas")!;
      const app = new PIXI.Application({
        view: canvas, backgroundAlpha: 0, antialias: true, autoDensity: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        width: Math.max(1, this.clientWidth), height: Math.max(1, this.clientHeight),
      });
      this.app = app;
      // A texture larger than the card can hold draws as nothing at all, with no error.
      const gl = (app.renderer as unknown as { gl?: WebGLRenderingContext }).gl;
      const maxTexture = gl ? gl.getParameter(gl.MAX_TEXTURE_SIZE) as number : 0;
      if (maxTexture && settings.texture > maxTexture) {
        throw new Error(`This model's textures are ${settings.texture}px and this device draws at most ${maxTexture}px.`);
      }
      const [model] = await Promise.all([
        modelSettings().then((json) => Live2DModel.from(json, { autoFocus: false, autoHitTest: false })),
        this.loadExpressions(settings),
      ]);
      if (seq !== this.loadSeq) { model.destroy(); return; }
      ownShaders(model.internalModel as unknown as { draw(gl: WebGLRenderingContext): void }, Shader);
      model.scale.set(1);
      this.natural = { width: model.width, height: model.height };
      app.stage.addChild(model);
      this.model = model;
      this.loadedAt = settings.createdAt;
      // An EventEmitter at runtime, though the plugin's types leave it out. The hook runs
      // after motion and physics and before the model is updated, which is where an
      // expression is applied in Cubism's own framework.
      (model.internalModel as unknown as { on(event: string, fn: () => void): void }).on("beforeModelUpdate", () => this.drawFace());
      this.place();
      this.resize = new ResizeObserver(() => this.place());
      this.resize.observe(this);
    } catch (error) {
      if (seq === this.loadSeq) {
        this.problem = (error as Error).message || "Her model couldn't be drawn.";
        this.teardown();
      }
    } finally {
      if (seq === this.loadSeq) this.loading = false;
    }
  }

  private async loadExpressions(settings: Live2DSettings) {
    this.expressions.clear();
    this.weights.clear();
    await Promise.all(settings.expressions.map(async (e) => {
      try {
        const res = await fetch(FILES + e.file, { credentials: "same-origin" });
        if (!res.ok) return;
        const body = await res.json() as { Parameters?: ExpressionParam[] };
        this.expressions.set(e.name, (body.Parameters ?? []).filter((p) => typeof p.Id === "string" && typeof p.Value === "number"));
      } catch { /* an expression that will not load is one she cannot make */ }
    }));
  }

  /** Fits her to the element, the user's own framing applied. */
  private place() {
    const app = this.app, model = this.model, settings = this.settings;
    if (!app || !model || !settings) return;
    const width = Math.max(1, this.clientWidth), height = Math.max(1, this.clientHeight);
    app.renderer.resize(width, height);
    const fit = fitModel({ width, height }, this.natural, settings);
    model.scale.set(fit.scale);
    model.position.set(fit.x, fit.y);
  }

  /** Each frame, after her motion and physics: her mood's face, and her mouth. */
  private drawFace() {
    const model = this.model, settings = this.settings;
    if (!model || !settings) return;
    const core = model.internalModel.coreModel as unknown as CoreModel;
    const dt = Math.min(0.1, (this.app?.ticker.deltaMS ?? 16) / 1000);
    this.weights = stepWeights(this.weights, faceTargets(this.emotion, settings), dt);
    for (const [name, weight] of this.weights) {
      if (weight <= 0) continue;
      for (const p of this.expressions.get(name) ?? []) {
        core.setParameterValueById(p.Id, blendParam(core.getParameterValueById(p.Id), p, weight));
      }
    }
    this.mouth = mouthOpen(this.mouth, this.voiceLevel(), dt);
    let open = this.mouth;
    if (this.speaking && !this.analyser) open = Math.max(open, mouthWithoutSound(performance.now() / 1000));
    if (open > 0.01) {
      const ids = (model.internalModel as unknown as { motionManager: { lipSyncIds: string[] } }).motionManager.lipSyncIds;
      for (const id of ids) core.setParameterValueById(id, Math.max(core.getParameterValueById(id), open));
    }
  }

  private voiceLevel(): number {
    const analyser = this.analyser, samples = this.samples;
    if (!analyser || !samples) return 0;
    analyser.getFloatTimeDomainData(samples);
    let sum = 0;
    for (const v of samples) sum += v * v;
    return Math.sqrt(sum / samples.length);
  }

  /**
   * A line of hers starting to play (speech.ts). The audio is routed through an analyser
   * for her mouth — but only into a context that is already running: routing an element
   * into a suspended one would silence her, and a quiet mouth is the better failure.
   */
  private onVoice = (event: CustomEvent<{ audio: HTMLAudioElement }>) => {
    if (!this.model) return;
    const audio = event.detail?.audio;
    if (!audio) return;
    try {
      audioContext ??= new AudioContext();
      if (audioContext.state !== "running") { void audioContext.resume(); return; }
      const source = audioContext.createMediaElementSource(audio);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      analyser.connect(audioContext.destination);
      this.analyser = analyser;
      this.samples = new Float32Array(new ArrayBuffer(analyser.fftSize * 4));
      audio.addEventListener("ended", () => { if (this.analyser === analyser) this.analyser = null; }, { once: true });
    } catch {
      this.analyser = null;
    }
  };

  private onSpeaking = (event: CustomEvent<{ on: boolean }>) => {
    this.speaking = !!event.detail?.on;
    if (!this.speaking) this.analyser = null;
  };

  /** Her eyes follow the pointer while it is over the page. */
  private onPointer = (event: PointerEvent) => {
    const model = this.model;
    if (!model) return;
    const r = this.getBoundingClientRect();
    if (!r.width || !r.height) return;
    model.focus(event.clientX - r.left, event.clientY - r.top);
  };
}

declare global {
  interface HTMLElementTagNameMap { "oppai-libby-live2d": OppaiLibbyLive2D }
}
