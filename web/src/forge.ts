import type { ForgeFamily, ForgeParams, ForgeSlot, GenModel, ImageGenStatus } from "./api.js";

/**
 * What the studio holds for Forge Neo, and how it is said.
 *
 * The server works out most of a run for itself (imagegen/forge.go): a checkpoint's
 * text encoders, its sampler, its shift. So everything here is an override, and a form
 * left alone sends nothing: choices at their defaults go out as no `forge` field at all,
 * and a run drawn by someone who has never opened the panel is the family's own.
 */

export interface ForgeChoices {
  /** The noise schedule; "" is the family's. */
  scheduler: string;
  /** The family's shift or distilled CFG; 0 is the family's. */
  shift: number;
  /** Text encoders and VAE picked over the server's, by file name. */
  modules: string[];
  /** An input picture is a reference to edit from, not a start to draw over. */
  asReference: boolean;
  refiner: string;
  /** Of the steps, 0–1. */
  refinerAt: number;
  spectrum: boolean;
  sparse: boolean;
  offload: boolean;
  tiledVae: boolean;
  rescaleCfg: number;
  mahiro: boolean;
  /** A PiD checkpoint to finish the picture with. */
  pid: string;
}

export const NO_FORGE_CHOICES: ForgeChoices = {
  scheduler: "", shift: 0, modules: [], asReference: false, refiner: "", refinerAt: 0.8,
  spectrum: false, sparse: false, offload: false, tiledVae: false, rescaleCfg: 0, mahiro: false, pid: "",
};

/** The family a checkpoint belongs to, as this Forge has it. */
export function familyFor(status: ImageGenStatus | null | undefined, model: GenModel | undefined): ForgeFamily | undefined {
  if (!model?.family) return undefined;
  const key = model.family === "flux2" && model.variant === "9b" ? "flux2-9b" : model.family;
  return status?.forgeFamilies?.find((f) => f.key === key);
}

/** The choices as a run sends them: nothing, unless something was changed. References
    are the studio's own, being pictures, and go in beside these. */
export function forgeParams(c: ForgeChoices, family: ForgeFamily | undefined, references: string[] = []): ForgeParams | undefined {
  const out: ForgeParams = {};
  if (c.scheduler) out.scheduler = c.scheduler;
  if (c.shift > 0 && family?.tune) out.shift = c.shift;
  if (c.modules.length) out.modules = c.modules;
  if (c.asReference && family?.reference) out.asReference = true;
  if (references.length && family?.reference) out.references = references;
  if (c.refiner) {
    out.refiner = c.refiner;
    out.refinerAt = c.refinerAt;
  }
  if (c.spectrum) out.spectrum = true;
  if (c.sparse) out.sparse = true;
  if (c.offload) out.offload = true;
  if (c.tiledVae) out.tiledVae = true;
  if (c.rescaleCfg > 0) out.rescaleCfg = c.rescaleCfg;
  if (c.mahiro) out.mahiro = true;
  if (c.pid) out.pid = c.pid;
  return Object.keys(out).length ? out : undefined;
}

/** How a family's one extra number is said. Forge has a single field for two ideas. */
export function tuneLabel(tune: string | undefined): string {
  if (tune === "distilled") return "Distilled CFG";
  return tune === "shift" ? "Shift" : "";
}

/** The slots a family is short of. */
export function missingSlots(family: ForgeFamily | undefined): ForgeSlot[] {
  return (family?.needs ?? []).filter((s) => !s.have.length);
}

export type NeedsState = "ready" | "get" | "downloading" | "restart";

/** Where a family stands. A file on the disk that Forge has not read is a state of its
    own: a download offered then would only fetch the same file again, and nothing
    would change until Forge is restarted. */
export function needsState(family: ForgeFamily | undefined): NeedsState {
  const missing = missingSlots(family);
  if (!missing.length) return "ready";
  if (family?.downloading) return "downloading";
  return missing.every((s) => s.onDisk) ? "restart" : "get";
}

function gigabytes(gb: number): string {
  return gb < 1 ? `${Math.round(gb * 1000)} MB` : `${gb.toFixed(gb < 10 ? 1 : 0)} GB`;
}

/** What to tell someone about a family that cannot draw yet, in a sentence. */
export function needsLine(family: ForgeFamily | undefined): string {
  const missing = missingSlots(family);
  if (!missing.length || !family) return "";
  const names = missing.map((s) => s.label);
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0];
  switch (needsState(family)) {
    case "restart":
      return `${list} ${names.length > 1 ? "are" : "is"} in the folder, but Forge reads it only when it starts. Restart Forge, or press the refresh button beside its checkpoint list.`;
    case "downloading":
      return `Fetching ${list}…`;
  }
  const size = missing.filter((s) => !s.onDisk).reduce((sum, s) => sum + (s.get?.gb ?? 0), 0);
  return `${family.label} needs ${list} beside it${size ? ` — ${gigabytes(size)} to fetch` : ""}.`;
}

/** Forge's names for a sampler, with one it does not list kept as an option: a saved
    draft or a recipe from Civitai can hold a name that is still good, and a select
    with no option for its value shows nothing while still sending it. */
export function samplerOptions(names: string[] | undefined, current: string): string[] {
  const list = names ?? [];
  return current && !list.includes(current) ? [current, ...list] : list;
}
