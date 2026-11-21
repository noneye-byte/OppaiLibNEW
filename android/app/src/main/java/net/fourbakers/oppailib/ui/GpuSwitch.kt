package net.fourbakers.oppailib.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.filled.DeveloperBoard
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.ModelTraining
import androidx.compose.material.icons.filled.Movie
import androidx.compose.material.icons.filled.RecordVoiceOver
import androidx.compose.material.icons.filled.RestartAlt
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import net.fourbakers.oppailib.data.AiRestartState
import net.fourbakers.oppailib.data.GpuState
import net.fourbakers.oppailib.data.GpuSwitchRequest
import net.fourbakers.oppailib.data.Repository
import net.fourbakers.oppailib.data.serverMessage
import net.fourbakers.oppailib.ui.theme.LocalInk

/** The repository, for the few shared pieces of chrome (the GPU switch) that sit deep in
 *  headers which otherwise have no need of it. Provided by MainActivity's root. */
internal val LocalRepo = staticCompositionLocalOf<Repository?> { null }

private fun toolIcon(id: String): ImageVector = when (id) {
    "chat" -> Icons.AutoMirrored.Filled.Chat
    "images" -> Icons.Filled.Image
    "video" -> Icons.Filled.Movie
    "trainer" -> Icons.Filled.ModelTraining
    else -> Icons.Filled.RecordVoiceOver
}

/**
 * The studio header's graphics-card switch (gpu-switch.ts on the web): which of her chat
 * model, the image generator and ComfyUI has the card, and a way to give it to another;
 * below that, a restart for each AI tool.
 *
 * The server moves the card on its own as work starts; this is for the times it can't
 * know — an evening of clips after one of pictures, where the first clip would spend its
 * first minute evicting the checkpoint. Giving it to her model waits for the load, a
 * minute or two, so the row says what it is waiting on.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun GpuSwitchChip() {
    val repo = LocalRepo.current ?: return
    var card by remember { mutableStateOf<GpuState?>(null) }
    var open by remember { mutableStateOf(false) }
    var moving by remember { mutableStateOf("") }
    var problems by remember { mutableStateOf<List<String>>(emptyList()) }
    var tools by remember { mutableStateOf<AiRestartState?>(null) }
    var restarting by remember { mutableStateOf("") }
    var note by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()
    LaunchedEffect(Unit) { card = runCatching { repo.web.gpuState() }.getOrNull() }
    LaunchedEffect(open) {
        if (open) {
            card = runCatching { repo.web.gpuState() }.getOrNull() ?: card
            tools = runCatching { repo.web.aiRestartState() }.getOrNull()
        }
    }
    val state = card ?: return
    // A server with fewer than two of the three set up has nothing to switch.
    if (state.apps.count { it.set } < 2) return
    val holder = state.apps.firstOrNull { it.holding }?.name ?: state.apps.firstOrNull { it.id == state.holder }?.name
    ToolButton(Icons.Filled.DeveloperBoard, "Graphics card", { open = true }, label = holder ?: "GPU", on = open)

    if (open) ModalBottomSheet(onDismissRequest = { open = false }, containerColor = LocalInk.current.nav) {
        Column(Modifier.padding(horizontal = 12.dp).padding(bottom = 18.dp)) {
            Text("The graphics card", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp))
            val vram = state.vramTotal?.takeIf { it > 0 }?.let { total ->
                val free = state.vramFree ?: 0
                "${bytesLabel((total - free).coerceAtLeast(0))} of ${bytesLabel(total)} in use"
            }
            Text(
                listOfNotNull(state.busy?.takeIf { it.isNotBlank() }?.let { "Busy: $it" }, vram).joinToString(" · ").ifEmpty { "Give it to the program you are about to use." },
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = 12.dp),
            )
            Spacer(Modifier.size(8.dp))
            state.apps.filter { it.set }.forEach { app ->
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    LitRow(
                        toolIcon(app.id),
                        app.name,
                        app.holding,
                        {
                            if (app.holding || moving.isNotEmpty() || !app.canTake) return@LitRow
                            moving = app.id
                            problems = emptyList()
                            scope.launch {
                                runCatching { repo.web.gpuSwitch(GpuSwitchRequest(app.id)) }
                                    .onSuccess { card = it.state; problems = it.problems }
                                    .onFailure { problems = listOf(it.serverMessage("Couldn't move the card.")) }
                                moving = ""
                            }
                        },
                        modifier = Modifier.weight(1f),
                        note = when {
                            moving == app.id -> "Moving…"
                            app.holding -> "Has it"
                            !app.canTake -> app.detail.ifBlank { "Can't take it" }
                            else -> "Give it"
                        },
                    )
                    if (moving == app.id) CircularProgressIndicator(Modifier.padding(end = 12.dp).size(18.dp), strokeWidth = 2.dp)
                }
            }
            problems.forEach { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(horizontal = 12.dp, vertical = 2.dp)) }
            val t = tools
            if (t != null && t.tools.any { it.set }) {
                Hairline(Modifier.padding(vertical = 10.dp))
                Kicker("Restart", Modifier.padding(horizontal = 14.dp, vertical = 4.dp))
                t.tools.filter { it.set }.forEach { tool ->
                    Row(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 2.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(toolIcon(tool.id), contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(20.dp))
                        Spacer(Modifier.width(14.dp))
                        Column(Modifier.weight(1f)) {
                            Text(tool.name, style = MaterialTheme.typography.bodyMedium)
                            if (tool.how.isEmpty() && tool.detail.isNotBlank()) {
                                Text(tool.detail, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                        if (restarting == tool.id) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                        else TextButton(enabled = tool.how.isNotEmpty() && restarting.isEmpty(), onClick = {
                            restarting = tool.id
                            note = ""
                            scope.launch {
                                runCatching { repo.web.aiRestart(tool.id) }
                                    .onSuccess { note = it.message.ifBlank { "${tool.name} restarted." } }
                                    .onFailure { note = it.serverMessage("Couldn't restart ${tool.name}.") }
                                restarting = ""
                            }
                        }) {
                            Icon(Icons.Filled.RestartAlt, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Restart")
                        }
                    }
                }
                if (note.isNotBlank()) Text(note, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp))
            }
        }
    }
}
