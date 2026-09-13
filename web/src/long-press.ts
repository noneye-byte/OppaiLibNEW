// Press-and-hold as a right-click.
//
// The app's menus open on `contextmenu`, which a mouse sends on right-click and
// most touch browsers send on a long-press — but not all of them, and not reliably
// on every element: iOS Safari sends none, and Chrome on Android offers the
// image-save sheet instead when the finger lands on an <img>. The phone app has had
// hold-to-open-a-sheet on every tile since it existed; the web on the same phone
// had a gesture that sometimes did nothing.
//
// So a hold is detected here from pointer events, which every browser sends the
// same way, and turned into the one event the menus already listen for. Views need
// no second code path: the synthetic `contextmenu` travels the same composed route
// through the same shadow roots to the same handler.

/** How long a finger stays down before it means "menu". Matches Android's default. */
const HOLD_MS = 500;
/** Movement past this many pixels is a scroll or a drag, not a hold. */
const SLOP_PX = 8;
/** After a hold opens the menu, a native `contextmenu` or `click` inside this window
    is the same gesture reporting twice, and is swallowed. */
const ECHO_MS = 800;

/**
 * Wires hold-to-menu onto a host. Returns a function that unwires it.
 *
 * Only touch and pen pointers count: a mouse has a right button, and holding the
 * left one is how a drag starts.
 */
export function attachLongPress(host: HTMLElement): () => void {
  let timer = 0;
  let start: { x: number; y: number; target: EventTarget | null; pointerId: number } | null = null;
  let firedAt = 0;

  const cancel = () => {
    window.clearTimeout(timer);
    timer = 0;
    start = null;
  };

  const onDown = (event: PointerEvent) => {
    if (event.pointerType === "mouse" || !event.isPrimary) return;
    cancel();
    // The deepest node under the finger, so the synthetic event's composed path is
    // the one a real right-click there would have had.
    start = { x: event.clientX, y: event.clientY, target: event.composedPath()[0] ?? event.target, pointerId: event.pointerId };
    timer = window.setTimeout(() => {
      const at = start;
      cancel();
      if (!at) return;
      firedAt = Date.now();
      try { navigator.vibrate?.(12); } catch { /* not every device buzzes */ }
      (at.target as EventTarget).dispatchEvent(new MouseEvent("contextmenu", {
        bubbles: true, composed: true, cancelable: true,
        clientX: at.x, clientY: at.y, button: 2,
      }));
    }, HOLD_MS);
  };

  const onMove = (event: PointerEvent) => {
    if (!start || event.pointerId !== start.pointerId) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > SLOP_PX) cancel();
  };

  const onEnd = (event: PointerEvent) => {
    if (start && event.pointerId === start.pointerId) cancel();
  };

  // A browser that does send its own contextmenu on long-press sends it right about
  // when ours fires; one of the two is enough. Likewise the click a touch browser
  // synthesises on lift-off after a hold would open the item under the menu.
  const onEcho = (event: Event) => {
    if (Date.now() - firedAt < ECHO_MS && event.isTrusted) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };

  host.addEventListener("pointerdown", onDown);
  host.addEventListener("pointermove", onMove);
  host.addEventListener("pointerup", onEnd);
  host.addEventListener("pointercancel", onEnd);
  host.addEventListener("contextmenu", onEcho, true);
  host.addEventListener("click", onEcho, true);
  return () => {
    cancel();
    host.removeEventListener("pointerdown", onDown);
    host.removeEventListener("pointermove", onMove);
    host.removeEventListener("pointerup", onEnd);
    host.removeEventListener("pointercancel", onEnd);
    host.removeEventListener("contextmenu", onEcho, true);
    host.removeEventListener("click", onEcho, true);
  };
}
