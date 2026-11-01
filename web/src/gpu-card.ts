// Saying who has the graphics card, for the studio's switch (views/gpu-switch.ts).
//
// The server knows which program it last gave the card to and what each says it
// holds (api/gpu_switch.go); what is worked out here is how that reads in a header
// button a few words wide.

import type { GpuApp, GpuState } from "./api.js";

/** The short name a program goes by on the button. */
export const GPU_SHORT: Record<GpuApp["id"], string> = { chat: "Chat", images: "Pictures", video: "Video" };

/** Who the card is with, as the button says it: the program given it last, else the
    one program that says it holds a model, else nobody in particular. */
export function cardHolder(state: GpuState | null): GpuApp["id"] | "" {
  if (!state) return "";
  if (state.holder && state.apps.some((a) => a.id === state.holder && a.set)) return state.holder;
  const holding = state.apps.filter((a) => a.set && a.holding);
  return holding.length === 1 ? holding[0].id : "";
}

/** The card's memory in use, "21.4 of 32 GB used", or "" when ComfyUI didn't say. */
export function vramText(state: GpuState | null): string {
  const total = state?.vramTotal ?? 0;
  if (total <= 0) return "";
  const used = Math.max(0, total - (state?.vramFree ?? 0));
  const gb = (n: number) => (n / 1024 ** 3).toFixed(n >= 10 * 1024 ** 3 ? 0 : 1);
  return `${gb(used)} of ${gb(total)} GB used`;
}

/** The share of the card's memory in use, 0–1. */
export function vramShare(state: GpuState | null): number {
  const total = state?.vramTotal ?? 0;
  return total > 0 ? Math.min(1, Math.max(0, (total - (state?.vramFree ?? 0)) / total)) : 0;
}
