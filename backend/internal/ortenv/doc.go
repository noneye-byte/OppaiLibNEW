// Package ortenv starts ONNX Runtime once for the whole process.
//
// InitializeEnvironment may run only once per process, and two packages use the
// runtime: the tagger (internal/ai) and Kokoro, Libby's voice (internal/tts). Each
// guarding its own sync.Once meant whichever started second failed with "already
// initialized", so the one guard lives here. Only built with -tags onnx; without it
// the package is this comment.
package ortenv
