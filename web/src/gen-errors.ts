/**
 * A generator's failure, said so it can be acted on.
 *
 * What reaches the studio is the generator's own reply, wrapped: "image generator
 * returned 500: {"error":"RuntimeError","detail":"","body":"","errors":"Expected all
 * tensors…"}". The line that matters is buried in JSON, and the few failures that
 * keep coming back have a known way out that the message never says. This pulls the
 * reason out, names the known ones, and keeps the whole text for copying.
 */

export interface StudioError {
  /** What went wrong, in a line. */
  message: string;
  /** What to do about it, when that is known. */
  hint?: string;
  /** Offer to restart Automatic1111 from the alert. */
  restart?: boolean;
  /** Everything the server said, for copying into a bug report. */
  raw: string;
}

/** The reason inside an A1111/Forge error body, or the text as it came. */
function reasonOf(raw: string): string {
  const brace = raw.indexOf("{");
  if (brace >= 0) {
    try {
      const body = JSON.parse(raw.slice(brace)) as Record<string, unknown>;
      const parts = [body.errors, body.detail, body.error].filter((v): v is string => typeof v === "string" && v.trim() !== "");
      if (parts.length) {
        const kind = typeof body.error === "string" && body.error !== parts[0] ? `${body.error}: ` : "";
        return kind + parts[0];
      }
    } catch {
      // Not JSON after all; the text stands.
    }
  }
  return raw.trim();
}

export function explainGenError(raw: string): StudioError {
  const reason = reasonOf(raw);
  if (/expected all tensors to be on the same device/i.test(raw)) {
    return {
      message: "Automatic1111 has its model split between the CPU and the GPU.",
      hint: "It happens after A1111 lets go of its checkpoint — for a clip, or for Libby's model — and brings it back only half way. " +
        "OppaiLib already reloaded it and tried once more. Restarting A1111 clears it; if it keeps coming back after clips, turn off " +
        "“Unload the image model while a clip renders” in Settings → Image generation → Video.",
      restart: true,
      raw,
    };
  }
  if (/out of memory|CUDA error: out of memory|OutOfMemoryError/i.test(raw)) {
    return {
      message: "The graphics card ran out of memory.",
      hint: "Try a smaller size, fewer pictures per run, or no hires fix — or let something else on the card (a clip, Libby's model) finish first.",
      raw,
    };
  }
  return { message: reason || "Something went wrong.", raw };
}
