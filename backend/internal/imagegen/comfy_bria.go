package imagegen

import (
	"context"
	"crypto/rand"
	"encoding/binary"
	"errors"
	"fmt"
	"strings"
)

// Cutting a clip's background with Bria, through ComfyUI.
//
// Bria's video background removal is one of ComfyUI's partner nodes: the clip goes up
// to Comfy.org, Bria takes her off whatever she was drawn on, and the clip comes back
// as an MP4 with her in front of one flat colour of its choosing. It is not
// transparent — the node asks for H.264, which has no alpha — so what comes back is a
// perfect screen rather than a cutout, and the server keys it (matte.KeyClip).
//
// A partner node is paid for from a Comfy.org account's credits, by the second of
// video, and run from ComfyUI's own page it uses whoever is signed in there. A
// workflow queued over the HTTP API has no one signed in: it has to carry the
// account's API key in extra_data, which is what api_key_comfy_org is.
//
// The graph is the user's own exported workflow: LoadVideo → BriaRemoveVideoBackground
// → SaveVideo, with format and codec left to ComfyUI.

// BriaColours are the screens a cut can ask Bria for, by the names its node offers.
// Green and blue are the only ones a clip of her is ever cut onto: the colour has to
// be one nothing of hers is, and those are the screens her clips are made on already.
var BriaColours = map[string]bool{"Green": true, "Blue": true}

// BriaMaxSeconds is the longest clip Bria takes; the node refuses anything longer.
const BriaMaxSeconds = 60

// BuildBriaCutGraph wires the cut of an uploaded clip, by its name in ComfyUI's input
// folder, onto a screen of colour.
func BuildBriaCutGraph(video, colour string, seed int64) map[string]any {
	g := &comfyGraph{nodes: map[string]any{}}
	load := g.add("LoadVideo", map[string]any{"file": video})
	cut := g.add("BriaRemoveVideoBackground", map[string]any{
		"video": slot(load, 0), "background_color": colour, "seed": seed,
	})
	g.add("SaveVideo", map[string]any{"video": slot(cut, 0), "filename_prefix": "oppailib/bria", "format": "auto", "codec": "auto"})
	return g.nodes
}

// ErrBriaKey is a cut asked of Bria with no Comfy.org key to pay for it.
var ErrBriaKey = errors.New("cutting with Bria needs a Comfy.org API key — make one at platform.comfy.org and paste it under Image generation → Video")

// RunBriaCut uploads a clip and has Bria put her on a screen of colour. ext is the
// clip's extension (".mp4", ".webm"), which ComfyUI's video loader goes by.
func (c *Client) RunBriaCut(ctx context.Context, base, apiKey string, clip []byte, ext, colour string, progress func(Progress)) ([]ComfyOutput, error) {
	base = strings.TrimRight(strings.TrimSpace(base), "/")
	if base == "" {
		return nil, fmt.Errorf("cutting with Bria runs through ComfyUI, and ComfyUI's address isn't set")
	}
	apiKey = strings.TrimSpace(apiKey)
	if apiKey == "" {
		return nil, ErrBriaKey
	}
	if !BriaColours[colour] {
		return nil, fmt.Errorf("Bria is asked for a green or blue screen, not %q", colour)
	}
	name, err := c.comfyUploadAs(ctx, base, clip, ext, "the clip")
	if err != nil {
		return nil, err
	}
	out, err := c.runComfyGraphWith(ctx, base, BuildBriaCutGraph(name, colour, briaSeed()),
		map[string]any{"api_key_comfy_org": apiKey}, progress)
	if err != nil {
		return nil, briaProblem(err)
	}
	return out, nil
}

// briaSeed is a fresh seed for the node, as the exported workflow's "randomize" had
// it. Bria's results do not follow it: in ComfyUI a seed on a partner node is only
// what makes an unchanged graph run again rather than come from the cache.
func briaSeed() int64 {
	var b [8]byte
	_, _ = rand.Read(b[:])
	return int64(binary.LittleEndian.Uint64(b[:]) % 2147483647)
}

// briaProblem says what a failed cut needs, where ComfyUI's own words would not: a
// ComfyUI from before the node, or an account that will not pay for it.
func briaProblem(err error) error {
	msg := strings.ToLower(err.Error())
	switch {
	case strings.Contains(msg, "briaremovevideobackground") && (strings.Contains(msg, "does not exist") || strings.Contains(msg, "not found")):
		return fmt.Errorf("this ComfyUI has no Bria Remove Video Background node — update ComfyUI (the node is in its core partner nodes): %w", err)
	case strings.Contains(msg, "unauthorized") || strings.Contains(msg, "401") || strings.Contains(msg, "api key") || strings.Contains(msg, "login") || strings.Contains(msg, "sign in"):
		return fmt.Errorf("Comfy.org refused the cut — check the Comfy.org API key under Image generation → Video: %w", err)
	case strings.Contains(msg, "402") || strings.Contains(msg, "credit") || strings.Contains(msg, "insufficient") || strings.Contains(msg, "payment"):
		return fmt.Errorf("the Comfy.org account is out of credits for Bria: %w", err)
	}
	return err
}
