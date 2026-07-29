package net.fourbakers.oppailib.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import net.fourbakers.oppailib.data.Repository

/** One tile in the strip. Deliberately not [Media] or [SourceItem] — both feed this. */
data class StripItem(
    val key: String,
    val title: String,
    /** Ready to hand to Coil: whoever built this already routed it through the server. */
    val thumbUrl: String,
    val isVideo: Boolean,
)

/**
 * The "up next" carousel: the rest of the feed as a strip of thumbnails you can scrub
 * through and jump from, drawn under the player when the chrome is up.
 *
 * It answers "what's after this?" without making you leave the video to find out — the
 * viewer is a vertical feed, so the answer already exists, it just wasn't visible from
 * inside the player. Tapping a tile jumps straight to it rather than swiping through
 * everything in between.
 *
 * The strip follows the feed: whenever the settled item changes, it scrubs itself so the
 * current tile is in view — otherwise swiping the feed would silently leave the strip
 * pointing somewhere else.
 *
 * It keeps a hand's width clear beneath itself. The transport controls sit directly
 * under it, and the scrubber is the one thing in the chrome you have to hit precisely:
 * with the tiles butted up against it, reaching for the seek bar meant reaching across
 * the carousel.
 */
@Composable
fun UpNextStrip(
    repo: Repository,
    items: List<StripItem>,
    current: Int,
    onPick: (Int) -> Unit,
    /**
     * Called with true while the user is actively scrubbing the strip and false once it
     * settles. The chrome's idle timer watches this so the carousel doesn't vanish out
     * from under a thumb that's still browsing it.
     */
    onBrowsing: (Boolean) -> Unit = {},
    modifier: Modifier = Modifier.padding(top = 8.dp, bottom = 16.dp),
) {
    if (items.size < 2) return
    val context = LocalContext.current
    val row = rememberLazyListState()

    // Report scrolling so the chrome holds still while the strip is being browsed.
    LaunchedEffect(row.isScrollInProgress) { onBrowsing(row.isScrollInProgress) }

    // Keep the strip pointed at where the feed actually is. Landing the current tile one
    // in from the left leaves the *next* one visible, which is the whole point of it.
    LaunchedEffect(current) {
        if (current in items.indices) {
            row.animateScrollToItem((current - 1).coerceAtLeast(0))
        }
    }

    Column(modifier.fillMaxWidth()) {
        Text(
            "Videos",
            style = MaterialTheme.typography.labelSmall,
            color = Color.White.copy(alpha = 0.7f),
            modifier = Modifier.padding(start = 12.dp, bottom = 4.dp),
        )
        LazyRow(
            state = row,
            contentPadding = PaddingValues(horizontal = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            itemsIndexed(items, key = { _, it -> it.key }) { index, item ->
                val here = index == current
                Column(Modifier.width(112.dp)) {
                    Box(
                        Modifier
                            .fillMaxWidth()
                            .height(70.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(Color(0x33FFFFFF))
                            .then(
                                if (here) {
                                    Modifier.border(
                                        2.dp,
                                        MaterialTheme.colorScheme.primary,
                                        RoundedCornerShape(8.dp),
                                    )
                                } else {
                                    Modifier
                                },
                            )
                            .clickable { onPick(index) },
                    ) {
                        if (item.thumbUrl.isNotEmpty()) {
                            AsyncImage(
                                model = ImageRequest.Builder(context)
                                    .data(item.thumbUrl).crossfade(true).build(),
                                imageLoader = repo.imageLoader,
                                contentDescription = item.title,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize(),
                            )
                        }
                        if (item.isVideo) {
                            Icon(
                                Icons.Filled.PlayArrow,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.align(Alignment.Center).size(28.dp),
                            )
                        }
                    }
                    Text(
                        item.title,
                        style = MaterialTheme.typography.labelSmall,
                        color = if (here) MaterialTheme.colorScheme.primary else Color.White,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.padding(top = 3.dp),
                    )
                }
            }
        }
    }
}
