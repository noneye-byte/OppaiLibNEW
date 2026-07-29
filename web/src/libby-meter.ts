// Libby's session progression. The visible art still uses five integer tiers, but
// movement is accumulated as a float so 0.5× means two ordinary nudges per tier.
const INTENSITY_KEY = "oppai_libby_intensity";
const PROGRESS_KEY = "oppai_libby_progress";
const MULTIPLIER_KEY = "oppai_libby_progression_multiplier";

export const LIBBY_MAX_INTENSITY = 5;
export const LIBBY_PROGRESSION_MULTIPLIERS = [0.25, 0.5, 1, 2] as const;

export function getProgressionMultiplier(): number {
  const value = Number(localStorage.getItem(MULTIPLIER_KEY) ?? "0.5");
  return LIBBY_PROGRESSION_MULTIPLIERS.includes(value as never) ? value : 0.5;
}

export function setProgressionMultiplier(value: number): number {
  const selected = LIBBY_PROGRESSION_MULTIPLIERS.includes(value as never) ? value : 0.5;
  localStorage.setItem(MULTIPLIER_KEY, String(selected));
  window.dispatchEvent(new CustomEvent("oppai-libby-progression", { detail: { multiplier: selected } }));
  return selected;
}

export function applyProgression(progress: number, delta: number): { progress: number; intensity: number } {
  const next = Math.max(1, Math.min(LIBBY_MAX_INTENSITY, progress + delta * getProgressionMultiplier()));
  return { progress: next, intensity: Math.max(1, Math.min(LIBBY_MAX_INTENSITY, Math.floor(next + 1e-6))) };
}

function getProgress(): number {
  const stored = Number(sessionStorage.getItem(PROGRESS_KEY));
  if (Number.isFinite(stored) && stored >= 1 && stored <= LIBBY_MAX_INTENSITY) return stored;
  const legacy = Number(sessionStorage.getItem(INTENSITY_KEY) ?? "1");
  return Number.isFinite(legacy) ? Math.max(1, Math.min(LIBBY_MAX_INTENSITY, legacy)) : 1;
}

export function getIntensity(): number {
  return applyProgression(getProgress(), 0).intensity;
}

/** Direct controls and model synchronization set an exact tier. */
export function setIntensity(value: number): number {
  const exact = Math.max(1, Math.min(LIBBY_MAX_INTENSITY, Math.round(value)));
  return store(exact, exact);
}

/** Program events move by the configured fractional multiplier. */
export function bumpIntensity(delta = 1): number {
  const next = applyProgression(getProgress(), delta);
  return store(next.progress, next.intensity);
}

export function tierForIntensity(value: number = getIntensity()): number {
  return Math.max(1, Math.min(LIBBY_MAX_INTENSITY, Math.round(value))) - 1;
}

function store(progress: number, intensity: number): number {
  try {
    sessionStorage.setItem(PROGRESS_KEY, String(progress));
    sessionStorage.setItem(INTENSITY_KEY, String(intensity));
  } catch { /* private-mode storage can be unavailable */ }
  window.dispatchEvent(new CustomEvent("oppai-libby-meter", { detail: { intensity, progress } }));
  return intensity;
}
