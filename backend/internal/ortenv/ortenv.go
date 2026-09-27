//go:build onnx

package ortenv

import (
	"os"
	"sync"

	ort "github.com/yalue/onnxruntime_go"
)

var (
	once sync.Once
	err  error
)

// Init points the binding at the shared library (ONNXRUNTIME_LIB_PATH, when set) and
// initializes the runtime, once. Every caller gets the first attempt's result.
func Init() error {
	once.Do(func() {
		if libPath := os.Getenv("ONNXRUNTIME_LIB_PATH"); libPath != "" {
			ort.SetSharedLibraryPath(libPath)
		}
		err = ort.InitializeEnvironment()
	})
	return err
}
