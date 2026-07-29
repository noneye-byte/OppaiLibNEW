package scraper

import (
	"net/url"
	"path"
	"strings"

	"github.com/youruser/oppailib/internal/models"
)

// mediaExt maps a lowercase file extension to the media kind it represents.
// Used to short-circuit direct-media links (e.g. Discord CDN, direct image
// hotlinks) that point straight at a file rather than an HTML page.
var mediaExt = map[string]models.MediaKind{
	".jpg":  models.KindImage,
	".jpeg": models.KindImage,
	".png":  models.KindImage,
	".webp": models.KindImage,
	".avif": models.KindImage,
	".bmp":  models.KindImage,
	".jfif": models.KindImage,
	".gif":  models.KindGIF,
	".apng": models.KindGIF,
	".mp4":  models.KindVideo,
	".m4v":  models.KindVideo,
	".webm": models.KindVideo,
	".mov":  models.KindVideo,
	".mkv":  models.KindVideo,
	// Already-bundled comics. A link straight at one needs no page assembly —
	// the file is the comic.
	".cbz": models.KindComic,
	".cbr": models.KindComic,
	".cb7": models.KindComic,
	".cbt": models.KindComic,
	".pdf": models.KindComic,
}

// mediaKindFromPath returns the media kind implied by a URL path's extension,
// or "" if the path doesn't look like a direct media file.
func mediaKindFromPath(p string) models.MediaKind {
	return mediaExt[strings.ToLower(path.Ext(p))]
}

// mediaKindFromContentType classifies an HTTP Content-Type into a media kind,
// or "" when the response is (probably) an HTML page to be parsed.
func mediaKindFromContentType(ct string) models.MediaKind {
	ct = strings.ToLower(strings.TrimSpace(ct))
	if i := strings.IndexByte(ct, ';'); i >= 0 {
		ct = strings.TrimSpace(ct[:i])
	}
	switch {
	case ct == "image/gif":
		return models.KindGIF
	case comicContentType[ct]:
		return models.KindComic
	case strings.HasPrefix(ct, "image/"):
		return models.KindImage
	case strings.HasPrefix(ct, "video/"):
		return models.KindVideo
	}
	return ""
}

// comicContentType maps the MIME types a bundled comic is served as. Checked
// before the image/video prefixes so an extensionless CDN link to a .cbz is
// recognised for what it is.
var comicContentType = map[string]bool{
	"application/pdf":                true,
	"application/vnd.comicbook+zip":  true,
	"application/vnd.comicbook-rar":  true,
	"application/x-cbz":              true,
	"application/x-cbr":              true,
}

// titleFromURL derives a human-ish title from a direct media URL (the file name
// without its extension), falling back to the host.
func titleFromURL(u *url.URL) string {
	name := path.Base(u.Path)
	name = strings.TrimSuffix(name, path.Ext(name))
	name = strings.TrimSpace(name)
	if name == "" || name == "/" || name == "." {
		return u.Hostname()
	}
	return name
}
