package net.fourbakers.oppailib.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.ChatBubble
import androidx.compose.material.icons.filled.Collections
import androidx.compose.material.icons.filled.Explore
import androidx.compose.material.icons.filled.SportsEsports
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.work.WorkInfo
import androidx.work.WorkManager
import net.fourbakers.oppailib.data.Media
import net.fourbakers.oppailib.data.Repository
import net.fourbakers.oppailib.work.ImportWorker

/**
 * The app's five places, along the bottom of the screen.
 *
 * They used to live in a hamburger drawer, each one a full-screen detour with its own
 * back arrow: going from Libby to Browse was back, open the drawer, tap — and the kind
 * filters were in the same drawer, so switching from Videos to GIFs was a trip through
 * it too. A bar puts every place one tap from every other, the way a phone app is
 * expected to work, and the library's filters moved onto the library itself.
 *
 * [id]s are what [net.fourbakers.oppailib.data.Prefs.lastScreen] stores, and are the
 * ids the drawer version wrote, so reopening after the update lands in the same place.
 */
internal enum class Tab(val id: String, val label: String, val icon: ImageVector) {
    LIBRARY("", "Library", Icons.Filled.Collections),
    BROWSE("browse", "Browse", Icons.Filled.Explore),
    GAMES("games", "Games", Icons.Filled.SportsEsports),
    CHAT("chat", "Libby", Icons.Filled.ChatBubble),
    STUDIO("studio", "Studio", Icons.Filled.AutoAwesome),
    ;

    companion object {
        fun from(id: String): Tab = entries.firstOrNull { it.id == id } ?: LIBRARY
    }
}

/** Downloads was a place in the drawer; it opens from the library's menu now. */
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

@Composable
fun AppShell(repo: Repository, onLogout: () -> Unit) {
    val resumeTo = remember { repo.prefs.lastScreen }
    var tab by remember { mutableStateOf(Tab.from(resumeTo)) }
    var showSettings by remember { mutableStateOf(false) }
    var showDownloads by remember { mutableStateOf(resumeTo == SCREEN_DOWNLOADS) }
    val holds = remember { NavigationBarHolds() }
    val library = remember { LibraryState(repo.prefs) }
    val context = LocalContext.current

    // Anything landing in the library — an upload finishing, a save from Browse, an
    // import worker completing — marks the grid stale, whichever tab is up, so it is
    // fresh the next time you look at it. The tab used to only notice while on screen.
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
    LaunchedEffect(tab, showDownloads) {
        repo.prefs.lastScreen = if (showDownloads) SCREEN_DOWNLOADS else tab.id
    }

    if (showSettings) {
        SettingsScreen(repo = repo, onBack = { showSettings = false }, onLogout = onLogout)
        return
    }
    if (showDownloads) {
        DownloadsScreen(onBack = { showDownloads = false })
        return
    }

    fun openInLibrary(id: Long, fromChat: Boolean) {
        returnToChat = fromChat
        openRequest = id
        tab = Tab.LIBRARY
    }

    // Back from any other place goes to the library, the way back from a tab goes home
    // in any bottom-bar app. Registered before the places themselves, so a place's own
    // back handling (out of a thread, out of a conversation) comes first.
    BackHandler(enabled = tab != Tab.LIBRARY) { tab = Tab.LIBRARY }
    val toLibrary = { tab = Tab.LIBRARY }

    CompositionLocalProvider(LocalNavigationBarHolds provides holds) {
        Scaffold(
            // The places draw their own top bars and handle the status bar themselves;
            // the shell only owns the bottom.
            contentWindowInsets = WindowInsets(0),
            bottomBar = {
                if (holds.count == 0) NavigationBar {
                    Tab.entries.forEach { place ->
                        NavigationBarItem(
                            selected = tab == place,
                            // Going somewhere by hand ends any detour from chat: the next
                            // viewer closed is not one that chat asked for.
                            onClick = { tab = place; returnToChat = false },
                            icon = { Icon(place.icon, contentDescription = null) },
                            label = { Text(place.label) },
                        )
                    }
                }
            },
        ) { padding ->
            // Consuming the bar's height is what stops each place's own Scaffold from
            // padding for the navigation bar a second time underneath it.
            Box(Modifier.fillMaxSize().padding(padding).consumeWindowInsets(padding)) {
                when (tab) {
                    Tab.LIBRARY -> LibraryScreen(
                        repo = repo,
                        state = library,
                        onLogout = onLogout,
                        onOpenSettings = { showSettings = true },
                        onOpenDownloads = { showDownloads = true },
                        onShareToChat = { media -> chatShare = media; tab = Tab.CHAT },
                        openRequest = openRequest,
                        onOpenRequestTaken = { openRequest = null },
                        onViewerClosed = {
                            if (returnToChat) { returnToChat = false; tab = Tab.CHAT }
                        },
                    )
                    Tab.BROWSE -> BrowseScreen(repo = repo, onBack = toLibrary, topLevel = true)
                    Tab.GAMES -> GameBrowseScreen(
                        repo = repo,
                        onBack = toLibrary,
                        onOpenMedia = { id -> openInLibrary(id, fromChat = false) },
                        topLevel = true,
                    )
                    Tab.CHAT -> ChatScreen(
                        repo = repo,
                        onBack = toLibrary,
                        onOpenMedia = { id -> openInLibrary(id, fromChat = true) },
                        sharedMedia = chatShare,
                        onSharedMediaConsumed = { chatShare = null },
                        topLevel = true,
                    )
                    Tab.STUDIO -> ImageGenScreen(
                        repo = repo,
                        onBack = toLibrary,
                        onSaved = { repo.notifyLibraryChanged() },
                        topLevel = true,
                    )
                }
            }
        }
    }
}
