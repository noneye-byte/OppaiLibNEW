package net.fourbakers.oppailib.data

import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone

/*
 * The pure parts of browsing Civitai the way the site is: the web's civitai-browse.ts,
 * line for line where it can be, so the phone and the web agree on what a page shows.
 */

/** The next page of a feed added to what is shown, without what is already there. The
 *  site's cursors are positions in a list that keeps changing under them, so a page can
 *  repeat the end of the last one — and a repeated picture is a repeated key. */
fun mergeCivitaiImages(shown: List<CivitaiImage>, page: List<CivitaiImage>): List<CivitaiImage> {
    val seen = shown.mapTo(HashSet()) { it.id }
    return shown + page.filter { seen.add(it.id) }
}

fun mergeCivitaiComments(shown: List<CivitaiComment>, page: List<CivitaiComment>): List<CivitaiComment> {
    val seen = shown.mapTo(HashSet()) { it.id }
    return shown + page.filter { seen.add(it.id) }
}

/** The pictures of [current]'s post, or just it when the post has not been read. */
fun postPictures(current: CivitaiImage, post: List<CivitaiImage>?): List<CivitaiImage> {
    if (post.isNullOrEmpty()) return listOf(current)
    return if (post.any { it.id == current.id }) post else listOf(current) + post
}

/** A compact count: 1.2k, 3.4M. */
fun compactNumber(n: Long): String = when {
    n <= 0 -> "0"
    n >= 1_000_000 -> (if (n >= 10_000_000) "%.0fM" else "%.1fM").format(n / 1_000_000.0).replace(".0M", "M")
    n >= 1_000 -> (if (n >= 10_000) "%.0fk" else "%.1fk").format(n / 1_000.0).replace(".0k", "k")
    else -> n.toString()
}

private val isoParsers = listOf("yyyy-MM-dd'T'HH:mm:ss.SSSZ", "yyyy-MM-dd'T'HH:mm:ssZ", "yyyy-MM-dd'T'HH:mm:ss")

/** Milliseconds since the epoch for one of the site's ISO times, or null. */
fun parseIsoTime(iso: String): Long? {
    if (iso.isBlank()) return null
    // SimpleDateFormat's ISO zone letter (X) needs API 24 and the app runs on 23, so the
    // zone is rewritten into RFC 822's "+0000" for Z. Trimming the fraction to three
    // digits keeps a microsecond time from failing the millisecond pattern.
    val s = iso.trim().replace(Regex("""\.(\d{3})\d+"""), ".$1")
        .replace(Regex("Z$"), "+0000")
        .replace(Regex("""([+-]\d{2}):(\d{2})$"""), "$1$2")
    for (p in isoParsers) {
        val f = SimpleDateFormat(p, Locale.US).apply { timeZone = TimeZone.getTimeZone("UTC") }
        runCatching { return f.parse(s)?.time }
    }
    return null
}

/** How long ago, the way a comment says it: "just now", "5m", "3h", "2d", then a date. */
fun timeAgo(iso: String, now: Long = System.currentTimeMillis()): String {
    val t = parseIsoTime(iso) ?: return ""
    val s = ((now - t) / 1000).coerceAtLeast(0)
    if (s < 60) return "just now"
    val m = Math.round(s / 60.0)
    if (m < 60) return "${m}m"
    val h = Math.round(m / 60.0)
    if (h < 24) return "${h}h"
    val d = Math.round(h / 24.0)
    if (d < 30) return "${d}d"
    val date = Calendar.getInstance().apply { timeInMillis = t }
    val thisYear = Calendar.getInstance().apply { timeInMillis = now }.get(Calendar.YEAR)
    val pattern = if (date.get(Calendar.YEAR) == thisYear) "MMM d" else "MMM d, yyyy"
    return SimpleDateFormat(pattern, Locale.getDefault()).format(date.time)
}

private val cdn = Regex("""^(https://image\.civitai\.com/[^/]+/[^/]+/)([^/]+)(/[^/]+)$""")
private val widthOption = Regex("""(^|,)width=\d+""")

/**
 * A Civitai CDN picture at a width for a tile. The CDN names its variants in the path
 * ("/original=true/", "/width=450/") and the feed hands out originals — a gallery of
 * thirty of those is a hundred megabytes for tiles a few hundred pixels wide. Only the
 * width is touched: a clip's still is "anim=false,transcode=true,…", and dropping those
 * asks the CDN for the clip itself. Anything not shaped like the CDN's is left alone.
 */
fun civitaiSized(url: String, width: Int): String {
    val m = cdn.matchEntire(url) ?: return url
    val (head, options, tail) = m.destructured
    val w = "width=$width"
    if (options == "original=true") return "$head$w$tail"
    if (widthOption.containsMatchIn(options)) return head + options.replace(widthOption) { r -> r.groupValues[1] + w } + tail
    return url
}

/** One reaction a picture drew, for the viewer's row. */
data class CivitaiReaction(val kind: String, val label: String, val count: Int)

/** A picture's reactions, the ones it has, in the site's order. */
fun reactionsOf(stats: CivitaiImageStats?): List<CivitaiReaction> {
    if (stats == null) return emptyList()
    return listOf(
        CivitaiReaction("likes", "Likes", stats.likes),
        CivitaiReaction("hearts", "Hearts", stats.hearts),
        CivitaiReaction("laughs", "Laughs", stats.laughs),
        CivitaiReaction("cries", "Cries", stats.cries),
    ).filter { it.count > 0 }
}

/** Wan's base models as the catalogue names them, newest first: video mode's bases. */
val civitaiVideoBases = listOf(
    "Wan Video 2.2 I2V-A14B" to "Wan 2.2 · picture to video",
    "Wan Video 2.2 T2V-A14B" to "Wan 2.2 · words to video",
    "Wan Video 2.2 TI2V-5B" to "Wan 2.2 5B",
    "Wan Video 14B i2v 480p" to "Wan 2.1 · picture to video, 480p",
    "Wan Video 14B i2v 720p" to "Wan 2.1 · picture to video, 720p",
    "Wan Video 14B t2v" to "Wan 2.1 · words to video",
    "Wan Video" to "Wan, unspecified",
)

/** The comment sorts the site's section offers, by the server's names. */
val civitaiCommentSorts = listOf("newest" to "Newest", "oldest" to "Oldest", "reactions" to "Most reactions")
