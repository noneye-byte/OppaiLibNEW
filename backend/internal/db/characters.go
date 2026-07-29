package db

import "context"

type CharacterRow struct {
	ID        int64
	NameEnc   []byte
	TagsEnc   []byte
	ImageEnc  []byte
	MIME      string
	CreatedAt int64
}

func (d *DB) CreateCharacter(ctx context.Context, nameEnc, tagsEnc, imageEnc []byte, mime string) (int64, error) {
	res, err := d.sql.ExecContext(ctx, `
		INSERT INTO characters(name_enc, tags_enc, image_enc, mime, created_at)
		VALUES(?,?,?,?,?)`, nameEnc, tagsEnc, imageEnc, mime, now())
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (d *DB) ListCharacters(ctx context.Context) ([]CharacterRow, error) {
	rows, err := d.sql.QueryContext(ctx, `
		SELECT id, name_enc, tags_enc, image_enc, mime, created_at
		FROM characters ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []CharacterRow
	for rows.Next() {
		var row CharacterRow
		if err := rows.Scan(&row.ID, &row.NameEnc, &row.TagsEnc, &row.ImageEnc, &row.MIME, &row.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

func (d *DB) GetCharacter(ctx context.Context, id int64) (*CharacterRow, error) {
	var row CharacterRow
	err := d.sql.QueryRowContext(ctx, `
		SELECT id, name_enc, tags_enc, image_enc, mime, created_at FROM characters WHERE id=?`, id).
		Scan(&row.ID, &row.NameEnc, &row.TagsEnc, &row.ImageEnc, &row.MIME, &row.CreatedAt)
	return &row, err
}

func (d *DB) DeleteCharacter(ctx context.Context, id int64) error {
	_, err := d.sql.ExecContext(ctx, `DELETE FROM characters WHERE id=?`, id)
	return err
}
