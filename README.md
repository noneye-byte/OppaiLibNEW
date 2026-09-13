# OppaiLib

Personal self-hosted media library. Not intended for general use; no support.

## Run

```bash
cp .env.example .env   # set OPPAI_PASSPHRASE and OPPAI_ADMIN_PASSWORD
docker compose up -d   # http://localhost:8080
```

The passphrase encrypts everything stored. There is no recovery if it is lost.

## Unraid

Image: `ghcr.io/noneye-byte/oppailib:latest`, built on every push to `main`
([docker-publish.yml](.github/workflows/docker-publish.yml)). Template:
[unraid/oppailib.xml](unraid/oppailib.xml).

| Container path | Purpose |
|----------------|---------|
| `/media` | encrypted blob store |
| `/config` | keystore, parsers, chat data |
| `/db` | SQLite — keep on a local pool, not SMB/NFS |
| `/cache` | upload staging; needs as much space as the largest upload |

Optional splits via `OPPAI_LIBBY_DIR`, `OPPAI_CHARACTER_DIR`, `OPPAI_CHAT_DIR`,
`OPPAI_TEMP_DIR`. Nothing moves itself: stop the container and copy the
directory across before setting one.

## Development

```bash
cd backend && go build ./cmd/oppailib
cd web && npm install && npm run dev
```

Notes: [docs/AI.md](docs/AI.md), [docs/API.md](docs/API.md), [android/README.md](android/README.md).
