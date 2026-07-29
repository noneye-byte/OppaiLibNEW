<p align="center">
  <img src="logo.png" alt="OppaiLib" width="128" height="128" />
</p>

# OppaiLib

A private, **self-hosted, encrypted** media library for adult (NSFW) content —
videos, GIFs, images, comics, and game/game-page entries — with tagging, search,
URL scraping, and **fully local** AI auto-tagging. Runs as a single Docker
container on Unraid, with a companion Android app.

**Everything stays on your box:** no cloud storage, no cloud AI, no telemetry.

> ⚠️ **Read the [encryption](#encryption--key-handling) section before you start.**
> Your master passphrase encrypts all stored media and **cannot be recovered if
> lost.**

---

## Features

- **Content types:** videos, GIFs, images, comics (cbz/cbr/pdf), and game entries.
- **In-app comic reader:** cbz/zip comics are paged through server-side — one page
  streamed at a time, straight out of the encrypted archive, with saved reading
  position. (cbr/pdf still download.)
- **Encrypted at rest:** per-file AES-256-GCM envelope encryption; sensitive
  metadata fields encrypted in the database.
- **Library management:** upload, folder import, collections, favorites, ratings,
  hash-based dedup.
- **URL scraping:** paste a URL → extract media + metadata. Pluggable, YAML-defined
  site parsers; ships a generic OpenGraph parser. Rate-limited, honors robots.txt.
- **Local AI auto-tagging:** heuristic tagger out of the box (CPU, zero setup);
  opt-in ONNX classifier for real content tags. Images, GIFs, and videos are all
  tagged. Video sampling is **scene-aware and length-adaptive** — frames are taken
  from a clip's detected scenes (not a fixed clock), and a longer clip earns more of
  them, so the tags describe what actually happens. No external calls. See
  [docs/AI.md](docs/AI.md).
- **Libby, your library's companion:** a built-in adult AI chat character who knows
  your collection — she can recommend and open items, react to what's on your screen
  while you **browse together**, comment on a video as you watch it, send pictures of
  herself, and shift expression and mood as you talk. She can also offer to import a
  URL, tag or favorite an item, or generate a picture; every proposed action is shown
  on a card and waits for you to press **Allow**. Custom character cards (SillyTavern
  V2 / PNG) and custom outfits are supported. Talks to any local OpenAI-compatible
  LLM you point it at; nothing leaves the box. Works on web and Android.
- **Local image generation:** optional bridge to a self-hosted image generator
  (auto-detects InvokeAI), with a Civitai model browser, character prompts, and a
  one-tap path from a generated image into the library.
- **Material 3 everywhere:** responsive web UI (dark by default) + native Android app.

Verified working end-to-end: login, encrypted upload/stream round-trip, dedup,
AI tagging, scraping, and the embedded web UI are exercised against a running
container as part of the build.

---

## Architecture

Go backend (single static binary) · SQLite metadata · encrypted blob store ·
Lit + Material 3 web UI (embedded in the binary) · Kotlin/Compose Android app ·
optional ONNX AI. Full write-up in [ARCHITECTURE.md](ARCHITECTURE.md);
API in [docs/API.md](docs/API.md).

```
Android app ─┐
Web UI ──────┼──▶ Go API ──▶ crypto (envelope AES-256-GCM)
             │              ├─▶ storage  → /media (encrypted blobs)
             │              ├─▶ sqlite   → /db
             │              ├─▶ scraper  (YAML parsers)
             │              └─▶ ai tagger (heuristic | ONNX)
```

---

## Quick start (docker-compose)

```bash
git clone https://github.com/ErrorWave/OppaiLib.git oppailib && cd oppailib
cp .env.example .env
# edit .env: set OPPAI_PASSPHRASE and OPPAI_ADMIN_PASSWORD
docker compose up -d
```
Open `http://localhost:8080` and sign in with your admin credentials.

---

## Unraid install

The image is built and published automatically to the **GitHub Container
Registry (GHCR)** on every push to `main` and on version tags (see
[.github/workflows/docker-publish.yml](.github/workflows/docker-publish.yml)):

```
ghcr.io/errorwave/oppailib:latest
```

> The GHCR package is created **private** on the first publish. Make it public
> once at *github.com/users/ErrorWave/packages/container/oppailib/settings →
> Danger Zone → Change visibility → Public*. After that, Unraid pulls it with
> **no authentication**.

1. **Community Applications template:** the template lives at
   [unraid/oppailib.xml](unraid/oppailib.xml). Add it via *Docker → Add Container
   → Template* (or host the XML and point CA at it). It pre-fills all paths/ports
   and already points at the registry image above.

2. **Path mappings** (defaults shown — adjust to your share):

   | Container path | Host path | Purpose |
   |----------------|-----------|---------|
   | `/media` | `/mnt/user/appdata/oppailib/media` | encrypted blob store |
   | `/config` | `/mnt/user/appdata/oppailib/config` | keystore, AI models, parsers, character and chat data, Libby's memories |
   | `/db` | `/mnt/user/appdata/oppailib/db` | SQLite database — keep this on a **local pool**, not an SMB/NFS share (see below) |
   | `/cache` | `/mnt/user/appdata/oppailib/cache` | upload staging and processing scratch |

   `/cache` is the one people leave out and then wonder why the Docker image
   fills up. It is regenerable — delete it with the container stopped and you
   lose unfinished uploads and nothing else — but it is not small: a resumable
   upload holds the whole file there until it is stored, so uploading a 12 GB
   video needs 12 GB of it. Unmapped, all of that lands inside the container's
   own image allocation, which on Unraid is a fixed size shared with every other
   container on the box.

   Four further mappings are optional and blank by default, each splitting one
   directory out of the mapping it lives in now: `OPPAI_LIBBY_DIR` (Libby's
   memories), `OPPAI_CHARACTER_DIR`, `OPPAI_CHAT_DIR` and `OPPAI_TEMP_DIR`
   (scratch, out of `/cache`). They exist so the data you would least like to
   lose can sit on its own share with its own backup schedule. **Nothing moves
   itself:** stop the container, copy the existing directory to the new share,
   then set the variable — otherwise the app comes up correctly configured and
   empty. Library links, tags and ratings are unaffected either way, because the
   database stores blob paths relative to `/media` rather than absolute ones.

   **Storage diagnostics.** *Settings → Storage* shows every mapping, the volume
   it actually landed on, how full that volume is, and which environment variable
   moves it. It warns before a share fills rather than after, names the mapping to
   expand, and reports what a cleanup would reclaim. An admin can reclaim it from
   the same page; that only ever removes staged chunks of abandoned uploads and
   leftover scratch, never media, memories or models.

   **On the Docker image being "too small":** prefer fixing the mappings above.
   Growing the image (*Settings → Docker → stop the service → increase the vDisk
   size*) buys room for data that should not have been in there to begin with, and
   it is the mapping — not the image — that a 4K library needs. If you do resize
   it, the container must be stopped and there is no supported way to shrink it
   back.

3. **Port:** `8080` (change the host side if it clashes).

4. **Required variables:**
   - `OPPAI_PASSPHRASE` — master encryption passphrase. Leave blank on the first
     run to have one generated and printed to the container log — then **save it**.
   - `OPPAI_ADMIN_USER` / `OPPAI_ADMIN_PASSWORD` — first-run admin account (a
     password is generated and logged if you leave it blank).

5. Start the container, watch the log for any generated secrets, then browse to
   `http://<server-ip>:8080`.

### GPU (optional)
For accelerated AI, pass through an Nvidia GPU (uncomment the `deploy` block in
[docker-compose.yml](docker-compose.yml) or add `--gpus all`), mount a CUDA build
of `libonnxruntime.so`, and set `OPPAI_AI_DEVICE=cuda`. If CUDA cannot be
enabled, the tagger logs a warning and runs on CPU rather than failing.

---

## First-run setup

1. On first boot OppaiLib derives the encryption key from `OPPAI_PASSPHRASE`
   (Argon2id) and writes `/config/keystore.json` (salt + verifier only — never the
   passphrase or key).
2. The admin user is created from `OPPAI_ADMIN_USER`/`OPPAI_ADMIN_PASSWORD`.
3. Sign in, then **Upload** files or **Scrape** a URL (the ⛓ / ⬆ buttons).

---

## Encryption & key handling

- **Master passphrase → KEK** via Argon2id (m=64 MiB, t=3, p=4). Held only in
  memory.
- **Per-file DEK** (random, 32 bytes) encrypts each blob with AES-256-GCM in
  64 KiB chunks; the DEK is wrapped by the KEK and stored in the blob header, so
  each blob is independently decryptable from the passphrase.
- **Metadata:** `title`, `notes`, and `source` are stored encrypted.

**Backup set:** `/config/keystore.json` + `/db` + `/media`. Back these up
together.

**⚠️ There is no passphrase recovery.** If you lose `OPPAI_PASSPHRASE` *and*
`keystore.json`, your media is unrecoverable — that's the point. Store the
passphrase in a password manager.

**Key rotation:** re-encryption tooling (`oppailib rekey`) is on the roadmap. For
now, changing the passphrase requires re-importing media.

---

## Adding site scrapers

Drop a YAML file into `/config/parsers/` describing the CSS selectors for a site.
Copy [parsers/example.yaml](parsers/example.yaml) as a template. No rebuild
needed — restart to load. If no site parser matches a URL, the built-in generic
OpenGraph parser is used.

OppaiLib rate-limits per host (`OPPAI_SCRAPE_DELAY_MS`) and honors robots.txt.
It ships **no** commercial-site parsers by default — add only sites you're
permitted to scrape.

---

## AI tagging

The default image ships a [wd14](https://huggingface.co/SmilingWolf/wd-vit-tagger-v3)
tagger baked in, so images, GIFs and videos are content-tagged out of the box —
a `rating` tag (`general`/`sensitive`/`questionable`/`explicit`) plus hundreds of
possible `general` and `character` tags. Everything runs locally; nothing is sent
anywhere.

Videos are sampled **by scene**: OppaiLib asks ffmpeg where the picture changes
enough to read as a cut and tags a frame from each scene, so every scene is
represented instead of whatever happened to line up with a fixed timestamp. The
frame count also **scales with length** (a floor for short clips, more for long
ones), and one-frame noise is pruned from densely sampled clips. Per-tag timestamps
are recorded so the viewer can mark them on the video's timeline.

This makes the image ~540MB. If you would rather not carry the model, pull
`ghcr.io/errorwave/oppailib:lean` (or build `--target runtime`) for a lean,
cgo-free image that falls back to structural `meta` tags only. See
[docs/AI.md](docs/AI.md) to swap the model or tune thresholds.

---

## Android app

Native Kotlin/Compose Material 3 client. Build + sideload instructions in
[android/README.md](android/README.md).

---

## Development

```bash
# backend (needs Go 1.25+, or build via Docker)
cd backend && go build ./cmd/oppailib

# web (needs Node 20+)
cd web && npm install && npm run dev   # proxies /api to :8080

# full image
docker build -t oppailib .
```

---

## Constraints & privacy

All content and inference stay local. No cloud storage, no cloud AI APIs, no
telemetry. The scraper is a personal tool with rate limiting and robots.txt
respect; it ships only a generic parser. No copyrighted third-party assets are
bundled.

## License

Add your chosen license here (e.g. MIT / AGPL-3.0).
