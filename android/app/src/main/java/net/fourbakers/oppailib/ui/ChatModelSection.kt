package net.fourbakers.oppailib.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextField
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import net.fourbakers.oppailib.data.ChatBackendInfo
import net.fourbakers.oppailib.data.ChatLoraRequest
import net.fourbakers.oppailib.data.ChatModelInspection
import net.fourbakers.oppailib.data.ChatModels
import net.fourbakers.oppailib.data.DeleteChatModelRequest
import net.fourbakers.oppailib.data.LOADER_KEY
import net.fourbakers.oppailib.data.LoadChatModelRequest
import net.fourbakers.oppailib.data.LoaderField
import net.fourbakers.oppailib.data.LoaderForm
import net.fourbakers.oppailib.data.Repository
import net.fourbakers.oppailib.data.composeLoadArgs
import net.fourbakers.oppailib.data.loaderFieldsFor
import net.fourbakers.oppailib.data.seedLoaderForm
import net.fourbakers.oppailib.data.serverMessage

/**
 * The text-generation backend, run from the phone: pick a model, set what it loads
 * with, load or unload it, apply LoRAs, and (for an admin) delete one.
 *
 * This was read-only on Android, with a note sending you to text-generation-webui's
 * own page to change anything. The web client has had all of it for a while, and the
 * server already serializes every model operation behind one lock and runs a load on
 * its own clock — so closing this sheet, or the app, mid-load does not leave the
 * backend half-loaded. The phone is just another client of that.
 *
 * [onChanged] asks the chat screen to re-read the model list and status after
 * anything that changes what is resident.
 */
@Composable
internal fun ChatModelSection(repo: Repository, models: ChatModels?, onChanged: () -> Unit) {
    val scope = rememberCoroutineScope()
    var backend by remember { mutableStateOf<ChatBackendInfo?>(null) }
    var isAdmin by remember { mutableStateOf(false) }
    var choice by remember { mutableStateOf("") }
    var form by remember { mutableStateOf(LoaderForm()) }
    var loraPicks by remember { mutableStateOf(emptySet<String>()) }
    var busy by remember { mutableStateOf<String?>(null) }
    var note by remember { mutableStateOf<Pair<String, Boolean>?>(null) } // message, isError
    var confirmUnload by remember { mutableStateOf(false) }
    var deleting by remember { mutableStateOf<ChatModelInspection?>(null) }
    var showLoader by remember { mutableStateOf(false) }

    val loaded = models?.loaded.orEmpty()
    val list = models?.models.orEmpty()
    val target = choice.ifEmpty { loaded.ifEmpty { list.firstOrNull().orEmpty() } }

    fun pick(model: String) {
        choice = model
        form = seedLoaderForm(backend?.loads?.get(model))
    }

    LaunchedEffect(models?.supported) {
        if (models?.supported != true) { backend = null; return@LaunchedEffect }
        backend = runCatching { repo.api.chatBackend() }.getOrNull()
        loraPicks = backend?.loras?.loaded.orEmpty().toSet()
        form = seedLoaderForm(backend?.loads?.get(target))
        isAdmin = runCatching { repo.api.me().isAdmin }.getOrDefault(false)
    }

    /** Runs one model operation with the section marked busy and its outcome said. */
    fun run(working: String, op: suspend () -> String) {
        if (busy != null) return
        busy = working
        note = null
        scope.launch {
            note = runCatching { op() }.fold(
                onSuccess = { it to false },
                onFailure = { it.serverMessage("That didn't work.") to true },
            )
            busy = null
        }
    }

    Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text("Text-generation backend", color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(loaded.ifBlank { "No model loaded" }, fontWeight = FontWeight.SemiBold)

        if (models == null || !models.supported) {
            Text(
                if (models == null) "The model list hasn't loaded — the backend may be down or still starting."
                else "This backend speaks the OpenAI API but doesn't offer loading or unloading. Manage the model where it runs.",
                color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp,
            )
            OutlinedButton(onClick = onChanged) { Text("Refresh") }
            HorizontalDivider(Modifier.padding(top = 8.dp))
            return@Column
        }

        ModelPicker(list, target, loaded, enabled = busy == null && list.isNotEmpty(), onPick = ::pick)

        backend?.takeIf { it.supported }?.let { info ->
            Row(
                Modifier.fillMaxWidth().clickable { showLoader = !showLoader }.padding(vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Loader settings", fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f))
                Text(
                    if (form.isSet) "set" else "backend defaults",
                    color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp,
                )
                Icon(if (showLoader) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore, contentDescription = null)
            }
            if (showLoader) LoaderSettings(info.loaders, form, enabled = busy == null) { form = it }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
            Button(
                enabled = busy == null && target.isNotEmpty(),
                onClick = {
                    runCatching { composeLoadArgs(form) }
                        .onFailure { note = "Extra loader arguments and settings have to be valid JSON objects." to true }
                        .onSuccess { (args, settings) ->
                            run("Loading $target… a big model can take a few minutes.") {
                                repo.api.loadChatModel(LoadChatModelRequest(target, args, settings, remember = true))
                                onChanged()
                                backend = runCatching { repo.api.chatBackend() }.getOrDefault(backend)
                                "Loaded $target."
                            }
                        }
                },
            ) { Text(if (target == loaded && loaded.isNotEmpty()) "Reload" else "Load") }
            OutlinedButton(enabled = busy == null && loaded.isNotEmpty(), onClick = { confirmUnload = true }) {
                Text("Unload")
            }
            if (isAdmin) TextButton(
                enabled = busy == null && target.isNotEmpty(),
                onClick = {
                    run("Checking what $target takes up…") {
                        deleting = repo.api.inspectChatModel(target)
                        ""
                    }
                },
            ) { Text("Delete…", color = MaterialTheme.colorScheme.error) }
        }

        busy?.let {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp)
                Text(it, fontSize = 12.sp)
            }
            Text(
                "Closing this won't cancel it — the server finishes the job either way.",
                color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp,
            )
        }
        note?.takeIf { it.first.isNotBlank() }?.let { (text, isError) ->
            Text(
                text, fontSize = 12.sp,
                color = if (isError) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary,
            )
        }

        backend?.takeIf { it.supported }?.let { info ->
            when {
                info.lorasError.isNotBlank() ->
                    Text("LoRAs: ${info.lorasError}", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
                info.loras != null && info.loras.available.isNotEmpty() -> {
                    val applied = info.loras.loaded.toSet()
                    Text(
                        "LoRAs · " + if (applied.isEmpty()) "none applied" else "${applied.size} applied",
                        fontWeight = FontWeight.Medium, modifier = Modifier.padding(top = 6.dp),
                    )
                    info.loras.available.forEach { name ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Checkbox(
                                checked = name in loraPicks, enabled = busy == null,
                                onCheckedChange = { on -> loraPicks = if (on) loraPicks + name else loraPicks - name },
                            )
                            Text(name, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                            if (name in applied) Text("applied", color = MaterialTheme.colorScheme.primary, fontSize = 11.sp)
                        }
                    }
                    OutlinedButton(
                        enabled = busy == null && loraPicks != applied,
                        onClick = {
                            run("Applying LoRAs…") {
                                val now = repo.api.setChatLoras(ChatLoraRequest(loraPicks.toList()))
                                backend = info.copy(loras = now)
                                loraPicks = now.loaded.toSet()
                                if (now.loaded.isEmpty()) "LoRAs cleared." else "Applied ${now.loaded.joinToString()}."
                            }
                        },
                    ) { Text(if (loraPicks.isEmpty()) "Clear LoRAs" else "Apply LoRAs") }
                }
            }
        }
        HorizontalDivider(Modifier.padding(top = 8.dp))
    }

    if (confirmUnload) AlertDialog(
        onDismissRequest = { confirmUnload = false },
        title = { Text("Unload $loaded?") },
        text = { Text("It frees the GPU, but chat stops working until a model is loaded again.") },
        confirmButton = {
            TextButton(onClick = {
                confirmUnload = false
                run("Unloading…") {
                    repo.api.unloadChatModel()
                    onChanged()
                    "Model unloaded."
                }
            }) { Text("Unload", color = MaterialTheme.colorScheme.error) }
        },
        dismissButton = { TextButton(onClick = { confirmUnload = false }) { Text("Cancel") } },
    )

    deleting?.let { inspection ->
        DeleteModelDialog(
            inspection = inspection,
            onDismiss = { deleting = null },
            onDelete = { confirm, permanent ->
                deleting = null
                run("Deleting ${inspection.name}…") {
                    val gone = repo.api.deleteChatModel(DeleteChatModelRequest(inspection.name, confirm, permanent))
                    choice = ""
                    onChanged()
                    if (gone.movedTo.isNotEmpty()) "${gone.name} moved to the trash — ${formatSize(gone.bytes)} recoverable at ${gone.movedTo}."
                    else "${gone.name} deleted for good — ${formatSize(gone.bytes)} freed."
                }
            },
        )
    }
}

/** The model list as a dropdown: names run long, and there can be dozens. */
@Composable
private fun ModelPicker(models: List<String>, chosen: String, loaded: String, enabled: Boolean, onPick: (String) -> Unit) {
    var open by remember { mutableStateOf(false) }
    Box {
        OutlinedButton(onClick = { open = true }, enabled = enabled, modifier = Modifier.fillMaxWidth()) {
            Text(
                chosen.ifEmpty { "No models found" },
                maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f),
            )
            Icon(Icons.Filled.ArrowDropDown, contentDescription = "Choose a model")
        }
        DropdownMenu(expanded = open, onDismissRequest = { open = false }) {
            models.forEach { model ->
                DropdownMenuItem(
                    text = {
                        Column {
                            Text(model, maxLines = 2, overflow = TextOverflow.Ellipsis)
                            if (model == loaded) Text("loaded now", color = MaterialTheme.colorScheme.primary, fontSize = 11.sp)
                        }
                    },
                    onClick = { open = false; onPick(model) },
                )
            }
        }
    }
}

/**
 * What the WebUI's Model tab asks before loading, asked here instead. Only the fields
 * that mean something for the chosen loader are shown; the JSON boxes take the rest.
 */
@Composable
private fun LoaderSettings(loaders: List<String>, form: LoaderForm, enabled: Boolean, onChange: (LoaderForm) -> Unit) {
    Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text("Loader", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            FilterChip(selected = form.loader.isEmpty(), enabled = enabled, onClick = { onChange(form.with(LOADER_KEY, "")) }, label = { Text("Backend decides") })
            loaders.forEach { name ->
                FilterChip(selected = form.loader == name, enabled = enabled, onClick = { onChange(form.with(LOADER_KEY, name)) }, label = { Text(name) })
            }
        }
        loaderFieldsFor(form.loader).forEach { field ->
            val value = form.values[field.key].orEmpty()
            when (field.kind) {
                LoaderField.Kind.CHECK -> Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(checked = value == "true", enabled = enabled, onCheckedChange = { onChange(form.with(field.key, if (it) "true" else "")) })
                    Text(field.label)
                    if (field.hint.isNotEmpty()) Text("  ${field.hint}", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
                }
                LoaderField.Kind.SELECT -> Column {
                    Text(field.label, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                    Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        FilterChip(selected = value.isEmpty(), enabled = enabled, onClick = { onChange(form.with(field.key, "")) }, label = { Text("Default") })
                        field.options.forEach { option ->
                            FilterChip(selected = value == option, enabled = enabled, onClick = { onChange(form.with(field.key, option)) }, label = { Text(option) })
                        }
                    }
                    if (field.hint.isNotEmpty()) Text(field.hint, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
                }
                else -> TextField(
                    value, { onChange(form.with(field.key, it)) },
                    label = { Text(field.label) },
                    placeholder = { Text(field.hint.ifEmpty { "default" }) },
                    singleLine = true, enabled = enabled,
                    keyboardOptions = if (field.kind == LoaderField.Kind.NUMBER) KeyboardOptions(keyboardType = KeyboardType.Number) else KeyboardOptions.Default,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }
        TextField(
            form.extra, { onChange(form.copy(extra = it)) }, enabled = enabled,
            label = { Text("Extra loader arguments (JSON)") },
            placeholder = { Text("{\"rope_freq_base\": 1000000}") },
            minLines = 2, maxLines = 5, modifier = Modifier.fillMaxWidth(),
        )
        TextField(
            form.settings, { onChange(form.copy(settings = it)) }, enabled = enabled,
            label = { Text("Generation defaults applied at load (JSON)") },
            placeholder = { Text("{\"instruction_template\": \"ChatML\"}") },
            minLines = 2, maxLines = 5, modifier = Modifier.fillMaxWidth(),
        )
        Text(
            "Settings are remembered per model once a load works, so the next load — from here or the web — starts from them.",
            color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp,
        )
    }
}

/**
 * The delete confirmation: what is on disk rather than "are you sure", and the model's
 * name typed out as the answer — the same thing the server checks, so a stray tap can't
 * delete gigabytes someone downloaded.
 */
@Composable
private fun DeleteModelDialog(inspection: ChatModelInspection, onDismiss: () -> Unit, onDelete: (confirm: String, permanent: Boolean) -> Unit) {
    var typed by remember { mutableStateOf("") }
    var permanent by remember { mutableStateOf(false) }
    val matches = typed.trim() == inspection.name
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Delete ${inspection.name}?") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                if (inspection.loaded) Text(
                    "This model is loaded right now. Unload it first — deleting the files under a running model leaves the backend broken until it restarts.",
                    color = MaterialTheme.colorScheme.error, fontSize = 13.sp,
                )
                Text(inspection.path, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(
                    "Frees ${formatSize(inspection.bytes)}" +
                        (if (inspection.freeBytes > 0) " · ${formatSize(inspection.freeBytes)} free now" else "") +
                        " · ${inspection.files.size} file${if (inspection.files.size == 1) "" else "s"}" +
                        if (inspection.split) " (a split model — every shard goes)" else "",
                    fontSize = 13.sp,
                )
                TextField(typed, { typed = it }, label = { Text("Type the name to confirm") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(checked = permanent, onCheckedChange = { permanent = it })
                    Text(
                        if (permanent) "Delete permanently" else "Move to ${inspection.trashPath.ifEmpty { "the trash" }}",
                        fontSize = 13.sp,
                    )
                }
            }
        },
        confirmButton = {
            TextButton(enabled = matches && !inspection.loaded, onClick = { onDelete(typed.trim(), permanent) }) {
                Text(if (permanent) "Delete permanently" else "Move to trash", color = MaterialTheme.colorScheme.error)
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

private fun formatSize(bytes: Long): String = when {
    bytes >= 1L shl 30 -> "%.1f GB".format(bytes / (1L shl 30).toDouble())
    bytes >= 1L shl 20 -> "%.0f MB".format(bytes / (1L shl 20).toDouble())
    else -> "%.0f KB".format(bytes / 1024.0)
}
