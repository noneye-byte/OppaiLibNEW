package net.fourbakers.oppailib.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Fingerprint
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import net.fourbakers.oppailib.R
import net.fourbakers.oppailib.data.LibbyVoice
import net.fourbakers.oppailib.data.LoginRequest
import net.fourbakers.oppailib.data.Repository

/**
 * Sign-in. Beyond username/password, this device can **save the login behind a
 * fingerprint**: tick "Save login & use fingerprint" and the credentials are kept in
 * the app's AES-256 encrypted store and the biometric lock is armed, so next time a
 * fingerprint alone signs you in (the prompt unlocks the saved credentials and
 * re-authenticates). Works even after the session is cleared or expires.
 *
 * [biometric] is the activity's shared BiometricPrompt runner.
 */
@Composable
fun LoginScreen(
    repo: Repository,
    onAuthed: () -> Unit,
    onMascot: (message: String, emotion: String) -> Unit,
    biometric: (onSuccess: () -> Unit, onError: (String) -> Unit) -> Unit,
) {
    var server by remember { mutableStateOf(repo.prefs.serverUrl ?: "http://10.0.2.2:8080") }
    var username by remember { mutableStateOf(repo.prefs.reauthUsername ?: "admin") }
    var password by remember { mutableStateOf("") }
    var remember_ by remember { mutableStateOf(repo.prefs.hasReauthCredential) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val hasSaved = repo.prefs.hasReauthCredential

    // Signs in with the given credentials. When "save login" is on, the credentials
    // are stored for fingerprint sign-in and the biometric lock is armed; turning it
    // off disarms the lock so the saved login is no longer used.
    fun doLogin(user: String, pass: String, save: Boolean) {
        error = null
        busy = true
        repo.setServer(server)
        scope.launch {
            try {
                val res = repo.api.login(LoginRequest(user, pass))
                repo.saveSession(res.token)
                if (save) {
                    repo.saveReauthCredential(user, pass)
                    repo.prefs.biometricLock = true
                } else {
                    repo.prefs.biometricLock = false
                }
                LibbyVoice.react(LibbyVoice.Event.LOGIN).let {
                    onMascot("${it.message.trimEnd('.')}, ${res.user.username}.", it.emotion)
                }
                onAuthed()
            } catch (e: Exception) {
                val message = e.message ?: "Login failed"
                error = message
                if (message.contains("401")) {
                    LibbyVoice.react(LibbyVoice.Event.LOGIN_FAIL).let { onMascot(it.message, it.emotion) }
                } else {
                    onMascot(message, "surprised")
                }
            } finally {
                busy = false
            }
        }
    }

    // Prompts for a fingerprint, then re-authenticates with the saved credentials.
    fun fingerprintSignIn() {
        if (!repo.prefs.hasReauthCredential) return
        repo.setServer(server)
        biometric(
            {
                busy = true
                scope.launch {
                    if (repo.reauthenticate()) {
                        LibbyVoice.react(LibbyVoice.Event.LOGIN).let { onMascot(it.message, it.emotion) }
                        onAuthed()
                    } else {
                        error = "Couldn't sign in with the saved login. Enter your password."
                    }
                    busy = false
                }
            },
            { msg -> if (msg.isNotBlank()) error = msg },
        )
    }

    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        // The mark takes its colour from the theme rather than carrying its own, so it
        // follows the wallpaper on Material You and reads correctly in light and dark
        // alike — a fixed orange logo is a stain on one of them.
        Image(
            painter = painterResource(R.drawable.ic_logo),
            contentDescription = null,
            colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.primary),
            modifier = Modifier.size(88.dp),
        )
        Text(
            "OppaiLib",
            style = MaterialTheme.typography.displaySmall,
            color = MaterialTheme.colorScheme.primary,
        )
        Text(
            "Sign in to your server",
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.padding(bottom = 24.dp),
        )

        OutlinedTextField(
            value = server, onValueChange = { server = it },
            label = { Text("Server URL") }, singleLine = true,
            modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
        )
        OutlinedTextField(
            value = username, onValueChange = { username = it },
            label = { Text("Username") }, singleLine = true,
            modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
        )
        OutlinedTextField(
            value = password, onValueChange = { password = it },
            label = { Text("Password") }, singleLine = true,
            visualTransformation = PasswordVisualTransformation(),
            modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
        )

        Row(
            Modifier.fillMaxWidth().padding(top = 4.dp).clickable { remember_ = !remember_ },
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Checkbox(checked = remember_, onCheckedChange = { remember_ = it })
            Text("Save login & use fingerprint", style = MaterialTheme.typography.bodyMedium)
        }

        error?.let {
            Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 8.dp))
        }

        Button(
            onClick = { doLogin(username.trim(), password, remember_) },
            enabled = !busy,
            modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
        ) {
            if (busy) {
                CircularProgressIndicator(
                    strokeWidth = 2.dp,
                    modifier = Modifier.size(18.dp).padding(end = 0.dp),
                )
            }
            Text("Sign in", modifier = Modifier.padding(start = if (busy) 8.dp else 0.dp))
        }

        // Only offered once a login has been saved on this device.
        if (hasSaved) {
            OutlinedButton(
                onClick = { fingerprintSignIn() },
                enabled = !busy,
                modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
            ) {
                Icon(Icons.Filled.Fingerprint, contentDescription = null, Modifier.size(18.dp))
                Text("Sign in with fingerprint", modifier = Modifier.padding(start = 8.dp))
            }
        }
    }
}
