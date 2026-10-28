package db

import "context"

// RenameModel moves what is kept about a model file onto its new name: its catalogue
// link and recommended settings, kept by key, and the category it is filed under,
// kept by the name it is picked by (or, when an install filed it before anyone
// picked it, by key). A row already under the new name is replaced — it described a
// file that is no longer there, since a rename never overwrites one.
func (d *DB) RenameModel(ctx context.Context, oldKey, newKey, oldName, newName string) error {
	tx, err := d.sql.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	stmts := []struct {
		sql      string
		from, to string
	}{
		{`UPDATE OR REPLACE civitai_models SET model_key = ? WHERE model_key = ?`, oldKey, newKey},
		{`UPDATE OR REPLACE model_defaults SET model_key = ? WHERE model_key = ?`, oldKey, newKey},
		{`UPDATE OR REPLACE lora_category_of SET lora = ? WHERE lora = ?`, oldName, newName},
		{`UPDATE OR REPLACE lora_category_of SET lora = ? WHERE lora = ?`, oldKey, newKey},
	}
	for _, st := range stmts {
		if st.from == "" || st.to == "" || st.from == st.to {
			continue
		}
		if _, err := tx.ExecContext(ctx, st.sql, st.to, st.from); err != nil {
			return err
		}
	}
	return tx.Commit()
}
