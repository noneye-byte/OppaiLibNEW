package net.fourbakers.oppailib.ui

import android.app.Activity
import android.content.res.Configuration
import android.widget.Toast
import androidx.activity.compose.BackHandler
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.calculatePan
import androidx.compose.foundation.gestures.calculateZoom
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.systemBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.PagerState
import androidx.compose.foundation.pager.VerticalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.OpenInNew
import androidx.compose.material.icons.automirrored.filled.VolumeOff
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Forward10
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.LocalOffer
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Replay10
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.StarBorder
import androidx.compose.material.icons.filled.SwapHoriz
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.input.pointer.positionChanged
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import coil.ImageLoader
import coil.compose.AsyncImage
import coil.request.ImageRequest
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import net.fourbakers.oppailib.data.ComicInfo
import net.fourbakers.oppailib.data.GamePlayInfo
import net.fourbakers.oppailib.data.GameSave
import net.fourbakers.oppailib.data.Media
import net.fourbakers.oppailib.data.MediaPatch
import net.fourbakers.oppailib.data.Repository
import net.fourbakers.oppailib.util.copyUriToCache
import net.fourbakers.oppailib.util.mimeOf
import net.fourbakers.oppailib.data.VideoFit
import net.fourbakers.oppailib.work.DownloadQueue
import net.fourbakers.oppailib.work.DownloadWorker
import java.net.URI

/**
 * Immersive, full-screen media viewer. Items are paged vertically like a short-video
 * feed: whichever page is settled is the one that plays, and swiping up/down moves
 * through the same list the grid showed. A tap toggles the chrome.
 *
 * The player and the comic reader are hoisted here rather than owned by the page
 * they render into, because their controls live in the chrome — which is drawn over
 * the feed, so it can't reach into a page's state.
 */
@Composable
fun ViewerScreen(
    repo: Repository,
    items: List<Media>,
    startIndex: Int,
    onClose: () -> Unit,
    onChanged: (Media) -> Unit,
    onSearchTag: (String) -> Unit,
    onDelete: (Media) -> Unit,
) {
    if (items.isEmpty()) { onClose(); return }

    // The Android back button/gesture leaves the viewer, the same as the chrome's X —
    // without this it would pop the activity and drop the user out of the app instead.
    BackHandler { onClose() }

    val feed = rememberPagerState(initialPage = startIndex.coerceIn(0, items.lastIndex)) { items.size }
    var chrome by remember { mutableStateOf(true) }
    val isLandscape = LocalConfiguration.current.orientation == Configuration.ORIENTATION_LANDSCAPE
    // A zoomed page owns the drag gesture; the feed must not steal it out from under.
    var zoomed by remember { mutableStateOf(false) }

    // Full-bleed: hide the system bars for as long as the viewer is on screen, and
    // put them back exactly as they were when it leaves.
    val view = LocalView.current
    DisposableEffect(Unit) {
        val window = (view.context as Activity).window
        val controller = WindowCompat.getInsetsController(window, view)
        val bars = WindowInsetsCompat.Type.systemBars()
        val hadBehavior = controller.systemBarsBehavior
        controller.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        controller.hide(bars)
        onDispose {
            controller.show(bars)
            controller.systemBarsBehavior = hadBehavior
        }
    }

    val settled = items.getOrNull(feed.settledPage)

    // Detail (tags, dimensions) isn't in the list payload, so fetch it per item as
    // the user lands on it and cache it for the life of the viewer.
    val details = remember { mutableStateMapOf<Long, Media>() }
    LaunchedEffect(settled?.id) {
        val m = settled ?: return@LaunchedEffect
        if (details[m.id] == null) {
            runCatching { repo.api.getMedia(m.id) }.getOrNull()?.let { details[m.id] = it }
        }
    }

    // Leaving an item tears its zoom down with it.
    LaunchedEffect(settled?.id) { zoomed = false }

    val player = rememberVideoPlayer(repo, settled)
    val comic = rememberComicReader(repo, settled)

    // The chrome takes itself away over a playing video. Every touch of it pokes the
    // timer, so it only goes while you're actually just watching.
    var poke by remember { mutableIntStateOf(0) }
    // True while the up-next strip is being scrubbed; the chrome must not auto-hide then.
    var browsingUpNext by remember { mutableStateOf(false) }
    LaunchedEffect(isLandscape) { if (isLandscape) browsingUpNext = false }
    val playing = playingState(player)
    ChromeAutoHide(active = chrome && playing && !browsingUpNext, poke = poke) { chrome = false }

    Box(Modifier.fillMaxSize().background(Color.Black)) {
        VerticalPager(
            state = feed,
            modifier = Modifier.fillMaxSize(),
            beyondViewportPageCount = 1,
            userScrollEnabled = !zoomed,
        ) { page ->
            val m = items[page]
            MediaPage(
                repo = repo,
                media = m,
                active = feed.settledPage == page,
                player = player,
                comic = comic,
                onToggleChrome = { chrome = !chrome },
                onZoomed = { zoomed = it },
            )
        }

        val current = items.getOrNull(feed.currentPage)
        val scope = rememberCoroutineScope()
        AnimatedVisibility(visible = chrome && current != null, enter = fadeIn(), exit = fadeOut()) {
            if (current != null) {
                Chrome(
                    repo = repo,
                    media = details[current.id] ?: current,
                    index = feed.currentPage,
                    count = feed.pageCount,
                    onClose = onClose,
                    onChanged = onChanged,
                    onDetail = { details[it.id] = it },
                    onSearchTag = onSearchTag,
                    onDelete = onDelete,
                    upNext = {
                        // Tapping the video raises the chrome; the chrome says what's next.
                        // Only for video: a comic's bottom bar is already a page scrubber,
                        // and stacking a second strip under it would be two scrubbers.
                        if (!isLandscape && current.kind == "video") {
                            val videoItems = items.mapIndexedNotNull { index, item ->
                                if (item.kind == "video") index to item else null
                            }
                            val videoCurrent = videoItems.indexOfFirst { it.first == feed.currentPage }
                            UpNextStrip(
                                repo = repo,
                                items = videoItems.map { (_, it) ->
                                    StripItem(
                                        key = it.id.toString(),
                                        title = it.title.ifEmpty { it.kind },
                                        thumbUrl = repo.thumbUrl(it.id),
                                        isVideo = it.kind == "video",
                                    )
                                },
                                current = videoCurrent,
                                onPick = { at -> poke++; scope.launch { feed.scrollToPage(videoItems[at].first) } },
                                // Browsing the strip holds the chrome open; when the scrub
                                // settles, poke restarts the idle wait fresh from there.
                                onBrowsing = { browsingUpNext = it; if (!it) poke++ },
                            )
                        }
                    },
                ) {
                    // Per-kind controls, sat directly above the metadata bar.
                    when {
                        current.kind == "video" && player != null -> VideoControls(player) { poke++ }
                        current.kind == "comic" && comic != null -> ComicControls(comic)
                    }
                }
            }
        }
    }
}

// ── the feed's pages ─────────────────────────────────────────────────────────

@Composable
private fun MediaPage(
    repo: Repository,
    media: Media,
    active: Boolean,
    player: ExoPlayer?,
    comic: ComicReader?,
    onToggleChrome: () -> Unit,
    onZoomed: (Boolean) -> Unit,
) {
    // Only the settled item gets the player or the reader; the neighbours the pager
    // keeps warm show their poster, so swiping never leaves audio playing behind you.
    when {
        media.kind == "video" && active && player != null ->
            VideoSurface(player, repo.prefs.videoFit, onToggleChrome)

        media.kind == "comic" && active && comic != null ->
            ComicPages(repo, comic, onToggleChrome, onZoomed)

        media.kind == "game" -> GamePage(repo, media)

        media.kind == "image" || media.kind == "gif" ->
            ZoomableImage(
                url = repo.streamUrl(media.id),
                imageLoader = repo.imageLoader,
                contentDescription = media.title,
                enabled = active,
                onZoomed = onZoomed,
                onTap = { _, _ -> onToggleChrome() },
            )

        else -> Poster(repo, media, onToggleChrome)
    }
}

/**
 * A game isn't something you watch — it's something you go and get. So this is a
 * detail page (cover, platforms, screenshots, a way out to the download) rather than
 * the passive full-bleed frame the other kinds get.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun GamePage(repo: Repository, media: Media) {
    val uriHandler = LocalUriHandler.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var userGallery by remember(media.id) { mutableStateOf<List<Media>>(emptyList()) }
    var uploading by remember(media.id) { mutableStateOf(false) }
    var saves by remember(media.id) { mutableStateOf<List<GameSave>>(emptyList()) }
    var savingUpload by remember(media.id) { mutableStateOf(false) }
    // A 404 from the play probe is the normal answer for a download-only game, so it
    // reads as "no Play button" rather than as an error.
    var playInfo by remember(media.id) { mutableStateOf<GamePlayInfo?>(null) }
    var playing by remember(media.id) { mutableStateOf(false) }
    LaunchedEffect(media.id) {
        runCatching { repo.api.gameGallery(media.id).items }.onSuccess { userGallery = it }
        runCatching { repo.api.gameSaves(media.id).items }.onSuccess { saves = it }
        runCatching { repo.api.gamePlayInfo(media.id) }
            .onSuccess { playInfo = it.takeIf { info -> info.playable } }
    }

    // Backing a save up: pick any file, send it as-is. No type filter — a save is
    // whatever the game wrote, and filtering by MIME would hide most of them.
    val saveLauncher = rememberSystemPickerLauncher(ActivityResultContracts.OpenMultipleDocuments()) { uris ->
        if (uris.isNullOrEmpty() || savingUpload) return@rememberSystemPickerLauncher
        savingUpload = true
        scope.launch {
            try {
                for (uri in uris) {
                    val (file, name) = copyUriToCache(context, uri)
                    try {
                        val created = repo.api.uploadGameSave(
                            media.id,
                            repo.filePart(file, mimeOf(context, uri)),
                            repo.titlePart(name),
                        )
                        // Newest first, matching the order the server lists them in.
                        saves = listOf(created) + saves
                    } finally { file.delete() }
                }
            } catch (_: Exception) {
                // The shared client already surfaced the failure through the mascot.
            } finally { savingUpload = false }
        }
    }

    // Restoring a save means writing it somewhere the user can reach — their game's
    // folder, or Downloads. A plain link would not work: the app authenticates with a
    // bearer token the system browser doesn't have, so the bytes come back through the
    // API and are written into the document the user picks.
    var pendingDownload by remember(media.id) { mutableStateOf<GameSave?>(null) }
    val downloadLauncher = rememberSystemPickerLauncher(
        ActivityResultContracts.CreateDocument("application/octet-stream"),
    ) { uri ->
        val save = pendingDownload
        pendingDownload = null
        if (uri == null || save == null) return@rememberSystemPickerLauncher
        scope.launch {
            runCatching {
                val body = repo.api.downloadGameSave(media.id, save.id)
                body.byteStream().use { input ->
                    context.contentResolver.openOutputStream(uri)?.use { output -> input.copyTo(output) }
                }
            }
        }
    }

    if (playing) {
        GamePlayerScreen(repo, media.id, playInfo?.embedUrl, onClose = { playing = false })
        return
    }
    val galleryLauncher = rememberSystemPickerLauncher(ActivityResultContracts.OpenMultipleDocuments()) { uris ->
        if (uris.isNullOrEmpty() || uploading) return@rememberSystemPickerLauncher
        uploading = true
        scope.launch {
            try {
                for (uri in uris) {
                    val (file, _) = copyUriToCache(context, uri)
                    try {
                        userGallery = userGallery + repo.api.uploadGameGallery(
                            media.id, repo.filePart(file, mimeOf(context, uri)),
                        )
                    } finally { file.delete() }
                }
            } finally { uploading = false }
        }
    }

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .windowInsetsPadding(WindowInsets.systemBars)
            .padding(horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(Modifier.height(72.dp)) // clear the chrome's top bar

        AsyncImage(
            model = ImageRequest.Builder(context).data(repo.thumbUrl(media.id)).crossfade(true).build(),
            imageLoader = repo.imageLoader,
            contentDescription = media.title,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxWidth().height(200.dp).clip(RoundedCornerShape(16.dp)),
        )

        Text(
            media.title.ifEmpty { "Untitled game" },
            color = Color.White,
            style = MaterialTheme.typography.headlineSmall,
            modifier = Modifier.padding(top = 16.dp),
        )

        AndroidSupport(media)

        if (media.platforms.isNotEmpty()) {
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                modifier = Modifier.padding(top = 12.dp),
            ) {
                media.platforms.forEach { AssistChip(onClick = {}, label = { Text(platformLabel(it)) }) }
            }
        }

        playInfo?.let { info ->
            Button(
                onClick = { playing = true },
                modifier = Modifier.fillMaxWidth().padding(top = 20.dp),
            ) {
                Icon(Icons.Filled.PlayArrow, contentDescription = null, modifier = Modifier.size(18.dp))
                Text("Play in browser", modifier = Modifier.padding(start = 8.dp))
            }
            if (info.mode == "embed") {
                // Worth saying plainly: this one needs a connection and isn't in the
                // library, unlike everything else on this screen.
                Text(
                    "Streams from itch.io — no downloadable build exists, so it isn't stored locally.",
                    color = Color.White.copy(alpha = 0.6f),
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.align(Alignment.Start).padding(top = 6.dp),
                )
            }
        }

        media.download?.takeIf { it.isNotBlank() }?.let { url ->
            Button(
                onClick = { uriHandler.openUri(url) },
                modifier = Modifier.fillMaxWidth().padding(top = 20.dp),
            ) {
                Icon(Icons.AutoMirrored.Filled.OpenInNew, contentDescription = null, modifier = Modifier.size(18.dp))
                Text("Get it on ${hostOf(url)}", modifier = Modifier.padding(start = 8.dp))
            }
        }

        if (media.gallery.isNotEmpty()) {
            Text(
                "Screenshots",
                color = Color.White,
                style = MaterialTheme.typography.titleSmall,
                modifier = Modifier.align(Alignment.Start).padding(top = 24.dp, bottom = 8.dp),
            )
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(media.gallery) { shot ->
                    AsyncImage(
                        // Screenshots live on the origin site; the server fetches them for us.
                        model = ImageRequest.Builder(context).data(repo.proxyUrl(shot)).crossfade(true).build(),
                        imageLoader = repo.imageLoader,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.height(140.dp).width(240.dp).clip(RoundedCornerShape(10.dp)),
                    )
                }
            }
        }

        Text(
            "User gallery",
            color = Color.White,
            style = MaterialTheme.typography.titleSmall,
            modifier = Modifier.align(Alignment.Start).padding(top = 24.dp, bottom = 8.dp),
        )
        if (userGallery.isNotEmpty()) {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(userGallery, key = { it.id }) { item ->
                    Box {
                        AsyncImage(
                            model = ImageRequest.Builder(context).data(repo.thumbUrl(item.id)).crossfade(true).build(),
                            imageLoader = repo.imageLoader,
                            contentDescription = item.title,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.height(140.dp).width(240.dp).clip(RoundedCornerShape(10.dp)),
                        )
                        IconButton(
                            onClick = { scope.launch {
                                runCatching { repo.api.removeGameGallery(media.id, item.id) }
                                    .onSuccess { userGallery = userGallery.filterNot { it.id == item.id } }
                            } },
                            modifier = Modifier.align(Alignment.TopEnd),
                        ) { Icon(Icons.Filled.Close, "Remove from game gallery", tint = Color.White) }
                    }
                }
            }
        }
        Button(
            onClick = { galleryLauncher.launch(arrayOf("image/*", "video/*")) },
            enabled = !uploading,
            modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
        ) { Text(if (uploading) "Uploading…" else "Add photos or videos") }

        Text(
            "Save files",
            color = Color.White,
            style = MaterialTheme.typography.titleSmall,
            modifier = Modifier.align(Alignment.Start).padding(top = 24.dp, bottom = 8.dp),
        )
        if (saves.isEmpty()) {
            Text(
                "No saves backed up yet.",
                color = Color.White.copy(alpha = 0.6f),
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.align(Alignment.Start),
            )
        } else {
            // A Column rather than a LazyColumn: this sits inside a vertically
            // scrolling parent, and nesting a lazy list in one is a runtime crash.
            Column(Modifier.fillMaxWidth()) {
                saves.forEach { save ->
                    SaveRow(
                        save = save,
                        onDownload = {
                            pendingDownload = save
                            downloadLauncher.launch(save.label.ifBlank { "save" })
                        },
                        onDelete = {
                            scope.launch {
                                runCatching { repo.api.deleteGameSave(media.id, save.id) }
                                    .onSuccess { saves = saves.filterNot { it.id == save.id } }
                            }
                        },
                    )
                }
            }
        }
        Button(
            onClick = { saveLauncher.launch(arrayOf("*/*")) },
            enabled = !savingUpload,
            modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
        ) { Text(if (savingUpload) "Uploading…" else "Back up a save") }

        Spacer(Modifier.height(120.dp)) // clear the chrome's bottom bar
    }
}

/** One backed-up save: what it is, when it was made, and the two things you can do
 *  with it. */
@Composable
private fun SaveRow(save: GameSave, onDownload: () -> Unit, onDelete: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .padding(vertical = 2.dp)
            .clip(RoundedCornerShape(10.dp))
            .background(Color.White.copy(alpha = 0.06f))
            .padding(start = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f).padding(vertical = 8.dp)) {
            Text(
                save.label.ifBlank { "Save" },
                color = Color.White,
                style = MaterialTheme.typography.bodyMedium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                "${formatSaveSize(save.size)} · ${formatSaveDate(save.createdAt)}",
                color = Color.White.copy(alpha = 0.6f),
                style = MaterialTheme.typography.bodySmall,
            )
        }
        IconButton(onClick = onDownload) {
            Icon(Icons.Filled.Download, contentDescription = "Download this save", tint = Color.White)
        }
        IconButton(onClick = onDelete) {
            Icon(Icons.Filled.Delete, contentDescription = "Delete this save", tint = Color.White)
        }
    }
}

private fun formatSaveSize(bytes: Long): String = when {
    bytes >= 1_048_576 -> "%.1f MB".format(bytes / 1_048_576.0)
    bytes >= 1024 -> "%.0f KB".format(bytes / 1024.0)
    else -> "$bytes B"
}

/** Timestamps arrive as unix seconds. Saves are picked from a list by "which one is
 *  which", so a short local date reads better than a precise one. */
private fun formatSaveDate(unixSeconds: Long): String =
    if (unixSeconds <= 0L) {
        ""
    } else {
        java.text.SimpleDateFormat("d MMM, HH:mm", java.util.Locale.getDefault())
            .format(java.util.Date(unixSeconds * 1000))
    }

/**
 * Whether this runs on the phone you're holding. Three states, not two: a game
 * scraped before the parser learned to read platforms carries no platform tags at
 * all, and reporting that as "not supported" would be inventing an answer.
 */
@Composable
private fun AndroidSupport(media: Media) {
    val (label, colour) = when (media.runsOnAndroid) {
        true -> "Runs on Android" to Color(0xFF4CAF50)
        false -> "Not available for Android" to Color(0xFFE57373)
        null -> "Android support unknown — re-scrape to find out" to Color(0xFF9E9E9E)
    }
    Row(
        Modifier.padding(top = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            if (media.runsOnAndroid == true) Icons.Filled.CheckCircle else Icons.Filled.Info,
            contentDescription = null,
            tint = colour,
            modifier = Modifier.size(18.dp),
        )
        Text(
            label,
            color = colour,
            style = MaterialTheme.typography.labelLarge,
            modifier = Modifier.padding(start = 6.dp),
        )
    }
}

private fun platformLabel(p: String): String = when (p) {
    "macos" -> "macOS"
    "ios" -> "iOS"
    "web" -> "Browser"
    else -> p.replaceFirstChar { it.uppercase() }
}

private fun hostOf(url: String): String =
    runCatching { URI(url).host?.removePrefix("www.") }.getOrNull()?.takeIf { it.isNotBlank() } ?: "the web"

/** The still frame the server has for an item we can't render inline (a game, say). */
@Composable
private fun Poster(repo: Repository, media: Media, onTap: () -> Unit) {
    Box(
        Modifier.fillMaxSize().pointerInput(Unit) { detectTapGestures { onTap() } },
        Alignment.Center,
    ) {
        AsyncImage(
            model = ImageRequest.Builder(LocalContext.current).data(repo.thumbUrl(media.id)).crossfade(true).build(),
            imageLoader = repo.imageLoader,
            contentDescription = media.title,
            contentScale = ContentScale.Fit,
            modifier = Modifier.fillMaxSize(),
        )
    }
}

/**
 * An image that pinch-zooms and pans, with double-tap to snap between fit and 2.5×.
 *
 * The gesture is hand-rolled rather than `detectTransformGestures` because that one
 * swallows single-finger drags unconditionally, which would eat the pager's swipe.
 * Here a drag is only consumed once there are two fingers down or we're already
 * zoomed in — otherwise it falls through and the pager scrolls as normal.
 */
@Composable
private fun ZoomableImage(
    url: String,
    imageLoader: ImageLoader,
    contentDescription: String?,
    enabled: Boolean,
    onZoomed: (Boolean) -> Unit,
    onTap: (Offset, IntSize) -> Unit,
) {
    var scale by remember(url) { mutableFloatStateOf(1f) }
    var offset by remember(url) { mutableStateOf(Offset.Zero) }
    var size by remember(url) { mutableStateOf(IntSize.Zero) }

    // Keep the image's edges inside the viewport: at scale s it overhangs by
    // (s-1)/2 of its size on each axis, and that's exactly how far it may travel.
    fun clamp(s: Float, o: Offset): Offset {
        val maxX = size.width * (s - 1f) / 2f
        val maxY = size.height * (s - 1f) / 2f
        return Offset(o.x.coerceIn(-maxX, maxX), o.y.coerceIn(-maxY, maxY))
    }

    LaunchedEffect(scale, enabled) { if (enabled) onZoomed(scale > ZOOM_EPSILON) }

    Box(
        Modifier
            .fillMaxSize()
            .onSizeChanged { size = it }
            .pointerInput(url) {
                detectTapGestures(
                    onTap = { onTap(it, size) },
                    onDoubleTap = { pos ->
                        if (scale > ZOOM_EPSILON) {
                            scale = 1f
                            offset = Offset.Zero
                        } else {
                            // Pull the tapped point toward the centre as we zoom into it.
                            val centre = Offset(size.width / 2f, size.height / 2f)
                            scale = DOUBLE_TAP_SCALE
                            offset = clamp(DOUBLE_TAP_SCALE, (centre - pos) * (DOUBLE_TAP_SCALE - 1f))
                        }
                    },
                )
            }
            .pointerInput(url) {
                awaitEachGesture {
                    awaitFirstDown(requireUnconsumed = false)
                    do {
                        val event = awaitPointerEvent()
                        val multiTouch = event.changes.count { it.pressed } > 1
                        if (!multiTouch && scale <= ZOOM_EPSILON) continue // let the pager have it
                        val next = (scale * event.calculateZoom()).coerceIn(1f, MAX_SCALE)
                        scale = next
                        offset = if (next <= ZOOM_EPSILON) Offset.Zero else clamp(next, offset + event.calculatePan())
                        event.changes.forEach { if (it.positionChanged()) it.consume() }
                    } while (event.changes.any { it.pressed })
                }
            },
        contentAlignment = Alignment.Center,
    ) {
        AsyncImage(
            model = ImageRequest.Builder(LocalContext.current).data(url).crossfade(true).build(),
            imageLoader = imageLoader,
            contentDescription = contentDescription,
            contentScale = ContentScale.Fit,
            modifier = Modifier.fillMaxSize().graphicsLayer {
                scaleX = scale
                scaleY = scale
                translationX = offset.x
                translationY = offset.y
            },
        )
    }
}

private const val ZOOM_EPSILON = 1.01f
private const val DOUBLE_TAP_SCALE = 2.5f
private const val MAX_SCALE = 5f

// ── comics ───────────────────────────────────────────────────────────────────

/** The open comic: its probe result, the page pager, and which way it reads. */
private class ComicReader(
    val media: Media,
    val info: ComicInfo?,
    val pages: PagerState,
    val rtl: Boolean,
    val setRtl: (Boolean) -> Unit,
) {
    val readable: Boolean get() = info?.readable == true && info.pages > 0
    val pageCount: Int get() = info?.pages ?: 0
}

/**
 * Probes [media]'s archive and holds the reader state for it, resuming at whatever
 * page was last read. Returns null for anything that isn't a comic.
 */
@Composable
private fun rememberComicReader(repo: Repository, media: Media?): ComicReader? {
    if (media == null || media.kind != "comic") return null

    var info by remember(media.id) { mutableStateOf<ComicInfo?>(null) }
    var rtl by remember { mutableStateOf(repo.prefs.comicRtl) }

    LaunchedEffect(media.id) {
        info = runCatching { repo.api.comicInfo(media.id) }
            .getOrElse { ComicInfo(readable = false, reason = it.message ?: "couldn't open archive") }
    }

    // The pager has to exist before the probe lands (it's what the reader renders
    // into), so it starts empty and the page count fills in underneath it.
    val pages = key(media.id) {
        rememberPagerState(initialPage = 0) { info?.pages ?: 0 }
    }

    val count = info?.pages ?: 0
    LaunchedEffect(media.id, count) {
        if (count > 0) pages.scrollToPage((repo.prefs.comicPage(media.id) - 1).coerceIn(0, count - 1))
    }
    LaunchedEffect(media.id, pages.settledPage, count) {
        if (count > 0) repo.prefs.setComicPage(media.id, pages.settledPage + 1)
    }

    return ComicReader(
        media = media,
        info = info,
        pages = pages,
        rtl = rtl,
        setRtl = { rtl = it; repo.prefs.comicRtl = it },
    )
}

/**
 * The pages themselves. Reading direction is applied by flipping the layout
 * direction of the pager: in RTL page 1 sits on the right and the next page comes
 * in from the left, which is what a manga reader expects. Page indices stay
 * logical (0 is always the first page) — only the geometry flips.
 */
@Composable
private fun ComicPages(
    repo: Repository,
    comic: ComicReader,
    onToggleChrome: () -> Unit,
    onZoomed: (Boolean) -> Unit,
) {
    val info = comic.info
    if (info == null) {
        Box(Modifier.fillMaxSize(), Alignment.Center) { CircularProgressIndicator(color = Color.White) }
        return
    }
    if (!comic.readable) {
        Box(Modifier.fillMaxSize().pointerInput(Unit) { detectTapGestures { onToggleChrome() } }, Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("Can't read this comic", color = Color.White, style = MaterialTheme.typography.titleMedium)
                Text(
                    info.reason ?: "The server couldn't open the archive.",
                    color = Color.White.copy(alpha = 0.7f),
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.padding(top = 6.dp),
                )
            }
        }
        return
    }

    var zoomed by remember(comic.media.id) { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(comic.media.id, comic.pages.settledPage, comic.pageCount) {
        val from = comic.pages.settledPage + 1
        repo.prefetchImages(
            (from until minOf(from + 4, comic.pageCount)).map { repo.pageUrl(comic.media.id, it + 1) },
        )
    }

    fun turn(delta: Int) {
        val target = (comic.pages.currentPage + delta).coerceIn(0, comic.pageCount - 1)
        if (target != comic.pages.currentPage) scope.launch { comic.pages.animateScrollToPage(target) }
    }

    CompositionLocalProvider(
        LocalLayoutDirection provides if (comic.rtl) LayoutDirection.Rtl else LayoutDirection.Ltr,
    ) {
        HorizontalPager(
            state = comic.pages,
            modifier = Modifier.fillMaxSize(),
            beyondViewportPageCount = 1, // warms the neighbouring page so a turn is instant
            userScrollEnabled = !zoomed,
        ) { page ->
            ZoomableImage(
                url = repo.pageUrl(comic.media.id, page + 1),
                imageLoader = repo.imageLoader,
                contentDescription = "Page ${page + 1}",
                enabled = page == comic.pages.settledPage,
                onZoomed = {
                    if (page == comic.pages.settledPage) {
                        zoomed = it
                        onZoomed(it)
                    }
                },
                onTap = { pos, size ->
                    // Edge thirds turn the page, the middle toggles the chrome. Which
                    // edge means "forward" follows the reading direction.
                    val edge = size.width / 3f
                    val forward = if (comic.rtl) pos.x < edge else pos.x > size.width - edge
                    val back = if (comic.rtl) pos.x > size.width - edge else pos.x < edge
                    when {
                        size.width == 0 -> onToggleChrome()
                        forward -> turn(1)
                        back -> turn(-1)
                        else -> onToggleChrome()
                    }
                },
            )
        }
    }
}

/** Page scrubber and the reading-direction switch. */
@Composable
private fun ComicControls(comic: ComicReader) {
    if (!comic.readable) return
    ComicScrubber(
        pages = comic.pages,
        pageCount = comic.pageCount,
        rtl = comic.rtl,
        stateKey = comic.media.id,
        onToggleRtl = { comic.setRtl(!comic.rtl) },
    )
}

/**
 * The book as a bar: current page, a slider that maps onto the whole run of pages, and
 * (when [onToggleRtl] is given) the reading-direction switch. Drives [pages] directly,
 * so it is the one place the page scrubber lives — the library reader and the remote
 * browse reader both hand it their pager. [stateKey] resets the in-flight drag when the
 * open book changes underneath it.
 */
@Composable
internal fun ComicScrubber(
    pages: PagerState,
    pageCount: Int,
    rtl: Boolean,
    stateKey: Any,
    onToggleRtl: (() -> Unit)? = null,
) {
    if (pageCount <= 0) return
    val scope = rememberCoroutineScope()
    var scrub by remember(stateKey) { mutableStateOf<Float?>(null) }
    val page = scrub ?: pages.currentPage.toFloat()

    Row(
        Modifier.fillMaxWidth().padding(horizontal = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            "${page.toInt() + 1} / $pageCount",
            color = Color.White,
            style = MaterialTheme.typography.labelMedium,
        )
        // The slider is a spatial map of the book, so it has to run the same way the
        // pages do — otherwise dragging right would walk you backwards.
        CompositionLocalProvider(
            LocalLayoutDirection provides if (rtl) LayoutDirection.Rtl else LayoutDirection.Ltr,
        ) {
            // Continuous, not stepped: a long book would otherwise draw a tick per page.
            Slider(
                value = page,
                onValueChange = { scrub = it },
                onValueChangeFinished = {
                    scrub?.let { target ->
                        scope.launch { pages.scrollToPage(target.toInt().coerceIn(0, pageCount - 1)) }
                    }
                    scrub = null
                },
                valueRange = 0f..(pageCount - 1).coerceAtLeast(1).toFloat(),
                colors = whiteSlider(),
                modifier = Modifier.weight(1f).padding(horizontal = 12.dp),
            )
        }
        onToggleRtl?.let { toggle ->
            IconButton(onClick = toggle) {
                Icon(
                    Icons.Filled.SwapHoriz,
                    contentDescription = if (rtl) "Read left-to-right" else "Read right-to-left",
                    tint = if (rtl) MaterialTheme.colorScheme.primary else Color.White,
                )
            }
        }
    }
}

// ── chrome auto-hide ─────────────────────────────────────────────────────────

/** How long the chrome lingers over a playing video before it gets out of the way. */
private const val CHROME_IDLE_MS = 4_000L

/**
 * Takes the chrome away after [CHROME_IDLE_MS] of not being touched, while [active].
 *
 * Callers pass `chrome && playing` for [active], so the bars only ever vanish from a
 * video that is actually running: a paused player is one you're doing something with,
 * and hiding the controls out from under that would be taking the thing away mid-reach.
 * They also hold the [poke] counter and bump it on every interaction — incrementing it
 * restarts the wait, which is what keeps the chrome up while you're using it.
 *
 * The up-next carousel lives in the chrome, so this is what auto-hides the carousel:
 * it is the reason the chrome is tall enough to be worth hiding in the first place.
 */
@Composable
internal fun ChromeAutoHide(active: Boolean, poke: Int, onHide: () -> Unit) {
    LaunchedEffect(active, poke) {
        if (!active) return@LaunchedEffect
        delay(CHROME_IDLE_MS)
        onHide()
    }
}

/** Whether [player] is playing right now, as state. False when there is no player. */
@Composable
internal fun playingState(player: ExoPlayer?): Boolean {
    var playing by remember(player) { mutableStateOf(player?.isPlaying == true) }
    DisposableEffect(player) {
        if (player == null) return@DisposableEffect onDispose { }
        playing = player.isPlaying
        val listener = object : Player.Listener {
            override fun onIsPlayingChanged(isPlaying: Boolean) { playing = isPlaying }
        }
        player.addListener(listener)
        onDispose { player.removeListener(listener) }
    }
    return playing
}

// ── video ────────────────────────────────────────────────────────────────────

// How much has to be buffered before playback starts, and before it resumes after a
// stall. These stay fixed: they're about how quickly the video reacts, which isn't
// the thing the read-ahead setting is trading off.
private const val BUFFER_FOR_PLAYBACK_MS = 2_500
private const val BUFFER_FOR_PLAYBACK_AFTER_REBUFFER_MS = 5_000

/**
 * The player for the settled item, or null when that item isn't a video. Rebuilt on
 * every item change and released with it, so at most one player exists at a time.
 */
@androidx.annotation.OptIn(UnstableApi::class)
@Composable
private fun rememberVideoPlayer(repo: Repository, media: Media?): ExoPlayer? {
    val context = LocalContext.current
    val prefs = repo.prefs
    val id = media?.takeIf { it.kind == "video" }?.id

    val player = remember(id, prefs.bufferSeconds, prefs.keepBackBuffer) {
        if (id == null) return@remember null

        val aheadMs = prefs.bufferSeconds * 1_000
        // DefaultLoadControl won't accept a steady-state buffer smaller than what it
        // wants in hand before resuming from a stall, so that's the floor.
        val bufferMs = aheadMs.coerceAtLeast(BUFFER_FOR_PLAYBACK_AFTER_REBUFFER_MS)
        val loadControl = DefaultLoadControl.Builder()
            .setBufferDurationsMs(
                bufferMs,
                bufferMs,
                BUFFER_FOR_PLAYBACK_MS,
                BUFFER_FOR_PLAYBACK_AFTER_REBUFFER_MS,
            )
            // Without this the byte-size cap governs and buffering stops well short of
            // the requested seconds — the read-ahead setting would do nothing on a
            // high-bitrate file, which is exactly the file it matters for.
            .setPrioritizeTimeOverSizeThresholds(true)
            // The back buffer is what makes seeking backwards free; with none, ExoPlayer
            // discards each frame the moment it's been played and a scrub back refetches.
            .setBackBuffer(if (prefs.keepBackBuffer) bufferMs else 0, true)
            .build()

        val http = DefaultHttpDataSource.Factory().apply {
            prefs.token?.let { setDefaultRequestProperties(mapOf("Authorization" to "Bearer $it")) }
        }
        ExoPlayer.Builder(context)
            .setMediaSourceFactory(DefaultMediaSourceFactory(http))
            .setLoadControl(loadControl)
            .build().apply {
                setMediaItem(MediaItem.fromUri(repo.streamUrl(id)))
                repeatMode = if (prefs.videoLoop) Player.REPEAT_MODE_ONE else Player.REPEAT_MODE_OFF
                volume = if (prefs.videoMuted) 0f else 1f
                setPlaybackSpeed(prefs.videoSpeed)
                prepare()
                playWhenReady = prefs.videoAutoplay
            }
    }

    // Closing the viewer — or merely swiping to the next item — has to give the memory
    // back. stop() ends the load, clearMediaItems() drops the buffered source, and
    // release() frees the allocator behind it. A read-ahead buffer can be tens of
    // megabytes, and leaving one alive behind every video you glanced at would add up.
    DisposableEffect(player) {
        onDispose { player?.run { stop(); clearMediaItems(); release() } }
    }
    return player
}

// media3's UnstableApi is an AndroidX opt-in marker, not a Kotlin one, so it needs
// androidx.annotation.OptIn — kotlin.OptIn silently does nothing here.
@androidx.annotation.OptIn(UnstableApi::class)
@Composable
private fun VideoSurface(player: ExoPlayer, fit: VideoFit, onToggleChrome: () -> Unit) {
    val resize = when (fit) {
        VideoFit.FIT -> AspectRatioFrameLayout.RESIZE_MODE_FIT
        VideoFit.FILL -> AspectRatioFrameLayout.RESIZE_MODE_FILL
        VideoFit.ZOOM -> AspectRatioFrameLayout.RESIZE_MODE_ZOOM
    }
    Box(
        Modifier.fillMaxSize().pointerInput(player) {
            detectTapGestures(
                onTap = { onToggleChrome() },
                // Double-tap seeking, YouTube-style: which side you hit decides the way.
                onDoubleTap = { pos ->
                    val back = pos.x < size.width / 2f
                    val target = player.currentPosition + if (back) -SEEK_STEP_MS else SEEK_STEP_MS
                    player.seekTo(target.coerceAtLeast(0L))
                },
            )
        },
    ) {
        AndroidView(
            factory = { ctx ->
                PlayerView(ctx).apply {
                    this.player = player
                    useController = false // the chrome's own controls drive this
                    setBackgroundColor(android.graphics.Color.BLACK)
                }
            },
            update = { it.resizeMode = resize },
            modifier = Modifier.fillMaxSize(),
        )
    }
}

/**
 * Transport controls: scrubber, play/pause, ±10s, mute, and playback speed.
 *
 * [onInteract] is called on every touch of them, so the chrome's idle timer can tell
 * "watching" from "using the controls" and not disappear mid-scrub.
 */
@Composable
internal fun VideoControls(player: ExoPlayer, onInteract: () -> Unit = {}) {
    var playing by remember(player) { mutableStateOf(player.isPlaying) }
    var position by remember(player) { mutableLongStateOf(0L) }
    var duration by remember(player) { mutableLongStateOf(0L) }
    var buffering by remember(player) { mutableStateOf(false) }
    var scrub by remember(player) { mutableStateOf<Float?>(null) }
    var muted by remember(player) { mutableStateOf(player.volume == 0f) }
    var speed by remember(player) { mutableFloatStateOf(player.playbackParameters.speed) }

    DisposableEffect(player) {
        val listener = object : Player.Listener {
            override fun onIsPlayingChanged(isPlaying: Boolean) { playing = isPlaying }
            override fun onPlaybackStateChanged(state: Int) { buffering = state == Player.STATE_BUFFERING }
        }
        player.addListener(listener)
        onDispose { player.removeListener(listener) }
    }

    // ExoPlayer has no position callback — the scrubber has to poll. Only while the
    // controls are actually on screen, which is exactly the lifetime of this composable.
    LaunchedEffect(player) {
        while (true) {
            if (scrub == null) position = player.currentPosition.coerceAtLeast(0L)
            duration = player.duration.takeIf { it > 0L } ?: 0L
            delay(200)
        }
    }

    Column(Modifier.fillMaxWidth().padding(horizontal = 12.dp)) {
        Slider(
            value = scrub ?: position.toFloat(),
            onValueChange = { onInteract(); scrub = it },
            onValueChangeFinished = {
                scrub?.let { player.seekTo(it.toLong()) }
                scrub = null
                onInteract()
            },
            valueRange = 0f..duration.coerceAtLeast(1L).toFloat(),
            enabled = duration > 0L,
            colors = whiteSlider(),
        )
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = { onInteract(); if (playing) player.pause() else player.play() }) {
                if (buffering) {
                    CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp, modifier = Modifier.size(20.dp))
                } else {
                    Icon(
                        if (playing) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                        contentDescription = if (playing) "Pause" else "Play",
                        tint = Color.White,
                    )
                }
            }
            IconButton(onClick = {
                onInteract()
                player.seekTo((player.currentPosition - SEEK_STEP_MS).coerceAtLeast(0L))
            }) {
                Icon(Icons.Filled.Replay10, contentDescription = "Back 10 seconds", tint = Color.White)
            }
            IconButton(onClick = { onInteract(); player.seekTo(player.currentPosition + SEEK_STEP_MS) }) {
                Icon(Icons.Filled.Forward10, contentDescription = "Forward 10 seconds", tint = Color.White)
            }
            Text(
                "${formatTime((scrub?.toLong() ?: position))} / ${formatTime(duration)}",
                color = Color.White,
                style = MaterialTheme.typography.labelSmall,
                modifier = Modifier.padding(start = 4.dp),
            )
            Spacer(Modifier.weight(1f))
            TextButton(onClick = {
                onInteract()
                speed = nextSpeed(speed)
                player.setPlaybackSpeed(speed)
            }) {
                Text(formatSpeedLabel(speed), color = Color.White, style = MaterialTheme.typography.labelMedium)
            }
            IconButton(onClick = {
                onInteract()
                muted = !muted
                player.volume = if (muted) 0f else 1f
            }) {
                Icon(
                    if (muted) Icons.AutoMirrored.Filled.VolumeOff else Icons.AutoMirrored.Filled.VolumeUp,
                    contentDescription = if (muted) "Unmute" else "Mute",
                    tint = Color.White,
                )
            }
        }
    }
}

private const val SEEK_STEP_MS = 10_000L

private fun formatTime(ms: Long): String {
    val total = (ms / 1000).coerceAtLeast(0)
    val h = total / 3600
    val m = (total % 3600) / 60
    val s = total % 60
    return if (h > 0) "%d:%02d:%02d".format(h, m, s) else "%d:%02d".format(m, s)
}

// ── chrome ───────────────────────────────────────────────────────────────────

/**
 * The bars over the media: title and actions on top; the per-kind controls and the
 * metadata line at the bottom. Tags hang off a dropdown rather than being laid out
 * over the media — a comic page or a video frame is the thing you came to look at,
 * and a wall of chips was covering it.
 */
@Composable
private fun Chrome(
    repo: Repository,
    media: Media,
    index: Int,
    count: Int,
    onClose: () -> Unit,
    onChanged: (Media) -> Unit,
    onDetail: (Media) -> Unit,
    onSearchTag: (String) -> Unit,
    onDelete: (Media) -> Unit,
    /** The "up next" carousel, drawn above the controls. Empty for kinds that get none. */
    upNext: @Composable () -> Unit,
    controls: @Composable () -> Unit,
) {
    var tagging by remember { mutableStateOf(false) }
    var menu by remember { mutableStateOf(false) }
    var editing by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    /**
     * Sends an edit and adopts what comes back. The response is the row as it now
     * stands — tags included — so it's the item, not a guess at it: no local
     * reconstruction to drift out of step with the server.
     */
    fun patch(change: MediaPatch) {
        scope.launch {
            runCatching { repo.api.patchMedia(media.id, change) }.onSuccess {
                onDetail(it)
                onChanged(it)
            }
        }
    }

    // The bars sit over the media, and a bar is not the media: swallow taps that land
    // on one. Without this they'd fall through to the page beneath — which for a comic
    // means brushing the metadata line would turn the page.
    val swallowTaps = Modifier.pointerInput(Unit) { detectTapGestures { } }

    if (editing) {
        EditMediaDialog(
            media = media,
            repo = repo,
            onDismiss = { editing = false },
            onSave = { change -> editing = false; patch(change) },
        )
    }

    Column(Modifier.fillMaxSize()) {
        Row(
            Modifier.fillMaxWidth().background(Color(0x99000000)).then(swallowTaps)
                .windowInsetsPadding(WindowInsets.statusBars).padding(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                media.title.ifEmpty { media.kind },
                color = Color.White,
                maxLines = 1,
                modifier = Modifier.weight(1f).padding(start = 8.dp),
            )
            Text(
                "${index + 1}/$count",
                color = Color.White,
                style = MaterialTheme.typography.labelSmall,
                modifier = Modifier.padding(end = 8.dp),
            )
            IconButton(onClick = { patch(MediaPatch(favorite = !media.favorite)) }) {
                Icon(
                    if (media.favorite) Icons.Filled.Favorite else Icons.Filled.FavoriteBorder,
                    contentDescription = if (media.favorite) "Remove from favorites" else "Add to favorites",
                    tint = if (media.favorite) Color(0xFFE91E63) else Color.White,
                )
            }
            IconButton(enabled = !tagging, onClick = {
                tagging = true
                scope.launch {
                    runCatching { repo.api.autotag(media.id) }
                        .onSuccess {
                            val updated = media.copy(tags = it.tags)
                            onDetail(updated)
                            onChanged(updated)
                            Toast.makeText(context, if (it.tags.isEmpty()) "Tagging finished; no confident tags found" else "Tags refreshed: ${it.tags.size} found", Toast.LENGTH_SHORT).show()
                        }
                        .onFailure { Toast.makeText(context, "Auto-tagging failed: ${it.message ?: "unknown error"}", Toast.LENGTH_LONG).show() }
                    tagging = false
                }
            }) {
                if (tagging) CircularProgressIndicator(Modifier.size(22.dp), color = Color.White, strokeWidth = 2.dp)
                else Icon(Icons.Filled.AutoAwesome, "Auto-tag", tint = Color.White)
            }
            // Edit and delete moved behind an overflow: the top bar had run out of room
            // once favouriting earned a place on it, and of the three, deleting is the
            // one that should take an extra tap.
            Box {
                IconButton(onClick = { menu = true }) {
                    Icon(Icons.Filled.MoreVert, "More", tint = Color.White)
                }
                DropdownMenu(expanded = menu, onDismissRequest = { menu = false }) {
                    DropdownMenuItem(
                        text = { Text("Download to device") },
                        leadingIcon = { Icon(Icons.Filled.Download, contentDescription = null) },
                        onClick = {
                            menu = false
                            if (DownloadQueue.enqueue(media)) {
                                DownloadWorker.start(context)
                                Toast.makeText(context, "Added to Downloads", Toast.LENGTH_SHORT).show()
                            } else {
                                Toast.makeText(context, "Already in Downloads", Toast.LENGTH_SHORT).show()
                            }
                        },
                    )
                    DropdownMenuItem(
                        text = { Text("Edit details") },
                        leadingIcon = { Icon(Icons.Filled.Edit, contentDescription = null) },
                        onClick = { menu = false; editing = true },
                    )
                    DropdownMenuItem(
                        text = { Text("Delete", color = MaterialTheme.colorScheme.error) },
                        leadingIcon = {
                            Icon(
                                Icons.Filled.Delete,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.error,
                            )
                        },
                        onClick = { menu = false; onDelete(media) },
                    )
                }
            }
            IconButton(onClick = onClose) { Icon(Icons.Filled.Close, "Close", tint = Color.White) }
        }

        Box(Modifier.weight(1f))

        Column(
            Modifier.fillMaxWidth().background(Color(0x99000000)).then(swallowTaps)
                .windowInsetsPadding(WindowInsets.navigationBars),
        ) {
            upNext()
            controls()
            Row(
                Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                // Tapping the star you're already on clears the rating — otherwise a
                // one-star item could never go back to being unrated.
                StarRating(media.rating) { stars ->
                    patch(MediaPatch(rating = if (stars == media.rating) 0 else stars))
                }
                Spacer(Modifier.weight(1f))
                TagsDropdown(media, tagging, onSearchTag)
            }
            Row(
                Modifier.fillMaxWidth().padding(start = 12.dp, end = 12.dp, bottom = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                val meta = buildString {
                    append(media.kind)
                    append(" · ${"%.1f".format(media.size / 1_000_000.0)} MB")
                    if (media.width != null) append(" · ${media.width}×${media.height}")
                    if (media.pageCount != null) append(" · ${media.pageCount} pages")
                }
                Text(meta, style = MaterialTheme.typography.labelSmall, color = Color.White)
            }
        }
    }
}

/** Five stars, tappable. Zero is unrated, which is what a fresh import always is. */
@Composable
private fun StarRating(rating: Int, onRate: (Int) -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        (1..5).forEach { star ->
            IconButton(onClick = { onRate(star) }, modifier = Modifier.size(32.dp)) {
                Icon(
                    if (star <= rating) Icons.Filled.Star else Icons.Filled.StarBorder,
                    contentDescription = "Rate $star",
                    tint = if (star <= rating) Color(0xFFFFC107) else Color(0x99FFFFFF),
                    modifier = Modifier.size(20.dp),
                )
            }
        }
    }
}

/** "Tags (n)" — a menu, so the tags are one tap away instead of over the media. */
@Composable
private fun TagsDropdown(media: Media, tagging: Boolean, onSearchTag: (String) -> Unit) {
    var open by remember(media.id) { mutableStateOf(false) }

    Box {
        TextButton(onClick = { if (media.tags.isNotEmpty()) open = true }, enabled = !tagging) {
            Icon(Icons.Filled.LocalOffer, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
            Text(
                when {
                    tagging -> "Tagging…"
                    media.tags.isEmpty() -> "No tags"
                    else -> "Tags (${media.tags.size})"
                },
                color = Color.White,
                style = MaterialTheme.typography.labelMedium,
                modifier = Modifier.padding(start = 6.dp),
            )
            if (media.tags.isNotEmpty()) {
                Icon(Icons.Filled.ArrowDropDown, contentDescription = null, tint = Color.White)
            }
        }

        DropdownMenu(expanded = open, onDismissRequest = { open = false }, modifier = Modifier.width(260.dp)) {
            // Grouped the way the scraper filed them — artist, character, parody — so a
            // long tag list stays legible instead of being one undifferentiated run.
            media.tags.groupBy { it.category }.toSortedMap().forEach { (category, tags) ->
                Text(
                    category,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                )
                tags.forEach { tag ->
                    DropdownMenuItem(
                        text = { Text(tag.name) },
                        onClick = { open = false; onSearchTag(tag.name) },
                    )
                }
                HorizontalDivider()
            }
        }
    }
}

@Composable
private fun whiteSlider() = SliderDefaults.colors(
    thumbColor = Color.White,
    activeTrackColor = Color.White,
    inactiveTrackColor = Color(0x66FFFFFF),
)
