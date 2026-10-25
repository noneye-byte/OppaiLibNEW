package imagegen

import (
	"context"
	"errors"
	"os"
)

// CheckpointFile is where a checkpoint's file is, for something that needs the file
// itself rather than the generator's name for it — the LoRA trainer, which loads the
// weights it trains against.
type CheckpointFile struct {
	// Key is the file's path under the generator's models folder: A1111's key
	// ("Stable-diffusion/pony.safetensors"), InvokeAI's record path. A trainer that
	// mounts the same folder finds it by this.
	Key string
	// Size is the file's size in bytes, 0 when nothing here could tell.
	Size int64
	// Local is the file on this box, "" unless A1111's models folder is mounted here.
	Local string
}

// CheckpointFile finds a checkpoint by the name the studio picks it by.
func (c *Client) CheckpointFile(ctx context.Context, base, name string) (CheckpointFile, error) {
	kind, err := c.Backend(ctx, base)
	if err != nil {
		return CheckpointFile{}, err
	}
	if kind == KindInvokeAI {
		records, err := c.invokeModelList(ctx, base)
		if err != nil {
			return CheckpointFile{}, err
		}
		for _, r := range records {
			if r.Type == "main" && (r.Key == name || r.Name == name) && r.Path != "" {
				return CheckpointFile{Key: r.Path, Size: r.FileSize}, nil
			}
		}
		return CheckpointFile{}, errors.New("InvokeAI has no such checkpoint, or does not say where its file is")
	}
	files, err := c.a1111Files(ctx, base)
	if err != nil {
		return CheckpointFile{}, err
	}
	f, ok := a1111Find(files, name)
	if !ok || f.Type != a1111Checkpoints.Type {
		return CheckpointFile{}, errors.New("Automatic1111 has no such checkpoint")
	}
	out := CheckpointFile{Key: f.Key}
	if local := localPath(c.modelsDir(), f.Key); local != "" {
		if info, err := os.Stat(local); err == nil && !info.IsDir() {
			out.Local, out.Size = local, info.Size()
		}
	}
	return out, nil
}
