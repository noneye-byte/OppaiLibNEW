package api

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"
)

// What they thought of a picture she sent.
//
// A heart on a picture used to be an emoji on a message: she was told about it on the
// next turn and then it was gone. Rating a picture of hers now says something that
// lasts. It nudges the weight of every tag the picture carries — the same per-tag
// weights the user can set by hand in the gallery (chat_send_weights.go) — so what she
// reaches for, what the camera prefers between two good candidates, and what she is
// told they love in her pictures all lean towards it. The nudges are small and bounded:
// a dozen hearts make a tag "often", never "always", and no rating makes one "never";
// that dial stays the user's to turn by hand.

// ratingFactor is how much one rating moves each of a picture's tags.
var ratingFactor = map[string]float64{"love": 1.18, "like": 1.07, "dislike": 0.82}

// The band ratings can push a tag within.
const (
	ratedFloor   = sendWeightRarely
	ratedCeiling = sendWeightOften
)

// rateTags applies a change of rating to the weights: the old rating's nudge is taken
// back and the new one's applied, so changing a heart to a thumbs-down is one step, not
// two that stack.
func rateTags(weights map[string]float64, tags []string, from, to string) map[string]float64 {
	if weights == nil {
		weights = map[string]float64{}
	}
	undo, redo := ratingFactor[from], ratingFactor[to]
	for _, tag := range tags {
		key := sendWeightKey(tag)
		if key == "" || key == libbyIdentityTag || key == "libby" || strings.Contains(key, ":") {
			continue
		}
		w, ok := weights[key]
		if !ok {
			w = sendWeightNormal
		}
		if undo > 0 {
			w /= undo
		}
		if redo > 0 {
			w *= redo
		}
		w = clampFloat(w, ratedFloor, ratedCeiling)
		if w > 0.97 && w < 1.03 {
			delete(weights, key)
			continue
		}
		weights[key] = w
	}
	return weights
}

type rateReq struct {
	Rating string `json:"rating"`
}

// handleRateLibbyPhoto is POST /api/libby/photos/{id}/rate.
func (s *Server) handleRateLibbyPhoto(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	id := r.PathValue("id")
	var req rateReq
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<10)).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid rating")
		return
	}
	if _, known := ratingFactor[req.Rating]; !known && req.Rating != "" {
		writeErr(w, http.StatusBadRequest, "a rating is love, like, dislike, or nothing")
		return
	}
	s.chatMu.Lock()
	defer s.chatMu.Unlock()
	ws, err := s.readChatWorkspace(u.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "chat workspace unreadable")
		return
	}
	for i := range ws.Images {
		img := &ws.Images[i]
		if img.ID != id {
			continue
		}
		if !isSelfPicture(*img) {
			writeErr(w, http.StatusBadRequest, "only pictures of her can be rated")
			return
		}
		ws.SendWeights = normalizeSendWeights(rateTags(ws.SendWeights, img.Tags, img.Rating, req.Rating))
		img.Rating = req.Rating
		if err := s.writeChatWorkspace(u.ID, ws); err != nil {
			writeErr(w, http.StatusInternalServerError, "couldn't save the rating")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"image": *img, "sendWeights": ws.SendWeights})
		return
	}
	writeErr(w, http.StatusNotFound, "no such picture")
}

// handleKeepLibbyPhoto is POST /api/libby/photos/{id}/keep: the picture goes into the
// library as well, filed as a picture of her, and remembers where it went.
func (s *Server) handleKeepLibbyPhoto(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	id := r.PathValue("id")
	raw, meta, err := s.chatImageRaw(u.ID, id)
	if err != nil {
		writeErr(w, http.StatusNotFound, "no such picture")
		return
	}
	if meta.Kept > 0 {
		writeJSON(w, http.StatusOK, map[string]any{"id": meta.Kept})
		return
	}
	if strings.HasPrefix(meta.MIME, "video/") {
		writeErr(w, http.StatusBadRequest, "clips stay in the chat for now")
		return
	}
	prompt, negative, seed := "", "", int64(0)
	if meta.Gen != nil {
		prompt, negative, seed = meta.Gen.Prompt, meta.Gen.Negative, meta.Gen.Seed
	}
	preview := s.genCache.put(&genPreview{data: raw, prompt: prompt, negative: negative, seed: seed})
	kept := s.saveGeneratedToLibrary(r, preview, firstNonEmpty(meta.Name, "Libby"), meta.Tags)
	if kept == 0 {
		writeErr(w, http.StatusBadGateway, "couldn't add it to the library")
		return
	}
	s.chatMu.Lock()
	if ws, err := s.readChatWorkspace(u.ID); err == nil {
		for i := range ws.Images {
			if ws.Images[i].ID == id {
				ws.Images[i].Kept = kept
			}
		}
		_ = s.writeChatWorkspace(u.ID, ws)
	}
	s.chatMu.Unlock()
	writeJSON(w, http.StatusOK, map[string]any{"id": kept})
}
