//go:build !windows

package api

import "syscall"

// freeBytes reports the space available on the filesystem holding path.
//
// Bavail rather than Bfree: Bfree counts blocks reserved for root, which this process
// is not, so reporting it would promise room that a write cannot use.
func freeBytes(path string) (int64, error) {
	var st syscall.Statfs_t
	if err := syscall.Statfs(path, &st); err != nil {
		return 0, err
	}
	return int64(st.Bavail) * int64(st.Bsize), nil
}

// diskSpace reports free and total bytes for the filesystem holding path.
//
// Total is the *usable* size (Blocks, not Blocks minus the root reservation), which
// is what a "72% full" bar has to be drawn against for the number to match what
// Unraid itself shows for the same share.
func diskSpace(path string) (free, total int64, err error) {
	var st syscall.Statfs_t
	if err := syscall.Statfs(path, &st); err != nil {
		return 0, 0, err
	}
	return int64(st.Bavail) * int64(st.Bsize), int64(st.Blocks) * int64(st.Bsize), nil
}
