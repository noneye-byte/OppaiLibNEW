# OppaiLib — Architecture & Tech Stack

A private, self-hosted, encrypted media library for adult content. Runs as a
single Docker container on Unraid, with a companion Android APK. Everything —
storage, inference, scraping — stays on the user's own hardware. No cloud, no
telemetry.

---

## 1. Tech stack (chosen, with justification)

| Layer | Choice | Why |
|-------|--------|-----|
| **Backend API** | **Go 1.23** (net/http, stdlib-first) | Compiles to a single static binary → tiny (~20 MB) Docker image, ideal for lean Unraid boxes. First-class crypto stdlib (AES-256-GCM), excellent concurrency for concurrent uploads/transcode orchestration, trivial cross-compile. No runtime/interpreter to ship. |
| **Database** | **SQLite** via `modernc.org/sqlite` (pure-Go, **cgo-free**) | Embedded, zero-admin, perfect for single-user/household. Pure-Go driver keeps the build static and cross-platform. FTS5 for full-text search. Sensitive fields encrypted at the app layer (see §4). |
| **Blob storage** | Custom **envelope-encrypted** file store on `/media` | Per-file AES-256-GCM with a random data key wrapped by a passphrase-derived master key. Blobs are self-describing and independently decryptable given the master passphrase → safe to back up. |
| **AI tagging** | **ONNX Runtime** (`onnxruntime_go`) running an open tagger model | Runs fully local on CPU, optional GPU. Model is swappable (a `.onnx` + labels file dropped into `/config/models`). CPU fallback always works. |
| **Scraper** | Pluggable Go interface + **YAML-defined** site parsers | New sites are added as config (CSS selectors) without recompiling. Ships with a generic OpenGraph/`<meta>` parser as the reference implementation. |
| **Web UI** | **Lit + Vite + `@material/web`** (official Material 3 web components) | Truest Material 3 fidelity on the web (dynamic color, M3 elevation/typography). Light framework, small bundle, served as static assets by the Go binary. |
| **Android** | **Kotlin + Jetpack Compose + Material 3** | Native M3 with dynamic color (Material You). Built as a sideloadable APK, same auth/crypto model as the server. |
| **Packaging** | Single **Docker image** + `docker-compose.yml` + **Unraid CA template XML** | A few-clicks deploy on Unraid. All config via env vars. |

**Why Go core + optional Python-free AI:** Keeping the whole server in one static
Go binary means the "single Docker image" goal is genuinely single — no Python
venv, no Node runtime at deploy time. The AI model runs through ONNX Runtime's C
library bundled in the image; there is no second service to orchestrate.

---

## 2. High-level architecture

```
                        ┌──────────────────────────────────────────┐
   Android APK  ───────▶│                OppaiLib server (Go)        │
   (Compose/M3)         │                                            │
                        │  net/http router                           │
   Web UI (Lit/M3) ────▶│   ├── /api/auth      auth + sessions       │
   served as static     │   ├── /api/media     CRUD, stream, upload  │
   assets by the binary │   ├── /api/tags      tag/collection mgmt    │
                        │   ├── /api/search    FTS + tag filters      │
                        │   ├── /api/scrape    URL → media + metadata │
                        │   └── /api/ai        auto-tag jobs          │
                        │                                            │
                        │  ┌─────────┐  ┌──────────┐  ┌───────────┐  │
                        │  │ crypto  │  │ storage  │  │   db       │  │
                        │  │ envelope│  │ enc blob │  │ sqlite+fts │  │
                        │  │ AES-GCM │  │  store   │  │ (metadata) │  │
                        │  └────┬────┘  └────┬─────┘  └─────┬─────┘  │
                        │       │            │              │        │
                        │  ┌────▼──────┐ ┌───▼───────┐ ┌────▼─────┐  │
                        │  │ scraper   │ │ ai tagger │ │ jobs/    │  │
                        │  │ (yaml     │ │ (onnx,    │ │ workers  │  │
                        │  │  parsers) │ │  cpu/gpu) │ │          │  │
                        │  └───────────┘ └───────────┘ └──────────┘  │
                        └──────────────┬──────────────┬──────────────┘
                                       │              │
                              /media (encrypted)  /config, /db (SQLite)
                              persistent volumes
```

### Request lifecycle (upload)
1. Client `POST /api/media` (multipart) with an auth session token.
2. Server hashes the stream (SHA-256) for dedup, generates a random per-file DEK.
3. Stream is encrypted chunk-by-chunk (AES-256-GCM) into `/media/<shard>/<hash>`.
4. The DEK is wrapped by the master KEK and stored in the blob header.
5. Metadata row is inserted into SQLite; sensitive fields encrypted at rest.
6. A background job enqueues thumbnail generation + AI auto-tagging.

### Request lifecycle (stream/view)
1. Client `GET /api/media/{id}/stream` with `Range` support.
2. Server opens the blob, unwraps the DEK with the KEK, and decrypts on the fly.
3. Bytes are streamed to the client over the authenticated session (TLS terminated
   by the user's reverse proxy; the app also supports its own TLS).

---

## 3. Data model (core tables)

- `users(id, username, pw_hash, created_at, is_admin)`
- `sessions(token, user_id, expires_at, created_at)`
- `media(id, kind, sha256, size, blob_path, title_enc, notes_enc, rating,
   duration, width, height, created_at, imported_from)` — `kind ∈
   {video, gif, image, comic, game}`
- `tags(id, name, category)` and `media_tags(media_id, tag_id, source)`
   (`source ∈ {manual, ai, scrape}`)
- `collections(id, name)` and `collection_items(collection_id, media_id, position)`
- `progress(user_id, media_id, position, updated_at)` — watch/read progress
- `scrape_jobs`, `ai_jobs` — background job queue
- `media_fts` — FTS5 virtual table mirroring searchable text

See [backend/internal/db/schema.sql](backend/internal/db/schema.sql).

---

## 4. Security & encryption model

- **Master passphrase → KEK.** On first run the admin passphrase is stretched with
  **Argon2id** (m=64 MiB, t=3, p=4) using a random salt stored in
  `/config/keystore.json`. The derived 32-byte key is the **Key-Encryption-Key
  (KEK)**. A verifier blob confirms the passphrase on later starts. The KEK is held
  only in memory.
- **Per-file DEK.** Each blob gets a fresh random 32-byte **Data-Encryption-Key**,
  used to encrypt content with **AES-256-GCM** in 64 KiB chunks (random nonce per
  chunk; AAD binds chunk index + a final-chunk terminator to prevent reordering and
  truncation). The DEK is wrapped by the KEK and stored in the blob header, so each
  blob is independently decryptable from the passphrase alone.
- **Encrypted metadata fields.** Free-text fields that can reveal content (title,
  notes, source URL) are stored AES-256-GCM-encrypted (`*_enc` columns). Tags and
  structural fields stay plaintext so search/indexing works; users who want tag
  secrecy can enable the "opaque tags" option (roadmap).
- **Auth.** Passwords hashed with Argon2id. Opaque random session tokens stored
  server-side with expiry. Android app adds optional PIN/biometric lock and a
  quick-lock gesture; panic/decoy mode is on the roadmap.
- **Backup guidance.** Losing the passphrase = unrecoverable data (by design).
  `keystore.json` + the SQLite DB + `/media` are the full backup set. The README
  covers key rotation and backup.

---

## 5. Repo layout

```
OppaiLib/
├── ARCHITECTURE.md            ← this file
├── README.md                  ← install / first-run / ops
├── Dockerfile                 ← multi-stage: build Go + web, ship static binary
├── docker-compose.yml
├── .env.example
├── unraid/oppailib.xml        ← Community Applications template
├── backend/
│   ├── go.mod
│   ├── cmd/oppailib/main.go
│   └── internal/
│       ├── config/            ← env-var configuration
│       ├── crypto/            ← envelope encryption + keystore
│       ├── storage/           ← encrypted blob store
│       ├── db/                ← sqlite + schema + migrations
│       ├── auth/              ← password hashing + sessions
│       ├── models/            ← shared types
│       ├── api/               ← http router + handlers
│       ├── scraper/           ← pluggable parsers (yaml-defined)
│       └── ai/                ← onnx tagger + cpu fallback
├── web/                       ← Lit + Vite Material 3 SPA  (module 6)
└── android/                   ← Kotlin/Compose Material 3   (module 7)
```

---

## 6. Build order (this project follows the prompt's module cadence)

1. ✅ Architecture + scaffold + packaging skeleton  ← **you are here**
2. ⏳ Backend core (config, DB, HTTP, auth/sessions)
3. ⏳ Storage / encryption layer
4. ⏳ Scraper framework + generic parser
5. ⏳ Local AI tagging module
6. ⏳ Web UI (Material 3)
7. ⏳ Android APK
8. ⏳ Unraid packaging polish + full README

Each module is committed and checked in before starting the next.
