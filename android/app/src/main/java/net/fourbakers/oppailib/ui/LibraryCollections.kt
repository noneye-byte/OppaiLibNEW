package net.fourbakers.oppailib.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.foundation.lazy.grid.rememberLazyGridState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.PlaylistAdd
import androidx.compose.material.icons.filled.Bookmarks
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CreateNewFolder
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.OpenInFull
import androidx.compose.material.icons.filled.RemoveCircleOutline
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import kotlinx.coroutines.launch
import net.fourbakers.oppailib.data.CollectionMediaIds
import net.fourbakers.oppailib.data.CollectionName
import net.fourbakers.oppailib.data.Media
import net.fourbakers.oppailib.data.MediaCollection
import net.fourbakers.oppailib.data.Repository
import net.fourbakers.oppailib.data.serverMessage

/**
 * Collections: named, ordered lists of items, kept on the server so the phone and the
 * web hold the same ones. The list is a grid of covers; one opened is its items, in its
 * order, with rename and delete in its bar.
 */
@Composable
internal fun CollectionsPane(
    repo: Repository,
    state: LibraryState,
    onOpenItem: (Media, List<Media>) -> Unit,
    onHold: (Media) -> Unit,
) {
    val open = state.openCollection
    if (open != null) {
        CollectionPage(repo, open, onBack = { state.openCollection = null; state.collectionsStale++ }, onOpenItem = onOpenItem, onChanged = { state.openCollection = it })
        return
    }
    var list by remember { mutableStateOf<List<MediaCollection>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var naming by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    LaunchedEffect(state.collectionsStale) {
        runCatching { repo.web.collections().items }
            .onSuccess { list = it; error = null }
            .onFailure { error = it.serverMessage("Couldn't load the collections.") }
    }
    if (naming) NameDialog(
        title = "New collection",
        initial = "",
        confirm = "Create",
        onDismiss = { naming = false },
        onDone = { name ->
            naming = false
            scope.launch {
                runCatching { repo.web.createCollection(CollectionName(name)) }
                    .onSuccess { state.collectionsStale++ }
                    .onFailure { repo.report(it.serverMessage("Couldn't make that collection.")) }
            }
        },
    )
    val items = list
    when {
        items == null && error == null -> Box(Modifier.fillMaxSize(), Alignment.Center) { CircularProgressIndicator() }
        items == null -> EmptyNote(error ?: "", action = { TextButton(onClick = { state.collectionsStale++ }) { Text("Try again") } })
        else -> LazyVerticalGrid(
            columns = GridCells.Adaptive(minSize = 156.dp),
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 24.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            item(span = { GridItemSpan(maxLineSpan) }) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        if (items.isEmpty()) "Lists of your own, in the order you put them" else "${items.size} ${if (items.size == 1) "collection" else "collections"}",
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.weight(1f),
                    )
                    ToolButton(Icons.Filled.CreateNewFolder, "New collection", { naming = true }, label = "New")
                }
            }
            if (items.isEmpty()) item(span = { GridItemSpan(maxLineSpan) }) {
                EmptyNote("No collections yet. Make one here, or hold anything in the library and choose “Add to collection”.", icon = Icons.Filled.Bookmarks)
            }
            items(items, key = { it.id }) { c -> CollectionCard(repo, c) { state.openCollection = c } }
        }
    }
}

@Composable
private fun CollectionCard(repo: Repository, c: MediaCollection, onClick: () -> Unit) {
    Column(Modifier.clickable(onClick = onClick)) {
        Box(
            Modifier.fillMaxWidth().aspectRatio(4f / 3f).clip(RoundedCornerShape(14.dp)).background(MaterialTheme.colorScheme.surfaceContainer),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Filled.Bookmarks, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f), modifier = Modifier.size(36.dp))
            if (c.cover > 0) AsyncImage(
                model = repo.thumbUrl(c.cover),
                imageLoader = repo.imageLoader,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                // A cover is a picture from the library; safe view cannot see its tags
                // from here, so it veils every cover while it is on.
                modifier = Modifier.fillMaxSize().veil(net.fourbakers.oppailib.ui.theme.Appearance.safe),
            )
            VeilMark(net.fourbakers.oppailib.ui.theme.Appearance.safe, 22.dp)
        }
        Text(c.name.ifBlank { "Untitled" }, style = MaterialTheme.typography.titleSmall, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 8.dp, start = 2.dp))
        Text("${c.count} ${if (c.count == 1) "item" else "items"}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(start = 2.dp))
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CollectionPage(
    repo: Repository,
    c: MediaCollection,
    onBack: () -> Unit,
    onOpenItem: (Media, List<Media>) -> Unit,
    onChanged: (MediaCollection) -> Unit,
) {
    var items by remember(c.id) { mutableStateOf<List<Media>>(emptyList()) }
    var total by remember(c.id) { mutableIntStateOf(0) }
    var loading by remember(c.id) { mutableStateOf(true) }
    var renaming by remember { mutableStateOf(false) }
    var deleting by remember { mutableStateOf(false) }
    var held by remember { mutableStateOf<Media?>(null) }
    val scope = rememberCoroutineScope()
    val grid = rememberLazyGridState()
    androidx.activity.compose.BackHandler(onBack = onBack)

    fun loadMore() {
        if (loading && items.isNotEmpty()) return
        loading = true
        scope.launch {
            runCatching { repo.web.collectionItems(c.id, 60, items.size) }
                .onSuccess { page ->
                    val have = items.mapTo(HashSet()) { it.id }
                    items = items + page.items.filter { it.id !in have }
                    total = page.total
                }
                .onFailure { repo.report(it.serverMessage("Couldn't load that collection.")) }
            loading = false
        }
    }
    LaunchedEffect(c.id) { loadMore() }
    val nearEnd by remember { derivedStateOf { (grid.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0) >= items.size - 20 } }
    LaunchedEffect(nearEnd, items.size) { if (nearEnd && items.size < total && !loading) loadMore() }

    if (renaming) NameDialog("Rename collection", c.name, "Rename", onDismiss = { renaming = false }) { name ->
        renaming = false
        scope.launch {
            runCatching { repo.web.renameCollection(c.id, CollectionName(name)) }
                .onSuccess { onChanged(c.copy(name = name)) }
                .onFailure { repo.report(it.serverMessage("Couldn't rename it.")) }
        }
    }
    if (deleting) AlertDialog(
        onDismissRequest = { deleting = false },
        title = { Text("Delete “${c.name}”?") },
        text = { Text("The collection goes; everything in it stays in the library.") },
        confirmButton = {
            TextButton(onClick = {
                deleting = false
                scope.launch {
                    runCatching { repo.web.deleteCollection(c.id) }
                        .onSuccess { onBack() }
                        .onFailure { repo.report(it.serverMessage("Couldn't delete it.")) }
                }
            }) { Text("Delete", color = MaterialTheme.colorScheme.error) }
        },
        dismissButton = { TextButton(onClick = { deleting = false }) { Text("Cancel") } },
    )
    held?.let { m ->
        ModalBottomSheet(onDismissRequest = { held = null }) {
            Column(Modifier.padding(horizontal = 12.dp).padding(bottom = 16.dp)) {
                Text(m.title.ifBlank { "Library item ${m.id}" }, style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(12.dp))
                LitRow(Icons.Filled.OpenInFull, "Open", false, { held = null; onOpenItem(m, items) })
                LitRow(Icons.Filled.RemoveCircleOutline, "Take it out of “${c.name}”", false, {
                    held = null
                    scope.launch {
                        runCatching { repo.web.removeFromCollection(c.id, m.id) }
                            .onSuccess { items = items.filterNot { it.id == m.id }; total = (total - 1).coerceAtLeast(0) }
                            .onFailure { repo.report(it.serverMessage("Couldn't take it out.")) }
                    }
                }, danger = true)
            }
        }
    }

    Column(Modifier.fillMaxSize()) {
        Row(Modifier.fillMaxWidth().padding(start = 4.dp, end = 12.dp, top = 2.dp, bottom = 6.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back to collections") }
            Column(Modifier.weight(1f)) {
                Text(c.name.ifBlank { "Untitled" }, style = MaterialTheme.typography.titleMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text("$total ${if (total == 1) "item" else "items"}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            ToolButton(Icons.Filled.Edit, "Rename", { renaming = true })
            Spacer(Modifier.width(6.dp))
            ToolButton(Icons.Filled.Delete, "Delete collection", { deleting = true }, tint = MaterialTheme.colorScheme.error)
        }
        when {
            loading && items.isEmpty() -> Box(Modifier.fillMaxSize(), Alignment.Center) { CircularProgressIndicator() }
            items.isEmpty() -> EmptyNote("Nothing in here yet. Hold anything in the library and choose “Add to collection”.", icon = Icons.AutoMirrored.Filled.PlaylistAdd)
            else -> LazyVerticalGrid(
                state = grid,
                columns = GridCells.Adaptive(minSize = 132.dp),
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(start = 12.dp, end = 12.dp, bottom = 24.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                itemsIndexed(items, key = { _, m -> m.id }) { _, m ->
                    MediaTile(repo, m, onClick = { onOpenItem(m, items) }, onLongClick = { held = m })
                }
            }
        }
    }
}

/**
 * "Add to collection…": every collection, ticked where the items already are when it is
 * one item, and a new one made on the spot.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun AddToCollectionSheet(repo: Repository, ids: List<Long>, onDismiss: () -> Unit, onAdded: () -> Unit = {}) {
    var list by remember { mutableStateOf<List<MediaCollection>?>(null) }
    var already by remember { mutableStateOf<Set<Long>>(emptySet()) }
    var naming by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    LaunchedEffect(Unit) {
        list = runCatching { repo.web.collections().items }.getOrDefault(emptyList())
        if (ids.size == 1) already = runCatching { repo.web.collectionsOf(ids[0]).items.map { it.id }.toSet() }.getOrDefault(emptySet())
    }
    fun addTo(id: Long, name: String) {
        scope.launch {
            runCatching { repo.web.addToCollection(id, CollectionMediaIds(ids)) }
                .onSuccess { r ->
                    repo.report(if (r.added == 0) "Already in “$name”." else "Added to “$name”.", "happy")
                    onAdded()
                    onDismiss()
                }
                .onFailure { repo.report(it.serverMessage("Couldn't add to that collection.")) }
        }
    }
    if (naming) NameDialog("New collection", "", "Create and add", onDismiss = { naming = false }) { name ->
        naming = false
        scope.launch {
            runCatching { repo.web.createCollection(CollectionName(name)) }
                .onSuccess { addTo(it.id, name) }
                .onFailure { repo.report(it.serverMessage("Couldn't make that collection.")) }
        }
    }
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(Modifier.padding(horizontal = 12.dp).padding(bottom = 16.dp)) {
            Text(
                if (ids.size == 1) "Add to collection" else "Add ${ids.size} items to a collection",
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(12.dp),
            )
            LitRow(Icons.Filled.CreateNewFolder, "New collection…", false, { naming = true })
            val l = list
            if (l == null) Box(Modifier.fillMaxWidth().height(80.dp), Alignment.Center) { CircularProgressIndicator(Modifier.size(24.dp)) }
            else l.forEach { c ->
                val inIt = c.id in already
                LitRow(if (inIt) Icons.Filled.Check else Icons.Filled.Bookmarks, c.name.ifBlank { "Untitled" }, inIt, { addTo(c.id, c.name) }, note = "${c.count}")
            }
        }
    }
}

/** A one-field dialog for a name. */
@Composable
internal fun NameDialog(title: String, initial: String, confirm: String, onDismiss: () -> Unit, onDone: (String) -> Unit) {
    var name by remember { mutableStateOf(initial) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = { OutlinedTextField(value = name, onValueChange = { name = it }, singleLine = true, label = { Text("Name") }) },
        confirmButton = { TextButton(enabled = name.isNotBlank(), onClick = { onDone(name.trim()) }) { Text(confirm) } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}
