package api

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"image"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"

	"github.com/youruser/oppailib/internal/settings"
)

// Letting Libby do things, with the user's hand on the switch.
//
// Everything above this file is Libby *saying* things: a mood, a picture of herself,
// a link to something on the shelf. This is her asking to change the library — import
// a URL, generate a picture, tag something, favourite something.
//
// The rule the whole design hangs off: **nothing here writes anything.** A reply's
// action tags are parsed into proposals and handed back to the client, which draws
// them as cards the user has to approve. Only that approval — a separate, explicit
// request to /api/libby/act — performs the work. There is no path by which a model
// writing a line of text mutates the collection, which matters because a model can be
// talked into writing any line of text at all, and this is somebody's private library.
//
// Proposals also make her honest. Told she can only *ask*, she describes what she
// wants to do and waits; given the ability to act silently she would report having
// done things whether or not they happened.

const (
	// maxLibbyActions bounds proposals per reply. A message offering five things to
	// approve is a form, not a conversation.
	maxLibbyActions = 2
	// maxActionArgument bounds a tag's payload, which is a URL or a short description.
	maxActionArgument = 400
)

// libbyAction is one thing she has asked to do, as the client will draw it.
//
// Self-describing on purpose: Label and Detail are what the approval card shows, so a
// client needs no table of its own to render an action kind it has never heard of, and
// an action kind added later degrades to a card the user can still read and refuse.
type libbyAction struct {
	// ID is unique within the reply, so a client can track which card is in flight.
	ID string `json:"id"`
	// Kind is what will happen: "generate", "import", "tag", "favorite", "rename",
	// "shelf".
	Kind string `json:"kind"`
	// Label is the button-height summary — "Generate a picture".
	Label string `json:"label"`
	// Detail is the specifics the user is approving — the prompt, the URL, the tags.
	Detail string `json:"detail"`
	// Prompt carries a generate action's description.
	Prompt string `json:"prompt,omitempty"`
	// URL carries an import action's address.
	URL string `json:"url,omitempty"`
	// MediaID is the item a tag/favorite action applies to, already resolved from the
	// title she wrote, so the client never has to search for what she meant.
	MediaID int64 `json:"mediaId,omitempty"`
	// MediaTitle is that item's real title, for the card.
	MediaTitle string `json:"mediaTitle,omitempty"`
	// Tags carries a tag action's additions.
	Tags []string `json:"tags,omitempty"`
	// Title carries a rename action's new title.
	Title string `json:"title,omitempty"`
}

// actionCapabilities says which actions are on the table for this request.
type actionCapabilities struct {
	Generate bool // image generation is configured
	Library  bool // there is a library to import into and tag
	// KnownURLs are the addresses the conversation actually contains. An import may
	// only point at one of these: the model has no addresses of its own, so anything
	// else it writes into an import tag is invented, and an Allow button on an
	// invented address is a request to fetch a made-up host. See chat_hallucinations.go.
	KnownURLs map[string]bool
	// SelfieReady says a picture of her fitting this turn's request already exists, so
	// offering to generate one instead is the wrong answer. See chat_photo_pick.go.
	SelfieReady bool
	// Server says the admin actions are on the table: the user is an admin and the turn
	// is about the machine. Describe says a vision model is configured. Models are the
	// chat models she may offer to load, filled in once the backend has been asked —
	// after the directive is written, before the reply is parsed. See libby_server.go.
	Server   bool
	Describe bool
	Models   []string
}

func libbyCapabilities(cur settings.Settings) actionCapabilities {
	return actionCapabilities{Generate: cur.ImageGenEnabled, Library: true}
}

// actionTitle takes the item-naming half of a tag argument, which is everything before
// the "|" separator in `[do: tag <title> | <tags>]`.
func actionTitle(argument string) string {
	title, _, _ := strings.Cut(argument, "|")
	return strings.TrimSpace(title)
}

func (s *Server) buildLibbyAction(verb, argument string, caps actionCapabilities, candidates []libraryCandidate) (libbyAction, bool) {
	if len(argument) > maxActionArgument {
		argument = argument[:maxActionArgument]
	}
	switch verb {
	case "generate", "gen", "draw", "make":
		if !caps.Generate || argument == "" {
			return libbyAction{}, false
		}
		return libbyAction{
			Kind:   "generate",
			Label:  "Generate a picture",
			Detail: argument,
			Prompt: argument,
		}, true

	case "import", "add", "save", "grab":
		if !caps.Library {
			return libbyAction{}, false
		}
		// A URL, and only one she can have got from the user: the model does not know
		// addresses, so anything that is not a plain http(s) URL is a hallucination and
		// an import card pointing at one is a request to fetch a made-up host.
		fields := strings.Fields(argument)
		if len(fields) == 0 {
			return libbyAction{}, false
		}
		parsed, err := url.Parse(fields[0])
		if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.Host == "" {
			return libbyAction{}, false
		}
		// An address the user never wrote is one she made up, however plausible it
		// looks. Dropped rather than shown: the card would be a button whose only
		// outcome is fetching a made-up host, and her sentence reads fine without it.
		if !caps.KnownURLs[urlKey(fields[0])] {
			return libbyAction{}, false
		}
		return libbyAction{
			Kind:   "import",
			Label:  "Add to your library",
			Detail: parsed.String(),
			URL:    parsed.String(),
		}, true

	case "tag":
		if !caps.Library {
			return libbyAction{}, false
		}
		title, rest, found := strings.Cut(argument, "|")
		if !found {
			return libbyAction{}, false
		}
		link, matched := bestLibraryMatch(candidates, strings.TrimSpace(title))
		if !matched {
			return libbyAction{}, false
		}
		var tags []string
		for _, tag := range strings.Split(rest, ",") {
			if tag = normalizeChatTag(tag); tag != "" && len(tags) < 8 {
				tags = append(tags, tag)
			}
		}
		if len(tags) == 0 {
			return libbyAction{}, false
		}
		return libbyAction{
			Kind:       "tag",
			Label:      "Add tags",
			Detail:     strings.Join(tags, ", ") + " → " + link.Title,
			MediaID:    link.ID,
			MediaTitle: link.Title,
			Tags:       tags,
		}, true

	case "favorite", "favourite", "fav":
		if !caps.Library {
			return libbyAction{}, false
		}
		link, matched := bestLibraryMatch(candidates, argument)
		if !matched {
			return libbyAction{}, false
		}
		return libbyAction{
			Kind:       "favorite",
			Label:      "Add to favorites",
			Detail:     link.Title,
			MediaID:    link.ID,
			MediaTitle: link.Title,
		}, true

	case "shelf", "playlist", "lineup":
		if !caps.Library {
			return libbyAction{}, false
		}
		theme := strings.Join(strings.Fields(argument), " ")
		if len(theme) > 120 {
			theme = strings.TrimSpace(theme[:120])
		}
		detail := libbyShelfName
		if theme != "" {
			detail += " — " + theme
		}
		return libbyAction{
			Kind:   "shelf",
			Label:  "Put together tonight's shelf",
			Detail: detail,
			Prompt: theme,
		}, true

	case "load", "switch", "swap":
		if !caps.Server {
			return libbyAction{}, false
		}
		// Only a name the backend listed. A model she invented, or one she half-
		// remembered from her training, is a load that can only fail.
		name, ok := matchModelName(strings.TrimPrefix(strings.TrimSpace(argument), "model "), caps.Models)
		if !ok {
			return libbyAction{}, false
		}
		return libbyAction{Kind: "load", Label: "Load a different chat model", Detail: name, Prompt: name}, true

	case "cleanup", "clean", "tidy":
		if !caps.Server {
			return libbyAction{}, false
		}
		return libbyAction{Kind: "cleanup", Label: "Clean up storage", Detail: "Abandoned uploads and leftover scratch files — never media or memories"}, true

	case "describe":
		if !caps.Server || !caps.Describe {
			return libbyAction{}, false
		}
		return libbyAction{Kind: "describe", Label: "Describe the library", Detail: "The vision model writes a description for everything that has none, in the background"}, true

	case "free", "release", "unload":
		if !caps.Server || !caps.Generate {
			return libbyAction{}, false
		}
		return libbyAction{Kind: "free", Label: "Free the graphics card", Detail: "The image generator lets go of the checkpoint it is holding"}, true

	case "rename", "retitle", "call":
		if !caps.Library {
			return libbyAction{}, false
		}
		title, rest, found := strings.Cut(argument, "|")
		if !found {
			return libbyAction{}, false
		}
		link, matched := bestLibraryMatch(candidates, strings.TrimSpace(title))
		if !matched {
			return libbyAction{}, false
		}
		newTitle, ok := cleanActionTitle(rest)
		if !ok || strings.EqualFold(newTitle, link.Title) {
			return libbyAction{}, false
		}
		return libbyAction{
			Kind:       "rename",
			Label:      "Rename",
			Detail:     link.Title + " → " + newTitle,
			MediaID:    link.ID,
			MediaTitle: link.Title,
			Title:      newTitle,
		}, true
	}
	return libbyAction{}, false
}

// maxRenameTitle bounds a title she proposes. The library's own title field is far
// longer, but a name she writes is a name for a grid tile, not a description.
const maxRenameTitle = 120

// cleanActionTitle takes the new-name half of a rename tag: quotes she wrapped it in
// come off, whitespace collapses, and an empty or absurd result is refused.
func cleanActionTitle(raw string) (string, bool) {
	title := strings.Trim(strings.TrimSpace(raw), wrappingQuotes)
	title = strings.Join(strings.Fields(title), " ")
	if title == "" || len(title) > maxRenameTitle {
		return "", false
	}
	return title, true
}

// ── performing an approved action ───────────────────────────────────────────

// actRequest is what a client sends once the user has pressed Allow. It carries the
// action's fields rather than an id from a previous response: the server keeps no
// per-conversation state (the client owns the log), so there is nothing to look an id
// up in. That is safe precisely because every field is re-validated here, and because
// this endpoint is behind the same session auth as the rest of the API — a request
// forged with different fields is the authenticated user asking for those fields,
// which they could have asked for directly anyway.
type actRequest struct {
	Kind    string   `json:"kind"`
	Prompt  string   `json:"prompt,omitempty"`
	URL     string   `json:"url,omitempty"`
	MediaID int64    `json:"mediaId,omitempty"`
	Tags    []string `json:"tags,omitempty"`
	Title   string   `json:"title,omitempty"`
	// Outfit, Activity and Intensity are her state on the device at the moment the
	// user pressed Allow on a generate card: what she is wearing, what she is doing,
	// how heated things are. All three are client-owned between turns (see
	// chatRequest), so the approval carries them the way a chat turn does. A picture
	// she makes of herself is drawn in that state, which is what makes it a picture
	// *of now* rather than of a woman in the default sprite's clothes.
	Outfit    string `json:"outfit,omitempty"`
	Activity  string `json:"activity,omitempty"`
	Intensity int    `json:"intensity,omitempty"`
	// Wearing is what she has on in this conversation when it is not her own clothes —
	// "nothing", or the clothes she changed into. See libby_wearing.go.
	Wearing string `json:"wearing,omitempty"`
	// JobID names the generation so the chat can watch its progress, the way the studio
	// does. See imagegen_jobs.go.
	JobID string `json:"jobId,omitempty"`
	// RecentMediaIDs are what she has already handed over in this conversation, so a
	// shelf she builds is not the things they have just seen. See libby_shelf.go.
	RecentMediaIDs []int64 `json:"recentMediaIds,omitempty"`
}

// handleLibbyAct performs one action the user has approved.
//
// Deliberately a thin router onto machinery that already exists rather than a second
// implementation of importing or generating: the point of this endpoint is that
// approval and execution are one request the user's click caused, not that Libby has
// her own copies of the app's features.
func (s *Server) handleLibbyAct(w http.ResponseWriter, r *http.Request) {
	var req actRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<16)).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	cur := s.settings.Get()
	switch strings.ToLower(strings.TrimSpace(req.Kind)) {
	case "generate":
		s.actGenerate(w, r, cur, req)
	case "import":
		s.actImport(w, r, req)
	case "tag":
		s.actTag(w, r, req)
	case "favorite", "favourite":
		s.actFavorite(w, r, req)
	case "rename":
		s.actRename(w, r, req)
	case "shelf":
		s.actShelf(w, r, req)
	case "load", "cleanup", "describe", "free":
		s.actServer(w, r, cur, req)
	default:
		writeErr(w, http.StatusBadRequest, "unknown action")
	}
}

// captureWriter records a delegated handler's response so this one can act on it.
// A minimal http.ResponseWriter rather than httptest.NewRecorder: that lives in a
// testing package and pulling it into the serving path is a smell, and nothing here
// needs headers or flushing.
type captureWriter struct {
	status int
	body   strings.Builder
	header http.Header
}

func newCapture() *captureWriter { return &captureWriter{status: http.StatusOK, header: http.Header{}} }

func (c *captureWriter) Header() http.Header  { return c.header }
func (c *captureWriter) WriteHeader(code int) { c.status = code }
func (c *captureWriter) Write(p []byte) (int, error) {
	return c.body.Write(p)
}

// delegate re-enters one of the app's own handlers with a synthesized JSON request.
//
// Deliberately not a refactor of those handlers into shared helpers. Importing,
// generating and patching each carry real behaviour beyond the happy path — detached
// contexts so a closed tab does not abort a ten-minute download, ingest side effects,
// tag provenance — and a second implementation of any of it would drift. Approving one
// of Libby's offers should do exactly, and only, what doing it by hand does.
func (s *Server) delegate(r *http.Request, handler http.HandlerFunc, method, path string, body any) *captureWriter {
	raw, _ := json.Marshal(body)
	sub := r.Clone(r.Context())
	sub.Method = method
	sub.URL = &url.URL{Path: path}
	sub.RequestURI = ""
	sub.Body = io.NopCloser(bytes.NewReader(raw))
	sub.ContentLength = int64(len(raw))
	sub.Header = r.Header.Clone()
	sub.Header.Set("Content-Type", "application/json")
	out := newCapture()
	handler(out, sub)
	return out
}

// relay passes a delegated response straight through, so a failure inside the real
// handler reaches the user in that handler's own words rather than as a generic
// "the action failed".
func relay(w http.ResponseWriter, captured *captureWriter) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(captured.status)
	_, _ = w.Write([]byte(captured.body.String()))
}

// actGenerate makes a picture and files it, in one approved step.
//
// The two halves of the studio's flow — generate to an in-memory preview, then save
// the chosen preview — are joined here because there is no chooser in a conversation.
// She offered one picture; the user said yes to one picture.
func (s *Server) actGenerate(w http.ResponseWriter, r *http.Request, cur settings.Settings, req actRequest) {
	if !cur.ImageGenEnabled {
		writeErr(w, http.StatusServiceUnavailable, "image generation is not configured")
		return
	}
	subject := strings.TrimSpace(req.Prompt)
	if subject == "" {
		writeErr(w, http.StatusBadRequest, "there is nothing to generate")
		return
	}
	// Her likeness leads and the subject follows, which is the order these prompts are
	// written in and the order the weighting favours: the picture should be of her,
	// doing the thing, rather than of the thing with her somewhere in it. Between the
	// two goes her state — the clothes she has on and what she is doing — so the
	// picture is of her as she is in this conversation. See libbySelfiePrompt.
	prompt, stateTags := s.libbySelfiePrompt(cur.LibbyGenPrompt, subject, req.Outfit, normalizeWearing(req.Wearing), req.Activity, req.Intensity)
	gen := generateReq{
		Prompt:         prompt,
		NegativePrompt: cur.LibbyGenNegativePrompt,
		Checkpoint:     cur.LibbyGenModel,
		Board:          cur.LibbyGenBoard,
		Count:          1,
		JobID:          req.JobID,
	}
	gen.Loras = libbyLoras(cur)
	generated := s.delegate(r, s.handleImageGenGenerate, http.MethodPost, "/api/imagegen/generate", gen)
	if generated.status < 200 || generated.status >= 300 {
		relay(w, generated)
		return
	}
	var result struct {
		Images []struct {
			ID string `json:"id"`
		} `json:"images"`
	}
	if err := json.Unmarshal([]byte(generated.body.String()), &result); err != nil || len(result.Images) == 0 {
		writeErr(w, http.StatusBadGateway, "the generator returned no image")
		return
	}
	// Tagged so it is findable later as something she made. The subject and her state go
	// on as tags too: they are what the selfie picker matches a request against
	// (chat_photo_pick.go), so a picture made for "you in the bath" is the one that
	// answers "the bath one" next time rather than a fresh generation.
	tags := append([]string{"libby"}, stateTags...)
	tags = append(tags, selfieSubjectTags(subject)...)
	title := libbyImageTitle(subject)

	// It goes where a picture she sends goes: her chat gallery, and from there into the
	// conversation as a message of hers. It used to be filed in the library and the card
	// said so — which is a picture she made *for* them, sent nowhere, with a note saying
	// where to go and look. The library copy is now the operator's choice.
	preview, ok := s.genCache.get(result.Images[0].ID)
	if !ok {
		writeErr(w, http.StatusBadGateway, "the generator's picture expired before it could be kept")
		return
	}
	u, ok := s.chatUser(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	sent, status, err := s.fileChatImage(u.ID, generatedChatImage(r, s, preview.data, title, tags), preview.data)
	if err != nil {
		writeErr(w, status, err.Error())
		return
	}
	out := map[string]any{"image": sent, "message": "She sent it to you."}
	// A picture of her in something leaves her in it; the client keeps that as the
	// conversation's state, the way a chat turn's `wearing` is kept.
	if wearing, ok := clothesFromSubject(subject); ok {
		out["wearing"] = wearing
	}
	if cur.LibbyGenToLibrary {
		if id := s.saveGeneratedToLibrary(r, result.Images[0].ID, title, tags); id > 0 {
			out["id"] = id
			out["message"] = "She sent it to you — and it's in your library."
		}
	}
	writeJSON(w, http.StatusOK, out)
}

// libbyLoras are her settings' LoRAs in the form a generation takes.
func libbyLoras(cur settings.Settings) []loraReq {
	out := make([]loraReq, 0, len(cur.LibbyGenLoras))
	for _, l := range cur.LibbyGenLoras {
		out = append(out, loraReq{Name: l.Name, Weight: l.Weight})
	}
	return out
}

// generatedChatImage is the gallery record for a picture she made of herself: hers by
// construction, so its subject is set rather than left to the scanner, and the scanner's
// tags join hers so the picker can match it by what is actually in it.
func generatedChatImage(r *http.Request, s *Server, raw []byte, title string, tags []string) chatImage {
	return generatedChatImageCtx(r.Context(), s, raw, title, tags, true)
}

// generatedChatImageCtx is generatedChatImage without a request behind it. scan runs the
// tagger; the camera passes false when it already has the tagger's words.
func generatedChatImageCtx(ctx context.Context, s *Server, raw []byte, title string, tags []string, scan bool) chatImage {
	seen := map[string]bool{}
	var all []string
	add := func(tag string) {
		if tag = normalizeChatTag(tag); tag != "" && !seen[tag] {
			seen[tag] = true
			all = append(all, tag)
		}
	}
	for _, tag := range tags {
		add(tag)
	}
	if decoded, _, err := image.Decode(bytes.NewReader(raw)); scan && err == nil {
		if suggestions, err := s.ai.TagImage(ctx, decoded); err == nil {
			for _, suggestion := range suggestions {
				add(suggestion.Name)
			}
		}
	}
	sort.Strings(all)
	return chatImage{
		ID: randomID(), CharacterID: "libby", Name: title, Tags: all,
		MIME: safeInlineContentType(http.DetectContentType(raw)), CreatedAt: time.Now().UnixMilli(),
		Subject: chatSubjectSelf,
	}
}

// saveGeneratedToLibrary files the picture in the library as well, the way it always
// used to be, and returns the new item's id — 0 when the save failed, which costs the
// library copy and not the picture she already sent.
func (s *Server) saveGeneratedToLibrary(r *http.Request, previewID, title string, tags []string) int64 {
	saved := s.delegate(r, s.handleImageGenSave, http.MethodPost, "/api/imagegen/save", genSaveReq{
		ID: previewID, Title: title, Tags: tags,
	})
	if saved.status < 200 || saved.status >= 300 {
		s.log.Debug("library copy of a generated selfie", "status", saved.status)
		return 0
	}
	var filed struct {
		ID int64 `json:"id"`
	}
	if err := json.Unmarshal([]byte(saved.body.String()), &filed); err != nil || filed.ID <= 0 {
		return 0
	}
	// It is a picture of her by construction, so say so the way a manual verdict does —
	// recognition would likely agree, but "likely" is a poor basis for whether she can
	// send it.
	if err := s.db.AddTag(r.Context(), filed.ID, libbyIdentityTag, libbyIdentityCategory, "manual", 0); err != nil {
		s.log.Debug("tag generated selfie as her", "err", err)
	}
	s.touchLibraryIndex()
	return filed.ID
}

// libbySelfiePrompt composes the prompt for a picture she makes of herself, and the
// tags that record the state it was made in.
//
// Order: her likeness, then the outfit she has on, then what she is doing, then the
// subject asked for — with the outfit left out when the subject names her clothes, and
// replaced by what she is wearing when she changed earlier. The outfit comes from the worn wardrobe's own prompt when the
// studio recorded one, and from the bundled wardrobe's tier description otherwise —
// the same tiers wardrobeDirective tells her she is wearing, so the picture and her
// account of herself agree. The activity is the MISC state's generator words, gated
// at the same floor the state itself is (allowedActivity): a calm conversation cannot
// be talked into an explicit picture by a client that sends the wrong state.
func (s *Server) libbySelfiePrompt(likeness, subject, outfitID, wearing, activity string, intensity int) (string, []string) {
	parts := make([]string, 0, 4)
	var tags []string
	if likeness = strings.TrimSpace(likeness); likeness != "" {
		parts = append(parts, likeness)
	}
	if intensity < 1 {
		intensity = 1
	} else if intensity > 5 {
		intensity = 5
	}
	// A subject that says what she is wearing is all she is wearing: see
	// libby_selfie_clothes.go for the blend the worn outfit used to make of it.
	dressed := subjectDressesHer(subject)
	clothes := ""
	// What she changed into earlier in the conversation stands in for her own clothes
	// until she changes back. See libby_wearing.go.
	if wearing != "" && !dressed {
		clothes = wearingGen(wearing)
		if wearing == wearingNothing {
			tags = append(tags, "nude")
		}
		outfitID = ""
	}
	if outfitID = strings.TrimSpace(outfitID); outfitID != "" && validChatID(outfitID, false) && !dressed {
		if outfit, err := s.readLibbyOutfit(outfitID); err == nil {
			clothes = outfit.Prompt
			if name := strings.TrimSpace(outfit.Name); name != "" {
				tags = append(tags, normalizeChatTag("outfit:"+name))
			}
		}
	}
	if clothes == "" && !dressed && wearing == "" {
		clothes = libbyWardrobeGen[intensity]
	}
	if clothes != "" {
		parts = append(parts, clothes)
	}
	if id := allowedActivity(activity, intensity); id != "" {
		if a := libbyActivityByID[id]; a.Gen != "" {
			parts = append(parts, a.Gen)
			tags = append(tags, id)
		}
	}
	if subject = strings.TrimSpace(subject); subject != "" {
		parts = append(parts, subject)
	}
	return strings.Join(parts, ", "), tags
}

// libbyWardrobeGen is the bundled wardrobe in generator words, one entry per heat
// tier, mirroring libbyWardrobe (handlers_chat.go) which is the same clothes in prose.
var libbyWardrobeGen = map[int]string{
	1: "black tank top, orange shorts with white trim, drawstring, glasses",
	2: "black tank top, orange shorts, glasses, blush, bra strap slip",
	3: "black tank top, orange shorts, glasses, blush, strap slip, flushed",
	4: "black tank top pulled off one shoulder, orange bra visible, orange shorts, fogged glasses, blush",
	5: "tank top pulled down, bare breasts, orange shorts pulled down, black panties, glasses, heavy blush",
}

// selfieSubjectTags turns the subject she was asked for into tags, so the picture is
// matched by them next time. Comma-separated phrases become tags; a bare sentence
// becomes one tag per word worth keeping. Bounded, and the asking words dropped, the
// way the picker itself reads a request (pictureRequestSubject).
func selfieSubjectTags(subject string) []string {
	var out []string
	seen := map[string]bool{}
	add := func(tag string) {
		tag = normalizeChatTag(tag)
		if tag == "" || seen[tag] || len(out) >= 8 {
			return
		}
		seen[tag] = true
		out = append(out, tag)
	}
	// Split before the asking words are stripped: pictureRequestSubject trims the
	// commas off, and a phrase list read afterwards is one long phrase.
	if strings.Contains(subject, ",") {
		for _, phrase := range strings.Split(subject, ",") {
			add(pictureRequestSubject(phrase))
		}
		return out
	}
	subject = pictureRequestSubject(subject)
	if subject == "" {
		return nil
	}
	for _, word := range strings.Fields(subject) {
		if len(word) >= 3 && !subjectGlue[word] {
			add(word)
		}
	}
	return out
}

// maxLibbyImageTitle keeps a generated title to something a grid tile can show.
const maxLibbyImageTitle = 60

// libbyImageTitle turns the description she gave into a title. The prompt is already
// kept verbatim in the item's notes by the save path, so this only has to be short and
// recognisable, not complete.
func libbyImageTitle(subject string) string {
	title := strings.TrimSpace(strings.SplitN(subject, ",", 2)[0])
	if title == "" {
		return "Made by Libby"
	}
	if len(title) > maxLibbyImageTitle {
		title = strings.TrimSpace(title[:maxLibbyImageTitle])
	}
	return title
}

func (s *Server) actImport(w http.ResponseWriter, r *http.Request, req actRequest) {
	parsed, err := url.Parse(strings.TrimSpace(req.URL))
	if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.Host == "" {
		writeErr(w, http.StatusBadRequest, "that isn't a web address I can fetch")
		return
	}
	relay(w, s.delegate(r, s.handleScrapeImport, http.MethodPost, "/api/scrape/import",
		scrapeImportReq{URL: parsed.String()}))
}

func (s *Server) actTag(w http.ResponseWriter, r *http.Request, req actRequest) {
	if req.MediaID <= 0 {
		writeErr(w, http.StatusBadRequest, "no item to tag")
		return
	}
	tags := make([]string, 0, len(req.Tags))
	for _, tag := range req.Tags {
		if tag = normalizeChatTag(tag); tag != "" {
			tags = append(tags, tag)
		}
	}
	if len(tags) == 0 {
		writeErr(w, http.StatusBadRequest, "no tags to add")
		return
	}
	s.applyMediaPatch(w, r, req.MediaID, mediaPatchReq{AddTags: tags})
}

func (s *Server) actFavorite(w http.ResponseWriter, r *http.Request, req actRequest) {
	if req.MediaID <= 0 {
		writeErr(w, http.StatusBadRequest, "no item to favorite")
		return
	}
	favorite := true
	s.applyMediaPatch(w, r, req.MediaID, mediaPatchReq{Favorite: &favorite})
}

// actRename retitles one item, on the same path the viewer's title field uses. The
// title is re-validated here rather than trusted from the card: the card was built
// from a model's words, and the request from a client's, and neither is this server.
func (s *Server) actRename(w http.ResponseWriter, r *http.Request, req actRequest) {
	if req.MediaID <= 0 {
		writeErr(w, http.StatusBadRequest, "no item to rename")
		return
	}
	title, ok := cleanActionTitle(req.Title)
	if !ok {
		writeErr(w, http.StatusBadRequest, "that isn't a usable title")
		return
	}
	s.applyMediaPatch(w, r, req.MediaID, mediaPatchReq{Title: &title})
}

// applyMediaPatch edits one item on the same code path the PATCH endpoint uses.
//
// Straight onto updateMediaByID rather than through the handler, unlike importing and
// generating: the shared helper is already the whole of that endpoint's behaviour, so
// there is nothing a synthesized request would buy beyond a response shape this caller
// does not need.
func (s *Server) applyMediaPatch(w http.ResponseWriter, r *http.Request, id int64, patch mediaPatchReq) {
	if err := s.updateMediaByID(r, id, patch); errors.Is(err, sql.ErrNoRows) {
		writeErr(w, http.StatusNotFound, "that item is no longer in your library")
		return
	} else if err != nil {
		s.log.Error("libby action: update media", "media", id, "err", err)
		writeErr(w, http.StatusInternalServerError, "the change couldn't be saved")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok", "id": id})
}
