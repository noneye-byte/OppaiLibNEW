package net.fourbakers.oppailib.ui

import android.content.Intent
import android.net.Uri
import androidx.annotation.OptIn
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.staggeredgrid.LazyVerticalStaggeredGrid
import androidx.compose.foundation.lazy.staggeredgrid.StaggeredGridCells
import androidx.compose.foundation.lazy.staggeredgrid.StaggeredGridItemSpan
import androidx.compose.foundation.lazy.staggeredgrid.items
import androidx.compose.foundation.lazy.staggeredgrid.rememberLazyStaggeredGridState
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.OpenInNew
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.ChatBubbleOutline
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Face
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.PushPin
import androidx.compose.material.icons.filled.SentimentSatisfied
import androidx.compose.material.icons.filled.ThumbUp
import androidx.compose.material.icons.filled.ViewModule
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.fromHtml
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import coil.compose.AsyncImage
import kotlinx.coroutines.launch
import net.fourbakers.oppailib.data.CivitaiComment
import net.fourbakers.oppailib.data.CivitaiImage
import net.fourbakers.oppailib.data.CivitaiModel
import net.fourbakers.oppailib.data.CivitaiPrompt
import net.fourbakers.oppailib.data.CivitaiVersion
import net.fourbakers.oppailib.data.PromptSettings
import net.fourbakers.oppailib.data.Repository
import net.fourbakers.oppailib.data.civitaiCommentSorts
import net.fourbakers.oppailib.data.civitaiSized
import net.fourbakers.oppailib.data.compactNumber
import net.fourbakers.oppailib.data.mergeCivitaiComments
import net.fourbakers.oppailib.data.mergeCivitaiImages
import net.fourbakers.oppailib.data.postPictures
import net.fourbakers.oppailib.data.reactionsOf
import net.fourbakers.oppailib.data.serverMessage
import net.fourbakers.oppailib.data.timeAgo
import net.fourbakers.oppailib.ui.theme.LocalInk

/*
 * Civitai browsed the way the site is (0.96 on the web): a model opens as a page with
 * its showcase beside what to install, its description, its discussion and the gallery
 * of every picture people made with it; a picture opens with the rest of its post, who
 * posted it, its reactions, the prompt and LoRAs behind it, and its comments; a person
 * opens to everything they posted. These used to be three stacked dialogs on the phone,
 * a model's "Pictures" button opening a gallery opening a picture.
 */

private fun reactionIcon(kind: String): ImageVector = when (kind) {
    "likes" -> Icons.Filled.ThumbUp
    "hearts" -> Icons.Filled.Favorite
    "laughs" -> Icons.Filled.SentimentSatisfied
    else -> Icons.Filled.Face
}

/** A Civitai picture through the server's proxy, asked of the CDN at [width]. */
private fun Repository.civitaiAt(url: String, width: Int) = civitaiImageUrl(civitaiSized(url, width))

// ── a comment section ────────────────────────────────────────────────────────

/**
 * One comment section — a model's, a post's or a picture's — in reading order, each
 * comment followed by the replies the page opened, indented under it. Needs the Civitai
 * key; without one the server's sentence says so in its place.
 */
@Composable
internal fun CivitaiThread(repo: Repository, entity: String, id: Long, modifier: Modifier = Modifier) {
    var items by remember(entity, id) { mutableStateOf<List<CivitaiComment>>(emptyList()) }
    var cursor by remember(entity, id) { mutableStateOf("") }
    var sort by remember(entity, id) { mutableStateOf("newest") }
    var loading by remember(entity, id) { mutableStateOf(false) }
    var loaded by remember(entity, id) { mutableStateOf(false) }
    var error by remember(entity, id) { mutableStateOf("") }
    val scope = rememberCoroutineScope()

    suspend fun load(reset: Boolean) {
        loading = true
        runCatching { repo.web.civitaiThread(entity, id, sort, if (reset) null else cursor.ifBlank { null }) }
            .onSuccess { page ->
                items = if (reset) page.items else mergeCivitaiComments(items, page.items)
                cursor = page.nextCursor
                error = ""
            }
            .onFailure { error = it.serverMessage("Civitai didn't send the comments.") }
        loading = false
        loaded = true
    }
    LaunchedEffect(entity, id, sort) { load(reset = true) }

    Column(modifier, verticalArrangement = Arrangement.spacedBy(10.dp)) {
        InkChipRow(padding = PaddingValues(0.dp)) {
            civitaiCommentSorts.forEach { (sid, label) -> InkChip(label, sort == sid, { sort = sid }, small = true) }
        }
        when {
            error.isNotEmpty() -> Text(error, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            !loaded -> Box(Modifier.fillMaxWidth().height(60.dp), Alignment.Center) { CircularProgressIndicator(Modifier.size(22.dp), strokeWidth = 2.dp) }
            items.isEmpty() -> Text("No comments yet.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        items.forEach { c -> CommentRow(repo, c) }
        if (cursor.isNotEmpty() && error.isEmpty()) {
            TextButton(onClick = { scope.launch { load(reset = false) } }, enabled = !loading) {
                Text(if (loading) "Loading…" else "More comments")
            }
        }
    }
}

@Composable
private fun CommentRow(repo: Repository, c: CivitaiComment) {
    val c2 = MaterialTheme.colorScheme
    Row(Modifier.fillMaxWidth().padding(start = (c.depth.coerceAtMost(6) * 16).dp)) {
        if (c.avatar.isNotBlank()) AsyncImage(
            model = repo.civitaiAt(c.avatar, 96),
            imageLoader = repo.imageLoader,
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.size(if (c.depth > 0) 26.dp else 32.dp).clip(CircleShape),
        ) else Initials(c.user, size = if (c.depth > 0) 26.dp else 32.dp)
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(c.user.ifBlank { "Someone" }, style = MaterialTheme.typography.labelLarge, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f, fill = false))
                if (c.pinned) {
                    Spacer(Modifier.width(6.dp))
                    Icon(Icons.Filled.PushPin, contentDescription = "Pinned", tint = c2.primary, modifier = Modifier.size(14.dp))
                }
                val ago = timeAgo(c.createdAt)
                if (ago.isNotEmpty()) Text("  ·  $ago", style = MaterialTheme.typography.labelSmall, color = c2.onSurfaceVariant)
            }
            Text(AnnotatedString.fromHtml(c.html), style = MaterialTheme.typography.bodySmall)
            val bits = listOfNotNull(
                c.likes.takeIf { it > 0 }?.let { "♥ $it" },
                c.moreReplies.takeIf { it > 0 }?.let { "$it more ${if (it == 1) "reply" else "replies"} on the site" },
            )
            if (bits.isNotEmpty()) Text(bits.joinToString("   "), style = MaterialTheme.typography.labelSmall, color = c2.onSurfaceVariant, modifier = Modifier.padding(top = 2.dp))
        }
    }
}

// ── a model's page ───────────────────────────────────────────────────────────

/**
 * One model as a page: the showcase, what to install and its files, the trigger words,
 * the tags, what its author wrote (folded when long), the discussion, and the gallery of
 * pictures people posted with the version on screen, loading on as it is scrolled.
 */
@OptIn(UnstableApi::class)
@kotlin.OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun CivitaiModelPage(
    repo: Repository,
    id: Long,
    seed: CivitaiModel?,
    nsfw: Boolean,
    canManage: Boolean,
    onBack: () -> Unit,
    onInstall: (CivitaiModel, CivitaiVersion) -> Unit,
    onUsePrompt: (PromptSettings) -> Unit,
    onCreator: (String) -> Unit,
    onPerson: (String) -> Unit,
    onTag: (String) -> Unit,
) {
    var model by remember(id) { mutableStateOf(seed) }
    var versionId by remember(id) { mutableStateOf(seed?.versions?.firstOrNull()?.id ?: 0L) }
    var shown by remember(id) { mutableStateOf(seed?.versions?.firstOrNull()?.images?.firstOrNull() ?: "") }
    var zoomed by remember { mutableStateOf("") }
    var loadError by remember { mutableStateOf("") }
    var descOpen by remember(id) { mutableStateOf(false) }
    var gallery by remember(id) { mutableStateOf<List<CivitaiImage>>(emptyList()) }
    var galleryCursor by remember(id) { mutableStateOf("") }
    var galleryLoading by remember { mutableStateOf(false) }
    var gallerySort by remember { mutableStateOf("") }
    var promptsNeedKey by remember { mutableStateOf(false) }
    var viewing by remember { mutableStateOf<Int?>(null) }
    val clipboard = LocalClipboardManager.current
    val scope = rememberCoroutineScope()
    val grid = rememberLazyStaggeredGridState()
    androidx.activity.compose.BackHandler(enabled = viewing == null) { onBack() }

    LaunchedEffect(id) {
        runCatching { repo.api.civitaiModel(id) }
            .onSuccess { full ->
                model = full
                val v = full.versions.find { it.id == versionId } ?: full.versions.firstOrNull()
                versionId = v?.id ?: 0L
                if (shown.isEmpty()) shown = v?.images?.firstOrNull() ?: ""
            }
            .onFailure { loadError = it.serverMessage("Couldn't load the model page") }
    }
    suspend fun loadGallery(reset: Boolean) {
        if (galleryLoading || versionId == 0L || (!reset && galleryCursor.isEmpty())) return
        val asked = versionId
        galleryLoading = true
        runCatching {
            repo.api.civitaiImages(versionId = asked, sort = gallerySort.ifBlank { null }, nsfw = if (nsfw) null else "0",
                cursor = if (reset) null else galleryCursor.ifBlank { null })
        }.onSuccess { res ->
            if (asked != versionId) return@onSuccess
            gallery = if (reset) res.items else mergeCivitaiImages(gallery, res.items)
            galleryCursor = res.nextCursor
            promptsNeedKey = res.items.isNotEmpty() && res.withPrompts == 0 && !res.keySet
        }.onFailure { repo.report(it.serverMessage("Couldn't load the pictures")) }
        galleryLoading = false
    }
    LaunchedEffect(versionId, gallerySort) { if (versionId != 0L) loadGallery(reset = true) }
    val nearEnd by remember { derivedStateOf { (grid.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0) >= grid.layoutInfo.totalItemsCount - 8 } }
    LaunchedEffect(nearEnd, gallery.size) { if (nearEnd && gallery.isNotEmpty()) loadGallery(reset = false) }

    val m = model
    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        PageTop(
            title = m?.name ?: "Model",
            insets = false,
            navigation = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back to Civitai") } },
        ) {
            OpenOnSite("https://civitai.com/models/$id")
        }
        Hairline()
        if (m == null) {
            Box(Modifier.fillMaxSize(), Alignment.Center) {
                if (loadError.isNotEmpty()) EmptyNote(loadError) else CircularProgressIndicator()
            }
            return@Column
        }
        val v = m.versions.find { it.id == versionId }
        LazyVerticalStaggeredGrid(
            state = grid,
            columns = StaggeredGridCells.Adaptive(150.dp),
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 32.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalItemSpacing = 8.dp,
        ) {
            // ── the showcase ──
            item(span = StaggeredGridItemSpan.FullLine) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Box(
                        Modifier.fillMaxWidth().aspectRatio(4f / 5f).clip(RoundedCornerShape(16.dp))
                            .background(MaterialTheme.colorScheme.surfaceContainer).clickable(enabled = shown.isNotEmpty()) { zoomed = shown },
                    ) {
                        if (shown.isNotEmpty()) AsyncImage(
                            model = repo.civitaiAt(shown, 900),
                            imageLoader = repo.imageLoader,
                            contentDescription = m.name,
                            contentScale = ContentScale.Fit,
                            modifier = Modifier.fillMaxSize(),
                        )
                    }
                    if ((v?.images?.size ?: 0) > 1) {
                        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            v!!.images.forEach { u ->
                                AsyncImage(
                                    model = repo.civitaiAt(u, 160),
                                    imageLoader = repo.imageLoader,
                                    contentDescription = null,
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier.size(54.dp, 70.dp).clip(RoundedCornerShape(8.dp))
                                        .then(if (u == shown) Modifier.border(2.dp, MaterialTheme.colorScheme.primary, RoundedCornerShape(8.dp)) else Modifier)
                                        .clickable { shown = u },
                                )
                            }
                        }
                    }
                }
            }
            // ── what it is, and what to install ──
            item(span = StaggeredGridItemSpan.FullLine) {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(m.name, style = MaterialTheme.typography.headlineSmall)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        if (m.creatorImage.isNotBlank()) AsyncImage(
                            model = repo.civitaiAt(m.creatorImage, 96), imageLoader = repo.imageLoader, contentDescription = null,
                            contentScale = ContentScale.Crop, modifier = Modifier.size(28.dp).clip(CircleShape),
                        ) else Initials(m.creator, size = 28.dp)
                        Spacer(Modifier.width(8.dp))
                        Text(
                            m.creator.ifBlank { "Unknown" },
                            style = MaterialTheme.typography.labelLarge,
                            color = LocalInk.current.primaryBright,
                            modifier = Modifier.clickable(enabled = m.creator.isNotBlank()) { onPerson(m.creator) },
                        )
                        Spacer(Modifier.width(8.dp))
                        if (m.creator.isNotBlank()) TextButton(onClick = { onCreator(m.creator) }) { Text("Their models") }
                    }
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Fact2(typeLabel(m.type) + (v?.base?.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""))
                        Fact2("⤓ ${compactNumber(m.downloads)}")
                        Fact2("♥ ${compactNumber(m.likes)}")
                        if (m.comments > 0) Fact2("💬 ${compactNumber(m.comments)}")
                        if (m.collected > 0) Fact2("▣ ${compactNumber(m.collected)}")
                        if (m.nsfw) Fact2("18+")
                    }
                    if (m.versions.size > 1) {
                        InkChipRow(padding = PaddingValues(0.dp)) {
                            m.versions.forEach { ver ->
                                InkChip(
                                    ver.name + if (ver.base.isNotBlank()) " · ${ver.base}" else "",
                                    versionId == ver.id,
                                    { versionId = ver.id; shown = ver.images.firstOrNull() ?: shown },
                                    icon = if (ver.installed) Icons.Filled.Check else null,
                                    small = true,
                                )
                            }
                        }
                    }
                    InkPanel(Modifier.fillMaxWidth()) {
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            if (v != null) {
                                when {
                                    v.installed -> Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Filled.Check, contentDescription = null, tint = LocalInk.current.success)
                                        Spacer(Modifier.width(8.dp))
                                        Text("Installed", style = MaterialTheme.typography.titleSmall)
                                    }
                                    canManage -> PrimaryButton(
                                        if (v.sizeMB > 0) "Install · ${fmtSize(v.sizeMB)}" else "Install",
                                        onClick = { onInstall(m, v) },
                                        icon = Icons.Filled.Download,
                                        enabled = v.downloadUrl.isNotEmpty(),
                                        modifier = Modifier.fillMaxWidth(),
                                    )
                                    else -> Text("This generator can't be installed into from here; the model can still be browsed.",
                                        style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                if (v.trainedWords.isNotEmpty()) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Kicker("Trigger words", Modifier.weight(1f))
                                        IconButton(onClick = { clipboard.setText(AnnotatedString(v.trainedWords.joinToString(", "))); repo.report("Trigger words copied", "happy") }) {
                                            Icon(Icons.Filled.ContentCopy, contentDescription = "Copy trigger words", Modifier.size(16.dp))
                                        }
                                    }
                                    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                        v.trainedWords.forEach { w ->
                                            Text(w, style = MaterialTheme.typography.labelMedium.copy(fontFamily = FontFamily.Monospace),
                                                modifier = Modifier.clip(RoundedCornerShape(6.dp)).background(LocalInk.current.selected)
                                                    .clickable { clipboard.setText(AnnotatedString(w)); repo.report("Copied “$w”", "happy") }
                                                    .padding(horizontal = 8.dp, vertical = 4.dp))
                                        }
                                    }
                                }
                                if (v.files.isNotEmpty()) {
                                    Kicker("Files")
                                    v.files.forEach { f ->
                                        Text(
                                            listOf(f.name, fmtSize(f.sizeMB), f.format, f.precision, if (f.primary) "primary" else "")
                                                .filter { it.isNotBlank() }.joinToString(" · "),
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    }
                                }
                            }
                        }
                    }
                    if (m.tags.isNotEmpty()) {
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            m.tags.take(16).forEach { t -> InkChip(t, false, { onTag(t) }, small = true) }
                        }
                    }
                }
            }
            // ── what its author wrote ──
            val about = m.description.ifBlank { v?.description.orEmpty() }
            if (about.isNotBlank()) item(span = StaggeredGridItemSpan.FullLine) {
                Column(Modifier.padding(top = 8.dp)) {
                    Text("About", style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.height(6.dp))
                    Text(AnnotatedString.fromHtml(about), style = MaterialTheme.typography.bodySmall,
                        maxLines = if (descOpen) Int.MAX_VALUE else 10, overflow = TextOverflow.Ellipsis)
                    if (about.length > 600) TextButton(onClick = { descOpen = !descOpen }) { Text(if (descOpen) "Show less" else "Read more") }
                    if (v != null && v.description.isNotBlank() && v.description != about) {
                        Spacer(Modifier.height(8.dp))
                        Kicker("About this version")
                        Text(AnnotatedString.fromHtml(v.description), style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
            // ── the discussion ──
            item(span = StaggeredGridItemSpan.FullLine) {
                Column(Modifier.padding(top = 10.dp)) {
                    Text("Discussion", style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.height(8.dp))
                    CivitaiThread(repo, "model", id)
                }
            }
            // ── the gallery ──
            item(span = StaggeredGridItemSpan.FullLine) {
                Column(Modifier.padding(top = 14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("Gallery", style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                        Text("What people made with ${v?.name ?: "it"}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    InkChipRow(padding = PaddingValues(0.dp)) {
                        civitaiImageSorts.forEach { (sid, label) -> InkChip(label, gallerySort == sid, { gallerySort = sid }, small = true) }
                    }
                    if (promptsNeedKey) Text("Civitai only shares the prompts behind these with an API key — add yours in Settings.",
                        style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    if (!galleryLoading && gallery.isEmpty()) Text("Nobody has posted a picture with this version.",
                        style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            items(gallery, key = { it.id }) { img ->
                CivitaiGalleryTile(repo, img) { viewing = gallery.indexOfFirst { it.id == img.id } }
            }
            if (galleryLoading) item(span = StaggeredGridItemSpan.FullLine) {
                Box(Modifier.fillMaxWidth().padding(16.dp), Alignment.Center) { CircularProgressIndicator(Modifier.size(24.dp)) }
            }
        }
    }
    if (zoomed.isNotEmpty()) ZoomDialog(repo, zoomed) { zoomed = "" }
    viewing?.let { start ->
        CivitaiPictureViewer(
            repo = repo,
            list = gallery,
            start = start,
            onDismiss = { viewing = null },
            onUsePrompt = { viewing = null; onUsePrompt(it) },
            onPerson = { viewing = null; onPerson(it) },
            onNearEnd = { scope.launch { loadGallery(reset = false) } },
        )
    }
}

@Composable
private fun Fact2(text: String) {
    Text(text, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
}

@Composable
private fun OpenOnSite(url: String) {
    val context = LocalContext.current
    ToolButton(Icons.AutoMirrored.Filled.OpenInNew, "Open on Civitai", {
        runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }
    }, bare = true)
}

/** A picture in a masonry gallery: its own shape, a clip's play mark, its reactions. */
@Composable
internal fun CivitaiGalleryTile(repo: Repository, img: CivitaiImage, onClick: () -> Unit) {
    val ratio = if (img.width > 0 && img.height > 0) (img.width.toFloat() / img.height).coerceIn(0.5f, 1.8f) else 0.8f
    Box(Modifier.fillMaxWidth().aspectRatio(ratio).clip(RoundedCornerShape(10.dp)).background(MaterialTheme.colorScheme.surfaceContainer).clickable(onClick = onClick)) {
        AsyncImage(
            model = repo.civitaiAt(img.url, 450),
            imageLoader = repo.imageLoader,
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize(),
        )
        if (img.video.isNotBlank()) Box(Modifier.align(Alignment.Center).size(36.dp).clip(CircleShape).background(Color(0x77000000)), Alignment.Center) {
            Icon(Icons.Filled.PlayArrow, contentDescription = "Clip", tint = Color.White)
        }
        val total = reactionsOf(img.stats).sumOf { it.count }
        if (total > 0) TileBadge("♥ ${compactNumber(total.toLong())}", Modifier.align(Alignment.BottomStart).padding(6.dp))
        if (img.prompt.isNotBlank()) TileBadge("prompt", Modifier.align(Alignment.BottomEnd).padding(6.dp))
    }
}

@Composable
private fun ZoomDialog(repo: Repository, url: String, onDismiss: () -> Unit) {
    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Box(Modifier.fillMaxSize().background(Color.Black)) {
            ZoomableImage(url = repo.civitaiImageUrl(url), imageLoader = repo.imageLoader, contentDescription = null, enabled = true, onZoomed = {}, onTap = { _, _ -> onDismiss() })
            IconButton(onClick = onDismiss, modifier = Modifier.align(Alignment.TopEnd).windowInsetsPadding(WindowInsets.statusBars).padding(8.dp)) {
                Icon(Icons.Filled.Close, contentDescription = "Close", tint = Color.White)
            }
        }
    }
}

// ── a picture ────────────────────────────────────────────────────────────────

/**
 * A picture opened from a gallery: swiped through like the site's viewer, with
 * everything under it — who posted it, its reactions, the rest of its post, the
 * generation data and the resources it names, the studio and the clipboard, and its
 * comments or its post's.
 */
@kotlin.OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun CivitaiPictureViewer(
    repo: Repository,
    list: List<CivitaiImage>,
    start: Int,
    onDismiss: () -> Unit,
    onUsePrompt: (PromptSettings) -> Unit,
    onPerson: (String) -> Unit,
    onNearEnd: () -> Unit = {},
) {
    // The pictures swiped through: the gallery's, until a picture from another post's
    // strip is picked, which makes that post the list.
    var pics by remember { mutableStateOf(list) }
    var startAt by remember { mutableStateOf(start.coerceIn(0, (list.size - 1).coerceAtLeast(0))) }
    val follows = pics === list
    val pager = androidx.compose.runtime.key(pics) { rememberPagerState(initialPage = startAt) { pics.size } }
    val posts = remember { mutableStateMapOf<Long, List<CivitaiImage>>() }
    val clipboard = LocalClipboardManager.current
    val scope = rememberCoroutineScope()
    val current = pics.getOrNull(pager.currentPage)
    LaunchedEffect(list.size) { if (follows) pics = list }
    LaunchedEffect(pager.currentPage, pics.size) { if (follows && pager.currentPage >= pics.size - 4) onNearEnd() }
    LaunchedEffect(current?.postId) {
        val pid = current?.postId ?: 0
        if (pid > 0 && posts[pid] == null) {
            runCatching { repo.api.civitaiImages(postId = pid) }.onSuccess { r -> posts[pid] = r.items.sortedBy { it.id } }
        }
    }
    var tab by remember(current?.id) { mutableStateOf("image") }

    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)) {
        Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
            Box(Modifier.fillMaxWidth().weight(0.55f).background(Color.Black)) {
                HorizontalPager(state = pager, modifier = Modifier.fillMaxSize(), beyondViewportPageCount = 1) { page ->
                    val img = pics[page]
                    if (img.video.isNotBlank() && page == pager.currentPage) CivitaiClip(repo, img.video)
                    else AsyncImage(
                        model = repo.civitaiAt(img.url, 1200),
                        imageLoader = repo.imageLoader,
                        contentDescription = null,
                        contentScale = ContentScale.Fit,
                        modifier = Modifier.fillMaxSize(),
                    )
                }
                Row(Modifier.fillMaxWidth().windowInsetsPadding(WindowInsets.statusBars).padding(6.dp), verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = onDismiss) { Icon(Icons.Filled.Close, contentDescription = "Close", tint = Color.White) }
                    Spacer(Modifier.weight(1f))
                    if (pics.size > 1) Text("${pager.currentPage + 1} / ${pics.size}", style = MaterialTheme.typography.labelMedium, color = Color.White,
                        modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(Color(0x66000000)).padding(horizontal = 8.dp, vertical = 3.dp))
                    current?.let { c ->
                        val context = LocalContext.current
                        IconButton(onClick = { runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://civitai.com/images/${c.id}"))) } }) {
                            Icon(Icons.AutoMirrored.Filled.OpenInNew, contentDescription = "Open on Civitai", tint = Color.White)
                        }
                    }
                }
            }
            val img = current ?: return@Column
            Column(
                Modifier.fillMaxWidth().weight(0.45f).verticalScroll(rememberScrollState())
                    .windowInsetsPadding(WindowInsets.navigationBars).padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                // Who posted it, and when.
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Initials(img.username, size = 34.dp)
                    Spacer(Modifier.width(10.dp))
                    Column(Modifier.weight(1f)) {
                        Text(img.username.ifBlank { "Someone" }, style = MaterialTheme.typography.titleSmall,
                            color = LocalInk.current.primaryBright, modifier = Modifier.clickable(enabled = img.username.isNotBlank()) { onPerson(img.username) })
                        val when_ = timeAgo(img.createdAt)
                        Text(listOf(when_, img.baseModel).filter { it.isNotBlank() }.joinToString(" · ").ifEmpty { "Posted on Civitai" },
                            style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    if (img.username.isNotBlank()) ToolButton(Icons.Filled.Person, "Their pictures", { onPerson(img.username) }, bare = true)
                }
                // Its reactions.
                val reactions = reactionsOf(img.stats)
                if (reactions.isNotEmpty() || (img.stats?.comments ?: 0) > 0) {
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        reactions.forEach { r -> ReactionPill(reactionIcon(r.kind), r.label, r.count) }
                        img.stats?.comments?.takeIf { it > 0 }?.let { ReactionPill(Icons.Filled.ChatBubbleOutline, "Comments", it) }
                    }
                }
                // The rest of its post.
                val post = postPictures(img, posts[img.postId])
                if (post.size > 1) {
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Kicker("In this post · ${post.size}")
                        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            post.forEach { p ->
                                AsyncImage(
                                    model = repo.civitaiAt(p.url, 200),
                                    imageLoader = repo.imageLoader,
                                    contentDescription = null,
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier.size(58.dp, 74.dp).clip(RoundedCornerShape(8.dp))
                                        .then(if (p.id == img.id) Modifier.border(2.dp, MaterialTheme.colorScheme.primary, RoundedCornerShape(8.dp)) else Modifier)
                                        .clickable {
                                            val at = pics.indexOfFirst { it.id == p.id }
                                            if (at >= 0) scope.launch { pager.scrollToPage(at) }
                                            else { startAt = post.indexOfFirst { it.id == p.id }.coerceAtLeast(0); pics = post }
                                        },
                                )
                            }
                        }
                    }
                }
                // What made it.
                val settings = CivitaiPrompt.from(img)
                SelectionContainer {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        if (settings != null) {
                            Kicker("Prompt")
                            Text(settings.prompt, style = MaterialTheme.typography.bodySmall.copy(fontFamily = FontFamily.Monospace))
                            if (settings.negativePrompt.isNotEmpty()) {
                                Kicker("Negative")
                                Text(settings.negativePrompt, style = MaterialTheme.typography.bodySmall.copy(fontFamily = FontFamily.Monospace))
                            }
                        } else {
                            Text("The poster kept no prompt for this one.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        val facts = buildList {
                            if (img.model.isNotEmpty()) add("Model" to img.model)
                            if (img.sampler.isNotEmpty()) add("Sampler" to img.sampler)
                            if (img.steps > 0) add("Steps" to img.steps.toString())
                            if (img.cfgScale > 0) add("CFG" to img.cfgScale.toString())
                            if (img.seed > 0) add("Seed" to img.seed.toString())
                            if (img.clipSkip > 0) add("Clip skip" to img.clipSkip.toString())
                            if (img.denoise > 0) add("Denoise" to img.denoise.toString())
                            if (img.size.isNotEmpty()) add("Size" to img.size) else if (img.width > 0) add("Size" to "${img.width}×${img.height}")
                        }
                        if (facts.isNotEmpty()) FlowRow(horizontalArrangement = Arrangement.spacedBy(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            facts.forEach { (k, v) -> Column { Kicker(k); Text(v, style = MaterialTheme.typography.bodySmall) } }
                        }
                        if (img.resources.isNotEmpty()) {
                            Kicker("Resources")
                            img.resources.forEach { r ->
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Filled.ViewModule, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(16.dp))
                                    Spacer(Modifier.width(8.dp))
                                    Text(r.name, style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
                                    Text(listOfNotNull(r.type.takeIf { it.isNotBlank() }?.let(::typeLabel), r.weight?.let { "%.2f".format(it) }).joinToString(" · "),
                                        style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        }
                    }
                }
                if (settings != null) Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    PrimaryButton("Use in the studio", onClick = { onUsePrompt(settings) }, icon = Icons.Filled.AutoAwesome)
                    OutlinedButton(onClick = { clipboard.setText(AnnotatedString(settings.prompt)); repo.report("Prompt copied", "happy") },
                        shape = RoundedCornerShape(12.dp), modifier = Modifier.heightIn(min = 44.dp)) {
                        Icon(Icons.Filled.ContentCopy, contentDescription = null, Modifier.size(16.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Copy")
                    }
                }
                // Its comments, or its post's.
                Hairline()
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Comments", style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                    if (img.postId > 0) Segmented(listOf("image" to "Picture", "post" to "Post"), tab, { tab = it })
                }
                if (tab == "post" && img.postId > 0) CivitaiThread(repo, "post", img.postId)
                else CivitaiThread(repo, "image", img.id)
            }
        }
    }
}

@Composable
private fun ReactionPill(icon: ImageVector, label: String, n: Int) {
    Row(
        Modifier.clip(RoundedCornerShape(999.dp)).background(MaterialTheme.colorScheme.surfaceContainerHigh).padding(horizontal = 10.dp, vertical = 5.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, contentDescription = label, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(15.dp))
        Spacer(Modifier.width(5.dp))
        Text(compactNumber(n.toLong()), style = MaterialTheme.typography.labelMedium)
    }
}

/** A posted clip, played in place, muted and looping, through the server's proxy. */
@OptIn(UnstableApi::class)
@Composable
private fun CivitaiClip(repo: Repository, url: String) {
    val context = LocalContext.current
    val player = remember(url) {
        val http = DefaultHttpDataSource.Factory().apply {
            repo.prefs.token?.let { setDefaultRequestProperties(mapOf("Authorization" to "Bearer $it")) }
        }
        ExoPlayer.Builder(context).setMediaSourceFactory(DefaultMediaSourceFactory(http)).build().apply {
            setMediaItem(MediaItem.fromUri(repo.civitaiImageUrl(url)))
            repeatMode = Player.REPEAT_MODE_ONE
            volume = 0f
            prepare()
            playWhenReady = true
        }
    }
    DisposableEffect(player) { onDispose { player.run { stop(); release() } } }
    AndroidView(
        factory = { ctx -> PlayerView(ctx).apply { useController = false; resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FIT; this.player = player } },
        modifier = Modifier.fillMaxSize(),
    )
}

// ── a person ─────────────────────────────────────────────────────────────────

/** Everything someone posted, newest first, as the site's profile gallery. */
@Composable
internal fun CivitaiPersonPage(
    repo: Repository,
    username: String,
    nsfw: Boolean,
    onBack: () -> Unit,
    onModels: (String) -> Unit,
    onUsePrompt: (PromptSettings) -> Unit,
    onPerson: (String) -> Unit,
) {
    var pics by remember(username) { mutableStateOf<List<CivitaiImage>>(emptyList()) }
    var cursor by remember(username) { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var loaded by remember(username) { mutableStateOf(false) }
    var error by remember(username) { mutableStateOf("") }
    var viewing by remember { mutableStateOf<Int?>(null) }
    val grid = rememberLazyStaggeredGridState()
    val scope = rememberCoroutineScope()
    androidx.activity.compose.BackHandler(enabled = viewing == null) { onBack() }

    suspend fun load(reset: Boolean) {
        if (loading || (!reset && cursor.isEmpty())) return
        loading = true
        runCatching { repo.api.civitaiImages(username = username, sort = "newest", nsfw = if (nsfw) null else "0", cursor = if (reset) null else cursor.ifBlank { null }) }
            .onSuccess { r -> pics = if (reset) r.items else mergeCivitaiImages(pics, r.items); cursor = r.nextCursor; error = "" }
            .onFailure { error = it.serverMessage("Couldn't load their pictures") }
        loading = false
        loaded = true
    }
    LaunchedEffect(username) { load(reset = true) }
    val nearEnd by remember { derivedStateOf { (grid.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0) >= grid.layoutInfo.totalItemsCount - 8 } }
    LaunchedEffect(nearEnd, pics.size) { if (nearEnd && pics.isNotEmpty()) load(reset = false) }

    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        PageTop(
            title = username,
            insets = false,
            navigation = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back") } },
        ) {
            ToolButton(Icons.Filled.ViewModule, "Their models", { onModels(username) }, label = "Models")
            OpenOnSite("https://civitai.com/user/$username")
        }
        Hairline()
        LazyVerticalStaggeredGrid(
            state = grid,
            columns = StaggeredGridCells.Adaptive(140.dp),
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(12.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalItemSpacing = 8.dp,
        ) {
            if (error.isNotEmpty() || (loaded && pics.isEmpty())) item(span = StaggeredGridItemSpan.FullLine) {
                EmptyNote(error.ifEmpty { "$username hasn't posted any pictures." })
            }
            items(pics, key = { it.id }) { img -> CivitaiGalleryTile(repo, img) { viewing = pics.indexOfFirst { it.id == img.id } } }
            if (loading) item(span = StaggeredGridItemSpan.FullLine) {
                Box(Modifier.fillMaxWidth().padding(16.dp), Alignment.Center) { CircularProgressIndicator(Modifier.size(24.dp)) }
            }
        }
    }
    viewing?.let { start ->
        CivitaiPictureViewer(
            repo = repo,
            list = pics,
            start = start,
            onDismiss = { viewing = null },
            onUsePrompt = { viewing = null; onUsePrompt(it) },
            onPerson = { name -> viewing = null; if (name != username) onPerson(name) },
            onNearEnd = { scope.launch { load(reset = false) } },
        )
    }
}
