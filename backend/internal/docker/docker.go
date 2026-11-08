// Package docker restarts the containers OppaiLib's AI tools run in.
//
// Most of the tools can be restarted from their own API, but not all, and not every
// install of the ones that can: Automatic1111 needs --api-server-stop and a launcher
// that loops, ComfyUI needs the Manager, text-generation-webui and a speech server have
// no restart at all. On Unraid each of them is a container, and Docker can restart any
// container — so when Docker's socket is mapped into OppaiLib's, that is the restart
// that always works.
//
// Mapping the socket hands OppaiLib control of every container on the box, which is
// why it is opt-in and why this package does exactly one thing: restart the container
// a tool's address leads to. It never takes a container name from a request, so the
// worst a signed-in admin can do through it is restart a tool OppaiLib is already
// pointed at.
package docker

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

// DefaultSocket is where Docker listens on Linux, and where the Unraid template maps it.
const DefaultSocket = "/var/run/docker.sock"

// ErrNoSocket is Docker's socket not being mapped into this container.
var ErrNoSocket = errors.New("docker socket not mapped")

// ErrNoMatch is an address no container answers at, as far as Docker says.
var ErrNoMatch = errors.New("no container found for that address")

// Client talks to the Docker Engine API over its unix socket.
type Client struct {
	socket string
	hc     *http.Client
	// self is this container's id prefix (Docker's default hostname), never restarted.
	self string
}

// New returns a client for the socket at path, "" meaning OPPAI_DOCKER_SOCKET or
// DefaultSocket.
func New(path string) *Client {
	if path == "" {
		path = os.Getenv("OPPAI_DOCKER_SOCKET")
	}
	if path == "" {
		path = DefaultSocket
	}
	host, _ := os.Hostname()
	return &Client{
		socket: path,
		self:   strings.ToLower(host),
		hc: &http.Client{
			// A restart waits for the container to stop, up to its grace period.
			Timeout: 90 * time.Second,
			Transport: &http.Transport{
				DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
					var d net.Dialer
					return d.DialContext(ctx, "unix", path)
				},
			},
		},
	}
}

// Self is this container's id prefix, which Match never picks.
func (c *Client) Self() string { return c.self }

// Available says whether the socket is there to be used.
func (c *Client) Available() bool {
	if c == nil {
		return false
	}
	info, err := os.Stat(c.socket)
	return err == nil && info.Mode()&os.ModeSocket != 0
}

// Container is the little of a container the match reads.
type Container struct {
	ID    string   `json:"Id"`
	Names []string `json:"Names"`
	Image string   `json:"Image"`
	State string   `json:"State"`
	Ports []struct {
		IP          string `json:"IP"`
		PrivatePort int    `json:"PrivatePort"`
		PublicPort  int    `json:"PublicPort"`
	} `json:"Ports"`
	NetworkSettings struct {
		Networks map[string]struct {
			IPAddress string `json:"IPAddress"`
		} `json:"Networks"`
	} `json:"NetworkSettings"`
}

// Name is the container's name without Docker's leading slash.
func (ct Container) Name() string {
	if len(ct.Names) == 0 {
		return ct.ID[:min(12, len(ct.ID))]
	}
	return strings.TrimPrefix(ct.Names[0], "/")
}

func (c *Client) get(ctx context.Context, path string, out any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "http://docker"+path, nil)
	if err != nil {
		return err
	}
	resp, err := c.hc.Do(req)
	if err != nil {
		return fmt.Errorf("docker: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return dockerError(resp)
	}
	return json.NewDecoder(io.LimitReader(resp.Body, 8<<20)).Decode(out)
}

func dockerError(resp *http.Response) error {
	var body struct {
		Message string `json:"message"`
	}
	data, _ := io.ReadAll(io.LimitReader(resp.Body, 64<<10))
	if json.Unmarshal(data, &body) == nil && body.Message != "" {
		return fmt.Errorf("docker: %s", body.Message)
	}
	return fmt.Errorf("docker answered %s", resp.Status)
}

// Containers lists every container, stopped ones too: a tool that crashed is the one
// most in need of a restart.
func (c *Client) Containers(ctx context.Context) ([]Container, error) {
	if !c.Available() {
		return nil, ErrNoSocket
	}
	var out []Container
	return out, c.get(ctx, "/containers/json?all=1", &out)
}

// Find is the container a tool's address leads to.
func (c *Client) Find(ctx context.Context, address string) (*Container, error) {
	list, err := c.Containers(ctx)
	if err != nil {
		return nil, err
	}
	ct := Match(list, address, c.self)
	if ct == nil {
		return nil, ErrNoMatch
	}
	return ct, nil
}

// Restart restarts a container, giving it ten seconds to stop on its own.
func (c *Client) Restart(ctx context.Context, id string) error {
	if !c.Available() {
		return ErrNoSocket
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"http://docker/containers/"+url.PathEscape(id)+"/restart?t=10", nil)
	if err != nil {
		return err
	}
	resp, err := c.hc.Do(req)
	if err != nil {
		return fmt.Errorf("docker: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusNoContent && resp.StatusCode != http.StatusOK {
		return dockerError(resp)
	}
	return nil
}

// Match picks the container an address leads to, nil when none clearly does. It is
// pure so the rules can be tested without a Docker:
//
//   - the host is the container's name, as on a shared Docker network;
//   - the host is one of the container's own addresses, as on Unraid's br0, where each
//     container has an IP on the LAN — the port then has to be one it publishes or
//     listens on, or nothing is said about the port at all;
//   - the port is one the container publishes on the box, whatever the host is called
//     from here (the server's LAN address, its name, localhost).
//
// self, this container, is never the answer: an address that leads back here is a
// mistake in the settings, and restarting OppaiLib from inside itself ends the request.
func Match(list []Container, address, self string) *Container {
	u, err := url.Parse(strings.TrimSpace(address))
	if err != nil || u.Host == "" {
		return nil
	}
	host := strings.ToLower(u.Hostname())
	port, _ := strconv.Atoi(u.Port())
	if port == 0 {
		port = 80
		if u.Scheme == "https" {
			port = 443
		}
	}
	isSelf := func(ct Container) bool {
		return self != "" && len(self) >= 12 && strings.HasPrefix(strings.ToLower(ct.ID), self)
	}
	var byName, byIP, byPort *Container
	for i := range list {
		ct := list[i]
		if isSelf(ct) {
			continue
		}
		for _, n := range ct.Names {
			if strings.EqualFold(strings.TrimPrefix(n, "/"), host) {
				byName = &list[i]
			}
		}
		for _, nw := range ct.NetworkSettings.Networks {
			if nw.IPAddress != "" && nw.IPAddress == host {
				byIP = &list[i]
			}
		}
		for _, p := range ct.Ports {
			if p.PublicPort == port {
				byPort = &list[i]
			}
		}
	}
	switch {
	case byName != nil:
		return byName
	case byIP != nil:
		return byIP
	default:
		return byPort
	}
}
