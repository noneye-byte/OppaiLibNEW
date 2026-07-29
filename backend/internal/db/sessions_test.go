package db

import (
	"context"
	"errors"
	"testing"
	"time"
)

func newTestUser(t *testing.T, d *DB) int64 {
	t.Helper()
	id, err := d.CreateUser(context.Background(), "tester", "hash", true)
	if err != nil {
		t.Fatalf("create user: %v", err)
	}
	return id
}

// backdate ages a session's last activity, standing in for a user who wandered off.
func backdate(t *testing.T, d *DB, token string, age time.Duration) {
	t.Helper()
	_, err := d.SQL().Exec(
		`UPDATE sessions SET last_seen = ? WHERE token = ?`,
		time.Now().Add(-age).Unix(), token,
	)
	if err != nil {
		t.Fatalf("backdate session: %v", err)
	}
}

const idle = time.Hour

// A browser session that has gone untouched past the idle window is rejected, even
// though its absolute TTL has hours left on it.
func TestWebSessionIdlesOut(t *testing.T) {
	d := openTestDB(t)
	ctx := context.Background()
	uid := newTestUser(t, d)

	if err := d.CreateSession(ctx, "web-token", uid, 24*time.Hour, ClientWeb); err != nil {
		t.Fatalf("create session: %v", err)
	}
	// Fresh: fine.
	if _, err := d.SessionUser(ctx, "web-token", idle); err != nil {
		t.Fatalf("a fresh web session should be valid: %v", err)
	}

	backdate(t, d, "web-token", 2*time.Hour)
	_, err := d.SessionUser(ctx, "web-token", idle)
	if !errors.Is(err, ErrSessionIdle) {
		t.Fatalf("err = %v, want ErrSessionIdle — an abandoned tab must not stay signed in", err)
	}
}

// The phone is exempt. It signs in once, on a device you own, and there is nobody at
// the keyboard to re-authenticate it an hour later.
func TestAndroidSessionDoesNotIdleOut(t *testing.T) {
	d := openTestDB(t)
	ctx := context.Background()
	uid := newTestUser(t, d)

	if err := d.CreateSession(ctx, "app-token", uid, 24*time.Hour, ClientAndroid); err != nil {
		t.Fatalf("create session: %v", err)
	}
	backdate(t, d, "app-token", 30*24*time.Hour)

	if _, err := d.SessionUser(ctx, "app-token", idle); err != nil {
		t.Fatalf("the Android session must survive inactivity: %v", err)
	}
}

func TestAndroidSessionDoesNotExpire(t *testing.T) {
	d := openTestDB(t)
	ctx := context.Background()
	uid := newTestUser(t, d)

	if err := d.CreateSession(ctx, "app-token", uid, -time.Hour, ClientAndroid); err != nil {
		t.Fatalf("create expired session: %v", err)
	}
	if _, err := d.SessionUser(ctx, "app-token", idle); err != nil {
		t.Fatalf("the Android session must remain valid for biometric unlock: %v", err)
	}
}

func TestWebSessionStillExpires(t *testing.T) {
	d := openTestDB(t)
	ctx := context.Background()
	uid := newTestUser(t, d)

	if err := d.CreateSession(ctx, "web-token", uid, -time.Hour, ClientWeb); err != nil {
		t.Fatalf("create expired session: %v", err)
	}
	if _, err := d.SessionUser(ctx, "web-token", 0); err == nil {
		t.Fatal("an expired browser session must be rejected")
	}
}

// Activity is what holds an idle-expiring session open.
func TestTouchKeepsAWebSessionAlive(t *testing.T) {
	d := openTestDB(t)
	ctx := context.Background()
	uid := newTestUser(t, d)

	if err := d.CreateSession(ctx, "web-token", uid, 24*time.Hour, ClientWeb); err != nil {
		t.Fatalf("create session: %v", err)
	}
	backdate(t, d, "web-token", 50*time.Minute) // stale, but not yet idle

	if err := d.TouchSession(ctx, "web-token", idle); err != nil {
		t.Fatalf("touch: %v", err)
	}
	// Had the touch not landed, this would now be 50 minutes further along and dead.
	backdate(t, d, "web-token", 0)
	if _, err := d.SessionUser(ctx, "web-token", idle); err != nil {
		t.Fatalf("a touched session should still be valid: %v", err)
	}
}

// A restart signs the web UI out and leaves the phone alone.
func TestPurgeBrowserSessionsSparesAndroid(t *testing.T) {
	d := openTestDB(t)
	ctx := context.Background()
	uid := newTestUser(t, d)

	for token, client := range map[string]string{
		"web-token": ClientWeb,
		"app-token": ClientAndroid,
		// A session predating the client column defaults to browser rules.
		"old-token": "",
	} {
		if err := d.CreateSession(ctx, token, uid, 24*time.Hour, client); err != nil {
			t.Fatalf("create %s: %v", token, err)
		}
	}

	n, err := d.PurgeBrowserSessions(ctx)
	if err != nil {
		t.Fatalf("purge: %v", err)
	}
	if n != 2 {
		t.Errorf("purged %d, want 2 (the browser session and the legacy one)", n)
	}
	if _, err := d.SessionUser(ctx, "web-token", idle); err == nil {
		t.Error("the web session should be gone after a restart")
	}
	if _, err := d.SessionUser(ctx, "old-token", idle); err == nil {
		t.Error("a session with no client must be treated as a browser and dropped")
	}
	if _, err := d.SessionUser(ctx, "app-token", idle); err != nil {
		t.Errorf("the Android session must survive a restart: %v", err)
	}
}

// A short idle window must still survive being used. The write to last_seen is
// throttled, and if that throttle were a flat minute it would skip the very writes a
// two-minute window depends on — logging out a user who was working the whole time.
func TestTouchKeepsUpWithAShortIdleWindow(t *testing.T) {
	d := openTestDB(t)
	ctx := context.Background()
	uid := newTestUser(t, d)
	const shortIdle = 2 * time.Minute

	if err := d.CreateSession(ctx, "web-token", uid, 24*time.Hour, ClientWeb); err != nil {
		t.Fatalf("create session: %v", err)
	}
	// 40s since the last write: under a flat 60s throttle this touch would be skipped,
	// and the session would then idle out at 2 minutes despite continuous use.
	backdate(t, d, "web-token", 40*time.Second)
	if err := d.TouchSession(ctx, "web-token", shortIdle); err != nil {
		t.Fatalf("touch: %v", err)
	}

	// The touch must have landed, i.e. last_seen is now recent.
	var lastSeen int64
	if err := d.SQL().QueryRow(`SELECT last_seen FROM sessions WHERE token = ?`, "web-token").
		Scan(&lastSeen); err != nil {
		t.Fatalf("read last_seen: %v", err)
	}
	if age := time.Now().Unix() - lastSeen; age > 5 {
		t.Errorf("last_seen is %ds old — the touch was throttled away inside a short window", age)
	}
}

// The idle check is a policy, not a law of nature: switching it off leaves the
// absolute TTL as the only bound.
func TestZeroIdleDisablesTheCheck(t *testing.T) {
	d := openTestDB(t)
	ctx := context.Background()
	uid := newTestUser(t, d)

	if err := d.CreateSession(ctx, "web-token", uid, 24*time.Hour, ClientWeb); err != nil {
		t.Fatalf("create session: %v", err)
	}
	backdate(t, d, "web-token", 30*24*time.Hour)

	if _, err := d.SessionUser(ctx, "web-token", 0); err != nil {
		t.Fatalf("idle=0 should disable the idle check: %v", err)
	}
}
