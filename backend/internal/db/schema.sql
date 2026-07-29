-- OppaiLib schema (SQLite). Applied idempotently on startup.
-- Sensitive free-text lives in *_enc BLOB columns (AES-256-GCM, see crypto pkg).

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Runtime settings edited from the Settings screen. Env vars provide the
-- defaults; a row here overrides one for this install.
CREATE TABLE IF NOT EXISTS settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT NOT NULL UNIQUE,
    pw_hash    TEXT NOT NULL,                -- Argon2id encoded string
    is_admin   INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT PRIMARY KEY,             -- opaque random
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    -- Which client holds this session: 'android' or 'web'. Only the Android app is
    -- exempt from the idle timeout and the restart purge (see db.ClientAndroid), so
    -- an unset value defaults to browser rules — the safe direction.
    client     TEXT NOT NULL DEFAULT '',
    -- Unix seconds of the last request that counted as user activity. Feeds the
    -- browser idle timeout; the phone's session ignores it.
    last_seen  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- WebAuthn credentials. One row per passkey; a user may register several (a phone, a
-- laptop, a hardware key), which is why this is a table rather than columns on users.
--
-- Nothing here is secret: a credential holds only a public key. The private key never
-- leaves the authenticator, which is the whole point — a database dump discloses no
-- means of signing in. What does matter is integrity: a writable credential_id or
-- public_key would let an attacker register their own authenticator against someone
-- else's account, so both are only ever written by the registration flow.
CREATE TABLE IF NOT EXISTS passkeys (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- The authenticator's credential id, raw bytes. Unique across all users: the same
    -- credential must never be claimable by two accounts.
    credential_id BLOB NOT NULL UNIQUE,
    public_key    BLOB NOT NULL,             -- COSE-encoded public key
    aaguid        BLOB,                      -- authenticator model, informational
    -- The authenticator's signature counter, as of the last successful assertion.
    -- A counter that fails to advance is the standard cloned-credential signal; see
    -- passkey verification.
    sign_count    INTEGER NOT NULL DEFAULT 0,
    transports    TEXT NOT NULL DEFAULT '',  -- comma-separated hints (usb, internal, hybrid)
    attestation   TEXT NOT NULL DEFAULT '',  -- attestation type reported at registration
    -- Whether this credential is backed up / synced (an iCloud or Google passkey).
    -- Worth showing the user: a synced key survives losing the device, a
    -- device-bound one does not.
    backup_eligible INTEGER NOT NULL DEFAULT 0,
    backup_state    INTEGER NOT NULL DEFAULT 0,
    -- A device-friendly label. Defaulted from the authenticator, editable.
    name          TEXT NOT NULL DEFAULT '',
    created_at    INTEGER NOT NULL,
    last_used_at  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_passkeys_user ON passkeys(user_id);

CREATE TABLE IF NOT EXISTS media (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    kind          TEXT NOT NULL,             -- video|gif|image|comic|game
    sha256        TEXT NOT NULL UNIQUE,      -- content hash (dedup)
    size          INTEGER NOT NULL,
    blob_path     TEXT NOT NULL,             -- relative path in /media
    title_enc     BLOB,                      -- encrypted display title
    notes_enc     BLOB,                      -- encrypted freeform notes
    source_enc    BLOB,                      -- encrypted origin URL
    rating        INTEGER NOT NULL DEFAULT 0,-- 0..5
    favorite      INTEGER NOT NULL DEFAULT 0,
    duration      REAL,                      -- seconds (video/gif)
    width         INTEGER,
    height        INTEGER,
    page_count    INTEGER,                   -- comics
    thumb_path    TEXT,                      -- encrypted thumbnail blob
    download_enc  BLOB,                      -- encrypted external download URL (games)
    gallery_enc   BLOB,                      -- encrypted JSON array of screenshot URLs (games)
    created_at    INTEGER NOT NULL,
    updated_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_media_kind    ON media(kind);
CREATE INDEX IF NOT EXISTS idx_media_created ON media(created_at);
-- The library grid's query, exactly: filter by kind, newest first, paged. With only
-- the single-column indexes above, SQLite picks one of them and sorts the rest by
-- hand — so every page of a large kind pays a full sort of that kind's rows before
-- returning fifty. This composite covers filter and order together, which turns the
-- paged read into an index walk. DESC matches the query's direction so the walk
-- doesn't have to be reversed.
CREATE INDEX IF NOT EXISTS idx_media_kind_created ON media(kind, created_at DESC);

CREATE TABLE IF NOT EXISTS game_gallery (
    game_id  INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
    media_id INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (game_id, media_id)
);
CREATE INDEX IF NOT EXISTS idx_game_gallery_game ON game_gallery(game_id, position);

-- Reusable image-generation character references. The original reference and the
-- derived appearance-only prompt tags are encrypted at rest like media metadata.
CREATE TABLE IF NOT EXISTS characters (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name_enc   BLOB NOT NULL,
    tags_enc   BLOB NOT NULL,
    image_enc  BLOB NOT NULL,
    mime       TEXT NOT NULL DEFAULT 'image/jpeg',
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tags (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    name     TEXT NOT NULL,
    -- Open-ended. general|performer|artist|studio|meta are the built-ins, but a
    -- YAML site parser's tag_groups names its own (parody, character, language,
    -- …) and they're created on demand — hence no CHECK constraint here.
    category TEXT NOT NULL DEFAULT 'general',
    UNIQUE(name, category)
);

CREATE TABLE IF NOT EXISTS media_tags (
    media_id INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
    tag_id   INTEGER NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
    source   TEXT NOT NULL DEFAULT 'manual',       -- manual|ai|scrape
    score    REAL,                                  -- ai confidence
    PRIMARY KEY (media_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_media_tags_tag ON media_tags(tag_id);

-- Where on a clip's timeline the AI saw each tag. One row per (tag, sampled
-- frame); media_tags still holds the item-level summary. Rebuilt from scratch on
-- every re-tag, so it always describes the run that produced the current tags.
CREATE TABLE IF NOT EXISTS media_tag_frames (
    media_id INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
    tag_id   INTEGER NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
    t        REAL NOT NULL,                        -- seconds from start
    score    REAL,                                 -- ai confidence at that frame
    PRIMARY KEY (media_id, tag_id, t)
);
CREATE INDEX IF NOT EXISTS idx_tag_frames_media ON media_tag_frames(media_id);

CREATE TABLE IF NOT EXISTS collections (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS collection_items (
    collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    media_id      INTEGER NOT NULL REFERENCES media(id)       ON DELETE CASCADE,
    position      INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (collection_id, media_id)
);

CREATE TABLE IF NOT EXISTS progress (
    user_id    INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
    media_id   INTEGER NOT NULL REFERENCES media(id)  ON DELETE CASCADE,
    position   REAL NOT NULL DEFAULT 0,   -- seconds or page index
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, media_id)
);

-- Background job queue (scrape + ai). Simple polled table.
CREATE TABLE IF NOT EXISTS jobs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    kind       TEXT NOT NULL,             -- scrape|ai_tag|thumbnail
    status     TEXT NOT NULL DEFAULT 'pending', -- pending|running|done|error
    payload    TEXT NOT NULL,             -- JSON
    error      TEXT,
    attempts   INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status, kind);

-- Resumable uploads. One row per file being uploaded; the bytes themselves live
-- in per-session staging directories under the cache root, never in the database.
--
-- The row is what makes an upload survive: the phone being backgrounded, the
-- browser tab being closed, the app being killed, the server being restarted. A
-- client that comes back asks which chunks arrived and sends only the rest.
CREATE TABLE IF NOT EXISTS upload_sessions (
    id           TEXT PRIMARY KEY,          -- opaque, hex; also the staging directory name
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- The client's own idea of "this file": name + size + last-modified. It is what
    -- turns a second press of the button into a resume rather than a second copy.
    fingerprint  TEXT NOT NULL,
    filename_enc BLOB,                      -- encrypted original filename
    title_enc    BLOB,                      -- encrypted display title, when given
    size         INTEGER NOT NULL,          -- total plaintext bytes expected
    chunk_size   INTEGER NOT NULL,          -- fixed for the life of the session
    mime         TEXT NOT NULL DEFAULT '',
    kind         TEXT NOT NULL DEFAULT '',  -- explicit media kind, when the client insists
    status       TEXT NOT NULL,             -- open|assembling|completed|failed|cancelled
    media_id     INTEGER,                   -- set once assembled
    error        TEXT,
    created_at   INTEGER NOT NULL,
    updated_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_user ON upload_sessions(user_id, updated_at DESC);
-- Partial and unique together: at most one *live* session per user per file, which is
-- the duplicate-upload guard the brief asks for, while a finished upload leaves the
-- fingerprint free so the same file can deliberately be sent again later.
CREATE UNIQUE INDEX IF NOT EXISTS idx_upload_sessions_live
    ON upload_sessions(user_id, fingerprint) WHERE status IN ('open','assembling');

CREATE TABLE IF NOT EXISTS upload_chunks (
    session_id TEXT NOT NULL REFERENCES upload_sessions(id) ON DELETE CASCADE,
    idx        INTEGER NOT NULL,
    size       INTEGER NOT NULL,
    sha256     TEXT NOT NULL DEFAULT '',    -- as verified on receipt, when the client sent one
    created_at INTEGER NOT NULL,
    PRIMARY KEY (session_id, idx)
);

-- Full-text search over decrypted-at-write searchable text (title + tags).
-- Note: content is only indexed if the user opts into plaintext search index.
CREATE VIRTUAL TABLE IF NOT EXISTS media_fts USING fts5(
    title, tags, notes,
    content=''                            -- external-content contentless index
);
