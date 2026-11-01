//go:build onnx

package matte

import (
	"errors"
	"fmt"

	ort "github.com/yalue/onnxruntime_go"
	"github.com/youruser/oppailib/internal/ortenv"
)

const built = true

// onnxRunner is the model's session. Names and the square's side are read off the
// graph, as the tagger reads its own: the reference export calls them "img" and
// "mask" at 1024, and another ISNet export need not.
type onnxRunner struct {
	session *ort.DynamicAdvancedSession
	s       int
}

func loadModel(path string) (runner, error) {
	if err := ortenv.Init(); err != nil {
		return nil, err
	}
	inputs, outputs, err := ort.GetInputOutputInfo(path)
	if err != nil {
		return nil, fmt.Errorf("inspect %s: %w", path, err)
	}
	if len(inputs) == 0 || len(outputs) == 0 {
		return nil, errors.New("the model has no inputs or outputs")
	}
	side := DefaultSide
	// [N, 3, H, W]; a dynamic side is -1 and keeps the default.
	if d := inputs[0].Dimensions; len(d) == 4 && d[2] > 0 && d[2] == d[3] {
		side = int(d[2])
	}
	sess, err := ort.NewDynamicAdvancedSession(path, []string{inputs[0].Name}, []string{outputs[0].Name}, nil)
	if err != nil {
		return nil, err
	}
	return &onnxRunner{session: sess, s: side}, nil
}

func (r *onnxRunner) side() int { return r.s }

func (r *onnxRunner) run(in []float32, side int) ([]float32, error) {
	input, err := ort.NewTensor(ort.NewShape(1, 3, int64(side), int64(side)), in)
	if err != nil {
		return nil, err
	}
	defer input.Destroy()
	output, err := ort.NewEmptyTensor[float32](ort.NewShape(1, 1, int64(side), int64(side)))
	if err != nil {
		return nil, err
	}
	defer output.Destroy()
	if err := r.session.Run([]ort.Value{input}, []ort.Value{output}); err != nil {
		return nil, err
	}
	out := make([]float32, side*side)
	copy(out, output.GetData())
	return out, nil
}
