//go:build !onnx

package ai

import (
	"errors"
	"log/slog"
)

// newOnnxTagger is a no-op in the default (cgo-free) build. Build with
// `-tags onnx` and mount the ONNX Runtime shared library to enable real
// inference. See docs/AI.md.
func newOnnxTagger(_ /*modelDir*/, _ /*device*/ string, _ *slog.Logger) (Tagger, error) {
	return nil, errors.New("built without onnx support (rebuild with -tags onnx)")
}
