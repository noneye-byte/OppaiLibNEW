package net.fourbakers.oppailib.ui

import android.util.Base64
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import net.fourbakers.oppailib.data.ChatImageUpload
import net.fourbakers.oppailib.data.Media
import net.fourbakers.oppailib.data.Repository
import java.io.ByteArrayOutputStream

private const val MAX_CHAT_IMAGE_BYTES = 8 * 1024 * 1024

/** Matches the web client: still images share themselves; every other kind shares
 * the representative frame the library already chose. */
internal fun canShareWithChat(media: Media): Boolean =
    media.kind == "image" || media.kind == "gif" || media.hasThumb

/** Resolves a library item to the data-image payload accepted by Chat. The bounded
 * read is deliberate: a corrupt/missing content length must not let a huge original
 * exhaust the phone before the server's own 8 MB limit can reject it. */
internal suspend fun mediaChatUpload(
    repo: Repository,
    media: Media,
    characterId: String,
): ChatImageUpload = withContext(Dispatchers.IO) {
    require(canShareWithChat(media)) { "This item has no image to share." }
    val original = media.kind == "image" || media.kind == "gif"
    val body = if (original) repo.api.streamMedia(media.id) else repo.api.mediaThumb(media.id)
    body.use {
        val declared = it.contentLength()
        require(declared < 0 || declared <= MAX_CHAT_IMAGE_BYTES) { "Image must be 8 MB or smaller." }
        val bytes = it.byteStream().use { input ->
            val output = ByteArrayOutputStream()
            val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
            while (true) {
                val read = input.read(buffer)
                if (read < 0) break
                output.write(buffer, 0, read)
                require(output.size() <= MAX_CHAT_IMAGE_BYTES) { "Image must be 8 MB or smaller." }
            }
            output.toByteArray()
        }
        val fallbackMime = if (media.kind == "gif") "image/gif" else "image/jpeg"
        val mime = it.contentType()?.toString()?.takeIf { type -> type.startsWith("image/") } ?: fallbackMime
        ChatImageUpload(
            characterId = characterId,
            name = media.title.ifBlank { "Library image ${media.id}" },
            imageData = "data:$mime;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP),
        )
    }
}

/** A filesystem-safe suggestion for Android's create-document picker. */
internal fun exportName(media: Media): String {
    val cleaned = media.title.trim().replace(Regex("[\\\\/:*?\"<>|]"), "_")
    if (cleaned.isNotBlank() && '.' in cleaned.substringAfterLast('/', cleaned)) return cleaned
    val stem = cleaned.ifBlank { "oppailib-${media.id}" }
    val extension = when (media.kind) {
        "video" -> ".mp4"
        "gif" -> ".gif"
        "image" -> ".jpg"
        "comic" -> ".cbz"
        else -> ""
    }
    return stem + extension
}
