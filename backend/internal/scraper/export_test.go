package scraper

import "testing"

func TestMediaHTTPClientKeepsGuardedTransportWithoutShortBodyTimeout(t *testing.T) {
	e := New(Options{AllowPrivateHosts: true})
	client := e.MediaHTTPClient()
	if client.Timeout != 0 {
		t.Fatalf("media client timeout = %v", client.Timeout)
	}
	if client.Transport != e.HTTPClient().Transport || client.CheckRedirect == nil {
		t.Fatal("media client did not preserve the engine transport policy")
	}
	if e.HTTPClient().Timeout == 0 {
		t.Fatal("media client changed the bounded catalogue client")
	}
}
