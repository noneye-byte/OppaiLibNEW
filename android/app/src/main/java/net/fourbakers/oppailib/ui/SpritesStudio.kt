package net.fourbakers.oppailib.ui

import android.net.Uri
import android.util.Base64
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Brush
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.ContentCut
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.FaceRetouchingNatural
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material.icons.filled.Upload
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.RequestBody.Companion.toRequestBody
import net.fourbakers.oppailib.data.BoardFilter
import net.fourbakers.oppailib.data.ImageGenStatus
import net.fourbakers.oppailib.data.LibbyEmotionRequest
import net.fourbakers.oppailib.data.LibbyOutfit
import net.fourbakers.oppailib.data.LibbyOutfitSaveRequest
import net.fourbakers.oppailib.data.LibbyWipSquare
import net.fourbakers.oppailib.data.PutWipRequest
import net.fourbakers.oppailib.data.Repository
import net.fourbakers.oppailib.data.SPRITE_ACTIVITIES
import net.fourbakers.oppailib.data.SPRITE_FACES
import net.fourbakers.oppailib.data.SPRITE_TIERS
import net.fourbakers.oppailib.data.SpriteSquare
import net.fourbakers.oppailib.data.SquareState
import net.fourbakers.oppailib.data.SquareWordsChange
import net.fourbakers.oppailib.data.boardSquares
import net.fourbakers.oppailib.data.matchesFilter
import net.fourbakers.oppailib.data.recordSeed
import net.fourbakers.oppailib.data.retargetPrompt
import net.fourbakers.oppailib.data.serverMessage
import net.fourbakers.oppailib.data.spriteInfo
import net.fourbakers.oppailib.data.spriteRequest
import net.fourbakers.oppailib.data.squareHeat
import net.fourbakers.oppailib.data.squareWords
import net.fourbakers.oppailib.ui.theme.LocalInk
import java.net.URLEncoder
import java.util.UUID
import kotlin.random.Random

private fun dataUrl(bytes: ByteArray, mime: String = "image/png") = "data:$mime;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP)

private fun Repository.wipUrl(outfit: String, emotion: String, level: Int, v: Long): String =
    serverUrl("api/libby/outfits/${URLEncoder.encode(outfit, "UTF-8")}/wip/$emotion?level=$level&v=$v")

private fun Repository.filedUrl(outfit: String, emotion: String, level: Int, v: Int): String =
    libbyEmotionUrl(outfit, emotion, level).let { if (it.contains('?')) "$it&v=$v" else "$it?v=$v" }

/**
 * The Sprites studio on the phone: her wardrobe as a board of squares — twelve
 * expressions by five heat tiers, and the moments under them — each one's latest take
 * and what is filed, with the review the web does (cut her out, file her in), redraws
 * from each square's own record, and missing squares drawn from a sibling's.
 * See data/SpriteBoard.kt for why the phone works from records rather than the recipe.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun SpritesStudio(repo: Repository, status: ImageGenStatus) {
    var outfits by remember { mutableStateOf<List<LibbyOutfit>?>(null) }
    var outfitId by rememberSaveable { mutableStateOf("") }
    var wip by remember { mutableStateOf<Map<String, LibbyWipSquare>>(emptyMap()) }
    var words by remember { mutableStateOf<Map<String, SquareWordsChange>>(emptyMap()) }
    var filter by remember { mutableStateOf(BoardFilter.ALL) }
    var open by remember { mutableStateOf<SpriteSquare?>(null) }
    var naming by remember { mutableStateOf(false) }
    var pickOpen by remember { mutableStateOf(false) }
    // The squares being drawn or filed, and what the batch is doing.
    val working = remember { mutableStateMapOf<String, String>() }
    var batch by remember { mutableStateOf("") }
    var stopBatch by remember { mutableStateOf(false) }
    var jobId by remember { mutableStateOf("") }
    // Bumped when a filed picture changes under its stable URL, so the tile reloads.
    var filedVersion by remember { mutableIntStateOf(0) }
    val scope = rememberCoroutineScope()
    val canDraw = status.enabled && status.reachable

    suspend fun reloadOutfits() {
        runCatching { repo.api.libbyOutfits().outfits }.onSuccess { list ->
            outfits = list
            if (outfitId.isEmpty() || list.none { it.id == outfitId }) outfitId = list.firstOrNull()?.id.orEmpty()
        }.onFailure { outfits = emptyList(); repo.report(it.serverMessage("Couldn't load her wardrobes.")) }
    }
    suspend fun reloadWip() {
        if (outfitId.isEmpty()) { wip = emptyMap(); return }
        wip = runCatching { repo.web.outfitWip(outfitId).squares }.getOrDefault(emptyList()).associateBy { "${it.emotion}:${it.level}" }
    }
    LaunchedEffect(Unit) {
        reloadOutfits()
        words = runCatching { repo.web.spriteWords().words }.getOrDefault(emptyMap())
    }
    LaunchedEffect(outfitId) { reloadWip() }

    val outfit = outfits?.firstOrNull { it.id == outfitId }
    val squares = remember { boardSquares() }
    fun stateOf(sq: SpriteSquare): SquareState {
        val filed = outfit?.emotionLevels?.get(sq.slot)?.contains(sq.level) == true || (sq.level == 0 && outfit?.emotions?.contains(sq.slot) == true)
        val take = wip[sq.key]
        return when {
            take != null && !take.reviewed -> SquareState.REVIEW
            filed -> SquareState.FILED
            else -> SquareState.NONE
        }
    }

    /** The record a square is drawn from: its own take's, or a sibling's at its heat with
     *  the words swapped; null with the reason when neither will do. */
    fun recipeFor(sq: SpriteSquare): Pair<Pair<kotlinx.serialization.json.JsonObject, String>?, String> {
        val own = wip[sq.key]?.info
        val ownPrompt = own?.let { (it["prompt"] as? JsonPrimitive)?.contentOrNull }
        if (own != null && !ownPrompt.isNullOrBlank()) return (own to ownPrompt) to ""
        val heat = squareHeat(sq)
        val target = squareWords(sq.slot, words)
        for (sib in squares) {
            if (sib.key == sq.key || squareHeat(sib) != heat || sib.moment != sq.moment) continue
            val info = wip[sib.key]?.info ?: continue
            val prompt = (info["prompt"] as? JsonPrimitive)?.contentOrNull ?: continue
            val moved = retargetPrompt(prompt, squareWords(sib.slot, words), target) ?: continue
            return (info to moved) to ""
        }
        return null to "Nothing at this heat has been drawn yet — draw the first one in the web's Sprites studio, and the phone can draw the rest from it."
    }

    /** Draws one square and keeps it as its latest take, waiting for review. */
    suspend fun draw(sq: SpriteSquare): Boolean {
        val (recipe, why) = recipeFor(sq)
        if (recipe == null) { repo.report(why); return false }
        val (info, prompt) = recipe
        val seed = Random.nextLong(1, 4_294_967_295L)
        val id = UUID.randomUUID().toString()
        jobId = id
        working[sq.key] = "Drawing…"
        try {
            val res = repo.web.generateSprite(spriteRequest(info, prompt, seed, id))
            val shot = res.images.firstOrNull() ?: error("The generator sent nothing back.")
            val bytes = withContext(Dispatchers.IO) { repo.web.genPreview(shot.id).use { it.bytes() } }
            val prior = wip[sq.key] ?: squares.firstNotNullOfOrNull { s -> wip[s.key]?.takeIf { squareHeat(s) == squareHeat(sq) } }
            val kept = repo.web.putOutfitWip(
                outfitId, sq.slot, sq.level.takeIf { it > 0 },
                PutWipRequest(
                    imageData = dataUrl(bytes),
                    filename = wip[sq.key]?.filename.orEmpty(),
                    seed = shot.seed.takeIf { it > 0 } ?: seed,
                    reviewed = false,
                    config = prior?.config.orEmpty(),
                    info = spriteInfo(info, prompt, shot.seed.takeIf { it > 0 } ?: seed),
                ),
            )
            wip = wip + (sq.key to kept)
            return true
        } catch (e: Exception) {
            repo.report(e.serverMessage("Couldn't draw ${sq.label}."))
            return false
        } finally {
            working.remove(sq.key)
            jobId = ""
        }
    }

    /** Cuts her out of a take and files the cut into the wardrobe, marking the take reviewed. */
    suspend fun file(sq: SpriteSquare, cut: Boolean): Boolean {
        val take = wip[sq.key] ?: return false
        working[sq.key] = if (cut) "Cutting out…" else "Filing…"
        try {
            val raw = withContext(Dispatchers.IO) { repo.web.outfitWipImage(outfitId, sq.slot, sq.level.takeIf { it > 0 }).use { it.bytes() } }
            val filed = if (cut) withContext(Dispatchers.IO) {
                repo.web.matteCut(raw.toRequestBody("image/png".toMediaTypeOrNull())).use { it.bytes() }
            } else raw
            repo.api.setLibbyEmotion(outfitId, sq.slot, LibbyEmotionRequest(dataUrl(filed)), sq.level)
            val kept = repo.web.putOutfitWip(outfitId, sq.slot, sq.level.takeIf { it > 0 },
                PutWipRequest(dataUrl(raw), take.filename, take.seed, reviewed = true, config = take.config, info = take.info))
            wip = wip + (sq.key to kept)
            filedVersion++
            reloadOutfits()
            return true
        } catch (e: Exception) {
            repo.report(e.serverMessage("Couldn't file ${sq.label}."))
            return false
        } finally {
            working.remove(sq.key)
        }
    }

    if (naming) NameDialog("New wardrobe", "", "Create", onDismiss = { naming = false }) { name ->
        naming = false
        scope.launch {
            runCatching { repo.api.saveLibbyOutfit(LibbyOutfitSaveRequest(name = name)) }
                .onSuccess { o -> outfitId = o.id; reloadOutfits() }
                .onFailure { repo.report(it.serverMessage("Couldn't make the wardrobe.")) }
        }
    }

    val list = outfits
    if (list == null) { Box(Modifier.fillMaxSize(), Alignment.Center) { CircularProgressIndicator() }; return }
    if (list.isEmpty()) {
        EmptyNote(
            "Her wardrobes hold one picture per expression per heat — sixty for a whole outfit. Start one here; its first squares are drawn in the web's Sprites studio, where the outfit's recipe is set.",
            icon = Icons.Filled.FaceRetouchingNatural,
            action = { PrimaryButton("New wardrobe", onClick = { naming = true }, icon = Icons.Filled.Add) },
        )
        return
    }

    val states = squares.associate { it.key to stateOf(it) }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 32.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        item {
            Column(Modifier.padding(horizontal = 16.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.weight(1f)) {
                        Row(Modifier.clip(RoundedCornerShape(10.dp)).clickable { pickOpen = true }.padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                            Column {
                                Kicker("Wardrobe")
                                Text(outfit?.name?.ifBlank { "Untitled" } ?: "Choose one", style = MaterialTheme.typography.titleMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            }
                        }
                        DropdownMenu(expanded = pickOpen, onDismissRequest = { pickOpen = false }) {
                            list.forEach { o ->
                                DropdownMenuItem(
                                    text = { Text("${o.name.ifBlank { "Untitled" }} · ${o.slots}") },
                                    leadingIcon = { if (o.id == outfitId) Icon(Icons.Filled.Check, contentDescription = null) else Spacer(Modifier.size(24.dp)) },
                                    onClick = { pickOpen = false; outfitId = o.id },
                                )
                            }
                        }
                    }
                    ToolButton(Icons.Filled.Add, "New wardrobe", { naming = true }, label = "New")
                }
                val filedCount = states.values.count { it == SquareState.FILED }
                Text(
                    "$filedCount of ${squares.size} filed · ${states.values.count { it == SquareState.REVIEW }} to review",
                    style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                InkChipRow(padding = PaddingValues(0.dp)) {
                    BoardFilter.entries.forEach { f ->
                        InkChip(f.label, filter == f, { filter = f }, small = true, count = states.values.count { matchesFilter(f, it) }.toString())
                    }
                }
                if (canDraw) Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    if (batch.isEmpty()) PrimaryButton("Draw what's missing", onClick = {
                        stopBatch = false
                        scope.launch {
                            val todo = squares.filter { states[it.key] == SquareState.NONE && recipeFor(it).first != null }
                            if (todo.isEmpty()) { repo.report("Nothing missing can be drawn from what is here yet."); return@launch }
                            for ((i, sq) in todo.withIndex()) {
                                if (stopBatch) break
                                batch = "Drawing ${i + 1} of ${todo.size} · ${SPRITE_TIERS.getOrNull(sq.level)?.label ?: ""} ${sq.label}"
                                draw(sq)
                            }
                            batch = ""
                        }
                    }, icon = Icons.Filled.AutoAwesome)
                    else {
                        ToolButton(Icons.Filled.Stop, "Stop", {
                            stopBatch = true
                            if (jobId.isNotEmpty()) scope.launch { runCatching { repo.api.imageGenCancel(jobId) } }
                        }, label = "Stop")
                        Text(batch, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(1f))
                    }
                    ToolButton(Icons.Filled.Refresh, "Reload", { scope.launch { reloadOutfits(); reloadWip() } }, bare = true)
                } else Text("The image generator isn't reachable, so squares can be reviewed and filed but not drawn.",
                    style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        SPRITE_TIERS.forEachIndexed { t, tier ->
            item(key = "tier$t") {
                Column {
                    SectionHead(tier.label, sub = tier.mood)
                    LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(SPRITE_FACES, key = { "${it.id}:$t" }) { f ->
                            val sq = SpriteSquare(f.id, t, f.label, moment = false)
                            BoardTile(repo, outfitId, sq, states[sq.key] ?: SquareState.NONE, wip[sq.key], filedVersion, working[sq.key],
                                dim = !matchesFilter(filter, states[sq.key] ?: SquareState.NONE)) { open = sq }
                        }
                    }
                }
            }
        }
        for ((title, group) in listOf("Everyday" to SPRITE_ACTIVITIES.filter { !it.intimate }, "Intimate" to SPRITE_ACTIVITIES.filter { it.intimate })) {
            item(key = "moments-$title") {
                Column {
                    SectionHead("Moments · $title", sub = "What she is doing, rather than feeling")
                    LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(group, key = { it.id }) { a ->
                            val sq = SpriteSquare(a.id, 0, a.label, moment = true)
                            BoardTile(repo, outfitId, sq, states[sq.key] ?: SquareState.NONE, wip[sq.key], filedVersion, working[sq.key],
                                dim = !matchesFilter(filter, states[sq.key] ?: SquareState.NONE)) { open = sq }
                        }
                    }
                }
            }
        }
    }

    open?.let { sq ->
        SquareSheet(
            repo = repo, outfitId = outfitId, sq = sq, state = states[sq.key] ?: SquareState.NONE, take = wip[sq.key],
            filedVersion = filedVersion, busy = working[sq.key], canDraw = canDraw && batch.isEmpty(),
            drawNote = recipeFor(sq).second,
            onDismiss = { open = null },
            onDraw = { scope.launch { draw(sq) } },
            onFile = { cut -> scope.launch { file(sq, cut) } },
            onUpload = { bytes, mime ->
                scope.launch {
                    runCatching { repo.api.setLibbyEmotion(outfitId, sq.slot, LibbyEmotionRequest(dataUrl(bytes, mime)), sq.level) }
                        .onSuccess { filedVersion++; reloadOutfits(); repo.report("Filed ${sq.label}.", "happy") }
                        .onFailure { repo.report(it.serverMessage("Couldn't file that picture.")) }
                }
            },
            onRemove = { which ->
                scope.launch {
                    runCatching {
                        if (which == "take") repo.web.deleteOutfitWip(outfitId, sq.slot, sq.level.takeIf { it > 0 })
                        else repo.web.deleteOutfitEmotion(outfitId, sq.slot, sq.level.takeIf { it > 0 })
                    }.onSuccess {
                        if (which == "take") wip = wip - sq.key else { filedVersion++; reloadOutfits() }
                    }.onFailure { repo.report(it.serverMessage("Couldn't remove it.")) }
                }
            },
        )
    }
}

/** One square: its latest take or its filed picture, its state, and a spinner while it works. */
@Composable
private fun BoardTile(
    repo: Repository, outfitId: String, sq: SpriteSquare, state: SquareState, take: LibbyWipSquare?, filedVersion: Int,
    busy: String?, dim: Boolean, onClick: () -> Unit,
) {
    val ink = LocalInk.current
    Column(Modifier.width(92.dp).alpha(if (dim) 0.3f else 1f).clickable(onClick = onClick)) {
        Box(
            Modifier.fillMaxWidth().aspectRatio(3f / 4f).clip(RoundedCornerShape(10.dp))
                .background(MaterialTheme.colorScheme.surfaceContainer)
                .then(if (state == SquareState.REVIEW) Modifier.border(2.dp, MaterialTheme.colorScheme.primary, RoundedCornerShape(10.dp)) else Modifier),
        ) {
            val url = when {
                take != null && state == SquareState.REVIEW -> repo.wipUrl(outfitId, sq.slot, sq.level, take.updatedAt)
                state == SquareState.FILED -> repo.filedUrl(outfitId, sq.slot, sq.level, filedVersion)
                take != null -> repo.wipUrl(outfitId, sq.slot, sq.level, take.updatedAt)
                else -> null
            }
            if (url != null) AsyncImage(url, sq.label, imageLoader = repo.imageLoader, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
            else Box(Modifier.fillMaxSize(), Alignment.Center) {
                Icon(Icons.Filled.FaceRetouchingNatural, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.35f))
            }
            when (state) {
                SquareState.FILED -> Icon(Icons.Filled.Check, "Filed", tint = ink.success,
                    modifier = Modifier.align(Alignment.TopEnd).padding(4.dp).size(16.dp))
                SquareState.REVIEW -> TileBadge("Review", Modifier.align(Alignment.BottomStart).padding(4.dp), color = MaterialTheme.colorScheme.primary.copy(alpha = 0.9f))
                else -> {}
            }
            if (busy != null) Box(Modifier.matchParentSize().background(MaterialTheme.colorScheme.scrim.copy(alpha = 0.55f)), Alignment.Center) {
                CircularProgressIndicator(Modifier.size(22.dp), strokeWidth = 2.dp)
            }
        }
        Text(sq.label, style = MaterialTheme.typography.labelMedium, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 4.dp))
    }
}

/** A square opened: its take and what is filed, side by side, and what can be done. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SquareSheet(
    repo: Repository, outfitId: String, sq: SpriteSquare, state: SquareState, take: LibbyWipSquare?, filedVersion: Int,
    busy: String?, canDraw: Boolean, drawNote: String,
    onDismiss: () -> Unit, onDraw: () -> Unit, onFile: (Boolean) -> Unit,
    onUpload: (ByteArray, String) -> Unit, onRemove: (String) -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val picker = rememberSystemPickerLauncher(ActivityResultContracts.GetContent()) { uri: Uri? ->
        if (uri == null) return@rememberSystemPickerLauncher
        scope.launch {
            val read = withContext(Dispatchers.IO) {
                runCatching { context.contentResolver.openInputStream(uri)!!.use { it.readBytes() } to (context.contentResolver.getType(uri) ?: "image/png") }.getOrNull()
            }
            if (read != null) onUpload(read.first, read.second)
        }
    }
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(Modifier.padding(horizontal = 16.dp).padding(bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Kicker(if (sq.moment) "Moment" else SPRITE_TIERS.getOrNull(sq.level)?.label ?: "")
                    Text(sq.label, style = MaterialTheme.typography.titleLarge)
                }
                Text(when (state) { SquareState.FILED -> "In the wardrobe"; SquareState.REVIEW -> "To review"; else -> "Not drawn" },
                    style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                if (take != null) Column(Modifier.weight(1f)) {
                    Box(Modifier.fillMaxWidth().aspectRatio(3f / 4f).clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.surfaceContainer)) {
                        AsyncImage(repo.wipUrl(outfitId, sq.slot, sq.level, take.updatedAt), null, imageLoader = repo.imageLoader, contentScale = ContentScale.Fit, modifier = Modifier.fillMaxSize())
                    }
                    Text("Latest take", style = MaterialTheme.typography.labelMedium, modifier = Modifier.padding(top = 4.dp))
                }
                if (state == SquareState.FILED || take?.reviewed == true) Column(Modifier.weight(1f)) {
                    Box(Modifier.fillMaxWidth().aspectRatio(3f / 4f).clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.surfaceContainerHigh)) {
                        AsyncImage(repo.filedUrl(outfitId, sq.slot, sq.level, filedVersion), null, imageLoader = repo.imageLoader, contentScale = ContentScale.Fit, modifier = Modifier.fillMaxSize())
                    }
                    Text("In the wardrobe", style = MaterialTheme.typography.labelMedium, modifier = Modifier.padding(top = 4.dp))
                }
                if (take == null && state != SquareState.FILED) Box(
                    Modifier.weight(1f).aspectRatio(3f / 4f).clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.surfaceContainer),
                    Alignment.Center,
                ) { Icon(Icons.Filled.FaceRetouchingNatural, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f), modifier = Modifier.size(40.dp)) }
            }
            if (busy != null) Row(verticalAlignment = Alignment.CenterVertically) {
                CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                Spacer(Modifier.width(10.dp))
                Text(busy, style = MaterialTheme.typography.bodyMedium)
            }
            if (take != null && !take.reviewed) {
                PrimaryButton("Cut her out and file it", onClick = { onFile(true) }, icon = Icons.Filled.ContentCut, enabled = busy == null, modifier = Modifier.fillMaxWidth())
                ToolButton(Icons.Filled.Check, "File it as it is", { onFile(false) }, label = "File it as it is", enabled = busy == null)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                ToolButton(Icons.Filled.Brush, if (take == null) "Draw" else "Redraw", onDraw,
                    label = if (take == null) "Draw" else "Redraw", enabled = canDraw && busy == null && drawNote.isEmpty())
                ToolButton(Icons.Filled.Upload, "Use a picture", { picker.launch("image/*") }, label = "Use a picture", enabled = busy == null)
            }
            if (drawNote.isNotEmpty()) Text(drawNote, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            val prompt = take?.info?.let { (it["prompt"] as? JsonPrimitive)?.contentOrNull }
            if (!prompt.isNullOrBlank()) {
                Kicker("Drawn with · seed ${recordSeed(take.info) ?: take.seed}")
                SelectionContainer {
                    Text(prompt, style = MaterialTheme.typography.bodySmall.copy(fontFamily = FontFamily.Monospace),
                        color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.heightIn(max = 140.dp))
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (take != null) ToolButton(Icons.Filled.Delete, "Drop the take", { onRemove("take") }, label = "Drop the take", tint = MaterialTheme.colorScheme.error)
                if (state == SquareState.FILED || take?.reviewed == true) ToolButton(Icons.Filled.Delete, "Take it out of the wardrobe", { onRemove("filed") },
                    label = "Unfile", tint = MaterialTheme.colorScheme.error)
            }
        }
    }
}
