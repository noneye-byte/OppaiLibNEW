package net.fourbakers.oppailib.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import coil.compose.AsyncImage
import kotlinx.coroutines.launch
import net.fourbakers.oppailib.data.CivitaiInstallRequest
import net.fourbakers.oppailib.data.CivitaiCategory
import net.fourbakers.oppailib.data.CivitaiModel
import net.fourbakers.oppailib.data.CivitaiVersion
import net.fourbakers.oppailib.data.InstallJob
import net.fourbakers.oppailib.data.Repository

/**
 * The Civitai catalogue on the phone (via the server's civitai.red proxy).
 * Search checkpoints and LoRAs, open one for its previews and trigger words, and
 * hand a version to InvokeAI to install; running downloads show at the top.
 */
@Composable
fun CivitaiTab(repo: Repository) {
    var query by remember { mutableStateOf("") }
    var type by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("") }
    var categories by remember { mutableStateOf<List<CivitaiCategory>>(emptyList()) }
    var items by remember { mutableStateOf<List<CivitaiModel>>(emptyList()) }
    var cursor by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    var detail by remember { mutableStateOf<CivitaiModel?>(null) }
    var jobs by remember { mutableStateOf<List<InstallJob>>(emptyList()) }
    val scope = rememberCoroutineScope()

    suspend fun search(reset: Boolean) {
        loading = true
        error = ""
        runCatching {
            repo.api.civitaiSearch(
                q = query.ifBlank { null },
                type = type.ifBlank { null },
                category = category.ifBlank { null },
                cursor = if (reset) null else cursor.ifBlank { null },
            )
        }.onSuccess { res ->
            items = if (reset) res.items else items + res.items
            cursor = res.nextCursor
        }.onFailure { error = it.message ?: "Civitai is unreachable" }
        loading = false
    }

    suspend fun pollJobs() {
        runCatching { repo.api.civitaiInstalls() }
            .onSuccess { jobs = it.jobs.filter { j -> j.status != "cancelled" }.take(4) }
    }

    LaunchedEffect(Unit) {
        runCatching { repo.api.civitaiCategories() }.onSuccess { categories = it.categories.take(20) }
        search(reset = true)
        pollJobs()
    }

    fun install(v: CivitaiVersion) {
        scope.launch {
            runCatching { repo.api.civitaiInstall(CivitaiInstallRequest(v.downloadUrl)) }
                .onSuccess {
                    repo.report("InvokeAI is downloading the model")
                    pollJobs()
                }
                .onFailure { repo.report(it.message ?: "Couldn't start the install") }
        }
    }

    Column(Modifier.fillMaxSize().padding(horizontal = 14.dp)) {
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
            listOf("" to "All", "checkpoint" to "Checkpoints", "lora" to "LoRAs").forEach { (id, label) ->
                FilterChip(
                    selected = type == id,
                    onClick = { type = id; scope.launch { search(reset = true) } },
                    label = { Text(label) },
                )
            }
        }
        if (categories.isNotEmpty()) {
            Row(
                Modifier.horizontalScroll(rememberScrollState()).padding(bottom = 6.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                FilterChip(
                    selected = category.isEmpty(),
                    onClick = { category = ""; scope.launch { search(reset = true) } },
                    label = { Text("All categories") },
                )
                categories.forEach { c ->
                    FilterChip(
                        selected = category == c.name,
                        onClick = { category = c.name; scope.launch { search(reset = true) } },
                        label = { Text(c.name) },
                    )
                }
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
            )
        }
        if (error.isNotEmpty()) {
            Text(error, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
        }
        LazyVerticalGrid(
            columns = GridCells.Adaptive(minSize = 130.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            modifier = Modifier.weight(1f).padding(top = 4.dp),
        ) {
            items(items, key = { it.id }) { m ->
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant,
                    modifier = Modifier.clickable { detail = m },
                ) {
                    Column {
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
                        Text(
                            m.name,
                            style = MaterialTheme.typography.labelMedium,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        )
                        Text(
                            "${m.type} · ⤓ ${m.downloads}",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
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
    }

    detail?.let { m ->
        CivitaiDetailDialog(repo, m, onInstall = { install(it) }, onDismiss = { detail = null })
    }
}

@Composable
private fun CivitaiDetailDialog(
    repo: Repository,
    m: CivitaiModel,
    onInstall: (CivitaiVersion) -> Unit,
    onDismiss: () -> Unit,
) {
    var version by remember { mutableStateOf(m.versions.firstOrNull()) }
    Dialog(onDismissRequest = onDismiss) {
        Surface(shape = RoundedCornerShape(16.dp)) {
            Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(m.name, style = MaterialTheme.typography.titleMedium)
                Text(
                    "${m.type}${if (m.creator.isNotEmpty()) " · by ${m.creator}" else ""} · ⤓ ${m.downloads}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                version?.images?.firstOrNull()?.let { img ->
                    AsyncImage(
                        model = repo.civitaiImageUrl(img),
                        imageLoader = repo.imageLoader,
                        contentDescription = m.name,
                        contentScale = ContentScale.Fit,
                        modifier = Modifier
                            .fillMaxWidth()
                            .aspectRatio(3f / 4f)
                            .clip(RoundedCornerShape(12.dp))
                            .background(MaterialTheme.colorScheme.surfaceVariant),
                    )
                }
                if (m.versions.size > 1) {
                    Row(
                        Modifier.horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        m.versions.forEach { v ->
                            FilterChip(
                                selected = version?.id == v.id,
                                onClick = { version = v },
                                label = { Text("${v.name} · ${v.base}") },
                            )
                        }
                    }
                }
                version?.takeIf { it.trainedWords.isNotEmpty() }?.let { v ->
                    Text(
                        "Triggers: ${v.trainedWords.joinToString(", ")}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    version?.let { v ->
                        Button(onClick = { onInstall(v); onDismiss() }, enabled = v.downloadUrl.isNotEmpty()) {
                            Icon(Icons.Filled.Download, contentDescription = null, Modifier.size(16.dp))
                            Text(if (v.sizeMB > 0) "  Install (${v.sizeMB} MB)" else "  Install")
                        }
                    }
                    TextButton(onClick = onDismiss) { Text("Close") }
                }
            }
        }
    }
}
