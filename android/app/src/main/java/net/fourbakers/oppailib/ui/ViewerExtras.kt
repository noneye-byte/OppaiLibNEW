package net.fourbakers.oppailib.ui

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BookmarkAdd
import androidx.compose.material.icons.filled.Bookmarks
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.media3.common.C
import androidx.media3.exoplayer.ExoPlayer
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import net.fourbakers.oppailib.data.Bookmark
import net.fourbakers.oppailib.data.BookmarkRequest
import net.fourbakers.oppailib.data.MediaGeneration
import net.fourbakers.oppailib.data.ProgressRequest
import net.fourbakers.oppailib.data.Repository
import net.fourbakers.oppailib.data.serverMessage

/*
 * The viewer's memory, shared with the web through the server: where you were in a
 * video or a comic (resume), and the moments you marked in a video (bookmarks).
 *
 * The phone kept a comic's page to itself and had no memory of a video at all, so a
 * film started on the sofa began again in bed. The web's numbers (viewer.ts) are kept:
 * a video reports in every ten seconds, the first fifteen are not a position, and past
 * 97% it is finished — the server's own finish line for the resume shelf.
 */

private const val PROGRESS_INTERVAL_MS = 10_000L
private const val PROGRESS_FLOOR_S = 15.0
private const val PROGRESS_DONE = 0.97

/** Whether [position] seconds into [duration] is somewhere worth coming back to. */
internal fun isResumable(position: Double, duration: Double): Boolean =
    position >= PROGRESS_FLOOR_S && !(duration > 0 && position > duration * PROGRESS_DONE)

/**
 * Seeks a freshly made player to where it should start — [startAt] when a moment was
 * asked for, else the saved position — and reports where it is while it plays, and once
 * more when it goes.
 */
@Composable
internal fun VideoResume(repo: Repository, player: ExoPlayer, mediaId: Long, startAt: Double) {
    val start by rememberUpdatedState(startAt)
    LaunchedEffect(player) {
        // The duration is only known once the source has been read.
        var waited = 0
        while (player.duration == C.TIME_UNSET && waited < 100) { delay(100); waited++ }
        if (start > 0) {
            player.seekTo((start * 1000).toLong())
            return@LaunchedEffect
        }
        val saved = runCatching { repo.web.progress(mediaId) }.getOrNull() ?: return@LaunchedEffect
        val duration = if (player.duration > 0) player.duration / 1000.0 else saved.duration
        if (isResumable(saved.position, duration)) {
            player.seekTo((saved.position * 1000).toLong())
            repo.report("Picking up where you left off.", "happy")
        }
    }
    LaunchedEffect(player) {
        var last = -1L
        while (true) {
            delay(PROGRESS_INTERVAL_MS)
            if (!player.isPlaying) continue
            val pos = player.currentPosition
            if (pos == last) continue
            last = pos
            save(repo, mediaId, pos / 1000.0, player.duration.takeIf { it > 0 }?.div(1000.0) ?: 0.0)
        }
    }
    DisposableEffect(player) {
        onDispose {
            // The last word on the way out. The player is released by its owner right
            // after this, so the numbers are read now and sent from outside composition.
            val pos = runCatching { player.currentPosition / 1000.0 }.getOrDefault(0.0)
            val dur = runCatching { player.duration.takeIf { it > 0 }?.div(1000.0) ?: 0.0 }.getOrDefault(0.0)
            if (pos > 0) {
                @Suppress("OPT_IN_USAGE")
                GlobalScope.launch { save(repo, mediaId, pos, dur) }
            }
        }
    }
}

private suspend fun save(repo: Repository, id: Long, position: Double, duration: Double) {
    runCatching {
        if (isResumable(position, duration)) repo.web.setProgress(id, ProgressRequest(position))
        else repo.web.clearProgress(id)
    }
}

/**
 * The marked moments of the open video, as a row of times above its controls: a tap goes
 * there, holding one takes it away, and the bookmark at the end marks where it is now.
 */
@OptIn(ExperimentalFoundationApi::class)
@Composable
internal fun VideoMoments(repo: Repository, player: ExoPlayer, mediaId: Long, onInteract: () -> Unit) {
    var marks by remember(mediaId) { mutableStateOf<List<Bookmark>>(emptyList()) }
    var adding by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    LaunchedEffect(mediaId) {
        marks = runCatching { repo.web.bookmarks(mediaId).bookmarks }.getOrDefault(emptyList())
    }
    Row(
        Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(horizontal = 12.dp, vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(
            Modifier.clip(RoundedCornerShape(999.dp)).background(Color(0x33FFFFFF))
                .combinedClickable(enabled = !adding, onClick = {
                    onInteract()
                    adding = true
                    val at = player.currentPosition / 1000.0
                    scope.launch {
                        runCatching { repo.web.addBookmark(mediaId, BookmarkRequest(position = at)) }
                            .onSuccess { b -> marks = (marks + b).sortedBy { it.position }; repo.report("Marked ${clockLabel(at)}.", "happy") }
                            .onFailure { repo.report(it.serverMessage("Couldn't mark that moment.")) }
                        adding = false
                    }
                }).padding(horizontal = 10.dp, vertical = 5.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (adding) CircularProgressIndicator(Modifier.size(14.dp), color = Color.White, strokeWidth = 2.dp)
            else Icon(Icons.Filled.BookmarkAdd, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
            Spacer(Modifier.width(5.dp))
            Text("Mark", style = MaterialTheme.typography.labelMedium, color = Color.White)
        }
        marks.forEach { mark ->
            Row(
                Modifier.clip(RoundedCornerShape(999.dp)).background(Color(0x1FFFFFFF))
                    .combinedClickable(
                        onClick = { onInteract(); player.seekTo((mark.position * 1000).toLong()) },
                        onLongClick = {
                            scope.launch {
                                runCatching { repo.web.deleteBookmark(mark.id) }
                                    .onSuccess { marks = marks.filterNot { it.id == mark.id }; repo.report("Took that mark away.", "neutral") }
                            }
                        },
                    ).padding(horizontal = 10.dp, vertical = 5.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Filled.Bookmarks, contentDescription = null, tint = Color.White.copy(alpha = 0.8f), modifier = Modifier.size(14.dp))
                Spacer(Modifier.width(5.dp))
                Text(
                    clockLabel(mark.position) + if (mark.label.isNotBlank()) " · ${mark.label}" else "",
                    style = MaterialTheme.typography.labelMedium,
                    color = Color.White,
                    maxLines = 1,
                )
            }
        }
    }
}

/** A comic's page, read from the server once and written back as it is turned. */
internal suspend fun savedComicPage(repo: Repository, id: Long): Int? =
    runCatching { repo.web.progress(id).position.toInt() }.getOrNull()?.takeIf { it >= 1 }

internal suspend fun saveComicPage(repo: Repository, id: Long, page: Int) {
    runCatching { repo.web.setProgress(id, ProgressRequest(page.toDouble())) }
}

/**
 * "How it was made": the recipe a studio picture was saved with — its prompt, the model
 * and settings, the LoRAs — read from the server, where it is kept encrypted with the
 * picture. Selectable, with the prompt a tap from the clipboard.
 */
@Composable
internal fun GenerationDialog(repo: Repository, mediaId: Long, onDismiss: () -> Unit) {
    var gen by remember { mutableStateOf<MediaGeneration?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    val context = LocalContext.current
    LaunchedEffect(mediaId) {
        runCatching { repo.web.mediaGeneration(mediaId) }
            .onSuccess { gen = it }
            .onFailure { error = it.serverMessage("Nothing says how this one was made.") }
    }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("How it was made") },
        text = {
            val g = gen
            when {
                error != null -> Text(error ?: "")
                g == null -> CircularProgressIndicator()
                else -> SelectionContainer {
                    Column(Modifier.heightIn(max = 460.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        val prompt = g.prompt.ifBlank { g.info?.string("prompt").orEmpty() }
                        if (prompt.isNotBlank()) Fact("Prompt", prompt, mono = true)
                        g.info?.string("negativePrompt", "negative", "negative_prompt")?.takeIf { it.isNotBlank() }?.let { Fact("Negative", it, mono = true) }
                        recipeFacts(g.info).forEach { (k, v) -> Fact(k, v) }
                        if (g.tags.isNotEmpty()) Fact("Tags", g.tags.joinToString(", "))
                        if (prompt.isBlank() && g.info == null) Text("This picture was saved without its recipe.")
                    }
                }
            }
        },
        confirmButton = { TextButton(onClick = onDismiss) { Text("Done") } },
        dismissButton = {
            val prompt = gen?.prompt?.ifBlank { gen?.info?.string("prompt") }
            if (!prompt.isNullOrBlank()) TextButton(onClick = {
                (context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager).setPrimaryClip(ClipData.newPlainText("prompt", prompt))
                repo.report("Prompt copied.", "happy")
            }) { Text("Copy prompt") }
        },
    )
}

@Composable
private fun Fact(label: String, value: String, mono: Boolean = false) {
    Column {
        Kicker(label)
        Text(
            value,
            style = MaterialTheme.typography.bodySmall.copy(fontFamily = if (mono) FontFamily.Monospace else FontFamily.Default, fontWeight = FontWeight.Normal),
        )
    }
}

private fun JsonObject.string(vararg keys: String): String? = keys.firstNotNullOfOrNull { k -> (this[k] as? JsonPrimitive)?.contentOrNull }

/** The settings worth reading out of a stored GenInfo, in the order the web lists them. */
internal fun recipeFacts(info: JsonObject?): List<Pair<String, String>> {
    if (info == null) return emptyList()
    val out = mutableListOf<Pair<String, String>>()
    fun add(label: String, vararg keys: String) {
        info.string(*keys)?.takeIf { it.isNotBlank() && it != "0" }?.let { out += label to it }
    }
    add("Model", "model", "checkpoint", "model_name")
    add("VAE", "vae")
    add("Sampler", "sampler", "sampler_name")
    add("Scheduler", "scheduler")
    add("Steps", "steps")
    add("CFG", "cfgScale", "cfg", "cfg_scale")
    add("Seed", "seed")
    val w = info.string("width"); val h = info.string("height")
    if (w != null && h != null) out += "Size" to "$w×$h"
    add("Clip skip", "clipSkip", "clip_skip")
    add("Denoise", "denoise", "denoising_strength")
    for ((label, key) in listOf("Characters" to "characters", "Poses" to "poses", "Trigger words" to "triggers")) {
        (info[key] as? JsonArray)?.mapNotNull { (it as? JsonPrimitive)?.contentOrNull }?.takeIf { it.isNotEmpty() }?.let { out += label to it.joinToString(", ") }
    }
    (info["loras"] as? JsonArray)?.mapNotNull { e -> loraLine(e) }?.takeIf { it.isNotEmpty() }?.let { out += "LoRAs" to it.joinToString("\n") }
    return out
}

private fun loraLine(e: JsonElement): String? = when (e) {
    is JsonPrimitive -> e.contentOrNull
    is JsonObject -> {
        val name = e.string("name", "alias", "model") ?: return null
        val w = e.string("weight", "strength")
        if (w != null) "$name · $w" else name
    }
    else -> null
}
