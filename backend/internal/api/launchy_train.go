package api

import (
	"bytes"
	"context"
	"image"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/youruser/oppailib/internal/ai"
	"github.com/youruser/oppailib/internal/db"
)

// Launchy's LoRA capture sends a frame of each new scene of a game. It can ask for
// only the frames with someone in them (a character LoRA) or only the ones with
// nobody (a background LoRA): the launcher cannot tell a character from a place by
// its pixels, the tagger can. A frame that does not fit is turned away unstored, and
// one that does keeps what the tagger said, so the Train screen need not tag it again.
//
// Without a tagger that knows people — tagging off, or only the heuristic one — every
// frame is kept and the reply says it went unchecked.

// frameTagger is the part of the library's tagger the route uses; a test puts its own in.
type frameTagger interface {
	Enabled() bool
	TaggerName() string
	TagImage(ctx context.Context, img image.Image) ([]ai.Suggestion, error)
}

func (s *Server) loraTagger() frameTagger {
	if s.loraFrameTagger != nil {
		return s.loraFrameTagger
	}
	return s.ai
}

// loraFrameTagTimeout bounds one look by the tagger; past it the frame is kept unchecked.
const loraFrameTagTimeout = 60 * time.Second

// Tags that say a picture has someone in it, in the tagger's spelling (spaces, not underscores).
var loraPersonTag = regexp.MustCompile(`^(\d+\+?(girl|boy|other)s?|multiple (girls|boys|others)|solo|solo focus|male focus|female focus)$`)

// framePeople reads the tags for people: someone is there, or the tagger said "no humans".
func framePeople(sugs []ai.Suggestion) (someone, nobody bool) {
	for _, sg := range sugs {
		name := strings.ToLower(strings.TrimSpace(strings.ReplaceAll(sg.Name, "_", " ")))
		switch {
		case loraPersonTag.MatchString(name):
			someone = true
		case name == "no humans":
			nobody = true
		}
	}
	return someone, nobody
}

// frameFits says whether a frame is what was asked for, and why not when it is not.
func frameFits(want string, sugs []ai.Suggestion) (bool, string) {
	someone, nobody := framePeople(sugs)
	switch want {
	case "characters":
		if someone && !nobody {
			return true, ""
		}
		return false, "nobody in it"
	case "backgrounds":
		if nobody && !someone {
			return true, ""
		}
		if someone {
			return false, "someone in it"
		}
		return false, "not clearly a place with nobody in it"
	}
	return true, ""
}

func (s *Server) handleLaunchyTrainUpload(w http.ResponseWriter, r *http.Request) {
	set, ok := s.trainSetParam(w, r)
	if !ok {
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, trainMaxPictureBytes+(1<<20))
	if err := r.ParseMultipartForm(8 << 20); err != nil {
		writeErr(w, http.StatusBadRequest, "that picture is too large, or the upload was cut off")
		return
	}
	want := strings.TrimSpace(r.FormValue("want"))
	if want != "" && want != "characters" && want != "backgrounds" {
		writeErr(w, http.StatusBadRequest, "want is characters, backgrounds or nothing")
		return
	}
	file, _, err := r.FormFile("file")
	if err != nil {
		writeErr(w, http.StatusBadRequest, "missing 'file'")
		return
	}
	defer file.Close()
	data, err := io.ReadAll(io.LimitReader(file, trainMaxPictureBytes+1))
	if err != nil {
		writeErr(w, http.StatusBadRequest, "the upload was cut off")
		return
	}

	var sugs []ai.Suggestion
	checked := false
	if want != "" {
		tagger := s.loraTagger()
		if name := tagger.TaggerName(); tagger.Enabled() && name != "heuristic" && name != "none" {
			if len(data) > trainMaxPictureBytes {
				writeErr(w, http.StatusBadRequest, "that picture is too large to train on")
				return
			}
			img, _, err := image.Decode(bytes.NewReader(data))
			if err != nil {
				writeErr(w, http.StatusBadRequest, "can't read that picture: "+err.Error())
				return
			}
			ctx, cancel := context.WithTimeout(r.Context(), loraFrameTagTimeout)
			sugs, err = tagger.TagImage(ctx, img)
			cancel()
			if err != nil {
				s.log.Warn("launchy frame: tagger", "err", err)
				sugs = nil
			} else {
				checked = true
				if fits, why := frameFits(want, sugs); !fits {
					writeJSON(w, http.StatusOK, map[string]any{"skipped": why, "checked": true})
					return
				}
			}
		}
	}

	pic, existed, err := s.addTrainPicture(r.Context(), set.ID, data, r.FormValue("source"))
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	if checked && !existed && len(sugs) > 0 {
		tags := make([]db.TrainTag, 0, len(sugs))
		have := map[string]bool{}
		for _, sg := range sugs {
			if key := loraTagKey(sg.Name); key != "" && !have[key] {
				have[key] = true
				tags = append(tags, db.TrainTag{Name: sg.Name, Category: sg.Category, Source: "ai", Score: sg.Score})
			}
		}
		if err := s.db.SetTrainPictureTags(r.Context(), set.ID, pic.ID, tags); err != nil {
			s.log.Warn("launchy frame: keep tags", "err", err)
		}
	}
	status := http.StatusCreated
	if existed {
		status = http.StatusOK
	}
	writeJSON(w, status, map[string]any{"id": pic.ID, "existed": existed, "checked": checked})
}
