# Vendored fonts

Served from this origin, never from Google. Two reasons: a `<link>` to
`fonts.googleapis.com` tells Google the IP of every household running OppaiLib and
when they opened it, and on a LAN-only or offline Unraid box the request never
returns — so the icon font never arrives and every button renders as the word
`play_arrow`. The CSP in [security.go](../../../backend/internal/api/security.go) no
longer lists the Google hosts, so a re-added `<link>` fails loudly instead of
quietly phoning home.

| File | What | Size |
|------|------|------|
| `roboto-latin.woff2` | Roboto, variable weight 400–700, latin | 43 kB |
| `roboto-latin-ext.woff2` | same, latin-ext | 29 kB |
| `material-symbols-rounded.woff2` | 235 icons, static `wght 400 / FILL 0` | 25 kB |
| `material-symbols-rounded-fill.woff2` | same 235 icons, static `wght 500 / FILL 1` | 31 kB |
| `icon-names.txt` | the glyph list both icon files were subset to | — |

Roboto's other seven subsets (cyrillic, greek, vietnamese…) are omitted: Roboto has
no CJK coverage in any of them, so a Japanese title falls back to a system font
either way. The icon font is two static instances rather than one variable face
because the UI only ever draws the outlined and the filled weight — 57 kB against
315 kB for a variable face carrying axes nothing sweeps.

## Refreshing them

`icon-names.txt` is every snake_case token in `web/src` that is also a real glyph
name, which over-includes harmlessly and cannot miss one that a lookup map holds:

```sh
curl -sSL 'https://raw.githubusercontent.com/google/material-design-icons/master/variablefont/MaterialSymbolsRounded%5BFILL%2CGRAD%2Copsz%2Cwght%5D.codepoints' \
  | cut -d' ' -f1 | sort -u > /tmp/glyphs
{ grep -rhoE '"[a-z][a-z0-9_]{1,40}"' web/src --include=*.ts | tr -d '"'
  grep -rhoE ">[a-z][a-z0-9_]{1,40}<" web/src --include=*.ts | tr -d '><'; } \
  | sort -u | comm -12 - /tmp/glyphs > web/public/fonts/icon-names.txt
```

Then re-request each face, with a browser User-Agent (Google serves TTF to curl's
own) and the axis values pinned to the instance you want:

```sh
UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36'
NAMES=$(tr '\n' ',' < web/public/fonts/icon-names.txt | sed 's/,$//')
curl -sS -A "$UA" -G https://fonts.googleapis.com/css2 \
  --data-urlencode 'family=Material Symbols Rounded:opsz,wght,FILL,GRAD@24,400,0,0' \
  --data-urlencode "icon_names=$NAMES"
```

The stylesheet that comes back names one `url(...)`; download that to the matching
`.woff2` above. `@24,500,1,0` is the filled face. Roboto is
`family=Roboto:wght@400..700`, whose stylesheet holds nine faces — take the two
whose `unicode-range` begins `U+0000-00FF` (latin) and `U+0100-02BA` (latin-ext).

If you add an icon whose name no lookup map spells out literally, re-run the
extraction before releasing, or it renders as its own name.
