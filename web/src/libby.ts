// Libby presentation preference. Per-device, like the theme: whether the mascot
// appears is about who's looking at this screen, not about the library, so it lives
// in localStorage and needs no save step or admin rights.
//
// Hiding Libby removes the artwork and persona, not the features: errors that would
// have been spoken by the mascot still appear as plain notices, and Chat keeps
// working without her portrait.

const HIDE_KEY = "oppai_hide_libby";
const OUTFIT_KEY = "oppai_libby_outfit";

export function loadHideLibby(): boolean {
  return localStorage.getItem(HIDE_KEY) === "1";
}

/**
 * Whether the user has chosen to hide Libby on this device.
 *
 * Incognito deliberately does not participate here. Its Nextcloud disguise covers
 * the signed-out surface, but once a real user authenticates they get the complete
 * OppaiLib experience, including Libby.
 */
export function libbyHidden(): boolean {
  return loadHideLibby();
}

export function saveHideLibby(hide: boolean): void {
  try {
    localStorage.setItem(HIDE_KEY, hide ? "1" : "0");
  } catch {
    /* ignore quota / private-mode errors */
  }
  // Views that are already on screen (the chat sidebar, the error popup) listen for
  // this so the toggle applies immediately, not on the next page load.
  window.dispatchEvent(new CustomEvent("oppai-libby-pref", { detail: { hidden: hide } }));
}

// Which outfit Libby wears, per-device like hiding her. Empty string means the
// default art that ships with the app. The images themselves come from the server
// (see api.libbyEmotionURL); an outfit that lacks an emotion 404s and the views
// fall back to the default art via the image's error handler.

export function loadLibbyOutfit(): string {
  return localStorage.getItem(OUTFIT_KEY) ?? "";
}

export function saveLibbyOutfit(id: string): void {
  try {
    if (id) localStorage.setItem(OUTFIT_KEY, id);
    else localStorage.removeItem(OUTFIT_KEY);
  } catch {
    /* ignore quota / private-mode errors */
  }
  window.dispatchEvent(new CustomEvent("oppai-libby-pref", { detail: { outfit: id } }));
}

/**
 * The image to show for one of Libby's emotions: the worn outfit's art when an
 * outfit is selected, else the bundled default. Callers should keep the default
 * as an @error fallback, since an outfit may not cover every emotion.
 */
export function libbyEmotionSrc(emotion: string): string {
  const outfit = loadLibbyOutfit();
  const mood = normalizeEmotion(emotion);
  if (!outfit) return defaultLibbyArt(mood);
  return `/api/libby/outfits/${encodeURIComponent(outfit)}/emotions/${encodeURIComponent(mood)}`;
}

/** The bundled wardrobe's horniness tiers, in the file names, indexed by intensity 1..5. */
const DEFAULT_TIERS = ["calm", "warm", "flirty", "heated", "peak"] as const;

/**
 * The bundled wardrobe: every emotion drawn at every intensity tier, so nothing
 * here needs a fallback and no mood has to borrow another's face.
 *
 * The art is a full export from the outfit generator rather than hand-named files —
 * see /Libby_Default/outfit-manifest.json, which is what the set was exported with
 * and describes the loadout it draws.
 */
export function defaultLibbyArt(emotion: string, intensity = 1): string {
  const tier = DEFAULT_TIERS[normalizeIntensity(intensity) - 1];
  return `/Libby_Default/default-libby-${tier}-${normalizeEmotion(emotion)}.png`;
}

/**
 * The hottest tier Libby is drawn at outside a conversation.
 *
 * The heat meter is a *chat* thing — it belongs to a conversation you chose to
 * have. The sign-in page and the pop-up she speaks through are ambient: they
 * appear over whatever you were doing, unasked, on a screen that may well have
 * someone else in the room. So the heated (4) and peak (5) artwork never shows
 * there, whatever the meter says in Chat. The bundled art keeps her dressed right
 * up to heated and only undresses at peak, but the rule is about where a picture
 * appears rather than about how much of it is bare, so the cap stays where it is.
 */
export const AMBIENT_MAX_INTENSITY = 3;

export function ambientIntensity(value?: number): number {
  return Math.min(AMBIENT_MAX_INTENSITY, normalizeIntensity(value));
}

/**
 * Everything Libby can feel. The bundled wardrobe draws every one of them at every
 * horniness tier, so each mood has a face of its own: she can look shy rather than
 * merely surprised, and an outfit can draw that shyness too.
 *
 * The first five lead deliberately — they are the moods every outfit should cover,
 * and the outfit editor lays its slots out in this order.
 *
 * Kept in step with the server's libbyEmotions (handlers_libby.go), which decides
 * which slots an outfit may store art in and which moods a reply may declare.
 */
export const LIBBY_EMOTIONS = [
  "neutral", "happy", "mischievous", "surprised", "thinking",
  "shy", "smug", "sad", "annoyed", "sleepy", "loving", "excited",
] as const;

export type LibbyEmotion = (typeof LIBBY_EMOTIONS)[number];

/**
 * Which emotion each one is closest to, for *outfits* only.
 *
 * The bundled art needs no such table any more, but a user's outfit may well cover
 * only the first few moods. Falling from its "shy" to its own "surprised" keeps her
 * in the costume the user chose, which beats dropping straight to the default art.
 *
 * Mirrors libbyNearestPose server-side and nearestPose in LibbyPortrait.kt.
 */
const NEAREST_POSE: Record<LibbyEmotion, string> = {
  neutral: "neutral", happy: "happy", mischievous: "mischievous",
  surprised: "surprised", thinking: "thinking",
  shy: "surprised", smug: "mischievous", sad: "thinking", annoyed: "thinking",
  sleepy: "neutral", loving: "happy", excited: "happy",
};

/** Labels for the settings and outfit UIs. The ids are lowercase words; these are
    what a person reads next to a slot. */
export const EMOTION_LABELS: Record<LibbyEmotion, string> = {
  neutral: "Neutral", happy: "Happy", mischievous: "Mischievous",
  surprised: "Surprised", thinking: "Thinking",
  shy: "Shy", smug: "Smug", sad: "Sad", annoyed: "Annoyed",
  sleepy: "Sleepy", loving: "Loving", excited: "Excited",
};
export type LibbyTone = "success" | "error";

export interface LibbyCue {
  message: string;
  tone: LibbyTone;
  emotion: LibbyEmotion;
  intensity: number;
  outfit?: string;
}

// Libby's mood is carried by her artwork and her wording, not by a label: her
// speech deliberately shows no emoji and no "emotion N" readout.

export function normalizeEmotion(value?: string): LibbyEmotion {
  let emotion = (value ?? "").trim().toLowerCase();
  if (emotion === "default") emotion = "neutral";
  // Legacy names from before the vocabulary grew. "sad" is a real emotion now and is
  // deliberately no longer folded into thinking.
  if (emotion === "worried") emotion = "thinking";
  if (emotion === "horniness") emotion = "mischievous";
  return (LIBBY_EMOTIONS as readonly string[]).includes(emotion)
    ? emotion as LibbyEmotion
    : "neutral";
}

export function normalizeIntensity(value?: number): number {
  return Math.max(1, Math.min(5, Math.round(Number(value) || 1)));
}

/** Outfit uploads may be GIF or PNG; the server preserves their media type. */
export function libbyAssetCandidates(emotion?: string, intensity?: number, outfit = loadLibbyOutfit()): string[] {
  const mood = normalizeEmotion(emotion);
  const level = normalizeIntensity(intensity);
  const paths: string[] = [];
  if (outfit && outfit !== "default") {
    // Outfits can carry a separate image per horniness tier (server levels 0..4,
    // where level = intensity-1). Try the tier for this intensity and every calmer
    // one down to the baseline, so a tier the user never drew shows a cooler pose.
    //
    // The exact emotion is tried first and its nearest kin second, so an outfit that
    // has "surprised" but not "shy" shows *its own* surprised art rather than
    // dropping to the bundled wardrobe. Skipping that step would mean adding a
    // finer emotion silently undressed every existing outfit whenever she felt it.
    for (const slot of [...new Set([mood, NEAREST_POSE[mood]])]) {
      const outfitBase = `/api/libby/outfits/${encodeURIComponent(outfit)}/emotions/${encodeURIComponent(slot)}`;
      for (let tier = level - 1; tier >= 1; tier--) paths.push(`${outfitBase}?level=${tier}`);
      paths.push(outfitBase); // level 0, the suffix-free baseline
    }
  }
  // The bundled wardrobe is complete — every emotion at every tier — so the last
  // two entries are the end of the chain. There is deliberately no third fallback:
  // the pre-pixel mascot art it used to land on is gone, and a chain that ends on a
  // file which is not in the build is a broken image, not a safety net.
  paths.push(defaultLibbyArt(mood, level), defaultLibbyArt("neutral", level));
  return [...new Set(paths)];
}

export function inferErrorEmotion(message: string): Pick<LibbyCue, "emotion" | "intensity"> {
  const text = message.toLowerCase();
  if (/timed? out|unreachable|network|offline|couldn.t reach|connection/.test(text)) return { emotion: "thinking", intensity: 4 };
  if (/unauthori[sz]ed|session ended|sign in|password|login/.test(text)) return { emotion: "thinking", intensity: 3 };
  if (/invalid|missing|required|not found|doesn.t exist/.test(text)) return { emotion: "thinking", intensity: 2 };
  if (/failed|error|couldn.t|can.t/.test(text)) return { emotion: "surprised", intensity: 3 };
  return { emotion: "thinking", intensity: 2 };
}

export function applyImageFallback(img: HTMLImageElement, candidates: string[]) {
  const next = Number(img.dataset.fallbackIndex || "0") + 1;
  if (next >= candidates.length) return;
  img.dataset.fallbackIndex = String(next);
  img.src = candidates[next];
}
