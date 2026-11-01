//go:build !onnx

package matte

import "errors"

// built is whether this binary can run the model at all.
const built = false

func loadModel(string) (runner, error) {
	return nil, errors.New("built without onnx support (rebuild with -tags onnx)")
}
