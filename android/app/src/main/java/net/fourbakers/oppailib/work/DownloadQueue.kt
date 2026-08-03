package net.fourbakers.oppailib.work

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.Serializable
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.Json
import net.fourbakers.oppailib.data.Media
import net.fourbakers.oppailib.data.Prefs

/** Durable record of unencrypted copies this phone is downloading. */
@Serializable
data class DownloadItem(
    val id: String,
    val mediaId: Long,
    val name: String,
    val size: Long,
    val mime: String = "application/octet-stream",
    val state: String = STATE_QUEUED,
    val downloadedBytes: Long = 0,
    val bytesPerSecond: Long = 0,
    val etaSeconds: Long = 0,
    val path: String? = null,
    val error: String? = null,
    val addedAt: Long = System.currentTimeMillis(),
) {
    val progress: Float
        get() = if (size <= 0) 0f else (downloadedBytes.toFloat() / size).coerceIn(0f, 1f)
    val live: Boolean get() = state in setOf(STATE_QUEUED, STATE_DOWNLOADING, STATE_PAUSED)

    companion object {
        const val STATE_QUEUED = "queued"
        const val STATE_DOWNLOADING = "downloading"
        const val STATE_PAUSED = "paused"
        const val STATE_COMPLETED = "completed"
        const val STATE_FAILED = "failed"
        const val STATE_CANCELLED = "cancelled"
    }
}

fun DownloadItem.statusLabel(): String = when (state) {
    DownloadItem.STATE_QUEUED -> "Queued"
    DownloadItem.STATE_DOWNLOADING -> "Downloading"
    DownloadItem.STATE_PAUSED -> "Paused"
    DownloadItem.STATE_COMPLETED -> "Downloaded"
    DownloadItem.STATE_FAILED -> "Failed"
    DownloadItem.STATE_CANCELLED -> "Cancelled"
    else -> state
}

object DownloadQueue {
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }
    private val serializer = ListSerializer(DownloadItem.serializer())
    private val _items = MutableStateFlow<List<DownloadItem>>(emptyList())
    val items: StateFlow<List<DownloadItem>> = _items.asStateFlow()
    private var prefs: Prefs? = null

    @Synchronized
    fun attach(prefs: Prefs) {
        if (this.prefs != null) return
        this.prefs = prefs
        _items.value = prefs.downloadQueue
            ?.let { runCatching { json.decodeFromString(serializer, it) }.getOrNull() }
            ?: emptyList()
    }

    @Synchronized
    fun enqueue(media: Media): Boolean {
        val id = media.id.toString()
        val existing = _items.value.firstOrNull { it.id == id }
        if (existing?.live == true || existing?.state == DownloadItem.STATE_COMPLETED) return false
        val item = DownloadItem(
            id = id,
            mediaId = media.id,
            name = downloadName(media),
            size = media.size,
            mime = mimeFor(media.kind),
        )
        write(_items.value.filterNot { it.id == id } + item)
        return true
    }

    @Synchronized fun byId(id: String): DownloadItem? = _items.value.firstOrNull { it.id == id }

    @Synchronized
    fun next(): DownloadItem? = _items.value.firstOrNull { it.state == DownloadItem.STATE_QUEUED }

    @Synchronized
    fun update(id: String, transform: (DownloadItem) -> DownloadItem) {
        write(_items.value.map { if (it.id == id) transform(it) else it })
    }

    @Synchronized fun pause(id: String) = update(id) { it.copy(state = DownloadItem.STATE_PAUSED) }
    @Synchronized fun resume(id: String) = update(id) {
        it.copy(state = DownloadItem.STATE_QUEUED, error = null, bytesPerSecond = 0, etaSeconds = 0)
    }
    @Synchronized fun remove(id: String) = write(_items.value.filterNot { it.id == id })
    @Synchronized fun hasPending(): Boolean = _items.value.any { it.state == DownloadItem.STATE_QUEUED }

    @Synchronized
    fun requeueInterrupted() {
        write(_items.value.map {
            if (it.state == DownloadItem.STATE_DOWNLOADING) {
                it.copy(state = DownloadItem.STATE_QUEUED, bytesPerSecond = 0, etaSeconds = 0)
            } else it
        })
    }

    private fun write(items: List<DownloadItem>) {
        _items.value = items
        prefs?.downloadQueue = json.encodeToString(serializer, items)
    }

    private fun downloadName(media: Media): String {
        val clean = media.title.trim().replace(Regex("[\\\\/:*?\"<>|]"), "_")
        val stem = clean.ifBlank { "oppailib-${media.id}" }
        if (stem.substringAfterLast('/').contains('.')) return stem
        return stem + when (media.kind) {
            "video" -> ".mp4"
            "gif" -> ".gif"
            "image" -> ".jpg"
            "comic" -> ".cbz"
            else -> ".bin"
        }
    }

    private fun mimeFor(kind: String): String = when (kind) {
        "video" -> "video/mp4"
        "gif" -> "image/gif"
        "image" -> "image/jpeg"
        "comic" -> "application/vnd.comicbook+zip"
        else -> "application/octet-stream"
    }
}
