package db

import (
	"context"
	"database/sql"
	"errors"
)

// LoraTraining is one LoRA's run on the trainer. See the table comment in schema.sql.
type LoraTraining struct {
	ID            int64
	Name          string
	Trigger       string
	BaseModel     string
	Images        int
	Settings      string // the request, as JSON
	Status        string
	Error         string
	TrainerJob    string
	InstallSource string
	ModelKey      string
	FreedGPU      bool
	CreatedAt     int64
	UpdatedAt     int64
	FinishedAt    int64
}

// Active says the run is not over.
func (t LoraTraining) Active() bool {
	switch t.Status {
	case "preparing", "queued", "training", "installing":
		return true
	}
	return false
}

const loraTrainingColumns = `id, name, trigger_word, base_model, images, settings, status, error,
	trainer_job, install_source, model_key, freed_gpu, created_at, updated_at, finished_at`

func scanLoraTraining(row interface{ Scan(...any) error }) (LoraTraining, error) {
	var t LoraTraining
	var freed int
	err := row.Scan(&t.ID, &t.Name, &t.Trigger, &t.BaseModel, &t.Images, &t.Settings, &t.Status, &t.Error,
		&t.TrainerJob, &t.InstallSource, &t.ModelKey, &freed, &t.CreatedAt, &t.UpdatedAt, &t.FinishedAt)
	t.FreedGPU = freed != 0
	return t, err
}

// InsertLoraTraining records a new run and returns it with its id.
func (d *DB) InsertLoraTraining(ctx context.Context, t LoraTraining) (LoraTraining, error) {
	t.CreatedAt, t.UpdatedAt = now(), now()
	res, err := d.sql.ExecContext(ctx, `
		INSERT INTO lora_trainings(name, trigger_word, base_model, images, settings, status, error,
			trainer_job, install_source, model_key, freed_gpu, created_at, updated_at, finished_at)
		VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		t.Name, t.Trigger, t.BaseModel, t.Images, t.Settings, t.Status, t.Error,
		t.TrainerJob, t.InstallSource, t.ModelKey, boolToInt(t.FreedGPU), t.CreatedAt, t.UpdatedAt, t.FinishedAt)
	if err != nil {
		return t, err
	}
	t.ID, err = res.LastInsertId()
	return t, err
}

// PutLoraTraining writes a run's current state. A run that has just ended is
// stamped with when.
func (d *DB) PutLoraTraining(ctx context.Context, t LoraTraining) error {
	if !t.Active() && t.FinishedAt == 0 {
		t.FinishedAt = now()
	}
	_, err := d.sql.ExecContext(ctx, `
		UPDATE lora_trainings SET name = ?, trigger_word = ?, base_model = ?, images = ?, settings = ?,
			status = ?, error = ?, trainer_job = ?, install_source = ?, model_key = ?, freed_gpu = ?,
			updated_at = ?, finished_at = ?
		WHERE id = ?`,
		t.Name, t.Trigger, t.BaseModel, t.Images, t.Settings, t.Status, t.Error, t.TrainerJob,
		t.InstallSource, t.ModelKey, boolToInt(t.FreedGPU), now(), t.FinishedAt, t.ID)
	return err
}

// GetLoraTraining reads one run; ok is false when there is no such run.
func (d *DB) GetLoraTraining(ctx context.Context, id int64) (LoraTraining, bool, error) {
	t, err := scanLoraTraining(d.sql.QueryRowContext(ctx, `SELECT `+loraTrainingColumns+` FROM lora_trainings WHERE id = ?`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return t, false, nil
	}
	return t, err == nil, err
}

// LoraTrainings lists runs, newest first; active limits it to the ones not over.
func (d *DB) LoraTrainings(ctx context.Context, active bool, limit int) ([]LoraTraining, error) {
	q := `SELECT ` + loraTrainingColumns + ` FROM lora_trainings`
	if active {
		q += ` WHERE status IN ('preparing', 'queued', 'training', 'installing')`
	}
	q += ` ORDER BY id DESC LIMIT ?`
	rows, err := d.sql.QueryContext(ctx, q, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []LoraTraining
	for rows.Next() {
		t, err := scanLoraTraining(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

// DeleteLoraTraining forgets a run.
func (d *DB) DeleteLoraTraining(ctx context.Context, id int64) error {
	_, err := d.sql.ExecContext(ctx, `DELETE FROM lora_trainings WHERE id = ?`, id)
	return err
}
