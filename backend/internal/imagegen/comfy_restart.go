package imagegen

import (
	"context"
	"net/http"
	"strings"
	"time"
)

// Restarting ComfyUI.
//
// Most of what is added to ComfyUI it sees without one: a model or a LoRA dropped in
// a folder it loads from is listed the next time it is asked (see comfy_install.go
// for when it is not). A custom node is another matter — nodes are imported once, at
// start — and so is a change to extra_model_paths.yaml. Core ComfyUI has no restart
// route; ComfyUI-Manager, which nearly every install has, adds one: GET
// /manager/reboot, or /v2/manager/reboot in the Manager that ships with ComfyUI
// itself. It answers by exec'ing a fresh process over the old one, so a request that
// breaks off is the restart under way.

// comfyManagerProbes are where a Manager says it is there, newest first.
var comfyManagerProbes = []struct{ version, reboot string }{
	{"/v2/manager/version", "/v2/manager/reboot"},
	{"/manager/version", "/manager/reboot"},
	{"/api/manager/version", "/api/manager/reboot"},
}

// comfyRebootRoute is the reboot route of the Manager that answers, "" when none does.
// Remembered a few minutes, as A1111's restart flag is: it changes only with a restart.
func (c *Client) comfyRebootRoute(ctx context.Context, base string) string {
	key := "comfy-restart|" + base
	c.mu.Lock()
	if e, ok := c.detailers[key]; ok && time.Since(e.at) < 5*time.Minute {
		route := e.route
		c.mu.Unlock()
		return route
	}
	c.mu.Unlock()
	route := ""
	for _, p := range comfyManagerProbes {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, base+p.version, nil)
		if err != nil {
			break
		}
		resp, err := c.hc.Do(req)
		if err != nil {
			// Not there at all; the next probe would only fail the same way.
			break
		}
		resp.Body.Close()
		if resp.StatusCode == http.StatusOK {
			route = p.reboot
			break
		}
	}
	c.mu.Lock()
	c.detailers[key] = boolEntry{value: route != "", route: route, at: time.Now()}
	c.mu.Unlock()
	return route
}

// ComfyCanRestart says whether ComfyUI can be restarted from here: it has a Manager.
func (c *Client) ComfyCanRestart(ctx context.Context, base string) bool {
	base = strings.TrimRight(strings.TrimSpace(base), "/")
	return base != "" && c.comfyRebootRoute(ctx, base) != ""
}

// ComfyRestart asks ComfyUI-Manager to restart ComfyUI.
func (c *Client) ComfyRestart(ctx context.Context, base string) error {
	base = strings.TrimRight(strings.TrimSpace(base), "/")
	route := c.comfyRebootRoute(ctx, base)
	if route == "" {
		return restartError{"ComfyUI can only be restarted from here when ComfyUI-Manager is installed — restart it where it runs, or install the Manager"}
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, base+route, nil)
	if err != nil {
		return err
	}
	resp, err := c.hc.Do(req)
	c.mu.Lock()
	delete(c.detailers, "comfy-restart|"+base)
	c.mu.Unlock()
	if err != nil {
		// The Manager was there a moment ago: this is ComfyUI going down.
		return nil
	}
	defer resp.Body.Close()
	switch {
	case resp.StatusCode == http.StatusForbidden:
		return restartError{"ComfyUI-Manager refused to restart ComfyUI: its security_level is set above \"normal\" — lower it in the Manager's config.ini, or restart ComfyUI where it runs"}
	case resp.StatusCode >= 300:
		return restartError{"ComfyUI-Manager refused to restart ComfyUI (" + resp.Status + ")"}
	}
	return nil
}
