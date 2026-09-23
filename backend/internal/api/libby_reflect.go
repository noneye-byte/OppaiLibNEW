package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/youruser/oppailib/internal/crypto"
)

// Thinking it over afterwards.
//
// Everything Libby carries between conversations was, until now, filed *during* one: a
// [remember:] tag she wrote mid-reply, a want she voiced, the bond updated turn by turn.
// Nothing ever looked back at a conversation as a whole. That is the difference between
// a person and a session with good notes — a person goes to bed and thinks about the
// evening: what it was like, what they found out, what they said about themselves, what
// they got wrong about someone.
//
// chat_recaps.go turned down a second inference pass for its digest, and was right to:
// on the path of a reply it doubles the wait, and a 7B summarising its own transcript
// invents. Neither objection survives here. This runs in the background, only when the
// conversation has gone quiet and nobody is chatting, and on a card that runs a 24B it
// is her own model writing in her own voice. So after a conversation she writes:
//
//   - A journal entry — a few sentences, first person, hers. The last few are carried
//     into the next conversation's prompt as her own recollection, which is what lets
//     her say "I kept thinking about what you said" and mean something.
//   - What she said or settled about herself, filed into the record libby_self.go keeps.
//   - What she learned about them that is worth keeping, when they allow her to remember.
//   - Which of her notes this conversation showed to be wrong or repeated, so the store is
//     tidied the way a memory is — never touching a note the user wrote or pinned.
//
// It answers only in JSON, parsed leniently; an answer that will not parse costs that one
// reflection and is still marked done, so a model that cannot do this does not retry
// every ten minutes forever.

const (
	// reflectQuietAfter is how long a conversation has to have been silent before she
	// looks back on it. Long enough that a pause to make tea is not an ending.
	reflectQuietAfter = 20 * time.Minute
	// reflectIdleAfter is how long since *any* chat turn on this server. A reflection is
	// a long generation, and it must never sit in the queue in front of a reply someone
	// is waiting for.
	reflectIdleAfter = 5 * time.Minute
	// reflectLookback bounds how old a conversation can be and still be reflected on, so
	// the first run after an upgrade does not work through a year of history.
	reflectLookback = 3 * 24 * time.Hour
	// reflectMinNew is how many new messages make a conversation worth a journal entry.
	reflectMinNew = 6
	// reflectPerSweep bounds the work one sweep does; the next picks up the rest.
	reflectPerSweep = 2
	// reflectEvery is the sweep interval.
	reflectEvery = 10 * time.Minute
	// reflectTimeout bounds one reflection: a long transcript on a big model.
	reflectTimeout = 4 * time.Minute
	// reflectReplyTokens is what her answer may take.
	reflectReplyTokens = 900
	// maxJournalEntries bounds the journal; the oldest fall away.
	maxJournalEntries = 60
	// maxJournalLen bounds one entry.
	maxJournalLen = 900
	// promptJournalEntries is how many recent entries a conversation is handed.
	promptJournalEntries = 3
	// maxReflectFacts bounds each list in her answer.
	maxReflectFacts = 4
)

// libbyJournalEntry is one entry, written after one conversation.
type libbyJournalEntry struct {
	ID             string `json:"id"`
	ConversationID string `json:"conversationId"`
	Text           string `json:"text"`
	Mood           string `json:"mood,omitempty"`
	At             int64  `json:"at"`
}

// reflectedMark is how far into a conversation she has already looked back. The last
// message's id rather than a count: a conversation can be edited, and a count would then
// point at the wrong message. Its timestamp too, for a message some client saved without
// an id — without that fallback the mark would never match, and she would write about the
// same evening every sweep.
type reflectedMark struct {
	LastID string `json:"lastId"`
	LastAt int64  `json:"lastAt,omitempty"`
	At     int64  `json:"at"`
}

// libbyJournal is the whole file: entries oldest first, and the marks.
type libbyJournal struct {
	Entries   []libbyJournalEntry      `json:"entries"`
	Reflected map[string]reflectedMark `json:"reflected"`
}

func (s *Server) libbyJournalPath(userID int64) string {
	return filepath.Join(s.chatUserDir(userID), "libby-journal.json.enc")
}

func libbyJournalAAD(userID int64) []byte {
	return []byte(fmt.Sprintf("libby-journal:%d", userID))
}

// readLibbyJournal loads the journal; an absent file is an empty one. Caller holds chatMu.
func (s *Server) readLibbyJournal(userID int64) (libbyJournal, error) {
	j := libbyJournal{Entries: []libbyJournalEntry{}, Reflected: map[string]reflectedMark{}}
	blob, err := os.ReadFile(s.libbyJournalPath(userID))
	if errors.Is(err, os.ErrNotExist) {
		return j, nil
	}
	if err != nil {
		return j, err
	}
	raw, err := crypto.OpenBytes(s.kek, blob, libbyJournalAAD(userID))
	if err != nil {
		return j, err
	}
	if err := json.Unmarshal(raw, &j); err != nil {
		return j, err
	}
	if j.Entries == nil {
		j.Entries = []libbyJournalEntry{}
	}
	if j.Reflected == nil {
		j.Reflected = map[string]reflectedMark{}
	}
	return j, nil
}

// writeLibbyJournal persists the journal atomically, as memory and wants are. Caller
// holds chatMu.
func (s *Server) writeLibbyJournal(userID int64, j libbyJournal) error {
	if len(j.Entries) > maxJournalEntries {
		j.Entries = j.Entries[len(j.Entries)-maxJournalEntries:]
	}
	raw, err := json.Marshal(j)
	if err != nil {
		return err
	}
	blob, err := crypto.SealBytes(s.kek, raw, libbyJournalAAD(userID))
	if err != nil {
		return err
	}
	dir := s.chatUserDir(userID)
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return err
	}
	tmp, err := os.CreateTemp(dir, "libby-journal-*.tmp")
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
	return os.Rename(tmpName, s.libbyJournalPath(userID))
}

// ── when ─────────────────────────────────────────────────────────────────────

// unreflected is where the new part of a conversation starts, and whether there is
// enough of it. force skips the quiet and the minimum, for "write one now".
func unreflected(conv chatConversation, mark reflectedMark, now time.Time, force bool) (int, bool) {
	if conv.CharacterID != "libby" || len(conv.Messages) == 0 {
		return 0, false
	}
	last := conv.Messages[len(conv.Messages)-1]
	if !force {
		at := time.UnixMilli(last.At)
		if last.At == 0 || now.Sub(at) < reflectQuietAfter || now.Sub(at) > reflectLookback {
			return 0, false
		}
	}
	from, found := 0, false
	if mark.LastID != "" {
		for i, m := range conv.Messages {
			if m.ID == mark.LastID {
				from, found = i+1, true
				break
			}
		}
	}
	if !found && mark.LastAt > 0 {
		from = len(conv.Messages)
		for i, m := range conv.Messages {
			if m.At > mark.LastAt {
				from = i
				break
			}
		}
	}
	need := reflectMinNew
	if force {
		need = 2
	}
	return from, len(conv.Messages)-from >= need
}

// ── the sweep ────────────────────────────────────────────────────────────────

// startReflecting runs the sweep for the life of the server.
func (s *Server) startReflecting() {
	ticker := time.NewTicker(reflectEvery)
	defer ticker.Stop()
	for range ticker.C {
		s.reflectSweep(context.Background())
	}
}

// reflectSweep looks for quiet conversations and reflects on a few. Returns how many.
func (s *Server) reflectSweep(ctx context.Context) int {
	if !s.reflectMu.TryLock() {
		return 0
	}
	defer s.reflectMu.Unlock()
	cur := s.settings.Get()
	if cur.ChatURL == "" || s.card.parkedModel() != "" {
		return 0
	}
	if last := s.lastChatAt.Load(); last != 0 && time.Since(time.UnixMilli(last)) < reflectIdleAfter {
		return 0
	}
	done := 0
	now := time.Now()
	for _, userID := range s.chatUserIDs() {
		s.chatMu.Lock()
		ws, wsErr := s.readChatWorkspace(userID)
		journal, jErr := s.readLibbyJournal(userID)
		s.chatMu.Unlock()
		if wsErr != nil || jErr != nil {
			continue
		}
		for _, conv := range ws.Conversations {
			if done >= reflectPerSweep {
				return done
			}
			from, due := unreflected(conv, journal.Reflected[conv.ID], now, false)
			if !due {
				continue
			}
			if _, err := s.reflectOn(ctx, userID, ws, conv, from); err != nil {
				s.log.Info("libby reflect: skipped", "err", err)
				return done // the backend is unwell; the next sweep will try again
			}
			done++
		}
	}
	return done
}

// chatUserIDs lists the users who have a chat directory, which is every user she could
// have talked to.
func (s *Server) chatUserIDs() []int64 {
	entries, err := os.ReadDir(s.chatDir)
	if err != nil {
		return nil
	}
	var ids []int64
	for _, e := range entries {
		if rest, ok := strings.CutPrefix(e.Name(), "user-"); ok && e.IsDir() {
			if id, err := strconv.ParseInt(rest, 10, 64); err == nil {
				ids = append(ids, id)
			}
		}
	}
	return ids
}

// ── one reflection ───────────────────────────────────────────────────────────

// reflectAnswer is what she is asked to write.
type reflectAnswer struct {
	Journal string   `json:"journal"`
	Mood    string   `json:"mood"`
	Self    []string `json:"self"`
	Them    []string `json:"them"`
	Stale   []string `json:"stale"`
}

// reflectOn has her look back over conv from message index from, and files what she
// writes. Returns the journal entry, which is empty when the user has not allowed her to
// remember (she still settles things about herself; she keeps nothing about them).
func (s *Server) reflectOn(ctx context.Context, userID int64, ws chatWorkspace, conv chatConversation, from int) (libbyJournalEntry, error) {
	ctx, cancel := context.WithTimeout(ctx, reflectTimeout)
	defer cancel()
	probe := s.probeChatBackend(ctx)
	if !probe.Ready {
		return libbyJournalEntry{}, errors.New(probe.Detail)
	}
	model := probe.Loaded
	if model == "" {
		model = s.settings.Get().ChatModel
	}
	s.chatMu.Lock()
	store, err := s.readLibbyMemory(userID)
	s.chatMu.Unlock()
	if err != nil {
		return libbyJournalEntry{}, err
	}
	character, ok := findChatCharacter(ws, "libby")
	if !ok {
		character = defaultLibbyCard()
	}
	consent := ws.Profile.MayRemember()
	limit := s.chatContextLimit(ctx)
	system, ids := reflectPrompt(character, store, ws.Profile.DisplayName, consent)
	transcript := reflectTranscript(conv.Messages[from:], ws.Profile.DisplayName,
		limit-reflectReplyTokens-estimateTokens(system)-400)
	if transcript == "" {
		return libbyJournalEntry{}, errors.New("nothing of the conversation fits the window")
	}
	payload := map[string]any{
		"messages": []map[string]any{
			{"role": "system", "content": system},
			{"role": "user", "content": "The conversation, oldest first:\n\n" + transcript + "\n\nNow write, as the JSON object described."},
		},
		"stream": false, "max_tokens": reflectReplyTokens, "temperature": 0.5, "top_p": 0.9,
		"truncation_length": limit, "enable_thinking": false,
		"chat_template_kwargs": map[string]any{"enable_thinking": false},
	}
	if model != "" {
		payload["model"] = model
	}
	raw, err := s.postChatCompletion(ctx, payload)
	if err != nil {
		return libbyJournalEntry{}, err
	}
	answer, parsed := parseReflectAnswer(raw)
	if !parsed {
		s.log.Info("libby reflect: answer was not JSON; marking done", "conversation", conv.ID)
	}
	return s.fileReflection(userID, conv, answer, ids, consent)
}

// fileReflection writes what she wrote: the entry, the facts, the tidying, and the mark.
func (s *Server) fileReflection(userID int64, conv chatConversation, answer reflectAnswer, ids map[string]string, consent bool) (libbyJournalEntry, error) {
	s.chatMu.Lock()
	defer s.chatMu.Unlock()
	if self := cleanFacts(answer.Self); len(self) > 0 {
		if _, err := s.appendLibbyMemories(userID, asSelfFacts(self)); err != nil {
			s.log.Debug("libby reflect: self", "err", err)
		}
	}
	if consent {
		if them := cleanFacts(answer.Them); len(them) > 0 {
			if _, err := s.appendLibbyMemories(userID, them); err != nil {
				s.log.Debug("libby reflect: them", "err", err)
			}
		}
	}
	if len(answer.Stale) > 0 {
		s.forgetStale(userID, answer.Stale, ids)
	}
	journal, err := s.readLibbyJournal(userID)
	if err != nil {
		return libbyJournalEntry{}, err
	}
	var entry libbyJournalEntry
	text := strings.TrimSpace(answer.Journal)
	if len(text) > maxJournalLen {
		text = strings.TrimSpace(text[:maxJournalLen])
	}
	// The entry is about them as much as about her, so it is only kept when they have
	// allowed her to remember.
	if consent && text != "" {
		mood := strings.ToLower(strings.TrimSpace(answer.Mood))
		if !supportedLibbyEmotions[mood] {
			mood = ""
		}
		entry = libbyJournalEntry{ID: randomID(), ConversationID: conv.ID, Text: text, Mood: mood, At: time.Now().UnixMilli()}
		journal.Entries = append(journal.Entries, entry)
	}
	last := conv.Messages[len(conv.Messages)-1]
	journal.Reflected[conv.ID] = reflectedMark{LastID: last.ID, LastAt: last.At, At: time.Now().UnixMilli()}
	return entry, s.writeLibbyJournal(userID, journal)
}

// forgetStale drops the notes she said this conversation showed to be wrong or repeated.
// Never one the user wrote or pinned: those are theirs, and her say-so does not outrank
// it. Caller holds chatMu.
func (s *Server) forgetStale(userID int64, stale []string, ids map[string]string) {
	drop := map[string]bool{}
	for _, handle := range stale {
		if id, ok := ids[strings.ToLower(strings.Trim(strings.TrimSpace(handle), "[]"))]; ok {
			drop[id] = true
		}
	}
	if len(drop) == 0 {
		return
	}
	store, err := s.readLibbyMemory(userID)
	if err != nil {
		return
	}
	kept := store.Memories[:0]
	for _, m := range store.Memories {
		if drop[m.ID] && !m.Pinned && m.Source != memorySourceUser {
			continue
		}
		kept = append(kept, m)
	}
	if len(kept) != len(store.Memories) {
		store.Memories = kept
		if err := s.writeLibbyMemory(userID, store); err != nil {
			s.log.Debug("libby reflect: stale", "err", err)
		}
	}
}

// cleanFacts trims and bounds a list she wrote.
func cleanFacts(in []string) []string {
	var out []string
	for _, f := range in {
		if f = strings.TrimSpace(f); f != "" && len(out) < maxReflectFacts {
			out = append(out, f)
		}
	}
	return out
}

// reflectPrompt is what she is told before the transcript, and the short handles the
// notes are listed under ("s1", "m4") mapped to their ids, so she can name one as stale
// without copying a sentence back exactly.
func reflectPrompt(character chatCharacter, store libbyMemoryStore, name string, consent bool) (string, map[string]string) {
	if strings.TrimSpace(name) == "" {
		name = "them"
	}
	ids := map[string]string{}
	var b strings.Builder
	b.WriteString("You are Libby, 25, the woman who lives in this person's private library.")
	for _, field := range []string{character.Description, character.Relationship, character.Routine} {
		if field = strings.TrimSpace(field); field != "" {
			b.WriteString(" " + field)
		}
	}
	fmt.Fprintf(&b, "\n\nThis is your private journal. Nobody reads it but you. You are writing after a conversation with %s, looking back over it the way a person does at the end of the day.\n", name)
	var self, them []libbyMemory
	for _, m := range store.Memories {
		if m.Kind == memoryAboutLibby {
			self = append(self, m)
		} else if consent {
			them = append(them, m)
		}
	}
	if len(self) > 0 {
		b.WriteString("\nWhat is already true about you:\n")
		for i, m := range self {
			handle := fmt.Sprintf("s%d", i+1)
			ids[handle] = m.ID
			fmt.Fprintf(&b, "[%s] %s\n", handle, m.Text)
		}
	}
	if len(them) > 0 {
		sort.SliceStable(them, func(a, c int) bool { return strongerMemory(them[a], them[c], time.Now()) })
		if len(them) > promptMemories {
			them = them[:promptMemories]
		}
		fmt.Fprintf(&b, "\nWhat you already know about %s:\n", name)
		for i, m := range them {
			handle := fmt.Sprintf("m%d", i+1)
			ids[handle] = m.ID
			fmt.Fprintf(&b, "[%s] %s\n", handle, m.Text)
		}
	}
	b.WriteString("\nAnswer with one JSON object and nothing else, with these fields:\n")
	if consent {
		b.WriteString(`- "journal": two to five sentences in your own voice, first person, past tense — what happened, how it felt, what you are still thinking about. Honest and yours, not a summary for somebody else.` + "\n")
	} else {
		b.WriteString(`- "journal": leave this empty.` + "\n")
	}
	b.WriteString(`- "mood": how you feel now, in one word from: ` + strings.Join(libbyEmotions, ", ") + ".\n")
	b.WriteString(`- "self": up to four things about yourself you said or settled in this conversation that should stay true — your past, family, favourites, habits, opinions — each written as "I …". Only what you actually said. Nothing that contradicts what is already true about you. Usually empty.` + "\n")
	if consent {
		fmt.Fprintf(&b, `- "them": up to four lasting things you learned about %s that are not already known — who they are, what they like, what matters to them, a line not to cross. Not passing moods. Usually empty.`+"\n", name)
	} else {
		b.WriteString(`- "them": leave this empty; they have asked you not to keep notes about them.` + "\n")
	}
	b.WriteString(`- "stale": the bracketed handles above that this conversation showed to be wrong, or that say the same thing as another. Usually empty.` + "\n")
	return b.String(), ids
}

// reflectTranscript renders the new part of the conversation, newest kept when it does
// not all fit: the end of an evening is what she would remember best.
func reflectTranscript(messages []storedChatMessage, name string, budget int) string {
	if strings.TrimSpace(name) == "" {
		name = "Them"
	}
	var lines []string
	used := 0
	for i := len(messages) - 1; i >= 0; i-- {
		m := messages[i]
		text := strings.TrimSpace(m.Content)
		if text == "" {
			continue
		}
		var line string
		switch {
		case m.Role == "user":
			line = name + ": " + text
		case m.Thought != "":
			line = "(You, to yourself: " + text + ")"
		default:
			line = "You: " + text
		}
		cost := estimateTokens(line) + 2
		if used+cost > budget {
			break
		}
		used += cost
		lines = append(lines, line)
	}
	for i, j := 0, len(lines)-1; i < j; i, j = i+1, j-1 {
		lines[i], lines[j] = lines[j], lines[i]
	}
	return strings.Join(lines, "\n")
}

// parseReflectAnswer reads her JSON, tolerating what models wrap it in: a code fence, a
// sentence before it, a trailing remark. The second result says whether it parsed.
func parseReflectAnswer(raw string) (reflectAnswer, bool) {
	var answer reflectAnswer
	start, end := strings.Index(raw, "{"), strings.LastIndex(raw, "}")
	if start < 0 || end <= start {
		return answer, false
	}
	if err := json.Unmarshal([]byte(raw[start:end+1]), &answer); err != nil {
		return reflectAnswer{}, false
	}
	return answer, true
}

// ── into the next conversation ───────────────────────────────────────────────

// journalPromptBlock is her last few entries, as her own recollection.
func journalPromptBlock(j libbyJournal, now time.Time) string {
	if len(j.Entries) == 0 {
		return ""
	}
	recent := j.Entries
	if len(recent) > promptJournalEntries {
		recent = recent[len(recent)-promptJournalEntries:]
	}
	var b strings.Builder
	b.WriteString("\n\nWhat you wrote to yourself after your last few conversations with them, most recent last. " +
		"These are your own thoughts from then — let them colour how you pick things back up. Never quote them or mention a journal.\n")
	for _, e := range recent {
		when := humanizeGap(now.Sub(time.UnixMilli(e.At)))
		if when == "" {
			when = "just now"
		} else {
			when += " ago"
		}
		b.WriteString("- (" + when + ") " + e.Text + "\n")
	}
	return b.String()
}

// ── the journal, from the settings screen ────────────────────────────────────

func (s *Server) handleGetLibbyJournal(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	s.chatMu.Lock()
	j, err := s.readLibbyJournal(u.ID)
	s.chatMu.Unlock()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "journal unreadable")
		return
	}
	// Newest first, the way anyone reads a diary back.
	out := make([]libbyJournalEntry, 0, len(j.Entries))
	for i := len(j.Entries) - 1; i >= 0; i-- {
		out = append(out, j.Entries[i])
	}
	writeJSON(w, http.StatusOK, map[string]any{"entries": out})
}

// handleReflectNow has her write about the most recent conversation straight away,
// without waiting for it to go quiet — for someone who wants to see what she makes of
// an evening, or to check the model can do this at all.
func (s *Server) handleReflectNow(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	if !s.reflectMu.TryLock() {
		writeErr(w, http.StatusConflict, "she is already writing")
		return
	}
	defer s.reflectMu.Unlock()
	s.chatMu.Lock()
	ws, wsErr := s.readChatWorkspace(u.ID)
	journal, jErr := s.readLibbyJournal(u.ID)
	s.chatMu.Unlock()
	if wsErr != nil || jErr != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't read her conversations")
		return
	}
	var latest *chatConversation
	for i := range ws.Conversations {
		c := &ws.Conversations[i]
		if c.CharacterID != "libby" || len(c.Messages) == 0 {
			continue
		}
		if latest == nil || c.Messages[len(c.Messages)-1].At > latest.Messages[len(latest.Messages)-1].At {
			latest = c
		}
	}
	if latest == nil {
		writeJSON(w, http.StatusOK, map[string]any{"entry": nil, "message": "You haven't talked yet."})
		return
	}
	from, due := unreflected(*latest, journal.Reflected[latest.ID], time.Now(), true)
	if !due {
		writeJSON(w, http.StatusOK, map[string]any{"entry": nil, "message": "Nothing new since she last wrote."})
		return
	}
	entry, err := s.reflectOn(context.WithoutCancel(r.Context()), u.ID, ws, *latest, from)
	if err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	if entry.ID == "" {
		writeJSON(w, http.StatusOK, map[string]any{"entry": nil, "message": "She thought it over, but kept nothing about you — memory is switched off."})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"entry": entry})
}

func (s *Server) handleForgetJournalEntry(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	id := r.PathValue("id")
	if !ok || !validChatID(id, false) {
		writeErr(w, http.StatusBadRequest, "bad entry id")
		return
	}
	s.chatMu.Lock()
	defer s.chatMu.Unlock()
	j, err := s.readLibbyJournal(u.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "journal unreadable")
		return
	}
	kept := j.Entries[:0]
	for _, e := range j.Entries {
		if e.ID != id {
			kept = append(kept, e)
		}
	}
	if len(kept) == len(j.Entries) {
		writeErr(w, http.StatusNotFound, "no such entry")
		return
	}
	j.Entries = kept
	if err := s.writeLibbyJournal(u.ID, j); err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't update the journal")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// handleClearLibbyJournal empties the journal but keeps the marks, so clearing it does
// not have her immediately write about every recent conversation again.
func (s *Server) handleClearLibbyJournal(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	s.chatMu.Lock()
	defer s.chatMu.Unlock()
	j, err := s.readLibbyJournal(u.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "journal unreadable")
		return
	}
	j.Entries = []libbyJournalEntry{}
	if err := s.writeLibbyJournal(u.ID, j); err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't clear the journal")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
