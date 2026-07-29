package net.fourbakers.oppailib.data

import android.content.Context
import android.os.Build
import coil.ImageLoader
import coil.decode.GifDecoder
import coil.decode.ImageDecoderDecoder
import kotlinx.serialization.json.Json
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import java.util.concurrent.TimeUnit
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import retrofit2.Retrofit
import java.io.File
import java.net.URLEncoder

/**
 * Single source of truth for network + session. Rebuilds the API client (and a
 * matching Coil image loader that carries the auth header) whenever the server
 * URL changes. Held as a process-wide singleton by [net.fourbakers.oppailib.OppaiApp].
 */
class Repository(private val appContext: Context, val prefs: Prefs) {

    // coerceInputValues: a `null` sent for a field whose Kotlin type is non-nullable
    // but has a default falls back to that default instead of throwing. The server
    // marshals a Go nil slice as JSON `null` (e.g. an empty `links` on a chat reply),
    // and without this the whole response fails to parse with an "unexpected JSON"
    // error — the recurring class of bug behind chat breaking on Android.
    private val json = Json { ignoreUnknownKeys = true; coerceInputValues = true }
    // Things for Libby to say around the app, each with a pose so she reacts in
    // character — a worried "surprised" for failures, a bright "happy" for wins.
    private val _errors = MutableSharedFlow<MascotSay>(extraBufferCapacity = 8)
    val errors = _errors.asSharedFlow()
    private val _libraryChanges = MutableSharedFlow<Unit>(extraBufferCapacity = 4)
    val libraryChanges = _libraryChanges.asSharedFlow()

    @Volatile private var baseUrl: String = normalize(prefs.serverUrl ?: "http://10.0.2.2:8080/")
    @Volatile lateinit var api: ApiService
        private set
    @Volatile lateinit var imageLoader: ImageLoader
        private set

    init {
        LibbyMeter.setMultiplier(prefs.libbyProgressionMultiplier)
        rebuild()
    }

    val hasSession: Boolean get() = prefs.token != null
    val canBiometricReauth: Boolean get() = prefs.biometricLock && prefs.hasReauthCredential

    fun setServer(url: String) {
        baseUrl = normalize(url)
        prefs.serverUrl = baseUrl
        rebuild()
    }

    fun streamUrl(id: Long): String = "${baseUrl}api/media/$id/stream"

    /**
     * Poster URL. The server generates one for every kind it can (ffmpeg frame for
     * video, cover page for comics) and falls back to the blob itself for image/gif,
     * so tiles should always ask for this rather than streaming the full original.
     */
    fun thumbUrl(id: Long): String = "${baseUrl}api/media/$id/thumb"

    /** A single comic page, 1-based to match what the reader shows the user. */
    fun pageUrl(id: Long, page: Int): String = "${baseUrl}api/media/$id/page/$page"

    /**
     * Fetches a remote image through the server. A game's screenshots live on the
     * site it was scraped from, and asking the phone to load them directly would
     * both leak the request and often be refused by the origin's hotlink rules.
     */
    fun proxyUrl(url: String): String =
        "${baseUrl}api/scrape/proxy?url=${URLEncoder.encode(url, "UTF-8")}"

    /**
     * Streams a remote source's media through the server, which forwards Range so a
     * video can be seeked. The server refuses any host that isn't a registered
     * source, so this can't be pointed at arbitrary URLs.
     */
    fun sourceStreamUrl(url: String): String =
        "${baseUrl}api/sources/stream?url=${URLEncoder.encode(url, "UTF-8")}"

    // ── image generation URLs ─────────────────────────────────────────────
    // All streamed through the server like every other image; the Coil loader's auth
    // header rides along.

    /** A just-generated preview, held in the server's memory until saved or expired. */
    fun genPreviewUrl(id: String): String =
        "${baseUrl}api/imagegen/preview/${URLEncoder.encode(id, "UTF-8")}"

    /** A checkpoint's preview art (user-set, or the generator's own cover image). */
    fun modelThumbUrl(model: String): String =
        "${baseUrl}api/imagegen/model-thumb?model=${URLEncoder.encode(model, "UTF-8")}"

    fun loraThumbUrl(name: String): String =
        "${baseUrl}api/imagegen/lora-thumb?name=${URLEncoder.encode(name, "UTF-8")}"

    fun characterThumbUrl(id: String): String =
        "${baseUrl}api/imagegen/characters/${URLEncoder.encode(id, "UTF-8")}/thumb"

    fun chatImageUrl(id: String): String =
        "${baseUrl}api/chat/images/${URLEncoder.encode(id, "UTF-8")}"

    /** An InvokeAI gallery image's thumbnail, streamed through the server. */
    fun galleryThumbUrl(name: String): String =
        "${baseUrl}api/imagegen/gallery/image/${URLEncoder.encode(name, "UTF-8")}/thumb"

    fun galleryFullUrl(name: String): String =
        "${baseUrl}api/imagegen/gallery/image/${URLEncoder.encode(name, "UTF-8")}"

    /** A Civitai preview image, proxied so the phone never talks to Civitai. */
    fun civitaiImageUrl(url: String): String =
        "${baseUrl}api/imagegen/civitai/image?url=${URLEncoder.encode(url, "UTF-8")}"

    /** One emotion of a Libby outfit at a horniness tier (level 0 = baseline).
        404s when the outfit lacks that emotion/tier, so callers keep a fallback. */
    fun libbyEmotionUrl(outfitId: String, emotion: String, level: Int = 0): String {
        val base = "${baseUrl}api/libby/outfits/${URLEncoder.encode(outfitId, "UTF-8")}/emotions/$emotion"
        return if (level > 0) "$base?level=$level" else base
    }

    /** An outfit's card art. `v` busts Coil's cache after a cover changes — the URL is
        otherwise stable, and a card still showing the old picture is indistinguishable
        from a save that did not work. */
    fun libbyOutfitThumbUrl(outfitId: String, v: Int = 0): String {
        val base = "${baseUrl}api/libby/outfits/${URLEncoder.encode(outfitId, "UTF-8")}/thumb"
        return if (v > 0) "$base?v=$v" else base
    }

    /**
     * The whole library (or one kind of it), walked a page at a time.
     *
     * There is no search endpoint: the list response carries each item's tags, and
     * clients filter over them locally. That only works if the client actually holds
     * the library, so search can't run against a single truncated first page — hence
     * walking to the end rather than taking [PAGE_SIZE] and stopping.
     */
    suspend fun listAll(kind: String?): List<Media> {
        val out = mutableListOf<Media>()
        while (out.size < MAX_ITEMS) {
            val batch = api.listMedia(kind, PAGE_SIZE, out.size).items
            out += batch
            if (batch.size < PAGE_SIZE) break
        }
        return out
    }

    fun saveSession(token: String) { prefs.token = token }
    fun clearSession() { prefs.clearSession() }
    /** Surfaces a message from Libby. [emotion] is her pose — default "surprised"
        (a worried reaction) since most reports are failures; pass "happy" for wins. */
    fun report(message: String, emotion: String = "surprised") { _errors.tryEmit(MascotSay(message, emotion)) }

    fun saveReauthCredential(username: String, password: String) = prefs.saveReauthCredential(username, password)

    suspend fun closeSessionForReauth() {
        try { if (hasSession) api.logout() }
        catch (_: Exception) { /* local logout still wins if the server is unavailable */ }
        finally { prefs.clearActiveToken() }
    }

    suspend fun reauthenticate(): Boolean {
        val username = prefs.reauthUsername ?: return false
        val password = prefs.reauthPassword ?: return false
        return try {
            val response = api.login(LoginRequest(username, password))
            saveSession(response.token)
            true
        } catch (_: Exception) { false }
    }
    fun notifyLibraryChanged() { _libraryChanges.tryEmit(Unit) }

    // ── client construction ──────────────────────────────────────────────

    private fun okHttp(): OkHttpClient =
        OkHttpClient.Builder()
            // OkHttp's default read timeout is 10 seconds, which is fine for every call
            // the app makes except the one that matters most: saving a comic from a
            // remote source. That downloads dozens of pages with a politeness delay
            // between them, sending nothing back until it's finished — so the socket
            // sits quiet for minutes and the default fires long before the answer comes.
            //
            // A long *read* timeout is safe: an unreachable server still fails fast on
            // connect, so this only extends the wait for a server that is connected and
            // busy. The server finishes the import even if we do give up on it.
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(10, TimeUnit.MINUTES)
            .writeTimeout(5, TimeUnit.MINUTES)
            .addInterceptor { chain ->
                val req = chain.request().newBuilder()
                prefs.token?.let { req.header("Authorization", "Bearer $it") }
                try {
                    val response = chain.proceed(req.build())
                    if (!response.isSuccessful && !response.request.url.encodedPath.endsWith("/api/auth/login")) {
                        _errors.tryEmit(MascotSay("The server returned ${response.code}. Please try again."))
                    }
                    response
                } catch (e: Exception) {
                    if (!chain.request().url.encodedPath.endsWith("/api/auth/login")) {
                        _errors.tryEmit(MascotSay(e.message ?: "Couldn't reach the server."))
                    }
                    throw e
                }
            }
            .build()

    private fun rebuild() {
        val client = okHttp()
        val contentType = "application/json".toMediaTypeOrNull()!!
        api = Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(client)
            .addConverterFactory(json.asConverterFactory(contentType))
            .build()
            .create(ApiService::class.java)
        imageLoader = ImageLoader.Builder(appContext)
            .okHttpClient(client)
            .components {
                // Coil's base artifact decodes only the first frame. Registering its
                // animated decoder makes stored and remotely browsed GIFs actually play.
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    add(ImageDecoderDecoder.Factory())
                } else {
                    add(GifDecoder.Factory())
                }
            }
            .build()
    }

    // ── upload helper ────────────────────────────────────────────────────

    /** Builds a multipart part from a local file for [ApiService.upload]. */
    fun filePart(file: File, mime: String?): MultipartBody.Part {
        val body = file.asRequestBody(mime?.toMediaTypeOrNull())
        return MultipartBody.Part.createFormData("file", file.name, body)
    }

    fun titlePart(title: String?): okhttp3.RequestBody? =
        title?.toRequestBody("text/plain".toMediaTypeOrNull())

    companion object {
        /** The server's own ceiling: it quietly falls back to 50 for anything larger. */
        private const val PAGE_SIZE = 200
        private const val MAX_ITEMS = 2000

        private fun normalize(url: String): String {
            var u = url.trim()
            if (!u.startsWith("http://") && !u.startsWith("https://")) u = "http://$u"
            if (!u.endsWith("/")) u += "/"
            return u
        }
    }
}
