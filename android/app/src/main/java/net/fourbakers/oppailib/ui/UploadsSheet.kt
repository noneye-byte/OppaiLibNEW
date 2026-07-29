package net.fourbakers.oppailib.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDownward
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import net.fourbakers.oppailib.data.Repository
import net.fourbakers.oppailib.work.UploadItem
import net.fourbakers.oppailib.work.UploadQueue
import net.fourbakers.oppailib.work.UploadWorker
import net.fourbakers.oppailib.work.label

/**
 * The upload manager.
 *
 * It exists because an upload used to be invisible: it ran inside whatever screen
 * started it, so there was nowhere to see whether it was still going, how far it had
 * got, or why it had stopped. This is that place — the same queue the worker is
 * draining, read straight from its state, so what is on screen is what is happening
 * rather than a copy that can drift.
 *
 * Every row carries what someone waiting actually wants: the file, its size, how far
 * through it is, what state it is in, how many retries it has cost, and — when it
 * failed — the server's own words rather than "upload failed".
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UploadsSheet(repo: Repository, onDismiss: () -> Unit, onOpenMedia: (Long) -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val items by UploadQueue.items.collectAsState()
    var wifiOnly by remember { mutableStateOf(repo.prefs.uploadWifiOnly) }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(Modifier.padding(horizontal = 16.dp).padding(bottom = 24.dp)) {
            Text("Uploads", style = MaterialTheme.typography.titleLarge)
            Text(
                if (items.any { it.live }) "Uploading one at a time, in order."
                else "Nothing is uploading right now.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            Row(
                Modifier.fillMaxWidth().padding(vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(Modifier.weight(1f)) {
                    Text("Wi-Fi only", style = MaterialTheme.typography.bodyMedium)
                    Text(
                        "Uploads wait for an unmetered connection instead of using mobile data.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Switch(
                    checked = wifiOnly,
                    onCheckedChange = {
                        wifiOnly = it
                        repo.prefs.uploadWifiOnly = it
                        // Re-enqueued so the new constraint applies to work already
                        // waiting, rather than only to the next thing added.
                        if (UploadQueue.hasPending()) UploadWorker.start(context)
                    },
                )
            }

            HorizontalDivider()

            // Bounded on purpose: an unbounded lazy list inside a sheet asks for
            // infinite height, and a fifty-file queue would push the controls below it
            // off the screen.
            LazyColumn(Modifier.fillMaxWidth().heightIn(max = 420.dp)) {
                items(items, key = { it.id }) { item ->
                    UploadRow(
                        item = item,
                        onPause = { UploadQueue.pause(item.id); UploadWorker.stop(context) },
                        onResume = { UploadQueue.resume(item.id); UploadWorker.start(context) },
                        onRetry = { UploadQueue.retry(item.id); UploadWorker.start(context) },
                        onCancel = {
                            UploadQueue.cancel(item.id)
                            // Tell the server too, so the staged chunks are reclaimed
                            // now rather than sitting on its cache volume until the
                            // sweeper notices them.
                            item.sessionId?.let { id ->
                                scope.launch { runCatching { repo.api.cancelUploadSession(id) } }
                            }
                        },
                        onRemove = { UploadQueue.remove(item.id) },
                        onMove = { direction -> UploadQueue.move(item.id, direction) },
                        onOpen = { item.mediaId.takeIf { it > 0 }?.let(onOpenMedia) },
                    )
                    HorizontalDivider()
                }
            }

            if (items.any { it.terminal }) {
                TextButton(onClick = { UploadQueue.clearFinished() }) { Text("Clear finished") }
            }
        }
    }
}

@Composable
private fun UploadRow(
    item: UploadItem,
    onPause: () -> Unit,
    onResume: () -> Unit,
    onRetry: () -> Unit,
    onCancel: () -> Unit,
    onRemove: () -> Unit,
    onMove: (Int) -> Unit,
    onOpen: () -> Unit,
) {
    Column(Modifier.fillMaxWidth().padding(vertical = 10.dp)) {
        Text(item.name, maxLines = 1, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.bodyMedium)

        if (item.live || item.state == UploadItem.STATE_COMPLETED) {
            LinearProgressIndicator(
                progress = { item.progress },
                modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
            )
        }

        Text(
            buildString {
                append(item.label())
                append(" · ")
                append(humanBytes(item.sentBytes))
                append(" of ")
                append(humanBytes(item.size))
                append(" (")
                append((item.progress * 100).toInt())
                append("%)")
                if (item.mime.isNotBlank()) {
                    append(" · ")
                    append(item.mime)
                }
                append(" · Library")
                if (item.bytesPerSecond > 0) {
                    append(" · ")
                    append(humanBytes(item.bytesPerSecond))
                    append("/s")
                }
                if (item.etaSeconds > 0) {
                    append(" · ")
                    append(humanDuration(item.etaSeconds))
                    append(" left")
                }
                if (item.retries > 0) {
                    append(" · ")
                    append(item.retries)
                    append(if (item.retries == 1) " retry" else " retries")
                }
            },
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        item.error?.let {
            Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
        }

        Row(verticalAlignment = Alignment.CenterVertically) {
            if (item.state == UploadItem.STATE_UPLOADING ||
                item.state == UploadItem.STATE_QUEUED ||
                item.state == UploadItem.STATE_PREPARING
            ) {
                IconButton(onClick = onPause) { Icon(Icons.Filled.Pause, contentDescription = "Pause") }
            }
            if (item.state == UploadItem.STATE_PAUSED) {
                IconButton(onClick = onResume) { Icon(Icons.Filled.PlayArrow, contentDescription = "Resume") }
            }
            if (item.state == UploadItem.STATE_FAILED) {
                IconButton(onClick = onRetry) { Icon(Icons.Filled.Refresh, contentDescription = "Retry") }
            }
            if (item.state == UploadItem.STATE_QUEUED || item.state == UploadItem.STATE_PAUSED) {
                IconButton(onClick = { onMove(-1) }) { Icon(Icons.Filled.ArrowUpward, contentDescription = "Move up") }
                IconButton(onClick = { onMove(1) }) { Icon(Icons.Filled.ArrowDownward, contentDescription = "Move down") }
            }
            if (item.live) {
                IconButton(onClick = onCancel) { Icon(Icons.Filled.Stop, contentDescription = "Cancel") }
            } else {
                IconButton(onClick = onRemove) { Icon(Icons.Filled.Close, contentDescription = "Remove") }
            }
            if (item.state == UploadItem.STATE_COMPLETED && item.mediaId > 0) {
                TextButton(onClick = onOpen) { Text("Open") }
            }
        }
    }
}

/** Deliberately coarse above a minute: a countdown to the second on a twenty-minute
    upload is precision the estimate does not have. */
private fun humanDuration(seconds: Long): String = when {
    seconds < 60 -> "${seconds}s"
    seconds < 3600 -> "${(seconds + 59) / 60} min"
    else -> String.format("%.1f hr", seconds / 3600.0)
}

private fun humanBytes(n: Long): String {
    if (n < 1024) return "$n B"
    val units = listOf("KB", "MB", "GB", "TB")
    var value = n.toDouble() / 1024
    var unit = 0
    while (value >= 1024 && unit < units.lastIndex) {
        value /= 1024
        unit++
    }
    return if (value < 10) String.format("%.1f %s", value, units[unit])
    else "${value.toInt()} ${units[unit]}"
}
