package net.fourbakers.oppailib.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.DeveloperBoard
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.intOrNull
import net.fourbakers.oppailib.data.AiRestartState
import net.fourbakers.oppailib.data.ChatModels
import net.fourbakers.oppailib.data.GpuState
import net.fourbakers.oppailib.data.Repository
import net.fourbakers.oppailib.data.TrainListResponse
import net.fourbakers.oppailib.data.serverMessage

/** How often the card is read again while the screen is up: a hand-over or a load moves
 *  it in seconds, and the read is one small request. */
private const val GPU_POLL_MS = 5_000L

/**
 * The graphics card, on a screen of its own (More → Graphics card).
 *
 * Everything about the card was spread over three places: who has it behind a chip in
 * the studio header, her chat model in Chat's settings, how the card is shared in the
 * server's settings, and the trainer nowhere on the phone. On a box where her model, the
 * image generator, ComfyUI and the trainer all take turns on one card, the card is the
 * thing being managed, so this puts it first and everything that uses it under it.
 */
@Composable
fun GpuScreen(repo: Repository, isAdmin: Boolean, onBack: () -> Unit) {
    BackHandler(onBack = onBack)
    var card by remember { mutableStateOf<GpuState?>(null) }
    var cardError by remember { mutableStateOf("") }
    var models by remember { mutableStateOf<ChatModels?>(null) }
    var tools by remember { mutableStateOf<AiRestartState?>(null) }
    var trainer by remember { mutableStateOf<TrainListResponse?>(null) }
    var reload by remember { mutableIntStateOf(0) }

    suspend fun readCard() {
        runCatching { repo.web.gpuState() }
            .onSuccess { card = it; cardError = "" }
            .onFailure { if (card == null) cardError = it.serverMessage("Couldn't read the graphics card.") }
    }
    LaunchedEffect(reload) {
        readCard()
        models = runCatching { repo.api.chatModels() }.getOrNull()
        tools = runCatching { repo.web.aiRestartState() }.getOrNull()
        trainer = runCatching { repo.api.trainList() }.getOrNull()
    }
    LaunchedEffect(Unit) {
        while (true) {
            delay(GPU_POLL_MS)
            readCard()
        }
    }

    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        PageTop(
            "Graphics card",
            navigation = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back") } },
        ) {
            IconButton(onClick = { reload++ }) { Icon(Icons.Filled.Refresh, contentDescription = "Read it again") }
        }
        Hairline()
        Column(
            Modifier.fillMaxSize().verticalScroll(rememberScrollState())
                .windowInsetsPadding(WindowInsets.navigationBars)
                .padding(horizontal = 12.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            val state = card
            when {
                state == null && cardError.isNotEmpty() -> EmptyNote(cardError, icon = Icons.Filled.DeveloperBoard)
                state == null -> Row(Modifier.fillMaxWidth().padding(24.dp), horizontalArrangement = Arrangement.Center) {
                    CircularProgressIndicator(Modifier.size(24.dp), strokeWidth = 2.dp)
                }
                else -> {
                    CardSummary(state)
                    Kicker("Give it to", Modifier.padding(start = 14.dp, top = 14.dp, bottom = 2.dp))
                    if (state.apps.none { it.set }) {
                        Text(
                            "Nothing on this server uses the card yet. Her chat model, the image generator and ComfyUI are set up in Settings → Server.",
                            style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(horizontal = 14.dp),
                        )
                    } else {
                        GpuHandOffRows(repo, state, onState = { card = it; reload++ })
                        Text(
                            "The server moves the card itself as work starts. This is for when it can't know — an evening of clips after one of pictures.",
                            style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 4.dp),
                        )
                    }
                }
            }

            val m = models
            if (m != null && (m.supported || m.loaded.isNotEmpty() || m.models.isNotEmpty())) {
                Hairline(Modifier.padding(vertical = 10.dp))
                Kicker("Her chat model", Modifier.padding(start = 14.dp, bottom = 4.dp))
                Column(Modifier.padding(horizontal = 14.dp)) {
                    ChatModelSection(repo, m, onChanged = { reload++ })
                }
            }

            val t = trainer
            if (t != null && t.configured) {
                Hairline(Modifier.padding(vertical = 10.dp))
                Kicker("LoRA trainer", Modifier.padding(start = 14.dp, bottom = 4.dp))
                TrainerRows(t)
            }

            val r = tools
            if (r != null && r.tools.any { it.set }) {
                Hairline(Modifier.padding(vertical = 10.dp))
                Kicker("Restart", Modifier.padding(start = 14.dp, bottom = 4.dp))
                AiRestartRows(repo, r)
            }

            if (isAdmin) {
                Hairline(Modifier.padding(vertical = 10.dp))
                Kicker("How it is shared", Modifier.padding(start = 14.dp, bottom = 4.dp))
                SharingSettings(repo, onSaved = { reload++ })
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

/** Who has the card, how full it is, and what it is busy with. */
@Composable
private fun CardSummary(state: GpuState) {
    val holder = state.apps.firstOrNull { it.holding }?.name ?: state.apps.firstOrNull { it.id == state.holder }?.name
    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Text(
            holder?.let { "$it has the card" } ?: "Nobody has been given the card yet",
            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
        )
        val total = state.vramTotal?.takeIf { it > 0 }
        if (total != null) {
            val used = (total - (state.vramFree ?: 0)).coerceAtLeast(0)
            LinearProgressIndicator(
                progress = { (used.toFloat() / total).coerceIn(0f, 1f) },
                modifier = Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(4.dp)),
            )
            Text(vramLine(state).orEmpty(), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        } else {
            Text(
                "How full it is shows once ComfyUI is connected — it is the one program that reports the card's memory.",
                style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        state.busy?.takeIf { it.isNotBlank() }?.let {
            Text("Busy: $it", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.primary)
        }
    }
}

@Composable
private fun TrainerRows(t: TrainListResponse) {
    val h = t.trainer
    val lines = when {
        h == null -> listOf(t.trainerError.ifBlank { "The trainer isn't answering." })
        else -> listOfNotNull(
            h.gpu.takeIf { it.isNotBlank() }?.let { g -> if (h.vramMB > 0) "$g · ${h.vramMB / 1024} GB" else g },
            when {
                h.busy && h.queued > 0 -> "Training, ${h.queued} waiting"
                h.busy -> "Training"
                else -> "Idle"
            },
            t.trainings.firstOrNull { it.status == "training" || it.status == "preparing" }?.let { "Now: ${it.name}" },
        )
    }
    lines.forEach {
        Text(it, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(horizontal = 14.dp, vertical = 2.dp))
    }
}

/**
 * The server settings that decide how the card is shared, for an admin: whether her model
 * steps off it for pictures, whether a clip keeps the picture model beside it, and how
 * big the card is (which nothing the server can ask reports, and she is asked about).
 * Saved as just these fields; the server decodes a save onto what it has.
 */
@Composable
private fun SharingSettings(repo: Repository, onSaved: () -> Unit) {
    var current by remember { mutableStateOf<JsonObject?>(null) }
    var share by remember { mutableStateOf("") }
    var keepImage by remember { mutableStateOf(false) }
    var memory by remember { mutableStateOf("") }
    var saving by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    LaunchedEffect(Unit) {
        runCatching { repo.web.serverSettings() }.onSuccess { s ->
            current = s
            share = (s["gpuShare"] as? JsonPrimitive)?.contentOrNull.orEmpty()
            keepImage = (s["clipKeepImageModel"] as? JsonPrimitive)?.booleanOrNull == true
            memory = (s["gpuMemoryGb"] as? JsonPrimitive)?.intOrNull?.takeIf { it > 0 }?.toString().orEmpty()
        }
    }
    val cur = current ?: return
    InkChipRow(padding = PaddingValues(horizontal = 14.dp)) {
        InkChip("Both loaded", share == "", { share = "" }, small = true)
        InkChip("Swap for pictures", share == "swap", { share = "swap" }, small = true)
    }
    Text(
        if (share == "swap") "Her model is unloaded while a picture is made and loaded back a minute after the generator goes quiet (sooner if you message her)."
        else "Her model and the generator stay side by side — fine when they both fit.",
        style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.padding(horizontal = 14.dp, vertical = 4.dp),
    )
    Row(
        Modifier.fillMaxWidth().clickable { keepImage = !keepImage }.padding(horizontal = 14.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f).padding(end = 12.dp)) {
            Text("Keep the picture model for clips", style = MaterialTheme.typography.bodyLarge)
            Text(
                "Off, the checkpoint is unloaded before a clip so Wan has the whole card.",
                style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Switch(checked = keepImage, onCheckedChange = { keepImage = it })
    }
    OutlinedTextField(
        value = memory,
        onValueChange = { v -> memory = v.filter { it.isDigit() }.take(4) },
        label = { Text("Card memory (GB)") },
        supportingText = { Text("Nothing the server can ask reports it; she is told this when asked about the box.") },
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
        modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp),
    )
    val edits = buildMap<String, JsonPrimitive> {
        if (share != (cur["gpuShare"] as? JsonPrimitive)?.contentOrNull.orEmpty()) put("gpuShare", JsonPrimitive(share))
        if (keepImage != ((cur["clipKeepImageModel"] as? JsonPrimitive)?.booleanOrNull == true)) put("clipKeepImageModel", JsonPrimitive(keepImage))
        val gb = memory.toIntOrNull() ?: 0
        if (gb != ((cur["gpuMemoryGb"] as? JsonPrimitive)?.intOrNull ?: 0)) put("gpuMemoryGb", JsonPrimitive(gb))
    }
    PrimaryButton(
        if (saving) "Saving…" else if (edits.isEmpty()) "Saved" else "Save",
        onClick = {
            saving = true
            scope.launch {
                runCatching { repo.web.saveServerSettings(JsonObject(edits)) }
                    .onSuccess { current = it; repo.report("Saved how the card is shared.", "happy"); onSaved() }
                    .onFailure { repo.report(it.serverMessage("The server didn't save that.")) }
                saving = false
            }
        },
        enabled = edits.isNotEmpty() && !saving,
        modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
    )
}
