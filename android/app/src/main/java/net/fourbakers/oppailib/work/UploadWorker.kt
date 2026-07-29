package net.fourbakers.oppailib.work

import android.content.Context
import android.content.pm.ServiceInfo
import android.net.Uri
import android.os.Build
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.ForegroundInfo
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import kotlinx.coroutines.delay
import net.fourbakers.oppailib.OppaiApp
import net.fourbakers.oppailib.data.CompleteUploadRequest
import net.fourbakers.oppailib.data.CreateUploadRequest
import net.fourbakers.oppailib.data.Repository
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.RequestBody
import okio.BufferedSink
import retrofit2.HttpException
import java.io.InputStream
import java.util.concurrent.TimeUnit

/**
 * Uploads the queue, one file at a time, as a foreground service.
 *
 * Everything in the brief's list of Android upload failures has the same two causes,
 * and this addresses both directly.
 *
 * The first is that the work belonged to a screen. An upload started from a composable
 * died when the composable did — backing out, locking the phone, switching apps. As a
 * foreground worker the upload owns its own lifetime and a notification says so, which
 * is also what buys it the exemption from background execution limits.
 *
 * The second is that the whole file was handled at once: copied into the cache
 * directory in full (a second copy of a 12 GB video, on a device that may not have
 * room for the first) and then sent as one request that had to survive the entire
 * transfer. Here the bytes are read from the content provider in chunks and streamed
 * straight into the request body — nothing is buffered, nothing is copied, and the
 * unit that has to survive a lift ride through a dead spot is four megabytes rather
 * than the file.
 *
 * What is left after that is bookkeeping, and the server holds it: on every attempt
 * this asks which chunks already arrived and sends only the rest.
 */
class UploadWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    private val repo: Repository get() = OppaiApp.from(applicationContext).repository

    override suspend fun getForegroundInfo(): ForegroundInfo {
        val item = UploadQueue.next() ?: UploadQueue.items.value.firstOrNull { it.live }
        val notification = Notifications.uploadProgress(
            applicationContext,
            item?.name ?: "Uploading",
            if (item == null) 0 else (item.progress * 100).toInt(),
            UploadQueue.items.value.count { it.live },
        )
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ForegroundInfo(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
        } else {
            ForegroundInfo(NOTIFICATION_ID, notification)
        }
    }

    override suspend fun doWork(): Result {
        // Promotion can be refused (Android 12+ refuses it outright for work that
        // starts while the app is backgrounded). An upload that cannot post a
        // notification should still upload; losing the notification is worth less
        // than losing the work.
        runCatching { setForeground(getForegroundInfo()) }

        var uploaded = 0
        var failed = 0
        while (true) {
            if (isStopped) return Result.success()
            val item = UploadQueue.next() ?: break
            when (runOne(item.id)) {
                Outcome.DONE -> uploaded++
                Outcome.FAILED -> failed++
                // Paused or cancelled mid-flight: not a failure, and not something to
                // retry. Move on to whatever else is queued.
                Outcome.STOPPED -> {}
                // The network went away. WorkManager's own retry is the right tool:
                // it waits for the constraint rather than this worker spinning.
                Outcome.RETRY -> return Result.retry()
            }
        }

        if (uploaded > 0 || failed > 0) {
            Notifications.uploadsFinished(applicationContext, uploaded, failed)
            repo.notifyLibraryChanged()
        }
        return Result.success()
    }

    private enum class Outcome { DONE, FAILED, STOPPED, RETRY }

    private suspend fun runOne(id: String): Outcome {
        val start = UploadQueue.byId(id) ?: return Outcome.STOPPED
        UploadQueue.update(id) { it.copy(state = UploadItem.STATE_PREPARING, error = null) }

        val session = try {
            repo.api.createUploadSession(
                CreateUploadRequest(
                    filename = start.name,
                    size = start.size,
                    mime = start.mime,
                    fingerprint = start.id,
                    chunkSize = CHUNK_SIZE,
                ),
            )
        } catch (e: Exception) {
            return fail(id, e, "Couldn't start the upload")
        }

        UploadQueue.update(id) {
            it.copy(
                state = UploadItem.STATE_UPLOADING,
                sessionId = session.id,
                sentBytes = session.receivedBytes,
                // A rate measured before this attempt says nothing about this one.
                bytesPerSecond = 0,
                etaSeconds = 0,
            )
        }
        val meter = SpeedMeter()
        meter.sample(session.receivedBytes)

        val chunkSize = if (session.chunkSize > 0) session.chunkSize else CHUNK_SIZE
        val total = if (session.chunkCount > 0) session.chunkCount else ceilDiv(start.size, chunkSize)
        val have = session.received.toSet()

        val uri = Uri.parse(start.uri)
        try {
            openStream(uri).use { input ->
                var offset = 0L
                for (index in 0 until total) {
                    val current = UploadQueue.byId(id) ?: return Outcome.STOPPED
                    if (current.state == UploadItem.STATE_PAUSED || current.state == UploadItem.STATE_CANCELLED) {
                        return Outcome.STOPPED
                    }
                    if (isStopped) return Outcome.STOPPED

                    val length = minOf(chunkSize, start.size - offset)
                    if (index in have) {
                        // Already on the server. Skipping the bytes rather than sending
                        // them is the resume — and it is why the stream is kept open
                        // across chunks instead of reopened and re-skipped per chunk,
                        // which on a large file is quadratic.
                        skipExactly(input, length)
                        offset += length
                        continue
                    }

                    val bytes = readExactly(input, length.toInt())
                        ?: return fail(id, null, "The file ended sooner than its size said; it may have been edited or moved")
                    when (val sent = sendChunk(id, session.id, index, bytes, start.mime)) {
                        SendResult.OK -> {}
                        SendResult.RETRY -> return Outcome.RETRY
                        SendResult.STOPPED -> return Outcome.STOPPED
                        is SendResult.Refused -> return fail(id, null, sent.message)
                    }
                    offset += length
                    UploadQueue.update(id) {
                        val sent = minOf(it.size, it.sentBytes + length)
                        meter.sample(sent)
                        val rate = meter.rate()
                        it.copy(
                            sentBytes = sent,
                            bytesPerSecond = rate,
                            etaSeconds = if (rate > 0) (it.size - sent) / rate else 0,
                        )
                    }
                    postProgress(id)
                }
            }
        } catch (e: SecurityException) {
            // The persisted permission is gone: the file was moved, the provider
            // revoked access, or the app was reinstalled. Nothing here can fix it, and
            // saying so is more use than a generic failure.
            return fail(id, e, "This app no longer has permission to read that file. Pick it again.")
        } catch (e: Exception) {
            return fail(id, e, "Couldn't read the file")
        }

        // Processing is a real state, not a flourish: the server is encrypting,
        // hashing and indexing a file that may be gigabytes, and a bar sitting at 100%
        // with nothing said is how a working upload gets cancelled by hand.
        UploadQueue.update(id) { it.copy(state = UploadItem.STATE_PROCESSING, bytesPerSecond = 0, etaSeconds = 0) }
        return try {
            val done = repo.api.completeUploadSession(session.id, CompleteUploadRequest())
            UploadQueue.update(id) {
                it.copy(state = UploadItem.STATE_COMPLETED, sentBytes = it.size, mediaId = done.id, error = null)
            }
            Outcome.DONE
        } catch (e: Exception) {
            fail(id, e, "The server couldn't finish the upload")
        }
    }

    private sealed interface SendResult {
        data object OK : SendResult
        data object RETRY : SendResult
        data object STOPPED : SendResult
        data class Refused(val message: String) : SendResult
    }

    /**
     * Sends one chunk, retrying the transient failures here rather than losing the
     * upload to them.
     *
     * A mobile connection drops a request for a few seconds at a time; that is the
     * failure this exists for, and it costs one chunk. A refusal from the server is
     * the opposite — it will be refused again — so it is handed back with the
     * server's own words instead of being re-asked five times.
     */
    private suspend fun sendChunk(itemId: String, sessionId: String, index: Int, bytes: ByteArray, mime: String): SendResult {
        val body = bytes.toRequestBody(mime)
        var attempt = 0
        while (true) {
            if (isStopped) return SendResult.STOPPED
            try {
                repo.api.putUploadChunk(sessionId, index, body)
                return SendResult.OK
            } catch (e: HttpException) {
                // 4xx is the server declining for a reason it will decline again.
                if (e.code() < 500) return SendResult.Refused(serverMessage(e))
                if (attempt >= MAX_CHUNK_ATTEMPTS) return SendResult.RETRY
            } catch (e: Exception) {
                if (attempt >= MAX_CHUNK_ATTEMPTS) return SendResult.RETRY
            }
            attempt++
            UploadQueue.update(itemId) { it.copy(retries = it.retries + 1) }
            delay(backoffMs(attempt))
        }
    }

    private fun fail(id: String, e: Exception?, fallback: String): Outcome {
        val message = when {
            e is HttpException -> serverMessage(e)
            e?.message.isNullOrBlank() -> fallback
            else -> "$fallback: ${e?.message}"
        }
        UploadQueue.update(id) { it.copy(state = UploadItem.STATE_FAILED, error = message) }
        return Outcome.FAILED
    }

    private fun serverMessage(e: HttpException): String {
        val body = runCatching { e.response()?.errorBody()?.string() }.getOrNull().orEmpty()
        // The server's JSON error, unwrapped without a parser: this is one field in a
        // small object, and pulling in a decode here would fail on an HTML error page
        // from a reverse proxy — which is exactly when the message matters most.
        val marker = "\"error\":\""
        val at = body.indexOf(marker)
        if (at >= 0) {
            val start = at + marker.length
            val end = body.indexOf('"', start)
            if (end > start) return body.substring(start, end)
        }
        return "The server said ${e.code()}."
    }

    private suspend fun postProgress(id: String) {
        val item = UploadQueue.byId(id) ?: return
        runCatching {
            setForeground(
                ForegroundInfo(
                    NOTIFICATION_ID,
                    Notifications.uploadProgress(
                        applicationContext,
                        item.name,
                        (item.progress * 100).toInt(),
                        UploadQueue.items.value.count { it.live },
                    ),
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC else 0,
                ),
            )
        }
    }

    private fun openStream(uri: Uri): InputStream =
        applicationContext.contentResolver.openInputStream(uri)
            ?: throw IllegalStateException("the file could not be opened")

    companion object {
        const val TAG = "upload"
        private const val WORK_NAME = "oppai-uploads"
        private const val NOTIFICATION_ID = 1002

        /** 4 MiB. Small enough that a dropped chunk costs seconds on a mobile
            connection and a reverse proxy's body limit is nowhere near it; large
            enough that a two-gigabyte file is five hundred requests, not eight
            thousand. The server clamps whatever is asked for into its own range. */
        private const val CHUNK_SIZE = 4L * 1024 * 1024

        private const val MAX_CHUNK_ATTEMPTS = 4

        private fun backoffMs(attempt: Int): Long = minOf(20_000L, 500L * (1L shl attempt))

        private fun ceilDiv(a: Long, b: Long): Int = if (b <= 0) 0 else ((a + b - 1) / b).toInt()

        /**
         * Queues files and starts the worker.
         *
         * The work is unique and APPENDed rather than replaced: a second share while
         * an upload is running must not cancel the one in flight, which REPLACE would
         * do. KEEP would be wrong too — it would drop the new files on the floor if a
         * worker happened to be running.
         */
        fun enqueue(context: Context, uris: List<Uri>): Int {
            val added = UploadQueue.add(context, uris)
            if (added > 0 || UploadQueue.hasPending()) start(context)
            return added
        }

        fun start(context: Context) {
            val prefs = OppaiApp.from(context).repository.prefs
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(
                    // Wi-Fi only is a real constraint, not a check this code makes:
                    // WorkManager holds the work until the condition is met and
                    // releases it the moment it is, which no amount of polling from
                    // inside the app can do as cheaply.
                    if (prefs.uploadWifiOnly) NetworkType.UNMETERED else NetworkType.CONNECTED,
                )
                // Storage-low is a real cause of upload failure on the device side —
                // the provider may be materialising a cloud file locally as we read it.
                .setRequiresStorageNotLow(true)
                .build()
            val request = OneTimeWorkRequestBuilder<UploadWorker>()
                .addTag(TAG)
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
                .build()
            WorkManager.getInstance(context).enqueueUniqueWork(WORK_NAME, ExistingWorkPolicy.APPEND_OR_REPLACE, request)
        }

        /** Stops the running worker. The queue keeps its state; restarting resumes. */
        fun stop(context: Context) {
            WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME)
        }
    }
}

/**
 * A transfer rate worth showing to a person.
 *
 * A sliding window rather than the lifetime average, which is wrong in both of the
 * directions that matter here: it never recovers from a slow start, and it keeps
 * counting through a stall, so an upload that has been sitting still for a minute
 * still claims to be moving. Nothing is reported until there are two samples spanning
 * real time — an honest blank beats a confident "4 hours left" that becomes "20
 * seconds" a moment later.
 */
private class SpeedMeter(private val windowMs: Long = 8_000) {
    private val samples = ArrayDeque<Pair<Long, Long>>()

    fun sample(bytes: Long, at: Long = System.currentTimeMillis()) {
        samples.addLast(at to bytes)
        while (samples.size > 2 && samples.first().first < at - windowMs) samples.removeFirst()
    }

    /** Bytes per second, or 0 while it cannot honestly be said. */
    fun rate(): Long {
        if (samples.size < 2) return 0
        val (firstAt, firstBytes) = samples.first()
        val (lastAt, lastBytes) = samples.last()
        val millis = lastAt - firstAt
        if (millis <= 0) return 0
        val rate = (lastBytes - firstBytes) * 1000 / millis
        return if (rate > 0) rate else 0
    }
}

/**
 * A request body over an already-read chunk.
 *
 * The chunk is in memory — four megabytes of it, deliberately bounded — because the
 * request may be retried and a one-shot stream cannot be replayed. What is never in
 * memory is the file: it is read a chunk at a time from the provider and each one is
 * released as soon as it lands.
 */
private fun ByteArray.toRequestBody(mime: String): RequestBody {
    val type = (mime.ifBlank { "application/octet-stream" }).toMediaTypeOrNull()
    val bytes = this
    return object : RequestBody() {
        override fun contentType() = type
        override fun contentLength(): Long = bytes.size.toLong()
        override fun writeTo(sink: BufferedSink) {
            sink.write(bytes)
        }
    }
}

/** Reads exactly n bytes, or null if the stream ended early — which means the file
    is not the length its provider claimed, and sending a short chunk would produce a
    corrupt library item rather than an error. */
private fun readExactly(input: InputStream, n: Int): ByteArray? {
    val buffer = ByteArray(n)
    var read = 0
    while (read < n) {
        val got = input.read(buffer, read, n - read)
        if (got < 0) return null
        read += got
    }
    return buffer
}

/** InputStream.skip is allowed to skip fewer bytes than asked, including zero, so
    "skip a chunk" has to be a loop. Getting this wrong misaligns every chunk after
    the first resumed one. */
private fun skipExactly(input: InputStream, n: Long) {
    var left = n
    val scratch = ByteArray(64 * 1024)
    while (left > 0) {
        val skipped = input.skip(left)
        if (skipped > 0) {
            left -= skipped
            continue
        }
        val got = input.read(scratch, 0, minOf(scratch.size.toLong(), left).toInt())
        if (got < 0) return
        left -= got
    }
}
