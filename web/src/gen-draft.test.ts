import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

// A minimal localStorage. Node has none, and the point of these tests is the
// validation logic around the stored blob, not the browser API.
class MemoryStorage {
  private map = new Map<string, string>();
  full = false;
  getItem(k: string) {
    return this.map.has(k) ? this.map.get(k)! : null;
  }
  setItem(k: string, v: string) {
    if (this.full) throw new DOMException("quota", "QuotaExceededError");
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  raw() {
    return this.map;
  }
}

const store = new MemoryStorage();
(globalThis as unknown as { localStorage: MemoryStorage }).localStorage = store;
// DOMException isn't defined in every Node context this might run in.
if (typeof DOMException === "undefined") {
  (globalThis as unknown as { DOMException: unknown }).DOMException = class extends Error {};
}

const { saveDraft, loadDraft, clearDraft } = await import("./gen-draft.ts");

const KEY = "oppai_gen_draft";

beforeEach(() => {
  store.raw().clear();
  store.full = false;
});

test("a saved draft round-trips", () => {
  saveDraft({
    prompt: "a cat",
    negative: "blurry",
    steps: 30,
    cfg: 7.5,
    seamlessX: true,
    vaePrecision: "fp16",
    selectedLoras: { detail: 0.8 },
    selectedTriggers: ["trigger"],
    outfitGear: {
      head: { color: "gold", item: "round glasses" },
      top: { color: "navy", item: "sweater" },
      bottoms: { color: "charcoal", item: "pleated skirt" },
      shoes: { color: "black", item: "boots" },
      panties: { color: "black", item: "lace panties" },
      bra: { color: "black", item: "lace bra" },
      hand1: { color: "", item: "wand" },
      hand2: { color: "", item: "book" },
      extra1: { color: "red", item: "choker" },
      extra2: { color: "white", item: "thigh highs" },
    },
    outfitBackground: "black",
    outfitUnderwearColor: "red",
    outfitPubicHair: true,
    outfitPubicHairColor: "blonde",
    open: { models: true, options: false },
    shots: [{ id: "abc", seed: 5, saved: false }],
    scrollTop: 420,
  });
  const d = loadDraft();
  assert.ok(d);
  assert.equal(d.prompt, "a cat");
  assert.equal(d.steps, 30);
  assert.equal(d.cfg, 7.5);
  assert.equal(d.seamlessX, true);
  assert.equal(d.vaePrecision, "fp16");
  assert.deepEqual(d.selectedLoras, { detail: 0.8 });
  assert.deepEqual(d.selectedTriggers, ["trigger"]);
  assert.deepEqual(d.outfitGear?.head, { color: "gold", item: "round glasses" });
  assert.deepEqual(d.outfitGear?.hand2, { color: "", item: "book" });
  assert.equal(d.outfitBackground, "black");
  assert.equal(d.outfitUnderwearColor, "red");
  assert.equal(d.outfitPubicHair, true);
  assert.equal(d.outfitPubicHairColor, "blonde");
  assert.deepEqual(d.open, { models: true, options: false });
  assert.deepEqual(d.shots, [{ id: "abc", seed: 5, saved: false, info: undefined }]);
  assert.equal(d.scrollTop, 420);
});

test("nothing stored means nothing restored", () => {
  assert.equal(loadDraft(), null);
});

test("a corrupt blob restores nothing and clears itself", () => {
  store.setItem(KEY, "{not json at all");
  assert.equal(loadDraft(), null);
  // Left in place, it would fail to parse on every future visit.
  assert.equal(store.getItem(KEY), null);
});

test("a draft from another version is discarded, not migrated", () => {
  store.setItem(KEY, JSON.stringify({ version: 999, at: Date.now(), prompt: "old" }));
  assert.equal(loadDraft(), null);
  assert.equal(store.getItem(KEY), null);
});

test("a stale draft is discarded", () => {
  const longAgo = Date.now() - 40 * 24 * 60 * 60 * 1000;
  store.setItem(KEY, JSON.stringify({ version: 1, at: longAgo, prompt: "last month" }));
  // Restoring last month's prompt as though it were in progress is more confusing
  // than starting clean.
  assert.equal(loadDraft(), null);
});

test("fields of the wrong type are dropped rather than restored", () => {
  // The blob outlives the code that wrote it, and a hand-edited or older-build value
  // must not reach a slider. A NaN width renders as an empty control the user can't
  // fix without knowing to retype it.
  store.setItem(
    KEY,
    JSON.stringify({
      version: 1,
      at: Date.now(),
      prompt: "kept",
      steps: "thirty",
      width: null,
      height: Number.NaN,
      cfg: Number.POSITIVE_INFINITY,
      seamlessX: "yes",
      vaePrecision: "fp8",
      selectedLoras: { a: "heavy" },
      selectedTriggers: ["ok", 5],
      open: { models: "true" },
      outfitGear: { head: "hat", top: 12 },
    }),
  );
  const d = loadDraft();
  assert.ok(d);
  assert.equal(d.prompt, "kept");
  assert.equal(d.steps, undefined);
  assert.equal(d.width, undefined);
  assert.equal(d.height, undefined);
  assert.equal(d.cfg, undefined);
  assert.equal(d.seamlessX, undefined);
  assert.equal(d.vaePrecision, undefined);
  assert.equal(d.selectedLoras, undefined);
  assert.equal(d.selectedTriggers, undefined);
  assert.equal(d.open, undefined);
  // Gear is carried through rather than rejected: a pre-colour draft stores a plain
  // description per slot, and the studio normalizes the shape when it restores. One
  // unusable slot must not cost the user the nine good garments beside it.
  assert.equal((d.outfitGear as Record<string, unknown> | undefined)?.head, "hat");
});

test("gear that is not a record of slots at all is refused outright", () => {
  for (const bad of [[1, 2], "hat", 7]) {
    store.setItem(KEY, JSON.stringify({ version: 1, at: Date.now(), outfitGear: bad }));
    assert.equal(loadDraft()?.outfitGear, undefined);
  }
});

test("malformed shots are filtered out individually", () => {
  store.setItem(
    KEY,
    JSON.stringify({
      version: 1,
      at: Date.now(),
      shots: [{ id: "good", seed: 1, saved: true }, { seed: 2 }, null, { id: "x", seed: "y" }],
    }),
  );
  const d = loadDraft();
  assert.ok(d);
  // One bad entry must not cost the whole output history.
  assert.equal(d.shots?.length, 1);
  assert.equal(d.shots?.[0].id, "good");
  assert.equal(d.shots?.[0].saved, true);
});

test("an outfit result keeps the emotional state it was generated for", () => {
  const outfitSlot = {
    emotion: "loving", emotionLabel: "Loving", tier: 3, tierLabel: "Heated", index: 46,
  };
  saveDraft({
    shots: [{
      id: "preview", seed: 42, saved: false,
      outfitFilename: "date-dress-heated-loving.png", outfitSlot,
      outfitConfig: "white:black:false:dark brown",
      cutoutReviewed: true, previewVersion: 123, workspaceX: 40, workspaceY: 80,
    }],
  });
  assert.deepEqual(loadDraft()?.shots?.[0].outfitSlot, outfitSlot);
  assert.equal(loadDraft()?.shots?.[0].outfitConfig, "white:black:false:dark brown");
  assert.equal(loadDraft()?.shots?.[0].cutoutReviewed, true);
  assert.equal(loadDraft()?.shots?.[0].previewVersion, 123);
  assert.equal(loadDraft()?.shots?.[0].workspaceX, 40);
  assert.equal(loadDraft()?.shots?.[0].workspaceY, 80);

  const raw = JSON.parse(store.getItem(KEY)!);
  raw.shots[0].outfitSlot.tier = "hot";
  store.setItem(KEY, JSON.stringify(raw));
  assert.equal(loadDraft()?.shots?.[0].outfitSlot, undefined);
});

test("a full storage does not throw", () => {
  store.full = true;
  // The draft is a convenience. Failing to write it must never break generating,
  // which is the actual feature.
  assert.doesNotThrow(() => saveDraft({ prompt: "x" }));
});

test("clearDraft removes it", () => {
  saveDraft({ prompt: "x" });
  clearDraft();
  assert.equal(loadDraft(), null);
});
