package net.fourbakers.oppailib.ui

import android.net.Uri
import android.util.Base64
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import net.fourbakers.oppailib.data.LibbyEmotionRequest
import net.fourbakers.oppailib.data.LibbyVoice
import net.fourbakers.oppailib.data.LibbyOutfit
import net.fourbakers.oppailib.data.LibbyOutfitSaveRequest
import net.fourbakers.oppailib.data.Repository

/**
 * The emotion slots an outfit can dress, with where each one shows up.
 *
 * The first five are drawn by the bundled wardrobe and are what every outfit should
 * cover. The rest are finer moods with no bundled art of their own: each borrows a
 * drawn pose until this outfit gives it a picture, so they are optional and come last.
 * Kept in step with libbyEmotions (LibbyPortrait.kt) and the server.
 */
private val emotionSlots = listOf(
    "neutral" to "Popups",
    "happy" to "Sweet",
    "mischievous" to "Playful",
    "surprised" to "Bold",
    "thinking" to "Roleplay",
    "shy" to "Borrows Surprised",
    "smug" to "Borrows Mischievous",
    "sad" to "Borrows Thinking",
    "annoyed" to "Borrows Thinking",
    "sleepy" to "Borrows Neutral",
    "loving" to "Borrows Happy",
    "excited" to "Borrows Happy",
)

/** Horniness art tiers 0..4, calmest first — the level Libby wears rises with the
    session meter. Tier 0 is the baseline every outfit falls back to. */
private val tierLabels = listOf("Calm", "Warm", "Flirty", "Heated", "Peak")

/** Key for an (emotion, tier) art slot. */
private fun slotKey(emotion: String, level: Int) = "$emotion:$level"

/**
 * The outfit wardrobe inside Settings → Libby. Outfits live on the server (they
 * are shared art); which one this phone shows is a local pref, like hiding her.
 * The phone's "drag and drop" is the photo picker: tap an emotion slot, pick an
 * image, and it uploads into that slot.
 */
@Composable
fun LibbyOutfitsSection(repo: Repository) {
    var outfits by remember { mutableStateOf<List<LibbyOutfit>>(emptyList()) }
    var worn by remember { mutableStateOf(repo.prefs.libbyOutfit) }
    var editing by remember { mutableStateOf<LibbyOutfit?>(null) }
    var creating by remember { mutableStateOf(false) }
    // Cover URLs are otherwise stable, so a card would keep showing whatever Coil
    // already has. Bumping this is what makes a newly set cover visible.
    var coverVersion by remember { mutableStateOf(0) }
    val scope = rememberCoroutineScope()

    suspend fun reload() {
        runCatching { repo.api.libbyOutfits() }.onSuccess { res ->
            outfits = res.outfits
            if (worn.isNotEmpty() && res.outfits.none { it.id == worn }) {
                worn = ""
                repo.prefs.libbyOutfit = ""
            }
        }
    }

    LaunchedEffect(Unit) { reload() }

    fun wear(id: String) {
        worn = id
        repo.prefs.libbyOutfit = id
    }

    Column(Modifier.padding(top = 8.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(
            "Outfits swap Libby's artwork per emotion. Tap a slot in the editor to pick an image; " +
                "empty slots fall back to the default art. What she wears is per-device.",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        // Cards rather than rows: the only question a wardrobe is asked is "which one
        // is this?", and outfits are pictures. A horizontal strip keeps it inside the
        // settings list without a nested vertical scroll fighting the page.
        LazyRow(
            Modifier.fillMaxWidth().padding(top = 2.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            item {
                // The bundled wardrobe is a card like any other, in its own art rather
                // than as a "none" chip: it is a look you choose, not the absence of one.
                OutfitCard(
                    name = "Default Libby",
                    meta = "Bundled artwork",
                    worn = worn.isEmpty(),
                    model = "file:///android_asset/${mascotAsset("happy", 1)}",
                    repo = repo,
                    onClick = { wear("") },
                    onEdit = null,
                )
            }
            items(outfits, key = { it.id }) { o ->
                OutfitCard(
                    name = o.name,
                    meta = "${o.emotions.size}/${emotionSlots.size} emotions",
                    worn = worn == o.id,
                    model = if (o.hasThumb) repo.libbyOutfitThumbUrl(o.id, coverVersion) else null,
                    repo = repo,
                    onClick = { wear(if (worn == o.id) "" else o.id) },
                    onEdit = { editing = o },
                )
            }
            item {
                OutfitCard(
                    name = "New outfit",
                    meta = "Add your own art",
                    worn = false,
                    model = null,
                    repo = repo,
                    onClick = { creating = true },
                    onEdit = null,
                    placeholder = "＋",
                )
            }
        }
    }

    if (creating) {
        var name by remember { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { creating = false },
            title = { Text("New outfit") },
            text = {
                OutlinedTextField(name, { name = it }, label = { Text("Name") }, singleLine = true)
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        scope.launch {
                            runCatching { repo.api.saveLibbyOutfit(LibbyOutfitSaveRequest(name = name.trim())) }
                                .onSuccess { created ->
                                    creating = false
                                    reload()
                                    editing = created
                                }
                                .onFailure { repo.report(it.message ?: "Couldn't create the outfit") }
                        }
                    },
                    enabled = name.isNotBlank(),
                ) { Text("Create") }
            },
            dismissButton = { TextButton(onClick = { creating = false }) { Text("Cancel") } },
        )
    }

    editing?.let { outfit ->
        OutfitEditorDialog(
            repo = repo,
            outfit = outfit,
            onChanged = { coverVersion++; scope.launch { reload() } },
            onDeleted = {
                if (worn == outfit.id) wear("")
                editing = null
                scope.launch { reload() }
            },
            onDismiss = { editing = null },
        )
    }
}

/**
 * One outfit as a card: its art, its name, and whether it is on.
 *
 * Tapping the card wears it, which is what a wardrobe is for; Edit is a small corner
 * affordance so the common action stays a single tap on a picture. `onEdit` is null
 * for the two cards that are not editable outfits (the bundled default, and the
 * new-outfit tile).
 */
@Composable
private fun OutfitCard(
    name: String,
    meta: String,
    worn: Boolean,
    model: String?,
    repo: Repository,
    onClick: () -> Unit,
    onEdit: (() -> Unit)?,
    placeholder: String = "No art yet",
) {
    Column(
        Modifier
            .width(124.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .clickable(onClick = onClick),
    ) {
        Box(Modifier.fillMaxWidth().aspectRatio(3f / 4f), contentAlignment = Alignment.Center) {
            if (model != null) AsyncImage(
                model = model,
                imageLoader = repo.imageLoader,
                contentDescription = name,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxWidth().aspectRatio(3f / 4f),
            ) else Text(
                placeholder,
                style = if (placeholder == "＋") MaterialTheme.typography.headlineMedium
                else MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (worn) Text(
                "WEARING",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onPrimary,
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(6.dp)
                    .clip(RoundedCornerShape(999.dp))
                    .background(MaterialTheme.colorScheme.primary)
                    .padding(horizontal = 7.dp, vertical = 2.dp),
            )
            if (onEdit != null) Text(
                "Edit",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(6.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(MaterialTheme.colorScheme.surface)
                    .clickable(onClick = onEdit)
                    .padding(horizontal = 8.dp, vertical = 3.dp),
            )
        }
        Column(Modifier.padding(horizontal = 9.dp, vertical = 8.dp)) {
            Text(name, style = MaterialTheme.typography.labelLarge, maxLines = 1)
            Text(
                meta,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
            )
        }
    }
}

@Composable
private fun OutfitEditorDialog(
    repo: Repository,
    outfit: LibbyOutfit,
    onChanged: () -> Unit,
    onDeleted: () -> Unit,
    onDismiss: () -> Unit,
) {
    val context = LocalContext.current
    // Which (emotion, tier) slots already have art, as "emotion:level" keys.
    var filled by remember {
        mutableStateOf(
            buildSet {
                if (outfit.emotionLevels.isNotEmpty()) {
                    outfit.emotionLevels.forEach { (emotion, levels) ->
                        levels.forEach { add(slotKey(emotion, it)) }
                    }
                } else {
                    outfit.emotions.forEach { add(slotKey(it, 0)) }
                }
            },
        )
    }
    // Bumps the emotion image URLs so a fresh upload repaints past Coil's cache.
    var version by remember { mutableStateOf(0) }
    var tier by remember { mutableStateOf(0) }
    var pendingEmotion by remember { mutableStateOf<String?>(null) }
    var pendingLevel by remember { mutableStateOf(0) }
    val scope = rememberCoroutineScope()

    val picker = rememberSystemPickerLauncher(ActivityResultContracts.GetContent()) { uri: Uri? ->
        val emotion = pendingEmotion
        val level = pendingLevel
        pendingEmotion = null
        if (uri == null || emotion == null) return@rememberSystemPickerLauncher
        scope.launch {
            runCatching {
                val data = uriToDataUrl(context, uri)
                repo.api.setLibbyEmotion(outfit.id, emotion, LibbyEmotionRequest(data), level)
            }.onSuccess {
                filled = filled + slotKey(emotion, level)
                version++
                onChanged()
            }.onFailure { repo.report(it.message ?: "Couldn't upload the image") }
        }
    }

    // The card's art. Separate from the emotion slots because they want different
    // pictures: a slot is a portrait cropped to stand beside a conversation, and a
    // good cover is often a wider, posed shot that would look wrong there.
    var hasCover by remember { mutableStateOf(outfit.hasThumb) }
    val coverPicker = rememberSystemPickerLauncher(ActivityResultContracts.GetContent()) { uri: Uri? ->
        if (uri == null) return@rememberSystemPickerLauncher
        scope.launch {
            runCatching {
                repo.api.setLibbyOutfitThumb(outfit.id, LibbyEmotionRequest(uriToDataUrl(context, uri)))
            }.onSuccess {
                hasCover = true
                version++
                onChanged()
            }.onFailure { repo.report(it.message ?: "Couldn't set the cover") }
        }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(outfit.name) },
        text = {
            Column(
                Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text(
                    "Pick a horniness tier, then tap an emotion to set its image. Empty tiers " +
                        "fall back to the calmer art.",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Box(
                        Modifier.width(64.dp).aspectRatio(3f / 4f)
                            .clip(RoundedCornerShape(10.dp))
                            .background(MaterialTheme.colorScheme.surfaceVariant),
                        contentAlignment = Alignment.Center,
                    ) {
                        if (hasCover) AsyncImage(
                            model = repo.libbyOutfitThumbUrl(outfit.id, version),
                            imageLoader = repo.imageLoader,
                            contentDescription = "Outfit cover",
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.width(64.dp).aspectRatio(3f / 4f),
                        ) else Text(
                            "No cover",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Column(Modifier.weight(1f)) {
                        Text(
                            "Card art for the wardrobe. Without one, the card uses this outfit's own artwork.",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Row {
                            TextButton(onClick = { coverPicker.launch("image/*") }) { Text("Choose cover") }
                            if (hasCover) TextButton(onClick = {
                                scope.launch {
                                    runCatching { repo.api.clearLibbyOutfitThumb(outfit.id) }
                                        .onSuccess { hasCover = false; version++; onChanged() }
                                        .onFailure { repo.report(it.message ?: "Couldn't clear the cover") }
                                }
                            }) { Text("Use outfit art") }
                        }
                    }
                }
                Row(
                    Modifier.horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    tierLabels.forEachIndexed { level, label ->
                        FilterChip(
                            selected = tier == level,
                            onClick = { tier = level },
                            label = { Text(label) },
                        )
                    }
                }
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(emotionSlots, key = { it.first }) { (emotion, hint) ->
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier
                                .width(92.dp)
                                .clickable {
                                    pendingEmotion = emotion
                                    pendingLevel = tier
                                    picker.launch("image/*")
                                },
                        ) {
                            Box(
                                Modifier
                                    .fillMaxWidth()
                                    .aspectRatio(3f / 4f)
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(MaterialTheme.colorScheme.surfaceVariant),
                                contentAlignment = Alignment.Center,
                            ) {
                                if (slotKey(emotion, tier) in filled) {
                                    val base = repo.libbyEmotionUrl(outfit.id, emotion, tier)
                                    val sep = if (base.contains("?")) "&" else "?"
                                    AsyncImage(
                                        model = "$base${sep}v=$version",
                                        imageLoader = repo.imageLoader,
                                        contentDescription = emotion,
                                        contentScale = ContentScale.Crop,
                                        modifier = Modifier.fillMaxWidth().aspectRatio(3f / 4f),
                                    )
                                } else {
                                    Text("＋", style = MaterialTheme.typography.headlineMedium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                            Text(
                                emotion.replaceFirstChar { it.uppercase() },
                                style = MaterialTheme.typography.labelSmall,
                            )
                            Text(
                                hint,
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
            }
        },
        confirmButton = { TextButton(onClick = onDismiss) { Text("Done") } },
        dismissButton = {
            TextButton(
                onClick = {
                    scope.launch {
                        runCatching { repo.api.deleteLibbyOutfit(outfit.id) }
                            .onSuccess {
                                LibbyVoice.react(LibbyVoice.Event.LIBRARY_DELETE)
                                    .let { repo.report(it.message, it.emotion) }
                                onDeleted()
                            }
                            .onFailure { repo.report(it.message ?: "Couldn't delete the outfit") }
                    }
                },
            ) { Text("Delete outfit", color = MaterialTheme.colorScheme.error) }
        },
    )
}

/**
 * Reads a picked image into the data-URL form the server's upload endpoints take.
 *
 * Suspending and pinned to IO: reading up to 8 MB and base64-encoding it into a ~11 MB
 * string is entirely synchronous work, and on the main thread it stalls the UI for as
 * long as it takes. Every caller is already inside a coroutine.
 */
internal suspend fun uriToDataUrl(context: android.content.Context, uri: Uri): String = withContext(Dispatchers.IO) {
    val resolver = context.contentResolver
    val mime = resolver.getType(uri) ?: "image/png"
    val bytes = resolver.openInputStream(uri)?.use { it.readBytes() }
        ?: error("Couldn't read the image")
    require(bytes.size <= 8 * 1024 * 1024) { "The image is larger than 8 MB" }
    "data:$mime;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP)
}
