import type { ImageGenStatus } from "./api.ts";

/** What to call the generator. Forge speaks Automatic1111's API, so it is that backend,
    and only says otherwise here. */
export function generatorName(st: Pick<ImageGenStatus, "backend" | "forge"> | null | undefined): string {
  if (st?.backend === "invokeai") return "InvokeAI";
  if (st?.backend === "comfyui") return "ComfyUI";
  return st?.forge ? "Forge" : "Automatic1111";
}

/**
 * Why a generator's models can't be installed, edited or deleted from here, or "" when
 * they can. The Create screen and the Civitai browser both say it, and used to say
 * different things — the browser told an operator who had already mounted the folder
 * to "set" it, when what was actually wrong was the path. So the server says what it
 * found (`modelsDirProblem`) and both read it from one place.
 */
export function manageModelsNote(st: Pick<ImageGenStatus, "backend" | "manageModels" | "modelsDirProblem"> | null | undefined): string {
  if (st?.backend === "comfyui" && !st.manageModels) {
    return "ComfyUI has no API to install, edit or delete models, so OppaiLib does it in its folders. " +
      "Set them under Settings → Image generation → Video and those work here too, Civitai installs included.";
  }
  if (!st || st.manageModels || st.backend !== "a1111") return "";
  if (st.modelsDirProblem) {
    return `${st.modelsDirProblem}. Until then Automatic1111's models are listed and linked to Civitai, but can't be installed, edited or deleted from here.`;
  }
  return "Automatic1111 has no API to install, edit or delete models, so OppaiLib does it in its models folder. " +
    "Map that folder into the OppaiLib container at /a1111-models (or set where it is under Settings → Image generation) " +
    "and those work here too, Civitai installs included.";
}
