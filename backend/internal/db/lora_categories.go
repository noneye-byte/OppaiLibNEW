package db

import (
	"context"
	"database/sql"
	"strings"
)

// The studio's LoRA categories are a fixed list rather than ones the person makes:
// a LoRA is filed under one of these keys or none. They were folders of the person's
// own until 0.67, which left every library sorted a different way and the phone with
// a category editor nobody used; the fixed list is Civitai's own groupings, so a LoRA
// installed from there arrives already filed.
const (
	LoraCharacter  = "character"
	LoraStyle      = "style"
	LoraConcept    = "concept"
	LoraTools      = "tools"
	LoraPoses      = "poses"
	LoraBackground = "background"
	LoraEtc        = "etc"
)

// LoraCategoryKeys is every category, in the order the pickers show them.
var LoraCategoryKeys = []string{LoraCharacter, LoraStyle, LoraConcept, LoraTools, LoraPoses, LoraBackground, LoraEtc}

// IsLoraCategory reports whether key is one of the fixed categories.
func IsLoraCategory(key string) bool {
	for _, k := range LoraCategoryKeys {
		if k == key {
			return true
		}
	}
	return false
}

// LoraCategoryFor guesses the category a name means: a folder the person made before
// the list was fixed ("Characters", "Art styles"), or a Civitai tag. Anything it does
// not recognise is ETC, so nothing that was sorted falls back into the unsorted pile.
func LoraCategoryFor(name string) string {
	n := strings.ToLower(strings.TrimSpace(name))
	has := func(words ...string) bool {
		for _, w := range words {
			if strings.Contains(n, w) {
				return true
			}
		}
		return false
	}
	switch {
	case has("char", "person", "people", "girl", "waifu", "celeb"):
		return LoraCharacter
	case has("style", "artist"):
		return LoraStyle
	case has("pose", "posing", "position"):
		return LoraPoses
	case has("background", "scene", "place", "location", "building", "room"):
		return LoraBackground
	case has("tool", "slider", "detail", "enhanc", "fix", "quality", "helper"):
		return LoraTools
	case has("concept", "clothing", "outfit", "cloth", "action", "object", "fetish"):
		return LoraConcept
	}
	return LoraEtc
}

// LoraCategories maps each LoRA that is filed to its category's key.
func (d *DB) LoraCategories(ctx context.Context) (map[string]string, error) {
	rows, err := d.sql.QueryContext(ctx, `SELECT lora, category FROM lora_category_of`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]string{}
	for rows.Next() {
		var name, key string
		if err := rows.Scan(&name, &key); err != nil {
			return nil, err
		}
		out[name] = key
	}
	return out, rows.Err()
}

// SetLoraCategory files the LoRAs under a category, out of any other; "" takes them
// out of every one. The caller checks the key is one of LoraCategoryKeys.
func (d *DB) SetLoraCategory(ctx context.Context, category string, loras []string) error {
	tx, err := d.sql.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	for _, name := range loras {
		if category == "" {
			_, err = tx.ExecContext(ctx, `DELETE FROM lora_category_of WHERE lora = ?`, name)
		} else {
			_, err = tx.ExecContext(ctx, `INSERT INTO lora_category_of(lora, category) VALUES(?, ?)
				ON CONFLICT(lora) DO UPDATE SET category = excluded.category`, name, category)
		}
		if err != nil {
			return err
		}
	}
	return tx.Commit()
}

// FileLoraIfUnsorted files a LoRA under a category unless it is already in one: an
// install says what the LoRA is, but never over the person's own choice.
func (d *DB) FileLoraIfUnsorted(ctx context.Context, lora, category string) error {
	_, err := d.sql.ExecContext(ctx, `INSERT INTO lora_category_of(lora, category) VALUES(?, ?)
		ON CONFLICT(lora) DO NOTHING`, lora, category)
	return err
}

// migrateLoraFolders moves the person-made categories of 0.65–0.66 onto the fixed
// list, each LoRA under the category its folder's name means, and drops the old
// tables. It runs at every open and does nothing once they are gone.
func migrateLoraFolders(sqldb *sql.DB) error {
	var n int
	if err := sqldb.QueryRow(`SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'lora_categories'`).Scan(&n); err != nil || n == 0 {
		return err
	}
	rows, err := sqldb.Query(`SELECT m.lora, c.name FROM lora_category_members m JOIN lora_categories c ON c.id = m.category_id`)
	if err != nil {
		return err
	}
	moved := map[string]string{}
	for rows.Next() {
		var lora, folder string
		if err := rows.Scan(&lora, &folder); err != nil {
			rows.Close()
			return err
		}
		moved[lora] = LoraCategoryFor(folder)
	}
	if err := rows.Close(); err != nil {
		return err
	}
	tx, err := sqldb.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	for lora, key := range moved {
		if _, err := tx.Exec(`INSERT INTO lora_category_of(lora, category) VALUES(?, ?) ON CONFLICT(lora) DO NOTHING`, lora, key); err != nil {
			return err
		}
	}
	for _, stmt := range []string{`DROP TABLE IF EXISTS lora_category_members`, `DROP TABLE IF EXISTS lora_categories`} {
		if _, err := tx.Exec(stmt); err != nil {
			return err
		}
	}
	return tx.Commit()
}
