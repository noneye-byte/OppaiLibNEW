package net.fourbakers.oppailib.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.grid.rememberLazyGridState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Comment
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Forum
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Public
import androidx.compose.material.icons.filled.PushPin
import androidx.compose.material.icons.outlined.PushPin
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import kotlinx.coroutines.launch
import net.fourbakers.oppailib.data.PinnedFeed
import net.fourbakers.oppailib.data.RemoteSource
import net.fourbakers.oppailib.data.Repository
import net.fourbakers.oppailib.data.SourceFeed
import net.fourbakers.oppailib.data.SourceItem
import net.fourbakers.oppailib.data.SourceSaveRequest
import net.fourbakers.oppailib.work.ImportWorker

internal data class MergedSourcePage(
    val items: List<SourceItem>,
    val cursor: String,
    val error: String? = null,
)

/**
 * Merges one remote page without letting a broken adapter append page one forever.
 * Stable item ids also remove the harmless overlap some catalogues put between pages.
 */
internal fun mergeSourcePage(
    current: List<SourceItem>,
    pageItems: List<SourceItem>,
    nextCursor: String,
    requestedCursor: String,
    reset: Boolean,
): MergedSourcePage {
    val uniquePage = pageItems.distinctBy { it.id }
    if (reset) return MergedSourcePage(uniquePage, nextCursor)
    if (nextCursor.isNotEmpty() && nextCursor == requestedCursor) {
        return MergedSourcePage(
            current,
            "",
            "This source returned the same page cursor twice, so paging was stopped.",
        )
    }
    val known = current.asSequence().map { it.id }.toHashSet()
    val fresh = uniquePage.filterNot { it.id in known }
    if (pageItems.isNotEmpty() && fresh.isEmpty()) {
        return MergedSourcePage(
            current,
            "",
            "This source repeated an earlier page, so paging was stopped.",
        )
    }
    return MergedSourcePage(current + fresh, nextCursor)
}

/**
 * Browses a remote catalogue — a 4chan board, a doujin listing — without importing
 * anything. Items stream from the origin through the server's proxy; only the save
 * button pulls one into the library.
 *
 * Some items are *containers* rather than files: a 4chan board lists threads, and a
 * thread is a set you browse into (see [SourceItem.isContainer]). Drilling in is just
 * another feed — [container] holds the one we're inside, and clearing it goes back to
 * the board.
 *
 * [openAt] lands the screen straight on a pinned feed (search term and all) instead of
 * on whatever source happens to come first.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BrowseScreen(repo: Repository, openAt: PinnedFeed? = null, onBack: () -> Unit) {
    var sources by remember { mutableStateOf<List<RemoteSource>>(emptyList()) }
    var source by remember { mutableStateOf<RemoteSource?>(null) }

    // The feed chosen from the chips. `container` is the thread browsed into from it,
    // if any — the feed actually being fetched is one or the other, never both.
    var boardFeed by remember { mutableStateOf("") }
    var boardDraft by remember { mutableStateOf("") }
    var container by remember { mutableStateOf<SourceItem?>(null) }
    val feed = container?.feedId ?: boardFeed

    var sort by remember { mutableStateOf("") }

    // The committed search term — what was actually fetched. `draft` is what's in the
    // box. Keeping them apart is what stops every keystroke becoming a request.
    var query by remember { mutableStateOf("") }
    var draft by remember { mutableStateOf("") }

    var items by remember { mutableStateOf<List<SourceItem>>(emptyList()) }
    var cursor by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    // Distinct from `loading`: until the source list arrives there is no feed to be
    // empty, and saying "Nothing on this feed" before we've even asked is a lie.
    var loadingSources by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var viewerAt by remember { mutableStateOf<Int?>(null) }
    var pinned by remember { mutableStateOf(repo.prefs.pinnedFeeds) }
    val context = LocalContext.current

    // The thread whose comments are open, if any.
    var commentsFor by remember { mutableStateOf<SourceItem?>(null) }

    // A file asked for from the comments that isn't in the grid yet. Reading a thread's
    // comments from the *board* means the grid still holds threads, not their files — so
    // tapping a video in one has to go into the thread first and open the file once its
    // feed has actually landed. This is what remembers what we were going in for.
    var pendingOpen by remember { mutableStateOf<String?>(null) }

    // Stamps each browse request so a late reply from a board we've left can't land in
    // the grid of the board we're on. See load().
    var req by remember { mutableIntStateOf(0) }

    val grid = rememberLazyGridState()
    val scope = rememberCoroutineScope()
    val snackbar = remember { SnackbarHostState() }
    val keyboard = LocalSoftwareKeyboardController.current

    // The chip-level feed, which is what search and pinning are about. Inside a thread
    // there is no chip selected, so neither applies.
    val currentFeed: SourceFeed? = source?.feeds?.firstOrNull { it.id == boardFeed }
    val isSearch = container == null && currentFeed?.query == true
    val searchTarget = currentFeed?.label
        ?.takeUnless { it.equals("Search", ignoreCase = true) }
        ?.let { "${source?.name.orEmpty()} ${it.lowercase()}" }
        ?: source?.name.orEmpty()

    LaunchedEffect(Unit) {
        runCatching { repo.api.sources().sources }
            .onSuccess { list ->
                sources = list
                // A pin names the source and feed it wants; otherwise land on something
                // browsable rather than an empty picker.
                val want = openAt?.let { pin -> list.firstOrNull { it.id == pin.sourceId } }
                if (want != null) {
                    source = want
                    boardFeed = openAt.feedId
                    query = openAt.query
                    draft = openAt.query
                    sort = openAt.sort
                } else {
                    list.firstOrNull()?.let { first ->
                        source = first
                        boardFeed = first.feeds.firstOrNull()?.id ?: ""
                    }
                }
            }
            .onFailure { error = it.message ?: "Couldn't reach the server" }
        loadingSources = false
    }

    /** Loads a page of the current feed. [reset] starts the feed over. */
    fun load(reset: Boolean) {
        val src = source ?: return
        // A generic source declaration is metadata, not an authentication flow. Never
        // try to turn it into a way around a login wall or age/access control.
        if (src.authentication == "required") return
        // Paging is one-at-a-time and stops at the end. A *reset* is never refused: it
        // means the user picked another board, and that has to win over whatever is
        // already in flight — see `mine` below.
        if (!reset && (loading || cursor.isEmpty())) return
        // A search feed with no term would 400 upstream; wait for one instead.
        if (isSearch && query.isBlank()) return

        // Every request is stamped, and only the newest is allowed to land.
        //
        // This is what stopped one board's threads showing up under another's. Picking a
        // new board fires a fresh request while the old board's is still in the air, and
        // the request that *returned* last used to win — so /h/'s reply would repopulate
        // the grid the user had just pointed at /gif/. Worse, the old request was still
        // holding `loading`, so the new board's own load was refused outright and the
        // tiles you were left looking at were the previous board's, entire.
        val requestedCursor = if (reset) "" else cursor
        req += 1
        val mine = req
        loading = true
        scope.launch {
            val result = runCatching {
                repo.api.browseSource(
                    id = src.id,
                    feed = feed,
                    cursor = requestedCursor.ifEmpty { null },
                    // A thread is its own feed; the board's search term means nothing
                    // inside it and would only be handed back to the source as noise.
                    q = if (container == null) query.ifBlank { null } else null,
                    sort = if (container == null) sort.ifBlank { null } else null,
                )
            }
            // Superseded: these tiles belong to a feed we have already left. Dropping
            // them on the floor — and leaving `loading` to whoever now owns it — is the
            // whole fix.
            if (mine != req) return@launch

            result
                .onSuccess { page ->
                    val merged = mergeSourcePage(
                        current = items,
                        pageItems = page.items,
                        nextCursor = page.cursor,
                        requestedCursor = requestedCursor,
                        reset = reset,
                    )
                    items = merged.items
                    cursor = merged.cursor
                    error = merged.error
                }
                .onFailure { error = it.message ?: "Couldn't load that feed" }
            loading = false
        }
    }

    // Refetch whenever the thing being asked for changes. `query` is the committed
    // term, not the draft, so typing doesn't stream requests at the site.
    //
    // Nothing here may suspend before load(): clearing `items` swaps the grid out for
    // the empty state, so the LazyVerticalGrid is no longer composed — and a
    // grid.scrollToItem() here would then wait forever for a layout that never comes,
    // never reaching load(). That is exactly what left the screen stuck on "Nothing on
    // this feed". Emptying the list resets the scroll on its own anyway.
    LaunchedEffect(source?.id, feed, query, sort) {
        if (source != null && feed.isNotEmpty()) {
            items = emptyList()
            cursor = ""
            error = null
            load(reset = true)
        }
    }

    // Infinite scroll: fetch the next page as the last row comes into view.
    val nearEnd by remember {
        derivedStateOf {
            val last = grid.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0
            items.isNotEmpty() && last >= items.size - 6
        }
    }
    LaunchedEffect(Unit) {
        snapshotFlow { nearEnd }.collect { if (it && cursor.isNotEmpty()) load(reset = false) }
    }

    // Android back steps out one level at a time, matching the top bar's arrow: out of
    // a thread back to its board first, then out of the browser back to the library.
    BackHandler { if (container != null) container = null else onBack() }

    // Containers aren't viewable, so the viewer's feed is the files only — and every
    // index handed to it has to be into *this* list, not into `items`.
    val viewable = items.filter { !it.isContainer }

    // A file we went into a thread to open. It can't be resolved at the moment it's
    // asked for — the thread's feed hasn't been fetched yet — so it waits here until
    // the file turns up. If the thread has loaded and it still isn't there (it 404'd,
    // or it was pruned), the want is dropped rather than left to fire later.
    LaunchedEffect(viewable, loading, pendingOpen) {
        val want = pendingOpen ?: return@LaunchedEffect
        val at = viewable.indexOfFirst { it.id == want }
        if (at >= 0) {
            viewerAt = at
            pendingOpen = null
        } else if (!loading && viewable.isNotEmpty()) {
            pendingOpen = null
        }
    }

    viewerAt?.let { start ->
        RemoteViewerScreen(
            repo = repo,
            sourceId = source?.id ?: return@let,
            items = viewable,
            startIndex = start,
            onClose = { viewerAt = null },
            onSaved = { scope.launch { snackbar.showSnackbar("Saved to library") } },
            onSaveFailed = { msg -> scope.launch { snackbar.showSnackbar(msg) } },
        )
        return
    }

    // What pinning this view would store. A search pin remembers its term and sort, so
    // reopening it doesn't mean retyping the search. A thread is not pinnable: it 404s
    // as soon as it slides off the board.
    val pin: PinnedFeed? = source?.let { src ->
        if (container != null) return@let null
        val f = currentFeed ?: return@let null
        if (isSearch && query.isBlank()) return@let null // nothing to pin yet
        PinnedFeed(
            sourceId = src.id,
            feedId = f.id,
            label = if (isSearch) "${src.name}: $query" else "${src.name} — ${f.label}",
            query = query,
            sort = sort,
        )
    }
    val isPinned = pin != null && pinned.any {
        it.sourceId == pin.sourceId && it.feedId == pin.feedId && it.query == pin.query
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(container?.title ?: source?.name ?: "Browse", maxLines = 1, overflow = TextOverflow.Ellipsis) },
                navigationIcon = {
                    IconButton(onClick = { if (container != null) container = null else onBack() }) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = if (container != null) "Back to the board" else "Back",
                        )
                    }
                },
                actions = {
                    // Inside a thread, the conversation is a tap away — the files are
                    // only half of what a thread is.
                    container?.takeIf { it.hasComments }?.let { thread ->
                        IconButton(onClick = { commentsFor = thread }) {
                            Icon(Icons.AutoMirrored.Filled.Comment, contentDescription = "Read the comments")
                        }
                    }
                    // A whole thread saves as one comic: its images, in post order.
                    //
                    // Handed to a worker rather than run here: the server pulls every
                    // image with a delay between them and answers only when it's done,
                    // which for a long thread is minutes. Backing out of this screen used
                    // to abandon that halfway through. Now the notification owns it, and
                    // this screen is free to leave.
                    container?.let { thread ->
                        IconButton(
                            onClick = {
                                ImportWorker.saveFromSource(
                                    context,
                                    sourceId = source?.id.orEmpty(),
                                    req = SourceSaveRequest(
                                        itemId = thread.id,
                                        pageUrl = thread.pageUrl.ifEmpty { null },
                                        title = thread.title.ifEmpty { null },
                                        kind = "comic",
                                        tags = thread.tags,
                                    ),
                                    label = thread.title.ifEmpty { "Thread" },
                                )
                                scope.launch {
                                    snackbar.showSnackbar("Saving the thread in the background")
                                }
                            },
                        ) {
                            Icon(Icons.Filled.Download, contentDescription = "Save this whole thread")
                        }
                    }
                    if (pin != null) {
                        IconButton(
                            onClick = {
                                repo.prefs.togglePin(pin)
                                pinned = repo.prefs.pinnedFeeds
                                scope.launch {
                                    snackbar.showSnackbar(
                                        if (repo.prefs.isPinned(pin.sourceId, pin.feedId)) {
                                            "Pinned to the sidebar"
                                        } else {
                                            "Unpinned"
                                        },
                                    )
                                }
                            },
                        ) {
                            Icon(
                                if (isPinned) Icons.Filled.PushPin else Icons.Outlined.PushPin,
                                contentDescription = if (isPinned) "Unpin this feed" else "Pin this feed",
                                tint = if (isPinned) {
                                    MaterialTheme.colorScheme.primary
                                } else {
                                    MaterialTheme.colorScheme.onSurfaceVariant
                                },
                            )
                        }
                    }
                },
            )
        },
        snackbarHost = { SnackbarHost(snackbar) },
    ) { padding ->
        commentsFor?.let { thread ->
            CommentsSheet(
                repo = repo,
                sourceId = source?.id.orEmpty(),
                item = thread,
                onDismiss = { commentsFor = null },
                onOpen = { c ->
                    val at = viewable.indexOfFirst { it.id == c.itemId }
                    when {
                        // Already inside the thread: the file is right there in the grid.
                        at >= 0 -> viewerAt = at
                        // Still on the board. Go into the thread; `pendingOpen` finishes
                        // the job when its files arrive.
                        thread.isContainer -> {
                            pendingOpen = c.itemId
                            container = thread
                        }
                    }
                },
            )
        }

        Column(Modifier.padding(padding).fillMaxSize()) {
            // Inside a thread the pickers would be lying about what's on screen, so the
            // thread's own header replaces them.
            if (container == null) {
                if (sources.size > 1) {
                    ChipRow(
                        options = sources.map { it.id to it.name },
                        selected = source?.id,
                        onSelect = { id ->
                            sources.firstOrNull { it.id == id }?.let {
                                source = it
                                boardFeed = it.feeds.firstOrNull()?.id ?: ""
                                query = ""
                                draft = ""
                                sort = ""
                            }
                        },
                    )
                }
                source?.let { src ->
                    SourceAccessNotices(src)
                    ChipRow(
                        options = src.feeds.map { it.id to it.label },
                        selected = boardFeed,
                        onSelect = { id ->
                            boardFeed = id
                            // Each feed carries its own orderings; the previous feed's
                            // sort is meaningless here, so fall back to its default.
                            sort = ""
                            val f = src.feeds.firstOrNull { it.id == id }
                            if (f?.query != true) {
                                query = ""
                                draft = ""
                            }
                        },
                    )
                    if (src.id == "4chan") {
                        OutlinedTextField(
                            value = boardDraft,
                            onValueChange = { boardDraft = it },
                            label = { Text("Open another board (for example /b/)") },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Go),
                            keyboardActions = KeyboardActions(onGo = {
                                normalizeBoardInput(boardDraft)?.let {
                                    keyboard?.hide()
                                    boardFeed = it
                                    boardDraft = ""
                                    query = ""
                                    sort = ""
                                }
                            }),
                            modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 4.dp),
                        )
                    }
                }
            } else {
                Text(
                    "${items.size} files in this thread",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp),
                )
            }

            if (isSearch) {
                OutlinedTextField(
                    value = draft,
                    onValueChange = { draft = it },
                    label = { Text("Search $searchTarget") },
                    singleLine = true,
                    leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                    // Committing on Search, not on every keystroke: each commit is a
                    // request to someone else's site.
                    keyboardActions = KeyboardActions(onSearch = {
                        keyboard?.hide()
                        query = draft.trim()
                    }),
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 4.dp),
                )
                currentFeed?.sorts?.takeIf { it.isNotEmpty() }?.let { sorts ->
                    ChipRow(
                        options = sorts.map { it.id to it.label },
                        selected = sort.ifEmpty { sorts.first().id },
                        onSelect = { sort = it },
                    )
                }
            }

            when {
                error != null && items.isEmpty() -> Box(Modifier.fillMaxSize(), Alignment.Center) {
                    Text(error ?: "", Modifier.padding(24.dp))
                }
                loadingSources || (items.isEmpty() && loading) ->
                    Box(Modifier.fillMaxSize(), Alignment.Center) { CircularProgressIndicator() }
                // A search that hasn't been run yet isn't an empty feed — say so.
                isSearch && query.isBlank() -> Box(Modifier.fillMaxSize(), Alignment.Center) {
                    Text("Search $searchTarget to see results.", Modifier.padding(24.dp))
                }
                source?.authentication == "required" -> Box(Modifier.fillMaxSize(), Alignment.Center) {
                    Text(
                        "This source requires authentication that its adapter has not configured.",
                        Modifier.padding(24.dp),
                    )
                }
                items.isEmpty() -> Box(Modifier.fillMaxSize(), Alignment.Center) {
                    Text(
                        when {
                            container != null -> "Nothing left in this thread — it may have 404'd."
                            isSearch -> "Nothing matched “$query”."
                            else -> "Nothing on this feed."
                        },
                        Modifier.padding(24.dp),
                    )
                }
                else -> LazyVerticalGrid(
                    state = grid,
                    columns = GridCells.Adaptive(minSize = 150.dp),
                    modifier = Modifier.fillMaxSize().padding(horizontal = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(items, key = { it.id }) { item ->
                        RemoteTile(repo, item) {
                            if (item.isContainer) {
                                container = item
                            } else {
                                viewerAt = viewable.indexOf(item)
                            }
                        }
                    }
                    if (cursor.isNotEmpty() || error != null || loading) {
                        item(span = { GridItemSpan(maxLineSpan) }) {
                            Column(
                                Modifier.fillMaxWidth().padding(16.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                            ) {
                                error?.let {
                                    Text(
                                        it,
                                        color = MaterialTheme.colorScheme.error,
                                        style = MaterialTheme.typography.bodySmall,
                                        modifier = Modifier.padding(bottom = 8.dp),
                                    )
                                }
                                if (cursor.isNotEmpty()) {
                                    Button(onClick = { load(reset = false) }, enabled = !loading) {
                                        Text(if (loading) "Loading next page…" else "Load more")
                                    }
                                } else if (loading) {
                                    CircularProgressIndicator(Modifier.size(28.dp))
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

/** Adapter-declared access and content notices, shown before any remote feed. */
@Composable
private fun SourceAccessNotices(source: RemoteSource) {
    val authText = when (source.authentication) {
        "required" -> "Authentication is required. OppaiLib will not bypass the site's access controls."
        "optional" -> "Authentication is optional."
        "unknown" -> "This older adapter did not declare its authentication requirements."
        else -> ""
    }
    if (authText.isNotEmpty() || !source.authNote.isNullOrBlank()) {
        Notice(
            icon = if (source.authentication == "none") Icons.Filled.Public else Icons.Filled.Lock,
            text = listOf(authText, source.authNote.orEmpty()).filter { it.isNotBlank() }.joinToString(" "),
            warning = source.authentication == "required" || source.authentication == "unknown",
        )
    }
    source.contentWarning?.takeIf { it.isNotBlank() }?.let {
        Notice(Icons.Filled.Warning, "Content notice. $it", warning = true)
    }
}

@Composable
private fun Notice(icon: ImageVector, text: String, warning: Boolean) {
    Row(
        Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 4.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(
                if (warning) MaterialTheme.colorScheme.errorContainer
                else MaterialTheme.colorScheme.surfaceVariant,
            )
            .padding(12.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Icon(
            icon,
            contentDescription = null,
            tint = if (warning) MaterialTheme.colorScheme.onErrorContainer
                else MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(
            text,
            style = MaterialTheme.typography.bodySmall,
            color = if (warning) MaterialTheme.colorScheme.onErrorContainer
                else MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.weight(1f),
        )
    }
}

/** Accepts b, /b/, or a copied board URL and returns the bare API board id. */
private fun normalizeBoardInput(raw: String): String? {
    val value = raw.trim().lowercase()
        .removePrefix("https://").removePrefix("http://")
        .removePrefix("boards.4chan.org/").trim('/').substringBefore('/')
    return value.takeIf { it.length in 1..10 && it.all(Char::isLetterOrDigit) }
}

@Composable
private fun ChipRow(options: List<Pair<String, String>>, selected: String?, onSelect: (String) -> Unit) {
    Row(
        Modifier.fillMaxWidth().horizontalScroll(rememberScrollState())
            .padding(horizontal = 12.dp, vertical = 6.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        options.forEach { (id, label) ->
            FilterChip(
                selected = selected == id,
                onClick = { onSelect(id) },
                label = { Text(label) },
            )
        }
    }
}

@Composable
private fun RemoteTile(repo: Repository, item: SourceItem, onClick: () -> Unit) {
    val context = LocalContext.current
    Box(
        Modifier.aspectRatio(0.75f).clip(RoundedCornerShape(16.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant).clickable(onClick = onClick),
    ) {
        if (item.thumbUrl.isNotEmpty()) {
            AsyncImage(
                // Even the thumbnail goes through the server: it carries our auth, and
                // the origin would otherwise see the phone's IP on every tile it scrolls
                // past.
                model = ImageRequest.Builder(context).data(repo.sourceStreamUrl(item.thumbUrl))
                    .crossfade(true).build(),
                imageLoader = repo.imageLoader,
                contentDescription = item.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize(),
            )
        } else {
            // A text-only OP has no cover. The thread is still worth opening — its files
            // are in the replies.
            Box(Modifier.fillMaxSize(), Alignment.Center) {
                Icon(
                    Icons.Filled.Forum,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(40.dp),
                )
            }
        }

        when (item.kind) {
            "video" -> Box(
                Modifier.align(Alignment.Center).size(44.dp).clip(CircleShape).background(Color(0x66000000)),
                Alignment.Center,
            ) { Icon(Icons.Filled.PlayArrow, contentDescription = null, tint = Color.White) }

            "comic" -> Badge(Icons.AutoMirrored.Filled.MenuBook, "Comic")

            // A thread says how much is inside it, which is the thing you actually pick
            // threads on.
            "thread" -> Row(
                Modifier.align(Alignment.TopEnd).padding(6.dp).clip(RoundedCornerShape(12.dp))
                    .background(Color(0x99000000)).padding(horizontal = 8.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    Icons.Filled.Forum,
                    contentDescription = "Thread",
                    tint = Color.White,
                    modifier = Modifier.size(14.dp),
                )
                Text(
                    item.count.toString(),
                    color = Color.White,
                    style = MaterialTheme.typography.labelSmall,
                )
            }
        }

        Text(
            item.title,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            style = MaterialTheme.typography.labelMedium,
            color = Color.White,
            modifier = Modifier.align(Alignment.BottomStart)
                .background(Color(0x99000000)).fillMaxWidth().padding(6.dp),
        )
    }
}

@Composable
private fun BoxScope.Badge(icon: ImageVector, label: String) {
    Box(
        Modifier.align(Alignment.TopEnd).padding(6.dp).size(28.dp)
            .clip(CircleShape).background(Color(0x99000000)),
        Alignment.Center,
    ) {
        Icon(icon, contentDescription = label, tint = Color.White, modifier = Modifier.size(16.dp))
    }
}
