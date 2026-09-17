package net.fourbakers.oppailib.data

/**
 * Appends a page of posts to the ones already shown.
 *
 * Posts come from the server as a page of someone's pictures grouped by post, and
 * the catalogue pages pictures, not posts — so a post with many pictures can end
 * one page and continue on the next, arriving as two posts with one id. The
 * continuation is folded into the post already on screen rather than shown as a
 * second card (which, keyed by id, would also crash the list). Any other repeat
 * (a cursor that shifted under us) is dropped. Mirrors web/src/civitai-posts.ts.
 */
fun mergeCivitaiPosts(have: List<CivitaiPost>, page: List<CivitaiPost>): List<CivitaiPost> {
    if (have.isEmpty()) return page.distinctBy { it.id }
    val out = have.toMutableList()
    val seen = have.mapTo(HashSet()) { it.id }
    for (post in page) {
        if (seen.add(post.id)) {
            out += post
            continue
        }
        val last = out.last()
        if (last.id == post.id) {
            val known = last.images.mapTo(HashSet()) { it.id }
            out[out.lastIndex] = last.copy(images = last.images + post.images.filter { it.id !in known })
        }
    }
    return out
}

/** The day a post was made, as "2024-02-22"; "" when the feed did not say. */
fun CivitaiPost.dateLabel(): String {
    val iso = createdAt.ifBlank { images.firstOrNull()?.createdAt ?: "" }
    return if (iso.length >= 10) iso.substring(0, 10) else ""
}
