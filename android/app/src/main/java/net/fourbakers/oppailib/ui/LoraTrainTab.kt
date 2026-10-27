package net.fourbakers.oppailib.ui

import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddPhotoAlternate
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import net.fourbakers.oppailib.data.GenModel
import net.fourbakers.oppailib.data.LORA_PRESETS
import net.fourbakers.oppailib.data.Repository
import net.fourbakers.oppailib.data.TrainAutotagRequest
import net.fourbakers.oppailib.data.TrainEffort
import net.fourbakers.oppailib.data.TrainListResponse
import net.fourbakers.oppailib.data.TrainPreview
import net.fourbakers.oppailib.data.TrainPreviewRequest
import net.fourbakers.oppailib.data.TrainRequest
import net.fourbakers.oppailib.data.TrainSet
import net.fourbakers.oppailib.data.TrainSetName
import net.fourbakers.oppailib.data.TrainSource
import net.fourbakers.oppailib.data.Training
import net.fourbakers.oppailib.data.active
import net.fourbakers.oppailib.data.epochsFor
import net.fourbakers.oppailib.data.fraction
import net.fourbakers.oppailib.data.line
import net.fourbakers.oppailib.data.suggestLeaveOut
import net.fourbakers.oppailib.data.triggerFrom
import net.fourbakers.oppailib.data.wantsLowVram
import net.fourbakers.oppailib.util.copyUriToCache
import net.fourbakers.oppailib.util.mimeOf

/**
 * Training a LoRA from the phone: a kind, a name, a set of pictures (one of the
 * training sets, or photos picked here into a new one), tagged if they need it, and a
 * length — then the run, followed below with the others.
 *
 * The server does the work: it captions and sends the pictures, and follows the run
 * to the end with no client connected, so a run started here finishes and installs
 * with the phone in a pocket. The web's Train screen has the rest — library and X
 * imports, striking tags by hand, the advanced numbers, the comparison sheet; this is
 * the part worth having away from the desk.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoraTrainTab(repo: Repository, models: List<GenModel>, checkpoint: String) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var list by remember { mutableStateOf<TrainListResponse?>(null) }
    var listError by remember { mutableStateOf("") }
    var sets by remember { mutableStateOf<List<TrainSet>>(emptyList()) }

    var presetId by remember { mutableStateOf("character") }
    var name by remember { mutableStateOf("") }
    var trigger by remember { mutableStateOf("") }
    var triggerTouched by remember { mutableStateOf(false) }
    var setId by remember { mutableStateOf(0L) }
    var base by remember { mutableStateOf(checkpoint.ifBlank { models.firstOrNull()?.title ?: "" }) }
    var effort by remember { mutableStateOf(TrainEffort.BALANCED) }
    var preview by remember { mutableStateOf<TrainPreview?>(null) }
    var previewKey by remember { mutableIntStateOf(0) }
    // What is in flight: an upload ("Adding 3 of 12"), a tagging run, a start.
    var busy by remember { mutableStateOf("") }
    var starting by remember { mutableStateOf(false) }

    suspend fun refresh() {
        runCatching { repo.api.trainList() }
            .onSuccess { list = it; listError = "" }
            .onFailure { listError = it.message ?: "Couldn't reach the server" }
    }

    suspend fun reloadSets() {
        runCatching { repo.api.trainSets() }.onSuccess { sets = it.sets }
    }

    LaunchedEffect(Unit) {
        reloadSets()
        // While a run is live it is followed every few seconds; otherwise the list is
        // looked at now and then, for a run started from the web meanwhile.
        while (true) {
            refresh()
            delay(if (list?.trainings?.any { it.active() } == true) 4_000 else 30_000)
        }
    }

    // The set's pictures as they would train, again whenever the set changes or is
    // added to or tagged.
    LaunchedEffect(setId, previewKey) {
        preview = null
        if (setId <= 0) return@LaunchedEffect
        runCatching {
            repo.api.trainPreview(TrainPreviewRequest(TrainSource(setId), trigger.ifBlank { triggerFrom(name) }))
        }.onSuccess { preview = it }
    }

    val photoPicker = rememberSystemPickerLauncher(ActivityResultContracts.OpenMultipleDocuments()) { uris ->
        if (uris.isNullOrEmpty() || busy.isNotEmpty()) return@rememberSystemPickerLauncher
        scope.launch {
            try {
                // Photos picked with no set chosen go into one named after the LoRA,
                // which is what the web would have called it too.
                val target = if (setId > 0) setId else {
                    val setName = name.trim().ifBlank { "LoRA pictures" }
                    repo.api.trainSetCreate(TrainSetName(setName)).id.also { setId = it }
                }
                var failed = 0
                uris.forEachIndexed { i, uri ->
                    busy = "Adding ${i + 1} of ${uris.size}…"
                    runCatching {
                        val (file, _) = copyUriToCache(context, uri)
                        try {
                            repo.api.trainSetUpload(target, repo.filePart(file, mimeOf(context, uri)))
                        } finally {
                            file.delete()
                        }
                    }.onFailure { failed++ }
                }
                if (failed > 0) repo.report("$failed of ${uris.size} couldn't be added — stills only (JPEG, PNG, WebP), 40 MB each.")
                reloadSets()
                previewKey++
            } catch (e: Exception) {
                repo.report(e.message ?: "Couldn't add the photos")
            } finally {
                busy = ""
            }
        }
    }

    fun autotag() {
        if (setId <= 0 || busy.isNotEmpty()) return
        scope.launch {
            try {
                busy = "Tagging…"
                var task = repo.api.trainAutotag(TrainAutotagRequest(TrainSource(setId)))
                while (!task.finished) {
                    busy = if (task.total > 0) "Tagging ${task.done} of ${task.total}…" else "Tagging…"
                    delay(1_500)
                    task = repo.api.trainTask(task.id)
                }
                if (task.error.isNotBlank()) repo.report(task.error)
                previewKey++
            } catch (e: Exception) {
                repo.report(e.message ?: "Couldn't tag the pictures")
            } finally {
                busy = ""
            }
        }
    }

    fun start() {
        val pv = preview ?: return
        if (starting || name.isBlank() || base.isBlank() || pv.count == 0) return
        val preset = LORA_PRESETS.first { it.id == presetId }
        val word = trigger.trim().ifBlank { triggerFrom(name) }
        val family = (models.find { it.title == base }?.base ?: "") + " " + base
        scope.launch {
            starting = true
            runCatching {
                repo.api.trainStart(
                    TrainRequest(
                        name = name.trim(),
                        trigger = word,
                        base = base,
                        source = TrainSource(setId),
                        leaveOut = suggestLeaveOut(preset, pv.commonTags, pv.count),
                        preset = preset.id,
                        epochs = epochsFor(preset, effort),
                        learningRate = 0.0001,
                        textEncoderLr = preset.textEncoderLr,
                        optimizer = "AdamW8bit",
                        noiseOffset = preset.noiseOffset,
                        lowVram = wantsLowVram(list?.trainer?.vramMB ?: 0, family),
                        flip = preset.flip,
                        freeGpu = true,
                        samples = true,
                    ),
                )
            }.onSuccess {
                repo.report("Training “${it.name}” — it carries on with the app closed.", "happy")
                name = ""; trigger = ""; triggerTouched = false; setId = 0
                refresh()
            }.onFailure { repo.report(it.message ?: "Couldn't start the training") }
            starting = false
        }
    }

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        val l = list
        when {
            l == null && listError.isEmpty() -> Box(Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
            l == null -> TrainNote(listError)
            !l.configured -> TrainNote("Training runs on the OppaiLib trainer, on the computer with the GPU. Set its address in the web Settings → Image generation, then come back.")
            else -> {
                val h = l.trainer
                TrainNote(
                    when {
                        h == null -> "The trainer isn't answering${if (l.trainerError.isNotBlank()) ": ${l.trainerError}" else "."} A run started now waits for it."
                        h.busy -> "${h.gpu.ifBlank { "The trainer" }} is training${if (h.queued > 0) ", ${h.queued} waiting" else ""}. A new run joins the queue."
                        else -> "${h.gpu.ifBlank { "The trainer" }}${if (h.vramMB > 0) " · ${h.vramMB / 1024} GB" else ""} is free."
                    },
                )

                Text("New LoRA", style = MaterialTheme.typography.titleMedium)
                Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    LORA_PRESETS.forEach { p ->
                        FilterChip(selected = presetId == p.id, onClick = { presetId = p.id }, label = { Text(p.title) })
                    }
                }
                val preset = LORA_PRESETS.first { it.id == presetId }
                Text(preset.blurb, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)

                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it; if (!triggerTouched) trigger = triggerFrom(it) },
                    label = { Text("Name") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = trigger,
                    onValueChange = { trigger = it; triggerTouched = true },
                    label = { Text("Trigger word") },
                    supportingText = { Text("The word that calls it up in a prompt — one the checkpoint doesn't already know.") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )

                Text("Pictures", style = MaterialTheme.typography.titleSmall)
                if (sets.isNotEmpty()) {
                    Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        sets.forEach { s ->
                            FilterChip(
                                selected = setId == s.id,
                                onClick = { setId = if (setId == s.id) 0 else s.id },
                                label = { Text("${s.name} · ${s.count}", maxLines = 1, overflow = TextOverflow.Ellipsis) },
                            )
                        }
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    OutlinedButton(onClick = { photoPicker.launch(arrayOf("image/*")) }, enabled = busy.isEmpty()) {
                        Icon(Icons.Filled.AddPhotoAlternate, contentDescription = null, Modifier.size(18.dp))
                        Text(if (setId > 0) "  Add photos" else "  Pick photos")
                    }
                    if (l.tagger && setId > 0 && (preview?.untagged ?: 0) > 0) {
                        OutlinedButton(onClick = { autotag() }, enabled = busy.isEmpty()) {
                            Icon(Icons.Filled.AutoAwesome, contentDescription = null, Modifier.size(18.dp))
                            Text("  Tag them")
                        }
                    }
                }
                if (busy.isNotEmpty()) {
                    Text(busy, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
                }
                if (setId <= 0) {
                    TrainNote("Pick one of your training sets, or pick photos and they go into a new set named after the LoRA. Sets are kept apart from the library.")
                }
                val pv = preview
                if (setId > 0 && pv == null) {
                    LinearProgressIndicator(Modifier.fillMaxWidth())
                } else if (pv != null) {
                    if (pv.items.isNotEmpty()) {
                        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            pv.items.take(40).forEach { item ->
                                AsyncImage(
                                    model = repo.trainPictureThumbUrl(setId, item.id),
                                    imageLoader = repo.imageLoader,
                                    contentDescription = item.caption,
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier.size(64.dp).clip(RoundedCornerShape(10.dp))
                                        .background(MaterialTheme.colorScheme.surfaceVariant),
                                )
                            }
                        }
                    }
                    TrainNote(setAdvice(pv, preset.minPictures, preset.ideal, preset.title, l.tagger))
                }

                Text("Train on", style = MaterialTheme.typography.titleSmall)
                var baseOpen by remember { mutableStateOf(false) }
                ExposedDropdownMenuBox(expanded = baseOpen, onExpandedChange = { baseOpen = it }) {
                    OutlinedTextField(
                        value = models.find { it.title == base }?.modelName?.ifBlank { null } ?: base,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Checkpoint") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = baseOpen) },
                        modifier = Modifier.fillMaxWidth().menuAnchor(),
                    )
                    ExposedDropdownMenu(expanded = baseOpen, onDismissRequest = { baseOpen = false }) {
                        models.distinctBy { it.title }.forEach { m ->
                            DropdownMenuItem(text = { Text(m.modelName.ifBlank { m.title }) }, onClick = { base = m.title; baseOpen = false })
                        }
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    TrainEffort.entries.forEach { e ->
                        FilterChip(selected = effort == e, onClick = { effort = e }, label = { Text(e.title) })
                    }
                }
                Button(
                    onClick = { start() },
                    enabled = !starting && busy.isEmpty() && name.isNotBlank() && base.isNotBlank() && (pv?.count ?: 0) > 0,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Icon(Icons.Filled.PlayArrow, contentDescription = null, Modifier.size(18.dp))
                    Text(if (starting) "  Starting…" else "  Start training · ${epochsFor(preset, effort)} epochs")
                }

                if (l.trainings.isNotEmpty()) {
                    Text("Runs", style = MaterialTheme.typography.titleMedium)
                    l.trainings.forEach { t ->
                        TrainingRow(t, onCancel = {
                            scope.launch {
                                runCatching { repo.api.trainCancel(t.id) }.onFailure { repo.report(it.message ?: "Couldn't stop it") }
                                refresh()
                            }
                        }, onDelete = {
                            scope.launch {
                                runCatching { repo.api.trainDelete(t.id) }.onFailure { repo.report(it.message ?: "Couldn't remove it") }
                                refresh()
                            }
                        })
                    }
                }
            }
        }
    }
}

/** What to say about a set before it trains, as the web's datasetAdvice does. */
private fun setAdvice(pv: TrainPreview, min: Int, ideal: IntRange, kind: String, tagger: Boolean): String {
    val what = kind.lowercase().removePrefix("an ").removePrefix("a ")
    val size = when {
        pv.count == 0 -> "No pictures in this set yet."
        pv.count < min -> "${pv.count} picture${if (pv.count == 1) "" else "s"} is too few for $what — aim for ${ideal.first}–${ideal.last}, and at least $min."
        pv.count < ideal.first -> "${pv.count} pictures will work, but ${ideal.first}–${ideal.last} train a steadier LoRA."
        pv.count > ideal.last * 3 -> "${pv.count} pictures is more than $what needs — it trains slower, not better."
        else -> "${pv.count} pictures — a good size for $what."
    }
    if (pv.untagged == 0 || pv.count == 0) return size
    val tags = if (tagger) "Tag them first" else "Tag them on the web first"
    return "$size ${pv.untagged} ha${if (pv.untagged == 1) "s" else "ve"} no tags and would be captioned with the trigger word alone. $tags."
}

@Composable
private fun TrainingRow(t: Training, onCancel: () -> Unit, onDelete: () -> Unit) {
    Surface(shape = RoundedCornerShape(14.dp), color = MaterialTheme.colorScheme.surfaceVariant, modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(horizontal = 14.dp, vertical = 10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(t.name, style = MaterialTheme.typography.titleSmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text(
                        t.line(),
                        style = MaterialTheme.typography.bodySmall,
                        color = if (t.status == "failed") MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                if (t.active()) {
                    IconButton(onClick = onCancel) { Icon(Icons.Filled.Close, contentDescription = "Stop ${t.name}") }
                } else {
                    IconButton(onClick = onDelete) { Icon(Icons.Filled.Delete, contentDescription = "Remove ${t.name} from the list") }
                }
            }
            if (t.active()) {
                val f = t.fraction()
                if (f != null) LinearProgressIndicator(progress = { f }, modifier = Modifier.fillMaxWidth())
                else LinearProgressIndicator(Modifier.fillMaxWidth())
            }
            if (t.status == "done" && t.trigger.isNotBlank()) {
                Text("In the LoRA picker now — prompt it with “${t.trigger}”.", style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@Composable
private fun TrainNote(text: String) {
    Text(text, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
}
