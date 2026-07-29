//go:build windows

package api

import (
	"syscall"
	"unsafe"
)

// The Windows implementation exists so the project still builds and its tests still run
// on a development machine. The deployment target is a Linux container; nothing here is
// on the Unraid path.
var (
	kernel32           = syscall.NewLazyDLL("kernel32.dll")
	getDiskFreeSpaceEx = kernel32.NewProc("GetDiskFreeSpaceExW")
)

// freeBytes reports the space available to this process on the volume holding path.
//
// The first out-parameter of GetDiskFreeSpaceExW is "free bytes available to the
// caller", which is the quota-aware number — the equivalent of statfs's Bavail, and the
// one that reflects what a write can actually use.
func freeBytes(path string) (int64, error) {
	p, err := syscall.UTF16PtrFromString(path)
	if err != nil {
		return 0, err
	}
	var availableToCaller, totalBytes, totalFree uint64
	r, _, callErr := getDiskFreeSpaceEx.Call(
		uintptr(unsafe.Pointer(p)),
		uintptr(unsafe.Pointer(&availableToCaller)),
		uintptr(unsafe.Pointer(&totalBytes)),
		uintptr(unsafe.Pointer(&totalFree)),
	)
	if r == 0 {
		return 0, callErr
	}
	return int64(availableToCaller), nil
}

// diskSpace reports free and total bytes for the volume holding path.
func diskSpace(path string) (free, total int64, err error) {
	p, e := syscall.UTF16PtrFromString(path)
	if e != nil {
		return 0, 0, e
	}
	var availableToCaller, totalBytes, totalFree uint64
	r, _, callErr := getDiskFreeSpaceEx.Call(
		uintptr(unsafe.Pointer(p)),
		uintptr(unsafe.Pointer(&availableToCaller)),
		uintptr(unsafe.Pointer(&totalBytes)),
		uintptr(unsafe.Pointer(&totalFree)),
	)
	if r == 0 {
		return 0, 0, callErr
	}
	return int64(availableToCaller), int64(totalBytes), nil
}
