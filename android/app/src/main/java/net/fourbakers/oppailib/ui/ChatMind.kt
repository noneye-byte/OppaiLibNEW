package net.fourbakers.oppailib.ui

import android.net.Uri
import android.provider.OpenableColumns
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.EditNote
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
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
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.RequestBody.Companion.toRequestBody
import net.fourbakers.oppailib.data.DiscordPatch
import net.fourbakers.oppailib.data.DiscordState
import net.fourbakers.oppailib.data.DiscordToken
import net.fourbakers.oppailib.data.LibbyAutoState
import net.fourbakers.oppailib.data.LibbyBond
import net.fourbakers.oppailib.data.LibbyJournalEntry
import net.fourbakers.oppailib.data.LibbySticker
import net.fourbakers.oppailib.data.LibbyWant
import net.fourbakers.oppailib.data.Repository
import net.fourbakers.oppailib.data.StickerPatch
import net.fourbakers.oppailib.data.serverMessage
import net.fourbakers.oppailib.ui.theme.LocalInk
import java.text.DateFormat
import java.util.Date

/*
 * Her mind, her reaction shelf and her pictures taken home: the parts of the web's chat
 * settings (chat.ts's "Her mind", "Reaction images", "Her pictures") the phone had none
 * of. Each section loads itself, so opening one tab costs only its own requests.
 */

private fun whenLabel(ms: Long): String =
    if (ms <= 0) "" else DateFormat.getDateTimeInstance(DateFormat.MEDIUM, DateFormat.SHORT).format(Date(ms))

/** A section's heading inside a settings tab. */
@Composable
private fun MindHead(title: String, sub: String? = null, action: (@Composable () -> Unit)? = null) {
    Row(Modifier.fillMaxWidth().padding(top = 14.dp, bottom = 4.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.titleMedium)
            if (sub != null) Text(sub, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        action?.invoke()
    }
}

/** Her mind, as one tab: where you stand, what she wants, her journal, when she may speak
 *  first, and her Discord. [memory] is the existing memory panel, which leads. */
@Composable
internal fun LibbyMindTab(repo: Repository, memory: @Composable () -> Unit) {
    Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        LibbyBondSection(repo)
        memory()
        LibbyWantsSection(repo)
        LibbyJournalSection(repo)
        LibbyAutoSection(repo)
        DiscordSection(repo)
    }
}

/** Where the two of you left off, read from her own turns; reset starts her over. */
@Composable
private fun LibbyBondSection(repo: Repository) {
    var bond by remember { mutableStateOf<LibbyBond?>(null) }
    var confirm by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    LaunchedEffect(Unit) { bond = runCatching { repo.web.libbyBond() }.getOrNull() }
    MindHead("Where you stand", "Written from her own turns. Her mood and heat open the next conversation.",
        action = { if (bond != null) TextButton(onClick = { confirm = true }) { Text("Reset") } })
    val b = bond
    if (b == null || b.lastSeenAt == 0L) {
        Text("Nothing between you yet — this fills in as you talk.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    } else InkPanel(Modifier.fillMaxWidth(), padding = PaddingValues(14.dp)) {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row { Kicker("Mood", Modifier.width(96.dp)); Text(b.mood.ifBlank { "neutral" }, style = MaterialTheme.typography.bodyMedium) }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Kicker("Closeness", Modifier.width(96.dp))
                LinearProgressIndicator(progress = { b.warmth.toFloat().coerceIn(0f, 1f) }, modifier = Modifier.weight(1f).height(6.dp).clip(RoundedCornerShape(3.dp)))
                Text("  ${(b.warmth * 100).toInt()}%", style = MaterialTheme.typography.labelMedium)
            }
            Row { Kicker("Heat", Modifier.width(96.dp)); Text("%.1f of 5, %.1f now".format(b.heat, b.heatNow), style = MaterialTheme.typography.bodyMedium) }
            if (b.petname.isNotBlank()) Row { Kicker("Calls you", Modifier.width(96.dp)); Text("“${b.petname}”", style = MaterialTheme.typography.bodyMedium) }
            Row { Kicker("Last seen", Modifier.width(96.dp)); Text(whenLabel(b.lastSeenAt), style = MaterialTheme.typography.bodyMedium) }
        }
    }
    if (confirm) AlertDialog(
        onDismissRequest = { confirm = false },
        title = { Text("Start her over?") },
        text = { Text("Her mood, heat, closeness and the name she has for you go back to the beginning. Her memories stay.") },
        confirmButton = { TextButton(onClick = {
            confirm = false
            scope.launch { runCatching { repo.web.resetLibbyBond() }.onSuccess { bond = LibbyBond() } }
        }) { Text("Reset", color = MaterialTheme.colorScheme.error) } },
        dismissButton = { TextButton(onClick = { confirm = false }) { Text("Cancel") } },
    )
}

/** Her own standing wants — an outfit, something to watch, how a night goes. */
@Composable
private fun LibbyWantsSection(repo: Repository) {
    var wants by remember { mutableStateOf<List<LibbyWant>?>(null) }
    val scope = rememberCoroutineScope()
    LaunchedEffect(Unit) { wants = runCatching { repo.web.libbyWants().wants }.getOrDefault(emptyList()) }
    MindHead("What she wants", "Hers, carried between conversations the way her memory is.",
        action = { if (!wants.isNullOrEmpty()) TextButton(onClick = { scope.launch { runCatching { repo.web.clearLibbyWants() }.onSuccess { wants = emptyList() } } }) { Text("Clear") } })
    val list = wants
    when {
        list == null -> CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp)
        list.isEmpty() -> Text("Nothing she's said she wants yet.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        else -> list.forEach { w ->
            Row(Modifier.fillMaxWidth().padding(vertical = 2.dp), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(w.text, style = MaterialTheme.typography.bodyMedium)
                    Text(whenLabel(w.at), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                IconButton(onClick = { scope.launch { runCatching { repo.web.forgetLibbyWant(w.id) }.onSuccess { wants = wants?.filterNot { it.id == w.id } } } }) {
                    Icon(Icons.Filled.Close, contentDescription = "Forget this", tint = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}

/** What she writes after a conversation goes quiet, and asking her to write now. */
@Composable
private fun LibbyJournalSection(repo: Repository) {
    var entries by remember { mutableStateOf<List<LibbyJournalEntry>?>(null) }
    var writing by remember { mutableStateOf(false) }
    var note by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()
    LaunchedEffect(Unit) { entries = runCatching { repo.web.libbyJournal().entries }.getOrDefault(emptyList()) }
    MindHead("Her journal", "She writes after a conversation goes quiet.", action = {
        TextButton(enabled = !writing, onClick = {
            writing = true; note = ""
            scope.launch {
                runCatching { repo.web.reflectLibby() }
                    .onSuccess { r -> r.entry?.let { e -> entries = listOf(e) + entries.orEmpty() } ?: run { note = r.message.ifBlank { "She had nothing new to write." } } }
                    .onFailure { note = it.serverMessage("She couldn't write just now.") }
                writing = false
            }
        }) {
            if (writing) CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp) else Icon(Icons.Filled.EditNote, contentDescription = null, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(6.dp))
            Text(if (writing) "Writing…" else "Write now")
        }
    })
    if (note.isNotEmpty()) Text(note, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    val list = entries
    when {
        list == null -> CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp)
        list.isEmpty() -> Text("No entries yet.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        else -> list.take(12).forEach { e ->
            InkPanel(Modifier.fillMaxWidth().padding(vertical = 3.dp), padding = PaddingValues(12.dp)) {
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(listOf(whenLabel(e.at), e.mood).filter { it.isNotBlank() }.joinToString(" · "), style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(1f))
                        IconButton(onClick = { scope.launch { runCatching { repo.web.forgetJournalEntry(e.id) }.onSuccess { entries = entries?.filterNot { it.id == e.id } } } },
                            modifier = Modifier.size(28.dp)) { Icon(Icons.Filled.Close, contentDescription = "Delete this entry", modifier = Modifier.size(16.dp)) }
                    }
                    Text(e.text, style = MaterialTheme.typography.bodySmall.copy(fontStyle = FontStyle.Italic))
                }
            }
        }
    }
}

/**
 * When she may speak first. The phone keeps the idle timer (ChatScreen) because only it
 * knows whether anyone is looking; the server owns the decision, and these are its rules.
 */
@Composable
private fun LibbyAutoSection(repo: Repository) {
    var state by remember { mutableStateOf<LibbyAutoState?>(null) }
    val scope = rememberCoroutineScope()
    LaunchedEffect(Unit) { state = runCatching { repo.web.libbyAuto() }.getOrNull() }
    MindHead("Speaking first", "When the chat goes quiet after her, or something is worth saying.")
    val st = state ?: return
    fun save(next: net.fourbakers.oppailib.data.LibbyAutoSettings) {
        state = st.copy(settings = next)
        scope.launch {
            runCatching { repo.web.saveLibbyAuto(next) }
                .onSuccess { r -> state = state?.copy(settings = r.settings) }
                .onFailure { repo.report(it.serverMessage("Couldn't save when she may speak first.")) }
        }
    }
    val s = st.settings
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text("She may message first", style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
        Switch(checked = s.enabled, onCheckedChange = { save(s.copy(enabled = it)) })
    }
    if (!s.enabled) return
    Text(st.idle.reason, style = MaterialTheme.typography.bodySmall, color = if (st.idle.allow) LocalInk.current.success else MaterialTheme.colorScheme.onSurfaceVariant)
    Text("Quiet from ${s.quietFrom}:00 to ${s.quietTo}:00", style = MaterialTheme.typography.labelLarge, modifier = Modifier.padding(top = 6.dp))
    Slider(s.quietFrom.toFloat(), { save(s.copy(quietFrom = it.toInt())) }, valueRange = 0f..23f, steps = 22)
    Slider(s.quietTo.toFloat(), { save(s.copy(quietTo = it.toInt())) }, valueRange = 0f..23f, steps = 22)
    Text("At least ${s.minGapMinutes} minutes between", style = MaterialTheme.typography.labelLarge)
    Slider(s.minGapMinutes.toFloat(), { save(s.copy(minGapMinutes = it.toInt())) }, valueRange = 10f..240f)
    Text(if (s.maxPerDay == 0) "No daily cap" else "At most ${s.maxPerDay} a day", style = MaterialTheme.typography.labelLarge)
    Slider(s.maxPerDay.toFloat(), { save(s.copy(maxPerDay = it.toInt())) }, valueRange = 0f..20f, steps = 19)
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text("Something important gets through her back-off", style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
        Switch(checked = s.allowImportant, onCheckedChange = { save(s.copy(allowImportant = it)) })
    }
    if (st.log.isNotEmpty()) {
        Kicker("Lately · ${st.sentToday} today", Modifier.padding(top = 6.dp))
        st.log.takeLast(6).reversed().forEach { e ->
            Text("${whenLabel(e.at)} · ${e.trigger}${if (e.answered) " · answered" else ""}${if (e.detail.isNotBlank()) " — ${e.detail}" else ""}",
                style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

/** Her on Discord: the connection, the on switch and the memory policy. The allowlists
 *  of people and channels are built on the web, where the servers can be listed. */
@Composable
private fun DiscordSection(repo: Repository) {
    var d by remember { mutableStateOf<DiscordState?>(null) }
    var token by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    LaunchedEffect(Unit) { d = runCatching { repo.web.discord() }.getOrNull() }
    val st = d ?: return
    MindHead("Discord", st.note.ifBlank { if (st.connected) "Connected as ${st.botName}" else "Not connected" })
    fun apply(block: suspend () -> DiscordState?) {
        busy = true
        scope.launch {
            runCatching { block() }.onSuccess { it?.let { n -> d = n } }.onFailure { repo.report(it.serverMessage("Discord didn't take that.")) }
            busy = false
        }
    }
    if (!st.hasToken) {
        OutlinedTextField(token, { token = it }, label = { Text("Bot token") }, singleLine = true,
            visualTransformation = PasswordVisualTransformation(), modifier = Modifier.fillMaxWidth())
        PrimaryButton("Connect", onClick = { apply { repo.web.connectDiscord(DiscordToken(token.trim())).also { token = "" } } },
            enabled = token.isNotBlank() && !busy, modifier = Modifier.padding(top = 6.dp))
        return
    }
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text("She answers on Discord", style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
        Switch(checked = st.enabled, enabled = !busy, onCheckedChange = { on -> apply { repo.web.saveDiscord(DiscordPatch(enabled = on)) } })
    }
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text("One memory with the app", style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
        Switch(checked = st.memory == "shared", enabled = !busy, onCheckedChange = { on -> apply { repo.web.saveDiscord(DiscordPatch(memory = if (on) "shared" else "none")) } })
    }
    Text("${st.users.size} ${if (st.users.size == 1) "person" else "people"} and ${st.channels.size} ${if (st.channels.size == 1) "channel" else "channels"} allowed · set on the web",
        style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    st.log.takeLast(4).reversed().forEach { e ->
        Text("${whenLabel(e.at)} · ${e.kind}${if (e.detail.isNotBlank()) " — ${e.detail}" else ""}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
    TextButton(onClick = { apply { repo.web.disconnectDiscord(); repo.web.discord() } }, enabled = !busy) { Text("Disconnect", color = MaterialTheme.colorScheme.error) }
}

/**
 * Her reaction shelf: images and gifs she sends by their label, kept byte for byte and
 * never mistaken for a selfie. Add from the phone; hold one to rename or remove it.
 */
@OptIn(ExperimentalLayoutApi::class, ExperimentalFoundationApi::class)
@Composable
internal fun LibbyStickersTab(repo: Repository) {
    var items by remember { mutableStateOf<List<LibbySticker>?>(null) }
    var uploading by remember { mutableStateOf(false) }
    var editing by remember { mutableStateOf<LibbySticker?>(null) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    LaunchedEffect(Unit) { items = runCatching { repo.web.libbyStickers().items }.getOrDefault(emptyList()) }
    val picker = rememberSystemPickerLauncher(ActivityResultContracts.OpenMultipleDocuments()) { uris: List<Uri>? ->
        if (uris.isNullOrEmpty()) return@rememberSystemPickerLauncher
        uploading = true
        scope.launch {
            for (uri in uris) {
                runCatching {
                    val (name, bytes, mime) = withContext(Dispatchers.IO) {
                        val cr = context.contentResolver
                        val n = cr.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { c -> if (c.moveToFirst()) c.getString(0) else null } ?: "reaction"
                        Triple(n, cr.openInputStream(uri)!!.use { it.readBytes() }, cr.getType(uri) ?: "image/*")
                    }
                    repo.web.uploadLibbySticker(name, null, bytes.toRequestBody(mime.toMediaTypeOrNull()))
                }.onSuccess { s -> items = items.orEmpty() + s }
                    .onFailure { repo.report(it.serverMessage("Couldn't put that on her shelf.")) }
            }
            uploading = false
        }
    }
    MindHead("Reaction images", "She sends one by its label when a reply wants it.", action = {
        ToolButton(Icons.Filled.Add, "Add", { picker.launch(arrayOf("image/*")) }, label = if (uploading) "Adding…" else "Add", enabled = !uploading)
    })
    val list = items
    when {
        list == null -> CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp)
        list.isEmpty() -> EmptyNote("Her shelf is empty. Add a few reaction images or gifs and she'll use them.")
        else -> FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(10.dp), maxItemsInEachRow = 3) {
            list.forEach { s ->
                Column(Modifier.weight(1f).combinedClickable(onClick = { editing = s }, onLongClick = { editing = s })) {
                    Box(Modifier.fillMaxWidth().aspectRatio(1f).clip(RoundedCornerShape(10.dp)).background(MaterialTheme.colorScheme.surfaceContainer)) {
                        AsyncImage(repo.libbyStickerUrl(s.id), s.label, imageLoader = repo.imageLoader, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                    }
                    Text(s.label, style = MaterialTheme.typography.labelMedium, maxLines = 1, modifier = Modifier.padding(top = 4.dp))
                    if (s.sent > 0) Text("sent ${s.sent}×", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
    editing?.let { s ->
        var label by remember(s.id) { mutableStateOf(s.label) }
        var tags by remember(s.id) { mutableStateOf(s.tags.joinToString(", ")) }
        AlertDialog(
            onDismissRequest = { editing = null },
            title = { Text("Reaction image") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(label, { label = it }, label = { Text("Label she sends it by") }, singleLine = true)
                    OutlinedTextField(tags, { tags = it }, label = { Text("Tags") }, singleLine = true)
                }
            },
            confirmButton = { TextButton(onClick = {
                editing = null
                scope.launch {
                    runCatching { repo.web.updateLibbySticker(s.id, StickerPatch(label = label.trim(), tags = tags.split(',').map { it.trim() }.filter { it.isNotEmpty() })) }
                        .onSuccess { n -> items = items?.map { if (it.id == n.id) n else it } }
                        .onFailure { repo.report(it.serverMessage("Couldn't rename it.")) }
                }
            }) { Text("Save") } },
            dismissButton = { TextButton(onClick = {
                editing = null
                scope.launch { runCatching { repo.web.deleteLibbySticker(s.id) }.onSuccess { items = items?.filterNot { it.id == s.id } } }
            }) { Icon(Icons.Filled.Delete, contentDescription = null, tint = MaterialTheme.colorScheme.error); Text(" Remove", color = MaterialTheme.colorScheme.error) } },
        )
    }
}

/** A character's gallery taken home as one zip with a manifest of its tags and recipes. */
@Composable
internal fun ChatGalleryExport(repo: Repository, characterId: String, libby: Boolean) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var shelf by remember { mutableStateOf("hers") }
    var saving by remember { mutableStateOf(false) }
    val saver = rememberSystemPickerLauncher(ActivityResultContracts.CreateDocument("application/zip")) { uri: Uri? ->
        if (uri == null) return@rememberSystemPickerLauncher
        saving = true
        scope.launch {
            runCatching {
                withContext(Dispatchers.IO) {
                    repo.web.chatImagesExport(characterId, shelf).use { body ->
                        context.contentResolver.openOutputStream(uri)!!.use { out -> body.byteStream().copyTo(out) }
                    }
                }
            }.onSuccess { repo.report("Saved the gallery.", "happy") }
                .onFailure { repo.report(it.serverMessage("Couldn't export the gallery.")) }
            saving = false
        }
    }
    MindHead("Take the gallery home", "One zip, with a manifest of each picture's tags and how it was made.")
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        if (libby) Segmented(listOf("hers" to "Of her", "others" to "Shared with her", "all" to "All"), shelf, { shelf = it })
        OutlinedButton(onClick = { saver.launch("${if (libby) "libby" else characterId}-$shelf.zip") }, enabled = !saving) {
            if (saving) CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp) else Icon(Icons.Filled.Download, contentDescription = null, modifier = Modifier.size(16.dp))
            Spacer(Modifier.width(6.dp))
            Text(if (saving) "Saving…" else "Download zip")
        }
    }
}

/**
 * The studio gallery's zip for Civitai: the picked pictures, or the whole folder on
 * screen, each with its parameters written in and beside it.
 */
@Composable
internal fun GalleryZipButton(repo: Repository, names: List<String>, board: String) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var saving by remember { mutableStateOf(false) }
    val saver = rememberSystemPickerLauncher(ActivityResultContracts.CreateDocument("application/zip")) { uri: Uri? ->
        if (uri == null) return@rememberSystemPickerLauncher
        saving = true
        scope.launch {
            runCatching {
                withContext(Dispatchers.IO) {
                    val body = if (names.isNotEmpty()) repo.web.galleryExport(names = names.joinToString(",")) else repo.web.galleryExport(board = board)
                    body.use { b -> context.contentResolver.openOutputStream(uri)!!.use { out -> b.byteStream().copyTo(out) } }
                }
            }.onSuccess { repo.report("Saved the zip.", "happy") }
                .onFailure { repo.report(it.serverMessage("Couldn't make the zip.")) }
            saving = false
        }
    }
    ToolButton(Icons.Filled.Download, "Download a zip", { saver.launch(if (names.isNotEmpty()) "pictures-${names.size}.zip" else "gallery-$board.zip") },
        label = if (saving) "Zipping…" else if (names.isNotEmpty()) "Zip ${names.size}" else "Zip all", enabled = !saving)
}
