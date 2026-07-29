package net.fourbakers.oppailib.work

import android.content.Context
import android.content.pm.ServiceInfo
import android.os.Build
import androidx.work.BackoffPolicy
import androidx.work.CoroutineWorker
import androidx.work.Data
import androidx.work.ForegroundInfo
import androidx.work.NetworkType
import androidx.work.Constraints
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.OutOfQuotaPolicy
import androidx.work.WorkManager
import androidx.work.workDataOf
import java.util.concurrent.TimeUnit
import kotlinx.serialization.json.Json
import net.fourbakers.oppailib.OppaiApp
import net.fourbakers.oppailib.data.ImportResponse
import net.fourbakers.oppailib.data.ScrapeImportRequest
import net.fourbakers.oppailib.data.SourceSaveRequest

/**
 * Imports that the server answers slowly: saving a whole 4chan thread as a comic, or
 * importing a scraped page. Both pull every image server-side with a politeness delay
 * between them and send nothing back until they're finished — minutes, for a big
 * thread.
 *
 * Doing that in a screen's coroutine meant the import died when the screen did: back
 * out of the browser, or let the phone lock, and the work was abandoned halfway with
 * no way to tell. As a foreground worker it survives both, and the notification is
 * what tells you it's still going and what it ended up with.
 *
 * Retries are safe: the server dedups by content hash, so an import that runs twice
 * imports the same files once.
 */
class ImportWorker(context: Context, params: androidx.work.WorkerParameters) :
    CoroutineWorker(context, params) {

    private val label: String get() = inputData.getString(KEY_LABEL) ?: "Item"

    override suspend fun getForegroundInfo(): ForegroundInfo {
        val notification = Notifications.progress(applicationContext, label)
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ForegroundInfo(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
        } else {
            ForegroundInfo(NOTIFICATION_ID, notification)
        }
    }

    override suspend fun doWork(): Result {
        // Best-effort, not load-bearing. The first attempt runs while the user is still
        // looking at the app, so promoting to a foreground service is allowed. A *retry*
        // may fire much later with the app backgrounded, where Android 12+ refuses the
        // promotion outright — and an import that can't post a notification should still
        // import. Losing the notification is worth less than losing the work.
        runCatching { setForeground(getForegroundInfo()) }

        val repo = OppaiApp.from(applicationContext).repository
        val payload = inputData.getString(KEY_PAYLOAD) ?: return Result.failure()

        val outcome = runCatching {
            when (inputData.getString(KEY_JOB)) {
                JOB_SOURCE -> repo.api.saveFromSource(
                    inputData.getString(KEY_SOURCE_ID).orEmpty(),
                    json.decodeFromString<SourceSaveRequest>(payload),
                )
                JOB_SCRAPE -> repo.api.scrapeImport(json.decodeFromString<ScrapeImportRequest>(payload))
                else -> return Result.failure()
            }
        }

        outcome.onSuccess { imported ->
            Notifications.complete(applicationContext, "Saved to your library", summary(imported))
            return Result.success()
        }

        // A dropped connection is worth another go; a rejection from the server is not
        // going to fix itself, but we can't tell them apart from here — so bound the
        // attempts and tell the user once we've stopped trying.
        if (runAttemptCount < MAX_ATTEMPTS) return Result.retry()

        val why = outcome.exceptionOrNull()?.message ?: "The server didn't say why."
        Notifications.complete(applicationContext, "Couldn't save “$label”", why)
        return Result.failure()
    }

    private fun summary(r: ImportResponse): String {
        val n = if (r.count > 0) r.count else r.imported.size
        return when (n) {
            0 -> "“$label” — nothing new; the server already had it."
            1 -> "“$label” — 1 item."
            else -> "“$label” — $n items."
        }
    }

    companion object {
        /** Everything this worker enqueues wears this, so the library can watch for it. */
        const val TAG = "import"

        private const val NOTIFICATION_ID = 1001
        private const val MAX_ATTEMPTS = 3

        private const val KEY_JOB = "job"
        private const val KEY_PAYLOAD = "payload"
        private const val KEY_SOURCE_ID = "sourceId"
        private const val KEY_LABEL = "label"

        private const val JOB_SOURCE = "source"
        private const val JOB_SCRAPE = "scrape"

        private val json = Json { ignoreUnknownKeys = true }

        /** Saves an item — typically a whole thread as one comic — from a remote source. */
        fun saveFromSource(context: Context, sourceId: String, req: SourceSaveRequest, label: String) {
            enqueue(
                context,
                workDataOf(
                    KEY_JOB to JOB_SOURCE,
                    KEY_SOURCE_ID to sourceId,
                    KEY_PAYLOAD to json.encodeToString(SourceSaveRequest.serializer(), req),
                    KEY_LABEL to label,
                ),
            )
        }

        fun scrapeImport(context: Context, req: ScrapeImportRequest, label: String) {
            enqueue(
                context,
                workDataOf(
                    KEY_JOB to JOB_SCRAPE,
                    KEY_PAYLOAD to json.encodeToString(ScrapeImportRequest.serializer(), req),
                    KEY_LABEL to label,
                ),
            )
        }

        private fun enqueue(context: Context, data: Data) {
            val request = OneTimeWorkRequestBuilder<ImportWorker>()
                .setInputData(data)
                .addTag(TAG)
                .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
                // The user just asked for this and is watching for it: run now rather
                // than waiting for WorkManager to find a convenient moment.
                .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
                .build()
            WorkManager.getInstance(context).enqueue(request)
        }
    }
}
