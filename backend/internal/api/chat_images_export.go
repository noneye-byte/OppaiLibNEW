package api

import (
	"archive/zip"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/youruser/oppailib/internal/crypto"
)

// Taking her pictures home.
//
//	GET /api/chat/images/export?character=libby&shelf=hers|others|all
//
// Her gallery is sealed on disk, one blob per picture under a key only this process
// holds, so the only way out of it was one picture at a time through the browser's
// "save image" — fine for one, hopeless for the few hundred she builds up once she has
// a camera. This is the whole shelf as one download.
//
// The archive is written as each picture is opened, straight into the response: the
// decrypted bytes exist in memory one picture at a time and are never written back to
// the disk they were sealed on. Pictures are already compressed, so they are stored,
// not deflated — deflating a JPEG costs a core and buys nothing.
//
// Beside the pictures is manifest.json: each file's name, tags, who it shows and, for
// one she took, the recipe it was made from, so an export is a record and not only a
// folder of numbered files.

type chatImageExportEntry struct {
	File      string        `json:"file"`
	Name      string        `json:"name"`
	Tags      []string      `json:"tags"`
	Subject   string        `json:"subject,omitempty"`
	CreatedAt string        `json:"createdAt"`
	Rating    string        `json:"rating,omitempty"`
	Gen       *chatImageGen `json:"gen,omitempty"`
}

// exportFileUnsafe is what a picture's name may not keep in a file name: path
// separators, the characters Windows refuses, and control characters.
var exportFileUnsafe = regexp.MustCompile(`[\\/:*?"<>|\x00-\x1f]+`)

// exportFileName is the picture's name made safe for a zip entry, made unique by the
// id it ends in — two pictures called "Character image" are common.
func exportFileName(img chatImage) string {
	base := strings.TrimSpace(exportFileUnsafe.ReplaceAllString(img.Name, " "))
	base = strings.Join(strings.Fields(base), " ")
	if r := []rune(base); len(r) > 60 {
		base = strings.TrimSpace(string(r[:60]))
	}
	if base == "" || base == "." || base == ".." {
		base = "picture"
	}
	short := img.ID
	if len(short) > 8 {
		short = short[:8]
	}
	return base + " " + short + extensionForMIME(img.MIME)
}

func extensionForMIME(mime string) string {
	switch strings.ToLower(strings.TrimSpace(strings.SplitN(mime, ";", 2)[0])) {
	case "image/jpeg":
		return ".jpg"
	case "image/png":
		return ".png"
	case "image/webp":
		return ".webp"
	case "image/gif":
		return ".gif"
	case "video/webm":
		return ".webm"
	case "video/mp4":
		return ".mp4"
	}
	return ".bin"
}

// exportShelf picks the gallery entries one shelf holds. "hers" — the default — is what
// she sends as herself, the shelf the panel calls her pictures; "others" is what was
// shared with her; "all" is both.
func exportShelf(images []chatImage, characterID, shelf string) []chatImage {
	var out []chatImage
	for _, img := range images {
		if img.CharacterID != characterID {
			continue
		}
		other := img.Subject == chatSubjectOther
		switch shelf {
		case "all":
		case "others":
			if !other {
				continue
			}
		default:
			if other {
				continue
			}
		}
		out = append(out, img)
	}
	// Oldest first, so the archive reads in the order the pictures came.
	sort.SliceStable(out, func(a, b int) bool { return out[a].CreatedAt < out[b].CreatedAt })
	return out
}

func (s *Server) handleExportChatImages(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	q := r.URL.Query()
	characterID := strings.TrimSpace(q.Get("character"))
	if characterID == "" {
		characterID = "libby"
	}
	if !validChatImageOwner(characterID) {
		writeErr(w, http.StatusBadRequest, "bad character id")
		return
	}
	s.chatMu.Lock()
	ws, err := s.readChatWorkspace(u.ID)
	s.chatMu.Unlock()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't read the gallery")
		return
	}
	images := exportShelf(ws.Images, characterID, q.Get("shelf"))
	if len(images) == 0 {
		writeErr(w, http.StatusNotFound, "there are no pictures on that shelf")
		return
	}
	name := "pictures"
	for _, c := range ws.Characters {
		if c.ID == characterID && strings.TrimSpace(c.Name) != "" {
			name = strings.TrimSpace(exportFileUnsafe.ReplaceAllString(c.Name, " ")) + " pictures"
		}
	}
	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", name+" "+time.Now().Format("2006-01-02")+".zip"))
	w.Header().Set("Cache-Control", "no-store")

	zw := zip.NewWriter(w)
	manifest := make([]chatImageExportEntry, 0, len(images))
	used := map[string]bool{}
	for _, img := range images {
		blob, err := os.ReadFile(s.chatImagePath(u.ID, img.ID))
		if err != nil {
			s.log.Debug("export chat image: missing blob", "id", img.ID, "err", err)
			continue
		}
		raw, err := crypto.OpenBytes(s.kek, blob, []byte(fmt.Sprintf("chat-image:%d:%s", u.ID, img.ID)))
		if err != nil {
			s.log.Debug("export chat image: unreadable", "id", img.ID, "err", err)
			continue
		}
		file := exportFileName(img)
		for used[file] {
			file = "_" + file
		}
		used[file] = true
		at := time.UnixMilli(img.CreatedAt)
		f, err := zw.CreateHeader(&zip.FileHeader{Name: file, Method: zip.Store, Modified: at})
		if err != nil {
			return
		}
		if _, err := f.Write(raw); err != nil {
			// The client went away; there is nobody left to tell.
			return
		}
		manifest = append(manifest, chatImageExportEntry{
			File: file, Name: img.Name, Tags: img.Tags, Subject: img.Subject,
			CreatedAt: at.UTC().Format(time.RFC3339), Rating: img.Rating, Gen: img.Gen,
		})
	}
	if f, err := zw.Create("manifest.json"); err == nil {
		enc := json.NewEncoder(f)
		enc.SetIndent("", "  ")
		_ = enc.Encode(manifest)
	}
	_ = zw.Close()
}
