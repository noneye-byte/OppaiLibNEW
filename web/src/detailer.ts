/**
 * Which passes the detailer runs: the faces, the hands, or both.
 *
 * It used to be one detector at a time, picked from a list that had "Hands" in it
 * beside the face models — so a picture whose hands came out wrong could have its
 * hands redone or its faces, never both in one run. ADetailer runs a pass per
 * detector in order (its tabs; InvokeAI's nodes chained the same way), so the two
 * are switches now, and the face pass keeps its choice of detector.
 */

import type { DetailerPassParams } from "./api.js";

export const HAND_DETECTOR = "hand_yolov8n.pt";
export const DEFAULT_FACE_DETECTOR = "face_yolov8n.pt";

/** The detectors the face pass can use. "Whole person" redoes the figure rather
    than the face, for a picture whose people are small. */
export const FACE_DETECTORS: { id: string; label: string }[] = [
  { id: "face_yolov8n.pt", label: "Face (fast)" },
  { id: "face_yolov8s.pt", label: "Face (accurate)" },
  { id: "mediapipe_face_full", label: "MediaPipe face" },
  { id: "person_yolov8n-seg.pt", label: "Whole person" },
];

export interface DetailerPasses {
  faces: boolean;
  /** The face pass's detector, kept while the face pass is off. */
  faceModel: string;
  hands: boolean;
}

/** The detectors to send, one per pass, faces first. Empty when both are off. */
export function detailerModels(p: DetailerPasses): string[] {
  const out: string[] = [];
  if (p.faces) out.push(p.faceModel || DEFAULT_FACE_DETECTOR);
  if (p.hands) out.push(HAND_DETECTOR);
  return out;
}

/**
 * The passes a stored choice stands for: a record's list of detectors, or the one
 * detector a draft or a picture from before the switches kept. A draft that had
 * "Hands" picked comes back as the hand pass alone, which is what it ran.
 */
export function passesFromModels(models: string[] | undefined, model: string | undefined): DetailerPasses {
  const names = models?.length ? models : model ? [model] : [DEFAULT_FACE_DETECTOR];
  const hands = names.includes(HAND_DETECTOR);
  const face = names.find((n) => n !== HAND_DETECTOR);
  return { faces: !!face, faceModel: face ?? DEFAULT_FACE_DETECTOR, hands };
}

/** What a "Fix …" button over a picture says it will redo. */
export function fixLabel(p: DetailerPasses): string {
  if (p.faces && p.hands) return "Fix faces & hands";
  if (p.hands) return "Fix hands";
  return "Fix faces";
}

/**
 * A pass of the detailer's own, after the faces and hands: a detector picked from
 * what ADetailer has — a YOLO model dropped into its folder that finds a part of a
 * body its own models never look for — redone with words and a LoRA of its own, the
 * LoRA that draws that part well. Blank words take the detail prompt.
 */
export interface CustomPass {
  model: string;
  prompt: string;
  lora: string;
  loraWeight: number;
  /** How far the pass may redraw its part; 0 takes the detailer's. */
  denoise: number;
}

/** The detectors face and hand passes already cover, so the custom pass list puts
    the others — the ones added for a reason — first. */
const BUILT_IN = new Set([HAND_DETECTOR, ...FACE_DETECTORS.map((d) => d.id)]);

/** The detectors a custom pass offers: the added ones first, ADetailer's own after. */
export function customDetectors(all: string[] | undefined): string[] {
  const names = [...new Set(all ?? [])];
  return [...names.filter((n) => !BUILT_IN.has(n)), ...names.filter((n) => BUILT_IN.has(n))];
}

/** A detector's file name as words: "nipples_yolov8s-seg.pt" → "nipples (yolov8s seg)". */
export function detectorLabel(name: string): string {
  const known = FACE_DETECTORS.find((d) => d.id === name);
  if (known) return known.label;
  if (name === HAND_DETECTOR) return "Hands";
  const stem = name.replace(/\.(pt|pth|safetensors|onnx)$/i, "");
  const yolo = stem.match(/^(.*?)[_\- ]?(yolo\w*(?:[-_ ]seg)?)$/i);
  const words = (s: string) => s.replace(/[_\-]+/g, " ").trim();
  if (yolo && yolo[1]) return `${words(yolo[1])} (${words(yolo[2])})`;
  return words(stem) || name;
}

/** The passes to send: the ones with a detector, in order. */
export function customPassParams(passes: CustomPass[]): DetailerPassParams[] {
  return passes
    .filter((p) => p.model.trim())
    .map((p) => ({
      model: p.model.trim(),
      prompt: p.prompt.trim() || undefined,
      loras: p.lora ? [{ name: p.lora, weight: p.loraWeight }] : undefined,
      denoise: p.denoise > 0 ? p.denoise : undefined,
    }));
}

/** Passes as a record or a picture's settings keep them, back into the controls. A
    pass that kept more than one LoRA keeps the first; the rest go into its words,
    which ADetailer reads LoRAs from as well. */
export function customPassesFrom(params: DetailerPassParams[] | undefined): CustomPass[] {
  return (params ?? []).filter((p) => p.model).map((p) => {
    const [first, ...rest] = p.loras ?? [];
    const extra = rest.map((l) => `<lora:${l.name}:${l.weight}>`).join(" ");
    return {
      model: p.model,
      prompt: [p.prompt ?? "", extra].filter(Boolean).join(" "),
      lora: first?.name ?? "",
      loraWeight: first?.weight ?? 0.8,
      denoise: p.denoise ?? 0,
    };
  });
}

/**
 * An icon for what a detector finds, read off its file name, so a pass card and the
 * detector list say "eyes" or "hands" at a glance rather than in a YOLO file name.
 * The parts a body detector is usually for go under one figure icon; anything the
 * name does not say gets a plain target.
 */
export function detectorIcon(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("hand")) return "back_hand";
  if (n.includes("eye")) return "visibility";
  if (n.includes("face") || n.includes("head")) return "face";
  if (n.includes("person") || n.includes("body")) return "person";
  if (n.includes("foot") || n.includes("feet") || n.includes("shoe")) return "footprint";
  if (n.includes("text") || n.includes("bubble") || n.includes("watermark")) return "chat_bubble";
  if (n.includes("lip") || n.includes("mouth") || n.includes("teeth")) return "sentiment_satisfied";
  if (/breast|booba|nipple|pussy|vagina|vulva|penis|anus|ass|butt/.test(n)) return "accessibility_new";
  return "center_focus_strong";
}

/** The detailer's passes in a line, in the order they run: "Faces · Hands · Eyes". */
export function passSummary(p: DetailerPasses, custom: CustomPass[], label: (model: string) => string = detectorLabel): string {
  const names: string[] = [];
  if (p.faces) names.push(p.faceModel === "person_yolov8n-seg.pt" ? "Whole person" : "Faces");
  if (p.hands) names.push("Hands");
  for (const c of custom) if (c.model.trim()) names.push(label(c.model));
  return names.join(" · ");
}

/** Everything the ADetailer drawer sets, as the studio keeps it. */
export interface DetailerValue extends DetailerPasses {
  enabled: boolean;
  prompt: string;
  negative: string;
  confidence: number;
  denoise: number;
  maskBlur: number;
  custom: CustomPass[];
}
