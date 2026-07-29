package api

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"

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
	// Kind is what will happen: "generate", "import", "tag", "favorite".
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
}

// actionTag captures a request to do something. Same tolerance as the other protocol
// tags — models paraphrase the syntax they are given — and unanchored, because an
// action naturally lands mid-paragraph where she offers it.
var actionTag = regexp.MustCompile(`(?i)\[\s*(?:do|action)\s*[:=-]?\s*([a-z]+)\s*[:|,-]?\s*([^\]\n]{0,400}?)\s*\]`)

// actionCapabilities says which actions are on the table for this request.
type actionCapabilities struct {
	Generate bool // image generation is configured
	Library  bool // there is a library to import into and tag
}

func libbyCapabilities(cur settings.Settings) actionCapabilities {
	return actionCapabilities{Generate: cur.ImageGenEnabled, Library: true}
}

// actionDirective tells her what she may ask to do.
//
// Only the capabilities that are actually wired up are described. A model told it can
// generate pictures on a server with no generator configured will offer to, and an
// offer that can only ever be declined by the machine is worse than never made.
//
// The "you are asking, not doing" framing is repeated because it is load-bearing for
// the writing rather than the security: the approval gate is enforced by the client
// regardless, but a character who believes she has already done the thing writes
// "done, it's in your library" over a card the user has not pressed yet.
func actionDirective(caps actionCapabilities) string {
	var lines []string
	if caps.Generate {
		lines = append(lines,
			"- [do: generate <what the picture shows>] — offer to make a picture. Describe the subject and setting in plain words; "+
				"the generator's model, style, and your own likeness are already configured, so do not write model names or settings.")
	}
	if caps.Library {
		lines = append(lines,
			"- [do: import <url>] — offer to add something at a web address to their library. Only a URL the user gave you.",
			"- [do: tag <title> | <tag, tag>] — offer to add tags to something in the library, named by its title.",
			"- [do: favorite <title>] — offer to favourite something in the library.")
	}
	if len(lines) == 0 {
		return ""
	}
	return "You can offer to do things for the user, by ending a sentence with one of these tags:\n" +
		strings.Join(lines, "\n") +
		"\n\nThese are requests, not actions. Writing the tag shows the user a card with an Allow button on it — nothing happens " +
		"until they press it. So offer in your own words and stop there: never say you have done it, never say it is finished or saved " +
		"or on its way, and never promise what the result will look like. Offer at most one thing per reply, only when it genuinely " +
		"follows from what you were talking about, and not in most replies. If they say no, let it go."

}

// parseLibbyActions pulls the action tags out of a reply, returning the cleaned text
// and the proposals.
//
// Tags are removed from the prose rather than substituted: unlike a link, which stands
// in for an item's name mid-sentence, an action tag is an aside about the app. The card
// beneath the message is what the user reads.
//
// Resolution of a title to a real row happens here, so an action naming something that
// is not in the library is dropped entirely. Handing a client a "tag that item" card
// that resolves to nothing would produce a button whose only possible outcome is an
// error, which is a worse answer than her simply not having offered.
func (s *Server) parseLibbyActions(ctx context.Context, reply string, caps actionCapabilities) (string, []libbyAction) {
	matches := actionTag.FindAllStringSubmatch(reply, -1)
	if len(matches) == 0 {
		return reply, nil
	}
	// Titles are ciphertext, so resolving them means decrypting a run of rows. Gather
	// the words from every action first and look the whole set up once.
	var words []string
	for _, match := range matches {
		if verb := strings.ToLower(match[1]); verb == "tag" || verb == "favorite" || verb == "favourite" {
			words = append(words, normalizeLookupWords(actionTitle(match[2]))...)
		}
	}
	var candidates []libraryCandidate
	if len(words) > 0 {
		candidates = s.libraryCandidates(ctx, words)
	}

	var actions []libbyAction
	for _, match := range matches {
		if len(actions) >= maxLibbyActions {
			break
		}
		action, ok := s.buildLibbyAction(strings.ToLower(match[1]), strings.TrimSpace(match[2]), caps, candidates)
		if !ok {
			continue
		}
		action.ID = randomID()
		actions = append(actions, action)
	}
	// Every tag comes out of the prose whether or not it produced a proposal: one we
	// could not act on is still not something the user should be made to read.
	text := strings.TrimSpace(actionTag.ReplaceAllString(reply, ""))
	if text == "" {
		text = reply
	}
	return text, actions
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
	}
	return libbyAction{}, false
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
	// doing the thing, rather than of the thing with her somewhere in it.
	prompt := subject
	if cur.LibbyGenPrompt != "" {
		prompt = cur.LibbyGenPrompt + ", " + subject
	}
	gen := generateReq{
		Prompt:         prompt,
		NegativePrompt: cur.LibbyGenNegativePrompt,
		Checkpoint:     cur.LibbyGenModel,
		Board:          cur.LibbyGenBoard,
		Count:          1,
	}
	if cur.LibbyGenLora != "" {
		weight := cur.LibbyGenLoraWeight
		if weight == 0 {
			weight = 1 // an unset strength means "on", not "off"
		}
		gen.Loras = []loraReq{{Name: cur.LibbyGenLora, Weight: weight}}
	}
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
	// Titled and tagged so it is findable later as something she made, rather than
	// landing in the library as another anonymous "Generated image".
	saved := s.delegate(r, s.handleImageGenSave, http.MethodPost, "/api/imagegen/save", genSaveReq{
		ID:    result.Images[0].ID,
		Title: libbyImageTitle(subject),
		Tags:  []string{"libby"},
	})
	relay(w, saved)
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
