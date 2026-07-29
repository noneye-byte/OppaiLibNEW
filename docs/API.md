# OppaiLib API

REST/JSON over HTTP. All routes are under `/api`. Auth is a Bearer session
token (also accepted as the `oppai_session` cookie for the browser SPA).

## Auth

| Method | Path | Body | Notes |
|--------|------|------|-------|
| POST | `/api/auth/login` | `{username, password}` | → `{token, user}`; also sets `oppai_session` cookie |
| POST | `/api/auth/logout` | — | invalidates the session |
| GET | `/api/auth/me` | — | → current `user` |
| POST | `/api/auth/password` | `{current, new}` | re-verifies `current` before setting `new` (8+ chars) |

### Passkeys (WebAuthn)

Password sign-in above is unchanged and remains the fallback — and the recovery path
when an authenticator is lost.

The two login routes are public; everything else needs a session, because a passkey is
added to an account you are already in rather than being a second way to create one.

| Method | Path | Body | Notes |
|--------|------|------|-------|
| POST | `/api/auth/passkey/login/begin` | `{username?}` | → `{ceremony, options}`. Omit `username` for a discoverable login. Answers identically for an account with no passkeys and one that does not exist |
| POST | `/api/auth/passkey/login/finish` | `{ceremony, credential, client}` | → `{token, user}` |
| GET | `/api/auth/passkeys` | — | → `{passkeys, available, reason?, relyingPartyId}` |
| POST | `/api/auth/passkeys/begin` | — | → `{ceremony, options}` |
| POST | `/api/auth/passkeys/finish` | `{ceremony, name, credential}` | → the created passkey |
| PATCH | `/api/auth/passkeys/{id}` | `{name}` | rename; scoped to the owner |
| POST | `/api/auth/passkeys/{id}/revoke` | `{password}` | 204. The password is required: a live session is not proof of who is at the keyboard, and you cannot confirm revoking a passkey with that passkey |

`ceremony` is an opaque handle to the challenge the server issued. The client carries it
back but never the challenge itself, and it is single-use and expires in 5 minutes —
that is the replay protection.

`available` is false on plain HTTP away from localhost, where browsers refuse WebAuthn
outright; `reason` explains it in words worth showing. `relyingPartyId` is the domain the
passkeys are bound to — one registered at a hostname is not offered at the LAN IP, which
is WebAuthn working as designed.

`Authorization: Bearer <token>` is required on all routes below.

## Health

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/health` | → `{status, aiEnabled, aiTagger}` (public) |

## Media

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/media?kind=&limit=&offset=` | list, newest first. `kind ∈ video\|gif\|image\|comic\|game` |
| POST | `/api/media` | multipart: `file` (required), `title`, `source`, `kind`. → `{id, sha256, deduped}` |
| GET | `/api/media/{id}` | full media incl. `tags` |
| GET | `/api/media/{id}/stream` | decrypts + streams the blob (browser uses cookie auth) |
| GET | `/api/media/{id}/thumb` | poster frame (video), comic cover, or the item's own bytes |
| POST | `/api/media/{id}/autotag` | runs the AI tagger synchronously → `{tags}`. Videos and GIFs are sampled across several frames, so this can take a while. |

## Resumable uploads

`POST /api/media` remains the path for a picture: one request, one file. A large file
goes through a session instead, because a single request has to survive the whole
transfer — a phone's screen turning off, a reverse proxy's body limit, a lift ride
through a dead spot — and if it fails at 94% it starts again from zero.

The server is the authority on what has arrived. A client that was killed mid-upload
asks what is already there and sends the difference; nothing about resuming depends on
the client having remembered anything, which matters because the failures this survives
are exactly the ones that destroy client state.

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/uploads` | this user's sessions, newest first — including finished ones, which is the upload manager's history |
| POST | `/api/uploads` | `{filename, size, mime?, title?, kind?, fingerprint, chunkSize?}` → a session. A live session with the same `fingerprint` is **returned rather than duplicated**, which is what makes a second press of the button a resume |
| GET | `/api/uploads/{id}` | → the session, including `received`: the chunk indices the server holds |
| PUT | `/api/uploads/{id}/chunk/{idx}` | raw body, exactly one chunk. Optional `X-Chunk-SHA256` header is verified on receipt |
| POST | `/api/uploads/{id}/complete` | assembles into a library item → `{id, sha256, deduped}`. Optional `{sha256}` verifies the whole file |
| DELETE | `/api/uploads/{id}` | cancels and reclaims the staged chunks |

Notes worth knowing before writing a client:

- **Chunk sizes are fixed for the life of a session** and dictated by the server
  (it clamps whatever you ask for into 1–64 MiB). Every chunk but the last must be
  exactly `chunkSize`; a short one is refused rather than stored, since a truncated
  chunk is a corrupt file discovered weeks later.
- **Send the complement of `received`.** Order does not matter and chunks may be sent
  concurrently.
- **Completing early is not an error.** If chunks are missing the response is `409`
  with `{missing: [...]}` and the session stays open — the parts already sent remain
  valid.
- **Completing twice is safe.** A session that already finished answers with its media
  id, so a retry after a lost response does not read as a failure.
- `507` on create means there is not enough disk; the message names which volume and
  which environment variable moves it.
- Sessions are scoped to their owner, and abandoned ones are swept along with their
  staged bytes (see Storage).

## Storage

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/storage` | the configurable mappings, the volume each landed on, what is on it, and warnings naming the mapping to expand |
| POST | `/api/storage/cleanup` | **admin only.** `{categories: ["uploads","temp"]}` → what it freed, plus a fresh report |

Cleanup only ever removes bytes the application can recreate: staged chunks of uploads
nobody came back to finish, and scratch files from jobs that have ended. Original media,
Libby's memories and model files are never touched by a policy — removing one of those
stays an explicit act in the screen that owns it.

## Comics

Comics are read page-by-page out of the archive server-side — the client never
downloads the file. Only zip containers (`.cbz`, `.zip`) can be opened in-app;
`.cbr`/`.pdf` report `readable: false` and the UI offers a download instead.

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/media/{id}/comic` | → `{readable, pages, reason?}`; also refreshes the stored `pageCount` |
| GET | `/api/media/{id}/page/{n}` | streams page `n` (1-based) as an image |

## Settings

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/settings` | → `{settings, readOnly}` — editable values plus env/build facts |
| PUT | `/api/settings` | **admin only.** Partial body merges over current; applied live, no restart |
| GET | `/api/stats` | → `{kinds:[{kind,count,bytes}], items, bytes, tags}` |

Env vars supply the defaults; a saved setting overrides one for the install.
Anything that can't change without a restart (model dir, inference device,
paths) is reported under `readOnly`.

`chatModelDir` names text-generation-webui's models folder *as this container sees it*.
It has one purpose — deleting a model, which that backend exposes no API for — and is
deliberately not defaulted, because guessing a path and deleting what is found there is
not a thing to do on someone's model collection. Blank means the delete controls are
absent.

## Diagnostics

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/diagnostics` | **admin only.** → process facts, DB pool state, and a metric snapshot |
| POST | `/api/diagnostics/reset` | **admin only.** zeroes the counters and restarts the window |

Timing keys are routing patterns (`http.GET /api/media/{id}`), never concrete paths, and
outbound fetches appear as `scrape.fetch.<host>` — so one request's own duration can be
read next to the third-party fetch it was waiting on. Percentiles are interpolated from
fixed buckets and are estimates.

`dbWal` is the field to read first. When it is false the database could not enter WAL
mode and every query in the process is serialized on one connection, which outweighs
everything else on the page. The usual cause is the database living on a network share.

## Browsable sources

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/sources` | → `{sources:[{id,name,host,feeds,userAdded}]}` |
| GET | `/api/sources/{id}/icon` | the site's favicon, fetched and cached by the server |
| POST | `/api/sources/analyze` | **admin only.** `{url}` → `{yaml, notes, preview, previewError?, existing?}` |
| POST | `/api/sources` | **admin only.** `{yaml}` → `{id, name}`; browsable immediately, no restart |
| DELETE | `/api/sources/{id}` | **admin only.** 204. User-added only — a built-in can be overridden by id but not deleted |

`analyze` fetches one listing page through the scrape engine (so it inherits the SSRF
dial guard, the throttle, robots handling and the retry policy) and proposes an adapter.
`preview` holds the items that proposal actually extracted from that page: CSS selectors
cannot be judged by reading them, so the review step is "do these tiles look right".

A saved definition is selectors plus a URL template interpreted by the YAML source —
nothing generated is compiled or executed. Saving validates the id (it becomes a
filename), the scheme, and refuses a bare `*` in `hosts`, since that list is the
streaming proxy's allowlist.

## Text-generation models

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/chat/models` | → `{models, loaded, supported}` |
| POST | `/api/chat/models/load` | `{modelName, args?}` |
| POST | `/api/chat/models/unload` | — |
| GET | `/api/chat/models/inspect?model=` | **admin only.** → what deleting it would remove: path, every file, bytes, `loaded`, free space, trash path |
| POST | `/api/chat/models/delete` | **admin only.** `{model, confirm, permanent?}` → `{name, movedTo?, bytes, files, models}` |

`confirm` must repeat the model's name. Not a boolean: a boolean is satisfied by any
retry or replayed request and proves nothing about what the user saw.

Deleting moves the model to a stamped folder in `.oppailib-trash` inside the models root
unless `permanent` is set. The loaded model cannot be deleted, and that check fails
*closed* — a backend that cannot answer the probe is treated as possibly loaded, because
the alternative is removing weights from under a running model because a probe timed out.

```jsonc
{
  "settings": {
    "aiEnabled": true, "aiAutoTag": true, "aiMinScore": 0.35, "aiMaxTags": 20,
    "scrapeDelayMs": 1500, "scrapeUserAgent": "…", "scrapeRespectRobots": true
  },
  "readOnly": {
    "version": "…", "aiTagger": "heuristic", "aiModelDir": "/config/models",
    "aiDevice": "cpu", "mediaDir": "/media", "dbPath": "/db/oppailib.sqlite",
    "ffmpeg": true, "sessionHours": 720
  }
}
```

### Media object
```jsonc
{
  "id": 1, "kind": "image", "sha256": "…", "size": 77,
  "title": "…", "notes": "…", "source": "…",
  "rating": 0, "favorite": false,
  "width": 10, "height": 14, "duration": 0, "pageCount": 0,
  "tags": [{ "id": 1, "name": "portrait", "category": "meta", "source": "ai", "score": 1 }],
  "createdAt": 1700000000, "updatedAt": 1700000000
}
```
`title`, `notes`, and `source` are stored AES-256-GCM-encrypted at rest and
decrypted for the response.

## Scraping

| Method | Path | Body | Notes |
|--------|------|------|-------|
| POST | `/api/scrape` | `{url}` | fetch + parse; → `ScrapeResult` (preview, imports nothing) |
| POST | `/api/scrape/import` | `{url?, mediaUrls?, title?, tags?}` | downloads chosen assets into the encrypted store; → `{imported, count}` |

### ScrapeResult
```jsonc
{
  "title": "…", "description": "…",
  "tags": ["…"], "performers": ["…"],
  "mediaUrls": ["https://…"], "sourceUrl": "https://…",
  "kind": "image"
}
```

## Errors
Non-2xx responses are `{"error": "message"}`. `401` clears the client session.
