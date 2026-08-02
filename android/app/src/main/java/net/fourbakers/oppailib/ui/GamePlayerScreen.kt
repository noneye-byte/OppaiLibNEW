package net.fourbakers.oppailib.ui

import android.annotation.SuppressLint
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import net.fourbakers.oppailib.data.Repository
import okhttp3.Request
import java.io.ByteArrayInputStream

/** Hosts itch serves a browser build from. The server validates the embed URL before
 *  handing it over; this keeps the player pinned to those hosts too, so a redirect
 *  can't walk the WebView somewhere else. */
private val itchEmbedHosts = listOf("html-classic.itch.zone", "html.itch.zone", "itch.io")

private fun isItchEmbedUrl(raw: String): Boolean {
    val host = runCatching { android.net.Uri.parse(raw) }
        .getOrNull()
        ?.takeIf { it.scheme == "https" }
        ?.host
        ?.lowercase()
        ?: return false
    return itchEmbedHosts.any { host == it || host.endsWith(".$it") }
}

/**
 * Plays an imported HTML5 game build in a WebView.
 *
 * # Why the requests are intercepted
 *
 * The build is served from an authenticated endpoint, and the app authenticates with
 * a bearer token rather than a cookie. `loadUrl(url, headers)` would attach the token
 * to the first request only — every script, texture and audio file the game then
 * loads would come back 401. So every request is intercepted and reissued through the
 * repository's authenticated client instead.
 *
 * # Why the settings are what they are
 *
 * A game build is untrusted code from the internet, so the WebView is configured to
 * be a browser for one origin and nothing more: no file:// access, no content://
 * access, and no universal access from file URLs (which would let a build read any
 * origin). The server's own Content-Security-Policy — scoped to this game's build
 * path — is what stops it reaching the rest of the API, and the WebView honours it.
 *
 * JavaScript and DOM storage *are* on: without the first there is no game at all, and
 * unlike the web player's opaque-origin iframe this WebView has a real origin, so the
 * second lets engines that autosave to localStorage actually work.
 */
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun GamePlayerScreen(repo: Repository, gameId: Long, embedUrl: String?, onClose: () -> Unit) {
    BackHandler(onBack = onClose)

    // An itch embed is somebody else's origin, fetched without our token and with no
    // build of ours behind it, so it is loaded plainly rather than interposed on.
    // Interception exists purely to attach our bearer token, and there is none to
    // attach here.
    val embed = !embedUrl.isNullOrBlank()
    val playUrl = remember(gameId, embedUrl) { embedUrl?.takeIf { embed } ?: repo.gamePlayUrl(gameId) }
    // Only paths inside this game's own build are ever served. Anything else the page
    // asks for is refused here as well as by the server's CSP.
    val allowedPrefix = remember(gameId) { repo.gamePlayUrl(gameId) }

    val context = LocalContext.current
    val webView = remember(gameId, playUrl) {
        WebView(context).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            settings.cacheMode = WebSettings.LOAD_DEFAULT
            setBackgroundColor(android.graphics.Color.BLACK)

            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(
                    view: WebView,
                    request: WebResourceRequest,
                ): WebResourceResponse? {
                    // itch serves its own build from its own hosts; let the WebView
                    // fetch it normally. Reissuing those through our client would only
                    // strip the cookies the embed needs and attach a token itch has no
                    // use for.
                    if (embed) return null
                    val url = request.url.toString()
                    if (!url.startsWith(allowedPrefix)) {
                        // Outside the build: hand back an empty 403 rather than letting
                        // the WebView fetch it unauthenticated (or at all).
                        return WebResourceResponse(
                            "text/plain", "utf-8", 403, "Forbidden",
                            emptyMap(), ByteArrayInputStream(ByteArray(0)),
                        )
                    }
                    // Only GET is ever needed to run a build, and reissuing anything
                    // else would be replaying a request we don't understand.
                    if (!request.method.equals("GET", ignoreCase = true)) return null
                    return try {
                        val response = repo.gameClient
                            .newCall(Request.Builder().url(url).build())
                            .execute()
                        val body = response.body ?: return null
                        val contentType = response.header("Content-Type") ?: "application/octet-stream"
                        val mime = contentType.substringBefore(';').trim()
                        val charset = contentType
                            .substringAfter("charset=", "")
                            .trim()
                            .ifEmpty { null }
                        WebResourceResponse(
                            mime,
                            charset,
                            response.code,
                            // A blank reason phrase throws; some servers send none.
                            response.message.ifBlank { "OK" },
                            // Forward the server's CSP so the same policy that protects
                            // the browser player protects this one.
                            response.headers.toMultimap()
                                .filterKeys { it.equals("Content-Security-Policy", ignoreCase = true) }
                                .mapValues { it.value.joinToString(", ") },
                            body.byteStream(),
                        )
                    } catch (_: Exception) {
                        // Let the WebView render its own failure rather than crashing
                        // the screen; a game that can't load its files is a broken
                        // import, not a broken app.
                        null
                    }
                }

                // A build must not be able to navigate the player anywhere else. An
                // embed legitimately redirects within itch's own hosts, so it is held
                // to those rather than to our build path.
                override fun shouldOverrideUrlLoading(
                    view: WebView,
                    request: WebResourceRequest,
                ): Boolean {
                    val url = request.url.toString()
                    return if (embed) !isItchEmbedUrl(url) else !url.startsWith(allowedPrefix)
                }
            }
            loadUrl(playUrl)
        }
    }

    DisposableEffect(webView) {
        onDispose {
            // Without this the engine keeps running — audio and all — after the screen
            // is gone.
            webView.stopLoading()
            webView.loadUrl("about:blank")
            webView.destroy()
        }
    }

    Box(Modifier.fillMaxSize().background(Color.Black)) {
        AndroidView(factory = { webView }, modifier = Modifier.fillMaxSize())
        IconButton(
            onClick = onClose,
            modifier = Modifier.align(Alignment.TopEnd).padding(8.dp),
        ) {
            Icon(Icons.Filled.Close, contentDescription = "Stop playing", tint = Color.White)
        }
    }
}
