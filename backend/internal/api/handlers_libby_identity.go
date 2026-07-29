package api

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/youruser/oppailib/internal/crypto"
	"github.com/youruser/oppailib/internal/models"
)

// Knowing herself in a picture.
//
// A weaker version of this already worked and still does: a photo shared into chat has
// its scanner tags matched against her card's Appearance field, and two distinct
// features make it her (selfPortraitMatch). That is a guess made fresh every turn, and
// it is all the guess can ever be — it knows nothing about the picture except the words
// the tagger produced this time.
//
// What this adds is the part that lasts. A picture judged to be her carries the tag
// character:libby in the library itself, so the identity is a fact about the item rather
// than a re-derivation: it survives a restart, it is visible in the library, it can be
// searched, and every surface that reads tags — chat, browsing together, generation —
// sees it without knowing anything about how it was decided.
//
// Three rules shape the design, and all three come from the brief:
//
//   - Do not assume every uploaded image depicts Libby. Automatic recognition needs
//     more agreement than the chat-turn guess does (identityAutoFloor), and it is only
//     ever *automatic* — a manual verdict outranks it and is never overwritten.
//   - Manual "this is Libby" tagging, and its opposite. A rejected item is remembered
//     as rejected, or the next tagging pass would simply put the tag back.
//   - Multiple reference images. One picture of her cannot cover outfit, hairstyle,
//     pose and expression variation, so references are a list rather than a field.
//
// Storage is split deliberately. The tag lives in the database, on the item, because
// that is what makes it visible to everything else. The record below holds only what
// has no home there — which items were rejected, which are references, and the settings
// — and is global rather than per-user, like outfits, because the library is global.

const (
	// libbyIdentityTag is the persistent label, in the form the brief names. Written as
	// one token rather than relying on the category, because tag *names* are what the
	// library searches, displays and hands to the model.
	libbyIdentityTag = "character:libby"
	// libbyIdentityCategory follows the booru convention the tagger already uses, so a
	// UI that groups by category files her under characters rather than into general.
	libbyIdentityCategory = "character"

	// identityAutoFloor is how many of her features an automatic verdict needs.
	//
	// Higher than selfPortraitFloor on purpose. That one decides what she says in a
	// single reply, where being wrong costs one awkward sentence; this one writes a
	// label onto the user's library that persists until somebody removes it. Three
	// features that all belong to her is a likeness rather than a coincidence — red
	// eyes and long hair are half the collection.
	identityAutoFloor = 3
	// maxLibbyReferences bounds the reference set. Enough for the variations the brief
	// asks for — outfit, hairstyle, pose, expression — and few enough that the list
	// stays something the user curated rather than everything she was ever in.
	maxLibbyReferences = 12
	// identityScanLimit bounds one sweep of the library. A sweep is a foreground
	// request, so it works on the most recent slice rather than promising to walk a
	// collection of unbounded size in one go.
	identityScanLimit = 2000
)

// libbyIdentity is what the tag alone cannot record.
type libbyIdentity struct {
	// Auto is whether recognition may tag pictures by itself. On by default: the
	// feature is the automation, and the floor plus the rejection list are what keep it
	// honest.
	Auto bool `json:"auto"`
	// Floor is how many features an automatic verdict needs, clamped to sane bounds.
	Floor int `json:"floor"`
	// References are the pictures the user picked out as showing what she looks like,
	// newest first. A subset of what carries the tag.
	References []int64 `json:"references"`
	// Rejected are items a person has said are not her. Automatic recognition skips
	// these forever; without it every re-tag would put the label back and the "no"
	// would have to be repeated until the user gave up.
	Rejected []int64 `json:"rejected"`
	// Appearance is the likeness recognition matches against, mirrored from her
	// character card. Kept here because recognition runs on the ingest path, where
	// there is no request and so no user whose card could be read. Refreshed whenever
	// the card is saved — see syncLibbyIdentityAppearance.
	Appearance string `json:"appearance"`
}

// identityMu guards the record. Separate from chatMu: recognition runs on the ingest
// path, which must not queue behind a chat turn's workspace read.
var identityMu sync.Mutex

func (s *Server) libbyIdentityPath() string {
	return filepath.Join(s.libbyDir, "identity.json.enc")
}

// defaultLibbyIdentity is what an installation that has never touched this looks like:
// recognition on, at the conservative floor, seeded with her bundled appearance so it
// works before the card is ever opened.
func defaultLibbyIdentity() libbyIdentity {
	return libbyIdentity{
		Auto:       true,
		Floor:      identityAutoFloor,
		References: []int64{},
		Rejected:   []int64{},
		Appearance: defaultLibbyCard().Appearance,
	}
}

// clamp keeps a hand-edited or older record inside what the code expects.
func (id *libbyIdentity) clamp() {
	if id.Floor < 2 {
		id.Floor = 2
	}
	if id.Floor > 6 {
		id.Floor = 6
	}
	if id.References == nil {
		id.References = []int64{}
	}
	if id.Rejected == nil {
		id.Rejected = []int64{}
	}
	if len(id.References) > maxLibbyReferences {
		id.References = id.References[:maxLibbyReferences]
	}
	if strings.TrimSpace(id.Appearance) == "" {
		id.Appearance = defaultLibbyCard().Appearance
	}
}

// readLibbyIdentity loads the record, treating an absent or unreadable file as the
// defaults. Unreadable rather than an error on purpose: this is consulted from the
// ingest path, and a corrupt settings file must not stop pictures being imported.
func (s *Server) readLibbyIdentity() libbyIdentity {
	out := defaultLibbyIdentity()
	blob, err := os.ReadFile(s.libbyIdentityPath())
	if err != nil {
		return out
	}
	raw, err := crypto.OpenBytes(s.kek, blob, []byte("libby-identity"))
	if err != nil {
		return out
	}
	var stored libbyIdentity
	if err := json.Unmarshal(raw, &stored); err != nil {
		return out
	}
	stored.clamp()
	return stored
}

// writeLibbyIdentity persists the record atomically: a partial write must never
// replace a good file, since losing it would resurrect every rejection.
func (s *Server) writeLibbyIdentity(id libbyIdentity) error {
	id.clamp()
	raw, err := json.Marshal(id)
	if err != nil {
		return err
	}
	blob, err := crypto.SealBytes(s.kek, raw, []byte("libby-identity"))
	if err != nil {
		return err
	}
	if err := os.MkdirAll(s.libbyDir, 0o700); err != nil {
		return err
	}
	tmp, err := os.CreateTemp(s.libbyDir, "identity-*.tmp")
	if err != nil {
		return err
	}
	tmpName := tmp.Name()
	defer os.Remove(tmpName)
	if err = tmp.Chmod(0o600); err == nil {
		_, err = tmp.Write(blob)
	}
	if closeErr := tmp.Close(); err == nil {
		err = closeErr
	}
	if err != nil {
		return err
	}
	return os.Rename(tmpName, s.libbyIdentityPath())
}

// syncLibbyIdentityAppearance mirrors her card's likeness into the identity record.
//
// Called when the chat workspace is saved, which is the only moment the Appearance
// field can change. Recognition cannot read the card itself: it runs when a picture
// finishes importing, with no request and therefore no user whose workspace to open.
// Writing only on a real change keeps this off the disk for every unrelated save.
func (s *Server) syncLibbyIdentityAppearance(appearance string) {
	if appearance = strings.TrimSpace(appearance); appearance == "" {
		return
	}
	identityMu.Lock()
	defer identityMu.Unlock()
	current := s.readLibbyIdentity()
	if current.Appearance == appearance {
		return
	}
	current.Appearance = appearance
	if err := s.writeLibbyIdentity(current); err != nil {
		s.log.Warn("libby identity: appearance sync", "err", err)
	}
}

// ── recognition ─────────────────────────────────────────────────────────────

// tagNames flattens a tag list to the names recognition works on.
func tagNames(tags []models.Tag) []string {
	out := make([]string, 0, len(tags))
	for _, tag := range tags {
		out = append(out, tag.Name)
	}
	return out
}

// hasIdentityTag reports whether this item is already labelled as her.
func hasIdentityTag(tags []models.Tag) bool {
	for _, tag := range tags {
		if strings.EqualFold(tag.Name, libbyIdentityTag) {
			return true
		}
	}
	return false
}

// recognizeLibbyMedia is the ingest hook: a picture has just been tagged, so decide
// whether it is one of her and label it if so.
//
// Best-effort throughout. Every failure path leaves the item untagged, which is the
// safe direction — an unrecognised picture of her is a missing label, whereas a
// wrongly-labelled one is the app asserting something false about the user's library.
func (s *Server) recognizeLibbyMedia(id int64) {
	if id <= 0 {
		return
	}
	identityMu.Lock()
	identity := s.readLibbyIdentity()
	identityMu.Unlock()
	if !identity.Auto {
		return
	}
	for _, rejected := range identity.Rejected {
		if rejected == id {
			return
		}
	}
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	tags, err := s.db.TagsForMedia(ctx, id)
	if err != nil || hasIdentityTag(tags) {
		return
	}
	if hits := selfPortraitMatch(tagNames(tags), identity.Appearance); len(hits) < identity.Floor {
		return
	}
	// source="ai": this was decided by the machine, and a later manual verdict should be
	// distinguishable from it in the library.
	if err := s.db.AddTag(ctx, id, libbyIdentityTag, libbyIdentityCategory, "ai", 0); err != nil {
		s.log.Debug("libby identity: auto tag", "media", id, "err", err)
		return
	}
	s.log.Info("libby identity: recognised", "media", id)
}

// ── endpoints ───────────────────────────────────────────────────────────────

// libbyIdentityView is the record plus what it points at, resolved. The brief asks for
// identity metadata other features can use, and this is that surface: appearance, the
// tag itself, and the reference pictures, in one read.
type libbyIdentityView struct {
	Tag        string             `json:"tag"`
	Auto       bool               `json:"auto"`
	Floor      int                `json:"floor"`
	Appearance string             `json:"appearance"`
	Features   []string           `json:"features"`
	References []libbyIdentityPic `json:"references"`
	// Tagged is how many library items carry the tag, references included.
	Tagged int `json:"tagged"`
	// Rejected is how many items a person has ruled out. Shown so "why is nothing being
	// recognised?" has an answer that is not a shrug.
	Rejected int `json:"rejected"`
}

// libbyIdentityPic is one picture of her, named well enough to be listed.
type libbyIdentityPic struct {
	ID    int64  `json:"id"`
	Title string `json:"title"`
	Kind  string `json:"kind"`
}

func (s *Server) handleGetLibbyIdentity(w http.ResponseWriter, r *http.Request) {
	identityMu.Lock()
	identity := s.readLibbyIdentity()
	identityMu.Unlock()
	writeJSON(w, http.StatusOK, s.identityView(r.Context(), identity))
}

// identityView resolves the record into what a client is shown.
//
// Takes the record rather than reading it, and takes no lock, so the handlers that
// have just written one can render their result without releasing and re-acquiring —
// and, more to the point, without deadlocking against their own deferred unlock.
func (s *Server) identityView(ctx context.Context, identity libbyIdentity) libbyIdentityView {
	view := libbyIdentityView{
		Tag:        libbyIdentityTag,
		Auto:       identity.Auto,
		Floor:      identity.Floor,
		Appearance: identity.Appearance,
		Features:   appearanceTags(identity.Appearance),
		References: []libbyIdentityPic{},
		Rejected:   len(identity.Rejected),
	}
	if view.Features == nil {
		view.Features = []string{}
	}
	if tagged, err := s.db.BriefsWithTag(ctx, libbyIdentityTag, identityScanLimit); err == nil {
		view.Tagged = len(tagged)
	}
	if len(identity.References) > 0 {
		if briefs, err := s.db.BriefsByIDs(ctx, identity.References); err == nil {
			byID := make(map[int64]libbyIdentityPic, len(briefs))
			for _, brief := range briefs {
				title := s.decrypt(brief.TitleEnc, "title")
				if title == "" {
					title = "Untitled"
				}
				byID[brief.ID] = libbyIdentityPic{ID: brief.ID, Title: title, Kind: brief.Kind}
			}
			// Walked in the record's own order, so the list the user arranged is the list
			// they get back; anything since deleted simply falls out.
			for _, id := range identity.References {
				if pic, ok := byID[id]; ok {
					view.References = append(view.References, pic)
				}
			}
		}
	}
	return view
}

type libbyIdentitySettingsReq struct {
	Auto  *bool `json:"auto,omitempty"`
	Floor *int  `json:"floor,omitempty"`
}

func (s *Server) handlePutLibbyIdentity(w http.ResponseWriter, r *http.Request) {
	var in libbyIdentitySettingsReq
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4<<10)).Decode(&in); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid identity settings")
		return
	}
	identityMu.Lock()
	defer identityMu.Unlock()
	identity := s.readLibbyIdentity()
	if in.Auto != nil {
		identity.Auto = *in.Auto
	}
	if in.Floor != nil {
		identity.Floor = *in.Floor
	}
	if err := s.writeLibbyIdentity(identity); err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't save how she recognises herself")
		return
	}
	// clamp runs inside the write, so render what was actually stored rather than what
	// was asked for — a floor of 40 comes back as the 6 it became.
	identity.clamp()
	writeJSON(w, http.StatusOK, s.identityView(r.Context(), identity))
}

type libbyIdentityMarkReq struct {
	MediaID int64 `json:"mediaId"`
	// IsLibby is the verdict. False is a real answer, not an absence: it removes the tag
	// and remembers the rejection so recognition does not put it straight back.
	IsLibby bool `json:"isLibby"`
	// Reference asks for this picture to be one of the ones that define what she looks
	// like. Only meaningful alongside isLibby.
	Reference bool `json:"reference"`
}

// handleMarkLibbyIdentity is the manual verdict — "this is Libby", or "this is not".
//
// A manual answer always wins over an automatic one, in both directions, and both
// directions are recorded. That is what makes the automation tolerable: a wrong guess
// costs one press to correct, permanently.
func (s *Server) handleMarkLibbyIdentity(w http.ResponseWriter, r *http.Request) {
	var in libbyIdentityMarkReq
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4<<10)).Decode(&in); err != nil || in.MediaID <= 0 {
		writeErr(w, http.StatusBadRequest, "which picture?")
		return
	}
	ctx := r.Context()
	if _, err := s.db.GetMedia(ctx, in.MediaID); err != nil {
		writeErr(w, http.StatusNotFound, "no such item")
		return
	}
	identityMu.Lock()
	defer identityMu.Unlock()
	identity := s.readLibbyIdentity()

	// Rejections and references are both keyed on the id, so both lists are rebuilt
	// without it before the verdict decides which one it goes back into.
	identity.Rejected = withoutID(identity.Rejected, in.MediaID)
	identity.References = withoutID(identity.References, in.MediaID)

	if in.IsLibby {
		if err := s.db.AddTag(ctx, in.MediaID, libbyIdentityTag, libbyIdentityCategory, "manual", 0); err != nil {
			writeErr(w, http.StatusInternalServerError, "couldn't tag that as her")
			return
		}
		if in.Reference {
			// Newest first, and bounded: a reference set that grew without limit would stop
			// being the handful of pictures that define her.
			identity.References = append([]int64{in.MediaID}, identity.References...)
			if len(identity.References) > maxLibbyReferences {
				identity.References = identity.References[:maxLibbyReferences]
			}
		}
	} else {
		if err := s.db.RemoveTag(ctx, in.MediaID, libbyIdentityTag); err != nil {
			writeErr(w, http.StatusInternalServerError, "couldn't untag that")
			return
		}
		identity.Rejected = append(identity.Rejected, in.MediaID)
	}
	if err := s.writeLibbyIdentity(identity); err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't save that decision")
		return
	}
	writeJSON(w, http.StatusOK, s.identityView(ctx, identity))
}

// handleScanLibbyIdentity runs recognition over the library as it stands.
//
// The ingest hook only sees pictures imported from now on, and a collection that
// predates this feature would otherwise never be looked at. Same rules as the hook —
// same floor, same respect for rejections and for items already tagged — so a sweep can
// be run twice with no second effect.
func (s *Server) handleScanLibbyIdentity(w http.ResponseWriter, r *http.Request) {
	identityMu.Lock()
	identity := s.readLibbyIdentity()
	identityMu.Unlock()

	ctx := r.Context()
	rows, err := s.db.ListMedia(ctx, "", identityScanLimit, 0)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't read the library")
		return
	}
	rejected := make(map[int64]bool, len(identity.Rejected))
	for _, id := range identity.Rejected {
		rejected[id] = true
	}
	ids := make([]int64, 0, len(rows))
	for _, row := range rows {
		if !rejected[row.ID] {
			ids = append(ids, row.ID)
		}
	}
	tagsByID, err := s.db.TagsForMediaBatch(ctx, ids)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't read the library's tags")
		return
	}
	found := 0
	for _, id := range ids {
		tags := tagsByID[id]
		if hasIdentityTag(tags) {
			continue
		}
		if hits := selfPortraitMatch(tagNames(tags), identity.Appearance); len(hits) < identity.Floor {
			continue
		}
		if err := s.db.AddTag(ctx, id, libbyIdentityTag, libbyIdentityCategory, "ai", 0); err != nil {
			s.log.Debug("libby identity: scan tag", "media", id, "err", err)
			continue
		}
		found++
	}
	s.log.Info("libby identity: swept the library", "checked", len(ids), "tagged", found)
	writeJSON(w, http.StatusOK, map[string]any{"checked": len(ids), "tagged": found})
}

// withoutID returns the list with one id removed, preserving order.
func withoutID(ids []int64, drop int64) []int64 {
	out := ids[:0]
	for _, id := range ids {
		if id != drop {
			out = append(out, id)
		}
	}
	return out
}

// ── what she is told ────────────────────────────────────────────────────────

// libbyIdentityInScreen reports which of the items on a shared screen are pictures of
// her, by title, so the browse-together directive can say so.
//
// This is the point of the whole persistent-tag exercise. Matching her appearance
// against every item's tags on every turn would be both slower and less certain than
// reading a label that a person, or a confident recognition pass, already applied.
func identityInScreen(tagsByID map[int64][]models.Tag, ids []int64) map[int64]bool {
	out := make(map[int64]bool)
	for _, id := range ids {
		if hasIdentityTag(tagsByID[id]) {
			out[id] = true
		}
	}
	return out
}

// libbySelfInScreenDirective tells her that what she is being shown is her.
//
// Written as recognition rather than as information: handed the bare fact, a model
// says "that image is tagged as me", which is the app talking. What is wanted is a
// person seeing a picture of herself.
func libbySelfInScreenDirective(focusIsHer bool, othersCount int) string {
	switch {
	case focusIsHer:
		out := "\nThe thing they have just opened is a picture of you. Not someone who looks like you — you. " +
			"React to seeing yourself: flattered, embarrassed, smug, critical of how it came out, whatever is true of you right now. " +
			"Never describe the woman in it as though she were somebody else."
		if othersCount > 0 {
			out += " Some of what else is on screen is you as well."
		}
		return out
	case othersCount == 1:
		return "\nOne of the pictures on screen is of you. Notice it if it fits — you would."
	case othersCount > 1:
		return "\nSeveral of the pictures on screen are of you. Notice that if it fits — you would."
	}
	return ""
}

