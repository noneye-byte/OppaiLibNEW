package imagegen

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func writeModel(t *testing.T, path, body string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte(body), 0o644); err != nil {
		t.Fatal(err)
	}
}

func readBack(t *testing.T, path string) string {
	t.Helper()
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("%s: %v", path, err)
	}
	return string(data)
}

// a1111Tree is an Automatic1111 models folder with one of everything.
func a1111Tree(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	writeModel(t, filepath.Join(dir, "Stable-diffusion", "pony.safetensors"), "checkpoint bytes")
	writeModel(t, filepath.Join(dir, "Stable-diffusion", "pony.json"), `{"sd version":"Pony"}`)
	writeModel(t, filepath.Join(dir, "Stable-diffusion", "pony.preview.png"), "cover")
	writeModel(t, filepath.Join(dir, "Stable-diffusion", "Put Checkpoint here.txt"), "placeholder")
	writeModel(t, filepath.Join(dir, "Lora", "styles", "ink.safetensors"), "lora bytes")
	writeModel(t, filepath.Join(dir, "VAE", "sdxl.safetensors"), "vae bytes")
	return dir
}

// comfyTree is ComfyUI's folders, empty, in places that share no parent.
func comfyTree(t *testing.T) ComfyFolders {
	t.Helper()
	return ComfyFolders{Checkpoints: t.TempDir(), Loras: t.TempDir(), VAEs: t.TempDir()}
}

func runToEnd(t *testing.T, c *Client, from, to TransferSide, kinds []string) TransferJob {
	t.Helper()
	ended := make(chan TransferJob, 1)
	if _, err := c.StartTransfer(from, to, kinds, func(j TransferJob) { ended <- j }); err != nil {
		t.Fatal(err)
	}
	select {
	case j := <-ended:
		return j
	case <-time.After(10 * time.Second):
		t.Fatal("the transfer never ended")
	}
	return TransferJob{}
}

func hashlessClient(t *testing.T) *Client {
	t.Helper()
	c := New()
	c.HashCachePath = filepath.Join(t.TempDir(), "hashes.json")
	return c
}

func TestEverythingReachesComfyUIWithWhatBelongsToIt(t *testing.T) {
	src := a1111Tree(t)
	dst := comfyTree(t)
	c := hashlessClient(t)
	job := runToEnd(t, c, A1111Side("a", "Automatic1111", src), ComfySide("b", "ComfyUI", dst), TransferKinds)
	if job.State != "done" || job.Done != 3 {
		t.Fatalf("job = %+v", job)
	}
	if got := readBack(t, filepath.Join(dst.Checkpoints, "pony.safetensors")); got != "checkpoint bytes" {
		t.Fatalf("checkpoint = %q", got)
	}
	if got := readBack(t, filepath.Join(dst.Loras, "styles", "ink.safetensors")); got != "lora bytes" {
		t.Fatalf("a LoRA in a subfolder keeps it: %q", got)
	}
	readBack(t, filepath.Join(dst.VAEs, "sdxl.safetensors"))
	readBack(t, filepath.Join(dst.Checkpoints, "pony.json"))
	readBack(t, filepath.Join(dst.Checkpoints, "pony.preview.png"))
	if _, err := os.Stat(filepath.Join(dst.Checkpoints, "Put Checkpoint here.txt")); err == nil {
		t.Fatal("a placeholder came across")
	}
}

func TestTheSourceIsNeverTouched(t *testing.T) {
	src := a1111Tree(t)
	c := hashlessClient(t)
	runToEnd(t, c, A1111Side("a", "A", src), ComfySide("b", "B", comfyTree(t)), TransferKinds)
	if got := readBack(t, filepath.Join(src, "Lora", "styles", "ink.safetensors")); got != "lora bytes" {
		t.Fatalf("source = %q", got)
	}
	if got := readBack(t, filepath.Join(src, "Stable-diffusion", "pony.json")); !strings.Contains(got, "Pony") {
		t.Fatalf("sidecar = %q", got)
	}
}

func TestRunningItAgainBringsNothingAcross(t *testing.T) {
	src := a1111Tree(t)
	dst := comfyTree(t)
	c := hashlessClient(t)
	from, to := A1111Side("a", "A", src), ComfySide("b", "B", dst)
	runToEnd(t, c, from, to, TransferKinds)
	plan, err := c.PlanTransfer(from, to, TransferKinds)
	if err != nil {
		t.Fatal(err)
	}
	if plan.Files != 0 || plan.Have != 3 || plan.Bytes != 0 {
		t.Fatalf("plan = %+v", plan)
	}
}

func TestAnotherFileByTheSameNameIsLeftAloneAndCounted(t *testing.T) {
	src := a1111Tree(t)
	dst := comfyTree(t)
	writeModel(t, filepath.Join(dst.Checkpoints, "pony.safetensors"), "a different, longer checkpoint entirely")
	c := hashlessClient(t)
	job := runToEnd(t, c, A1111Side("a", "A", src), ComfySide("b", "B", dst), TransferKinds)
	if job.Clashes != 1 {
		t.Fatalf("job = %+v", job)
	}
	if got := readBack(t, filepath.Join(dst.Checkpoints, "pony.safetensors")); !strings.Contains(got, "different") {
		t.Fatalf("overwrote what was there: %q", got)
	}
}

func TestOnlyTheKindsAskedForGo(t *testing.T) {
	src := a1111Tree(t)
	dst := comfyTree(t)
	c := hashlessClient(t)
	runToEnd(t, c, A1111Side("a", "A", src), ComfySide("b", "B", dst), []string{"loras"})
	if _, err := os.Stat(filepath.Join(dst.Checkpoints, "pony.safetensors")); err == nil {
		t.Fatal("a checkpoint came across")
	}
	readBack(t, filepath.Join(dst.Loras, "styles", "ink.safetensors"))
}

func TestAFolderWithNoHomeOnTheOtherSideIsSaidNotDropped(t *testing.T) {
	dst := comfyTree(t)
	dst.VAEs = ""
	plan, err := planTransfer(A1111Side("a", "A", a1111Tree(t)), ComfySide("b", "B", dst), TransferKinds)
	if err != nil {
		t.Fatal(err)
	}
	if len(plan.Missing) != 1 || plan.Missing[0] != "vae" {
		t.Fatalf("missing = %v", plan.Missing)
	}
}

func TestAFolderCannotBeTransferredToItself(t *testing.T) {
	src := a1111Tree(t)
	if _, err := planTransfer(A1111Side("a", "A", src), A1111Side("b", "B", src), TransferKinds); err == nil {
		t.Fatal("the same folder was accepted")
	}
}

func TestAFreshlyInstalledEmptyFolderIsAPlaceToGo(t *testing.T) {
	src, fresh := a1111Tree(t), t.TempDir()
	c := hashlessClient(t)
	job := runToEnd(t, c, A1111Side("a", "A", src), A1111Side("b", "Forge Neo", fresh), TransferKinds)
	if job.State != "done" {
		t.Fatalf("job = %+v", job)
	}
	readBack(t, filepath.Join(fresh, "Stable-diffusion", "pony.safetensors"))
	readBack(t, filepath.Join(fresh, "Lora", "styles", "ink.safetensors"))
}

func TestWanFilesStayBehindInComfyUI(t *testing.T) {
	src := ComfyFolders{Checkpoints: t.TempDir(), Loras: t.TempDir()}
	writeModel(t, filepath.Join(src.Checkpoints, "wan2.2_i2v_aio.safetensors"), "wan")
	writeModel(t, filepath.Join(src.Checkpoints, "pony.safetensors"), "pony")
	writeModel(t, filepath.Join(src.Loras, "lightx2v_high.safetensors"), "speed")
	plan, err := planTransfer(ComfySide("a", "A", src), A1111Side("b", "B", t.TempDir()), TransferKinds)
	if err != nil {
		t.Fatal(err)
	}
	if plan.Files != 1 {
		t.Fatalf("plan = %+v, want the one picture checkpoint", plan)
	}
}

func TestStoppingLeavesNothingHalfWritten(t *testing.T) {
	src := t.TempDir()
	writeModel(t, filepath.Join(src, "pony.safetensors"), strings.Repeat("x", 64))
	dst := t.TempDir()
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	item := transferItem{src: filepath.Join(src, "pony.safetensors"), dst: filepath.Join(dst, "pony.safetensors"), size: 64, companion: true}
	if _, err := placeFile(ctx, item, func(int64) {}); !errors.Is(err, context.Canceled) {
		t.Fatalf("err = %v", err)
	}
	entries, _ := os.ReadDir(dst)
	if len(entries) != 0 {
		t.Fatalf("left behind: %v", entries[0].Name())
	}
}

func TestAnUnsetFolderIsSaidBeforeAnythingStarts(t *testing.T) {
	if _, err := planTransfer(A1111Side("a", "Automatic1111", ""), ComfySide("b", "B", comfyTree(t)), TransferKinds); err == nil {
		t.Fatal("no folder was accepted")
	}
	if side := ComfySide("b", "ComfyUI", ComfyFolders{}); side.Problem == "" {
		t.Fatal("ComfyUI with no folders has no problem")
	}
}
