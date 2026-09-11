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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import kotlinx.coroutines.launch
import net.fourbakers.oppailib.data.LibbyBackground
import net.fourbakers.oppailib.data.LibbyBackgroundSaveRequest
import net.fourbakers.oppailib.data.LibbyEmotionRequest
import net.fourbakers.oppailib.data.Repository

/**
 * Where Libby can be on a video call.
 *
 * Each background is a picture plus a name and a few tags — "bedroom, night, lamp" —
 * and the tags are what let her pick one herself when the scene moves. They live on
 * the server beside the outfits; which one she is in is per conversation.
 */
@Composable
fun LibbyBackgroundsSection(repo: Repository) {
    var backgrounds by remember { mutableStateOf<List<LibbyBackground>>(emptyList()) }
    var editing by remember { mutableStateOf<LibbyBackground?>(null) }
    var creating by remember { mutableStateOf(false) }
    // Picture URLs are otherwise stable, so a card would keep showing whatever Coil
    // already has. Bumping this is what makes a replaced picture visible.
    var version by remember { mutableStateOf(0) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    suspend fun reload() {
        runCatching { repo.api.libbyBackgrounds() }.onSuccess { backgrounds = it.backgrounds }
    }
    LaunchedEffect(Unit) { reload() }

    // Picking a picture for the background being edited; the record must exist first,
    // which the editor guarantees by saving before it offers the picker.
    var pictureFor by remember { mutableStateOf<String?>(null) }
    val picker = rememberSystemPickerLauncher(ActivityResultContracts.GetContent()) { uri: Uri? ->
        val id = pictureFor ?: return@rememberSystemPickerLauncher
        if (uri == null) return@rememberSystemPickerLauncher
        scope.launch {
            runCatching { repo.api.setLibbyBackgroundImage(id, LibbyEmotionRequest(uriToDataUrl(context, uri))) }
                .onSuccess { version++; reload(); repo.report("Background picture saved.", "happy") }
                .onFailure { repo.report(it.message ?: "Couldn't save that picture.") }
        }
    }

    Column(Modifier.padding(top = 14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text("Backgrounds", style = MaterialTheme.typography.titleSmall)
        Text(
            "Rooms for the video call. Tag each with what it is — bedroom, night, kitchen — " +
                "and she chooses where to be as the scene moves.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.padding(top = 4.dp)) {
            items(backgrounds, key = { it.id }) { bg ->
                Column(
                    Modifier.width(150.dp).clip(RoundedCornerShape(12.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant)
                        .clickable { editing = bg },
                ) {
                    Box(Modifier.fillMaxWidth().aspectRatio(16f / 10f).background(MaterialTheme.colorScheme.surface), contentAlignment = Alignment.Center) {
                        if (bg.hasImage) AsyncImage(
                            repo.libbyBackgroundUrl(bg.id, version), bg.name, imageLoader = repo.imageLoader,
                            contentScale = ContentScale.Crop, modifier = Modifier.fillMaxWidth().aspectRatio(16f / 10f),
                        ) else Text("No picture yet", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Column(Modifier.padding(8.dp)) {
                        Text(bg.name, style = MaterialTheme.typography.labelLarge, maxLines = 1)
                        Text(
                            bg.tags.joinToString().ifBlank { "No tags" }, style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1,
                        )
                    }
                }
            }
            item {
                Box(
                    Modifier.width(150.dp).aspectRatio(16f / 10f).clip(RoundedCornerShape(12.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant).clickable { creating = true },
                    contentAlignment = Alignment.Center,
                ) { Text("+ New background", style = MaterialTheme.typography.labelLarge) }
            }
        }
    }

    // One dialog for both creating and editing: name, tags, then the picture.
    if (creating || editing != null) {
        val target = editing
        var name by remember(target?.id) { mutableStateOf(target?.name ?: "") }
        var tags by remember(target?.id) { mutableStateOf(target?.tags?.joinToString(", ") ?: "") }
        var busy by remember { mutableStateOf(false) }
        fun close() { creating = false; editing = null }
        AlertDialog(
            onDismissRequest = { if (!busy) close() },
            title = { Text(if (target == null) "New background" else target.name) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(name, { name = it }, label = { Text("Name") }, singleLine = true, placeholder = { Text("Bedroom") })
                    OutlinedTextField(tags, { tags = it }, label = { Text("Tags, comma separated") }, placeholder = { Text("bedroom, night, lamp, cosy") })
                    Text(
                        "She reads the name and the tags when deciding where to be: \"going to bed\" finds a room tagged bed.",
                        style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    if (target != null) Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        TextButton(onClick = { pictureFor = target.id; picker.launch("image/*") }, enabled = !busy) {
                            Text(if (target.hasImage) "Replace picture" else "Add picture")
                        }
                        TextButton(
                            onClick = {
                                busy = true
                                scope.launch {
                                    runCatching { repo.api.deleteLibbyBackground(target.id) }
                                        .onSuccess { reload(); close() }
                                        .onFailure { repo.report(it.message ?: "Couldn't delete that background.") }
                                    busy = false
                                }
                            },
                            enabled = !busy,
                        ) { Text("Delete", color = MaterialTheme.colorScheme.error) }
                    }
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        busy = true
                        scope.launch {
                            val body = LibbyBackgroundSaveRequest(
                                id = target?.id.orEmpty(), name = name.trim(),
                                tags = tags.split(",").map(String::trim).filter(String::isNotBlank),
                            )
                            runCatching { repo.api.saveLibbyBackground(body) }
                                .onSuccess { saved ->
                                    reload()
                                    // A new background wants its picture next, so the dialog stays
                                    // open on the saved record rather than closing on a blank card.
                                    if (target == null) { creating = false; editing = saved } else close()
                                }
                                .onFailure { repo.report(it.message ?: "Couldn't save that background.") }
                            busy = false
                        }
                    },
                    enabled = !busy && name.isNotBlank(),
                ) { Text(if (target == null) "Add" else "Save") }
            },
            dismissButton = { TextButton(onClick = { close() }, enabled = !busy) { Text("Close") } },
        )
    }
}
