import { test } from "node:test";
import assert from "node:assert/strict";

const { inCategory, categoryCounts, moveToCategory, LORA_CATEGORIES } = await import("./lora-categories.ts");

const loras: { name: string; categoryKey?: string }[] = [
  { name: "ink", categoryKey: "style" },
  { name: "mika", categoryKey: "character" },
  { name: "glasses" },
  { name: "old", categoryKey: "Favourites" },
];

test("the list is the seven fixed categories, ETC last", () => {
  assert.deepEqual(LORA_CATEGORIES.map((c) => c.label), ["Character", "Style", "Concept", "Tools", "Poses", "Background", "ETC"]);
});

test("the filter shows all, the unsorted, or one category", () => {
  assert.deepEqual(loras.filter((l) => inCategory(l, "all")).map((l) => l.name), ["ink", "mika", "glasses", "old"]);
  assert.deepEqual(loras.filter((l) => inCategory(l, "character")).map((l) => l.name), ["mika"]);
});

test("a key off the list reads as unsorted rather than vanishing", () => {
  assert.deepEqual(loras.filter((l) => inCategory(l, "none")).map((l) => l.name), ["glasses", "old"]);
  const counts = categoryCounts(loras);
  assert.equal(counts.none, 2);
  assert.equal(counts.style, 1);
  assert.equal(counts.poses, 0);
  assert.equal(counts.all, 4);
});

test("filing a LoRA moves it and leaves the rest as they were", () => {
  const moved = moveToCategory(loras, ["ink", "glasses"], "poses");
  assert.deepEqual(moved.map((l) => l.categoryKey), ["poses", "character", "poses", "Favourites"]);
  assert.equal(moved[1], loras[1]);
  const out = moveToCategory(loras, ["mika"], "");
  assert.equal(out[1].categoryKey, undefined);
});

const { baseFamily, baseGroup, baseGroups, basesToLookUp, browseModels, fitsModel, sortLoras, browseLoras, unfitCount, civitaiSortSummary, filedByCategory, matchesQuery } =
  await import("./lora-categories.ts");

test("every backend's name for a base reads as one family", () => {
  for (const b of ["SD1", "SD 1.5", "sd-1", "SD 1.4"]) assert.equal(baseFamily(b), "sd1", b);
  for (const b of ["SDXL", "SDXL 1.0", "sdxl", "Pony", "Illustrious", "NoobAI", "sdxl-refiner"]) assert.equal(baseFamily(b), "sdxl", b);
  assert.equal(baseFamily("Flux.1 D"), "flux");
  assert.equal(baseFamily("flux"), "flux");
  assert.equal(baseFamily("sd-3"), "sd3");
  assert.equal(baseFamily("SD 3.5"), "sd3");
});

test("a base that says nothing is no family, and fits anything", () => {
  for (const b of [undefined, "", "Unknown", "Other"]) assert.equal(baseFamily(b), "", String(b));
  assert.ok(fitsModel(undefined, "SDXL"));
  assert.ok(fitsModel("SD1", undefined));
  assert.ok(fitsModel("Pony", "sdxl"));
  assert.ok(!fitsModel("SD 1.5", "SDXL"));
});

const library = [
  { name: "zeta", base: "SDXL", categoryKey: "style" },
  { name: "alpha", alias: "Mika", base: "SD1", categoryKey: "character", triggerPhrases: ["mika", "blue hair"] },
  { name: "Beta", categoryKey: undefined },
  { name: "item10", base: "Pony", categoryKey: "character" },
  { name: "item9", base: "sd-1" },
];

test("names sort as words, by what the card shows, with numbers in order", () => {
  assert.deepEqual(sortLoras(library, "name").map((l) => l.alias ?? l.name), ["Beta", "item9", "item10", "Mika", "zeta"]);
  assert.equal(sortLoras(library, "name-desc")[0].name, "zeta");
});

test("category order follows the list, the unsorted last", () => {
  assert.deepEqual(sortLoras(library, "category").map((l) => l.name), ["item10", "alpha", "zeta", "Beta", "item9"]);
});

test("base order groups the families, the unsaid last", () => {
  assert.deepEqual(sortLoras(library, "base").map((l) => l.name), ["item10", "zeta", "item9", "alpha", "Beta"]);
});

test("a search needs every word, in the name, alias or trigger words", () => {
  assert.ok(matchesQuery(library[1], "blue mika"));
  assert.ok(!matchesQuery(library[1], "blue red"));
  assert.ok(matchesQuery(library[1], "  "));
});

test("a view narrows by category, words and fit at once", () => {
  const view = { category: "all" as const, query: "", fitOnly: true, modelBase: "SDXL", order: "name" as const };
  assert.deepEqual(browseLoras(library, view).map((l) => l.name), ["Beta", "item10", "zeta"]);
  assert.deepEqual(browseLoras(library, { ...view, category: "character" }).map((l) => l.name), ["item10"]);
  assert.deepEqual(browseLoras(library, { ...view, fitOnly: false, category: "none" }).map((l) => l.name), ["Beta", "item9"]);
  assert.equal(unfitCount(library, "SDXL"), 2);
  assert.equal(unfitCount(library, undefined), 0);
});

test("a round of sorting is summed up in a line, saying why the rest were not filed", () => {
  assert.equal(civitaiSortSummary([
    { outcome: "filed", category: "style" }, { outcome: "filed", category: "poses" },
    { outcome: "unknown" }, { outcome: "unhashed" },
  ]), "Filed 2 LoRAs · 1 not on Civitai · 1 not hashed yet — try again in a few minutes");
  assert.equal(civitaiSortSummary([{ outcome: "untagged" }]), "Nothing could be filed · 1 on Civitai under no category");
});

test("filed results are grouped by category, off-list keys dropped", () => {
  const got = filedByCategory([
    { lora: "ink", outcome: "filed", category: "style" },
    { lora: "pen", outcome: "filed", category: "style" },
    { lora: "odd", outcome: "filed", category: "Favourites" },
    { lora: "mika", outcome: "unknown" },
  ]);
  assert.deepEqual([...got.entries()], [["style", ["ink", "pen"]]]);
});

test("the newer base models read the same from every catalogue", () => {
  const cases: [string, string][] = [
    ["Anima", "anima"], ["Flux.2 Klein 9B", "flux2"], ["Flux.2 Klein 4B-base", "flux2"], ["Flux.1 Kontext", "flux"],
    ["Flux.1 Krea", "flux"], ["Chroma", "chroma"], ["Qwen", "qwen"], ["Qwen 2", "qwen"], ["Qwen 2.1", "qwen21"],
    ["ZImageTurbo", "zimage"], ["ZImageBase", "zimage"], ["z-image", "zimage"], ["Krea 2", "krea2"],
    ["Krea 2 Turbo", "krea2"], ["Ernie", "ernie"], ["MOSS Image", "moss"], ["Lumina", "lumina"],
    ["Wan Video 2.2 I2V-A14B", "wan"],
  ];
  for (const [base, family] of cases) assert.equal(baseFamily(base), family, base);
});

test("a base that only sounds like one Forge runs is not taken for it", () => {
  for (const b of ["Pony V7", "Flux.3", "Qwen 3", "Hunyuan 1"]) assert.equal(baseFamily(b), "", b);
});

test("Chroma takes Flux's LoRAs, and no other family takes another's", () => {
  assert.equal(fitsModel("Flux.1 D", "Chroma"), true);
  assert.equal(fitsModel("Chroma", "Flux.1 D"), false);
  assert.equal(fitsModel("Anima", "Illustrious"), false);
  assert.equal(fitsModel("Flux.1 D", "Flux.2 Klein 9B"), false);
  assert.equal(fitsModel("Qwen", "Qwen 2.1"), false);
});

test("SDXL's kinds are grouped apart though they share a family", () => {
  assert.equal(baseGroup({ base: "Illustrious" }).label, "Illustrious");
  assert.equal(baseGroup({ base: "NoobAI" }).label, "NoobAI");
  assert.equal(baseGroup({ base: "Pony" }).label, "Pony");
  assert.equal(baseGroup({ base: "SDXL 1.0" }).label, "SDXL");
  assert.equal(baseGroup({ base: "sdxl" }).key, "sdxl");
});

test("what the file was read as outranks a base saying nothing", () => {
  assert.equal(baseGroup({ family: "anima" }).label, "Anima");
  assert.equal(baseGroup({ base: "Unknown", family: "flux2" }).label, "Flux.2 Klein");
  assert.equal(baseGroup({}).label, "Other");
});

test("groups come counted and in a fixed order, whatever order the files came in", () => {
  const items = [{ base: "Anima" }, { base: "SD 1.5" }, { base: "Illustrious" }, { base: "Anima" }, { base: "?" }];
  assert.deepEqual(baseGroups(items).map((g) => [g.label, g.count]), [["Illustrious", 1], ["Anima", 2], ["SD 1.5", 1], ["Other", 1]]);
});

test("a picked chip narrows the LoRAs on top of everything else", () => {
  const loras = [{ name: "a", base: "Anima" }, { name: "b", base: "Illustrious" }, { name: "c", base: "Illustrious" }];
  const view = { category: "all" as const, query: "", fitOnly: false, group: "illustrious", order: "name" as const };
  assert.deepEqual(browseLoras(loras, view).map((l) => l.name), ["b", "c"]);
  assert.deepEqual(browseLoras(loras, { ...view, group: "" }).map((l) => l.name), ["a", "b", "c"]);
});

test("checkpoints filter by a chip and sort by base, names breaking the ties", () => {
  const models = [
    { model_name: "zeta", base: "Anima" }, { model_name: "alpha", base: "SD 1.5" },
    { model_name: "item10", base: "Illustrious" }, { model_name: "item9", base: "Illustrious" },
  ];
  assert.deepEqual(browseModels(models, "", "base").map((m) => m.model_name), ["item9", "item10", "zeta", "alpha"]);
  assert.deepEqual(browseModels(models, "", "name").map((m) => m.model_name), ["alpha", "item9", "item10", "zeta"]);
  assert.deepEqual(browseModels(models, "illustrious", "name-desc").map((m) => m.model_name), ["item10", "item9"]);
});

test("only plain SDXL files are worth asking Civitai about", () => {
  const items = [
    { key: "a", base: "SDXL" }, { key: "b", base: "Illustrious" }, { key: "c", base: "Anima" },
    { base: "SDXL" }, { key: "d", family: "sdxl" },
  ];
  assert.deepEqual(basesToLookUp(items), ["a", "d"]);
});
