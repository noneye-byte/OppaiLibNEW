package net.fourbakers.oppailib.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Mood
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.AsyncImage
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import net.fourbakers.oppailib.data.ChubCard
import net.fourbakers.oppailib.data.Repository

/** chub's orders, as the web lays them out (chub-cards.ts). */
private val chubSorts = listOf(
    "download_count" to "Most downloaded",
    "trending_downloads" to "Trending",
    "star_count" to "Most starred",
    "rating" to "Best rated",
    "created_at" to "Newest",
    "last_activity_at" to "Recently updated",
)

/** A count as a card shows it: 950, 1.2k, 34k, 1.5M. Mirrors compactCount in chub-cards.ts. */
internal fun compactCount(n: Int): String = when {
    n < 1000 -> n.coerceAtLeast(0).toString()
    n < 1_000_000 -> (n / 1000.0).let { if (it < 10) "%.1f".format(it).removeSuffix(".0") + "k" else "${it.toInt()}k" }
    else -> (n / 1_000_000.0).let { if (it < 10) "%.1f".format(it).removeSuffix(".0") + "M" else "${it.toInt()}M" }
}

/** The topics worth showing: not NSFW (the badge says it) nor the "Expressions" ones. */
internal fun shownTopics(topics: List<String>, limit: Int = 3): List<String> =
    topics.map { it.trim() }.filter { it.isNotBlank() && !it.equals("nsfw", true) && !it.lowercase().startsWith("expressions") }
        .distinctBy { it.lowercase() }.take(limit)

/**
 * Finding a card on chub.ai, the phone's "Find one on chub.ai".
 *
 * The web's chub-browse.ts on a phone: a search, an order, adult cards and only ones
 * with an expression pack, a grid of cards and Show more. Everything goes through the
 * server (chub.go). Picking one hands it to [onPick], which imports it; [importing] is
 * the card being imported and [added] the ones already in.
 */
@Composable
fun ChubBrowseDialog(
    repo: Repository,
    importing: String,
    added: Set<String>,
    onPick: (ChubCard) -> Unit,
    onDismiss: () -> Unit,
) {
    var query by remember { mutableStateOf("") }
    var sort by remember { mutableStateOf("download_count") }
    var nsfw by remember { mutableStateOf(true) }
    var withExpressions by remember { mutableStateOf(false) }
    val items = remember { mutableStateListOf<ChubCard>() }
    var page by remember { mutableIntStateOf(1) }
    var more by remember { mutableStateOf(false) }
    var total by remember { mutableIntStateOf(0) }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    var sortOpen by remember { mutableStateOf(false) }
    // Each search's number, so a slow answer to an old one is not drawn over a new one.
    var asked by remember { mutableIntStateOf(0) }
    val scope = rememberCoroutineScope()

    fun search(next: Int) {
        val ask = ++asked
        loading = true
        error = ""
        scope.launch {
            runCatching { repo.api.chubSearch(query, next, sort, if (nsfw) "1" else "0", if (withExpressions) "1" else "0") }
                .onSuccess { out ->
                    if (ask != asked) return@onSuccess
                    if (next == 1) items.clear()
                    items.addAll(out.items.filter { card -> items.none { it.path == card.path } })
                    page = next; more = out.more; total = out.total
                }
                .onFailure { if (ask == asked) error = it.message ?: "chub.ai couldn't be searched." }
            if (ask == asked) loading = false
        }
    }

    // Searching as they type, a moment after they stop; and again when a filter moves.
    LaunchedEffect(query) { delay(if (query.isEmpty()) 0 else 450); search(1) }
    LaunchedEffect(sort, nsfw, withExpressions) { search(1) }

    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Surface(Modifier.fillMaxSize(), color = ChatColors.main) {
            Column(Modifier.fillMaxSize().statusBarsPadding()) {
                Row(Modifier.fillMaxWidth().padding(start = 16.dp, end = 4.dp, top = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text("Find a character on chub.ai", color = ChatColors.text, fontWeight = FontWeight.Bold, fontSize = 18.sp, modifier = Modifier.weight(1f))
                    IconButton(onClick = onDismiss) { Icon(Icons.Filled.Close, "Close", tint = ChatColors.muted) }
                }
                TextField(
                    query, { query = it },
                    placeholder = { Text("Search names, taglines and tags", color = ChatColors.muted) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp),
                    shape = RoundedCornerShape(999.dp),
                )
                Row(
                    Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(horizontal = 12.dp, vertical = 6.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box {
                        FilterChip(selected = true, onClick = { sortOpen = true }, label = { Text(chubSorts.first { it.first == sort }.second) })
                        DropdownMenu(expanded = sortOpen, onDismissRequest = { sortOpen = false }) {
                            chubSorts.forEach { (id, label) -> DropdownMenuItem(text = { Text(label) }, onClick = { sortOpen = false; sort = id }) }
                        }
                    }
                    FilterChip(selected = nsfw, onClick = { nsfw = !nsfw }, label = { Text("Adult cards") })
                    FilterChip(selected = withExpressions, onClick = { withExpressions = !withExpressions }, label = { Text("With expressions") })
                }
                Text(
                    when {
                        error.isNotBlank() -> error
                        loading && items.isEmpty() -> "Searching chub.ai…"
                        else -> "${compactCount(total)} cards. Adding one brings its portrait, and its expression pack when it has one."
                    },
                    color = if (error.isNotBlank()) MaterialTheme.colorScheme.error else ChatColors.muted,
                    fontSize = 12.sp, modifier = Modifier.padding(horizontal = 16.dp, vertical = 2.dp),
                )
                LazyVerticalGrid(
                    columns = GridCells.Adaptive(156.dp),
                    modifier = Modifier.weight(1f).fillMaxWidth(),
                    contentPadding = androidx.compose.foundation.layout.PaddingValues(12.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    if (!loading && error.isBlank() && items.isEmpty()) {
                        item(span = { GridItemSpan(maxLineSpan) }) {
                            Text("Nothing on chub.ai matched that.", color = ChatColors.muted, modifier = Modifier.padding(32.dp))
                        }
                    }
                    items(items, key = { it.path }) { card ->
                        ChubTile(repo, card, busy = importing == card.path, blocked = importing.isNotBlank(), added = card.path in added) { onPick(card) }
                    }
                    if (more) {
                        item(span = { GridItemSpan(maxLineSpan) }) {
                            Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                                OutlinedButton(onClick = { search(page + 1) }, enabled = !loading) { Text(if (loading) "Loading…" else "Show more") }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ChubTile(repo: Repository, card: ChubCard, busy: Boolean, blocked: Boolean, added: Boolean, onAdd: () -> Unit) {
    Column(Modifier.clip(RoundedCornerShape(12.dp)).background(ChatColors.side)) {
        Box(Modifier.fillMaxWidth().aspectRatio(3f / 4f).background(ChatColors.input)) {
            AsyncImage(
                repo.serverUrl(card.avatar), card.name, imageLoader = repo.imageLoader,
                contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize(),
            )
            Row(Modifier.padding(6.dp), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                if (card.nsfw) ChubBadge { Text("18+", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold) }
                if (card.topics.any { it.lowercase().startsWith("expressions") }) {
                    ChubBadge { Icon(Icons.Filled.Mood, "Has an expression pack", tint = Color.White, modifier = Modifier.size(13.dp)) }
                }
            }
        }
        Column(Modifier.padding(9.dp)) {
            Text(card.name, color = ChatColors.text, fontWeight = FontWeight.Bold, fontSize = 14.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(card.tagline.ifBlank { "No tagline." }, color = ChatColors.muted, fontSize = 12.sp, maxLines = 3, overflow = TextOverflow.Ellipsis, modifier = Modifier.height(48.dp))
            val topics = shownTopics(card.topics)
            if (topics.isNotEmpty()) Text(topics.joinToString(" · "), color = ChatColors.muted, fontSize = 10.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text("★ ${compactCount(card.stars)} · ${compactCount(card.chats)} chats", color = ChatColors.muted, fontSize = 11.sp)
            Spacer(Modifier.height(6.dp))
            Button(onClick = onAdd, enabled = !blocked && !added, modifier = Modifier.fillMaxWidth()) {
                if (busy) CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp)
                else Icon(if (added) Icons.Filled.Check else Icons.Filled.Download, null, modifier = Modifier.size(16.dp))
                Spacer(Modifier.size(6.dp))
                Text(if (added) "Added" else if (busy) "Adding…" else "Add")
            }
        }
    }
}

@Composable
private fun ChubBadge(content: @Composable () -> Unit) {
    Box(Modifier.clip(RoundedCornerShape(999.dp)).background(Color(0x99000000)).padding(horizontal = 6.dp, vertical = 2.dp)) { content() }
}
