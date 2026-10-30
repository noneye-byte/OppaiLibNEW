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
| GET | `/api/media?kind=&q=&tag=&favorite=&minRating=&sort=&limit=&offset=` | one page of the library → `{items, total}`. See below. |
| GET | `/api/media/stats` | the library's shape without its rows → `{total, byKind, favorites, thisWeek, bytes}` |
| GET | `/api/tags/top?kind=&limit=` | the most-used tags, for filter chips → `{items:[{name,count}]}` |
| POST | `/api/media` | multipart: `file` (required), `title`, `source`, `kind`. → `{id, sha256, deduped}` |
| GET | `/api/media/{id}` | full media incl. `tags` |
| GET | `/api/media/{id}/stream` | decrypts + streams the blob (browser uses cookie auth) |
| GET | `/api/media/{id}/thumb` | poster frame (video), comic cover, or the item's own bytes |
| POST | `/api/media/{id}/autotag` | runs the AI tagger synchronously → `{tags}`. Videos and GIFs are sampled across several frames, so this can take a while. |
| POST | `/api/media/{id}/describe` | asks the vision model what the picture shows and stores the prose → `{description}`. Pictures, GIFs and videos only; 503 when no vision model is configured. Minutes, not seconds, on a CPU. |
| GET | `/api/ai/describe` | → `{enabled, model, auto, undescribed, backfilling}` |
| POST | `/api/ai/describe/probe` | sends the vision model a generated test picture → `{ok, description}` |
| POST | `/api/ai/describe/backfill` | describes everything that has no description, one at a time, in the background → `{started}` |
| DELETE | `/api/ai/describe/backfill` | stops the walk. 204 |

### Listing, searching and sorting

`GET /api/media` is the one endpoint a library screen needs:

| Param | Meaning |
|-------|---------|
| `kind` | one of `video\|gif\|image\|comic\|game`; absent means every kind |
| `q` | words that must **all** match a title, note, tag name or tag category |
| `tag` | one exact tag, as the filter chips use |
| `favorite` | `1` for favourites only |
| `minRating` | `1`–`5`: rated at least this many stars. `0`, absent or out of range keeps everything |
| `sort` | `newest` (default), `oldest`, `rating`, `largest` |
| `limit` | capped at 200, default 50 |
| `offset` | where the page starts |

`total` in the response is how many rows match the filter, not how many were
returned — it is what lets a client page without holding the rest.

There is no sort by title, and there cannot be: `title_enc` is ciphertext, so
SQLite has nothing meaningful to order by.

**How `q` works.** Everything except the free-text search is a SQL filter. The search
cannot be, because titles and notes are encrypted at rest — no index over the database
file can match one. It is answered instead from an in-memory index that the process
holding the KEK builds by decrypting every title once
([chat_library_index.go](../backend/internal/api/chat_library_index.go), originally
built so Libby could be asked about the collection by name). Nothing decrypted is
written back to disk; a stolen database file still yields ciphertext.

Two consequences worth knowing:

- A search can be up to a few seconds stale on a *retitle* (the index is refreshed on a
  stamp check, on a timer, and whenever a handler that edited text says so). Filtering
  and sorting without `q` never go near it and are always exactly fresh.
- A library past the index's 200,000-row ceiling indexes its newest rows and searches
  those. If that ever matters, the thing to build is a blind index — HMAC each token
  under the KEK and index the digests — not a plaintext FTS table, which would undo
  `title_enc`.

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

## Games

Three things hang off a game, all keyed on its media id. All require the item's
`kind` to be `game`; anything else answers `400`.

### Gallery

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/media/{id}/gallery` | user-uploaded screenshots and clips for the game |
| POST | `/api/media/{id}/gallery` | multipart `file`; accepts photos, GIFs and videos |
| DELETE | `/api/media/{id}/gallery/{media}` | detaches one |

### Save files

A save is an *attachment* on a game, not a library item — it never appears in the
grid, in search, or in tagging. Bytes are stored encrypted like any blob and the
label is encrypted like a media title.

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/media/{id}/saves` | → `{items: [GameSave]}`, newest first |
| POST | `/api/media/{id}/saves` | multipart `file`, optional `label` field; → the created `GameSave` |
| GET | `/api/media/{id}/saves/{save}` | the bytes back, always `application/octet-stream` as an attachment |
| DELETE | `/api/media/{id}/saves/{save}` | `204`, or `404` if it was never there |

```jsonc
// GameSave
{ "id": 12, "gameId": 4, "label": "Day 3 — before the fork",
  "size": 40960, "sha256": "…", "createdAt": 1754131200 }
```

Uploads are accepted as opaque bytes: a save is whatever the game writes, so no kind
recognition runs on it. Unlike media, saves are **not** deduplicated by hash —
re-uploading identical bytes creates a second, separately deletable entry, because
saving the same state twice is normal and collapsing them would be data loss. A
save id is only ever resolved together with its game, so one game's id cannot read
another's save. Maximum 100 MB per save.

### Playing in the browser

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/media/{id}/play` | how (or whether) this game can be played; `404` when it can't |
| GET | `/api/media/{id}/play/{path...}` | one file out of a self-hosted build |

`/play` answers in one of two modes, and a self-hosted build always wins — it's the
copy you own and it works offline:

```jsonc
{ "playable": true, "mode": "local", "entry": "index.html" }
{ "playable": true, "mode": "embed",
  "embedUrl": "https://html-classic.itch.zone/html/14744633/index.html" }
```

**`local`** — the game was imported as a zip containing an `index.html`, the same
contract itch.io enforces on a web upload. Nothing is unpacked to disk; the zip is
read through the store's decrypting random-access view, and a wrapper directory
(`MyGame-web/index.html`) is stripped so paths are relative to the build root.
Content types come from a fixed allowlist; anything unrecognised is served
`application/octet-stream`.

**`embed`** — the game is a browser-only itch.io project, which **cannot** be
self-hosted: itch never offers the HTML build as a download, only the project page,
so there is nothing to import. The server resolves the project page to itch's own
iframe URL (read from the page's `data-iframe` attribute, validated against itch's
embed hosts, cached for 10 minutes) and the client frames that directly. Such a game
is *not* stored in your library and needs a connection to play. This is why the app
CSP carries `frame-src` for `html-classic.itch.zone`, `html.itch.zone` and `itch.io`
— framing is all it grants.

**`local` responses serve untrusted third-party HTML and JavaScript**, so the clients
must frame them correctly:

- The web player uses `sandbox="allow-scripts allow-pointer-lock allow-popups"` and
  deliberately **not** `allow-same-origin` — that combination would cancel the sandbox
  and hand the game the user's session.
- The asset responses carry their own CSP, scoped to *this game's own `/play/` path*
  rather than to the origin, so a build can load its files and cannot reach the rest
  of the API. They also override the app-wide `X-Frame-Options: DENY` with
  `SAMEORIGIN` so the player can frame them at all.
- The Android player intercepts every WebView request and reissues it through the
  authenticated client, because the app authenticates with a bearer token that
  subresource requests would not otherwise carry.

An **`embed`** frame is the opposite case and is treated differently on purpose: it
is cross-origin, so `allow-same-origin` *is* set. That grants the game its own itch
origin — letting it use storage, which the sandboxed local player cannot — and never
ours, since the browser still refuses a cross-origin frame any access to the app.
Android likewise skips request interception for an embed: interception exists only to
attach our bearer token, and itch has no use for one.

### Where a game came from

A game added from itch.io or F95zone remembers its page, which is what later makes
"is there a newer version?" answerable. The reference is encrypted like a title is —
an F95zone thread number is as good as a name to anyone who can type it into a
browser — while the version strings stay plaintext so a sweep can compare them
without decrypting every row.

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/media/{id}/remote` | → `GameRemote`; `404` when the game was not added from a site |
| PUT | `/api/media/{id}/remote` | `{url, id?, knownVersion?, latestVersion?}` — points a game at its page. `400` for a URL on neither site |
| DELETE | `/api/media/{id}/remote` | `204`; the game stays, the reference goes |
| POST | `/api/media/{id}/remote/check` | reads the page now → `{remote, changed, error?}`. `error` is set when the page would not load; versions are then left alone |
| POST | `/api/media/{id}/remote/acknowledge` | the newest version is the one installed → `GameRemote`, badge cleared |
| GET | `/api/media/{id}/sources` | → `SourceReport`: where the build can be had, read off the page |

```jsonc
// GameRemote — also carried on GET /api/media/{id} for a game
{ "site": "f95", "label": "F95zone", "id": "270043",
  "url": "https://f95zone.to/threads/270043/",
  "knownVersion": "0.3", "latestVersion": "0.4", "changelog": "- a new chapter",
  "checkedAt": 1789609249, "updateSeenAt": 1789609249, "hasUpdate": true }

// SourceReport
{ "url": "…", "version": "Ch.4 v1.5", "changelog": "", "degraded": false,
  "signedIn": false, "sources": [] }
```

`knownVersion` only moves when the user says so — an install, or an acknowledgement —
so an update stays flagged until it is acted on. `hasUpdate` compares the two
leniently: "v0.7" and "0.7" are one build, and "different from what you have" is the
test rather than "newer than", because developers version however they like.

`degraded` means the page could not be read and nothing else in the report is
trustworthy. `signedIn` distinguishes the two ways `sources` can be empty: F95zone
serves a thread to anyone but hides every download link from a guest, so an empty
list from a signed-out read means "none you may see", not "none listed".

Nothing here downloads a build. The links are opened in the user's own browser,
where their cookies and the file hosts' captchas already are.

## Browsing the game sites

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/games/sites` | → `{sites: [Account], sorts, itchNsfw}` — both sites' sign-in state. `Account` is `{site, label, signedIn, user?, password, via?, note?}`: `via` is `"launchy"` for a site read through the launcher, `note` a sentence on what is missing |
| POST | `/api/games/sites/{site}/login` | `{cookie}` → `Account`; `502` when the site refuses the cookie. A `{username, password}` body answers `409` with directions — neither site can be signed in to with a password from a server any more |
| POST | `/api/games/sites/{site}/logout` | drops a pasted cookie; for F95zone also forgets the old stored login |
| GET | `/api/games/browse?site=&q=&sort=&page=` | one page → `{items, page, hasMore}`; `409` when the site is not signed in, or wants a person at the PC to press Verify |
| POST | `/api/games/browse/detail` | `{item}` → `{item, degraded}` — the result's own page, read on demand |
| POST | `/api/games/browse/add` | `{url, id?, version?}` → `{id, created, media, remote}` |
| GET | `/api/games/updates` | → `{items, tracked, sweep}` — every game whose site has moved on |
| POST | `/api/games/updates/check` | sweeps every game that came from a site, in the background → `202 {started, sweep}` |

**A site is browsed signed in or not at all.** itch.io only serves its adult listings
to an account that has asked for them and F95zone hides threads and download links
from guests, so browsing signed out would quietly show a fraction of what is there
and call it the catalogue. `409` with a message is the honest answer — never `401`,
which the clients read as "your OppaiLib session ended".

**Neither site can be signed in to from the server.** itch.io's login page sits
behind a Cloudflare check that only a real browser passes, so it is signed in by
handing over the `itchio` session cookie — pasted from a browser, or pushed by Launchy,
which signs in through itch's own page in a real window. Cookies are write-only over
the API.

**F95zone is read through Launchy.** Since October 2026 every F95zone page, its login
included, sits behind a "Verify you are human" check. The server does not try to pass
it; it borrows the launcher's browser, where a person signed in and ticked the box.
Each F95zone read — listing, thread, update check, a pasted thread URL in the scraper
— is queued down the launcher's long poll as a `fetch` and the page comes back as the
command's outcome (see below). F95zone's `Account` is therefore the launcher's own
report of its sign-in, with `via: "launchy"`; with no launcher connected it is signed
out and its `note` says so. A launcher whose clearance lapsed reports
`challenged`, and every read says to press Verify on the PC.

`add` files the game away through the same import a pasted URL uses — cover art,
description, screenshots and tags — and records the page as where it came from. A
URL already in the library answers `200` with the existing entry rather than a
second copy.

`items` carry `libraryId` when the game is already on the shelf, which is what lets
a browse page mark what you have without the client holding the library.

## Launchy, the desktop launcher

Launchy is the client in the pairing: it holds a key, syncs on its own schedule,
reports what it is doing, and long-polls for requests. The server never reaches out
to the PC, so nothing has to be configured or opened here and the launcher works from
behind any router.

| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/launchy/pairing` | session only → `201 {code, expiresAt}` — a one-time code, good for ten minutes |
| POST | `/api/launchy/pair` | **unauthenticated.** `{code, name}` → `201 {key, id, user}`; `403` for a spent, expired or unknown code |
| GET | `/api/launchy/keys` | session only → `{items: [{id, name, hint, createdAt, lastUsedAt?}]}` |
| DELETE | `/api/launchy/keys/{id}` | session only — revokes one |
| DELETE | `/api/launchy/key` | the calling key revokes itself (Launchy's Unlink); `400` from a session |
| GET | `/api/launchy` | → `{connected, name, lastSeen, running, pending, version?, capabilities, accounts, sessions, downloads, sync, reportedAt?}` |
| PUT | `/api/launchy/state` | the launcher's report: `{version, capabilities, accounts: [{site, signedIn, user, challenged}], sessions: [{gameId, title, startedAt}], downloads: [{id, gameId, title, label, status, message, startedAt, finishedAt}], sync: {running, lastSync, lastError}}` |
| GET | `/api/launchy/commands?wait=&name=&running=` | the launcher's long poll; `wait` is capped at 25 s. Its arrival is the heartbeat |
| POST | `/api/launchy/commands/{cmd}` | `{ok, error, message, status?, url?, body?, challenged?}` — how a request went; a `fetch` carries its page |
| POST | `/api/launchy/requests` | `{action, gameId?, saveId?, downloadId?, source?}` → `202` the queued command |
| GET | `/api/launchy/requests/{cmd}` | how that request went (`status`, and `message` or `error`) |
| POST | `/api/launchy/launch` | `{gameId}` — the `launch` request, kept for the phone |
| GET | `/api/launchy/launch/{cmd}` | the same as `/requests/{cmd}` |
| GET | `/api/launchy/games` | every game with its remote and launcher state, for the sync |
| POST | `/api/launchy/games` | multipart `meta` + optional `cover` — a launcher entry becomes a library game |
| PUT | `/api/launchy/games/{id}` | `meta` — the launcher's state, and any metadata it changed |
| DELETE | `/api/launchy/games/{id}` | unpairs; the game stays |

`meta` names the launcher's own entry (`launchyId`) and always carries what only the
PC knows — `installed`, `version`, `playSeconds`, `lastPlayed`, `launchCount`. The
media fields (`title`, `developer`, `description`, `rating`, `favorite`, `tags`) are
optional: a sync that has no local edits to push sends only the launcher state, and
what it leaves out is left alone. Tags are merged, never removed — the tagger's and
the scraper's tags are not the launcher's to take away. A game with no cover art in
the launcher gets a placeholder drawn from its id, because a game needs a blob and
two placeholders must not collide on the store's hash.

**Linking.** The launcher signs in with a key, not a session: a session is a
person's, ends on every restart and idles out, and a launcher holding one came
unpaired by itself. The web's Settings → Launchy makes a pairing code and opens
`launchy://link?server=<origin>&code=<code>`; Launchy asks the person at the PC to
confirm, then trades the code at `/pair` for a key. The key never appears in a link.
Only its SHA-256 is stored. A key reaches `/api/launchy/*` (minus the key and pairing
routes), a game's `thumb` and `saves`, and `/api/games/sites/{site}/login` — anything
else answers `403`. Linking a PC under the same name again replaces its old key.

**Requests.** `action` is one of `launch`, `stop`, `sync`, `backup-saves`,
`restore-save` (needs `saveId`, refused with `409` while the game runs), `download`
(needs `source` with an http(s) `url`; the game need not be in Launchy) and
`cancel-download` (needs `downloadId`). Every one is refused with `409` when no launcher
is polling — a request that sits until a launcher appears hours later and starts a game
unbidden is worse than an error — and every one but `launch` also when the launcher
does not list its capability (`stop`, `sync`, `saves`, `download`), which is how an
older launcher is never sent something it cannot do. The server's own `fetch`
requests ride the same queue, are not counted in `pending`, and cannot be read back.

## Settings

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/settings` | → `{settings, readOnly}` — editable values plus env/build facts |
| PUT | `/api/settings` | **admin only.** Partial body merges over current; applied live, no restart. `libbyGenLoras` is a list of `{name, weight}` (up to 8, weight −2..2) applied to every picture she makes; it replaced `libbyGenLora`/`libbyGenLoraWeight`, whose stored value becomes its first entry |
| GET | `/api/stats` | → `{kinds:[{kind,count,bytes}], items, bytes, tags}` |

Env vars supply the defaults; a saved setting overrides one for the install.
Anything that can't change without a restart (model dir, inference device,
paths) is reported under `readOnly`.

`chatModelDir` names text-generation-webui's models folder *as this container sees it*.
It has one purpose — deleting a model, which that backend exposes no API for — and is
deliberately not defaulted, because guessing a path and deleting what is found there is
not a thing to do on someone's model collection. Blank means the delete controls are
absent.

`imageGenModelsDir` is the same kind of path for Automatic1111 (Forge, SD.Next): its
`models` folder — the one holding `Stable-diffusion` and `Lora` — as this container
sees it. A1111 has no API to install, describe or delete a model, so those are file
operations: an install from Civitai is downloaded into the right folder, a model's
description and trigger words go into the `<name>.json` sidecar A1111's own edit card
writes, its cover into `<name>.preview.png`, and A1111 is asked to rescan. Blank means
`/a1111-models`, the container template's mount point, when something that looks like
a models folder is mounted there; failing that (or when the path that is set does not
work, such as the Unraid host's path), any models folder with a checkpoint folder that
is mounted into the container. With none, A1111's models are still listed and linked
to Civitai by hash, and none of them change. The folders inside are matched by any of
their usual names in any case — `Stable-diffusion` or `checkpoints`, `Lora` or `loras`,
`VAE`, `ControlNet`, `ESRGAN` or `upscale_models` — while keys keep A1111's own names. The webui's own folder
(holding `models`) or a folder inside `models` is taken to mean `models`; a path that
is missing, holds neither `Stable-diffusion` nor `Lora`, or is mounted read-only is
not used, and the status says which. InvokeAI ignores it.

## Image generation

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/imagegen/status` | → `{enabled, reachable, backend, models, loras, vaes, templates, boards?, detailerAvailable, civitai, manageModels, modelsDirSet?, modelsDir?, modelsDirProblem?}`. `backend` is `invokeai` or `a1111`. `manageModels` says models can be installed, edited, re-covered and deleted from here — always on InvokeAI, on A1111 once `imageGenModelsDir` (or the `/a1111-models` mount) is a writable models folder; A1111 only: `modelsDirSet` tells "not set" from "set but wrong", `modelsDir` is the folder in use and `modelsDirProblem` says what is wrong with the one that is set, `canRename` that LoRAs and detectors can be renamed (the folder is writable), and `canRestart` that A1111 lists its restart route (started with `--api-server-stop`). Models and LoRAs carry `key`: InvokeAI's record key, or an A1111 file's path under its models folder (`Lora/ink.safetensors`), which is what the Civitai records are kept by. An A1111 LoRA's `triggerPhrases` and `weight` come from its sidecar, else from its Civitai link. `templates` are InvokeAI's style presets or A1111's saved styles. Each LoRA's `categoryKey` is the studio's category it is filed under — one of a fixed list, `character`, `style`, `concept`, `tools`, `poses`, `background`, `etc` — and absent while it is unsorted (the clients carry the list and its labels; until 0.67 these were folders the person made, folded into the list by name when the database opens). On A1111, `upscalers` are its upscaler models (an upscale or a hires fix take them) and `latentUpscalers` its latent modes (a hires fix only), "None" left out. With ADetailer on A1111, `detectors` is every detector it can run — its own and any `.pt` added to `models/adetailer` — read from `/adetailer/v1/ad_model`, "None" left out. `regionsAvailable` is A1111 with the Regional Prompter extension loaded. `clips` is `{image?:{takes}, text?:{takes}}`, the ComfyUI workflows set up for clips (below), each with the placeholders it has (`takes`: `["image","prompt","frames",…]`) — or, for Wan files picked in settings, every knob but `steps`, which the settings hold — read from settings rather than probed. `gallery` is `invokeai`, or `oppailib` on A1111 (the server's own gallery, below), and `gallerySorts` the orders a gallery listing takes |
| POST | `/api/imagegen/check` | **admin only.** The Settings → Image generation Test: tries each link an install depends on and returns `{checks:[{id, label, ok, skipped?, detail}]}` — `generator`, and on A1111 `rescan` (POSTs `/sdapi/v1/refresh-loras`), `folder` (writes and removes a probe file), `match` (whether the models A1111 lists are at the same paths in the mounted folder, i.e. it is the folder A1111 reads); then `civitai`, `key` (`/me`) and `download`, which starts a real download with the key and reads only the headers |
| POST | `/api/imagegen/generate` | `{prompt, negativePrompt?, checkpoint?, vae?, sampler?, steps?, width?, height?, cfgScale?, clipSkip?, seed?, count?, loras?, detailer?:{enabled, model?, models?, prompt?, negativePrompt?, confidence?, denoise?, maskBlur?, custom?:[{model, prompt?, negativePrompt?, loras?, confidence?, denoise?}]}, upscale?:{enabled, upscaler?, scale?, denoise?, steps?}, regions?:{enabled, rows?, parts:[{prompt, loras?, share?}]}, jobId?, initImage?, initGallery?, denoise?, mask?, maskBlur?, detailOnly?, upscaleOnly?, noGallery?}` → `{images:[{id, seed, gallery?}], prompt, positive, negative, rolled}`; each id streams from `/api/imagegen/preview/{id}`, and on A1111 each picture is also kept in the gallery under `gallery` unless `noGallery` (the LoRA comparison's sheets). A run with a `jobId` is not tied to its request: if a proxy drops the call, the run still finishes, and `GET /api/imagegen/progress/{jobId}` answers with `result` (this same body) or `error` once `done`, for three minutes. `initGallery` is a gallery picture's name, read on the server in place of `initImage`. `initImage` (a data URL) starts from a picture instead of noise, moving `denoise` (0–1) away from it; `mask` (a PNG data URL, with `initImage`) repaints only its white, drawn at the full size and pasted back ("only masked", original fill); `detailOnly` (with `initImage` and the detailer on) redoes the picture's faces with ADetailer and nothing else. The detailer's `models` is a pass per detector, run in order — `["face_yolov8n.pt", "hand_yolov8n.pt"]` redoes the faces and then the hands (ADetailer's tabs, InvokeAI's nodes chained); `model` alone is one pass, and neither is the fast face detector. `custom` (A1111, at most 6) are passes after those, each with a detector from the status's `detectors`, its own words (blank: the detailer's prompt) and LoRAs, written into ADetailer's prompt as `<lora:…>` tokens; with only custom passes no face pass is added. More than two passes in all raise ADetailer's `ad_max_models` for the run. `regions` (A1111 with Regional Prompter, 2–4 `parts`, ignored on a run from a picture) draws each person in a part of the picture of their own: the prompt becomes `<prompt> ADDCOMM <part 1> ADDCOL <part 2>…` (`ADDROW` with `rows`), each part with its LoRAs, `share` its width beside the others (default 1), and the extension runs in Latent mode when a part has a LoRA so each LoRA stays in its part. Side by side with the detailer on, the face pass is given a prompt per face, left to right (`[SEP]`, with `ad_bbox_sortby` set for the run). `upscale`, on a run drawn from noise, is A1111's hires fix: drawn at the size asked, enlarged `scale` times (1–4, held so the larger side is at most 4096, default 2) with `upscaler` (default `Latent`), and drawn again with `denoise` (default 0.45) over `steps` (0 is the first pass's). A run from a picture ignores it. `upscaleOnly` (with `initImage`, no prompt needed) enlarges that picture with `upscale.upscaler` by `upscale.scale` (1–4, the larger side at most 8192) through A1111's extras tab and redraws nothing; the copy is kept in the gallery like any run. `mask`, `detailOnly`, `upscale`, `upscaleOnly`, `regions` and custom detailer passes are Automatic1111's: InvokeAI answers 409. The body may be up to 64 MB |
| GET | `/api/imagegen/comfy/models` | → `{diffusion, checkpoints, textEncoders, vaes, loras, missing}`: the files the saved ComfyUI's loader nodes offer (GGUF ones too, when ComfyUI-GGUF is in), for the Video settings' pickers, and the core Wan nodes it lacks (`missing`, an old ComfyUI). 409 with no address saved, 502 when ComfyUI does not answer |
| POST | `/api/imagegen/comfy/check` | admin → `{checks:[{id, label, ok, skipped?, detail}]}`, the Video settings' Test: ComfyUI's version and card (`comfy`), its queue (`queue`), each direction's picked files or pasted workflow against what it has (`image`, `text` — a workflow must be an API export whose nodes are all installed, and the picture one must take `{{image}}`), and each install folder (`folder-diffusion_models`, `folder-checkpoints`, `folder-loras`, `folder-vae`) set, writable, and holding files ComfyUI lists. Nothing is rendered or kept |
| POST | `/api/imagegen/clip` | `{from: "image"\|"text", prompt, negativePrompt?, initImage?, initGallery?, width?, height?, frames?, fps?, steps?, seed?, jobId?}` → `{images:[], prompt, positive, negative, clip:{id, mime, seed}}`. A few seconds of video made by ComfyUI (`libbyClipUrl`): `from: "image"` runs the picture workflow (`libbyClipWorkflow`, the one her clips use) with `initImage` (a data URL) or `initGallery` uploaded into its `{{image}}`; `"text"` runs `clipTextWorkflow` and needs a `prompt`. When `clipImageModels` / `clipTextModels` name a `model`, that direction is a Wan workflow the server builds from the files instead (`imagegen/comfy_wan.go`): `model` and an optional `lowModel` (Wan 2.2's high- and low-noise experts, the steps split between them), or one `checkpoint` with its own text encoder and VAE; `textEncoder`, `vae`, `loras` (`{name, weight, stage}`, `stage` `high`/`low`/blank for both), and `steps`/`cfg`/`shift` (zero is 20/3.5/8). A picture with no size given keeps its shape at 832 on the long side, and a blank negative is Wan's own. Each knob fills the `{{name}}` placeholder of the same name when it is given and the workflow has one; sides go down to a multiple of 16 (64–2048), `frames` 1–1025, `fps` 1–120, `steps` 1–200, and `seed` ≤ 0 is a random one. The clip is a preview like a picture's: `/api/imagegen/preview/{id}` serves it with its own type and answers ranges, and `POST /api/imagegen/save` files it as a video (or a GIF, for an animated WebP/GIF). A `jobId` detaches the run as `generate`'s does, and Stop is `POST /api/imagegen/cancel/{jobId}`; progress is a crawl, since ComfyUI reports steps only over its websocket. 409 when that workflow is not set up, 502 when ComfyUI fails (its own message), stopped after 15 minutes |
| GET | `/api/imagegen/tags?q=&limit=` | prompt completion for the tag being typed → `{items:[{tag, category, count, alias?}], suggestions, correction}`. The vocabulary is Danbooru's — every tag on at least 100 posts, with post counts and aliases — plus this library's own tags (`category` 100). Ranked: the tag itself, tags starting with `q`, an alias that does (`alias` says which), a tag a later word of which does, then near misses for a typo. `suggestions` is `items` as plain names and `correction` a "did you mean", the shape older apps read. `limit` defaults to 12, at most 50 |

### LoRA categories

The studio's own categories for sorting LoRAs — characters, styles, poses. Neither
generator has the idea (A1111's subfolders would rename every LoRA), so they are kept
here, whatever the backend, by the name a LoRA is picked by. A LoRA is in one category
or none; deleting a LoRA from the studio takes it out of its category.

| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/imagegen/lora-categories/assign` | `{category, loras:[name…]}` → 204. Files them under that category key, out of any other; `category` `""` unsorts them. 400 for a key off the list. A LoRA installed from Civitai is filed by the model's category tag, and one trained here by its preset, unless it is already filed |
| POST | `/api/imagegen/lora-categories/civitai` | `{loras:[name…]}` (1–24) → `{results:[{lora, category?, civitai?, outcome, error?}]}`. Finds each LoRA on Civitai by its file's hash and files it under its model's category tag, unless it is already filed. `outcome` is `filed`, `untagged` (on Civitai under no category tag), `unknown` (not on Civitai; not asked again for a day), `unhashed` (no hash yet — A1111's are computed in the background) or `error`. The catalogue link is kept, so the cover and trigger words come with it |
| GET | `/api/imagegen/detectors` | ADetailer's detectors: `{detectors:[{name, key?, size?, listed, civitai?:{modelId, versionId, name, creator?, cover?}}], folder, listError?, folderError?}`. The `.pt` files in A1111's `models/adetailer` (subfolders too) first, then ADetailer's own models. `listed: false` is a file ADetailer has not read — it reads its folder when A1111 starts |
| DELETE | `/api/imagegen/detectors?key=adetailer/x.pt` | Removes a detector file, its sidecars and its catalogue link → 204. 409 without the models folder |
| GET | `/api/imagegen/detectors/civitai` | `?q=&nsfw=0&cursor=` → `{items:[CivitaiModel + {cover?, installedVersions:[id…]}], nextCursor?}`. Civitai's "Detection" models and its "Other" models tagged `adetailer`, paged together through one opaque cursor |
| POST | `/api/imagegen/detectors/install` | `{modelId, versionId?}` → the install job (follow it on `/civitai/installs`). Takes the version's `.pt`, else its `.zip`, which is unpacked into `models/adetailer` — `.pt` files only, an existing file of the same name kept — and the job's `files` lists what it unpacked to. A `.pt` named like one already there gets `-<versionId>` before its extension. Once the job completes, each file is renamed after what the catalogue says it finds, in ADetailer's style (`feet_yolov8s.pt`; from a set of several, the file's own words) unless that name is taken |
| POST | `/api/imagegen/names/suggest` | `{kind:"lora"\|"detector", names:[…]}` (1–24) → `{suggestions:[{name, to?, civitai?, outcome, error?}]}`. What each LoRA or detector would be called after its Civitai model, found by its link or its file's hash; nothing is renamed. A LoRA is `<model> - <version>` without the tags around it ("Makima Chainsaw Man - Pony v2"; a first version's "v1.0" left off), a detector `<what it finds>_<yolo variant>[-seg].pt`. `outcome` is `named`, `same` (already called that), `unknown`, `unhashed` or `error` |
| POST | `/api/imagegen/names/rename` | `{kind, renames:[{name, to}]}` (1–500) → `{renamed:[{oldKey, newKey, oldName, newName}], failed:[{name, error}]}`. A1111 only (409 on InvokeAI or without the models folder). Renames each file with its sidecars (`.json`, `.civitai.info`, `.txt`, covers) in the same folder, never over another file; the new name is cleaned to letters, digits, spaces, `.`, `-` and `_`. The catalogue link, recommended settings and category move to the new name, and so do Libby's LoRAs in the settings. A1111 rescans its LoRAs; a renamed detector waits for ADetailer to read its folder at the next start |
| POST | `/api/imagegen/restart` | → 202 `{status:"restarting"}`. Asks Automatic1111 to restart itself (`/sdapi/v1/server-restart`); the clients follow the status until it answers again. 409 with what to change when it can't: started without `--api-server-stop`, or by a launcher that won't start it again (only `webui.sh`/`webui.bat` do), or InvokeAI |

## LoRA training

Training runs on the trainer — `trainer/`, its own image
(`ghcr.io/noneye-byte/oppailib-trainer`) on the box with the GPU — set by
`trainerUrl` and the write-only `trainerToken` in settings. The server picks and
captions the pictures, sends them, and follows each run to the end with no client
connected: when it starts it can ask the generator to unload its checkpoint
(`freeGpu`); when it finishes the generator installs the file straight from the
trainer, the LoRA is given its trigger word, a description and the sample as cover,
and the generator gets its checkpoint back. A run is `preparing` (sending), `queued`,
`training`, `installing`, then `done`, `failed` or `cancelled`.

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/imagegen/train` | → `{configured, tagger, trainer?, trainerError?, trainings}`. `tagger` is whether AI tagging is on, for the screen's auto-tag. `trainer` is the trainer's `/health` (`gpu`, `vramMB`, `busy`, `queued`, `modelsMounted`); each training has `id, name, trigger, baseModel, images, status, error?, modelKey?, createdAt, finishedAt?, request` and, while the trainer has it, `phase, step, total, epoch, epochs, loss, eta, elapsed, family, samples, log` |
| POST | `/api/imagegen/train/preview` | `{source, trigger, captions?, leaveOut?, playDown?, repeats?}` → `{count, mediaIds, items:[{id, caption, tags:[{name, manual?}], width?, height?}], commonTags:[{name,count}], exampleCaption, suggestedRepeats, untagged, limit, playDown:[{tag, pictures, before, after}]}`, what a run would train on: every picture with its caption, how many have no content tags, and for each played-down tag the share of training its pictures had and will have at `repeats` (0 or absent is the suggested number). Nothing is sent |
| POST | `/api/imagegen/train` | `{name, trigger, base, source:{setId\|collectionId\|tag\|mediaIds, exclude?}, captions?, leaveOut?, playDown?:[{tag, keep}], preset?, epochs?, repeats?, rank?, alpha?, resolution?, learningRate?, textEncoderLr?, optimizer?, noiseOffset?, clipSkip?, lowVram?, noFit?, flip?, freeGpu?, samples?}` → the training, `preparing`. Each picture is fitted to its training bucket before it is sent — its own shape filling `resolution`² (else 1024², or 512² for a checkpoint the generator calls SD 1.x; 768 with `lowVram`) in sides of 64, cropped from the middle, transparency laid on white — and one that must grow by more than a quarter goes through the generator's upscaler first (an anime ESRGAN when A1111 has one); `noFit` sends them as they are. `base` is a checkpoint as the studio names it; stills only (no GIFs or video), at most 400. Captions are the trigger word then the picture's tags (`captions:"trigger"` for the word alone), less `leaveOut`. A `playDown` tag is played down, not removed: it is named straight after the trigger word in every caption that has it (struck or not, in either caption mode), and its pictures are shown less often an epoch and the rest more, so its share of training is `keep` (0.05–1) of what it was while an epoch stays as long. A tag on every picture can only be named. Needs a trainer with the `repeats-per-file` feature; an older one fails the run saying so. 409 without a trainer |
| POST | `/api/imagegen/train/{id}/cancel` | stops a run → the training. One on the trainer reads `cancelled` once the trainer has stopped it |
| DELETE | `/api/imagegen/train/{id}` | forgets a finished run and the trainer's copy → 204; 409 while it is live |
| GET | `/api/imagegen/train/{id}/sample?name=` | one of the run's sample pictures, from the trainer |
| GET | `/api/imagegen/train/twitter?user=&cursor=` | one page of an X account's pictures, read from the fxtwitter mirror's profile feed (no X account needed) → `{account?:{name, screenName, avatar, mediaCount, protected}, pictures:[{id, url, thumb, tweetUrl, text, width, height, repost, sensitive, created}], cursor?}`. `account` is on the first page only; no `cursor` is the last page. Stills only. `user` is `@name`, `name` or a link; 400 for anything else, 404 for no such account, 502 when the mirror does not answer |
| POST | `/api/imagegen/train/import` | `{items:[{url, source?, title?, post?:{source, feed}}], setId? \| setName?}` → 202 and a task. Downloads the kept pictures into a training set (never the library), in the background; a set by that name (any capitals) is joined rather than doubled. An item with `post` and no `url` is a Browse source's post (`{source:"rule34", feed:"post:123"}`, what a Rule34 listing without an API key gives) whose file is read from the post first; a video post, or a file on a host the source doesn't list, is skipped. At most 400 |
| POST | `/api/imagegen/train/detect?conf=` | a picture's bytes (PNG, JPEG, WebP or BMP, up to 40 MB) → `{width, height, model, people:[{box:[x0,y0,x1,y1], score, outline:[[x,y]…]}]}`, largest first, in the picture's pixels: the trainer's person segmentation model (ADetailer's `person_yolov8m-seg`) at confidence `conf` (default 0.35). The comic gatherer cuts each person out with it. 409 without a trainer, or with one that does not list `detect-people` (update it); 502 when the trainer fails or refuses its token |
| POST | `/api/imagegen/train/autotag` | `{source, redo?}` → 202 and a task. A training set's pictures are tagged in the set, the library untouched. Runs the tagger over the set's pictures with no content tags, or every one with `redo` (the tagger's earlier tags are replaced, typed ones kept). 409 with the tagger off |
| GET | `/api/imagegen/train-tasks/{id}` | an import or tagging task → `{id, kind, total, done, failed, finished, error?, setId?, pictureIds?}`. Tasks live in memory for an hour after they finish |
| GET | `/api/imagegen/train-sets` | the training sets → `{sets:[{id, name, count, coverId?, createdAt, updatedAt}]}`. A set holds a LoRA's pictures apart from the library: no grid, search, Libby pick or auto-tagger sees them |
| POST | `/api/imagegen/train-sets` | `{name}` → the set by that name (any capitals), made if there is none |
| PATCH | `/api/imagegen/train-sets/{id}` | `{name}` renames it |
| DELETE | `/api/imagegen/train-sets/{id}` | with its pictures → 204. A file the library also holds stays |
| POST | `/api/imagegen/train-sets/{id}/pictures` | multipart `file` (+ `source`) → `{id, existed}`, 201 or 200 for a picture already in the set. Stills only (JPEG, PNG, WebP, BMP), 40 MB, 400 a set |
| POST | `/api/imagegen/train-sets/{id}/from-library` | `{collectionId\|tag\|mediaIds, move?}` → `{added, moved, set}`. Copies library pictures and their tags in (the same stored file); `move` deletes them from the library after, and an emptied collection with them |
| GET | `/api/imagegen/train-sets/{id}/pictures/{pic}?thumb=1` | the picture, or its 320px tile |
| PATCH | `/api/imagegen/train-sets/{id}/pictures/{pic}` | `{addTags?, removeTags?}` → `{id, tags}`. Typed tags are lower-cased and replace the tagger's same tag |
| DELETE | `/api/imagegen/train-sets/{id}/pictures/{pic}` | takes it out of the set → 204 |

### The studio's gallery

InvokeAI's own gallery, or on Automatic1111 the one the server keeps of every picture
made in Create (`api/gen_gallery.go`, tables `gen_folders`/`gen_images`), apart from the
library. There the boards are `none` (Unsorted, where a run lands unless a folder is
open), `all` (every picture) and each folder by id, and an image's name is its row id.

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/imagegen/gallery/boards` | → `{boards:[{id, name, count, cover?}]}`. `cover` is the picture the board's card shows, by gallery name: InvokeAI's board cover; on A1111 the one chosen for a folder while it is still in it, else the newest there (Unsorted's and All's are their newest) |
| POST, PATCH, DELETE | `/api/imagegen/gallery/boards[/{id}]` | make (`{name}`; on A1111 a name already there is that folder), change (`{name?, cover?}` — a rename is A1111 only; `cover` is one of the board's own pictures, 400 for one outside it, `""` back to its newest) or delete a board or folder; a deleted folder's pictures go back to Unsorted |
| GET | `/api/imagegen/gallery/images?board=&offset=&limit=&sort=` | → `{items:[{name, width?, height?, created?, label?, size?}], total}`. `sort` is `newest` (default), `oldest` or (A1111) `largest` |
| GET | `/api/imagegen/gallery/image/{name}[/thumb]` | the picture, or its thumbnail |
| GET | `/api/imagegen/gallery/image/{name}/metadata` | the generation settings: InvokeAI's record, or on A1111 the record kept with the picture (the studio's GenInfo shape, a superset of InvokeAI's) |
| DELETE | `/api/imagegen/gallery/image/{name}`, POST `/api/imagegen/gallery/delete` `{names}` | deletes from the gallery |
| POST | `/api/imagegen/gallery/board` `{board, names}` | files pictures on a board, or into a folder (`none` is Unsorted) |
| POST | `/api/imagegen/gallery/save` `{name \| names, title?, tags?}` | InvokeAI: copies one into the library. A1111: moves them — each becomes a library item tagged `ai-generated`, with its record, and leaves the gallery → `{id, ids, moved}`. `POST /api/imagegen/save` of a preview that was kept moves its gallery copy the same way |

`PUT /api/imagegen/lora-thumb` and `/model-thumb` take `{model, previewId}` or `{model, galleryName}`: a picture from the gallery can be a LoRA's or a model's cover long after its preview expired.

The trainer's own API (`trainer/server.py`) is `GET /health`, `GET\|PUT /bases?key=&size=`
(is a checkpoint here / upload one), `POST /jobs` (settings), `PUT /jobs/{id}/files/{name}`
(each picture and caption), `POST /jobs/{id}/start`, `GET /jobs`, `GET /jobs/{id}`,
`POST /jobs/{id}/cancel`, `GET /jobs/{id}/output?dl=` (the file, with the job's own
download token), `GET /jobs/{id}/samples/{name}` and `DELETE /jobs/{id}`, all behind
`Authorization: Bearer <TRAINER_TOKEN>`.

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

### Streaming remote media

`GET /api/sources/stream?url=…` proxies one file from a source's host, forwarding
`Range`. The URL must be on a registered source's `hosts`; a source can resolve a
stable page URL to the real file first (Hanime does this at play time).

- **Small files are fetched once.** A source can ask for its files to be held whole in
  memory (192 MB budget, least recently played evicted) — 4chan does — and every later
  range of that file is served from there. A player's open, seek-to-cues, and every
  loop of a clip used to be separate requests to the CDN.
- **A 429 is honoured.** The proxy stops asking that host for that file type until the
  `Retry-After` it was given (capped at two hours) and answers `502` with a message
  saying how long, e.g. `{"error":"4chan is limiting downloads from this server for
  now. Try again in about 33 minutes."}`. 4chan limits video files per address, so its
  thumbnails keep loading meanwhile.
- **Members-only Hanime uploads** answer `502` with a message naming the title. They
  are left out of listings: the low-view cards on a page (new uploads Hanime gives
  members first) are checked before the page is returned.

Upstream refusals are always `502`, never `401` — the client treats a `401` from any
endpoint as its own session ending.

### Saved searches

A search on a source, kept and re-run by the server every six hours. Nothing is
downloaded: what turns up that has not been shown before lands on a "new from your
feeds" shelf as remote tiles, and reading the shelf is what marks it seen. Per user,
encrypted, at most 24.

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/feeds` | → `{feeds:[{id,name,source,feed,query,sort,createdAt,checkedAt,error,newCount}]}` |
| POST | `/api/feeds` | `{source, feed, query?, sort?, name?}` → 201 the feed, checked once to seed it. An identical search already kept is returned instead |
| DELETE | `/api/feeds/{id}` | 204 |
| POST | `/api/feeds/check` | run every feed now → the list |
| GET | `/api/feeds/new` | → `{items:[SourceItem + {feedId, feedName, source}]}`, newest feed first |
| POST | `/api/feeds/seen`, `/api/feeds/{id}/seen` | 204 — clears the pile |

The first check of a new feed seeds what it has seen without calling any of it new,
so subscribing to a search does not present its whole first page as arrivals.

## Libby

Her endpoints are many and mostly documented beside their handlers
(`backend/internal/api/handlers_libby*.go`, `chat_*.go`); what is listed here is the
part a client has to send or read to keep up with her.

| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/libby/turn` | One of her turns, run on the server and streamed as Server-Sent Events (or, with `Accept: application/json`, every event at the end as `{events:[{event, data}]}`). Body: `{conversationId, conversation?, messages?, redo?, truncateAfter?, nudge?, task?, cue?, call?, outfit?, timeZone?, viewing?, link?, sharedMediaIds?, debug?}`. `messages` are your new texts (ids the server already has are updated in place, not repeated); `conversation: {characterId, title, mode}` creates a conversation the client has not saved yet; `redo` takes her last reply back first and `truncateAfter: <message id>` drops everything after one of yours; `task: "autonomous"` is her speaking first and `"afterglow"` the morning after; `cue` is a one-off instruction that is never stored; `timeZone` is the device's IANA zone (`Europe/London`), which sets the hour Libby is told it is and the light her pictures are taken in — the server's own clock when it is absent or unknown. Events, in order as they happen: `turn {rev, messages}` (yours, as stored), `status {phase}` (`typing`, `photo`, `clip`, `room`), `camera {jobId, what?, progress: {phase, percent, preview?, of}}`, `message {message, rev, images?}` (one of hers — a text, a picture or set, a thought, a voice note, a card — resent when amended; `images` are the gallery records of its pictures), `react {to, emoji, rev}`, `call {action: ring\|hang_up}`, `room {background}`, `notice {text}` (the context window had to give), `state {emotion, intensity, activity, background, wearing, scene, messageId, rev}`, `done {rev, sampling, context, debug?, calls?}`, and `error {message, status}`. A comment line arrives every 15 s while she works. Her actions are tool calls — see "How a turn works" below |
| — | `ephemeral` turns | the same endpoint with `{ephemeral: true, characterId, mode, emotion, intensity, history:[{role, content}], cue?, viewing?}`: the browse-together drawer. She answers with her whole self and nothing is filed in a conversation |
| POST | `/api/libby/photos/{id}/rate` | `{rating: "love"\|"like"\|"dislike"\|""}` on a picture of her → `{image, sendWeights}`. Each of the picture's tags is leaned (×1.18 love, ×1.07 like, ×0.82 dislike, bounded between rarely and often; changing a rating replaces it rather than stacking) |
| POST | `/api/libby/photos/{id}/keep` | files the picture in the library as a picture of her → `{id}` |
| GET | `/api/libby/stories` | → `{stories:[{id, imageId, caption, at, seen}], unseen, enabled}` — the last day's |
| POST | `/api/libby/stories` | has her post one now → the story. One picture and one model call |
| POST | `/api/libby/stories/{id}/seen` | marks one seen |
| POST | `/api/libby/watch` | `{conversationId?, mediaId, position, frame}` — `frame` a JPEG data URL of the playing video, drawn by the client. → `{quiet: true}` or `{message, rev, conversationId}`; the line is already in her conversation (the most recent of hers when none is named). At most one every 50 s per user |
| POST | `/api/chat/compress` | `{characterId, summary?, messages}` → `{summary}`: the model summarises the messages, folding in the previous summary, as her notes. The client keeps it on the conversation (`summary`, `summarizedAt`) and drops the messages it stands for |
| GET | `/api/chat/libby-default` | her card as it ships, so an edited field can be put back |
| POST | `/api/libby/act` | an approved offer — what the `offer` tool proposed, or a `generate` card from before her camera took pictures inside the turn. Besides the action's own fields, send `outfit`, `activity`, `intensity` and `recentMediaIds` as they stand when Allow is pressed: a picture she makes of herself is drawn in that state, filed in her chat gallery as a picture of her tagged with the subject, and answered `{image, message}` — `image` is the chat image record, which the client adds to its gallery list and posts into the conversation as her message. It goes to the library as well (and `id` is the new item) only when the `libbyGenToLibrary` setting is on; a `shelf` action rebuilds the collection "Libby's pick" → `{collectionId, name, count}`. The server actions `load` (the model name in `prompt`), `cleanup`, `describe` and `free` are **admin only** (403 otherwise) and answer `{message}`; `load` answers 202 and loads in the background |
| GET | `/api/libby/references` | → `{clothed, nude}`: which of the two reference pictures of her are set. On a turn about how she looks, the fitting one is shown to her vision model beside the user's pictures (bare at heat 4+ or when the talk is; clothed stands in for a missing bare one). Never sent as a selfie |
| GET/PUT/DELETE | `/api/libby/references/{slot}` | `slot` is `clothed` or `nude`. GET serves the picture; PUT takes `{imageData}` (a data URL or bare base64, up to 12 MB) and replaces it; DELETE empties the slot |
| GET | `/api/libby/journal` | → `{entries:[{id, conversationId, text, mood, at}]}`, newest first — what she wrote after conversations went quiet |
| POST | `/api/libby/journal/reflect` | has her write about the latest conversation now → `{entry}`, or `{entry: null, message}` when there is nothing new or memory is off. Can take minutes; 409 while she is already writing |
| DELETE | `/api/libby/journal` | clears the entries (the record of what she has already written about is kept, so she does not immediately rewrite them) |
| DELETE | `/api/libby/journal/{id}` | removes one entry |
| GET | `/api/libby/auto/pending` | → `{pending:[{trigger, detail, decision}]}`: reasons to speak first the server noticed itself. Only `afterglow` so far — owed once, the calendar day after a conversation whose heat peaked at 4 or more. Send the turn with the trigger as `task`, then record it with `/api/libby/auto/sent` |
| POST | `/api/tts/speak` | `{text, voice?, speed?, heat?}`; `heat` 1–5 slows the reading from 3 up (and on piper makes it breathier). The `tts.engine` setting is `auto`, `kokoro`, `piper`, `openai` or `off`; auto is Kokoro (the default image, `/opt/oppailib/kokoro` + espeak-ng) where it is installed, then piper, then the speech server. `GET /api/tts/status` says `kokoroInstalled` |

A remembered boundary (memory kind `boundary`) rules intimate states out server-side
the way the heat floor does: "no toys" refuses `set_state` with `activity: vibrator` on
the turn the model forgets it, and the state is left out of the tool's vocabulary.

### How a turn works

She is sent the OpenAI `tools` field and acts through tool calls: `set_state` (mood,
heat, activity, place, wearing, scene beat), `take_photo`, `edit_photo`, `make_clip`,
`send_saved_photo`, `send_from_library`, `remember`, `recall`, `react`, `think`,
`reply_to`, `call`, `voice_note`, `plan_scene` and `offer`. Each is offered only when it
can happen (no camera without a generator, no edit without a picture of hers to start
from), and a smaller context window is offered fewer (`toolLevelFor`). A backend that
refuses `tools` is asked again in JSON mode — one object, `{messages, actions}`,
constrained by `response_format` where the backend takes a schema — and remembered for
the rest of the process; `chatToolMode` in settings pins either. Calls a model writes
into its text in Hermes/Qwen (`<tool_call>`) or Mistral (`[TOOL_CALLS]`) markup are read
as calls.

The camera (`take_photo`, `edit_photo`) runs inside the turn: the shot is checked
against a fixed list of minor-coded terms and refused outright when it matches; the
prompt is her likeness, her clothes and the room plus the shot, with an adults-only
negative always added; `libbyCameraCandidates` pictures are made and a model that can
see (the vision model, or hers) scores them and clears each as showing only adults —
nothing it does not clear is sent; below 4.5 of 10 it is retaken once with the judge's
fix. One picture is ever sent per shot; there are no sets. `take_photo` takes an optional
`loras` list naming entries of `libbyCameraLoras` (`{name, weight, when, trigger}`, up to
12): she is offered each by its `when` note, a chosen one is added with its trigger words
on top of `libbyGenLoras`, and a name not on the list is ignored. The picture is filed in
her chat gallery with its recipe (`gen: {prompt, negative, seed, shot, score, loras}`),
and an `edit_photo` of it keeps its `loras`. She is told what it actually shows before she says anything
about it. `edit_photo` is an img2img of her last picture on its seed. Pose copying and
face lock use the ControlNet extension (`libbyPose*`, `libbyFace*` settings; A1111/Forge
only), and clips run the operator's ComfyUI workflow (`libbyClipUrl`,
`libbyClipWorkflow`, with `{{image}}`, `{{prompt}}`, `{{negative}}`, `{{seed}}`) — the
same server and picture workflow as the studio's clips (`POST /api/imagegen/clip`), whose
words-to-video workflow is `clipTextWorkflow`.

Turns write into the conversation themselves, and the workspace save merges by
revision: each conversation has a `rev` the server bumps on every write and stamps on
the messages it writes, and a `PUT /api/chat/workspace` carrying an older `rev` keeps the
server's messages it never saw (while one it saw and dropped stays dropped) and the
state the turn settled. A save never removes an image record; pictures are deleted
through `DELETE /api/chat/images/{id}`.

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
decrypted for the response. So is `description` — the vision model's prose about
the picture, or a hand-written one — which a single item carries (`GET
/api/media/{id}`, and the `PATCH` answer) but list pages leave out. `PATCH` accepts
`description`; `""` clears it. The search box matches it like a note.

## Civitai

The catalogue, proxied through the server (the `civitai.red` mirror by default; the
API key, when set, goes in a header and never in a URL). Everything the studio's
Civitai browser does is here. Uploading is not: Civitai has no public upload API.

Every route works against both generators. InvokeAI downloads an install itself and
keeps the dressing in its model records. Automatic1111 has no such API, so with
`imageGenModelsDir` set the server downloads the file into A1111's folder (hashing it
on the way in), writes the dressing as A1111's sidecar files and asks A1111 to
rescan; the job list below has the same shape either way. Without the folder, A1111's
models are still matched and linked — the picker shows the catalogue's cover and a
LoRA gets its trained words from the link — but install, update, cover and delete
answer 409. A1111 files are matched by SHA256 (its own when it has computed one, else
the server's, computed once in the background and kept in `/config/a1111-hashes.json`),
falling back to A1111's short AutoV2 hash and a LoRA's AutoV3 until then.

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/imagegen/civitai/search?q=&type=&category=&base=&period=&sort=&creator=&nsfw=&cursor=` | one page → `{items, nextCursor}`. `type` ∈ checkpoint, lora, embedding, vae, controlnet, upscaler, detection (ADetailer's YOLO detectors, installed into `models/adetailer` on A1111), video (checkpoints and LoRAs together, without the workflows filed under the same bases — the browser's video mode); `base` may be repeated for any of several; `period` ∈ day, week, month, year, all; `sort` ∈ downloaded (default), rated, newest, liked, discussed, collected, images; `nsfw=0` hides adult models. Each version carries `installed` when the generator holds its file (matched by BLAKE3, SHA256, AutoV2 or AutoV3). |
| GET | `/api/imagegen/civitai/models/{id}` | one model's page: sanitized HTML `description`, every version with `files`, showcase `images`, `publishedAt`, and the same `installed` flags. On search and here, a Wan version that is one half of a Wan 2.2 pair carries `stage` (`high`/`low`, read off its name: "High", "low noise", a lone "H"…) and `twin`, the id of the version that is its other half |
| GET | `/api/imagegen/civitai/images?versionId=\|modelId=\|postId=\|collectionId=\|username=&sort=&period=&nsfw=&cursor=` | posted pictures → `{items, nextCursor, withPrompts, keySet}`. Each item carries the prompt and settings behind it when the poster kept them — which Civitai shares only with an API key, hence `withPrompts` and `keySet` — plus `postId` and `createdAt` |
| GET | `/api/imagegen/civitai/posts?username=&nsfw=&cursor=` | someone's posts, newest first → `{items:[{id, username, createdAt, images}], nextCursor}`. Civitai has no posts endpoint; a page of their pictures is grouped by `postId`, so a post can continue onto the next page (the clients merge it) |
| GET | `/api/imagegen/civitai/collections?q=&sort=&cursor=` | public collections by name → `{items:[{id, name, description, type, count, cover, username, userId, nsfw}], nextCursor}`; `sort` ∈ newest (default), followers. The catalogue ignores every owner filter, so nobody's own collections can be listed — only searched. `images?collectionId=` lists an Image or Post collection's pictures; a Model collection cannot be opened (the model search rejects the filter) |
| GET | `/api/imagegen/civitai/categories` | the catalogue's most-used tags → `{categories:[{name,count}]}` |
| GET | `/api/imagegen/civitai/image?url=` | streams one preview through the server; Civitai hosts only |
| GET | `/api/imagegen/civitai/me` | who the API key belongs to → `{id, username, image, cover}`; 400 without a key. `cover` is the profile's cover photo when the user record carries one, which the public API mostly does not — the clients fall back to the newest posted picture |
| POST | `/api/imagegen/civitai/install` | `{url, modelId, versionId}` → the install job. With the ids, the server writes the catalogue's description, trigger words and first preview onto the model once the download completes. On A1111 a LoRA's file is named after its model and version (`Makima Chainsaw Man - Pony v2.safetensors`, see `/api/imagegen/names/suggest`) rather than the uploader's file name. A1111 needs the ids — they say which folder the file goes in and what it is called — and refuses embeddings, which A1111 keeps outside its models folder. A detector (type "Detection", or "Other" tagged for ADetailer) goes into `models/adetailer`, unpacked when it is a `.zip` — see `/api/imagegen/detectors/install`. `target: "comfy"` downloads into ComfyUI's folders for clips instead, needing neither the picture generator nor its folder: a checkpoint into the Wan models folder (`comfyDiffusionDir`; the checkpoints folder, `comfyCheckpointDir`, when its name says all-in-one/AIO), a LoRA into `comfyLoraDir`, a VAE into `comfyVaeDir`, a file on its own keeping its uploader's name; `pair: true` starts the version's `twin` too, the two named after what their uploaded names share and then their half (`smoothMixWan2214BI2V_i2vV20High` and `…Low` become `smoothMixWan2214BI2V_i2vV20_high` and `_low`, with `_i2v`/`_t2v` added when the name does not say). 409 when there is no folder for what is being installed |
| GET | `/api/imagegen/civitai/installs` | the install queue → `{jobs}` (InvokeAI's, or the downloads the server is running into A1111's folder, kept in memory); a completed job carries `modelKey`. `?target=comfy` is the downloads into ComfyUI instead → `{jobs, places}`, `places` keyed `diffusion_models`, `checkpoints`, `loras`, `vae` — each `{dir, problem}` from `comfyDiffusionDir`, `comfyCheckpointDir`, `comfyLoraDir`, `comfyVaeDir`, used exactly as set: `dir` "" when blank or unusable, with `problem` saying why when it was set. Nothing falls back to another folder or a mount |
| GET | `/api/imagegen/civitai/installed?refresh=` | the studio's models with their catalogue records → `{models:[{key,name,type,base,hasCover,civitai?}]}`. `civitai` holds the ids, creator, previews, trained words, `updateAvailable` and `coverUrl` (the preview chosen as cover, when one was). Looked up by file hash and remembered for a day; `refresh=1` asks again |
| POST | `/api/imagegen/civitai/sync` | `{key, versionId?}` → applies the catalogue's cover, description and trigger words to one installed model now, by hash or by the version given → the record, or `{}` when the file is not on Civitai. A cover chosen for the same version is kept |
| POST | `/api/imagegen/civitai/cover` | `{key, url}` → 204. Makes one of the catalogue's pictures (a Civitai host only) the model's cover and remembers the choice; on an A1111 without its folder only the choice is kept, and the picker shows it |
| POST | `/api/imagegen/civitai/update` | `{key, versionId?}` → InvokeAI's install job for that version (the newest when unsaid) of the model the record is linked to. Once the download completes and the new record is dressed, the old record is deleted, file included. 400 when the model is not linked or is already at that version |
| DELETE | `/api/imagegen/model?key=` | removes a model or LoRA from the generator (its file too, when InvokeAI manages it; the file and its sidecars on A1111) and forgets its catalogue record and recommended settings → 204. A LoRA's display name is accepted for `key` |
| GET | `/api/imagegen/civitai/suggest?key=\|versionId=` | what a model's page recommends → `{suggestion:{triggerWords, positive?, negative?, steps?, cfgScale?, scheduler?, clipSkip?, width?, height?, weight?, weightMin?, weightMax?, sources}, modelName, keySet}`. Read off the version's card and then the model's ("Steps: 15-30", "CFG scale: 5-7", a "Negative prompt" heading, "strength 0.6–0.8") and, with an API key, filled from the showcase pictures' settings (most common value; a LoRA's weight from the resources they list). `sources` says per field whether it came from the `description` or the `examples`. A `key` that was never linked is looked up by hash first. Nothing is saved; a fresh install applies it to every setting the model has none of |

A model's recommended settings (`GET`/`PATCH /api/imagegen/model`, `defaults`) are
split by where they can live. Steps, CFG, CFG rescale, scheduler, size, VAE and a
LoRA's weight are the generator's (InvokeAI's `default_settings`, A1111's sidecar).
`positive`, `negative`, `clipSkip`, `weightMin` and `weightMax` have no field on
either and are kept by the server (`model_defaults`), laid over the record wherever
it is read, including `/api/imagegen/status`'s models and LoRAs (a LoRA carries
`negative`, `weightMin`, `weightMax`). A `PATCH` changes only the ones it names, so
a client that does not know them never clears them. The studio puts a checkpoint's
`positive` at the front of the prompt and its `negative` at the end of the negative
when it is picked (and takes the previous model's out while still unedited), and
adds a LoRA's `negative` while the LoRA is on.

Model descriptions are HTML written by whoever uploaded the model. The server keeps
paragraphs, headings, lists, emphasis, code and http(s) links and drops everything
else — scripts, styles, images, event attributes — so a client can render
`description` as markup.

## Collections

A named, ordered list of items. The order is the point: it is the one thing a tag
cannot express, since a tag says what something is and says it about everything it is
on equally. Deleting a collection never deletes what was on it.

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/collections` | → `{items:[{id,name,count,cover,createdAt}]}`; `cover` is the first item's id, 0 when empty |
| POST | `/api/collections` | `{name}` → `{id,name}`. 409 if the name is taken |
| PATCH | `/api/collections/{id}` | `{name}` → 204. 409 if the name is taken |
| DELETE | `/api/collections/{id}` | 204. The items stay in the library |
| GET | `/api/collections/{id}/items?limit=&offset=` | → `{collection, items, total}`, in the collection's own order |
| POST | `/api/collections/{id}/items` | `{mediaIds}` → `{added}`. Appends; anything already on the list is skipped rather than refused |
| DELETE | `/api/collections/{id}/items/{media}` | 204 |
| PUT | `/api/collections/{id}/order` | `{mediaIds}` → 204. Partial: the ids named go first, everything else keeps its order behind them |
| GET | `/api/media/{id}/collections` | which lists one item is on |

## Resume

Where a user was in an item — seconds for a video, page index for a comic. Per user
and server-side, so a film started on the sofa carries on in bed.

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/media/{id}/progress` | → `{mediaId, position, duration, updatedAt}`. Never opened reads as `position: 0`, not 404 |
| PUT | `/api/media/{id}/progress` | `{position}` → 204. A position of 0 clears it |
| DELETE | `/api/media/{id}/progress` | 204 — "start again" |
| GET | `/api/resume` | items left part-way through, most recent first → `{items, progress}` |

Anything at or past 97% of its duration is treated as finished and is left off
`/api/resume`: a "carry on with" shelf whose first tile is something you finished last
night is worse than an empty one.

## Bookmarks

A moment in a video worth coming back to: chosen, named, and several per clip, where
progress is one overwritten number. Per user. A frame is grabbed at the mark when
ffmpeg is available (a full decrypt to a temp file, as the poster picker pays); without
one the mark still lands and the thumb endpoint serves the item's poster instead.

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/media/{id}/bookmarks` | → `{bookmarks:[{id,mediaId,position,label,hasThumb,createdAt}]}`, in timeline order |
| POST | `/api/media/{id}/bookmarks` | `{position, label?}` → the bookmark. Videos and gifs only; the label is encrypted at rest, ≤80 chars |
| PATCH | `/api/bookmarks/{bookmark}` | `{label}` → the bookmark |
| DELETE | `/api/bookmarks/{bookmark}` | 204 |
| GET | `/api/bookmarks/{bookmark}/thumb` | the frame, JPEG |
| GET | `/api/bookmarks?limit=` | the user's latest marks across the library, with `title` and `kind` on each |

Libby reads them: the open video's marks are in her "watching together" context with
where they sit relative to the current position, and an attachment she writes as
`[attach: <title> @ 4:10]` resolves with `at` set, which the clients open the viewer at.

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
