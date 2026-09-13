package net.fourbakers.oppailib.data

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * The generation in flight, and what came of the last one, kept outside the screen.
 *
 * The studio composable used to own its run: the request, the progress poll and the
 * results all lived in its coroutine scope, so backing out, the Gallery tab, another
 * app or the lock screen cancelled the poll and threw the pictures away when they
 * arrived — the generator finished for nobody. Here the run belongs to the process:
 * the screen watches it while it is open and finds it still running, or finished,
 * when it comes back.
 *
 * One run at a time, which is also what the generator can do.
 */
object GenSession {
    /** One generated preview and whether it has been saved into the library yet. */
    data class Shot(val preview: GenPreview, val saved: Boolean)

    data class State(
        val generating: Boolean = false,
        /** The run in flight, named so it can be watched and cancelled. */
        val jobId: String = "",
        val progress: GenProgress? = null,
        /** When the run started, for the elapsed time on the progress card. */
        val startedAt: Long = 0,
        /** How many images the run was asked for. */
        val count: Int = 1,
        /** The newest run's results. Earlier ones live in the generator's gallery. */
        val shots: List<Shot> = emptyList(),
        /** The prompts as the generator received them, after wildcards. */
        val positive: String = "",
        val negative: String = "",
        val error: String = "",
        /** Bumped after each finished run so the Gallery tab reloads. */
        val finished: Int = 0,
    )

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val _state = MutableStateFlow(State())
    val state: StateFlow<State> = _state
    private var poll: Job? = null

    /** Starts a run. Ignored while one is already going. */
    fun generate(repo: Repository, request: GenerateRequest, onDone: () -> Unit = {}) {
        if (_state.value.generating) return
        val id = List(24) { "0123456789abcdef".random() }.joinToString("")
        _state.update {
            it.copy(generating = true, jobId = id, progress = GenProgress(), startedAt = System.currentTimeMillis(), count = request.count, error = "")
        }
        // Watch the run while the request is in flight: a poll a second, showing the
        // preview the generator publishes every few steps. Ends with the request.
        poll?.cancel()
        poll = scope.launch {
            var seen = 0L
            delay(600)
            while (_state.value.jobId == id) {
                runCatching { repo.api.imageGenProgress(id, seen) }.onSuccess { next ->
                    if (_state.value.jobId != id) return@onSuccess
                    _state.update { cur ->
                        val image = next.image ?: if (next.seq == seen) cur.progress?.image else null
                        cur.copy(progress = next.copy(image = image, total = if (next.total > 0) next.total else cur.progress?.total ?: 0))
                    }
                    seen = next.seq
                    if (next.done) return@launch
                }
                delay(1000)
            }
        }
        scope.launch {
            runCatching { repo.api.imageGenGenerate(request.copy(jobId = id)) }
                .onSuccess { res ->
                    _state.update {
                        it.copy(
                            shots = res.images.map { p -> Shot(p, saved = false) },
                            positive = res.positive.ifBlank { request.prompt },
                            negative = res.negative.ifBlank { request.negativePrompt },
                            finished = it.finished + 1,
                        )
                    }
                    LibbyVoice.react(LibbyVoice.Event.GENERATE).let { repo.report(it.message, it.emotion) }
                    onDone()
                }
                .onFailure { err ->
                    // Stopped from the button: not a failure worth a red line.
                    val cancelled = _state.value.progress?.cancelled == true ||
                        err.message?.contains("cancelled", ignoreCase = true) == true
                    if (!cancelled) _state.update { it.copy(error = err.message ?: "Generation failed") }
                }
            poll?.cancel()
            _state.update { it.copy(generating = false, jobId = "", progress = null) }
        }
    }

    fun cancel(repo: Repository) {
        val id = _state.value.jobId
        if (id.isEmpty()) return
        _state.update { it.copy(progress = (it.progress ?: GenProgress()).copy(cancelled = true)) }
        scope.launch { runCatching { repo.api.imageGenCancel(id) } }
    }

    fun markSaved(previewId: String) {
        _state.update { cur -> cur.copy(shots = cur.shots.map { if (it.preview.id == previewId) it.copy(saved = true) else it }) }
    }

    fun clearError() {
        _state.update { it.copy(error = "") }
    }
}
