package net.fourbakers.oppailib.data

import kotlinx.serialization.EncodeDefault
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject

/*
 * The shapes behind WebApi. Field names are the server's JSON names; defaults stand in for
 * anything the server leaves out, and Repository's lenient Json turns a Go nil slice's
 * `null` into the default rather than a parse failure.
 */

@Serializable
data class LibraryStats(
    val total: Long = 0,
    val byKind: Map<String, Long> = emptyMap(),
    val favorites: Long = 0,
    val thisWeek: Long = 0,
    val bytes: Long = 0,
)

@Serializable
data class TagCount(val name: String, val count: Long = 0)

@Serializable
data class TagCounts(val items: List<TagCount> = emptyList())

@Serializable
data class SuggestedMedia(val items: List<Media> = emptyList(), val because: List<String> = emptyList())

@Serializable
data class MediaProgress(
    val mediaId: Long = 0,
    /** Seconds into a video, or the page of a comic. */
    val position: Double = 0.0,
    val duration: Double = 0.0,
    val updatedAt: Long = 0,
)

@Serializable
data class ResumeShelf(val items: List<Media> = emptyList(), val progress: List<MediaProgress> = emptyList())

@Serializable
data class ProgressRequest(val position: Double)

@Serializable
data class Bookmark(
    val id: Long,
    val mediaId: Long = 0,
    val position: Double = 0.0,
    val label: String = "",
    val hasThumb: Boolean = false,
    val createdAt: Long = 0,
    val title: String? = null,
    val kind: String? = null,
)

@Serializable
data class Bookmarks(val bookmarks: List<Bookmark> = emptyList())

@Serializable
data class BookmarkRequest(val position: Double = 0.0, val label: String = "")

/** A named, ordered list of items. [cover] is the first item's id, or 0 when empty. */
@Serializable
data class MediaCollection(
    val id: Long,
    val name: String = "",
    val count: Int = 0,
    val cover: Long = 0,
    val createdAt: Long = 0,
)

@Serializable
data class Collections(val items: List<MediaCollection> = emptyList())

@Serializable
data class CollectionName(val name: String)

@Serializable
data class CollectionMediaIds(val mediaIds: List<Long>)

@Serializable
data class CollectionAdded(val added: Int = 0)

@Serializable
data class CollectionItems(
    val collection: MediaCollection? = null,
    val items: List<Media> = emptyList(),
    val total: Int = 0,
)

@Serializable
data class MediaGeneration(
    val id: Long = 0,
    val kind: String = "",
    val title: String = "",
    val prompt: String = "",
    val tags: List<String> = emptyList(),
    /** The studio's record of the run, as the server kept it. */
    val info: JsonObject? = null,
)

@Serializable
data class GpuApp(
    /** "chat", "images" or "video". */
    val id: String,
    val name: String = "",
    val set: Boolean = false,
    val holding: Boolean = false,
    val detail: String = "",
    val canTake: Boolean = false,
)

@Serializable
data class GpuState(
    val apps: List<GpuApp> = emptyList(),
    val holder: String = "",
    val busy: String? = null,
    val vramTotal: Long? = null,
    val vramFree: Long? = null,
)

@Serializable
data class GpuSwitchRequest(val to: String)

@Serializable
data class GpuSwitchResult(val state: GpuState = GpuState(), val problems: List<String> = emptyList())

@Serializable
data class AiTool(
    val id: String,
    val name: String = "",
    val set: Boolean = false,
    /** "self", "docker", or "" when nothing can restart it (then [detail] says why). */
    val how: String = "",
    val container: String? = null,
    val detail: String = "",
)

@Serializable
data class AiRestartState(val tools: List<AiTool> = emptyList(), val docker: Boolean = false)

@Serializable
data class AiRestartResult(val how: String = "", val message: String = "", val container: String? = null)

// ── chat ─────────────────────────────────────────────────────────────────────

@Serializable
data class ChatStopped(val stopped: Boolean = false)

@Serializable
data class TokenCountRequest(val text: String)

@Serializable
data class TokenCount(val tokens: Int = 0, val exact: Boolean = false)

/** What compressing sends: who it is with, the notes so far, and the older messages. */
@Serializable
data class CompressRequest(val characterId: String, val summary: String? = null, val messages: List<RoleContent>)

@Serializable
data class RoleContent(val role: String, val content: String)

@Serializable
data class CompressResult(val summary: String = "")

/**
 * When she may speak first. The PUT replaces the whole of it, so every field is written
 * even when it equals its default (EncodeDefault): Repository's Json leaves defaults
 * out, and a missing field would reach the server as Go's zero — quiet hours from
 * midnight to midnight, no gap, the feature off. Defaults are the server's own.
 */
@OptIn(ExperimentalSerializationApi::class)
@Serializable
data class LibbyAutoSettings(
    /** The complete off switch. */
    @EncodeDefault val enabled: Boolean = true,
    /** Local hours she leaves you alone between; from > to wraps midnight. */
    @EncodeDefault val quietFrom: Int = 1,
    @EncodeDefault val quietTo: Int = 9,
    @EncodeDefault val minGapMinutes: Int = 30,
    /** Conversations she may start in a day; 0 for no cap. */
    @EncodeDefault val maxPerDay: Int = 6,
    @EncodeDefault val allowImportant: Boolean = true,
)

@Serializable
data class LibbyAutoEvent(val at: Long = 0, val trigger: String = "", val importance: Double = 0.0, val detail: String = "", val answered: Boolean = false)

@Serializable
data class LibbyAutoDecision(
    val allow: Boolean = false,
    /** Always written for a person to read. */
    val reason: String = "",
    val retryAfterSec: Long = 0,
    val trigger: String = "",
    val importance: Double = 0.0,
)

@Serializable
data class LibbyAutoState(
    val settings: LibbyAutoSettings = LibbyAutoSettings(),
    val unanswered: Int = 0,
    val lastAutoAt: Long = 0,
    val sentToday: Int = 0,
    val log: List<LibbyAutoEvent> = emptyList(),
    val idle: LibbyAutoDecision = LibbyAutoDecision(),
)

@Serializable
data class LibbyAutoSaved(val settings: LibbyAutoSettings = LibbyAutoSettings())

@Serializable
data class AutoTrigger(val trigger: String, val detail: String? = null)

@Serializable
data class LibbyPendingTrigger(val trigger: String = "", val detail: String = "", val decision: LibbyAutoDecision = LibbyAutoDecision())

@Serializable
data class LibbyAutoPending(val pending: List<LibbyPendingTrigger> = emptyList())

@Serializable
data class LibbyWant(val id: String, val text: String = "", val at: Long = 0)

@Serializable
data class LibbyWants(val wants: List<LibbyWant> = emptyList())

@Serializable
data class LibbyJournalEntry(val id: String, val conversationId: String = "", val text: String = "", val mood: String = "", val at: Long = 0)

@Serializable
data class LibbyJournal(val entries: List<LibbyJournalEntry> = emptyList())

@Serializable
data class LibbyReflection(val entry: LibbyJournalEntry? = null, val message: String = "")

/** Where the two of you left off: her mood, her heat, how close you are, your petname. */
@Serializable
data class LibbyBond(
    val lastSeenAt: Long = 0,
    val mood: String = "",
    val heat: Double = 0.0,
    val heatNow: Double = 0.0,
    /** Closeness, 0 to 1, grown slowly across days talked. */
    val warmth: Double = 0.0,
    val petname: String = "",
    val updatedAt: Long = 0,
)

@Serializable
data class LibbySticker(
    val id: String,
    val label: String = "",
    val tags: List<String> = emptyList(),
    val mime: String = "",
    val size: Long = 0,
    val sent: Int = 0,
    val createdAt: Long = 0,
)

@Serializable
data class LibbyStickers(val items: List<LibbySticker> = emptyList())

@Serializable
data class StickerPatch(val label: String? = null, val tags: List<String>? = null)

@Serializable
data class DiscordChannel(val guildId: String = "", val guildName: String = "", val channelId: String = "", val name: String = "", val read: Boolean = false, val write: Boolean = false)

@Serializable
data class DiscordEvent(val at: Long = 0, val kind: String = "", val channel: String = "", val user: String = "", val detail: String = "")

@Serializable
data class DiscordState(
    val enabled: Boolean = false,
    val connected: Boolean = false,
    val botName: String = "",
    val hasToken: Boolean = false,
    val users: List<String> = emptyList(),
    val channels: List<DiscordChannel> = emptyList(),
    /** "shared" or "none". */
    val memory: String = "shared",
    val pollSeconds: Int = 0,
    val perHour: Int = 0,
    val log: List<DiscordEvent> = emptyList(),
    /** The connection's condition in a sentence. */
    val note: String = "",
)

@Serializable
data class DiscordToken(val token: String)

@Serializable
data class DiscordPatch(val enabled: Boolean? = null, val memory: String? = null)

// ── the Sprites board ────────────────────────────────────────────────────────

/** One square the studio has drawn into a wardrobe, without its picture. */
@Serializable
data class LibbyWipSquare(
    val emotion: String,
    val level: Int = 0,
    val filename: String = "",
    val seed: Long = 0,
    val reviewed: Boolean = false,
    val config: String = "",
    /** The studio's generation record, kept as it wrote it. */
    val info: JsonObject? = null,
    val updatedAt: Long = 0,
)

@Serializable
data class LibbyWipSquares(val squares: List<LibbyWipSquare> = emptyList())

/** Files one square. The server writes the whole envelope on every call, so a redo
 *  never inherits the review of the take it replaced; everything read is sent back. */
@OptIn(ExperimentalSerializationApi::class)
@Serializable
data class PutWipRequest(
    val imageData: String,
    @EncodeDefault val filename: String = "",
    @EncodeDefault val seed: Long = 0,
    @EncodeDefault val reviewed: Boolean = false,
    @EncodeDefault val config: String = "",
    val info: JsonObject? = null,
)

@Serializable
data class SquareWordsChange(val face: String? = null, val pose: String? = null, val prose: String? = null)

@Serializable
data class SpriteWords(val words: Map<String, SquareWordsChange> = emptyMap())

@Serializable
data class SpriteLora(val name: String, val weight: Double = 1.0)

/** A generate request for one square: what GenerateRequest carries, out of the gallery. */
@OptIn(ExperimentalSerializationApi::class)
@Serializable
data class SpriteGenerateRequest(
    val jobId: String,
    val prompt: String,
    val negativePrompt: String = "",
    val checkpoint: String = "",
    val vae: String = "",
    val sampler: String = "",
    @EncodeDefault val steps: Int = 25,
    @EncodeDefault val width: Int = 832,
    @EncodeDefault val height: Int = 1216,
    @EncodeDefault val cfgScale: Double = 6.0,
    val clipSkip: Int = 0,
    @EncodeDefault val seed: Long = -1,
    @EncodeDefault val count: Int = 1,
    @EncodeDefault val board: String = "none",
    val loras: List<SpriteLora> = emptyList(),
    @EncodeDefault val noGallery: Boolean = true,
)

// ── settings ─────────────────────────────────────────────────────────────────

/** A key handed to another program: an MCP client, the desktop launcher. */
@Serializable
data class AccessKey(val id: Long, val name: String = "", val hint: String = "", val createdAt: Long = 0, val lastUsedAt: Long = 0)

@Serializable
data class AccessKeys(val items: List<AccessKey> = emptyList())

@Serializable
data class McpKeys(val items: List<AccessKey> = emptyList(), val tools: List<String> = emptyList())

@Serializable
data class NewKey(val key: String = "", val id: Long = 0, val name: String = "")

@Serializable
data class LaunchyPairing(val code: String = "", val expiresAt: Long = 0)

@Serializable
data class Passkey(val id: Long, val name: String = "", val synced: Boolean = false, val transports: String = "", val createdAt: Long = 0, val lastUsedAt: Long = 0)

@Serializable
data class Passkeys(val passkeys: List<Passkey> = emptyList())

@Serializable
data class PasswordConfirm(val password: String)
