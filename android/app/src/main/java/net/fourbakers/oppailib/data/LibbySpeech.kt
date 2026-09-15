package net.fourbakers.oppailib.data

import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import retrofit2.HttpException
import java.io.File
import java.util.Locale
import java.util.concurrent.atomic.AtomicLong
import kotlin.coroutines.resume

/**
 * Libby's voice on the phone.
 *
 * The server synthesises her lines (piper on the box, or a speech server it was pointed
 * at) and this plays them in order, one at a time. When the server has nothing to speak
 * with it says so (503) and Android's own text-to-speech stands in — not her voice, but
 * never silence. Mirrors web/src/speech.ts.
 *
 * Whether she speaks at all is per-device ([Prefs.libbySpeak]): a phone with headphones
 * and a tablet on the coffee table want different answers.
 */
class LibbySpeech(private val context: Context, private val repo: Repository) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private val queue = Channel<Triple<String, Int, Long>>(Channel.UNLIMITED)
    private val generation = AtomicLong(0)
    private var player: MediaPlayer? = null
    private var device: TextToSpeech? = null
    private var deviceReady: CompletableDeferred<Boolean>? = null
    /** When the server last said it had no engine; retried after a minute. */
    @Volatile private var serverSilentAt = 0L

    init {
        scope.launch {
            for ((text, heat, gen) in queue) {
                if (gen != generation.get()) continue
                runCatching { sayOne(text, heat, gen) }
            }
        }
    }

    /** Says a line after whatever is already being said. `heat` shapes the server's
        delivery — slower and breathier as it climbs; see tts.HeatDelivery. */
    fun speak(text: String, heat: Int = 0) {
        val clean = text.trim()
        if (clean.isEmpty()) return
        queue.trySend(Triple(clean, heat, generation.get()))
    }

    /** Stops the current line and forgets the rest. */
    fun stop() {
        generation.incrementAndGet()
        player?.let { runCatching { it.stop(); it.release() } }
        player = null
        device?.stop()
    }

    private suspend fun sayOne(text: String, heat: Int, gen: Long) {
        val audio = if (System.currentTimeMillis() - serverSilentAt > 60_000) fetchAudio(text, heat) else null
        if (gen != generation.get()) return
        if (audio != null) playBytes(audio, gen) else speakWithDevice(cleanForDevice(text), gen)
    }

    private suspend fun fetchAudio(text: String, heat: Int): ByteArray? = withContext(Dispatchers.IO) {
        try {
            repo.api.ttsSpeak(SpeakRequest(text, heat)).bytes()
        } catch (e: HttpException) {
            if (e.code() == 503) serverSilentAt = System.currentTimeMillis()
            null
        } catch (e: Exception) {
            null
        }
    }

    private suspend fun playBytes(bytes: ByteArray, gen: Long) {
        val file = withContext(Dispatchers.IO) {
            File.createTempFile("libby-", ".wav", context.cacheDir).also { it.writeBytes(bytes) }
        }
        if (gen != generation.get()) { file.delete(); return }
        suspendCancellableCoroutine<Unit> { cont ->
            val mp = MediaPlayer()
            player = mp
            val finish = {
                if (player === mp) player = null
                runCatching { mp.release() }
                file.delete()
                if (cont.isActive) cont.resume(Unit)
            }
            try {
                mp.setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build(),
                )
                mp.setDataSource(file.path)
                mp.setOnCompletionListener { finish() }
                mp.setOnErrorListener { _, _, _ -> finish(); true }
                mp.prepare()
                mp.start()
            } catch (e: Exception) {
                finish()
            }
            cont.invokeOnCancellation { finish() }
        }
    }

    /** The device's own synthesiser, when the server has nothing to say it with. */
    private suspend fun speakWithDevice(text: String, gen: Long) {
        if (text.isBlank()) return
        val ready = deviceReady ?: CompletableDeferred<Boolean>().also { deferred ->
            deviceReady = deferred
            device = TextToSpeech(context) { status ->
                if (status == TextToSpeech.SUCCESS) {
                    device?.language = Locale.US
                    device?.setPitch(1.05f)
                    device?.setSpeechRate(1.0f)
                }
                deferred.complete(status == TextToSpeech.SUCCESS)
            }
        }
        if (!ready.await() || gen != generation.get()) return
        val tts = device ?: return
        suspendCancellableCoroutine<Unit> { cont ->
            val id = "libby-${System.nanoTime()}"
            tts.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                override fun onStart(utteranceId: String?) {}
                override fun onDone(utteranceId: String?) { if (utteranceId == id && cont.isActive) cont.resume(Unit) }
                @Deprecated("Deprecated in Java")
                override fun onError(utteranceId: String?) { if (utteranceId == id && cont.isActive) cont.resume(Unit) }
            })
            if (tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, id) != TextToSpeech.SUCCESS && cont.isActive) cont.resume(Unit)
        }
    }

    /**
     * What the device voice should read: the server does this itself for its engines,
     * so only the fallback needs it here. Markup off, bracket tags out, actions kept.
     */
    private fun cleanForDevice(text: String): String = text
        .replace(Regex("""\[([^\]\n]{1,200})\]\([^)\n]{0,400}\)"""), "$1")
        .replace(Regex("""\[[^\]\n]{0,200}\]"""), " ")
        .replace("**", "").replace("~~", "").replace("*", "").replace("`", "")
        .replace(Regex("""[\p{So}\p{Cn}]"""), "")
        .replace(Regex("""\s+"""), " ")
        .trim()
}
