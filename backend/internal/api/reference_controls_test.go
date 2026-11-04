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

func TestAReferenceSquareRidesAlongAsControlNetsReferenceUnit(t *testing.T) {
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
}

func TestAFaceModelSetUpForHerCameraAlsoHoldsTheReferencesFace(t *testing.T) {
	var gen imagegen.GenerateRequest
	req := generateReq{Reference: tinyPNG(t), ReferenceWeight: 0.3}
	set := settings.Settings{LibbyFaceModule: "ip-adapter_face_id", LibbyFaceModel: "ip-adapter-faceid_sdxl"}
	if err := referenceControls(&req, &gen, set); err != nil {
		t.Fatal(err)
	}
	if len(gen.Controls) != 2 || gen.Controls[1].Model != "ip-adapter-faceid_sdxl" || gen.Controls[1].Weight != 0.6 {
		t.Fatalf("units = %+v", gen.Controls)
	}
}

func TestNoReferenceAddsNothingAndANonPictureIsRefused(t *testing.T) {
	var gen imagegen.GenerateRequest
	if err := referenceControls(&generateReq{}, &gen, settings.Settings{}); err != nil || len(gen.Controls) != 0 {
		t.Fatalf("err=%v units=%d", err, len(gen.Controls))
	}
	bad := generateReq{Reference: base64.StdEncoding.EncodeToString([]byte("not a picture at all"))}
	if err := referenceControls(&bad, &gen, settings.Settings{}); err == nil {
		t.Fatal("a reference that is not a picture was accepted")
	}
}
