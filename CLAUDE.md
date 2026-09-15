# Working in this repo

Personal self-hosted media library: a Go server with an embedded Lit web UI and a
companion Android app. [ARCHITECTURE.md](ARCHITECTURE.md) is the map;
[docs/API.md](docs/API.md) is the endpoint reference. This file is the things that are
true about *working here* and are not visible from the code.

## Build and check

```sh
cd web     && npm run build && npm test      # build writes into the Go embed dir
cd backend && go vet ./... && go test ./...
```

`web/vite.config.ts` emits into `backend/internal/web/dist/`, which is committed and
`go:embed`-ed into the binary. **A change to `web/src` is not in the app until
`npm run build` has run** — and the built bundle is a release artifact, so it is
rebuilt as part of releasing rather than left stale with a new version number.

CI runs exactly the two lines above ([.github/workflows/checks.yml](.github/workflows/checks.yml)),
and both release workflows depend on it. A push to `main` *is* a release — it publishes
the GHCR image and the APK — so there is nothing between a red test and a shipped
regression except that gate.

Kotlin has no wrapper on the usual path; see the memory note on running locally for the
`gradle.bat` invocation.

## Releasing

One commit on `main`, titled `Release <x.y.z>: <lowercase clause about what she can now
do>` — read `git log` for the voice. Three version files move together:
`unraid/oppailib.xml` `<Version>` (the source of truth the workflows read),
`web/package.json`, and `android/app/build.gradle.kts`. The Go version is stamped by
ldflags, so there is nothing to edit there.

## Things that bite

- **Encrypted titles mean SQL cannot search.** `title_enc`/`notes_enc` are ciphertext,
  so free-text search runs against an in-memory index the KEK-holding process builds by
  decrypting once (`api/chat_library_index.go`, entered for the library by
  `api/media_search.go`). Everything else — kind, tag, favourite, rating, sort, paging —
  is ordinary SQL in `db/media_page.go`. Never write decrypted text back to disk.
- **The client must not download the library.** It used to: every screen fetched all of
  it and filtered in the browser. `GET /api/media` takes the query now and returns
  `{items, total}`. If a feature seems to need the whole collection client-side, it
  needs a server endpoint instead.
- **Icons are a subset.** The Material Symbols font in `web/public/fonts` holds only the
  glyphs the source names. Adding an icon without refreshing the subset renders the
  *word* — `web/src/icon-subset.test.ts` fails when that happens, and
  `web/public/fonts/README.md` has the refresh commands.
- **Fonts and the CSP.** Nothing may be loaded from a third-party host; `font-src` and
  `style-src` are `'self'` and the app is expected to work on a LAN with no internet.
- **Lazy views upgrade late.** The heavy screens are dynamic imports. Lit runs
  `connectedCallback` at element-upgrade time, *before* re-applying property bindings
  set beforehand — so a view is rendered only once its chunk is in (`ready()` in
  `views/library.ts`). Writing the element out early gives it `undefined` properties.
- **View transitions are asynchronous.** `withViewTransition(cb)` hands `cb` to
  `document.startViewTransition`, which calls it later. State the callback sets is not
  set when the call returns; loads that depend on it belong *inside* the callback.
- **Android re-serializes the chat workspace on save.** A field added to the Go
  `chatCharacter` must also be added to `android/.../data/Models.kt`, or the phone reads
  it, drops it, and writes the object back without it.
- **`mediaColumns` and `briefColumns`** are the two column lists the media queries share.
  Adding a column to one scan means adding it to that constant, not to a single query.

## House style

Comments explain *why*, in prose, and are expected — read the surrounding file before
writing one and match its register. A comment that restates the code is noise; a comment
that records the bug a line exists to prevent is the point. Tests are named as sentences
about behaviour (`"a blank line splits however short the halves are"`), and pure logic
lives in its own module beside its test rather than inside a component
(`chat-text.ts`, `gen-grid.ts`, `upload-queue.ts`, `outfit-loadout.ts` are the pattern).
