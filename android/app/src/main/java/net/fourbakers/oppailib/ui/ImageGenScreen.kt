package net.fourbakers.oppailib.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AspectRatio
import androidx.compose.material.icons.filled.Category
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.Face
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Brush
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.FaceRetouchingNatural
import androidx.compose.material.icons.filled.Landscape
import androidx.compose.material.icons.filled.Lightbulb
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Style
import androidx.compose.material.icons.filled.TravelExplore
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material.icons.filled.ViewInAr
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.AssistChip
import androidx.compose.material3.InputChip
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.TextFieldValue
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import net.fourbakers.oppailib.data.PromptComplete
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
import androidx.compose.material.icons.filled.Accessibility
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Save
import androidx.compose.material.icons.filled.Casino
import androidx.compose.material.icons.filled.SwapHoriz
import androidx.compose.material.icons.filled.Replay
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.HorizontalDivider
import net.fourbakers.oppailib.data.PromptSettings
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Slider
import androidx.compose.material3.Surface
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.snapshotFlow
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
import net.fourbakers.oppailib.data.GenDraft
import net.fourbakers.oppailib.data.GenSession
import net.fourbakers.oppailib.data.GenWildcard
import net.fourbakers.oppailib.data.DetailerRequest
import net.fourbakers.oppailib.data.LoraCategories
import net.fourbakers.oppailib.data.LoraCategoryAssign
import net.fourbakers.oppailib.data.UpscaleRequest
import net.fourbakers.oppailib.data.GenLoraPick
import net.fourbakers.oppailib.data.GenModel
import net.fourbakers.oppailib.data.GenPreview
import net.fourbakers.oppailib.data.GenSaveRequest
import net.fourbakers.oppailib.data.LibbySendRequest
import androidx.compose.material.icons.automirrored.filled.Send
import net.fourbakers.oppailib.data.LibbyMeter
import net.fourbakers.oppailib.data.LibbyVoice
import net.fourbakers.oppailib.data.GenTemplate
import net.fourbakers.oppailib.data.GenProgress
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.drop
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

/** InvokeAI's schedulers, the same list the web studio offers. */
private val schedulers = listOf(
    "" to "Default (Euler a)",
    "euler" to "Euler", "euler_k" to "Euler Karras", "euler_a" to "Euler Ancestral",
    "dpmpp_2m" to "DPM++ 2M", "dpmpp_2m_k" to "DPM++ 2M Karras",
    "dpmpp_2m_sde" to "DPM++ 2M SDE", "dpmpp_2m_sde_k" to "DPM++ 2M SDE Karras",
    "dpmpp_3m" to "DPM++ 3M", "dpmpp_3m_k" to "DPM++ 3M Karras",
    "dpmpp_sde" to "DPM++ SDE", "dpmpp_sde_k" to "DPM++ SDE Karras",
    "dpmpp_2s" to "DPM++ 2S", "dpmpp_2s_k" to "DPM++ 2S Karras",
    "ddim" to "DDIM", "ddpm" to "DDPM", "deis" to "DEIS", "deis_k" to "DEIS Karras",
    "heun" to "Heun", "heun_k" to "Heun Karras", "lms" to "LMS", "lms_k" to "LMS Karras",
    "kdpm_2" to "KDPM 2", "kdpm_2_k" to "KDPM 2 Karras", "kdpm_2_a" to "KDPM 2 Ancestral",
    "kdpm_2_a_k" to "KDPM 2 Ancestral Karras", "lcm" to "LCM", "pndm" to "PNDM",
    "tcd" to "TCD", "unipc" to "UniPC", "unipc_k" to "UniPC Karras", "er_sde" to "ER-SDE",
)

/** Sizes the generator accepts: a multiple of eight between 64 and 2048. */
/** ADetailer's hand detector: the hand pass. */
private const val HAND_DETECTOR = "hand_yolov8n.pt"

private fun snapSize(n: Int): Int = (n.coerceIn(64, 2048) / 8) * 8

/** A generated preview plus whether it has been saved into the library yet. */
private typealias ShotState = GenSession.Shot

/**
 * The phone's image-generation studio. Same contract as the web view: everything is
 * generated into the server's memory and previewed from there; only Save files an
 * image into the library. Models, LoRAs, VAEs, templates, the character and pose
 * libraries and the wildcard lists all come from the server.
 *
 * The form is a draft kept on the device (see Prefs.genDraft) and restored on the way
 * in; the run itself belongs to GenSession, so neither survives only as long as this
 * composable does. Leaving and coming back finds the prompt, the picks and the
 * pictures where they were, and a run still going is still going.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ImageGenScreen(repo: Repository, onBack: () -> Unit, onSaved: () -> Unit, topLevel: Boolean = false) {
    var status by remember { mutableStateOf<ImageGenStatus?>(null) }
    var statusError by remember { mutableStateOf("") }
    var characters by remember { mutableStateOf<List<GenCharacter>>(emptyList()) }
    var poses by remember { mutableStateOf<List<GenCharacter>>(emptyList()) }
    var wildcards by remember { mutableStateOf<List<GenWildcard>>(emptyList()) }

    // Everything the form remembers starts from the draft, when there is one.
    val draft = remember { repo.prefs.genDraft ?: GenDraft() }
    var checkpoint by remember { mutableStateOf(draft.checkpoint) }
    var vae by remember { mutableStateOf(draft.vae) }
    var templateId by remember { mutableStateOf(draft.templateId) }
    // Built-in style presets are hidden by default; the picker shows the user's own.
    var showBuiltInTemplates by remember { mutableStateOf(false) }
    var loraWeights by remember { mutableStateOf<Map<String, Double>>(draft.loraWeights) }
    // Trigger phrases the user has folded into the prompt, drawn from the selected
    // LoRAs. Kept as raw phrases; stale entries (from a since-deselected LoRA) are
    // ignored at assembly time rather than eagerly pruned.
    var selectedTriggers by remember { mutableStateOf<Set<String>>(draft.selectedTriggers.toSet()) }
    var selectedChars by remember { mutableStateOf<Set<String>>(draft.selectedChars.toSet()) }
    var selectedPoses by remember { mutableStateOf<Set<String>>(draft.selectedPoses.toSet()) }

    var prompt by remember { mutableStateOf(draft.prompt) }
    // Where the caret is in each prompt, which is what completion works from.
    var promptSel by remember { mutableStateOf(TextRange(draft.prompt.length)) }
    var negativeSel by remember { mutableStateOf(TextRange(draft.negative.length)) }
    var completions by remember { mutableStateOf<List<PromptComplete.Completion>>(emptyList()) }
    var completionToken by remember { mutableStateOf<PromptComplete.Token?>(null) }
    // Whether the open suggestions belong to the prompt (true) or the negative.
    var completionFor by remember { mutableStateOf(true) }
    var completionJob by remember { mutableStateOf<Job?>(null) }
    // The setup sheet that is up, if any.
    var sheet by remember { mutableStateOf<SetupSheet?>(null) }
    var loraFilter by remember { mutableStateOf("") }
    var negative by remember { mutableStateOf(draft.negative) }
    var width by remember { mutableStateOf(draft.width) }
    var height by remember { mutableStateOf(draft.height) }
    var steps by remember { mutableStateOf(draft.steps) }
    var cfg by remember { mutableStateOf(draft.cfg) }
    var count by remember { mutableStateOf(draft.count) }
    var seedText by remember { mutableStateOf(draft.seed) }
    var sampler by remember { mutableStateOf(draft.sampler) }
    var clipSkip by remember { mutableStateOf(draft.clipSkip) }
    // The width and height fields as typed, snapped to the generator's grid only
    // when the form is read, so "10" on the way to "1024" is not snapped to 64.
    var widthText by remember { mutableStateOf(draft.width.toString()) }
    var heightText by remember { mutableStateOf(draft.height.toString()) }
    // A long model list gets a filter box; typing narrows the row.
    var modelFilter by remember { mutableStateOf("") }
    var detailerEnabled by remember { mutableStateOf(draft.detailerEnabled) }
    // The face pass's detector; an old draft's "Hands" is the hand pass, below.
    var detailerModel by remember { mutableStateOf(draft.detailerModel.takeIf { it != HAND_DETECTOR } ?: "face_yolov8n.pt") }
    var detailerPrompt by remember { mutableStateOf(draft.detailerPrompt) }
    var detailerNegative by remember { mutableStateOf(draft.detailerNegative) }
    var detailerConfidence by remember { mutableStateOf(draft.detailerConfidence) }
    var detailerDenoise by remember { mutableStateOf(draft.detailerDenoise) }
    var detailerMaskBlur by remember { mutableStateOf(draft.detailerMaskBlur) }
    // The detailer's passes. A draft from when it was one detector reads its pass off
    // detailerModel, "Hands" among them.
    val draftHands = draft.detailerModel == HAND_DETECTOR
    var detailerFaces by remember { mutableStateOf(draft.detailerFaces ?: !draftHands) }
    var detailerHands by remember { mutableStateOf(draft.detailerHands ?: draftHands) }
    var hiresEnabled by remember { mutableStateOf(draft.hiresEnabled) }
    var hiresUpscaler by remember { mutableStateOf(draft.hiresUpscaler) }
    var hiresScale by remember { mutableStateOf(draft.hiresScale) }
    var hiresDenoise by remember { mutableStateOf(draft.hiresDenoise) }
    /** Which LoRA category the picker shows: null all, "" unsorted, else a category key. */
    var loraCategory by remember { mutableStateOf<String?>(null) }

    // The run, and the last run's pictures, from the process-wide session.
    val session by GenSession.state.collectAsState()
    val generating = session.generating
    val progress = session.progress
    val shots = session.shots
    val error = session.error
    var tab by remember { mutableStateOf(0) }
    // Bumped after each generation so the Gallery tab reloads: InvokeAI keeps its
    // own copy of everything that just finished.
    var galleryRefresh by remember { mutableStateOf(session.finished) }
    // The gallery board new generations are filed into. It is owned here but driven
    // by the Gallery tab, so whatever gallery you have open there is where the next
    // image lands — there is no second "destination" setting to keep in sync.
    var board by remember { mutableStateOf(draft.board) }
    /** Model or LoRA name whose record is being edited, or null. */
    var editTarget by remember { mutableStateOf<String?>(null) }
    // The character being created or edited (blank id = new); null = editor closed.
    var charDraft by remember { mutableStateOf<GenCharacter?>(null) }
    // The pose being created or edited, the same way.
    var poseDraft by remember { mutableStateOf<GenCharacter?>(null) }
    /** A result expanded to full screen. */
    var expandedShot by remember { mutableStateOf<ShotState?>(null) }
    val scope = rememberCoroutineScope()

    // The draft, written as the form changes. Debounced so a long prompt is not
    // serialised per keystroke, and the first emission (the restored state itself)
    // is skipped so an untouched visit writes nothing.
    val currentDraft = GenDraft(
        prompt = prompt, negative = negative, checkpoint = checkpoint, vae = vae, templateId = templateId,
        loraWeights = loraWeights, selectedTriggers = selectedTriggers.toList(),
        selectedChars = selectedChars.toList(), selectedPoses = selectedPoses.toList(),
        width = width, height = height, steps = steps, cfg = cfg, count = count, seed = seedText,
        sampler = sampler, clipSkip = clipSkip,
        detailerEnabled = detailerEnabled, detailerModel = detailerModel, detailerPrompt = detailerPrompt,
        detailerNegative = detailerNegative, detailerConfidence = detailerConfidence,
        detailerDenoise = detailerDenoise, detailerMaskBlur = detailerMaskBlur,
        detailerFaces = detailerFaces, detailerHands = detailerHands,
        hiresEnabled = hiresEnabled, hiresUpscaler = hiresUpscaler, hiresScale = hiresScale, hiresDenoise = hiresDenoise,
        board = board,
    )
    val latestDraft = androidx.compose.runtime.rememberUpdatedState(currentDraft)
    LaunchedEffect(Unit) {
        @Suppress("OPT_IN_USAGE")
        snapshotFlow { latestDraft.value }.drop(1).debounce(500).collect { d ->
            repo.prefs.genDraft = d.copy(at = System.currentTimeMillis())
        }
    }
    // Finished runs bump the gallery, whichever screen they finished on.
    LaunchedEffect(session.finished) { galleryRefresh = session.finished }

    fun setSize(w: Int, h: Int) {
        width = snapSize(w); height = snapSize(h)
        widthText = width.toString(); heightText = height.toString()
    }

    fun applyModel(m: GenModel) {
        // The last model's recommended prompts give way to this one's, as on the web
        // (web/src/model-defaults.ts).
        val prev = status?.models?.find { it.title == checkpoint }?.defaults
        checkpoint = m.title
        val next = m.defaults
        if (prev?.positive != null || next?.positive != null) {
            prompt = swapPromptDefault(prompt, prev?.positive, next?.positive, atStart = true)
        }
        if (prev?.negative != null || next?.negative != null) {
            negative = swapPromptDefault(negative, prev?.negative, next?.negative, atStart = false)
        }
        val d = next ?: return
        d.clipSkip?.takeIf { it > 0 }?.let { clipSkip = it }
        if (d.steps > 0) steps = d.steps
        if (d.cfgScale > 0) cfg = d.cfgScale
        if (d.width > 0 && d.height > 0) setSize(d.width, d.height)
        if (d.vae.isNotEmpty()) vae = d.vae
        if (d.scheduler.isNotEmpty()) sampler = d.scheduler
    }

    /**
     * A prompt picked off a Civitai showcase picture. Only what the poster kept is
     * written — a picture with no sampler leaves the sampler alone — and the
     * checkpoint is never switched: theirs is on their box. The template and
     * triggers are cleared, since the text is already the finished prompt.
     */
    fun usePrompt(p: PromptSettings) {
        prompt = p.prompt
        negative = p.negativePrompt
        if (p.sampler.isNotEmpty()) sampler = p.sampler
        if (p.steps > 0) steps = p.steps.coerceIn(1, 80)
        if (p.cfgScale > 0) cfg = p.cfgScale.coerceIn(1.0, 30.0)
        if (p.seed > 0) seedText = p.seed.toString()
        if (p.width > 0 && p.height > 0) setSize(p.width, p.height)
        templateId = ""
        selectedTriggers = emptySet()
        tab = 0
        repo.report("Prompt loaded into the studio")
    }

    suspend fun reloadCharacters() {
        runCatching { repo.api.imageGenCharacters() }.onSuccess { characters = it.characters }
    }

    suspend fun reloadPoses() {
        runCatching { repo.api.imageGenPoses() }.onSuccess { poses = it.poses }
    }

    LaunchedEffect(Unit) {
        runCatching { repo.api.imageGenStatus() }
            .onSuccess { st ->
                status = st
                // A remembered checkpoint the generator no longer lists falls back to
                // its first, the same as a first visit.
                if (checkpoint.isEmpty() || st.models.none { it.title == checkpoint }) {
                    st.models.firstOrNull()?.let { applyModel(it) }
                }
            }
            .onFailure { statusError = it.message ?: "Couldn't reach the server" }
        reloadCharacters()
        reloadPoses()
        runCatching { repo.api.imageGenWildcards() }.onSuccess { wildcards = it.wildcards }
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
        // Poses after the characters: who, then what they are doing.
        for (id in selectedPoses) {
            val p = poses.find { it.id == id } ?: continue
            if (p.prompt.isNotBlank()) parts += p.prompt.trim()
            if (p.negativePrompt.isNotBlank()) negParts += p.negativePrompt.trim()
        }
        // What the LoRAs that are on ask to keep out of the picture.
        negParts += loraNegatives(negParts.joinToString(", "),
            status?.loras.orEmpty().filter { it.name in loraWeights }.map { it.negative })
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

    /**
     * The prompt or the negative changed, or its caret moved: read the token at the
     * caret and fill the suggestions — LoRAs, wildcard lists and trigger words at once,
     * tags from the server once typing pauses. A reply overtaken by more typing is
     * dropped with the job that asked for it.
     */
    fun onTyped(isPrompt: Boolean, value: TextFieldValue) {
        if (isPrompt) { prompt = value.text; promptSel = value.selection } else { negative = value.text; negativeSel = value.selection }
        completionJob?.cancel()
        completionFor = isPrompt
        val token = if (value.selection.collapsed) PromptComplete.tokenAt(value.text, value.selection.end) else null
        completionToken = token
        if (token == null) { completions = emptyList(); return }
        val triggers = if (isPrompt) status?.loras.orEmpty().filter { it.name in loraWeights }.flatMap { it.triggerPhrases }.distinct() else emptyList()
        val local = PromptComplete.local(token, status?.loras.orEmpty(), wildcards, triggers)
        if (token.mode != PromptComplete.Mode.TAG || token.query.length < 2) { completions = local; return }
        if (local.isNotEmpty()) completions = local
        val typed = value.text.substring(token.start, token.end).trim()
        completionJob = scope.launch {
            delay(140)
            val res = runCatching { repo.api.booruTags(token.query, 8) }.getOrNull() ?: return@launch
            val merged = PromptComplete.merge(local, PromptComplete.fromServer(res))
            // The tag already typed out in full is not worth a list.
            completions = if (merged.size == 1 && merged[0].insert.equals(typed, ignoreCase = true)) emptyList() else merged
        }
    }

    /** Writes a suggestion over the token. A LoRA is switched on in the picker rather
        than written as "<lora:…>": InvokeAI does not read that, and the picker is
        where its weight and trigger words live on either backend. */
    fun accept(c: PromptComplete.Completion) {
        val token = completionToken ?: return
        val text = if (completionFor) prompt else negative
        if (token.end > text.length) return
        val (next, caret) = if (c.kind == PromptComplete.Kind.LORA) {
            val name = Regex("""^<lora:(.*):[^:]*>$""").find(c.insert)?.groupValues?.get(1).orEmpty()
            if (name.isNotEmpty() && name !in loraWeights) {
                val w = status?.loras?.find { it.name == name }?.weight?.takeIf { it != 0.0 && it.isFinite() } ?: 1.0
                loraWeights = loraWeights + (name to w)
            }
            repo.report("${c.label} is on")
            PromptComplete.apply(text, token, "")
        } else PromptComplete.apply(text, token, c.insert)
        if (completionFor) { prompt = next; promptSel = TextRange(caret) } else { negative = next; negativeSel = TextRange(caret) }
        completionJob?.cancel()
        completions = emptyList()
    }

    fun cancelGeneration() = GenSession.cancel(repo)

    fun generate() {
        if (generating || prompt.isBlank()) return
        val (pos, neg) = assembledPrompts()
        // Only the newest run stays on screen. Earlier ones aren't lost — InvokeAI
        // keeps every finished image in its gallery, and on A1111 the server keeps
        // them in its own, which is what the Gallery tab browses. The run outlives
        // this screen: see GenSession.
        GenSession.generate(
            repo,
            GenerateRequest(
                prompt = pos,
                negativePrompt = neg,
                checkpoint = checkpoint,
                vae = vae,
                sampler = sampler,
                steps = steps,
                width = snapSize(widthText.toIntOrNull() ?: width),
                height = snapSize(heightText.toIntOrNull() ?: height),
                cfgScale = cfg,
                clipSkip = clipSkip,
                seed = seedText.toLongOrNull() ?: -1,
                count = count,
                board = board,
                loras = loraWeights.map { (name, weight) -> GenLoraPick(name, weight) },
                detailer = if (status?.detailerAvailable == true && detailerEnabled && (detailerFaces || detailerHands)) {
                    val passes = buildList {
                        if (detailerFaces) add(detailerModel)
                        if (detailerHands) add(HAND_DETECTOR)
                    }
                    DetailerRequest(
                        enabled = true,
                        model = passes.first(),
                        models = passes,
                        prompt = detailerPrompt,
                        negativePrompt = detailerNegative,
                        confidence = detailerConfidence,
                        denoise = detailerDenoise,
                        maskBlur = detailerMaskBlur,
                    )
                } else null,
                upscale = status?.takeIf { hiresEnabled && it.backend != "invokeai" && it.upscalers.isNotEmpty() }?.let { st ->
                    val choices = (st.latentUpscalers + st.upscalers).distinct()
                    UpscaleRequest(
                        enabled = true,
                        upscaler = hiresUpscaler.takeIf { it in choices } ?: choices.first(),
                        scale = hiresScale,
                        denoise = hiresDenoise,
                    )
                },
            ),
        )
    }

    /** Files a LoRA under a category ("" for none): on screen at once, then for real,
        and back if the server refuses. */
    fun setLoraCategory(name: String, category: String) {
        val before = status ?: return
        if (before.loras.find { it.name == name }?.categoryKey == category) return
        status = before.copy(loras = before.loras.map { if (it.name == name) it.copy(categoryKey = category) else it })
        scope.launch {
            runCatching { repo.api.assignLoraCategory(LoraCategoryAssign(category, listOf(name))) }
                .onFailure { status = before; repo.report(it.message ?: "Couldn't move that LoRA") }
        }
    }

    fun save(shot: ShotState) {
        if (shot.saved) return
        scope.launch {
            runCatching {
                // Titled from what actually made it — after wildcards — not the reference.
                val title = session.positive.ifBlank { prompt }.trim().take(80).ifBlank { "Generated image" }
                repo.api.imageGenSave(GenSaveRequest(id = shot.preview.id, title = title))
            }.onSuccess {
                GenSession.markSaved(shot.preview.id)
                LibbyMeter.bump() // adding to the library warms Libby up
                // Her wording comes from the local voice, so it shifts with the meter
                // she just moved rather than being the same line every time.
                LibbyVoice.react(LibbyVoice.Event.SAVE).let { repo.report(it.message, it.emotion) }
                onSaved()
            }.onFailure { repo.report(it.message ?: "Couldn't save the image") }
        }
    }

    /**
     * Files a result as one of Libby's pictures and drops it into her chat as
     * something she sent. The save is the same as Save, plus her tag; the message is
     * written server-side, so Chat shows it the next time it is opened.
     */
    fun sendAsLibby(shot: ShotState) {
        scope.launch {
            runCatching {
                val title = session.positive.ifBlank { prompt }.trim().take(80).ifBlank { "Generated image" }
                val saved = repo.api.imageGenSave(GenSaveRequest(id = shot.preview.id, title = title, tags = listOf("libby")))
                repo.api.libbySend(LibbySendRequest(mediaId = saved.id))
            }.onSuccess {
                GenSession.markSaved(shot.preview.id)
                repo.report("Sent — it's in her chat now.", "happy")
                onSaved()
            }.onFailure { repo.report(it.message ?: "Couldn't send that") }
        }
    }

    Scaffold(topBar = {
        TopAppBar(
            title = { Text("Image studio") },
            // As a tab it has no back arrow; system back still leaves through onBack.
            navigationIcon = { if (!topLevel) IconButton(onClick = onBack) {
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
                // Create first; the Gallery is InvokeAI's own, or on A1111 the one the
                // server keeps of everything made in Create. The Civitai browser works
                // against either backend — an A1111 is linked by hash and, with its
                // models folder set on the server, installed into.
                val invoke = st.backend == "invokeai"
                val tabNames = buildList {
                    add("Create")
                    add("Gallery")
                    if (invoke || st.civitai) add("Civitai")
                    add("Train")
                }
                if (tabNames.size > 1) {
                    TabRow(selectedTabIndex = tab.coerceIn(0, tabNames.size - 1)) {
                        tabNames.forEachIndexed { i, label ->
                            Tab(selected = tab == i, onClick = { tab = i }, text = { Text(label) })
                        }
                    }
                }
                when (tabNames.getOrElse(tab) { "Create" }) {
                    "Gallery" -> InvokeGalleryTab(
                        repo = repo,
                        refreshKey = galleryRefresh,
                        board = board,
                        onBoardChange = { board = it },
                        onSaved = onSaved,
                        own = !invoke,
                    )
                    "Train" -> LoraTrainTab(repo, models = st.models, checkpoint = checkpoint)
                    "Civitai" -> CivitaiTab(
                        repo,
                        backend = st.backend,
                        canManage = st.manageModels,
                        onUsePrompt = { usePrompt(it) },
                    )
                    else -> Column(Modifier.weight(1f).fillMaxWidth()) {
                        // ── the rail: what to draw with, each a sheet ───────────
                        SetupRail(
                            badges = mapOf(
                                SetupSheet.LORAS to loraWeights.size,
                                SetupSheet.LOOK to selectedChars.size + selectedPoses.size,
                                SetupSheet.DETAILER to if (st.detailerAvailable && detailerEnabled) (if (detailerFaces) 1 else 0) + (if (detailerHands) 1 else 0) else 0,
                                SetupSheet.SETTINGS to if (templateId.isNotEmpty()) 1 else 0,
                            ),
                            onPick = { sheet = it },
                        )
                        // ── the recipe: what the next picture is made with ──────
                        val model = st.models.find { it.title == checkpoint }
                        RecipeStrip(
                            repo = repo,
                            backendLabel = if (invoke) "InvokeAI" else "Automatic1111",
                            model = model,
                            fallbackName = checkpoint,
                            loras = loraWeights.map { (name, w) ->
                                (st.loras.find { it.name == name }?.alias?.ifBlank { null } ?: name) to (name to w)
                            },
                            size = "$width×$height",
                            sampling = "$steps steps · CFG ${"%.1f".format(cfg).removeSuffix(".0")}",
                            seed = seedText.toLongOrNull()?.takeIf { it >= 0 },
                            onModels = { sheet = SetupSheet.MODELS },
                            onLoras = { sheet = SetupSheet.LORAS },
                            onRemoveLora = { loraWeights = loraWeights - it },
                            onSettings = { sheet = SetupSheet.SETTINGS },
                            onSeed = {
                                val locked = (seedText.toLongOrNull() ?: -1) >= 0
                                val last = shots.firstOrNull()?.preview?.seed
                                when {
                                    locked -> seedText = "-1"
                                    last != null && last >= 0 -> seedText = last.toString()
                                    else -> repo.report("Generate a picture first — its seed is the one kept")
                                }
                            },
                        )
                        if (generating) GenerationCard(repo, session, onCancel = { cancelGeneration() })

                        // ── the canvas ─────────────────────────────────────────
                        LazyColumn(
                            modifier = Modifier.weight(1f).fillMaxWidth(),
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                            contentPadding = androidx.compose.foundation.layout.PaddingValues(
                                start = 14.dp, end = 14.dp, top = 8.dp, bottom = 12.dp,
                            ),
                        ) {
                            if (shots.isEmpty() && !generating) {
                                item { EmptyCanvas(invoke) }
                            }
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
                                                    .clip(RoundedCornerShape(18.dp))
                                                    .background(MaterialTheme.colorScheme.surfaceVariant)
                                                    .clickable { expandedShot = shot },
                                            )
                                            Row(Modifier.fillMaxWidth().padding(top = 6.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                                Button(
                                                    onClick = { save(shot) },
                                                    enabled = !shot.saved,
                                                    modifier = Modifier.weight(1f),
                                                ) {
                                                    Icon(
                                                        if (shot.saved) Icons.Filled.Check else Icons.Filled.Save,
                                                        contentDescription = null,
                                                        Modifier.size(16.dp),
                                                    )
                                                    Text(if (shot.saved) "  Saved" else "  Save")
                                                }
                                                // The seed that made this one, back into the form, so a
                                                // near-miss can be nudged rather than rolled again.
                                                if (shot.preview.seed > 0) {
                                                    IconButton(onClick = { seedText = shot.preview.seed.toString(); repo.report("Seed ${shot.preview.seed} kept") }) {
                                                        Icon(Icons.Filled.Replay, contentDescription = "Reuse this seed")
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    if (pair.size == 1) Box(Modifier.weight(1f)) {}
                                }
                            }
                            if (shots.isNotEmpty()) {
                                item {
                                    Text(
                                        if (invoke) {
                                            "Only the latest run shows here; InvokeAI keeps every one in the Gallery tab. " +
                                                "Save copies a picture into the library."
                                        } else {
                                            "Only the latest run shows here; every one is kept in the Gallery tab. " +
                                                "Save moves a picture into the library."
                                        },
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            }
                        }

                        // ── the composer: what to draw ─────────────────────────
                        // Pinned under the canvas rather than at the end of a form: the
                        // prompt is what is changed between runs, and the button that
                        // matters is never a scroll away.
                        Composer(
                            prompt = TextFieldValue(prompt, promptSel.coerceTo(prompt.length)),
                            negative = TextFieldValue(negative, negativeSel.coerceTo(negative.length)),
                            onPrompt = { onTyped(true, it) },
                            onNegative = { onTyped(false, it) },
                            completions = completions,
                            completionsFor = completionFor,
                            onAccept = { accept(it) },
                            onDismissCompletions = { completions = emptyList() },
                            triggers = st.loras.filter { it.name in loraWeights }.flatMap { it.triggerPhrases }.distinct(),
                            selectedTriggers = selectedTriggers,
                            onToggleTrigger = { phrase ->
                                selectedTriggers = if (phrase in selectedTriggers) selectedTriggers - phrase else selectedTriggers + phrase
                            },
                            count = count,
                            onCount = { count = it },
                            error = error,
                            generating = generating,
                            cancelling = progress?.cancelled == true,
                            canGenerate = prompt.isNotBlank(),
                            generateLabel = if (invoke) "Invoke" else "Generate",
                            onGenerate = { completions = emptyList(); generate() },
                            onCancel = { cancelGeneration() },
                        )
                    }
                }
            }
        }
    }

    // ── the setup sheets ───────────────────────────────────────────────────────
    val st = status
    if (st != null) sheet?.let { which ->
        ModalBottomSheet(onDismissRequest = { sheet = null }) {
            Column(
                Modifier
                    .fillMaxWidth()
                    .heightIn(max = 640.dp)
                    .verticalScroll(rememberScrollState())
                    .padding(start = 16.dp, end = 16.dp, bottom = 28.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Icon(which.icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    Text(which.label, style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
                    if ((which == SetupSheet.MODELS || which == SetupSheet.LORAS) && (st.civitai || st.backend == "invokeai")) {
                        TextButton(onClick = { sheet = null; tab = if (st.backend == "invokeai") 2 else 1 }) {
                            Icon(Icons.Filled.TravelExplore, contentDescription = null, Modifier.size(18.dp))
                            Text("  Civitai")
                        }
                    }
                }
                val canEdit = st.manageModels
                when (which) {
                    SetupSheet.MODELS -> {
                        OutlinedTextField(
                            value = modelFilter,
                            onValueChange = { modelFilter = it },
                            placeholder = { Text("Search ${st.models.size} models") },
                            leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
                            singleLine = true,
                            shape = RoundedCornerShape(24.dp),
                            modifier = Modifier.fillMaxWidth(),
                        )
                        val shown = st.models.distinctBy { it.title }.filter {
                            modelFilter.isBlank() || it.modelName.contains(modelFilter, true) ||
                                it.title.contains(modelFilter, true) || it.base.contains(modelFilter, true)
                        }
                        CardGrid(shown) { m ->
                            PickerCard(
                                label = m.modelName.ifBlank { m.title },
                                imageUrl = repo.modelThumbUrl(m.title),
                                selected = m.title == checkpoint,
                                repo = repo,
                                placeholder = Icons.Filled.ViewInAr,
                                modifier = Modifier.fillMaxWidth(),
                                onClick = { applyModel(m); sheet = null },
                                onEdit = if (canEdit) ({ editTarget = m.title }) else null,
                            )
                        }
                        if (!canEdit && st.backend != "invokeai") ManageNote(st.modelsDirProblem)
                    }
                    SetupSheet.LORAS -> {
                        if (st.loras.isEmpty()) {
                            SheetNote("No LoRAs installed.")
                        } else {
                            OutlinedTextField(
                                value = loraFilter,
                                onValueChange = { loraFilter = it },
                                placeholder = { Text("Search ${st.loras.size} LoRAs") },
                                leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
                                singleLine = true,
                                shape = RoundedCornerShape(24.dp),
                                modifier = Modifier.fillMaxWidth(),
                            )
                        }
                        val catFilter = loraCategory
                        if (st.loras.isNotEmpty()) {
                            val counts = st.loras.groupingBy { LoraCategories.of(it) }.eachCount()
                            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                FilterChip(selected = catFilter == null, onClick = { loraCategory = null },
                                    label = { Text("All · ${st.loras.size}") })
                                LoraCategories.all.forEach { (key, label) ->
                                    val n = counts[key] ?: 0
                                    FilterChip(selected = catFilter == key, onClick = { loraCategory = key },
                                        leadingIcon = { Icon(loraCategoryIcon(key), contentDescription = null, Modifier.size(16.dp)) },
                                        label = { Text(if (n > 0) "$label · $n" else label) })
                                }
                                val unsorted = counts[""] ?: 0
                                if (unsorted > 0 || catFilter == "") {
                                    FilterChip(selected = catFilter == "", onClick = { loraCategory = "" },
                                        label = { Text("Unsorted · $unsorted") })
                                }
                            }
                        }
                        // Keyed by name, and Compose throws if two items share a key; an
                        // older server can name two LoRAs alike, so duplicates go first.
                        val shown = st.loras.distinctBy { it.name }.filter {
                            catFilter == null || LoraCategories.of(it) == catFilter
                        }.filter {
                            loraFilter.isBlank() || it.name.contains(loraFilter, true) || it.alias.contains(loraFilter, true) ||
                                it.triggerPhrases.any { p -> p.contains(loraFilter, true) }
                        }
                        if (shown.isEmpty() && catFilter != null && loraFilter.isBlank()) {
                            SheetNote(if (catFilter == "") "Every LoRA is in a category." else "Nothing in this category yet — use the category under a LoRA to file it here.")
                        }
                        CardGrid(shown) { lora ->
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                PickerCard(
                                    label = lora.alias.ifBlank { lora.name },
                                    imageUrl = repo.loraThumbUrl(lora.name),
                                    selected = lora.name in loraWeights,
                                    repo = repo,
                                    placeholder = Icons.Filled.Style,
                                    modifier = Modifier.fillMaxWidth(),
                                    onEdit = if (canEdit) ({ editTarget = lora.name }) else null,
                                    onClick = {
                                        loraWeights = if (lora.name in loraWeights) loraWeights - lora.name
                                        // The strength the generator recommends, when it has one.
                                        else loraWeights + (lora.name to (lora.weight.takeIf { it != 0.0 && it.isFinite() } ?: 1.0))
                                    },
                                )
                                // Which category it is in, and a menu to move it.
                                var catMenu by remember { mutableStateOf(false) }
                                Box {
                                    val filed = LoraCategories.of(lora)
                                    TextButton(onClick = { catMenu = true }, contentPadding = PaddingValues(horizontal = 6.dp)) {
                                        Icon(loraCategoryIcon(filed), contentDescription = null, Modifier.size(14.dp))
                                        Text(
                                            " " + LoraCategories.label(filed),
                                            style = MaterialTheme.typography.labelSmall,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis,
                                        )
                                    }
                                    DropdownMenu(expanded = catMenu, onDismissRequest = { catMenu = false }) {
                                        LoraCategories.all.forEach { (key, label) ->
                                            DropdownMenuItem(
                                                text = { Text(label) },
                                                leadingIcon = { Icon(loraCategoryIcon(key), contentDescription = null) },
                                                onClick = { catMenu = false; setLoraCategory(lora.name, key) },
                                            )
                                        }
                                        DropdownMenuItem(text = { Text("Unsorted") }, onClick = { catMenu = false; setLoraCategory(lora.name, "") })
                                    }
                                }
                                loraWeights[lora.name]?.let { w ->
                                    Slider(
                                        value = w.toFloat(),
                                        onValueChange = { loraWeights = loraWeights + (lora.name to (it * 20).toInt() / 20.0) },
                                        valueRange = -2f..2f,
                                    )
                                    Text("%.2f".format(w), style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        }
                    }
                    SetupSheet.LOOK -> {
                        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                            SectionLabel("Characters")
                            Box(Modifier.weight(1f))
                            TextButton(onClick = { charDraft = GenCharacter(id = "", name = "") }) { Text("＋ New") }
                        }
                        if (characters.isEmpty()) SheetNote("Save the people you keep drawing: a prompt fragment and a portrait, added with a tap.")
                        CardGrid(characters) { c ->
                            PickerCard(
                                label = c.name,
                                imageUrl = if (c.hasThumb) repo.characterThumbUrl(c.id) else null,
                                selected = c.id in selectedChars,
                                repo = repo,
                                modifier = Modifier.fillMaxWidth(),
                                onClick = { selectedChars = if (c.id in selectedChars) selectedChars - c.id else selectedChars + c.id },
                                onEdit = { charDraft = c },
                            )
                        }
                        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                            SectionLabel("Poses")
                            Box(Modifier.weight(1f))
                            TextButton(onClick = { poseDraft = GenCharacter(id = "", name = "") }) { Text("＋ New") }
                        }
                        if (poses.isEmpty()) SheetNote("Save the poses you keep asking for — a prompt fragment with a picture, added to the next generation with a tap.")
                        CardGrid(poses) { p ->
                            PickerCard(
                                label = p.name,
                                imageUrl = if (p.hasThumb) repo.poseThumbUrl(p.id) else null,
                                selected = p.id in selectedPoses,
                                repo = repo,
                                placeholder = Icons.Filled.Accessibility,
                                modifier = Modifier.fillMaxWidth(),
                                onClick = { selectedPoses = if (p.id in selectedPoses) selectedPoses - p.id else selectedPoses + p.id },
                                onEdit = { poseDraft = p },
                            )
                        }
                    }
                    SetupSheet.WILDCARDS -> {
                        SheetNote("Tap a list to put it in the prompt — each generate draws a random line from it. Typing __ in the prompt completes them too.")
                        if (wildcards.isEmpty()) SheetNote("No wildcard lists yet; make them on the web studio.")
                        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            wildcards.forEach { w ->
                                val ref = "__${w.name}__"
                                FilterChip(
                                    selected = ref in prompt,
                                    onClick = {
                                        val base = prompt.trimEnd().trimEnd(',')
                                        prompt = if (base.isBlank()) "$ref, " else "$base, $ref, "
                                        promptSel = TextRange(prompt.length)
                                    },
                                    label = { Text(ref) },
                                )
                            }
                        }
                    }
                    SetupSheet.DETAILER -> {
                        if (!st.detailerAvailable) {
                            SheetNote(if (st.backend == "invokeai") "InvokeAI has no ADetailer node installed." else
                                "The face and hand pass shows up here once the ADetailer extension is installed in Automatic1111 — Extensions → Available → ADetailer, then restart it.")
                        } else {
                            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                FilterChip(selected = detailerEnabled, onClick = { detailerEnabled = !detailerEnabled }, label = { Text("ADetailer") })
                                if (detailerEnabled) {
                                    // A pass each, run in order: the faces, then the hands.
                                    FilterChip(selected = detailerFaces, onClick = { detailerFaces = !detailerFaces }, label = { Text("Faces") })
                                    FilterChip(selected = detailerHands, onClick = { detailerHands = !detailerHands }, label = { Text("Hands") })
                                }
                            }
                            if (detailerEnabled && detailerFaces) {
                                Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    listOf(
                                        "face_yolov8n.pt" to "Face (fast)",
                                        "face_yolov8s.pt" to "Face (accurate)",
                                        "mediapipe_face_full" to "MediaPipe face",
                                        "person_yolov8n-seg.pt" to "Whole person",
                                    ).forEach { (m, label) ->
                                        FilterChip(selected = detailerModel == m, onClick = { detailerModel = m }, label = { Text(label) })
                                    }
                                }
                            }
                            if (detailerEnabled && !detailerFaces && !detailerHands) {
                                SheetNote("Neither pass is on, so runs skip the detailer.")
                            }
                            if (detailerEnabled) {
                                OutlinedTextField(value = detailerPrompt, onValueChange = { detailerPrompt = it },
                                    label = { Text("Detail prompt (blank reuses prompt)") }, modifier = Modifier.fillMaxWidth())
                                OutlinedTextField(value = detailerNegative, onValueChange = { detailerNegative = it },
                                    label = { Text("Detail negative prompt") }, modifier = Modifier.fillMaxWidth())
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
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
                    SetupSheet.SETTINGS -> {
                        SectionLabel("Size")
                        SizePreview(width, height)
                        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            sizePresets.forEach { p ->
                                FilterChip(selected = width == p.w && height == p.h, onClick = { setSize(p.w, p.h) }, label = { Text(p.label) })
                            }
                        }
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                            NumberField("Width", widthText, Modifier.weight(1f)) { v ->
                                widthText = v
                                v.toIntOrNull()?.let { if (it >= 64) width = snapSize(it) }
                            }
                            IconButton(onClick = { setSize(height, width) }) {
                                Icon(Icons.Filled.SwapHoriz, contentDescription = "Swap width and height")
                            }
                            NumberField("Height", heightText, Modifier.weight(1f)) { v ->
                                heightText = v
                                v.toIntOrNull()?.let { if (it >= 64) height = snapSize(it) }
                            }
                        }
                        SectionLabel("Sampling")
                        // Sliders rather than number boxes: a phone keyboard over a form
                        // that then snaps "2" to 25 before the "5" arrives was the old way.
                        SliderRow("Steps", steps.toString(), steps.toFloat(), 1f..80f, 79) { steps = it.toInt() }
                        SliderRow("CFG", "%.1f".format(cfg), cfg.toFloat(), 1f..30f, 57) { cfg = (it * 2).toInt() / 2.0 }
                        if (st.backend == "invokeai") {
                            SliderRow("CLIP skip", clipSkip.toString(), clipSkip.toFloat(), 0f..12f, 11) { clipSkip = it.toInt() }
                        }
                        var samplerOpen by remember { mutableStateOf(false) }
                        ExposedDropdownMenuBox(expanded = samplerOpen, onExpandedChange = { samplerOpen = it }) {
                            OutlinedTextField(
                                value = schedulers.firstOrNull { it.first == sampler }?.second ?: sampler.ifBlank { schedulers[0].second },
                                onValueChange = {},
                                readOnly = true,
                                label = { Text("Scheduler") },
                                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = samplerOpen) },
                                modifier = Modifier.fillMaxWidth().menuAnchor(),
                            )
                            ExposedDropdownMenu(expanded = samplerOpen, onDismissRequest = { samplerOpen = false }) {
                                schedulers.forEach { (id, label) ->
                                    DropdownMenuItem(text = { Text(label) }, onClick = { sampler = id; samplerOpen = false })
                                }
                            }
                        }
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                            NumberField("Seed (-1 = random)", seedText, Modifier.weight(1f)) { seedText = it }
                            IconButton(onClick = { seedText = "-1" }, enabled = seedText != "-1") {
                                Icon(Icons.Filled.Casino, contentDescription = "Random seed")
                            }
                        }
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("More per run", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            listOf(6, 8).forEach { n -> FilterChip(selected = count == n, onClick = { count = n }, label = { Text(n.toString()) }) }
                        }
                        if (st.vaes.isNotEmpty()) {
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
                        if (st.backend != "invokeai" && st.upscalers.isNotEmpty()) {
                            SectionLabel("Upscale")
                            FilterChip(selected = hiresEnabled, onClick = { hiresEnabled = !hiresEnabled },
                                label = { Text("Hires fix — draw it again bigger") })
                            if (hiresEnabled) {
                                val choices = (st.latentUpscalers + st.upscalers).distinct()
                                val picked = hiresUpscaler.takeIf { it in choices } ?: choices.first()
                                Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    choices.forEach { u ->
                                        FilterChip(selected = picked == u, onClick = { hiresUpscaler = u }, label = { Text(u) })
                                    }
                                }
                                SliderRow("Scale", "%.2f×".format(hiresScale), hiresScale.toFloat(), 1f..4f, 11) {
                                    hiresScale = (it * 4).toInt() / 4.0
                                }
                                SliderRow("Denoise", "%.2f".format(hiresDenoise), hiresDenoise.toFloat(), 0.05f..1f, 18) {
                                    hiresDenoise = (it * 20).toInt() / 20.0
                                }
                                // The server holds the larger side to 4096, as the web says too.
                                val w = snapSize(widthText.toIntOrNull() ?: width)
                                val h = snapSize(heightText.toIntOrNull() ?: height)
                                val f = minOf(hiresScale, 4096.0 / maxOf(w, h))
                                SheetNote("Drawn at ${w}×${h}, then again at ${(w * f).toInt()}×${(h * f).toInt()}.")
                            }
                        }
                        SectionLabel("Saved prompt styles")
                        val builtInCount = st.templates.count { it.builtIn }
                        val visible = if (showBuiltInTemplates) st.templates else st.templates.filter { !it.builtIn }
                        if (visible.isEmpty()) {
                            SheetNote(
                                if (st.templates.isNotEmpty()) "No styles you made — built-in presets are hidden."
                                else if (st.backend == "invokeai") "No style presets in InvokeAI yet."
                                else "No styles saved in Automatic1111 yet; save one from its Styles menu.",
                            )
                        }
                        visible.forEach { t ->
                            Surface(
                                onClick = { templateId = if (templateId == t.id) "" else t.id },
                                shape = RoundedCornerShape(14.dp),
                                color = if (templateId == t.id) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant,
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Column(Modifier.padding(horizontal = 14.dp, vertical = 10.dp)) {
                                    Text(t.name, style = MaterialTheme.typography.titleSmall)
                                    if (t.prompt.isNotBlank()) Text(t.prompt, style = MaterialTheme.typography.bodySmall,
                                        maxLines = 1, overflow = TextOverflow.Ellipsis,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        }
                        if (builtInCount > 0) {
                            TextButton(onClick = { showBuiltInTemplates = !showBuiltInTemplates }) {
                                Text(if (showBuiltInTemplates) "Hide built-in presets" else "Show built-in presets ($builtInCount)")
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
            onDeleted = { key ->
                // Whatever pointed at it is cleared before the pickers reload, so a
                // generate in between does not name a model InvokeAI no longer has.
                if (checkpoint == key) checkpoint = ""
                loraWeights = loraWeights - name - key
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

    poseDraft?.let { draft ->
        CharacterEditorDialog(
            repo = repo,
            character = draft,
            pose = true,
            onSaved = { poseDraft = null; scope.launch { reloadPoses() } },
            onDeleted = {
                selectedPoses = selectedPoses - draft.id
                poseDraft = null
                scope.launch { reloadPoses() }
            },
            onDismiss = { poseDraft = null },
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
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                    Button(onClick = { save(current) }, enabled = !current.saved) {
                        Icon(if (current.saved) Icons.Filled.Check else Icons.Filled.Save,
                            contentDescription = null, Modifier.size(16.dp))
                        Text(if (current.saved) "  Saved" else "  Save")
                    }
                    OutlinedButton(onClick = { sendAsLibby(current) }) {
                        Icon(Icons.AutoMirrored.Filled.Send, contentDescription = null, Modifier.size(16.dp))
                        Text("  As Libby")
                    }
                    if (current.preview.seed > 0) {
                        IconButton(onClick = { seedText = current.preview.seed.toString(); expandedShot = null; repo.report("Seed ${current.preview.seed} set") }) {
                            Icon(Icons.Filled.Replay, contentDescription = "Reuse this seed", tint = Color.White)
                        }
                    }
                    IconButton(onClick = { expandedShot = null }) {
                        Icon(Icons.Filled.Close, contentDescription = "Close", tint = Color.White)
                    }
                }
            }
        }
    }
}

/**
 * The run in progress, pinned above the form so it is in view wherever the form is
 * scrolled to: the picture forming as the generator publishes it, which image of the
 * batch and which step, how long it has been, and a way to stop it. Steps arrive
 * only from a generator that reports them; a run with none shows the clock instead.
 */
@Composable
private fun GenerationCard(repo: Repository, session: GenSession.State, onCancel: () -> Unit) {
    val p = session.progress
    val total = p?.total ?: 0
    var now by remember { mutableStateOf(System.currentTimeMillis()) }
    LaunchedEffect(session.jobId) {
        while (true) { now = System.currentTimeMillis(); kotlinx.coroutines.delay(1000) }
    }
    val elapsed = ((now - session.startedAt) / 1000).coerceAtLeast(0)
    Card(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 8.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
    ) {
        Row(Modifier.padding(10.dp), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier.width(72.dp).aspectRatio(3f / 4f).clip(RoundedCornerShape(10.dp)).background(MaterialTheme.colorScheme.surface),
                contentAlignment = Alignment.Center,
            ) {
                val preview = p?.image
                if (preview != null) {
                    AsyncImage(
                        model = preview,
                        imageLoader = repo.imageLoader,
                        contentDescription = "The picture so far",
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize(),
                    )
                } else {
                    CircularProgressIndicator(Modifier.size(22.dp), strokeWidth = 2.dp)
                }
            }
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    when {
                        p?.cancelled == true -> "Stopping…"
                        total > 0 -> "Step ${p?.step ?: 0} of $total"
                        else -> "Generating…"
                    },
                    style = MaterialTheme.typography.titleSmall,
                )
                Text(
                    buildString {
                        if (session.count > 1) append("Image ${(p?.index ?: 0) + 1} of ${session.count} · ")
                        append("${elapsed}s")
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                if (total > 0) {
                    LinearProgressIndicator(
                        progress = { (p?.percent ?: 0.0).toFloat().coerceIn(0f, 1f) },
                        modifier = Modifier.fillMaxWidth(),
                    )
                } else {
                    LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
                }
            }
            IconButton(onClick = onCancel, enabled = p?.cancelled != true) {
                Icon(Icons.Filled.Close, contentDescription = "Cancel")
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
 * overlay that opens the record editor (wherever the server can manage models).
 */
@Composable
private fun PickerCard(
    label: String,
    imageUrl: String?,
    selected: Boolean,
    repo: Repository,
    onClick: () -> Unit,
    onEdit: (() -> Unit)? = null,
    placeholder: androidx.compose.ui.graphics.vector.ImageVector = Icons.Filled.Person,
    modifier: Modifier = Modifier.width(110.dp),
) {
    val border = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(16.dp),
        modifier = modifier.border(if (selected) 2.dp else 1.dp, border, RoundedCornerShape(16.dp)),
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
                        error = { PickerPlaceholder(placeholder) },
                    )
                } else {
                    PickerPlaceholder(placeholder)
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
private fun PickerPlaceholder(icon: androidx.compose.ui.graphics.vector.ImageVector = Icons.Filled.Person) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Icon(
            icon,
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
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
        modifier = modifier,
    )
}

/** A labelled slider with its value beside it — the phone's number box. */
@Composable
private fun SliderRow(
    label: String,
    shown: String,
    value: Float,
    range: ClosedFloatingPointRange<Float>,
    steps: Int,
    onChange: (Float) -> Unit,
) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.width(64.dp))
        Slider(value = value, onValueChange = onChange, valueRange = range, steps = steps, modifier = Modifier.weight(1f))
        Text(shown, style = MaterialTheme.typography.labelMedium, modifier = Modifier.width(36.dp))
    }
}

/** What a setup sheet holds, in the order the rail lists them. */
private enum class SetupSheet(val label: String, val icon: androidx.compose.ui.graphics.vector.ImageVector) {
    MODELS("Models", Icons.Filled.ViewInAr),
    LORAS("LoRAs", Icons.Filled.Style),
    LOOK("Look", Icons.Filled.Face),
    WILDCARDS("Wildcards", Icons.Filled.Category),
    // Its own sheet, as on the web's rail: it was the foot of Settings. Saved prompt
    // styles went the other way, from a sheet of their own into Settings.
    DETAILER("ADetailer", Icons.Filled.FaceRetouchingNatural),
    SETTINGS("Settings", Icons.Filled.Tune),
}

/** Each LoRA category's icon, the web's in Material's names. */
private fun loraCategoryIcon(key: String): androidx.compose.ui.graphics.vector.ImageVector = when (key) {
    "character" -> Icons.Filled.Person
    "style" -> Icons.Filled.Brush
    "concept" -> Icons.Filled.Lightbulb
    "tools" -> Icons.Filled.Build
    "poses" -> Icons.Filled.Accessibility
    "background" -> Icons.Filled.Landscape
    "etc" -> Icons.Filled.MoreHoriz
    else -> Icons.Filled.Category
}

private fun TextRange.coerceTo(length: Int) = TextRange(start.coerceIn(0, length), end.coerceIn(0, length))

/**
 * The row of setup sheets over the canvas. It used to be the form itself — model,
 * LoRAs, VAE, templates, characters, poses, the prompt, size and settings in one long
 * scroll, with the picture at the bottom of it. Now each is a sheet that comes up
 * over the canvas and goes away again, and the count on a sheet says what is on in it.
 */
@Composable
private fun SetupRail(badges: Map<SetupSheet, Int>, onPick: (SetupSheet) -> Unit) {
    Row(
        Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(horizontal = 8.dp, vertical = 6.dp),
        horizontalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        SetupSheet.entries.forEach { s ->
            val badge = badges[s] ?: 0
            Column(
                Modifier
                    .clip(RoundedCornerShape(16.dp))
                    .clickable { onPick(s) }
                    .padding(horizontal = 6.dp, vertical = 4.dp)
                    .width(58.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                Box {
                    Box(
                        Modifier
                            .size(width = 48.dp, height = 30.dp)
                            .clip(RoundedCornerShape(15.dp))
                            .background(
                                if (badge > 0) MaterialTheme.colorScheme.primaryContainer
                                else MaterialTheme.colorScheme.surfaceVariant,
                            ),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            s.icon,
                            contentDescription = null,
                            tint = if (badge > 0) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(20.dp),
                        )
                    }
                    if (badge > 0) {
                        Text(
                            badge.toString(),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onPrimary,
                            modifier = Modifier
                                .align(Alignment.TopEnd)
                                .clip(RoundedCornerShape(8.dp))
                                .background(MaterialTheme.colorScheme.primary)
                                .padding(horizontal = 5.dp),
                        )
                    }
                }
                Text(s.label, style = MaterialTheme.typography.labelSmall, maxLines = 1,
                    color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

/**
 * What the next picture is made with: the model with its cover, the LoRAs that are on
 * (each with its weight, and a cross to take it off), the size, steps and CFG, and
 * whether the seed is kept. Each one opens where it is changed.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun RecipeStrip(
    repo: Repository,
    backendLabel: String,
    model: GenModel?,
    fallbackName: String,
    loras: List<Pair<String, Pair<String, Double>>>,
    size: String,
    sampling: String,
    seed: Long?,
    onModels: () -> Unit,
    onLoras: () -> Unit,
    onRemoveLora: (String) -> Unit,
    onSettings: () -> Unit,
    onSeed: () -> Unit,
) {
    Row(
        Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(horizontal = 12.dp, vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Surface(
            onClick = onModels,
            shape = RoundedCornerShape(16.dp),
            color = MaterialTheme.colorScheme.surfaceVariant,
            border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
        ) {
            Row(Modifier.padding(5.dp).padding(end = 8.dp), verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Box(Modifier.size(42.dp).clip(RoundedCornerShape(11.dp)).background(MaterialTheme.colorScheme.surface),
                    contentAlignment = Alignment.Center) {
                    if (model != null) {
                        SubcomposeAsyncImage(
                            model = repo.modelThumbUrl(model.title),
                            imageLoader = repo.imageLoader,
                            contentDescription = null,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize(),
                            error = { Icon(Icons.Filled.ViewInAr, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant) },
                        )
                    } else {
                        Icon(Icons.Filled.ViewInAr, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                Column {
                    Text(backendLabel.uppercase() + (model?.base?.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""),
                        style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
                    Text(model?.modelName?.ifBlank { model.title } ?: fallbackName.ifBlank { "Choose a model" },
                        style = MaterialTheme.typography.titleSmall, maxLines = 1, overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.widthIn(max = 190.dp))
                }
                Icon(Icons.Filled.ExpandMore, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        loras.forEach { (label, pick) ->
            val (name, weight) = pick
            InputChip(
                selected = true,
                onClick = onLoras,
                label = { Text("$label  ${"%.2f".format(weight).trimEnd('0').trimEnd('.')}") },
                leadingIcon = { Icon(Icons.Filled.Style, contentDescription = null, Modifier.size(16.dp)) },
                trailingIcon = {
                    Icon(Icons.Filled.Close, contentDescription = "Take $label off",
                        modifier = Modifier.size(18.dp).clip(RoundedCornerShape(9.dp)).clickable { onRemoveLora(name) })
                },
            )
        }
        if (loras.isEmpty()) {
            AssistChip(onClick = onLoras, label = { Text("LoRA") },
                leadingIcon = { Icon(Icons.Filled.Add, contentDescription = null, Modifier.size(16.dp)) })
        }
        AssistChip(onClick = onSettings, label = { Text(size) },
            leadingIcon = { Icon(Icons.Filled.AspectRatio, contentDescription = null, Modifier.size(16.dp)) })
        AssistChip(onClick = onSettings, label = { Text(sampling) },
            leadingIcon = { Icon(Icons.Filled.Tune, contentDescription = null, Modifier.size(16.dp)) })
        FilterChip(
            selected = seed != null,
            onClick = onSeed,
            label = { Text(seed?.toString() ?: "Random seed") },
            leadingIcon = { Icon(if (seed != null) Icons.Filled.Lock else Icons.Filled.Casino, contentDescription = null, Modifier.size(16.dp)) },
        )
    }
}

@Composable
private fun EmptyCanvas(invoke: Boolean) {
    Column(
        Modifier
            .fillMaxWidth()
            .padding(top = 24.dp)
            .clip(RoundedCornerShape(24.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
            .padding(horizontal = 24.dp, vertical = 40.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Icon(Icons.Filled.Image, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(40.dp))
        Text("Your canvas", style = MaterialTheme.typography.titleMedium)
        Text(
            "Pick a model from the row above, write a prompt below and press ${if (invoke) "Invoke" else "Generate"}. " +
                "Tags complete as you type.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
        )
    }
}

/**
 * The prompt, its suggestions, the LoRAs' trigger words, how many pictures, and the
 * button. The suggestions are one strip over the field they belong to, the way a
 * keyboard's are. They were a list of six rows there, which with the keyboard up was
 * taller than the room left and pushed the field — and what was being typed — off the
 * bottom of the screen.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun Composer(
    prompt: TextFieldValue,
    negative: TextFieldValue,
    onPrompt: (TextFieldValue) -> Unit,
    onNegative: (TextFieldValue) -> Unit,
    completions: List<PromptComplete.Completion>,
    completionsFor: Boolean,
    onAccept: (PromptComplete.Completion) -> Unit,
    onDismissCompletions: () -> Unit,
    triggers: List<String>,
    selectedTriggers: Set<String>,
    onToggleTrigger: (String) -> Unit,
    count: Int,
    onCount: (Int) -> Unit,
    error: String,
    generating: Boolean,
    cancelling: Boolean,
    canGenerate: Boolean,
    generateLabel: String,
    onGenerate: () -> Unit,
    onCancel: () -> Unit,
) {
    var negativeOpen by remember { mutableStateOf(negative.text.isNotBlank()) }
    Surface(
        shape = RoundedCornerShape(topStart = 26.dp, topEnd = 26.dp),
        color = MaterialTheme.colorScheme.surfaceContainer,
        shadowElevation = 10.dp,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(
            Modifier.fillMaxWidth().imePadding().padding(horizontal = 12.dp, vertical = 10.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            if (error.isNotEmpty()) {
                Text(
                    error,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.clickable { GenSession.clearError() },
                )
            }
            if (completions.isNotEmpty() && completionsFor) CompletionList(completions, onAccept, onDismissCompletions)
            OutlinedTextField(
                value = prompt,
                onValueChange = onPrompt,
                placeholder = { Text("Describe it — tags complete as you type, and so do <lora: and __") },
                minLines = 2,
                maxLines = 5,
                shape = RoundedCornerShape(18.dp),
                modifier = Modifier.fillMaxWidth(),
            )
            if (negativeOpen) {
                if (completions.isNotEmpty() && !completionsFor) CompletionList(completions, onAccept, onDismissCompletions)
                OutlinedTextField(
                    value = negative,
                    onValueChange = onNegative,
                    label = { Text("Negative") },
                    maxLines = 3,
                    shape = RoundedCornerShape(18.dp),
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            if (triggers.isNotEmpty()) {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    items(triggers) { phrase ->
                        FilterChip(selected = phrase in selectedTriggers, onClick = { onToggleTrigger(phrase) }, label = { Text(phrase) })
                    }
                }
            }
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(selected = negativeOpen, onClick = { negativeOpen = !negativeOpen }, label = { Text("Negative") })
                SingleChoiceSegmentedButtonRow(Modifier.width(150.dp)) {
                    (1..4).forEach { n ->
                        SegmentedButton(
                            selected = count == n,
                            onClick = { onCount(n) },
                            shape = SegmentedButtonDefaults.itemShape(index = n - 1, count = 4),
                            icon = {},
                        ) { Text(n.toString()) }
                    }
                }
                Box(Modifier.weight(1f))
                if (generating) {
                    OutlinedButton(onClick = onCancel, enabled = !cancelling, modifier = Modifier.height(48.dp)) {
                        CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp)
                        Text(if (cancelling) "  Stopping…" else "  Cancel")
                    }
                } else {
                    Button(onClick = onGenerate, enabled = canGenerate, modifier = Modifier.height(48.dp)) {
                        Icon(Icons.Filled.AutoAwesome, contentDescription = null, Modifier.size(18.dp))
                        Text("  $generateLabel")
                    }
                }
            }
        }
    }
}

/** Danbooru's colours for its categories, so a character or an artist reads as one first. */
private fun categoryColor(c: PromptComplete.Completion): Color = when (c.kind) {
    PromptComplete.Kind.LORA -> Color(0xFFFFB68A)
    PromptComplete.Kind.WILDCARD -> Color(0xFF78D9EC)
    PromptComplete.Kind.TRIGGER -> Color(0xFFFDD663)
    PromptComplete.Kind.TAG -> when (c.category) {
        1 -> Color(0xFFF28B82)
        3 -> Color(0xFFC58AF9)
        4 -> Color(0xFF81C995)
        5 -> Color(0xFFFDD663)
        100 -> Color(0xFFFFB68A)
        else -> Color(0xFF8AB4F8)
    }
}

/** The suggestions, as one row that scrolls sideways: never taller than a chip, so
    the field under it stays where the keyboard left it. */
@Composable
private fun CompletionList(
    suggestions: List<PromptComplete.Completion>,
    onAccept: (PromptComplete.Completion) -> Unit,
    onDismiss: () -> Unit,
) {
    Row(Modifier.fillMaxWidth().height(40.dp), verticalAlignment = Alignment.CenterVertically) {
        LazyRow(
            Modifier.weight(1f),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            contentPadding = PaddingValues(end = 6.dp),
        ) {
            items(suggestions.distinctBy { it.kind.name + it.insert }.take(12), key = { it.kind.name + it.insert }) { c ->
                Surface(
                    onClick = { onAccept(c) },
                    shape = RoundedCornerShape(20.dp),
                    color = MaterialTheme.colorScheme.surfaceContainerHighest,
                ) {
                    Row(
                        Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        Box(Modifier.size(8.dp).clip(RoundedCornerShape(if (c.kind == PromptComplete.Kind.TAG) 4.dp else 2.dp)).background(categoryColor(c)))
                        Text(c.label, style = MaterialTheme.typography.bodyMedium, maxLines = 1,
                            modifier = Modifier.widthIn(max = 220.dp), overflow = TextOverflow.Ellipsis)
                        val n = PromptComplete.formatCount(c.count)
                        if (n.isNotEmpty()) Text(n, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
        IconButton(onClick = onDismiss, modifier = Modifier.size(36.dp)) {
            Icon(Icons.Filled.Close, contentDescription = "Hide suggestions", Modifier.size(18.dp))
        }
    }
}

/**
 * Cover cards, three to a row. Not a lazy grid: it lives in a sheet that scrolls as a
 * whole. Capped, so a box with five hundred LoRAs does not load five hundred covers
 * to show the first twelve — the search above narrows it instead.
 */
@Composable
private fun <T> CardGrid(items: List<T>, columns: Int = 3, cap: Int = 60, cell: @Composable (T) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        items.take(cap).chunked(columns).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                row.forEach { Box(Modifier.weight(1f)) { cell(it) } }
                repeat(columns - row.size) { Box(Modifier.weight(1f)) }
            }
        }
        if (items.size > cap) SheetNote("Showing $cap of ${items.size} — search to find the rest.")
    }
}

@Composable
private fun SheetNote(text: String) {
    Text(text, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
}

/** Why there are no edit pencils on an Automatic1111's models. */
@Composable
private fun ManageNote(problem: String) {
    Surface(shape = RoundedCornerShape(14.dp), color = MaterialTheme.colorScheme.secondaryContainer) {
        Text(
            if (problem.isNotBlank()) "$problem. Until then Automatic1111's models are listed and linked to Civitai, but can't be installed, edited or deleted from here."
            else "Automatic1111 has no API to install, edit or delete models, so OppaiLib does it in its models folder. Map that folder into the OppaiLib container at /a1111-models (or set where it is in the web Settings → Image generation) and those work here too, Civitai installs included.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSecondaryContainer,
            modifier = Modifier.padding(12.dp),
        )
    }
}

/**
 * The size, drawn: a frame to scale against the largest SDXL side (1280), so two
 * portrait sizes look like one shape at two sizes rather than two pairs of numbers.
 * The web's is size-preview.ts.
 */
@Composable
private fun SizePreview(width: Int, height: Int) {
    val box = 96f
    val scale = box / maxOf(1280, width, height)
    var a = width
    var b = height
    while (b != 0) { val t = a % b; a = b; b = t }
    val g = maxOf(a, 1)
    val ratio = if (width / g <= 32 && height / g <= 32) "${width / g}:${height / g}"
        else if (width >= height) "%.2f:1".format(width.toFloat() / height) else "1:%.2f".format(height.toFloat() / width)
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
        Box(Modifier.size(box.dp), contentAlignment = Alignment.Center) {
            Box(
                Modifier
                    .size(width = (width * scale).dp, height = (height * scale).dp)
                    .clip(RoundedCornerShape(4.dp))
                    .background(MaterialTheme.colorScheme.primaryContainer)
                    .border(2.dp, MaterialTheme.colorScheme.primary, RoundedCornerShape(4.dp)),
            )
        }
        Column {
            Text("$width × $height", style = MaterialTheme.typography.titleMedium)
            Text(
                "$ratio · ${"%.1f".format(width * height / 1_000_000.0)} MP · " +
                    if (width == height) "square" else if (width > height) "landscape" else "portrait",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}
