/**
 * The upload queue's logic, with nothing browser-shaped in it.
 *
 * Split out from uploads.ts deliberately. What actually goes wrong in an upload
 * manager is arithmetic and state: a rate that spikes to nonsense on the first
 * sample, an estimate that says "3 days" because one chunk was slow, a queue
 * restored from storage that puts a NaN in a progress bar, an entry that offers
 * "pause" after it has already finished. None of that needs a network or a DOM to
 * test, and all of it is what the user sees.
 */

/** The states an upload moves through, named as the brief names them. */
export type UploadState =
  | "queued"
  | "preparing"
  | "uploading"
  | "paused"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export interface UploadEntry {
  /** Stable per file: derived from the file's own identity, so the same file
      queued twice is recognised rather than uploaded twice. */
  id: string;
  /** The server's session, once opened. */
  sessionId?: string;
  name: string;
  size: number;
  mime: string;
  destination: string;
  state: UploadState;
  sentBytes: number;
  /** Smoothed transfer rate in bytes per second; 0 when not moving. */
  bytesPerSecond: number;
  /** Seconds remaining at the current rate, or undefined when it cannot be known. */
  etaSeconds?: number;
  retries: number;
  error?: string;
  mediaId?: number;
  /**
   * True when the session is alive on the server but this browser no longer holds
   * the file — after a reload, since a File cannot be persisted. The upload is not
   * lost; it needs the user to point at the same file again, and it will pick up
   * from the bytes the server already has.
   */
  needsFile?: boolean;
  addedAt: number;
  /** Queue order. Lower goes first; reordering only rewrites this. */
  position: number;
}

/** What survives a reload. The File cannot, which is the whole reason for needsFile. */
export interface PersistedEntry {
  id: string;
  sessionId?: string;
  name: string;
  size: number;
  mime: string;
  destination: string;
  state: UploadState;
  sentBytes: number;
  retries: number;
  error?: string;
  mediaId?: number;
  addedAt: number;
  position: number;
}

export const TERMINAL_STATES: UploadState[] = ["completed", "failed", "cancelled"];

export function isTerminal(state: UploadState): boolean {
  return TERMINAL_STATES.includes(state);
}

/** Live means "this upload still intends to finish", which is what the duplicate
    guard and the "leave the page?" prompt both ask about. */
export function isLive(state: UploadState): boolean {
  return !isTerminal(state);
}

export function canPause(e: UploadEntry): boolean {
  return e.state === "queued" || e.state === "uploading" || e.state === "preparing";
}
export function canResume(e: UploadEntry): boolean {
  return e.state === "paused" && !e.needsFile;
}
export function canRetry(e: UploadEntry): boolean {
  return e.state === "failed";
}
export function canCancel(e: UploadEntry): boolean {
  return isLive(e.state);
}
/** Only a finished row can be removed; cancelling is what stops a live one, and a
    single button that means "stop" or "forget" depending on state is a button that
    eventually destroys work. */
export function canRemove(e: UploadEntry): boolean {
  return isTerminal(e.state);
}

/**
 * A file's identity, as far as a browser can tell.
 *
 * Name, size and modification time is everything available without reading the
 * file — and reading a 12 GB video to hash it before uploading it would double the
 * work for a guess. Collisions are possible in principle and harmless in practice:
 * the consequence is resuming into a session whose bytes are checked chunk by chunk
 * against a declared length anyway.
 */
export function fingerprintFile(file: { name: string; size: number; lastModified?: number }): string {
  return `${file.name}:${file.size}:${file.lastModified ?? 0}`;
}

/** Which chunks still have to be sent, given what the server says it holds. */
export function missingChunks(chunkCount: number, received: number[]): number[] {
  const have = new Set(received);
  const out: number[] = [];
  for (let i = 0; i < chunkCount; i++) if (!have.has(i)) out.push(i);
  return out;
}

/** The byte range of one chunk. The last one is short, and getting that wrong is
    the classic off-by-one that corrupts exactly the end of every file. */
export function chunkRange(index: number, chunkSize: number, size: number): { start: number; end: number } {
  const start = index * chunkSize;
  return { start, end: Math.min(start + chunkSize, size) };
}

export function chunkCountFor(size: number, chunkSize: number): number {
  if (chunkSize <= 0) return 0;
  return Math.ceil(size / chunkSize);
}

/**
 * A transfer rate that is worth showing to a person.
 *
 * The naive rate — bytes so far over time so far — is wrong in both directions
 * that matter: it never recovers from a slow start, and it keeps counting while an
 * upload is paused, so a resumed upload reports a rate it is not achieving. So this
 * is a sliding window over recent samples only, and it reports nothing at all until
 * it has seen enough to mean something. An honest blank beats a confident "4 hours
 * remaining" that changes to "20 seconds" a moment later.
 */
export class SpeedMeter {
  private samples: { at: number; bytes: number }[] = [];
  // Written out rather than as a parameter property: `node --test` strips types
  // rather than compiling them, and a constructor parameter property is the one bit
  // of TypeScript that has no type-free equivalent for it to strip to.
  private windowMs: number;
  constructor(windowMs = 8000) {
    this.windowMs = windowMs;
  }

  /** Records cumulative bytes sent at a moment in time. */
  sample(bytes: number, at: number) {
    this.samples.push({ at, bytes });
    const cutoff = at - this.windowMs;
    while (this.samples.length > 2 && this.samples[0].at < cutoff) this.samples.shift();
  }

  /** Bytes per second over the window, or 0 when it cannot be said yet. */
  rate(): number {
    if (this.samples.length < 2) return 0;
    const first = this.samples[0];
    const last = this.samples[this.samples.length - 1];
    const seconds = (last.at - first.at) / 1000;
    if (seconds <= 0) return 0;
    const rate = (last.bytes - first.bytes) / seconds;
    return rate > 0 ? rate : 0;
  }

  /** Seconds left for `remaining` bytes, or undefined while the rate is unknown. */
  eta(remaining: number): number | undefined {
    const rate = this.rate();
    if (rate <= 0 || remaining <= 0) return undefined;
    return remaining / rate;
  }

  /** Called on pause and on resume: the gap must not be averaged into the rate. */
  reset() {
    this.samples = [];
  }
}

export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n < 1024) return `${Math.round(n)} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = n / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

export function formatSpeed(bytesPerSecond: number): string {
  if (!Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) return "";
  return `${formatBytes(bytesPerSecond)}/s`;
}

/** Deliberately coarse above a minute: a countdown to the second on a twenty-minute
    upload is precision the estimate does not have. */
export function formatEta(seconds: number | undefined): string {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds <= 0) return "";
  if (seconds < 60) return `${Math.ceil(seconds)}s left`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)} min left`;
  const hours = seconds / 3600;
  return `${hours < 10 ? hours.toFixed(1) : Math.round(hours)} hr left`;
}

export function stateLabel(e: UploadEntry): string {
  if (e.needsFile) return "Waiting for the file";
  switch (e.state) {
    case "queued":
      return "Queued";
    case "preparing":
      return "Preparing";
    case "uploading":
      return "Uploading";
    case "paused":
      return "Paused";
    case "processing":
      return "Processing on the server";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
  }
}

export function progressOf(e: UploadEntry): number {
  if (e.state === "completed") return 1;
  if (!e.size) return 0;
  return Math.max(0, Math.min(1, e.sentBytes / e.size));
}

const STATES: UploadState[] = [
  "queued", "preparing", "uploading", "paused", "processing", "completed", "failed", "cancelled",
];

/**
 * Rebuilds the queue from whatever was in storage, field by field.
 *
 * The stored blob outlives the code that wrote it, and a bad value here is not an
 * abstract worry: a NaN in sentBytes renders as an empty progress bar the user
 * cannot clear, and an unknown state renders as a row with no controls at all. So
 * anything that does not survive validation is dropped rather than restored, and a
 * blob that is not even an array restores nothing instead of throwing on every visit.
 */
export function parsePersisted(raw: unknown): PersistedEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: PersistedEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (typeof o.id !== "string" || !o.id) continue;
    if (typeof o.name !== "string") continue;
    if (typeof o.size !== "number" || !Number.isFinite(o.size) || o.size < 0) continue;
    const state = typeof o.state === "string" && STATES.includes(o.state as UploadState)
      ? (o.state as UploadState)
      : "paused";
    const num = (v: unknown, fallback: number) =>
      typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : fallback;
    out.push({
      id: o.id,
      sessionId: typeof o.sessionId === "string" ? o.sessionId : undefined,
      name: o.name,
      size: o.size,
      mime: typeof o.mime === "string" ? o.mime : "",
      destination: typeof o.destination === "string" ? o.destination : "Library",
      state,
      sentBytes: Math.min(num(o.sentBytes, 0), o.size),
      retries: num(o.retries, 0),
      error: typeof o.error === "string" ? o.error : undefined,
      mediaId: typeof o.mediaId === "number" && o.mediaId > 0 ? o.mediaId : undefined,
      addedAt: num(o.addedAt, 0),
      position: num(o.position, out.length),
    });
  }
  return out;
}

/** A session as the server reports it — the subset this module reasons about. */
export interface ServerSession {
  id: string;
  filename: string;
  size: number;
  status: string;
  receivedBytes: number;
  mediaId?: number;
  error?: string;
}

/**
 * Reconciles the restored queue against what the server actually has.
 *
 * The server is the authority, and this is where that pays: an upload that finished
 * while the tab was closed is shown as completed rather than as forever-paused; one
 * the server has forgotten (swept, or cancelled from a phone) stops claiming it can
 * resume; and a session opened from another device appears here so it can be
 * finished from this one.
 *
 * A live entry is marked needsFile because the File object did not survive the
 * reload: the bytes are safe on the server, but this browser must be handed the
 * same file again before it can send the rest.
 */
export function reconcile(restored: PersistedEntry[], sessions: ServerSession[]): PersistedEntry[] {
  const byID = new Map(sessions.map((s) => [s.id, s]));
  const claimed = new Set<string>();
  const out: PersistedEntry[] = [];

  for (const entry of restored) {
    const session = entry.sessionId ? byID.get(entry.sessionId) : undefined;
    if (!session) {
      // Nothing on the server: a finished row is history and stays; an unfinished
      // one has nothing left to resume into and is honestly a failure.
      if (isTerminal(entry.state)) out.push(entry);
      else out.push({ ...entry, state: "failed", error: "the server no longer has this upload" });
      continue;
    }
    claimed.add(session.id);
    out.push(applySession(entry, session));
  }

  for (const session of sessions) {
    if (claimed.has(session.id)) continue;
    out.push(applySession(
      {
        id: `session:${session.id}`,
        sessionId: session.id,
        name: session.filename || "Unnamed upload",
        size: session.size,
        mime: "",
        destination: "Library",
        state: "paused",
        sentBytes: session.receivedBytes,
        retries: 0,
        addedAt: 0,
        position: out.length,
      },
      session,
    ));
  }
  return out;
}

function applySession(entry: PersistedEntry, session: ServerSession): PersistedEntry {
  const next: PersistedEntry = { ...entry, sessionId: session.id, size: session.size || entry.size };
  switch (session.status) {
    case "completed":
      return { ...next, state: "completed", sentBytes: next.size, mediaId: session.mediaId, error: undefined };
    case "failed":
      return { ...next, state: "failed", error: session.error || "the server could not finish this upload" };
    case "cancelled":
      return { ...next, state: "cancelled" };
    default:
      // Still open. Trust the server's byte count over the one we remembered: ours
      // was written before the last chunks landed.
      return { ...next, state: "paused", sentBytes: Math.max(session.receivedBytes, 0) };
  }
}

/** Renumbers so positions stay dense after a removal, which is what keeps "move up"
    from silently doing nothing. */
export function renumber<T extends { position: number }>(entries: T[]): T[] {
  return entries
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((e, i) => ({ ...e, position: i }));
}

/** Moves one queued upload relative to its neighbours. Only pending work can be
    reordered: the running one is already sending bytes and the finished ones are
    history. */
export function reorder<T extends { id: string; position: number; state: UploadState }>(
  entries: T[],
  id: string,
  direction: -1 | 1,
): T[] {
  const movable = renumber(entries).filter((e) => e.state === "queued" || e.state === "paused");
  const index = movable.findIndex((e) => e.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= movable.length) return entries;
  const a = movable[index];
  const b = movable[target];
  return entries.map((e) => {
    if (e.id === a.id) return { ...e, position: b.position };
    if (e.id === b.id) return { ...e, position: a.position };
    return e;
  });
}
