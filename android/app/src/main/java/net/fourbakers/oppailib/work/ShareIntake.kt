package net.fourbakers.oppailib.work

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.core.content.pm.ShortcutInfoCompat
import androidx.core.content.pm.ShortcutManagerCompat
import androidx.core.graphics.drawable.IconCompat
import net.fourbakers.oppailib.MainActivity
import net.fourbakers.oppailib.R

/**
 * What arrives through Android's share sheet, turned into work: files into the upload
 * queue, links to the import worker. Both the share activity (which does this and closes)
 * and the main activity (which does it after a sign-in) come here, so a share is handled
 * one way whichever door it came through.
 *
 * Nothing here talks to the server. A link used to be scraped right here, in the screen
 * that received it, which is gone the moment the share is done — and a scrape is a page
 * fetched, read and its media listed, seconds at best. The worker does all of it now.
 */
object ShareIntake {

    data class Queued(val files: Int, val links: Int, val ignoredText: Boolean) {
        val total: Int get() = files + links
    }

    fun isShare(intent: Intent?): Boolean =
        intent?.action == Intent.ACTION_SEND || intent?.action == Intent.ACTION_SEND_MULTIPLE

    fun accept(context: Context, intent: Intent): Queued {
        // The read grant that came with the share is asked to be persisted. Most apps do
        // not offer one, so this usually fails — which is fine, because the worker starts
        // at once and the grant outlives it. If the process is killed before it finishes,
        // the queue says so plainly rather than retrying against a URI it can no longer open.
        val uris = sharedUris(intent)
        for (uri in uris) {
            runCatching { context.contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION) }
        }
        val files = if (uris.isEmpty()) 0 else UploadWorker.enqueue(context, uris)

        val text = listOfNotNull(intent.getCharSequenceExtra(Intent.EXTRA_TEXT)?.toString()).joinToString("\n")
        val urls = URL_PATTERN.findAll(text).map { it.value.trimEnd('.', ',', ')', ']', '}') }.distinct().toList()
        for (url in urls) ImportWorker.shareLink(context, url)
        return Queued(files, urls.size, ignoredText = urls.isEmpty() && uris.isEmpty() && text.isNotBlank())
    }

    /** What to tell them, in a line. */
    fun summary(q: Queued): String = when {
        q.total == 0 && q.ignoredText -> "There's no link in that text for OppaiLib to save."
        q.total == 0 -> "Nothing in that share OppaiLib can save."
        else -> buildString {
            if (q.files > 0) append("Uploading ${q.files} file${if (q.files == 1) "" else "s"} to OppaiLib")
            if (q.links > 0) {
                append(if (isEmpty()) "Saving " else " and saving ")
                append(if (q.links == 1) "the link" else "${q.links} links")
                if (q.files == 0) append(" to OppaiLib")
            }
            append('.')
        }
    }

    @Suppress("DEPRECATION")
    private fun sharedUris(intent: Intent): List<Uri> {
        val out = linkedSetOf<Uri>()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri::class.java)?.let(out::add)
            intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM, Uri::class.java)?.let(out::addAll)
        } else {
            // EXTRA_STREAM is one Uri for SEND and a list for SEND_MULTIPLE; asking for
            // the wrong one logs a ClassCastException warning and returns null, harmless.
            runCatching { intent.getParcelableExtra<Uri>(Intent.EXTRA_STREAM) }.getOrNull()?.let(out::add)
            runCatching { intent.getParcelableArrayListExtra<Uri>(Intent.EXTRA_STREAM) }.getOrNull()?.let(out::addAll)
        }
        intent.clipData?.let { clip ->
            for (i in 0 until clip.itemCount) clip.getItemAt(i).uri?.let(out::add)
        }
        return out.toList()
    }

    private val URL_PATTERN = Regex("https?://[^\\s<>]+", RegexOption.IGNORE_CASE)

    // ── the share sheet's top row ────────────────────────────────────────────

    /** The category res/xml/shortcuts.xml's share-target names. */
    private const val SHARE_CATEGORY = "net.fourbakers.oppailib.category.ADD_TO_LIBRARY"

    /**
     * Puts "OppaiLib · Library" in the share sheet's row of direct targets, where Android
     * shows the places a share is most likely to go, rather than only somewhere in the
     * alphabetical list of every app that takes any file. Android 10+ reads this; older
     * versions show the app in the list as before.
     */
    fun publishShareTarget(context: Context) {
        runCatching {
            val shortcut = ShortcutInfoCompat.Builder(context, "add-to-library")
                .setShortLabel("Library")
                .setLongLabel("Add to your library")
                .setIcon(IconCompat.createWithResource(context, R.mipmap.ic_launcher))
                .setIntent(Intent(context, MainActivity::class.java).setAction(Intent.ACTION_MAIN))
                .setCategories(setOf(SHARE_CATEGORY))
                .setLongLived(true)
                .build()
            ShortcutManagerCompat.pushDynamicShortcut(context, shortcut)
        }
    }
}
