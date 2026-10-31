package net.fourbakers.oppailib.data

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.ImageDecoder
import android.net.Uri
import android.os.Build
import android.util.Base64
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import kotlin.math.max
import kotlin.math.roundToInt

/**
 * The phone's Video studio: the clip being set up and the clips being made, kept
 * outside the screen as [GenSession] keeps a picture's run, so leaving the tab or the
 * app does not drop a clip that is minutes from done.
 *
 * A clip is asked for detached — the server answers at once and makes it under its job
 * — and followed by progress polls to its result, because a clip takes minutes and no
 * request should be held open that long (a proxy, or the phone changing networks, cuts
 * it, and the clip finishes for nobody). Clips run on the files picked in Settings →
 * Image generation → Video; picking files of its own is the web studio's.
 */
object VideoSession {
    /** The picture a clip starts from: a gallery picture by name, or one from the
        phone, already shrunk and encoded, with its uri to show. */
    data class Picture(val gallery: String = "", val dataUrl: String = "", val uri: String = "", val label: String = "")

    data class Run(
        val jobId: String,
        val prompt: String,
        val loop: Boolean,
        val startedAt: Long,
        val percent: Double = 0.0,
        val clip: GenClip? = null,
        val error: String = "",
        val saved: Boolean = false,
    ) {
        val done: Boolean get() = clip != null || error.isNotEmpty()
    }

    data class State(
        /** "image" or "text". */
        val from: String = "image",
        val picture: Picture? = null,
        val prompt: String = "",
        val seconds: Float = 5f,
        val aspect: String = "portrait",
        val loop: Boolean = false,
        val runs: List<Run> = emptyList(),
        /** Bumped when a clip is kept in the gallery, so the Gallery tab reloads. */
        val finished: Int = 0,
        val reading: Boolean = false,
        val error: String = "",
    )

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val _state = MutableStateFlow(State())
    val state: StateFlow<State> = _state

    fun update(fn: (State) -> State) = _state.update(fn)

    /** A gallery picture is the next clip's start (the gallery's Animate). */
    fun animate(galleryName: String) {
        _state.update { it.copy(from = "image", picture = Picture(gallery = galleryName, label = "Picture $galleryName"), error = "") }
    }

    /** A picture from the phone is the next clip's start, read off the main thread. */
    fun pickFromPhone(context: Context, uri: Uri) {
        _state.update { it.copy(reading = true, error = "") }
        scope.launch {
            runCatching { withContext(Dispatchers.IO) { startFrameDataUrl(context, uri) } }
                .onSuccess { data ->
                    _state.update { it.copy(from = "image", picture = Picture(dataUrl = data, uri = uri.toString(), label = "From the phone"), reading = false) }
                }
                .onFailure { e -> _state.update { it.copy(reading = false, error = e.message ?: "That picture couldn't be read") } }
        }
    }

    /** Whether a clip on these files can loop; see canLoop in web/src/clip-models.ts. */
    fun canLoop(models: ClipModelsBrief?): Boolean =
        !Regex("wan2\\.2|wan2_2|wan22", RegexOption.IGNORE_CASE).containsMatchIn(models?.vae ?: "")

    fun make(repo: Repository, board: String, loopable: Boolean) {
        val s = _state.value
        val fromImage = s.from == "image"
        val pic = s.picture
        if (fromImage && pic == null) {
            _state.update { it.copy(error = "Pick a picture to animate first — press Animate on one in the Gallery tab, or choose one from the phone.") }
            return
        }
        if (!fromImage && s.prompt.isBlank()) {
            _state.update { it.copy(error = "Say what the clip should show.") }
            return
        }
        val jobId = "clip-" + List(16) { "0123456789abcdef".random() }.joinToString("")
        val (width, height) = if (fromImage) 0 to 0 else clipSize(s.aspect)
        val loop = fromImage && loopable && s.loop
        val req = ClipRequest(
            jobId = jobId, from = s.from, prompt = s.prompt.trim(), detach = true,
            initImage = pic?.dataUrl?.takeIf { fromImage && pic.gallery.isEmpty() },
            initGallery = pic?.gallery?.takeIf { fromImage && it.isNotEmpty() },
            width = width, height = height, frames = clipFrames(s.seconds), fps = FPS, board = board, loop = loop,
        )
        val run = Run(jobId = jobId, prompt = req.prompt, loop = loop, startedAt = System.currentTimeMillis())
        _state.update { it.copy(runs = listOf(run) + it.runs, error = "") }
        scope.launch { follow(repo, req) }
    }

    private fun patch(jobId: String, fn: (Run) -> Run) {
        _state.update { st -> st.copy(runs = st.runs.map { if (it.jobId == jobId) fn(it) else it }) }
    }

    /** Sends the clip and follows its job to the end. A poll that fails is tried again for
        two minutes before the clip is given up on — it lands in the gallery if it finishes. */
    private suspend fun follow(repo: Repository, req: ClipRequest) {
        val id = req.jobId
        val sent = runCatching { withContext(Dispatchers.IO) { repo.api.imageGenClip(req) } }
        if (sent.isFailure) {
            patch(id) { it.copy(error = sent.exceptionOrNull()?.message ?: "The clip couldn't be started") }
            return
        }
        var lastOk = System.currentTimeMillis()
        var seen = 0L
        val until = System.currentTimeMillis() + 20 * 60_000L
        while (System.currentTimeMillis() < until) {
            delay(2500)
            val p = runCatching { withContext(Dispatchers.IO) { repo.api.imageGenProgress(id, seen) } }.getOrNull()
            if (p == null) {
                if (System.currentTimeMillis() - lastOk > 2 * 60_000L) {
                    patch(id) { it.copy(error = "Lost touch with the server while the clip was being made. If it finishes, it lands in the gallery.") }
                    return
                }
                continue
            }
            lastOk = System.currentTimeMillis()
            seen = p.seq
            if (p.done) {
                val clip = p.result?.clip
                if (clip != null) {
                    patch(id) { it.copy(clip = clip, percent = 1.0) }
                    _state.update { it.copy(finished = it.finished + 1) }
                    LibbyVoice.react(LibbyVoice.Event.GENERATE).let { repo.report(it.message, it.emotion) }
                } else {
                    patch(id) { it.copy(error = p.error.ifBlank { "ComfyUI finished without a clip." }) }
                }
                return
            }
            patch(id) { it.copy(percent = p.percent) }
        }
        patch(id) { it.copy(error = "The clip ran past twenty minutes without finishing. If it does finish, it lands in the gallery.") }
    }

    fun save(repo: Repository, run: Run) {
        val clip = run.clip ?: return
        if (run.saved) return
        scope.launch {
            val title = if (run.prompt.isNotBlank()) "Clip: ${run.prompt.take(80)}" else "Generated clip"
            runCatching {
                withContext(Dispatchers.IO) {
                    if (clip.id.isNotEmpty()) repo.api.imageGenSave(GenSaveRequest(id = clip.id, title = title, tags = listOf("clip")))
                    else repo.api.saveGalleryImage(GallerySaveRequest(name = clip.gallery, title = title, tags = listOf("clip")))
                }
            }.onSuccess {
                patch(run.jobId) { it.copy(saved = true) }
                _state.update { it.copy(finished = it.finished + 1) }
                repo.report("Saved — it's in the library now.", "happy")
            }.onFailure { repo.report(it.message ?: "Couldn't save the clip") }
        }
    }

    fun dismiss(run: Run) {
        _state.update { st -> st.copy(runs = st.runs.filterNot { it.jobId == run.jobId }) }
    }

    private const val FPS = 16

    /** The longest side a picture from the phone is sent at: Wan draws at 832, and a
        phone's 4000-pixel photo as a data URL is enough for a proxy to turn away.
        The web studio sends the same (MAX_START_SIDE in web/src/clip-shape.ts). */
    private const val MAX_START_SIDE = 1536

    /** The frame count for a length: the nearest 8n+1, as web/src/clip-shape.ts counts it. */
    fun clipFrames(seconds: Float): Int = max(1, (seconds * FPS / 8f).roundToInt()) * 8 + 1

    /** A clip from words at Wan's 832 on the long side, in sixteens. */
    private fun clipSize(aspect: String): Pair<Int, Int> = when (aspect) {
        "square" -> 832 to 832
        "landscape" -> 832 to 464
        else -> 464 to 832
    }

    private fun startFrameDataUrl(context: Context, uri: Uri): String {
        val bitmap = if (Build.VERSION.SDK_INT >= 28) {
            // ImageDecoder turns the picture the way the camera held it, and decodes it
            // already shrunk rather than whole and then scaled.
            ImageDecoder.decodeBitmap(ImageDecoder.createSource(context.contentResolver, uri)) { decoder, info, _ ->
                val long = max(info.size.width, info.size.height)
                if (long > MAX_START_SIDE) {
                    val k = MAX_START_SIDE.toFloat() / long
                    decoder.setTargetSize((info.size.width * k).roundToInt(), (info.size.height * k).roundToInt())
                }
                decoder.allocator = ImageDecoder.ALLOCATOR_SOFTWARE
            }
        } else {
            val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            context.contentResolver.openInputStream(uri)!!.use { BitmapFactory.decodeStream(it, null, bounds) }
            var sample = 1
            while (max(bounds.outWidth, bounds.outHeight) / (sample * 2) >= MAX_START_SIDE) sample *= 2
            val raw = context.contentResolver.openInputStream(uri)!!.use {
                BitmapFactory.decodeStream(it, null, BitmapFactory.Options().apply { inSampleSize = sample })
            } ?: error("That file isn't a picture")
            val long = max(raw.width, raw.height)
            if (long > MAX_START_SIDE) {
                val k = MAX_START_SIDE.toFloat() / long
                Bitmap.createScaledBitmap(raw, (raw.width * k).roundToInt(), (raw.height * k).roundToInt(), true)
            } else raw
        }
        val out = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, 92, out)
        return "data:image/jpeg;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
    }
}
