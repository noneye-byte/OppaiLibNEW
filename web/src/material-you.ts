import {
  Hct,
  SchemeExpressive,
  SchemeFruitSalad,
  SchemeMonochrome,
  SchemeNeutral,
  SchemeRainbow,
  SchemeTonalSpot,
  SchemeVibrant,
  argbFromHex,
  hexFromArgb,
  type DynamicScheme,
} from "@material/material-color-utilities";

// Material You for the web UI: the whole palette worked out from one colour, the way
// Android builds a phone's colours from its wallpaper.
//
// The app on the phone already follows the phone (Theme.kt, dynamicColor); the browser
// cannot see the wallpaper, so here the colour is picked — from swatches like Android's
// own "Basic colors", or any colour at all — along with one of Android's palette styles.
// The scheme comes from Google's material-color-utilities, which is the same HCT
// algorithm Android runs, so a seed gives the colours it would give on a Pixel.
//
// The hand-tuned orange palette in theme.ts stays the default. A seed overrides both
// halves of it: the --md-sys-color-* tokens Material Web reads, and the --oppai-* ones
// the shell reads, each derived from the same roles so the two never disagree.

/** Android's palette styles, by the names its wallpaper picker gives them. */
export type YouStyle = "tonal" | "vibrant" | "expressive" | "neutral" | "rainbow" | "fruit" | "mono";

export const YOU_STYLES: { id: YouStyle; label: string }[] = [
  { id: "tonal", label: "Tonal spot" },
  { id: "vibrant", label: "Vibrant" },
  { id: "expressive", label: "Expressive" },
  { id: "neutral", label: "Neutral" },
  { id: "rainbow", label: "Rainbow" },
  { id: "fruit", label: "Fruit salad" },
  { id: "mono", label: "Monochrome" },
];

/** What is picked. A null seed is OppaiLib's own palette. */
export interface YouPref {
  seed: string | null;
  style: YouStyle;
}

export const DEFAULT_YOU: YouPref = { seed: null, style: "tonal" };

/** Seeds to pick from without a colour picker, spread round the wheel. */
export const YOU_SEEDS: { name: string; hex: string }[] = [
  { name: "Red", hex: "#e53935" },
  { name: "Pink", hex: "#d81b60" },
  { name: "Purple", hex: "#6750a4" },
  { name: "Indigo", hex: "#3f51b5" },
  { name: "Blue", hex: "#1e88e5" },
  { name: "Teal", hex: "#00897b" },
  { name: "Green", hex: "#43a047" },
  { name: "Olive", hex: "#9e9d24" },
  { name: "Amber", hex: "#ffb300" },
  { name: "Brown", hex: "#795548" },
];

/** A seed as the picker stores it, or null for anything that is not a #rrggbb colour. */
export function cleanSeed(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(v) ? v : null;
}

/** A stored preference read back defensively: storage is user-editable and outlives versions. */
export function readYouPref(raw: string | null): YouPref {
  try {
    const v = JSON.parse(raw ?? "null") as Partial<YouPref> | null;
    const style = YOU_STYLES.some((s) => s.id === v?.style) ? (v!.style as YouStyle) : DEFAULT_YOU.style;
    return { seed: cleanSeed(v?.seed), style };
  } catch {
    return { ...DEFAULT_YOU };
  }
}

function schemeFor(seed: string, style: YouStyle, dark: boolean): DynamicScheme {
  const hct = Hct.fromInt(argbFromHex(seed));
  switch (style) {
    case "vibrant": return new SchemeVibrant(hct, dark, 0);
    case "expressive": return new SchemeExpressive(hct, dark, 0);
    case "neutral": return new SchemeNeutral(hct, dark, 0);
    case "rainbow": return new SchemeRainbow(hct, dark, 0);
    case "fruit": return new SchemeFruitSalad(hct, dark, 0);
    case "mono": return new SchemeMonochrome(hct, dark, 0);
    default: return new SchemeTonalSpot(hct, dark, 0);
  }
}

/**
 * Every colour token the app reads, for one seed, style and brightness.
 *
 * The --oppai-* names were first picked by hand against the orange palette, so a few
 * have no role of their own in M3 and are read off a tone instead, at the tone the
 * hand-picked colour sits at: the brighter primary used for small text and icons on
 * dark, the muted text between the variant text and the outline, and the hairline
 * border a step above the page.
 */
export function youTokens(seed: string, style: YouStyle, dark: boolean): Record<string, string> {
  const s = schemeFor(seed, style, dark);
  const hex = (argb: number) => hexFromArgb(argb).toUpperCase();
  const md: Record<string, number> = {
    primary: s.primary, "on-primary": s.onPrimary,
    "primary-container": s.primaryContainer, "on-primary-container": s.onPrimaryContainer,
    secondary: s.secondary, "on-secondary": s.onSecondary,
    "secondary-container": s.secondaryContainer, "on-secondary-container": s.onSecondaryContainer,
    tertiary: s.tertiary, "on-tertiary": s.onTertiary,
    surface: s.surface, "surface-dim": s.surfaceDim, "surface-bright": s.surfaceBright,
    "surface-container-lowest": s.surfaceContainerLowest, "surface-container-low": s.surfaceContainerLow,
    "surface-container": s.surfaceContainer, "surface-container-high": s.surfaceContainerHigh,
    "surface-container-highest": s.surfaceContainerHighest,
    "on-surface": s.onSurface, "on-surface-variant": s.onSurfaceVariant,
    outline: s.outline, "outline-variant": s.outlineVariant,
    error: s.error, "on-error": s.onError,
    background: s.background, "on-background": s.onBackground,
  };
  const out: Record<string, string> = {};
  for (const [name, argb] of Object.entries(md)) out[`--md-sys-color-${name}`] = hex(argb);

  const shell: Record<string, number> = dark
    ? {
        bg: s.surface, nav: s.surfaceContainerLow, "nav-hover": s.neutralPalette.tone(17),
        surface: s.surfaceContainer, "surface-2": s.surfaceContainerHigh,
        accent: s.secondaryContainer, "on-accent": s.onSecondaryContainer,
        primary: s.primary, "primary-bright": s.primaryPalette.tone(90),
        "primary-container": s.primaryContainer, "on-primary": s.onPrimary,
        text: s.onSurface, "text-dim": s.onSurfaceVariant, "text-muted": s.neutralVariantPalette.tone(65),
        border: s.neutralPalette.tone(17), "border-strong": s.outlineVariant, fav: s.error,
      }
    : {
        bg: s.surface, nav: s.surfaceContainerLow, "nav-hover": s.surfaceContainerHigh,
        surface: s.surfaceContainer, "surface-2": s.surfaceContainerHigh,
        accent: s.secondaryContainer, "on-accent": s.onSecondaryContainer,
        primary: s.primary, "primary-bright": s.primary,
        "primary-container": s.primaryContainer, "on-primary": s.onPrimary,
        text: s.onSurface, "text-dim": s.onSurfaceVariant, "text-muted": s.outline,
        border: s.neutralVariantPalette.tone(88), "border-strong": s.outlineVariant, fav: s.error,
      };
  for (const [name, argb] of Object.entries(shell)) out[`--oppai-${name}`] = hex(argb);
  return out;
}

/** Which mapping a stored stylesheet was made with. Raised when youTokens changes, so a
 *  stylesheet stored by an older version is made again rather than kept. */
export const YOU_CSS_VERSION = 1;

/** What is stored for a preference: the choice, and the stylesheet made from it. */
export function storedYou(pref: YouPref): string {
  return JSON.stringify({ ...pref, css: youCss(pref), v: YOU_CSS_VERSION });
}

/** Whether a stored choice was made with an older mapping than this one. */
export function youIsStale(raw: string | null): boolean {
  try {
    const v = JSON.parse(raw ?? "null") as { seed?: unknown; v?: unknown } | null;
    return !!cleanSeed(v?.seed) && v?.v !== YOU_CSS_VERSION;
  } catch {
    return false;
  }
}

/** The stylesheet that puts a preference into effect; "" for OppaiLib's own palette.
 *  Inserted after the base tokens, it wins on order at the same specificity. */
export function youCss(pref: YouPref): string {
  if (!pref.seed) return "";
  const block = (selector: string, dark: boolean) =>
    `${selector} {\n${Object.entries(youTokens(pref.seed!, pref.style, dark)).map(([k, v]) => `  ${k}: ${v};`).join("\n")}\n}`;
  return `${block(":root", true)}\n${block(':root[data-theme="light"]', false)}\n`;
}

/** The three colours a swatch shows, as Android's picker draws them: a circle of the
 *  primary, split below into the secondary and tertiary. */
export function youPreview(seed: string, style: YouStyle): [string, string, string] {
  const s = schemeFor(seed, style, false);
  return [s.primaryPalette.tone(70), s.secondaryPalette.tone(80), s.tertiaryPalette.tone(70)].map(
    (argb) => hexFromArgb(argb),
  ) as [string, string, string];
}

/** An rgb()/rgba() string as #rrggbb, null for anything else (or a transparent one). */
export function hexFromCss(color: string): string | null {
  const m = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?\s*\)$/.exec(color.trim());
  if (!m || (m[4] !== undefined && Number(m[4]) === 0)) return null;
  return "#" + [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("");
}
