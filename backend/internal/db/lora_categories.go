package db

import (
	"context"
	"database/sql"
	"errors"
	"strings"
)

// LoraCategory is one of the categories the studio's LoRAs are sorted into. See the
// table comment in schema.sql.
type LoraCategory struct {
	ID        int64
	Name      string
	CreatedAt int64
}

// ErrCategoryNameTaken is a rename onto another category's name.
var ErrCategoryNameTaken = errors.New("there is already a category by that name")

// LoraCategories lists the categories by name.
func (d *DB) LoraCategories(ctx context.Context) ([]LoraCategory, error) {
	rows, err := d.sql.QueryContext(ctx, `SELECT id, name, created_at FROM lora_categories ORDER BY lower(name), id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []LoraCategory
	for rows.Next() {
		var c LoraCategory
		if err := rows.Scan(&c.ID, &c.Name, &c.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

// CreateLoraCategory makes a category, or answers with the one already by that
// name whatever its capitals, as gallery folders do.
func (d *DB) CreateLoraCategory(ctx context.Context, name string) (LoraCategory, error) {
	name = strings.TrimSpace(name)
	var c LoraCategory
	err := d.sql.QueryRowContext(ctx, `SELECT id, name, created_at FROM lora_categories WHERE lower(name) = lower(?) ORDER BY id LIMIT 1`, name).
		Scan(&c.ID, &c.Name, &c.CreatedAt)
	if err == nil {
		return c, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return c, err
	}
	n := now()
	res, err := d.sql.ExecContext(ctx, `INSERT INTO lora_categories(name, created_at) VALUES(?, ?)`, name, n)
	if err != nil {
		return c, err
	}
	id, err := res.LastInsertId()
	return LoraCategory{ID: id, Name: name, CreatedAt: n}, err
}

// RenameLoraCategory changes a category's name. Renaming it onto another one's is
// refused rather than merging them behind the person's back; changing only its
// capitals is fine. sql.ErrNoRows when there is no such category.
func (d *DB) RenameLoraCategory(ctx context.Context, id int64, name string) error {
	name = strings.TrimSpace(name)
	var other int
	if err := d.sql.QueryRowContext(ctx, `SELECT COUNT(*) FROM lora_categories WHERE lower(name) = lower(?) AND id <> ?`, name, id).Scan(&other); err != nil {
		return err
	}
	if other > 0 {
		return ErrCategoryNameTaken
	}
	res, err := d.sql.ExecContext(ctx, `UPDATE lora_categories SET name = ? WHERE id = ?`, name, id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return sql.ErrNoRows
	}
	return nil
}

// DeleteLoraCategory removes a category; its LoRAs are left in none. The members
// are deleted here rather than left to the foreign key, so it holds on a database
// opened without foreign keys on.
func (d *DB) DeleteLoraCategory(ctx context.Context, id int64) error {
	tx, err := d.sql.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if _, err := tx.ExecContext(ctx, `DELETE FROM lora_category_members WHERE category_id = ?`, id); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `DELETE FROM lora_categories WHERE id = ?`, id); err != nil {
		return err
	}
	return tx.Commit()
}

// LoraCategoryMembers maps each LoRA in a category to the category's id.
func (d *DB) LoraCategoryMembers(ctx context.Context) (map[string]int64, error) {
	rows, err := d.sql.QueryContext(ctx, `SELECT lora, category_id FROM lora_category_members`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]int64{}
	for rows.Next() {
		var name string
		var id int64
		if err := rows.Scan(&name, &id); err != nil {
			return nil, err
		}
		out[name] = id
	}
	return out, rows.Err()
}

// SetLoraCategory puts the LoRAs in a category, moving them out of any other;
// category 0 takes them out of every one. sql.ErrNoRows for a category that is not
// there, with nothing changed.
func (d *DB) SetLoraCategory(ctx context.Context, category int64, loras []string) error {
	tx, err := d.sql.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if category > 0 {
		var n int
		if err := tx.QueryRowContext(ctx, `SELECT COUNT(*) FROM lora_categories WHERE id = ?`, category).Scan(&n); err != nil {
			return err
		}
		if n == 0 {
			return sql.ErrNoRows
		}
	}
	for _, name := range loras {
		if category == 0 {
			_, err = tx.ExecContext(ctx, `DELETE FROM lora_category_members WHERE lora = ?`, name)
		} else {
			_, err = tx.ExecContext(ctx, `INSERT INTO lora_category_members(lora, category_id) VALUES(?, ?)
				ON CONFLICT(lora) DO UPDATE SET category_id = excluded.category_id`, name, category)
		}
		if err != nil {
			return err
		}
	}
	return tx.Commit()
}
