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
    gen_enc       BLOB,                      -- encrypted JSON generation record (studio images)
    description_enc BLOB,                    -- encrypted prose from the vision model (see api/vision_describe.go)
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
-- Favourites is a nav section, not a rare query: it is one of the few screens
-- someone opens every session, and it used to be filtered in the browser over the
-- whole downloaded library. Same shape as the composite above — filter and order in
-- one walk — for `WHERE favorite = 1 ORDER BY created_at DESC`.
CREATE INDEX IF NOT EXISTS idx_media_favorite_created ON media(favorite, created_at DESC);

CREATE TABLE IF NOT EXISTS game_gallery (
    game_id  INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
    media_id INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (game_id, media_id)
);
CREATE INDEX IF NOT EXISTS idx_game_gallery_game ON game_gallery(game_id, position);

-- Save files backed up for a game. Deliberately *not* rows in media: a save is not
-- something you browse, view, tag, or thumbnail, and putting it there would mean
-- filtering it out of every library query, grid, and tagging pass forever. It is an
-- attachment to one game, and it is modelled as one.
--
-- The blob lives in the same encrypted store as everything else, and the label is
-- encrypted for the same reason media titles are: a filename like
-- "day3_after_maid_route.sav" is exactly as revealing as the game's own title.
--
-- sha256 is recorded but NOT unique. Two saves from the same point in a game are
-- byte-identical surprisingly often, and re-uploading a save you already have is a
-- normal thing to do — it must create a second, separately-deletable entry rather
-- than collide the way deduplicated media does.
CREATE TABLE IF NOT EXISTS game_saves (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id    INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
    label_enc  BLOB NOT NULL,
    blob_path  TEXT NOT NULL,
    sha256     TEXT NOT NULL,
    size       INTEGER NOT NULL,
    created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_game_saves_game ON game_saves(game_id, created_at DESC);

-- Where a game came from — an itch.io page or an F95zone thread — and what the
-- site said about it the last time anyone looked. This is what makes "is there a
-- newer version than mine?" answerable without the user remembering which thread
-- a game came out of. ref_enc seals the page URL and the site's own id for the
-- game: an F95zone thread number is as good as a title to anyone who can type it
-- into a browser, so it is ciphertext like the title is. The site name and the
-- version strings stay plain — "0.7.2" says nothing on its own, and the update
-- sweep wants to compare them without decrypting every row.
--
-- known_version is what the user has; latest_version is what the site reports.
-- known only moves when the user says so (an install, an acknowledgement), so an
-- update stays flagged until it is actually acted on.
CREATE TABLE IF NOT EXISTS game_remote (
    game_id        INTEGER PRIMARY KEY REFERENCES media(id) ON DELETE CASCADE,
    site           TEXT NOT NULL,                 -- itch|f95
    ref_enc        BLOB NOT NULL,                 -- encrypted JSON {id, url}
    known_version  TEXT NOT NULL DEFAULT '',
    latest_version TEXT NOT NULL DEFAULT '',
    changelog_enc  BLOB,                          -- what changed, encrypted like notes
    checked_at     INTEGER NOT NULL DEFAULT 0,
    update_seen_at INTEGER NOT NULL DEFAULT 0     -- when latest first differed from known
);

-- The desktop launcher's (Launchy's) side of a game: that it is installed on the
-- PC, how long it has been played there, and which launcher entry it is. Written
-- only by the launcher's sync; read by every client that wants to offer "launch on
-- PC" or show playtime next to the cover. One launcher entry pairs with one game.
CREATE TABLE IF NOT EXISTS game_launchy (
    game_id      INTEGER PRIMARY KEY REFERENCES media(id) ON DELETE CASCADE,
    launchy_id   TEXT NOT NULL,
    installed    INTEGER NOT NULL DEFAULT 0,
    version      TEXT NOT NULL DEFAULT '',
    play_seconds INTEGER NOT NULL DEFAULT 0,
    last_played  INTEGER NOT NULL DEFAULT 0,       -- unix seconds, 0 = never
    launch_count INTEGER NOT NULL DEFAULT 0,
    updated_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_game_launchy_launchy ON game_launchy(launchy_id);

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
    -- How much of the item this tag describes, 0..1. For a video or an animation it
    -- is the share of sampled frames the tag was seen in, so a clip that is mostly
    -- one thing with a moment of another carries both tags but says which is which.
    -- NULL means unmeasured (a manual tag, a scrape, an older run) and reads as 1:
    -- a tag someone wrote on an item is true of the whole item until proven otherwise.
    weight   REAL,
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

-- Scene bookmarks: a moment in a video worth coming back to. Progress is one
-- position per item and is overwritten as you watch; a bookmark is a position you
-- chose and named, and there can be several on one clip. Per user like progress,
-- because "the good part" is an opinion. The label is encrypted for the reason a
-- title is: what somebody calls a moment says what the moment is. thumb_path is a
-- frame grabbed at the mark, stored in the blob store like a poster, so a list of
-- bookmarks can show what each one looks like without decrypting the video again.
CREATE TABLE IF NOT EXISTS bookmarks (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
    media_id   INTEGER NOT NULL REFERENCES media(id)  ON DELETE CASCADE,
    position   REAL NOT NULL,             -- seconds from the start
    label_enc  BLOB,
    thumb_path TEXT,
    created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bookmarks_media ON bookmarks(user_id, media_id, position);

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

-- What the studio's models are on Civitai.
--
-- InvokeAI holds the weights, one cover picture, a description and trigger phrases;
-- it has no idea where a file came from. This is the rest of what the catalogue
-- said about a model — its Civitai ids, the preview gallery, the creator, the
-- version that is current — keyed by the InvokeAI record so the picker can show it
-- and an update can be noticed. A row with model_id 0 means the file was looked up
-- by hash and is not on Civitai, so it is not looked up again until checked_at is
-- old. Nothing here is library content: it is a public catalogue's metadata about a
-- model file, and stays plaintext like tags do.
CREATE TABLE IF NOT EXISTS civitai_models (
    model_key         TEXT PRIMARY KEY,          -- InvokeAI's key for the record
    hash              TEXT NOT NULL DEFAULT '',  -- blake3, upper hex, as both sides report it
    model_id          INTEGER NOT NULL DEFAULT 0,
    version_id        INTEGER NOT NULL DEFAULT 0,
    latest_version_id INTEGER NOT NULL DEFAULT 0,
    model_name        TEXT NOT NULL DEFAULT '',
    version_name      TEXT NOT NULL DEFAULT '',
    model_type        TEXT NOT NULL DEFAULT '',
    base_model        TEXT NOT NULL DEFAULT '',
    creator           TEXT NOT NULL DEFAULT '',
    description       TEXT NOT NULL DEFAULT '',  -- plain text, already stripped of markup
    trained_words     TEXT NOT NULL DEFAULT '[]', -- JSON list
    previews          TEXT NOT NULL DEFAULT '[]', -- JSON list of image URLs
    checked_at        INTEGER NOT NULL,
    cover_url         TEXT NOT NULL DEFAULT ''   -- the preview chosen as cover art, if one was
);

-- A model InvokeAI is downloading on our behalf, with what it should be told about
-- itself once the file is in. InvokeAI's install job is the authority on progress;
-- this row is only the promise to apply the catalogue's cover, description and
-- trigger words when the job reports completed, which is what makes a model
-- installed from the browser look the way it does on Civitai instead of arriving as
-- a bare filename with a black tile.
CREATE TABLE IF NOT EXISTS civitai_installs (
    source      TEXT PRIMARY KEY,               -- the download URL handed to InvokeAI
    model_id    INTEGER NOT NULL,
    version_id  INTEGER NOT NULL,
    created_at  INTEGER NOT NULL,
    replace_key TEXT NOT NULL DEFAULT ''        -- an older record to delete once this one is in (an update)
);

-- media_fts was an FTS5 table for title/tags/notes that nothing ever wrote a row to
-- and nothing ever queried — the opt-in that would have populated it was never
-- built, so it sat empty while the architecture doc advertised it as how search
-- worked. Search is the in-memory index in api/chat_library_index.go: the KEK holder
-- decrypts titles once and keeps the postings in process memory, which is the only
-- place they can be searched without writing plaintext to disk.
--
-- Dropped rather than left in place, so nobody reads the schema and believes search
-- is indexed here. If on-disk indexing is ever wanted (a library past the index's
-- 200k ceiling, or search that survives a restart without a rebuild), the thing to
-- build is a blind index — HMAC each token under the KEK and index the digests —
-- not this, which would have put every title on disk in plaintext and undone
-- title_enc.
DROP TABLE IF EXISTS media_fts;
