/**
 * Cutting the people the trainer found out of a comic's panels.
 *
 * The trainer runs ADetailer's person segmentation model over one panel and answers
 * with each person's box and outline, in the panel's pixels (trainer/detect.py). A
 * training picture of a character wants her and nothing else, so a person is kept as
 * her box, a little wider so a hand or a lock of hair at the edge is not lost, with
 * everything outside her outline laid on a plain white or black — the panel's other
 * people, its speech balloons, its screentone background. The drawing is the
 * browser's (views/lora-comic.ts); where things go is worked out here.
 */

import type { Rect } from "./comic-panels.js";

export interface DetectedPerson {
  box: [number, number, number, number];
  score: number;
  outline: [number, number][];
}

/** How sure the detector has to be, as the screen offers it. */
export const SURENESS: { id: string; label: string; conf: number }[] = [
  { id: "strict", label: "Only clear ones", conf: 0.5 },
  { id: "normal", label: "Most", conf: 0.3 },
  { id: "loose", label: "Everyone it can", conf: 0.15 },
];

/** Under this on its shorter side a person is too small to teach anything. */
export const MIN_PERSON_SIDE = 64;

/** A person's box on the page: widened by `margin` of its own size each way and kept
    inside the panel it was found in. */
export function personRect(box: DetectedPerson["box"], panel: Rect, margin = 0.06): Rect {
  const [x0, y0, x1, y1] = box;
  const mx = (x1 - x0) * margin;
  const my = (y1 - y0) * margin;
  const left = Math.max(0, Math.floor(x0 - mx));
  const top = Math.max(0, Math.floor(y0 - my));
  const right = Math.min(panel.w, Math.ceil(x1 + mx));
  const bottom = Math.min(panel.h, Math.ceil(y1 + my));
  return { x: panel.x + left, y: panel.y + top, w: Math.max(1, right - left), h: Math.max(1, bottom - top) };
}

/** The outline moved from the panel's pixels onto the page's. */
export function outlineOnPage(outline: DetectedPerson["outline"], panel: Rect): [number, number][] {
  return outline.map(([x, y]) => [panel.x + x, panel.y + y]);
}

/** The people worth keeping: sure enough, and big enough to train on. */
export function keptPeople(people: DetectedPerson[], conf: number): DetectedPerson[] {
  return people.filter((p) => {
    const [x0, y0, x1, y1] = p.box;
    return p.score >= conf && Math.min(x1 - x0, y1 - y0) >= MIN_PERSON_SIDE;
  });
}

/**
 * How far the outline is grown before it masks, in the cut's pixels: the model's
 * outline runs along the inside of an inked line, and cutting exactly on it shaves
 * the line off. About half a percent of the cut, at least two pixels.
 */
export function outlineGrow(rect: Rect): number {
  return Math.max(2, Math.round(Math.max(rect.w, rect.h) * 0.006));
}
