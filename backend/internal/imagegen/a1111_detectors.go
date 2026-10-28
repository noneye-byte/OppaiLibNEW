package imagegen

import (
	"archive/zip"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path"
	"path/filepath"
	"sort"
	"strings"
)

// ADetailer's detectors, as files.
//
// ADetailer finds what to redo with YOLO models it reads from models/adetailer — it
// scans that folder for ".pt" files and nothing else, once, when A1111 starts. The
// catalogue's detectors almost all arrive as a ".zip" holding one or several of them
// ("Eyes.pt", or an all-in-one set of six), and a zip dropped into the folder is a
// file ADetailer never looks at: the install looked finished and no detector ever
// appeared. So an archive installed into the detector folder is unpacked there, its
// ".pt" files kept and the rest (readmes, sample pictures) left out.

// detectorExt is the one extension ADetailer loads a detector from.
const detectorExt = ".pt"

// Archives are the catalogue's, but nothing stops one being a zip bomb; a detector
// is tens of megabytes, the biggest YOLO a few hundred.
const (
	maxDetectorFile    = 1 << 30
	maxDetectorArchive = 4 << 30
)

// unpackedDetector is one detector taken out of an archive.
type unpackedDetector struct {
	Name   string
	SHA256 string
	// Existed is a file of the same name already in the folder, which is kept rather
	// than overwritten: it may be one somebody tuned, and the archive's is no newer
	// for having been downloaded second.
	Existed bool
}

// unpackDetectors writes the ".pt" files in archive into dir, flattened to their
// file names, and returns them in the archive's order. An archive with none is an
// error: it was not a detector, whatever the catalogue filed it as.
func unpackDetectors(archive, dir string) ([]unpackedDetector, error) {
	zr, err := zip.OpenReader(archive)
	if err != nil {
		return nil, fmt.Errorf("the download is not an archive that can be opened: %w", err)
	}
	defer zr.Close()
	var out []unpackedDetector
	seen := map[string]bool{}
	var total int64
	for _, f := range zr.File {
		if f.FileInfo().IsDir() || !strings.EqualFold(path.Ext(f.Name), detectorExt) {
			continue
		}
		// macOS archives carry "__MACOSX/._Eyes.pt" resource forks beside the real
		// file; they end in .pt and are not models.
		base := path.Base(strings.ReplaceAll(f.Name, "\\", "/"))
		if strings.HasPrefix(base, "._") || strings.Contains(f.Name, "__MACOSX") {
			continue
		}
		name := safeFileName(base)
		if name == "" || seen[strings.ToLower(name)] {
			continue
		}
		seen[strings.ToLower(name)] = true
		if f.UncompressedSize64 > maxDetectorFile {
			return out, fmt.Errorf("%s in the archive is too big to be a detector", name)
		}
		total += int64(f.UncompressedSize64)
		if total > maxDetectorArchive {
			return out, errors.New("the archive unpacks to more than any set of detectors would")
		}
		target := filepath.Join(dir, name)
		if _, err := os.Stat(target); err == nil {
			out = append(out, unpackedDetector{Name: name, Existed: true})
			continue
		}
		sum, err := unpackOne(f, target)
		if err != nil {
			return out, fmt.Errorf("couldn't unpack %s: %w", name, err)
		}
		out = append(out, unpackedDetector{Name: name, SHA256: sum})
	}
	if len(out) == 0 {
		return nil, errors.New("the archive holds no .pt detector for ADetailer")
	}
	return out, nil
}

// unpackOne writes one archive entry beside its target and renames it into place
// once whole, hashing it on the way.
func unpackOne(f *zip.File, target string) (string, error) {
	rc, err := f.Open()
	if err != nil {
		return "", err
	}
	defer rc.Close()
	part := target + ".part"
	out, err := os.Create(part)
	if err != nil {
		return "", err
	}
	sum := sha256.New()
	// The size in the header is the archive's claim; the copy is held to it.
	_, copyErr := io.Copy(io.MultiWriter(out, sum), io.LimitReader(rc, maxDetectorFile+1))
	closeErr := out.Close()
	if copyErr == nil {
		copyErr = closeErr
	}
	if copyErr == nil {
		if st, err := os.Stat(part); err == nil && st.Size() > maxDetectorFile {
			copyErr = errors.New("it is bigger than its archive said")
		}
	}
	if copyErr != nil {
		_ = os.Remove(part)
		return "", copyErr
	}
	if err := os.Rename(part, target); err != nil {
		_ = os.Remove(part)
		return "", err
	}
	return hex.EncodeToString(sum.Sum(nil)), nil
}

// DetectorFile is one detector in ADetailer's folder.
type DetectorFile struct {
	// Name is the file name, which is what ADetailer lists it as and a pass names.
	Name string `json:"name"`
	// Key is its path under the models folder ("adetailer/Eyes.pt"), what the
	// catalogue's link is kept under.
	Key  string `json:"key"`
	Size int64  `json:"size"`
}

// A1111DetectorFiles lists the detectors in the models folder's adetailer folder,
// searched the way ADetailer searches it (subfolders too). Nil, not an error, when
// the folder is not there yet — no detector has been added.
func (c *Client) A1111DetectorFiles() ([]DetectorFile, error) {
	dir := c.modelsDir()
	if dir == "" {
		return nil, ErrNoModelsDir
	}
	root, ok := findSubfolder(dir, a1111DetectorFolder)
	if !ok {
		return nil, nil
	}
	var out []DetectorFile
	err := filepath.WalkDir(root, func(p string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() || !strings.EqualFold(filepath.Ext(p), detectorExt) {
			return nil
		}
		info, err := d.Info()
		if err != nil {
			return nil
		}
		rel, _ := filepath.Rel(root, p)
		out = append(out, DetectorFile{
			Name: d.Name(),
			Key:  a1111DetectorFolder.Folder + "/" + filepath.ToSlash(rel),
			Size: info.Size(),
		})
		return nil
	})
	sort.Slice(out, func(i, j int) bool { return strings.ToLower(out[i].Name) < strings.ToLower(out[j].Name) })
	return out, err
}

// A1111DeleteDetector removes a detector file and the cover and description the
// catalogue gave it. ADetailer keeps listing it until A1111 restarts.
func (c *Client) A1111DeleteDetector(key string) error {
	dir, err := c.requireModelsDir()
	if err != nil {
		return err
	}
	if !strings.HasPrefix(key, a1111DetectorFolder.Folder+"/") || !strings.EqualFold(path.Ext(key), detectorExt) {
		return errors.New("not a detector")
	}
	local := localPath(dir, key)
	if err := removeSoon(local); err != nil {
		if os.IsNotExist(err) {
			return fmt.Errorf("the models folder has no %s", key)
		}
		return err
	}
	s := stem(local)
	for _, side := range append([]string{".json", ".civitai.info"}, previewExts...) {
		_ = os.Remove(s + side)
	}
	c.hashes().forget(local)
	return nil
}
