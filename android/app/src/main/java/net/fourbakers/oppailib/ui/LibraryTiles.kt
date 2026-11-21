package net.fourbakers.oppailib.ui

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.Android
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Collections
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Gif
import androidx.compose.material.icons.filled.Movie
import androidx.compose.material.icons.filled.PhotoLibrary
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.SportsEsports
import androidx.compose.material.icons.outlined.Circle
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import net.fourbakers.oppailib.data.Media
import net.fourbakers.oppailib.data.Repository
import net.fourbakers.oppailib.ui.theme.LocalInk

/** The library's kinds in the web's order (media-meta.ts KIND_ORDER), with their names. */
internal data class KindMeta(val kind: String, val label: String, val noun: String, val icon: ImageVector, val aspect: Float)

internal val KINDS = listOf(
    // Portrait for photos: most of what a library like this holds is a person standing
    // up, and a landscape crop cut off heads and feet in every tile.
    KindMeta("image", "Photos", "photo", Icons.Filled.PhotoLibrary, 4f / 5f),
    KindMeta("gif", "GIFs", "GIF", Icons.Filled.Gif, 1f),
    KindMeta("video", "Videos", "video", Icons.Filled.Movie, 16f / 9f),
    KindMeta("game", "Games", "game", Icons.Filled.SportsEsports, 3f / 4f),
    KindMeta("comic", "Comics", "comic", Icons.AutoMirrored.Filled.MenuBook, 2f / 3f),
)

internal fun kindMeta(kind: String): KindMeta? = KINDS.firstOrNull { it.kind == kind }

internal fun iconFor(kind: String): ImageVector = kindMeta(kind)?.icon ?: Icons.Filled.Collections

/** "4:12" or "1:02:09". */
internal fun clockLabel(seconds: Double): String {
    val s = seconds.toLong().coerceAtLeast(0)
    val h = s / 3600
    val m = (s % 3600) / 60
    val sec = s % 60
    return if (h > 0) "%d:%02d:%02d".format(h, m, sec) else "%d:%02d".format(m, sec)
}

/**
 * One item in a grid or a row. The picture is the tile; its title rides on a fade at the
 * foot, the kind's facts (a duration, "Android") on badges, and safe view veils it when
 * the tagger rated it past "sensitive".
 */
@OptIn(ExperimentalFoundationApi::class)
@Composable
internal fun MediaTile(
    repo: Repository,
    m: Media,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    aspect: Float = 4f / 5f,
    selected: Boolean = false,
    selecting: Boolean = false,
    onLongClick: (() -> Unit)? = null,
    showTitle: Boolean = true,
    progress: Float? = null,
) {
    val context = LocalContext.current
    val ink = LocalInk.current
    val hidden = veiled(m.tags)
    Box(
        modifier.aspectRatio(aspect).clip(RoundedCornerShape(12.dp))
            .background(MaterialTheme.colorScheme.surfaceContainer)
            .combinedClickable(onClick = onClick, onLongClick = onLongClick),
    ) {
        // The kind glyph sits underneath as the placeholder: it shows through while the
        // poster loads, and stays visible if the server has no thumb for this item.
        Box(Modifier.fillMaxSize(), Alignment.Center) {
            Icon(iconFor(m.kind), contentDescription = m.kind, tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.45f), modifier = Modifier.size(40.dp))
        }
        AsyncImage(
            model = ImageRequest.Builder(context).data(repo.thumbUrl(m.id)).crossfade(true).build(),
            imageLoader = repo.imageLoader,
            contentDescription = m.title,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize().veil(hidden),
        )
        VeilMark(hidden)
        if (m.kind == "video" && !hidden) {
            m.duration?.takeIf { it > 0 }?.let {
                TileBadge(clockLabel(it), Modifier.align(Alignment.BottomEnd).padding(6.dp))
            } ?: Box(
                Modifier.align(Alignment.Center).size(40.dp).clip(CircleShape).background(Color(0x66000000)),
                Alignment.Center,
            ) { Icon(Icons.Filled.PlayArrow, contentDescription = null, tint = Color.White) }
        }
        // Whether a game runs on the phone you're holding is the one thing worth
        // knowing before you tap into it, so it goes on the tile.
        if (m.kind == "game" && m.runsOnAndroid == true) {
            TileBadge("Android", Modifier.align(Alignment.TopStart).padding(6.dp), icon = Icons.Filled.Android, color = Color(0xCC2E7D32))
        }
        if (showTitle && m.title.isNotBlank() && m.kind != "video" && m.kind != "image" && m.kind != "gif") {
            Text(
                m.title,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                style = MaterialTheme.typography.labelMedium,
                color = Color.White,
                modifier = Modifier.align(Alignment.BottomStart).fillMaxWidth()
                    .background(Brush.verticalGradient(listOf(Color.Transparent, Color(0xCC000000))))
                    .padding(start = 8.dp, end = 8.dp, top = 18.dp, bottom = 7.dp),
            )
        }
        if (progress != null && progress > 0f) {
            Box(Modifier.align(Alignment.BottomStart).fillMaxWidth().padding(horizontal = 8.dp, vertical = 6.dp)
                .height(3.dp).clip(RoundedCornerShape(2.dp)).background(Color(0x66FFFFFF))) {
                Box(Modifier.fillMaxHeight().fillMaxWidth(progress.coerceIn(0f, 1f)).background(MaterialTheme.colorScheme.primary))
            }
        }
        // The heart marks a favorite from the grid, and gets out of the way while
        // selecting — where the corner it lives in is the checkmark's.
        if (m.favorite && !selecting) {
            Icon(
                Icons.Filled.Favorite,
                contentDescription = "Favorite",
                tint = ink.fav,
                modifier = Modifier.align(Alignment.TopEnd).padding(6.dp).size(18.dp),
            )
        }
        if (selecting) {
            // A scrim, so a picked tile reads as picked at a glance across a full grid.
            if (selected) {
                Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.primary.copy(alpha = 0.32f)))
            }
            Icon(
                if (selected) Icons.Filled.CheckCircle else Icons.Outlined.Circle,
                contentDescription = if (selected) "Selected" else "Not selected",
                tint = if (selected) MaterialTheme.colorScheme.primary else Color.White,
                modifier = Modifier.align(Alignment.TopEnd).padding(6.dp).size(22.dp)
                    .background(Color(0x66000000), CircleShape),
            )
        }
    }
}

/** A tile in one of Home's rows: a fixed width, its kind's shape, the title under it. */
@Composable
internal fun RowTile(repo: Repository, m: Media, width: Dp, onClick: () -> Unit, onLongClick: (() -> Unit)? = null, progress: Float? = null) {
    val aspect = kindMeta(m.kind)?.aspect ?: (4f / 5f)
    Column(Modifier.width(width)) {
        MediaTile(repo, m, onClick = onClick, onLongClick = onLongClick, aspect = aspect, showTitle = false, progress = progress)
        Text(
            m.title.ifBlank { kindMeta(m.kind)?.noun?.replaceFirstChar { it.uppercase() } ?: "Untitled" },
            style = MaterialTheme.typography.labelLarge,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(top = 6.dp, start = 2.dp, end = 2.dp),
        )
    }
}
