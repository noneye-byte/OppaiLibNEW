package imagegen

import (
	"bufio"
	"bytes"
	"crypto/sha1"
	"encoding/base64"
	"encoding/binary"
	"encoding/hex"
	"errors"
	"fmt"
	"hash/crc32"
	"image"
	"image/jpeg"
	_ "image/png"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"golang.org/x/image/draw"
	_ "golang.org/x/image/webp"
)

// Automatic1111's gallery.
//
// A1111 has no gallery API: what it keeps of a generation is the file it wrote into
// its outputs folder (outputs/txt2img-images/2026-10-25/00012-1234.png and so on),
// with the settings as the PNG's "parameters" text. So the gallery here is that
// folder read from disk, the way model management is the models folder — each
// folder directly inside outputs is a board, and "none" is every picture in all of
// them. The folder is found from a setting, a mount at /a1111-outputs, or beside the
// models folder (the webui's own layout), so a box with A1111's whole directory
// mounted needs nothing set.
//
// An image's name is its path under outputs, base64url'd: a path has slashes, and a
// slash in one URL segment is something a reverse proxy in front of the server may
// decode and route on.

// a1111OutputsMount is where the Unraid template maps A1111's outputs folder.
const a1111OutputsMount = "/a1111-outputs"

// a1111ListTTL is how long one walk of the outputs folder answers listings. A folder
// of thousands of pictures takes a moment to walk, and paging through it, or sorting
// it, should not walk it again each time.
const a1111ListTTL = 15 * time.Second

// a1111ThumbWidth is the long side of a gallery thumbnail.
const a1111ThumbWidth = 320

// ErrNoOutputsDir is the gallery on an A1111 box whose outputs folder is not visible.
var ErrNoOutputsDir = errors.New("Automatic1111 has no gallery API — map its outputs folder into the container at /a1111-outputs, or set where it is under Settings → Image generation")

var a1111ImageExt = map[string]bool{".png": true, ".jpg": true, ".jpeg": true, ".webp": true}

type outputFile struct {
	rel   string // slash-separated, under outputs
	size  int64
	mtime time.Time
}

type a1111Listing struct {
	root  string
	at    time.Time
	files []outputFile
}

type a1111GalleryState struct {
	mu   sync.Mutex
	last *a1111Listing
}

// a1111OutputFolders are the folders A1111 writes into inside outputs, by which an
// outputs folder is recognised when it was mounted under some other name.
var a1111OutputFolders = a1111Folder{"outputs", "txt2img-images", []string{"txt2img-images", "img2img-images", "txt2img-grids", "img2img-grids", "extras-images"}}

// a1111OutputsFolder is the outputs folder inside the webui's own folder.
var a1111OutputsFolder = a1111Folder{"outputs", "outputs", []string{"outputs"}}

// A1111OutputsDir is the outputs folder this process can read, "" when there is
// none. The setting wins, then the mount, then outputs beside the models folder,
// then any folder mounted into the container that A1111 has written into.
func (c *Client) A1111OutputsDir() string {
	dir, _ := c.locateOutputs()
	return dir
}

// A1111OutputsProblem is why there is no gallery, in words for the operator: the
// folder that is set and is not there, or that nothing was set or found.
func (c *Client) A1111OutputsProblem() string {
	if dir, problem := c.locateOutputs(); dir == "" {
		return problem
	}
	return ""
}

func (c *Client) locateOutputs() (dir, problem string) {
	setting := ""
	if c.OutputsDir != nil {
		setting = strings.TrimSpace(c.OutputsDir())
	}
	if setting != "" {
		if dir = resolveOutputsDir(setting); dir != "" {
			return dir, ""
		}
		problem = fmt.Sprintf("the outputs folder set under Settings → Image generation, %s, is not a folder this container can see — it is the path inside the container, not the host's", setting)
	}
	if dir = resolveOutputsDir(a1111OutputsMount); dir != "" {
		return dir, ""
	}
	if models := c.modelsDir(); models != "" {
		if dir = resolveOutputsDir(filepath.Join(filepath.Dir(models), "outputs")); dir != "" {
			return dir, ""
		}
	}
	if dir = discoverOutputsMount(); dir != "" {
		return dir, ""
	}
	if problem == "" {
		problem = ErrNoOutputsDir.Error()
	}
	return "", problem
}

// resolveOutputsDir is the outputs folder a path stands for, "" when it is not a
// folder: the path itself, or the outputs folder inside it when it is the webui's
// own folder — the one an operator who mapped "the A1111 folder" would type.
func resolveOutputsDir(p string) string {
	info, err := os.Stat(p)
	if err != nil || !info.IsDir() {
		return ""
	}
	if inner, ok := findSubfolder(p, a1111OutputsFolder); ok && !holdsOutputFolders(p) {
		return inner
	}
	return p
}

// holdsOutputFolders says whether A1111 has written into this folder as an outputs
// folder: one of its txt2img-images and the like is directly inside.
func holdsOutputFolders(p string) bool {
	_, ok := findSubfolder(p, a1111OutputFolders)
	return ok
}

var discoveredOutputs = struct {
	sync.Mutex
	dir string
	at  time.Time
}{}

// discoverOutputsMount looks through the container's mounts for A1111's outputs
// folder, for the operator who mapped it somewhere other than /a1111-outputs and
// left the setting blank: a mount that A1111 has written into, or a webui folder
// with such an outputs folder inside.
func discoverOutputsMount() string {
	discoveredOutputs.Lock()
	defer discoveredOutputs.Unlock()
	if time.Since(discoveredOutputs.at) < 30*time.Second {
		return discoveredOutputs.dir
	}
	discoveredOutputs.at = time.Now()
	discoveredOutputs.dir = ""
	data, err := os.ReadFile(a1111MountInfo)
	if err != nil {
		return ""
	}
	for _, mp := range mountPoints(string(data)) {
		if mp == "/" || mp == "" || systemMount(mp) {
			continue
		}
		if holdsOutputFolders(mp) {
			discoveredOutputs.dir = mp
			return mp
		}
		if inner, ok := findSubfolder(mp, a1111OutputsFolder); ok && holdsOutputFolders(inner) {
			discoveredOutputs.dir = inner
			return inner
		}
	}
	return ""
}

func (c *Client) a1111Outputs() (string, error) {
	dir, problem := c.locateOutputs()
	if dir != "" {
		return dir, nil
	}
	if problem == ErrNoOutputsDir.Error() {
		return "", ErrNoOutputsDir
	}
	return "", fmt.Errorf("%w (%s)", ErrNoOutputsDir, problem)
}

// outputFiles walks the outputs folder, or answers from the last walk while it is fresh.
func (c *Client) outputFiles(root string, fresh bool) ([]outputFile, error) {
	st := c.a1111Gallery()
	st.mu.Lock()
	defer st.mu.Unlock()
	if !fresh && st.last != nil && st.last.root == root && time.Since(st.last.at) < a1111ListTTL {
		return st.last.files, nil
	}
	var files []outputFile
	err := filepath.WalkDir(root, func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			// An unreadable subfolder costs its pictures, not the whole gallery.
			if d != nil && d.IsDir() && p != root {
				return fs.SkipDir
			}
			return err
		}
		if d.IsDir() {
			if p != root && strings.HasPrefix(d.Name(), ".") {
				return fs.SkipDir
			}
			return nil
		}
		if !a1111ImageExt[strings.ToLower(filepath.Ext(d.Name()))] {
			return nil
		}
		info, err := d.Info()
		if err != nil {
			return nil
		}
		rel, err := filepath.Rel(root, p)
		if err != nil {
			return nil
		}
		files = append(files, outputFile{rel: filepath.ToSlash(rel), size: info.Size(), mtime: info.ModTime()})
		return nil
	})
	if err != nil {
		return nil, err
	}
	st.last = &a1111Listing{root: root, at: time.Now(), files: files}
	return files, nil
}

func (c *Client) a1111Gallery() *a1111GalleryState {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.gallery == nil {
		c.gallery = &a1111GalleryState{}
	}
	return c.gallery
}

// forget drops the cached walk, after a delete.
func (st *a1111GalleryState) forget() {
	st.mu.Lock()
	st.last = nil
	st.mu.Unlock()
}

// a1111Board is the board a file is on: the folder directly inside outputs.
func a1111Board(rel string) string {
	if i := strings.IndexByte(rel, '/'); i > 0 {
		return rel[:i]
	}
	return ""
}

// a1111BoardName is how a folder reads as a board.
func a1111BoardName(dir string) string {
	switch dir {
	case "txt2img-images":
		return "Text to image"
	case "img2img-images":
		return "Image to image"
	case "txt2img-grids":
		return "Text to image grids"
	case "img2img-grids":
		return "Image to image grids"
	case "extras-images":
		return "Extras"
	case "":
		return "Loose files"
	}
	return dir
}

func (c *Client) a1111Boards() ([]Board, error) {
	root, err := c.a1111Outputs()
	if err != nil {
		return nil, err
	}
	files, err := c.outputFiles(root, true)
	if err != nil {
		return nil, err
	}
	counts := map[string]int{}
	for _, f := range files {
		counts[a1111Board(f.rel)]++
	}
	out := []Board{{ID: "none", Name: "All pictures", Count: len(files)}}
	dirs := make([]string, 0, len(counts))
	for d := range counts {
		dirs = append(dirs, d)
	}
	sort.Strings(dirs)
	for _, d := range dirs {
		id := d
		if id == "" {
			id = "."
		}
		out = append(out, Board{ID: id, Name: a1111BoardName(d), Count: counts[d]})
	}
	return out, nil
}

// GallerySorts are the orders a listing can come back in. InvokeAI's API sorts by
// date only; the A1111 folder can be sorted any way a file can.
var GallerySorts = []string{"newest", "oldest", "name", "largest"}

// sortA1111Files orders a listing in place.
func sortA1111Files(files []outputFile, order string) {
	switch order {
	case "oldest":
		sort.SliceStable(files, func(i, j int) bool {
			if !files[i].mtime.Equal(files[j].mtime) {
				return files[i].mtime.Before(files[j].mtime)
			}
			return files[i].rel < files[j].rel
		})
	case "name":
		sort.SliceStable(files, func(i, j int) bool {
			return strings.ToLower(filepath.Base(files[i].rel)) < strings.ToLower(filepath.Base(files[j].rel))
		})
	case "largest":
		sort.SliceStable(files, func(i, j int) bool { return files[i].size > files[j].size })
	default:
		sort.SliceStable(files, func(i, j int) bool {
			if !files[i].mtime.Equal(files[j].mtime) {
				return files[i].mtime.After(files[j].mtime)
			}
			return files[i].rel > files[j].rel
		})
	}
}

func (c *Client) a1111BoardImages(boardID, order string, offset, limit int) (*GalleryPage, error) {
	root, err := c.a1111Outputs()
	if err != nil {
		return nil, err
	}
	all, err := c.outputFiles(root, offset == 0)
	if err != nil {
		return nil, err
	}
	files := make([]outputFile, 0, len(all))
	for _, f := range all {
		b := a1111Board(f.rel)
		if b == "" {
			b = "."
		}
		if boardID == "" || boardID == "none" || boardID == b {
			files = append(files, f)
		}
	}
	sortA1111Files(files, order)
	page := &GalleryPage{Items: []GalleryImage{}, Total: len(files)}
	if offset >= len(files) {
		return page, nil
	}
	end := min(offset+limit, len(files))
	for _, f := range files[offset:end] {
		img := GalleryImage{
			Name: a1111ImageName(f.rel), Label: filepath.Base(f.rel), Size: f.size,
			Created: f.mtime.UTC().Format(time.RFC3339),
		}
		// The header alone, not the picture: forty of these per page is cheap.
		if fh, err := os.Open(filepath.Join(root, filepath.FromSlash(f.rel))); err == nil {
			if cfg, _, err := image.DecodeConfig(bufio.NewReader(fh)); err == nil {
				img.Width, img.Height = cfg.Width, cfg.Height
			}
			fh.Close()
		}
		page.Items = append(page.Items, img)
	}
	return page, nil
}

func a1111ImageName(rel string) string {
	return base64.RawURLEncoding.EncodeToString([]byte(rel))
}

// a1111ImagePath turns a name back into a file under the outputs folder, refusing
// anything that is not a picture inside it.
func (c *Client) a1111ImagePath(name string) (root, rel, full string, err error) {
	root, err = c.a1111Outputs()
	if err != nil {
		return "", "", "", err
	}
	raw, err := base64.RawURLEncoding.DecodeString(name)
	if err != nil {
		return "", "", "", errors.New("no such picture")
	}
	rel = filepath.ToSlash(filepath.Clean(string(raw)))
	if rel == "." || strings.HasPrefix(rel, "../") || rel == ".." || filepath.IsAbs(rel) || strings.HasPrefix(rel, "/") ||
		!a1111ImageExt[strings.ToLower(filepath.Ext(rel))] {
		return "", "", "", errors.New("no such picture")
	}
	full = filepath.Join(root, filepath.FromSlash(rel))
	if back, err := filepath.Rel(root, full); err != nil || strings.HasPrefix(back, "..") {
		return "", "", "", errors.New("no such picture")
	}
	return root, rel, full, nil
}

func (c *Client) a1111GalleryImage(name string, thumb bool) ([]byte, string, error) {
	_, _, full, err := c.a1111ImagePath(name)
	if err != nil {
		return nil, "", err
	}
	info, err := os.Stat(full)
	if err != nil {
		return nil, "", errors.New("that picture is no longer in the outputs folder")
	}
	if !thumb {
		data, err := os.ReadFile(full)
		return data, "", err
	}
	// Thumbnails are made once and kept, keyed by the file as it is now, so a picture
	// written over under the same name gets a new one.
	sum := sha1.Sum([]byte(fmt.Sprintf("%s|%d|%d", full, info.Size(), info.ModTime().UnixNano())))
	key := hex.EncodeToString(sum[:])
	if c.ThumbCacheDir != "" {
		if data, err := os.ReadFile(filepath.Join(c.ThumbCacheDir, key+".jpg")); err == nil {
			return data, "image/jpeg", nil
		}
	}
	data, err := a1111Thumb(full)
	if err != nil {
		return nil, "", err
	}
	if c.ThumbCacheDir != "" {
		if err := os.MkdirAll(c.ThumbCacheDir, 0o700); err == nil {
			_ = os.WriteFile(filepath.Join(c.ThumbCacheDir, key+".jpg"), data, 0o600)
		}
	}
	return data, "image/jpeg", nil
}

func a1111Thumb(path string) ([]byte, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	src, _, err := image.Decode(bufio.NewReader(f))
	if err != nil {
		return nil, fmt.Errorf("can't read that picture: %w", err)
	}
	b := src.Bounds()
	w, h := b.Dx(), b.Dy()
	if w > a1111ThumbWidth || h > a1111ThumbWidth {
		if w >= h {
			w, h = a1111ThumbWidth, max(1, h*a1111ThumbWidth/w)
		} else {
			w, h = max(1, w*a1111ThumbWidth/h), a1111ThumbWidth
		}
	}
	dst := image.NewRGBA(image.Rect(0, 0, w, h))
	draw.ApproxBiLinear.Scale(dst, dst.Bounds(), src, b, draw.Src, nil)
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, dst, &jpeg.Options{Quality: 80}); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func (c *Client) a1111ImageMetadata(name string) (*ImageMetadata, error) {
	_, _, full, err := c.a1111ImagePath(name)
	if err != nil {
		return nil, err
	}
	f, err := os.Open(full)
	if err != nil {
		return nil, errors.New("that picture is no longer in the outputs folder")
	}
	defer f.Close()
	text, _ := pngText(f, "parameters")
	meta := ParseInfotext(text)
	meta.Backend = string(KindA1111)
	if meta.Width == 0 {
		if _, err := f.Seek(0, io.SeekStart); err == nil {
			if cfg, _, err := image.DecodeConfig(bufio.NewReader(f)); err == nil {
				meta.Width, meta.Height = cfg.Width, cfg.Height
			}
		}
	}
	return meta, nil
}

func (c *Client) a1111DeleteImages(names []string) error {
	for _, name := range names {
		_, _, full, err := c.a1111ImagePath(name)
		if err != nil {
			return err
		}
		if err := os.Remove(full); err != nil && !os.IsNotExist(err) {
			var pe *os.PathError
			reason := err.Error()
			if errors.As(err, &pe) {
				reason = pe.Err.Error()
			}
			return fmt.Errorf("couldn't delete %s from the outputs folder (%s) — the mapping has to be read/write", filepath.Base(full), reason)
		}
		// A1111 can write a .txt of the settings beside each picture; it goes too.
		_ = os.Remove(strings.TrimSuffix(full, filepath.Ext(full)) + ".txt")
	}
	c.a1111Gallery().forget()
	return nil
}

// errA1111Boards refuses the board edits a folder cannot make sense of.
var errA1111Boards = errors.New("Automatic1111's gallery is its outputs folder — its boards are the folders A1111 writes into")

// ── the PNG's settings ──────────────────────────────────────────────────────

// pngText reads one tEXt or iTXt chunk's text from a PNG, "" when there is none.
func pngText(r io.Reader, keyword string) (string, error) {
	br := bufio.NewReader(r)
	sig := make([]byte, 8)
	if _, err := io.ReadFull(br, sig); err != nil || !bytes.Equal(sig, []byte("\x89PNG\r\n\x1a\n")) {
		return "", errors.New("not a PNG")
	}
	for {
		var head [8]byte
		if _, err := io.ReadFull(br, head[:]); err != nil {
			return "", nil
		}
		n := binary.BigEndian.Uint32(head[:4])
		typ := string(head[4:8])
		if typ == "IDAT" || typ == "IEND" || n > 16<<20 {
			// A1111 writes its text before the pixels; past them there is nothing to find.
			return "", nil
		}
		body := make([]byte, n+4)
		if _, err := io.ReadFull(br, body); err != nil {
			return "", nil
		}
		data := body[:n]
		if crc32.ChecksumIEEE(append([]byte(typ), data...)) != binary.BigEndian.Uint32(body[n:]) {
			continue
		}
		switch typ {
		case "tEXt":
			if k, v, ok := bytes.Cut(data, []byte{0}); ok && string(k) == keyword {
				return latin1(v), nil
			}
		case "iTXt":
			// keyword \0 compressed-flag method \0 language \0 translated \0 text
			k, rest, ok := bytes.Cut(data, []byte{0})
			if !ok || string(k) != keyword || len(rest) < 2 || rest[0] != 0 {
				continue
			}
			parts := bytes.SplitN(rest[2:], []byte{0}, 3)
			if len(parts) == 3 {
				return string(parts[2]), nil
			}
		}
	}
}

func latin1(b []byte) string {
	r := make([]rune, len(b))
	for i, c := range b {
		r[i] = rune(c)
	}
	return string(r)
}

var (
	infotextLora = regexp.MustCompile(`<lora:([^:>]+)(?::([-0-9.]+))?[^>]*>`)
	// infotextField is one "Key: value" of the settings line, a value quoted when it
	// holds commas of its own ("Lora hashes: "a: 1, b: 2"").
	infotextField = regexp.MustCompile(`\s*([\w \-/]+):\s*("(?:\\.|[^\\"])*"|[^,]*)(?:,|$)`)
)

// ParseInfotext reads A1111's generation text — the prompt, a "Negative prompt:"
// line, and a last line of "Key: value" settings — into the portable metadata.
// Anything it does not recognise is left out rather than guessed.
func ParseInfotext(text string) *ImageMetadata {
	meta := &ImageMetadata{Loras: []ImageMetadataLora{}}
	text = strings.TrimSpace(strings.ReplaceAll(text, "\r\n", "\n"))
	if text == "" {
		return meta
	}
	lines := strings.Split(text, "\n")
	settings := ""
	if last := lines[len(lines)-1]; strings.HasPrefix(strings.TrimSpace(last), "Steps:") {
		settings = last
		lines = lines[:len(lines)-1]
	}
	var prompt, negative []string
	inNegative := false
	for _, line := range lines {
		if rest, ok := strings.CutPrefix(line, "Negative prompt:"); ok {
			inNegative = true
			line = strings.TrimSpace(rest)
		}
		if inNegative {
			negative = append(negative, line)
		} else {
			prompt = append(prompt, line)
		}
	}
	meta.Prompt = strings.TrimSpace(strings.Join(prompt, "\n"))
	meta.NegativePrompt = strings.TrimSpace(strings.Join(negative, "\n"))
	for _, m := range infotextLora.FindAllStringSubmatch(meta.Prompt, -1) {
		w := 1.0
		if m[2] != "" {
			if f, err := strconv.ParseFloat(m[2], 64); err == nil {
				w = f
			}
		}
		meta.Loras = append(meta.Loras, ImageMetadataLora{Name: m[1], Weight: w})
	}
	for _, m := range infotextField.FindAllStringSubmatch(settings, -1) {
		key, val := strings.TrimSpace(m[1]), strings.TrimSpace(m[2])
		if unq, err := strconv.Unquote(val); err == nil {
			val = unq
		}
		switch key {
		case "Steps":
			meta.Steps, _ = strconv.Atoi(val)
		case "Sampler":
			meta.Sampler = val
		case "Schedule type":
			if val != "" && val != "Automatic" && meta.Sampler != "" {
				meta.Sampler += " " + val
			}
		case "CFG scale":
			meta.CfgScale, _ = strconv.ParseFloat(val, 64)
		case "Seed":
			meta.Seed, _ = strconv.ParseInt(val, 10, 64)
		case "Size":
			if w, h, ok := strings.Cut(val, "x"); ok {
				meta.Width, _ = strconv.Atoi(w)
				meta.Height, _ = strconv.Atoi(h)
			}
		case "Model hash":
			meta.ModelHash = val
		case "Model":
			meta.Model = val
		case "VAE":
			meta.VAE = val
		case "Clip skip":
			meta.ClipSkip, _ = strconv.Atoi(val)
		case "Lora hashes":
			hashes := map[string]string{}
			for _, part := range strings.Split(val, ",") {
				if n, h, ok := strings.Cut(part, ":"); ok {
					hashes[strings.TrimSpace(n)] = strings.TrimSpace(h)
				}
			}
			for i := range meta.Loras {
				meta.Loras[i].Hash = hashes[meta.Loras[i].Name]
			}
		}
	}
	return meta
}
