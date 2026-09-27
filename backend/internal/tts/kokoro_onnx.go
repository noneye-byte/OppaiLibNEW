//go:build onnx

package tts

import (
	"errors"
	"fmt"
	"runtime"

	ort "github.com/yalue/onnxruntime_go"

	"github.com/youruser/oppailib/internal/ortenv"
)

// kokoroRuntime says this build can run the model.
const kokoroRuntime = true

// ortKokoro is the model as an ONNX Runtime session.
type ortKokoro struct {
	session *ort.DynamicAdvancedSession
	// speedType is what the model takes its speed as: float in the published v1.0
	// exports, int in some earlier ones.
	speedType ort.TensorElementDataType
}

// newKokoroRunner opens the model, reading its input names rather than assuming them:
// the onnx-community export calls the phonemes input_ids and kokoro-onnx's calls them
// tokens, and both are otherwise the same network.
func newKokoroRunner(modelPath string) (kokoroRunner, error) {
	if err := ortenv.Init(); err != nil {
		return nil, fmt.Errorf("ONNX Runtime: %w", err)
	}
	inputs, outputs, err := ort.GetInputOutputInfo(modelPath)
	if err != nil {
		return nil, err
	}
	if len(inputs) != 3 || len(outputs) == 0 {
		return nil, fmt.Errorf("not a Kokoro model: %d inputs, %d outputs", len(inputs), len(outputs))
	}
	var ids, style, speed string
	var speedType ort.TensorElementDataType
	for _, in := range inputs {
		switch in.Name {
		case "input_ids", "tokens":
			ids = in.Name
		case "style", "ref_s":
			style = in.Name
		case "speed":
			speed, speedType = in.Name, in.DataType
		}
	}
	if ids == "" || style == "" || speed == "" {
		return nil, errors.New("not a Kokoro model: its inputs are not phonemes, style and speed")
	}
	opts, err := ort.NewSessionOptions()
	if err != nil {
		return nil, err
	}
	defer opts.Destroy()
	// Half the cores, at most eight: the box is also running a language model, the
	// library and whatever else, and past eight threads a model this small stops
	// getting faster.
	if err := opts.SetIntraOpNumThreads(min(max(runtime.NumCPU()/2, 1), 8)); err != nil {
		return nil, err
	}
	session, err := ort.NewDynamicAdvancedSession(modelPath, []string{ids, style, speed}, []string{outputs[0].Name}, opts)
	if err != nil {
		return nil, err
	}
	return &ortKokoro{session: session, speedType: speedType}, nil
}

func (m *ortKokoro) Run(ids []int64, style []float32, speed float32) ([]float32, error) {
	idsT, err := ort.NewTensor(ort.NewShape(1, int64(len(ids))), ids)
	if err != nil {
		return nil, err
	}
	defer idsT.Destroy()
	styleT, err := ort.NewTensor(ort.NewShape(1, int64(len(style))), style)
	if err != nil {
		return nil, err
	}
	defer styleT.Destroy()
	var speedT ort.Value
	switch m.speedType {
	case ort.TensorElementDataTypeInt32:
		t, err := ort.NewTensor(ort.NewShape(1), []int32{int32(speed + 0.5)})
		if err != nil {
			return nil, err
		}
		speedT = t
	case ort.TensorElementDataTypeDouble:
		t, err := ort.NewTensor(ort.NewShape(1), []float64{float64(speed)})
		if err != nil {
			return nil, err
		}
		speedT = t
	default:
		t, err := ort.NewTensor(ort.NewShape(1), []float32{speed})
		if err != nil {
			return nil, err
		}
		speedT = t
	}
	defer speedT.Destroy()
	outputs := []ort.Value{nil}
	if err := m.session.Run([]ort.Value{idsT, styleT, speedT}, outputs); err != nil {
		return nil, err
	}
	defer outputs[0].Destroy()
	wave, ok := outputs[0].(*ort.Tensor[float32])
	if !ok {
		return nil, errors.New("Kokoro returned something other than audio")
	}
	// Copied out: the tensor's memory goes with it when it is destroyed.
	return append([]float32(nil), wave.GetData()...), nil
}
