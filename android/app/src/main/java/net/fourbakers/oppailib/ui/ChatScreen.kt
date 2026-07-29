package net.fourbakers.oppailib.ui

import android.util.Base64
import androidx.activity.compose.BackHandler
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.AddComment
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Gif
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.Movie
import androidx.compose.material.icons.filled.Sell
import androidx.compose.material.icons.filled.SportsEsports
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.DeleteSweep
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.CallEnd
import androidx.compose.material.icons.filled.Videocam
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Slider
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import kotlinx.serialization.json.buildJsonObject
import net.fourbakers.oppailib.data.ChatCharacter
import net.fourbakers.oppailib.data.ChatConversation
import net.fourbakers.oppailib.data.ChatImage
import net.fourbakers.oppailib.data.ChatImageUpload
import net.fourbakers.oppailib.data.ChatMessage
import net.fourbakers.oppailib.data.ChatModels
import net.fourbakers.oppailib.data.ChatRequest
import net.fourbakers.oppailib.data.ChatStatus
import net.fourbakers.oppailib.data.ChatWorkspace
import net.fourbakers.oppailib.data.LibbyAction
import net.fourbakers.oppailib.data.LibbyActRequest
import net.fourbakers.oppailib.data.LibbyLink
import net.fourbakers.oppailib.data.LibbyMemory
import net.fourbakers.oppailib.data.LibbyMeter
import net.fourbakers.oppailib.data.LibbyVoice
import net.fourbakers.oppailib.data.Media
import net.fourbakers.oppailib.data.Repository
import net.fourbakers.oppailib.data.StoredChatMessage
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

private object ChatColors {
    val rail: Color @Composable get() = MaterialTheme.colorScheme.surface
    val side: Color @Composable get() = MaterialTheme.colorScheme.surfaceVariant
    val main: Color @Composable get() = MaterialTheme.colorScheme.background
    val input: Color @Composable get() = MaterialTheme.colorScheme.surfaceVariant
    val text: Color @Composable get() = MaterialTheme.colorScheme.onSurface
    val muted: Color @Composable get() = MaterialTheme.colorScheme.onSurfaceVariant
    val accent: Color @Composable get() = MaterialTheme.colorScheme.primary
    val danger: Color @Composable get() = MaterialTheme.colorScheme.error
}

private data class ChatMode(val id: String, val label: String, val emotion: String)
private val chatModes = listOf(
    ChatMode("sweet", "sweet", "happy"), ChatMode("playful", "playful", "mischievous"),
    ChatMode("bold", "bold", "surprised"), ChatMode("roleplay", "roleplay", "thinking"),
    ChatMode("horny", "horny", "mischievous"),
)
private fun chatID() = UUID.randomUUID().toString().replace("-", "")
private val chatStamp = SimpleDateFormat("h:mm a", Locale.getDefault())
private fun timeOf(ms: Long) = chatStamp.format(Date(ms))
private fun baseOptions() = buildJsonObject { put("temperature", .8); put("top_p", .95); put("repetition_penalty", 1.1); put("max_tokens", 400) }

/**
 * What the typing indicator is doing right now.
 *
 * TYPING shows the dots; THINKING clears them while leaving the turn in progress —
 * which is what a pause mid-message looks like from the other side of a chat window.
 * The reply is already in hand by then; this is purely about when the user sees it.
 */
private enum class TypingPhase { IDLE, TYPING, THINKING }

/**
 * Holds a finished reply back for as long as it would plausibly have taken to write,
 * so the character reads as someone typing rather than a service responding. The
 * phone-side mirror of the web client's typeLikeAPerson.
 *
 * Three things are being imitated. Reading what you said before starting. Typing time
 * that scales with what she actually wrote. And second thoughts: sometimes the dots
 * stop partway, sit quiet for a beat, and start again — the shape a message that got
 * half-typed, deleted, and rewritten leaves in a chat window.
 *
 * The generation time already spent counts against all of it, so a slow model does not
 * pay twice; on a slow backend this adds nothing at all. The total is capped because
 * charm wears off fast when you are waiting for it.
 */
private suspend fun typeLikeAPerson(text: String, spentMs: Long, phase: (TypingPhase) -> Unit) {
    fun jitter(base: Double) = base * (0.7 + Math.random() * 0.6)
    // ~22 characters a second, which reads as a quick but human phone typist.
    val budget = minOf(7000.0, jitter(420.0 + text.length * 45.0))
    var remaining = (budget - spentMs).coerceAtLeast(0.0)
    if (remaining < 120) { phase(TypingPhase.IDLE); return }

    phase(TypingPhase.THINKING)
    val reading = minOf(remaining, jitter(500.0))
    delay(reading.toLong())
    remaining -= reading

    // Longer messages are likelier to get rewritten, and never on a one-liner: an
    // eight-word reply that visibly took three attempts is a tell, not a texture.
    if (text.length > 90 && remaining > 900 && Math.random() < 0.35) {
        val firstAttempt = remaining * (0.3 + Math.random() * 0.3)
        phase(TypingPhase.TYPING)
        delay(firstAttempt.toLong())
        phase(TypingPhase.THINKING)
        val reconsider = jitter(650.0)
        delay(reconsider.toLong())
        remaining -= firstAttempt + reconsider
    }
    if (remaining > 0) {
        phase(TypingPhase.TYPING)
        delay(remaining.toLong())
    }
    phase(TypingPhase.IDLE)
}

/**
 * Opens a library item a reply pointed at.
 *
 * Chat does not own the viewer — the library screen does — so a chip tap is a request
 * that rises to whoever mounted this screen, the same way the web client's chips
 * dispatch OPEN_MEDIA_EVENT up to the app shell.
 */
typealias OpenMedia = (Long) -> Unit

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen(
    repo: Repository,
    onBack: () -> Unit,
    onOpenMedia: OpenMedia = {},
    sharedMedia: Media? = null,
    onSharedMediaConsumed: () -> Unit = {},
) {
    var status by remember { mutableStateOf<ChatStatus?>(null) }
    var models by remember { mutableStateOf<ChatModels?>(null) }
    var workspace by remember { mutableStateOf<ChatWorkspace?>(null) }
    var characterId by remember { mutableStateOf("libby") }
    var conversationId by remember { mutableStateOf("") }
    var draft by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var typingPhase by remember { mutableStateOf(TypingPhase.IDLE) }
    var message by remember { mutableStateOf("") }
    var settingsOpen by remember { mutableStateOf(false) }
    var settingsTab by remember { mutableStateOf("character") }
    var addFriend by remember { mutableStateOf(false) }
    var friendName by remember { mutableStateOf("") }
    var imageTags by remember { mutableStateOf("") }
    var uploading by remember { mutableStateOf(false) }
    /** A library image handed in from the hold menu, uploaded and waiting in the
        composer exactly like the web client's Share with… flow. */
    var pendingPhoto by remember { mutableStateOf<ChatImage?>(null) }
    var callOpen by remember { mutableStateOf(false) }
    var callSeconds by remember { mutableStateOf(0) }
    var overflowOpen by remember { mutableStateOf(false) }
    // A conversation pending a delete confirmation, so a mis-tap doesn't wipe history.
    var confirmDelete by remember { mutableStateOf<ChatConversation?>(null) }
    var saveJob by remember { mutableStateOf<Job?>(null) }
    val intensity by LibbyMeter.value.collectAsState()
    val scope = rememberCoroutineScope()
    val list = rememberLazyListState()
    val drawer = rememberDrawerState(DrawerValue.Closed)
    val context = LocalContext.current

    fun save(next: ChatWorkspace, quiet: Boolean = true) {
        workspace = next
        saveJob?.cancel()
        saveJob = scope.launch {
            if (quiet) delay(350)
            runCatching { repo.api.saveChatWorkspace(next) }
                .onSuccess { if (workspace == next) workspace = it }
                .onFailure { if (!quiet) message = it.message ?: "Couldn't save chat" }
        }
    }

    fun conversations(ws: ChatWorkspace, id: String) = ws.conversations.filter { it.characterId == id }.sortedByDescending { it.updatedAt }
    fun currentCharacter(ws: ChatWorkspace?) = ws?.characters?.firstOrNull { it.id == characterId } ?: ws?.characters?.firstOrNull()
    fun currentConversation(ws: ChatWorkspace?) = ws?.conversations?.firstOrNull { it.id == conversationId }

    fun newConversation(ws: ChatWorkspace, char: ChatCharacter): ChatWorkspace {
        val now = System.currentTimeMillis()
        val opener = if (char.firstMessage.isNotBlank()) char.firstMessage else if (char.id == "libby") LibbyVoice.opener(char.defaultMode).message else ""
        val convo = ChatConversation(
            id = chatID(), characterId = char.id, mode = char.defaultMode, emotion = chatModes.firstOrNull { it.id == char.defaultMode }?.emotion ?: "neutral",
            intensity = if (char.id == "libby") intensity else 1, progress = if (char.id == "libby") intensity.toDouble() else 1.0, options = baseOptions(),
            messages = if (opener.isBlank()) emptyList() else listOf(StoredChatMessage(chatID(), "assistant", opener, now)), createdAt = now, updatedAt = now,
        )
        characterId = char.id; conversationId = convo.id
        return ws.copy(conversations = ws.conversations + convo)
    }

    fun updateConversation(transform: (ChatConversation) -> ChatConversation) {
        val ws = workspace ?: return
        save(ws.copy(conversations = ws.conversations.map { if (it.id == conversationId) transform(it).copy(updatedAt = System.currentTimeMillis()) else it }))
    }

    fun updateCharacter(transform: (ChatCharacter) -> ChatCharacter) {
        val ws = workspace ?: return
        save(ws.copy(characters = ws.characters.map { if (it.id == characterId) transform(it) else it }))
    }

    // Removes a conversation, mirroring the web drawer's delete. Only re-points the open
    // conversation when it was the one deleted — dropping a background chat should not
    // yank the user out of the one they are reading. When the last chat for a friend
    // goes, a fresh empty one takes its place so the screen is never left with nothing.
    fun deleteConversation(id: String) {
        val ws = workspace ?: return
        val target = ws.conversations.firstOrNull { it.id == id } ?: return
        val remaining = ws.conversations.filterNot { it.id == id }
        if (conversationId != id) { save(ws.copy(conversations = remaining)); return }
        val nextSame = remaining.filter { it.characterId == target.characterId }.maxByOrNull { it.updatedAt }
        if (nextSame != null) { conversationId = nextSame.id; save(ws.copy(conversations = remaining)) }
        else {
            val char = ws.characters.firstOrNull { it.id == target.characterId }
            if (char != null) save(newConversation(ws.copy(conversations = remaining), char)) else save(ws.copy(conversations = remaining))
        }
    }

    // Reading the file, base64-encoding it, and letting the converter serialize the
    // resulting ~11 MB string are all synchronous, and all of it used to run on the
    // main thread — which is why picking a large image froze the whole app until the
    // upload finished. None of it touches the UI, so all of it belongs on IO.
    val imagePicker = rememberSystemPickerLauncher(ActivityResultContracts.GetContent()) { uri ->
        val ws = workspace; val char = currentCharacter(ws)
        if (uri != null && ws != null && char != null && !uploading) scope.launch {
            uploading = true
            message = "Scanning image locally…"
            val tags = imageTags.split(",").map(String::trim).filter(String::isNotBlank)
            runCatching {
                withContext(Dispatchers.IO) {
                    val bytes = context.contentResolver.openInputStream(uri)!!.use { it.readBytes() }
                    require(bytes.size <= 8 * 1024 * 1024) { "Image must be 8 MB or smaller" }
                    val mime = context.contentResolver.getType(uri) ?: "image/jpeg"
                    val data = "data:$mime;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP)
                    repo.api.uploadChatImage(ChatImageUpload(char.id, "Character image", data, tags))
                }
            }.onSuccess { image ->
                // The workspace may have moved on while the upload was in flight, so this
                // merges into the current one rather than the snapshot taken at pick time.
                val latest = workspace ?: ws
                val chars = latest.characters.map { if (it.id == char.id && it.avatarImageId.isBlank()) it.copy(avatarImageId = image.id) else it }
                save(latest.copy(characters = chars, images = latest.images + image)); imageTags = ""; message = "Image scanned: ${image.tags.joinToString().ifBlank { "no content tags" }}"
            }.onFailure { message = it.message ?: "Image upload failed" }
            uploading = false
        }
    }

    val cardImporter = rememberSystemPickerLauncher(ActivityResultContracts.GetContent()) { uri ->
        val ws = workspace
        if (uri != null && ws != null) scope.launch {
            runCatching {
                withContext(Dispatchers.IO) {
                    val bytes = context.contentResolver.openInputStream(uri)!!.use { it.readBytes() }
                    importedChatCharacter(bytes)
                }
            }.onSuccess { char -> val latest = workspace ?: ws; val next = newConversation(latest.copy(characters = latest.characters + char), char); save(next); message = "${char.name} joined your friends." }
                .onFailure { message = "Couldn't import that character card." }
        }
    }

    LaunchedEffect(Unit) {
        runCatching { status = repo.api.chatStatus(); repo.api.chatWorkspace() }
            .onSuccess { loaded ->
                var next = loaded
                val char = loaded.characters.firstOrNull() ?: return@onSuccess
                characterId = char.id
                val convo = conversations(loaded, char.id).firstOrNull()
                if (convo == null) next = newConversation(loaded, char) else conversationId = convo.id
                workspace = next
                if (next !== loaded) save(next)
            }.onFailure { message = it.message ?: "Couldn't reach chat" }
        if (status?.modelBackend == true) models = runCatching { repo.api.chatModels() }.getOrNull()
    }

    LaunchedEffect(sharedMedia?.id, workspace != null) {
        val media = sharedMedia ?: return@LaunchedEffect
        val loaded = workspace ?: return@LaunchedEffect
        try {
            val libby = loaded.characters.firstOrNull { it.id == "libby" }
                ?: error("Libby isn't available in this chat workspace.")
            characterId = libby.id
            var next = loaded
            val conversation = conversations(next, libby.id).firstOrNull()
            if (conversation == null) next = newConversation(next, libby) else conversationId = conversation.id
            workspace = next
            message = "Scanning ${media.title.ifBlank { "library image" }} locally…"
            val image = repo.api.uploadChatImage(mediaChatUpload(repo, media, libby.id))
            val latest = workspace ?: next
            save(latest.copy(images = (latest.images + image).distinctBy { it.id }))
            pendingPhoto = image
            message = "Ready to show Libby — add a message or send the photo as-is."
        } catch (error: Exception) {
            message = error.message ?: "Couldn't share that image with Libby."
        } finally {
            onSharedMediaConsumed()
        }
    }

    val active = currentConversation(workspace)
    LaunchedEffect(active?.messages?.size, typingPhase) {
        // The intro only occupies index 0 while the log is empty, so the last row is
        // simply the item count minus one — plus the typing line when it is showing.
        val rows = (active?.messages?.size ?: 0).coerceAtLeast(1) +
            if (busy && typingPhase == TypingPhase.TYPING) 1 else 0
        list.animateScrollToItem(rows - 1)
    }

    fun sendMessage() {
        val ws = workspace ?: return; val char = currentCharacter(ws) ?: return; val convo = currentConversation(ws) ?: return
        val photo = pendingPhoto
        val text = draft.trim().ifBlank { if (photo != null) "*shares a photo with you*" else "" }
        if (text.isBlank() || busy) return
        val now = System.currentTimeMillis(); val userLine = StoredChatMessage(chatID(), "user", text, now, imageId = photo?.id.orEmpty())
        val pending = convo.copy(title = if (convo.title == "New conversation") text.take(42) else convo.title, messages = convo.messages + userLine, updatedAt = now)
        workspace = ws.copy(conversations = ws.conversations.map { if (it.id == convo.id) pending else it }); draft = ""; pendingPhoto = null; busy = true; message = ""
        scope.launch {
            if (status?.enabled != true && (status?.configured == true || status?.modelBackend == true)) {
                runCatching { repo.api.chatStatus() }.getOrNull()?.let { status = it }
            }
            if (status?.enabled != true) {
                if (char.id != "libby") { message = status?.message?.ifBlank { null } ?: "Load a model in text-generation-webui, then refresh backend status."; busy = false; return@launch }
                val progression = LibbyMeter.applyProgression(pending.progress, LibbyVoice.heatDelta(text, pending.mode))
                val line = LibbyVoice.reply(text, pending.mode, pending.emotion, progression.second, advance = false)
                typeLikeAPerson(line.message, 0) { typingPhase = it }
                LibbyMeter.set(progression.second)
                val done = pending.copy(emotion = line.emotion, intensity = progression.second, progress = progression.first, messages = pending.messages + StoredChatMessage(chatID(), "assistant", line.message, System.currentTimeMillis()), updatedAt = System.currentTimeMillis())
                save(workspace!!.copy(conversations = workspace!!.conversations.map { if (it.id == done.id) done else it })); busy = false; return@launch
            }
            // Thoughts are left out: they were never said, so replaying them as assistant
            // lines hands the model words she did not speak and teaches it that the format
            // belongs inline. Continuity is carried by her memory and the bond instead.
            val history = pending.messages.filter { it.thought.isBlank() }.map { ChatMessage(it.role, it.content) }
            val startedAt = System.currentTimeMillis()
            typingPhase = TypingPhase.TYPING
            // Pictures already seen in this conversation ride along so the server can
            // hold them back: without this the best-scoring image in a gallery is the
            // only one that ever gets sent.
            val seenPictures = pending.messages.mapNotNull { it.imageId.ifBlank { null } }.distinct().takeLast(12)
            val generation = runCatching {
                repo.api.chat(
                    ChatRequest(
                        mode = pending.mode,
                        messages = history,
                        emotion = pending.emotion,
                        intensity = pending.intensity,
                        options = pending.options,
                        characterId = char.id,
                        photoTags = photo?.tags.orEmpty(),
                        photoImageId = photo?.id.orEmpty(),
                        recentImageIds = seenPictures,
                        // What she has on: the worn outfit is a per-device pref, so the
                        // server cannot know it unless this says so.
                        outfit = if (char.id == "libby") repo.prefs.libbyOutfit else "",
                    ),
                )
            }
            generation
                .onSuccess { reply ->
                    // Whatever the model already spent counts as time she was "writing", so
                    // this only ever tops the wait up to something human — never adds a full
                    // delay on top of a slow generation.
                    // Nothing she said means she had a thought and decided to keep it, so
                    // there is no typing to simulate — thinking is not typing, and an
                    // indicator in front of a thought would claim she was composing it
                    // for you.
                    if (reply.message.isNotBlank()) typeLikeAPerson(reply.message, System.currentTimeMillis() - startedAt) { typingPhase = it }
                    // A mood the character named is a decision, not drift, so it lands
                    // where it asked. Running it through the progression multiplier is what
                    // used to halve every deliberate swing: a jump from 1 to 5 arrived as a
                    // 3, and the scene never caught up.
                    val (progress, level) = if (reply.declared) {
                        val stated = reply.intensity.coerceIn(1, LibbyMeter.MAX)
                        stated.toDouble() to stated
                    } else {
                        LibbyMeter.applyProgression(pending.progress, reply.intensity - pending.intensity)
                    }
                    LibbyMeter.set(level)
                    // Anything she thought rather than said lands first and on its own,
                    // because that is the order it happened in: she looked, reacted, and
                    // then decided what to say.
                    val thoughtLines = reply.thoughts.filter { it.text.isNotBlank() }.map {
                        StoredChatMessage(chatID(), "assistant", it.text, System.currentTimeMillis(), thought = it.kind)
                    }
                    val spoken = if (reply.message.isBlank()) emptyList()
                    else listOf(StoredChatMessage(chatID(), "assistant", reply.message, System.currentTimeMillis(), reply.imageId, reply.links, reply.actions))
                    val done = pending.copy(emotion = reply.emotion, intensity = level, progress = progress, messages = pending.messages + thoughtLines + spoken, updatedAt = System.currentTimeMillis())
                    val latest = workspace ?: ws; save(latest.copy(conversations = latest.conversations.map { if (it.id == done.id) done else it }))
                }.onFailure { error ->
                    status = runCatching { repo.api.chatStatus() }.getOrNull() ?: status
                    message = status?.takeIf { !it.enabled }?.message?.ifBlank { null } ?: error.message ?: "Chat failed"
                }
            typingPhase = TypingPhase.IDLE
            busy = false
        }
    }

    BackHandler(onBack = onBack)
    LaunchedEffect(callOpen) {
        if (!callOpen) return@LaunchedEffect
        callSeconds = 0
        while (callOpen) { delay(1_000); callSeconds++ }
    }
    confirmDelete?.let { pending ->
        AlertDialog(
            onDismissRequest = { confirmDelete = null },
            title = { Text("Delete conversation") },
            text = { Text("Delete \"${pending.title}\"? This can't be undone.") },
            confirmButton = { Button(onClick = { deleteConversation(pending.id); confirmDelete = null }) { Text("Delete") } },
            dismissButton = { TextButton(onClick = { confirmDelete = null }) { Text("Cancel") } },
        )
    }
    if (addFriend) AlertDialog(
        onDismissRequest = { addFriend = false }, title = { Text("Add a friend") },
        text = { TextField(friendName, { friendName = it }, label = { Text("Name") }) },
        confirmButton = { Button(onClick = {
            val ws = workspace ?: return@Button; val char = ChatCharacter(chatID(), friendName.trim().ifBlank { "New friend" }, firstMessage = "Hey! It's nice to meet you.")
            save(newConversation(ws.copy(characters = ws.characters + char), char)); friendName = ""; addFriend = false; settingsOpen = true
        }) { Text("Add") } }, dismissButton = { TextButton(onClick = { addFriend = false }) { Text("Cancel") } },
    )

    val callWorkspace = workspace
    val callCharacter = currentCharacter(callWorkspace)
    val callConversation = currentConversation(callWorkspace)
    if (callOpen && callCharacter?.id == "libby" && callConversation != null) {
        BackHandler { callOpen = false }
        LibbyVideoCall(
            repo = repo,
            conversation = callConversation,
            busy = busy,
            seconds = callSeconds,
            draft = draft,
            onDraft = { draft = it },
            onSend = { sendMessage() },
            onEnd = { callOpen = false },
        )
        return
    }

    ModalNavigationDrawer(
        drawerState = drawer,
        drawerContent = { workspace?.let { ws -> ChatDrawer(repo, ws, characterId, conversationId, status?.enabled == true,
            onCharacter = { id -> characterId = id; val c = conversations(ws, id).firstOrNull(); if (c == null) save(newConversation(ws, ws.characters.first { it.id == id })) else conversationId = c.id; scope.launch { drawer.close() } },
            onConversation = { conversationId = it; characterId = ws.conversations.first { c -> c.id == it }.characterId; scope.launch { drawer.close() } },
            onNewConversation = { val char = currentCharacter(ws) ?: return@ChatDrawer; save(newConversation(ws, char)); scope.launch { drawer.close() } }, onAddFriend = { addFriend = true }, onDeleteConversation = { confirmDelete = it }) } },
    ) {
        val ws = workspace; val char = currentCharacter(ws); val convo = currentConversation(ws)
        if (ws == null || char == null || convo == null) Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        // The activity draws edge to edge, so without this the top bar sits under the
        // status bar and — because adjustResize does nothing once the window stops
        // fitting system windows — the keyboard covers the composer you are typing in.
        // safeDrawing is the one that unions bars, cutout, and IME, so a raised keyboard
        // does not also pay for the navigation bar it is covering.
        else Column(Modifier.fillMaxSize().background(ChatColors.main).windowInsetsPadding(WindowInsets.safeDrawing)) {
            Row(Modifier.fillMaxWidth().height(64.dp).padding(horizontal = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", tint = ChatColors.muted) }
                IconButton(onClick = { scope.launch { drawer.open() } }) { Icon(Icons.Filled.Menu, "Friends and conversations", tint = ChatColors.muted) }
                ChatAvatar(repo, char, Modifier.size(36.dp).clip(CircleShape))
                Column(Modifier.weight(1f).padding(horizontal = 10.dp)) {
                    Text(char.name, color = ChatColors.text, fontWeight = FontWeight.Bold, maxLines = 1)
                    Text(
                        if (char.id == "libby") "${if (status?.enabled == true) status?.model.orEmpty() else "local replies"} · chooses her own mood"
                        else "${convo.mode.replaceFirstChar(Char::uppercase)} · ${if (status?.enabled == true) status?.model.orEmpty() else "model offline"}",
                        color = ChatColors.muted, fontSize = 11.sp, maxLines = 1,
                    )
                }
                IconButton(onClick = { settingsOpen = true }) { Icon(Icons.Filled.Settings, "Chat settings", tint = ChatColors.muted) }
                Box {
                    IconButton(onClick = { overflowOpen = true }) { Icon(Icons.Filled.MoreVert, "Conversation actions", tint = ChatColors.muted) }
                    DropdownMenu(expanded = overflowOpen, onDismissRequest = { overflowOpen = false }) {
                        if (char.id == "libby" && !repo.prefs.hideLibby) {
                            DropdownMenuItem(text = { Text("Video chat") }, leadingIcon = { Icon(Icons.Filled.Videocam, null) }, onClick = { overflowOpen = false; callOpen = true })
                        }
                        DropdownMenuItem(text = { Text("New conversation") }, leadingIcon = { Icon(Icons.Filled.AddComment, null) }, onClick = { overflowOpen = false; save(newConversation(ws, char)) })
                        DropdownMenuItem(text = { Text("Clear messages") }, leadingIcon = { Icon(Icons.Filled.DeleteSweep, null) }, enabled = convo.messages.isNotEmpty(), onClick = { overflowOpen = false; updateConversation { it.copy(messages = emptyList(), title = "New conversation") } })
                        DropdownMenuItem(text = { Text("Delete conversation", color = ChatColors.danger) }, leadingIcon = { Icon(Icons.Filled.Delete, null, tint = ChatColors.danger) }, onClick = { overflowOpen = false; confirmDelete = convo })
                    }
                }
            }
            if (char.id != "libby") {
                Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(horizontal = 12.dp, vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    chatModes.forEach { mode -> FilterChip(selected = convo.mode == mode.id, onClick = { updateConversation { it.copy(mode = mode.id) } }, label = { Text(mode.label.replaceFirstChar(Char::uppercase)) }) }
                }
            }
            if (status?.enabled != true) {
                val needsModel = char.id != "libby"
                val backendMessage = status?.message?.takeIf { it.isNotBlank() }
                Text(
                    if (needsModel) backendMessage ?: "A local model is required for ${char.name}. Tap for details."
                    else listOfNotNull(backendMessage, "Using Libby's built-in local replies.").joinToString(" "),
                    color = if (needsModel) ChatColors.danger else ChatColors.muted,
                    fontSize = 12.sp,
                    modifier = Modifier.fillMaxWidth().background(ChatColors.side).clickable { settingsTab = "generation"; settingsOpen = true }.padding(horizontal = 16.dp, vertical = 9.dp),
                )
            }
            LazyColumn(state = list, modifier = Modifier.weight(1f).fillMaxWidth(), contentPadding = PaddingValues(bottom = 12.dp)) {
                // The intro card is a placeholder for an empty log, not a permanent
                // header — once there is conversation to read, it is only taking room.
                if (convo.messages.isEmpty()) item { ChatIntro(repo, char, convo, status) }
                itemsIndexed(convo.messages, key = { _, item -> item.id }) { index, item -> ChatMessageRow(repo, ws, char, item, convo.messages.getOrNull(index - 1), onOpenMedia) }
                if (busy && typingPhase == TypingPhase.TYPING) item { Text("${char.name} is typing…", color = ChatColors.muted, fontSize = 13.sp, modifier = Modifier.padding(start = 68.dp, top = 8.dp)) }
            }
            if (message.isNotBlank()) Text(message, color = if (message.contains("fail", true) || message.contains("couldn", true)) ChatColors.danger else ChatColors.muted, fontSize = 13.sp, modifier = Modifier.fillMaxWidth().background(ChatColors.side).padding(10.dp))
            pendingPhoto?.let { photo ->
                Row(
                    Modifier.fillMaxWidth().background(ChatColors.side).padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    AsyncImage(repo.chatImageUrl(photo.id), photo.name, imageLoader = repo.imageLoader, contentScale = ContentScale.Crop, modifier = Modifier.size(54.dp).clip(RoundedCornerShape(8.dp)))
                    Column(Modifier.weight(1f).padding(horizontal = 10.dp)) {
                        Text(photo.name, color = ChatColors.text, fontWeight = FontWeight.SemiBold, maxLines = 1)
                        Text(photo.tags.take(6).joinToString().ifBlank { "Ready to send" }, color = ChatColors.muted, fontSize = 11.sp, maxLines = 1)
                    }
                    TextButton(onClick = { pendingPhoto = null }) { Text("Remove") }
                }
            }
            Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                TextField(draft, { draft = it }, placeholder = { Text("Message @${char.name}") }, enabled = !busy, maxLines = 4,
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send), keyboardActions = KeyboardActions(onSend = { sendMessage() }),
                    shape = RoundedCornerShape(22.dp),
                    colors = TextFieldDefaults.colors(focusedContainerColor = ChatColors.input, unfocusedContainerColor = ChatColors.input), modifier = Modifier.weight(1f))
                IconButton(onClick = { sendMessage() }, enabled = (draft.isNotBlank() || pendingPhoto != null) && !busy, modifier = Modifier.padding(start = 6.dp).clip(CircleShape).background(ChatColors.accent)) { Icon(Icons.AutoMirrored.Filled.Send, "Send", tint = MaterialTheme.colorScheme.onPrimary) }
            }
        }
    }

    if (settingsOpen && workspace != null) {
        val ws = workspace ?: return
        val char = currentCharacter(ws) ?: return
        val convo = currentConversation(ws) ?: return
        ModalBottomSheet(onDismissRequest = { settingsOpen = false }) {
            ChatSettings(
                repo, ws, char, convo, settingsTab, imageTags, models, uploading,
                onTab = { settingsTab = it }, onCharacter = { updateCharacter { _ -> it } }, onConversation = { replacement -> updateConversation { replacement } },
                onProfile = { save(ws.copy(profile = it)) }, onImageTags = { imageTags = it }, onPickImage = { imagePicker.launch("image/*") },
                onImport = { cardImporter.launch("*/*") }, onDeleteImage = { image -> scope.launch { runCatching { repo.api.deleteChatImage(image.id) }; save(ws.copy(images = ws.images - image, characters = ws.characters.map { if (it.avatarImageId == image.id) it.copy(avatarImageId = "") else it })) } },
                onRefreshModels = { scope.launch {
                    models = runCatching { repo.api.chatModels() }.getOrNull()
                    runCatching { repo.api.chatStatus() }.onSuccess { status = it; message = if (it.enabled) "Connected to ${it.model}." else it.message }
                        .onFailure { message = it.message ?: "Backend status check failed" }
                } },
            )
        }
    }
}

/** Full-screen sprite call, mirroring the web client's call presentation. It is the
 * same conversation underneath: sending here writes to the ordinary log and mood
 * changes swap Libby's sprite on the next recomposition. */
@Composable
private fun LibbyVideoCall(
    repo: Repository,
    conversation: ChatConversation,
    busy: Boolean,
    seconds: Int,
    draft: String,
    onDraft: (String) -> Unit,
    onSend: () -> Unit,
    onEnd: () -> Unit,
) {
    val emotion = conversation.emotion.ifBlank { "neutral" }
    val tier = conversation.intensity.coerceIn(1, LibbyMeter.MAX)
    val caption = conversation.messages.lastOrNull { it.role == "assistant" }?.content
    val clock = "%d:%02d".format(seconds / 60, seconds % 60)

    Column(
        Modifier.fillMaxSize().background(ChatColors.rail).windowInsetsPadding(WindowInsets.safeDrawing),
    ) {
        Box(
            Modifier.weight(1f).fillMaxWidth().background(
                Brush.verticalGradient(
                    listOf(MaterialTheme.colorScheme.primaryContainer.copy(alpha = .72f), ChatColors.rail),
                ),
            ),
        ) {
            LibbyPortrait(
                repo = repo,
                emotion = emotion,
                tier = tier,
                fallbackAsset = mascotAsset(emotion, tier),
                modifier = Modifier.fillMaxSize().padding(top = 56.dp),
            )
            Row(
                Modifier.align(Alignment.TopCenter).fillMaxWidth().background(Color(0x66000000)).padding(horizontal = 18.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(Modifier.weight(1f)) {
                    Text("Libby", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 17.sp)
                    Text(if (busy) "Speaking…" else clock, color = Color.White.copy(alpha = .78f), fontSize = 12.sp)
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(emotion.replaceFirstChar(Char::uppercase), color = Color.White, fontSize = 12.sp)
                    Row(horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                        repeat(LibbyMeter.MAX) { index ->
                            Box(
                                Modifier.size(6.dp).clip(CircleShape).background(
                                    if (index < tier) MaterialTheme.colorScheme.primary else Color.White.copy(alpha = .28f),
                                ),
                            )
                        }
                    }
                }
            }
            caption?.let {
                Text(
                    richChatText(it),
                    color = Color.White,
                    modifier = Modifier.align(Alignment.BottomCenter).fillMaxWidth(.9f)
                        .padding(bottom = 16.dp).clip(RoundedCornerShape(12.dp))
                        .background(Color(0xAA000000)).padding(horizontal = 14.dp, vertical = 11.dp),
                )
            }
        }
        Row(
            Modifier.fillMaxWidth().background(ChatColors.rail).imePadding().padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            TextField(
                value = draft,
                onValueChange = onDraft,
                placeholder = { Text("Say something to Libby…") },
                enabled = !busy,
                maxLines = 3,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                keyboardActions = KeyboardActions(onSend = { onSend() }),
                shape = RoundedCornerShape(24.dp),
                colors = TextFieldDefaults.colors(focusedContainerColor = ChatColors.input, unfocusedContainerColor = ChatColors.input),
                modifier = Modifier.weight(1f),
            )
            IconButton(
                onClick = onSend,
                enabled = draft.isNotBlank() && !busy,
                modifier = Modifier.padding(start = 7.dp).clip(CircleShape).background(ChatColors.accent),
            ) { Icon(Icons.AutoMirrored.Filled.Send, "Send", tint = MaterialTheme.colorScheme.onPrimary) }
            IconButton(
                onClick = onEnd,
                modifier = Modifier.padding(start = 7.dp).clip(CircleShape).background(ChatColors.danger),
            ) { Icon(Icons.Filled.CallEnd, "End video chat", tint = MaterialTheme.colorScheme.onError) }
        }
    }
}

@Composable
private fun ChatDrawer(
    repo: Repository, ws: ChatWorkspace, characterId: String, conversationId: String, online: Boolean,
    onCharacter: (String) -> Unit, onConversation: (String) -> Unit, onNewConversation: () -> Unit, onAddFriend: () -> Unit,
    onDeleteConversation: (ChatConversation) -> Unit,
) {
    ModalDrawerSheet(Modifier.fillMaxHeight().width(340.dp)) {
        LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 20.dp)) {
            item {
                Row(Modifier.fillMaxWidth().padding(start = 20.dp, end = 8.dp, top = 14.dp, bottom = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) { Text("Chats", fontSize = 23.sp, fontWeight = FontWeight.Bold); Text("Friends and conversation history", color = ChatColors.muted, fontSize = 12.sp) }
                    IconButton(onClick = onAddFriend) { Icon(Icons.Filled.Group, "Add friend", tint = ChatColors.accent) }
                }
                Text("FRIENDS", color = ChatColors.muted, fontSize = 11.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 20.dp, vertical = 7.dp))
            }
            items(ws.characters, key = { "friend-${it.id}" }) { char ->
                NavigationDrawerItem(
                    selected = char.id == characterId,
                    onClick = { onCharacter(char.id) },
                    icon = { ChatAvatar(repo, char, Modifier.size(36.dp).clip(CircleShape)) },
                    label = { Column { Text(char.name, fontWeight = FontWeight.SemiBold); Text(if (char.id == characterId) "Current friend" else "View conversations", color = ChatColors.muted, fontSize = 11.sp) } },
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 1.dp),
                )
            }
            item {
                HorizontalDivider(Modifier.padding(vertical = 12.dp))
                Row(Modifier.fillMaxWidth().padding(horizontal = 20.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) { Text(ws.characters.firstOrNull { it.id == characterId }?.name ?: "Conversations", fontWeight = FontWeight.Bold); Text("CONVERSATIONS", color = ChatColors.muted, fontSize = 10.sp) }
                    TextButton(onClick = onNewConversation) { Icon(Icons.Filled.AddComment, null, modifier = Modifier.size(18.dp)); Text(" New") }
                }
            }
            val conversations = ws.conversations.filter { it.characterId == characterId }.sortedByDescending { it.updatedAt }
            items(conversations, key = { "conversation-${it.id}" }) { convo ->
                NavigationDrawerItem(
                    selected = convo.id == conversationId,
                    onClick = { onConversation(convo.id) },
                    icon = { Icon(Icons.Filled.AddComment, null) },
                    label = { Column { Text(convo.title, maxLines = 1); Text("${convo.messages.size} messages · ${timeOf(convo.updatedAt)}", color = ChatColors.muted, fontSize = 10.sp) } },
                    badge = { IconButton(onClick = { onDeleteConversation(convo) }) { Icon(Icons.Filled.Delete, "Delete conversation", tint = ChatColors.muted) } },
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 1.dp),
                )
            }
            item {
                val localLibby = ws.characters.firstOrNull { it.id == characterId }?.id == "libby"
                Text(if (online) "● Model online" else if (localLibby) "○ Libby local replies" else "○ Model offline", color = if (online) ChatColors.accent else ChatColors.muted, fontSize = 12.sp, modifier = Modifier.padding(20.dp))
            }
        }
    }
}

@Composable
private fun ChatSettings(
    repo: Repository, ws: ChatWorkspace, char: ChatCharacter, convo: ChatConversation, tab: String, imageTags: String, models: ChatModels?, uploading: Boolean,
    onTab: (String) -> Unit, onCharacter: (ChatCharacter) -> Unit, onConversation: (ChatConversation) -> Unit,
    onProfile: (net.fourbakers.oppailib.data.ChatProfile) -> Unit, onImageTags: (String) -> Unit, onPickImage: () -> Unit,
    onImport: () -> Unit, onDeleteImage: (ChatImage) -> Unit,
    onRefreshModels: () -> Unit,
) {
    var advancedOptions by remember(convo.id) { mutableStateOf(convo.options.toString()) }
    // The sheet is full of text fields, so it has to give way to the keyboard as well.
    Column(Modifier.fillMaxWidth().fillMaxHeight(.9f).imePadding().navigationBarsPadding().verticalScroll(rememberScrollState()).padding(start = 16.dp, end = 16.dp, bottom = 32.dp)) {
        Text("Chat settings", fontSize = 22.sp, fontWeight = FontWeight.Bold)
        Text("Character, model, images, and your shared profile", color = ChatColors.muted, fontSize = 12.sp, modifier = Modifier.padding(bottom = 10.dp))
        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(5.dp)) { listOf("character", "generation", "images", "profile").forEach { name -> Text(name.replaceFirstChar(Char::uppercase), color = if (tab == name) MaterialTheme.colorScheme.onPrimary else ChatColors.text, modifier = Modifier.clip(RoundedCornerShape(5.dp)).background(if (tab == name) ChatColors.accent else ChatColors.input).clickable { onTab(name) }.padding(horizontal = 11.dp, vertical = 7.dp)) } }
        when (tab) {
            "character" -> Column(Modifier.fillMaxWidth().padding(top = 8.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                TextField(char.name, { onCharacter(char.copy(name = it)) }, label = { Text("Name") }, modifier = Modifier.fillMaxWidth())
                TextField(char.description, { onCharacter(char.copy(description = it)) }, label = { Text("Description") }, maxLines = 2, modifier = Modifier.fillMaxWidth())
                TextField(char.appearance, { onCharacter(char.copy(appearance = it)) }, label = { Text("Appearance") }, maxLines = 2, modifier = Modifier.fillMaxWidth())
                Text("Written as picture tags (\"long orange hair, red eyes\"). Also how they recognise a photo of themselves when you share one.", color = ChatColors.muted, fontSize = 11.sp)
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) { TextField(char.personality, { onCharacter(char.copy(personality = it)) }, label = { Text("Personality") }, maxLines = 3, modifier = Modifier.weight(1f)); TextField(char.scenario, { onCharacter(char.copy(scenario = it)) }, label = { Text("Scenario") }, maxLines = 3, modifier = Modifier.weight(1f)) }
                TextField(char.kinks, { onCharacter(char.copy(kinks = it)) }, label = { Text("Kinks and turn-ons") }, maxLines = 3, modifier = Modifier.fillMaxWidth())
                TextField(char.systemPrompt, { onCharacter(char.copy(systemPrompt = it)) }, label = { Text("System prompt") }, maxLines = 3, modifier = Modifier.fillMaxWidth())
                TextField(char.firstMessage, { onCharacter(char.copy(firstMessage = it)) }, label = { Text("First message") }, maxLines = 2, modifier = Modifier.fillMaxWidth())
                TextField(char.exampleDialogue, { onCharacter(char.copy(exampleDialogue = it)) }, label = { Text("Example dialogue") }, maxLines = 4, modifier = Modifier.fillMaxWidth())
                Text("{{char}} and {{user}} are filled in with the character's name and your profile name. Examples are used as a voice reference, never replayed as conversation.", color = ChatColors.muted, fontSize = 11.sp)
                if (char.id != "libby") {
                    Text("Default mode", color = ChatColors.muted, fontSize = 12.sp)
                    Row(Modifier.horizontalScroll(rememberScrollState())) { chatModes.forEach { mode -> Text(mode.label, modifier = Modifier.clip(RoundedCornerShape(4.dp)).background(if (char.defaultMode == mode.id) ChatColors.accent else ChatColors.input).clickable { onCharacter(char.copy(defaultMode = mode.id)) }.padding(10.dp, 6.dp)) } }
                }
                Text("Card weight ${"%.2f".format(char.promptWeight)}", color = ChatColors.muted); Slider(char.promptWeight.toFloat(), { onCharacter(char.copy(promptWeight = it.toDouble())) }, valueRange = .1f..2f)
                OutlinedButton(onClick = onImport) { Text("Import SillyTavern JSON") }
            }
            "generation" -> Column(Modifier.fillMaxWidth().padding(top = 8.dp)) {
                Text("Text-generation backend", color = ChatColors.muted)
                Text(models?.loaded?.ifBlank { null } ?: "No model loaded", color = ChatColors.text, fontWeight = FontWeight.SemiBold)
                Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                    models?.models?.forEach { model -> FilterChip(selected = model == models.loaded, enabled = false, onClick = {}, label = { Text(model) }) }
                }
                OutlinedButton(onClick = onRefreshModels) { Text("Refresh status") }
                Text("Load or unload models in text-generation-webui's own WebUI. OppaiLib keeps model management read-only so it cannot destabilize the Docker container.", color = ChatColors.muted, fontSize = 11.sp)
                if (char.id == "libby") {
                    Text("Libby chooses her own tone, emotion, and intensity from the conversation.", color = ChatColors.muted, fontSize = 12.sp)
                } else {
                    Text("Mode", color = ChatColors.muted)
                    Row(Modifier.horizontalScroll(rememberScrollState())) { chatModes.forEach { mode -> Text(mode.label, modifier = Modifier.clip(RoundedCornerShape(4.dp)).background(if (convo.mode == mode.id) ChatColors.accent else ChatColors.input).clickable { onConversation(convo.copy(mode = mode.id)) }.padding(10.dp, 6.dp)) } }
                }
                ChatSlider("Temperature", convo.options, "temperature", 0f, 2f, .8f) { onConversation(convo.copy(options = convo.options.withNumber("temperature", it))) }
                ChatSlider("Top P", convo.options, "top_p", .05f, 1f, .95f) { onConversation(convo.copy(options = convo.options.withNumber("top_p", it))) }
                ChatSlider("Repetition penalty", convo.options, "repetition_penalty", 1f, 2f, 1.1f) { onConversation(convo.copy(options = convo.options.withNumber("repetition_penalty", it))) }
                ChatSlider("Max reply tokens", convo.options, "max_tokens", 64f, 2048f, 400f) { onConversation(convo.copy(options = convo.options.withNumber("max_tokens", it))) }
                if (char.id != "libby") {
                    Text("Intensity ${convo.intensity}/5", color = ChatColors.muted)
                    Slider(convo.intensity.toFloat(), { onConversation(convo.copy(intensity = it.toInt(), progress = it.toDouble())) }, valueRange = 1f..5f, steps = 3)
                }
                TextField(advancedOptions, { advancedOptions = it }, label = { Text("Advanced API options (JSON)") }, minLines = 2, maxLines = 4, modifier = Modifier.fillMaxWidth())
                OutlinedButton(onClick = { runCatching { Json.parseToJsonElement(advancedOptions).jsonObject }.onSuccess { onConversation(convo.copy(options = it)) } }) { Text("Apply advanced options") }
            }
            "images" -> Column(Modifier.fillMaxWidth().padding(top = 8.dp)) {
                Text("Uploads are scanned locally and sent only when tags match the chat.", color = ChatColors.muted, fontSize = 12.sp)
                TextField(imageTags, onImageTags, label = { Text("Extra tags: beach, happy…") }, modifier = Modifier.fillMaxWidth())
                Button(onClick = onPickImage, enabled = !uploading, modifier = Modifier.padding(vertical = 5.dp)) {
                    if (uploading) CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp, color = MaterialTheme.colorScheme.onPrimary)
                    Text(if (uploading) "  Scanning…" else "Upload and scan")
                }
                Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) { ws.images.filter { it.characterId == char.id }.forEach { image -> Column(Modifier.width(110.dp)) { AsyncImage(repo.chatImageUrl(image.id), image.name, imageLoader = repo.imageLoader, modifier = Modifier.size(110.dp).clip(RoundedCornerShape(7.dp))); Text(image.tags.joinToString().ifBlank { "No tags" }, fontSize = 10.sp, maxLines = 2); TextButton(onClick = { onDeleteImage(image) }) { Text("Delete", color = ChatColors.danger) } } } }
            }
            "profile" -> Column(Modifier.fillMaxWidth().padding(top = 8.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                TextField(ws.profile.displayName, { onProfile(ws.profile.copy(displayName = it)) }, label = { Text("Display name") }, modifier = Modifier.fillMaxWidth())
                TextField(ws.profile.persona, { onProfile(ws.profile.copy(persona = it)) }, label = { Text("Your persona") }, maxLines = 4, modifier = Modifier.fillMaxWidth())
                LibbyMemorySection(repo)
            }
        }
    }
}

/**
 * What Libby has learned about you across conversations, with the controls to prune or
 * wipe it. Loaded once when the profile tab first composes. Only Libby keeps a memory,
 * so this lives in the shared profile she reads; the phone-side mirror of the web
 * client's renderMemoryPanel.
 */
@Composable
private fun LibbyMemorySection(repo: Repository) {
    var memories by remember { mutableStateOf<List<LibbyMemory>?>(null) }
    var confirmClear by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    LaunchedEffect(Unit) { memories = runCatching { repo.api.libbyMemory().memories }.getOrDefault(emptyList()) }
    Column(Modifier.fillMaxWidth().padding(top = 14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        HorizontalDivider()
        Text("What Libby remembers", fontWeight = FontWeight.SemiBold, color = ChatColors.text)
        Text("Libby quietly keeps things you tell her and carries them into later chats. Remove any of it, or clear it all.", color = ChatColors.muted, fontSize = 11.sp)
        val current = memories
        when {
            current == null -> Text("Loading…", color = ChatColors.muted, fontSize = 12.sp)
            current.isEmpty() -> Text("Nothing yet. She'll start remembering as you talk.", color = ChatColors.muted, fontSize = 12.sp)
            else -> {
                current.forEach { memory ->
                    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp)).background(ChatColors.input).padding(start = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text(memory.text, color = ChatColors.text, fontSize = 13.sp, modifier = Modifier.weight(1f).padding(vertical = 8.dp))
                        IconButton(onClick = { scope.launch { runCatching { repo.api.forgetLibbyMemory(memory.id) }.onSuccess { memories = memories?.filterNot { it.id == memory.id } } } }) {
                            Icon(Icons.Filled.Delete, "Forget this", tint = ChatColors.muted, modifier = Modifier.size(18.dp))
                        }
                    }
                }
                OutlinedButton(onClick = { confirmClear = true }) { Text("Clear all memories", color = ChatColors.danger) }
            }
        }
    }
    if (confirmClear) AlertDialog(
        onDismissRequest = { confirmClear = false },
        title = { Text("Clear memories") },
        text = { Text("Clear everything Libby remembers about you? This can't be undone.") },
        confirmButton = { Button(onClick = { scope.launch { runCatching { repo.api.clearLibbyMemory() }.onSuccess { memories = emptyList() } }; confirmClear = false }) { Text("Clear") } },
        dismissButton = { TextButton(onClick = { confirmClear = false }) { Text("Cancel") } },
    )
}

private fun JsonObject.withNumber(key: String, value: Float) = buildJsonObject { this@withNumber.forEach { (k, v) -> put(k, v) }; put(key, value.toDouble()) }

@Composable
private fun ChatSlider(label: String, options: JsonObject, key: String, min: Float, max: Float, fallback: Float, onChange: (Float) -> Unit) {
    val value = options[key]?.jsonPrimitive?.doubleOrNull?.toFloat()?.coerceIn(min, max) ?: fallback
    Text("$label ${"%.2f".format(value)}", color = ChatColors.muted, fontSize = 12.sp); Slider(value, onChange, valueRange = min..max)
}

@Composable
private fun ChatIntro(repo: Repository, char: ChatCharacter, convo: ChatConversation, status: ChatStatus?) {
    Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp).clip(RoundedCornerShape(16.dp)).background(ChatColors.side).padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
        ChatAvatar(repo, char, Modifier.size(54.dp).clip(CircleShape))
        Column(Modifier.padding(start = 12.dp)) {
            Text(char.name, color = ChatColors.text, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            Text(char.description.ifBlank { "This is the beginning of your conversation." }, color = ChatColors.muted, fontSize = 12.sp, maxLines = 2)
            Text(if (status?.enabled == true) "Running on ${status.model}${if (status.contextLimit > 0) " · ${status.contextLimit} token context" else ""}" else if (char.id == "libby") "Built-in local replies" else "Waiting for a local model", color = if (status?.enabled == true) ChatColors.accent else ChatColors.muted, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun ChatAvatar(repo: Repository, char: ChatCharacter, modifier: Modifier) {
    if (char.avatarImageId.isNotBlank()) AsyncImage(repo.chatImageUrl(char.avatarImageId), char.name, imageLoader = repo.imageLoader, modifier = modifier)
    else if (char.id == "libby" && !repo.prefs.hideLibby) LibbyPortrait(repo, "happy", LibbyMeter.tier(), mascotAsset("happy", LibbyMeter.tier()), modifier)
    else Box(modifier.background(ChatColors.accent), contentAlignment = Alignment.Center) { Text(char.name.take(2).uppercase(), color = MaterialTheme.colorScheme.onPrimary, fontWeight = FontWeight.Bold) }
}

/**
 * Something she thought, or muttered to herself.
 *
 * Deliberately not a message: no avatar, no bubble, no name — a rule down the left, a
 * label saying which of the two it is, and italics. The brief asks for this to be
 * visually unmistakable, and the only way to be sure of that is for it to share none
 * of a message's furniture.
 */
@Composable
private fun ChatThoughtRow(char: ChatCharacter, entry: StoredChatMessage) {
    val aloud = entry.thought == "aside"
    Row(Modifier.fillMaxWidth().padding(start = 22.dp, end = 24.dp, top = 10.dp)) {
        Box(Modifier.width(2.dp).heightIn(min = 30.dp).background(if (aloud) ChatColors.accent.copy(alpha = .5f) else ChatColors.muted.copy(alpha = .45f)))
        Column(Modifier.padding(start = 11.dp)) {
            Text(
                if (aloud) "${char.name}, to herself — you overhear it" else "${char.name} thinks, and doesn't say it",
                color = ChatColors.muted, fontSize = 11.sp,
            )
            Text(
                entry.content,
                color = ChatColors.text.copy(alpha = if (aloud) .85f else .72f),
                fontStyle = if (aloud) FontStyle.Normal else FontStyle.Italic,
                fontSize = 15.sp, modifier = Modifier.padding(top = 2.dp),
            )
        }
    }
}

@Composable
private fun ChatMessageRow(repo: Repository, ws: ChatWorkspace, char: ChatCharacter, entry: StoredChatMessage, previous: StoredChatMessage?, onOpenMedia: OpenMedia) {
    if (entry.thought.isNotBlank()) { ChatThoughtRow(char, entry); return }
    // A thought breaks a run rather than continuing one: what follows it is her speaking
    // again, and it should come back with her name on it.
    val grouped = previous != null && previous.thought.isBlank() && previous.role == entry.role && entry.at - previous.at < 5 * 60_000
    val friend = entry.role == "assistant"
    val name = if (friend) char.name else ws.profile.displayName.ifBlank { repo.prefs.reauthUsername ?: "You" }
    Row(
        Modifier.fillMaxWidth().padding(start = 10.dp, end = 10.dp, top = if (grouped) 3.dp else 12.dp),
        horizontalArrangement = if (friend) Arrangement.Start else Arrangement.End,
        verticalAlignment = Alignment.Bottom,
    ) {
        if (friend) {
            Box(Modifier.width(44.dp), contentAlignment = Alignment.BottomCenter) {
                if (!grouped) ChatAvatar(repo, char, Modifier.size(36.dp).clip(CircleShape))
            }
        }
        Column(
            Modifier.fillMaxWidth(if (friend) .82f else .78f).widthIn(max = 520.dp)
                .clip(if (friend) RoundedCornerShape(5.dp, 17.dp, 17.dp, 17.dp) else RoundedCornerShape(17.dp, 5.dp, 17.dp, 17.dp))
                .background(if (friend) ChatColors.side else MaterialTheme.colorScheme.primaryContainer)
                .padding(horizontal = 13.dp, vertical = 9.dp),
        ) {
            if (!grouped) Row(verticalAlignment = Alignment.CenterVertically) {
                Text(name, color = if (friend) ChatColors.accent else MaterialTheme.colorScheme.onPrimaryContainer, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                Spacer(Modifier.weight(1f))
                Text(timeOf(entry.at), color = ChatColors.muted, fontSize = 10.sp)
            }
            Text(richChatText(entry.content), color = if (friend) ChatColors.text else MaterialTheme.colorScheme.onPrimaryContainer, fontSize = 15.sp, modifier = Modifier.padding(top = if (grouped) 0.dp else 2.dp))
            if (entry.imageId.isNotBlank()) AsyncImage(repo.chatImageUrl(entry.imageId), "Image sent by $name", imageLoader = repo.imageLoader, modifier = Modifier.fillMaxWidth().height(260.dp).padding(top = 7.dp).clip(RoundedCornerShape(10.dp)))
            ChatLinkChips(repo, entry.links, onOpenMedia)
            ChatActionCards(repo, entry.actions)
        }
    }
}

/**
 * What Libby has offered to do, as things you have to say yes to.
 *
 * The card states the action in full — what will happen, and to what — because this is
 * the only place the user gets to check it. Nothing runs until Allow is tapped, and
 * that tap is the only caller of the act endpoint.
 *
 * The decision is held here rather than in the stored message: it is about this
 * session ("you approved this, just now"), whereas the log round-trips through the
 * server and the web client. Persisting "already allowed" would also make an old card
 * look pressable after a reload, which is either a lie or a second import.
 */
@Composable
private fun ChatActionCards(repo: Repository, actions: List<LibbyAction>) {
    if (actions.isEmpty()) return
    val scope = rememberCoroutineScope()
    Column(Modifier.fillMaxWidth().padding(top = 8.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        actions.forEach { action ->
            // Keyed on the action so a redraw of the list does not reset a decision.
            var state by remember(action.id) { mutableStateOf("pending") }
            var status by remember(action.id) { mutableStateOf("") }
            Row(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp))
                    .background(ChatColors.input).padding(10.dp),
                verticalAlignment = Alignment.Top,
            ) {
                Icon(
                    actionIcon(action.kind), null, tint = ChatColors.muted,
                    modifier = Modifier.size(20.dp).padding(top = 1.dp),
                )
                Column(Modifier.weight(1f).padding(start = 10.dp)) {
                    Text(action.label, color = ChatColors.text, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                    Text(action.detail, color = ChatColors.muted, fontSize = 12.sp)
                    when (state) {
                        "pending" -> Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Button(onClick = {
                                state = "running"
                                scope.launch {
                                    runCatching { repo.api.libbyAct(action.toRequest()) }
                                        .onSuccess { state = "done"; status = actionDone(action.kind) }
                                        .onFailure { state = "failed"; status = it.message ?: "That didn't work." }
                                }
                            }) { Text("Allow") }
                            TextButton(onClick = { state = "declined"; status = "You said no." }) { Text("Not now") }
                        }
                        "running" -> Text("Working on it…", color = ChatColors.muted, fontSize = 12.sp)
                        else -> Text(
                            status,
                            color = if (state == "failed") ChatColors.danger else ChatColors.muted,
                            fontSize = 12.sp,
                        )
                    }
                }
            }
        }
    }
}

private fun LibbyAction.toRequest() =
    LibbyActRequest(kind = kind, prompt = prompt, url = url, mediaId = mediaId, tags = tags)

/** Icon per action kind, falling back to a generic mark so a kind this build has never
    heard of still renders as a card the user can read and refuse. */
private fun actionIcon(kind: String) = when (kind) {
    "generate" -> Icons.Filled.AutoAwesome
    "import" -> Icons.Filled.Download
    "tag" -> Icons.Filled.Sell
    "favorite" -> Icons.Filled.Favorite
    else -> Icons.Filled.Bolt
}

/** What a completed action says. Specific where it can be: "Done" is true but tells
    the user nothing about where the thing went. */
private fun actionDone(kind: String) = when (kind) {
    "generate" -> "Made it — it's in your library."
    "import" -> "Added to your library."
    "tag" -> "Tags added."
    "favorite" -> "Favorited."
    else -> "Done."
}

/** Icon per library kind, matching the library's own nav so a chip reads as the
    same object you would find on the shelf. */
private fun linkIcon(kind: String) = when (kind) {
    "video" -> Icons.Filled.Movie
    "gif" -> Icons.Filled.Gif
    "comic" -> Icons.AutoMirrored.Filled.MenuBook
    "game" -> Icons.Filled.SportsEsports
    else -> Icons.Filled.Image
}

/**
 * What a reply pointed at, as things you can open.
 *
 * The title is already in the prose — the server substitutes it for the link tag — so
 * this is a chip rather than a card: it is the "open it" affordance for something she
 * has already named, not a second copy of the sentence. Same reasoning, and the same
 * shape, as the web client's renderLinkChips.
 */
@Composable
private fun ChatLinkChips(repo: Repository, links: List<LibbyLink>, onOpenMedia: OpenMedia) {
    if (links.isEmpty()) return
    Column(Modifier.fillMaxWidth().padding(top = 8.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        links.forEach { link ->
            Row(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp))
                    .background(ChatColors.input).clickable { onOpenMedia(link.id) }
                    .padding(6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                if (link.hasThumb) AsyncImage(
                    repo.thumbUrl(link.id), null, imageLoader = repo.imageLoader,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.size(36.dp).clip(RoundedCornerShape(8.dp)),
                ) else Box(
                    Modifier.size(36.dp).clip(RoundedCornerShape(8.dp)).background(ChatColors.side),
                    contentAlignment = Alignment.Center,
                ) { Icon(linkIcon(link.kind), null, tint = ChatColors.muted, modifier = Modifier.size(20.dp)) }
                Column(Modifier.weight(1f).padding(start = 10.dp, end = 6.dp)) {
                    Text(link.title, color = ChatColors.text, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
                    Text(link.kind.replaceFirstChar(Char::uppercase), color = ChatColors.muted, fontSize = 11.sp, maxLines = 1)
                }
            }
        }
    }
}

private fun richChatText(text: String): AnnotatedString = buildAnnotatedString {
    val regex = Regex("(\\*\\*[^*\\n]+\\*\\*|\\*[^*\\n]+\\*|\"[^\"\\n]+\")")
    var at = 0
    regex.findAll(text).forEach { match ->
        append(text.substring(at, match.range.first)); val token = match.value
        when { token.startsWith("**") -> { pushStyle(SpanStyle(fontWeight = FontWeight.Bold, fontStyle = FontStyle.Italic)); append(token.drop(2).dropLast(2)); pop() }
            token.startsWith("*") -> { pushStyle(SpanStyle(fontStyle = FontStyle.Italic)); append(token.drop(1).dropLast(1)); pop() }
            else -> { pushStyle(SpanStyle(fontWeight = FontWeight.Medium)); append(token); pop() } }
        at = match.range.last + 1
    }
    append(text.substring(at))
}

/** Reads either Character Card V2 JSON or SillyTavern's PNG `chara` tEXt chunk. */
private fun importedChatCharacter(bytes: ByteArray): ChatCharacter {
    var jsonText = bytes.toString(Charsets.UTF_8)
    if (bytes.size > 8 && bytes[0].toInt() == 0x89 - 0x100 && bytes.copyOfRange(1, 4).contentEquals(byteArrayOf(0x50, 0x4e, 0x47))) {
        var offset = 8
        while (offset + 12 <= bytes.size) {
            val length = ((bytes[offset].toInt() and 255) shl 24) or ((bytes[offset + 1].toInt() and 255) shl 16) or
                ((bytes[offset + 2].toInt() and 255) shl 8) or (bytes[offset + 3].toInt() and 255)
            if (length < 0 || offset + length + 12 > bytes.size) break
            val type = bytes.copyOfRange(offset + 4, offset + 8).toString(Charsets.US_ASCII)
            if (type == "tEXt") {
                val payload = bytes.copyOfRange(offset + 8, offset + 8 + length)
                val split = payload.indexOf(0)
                if (split > 0 && payload.copyOfRange(0, split).toString(Charsets.ISO_8859_1) == "chara") {
                    jsonText = Base64.decode(payload.copyOfRange(split + 1, payload.size), Base64.DEFAULT).toString(Charsets.UTF_8)
                    break
                }
            }
            offset += length + 12
        }
    }
    val root = Json.parseToJsonElement(jsonText).jsonObject
    val data = root["data"]?.jsonObject ?: root
    fun value(name: String, fallback: String = "") = data[name]?.jsonPrimitive?.content ?: fallback
    return ChatCharacter(
        id = chatID(), name = value("name", "Imported friend"), description = value("description"), personality = value("personality"),
        scenario = value("scenario"), firstMessage = value("first_mes", value("firstMessage")), exampleDialogue = value("mes_example"),
        systemPrompt = value("system_prompt"), creatorNotes = value("creator_notes"), defaultMode = "roleplay",
    )
}
