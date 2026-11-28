package net.fourbakers.oppailib.ui

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Build
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Link
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.doubleOrNull
import net.fourbakers.oppailib.data.AccessKey
import net.fourbakers.oppailib.data.CollectionName
import net.fourbakers.oppailib.data.LaunchyPairing
import net.fourbakers.oppailib.data.Passkey
import net.fourbakers.oppailib.data.PasswordConfirm
import net.fourbakers.oppailib.data.Repository
import net.fourbakers.oppailib.data.serverMessage
import net.fourbakers.oppailib.ui.theme.Appearance
import java.text.DateFormat
import java.util.Date

private fun dateOf(ms: Long): String = if (ms <= 0) "never" else DateFormat.getDateInstance(DateFormat.MEDIUM).format(Date(if (ms < 10_000_000_000L) ms * 1000 else ms))

private fun copy(context: Context, label: String, text: String) {
    (context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager).setPrimaryClip(ClipData.newPlainText(label, text))
}

/** How this phone looks: the darkroom or the wallpaper's colours, and safe view. */
@Composable
internal fun AppearanceSection(repo: Repository) {
    SettingSwitch(
        "Material You",
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) "Take the app's colours from your wallpaper instead of the darkroom's ink and coral"
        else "Needs Android 12 or newer",
        Appearance.materialYou,
        enabled = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S,
    ) { Appearance.materialYou = it; repo.prefs.materialYou = it }
    SettingSwitch(
        "Safe view",
        "Blur anything the tagger rated questionable or explicit, and take Libby off the screen. Per phone.",
        Appearance.safe,
    ) { Appearance.safe = it; repo.prefs.safeView = it }
}

@Composable
private fun SettingSwitch(title: String, sub: String, on: Boolean, enabled: Boolean = true, onChange: (Boolean) -> Unit) {
    Row(Modifier.fillMaxWidth().clickable(enabled = enabled) { onChange(!on) }.padding(vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f).padding(end = 12.dp)) {
            Text(title, style = MaterialTheme.typography.bodyLarge)
            Text(sub, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Switch(checked = on, onCheckedChange = onChange, enabled = enabled)
    }
}

// ── the server's settings ────────────────────────────────────────────────────

private enum class Kind { TEXT, SECRET, BOOL, INT, NUMBER }

/** One server setting as the phone edits it. [set] is the flag a secret's state rides on. */
private data class Field(val key: String, val label: String, val kind: Kind = Kind.TEXT, val hint: String = "", val set: String = "")

private data class Group(val id: String, val label: String, val fields: List<Field>)

/**
 * The server's settings, grouped as the web's Settings groups them. Lists (her LoRAs, the
 * clip models) are edited on the web, where they can be picked from what is installed.
 */
private val GROUPS = listOf(
    Group("scraping", "Import & scraping", listOf(
        Field("scrapeDelayMs", "Delay between requests (ms)", Kind.INT),
        Field("scrapeUserAgent", "User agent"),
        Field("scrapeRespectRobots", "Respect robots.txt", Kind.BOOL),
        Field("f95Username", "F95zone username"),
        Field("f95Password", "F95zone password", Kind.SECRET, set = "f95PasswordSet"),
        Field("f95Cookie", "F95zone cookie", Kind.SECRET, set = "f95CookieSet"),
        Field("itchCookie", "itch.io cookie", Kind.SECRET, set = "itchCookieSet"),
        Field("itchNsfw", "Show adult games on itch.io", Kind.BOOL),
        Field("rule34UserId", "Rule34 user id"),
        Field("rule34ApiKey", "Rule34 API key", Kind.SECRET, set = "rule34ApiKeySet"),
    )),
    Group("ai", "Tagging & descriptions", listOf(
        Field("aiEnabled", "Tagging on", Kind.BOOL),
        Field("aiAutoTag", "Tag everything imported", Kind.BOOL),
        Field("aiMinScore", "Lowest confidence kept (0–1)", Kind.NUMBER),
        Field("aiMaxTags", "Most tags per item", Kind.INT),
        Field("visionEnabled", "Descriptions on", Kind.BOOL),
        Field("visionAuto", "Describe everything imported", Kind.BOOL),
        Field("visionUrl", "Vision model address"),
        Field("visionModel", "Vision model"),
        Field("visionApiKey", "Vision API key", Kind.SECRET, set = "visionApiKeySet"),
    )),
    Group("chat", "Her model & voice", listOf(
        Field("chatUrl", "Chat backend address", hint = "text-generation-webui, llama.cpp or any OpenAI-shaped server"),
        Field("chatModel", "Model"),
        Field("chatApiKey", "API key", Kind.SECRET, set = "chatApiKeySet"),
        Field("chatContextTokens", "Context length (tokens)", Kind.INT),
        Field("chatModelTier", "Model size tier", hint = "Blank reads it off the model's name"),
        Field("chatVision", "Pictures to her as pictures", hint = "auto, on or off"),
        Field("chatToolMode", "Tool calls", hint = "How her library tools are offered to the model"),
        Field("chatModelDir", "Models folder", hint = "Only needed to delete models"),
        Field("libbyStories", "Her stories", Kind.BOOL),
        Field("libbyStoriesPerDay", "Stories a day", Kind.INT),
        Field("ttsEngine", "Voice engine", hint = "piper, kokoro or openai"),
        Field("ttsVoice", "Voice"),
        Field("ttsSpeed", "Speed", Kind.NUMBER),
        Field("ttsUrl", "Speech server address"),
        Field("ttsModel", "Speech model"),
        Field("ttsApiKey", "Speech API key", Kind.SECRET, set = "ttsApiKeySet"),
    )),
    Group("imagegen", "Image generation", listOf(
        Field("imageGenEnabled", "Studio on", Kind.BOOL),
        Field("imageGenUrl", "Generator address", hint = "Automatic1111, Forge, InvokeAI or ComfyUI"),
        Field("imageGenModelsDir", "Models folder (A1111)"),
        Field("forgeModelsDir", "Models folder (Forge)"),
        Field("imageGenComfy", "Pictures through ComfyUI", Kind.BOOL),
        Field("civitaiApiUrl", "Civitai address"),
        Field("civitaiApiKey", "Civitai API key", Kind.SECRET, set = "civitaiKeySet"),
        Field("trainerUrl", "LoRA trainer address"),
        Field("trainerToken", "Trainer token", Kind.SECRET, set = "trainerTokenSet"),
        Field("libbyClipUrl", "ComfyUI address (clips)"),
        Field("clipKeepImageModel", "Keep the picture model loaded for clips", Kind.BOOL),
        Field("clipCutComfy", "Cut clips with ComfyUI-RMBG", Kind.BOOL),
        Field("clipCutModel", "Clip cut model"),
        Field("comfyDiffusionDir", "ComfyUI diffusion models folder"),
        Field("comfyCheckpointDir", "ComfyUI checkpoints folder"),
        Field("comfyLoraDir", "ComfyUI LoRAs folder"),
        Field("comfyVaeDir", "ComfyUI VAEs folder"),
        Field("gpuShare", "Sharing the card", hint = "How her model and the generators take turns"),
        Field("gpuMemoryGb", "Card memory (GB)", Kind.NUMBER),
        Field("libbyGenModel", "Her pictures' model"),
        Field("libbyGenPrompt", "Her pictures' prompt"),
        Field("libbyGenNegativePrompt", "Her pictures' negative"),
        Field("libbyGenBoard", "Her pictures' board"),
        Field("libbyGenToLibrary", "Keep her pictures in the library", Kind.BOOL),
        Field("libbyCameraCandidates", "Takes per photo she sends", Kind.INT),
    )),
    Group("storage", "Storage", listOf(
        Field("storageWarnPercent", "Warn when the disk is this full (%)", Kind.INT),
        Field("uploadStaleHours", "Drop unfinished uploads after (hours)", Kind.INT),
        Field("tempStaleHours", "Drop scratch files after (hours)", Kind.INT),
    )),
    Group("privacy", "Privacy", listOf(
        Field("incognito", "Incognito", Kind.BOOL, hint = "Signed out, this server shows a file-sharing login and answers like one"),
    )),
)

private fun JsonElement?.text(): String = (this as? JsonPrimitive)?.contentOrNull ?: ""

/**
 * The server's settings, for an admin: read, edited field by field, and saved as just the
 * fields that changed — the server decodes a save onto what it has, so nothing the phone
 * does not show is touched. Secrets are write-only: blank keeps the one stored.
 */
@Composable
internal fun ServerSettingsSection(repo: Repository) {
    var current by remember { mutableStateOf<JsonObject?>(null) }
    var error by remember { mutableStateOf("") }
    var group by remember { mutableStateOf(GROUPS.first().id) }
    var saving by remember { mutableStateOf(false) }
    val edits = remember { mutableStateMapOf<String, JsonPrimitive>() }
    val scope = rememberCoroutineScope()
    LaunchedEffect(Unit) {
        runCatching { repo.web.serverSettings() }.onSuccess { current = it }.onFailure { error = it.serverMessage("Couldn't read the server's settings.") }
    }
    val cur = current
    if (cur == null) {
        if (error.isNotEmpty()) Text(error, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
        else CircularProgressIndicator(Modifier.size(22.dp), strokeWidth = 2.dp)
        return
    }
    InkChipRow(padding = PaddingValues(0.dp)) {
        GROUPS.forEach { g -> InkChip(g.label, group == g.id, { group = g.id }, small = true) }
    }
    val g = GROUPS.first { it.id == group }
    Column(Modifier.fillMaxWidth().padding(top = 8.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        g.fields.filter { cur.containsKey(it.key) || it.kind == Kind.SECRET }.forEach { f ->
            val shown = edits[f.key] ?: (cur[f.key] as? JsonPrimitive)
            when (f.kind) {
                Kind.BOOL -> SettingSwitch(f.label, f.hint, shown?.booleanOrNull == true) { edits[f.key] = JsonPrimitive(it) }
                Kind.SECRET -> {
                    val isSet = (cur[f.set] as? JsonPrimitive)?.booleanOrNull == true
                    OutlinedTextField(
                        value = (edits[f.key]?.contentOrNull).orEmpty(),
                        onValueChange = { edits[f.key] = JsonPrimitive(it) },
                        label = { Text(f.label) },
                        placeholder = { Text(if (isSet) "Set — leave blank to keep it" else "Not set") },
                        singleLine = true,
                        visualTransformation = PasswordVisualTransformation(),
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
                Kind.INT, Kind.NUMBER -> OutlinedTextField(
                    value = shown.text(),
                    onValueChange = { v ->
                        val parsed = if (f.kind == Kind.INT) v.toLongOrNull()?.let(::JsonPrimitive) else v.toDoubleOrNull()?.let(::JsonPrimitive)
                        edits[f.key] = parsed ?: JsonPrimitive(v)
                    },
                    label = { Text(f.label) },
                    supportingText = if (f.hint.isNotEmpty()) ({ Text(f.hint) }) else null,
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = if (f.kind == Kind.INT) KeyboardType.Number else KeyboardType.Decimal),
                    modifier = Modifier.fillMaxWidth(),
                )
                Kind.TEXT -> OutlinedTextField(
                    value = shown.text(),
                    onValueChange = { edits[f.key] = JsonPrimitive(it) },
                    label = { Text(f.label) },
                    supportingText = if (f.hint.isNotEmpty()) ({ Text(f.hint) }) else null,
                    singleLine = !f.key.contains("Prompt"),
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }
        // A blank secret is "leave it" — it is not sent at all.
        val pending = edits.filter { (k, v) ->
            val f = GROUPS.flatMap { it.fields }.firstOrNull { it.key == k }
            !(f?.kind == Kind.SECRET && v.contentOrNull.isNullOrEmpty()) && v != cur[k]
        }
        val badNumber = pending.entries.any { (k, v) ->
            val f = GROUPS.flatMap { it.fields }.firstOrNull { it.key == k }
            (f?.kind == Kind.INT || f?.kind == Kind.NUMBER) && v.isString
        }
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 6.dp)) {
            PrimaryButton(
                if (saving) "Saving…" else if (pending.isEmpty()) "Saved" else "Save ${pending.size} ${if (pending.size == 1) "change" else "changes"}",
                onClick = {
                    saving = true
                    scope.launch {
                        runCatching { repo.web.saveServerSettings(JsonObject(pending)) }
                            .onSuccess { current = it; edits.clear(); repo.report("Saved the server's settings.", "happy") }
                            .onFailure { repo.report(it.serverMessage("The server didn't save that.")) }
                        saving = false
                    }
                },
                enabled = pending.isNotEmpty() && !saving && !badNumber,
            )
            if (edits.isNotEmpty()) TextButton(onClick = { edits.clear() }) { Text("Undo") }
        }
        if (badNumber) Text("A number field holds something that isn't a number.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
        Text("Her LoRAs, her camera's LoRAs and the clip models are picked on the web, from what is installed.",
            style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

// ── keys handed out ──────────────────────────────────────────────────────────

@Composable
private fun KeyRow(k: AccessKey, onRevoke: () -> Unit) {
    Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(k.name.ifBlank { "Key ${k.id}" }, style = MaterialTheme.typography.bodyMedium)
            Text("…${k.hint} · made ${dateOf(k.createdAt)} · used ${dateOf(k.lastUsedAt)}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        TextButton(onClick = onRevoke) { Text("Revoke", color = MaterialTheme.colorScheme.error) }
    }
}

/**
 * The phones that can take a share without being opened: each holds a key that adds to
 * the library and reads nothing of it (the server's share_keys.go). A lost phone is
 * revoked here; this one fetches a new key the next time it is signed in.
 */
@Composable
internal fun ShareKeysSection(repo: Repository) {
    var keys by remember { mutableStateOf<List<AccessKey>?>(null) }
    val scope = rememberCoroutineScope()
    LaunchedEffect(Unit) { keys = runCatching { repo.web.shareKeys().items }.getOrNull() }
    Text(
        if (repo.prefs.shareKey != null) "This phone takes shares from any app straight into the upload queue, even while OppaiLib is locked. Its key can add to the library and can't read anything in it."
        else "This phone opens OppaiLib to take a share. Sign in again to give it a share key, so a share goes straight to the queue.",
        style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
    keys?.forEach { k ->
        KeyRow(k) {
            scope.launch {
                runCatching { repo.web.revokeShareKey(k.id) }.onSuccess { keys = keys?.filterNot { it.id == k.id } }
            }
        }
    }
}

/** Keys for MCP clients: each opens the library's read-only tools at /api/mcp. */
@Composable
internal fun McpSection(repo: Repository) {
    var keys by remember { mutableStateOf<List<AccessKey>?>(null) }
    var tools by remember { mutableStateOf<List<String>>(emptyList()) }
    var naming by remember { mutableStateOf(false) }
    var made by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    LaunchedEffect(Unit) { runCatching { repo.web.mcpKeys() }.onSuccess { keys = it.items; tools = it.tools } }
    Text("A Model Context Protocol client with a key can search, open and suggest from the library through ${repo.serverUrl("api/mcp")} — read-only, and yours alone.",
        style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    if (tools.isNotEmpty()) Text("Tools: ${tools.joinToString(", ")}", style = MaterialTheme.typography.labelSmall.copy(fontFamily = FontFamily.Monospace),
        color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 4.dp))
    keys?.forEach { k -> KeyRow(k) { scope.launch { runCatching { repo.web.revokeMcpKey(k.id) }.onSuccess { keys = keys?.filterNot { it.id == k.id } } } } }
    ToolButton(Icons.Filled.Add, "New key", { naming = true }, label = "New key", modifier = Modifier.padding(top = 6.dp))
    if (naming) NameDialog("A key for an MCP client", "", "Make it", onDismiss = { naming = false }) { name ->
        naming = false
        scope.launch {
            runCatching { repo.web.createMcpKey(CollectionName(name)) }
                .onSuccess { r -> made = r.key; keys = runCatching { repo.web.mcpKeys().items }.getOrDefault(keys.orEmpty()) }
                .onFailure { repo.report(it.serverMessage("Couldn't make a key.")) }
        }
    }
    if (made.isNotEmpty()) AlertDialog(
        onDismissRequest = { made = "" },
        title = { Text("Your new key") },
        text = { Column {
            Text("It is shown this once. Copy it into the client now.", style = MaterialTheme.typography.bodySmall)
            Spacer(Modifier.size(8.dp))
            Text(made, style = MaterialTheme.typography.bodyMedium.copy(fontFamily = FontFamily.Monospace))
        } },
        confirmButton = { TextButton(onClick = { copy(context, "MCP key", made); repo.report("Copied the key.", "happy"); made = "" }) { Text("Copy and close") } },
    )
}

/** The desktop launcher: a pairing code to link a PC, and the keys of the PCs linked. */
@Composable
internal fun LaunchySection(repo: Repository) {
    var keys by remember { mutableStateOf<List<AccessKey>?>(null) }
    var pairing by remember { mutableStateOf<LaunchyPairing?>(null) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    LaunchedEffect(Unit) { keys = runCatching { repo.web.launchyKeys().items }.getOrNull() }
    LaunchedEffect(pairing) {
        val p = pairing ?: return@LaunchedEffect
        val left = p.expiresAt * (if (p.expiresAt < 10_000_000_000L) 1000 else 1) - System.currentTimeMillis()
        if (left > 0) delay(left)
        pairing = null
        keys = runCatching { repo.web.launchyKeys().items }.getOrNull() ?: keys
    }
    Text("Launchy runs games on your PC. Enter the code in it to link that PC to this account.",
        style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    val p = pairing
    if (p != null) Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 6.dp)) {
        Text(p.code, style = MaterialTheme.typography.headlineSmall.copy(fontFamily = FontFamily.Monospace), modifier = Modifier.weight(1f))
        IconButton(onClick = { copy(context, "Launchy code", p.code) }) { Icon(Icons.Filled.ContentCopy, contentDescription = "Copy the code") }
    } else ToolButton(Icons.Filled.Link, "Link a PC", {
        scope.launch { runCatching { repo.web.launchyPairing() }.onSuccess { pairing = it }.onFailure { repo.report(it.serverMessage("Couldn't make a code.")) } }
    }, label = "Link a PC", modifier = Modifier.padding(vertical = 6.dp))
    keys?.forEach { k -> KeyRow(k) { scope.launch { runCatching { repo.web.revokeLaunchyKey(k.id) }.onSuccess { keys = keys?.filterNot { it.id == k.id } } } } }
}

/**
 * Passkeys: the ones on this account, named and revoked here. Making one is the web's —
 * the browser's WebAuthn ceremony — so the phone lists them and takes them away.
 */
@Composable
internal fun PasskeysSection(repo: Repository) {
    var keys by remember { mutableStateOf<List<Passkey>?>(null) }
    var renaming by remember { mutableStateOf<Passkey?>(null) }
    var revoking by remember { mutableStateOf<Passkey?>(null) }
    var password by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()
    LaunchedEffect(Unit) { keys = runCatching { repo.web.passkeys().passkeys }.getOrNull() }
    val list = keys ?: return
    if (list.isEmpty()) Text("No passkeys on this account. Add one from the web's Settings → Account.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    list.forEach { k ->
        Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(k.name.ifBlank { "Passkey ${k.id}" }, style = MaterialTheme.typography.bodyMedium)
                Text("${if (k.synced) "Synced to an account" else "On one device"} · used ${dateOf(k.lastUsedAt)}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            IconButton(onClick = { renaming = k }) { Icon(Icons.Filled.Edit, contentDescription = "Rename") }
            IconButton(onClick = { password = ""; revoking = k }) { Icon(Icons.Filled.Delete, contentDescription = "Revoke", tint = MaterialTheme.colorScheme.error) }
        }
    }
    renaming?.let { k ->
        NameDialog("Rename passkey", k.name, "Rename", onDismiss = { renaming = null }) { name ->
            renaming = null
            scope.launch { runCatching { repo.web.renamePasskey(k.id, CollectionName(name)) }.onSuccess { keys = keys?.map { if (it.id == k.id) it.copy(name = name) else it } } }
        }
    }
    revoking?.let { k ->
        AlertDialog(
            onDismissRequest = { revoking = null },
            title = { Text("Revoke “${k.name.ifBlank { "this passkey" }}”?") },
            text = { OutlinedTextField(password, { password = it }, label = { Text("Your password") }, singleLine = true, visualTransformation = PasswordVisualTransformation()) },
            confirmButton = { TextButton(enabled = password.isNotEmpty(), onClick = {
                revoking = null
                scope.launch {
                    runCatching { repo.web.revokePasskey(k.id, PasswordConfirm(password)) }
                        .onSuccess { keys = keys?.filterNot { it.id == k.id } }
                        .onFailure { repo.report(it.serverMessage("Couldn't revoke it.")) }
                }
            }) { Text("Revoke", color = MaterialTheme.colorScheme.error) } },
            dismissButton = { TextButton(onClick = { revoking = null }) { Text("Cancel") } },
        )
    }
    Spacer(Modifier.width(0.dp))
}
