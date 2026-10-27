/**
 * Which passes the detailer runs: the faces, the hands, or both.
 *
 * It used to be one detector at a time, picked from a list that had "Hands" in it
 * beside the face models — so a picture whose hands came out wrong could have its
 * hands redone or its faces, never both in one run. ADetailer runs a pass per
 * detector in order (its tabs; InvokeAI's nodes chained the same way), so the two
 * are switches now, and the face pass keeps its choice of detector.
 */

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
