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
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Save
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import coil.compose.AsyncImage
import kotlinx.coroutines.launch
import net.fourbakers.oppailib.data.GalleryBoard
import net.fourbakers.oppailib.data.GalleryBoardRequest
import net.fourbakers.oppailib.data.GalleryImage
import net.fourbakers.oppailib.data.GalleryNamesRequest
import net.fourbakers.oppailib.data.LibbyMeter
import net.fourbakers.oppailib.data.LibbyVoice
import net.fourbakers.oppailib.data.GallerySaveRequest
import net.fourbakers.oppailib.data.Repository

private const val PAGE = 40

/**
 * The InvokeAI gallery on the phone: the images the generator itself keeps,
 * grouped into its boards. Tap to expand; from there save into the library or
 * delete from the generator. [refreshKey] bumps after a generation so fresh
 * images appear without leaving the screen.
 *
 * The open board is hoisted ([board] / [onBoardChange]) because it is also the
 * destination for new generations: whatever gallery you have open here is where
 * the Create tab files what it makes.
 */
@Composable
fun InvokeGalleryTab(
    repo: Repository,
    refreshKey: Int,
    board: String,
    onBoardChange: (String) -> Unit,
    onSaved: () -> Unit,
) {
    var boards by remember { mutableStateOf<List<GalleryBoard>>(emptyList()) }
    var items by remember { mutableStateOf<List<GalleryImage>>(emptyList()) }
    var total by remember { mutableStateOf(0) }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    var expanded by remember { mutableStateOf<GalleryImage?>(null) }
    var savedNames by remember { mutableStateOf<Set<String>>(emptySet()) }
    var selecting by remember { mutableStateOf(false) }
    var selected by remember { mutableStateOf<Set<String>>(emptySet()) }
    var moveMenuOpen by remember { mutableStateOf(false) }
    var confirmDeleteBoard by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    suspend fun loadPage(reset: Boolean) {
        loading = true
        runCatching {
            val offset = if (reset) 0 else items.size
            val page = repo.api.galleryImages(board, offset, PAGE)
            items = if (reset) page.items else items + page.items
            total = page.total
        }.onFailure { error = it.message ?: "Couldn't load the gallery" }
        loading = false
    }

    LaunchedEffect(refreshKey, board) {
        error = ""
        runCatching { repo.api.galleryBoards() }
            .onSuccess { res ->
                boards = res.boards
                if (res.boards.none { it.id == board } && res.boards.isNotEmpty()) {
                    onBoardChange(res.boards.first().id)
                }
            }
            .onFailure { error = it.message ?: "Couldn't load the gallery" }
        loadPage(reset = true)
    }

    fun delete(img: GalleryImage) {
        scope.launch {
            runCatching { repo.api.deleteGalleryImage(img.name) }
                .onSuccess {
                    items = items.filter { it.name != img.name }
                    total = maxOf(0, total - 1)
                    if (expanded?.name == img.name) expanded = null
                    LibbyVoice.react(LibbyVoice.Event.GALLERY_DELETE).let { repo.report(it.message, it.emotion) }
                }
                .onFailure { repo.report(it.message ?: "Couldn't delete the image") }
        }
    }

    fun save(img: GalleryImage) {
        if (img.name in savedNames) return
        scope.launch {
            runCatching { repo.api.saveGalleryImage(GallerySaveRequest(name = img.name)) }
                .onSuccess {
                    savedNames = savedNames + img.name
                    LibbyMeter.bump() // adding to the library warms Libby up
                    LibbyVoice.react(LibbyVoice.Event.SAVE).let { repo.report(it.message, it.emotion) }
                    onSaved()
                }
                .onFailure { repo.report(it.message ?: "Couldn't save the image") }
        }
    }

    fun deleteSelected() {
        val names = selected.toList()
        if (names.isEmpty()) return
        scope.launch {
            runCatching { repo.api.deleteGalleryImages(GalleryNamesRequest(names)) }
                .onSuccess {
                    items = items.filter { it.name !in selected }
                    total = maxOf(0, total - names.size)
                    selected = emptySet()
                    selecting = false
                    LibbyVoice.react(LibbyVoice.Event.GALLERY_DELETE, count = names.size)
                        .let { repo.report(it.message, it.emotion) }
                }
                .onFailure { repo.report(it.message ?: "Couldn't delete the images") }
        }
    }

    fun addSelectedToBoard(targetBoard: String) {
        val names = selected.toList()
        if (names.isEmpty() || targetBoard == board) return
        scope.launch {
            runCatching { repo.api.addGalleryImagesToBoard(GalleryBoardRequest(targetBoard, names)) }
                .onSuccess {
                    items = items.filter { it.name !in selected }
                    total = maxOf(0, total - names.size)
                    selected = emptySet()
                    selecting = false
                    repo.report("Moved to gallery", "happy")
                }
                .onFailure { repo.report(it.message ?: "Couldn't move the images") }
        }
    }

    // Deletes the currently-viewed board. Its images aren't lost — the server hands
    // them back to Uncategorized — then we drop to that pile and reload.
    fun deleteBoard() {
        val target = board
        if (target == "none") return
        scope.launch {
            runCatching { repo.api.deleteGalleryBoard(target) }
                .onSuccess {
                    items = emptyList()
                    onBoardChange("none") // triggers the reload that refreshes the board list
                    LibbyVoice.react(LibbyVoice.Event.GALLERY_DELETE).let { repo.report(it.message, it.emotion) }
                }
                .onFailure { repo.report(it.message ?: "Couldn't delete the gallery") }
        }
    }

    Column(Modifier.fillMaxSize().padding(horizontal = 14.dp)) {
        // Select / done toggle, and the batch action bar while selecting.
        if (items.isNotEmpty()) {
            Row(
                Modifier.fillMaxWidth().padding(top = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                if (selecting) {
                    Text(
                        "${selected.size} selected",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Box {
                        OutlinedButton(
                            onClick = { moveMenuOpen = true },
                            enabled = selected.isNotEmpty() && boards.any { it.id != board },
                        ) { Text("Add to gallery") }
                        androidx.compose.material3.DropdownMenu(
                            expanded = moveMenuOpen,
                            onDismissRequest = { moveMenuOpen = false },
                        ) {
                            boards.filter { it.id != board }.forEach { b ->
                                androidx.compose.material3.DropdownMenuItem(
                                    text = { Text(b.name) },
                                    onClick = { moveMenuOpen = false; addSelectedToBoard(b.id) },
                                )
                            }
                        }
                    }
                    IconButton(onClick = { deleteSelected() }, enabled = selected.isNotEmpty()) {
                        Icon(Icons.Filled.Delete, contentDescription = "Delete selected",
                            tint = MaterialTheme.colorScheme.error)
                    }
                }
                androidx.compose.material3.TextButton(
                    onClick = { selecting = !selecting; if (!selecting) selected = emptySet() },
                    modifier = Modifier.padding(start = if (selecting) 0.dp else 0.dp),
                ) { Text(if (selecting) "Done" else "Select") }
            }
        }
        if (boards.size > 1) {
            Row(
                Modifier.fillMaxWidth().padding(vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(
                    Modifier.weight(1f).horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    boards.forEach { b ->
                        FilterChip(
                            selected = board == b.id,
                            onClick = { if (board != b.id) { items = emptyList(); onBoardChange(b.id) } },
                            label = { Text(if (b.count > 0) "${b.name} · ${b.count}" else b.name) },
                        )
                    }
                }
                // "none" is the Uncategorized pile, not a real board — it can't be deleted.
                if (board != "none") {
                    IconButton(onClick = { confirmDeleteBoard = true }) {
                        Icon(
                            Icons.Filled.Delete,
                            contentDescription = "Delete this gallery",
                            tint = MaterialTheme.colorScheme.error,
                        )
                    }
                }
            }
        }
        Text(
            "New generations are filed into ${boards.find { it.id == board }?.name ?: "this gallery"}.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(bottom = 4.dp),
        )
        if (error.isNotEmpty()) {
            Text(error, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
        }
        if (items.isEmpty() && !loading) {
            Text(
                "Nothing here yet — generated images land in this gallery.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(vertical = 20.dp),
            )
        }
        LazyVerticalGrid(
            columns = GridCells.Adaptive(minSize = 100.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.weight(1f),
        ) {
            items(items, key = { it.name }) { img ->
                val picked = img.name in selected
                Box(
                    Modifier
                        .aspectRatio(1f)
                        .clip(RoundedCornerShape(10.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant)
                        .clickable {
                            if (selecting) {
                                selected = if (picked) selected - img.name else selected + img.name
                            } else {
                                expanded = img
                            }
                        },
                ) {
                    AsyncImage(
                        model = repo.galleryThumbUrl(img.name),
                        imageLoader = repo.imageLoader,
                        contentDescription = "Generated image",
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize().then(
                            if (picked) Modifier.padding(0.dp) else Modifier,
                        ),
                    )
                    if (selecting) {
                        Box(
                            Modifier
                                .padding(4.dp)
                                .size(22.dp)
                                .clip(RoundedCornerShape(11.dp))
                                .background(
                                    if (picked) MaterialTheme.colorScheme.primary
                                    else Color.Black.copy(alpha = 0.5f),
                                )
                                .align(Alignment.TopStart),
                            contentAlignment = Alignment.Center,
                        ) {
                            if (picked) {
                                Icon(
                                    Icons.Filled.Check,
                                    contentDescription = "Selected",
                                    tint = MaterialTheme.colorScheme.onPrimary,
                                    modifier = Modifier.size(15.dp),
                                )
                            }
                        }
                    }
                }
            }
            if (!loading && items.size < total) {
                item(span = { androidx.compose.foundation.lazy.grid.GridItemSpan(maxLineSpan) }) {
                    OutlinedButton(
                        onClick = { scope.launch { loadPage(reset = false) } },
                        modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
                    ) { Text("Load more (${total - items.size} left)") }
                }
            }
            if (loading) {
                item(span = { androidx.compose.foundation.lazy.grid.GridItemSpan(maxLineSpan) }) {
                    Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator()
                    }
                }
            }
        }
    }

    if (confirmDeleteBoard) {
        val name = boards.find { it.id == board }?.name ?: "this gallery"
        androidx.compose.material3.AlertDialog(
            onDismissRequest = { confirmDeleteBoard = false },
            title = { Text("Delete gallery?") },
            text = { Text("“$name” will be removed. Its images move back to Uncategorized.") },
            confirmButton = {
                androidx.compose.material3.TextButton(onClick = { confirmDeleteBoard = false; deleteBoard() }) {
                    Text("Delete", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                androidx.compose.material3.TextButton(onClick = { confirmDeleteBoard = false }) { Text("Cancel") }
            },
        )
    }

    expanded?.let { img ->
        val saved = img.name in savedNames
        Dialog(onDismissRequest = { expanded = null }) {
            Column(
                Modifier
                    .clip(RoundedCornerShape(16.dp))
                    .background(Color.Black)
                    .padding(bottom = 8.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                AsyncImage(
                    model = repo.galleryFullUrl(img.name),
                    imageLoader = repo.imageLoader,
                    contentDescription = "Generated image",
                    contentScale = ContentScale.Fit,
                    modifier = Modifier.fillMaxWidth(),
                )
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Button(onClick = { save(img) }, enabled = !saved) {
                        Icon(if (saved) Icons.Filled.Check else Icons.Filled.Save, contentDescription = null,
                            Modifier.size(16.dp))
                        Text(if (saved) "  In library" else "  Save")
                    }
                    IconButton(onClick = { delete(img) }) {
                        Icon(Icons.Filled.Delete, contentDescription = "Delete", tint = MaterialTheme.colorScheme.error)
                    }
                    IconButton(onClick = { expanded = null }) {
                        Icon(Icons.Filled.Close, contentDescription = "Close", tint = Color.White)
                    }
                }
            }
        }
    }
}
