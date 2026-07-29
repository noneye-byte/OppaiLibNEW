import { api, getToken } from "./api.js";
import {
  SpeedMeter,
  chunkCountFor,
  chunkRange,
  fingerprintFile,
  isLive,
  isTerminal,
  missingChunks,
  parsePersisted,
  reconcile,
  renumber,
  reorder,
  type PersistedEntry,
  type UploadEntry,
  type UploadState,
} from "./upload-queue.js";

export * from "./upload-queue.js";

/**
 * The upload manager.
 *
 * One queue for the whole application, living outside any view, because the thing
 * that was wrong is precisely that uploads belonged to the screen that started them:
 * navigate away and the progress vanished, and there was no way to see whether
 * anything was still happening. This survives navigation because it is not in a
 * component, and it survives a reload because the sessions are on the server.
 *
 * Uploads run one at a time. On a self-hosted box the bottleneck is the single
 * upstream link, so three concurrent uploads finish no sooner than three sequential
 * ones and each takes three times as long to produce its first finished file —
 * which is the one that matters when you are waiting to watch it. Running them in
 * order is also what makes reordering the queue mean anything.
 */

const STORAGE_KEY = "oppai_uploads";

/** 4 MiB: small enough that the progress bar moves visibly on a slow connection and
    a dropped chunk costs little, large enough that the per-request overhead is
    negligible. The server clamps whatever we ask for into its own range. */
const CHUNK_SIZE = 4 * 1024 * 1024;

/** Automatic retries per chunk before the upload is handed back to the user. The
    failures this covers are transient by nature — a phone changing cell, a wifi
    handover — and they resolve in seconds or not at all. */
const MAX_CHUNK_RETRIES = 5;

const backoffMs = (attempt: number) => Math.min(30_000, 500 * 2 ** attempt);

type Listener = (entries: UploadEntry[]) => void;

class UploadManager {
  private entries: UploadEntry[] = [];
  /** Files, held only in memory: a File cannot be serialized, which is why a
      reload leaves entries marked needsFile rather than silently broken. */
  private files = new Map<string, File>();
  private listeners = new Set<Listener>();
  private meters = new Map<string, SpeedMeter>();
  private aborters = new Map<string, AbortController>();
  private running = false;
  private restored = false;

  // ── subscription ─────────────────────────────────────────────────────

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.snapshot());
    return () => this.listeners.delete(fn);
  }

  snapshot(): UploadEntry[] {
    return renumber(this.entries).map((e) => ({ ...e }));
  }

  /** The number a badge shows: work still intending to finish. */
  activeCount(): number {
    return this.entries.filter((e) => isLive(e.state)).length;
  }

  private publish() {
    const snap = this.snapshot();
    for (const fn of this.listeners) fn(snap);
    this.persist();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("oppai-uploads", { detail: snap }));
    }
  }

  // ── persistence + recovery ───────────────────────────────────────────

  private persist() {
    try {
      const blob: PersistedEntry[] = this.entries.map((e) => ({
        id: e.id,
        sessionId: e.sessionId,
        name: e.name,
        size: e.size,
        mime: e.mime,
        destination: e.destination,
        // A queue written while uploading is a queue that was interrupted: recording
        // it as "uploading" would restore a row that claims to be moving and is not.
        state: e.state === "uploading" || e.state === "preparing" || e.state === "queued" ? "paused" : e.state,
        sentBytes: e.sentBytes,
        retries: e.retries,
        error: e.error,
        mediaId: e.mediaId,
        addedAt: e.addedAt,
        position: e.position,
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(blob));
    } catch {
      /* A full or disabled localStorage costs the history, never the upload. */
    }
  }

  /**
   * Rebuilds the queue after a reload, from storage and from the server.
   *
   * Called once, on the first mount after sign-in. The server half is what makes
   * this real recovery rather than a cosmetic list: an upload that completed while
   * the tab was closed shows as completed, and one that is half-sent shows exactly
   * how far it got.
   */
  async restore(): Promise<void> {
    if (this.restored || !getToken()) return;
    this.restored = true;
    let stored: PersistedEntry[] = [];
    try {
      stored = parsePersisted(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"));
    } catch {
      stored = [];
    }
    let sessions: Awaited<ReturnType<typeof api.listUploadSessions>>["items"] = [];
    try {
      sessions = (await api.listUploadSessions()).items ?? [];
    } catch {
      // Offline or signed out: show what was stored rather than nothing at all.
      this.entries = stored.map((e) => this.hydrate(e, true));
      this.publish();
      return;
    }
    this.entries = reconcile(stored, sessions).map((e) => this.hydrate(e, isLive(e.state)));
    this.publish();
  }

  private hydrate(e: PersistedEntry, needsFile: boolean): UploadEntry {
    return {
      ...e,
      bytesPerSecond: 0,
      etaSeconds: undefined,
      // Only a live entry needs a file; a completed one is history.
      needsFile: needsFile && !isTerminal(e.state) && !this.files.has(e.id),
    };
  }

  // ── queueing ─────────────────────────────────────────────────────────

  /**
   * Adds files to the queue.
   *
   * Returns how many were actually added. A file already in the queue and not yet
   * finished is skipped rather than duplicated — this is the guard against a
   * double-clicked button and against dropping the same selection twice, and it is
   * the client half of the guard the server enforces by fingerprint.
   */
  add(files: File[] | FileList, destination = "Library"): number {
    let added = 0;
    let position = this.entries.length;
    for (const file of Array.from(files)) {
      const id = fingerprintFile(file);
      const existing = this.entries.find((e) => e.id === id);
      if (existing && isLive(existing.state)) {
        // Already queued. If it lost its file to a reload, this selection is exactly
        // what it was waiting for.
        if (existing.needsFile) {
          this.files.set(id, file);
          existing.needsFile = false;
          existing.state = "queued";
          existing.error = undefined;
        }
        continue;
      }
      this.files.set(id, file);
      const entry: UploadEntry = {
        id,
        name: file.name,
        size: file.size,
        mime: file.type || "",
        destination,
        state: "queued",
        sentBytes: 0,
        bytesPerSecond: 0,
        retries: 0,
        addedAt: Date.now(),
        position: position++,
        // Re-queueing a file that failed or completed before starts clean.
        sessionId: existing?.sessionId,
      };
      this.entries = this.entries.filter((e) => e.id !== id).concat(entry);
      added++;
    }
    if (added) this.publish();
    void this.pump();
    return added;
  }

  // ── controls ─────────────────────────────────────────────────────────

  pause(id: string) {
    const e = this.find(id);
    if (!e || isTerminal(e.state)) return;
    e.state = "paused";
    e.bytesPerSecond = 0;
    e.etaSeconds = undefined;
    this.meters.get(id)?.reset();
    this.aborters.get(id)?.abort();
    this.publish();
  }

  resume(id: string) {
    const e = this.find(id);
    if (!e || e.state !== "paused" || e.needsFile) return;
    e.state = "queued";
    e.error = undefined;
    this.publish();
    void this.pump();
  }

  retry(id: string) {
    const e = this.find(id);
    if (!e) return;
    e.state = "queued";
    e.error = undefined;
    e.retries = 0;
    this.publish();
    void this.pump();
  }

  async cancel(id: string) {
    const e = this.find(id);
    if (!e) return;
    this.aborters.get(id)?.abort();
    e.state = "cancelled";
    e.bytesPerSecond = 0;
    e.etaSeconds = undefined;
    this.files.delete(id);
    this.publish();
    // Tell the server so the staged chunks are reclaimed rather than sitting on the
    // cache volume until the sweeper notices them.
    if (e.sessionId) {
      try {
        await api.cancelUploadSession(e.sessionId);
      } catch {
        /* the sweeper will get it */
      }
    }
  }

  /** Removes one finished row. */
  remove(id: string) {
    const e = this.find(id);
    if (!e || isLive(e.state)) return;
    this.entries = this.entries.filter((x) => x.id !== id);
    this.files.delete(id);
    this.meters.delete(id);
    if (e.sessionId) void api.cancelUploadSession(e.sessionId).catch(() => {});
    this.publish();
  }

  /** Clears the history, leaving anything still running alone. */
  clearFinished() {
    const finished = this.entries.filter((e) => isTerminal(e.state));
    this.entries = this.entries.filter((e) => isLive(e.state));
    for (const e of finished) {
      this.files.delete(e.id);
      this.meters.delete(e.id);
      if (e.sessionId) void api.cancelUploadSession(e.sessionId).catch(() => {});
    }
    this.publish();
  }

  move(id: string, direction: -1 | 1) {
    this.entries = reorder(this.entries, id, direction);
    this.publish();
  }

  private find(id: string): UploadEntry | undefined {
    return this.entries.find((e) => e.id === id);
  }

  // ── the worker ───────────────────────────────────────────────────────

  private async pump(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      for (;;) {
        const next = renumber(this.entries).find((e) => e.state === "queued" && !e.needsFile);
        if (!next) return;
        const entry = this.find(next.id);
        if (!entry) return;
        await this.run(entry);
      }
    } finally {
      this.running = false;
    }
  }

  private async run(entry: UploadEntry) {
    const file = this.files.get(entry.id);
    if (!file) {
      entry.state = "paused";
      entry.needsFile = true;
      this.publish();
      return;
    }

    const ctl = new AbortController();
    this.aborters.set(entry.id, ctl);
    const meter = new SpeedMeter();
    this.meters.set(entry.id, meter);

    try {
      entry.state = "preparing";
      entry.error = undefined;
      this.publish();

      // Opening the session is also the resume: the server answers an existing
      // fingerprint with the session it already has, and its `received` list is what
      // we skip.
      const session = await api.createUploadSession({
        filename: file.name,
        size: file.size,
        mime: file.type || undefined,
        fingerprint: entry.id,
        chunkSize: CHUNK_SIZE,
      });
      entry.sessionId = session.id;
      entry.sentBytes = session.receivedBytes;
      const chunkSize = session.chunkSize;
      const total = session.chunkCount || chunkCountFor(file.size, chunkSize);
      let pending = missingChunks(total, session.received ?? []);

      entry.state = "uploading";
      meter.sample(entry.sentBytes, Date.now());
      this.publish();

      for (const index of pending) {
        if (stopped(entry)) return;
        const { start, end } = chunkRange(index, chunkSize, file.size);
        await this.sendChunk(entry, session.id, index, file.slice(start, end), ctl.signal);
        if (stopped(entry)) return;
        entry.sentBytes = Math.min(file.size, entry.sentBytes + (end - start));
        meter.sample(entry.sentBytes, Date.now());
        entry.bytesPerSecond = meter.rate();
        entry.etaSeconds = meter.eta(file.size - entry.sentBytes);
        this.publish();
      }

      if (stopped(entry)) return;

      // "Processing" is a real state, not a flourish: the server is encrypting,
      // hashing and indexing a file that may be gigabytes, and a progress bar sitting
      // at 100% with nothing said is how a working upload gets cancelled by hand.
      entry.state = "processing";
      entry.bytesPerSecond = 0;
      entry.etaSeconds = undefined;
      this.publish();

      const done = await api.completeUploadSession(session.id);
      entry.state = "completed";
      entry.sentBytes = file.size;
      entry.mediaId = done.id;
      this.files.delete(entry.id);
      this.publish();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("oppai-upload-complete", {
          detail: { id: done.id, name: file.name, deduped: done.deduped },
        }));
      }
    } catch (err) {
      if (stopped(entry)) return;
      entry.state = "failed";
      entry.bytesPerSecond = 0;
      entry.etaSeconds = undefined;
      entry.error = errorText(err);
      this.publish();
    } finally {
      this.aborters.delete(entry.id);
    }
  }

  /**
   * Sends one chunk, retrying the transient failures itself.
   *
   * Retrying here rather than restarting the upload is the point of the whole
   * design: a chunk that fails costs a few megabytes and a second, where the old
   * whole-file POST cost everything sent so far.
   */
  private async sendChunk(
    entry: UploadEntry,
    sessionId: string,
    index: number,
    blob: Blob,
    signal: AbortSignal,
  ) {
    for (let attempt = 0; ; attempt++) {
      if (stopped(entry)) return;
      try {
        const headers = new Headers({ "Content-Type": "application/octet-stream" });
        const token = getToken();
        if (token) headers.set("Authorization", `Bearer ${token}`);
        const res = await fetch(`/api/uploads/${sessionId}/chunk/${index}`, {
          method: "PUT",
          headers,
          body: blob,
          signal,
        });
        if (res.ok) {
          if (attempt > 0) entry.retries += 1;
          return;
        }
        // A rejection with a reason is the server declining, not the network
        // failing — retrying it would loop against a wall. A 5xx is the opposite: the
        // far end fell over and may well be back in a moment.
        const body = await res.json().catch(() => ({}));
        const message = (body as { error?: string }).error || res.statusText || `HTTP ${res.status}`;
        if (res.status < 500) throw new PermanentUploadError(message);
        throw new Error(message);
      } catch (err) {
        if (signal.aborted) return;
        // Refused for a reason, or out of patience: hand it back to the user with
        // the server's own words rather than a generic failure.
        if (err instanceof PermanentUploadError || attempt >= MAX_CHUNK_RETRIES) throw err;
      }
      entry.retries += 1;
      this.publish();
      await sleep(backoffMs(attempt), signal);
    }
  }
}

/**
 * Whether the user has stopped this upload since the loop last looked.
 *
 * A function rather than an inline comparison on purpose: pause and cancel mutate
 * the entry from an event handler while the worker is awaiting a chunk, so the
 * check has to re-read the field every time. Written inline, the compiler narrows
 * `state` to whatever the worker last assigned and concludes — reasonably, and
 * wrongly — that the comparison can never be true.
 */
function stopped(e: UploadEntry): boolean {
  return e.state === "paused" || e.state === "cancelled";
}

/** A refusal the server will keep making: the file is too large, the session is
    gone, the chunk failed its checksum. Distinguished from a transport failure so
    the retry loop does not spend thirty seconds re-asking a settled question. */
class PermanentUploadError extends Error {}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
  });
}

function errorText(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === "AbortError") return "Upload stopped";
    return err.message || "Upload failed";
  }
  return "Upload failed";
}

export const uploads = new UploadManager();

export type { UploadEntry, UploadState };
