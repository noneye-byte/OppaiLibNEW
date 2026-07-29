// Package buildinfo exposes the running binary's version so a deployment can be
// verified at runtime. This exists because OppaiLib ships as a Docker image and
// the #1 support question is "am I actually running the build with my fix?" —
// /api/health now answers it, and the server logs it at startup.
package buildinfo

import "runtime/debug"

// Version is stamped at build time via:
//
//	-ldflags "-X github.com/youruser/oppailib/internal/buildinfo.Version=<tag>"
//
// (see the Dockerfile). It stays "dev" for a plain `go build`.
var Version = "dev"

// Revision returns the VCS commit embedded by the Go toolchain when the build
// happens inside a git checkout. In the Docker build the source is copied
// without .git, so this is usually empty there and Version carries the identity.
func Revision() string {
	info, ok := debug.ReadBuildInfo()
	if !ok {
		return ""
	}
	for _, s := range info.Settings {
		if s.Key == "vcs.revision" {
			if len(s.Value) > 12 {
				return s.Value[:12]
			}
			return s.Value
		}
	}
	return ""
}

// String is the human-readable build identity: the stamped version, suffixed
// with the git revision when both are available.
func String() string {
	rev := Revision()
	switch {
	case Version == "dev" && rev != "":
		return "dev+" + rev
	case rev != "" && rev != Version:
		return Version + " (" + rev + ")"
	default:
		return Version
	}
}
