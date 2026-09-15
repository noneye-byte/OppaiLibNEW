package db

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
)

// One page of the library, and the size of the thing it is a page of.
//
// The web grid used to fetch the library entire — 200 rows at a time until the
// server ran out — because search and favourites were filters it applied in the
// browser. That made every screen wait for the whole collection and put all of it
// in one tab's memory. What it needed instead is the query pushed down to here:
// filter, order and page in SQL, and a count so the client knows what it is a page
// of without holding the rest.
//
// Search is the one filter that cannot come down this far, because titles are
// ciphertext and SQLite cannot match what it cannot read. That runs against the
// in-memory index in the API layer (chat_library_index.go), which resolves a query
// to ids and then asks MediaByIDs for the page.

// MediaSort is an order the library grid can ask for.
//
// No title sort, deliberately: title_enc is ciphertext, so ORDER BY on it would
// order by nothing meaningful. Only the decrypted index could sort by title, and a
// sort menu that changed depending on whether you had typed a query would be worse
// than not offering it.
type MediaSort string

const (
	SortNewest  MediaSort = "newest"
	SortOldest  MediaSort = "oldest"
	SortRating  MediaSort = "rating"
	SortLargest MediaSort = "largest"
)

// orderBy is the ORDER BY for a sort. Every one ends in a unique column so paging
// is stable: two rows with the same rating must not be able to swap places between
// page one and page two, which is how an OFFSET walk silently repeats or skips a
// row.
func (s MediaSort) orderBy() string {
	switch s {
	case SortOldest:
		return "created_at ASC, id ASC"
	case SortRating:
		return "rating DESC, created_at DESC, id DESC"
	case SortLargest:
		return "size DESC, id DESC"
	default:
		return "created_at DESC, id DESC"
	}
}

// ParseMediaSort maps a client's sort parameter to a known order, falling back to
// newest for anything unrecognised — an unknown sort is a stale client, not a
// reason to fail the request.
func ParseMediaSort(s string) MediaSort {
	switch MediaSort(s) {
	case SortOldest:
		return SortOldest
	case SortRating:
		return SortRating
	case SortLargest:
		return SortLargest
	default:
		return SortNewest
	}
}

// MediaFilter is everything a library query can narrow on in SQL.
type MediaFilter struct {
	Kind         string // "" = every kind
	FavoriteOnly bool
	Tag          string // "" = any tag; the grid's filter chips
	Sort         MediaSort
}

// where builds the shared WHERE clause, so the count and the page can never
// disagree about what they are counting.
func (f MediaFilter) where() (string, []any) {
	var clauses []string
	var args []any
	if f.Kind != "" {
		clauses = append(clauses, "kind = ?")
		args = append(args, f.Kind)
	}
	if f.FavoriteOnly {
		clauses = append(clauses, "favorite = 1")
	}
	if f.Tag != "" {
		// EXISTS rather than a join, so a row carrying the tag twice (a manual tag the
		// AI also found) cannot appear twice in the page.
		clauses = append(clauses, `EXISTS (
			SELECT 1 FROM media_tags mt JOIN tags t ON t.id = mt.tag_id
			WHERE mt.media_id = media.id AND t.name = ?)`)
		args = append(args, f.Tag)
	}
	if len(clauses) == 0 {
		return "", nil
	}
	return " WHERE " + strings.Join(clauses, " AND "), args
}

// placeholderList is the "?,?,?" for an IN clause over n values.
func placeholderList(n int) string {
	return strings.TrimPrefix(strings.Repeat(",?", n), ",")
}

const mediaColumns = `id, kind, sha256, size, blob_path, title_enc, notes_enc, source_enc,
	rating, favorite, duration, width, height, page_count, thumb_path,
	download_enc, gallery_enc, created_at, updated_at`

func scanMediaRows(rows *sql.Rows) ([]*MediaRow, error) {
	defer rows.Close()
	var out []*MediaRow
	for rows.Next() {
		m := &MediaRow{}
		var fav int
		if err := rows.Scan(&m.ID, &m.Kind, &m.SHA256, &m.Size, &m.BlobPath,
			&m.TitleEnc, &m.NotesEnc, &m.SourceEnc, &m.Rating, &fav,
			&m.Duration, &m.Width, &m.Height, &m.PageCount, &m.ThumbPath,
			&m.DownloadEnc, &m.GalleryEnc, &m.CreatedAt, &m.UpdatedAt); err != nil {
			return nil, err
		}
		m.Favorite = fav != 0
		out = append(out, m)
	}
	return out, rows.Err()
}

// MediaPage returns one page of the filtered library.
func (d *DB) MediaPage(ctx context.Context, f MediaFilter, limit, offset int) ([]*MediaRow, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}
	where, args := f.where()
	args = append(args, limit, offset)
	rows, err := d.sql.QueryContext(ctx,
		`SELECT `+mediaColumns+` FROM media`+where+
			` ORDER BY `+f.Sort.orderBy()+` LIMIT ? OFFSET ?`, args...)
	if err != nil {
		return nil, err
	}
	return scanMediaRows(rows)
}

// CountMedia is how many rows the same filter matches, for the grid's "N items"
// and for knowing whether another page exists without asking for one.
func (d *DB) CountMedia(ctx context.Context, f MediaFilter) (int, error) {
	where, args := f.where()
	var n int
	err := d.sql.QueryRowContext(ctx, `SELECT COUNT(*) FROM media`+where, args...).Scan(&n)
	return n, err
}

// CountMediaByKind is every kind's row count in one query, for a home screen that
// wants to label its shelves without paging through them.
func (d *DB) CountMediaByKind(ctx context.Context) (map[string]int, error) {
	rows, err := d.sql.QueryContext(ctx, `SELECT kind, COUNT(*) FROM media GROUP BY kind`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]int{}
	for rows.Next() {
		var kind string
		var n int
		if err := rows.Scan(&kind, &n); err != nil {
			return nil, err
		}
		out[kind] = n
	}
	return out, rows.Err()
}

// TotalMediaBytes is how much the library adds up to, for Home's "stored" figure.
// Summed here rather than added up client-side from every row, which is what it cost
// before: the number is one query, and it was the last reason the dashboard needed
// the whole collection in memory.
func (d *DB) TotalMediaBytes(ctx context.Context) (int64, error) {
	var n int64
	err := d.sql.QueryRowContext(ctx, `SELECT COALESCE(SUM(size), 0) FROM media`).Scan(&n)
	return n, err
}

// CountMediaSince is how many rows were added at or after a timestamp. Home shows
// it as "N added this week", which used to be a length taken from the whole
// library sitting in the browser.
func (d *DB) CountMediaSince(ctx context.Context, since int64) (int, error) {
	var n int
	err := d.sql.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM media WHERE created_at >= ?`, since).Scan(&n)
	return n, err
}

// MediaByIDs resolves full rows for specific ids, in the order given.
//
// The order matters: these ids arrive already ranked or sorted by the caller (a
// search result page), and SQLite is free to return an IN set however it likes.
// Ids with no row are skipped rather than erroring — one deleted between the index
// being built and the page being read is a stale index, not a bad request.
func (d *DB) MediaByIDs(ctx context.Context, ids []int64) ([]*MediaRow, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	if len(ids) > 200 {
		return nil, fmt.Errorf("media by ids: %d ids is more than one page", len(ids))
	}
	args := make([]any, len(ids))
	for i, id := range ids {
		args[i] = id
	}
	rows, err := d.sql.QueryContext(ctx,
		`SELECT `+mediaColumns+` FROM media WHERE id IN (`+placeholderList(len(ids))+`)`, args...)
	if err != nil {
		return nil, err
	}
	found, err := scanMediaRows(rows)
	if err != nil {
		return nil, err
	}
	byID := make(map[int64]*MediaRow, len(found))
	for _, m := range found {
		byID[m.ID] = m
	}
	out := make([]*MediaRow, 0, len(ids))
	for _, id := range ids {
		if m := byID[id]; m != nil {
			out = append(out, m)
		}
	}
	return out, nil
}
