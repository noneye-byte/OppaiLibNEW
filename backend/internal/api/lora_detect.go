package api

import (
	"context"
	"errors"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/youruser/oppailib/internal/trainer"
)

// Finding the people in a comic panel, for a training set (views/lora-comic.ts).
//
// The browser cuts a page into panels and used to need a person to drag a box around
// the character in each one. The trainer can find them instead, with the person
// segmentation model ADetailer uses (trainer/detect.py): this sends it one panel and
// hands back each person's box and outline. The browser does the cutting — onto a
// plain background, at the panel's own resolution — and uploads the crops into the
// set the way a hand-cut one goes, so the picture passes through here only in memory.

// trainDetectMaxBytes bounds one panel; a whole page as a PNG is a few megabytes.
const trainDetectMaxBytes = 40 << 20

func (s *Server) handleTrainDetect(w http.ResponseWriter, r *http.Request) {
	base, token, ok := s.trainerSettings()
	if !ok {
		// 409, not 401: a 401 from any endpoint signs the web client out.
		writeErr(w, http.StatusConflict, "finding people needs the trainer — set its address under Settings → Image generation")
		return
	}
	data, err := io.ReadAll(http.MaxBytesReader(w, r.Body, trainDetectMaxBytes))
	if err != nil || len(data) == 0 {
		writeErr(w, http.StatusBadRequest, "send the picture, up to 40 MB")
		return
	}
	if loraPictureExt(data) == "" {
		writeErr(w, http.StatusBadRequest, "that isn't a picture the detector reads (PNG, JPEG, WebP or BMP)")
		return
	}
	conf, _ := strconv.ParseFloat(r.URL.Query().Get("conf"), 64)
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Minute)
	defer cancel()
	h, err := s.trainer.Health(ctx, base, token)
	if err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	if !h.Has(trainer.FeatureDetectPeople) {
		writeErr(w, http.StatusConflict, "this trainer can't find people yet — update the oppailib-trainer container")
		return
	}
	found, err := s.trainer.DetectPeople(ctx, base, token, data, conf)
	if err != nil {
		if errors.Is(err, context.Canceled) {
			return
		}
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, found)
}
