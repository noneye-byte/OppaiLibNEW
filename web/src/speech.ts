// Libby's voice, on this device.
//
// The server synthesises her lines (see backend/internal/tts: piper on the box, or a
// speech server the operator pointed it at) and this plays them, in order, one at a
// time. When the server has nothing to speak with, the browser's own voices stand in
// — worse, and not hers, but never silent — and the status says which is happening
// so the settings screen can explain.
//
// Whether she speaks at all is per-device, like hiding her: a browser in a shared
// room and a phone with headphones want different answers, and neither is a fact
// about the library. Off by default; the toggle lives in the chat header and on the
// call screen.

const SPEAK_KEY = "oppai_libby_speak";

export interface TTSVoice {
  id: string;
  label: string;
  language?: string;
  installed: boolean;
  bundled?: boolean;
  quality?: string;
  bytes?: number;
}

export interface TTSStatus {
  engine: string;
  ready: boolean;
  detail?: string;
  mode: string;
  voice: string;
  speed: number;
  piperInstalled: boolean;
  remoteConfigured: boolean;
  voices: TTSVoice[];
  downloading?: string[];
}

export function loadSpeakPref(): boolean {
  try { return localStorage.getItem(SPEAK_KEY) === "1"; } catch { return false; }
}

export function saveSpeakPref(on: boolean): void {
  try { localStorage.setItem(SPEAK_KEY, on ? "1" : "0"); } catch { /* private mode */ }
  if (!on) stopSpeaking();
  window.dispatchEvent(new CustomEvent("oppai-libby-speak", { detail: { on } }));
}

/** What is known about the server's engine; null until asked. */
let status: TTSStatus | null = null;
let statusAt = 0;

/** Reads the server's speech status, cached for a minute. */
export async function ttsStatus(force = false): Promise<TTSStatus | null> {
  if (!force && status && Date.now() - statusAt < 60_000) return status;
  try {
    const res = await fetch("/api/tts/status", { credentials: "same-origin" });
    if (!res.ok) throw new Error(String(res.status));
    status = await res.json() as TTSStatus;
    statusAt = Date.now();
  } catch {
    status = null;
  }
  return status;
}

// ── playback ────────────────────────────────────────────────────────────────

interface Line {
  text: string;
  /** Resolves when the line has been played or skipped. */
  done: () => void;
}

const queue: Line[] = [];
let playing: HTMLAudioElement | null = null;
let draining = false;
/** Bumped by stopSpeaking so a fetch that lands afterwards is discarded. */
let generation = 0;

/**
 * Says a line, after whatever is already being said. Resolves when it has been
 * played; never rejects — a line that could not be spoken is simply skipped, since
 * a chat that errors because the speaker is off is worse than one that is quiet.
 */
export function speak(text: string): Promise<void> {
  const clean = text.trim();
  if (!clean) return Promise.resolve();
  return new Promise<void>((resolve) => {
    queue.push({ text: clean, done: resolve });
    void drain();
  });
}

/** Stops the current line and forgets the rest. */
export function stopSpeaking(): void {
  generation++;
  for (const line of queue.splice(0)) line.done();
  if (playing) {
    playing.pause();
    playing.src = "";
    playing = null;
  }
  try { window.speechSynthesis?.cancel(); } catch { /* unsupported */ }
}

export function isSpeaking(): boolean {
  return playing !== null || queue.length > 0 || !!window.speechSynthesis?.speaking;
}

async function drain(): Promise<void> {
  if (draining) return;
  draining = true;
  try {
    while (queue.length) {
      const line = queue.shift()!;
      const gen = generation;
      try {
        await sayOne(line.text, gen);
      } catch {
        /* skipped */
      } finally {
        line.done();
      }
    }
  } finally {
    draining = false;
  }
}

async function sayOne(text: string, gen: number): Promise<void> {
  const served = await fetchAudio(text);
  if (gen !== generation) return;
  if (served) {
    await playBlob(served, gen);
    return;
  }
  await speakWithDevice(text, gen);
}

/** Asks the server for the line; null when it has no engine. */
async function fetchAudio(text: string): Promise<Blob | null> {
  const known = await ttsStatus();
  if (known && !known.engine) return null;
  try {
    const res = await fetch("/api/tts/speak", {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (res.status === 503) { status = null; return null; }
    if (!res.ok) return null;
    return await res.blob();
  } catch {
    return null;
  }
}

function playBlob(blob: Blob, gen: number): Promise<void> {
  return new Promise<void>((resolve) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    playing = audio;
    const finish = () => {
      if (playing === audio) playing = null;
      URL.revokeObjectURL(url);
      resolve();
    };
    audio.addEventListener("ended", finish, { once: true });
    audio.addEventListener("error", finish, { once: true });
    audio.play().catch(() => {
      // Autoplay refused: the tab has had no gesture yet. Nothing to do but move on;
      // the next line after a click will play.
      finish();
    });
    if (gen !== generation) finish();
  });
}

/** The browser's own synthesiser, when the server has nothing to say it with. */
function speakWithDevice(text: string, gen: number): Promise<void> {
  const synth = window.speechSynthesis;
  if (!synth || typeof SpeechSynthesisUtterance === "undefined") return Promise.resolve();
  return new Promise<void>((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickDeviceVoice(synth.getVoices());
    if (voice) utterance.voice = voice;
    utterance.rate = 1.02;
    utterance.pitch = 1.05;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    if (gen !== generation) { resolve(); return; }
    synth.speak(utterance);
  });
}

/**
 * A device voice for her: an English one, female where the platform says so, and
 * a "natural"/"neural" one over the robotic default when the OS offers one.
 */
function pickDeviceVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const english = voices.filter((v) => /^en/i.test(v.lang));
  const pool = english.length ? english : voices;
  const score = (v: SpeechSynthesisVoice) => {
    let s = 0;
    const name = v.name.toLowerCase();
    if (/natural|neural|premium|enhanced/.test(name)) s += 4;
    if (/female|woman|aria|jenny|samantha|zira|karen|moira|tessa|fiona|libby|sonia|ava|allison|susan|emma/.test(name)) s += 3;
    if (/google/.test(name)) s += 1;
    if (v.default) s += 1;
    return s;
  };
  return [...pool].sort((a, b) => score(b) - score(a))[0];
}
