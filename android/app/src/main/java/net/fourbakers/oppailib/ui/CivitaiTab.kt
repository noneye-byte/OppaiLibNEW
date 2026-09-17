package net.fourbakers.oppailib.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.fromHtml
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.AsyncImage
import kotlinx.coroutines.launch
import net.fourbakers.oppailib.data.CivitaiCategory
import net.fourbakers.oppailib.data.CivitaiCollection
import net.fourbakers.oppailib.data.CivitaiCoverRequest
import net.fourbakers.oppailib.data.CivitaiImage
import net.fourbakers.oppailib.data.CivitaiInstallRequest
import net.fourbakers.oppailib.data.CivitaiInstalled
import net.fourbakers.oppailib.data.CivitaiMe
import net.fourbakers.oppailib.data.CivitaiModel
import net.fourbakers.oppailib.data.CivitaiPost
import net.fourbakers.oppailib.data.CivitaiPrompt
import net.fourbakers.oppailib.data.CivitaiSyncRequest
import net.fourbakers.oppailib.data.CivitaiUpdateRequest
import net.fourbakers.oppailib.data.CivitaiVersion
import net.fourbakers.oppailib.data.dateLabel
import net.fourbakers.oppailib.data.mergeCivitaiPosts
import net.fourbakers.oppailib.data.InstallJob
import net.fourbakers.oppailib.data.PromptSettings
import net.fourbakers.oppailib.data.Repository

private val civitaiTypes = listOf(
    "" to "All", "checkpoint" to "Checkpoints", "lora" to "LoRAs", "embedding" to "Embeddings",
    "vae" to "VAEs", "controlnet" to "ControlNet", "upscaler" to "Upscalers",
)
private val civitaiSorts = listOf(
    "" to "Most downloaded", "rated" to "Highest rated", "liked" to "Most liked", "newest" to "Newest",
    "collected" to "Most collected", "discussed" to "Most discussed", "images" to "Most images",
)
private val civitaiImageSorts = listOf("" to "Most reactions", "newest" to "Newest", "comments" to "Most comments")
private val civitaiPeriods = listOf(
    "" to "All time", "year" to "Year", "month" to "Month", "week" to "Week", "day" to "Today",
)
private val civitaiBases = listOf(
    "SD 1.5", "SD 2.1", "SDXL 1.0", "Pony", "Illustrious", "NoobAI", "Flux.1 D", "Flux.1 S", "SD 3.5",
)

/**
 * The Civitai catalogue on the phone (via the server's civitai.red proxy).
 *
 * Browse searches with the site's own filters and opens a model's page — its
 * description, versions, files, trigger words and the pictures people posted with
 * it, whose prompts can be handed straight to the Create tab. Account is whoever
 * the API key belongs to, laid out like their profile on the site: models, posts,
 * pictures and collections, newest first. Installed is the studio's models seen
 * from the catalogue's side, matched by file hash, with the cover, description and
 * trigger words one tap away, and per model the version to follow, the cover to
 * use, an update to a newer version, and deletion. Installing hands a version to
 * InvokeAI; the server dresses the model once the download completes. The download
 * log stays folded until asked for.
 */
@Composable
fun CivitaiTab(repo: Repository, onUsePrompt: (PromptSettings) -> Unit) {
    var page by remember { mutableStateOf(0) }
    var jobs by remember { mutableStateOf<List<InstallJob>>(emptyList()) }
    var jobsOpen by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    suspend fun pollJobs() {
        runCatching { repo.api.civitaiInstalls() }
            .onSuccess { jobs = it.jobs.filter { j -> j.status != "cancelled" }.take(4) }
    }
    LaunchedEffect(Unit) { pollJobs() }

    fun install(m: CivitaiModel, v: CivitaiVersion) {
        scope.launch {
            runCatching { repo.api.civitaiInstall(CivitaiInstallRequest(v.downloadUrl, m.id, v.id)) }
                .onSuccess {
                    repo.report("InvokeAI is downloading the model; its cover and description follow")
                    pollJobs()
                }
                .onFailure { repo.report(it.message ?: "Couldn't start the install") }
        }
    }

    Column(Modifier.fillMaxSize().padding(horizontal = 14.dp)) {
        SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth().padding(top = 6.dp)) {
            listOf("Browse", "Account", "Installed").forEachIndexed { i, label ->
                SegmentedButton(
                    selected = page == i,
                    onClick = { page = i },
                    shape = SegmentedButtonDefaults.itemShape(index = i, count = 3),
                ) { Text(label) }
            }
        }
        if (jobs.isNotEmpty()) {
            // One line says how the downloads are doing; the log itself only unfolds
            // on request, since a finished download is not news every time the tab opens.
            val active = jobs.filter { it.status == "downloading" || it.status == "running" || it.status == "waiting" }
            val summary = when {
                active.size == 1 -> {
                    val j = active[0]
                    if (j.totalBytes > 0) "downloading ${(j.bytes * 100 / j.totalBytes)}%" else j.status
                }
                active.isNotEmpty() -> "${active.size} downloading"
                else -> "${jobs.size} download${if (jobs.size == 1) "" else "s"}"
            }
            Row(
                Modifier.fillMaxWidth().clickable { jobsOpen = !jobsOpen }.padding(top = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Filled.Download, contentDescription = null, Modifier.size(14.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(" $summary", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Icon(
                    if (jobsOpen) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore,
                    contentDescription = if (jobsOpen) "Hide the download log" else "Show the download log",
                    Modifier.size(16.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            if (jobsOpen) jobs.forEach { j ->
                val pct = if (j.totalBytes > 0) " ${(j.bytes * 100 / j.totalBytes)}%" else ""
                Text(
                    "⤓ ${j.status}$pct — ${j.error.ifBlank { j.source }}",
                    style = MaterialTheme.typography.labelSmall,
                    color = if (j.status == "error") MaterialTheme.colorScheme.error
                    else MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(top = 2.dp),
                )
            }
        }
        when (page) {
            0 -> CivitaiBrowse(repo, onInstall = ::install, onUsePrompt = onUsePrompt)
            1 -> CivitaiAccount(repo, onUsePrompt = onUsePrompt)
            else -> CivitaiInstalledList(repo, onJobs = { scope.launch { pollJobs() } })
        }
    }
}

@Composable
private fun CivitaiBrowse(
    repo: Repository,
    onInstall: (CivitaiModel, CivitaiVersion) -> Unit,
    onUsePrompt: (PromptSettings) -> Unit,
) {
    var query by remember { mutableStateOf("") }
    var type by remember { mutableStateOf("") }
    var sort by remember { mutableStateOf("") }
    var period by remember { mutableStateOf("") }
    var base by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("") }
    var creator by remember { mutableStateOf("") }
    var nsfw by remember { mutableStateOf(true) }
    var showFilters by remember { mutableStateOf(false) }
    var categories by remember { mutableStateOf<List<CivitaiCategory>>(emptyList()) }
    var items by remember { mutableStateOf<List<CivitaiModel>>(emptyList()) }
    var cursor by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    var detailId by remember { mutableStateOf(0L) }
    var detailSeed by remember { mutableStateOf<CivitaiModel?>(null) }
    var me by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()

    suspend fun search(reset: Boolean) {
        loading = true
        error = ""
        runCatching {
            repo.api.civitaiSearch(
                q = query.ifBlank { null },
                type = type.ifBlank { null },
                category = category.ifBlank { null },
                sort = sort.ifBlank { null },
                period = period.ifBlank { null },
                base = base.ifBlank { null },
                creator = creator.ifBlank { null },
                nsfw = if (nsfw) null else "0",
                cursor = if (reset) null else cursor.ifBlank { null },
            )
        }.onSuccess { res ->
            // The grid is keyed by id, and a cursor that shifts under a "load more"
            // can hand back a model already shown — a repeat key crashes the app.
            items = (if (reset) res.items else items + res.items).distinctBy { it.id }
            cursor = res.nextCursor
        }.onFailure { error = it.message ?: "Civitai is unreachable" }
        loading = false
    }

    LaunchedEffect(Unit) {
        runCatching { repo.api.civitaiCategories() }.onSuccess { categories = it.categories.take(24) }
        // Whose key this is, if there is one — for a "mine" chip. Quietly nothing otherwise.
        runCatching { repo.api.civitaiMe() }.onSuccess { me = it.username }
        search(reset = true)
    }

    Row(verticalAlignment = Alignment.CenterVertically) {
        OutlinedTextField(
            value = query,
            onValueChange = { query = it },
            placeholder = { Text("Search Civitai…") },
            singleLine = true,
            modifier = Modifier.weight(1f),
        )
        IconButton(onClick = { scope.launch { search(reset = true) } }) {
            Icon(Icons.Filled.Search, contentDescription = "Search")
        }
    }
    Row(
        Modifier.horizontalScroll(rememberScrollState()).padding(vertical = 6.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        FilterChip(selected = showFilters, onClick = { showFilters = !showFilters }, label = { Text("Filters") })
        civitaiTypes.forEach { (id, label) ->
            FilterChip(
                selected = type == id,
                onClick = { type = id; scope.launch { search(reset = true) } },
                label = { Text(label) },
            )
        }
        if (creator.isNotEmpty()) {
            FilterChip(
                selected = true,
                onClick = { creator = ""; scope.launch { search(reset = true) } },
                label = { Text("by $creator ✕") },
            )
        } else if (me.isNotEmpty()) {
            FilterChip(
                selected = false,
                onClick = { creator = me; scope.launch { search(reset = true) } },
                label = { Text("Mine") },
            )
        }
    }
    // Sorting is the filter people reach for most, so it stays out of the fold.
    Row(Modifier.horizontalScroll(rememberScrollState()).padding(bottom = 6.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        civitaiSorts.forEach { (id, label) ->
            FilterChip(selected = sort == id, onClick = { sort = id; scope.launch { search(reset = true) } }, label = { Text(label) })
        }
    }
    if (showFilters) {
        Row(Modifier.horizontalScroll(rememberScrollState()).padding(bottom = 6.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            civitaiPeriods.forEach { (id, label) ->
                FilterChip(selected = period == id, onClick = { period = id; scope.launch { search(reset = true) } }, label = { Text(label) })
            }
            FilterChip(selected = nsfw, onClick = { nsfw = !nsfw; scope.launch { search(reset = true) } }, label = { Text("NSFW") })
        }
        Row(Modifier.horizontalScroll(rememberScrollState()).padding(bottom = 6.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterChip(selected = base.isEmpty(), onClick = { base = ""; scope.launch { search(reset = true) } }, label = { Text("Any base") })
            civitaiBases.forEach { b ->
                FilterChip(selected = base == b, onClick = { base = b; scope.launch { search(reset = true) } }, label = { Text(b) })
            }
        }
        if (categories.isNotEmpty()) {
            Row(Modifier.horizontalScroll(rememberScrollState()).padding(bottom = 6.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(selected = category.isEmpty(), onClick = { category = ""; scope.launch { search(reset = true) } }, label = { Text("All categories") })
                categories.forEach { c ->
                    FilterChip(selected = category == c.name, onClick = { category = c.name; scope.launch { search(reset = true) } }, label = { Text(c.name) })
                }
            }
        }
    }
    if (error.isNotEmpty()) {
        Text(error, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
    }
    LazyVerticalGrid(
        columns = GridCells.Adaptive(minSize = 130.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        modifier = Modifier.fillMaxSize().padding(top = 4.dp),
    ) {
        items(items, key = { it.id }) { m ->
            CivitaiModelCard(repo, m) { detailSeed = m; detailId = m.id }
        }
        if (!loading && cursor.isNotEmpty()) {
            item(span = { GridItemSpan(maxLineSpan) }) {
                OutlinedButton(
                    onClick = { scope.launch { search(reset = false) } },
                    modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
                ) { Text("Load more") }
            }
        }
        if (loading) {
            item(span = { GridItemSpan(maxLineSpan) }) {
                Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
        }
    }

    if (detailId != 0L) {
        CivitaiDetailDialog(
            repo = repo,
            id = detailId,
            seed = detailSeed,
            nsfw = nsfw,
            onInstall = onInstall,
            onUsePrompt = onUsePrompt,
            onCreator = { name -> creator = name; detailId = 0L; scope.launch { search(reset = true) } },
            onTag = { tag -> category = tag; detailId = 0L; scope.launch { search(reset = true) } },
            onDismiss = { detailId = 0L },
        )
    }
}

/**
 * One model's page. Opens on what the card already knew and fills in the rest —
 * description, files, every version's install state — from the server.
 */
@Composable
private fun CivitaiDetailDialog(
    repo: Repository,
    id: Long,
    seed: CivitaiModel?,
    nsfw: Boolean,
    onInstall: (CivitaiModel, CivitaiVersion) -> Unit,
    onUsePrompt: (PromptSettings) -> Unit,
    onCreator: (String) -> Unit,
    onTag: (String) -> Unit,
    onDismiss: () -> Unit,
) {
    var model by remember { mutableStateOf(seed) }
    var versionId by remember { mutableStateOf(seed?.versions?.firstOrNull()?.id ?: 0L) }
    var shown by remember { mutableStateOf(seed?.versions?.firstOrNull()?.images?.firstOrNull() ?: "") }
    var zoomed by remember { mutableStateOf("") }
    var galleryOpen by remember { mutableStateOf(false) }
    var loadError by remember { mutableStateOf("") }
    val clipboard = LocalClipboardManager.current

    LaunchedEffect(id) {
        runCatching { repo.api.civitaiModel(id) }
            .onSuccess { full ->
                model = full
                val v = full.versions.find { it.id == versionId } ?: full.versions.firstOrNull()
                versionId = v?.id ?: 0L
                if (shown.isEmpty()) shown = v?.images?.firstOrNull() ?: ""
            }
            .onFailure { loadError = it.message ?: "Couldn't load the model page" }
    }

    val m = model
    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Surface(shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth(0.94f).fillMaxHeight(0.92f)) {
            if (m == null) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    if (loadError.isNotEmpty()) Text(loadError, color = MaterialTheme.colorScheme.error) else CircularProgressIndicator()
                }
                return@Surface
            }
            val v = m.versions.find { it.id == versionId }
            Column(Modifier.fillMaxSize()) {
                Column(
                    Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text(m.name, style = MaterialTheme.typography.titleMedium)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            "${typeLabel(m.type)} · ⤓ ${m.downloads} · ♥ ${m.likes}${if (m.nsfw) " · 18+" else ""}",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        if (m.creator.isNotEmpty()) {
                            Text(
                                "by ${m.creator}",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.clickable { onCreator(m.creator) },
                            )
                        }
                    }
                    if (shown.isNotEmpty()) {
                        AsyncImage(
                            model = repo.civitaiImageUrl(shown),
                            imageLoader = repo.imageLoader,
                            contentDescription = m.name,
                            contentScale = ContentScale.Fit,
                            modifier = Modifier
                                .fillMaxWidth()
                                .aspectRatio(3f / 4f)
                                .clip(RoundedCornerShape(12.dp))
                                .background(MaterialTheme.colorScheme.surfaceVariant)
                                .clickable { zoomed = shown },
                        )
                    }
                    if ((v?.images?.size ?: 0) > 1) {
                        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            v!!.images.forEach { u ->
                                AsyncImage(
                                    model = repo.civitaiImageUrl(u),
                                    imageLoader = repo.imageLoader,
                                    contentDescription = null,
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier.size(52.dp, 68.dp).clip(RoundedCornerShape(8.dp)).clickable { shown = u },
                                )
                            }
                        }
                    }
                    if (m.versions.size > 1) {
                        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            m.versions.forEach { ver ->
                                FilterChip(
                                    selected = versionId == ver.id,
                                    onClick = { versionId = ver.id; shown = ver.images.firstOrNull() ?: shown },
                                    leadingIcon = if (ver.installed) ({ Icon(Icons.Filled.Check, null, Modifier.size(14.dp)) }) else null,
                                    label = { Text("${ver.name} · ${ver.base}") },
                                )
                            }
                        }
                    } else if (v != null) {
                        Text("Version ${v.name} · ${v.base}", style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    if (v != null && v.trainedWords.isNotEmpty()) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                "Triggers: ${v.trainedWords.joinToString(", ")}",
                                style = MaterialTheme.typography.bodySmall,
                                modifier = Modifier.weight(1f),
                            )
                            IconButton(onClick = { clipboard.setText(AnnotatedString(v.trainedWords.joinToString(", "))) }) {
                                Icon(Icons.Filled.ContentCopy, contentDescription = "Copy trigger words", Modifier.size(16.dp))
                            }
                        }
                    }
                    if (m.tags.isNotEmpty()) {
                        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            m.tags.take(12).forEach { t ->
                                FilterChip(selected = false, onClick = { onTag(t) }, label = { Text(t) })
                            }
                        }
                    }
                    if (m.description.isNotEmpty()) {
                        Text("About", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        // Sanitized by the server to a handful of tags; fromHtml renders those.
                        Text(AnnotatedString.fromHtml(m.description), style = MaterialTheme.typography.bodySmall)
                    }
                    if (v != null && v.description.isNotEmpty() && v.description != m.description) {
                        Text("About this version", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(AnnotatedString.fromHtml(v.description), style = MaterialTheme.typography.bodySmall)
                    }
                    if (v != null && v.files.isNotEmpty()) {
                        Text("Files", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        v.files.forEach { f ->
                            Text(
                                listOf(f.name, fmtSize(f.sizeMB), f.format, f.precision, if (f.primary) "primary" else "")
                                    .filter { it.isNotBlank() }.joinToString(" · "),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                    if (loadError.isNotEmpty()) {
                        Text(loadError, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                    }
                }
                Row(
                    Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    if (v != null) {
                        if (v.installed) {
                            Button(onClick = {}, enabled = false) {
                                Icon(Icons.Filled.Check, contentDescription = null, Modifier.size(16.dp))
                                Text("  Installed")
                            }
                        } else {
                            Button(onClick = { onInstall(m, v); onDismiss() }, enabled = v.downloadUrl.isNotEmpty()) {
                                Icon(Icons.Filled.Download, contentDescription = null, Modifier.size(16.dp))
                                Text(if (v.sizeMB > 0) "  Install (${fmtSize(v.sizeMB)})" else "  Install")
                            }
                        }
                        OutlinedButton(onClick = { galleryOpen = true }) { Text("Pictures") }
                    }
                    Spacer(Modifier.weight(1f))
                    TextButton(onClick = onDismiss) { Text("Close") }
                }
            }
        }
    }
    if (zoomed.isNotEmpty()) {
        Dialog(onDismissRequest = { zoomed = "" }, properties = DialogProperties(usePlatformDefaultWidth = false)) {
            AsyncImage(
                model = repo.civitaiImageUrl(zoomed),
                imageLoader = repo.imageLoader,
                contentDescription = null,
                contentScale = ContentScale.Fit,
                modifier = Modifier.fillMaxSize().background(Color.Black).clickable { zoomed = "" },
            )
        }
    }
    if (galleryOpen && versionId != 0L) {
        CivitaiGalleryDialog(repo, versionId, nsfw, onUsePrompt = { onUsePrompt(it); galleryOpen = false; onDismiss() }, onDismiss = { galleryOpen = false })
    }
}

/** The pictures people posted with a version, and the prompt behind a tapped one. */
@Composable
private fun CivitaiGalleryDialog(
    repo: Repository,
    versionId: Long,
    nsfw: Boolean,
    onUsePrompt: (PromptSettings) -> Unit,
    onDismiss: () -> Unit,
) {
    var images by remember { mutableStateOf<List<CivitaiImage>>(emptyList()) }
    var cursor by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var sort by remember { mutableStateOf("") }
    var picked by remember { mutableStateOf<CivitaiImage?>(null) }
    val scope = rememberCoroutineScope()

    suspend fun load(reset: Boolean) {
        loading = true
        runCatching {
            repo.api.civitaiImages(versionId = versionId, sort = sort.ifBlank { null }, nsfw = if (nsfw) null else "0", cursor = if (reset) null else cursor.ifBlank { null })
        }.onSuccess { res ->
            images = (if (reset) res.items else images + res.items).distinctBy { it.id }
            cursor = res.nextCursor
        }.onFailure { repo.report(it.message ?: "Couldn't load the pictures") }
        loading = false
    }
    LaunchedEffect(versionId, sort) { load(reset = true) }

    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Surface(shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth(0.94f).fillMaxHeight(0.92f)) {
            Column(Modifier.fillMaxSize().padding(12.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Posted pictures", style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                    IconButton(onClick = onDismiss) { Icon(Icons.Filled.Close, contentDescription = "Close") }
                }
                Row(Modifier.horizontalScroll(rememberScrollState()).padding(bottom = 6.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    civitaiImageSorts.forEach { (id, label) ->
                        FilterChip(selected = sort == id, onClick = { sort = id }, label = { Text(label) })
                    }
                }
                LazyVerticalGrid(
                    columns = GridCells.Adaptive(minSize = 110.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.weight(1f),
                ) {
                    items(images, key = { it.id }) { img ->
                        CivitaiImageTile(repo, img, onClick = { picked = img })
                    }
                    if (!loading && cursor.isNotEmpty()) {
                        item(span = { GridItemSpan(maxLineSpan) }) {
                            OutlinedButton(onClick = { scope.launch { load(reset = false) } }, modifier = Modifier.fillMaxWidth()) { Text("More") }
                        }
                    }
                    if (loading) {
                        item(span = { GridItemSpan(maxLineSpan) }) {
                            Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
                        }
                    }
                    if (!loading && images.isEmpty()) {
                        item(span = { GridItemSpan(maxLineSpan) }) {
                            Text("Nobody has posted a picture with this version.", style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(16.dp))
                        }
                    }
                }
            }
        }
    }

    picked?.let { img -> CivitaiPickedDialog(repo, img, onUsePrompt = onUsePrompt, onDismiss = { picked = null }) }
}

/** One picture in a grid, flagged when the poster kept the prompt. */
@Composable
private fun CivitaiImageTile(repo: Repository, img: CivitaiImage, onClick: () -> Unit, badge: String? = null) {
    Box(Modifier.clip(RoundedCornerShape(10.dp)).clickable(onClick = onClick)) {
        AsyncImage(
            model = repo.civitaiImageUrl(img.url),
            imageLoader = repo.imageLoader,
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxWidth().aspectRatio(3f / 4f),
        )
        val label = badge ?: if (img.prompt.isNotBlank()) "prompt" else null
        if (label != null) {
            Text(
                label,
                style = MaterialTheme.typography.labelSmall,
                color = Color.White,
                modifier = Modifier.align(Alignment.BottomEnd).padding(6.dp)
                    .clip(RoundedCornerShape(6.dp)).background(Color.Black.copy(alpha = .6f))
                    .padding(horizontal = 6.dp, vertical = 2.dp),
            )
        }
    }
}

/** One posted picture, full size, with everything the poster kept about it. */
@Composable
private fun CivitaiPickedDialog(repo: Repository, img: CivitaiImage, onUsePrompt: (PromptSettings) -> Unit, onDismiss: () -> Unit) {
    val clipboard = LocalClipboardManager.current
    run {
        val settings = CivitaiPrompt.from(img)
        Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
            Surface(shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth(0.94f).fillMaxHeight(0.92f)) {
                Column(Modifier.fillMaxSize()) {
                    Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        AsyncImage(
                            model = repo.civitaiImageUrl(img.url),
                            imageLoader = repo.imageLoader,
                            contentDescription = null,
                            contentScale = ContentScale.Fit,
                            modifier = Modifier.fillMaxWidth().heightIn(max = 420.dp).clip(RoundedCornerShape(12.dp)).background(Color.Black),
                        )
                        if (settings != null) {
                            Text("Prompt${if (img.username.isNotEmpty()) " · by ${img.username}" else ""}", style = MaterialTheme.typography.labelLarge,
                                color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(settings.prompt, style = MaterialTheme.typography.bodySmall)
                            if (settings.negativePrompt.isNotEmpty()) {
                                Text("Negative", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text(settings.negativePrompt, style = MaterialTheme.typography.bodySmall)
                            }
                            val facts = buildList {
                                if (img.model.isNotEmpty()) add("Model ${img.model}")
                                if (img.sampler.isNotEmpty()) add("Sampler ${img.sampler}${if (settings.sampler.isEmpty()) " (not in InvokeAI)" else ""}")
                                if (settings.steps > 0) add("Steps ${settings.steps}")
                                if (settings.cfgScale > 0) add("CFG ${settings.cfgScale}")
                                if (settings.seed > 0) add("Seed ${settings.seed}")
                                if (settings.width > 0) add("${settings.width}×${settings.height}")
                            }
                            if (facts.isNotEmpty()) {
                                Text(facts.joinToString(" · "), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        } else {
                            Text("The poster kept no prompt for this one.", style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                    Row(Modifier.padding(horizontal = 12.dp, vertical = 10.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        if (settings != null) {
                            Button(onClick = { onUsePrompt(settings) }) {
                                Icon(Icons.Filled.AutoAwesome, contentDescription = null, Modifier.size(16.dp))
                                Text("  Use in studio")
                            }
                            OutlinedButton(onClick = { clipboard.setText(AnnotatedString(settings.prompt)); repo.report("Prompt copied") }) {
                                Icon(Icons.Filled.ContentCopy, contentDescription = null, Modifier.size(16.dp))
                                Text("  Copy")
                            }
                        }
                        Spacer(Modifier.weight(1f))
                        TextButton(onClick = onDismiss) { Text("Close") }
                    }
                }
            }
        }
    }
}

/**
 * The account the API key belongs to, laid out like the profile on the site: a
 * banner (the profile cover when the catalogue shares it, else the newest posted
 * picture), the profile picture, and the profile's own tabs — models, posts,
 * pictures, collections — newest first. Posts are rebuilt from the picture feed
 * (the public API has none), and collections can only be searched by name, never
 * listed by owner, so the tab searches public collections and links to the
 * person's own on the site.
 */
@Composable
private fun CivitaiAccount(repo: Repository, onUsePrompt: (PromptSettings) -> Unit) {
    var me by remember { mutableStateOf<CivitaiMe?>(null) }
    var error by remember { mutableStateOf("") }
    var loadingMe by remember { mutableStateOf(true) }
    var tab by remember { mutableStateOf(0) }
    var models by remember { mutableStateOf<List<CivitaiModel>>(emptyList()) }
    var modelsCursor by remember { mutableStateOf("") }
    var posts by remember { mutableStateOf<List<CivitaiPost>>(emptyList()) }
    var postsCursor by remember { mutableStateOf("") }
    var images by remember { mutableStateOf<List<CivitaiImage>>(emptyList()) }
    var imagesCursor by remember { mutableStateOf("") }
    var collections by remember { mutableStateOf<List<CivitaiCollection>>(emptyList()) }
    var collectionsCursor by remember { mutableStateOf("") }
    var collectionQuery by remember { mutableStateOf("") }
    var collectionSort by remember { mutableStateOf("newest") }
    var openCollection by remember { mutableStateOf<CivitaiCollection?>(null) }
    var collectionImages by remember { mutableStateOf<List<CivitaiImage>>(emptyList()) }
    var collectionImagesCursor by remember { mutableStateOf("") }
    var openPost by remember { mutableStateOf<CivitaiPost?>(null) }
    var loading by remember { mutableStateOf(false) }
    var picked by remember { mutableStateOf<CivitaiImage?>(null) }
    var detailId by remember { mutableStateOf(0L) }
    var detailSeed by remember { mutableStateOf<CivitaiModel?>(null) }
    val scope = rememberCoroutineScope()

    suspend fun loadModels(reset: Boolean) {
        val user = me?.username ?: return
        loading = true
        runCatching { repo.api.civitaiSearch(creator = user, sort = "newest", cursor = if (reset) null else modelsCursor.ifBlank { null }) }
            .onSuccess { res -> models = (if (reset) res.items else models + res.items).distinctBy { it.id }; modelsCursor = res.nextCursor }
            .onFailure { error = it.message ?: "Couldn't load the models" }
        loading = false
    }
    suspend fun loadPosts(reset: Boolean) {
        val user = me?.username ?: return
        loading = true
        runCatching { repo.api.civitaiPosts(username = user, cursor = if (reset) null else postsCursor.ifBlank { null }) }
            .onSuccess { res -> posts = if (reset) res.items.distinctBy { it.id } else mergeCivitaiPosts(posts, res.items); postsCursor = res.nextCursor }
            .onFailure { error = it.message ?: "Couldn't load the posts" }
        loading = false
    }
    suspend fun loadImages(reset: Boolean) {
        val user = me?.username ?: return
        loading = true
        runCatching { repo.api.civitaiImages(username = user, sort = "newest", cursor = if (reset) null else imagesCursor.ifBlank { null }) }
            .onSuccess { res -> images = (if (reset) res.items else images + res.items).distinctBy { it.id }; imagesCursor = res.nextCursor }
            .onFailure { error = it.message ?: "Couldn't load the pictures" }
        loading = false
    }
    suspend fun loadCollections(reset: Boolean) {
        loading = true
        runCatching { repo.api.civitaiCollections(q = collectionQuery.ifBlank { null }, sort = collectionSort, cursor = if (reset) null else collectionsCursor.ifBlank { null }) }
            .onSuccess { res -> collections = (if (reset) res.items else collections + res.items).distinctBy { it.id }; collectionsCursor = res.nextCursor }
            .onFailure { error = it.message ?: "Couldn't load the collections" }
        loading = false
    }
    suspend fun loadCollectionImages(c: CivitaiCollection, reset: Boolean) {
        loading = true
        runCatching { repo.api.civitaiImages(collectionId = c.id, sort = "newest", cursor = if (reset) null else collectionImagesCursor.ifBlank { null }) }
            .onSuccess { res -> collectionImages = (if (reset) res.items else collectionImages + res.items).distinctBy { it.id }; collectionImagesCursor = res.nextCursor }
            .onFailure { error = it.message ?: "Couldn't load the collection" }
        loading = false
    }
    suspend fun loadTab() {
        error = ""
        when (tab) {
            0 -> if (models.isEmpty()) loadModels(reset = true)
            1 -> if (posts.isEmpty()) loadPosts(reset = true)
            2 -> if (images.isEmpty()) loadImages(reset = true)
            else -> if (collections.isEmpty()) loadCollections(reset = true)
        }
    }

    LaunchedEffect(Unit) {
        runCatching { repo.api.civitaiMe() }
            .onSuccess { me = it }
            .onFailure { error = it.message ?: "No account to show" }
        loadingMe = false
        // The newest picture stands in for a cover the API keeps to itself.
        loadImages(reset = true)
        loadTab()
    }

    val m = me
    if (loadingMe) {
        Box(Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        return
    }
    if (m == null) {
        Text(
            "${error.ifBlank { "No account to show." }}\nAdd your Civitai API key under Settings → Image generation and this page shows your models, posts, pictures and collections.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(16.dp),
        )
        return
    }

    Column(Modifier.fillMaxSize()) {
        // The banner, with the profile picture over its bottom edge.
        val cover = m.cover.ifBlank { images.firstOrNull()?.url ?: "" }
        Box(Modifier.fillMaxWidth().padding(top = 6.dp, bottom = 8.dp)) {
            Box(
                Modifier.fillMaxWidth().aspectRatio(3f).clip(RoundedCornerShape(14.dp)).background(MaterialTheme.colorScheme.surfaceVariant),
            ) {
                if (cover.isNotEmpty()) {
                    AsyncImage(
                        model = repo.civitaiImageUrl(cover),
                        imageLoader = repo.imageLoader,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize(),
                    )
                }
                Row(
                    Modifier.align(Alignment.BottomStart).fillMaxWidth().background(Color.Black.copy(alpha = .45f)).padding(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    if (m.image.isNotEmpty()) {
                        AsyncImage(
                            model = repo.civitaiImageUrl(m.image),
                            imageLoader = repo.imageLoader,
                            contentDescription = null,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.size(44.dp).clip(RoundedCornerShape(22.dp)),
                        )
                    }
                    Text(m.username, style = MaterialTheme.typography.titleMedium, color = Color.White)
                }
            }
        }
        Row(Modifier.horizontalScroll(rememberScrollState()).padding(bottom = 6.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("Models", "Posts", "Images", "Collections").forEachIndexed { i, label ->
                FilterChip(
                    selected = tab == i,
                    onClick = { tab = i; openPost = null; openCollection = null; scope.launch { loadTab() } },
                    label = { Text(label) },
                )
            }
        }
        if (error.isNotEmpty()) Text(error, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)

        val post = openPost
        val coll = openCollection
        when {
            tab == 1 && post != null -> {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = { openPost = null }) { Icon(Icons.Filled.ArrowBack, contentDescription = "All posts") }
                    Text(
                        "${post.images.size} picture${if (post.images.size == 1) "" else "s"}${post.dateLabel().let { if (it.isEmpty()) "" else " · $it" }}",
                        style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                CivitaiImageGrid(repo, post.images, loading = false, cursor = "", onMore = {}, onPick = { picked = it }, empty = "")
            }
            tab == 3 && coll != null -> {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = { openCollection = null }) { Icon(Icons.Filled.ArrowBack, contentDescription = "Collections") }
                    Column(Modifier.weight(1f)) {
                        Text(coll.name, style = MaterialTheme.typography.labelLarge, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(
                            "${if (coll.username.isNotEmpty()) "by ${coll.username} · " else ""}${coll.count} item${if (coll.count == 1L) "" else "s"}",
                            style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                CivitaiImageGrid(
                    repo, collectionImages, loading = loading, cursor = collectionImagesCursor,
                    onMore = { scope.launch { loadCollectionImages(coll, reset = false) } }, onPick = { picked = it },
                    empty = "Nothing the feed will show for this collection.",
                )
            }
            tab == 0 -> LazyVerticalGrid(
                columns = GridCells.Adaptive(minSize = 130.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.fillMaxSize(),
            ) {
                items(models, key = { it.id }) { mod -> CivitaiModelCard(repo, mod) { detailSeed = mod; detailId = mod.id } }
                if (!loading && modelsCursor.isNotEmpty()) {
                    item(span = { GridItemSpan(maxLineSpan) }) {
                        OutlinedButton(onClick = { scope.launch { loadModels(reset = false) } }, modifier = Modifier.fillMaxWidth()) { Text("More models") }
                    }
                }
                if (loading) item(span = { GridItemSpan(maxLineSpan) }) {
                    Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
                }
                if (!loading && models.isEmpty()) item(span = { GridItemSpan(maxLineSpan) }) {
                    Text("No models published. Uploading goes through civitai.com itself — the site has no public API for it.",
                        style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(16.dp))
                }
            }
            tab == 1 -> LazyVerticalGrid(
                columns = GridCells.Adaptive(minSize = 130.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.fillMaxSize(),
            ) {
                items(posts, key = { it.id }) { p ->
                    Surface(shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.surfaceVariant, modifier = Modifier.clickable { openPost = p }) {
                        Column {
                            p.images.firstOrNull()?.let { first ->
                                CivitaiImageTile(repo, first, onClick = { openPost = p }, badge = if (p.images.size > 1) "${p.images.size} pictures" else null)
                            }
                            Text(
                                p.dateLabel().ifBlank { "Post" },
                                style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp),
                            )
                        }
                    }
                }
                if (!loading && postsCursor.isNotEmpty()) {
                    item(span = { GridItemSpan(maxLineSpan) }) {
                        OutlinedButton(onClick = { scope.launch { loadPosts(reset = false) } }, modifier = Modifier.fillMaxWidth()) { Text("More posts") }
                    }
                }
                if (loading) item(span = { GridItemSpan(maxLineSpan) }) {
                    Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
                }
                if (!loading && posts.isEmpty()) item(span = { GridItemSpan(maxLineSpan) }) {
                    Text("No posts.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(16.dp))
                }
            }
            tab == 2 -> CivitaiImageGrid(
                repo, images, loading = loading, cursor = imagesCursor,
                onMore = { scope.launch { loadImages(reset = false) } }, onPick = { picked = it }, empty = "No posted pictures.",
            )
            else -> {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    OutlinedTextField(
                        value = collectionQuery,
                        onValueChange = { collectionQuery = it },
                        placeholder = { Text("Search public collections…") },
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                    )
                    IconButton(onClick = { scope.launch { loadCollections(reset = true) } }) {
                        Icon(Icons.Filled.Search, contentDescription = "Search")
                    }
                }
                Row(Modifier.horizontalScroll(rememberScrollState()).padding(vertical = 6.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("newest" to "Newest", "followers" to "Most followed").forEach { (id, label) ->
                        FilterChip(selected = collectionSort == id, onClick = { collectionSort = id; scope.launch { loadCollections(reset = true) } }, label = { Text(label) })
                    }
                }
                Text(
                    "Civitai's public API lists collections by name only, never by owner — your own are at civitai.com/user/${m.username}/collections. Image and post collections open here.",
                    style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(bottom = 6.dp),
                )
                LazyColumn(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(collections, key = { it.id }) { c ->
                        Surface(
                            shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.surfaceVariant,
                            modifier = Modifier.clickable(enabled = c.openable) { scope.launch { openCollection = c; loadCollectionImages(c, reset = true) } },
                        ) {
                            Row(Modifier.padding(8.dp), horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
                                if (c.cover.isNotEmpty()) {
                                    AsyncImage(
                                        model = repo.civitaiImageUrl(c.cover), imageLoader = repo.imageLoader, contentDescription = null,
                                        contentScale = ContentScale.Crop, modifier = Modifier.size(56.dp).clip(RoundedCornerShape(8.dp)),
                                    )
                                } else {
                                    Box(Modifier.size(56.dp).clip(RoundedCornerShape(8.dp)).background(MaterialTheme.colorScheme.surface))
                                }
                                Column(Modifier.weight(1f)) {
                                    Text(c.name + if (c.nsfw) "  18+" else "", style = MaterialTheme.typography.labelLarge, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                    Text(
                                        "${c.type} · ${c.count} item${if (c.count == 1L) "" else "s"}${if (c.username.isNotEmpty()) " · by ${c.username}" else ""}${if (c.openable) "" else " · not listable"}",
                                        style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        maxLines = 1, overflow = TextOverflow.Ellipsis,
                                    )
                                }
                            }
                        }
                    }
                    if (!loading && collectionsCursor.isNotEmpty()) {
                        item { OutlinedButton(onClick = { scope.launch { loadCollections(reset = false) } }, modifier = Modifier.fillMaxWidth()) { Text("More collections") } }
                    }
                    if (loading) item { Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator() } }
                    if (!loading && collections.isEmpty()) {
                        item { Text("No collections matched.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(16.dp)) }
                    }
                }
            }
        }
    }

    picked?.let { img -> CivitaiPickedDialog(repo, img, onUsePrompt = { onUsePrompt(it); picked = null }, onDismiss = { picked = null }) }
    if (detailId != 0L) {
        CivitaiDetailDialog(
            repo = repo, id = detailId, seed = detailSeed, nsfw = true,
            onInstall = { mod, v ->
                scope.launch {
                    runCatching { repo.api.civitaiInstall(CivitaiInstallRequest(v.downloadUrl, mod.id, v.id)) }
                        .onSuccess { repo.report("InvokeAI is downloading the model; its cover and description follow") }
                        .onFailure { repo.report(it.message ?: "Couldn't start the install") }
                }
            },
            onUsePrompt = onUsePrompt,
            onCreator = { detailId = 0L },
            onTag = { detailId = 0L },
            onDismiss = { detailId = 0L },
        )
    }
}

/** A grid of pictures with a "more" button; a tile opens the picture and its prompt. */
@Composable
private fun CivitaiImageGrid(
    repo: Repository,
    images: List<CivitaiImage>,
    loading: Boolean,
    cursor: String,
    onMore: () -> Unit,
    onPick: (CivitaiImage) -> Unit,
    empty: String,
) {
    LazyVerticalGrid(
        columns = GridCells.Adaptive(minSize = 110.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier.fillMaxSize(),
    ) {
        items(images, key = { it.id }) { img -> CivitaiImageTile(repo, img, onClick = { onPick(img) }) }
        if (!loading && cursor.isNotEmpty()) {
            item(span = { GridItemSpan(maxLineSpan) }) {
                OutlinedButton(onClick = onMore, modifier = Modifier.fillMaxWidth()) { Text("More") }
            }
        }
        if (loading) item(span = { GridItemSpan(maxLineSpan) }) {
            Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        }
        if (!loading && images.isEmpty() && empty.isNotEmpty()) item(span = { GridItemSpan(maxLineSpan) }) {
            Text(empty, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(16.dp))
        }
    }
}

/** One model of the catalogue as a card: first preview, name, type and base. */
@Composable
private fun CivitaiModelCard(repo: Repository, m: CivitaiModel, onClick: () -> Unit) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surfaceVariant,
        modifier = Modifier.clickable(onClick = onClick),
    ) {
        Column {
            Box {
                val img = m.versions.firstOrNull()?.images?.firstOrNull()
                if (img != null) {
                    AsyncImage(
                        model = repo.civitaiImageUrl(img),
                        imageLoader = repo.imageLoader,
                        contentDescription = m.name,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxWidth().aspectRatio(3f / 4f),
                    )
                } else {
                    Box(Modifier.fillMaxWidth().aspectRatio(3f / 4f)) {}
                }
                if (m.installed) {
                    Text(
                        "Installed",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onPrimary,
                        modifier = Modifier
                            .padding(6.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(MaterialTheme.colorScheme.primary)
                            .padding(horizontal = 6.dp, vertical = 2.dp),
                    )
                }
            }
            Text(
                m.name,
                style = MaterialTheme.typography.labelMedium,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            )
            Text(
                "${typeLabel(m.type)} · ${m.versions.firstOrNull()?.base ?: ""} · ⤓ ${m.downloads}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(start = 8.dp, end = 8.dp, bottom = 6.dp),
            )
        }
    }
}

/**
 * The studio's models seen from Civitai's side: matched by file hash, with the
 * catalogue's cover, description and trigger words a tap away, and a note when a
 * newer version has been published. Tapping a linked model opens its management
 * sheet: the version to follow, the cover to use, an update, deletion.
 */
@Composable
private fun CivitaiInstalledList(repo: Repository, onJobs: () -> Unit) {
    var models by remember { mutableStateOf<List<CivitaiInstalled>>(emptyList()) }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    var syncing by remember { mutableStateOf("") }
    var zoomed by remember { mutableStateOf("") }
    var managing by remember { mutableStateOf<CivitaiInstalled?>(null) }
    var deleting by remember { mutableStateOf<CivitaiInstalled?>(null) }
    val scope = rememberCoroutineScope()

    suspend fun load(refresh: Boolean) {
        loading = true
        error = ""
        runCatching { repo.api.civitaiInstalled(if (refresh) "1" else null) }
            .onSuccess { models = it.models.distinctBy { m -> m.key } }
            .onFailure { error = it.message ?: "Couldn't read the studio's models" }
        loading = false
    }
    LaunchedEffect(Unit) { load(refresh = false) }

    fun sync(m: CivitaiInstalled, versionId: Long = 0) {
        scope.launch {
            syncing = m.key
            runCatching { repo.api.civitaiSync(CivitaiSyncRequest(m.key, versionId)) }
                .onSuccess { link ->
                    repo.report(
                        if (link.modelId > 0) "${m.name}: cover, description and trigger words set from “${link.modelName}”"
                        else "${m.name}: Civitai does not know this file",
                    )
                    load(refresh = false)
                }
                .onFailure { repo.report(it.message ?: "Couldn't fetch from Civitai") }
            syncing = ""
        }
    }

    fun delete(m: CivitaiInstalled) {
        scope.launch {
            runCatching { repo.api.deleteModel(m.key) }
                .onSuccess {
                    repo.report("${m.name} deleted")
                    models = models.filter { it.key != m.key }
                    if (managing?.key == m.key) managing = null
                }
                .onFailure { repo.report(it.message ?: "Couldn't delete the model") }
            deleting = null
        }
    }

    Row(Modifier.fillMaxWidth().padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(
            "Matched to Civitai by file hash. Fetch writes the catalogue's cover, description and trigger words onto the InvokeAI record; tap a model for its version and cover.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.weight(1f),
        )
        IconButton(onClick = { scope.launch { load(refresh = true) } }, enabled = !loading) {
            Icon(Icons.Filled.Refresh, contentDescription = "Check Civitai again")
        }
    }
    if (error.isNotEmpty()) Text(error, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
    if (loading && models.isEmpty()) {
        Box(Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
    }
    LazyColumn(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        items(models, key = { it.key }) { m ->
            val c = m.civitai
            Surface(
                shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.surfaceVariant,
                modifier = Modifier.clickable(enabled = c != null) { managing = m },
            ) {
                Row(Modifier.padding(8.dp), horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
                    val thumb = if (m.hasCover) (if (m.type == "lora") repo.loraThumbUrl(m.name) else repo.modelThumbUrl(m.key)) else null
                    if (thumb != null) {
                        AsyncImage(
                            model = thumb,
                            imageLoader = repo.imageLoader,
                            contentDescription = null,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.size(56.dp, 74.dp).clip(RoundedCornerShape(8.dp)),
                        )
                    } else {
                        Box(Modifier.size(56.dp, 74.dp).clip(RoundedCornerShape(8.dp)).background(MaterialTheme.colorScheme.surface))
                    }
                    Column(Modifier.weight(1f)) {
                        Text(m.name, style = MaterialTheme.typography.labelLarge, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(
                            buildString {
                                append(m.type)
                                if (m.base.isNotEmpty()) append(" · ${m.base}")
                                if (c != null) {
                                    append(" · ${c.modelName}")
                                    if (c.versionName.isNotEmpty()) append(" (${c.versionName})")
                                    if (c.creator.isNotEmpty()) append(" by ${c.creator}")
                                } else append(" · not found on Civitai")
                            },
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                        )
                        if (c?.updateAvailable == true) {
                            Text("Newer version on Civitai — tap to update", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                        }
                        if (c != null && c.previews.isNotEmpty()) {
                            Row(Modifier.horizontalScroll(rememberScrollState()).padding(top = 4.dp), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                c.previews.take(6).forEach { u ->
                                    AsyncImage(
                                        model = repo.civitaiImageUrl(u),
                                        imageLoader = repo.imageLoader,
                                        contentDescription = null,
                                        contentScale = ContentScale.Crop,
                                        modifier = Modifier.size(32.dp, 42.dp).clip(RoundedCornerShape(6.dp)).clickable { zoomed = u },
                                    )
                                }
                            }
                        }
                    }
                    IconButton(onClick = { sync(m) }, enabled = syncing != m.key) {
                        if (syncing == m.key) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                        else Icon(Icons.Filled.Sync, contentDescription = "Fetch from Civitai")
                    }
                    if (c != null) {
                        IconButton(onClick = { managing = m }) { Icon(Icons.Filled.Tune, contentDescription = "Version and cover") }
                    } else {
                        IconButton(onClick = { deleting = m }) { Icon(Icons.Filled.Delete, contentDescription = "Delete from InvokeAI") }
                    }
                }
            }
        }
        if (!loading && models.isEmpty() && error.isEmpty()) {
            item {
                Text("InvokeAI lists no models.", style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(16.dp))
            }
        }
    }
    if (zoomed.isNotEmpty()) {
        Dialog(onDismissRequest = { zoomed = "" }, properties = DialogProperties(usePlatformDefaultWidth = false)) {
            AsyncImage(
                model = repo.civitaiImageUrl(zoomed),
                imageLoader = repo.imageLoader,
                contentDescription = null,
                contentScale = ContentScale.Fit,
                modifier = Modifier.fillMaxSize().background(Color.Black).clickable { zoomed = "" },
            )
        }
    }
    managing?.let { m ->
        CivitaiManageDialog(
            repo = repo,
            model = m,
            busy = syncing == m.key,
            onSync = { versionId -> sync(m, versionId) },
            onUpdated = { managing = null; onJobs(); scope.launch { load(refresh = false) } },
            onCoverSet = { scope.launch { load(refresh = false) } },
            onDelete = { deleting = m },
            onDismiss = { managing = null },
        )
    }
    deleting?.let { m ->
        AlertDialog(
            onDismissRequest = { deleting = null },
            title = { Text("Delete ${if (m.type == "lora") "LoRA" else "model"}?") },
            text = { Text("“${m.name}” is removed from InvokeAI, and its file with it.") },
            confirmButton = { TextButton(onClick = { delete(m) }) { Text("Delete") } },
            dismissButton = { TextButton(onClick = { deleting = null }) { Text("Cancel") } },
        )
    }
}

/**
 * One installed model's management sheet: every version the catalogue lists, an
 * update to another one (InvokeAI downloads it, then the current file is
 * deleted), a link to another version without downloading, and the showcase
 * pictures of the chosen version to pick a cover from.
 */
@Composable
private fun CivitaiManageDialog(
    repo: Repository,
    model: CivitaiInstalled,
    busy: Boolean,
    onSync: (versionId: Long) -> Unit,
    onUpdated: () -> Unit,
    onCoverSet: () -> Unit,
    onDelete: () -> Unit,
    onDismiss: () -> Unit,
) {
    val c = model.civitai ?: return
    var page by remember { mutableStateOf<CivitaiModel?>(null) }
    var error by remember { mutableStateOf("") }
    var versionId by remember { mutableStateOf(c.versionId) }
    var working by remember { mutableStateOf(false) }
    var confirmUpdate by remember { mutableStateOf<CivitaiVersion?>(null) }
    var cover by remember { mutableStateOf(c.coverUrl.ifBlank { c.previews.firstOrNull() ?: "" }) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(c.modelId) {
        runCatching { repo.api.civitaiModel(c.modelId) }
            .onSuccess { page = it }
            .onFailure { error = it.message ?: "Couldn't load the model page" }
    }

    fun setCover(url: String) {
        if (working) return
        working = true
        scope.launch {
            runCatching { repo.api.civitaiCover(CivitaiCoverRequest(model.key, url)) }
                .onSuccess { cover = url; repo.report("${model.name}: cover set"); onCoverSet() }
                .onFailure { error = it.message ?: "Couldn't set the cover" }
            working = false
        }
    }

    fun update(v: CivitaiVersion) {
        if (working) return
        working = true
        scope.launch {
            runCatching { repo.api.civitaiUpdate(CivitaiUpdateRequest(model.key, v.id)) }
                .onSuccess { repo.report("${model.name}: downloading ${v.name}; the current file goes once it is in"); onUpdated() }
                .onFailure { error = it.message ?: "Couldn't start the update" }
            working = false
            confirmUpdate = null
        }
    }

    confirmUpdate?.let { v ->
        AlertDialog(
            onDismissRequest = { confirmUpdate = null },
            title = { Text("Update to ${v.name}?") },
            text = { Text("InvokeAI downloads version ${v.name} of “${c.modelName}”, then the current file is deleted.") },
            confirmButton = { TextButton(onClick = { update(v) }, enabled = !working) { Text("Update") } },
            dismissButton = { TextButton(onClick = { confirmUpdate = null }) { Text("Cancel") } },
        )
    }

    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Surface(shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth(0.94f).fillMaxHeight(0.92f)) {
            val p = page
            Column(Modifier.fillMaxSize()) {
                Column(
                    Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text(model.name, style = MaterialTheme.typography.titleMedium)
                    Text(
                        "${c.modelName}${if (c.versionName.isNotEmpty()) " · ${c.versionName}" else ""}${if (c.creator.isNotEmpty()) " · by ${c.creator}" else ""}",
                        style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    if (error.isNotEmpty()) Text(error, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                    if (p == null && error.isEmpty()) {
                        Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
                    }
                    if (p != null) {
                        val v = p.versions.find { it.id == versionId } ?: p.versions.firstOrNull()
                        val current = v?.id == c.versionId
                        Text("Version", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            p.versions.forEach { ver ->
                                FilterChip(
                                    selected = v?.id == ver.id,
                                    onClick = { versionId = ver.id },
                                    leadingIcon = if (ver.id == c.versionId) ({ Icon(Icons.Filled.Check, null, Modifier.size(14.dp)) }) else null,
                                    label = { Text("${ver.name} · ${ver.base}") },
                                )
                            }
                        }
                        if (v != null && !current) {
                            Button(onClick = { confirmUpdate = v }, enabled = !working && !busy && v.downloadUrl.isNotEmpty()) {
                                Icon(Icons.Filled.Download, contentDescription = null, Modifier.size(16.dp))
                                Text("  Install ${v.name}, replacing the current file")
                            }
                            OutlinedButton(onClick = { onSync(v.id) }, enabled = !working && !busy) {
                                Text("Link to ${v.name} without downloading")
                            }
                        }
                        if (v != null && v.images.isNotEmpty()) {
                            Text(
                                if (current) "Cover" else "Cover (from ${v.name})",
                                style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            // A wrapped grid inside the scrolling column: rows of three.
                            v.images.chunked(3).forEach { row ->
                                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    row.forEach { u ->
                                        Box(
                                            Modifier.weight(1f).aspectRatio(3f / 4f).clip(RoundedCornerShape(10.dp))
                                                .background(MaterialTheme.colorScheme.surfaceVariant)
                                                .clickable(enabled = !working) { setCover(u) },
                                        ) {
                                            AsyncImage(
                                                model = repo.civitaiImageUrl(u), imageLoader = repo.imageLoader, contentDescription = null,
                                                contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize(),
                                            )
                                            if (u == cover) {
                                                Icon(
                                                    Icons.Filled.Check, contentDescription = "Current cover",
                                                    tint = MaterialTheme.colorScheme.onPrimary,
                                                    modifier = Modifier.align(Alignment.TopEnd).padding(4.dp).size(20.dp)
                                                        .clip(RoundedCornerShape(10.dp)).background(MaterialTheme.colorScheme.primary).padding(2.dp),
                                                )
                                            }
                                        }
                                    }
                                    repeat(3 - row.size) { Spacer(Modifier.weight(1f)) }
                                }
                            }
                        } else if (v != null) {
                            Text("This version has no showcase pictures.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
                Row(
                    Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    TextButton(onClick = onDelete) { Text("Delete", color = MaterialTheme.colorScheme.error) }
                    Spacer(Modifier.weight(1f))
                    if (working || busy) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                    TextButton(onClick = onDismiss) { Text("Close") }
                }
            }
        }
    }
}

private fun typeLabel(t: String): String = when (t) {
    "LORA" -> "LoRA"
    "TextualInversion" -> "Embedding"
    "Controlnet" -> "ControlNet"
    else -> t
}

private fun fmtSize(mb: Long): String = if (mb >= 1024) String.format("%.1f GB", mb / 1024.0) else "$mb MB"
