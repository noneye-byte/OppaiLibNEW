export const OUTFIT_GEAR_SLOTS = [
  { key: "head", label: "Head", hint: "Hats, glasses, etc.", prompt: "head item", noun: "headwear", icon: "face" },
  { key: "top", label: "Top", hint: "Shirt, dress, jacket…", prompt: "top", noun: "top", icon: "apparel" },
  { key: "bottoms", label: "Bottoms", hint: "Skirt, shorts, pants…", prompt: "bottoms", noun: "bottoms", icon: "styler" },
  { key: "shoes", label: "Shoes", hint: "Boots, heels, socks…", prompt: "footwear", noun: "footwear", icon: "steps" },
  { key: "panties", label: "Panties", hint: "Style and material", prompt: "panties", noun: "panties", icon: "apparel" },
  { key: "bra", label: "Bra", hint: "Style and material", prompt: "bra", noun: "bra", icon: "apparel" },
  { key: "hand1", label: "Hand 1", hint: "Held or worn item", prompt: "left-hand item", noun: "glove", icon: "front_hand" },
  { key: "hand2", label: "Hand 2", hint: "Held or worn item", prompt: "right-hand item", noun: "glove", icon: "back_hand" },
  { key: "extra1", label: "Extra 1", hint: "Accessory or layer", prompt: "extra accessory", noun: "accessory", icon: "diamond" },
  { key: "extra2", label: "Extra 2", hint: "Accessory or layer", prompt: "second extra accessory", noun: "accessory", icon: "diamond" },
] as const;

export type OutfitGearKey = typeof OUTFIT_GEAR_SLOTS[number]["key"];

/**
 * One equipped piece: what it is, and what colour it is.
 *
 * Colour is its own field rather than something typed into the description because a
 * generator drops an adjective buried mid-phrase far more often than it drops a term
 * that leads the clause and carries weight. Keeping it separate is also what lets the
 * negative prompt name the colours this piece must *not* be — which is the half of the
 * fix that stops a "crimson top" arriving blue.
 */
export interface GearPiece {
  color: string;
  item: string;
}

export type OutfitGear = Record<OutfitGearKey, GearPiece>;

/** A small complete starter loadout makes the Calm row meaningful on first use. Users
 * can replace each description or deliberately unequip every box. */
export const DEFAULT_OUTFIT_GEAR: OutfitGear = {
  head: { color: "", item: "" },
  top: { color: "cream white", item: "fitted top" },
  bottoms: { color: "charcoal", item: "pleated skirt" },
  shoes: { color: "black", item: "ankle boots" },
  panties: { color: "black", item: "lace panties" },
  bra: { color: "black", item: "lace bra" },
  hand1: { color: "", item: "" },
  hand2: { color: "", item: "" },
  extra1: { color: "", item: "" },
  extra2: { color: "", item: "" },
};

export const EMPTY_OUTFIT_GEAR: OutfitGear = Object.fromEntries(
  OUTFIT_GEAR_SLOTS.map(({ key }) => [key, { color: "", item: "" }]),
) as OutfitGear;

/**
 * The colour vocabulary used to build negatives.
 *
 * Each family lists the words that mean it, so "crimson" is understood as red and the
 * remaining families become the negative. The list is deliberately coarse — naming
 * nine families keeps the negative prompt short enough to stay effective, where
 * enumerating every shade would dilute the whole thing.
 */
export const GEAR_COLOR_FAMILIES: readonly { name: string; words: readonly string[] }[] = [
  { name: "red", words: ["red", "crimson", "scarlet", "ruby", "burgundy", "maroon", "wine"] },
  { name: "pink", words: ["pink", "rose", "blush", "magenta", "fuchsia", "salmon"] },
  { name: "orange", words: ["orange", "peach", "apricot", "coral", "amber", "rust"] },
  { name: "yellow", words: ["yellow", "gold", "golden", "mustard", "lemon", "blonde"] },
  { name: "green", words: ["green", "emerald", "olive", "mint", "jade", "teal", "sage"] },
  { name: "blue", words: ["blue", "navy", "azure", "cobalt", "indigo", "denim", "cyan", "turquoise"] },
  { name: "purple", words: ["purple", "violet", "lavender", "lilac", "plum", "mauve"] },
  { name: "brown", words: ["brown", "tan", "beige", "chocolate", "caramel", "khaki", "bronze", "copper"] },
  { name: "white", words: ["white", "cream", "ivory", "pearl", "off-white"] },
  { name: "black", words: ["black", "charcoal", "onyx", "jet"] },
  { name: "grey", words: ["grey", "gray", "silver", "slate", "ash", "steel"] },
];

/** Which families a written colour belongs to. A colour may name more than one
 * ("black and white striped"), and every family it names is kept out of the negative. */
export function colorFamilies(color: string): string[] {
  const text = color.toLowerCase();
  return GEAR_COLOR_FAMILIES
    .filter(({ words }) => words.some((word) => new RegExp(`\\b${word}\\b`).test(text)))
    .map(({ name }) => name);
}

/** The API dialect the generator speaks, as reported by the server's status. */
export type PromptDialect = "a1111" | "invokeai" | string;

/**
 * Adds emphasis in whichever weighting syntax the connected generator understands.
 *
 * A1111 reads `(text:1.2)`; InvokeAI's compel parser reads `(text)1.2` and would show
 * A1111's colon form as literal punctuation in the prompt. An unrecognised backend
 * gets the bare text, because a wrong weight marker is worse than none — it becomes
 * tokens describing brackets rather than clothes.
 */
export function emphasize(text: string, weight: number, dialect: PromptDialect): string {
  if (!text.trim()) return "";
  const w = weight.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  if (dialect === "a1111") return `(${text}:${w})`;
  if (dialect === "invokeai") return `(${text})${w}`;
  return text;
}

/** How hard a colour is pushed when colour locking is on. */
export const GEAR_COLOR_WEIGHT = 1.25;

/**
 * The prompt phrase for one equipped piece, colour first.
 *
 * "top: (crimson red fitted top:1.25)" rather than "top: fitted top in crimson" — the
 * colour leads the clause, is repeated inside the weighted span with the garment noun,
 * and so survives the token budget far better than a trailing adjective.
 */
export function gearPhrase(
  slot: typeof OUTFIT_GEAR_SLOTS[number],
  piece: GearPiece,
  dialect: PromptDialect,
  lockColors: boolean,
): string {
  const item = piece.item.trim();
  if (!item) return "";
  const color = piece.color.trim();
  if (!color) return `${slot.prompt}: ${item}`;
  const described = `${color} ${item}`;
  if (!lockColors) return `${slot.prompt}: ${described}`;
  return `${slot.prompt}: ${emphasize(described, GEAR_COLOR_WEIGHT, dialect)}, ${color} ${slot.noun}`;
}

/**
 * The colours this piece must not come back as.
 *
 * Only emitted for a piece that is both equipped and coloured, and only for families
 * the chosen colour does not itself name. A garment with no stated colour has nothing
 * to be wrong about, so it contributes nothing here.
 */
export function gearColorNegatives(
  slot: typeof OUTFIT_GEAR_SLOTS[number],
  piece: GearPiece,
): string[] {
  const color = piece.color.trim();
  if (!piece.item.trim() || !color) return [];
  const named = new Set(colorFamilies(color));
  if (!named.size) return [];
  return GEAR_COLOR_FAMILIES
    .filter(({ name }) => !named.has(name))
    .map(({ name }) => `${name} ${slot.noun}`);
}

export type ClothesState = "on" | "displaced" | "off";
export type UnderwearState = "hidden" | "showing" | "off";

export interface OutfitExposure {
  clothes: ClothesState;
  bra: UnderwearState;
  panties: UnderwearState;
}

type Weighted<T extends string> = readonly (readonly [T, number])[];

export interface ExposureTier {
  description: string;
  clothes: Weighted<ClothesState>;
  bra: Weighted<UnderwearState>;
  panties: Weighted<UnderwearState>;
}

/** Higher tiers widen the possible outcomes rather than locking every image to one
 * undress state. The values are percentages and deliberately retain some modest rolls
 * at Peak (and rare bold rolls below it) so a generated emotion set feels varied. */
export const OUTFIT_EXPOSURE_TIERS: readonly ExposureTier[] = [
  {
    description: "Clothes on; bra and panties hidden.",
    clothes: [["on", 100]],
    bra: [["hidden", 100]],
    panties: [["hidden", 100]],
  },
  {
    description: "Usually covered, with an occasional underwear glimpse.",
    clothes: [["on", 88], ["displaced", 12]],
    bra: [["hidden", 88], ["showing", 12]],
    panties: [["hidden", 94], ["showing", 6]],
  },
  {
    description: "Mixed neat, slipped, and rare clothes-off results.",
    clothes: [["on", 58], ["displaced", 34], ["off", 8]],
    bra: [["hidden", 52], ["showing", 38], ["off", 10]],
    panties: [["hidden", 60], ["showing", 33], ["off", 7]],
  },
  {
    description: "Strong variation: clothes and underwear may be on, showing, or off.",
    clothes: [["on", 28], ["displaced", 44], ["off", 28]],
    bra: [["hidden", 22], ["showing", 46], ["off", 32]],
    panties: [["hidden", 30], ["showing", 45], ["off", 25]],
  },
  {
    description: "Maximum variation, weighted toward displaced or removed clothing.",
    clothes: [["on", 14], ["displaced", 28], ["off", 58]],
    bra: [["hidden", 10], ["showing", 27], ["off", 63]],
    panties: [["hidden", 14], ["showing", 31], ["off", 55]],
  },
];

function weightedPick<T extends string>(choices: Weighted<T>, rng: () => number): T {
  const roll = Math.max(0, Math.min(0.999999, rng())) * 100;
  let cursor = 0;
  for (const [value, weight] of choices) {
    cursor += weight;
    if (roll < cursor) return value;
  }
  return choices[choices.length - 1][0];
}

export function rollOutfitExposure(tier: number, rng: () => number = Math.random): OutfitExposure {
  const table = OUTFIT_EXPOSURE_TIERS[Math.max(0, Math.min(OUTFIT_EXPOSURE_TIERS.length - 1, Math.round(tier)))];
  const clothes = weightedPick(table.clothes, rng);
  let bra = weightedPick(table.bra, rng);
  let panties = weightedPick(table.panties, rng);
  // Hidden underwear cannot stay hidden after the garment covering it has come off.
  if (clothes === "off") {
    if (bra === "hidden") bra = "showing";
    if (panties === "hidden") panties = "showing";
  }
  return { clothes, bra, panties };
}

export function isGearPiece(value: unknown): value is GearPiece {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const piece = value as Record<string, unknown>;
  return typeof piece.color === "string" && typeof piece.item === "string";
}

export function isOutfitGear(value: unknown): value is OutfitGear {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const gear = value as Record<string, unknown>;
  return OUTFIT_GEAR_SLOTS.every(({ key }) => isGearPiece(gear[key]));
}

/**
 * Reads gear from anything previously stored, including the pre-colour shape.
 *
 * Loadouts saved before colours existed are a flat `{ top: "fitted top" }`. Those are
 * still every garment the user described, so they are carried over as items with no
 * colour rather than being discarded back to the defaults — an unstated colour is
 * exactly what those loadouts meant.
 */
export function normalizeOutfitGear(value: unknown): OutfitGear {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ...EMPTY_OUTFIT_GEAR };
  const raw = value as Record<string, unknown>;
  return Object.fromEntries(OUTFIT_GEAR_SLOTS.map(({ key }) => {
    const piece = raw[key];
    if (typeof piece === "string") return [key, { color: "", item: piece }];
    if (isGearPiece(piece)) return [key, { color: piece.color, item: piece.item }];
    return [key, { color: "", item: "" }];
  })) as OutfitGear;
}

/** Whether two loadouts describe the same clothes, for deciding if generated squares
 * still belong to what is on screen. Case- and whitespace-insensitive. */
export function gearKey(gear: OutfitGear): string {
  return JSON.stringify(Object.fromEntries(OUTFIT_GEAR_SLOTS.map(({ key }) => [
    key,
    `${gear[key].color.trim().toLowerCase()}|${gear[key].item.trim().toLowerCase()}`,
  ])));
}
