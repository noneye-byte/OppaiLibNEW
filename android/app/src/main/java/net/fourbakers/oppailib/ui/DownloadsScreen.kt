package net.fourbakers.oppailib.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import net.fourbakers.oppailib.work.DownloadItem
import net.fourbakers.oppailib.work.DownloadQueue
import net.fourbakers.oppailib.work.DownloadWorker
import net.fourbakers.oppailib.work.statusLabel

/** Persistent downloads destination and queue controls. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DownloadsScreen(onBack: () -> Unit) {
    BackHandler(onBack = onBack)
    val context = LocalContext.current
    val downloads by DownloadQueue.items.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Downloads") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
    ) { padding ->
        if (downloads.isEmpty()) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Filled.Download, contentDescription = null)
                    Text("No downloads yet", modifier = Modifier.padding(top = 8.dp))
                }
            }
        } else {
            LazyColumn(Modifier.fillMaxSize().padding(padding)) {
                items(downloads.sortedByDescending { it.addedAt }, key = { it.id }) { item ->
                    DownloadRow(
                        item = item,
                        onOpen = { DownloadWorker.open(context, item) },
                        onPause = { DownloadQueue.pause(item.id) },
                        onResume = { DownloadQueue.resume(item.id); DownloadWorker.start(context) },
                        onRemove = { DownloadWorker.remove(context, item) },
                    )
                    HorizontalDivider()
                }
            }
        }
    }
}

@Composable
private fun DownloadRow(
    item: DownloadItem,
    onOpen: () -> Unit,
    onPause: () -> Unit,
    onResume: () -> Unit,
    onRemove: () -> Unit,
) {
    Column(Modifier.fillMaxWidth()) {
        ListItem(
            headlineContent = { Text(item.name, maxLines = 1, overflow = TextOverflow.Ellipsis) },
            supportingContent = {
                val detail = buildString {
                    append(item.statusLabel())
                    if (item.downloadedBytes > 0 || item.size > 0) {
                        append(" · ").append(formatBytes(item.downloadedBytes))
                        if (item.size > 0) append(" / ").append(formatBytes(item.size))
                    }
                    if (item.bytesPerSecond > 0) append(" · ").append(formatBytes(item.bytesPerSecond)).append("/s")
                    if (item.etaSeconds > 0) append(" · ").append(formatEta(item.etaSeconds)).append(" left")
                }
                Column {
                    Text(detail, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    item.error?.takeIf { it.isNotBlank() }?.let {
                        Text(it, color = MaterialTheme.colorScheme.error, maxLines = 2)
                    }
                }
            },
            leadingContent = { Icon(Icons.Filled.Download, contentDescription = null) },
            trailingContent = {
                Row(horizontalArrangement = Arrangement.End, verticalAlignment = Alignment.CenterVertically) {
                    when (item.state) {
                        DownloadItem.STATE_DOWNLOADING -> IconButton(onClick = onPause) {
                            Icon(Icons.Filled.Pause, contentDescription = "Pause")
                        }
                        DownloadItem.STATE_QUEUED, DownloadItem.STATE_PAUSED -> IconButton(onClick = onResume) {
                            Icon(Icons.Filled.PlayArrow, contentDescription = "Resume")
                        }
                        DownloadItem.STATE_FAILED -> IconButton(onClick = onResume) {
                            Icon(Icons.Filled.Refresh, contentDescription = "Retry")
                        }
                    }
                    IconButton(onClick = onRemove) { Icon(Icons.Filled.Delete, contentDescription = "Remove") }
                }
            },
            modifier = Modifier.clickable(
                enabled = item.state == DownloadItem.STATE_COMPLETED && item.path != null,
                onClick = onOpen,
            ),
        )
        if (item.live && item.size > 0) {
            LinearProgressIndicator(
                progress = { item.progress },
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
            )
        }
    }
}

private fun formatBytes(bytes: Long): String = when {
    bytes >= 1L shl 30 -> "%.1f GB".format(bytes / (1L shl 30).toDouble())
    bytes >= 1L shl 20 -> "%.1f MB".format(bytes / (1L shl 20).toDouble())
    bytes >= 1L shl 10 -> "%.0f KB".format(bytes / (1L shl 10).toDouble())
    else -> "$bytes B"
}

private fun formatEta(seconds: Long): String = when {
    seconds >= 3600 -> "${seconds / 3600}h ${(seconds % 3600) / 60}m"
    seconds >= 60 -> "${seconds / 60}m ${seconds % 60}s"
    else -> "${seconds}s"
}
