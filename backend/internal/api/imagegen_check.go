package api

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/youruser/oppailib/internal/imagegen"
)

// The Image generation panel's Test button: every link between pressing Install on a
// Civitai model and the file turning up in A1111's picker, tried one at a time, each
// with what it found in words. The status endpoint answers "can models be managed"
// with a yes or no; when the answer is no and the operator believes it should be yes,
// what they need is which link is broken — the generator, its rescan route, the
// folder, whether that folder is the one A1111 reads, the catalogue, the key, or the
// download itself.

type genCheck struct {
	ID      string `json:"id"`
	Label   string `json:"label"`
	OK      bool   `json:"ok"`
	Skipped bool   `json:"skipped,omitempty"`
	Detail  string `json:"detail"`
}

func (s *Server) handleImageGenCheck(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 90*time.Second)
	defer cancel()
	writeJSON(w, http.StatusOK, map[string]any{"checks": s.imageGenChecks(ctx)})
}

func (s *Server) imageGenChecks(ctx context.Context) []genCheck {
	var out []genCheck
	add := func(c genCheck) { out = append(out, c) }
	set := s.settings.Get()
	base := strings.TrimSpace(set.ImageGenURL)

	// The generator.
	kind := imagegen.Kind("")
	if base == "" {
		add(genCheck{ID: "generator", Label: "Generator", Detail: "No generator URL is set, so the Create tab is off."})
	} else if k, err := s.imagegen.Backend(ctx, base); err != nil {
		add(genCheck{ID: "generator", Label: "Generator", Detail: fmt.Sprintf("Could not reach %s: %v", base, err)})
	} else {
		kind = k
		models, merr := s.imagegen.Models(ctx, base)
		loras, _ := s.imagegen.Loras(ctx, base)
		c := genCheck{ID: "generator", Label: "Generator", OK: merr == nil}
		if merr != nil {
			c.Detail = fmt.Sprintf("%s answers at %s, but listing its models failed: %v", kindName(k), base, merr)
		} else {
			c.Detail = fmt.Sprintf("%s at %s — %d models, %d LoRAs.", kindName(k), base, len(models), len(loras))
		}
		add(c)
	}

	if kind == imagegen.KindA1111 {
		s.a1111Checks(ctx, base, add)
	} else if kind != "" {
		add(genCheck{ID: "folder", Label: "Models folder", OK: true, Skipped: true,
			Detail: kindName(kind) + " installs and edits models itself; no folder is needed."})
	} else {
		// No generator to compare against, but the folder can still be looked at.
		dir := s.imagegen.A1111ModelsDir()
		add(folderCheck(dir))
	}

	s.civitaiChecks(ctx, set.CivitaiAPIURL, set.CivitaiAPIKey != "", add)
	return out
}

func kindName(k imagegen.Kind) string {
	switch k {
	case imagegen.KindInvokeAI:
		return "InvokeAI"
	case imagegen.KindA1111:
		return "Automatic1111"
	}
	return string(k)
}

func folderCheck(dir imagegen.A1111ModelsDir) genCheck {
	c := genCheck{ID: "folder", Label: "Models folder"}
	switch {
	case dir.Path == "":
		c.Detail = "Nothing is mounted at /a1111-models and no path is set, so models can be listed and linked but not installed, edited or deleted."
	case dir.Problem != "":
		c.Detail = dir.Problem + "."
	default:
		c.OK = true
		c.Detail = fmt.Sprintf("%s is a models folder and OppaiLib can write into it.", dir.Dir)
		if dir.Dir != dir.Path {
			c.Detail = fmt.Sprintf("%s was given; using %s, which is a models folder OppaiLib can write into.", dir.Path, dir.Dir)
		}
	}
	return c
}

// a1111Checks are the links only an A1111 has: its rescan route and the folder.
func (s *Server) a1111Checks(ctx context.Context, base string, add func(genCheck)) {
	if err := s.imagegen.A1111Rescan(ctx, base); err != nil {
		add(genCheck{ID: "rescan", Label: "Rescan route", Detail: fmt.Sprintf(
			"Automatic1111 refused /sdapi/v1/refresh-loras (%v). Installs still land, but it won't see them until it is restarted — is it running with --api?", err)})
	} else {
		add(genCheck{ID: "rescan", Label: "Rescan route", OK: true, Detail: "Automatic1111 rescans its folders when asked, so an install shows up without a restart."})
	}

	dir := s.imagegen.A1111ModelsDir()
	add(folderCheck(dir))
	add(s.outputsCheck())
	if dir.Dir == "" {
		return
	}
	m, err := s.imagegen.A1111FolderMatch(ctx, base)
	c := genCheck{ID: "match", Label: "Same folder as Automatic1111"}
	files := fmt.Sprintf("%d checkpoints, %d LoRAs and %d VAEs are in the folder", m.Files["Stable-diffusion"], m.Files["Lora"], m.Files["VAE"])
	switch {
	case err != nil:
		c.Detail = fmt.Sprintf("Could not compare: %v", err)
	case m.Reported == 0:
		c.OK, c.Skipped = true, true
		c.Detail = fmt.Sprintf("Automatic1111 lists no models yet, so there is nothing to compare; %s.", files)
	case m.Found == 0:
		c.Detail = fmt.Sprintf("None of the %d models Automatic1111 lists are in %s (it lists %s, for one) — %s. "+
			"This is a different folder from the one it reads, so installs would land where it never looks. "+
			"Map the host folder Automatic1111 itself loads from.", m.Reported, dir.Dir, m.Missing, files)
	case m.Found < m.Reported:
		c.OK = true
		c.Detail = fmt.Sprintf("%d of the %d models Automatic1111 lists are here; the rest (such as %s) are somewhere a launch flag points it. Installs go into this folder.",
			m.Found, m.Reported, m.Missing)
	default:
		c.OK = true
		c.Detail = fmt.Sprintf("All %d models Automatic1111 lists are in %s.", m.Reported, dir.Dir)
	}
	add(c)
}

// civitaiChecks try the catalogue, the key and a real download, stopping short of the
// file's body: the headers say whether the file would come.
func (s *Server) civitaiChecks(ctx context.Context, apiURL string, haveKey bool, add func(genCheck)) {
	var page struct {
		Items []civitaiRawModel `json:"items"`
	}
	params := url.Values{"limit": {"1"}, "types": {"VAE"}, "sort": {"Most Downloaded"}}
	if err := s.civitaiGet(ctx, "/models", params, &page, 8<<20); err != nil {
		add(genCheck{ID: "civitai", Label: "Civitai catalogue", Detail: fmt.Sprintf("%s: %v", apiURL, err)})
		return
	}
	add(genCheck{ID: "civitai", Label: "Civitai catalogue", OK: true, Detail: fmt.Sprintf("%s answers.", apiURL)})

	if !haveKey {
		add(genCheck{ID: "key", Label: "Civitai API key", OK: true, Skipped: true,
			Detail: "No key is set. Public files install without one; files that need an account, and the prompts behind posted pictures, need one."})
	} else {
		var me struct {
			Username string `json:"username"`
		}
		if err := s.civitaiGet(ctx, "/me", nil, &me, 1<<20); err != nil {
			add(genCheck{ID: "key", Label: "Civitai API key", Detail: err.Error()})
		} else if me.Username == "" {
			add(genCheck{ID: "key", Label: "Civitai API key", Detail: "Civitai did not say whose key this is; it may have been revoked."})
		} else {
			add(genCheck{ID: "key", Label: "Civitai API key", OK: true, Detail: "The key belongs to " + me.Username + "."})
		}
	}

	source := ""
	for _, m := range page.Items {
		for _, v := range m.ModelVersions {
			for _, f := range v.Files {
				if f.DownloadURL != "" && source == "" {
					source = f.DownloadURL
				}
			}
		}
	}
	if source == "" {
		add(genCheck{ID: "download", Label: "Civitai download", OK: true, Skipped: true, Detail: "The catalogue gave no file to try a download with."})
		return
	}
	add(civitaiDownloadCheck(ctx, source, s.settings.Get().CivitaiAPIKey))
}

// civitaiDownloadCheck starts the download an install would, with the same key and
// the same redirect, and reads only the headers.
func civitaiDownloadCheck(ctx context.Context, source, key string) genCheck {
	c := genCheck{ID: "download", Label: "Civitai download"}
	if !civitaiHostAllowed(source) {
		c.Detail = fmt.Sprintf("The catalogue's download URL (%s) is not on civitai.com or civitai.red, so installs refuse it.", source)
		return c
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, source, nil)
	if err != nil {
		c.Detail = err.Error()
		return c
	}
	req.Header.Set("User-Agent", "OppaiLib")
	if key != "" {
		req.Header.Set("Authorization", "Bearer "+key)
	}
	resp, err := civitaiDownloadHTTP.Do(req)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			c.Detail = "Civitai did not start sending the file in time."
		} else {
			c.Detail = fmt.Sprintf("Civitai is unreachable for downloads: %v", err)
		}
		return c
	}
	resp.Body.Close()
	switch {
	case resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden:
		c.Detail = fmt.Sprintf("Civitai refused the download (%d) — add or check the API key.", resp.StatusCode)
	case resp.StatusCode != http.StatusOK:
		c.Detail = fmt.Sprintf("Civitai answered the download with %d.", resp.StatusCode)
	case strings.HasPrefix(resp.Header.Get("Content-Type"), "text/html"):
		c.Detail = "Civitai sent a web page instead of the file; it probably wants an API key."
	default:
		c.OK = true
		c.Detail = "Civitai starts sending the file, so an install would download."
		if resp.ContentLength > 0 {
			c.Detail = fmt.Sprintf("Civitai starts sending the file (%.0f MB), so an install would download.", float64(resp.ContentLength)/(1<<20))
		}
	}
	return c
}

// civitaiDownloadHTTP has no overall timeout — the request's context bounds it, and
// the body is never read.
var civitaiDownloadHTTP = &http.Client{}

// outputsCheck is the gallery's folder: A1111's outputs, which the studio reads
// because A1111 has no API that lists what it made.
func (s *Server) outputsCheck() genCheck {
	c := genCheck{ID: "outputs", Label: "Outputs folder (gallery)"}
	if dir := s.imagegen.A1111OutputsDir(); dir != "" {
		c.OK = true
		c.Detail = fmt.Sprintf("%s is the gallery, and pictures made in Create are saved into it.", dir)
		return c
	}
	c.Detail = s.imagegen.A1111OutputsProblem() + "."
	return c
}
