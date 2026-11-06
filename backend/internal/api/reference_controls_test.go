package api

import (
	"bytes"
	"encoding/base64"
	"image"
	"image/png"
	"testing"

	"github.com/youruser/oppailib/internal/imagegen"
	"github.com/youruser/oppailib/internal/settings"
)

func tinyPNG(t *testing.T) string {
	t.Helper()
	var buf bytes.Buffer
	if err := png.Encode(&buf, image.NewRGBA(image.Rect(0, 0, 4, 4))); err != nil {
		t.Fatal(err)
	}
	return "data:image/png;base64," + base64.StdEncoding.EncodeToString(buf.Bytes())
}

func TestTheWholeReferenceHoldsHerBuildOnlyMidRunAndWithThePromptWinning(t *testing.T) {
	var gen imagegen.GenerateRequest
	req := generateReq{Reference: tinyPNG(t), ReferenceWeight: 0.45}
	if err := referenceControls(&req, &gen, settings.Settings{}); err != nil {
		t.Fatal(err)
	}
	if len(gen.Controls) != 1 {
		t.Fatalf("units = %d, want only the reference", len(gen.Controls))
	}
	u := gen.Controls[0]
	if u.Module != "reference_only" || u.Model != "None" || u.Weight != 0.45 || len(u.Image) == 0 {
		t.Fatalf("unit = %+v", u)
	}
	// If either end of the run opens up to it, the pose or the clothes come back.
	if !u.PromptFirst || u.Start <= 0 || u.End <= 0 || u.End >= 1 {
		t.Fatalf("the build hold reaches the pose or the clothes: %+v", u)
	}
}

func TestTheCropOfHerHeadHoldsHerFaceToTheEndOfTheRun(t *testing.T) {
	var gen imagegen.GenerateRequest
	req := generateReq{Reference: tinyPNG(t), ReferenceWeight: 0.3, ReferenceFace: tinyPNG(t), ReferenceFaceWeight: 0.8}
	if err := referenceControls(&req, &gen, settings.Settings{}); err != nil {
		t.Fatal(err)
	}
	if len(gen.Controls) != 2 {
		t.Fatalf("units = %d, want the build and the face", len(gen.Controls))
	}
	u := gen.Controls[1]
	if u.Module != "reference_only" || u.Weight != 0.8 || u.PromptFirst || u.End != 0 || u.Start <= 0 {
		t.Fatalf("face unit = %+v", u)
	}
}

func TestAFaceModelSetUpForHerCameraReadsTheCropRatherThanTheWholePicture(t *testing.T) {
	var gen imagegen.GenerateRequest
	crop := tinyPNG(t)
	raw, _ := decodeDataImage(crop)
	req := generateReq{Reference: tinyPNG(t), ReferenceWeight: 0.3, ReferenceFace: crop, ReferenceFaceWeight: 0.8}
	set := settings.Settings{LibbyFaceModule: "ip-adapter_face_id", LibbyFaceModel: "ip-adapter-faceid_sdxl"}
	if err := referenceControls(&req, &gen, set); err != nil {
		t.Fatal(err)
	}
	if len(gen.Controls) != 3 {
		t.Fatalf("units = %+v", gen.Controls)
	}
	u := gen.Controls[2]
	if u.Model != "ip-adapter-faceid_sdxl" || u.Weight != 0.6 || !bytes.Equal(u.Image, raw) {
		t.Fatalf("face model unit = %+v", u)
	}
}

func TestAFaceModelFallsBackToTheWholeReferenceWithNoCrop(t *testing.T) {
	var gen imagegen.GenerateRequest
	req := generateReq{Reference: tinyPNG(t), ReferenceWeight: 0.3}
	set := settings.Settings{LibbyFaceModule: "ip-adapter_face_id", LibbyFaceModel: "ip-adapter-faceid_sdxl"}
	if err := referenceControls(&req, &gen, set); err != nil {
		t.Fatal(err)
	}
	if len(gen.Controls) != 2 || gen.Controls[1].Model != "ip-adapter-faceid_sdxl" {
		t.Fatalf("units = %+v", gen.Controls)
	}
}

func TestNoReferenceAddsNothingAndANonPictureIsRefused(t *testing.T) {
	var gen imagegen.GenerateRequest
	if err := referenceControls(&generateReq{}, &gen, settings.Settings{}); err != nil || len(gen.Controls) != 0 {
		t.Fatalf("err=%v units=%d", err, len(gen.Controls))
	}
	notPicture := base64.StdEncoding.EncodeToString([]byte("not a picture at all"))
	if err := referenceControls(&generateReq{Reference: notPicture}, &gen, settings.Settings{}); err == nil {
		t.Fatal("a reference that is not a picture was accepted")
	}
	if err := referenceControls(&generateReq{ReferenceFace: notPicture}, &gen, settings.Settings{}); err == nil {
		t.Fatal("a face crop that is not a picture was accepted")
	}
}
