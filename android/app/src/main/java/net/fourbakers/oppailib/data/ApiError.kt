package net.fourbakers.oppailib.data

import retrofit2.HttpException

/**
 * What the server actually said, for a screen to put in front of the user.
 *
 * Retrofit hands a failed call back as an [HttpException] whose message is "HTTP 502
 * Bad Gateway" — which is never the thing worth showing. The server writes a sentence
 * into a small JSON object on every refusal, and on the paths this exists for that
 * sentence *is* the interaction: "F95zone did not accept that cookie — it may have
 * expired", "sign in to F95zone to browse it". Showing 502 instead leaves the user
 * with a number and no next move.
 *
 * Unwrapped without a parser on purpose. The body here is one field in a small object,
 * and a decode would throw on the HTML error page a reverse proxy returns — which is
 * exactly the case where the fallback matters most.
 */
fun Throwable.serverMessage(fallback: String): String {
    if (this !is HttpException) return message?.takeIf { it.isNotBlank() } ?: fallback
    val body = runCatching { response()?.errorBody()?.string() }.getOrNull().orEmpty()
    return errorSentence(body) ?: "The server said ${code()}."
}

/**
 * The sentence in a server refusal's `{"error": "…"}`, or null when the body isn't one.
 *
 * Escapes are read rather than stopped at. A message that quotes a title — "Hanime only
 * offers "Shoujo Ramune 8" to signed-in members" — used to end at its first quote mark,
 * and Go writes `&`, `<` and `>` as \u escapes, which came through as six characters.
 */
fun errorSentence(body: String): String? {
    val marker = "\"error\":\""
    val at = body.indexOf(marker)
    if (at < 0) return null
    val out = StringBuilder()
    var i = at + marker.length
    while (i < body.length) {
        val c = body[i]
        if (c == '"') return out.toString().takeIf { it.isNotBlank() }
        if (c != '\\' || i + 1 >= body.length) {
            out.append(c)
            i++
            continue
        }
        when (val e = body[i + 1]) {
            'u' -> {
                body.substring(i + 2, minOf(i + 6, body.length)).toIntOrNull(16)?.let { out.append(it.toChar()) }
                i += 6
                continue
            }
            'n' -> out.append('\n')
            't' -> out.append('\t')
            else -> out.append(e) // \" \\ \/
        }
        i += 2
    }
    return null
}

/**
 * Whether a failure is the site saying "not until you sign in".
 *
 * 409, deliberately not 401: the client treats a 401 from any endpoint as its own
 * session ending and signs out on the spot, so a game site that has not been signed in
 * to must never answer with one. See the backend's handleGameBrowse.
 */
fun Throwable.isSignedOut(): Boolean = this is HttpException && code() == 409
