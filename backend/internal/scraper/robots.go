package scraper

import (
	"bufio"
	"context"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

// robotsCache fetches and caches robots.txt per host and answers allow queries
// for our user agent. This is a deliberately minimal, conservative parser: it
// honors Disallow path prefixes for the matching User-agent group (falling back
// to the "*" group). Anything it cannot parse is treated as allowed.
type robotsCache struct {
	client *http.Client
	ua     string

	mu    sync.Mutex
	rules map[string]*hostRules // keyed by scheme://host
}

type hostRules struct {
	fetchedAt time.Time
	disallow  []string
}

func newRobotsCache(client *http.Client, ua string) *robotsCache {
	return &robotsCache{client: client, ua: ua, rules: make(map[string]*hostRules)}
}

func (rc *robotsCache) allowed(ctx context.Context, u *url.URL) (bool, error) {
	key := u.Scheme + "://" + u.Host
	rc.mu.Lock()
	hr, ok := rc.rules[key]
	stale := !ok || time.Since(hr.fetchedAt) > time.Hour
	rc.mu.Unlock()

	if stale {
		fetched, err := rc.fetch(ctx, key)
		if err != nil {
			// Fail open: if robots.txt can't be fetched, allow.
			return true, err
		}
		rc.mu.Lock()
		rc.rules[key] = fetched
		hr = fetched
		rc.mu.Unlock()
	}

	path := u.Path
	if path == "" {
		path = "/"
	}
	for _, d := range hr.disallow {
		if d != "" && strings.HasPrefix(path, d) {
			return false, nil
		}
	}
	return true, nil
}

func (rc *robotsCache) fetch(ctx context.Context, base string) (*hostRules, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, base+"/robots.txt", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", rc.ua)
	resp, err := rc.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	hr := &hostRules{fetchedAt: time.Now()}
	if resp.StatusCode != http.StatusOK {
		return hr, nil // no robots.txt → allow all
	}
	return parseRobots(resp.Body, rc.ua, hr), nil
}

// parseRobots collects Disallow rules from the group matching ua, else the "*"
// group. Simple line-based parsing sufficient for the common case.
func parseRobots(r interface{ Read([]byte) (int, error) }, ua string, hr *hostRules) *hostRules {
	uaLower := strings.ToLower(ua)
	var starRules, uaRules []string
	var currentAgents []string
	inGroup := false

	sc := bufio.NewScanner(r)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if i := strings.IndexByte(line, '#'); i >= 0 {
			line = strings.TrimSpace(line[:i])
		}
		if line == "" {
			continue
		}
		key, val, ok := strings.Cut(line, ":")
		if !ok {
			continue
		}
		key = strings.ToLower(strings.TrimSpace(key))
		val = strings.TrimSpace(val)

		switch key {
		case "user-agent":
			if inGroup {
				currentAgents = nil // new group starts
				inGroup = false
			}
			currentAgents = append(currentAgents, strings.ToLower(val))
		case "disallow":
			inGroup = true
			for _, a := range currentAgents {
				if a == "*" {
					starRules = append(starRules, val)
				} else if strings.Contains(uaLower, a) {
					uaRules = append(uaRules, val)
				}
			}
		}
	}
	if len(uaRules) > 0 {
		hr.disallow = uaRules
	} else {
		hr.disallow = starRules
	}
	return hr
}
