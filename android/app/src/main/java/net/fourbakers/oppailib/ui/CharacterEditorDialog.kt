package net.fourbakers.oppailib.ui

import android.net.Uri
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import kotlinx.coroutines.launch
import net.fourbakers.oppailib.data.GenCharacter
import net.fourbakers.oppailib.data.LibbyVoice
import net.fourbakers.oppailib.data.Repository
import net.fourbakers.oppailib.data.SaveCharacterRequest
import net.fourbakers.oppailib.data.ScanImageRequest

/**
 * Create or edit a character — a reusable prompt fragment with a face. Beyond the
 * name/prompt fields it can **scan an image for booru tags** (the same AI tagger the
 * server runs) and fold them into the prompt, so a character can be seeded from a
 * reference picture rather than typed out. [character] with a blank id is a new one.
 */
@Composable
fun CharacterEditorDialog(
    repo: Repository,
    character: GenCharacter,
    onSaved: () -> Unit,
    onDeleted: () -> Unit,
    onDismiss: () -> Unit,
) {
    val context = LocalContext.current
    val isNew = character.id.isEmpty()
    var name by remember { mutableStateOf(character.name) }
    var prompt by remember { mutableStateOf(character.prompt) }
    var negative by remember { mutableStateOf(character.negativePrompt) }
    // A freshly-picked thumbnail (previewed straight from the content Uri; converted
    // to a data URL only on save). Null keeps whatever thumbnail the character has.
    var pickedThumb by remember { mutableStateOf<Uri?>(null) }
    var scanBusy by remember { mutableStateOf(false) }
    var saveBusy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    val thumbPicker = rememberSystemPickerLauncher(ActivityResultContracts.GetContent()) { uri: Uri? ->
        if (uri != null) pickedThumb = uri
    }
    val scanPicker = rememberSystemPickerLauncher(ActivityResultContracts.GetContent()) { uri: Uri? ->
        if (uri == null || scanBusy) return@rememberSystemPickerLauncher
        scanBusy = true
        scope.launch {
            runCatching {
                val data = uriToDataUrl(context, uri)
                repo.api.scanImage(ScanImageRequest(data))
            }.onSuccess { res ->
                // Booru tags carry underscores and a rating we don't want in a prompt;
                // turn them into prompt phrases, drop the rating, and skip duplicates.
                val have = prompt.split(",").map { it.trim().lowercase() }.filter { it.isNotEmpty() }.toSet()
                val additions = res.tags
                    .filter { it.category != "rating" }
                    .map { it.tag.replace('_', ' ').trim() }
                    .filter { it.isNotEmpty() && it.lowercase() !in have }
                    .distinct()
                if (additions.isEmpty()) {
                    repo.report("No new tags found", "thinking")
                } else {
                    prompt = if (prompt.isBlank()) additions.joinToString(", ")
                    else prompt.trimEnd().trimEnd(',') + ", " + additions.joinToString(", ")
                    repo.report("Added ${additions.size} tag${if (additions.size == 1) "" else "s"}", "happy")
                }
            }.onFailure { repo.report(it.message ?: "Couldn't scan the image") }
            scanBusy = false
        }
    }

    fun save() {
        if (name.isBlank() || saveBusy) return
        saveBusy = true
        scope.launch {
            runCatching {
                val imageData = pickedThumb?.let { uriToDataUrl(context, it) }
                repo.api.saveCharacter(
                    SaveCharacterRequest(
                        id = character.id.ifEmpty { null },
                        name = name.trim(),
                        prompt = prompt,
                        negativePrompt = negative,
                        imageData = imageData,
                    ),
                )
            }.onSuccess { onSaved() }
                .onFailure { repo.report(it.message ?: "Couldn't save the character") }
            saveBusy = false
        }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (isNew) "New character" else "Edit character") },
        text = {
            Column(
                Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                OutlinedTextField(
                    value = name, onValueChange = { name = it },
                    label = { Text("Name") }, singleLine = true, modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = prompt, onValueChange = { prompt = it },
                    label = { Text("Prompt fragment") },
                    placeholder = { Text("1girl, red hair, green eyes, …") },
                    minLines = 2, modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = negative, onValueChange = { negative = it },
                    label = { Text("Negative fragment (optional)") },
                    minLines = 1, modifier = Modifier.fillMaxWidth(),
                )
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Box(
                        Modifier
                            .width(72.dp)
                            .aspectRatio(3f / 4f)
                            .clip(RoundedCornerShape(10.dp))
                            .background(MaterialTheme.colorScheme.surfaceVariant)
                            .clickable { thumbPicker.launch("image/*") },
                        contentAlignment = Alignment.Center,
                    ) {
                        val model: Any? = pickedThumb
                            ?: if (character.hasThumb) repo.characterThumbUrl(character.id) else null
                        if (model != null) {
                            AsyncImage(
                                model = model,
                                imageLoader = repo.imageLoader,
                                contentDescription = "Thumbnail",
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxWidth().aspectRatio(3f / 4f),
                            )
                        } else {
                            Text("＋", style = MaterialTheme.typography.headlineMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                    OutlinedButton(onClick = { scanPicker.launch("image/*") }, enabled = !scanBusy) {
                        Icon(Icons.Filled.AutoAwesome, contentDescription = null, Modifier.size(16.dp))
                        Text(
                            if (scanBusy) "  Scanning…" else "  Scan image for tags",
                        )
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = { save() }, enabled = name.isNotBlank() && !saveBusy) { Text("Save") }
        },
        dismissButton = {
            if (isNew) {
                TextButton(onClick = onDismiss) { Text("Cancel") }
            } else {
                TextButton(onClick = {
                    scope.launch {
                        runCatching { repo.api.deleteCharacter(character.id) }
                            .onSuccess {
                                LibbyVoice.react(LibbyVoice.Event.LIBRARY_DELETE)
                                    .let { repo.report(it.message, it.emotion) }
                                onDeleted()
                            }
                            .onFailure { repo.report(it.message ?: "Couldn't delete the character") }
                    }
                }) { Text("Delete", color = MaterialTheme.colorScheme.error) }
            }
        },
    )
}
