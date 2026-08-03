package net.fourbakers.oppailib.ui

import android.app.Activity
import android.content.res.Configuration
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.PagerState
import androidx.compose.foundation.pager.VerticalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Comment
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Download
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.ui.PlayerView
import coil.compose.AsyncImage
import coil.request.ImageRequest
import kotlinx.coroutines.launch
import net.fourbakers.oppailib.data.Repository
import net.fourbakers.oppailib.data.SourceItem
import net.fourbakers.oppailib.data.SourceSaveRequest

/**
 * The viewer for a *remote* item. Same feed gesture as the library's viewer, but
 * nothing here is in the library: media streams from the origin through the server's
 * proxy, and the only way it lands on disk is the save button.
 *
 * The player is hoisted here rather than owned by the page it renders into, for the
 * same reason it is in the library's viewer: its controls belong to the chrome, which
 * is drawn over the feed and so can't reach into a page's state. That is not just tidy.
 * While the page owned the player it also drew media3's *own* controller — a second
 * seek bar, pinned to the bottom of the video, directly underneath the chrome's up-next
 * carousel. The two were laid over each other, and the one you could see was not the
 * one your thumb landed on.
 */
@Composable
fun RemoteViewerScreen(
    repo: Repository,
    sourceId: String,
    items: List<SourceItem>,
    startIndex: Int,
    onClose: () -> Unit,
    onSaved: () -> Unit,
    onSaveFailed: (String) -> Unit,
) {
    if (items.isEmpty()) { onClose(); return }

    val feed = rememberPagerState(initialPage = startIndex.coerceIn(0, items.lastIndex)) { items.size }
    var chrome by remember { mutableStateOf(true) }
    val isLandscape = LocalConfiguration.current.orientation == Configuration.ORIENTATION_LANDSCAPE
    val scope = rememberCoroutineScope()

    val view = LocalView.current
    DisposableEffect(Unit) {
        val window = (view.context as Activity).window
        val controller = WindowCompat.getInsetsController(window, view)
        val bars = WindowInsetsCompat.Type.systemBars()
        controller.hide(bars)
        onDispose { controller.show(bars) }
    }

    val settled = items.getOrNull(feed.settledPage)
    val saving = remember { mutableStateMapOf<String, Boolean>() }
    val saved = remember { mutableStateMapOf<String, Boolean>() }

    val player = rememberRemotePlayer(repo, sourceId, settled)
    // Hoisted like the player, and for the same reason: its page scrubber lives in the
    // chrome, which is drawn over the feed and so can't reach into a page's own state.
    val comic = rememberRemoteComicReader(repo, sourceId, settled)

    // The chrome takes itself away over a playing video; touching it puts the wait back.
    var poke by remember { mutableIntStateOf(0) }
    // True while the up-next strip is being scrubbed; the chrome must not auto-hide then.
    var browsingUpNext by remember { mutableStateOf(false) }
    LaunchedEffect(isLandscape) { if (isLandscape) browsingUpNext = false }
    val playing = playingState(player)
    ChromeAutoHide(active = chrome && playing && !browsingUpNext, poke = poke) { chrome = false }

    // The thread whose comments are open over the viewer, if any.
    var commentsFor by remember { mutableStateOf<SourceItem?>(null) }

    // Android back leaves the viewer, matching the chrome's X. If a comments sheet is
    // open over it, back closes that first — one step at a time, rather than dropping
    // straight out of the browse.
    BackHandler {
        if (commentsFor != null) commentsFor = null else onClose()
    }

    commentsFor?.let { item ->
        CommentsSheet(
            repo = repo,
            sourceId = sourceId,
            item = item,
            onDismiss = { commentsFor = null },
            // A file in the thread is a file in this feed — the ids are the same ones —
            // so "open that video" is just a jump to its page. A post whose file isn't
            // in the feed (it 404'd, or the page hasn't loaded) leaves us where we are,
            // which beats swiping the reader to something arbitrary.
            onOpen = { c ->
                val at = items.indexOfFirst { it.id == c.itemId }
                if (at >= 0) {
                    chrome = true
                    scope.launch { feed.scrollToPage(at) }
                }
            },
        )
    }

    Box(Modifier.fillMaxSize().background(Color.Black)) {
        VerticalPager(
            state = feed,
            modifier = Modifier.fillMaxSize(),
            beyondViewportPageCount = 1,
        ) { page ->
            RemotePage(
                repo = repo,
                item = items[page],
                active = feed.settledPage == page,
                player = player,
                comic = comic,
                onToggleChrome = { chrome = !chrome },
            )
        }

        if (chrome && settled != null) {
            Column(Modifier.fillMaxSize()) {
                Row(
                    Modifier.fillMaxWidth().background(Color(0x99000000))
                        .pointerInput(Unit) { detectTapGestures { } }
                        .windowInsetsPadding(WindowInsets.statusBars).padding(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        settled.title,
                        color = Color.White,
                        maxLines = 1,
                        modifier = Modifier.weight(1f).padding(start = 8.dp),
                    )
                    Text(
                        "${feed.currentPage + 1}/${items.size}",
                        color = Color.White,
                        style = MaterialTheme.typography.labelSmall,
                        modifier = Modifier.padding(end = 8.dp),
                    )
                    // On 4chan the picture is half the post; the thread is the other half.
                    if (settled.hasComments) {
                        IconButton(onClick = { commentsFor = settled }) {
                            Icon(
                                Icons.AutoMirrored.Filled.Comment,
                                contentDescription = "Read the comments",
                                tint = Color.White,
                            )
                        }
                    }
                    IconButton(
                        enabled = saving[settled.id] != true && saved[settled.id] != true,
                        onClick = {
                            saving[settled.id] = true
                            scope.launch {
                                runCatching {
                                    repo.api.saveFromSource(
                                        sourceId,
                                        SourceSaveRequest(
                                            mediaUrl = settled.mediaUrl.ifEmpty { null },
                                            itemId = settled.id,
                                            pageUrl = settled.pageUrl.ifEmpty { null },
                                            title = settled.title.ifEmpty { null },
                                            kind = settled.kind,
                                            tags = settled.tags,
                                        ),
                                    )
                                }.onSuccess {
                                    saved[settled.id] = true
                                    onSaved()
                                }.onFailure {
                                    onSaveFailed(it.message ?: "Couldn't save that")
                                }
                                saving[settled.id] = false
                            }
                        },
                    ) {
                        if (saving[settled.id] == true) {
                            CircularProgressIndicator(
                                color = Color.White,
                                strokeWidth = 2.dp,
                                modifier = Modifier.size(20.dp),
                            )
                        } else {
                            Icon(
                                Icons.Filled.Download,
                                contentDescription = "Save to library",
                                tint = if (saved[settled.id] == true) Color(0xFF4CAF50) else Color.White,
                            )
                        }
                    }
                    IconButton(onClick = onClose) {
                        Icon(Icons.Filled.Close, "Close", tint = Color.White)
                    }
                }

                Box(Modifier.weight(1f))

                Column(
                    Modifier.fillMaxWidth().background(Color(0x99000000))
                        .pointerInput(Unit) { detectTapGestures { } }
                        .windowInsetsPadding(WindowInsets.navigationBars),
                ) {
                    // Tapping the video brings the chrome up; the chrome says what's next.
                    if (!isLandscape && settled.kind == "video") {
                        val videoItems = items.mapIndexedNotNull { index, item ->
                            if (item.kind == "video") index to item else null
                        }
                        val videoCurrent = videoItems.indexOfFirst { it.first == feed.settledPage }
                        UpNextStrip(
                            repo = repo,
                            items = videoItems.map { (_, it) ->
                                StripItem(
                                    key = it.id,
                                    title = it.title,
                                    thumbUrl = repo.sourceStreamUrl(it.thumbUrl),
                                    isVideo = it.kind == "video",
                                )
                            },
                            current = videoCurrent,
                            onPick = { at -> poke++; scope.launch { feed.scrollToPage(videoItems[at].first) } },
                            onBrowsing = { browsingUpNext = it; if (!it) poke++ },
                        )
                    }
                    // The same transport the library's viewer has, and the only one on
                    // screen: the player itself draws no controller (see RemoteVideo).
                    if (settled.kind == "video" && player != null) {
                        VideoControls(player) { poke++ }
                    }
                    // A comic gets the same page scrubber the library reader has, so a
                    // browsed gallery can be jumped through instead of swiped one page at
                    // a time.
                    if (settled.kind == "comic" && comic != null && comic.readable) {
                        ComicScrubber(
                            pages = comic.pager,
                            pageCount = comic.pageCount,
                            rtl = comic.rtl,
                            stateKey = comic.item.id,
                            onToggleRtl = { comic.setRtl(!comic.rtl) },
                        )
                    }
                    Text(
                        settled.kind + (if (settled.width > 0) " · ${settled.width}×${settled.height}" else ""),
                        color = Color.White,
                        style = MaterialTheme.typography.labelSmall,
                        modifier = Modifier.padding(12.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun RemotePage(
    repo: Repository,
    item: SourceItem,
    active: Boolean,
    player: ExoPlayer?,
    comic: RemoteComicReader?,
    onToggleChrome: () -> Unit,
) {
    when {
        // Only the settled comic gets the hoisted reader (its pager is what the chrome's
        // scrubber drives); a neighbour the pager keeps warm shows its cover instead.
        item.kind == "comic" && active && comic != null && comic.item.id == item.id ->
            RemoteComicPages(repo, comic, onToggleChrome)
        item.kind == "comic" -> ZoomableRemoteImage(repo, item.thumbUrl, item.title, onToggleChrome)
        // Only the settled page gets the player; the neighbours the pager keeps warm
        // show their thumbnail, so swiping never leaves a video running behind you.
        item.kind == "video" && active && player != null -> RemoteVideo(player, onToggleChrome)
        else -> ZoomableRemoteImage(
            repo = repo,
            url = item.mediaUrl.ifEmpty { item.thumbUrl },
            contentDescription = item.title,
            onTap = onToggleChrome,
        )
    }
}

/**
 * The open remote comic: its resolved page URLs and the pager the chrome's scrubber
 * drives. Hoisted out of [RemoteComicPages] so the scrubber can reach it, mirroring the
 * library viewer's ComicReader.
 */
private class RemoteComicReader(
    val item: SourceItem,
    val pages: List<String>?,
    val error: String?,
    val pager: PagerState,
    val rtl: Boolean,
    val setRtl: (Boolean) -> Unit,
) {
    val readable: Boolean get() = pages?.isNotEmpty() == true
    val pageCount: Int get() = pages?.size ?: 0
}

/** Resolves [item]'s pages through the server and holds the reader state. Null for non-comics. */
@Composable
private fun rememberRemoteComicReader(repo: Repository, sourceId: String, item: SourceItem?): RemoteComicReader? {
    if (item == null || item.kind != "comic") return null

    var pages by remember(item.id) { mutableStateOf<List<String>?>(null) }
    var error by remember(item.id) { mutableStateOf<String?>(null) }
    var rtl by remember { mutableStateOf(repo.prefs.comicRtl) }

    LaunchedEffect(item.id) {
        runCatching { repo.api.sourcePages(sourceId, item.id).pages }
            .onSuccess { pages = it }
            .onFailure { error = it.message ?: "Couldn't open that gallery" }
    }

    // The pager has to exist before the pages land (it's what the reader renders into),
    // so it starts empty and the count fills in underneath it.
    val pager = key(item.id) { rememberPagerState(initialPage = 0) { pages?.size ?: 0 } }

    return RemoteComicReader(
        item = item,
        pages = pages,
        error = error,
        pager = pager,
        rtl = rtl,
        setRtl = { rtl = it; repo.prefs.comicRtl = it },
    )
}

/** A remote comic, read in place: the server resolves its pages, we stream them. */
@Composable
private fun RemoteComicPages(repo: Repository, comic: RemoteComicReader, onToggleChrome: () -> Unit) {
    val loaded = comic.pages
    LaunchedEffect(loaded, comic.pager.settledPage) {
        val pages = loaded ?: return@LaunchedEffect
        val from = comic.pager.settledPage + 1
        repo.prefetchImages(pages.drop(from).take(4).map(repo::sourceStreamUrl))
    }
    when {
        comic.error != null -> Box(Modifier.fillMaxSize(), Alignment.Center) {
            Text(comic.error ?: "", color = Color.White)
        }
        loaded == null -> Box(Modifier.fillMaxSize(), Alignment.Center) {
            CircularProgressIndicator(color = Color.White)
        }
        else -> androidx.compose.runtime.CompositionLocalProvider(
            androidx.compose.ui.platform.LocalLayoutDirection provides
                if (comic.rtl) androidx.compose.ui.unit.LayoutDirection.Rtl
                else androidx.compose.ui.unit.LayoutDirection.Ltr,
        ) {
            HorizontalPager(
                state = comic.pager,
                modifier = Modifier.fillMaxSize(),
                // Keep two pages either side warm rather than one. A remote page is a
                // round trip to the origin through our proxy, so a reader that only holds
                // the neighbour stalls on every *other* turn once you get going.
                beyondViewportPageCount = 2,
            ) { page ->
                ZoomableRemoteImage(
                    repo = repo,
                    url = loaded[page],
                    contentDescription = "Page ${page + 1}",
                    onTap = onToggleChrome,
                )
            }
        }
    }
}

@Composable
private fun ZoomableRemoteImage(repo: Repository, url: String, contentDescription: String?, onTap: () -> Unit) {
    var loading by remember(url) { mutableStateOf(true) }
    Box(
        Modifier.fillMaxSize().pointerInput(url) { detectTapGestures { onTap() } },
        Alignment.Center,
    ) {
        AsyncImage(
            model = ImageRequest.Builder(LocalContext.current)
                .data(repo.sourceStreamUrl(url)).crossfade(true).build(),
            imageLoader = repo.imageLoader,
            contentDescription = contentDescription,
            contentScale = androidx.compose.ui.layout.ContentScale.Fit,
            onLoading = { loading = true },
            onSuccess = { loading = false },
            onError = { loading = false },
            modifier = Modifier.fillMaxSize(),
        )
        if (loading) CircularProgressIndicator(color = Color.White)
    }
}

/**
 * The player for the settled item, or null when that item isn't a video. Rebuilt on
 * every item change and released with it, so at most one player exists at a time.
 */
@androidx.annotation.OptIn(UnstableApi::class)
@Composable
private fun rememberRemotePlayer(repo: Repository, sourceId: String, item: SourceItem?): ExoPlayer? {
    val context = LocalContext.current
    val prefs = repo.prefs
    val url = item?.takeIf { it.kind == "video" }?.mediaUrl?.takeIf { it.isNotEmpty() }

    val player = remember(sourceId, url) {
        if (url == null) return@remember null
        // The stream goes through our own server, so it needs our bearer token — the
        // origin never sees the phone.
        val http = DefaultHttpDataSource.Factory().apply {
            prefs.token?.let { setDefaultRequestProperties(mapOf("Authorization" to "Bearer $it")) }
            // Resolving a stable Hanime page URL and opening its remote MP4 can take
            // longer than Media3's short defaults on a mobile connection.
            setConnectTimeoutMs(15_000)
            setReadTimeoutMs(120_000)
        }
        val mediaItem = MediaItem.Builder()
            .setUri(repo.sourceStreamUrl(url))
            // The proxy URL has no extension. Hanime guarantees a guest MP4, so tell
            // Media3 what it is instead of asking it to infer a container from /stream.
            .apply { if (sourceId == "hanime") setMimeType(MimeTypes.VIDEO_MP4) }
            .build()
        ExoPlayer.Builder(context)
            .setMediaSourceFactory(DefaultMediaSourceFactory(http))
            .build().apply {
                setMediaItem(mediaItem)
                repeatMode = if (prefs.videoLoop) Player.REPEAT_MODE_ONE else Player.REPEAT_MODE_OFF
                volume = if (prefs.videoMuted) 0f else 1f
                prepare()
                playWhenReady = prefs.videoAutoplay
            }
    }
    // Nothing about a browsed video is worth keeping once you've swiped past it.
    DisposableEffect(player) {
        onDispose { player?.run { stop(); clearMediaItems(); release() } }
    }
    return player
}

@androidx.annotation.OptIn(UnstableApi::class)
@Composable
private fun RemoteVideo(player: ExoPlayer, onToggleChrome: () -> Unit) {
    var loading by remember(player) {
        mutableStateOf(player.playbackState == Player.STATE_IDLE || player.playbackState == Player.STATE_BUFFERING)
    }
    var failed by remember(player) { mutableStateOf(false) }
    DisposableEffect(player) {
        val listener = object : Player.Listener {
            override fun onPlaybackStateChanged(state: Int) {
                loading = state == Player.STATE_IDLE || state == Player.STATE_BUFFERING
                if (state == Player.STATE_READY) failed = false
            }

            override fun onPlayerError(error: PlaybackException) {
                loading = false
                failed = true
            }
        }
        player.addListener(listener)
        onDispose { player.removeListener(listener) }
    }
    Box(Modifier.fillMaxSize().pointerInput(player) { detectTapGestures { onToggleChrome() } }) {
        AndroidView(
            factory = { ctx ->
                PlayerView(ctx).apply {
                    this.player = player
                    // The chrome's own controls drive this. media3's controller would
                    // draw a second seek bar along the bottom of the video, under the
                    // chrome's carousel and fighting it for the same touches.
                    useController = false
                    setBackgroundColor(android.graphics.Color.BLACK)
                }
            },
            modifier = Modifier.fillMaxSize(),
        )
        when {
            failed -> Column(Modifier.align(Alignment.Center), horizontalAlignment = Alignment.CenterHorizontally) {
                Text("Couldn't load this video", color = Color.White)
                Button(
                    onClick = {
                        failed = false
                        loading = true
                        player.prepare()
                        player.play()
                    },
                    modifier = Modifier.padding(top = 12.dp),
                ) { Text("Retry") }
            }
            loading -> CircularProgressIndicator(color = Color.White, modifier = Modifier.align(Alignment.Center))
        }
    }
}
