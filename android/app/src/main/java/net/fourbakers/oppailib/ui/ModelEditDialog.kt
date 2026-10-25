package net.fourbakers.oppailib.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import net.fourbakers.oppailib.data.GenModelDefaults
import net.fourbakers.oppailib.data.GenModelMeta
import net.fourbakers.oppailib.data.GenModelMetaPatch
import net.fourbakers.oppailib.data.Repository

/**
 * Edits a model's (or LoRA's) record on the generator itself — name, description,
 * trigger phrases, recommended settings — via the server's /api/imagegen/model
 * proxy, so the change lands in InvokeAI's model manager, not in some local copy.
 */
@Composable
fun ModelEditDialog(
    repo: Repository,
    name: String,
    onDismiss: () -> Unit,
    onSaved: () -> Unit,
    onDeleted: (key: String) -> Unit = {},
) {
    var meta by remember { mutableStateOf<GenModelMeta?>(null) }
    var error by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var confirmDelete by remember { mutableStateOf(false) }

    var displayName by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var triggers by remember { mutableStateOf("") }
    var steps by remember { mutableStateOf("") }
    var cfg by remember { mutableStateOf("") }
    var width by remember { mutableStateOf("") }
    var height by remember { mutableStateOf("") }
    var scheduler by remember { mutableStateOf("") }
    var weight by remember { mutableStateOf("") }
    var positive by remember { mutableStateOf("") }
    var negative by remember { mutableStateOf("") }
    var clipSkip by remember { mutableStateOf("") }
    var weightMin by remember { mutableStateOf("") }
    var weightMax by remember { mutableStateOf("") }
    var note by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()

    LaunchedEffect(name) {
        runCatching { repo.api.modelMeta(name) }
            .onSuccess { m ->
                meta = m
                displayName = m.name
                description = m.description
                triggers = m.triggerPhrases.joinToString(", ")
                m.defaults?.let { d ->
                    if (d.steps > 0) steps = d.steps.toString()
                    if (d.cfgScale > 0) cfg = d.cfgScale.toString()
                    if (d.width > 0) width = d.width.toString()
                    if (d.height > 0) height = d.height.toString()
                    if (d.scheduler.isNotEmpty()) scheduler = d.scheduler
                    if (d.weight != 0.0) weight = d.weight.toString()
                    positive = d.positive.orEmpty()
                    negative = d.negative.orEmpty()
                    d.clipSkip?.takeIf { it > 0 }?.let { clipSkip = it.toString() }
                    d.weightMin?.takeIf { it != 0.0 }?.let { weightMin = it.toString() }
                    d.weightMax?.takeIf { it != 0.0 }?.let { weightMax = it.toString() }
                }
            }
            .onFailure { error = it.message ?: "Couldn't load the model" }
    }

    fun save() {
        val m = meta ?: return
        if (busy) return
        busy = true
        scope.launch {
            val defaults = if (m.type == "lora") {
                GenModelDefaults(
                    weight = weight.toDoubleOrNull() ?: 0.0,
                    negative = negative.trim(),
                    weightMin = weightMin.toDoubleOrNull() ?: 0.0,
                    weightMax = weightMax.toDoubleOrNull() ?: 0.0,
                )
            } else {
                GenModelDefaults(
                    steps = steps.toIntOrNull() ?: 0,
                    cfgScale = cfg.toDoubleOrNull() ?: 0.0,
                    width = width.toIntOrNull() ?: 0,
                    height = height.toIntOrNull() ?: 0,
                    scheduler = scheduler.trim(),
                    vae = m.defaults?.vae ?: "",
                    positive = positive.trim(),
                    negative = negative.trim(),
                    clipSkip = clipSkip.toIntOrNull() ?: 0,
                )
            }
            runCatching {
                repo.api.patchModelMeta(
                    GenModelMetaPatch(
                        key = m.key,
                        name = displayName.trim().ifEmpty { null },
                        description = description,
                        triggerPhrases = triggers.split(",").map { it.trim() }.filter { it.isNotEmpty() },
                        defaults = defaults,
                    ),
                )
            }.onSuccess {
                repo.report("Model updated")
                onSaved()
                onDismiss()
            }.onFailure { error = it.message ?: "Couldn't save the model" }
            busy = false
        }
    }

    /** Fills the fields with what the model's Civitai page recommends; Save keeps them. */
    fun importFromCivitai() {
        val m = meta ?: return
        if (busy) return
        busy = true
        scope.launch {
            runCatching { repo.api.civitaiSuggest(m.key) }
                .onSuccess { r ->
                    val s = r.suggestion
                    val have = triggers.split(",").map { it.trim() }.filter { it.isNotEmpty() }.toMutableList()
                    for (w in s.triggerWords.flatMap { it.split(",") }.map { it.trim() }) {
                        if (w.isNotEmpty() && have.none { it.equals(w, ignoreCase = true) }) have += w
                    }
                    triggers = have.joinToString(", ")
                    if (s.negative.isNotEmpty()) negative = s.negative
                    if (m.type == "lora") {
                        if (s.weight != 0.0) weight = s.weight.toString()
                        if (s.weightMin != 0.0 && s.weightMax != 0.0) {
                            weightMin = s.weightMin.toString(); weightMax = s.weightMax.toString()
                        }
                    } else {
                        if (s.positive.isNotEmpty()) positive = s.positive
                        if (s.steps > 0) steps = s.steps.toString()
                        if (s.cfgScale > 0) cfg = s.cfgScale.toString()
                        if (s.scheduler.isNotEmpty()) scheduler = s.scheduler
                        if (s.clipSkip > 0) clipSkip = s.clipSkip.toString()
                        if (s.width > 0 && s.height > 0) { width = s.width.toString(); height = s.height.toString() }
                    }
                    note = "Imported from Civitai — check it over, then Save." +
                        if (r.keySet) "" else " A Civitai API key adds what the showcase pictures used."
                    error = ""
                }
                .onFailure { error = it.message ?: "Couldn't read the Civitai page" }
            busy = false
        }
    }

    /** Removes the model from the generator — file included where the server can. */
    fun delete() {
        val m = meta ?: return
        if (busy) return
        busy = true
        scope.launch {
            runCatching { repo.api.deleteModel(m.key) }
                .onSuccess {
                    repo.report(if (m.type == "lora") "LoRA deleted" else "Model deleted")
                    onDeleted(m.key)
                    onDismiss()
                }
                .onFailure { error = it.message ?: "Couldn't delete the model" }
            busy = false
            confirmDelete = false
        }
    }

    if (confirmDelete) {
        val m = meta
        AlertDialog(
            onDismissRequest = { confirmDelete = false },
            title = { Text("Delete ${if (m?.type == "lora") "LoRA" else "model"}?") },
            text = { Text("“${m?.name ?: name}” is removed from the generator, and its file with it.") },
            confirmButton = { TextButton(onClick = { delete() }, enabled = !busy) { Text("Delete") } },
            dismissButton = { TextButton(onClick = { confirmDelete = false }) { Text("Cancel") } },
        )
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (meta?.type == "lora") "Edit LoRA" else "Edit model") },
        text = {
            val m = meta
            if (m == null && error.isEmpty()) {
                CircularProgressIndicator()
            } else Column(
                Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                if (error.isNotEmpty()) {
                    Text(error, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }
                if (m != null) {
                    Text(
                        "Saved on the generator — InvokeAI's model manager, or the sidecar files Automatic1111 reads.",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    OutlinedTextField(displayName, { displayName = it }, label = { Text("Name") },
                        singleLine = true, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(description, { description = it }, label = { Text("Description") },
                        minLines = 2, modifier = Modifier.fillMaxWidth())
                    if (note.isNotEmpty()) {
                        Text(note, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
                    }
                    TextButton(onClick = { importFromCivitai() }, enabled = !busy) { Text("Import from Civitai") }
                    OutlinedTextField(triggers, { triggers = it },
                        label = { Text("Trigger phrases (comma-separated)") },
                        modifier = Modifier.fillMaxWidth())
                    if (m.type == "lora") {
                        OutlinedTextField(weight, { weight = it }, label = { Text("Recommended weight") },
                            singleLine = true, modifier = Modifier.fillMaxWidth())
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(weightMin, { weightMin = it }, label = { Text("Works from") },
                                singleLine = true, modifier = Modifier.weight(1f))
                            OutlinedTextField(weightMax, { weightMax = it }, label = { Text("to") },
                                singleLine = true, modifier = Modifier.weight(1f))
                        }
                        OutlinedTextField(negative, { negative = it }, label = { Text("Negative while it's on") },
                            modifier = Modifier.fillMaxWidth())
                    } else {
                        OutlinedTextField(positive, { positive = it }, label = { Text("Recommended positive") },
                            modifier = Modifier.fillMaxWidth())
                        OutlinedTextField(negative, { negative = it }, label = { Text("Recommended negative") },
                            modifier = Modifier.fillMaxWidth())
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(steps, { steps = it }, label = { Text("Steps") },
                                singleLine = true, modifier = Modifier.weight(1f))
                            OutlinedTextField(cfg, { cfg = it }, label = { Text("CFG") },
                                singleLine = true, modifier = Modifier.weight(1f))
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(width, { width = it }, label = { Text("Width") },
                                singleLine = true, modifier = Modifier.weight(1f))
                            OutlinedTextField(height, { height = it }, label = { Text("Height") },
                                singleLine = true, modifier = Modifier.weight(1f))
                        }
                        OutlinedTextField(scheduler, { scheduler = it },
                            label = { Text("Scheduler (euler_a, dpmpp_2m_k, …)") },
                            singleLine = true, modifier = Modifier.fillMaxWidth())
                        OutlinedTextField(clipSkip, { clipSkip = it }, label = { Text("Clip skip") },
                            singleLine = true, modifier = Modifier.fillMaxWidth())
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = { save() }, enabled = meta != null && !busy) { Text("Save") }
        },
        dismissButton = {
            Row {
                TextButton(onClick = { confirmDelete = true }, enabled = meta != null && !busy) {
                    Text("Delete", color = MaterialTheme.colorScheme.error)
                }
                TextButton(onClick = onDismiss) { Text("Cancel") }
            }
        },
    )
}
