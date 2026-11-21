package net.fourbakers.oppailib.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.FaceRetouchingNatural
import androidx.compose.material.icons.filled.Forum
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Movie
import androidx.compose.material.icons.filled.OpenInFull
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Stable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import net.fourbakers.oppailib.data.Bookmark
import net.fourbakers.oppailib.data.LibraryStats
import net.fourbakers.oppailib.data.Media
import net.fourbakers.oppailib.data.MediaProgress
import net.fourbakers.oppailib.data.Repository
import net.fourbakers.oppailib.ui.theme.Appearance
import net.fourbakers.oppailib.ui.theme.LocalInk
import java.util.Calendar

/** Everything Home draws, fetched together and kept by [LibraryState] between visits. */
@Stable
internal data class HomeData(
    val stats: LibraryStats? = null,
    val resume: List<Media> = emptyList(),
    val progress: Map<Long, MediaProgress> = emptyMap(),
    val suggested: List<Media> = emptyList(),
    val because: List<String> = emptyList(),
    val favorites: List<Media> = emptyList(),
    val moments: List<Bookmark> = emptyList(),
    val newest: List<Media> = emptyList(),
    val byKind: Map<String, List<Media>> = emptyMap(),
)

/**
 * Home's shelves, asked for side by side. Each is its own small query — the server's
 * paged list, its resume shelf, its suggestion row — so one failing (no AI, an old
 * server without bookmarks) leaves the rest standing rather than an empty Home.
 */
internal suspend fun loadHome(repo: Repository): HomeData = coroutineScope {
    val seen = repo.prefs.recentlyOpened.take(40)
    val stats = async { runCatching { repo.web.libraryStats() }.getOrNull() }
    val resume = async { runCatching { repo.web.resumeShelf() }.getOrNull() }
    val suggested = async { runCatching { repo.web.suggested(seen.joinToString(",").ifEmpty { null }) }.getOrNull() }
    val favorites = async { runCatching { repo.api.listMedia(limit = 14, favorite = 1).items }.getOrDefault(emptyList()) }
    val moments = async { runCatching { repo.web.recentBookmarks(16).bookmarks }.getOrDefault(emptyList()) }
    val newest = async { runCatching { repo.api.listMedia(limit = 24).items }.getOrDefault(emptyList()) }
    val kinds = KINDS.map { k -> k.kind to async { runCatching { repo.api.listMedia(kind = k.kind, limit = 14).items }.getOrDefault(emptyList()) } }
    val r = resume.await()
    val s = suggested.await()
    HomeData(
        stats = stats.await(),
        resume = r?.items.orEmpty(),
        progress = r?.progress.orEmpty().associateBy { it.mediaId },
        suggested = s?.items.orEmpty(),
        because = s?.because.orEmpty(),
        favorites = favorites.await(),
        moments = moments.await(),
        newest = newest.await(),
        byKind = kinds.associate { (k, d) -> k to d.await() },
    )
}

/** The line under Libby Suggested. Her reasons are tags, which can be as explicit as the
 *  library is, so the safe screen gets a line that names none of them (suggested.ts). */
internal fun suggestionLine(because: List<String>, safe: Boolean): String {
    if (safe || because.isEmpty()) return "From what you keep coming back to"
    val list = if (because.size > 1) because.dropLast(1).joinToString(", ") + " and " + because.last() else because[0]
    return "Going by $list"
}

private fun greeting(): String = when (Calendar.getInstance().get(Calendar.HOUR_OF_DAY)) {
    in 5..11 -> "Good morning"
    in 12..17 -> "Good afternoon"
    else -> "Good evening"
}

internal fun bytesLabel(bytes: Long): String {
    if (bytes < 1024) return "$bytes B"
    val units = listOf("KB", "MB", "GB", "TB")
    var v = bytes / 1024.0
    var i = 0
    while (v >= 1024 && i < units.lastIndex) { v /= 1024; i++ }
    return if (v >= 100) "%.0f %s".format(v, units[i]) else "%.1f %s".format(v, units[i])
}

/**
 * The Overview: what you were last on, framed; what the vault holds; the doors to the
 * other two things the app is for; and the shelves — Keep going, Libby suggests,
 * Favourites, Moments, Recently added, and a row of each kind.
 */
@Composable
internal fun LibraryHome(
    repo: Repository,
    home: HomeData,
    onOpen: (Media, List<Media>) -> Unit,
    onHold: (Media) -> Unit,
    onMoment: (Bookmark) -> Unit,
    onGo: (String) -> Unit,
    onChat: () -> Unit,
    onCreate: (String) -> Unit,
    contentPadding: PaddingValues = PaddingValues(bottom = 24.dp),
) {
    val safe = Appearance.safe
    // The server knows where you were in something on every device; this phone knows
    // what it opened, however briefly. The server's leads, the phone's fills in.
    val openedHere = remember(home) {
        val byId = (home.newest + home.favorites + home.byKind.values.flatten()).associateBy { it.id }
        repo.prefs.recentlyOpened.mapNotNull { byId[it] }.take(12)
    }
    val continueRow = home.resume.ifEmpty { openedHere }
    val hero = continueRow.firstOrNull() ?: home.newest.firstOrNull()
    val continuing = continueRow.isNotEmpty()
    fun progressOf(m: Media): Float? = home.progress[m.id]?.let { p ->
        val d = if (p.duration > 0) p.duration else m.duration ?: 0.0
        if (m.kind == "comic") m.pageCount?.takeIf { it > 0 }?.let { (p.position / it).toFloat() }
        else if (d > 0) (p.position / d).toFloat() else null
    }

    LazyColumn(Modifier.fillMaxSize(), contentPadding = contentPadding, verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item {
            Text(
                greeting() + if (continuing) " — pick up where you left off" else " — here's what's new",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 2.dp),
            )
        }
        if (hero != null) item {
            HomeHero(repo, hero, continuing, onOpen = { onOpen(hero, continueRow.ifEmpty { home.newest }) }, onMore = { onGo(hero.kind) })
        }
        home.stats?.let { s -> item { VaultStrip(s, onFavorites = { onGo(SCOPE_FAVORITES) }) } }
        item { AlsoCards(repo, onChat, onCreate) }
        shelf("Keep going", continueRow.drop(1), repo, onOpen, onHold, progress = ::progressOf)
        shelf("Libby suggests", home.suggested, repo, onOpen, onHold, sub = suggestionLine(home.because, safe), face = !safe && !repo.prefs.hideLibby)
        shelf("Favourites", home.favorites, repo, onOpen, onHold, seeAll = { onGo(SCOPE_FAVORITES) })
        if (home.moments.isNotEmpty()) item {
            Column {
                SectionHead("Moments", sub = "The parts you marked · tap the bookmark in a video to add one")
                LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(home.moments, key = { it.id }) { mark -> MomentTile(repo, mark, safe) { onMoment(mark) } }
                }
            }
        }
        shelf("Recently added", home.newest.take(14), repo, onOpen, onHold)
        KINDS.forEach { k ->
            val list = home.byKind[k.kind].orEmpty()
            shelf(k.label, list, repo, onOpen, onHold, seeAll = { onGo(k.kind) })
        }
        if (hero == null) item {
            EmptyNote("Nothing in the vault yet. Add something with the button below.", icon = Icons.Filled.Lock)
        }
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.shelf(
    title: String,
    list: List<Media>,
    repo: Repository,
    onOpen: (Media, List<Media>) -> Unit,
    onHold: (Media) -> Unit,
    sub: String? = null,
    seeAll: (() -> Unit)? = null,
    face: Boolean = false,
    progress: ((Media) -> Float?)? = null,
) {
    if (list.isEmpty()) return
    item(key = "shelf-$title") {
        Column {
            SectionHead(
                title,
                sub = sub,
                leading = if (face) ({
                    AsyncImage(
                        model = "file:///android_asset/$LIBBY_PFP_ASSET",
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.size(28.dp).clip(CircleShape),
                    )
                }) else null,
                action = seeAll?.let { go ->
                    {
                        TextButton(onClick = go) {
                            Text("See all")
                            Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null, modifier = Modifier.size(18.dp))
                        }
                    }
                },
            )
            LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                items(list, key = { it.id }) { m ->
                    RowTile(
                        repo, m,
                        width = if (m.kind == "video") 208.dp else 124.dp,
                        onClick = { onOpen(m, list) },
                        onLongClick = { onHold(m) },
                        progress = progress?.invoke(m),
                    )
                }
            }
        }
    }
}

/** The hero: what you were last on, framed on the right, its own colours as the wall. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun HomeHero(repo: Repository, hero: Media, continuing: Boolean, onOpen: () -> Unit, onMore: () -> Unit) {
    val hidden = veiled(hero.tags)
    val kind = kindMeta(hero.kind)
    val ratio = if ((hero.width ?: 0) > 0 && (hero.height ?: 0) > 0) (hero.width!!.toFloat() / hero.height!!).coerceIn(0.66f, 1.78f)
    else kind?.aspect ?: 0.8f
    val ink = LocalInk.current
    Box(
        Modifier.padding(horizontal = 16.dp).fillMaxWidth().heightIn(min = 220.dp).clip(RoundedCornerShape(20.dp))
            .background(MaterialTheme.colorScheme.surfaceContainer),
    ) {
        // The wall: the picture itself, blurred past recognition, so the card takes its
        // colours. Veiled, it is plain ink.
        if (!hidden) AsyncImage(
            model = repo.thumbUrl(hero.id),
            imageLoader = repo.imageLoader,
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.matchParentSize().blur(48.dp).alpha(0.55f),
        )
        Box(Modifier.matchParentSize().background(Brush.horizontalGradient(listOf(MaterialTheme.colorScheme.background.copy(alpha = 0.92f), MaterialTheme.colorScheme.background.copy(alpha = 0.35f)))))
        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f).padding(end = 12.dp)) {
                Kicker("${if (continuing) "Continue" else "Latest addition"} · ${kind?.label ?: hero.kind}", color = ink.primaryBright)
                Spacer(Modifier.height(6.dp))
                Text(
                    hero.title.ifBlank { kind?.noun?.replaceFirstChar { it.uppercase() } ?: "Untitled" },
                    style = MaterialTheme.typography.headlineSmall.copy(fontSize = 22.sp),
                    maxLines = 3,
                    overflow = TextOverflow.Ellipsis,
                )
                if (!hidden && hero.tags.isNotEmpty()) {
                    Spacer(Modifier.height(8.dp))
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp), maxLines = 2) {
                        hero.tags.take(5).forEach { t ->
                            Text(
                                t.name,
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.clip(RoundedCornerShape(6.dp)).background(Color(0x22FFFFFF)).padding(horizontal = 7.dp, vertical = 3.dp),
                            )
                        }
                    }
                }
                Spacer(Modifier.height(14.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    PrimaryButton(
                        if (continuing) "Carry on" else "Open",
                        onClick = onOpen,
                        icon = if (hero.kind == "video" || hero.kind == "gif") Icons.Filled.PlayArrow else Icons.Filled.OpenInFull,
                    )
                    OutlinedButton(onClick = onMore, shape = RoundedCornerShape(12.dp), modifier = Modifier.heightIn(min = 44.dp),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)) {
                        Text("More", maxLines = 1)
                    }
                }
            }
            Box(
                Modifier.width(118.dp).aspectRatio(ratio).clip(RoundedCornerShape(14.dp))
                    .background(MaterialTheme.colorScheme.surfaceContainerHigh).clickable(onClick = onOpen),
            ) {
                AsyncImage(
                    model = repo.thumbUrl(hero.id),
                    imageLoader = repo.imageLoader,
                    contentDescription = hero.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize().veil(hidden),
                )
                VeilMark(hidden, 24.dp)
            }
        }
    }
}

/** What the vault holds, as one line of the server's own figures. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun VaultStrip(s: LibraryStats, onFavorites: () -> Unit) {
    val c = MaterialTheme.colorScheme
    @Composable
    fun fig(value: String, label: String, onClick: (() -> Unit)? = null) {
        Row(
            Modifier.clip(RoundedCornerShape(8.dp)).then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier).padding(horizontal = 4.dp, vertical = 2.dp),
            verticalAlignment = Alignment.Bottom,
        ) {
            Text(value, style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold))
            Spacer(Modifier.width(5.dp))
            Text(label, style = MaterialTheme.typography.bodySmall, color = c.onSurfaceVariant)
        }
    }
    InkPanel(Modifier.padding(horizontal = 16.dp).fillMaxWidth(), padding = PaddingValues(horizontal = 12.dp, vertical = 10.dp)) {
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            FlowRow(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                fig("%,d".format(s.total), if (s.total == 1L) "item" else "items")
                fig("%,d".format(s.favorites), if (s.favorites == 1L) "favourite" else "favourites", onFavorites)
                fig(bytesLabel(s.bytes), "stored")
                fig("%,d".format(s.thisWeek), "this week")
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.Lock, contentDescription = null, tint = LocalInk.current.success, modifier = Modifier.size(14.dp))
                Spacer(Modifier.width(6.dp))
                Text("Encrypted at rest · AES-256-GCM", style = MaterialTheme.typography.labelSmall, color = c.onSurfaceVariant)
            }
        }
    }
}

/** The doors to the other two things the app is for. */
@Composable
private fun AlsoCards(repo: Repository, onChat: () -> Unit, onCreate: (String) -> Unit) {
    val shown = !repo.prefs.hideLibby && !Appearance.safe
    val c = MaterialTheme.colorScheme
    val ink = LocalInk.current
    Column(Modifier.padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Surface(
            onClick = onChat,
            shape = RoundedCornerShape(16.dp),
            color = c.surfaceContainer,
            border = BorderStroke(1.dp, if (ink.dark) Color(0xFF232125) else c.outlineVariant),
        ) {
            Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                if (shown) AsyncImage(
                    model = "file:///android_asset/$LIBBY_PFP_ASSET",
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.size(44.dp).clip(CircleShape),
                ) else Box(Modifier.size(44.dp).clip(RoundedCornerShape(12.dp)).background(ink.selected), Alignment.Center) {
                    Icon(Icons.Filled.Forum, contentDescription = null, tint = c.primary)
                }
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(if (shown) "Talk to Libby" else "Chat", style = MaterialTheme.typography.titleSmall)
                    Text(
                        if (shown) "She can search the library, open things for you and send pictures back" else "Your conversations and characters",
                        style = MaterialTheme.typography.bodySmall,
                        color = c.onSurfaceVariant,
                    )
                }
                Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null, tint = c.onSurfaceVariant)
            }
        }
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = c.surfaceContainer,
            border = BorderStroke(1.dp, if (ink.dark) Color(0xFF232125) else c.outlineVariant),
        ) {
            Column(Modifier.padding(14.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(44.dp).clip(RoundedCornerShape(12.dp)).background(ink.selected), Alignment.Center) {
                        Icon(Icons.Filled.AutoAwesome, contentDescription = null, tint = c.primary)
                    }
                    Spacer(Modifier.width(12.dp))
                    Column {
                        Text("Create", style = MaterialTheme.typography.titleSmall)
                        Text("Pictures, clips and her sprites", style = MaterialTheme.typography.bodySmall, color = c.onSurfaceVariant)
                    }
                }
                Spacer(Modifier.height(10.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    ToolButton(Icons.Filled.Image, "Image", { onCreate("image") }, label = "Image", modifier = Modifier.weight(1f))
                    ToolButton(Icons.Filled.Movie, "Video", { onCreate("video") }, label = "Video", modifier = Modifier.weight(1f))
                    ToolButton(Icons.Filled.FaceRetouchingNatural, "Sprites", { onCreate("sprites") }, label = "Sprites", modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

/** A bookmarked moment: the frame at that second, the time and its label. */
@Composable
private fun MomentTile(repo: Repository, mark: Bookmark, safe: Boolean, onClick: () -> Unit) {
    Column(Modifier.width(200.dp).clickable(onClick = onClick)) {
        Box(Modifier.fillMaxWidth().aspectRatio(16f / 9f).clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.surfaceContainer)) {
            AsyncImage(
                model = if (mark.hasThumb) repo.bookmarkThumbUrl(mark.id) else repo.thumbUrl(mark.mediaId),
                imageLoader = repo.imageLoader,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize().veil(safe),
            )
            VeilMark(safe, 22.dp)
            TileBadge(clockLabel(mark.position), Modifier.align(Alignment.BottomStart).padding(6.dp), icon = Icons.Filled.PlayArrow)
        }
        Text(
            mark.label.ifBlank { mark.title ?: "" }.ifBlank { "At ${clockLabel(mark.position)}" },
            style = MaterialTheme.typography.labelLarge,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(top = 6.dp, start = 2.dp),
        )
    }
}
