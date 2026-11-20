package api

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	_ "image/png" // texture sizes
	"io"
	"path"
	"sort"
	"strings"
)

// Reading a Live2D model out of the zip it arrives in.
//
// A Cubism 3+ model is a folder: a .model3.json naming the rest — the .moc3, its
// textures, physics, a pose, expressions and motions — by paths relative to itself. Two
// things about the folders people actually have make it worth more than unpacking:
//
//   - The names. A model from a Chinese or Japanese artist is 魔女.moc3 in 魔女.8192/,
//     and every one of those paths goes through a URL, a path wildcard and a decoder on
//     its way back. Each file is given a plain served name here instead
//     (tex0.png, exp/3.exp3.json), and the model3.json is rewritten to name those, so
//     nothing after this ever sees the original paths.
//   - What the model3.json leaves out. A model rigged for VTube Studio usually lists no
//     expressions or motions at all: its expressions are .exp3.json files beside it,
//     bound to hotkeys in a .vtube.json, and its idle loop is named there too. Those are
//     found and written into the rewritten model3.json — expressions by file, the idle
//     motion in the "Idle" group the renderer loops — and the hotkey names are kept as
//     the expressions' labels, since "爱心眼" (heart eyes) says what "x.exp3.json" does not.

// live2dMaxFiles bounds one model's files; a real one has tens.
const live2dMaxFiles = 400

// live2dImport is a model read out of its zip, ready to store.
type live2dImport struct {
	// Name is the model's own, from its file or VTube Studio's.
	Name string
	// Files are the served names and their bytes, the rewritten model3.json among them
	// as live2dModelFile.
	Files map[string][]byte
	// Expressions are every expression the model has, in a stable order.
	Expressions []live2dExpression
	// Idle is the motion the renderer loops, by served name, "" for none.
	Idle string
	// Motions counts the motions it has, idle included.
	Motions int
	// Texture is the largest texture side, in pixels, for the warning a phone needs.
	Texture int
}

// live2dExpression is one expression: its name in the model3.json, the file it is
// served as, and the label a person gave it, when anybody did.
type live2dExpression struct {
	Name  string `json:"name"`
	File  string `json:"file"`
	Label string `json:"label,omitempty"`
}

const live2dModelFile = "model.model3.json"

// readLive2DZip reads a model out of a zip's bytes.
func readLive2DZip(data []byte) (*live2dImport, error) {
	zr, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return nil, errors.New("that is not a zip file")
	}
	if len(zr.File) > live2dMaxFiles*4 {
		return nil, errors.New("that zip holds too many files to be one model")
	}
	files := map[string]*zip.File{}
	var models []string
	for _, f := range zr.File {
		if f.FileInfo().IsDir() {
			continue
		}
		name := path.Clean(strings.ReplaceAll(f.Name, "\\", "/"))
		if strings.HasPrefix(name, "../") || strings.HasPrefix(name, "/") || name == ".." {
			continue
		}
		files[name] = f
		if strings.HasSuffix(strings.ToLower(name), ".model3.json") {
			models = append(models, name)
		}
	}
	if len(models) == 0 {
		if hasSuffixIn(files, ".model.json", ".moc") {
			return nil, errors.New("this is a Cubism 2 model (.model.json and .moc); only Cubism 3 and later — a .model3.json with a .moc3 — can be shown")
		}
		return nil, errors.New("there is no .model3.json in that zip — it needs the whole model folder")
	}
	// The shallowest, then the first by name: a zip of one model with a copy of an old
	// version in a subfolder means the one at the top.
	sort.Slice(models, func(a, b int) bool {
		if da, db := strings.Count(models[a], "/"), strings.Count(models[b], "/"); da != db {
			return da < db
		}
		return models[a] < models[b]
	})
	modelPath := models[0]
	base := path.Dir(modelPath)

	read := func(name string) ([]byte, error) {
		f, ok := files[name]
		if !ok {
			return nil, fmt.Errorf("the model names %s, which is not in the zip", strings.TrimPrefix(name, base+"/"))
		}
		if f.UncompressedSize64 > 256<<20 {
			return nil, fmt.Errorf("%s is too large", path.Base(name))
		}
		rc, err := f.Open()
		if err != nil {
			return nil, err
		}
		defer rc.Close()
		return io.ReadAll(io.LimitReader(rc, 256<<20))
	}
	rel := func(p string) string { return path.Clean(path.Join(base, strings.ReplaceAll(p, "\\", "/"))) }

	raw, err := read(modelPath)
	if err != nil {
		return nil, err
	}
	var model map[string]any
	if err := json.Unmarshal(trimBOM(raw), &model); err != nil {
		return nil, errors.New("the .model3.json is not valid JSON")
	}
	refs, _ := model["FileReferences"].(map[string]any)
	if refs == nil {
		return nil, errors.New("the .model3.json has no FileReferences")
	}
	out := &live2dImport{Files: map[string][]byte{}, Name: strings.TrimSuffix(path.Base(modelPath), ".model3.json")}
	// served maps an original path to its served name, so a file named twice is stored once.
	served := map[string]string{}
	take := func(orig, name string) (string, error) {
		full := rel(orig)
		if s, ok := served[full]; ok {
			return s, nil
		}
		if len(out.Files) >= live2dMaxFiles {
			return "", errors.New("the model names too many files")
		}
		body, err := read(full)
		if err != nil {
			return "", err
		}
		out.Files[name] = body
		served[full] = name
		return name, nil
	}

	moc, _ := refs["Moc"].(string)
	if moc == "" {
		return nil, errors.New("the .model3.json names no .moc3")
	}
	if refs["Moc"], err = take(moc, "model.moc3"); err != nil {
		return nil, err
	}
	textures, _ := refs["Textures"].([]any)
	if len(textures) == 0 {
		return nil, errors.New("the .model3.json names no textures")
	}
	for i, t := range textures {
		orig, _ := t.(string)
		name, err := take(orig, fmt.Sprintf("tex%d%s", i, strings.ToLower(path.Ext(orig))))
		if err != nil {
			return nil, err
		}
		textures[i] = name
		if cfg, _, err := image.DecodeConfig(bytes.NewReader(out.Files[name])); err == nil {
			out.Texture = max(out.Texture, cfg.Width, cfg.Height)
		}
	}
	for key, name := range map[string]string{
		"Physics": "physics.physics3.json", "Pose": "pose.pose3.json",
		"DisplayInfo": "display.cdi3.json", "UserData": "userdata.userdata3.json",
	} {
		if orig, ok := refs[key].(string); ok && orig != "" {
			if refs[key], err = take(orig, name); err != nil {
				return nil, err
			}
		}
	}

	// VTube Studio's file: the labels on the expressions' hotkeys and the idle loop.
	labels := map[string]string{}
	idleOrig := ""
	if vt := findBeside(files, base, ".vtube.json"); vt != "" {
		if body, err := read(vt); err == nil {
			var v struct {
				Name           string `json:"Name"`
				FileReferences struct {
					IdleAnimation string `json:"IdleAnimation"`
				} `json:"FileReferences"`
				Hotkeys []struct {
					Name   string `json:"Name"`
					Action string `json:"Action"`
					File   string `json:"File"`
				} `json:"Hotkeys"`
			}
			if json.Unmarshal(trimBOM(body), &v) == nil {
				if strings.TrimSpace(v.Name) != "" {
					out.Name = strings.TrimSpace(v.Name)
				}
				idleOrig = v.FileReferences.IdleAnimation
				for _, h := range v.Hotkeys {
					if h.Action == "ToggleExpression" && h.File != "" && strings.TrimSpace(h.Name) != "" {
						labels[rel(h.File)] = strings.TrimSpace(h.Name)
					}
				}
			}
		}
	}

	// Expressions: the listed ones, then every .exp3.json beside the model that is not.
	var exprs []map[string]any
	if list, ok := refs["Expressions"].([]any); ok {
		for _, e := range list {
			if m, ok := e.(map[string]any); ok {
				exprs = append(exprs, m)
			}
		}
	}
	listed := map[string]bool{}
	for _, e := range exprs {
		if f, _ := e["File"].(string); f != "" {
			listed[rel(f)] = true
		}
	}
	for _, name := range sortedUnder(files, base, ".exp3.json") {
		if !listed[name] {
			stem := strings.TrimSuffix(path.Base(name), ".exp3.json")
			exprs = append(exprs, map[string]any{"Name": stem, "File": strings.TrimPrefix(name, base+"/")})
		}
	}
	usedNames := map[string]bool{}
	for i, e := range exprs {
		orig, _ := e["File"].(string)
		name, _ := e["Name"].(string)
		if name == "" {
			name = strings.TrimSuffix(path.Base(orig), ".exp3.json")
		}
		for usedNames[name] {
			name += "_"
		}
		usedNames[name] = true
		file, err := take(orig, fmt.Sprintf("exp/%d.exp3.json", i))
		if err != nil {
			return nil, err
		}
		e["Name"], e["File"] = name, file
		out.Expressions = append(out.Expressions, live2dExpression{Name: name, File: file, Label: labels[rel(orig)]})
	}
	if len(exprs) > 0 {
		refs["Expressions"] = exprs
	}

	// Motions: the listed groups, then the idle loop VTube Studio names, then any other
	// motion beside the model in a group of its own, so it is stored but never played
	// unasked.
	groups, _ := refs["Motions"].(map[string]any)
	if groups == nil {
		groups = map[string]any{}
	}
	motionN := 0
	listedMotion := map[string]bool{}
	groupNames := make([]string, 0, len(groups))
	for g := range groups {
		groupNames = append(groupNames, g)
	}
	sort.Strings(groupNames)
	for _, g := range groupNames {
		list, _ := groups[g].([]any)
		for _, m := range list {
			entry, ok := m.(map[string]any)
			if !ok {
				continue
			}
			orig, _ := entry["File"].(string)
			if orig == "" {
				continue
			}
			listedMotion[rel(orig)] = true
			file, err := take(orig, fmt.Sprintf("mot/%d.motion3.json", motionN))
			if err != nil {
				return nil, err
			}
			motionN++
			entry["File"] = file
			if snd, _ := entry["Sound"].(string); snd != "" {
				if s, err := take(snd, fmt.Sprintf("snd/%d%s", motionN, strings.ToLower(path.Ext(snd)))); err == nil {
					entry["Sound"] = s
				} else {
					delete(entry, "Sound")
				}
			}
			if strings.EqualFold(g, "idle") && out.Idle == "" {
				out.Idle = file
			}
		}
	}
	if idleOrig != "" && !listedMotion[rel(idleOrig)] {
		if _, ok := files[rel(idleOrig)]; ok {
			file, err := take(idleOrig, fmt.Sprintf("mot/%d.motion3.json", motionN))
			if err != nil {
				return nil, err
			}
			motionN++
			listedMotion[rel(idleOrig)] = true
			idle, _ := groups["Idle"].([]any)
			groups["Idle"] = append(idle, map[string]any{"File": file})
			if out.Idle == "" {
				out.Idle = file
			}
		}
	}
	var extra []any
	for _, name := range sortedUnder(files, base, ".motion3.json") {
		if listedMotion[name] {
			continue
		}
		file, err := take(strings.TrimPrefix(name, base+"/"), fmt.Sprintf("mot/%d.motion3.json", motionN))
		if err != nil {
			return nil, err
		}
		motionN++
		extra = append(extra, map[string]any{"File": file})
	}
	if len(extra) > 0 {
		groups["Extra"] = extra
	}
	out.Motions = motionN
	if len(groups) > 0 {
		refs["Motions"] = groups
	}

	model["FileReferences"] = refs
	rewritten, err := json.MarshalIndent(model, "", "  ")
	if err != nil {
		return nil, err
	}
	out.Files[live2dModelFile] = rewritten
	return out, nil
}

func trimBOM(b []byte) []byte { return bytes.TrimPrefix(b, []byte("\xef\xbb\xbf")) }

func hasSuffixIn(files map[string]*zip.File, suffixes ...string) bool {
	for name := range files {
		for _, s := range suffixes {
			if strings.HasSuffix(strings.ToLower(name), s) {
				return true
			}
		}
	}
	return false
}

// findBeside is the first file with the suffix in the model's own folder.
func findBeside(files map[string]*zip.File, base, suffix string) string {
	var found []string
	for name := range files {
		if path.Dir(name) == base && strings.HasSuffix(strings.ToLower(name), suffix) {
			found = append(found, name)
		}
	}
	sort.Strings(found)
	if len(found) == 0 {
		return ""
	}
	return found[0]
}

// sortedUnder is every file with the suffix in the model's folder or below it, sorted.
func sortedUnder(files map[string]*zip.File, base, suffix string) []string {
	var out []string
	prefix := base + "/"
	if base == "." {
		prefix = ""
	}
	for name := range files {
		if strings.HasPrefix(name, prefix) && strings.HasSuffix(strings.ToLower(name), suffix) {
			out = append(out, name)
		}
	}
	sort.Strings(out)
	return out
}
