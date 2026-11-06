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
  /**
   * Switched off without being cleared. A piece that is described but not worn: the
   * jacket kept in the recipe for the next wardrobe, the hat tried without. Absent
   * means worn, so every loadout saved before this existed reads as fully equipped.
   */
  off?: boolean;
  /**
   * What this slot is called in the prompt, overriding the built-in word.
   *
   * The slot names were chosen to be the terms a booru-trained model knows, and for
   * the common case they are right — but they are a fixed vocabulary imposed on an
   * open-ended wardrobe. "top: pauldron" is a worse phrase than "armour: pauldron",
   * "head item: crown" worse than "headwear: crown", and a model trained on a
   * different tag set may want different words entirely. There was no way to say so
   * without editing the source.
   *
   * Empty or absent means the slot's built-in word, which is what every loadout
   * saved before this existed means. The label on screen never changes — this is the
   * word the generator is given, not the one the user navigates by.
   */
  prompt?: string;
  /**
   * The garment noun repeated after a weighted colour, overriding the built-in one.
   *
   * Paired with `prompt` because it does the same job one clause later: colour
   * locking emits "(crimson pauldron:1.25), crimson top" and that trailing "top" is
   * the built-in noun contradicting the override in front of it.
   */
  noun?: string;
}

/** Whether a piece is actually worn: described, and not switched off. */
export function gearWorn(piece: GearPiece): boolean {
  return !!piece.item.trim() && !piece.off;
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
  if (!item || piece.off) return "";
  const label = gearPromptLabel(slot, piece);
  const noun = gearPromptNoun(slot, piece);
  const color = piece.color.trim();
  if (!color) return `${label}: ${item}`;
  const described = `${color} ${item}`;
  if (!lockColors) return `${label}: ${described}`;
  return `${label}: ${emphasize(described, GEAR_COLOR_WEIGHT, dialect)}, ${color} ${noun}`;
}

/** The word this slot goes into the prompt under: the user's override, or the built-in. */
export function gearPromptLabel(slot: typeof OUTFIT_GEAR_SLOTS[number], piece: GearPiece): string {
  return piece.prompt?.trim() || slot.prompt;
}

/** The garment noun repeated after a weighted colour. Follows the label's override. */
export function gearPromptNoun(slot: typeof OUTFIT_GEAR_SLOTS[number], piece: GearPiece): string {
  return piece.noun?.trim() || piece.prompt?.trim() || slot.noun;
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
  if (!gearWorn(piece) || !color) return [];
  const named = new Set(colorFamilies(color));
  if (!named.size) return [];
  const noun = gearPromptNoun(slot, piece);
  return GEAR_COLOR_FAMILIES
    .filter(({ name }) => !named.has(name))
    .map(({ name }) => `${name} ${noun}`);
}

export type OuterState = "on" | "loosened" | "open" | "off";
export type UnderwearState = "hidden" | "showing" | "off";

export interface OutfitExposure {
  outer: OuterState;
  bra: UnderwearState;
  panties: UnderwearState;
}

/**
 * How undressed she is at each heat tier: one fixed level per tier, each a step further
 * than the last.
 *
 * These used to be dice — weighted tables that let a Calm square roll an underwear
 * glimpse and a Peak one roll fully dressed, so a set would not be five rows of the same
 * nude pose. What it actually produced was underwear in the prompt of nearly every
 * square, because a bra that was "completely covered, not showing" was still a bra the
 * prompt named, and a generator draws what it is told about. A level is something the
 * board can promise: a Calm square is dressed, and nothing in its prompt says otherwise.
 */
export const OUTFIT_UNDRESS_LEVELS: readonly { description: string; exposure: OutfitExposure }[] = [
  { description: "Dressed. Her underwear is not mentioned at all.", exposure: { outer: "on", bra: "hidden", panties: "hidden" } },
  { description: "Still dressed, her top slipping off one shoulder.", exposure: { outer: "loosened", bra: "hidden", panties: "hidden" } },
  { description: "Her top pulled aside over her bra; bottoms still on.", exposure: { outer: "open", bra: "showing", panties: "hidden" } },
  { description: "Down to her underwear.", exposure: { outer: "off", bra: "showing", panties: "showing" } },
  { description: "Nude.", exposure: { outer: "off", bra: "off", panties: "off" } },
];

export function undressLevel(tier: number): OutfitExposure {
  const at = Math.max(0, Math.min(OUTFIT_UNDRESS_LEVELS.length - 1, Math.round(tier)));
  return OUTFIT_UNDRESS_LEVELS[at].exposure;
}

/**
 * How she stands at each heat tier. A square's arms come from its expression, so without
 * this every level of a column asked for the same picture with less on: Calm · Neutral
 * and Flirty · Neutral were the same words for her body, and came back in the same
 * stance. Said in what a body does rather than how it feels, because "inviting posture"
 * and "sultry posture" are moods, and a generator gives a mood the pose it already had.
 */
export const OUTFIT_LEVEL_STANCES: readonly string[] = [
  "standing straight, weight even on both feet",
  "body turned slightly to one side, weight on one leg",
  "contrapposto, hip cocked to one side, head tilted",
  "body angled, one shoulder forward, leaning toward the viewer",
  "arched back, hips pushed forward, one knee bent",
];

export function levelStance(tier: number): string {
  const at = Math.max(0, Math.min(OUTFIT_LEVEL_STANCES.length - 1, Math.round(tier)));
  return OUTFIT_LEVEL_STANCES[at];
}

/**
 * What a level does to the prompt, given what she is wearing.
 *
 * `hidden` is the garments the prompt must leave out entirely — the clothes she has taken
 * off and the underwear nobody can see — because naming one, even as "not showing", is
 * how it ends up in the picture. They go into the negative instead. `prompt` is the
 * state in words, and is empty at a level where there is nothing to say: a dressed square
 * needs no clause about being dressed.
 *
 * `gear` is as the prompt will name it — a piece switched off reads as empty.
 */
export function undressPrompt(gear: OutfitGear, exposure: OutfitExposure): {
  hidden: OutfitGearKey[];
  prompt: string[];
  negative: string[];
} {
  const worn = (key: OutfitGearKey) => gearWorn(gear[key]);
  const outer = worn("top") || worn("bottoms");
  const outerOff = exposure.outer === "off";
  const hidden: OutfitGearKey[] = [];
  const prompt: string[] = [];
  const negative: string[] = [];

  if (outer) {
    if (outerOff) {
      for (const key of ["top", "bottoms"] as const) {
        if (worn(key)) { hidden.push(key); negative.push(gear[key].item.trim()); }
      }
    } else if (worn("top") && exposure.outer !== "on") {
      // Said of the top she has on, by name, and in words any top can do. "Partially
      // unbuttoned" and "open clothes" each describe a particular garment — a shirt, a
      // jacket — and a generator given either over a plain top drew one on top of it.
      const top = gear.top.item.trim();
      prompt.push(exposure.outer === "loosened" ? `${top} slipping off one shoulder` : `${top} pulled aside`);
    }
  }

  // Underwear with nothing over it is what she is wearing there, so it is named however
  // hidden the level would keep it.
  const covered = (over: OutfitGearKey) => worn(over) && !outerOff;
  const layer = (key: "bra" | "panties", over: OutfitGearKey, bare: string) => {
    const state = exposure[key];
    if (worn(key)) {
      if (state === "off") {
        hidden.push(key);
        negative.push(key);
        prompt.push(bare);
      } else if (state === "hidden" && covered(over)) {
        hidden.push(key);
        negative.push(key);
      } else if (state === "showing" && covered(over)) {
        prompt.push(`${key} visible`);
      }
    } else if (state !== "hidden" || !covered(over)) {
      // Nothing worn underneath: whatever would have shown the underwear shows her.
      prompt.push(bare);
    }
  };
  layer("bra", "top", "bare breasts, nipples");
  layer("panties", "bottoms", "pussy, vulva visible");

  if (exposure.bra === "off" && exposure.panties === "off" && outerOff) prompt.unshift("completely nude, naked");
  else if (outerOff && outer && (worn("bra") || worn("panties"))) prompt.unshift("underwear only");
  if (hidden.includes("bra") && hidden.includes("panties")) negative.push("underwear, lingerie");
  return { hidden, prompt, negative };
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
    if (isGearPiece(piece)) {
      return [key, {
        color: piece.color,
        item: piece.item,
        ...(piece.off ? { off: true } : {}),
        // Carried only when set. An override equal to the built-in word is stored as
        // an override anyway: the user typed it, and the built-in may change.
        ...(piece.prompt?.trim() ? { prompt: piece.prompt.trim() } : {}),
        ...(piece.noun?.trim() ? { noun: piece.noun.trim() } : {}),
      }];
    }
    return [key, { color: "", item: "" }];
  })) as OutfitGear;
}

/** Whether two loadouts describe the same clothes, for deciding if generated squares
 * still belong to what is on screen. Case- and whitespace-insensitive. */
export function gearKey(gear: OutfitGear): string {
  // A piece switched off is, to the generator, not there: it keys the same as an
  // empty slot, so toggling it off and clearing it describe the same clothes.
  return JSON.stringify(Object.fromEntries(OUTFIT_GEAR_SLOTS.map((slot) => {
    const piece = gear[slot.key];
    // The prompt words are part of what is described: renaming a slot changes the
    // prompt, so squares generated before the rename no longer belong to what is on
    // screen. Keyed only for a worn piece, like everything else here.
    return [
      slot.key,
      gearWorn(piece)
        ? `${piece.color.trim().toLowerCase()}|${piece.item.trim().toLowerCase()}|${gearPromptLabel(slot, piece).toLowerCase()}|${gearPromptNoun(slot, piece).toLowerCase()}`
        : "|",
    ];
  })));
}

/**
 * Layers a generator likes to add that the loadout does not have.
 *
 * Booru-trained checkpoints dress a character in what the tags around her usually come
 * with — a jacket over a top, a cardigan, a tie — so the same loadout came back in
 * different clothes from square to square. Each word here goes into the negative unless
 * something she wears, or the outfit's own words, mentions it: a loadout with a jacket
 * keeps its jacket.
 */
export const UNASKED_LAYERS: readonly string[] = [
  "jacket", "cardigan", "coat", "hoodie", "blazer", "vest", "shawl", "scarf", "necktie", "bowtie", "apron", "cape", "gloves",
];

export function unaskedLayers(gear: OutfitGear, extra = ""): string[] {
  const worn = [extra, ...OUTFIT_GEAR_SLOTS.map(({ key }) => (gearWorn(gear[key]) ? gear[key].item : ""))].join(" ").toLowerCase();
  return UNASKED_LAYERS.filter((word) => !new RegExp(`\\b${word}`).test(worn));
}
