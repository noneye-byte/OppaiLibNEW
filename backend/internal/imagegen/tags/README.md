# danbooru.csv.gz

The prompt autocomplete's vocabulary (`../tagcomplete.go`): every Danbooru tag used on
at least 100 posts (artists: 500), as `tag,category,post_count,"alias,alias"`.

Trimmed from `tags/danbooru.csv` in
[a1111-sd-webui-tagcomplete](https://github.com/DominikDoom/a1111-sd-webui-tagcomplete)
(MIT, © 2022 Dominik Reh), taken 2026-10-24. Aliases beginning with `/` are that
extension's own shortcuts and were dropped; at most six aliases are kept per tag.

To refresh it, download that file and re-run the same trim: keep rows whose count is
at least 100 (500 for category 1), keep the first six aliases that do not start with
`/`, and gzip the result at level 9.
