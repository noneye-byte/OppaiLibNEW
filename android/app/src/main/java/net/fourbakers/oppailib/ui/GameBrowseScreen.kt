package net.fourbakers.oppailib.ui

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Login
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Done
import androidx.compose.material.icons.filled.LibraryAdd
import androidx.compose.material.icons.filled.OpenInNew
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.SportsEsports
import androidx.compose.material.icons.filled.Update
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import net.fourbakers.oppailib.data.GameBrowseAddRequest
import net.fourbakers.oppailib.data.GameBrowseDetailRequest
import net.fourbakers.oppailib.data.GameSiteAccount
import net.fourbakers.oppailib.data.GameSiteItem
import net.fourbakers.oppailib.data.GameSiteLoginRequest
import net.fourbakers.oppailib.data.GameSitesResponse
import net.fourbakers.oppailib.data.GameUpdatesResponse
import net.fourbakers.oppailib.data.Repository
import net.fourbakers.oppailib.data.isSignedOut
import net.fourbakers.oppailib.data.serverMessage
import java.text.DateFormat
import java.util.Date

/**
 * The game catalogues on the phone: itch.io, F95zone, and the updates waiting.
 *
 * The web client has had this since the games work landed; the phone had only the half
 * that comes *after* a game is on the shelf — check its page, see a new version, launch
 * it through Launchy. Which is the wrong half to have on a phone. Finding a game is the
 * part you do lying in bed; installing it is the part you do at the desk. So this is the
 * finding half: search either site, read a thread without opening a browser that wants
 * your cookies, and hand the page to the server to file away, so the build is already
 * downloaded by the time you are back at the PC.
 *
 * Everything here goes through the server and nothing reaches either site from the
 * handset. That is not only privacy: the server is the thing that holds a session on
 * F95zone, and a phone that fetched the thread itself would be a guest — which on
 * F95zone means no download links and, for a good share of threads, no thread. The same
 * is true of a card's artwork, which comes back through the scrape proxy rather than
 * from the site's CDN.
 *
 * Both catalogues are browsed signed in or not at all. A listing that half-works signed
 * out is a listing that quietly lies about what is on the site, so the sign-in is a wall
 * in front of the grid rather than a setting somewhere else — and it is on the tab that
 * needs it, because that is where you find out you need it.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GameBrowseScreen(
    repo: Repository,
    openAt: String = FACE_F95,
    onBack: () -> Unit,
    onOpenMedia: (Long) -> Unit,
) {
    var face by remember { mutableStateOf(openAt) }

    var sites by remember { mutableStateOf<GameSitesResponse?>(null) }
    var sitesError by remember { mutableStateOf("") }

    // The sign-in form. None of it is kept: a password typed here goes to the server,
    // which stores it, and is dropped from this screen the moment the call returns.
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var cookie by remember { mutableStateOf("") }
    var signingIn by remember { mutableStateOf(false) }
    var signInError by remember { mutableStateOf("") }

    // `query` is the committed search — what was actually fetched. `draft` is what is in
    // the box. Keeping them apart is what stops every keystroke becoming a request to
    // somebody else's site.
    var query by remember { mutableStateOf("") }
    var draft by remember { mutableStateOf("") }
    var sort by remember { mutableStateOf("") }
    var results by remember { mutableStateOf<List<GameSiteItem>>(emptyList()) }
    var page by remember { mutableIntStateOf(1) }
    var hasMore by remember { mutableStateOf(false) }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }

    // The card open in the sheet, and whether its own page has been read yet.
    var detail by remember { mutableStateOf<GameSiteItem?>(null) }
    var detailLoading by remember { mutableStateOf(false) }
    var detailDegraded by remember { mutableStateOf(false) }
    var adding by remember { mutableStateOf(false) }

    var updates by remember { mutableStateOf<GameUpdatesResponse?>(null) }
    var updatesLoading by remember { mutableStateOf(false) }

    // Stamps every listing request so a slow page from a site we have left cannot land
    // in the grid of the site we are on. The same guard the source browser needs, for
    // the same reason: switching tab fires a new request while the old one is still in
    // the air, and without this the one that *returns* last wins.
    var req by remember { mutableIntStateOf(0) }

    val scope = rememberCoroutineScope()
    val snackbar = remember { SnackbarHostState() }
    val keyboard = LocalSoftwareKeyboardController.current
    val context = LocalContext.current
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    val account: GameSiteAccount? = sites?.sites?.firstOrNull { it.site == face }
    val sorts = sites?.sorts?.get(face).orEmpty()

    fun say(message: String) {
        scope.launch { snackbar.showSnackbar(message) }
    }

    fun openInBrowser(url: String) {
        if (url.isBlank()) return
        // The file hosts a thread links to want the viewer's own cookies and their
        // captchas, not the server's — so a page is handed to the browser rather than
        // fetched here. Wrapped because a handset with no browser resolves nothing.
        runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }
            .onFailure { say("Nothing on this phone can open that link.") }
    }

    suspend fun loadSites() {
        runCatching { repo.api.gameSites() }
            .onSuccess { sites = it; sitesError = "" }
            .onFailure { sitesError = it.serverMessage("Couldn't reach the server") }
    }

    fun search(wanted: Int) {
        if (face == FACE_UPDATES) return
        val site = face
        req += 1
        val mine = req
        loading = true
        error = ""
        if (wanted == 1) results = emptyList()
        scope.launch {
            val result = runCatching { repo.api.gameBrowse(site, query, sort, wanted) }
            // Superseded: this page belongs to a tab we have already left.
            if (mine != req) return@launch
            result
                .onSuccess { listing ->
                    results = if (wanted == 1) listing.items else results + listing.items
                    page = listing.page
                    hasMore = listing.hasMore
                }
                .onFailure { err ->
                    error = err.serverMessage("Couldn't read ${account?.label ?: site}")
                    // The site's session may have lapsed under us — which is a sign-in
                    // wall, not a failure — so re-read who is signed in and let the
                    // wall replace the grid.
                    if (err.isSignedOut()) loadSites()
                }
            loading = false
        }
    }

    fun loadUpdates() {
        updatesLoading = true
        scope.launch {
            runCatching { repo.api.gameUpdates() }
                .onSuccess { updates = it }
                .onFailure { say(it.serverMessage("Couldn't read the update list")) }
            updatesLoading = false
        }
    }

    LaunchedEffect(Unit) { loadSites() }

    // Each tab is its own search, its own sort and its own grid. Clearing them on the
    // way in is what stops F95zone's ordering being asked of itch.io, which answers by
    // ignoring it and looking like it lost the sort.
    LaunchedEffect(face) {
        query = ""
        draft = ""
        sort = ""
        results = emptyList()
        error = ""
        detail = null
        if (face == FACE_UPDATES) loadUpdates()
    }

    // The one place a listing is asked for on arrival, keyed on both the tab and the
    // sign-in — so it also covers the two cases that are not a tap: the sites list
    // landing with the account already signed in, and a sign-in completing on the wall
    // this tab was showing. Split from the reset above rather than folded into it
    // because a single effect doing both would fire twice on a tab change and fetch the
    // same page of somebody else's site twice. The reset runs first: both are launched
    // in composition order and neither suspends before its work is done.
    LaunchedEffect(face, account?.signedIn) {
        if (face != FACE_UPDATES && account?.signedIn == true) search(1)
    }

    // A sweep is minutes of reading other people's pages, so its progress is polled
    // while it runs and not otherwise.
    LaunchedEffect(updates?.sweep?.running) {
        while (updates?.sweep?.running == true) {
            delay(2500)
            runCatching { repo.api.gameUpdates() }.onSuccess { updates = it }
        }
    }

    fun signIn() {
        val site = face
        if (site == FACE_UPDATES) return
        signingIn = true
        signInError = ""
        scope.launch {
            val body = if (cookie.isNotBlank()) {
                GameSiteLoginRequest(cookie = cookie.trim())
            } else {
                GameSiteLoginRequest(username = username.trim(), password = password)
            }
            runCatching { repo.api.gameSiteLogin(site, body) }
                .onSuccess { acct ->
                    sites = sites?.let { s -> s.copy(sites = s.sites.map { if (it.site == site) acct else it }) }
                    password = ""
                    cookie = ""
                }
                .onFailure { signInError = it.serverMessage("That sign-in was refused") }
            signingIn = false
        }
    }

    fun signOut() {
        val site = face
        scope.launch {
            runCatching { repo.api.gameSiteLogout(site) }
                .onSuccess { acct ->
                    sites = sites?.let { s -> s.copy(sites = s.sites.map { if (it.site == site) acct else it }) }
                    results = emptyList()
                }
                .onFailure { say(it.serverMessage("Couldn't sign out")) }
        }
    }

    fun open(item: GameSiteItem) {
        detail = item
        detailDegraded = false
        detailLoading = true
        scope.launch {
            runCatching { repo.api.gameBrowseDetail(GameBrowseDetailRequest(item)) }
                .onSuccess { full ->
                    // Only if the sheet still holds the card that asked: a slow page read
                    // must not overwrite whatever the user opened next.
                    if (detail?.id == item.id && detail?.site == item.site) {
                        detail = full.item
                        detailDegraded = full.degraded
                    }
                }
            // A failed read leaves the listing's own thinner data on screen, which is
            // still enough to add the game. Nothing to report.
            detailLoading = false
        }
    }

    fun add() {
        val item = detail ?: return
        adding = true
        scope.launch {
            runCatching {
                repo.api.gameBrowseAdd(GameBrowseAddRequest(url = item.url, id = item.id, version = item.version))
            }
                .onSuccess { result ->
                    results = results.map {
                        if (it.id == item.id && it.site == item.site) it.copy(libraryId = result.id) else it
                    }
                    detail = item.copy(libraryId = result.id)
                    repo.notifyLibraryChanged()
                    say(if (result.created) "Added ${item.title}." else "${item.title} was already in the library.")
                }
                .onFailure {
                    // The import runs on detached, so a phone that waited ten minutes and
                    // gave up has not cancelled anything — saying so is the difference
                    // between "try again" and "go and check".
                    say(it.serverMessage("The server is still working on ${item.title}"))
                }
            adding = false
        }
    }

    fun acknowledge(id: Long) {
        scope.launch {
            runCatching { repo.api.acknowledgeGameRemote(id) }
                .onSuccess { loadUpdates(); repo.notifyLibraryChanged() }
                .onFailure { say(it.serverMessage("Couldn't mark that as installed")) }
        }
    }

    fun checkAll() {
        scope.launch {
            runCatching { repo.api.gameUpdatesCheck() }
                // Re-read rather than trusting the start response: the sweep's own
                // progress is what the polling effect below keys on.
                .onSuccess { loadUpdates() }
                .onFailure { say(it.serverMessage("Couldn't start the check")) }
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbar) },
        topBar = {
            TopAppBar(
                title = { Text("Games") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    if (face != FACE_UPDATES && account?.signedIn == true) {
                        TextButton(onClick = { signOut() }) {
                            Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = null, modifier = Modifier.size(18.dp))
                            Text("  Sign out", maxLines = 1)
                        }
                    }
                },
            )
        },
    ) { padding ->
        Column(Modifier.padding(padding).fillMaxSize()) {
            FaceRow(face) { face = it }

            when {
                sitesError.isNotEmpty() && face != FACE_UPDATES ->
                    Centered { Text(sitesError, Modifier.padding(24.dp)) }

                face == FACE_UPDATES -> UpdatesFace(
                    repo = repo,
                    updates = updates,
                    loading = updatesLoading,
                    onCheckAll = { checkAll() },
                    onOpenMedia = onOpenMedia,
                    onOpenPage = { openInBrowser(it) },
                    onAcknowledge = { acknowledge(it) },
                )

                sites == null -> Centered { CircularProgressIndicator() }

                account?.signedIn != true -> SignInFace(
                    site = face,
                    label = account?.label ?: face,
                    username = username,
                    password = password,
                    cookie = cookie,
                    busy = signingIn,
                    error = signInError,
                    onUsername = { username = it },
                    onPassword = { password = it },
                    onCookie = { cookie = it },
                    onSubmit = { keyboard?.hide(); signIn() },
                )

                else -> {
                    OutlinedTextField(
                        value = draft,
                        onValueChange = { draft = it },
                        label = { Text("Search ${account.label}") },
                        singleLine = true,
                        leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                        keyboardActions = KeyboardActions(onSearch = {
                            keyboard?.hide()
                            query = draft.trim()
                            search(1)
                        }),
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 4.dp),
                    )
                    // itch.io's search has no ordering and answers every page with the
                    // same batch, so offering its sorts over a search would be offering
                    // buttons that do nothing.
                    if (sorts.isNotEmpty() && !(face == FACE_ITCH && query.isNotEmpty())) {
                        Row(
                            Modifier.fillMaxWidth().horizontalScroll(rememberScrollState())
                                .padding(horizontal = 12.dp, vertical = 6.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            sorts.forEach { s ->
                                FilterChip(
                                    selected = (sort.ifEmpty { sorts.first().key }) == s.key,
                                    onClick = { sort = s.key; search(1) },
                                    label = { Text(s.label) },
                                )
                            }
                        }
                    }
                    if (face == FACE_ITCH && sites?.itchNsfw == false) {
                        Text(
                            "itch.io is being asked for its safe listing. Turn on adult listings in Settings on the web.",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 2.dp),
                        )
                    }

                    when {
                        error.isNotEmpty() && results.isEmpty() -> Centered { Text(error, Modifier.padding(24.dp)) }
                        results.isEmpty() && loading -> Centered { CircularProgressIndicator() }
                        results.isEmpty() -> Centered {
                            Text("Nothing here.", Modifier.padding(24.dp), color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        else -> LazyVerticalGrid(
                            columns = GridCells.Adaptive(168.dp),
                            contentPadding = PaddingValues(12.dp),
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp),
                            modifier = Modifier.fillMaxSize(),
                        ) {
                            items(results, key = { "${it.site}:${it.id}" }) { item ->
                                GameCard(repo, item) { open(item) }
                            }
                            // A button rather than an endless scroll: a page is a fetch
                            // and a parse of somebody else's site, and one that fires
                            // because a thumb brushed the bottom of the list is a page
                            // nobody asked for.
                            if (hasMore || loading) {
                                item(span = { GridItemSpan(maxLineSpan) }) {
                                    Box(Modifier.fillMaxWidth().padding(16.dp), Alignment.Center) {
                                        if (loading) CircularProgressIndicator()
                                        else OutlinedButton(onClick = { search(page + 1) }) { Text("Load more") }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    detail?.let { item ->
        ModalBottomSheet(onDismissRequest = { detail = null }, sheetState = sheetState) {
            GameDetailSheet(
                repo = repo,
                item = item,
                loading = detailLoading,
                degraded = detailDegraded,
                adding = adding,
                onAdd = { add() },
                onOpenPage = { openInBrowser(item.url) },
                onOpenInLibrary = { detail = null; onOpenMedia(item.libraryId) },
                onShot = { openInBrowser(it) },
            )
        }
    }
}

const val FACE_ITCH = "itch"
const val FACE_F95 = "f95"
private const val FACE_UPDATES = "updates"

@Composable
private fun FaceRow(face: String, onSelect: (String) -> Unit) {
    Row(
        Modifier.fillMaxWidth().horizontalScroll(rememberScrollState())
            .padding(horizontal = 12.dp, vertical = 6.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        listOf(FACE_ITCH to "itch.io", FACE_F95 to "F95zone", FACE_UPDATES to "Updates").forEach { (id, label) ->
            FilterChip(selected = face == id, onClick = { onSelect(id) }, label = { Text(label) })
        }
    }
}

@Composable
private fun Centered(content: @Composable () -> Unit) {
    Box(Modifier.fillMaxSize(), Alignment.Center) { content() }
}

/**
 * The wall in front of a catalogue that has not been signed in to.
 *
 * The two sites take different things and the difference is not cosmetic. F95zone takes
 * an account; itch.io cannot, because its login page sits behind a browser check no
 * server can pass, so it is signed in by pasting a session cookie from a browser that
 * already is. F95zone accepts a cookie too, which is the way in for an account with
 * two-step verification.
 */
@Composable
private fun SignInFace(
    site: String,
    label: String,
    username: String,
    password: String,
    cookie: String,
    busy: Boolean,
    error: String,
    onUsername: (String) -> Unit,
    onPassword: (String) -> Unit,
    onCookie: (String) -> Unit,
    onSubmit: () -> Unit,
) {
    val itch = site == FACE_ITCH
    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("Sign in to $label", style = MaterialTheme.typography.titleLarge)
        Text(
            if (itch) {
                "itch.io only shows adult games to an account that has asked for them, and its login page " +
                    "sits behind a browser check a server cannot pass. Sign in with the session cookie from a " +
                    "browser where you already are: open itch.io, then developer tools → Application → Cookies, " +
                    "and copy the value of the itchio cookie. If Launchy is paired and signed in, it hands its " +
                    "own sign-in over without any of this."
            } else {
                "F95zone hides most game threads and every download link from guests. The login is kept on the " +
                    "server and used only for reading the site."
            },
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        if (!itch) {
            OutlinedTextField(
                value = username,
                onValueChange = onUsername,
                label = { Text("Username") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = password,
                onValueChange = onPassword,
                label = { Text("Password") },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Go),
                keyboardActions = KeyboardActions(onGo = { onSubmit() }),
                modifier = Modifier.fillMaxWidth(),
            )
            Text(
                "or, for an account with two-step verification",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        OutlinedTextField(
            value = cookie,
            onValueChange = onCookie,
            label = { Text(if (itch) "itchio cookie" else "xf_user cookie") },
            placeholder = { Text(if (itch) "itchio=…  (or just the value)" else "xf_user=…; xf_session=…") },
            minLines = 2,
            modifier = Modifier.fillMaxWidth(),
        )
        Button(
            onClick = onSubmit,
            enabled = !busy && (cookie.isNotBlank() || (!itch && username.isNotBlank() && password.isNotEmpty())),
        ) {
            Icon(Icons.AutoMirrored.Filled.Login, contentDescription = null, modifier = Modifier.size(18.dp))
            Text(if (busy) "  Signing in…" else "  Sign in")
        }
        if (error.isNotEmpty()) {
            Text(error, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
        }
    }
}

@Composable
private fun GameCard(repo: Repository, item: GameSiteItem, onClick: () -> Unit) {
    val context = LocalContext.current
    Column(Modifier.clickable(onClick = onClick)) {
        Box(
            Modifier.fillMaxWidth().aspectRatio(0.75f).clip(RoundedCornerShape(16.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant),
        ) {
            if (item.thumbnail.isNotEmpty()) {
                AsyncImage(
                    // Through the server, like every other remote picture: the origin
                    // would otherwise see the handset's address on every tile it scrolls
                    // past, and a good share of them refuse a hotlink anyway.
                    model = ImageRequest.Builder(context).data(repo.proxyUrl(item.thumbnail)).crossfade(true).build(),
                    imageLoader = repo.imageLoader,
                    contentDescription = item.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize(),
                )
            } else {
                Box(Modifier.fillMaxSize(), Alignment.Center) {
                    Icon(
                        Icons.Filled.SportsEsports,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(40.dp),
                    )
                }
            }
            // What the shelf already holds outranks everything else a badge could say:
            // the one thing worth knowing before tapping is whether this is a find or a
            // duplicate.
            when {
                item.libraryId > 0 -> CardBadge(Icons.Filled.Check, "In library")
                item.webPlayable -> CardBadge(Icons.Filled.PlayArrow, "Browser")
            }
        }
        Text(
            item.title,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.SemiBold,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(top = 6.dp),
        )
        val sub = listOf(item.developer, item.version.takeIf { it.isNotEmpty() }?.let { "v$it" })
            .filterNotNull().filter { it.isNotEmpty() }.joinToString(" · ")
            .ifEmpty { item.tags.take(3).joinToString(", ") }
        if (sub.isNotEmpty()) {
            Text(
                sub,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

@Composable
private fun BoxScope.CardBadge(icon: ImageVector, label: String) {
    Row(
        Modifier.align(Alignment.TopEnd).padding(6.dp).clip(RoundedCornerShape(12.dp))
            .background(Color(0x99000000)).padding(horizontal = 8.dp, vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, contentDescription = null, tint = Color.White, modifier = Modifier.size(14.dp))
        Text(label, color = Color.White, style = MaterialTheme.typography.labelSmall)
    }
}

/**
 * One result, opened.
 *
 * The sheet shows the listing's own data immediately and replaces it with the game's
 * page once that has been read, rather than holding an empty sheet over a fetch of
 * somebody else's site. [degraded] is that read having failed: what is on screen is the
 * thinner listing data, which is worth saying because a sparse-looking thread and a
 * thread that would not load are otherwise indistinguishable.
 */
@Composable
private fun GameDetailSheet(
    repo: Repository,
    item: GameSiteItem,
    loading: Boolean,
    degraded: Boolean,
    adding: Boolean,
    onAdd: () -> Unit,
    onOpenPage: () -> Unit,
    onOpenInLibrary: () -> Unit,
    onShot: (String) -> Unit,
) {
    val context = LocalContext.current
    Column(
        Modifier.fillMaxWidth().heightIn(max = 620.dp).verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp).padding(bottom = 28.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text(item.title, style = MaterialTheme.typography.titleLarge)
        val facts = listOfNotNull(
            item.developer.takeIf { it.isNotEmpty() },
            item.version.takeIf { it.isNotEmpty() }?.let { "v$it" },
            item.rating.takeIf { it > 0 }?.let { "★ %.1f".format(it) },
            "Adult".takeIf { item.nsfw },
            "reading the page…".takeIf { loading },
            "the page would not load — this is what the listing said".takeIf { degraded && !loading },
        )
        if (facts.isNotEmpty()) {
            Text(
                facts.joinToString(" · "),
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        if (item.images.isNotEmpty()) {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(item.images) { url ->
                    AsyncImage(
                        model = ImageRequest.Builder(context).data(repo.proxyUrl(url)).crossfade(true).build(),
                        imageLoader = repo.imageLoader,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.height(130.dp).width(220.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(MaterialTheme.colorScheme.surfaceVariant)
                            .clickable { onShot(url) },
                    )
                }
            }
        }
        if (item.description.isNotEmpty()) {
            Text(item.description, style = MaterialTheme.typography.bodyMedium)
        }
        if (item.tags.isNotEmpty()) {
            Text(
                item.tags.joinToString(" · "),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            if (item.libraryId > 0) {
                Button(onClick = onOpenInLibrary) {
                    Icon(Icons.Filled.Check, contentDescription = null, modifier = Modifier.size(18.dp))
                    Text("  In library — open")
                }
            } else {
                Button(onClick = onAdd, enabled = !adding) {
                    Icon(Icons.Filled.LibraryAdd, contentDescription = null, modifier = Modifier.size(18.dp))
                    Text(if (adding) "  Adding…" else "  Add to library")
                }
            }
            OutlinedButton(onClick = onOpenPage) {
                Icon(Icons.Filled.OpenInNew, contentDescription = null, modifier = Modifier.size(18.dp))
                Text("  Open page")
            }
        }
        if (adding) {
            Text(
                "The server downloads the build; this can take a while and carries on without the phone.",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

/** Games whose site is on a newer version than the shelf is. */
@Composable
private fun UpdatesFace(
    repo: Repository,
    updates: GameUpdatesResponse?,
    loading: Boolean,
    onCheckAll: () -> Unit,
    onOpenMedia: (Long) -> Unit,
    onOpenPage: (String) -> Unit,
    onAcknowledge: (Long) -> Unit,
) {
    val context = LocalContext.current
    val sweep = updates?.sweep
    Column(Modifier.fillMaxSize()) {
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Button(onClick = onCheckAll, enabled = sweep?.running != true) {
                Icon(Icons.Filled.Update, contentDescription = null, modifier = Modifier.size(18.dp))
                Text(if (sweep?.running == true) "  Checking ${sweep.done}/${sweep.total}…" else "  Check for updates")
            }
            val note = when {
                sweep?.running == true -> sweep.current
                sweep != null && sweep.lastRun > 0 -> buildString {
                    append("Last checked ")
                    append(DateFormat.getDateTimeInstance(DateFormat.SHORT, DateFormat.SHORT).format(Date(sweep.lastRun * 1000)))
                    append(" · ${updates.tracked} tracked")
                    if (sweep.errors > 0) append(" · ${sweep.errors} could not be read")
                }
                else -> ""
            }
            if (note.isNotEmpty()) {
                Text(
                    note,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
        when {
            loading && updates == null -> Centered { CircularProgressIndicator() }
            updates == null || updates.items.isEmpty() -> Centered {
                Text(
                    if (updates != null && updates.tracked > 0) {
                        "Everything is up to date."
                    } else {
                        "No game here came from itch.io or F95zone yet — add one from those tabs and its version will be watched."
                    },
                    Modifier.padding(24.dp),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            else -> LazyColumn(Modifier.fillMaxSize()) {
                items(updates.items, key = { it.id }) { g ->
                    Row(
                        Modifier.fillMaxWidth().clickable { onOpenMedia(g.id) }.padding(12.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(
                            Modifier.size(56.dp).clip(RoundedCornerShape(10.dp))
                                .background(MaterialTheme.colorScheme.surfaceVariant),
                            Alignment.Center,
                        ) {
                            if (g.hasThumb) {
                                AsyncImage(
                                    model = ImageRequest.Builder(context).data(repo.thumbUrl(g.id)).crossfade(true).build(),
                                    imageLoader = repo.imageLoader,
                                    contentDescription = null,
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier.fillMaxSize(),
                                )
                            } else {
                                Icon(
                                    Icons.Filled.SportsEsports,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                        Column(Modifier.weight(1f)) {
                            Text(g.title, maxLines = 1, overflow = TextOverflow.Ellipsis, fontWeight = FontWeight.SemiBold)
                            Text(
                                "${g.remote.knownVersion.ifEmpty { "unknown" }} → ${g.remote.latestVersion} on ${g.remote.label}",
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            if (g.remote.changelog.isNotEmpty()) {
                                Text(
                                    g.remote.changelog,
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    maxLines = 3,
                                    overflow = TextOverflow.Ellipsis,
                                )
                            }
                        }
                        IconButton(onClick = { onOpenPage(g.remote.url) }) {
                            Icon(Icons.Filled.OpenInNew, contentDescription = "Open the page")
                        }
                        // Not "dismiss": the badge goes away because the newest version
                        // is now the installed one, which is a fact about the shelf.
                        IconButton(onClick = { onAcknowledge(g.id) }) {
                            Icon(Icons.Filled.Done, contentDescription = "I have this version now")
                        }
                    }
                }
            }
        }
    }
}
