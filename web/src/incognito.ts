/**
 * Incognito: the app dressed as a Nextcloud instance.
 *
 * A private media library is a thing you may not want to explain. With this on,
 * the sign-in page, the tab's title and icon, the server's response headers and
 * the endpoints a scanner probes all answer as Nextcloud; inside, the mascot is
 * absent and errors are plain notices rather than dialogue. Signing in with real
 * credentials still opens the real library.
 *
 * It is a *server* setting, not a per-device preference like hiding Libby: half
 * of the disguise is the server (headers, decoy endpoints, the served HTML), and
 * one that only some of your browsers wear is not a disguise. Which is also why
 * this module does not read localStorage — the answer arrives with the page.
 *
 * The signal is a <meta> tag the server injects into the shell. That matters more
 * than it looks: it is known in the first frame, before any request, so the
 * sign-in page is never briefly the wrong one. A settings fetch could not do
 * that, and an inline script would need a hole in the CSP.
 */

const META_SELECTOR = 'meta[name="oppai-mode"]';

/**
 * Set when the mode is changed from Settings, so the running tab can follow
 * without a reload. Null means "nobody has changed it here; believe the page".
 */
let override: boolean | null = null;

function fromDocument(): boolean {
  return document.querySelector(META_SELECTOR)?.getAttribute("content") === "incognito";
}

export function isIncognito(): boolean {
  return override ?? fromDocument();
}

/**
 * Applies a change made in Settings to the tab that made it.
 *
 * The server is already the authority — the next load gets the right shell
 * either way — so this exists purely so the toggle *does something visible* when
 * you flip it. It repaints the identity and tells every mounted view to
 * re-render, which is how the mascot leaves (or returns) without a reload.
 */
export function setIncognito(on: boolean): void {
  override = on;
  applyIncognitoIdentity();
  window.dispatchEvent(new CustomEvent("oppai-incognito", { detail: { incognito: on } }));
  // Views that already listen for the Libby preference get this for free, which
  // is the point of routing both through one predicate. See libbyHidden().
  window.dispatchEvent(new CustomEvent("oppai-libby-pref", { detail: { incognito: on } }));
}

/** The tab's identity under each mode. */
const IDENTITY = {
  incognito: { title: "Nextcloud", icon: "/cloud-icon.svg", theme: "#0082c9", manifest: "/cloud.webmanifest" },
  plain: { title: "OppaiLib", icon: "/icon.svg", theme: "#191410", manifest: "/manifest.webmanifest" },
} as const;

/**
 * Repaints title, favicon, theme colour and manifest for the current mode.
 *
 * Only needed after a live toggle: a fresh load already has the right shell from
 * the server. The favicon href is given a version query because a browser that
 * has the old icon cached will otherwise keep drawing it in the tab strip — the
 * one place the disguise most needs to be right.
 */
export function applyIncognitoIdentity(): void {
  const id = isIncognito() ? IDENTITY.incognito : IDENTITY.plain;
  document.title = id.title;
  const stamp = `?v=${Date.now()}`;
  for (const link of document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"], link[rel="apple-touch-icon"]')) {
    link.type = "image/svg+xml";
    link.removeAttribute("sizes");
    link.href = id.icon + stamp;
  }
  const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (manifest) manifest.href = id.manifest;
  const theme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (theme) theme.content = id.theme;
  // Keep the document's own answer in step with the override, so anything that
  // reads the tag directly (or a view mounted after this ran) agrees.
  let mode = document.querySelector<HTMLMetaElement>(META_SELECTOR);
  if (!mode) {
    mode = document.createElement("meta");
    mode.name = "oppai-mode";
    document.head.appendChild(mode);
  }
  mode.content = isIncognito() ? "incognito" : "plain";
}
