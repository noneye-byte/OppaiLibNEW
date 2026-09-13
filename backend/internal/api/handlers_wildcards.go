package api

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"

	"github.com/youruser/oppailib/internal/crypto"
	"github.com/youruser/oppailib/internal/imagegen"
)

// ── wildcards ────────────────────────────────────────────────────────────────
//
// A wildcard is a named list of lines a prompt draws one of at random, written as
// __name__ — the same convention as the A1111 wildcard extensions, so a list written
// for those pastes straight in. Lists made in the app are encrypted records under
// /config/wildcards like every other prompt fragment; a plain name.txt dropped into
// the same folder (a collection carried over from another tool) is read as-is and
// shown read-only. Expansion happens server-side on every generate, so the phone,
// the web studio and Libby's own pictures all get it without each learning the syntax.

// wildcardList is one list: its name is what __name__ refers to.
type wildcardList struct {
	ID      string   `json:"id"`
	Name    string   `json:"name"`
	Entries []string `json:"entries"`
	// ReadOnly marks a plain .txt list found in the folder rather than a record the
	// app wrote. Editing one means editing the file.
	ReadOnly bool `json:"readOnly,omitempty"`
}

const (
	maxWildcardEntries    = 2000
	maxWildcardEntryBytes = 500
)

// Names are what appears between the underscores, so they are restricted to what
// the reference pattern accepts. Case is folded on lookup.
var wildcardNamePattern = regexp.MustCompile(`^[a-z0-9][a-z0-9_./-]{0,63}$`)

// normalizeWildcardName folds a typed name into the form the prompt refers to it by:
// lower case, spaces as underscores.
func normalizeWildcardName(name string) string {
	name = strings.ToLower(strings.TrimSpace(name))
	name = strings.ReplaceAll(name, " ", "_")
	name = strings.Trim(name, "_")
	return name
}

// cleanWildcardEntries trims, drops blanks and comment lines, and caps the list.
func cleanWildcardEntries(entries []string) []string {
	out := make([]string, 0, len(entries))
	for _, entry := range entries {
		entry = strings.TrimSpace(entry)
		if entry == "" || strings.HasPrefix(entry, "#") || len(entry) > maxWildcardEntryBytes {
			continue
		}
		out = append(out, entry)
		if len(out) >= maxWildcardEntries {
			break
		}
	}
	return out
}

func (s *Server) wildcardRecordPath(id string) string {
	return filepath.Join(s.wildcardDir, id+".json.enc")
}

func (s *Server) readWildcard(id string) (*wildcardList, error) {
	blob, err := os.ReadFile(s.wildcardRecordPath(id))
	if err != nil {
		return nil, err
	}
	data, err := crypto.OpenBytes(s.kek, blob, []byte("wildcard"))
	if err != nil {
		return nil, err
	}
	var list wildcardList
	if err := json.Unmarshal(data, &list); err != nil {
		return nil, err
	}
	list.ID = id
	return &list, nil
}

// listWildcards reads every list in the folder: the app's own records and any plain
// text files. Sorted by name. A missing folder is an empty library.
func (s *Server) listWildcards() []wildcardList {
	out := []wildcardList{}
	entries, err := os.ReadDir(s.wildcardDir)
	if err != nil {
		return out
	}
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		switch {
		case strings.HasSuffix(e.Name(), ".json.enc"):
			id := strings.TrimSuffix(e.Name(), ".json.enc")
			if !promptFragmentIDPattern.MatchString(id) {
				continue
			}
			list, err := s.readWildcard(id)
			if err != nil {
				s.log.Debug("read wildcard", "id", id, "err", err)
				continue
			}
			out = append(out, *list)
		case strings.HasSuffix(e.Name(), ".txt"):
			name := normalizeWildcardName(strings.TrimSuffix(e.Name(), ".txt"))
			if !wildcardNamePattern.MatchString(name) {
				continue
			}
			raw, err := os.ReadFile(filepath.Join(s.wildcardDir, e.Name()))
			if err != nil {
				continue
			}
			out = append(out, wildcardList{
				ID: "txt:" + name, Name: name, ReadOnly: true,
				Entries: cleanWildcardEntries(strings.Split(strings.ReplaceAll(string(raw), "\r\n", "\n"), "\n")),
			})
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Name < out[j].Name })
	return out
}

// wildcardLookup is what a generate call expands with: the lists as they are on disk
// right now, read once per call. A record and a text file with the same name resolve
// to the record — the one made in the app is the one being edited.
func (s *Server) wildcardLookup() imagegen.WildcardLookup {
	lists := s.listWildcards()
	byName := make(map[string][]string, len(lists))
	for _, list := range lists {
		if _, taken := byName[list.Name]; taken && list.ReadOnly {
			continue
		}
		byName[list.Name] = list.Entries
	}
	return func(name string) []string { return byName[strings.ToLower(name)] }
}

func (s *Server) handleListWildcards(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"wildcards": s.listWildcards()})
}

type saveWildcardReq struct {
	ID      string   `json:"id"` // empty creates, set updates
	Name    string   `json:"name"`
	Entries []string `json:"entries"`
	// Text is the list as one block, one line per entry — what a textarea holds.
	// Used when Entries is empty.
	Text string `json:"text"`
}

func (s *Server) handleSaveWildcard(w http.ResponseWriter, r *http.Request) {
	var req saveWildcardReq
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 2<<20)).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	name := normalizeWildcardName(req.Name)
	if !wildcardNamePattern.MatchString(name) {
		writeErr(w, http.StatusBadRequest, "a wildcard name is letters, digits, _ - . or /, up to 64 characters")
		return
	}
	entries := req.Entries
	if len(entries) == 0 && req.Text != "" {
		entries = strings.Split(strings.ReplaceAll(req.Text, "\r\n", "\n"), "\n")
	}
	entries = cleanWildcardEntries(entries)
	if len(entries) == 0 {
		writeErr(w, http.StatusBadRequest, "a wildcard needs at least one line")
		return
	}
	id := req.ID
	if id == "" {
		id = randomID()
	} else if !promptFragmentIDPattern.MatchString(id) {
		writeErr(w, http.StatusBadRequest, "bad wildcard id")
		return
	}
	// One name, one list: a second record under the same name would make __name__
	// draw from whichever the directory listed first.
	for _, existing := range s.listWildcards() {
		if existing.Name == name && existing.ID != id && !existing.ReadOnly {
			writeErr(w, http.StatusConflict, "a wildcard called "+name+" already exists")
			return
		}
	}
	list := wildcardList{ID: id, Name: name, Entries: entries}
	raw, _ := json.Marshal(list)
	blob, err := crypto.SealBytes(s.kek, raw, []byte("wildcard"))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "encrypt failed")
		return
	}
	if err := os.MkdirAll(s.wildcardDir, 0o755); err != nil {
		writeErr(w, http.StatusInternalServerError, "storage error")
		return
	}
	if err := os.WriteFile(s.wildcardRecordPath(id), blob, 0o600); err != nil {
		writeErr(w, http.StatusInternalServerError, "write failed")
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func (s *Server) handleDeleteWildcard(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if strings.HasPrefix(id, "txt:") {
		writeErr(w, http.StatusBadRequest, "that list is a file in the wildcards folder; remove the file to delete it")
		return
	}
	if !promptFragmentIDPattern.MatchString(id) {
		writeErr(w, http.StatusBadRequest, "bad wildcard id")
		return
	}
	if err := os.Remove(s.wildcardRecordPath(id)); err != nil {
		writeErr(w, http.StatusNotFound, "no such wildcard")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok"})
}
