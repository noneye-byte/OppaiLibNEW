package api

import (
	"context"
	"strings"
	"testing"

	"github.com/youruser/oppailib/internal/imagegen"
)

func TestTheFolderCheckSaysWhichWayItFailed(t *testing.T) {
	if c := folderCheck(imagegen.A1111ModelsDir{}); c.OK || !strings.Contains(c.Detail, "/a1111-models") {
		t.Fatalf("unset: %+v", c)
	}
	if c := folderCheck(imagegen.A1111ModelsDir{Path: "/x", Problem: "/x is mounted read-only"}); c.OK || c.Detail != "/x is mounted read-only." {
		t.Fatalf("problem: %+v", c)
	}
	c := folderCheck(imagegen.A1111ModelsDir{Path: "/webui", Dir: "/webui/models", Writable: true})
	if !c.OK || !strings.Contains(c.Detail, "/webui/models") {
		t.Fatalf("resolved: %+v", c)
	}
}

func TestADownloadOffCivitaiIsRefusedBeforeItIsTried(t *testing.T) {
	c := civitaiDownloadCheck(context.Background(), "https://example.com/model.safetensors", "")
	if c.OK || !strings.Contains(c.Detail, "not on civitai.com") {
		t.Fatalf("check = %+v", c)
	}
}
