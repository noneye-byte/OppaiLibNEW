//go:build !onnx

package tts

import "errors"

// kokoroRuntime says this build can run the model. The lean image has no ONNX
// Runtime, so it has no Kokoro and piper speaks.
const kokoroRuntime = false

func newKokoroRunner(string) (kokoroRunner, error) {
	return nil, errors.New("this build has no ONNX Runtime")
}
