// How long each MISC square's clip runs, whether it loops, and what moves in it.
//
// An expression square's clip is idle life behind the chat — she breathes and blinks,
// for as long as the Motion tab says, round and round. A MISC square is a thing she is
// doing, and its clip has to fit how the app holds it. Most are states she stays in for
// minutes, so they loop, and short: a long loop is a long wait to see the seam, and
// what moves in typing or a sip of tea is a second or two of motion repeated. A few are
// moments the app plays once — greeting you, flinching at an error — and those last as
// long as the moment, then stop on their last frame.
//
// The motion sentence goes in front of the Motion tab's prompt, in place of its "holds
// her pose": that line is right for a face and wrong for someone typing.

export interface MiscMotion {
  /** The clip's length. */
  seconds: number;
  /** Whether it plays round (its last frame is its first) or once. */
  loop: boolean;
  /** What moves, as a sentence for the motion prompt. */
  motion: string;
}

export const MISC_MOTION: Readonly<Record<string, MiscMotion>> = {
  typing: { seconds: 2, loop: true, motion: "Her fingers tap quickly at the keys" },
  reading: { seconds: 4, loop: true, motion: "Her eyes move slowly along the lines of the page" },
  gaming: { seconds: 3, loop: true, motion: "Her thumbs work the buttons of the controller" },
  lounging: { seconds: 4, loop: true, motion: "She shifts lazily and settles back into the sofa" },
  drinking: { seconds: 3, loop: true, motion: "She lifts the mug, takes a slow sip and lowers it" },
  eating: { seconds: 3, loop: true, motion: "She takes a bite and chews contentedly" },
  stretching: { seconds: 3, loop: true, motion: "She stretches her arms higher, then eases back down" },
  napping: { seconds: 4, loop: true, motion: "She sleeps, her shoulders rising and falling with slow breaths" },
  dancing: { seconds: 2, loop: true, motion: "She sways her hips and shoulders to the music" },
  tidying: { seconds: 3, loop: true, motion: "She slides something onto the shelf and straightens it" },
  drawing: { seconds: 3, loop: true, motion: "Her pencil moves in small strokes across the sketchbook" },
  waving: { seconds: 2, loop: true, motion: "She waves her raised hand from side to side" },

  undressing: { seconds: 3, loop: true, motion: "She slowly slides her clothing down off her shoulder" },
  teasing: { seconds: 3, loop: true, motion: "She sways her hips slowly, watching the camera" },
  touching: { seconds: 3, loop: true, motion: "Her hands move slowly over her body" },
  rubbing: { seconds: 3, loop: true, motion: "Her hand rubs slowly between her thighs" },
  fingering: { seconds: 3, loop: true, motion: "Her fingers move rhythmically and her hips rock" },
  spread: { seconds: 3, loop: true, motion: "Her thighs tremble slightly as she holds the pose" },
  vibrator: { seconds: 3, loop: true, motion: "Her thighs quiver and press together around the vibrator" },
  dildo: { seconds: 3, loop: true, motion: "She moves the toy slowly and rhythmically" },
  riding: { seconds: 2, loop: true, motion: "She rises and sinks rhythmically, hips rolling" },
  grinding: { seconds: 2, loop: true, motion: "Her hips roll forward and back against the pillow" },
  climax: { seconds: 4, loop: true, motion: "Her whole body shudders and tenses in waves" },
  afterglow: { seconds: 4, loop: true, motion: "She lies still, breathing slowly, eyes drifting shut" },

  // The app's. Talking runs as long as a voice does, so it loops like typing; the
  // other two are moments, played once — as a call connects, and over an error's line.
  talking: { seconds: 2, loop: true, motion: "She talks to the camera, her lips moving as she speaks" },
  greeting: { seconds: 2, loop: false, motion: "She looks up, smiles and gives a small wave hello" },
  startled: { seconds: 1, loop: false, motion: "She flinches back in surprise" },
};

/** The phrase in the showcase this replaces. Kept in step with motion-presets.ts. */
const HOLD_POSE = "She holds her pose and moves only a little";

/**
 * The Motion tab's choices, made to fit one MISC square: its length and loop, and its
 * movement leading the prompt. An expression square, or a state with no entry here,
 * gets the form back as it is.
 */
export function miscClipForm<T extends { seconds: number; makeLoop: boolean; prompt: string }>(form: T, id: string): T {
  const fit = MISC_MOTION[id];
  if (!fit) return form;
  const rest = form.prompt
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => sentence.replace(/[.!?]+$/, "").trim().toLowerCase() !== HOLD_POSE.toLowerCase())
    .join(" ")
    .trim();
  return { ...form, seconds: fit.seconds, makeLoop: fit.loop, prompt: rest ? `${fit.motion}. ${rest}` : `${fit.motion}.` };
}

/** "2 s, loops" — how a square's clip is cut, for the panel beside it. */
export function miscMotionLabel(id: string): string {
  const fit = MISC_MOTION[id];
  return fit ? `${fit.seconds} s, ${fit.loop ? "loops" : "plays once"}` : "";
}
