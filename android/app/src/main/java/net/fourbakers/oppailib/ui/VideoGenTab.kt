package net.fourbakers.oppailib.ui

import android.net.Uri
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddPhotoAlternate
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Loop
import androidx.compose.material.icons.filled.Movie
import androidx.compose.material.icons.filled.Save
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.ui.PlayerView
import coil.compose.AsyncImage
import kotlinx.coroutines.delay
import net.fourbakers.oppailib.data.GenClip
import net.fourbakers.oppailib.data.ImageGenStatus
import net.fourbakers.oppailib.data.MotionPresets
import net.fourbakers.oppailib.data.Repository
import net.fourbakers.oppailib.data.VideoSession

/**
 * The Video tab: a few seconds of video from a picture or from words, through the
 * ComfyUI set up in Settings → Image generation → Video. A picture comes from the
 * Gallery tab's Animate, or from the phone. The run is [VideoSession]'s, so the tab
 * can be left while a clip renders; finished clips play here and are kept in the
 * gallery beside the pictures (on Automatic1111, whose gallery is the server's).
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun VideoGenTab(repo: Repository, status: ImageGenStatus, board: String, onKept: () -> Unit) {
    val s by VideoSession.state.collectAsState()
    val context = LocalContext.current
    val image = status.clips.image
    val text = status.clips.text
    val workflow = if (s.from == "image") image else text
    val loopable = s.from == "image" && workflow?.takes?.contains("loop") == true && VideoSession.canLoop(workflow.models)
    val phonePicker = rememberSystemPickerLauncher(ActivityResultContracts.GetContent()) { uri: Uri? ->
        if (uri != null) VideoSession.pickFromPhone(context, uri)
    }
    // A direction that is not set up is not offered; start on the one that is.
    LaunchedEffect(image != null, text != null) {
        if (s.from == "image" && image == null && text != null) VideoSession.update { it.copy(from = "text") }
    }
    LaunchedEffect(s.finished) { if (s.finished > 0) onKept() }

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 14.dp, vertical = 10.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterChip(selected = s.from == "image", enabled = image != null,
                onClick = { VideoSession.update { it.copy(from = "image") } }, label = { Text("From a picture") })
            FilterChip(selected = s.from == "text", enabled = text != null,
                onClick = { VideoSession.update { it.copy(from = "text") } }, label = { Text("From words") })
        }

        if (s.from == "image") {
            StartPicture(repo, s.picture, s.reading, onChoose = { phonePicker.launch("image/*") },
                onClear = { VideoSession.update { it.copy(picture = null) } })
        }

        OutlinedTextField(
            value = s.prompt,
            onValueChange = { v -> VideoSession.update { it.copy(prompt = v) } },
            label = { Text(if (s.from == "image") "What happens" else "What it shows") },
            placeholder = {
                Text(if (s.from == "image") "She turns to the camera, smiles and waves"
                else "A woman with silver hair in a red dress turns to the camera and waves")
            },
            minLines = 3,
            modifier = Modifier.fillMaxWidth(),
        )

        if (s.from == "image") {
            val on = MotionPresets.isShowcase(s.prompt)
            Surface(
                onClick = {
                    VideoSession.update { cur ->
                        cur.copy(prompt = MotionPresets.toggleShowcase(cur.prompt), loop = if (!on && loopable) true else cur.loop)
                    }
                },
                shape = RoundedCornerShape(12.dp),
                color = if (on) MaterialTheme.colorScheme.primaryContainer else Color.Transparent,
                border = if (on) null else BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Icon(Icons.Filled.AutoAwesome, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    Column {
                        Text("Showcase", fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.bodyMedium)
                        Text(
                            "She stays put and comes alive: blinks, breathes, her hair flows and her clothes move, " +
                                "the camera holds still${if (loopable) " — and it loops" else ""}.",
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                }
            }
        }

        for (group in listOf("camera", "her", "scene")) {
            Text(
                when (group) { "camera" -> "Camera"; "her" -> "Her"; else -> "Scene" },
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                MotionPresets.all.filter { it.group == group }.forEach { p ->
                    FilterChip(
                        selected = MotionPresets.has(s.prompt, p.phrase),
                        onClick = { VideoSession.update { it.copy(prompt = MotionPresets.toggle(it.prompt, p.phrase)) } },
                        label = { Text(p.label) },
                    )
                }
            }
        }

        if (s.from == "text") {
            Text("Shape", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                listOf("portrait" to "Portrait", "square" to "Square", "landscape" to "Landscape").forEach { (id, label) ->
                    FilterChip(selected = s.aspect == id, onClick = { VideoSession.update { it.copy(aspect = id) } }, label = { Text(label) })
                }
            }
        }

        Text(
            "Length · ${"%.1f".format(s.seconds)}s · ${VideoSession.clipFrames(s.seconds)} frames",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Slider(
            value = s.seconds,
            onValueChange = { v -> VideoSession.update { it.copy(seconds = (v * 2).toInt() / 2f) } },
            valueRange = 1f..10f,
        )

        if (s.from == "image" && workflow?.takes?.contains("loop") == true) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Switch(checked = s.loop && loopable, enabled = loopable, onCheckedChange = { v -> VideoSession.update { it.copy(loop = v) } })
                Icon(Icons.Filled.Loop, contentDescription = null, modifier = Modifier.size(18.dp))
                Column {
                    Text("Seamless loop", style = MaterialTheme.typography.bodyMedium)
                    Text(
                        if (loopable) "Ends on the picture it starts from, so it plays round"
                        else "Wan 2.2's 5B model can't be given a last frame, so it can't loop",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }

        if (workflow?.needsModel == true) {
            Text(
                "There's no video model for this yet. Pick one in the web studio's Video tab, or under Settings → Image generation → Video.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.error,
            )
        }
        if (s.error.isNotEmpty()) {
            Text(s.error, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
        }
        Button(
            onClick = { VideoSession.make(repo, board, loopable) },
            enabled = workflow != null && workflow.needsModel != true && !s.reading && (s.from == "text" || s.picture != null),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Icon(Icons.Filled.Movie, contentDescription = null, modifier = Modifier.size(18.dp))
            Text("  Make the clip")
        }
        Text(
            "A clip takes minutes. It carries on if you leave this tab, and lands in the gallery when it's done.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        s.runs.forEach { run -> RunCard(repo, run) }
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun StartPicture(repo: Repository, pic: VideoSession.Picture?, reading: Boolean, onChoose: () -> Unit, onClear: () -> Unit) {
    Box(
        Modifier
            .fillMaxWidth()
            .heightIn(min = 120.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .clickable(onClick = onChoose),
        contentAlignment = Alignment.Center,
    ) {
        when {
            reading -> LinearProgressIndicator(Modifier.padding(24.dp).fillMaxWidth())
            pic == null -> Column(Modifier.padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(Icons.Filled.AddPhotoAlternate, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(
                    "Choose a picture from the phone, or press Animate on one in the Gallery tab.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 6.dp),
                )
            }
            else -> {
                AsyncImage(
                    model = if (pic.gallery.isNotEmpty()) repo.galleryFullUrl(pic.gallery) else pic.uri,
                    imageLoader = repo.imageLoader,
                    contentDescription = "The picture the clip starts from",
                    contentScale = ContentScale.Fit,
                    modifier = Modifier.fillMaxWidth().heightIn(max = 280.dp),
                )
                IconButton(onClick = onClear, modifier = Modifier.align(Alignment.TopEnd)) {
                    Icon(Icons.Filled.Close, contentDescription = "Let the picture go", tint = Color.White)
                }
            }
        }
    }
}

@Composable
private fun RunCard(repo: Repository, run: VideoSession.Run) {
    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(MaterialTheme.colorScheme.surfaceContainer).padding(10.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        val clip = run.clip
        when {
            clip != null -> {
                ClipPlayer(repo, clip, Modifier.fillMaxWidth().aspectRatio(if (clip.width > 0 && clip.height > 0) clip.width.toFloat() / clip.height else 9f / 16f))
                if (clip.recipe.isNotEmpty()) {
                    Text(clip.recipe, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Button(onClick = { VideoSession.save(repo, run) }, enabled = !run.saved) {
                        Icon(if (run.saved) Icons.Filled.Check else Icons.Filled.Save, contentDescription = null, modifier = Modifier.size(16.dp))
                        Text(if (run.saved) "  In library" else "  Save to library")
                    }
                    OutlinedButton(onClick = { VideoSession.dismiss(run) }) { Text("Dismiss") }
                }
            }
            run.error.isNotEmpty() -> {
                Text(run.error, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                OutlinedButton(onClick = { VideoSession.dismiss(run) }) { Text("Dismiss") }
            }
            else -> {
                var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
                LaunchedEffect(run.jobId) { while (true) { delay(1000); now = System.currentTimeMillis() } }
                val secs = ((now - run.startedAt) / 1000).coerceAtLeast(0)
                Text(
                    "Making the clip${if (run.loop) " (looping)" else ""} · ${secs / 60}:${"%02d".format(secs % 60)}",
                    style = MaterialTheme.typography.bodyMedium,
                )
                if (run.percent > 0) LinearProgressIndicator(progress = { run.percent.toFloat() }, modifier = Modifier.fillMaxWidth())
                else LinearProgressIndicator(Modifier.fillMaxWidth())
            }
        }
        if (run.prompt.isNotEmpty()) {
            Text(run.prompt, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 3)
        }
    }
}

/** A clip, looping and muted, tap to pause: its preview while there is one, else its
    gallery copy. Played through the session's token, as the viewer plays the library. */
@androidx.annotation.OptIn(UnstableApi::class)
@Composable
internal fun ClipPlayer(repo: Repository, clip: GenClip, modifier: Modifier) {
    val url = if (clip.id.isNotEmpty()) repo.genPreviewUrl(clip.id) else repo.galleryFullUrl(clip.gallery)
    ClipPlayer(repo, url, modifier)
}

@androidx.annotation.OptIn(UnstableApi::class)
@Composable
internal fun ClipPlayer(repo: Repository, url: String, modifier: Modifier) {
    val context = LocalContext.current
    val player = remember(url) {
        val http = DefaultHttpDataSource.Factory().apply {
            repo.prefs.token?.let { setDefaultRequestProperties(mapOf("Authorization" to "Bearer $it")) }
        }
        ExoPlayer.Builder(context).setMediaSourceFactory(DefaultMediaSourceFactory(http)).build().apply {
            setMediaItem(MediaItem.fromUri(url))
            repeatMode = Player.REPEAT_MODE_ONE
            volume = 0f
            prepare()
            playWhenReady = true
        }
    }
    DisposableEffect(player) { onDispose { player.run { stop(); release() } } }
    AndroidView(
        factory = { PlayerView(it).apply { this.player = player; useController = false } },
        modifier = modifier.clip(RoundedCornerShape(10.dp)).background(Color.Black).clickable { player.playWhenReady = !player.playWhenReady },
    )
}
