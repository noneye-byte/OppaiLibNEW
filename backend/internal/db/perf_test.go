package db

import (
	"context"
	"path/filepath"
	"strings"
	"sync"
	"testing"
)

func openTemp(t *testing.T) *DB {
	t.Helper()
	d, err := Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	t.Cleanup(func() { d.Close() })
	return d
}

func TestOpenComesUpInWALOnLocalDisk(t *testing.T) {
	d := openTemp(t)
	// On a normal filesystem WAL must take. If this fails the pool stays serialized,
	// which is safe but is the performance regression this work exists to remove.
	if !d.WAL() {
		t.Fatal("journal_mode is not WAL on a local temp dir")
	}
	var sync string
	if err := d.SQL().QueryRow(`PRAGMA synchronous`).Scan(&sync); err != nil {
		t.Fatalf("read synchronous: %v", err)
	}
	// 1 == NORMAL.
	if sync != "1" {
		t.Errorf("synchronous = %q, want 1 (NORMAL)", sync)
	}
}

func TestListMediaUsesCompositeIndex(t *testing.T) {
	d := openTemp(t)
	rows, err := d.SQL().Query(`EXPLAIN QUERY PLAN
		SELECT id FROM media WHERE kind = ? ORDER BY created_at DESC LIMIT 50 OFFSET 0`, "video")
	if err != nil {
		t.Fatalf("explain: %v", err)
	}
	defer rows.Close()
	var plan strings.Builder
	for rows.Next() {
		var id, parent, notused int
		var detail string
		if err := rows.Scan(&id, &parent, &notused, &detail); err != nil {
			t.Fatalf("scan: %v", err)
		}
		plan.WriteString(detail)
		plan.WriteString("\n")
	}
	got := plan.String()
	if !strings.Contains(got, "idx_media_kind_created") {
		t.Errorf("plan does not use the composite index:\n%s", got)
	}
	// The point of the index is that the sort disappears. A B-TREE FOR ORDER BY in
	// the plan means SQLite is still sorting every matching row per page.
	if strings.Contains(got, "USE TEMP B-TREE FOR ORDER BY") {
		t.Errorf("query still sorts by hand:\n%s", got)
	}
}

func TestConcurrentReadsDoNotSerializeOnOneConnection(t *testing.T) {
	d := openTemp(t)
	ctx := context.Background()

	// Enough rows that a read is a real statement rather than a no-op.
	for i := 0; i < 200; i++ {
		if _, err := d.SQL().ExecContext(ctx,
			`INSERT INTO media(kind, sha256, size, blob_path, rating, favorite, created_at, updated_at)
			 VALUES('image', ?, 1, 'x', 0, 0, ?, ?)`,
			strings.Repeat("a", 60)+string(rune('a'+i%26))+string(rune('a'+i/26)), i, i); err != nil {
			t.Fatalf("seed %d: %v", i, err)
		}
	}

	// Under WAL with a real pool, concurrent readers must all succeed rather than
	// erroring with "database is locked" — the regression a widened pool would cause
	// if WAL had not actually taken effect.
	var wg sync.WaitGroup
	errs := make(chan error, 32)
	for i := 0; i < 32; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if _, err := d.ListMedia(ctx, "image", 50, 0); err != nil {
				errs <- err
			}
		}()
	}
	wg.Wait()
	close(errs)
	for err := range errs {
		t.Fatalf("concurrent read failed: %v", err)
	}
}

func TestWriteUnderConcurrentReadsSucceeds(t *testing.T) {
	d := openTemp(t)
	ctx := context.Background()

	stop := make(chan struct{})
	var wg sync.WaitGroup
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for {
				select {
				case <-stop:
					return
				default:
					_, _ = d.ListMedia(ctx, "", 50, 0)
				}
			}
		}()
	}

	// A transactional write while readers hammer the file. WAL plus
	// _txlock=immediate is what makes this not a BUSY error.
	err := d.PutSettings(ctx, map[string]string{"a": "1", "b": "2"})
	close(stop)
	wg.Wait()
	if err != nil {
		t.Fatalf("write during reads: %v", err)
	}
}
