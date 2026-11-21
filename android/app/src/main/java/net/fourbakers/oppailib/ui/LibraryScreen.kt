package net.fourbakers.oppailib.ui

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.widget.Toast
import androidx.activity.compose.BackHandler
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyGridState
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.PlaylistAdd
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Apps
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckBoxOutlineBlank
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.CloudUpload
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Face
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.HeartBroken
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.PhotoSizeSelectLarge
import androidx.compose.material.icons.filled.SelectAll
import androidx.compose.material.icons.filled.TravelExplore
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material.icons.filled.Upload
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.Stable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import net.fourbakers.oppailib.data.BulkRequest
import net.fourbakers.oppailib.data.LibbyIdentityMark
import net.fourbakers.oppailib.data.LibbyVoice
import net.fourbakers.oppailib.data.Media
import net.fourbakers.oppailib.data.MediaCollection
import net.fourbakers.oppailib.data.MediaPatch
import net.fourbakers.oppailib.data.Prefs
import net.fourbakers.oppailib.data.Repository
import net.fourbakers.oppailib.data.SortMode
import net.fourbakers.oppailib.data.serverMessage
import net.fourbakers.oppailib.ui.theme.Appearance
import net.fourbakers.oppailib.work.DownloadQueue
import net.fourbakers.oppailib.work.DownloadWorker
import net.fourbakers.oppailib.work.UploadQueue
import net.fourbakers.oppailib.work.UploadWorker

/**
 * A page of the library at a time. Big enough that a fling rarely outruns it, small
 * enough that the first screen arrives at once even on a phone on mobile data.
 */
private const val PAGE = 90

/** How long typing has to pause before the search goes to the server. */
private const val SEARCH_SETTLE_MS = 300L

/** The library's places that are not a kind. A kind's place is its kind ("image"…). */
internal const val SCOPE_HOME = "home"
internal const val SCOPE_FAVORITES = "favorites"
internal const val SCOPE_COLLECTIONS = "collections"
internal const val SCOPE_BROWSE = "browse"

private fun scopeLabel(scope: String): String = when (scope) {
    SCOPE_HOME -> "Overview"
    SCOPE_FAVORITES -> "Favorites"
    SCOPE_COLLECTIONS -> "Collections"
    SCOPE_BROWSE -> "Browse"
    else -> kindMeta(scope)?.label ?: "Library"
}

/**
 * The viewer, open on [start]. [only] is set when it was opened on a list that is not
 * the grid's — a Home row, a collection, a link in chat — so the feed is that list rather
 * than an index into a page that doesn't hold it. [at] opens a video at that second.
 */
private data class ViewerOpen(val start: Int, val only: List<Media>? = null, val at: Double = 0.0)

/**
 * What the library keeps while another place is on screen: where in it you are, the
 * pages loaded so far, Home's shelves and where the grid was scrolled to. The shell holds
 * it, because the place itself leaves composition when you switch away.
 */
@Stable
class LibraryState(prefs: Prefs) {
    /** [SCOPE_HOME], a kind, [SCOPE_FAVORITES], [SCOPE_COLLECTIONS] or [SCOPE_BROWSE]. */
    var scope by mutableStateOf(prefs.libraryScope)
    var sort by mutableStateOf(prefs.sortMode)
    var minRating by mutableIntStateOf(prefs.minRating)
    /** Favourites only, within a kind: favourite videos are a thing worth asking for. */
    var favoritesOnly by mutableStateOf(false)
    var density by mutableStateOf(prefs.density)
    var query by mutableStateOf("")
    // What was actually asked of the server: the search box once typing settles.
    var asked by mutableStateOf("")
    var items by mutableStateOf<List<Media>>(emptyList())
    var total by mutableIntStateOf(0)
    val grid = LazyGridState()
    // The filters [items] answer, so returning to the place knows they are still current.
    internal var loadedFor: List<Any>? = null
    // Something landed in the library while the place was away (or while it was up).
    var stale by mutableStateOf(false)
    // The item the viewer was on when the app was last closed, opened once on launch.
    internal var resumeViewer: Long? = prefs.lastViewerMedia.takeIf { it != 0L }
    internal var home by mutableStateOf<HomeData?>(null)
    internal var openCollection by mutableStateOf<MediaCollection?>(null)
    internal var collectionsStale by mutableIntStateOf(0)
    /** Bumped by the bar's Add; the library answers with its add sheet. */
    var addRequest by mutableIntStateOf(0)
    internal var addSeen = 0
    /** The game sites' browser, opened over Games. */
    var findGames by mutableStateOf(false)

    val kind: String get() = if (kindMeta(scope) != null) scope else ""

    /** Whether the body is the paged grid: a kind, Favorites, or any search. */
    internal val gridShown: Boolean get() = kindMeta(scope) != null || scope == SCOPE_FAVORITES || asked.isNotEmpty()

    internal val favoriteFilter: Boolean get() = scope == SCOPE_FAVORITES || (favoritesOnly && kind.isNotEmpty())

    internal val filters: List<Any> get() = listOf(kind, favoriteFilter, sort, asked, minRating)
}

/**
 * The library: Overview, a kind, Favorites, Collections or Browse, chosen by the chips
 * under its search.
 *
 * The grid is a server-side query a page at a time — kind, favourites, rating, search and
 * order — with the next page asked for as you scroll; search has to be the server's
 * anyway, since titles are encrypted at rest and only the process holding the key can
 * match them. Overview is Home's shelves (LibraryHome.kt), Collections the server's lists
 * (LibraryCollections.kt), and Browse the remote sources' own screen.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LibraryScreen(
    repo: Repository,
    state: LibraryState,
    onShareToChat: (Media) -> Unit,
    openRequest: Long?,
    onOpenRequestTaken: () -> Unit,
    onViewerClosed: () -> Unit,
    onChat: () -> Unit,
    onCreate: (String) -> Unit,
    onOpenDownloads: () -> Unit,
) {
    var scope by state::scope
    var sort by state::sort
    var query by state::query
    var asked by state::asked
    var items by state::items
    var total by state::total

    // Loading until the grid holds an answer to the filters as they stand — not merely
    // until it holds tiles, or an empty filter would spin for ever on every return.
    var loading by remember { mutableStateOf(state.loadedFor != state.filters) }
    var loadingMore by remember { mutableStateOf(false) }
    var refreshing by remember { mutableStateOf(false) }
    var homeLoading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    // Bumped by every fresh query, so a page that lands after the filters changed is
    // recognised as an answer to a question nobody is asking any more and dropped.
    var generation by remember { mutableIntStateOf(0) }

    var viewer by remember { mutableStateOf<ViewerOpen?>(null) }
    var showScrape by remember { mutableStateOf(false) }
    var showAdd by remember { mutableStateOf(false) }
    var showUploads by remember { mutableStateOf(false) }
    var filtersMenu by remember { mutableStateOf(false) }
    var holdMedia by remember { mutableStateOf<Media?>(null) }
    var confirmExport by remember { mutableStateOf<Media?>(null) }
    var confirmDelete by remember { mutableStateOf<Media?>(null) }
    var collecting by remember { mutableStateOf<List<Long>?>(null) }
    // Non-empty means the grid is in selection mode: tiles toggle instead of opening.
    var selected by remember { mutableStateOf(emptySet<Long>()) }
    var selectMode by remember { mutableStateOf(false) }
    var confirmBulkDelete by remember { mutableStateOf(false) }
    // An item to open once the first page is in: the one the viewer was on when the
    // app was last closed, or one another place asked for.
    var pendingOpen by remember { mutableStateOf(state.resumeViewer.also { state.resumeViewer = null }) }

    val scope2 = rememberCoroutineScope()
    val context = LocalContext.current
    val grid = state.grid
    val selecting = selectMode || selected.isNotEmpty()

    suspend fun fetch(offset: Int) = repo.api.listMedia(
        kind = state.kind.ifEmpty { null },
        limit = PAGE,
        offset = offset,
        query = asked.ifBlank { null },
        favorite = if (state.favoriteFilter) 1 else null,
        sort = sort.id,
        minRating = state.minRating.takeIf { it > 0 },
    )

    /** Starts the grid over from the first page of the current query. */
    fun reload(pull: Boolean = false) {
        val ask = ++generation
        val filters = state.filters
        if (pull) refreshing = true else loading = true
        error = null
        scope2.launch {
            runCatching { fetch(0) }
                .onSuccess { page ->
                    if (ask != generation) return@onSuccess
                    items = page.items
                    total = page.total
                    state.loadedFor = filters
                    if (!pull) grid.scrollToItem(0)
                }
                .onFailure { if (ask == generation) error = it.serverMessage("Couldn't load the library.") }
            if (ask == generation) { loading = false; refreshing = false }
        }
    }

    fun reloadHome(pull: Boolean = false) {
        if (pull) refreshing = true else homeLoading = true
        scope2.launch {
            state.home = loadHome(repo)
            homeLoading = false
            refreshing = false
        }
    }

    /** Appends the next page, if there is one and nothing is already fetching. */
    fun loadMore() {
        if (loading || loadingMore || items.size >= total) return
        val ask = generation
        loadingMore = true
        scope2.launch {
            runCatching { fetch(items.size) }.onSuccess { page ->
                if (ask != generation) return@onSuccess
                // An upload landing between pages shifts every offset by one; the id
                // check keeps that from showing a tile twice.
                val have = items.mapTo(HashSet()) { it.id }
                items = items + page.items.filter { it.id !in have }
                total = page.total
            }
            loadingMore = false
        }
    }

    fun openList(m: Media, list: List<Media>, at: Double = 0.0) {
        val i = list.indexOfFirst { it.id == m.id }.coerceAtLeast(0)
        viewer = ViewerOpen(i, list, at)
    }

    fun openById(id: Long, at: Double = 0.0) {
        val i = items.indexOfFirst { it.id == id }
        if (i >= 0 && at == 0.0 && state.gridShown) { viewer = ViewerOpen(i); return }
        scope2.launch {
            runCatching { repo.api.getMedia(id) }
                .onSuccess { viewer = ViewerOpen(0, listOf(it), at) }
                .onFailure { repo.report(it.serverMessage("That item isn't in the library any more.")) }
        }
    }

    fun go(next: String) {
        if (next != scope) {
            scope = next
            selected = emptySet(); selectMode = false
            state.favoritesOnly = false
            state.openCollection = null
        }
        // A place picked from the chips is that place, not a search over it.
        if (query.isNotEmpty()) { query = ""; asked = "" }
    }

    fun delete(m: Media) {
        scope2.launch {
            runCatching { repo.api.deleteMedia(m.id) }
                .onSuccess {
                    items = items.filterNot { it.id == m.id }
                    total = (total - 1).coerceAtLeast(0)
                    state.home = null
                    LibbyVoice.react(LibbyVoice.Event.LIBRARY_DELETE).let { repo.report(it.message, it.emotion) }
                }
        }
    }

    /**
     * The selection, favorited or unfavorited in one request. The grid is updated from
     * the ids the server says it applied, not the ids we sent: a bulk action can partly
     * fail, and a tile claiming a favorite the server disagrees with is worse than one
     * that never changed.
     */
    fun favoriteSelection(favorite: Boolean) {
        val ids = selected.toList()
        scope2.launch {
            runCatching { repo.api.bulkMedia(BulkRequest("update", ids, MediaPatch(favorite = favorite))) }
                .onSuccess { result ->
                    val applied = result.ok.toSet()
                    items = items.map { if (it.id in applied) it.copy(favorite = favorite) else it }
                }
            selected = emptySet(); selectMode = false
        }
    }

    fun deleteSelection() {
        val ids = selected.toList()
        scope2.launch {
            runCatching { repo.api.bulkMedia(BulkRequest("delete", ids)) }
                .onSuccess { result ->
                    val gone = result.ok.toSet()
                    items = items.filterNot { it.id in gone }
                    total = (total - gone.size).coerceAtLeast(0)
                    state.home = null
                    if (gone.isNotEmpty()) {
                        LibbyVoice.react(LibbyVoice.Event.LIBRARY_DELETE, count = gone.size)
                            .let { repo.report(it.message, it.emotion) }
                    }
                }
            selected = emptySet(); selectMode = false
        }
    }

    // The upload queue, read straight from the worker's own state so the badge and the
    // sheet cannot drift from what is actually being sent.
    val uploadItems by UploadQueue.items.collectAsState()

    LaunchedEffect(query) {
        delay(SEARCH_SETTLE_MS)
        asked = query.trim()
    }
    LaunchedEffect(scope, state.sort, state.minRating) {
        repo.prefs.libraryScope = scope
        repo.prefs.sortMode = state.sort
        repo.prefs.minRating = state.minRating
    }
    LaunchedEffect(state.kind, state.favoriteFilter, sort, asked, state.minRating, state.gridShown) {
        // Back with the same filters: the grid is as it was left, scroll and all. Only a
        // change of question goes back to the server.
        if (state.gridShown && state.loadedFor != state.filters) reload()
    }
    LaunchedEffect(scope) {
        if (scope == SCOPE_HOME && state.home == null) reloadHome()
    }
    LaunchedEffect(state.stale) {
        if (state.stale) {
            state.stale = false
            state.home = null
            if (state.gridShown) reload(pull = true)
            if (scope == SCOPE_HOME) reloadHome(pull = true)
        }
    }
    LaunchedEffect(state.addRequest) {
        if (state.addRequest != state.addSeen) { state.addSeen = state.addRequest; showAdd = true }
    }
    // Scrolling near the end of what's loaded asks for the next page.
    val nearEnd by remember {
        derivedStateOf {
            val last = grid.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0
            last >= items.size - 30
        }
    }
    LaunchedEffect(nearEnd, items.size, total) { if (nearEnd && state.gridShown) loadMore() }

    // An open asked for — at launch, or by another place — lands once the first page is
    // in, so an item that's on it opens in place with its neighbours to swipe to.
    LaunchedEffect(openRequest) {
        openRequest?.let {
            pendingOpen = it
            selected = emptySet()
            onOpenRequestTaken()
        }
    }
    LaunchedEffect(pendingOpen, loading) {
        val id = pendingOpen ?: return@LaunchedEffect
        if (loading && state.gridShown) return@LaunchedEffect
        pendingOpen = null
        openById(id)
    }
    // By id, not by index: an index into a grid rebuilt from the server points at the
    // wrong thing by the time the app is reopened.
    LaunchedEffect(viewer) {
        val id = viewer?.let { v -> (v.only ?: items).getOrNull(v.start)?.id }
        repo.prefs.lastViewerMedia = id ?: 0L
        if (id != null) repo.prefs.noteOpened(id)
    }

    /**
     * Picked files go to the upload queue, not straight onto the wire: the queue streams
     * from the content URI in chunks, in a foreground worker, and resumes from what the
     * server already has. The persistable read permission is what lets it recover after
     * a restart.
     */
    val uploadLauncher = rememberSystemPickerLauncher(ActivityResultContracts.OpenMultipleDocuments()) { uris ->
        if (uris.isNullOrEmpty()) return@rememberSystemPickerLauncher
        for (uri in uris) {
            runCatching { context.contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION) }
        }
        val added = UploadWorker.enqueue(context, uris)
        if (added == 0) repo.report("Those are already in the upload queue.")
        showUploads = true
    }

    if (showUploads) {
        UploadsSheet(
            repo = repo,
            onDismiss = { showUploads = false },
            onOpenMedia = { id -> showUploads = false; openById(id) },
        )
    }

    // The viewer owns the whole screen (immersive), so it replaces the library rather
    // than layering over it, and pages through exactly the list it was opened on.
    viewer?.let { open ->
        val feed = open.only ?: items
        ViewerScreen(
            repo = repo,
            items = feed,
            startIndex = open.start,
            startAt = open.at,
            onClose = { viewer = null; onViewerClosed() },
            onChanged = { updated ->
                items = items.map { if (it.id == updated.id) updated else it }
                if (open.only != null) viewer = open.copy(only = open.only.map { if (it.id == updated.id) updated else it })
            },
            onSearchTag = { tag ->
                viewer = null // the grid is about to change out from under it
                query = tag
                asked = tag
            },
            onDelete = { m ->
                // Close first: the viewer indexes into the list about to lose an entry.
                viewer = null
                confirmDelete = m
            },
            onNearEnd = { if (open.only == null) loadMore() },
            onAddToCollection = { m -> collecting = listOf(m.id) },
        )
        collecting?.let { ids -> AddToCollectionSheet(repo, ids, onDismiss = { collecting = null }) }
        return
    }

    // The places that are screens of their own: the remote sources, and the game sites
    // over Games. Back from either is back to the library.
    if (scope == SCOPE_BROWSE) {
        BackHandler { go(SCOPE_HOME) }
        BrowseScreen(repo = repo, onBack = { go(SCOPE_HOME) }, topLevel = false)
        return
    }
    if (state.findGames) {
        BackHandler { state.findGames = false }
        GameBrowseScreen(
            repo = repo,
            onBack = { state.findGames = false },
            onOpenMedia = { id -> state.findGames = false; pendingOpen = id },
            topLevel = false,
        )
        return
    }

    // Selection is a mode, and back is how you leave a mode.
    BackHandler(enabled = selecting) { selected = emptySet(); selectMode = false }
    BackHandler(enabled = !selecting && query.isNotEmpty()) { query = ""; asked = "" }
    BackHandler(enabled = !selecting && query.isEmpty() && scope != SCOPE_HOME && state.openCollection == null) { go(SCOPE_HOME) }

    if (confirmBulkDelete) {
        val n = selected.size
        AlertDialog(
            onDismissRequest = { confirmBulkDelete = false },
            title = { Text(if (n == 1) "Delete this?" else "Delete $n items?") },
            text = { Text("They'll be removed from the library and their files deleted. This can't be undone.") },
            confirmButton = {
                TextButton(onClick = { confirmBulkDelete = false; deleteSelection() }) {
                    Text("Delete", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = { TextButton(onClick = { confirmBulkDelete = false }) { Text("Cancel") } },
        )
    }

    confirmDelete?.let { target ->
        AlertDialog(
            onDismissRequest = { confirmDelete = null },
            title = { Text("Delete this?") },
            text = {
                Text("“${target.title.ifEmpty { target.kind }}” will be removed from the library and its file deleted. This can't be undone.")
            },
            confirmButton = {
                TextButton(onClick = { delete(target); confirmDelete = null }) {
                    Text("Delete", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = { TextButton(onClick = { confirmDelete = null }) { Text("Cancel") } },
        )
    }

    confirmExport?.let { target ->
        AlertDialog(
            onDismissRequest = { confirmExport = null },
            title = { Text("Save to this device?") },
            text = {
                Text(
                    "This exports an unencrypted copy outside OppaiLib. Other apps, " +
                        "device backups, and anyone with access to your files may be able to read it.",
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    confirmExport = null
                    if (DownloadQueue.enqueue(target)) {
                        DownloadWorker.start(context)
                        onOpenDownloads()
                    } else {
                        Toast.makeText(context, "Already in Downloads", Toast.LENGTH_SHORT).show()
                    }
                }) { Text("Download") }
            },
            dismissButton = { TextButton(onClick = { confirmExport = null }) { Text("Cancel") } },
        )
    }

    collecting?.let { ids ->
        AddToCollectionSheet(repo, ids, onDismiss = { collecting = null }, onAdded = {
            selected = emptySet(); selectMode = false; state.collectionsStale++
        })
    }

    holdMedia?.let { target ->
        HoldSheet(
            repo = repo,
            target = target,
            onDismiss = { holdMedia = null },
            onExport = { holdMedia = null; confirmExport = target },
            onShareToChat = { holdMedia = null; onShareToChat(target) },
            onCollect = { holdMedia = null; collecting = listOf(target.id) },
            onSelect = { holdMedia = null; selectMode = true; selected = selected + target.id },
            onDelete = { holdMedia = null; confirmDelete = target },
        )
    }

    // Adding is one button with two answers rather than two unlabelled buttons side by
    // side: a link and an arrow, guess which is which.
    if (showAdd) {
        ModalBottomSheet(onDismissRequest = { showAdd = false }) {
            Column(Modifier.padding(horizontal = 12.dp).padding(bottom = 16.dp)) {
                Text("Add to the library", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(12.dp))
                LitRow(Icons.Filled.Upload, "Upload from this phone", false, { showAdd = false; uploadLauncher.launch(arrayOf("*/*")) },
                    note = "In the background")
                LitRow(Icons.Filled.Link, "Import from a link", false, { showAdd = false; showScrape = true }, note = "A page, a post, a gallery")
                if (uploadItems.isNotEmpty()) {
                    LitRow(Icons.Filled.CloudUpload, "Uploads", false, { showAdd = false; showUploads = true },
                        note = uploadItems.count { it.live }.takeIf { it > 0 }?.let { "$it going" })
                }
            }
        }
    }

    if (showScrape) {
        ScrapeDialog(repo = repo, onDismiss = { showScrape = false }, onImported = { showScrape = false; state.stale = true })
    }

    val focus = remember { FocusRequester() }
    // A search from Overview or Collections searches everything, and says so.
    val title = if (asked.isNotEmpty() && state.kind.isEmpty() && scope != SCOPE_FAVORITES) "Search" else scopeLabel(scope)
    val countLabel = when {
        state.gridShown && !loading -> "%,d".format(total)
        scope == SCOPE_HOME -> state.home?.stats?.total?.let { "%,d".format(it) }
        else -> null
    }

    Scaffold(
        topBar = {
            if (selecting) {
                SelectionBar(
                    count = selected.size,
                    // Everything selected already favorited → the heart takes it away.
                    allFavorite = selected.isNotEmpty() && items.filter { it.id in selected }.all { it.favorite },
                    onClear = { selected = emptySet(); selectMode = false },
                    onSelectAll = { selected = items.map { it.id }.toSet() },
                    onFavorite = { favoriteSelection(it) },
                    onCollect = { if (selected.isNotEmpty()) collecting = selected.toList() },
                    onDelete = { if (selected.isNotEmpty()) confirmBulkDelete = true },
                )
            } else {
                Column {
                    PageTop(title = title, count = countLabel) {
                        if (uploadItems.isNotEmpty()) {
                            val live = uploadItems.count { it.live }
                            BadgedBox(badge = { if (live > 0) Badge { Text("$live") } }) {
                                ToolButton(Icons.Filled.CloudUpload, "Uploads", { showUploads = true }, bare = true)
                            }
                        }
                        ToolButton(
                            if (Appearance.safe) Icons.Filled.VisibilityOff else Icons.Filled.Visibility,
                            "Safe view",
                            { Appearance.safe = !Appearance.safe; repo.prefs.safeView = Appearance.safe },
                            on = Appearance.safe,
                            bare = !Appearance.safe,
                        )
                        if (state.gridShown) {
                            ToolButton(Icons.Filled.CheckBoxOutlineBlank, "Select", { selectMode = true })
                            Box {
                                ToolButton(Icons.Filled.Tune, "Filters", { filtersMenu = true },
                                    on = state.minRating > 0 || state.favoritesOnly || sort != SortMode.NEWEST)
                                FiltersMenu(
                                    expanded = filtersMenu,
                                    onDismiss = { filtersMenu = false },
                                    sort = sort,
                                    onSort = { sort = it },
                                    minRating = state.minRating,
                                    onMinRating = { state.minRating = it },
                                    favoritesOnly = state.favoritesOnly,
                                    onFavoritesOnly = if (state.kind.isNotEmpty()) ({ state.favoritesOnly = it }) else null,
                                )
                            }
                            ToolButton(
                                when (state.density) { "s" -> Icons.Filled.Apps; "l" -> Icons.Filled.PhotoSizeSelectLarge; else -> Icons.Filled.GridView },
                                "Tile size",
                                {
                                    state.density = when (state.density) { "s" -> "m"; "m" -> "l"; else -> "s" }
                                    repo.prefs.density = state.density
                                },
                            )
                        }
                    }
                    SearchBox(
                        value = query,
                        onValueChange = { query = it },
                        placeholder = if (state.kind.isNotEmpty()) "Search ${scopeLabel(scope).lowercase()}…" else "Search titles, tags, notes…",
                        focusRequester = focus,
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                    )
                    Spacer(Modifier.height(10.dp))
                    InkChipRow {
                        InkChip("Overview", scope == SCOPE_HOME, { go(SCOPE_HOME) })
                        KINDS.forEach { k ->
                            InkChip(k.label, scope == k.kind, { go(k.kind) }, count = state.home?.stats?.byKind?.get(k.kind)?.takeIf { it > 0 }?.let { compactCount(it) })
                        }
                        InkChip("Favorites", scope == SCOPE_FAVORITES, { go(SCOPE_FAVORITES) }, icon = Icons.Filled.Favorite)
                        InkChip("Collections", scope == SCOPE_COLLECTIONS, { go(SCOPE_COLLECTIONS) })
                        InkChip("Browse", false, { go(SCOPE_BROWSE) })
                    }
                    Spacer(Modifier.height(8.dp))
                    if (scope == "game" && query.isEmpty()) {
                        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 2.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text("Your games, and the sites to find more on", style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(1f))
                            ToolButton(Icons.Filled.TravelExplore, "Find games", { state.findGames = true }, label = "Find games")
                        }
                    }
                }
            }
        },
    ) { padding ->
        Column(Modifier.padding(padding).fillMaxSize()) {
            // A new question with the old answer still on screen: say it's coming rather
            // than leave the previous filter's tiles looking like the result.
            if (state.gridShown && loading && items.isNotEmpty()) LinearProgressIndicator(Modifier.fillMaxWidth())
            when {
                state.gridShown -> PullToRefreshBox(
                    isRefreshing = refreshing,
                    onRefresh = { reload(pull = true) },
                    modifier = Modifier.fillMaxSize(),
                ) {
                    when {
                        loading && items.isEmpty() -> Box(Modifier.fillMaxSize(), Alignment.Center) { CircularProgressIndicator() }
                        error != null && items.isEmpty() -> Box(Modifier.fillMaxSize(), Alignment.Center) {
                            EmptyNote(error ?: "", action = { TextButton(onClick = { reload() }) { Text("Try again") } })
                        }
                        items.isEmpty() -> Box(Modifier.fillMaxSize(), Alignment.Center) {
                            EmptyNote(
                                when {
                                    asked.isNotEmpty() -> "No matches for “$asked”."
                                    state.favoriteFilter -> "No favorites here yet. Tap the heart on anything worth keeping."
                                    state.minRating > 0 -> "Nothing here is rated ${state.minRating} stars or more."
                                    else -> "Nothing here yet. Add something with the button below."
                                },
                                icon = iconFor(state.kind),
                            )
                        }
                        else -> {
                            val aspect = kindMeta(state.kind)?.aspect ?: (4f / 5f)
                            val min = when (state.density) {
                                "s" -> 100.dp
                                "l" -> 210.dp
                                else -> 148.dp
                            } * (if (state.kind == "video") 1.4f else 1f)
                            LazyVerticalGrid(
                                state = grid,
                                columns = GridCells.Adaptive(minSize = min),
                                modifier = Modifier.fillMaxSize(),
                                contentPadding = PaddingValues(start = 12.dp, end = 12.dp, top = 4.dp, bottom = 24.dp),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                itemsIndexed(items, key = { _, m -> m.id }) { index, m ->
                                    MediaTile(
                                        repo = repo,
                                        m = m,
                                        aspect = aspect,
                                        selected = m.id in selected,
                                        selecting = selecting,
                                        // In selection mode a tap picks rather than opens.
                                        onClick = {
                                            if (!selecting) viewer = ViewerOpen(index)
                                            else selected = if (m.id in selected) selected - m.id else selected + m.id
                                        },
                                        // Hold opens the phone's counterpart to the web's context menu.
                                        onLongClick = { holdMedia = m },
                                    )
                                }
                                if (loadingMore) {
                                    item(span = { GridItemSpan(maxLineSpan) }) {
                                        Box(Modifier.fillMaxWidth().padding(16.dp), Alignment.Center) {
                                            CircularProgressIndicator(Modifier.size(24.dp), strokeWidth = 2.dp)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                scope == SCOPE_COLLECTIONS -> CollectionsPane(
                    repo = repo,
                    state = state,
                    onOpenItem = { m, list -> openList(m, list) },
                    onHold = { holdMedia = it },
                )
                else -> PullToRefreshBox(
                    isRefreshing = refreshing,
                    onRefresh = { reloadHome(pull = true) },
                    modifier = Modifier.fillMaxSize(),
                ) {
                    val home = state.home
                    if (home == null) Box(Modifier.fillMaxSize(), Alignment.Center) { if (homeLoading) CircularProgressIndicator() }
                    else LibraryHome(
                        repo = repo,
                        home = home,
                        onOpen = { m, list -> openList(m, list) },
                        onHold = { holdMedia = it },
                        onMoment = { mark -> openById(mark.mediaId, at = mark.position.coerceAtLeast(0.01)) },
                        onGo = { go(it) },
                        onChat = onChat,
                        onCreate = onCreate,
                    )
                }
            }
        }
    }
}

/** "1.2k", as the sidebar counts each kind. */
internal fun compactCount(n: Long): String = when {
    n >= 1_000_000 -> "%.1fM".format(n / 1_000_000.0).replace(".0M", "M")
    n >= 10_000 -> "${n / 1000}k"
    n >= 1000 -> "%.1fk".format(n / 1000.0).replace(".0k", "k")
    else -> n.toString()
}

/**
 * The Filters menu: the order, a minimum rating, and — on a kind — favourites only. It
 * offers what the screen cannot already say; Favorites is a place of its own.
 */
@Composable
private fun FiltersMenu(
    expanded: Boolean,
    onDismiss: () -> Unit,
    sort: SortMode,
    onSort: (SortMode) -> Unit,
    minRating: Int,
    onMinRating: (Int) -> Unit,
    favoritesOnly: Boolean,
    onFavoritesOnly: ((Boolean) -> Unit)?,
) {
    DropdownMenu(expanded = expanded, onDismissRequest = onDismiss) {
        Kicker("Order", Modifier.padding(horizontal = 16.dp, vertical = 6.dp))
        SortMode.entries.forEach { mode ->
            DropdownMenuItem(
                text = { Text(mode.label) },
                leadingIcon = { if (mode == sort) Icon(Icons.Filled.Check, contentDescription = null) else Spacer(Modifier.size(24.dp)) },
                onClick = { onSort(mode); onDismiss() },
            )
        }
        HorizontalDivider()
        Kicker("Rated at least", Modifier.padding(horizontal = 16.dp, vertical = 6.dp))
        (0..5).forEach { n ->
            DropdownMenuItem(
                text = { Text(if (n == 0) "Any rating" else "★".repeat(n) + "☆".repeat(5 - n)) },
                leadingIcon = { if (n == minRating) Icon(Icons.Filled.Check, contentDescription = null) else Spacer(Modifier.size(24.dp)) },
                onClick = { onMinRating(n); onDismiss() },
            )
        }
        if (onFavoritesOnly != null) {
            HorizontalDivider()
            DropdownMenuItem(
                text = { Text("Favourites only") },
                leadingIcon = { Icon(Icons.Filled.Favorite, contentDescription = null, tint = if (favoritesOnly) MaterialTheme.colorScheme.tertiary else MaterialTheme.colorScheme.onSurfaceVariant) },
                trailingIcon = { if (favoritesOnly) Icon(Icons.Filled.Check, contentDescription = null) },
                onClick = { onFavoritesOnly(!favoritesOnly); onDismiss() },
            )
        }
    }
}

/** What holding a tile offers: the phone's counterpart to the web's context menu. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun HoldSheet(
    repo: Repository,
    target: Media,
    onDismiss: () -> Unit,
    onExport: () -> Unit,
    onShareToChat: () -> Unit,
    onCollect: () -> Unit,
    onSelect: () -> Unit,
    onDelete: () -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(Modifier.padding(horizontal = 12.dp).padding(bottom = 16.dp)) {
            Text(
                target.title.ifBlank { "Library item ${target.id}" },
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            )
            LitRow(Icons.AutoMirrored.Filled.PlaylistAdd, "Add to collection…", false, onCollect)
            if (canShareWithChat(target)) {
                LitRow(Icons.AutoMirrored.Filled.Send, "Show Libby now", false, onShareToChat)
                LitRow(Icons.Filled.Image, "Save for Libby to send later", false, {
                    onDismiss()
                    scope.launch {
                        Toast.makeText(context, "Saving image for Libby…", Toast.LENGTH_SHORT).show()
                        runCatching { repo.api.uploadChatImage(mediaChatUpload(repo, target, "libby")) }
                            .onSuccess { Toast.makeText(context, "Saved for Libby to send later", Toast.LENGTH_LONG).show() }
                            .onFailure { Toast.makeText(context, it.message ?: "Couldn't save for Libby", Toast.LENGTH_LONG).show() }
                    }
                })
            }
            // Labels the item itself as a picture of her, so it stays one of yours and
            // she can hand it back without a second copy existing.
            if (target.kind == "image" || target.kind == "gif") {
                LitRow(Icons.Filled.Face, "This is a picture of Libby", false, {
                    onDismiss()
                    scope.launch {
                        runCatching { repo.api.markLibbyIdentity(LibbyIdentityMark(target.id, isLibby = true)) }
                            .onSuccess { Toast.makeText(context, "Libby knows this one is her", Toast.LENGTH_LONG).show() }
                            .onFailure { Toast.makeText(context, it.message ?: "Couldn't tag that as her", Toast.LENGTH_LONG).show() }
                    }
                })
            }
            LitRow(Icons.Filled.CheckCircle, "Select", false, onSelect)
            LitRow(Icons.Filled.ContentCopy, "Copy title", false, {
                onDismiss()
                (context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager)
                    .setPrimaryClip(ClipData.newPlainText("title", target.title))
            })
            LitRow(Icons.Filled.Download, "Save to device", false, onExport, note = "Unencrypted copy")
            LitRow(Icons.Filled.Delete, "Delete", false, onDelete, danger = true)
        }
    }
}

/** The selection-mode bar. Replaces the library's own while anything is picked. */
@Composable
private fun SelectionBar(
    count: Int,
    allFavorite: Boolean,
    onClear: () -> Unit,
    onSelectAll: () -> Unit,
    onFavorite: (Boolean) -> Unit,
    onCollect: () -> Unit,
    onDelete: () -> Unit,
) {
    PageTop(
        title = if (count == 0) "Select" else "$count selected",
        navigation = { IconButton(onClick = onClear) { Icon(Icons.Filled.Close, contentDescription = "Leave selection") } },
    ) {
        ToolButton(Icons.Filled.SelectAll, "Select everything loaded", onSelectAll, bare = true)
        ToolButton(
            if (allFavorite) Icons.Filled.HeartBroken else Icons.Filled.Favorite,
            if (allFavorite) "Remove from favorites" else "Add to favorites",
            { onFavorite(!allFavorite) },
            bare = true,
            enabled = count > 0,
        )
        ToolButton(Icons.AutoMirrored.Filled.PlaylistAdd, "Add to collection", onCollect, bare = true, enabled = count > 0)
        ToolButton(Icons.Filled.Delete, "Delete the selection", onDelete, bare = true, enabled = count > 0, tint = MaterialTheme.colorScheme.error)
    }
}
