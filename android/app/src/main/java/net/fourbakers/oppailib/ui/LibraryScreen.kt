package net.fourbakers.oppailib.ui

import android.widget.Toast
import android.content.Intent
import androidx.activity.compose.BackHandler
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.LazyGridState
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.automirrored.filled.Sort
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Android
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.CloudUpload
import androidx.compose.material.icons.filled.Collections
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Face
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Gif
import androidx.compose.material.icons.filled.HeartBroken
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Movie
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.SelectAll
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.SportsEsports
import androidx.compose.material.icons.filled.Upload
import androidx.compose.material.icons.outlined.Circle
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.material3.TopAppBar
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import net.fourbakers.oppailib.data.BulkRequest
import net.fourbakers.oppailib.data.LibbyIdentityMark
import net.fourbakers.oppailib.data.LibbyVoice
import net.fourbakers.oppailib.data.Media
import net.fourbakers.oppailib.data.MediaPatch
import net.fourbakers.oppailib.data.Prefs
import net.fourbakers.oppailib.data.Repository
import net.fourbakers.oppailib.data.SortMode
import net.fourbakers.oppailib.data.serverMessage
import net.fourbakers.oppailib.work.DownloadQueue
import net.fourbakers.oppailib.work.DownloadWorker
import net.fourbakers.oppailib.work.UploadQueue
import net.fourbakers.oppailib.work.UploadWorker

/** The kind filters along the top of the grid. The empty kind is everything. */
private data class Section(val kind: String, val label: String, val icon: ImageVector)

private val SECTIONS = listOf(
    Section("", "All", Icons.Filled.Collections),
    Section("video", "Videos", Icons.Filled.Movie),
    Section("gif", "GIFs", Icons.Filled.Gif),
    Section("image", "Images", Icons.Filled.Image),
    Section("comic", "Comics", Icons.AutoMirrored.Filled.MenuBook),
    Section("game", "Games", Icons.Filled.SportsEsports),
)

private fun iconFor(kind: String): ImageVector =
    SECTIONS.firstOrNull { it.kind == kind }?.icon ?: Icons.Filled.Collections

/**
 * A page of the library at a time. Big enough that a fling rarely outruns it, small
 * enough that the first screen arrives at once even on a phone on mobile data.
 */
private const val PAGE = 90

/** How long typing has to pause before the search goes to the server. */
private const val SEARCH_SETTLE_MS = 300L

/**
 * The viewer, open on [start]. [only] is set when it was opened on one item from
 * elsewhere — a link in chat, a game's page — that isn't in the loaded page, so the
 * feed is just that item rather than an index into a list that doesn't hold it.
 */
private data class ViewerOpen(val start: Int, val only: List<Media>? = null)

/**
 * What the library tab keeps while another tab is on screen: the filters, the pages
 * loaded so far, and where the grid was scrolled to. The shell holds it, because the
 * tab itself leaves composition when you switch away — and coming back from Browse to
 * a grid reloaded from the top would make the bottom bar a step backwards from the
 * drawer it replaced, under which the grid simply stayed put.
 */
@Stable
class LibraryState(prefs: Prefs) {
    var kind by mutableStateOf(prefs.lastKind)
    var favoritesOnly by mutableStateOf(prefs.lastFavoritesOnly)
    var sort by mutableStateOf(prefs.sortMode)
    var query by mutableStateOf("")
    // What was actually asked of the server: the search box once typing settles.
    var asked by mutableStateOf("")
    var searching by mutableStateOf(false)
    var items by mutableStateOf<List<Media>>(emptyList())
    var total by mutableIntStateOf(0)
    val grid = LazyGridState()
    // The filters [items] answer, so returning to the tab knows they are still current.
    internal var loadedFor: List<Any>? = null
    // Something landed in the library while the tab was away (or while it was up).
    var stale by mutableStateOf(false)
    // The item the viewer was on when the app was last closed, opened once on launch.
    internal var resumeViewer: Long? = prefs.lastViewerMedia.takeIf { it != 0L }

    internal val filters: List<Any> get() = listOf(kind, favoritesOnly, sort, asked)
}

/**
 * The library tab: a paged grid of the collection, filtered by the chips under the bar.
 *
 * The phone used to download the entire library before drawing a tile, and then search,
 * sort and filter it in memory — every open of the app paid for the whole collection,
 * and the grid sat on a spinner while it did. The server has answered paged queries
 * (kind, favourites, search, order, with a total) since the web client stopped doing
 * the same thing, so the grid now asks for a page, draws it, and asks for the next as
 * you scroll. Search has to be the server's anyway: titles are encrypted at rest, and
 * only the process holding the key can match them.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LibraryScreen(
    repo: Repository,
    state: LibraryState,
    onLogout: () -> Unit,
    onOpenSettings: () -> Unit,
    onOpenDownloads: () -> Unit,
    onShareToChat: (Media) -> Unit,
    openRequest: Long?,
    onOpenRequestTaken: () -> Unit,
    onViewerClosed: () -> Unit,
) {
    // The filters are seeded from where the app was last used (see LibraryState):
    // Android kills a backgrounded app whenever it likes, and coming back to the
    // unfiltered grid every time is how that killing becomes the user's problem.
    var kind by state::kind
    var favoritesOnly by state::favoritesOnly
    var sort by state::sort
    var query by state::query
    var asked by state::asked
    var searching by state::searching
    var items by state::items
    var total by state::total

    // Loading until the grid holds an answer to the filters as they stand — not merely
    // until it holds tiles, or an empty filter would spin for ever on every return.
    var loading by remember { mutableStateOf(state.loadedFor != state.filters) }
    var loadingMore by remember { mutableStateOf(false) }
    var refreshing by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    // Bumped by every fresh query, so a page that lands after the filters changed is
    // recognised as an answer to a question nobody is asking any more and dropped.
    var generation by remember { mutableIntStateOf(0) }

    var viewer by remember { mutableStateOf<ViewerOpen?>(null) }
    var showScrape by remember { mutableStateOf(false) }
    var showAdd by remember { mutableStateOf(false) }
    var showUploads by remember { mutableStateOf(false) }
    var sortMenu by remember { mutableStateOf(false) }
    var overflow by remember { mutableStateOf(false) }
    var aiTagger by remember { mutableStateOf("") }
    var holdMedia by remember { mutableStateOf<Media?>(null) }
    var confirmExport by remember { mutableStateOf<Media?>(null) }
    var confirmDelete by remember { mutableStateOf<Media?>(null) }
    // Non-empty means the grid is in selection mode: tiles toggle instead of opening.
    var selected by remember { mutableStateOf(emptySet<Long>()) }
    var confirmBulkDelete by remember { mutableStateOf(false) }
    // An item to open once the first page is in: the one the viewer was on when the
    // app was last closed, or one another tab asked for.
    var pendingOpen by remember { mutableStateOf(state.resumeViewer.also { state.resumeViewer = null }) }

    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val grid = state.grid

    suspend fun fetch(offset: Int) = repo.api.listMedia(
        kind = kind.ifEmpty { null },
        limit = PAGE,
        offset = offset,
        query = asked.ifBlank { null },
        favorite = if (favoritesOnly) 1 else null,
        sort = sort.id,
    )

    /** Starts the grid over from the first page of the current query. */
    fun reload(pull: Boolean = false) {
        val ask = ++generation
        val filters = state.filters
        if (pull) refreshing = true else loading = true
        error = null
        scope.launch {
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

    /** Appends the next page, if there is one and nothing is already fetching. */
    fun loadMore() {
        if (loading || loadingMore || items.size >= total) return
        val ask = generation
        loadingMore = true
        scope.launch {
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

    fun openById(id: Long) {
        val at = items.indexOfFirst { it.id == id }
        if (at >= 0) { viewer = ViewerOpen(at); return }
        scope.launch {
            runCatching { repo.api.getMedia(id) }
                .onSuccess { viewer = ViewerOpen(0, listOf(it)) }
                .onFailure { repo.report(it.serverMessage("That item isn't in the library any more.")) }
        }
    }

    fun delete(m: Media) {
        scope.launch {
            runCatching { repo.api.deleteMedia(m.id) }
                .onSuccess {
                    items = items.filterNot { it.id == m.id }
                    total = (total - 1).coerceAtLeast(0)
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
        scope.launch {
            runCatching { repo.api.bulkMedia(BulkRequest("update", ids, MediaPatch(favorite = favorite))) }
                .onSuccess { result ->
                    val applied = result.ok.toSet()
                    items = items.map { if (it.id in applied) it.copy(favorite = favorite) else it }
                }
            selected = emptySet()
        }
    }

    fun deleteSelection() {
        val ids = selected.toList()
        scope.launch {
            runCatching { repo.api.bulkMedia(BulkRequest("delete", ids)) }
                .onSuccess { result ->
                    val gone = result.ok.toSet()
                    items = items.filterNot { it.id in gone }
                    total = (total - gone.size).coerceAtLeast(0)
                    if (gone.isNotEmpty()) {
                        LibbyVoice.react(LibbyVoice.Event.LIBRARY_DELETE, count = gone.size)
                            .let { repo.report(it.message, it.emotion) }
                    }
                }
            selected = emptySet()
        }
    }

    // The upload queue, read straight from the worker's own state so the badge and the
    // sheet cannot drift from what is actually being sent.
    val uploadItems by UploadQueue.items.collectAsState()
    val activeDownloads = DownloadQueue.items.collectAsState().value.count { it.live }

    LaunchedEffect(query) {
        delay(SEARCH_SETTLE_MS)
        asked = query.trim()
    }
    LaunchedEffect(kind, favoritesOnly, sort, asked) {
        repo.prefs.lastKind = kind
        repo.prefs.lastFavoritesOnly = favoritesOnly
        // Back on the tab with the same filters: the grid is as it was left, scroll and
        // all. Only a change of question goes back to the server.
        if (state.loadedFor != state.filters) reload()
    }
    LaunchedEffect(state.stale) {
        if (state.stale) { state.stale = false; reload(pull = true) }
    }
    LaunchedEffect(Unit) {
        runCatching { repo.api.health() }.getOrNull()?.let { aiTagger = if (it.aiEnabled) it.aiTagger else "off" }
    }
    // Scrolling near the end of what's loaded asks for the next page.
    val nearEnd by remember {
        derivedStateOf {
            val last = grid.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0
            last >= items.size - 30
        }
    }
    LaunchedEffect(nearEnd, items.size, total) { if (nearEnd) loadMore() }

    // An open asked for — at launch, or by another tab — lands once the first page is in,
    // so an item that's on it opens in place with its neighbours to swipe to.
    LaunchedEffect(openRequest) {
        openRequest?.let {
            pendingOpen = it
            selected = emptySet()
            onOpenRequestTaken()
        }
    }
    LaunchedEffect(pendingOpen, loading) {
        val id = pendingOpen ?: return@LaunchedEffect
        if (loading) return@LaunchedEffect
        pendingOpen = null
        openById(id)
    }
    // By id, not by index: an index into a grid rebuilt from the server points at the
    // wrong thing by the time the app is reopened.
    LaunchedEffect(viewer) {
        repo.prefs.lastViewerMedia = viewer?.let { v -> (v.only ?: items).getOrNull(v.start)?.id } ?: 0L
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

    // The viewer owns the whole screen (immersive), so it replaces the grid rather than
    // layering over it, and pages through exactly what the grid holds.
    viewer?.let { open ->
        val feed = open.only ?: items
        ViewerScreen(
            repo = repo,
            items = feed,
            startIndex = open.start,
            onClose = { viewer = null; onViewerClosed() },
            onChanged = { updated ->
                items = items.map { if (it.id == updated.id) updated else it }
                if (open.only != null) viewer = open.copy(only = open.only.map { if (it.id == updated.id) updated else it })
            },
            onSearchTag = { tag ->
                viewer = null // the grid is about to change out from under it
                query = tag
                asked = tag
                searching = true
            },
            onDelete = { m ->
                // Close first: the viewer indexes into the list about to lose an entry.
                viewer = null
                confirmDelete = m
            },
            onNearEnd = { if (open.only == null) loadMore() },
        )
        return
    }

    // Selection is a mode, and back is how you leave a mode.
    BackHandler(enabled = selected.isNotEmpty()) { selected = emptySet() }
    BackHandler(enabled = selected.isEmpty() && searching) { query = ""; searching = false }

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

    holdMedia?.let { target ->
        ModalBottomSheet(onDismissRequest = { holdMedia = null }) {
            Text(
                target.title.ifBlank { "Library item ${target.id}" },
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp),
            )
            ListItem(
                headlineContent = { Text("Save to device") },
                supportingContent = { Text("Exports an unencrypted copy") },
                leadingContent = { Icon(Icons.Filled.Download, contentDescription = null) },
                modifier = Modifier.clickable { holdMedia = null; confirmExport = target },
            )
            ListItem(
                headlineContent = { Text("Share with Libby in Chat") },
                supportingContent = { Text("Attach it now so you can add a message and send") },
                leadingContent = { Icon(Icons.AutoMirrored.Filled.Send, contentDescription = null) },
                modifier = Modifier.clickable(enabled = canShareWithChat(target)) {
                    holdMedia = null
                    onShareToChat(target)
                },
            )
            ListItem(
                headlineContent = { Text("Save for Libby to send later") },
                supportingContent = { Text("Adds the image to Libby's encrypted chat gallery") },
                leadingContent = { Icon(Icons.Filled.Image, contentDescription = null) },
                modifier = Modifier.clickable(enabled = canShareWithChat(target)) {
                    holdMedia = null
                    scope.launch {
                        Toast.makeText(context, "Saving image for Libby…", Toast.LENGTH_SHORT).show()
                        runCatching { repo.api.uploadChatImage(mediaChatUpload(repo, target, "libby")) }
                            .onSuccess { Toast.makeText(context, "Saved for Libby to send later", Toast.LENGTH_LONG).show() }
                            .onFailure { Toast.makeText(context, it.message ?: "Couldn't save for Libby", Toast.LENGTH_LONG).show() }
                    }
                },
            )
            // Labels the item itself as a picture of her, so it stays one of yours and
            // she can hand it back without a second copy existing. Recognition does this
            // on its own for imports it is sure about; this is how you say so about the
            // rest.
            if (target.kind == "image" || target.kind == "gif") ListItem(
                headlineContent = { Text("This is a picture of Libby") },
                supportingContent = { Text("Tags it as her, so she can send it to you in chat") },
                leadingContent = { Icon(Icons.Filled.Face, contentDescription = null) },
                modifier = Modifier.clickable {
                    holdMedia = null
                    scope.launch {
                        runCatching { repo.api.markLibbyIdentity(LibbyIdentityMark(target.id, isLibby = true)) }
                            .onSuccess { Toast.makeText(context, "Libby knows this one is her", Toast.LENGTH_LONG).show() }
                            .onFailure { Toast.makeText(context, it.message ?: "Couldn't tag that as her", Toast.LENGTH_LONG).show() }
                    }
                },
            )
            ListItem(
                headlineContent = { Text("Select item") },
                supportingContent = { Text("Start multi-select actions") },
                leadingContent = { Icon(Icons.Filled.CheckCircle, contentDescription = null) },
                modifier = Modifier.clickable { holdMedia = null; selected = selected + target.id },
            )
            Spacer(Modifier.size(16.dp))
        }
    }

    // Adding is one button with two answers rather than two unlabelled buttons side by
    // side, which is what the grid had: a link and an arrow, guess which is which.
    if (showAdd) {
        ModalBottomSheet(onDismissRequest = { showAdd = false }) {
            Text(
                "Add to the library",
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp),
            )
            ListItem(
                headlineContent = { Text("Upload from this phone") },
                supportingContent = { Text("Videos, pictures, comics — sent in the background") },
                leadingContent = { Icon(Icons.Filled.Upload, contentDescription = null) },
                modifier = Modifier.clickable { showAdd = false; uploadLauncher.launch(arrayOf("*/*")) },
            )
            ListItem(
                headlineContent = { Text("Import from a link") },
                supportingContent = { Text("A page, a post, or a gallery") },
                leadingContent = { Icon(Icons.Filled.Link, contentDescription = null) },
                modifier = Modifier.clickable { showAdd = false; showScrape = true },
            )
            Spacer(Modifier.size(16.dp))
        }
    }

    if (showScrape) {
        ScrapeDialog(repo = repo, onDismiss = { showScrape = false }, onImported = { showScrape = false; reload(pull = true) })
    }

    val focus = remember { FocusRequester() }
    LaunchedEffect(searching) { if (searching) runCatching { focus.requestFocus() } }

    Scaffold(
        topBar = {
            if (selected.isNotEmpty()) {
                SelectionBar(
                    count = selected.size,
                    // Everything selected already favorited → the heart takes it away.
                    allFavorite = items.filter { it.id in selected }.all { it.favorite },
                    onClear = { selected = emptySet() },
                    onSelectAll = { selected = items.map { it.id }.toSet() },
                    onFavorite = { favoriteSelection(it) },
                    onDelete = { confirmBulkDelete = true },
                )
            } else {
                TopAppBar(
                    title = {
                        if (searching) {
                            TextField(
                                value = query,
                                onValueChange = { query = it },
                                placeholder = { Text("Search titles, notes and tags") },
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                                colors = TextFieldDefaults.colors(
                                    focusedContainerColor = Color.Transparent,
                                    unfocusedContainerColor = Color.Transparent,
                                    focusedIndicatorColor = Color.Transparent,
                                    unfocusedIndicatorColor = Color.Transparent,
                                ),
                                modifier = Modifier.fillMaxWidth().focusRequester(focus),
                            )
                        } else {
                            Text("Library")
                        }
                    },
                    actions = {
                        // The way back into the upload manager once its sheet is closed.
                        // Shown only while there is something in it.
                        if (uploadItems.isNotEmpty()) {
                            val live = uploadItems.count { it.live }
                            IconButton(onClick = { showUploads = true }) {
                                BadgedBox(badge = { if (live > 0) Badge { Text("$live") } }) {
                                    Icon(Icons.Filled.CloudUpload, contentDescription = "Uploads")
                                }
                            }
                        }
                        if (searching) {
                            IconButton(onClick = { query = ""; searching = false }) {
                                Icon(Icons.Filled.Clear, contentDescription = "Close search")
                            }
                        } else {
                            IconButton(onClick = { searching = true }) {
                                Icon(Icons.Filled.Search, contentDescription = "Search")
                            }
                        }
                        Box {
                            IconButton(onClick = { sortMenu = true }) {
                                Icon(Icons.AutoMirrored.Filled.Sort, contentDescription = "Sort")
                            }
                            DropdownMenu(expanded = sortMenu, onDismissRequest = { sortMenu = false }) {
                                SortMode.entries.forEach { mode ->
                                    DropdownMenuItem(
                                        text = { Text(mode.label) },
                                        leadingIcon = { if (mode == sort) Icon(Icons.Filled.Check, contentDescription = null) },
                                        onClick = {
                                            sort = mode
                                            repo.prefs.sortMode = mode
                                            sortMenu = false
                                        },
                                    )
                                }
                            }
                        }
                        Box {
                            IconButton(onClick = { overflow = true }) {
                                BadgedBox(badge = { if (activeDownloads > 0) Badge { Text("$activeDownloads") } }) {
                                    Icon(Icons.Filled.MoreVert, contentDescription = "More")
                                }
                            }
                            DropdownMenu(expanded = overflow, onDismissRequest = { overflow = false }) {
                                DropdownMenuItem(
                                    text = { Text(if (activeDownloads > 0) "Downloads ($activeDownloads)" else "Downloads") },
                                    leadingIcon = { Icon(Icons.Filled.Download, contentDescription = null) },
                                    onClick = { overflow = false; onOpenDownloads() },
                                )
                                DropdownMenuItem(
                                    text = { Text("Settings") },
                                    leadingIcon = { Icon(Icons.Filled.Settings, contentDescription = null) },
                                    onClick = { overflow = false; onOpenSettings() },
                                )
                                DropdownMenuItem(
                                    text = { Text("Sign out") },
                                    leadingIcon = { Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = null) },
                                    onClick = { overflow = false; onLogout() },
                                )
                                HorizontalDivider()
                                DropdownMenuItem(
                                    text = {
                                        Text(
                                            "AI tagger: ${aiTagger.ifEmpty { "…" }}",
                                            style = MaterialTheme.typography.labelSmall,
                                        )
                                    },
                                    enabled = false,
                                    onClick = {},
                                )
                            }
                        }
                    },
                )
            }
        },
        floatingActionButton = {
            if (selected.isEmpty()) {
                // Labelled at the top of the grid, a plain round button once you scroll:
                // the label is for knowing what it does, not for reading every time.
                val atTop by remember { derivedStateOf { grid.firstVisibleItemIndex == 0 } }
                ExtendedFloatingActionButton(
                    onClick = { showAdd = true },
                    expanded = atTop,
                    icon = { Icon(Icons.Filled.Add, contentDescription = null) },
                    text = { Text("Add") },
                )
            }
        },
    ) { padding ->
        Column(Modifier.padding(padding).fillMaxSize()) {
            FilterRow(
                kind = kind,
                favoritesOnly = favoritesOnly,
                onKind = { picked -> if (picked != kind) { kind = picked; selected = emptySet() } },
                onFavorites = { favoritesOnly = !favoritesOnly; selected = emptySet() },
            )
            // A new question with the old answer still on screen: say it's coming rather
            // than leave the previous filter's tiles looking like the result.
            if (loading && items.isNotEmpty()) {
                LinearProgressIndicator(Modifier.fillMaxWidth())
            }
            PullToRefreshBox(
                isRefreshing = refreshing,
                onRefresh = { reload(pull = true) },
                modifier = Modifier.fillMaxSize(),
            ) {
                when {
                    loading && items.isEmpty() -> Box(Modifier.fillMaxSize(), Alignment.Center) { CircularProgressIndicator() }
                    error != null && items.isEmpty() -> Box(Modifier.fillMaxSize(), Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(error ?: "", modifier = Modifier.padding(horizontal = 32.dp))
                            TextButton(onClick = { reload() }) { Text("Try again") }
                        }
                    }
                    items.isEmpty() -> Box(Modifier.fillMaxSize(), Alignment.Center) {
                        Text(
                            when {
                                asked.isNotEmpty() -> "No matches for “$asked”."
                                favoritesOnly -> "No favorites here yet. Tap the heart on anything worth keeping."
                                else -> "Nothing here yet. Add something with the button below."
                            },
                            modifier = Modifier.padding(horizontal = 32.dp),
                        )
                    }
                    else -> LazyVerticalGrid(
                        state = grid,
                        columns = GridCells.Adaptive(minSize = 150.dp),
                        modifier = Modifier.fillMaxSize(),
                        // Room under the last row for the Add button, so it never sits
                        // on the one tile you were reaching for.
                        contentPadding = PaddingValues(start = 8.dp, end = 8.dp, bottom = 88.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        item(span = { GridItemSpan(maxLineSpan) }) {
                            Text(
                                countLine(total, kind, favoritesOnly, asked),
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp),
                            )
                        }
                        itemsIndexed(items, key = { _, m -> m.id }) { index, m ->
                            MediaTile(
                                repo = repo,
                                m = m,
                                selected = m.id in selected,
                                selecting = selected.isNotEmpty(),
                                // In selection mode a tap picks rather than opens.
                                onClick = {
                                    if (selected.isEmpty()) viewer = ViewerOpen(index)
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
    }
}

/**
 * The kind chips and the favorites toggle, one row under the bar. These were the
 * drawer's sections; switching kind is the commonest thing done here, and it deserves
 * better than a trip through a menu. Favorites combines with a kind — favorite videos
 * are a thing worth asking for — rather than replacing it.
 */
@Composable
private fun FilterRow(kind: String, favoritesOnly: Boolean, onKind: (String) -> Unit, onFavorites: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(horizontal = 12.dp, vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        FilterChip(
            selected = favoritesOnly,
            onClick = onFavorites,
            leadingIcon = {
                Icon(
                    Icons.Filled.Favorite, contentDescription = null, modifier = Modifier.size(16.dp),
                    tint = if (favoritesOnly) Color(0xFFE91E63) else MaterialTheme.colorScheme.onSurfaceVariant,
                )
            },
            label = { Text("Favorites") },
        )
        SECTIONS.forEach { section ->
            FilterChip(
                selected = kind == section.kind,
                onClick = { onKind(section.kind) },
                label = { Text(section.label) },
            )
        }
    }
}

/** "312 videos", "4 favorite GIFs", "18 matches for “beach”". */
private fun countLine(total: Int, kind: String, favoritesOnly: Boolean, asked: String): String {
    val noun = when (kind) {
        "video" -> if (total == 1) "video" else "videos"
        "gif" -> if (total == 1) "GIF" else "GIFs"
        "image" -> if (total == 1) "image" else "images"
        "comic" -> if (total == 1) "comic" else "comics"
        "game" -> if (total == 1) "game" else "games"
        else -> if (total == 1) "item" else "items"
    }
    val count = "%,d".format(total)
    return when {
        asked.isNotEmpty() -> "$count ${if (total == 1) "match" else "matches"} for “$asked”"
        favoritesOnly -> "$count favorite $noun"
        else -> "$count $noun"
    }
}

/** The selection-mode app bar. Replaces the library's own while anything is picked. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SelectionBar(
    count: Int,
    allFavorite: Boolean,
    onClear: () -> Unit,
    onSelectAll: () -> Unit,
    onFavorite: (Boolean) -> Unit,
    onDelete: () -> Unit,
) {
    TopAppBar(
        title = { Text("$count selected") },
        navigationIcon = {
            IconButton(onClick = onClear) {
                Icon(Icons.Filled.Close, contentDescription = "Leave selection")
            }
        },
        actions = {
            IconButton(onClick = onSelectAll) {
                Icon(Icons.Filled.SelectAll, contentDescription = "Select everything loaded")
            }
            IconButton(onClick = { onFavorite(!allFavorite) }) {
                Icon(
                    if (allFavorite) Icons.Filled.HeartBroken else Icons.Filled.Favorite,
                    contentDescription = if (allFavorite) "Remove from favorites" else "Add to favorites",
                )
            }
            IconButton(onClick = onDelete) {
                Icon(
                    Icons.Filled.Delete,
                    contentDescription = "Delete the selection",
                    tint = MaterialTheme.colorScheme.error,
                )
            }
        },
    )
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun MediaTile(
    repo: Repository,
    m: Media,
    selected: Boolean,
    selecting: Boolean,
    onClick: () -> Unit,
    onLongClick: () -> Unit,
) {
    val context = LocalContext.current
    Box(
        Modifier.aspectRatio(0.75f).clip(RoundedCornerShape(16.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .combinedClickable(onClick = onClick, onLongClick = onLongClick),
    ) {
        // The kind glyph sits underneath as the placeholder: it shows through while the
        // poster loads, and stays visible if the server has no thumb for this item.
        Box(Modifier.fillMaxSize(), Alignment.Center) {
            Icon(
                iconFor(m.kind),
                contentDescription = m.kind,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(48.dp),
            )
        }
        AsyncImage(
            model = ImageRequest.Builder(context).data(repo.thumbUrl(m.id)).crossfade(true).build(),
            imageLoader = repo.imageLoader,
            contentDescription = m.title,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize(),
        )
        if (m.kind == "video") {
            Box(
                Modifier.align(Alignment.Center).size(44.dp).clip(CircleShape).background(Color(0x66000000)),
                Alignment.Center,
            ) {
                Icon(Icons.Filled.PlayArrow, contentDescription = null, tint = Color.White)
            }
        }
        // Whether a game runs on the phone you're holding is the one thing worth
        // knowing before you tap into it, so it goes on the tile.
        if (m.kind == "game" && m.runsOnAndroid == true) {
            Row(
                Modifier.align(Alignment.TopStart).padding(6.dp)
                    .clip(RoundedCornerShape(6.dp)).background(Color(0xCC2E7D32)).padding(horizontal = 6.dp, vertical = 3.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Filled.Android, contentDescription = null, tint = Color.White, modifier = Modifier.size(12.dp))
                Text(
                    "Android",
                    style = MaterialTheme.typography.labelSmall,
                    color = Color.White,
                    modifier = Modifier.padding(start = 4.dp),
                )
            }
        }
        Text(
            m.title,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            style = MaterialTheme.typography.labelMedium,
            color = Color.White,
            modifier = Modifier.align(Alignment.BottomStart)
                .background(Color(0x99000000)).fillMaxWidth().padding(6.dp),
        )
        // The heart marks a favorite from the grid, and gets out of the way while
        // selecting — where the corner it lives in is the checkmark's.
        if (m.favorite && !selecting) {
            Icon(
                Icons.Filled.Favorite,
                contentDescription = "Favorite",
                tint = Color(0xFFE91E63),
                modifier = Modifier.align(Alignment.TopEnd).padding(6.dp).size(18.dp),
            )
        }
        if (selecting) {
            // A scrim, so a picked tile reads as picked at a glance across a full grid.
            if (selected) {
                Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.primary.copy(alpha = 0.35f)))
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
