package api

import (
	"net"
	"net/http"
	"runtime"
	"strings"
	"sync"
	"time"
)

// loginGuard defends the login endpoint against brute force and against the
// resource-exhaustion angle of Argon2id: each verification deliberately costs
// 64 MiB and real CPU, so a flood of concurrent guesses (against the known
// default "admin") could exhaust a lean box. Two bounds address that — a
// per-client token bucket caps attempt *rate*, and a semaphore caps how many
// hashes run *at once* so memory stays bounded no matter the arrival pattern.
type loginGuard struct {
	mu      sync.Mutex
	buckets map[string]*tokenBucket
	lastGC  time.Time

	burst   float64 // attempts available in a spike
	refill  float64 // tokens regained per second
	hashSem chan struct{}
}

type tokenBucket struct {
	tokens float64
	last   time.Time
}

func newLoginGuard() *loginGuard {
	// Cap concurrent Argon2id hashes: at 64 MiB each this bounds peak memory. Small
	// and CPU-relative, since a personal server rarely has a real login storm.
	n := runtime.GOMAXPROCS(0) / 2
	if n < 2 {
		n = 2
	}
	if n > 4 {
		n = 4
	}
	return &loginGuard{
		buckets: make(map[string]*tokenBucket),
		lastGC:  time.Now(),
		burst:   8,    // allow a short spike (a fat-fingered login, a retrying app)
		refill:  0.25, // then ~15 attempts/minute sustained
		hashSem: make(chan struct{}, n),
	}
}

// allow reports whether a login attempt from key may proceed, spending a token if
// so. A rejected attempt costs nothing (no DB hit, no hash), which is the point.
func (g *loginGuard) allow(key string) bool {
	now := time.Now()
	g.mu.Lock()
	defer g.mu.Unlock()

	// Opportunistic GC so idle clients don't accumulate forever.
	if now.Sub(g.lastGC) > 10*time.Minute {
		for k, b := range g.buckets {
			if now.Sub(b.last) > 10*time.Minute {
				delete(g.buckets, k)
			}
		}
		g.lastGC = now
	}

	b := g.buckets[key]
	if b == nil {
		b = &tokenBucket{tokens: g.burst, last: now}
		g.buckets[key] = b
	}
	b.tokens += now.Sub(b.last).Seconds() * g.refill
	if b.tokens > g.burst {
		b.tokens = g.burst
	}
	b.last = now
	if b.tokens < 1 {
		return false
	}
	b.tokens--
	return true
}

// acquireHash blocks until an Argon2id slot is free, bounding peak memory.
func (g *loginGuard) acquireHash() { g.hashSem <- struct{}{} }
func (g *loginGuard) releaseHash() { <-g.hashSem }

// clientIP is the best-effort remote identity for rate-limiting. Behind a reverse
// proxy every request shares the proxy's RemoteAddr, so the last X-Forwarded-For
// hop is preferred when present — spoofable in principle, but the token bucket
// degrades to a global cap in the worst case, which is still a safe DoS bound.
func clientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		if ip := strings.TrimSpace(parts[len(parts)-1]); ip != "" {
			return ip
		}
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

// isHTTPS reports whether the request reached us over TLS, directly or via a
// terminating reverse proxy. It gates the session cookie's Secure flag: set it on
// HTTPS so the cookie can't leak over plaintext, but not on a plain-HTTP LAN
// deployment where a Secure cookie would simply never be sent and break login.
func isHTTPS(r *http.Request) bool {
	if r.TLS != nil {
		return true
	}
	return strings.EqualFold(r.Header.Get("X-Forwarded-Proto"), "https")
}
