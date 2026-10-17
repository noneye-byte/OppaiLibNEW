package net.fourbakers.oppailib.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import net.fourbakers.oppailib.data.ChatImage
import net.fourbakers.oppailib.data.Repository
import net.fourbakers.oppailib.data.StoredChatMessage
import net.fourbakers.oppailib.data.pictures
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** One picture the full-screen viewer can show: whose it is and when it came. */
internal data class ChatViewerPicture(val id: String, val fromHer: Boolean, val at: Long)

/**
 * The pictures of a conversation in the order they were sent — what the viewer swipes
 * through, so opening one is opening the conversation's camera roll at it, the way any
 * messaging app does. Left out: snaps, which open once through their own tile and must
 * not be reachable again by swiping past them, and clips, which play where they are.
 */
internal fun conversationPictures(messages: List<StoredChatMessage>, images: List<ChatImage>): List<ChatViewerPicture> {
    val clips = images.filter { it.mime.startsWith("video/") }.map { it.id }.toSet()
    return messages.filter { !it.snap && it.thought.isBlank() }.flatMap { m ->
        m.pictures().filter { it !in clips }.map { ChatViewerPicture(it, m.role == "assistant", m.at) }
    }.distinctBy { it.id }
}

private val viewerStamp = SimpleDateFormat("EEE d MMM, HH:mm", Locale.getDefault())

/**
 * A picture from the conversation, full screen: pinch or double-tap to zoom, swipe for
 * the one before or after, tap to hide the bar. The zoom is the library viewer's, which
 * gives a drag back to the pager unless two fingers are down or the picture is zoomed.
 */
@Composable
internal fun ChatPictureViewer(
    repo: Repository,
    pictures: List<ChatViewerPicture>,
    start: Int,
    herName: String,
    onDismiss: () -> Unit,
) {
    if (pictures.isEmpty()) return
    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        val pager = rememberPagerState(initialPage = start.coerceIn(0, pictures.size - 1)) { pictures.size }
        var zoomed by remember { mutableStateOf(false) }
        var chrome by remember { mutableStateOf(true) }
        Box(Modifier.fillMaxSize().background(Color.Black)) {
            HorizontalPager(state = pager, modifier = Modifier.fillMaxSize(), userScrollEnabled = !zoomed, beyondViewportPageCount = 1) { page ->
                val picture = pictures[page]
                ZoomableImage(
                    url = repo.chatImageUrl(picture.id),
                    imageLoader = repo.imageLoader,
                    contentDescription = if (picture.fromHer) "Picture from $herName" else "Picture you sent",
                    enabled = page == pager.currentPage,
                    onZoomed = { zoomed = it },
                    onTap = { _, _ -> chrome = !chrome },
                )
            }
            if (chrome) {
                val shown = pictures[pager.currentPage]
                Row(
                    Modifier.fillMaxWidth()
                        .background(Brush.verticalGradient(listOf(Color.Black.copy(alpha = .7f), Color.Transparent)))
                        .statusBarsPadding().padding(horizontal = 4.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    IconButton(onClick = onDismiss) { Icon(Icons.Filled.Close, "Close", tint = Color.White) }
                    Column(Modifier.weight(1f).padding(start = 4.dp)) {
                        Text(if (shown.fromHer) herName else "You", color = Color.White, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                        Text(viewerStamp.format(Date(shown.at)), color = Color.White.copy(alpha = .7f), fontSize = 12.sp)
                    }
                    if (pictures.size > 1) Text(
                        "${pager.currentPage + 1} of ${pictures.size}", color = Color.White.copy(alpha = .8f), fontSize = 13.sp,
                        modifier = Modifier.padding(end = 14.dp),
                    )
                }
            }
        }
    }
}
