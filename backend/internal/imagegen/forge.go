package imagegen

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"slices"
	"sort"
	"strings"
	"sync"
)

// What Forge Neo takes that Automatic1111 does not.
//
// Everything here sits in a1111Generate's way rather than beside it, so that every run
// goes through it: the studio's, Libby's and a sprite's alike are drawn right on any
// checkpoint, none of them having to know what a text encoder is.
//
// A run works out what its checkpoint is and fills in what that family needs. The one
// thing it must not do is leave forge_additional_modules alone: Forge holds on to the
// modules last chosen in its own UI, so an SDXL run after someone tried Flux there
// would be handed Flux's text encoders. A family that needs nothing sends an empty list.

// ForgeRun is what only Forge reads. All of it is optional: a zero ForgeRun on a family
// is the family's own settings.
type ForgeRun struct {
	// Scheduler is the noise schedule, as Forge names it ("Beta"). Blank is the family's.
	Scheduler string
	// Shift is the family's shift or distilled CFG; 0 is the family's own.
	Shift float64
	// Modules are the text encoders and VAE to load, by file name, over the ones a run
	// would pick. A kind not named is still picked.
	Modules []string
	// AsReference has an input picture be a reference to edit from, on the families
	// that can take it either way, rather than the start of an img2img.
	AsReference bool
	// References are further pictures for an edit model: Forge's ImageStitch.
	References [][]byte
	// LastFrame is the picture a Wan clip ends on, for a loop.
	LastFrame []byte
	// Refiner takes over partway through, at RefinerAt of the steps (0–1), with a CFG
	// of its own when RefinerCFG is set: an SDXL refiner, or Wan's low-noise half.
	Refiner    string
	RefinerAt  float64
	RefinerCFG float64
	// RefinerRules are Forge's LoRA Replacements, a rule a line; blank is its default.
	RefinerRules string
	// The always-on scripts: which of these run is decided per picture.
	Spectrum   bool    // skips steps it can predict, for speed
	Sparse     bool    // Sol attention: cheaper attention, for speed
	Offload    bool    // Never OOM: keep the model out of VRAM between steps
	TiledVAE   bool    // Never OOM: decode in tiles
	RescaleCFG float64 // 0–1, for v-prediction checkpoints
	MaHiRo     bool    // another way of applying CFG
	// PiD names a PiD checkpoint to finish the picture with.
	PiD string
	// Frames is a Wan clip's length. It goes in the batch size.
	Frames int
	// ModelSettings has the family's steps, CFG and sampler beat the request's: a run
	// that did not choose them for this checkpoint. Libby's pictures use one set of
	// numbers whichever checkpoint is picked, and CFG 7 on a turbo model is noise.
	ModelSettings bool
}

// MissingModulesError is a run that cannot start: Forge fails with a tensor-size error
// deep in loading otherwise, which says nothing about what is wrong.
type MissingModulesError struct {
	Family  string
	Missing []ModuleSlot
	// OnDisk says the files are in the folder and Forge has not read it since.
	OnDisk bool
}

func (e *MissingModulesError) Error() string {
	names := make([]string, 0, len(e.Missing))
	for _, s := range e.Missing {
		names = append(names, s.Label)
	}
	if e.OnDisk {
		return fmt.Sprintf("%s is in Forge's models folder, but Forge hasn't read the folder since it arrived. Restart Forge, or press the refresh button beside its checkpoint list.", joinWords(names))
	}
	return fmt.Sprintf("%s needs %s beside it, and Forge doesn't have %s. Get %s from the model's card in the studio, or put %s in Forge's models folder.",
		FamilyLabel(e.Family), joinWords(names), oneOrThem(len(names)), oneOrThem(len(names)), oneOrThem(len(names)))
}

func oneOrThem(n int) string {
	if n == 1 {
		return "it"
	}
	return "them"
}

func joinWords(w []string) string {
	switch len(w) {
	case 0:
		return ""
	case 1:
		return w[0]
	}
	return strings.Join(w[:len(w)-1], ", ") + " and " + w[len(w)-1]
}

// ForgeModule is one text encoder or VAE Forge has.
type ForgeModule struct {
	Name string `json:"name"`
	// Kind is "te" or "vae".
	Kind string `json:"kind"`
	// Key is its path under the models folder, as a checkpoint's is.
	Key string `json:"key"`
}

// ForgeModules lists them. /sd-modules gives both kinds together, by the same fields,
// and only a file's folder says which is which.
func (c *Client) ForgeModules(ctx context.Context, base string) ([]ForgeModule, error) {
	var raw []a1111VaeRaw
	if err := c.getJSON(ctx, base+"/sdapi/v1/sd-modules", &raw); err != nil {
		return nil, err
	}
	out := make([]ForgeModule, 0, len(raw))
	for _, m := range raw {
		if m.ModelName == "" {
			continue
		}
		path := strings.ToLower(strings.ReplaceAll(m.Filename, "\\", "/"))
		mod := ForgeModule{Name: m.ModelName, Kind: "te", Key: a1111KeyOf(m.Filename, a1111TextEncoders)}
		if strings.Contains(path, "/vae/") {
			mod.Kind, mod.Key = "vae", a1111KeyOf(m.Filename, a1111VaeFolder)
		}
		out = append(out, mod)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Name < out[j].Name })
	return out, nil
}

// Matches says a file of this name is what the slot wants.
func (s ModuleSlot) Matches(name string) bool {
	n := squeeze(name)
	for _, no := range s.not {
		if strings.Contains(n, no) {
			return false
		}
	}
	lower := strings.ToLower(name)
	for _, e := range s.exact {
		if lower == e {
			return true
		}
	}
	for _, m := range s.match {
		if strings.Contains(n, m) {
			return true
		}
	}
	return false
}

// quantWords mark a smaller, cut-down file. A run takes the full one when there are
// both, and a trainer cannot use the others at all.
var quantWords = []string{"fp8", "fp4", "int8", "int4", "w4a8", "w6a8", "nvfp", "mxfp", "gguf", "scaled", "convrot"}

func moduleRank(name string) int {
	n := strings.ToLower(name)
	for _, q := range quantWords {
		if strings.Contains(n, q) {
			return 1
		}
	}
	return 0
}

// pickModules fills a checkpoint's slots from what Forge has: the file the person chose
// for a slot, else the best one that fits, skipping what the checkpoint carries itself.
// A chosen file that matches no slot by name fills an empty slot of its kind, for a
// module someone renamed.
func pickModules(slots []ModuleSlot, have []ForgeModule, chosen []string, facts FileFacts) (names []string, missing []ModuleSlot) {
	byName := map[string]ForgeModule{}
	for _, m := range have {
		byName[m.Name] = m
	}
	used := map[string]bool{}
	var open []ModuleSlot
	for _, slot := range slots {
		if slot.Kind == "te" && facts.HasTE || slot.Kind == "vae" && facts.HasVAE {
			continue
		}
		pick := ""
		for _, c := range chosen {
			// A family has one VAE, so choosing one is choosing that one, whatever it is
			// called. Text encoders come in sets and have to go by their names.
			if m, ok := byName[c]; ok && m.Kind == slot.Kind && (slot.Matches(c) || slot.Kind == "vae") && !used[c] {
				pick = c
				break
			}
		}
		if pick == "" {
			fits := []string{}
			for _, m := range have {
				if m.Kind == slot.Kind && slot.Matches(m.Name) {
					fits = append(fits, m.Name)
				}
			}
			sort.SliceStable(fits, func(i, j int) bool { return moduleRank(fits[i]) < moduleRank(fits[j]) })
			if len(fits) > 0 {
				pick = fits[0]
			}
		}
		if pick == "" {
			open = append(open, slot)
			continue
		}
		used[pick] = true
		names = append(names, pick)
	}
	for _, slot := range open {
		filled := false
		for _, c := range chosen {
			if m, ok := byName[c]; ok && m.Kind == slot.Kind && !used[c] {
				used[c], filled = true, true
				names = append(names, c)
				break
			}
		}
		if !filled {
			missing = append(missing, slot)
		}
	}
	return names, missing
}

// checkpointEntry finds a checkpoint without the LoRA listing a1111Files reads too,
// which is the slow one, since a run has only the one question.
func (c *Client) checkpointEntry(ctx context.Context, base, name string) (a1111File, bool) {
	var models []a1111ModelRaw
	if err := c.getJSON(ctx, base+"/sdapi/v1/sd-models", &models); err != nil {
		return a1111File{}, false
	}
	files := make([]a1111File, 0, len(models))
	for _, m := range models {
		files = append(files, a1111File{Key: a1111KeyOf(m.Filename, a1111Checkpoints), Name: m.Title,
			Display: m.ModelName, Type: a1111Checkpoints.Type, Remote: m.Filename})
	}
	f, ok := checkpointNamed(files, name)
	if !ok {
		return a1111File{}, false
	}
	return *f, true
}

// checkpointNamed finds a checkpoint by a name a clip holds, which is its file's.
func checkpointNamed(files []a1111File, name string) (*a1111File, bool) {
	for i := range files {
		if checkpointBaseName(files[i].Key) == name {
			return &files[i], true
		}
	}
	return a1111Find(files, name)
}

// CheckpointFacts is what a checkpoint is, by the name the studio picks it by.
func (c *Client) CheckpointFacts(ctx context.Context, base, name string) (FileFacts, string) {
	if name == "" {
		var opts struct {
			Checkpoint string `json:"sd_model_checkpoint"`
		}
		if c.getJSON(ctx, base+"/sdapi/v1/options", &opts) != nil {
			return FileFacts{}, ""
		}
		name = opts.Checkpoint
	}
	f, ok := c.checkpointEntry(ctx, base, name)
	if !ok {
		return FileFacts{}, ""
	}
	return c.factsOf(c.home(ctx, base), f), f.Key
}

// allOnDisk says every one of these slots has a file in the folder.
func (c *Client) allOnDisk(slots []ModuleSlot) bool {
	local := c.localModules()
	for _, s := range slots {
		found := false
		for _, l := range local {
			found = found || l.Kind == s.Kind && s.Matches(l.Name)
		}
		if !found {
			return false
		}
	}
	return len(slots) > 0
}

// forgeScriptTitles are the scripts a run might ask for, as Forge titles them.
const (
	scriptSpectrum = "Spectrum Integrated"
	scriptSparse   = "Sparse Attention Integrated"
	scriptNeverOOM = "Never OOM Integrated"
	scriptStitch   = "ImageStitch Integrated"
	scriptRescale  = "RescaleCFG"
	scriptMaHiRo   = "MaHiRo"
	scriptRefiner  = "Refiner"
	scriptPiD      = "PiD Integrated"
)

// ForgeExtras says which of the scripts this Forge has loaded. Several are hidden
// behind a setting of Forge's, and asking for an absent one fails the whole run with a
// 422, so a client offers only these and a run leaves the others out.
func (c *Client) ForgeExtras(ctx context.Context, base string) []string {
	var scripts struct {
		Txt2Img []string `json:"txt2img"`
		Img2Img []string `json:"img2img"`
	}
	if c.getJSON(ctx, base+"/sdapi/v1/scripts", &scripts) != nil {
		return nil
	}
	loaded := map[string]bool{}
	for _, name := range append(scripts.Txt2Img, scripts.Img2Img...) {
		loaded[strings.ToLower(strings.TrimSpace(name))] = true
	}
	var out []string
	for _, title := range []string{scriptSpectrum, scriptSparse, scriptNeverOOM, scriptStitch, scriptRescale, scriptMaHiRo, scriptRefiner, scriptPiD} {
		if loaded[strings.ToLower(title)] {
			out = append(out, title)
		}
	}
	return out
}

// forgeApply fills a payload in with what its checkpoint's family needs.
func (c *Client) forgeApply(ctx context.Context, base string, req GenerateRequest, p *txt2imgPayload) error {
	run := req.Forge
	facts, key := c.CheckpointFacts(ctx, base, req.Checkpoint)
	fam, known := FamilyByID(facts.Family)
	if known {
		have, err := c.ForgeModules(ctx, base)
		if err != nil {
			return fmt.Errorf("reading Forge's text encoders: %w", err)
		}
		// The studio's VAE list is the same choice as a family's VAE slot. Sent as sd_vae
		// as well it would load over the module, so a family with a slot takes it there.
		chosen := run.Modules
		slots := fam.slotsFor(facts.Variant)
		if req.VAE != "" && !facts.HasVAE && slices.ContainsFunc(slots, func(s ModuleSlot) bool { return s.Kind == "vae" }) {
			chosen = append(append([]string(nil), chosen...), req.VAE)
			p.vaeInModules = true
		}
		// Never nil: an empty list is what clears a choice left over in Forge's UI.
		modules, missing := pickModules(slots, have, chosen, facts)
		if len(missing) > 0 {
			return &MissingModulesError{Family: fam.ID, Missing: missing, OnDisk: c.allOnDisk(missing)}
		}
		if modules == nil {
			modules = []string{}
		}
		p.OverrideSettings["forge_additional_modules"] = modules
	}

	settled := fam.Settled(key)
	if run.ModelSettings && len(fam.Slots) > 0 {
		p.SamplerName, p.Steps, p.CfgScale = settled.Sampler, settled.Steps, settled.CFG
		if settled.Width > 0 && !settled.Video {
			p.Width, p.Height = settled.Width, settled.Height
		}
	}
	if p.SamplerName == "" {
		p.SamplerName = settled.Sampler
	}
	if p.Steps <= 0 {
		p.Steps = settled.Steps
	}
	if p.CfgScale <= 0 {
		p.CfgScale = settled.CFG
	}
	p.Scheduler = run.Scheduler
	if p.Scheduler == "" {
		p.Scheduler = settled.Scheduler
	}
	if fam.Tune != "" {
		p.DistilledCFG = run.Shift
		if p.DistilledCFG <= 0 {
			p.DistilledCFG = fam.Shift
		}
	}
	if fam.Reference != "" && len(req.InitImage) > 0 {
		p.OverrideSettings[fam.Reference] = run.AsReference
	}
	if fam.Video {
		frames := run.Frames
		if frames < 1 {
			frames = 1
		}
		// Wan's frames come in fours and one; Forge rounds down to it silently.
		p.BatchSize, p.NIter = (frames-1)/4*4+1, 1
	}

	loaded := map[string]bool{}
	for _, t := range c.ForgeExtras(ctx, base) {
		loaded[t] = true
	}
	script := func(title string, args ...any) {
		if !loaded[title] {
			return
		}
		if p.AlwaysOnScripts == nil {
			p.AlwaysOnScripts = map[string]any{}
		}
		p.AlwaysOnScripts[title] = map[string]any{"args": args}
	}
	if run.Refiner != "" {
		at := run.RefinerAt
		if at <= 0 || at >= 1 {
			at = 0.8
		}
		p.RefinerCheckpoint, p.RefinerSwitchAt, p.RefinerCFG = run.Refiner, at, run.RefinerCFG
		// With the script loaded its own arguments win over the fields, and left out
		// its defaults switch the refiner off again.
		rules := run.RefinerRules
		if rules == "" {
			rules = forgeRefinerRules
		}
		script(scriptRefiner, true, run.Refiner, at, run.RefinerCFG, rules)
	}
	if run.Spectrum {
		script(scriptSpectrum, true) // the rest of its arguments are its own defaults
	}
	if run.Sparse {
		script(scriptSparse, true)
	}
	if run.Offload || run.TiledVAE {
		script(scriptNeverOOM, run.Offload, run.TiledVAE)
	}
	if run.RescaleCFG > 0 {
		script(scriptRescale, min(run.RescaleCFG, 1))
	}
	if run.MaHiRo {
		script(scriptMaHiRo, true)
	}
	refs := run.References
	if len(run.LastFrame) > 0 {
		refs = [][]byte{run.LastFrame}
	}
	if len(refs) > 0 {
		list := make([]string, 0, len(refs))
		for _, r := range refs {
			list = append(list, base64.StdEncoding.EncodeToString(r))
		}
		script(scriptStitch, true, list, 1024)
	}
	if run.PiD != "" {
		if err := c.forgePiD(ctx, base, run.PiD, fam, facts, script); err != nil {
			return err
		}
	}
	return nil
}

// forgePiD finishes a picture with a PiD checkpoint. It decodes through the VAE of the
// family that drew the picture, which is what makes one PiD file serve several.
func (c *Client) forgePiD(ctx context.Context, base, checkpoint string, fam Family, facts FileFacts, script func(string, ...any)) error {
	pid, _ := FamilyByID(FamilyPiD)
	have, err := c.ForgeModules(ctx, base)
	if err != nil {
		return err
	}
	te, missing := pickModules(pid.Slots, have, nil, FileFacts{})
	if len(missing) > 0 {
		return &MissingModulesError{Family: FamilyPiD, Missing: missing}
	}
	vae := ""
	for _, slot := range fam.slotsFor(facts.Variant) {
		if slot.Kind != "vae" {
			continue
		}
		names, missing := pickModules([]ModuleSlot{slot}, have, nil, FileFacts{})
		if len(missing) > 0 {
			return &MissingModulesError{Family: fam.ID, Missing: missing}
		}
		vae = names[0]
	}
	if vae == "" {
		return errors.New("PiD finishes pictures from families with a VAE of their own, and this one's is inside its checkpoint")
	}
	script(scriptPiD, true, "", checkpoint, vae, te[0], 0.0, true)
	return nil
}

// a1111SamplerNames turns the studio's sampler ids, which are InvokeAI's, into
// Automatic1111's. Before this they went through as they were, and a name it does not
// know does not fail: A1111 and Forge both quietly fall back to their first sampler, so
// the picker changed nothing. The names with a schedule in them are read by every
// version: a modern one splits "Karras" back off into its own field.
var a1111SamplerNames = map[string]string{
	"ddim": "DDIM", "ddpm": "DDIM", "deis": "UniPC", "deis_k": "UniPC Karras", "pndm": "PLMS",
	"dpmpp_2s": "DPM++ 2S a", "dpmpp_2s_k": "DPM++ 2S a Karras",
	"dpmpp_2m": "DPM++ 2M", "dpmpp_2m_k": "DPM++ 2M Karras",
	"dpmpp_2m_sde": "DPM++ 2M SDE", "dpmpp_2m_sde_k": "DPM++ 2M SDE Karras",
	"dpmpp_3m": "DPM++ 3M SDE", "dpmpp_3m_k": "DPM++ 3M SDE Karras",
	"dpmpp_sde": "DPM++ SDE", "dpmpp_sde_k": "DPM++ SDE Karras",
	"er_sde": "ER SDE", "euler": "Euler", "euler_k": "Euler Karras", "euler_a": "Euler a",
	"heun": "Heun", "heun_k": "Heun Karras",
	"kdpm_2": "DPM2", "kdpm_2_k": "DPM2 Karras", "kdpm_2_a": "DPM2 a", "kdpm_2_a_k": "DPM2 a Karras",
	"lcm": "LCM", "lms": "LMS", "lms_k": "LMS Karras", "tcd": "LCM",
	"unipc": "UniPC", "unipc_k": "UniPC Karras",
}

// a1111SamplerName is the name to send: a name already A1111's goes through as it is,
// so a recipe from Civitai or a picture's saved settings still reads.
func a1111SamplerName(id string) string {
	if name, ok := a1111SamplerNames[strings.ToLower(strings.TrimSpace(id))]; ok {
		return name
	}
	return id
}

// familyDefaults fills in a checkpoint's recommended settings from its family, where
// its own card says nothing. Only the new families: an SDXL checkpoint with no card is
// someone's own numbers to keep, as it always was.
func familyDefaults(d *ModelDefaults, family, name string) *ModelDefaults {
	fam, ok := FamilyByID(family)
	if !ok || len(fam.Slots) == 0 {
		return d
	}
	fam = fam.Settled(name)
	if d == nil {
		d = &ModelDefaults{}
	}
	if d.Steps == 0 {
		d.Steps = fam.Steps
	}
	if d.CfgScale == 0 {
		d.CfgScale = fam.CFG
	}
	if d.Scheduler == "" {
		d.Scheduler = fam.Sampler
	}
	if d.Schedule == "" {
		d.Schedule = fam.Scheduler
	}
	if d.Shift == 0 {
		d.Shift = fam.Shift
	}
	if d.Width == 0 && d.Height == 0 && fam.Width > 0 {
		d.Width, d.Height = fam.Width, fam.Height
	}
	return d
}

// factsOf is what one file in the generator's lists is: what its header says, then what
// its name gives away, which also fills in the finer base a header cannot.
func (c *Client) factsOf(dir modelHome, f a1111File) FileFacts {
	parse := loraFacts
	if f.Type == a1111Checkpoints.Type {
		parse = checkpointFacts
	}
	facts, ok := FileFacts{}, false
	if dir.set() {
		facts, ok = c.facts().read(dir.path(f.Key), parse)
	}
	name := f.Remote
	if name == "" {
		name = f.Key
	}
	family, base := familyFromName(name)
	if !ok || facts.Family == "" {
		facts.Family = family
	}
	if facts.Base == "" && facts.Family == FamilySDXL {
		facts.Base = base
	}
	return facts
}

// readFactsOf reads the headers of a whole listing at once, a few at a time, so the
// first status after a start does not read a thousand LoRAs one by one over a share.
func (c *Client) readFactsOf(dir modelHome, files []a1111File) {
	if !dir.set() {
		return
	}
	sem := make(chan struct{}, 8)
	var wg sync.WaitGroup
	for _, f := range files {
		if f.Type != a1111Checkpoints.Type && f.Type != a1111LoraFolder.Type {
			continue
		}
		wg.Add(1)
		sem <- struct{}{}
		go func(f a1111File) {
			defer wg.Done()
			defer func() { <-sem }()
			c.factsOf(dir, f)
		}(f)
	}
	wg.Wait()
}

// settleBase is what a model is built on, as far as anything can say. The file's own
// tensors are the last word on the architecture, since a card can be wrong and a card
// written by an install from before this was only ever SD1 or SDXL. The base is the
// finest name there is for it that does not contradict them.
func settleBase(sc a1111Sidecar, facts FileFacts) (base, family string) {
	catalogue := strings.TrimSpace(sc.str(sidecarBase))
	card := strings.TrimSpace(sc.str(sidecarVersion))
	if strings.EqualFold(card, "unknown") {
		card = ""
	}
	family = facts.Family
	if family == "" {
		family = FamilyOfBase(catalogue)
	}
	if family == "" {
		family = FamilyOfBase(card)
	}
	switch {
	case catalogue != "" && (family == "" || FamilyOfBase(catalogue) == family || FamilyOfBase(catalogue) == ""):
		base = catalogue
	case facts.Base != "":
		base = facts.Base
	case family != "":
		base = FamilyLabel(family)
	default:
		base = card
	}
	return base, family
}
