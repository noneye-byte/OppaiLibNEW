package net.fourbakers.oppailib.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.DeveloperBoard
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Explore
import androidx.compose.material.icons.filled.FaceRetouchingNatural
import androidx.compose.material.icons.filled.Forum
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Movie
import androidx.compose.material.icons.filled.PhotoLibrary
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.SportsEsports
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.Forum
import androidx.compose.material.icons.outlined.PhotoLibrary
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.work.WorkInfo
import androidx.work.WorkManager
import coil.compose.AsyncImage
import net.fourbakers.oppailib.data.Media
import net.fourbakers.oppailib.data.Repository
import net.fourbakers.oppailib.data.User
import net.fourbakers.oppailib.ui.theme.Appearance
import net.fourbakers.oppailib.ui.theme.LocalInk
import net.fourbakers.oppailib.work.DownloadQueue
import net.fourbakers.oppailib.work.ImportWorker
import net.fourbakers.oppailib.work.ShareIntake

/**
 * The app's three places — the library, chat and the studios — in the order the app is
 * for, with Add between them and More at the end: the web's phone bar.
 *
 * It was five equal tabs (Library, Browse, Games, Libby, Studio), which gave two of the
 * five slots to ways of finding things to add and left the studios as one tab whose
 * Image, Video and Sprites were tabs again inside it. Browse and the game sites are
 * places in the library now (its chips, and Games' "Find games"), Create remembers which
 * studio you were in, and the rest — Settings, Downloads, safe view, signing out — is
 * one sheet away under More.
 *
 * [id]s are what [net.fourbakers.oppailib.data.Prefs.lastScreen] stores. The old tabs'
 * ids ("browse", "games") still open where they used to lead.
 */
internal enum class Place(val id: String) {
    LIBRARY(""),
    CHAT("chat"),
    CREATE("studio"),
    ;

    companion object {
        fun from(id: String): Place = entries.firstOrNull { it.id == id } ?: LIBRARY
    }
}

/** Downloads was a place in the drawer; it opens from More now. */
private const val SCREEN_DOWNLOADS = "downloads"

/**
 * How many full-screen things are asking for the bar to get out of the way. A count
 * rather than a flag, so that two of them overlapping — one leaving composition as the
 * next arrives — can't leave the bar showing over the one still open.
 */
internal class NavigationBarHolds {
    var count by mutableIntStateOf(0)
}

internal val LocalNavigationBarHolds = staticCompositionLocalOf { NavigationBarHolds() }

/**
 * Hides the bottom bar for as long as the caller is composed. The viewers call it, and
 * so does an open conversation: a bar under the message box would cost a row of the
 * conversation and sit between the keyboard and what you are typing.
 */
@Composable
internal fun HideNavigationBar() {
    val holds = LocalNavigationBarHolds.current
    DisposableEffect(holds) {
        holds.count++
        onDispose { holds.count-- }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppShell(repo: Repository, onLogout: () -> Unit) {
    val resumeTo = remember { repo.prefs.lastScreen }
    var place by remember { mutableStateOf(Place.from(resumeTo)) }
    var showSettings by remember { mutableStateOf(false) }
    var showDownloads by remember { mutableStateOf(resumeTo == SCREEN_DOWNLOADS) }
    var moreOpen by remember { mutableStateOf(false) }
    var showGpu by remember { mutableStateOf(false) }
    var createMode by remember { mutableStateOf(repo.prefs.lastCreate) }
    var user by remember { mutableStateOf<User?>(null) }
    val holds = remember { NavigationBarHolds() }
    val library = remember {
        LibraryState(repo.prefs).also {
            // The old Browse and Games tabs are library places now.
            when (resumeTo) {
                "browse" -> it.scope = SCOPE_BROWSE
                "games" -> it.scope = "game"
            }
        }
    }
    val context = LocalContext.current

    LaunchedEffect(Unit) {
        user = runCatching { repo.api.me() }.getOrNull()
        // Signed in: make sure the phone can take a share without opening, and that the
        // share sheet offers it where shares are likely to go. See ShareActivity.
        repo.ensureShareKey()
        ShareIntake.publishShareTarget(context)
    }

    // Anything landing in the library — an upload finishing, a save from Browse, an
    // import worker completing — marks the grid stale, whichever place is up, so it is
    // fresh the next time you look at it.
    LaunchedEffect(repo) { repo.libraryChanges.collect { library.stale = true } }
    LaunchedEffect(Unit) {
        var known: Set<java.util.UUID>? = null
        WorkManager.getInstance(context).getWorkInfosByTagFlow(ImportWorker.TAG).collect { infos ->
            val done = infos.filter { it.state == WorkInfo.State.SUCCEEDED }.map { it.id }.toSet()
            // The first emission is history — imports from earlier runs of the app.
            if (known != null && (done - known!!).isNotEmpty()) library.stale = true
            known = done
        }
    }

    // Hand-offs between places. A hold-menu share is for this visit to chat only, so it
    // is never stored; an open request is a library item some other place wants shown,
    // and returnToChat sends the viewer's close back to the conversation it came from.
    var chatShare by remember { mutableStateOf<Media?>(null) }
    var openRequest by remember { mutableStateOf<Long?>(null) }
    var returnToChat by remember { mutableStateOf(false) }

    // Where the user is, written as they move: Android can end the process without
    // running anything on the way out, so there is no "on the way out" to hook.
    LaunchedEffect(place, showDownloads) {
        repo.prefs.lastScreen = if (showDownloads) SCREEN_DOWNLOADS else place.id
    }
    LaunchedEffect(createMode) { repo.prefs.lastCreate = createMode }

    if (showSettings) {
        SettingsScreen(repo = repo, onBack = { showSettings = false }, onLogout = onLogout)
        return
    }
    if (showDownloads) {
        DownloadsScreen(onBack = { showDownloads = false })
        return
    }
    if (showGpu) {
        GpuScreen(repo = repo, isAdmin = user?.isAdmin == true, onBack = { showGpu = false })
        return
    }

    fun openInLibrary(id: Long, fromChat: Boolean) {
        returnToChat = fromChat
        openRequest = id
        place = Place.LIBRARY
    }
    fun create(mode: String) { createMode = mode; place = Place.CREATE }

    // Back from any other place goes to the library, the way back from a tab goes home
    // in any bottom-bar app. Registered before the places themselves, so a place's own
    // back handling (out of a thread, out of a conversation) comes first.
    BackHandler(enabled = place != Place.LIBRARY) { place = Place.LIBRARY }
    val toLibrary = { place = Place.LIBRARY }

    if (moreOpen) {
        MoreSheet(
            repo = repo,
            user = user,
            onDismiss = { moreOpen = false },
            onCreate = { moreOpen = false; create(it) },
            onBrowse = { moreOpen = false; library.scope = SCOPE_BROWSE; place = Place.LIBRARY },
            onGames = { moreOpen = false; library.scope = "game"; library.findGames = true; place = Place.LIBRARY },
            onDownloads = { moreOpen = false; showDownloads = true },
            onGpu = { moreOpen = false; showGpu = true },
            onSettings = { moreOpen = false; showSettings = true },
            onLogout = { moreOpen = false; onLogout() },
        )
    }

    CompositionLocalProvider(LocalNavigationBarHolds provides holds, LocalRepo provides repo) {
        Scaffold(
            // The places draw their own top bars and handle the status bar themselves;
            // the shell only owns the bottom.
            contentWindowInsets = WindowInsets(0),
            bottomBar = {
                if (holds.count == 0) PhoneBar(
                    place = place,
                    libbyFace = !repo.prefs.hideLibby && !Appearance.safe,
                    onLibrary = {
                        // A second tap on Library goes to its Overview, as on the web.
                        if (place == Place.LIBRARY) {
                            library.scope = SCOPE_HOME
                            library.findGames = false
                            library.openCollection = null
                        }
                        place = Place.LIBRARY; returnToChat = false
                    },
                    onChat = { place = Place.CHAT; returnToChat = false },
                    onAdd = { library.addRequest++; place = Place.LIBRARY; returnToChat = false },
                    onCreate = { place = Place.CREATE; returnToChat = false },
                    onMore = { moreOpen = true },
                )
            },
        ) { padding ->
            // Consuming the bar's height is what stops each place's own Scaffold from
            // padding for the navigation bar a second time underneath it.
            Box(Modifier.fillMaxSize().padding(padding).consumeWindowInsets(padding)) {
                when (place) {
                    Place.LIBRARY -> LibraryScreen(
                        repo = repo,
                        state = library,
                        onShareToChat = { media -> chatShare = media; place = Place.CHAT },
                        openRequest = openRequest,
                        onOpenRequestTaken = { openRequest = null },
                        onViewerClosed = {
                            if (returnToChat) { returnToChat = false; place = Place.CHAT }
                        },
                        onChat = { place = Place.CHAT },
                        onCreate = { create(it) },
                        onOpenDownloads = { showDownloads = true },
                    )
                    Place.CHAT -> ChatScreen(
                        repo = repo,
                        onBack = toLibrary,
                        onOpenMedia = { id -> openInLibrary(id, fromChat = true) },
                        sharedMedia = chatShare,
                        onSharedMediaConsumed = { chatShare = null },
                        topLevel = true,
                    )
                    Place.CREATE -> ImageGenScreen(
                        repo = repo,
                        onBack = toLibrary,
                        onSaved = { repo.notifyLibraryChanged() },
                        mode = createMode,
                        onMode = { createMode = it },
                    )
                }
            }
        }
    }
}

/**
 * The bar along the bottom: Library, Chat, Add, Create, More. Add is the coral square in
 * the middle — the one action every place shares — and Chat wears her face unless she is
 * hidden or safe view is on.
 */
@Composable
private fun PhoneBar(
    place: Place,
    libbyFace: Boolean,
    onLibrary: () -> Unit,
    onChat: () -> Unit,
    onAdd: () -> Unit,
    onCreate: () -> Unit,
    onMore: () -> Unit,
) {
    val ink = LocalInk.current
    Column(Modifier.fillMaxWidth().background(ink.nav)) {
        Hairline()
        Row(
            Modifier.fillMaxWidth().windowInsetsPadding(WindowInsets.navigationBars).height(68.dp).padding(horizontal = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceEvenly,
        ) {
            BarItem("Library", Icons.Outlined.PhotoLibrary, Icons.Filled.PhotoLibrary, place == Place.LIBRARY, onLibrary)
            BarItem("Chat", Icons.Outlined.Forum, Icons.Filled.Forum, place == Place.CHAT, onChat, face = libbyFace)
            Box(
                Modifier.size(52.dp, 44.dp).clip(RoundedCornerShape(14.dp)).background(MaterialTheme.colorScheme.primary).clickable(onClick = onAdd),
                contentAlignment = Alignment.Center,
            ) { Icon(Icons.Filled.Add, contentDescription = "Add media", tint = MaterialTheme.colorScheme.onPrimary, modifier = Modifier.size(26.dp)) }
            BarItem("Create", Icons.Outlined.AutoAwesome, Icons.Filled.AutoAwesome, place == Place.CREATE, onCreate)
            BarItem("More", Icons.Filled.Menu, Icons.Filled.Menu, false, onMore)
        }
    }
}

@Composable
private fun BarItem(label: String, icon: ImageVector, iconOn: ImageVector, on: Boolean, onClick: () -> Unit, face: Boolean = false) {
    val c = MaterialTheme.colorScheme
    val ink = LocalInk.current
    Column(
        Modifier.width(68.dp).clip(RoundedCornerShape(14.dp)).clickable(onClick = onClick).padding(vertical = 4.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(
            Modifier.size(56.dp, 30.dp).clip(RoundedCornerShape(15.dp)).background(if (on) ink.selected else androidx.compose.ui.graphics.Color.Transparent),
            contentAlignment = Alignment.Center,
        ) {
            if (face) {
                AsyncImage(
                    model = "file:///android_asset/$LIBBY_PFP_ASSET",
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.size(24.dp).clip(CircleShape),
                )
            } else {
                Icon(if (on) iconOn else icon, contentDescription = null, tint = if (on) ink.primaryBright else c.onSurfaceVariant, modifier = Modifier.size(22.dp))
            }
        }
        Spacer(Modifier.height(3.dp))
        Text(
            label,
            style = MaterialTheme.typography.labelMedium.copy(fontSize = 12.sp, fontWeight = if (on) FontWeight.SemiBold else FontWeight.Medium),
            color = if (on) c.onSurface else c.onSurfaceVariant,
        )
    }
}

/**
 * More: what the web's sidebar footer holds, and the studios by name, since Sprites would
 * otherwise be two taps behind Create.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MoreSheet(
    repo: Repository,
    user: User?,
    onDismiss: () -> Unit,
    onCreate: (String) -> Unit,
    onBrowse: () -> Unit,
    onGames: () -> Unit,
    onDownloads: () -> Unit,
    onGpu: () -> Unit,
    onSettings: () -> Unit,
    onLogout: () -> Unit,
) {
    val ink = LocalInk.current
    val downloads = DownloadQueue.items.collectAsState().value.count { it.live }
    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = ink.nav) {
        Column(Modifier.padding(horizontal = 12.dp).padding(bottom = 16.dp)) {
            Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                Initials(user?.username ?: "?", size = 40.dp)
                Spacer(Modifier.width(12.dp))
                Column {
                    Text(user?.username ?: "Signed in", style = MaterialTheme.typography.titleMedium)
                    Text(
                        if (user?.isAdmin == true) "Admin · encrypted vault" else "Encrypted vault",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            Spacer(Modifier.height(6.dp))
            Kicker("Create", Modifier.padding(start = 14.dp, top = 6.dp, bottom = 2.dp))
            LitRow(Icons.Filled.Image, "Image studio", false, { onCreate("image") })
            LitRow(Icons.Filled.Movie, "Video studio", false, { onCreate("video") })
            LitRow(Icons.Filled.FaceRetouchingNatural, "Sprites", false, { onCreate("sprites") })
            LitRow(Icons.Filled.DeveloperBoard, "Graphics card", false, onGpu)
            Kicker("Find", Modifier.padding(start = 14.dp, top = 10.dp, bottom = 2.dp))
            LitRow(Icons.Filled.Explore, "Browse sources", false, onBrowse)
            LitRow(Icons.Filled.SportsEsports, "Find games", false, onGames)
            LitRow(Icons.Filled.Download, "Downloads", false, onDownloads, note = if (downloads > 0) "$downloads going" else null)
            Hairline(Modifier.padding(vertical = 8.dp))
            LitRow(
                if (Appearance.safe) Icons.Filled.VisibilityOff else Icons.Filled.Visibility,
                "Safe view",
                Appearance.safe,
                {
                    Appearance.safe = !Appearance.safe
                    repo.prefs.safeView = Appearance.safe
                },
                note = if (Appearance.safe) "On" else "Off",
            )
            LitRow(Icons.Filled.Settings, "Settings", false, onSettings)
            LitRow(Icons.AutoMirrored.Filled.Logout, "Sign out", false, onLogout, danger = true)
        }
    }
}
