package net.fourbakers.oppailib.work

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.Serializable
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.Json
import net.fourbakers.oppailib.data.Prefs

/**
 * The upload queue, and the only durable record of what this phone is trying to send.
 *
 * Everything about uploading a long video is a question of what survives what. The
 * screen turns off, the user switches apps, Android kills the process to reclaim
 * memory, the phone reboots — and until now every one of those lost the upload,
 * because it lived in a screen's coroutine and the file had already been copied into
 * the cache directory as a second full-size copy.
 *
 * So the queue is written to disk on every change, and it holds *content URIs*
 * rather than copies. A persisted URI permission is what makes that work across a
 * restart; without one the URI is a handle to nothing the next time the app runs.
 * The bytes are read from the provider a chunk at a time and never assembled
 * anywhere on the device.
 */
@Serializable
data class UploadItem(
    /** The file's identity: name, size and last-modified. Also the server's
        fingerprint, so re-queueing the same file resumes rather than duplicates. */
    val id: String,
    val uri: String,
    val name: String,
    val size: Long,
    val mime: String = "",
    val state: String = STATE_QUEUED,
    val sessionId: String? = null,
    val sentBytes: Long = 0,
    val retries: Int = 0,
    val error: String? = null,
    val mediaId: Long = 0,
    val addedAt: Long = 0,
    val position: Int = 0,
    /**
     * The current transfer rate, and how long the rest of the file will take at it.
     *
     * Recomputed over a short window rather than averaged over the whole upload: the
     * lifetime average never recovers from a slow start and keeps counting through a
     * pause, so it reports a speed the upload is not achieving. Zero means "not
     * known", and the UI shows nothing rather than a confident wrong number.
     *
     * Persisted along with everything else only because it is part of the same
     * record; it is reset when the worker picks the item up again, since a rate
     * measured before the process died says nothing about now.
     */
    val bytesPerSecond: Long = 0,
    val etaSeconds: Long = 0,
) {
    val terminal: Boolean get() = state in TERMINAL_STATES
    val live: Boolean get() = !terminal
    val progress: Float get() = if (size <= 0) 0f else (sentBytes.toFloat() / size).coerceIn(0f, 1f)

    companion object {
        const val STATE_QUEUED = "queued"
        const val STATE_PREPARING = "preparing"
        const val STATE_UPLOADING = "uploading"
        const val STATE_PAUSED = "paused"
        const val STATE_PROCESSING = "processing"
        const val STATE_COMPLETED = "completed"
        const val STATE_FAILED = "failed"
        const val STATE_CANCELLED = "cancelled"

        val TERMINAL_STATES = setOf(STATE_COMPLETED, STATE_FAILED, STATE_CANCELLED)
    }
}

/** What a row says about itself, in words rather than in a state name. */
fun UploadItem.label(): String = when (state) {
    UploadItem.STATE_QUEUED -> "Queued"
    UploadItem.STATE_PREPARING -> "Preparing"
    UploadItem.STATE_UPLOADING -> "Uploading"
    UploadItem.STATE_PAUSED -> "Paused"
    UploadItem.STATE_PROCESSING -> "Processing on the server"
    UploadItem.STATE_COMPLETED -> "Completed"
    UploadItem.STATE_FAILED -> "Failed"
    UploadItem.STATE_CANCELLED -> "Cancelled"
    else -> state
}

object UploadQueue {

    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }
    private val serializer = ListSerializer(UploadItem.serializer())

    private val _items = MutableStateFlow<List<UploadItem>>(emptyList())
    val items: StateFlow<List<UploadItem>> = _items.asStateFlow()

    private var prefs: Prefs? = null

    /** Called once, from the Application, before anything reads the queue. */
    @Synchronized
    fun attach(prefs: Prefs) {
        if (this.prefs != null) return
        this.prefs = prefs
        _items.value = read(prefs)
    }

    private fun read(prefs: Prefs): List<UploadItem> =
        prefs.uploadQueue
            // A queue that fails to parse — written by an older build, or hand-edited —
            // must not take the app down on launch. Losing the list costs the record of
            // what was queued; the sessions themselves are still on the server, and the
            // next sync finds them.
            ?.let { runCatching { json.decodeFromString(serializer, it) }.getOrNull() }
            ?: emptyList()

    private fun write(items: List<UploadItem>) {
        _items.value = items
        prefs?.uploadQueue = runCatching { json.encodeToString(serializer, items) }.getOrNull()
    }

    @Synchronized
    fun update(id: String, transform: (UploadItem) -> UploadItem) {
        write(_items.value.map { if (it.id == id) transform(it) else it })
    }

    @Synchronized
    fun replaceAll(items: List<UploadItem>) = write(renumber(items))

    /**
     * Adds files, skipping any that are already queued and unfinished.
     *
     * That skip is the duplicate guard: sharing the same video into the app twice, or
     * a double-tapped button, adds one upload. Returns how many were actually added,
     * so the caller can say something true about it.
     */
    @Synchronized
    fun add(context: Context, uris: List<Uri>): Int {
        val current = _items.value.toMutableList()
        var position = current.size
        var added = 0
        for (uri in uris) {
            val facts = describe(context, uri) ?: continue
            val existing = current.firstOrNull { it.id == facts.id }
            if (existing != null && existing.live) continue
            current.removeAll { it.id == facts.id }
            current += UploadItem(
                id = facts.id,
                uri = uri.toString(),
                name = facts.name,
                size = facts.size,
                mime = facts.mime,
                addedAt = System.currentTimeMillis(),
                position = position++,
            )
            added++
        }
        if (added > 0) write(renumber(current))
        return added
    }

    @Synchronized
    fun pause(id: String) = update(id) {
        // The rate goes with it: a paused upload showing "2.1 MB/s" is a lie, and the
        // estimate built on it is a worse one.
        if (it.terminal) it else it.copy(state = UploadItem.STATE_PAUSED, bytesPerSecond = 0, etaSeconds = 0)
    }

    @Synchronized
    fun resume(id: String) = update(id) {
        if (it.state == UploadItem.STATE_PAUSED) it.copy(state = UploadItem.STATE_QUEUED, error = null) else it
    }

    @Synchronized
    fun retry(id: String) = update(id) {
        it.copy(state = UploadItem.STATE_QUEUED, error = null, retries = 0)
    }

    @Synchronized
    fun cancel(id: String) = update(id) {
        if (it.terminal) it else it.copy(state = UploadItem.STATE_CANCELLED)
    }

    /** Removes one finished row. A live upload is cancelled, never silently dropped. */
    @Synchronized
    fun remove(id: String) {
        write(renumber(_items.value.filterNot { it.id == id && it.terminal }))
    }

    @Synchronized
    fun clearFinished() {
        write(renumber(_items.value.filter { it.live }))
    }

    /** Moves a pending upload up (-1) or down (+1) the queue. */
    @Synchronized
    fun move(id: String, direction: Int) {
        val ordered = renumber(_items.value).toMutableList()
        val movable = ordered.filter { it.state == UploadItem.STATE_QUEUED || it.state == UploadItem.STATE_PAUSED }
        val from = movable.indexOfFirst { it.id == id }
        val to = from + direction
        if (from < 0 || to < 0 || to >= movable.size) return
        val a = movable[from]
        val b = movable[to]
        write(ordered.map {
            when (it.id) {
                a.id -> it.copy(position = b.position)
                b.id -> it.copy(position = a.position)
                else -> it
            }
        }.sortedBy { it.position })
    }

    /** The next upload the worker should run, in queue order. */
    @Synchronized
    fun next(): UploadItem? =
        renumber(_items.value).firstOrNull { it.state == UploadItem.STATE_QUEUED }

    @Synchronized
    fun byId(id: String): UploadItem? = _items.value.firstOrNull { it.id == id }

    /** True while there is anything left to do — what decides whether to enqueue work. */
    fun hasPending(): Boolean = _items.value.any { it.state == UploadItem.STATE_QUEUED }

    /**
     * Marks work that was mid-flight when the process died.
     *
     * Called at startup. An item recorded as uploading is one whose worker no longer
     * exists, so leaving it in that state would show a row that claims to be moving
     * and is not. It goes back to queued rather than paused: the user did not stop
     * it, Android did, and the whole point is that it picks up where it left off.
     */
    @Synchronized
    fun requeueInterrupted() {
        write(_items.value.map {
            when (it.state) {
                UploadItem.STATE_UPLOADING, UploadItem.STATE_PREPARING, UploadItem.STATE_PROCESSING ->
                    it.copy(state = UploadItem.STATE_QUEUED, bytesPerSecond = 0, etaSeconds = 0)
                else -> it
            }
        })
    }

    private fun renumber(items: List<UploadItem>): List<UploadItem> =
        items.sortedBy { it.position }.mapIndexed { index, item -> item.copy(position = index) }

    private data class Facts(val id: String, val name: String, val size: Long, val mime: String)

    /**
     * What the provider will tell us about a file, without reading it.
     *
     * The size has to be known before the first byte is sent — the server needs it to
     * lay out the chunks, and it is also what the pre-flight disk check is made
     * against. OpenableColumns is the usual source; a provider that declines to answer
     * (some cloud storage does) is asked again through the file descriptor, which
     * reports the real length once the document has been materialised. A file whose
     * size cannot be established at all is refused here rather than failing obscurely
     * at the far end.
     */
    private fun describe(context: Context, uri: Uri): Facts? {
        var name: String? = null
        var size = -1L
        runCatching {
            context.contentResolver.query(uri, null, null, null, null)?.use { c ->
                val nameIdx = c.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                val sizeIdx = c.getColumnIndex(OpenableColumns.SIZE)
                if (c.moveToFirst()) {
                    if (nameIdx >= 0) name = c.getString(nameIdx)
                    if (sizeIdx >= 0 && !c.isNull(sizeIdx)) size = c.getLong(sizeIdx)
                }
            }
        }
        if (size <= 0) {
            size = runCatching {
                context.contentResolver.openFileDescriptor(uri, "r")?.use { it.statSize }
            }.getOrNull() ?: -1L
        }
        if (size <= 0) return null
        val display = name ?: "upload_${System.currentTimeMillis()}"
        val mime = runCatching { context.contentResolver.getType(uri) }.getOrNull().orEmpty()
        // Last-modified is not reliably exposed by every provider, so the URI itself
        // stands in for it. Two different files with the same name and size under the
        // same URI are the same file.
        return Facts(id = "$display:$size:${uri}", name = display, size = size, mime = mime)
    }
}
