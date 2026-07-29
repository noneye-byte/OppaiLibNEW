package sources

import (
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strings"

	"gopkg.in/yaml.v3"
)

// Saving, validating and removing user source definitions.
//
// A source added from the UI is a file in the config directory, exactly like one the
// operator wrote by hand. That keeps one code path for both and makes the feature
// inspectable: the answer to "what did that add-site button actually do" is a YAML
// file you can read, edit and delete.
//
// Everything here is about the boundary. A spec arriving over HTTP is user input
// that becomes a filename and a set of network destinations, so it is validated
// before it is trusted with either.

// maxSpecBytes caps a submitted definition. A source spec is a couple of kilobytes;
// anything approaching this is not one.
const maxSpecBytes = 64 << 10

// ValidateSpecForSave parses a submitted definition and checks the things that
// matter before it is written to disk and loaded.
//
// ParseSpec already rejects a spec that cannot work (no id, no base_url, no
// listing.item, an uncompilable pattern). What is added here is everything about the
// spec being *untrusted input* rather than a file the operator wrote:
//
//   - The id becomes a filename, so it must be a plain slug. A spec claiming
//     id: "../../config/settings" would otherwise choose where it is written.
//   - base_url must be http(s) with a real host. The dial guard already refuses
//     private addresses at connect time, but failing here gives the user the reason
//     rather than a confusing fetch error later.
//   - Hosts widen the streaming proxy's allowlist, which is the one thing in this
//     package with security weight. A bare "*" would turn the proxy into an open
//     one, so it is refused outright.
func ValidateSpecForSave(data []byte) (*SourceSpec, error) {
	if len(data) == 0 {
		return nil, fmt.Errorf("the definition is empty")
	}
	if len(data) > maxSpecBytes {
		return nil, fmt.Errorf("the definition is too large (%d bytes; the limit is %d)", len(data), maxSpecBytes)
	}
	spec, err := ParseSpec(data)
	if err != nil {
		return nil, err
	}
	if spec.ID != sanitizeID(spec.ID) || spec.ID == "" {
		return nil, fmt.Errorf("id %q must be lowercase letters, digits, - or _ (it becomes a filename)", spec.ID)
	}
	if len(spec.ID) > 40 {
		return nil, fmt.Errorf("id %q is too long", spec.ID)
	}
	u, err := url.Parse(spec.BaseURL)
	if err != nil {
		return nil, fmt.Errorf("base_url %q is not a URL", spec.BaseURL)
	}
	// Scheme before host: file:// and data: parse fine and have no host, so checking
	// the host first would report "not a URL" for what is really an unsupported
	// scheme, and the user would have no idea what to fix.
	if u.Scheme != "http" && u.Scheme != "https" {
		return nil, fmt.Errorf("base_url must be http or https, not %q", u.Scheme)
	}
	if u.Host == "" {
		return nil, fmt.Errorf("base_url %q has no host", spec.BaseURL)
	}
	if u.User != nil {
		return nil, fmt.Errorf("base_url must not carry credentials")
	}
	if len(spec.Feeds) == 0 {
		return nil, fmt.Errorf("a source needs at least one feed")
	}
	auth := strings.ToLower(strings.TrimSpace(spec.Authentication))
	switch auth {
	case "none", "optional", "required":
	default:
		return nil, fmt.Errorf("authentication must explicitly be none, optional, or required")
	}
	if auth != "none" && strings.TrimSpace(spec.AuthNote) == "" {
		return nil, fmt.Errorf("authentication %q needs auth_note explaining what the user must configure", auth)
	}
	for _, f := range spec.Feeds {
		if f.ID == "" {
			return nil, fmt.Errorf("every feed needs an id")
		}
		if f.Path == "" {
			return nil, fmt.Errorf("feed %q needs a path", f.ID)
		}
		if !strings.HasPrefix(f.Path, "/") {
			return nil, fmt.Errorf("feed %q path must start with / (it is relative to base_url)", f.ID)
		}
		if f.Query && !strings.Contains(f.Path, "{query}") {
			return nil, fmt.Errorf("feed %q is marked query but its path has no {query} placeholder", f.ID)
		}
	}
	for _, h := range spec.Hosts {
		h = strings.ToLower(strings.TrimSpace(h))
		switch {
		case h == "":
			return nil, fmt.Errorf("hosts contains an empty entry")
		case h == "*", h == "*.", h == ".":
			// This list is the streaming proxy's allowlist. A wildcard that matches
			// everything makes the proxy fetch anything on the server's network on
			// request, which is the exact hole AllowsHost exists to close.
			return nil, fmt.Errorf("hosts may not contain a bare wildcard %q — list the site's own domains", h)
		case strings.Contains(h, "/"), strings.Contains(h, ":"):
			return nil, fmt.Errorf("hosts entry %q should be a hostname, not a URL or host:port", h)
		}
	}
	if !hostListCovers(spec.Hosts, u.Hostname()) {
		return nil, fmt.Errorf("hosts must include the site's own domain %q", u.Hostname())
	}
	return spec, nil
}

// hostListCovers reports whether host matches some pattern in the list.
func hostListCovers(patterns []string, host string) bool {
	host = strings.ToLower(host)
	for _, p := range patterns {
		if hostMatches(strings.ToLower(strings.TrimSpace(p)), host) {
			return true
		}
	}
	return false
}

// SpecPath is where a source id's user definition lives.
//
// filepath.Base is belt to ValidateSpecForSave's braces: the id is already
// constrained to a slug, and this makes a bypass of that check unable to escape the
// directory anyway.
func SpecPath(dir, id string) string {
	name := filepath.Base(sanitizeID(id))
	switch name {
	case "", ".", "..", string(filepath.Separator):
		// sanitizeID strips every character that could form these, so reaching here
		// means the id was entirely unusable. Naming the file rather than returning
		// the bare directory keeps callers from writing to, or stat-ing, the directory
		// itself.
		name = "invalid"
	}
	return filepath.Join(dir, name+".yaml")
}

// SaveSpec validates data, writes it as id's definition, and reloads the registry so
// the new source is browsable immediately.
//
// The write is atomic (temp file, then rename) because the alternative — a truncated
// YAML file if the process dies mid-write — is a source that fails to parse on the
// next start, with the old working definition already gone.
func (r *Registry) SaveSpec(data []byte) (*SourceSpec, error) {
	if r.dir == "" {
		return nil, fmt.Errorf("no source directory is configured on this server")
	}
	spec, err := ValidateSpecForSave(data)
	if err != nil {
		return nil, err
	}
	if err := os.MkdirAll(r.dir, 0o755); err != nil {
		return nil, fmt.Errorf("creating %s: %w", r.dir, err)
	}
	path := SpecPath(r.dir, spec.ID)
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, data, 0o644); err != nil {
		return nil, err
	}
	if err := os.Rename(tmp, path); err != nil {
		os.Remove(tmp)
		return nil, err
	}
	r.Reload()
	return spec, nil
}

// DeleteSpec removes a user definition and reloads.
//
// Only a user file can be removed. A built-in definition is part of the binary, and
// "delete" on one would either be a lie or a hidden second kind of state; a built-in
// is overridden by saving a file with the same id, which is the mechanism that
// already exists.
func (r *Registry) DeleteSpec(id string) error {
	if r.dir == "" {
		return fmt.Errorf("no source directory is configured on this server")
	}
	path := SpecPath(r.dir, id)
	if _, err := os.Stat(path); err != nil {
		return fmt.Errorf("%q is not a source you added — built-in sources can be overridden but not removed", id)
	}
	if err := os.Remove(path); err != nil {
		return err
	}
	r.Reload()
	return nil
}

// UserDefined reports whether id came from a file in the config directory rather
// than from the binary. The UI needs it to know which sources it may offer to
// remove.
func (r *Registry) UserDefined(id string) bool {
	if r.dir == "" {
		return false
	}
	_, err := os.Stat(SpecPath(r.dir, id))
	return err == nil
}

// annotatedSpec renders a spec as a commented YAML document.
//
// The comments are the point. This file is the thing a human reviews and then edits
// when the site changes, and a bare dump of selectors gives a reviewer no way to
// tell a confident extraction from a guess. Each comment says what the field is for
// and what going wrong looks like, in the same voice as the hand-written built-ins.
func annotatedSpec(s SourceSpec) *yaml.Node {
	doc := &yaml.Node{Kind: yaml.MappingNode}
	add := func(key string, value *yaml.Node, comment string) {
		k := &yaml.Node{Kind: yaml.ScalarNode, Value: key}
		if comment != "" {
			k.HeadComment = comment
		}
		doc.Content = append(doc.Content, k, value)
	}

	add("id", scalar(s.ID), "Proposed by inspecting the site — review before saving.\nThe id is this source's filename and its handle in the API; changing it later\nadds a second source rather than renaming this one.")
	add("name", scalar(s.Name), "")
	add("base_url", scalar(s.BaseURL), "")
	add("kind", scalar(s.Kind), "What one item on this site is: comic | image | video | gif.\nA comic's payload is its run of pages, not a single file — get this wrong and\nitems either open empty or open the cover instead of the gallery.")
	add("authentication", scalar(s.Authentication), "Declare access honestly: none | optional | required. This metadata does not\nbypass a login, age gate or access control; a required flow belongs in a reviewed\nadapter implementation.")
	if s.AuthNote != "" {
		add("auth_note", scalar(s.AuthNote), "What the user must configure or expect before opening this source.")
	}
	if s.ContentWarning != "" {
		add("content_warning", scalar(s.ContentWarning), "A concise warning shown before this source's feeds.")
	}
	add("hosts", strSeq(s.Hosts), "Hostnames the streaming proxy will fetch media from for this source. A thumbnail\nserved from a domain that isn't listed comes back 403 with nothing to explain it.\nWildcards like \"*.example.net\" are allowed; a bare \"*\" is not.")

	feeds := &yaml.Node{Kind: yaml.SequenceNode}
	for _, f := range s.Feeds {
		m := &yaml.Node{Kind: yaml.MappingNode}
		mapAdd(m, "id", scalar(f.ID))
		mapAdd(m, "label", scalar(f.Label))
		mapAdd(m, "path", scalar(f.Path))
		if f.Query {
			mapAdd(m, "query", boolean(true))
		}
		if len(f.Sorts) > 0 {
			sorts := &yaml.Node{Kind: yaml.SequenceNode}
			for _, so := range f.Sorts {
				sm := &yaml.Node{Kind: yaml.MappingNode}
				mapAdd(sm, "id", scalar(so.ID))
				mapAdd(sm, "label", scalar(so.Label))
				sorts.Content = append(sorts.Content, sm)
			}
			mapAdd(m, "sorts", sorts)
		}
		feeds.Content = append(feeds.Content, m)
	}
	add("feeds", feeds, "Browsable listings. {page} is substituted with the page number, {query} with a\nsearch term, {sort} with the chosen ordering. A wrong {page} placement does not\nerror — the site re-serves page one and the grid repeats itself forever.")

	listing := &yaml.Node{Kind: yaml.MappingNode}
	itemKey := &yaml.Node{Kind: yaml.ScalarNode, Value: "item"}
	itemKey.HeadComment = "One card in the listing. Every field below is resolved *inside* it, so the page's\nheader, sidebar and \"related\" strip can't leak into the results.\nSelecting on the link path rather than a class name is deliberate: classes get\nrestyled, but the path shape is load-bearing for the site's own navigation."
	listing.Content = append(listing.Content, itemKey, scalar(s.Listing.Item))
	mapAdd(listing, "id", fieldNode(s.Listing.ID))
	if s.Listing.Title.Selector != "" || s.Listing.Title.Attr != "" {
		mapAdd(listing, "title", fieldNode(s.Listing.Title))
	}
	if s.Listing.Thumb.Selector != "" || s.Listing.Thumb.Attr != "" {
		thumbKey := &yaml.Node{Kind: yaml.ScalarNode, Value: "thumb"}
		thumbKey.HeadComment = "Lazy-loading is near universal on these sites, so the real image is in a data-\nattribute and src holds a placeholder. The attrs are tried in order, first\nnon-empty wins."
		listing.Content = append(listing.Content, thumbKey, fieldNode(s.Listing.Thumb))
	}
	if s.Listing.Media.Selector != "" || s.Listing.Media.Attr != "" {
		mapAdd(listing, "media", fieldNode(s.Listing.Media))
	}
	if s.Listing.PageURL != "" {
		mapAdd(listing, "page_url", scalar(s.Listing.PageURL))
	}
	add("listing", listing, "")

	if s.Pages.Selector != "" {
		pages := &yaml.Node{Kind: yaml.MappingNode}
		mapAdd(pages, "selector", scalar(s.Pages.Selector))
		if s.Pages.Attr != "" {
			mapAdd(pages, "attr", scalar(s.Pages.Attr))
		}
		if s.Pages.Rewrite.Pattern != "" {
			rw := &yaml.Node{Kind: yaml.MappingNode}
			mapAdd(rw, "pattern", scalar(s.Pages.Rewrite.Pattern))
			mapAdd(rw, "replace", scalar(s.Pages.Rewrite.Replace))
			mapAdd(pages, "rewrite", rw)
		}
		add("pages", pages, "How a multi-page item resolves to its page images. Omit this and the scraper's\ngeneric comic extractor is used — which takes what the detail page offers, and\nwhat a gallery page offers is usually thumbnails.")
	}
	return doc
}

func scalar(v string) *yaml.Node {
	n := &yaml.Node{Kind: yaml.ScalarNode, Value: v}
	// Quote anything a YAML reader could misparse: a selector starting with * or a
	// path starting with { are both legal CSS and illegal bare YAML.
	if v == "" || strings.ContainsAny(v[:1], "*&!%@`{[|>#'\"") || strings.Contains(v, ": ") {
		n.Style = yaml.DoubleQuotedStyle
	}
	return n
}

func boolean(b bool) *yaml.Node {
	return &yaml.Node{Kind: yaml.ScalarNode, Tag: "!!bool", Value: fmt.Sprint(b)}
}

func strSeq(vs []string) *yaml.Node {
	n := &yaml.Node{Kind: yaml.SequenceNode}
	for _, v := range vs {
		n.Content = append(n.Content, scalar(v))
	}
	return n
}

func mapAdd(m *yaml.Node, key string, value *yaml.Node) {
	m.Content = append(m.Content, &yaml.Node{Kind: yaml.ScalarNode, Value: key}, value)
}

func fieldNode(f FieldSpec) *yaml.Node {
	m := &yaml.Node{Kind: yaml.MappingNode}
	if f.Selector != "" {
		mapAdd(m, "selector", scalar(f.Selector))
	}
	if f.Attr != "" {
		mapAdd(m, "attr", scalar(f.Attr))
	}
	if f.Pattern != "" {
		mapAdd(m, "pattern", scalar(f.Pattern))
	}
	return m
}
