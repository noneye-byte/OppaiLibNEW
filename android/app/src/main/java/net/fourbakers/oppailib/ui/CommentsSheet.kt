package net.fourbakers.oppailib.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayCircle
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import net.fourbakers.oppailib.data.Repository
import net.fourbakers.oppailib.data.SourceComment
import net.fourbakers.oppailib.data.SourceItem
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * The conversation an item was posted in, as a bottom sheet.
 *
 * A 4chan board is not a folder of files — the thread *is* the context, and browsing it
 * as a grid of images throws away the only thing that says what any of them are. This
 * puts the posts back: who said what, what they were replying to, and the picture that
 * came with it.
 *
 * The list is flat rather than threaded. A post can quote several others, so replies
 * form a graph rather than a tree, and any nesting would mean picking one parent
 * arbitrarily. Post order with the quoted numbers called out is what the site does, and
 * it's what people already know how to read.
 *
 * [item] must carry a [SourceItem.threadId] — the caller only offers this for items
 * that have one.
 *
 * [onOpen] is called with a post whose file the reader tapped. The sheet doesn't know
 * how to get to it — that depends on whether the caller is already inside the thread or
 * still looking at the board — so it says which file was asked for and lets the caller
 * do the going.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CommentsSheet(
    repo: Repository,
    sourceId: String,
    item: SourceItem,
    onDismiss: () -> Unit,
    onOpen: (SourceComment) -> Unit = {},
) {
    var comments by remember(item.threadId) { mutableStateOf<List<SourceComment>?>(null) }
    var error by remember(item.threadId) { mutableStateOf<String?>(null) }
    val sheet = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    LaunchedEffect(item.threadId) {
        runCatching { repo.api.sourceComments(sourceId, item.threadId).comments }
            .onSuccess { comments = it }
            .onFailure { error = it.message ?: "Couldn't load that thread" }
    }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheet) {
        Text(
            item.title.ifEmpty { "Thread" },
            style = MaterialTheme.typography.titleMedium,
            maxLines = 2,
            modifier = Modifier.padding(horizontal = 20.dp, vertical = 4.dp),
        )

        val loaded = comments
        when {
            error != null -> Box(
                Modifier.fillMaxWidth().padding(40.dp),
                Alignment.Center,
            ) { Text(error ?: "", color = MaterialTheme.colorScheme.error) }

            loaded == null -> Box(
                Modifier.fillMaxWidth().padding(40.dp),
                Alignment.Center,
            ) { CircularProgressIndicator() }

            loaded.isEmpty() -> Box(
                Modifier.fillMaxWidth().padding(40.dp),
                Alignment.Center,
            ) { Text("No posts in this thread.") }

            else -> LazyColumn(
                Modifier.fillMaxWidth().heightIn(max = 640.dp).padding(horizontal = 12.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                items(loaded, key = { it.no }) { c ->
                    // The post the open file came from. Without it the list is a wall of
                    // anonymous text with no way to find your place in it.
                    CommentRow(
                        repo = repo,
                        c = c,
                        here = item.postNo != 0L && c.no == item.postNo,
                        onOpen = { onOpen(c); onDismiss() },
                    )
                }
            }
        }
    }
}

@Composable
private fun CommentRow(repo: Repository, c: SourceComment, here: Boolean, onOpen: () -> Unit) {
    val context = LocalContext.current
    val background = when {
        here -> MaterialTheme.colorScheme.primaryContainer
        c.op -> MaterialTheme.colorScheme.surfaceVariant
        else -> MaterialTheme.colorScheme.surfaceContainerHigh
    }

    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(background).padding(12.dp),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            if (c.op) Tag("OP")
            if (here) Tag("This file")
            Text(
                c.name.ifEmpty { "Anonymous" },
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.primary,
            )
            Text(
                "No.${c.no}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (c.time > 0) {
                Text(
                    postTime(c.time),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        if (c.subject.isNotEmpty()) {
            Text(
                c.subject,
                style = MaterialTheme.typography.titleSmall,
                modifier = Modifier.padding(top = 4.dp),
            )
        }

        if (c.thumbUrl.isNotEmpty()) {
            val video = c.kind == "video"
            // The post's file, and a way into it. 4chan thumbnails a .webm with a JPEG,
            // so without the badge a video in the thread is indistinguishable from a
            // picture — and without the tap there was no way to watch it from here at all.
            Box(
                Modifier.padding(top = 6.dp).widthIn(max = 160.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .clickable(enabled = c.itemId.isNotEmpty(), onClick = onOpen),
                contentAlignment = Alignment.Center,
            ) {
                AsyncImage(
                    // Even here the thumbnail goes through our server: it carries our auth,
                    // and the origin never sees the phone.
                    model = ImageRequest.Builder(context)
                        .data(repo.sourceStreamUrl(c.thumbUrl)).crossfade(true).build(),
                    imageLoader = repo.imageLoader,
                    contentDescription = if (video) "Play this video" else "Open this file",
                    contentScale = ContentScale.Fit,
                    modifier = Modifier.fillMaxWidth(),
                )
                if (video) {
                    Icon(
                        Icons.Filled.PlayCircle,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(40.dp),
                    )
                }
            }
        }

        if (c.text.isNotEmpty()) {
            PostText(c.text, Modifier.padding(top = 6.dp))
        }
    }
}

/**
 * A post's body, keeping the two things that carry its meaning.
 *
 * Greentext (a line opening with ">") and quotes (">>12345") are the whole grammar of a
 * 4chan post. Rendered as undifferentiated text, a quoted line becomes indistinguishable
 * from the reply to it — which is most of what the post is doing — so each line is
 * coloured for what it is. The text arrives as plain text; nothing here parses markup.
 */
@Composable
private fun PostText(text: String, modifier: Modifier = Modifier) {
    Column(modifier) {
        text.lines().forEach { line ->
            val quote = line.startsWith(">>") && line.drop(2).firstOrNull()?.isDigit() == true
            val green = !quote && line.startsWith(">")
            Text(
                line,
                style = MaterialTheme.typography.bodySmall,
                color = when {
                    quote -> MaterialTheme.colorScheme.primary
                    green -> GreentextColour
                    else -> MaterialTheme.colorScheme.onSurface
                },
            )
        }
    }
}

/** The colour greentext has been for twenty years. It is not a theme colour. */
private val GreentextColour = Color(0xFF789922)

@Composable
private fun Tag(label: String) {
    Text(
        label,
        style = MaterialTheme.typography.labelSmall,
        fontWeight = FontWeight.Bold,
        color = MaterialTheme.colorScheme.onSecondaryContainer,
        modifier = Modifier
            .clip(RoundedCornerShape(6.dp))
            .background(MaterialTheme.colorScheme.secondaryContainer)
            .padding(horizontal = 6.dp, vertical = 1.dp),
    )
}

/** "12 Mar 21:04" — enough to place a post in a thread without the year. */
private fun postTime(unix: Long): String =
    SimpleDateFormat("d MMM HH:mm", Locale.getDefault()).format(Date(unix * 1000))
