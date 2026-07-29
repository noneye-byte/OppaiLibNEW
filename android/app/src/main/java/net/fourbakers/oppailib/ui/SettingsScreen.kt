package net.fourbakers.oppailib.ui

import android.content.Context
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import net.fourbakers.oppailib.data.ApkInfo
import net.fourbakers.oppailib.data.Diagnostics
import net.fourbakers.oppailib.data.PasswordRequest
import net.fourbakers.oppailib.data.Prefs
import net.fourbakers.oppailib.data.Repository
import net.fourbakers.oppailib.data.LibbyMeter
import net.fourbakers.oppailib.data.Stats
import net.fourbakers.oppailib.data.StorageCleanupRequest
import net.fourbakers.oppailib.data.StorageReport
import net.fourbakers.oppailib.data.VideoFit
import net.fourbakers.oppailib.util.AppUpdate

/**
 * Device-local settings. Everything here is a preference about how *this* phone
 * plays and reads — none of it is server state, so nothing needs saving remotely;
 * each control writes through to [Prefs] as it's touched.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(repo: Repository, onBack: () -> Unit, onLogout: () -> Unit) {
    val prefs = repo.prefs

    var fit by remember { mutableStateOf(prefs.videoFit) }
    var autoplay by remember { mutableStateOf(prefs.videoAutoplay) }
    var loop by remember { mutableStateOf(prefs.videoLoop) }
    var muted by remember { mutableStateOf(prefs.videoMuted) }
    var speed by remember { mutableFloatStateOf(prefs.videoSpeed) }
    var buffer by remember { mutableIntStateOf(prefs.bufferSeconds) }
    var backBuffer by remember { mutableStateOf(prefs.keepBackBuffer) }
    var rtl by remember { mutableStateOf(prefs.comicRtl) }
    var hideLibby by remember { mutableStateOf(prefs.hideLibby) }
    var libbyProgression by remember { mutableFloatStateOf(prefs.libbyProgressionMultiplier) }
    var biometric by remember { mutableStateOf(prefs.biometricLock) }
    var server by remember { mutableStateOf(prefs.serverUrl ?: "") }

    var stats by remember { mutableStateOf<Stats?>(null) }
    var isAdmin by remember { mutableStateOf(false) }
    var changingPassword by remember { mutableStateOf(false) }
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        stats = runCatching { repo.api.stats() }.getOrNull()
        isAdmin = runCatching { repo.api.me().isAdmin }.getOrDefault(false)
    }

    // Android back returns to the library, matching the top bar's arrow.
    BackHandler { onBack() }

    if (changingPassword) {
        ChangePasswordDialog(repo = repo, onDismiss = { changingPassword = false })
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
    ) { padding ->
        Column(
            Modifier.padding(padding).fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        ) {
            SectionHeader("Video")

            Text("How the frame fills the screen", style = MaterialTheme.typography.bodyMedium)
            Row(
                Modifier.fillMaxWidth().padding(top = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                VideoFit.entries.forEach { option ->
                    FilterChip(
                        selected = fit == option,
                        onClick = { fit = option; prefs.videoFit = option },
                        label = { Text(option.label) },
                    )
                }
            }
            Text(
                fit.description,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 6.dp),
            )

            SwitchRow("Play on open", "Start playing as soon as a video is on screen", autoplay) {
                autoplay = it; prefs.videoAutoplay = it
            }
            SwitchRow("Loop", "Repeat instead of stopping at the end", loop) {
                loop = it; prefs.videoLoop = it
            }
            SwitchRow("Start muted", "Open videos with the sound off", muted) {
                muted = it; prefs.videoMuted = it
            }

            StepperRow(
                title = "Default speed",
                value = formatSpeedLabel(speed),
                onLess = { speed = stepSpeed(speed, -1); prefs.videoSpeed = speed },
                onMore = { speed = stepSpeed(speed, +1); prefs.videoSpeed = speed },
            )

            SectionHeader("Buffering")

            Text("Read ahead: ${buffer}s", style = MaterialTheme.typography.bodyMedium)
            Text(
                "How much video is fetched in front of the playhead. More rides out a bad " +
                    "connection; it also costs memory and pulls data for clips you may swipe past.",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Slider(
                value = buffer.toFloat(),
                onValueChange = { buffer = it.toInt() },
                onValueChangeFinished = { prefs.bufferSeconds = buffer },
                valueRange = Prefs.MIN_BUFFER_SECONDS.toFloat()..Prefs.MAX_BUFFER_SECONDS.toFloat(),
                modifier = Modifier.padding(top = 4.dp),
            )
            SwitchRow(
                "Keep what's been played",
                "Seeking backwards replays from memory instead of refetching",
                backBuffer,
            ) { backBuffer = it; prefs.keepBackBuffer = it }
            Text(
                "Buffers are held only while a video is open. Closing it — or swiping to the " +
                    "next item — releases the player and drops everything it had buffered.",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 8.dp),
            )

            SectionHeader("Comics")
            SwitchRow(
                "Right-to-left",
                "Manga order: page one on the right, and you swipe right-to-left to advance",
                rtl,
            ) { rtl = it; prefs.comicRtl = it }

            SectionHeader("Libby")
            SwitchRow(
                "Hide Libby",
                "Take the mascot out of error popups and Chat. Messages still show; only the artwork goes.",
                hideLibby,
            ) { hideLibby = it; prefs.hideLibby = it }
            Text("Mood progression speed", style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = 12.dp))
            Text(
                "Normal activity accumulates at this rate; each chat keeps its own progression.",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(top = 6.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                LibbyMeter.MULTIPLIERS.forEach { option ->
                    FilterChip(
                        selected = libbyProgression == option,
                        onClick = { libbyProgression = option; prefs.libbyProgressionMultiplier = option; LibbyMeter.setMultiplier(option) },
                        label = { Text("${option}×") },
                    )
                }
            }
            LibbyOutfitsSection(repo)

            SectionHeader("Library")
            StatsBlock(stats)

            SectionHeader("Account")
            SwitchRow("Require unlock", "End the server session when closed; use fingerprint or device PIN to reauthenticate", biometric) {
                biometric = it; prefs.biometricLock = it
            }
            OutlinedTextField(
                value = server,
                onValueChange = { server = it },
                label = { Text("Server") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
            )
            Button(
                onClick = { repo.setServer(server) },
                enabled = server.isNotBlank() && server != prefs.serverUrl,
                modifier = Modifier.padding(top = 8.dp),
            ) { Text("Save server") }
            TextButton(
                onClick = { changingPassword = true },
                modifier = Modifier.padding(top = 4.dp),
            ) { Text("Change password") }

            SectionHeader("App")
            UpdateBlock(repo = repo, context = context, scope = scope)

            SectionHeader("Storage")
            StorageBlock(repo, isAdmin)

            if (isAdmin) {
                SectionHeader("Diagnostics")
                DiagnosticsBlock(repo)
            }

            Button(
                onClick = onLogout,
                modifier = Modifier.fillMaxWidth().padding(top = 24.dp),
            ) { Text("Sign out") }
        }
    }
}

/** Server mappings, capacity, pending needs, and safe reclaim controls. */
@Composable
private fun StorageBlock(repo: Repository, isAdmin: Boolean) {
    var storage by remember { mutableStateOf<StorageReport?>(null) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var message by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun refresh() {
        if (busy) return
        busy = true
        error = null
        scope.launch {
            runCatching { repo.api.storage() }
                .onSuccess { storage = it }
                .onFailure { error = it.message ?: "Couldn't read server storage." }
            busy = false
        }
    }

    LaunchedEffect(Unit) { refresh() }

    Text(
        "Where the server keeps data and how much room is left. Warnings name the mapping to expand.",
        style = MaterialTheme.typography.labelSmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
    Row(
        Modifier.fillMaxWidth().padding(top = 10.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Button(onClick = { refresh() }, enabled = !busy) {
            Text(if (busy) "Reading…" else "Refresh")
        }
        if (isAdmin) {
            TextButton(
                enabled = !busy,
                onClick = {
                    if (busy) return@TextButton
                    busy = true
                    error = null
                    message = null
                    scope.launch {
                        runCatching {
                            repo.api.cleanupStorage(StorageCleanupRequest(listOf("uploads", "temp")))
                        }.onSuccess {
                            storage = it.storage
                            message = "Reclaimed ${it.freedHuman}."
                        }.onFailure { error = it.message ?: "Couldn't reclaim storage." }
                        busy = false
                    }
                },
            ) { Text("Reclaim space") }
        }
    }
    Text(
        "Reclaiming removes only abandoned upload chunks and old scratch files; it never touches media, chat, memories, or models.",
        style = MaterialTheme.typography.labelSmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )

    message?.let {
        Text(it, color = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(top = 8.dp))
    }
    error?.let {
        Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 8.dp))
    }
    storage?.let { report ->
        report.warnings.forEach { warning ->
            Text(
                warning,
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.padding(top = 10.dp),
            )
        }
        if (report.pendingBytes > 0) {
            Text(
                "Uploads in progress still need about ${formatBytes(report.pendingBytes)}.",
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.padding(top = 10.dp),
            )
        }
        report.mappings.forEach { mapping ->
            Column(Modifier.fillMaxWidth().padding(top = 16.dp)) {
                Text(mapping.label, style = MaterialTheme.typography.titleSmall)
                Text(
                    mapping.path,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                if (mapping.totalBytes > 0) {
                    val used = (mapping.usedBytes.toDouble() / mapping.totalBytes)
                        .coerceIn(0.0, 1.0).toFloat()
                    LinearProgressIndicator(
                        progress = { used },
                        modifier = Modifier.fillMaxWidth().padding(top = 6.dp),
                    )
                }
                Text(
                    when {
                        !mapping.error.isNullOrBlank() -> mapping.error
                        !mapping.exists -> "Not mapped"
                        !mapping.writable -> "Read-only"
                        else -> "${formatBytes(mapping.freeBytes)} free of ${formatBytes(mapping.totalBytes)}"
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = if (!mapping.exists || !mapping.writable || !mapping.error.isNullOrBlank()) {
                        MaterialTheme.colorScheme.error
                    } else MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 4.dp),
                )
                mapping.contents.forEach { item ->
                    Text(
                        "${item.label}: ${formatBytes(item.bytes)}" +
                            if (item.count > 0) " (${item.count})" else "",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Text(
                    "${mapping.purpose} Set with ${mapping.env}.",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 3.dp),
                )
            }
        }
        Text(
            "Reclaimable now",
            style = MaterialTheme.typography.titleSmall,
            modifier = Modifier.padding(top = 18.dp, bottom = 4.dp),
        )
        report.reclaimable.forEach { item ->
            Text(
                "${item.label}: ${formatBytes(item.bytes)}" +
                    item.note?.let { " — $it" }.orEmpty(),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 4.dp),
            )
        }
    }
}

/**
 * The same admin-only server snapshot available in the web settings. It is read only
 * on demand and never polls: adding traffic while diagnosing traffic muddies the data.
 */
@Composable
private fun DiagnosticsBlock(repo: Repository) {
    var diagnostics by remember { mutableStateOf<Diagnostics?>(null) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun refresh() {
        if (busy) return
        busy = true
        error = null
        scope.launch {
            runCatching { repo.api.diagnostics() }
                .onSuccess { diagnostics = it }
                .onFailure { error = it.message ?: "Couldn't read server diagnostics." }
            busy = false
        }
    }

    LaunchedEffect(Unit) { refresh() }

    Text(
        "Counters and latencies since the server started or was last reset. Nothing is sent off this server.",
        style = MaterialTheme.typography.labelSmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
    Row(
        Modifier.fillMaxWidth().padding(top = 10.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Button(onClick = { refresh() }, enabled = !busy) {
            Text(if (busy) "Reading…" else "Refresh")
        }
        TextButton(
            onClick = {
                if (busy) return@TextButton
                busy = true
                error = null
                scope.launch {
                    runCatching {
                        repo.api.resetDiagnostics()
                        repo.api.diagnostics()
                    }.onSuccess { diagnostics = it }
                        .onFailure { error = it.message ?: "Couldn't reset diagnostics." }
                    busy = false
                }
            },
            enabled = !busy && diagnostics != null,
        ) { Text("Reset counters") }
    }
    Text(
        "Reset, reproduce the slow action, then refresh to isolate it.",
        style = MaterialTheme.typography.labelSmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )

    error?.let {
        Text(
            it,
            color = MaterialTheme.colorScheme.error,
            style = MaterialTheme.typography.bodySmall,
            modifier = Modifier.padding(top = 8.dp),
        )
    }

    diagnostics?.let { d ->
        if (!d.dbWal) {
            Text(
                "Database WAL is unavailable. Queries are serialized and may block one another.",
                color = MaterialTheme.colorScheme.onErrorContainer,
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
            )
        }

        DiagnosticValue("Window", formatDuration(d.metrics.windowSeconds))
        DiagnosticValue("Server uptime", formatDuration(d.uptimeSeconds))
        DiagnosticValue("Requests", (d.metrics.counters["http.requests"] ?: 0).toString())
        DiagnosticValue("Server errors", (d.metrics.counters["http.status.5xx"] ?: 0).toString())
        DiagnosticValue("Memory", "${formatDecimal(d.heapMB)} MB heap · ${formatDecimal(d.sysMB)} MB total")
        DiagnosticValue("Runtime", "${d.goroutines} goroutines · ${d.numCpu} CPUs")
        DiagnosticValue(
            "Database",
            if (d.dbWal) "WAL · ${d.dbInUse}/${d.dbOpenConns} connections in use"
            else "serialized (no WAL)",
        )
        if (d.dbWaitCount > 0) {
            DiagnosticValue("Database waits", "${d.dbWaitCount} · ${d.dbWaitMs} ms total")
        }

        val fetchRows = listOf(
            "Fetches completed" to "scrape.fetch.ok",
            "Retried" to "scrape.fetch.retry",
            "Gave up" to "scrape.fetch.exhausted",
            "Queued behind another request" to "scrape.host_queued",
            "Asked to back off" to "scrape.fetch.backoff_too_long",
        ).map { (label, key) -> label to (d.metrics.counters[key] ?: 0) }
            .filter { it.second > 0 }
        if (fetchRows.isNotEmpty()) {
            Text(
                "Outbound fetches",
                style = MaterialTheme.typography.titleSmall,
                modifier = Modifier.padding(top = 18.dp, bottom = 4.dp),
            )
            fetchRows.forEach { (label, count) -> DiagnosticValue(label, count.toString()) }
        }

        Text(
            "Slowest by total time",
            style = MaterialTheme.typography.titleSmall,
            modifier = Modifier.padding(top = 18.dp, bottom = 4.dp),
        )
        if (d.metrics.timings.isEmpty()) {
            Text(
                "Nothing measured in this window yet.",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        } else {
            Column(Modifier.fillMaxWidth()) {
                Text(
                    "Calls · average · p95 · worst",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(vertical = 6.dp),
                )
                d.metrics.timings.take(25).forEach { timing ->
                    Column(Modifier.fillMaxWidth().padding(vertical = 5.dp)) {
                        Text(timing.name, style = MaterialTheme.typography.bodySmall)
                        Text(
                            "${timing.count} · ${formatDecimal(timing.avgMs)} ms · " +
                                "${formatDecimal(timing.p95Ms)} ms · ${formatDecimal(timing.maxMs)} ms",
                            style = MaterialTheme.typography.labelSmall,
                            color = if (timing.maxMs >= 3000) MaterialTheme.colorScheme.error
                            else MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun DiagnosticValue(label: String, value: String) {
    Row(Modifier.fillMaxWidth().padding(top = 7.dp), verticalAlignment = Alignment.Top) {
        Text(label, style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
        Text(
            value,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

private fun formatDecimal(value: Double): String =
    if (value % 1.0 == 0.0) value.toLong().toString() else "%.2f".format(value)

private fun formatDuration(seconds: Double): String {
    val total = seconds.coerceAtLeast(0.0).toLong()
    val days = total / 86_400
    val hours = total % 86_400 / 3_600
    val minutes = total % 3_600 / 60
    val secs = total % 60
    return when {
        days > 0 -> "${days}d ${hours}h"
        hours > 0 -> "${hours}h ${minutes}m"
        minutes > 0 -> "${minutes}m ${secs}s"
        else -> "${secs}s"
    }
}

/** What the server is holding, and how much of it. Silent until /api/stats answers. */
@Composable
private fun StatsBlock(stats: Stats?) {
    if (stats == null) {
        Text(
            "Counting…",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        return
    }
    Text(
        "${stats.items} items · ${formatBytes(stats.bytes)} · ${stats.tags} tags",
        style = MaterialTheme.typography.bodyLarge,
    )
    stats.kinds.filter { it.count > 0 }.forEach { k ->
        Row(Modifier.fillMaxWidth().padding(top = 6.dp)) {
            Text(k.kind, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
            Text(
                "${k.count} · ${formatBytes(k.bytes)}",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

/**
 * Installing the build the server is handing out.
 *
 * The comparison is by hash, not version (see [AppUpdate]) — so this can only ever say
 * "the server has a different build", which is the honest claim. An operator who drops
 * an older APK into /config is offering a downgrade, and the app will say so rather
 * than pretend it can't see it.
 */
@Composable
private fun UpdateBlock(repo: Repository, context: Context, scope: CoroutineScope) {
    var info by remember { mutableStateOf<ApkInfo?>(null) }
    var installed by remember { mutableStateOf("") }
    var checking by remember { mutableStateOf(true) }
    var progress by remember { mutableFloatStateOf(-1f) } // < 0 means "not downloading"
    var error by remember { mutableStateOf<String?>(null) }

    val version = remember {
        runCatching {
            context.packageManager.getPackageInfo(context.packageName, 0).versionName
        }.getOrNull().orEmpty()
    }

    suspend fun check() {
        checking = true
        installed = AppUpdate.installedDigest(context)
        info = runCatching { repo.api.apkInfo() }.getOrNull()
        checking = false
    }

    LaunchedEffect(Unit) { check() }

    Text("Version $version", style = MaterialTheme.typography.bodyLarge)

    val current = info
    // Non-null exactly when there's something worth installing.
    val offered = current?.takeIf { AppUpdate.isNewer(it, installed) }

    Text(
        when {
            checking -> "Checking the server for a newer build…"
            current == null -> "Couldn't ask the server what build it has."
            !current.available -> "This server doesn't carry an APK to install."
            offered != null -> "The server has a different build (${formatBytes(offered.size)}). " +
                "It will only install over this one if both were signed with the same key."
            else -> "You're running the build this server hands out."
        },
        style = MaterialTheme.typography.labelSmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.padding(top = 4.dp),
    )

    error?.let {
        Text(
            it,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.error,
            modifier = Modifier.padding(top = 4.dp),
        )
    }

    if (progress >= 0f) {
        LinearProgressIndicator(
            progress = { progress },
            modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
        )
        Text(
            "Downloading — ${(progress * 100).toInt()}%",
            style = MaterialTheme.typography.labelSmall,
            modifier = Modifier.padding(top = 4.dp),
        )
        return
    }

    Row(Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        offered?.let { apk ->
            Button(onClick = {
                error = null
                // Without this the install intent opens on a dead end. Ask for the toggle
                // first, and let the user come back and press the button again.
                if (!AppUpdate.canInstall(context)) {
                    AppUpdate.requestInstallPermission(context)
                    error = "Allow OppaiLib to install apps, then tap Update again."
                    return@Button
                }
                progress = 0f
                scope.launch {
                    AppUpdate.download(context, repo, apk) { progress = it }
                        .onSuccess { file ->
                            progress = -1f
                            AppUpdate.validateInstall(context, file)
                                .onSuccess { AppUpdate.install(context, file) }
                                .onFailure { error = it.message ?: "This APK cannot update the installed app." }
                        }
                        .onFailure { progress = -1f; error = it.message ?: "The download failed." }
                }
            }) { Text("Update") }
        }
        TextButton(onClick = { scope.launch { check() } }, enabled = !checking) { Text("Check again") }
    }
}

/**
 * Changing the account password. The server re-checks the current one before it takes
 * a new one, so a stolen phone session still can't lock the owner out of their library
 * — which is why this asks for the old password even though we're already signed in.
 */
@Composable
private fun ChangePasswordDialog(repo: Repository, onDismiss: () -> Unit) {
    var current by remember { mutableStateOf("") }
    var next by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var done by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Change password") },
        text = {
            Column {
                OutlinedTextField(
                    value = current,
                    onValueChange = { current = it },
                    label = { Text("Current password") },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = next,
                    onValueChange = { next = it },
                    label = { Text("New password") },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
                )
                Text(
                    "At least 8 characters. Signing in again elsewhere will need the new one.",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 8.dp),
                )
                error?.let {
                    Text(
                        it,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.labelSmall,
                        modifier = Modifier.padding(top = 8.dp),
                    )
                }
                if (done) {
                    Text(
                        "Password changed.",
                        style = MaterialTheme.typography.labelSmall,
                        modifier = Modifier.padding(top = 8.dp),
                    )
                }
            }
        },
        confirmButton = {
            TextButton(
                enabled = !busy && current.isNotBlank() && next.length >= 8,
                onClick = {
                    busy = true
                    error = null
                    scope.launch {
                        runCatching { repo.api.changePassword(PasswordRequest(current, next)) }
                            .onSuccess { done = true; onDismiss() }
                            // The server's own words: it's the one that knows whether the
                            // current password was wrong or the new one too short.
                            .onFailure { error = it.message ?: "The server refused that." }
                        busy = false
                    }
                },
            ) { Text("Change") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

private fun formatBytes(bytes: Long): String = when {
    bytes >= 1_000_000_000 -> "%.1f GB".format(bytes / 1_000_000_000.0)
    bytes >= 1_000_000 -> "%.0f MB".format(bytes / 1_000_000.0)
    bytes >= 1_000 -> "%.0f kB".format(bytes / 1_000.0)
    else -> "$bytes B"
}

@Composable
private fun SectionHeader(title: String) {
    HorizontalDivider(Modifier.padding(top = 24.dp))
    Text(
        title,
        style = MaterialTheme.typography.titleSmall,
        color = MaterialTheme.colorScheme.primary,
        modifier = Modifier.padding(top = 16.dp, bottom = 8.dp),
    )
}

@Composable
private fun SwitchRow(title: String, subtitle: String, checked: Boolean, onChange: (Boolean) -> Unit) {
    Row(
        Modifier.fillMaxWidth().clickable { onChange(!checked) }.padding(vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f).padding(end = 12.dp)) {
            Text(title, style = MaterialTheme.typography.bodyLarge)
            Text(
                subtitle,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Switch(checked = checked, onCheckedChange = onChange)
    }
}

@Composable
private fun StepperRow(title: String, value: String, onLess: () -> Unit, onMore: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().padding(vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(title, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f))
        IconButton(onClick = onLess) { Text("−", style = MaterialTheme.typography.titleLarge) }
        Text(value, style = MaterialTheme.typography.bodyLarge)
        IconButton(onClick = onMore) { Text("+", style = MaterialTheme.typography.titleLarge) }
    }
}
