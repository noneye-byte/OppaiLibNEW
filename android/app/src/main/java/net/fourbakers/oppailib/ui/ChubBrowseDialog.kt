package net.fourbakers.oppailib.ui

import android.content.Intent
import android.net.Uri
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.systemBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.grid.rememberLazyGridState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.OpenInNew
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Mood
import androidx.compose.material.icons.filled.Sort
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.AsyncImage
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import net.fourbakers.oppailib.data.ChubCard
import net.fourbakers.oppailib.data.ChubDetails
import net.fourbakers.oppailib.data.ChubGalleryItem
import net.fourbakers.oppailib.data.Repository
import net.fourbakers.oppailib.data.cardSections
import net.fourbakers.oppailib.data.fillNames
import net.fourbakers.oppailib.data.roleplayRuns
import net.fourbakers.oppailib.data.serverMessage
import net.fourbakers.oppailib.ui.theme.LocalInk

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
 * Finding a card on chub.ai: the web's chub-browse.ts as a page over chat. A search, an
 * order, adult cards and only ones with an expression pack, and the results, which load
 * on as they are scrolled. A card opens to its page — what its creator wrote, every
 * field, every greeting, its lorebook, its expression pack and its gallery — so it can be
 * read before it is added. Picking one hands it to [onPick], which imports it; [importing]
 * is the card being imported and [added] the ones already in.
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
    var open by remember { mutableStateOf<ChubCard?>(null) }
    // Each search's number, so a slow answer to an old one is not drawn over a new one.
    var asked by remember { mutableIntStateOf(0) }
    val scope = rememberCoroutineScope()
    val grid = rememberLazyGridState()

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
    val nearEnd by remember { derivedStateOf { (grid.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0) >= items.size - 6 } }
    LaunchedEffect(nearEnd, items.size) { if (nearEnd && more && !loading && items.isNotEmpty()) search(page + 1) }

    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)) {
        Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background).windowInsetsPadding(WindowInsets.systemBars)) {
            Column(Modifier.fillMaxSize()) {
                PageTop(
                    title = "chub.ai",
                    count = if (total > 0) "${compactCount(total)} cards" else null,
                    insets = false,
                    navigation = { IconButton(onClick = onDismiss) { Icon(Icons.Filled.Close, contentDescription = "Close") } },
                )
                SearchBox(
                    value = query,
                    onValueChange = { query = it },
                    placeholder = "Search names, taglines and tags",
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                )
                Spacer(Modifier.height(8.dp))
                InkChipRow {
                    Box {
                        InkChip(chubSorts.first { it.first == sort }.second, true, { sortOpen = true }, icon = Icons.Filled.Sort, small = true)
                        DropdownMenu(expanded = sortOpen, onDismissRequest = { sortOpen = false }) {
                            chubSorts.forEach { (id, label) ->
                                DropdownMenuItem(
                                    text = { Text(label) },
                                    leadingIcon = { if (id == sort) Icon(Icons.Filled.Check, contentDescription = null) else Spacer(Modifier.size(24.dp)) },
                                    onClick = { sortOpen = false; sort = id },
                                )
                            }
                        }
                    }
                    InkChip("Adult cards", nsfw, { nsfw = !nsfw }, small = true)
                    InkChip("With expressions", withExpressions, { withExpressions = !withExpressions }, icon = Icons.Filled.Mood, small = true)
                }
                if (error.isNotBlank()) Text(error, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp))
                LazyVerticalGrid(
                    state = grid,
                    columns = GridCells.Adaptive(156.dp),
                    modifier = Modifier.weight(1f).fillMaxWidth(),
                    contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 24.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                ) {
                    if (!loading && error.isBlank() && items.isEmpty()) {
                        item(span = { GridItemSpan(maxLineSpan) }) { EmptyNote("Nothing on chub.ai matched that.") }
                    }
                    items(items, key = { it.path }) { card ->
                        ChubTile(repo, card, added = card.path in added) { open = card }
                    }
                    if (loading) item(span = { GridItemSpan(maxLineSpan) }) {
                        Box(Modifier.fillMaxWidth().padding(16.dp), Alignment.Center) { CircularProgressIndicator(Modifier.size(24.dp)) }
                    }
                }
            }
            open?.let { card ->
                ChubCardPage(
                    repo = repo,
                    card = card,
                    busy = importing == card.path,
                    blocked = importing.isNotBlank(),
                    added = card.path in added,
                    onAdd = { onPick(card) },
                    onBack = { open = null },
                    onTopic = { t -> open = null; query = t },
                )
            }
        }
    }
}

@Composable
private fun ChubTile(repo: Repository, card: ChubCard, added: Boolean, onOpen: () -> Unit) {
    Column(Modifier.clip(RoundedCornerShape(12.dp)).clickable(onClick = onOpen)) {
        Box(Modifier.fillMaxWidth().aspectRatio(3f / 4f).clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.surfaceContainer)) {
            AsyncImage(
                repo.serverUrl(card.avatar), card.name, imageLoader = repo.imageLoader,
                contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize(),
            )
            Row(Modifier.padding(6.dp), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                if (card.nsfw) TileBadge("18+")
                if (card.topics.any { it.lowercase().startsWith("expressions") }) TileBadge("Expressions", icon = Icons.Filled.Mood)
            }
            if (added) TileBadge("Added", Modifier.align(Alignment.BottomStart).padding(6.dp), icon = Icons.Filled.Check, color = MaterialTheme.colorScheme.primary.copy(alpha = 0.9f))
        }
        Text(card.name, style = MaterialTheme.typography.labelLarge, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(start = 2.dp, top = 6.dp))
        Text(card.tagline.ifBlank { "No tagline." }, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
            maxLines = 2, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(horizontal = 2.dp))
        Text("★ ${compactCount(card.stars)} · ${compactCount(card.chats)} chats", style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(horizontal = 2.dp, vertical = 2.dp))
    }
}

/** A card's page: its portrait and figures, Add, and the card read tab by tab. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ChubCardPage(
    repo: Repository,
    card: ChubCard,
    busy: Boolean,
    blocked: Boolean,
    added: Boolean,
    onAdd: () -> Unit,
    onBack: () -> Unit,
    onTopic: (String) -> Unit,
) {
    var details by remember(card.path) { mutableStateOf<ChubDetails?>(null) }
    var error by remember(card.path) { mutableStateOf("") }
    var tab by remember(card.path) { mutableStateOf("card") }
    var zoomed by remember { mutableStateOf("") }
    val context = LocalContext.current
    BackHandler(enabled = zoomed.isEmpty()) { onBack() }
    LaunchedEffect(card.path) {
        runCatching { repo.web.chubDetails(card.path) }
            .onSuccess { details = it }
            .onFailure { error = it.serverMessage("chub.ai didn't send this card.") }
    }
    val d = details
    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        PageTop(
            title = card.name,
            insets = false,
            navigation = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back to the results") } },
        ) {
            ToolButton(Icons.AutoMirrored.Filled.OpenInNew, "Open on chub.ai", {
                runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://chub.ai/characters/${card.path}"))) }
            }, bare = true)
        }
        Hairline()
        androidx.compose.foundation.lazy.LazyColumn(
            Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            // ── who it is ──
            item {
                Row {
                    Box(
                        Modifier.width(128.dp).aspectRatio(3f / 4f).clip(RoundedCornerShape(14.dp)).background(MaterialTheme.colorScheme.surfaceContainer)
                            .clickable { zoomed = d?.art?.ifBlank { null } ?: card.avatar },
                    ) {
                        AsyncImage(repo.serverUrl(d?.art?.ifBlank { null } ?: card.avatar), card.name, imageLoader = repo.imageLoader,
                            contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                    }
                    Spacer(Modifier.width(14.dp))
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(card.name, style = MaterialTheme.typography.headlineSmall, maxLines = 2, overflow = TextOverflow.Ellipsis)
                        if (!d?.creator.isNullOrBlank()) Text("by ${d!!.creator}", style = MaterialTheme.typography.labelLarge, color = LocalInk.current.primaryBright)
                        if (card.tagline.isNotBlank()) Text(card.tagline, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 4, overflow = TextOverflow.Ellipsis)
                    }
                }
            }
            item {
                FlowRow(horizontalArrangement = Arrangement.spacedBy(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Figure("★", compactCount(card.stars), "stars")
                    d?.favorites?.takeIf { it > 0 }?.let { Figure("♥", compactCount(it), "favourites") }
                    Figure("💬", compactCount(card.chats), "chats")
                    d?.messages?.takeIf { it > 0 }?.let { Figure("✉", compactCount(it), "messages") }
                    d?.takeIf { it.ratingCount > 0 }?.let { Figure("⭐", "%.1f".format(it.rating), "of ${compactCount(it.ratingCount)} ratings") }
                    if (card.tokens > 0) Figure("◈", compactCount(card.tokens), "tokens")
                    d?.forks?.takeIf { it > 0 }?.let { Figure("⑂", compactCount(it), "forks") }
                }
            }
            val topics = shownTopics(card.topics, limit = 12)
            if (topics.isNotEmpty()) item {
                FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    if (card.nsfw) InkChip("18+", false, {}, small = true)
                    topics.forEach { t -> InkChip(t, false, { onTopic(t) }, small = true) }
                }
            }
            item {
                PrimaryButton(
                    when { added -> "Added"; busy -> "Adding…"; else -> "Add ${card.name}" },
                    onClick = onAdd,
                    icon = if (added) Icons.Filled.Check else Icons.Filled.Download,
                    enabled = !blocked && !added,
                    modifier = Modifier.fillMaxWidth(),
                )
                Text(
                    "Adding brings its portrait" + if (d?.expressions?.isNotEmpty() == true) ", and its expression pack of ${d.expressions.size}." else ".",
                    style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 6.dp),
                )
            }
            if (d == null) {
                item {
                    if (error.isNotEmpty()) EmptyNote(error)
                    else Box(Modifier.fillMaxWidth().height(120.dp), Alignment.Center) { CircularProgressIndicator() }
                }
                return@LazyColumn
            }
            val greetings = listOfNotNull(d.firstMessage.takeIf { it.isNotBlank() }) + d.greetings.filter { it.isNotBlank() }
            item {
                Row(Modifier.horizontalScroll(rememberScrollState())) {
                    Segmented(
                        buildList {
                            add("card" to "The card")
                            if (greetings.isNotEmpty()) add("greetings" to "Greetings ${greetings.size}")
                            if (d.lorebook.isNotEmpty()) add("lore" to "Lorebook ${d.lorebook.size + d.lorebookMore}")
                            if (d.expressions.isNotEmpty()) add("expressions" to "Expressions ${d.expressions.size}")
                            if (d.hasGallery) add("gallery" to "Gallery")
                        },
                        tab,
                        { tab = it },
                    )
                }
            }
            when (tab) {
                "greetings" -> greetings.forEachIndexed { i, g ->
                    item(key = "g$i") {
                        Column {
                            Kicker(if (i == 0) "First message" else "Greeting ${i + 1}")
                            Spacer(Modifier.height(6.dp))
                            InkPanel(Modifier.fillMaxWidth(), padding = PaddingValues(14.dp)) { Roleplay(fillNames(g, card.name)) }
                        }
                    }
                }
                "lore" -> {
                    if (d.lorebookName.isNotBlank()) item { Text(d.lorebookName, style = MaterialTheme.typography.titleMedium) }
                    d.lorebook.forEachIndexed { i, e ->
                        item(key = "l$i") {
                            InkPanel(Modifier.fillMaxWidth(), padding = PaddingValues(14.dp)) {
                                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(e.name.ifBlank { e.keys.firstOrNull() ?: "Entry ${i + 1}" }, style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f))
                                        if (e.constant) TileBadge("Always on", color = MaterialTheme.colorScheme.primary.copy(alpha = 0.85f))
                                        if (e.disabled) TileBadge("Off")
                                    }
                                    if (e.keys.isNotEmpty()) FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                        e.keys.take(12).forEach { k ->
                                            Text(k, style = MaterialTheme.typography.labelSmall, modifier = Modifier.clip(RoundedCornerShape(6.dp))
                                                .background(LocalInk.current.selected).padding(horizontal = 7.dp, vertical = 3.dp))
                                        }
                                    }
                                    SelectionContainer { Text(fillNames(e.content, card.name), style = MaterialTheme.typography.bodySmall) }
                                }
                            }
                        }
                    }
                    if (d.lorebookMore > 0) item {
                        Text("…and ${d.lorebookMore} more, read on chub.ai.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                "expressions" -> item {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        if (d.expressionPack.isNotBlank()) Text(d.expressionPack, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(10.dp), maxItemsInEachRow = 3) {
                            d.expressions.forEach { x ->
                                Column(Modifier.weight(1f).clickable { zoomed = x.url }) {
                                    Box(Modifier.fillMaxWidth().aspectRatio(3f / 4f).clip(RoundedCornerShape(10.dp)).background(MaterialTheme.colorScheme.surfaceContainer)) {
                                        AsyncImage(repo.serverUrl(x.url), x.label, imageLoader = repo.imageLoader, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                                    }
                                    Text(x.label, style = MaterialTheme.typography.labelMedium, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 4.dp))
                                }
                            }
                        }
                    }
                }
                "gallery" -> item { ChubGallery(repo, d.id) { zoomed = it } }
                else -> {
                    val sections = cardSections(d)
                    if (sections.isEmpty()) item { EmptyNote("This card's fields are empty.") }
                    sections.forEach { sec ->
                        item(key = sec.key) {
                            Column {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Kicker(sec.label, Modifier.weight(1f))
                                    sec.tokens?.let { Text("${compactCount(it)} tokens", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                                }
                                Spacer(Modifier.height(6.dp))
                                var open by remember(sec.key) { mutableStateOf(sec.text.length < 900) }
                                SelectionContainer {
                                    Text(fillNames(sec.text, card.name), style = MaterialTheme.typography.bodySmall,
                                        maxLines = if (open) Int.MAX_VALUE else 14, overflow = TextOverflow.Ellipsis)
                                }
                                if (sec.text.length >= 900) TextButton(onClick = { open = !open }) { Text(if (open) "Show less" else "Read all of it") }
                            }
                        }
                    }
                }
            }
        }
    }
    if (zoomed.isNotEmpty()) Dialog(onDismissRequest = { zoomed = "" }, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Box(Modifier.fillMaxSize().background(Color.Black)) {
            ZoomableImage(url = repo.serverUrl(zoomed), imageLoader = repo.imageLoader, contentDescription = null, enabled = true, onZoomed = {}, onTap = { _, _ -> zoomed = "" })
            IconButton(onClick = { zoomed = "" }, modifier = Modifier.align(Alignment.TopEnd).windowInsetsPadding(WindowInsets.statusBars).padding(8.dp)) {
                Icon(Icons.Filled.Close, contentDescription = "Close", tint = Color.White)
            }
        }
    }
}

@Composable
private fun Figure(mark: String, value: String, label: String) {
    Row(verticalAlignment = Alignment.Bottom) {
        Text("$mark $value", style = MaterialTheme.typography.titleSmall)
        Spacer(Modifier.width(4.dp))
        Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

/** A greeting as chat draws one: *actions* in italics, "speech" in the accent's light. */
@Composable
private fun Roleplay(text: String) {
    val speech = LocalInk.current.primaryBright
    val muted = MaterialTheme.colorScheme.onSurfaceVariant
    val runs = roleplayRuns(text)
    SelectionContainer {
        Text(
            buildAnnotatedString {
                runs.forEach { r ->
                    when (r.kind) {
                        "action" -> withStyle(SpanStyle(fontStyle = FontStyle.Italic, color = muted)) { append(r.text) }
                        "speech" -> withStyle(SpanStyle(color = speech, fontWeight = FontWeight.Medium)) { append(r.text) }
                        else -> append(r.text)
                    }
                }
            },
            style = MaterialTheme.typography.bodyMedium.copy(fontSize = 14.5.sp),
        )
    }
}

/** The pictures people posted to a card's gallery on chub, a page at a time. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ChubGallery(repo: Repository, id: Long, onZoom: (String) -> Unit) {
    var pics by remember(id) { mutableStateOf<List<ChubGalleryItem>>(emptyList()) }
    var page by remember(id) { mutableIntStateOf(0) }
    var more by remember(id) { mutableStateOf(true) }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()
    fun next() {
        if (loading || !more) return
        loading = true
        scope.launch {
            runCatching { repo.web.chubGallery(id, page + 1) }
                .onSuccess { r ->
                    val have = pics.mapTo(HashSet()) { it.id }
                    pics = pics + r.items.filter { have.add(it.id) }
                    page += 1; more = r.more
                }
                .onFailure { error = it.serverMessage("chub.ai didn't send the gallery."); more = false }
            loading = false
        }
    }
    LaunchedEffect(id) { next() }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        if (error.isNotEmpty()) Text(error, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        if (!loading && pics.isEmpty() && error.isEmpty()) Text("Nobody has posted to its gallery.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp), maxItemsInEachRow = 3) {
            pics.forEach { p ->
                Box(Modifier.weight(1f).aspectRatio(3f / 4f).clip(RoundedCornerShape(10.dp)).background(MaterialTheme.colorScheme.surfaceContainer).clickable { onZoom(p.url) }) {
                    AsyncImage(repo.serverUrl(p.url), p.description, imageLoader = repo.imageLoader, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                    if (p.nsfw) TileBadge("18+", Modifier.padding(4.dp))
                }
            }
        }
        if (loading) Box(Modifier.fillMaxWidth().padding(8.dp), Alignment.Center) { CircularProgressIndicator(Modifier.size(22.dp)) }
        else if (more) OutlinedButton(onClick = { next() }, modifier = Modifier.fillMaxWidth()) { Text("More pictures") }
    }
}
