// How Libby moves.
//
// Her artwork is a still sprite per mood, which is all a pixel-art cast ever gets —
// so the life has to come from how the sprite is *handled*: it steps in rather than
// fading, it breathes while it waits, it rocks when she says something, and it
// jolts when something goes wrong. That is the whole vocabulary, and it is shared
// so she moves the same way in the popup, on the login screen, beside the chat log,
// and in a call. Four hand-rolled variants would drift into four different
// characters.
//
// Everything here is stepped rather than eased. Smooth interpolation on a pixel
// sprite reads as a smooth image being nudged around; steps() reads as animation.
// Shadow DOM means each host has to include these styles itself.

import { css } from "lit";

export const libbyMotion = css`
  /* Arrival: she steps in from the side and settles, the way a sprite is placed
     rather than faded up. */
  @keyframes libby-enter {
    0%   { opacity: 0; transform: translate(14px, 8px) scale(0.9); }
    60%  { opacity: 1; transform: translate(0, -2px) scale(1.03); }
    100% { opacity: 1; transform: translate(0, 0) scale(1); }
  }
  /* Idle: two frames of breathing. Deliberately tiny and slow — anything more and
     a static portrait starts to look like it is bobbing in water. */
  @keyframes libby-breathe {
    0%, 100% { transform: translateY(0) scaleY(1); }
    50%      { transform: translateY(-1.5%) scaleY(1.006); }
  }
  /* Speaking: a single rock into the line, as though she leaned in to say it. */
  @keyframes libby-speak {
    0%   { transform: translateY(0) rotate(0deg); }
    25%  { transform: translateY(-4%) rotate(-0.8deg); }
    55%  { transform: translateY(1%) rotate(0.5deg); }
    100% { transform: translateY(0) rotate(0deg); }
  }
  /* Something went wrong: a hard horizontal jolt, no easing at all. */
  @keyframes libby-startle {
    0%, 100% { transform: translateX(0); }
    20%      { transform: translateX(-5px); }
    45%      { transform: translateX(4px); }
    70%      { transform: translateX(-2px); }
  }
  /* A new pose replacing the old one. Paired with lit's keyed(), which swaps the
     element on a mood change so this replays instead of the src mutating silently. */
  @keyframes libby-mood-in {
    from { opacity: 0; transform: scale(1.04); }
    to   { opacity: 1; transform: scale(1); }
  }
  /* The blinking "there is more" marker on a dialogue box. */
  @keyframes libby-caret {
    0%, 49%   { opacity: 1; }
    50%, 100% { opacity: 0; }
  }

  .libby-enter   { animation: libby-enter 0.22s steps(4, end) both; }
  .libby-breathe { animation: libby-breathe 4.2s steps(6, end) infinite; }
  .libby-speak   { animation: libby-speak 0.42s steps(5, end) 1; }
  .libby-startle { animation: libby-startle 0.34s steps(2, end) 2; }
  .libby-mood    { animation: libby-mood-in 0.24s steps(3, end) both; }
  .libby-caret   { animation: libby-caret 1s steps(1, end) infinite; }

  /* Composed animations need a single element each: breathing lives on a wrapper so
     a speak or startle on the sprite inside it does not cancel the idle loop. */
  .libby-still { animation: none !important; }

  @media (prefers-reduced-motion: reduce) {
    .libby-enter, .libby-breathe, .libby-speak, .libby-startle, .libby-mood, .libby-caret {
      animation: none !important;
    }
  }
`;

/**
 * How long to spend revealing a line of dialogue, in milliseconds.
 *
 * Per character, with a ceiling: a typewriter that is honest about length makes a
 * long line unreadable for two seconds before it is even finished. The ceiling is
 * what keeps it a flourish rather than a wait.
 */
export function typeDuration(text: string): number {
  return Math.min(900, text.length * 16);
}
