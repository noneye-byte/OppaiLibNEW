import { api, setToken, type User } from "./api.js";

/**
 * The browser half of WebAuthn.
 *
 * Almost all of this file is base64url conversion, and that is not incidental: the
 * WebAuthn JavaScript API deals in ArrayBuffers while JSON deals in strings, so every
 * value crossing that boundary has to be converted in exactly the way the other side
 * expects. Getting one of them wrong produces an opaque browser-side failure with no
 * useful message — which is why the conversions live here, once, rather than inline at
 * each call.
 *
 * The base64 flavour matters. WebAuthn uses base64url (`-` and `_`, no padding); plain
 * base64 will decode to different bytes and the server will reject the assertion as
 * forged. `atob`/`btoa` speak standard base64 only, so the translation is explicit.
 */

/** Whether this browser can do WebAuthn at all. */
export function passkeysSupported(): boolean {
  return typeof PublicKeyCredential !== "undefined" && !!navigator.credentials?.create;
}

/**
 * Whether a passkey might be offered without the user naming an account.
 *
 * Used to decide whether to show a "Sign in with a passkey" button before anything is
 * typed. It is a hint, not a promise: a browser that says yes may still find nothing,
 * which is why the button handles an empty result rather than treating it as an error.
 */
export async function conditionalPasskeysAvailable(): Promise<boolean> {
  try {
    if (!passkeysSupported()) return false;
    const cls = PublicKeyCredential as unknown as {
      isConditionalMediationAvailable?: () => Promise<boolean>;
    };
    if (!cls.isConditionalMediationAvailable) return false;
    return await cls.isConditionalMediationAvailable();
  } catch {
    return false;
  }
}

// Pinned to ArrayBuffer rather than the default ArrayBufferLike: WebAuthn's BufferSource
// will not accept a view over a SharedArrayBuffer, which is what the looser type admits.
function base64urlToBytes(value: string): Uint8Array<ArrayBuffer> {
  // Back to standard base64, then pad: atob rejects an unpadded string.
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const full = padded + "=".repeat((4 - (padded.length % 4)) % 4);
  const raw = atob(full);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function bytesToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let raw = "";
  // Chunked rather than String.fromCharCode(...bytes): spreading a large attestation
  // object blows the argument limit, which shows up only on the authenticators that
  // return big responses.
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    raw += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** The server's creation options, with the base64url fields the browser needs as bytes. */
interface ServerCreationOptions {
  publicKey: {
    challenge: string;
    user: { id: string; name: string; displayName: string };
    excludeCredentials?: { id: string; type: string; transports?: string[] }[];
    [key: string]: unknown;
  };
}

interface ServerRequestOptions {
  publicKey: {
    challenge: string;
    allowCredentials?: { id: string; type: string; transports?: string[] }[];
    [key: string]: unknown;
  };
}

/** Registers a new passkey for the signed-in user. Returns the created entry. */
export async function registerPasskey(name: string) {
  const begin = await api.beginPasskeyRegistration();
  const options = (begin.options as ServerCreationOptions).publicKey;

  const publicKey: PublicKeyCredentialCreationOptions = {
    ...(options as unknown as PublicKeyCredentialCreationOptions),
    challenge: base64urlToBytes(options.challenge),
    user: {
      ...options.user,
      id: base64urlToBytes(options.user.id),
    },
    excludeCredentials: (options.excludeCredentials ?? []).map((c) => ({
      ...c,
      id: base64urlToBytes(c.id),
      type: "public-key" as const,
      transports: c.transports as AuthenticatorTransport[] | undefined,
    })),
  };

  const credential = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential | null;
  if (!credential) throw new Error("No passkey was created.");
  const response = credential.response as AuthenticatorAttestationResponse;

  return api.finishPasskeyRegistration(begin.ceremony, name, {
    id: credential.id,
    rawId: bytesToBase64url(credential.rawId),
    type: credential.type,
    // Present on a platform authenticator and absent on some security keys; the server
    // treats it as a hint either way.
    authenticatorAttachment: credential.authenticatorAttachment ?? undefined,
    clientExtensionResults: credential.getClientExtensionResults(),
    response: {
      clientDataJSON: bytesToBase64url(response.clientDataJSON),
      attestationObject: bytesToBase64url(response.attestationObject),
      transports: response.getTransports?.() ?? [],
    },
  });
}

/**
 * Signs in with a passkey.
 *
 * `username` is optional. Without it the ceremony is discoverable: the authenticator
 * offers whatever it holds for this site and nothing has to be typed, which is the
 * whole appeal.
 *
 * `mediation: "conditional"` fills a passkey from the browser's own autofill UI rather
 * than a modal, and is only used when the caller asks — a conditional request that
 * finds nothing waits silently forever, so it must never be the path a button takes.
 */
export async function loginWithPasskey(
  username?: string,
  opts: { mediation?: CredentialMediationRequirement; signal?: AbortSignal } = {},
): Promise<{ token: string; user: User }> {
  const begin = await api.beginPasskeyLogin(username);
  const options = (begin.options as ServerRequestOptions).publicKey;

  const publicKey: PublicKeyCredentialRequestOptions = {
    ...(options as unknown as PublicKeyCredentialRequestOptions),
    challenge: base64urlToBytes(options.challenge),
    allowCredentials: (options.allowCredentials ?? []).map((c) => ({
      ...c,
      id: base64urlToBytes(c.id),
      type: "public-key" as const,
      transports: c.transports as AuthenticatorTransport[] | undefined,
    })),
  };

  const credential = (await navigator.credentials.get({
    publicKey,
    mediation: opts.mediation,
    signal: opts.signal,
  })) as PublicKeyCredential | null;
  if (!credential) throw new Error("No passkey was offered.");
  const response = credential.response as AuthenticatorAssertionResponse;

  const result = await api.finishPasskeyLogin(begin.ceremony, {
    id: credential.id,
    rawId: bytesToBase64url(credential.rawId),
    type: credential.type,
    authenticatorAttachment: credential.authenticatorAttachment ?? undefined,
    clientExtensionResults: credential.getClientExtensionResults(),
    response: {
      clientDataJSON: bytesToBase64url(response.clientDataJSON),
      authenticatorData: bytesToBase64url(response.authenticatorData),
      signature: bytesToBase64url(response.signature),
      // Present only for a discoverable credential — it is how the server learns which
      // account signed in without being told.
      userHandle: response.userHandle ? bytesToBase64url(response.userHandle) : undefined,
    },
  });
  setToken(result.token);
  return result;
}

/**
 * Turns a WebAuthn failure into something worth showing.
 *
 * The API throws DOMExceptions whose messages are either empty or browser-specific
 * boilerplate, and showing those verbatim is how "NotAllowedError" ends up in front of
 * a user. The cases below are the ones that actually happen.
 */
export function passkeyErrorMessage(error: unknown): string {
  const e = error as DOMException & { name?: string; message?: string };
  switch (e?.name) {
    case "NotAllowedError":
      // Covers both "the user dismissed the prompt" and "it timed out", which the API
      // deliberately does not distinguish — telling them apart would leak whether a
      // credential existed.
      return "Cancelled, or it timed out. Try again when you're ready.";
    case "InvalidStateError":
      return "That device already has a passkey for this account.";
    case "NotSupportedError":
      return "This device can't create the kind of passkey the server asked for.";
    case "SecurityError":
      return "The browser refused: passkeys need HTTPS, and the address has to match the one the passkey was created for.";
    case "AbortError":
      return "";
    default:
      return e?.message || "That didn't work. Password sign-in still does.";
  }
}
