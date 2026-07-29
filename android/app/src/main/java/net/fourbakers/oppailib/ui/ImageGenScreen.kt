package net.fourbakers.oppailib.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.clickable
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Save
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Slider
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import coil.compose.AsyncImage
import coil.compose.SubcomposeAsyncImage
import kotlinx.coroutines.launch
import net.fourbakers.oppailib.data.GenCharacter
import net.fourbakers.oppailib.data.DetailerRequest
import net.fourbakers.oppailib.data.GenLoraPick
import net.fourbakers.oppailib.data.GenModel
import net.fourbakers.oppailib.data.GenPreview
import net.fourbakers.oppailib.data.GenSaveRequest
import net.fourbakers.oppailib.data.LibbyMeter
import net.fourbakers.oppailib.data.LibbyVoice
import net.fourbakers.oppailib.data.GenTemplate
import net.fourbakers.oppailib.data.GenerateRequest
import net.fourbakers.oppailib.data.ImageGenStatus
import net.fourbakers.oppailib.data.Repository

/** Resolution presets: SD 1.x sizes first, SDXL sizes after. */
private data class SizePreset(val label: String, val w: Int, val h: Int)
private val sizePresets = listOf(
    SizePreset("512×768", 512, 768),
    SizePreset("512×512", 512, 512),
    SizePreset("768×512", 768, 512),
    SizePreset("832×1216", 832, 1216),
    SizePreset("1024×1024", 1024, 1024),
    SizePreset("1216×832", 1216, 832),
)

/** A generated preview plus whether it has been saved into the library yet. */
private data class ShotState(val preview: GenPreview, val saved: Boolean)

/**
 * The phone's image-generation studio. Same contract as the web view: everything is
 * generated into the server's memory and previewed from there; only Save files an
 * image into the library. Models, LoRAs, VAEs, templates and the character library
 * all come from /api/imagegen/status and /characters.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ImageGenScreen(repo: Repository, onBack: () -> Unit, onSaved: () -> Unit) {
    var status by remember { mutableStateOf<ImageGenStatus?>(null) }
    var statusError by remember { mutableStateOf("") }
    var characters by remember { mutableStateOf<List<GenCharacter>>(emptyList()) }

    var checkpoint by remember { mutableStateOf("") }
    var vae by remember { mutableStateOf("") }
    var templateId by remember { mutableStateOf("") }
    // Built-in style presets are hidden by default; the picker shows the user's own.
    var showBuiltInTemplates by remember { mutableStateOf(false) }
    var loraWeights by remember { mutableStateOf<Map<String, Double>>(emptyMap()) }
    // Trigger phrases the user has folded into the prompt, drawn from the selected
    // LoRAs. Kept as raw phrases; stale entries (from a since-deselected LoRA) are
    // ignored at assembly time rather than eagerly pruned.
    var selectedTriggers by remember { mutableStateOf<Set<String>>(emptySet()) }
    var selectedChars by remember { mutableStateOf<Set<String>>(emptySet()) }

    var prompt by remember { mutableStateOf("") }
    var tagSuggestions by remember { mutableStateOf<List<String>>(emptyList()) }
    var tagCorrection by remember { mutableStateOf("") }
    var negative by remember { mutableStateOf("") }
    var width by remember { mutableStateOf(512) }
    var height by remember { mutableStateOf(768) }
    var steps by remember { mutableStateOf(25) }
    var cfg by remember { mutableStateOf(7.0) }
    var count by remember { mutableStateOf(1) }
    var seedText by remember { mutableStateOf("-1") }
    var detailerEnabled by remember { mutableStateOf(false) }
    var detailerModel by remember { mutableStateOf("face_yolov8n.pt") }
    var detailerPrompt by remember { mutableStateOf("") }
    var detailerNegative by remember { mutableStateOf("") }
    var detailerConfidence by remember { mutableStateOf(0.3) }
    var detailerDenoise by remember { mutableStateOf(0.4) }
    var detailerMaskBlur by remember { mutableStateOf(4) }

    var generating by remember { mutableStateOf(false) }
    var shots by remember { mutableStateOf<List<ShotState>>(emptyList()) }
    var error by remember { mutableStateOf("") }
    var tab by remember { mutableStateOf(0) }
    // Bumped after each generation so the Gallery tab reloads: InvokeAI keeps its
    // own copy of everything that just finished.
    var galleryRefresh by remember { mutableStateOf(0) }
    // The gallery board new generations are filed into. It is owned here but driven
    // by the Gallery tab, so whatever gallery you have open there is where the next
    // image lands — there is no second "destination" setting to keep in sync.
    var board by remember { mutableStateOf("none") }
    /** Model or LoRA name whose record is being edited, or null. */
    var editTarget by remember { mutableStateOf<String?>(null) }
    // The character being created or edited (blank id = new); null = editor closed.
    var charDraft by remember { mutableStateOf<GenCharacter?>(null) }
    /** A result expanded to full screen. */
    var expandedShot by remember { mutableStateOf<ShotState?>(null) }
    val scope = rememberCoroutineScope()

    fun applyModel(m: GenModel) {
        checkpoint = m.title
        val d = m.defaults ?: return
        if (d.steps > 0) steps = d.steps
        if (d.cfgScale > 0) cfg = d.cfgScale
        if (d.width > 0) width = d.width
        if (d.height > 0) height = d.height
        if (d.vae.isNotEmpty()) vae = d.vae
    }

    suspend fun reloadCharacters() {
        runCatching { repo.api.imageGenCharacters() }.onSuccess { characters = it.characters }
    }

    LaunchedEffect(Unit) {
        runCatching { repo.api.imageGenStatus() }
            .onSuccess { st ->
                status = st
                if (checkpoint.isEmpty()) st.models.firstOrNull()?.let { applyModel(it) }
            }
            .onFailure { statusError = it.message ?: "Couldn't reach the server" }
        reloadCharacters()
    }
    BackHandler(onBack = onBack)

    /** The same prompt assembly the web does: characters appended, template spliced. */
    fun assembledPrompts(): Pair<String, String> {
        val parts = mutableListOf(prompt.trim())
        val negParts = mutableListOf(negative.trim())
        // Fold in the picked LoRA trigger phrases, in the order they appear among the
        // selected LoRAs, skipping any whose LoRA is no longer selected.
        val availableTriggers = status?.loras.orEmpty()
            .filter { it.name in loraWeights }
            .flatMap { it.triggerPhrases }
            .distinct()
        parts += availableTriggers.filter { it in selectedTriggers }
        for (id in selectedChars) {
            val c = characters.find { it.id == id } ?: continue
            if (c.prompt.isNotBlank()) parts += c.prompt.trim()
            if (c.negativePrompt.isNotBlank()) negParts += c.negativePrompt.trim()
        }
        var pos = parts.filter { it.isNotEmpty() }.joinToString(", ")
        var neg = negParts.filter { it.isNotEmpty() }.joinToString(", ")
        val tpl: GenTemplate? = status?.templates?.find { it.id == templateId }
        if (tpl != null) {
            pos = if (tpl.prompt.contains("{prompt}")) tpl.prompt.replace("{prompt}", pos)
            else if (tpl.prompt.isNotBlank()) "$pos, ${tpl.prompt.trim()}" else pos
            if (tpl.negativePrompt.isNotBlank()) {
                neg = if (neg.isEmpty()) tpl.negativePrompt.trim() else "$neg, ${tpl.negativePrompt.trim()}"
            }
        }
        return pos to neg
    }

    fun generate() {
        if (generating || prompt.isBlank()) return
        generating = true
        error = ""
        val (pos, neg) = assembledPrompts()
        scope.launch {
            runCatching {
                repo.api.imageGenGenerate(
                    GenerateRequest(
                        prompt = pos,
                        negativePrompt = neg,
                        checkpoint = checkpoint,
                        vae = vae,
                        steps = steps,
                        width = width,
                        height = height,
                        cfgScale = cfg,
                        seed = seedText.toLongOrNull() ?: -1,
                        count = count,
                        board = board,
                        loras = loraWeights.map { (name, weight) -> GenLoraPick(name, weight) },
                        detailer = if (status?.detailerAvailable == true && detailerEnabled) {
                            DetailerRequest(
                                enabled = true,
                                model = detailerModel,
                                prompt = detailerPrompt,
                                negativePrompt = detailerNegative,
                                confidence = detailerConfidence,
                                denoise = detailerDenoise,
                                maskBlur = detailerMaskBlur,
                            )
                        } else null,
                    ),
                )
            }.onSuccess { res ->
                // Only the newest run stays on screen. Earlier ones aren't lost —
                // InvokeAI keeps every finished image in its gallery, which is what
                // the Gallery tab browses.
                shots = res.images.map { ShotState(it, saved = false) }
                galleryRefresh++
                LibbyVoice.react(LibbyVoice.Event.GENERATE).let { repo.report(it.message, it.emotion) }
            }.onFailure { error = it.message ?: "Generation failed" }
            generating = false
        }
    }

    fun save(shot: ShotState) {
        if (shot.saved) return
        scope.launch {
            runCatching {
                repo.api.imageGenSave(
                    GenSaveRequest(id = shot.preview.id, title = prompt.trim().take(80).ifBlank { "Generated image" }),
                )
            }.onSuccess {
                shots = shots.map { if (it.preview.id == shot.preview.id) it.copy(saved = true) else it }
                LibbyMeter.bump() // adding to the library warms Libby up
                // Her wording comes from the local voice, so it shifts with the meter
                // she just moved rather than being the same line every time.
                LibbyVoice.react(LibbyVoice.Event.SAVE).let { repo.report(it.message, it.emotion) }
                onSaved()
            }.onFailure { repo.report(it.message ?: "Couldn't save the image") }
        }
    }

    Scaffold(topBar = {
        TopAppBar(
            title = { Text("Image studio") },
            navigationIcon = { IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
            } },
        )
    }) { padding ->
        val st = status
        when {
            st == null && statusError.isEmpty() -> Box(
                Modifier.padding(padding).fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) { CircularProgressIndicator() }

            st == null || !st.enabled || !st.reachable -> Column(
                Modifier.padding(padding).fillMaxSize().padding(24.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    when {
                        st == null -> statusError
                        !st.enabled -> "Image generation isn't set up yet. Add your InvokeAI or A1111 URL in the web Settings screen."
                        else -> st.error.ifBlank { "Can't reach the image generator." }
                    },
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            else -> Column(Modifier.padding(padding).fillMaxSize()) {
                // The Gallery and Civitai tabs only make sense against InvokeAI —
                // an A1111 backend keeps no gallery and installs nothing.
                val invoke = st.backend == "invokeai"
                if (invoke) {
                    TabRow(selectedTabIndex = tab) {
                        listOf("Create", "Gallery", "Civitai").forEachIndexed { i, label ->
                            Tab(selected = tab == i, onClick = { tab = i }, text = { Text(label) })
                        }
                    }
                }
                when {
                    invoke && tab == 1 -> InvokeGalleryTab(
                        repo = repo,
                        refreshKey = galleryRefresh,
                        board = board,
                        onBoardChange = { board = it },
                        onSaved = onSaved,
                    )
                    invoke && tab == 2 -> CivitaiTab(repo)
                    else -> LazyColumn(
                modifier = Modifier.weight(1f).fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(14.dp),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(
                    start = 14.dp, end = 14.dp, top = 4.dp, bottom = 24.dp,
                ),
            ) {
                // ── model picker ────────────────────────────────────────────
                item {
                    SectionLabel("Model")
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        items(st.models, key = { it.title }) { m ->
                            PickerCard(
                                label = m.modelName.ifBlank { m.title },
                                imageUrl = repo.modelThumbUrl(m.title),
                                selected = m.title == checkpoint,
                                repo = repo,
                                onClick = { applyModel(m) },
                                onEdit = if (invoke) ({ editTarget = m.title }) else null,
                            )
                        }
                    }
                }

                // ── LoRAs ───────────────────────────────────────────────────
                if (st.loras.isNotEmpty()) {
                    item {
                        SectionLabel("LoRAs")
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            items(st.loras, key = { it.name }) { lora ->
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    PickerCard(
                                        label = lora.alias.ifBlank { lora.name },
                                        imageUrl = repo.loraThumbUrl(lora.name),
                                        selected = lora.name in loraWeights,
                                        repo = repo,
                                        onEdit = if (invoke) ({ editTarget = lora.name }) else null,
                                        onClick = {
                                            loraWeights = if (lora.name in loraWeights) {
                                                loraWeights - lora.name
                                            } else {
                                                loraWeights + (lora.name to 1.0)
                                            }
                                        },
                                    )
                                    loraWeights[lora.name]?.let { w ->
                                        Slider(
                                            value = w.toFloat(),
                                            onValueChange = {
                                                loraWeights = loraWeights + (lora.name to it.toDouble())
                                            },
                                            valueRange = -2f..2f,
                                            modifier = Modifier.width(110.dp),
                                        )
                                        Text(
                                            "%.2f".format(w),
                                            style = MaterialTheme.typography.labelSmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                // ── VAE ─────────────────────────────────────────────────────
                if (st.vaes.isNotEmpty()) {
                    item {
                        SectionLabel("VAE")
                        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            FilterChip(selected = vae.isEmpty(), onClick = { vae = "" }, label = { Text("Model default") })
                            st.vaes.forEach { v ->
                                FilterChip(
                                    selected = vae == v.key,
                                    onClick = { vae = if (vae == v.key) "" else v.key },
                                    label = { Text(v.name, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                                )
                            }
                        }
                    }
                }

                // ── templates ───────────────────────────────────────────────
                if (st.templates.isNotEmpty()) {
                    item {
                        val builtInCount = st.templates.count { it.builtIn }
                        val visibleTemplates =
                            if (showBuiltInTemplates) st.templates
                            else st.templates.filter { !it.builtIn }
                        SectionLabel("Templates")
                        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            visibleTemplates.forEach { t ->
                                FilterChip(
                                    selected = templateId == t.id,
                                    onClick = { templateId = if (templateId == t.id) "" else t.id },
                                    label = { Text(t.name, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                                )
                            }
                        }
                        if (builtInCount > 0) {
                            TextButton(onClick = { showBuiltInTemplates = !showBuiltInTemplates }) {
                                Text(
                                    if (showBuiltInTemplates) "Hide built-in presets"
                                    else "Show built-in presets ($builtInCount)",
                                )
                            }
                        }
                    }
                }

                // ── characters ──────────────────────────────────────────────
                item {
                    Row(
                        Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        SectionLabel("Characters")
                        TextButton(onClick = { charDraft = GenCharacter(id = "", name = "") }) {
                            Text("＋ New")
                        }
                    }
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        items(characters, key = { it.id }) { c ->
                            PickerCard(
                                label = c.name,
                                imageUrl = if (c.hasThumb) repo.characterThumbUrl(c.id) else null,
                                selected = c.id in selectedChars,
                                repo = repo,
                                onClick = {
                                    selectedChars = if (c.id in selectedChars) selectedChars - c.id else selectedChars + c.id
                                },
                                onEdit = { charDraft = c },
                            )
                        }
                    }
                }

                // ── prompt ──────────────────────────────────────────────────
                item {
                    SectionLabel("Prompt")
                    OutlinedTextField(
                        value = prompt,
                        onValueChange = { value ->
                            prompt = value
                            val query = value.substringAfterLast(',').trim()
                            if (query.length < 2) {
                                tagSuggestions = emptyList(); tagCorrection = ""
                            } else scope.launch {
                                runCatching { repo.api.booruTags(query) }.onSuccess {
                                    tagSuggestions = it.suggestions; tagCorrection = it.correction
                                }
                            }
                        },
                        placeholder = { Text("masterpiece, best quality, …") },
                        minLines = 2,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    if (tagCorrection.isNotEmpty()) {
                        Text("Did you mean: $tagCorrection?", style = MaterialTheme.typography.labelMedium,
                            modifier = Modifier.clickable {
                                prompt = prompt.substringBeforeLast(',', "").let { if (it.isBlank()) "$tagCorrection, " else "$it, $tagCorrection, " }
                                tagSuggestions = emptyList(); tagCorrection = ""
                            }.padding(top = 4.dp))
                    }
                    if (tagSuggestions.isNotEmpty()) {
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 4.dp)) {
                            items(tagSuggestions) { tag ->
                                FilterChip(selected = false, onClick = {
                                    prompt = prompt.substringBeforeLast(',', "").let { if (it.isBlank()) "$tag, " else "$it, $tag, " }
                                    tagSuggestions = emptyList(); tagCorrection = ""
                                }, label = { Text(tag) })
                            }
                        }
                    }
                    val availableTriggers = st.loras
                        .filter { it.name in loraWeights }
                        .flatMap { it.triggerPhrases }
                        .distinct()
                    if (availableTriggers.isNotEmpty()) {
                        Text(
                            "LoRA trigger phrases",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(top = 8.dp),
                        )
                        LazyRow(
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            modifier = Modifier.padding(top = 4.dp),
                        ) {
                            items(availableTriggers) { phrase ->
                                FilterChip(
                                    selected = phrase in selectedTriggers,
                                    onClick = {
                                        selectedTriggers = if (phrase in selectedTriggers) {
                                            selectedTriggers - phrase
                                        } else {
                                            selectedTriggers + phrase
                                        }
                                    },
                                    label = { Text(phrase) },
                                )
                            }
                        }
                    }
                    OutlinedTextField(
                        value = negative,
                        onValueChange = { negative = it },
                        placeholder = { Text("Negative prompt (optional)") },
                        modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                    )
                }

                // ── resolution ──────────────────────────────────────────────
                item {
                    SectionLabel("Resolution")
                    Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        sizePresets.forEach { p ->
                            FilterChip(
                                selected = width == p.w && height == p.h,
                                onClick = { width = p.w; height = p.h },
                                label = { Text(p.label) },
                            )
                        }
                    }
                }

                // ── settings ────────────────────────────────────────────────
                item {
                    SectionLabel("Settings")
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        NumberField("Steps", steps.toString(), Modifier.weight(1f)) {
                            steps = (it.toIntOrNull() ?: 25).coerceIn(1, 80)
                        }
                        NumberField("CFG", cfg.toString(), Modifier.weight(1f)) {
                            cfg = (it.toDoubleOrNull() ?: 7.0).coerceIn(1.0, 30.0)
                        }
                        NumberField("Count", count.toString(), Modifier.weight(1f)) {
                            count = (it.toIntOrNull() ?: 1).coerceIn(1, 8)
                        }
                        NumberField("Seed", seedText, Modifier.weight(1.2f)) { seedText = it }
                    }
                    if (st.detailerAvailable) {
                        Row(
                            Modifier.horizontalScroll(rememberScrollState()).padding(top = 8.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            FilterChip(
                                selected = detailerEnabled,
                                onClick = { detailerEnabled = !detailerEnabled },
                                label = { Text("ADetailer") },
                            )
                            if (detailerEnabled) {
                                listOf(
                                    "face_yolov8n.pt" to "Face (fast)",
                                    "face_yolov8s.pt" to "Face (accurate)",
                                    "hand_yolov8n.pt" to "Hands",
                                    "person_yolov8n-seg.pt" to "Person",
                                ).forEach { (model, label) ->
                                    FilterChip(
                                        selected = detailerModel == model,
                                        onClick = { detailerModel = model },
                                        label = { Text(label) },
                                    )
                                }
                            }
                        }
                        if (detailerEnabled) {
                            OutlinedTextField(
                                value = detailerPrompt,
                                onValueChange = { detailerPrompt = it },
                                label = { Text("Detail prompt (blank reuses prompt)") },
                                modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                            )
                            OutlinedTextField(
                                value = detailerNegative,
                                onValueChange = { detailerNegative = it },
                                label = { Text("Detail negative prompt") },
                                modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                            )
                            Row(
                                Modifier.fillMaxWidth().padding(top = 8.dp),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                NumberField("Confidence", detailerConfidence.toString(), Modifier.weight(1f)) {
                                    detailerConfidence = (it.toDoubleOrNull() ?: 0.3).coerceIn(0.05, 1.0)
                                }
                                NumberField("Denoise", detailerDenoise.toString(), Modifier.weight(1f)) {
                                    detailerDenoise = (it.toDoubleOrNull() ?: 0.4).coerceIn(0.05, 1.0)
                                }
                                NumberField("Mask blur", detailerMaskBlur.toString(), Modifier.weight(1f)) {
                                    detailerMaskBlur = (it.toIntOrNull() ?: 4).coerceIn(0, 64)
                                }
                            }
                        }
                    }
                }

                item {
                    Button(
                        onClick = { generate() },
                        enabled = !generating && prompt.isNotBlank(),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        if (generating) {
                            CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                            Text("  Generating…")
                        } else {
                            Icon(Icons.Filled.AutoAwesome, contentDescription = null, Modifier.size(18.dp))
                            Text("  Generate")
                        }
                    }
                    if (error.isNotEmpty()) {
                        Text(
                            error,
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.padding(top = 6.dp),
                        )
                    }
                }

                // ── results ─────────────────────────────────────────────────
                if (shots.isNotEmpty()) {
                    item { SectionLabel("Latest creation — save what you want to keep") }
                    items(shots.chunked(2), key = { it.first().preview.id }) { pair ->
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            pair.forEach { shot ->
                                Column(Modifier.weight(1f)) {
                                    AsyncImage(
                                        model = repo.genPreviewUrl(shot.preview.id),
                                        imageLoader = repo.imageLoader,
                                        contentDescription = "Generated image",
                                        contentScale = ContentScale.Crop,
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .aspectRatio(3f / 4f)
                                            .clip(RoundedCornerShape(14.dp))
                                            .background(MaterialTheme.colorScheme.surfaceVariant)
                                            .clickable { expandedShot = shot },
                                    )
                                    Button(
                                        onClick = { save(shot) },
                                        enabled = !shot.saved,
                                        modifier = Modifier.fillMaxWidth().padding(top = 6.dp),
                                    ) {
                                        Icon(
                                            if (shot.saved) Icons.Filled.Check else Icons.Filled.Save,
                                            contentDescription = null,
                                            Modifier.size(16.dp),
                                        )
                                        Text(if (shot.saved) "  Saved" else "  Save")
                                    }
                                }
                            }
                            if (pair.size == 1) Box(Modifier.weight(1f)) {}
                        }
                    }
                    item {
                        Text(
                            "Only your latest creation shows here. Everything you generate is kept " +
                                "in the Gallery tab — browse, save, or delete earlier ones there. " +
                                "Save copies an image into the library.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
                }
            }
        }
    }

    editTarget?.let { name ->
        ModelEditDialog(
            repo = repo,
            name = name,
            onDismiss = { editTarget = null },
            onSaved = {
                // Names and recommended settings may have changed; reload the pickers.
                scope.launch {
                    runCatching { repo.api.imageGenStatus() }.onSuccess { status = it }
                }
            },
        )
    }

    charDraft?.let { draft ->
        CharacterEditorDialog(
            repo = repo,
            character = draft,
            onSaved = { charDraft = null; scope.launch { reloadCharacters() } },
            onDeleted = {
                // A deleted character can't stay selected for the next generation.
                selectedChars = selectedChars - draft.id
                charDraft = null
                scope.launch { reloadCharacters() }
            },
            onDismiss = { charDraft = null },
        )
    }

    expandedShot?.let { shot ->
        val current = shots.find { it.preview.id == shot.preview.id } ?: shot
        Dialog(onDismissRequest = { expandedShot = null }) {
            Column(
                Modifier.clip(RoundedCornerShape(16.dp)).background(Color.Black).padding(bottom = 8.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                AsyncImage(
                    model = repo.genPreviewUrl(current.preview.id),
                    imageLoader = repo.imageLoader,
                    contentDescription = "Generated image",
                    contentScale = ContentScale.Fit,
                    modifier = Modifier.fillMaxWidth(),
                )
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Button(onClick = { save(current) }, enabled = !current.saved) {
                        Icon(if (current.saved) Icons.Filled.Check else Icons.Filled.Save,
                            contentDescription = null, Modifier.size(16.dp))
                        Text(if (current.saved) "  Saved" else "  Save")
                    }
                    IconButton(onClick = { expandedShot = null }) {
                        Icon(Icons.Filled.Close, contentDescription = "Close", tint = Color.White)
                    }
                }
            }
        }
    }
}

@Composable
private fun SectionLabel(text: String) {
    Text(
        text,
        style = MaterialTheme.typography.labelLarge,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.padding(bottom = 8.dp),
    )
}

/**
 * A model/LoRA/character tile: cover art with a caption. A missing or failed
 * thumbnail renders a placeholder icon rather than an empty dark box — a model
 * without a preview used to read as a black tile. [onEdit] adds a small pencil
 * overlay that opens the record editor (InvokeAI backends only).
 */
@Composable
private fun PickerCard(
    label: String,
    imageUrl: String?,
    selected: Boolean,
    repo: Repository,
    onClick: () -> Unit,
    onEdit: (() -> Unit)? = null,
) {
    val border = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier.width(110.dp).border(2.dp, border, RoundedCornerShape(12.dp)),
        color = MaterialTheme.colorScheme.surfaceVariant,
    ) {
        Column {
            Box(Modifier.fillMaxWidth().aspectRatio(3f / 4f)) {
                if (imageUrl != null) {
                    SubcomposeAsyncImage(
                        model = imageUrl,
                        imageLoader = repo.imageLoader,
                        contentDescription = label,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize(),
                        error = { PickerPlaceholder() },
                    )
                } else {
                    PickerPlaceholder()
                }
                if (onEdit != null) {
                    IconButton(
                        onClick = onEdit,
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .size(30.dp)
                            .padding(3.dp)
                            .clip(RoundedCornerShape(13.dp))
                            .background(Color.Black.copy(alpha = 0.5f)),
                    ) {
                        Icon(
                            Icons.Filled.Edit,
                            contentDescription = "Edit $label",
                            tint = Color.White,
                            modifier = Modifier.size(14.dp),
                        )
                    }
                }
            }
            Text(
                label,
                style = MaterialTheme.typography.labelSmall,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
            )
        }
    }
}

@Composable
private fun PickerPlaceholder() {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Icon(
            Icons.Filled.Person,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.size(34.dp),
        )
    }
}

@Composable
private fun NumberField(label: String, value: String, modifier: Modifier = Modifier, onChange: (String) -> Unit) {
    OutlinedTextField(
        value = value,
        onValueChange = onChange,
        label = { Text(label) },
        singleLine = true,
        modifier = modifier,
    )
}
