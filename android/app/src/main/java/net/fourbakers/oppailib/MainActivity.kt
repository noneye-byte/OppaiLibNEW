package net.fourbakers.oppailib

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.collect
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.lifecycleScope
import net.fourbakers.oppailib.data.LibbyMeter
import net.fourbakers.oppailib.data.LibbyVoice
import net.fourbakers.oppailib.data.Repository
import net.fourbakers.oppailib.ui.LibbyPortrait
import net.fourbakers.oppailib.ui.AppShell
import net.fourbakers.oppailib.ui.LoginScreen
import net.fourbakers.oppailib.ui.mascotAsset
import net.fourbakers.oppailib.ui.theme.Appearance
import net.fourbakers.oppailib.ui.theme.OppaiTheme
import net.fourbakers.oppailib.work.ShareIntake
import kotlinx.coroutines.launch

class MainActivity : FragmentActivity() {

    private var pendingShare: Intent? = null
    private var activeSystemPickers = 0

    internal val systemPickerInProgress: Boolean
        get() = activeSystemPickers > 0

    internal fun systemPickerStarted() {
        activeSystemPickers++
    }

    internal fun systemPickerFinished() {
        activeSystemPickers = (activeSystemPickers - 1).coerceAtLeast(0)
    }

    private val askNotifications =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { /* declined is fine */ }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Android recents must never retain a readable frame of the library. FLAG_SECURE
        // makes the system use a blank/locked task thumbnail on every supported version.
        window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
        enableEdgeToEdge()
        requestNotificationsIfNeeded()
        val repo = OppaiApp.from(this).repository
        Appearance.materialYou = repo.prefs.materialYou
        Appearance.safe = repo.prefs.safeView
        setContent {
            OppaiTheme {
                Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                    AppRoot(
                        repo = repo,
                        biometric = ::promptBiometric,
                        onAuthenticated = { consumePendingShare(repo) },
                        systemPickerInProgress = { systemPickerInProgress },
                    )
                }
            }
        }
        acceptShareIntent(intent, repo)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        acceptShareIntent(intent, OppaiApp.from(this).repository)
    }

    /**
     * A share that reached the app itself rather than the share activity: forwarded here
     * because the phone had no way in yet (see ShareActivity). Held until a sign-in or an
     * unlock, then queued exactly as the share activity queues one.
     */
    private fun acceptShareIntent(intent: Intent?, repo: Repository) {
        if (!ShareIntake.isShare(intent)) return
        pendingShare = Intent(intent)
        if (repo.hasSession) consumePendingShare(repo)
    }

    private fun consumePendingShare(repo: Repository) {
        val shared = pendingShare ?: return
        if (!repo.hasSession) return
        pendingShare = null
        lifecycleScope.launch {
            // A key first, so the queued work is not standing on the session that ends
            // the moment the user goes back to the app they shared from.
            repo.ensureShareKey()
            val queued = ShareIntake.accept(this@MainActivity, shared)
            // No notifyLibraryChanged here: nothing has landed yet. The workers announce
            // the library change when a file actually finishes.
            if (queued.total > 0) {
                // Adding to the library warms Libby up, and she reacts in whatever
                // state that leaves her in (see LibbyVoice) rather than reciting a
                // fixed line every time.
                LibbyMeter.bump(if (queued.total > 1) 2 else 1)
                val reaction = LibbyVoice.react(LibbyVoice.Event.IMPORT, count = queued.total)
                repo.report("${reaction.message} ${ShareIntake.summary(queued)}", reaction.emotion)
            } else {
                repo.report(ShareIntake.summary(queued))
            }
        }
    }

    /**
     * Asks for notifications on the versions that gate them (13+). Only imports post
     * any, and a refusal costs nothing more than a silent one — so it's asked for once
     * on launch and never insisted on.
     */
    private fun requestNotificationsIfNeeded() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
        val granted = ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) ==
            PackageManager.PERMISSION_GRANTED
        if (!granted) askNotifications.launch(Manifest.permission.POST_NOTIFICATIONS)
    }

    /**
     * Shows the system unlock prompt and reports the outcome.
     *
     * The prompt accepts the device PIN/pattern as well as a biometric ([DEVICE_CREDENTIAL]
     * alongside [BIOMETRIC_WEAK]): a fingerprint sensor that's briefly unavailable — busy
     * right after the phone itself was unlocked, say — used to dead-end the lock screen with
     * "something went wrong", and the PIN is the way through that. It also means no negative
     * "Cancel" button (the framework forbids pairing one with a device-credential fallback);
     * the way out is to authenticate or to leave the app.
     *
     * [onError] carries the message to show; an empty string means the user simply
     * dismissed it (nothing worth flagging). Crucially, nothing here ever touches the
     * session — a failed unlock leaves you locked, not logged out.
     */
    private fun promptBiometric(onSuccess: () -> Unit, onError: (String) -> Unit) {
        val authenticators = BiometricManager.Authenticators.BIOMETRIC_WEAK or
            BiometricManager.Authenticators.DEVICE_CREDENTIAL
        val canAuth = BiometricManager.from(this).canAuthenticate(authenticators)
        if (canAuth != BiometricManager.BIOMETRIC_SUCCESS) {
            onSuccess() // no biometric and no device lock → don't lock the user out
            return
        }
        val prompt = BiometricPrompt(
            this,
            ContextCompat.getMainExecutor(this),
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) = onSuccess()

                override fun onAuthenticationError(code: Int, msg: CharSequence) {
                    // A deliberate dismissal isn't a fault to surface; anything else is.
                    val dismissed = code == BiometricPrompt.ERROR_USER_CANCELED ||
                        code == BiometricPrompt.ERROR_CANCELED ||
                        code == BiometricPrompt.ERROR_NEGATIVE_BUTTON
                    onError(if (dismissed) "" else msg.toString())
                }
                // onAuthenticationFailed (a finger that didn't match) leaves the prompt up
                // for another try, so it's not terminal and needs no handling here.
            },
        )
        val info = BiometricPrompt.PromptInfo.Builder()
            .setTitle("Unlock OppaiLib")
            .setSubtitle("Authenticate to view your library")
            .setAllowedAuthenticators(authenticators)
            .build()
        // Launching a prompt at a bad moment (a torn-down window) throws rather than
        // calling back; catch it so it surfaces as a retryable error, not a crash.
        runCatching { prompt.authenticate(info) }
            .onFailure { onError(it.message ?: "Couldn't start authentication") }
    }
}

@Composable
private fun AppRoot(
    repo: Repository,
    biometric: (onSuccess: () -> Unit, onError: (String) -> Unit) -> Unit,
    onAuthenticated: () -> Unit,
    systemPickerInProgress: () -> Boolean,
) {
    var authed by remember { mutableStateOf(repo.hasSession || repo.canBiometricReauth) }
    var locked by remember { mutableStateOf(repo.canBiometricReauth) }
    // Guards the lock re-arm against the biometric prompt's own lifecycle: on some devices
    // the system prompt drives the activity through ON_STOP, which would otherwise re-lock
    // (harmless) and, worse, race the success callback. While a prompt is in flight this
    // stays true, so background handling leaves it alone.
    var authInProgress by remember { mutableStateOf(false) }
    var lockError by remember { mutableStateOf<String?>(null) }
    var mascotMessage by remember { mutableStateOf("") }
    var mascotEmotion by remember { mutableStateOf("neutral") }
    var closeInProgress by remember { mutableStateOf(repo.hasSession && repo.canBiometricReauth) }
    var resumePending by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(repo) {
        repo.errors.collect { mascotMessage = it.message; mascotEmotion = it.emotion }
    }
    LaunchedEffect(mascotMessage) {
        if (mascotMessage.isNotBlank()) {
            delay(5_000)
            mascotMessage = ""
        }
    }

    fun unlock() {
        if (authInProgress) return
        authInProgress = true
        lockError = null
        biometric(
            {
                scope.launch {
                    val ok = repo.hasSession || repo.reauthenticate()
                    authInProgress = false
                    if (ok) {
                        locked = false
                        authed = true
                        mascotMessage = "Welcome back!"; mascotEmotion = "happy"
                        // A share that came in while locked was waiting on exactly this;
                        // it used to wait for a sign-in through the login form only, and
                        // with the biometric lock on that never came, so it was dropped.
                        onAuthenticated()
                    } else {
                        locked = false
                        authed = false
                        mascotMessage = "Server reauthentication failed. Please sign in again."
                        mascotEmotion = "surprised"
                    }
                }
            },
            { msg ->
                authInProgress = false
                lockError = msg
                if (msg.isNotBlank()) { mascotMessage = msg; mascotEmotion = "surprised" }
            },
        )
    }

    // The lock re-arms when the app leaves the foreground (so returning to it needs an
    // unlock), and the prompt is (re)raised when it comes back — which also covers the
    // cold-start case, since registering an observer replays up to the current state.
    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_STOP -> if (
                    authed && !authInProgress && !closeInProgress && !systemPickerInProgress()
                ) {
                    locked = true
                    closeInProgress = true
                    scope.launch {
                        repo.closeSessionForReauth()
                        closeInProgress = false
                        if (!repo.prefs.biometricLock) {
                            // Signed out for leaving the screen, not by choice: the share
                            // key stays, since sharing is done from another app.
                            repo.leaveSession()
                            locked = false
                            authed = false
                        } else if (resumePending) {
                            resumePending = false
                            unlock()
                        }
                    }
                }
                Lifecycle.Event.ON_RESUME -> if (authed && locked && !authInProgress) {
                    if (closeInProgress) resumePending = true else unlock()
                }
                else -> {}
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    Box(Modifier.fillMaxSize()) {
        when {
            !authed -> LoginScreen(
                repo,
                onAuthed = { authed = true; locked = false; onAuthenticated() },
                onMascot = { message, emotion -> mascotMessage = message; mascotEmotion = emotion },
                biometric = biometric,
            )
            locked -> LockScreen(
                error = lockError,
                onUnlock = { unlock() },
                // The escape hatch, so a phone whose sensor won't cooperate is never a
                // dead end: sign out cleanly rather than the user having to clear app data.
                onSignOut = {
                    repo.clearSession()
                    authed = false
                    locked = false
                    lockError = null
                },
            )
            else -> AppShell(
                repo = repo,
                onLogout = { repo.clearSession(); authed = false },
            )
        }
        if (mascotMessage.isNotBlank()) {
            MascotPopup(mascotMessage, mascotEmotion, repo, Modifier.align(Alignment.TopEnd))
        }
    }

    // A force-stop cannot run ON_STOP cleanup. Retire a token left from the prior
    // process before allowing device credentials to create a fresh server session.
    LaunchedEffect(Unit) {
        if (closeInProgress) {
            repo.closeSessionForReauth()
            closeInProgress = false
            if (resumePending || locked) {
                resumePending = false
                unlock()
            }
        }
    }
}

// App feedback is presented like a compact incoming text instead of a character
// covering the content. Hiding Libby drops only the small sender avatar.
@Composable
private fun MascotPopup(message: String, emotion: String, repo: Repository, modifier: Modifier = Modifier) {
    val hideLibby = repo.prefs.hideLibby
    Row(
        modifier = modifier.padding(end = 10.dp, top = 64.dp),
        verticalAlignment = Alignment.Top,
        horizontalArrangement = Arrangement.End,
    ) {
        if (!hideLibby) {
            val meter by LibbyMeter.value.collectAsState()
            LibbyPortrait(
                repo = repo,
                emotion = emotion,
                tier = LibbyMeter.tier(meter),
                fallbackAsset = mascotAsset(emotion, LibbyMeter.tier(meter)),
                modifier = Modifier.size(40.dp).clip(CircleShape),
            )
        }
        Surface(
            shape = MaterialTheme.shapes.large,
            tonalElevation = 6.dp,
            shadowElevation = 8.dp,
            modifier = Modifier.widthIn(max = 280.dp).padding(start = if (hideLibby) 0.dp else 8.dp),
        ) {
            Text(message, modifier = Modifier.padding(14.dp), style = MaterialTheme.typography.bodyMedium)
        }
    }
}

@Composable
private fun LockScreen(error: String?, onUnlock: () -> Unit, onSignOut: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("OppaiLib is locked", style = MaterialTheme.typography.headlineSmall)
        if (!error.isNullOrBlank()) {
            Text(
                error,
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.padding(top = 12.dp),
            )
        }
        Button(onClick = onUnlock, modifier = Modifier.padding(top = 16.dp)) { Text("Unlock") }
        TextButton(onClick = onSignOut, modifier = Modifier.padding(top = 4.dp)) { Text("Sign out") }
    }
}
