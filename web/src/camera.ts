/**
 * Camera and shot composition, compiled into generation instructions.
 *
 * The brief is specific about this: the selected camera style must be "converted into
 * generation instructions consistently rather than simply appended as uncontrolled
 * text". That distinction is the whole module, and it means three concrete things a
 * plain string append does not do.
 *
 * 1. A closed vocabulary. Each axis is an enum with one fixed phrase, so the same choice
 *    always produces the same tokens in the same order. Free text drifts — "close up",
 *    "closeup", "close-up shot" are three different conditionings — and a wardrobe built
 *    over several sittings is exactly where that drift shows up.
 *
 * 2. Negatives that follow from the choice. A close-up needs "full body" in the negative
 *    prompt, or the model splits the difference and frames a mid shot. Appending only
 *    positive terms is why camera prompts usually don't take: the model is being pulled
 *    two ways and nothing says which to drop. Every shot size here declares what it is
 *    *not*.
 *
 * 3. Instructions beyond the prompt. Portrait or landscape framing is a width and height,
 *    not a phrase — asking for "landscape framing" while generating 512×768 produces a
 *    tall image with the words ignored. The compiler returns the dimensions to use.
 *
 * The identity lock is here for the same reason. "Keep Libby's identity, body
 * proportions, and defining features stable unless the user intentionally changes them"
 * cannot be satisfied by a camera control that quietly reshapes the subject: a low angle
 * asks a model to exaggerate, and "extreme close-up" plus a body-type token is a
 * well-known way to get a different-looking person. So the identity terms are emitted
 * first — earliest tokens carry the most weight — and the drift terms most likely to
 * fight them are negated.
 */

/** How much of the subject is in frame. */
export type ShotSize =
  | "extreme-closeup"
  | "closeup"
  | "head-shoulders"
  | "bust"
  | "waist-up"
  | "three-quarter"
  | "full-body";

/** Where the camera is relative to the subject's eyeline. */
export type CameraAngle = "eye" | "low" | "high";

/** Which side of the subject faces the camera. */
export type CameraView = "front" | "three-quarter" | "side" | "rear";

/** The frame's orientation. */
export type Framing = "portrait" | "landscape" | "square";

/** Focal length, where the model responds to it. */
export type LensPreset = "none" | "wide-24" | "normal-50" | "portrait-85" | "tele-135";

export interface CameraSpec {
  shot: ShotSize;
  angle: CameraAngle;
  view: CameraView;
  framing: Framing;
  lens: LensPreset;
  /** When true, identity-stabilising terms are emitted and the drift terms that fight
      them are negated. Default on: the wardrobe use case needs the same person every
      time, and the user turning it off is the "intentionally changes them" case. */
  lockIdentity: boolean;
}

export const DEFAULT_CAMERA: CameraSpec = {
  shot: "full-body",
  angle: "eye",
  view: "front",
  framing: "portrait",
  lens: "none",
  lockIdentity: true,
};

/**
 * One shot size.
 *
 * `not` is the part that makes this work. Each entry names the framings it must exclude —
 * the neighbouring sizes a model would otherwise settle on — rather than a generic list,
 * because negating "close up" on a close-up shot would fight the positive term.
 */
const SHOTS: Record<ShotSize, { label: string; hint: string; prompt: string; not: string[] }> = {
  "extreme-closeup": {
    label: "Extreme close-up",
    hint: "Eyes and mouth fill the frame",
    prompt: "extreme close-up, face filling the frame, macro detail on the eyes",
    not: ["full body", "wide shot", "long shot", "cowboy shot", "upper body"],
  },
  closeup: {
    label: "Close-up",
    hint: "The face, little else",
    prompt: "close-up portrait, face and hair fill the frame",
    not: ["full body", "wide shot", "long shot", "cowboy shot"],
  },
  "head-shoulders": {
    label: "Head and shoulders",
    hint: "The classic portrait crop",
    prompt: "head and shoulders portrait, shoulders visible at the frame edge",
    not: ["full body", "wide shot", "long shot", "waist visible"],
  },
  bust: {
    label: "Bust shot",
    hint: "Head to upper chest",
    prompt: "bust shot, framed from the chest up",
    not: ["full body", "wide shot", "long shot", "legs", "feet"],
  },
  "waist-up": {
    label: "Waist-up",
    hint: "Head to waist, hands usable",
    prompt: "waist-up shot, upper body, cropped at the waist",
    not: ["full body", "long shot", "legs", "feet", "knees"],
  },
  "three-quarter": {
    label: "Three-quarter body",
    hint: "Head to mid-thigh",
    prompt: "three-quarter body shot, cowboy shot, cropped at mid-thigh",
    not: ["extreme close-up", "feet", "shoes"],
  },
  "full-body": {
    label: "Full body",
    hint: "Head to feet, whole figure",
    prompt: "full body shot, entire figure in frame, head to feet visible",
    // The two things that actually break a full-body shot: a crop, and a subject so
    // large it runs out of the frame.
    not: ["close-up", "cropped legs", "out of frame", "cropped head"],
  },
};

/** The positive-only framing phrase used by the outfit helper.
 *
 * The full camera compiler is intentionally comprehensive. Outfit slots only need
 * to say how much of Libby is visible, so exposing this one canonical phrase avoids
 * dragging camera setup and negative conditioning into every wardrobe image. */
export function outfitShotPrompt(shot: ShotSize): string {
  return SHOTS[shot].prompt;
}

const ANGLES: Record<CameraAngle, { label: string; prompt: string; not: string[] }> = {
  // Avoid naming physical camera gear in positive conditioning. Image models can read
  // "camera at eye height" as an object request and draw the camera into the scene.
  eye: { label: "Eye level", prompt: "eye level perspective, natural straight-on viewpoint", not: [] },
  low: {
    label: "Low angle",
    prompt: "low angle shot, viewed from below, looking upward",
    // A low angle is the classic way to get an unintended change of proportions: the
    // model reads "looking up at her" as an instruction to exaggerate.
    not: ["from above", "high angle", "distorted proportions", "giant"],
  },
  high: {
    label: "High angle",
    prompt: "high angle shot, viewed from above, looking downward",
    not: ["from below", "low angle", "distorted proportions"],
  },
};

const VIEWS: Record<CameraView, { label: string; prompt: string; not: string[] }> = {
  front: { label: "Front", prompt: "front view, facing viewer", not: ["from behind", "back view"] },
  "three-quarter": {
    label: "Three-quarter",
    prompt: "three-quarter view, body turned at a slight angle",
    not: ["from behind"],
  },
  side: { label: "Side", prompt: "side view, profile, from the side", not: ["front view", "facing viewer"] },
  rear: {
    label: "Rear",
    prompt: "from behind, back view, facing away from viewer",
    // A rear view is the one where a model most often cheats by turning the face back
    // toward the lens, which ruins the shot for a wardrobe slot.
    not: ["front view", "facing viewer", "looking at viewer", "face visible"],
  },
};

const LENSES: Record<LensPreset, { label: string; prompt: string }> = {
  none: { label: "Unspecified", prompt: "" },
  "wide-24": { label: "24mm wide", prompt: "24mm wide angle lens, deep focus" },
  "normal-50": { label: "50mm normal", prompt: "50mm lens, natural perspective" },
  "portrait-85": { label: "85mm portrait", prompt: "85mm portrait lens, shallow depth of field, blurred background" },
  "tele-135": { label: "135mm telephoto", prompt: "135mm telephoto lens, compressed perspective, bokeh" },
};

/**
 * Identity terms, emitted first when the lock is on.
 *
 * Deliberately about *structure* rather than appearance — hair colour and eye colour
 * belong to the character prompt, and repeating them here would fight it. What this
 * pins is the thing camera controls actually disturb: proportions and the sense that
 * it is the same person.
 */
const IDENTITY_PROMPT = "consistent character design, same face, consistent facial features, " +
  "consistent body proportions, anatomically consistent";

/** What identity drift looks like, so it can be negated. */
const IDENTITY_NEGATIVE = "inconsistent face, different person, face morphing, " +
  "deformed proportions, distorted anatomy, extra limbs, malformed hands, " +
  "changed body type, altered hairstyle";

/** Positive shot terms occasionally make a model literalise the photography setup.
 * Keep the subject alone by excluding the equipment and operator explicitly. */
const EQUIPMENT_NEGATIVE = "camera, camera body, camera lens, photography equipment, " +
  "tripod, photographer, studio equipment, boom microphone";

/** The dimensions a framing implies, at each family's native scale.
 *
 * Two scales because SD 1.x trains at ~512 and SDXL at ~1024, and asking either to work
 * far from its own scale is the fastest way to a duplicated head. The caller passes which
 * one it is already using, so switching framing never silently moves the model off the
 * resolution it was set up for. */
const SIZES: Record<Framing, { sd: [number, number]; xl: [number, number] }> = {
  portrait: { sd: [512, 768], xl: [832, 1216] },
  landscape: { sd: [768, 512], xl: [1216, 832] },
  square: { sd: [512, 512], xl: [1024, 1024] },
};

/** What the compiler produces: terms to add, terms to negate, and the frame to use. */
export interface CompiledCamera {
  prompt: string;
  negative: string;
  width: number;
  height: number;
}

/**
 * Compiles a camera spec.
 *
 * `scale` says which resolution family the current model belongs to, so framing maps to
 * dimensions that model was trained for. Callers derive it from the pixel count they are
 * already generating at rather than from the checkpoint's name, which is unreliable.
 */
export function compileCamera(spec: CameraSpec, scale: "sd" | "xl" = "sd"): CompiledCamera {
  const shot = SHOTS[spec.shot];
  const angle = ANGLES[spec.angle];
  const view = VIEWS[spec.view];
  const lens = LENSES[spec.lens];

  // Order is deliberate: identity first (earliest tokens weigh most, and it is the thing
  // that must survive), then framing, then the camera's own attributes.
  const prompt = dedupe([
    ...(spec.lockIdentity ? [IDENTITY_PROMPT] : []),
    shot.prompt,
    view.prompt,
    angle.prompt,
    lens.prompt,
  ]);

  const negative = dedupe([
    ...(spec.lockIdentity ? [IDENTITY_NEGATIVE] : []),
    EQUIPMENT_NEGATIVE,
    ...shot.not,
    ...view.not,
    ...angle.not,
  ]);

  const [width, height] = SIZES[spec.framing][scale];
  return { prompt, negative, width, height };
}

/**
 * Joins comma-separated fragments, dropping repeats.
 *
 * Repeats matter more than tidiness here: a term that appears twice is weighted twice by
 * every backend this talks to, so an accidental duplicate silently strengthens one
 * instruction over the others. Two axes can legitimately want the same negative — a rear
 * view and a side view both exclude "front view" — so this is a real case, not a
 * theoretical one.
 */
function dedupe(fragments: string[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const fragment of fragments) {
    for (const raw of fragment.split(",")) {
      const term = raw.trim();
      if (!term) continue;
      const key = term.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(term);
    }
  }
  return out.join(", ");
}

/** Which resolution family a size belongs to. Derived from the pixel count rather than
    the checkpoint name, because names lie and the pixel count is what the model is
    actually being asked for. */
export function scaleFor(width: number, height: number): "sd" | "xl" {
  return width * height >= 800 * 800 ? "xl" : "sd";
}

/** The option lists, for the UI. Exported from here so the labels and the compiled terms
    can never disagree about what exists. */
export const CAMERA_OPTIONS = {
  shots: (Object.keys(SHOTS) as ShotSize[]).map((id) => ({
    id,
    label: SHOTS[id].label,
    hint: SHOTS[id].hint,
  })),
  angles: (Object.keys(ANGLES) as CameraAngle[]).map((id) => ({ id, label: ANGLES[id].label })),
  views: (Object.keys(VIEWS) as CameraView[]).map((id) => ({ id, label: VIEWS[id].label })),
  lenses: (Object.keys(LENSES) as LensPreset[]).map((id) => ({ id, label: LENSES[id].label })),
  framings: (Object.keys(SIZES) as Framing[]).map((id) => ({
    id,
    label: id === "portrait" ? "Portrait" : id === "landscape" ? "Landscape" : "Square",
  })),
} as const;
