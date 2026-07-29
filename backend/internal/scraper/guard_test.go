package scraper

import (
	"net"
	"testing"
)

func TestIsBlockedIP(t *testing.T) {
	blocked := []string{
		"127.0.0.1",       // loopback
		"::1",             // loopback v6
		"10.1.2.3",        // RFC1918
		"192.168.0.1",     // RFC1918
		"172.16.5.5",      // RFC1918
		"169.254.169.254", // link-local / cloud metadata
		"fe80::1",         // link-local v6
		"fd00::1",         // unique local v6
		"0.0.0.0",         // unspecified
		"224.0.0.1",       // multicast
	}
	for _, s := range blocked {
		if ip := net.ParseIP(s); ip == nil || !isBlockedIP(ip) {
			t.Errorf("expected %s to be blocked", s)
		}
	}

	allowed := []string{
		"1.1.1.1",
		"8.8.8.8",
		"93.184.216.34", // example.com
		"2606:2800:220:1:248:1893:25c8:1946",
	}
	for _, s := range allowed {
		if ip := net.ParseIP(s); ip == nil || isBlockedIP(ip) {
			t.Errorf("expected %s to be allowed", s)
		}
	}
}

func TestGuardDialBlocksLoopback(t *testing.T) {
	if err := guardDial("tcp", "127.0.0.1:8080", nil); err == nil {
		t.Fatal("guardDial allowed a loopback connection")
	}
	if err := guardDial("tcp", "8.8.8.8:443", nil); err != nil {
		t.Fatalf("guardDial blocked a public address: %v", err)
	}
}
