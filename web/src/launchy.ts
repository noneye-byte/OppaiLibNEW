import type { LaunchCommand, LaunchyDownload, LaunchyStatus } from "./api.js";

/**
 * The parts of talking to Launchy that are not drawing: the link that opens it,
 * what it can be asked, and waiting for it to answer. Kept out of the components so
 * the viewer, the settings panel and the Games tab agree on them, and so they can be
 * tested without a browser.
 */

/**
 * The link that opens Launchy on this PC and links it. The server address is the
 * one this page was loaded from — the address the person clicking can reach, which
 * is the one Launchy on the same PC will reach too. The code is single use and
 * short-lived; the key it buys never appears in a link.
 */
export function launchyLink(origin: string, code: string): string {
  return `launchy://link?server=${encodeURIComponent(origin.replace(/\/+$/, ""))}&code=${encodeURIComponent(code)}`;
}

/** Whether the launcher is connected and says it can do this. An older launcher
 *  reports nothing, and can only launch. */
export function launchyCan(st: LaunchyStatus | null | undefined, capability: string): boolean {
  return !!st?.connected && (st.capabilities ?? []).includes(capability);
}

/** Whether the launcher is running this game, by either of the two ways it says so. */
export function launchyRunning(st: LaunchyStatus | null | undefined, gameId: number): boolean {
  if (!st?.connected) return false;
  return st.running.includes(gameId) || (st.sessions ?? []).some((s) => s.gameId === gameId);
}

/** A download still in hand — waiting on the browser, or being filed away. */
export function downloadActive(d: LaunchyDownload): boolean {
  return d.status === "awaiting" || d.status === "importing" || d.status === "extracting";
}

export const DOWNLOAD_STATUS_LABELS: Record<LaunchyDownload["status"], string> = {
  awaiting: "Waiting for the browser",
  importing: "Filing away",
  extracting: "Extracting",
  done: "Ready",
  failed: "Failed",
  cancelled: "Cancelled",
};

/** "just now", "4 min ago", "2 h ago" — for when Launchy last checked in. */
export function sinceLabel(unixSeconds: number | undefined, now = Date.now()): string {
  if (!unixSeconds) return "never";
  const s = Math.max(0, Math.round(now / 1000 - unixSeconds));
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}

export interface WaitOptions {
  /** Between checks. */
  interval?: number;
  /** Gives up after this long and reports it, rather than spinning forever. */
  timeout?: number;
  sleep?: (ms: number) => Promise<void>;
}

/**
 * Waits for a request to be done or to fail. A launcher that never picks it up is
 * reported as such after `timeout` — the server already refuses a request when the
 * launcher is offline, so this is the rare case of one that went away mid-request.
 */
export async function awaitOutcome(
  fetch: (id: string) => Promise<LaunchCommand>,
  id: string,
  { interval = 1000, timeout = 60_000, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }: WaitOptions = {},
): Promise<LaunchCommand> {
  const deadline = Date.now() + timeout;
  for (;;) {
    const cmd = await fetch(id);
    if (cmd.status === "done" || cmd.status === "failed") return cmd;
    if (Date.now() >= deadline) {
      return { ...cmd, status: "failed", error: "Launchy did not answer — is it still running on the PC?" };
    }
    await sleep(interval);
  }
}
