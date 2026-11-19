// The models a clip's background can be cut with in ComfyUI, by the ComfyUI-RMBG nodes.
//
// The server holds the same list (imagegen.ClipCutModels in comfy_rmbg.go), which is the
// one that counts: it refuses a name not on it and says so in the studio. This copy is
// for the Settings menu to offer and explain them, in the same order, default first.

export interface ClipCutModel {
  id: string;
  label: string;
  help: string;
}

export const CLIP_CUT_MODELS: readonly ClipCutModel[] = [
  {
    id: "BiRefNet_toonout",
    label: "ToonOut (anime)",
    help: "BiRefNet trained again on anime art, which she is: clean round hair and hands where the general models leave the backdrop in them. Downloads itself on first use.",
  },
  {
    id: "VRMBG-3.0",
    label: "VRMBG-3.0 (video)",
    help: "Bria's video model, run on your card: each frame's cut follows the one before it, so her edge does not shimmer. It does not download itself — put its four files from huggingface.co/briaai/VRMBG-3.0 in ComfyUI/models/RMBG/VRMBG-3.0. Bria's licence is for non-commercial use.",
  },
  {
    id: "BEN2",
    label: "BEN2",
    help: "A general model, good on hair and fine edges. Downloads itself on first use.",
  },
  {
    id: "RMBG-2.0",
    label: "RMBG-2.0",
    help: "Bria's still-picture model, a frame at a time. Downloads itself on first use; its licence is for non-commercial use.",
  },
  {
    id: "BiRefNet-HR-matting",
    label: "BiRefNet HR matting",
    help: "BiRefNet at high resolution, trained for soft edges. Slower and heavier on the card. Downloads itself on first use.",
  },
  {
    id: "BiRefNet-general",
    label: "BiRefNet general",
    help: "The plain BiRefNet. Downloads itself on first use.",
  },
];

/** clipCutModelHelp explains the model Settings name, the default when they name none
    or one no longer offered (which the server will say it refuses). */
export function clipCutModelHelp(id: string | undefined): string {
  const found = CLIP_CUT_MODELS.find((m) => m.id === (id || CLIP_CUT_MODELS[0].id));
  return found ? found.help : `"${id}" is not one of the models offered — pick one of these.`;
}
