package api

import (
	"strings"
	"testing"
)

func TestCivitaiDescriptionKeepsProseAndDropsEverythingActive(t *testing.T) {
	in := `<h2 id="x" style="color:red" onclick="alert(1)">DreamShaper</h2>` +
		`<p>Check the <a href="https://civitai.com/user/Lykon" target="_top">creator</a> ` +
		`and <a href="javascript:alert(1)">not this</a>.</p>` +
		`<script>alert(1)</script><style>p{display:none}</style>` +
		`<img src="https://image.civitai.com/x.jpeg" onerror="alert(1)">` +
		`<ul><li>one</li><li>two &amp; <b>three</b></li></ul>` +
		`<span data-foo="bar">plain</span><iframe src="https://evil"></iframe>`
	got := sanitizeCivitaiHTML(in)
	for _, want := range []string{
		`<h2>DreamShaper</h2>`,
		`<a href="https://civitai.com/user/Lykon" target="_blank" rel="noopener noreferrer nofollow">creator</a>`,
		`<a>not this</a>`,
		`<li>two &amp; <b>three</b></li>`,
		`plain`,
	} {
		if !strings.Contains(got, want) {
			t.Errorf("missing %q in %q", want, got)
		}
	}
	for _, banned := range []string{"script", "style", "onclick", "onerror", "<img", "iframe", "javascript", "alert", "<span", "data-foo"} {
		if strings.Contains(got, banned) {
			t.Errorf("%q survived in %q", banned, got)
		}
	}
}

func TestCivitaiPlainTextReadsLikeTheDescription(t *testing.T) {
	in := `<h1>Title</h1><p>First   paragraph<br>with a break.</p><p></p><p></p>` +
		`<ul><li>a <strong>bold</strong> point</li><li>another</li></ul><script>x()</script>`
	got := civitaiPlainText(in)
	want := "Title\n\nFirst paragraph\nwith a break.\n\n• a bold point\n• another"
	if got != want {
		t.Fatalf("plain text =\n%q\nwant\n%q", got, want)
	}
	if civitaiPlainText("  ") != "" {
		t.Fatal("blank in, blank out")
	}
}
