package net.fourbakers.oppailib.data

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.longOrNull

/*
 * Her turns, run on the server.
 *
 * A turn used to be one JSON reply this app then acted on: it split the text into
 * bubbles, kept her mood run and her list of sent pictures, and sent all of it back
 * next time. The server does all of that now (backend/internal/api/libby_turn.go) and
 * streams what happens as Server-Sent Events: her texts as they are written, the
 * camera's progress, her state settling. This file is the reading of that stream and
 * the shapes it carries; ChatScreen folds the events into the conversation.
 */

/** One turn. Only your new texts go up; the server reads the rest of the conversation. */
@Serializable
data class LibbyTurnRequest(
    val conversationId: String,
    /** A conversation this phone created and has not saved yet. */
    val conversation: ConversationShell? = null,
    val messages: List<StoredChatMessage> = emptyList(),
    /** Take her last reply back and answer again. */
    val redo: Boolean = false,
    /** Drop everything after this message of yours, then answer it. */
    val truncateAfter: String = "",
    val nudge: String = "",
    /** "autonomous" for her speaking first, "afterglow" for the morning after. */
    val task: String = "",
    val call: Boolean = false,
    val outfit: String = "",
    val sharedMediaIds: List<Long> = emptyList(),
)

@Serializable
data class ConversationShell(val characterId: String, val title: String, val mode: String)

/** A scene she planned and is playing through, a beat at a time. */
@Serializable
data class LibbyScene(val title: String = "", val beats: List<String> = emptyList(), val beat: Int = 0)

/** The state a turn settles her in, and the bubble it is stamped on. */
@Serializable
data class TurnState(
    val emotion: String = "",
    val intensity: Int = 0,
    val activity: String = "",
    val background: String = "",
    val wearing: String = "",
    val scene: LibbyScene? = null,
    val messageId: String = "",
    val rev: Long = 0,
)

/** A story she posted while you were away: one picture and a line, for a day. */
@Serializable
data class LibbyStory(
    val id: String,
    val imageId: String,
    val caption: String = "",
    val at: Long = 0,
    val seen: Boolean = false,
)

@Serializable
data class LibbyStories(val stories: List<LibbyStory> = emptyList(), val unseen: Int = 0, val enabled: Boolean = false)

@Serializable
data class RateRequest(val rating: String)

@Serializable
data class RateResponse(val image: ChatImage, val sendWeights: JsonObject = JsonObject(emptyMap()))

@Serializable
data class KeepResponse(val id: Long = 0)

/** One event off the stream: its name, and its data as a JSON object. */
data class TurnEvent(val event: String, val data: JsonObject) {
    fun string(key: String): String = runCatching { data[key]?.jsonPrimitive?.content }.getOrNull().orEmpty()
    fun long(key: String): Long = runCatching { data[key]?.jsonPrimitive?.longOrNull }.getOrNull() ?: 0L
}

/**
 * Reads a text/event-stream line by line. A blank line ends an event; "event:" names
 * it, "data:" lines carry it, and a line starting ":" is a comment (the server's
 * keepalive). Returns the finished event, or null while one is still being read.
 */
class EventStreamParser {
    private var event = "message"
    private val data = StringBuilder()

    fun line(raw: String): Pair<String, String>? {
        val line = raw.removeSuffix("\r")
        if (line.isEmpty()) {
            if (data.isEmpty()) { event = "message"; return null }
            val out = event to data.toString()
            data.clear(); event = "message"
            return out
        }
        if (line.startsWith(":")) return null
        val colon = line.indexOf(':')
        val field = if (colon < 0) line else line.substring(0, colon)
        val value = if (colon < 0) "" else line.substring(colon + 1).removePrefix(" ")
        when (field) {
            "event" -> event = value
            "data" -> { if (data.isNotEmpty()) data.append('\n'); data.append(value) }
        }
        return null
    }
}

/** The pictures a message carries: a set, or the one. */
fun StoredChatMessage.pictures(): List<String> = images.ifEmpty { listOfNotNull(imageId.ifBlank { null }) }

/** Whether a message's text is only the placeholder a picture or card carries when she
    sent it without a word — drawn as the thing itself, not as a line above it. */
fun isStageDirection(content: String): Boolean =
    Regex("""^\*(?:sends|hands over|offers)\b[^*]*\*$""").matches(content.trim())

/** Puts messages into a log by id — replacing a copy already there, or inserting in
    time order. The server resends a message it amended, so arriving twice is normal. */
fun upsertMessages(log: List<StoredChatMessage>, incoming: List<StoredChatMessage>): List<StoredChatMessage> {
    if (incoming.isEmpty()) return log
    val out = log.toMutableList()
    for (m in incoming) {
        val at = out.indexOfFirst { it.id == m.id }
        if (at >= 0) out[at] = m
        else {
            var i = out.size
            while (i > 0 && out[i - 1].at > m.at) i--
            out.add(i, m)
        }
    }
    return out
}

/** Your texts since her last message — what a turn sends. The server ignores any it has. */
fun unsentMessages(log: List<StoredChatMessage>): List<StoredChatMessage> {
    var i = log.size
    while (i > 0 && log[i - 1].role == "user") i--
    return log.drop(i)
}

/** Words for the camera's phase. */
fun cameraPhaseLabel(phase: String, shots: Int): String = when (phase) {
    "judging" -> "Picking the best one…"
    "retaking" -> "Not happy with it — retaking…"
    "saving" -> "Sending…"
    "animating" -> "Making the clip…"
    "making the room" -> "Going somewhere new…"
    else -> if (shots > 1) "Taking $shots shots…" else "Taking the picture…"
}
