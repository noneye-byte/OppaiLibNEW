import { test } from "node:test";
import assert from "node:assert/strict";

const {
  SpeedMeter,
  canPause,
  canRemove,
  canResume,
  canRetry,
  chunkCountFor,
  chunkRange,
  fingerprintFile,
  formatBytes,
  formatEta,
  formatSpeed,
  isLive,
  isTerminal,
  missingChunks,
  parsePersisted,
  progressOf,
  reconcile,
  renumber,
  reorder,
  stateLabel,
} = await import("./upload-queue.ts");

type Entry = ReturnType<typeof entry>;

function entry(over: Record<string, unknown> = {}) {
  return {
    id: "a", name: "clip.mp4", size: 1000, mime: "video/mp4", destination: "Library",
    state: "uploading", sentBytes: 250, bytesPerSecond: 0, retries: 0, addedAt: 1, position: 0,
    ...over,
  } as any;
}

// ── the resume arithmetic ────────────────────────────────────────────────

test("missing chunks are the complement of what the server holds", () => {
  assert.deepEqual(missingChunks(5, [0, 2, 4]), [1, 3]);
  assert.deepEqual(missingChunks(3, []), [0, 1, 2]);
  assert.deepEqual(missingChunks(3, [0, 1, 2]), []);
  // A server that reports a chunk we do not expect must not shift the rest along.
  assert.deepEqual(missingChunks(2, [0, 9]), [1]);
});

test("the last chunk is short, and knowing that is the whole file's integrity", () => {
  // 250 bytes in 100-byte chunks: 0..99, 100..199, 200..249.
  assert.equal(chunkCountFor(250, 100), 3);
  assert.deepEqual(chunkRange(0, 100, 250), { start: 0, end: 100 });
  assert.deepEqual(chunkRange(2, 100, 250), { start: 200, end: 250 });
  // An exact multiple must not produce a trailing empty chunk.
  assert.equal(chunkCountFor(200, 100), 2);
  assert.deepEqual(chunkRange(1, 100, 200), { start: 100, end: 200 });
});

test("a file's fingerprint changes when the file does", () => {
  const a = fingerprintFile({ name: "clip.mp4", size: 100, lastModified: 5 });
  assert.equal(a, fingerprintFile({ name: "clip.mp4", size: 100, lastModified: 5 }));
  assert.notEqual(a, fingerprintFile({ name: "clip.mp4", size: 101, lastModified: 5 }));
  assert.notEqual(a, fingerprintFile({ name: "clip.mp4", size: 100, lastModified: 6 }));
  assert.notEqual(a, fingerprintFile({ name: "other.mp4", size: 100, lastModified: 5 }));
});

// ── rate and estimate ────────────────────────────────────────────────────

test("a rate is not reported until there is enough to say one", () => {
  const m = new SpeedMeter();
  assert.equal(m.rate(), 0);
  m.sample(0, 1000);
  assert.equal(m.rate(), 0, "one sample is not a rate");
  m.sample(1000, 2000);
  assert.equal(m.rate(), 1000);
  assert.equal(m.eta(2000), 2);
});

test("the rate is a window, so a slow start stops dragging on the estimate", () => {
  const m = new SpeedMeter(1000);
  m.sample(0, 0);
  m.sample(10, 1000); // a crawling start
  m.sample(1010, 2000); // then a megabyte a second
  // The old samples have aged out of the window; the reported rate is the recent one.
  assert.equal(m.rate(), 1000);
});

test("a pause is not averaged into the rate", () => {
  const m = new SpeedMeter();
  m.sample(0, 0);
  m.sample(1000, 1000);
  m.reset();
  assert.equal(m.rate(), 0, "after a pause there is no rate until transfer resumes");
  assert.equal(m.eta(500), undefined);
});

test("an estimate is withheld rather than invented", () => {
  const m = new SpeedMeter();
  assert.equal(m.eta(1000), undefined);
  m.sample(0, 0);
  m.sample(100, 1000);
  assert.equal(m.eta(0), undefined, "nothing left is not an estimate of zero seconds");
});

// ── formatting ───────────────────────────────────────────────────────────

test("sizes read the way a person would say them", () => {
  assert.equal(formatBytes(0), "0 B");
  assert.equal(formatBytes(512), "512 B");
  assert.equal(formatBytes(1024), "1.0 KB");
  assert.equal(formatBytes(1536), "1.5 KB");
  assert.equal(formatBytes(1024 * 1024 * 3.5), "3.5 MB");
  assert.equal(formatBytes(1024 ** 3 * 12), "12 GB");
  assert.equal(formatBytes(Number.NaN), "—", "a broken number must not render as a size");
});

test("speed and time left are blank rather than nonsense", () => {
  assert.equal(formatSpeed(0), "");
  assert.equal(formatSpeed(Number.NaN), "");
  assert.equal(formatSpeed(1024), "1.0 KB/s");
  assert.equal(formatEta(undefined), "");
  assert.equal(formatEta(0), "");
  assert.equal(formatEta(30), "30s left");
  assert.equal(formatEta(90), "2 min left");
  assert.equal(formatEta(7200), "2.0 hr left");
});

// ── states and controls ──────────────────────────────────────────────────

test("every state offers exactly the controls that make sense in it", () => {
  const running = entry({ state: "uploading" });
  assert.ok(canPause(running) && !canResume(running) && !canRemove(running));

  const paused = entry({ state: "paused" });
  assert.ok(canResume(paused) && !canPause(paused));

  // A paused upload whose file was lost to a reload cannot be resumed by a button —
  // it needs the file back, and offering resume would produce a click that does
  // nothing.
  const orphaned = entry({ state: "paused", needsFile: true });
  assert.equal(canResume(orphaned), false);

  const failed = entry({ state: "failed" });
  assert.ok(canRetry(failed) && canRemove(failed) && !canPause(failed));

  const done = entry({ state: "completed" });
  assert.ok(canRemove(done) && !canPause(done) && !canRetry(done));
  // Nothing terminal may be cancelled: "stop" on a finished upload is meaningless.
  assert.ok(isTerminal(done.state) && !isLive(done.state));
});

test("a lost file says so rather than showing a state it is not in", () => {
  assert.equal(stateLabel(entry({ state: "paused", needsFile: true })), "Waiting for the file");
  assert.equal(stateLabel(entry({ state: "processing" })), "Processing on the server");
});

test("progress is bounded, and a completed upload reads as complete", () => {
  assert.equal(progressOf(entry({ sentBytes: 250, size: 1000 })), 0.25);
  assert.equal(progressOf(entry({ state: "completed", sentBytes: 0 })), 1);
  assert.equal(progressOf(entry({ sentBytes: 5000, size: 1000 })), 1);
  assert.equal(progressOf(entry({ size: 0 })), 0, "a zero-length file must not divide by zero");
});

// ── restoring a queue ────────────────────────────────────────────────────

test("a stored queue is validated field by field", () => {
  const restored = parsePersisted([
    { id: "a", name: "a.mp4", size: 100, state: "uploading", sentBytes: 50, position: 0 },
    { id: "b", name: "b.mp4", size: 100, state: "nonsense", sentBytes: Number.NaN, position: 1 },
    { id: "", name: "c.mp4", size: 100 },
    { name: "d.mp4", size: 100 },
    { id: "e", name: "e.mp4", size: "big" },
    null,
    "not an entry",
  ]);
  assert.equal(restored.length, 2, "only the entries that survived validation");
  assert.equal(restored[0].sentBytes, 50);
  // An unknown state becomes paused rather than a row with no controls at all.
  assert.equal(restored[1].state, "paused");
  assert.equal(restored[1].sentBytes, 0, "a NaN must never reach a progress bar");
});

test("a corrupt or foreign blob restores nothing instead of throwing", () => {
  assert.deepEqual(parsePersisted(null), []);
  assert.deepEqual(parsePersisted("{}"), []);
  assert.deepEqual(parsePersisted({ entries: [] }), []);
});

test("sentBytes can never exceed the file", () => {
  const [e] = parsePersisted([{ id: "a", name: "a", size: 100, sentBytes: 999 }]);
  assert.equal(e.sentBytes, 100);
});

// ── reconciling with the server ──────────────────────────────────────────

const stored = (over: Record<string, unknown> = {}) => ({
  id: "a", sessionId: "s1", name: "a.mp4", size: 100, mime: "", destination: "Library",
  state: "paused" as const, sentBytes: 40, retries: 0, addedAt: 1, position: 0, ...over,
});

test("an upload that finished while the tab was closed is shown as finished", () => {
  const out = reconcile([stored()], [
    { id: "s1", filename: "a.mp4", size: 100, status: "completed", receivedBytes: 100, mediaId: 7 },
  ]);
  assert.equal(out[0].state, "completed");
  assert.equal(out[0].mediaId, 7);
  assert.equal(out[0].sentBytes, 100);
});

test("the server's byte count wins over the one we remembered", () => {
  // Ours was written before the last chunks landed; the server counted them.
  const out = reconcile([stored({ sentBytes: 40 })], [
    { id: "s1", filename: "a.mp4", size: 100, status: "open", receivedBytes: 80 },
  ]);
  assert.equal(out[0].sentBytes, 80);
  assert.equal(out[0].state, "paused");
});

test("an unfinished upload the server has forgotten stops claiming it can resume", () => {
  const out = reconcile([stored()], []);
  assert.equal(out[0].state, "failed");
  assert.match(out[0].error ?? "", /no longer has/);
});

test("finished history survives a server that has swept the session", () => {
  const out = reconcile([stored({ state: "completed", mediaId: 3 })], []);
  assert.equal(out[0].state, "completed");
  assert.equal(out[0].error, undefined);
});

test("a session started elsewhere appears here so it can be finished from here", () => {
  const out = reconcile([], [
    { id: "s9", filename: "phone.mp4", size: 900, status: "open", receivedBytes: 100 },
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].name, "phone.mp4");
  assert.equal(out[0].sessionId, "s9");
  assert.equal(out[0].sentBytes, 100);
});

test("a server-side failure carries its reason across the reload", () => {
  const out = reconcile([stored()], [
    { id: "s1", filename: "a.mp4", size: 100, status: "failed", receivedBytes: 100, error: "checksum mismatch" },
  ]);
  assert.equal(out[0].state, "failed");
  assert.equal(out[0].error, "checksum mismatch");
});

// ── ordering ─────────────────────────────────────────────────────────────

test("positions stay dense so moving up never silently does nothing", () => {
  const out = renumber([{ position: 5 }, { position: 2 }, { position: 9 }] as any);
  assert.deepEqual(out.map((e: any) => e.position), [0, 1, 2]);
});

test("reordering swaps pending uploads and leaves the running one alone", () => {
  const list: Entry[] = [
    entry({ id: "running", state: "uploading", position: 0 }),
    entry({ id: "x", state: "queued", position: 1 }),
    entry({ id: "y", state: "queued", position: 2 }),
  ];
  const moved = reorder(list, "y", -1);
  const at = (id: string) => moved.find((e) => e.id === id)!.position;
  assert.equal(at("y"), 1);
  assert.equal(at("x"), 2);
  assert.equal(at("running"), 0, "the upload already sending bytes does not move");
});

test("moving past either end is a no-op rather than an error", () => {
  const list: Entry[] = [entry({ id: "x", state: "queued", position: 0 })];
  assert.deepEqual(reorder(list, "x", -1), list);
  assert.deepEqual(reorder(list, "x", 1), list);
  assert.deepEqual(reorder(list, "missing", 1), list);
});
