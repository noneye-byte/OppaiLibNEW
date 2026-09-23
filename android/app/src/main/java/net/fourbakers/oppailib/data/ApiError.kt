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
    val marker = "\"error\":\""
    val at = body.indexOf(marker)
    if (at >= 0) {
        val start = at + marker.length
        val end = body.indexOf('"', start)
        if (end > start) return body.substring(start, end)
    }
    return "The server said ${code()}."
}

/**
 * Whether a failure is the site saying "not until you sign in".
 *
 * 409, deliberately not 401: the client treats a 401 from any endpoint as its own
 * session ending and signs out on the spot, so a game site that has not been signed in
 * to must never answer with one. See the backend's handleGameBrowse.
 */
fun Throwable.isSignedOut(): Boolean = this is HttpException && code() == 409
