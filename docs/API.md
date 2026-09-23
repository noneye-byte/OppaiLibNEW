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
| GET | `/api/games/sites` | → `{sites: [Account], sorts, itchNsfw}` — both sites' sign-in state |
| POST | `/api/games/sites/{site}/login` | `{username, password}` or `{cookie}` → `Account`; `401` when the site refuses |
| POST | `/api/games/sites/{site}/logout` | drops the session; for F95zone also forgets the stored login |
| GET | `/api/games/browse?site=&q=&sort=&page=` | one page → `{items, page, hasMore}`; `401` when the site is not signed in |
| POST | `/api/games/browse/detail` | `{item}` → `{item, degraded}` — the result's own page, read on demand |
| POST | `/api/games/browse/add` | `{url, id?, version?}` → `{id, created, media, remote}` |
| GET | `/api/games/updates` | → `{items, tracked, sweep}` — every game whose site has moved on |
| POST | `/api/games/updates/check` | sweeps every game that came from a site, in the background → `202 {started, sweep}` |

**A site is browsed signed in or not at all.** itch.io only serves its adult listings
to an account that has asked for them and F95zone hides threads and download links
from guests, so browsing signed out would quietly show a fraction of what is there
and call it the catalogue. `401` with a message is the honest answer.

The two sign-ins are not alike. F95zone takes a username and password (the same
login the scraper uses for members-only threads, shared with it). **itch.io cannot**:
its login page sits behind a Cloudflare check that only a real browser passes, so it
is signed in by handing over the `itchio` session cookie — pasted from a browser, or
pushed by Launchy, which signs in through itch's own page in a real window. Either
site also accepts a cookie, which is the way in for an F95zone account with two-step
verification. Cookies are stored like the F95 password: write-only over the API.

`add` files the game away through the same import a pasted URL uses — cover art,
description, screenshots and tags — and records the page as where it came from. A
URL already in the library answers `200` with the existing entry rather than a
second copy.

`items` carry `libraryId` when the game is already on the shelf, which is what lets
a browse page mark what you have without the client holding the library.

## Launchy, the desktop launcher

Launchy is the client in the pairing: it holds an ordinary session, syncs on its own
schedule, and long-polls for launch requests. The server never reaches out to the PC,
so nothing has to be configured or opened here and the launcher works from behind any
router.

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/launchy` | → `{connected, name, lastSeen, running, pending}` |
| GET | `/api/launchy/commands?wait=&name=&running=` | the launcher's long poll; `wait` is capped at 25 s. Its arrival is the heartbeat |
| POST | `/api/launchy/commands/{cmd}` | `{ok, error}` — how a request went |
| POST | `/api/launchy/launch` | `{gameId}` → `202` the queued command, or `409` when the launcher is not connected |
| GET | `/api/launchy/launch/{cmd}` | how that request went |
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

A launch is refused rather than queued when no launcher is polling: a request that
sits until a launcher appears hours later and starts a game unbidden is worse than
an error.

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
| POST | `/api/feeds/check`, `/api/feeds/{id}/check` | run now → the list |
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
| POST | `/api/chat` | `viewing` may carry `position`, `duration` (seconds) and `paused` for the open video, so she reacts to this moment of it. `task: "afterglow"` marks the morning-after turn — see below |
| POST | `/api/libby/act` | an approved offer. Besides the action's own fields, send `outfit`, `activity`, `intensity` and `recentMediaIds` as they stand when Allow is pressed: a picture she makes of herself is drawn in that state and filed as a picture of her, tagged with the subject; a `shelf` action rebuilds the collection "Libby's pick" → `{collectionId, name, count}`. The server actions `load` (the model name in `prompt`), `cleanup`, `describe` and `free` are **admin only** (403 otherwise) and answer `{message}`; `load` answers 202 and loads in the background |
| GET | `/api/libby/journal` | → `{entries:[{id, conversationId, text, mood, at}]}`, newest first — what she wrote after conversations went quiet |
| POST | `/api/libby/journal/reflect` | has her write about the latest conversation now → `{entry}`, or `{entry: null, message}` when there is nothing new or memory is off. Can take minutes; 409 while she is already writing |
| DELETE | `/api/libby/journal` | clears the entries (the record of what she has already written about is kept, so she does not immediately rewrite them) |
| DELETE | `/api/libby/journal/{id}` | removes one entry |
| GET | `/api/libby/auto/pending` | → `{pending:[{trigger, detail, decision}]}`: reasons to speak first the server noticed itself. Only `afterglow` so far — owed once, the calendar day after a conversation whose heat peaked at 4 or more. Send the turn with the trigger as `task`, then record it with `/api/libby/auto/sent` |
| POST | `/api/tts/speak` | `{text, voice?, speed?, heat?}`; `heat` 1–5 makes piper read slower and breathier from 3 up |

A remembered boundary (memory kind `boundary`) rules intimate states out server-side
the way the heat floor does: "no toys" refuses `[doing: vibrator]` on the turn the
model forgets it, and the state is left out of her vocabulary for the turn.

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

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/imagegen/civitai/search?q=&type=&category=&base=&period=&sort=&creator=&nsfw=&cursor=` | one page → `{items, nextCursor}`. `type` ∈ checkpoint, lora, embedding, vae, controlnet, upscaler; `period` ∈ day, week, month, year, all; `sort` ∈ downloaded (default), rated, newest, liked, discussed, collected, images; `nsfw=0` hides adult models. Each version carries `installed` when InvokeAI holds its file (matched by BLAKE3). |
| GET | `/api/imagegen/civitai/models/{id}` | one model's page: sanitized HTML `description`, every version with `files`, showcase `images`, `publishedAt`, and the same `installed` flags |
| GET | `/api/imagegen/civitai/images?versionId=\|modelId=\|postId=\|collectionId=\|username=&sort=&period=&nsfw=&cursor=` | posted pictures → `{items, nextCursor, withPrompts, keySet}`. Each item carries the prompt and settings behind it when the poster kept them — which Civitai shares only with an API key, hence `withPrompts` and `keySet` — plus `postId` and `createdAt` |
| GET | `/api/imagegen/civitai/posts?username=&nsfw=&cursor=` | someone's posts, newest first → `{items:[{id, username, createdAt, images}], nextCursor}`. Civitai has no posts endpoint; a page of their pictures is grouped by `postId`, so a post can continue onto the next page (the clients merge it) |
| GET | `/api/imagegen/civitai/collections?q=&sort=&cursor=` | public collections by name → `{items:[{id, name, description, type, count, cover, username, userId, nsfw}], nextCursor}`; `sort` ∈ newest (default), followers. The catalogue ignores every owner filter, so nobody's own collections can be listed — only searched. `images?collectionId=` lists an Image or Post collection's pictures; a Model collection cannot be opened (the model search rejects the filter) |
| GET | `/api/imagegen/civitai/categories` | the catalogue's most-used tags → `{categories:[{name,count}]}` |
| GET | `/api/imagegen/civitai/image?url=` | streams one preview through the server; Civitai hosts only |
| GET | `/api/imagegen/civitai/me` | who the API key belongs to → `{id, username, image, cover}`; 400 without a key. `cover` is the profile's cover photo when the user record carries one, which the public API mostly does not — the clients fall back to the newest posted picture |
| POST | `/api/imagegen/civitai/install` | `{url, modelId, versionId}` → InvokeAI's install job. With the ids, the server writes the catalogue's description, trigger words and first preview onto the InvokeAI record once the download completes |
| GET | `/api/imagegen/civitai/installs` | InvokeAI's install queue → `{jobs}`; a completed job carries `modelKey` |
| GET | `/api/imagegen/civitai/installed?refresh=` | the studio's models with their catalogue records → `{models:[{key,name,type,base,hasCover,civitai?}]}`. `civitai` holds the ids, creator, previews, trained words, `updateAvailable` and `coverUrl` (the preview chosen as cover, when one was). Looked up by file hash and remembered for a day; `refresh=1` asks again |
| POST | `/api/imagegen/civitai/sync` | `{key, versionId?}` → applies the catalogue's cover, description and trigger words to one installed model now, by hash or by the version given → the record, or `{}` when the file is not on Civitai. A cover chosen for the same version is kept |
| POST | `/api/imagegen/civitai/cover` | `{key, url}` → 204. Makes one of the catalogue's pictures (a Civitai host only) the model's InvokeAI cover and remembers the choice |
| POST | `/api/imagegen/civitai/update` | `{key, versionId?}` → InvokeAI's install job for that version (the newest when unsaid) of the model the record is linked to. Once the download completes and the new record is dressed, the old record is deleted, file included. 400 when the model is not linked or is already at that version |
| DELETE | `/api/imagegen/model?key=` | removes a model or LoRA from InvokeAI (its file too, when InvokeAI manages it) and forgets its catalogue record → 204. A LoRA's display name is accepted for `key` |

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
