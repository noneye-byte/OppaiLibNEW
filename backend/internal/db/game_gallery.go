package db

import (
	"context"
)

func (d *DB) AddGameGalleryMedia(ctx context.Context, gameID, mediaID int64) error {
	_, err := d.sql.ExecContext(ctx, `
		INSERT OR IGNORE INTO game_gallery(game_id, media_id, position)
		VALUES(?,?,COALESCE((SELECT MAX(position)+1 FROM game_gallery WHERE game_id=?),0))`,
		gameID, mediaID, gameID)
	return err
}

func (d *DB) RemoveGameGalleryMedia(ctx context.Context, gameID, mediaID int64) error {
	_, err := d.sql.ExecContext(ctx, `DELETE FROM game_gallery WHERE game_id=? AND media_id=?`, gameID, mediaID)
	return err
}

func (d *DB) ListGameGallery(ctx context.Context, gameID int64) ([]*MediaRow, error) {
	rows, err := d.sql.QueryContext(ctx, `
		SELECT m.id, m.kind, m.sha256, m.size, m.blob_path, m.title_enc, m.notes_enc, m.source_enc,
		       m.rating, m.favorite, m.duration, m.width, m.height, m.page_count, m.thumb_path,
		       m.download_enc, m.gallery_enc, m.created_at, m.updated_at
		FROM game_gallery gg JOIN media m ON m.id=gg.media_id
		WHERE gg.game_id=? ORDER BY gg.position, m.created_at`, gameID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*MediaRow
	for rows.Next() {
		m := &MediaRow{}
		var fav int
		if err := rows.Scan(&m.ID, &m.Kind, &m.SHA256, &m.Size, &m.BlobPath,
			&m.TitleEnc, &m.NotesEnc, &m.SourceEnc, &m.Rating, &fav, &m.Duration,
			&m.Width, &m.Height, &m.PageCount, &m.ThumbPath, &m.DownloadEnc,
			&m.GalleryEnc, &m.CreatedAt, &m.UpdatedAt); err != nil {
			return nil, err
		}
		m.Favorite = fav != 0
		out = append(out, m)
	}
	return out, rows.Err()
}

func (d *DB) IsGame(ctx context.Context, id int64) (bool, error) {
	var kind string
	err := d.sql.QueryRowContext(ctx, `SELECT kind FROM media WHERE id=?`, id).Scan(&kind)
	if err != nil {
		return false, err
	}
	return kind == "game", nil
}
