package net.fourbakers.oppailib.ui

import android.widget.Toast
import android.content.Intent
import androidx.activity.compose.BackHandler
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Android
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.automirrored.filled.Sort
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ChatBubble
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.CloudUpload
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Collections
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Explore
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Gif
import androidx.compose.material.icons.filled.HeartBroken
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Movie
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.PushPin
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
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ListItem
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.NavigationDrawerItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
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
import androidx.work.WorkInfo
import androidx.work.WorkManager
import coil.compose.AsyncImage
import coil.request.ImageRequest
import kotlinx.coroutines.launch
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import net.fourbakers.oppailib.data.BulkRequest
import net.fourbakers.oppailib.data.LibbyVoice
import net.fourbakers.oppailib.data.Media
import net.fourbakers.oppailib.data.MediaPatch
import net.fourbakers.oppailib.data.PinnedFeed
import net.fourbakers.oppailib.data.Repository
import net.fourbakers.oppailib.data.SortMode
import net.fourbakers.oppailib.work.ImportWorker
import net.fourbakers.oppailib.work.DownloadQueue
import net.fourbakers.oppailib.work.DownloadWorker
import net.fourbakers.oppailib.work.UploadQueue
import net.fourbakers.oppailib.work.UploadWorker

/** Sidebar sections. The empty kind is the unfiltered "everything" view. */
private data class Section(val kind: String, val label: String, val icon: ImageVector)

private val SECTIONS = listOf(
    Section("", "All media", Icons.Filled.Collections),
    Section("video", "Videos", Icons.Filled.Movie),
    Section("gif", "GIFs", Icons.Filled.Gif),
    Section("image", "Images", Icons.Filled.Image),
    Section("comic", "Comics", Icons.AutoMirrored.Filled.MenuBook),
    Section("game", "Games", Icons.Filled.SportsEsports),
)

private fun iconFor(kind: String): ImageVector =
    SECTIONS.firstOrNull { it.kind == kind }?.icon ?: Icons.Filled.Collections

/**
 * Everything a query can match: the title, the notes, and each tag's name *and* its
 * category — so "character" or "explicit" surfaces everything filed that way, not
 * just items that happen to have those words in the title.
 */
private fun haystack(m: Media): String = buildString {
    append(m.title).append('\n')
    m.notes?.let { append(it).append('\n') }
    m.tags.forEach { append(it.name).append('\n').append(it.category).append('\n') }
}.lowercase()

/**
 * Terms are ANDed, so "blue_hair explicit" narrows across fields — one term matching
 * a tag and another matching the rating — rather than requiring one field to hold
 * them both. There's no search endpoint; the list response carries tags precisely so
 * this can run client-side.
 */
private fun matches(m: Media, terms: List<String>): Boolean {
    if (terms.isEmpty()) return true
    val hay = haystack(m)
    return terms.all { hay.contains(it) }
}

/**
 * Orders the grid. Client-side, because the app already holds the whole library (so
 * search can run locally) and the server only ever returns newest-first — there's
 * nothing a round trip would buy.
 */
private fun sorted(items: List<Media>, mode: SortMode): List<Media> = when (mode) {
    SortMode.NEWEST -> items.sortedByDescending { it.createdAt }
    SortMode.OLDEST -> items.sortedBy { it.createdAt }
    // Untitled items sort last rather than clumping at the top under the empty string.
    SortMode.TITLE -> items.sortedWith(
        compareBy(String.CASE_INSENSITIVE_ORDER) { it.title.ifEmpty { "￿" } },
    )
    SortMode.LARGEST -> items.sortedByDescending { it.size }
    SortMode.SMALLEST -> items.sortedBy { it.size }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LibraryScreen(repo: Repository, onLogout: () -> Unit) {
    var items by remember { mutableStateOf<List<Media>>(emptyList()) }
    var kind by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var viewerAt by remember { mutableStateOf<Int?>(null) }
    var showScrape by remember { mutableStateOf(false) }
    var aiTagger by remember { mutableStateOf("") }
    var query by remember { mutableStateOf("") }
    var searching by remember { mutableStateOf(false) }
    var showSettings by remember { mutableStateOf(false) }
    var showBrowse by remember { mutableStateOf(false) }
    var showChat by remember { mutableStateOf(false) }
    // A hold-menu handoff is deliberately in-memory: it is an attachment for this
    // visit to Chat, not a preference that should reappear after relaunching the app.
    var chatShare by remember { mutableStateOf<Media?>(null) }
    var holdMedia by remember { mutableStateOf<Media?>(null) }
    var confirmExport by remember { mutableStateOf<Media?>(null) }
    var showDownloads by remember { mutableStateOf(false) }
    var showImageGen by remember { mutableStateOf(false) }
    var showUploads by remember { mutableStateOf(false) }
    // Which pinned feed to open the browser on; null means the browser's own default.
    var browsePin by remember { mutableStateOf<PinnedFeed?>(null) }
    var pins by remember { mutableStateOf(repo.prefs.pinnedFeeds) }
    var sort by remember { mutableStateOf(repo.prefs.sortMode) }
    var sortMenu by remember { mutableStateOf(false) }
    var confirmDelete by remember { mutableStateOf<Media?>(null) }
    // Favorites is a filter, not a kind: it cuts across all of them, and the server
    // has no endpoint for it — the list already carries the flag.
    var favoritesOnly by remember { mutableStateOf(false) }
    // Non-empty means the grid is in selection mode: tiles toggle instead of opening.
    var selected by remember { mutableStateOf(emptySet<Long>()) }
    var confirmBulkDelete by remember { mutableStateOf(false) }
    // A library item some other screen asked us to open, held until the grid contains
    // it. See openLinked.
    var pendingOpenId by remember { mutableStateOf<Long?>(null) }
    val drawer = rememberDrawerState(DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    fun refresh() {
        loading = true
        scope.launch {
            try { items = repo.listAll(kind.ifEmpty { null }) }
            catch (_: Exception) { }
            finally { loading = false }
        }
    }

    fun delete(m: Media) {
        scope.launch {
            runCatching { repo.api.deleteMedia(m.id) }
                .onSuccess {
                    items = items.filterNot { it.id == m.id }
                    LibbyVoice.react(LibbyVoice.Event.LIBRARY_DELETE).let { repo.report(it.message, it.emotion) }
                }
        }
    }

    /**
     * The selection, favorited or unfavorited in one request.
     *
     * The grid is updated from the ids the server says it applied, not from the ids we
     * sent: a bulk action can partly fail, and a tile that claims to be favorited when
     * the server disagrees is worse than one that never changed.
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
                    if (gone.isNotEmpty()) {
                        LibbyVoice.react(LibbyVoice.Event.LIBRARY_DELETE, count = gone.size)
                            .let { repo.report(it.message, it.emotion) }
                    }
                }
            selected = emptySet()
        }
    }

    /**
     * Opens one library item by id, on behalf of a screen that has no viewer of its own
     * — a link chip in chat, so far.
     *
     * The viewer pages through exactly what the grid shows, so a target sitting behind
     * a kind filter, a search, or the favorites toggle would be unreachable. Dropping
     * the filters is what makes it findable, and it also leaves the user somewhere
     * coherent when they close the viewer rather than back inside a filter they never
     * set from here. A kind filter is fetched server-side, so changing it needs a
     * reload; the id is parked until the item actually turns up (see below).
     */
    fun openLinked(id: Long) {
        showChat = false
        query = ""
        searching = false
        favoritesOnly = false
        selected = emptySet()
        pendingOpenId = id
        if (kind.isNotEmpty()) {
            kind = ""
            refresh()
        }
    }

    // The upload queue, read straight from the worker's own state so the badge and
    // the sheet cannot drift from what is actually being sent.
    val uploadItems by UploadQueue.items.collectAsState()

    val terms = remember(query) { query.trim().lowercase().split(' ').filter { it.isNotEmpty() } }
    val shown = remember(items, terms, sort, favoritesOnly) {
        var filtered = if (terms.isEmpty()) items else items.filter { matches(it, terms) }
        if (favoritesOnly) filtered = filtered.filter { it.favorite }
        sorted(filtered, sort)
    }

    LaunchedEffect(Unit) {
        refresh()
        runCatching { repo.api.health() }.getOrNull()?.let { aiTagger = if (it.aiEnabled) it.aiTagger else "off" }
    }

    // A parked open request lands as soon as the grid holds its item. Keyed on `shown`
    // as well as the id because openLinked may have just triggered a reload, and the
    // index only exists once that has come back. An item that is genuinely gone —
    // deleted since the reply named it — simply never resolves and is dropped on the
    // next request rather than leaving the screen stuck.
    LaunchedEffect(pendingOpenId, shown) {
        val id = pendingOpenId ?: return@LaunchedEffect
        if (loading) return@LaunchedEffect
        val index = shown.indexOfFirst { it.id == id }
        pendingOpenId = null
        if (index >= 0) viewerAt = index
    }

    // Imports received through Android's share sheet happen outside this composable.
    // Reload when the repository announces one so the shared item appears immediately.
    LaunchedEffect(repo) {
        repo.libraryChanges.collect { refresh() }
    }

    // An import that finished while we were sitting here has put something in the
    // library that the grid doesn't know about. Watching the worker is how the grid
    // finds out — the alternative is a user staring at a stale screen after a
    // notification told them their thread had landed.
    LaunchedEffect(Unit) {
        var known: Set<java.util.UUID>? = null
        WorkManager.getInstance(context).getWorkInfosByTagFlow(ImportWorker.TAG).collect { infos ->
            val done = infos.filter { it.state == WorkInfo.State.SUCCEEDED }.map { it.id }.toSet()
            // The first emission is history — imports from previous runs of the app.
            // Only a *newly* finished one is worth a reload.
            if (known != null && (done - known!!).isNotEmpty()) refresh()
            known = done
        }
    }

    /**
     * Picked files go to the upload queue, not straight onto the wire.
     *
     * This used to copy each file into the cache directory in full and then send it
     * as one request from this composable's scope — so a long video needed twice its
     * own size in free space, died when the screen did, and started again from zero
     * if anything went wrong. The queue streams from the content URI in chunks, in a
     * foreground worker, and resumes from what the server already has.
     *
     * The persistable read permission is what makes recovery after a restart real:
     * without it the URI is a handle to nothing the next time the app runs, and the
     * queue would come back holding rows it could not upload.
     */
    val uploadLauncher = rememberSystemPickerLauncher(
        ActivityResultContracts.OpenMultipleDocuments(),
    ) { uris ->
        if (uris.isNullOrEmpty()) return@rememberSystemPickerLauncher
        for (uri in uris) {
            runCatching {
                context.contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
        }
        val added = UploadWorker.enqueue(context, uris)
        // Nothing added means every one of them was already queued and unfinished —
        // the duplicate guard doing its job. Saying so beats a silent no-op.
        if (added == 0) repo.report("Those are already in the upload queue.")
        showUploads = true
    }

    if (showUploads) {
        UploadsSheet(
            repo = repo,
            onDismiss = { showUploads = false },
            onOpenMedia = { id ->
                showUploads = false
                openLinked(id)
            },
        )
    }

    if (showSettings) {
        SettingsScreen(repo = repo, onBack = { showSettings = false }, onLogout = onLogout)
        return
    }

    if (showDownloads) {
        DownloadsScreen(onBack = { showDownloads = false })
        return
    }

    if (showBrowse) {
        // Coming back from a browse may have saved new items, so reload rather than
        // showing a library that's silently missing what was just added. Pins may have
        // changed while browsing too, so the drawer is re-read on the way back.
        BrowseScreen(
            repo = repo,
            openAt = browsePin,
            onBack = {
                showBrowse = false
                browsePin = null
                pins = repo.prefs.pinnedFeeds
                refresh()
            },
        )
        return
    }

    if (showChat) {
        ChatScreen(
            repo = repo,
            onBack = { showChat = false },
            onOpenMedia = { id -> openLinked(id) },
            sharedMedia = chatShare,
            onSharedMediaConsumed = { chatShare = null },
        )
        return
    }

    if (showImageGen) {
        // A save inside the studio lands in the library; nudge the grid so it's there
        // the moment the user comes back.
        ImageGenScreen(
            repo = repo,
            onBack = { showImageGen = false; refresh() },
            onSaved = { repo.notifyLibraryChanged() },
        )
        return
    }

    // Selection is a mode, and back is how you leave a mode — otherwise the only way
    // out is the X, and back would drop you out of the library entirely.
    BackHandler(enabled = selected.isNotEmpty()) { selected = emptySet() }

    if (confirmBulkDelete) {
        val n = selected.size
        AlertDialog(
            onDismissRequest = { confirmBulkDelete = false },
            title = { Text(if (n == 1) "Delete this?" else "Delete $n items?") },
            text = {
                Text(
                    "They'll be removed from the library and their files deleted. " +
                        "This can't be undone.",
                )
            },
            confirmButton = {
                TextButton(onClick = { confirmBulkDelete = false; deleteSelection() }) {
                    Text("Delete", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { confirmBulkDelete = false }) { Text("Cancel") }
            },
        )
    }

    confirmDelete?.let { target ->
        AlertDialog(
            onDismissRequest = { confirmDelete = null },
            title = { Text("Delete this?") },
            text = {
                Text(
                    "“${target.title.ifEmpty { target.kind }}” will be removed from the library " +
                        "and its file deleted. This can't be undone.",
                )
            },
            confirmButton = {
                TextButton(onClick = { delete(target); confirmDelete = null }) {
                    Text("Delete", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { confirmDelete = null }) { Text("Cancel") }
            },
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
                        showDownloads = true
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
                    chatShare = target
                    showChat = true
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
            ListItem(
                headlineContent = { Text("Select item") },
                supportingContent = { Text("Start multi-select actions") },
                leadingContent = { Icon(Icons.Filled.CheckCircle, contentDescription = null) },
                modifier = Modifier.clickable { holdMedia = null; selected = selected + target.id },
            )
            Spacer(Modifier.size(16.dp))
        }
    }

    // The viewer owns the whole screen (immersive), so it replaces the library
    // rather than layering over it. It pages through exactly what the grid showed —
    // the filtered list, not the whole library — so the index lines up either way.
    viewerAt?.let { start ->
        ViewerScreen(
            repo = repo,
            items = shown,
            startIndex = start,
            onClose = { viewerAt = null },
            onChanged = { updated ->
                items = items.map { if (it.id == updated.id) updated else it }
            },
            onSearchTag = { tag ->
                query = tag
                searching = true
                viewerAt = null // the filtered list is about to change out from under it
            },
            onDelete = { m ->
                // Close first: the viewer indexes into `shown`, and that list is about to
                // lose an entry underneath it.
                viewerAt = null
                confirmDelete = m
            },
        )
        return
    }

    if (showScrape) {
        ScrapeDialog(repo = repo, onDismiss = { showScrape = false }, onImported = { showScrape = false; refresh() })
    }

    ModalNavigationDrawer(
        drawerState = drawer,
        drawerContent = {
            ModalDrawerSheet {
                Text(
                    "OppaiLib",
                    style = MaterialTheme.typography.headlineSmall,
                    modifier = Modifier.padding(horizontal = 28.dp, vertical = 20.dp),
                )
                HorizontalDivider()
                SECTIONS.forEach { section ->
                    NavigationDrawerItem(
                        icon = { Icon(section.icon, contentDescription = null) },
                        label = { Text(section.label) },
                        selected = kind == section.kind && !favoritesOnly,
                        onClick = {
                            scope.launch { drawer.close() }
                            val wasFiltered = favoritesOnly
                            favoritesOnly = false
                            if (kind != section.kind) {
                                kind = section.kind
                                query = ""
                                searching = false
                                refresh()
                            } else if (wasFiltered) {
                                query = ""
                                searching = false
                            }
                        },
                        modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding),
                    )
                }
                // A filter rather than a kind — but it reads as a place you go, so it goes
                // to the whole library and filters that. "Favorites" showing only favorite
                // *videos*, because that's what you happened to be looking at, would be a
                // section that means something different every time you open it.
                NavigationDrawerItem(
                    icon = { Icon(Icons.Filled.Favorite, contentDescription = null) },
                    label = { Text("Favorites") },
                    selected = favoritesOnly,
                    onClick = {
                        scope.launch { drawer.close() }
                        favoritesOnly = true
                        query = ""
                        searching = false
                        if (kind.isNotEmpty()) {
                            kind = ""
                            refresh()
                        }
                    },
                    modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding),
                )
                HorizontalDivider(Modifier.padding(vertical = 8.dp))
                NavigationDrawerItem(
                    icon = { Icon(Icons.Filled.Explore, contentDescription = null) },
                    label = { Text("Browse sources") },
                    selected = false,
                    onClick = {
                        scope.launch { drawer.close() }
                        browsePin = null
                        showBrowse = true
                    },
                    modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding),
                )
                NavigationDrawerItem(
                    icon = { Icon(Icons.Filled.Download, contentDescription = null) },
                    label = { Text("Downloads") },
                    selected = false,
                    onClick = { scope.launch { drawer.close() }; showDownloads = true },
                    badge = {
                        val active = DownloadQueue.items.collectAsState().value.count { it.live }
                        if (active > 0) Badge { Text("$active") }
                    },
                    modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding),
                )
                NavigationDrawerItem(
                    icon = { Icon(Icons.Filled.ChatBubble, contentDescription = null) },
                    label = { Text("Chat with Libby") },
                    selected = false,
                    onClick = { scope.launch { drawer.close() }; showChat = true },
                    modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding),
                )
                NavigationDrawerItem(
                    icon = { Icon(Icons.Filled.AutoAwesome, contentDescription = null) },
                    label = { Text("Image studio") },
                    selected = false,
                    onClick = { scope.launch { drawer.close() }; showImageGen = true },
                    modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding),
                )
                // Pinned remote feeds sit under Browse, as shortcuts into it. A long
                // press unpins, so a pin can be undone without going back to the feed
                // it was made from.
                pins.forEach { p ->
                    NavigationDrawerItem(
                        icon = { Icon(Icons.Filled.PushPin, contentDescription = null) },
                        label = { Text(p.label, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                        selected = false,
                        onClick = {
                            scope.launch { drawer.close() }
                            browsePin = p
                            showBrowse = true
                        },
                        badge = {
                            IconButton(onClick = {
                                repo.prefs.togglePin(p)
                                pins = repo.prefs.pinnedFeeds
                            }) {
                                Icon(
                                    Icons.Filled.Close,
                                    contentDescription = "Unpin ${p.label}",
                                    modifier = Modifier.size(16.dp),
                                )
                            }
                        },
                        modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding),
                    )
                }
                NavigationDrawerItem(
                    icon = { Icon(Icons.Filled.Settings, contentDescription = null) },
                    label = { Text("Settings") },
                    selected = false,
                    onClick = { scope.launch { drawer.close() }; showSettings = true },
                    modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding),
                )
                NavigationDrawerItem(
                    icon = { Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = null) },
                    label = { Text("Sign out") },
                    selected = false,
                    onClick = onLogout,
                    modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding),
                )
                Text(
                    "AI tagger: ${aiTagger.ifEmpty { "…" }}",
                    style = MaterialTheme.typography.labelSmall,
                    modifier = Modifier.padding(horizontal = 28.dp, vertical = 12.dp),
                )
            }
        },
    ) {
        val focus = remember { FocusRequester() }
        LaunchedEffect(searching) { if (searching) runCatching { focus.requestFocus() } }

        Scaffold(
            topBar = {
                if (selected.isNotEmpty()) {
                    SelectionBar(
                        count = selected.size,
                        // Everything selected is already favorited → the heart's job is to
                        // take it away. Anything else and it adds. One button, and it always
                        // does the thing the selection isn't already.
                        allFavorite = shown.filter { it.id in selected }.all { it.favorite },
                        onClear = { selected = emptySet() },
                        onSelectAll = { selected = shown.map { it.id }.toSet() },
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
                                placeholder = { Text("Search titles and tags") },
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
                            Text(
                                if (favoritesOnly) "Favorites" else SECTIONS.first { it.kind == kind }.label,
                            )
                        }
                    },
                    navigationIcon = {
                        IconButton(onClick = { scope.launch { drawer.open() } }) {
                            Icon(Icons.Filled.Menu, contentDescription = "Open menu")
                        }
                    },
                    actions = {
                        // The way back into the upload manager once the sheet has been
                        // dismissed. Shown only when there is something to see: a badge
                        // that is always there is a badge nobody reads.
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
                                        leadingIcon = {
                                            if (mode == sort) {
                                                Icon(Icons.Filled.Check, contentDescription = null)
                                            }
                                        },
                                        onClick = {
                                            sort = mode
                                            repo.prefs.sortMode = mode
                                            sortMenu = false
                                        },
                                    )
                                }
                            }
                        }
                    },
                )
                }
            },
            floatingActionButton = {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    FloatingActionButton(onClick = { showScrape = true }) { Icon(Icons.Filled.Link, "Scrape") }
                    FloatingActionButton(onClick = { uploadLauncher.launch(arrayOf("*/*")) }) { Icon(Icons.Filled.Upload, "Upload") }
                }
            },
        ) { padding ->
            Column(Modifier.padding(padding).fillMaxSize()) {
                when {
                    loading -> Box(Modifier.fillMaxSize(), Alignment.Center) { CircularProgressIndicator() }
                    shown.isEmpty() -> Box(Modifier.fillMaxSize(), Alignment.Center) {
                        Text(
                            when {
                                terms.isNotEmpty() -> "No matches for “$query”."
                                favoritesOnly -> "No favorites yet. Tap the heart on anything worth keeping."
                                else -> "Nothing here yet."
                            },
                        )
                    }
                    else -> LazyVerticalGrid(
                        columns = GridCells.Adaptive(minSize = 150.dp),
                        modifier = Modifier.fillMaxSize().padding(horizontal = 8.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        itemsIndexed(shown, key = { _, m -> m.id }) { index, m ->
                            MediaTile(
                                repo = repo,
                                m = m,
                                selected = m.id in selected,
                                selecting = selected.isNotEmpty(),
                                // In selection mode a tap picks rather than opens: once
                                // you're choosing several, opening one is not what a tap
                                // on a tile can plausibly mean.
                                onClick = {
                                    if (selected.isEmpty()) {
                                        viewerAt = index
                                    } else {
                                        selected = if (m.id in selected) selected - m.id else selected + m.id
                                    }
                                },
                                // Hold opens the mobile counterpart to the web context menu.
                                // Multi-select remains available inside it alongside export
                                // and Libby handoff actions.
                                onLongClick = { holdMedia = m },
                            )
                        }
                    }
                }
            }
        }
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
                Icon(Icons.Filled.SelectAll, contentDescription = "Select everything shown")
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
        // The kind glyph sits underneath as the placeholder: it shows through while
        // the poster loads, and stays visible if the server has no thumb for this
        // item (e.g. a game, or a video ffmpeg couldn't decode).
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
                Icon(
                    Icons.Filled.Android,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(12.dp),
                )
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
            // A scrim, so a picked tile reads as picked at a glance across a full grid
            // rather than by hunting for a small tick.
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
