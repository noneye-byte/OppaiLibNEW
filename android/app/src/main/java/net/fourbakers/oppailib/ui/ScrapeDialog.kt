package net.fourbakers.oppailib.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import kotlinx.coroutines.launch
import net.fourbakers.oppailib.data.Repository
import net.fourbakers.oppailib.data.ScrapeImportRequest
import net.fourbakers.oppailib.data.ScrapeResult
import net.fourbakers.oppailib.data.UrlRequest
import net.fourbakers.oppailib.work.ImportWorker

@Composable
fun ScrapeDialog(repo: Repository, onDismiss: () -> Unit, onImported: () -> Unit) {
    var url by remember { mutableStateOf("") }
    var result by remember { mutableStateOf<ScrapeResult?>(null) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val chosen = remember { mutableStateMapOf<String, Boolean>() }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Import from URL") },
        text = {
            Column {
                Row {
                    OutlinedTextField(
                        value = url, onValueChange = { url = it },
                        label = { Text("Page URL") }, singleLine = true,
                        modifier = Modifier.weight(1f),
                    )
                    Button(
                        onClick = {
                            error = null; busy = true
                            scope.launch {
                                try {
                                    val r = repo.api.scrape(UrlRequest(url))
                                    result = r
                                    chosen.clear(); r.mediaUrls.forEach { chosen[it] = true }
                                } catch (e: Exception) { error = e.message } finally { busy = false }
                            }
                        },
                        enabled = !busy && url.isNotBlank(),
                        modifier = Modifier.padding(start = 8.dp),
                    ) { Text("Fetch") }
                }
                error?.let { Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 8.dp)) }
                if (busy) CircularProgressIndicator(modifier = Modifier.padding(top = 12.dp))
                result?.let { r ->
                    Text(r.title.ifBlank { "(untitled)" }, style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(top = 8.dp))
                    if (r.mediaUrls.isEmpty()) {
                        Text("No media found on that page.", style = MaterialTheme.typography.bodySmall)
                    } else {
                        LazyVerticalGrid(
                            columns = GridCells.Adaptive(70.dp),
                            modifier = Modifier.fillMaxWidth().heightIn(max = 220.dp).padding(top = 8.dp),
                        ) {
                            items(r.mediaUrls) { mu ->
                                val sel = chosen[mu] == true
                                AsyncImage(
                                    model = mu,
                                    contentDescription = null,
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier.padding(3.dp).aspectRatio(1f)
                                        .clip(RoundedCornerShape(8.dp))
                                        .border(2.dp, if (sel) MaterialTheme.colorScheme.primary else Color.Transparent, RoundedCornerShape(8.dp))
                                        .background(MaterialTheme.colorScheme.surfaceVariant)
                                        .clickable { chosen[mu] = !sel },
                                )
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                enabled = !busy && (result?.mediaUrls?.any { chosen[it] == true } == true),
                onClick = {
                    val r = result ?: return@Button
                    // The server fetches each chosen image itself, politely — a gallery of
                    // fifty takes minutes and says nothing until it's done. So the import
                    // is handed to a worker and the dialog closes: it finishes whether or
                    // not the app is still on screen, and the notification reports it.
                    ImportWorker.scrapeImport(
                        context,
                        req = ScrapeImportRequest(
                            url = url,
                            mediaUrls = r.mediaUrls.filter { chosen[it] == true },
                            title = r.title,
                            tags = r.tags,
                            categorizedTags = r.categorizedTags,
                        ),
                        label = r.title.ifBlank { "Import" },
                    )
                    onImported()
                },
            ) { Text("Import") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}
