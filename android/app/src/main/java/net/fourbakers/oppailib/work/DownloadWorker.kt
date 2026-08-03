package net.fourbakers.oppailib.work

import android.content.ClipData
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Environment
import androidx.core.content.FileProvider
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.ForegroundInfo
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import net.fourbakers.oppailib.OppaiApp
import java.io.File
import java.io.RandomAccessFile
import java.util.concurrent.TimeUnit

/** Streams queued media to device storage in a foreground worker with range resume. */
class DownloadWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    private val repo get() = OppaiApp.from(applicationContext).repository

    override suspend fun getForegroundInfo(): ForegroundInfo {
        val item = DownloadQueue.next() ?: DownloadQueue.items.value.firstOrNull { it.live }
        val notification = Notifications.downloadProgress(
            applicationContext,
            item?.name ?: "Downloading",
            ((item?.progress ?: 0f) * 100).toInt(),
            DownloadQueue.items.value.count { it.live },
        )
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ForegroundInfo(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
        } else ForegroundInfo(NOTIFICATION_ID, notification)
    }

    override suspend fun doWork(): Result {
        runCatching { setForeground(getForegroundInfo()) }
        if (!repo.hasSession && !repo.reauthenticate()) return Result.retry()

        var completed = 0
        var failed = 0
        while (!isStopped) {
            val item = DownloadQueue.next() ?: break
            // Biometric locking deliberately closes the foreground UI session. The
            // worker may still have more queued files after that first response ends,
            // so establish a background session again without unlocking the UI.
            if (!repo.hasSession && !repo.reauthenticate()) return Result.retry()
            when (download(item)) {
                Outcome.DONE -> completed++
                Outcome.FAILED -> failed++
                Outcome.RETRY -> return Result.retry()
                Outcome.STOPPED -> Unit
            }
        }
        if (completed > 0 || failed > 0) Notifications.downloadsFinished(applicationContext, completed, failed)
        return Result.success()
    }

    private enum class Outcome { DONE, FAILED, RETRY, STOPPED }

    private suspend fun download(start: DownloadItem): Outcome {
        val part = partFile(applicationContext, start)
        val final = finalFile(applicationContext, start)
        part.parentFile?.mkdirs()
        var offset = if (part.isFile) part.length() else 0L
        if (start.size > 0 && offset > start.size) {
            part.delete()
            offset = 0
        }
        DownloadQueue.update(start.id) {
            it.copy(state = DownloadItem.STATE_DOWNLOADING, downloadedBytes = offset, error = null)
        }

        val response = try {
            repo.api.streamMediaRange(start.mediaId, if (offset > 0) "bytes=$offset-" else null)
        } catch (e: Exception) {
            DownloadQueue.update(start.id) { it.copy(state = DownloadItem.STATE_QUEUED, error = e.message) }
            return Outcome.RETRY
        }
        if (!response.isSuccessful) {
            response.errorBody()?.close()
            if (response.code() >= 500 || response.code() == 408 || response.code() == 429) {
                DownloadQueue.update(start.id) { it.copy(state = DownloadItem.STATE_QUEUED, error = "Server returned ${response.code()}") }
                return Outcome.RETRY
            }
            DownloadQueue.update(start.id) { it.copy(state = DownloadItem.STATE_FAILED, error = "Server returned ${response.code()}") }
            return Outcome.FAILED
        }
        val body = response.body() ?: run {
            DownloadQueue.update(start.id) { it.copy(state = DownloadItem.STATE_FAILED, error = "Empty response") }
            return Outcome.FAILED
        }
        // A proxy may ignore Range. A 200 response starts at byte zero, so truncate
        // instead of appending a second whole copy to the partial file.
        if (offset > 0 && response.code() != 206) {
            offset = 0
            part.delete()
        }

        return try {
            var copied = offset
            var sampleAt = System.nanoTime()
            var sampleBytes = copied
            var lastPosted = copied
            RandomAccessFile(part, "rw").use { output ->
                output.seek(offset)
                body.byteStream().use { input ->
                    val buffer = ByteArray(64 * 1024)
                    while (true) {
                        val current = DownloadQueue.byId(start.id) ?: return Outcome.STOPPED
                        if (current.state == DownloadItem.STATE_PAUSED || isStopped) return Outcome.STOPPED
                        val count = input.read(buffer)
                        if (count < 0) break
                        output.write(buffer, 0, count)
                        copied += count
                        val now = System.nanoTime()
                        if (copied - lastPosted >= 512 * 1024 || now - sampleAt >= 1_000_000_000L) {
                            val seconds = (now - sampleAt).coerceAtLeast(1) / 1_000_000_000.0
                            val rate = ((copied - sampleBytes) / seconds).toLong().coerceAtLeast(0)
                            DownloadQueue.update(start.id) {
                                it.copy(
                                    downloadedBytes = copied,
                                    bytesPerSecond = rate,
                                    etaSeconds = if (rate > 0 && it.size > copied) (it.size - copied) / rate else 0,
                                )
                            }
                            postProgress(start.id)
                            sampleAt = now
                            sampleBytes = copied
                            lastPosted = copied
                        }
                    }
                }
            }
            if (start.size > 0 && copied != start.size) {
                DownloadQueue.update(start.id) { it.copy(state = DownloadItem.STATE_QUEUED, downloadedBytes = copied, error = "Download was interrupted") }
                Outcome.RETRY
            } else {
                if (final.exists()) final.delete()
                if (!part.renameTo(final)) {
                    part.copyTo(final, overwrite = true)
                    part.delete()
                }
                DownloadQueue.update(start.id) {
                    it.copy(
                        state = DownloadItem.STATE_COMPLETED,
                        downloadedBytes = if (it.size > 0) it.size else final.length(),
                        path = final.absolutePath,
                        bytesPerSecond = 0,
                        etaSeconds = 0,
                        error = null,
                    )
                }
                Outcome.DONE
            }
        } catch (e: Exception) {
            DownloadQueue.update(start.id) {
                it.copy(state = DownloadItem.STATE_QUEUED, downloadedBytes = part.length(), error = e.message)
            }
            Outcome.RETRY
        } finally {
            body.close()
        }
    }

    private suspend fun postProgress(id: String) {
        val item = DownloadQueue.byId(id) ?: return
        runCatching {
            setForeground(
                ForegroundInfo(
                    NOTIFICATION_ID,
                    Notifications.downloadProgress(
                        applicationContext,
                        item.name,
                        (item.progress * 100).toInt(),
                        DownloadQueue.items.value.count { it.live },
                    ),
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC else 0,
                ),
            )
        }
    }

    companion object {
        private const val WORK_NAME = "oppai-downloads"
        private const val NOTIFICATION_ID = 1003

        fun start(context: Context) {
            val request = OneTimeWorkRequestBuilder<DownloadWorker>()
                .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 15, TimeUnit.SECONDS)
                .build()
            // If a worker is just winding down, append another pass rather than
            // dropping a newly resumed/enqueued item in that small race window.
            WorkManager.getInstance(context).enqueueUniqueWork(WORK_NAME, ExistingWorkPolicy.APPEND_OR_REPLACE, request)
        }

        fun remove(context: Context, item: DownloadItem) {
            item.path?.let { File(it).delete() }
            partFile(context, item).delete()
            finalFile(context, item).delete()
            DownloadQueue.remove(item.id)
        }

        fun open(context: Context, item: DownloadItem) {
            val file = item.path?.let(::File)?.takeIf { it.isFile } ?: return
            val uri = FileProvider.getUriForFile(context, "${context.packageName}.updates", file)
            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, item.mime)
                clipData = ClipData.newRawUri("OppaiLib download", uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(Intent.createChooser(intent, "Open download").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        }

        private fun root(context: Context): File =
            (context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS) ?: File(context.filesDir, "downloads"))
                .apply { mkdirs() }

        private fun fileStem(item: DownloadItem): String = "${item.mediaId}-${item.name}"
        private fun partFile(context: Context, item: DownloadItem) = File(root(context), ".${fileStem(item)}.part")
        private fun finalFile(context: Context, item: DownloadItem) = File(root(context), fileStem(item))
    }
}
