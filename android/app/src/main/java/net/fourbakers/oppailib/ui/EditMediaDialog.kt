package net.fourbakers.oppailib.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import kotlinx.coroutines.launch
import net.fourbakers.oppailib.data.Media
import net.fourbakers.oppailib.data.MediaPatch
import net.fourbakers.oppailib.data.PosterFrame
import net.fourbakers.oppailib.data.Repository
import net.fourbakers.oppailib.data.SetPosterRequest

/**
 * Editing an item's title, notes and tags.
 *
 * It builds a [MediaPatch] rather than a whole item: only the fields the user actually
 * changed are sent, so two people (or the AI tagger) touching different fields don't
 * overwrite each other's work with a stale copy of the row.
 *
 * Tags are staged, not applied as they're tapped — closing with Cancel leaves the item
 * exactly as it was, which is what a dialog with a Cancel button promises.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun EditMediaDialog(
    media: Media,
    /** Needed only for the video poster picker, which reads frames from the server. */
    repo: Repository,
    onDismiss: () -> Unit,
    onSave: (MediaPatch) -> Unit,
) {
    var title by remember { mutableStateOf(media.title) }
    var notes by remember { mutableStateOf(media.notes.orEmpty()) }
    var draft by remember { mutableStateOf("") }

    // Existing tags minus the ones struck off, plus the ones typed in. Names, because
    // that's the currency the patch endpoint deals in.
    val kept = remember { mutableStateListOf<String>().apply { addAll(media.tags.map { it.name }) } }
    val added = remember { mutableStateListOf<String>() }

    fun addDraft() {
        val name = draft.trim()
        if (name.isEmpty()) return
        if (name !in kept && name !in added) added += name
        draft = ""
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Edit details") },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState())) {
                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it },
                    label = { Text("Title") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = notes,
                    onValueChange = { notes = it },
                    label = { Text("Notes") },
                    modifier = Modifier.fillMaxWidth().heightIn(min = 88.dp).padding(top = 12.dp),
                )

                Text(
                    "Tags",
                    style = MaterialTheme.typography.labelLarge,
                    modifier = Modifier.padding(top = 16.dp),
                )
                Row(Modifier.fillMaxWidth()) {
                    OutlinedTextField(
                        value = draft,
                        onValueChange = { draft = it },
                        label = { Text("Add a tag") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                        keyboardActions = KeyboardActions(onDone = { addDraft() }),
                        modifier = Modifier.weight(1f),
                    )
                    IconButton(onClick = { addDraft() }, modifier = Modifier.padding(top = 8.dp)) {
                        Icon(Icons.Filled.Add, contentDescription = "Add this tag")
                    }
                }
                FlowRow(Modifier.fillMaxWidth().padding(top = 8.dp)) {
                    (kept + added).forEach { name ->
                        AssistChip(
                            onClick = { if (name in added) added -= name else kept -= name },
                            label = { Text(name) },
                            trailingIcon = {
                                Icon(
                                    Icons.Filled.Close,
                                    contentDescription = "Remove $name",
                                    modifier = Modifier.size(AssistChipDefaults.IconSize),
                                )
                            },
                            modifier = Modifier.padding(end = 6.dp),
                        )
                    }
                }
                if (kept.size + added.size == 0) {
                    Text(
                        "No tags. Auto-tag from the viewer, or add your own above.",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                if (media.kind == "video") PosterPicker(media, repo)
            }
        },
        confirmButton = {
            TextButton(onClick = {
                // A tag typed but never added is still a tag the user meant to add.
                addDraft()
                val removed = media.tags.map { it.name }.filterNot { it in kept }
                onSave(
                    MediaPatch(
                        title = title.takeIf { it != media.title },
                        notes = notes.takeIf { it != media.notes.orEmpty() },
                        addTags = added.toList(),
                        removeTags = removed,
                    ),
                )
            }) { Text("Save") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

/**
 * Choosing which frame represents a video.
 *
 * The automatic poster is a frame 10% in, which is regularly the wrong one — a title
 * card, a fade, the back of somebody's head. This is a strip of frames spread across
 * the running time that you scroll through and tap.
 *
 * Behind a button rather than loaded with the dialog because the server has to decrypt
 * the whole video to read any frame from it: a real cost on a long file, and most edits
 * are a title or a tag. Applied immediately on tap rather than staged with the rest of
 * the form, because the poster is stored server-side as its own blob and has no
 * representation in the MediaPatch the Save button sends.
 */
@Composable
private fun PosterPicker(media: Media, repo: Repository) {
    var frames by remember { mutableStateOf<List<PosterFrame>>(emptyList()) }
    var loading by remember { mutableStateOf(false) }
    var savingAt by remember { mutableStateOf(-1) }
    var chosenAt by remember { mutableStateOf(-1) }
    var error by remember { mutableStateOf("") }
    var version by remember { mutableStateOf(0) }
    val scope = rememberCoroutineScope()

    Text(
        "Thumbnail",
        style = MaterialTheme.typography.labelLarge,
        modifier = Modifier.padding(top = 16.dp),
    )
    Row(verticalAlignment = Alignment.CenterVertically) {
        AsyncImage(
            model = "${repo.thumbUrl(media.id)}${if (version > 0) "?v=$version" else ""}",
            imageLoader = repo.imageLoader,
            contentDescription = "Current thumbnail",
            contentScale = ContentScale.Crop,
            modifier = Modifier.width(96.dp).aspectRatio(16f / 9f).clip(RoundedCornerShape(8.dp)),
        )
        Column(Modifier.weight(1f).padding(start = 10.dp)) {
            Text(
                "Pick the frame this video shows in the library.",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (frames.isEmpty()) TextButton(
                enabled = !loading,
                onClick = {
                    loading = true
                    error = ""
                    scope.launch {
                        runCatching { repo.api.posterFrames(media.id) }
                            .onSuccess { frames = it.frames }
                            .onFailure { error = it.message ?: "Couldn't read frames from this video." }
                        loading = false
                    }
                },
            ) { Text(if (loading) "Reading frames…" else "Choose a frame") }
        }
    }
    if (error.isNotEmpty()) Text(
        error,
        style = MaterialTheme.typography.labelSmall,
        color = MaterialTheme.colorScheme.error,
    )
    if (frames.isNotEmpty()) LazyRow(
        Modifier.fillMaxWidth().padding(top = 6.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        itemsIndexed(frames) { index, frame ->
            Box(
                Modifier
                    .width(132.dp)
                    .aspectRatio(16f / 9f)
                    .clip(RoundedCornerShape(10.dp))
                    .border(
                        2.dp,
                        if (chosenAt == index) MaterialTheme.colorScheme.primary else Color.Transparent,
                        RoundedCornerShape(10.dp),
                    )
                    .clickable(enabled = savingAt < 0) {
                        savingAt = index
                        error = ""
                        scope.launch {
                            runCatching { repo.api.setPoster(media.id, SetPosterRequest(frame.at)) }
                                .onSuccess { chosenAt = index; version++ }
                                .onFailure { error = it.message ?: "Couldn't set that frame." }
                            savingAt = -1
                        }
                    },
            ) {
                AsyncImage(
                    model = frame.image,
                    imageLoader = repo.imageLoader,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxWidth().aspectRatio(16f / 9f),
                )
                // The timestamp sits on the frame: it is what tells you where in the
                // video you are looking, and a strip of unlabelled stills is a
                // guessing game.
                Text(
                    if (savingAt == index) "Saving…" else timecode(frame.at),
                    style = MaterialTheme.typography.labelSmall,
                    color = Color.White,
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(4.dp)
                        .clip(RoundedCornerShape(5.dp))
                        .background(Color.Black.copy(alpha = .66f))
                        .padding(horizontal = 5.dp, vertical = 1.dp),
                )
            }
        }
    }
}

private fun timecode(seconds: Double): String {
    val total = seconds.toInt().coerceAtLeast(0)
    return "${total / 60}:${(total % 60).toString().padStart(2, '0')}"
}
