package net.fourbakers.oppailib.ui

import android.util.Base64
import androidx.activity.compose.BackHandler
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
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
import androidx.compose.material.icons.filled.AddPhotoAlternate
import androidx.compose.material.icons.filled.ArrowDownward
import androidx.compose.material.icons.filled.ChatBubble
import androidx.compose.material.icons.filled.DoneAll
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material.icons.filled.Search
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
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.CallEnd
import androidx.compose.material.icons.filled.Videocam
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.ClosedCaption
import androidx.compose.material.icons.filled.CollectionsBookmark
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.EditNote
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Replay
import androidx.compose.material.icons.automirrored.filled.Reply
import androidx.compose.material.icons.filled.Wallpaper
import androidx.compose.material.icons.filled.BlurOn
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Slider
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.derivedStateOf
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
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.border
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.text.LinkAnnotation
import androidx.compose.ui.text.TextLinkStyles
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.withLink
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.scale
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.foundation.layout.offset
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.material.icons.filled.PhotoCamera
import androidx.compose.material.icons.filled.CheckBoxOutlineBlank
import androidx.compose.animation.core.animateIntAsState
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import net.fourbakers.oppailib.data.ChatReaction
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
import net.fourbakers.oppailib.data.ChatReplyRef
import net.fourbakers.oppailib.data.LibbyBackground
import net.fourbakers.oppailib.data.ChatModels
import net.fourbakers.oppailib.data.ChatRequest
import net.fourbakers.oppailib.data.ChatStatus
import net.fourbakers.oppailib.data.ChatWorkspace
import net.fourbakers.oppailib.data.LibbyAction
import net.fourbakers.oppailib.data.LibbyActRequest
import net.fourbakers.oppailib.data.LibbyAttachment
import net.fourbakers.oppailib.data.LibbyLink
import net.fourbakers.oppailib.data.LibbyMemory
import net.fourbakers.oppailib.data.LibbyMeter
import net.fourbakers.oppailib.data.LibbyVoice
import net.fourbakers.oppailib.data.Media
import net.fourbakers.oppailib.data.Repository
import net.fourbakers.oppailib.data.StoredChatMessage
import java.text.SimpleDateFormat
import java.util.Calendar
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

/** How long an incoming call rings before it counts as missed. */
private const val RING_MS = 40_000L

/**
 * The first line of a message, cut at a word, for a quoted reply. Mirrors excerptOf on
 * the server and the web client so a quote drawn here reads the same everywhere.
 */
private fun excerptOf(content: String, max: Int = 140): String {
    var text = content.trim()
    val nl = text.indexOf('\n')
    if (nl >= 0 && text.substring(0, nl).isNotBlank()) text = text.substring(0, nl).trim()
    if (text.length <= max) return text
    var cut = text.substring(0, max)
    val space = cut.lastIndexOf(' ')
    if (space > max / 2) cut = cut.substring(0, space)
    return cut.trim() + "…"
}
private val chatStamp = SimpleDateFormat("h:mm a", Locale.getDefault())
private fun timeOf(ms: Long) = chatStamp.format(Date(ms))
/**
 * No sampler settings by default — the server tunes them per turn.
 *
 * This used to pin `temperature 0.8, top_p 0.95, repetition_penalty 1.1, max_tokens 400`
 * onto every new conversation, and stored options are explicit overrides: they beat the
 * per-turn choice the server makes from what the turn is *for*. So every conversation
 * started on this phone was sampled identically whether it was a one-line reaction or a
 * long scene, and capped at 400 reply tokens forever — which truncates a scene mid-
 * sentence and, worse, cuts off the protocol tags written at the end of a reply, so the
 * picture she meant to send and the item she meant to attach never arrive.
 *
 * An empty object is therefore the correct default, and anything in here is a deliberate
 * override. The advanced sliders are what write one; untouched, they only display what
 * came back. The web client dropped the same block for the same reason, and the server
 * clears it from conversations created before this.
 */
private fun baseOptions() = JsonObject(emptyMap())

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
 * Splits a finished reply into the short texts a person would send back to back. A
 * blank line is an intended break — she is told to text that way — and is honoured
 * whatever the length; nothing else is split, since a sentence guess on a phone is
 * worse than one bubble. Capped so a long reply is a few texts, not a wall.
 */
private const val MAX_BUBBLES = 5
private fun splitIntoBubbles(text: String): List<String> {
    val trimmed = text.trim()
    if (trimmed.isEmpty()) return listOf(trimmed)
    val parts = trimmed.split(Regex("\\n{2,}")).map { it.trim() }.filter { it.isNotEmpty() }
    if (parts.size <= 1) return listOf(trimmed)
    if (parts.size <= MAX_BUBBLES) return parts
    return parts.take(MAX_BUBBLES - 1) + parts.drop(MAX_BUBBLES - 1).joinToString("\n\n")
}

/**
 * How long she takes to pick the phone up and read what you sent, before the receipt
 * turns to "Read" and the dots start. Scales with how much there is to read; a burst
 * resets it so she reads the texts together. Capped, because a receipt that takes ten
 * seconds reads as being ignored.
 */
private fun readingDelay(chars: Int, quietMs: Long): Long {
    fun jitter(base: Double) = base * (0.7 + Math.random() * 0.6)
    var ms = jitter(700.0 + chars * 28.0)
    if (quietMs > 10 * 60_000L) ms += jitter(1500.0)
    return minOf(6500.0, ms).toLong()
}

/** The emoji offered when you react to one of her messages. */
private val REACTIONS = listOf("❤️", "😂", "😮", "😢", "🔥", "👍", "👀", "😘")

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
    /** She rang: the popup is up until answered, declined, or it rings out. */
    var incomingCall by remember { mutableStateOf(false) }
    /** The places she can be, for the call screen and its picker. */
    var backgrounds by remember { mutableStateOf<List<LibbyBackground>>(emptyList()) }
    /** The message the next thing you send answers. */
    var replyTarget by remember { mutableStateOf<StoredChatMessage?>(null) }
    /** Library items attached to the composer, sent with the next message. */
    var pendingItems by remember { mutableStateOf<List<LibbyAttachment>>(emptyList()) }
    var pickerOpen by remember { mutableStateOf(false) }
    /** A message held for its menu. */
    var holdMessage by remember { mutableStateOf<StoredChatMessage?>(null) }
    /** The snap being looked at full-screen. Closing it marks it opened. */
    var snapOpen by remember { mutableStateOf<StoredChatMessage?>(null) }
    /** Her reading time: the wait between your text landing and her picking it up.
        Sending again restarts it, so a burst is read together. */
    var readJob by remember { mutableStateOf<Job?>(null) }
    /** Set when you sent something while she was still typing: another turn is owed. */
    var pendingReply by remember { mutableStateOf(false) }
    /** What the pending turn carries: the last photo, and every attached item, from
        the burst it answers. */
    var turnPhoto by remember { mutableStateOf<ChatImage?>(null) }
    var turnItems by remember { mutableStateOf<List<Long>>(emptyList()) }
    var retryNoteOpen by remember { mutableStateOf(false) }
    var retryNote by remember { mutableStateOf("") }
    val clipboard = LocalClipboardManager.current
    var overflowOpen by remember { mutableStateOf(false) }
    // A conversation pending a delete confirmation, so a mis-tap doesn't wipe history.
    var confirmDelete by remember { mutableStateOf<ChatConversation?>(null) }
    var saveJob by remember { mutableStateOf<Job?>(null) }
    // Which of the two panes is up. Chat opens on the conversation this phone was last
    // in — reopening a messaging app onto a list of chats you have to search for the one
    // you were mid-sentence in is the thing no messaging app does. An empty remembered
    // id (a fresh install, a sign-out, or leaving from the list) opens the list.
    var inbox by remember { mutableStateOf(repo.prefs.lastChatConversation.isEmpty()) }
    var inboxQuery by remember { mutableStateOf("") }
    val intensity by LibbyMeter.value.collectAsState()
    val scope = rememberCoroutineScope()
    val list = rememberLazyListState()
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

    // Removes a conversation, mirroring the web client's delete. Only re-points the open
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
                    repo.api.uploadChatImage(ChatImageUpload(char.id, "Character image", data, tags, subject = "self"))
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

    /**
     * The composer's paperclip: pick a picture, scan it, and hang it on the next message.
     *
     * Distinct from the settings sheet's uploader above, which files a picture into the
     * character's own gallery for *her* to send later. This one is you showing her
     * something, so it lands in the composer as a pending photo — the same place a
     * library item shared from the hold menu lands. Both go through the same scan, so
     * what she is told about the picture is the same either way.
     *
     * On IO for the same reason as the uploader: reading, base64-encoding and
     * serialising an 8 MB file are all synchronous, and none of it belongs on the thread
     * drawing the conversation.
     */
    val attachPicker = rememberSystemPickerLauncher(ActivityResultContracts.GetContent()) { uri ->
        val ws = workspace; val char = currentCharacter(ws)
        if (uri != null && ws != null && char != null && !uploading) scope.launch {
            uploading = true
            message = "Scanning image locally…"
            runCatching {
                withContext(Dispatchers.IO) {
                    val bytes = context.contentResolver.openInputStream(uri)!!.use { it.readBytes() }
                    require(bytes.size <= 8 * 1024 * 1024) { "Image must be 8 MB or smaller" }
                    val mime = context.contentResolver.getType(uri) ?: "image/jpeg"
                    val data = "data:$mime;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP)
                    repo.api.uploadChatImage(ChatImageUpload(char.id, "Shared photo", data, emptyList()))
                }
            }.onSuccess { image ->
                val latest = workspace ?: ws
                save(latest.copy(images = (latest.images + image).distinctBy { it.id }))
                pendingPhoto = image
                message = "Ready to send — add a message or send the photo as it is."
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
                // The conversation this phone was last in, if the server still has it.
                // Deleted from another client, or never there, and the list opens instead
                // — which is the honest answer, not a silent jump to a different chat.
                val resumed = loaded.conversations.firstOrNull { it.id == repo.prefs.lastChatConversation }
                val char = resumed?.let { r -> loaded.characters.firstOrNull { it.id == r.characterId } }
                    ?: loaded.characters.firstOrNull() ?: return@onSuccess
                characterId = char.id
                if (resumed != null) {
                    conversationId = resumed.id
                } else {
                    inbox = true
                    val convo = conversations(loaded, char.id).firstOrNull()
                    if (convo == null) next = newConversation(loaded, char) else conversationId = convo.id
                }
                workspace = next
                if (next !== loaded) save(next)
            }.onFailure { message = it.message ?: "Couldn't reach chat" }
        if (status?.modelBackend == true) models = runCatching { repo.api.chatModels() }.getOrNull()
    }

    // Written as it changes rather than on the way out: Android is free to kill this
    // process without running anything, which is exactly when resuming matters most.
    // Sitting on the list is itself a place, and it is stored as one.
    LaunchedEffect(conversationId, inbox) {
        repo.prefs.lastChatConversation = if (inbox) "" else conversationId
    }

    LaunchedEffect(sharedMedia?.id, workspace != null) {
        val media = sharedMedia ?: return@LaunchedEffect
        val loaded = workspace ?: return@LaunchedEffect
        try {
            val libby = loaded.characters.firstOrNull { it.id == "libby" }
                ?: error("Libby isn't available in this chat workspace.")
            characterId = libby.id
            inbox = false
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
    LaunchedEffect(active?.messages?.size, typingPhase, inbox) {
        // Nothing to scroll while the list of conversations is up: the message list is
        // not composed, and animateScrollToItem would sit waiting for a layout that is
        // not coming until the user opens a conversation again.
        if (inbox) return@LaunchedEffect
        // The intro only occupies index 0 while the log is empty, so the last row is
        // simply the item count minus one — plus the typing line when it is showing.
        val rows = (active?.messages?.size ?: 0).coerceAtLeast(1) +
            if (busy && typingPhase == TypingPhase.TYPING) 1 else 0
        list.animateScrollToItem(rows - 1)
    }

    /**
     * One assistant turn on top of [pending], which already holds whatever the user just
     * said. Sending, retrying and retrying-from all end here; they differ only in what
     * they do to the log first. [seed] is the line being answered, which is what Libby's
     * offline voice writes from; [nudge] is a one-off steer for this attempt, sent on
     * the history and never stored.
     */
    fun generate(pending: ChatConversation, char: ChatCharacter, seed: String, photo: ChatImage?, sharedIds: List<Long>, nudge: String) {
        val ws = workspace ?: return
        busy = true; message = ""
        scope.launch {
            if (status?.enabled != true && (status?.configured == true || status?.modelBackend == true)) {
                runCatching { repo.api.chatStatus() }.getOrNull()?.let { status = it }
            }
            if (status?.enabled != true) {
                if (char.id != "libby") { message = status?.message?.ifBlank { null } ?: "Load a model in text-generation-webui, then refresh backend status."; busy = false; return@launch }
                val progression = LibbyMeter.applyProgression(pending.progress, LibbyVoice.heatDelta(seed, pending.mode))
                val line = LibbyVoice.reply(seed, pending.mode, pending.emotion, progression.second, advance = false)
                typeLikeAPerson(line.message, 0) { typingPhase = it }
                LibbyMeter.set(progression.second)
                val done = pending.copy(emotion = line.emotion, intensity = progression.second, progress = progression.first, messages = pending.messages + StoredChatMessage(chatID(), "assistant", line.message, System.currentTimeMillis()), updatedAt = System.currentTimeMillis())
                save(workspace!!.copy(conversations = workspace!!.conversations.map { if (it.id == done.id) done else it })); busy = false; return@launch
            }
            // Thoughts are left out: they were never said, so replaying them as assistant
            // lines hands the model words she did not speak and teaches it that the format
            // belongs inline. Continuity is carried by her memory and the bond instead.
            // Ids and quoted replies ride along so she can point at an earlier message.
            val history = pending.messages.filter { it.thought.isBlank() }.map {
                ChatMessage(it.role, it.content, it.id, it.replyTo, imageId = it.imageId, mediaIds = it.attachments.map { a -> a.id }, reactions = it.reactions)
            } +
                if (nudge.isBlank()) emptyList() else listOf(ChatMessage("user", "(Try that reply again. $nudge Do not mention this note.)"))
            val startedAt = System.currentTimeMillis()
            typingPhase = TypingPhase.TYPING
            // Pictures already seen in this conversation ride along so the server can
            // hold them back: without this the best-scoring image in a gallery is the
            // only one that ever gets sent.
            val seenPictures = pending.messages.mapNotNull { it.imageId.ifBlank { null } }.distinct().takeLast(12)
            // The same for library items she has handed over, which is the other half of
            // "you have already shown me this" now that she can attach from the collection.
            val seenItems = pending.messages.flatMap { entry -> entry.attachments.map { it.id } }.distinct().takeLast(12)
            val generation = runCatching {
                repo.api.chat(
                    ChatRequest(
                        mode = pending.mode,
                        messages = history,
                        emotion = pending.emotion,
                        intensity = pending.intensity,
                        options = pending.options,
                        characterId = char.id,
                        // So her recall of the other conversations leaves this one out.
                        conversationId = pending.id,
                        photoTags = photo?.tags.orEmpty(),
                        photoImageId = photo?.id.orEmpty(),
                        recentImageIds = seenPictures,
                        recentMediaIds = seenItems,
                        // How long she has looked the same. One entry per reply, since
                        // only a spoken message records a mood.
                        recentMoods = pending.messages.mapNotNull { it.mood.ifBlank { null } }.takeLast(8),
                        recentHeat = pending.messages.filter { it.role == "assistant" && it.heat > 0 }.map { it.heat }.takeLast(8),
                        // That they have her full-screen and are watching her answer.
                        call = callOpen,
                        // What she is already doing, and where. States, not per-message values.
                        activity = pending.activity,
                        background = pending.background,
                        // What she has on: the worn outfit is a per-device pref, so the
                        // server cannot know it unless this says so.
                        outfit = if (char.id == "libby") repo.prefs.libbyOutfit else "",
                        // Library items attached to this message, by id.
                        sharedMediaIds = sharedIds,
                    ),
                )
            }
            generation
                .onSuccess { reply ->
                    // She rang, or hung up. A ring is a popup and only answering opens the
                    // call; a hang-up ends one that is open, with a line saying so.
                    if (reply.callRequest && !callOpen && !repo.prefs.hideLibby) incomingCall = true
                    if (reply.callEnd && callOpen) { callOpen = false; message = "${char.name} ended the call." }
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
                    // Everything lands on the conversation as it is *now*, not the snapshot
                    // this turn started from: you may have sent more while she typed, and
                    // those texts must not be lost under her reply.
                    fun live(): ChatConversation = (workspace ?: ws).conversations.firstOrNull { it.id == pending.id } ?: pending
                    fun commit(convo: ChatConversation) {
                        val latest = workspace ?: ws
                        save(latest.copy(conversations = latest.conversations.map { if (it.id == convo.id) convo else it }))
                    }
                    // Her emoji on your message goes on first — a reaction is the quick
                    // thing, the words come after.
                    reply.reaction?.takeIf { it.emoji.isNotBlank() }?.let { reaction ->
                        val convo = live()
                        val target = convo.messages.firstOrNull { it.id == reaction.to && reaction.to.isNotBlank() }
                            ?: convo.messages.lastOrNull { it.role == "user" }
                        if (target != null) commit(convo.copy(messages = convo.messages.map {
                            if (it.id == target.id) it.copy(reactions = it.reactions.filter { r -> r.by != "assistant" } + ChatReaction(reaction.emoji, "assistant")) else it
                        }))
                    }
                    // Anything she thought rather than said lands first and on its own,
                    // because that is the order it happened in: she looked, reacted, and
                    // then decided what to say. No typing for a thought.
                    val thoughtLines = reply.thoughts.filter { it.text.isNotBlank() }.map {
                        StoredChatMessage(chatID(), "assistant", it.text, System.currentTimeMillis(), thought = it.kind)
                    }
                    if (thoughtLines.isNotEmpty()) commit(live().let { it.copy(messages = it.messages + thoughtLines, updatedAt = System.currentTimeMillis()) })
                    val picture = reply.imageId.isNotBlank() || reply.attachments.isNotEmpty()
                    // A picture with no words still needs a line — the store refuses an
                    // empty message — so it gets the stage direction your own share does.
                    val said = reply.message.trim().ifBlank { if (picture) (if (reply.snap) "*sends a snap*" else "*sends a picture*") else "" }
                    if (said.isNotBlank()) {
                        // A long reply lands as the few short texts a person would send back
                        // to back, each taking its own turn through the typing indicator.
                        // The picture, chips and cards ride the last bubble. Whatever the
                        // model already spent counts as writing time on the first one.
                        val bubbles = splitIntoBubbles(said)
                        bubbles.forEachIndexed { i, text ->
                            typeLikeAPerson(text, if (i == 0) System.currentTimeMillis() - startedAt else 0L) { typingPhase = it }
                            val last = i == bubbles.lastIndex
                            val line = StoredChatMessage(
                                chatID(), "assistant", text, System.currentTimeMillis(),
                                imageId = if (last) reply.imageId else "",
                                snap = last && reply.snap && picture,
                                links = if (last) reply.links else emptyList(),
                                attachments = if (last) reply.attachments else emptyList(),
                                actions = if (last) reply.actions else emptyList(),
                                // What she looked like saying it, for the run the next turn reports.
                                mood = if (last) reply.emotion else "", heat = if (last) level else 0,
                                // The quote rides the first bubble: it is what the reply starts by answering.
                                replyTo = if (i == 0) reply.replyTo else null,
                            )
                            val convo = live()
                            commit(convo.copy(
                                emotion = reply.emotion, intensity = level, progress = progress,
                                // Blank is a real answer here — it means she is doing nothing in
                                // particular, or is nowhere in particular — so these are assigned.
                                activity = reply.activity, background = reply.background,
                                messages = convo.messages + line, updatedAt = System.currentTimeMillis(),
                            ))
                        }
                    } else {
                        val convo = live()
                        commit(convo.copy(emotion = reply.emotion, intensity = level, progress = progress, activity = reply.activity, background = reply.background, updatedAt = System.currentTimeMillis()))
                    }
                }.onFailure { error ->
                    status = runCatching { repo.api.chatStatus() }.getOrNull() ?: status
                    message = status?.takeIf { !it.enabled }?.message?.ifBlank { null } ?: error.message ?: "Chat failed"
                }
            typingPhase = TypingPhase.IDLE
            busy = false
        }
    }

    /**
     * Her reading time, then the turn. You can keep sending while it runs: each new text
     * restarts the timer so the burst is read together, and marks every unread text of
     * yours "Read" at the same moment before the dots start. While she is already
     * typing, the turn is simply owed, and runs when this one lands.
     */
    fun readThenReply(convoId: String, chars: Int) {
        readJob?.cancel()
        if (busy) { pendingReply = true; return }
        val hers = currentConversation(workspace)?.messages?.lastOrNull { it.role == "assistant" }
        val quiet = hers?.let { System.currentTimeMillis() - it.at } ?: 0L
        readJob = scope.launch {
            delay(readingDelay(chars, quiet))
            if (busy) { pendingReply = true; return@launch }
            val ws = workspace ?: return@launch
            val convo = ws.conversations.firstOrNull { it.id == convoId } ?: return@launch
            val char = ws.characters.firstOrNull { it.id == convo.characterId } ?: return@launch
            val now = System.currentTimeMillis()
            var seed = ""
            val read = convo.copy(messages = convo.messages.map {
                if (it.role == "user" && it.readAt == 0L) { seed = it.content; it.copy(readAt = now) } else it
            })
            if (seed.isBlank()) return@launch
            workspace = ws.copy(conversations = ws.conversations.map { if (it.id == convoId) read else it })
            // Read, then a beat before the dots: the gap between reading and starting to type.
            delay(250 + (Math.random() * 500).toLong())
            val photo = turnPhoto; val items = turnItems
            turnPhoto = null; turnItems = emptyList()
            generate(read, char, seed, photo, items, "")
        }
    }

    /** Your texts since she last spoke that she has not read yet. */
    fun unreadIn(convo: ChatConversation): Boolean {
        val lastHers = convo.messages.indexOfLast { it.role == "assistant" && it.thought.isBlank() }
        return convo.messages.drop(lastHers + 1).any { it.role == "user" && it.readAt == 0L }
    }

    // Anything you sent while she was typing is still unread once her reply lands:
    // she reads it and answers it, straight after. Also what answers a text that was
    // sent just before the app was closed.
    LaunchedEffect(busy, conversationId) {
        if (busy) return@LaunchedEffect
        val convo = currentConversation(workspace) ?: return@LaunchedEffect
        val unread = unreadIn(convo)
        if (pendingReply || unread) {
            pendingReply = false
            if (unread) readThenReply(convo.id, 40)
        }
    }

    fun sendMessage() {
        val ws = workspace ?: return; val char = currentCharacter(ws) ?: return; val convo = currentConversation(ws) ?: return
        val photo = pendingPhoto
        val items = pendingItems
        val text = draft.trim().ifBlank {
            when {
                photo != null -> "*shares a photo with you*"
                items.size == 1 -> "*shares ${items[0].title} from the library*"
                items.isNotEmpty() -> "*shares ${items.size} things from the library*"
                else -> ""
            }
        }
        if (text.isBlank()) return
        val now = System.currentTimeMillis()
        val reply = replyTarget
        val userLine = StoredChatMessage(
            chatID(), "user", text, now, imageId = photo?.id.orEmpty(), attachments = items,
            replyTo = reply?.let { ChatReplyRef(it.id, it.role, excerptOf(it.content)) },
        )
        val pending = convo.copy(title = if (convo.title == "New conversation") text.take(42) else convo.title, messages = convo.messages + userLine, updatedAt = now)
        workspace = ws.copy(conversations = ws.conversations.map { if (it.id == convo.id) pending else it })
        draft = ""; pendingPhoto = null; pendingItems = emptyList(); replyTarget = null
        // Everything the burst carries rides the one turn that answers it: the last
        // photo wins, the attached items accumulate.
        if (photo != null) turnPhoto = photo
        turnItems = turnItems + items.map { it.id }
        readThenReply(convo.id, text.length)
    }

    /** Puts your emoji on one of her messages, or takes it off again if it is the same
        one. Yours replaces yours; hers stays. She is told on the next turn. */
    fun react(entry: StoredChatMessage, emoji: String) {
        updateConversation { convo ->
            convo.copy(messages = convo.messages.map {
                if (it.id != entry.id) it else {
                    val mine = it.reactions.firstOrNull { r -> r.by == "user" }
                    val others = it.reactions.filter { r -> r.by != "user" }
                    it.copy(reactions = if (mine?.emoji == emoji) others else others + ChatReaction(emoji, "user"))
                }
            })
        }
    }

    /** Closes the snap being looked at, and marks it opened for good. */
    fun closeSnap() {
        val snap = snapOpen ?: return
        snapOpen = null
        updateConversation { convo -> convo.copy(messages = convo.messages.map { if (it.id == snap.id) it.copy(opened = true) else it }) }
    }

    /**
     * Re-rolls her last turn: the trailing assistant messages are dropped and she
     * answers again from the same history, with [nudge] as a word of direction if any.
     */
    fun regenerate(nudge: String = "") {
        val ws = workspace ?: return; val char = currentCharacter(ws) ?: return; val convo = currentConversation(ws) ?: return
        if (busy) return
        val msgs = convo.messages
        var cut = msgs.size
        while (cut > 0 && msgs[cut - 1].role == "assistant") cut--
        if (cut == msgs.size) { message = "There is no reply to redo yet."; return }
        val pending = convo.copy(messages = msgs.take(cut), updatedAt = System.currentTimeMillis())
        workspace = ws.copy(conversations = ws.conversations.map { if (it.id == convo.id) pending else it })
        // The items they attached to the message being answered go again, or a retry
        // would answer a message she can no longer see the attachments of.
        val answered = msgs.getOrNull(cut - 1)?.takeIf { it.role == "user" }
        generate(pending, char, answered?.content ?: "", null, answered?.attachments?.map { it.id }.orEmpty(), nudge)
    }

    /** Retries from one of your messages: everything after it is dropped and she
        answers it again. The message itself stays as written. */
    fun retryFrom(entry: StoredChatMessage) {
        val ws = workspace ?: return; val char = currentCharacter(ws) ?: return; val convo = currentConversation(ws) ?: return
        if (busy || entry.role != "user") return
        val at = convo.messages.indexOfFirst { it.id == entry.id }
        if (at < 0) return
        val pending = convo.copy(messages = convo.messages.take(at + 1), updatedAt = System.currentTimeMillis())
        workspace = ws.copy(conversations = ws.conversations.map { if (it.id == convo.id) pending else it })
        generate(pending, char, entry.content, null, entry.attachments.map { it.id }, "")
    }

    fun deleteMessage(entry: StoredChatMessage) {
        updateConversation { it.copy(messages = it.messages.filterNot { m -> m.id == entry.id }) }
    }

    /** The receipt under your last message: sent, or read and when. Only the latest of
        yours carries one — a column of "Read" under every bubble is noise. */
    fun receiptFor(entry: StoredChatMessage, convo: ChatConversation): String {
        if (entry.role != "user") return ""
        if (convo.messages.lastOrNull { it.role == "user" }?.id != entry.id) return ""
        if (entry.readAt > 0) return "Read ${timeOf(entry.readAt)}"
        // Written before receipts existed, or answered by an older client: she replied
        // to it, so she read it.
        val at = convo.messages.indexOfFirst { it.id == entry.id }
        if (convo.messages.drop(at + 1).any { it.role == "assistant" && it.thought.isBlank() }) return "Read"
        return "Sent"
    }

    /** Whether retrying would redo this message: only the last assistant run can be. */
    fun canRedo(entry: StoredChatMessage): Boolean {
        val msgs = currentConversation(workspace)?.messages ?: return false
        val at = msgs.indexOfFirst { it.id == entry.id }
        return entry.role == "assistant" && at >= 0 && msgs.drop(at + 1).all { it.role == "assistant" }
    }

    // Back steps out one level, matching the header arrow: out of a conversation to
    // the list first, then out of chat to the library.
    BackHandler { if (inbox) onBack() else inbox = true }
    LaunchedEffect(callOpen) {
        if (!callOpen) return@LaunchedEffect
        callSeconds = 0
        incomingCall = false
        runCatching { repo.api.libbyBackgrounds() }.onSuccess { backgrounds = it.backgrounds }
        while (callOpen) { delay(1_000); callSeconds++ }
    }
    // A ring that nobody answers stops on its own and counts as missed.
    LaunchedEffect(incomingCall) {
        if (!incomingCall) return@LaunchedEffect
        delay(RING_MS)
        if (incomingCall) { incomingCall = false; message = "Missed a call from ${currentCharacter(workspace)?.name ?: "her"}." }
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
            typing = busy && typingPhase == TypingPhase.TYPING,
            seconds = callSeconds,
            draft = draft,
            backgrounds = backgrounds,
            onDraft = { draft = it },
            onSend = { sendMessage() },
            onRetry = { regenerate() },
            onBackground = { id -> updateConversation { it.copy(background = id) } },
            onRefreshBackgrounds = { scope.launch { runCatching { repo.api.libbyBackgrounds() }.onSuccess { backgrounds = it.backgrounds } } },
            onEnd = { callOpen = false },
        )
        return
    }

    // Two panes, the way every messaging app on this phone is arranged: the list of
    // conversations, and one conversation.
    //
    // What was here before was a navigation drawer. A drawer is where an app puts the
    // things you reach for occasionally — and in a chat client the list of who you are
    // talking to is the front door, not an occasional thing. Every conversation but the
    // open one sat behind a hamburger, which is why this read as an app with a chat in
    // it rather than as a chat app.
    val ws = workspace
    val char = currentCharacter(ws)
    val convo = currentConversation(ws)
    Box(Modifier.fillMaxSize()) {
    when {
        ws == null || char == null ->
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }

        inbox || convo == null -> ChatInbox(
            repo = repo,
            ws = ws,
            online = status?.enabled == true,
            openId = conversationId,
            query = inboxQuery,
            onQuery = { inboxQuery = it },
            onBack = onBack,
            onOpen = { id ->
                ws.conversations.firstOrNull { it.id == id }?.let { picked ->
                    characterId = picked.characterId
                    conversationId = picked.id
                    inbox = false
                }
            },
            onFriend = { id ->
                characterId = id
                val existing = conversations(ws, id).firstOrNull()
                if (existing == null) {
                    ws.characters.firstOrNull { it.id == id }?.let { save(newConversation(ws, it)) }
                } else {
                    conversationId = existing.id
                }
                inbox = false
            },
            onNewConversation = { id ->
                ws.characters.firstOrNull { it.id == id }?.let { friend ->
                    save(newConversation(ws, friend))
                    inbox = false
                }
            },
            onAddFriend = { addFriend = true },
            onImport = { cardImporter.launch("*/*") },
            onSettings = { settingsOpen = true },
            onDelete = { confirmDelete = it },
        )

        // The activity draws edge to edge, so without this the header sits under the
        // status bar and — because adjustResize does nothing once the window stops
        // fitting system windows — the keyboard covers the composer you are typing in.
        // safeDrawing is the one that unions bars, cutout, and IME, so a raised keyboard
        // does not also pay for the navigation bar it is covering.
        else -> Column(
            Modifier.fillMaxSize().background(ChatColors.main).windowInsetsPadding(WindowInsets.safeDrawing),
        ) {
            // The header of a conversation, not of an app: who you are talking to and
            // whether they are there. Everything that is not about this person has moved
            // to the inbox or into the overflow.
            Row(
                Modifier.fillMaxWidth().height(58.dp).padding(start = 2.dp, end = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(onClick = { inbox = true }) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back to chats", tint = ChatColors.text)
                }
                ChatAvatar(repo, char, Modifier.size(38.dp).clip(CircleShape))
                Column(Modifier.weight(1f).padding(horizontal = 10.dp)) {
                    Text(char.name, color = ChatColors.text, fontWeight = FontWeight.SemiBold, fontSize = 16.sp, maxLines = 1)
                    // A presence line, which is the one piece of furniture that makes a
                    // header read as a conversation rather than as a screen title. It says
                    // what is actually true: she is composing, she is thinking, or she is
                    // simply there.
                    val typing = busy && typingPhase == TypingPhase.TYPING
                    val reachable = status?.enabled == true || char.id == "libby"
                    Text(
                        when {
                            typing -> "typing…"
                            busy -> "thinking…"
                            reachable -> "online"
                            else -> "model offline"
                        },
                        color = if (typing || reachable) PresenceOnline else ChatColors.muted,
                        fontSize = 11.sp, maxLines = 1,
                    )
                }
                if (char.id == "libby" && !repo.prefs.hideLibby) {
                    IconButton(onClick = { callOpen = true }) {
                        Icon(Icons.Filled.Videocam, "Video chat", tint = ChatColors.muted)
                    }
                }
                Box {
                    IconButton(onClick = { overflowOpen = true }) { Icon(Icons.Filled.MoreVert, "Conversation actions", tint = ChatColors.muted) }
                    DropdownMenu(expanded = overflowOpen, onDismissRequest = { overflowOpen = false }) {
                        DropdownMenuItem(text = { Text("Chat settings") }, leadingIcon = { Icon(Icons.Filled.Settings, null) }, onClick = { overflowOpen = false; settingsOpen = true })
                        DropdownMenuItem(text = { Text("New conversation") }, leadingIcon = { Icon(Icons.Filled.AddComment, null) }, onClick = { overflowOpen = false; save(newConversation(ws, char)) })
                        DropdownMenuItem(text = { Text("Clear messages") }, leadingIcon = { Icon(Icons.Filled.DeleteSweep, null) }, enabled = convo.messages.isNotEmpty(), onClick = { overflowOpen = false; updateConversation { it.copy(messages = emptyList(), title = "New conversation") } })
                        DropdownMenuItem(text = { Text("Delete conversation", color = ChatColors.danger) }, leadingIcon = { Icon(Icons.Filled.Delete, null, tint = ChatColors.danger) }, onClick = { overflowOpen = false; confirmDelete = convo })
                    }
                }
            }
            HorizontalDivider(color = ChatColors.input)
            // Her sprite, in the conversation rather than only on the call: a bust along
            // the top of the log that wears her mood and tier and types when she types.
            // The same art the web's stage and banner draw, framed the same way.
            if (char.id == "libby" && !repo.prefs.hideLibby && !callOpen) {
                LibbyChatBanner(
                    repo = repo, char = char, conversation = convo,
                    busy = busy, typing = busy && typingPhase == TypingPhase.TYPING,
                    status = status?.takeIf { it.enabled }?.model ?: "Local replies",
                    onOpenCall = { callOpen = true },
                )
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
            Box(Modifier.weight(1f).fillMaxWidth()) {
                LazyColumn(state = list, modifier = Modifier.fillMaxSize(), contentPadding = PaddingValues(top = 4.dp, bottom = 14.dp)) {
                    // The intro card is a placeholder for an empty log, not a permanent
                    // header — once there is conversation to read, it is only taking room.
                    if (convo.messages.isEmpty()) item { ChatIntro(repo, char, convo, status) }
                    itemsIndexed(convo.messages, key = { _, item -> item.id }) { index, item ->
                        // The separator shares the message's slot rather than taking one of
                        // its own, so the list's indices stay one-per-message — which is
                        // what the auto-scroll above counts in.
                        Column(Modifier.fillMaxWidth()) {
                            val previous = convo.messages.getOrNull(index - 1)
                            // A day break is something a reader needs and something this log
                            // never showed: a conversation picked up a week later ran
                            // straight on from the one before it with nothing to say so.
                            if (previous == null || !sameChatDay(previous.at, item.at)) ChatDaySeparator(item.at)
                            ChatMessageRow(
                                repo, ws, char, item, previous, convo.messages.getOrNull(index + 1), onOpenMedia,
                                onHold = { holdMessage = it }, onReply = { replyTarget = it },
                                onReact = { m, emoji -> react(m, emoji) }, onOpenSnap = { snapOpen = it },
                                receipt = receiptFor(item, convo),
                            )
                        }
                    }
                    if (busy && typingPhase == TypingPhase.TYPING) item { ChatTypingBubble(repo, char) }
                }
                // Reading back through a long night and then wanting to be at the bottom
                // again is a chat's commonest navigation, and scrolling for it by hand is
                // the worst way to do it.
                val away by remember(list) {
                    derivedStateOf {
                        val last = list.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0
                        list.layoutInfo.totalItemsCount > 0 && last < list.layoutInfo.totalItemsCount - 2
                    }
                }
                if (away) {
                    IconButton(
                        onClick = { scope.launch { list.animateScrollToItem((convo.messages.size - 1).coerceAtLeast(0)) } },
                        modifier = Modifier.align(Alignment.BottomEnd).padding(end = 14.dp, bottom = 10.dp)
                            .size(38.dp).clip(CircleShape).background(ChatColors.side),
                    ) { Icon(Icons.Filled.ArrowDownward, "Jump to the latest message", tint = ChatColors.text, modifier = Modifier.size(20.dp)) }
                }
            }
            if (message.isNotBlank()) Text(message, color = if (message.contains("fail", true) || message.contains("couldn", true)) ChatColors.danger else ChatColors.muted, fontSize = 13.sp, modifier = Modifier.fillMaxWidth().background(ChatColors.side).padding(10.dp))
            // What the next message answers. A bar above the box, the way every messenger
            // draws it, with its own close.
            replyTarget?.let { target ->
                Row(
                    Modifier.fillMaxWidth().background(ChatColors.side).padding(start = 12.dp, end = 4.dp, top = 6.dp, bottom = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(Modifier.width(3.dp).height(36.dp).clip(RoundedCornerShape(2.dp)).background(ChatColors.accent))
                    Column(Modifier.weight(1f).padding(horizontal = 10.dp)) {
                        Text("Replying to ${if (target.role == "assistant") char.name else "yourself"}", color = ChatColors.accent, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                        Text(excerptOf(target.content), color = ChatColors.muted, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                    IconButton(onClick = { replyTarget = null }) { Icon(Icons.Filled.Close, "Cancel reply", tint = ChatColors.muted) }
                }
            }
            // Library items going with the next message, as removable chips.
            if (pendingItems.isNotEmpty()) {
                Row(
                    Modifier.fillMaxWidth().background(ChatColors.side).horizontalScroll(rememberScrollState()).padding(horizontal = 10.dp, vertical = 6.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    pendingItems.forEach { item ->
                        Row(
                            Modifier.clip(RoundedCornerShape(10.dp)).background(ChatColors.input).padding(start = 4.dp, end = 2.dp, top = 3.dp, bottom = 3.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            if (item.hasThumb) AsyncImage(repo.thumbUrl(item.id), null, imageLoader = repo.imageLoader, contentScale = ContentScale.Crop, modifier = Modifier.size(26.dp).clip(RoundedCornerShape(6.dp)))
                            else Icon(linkIcon(item.kind), null, tint = ChatColors.muted, modifier = Modifier.size(22.dp))
                            Text(item.title, color = ChatColors.text, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(horizontal = 6.dp).widthIn(max = 150.dp))
                            IconButton(onClick = { pendingItems = pendingItems.filterNot { it.id == item.id } }, modifier = Modifier.size(24.dp)) {
                                Icon(Icons.Filled.Close, "Remove ${item.title}", tint = ChatColors.muted, modifier = Modifier.size(14.dp))
                            }
                        }
                    }
                }
            }
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
            // One pill holding the attach key, the field and send, so the composer reads
            // as a single control rather than as a text box with buttons parked beside it.
            Row(
                Modifier.fillMaxWidth().padding(start = 8.dp, end = 8.dp, top = 4.dp, bottom = 8.dp),
                verticalAlignment = Alignment.Bottom,
            ) {
                Row(
                    Modifier.weight(1f).clip(RoundedCornerShape(24.dp)).background(ChatColors.input),
                    verticalAlignment = Alignment.Bottom,
                ) {
                    // Sending a picture used to mean opening the settings sheet, finding
                    // the images tab, uploading there, and coming back. It is a paperclip
                    // in every other chat app, so it is one here.
                    IconButton(onClick = { attachPicker.launch("image/*") }, enabled = !uploading && !busy) {
                        Icon(Icons.Filled.AddPhotoAlternate, "Attach a photo", tint = ChatColors.muted)
                    }
                    // A library item goes by reference — a video, a game, a comic — so she
                    // is told what it is rather than handed a still of it.
                    IconButton(onClick = { pickerOpen = true }, enabled = !busy, modifier = Modifier.size(40.dp)) {
                        Icon(Icons.Filled.CollectionsBookmark, "Attach from the library", tint = ChatColors.muted)
                    }
                    TextField(
                        draft, { draft = it },
                        placeholder = { Text("Message", color = ChatColors.muted) },
                        enabled = !busy, maxLines = 5,
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                        keyboardActions = KeyboardActions(onSend = { sendMessage() }),
                        colors = TextFieldDefaults.colors(
                            focusedContainerColor = Color.Transparent,
                            unfocusedContainerColor = Color.Transparent,
                            disabledContainerColor = Color.Transparent,
                            focusedIndicatorColor = Color.Transparent,
                            unfocusedIndicatorColor = Color.Transparent,
                            disabledIndicatorColor = Color.Transparent,
                        ),
                        modifier = Modifier.weight(1f),
                    )
                }
                val canSend = (draft.isNotBlank() || pendingPhoto != null) && !busy
                IconButton(
                    onClick = { sendMessage() }, enabled = canSend,
                    modifier = Modifier.padding(start = 7.dp).size(48.dp).clip(CircleShape)
                        .background(if (canSend) ChatColors.accent else ChatColors.input),
                ) {
                    Icon(
                        Icons.AutoMirrored.Filled.Send, "Send",
                        tint = if (canSend) MaterialTheme.colorScheme.onPrimary else ChatColors.muted,
                    )
                }
            }
        }
    }

    // A snap, full-screen, until you tap it away. It only opens once: closing marks it.
    snapOpen?.let { snap ->
        Dialog(onDismissRequest = { closeSnap() }, properties = DialogProperties(usePlatformDefaultWidth = false)) {
            val src = when {
                snap.imageId.isNotBlank() -> repo.chatImageUrl(snap.imageId)
                snap.attachments.isNotEmpty() -> repo.streamUrl(snap.attachments[0].id)
                else -> ""
            }
            Box(Modifier.fillMaxSize().background(Color.Black.copy(alpha = .94f)).clickable { closeSnap() }, contentAlignment = Alignment.Center) {
                if (src.isNotBlank()) AsyncImage(src, "Snap", imageLoader = repo.imageLoader, contentScale = ContentScale.Fit, modifier = Modifier.fillMaxSize())
                else Text("This snap is gone.", color = Color.White)
                Text(
                    "Tap anywhere to close — it won't open again", color = Color.White.copy(alpha = .7f), fontSize = 12.sp,
                    modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 28.dp),
                )
            }
        }
    }

    // She is ringing. A card over whichever pane is up, with answer and decline; it
    // rings out on its own (see the LaunchedEffect above).
    if (incomingCall && char != null) {
        IncomingCallCard(
            repo = repo, char = char,
            onAnswer = { incomingCall = false; callOpen = true },
            onDecline = { incomingCall = false },
            modifier = Modifier.align(Alignment.TopCenter).padding(top = 52.dp, start = 12.dp, end = 12.dp),
        )
    }
    } // Box

    // The held message's menu: reply, copy, the retries, delete.
    holdMessage?.let { held ->
        ModalBottomSheet(onDismissRequest = { holdMessage = null }) {
            val redo = canRedo(held)
            if (held.thought.isBlank()) ListItem(
                headlineContent = { Text("Reply") }, supportingContent = { Text("Quote this in your next message") },
                leadingContent = { Icon(Icons.AutoMirrored.Filled.Reply, null) },
                modifier = Modifier.clickable { replyTarget = held; holdMessage = null },
            )
            if (held.role == "assistant" && held.thought.isBlank()) {
                val mine = held.reactions.firstOrNull { it.by == "user" }?.emoji
                Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(horizontal = 12.dp, vertical = 6.dp), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    REACTIONS.forEach { emoji ->
                        Box(
                            Modifier.clip(CircleShape).background(if (mine == emoji) ChatColors.accent.copy(alpha = .25f) else Color.Transparent)
                                .clickable { react(held, emoji); holdMessage = null }.padding(horizontal = 10.dp, vertical = 8.dp),
                        ) { Text(emoji, fontSize = 24.sp) }
                    }
                }
            }
            ListItem(
                headlineContent = { Text("Copy text") },
                leadingContent = { Icon(Icons.Filled.ContentCopy, null) },
                modifier = Modifier.clickable { clipboard.setText(AnnotatedString(held.content)); holdMessage = null },
            )
            if (redo) {
                ListItem(
                    headlineContent = { Text("Retry") }, supportingContent = { Text("Ask for a different reply") },
                    leadingContent = { Icon(Icons.Filled.Refresh, null) },
                    modifier = Modifier.clickable { holdMessage = null; regenerate() },
                )
                ListItem(
                    headlineContent = { Text("Retry with a note…") }, supportingContent = { Text("Say what should be different") },
                    leadingContent = { Icon(Icons.Filled.EditNote, null) },
                    modifier = Modifier.clickable { holdMessage = null; retryNote = ""; retryNoteOpen = true },
                )
            }
            if (held.role == "user" && held.thought.isBlank()) ListItem(
                headlineContent = { Text("Retry from here") }, supportingContent = { Text("Drop everything after this and have her answer it again") },
                leadingContent = { Icon(Icons.Filled.Replay, null) },
                modifier = Modifier.clickable { holdMessage = null; retryFrom(held) },
            )
            ListItem(
                headlineContent = { Text("Delete message", color = ChatColors.danger) },
                leadingContent = { Icon(Icons.Filled.Delete, null, tint = ChatColors.danger) },
                modifier = Modifier.clickable { deleteMessage(held); holdMessage = null },
            )
            Spacer(Modifier.size(16.dp))
        }
    }

    if (retryNoteOpen) AlertDialog(
        onDismissRequest = { retryNoteOpen = false },
        title = { Text("Try that again") },
        text = { TextField(retryNote, { retryNote = it }, placeholder = { Text("shorter · answer the question · less pouty") }) },
        confirmButton = { Button(onClick = {
            retryNoteOpen = false
            val note = retryNote.trim().let { if (it.isEmpty() || it.endsWith(".")) it else "$it." }
            regenerate(note)
        }) { Text("Retry") } },
        dismissButton = { TextButton(onClick = { retryNoteOpen = false }) { Text("Cancel") } },
    )

    if (pickerOpen) {
        LibraryPickerSheet(
            repo = repo,
            chosen = pendingItems,
            onToggle = { item ->
                pendingItems = if (pendingItems.any { it.id == item.id }) pendingItems.filterNot { it.id == item.id }
                else if (pendingItems.size >= 6) pendingItems
                else pendingItems + LibbyAttachment(item.id, item.title.ifBlank { "Item ${item.id}" }, item.kind, item.hasThumb)
            },
            onDismiss = { pickerOpen = false },
        )
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

/**
 * The video call.
 *
 * The room she is in fills the screen, she stands in it, and everything else — who,
 * how long, how she feels, what was just said — is laid over it in the thinnest chrome
 * that still reads. It is the same conversation underneath: sending here writes to the
 * ordinary log, her mood swaps the sprite on the next recomposition, and where she is
 * comes from the conversation, chosen by her with a tag or by hand from the tray.
 */
@Composable
private fun LibbyVideoCall(
    repo: Repository,
    conversation: ChatConversation,
    busy: Boolean,
    typing: Boolean,
    seconds: Int,
    draft: String,
    backgrounds: List<LibbyBackground>,
    onDraft: (String) -> Unit,
    onSend: () -> Unit,
    onRetry: () -> Unit,
    onBackground: (String) -> Unit,
    onRefreshBackgrounds: () -> Unit,
    onEnd: () -> Unit,
) {
    val emotion = conversation.emotion.ifBlank { "neutral" }
    val tier = conversation.intensity.coerceIn(1, LibbyMeter.MAX)
    // Her typing art while she writes, when she is not otherwise in a state with art of
    // its own; the caption of dots says the same thing either way.
    val activity = conversation.activity.ifBlank { if (typing) "typing" else "" }
    val place = backgrounds.firstOrNull { it.id == conversation.background && it.hasImage }
    // The last few lines as subtitles, newest at the bottom. Thoughts are not speech.
    val recent = conversation.messages.filter { it.thought.isBlank() }.takeLast(3)
    val clock = "%d:%02d".format(seconds / 60, seconds % 60)
    var trayOpen by remember { mutableStateOf(false) }
    var captions by remember { mutableStateOf(true) }

    Column(Modifier.fillMaxSize().background(Color.Black)) {
        Box(Modifier.weight(1f).fillMaxWidth()) {
            // The room. A picture when she is somewhere; the old gradient when not.
            if (place != null) {
                AsyncImage(
                    repo.libbyBackgroundUrl(place.id), null, imageLoader = repo.imageLoader,
                    contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize().scale(1.03f),
                )
            } else {
                Box(
                    Modifier.fillMaxSize().background(
                        Brush.radialGradient(
                            listOf(MaterialTheme.colorScheme.primaryContainer.copy(alpha = .55f), Color(0xFF0B0A0D)),
                            radius = 1400f,
                        ),
                    ),
                )
            }
            // A veil so the chrome reads on any picture: dark at the top for the header,
            // dark at the bottom for the captions, clear where she stands.
            Box(
                Modifier.fillMaxSize().background(
                    Brush.verticalGradient(
                        0f to Color(0x8C000000), .22f to Color.Transparent, .62f to Color.Transparent, 1f to Color(0x99000000),
                    ),
                ),
            )
            LibbyPortrait(
                repo = repo,
                emotion = emotion,
                tier = tier,
                fallbackAsset = mascotAsset(emotion, tier),
                modifier = Modifier.fillMaxSize().padding(top = 60.dp),
                activity = activity,
                // A cowboy shot stands on the bottom edge — cut at the thigh by the frame,
                // the way the web call draws her — rather than floating mid-screen.
                alignment = Alignment.BottomCenter,
            )
            // Header: who, how long, and how she is — two pills, not a bar.
            Row(
                Modifier.align(Alignment.TopCenter).fillMaxWidth().windowInsetsPadding(WindowInsets.safeDrawing).padding(horizontal = 12.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(
                    Modifier.clip(RoundedCornerShape(999.dp)).background(Color(0x6B000000)).padding(start = 8.dp, end = 12.dp, top = 5.dp, bottom = 5.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(Modifier.size(7.dp).clip(CircleShape).background(Color(0xFFF04747)))
                    Column(Modifier.padding(start = 8.dp)) {
                        Text("Libby", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text(if (typing) "typing…" else if (busy) "thinking…" else clock, color = Color.White.copy(alpha = .78f), fontSize = 11.sp)
                    }
                }
                Spacer(Modifier.weight(1f))
                Column(
                    Modifier.clip(RoundedCornerShape(999.dp)).background(Color(0x6B000000)).padding(horizontal = 11.dp, vertical = 5.dp),
                    horizontalAlignment = Alignment.End,
                ) {
                    Text(
                        listOfNotNull(
                            emotion.replaceFirstChar(Char::uppercase),
                            conversation.activity.ifBlank { null }?.replaceFirstChar(Char::uppercase),
                            place?.name,
                        ).joinToString(" · "),
                        color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis,
                    )
                }
            }
            // Subtitles: the last few lines, yours tinted, hers plain, the newest brightest.
            if (captions) Column(
                Modifier.align(Alignment.BottomCenter).fillMaxWidth().padding(horizontal = 14.dp, vertical = 12.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                recent.forEachIndexed { index, line ->
                    val mine = line.role == "user"
                    val newest = index == recent.lastIndex
                    Text(
                        richChatText(line.content),
                        color = Color.White,
                        fontSize = if (newest) 15.sp else 13.sp,
                        modifier = Modifier.alpha(if (newest) 1f else .62f).fillMaxWidth(.92f).clip(RoundedCornerShape(14.dp))
                            .background(if (mine) MaterialTheme.colorScheme.primary.copy(alpha = .62f) else Color(0x8F000000))
                            .padding(horizontal = 14.dp, vertical = 9.dp),
                    )
                }
                if (typing) Box(
                    Modifier.clip(RoundedCornerShape(14.dp)).background(Color(0x8F000000)).padding(horizontal = 16.dp, vertical = 12.dp),
                ) { TypingDots(Color.White.copy(alpha = .85f)) }
            }
            // The tray: where she is, chosen by hand. Overrides her until she moves again.
            if (trayOpen) {
                val usable = backgrounds.filter { it.hasImage }
                Column(
                    Modifier.align(Alignment.BottomEnd).padding(12.dp).widthIn(max = 420.dp).fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp)).background(Color(0xF00E0E12)).padding(12.dp),
                ) {
                    Text("WHERE SHE IS", color = Color.White.copy(alpha = .7f), fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                    LazyVerticalGrid(
                        columns = GridCells.Adaptive(96.dp), modifier = Modifier.padding(top = 8.dp).heightIn(max = 220.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        item {
                            SceneTile(selected = conversation.background.isBlank(), name = "Plain", onClick = { onBackground(""); trayOpen = false }) {
                                Icon(Icons.Filled.BlurOn, null, tint = Color.White.copy(alpha = .7f), modifier = Modifier.size(28.dp))
                            }
                        }
                        items(usable, key = { it.id }) { bg ->
                            SceneTile(selected = conversation.background == bg.id, name = bg.name, onClick = { onBackground(bg.id); trayOpen = false }) {
                                AsyncImage(repo.libbyBackgroundUrl(bg.id), bg.name, imageLoader = repo.imageLoader, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                            }
                        }
                    }
                    Text(
                        if (usable.isEmpty()) "No backgrounds yet — add and tag some in Settings, and she'll choose between them."
                        else "She picks a room herself when the scene moves; this overrides her until she moves again.",
                        color = Color.White.copy(alpha = .6f), fontSize = 12.sp, modifier = Modifier.padding(top = 8.dp),
                    )
                }
            }
        }
        Row(
            Modifier.fillMaxWidth().background(Color(0xFF0C0C10)).imePadding().navigationBarsPadding().padding(horizontal = 10.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            TextField(
                value = draft,
                onValueChange = onDraft,
                placeholder = { Text("Say something to Libby…", color = Color.White.copy(alpha = .5f)) },
                enabled = !busy,
                maxLines = 3,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                keyboardActions = KeyboardActions(onSend = { onSend() }),
                shape = RoundedCornerShape(24.dp),
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = Color(0x1AFFFFFF), unfocusedContainerColor = Color(0x1AFFFFFF), disabledContainerColor = Color(0x1AFFFFFF),
                    focusedTextColor = Color.White, unfocusedTextColor = Color.White, disabledTextColor = Color.White.copy(alpha = .6f),
                    focusedIndicatorColor = Color.Transparent, unfocusedIndicatorColor = Color.Transparent, disabledIndicatorColor = Color.Transparent,
                ),
                modifier = Modifier.weight(1f),
            )
            CallButton(Icons.AutoMirrored.Filled.Send, "Send", enabled = draft.isNotBlank() && !busy, background = MaterialTheme.colorScheme.primary, tint = MaterialTheme.colorScheme.onPrimary, onClick = onSend)
            CallButton(Icons.Filled.Wallpaper, "Change the background", on = trayOpen, onClick = { trayOpen = !trayOpen; if (trayOpen) onRefreshBackgrounds() })
            CallButton(Icons.Filled.ClosedCaption, if (captions) "Hide captions" else "Show captions", on = captions, onClick = { captions = !captions })
            CallButton(Icons.Filled.Refresh, "Ask for a different reply", enabled = !busy, onClick = onRetry)
            CallButton(Icons.Filled.CallEnd, "End video chat", background = Color(0xFFE5484D), tint = Color.White, onClick = onEnd)
        }
    }
}

/** One round control on the call bar. */
@Composable
private fun CallButton(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    enabled: Boolean = true,
    on: Boolean = false,
    background: Color = if (on) MaterialTheme.colorScheme.primary.copy(alpha = .8f) else Color(0x1AFFFFFF),
    tint: Color = Color.White,
    onClick: () -> Unit,
) {
    IconButton(onClick = onClick, enabled = enabled, modifier = Modifier.size(42.dp).clip(CircleShape).background(background)) {
        Icon(icon, label, tint = tint.copy(alpha = if (enabled) 1f else .45f), modifier = Modifier.size(20.dp))
    }
}

/** One room in the call's tray. */
@Composable
private fun SceneTile(selected: Boolean, name: String, onClick: () -> Unit, content: @Composable () -> Unit) {
    Box(
        Modifier.fillMaxWidth().height(60.dp).clip(RoundedCornerShape(10.dp)).background(Color(0xFF26242C))
            .border(2.dp, if (selected) MaterialTheme.colorScheme.primary else Color.Transparent, RoundedCornerShape(10.dp))
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        content()
        Text(
            name, color = Color.White, fontSize = 11.sp, maxLines = 1, overflow = TextOverflow.Ellipsis,
            modifier = Modifier.align(Alignment.BottomStart).fillMaxWidth()
                .background(Brush.verticalGradient(listOf(Color.Transparent, Color(0xCC000000)))).padding(start = 6.dp, end = 6.dp, top = 12.dp, bottom = 4.dp),
        )
    }
}

/** Three pulsing dots, the typing indicator's own vocabulary. */
@Composable
private fun TypingDots(color: Color) {
    val pulse = rememberInfiniteTransition(label = "typing")
    Row(horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
        repeat(3) { index ->
            val alpha by pulse.animateFloat(
                initialValue = .3f, targetValue = 1f,
                animationSpec = infiniteRepeatable(tween(520, delayMillis = index * 160, easing = LinearEasing), RepeatMode.Reverse),
                label = "dot$index",
            )
            Box(Modifier.size(7.dp).clip(CircleShape).background(color.copy(alpha = alpha)))
        }
    }
}

/**
 * She is ringing you. A card over the conversation rather than a screen: it floats
 * where a notification would, pulses, and either you pick up or it rings out.
 */
@Composable
private fun IncomingCallCard(repo: Repository, char: ChatCharacter, onAnswer: () -> Unit, onDecline: () -> Unit, modifier: Modifier = Modifier) {
    val pulse = rememberInfiniteTransition(label = "ring")
    val ring by pulse.animateFloat(
        initialValue = 1f, targetValue = 1.12f,
        animationSpec = infiniteRepeatable(tween(650, easing = LinearEasing), RepeatMode.Reverse), label = "ringScale",
    )
    Row(
        modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(ChatColors.side).padding(start = 10.dp, end = 10.dp, top = 10.dp, bottom = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        ChatAvatar(repo, char, Modifier.size(46.dp).scale(ring).clip(CircleShape))
        Column(Modifier.weight(1f).padding(horizontal = 12.dp)) {
            Text("${char.name} is calling", color = ChatColors.text, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
            Text("Video call", color = ChatColors.muted, fontSize = 12.sp)
        }
        IconButton(onClick = onDecline, modifier = Modifier.size(42.dp).clip(CircleShape).background(ChatColors.danger)) {
            Icon(Icons.Filled.CallEnd, "Decline", tint = MaterialTheme.colorScheme.onError, modifier = Modifier.size(20.dp))
        }
        Spacer(Modifier.width(8.dp))
        IconButton(onClick = onAnswer, modifier = Modifier.size(42.dp).clip(CircleShape).background(Color(0xFF2FB35A))) {
            Icon(Icons.Filled.Videocam, "Answer", tint = Color.White, modifier = Modifier.size(20.dp))
        }
    }
}

/**
 * Attaching library items to a message. A sheet with a search box and the library
 * under it, newest first; tapping toggles. Items go by reference — a video or a game
 * cannot be copied into a gallery of stills, and does not need to be.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun LibraryPickerSheet(repo: Repository, chosen: List<LibbyAttachment>, onToggle: (Media) -> Unit, onDismiss: () -> Unit) {
    var query by remember { mutableStateOf("") }
    var items by remember { mutableStateOf<List<Media>?>(null) }
    LaunchedEffect(Unit) { items = runCatching { repo.listAll(null) }.getOrDefault(emptyList()) }
    val words = remember(query) { query.trim().lowercase().split(' ').filter { it.isNotEmpty() } }
    val shown = remember(items, words) {
        (items ?: emptyList()).filter { m ->
            words.all { w -> m.title.lowercase().contains(w) || m.kind.contains(w) || m.tags.any { t -> t.name.lowercase().contains(w) } }
        }.take(200)
    }
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 12.dp).heightIn(max = 560.dp)) {
            TextField(
                query, { query = it }, placeholder = { Text("Search your library…") }, singleLine = true,
                leadingIcon = { Icon(Icons.Filled.Search, null) },
                shape = RoundedCornerShape(24.dp),
                colors = TextFieldDefaults.colors(focusedIndicatorColor = Color.Transparent, unfocusedIndicatorColor = Color.Transparent),
                modifier = Modifier.fillMaxWidth(),
            )
            Text(
                if (chosen.isEmpty()) "Pick videos, pictures, gifs, comics or games to show her." else "${chosen.size} chosen",
                color = ChatColors.muted, fontSize = 12.sp, modifier = Modifier.padding(vertical = 8.dp),
            )
            when {
                items == null -> Box(Modifier.fillMaxWidth().padding(30.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
                shown.isEmpty() -> Text("Nothing matches.", color = ChatColors.muted, modifier = Modifier.padding(24.dp).align(Alignment.CenterHorizontally))
                else -> LazyVerticalGrid(
                    columns = GridCells.Adaptive(100.dp), modifier = Modifier.weight(1f, fill = false),
                    horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp),
                    contentPadding = PaddingValues(bottom = 24.dp),
                ) {
                    items(shown, key = { it.id }) { m ->
                        val on = chosen.any { it.id == m.id }
                        Box(
                            Modifier.fillMaxWidth().height(100.dp).clip(RoundedCornerShape(12.dp)).background(ChatColors.input)
                                .border(2.dp, if (on) ChatColors.accent else Color.Transparent, RoundedCornerShape(12.dp))
                                .clickable { onToggle(m) },
                        ) {
                            if (m.hasThumb || m.kind == "image" || m.kind == "gif") {
                                AsyncImage(repo.thumbUrl(m.id), m.title, imageLoader = repo.imageLoader, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                            } else {
                                Icon(linkIcon(m.kind), null, tint = ChatColors.muted, modifier = Modifier.align(Alignment.Center).size(34.dp))
                            }
                            Text(
                                m.title.ifBlank { "Item ${m.id}" }, color = Color.White, fontSize = 11.sp, maxLines = 1, overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.align(Alignment.BottomStart).fillMaxWidth()
                                    .background(Brush.verticalGradient(listOf(Color.Transparent, Color(0xCC000000)))).padding(start = 6.dp, end = 6.dp, top = 16.dp, bottom = 5.dp),
                            )
                            if (on) Box(
                                Modifier.align(Alignment.TopEnd).padding(5.dp).size(20.dp).clip(CircleShape).background(ChatColors.accent),
                                contentAlignment = Alignment.Center,
                            ) { Icon(Icons.Filled.Check, null, tint = MaterialTheme.colorScheme.onPrimary, modifier = Modifier.size(14.dp)) }
                        }
                    }
                }
            }
            Row(Modifier.fillMaxWidth().padding(vertical = 10.dp), horizontalArrangement = Arrangement.End) {
                Button(onClick = onDismiss) { Text(if (chosen.isEmpty()) "Close" else "Done") }
            }
        }
    }
}

/** The dot beside a face. Not a theme colour: "available" is green everywhere. */
private val PresenceOnline = Color(0xFF35C759)

/**
 * The list of conversations, which is what a messaging app opens on.
 *
 * A friends rail across the top and the conversations under it, newest first. The rail
 * is deliberately the way you start a chat: in the drawer this replaced, beginning a
 * conversation meant finding a menu item, and the only face you ever saw was the one
 * you were already talking to.
 *
 * [openId] only shades the row you came out of, so coming back from a conversation
 * shows you where you were rather than making you find it again.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ChatInbox(
    repo: Repository,
    ws: ChatWorkspace,
    online: Boolean,
    openId: String,
    query: String,
    onQuery: (String) -> Unit,
    onBack: () -> Unit,
    onOpen: (String) -> Unit,
    onFriend: (String) -> Unit,
    onNewConversation: (String) -> Unit,
    onAddFriend: () -> Unit,
    onImport: () -> Unit,
    onSettings: () -> Unit,
    onDelete: (ChatConversation) -> Unit,
) {
    var menuOpen by remember { mutableStateOf(false) }
    var holdOn by remember { mutableStateOf<ChatConversation?>(null) }
    val terms = query.trim().lowercase()
    // Searching the messages and not only the titles, because a conversation's title is
    // its first line and nobody remembers a chat by its first line.
    val rows = remember(ws, terms) {
        ws.conversations.filter { convo ->
            terms.isEmpty() ||
                convo.title.lowercase().contains(terms) ||
                ws.characters.firstOrNull { it.id == convo.characterId }?.name?.lowercase()?.contains(terms) == true ||
                convo.messages.any { it.content.lowercase().contains(terms) }
        }.sortedByDescending { it.updatedAt }
    }

    Column(Modifier.fillMaxSize().background(ChatColors.main).windowInsetsPadding(WindowInsets.safeDrawing)) {
        Row(
            Modifier.fillMaxWidth().height(58.dp).padding(start = 2.dp, end = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back to the library", tint = ChatColors.text)
            }
            Text("Chats", color = ChatColors.text, fontWeight = FontWeight.Bold, fontSize = 22.sp, modifier = Modifier.weight(1f))
            IconButton(onClick = onSettings) { Icon(Icons.Filled.Settings, "Chat settings", tint = ChatColors.muted) }
            Box {
                IconButton(onClick = { menuOpen = true }) { Icon(Icons.Filled.MoreVert, "More", tint = ChatColors.muted) }
                DropdownMenu(expanded = menuOpen, onDismissRequest = { menuOpen = false }) {
                    DropdownMenuItem(text = { Text("Add a friend") }, leadingIcon = { Icon(Icons.Filled.PersonAdd, null) }, onClick = { menuOpen = false; onAddFriend() })
                    DropdownMenuItem(text = { Text("Import a character card") }, leadingIcon = { Icon(Icons.Filled.Download, null) }, onClick = { menuOpen = false; onImport() })
                }
            }
        }
        TextField(
            query, onQuery,
            placeholder = { Text("Search conversations", color = ChatColors.muted) },
            leadingIcon = { Icon(Icons.Filled.Search, null, tint = ChatColors.muted) },
            singleLine = true,
            shape = RoundedCornerShape(22.dp),
            colors = TextFieldDefaults.colors(
                focusedContainerColor = ChatColors.input,
                unfocusedContainerColor = ChatColors.input,
                focusedIndicatorColor = Color.Transparent,
                unfocusedIndicatorColor = Color.Transparent,
            ),
            modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 2.dp),
        )
        Row(
            Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(horizontal = 12.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            ws.characters.forEach { friend ->
                Column(
                    Modifier.width(66.dp).clip(RoundedCornerShape(12.dp)).clickable { onFriend(friend.id) }.padding(vertical = 4.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Box {
                        ChatAvatar(repo, friend, Modifier.size(52.dp).clip(CircleShape))
                        // Libby answers with or without a model loaded, so she is never
                        // shown as away; anyone else depends on the backend being up.
                        if (online || friend.id == "libby") {
                            Box(
                                Modifier.align(Alignment.BottomEnd).size(14.dp).clip(CircleShape).background(ChatColors.main),
                                contentAlignment = Alignment.Center,
                            ) { Box(Modifier.size(9.dp).clip(CircleShape).background(PresenceOnline)) }
                        }
                    }
                    Text(
                        friend.name, color = ChatColors.text, fontSize = 11.sp, maxLines = 1,
                        overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 5.dp),
                    )
                }
            }
            Column(
                Modifier.width(66.dp).clip(RoundedCornerShape(12.dp)).clickable { onAddFriend() }.padding(vertical = 4.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Box(Modifier.size(52.dp).clip(CircleShape).background(ChatColors.input), contentAlignment = Alignment.Center) {
                    Icon(Icons.Filled.PersonAdd, "Add a friend", tint = ChatColors.muted)
                }
                Text("Add", color = ChatColors.muted, fontSize = 11.sp, modifier = Modifier.padding(top = 5.dp))
            }
        }
        HorizontalDivider(color = ChatColors.input)
        if (rows.isEmpty()) {
            Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                Text(
                    if (terms.isEmpty()) "No conversations yet — tap a friend above to start one." else "Nothing matched that.",
                    color = ChatColors.muted, fontSize = 13.sp, modifier = Modifier.padding(24.dp),
                )
            }
        } else {
            LazyColumn(Modifier.weight(1f).fillMaxWidth(), contentPadding = PaddingValues(bottom = 16.dp)) {
                items(rows, key = { it.id }) { convo ->
                    ChatInboxRow(
                        repo = repo,
                        friend = ws.characters.firstOrNull { it.id == convo.characterId },
                        convo = convo,
                        // The conversation's own name earns a line only when there is more
                        // than one with this person; otherwise the friend's name says it all
                        // and a second line of "New conversation" is noise.
                        showTitle = ws.conversations.count { it.characterId == convo.characterId } > 1,
                        selected = convo.id == openId,
                        onClick = { onOpen(convo.id) },
                        onHold = { holdOn = convo },
                    )
                }
            }
        }
        Text(
            if (online) "● Model online" else "○ Libby answers locally; other friends need a model",
            color = if (online) ChatColors.accent else ChatColors.muted,
            fontSize = 11.sp,
            modifier = Modifier.padding(horizontal = 18.dp, vertical = 8.dp),
        )
    }

    holdOn?.let { target ->
        val friend = ws.characters.firstOrNull { it.id == target.characterId }
        ModalBottomSheet(onDismissRequest = { holdOn = null }) {
            Text(
                target.title, style = MaterialTheme.typography.titleMedium, maxLines = 2,
                modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp),
            )
            ListItem(
                headlineContent = { Text("Open") },
                leadingContent = { Icon(Icons.Filled.ChatBubble, contentDescription = null) },
                modifier = Modifier.clickable { holdOn = null; onOpen(target.id) },
            )
            ListItem(
                headlineContent = { Text("Start a new one with ${friend?.name ?: "them"}") },
                leadingContent = { Icon(Icons.Filled.AddComment, contentDescription = null) },
                modifier = Modifier.clickable { holdOn = null; onNewConversation(target.characterId) },
            )
            ListItem(
                headlineContent = { Text("Delete", color = ChatColors.danger) },
                supportingContent = { Text("Removes this conversation and its messages") },
                leadingContent = { Icon(Icons.Filled.Delete, contentDescription = null, tint = ChatColors.danger) },
                modifier = Modifier.clickable { holdOn = null; onDelete(target) },
            )
            Spacer(Modifier.size(16.dp))
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun ChatInboxRow(
    repo: Repository,
    friend: ChatCharacter?,
    convo: ChatConversation,
    showTitle: Boolean,
    selected: Boolean,
    onClick: () -> Unit,
    onHold: () -> Unit,
) {
    Row(
        Modifier.fillMaxWidth()
            .background(if (selected) ChatColors.input else Color.Transparent)
            .combinedClickable(onClick = onClick, onLongClick = onHold)
            .padding(horizontal = 14.dp, vertical = 9.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (friend != null) ChatAvatar(repo, friend, Modifier.size(50.dp).clip(CircleShape))
        Column(Modifier.weight(1f).padding(start = 12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    friend?.name ?: "Conversation", color = ChatColors.text, fontWeight = FontWeight.SemiBold,
                    fontSize = 15.sp, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f),
                )
                Text(chatInboxStamp(convo.updatedAt), color = ChatColors.muted, fontSize = 11.sp, modifier = Modifier.padding(start = 8.dp))
            }
            Text(
                conversationPreview(convo), color = ChatColors.muted, fontSize = 13.sp,
                maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 1.dp),
            )
            if (showTitle) {
                Text(
                    convo.title, color = ChatColors.muted.copy(alpha = .65f), fontSize = 11.sp,
                    maxLines = 1, overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}

/**
 * The one line of a conversation that shows in the list.
 *
 * A thought is not speech, so it is never previewed as though she said it — the log
 * draws those as their own thing and quoting one here would put words in her mouth.
 */
private fun conversationPreview(convo: ChatConversation): String {
    val last = convo.messages.lastOrNull() ?: return "No messages yet"
    val body = when {
        last.thought.isNotBlank() -> "…"
        last.content.isNotBlank() -> last.content.replace('\n', ' ')
        last.imageId.isNotBlank() -> "Photo"
        // A reply whose whole content was the thing she handed over. Named rather than
        // called "Attachment", because the name is what makes the row worth reading.
        last.attachments.isNotEmpty() -> last.attachments.first().let { if (it.self) "Photo" else it.title.ifBlank { "Attachment" } }
        else -> "…"
    }
    return if (last.role == "user") "You: $body" else body
}

// ── when things were said ────────────────────────────────────────────────────

private val chatDayStamp = SimpleDateFormat("EEEE d MMMM", Locale.getDefault())
private val chatShortDate = SimpleDateFormat("d MMM", Locale.getDefault())

private fun startOfDay(at: Long): Long = Calendar.getInstance().apply {
    timeInMillis = at
    set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0)
    set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
}.timeInMillis

private fun sameChatDay(a: Long, b: Long): Boolean = startOfDay(a) == startOfDay(b)

/** Yesterday by the calendar, not by subtracting 24 hours — the clocks move twice a year. */
private fun yesterdayStart(): Long =
    Calendar.getInstance().apply {
        timeInMillis = startOfDay(System.currentTimeMillis())
        add(Calendar.DAY_OF_YEAR, -1)
    }.timeInMillis

private fun chatDayLabel(at: Long): String = when (startOfDay(at)) {
    startOfDay(System.currentTimeMillis()) -> "Today"
    yesterdayStart() -> "Yesterday"
    else -> chatDayStamp.format(Date(at))
}

/** Today's chats are stamped with the time, older ones with the day. */
private fun chatInboxStamp(at: Long): String = when (startOfDay(at)) {
    startOfDay(System.currentTimeMillis()) -> timeOf(at)
    yesterdayStart() -> "Yesterday"
    else -> chatShortDate.format(Date(at))
}

@Composable
private fun ChatDaySeparator(at: Long) {
    Box(Modifier.fillMaxWidth().padding(top = 14.dp, bottom = 4.dp), contentAlignment = Alignment.Center) {
        Text(
            chatDayLabel(at), color = ChatColors.muted, fontSize = 11.sp,
            modifier = Modifier.clip(RoundedCornerShape(10.dp)).background(ChatColors.side)
                .padding(horizontal = 10.dp, vertical = 4.dp),
        )
    }
}

/**
 * The dots, while she is writing.
 *
 * A line of grey text saying "Libby is typing…" is a status report. Three dots in a
 * bubble where the message is about to appear is what a chat does, and it is the same
 * information — [typeLikeAPerson] decides when it shows, and that has not changed.
 */
@Composable
private fun ChatTypingBubble(repo: Repository, char: ChatCharacter) {
    Row(
        Modifier.fillMaxWidth().padding(start = 10.dp, end = 10.dp, top = 8.dp),
        verticalAlignment = Alignment.Bottom,
    ) {
        Box(Modifier.width(44.dp), contentAlignment = Alignment.BottomCenter) {
            ChatAvatar(repo, char, Modifier.size(30.dp).clip(CircleShape))
        }
        Row(
            Modifier.clip(RoundedCornerShape(18.dp, 18.dp, 18.dp, 4.dp)).background(ChatColors.side)
                .padding(horizontal = 14.dp, vertical = 13.dp),
            horizontalArrangement = Arrangement.spacedBy(5.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            val pulse = rememberInfiniteTransition(label = "typing")
            repeat(3) { index ->
                val alpha by pulse.animateFloat(
                    initialValue = .25f,
                    targetValue = 1f,
                    animationSpec = infiniteRepeatable(
                        animation = tween(520, delayMillis = index * 160, easing = LinearEasing),
                        repeatMode = RepeatMode.Reverse,
                    ),
                    label = "dot$index",
                )
                Box(Modifier.size(7.dp).clip(CircleShape).background(ChatColors.muted.copy(alpha = alpha)))
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
                // The ceiling matches the server's own (samplingBounds.maxTokMax). Above it
                // is not a longer reply: the prompt is fitted to leave exactly the room the
                // budget reserved, and the server caps this one field at that figure.
                ChatSlider("Max reply tokens", convo.options, "max_tokens", 64f, 1536f, 512f) { onConversation(convo.copy(options = convo.options.withNumber("max_tokens", it))) }
                Text("Untouched, these show what the server picked for the last turn — it tunes them to what the turn is for. Moving one pins it for this conversation.", color = ChatColors.muted, fontSize = 11.sp)
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
    // A pfp is a face: the picture set on the card, or Libby's bundled face crop. The
    // live sprite is a figure and belongs on the banner and the call, where all of it
    // fits — see LIBBY_PFP_ASSET for why a crop of the current pose is not an option.
    if (char.avatarImageId.isNotBlank()) AsyncImage(repo.chatImageUrl(char.avatarImageId), char.name, imageLoader = repo.imageLoader, contentScale = ContentScale.Crop, modifier = modifier)
    else if (char.id == "libby" && !repo.prefs.hideLibby) AsyncImage("file:///android_asset/$LIBBY_PFP_ASSET", "Libby", imageLoader = repo.imageLoader, contentScale = ContentScale.Crop, modifier = modifier)
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

/**
 * One message, drawn the way a phone draws messages.
 *
 * Three things changed from the version this replaces, and all three are what made the
 * old log read as a transcript rather than as a conversation:
 *
 *  - Bubbles hug their text. Every bubble used to be stretched to four-fifths of the
 *    screen, so "ok" and a paragraph were the same width and the shape of the exchange
 *    carried no information at all.
 *  - Nobody's name is repeated. This is a conversation between two people, both of whom
 *    know who they are; the avatar and the side of the screen already say it.
 *  - A run of messages is drawn as a run: square inner corners, one avatar at the foot
 *    of it, one timestamp at the end. [previous] and [next] are what make that visible
 *    from inside a single row.
 */
@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun ChatMessageRow(
    repo: Repository,
    ws: ChatWorkspace,
    char: ChatCharacter,
    entry: StoredChatMessage,
    previous: StoredChatMessage?,
    next: StoredChatMessage?,
    onOpenMedia: OpenMedia,
    onHold: (StoredChatMessage) -> Unit = {},
    onReply: (StoredChatMessage) -> Unit = {},
    onReact: (StoredChatMessage, String) -> Unit = { _, _ -> },
    onOpenSnap: (StoredChatMessage) -> Unit = {},
    receipt: String = "",
) {
    if (entry.thought.isNotBlank()) { ChatThoughtRow(char, entry); return }
    val friend = entry.role == "assistant"
    // A thought breaks a run rather than continuing one: what follows it is her speaking
    // again, and it should come back with her face on it. So does a day boundary, which
    // already has a separator drawn across it.
    fun runsWith(other: StoredChatMessage?): Boolean =
        other != null && other.thought.isBlank() && other.role == entry.role &&
            sameChatDay(other.at, entry.at) && kotlin.math.abs(entry.at - other.at) < 5 * 60_000
    val first = !runsWith(previous)
    val last = !runsWith(next)

    val big = 18.dp
    val tight = 6.dp
    val tail = 4.dp
    val shape = if (friend) {
        RoundedCornerShape(
            topStart = if (first) big else tight, topEnd = big,
            bottomEnd = big, bottomStart = if (last) tail else tight,
        )
    } else {
        RoundedCornerShape(
            topStart = big, topEnd = if (first) big else tight,
            bottomEnd = if (last) tail else tight, bottomStart = big,
        )
    }

    // Swipe to reply: the bubble follows the finger a little way, and letting go past
    // the threshold quotes the message in the composer. Vertical drags are the list's.
    var drag by remember(entry.id) { mutableStateOf(0f) }
    val shown by animateIntAsState(drag.toInt(), label = "swipe")
    val replyPx = 56 * 3f
    Box(Modifier.fillMaxWidth()) {
        if (shown > 12) Icon(
            Icons.AutoMirrored.Filled.Reply, null,
            tint = if (drag >= replyPx) ChatColors.accent else ChatColors.muted,
            modifier = Modifier.align(if (friend) Alignment.CenterStart else Alignment.CenterEnd).padding(horizontal = 14.dp).size(20.dp),
        )
    Row(
        Modifier.fillMaxWidth().offset { IntOffset(shown, 0) }
            .pointerInput(entry.id) {
                detectHorizontalDragGestures(
                    onDragEnd = { if (drag >= replyPx) onReply(entry); drag = 0f },
                    onDragCancel = { drag = 0f },
                ) { change, dx ->
                    val next = (drag + dx).coerceIn(0f, 72 * 3f)
                    if (next != drag) { drag = next; change.consume() }
                }
            }
            .padding(start = 10.dp, end = 10.dp, top = if (first) 10.dp else 2.dp),
        horizontalArrangement = if (friend) Arrangement.Start else Arrangement.End,
        verticalAlignment = Alignment.Bottom,
    ) {
        if (friend) {
            Box(Modifier.width(44.dp), contentAlignment = Alignment.BottomCenter) {
                if (last) ChatAvatar(repo, char, Modifier.size(32.dp).clip(CircleShape))
            }
        }
        Column(horizontalAlignment = if (friend) Alignment.Start else Alignment.End) {
        Box {
        Column(
            Modifier.widthIn(max = 320.dp).clip(shape)
                .background(if (friend) ChatColors.side else MaterialTheme.colorScheme.primaryContainer)
                .combinedClickable(onClick = {}, onLongClick = { onHold(entry) })
                .padding(horizontal = 13.dp, vertical = 8.dp, )
                .padding(bottom = if (entry.reactions.isNotEmpty()) 8.dp else 0.dp),
        ) {
            val ink = if (friend) ChatColors.text else MaterialTheme.colorScheme.onPrimaryContainer
            // A quoted reply: the earlier line above the new one, on a bar.
            entry.replyTo?.let { ref ->
                Row(
                    Modifier.padding(bottom = 6.dp).clip(RoundedCornerShape(6.dp)).background(ink.copy(alpha = .08f)).padding(end = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(Modifier.width(3.dp).height(34.dp).background(if (friend) ChatColors.accent else ink.copy(alpha = .75f)))
                    Column(Modifier.padding(start = 7.dp, top = 3.dp, bottom = 3.dp)) {
                        Text(
                            if (ref.role == "assistant") char.name else ws.profile.displayName.ifBlank { "You" },
                            color = if (friend) ChatColors.accent else ink, fontSize = 11.sp, fontWeight = FontWeight.SemiBold,
                        )
                        Text(ref.excerpt, color = ink.copy(alpha = .8f), fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                }
            }
            Text(richChatText(entry.content, entry.links, onOpenMedia, if (friend) ChatColors.accent else ink), color = ink, fontSize = 15.sp)
            if (entry.snap) {
                // A snap is a tile, never the picture: tap to open while unopened, and
                // "Opened" after. That is the whole difference from a photo.
                Row(
                    Modifier.padding(top = 7.dp).clip(RoundedCornerShape(12.dp))
                        .background(ink.copy(alpha = if (entry.opened) .06f else .1f))
                        .then(if (entry.opened) Modifier else Modifier.clickable { onOpenSnap(entry) })
                        .padding(horizontal = 12.dp, vertical = 10.dp).widthIn(min = 170.dp),
                    verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Icon(
                        if (entry.opened) Icons.Filled.CheckBoxOutlineBlank else Icons.Filled.PhotoCamera, null,
                        tint = if (entry.opened) ink.copy(alpha = .5f) else ChatColors.accent, modifier = Modifier.size(26.dp),
                    )
                    Column {
                        Text(if (entry.opened) "Opened" else "Tap to view", color = ink.copy(alpha = if (entry.opened) .6f else 1f), fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        if (!entry.opened) Text("Snap from ${char.name}", color = ink.copy(alpha = .7f), fontSize = 11.sp)
                    }
                }
            } else {
            if (entry.imageId.isNotBlank()) {
                AsyncImage(
                    repo.chatImageUrl(entry.imageId),
                    "Image sent by ${if (friend) char.name else ws.profile.displayName.ifBlank { "you" }}",
                    imageLoader = repo.imageLoader,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.padding(top = 7.dp).width(260.dp).height(260.dp).clip(RoundedCornerShape(12.dp)),
                )
            }
            ChatAttachments(repo, char, entry.attachments, onOpenMedia)
            }
            ChatLinkChips(repo, entry.links, onOpenMedia)
            ChatActionCards(repo, entry.actions)
            // One stamp per run, at its foot, so a burst of four texts is marked once
            // instead of four times. The ticks are the same idea as everywhere else: the
            // message is in the log on the server, which is as delivered as it gets here.
            if (last) {
                Row(
                    Modifier.align(Alignment.End).padding(top = 3.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(3.dp),
                ) {
                    Text(timeOf(entry.at), color = ink.copy(alpha = .55f), fontSize = 10.sp)
                    if (!friend) Icon(Icons.Filled.DoneAll, null, tint = ink.copy(alpha = .55f), modifier = Modifier.size(13.dp))
                }
            }
        }
        // Reactions: emoji tucked into the bubble's lower corner, overlapping the edge.
        if (entry.reactions.isNotEmpty()) Row(
            Modifier.align(if (friend) Alignment.BottomEnd else Alignment.BottomStart).offset(y = 8.dp).padding(horizontal = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            entry.reactions.forEach { reaction ->
                Box(
                    Modifier.clip(CircleShape).background(ChatColors.side)
                        .then(if (friend && reaction.by == "user") Modifier.clickable { onReact(entry, reaction.emoji) } else Modifier)
                        .padding(horizontal = 6.dp, vertical = 2.dp),
                ) { Text(reaction.emoji, fontSize = 13.sp) }
            }
        }
        } // Box
        if (receipt.isNotBlank()) Text(
            receipt, color = if (receipt.startsWith("Read")) ChatColors.accent else ChatColors.muted, fontSize = 10.5.sp,
            modifier = Modifier.padding(top = if (entry.reactions.isNotEmpty()) 10.dp else 3.dp, end = 6.dp),
        )
        } // Column
    }
    } // Box
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
    LibbyActRequest(kind = kind, prompt = prompt, url = url, mediaId = mediaId, tags = tags, title = title)

/** Icon per action kind, falling back to a generic mark so a kind this build has never
    heard of still renders as a card the user can read and refuse. */
private fun actionIcon(kind: String) = when (kind) {
    "generate" -> Icons.Filled.AutoAwesome
    "import" -> Icons.Filled.Download
    "tag" -> Icons.Filled.Sell
    "favorite" -> Icons.Filled.Favorite
    "rename" -> Icons.Filled.EditNote
    else -> Icons.Filled.Bolt
}

/** What a completed action says. Specific where it can be: "Done" is true but tells
    the user nothing about where the thing went. */
private fun actionDone(kind: String) = when (kind) {
    "generate" -> "Made it — it's in your library."
    "import" -> "Added to your library."
    "tag" -> "Tags added."
    "favorite" -> "Favorited."
    "rename" -> "Renamed."
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
 * What a reply handed over.
 *
 * Deliberately not the chip a link gets. A link is an affordance attached to a name
 * she has already written into the sentence; this is the thing itself, arriving under
 * the message the way a picture does in any other chat app — because that is what
 * separates "you never finished the beach one" from actually giving it to you.
 *
 * A picture is drawn as the picture. Everything else — a video, a comic, a game — has
 * no single frame that is the item, so it gets its thumbnail, its title and its kind,
 * which is the most honest card for something you are about to open rather than look
 * at. Either way the tap is the same: the viewer, by id, via whoever mounted chat.
 */
@Composable
private fun ChatAttachments(
    repo: Repository,
    char: ChatCharacter,
    attachments: List<LibbyAttachment>,
    onOpenMedia: OpenMedia,
) {
    if (attachments.isEmpty()) return
    Column(Modifier.fillMaxWidth().padding(top = 7.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        attachments.forEach { item ->
            val picture = item.kind == "image" || item.kind == "gif"
            val label = if (item.self) "Photo of ${char.name}: ${item.title}" else "From your library: ${item.title}"
            if (picture) {
                Column(
                    Modifier.width(260.dp).clip(RoundedCornerShape(12.dp))
                        .background(ChatColors.input).clickable { onOpenMedia(item.id) },
                ) {
                    AsyncImage(
                        // The item itself rather than its thumbnail: this is the picture being
                        // shown, and a 256px preview of it is not what she sent.
                        repo.streamUrl(item.id), label, imageLoader = repo.imageLoader,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxWidth().height(260.dp),
                    )
                    // Her own face needs no caption — it is a photo in a conversation. An item
                    // out of the collection does: it is a thing that has a name, and the name
                    // is how the user knows which one they are being handed.
                    if (!item.self) Text(
                        item.title, color = ChatColors.text, fontSize = 12.sp, maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 7.dp),
                    )
                }
            } else {
                Row(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp))
                        .background(ChatColors.input).clickable { onOpenMedia(item.id) }.padding(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    if (item.hasThumb) AsyncImage(
                        repo.thumbUrl(item.id), label, imageLoader = repo.imageLoader,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.size(58.dp).clip(RoundedCornerShape(9.dp)),
                    ) else Box(
                        Modifier.size(58.dp).clip(RoundedCornerShape(9.dp)).background(ChatColors.side),
                        contentAlignment = Alignment.Center,
                    ) { Icon(linkIcon(item.kind), null, tint = ChatColors.muted, modifier = Modifier.size(24.dp)) }
                    Column(Modifier.weight(1f).padding(start = 11.dp, end = 6.dp)) {
                        Text(item.title, color = ChatColors.text, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                        Text("Tap to open · ${item.kind.replaceFirstChar(Char::uppercase)}", color = ChatColors.muted, fontSize = 11.sp, maxLines = 1)
                    }
                }
            }
        }
    }
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

/**
 * A message's text with its markup applied and, where the reply points at a library
 * item, the item's name tappable in the sentence.
 *
 * The server writes the real title into the prose in place of her tag and sends the
 * item alongside; the chip under the bubble is the "open it" affordance, and this is
 * the name itself reading as the link it is. Without it the title sat in the text as
 * plain words, which is what a pretend hyperlink looks like.
 */
private fun richChatText(
    text: String,
    links: List<LibbyLink> = emptyList(),
    onOpenMedia: OpenMedia? = null,
    linkColor: Color = Color.Unspecified,
): AnnotatedString = buildAnnotatedString {
    val regex = Regex("(\\*\\*[^*\\n]+\\*\\*|\\*[^*\\n]+\\*|\"[^\"\\n]+\")")
    val titles = links.filter { it.title.trim().length >= 3 }
    val titlePattern = titles.takeIf { it.isNotEmpty() && onOpenMedia != null }
        ?.let { Regex(it.joinToString("|") { link -> Regex.escape(link.title) }, RegexOption.IGNORE_CASE) }
    // Plain words, with each linked title inside them made tappable.
    fun words(part: String) {
        if (titlePattern == null) { append(part); return }
        var from = 0
        titlePattern.findAll(part).forEach { hit ->
            append(part.substring(from, hit.range.first))
            val link = titles.first { it.title.equals(hit.value, ignoreCase = true) }
            withLink(
                LinkAnnotation.Clickable(
                    tag = "media:${link.id}",
                    styles = TextLinkStyles(SpanStyle(color = linkColor, fontWeight = FontWeight.SemiBold, textDecoration = TextDecoration.Underline)),
                ) { onOpenMedia?.invoke(link.id) },
            ) { append(hit.value) }
            from = hit.range.last + 1
        }
        append(part.substring(from))
    }
    var at = 0
    regex.findAll(text).forEach { match ->
        words(text.substring(at, match.range.first)); val token = match.value
        when { token.startsWith("**") -> { pushStyle(SpanStyle(fontWeight = FontWeight.Bold, fontStyle = FontStyle.Italic)); words(token.drop(2).dropLast(2)); pop() }
            token.startsWith("*") -> { pushStyle(SpanStyle(fontStyle = FontStyle.Italic)); words(token.drop(1).dropLast(1)); pop() }
            else -> { pushStyle(SpanStyle(fontWeight = FontWeight.Medium)); words(token); pop() } }
        at = match.range.last + 1
    }
    words(text.substring(at))
}

/**
 * Her bust along the top of the conversation.
 *
 * The art is a cowboy shot — head to mid-thigh — so it is drawn at a fixed width and
 * cropped at the chest by the strip's height: head and shoulders, large, rather than the
 * whole figure shrunk into a hundred dp. It wears the conversation's mood and tier, shows
 * the typing art and a bubble of dots while a reply is on its way, and opening it is
 * the call, where all of her fits. Mirrors the web client's banner and stage.
 */
@Composable
private fun LibbyChatBanner(
    repo: Repository,
    char: ChatCharacter,
    conversation: ChatConversation,
    busy: Boolean,
    typing: Boolean,
    status: String,
    onOpenCall: () -> Unit,
) {
    val emotion = conversation.emotion.ifBlank { "neutral" }
    val tier = conversation.intensity.coerceIn(1, LibbyMeter.MAX)
    val activity = conversation.activity.ifBlank { if (typing) "typing" else "" }
    val accent = MaterialTheme.colorScheme.primary
    Box(
        Modifier.fillMaxWidth().height(124.dp).clipToBounds()
            .background(ChatColors.side)
            .background(Brush.radialGradient(listOf(accent.copy(alpha = .3f), Color.Transparent), center = Offset(Float.POSITIVE_INFINITY, 0f), radius = 900f))
            .clickable(onClick = onOpenCall),
    ) {
        LibbyPortrait(
            repo = repo, emotion = emotion, tier = tier, fallbackAsset = mascotAsset(emotion, tier), activity = activity,
            contentScale = ContentScale.FillWidth, alignment = Alignment.TopCenter,
            modifier = Modifier.align(Alignment.TopEnd).padding(end = 10.dp, top = 4.dp).width(156.dp).fillMaxHeight(),
        )
        if (typing) {
            Row(
                Modifier.align(Alignment.TopEnd).padding(end = 168.dp, top = 16.dp)
                    .clip(RoundedCornerShape(16.dp, 16.dp, 4.dp, 16.dp)).background(ChatColors.input)
                    .padding(horizontal = 11.dp, vertical = 9.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp),
            ) { repeat(3) { Box(Modifier.size(6.dp).clip(CircleShape).background(ChatColors.muted)) } }
        }
        Column(Modifier.align(Alignment.BottomStart).padding(start = 16.dp, bottom = 12.dp, end = 180.dp)) {
            Text(char.name, color = accent, fontWeight = FontWeight.Bold, fontSize = 16.sp, maxLines = 1)
            Text(
                (if (busy) "Typing…" else status) + " · " + emotion + (if (conversation.activity.isNotBlank()) ", ${conversation.activity}" else ""),
                color = ChatColors.muted, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis,
            )
        }
        Row(
            Modifier.align(Alignment.BottomEnd).padding(end = 10.dp, bottom = 8.dp)
                .clip(RoundedCornerShape(999.dp)).background(Color(0x59000000)).padding(horizontal = 9.dp, vertical = 3.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Icon(Icons.Filled.Videocam, null, tint = Color.White, modifier = Modifier.size(14.dp))
            Text("Call", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
        }
    }
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
