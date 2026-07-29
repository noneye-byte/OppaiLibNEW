package sources

import "embed"

// builtinSources are the source definitions compiled into the binary.
//
// They're embedded rather than shipped as sample files to copy because a source that
// only works once the operator has found and copied a YAML file is, for almost
// everyone, a source that does not work. Dropping a file with the same id into
// /config/sources overrides the built-in, so a site that restyles can be repaired
// without waiting for a release.
//
//go:embed builtin/*.yaml
var builtinSources embed.FS
