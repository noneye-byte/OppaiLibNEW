package net.fourbakers.oppailib.work

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import net.fourbakers.oppailib.MainActivity
import net.fourbakers.oppailib.R

/**
 * The app's notifications, which exist for exactly one thing: imports that run for
 * minutes with nothing to show for it until they finish.
 *
 * The text is deliberately dull — "OppaiLib", "Saving to your library". A notification
 * for this app lands on a lock screen that other people can see, so it says that
 * something is being saved and never what.
 */
object Notifications {

    const val CHANNEL_IMPORTS = "imports"

    /** Foreground-service notifications must not collide; completions get their own ids. */
    private var nextCompletionId = 2000

    fun ensureChannels(context: Context) {
        val channel = NotificationChannel(
            CHANNEL_IMPORTS,
            // Named for what the user sees rather than for the worker that posts it:
            // the same channel now carries uploads leaving the phone as well as
            // imports arriving from a website.
            "Transfers",
            // Low: an import is a background chore. It belongs in the shade, not in
            // front of whatever the user is doing.
            NotificationManager.IMPORTANCE_LOW,
        ).apply {
            description = "Progress for uploads and for items being saved to your library"
            setShowBadge(false)
        }
        NotificationManagerCompat.from(context).createNotificationChannel(channel)
    }

    /** The ongoing notification that keeps the import alive while the app is away. */
    fun progress(context: Context, label: String): Notification =
        base(context)
            .setContentTitle("Saving to your library")
            .setContentText(label)
            .setOngoing(true)
            // No total to count against: the server sends nothing back until the whole
            // import is done, so a percentage here would be invented.
            .setProgress(0, 0, true)
            .build()

    /**
     * Posts the outcome. Returns silently when the user hasn't granted notifications —
     * the import already happened; failing to announce it is not worth a crash.
     */
    fun complete(context: Context, title: String, text: String) {
        val n = base(context)
            .setContentTitle(title)
            .setContentText(text)
            .setStyle(NotificationCompat.BigTextStyle().bigText(text))
            .setAutoCancel(true)
            .build()
        runCatching { NotificationManagerCompat.from(context).notify(nextCompletionId++, n) }
    }

    /**
     * The ongoing notification for an upload in progress.
     *
     * It is what keeps a long upload alive across the screen going off and the app
     * being swapped away — a foreground service must show one — and it is also the
     * only place the user can see how far a background upload has got. So it carries
     * a real percentage, unlike the import notification above, which has nothing to
     * count against.
     *
     * The filename is shown because the user chose it and needs to know which of
     * several is running; the visibility is still SECRET, so it does not reach a
     * locked screen.
     */
    fun uploadProgress(context: Context, name: String, percent: Int, remaining: Int): Notification =
        base(context)
            .setContentTitle(if (remaining > 1) "Uploading $remaining files" else "Uploading")
            .setContentText(name)
            .setSubText("$percent%")
            .setOngoing(true)
            .setProgress(100, percent.coerceIn(0, 100), false)
            .build()

    /** Says how the queue ended. One notification for the batch, not one per file. */
    fun uploadsFinished(context: Context, uploaded: Int, failed: Int) {
        val title = when {
            failed == 0 && uploaded == 1 -> "Upload finished"
            failed == 0 -> "$uploaded uploads finished"
            uploaded == 0 && failed == 1 -> "Upload failed"
            uploaded == 0 -> "$failed uploads failed"
            else -> "$uploaded uploaded, $failed failed"
        }
        val text = if (failed > 0) "Open OppaiLib to see why and try again." else "Saved to your library."
        complete(context, title, text)
    }

    private fun base(context: Context): NotificationCompat.Builder {
        val open = PendingIntent.getActivity(
            context,
            0,
            Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP),
            PendingIntent.FLAG_IMMUTABLE,
        )
        return NotificationCompat.Builder(context, CHANNEL_IMPORTS)
            .setSmallIcon(R.drawable.ic_launcher_monochrome)
            .setContentIntent(open)
            .setCategory(NotificationCompat.CATEGORY_PROGRESS)
            // Nothing about this app's contents goes on a locked screen.
            .setVisibility(NotificationCompat.VISIBILITY_SECRET)
    }
}
