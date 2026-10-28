package imagegen

import (
	"context"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"
)

// Restarting Automatic1111.
//
// Some things A1111 reads only when it starts: ADetailer's detectors, an extension
// just installed, a renamed detector. Its API can restart it, but only when it was
// launched with --api-server-stop (without it the route does not exist) and only from
// a launcher that starts it again (webui.sh and webui.bat loop when it asks them to;
// a container that runs launch.py directly has nothing to bring it back). The first
// is visible from outside — the route is in its OpenAPI listing — so the studio can
// say what to add to its flags before anyone presses the button; the second only
// shows as the refusal.

// ErrRestartUnsupported is a generator that cannot be restarted from here; the
// message says why and what to change.
var ErrRestartUnsupported = errors.New("restart unsupported")

type restartError struct{ msg string }

func (e restartError) Error() string        { return e.msg }
func (e restartError) Is(target error) bool { return target == ErrRestartUnsupported }

const restartRoute = "/sdapi/v1/server-restart"

// CanRestart says whether Automatic1111 has its restart route: it was started with
// --api-server-stop. Read off its OpenAPI listing, remembered a few minutes — the
// listing is a few hundred kilobytes and the flag changes only with a restart.
func (c *Client) CanRestart(ctx context.Context, base string) bool {
	kind, err := c.Backend(ctx, base)
	if err != nil || kind != KindA1111 {
		return false
	}
	key := "restart|" + base
	c.mu.Lock()
	if e, ok := c.detailers[key]; ok && time.Since(e.at) < 5*time.Minute {
		c.mu.Unlock()
		return e.value
	}
	c.mu.Unlock()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, base+"/openapi.json", nil)
	if err != nil {
		return false
	}
	resp, err := c.hc.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return false
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, 16<<20))
	if err != nil {
		return false
	}
	ok := strings.Contains(string(body), `"`+restartRoute+`"`)
	c.mu.Lock()
	c.detailers[key] = boolEntry{value: ok, at: time.Now()}
	c.mu.Unlock()
	return ok
}

// Restart asks Automatic1111 to restart itself. It answers by exiting, so a request
// that breaks off is the restart under way; a refusal says what is missing.
func (c *Client) Restart(ctx context.Context, base string) error {
	kind, err := c.Backend(ctx, base)
	if err != nil {
		return err
	}
	if kind != KindA1111 {
		return restartError{"InvokeAI can't be restarted from here — restart it where it runs"}
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, base+restartRoute, nil)
	if err != nil {
		return err
	}
	resp, err := c.hc.Do(req)
	if err != nil {
		// It was there a moment ago (Backend just answered): this is it going down.
		return nil
	}
	defer resp.Body.Close()
	c.mu.Lock()
	delete(c.detailers, "restart|"+base)
	c.mu.Unlock()
	switch {
	case resp.StatusCode == http.StatusNotFound:
		return restartError{"Automatic1111 can only be restarted from here when it is started with --api-server-stop — add it to COMMANDLINE_ARGS (beside --api) and restart it by hand once"}
	case resp.StatusCode == http.StatusNotImplemented:
		return restartError{"Automatic1111 has nothing to start it again: it restarts itself only when launched by webui.sh or webui.bat — restart it where it runs"}
	case resp.StatusCode >= 300:
		return restartError{"Automatic1111 refused to restart (" + resp.Status + ")"}
	}
	return nil
}
