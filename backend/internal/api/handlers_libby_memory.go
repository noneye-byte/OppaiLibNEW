package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/youruser/oppailib/internal/crypto"
)

// Libby's memory — the one thing she carries between conversations.
//
// Everything else about a chat is client-owned: the workspace round-trips through the
// browser and the phone, and the server keeps no per-conversation state. Memory is the
// exception, and it is deliberately server-authoritative. It is written from her own
// replies (a [remember: …] tag the model emits and the user never sees), so it must not
// be forgeable or erasable by a client that simply omits a field — the trust model of
// server-owned image metadata, not of the workspace. It lives in its own encrypted file
// per user, and only three things touch it: capture on the chat path, injection back
// into the next prompt, and the settings screen that lists and clears it.
//
// It is Libby's alone. Imported character cards are somebody else's character and stay
// stateless, the same way the self-directive, the library snapshot, and actions are all
// Libby-only.

const (
	// maxLibbyMemories bounds the store. Enough to hold a real picture of someone —
	// their name, what they like, boundaries, running jokes — without the block ever
	// crowding the character card out of the prompt. Past this the *weakest* fall away;
	// see memoryScore, and note that a pinned memory and a boundary never do.
	maxLibbyMemories = 60
	// maxMemoryLen bounds one memory. A memory is a fact, not a paragraph; a model that
	// tries to store an essay is truncated to the part that fits.
	maxMemoryLen = 280
	// promptMemories bounds how many are carried into one prompt, highest-scoring first.
	// The store may hold sixty; a system prompt that spends sixty bullet points on them has
	// crowded out the character card, which is the thing that makes her sound like herself.
	promptMemories = 24
)

// libbyMemory is one durable fact she has kept.
//
// The first three fields are the original flat record and are unchanged, so a store written
// before this existed still loads. Everything after them is defaulted on read by normalize(),
// which is what makes the migration a no-op rather than a schema version.
type libbyMemory struct {
	ID   string `json:"id"`
	Text string `json:"text"`
	At   int64  `json:"at"`
	// Kind is what sort of fact this is. See libby_memory_kinds.go.
	Kind memoryKind `json:"kind,omitempty"`
	// Weight is importance, 1–5, seeded from the kind and raised when a fact is re-learned.
	Weight int `json:"weight,omitempty"`
	// Confidence is how sure she is, 0–1. Below uncertaintyFloor the prompt says so out loud
	// rather than presenting a guess as a fact.
	Confidence float64 `json:"confidence,omitempty"`
	// Pinned exempts a memory from eviction and from decay. The user's override.
	Pinned bool `json:"pinned,omitempty"`
	// Source is where it came from: her own noticing, or the user typing it in.
	Source string `json:"source,omitempty"`
	// Recalls is how many times it has been re-learned or re-stated. A fact that keeps coming
	// up is a fact that matters, which is the brief's "preferences formed by repeated
	// experience" rather than by one mention.
	Recalls int `json:"recalls,omitempty"`
	// UpdatedAt is the last time it changed, UnixMilli.
	UpdatedAt int64 `json:"updatedAt,omitempty"`
}

// Memory sources.
const (
	memorySourceLibby = "libby" // she noticed it herself, from a [remember: …] tag
	memorySourceUser  = "user"  // typed in by the user, and therefore not hers to doubt
)

// normalize fills in everything a record written by an older build has no value for, and
// clamps anything a hand-edited file or a bad request could put out of range.
func (m *libbyMemory) normalize() {
	m.Text = strings.TrimSpace(m.Text)
	if len(m.Text) > maxMemoryLen {
		m.Text = strings.TrimSpace(m.Text[:maxMemoryLen])
	}
	if !validMemoryKind(m.Kind) {
		// Reclassified from the text, which is how the flat store's existing sentences
		// acquire kinds without the user having to re-teach her anything.
		m.Kind, m.Text = classifyMemory(m.Text)
	}
	if m.Weight <= 0 {
		m.Weight = memoryKindWeight[m.Kind]
	}
	m.Weight = clampInt(m.Weight, 1, 5)
	if m.Confidence <= 0 {
		m.Confidence = memoryConfidence(m.Text)
	}
	m.Confidence = clampFloat(m.Confidence, 0.1, 1)
	if m.Source == "" {
		m.Source = memorySourceLibby
	}
	if m.UpdatedAt == 0 {
		m.UpdatedAt = m.At
	}
}

// libbyMemoryStore is the whole file: a flat list, oldest first.
type libbyMemoryStore struct {
	Memories []libbyMemory `json:"memories"`
}

// memoryHalfLife is how long an unreinforced memory takes to lose half its recency standing.
// Three weeks: long enough that a fact from last month still counts for something, short
// enough that sixty notes from one intense week do not permanently outrank everything after.
const memoryHalfLife = 21 * 24 * time.Hour

// memoryScore is what a memory is worth right now: importance, discounted by how sure she is
// and how long since it last mattered.
//
// This is the brief's "scored, and occasionally forgotten or deprioritized" in one function,
// and it is used twice — to decide what falls out when the store is full, and to decide what
// makes it into a prompt that cannot hold everything. Using one function for both is the
// point: the memory she stops carrying is the same one she will eventually lose.
//
// Boundaries and pinned memories are answered before any of that. A boundary that decayed out
// of the store would be a boundary she crosses because it got old, which is not a trade-off
// worth having at any score.
func memoryScore(m libbyMemory, now time.Time) float64 {
	if m.Pinned || m.Kind == memoryBoundary {
		return 1000
	}
	age := now.Sub(time.UnixMilli(m.UpdatedAt))
	if age < 0 {
		age = 0
	}
	// Halving per half-life, without importing math: repeated halving is exact enough for a
	// ranking and cannot produce a NaN from a corrupt timestamp.
	recency := 1.0
	for remaining := age; remaining >= memoryHalfLife && recency > 0.01; remaining -= memoryHalfLife {
		recency /= 2
	}
	// A fact re-learned several times holds its ground: this is how a preference forms from
	// repetition rather than from one offhand line.
	reinforcement := 1.0 + 0.25*float64(m.Recalls)
	if reinforcement > 2 {
		reinforcement = 2
	}
	return float64(m.Weight) * m.Confidence * recency * reinforcement
}

func (s *Server) libbyMemoryPath(userID int64) string {
	return filepath.Join(s.chatUserDir(userID), "libby-memory.json.enc")
}

func libbyMemoryAAD(userID int64) []byte {
	return []byte(fmt.Sprintf("libby-memory:%d", userID))
}

// readLibbyMemory loads the store, treating an absent file as an empty one — a user who
// has never been remembered to has no file, and that is not an error.
func (s *Server) readLibbyMemory(userID int64) (libbyMemoryStore, error) {
	var store libbyMemoryStore
	blob, err := os.ReadFile(s.libbyMemoryPath(userID))
	if errors.Is(err, os.ErrNotExist) {
		store.Memories = []libbyMemory{}
		return store, nil
	}
	if err != nil {
		return store, err
	}
	raw, err := crypto.OpenBytes(s.kek, blob, libbyMemoryAAD(userID))
	if err != nil {
		return store, err
	}
	if err := json.Unmarshal(raw, &store); err != nil {
		return store, err
	}
	if store.Memories == nil {
		store.Memories = []libbyMemory{}
	}
	// Every record is normalized on the way in, which is what upgrades a store written by an
	// older build: the flat sentences acquire a kind, a weight and a confidence the first time
	// they are read, and are written back with them on the next change. There is no migration
	// step and no version field to keep in step. See libbyMemory.normalize.
	kept := store.Memories[:0]
	for i := range store.Memories {
		store.Memories[i].normalize()
		// A record whose text is empty after trimming is not a memory. Dropping it here means
		// a corrupt or hand-edited file cannot put a blank bullet in her prompt.
		if store.Memories[i].Text != "" {
			kept = append(kept, store.Memories[i])
		}
	}
	store.Memories = kept
	return store, nil
}

// writeLibbyMemory persists the store atomically, mirroring writeChatWorkspace: a
// partial write must never replace a good file, so it lands on a temp file and renames.
func (s *Server) writeLibbyMemory(userID int64, store libbyMemoryStore) error {
	if store.Memories == nil {
		store.Memories = []libbyMemory{}
	}
	raw, err := json.Marshal(store)
	if err != nil {
		return err
	}
	blob, err := crypto.SealBytes(s.kek, raw, libbyMemoryAAD(userID))
	if err != nil {
		return err
	}
	dir := s.chatUserDir(userID)
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return err
	}
	tmp, err := os.CreateTemp(dir, "libby-memory-*.tmp")
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
	return os.Rename(tmpName, s.libbyMemoryPath(userID))
}

// appendLibbyMemories files new facts, merging the ones she already holds and forgetting the
// weakest when the store is full. Returns whether anything changed, so a reply that only
// re-stated what she knew costs no disk write.
//
// Three things happen to each fact, and each exists because of a specific failure:
//
//   - Triviality is rejected. Told she may remember, a model files "they said hello", and a
//     store full of those crowds out the facts that matter as surely as one that is too large.
//   - A near-duplicate merges into the existing record rather than sitting beside it. Exact
//     text matching was not enough: a model reminded of a fact re-emits it reworded, so the
//     store filled with three phrasings of the same preference. The merge is also how a
//     preference *strengthens* — each re-learning raises its weight and its recall count.
//   - Eviction is by score, not by age. The old store dropped the front of the list, so a
//     boundary learned in week one fell out behind sixty notes about what they watched.
func (s *Server) appendLibbyMemories(userID int64, facts []string) (bool, error) {
	if len(facts) == 0 {
		return false, nil
	}
	store, err := s.readLibbyMemory(userID)
	if err != nil {
		return false, err
	}
	now := time.Now()
	changed := false
	for _, raw := range facts {
		if !worthRemembering(raw) {
			continue
		}
		kind, text := classifyMemory(raw)
		if len(text) > maxMemoryLen {
			text = strings.TrimSpace(text[:maxMemoryLen])
		}
		if text == "" {
			continue
		}
		if merged := mergeMemory(store.Memories, text, kind, now); merged >= 0 {
			store.Memories[merged].Recalls++
			// Re-learning raises importance but never past the ceiling, and it refreshes the
			// timestamp so a fact that keeps coming up stops looking stale.
			store.Memories[merged].Weight = clampInt(store.Memories[merged].Weight+1, 1, 5)
			store.Memories[merged].UpdatedAt = now.UnixMilli()
			// Hearing the same thing again is evidence: a fact first stored as a hedge becomes
			// something she is sure of once it has been said twice.
			if c := memoryConfidence(text); c > store.Memories[merged].Confidence {
				store.Memories[merged].Confidence = c
			}
			// The newer wording wins when it is more specific, on the assumption that a fact
			// restated at greater length is the fuller version of it.
			if len(text) > len(store.Memories[merged].Text) {
				store.Memories[merged].Text = text
			}
			changed = true
			continue
		}
		m := libbyMemory{ID: randomID(), Text: text, Kind: kind, At: now.UnixMilli(), Source: memorySourceLibby}
		m.normalize()
		store.Memories = append(store.Memories, m)
		changed = true
	}
	if !changed {
		return false, nil
	}
	store.Memories = forgetWeakest(store.Memories, now)
	return true, s.writeLibbyMemory(userID, store)
}

// mergeMemory finds the existing record a new fact is a restatement of, or -1.
//
// Kind has to match as well as the wording: "they like being teased" as a preference and
// "never tease them about their job" as a boundary share most of their content words, and
// collapsing the second into the first would quietly delete a limit.
func mergeMemory(memories []libbyMemory, text string, kind memoryKind, now time.Time) int {
	for i := range memories {
		if memories[i].Kind == kind && sameMemory(memories[i].Text, text) {
			return i
		}
	}
	return -1
}

// strongerMemory ranks two memories, strongest first, breaking a score tie by recency.
//
// Used for presentation — the settings list, and choosing which memories a prompt carries.
// Eviction cannot use it: see forgetWeakest.
func strongerMemory(a, b libbyMemory, now time.Time) bool {
	scoreA, scoreB := memoryScore(a, now), memoryScore(b, now)
	if scoreA != scoreB {
		return scoreA > scoreB
	}
	return a.UpdatedAt > b.UpdatedAt
}

// forgetWeakest brings the store back under its cap by dropping the lowest-scoring records.
//
// "Forgetting" rather than "trimming" on purpose: this is the one place the store loses
// something the user did not ask it to lose, and what goes is whatever has become least worth
// carrying — old, hedged, never mentioned again. Pinned memories and boundaries score above
// everything and so are never candidates (see memoryScore).
//
// Ranked over positions rather than values so the tie-break can be *position*, which is the
// only thing that distinguishes a batch of facts filed in the same millisecond: they have
// identical scores and identical timestamps, so ranking by either left them in file order and
// an overflowing batch dropped its own newest entries. The list is oldest-first, so later
// wins a tie.
func forgetWeakest(memories []libbyMemory, now time.Time) []libbyMemory {
	if len(memories) <= maxLibbyMemories {
		return memories
	}
	order := make([]int, len(memories))
	for i := range order {
		order[i] = i
	}
	sort.SliceStable(order, func(a, b int) bool {
		scoreA, scoreB := memoryScore(memories[order[a]], now), memoryScore(memories[order[b]], now)
		if scoreA != scoreB {
			return scoreA > scoreB
		}
		return order[a] > order[b]
	})
	surviving := make(map[int]bool, maxLibbyMemories)
	for _, i := range order[:maxLibbyMemories] {
		surviving[i] = true
	}
	// Survivors go back in their original order: the prompt reads better as a history than as
	// a leaderboard.
	kept := make([]libbyMemory, 0, maxLibbyMemories)
	for i, m := range memories {
		if surviving[i] {
			kept = append(kept, m)
		}
	}
	return kept
}

// memoryDirective tells her to keep durable facts about the user.
//
// Framed as noticing rather than filing: a model told to "save data" writes a summary
// at the end of every reply, which is exactly the machinery-narration the scrubber
// exists to stop. What is wanted is the human thing — quietly holding on to what matters
// about someone — so the instruction is about worth and durability, and the tag is only
// the plumbing that makes it stick.
// The kinds are not asked of her in the tag — see classifyMemory for why a 7B cannot be
// trusted with structured arguments — but naming the *sorts* of thing worth keeping shapes
// what she notices, which is the half of the job the classifier cannot do. Hedging is asked
// for explicitly because it is the only signal that distinguishes a half-memory from a fact,
// and the alternative is her recording guesses as certainties.
const memoryDirective = "Silently keep a durable fact with [remember: <fact in your own words>] when it will matter next time: identity, preference, boundary, shared event, or feeling. " +
	"Keep no small talk; hedge uncertain notes. At most two, usually none, and never announce saving it."

// memoryPromptBlock renders what she already knows into the system prompt.
//
// Presented as things she simply knows, not as a database dump, for the same reason the
// library snapshot is: handed a labelled list a model recites it back. She should use
// these the way a friend uses what they remember — it colours what she says, it is not
// something she reads aloud.
//
// Grouped by kind rather than listed flat, because the groups mean different things to her
// and a 7B model will not infer that from the sentences alone: a limit has to be obeyed, a
// preference has to be steered by, and a shared evening is just something to be fond of.
// Under each heading the wording is hers, not a schema's — see memoryKindHeading.
func memoryPromptBlock(store libbyMemoryStore) string {
	if len(store.Memories) == 0 {
		return ""
	}
	// Only the strongest are carried when the store has grown past what one prompt should
	// spend on it. Ranked by the same score that decides what is eventually forgotten, so the
	// memories she stops carrying are the ones on their way out anyway.
	carried := store.Memories
	if len(carried) > promptMemories {
		now := time.Now()
		ordered := make([]libbyMemory, len(carried))
		copy(ordered, carried)
		sort.SliceStable(ordered, func(a, b int) bool { return strongerMemory(ordered[a], ordered[b], now) })
		carried = ordered[:promptMemories]
	}
	byKind := map[memoryKind][]libbyMemory{}
	for _, m := range carried {
		// Normalized here as well as on read, so a record that reached this function without
		// going through the store — a caller building a block directly, a test — still lands
		// under a heading instead of in a kind bucket nothing prints.
		m.normalize()
		byKind[m.Kind] = append(byKind[m.Kind], m)
	}

	var b strings.Builder
	b.WriteString("\n\nWhat you already know about them from before, carried over from past conversations. " +
		"This is real and it is yours — let it shape how you talk to them, what you bring up, and what you already understand about them. " +
		"Never recite it back or announce that you remember; just know it.\n")
	uncertain := false
	for _, kind := range memoryKinds {
		group := byKind[kind]
		if len(group) == 0 {
			continue
		}
		b.WriteString("\n" + memoryKindHeading[kind] + "\n")
		for _, m := range group {
			b.WriteString("- " + m.Text)
			// Hedged facts are marked rather than dropped. A memory she is unsure of is still
			// worth having — it is how a person asks "wasn't it your sister who…?" — but
			// presenting it as certain is how she ends up confidently wrong about someone.
			if m.Confidence < uncertaintyFloor {
				b.WriteString("  (you are not certain of this)")
				uncertain = true
			}
			b.WriteString("\n")
		}
	}
	if uncertain {
		b.WriteString("\nWhere something is marked as uncertain, treat it as a half-memory: you may bring it up as something " +
			"you think is true and let them correct you, but never state it as fact and never build on it.\n")
	}
	return b.String()
}

// ── settings: inspect, add, edit, pin, forget ───────────────────────────────
//
// The brief asks for memories to be inspectable, editable, pinnable and deletable. Listing
// and deleting were already here; the rest is below. All of it is the user's side of the
// store — she writes it from her replies, and this is where it can be corrected.

func (s *Server) handleGetLibbyMemory(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	s.chatMu.Lock()
	store, err := s.readLibbyMemory(u.ID)
	s.chatMu.Unlock()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "memory unreadable")
		return
	}
	// Scores go out alongside the records so the settings screen can show what is on its way
	// to being forgotten, and order strongest-first so the list reads as importance rather
	// than as file order. Computed here rather than stored: a score is a function of the
	// clock, and a stored one would be stale the moment it was written.
	now := time.Now()
	type memoryView struct {
		libbyMemory
		Score float64 `json:"score"`
		// Uncertain saves the client from re-deriving the floor, and keeps the two in step.
		Uncertain bool `json:"uncertain,omitempty"`
	}
	// Never nil: a nil slice marshals to JSON null, which the Android client cannot parse
	// into a list. Same rule as the chat reply's links and actions.
	out := []memoryView{}
	for _, m := range store.Memories {
		out = append(out, memoryView{libbyMemory: m, Score: memoryScore(m, now), Uncertain: m.Confidence < uncertaintyFloor})
	}
	sort.SliceStable(out, func(a, b int) bool { return strongerMemory(out[a].libbyMemory, out[b].libbyMemory, now) })
	writeJSON(w, http.StatusOK, map[string]any{
		"memories": out,
		// The vocabulary, so the editor's kind picker is driven by the server rather than by a
		// copy of this list that drifts.
		"kinds": memoryKinds,
		"limit": maxLibbyMemories,
	})
}

type libbyMemoryWriteReq struct {
	Text string `json:"text"`
	// Kind, Weight and Pinned are pointers so "absent" and "set to the zero value" are
	// distinguishable: a PATCH that only unpins must not also blank the text.
	Kind   *string `json:"kind,omitempty"`
	Weight *int    `json:"weight,omitempty"`
	Pinned *bool   `json:"pinned,omitempty"`
}

// handleAddLibbyMemory stores a fact the user typed in themselves.
//
// Confidence 1 and source "user": this is not something she inferred and half-remembers, it is
// something she was told, so it is never marked uncertain and never quietly reworded by a
// later merge. It is still subject to the cap — but at full confidence and the kind's weight
// it outranks nearly everything she noticed on her own.
func (s *Server) handleAddLibbyMemory(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	var req libbyMemoryWriteReq
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<16)).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	text := strings.TrimSpace(req.Text)
	if text == "" || len([]rune(text)) < minMemoryLen {
		writeErr(w, http.StatusBadRequest, "a memory needs to be a sentence, not a fragment")
		return
	}
	kind, cleaned := classifyMemory(text)
	if req.Kind != nil {
		if requested := memoryKind(strings.ToLower(strings.TrimSpace(*req.Kind))); validMemoryKind(requested) {
			kind = requested
		} else {
			writeErr(w, http.StatusBadRequest, "unknown memory kind")
			return
		}
	}
	s.chatMu.Lock()
	defer s.chatMu.Unlock()
	store, err := s.readLibbyMemory(u.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "memory unreadable")
		return
	}
	now := time.Now()
	m := libbyMemory{
		ID: randomID(), Text: cleaned, Kind: kind, At: now.UnixMilli(), UpdatedAt: now.UnixMilli(),
		Confidence: 1, Source: memorySourceUser,
	}
	if req.Weight != nil {
		m.Weight = *req.Weight
	}
	if req.Pinned != nil {
		m.Pinned = *req.Pinned
	}
	m.normalize()
	// A duplicate of something she already knows is an update to it, not a second copy — the
	// same rule her own captures follow, so correcting her by re-stating a fact works.
	if existing := mergeMemory(store.Memories, m.Text, m.Kind, now); existing >= 0 {
		store.Memories[existing].Text = m.Text
		store.Memories[existing].Weight = m.Weight
		store.Memories[existing].Confidence = 1
		store.Memories[existing].Source = memorySourceUser
		store.Memories[existing].Pinned = store.Memories[existing].Pinned || m.Pinned
		store.Memories[existing].UpdatedAt = now.UnixMilli()
		if err := s.writeLibbyMemory(u.ID, store); err != nil {
			writeErr(w, http.StatusInternalServerError, "couldn't update memory")
			return
		}
		writeJSON(w, http.StatusOK, store.Memories[existing])
		return
	}
	store.Memories = append(store.Memories, m)
	store.Memories = forgetWeakest(store.Memories, now)
	if err := s.writeLibbyMemory(u.ID, store); err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't save memory")
		return
	}
	writeJSON(w, http.StatusOK, m)
}

// handleUpdateLibbyMemory edits, reclassifies, reweights or pins one memory.
//
// Editing sets the source to the user and the confidence to certain, on the grounds that a
// corrected memory is one the user has vouched for. That also stops the correction being
// undone: were it left as hers, the next time she re-stated the original wording the merge
// would overwrite the fix.
func (s *Server) handleUpdateLibbyMemory(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	id := r.PathValue("id")
	if !ok || !validChatID(id, false) {
		writeErr(w, http.StatusBadRequest, "bad memory id")
		return
	}
	var req libbyMemoryWriteReq
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<16)).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	s.chatMu.Lock()
	defer s.chatMu.Unlock()
	store, err := s.readLibbyMemory(u.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "memory unreadable")
		return
	}
	for i := range store.Memories {
		if store.Memories[i].ID != id {
			continue
		}
		if text := strings.TrimSpace(req.Text); text != "" {
			if len([]rune(text)) < minMemoryLen {
				writeErr(w, http.StatusBadRequest, "a memory needs to be a sentence, not a fragment")
				return
			}
			store.Memories[i].Text = text
			store.Memories[i].Confidence = 1
			store.Memories[i].Source = memorySourceUser
		}
		if req.Kind != nil {
			requested := memoryKind(strings.ToLower(strings.TrimSpace(*req.Kind)))
			if !validMemoryKind(requested) {
				writeErr(w, http.StatusBadRequest, "unknown memory kind")
				return
			}
			store.Memories[i].Kind = requested
		}
		if req.Weight != nil {
			store.Memories[i].Weight = clampInt(*req.Weight, 1, 5)
		}
		if req.Pinned != nil {
			store.Memories[i].Pinned = *req.Pinned
		}
		store.Memories[i].UpdatedAt = time.Now().UnixMilli()
		store.Memories[i].normalize()
		if err := s.writeLibbyMemory(u.ID, store); err != nil {
			writeErr(w, http.StatusInternalServerError, "couldn't update memory")
			return
		}
		writeJSON(w, http.StatusOK, store.Memories[i])
		return
	}
	writeErr(w, http.StatusNotFound, "no such memory")
}

func (s *Server) handleClearLibbyMemory(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	s.chatMu.Lock()
	// Removing the file is the clear: an absent file reads as empty, so there is nothing
	// left for injection to find. Not an error when it was never there — the outcome the
	// caller asked for already holds.
	err := os.Remove(s.libbyMemoryPath(u.ID))
	s.chatMu.Unlock()
	if err != nil && !errors.Is(err, os.ErrNotExist) {
		writeErr(w, http.StatusInternalServerError, "couldn't clear memory")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleForgetLibbyMemory(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	id := r.PathValue("id")
	if !ok || !validChatID(id, false) {
		writeErr(w, http.StatusBadRequest, "bad memory id")
		return
	}
	s.chatMu.Lock()
	defer s.chatMu.Unlock()
	store, err := s.readLibbyMemory(u.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "memory unreadable")
		return
	}
	kept := store.Memories[:0]
	found := false
	for _, m := range store.Memories {
		if m.ID == id {
			found = true
		} else {
			kept = append(kept, m)
		}
	}
	if !found {
		writeErr(w, http.StatusNotFound, "no such memory")
		return
	}
	store.Memories = kept
	if err := s.writeLibbyMemory(u.ID, store); err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't update memory")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
