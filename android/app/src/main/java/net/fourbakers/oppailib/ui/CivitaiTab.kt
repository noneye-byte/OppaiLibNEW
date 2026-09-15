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
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material.icons.filled.AutoAwesome
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
import net.fourbakers.oppailib.data.CivitaiImage
import net.fourbakers.oppailib.data.CivitaiInstallRequest
import net.fourbakers.oppailib.data.CivitaiInstalled
import net.fourbakers.oppailib.data.CivitaiModel
import net.fourbakers.oppailib.data.CivitaiPrompt
import net.fourbakers.oppailib.data.CivitaiSyncRequest
import net.fourbakers.oppailib.data.CivitaiVersion
import net.fourbakers.oppailib.data.InstallJob
import net.fourbakers.oppailib.data.PromptSettings
import net.fourbakers.oppailib.data.Repository

private val civitaiTypes = listOf(
    "" to "All", "checkpoint" to "Checkpoints", "lora" to "LoRAs", "embedding" to "Embeddings",
    "vae" to "VAEs", "controlnet" to "ControlNet", "upscaler" to "Upscalers",
)
private val civitaiSorts = listOf(
    "" to "Most downloaded", "rated" to "Highest rated", "liked" to "Most liked", "newest" to "Newest",
    "collected" to "Most collected",
)
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
 * it, whose prompts can be handed straight to the Create tab. Installed is the
 * studio's models seen from the catalogue's side, matched by file hash, with the
 * cover, description and trigger words one tap away. Installing hands a version to
 * InvokeAI; the server dresses the model once the download completes.
 */
@Composable
fun CivitaiTab(repo: Repository, onUsePrompt: (PromptSettings) -> Unit) {
    var page by remember { mutableStateOf(0) }
    var jobs by remember { mutableStateOf<List<InstallJob>>(emptyList()) }
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
            listOf("Browse", "Installed").forEachIndexed { i, label ->
                SegmentedButton(
                    selected = page == i,
                    onClick = { page = i },
                    shape = SegmentedButtonDefaults.itemShape(index = i, count = 2),
                ) { Text(label) }
            }
        }
        jobs.forEach { j ->
            val pct = if (j.totalBytes > 0) " ${(j.bytes * 100 / j.totalBytes)}%" else ""
            Text(
                "⤓ ${j.status}$pct — ${j.error.ifBlank { j.source }}",
                style = MaterialTheme.typography.labelSmall,
                color = if (j.status == "error") MaterialTheme.colorScheme.error
                else MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(top = 4.dp),
            )
        }
        when (page) {
            0 -> CivitaiBrowse(repo, onInstall = ::install, onUsePrompt = onUsePrompt)
            else -> CivitaiInstalledList(repo)
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
            items = if (reset) res.items else items + res.items
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
    if (showFilters) {
        Row(Modifier.horizontalScroll(rememberScrollState()).padding(bottom = 6.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            civitaiSorts.forEach { (id, label) ->
                FilterChip(selected = sort == id, onClick = { sort = id; scope.launch { search(reset = true) } }, label = { Text(label) })
            }
        }
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
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = MaterialTheme.colorScheme.surfaceVariant,
                modifier = Modifier.clickable { detailSeed = m; detailId = m.id },
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
    var picked by remember { mutableStateOf<CivitaiImage?>(null) }
    val scope = rememberCoroutineScope()
    val clipboard = LocalClipboardManager.current

    suspend fun load(reset: Boolean) {
        loading = true
        runCatching {
            repo.api.civitaiImages(versionId = versionId, nsfw = if (nsfw) null else "0", cursor = if (reset) null else cursor.ifBlank { null })
        }.onSuccess { res ->
            images = if (reset) res.items else images + res.items
            cursor = res.nextCursor
        }.onFailure { repo.report(it.message ?: "Couldn't load the pictures") }
        loading = false
    }
    LaunchedEffect(versionId) { load(reset = true) }

    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Surface(shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth(0.94f).fillMaxHeight(0.92f)) {
            Column(Modifier.fillMaxSize().padding(12.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Posted pictures", style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                    IconButton(onClick = onDismiss) { Icon(Icons.Filled.Close, contentDescription = "Close") }
                }
                LazyVerticalGrid(
                    columns = GridCells.Adaptive(minSize = 110.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.weight(1f),
                ) {
                    items(images, key = { it.id }) { img ->
                        Box(Modifier.clip(RoundedCornerShape(10.dp)).clickable { picked = img }) {
                            AsyncImage(
                                model = repo.civitaiImageUrl(img.url),
                                imageLoader = repo.imageLoader,
                                contentDescription = null,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxWidth().aspectRatio(3f / 4f),
                            )
                            if (img.prompt.isNotBlank()) {
                                Text(
                                    "prompt",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = Color.White,
                                    modifier = Modifier.align(Alignment.BottomEnd).padding(6.dp)
                                        .clip(RoundedCornerShape(6.dp)).background(Color.Black.copy(alpha = .6f))
                                        .padding(horizontal = 6.dp, vertical = 2.dp),
                                )
                            }
                        }
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

    picked?.let { img ->
        val settings = CivitaiPrompt.from(img)
        Dialog(onDismissRequest = { picked = null }, properties = DialogProperties(usePlatformDefaultWidth = false)) {
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
                        TextButton(onClick = { picked = null }) { Text("Close") }
                    }
                }
            }
        }
    }
}

/**
 * The studio's models seen from Civitai's side: matched by file hash, with the
 * catalogue's cover, description and trigger words a tap away, and a note when a
 * newer version has been published.
 */
@Composable
private fun CivitaiInstalledList(repo: Repository) {
    var models by remember { mutableStateOf<List<CivitaiInstalled>>(emptyList()) }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    var syncing by remember { mutableStateOf("") }
    var zoomed by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()

    suspend fun load(refresh: Boolean) {
        loading = true
        error = ""
        runCatching { repo.api.civitaiInstalled(if (refresh) "1" else null) }
            .onSuccess { models = it.models }
            .onFailure { error = it.message ?: "Couldn't read the studio's models" }
        loading = false
    }
    LaunchedEffect(Unit) { load(refresh = false) }

    fun sync(m: CivitaiInstalled) {
        scope.launch {
            syncing = m.key
            runCatching { repo.api.civitaiSync(CivitaiSyncRequest(m.key)) }
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

    Row(Modifier.fillMaxWidth().padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(
            "Matched to Civitai by file hash. Fetch writes the catalogue's cover, description and trigger words onto the InvokeAI record.",
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
            Surface(shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.surfaceVariant) {
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
                            Text("Newer version on Civitai", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
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
}

private fun typeLabel(t: String): String = when (t) {
    "LORA" -> "LoRA"
    "TextualInversion" -> "Embedding"
    "Controlnet" -> "ControlNet"
    else -> t
}

private fun fmtSize(mb: Long): String = if (mb >= 1024) String.format("%.1f GB", mb / 1024.0) else "$mb MB"
