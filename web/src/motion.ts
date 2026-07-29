/**
 * Shared motion helpers.
 *
 * The app already had enter animations. What it had no way to express were the three
 * things that actually make an interface feel considered rather than merely animated:
 *
 *  - **Exits.** A dialog that fades in and then vanishes is worse than one that does
 *    neither, because the asymmetry reads as a dropped frame. Lit removes an element the
 *    moment its state changes, so an exit has to be awaited before the removal — which
 *    is what `playExit` is for.
 *  - **Collapse without layout thrash.** Animating `height` requires measuring, forces
 *    layout on every frame, and reflows everything below. `grid-template-rows: 0fr → 1fr`
 *    animates the same effect with no measurement and no JavaScript.
 *  - **Honouring the OS.** `prefers-reduced-motion` is checked in one place, and every
 *    helper here degrades to "do the thing immediately" rather than "do a shorter
 *    animation". Reduced motion is a request for no motion, not less of it.
 *
 * The rule the brief states and this file keeps: an animation may never delay an
 * interaction. Every duration here is under a fifth of a second, exits are capped, and
 * nothing waits on an animation before applying state the user asked for — `playExit`
 * resolves early rather than hanging if an animation never fires.
 */

/** Whether the operating system has asked for reduced motion.
 *
 * Read on each call rather than cached: the setting can change while the app is open,
 * and a cached answer would keep animating for the rest of the session. */
export function reducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/** How long an exit is allowed to hold up a removal. Deliberately short — this is time
    the user spends waiting for something they already asked for. */
const EXIT_TIMEOUT_MS = 260;

/**
 * Runs an exit animation on `el`, then resolves.
 *
 * Resolves immediately under reduced motion, and resolves on a timer if no animation
 * ever starts — a missing class, a `display: none` ancestor or a browser that skips the
 * animation must not leave a dialog on screen forever. That fallback is the important
 * part: the failure mode of awaiting an animation is a UI that never closes.
 */
export function playExit(el: Element | null | undefined, className = "anim-exit"): Promise<void> {
  if (!el || reducedMotion()) return Promise.resolve();
  return new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      el.removeEventListener("animationend", finish);
      el.classList.remove(className);
      resolve();
    };
    el.addEventListener("animationend", finish, { once: true });
    el.classList.add(className);
    // Belt and braces: animationend does not fire if the animation was never applied.
    setTimeout(finish, EXIT_TIMEOUT_MS);
  });
}

/**
 * Wraps a state change in a View Transition where the browser supports one.
 *
 * Used for tab and page changes, which are the transitions a cross-fade genuinely helps:
 * the whole pane is replaced, and without one the swap is a hard cut. Everything smaller
 * is better served by an element-level animation.
 *
 * Progressive by design — Firefox has no support at the time of writing — and the
 * callback runs synchronously either way, so behaviour never depends on the API being
 * there. Skipped entirely under reduced motion.
 */
export function withViewTransition(update: () => void): void {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (reducedMotion() || typeof doc.startViewTransition !== "function") {
    update();
    return;
  }
  doc.startViewTransition(update);
}

/**
 * Marks an element as newly arrived, for one animation only.
 *
 * Message arrival is the case: a class in the template would replay on every re-render,
 * so a chat log would re-animate every message whenever anything changed. This stamps
 * the element once and removes the class when the animation ends, which is also what
 * stops a long-lived list from carrying a hundred "new" markers.
 */
export function markArrival(el: Element | null | undefined, className = "anim-arrive"): void {
  if (!el || reducedMotion()) return;
  el.classList.add(className);
  el.addEventListener("animationend", () => el.classList.remove(className), { once: true });
}
