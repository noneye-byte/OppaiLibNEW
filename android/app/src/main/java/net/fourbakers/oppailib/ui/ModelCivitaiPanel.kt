package net.fourbakers.oppailib.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.fromHtml
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import kotlinx.coroutines.launch
import net.fourbakers.oppailib.data.CivitaiComment
import net.fourbakers.oppailib.data.CivitaiImage
import net.fourbakers.oppailib.data.CivitaiModel
import net.fourbakers.oppailib.data.CivitaiSyncRequest
import net.fourbakers.oppailib.data.GenModelMeta
import net.fourbakers.oppailib.data.Repository
import net.fourbakers.oppailib.data.serverMessage

/**
 * The top of the model editor: its picture, and its Civitai page. The web editor's
 * `oppai-model-civitai`, for the phone.
 *
 * The cover can be changed to any of the creator's showcase pictures or any picture
 * someone else posted made with the model (on Civitai those are the pictures under its
 * reviews and comments), and the comments can be read before trusting a weight. Nothing is
 * saved from here: a pick goes up through [onPick] and the editor applies it on Save.
 */
private enum class CivitaiPane { None, Creator, Community, Comments }

@Composable
fun ModelCivitaiPanel(
    repo: Repository,
    meta: GenModelMeta,
    /** The picture it has now. */
    thumbUrl: String,
    /** A Civitai picture picked and not saved yet, or "". */
    chosen: String,
    onPick: (String) -> Unit,
    /** The model was just found on Civitai by its hash; the editor reloads it. */
    onLinked: () -> Unit,
) {
    val link = meta.civitai?.takeIf { it.modelId > 0 }
    val scope = rememberCoroutineScope()
    val uri = LocalUriHandler.current

    // Another model in the same editor starts from nothing.
    var pane by remember(meta.key) { mutableStateOf(CivitaiPane.None) }
    var model by remember(meta.key) { mutableStateOf<CivitaiModel?>(null) }
    var community by remember(meta.key) { mutableStateOf<List<CivitaiImage>>(emptyList()) }
    var communityCursor by remember(meta.key) { mutableStateOf("") }
    var comments by remember(meta.key) { mutableStateOf<List<CivitaiComment>>(emptyList()) }
    var commentsCursor by remember(meta.key) { mutableStateOf("") }
    var loaded by remember(meta.key) { mutableStateOf(emptySet<CivitaiPane>()) }
    var loading by remember(meta.key) { mutableStateOf(false) }
    var linking by remember(meta.key) { mutableStateOf(false) }
    var problem by remember(meta.key) { mutableStateOf("") }

    fun load(which: CivitaiPane, more: Boolean = false) {
        val l = link ?: return
        if (loading) return
        loading = true
        problem = ""
        scope.launch {
            runCatching {
                when (which) {
                    CivitaiPane.Creator -> if (model == null) model = repo.api.civitaiModel(l.modelId)
                    CivitaiPane.Community -> {
                        val page = repo.api.civitaiImages(
                            versionId = l.versionId.takeIf { it > 0 },
                            modelId = if (l.versionId > 0) null else l.modelId,
                            sort = "Most Reactions",
                            cursor = if (more) communityCursor.ifBlank { null } else null,
                        )
                        community = addCommunityPage(if (more) community else emptyList(), page.items, l.creator)
                        communityCursor = page.nextCursor
                    }
                    CivitaiPane.Comments -> {
                        val page = repo.api.civitaiComments(l.modelId, if (more) commentsCursor.ifBlank { null } else null)
                        comments = if (more) (comments + page.items).distinctBy { it.id } else page.items
                        commentsCursor = page.nextCursor
                    }
                    CivitaiPane.None -> Unit
                }
            }.onSuccess { loaded = loaded + which }
                .onFailure { problem = it.serverMessage("Couldn't reach Civitai") }
            loading = false
        }
    }

    fun open(which: CivitaiPane) {
        pane = if (pane == which) CivitaiPane.None else which
        problem = ""
        if (pane != CivitaiPane.None && pane !in loaded) load(pane)
    }

    /** Looks the file up on Civitai by its hash, for a model that was never linked. */
    fun findOnCivitai() {
        if (linking) return
        linking = true
        problem = ""
        scope.launch {
            runCatching { repo.api.civitaiSync(CivitaiSyncRequest(meta.key)) }
                .onSuccess {
                    if (it.modelId > 0) onLinked()
                    else problem = "Civitai does not know this file — it may be a private or retrained copy."
                }
                .onFailure { problem = it.serverMessage("Couldn't reach Civitai") }
            linking = false
        }
    }

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier
                    .size(72.dp, 90.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant),
            ) {
                AsyncImage(
                    model = if (chosen.isNotEmpty()) repo.civitaiImageUrl(chosen) else thumbUrl,
                    imageLoader = repo.imageLoader,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize(),
                )
            }
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                if (link != null) {
                    Text(link.modelName, style = MaterialTheme.typography.titleSmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text(
                        listOfNotNull(link.versionName.ifBlank { null }, link.creator.ifBlank { null }?.let { "by $it" })
                            .joinToString(" · "),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    if (chosen.isNotEmpty()) {
                        Text("New picture, saved with Save", style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.primary)
                    }
                    TextButton(onClick = { uri.openUri(link.page) }, contentPadding = SmallButtonPadding) {
                        Text("Open on Civitai")
                    }
                } else {
                    Text("Not linked to Civitai", style = MaterialTheme.typography.titleSmall)
                    Text(
                        "Linked, its picture can be any from its Civitai page, and its comments read here.",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    TextButton(onClick = { findOnCivitai() }, enabled = !linking, contentPadding = SmallButtonPadding) {
                        Text(if (linking) "Looking…" else "Find it on Civitai")
                    }
                }
            }
        }
        if (link != null) {
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                FilterChip(selected = pane == CivitaiPane.Creator, onClick = { open(CivitaiPane.Creator) },
                    label = { Text("Creator's pictures") })
                FilterChip(selected = pane == CivitaiPane.Community, onClick = { open(CivitaiPane.Community) },
                    label = { Text("From the community") })
                FilterChip(selected = pane == CivitaiPane.Comments, onClick = { open(CivitaiPane.Comments) },
                    label = { Text("Comments") })
            }
        }
        if (problem.isNotEmpty()) {
            Text(problem, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
            if (pane == CivitaiPane.Comments && link != null) {
                TextButton(onClick = { uri.openUri("${link.page}#comments") }, contentPadding = SmallButtonPadding) {
                    Text("Read them on Civitai")
                }
            }
        }
        when (pane) {
            CivitaiPane.Creator, CivitaiPane.Community -> {
                val pictures = if (pane == CivitaiPane.Creator) {
                    creatorPictures(model, link?.versionId ?: 0).map { it to "" }
                } else community.map { it.url to it.username }
                if (pictures.isEmpty()) {
                    if (problem.isEmpty()) {
                        Text(
                            when {
                                loading -> "Asking Civitai…"
                                pane == CivitaiPane.Creator -> "The creator posted no pictures with it."
                                else -> "Nobody else has posted a picture made with it yet."
                            },
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                } else {
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        items(pictures) { (url, by) ->
                            PictureTile(repo, url, by, picked = chosen == url) { onPick(if (chosen == url) "" else url) }
                        }
                        if (pane == CivitaiPane.Community && communityCursor.isNotEmpty()) {
                            item {
                                Box(Modifier.size(80.dp, 100.dp), contentAlignment = Alignment.Center) {
                                    TextButton(onClick = { load(CivitaiPane.Community, more = true) }, enabled = !loading) {
                                        Text(if (loading) "…" else "More")
                                    }
                                }
                            }
                        }
                    }
                }
            }
            CivitaiPane.Comments -> {
                if (comments.isEmpty()) {
                    if (problem.isEmpty()) {
                        Text(
                            if (loading) "Asking Civitai…" else "Nobody has commented on it yet.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                } else {
                    comments.forEach { CommentRow(repo, it) }
                    if (commentsCursor.isNotEmpty()) {
                        TextButton(onClick = { load(CivitaiPane.Comments, more = true) }, enabled = !loading) {
                            Text(if (loading) "Loading…" else "More")
                        }
                    }
                }
            }
            CivitaiPane.None -> Unit
        }
    }
}

private val SmallButtonPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 4.dp, vertical = 0.dp)

@Composable
private fun PictureTile(repo: Repository, url: String, by: String, picked: Boolean, onClick: () -> Unit) {
    Box(
        Modifier
            .size(80.dp, 100.dp)
            .clip(RoundedCornerShape(10.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .then(
                if (picked) Modifier.border(2.dp, MaterialTheme.colorScheme.primary, RoundedCornerShape(10.dp))
                else Modifier,
            )
            .clickable(onClick = onClick),
    ) {
        AsyncImage(
            model = repo.civitaiImageUrl(url),
            imageLoader = repo.imageLoader,
            contentDescription = if (by.isNotEmpty()) "Posted by $by" else "From the creator's showcase",
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize(),
        )
        if (by.isNotEmpty()) {
            Text(
                by,
                style = MaterialTheme.typography.labelSmall,
                color = Color.White,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .fillMaxWidth()
                    .background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = 0.7f))))
                    .padding(start = 5.dp, end = 5.dp, top = 10.dp, bottom = 3.dp),
            )
        }
        if (picked) {
            Text(
                "✓",
                color = MaterialTheme.colorScheme.onPrimary,
                fontWeight = FontWeight.Bold,
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(4.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primary)
                    .padding(horizontal = 6.dp),
            )
        }
    }
}

@Composable
private fun CommentRow(repo: Repository, c: CivitaiComment) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
        if (c.avatar.isNotEmpty()) {
            AsyncImage(
                model = repo.civitaiImageUrl(c.avatar),
                imageLoader = repo.imageLoader,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.size(28.dp).clip(CircleShape).background(MaterialTheme.colorScheme.surfaceVariant),
            )
        } else {
            Spacer(Modifier.size(28.dp).clip(CircleShape).background(MaterialTheme.colorScheme.surfaceVariant))
        }
        Column(Modifier.weight(1f)) {
            Text(
                listOfNotNull(
                    c.user.ifBlank { "someone" },
                    c.createdAt.take(10).ifBlank { null },
                    c.likes.takeIf { it > 0 }?.let { "♥ $it" },
                    c.replies.takeIf { it > 0 }?.let { if (it == 1) "1 reply" else "$it replies" },
                ).joinToString("  ·  "),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(2.dp))
            // Sanitized on the server: the tags a description keeps, nothing that runs.
            Text(AnnotatedString.fromHtml(c.html), style = MaterialTheme.typography.bodySmall)
        }
    }
}

/**
 * The creator's showcase, the linked version's first and then the other versions'. Each
 * picture once: versions often share their showcase. As web/src/model-pictures.ts.
 */
private fun creatorPictures(model: CivitaiModel?, versionId: Long): List<String> {
    if (model == null) return emptyList()
    val ordered = model.versions.sortedBy { if (it.id == versionId) 0 else 1 }
    return ordered.flatMap { it.images }.filter { it.isNotBlank() }.distinct()
}

/**
 * Another page of the community feed added to what is shown: the creator's own posts left
 * out (they are the other tab), and nothing twice, since the feed's pages overlap when
 * someone posts while it is being read. As web/src/model-pictures.ts.
 */
private fun addCommunityPage(shown: List<CivitaiImage>, page: List<CivitaiImage>, creator: String): List<CivitaiImage> {
    val who = creator.trim().lowercase()
    val seen = shown.map { it.id }.toMutableSet()
    val fresh = page.filter { img ->
        img.url.isNotBlank() && seen.add(img.id) && (who.isEmpty() || img.username.lowercase() != who)
    }
    return shown + fresh
}
