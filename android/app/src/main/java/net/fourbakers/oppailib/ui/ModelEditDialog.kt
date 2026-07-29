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
fun ModelEditDialog(repo: Repository, name: String, onDismiss: () -> Unit, onSaved: () -> Unit) {
    var meta by remember { mutableStateOf<GenModelMeta?>(null) }
    var error by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }

    var displayName by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var triggers by remember { mutableStateOf("") }
    var steps by remember { mutableStateOf("") }
    var cfg by remember { mutableStateOf("") }
    var width by remember { mutableStateOf("") }
    var height by remember { mutableStateOf("") }
    var scheduler by remember { mutableStateOf("") }
    var weight by remember { mutableStateOf("") }
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
                GenModelDefaults(weight = weight.toDoubleOrNull() ?: 0.0)
            } else {
                GenModelDefaults(
                    steps = steps.toIntOrNull() ?: 0,
                    cfgScale = cfg.toDoubleOrNull() ?: 0.0,
                    width = width.toIntOrNull() ?: 0,
                    height = height.toIntOrNull() ?: 0,
                    scheduler = scheduler.trim(),
                    vae = m.defaults?.vae ?: "",
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
                        "Synced with InvokeAI's model manager.",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    OutlinedTextField(displayName, { displayName = it }, label = { Text("Name") },
                        singleLine = true, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(description, { description = it }, label = { Text("Description") },
                        minLines = 2, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(triggers, { triggers = it },
                        label = { Text("Trigger phrases (comma-separated)") },
                        modifier = Modifier.fillMaxWidth())
                    if (m.type == "lora") {
                        OutlinedTextField(weight, { weight = it }, label = { Text("Recommended weight") },
                            singleLine = true, modifier = Modifier.fillMaxWidth())
                    } else {
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
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = { save() }, enabled = meta != null && !busy) { Text("Save") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}
