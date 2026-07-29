package net.fourbakers.oppailib.util

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

/**
 * Copies a content Uri into a temp file in cacheDir so it can be uploaded as
 * a multipart body. Returns the file and its display name.
 *
 * Suspending and pinned to IO, because every caller is on the main thread and the
 * copy is a full byte-for-byte duplication of whatever was picked — a long video is
 * hundreds of megabytes, and doing that on the main thread froze the app hard enough
 * to look like the device had locked up. The display-name query is a ContentResolver
 * round trip for the same reason, so it goes along with it.
 */
suspend fun copyUriToCache(context: Context, uri: Uri): Pair<File, String> = withContext(Dispatchers.IO) {
    val name = queryDisplayName(context, uri) ?: "upload_${System.currentTimeMillis()}"
    val out = File(context.cacheDir, name)
    context.contentResolver.openInputStream(uri)!!.use { input ->
        out.outputStream().use { input.copyTo(it) }
    }
    out to name
}

fun mimeOf(context: Context, uri: Uri): String? = context.contentResolver.getType(uri)

private fun queryDisplayName(context: Context, uri: Uri): String? {
    context.contentResolver.query(uri, null, null, null, null)?.use { c ->
        val idx = c.getColumnIndex(OpenableColumns.DISPLAY_NAME)
        if (idx >= 0 && c.moveToFirst()) return c.getString(idx)
    }
    return null
}
