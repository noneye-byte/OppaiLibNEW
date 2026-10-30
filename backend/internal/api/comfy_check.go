package api

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"slices"
	"strings"
	"syscall"
	"time"

	"github.com/youruser/oppailib/internal/imagegen"
	"github.com/youruser/oppailib/internal/settings"
)

// The Video settings' Test: every link between pressing Make on a clip, or Install in
// Civitai's video mode, and it working — ComfyUI itself, how busy it is, each
// direction's files or pasted workflow against what ComfyUI has, and each install
// folder against the files ComfyUI lists. Clips have never been run here against a
// real ComfyUI, so when one fails what the operator needs is which link it was, in
// words, before a render gets half way. Rows are the Image generation Test's genCheck.

func (s *Server) handleComfyCheck(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
	defer cancel()
	writeJSON(w, http.StatusOK, map[string]any{"checks": s.comfyChecks(ctx)})
}

func (s *Server) comfyChecks(ctx context.Context) []genCheck {
	var out []genCheck
	add := func(c genCheck) { out = append(out, c) }
	set := s.settings.Get()
	base := strings.TrimRight(strings.TrimSpace(set.LibbyClipURL), "/")

	// ComfyUI. The folders are still worth looking at without it.
	var lists *imagegen.ComfyModels
	if base == "" {
		add(genCheck{ID: "comfy", Label: "ComfyUI", Detail: "No address is set, so clips are off."})
	} else if sys, err := s.comfyReach(ctx, base); err != nil {
		add(genCheck{ID: "comfy", Label: "ComfyUI", Detail: comfyUnreachable(base, err)})
	} else {
		add(genCheck{ID: "comfy", Label: "ComfyUI", OK: true, Detail: comfySystemLine(base, sys)})
		if running, pending, err := s.imagegen.ComfyQueue(ctx, base); err == nil {
			add(comfyQueueCheck(running, pending))
		}
		if m, err := s.imagegen.ListComfyModels(ctx, base); err != nil {
			add(genCheck{ID: "lists", Label: "Model lists", Detail: err.Error()})
		} else {
			lists = &m
		}
	}

	if lists != nil {
		for _, fromImage := range []bool{true, false} {
			add(s.comfyDirectionCheck(ctx, base, clipRecipeFor(set, fromImage), fromImage, *lists))
		}
	}

	places := s.comfyPlaces()
	for _, k := range []struct{ folder, label, what string }{
		{"diffusion_models", "Wan models folder", "Wan models"},
		{"checkpoints", "Checkpoints folder", "all-in-one checkpoints"},
		{"loras", "LoRA folder", "LoRAs"},
		{"vae", "VAE folder", "VAEs"},
	} {
		add(comfyFolderCheck("folder-"+k.folder, k.label, k.what, places[k.folder], comfyListed(lists, k.folder)))
	}
	return out
}

// comfyReachWait is how long ComfyUI gets to answer the first call. A firewall drops
// packets rather than refusing them, and without a limit of its own that call would
// sit out the whole check's minute before saying anything.
var comfyReachWait = 8 * time.Second // a var for the test

func (s *Server) comfyReach(ctx context.Context, base string) (imagegen.ComfySystem, error) {
	ctx, cancel := context.WithTimeout(ctx, comfyReachWait)
	defer cancel()
	return s.imagegen.ComfySystemStats(ctx, base)
}

// comfyUnreachable says why ComfyUI did not answer, by how it failed. --listen is
// rarely the problem by the time someone presses Test; what is left is the address,
// the port, a firewall, or Docker's networking, and each fails differently.
func comfyUnreachable(base string, err error) string {
	u, perr := url.Parse(base)
	host, port := "", ""
	if perr == nil {
		host, port = u.Hostname(), u.Port()
	}
	if port == "" {
		port = "80"
	}
	var dns *net.DNSError
	var nerr net.Error
	switch {
	case perr != nil || host == "":
		return fmt.Sprintf("%s is not an address — write it like http://192.168.1.10:8188.", base)
	case strings.Contains(err.Error(), "returned"):
		return fmt.Sprintf("Something answered at %s, but not as ComfyUI does (%v) — is that ComfyUI's port, and is anything (a reverse proxy, a login) in front of it?", base, err)
	case (errors.Is(err, syscall.ECONNREFUSED) || strings.Contains(err.Error(), "refused")) &&
		(host == "localhost" || host == "0.0.0.0" || strings.HasPrefix(host, "127.")):
		return fmt.Sprintf("%s refused the connection — and it points at OppaiLib's own container, not at ComfyUI: inside a container, localhost is the container itself. Use the LAN IP of the machine ComfyUI runs on, such as http://192.168.1.10:8188.", base)
	case errors.Is(err, syscall.ECONNREFUSED) || strings.Contains(err.Error(), "refused"):
		return fmt.Sprintf("%s refused the connection: the machine is there, but nothing is listening on port %s. Check ComfyUI is running and on that port (it says \"To see the GUI go to: …\" when it starts; the default is 8188). (%v)", host, port, err)
	case errors.As(err, &dns):
		return fmt.Sprintf("The name %s doesn't resolve from inside the OppaiLib container — use the IP address instead. (%v)", host, err)
	case errors.Is(err, context.DeadlineExceeded) || (errors.As(err, &nerr) && nerr.Timeout()):
		return fmt.Sprintf("Nothing answered from %s:%s within %d seconds — something is dropping the connection. On Windows, Defender Firewall blocks ComfyUI's port even with --listen: allow python.exe (or port %s) for private networks. On Unraid, if ComfyUI or OppaiLib is on a custom network (br0) and the other on bridge or host, turn on Settings → Docker → Host access to custom networks, or put both on the same network.", host, port, int(comfyReachWait/time.Second), port)
	// Not just "unreachable": the client prefixes every failure with that word.
	case strings.Contains(err.Error(), "no route to host") || strings.Contains(err.Error(), "network is unreachable") ||
		strings.Contains(err.Error(), "host is unreachable"):
		return fmt.Sprintf("There is no route from the OppaiLib container to %s — a different subnet, or Unraid's custom-network isolation (Settings → Docker → Host access to custom networks). (%v)", host, err)
	}
	return fmt.Sprintf("Could not reach %s: %v.", base, err)
}

// comfySystemLine is ComfyUI's version and the card it renders on, with its memory.
func comfySystemLine(base string, sys imagegen.ComfySystem) string {
	line := "ComfyUI"
	if sys.Version != "" {
		line += " " + sys.Version
	}
	line += " at " + base
	if len(sys.Devices) > 0 {
		d := sys.Devices[0]
		// ComfyUI names a card "cuda:0 NVIDIA GeForce RTX 4090 : cudaMallocAsync".
		name := d.Name
		if i := strings.Index(name, " : "); i > 0 {
			name = name[:i]
		}
		if f := strings.Fields(name); len(f) > 1 && strings.Contains(f[0], ":") {
			name = strings.Join(f[1:], " ")
		}
		line += ", on " + name
		if d.VRAMTotal > 0 {
			line += fmt.Sprintf(" — %.1f of %.1f GB free", float64(d.VRAMFree)/(1<<30), float64(d.VRAMTotal)/(1<<30))
		}
	}
	return line + "."
}

func comfyQueueCheck(running, pending int) genCheck {
	c := genCheck{ID: "queue", Label: "Queue", OK: true}
	switch {
	case running == 0 && pending == 0:
		c.Detail = "Nothing is running; a clip starts straight away."
	case pending == 0:
		c.Detail = "Busy with one prompt; a clip made now waits for it."
	default:
		c.Detail = fmt.Sprintf("Busy with one prompt and %d more waiting; a clip made now waits behind them.", pending)
	}
	return c
}

// comfyDirectionCheck is one direction's recipe against what ComfyUI has: each picked
// file still listed and the nodes the built graph uses present, or a pasted workflow
// that is an API export with every node installed and the placeholders it needs.
func (s *Server) comfyDirectionCheck(ctx context.Context, base string, r clipRecipe, fromImage bool, lists imagegen.ComfyModels) genCheck {
	c := genCheck{ID: "text", Label: "From words"}
	if fromImage {
		c.ID, c.Label = "image", "From a picture"
	}
	if r.built() {
		return comfyBuiltCheck(c, r.models, lists)
	}
	if strings.TrimSpace(r.workflow) == "" {
		c.OK, c.Skipped = true, true
		c.Detail = "Not set up: no model is picked and no workflow is pasted."
		if fromImage {
			c.Detail += " Animate on a picture and Libby's clips are off."
		}
		return c
	}
	classes, err := imagegen.WorkflowNodes(r.workflow)
	if err != nil {
		c.Detail = "The pasted workflow won't run: " + err.Error() + "."
		return c
	}
	missing, err := s.imagegen.ComfyMissingNodes(ctx, base, classes)
	if err != nil {
		c.Detail = "Could not ask ComfyUI about the workflow's nodes: " + err.Error()
		return c
	}
	if len(missing) > 0 {
		c.Detail = fmt.Sprintf("The pasted workflow uses nodes this ComfyUI doesn't have: %s. Install them (ComfyUI-Manager → Install Missing Custom Nodes) and restart it.", strings.Join(missing, ", "))
		return c
	}
	takes := imagegen.ComfyPlaceholders(r.workflow)
	has := map[string]bool{}
	for _, t := range takes {
		has[t] = true
	}
	if fromImage && !has["image"] {
		c.Detail = `The pasted workflow has no "{{image}}", so the picture is never used — write it as the image value of its Load Image node.`
		return c
	}
	c.OK = true
	c.Detail = fmt.Sprintf("A pasted workflow of %d kinds of node, all of which ComfyUI has", len(classes))
	if len(takes) > 0 {
		c.Detail += "; it takes " + strings.Join(takes, ", ")
	}
	if !has["prompt"] {
		c.Detail += `. It has no "{{prompt}}", so every clip is told the same thing`
	}
	if !has["seed"] {
		c.Detail += `. It has no "{{seed}}", so the same picture makes the same clip`
	}
	c.Detail += "."
	return c
}

func comfyBuiltCheck(c genCheck, m settings.ClipModels, lists imagegen.ComfyModels) genCheck {
	if len(lists.Missing) > 0 {
		c.Detail = fmt.Sprintf("This ComfyUI has no %s — it is older than Wan 2.2. Update it (Manager → Update ComfyUI, or git pull in its folder).", strings.Join(lists.Missing, ", "))
		return c
	}
	type pick struct{ name, as string }
	picks := []pick{{m.Model, "the model"}}
	listed := map[string][]string{"the model": append(append([]string{}, lists.Diffusion...), lists.Checkpoints...)}
	if m.LowModel != "" && !m.Checkpoint {
		picks = append(picks, pick{m.LowModel, "the low-noise model"})
		listed["the low-noise model"] = lists.Diffusion
	}
	if m.TextEncoder != "" {
		picks = append(picks, pick{m.TextEncoder, "the text encoder"})
		listed["the text encoder"] = lists.TextEncoders
	}
	if m.VAE != "" {
		picks = append(picks, pick{m.VAE, "the VAE"})
		listed["the VAE"] = lists.VAEs
	}
	for _, l := range m.Loras {
		picks = append(picks, pick{l.Name, "a LoRA"})
	}
	listed["a LoRA"] = lists.Loras
	// A .gguf file is only listed when ComfyUI-GGUF's loaders are installed, so a
	// missing loader shows up here as a file no longer listed.
	var gone []string
	for _, p := range picks {
		if !slices.Contains(listed[p.as], p.name) {
			gone = append(gone, fmt.Sprintf("%s (%s)", p.name, p.as))
		}
	}
	if len(gone) > 0 {
		c.Detail = fmt.Sprintf("ComfyUI no longer lists %s. Press Refresh and pick again, or put the file back.", strings.Join(gone, ", "))
		return c
	}
	if !m.Checkpoint && (m.TextEncoder == "" || m.VAE == "") {
		c.Detail = "A model from diffusion_models needs a text encoder and a VAE picked beside it."
		return c
	}
	c.OK = true
	c.Detail = fmt.Sprintf("Wan, built from %d files ComfyUI has", len(picks))
	if m.LowModel != "" && !m.Checkpoint {
		c.Detail += ", a high- and low-noise pair"
	}
	c.Detail += "."
	return c
}

// comfyListed is what ComfyUI lists for one install folder's kind, by file name; nil
// when ComfyUI did not answer.
func comfyListed(lists *imagegen.ComfyModels, folder string) map[string]bool {
	if lists == nil {
		return nil
	}
	var names []string
	switch folder {
	case "diffusion_models":
		names = lists.Diffusion
	case "checkpoints":
		names = lists.Checkpoints
	case "loras":
		names = lists.Loras
	case "vae":
		names = lists.VAEs
	}
	out := map[string]bool{}
	for _, n := range names {
		out[imagegen.ComfyBaseName(n)] = true
	}
	return out
}

// comfyFolderCheck is one install folder: set, usable, and — with ComfyUI's list to
// hand — one ComfyUI reads, judged by whether the files in it are the files it lists.
func comfyFolderCheck(id, label, what string, f imagegen.ComfyFolder, listed map[string]bool) genCheck {
	c := genCheck{ID: id, Label: label}
	switch {
	case f.Problem != "":
		c.Detail = f.Problem + "."
		return c
	case f.Dir == "":
		c.OK, c.Skipped = true, true
		c.Detail = fmt.Sprintf("Not set, so Civitai's video mode doesn't install %s.", what)
		return c
	}
	files := imagegen.ComfyFolderFiles(f.Dir)
	found, missing := 0, ""
	for _, name := range files {
		if listed[name] {
			found++
		} else if missing == "" {
			missing = name
		}
	}
	c.OK = true
	switch {
	case len(files) == 0:
		c.Detail = fmt.Sprintf("%s is empty and OppaiLib can write into it; with nothing in it yet there is no telling whether ComfyUI reads it.", f.Dir)
	case listed == nil:
		c.Detail = fmt.Sprintf("OppaiLib can write into %s (%d files); ComfyUI didn't answer, so whether it reads this folder is untested.", f.Dir, len(files))
	case found == 0 && len(files) == 1:
		c.OK = false
		c.Detail = fmt.Sprintf("The one file in %s, %s, is not among the %s ComfyUI lists — it doesn't read this folder, so installs here would never show up. Give the container's side of the mapping for the folder ComfyUI loads %s from.", f.Dir, missing, what, what)
	case found == 0:
		c.OK = false
		c.Detail = fmt.Sprintf("None of the %d files in %s are among the %s ComfyUI lists (%s, for one) — it doesn't read this folder, so installs here would never show up. Give the container's side of the mapping for the folder ComfyUI loads %s from.", len(files), f.Dir, what, missing, what)
	case found < len(files):
		c.Detail = fmt.Sprintf("%d of the %d files in %s are in ComfyUI's list; the rest (%s, for one) are files it skips. Installs go here.", found, len(files), f.Dir, missing)
	case found == 1:
		c.Detail = fmt.Sprintf("The one file in %s is in ComfyUI's list, so this is a folder it reads.", f.Dir)
	default:
		c.Detail = fmt.Sprintf("All %d files in %s are in ComfyUI's list, so this is a folder it reads.", len(files), f.Dir)
	}
	return c
}
