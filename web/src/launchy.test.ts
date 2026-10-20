import { test } from "node:test";
import assert from "node:assert/strict";

const { awaitOutcome, downloadActive, launchyCan, launchyLink, launchyRunning, sinceLabel } = await import("./launchy.ts");

test("a link names the server and the code, and survives the trip through a URL", () => {
  const link = launchyLink("http://tower:8080/", "abc-DEF_123");
  assert.equal(link, "launchy://link?server=http%3A%2F%2Ftower%3A8080&code=abc-DEF_123");
  const back = new URL(link);
  assert.equal(back.protocol, "launchy:");
  assert.equal(back.host, "link");
  assert.equal(back.searchParams.get("server"), "http://tower:8080");
  assert.equal(back.searchParams.get("code"), "abc-DEF_123");
});

test("an old launcher that reports nothing can be asked for nothing but a launch", () => {
  const old = { connected: true, running: [], pending: 0 };
  assert.equal(launchyCan(old, "stop"), false);
  const current = { ...old, capabilities: ["stop", "sync"] };
  assert.equal(launchyCan(current, "stop"), true);
  assert.equal(launchyCan({ ...current, connected: false }, "stop"), false, "an offline launcher can do nothing");
});

test("a game counts as running whether the poll or the report says so", () => {
  const st = { connected: true, running: [3], pending: 0, sessions: [{ gameId: 7, title: "x", startedAt: 1 }] };
  assert.equal(launchyRunning(st, 3), true);
  assert.equal(launchyRunning(st, 7), true);
  assert.equal(launchyRunning(st, 9), false);
  assert.equal(launchyRunning({ ...st, connected: false }, 3), false, "an offline launcher is running nothing we know of");
});

test("a download is in hand until it is ready, failed or cancelled", () => {
  const d = (status: string) => ({ id: "1", title: "t", status, startedAt: 0 }) as Parameters<typeof downloadActive>[0];
  assert.equal(downloadActive(d("awaiting")), true);
  assert.equal(downloadActive(d("extracting")), true);
  assert.equal(downloadActive(d("done")), false);
  assert.equal(downloadActive(d("cancelled")), false);
});

test("last seen reads as a person would say it", () => {
  const now = 1_000_000_000_000;
  assert.equal(sinceLabel(undefined, now), "never");
  assert.equal(sinceLabel(now / 1000 - 10, now), "just now");
  assert.equal(sinceLabel(now / 1000 - 240, now), "4 min ago");
  assert.equal(sinceLabel(now / 1000 - 7200, now), "2 h ago");
});

test("waiting on a request returns its outcome, and gives up on a launcher that went away", async () => {
  const seq = ["sent", "sent", "done"];
  let i = 0;
  const cmd = (status: string) => ({ id: "c", action: "sync", gameId: 0, status, createdAt: 0 }) as never;
  const done = await awaitOutcome(async () => cmd(seq[Math.min(i++, seq.length - 1)]), "c", { sleep: async () => {} });
  assert.equal(done.status, "done");

  const never = await awaitOutcome(async () => cmd("sent"), "c", { timeout: 0, sleep: async () => {} });
  assert.equal(never.status, "failed");
  assert.match(never.error ?? "", /did not answer/);
});
