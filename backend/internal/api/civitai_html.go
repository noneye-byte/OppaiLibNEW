package api

import (
	"strings"

	"golang.org/x/net/html"
	"golang.org/x/net/html/atom"
)

// Civitai model descriptions are HTML written by whoever uploaded the model: a rich
// text editor's output, with headings, lists, links, embedded images and whatever
// else the editor let through. The app renders it inside the studio, so it is
// reduced here to the tags a description needs and nothing that can run, load or
// phone out — no scripts, no styles, no event attributes, no images (which would
// be third-party loads the page's CSP forbids anyway), and links only to http(s).
//
// The plain-text form is what goes to InvokeAI's description field and the
// per-model record, since neither renders markup.

// civitaiAllowedTags is the vocabulary a description keeps. Everything else is
// unwrapped: its text survives, the element does not.
var civitaiAllowedTags = map[string]bool{
	"p": true, "br": true, "strong": true, "b": true, "em": true, "i": true, "u": true, "s": true,
	"h1": true, "h2": true, "h3": true, "h4": true, "h5": true, "h6": true,
	"ul": true, "ol": true, "li": true, "a": true, "code": true, "pre": true,
	"blockquote": true, "hr": true, "table": true, "thead": true, "tbody": true,
	"tr": true, "th": true, "td": true,
}

// civitaiDroppedTags lose their contents as well as themselves: what is inside a
// script or a style is not prose.
var civitaiDroppedTags = map[string]bool{
	"script": true, "style": true, "iframe": true, "object": true, "embed": true,
	"video": true, "audio": true, "svg": true, "template": true, "noscript": true,
}

// sanitizeCivitaiHTML returns the description as markup safe to set as innerHTML.
func sanitizeCivitaiHTML(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	nodes, err := html.ParseFragment(strings.NewReader(raw), &html.Node{Type: html.ElementNode, Data: "div", DataAtom: atom.Div})
	if err != nil {
		return html.EscapeString(raw)
	}
	var b strings.Builder
	for _, n := range nodes {
		writeSanitized(&b, n)
	}
	return strings.TrimSpace(b.String())
}

func writeSanitized(b *strings.Builder, n *html.Node) {
	switch n.Type {
	case html.TextNode:
		b.WriteString(html.EscapeString(n.Data))
		return
	case html.ElementNode:
		tag := strings.ToLower(n.Data)
		if civitaiDroppedTags[tag] {
			return
		}
		if !civitaiAllowedTags[tag] {
			for c := n.FirstChild; c != nil; c = c.NextSibling {
				writeSanitized(b, c)
			}
			return
		}
		b.WriteString("<" + tag)
		if tag == "a" {
			if href := safeHref(n); href != "" {
				b.WriteString(` href="` + html.EscapeString(href) + `" target="_blank" rel="noopener noreferrer nofollow"`)
			}
		}
		if tag == "br" || tag == "hr" {
			b.WriteString(">")
			return
		}
		b.WriteString(">")
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			writeSanitized(b, c)
		}
		b.WriteString("</" + tag + ">")
	default:
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			writeSanitized(b, c)
		}
	}
}

// safeHref keeps a link only when it is an absolute http(s) URL. Relative links
// would resolve against this app, and javascript:/data: are exactly the point.
func safeHref(n *html.Node) string {
	for _, a := range n.Attr {
		if strings.EqualFold(a.Key, "href") {
			v := strings.TrimSpace(a.Val)
			lower := strings.ToLower(v)
			if strings.HasPrefix(lower, "https://") || strings.HasPrefix(lower, "http://") {
				return v
			}
			return ""
		}
	}
	return ""
}

// civitaiPlainText flattens a description to prose: block elements become line
// breaks, inline markup disappears, runs of blank lines collapse. This is what the
// model record holds, and what InvokeAI's description field is given.
func civitaiPlainText(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	nodes, err := html.ParseFragment(strings.NewReader(raw), &html.Node{Type: html.ElementNode, Data: "div", DataAtom: atom.Div})
	if err != nil {
		return raw
	}
	var b strings.Builder
	for _, n := range nodes {
		writeText(&b, n)
	}
	// Collapse the whitespace the editor's markup left behind.
	lines := strings.Split(b.String(), "\n")
	out := make([]string, 0, len(lines))
	blank := true
	for _, line := range lines {
		line = strings.TrimSpace(strings.Join(strings.Fields(line), " "))
		if line == "" {
			if !blank {
				out = append(out, "")
			}
			blank = true
			continue
		}
		out = append(out, line)
		blank = false
	}
	return strings.TrimSpace(strings.Join(out, "\n"))
}

// Paragraph-level elements get a blank line around them; a line break and a list
// item start a new line only, so a list reads as a list rather than as a paragraph
// per bullet.
var civitaiParagraphTags = map[string]bool{
	"p": true, "div": true, "h1": true, "h2": true, "h3": true, "h4": true,
	"h5": true, "h6": true, "ul": true, "ol": true, "pre": true,
	"blockquote": true, "hr": true, "table": true,
}

const (
	paragraphBreak = "\n\n"
	lineBreak      = "\n"
	bullet         = "• "
)

func writeText(b *strings.Builder, n *html.Node) {
	switch n.Type {
	case html.TextNode:
		b.WriteString(n.Data)
	case html.ElementNode:
		tag := strings.ToLower(n.Data)
		if civitaiDroppedTags[tag] {
			return
		}
		switch {
		case civitaiParagraphTags[tag]:
			b.WriteString(paragraphBreak)
		case tag == "br" || tag == "tr":
			b.WriteString(lineBreak)
		case tag == "li":
			b.WriteString(lineBreak + bullet)
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			writeText(b, c)
		}
		if civitaiParagraphTags[tag] {
			b.WriteString(paragraphBreak)
		}
	default:
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			writeText(b, c)
		}
	}
}
