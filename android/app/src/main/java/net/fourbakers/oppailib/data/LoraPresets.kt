package net.fourbakers.oppailib.data

/**
 * The kinds of LoRA the phone's Train tab offers, duplicated from the web's
 * web/src/lora-presets.ts — keep the two alike. A beginner knows whether they want a
 * character, a style, a pose or an outfit, not what a rank is; each kind is the
 * handful of choices that kind wants, plus which of the tags every picture shares the
 * trigger word should stand for. A tag in every caption is learnt as that tag, so a
 * character captioned "blonde hair" every time only comes out blonde when the prompt
 * says so; the preset strikes those out.
 *
 * The web has the advanced settings; the phone starts a run from a kind and a length
 * and leaves the rest at the preset's numbers.
 */
data class LoraPreset(
    val id: String,
    val title: String,
    val blurb: String,
    /** Fewer than min is too few to learn from; ideal is the range worth aiming for. */
    val minPictures: Int,
    val ideal: IntRange,
    val epochs: Int = 10,
    val textEncoderLr: Double = 0.0,
    val noiseOffset: Double = 0.0,
    val flip: Boolean = false,
    /** Shared tags the trigger word should absorb, matched against the tag's words. */
    val absorb: Regex? = null,
)

// What a character is drawn with every time: her hair, eyes, skin and build. Not her
// clothes — those change from picture to picture and should stay promptable.
private val BODY = Regex(
    "\\b(hair|bangs|ahoge|sidelocks|ponytail|twintails|braids?|bun|eyes|pupils|heterochromia|eyebrows|eyelashes|skin|skinned|freckles|mole|scar|breasts|ears|tail|horns|wings|halo|fangs?|lips|muscular|tan|tanlines|body)\\b",
    RegexOption.IGNORE_CASE,
)

// What a style is: its medium, its rendering, its line.
private val STYLE = Regex(
    "\\b(style|medium|traditional|digital|painting|watercolor|watercolour|oil|acrylic|sketch|lineart|line art|ink|inking|monochrome|greyscale|grayscale|sepia|realistic|photorealistic|3d|cel|shading|flat color|flat colour|pixel art|retro|oekaki|pastel|limited palette|halftone|screentone|chibi|anime coloring|painterly|impasto|chromatic aberration|film grain|bokeh)\\b",
    RegexOption.IGNORE_CASE,
)

// What an outfit or a thing is made of.
private val GARMENT = Regex(
    "\\b(dress|shirt|blouse|skirt|shorts|pants|jeans|jacket|coat|hoodie|sweater|cardigan|vest|uniform|suit|armor|armour|kimono|yukata|apron|cape|cloak|robe|bodysuit|leotard|swimsuit|bikini|lingerie|bra|panties|thighhighs|pantyhose|stockings|socks|boots|shoes|heels|sandals|gloves|sleeves|collar|choker|necklace|earrings|ribbon|bow|hat|cap|helmet|headband|hairband|hair ornament|belt|tie|necktie|scarf|frills|lace|buttons|zipper|hood|mask|glasses|eyewear|bag|weapon|sword|staff)\\b",
    RegexOption.IGNORE_CASE,
)

val LORA_PRESETS = listOf(
    LoraPreset("character", "A character", "One face and body, in whatever outfit or pose the prompt asks for.",
        minPictures = 8, ideal = 15..40, textEncoderLr = 0.00005, absorb = BODY),
    LoraPreset("style", "An art style", "A way of drawing, applied to anything you prompt.",
        minPictures = 20, ideal = 30..100, epochs = 12, flip = true, noiseOffset = 0.05, textEncoderLr = 0.00005, absorb = STYLE),
    LoraPreset("concept", "A pose or concept", "An action, a composition, an effect — on anyone.",
        minPictures = 10, ideal = 20..60, flip = true),
    LoraPreset("outfit", "An outfit or object", "A piece of clothing or a thing, worn or held by anyone.",
        minPictures = 10, ideal = 15..50, flip = true, absorb = GARMENT),
    LoraPreset("custom", "Something else", "The trainer's own defaults.", minPictures = 5, ideal = 15..60),
)

/** How long to train: a quick look at whether the set works, the preset's own
    length, or longer for a large or subtle set. It scales the epochs only. */
enum class TrainEffort(val title: String, val scale: Double) {
    QUICK("Quick test", 0.5),
    BALANCED("Balanced", 1.0),
    THOROUGH("Thorough", 1.5),
}

fun epochsFor(preset: LoraPreset, effort: TrainEffort): Int =
    maxOf(2, Math.round(preset.epochs * effort.scale).toInt())

/**
 * The shared tags a preset strikes out: the ones its absorb pattern names, carried by
 * at least half the pictures. Half, not all — the tagger misses a tag now and then,
 * and "blonde hair" on 19 of 20 pictures is still her hair.
 */
fun suggestLeaveOut(preset: LoraPreset, common: List<TrainTagCount>, total: Int): List<String> {
    val absorb = preset.absorb ?: return emptyList()
    if (total <= 0) return emptyList()
    val floor = minOf(maxOf(2, (total + 1) / 2), total)
    return common.filter { it.count >= floor && absorb.containsMatchIn(it.name.replace('_', ' ')) }.map { it.name }
}

/** A trigger word from a LoRA's name: one unusual lower-case token. */
fun triggerFrom(name: String): String = name.lowercase().replace(Regex("[^a-z0-9]+"), "")

/** Whether a run should start in low-VRAM mode for this card and checkpoint family. */
fun wantsLowVram(vramMB: Int, base: String): Boolean {
    if (vramMB <= 0) return false
    val xl = Regex("xl|pony|illustrious|noob", RegexOption.IGNORE_CASE).containsMatchIn(base)
    return if (xl) vramMB < 12 * 1024 else vramMB < 6 * 1024
}

/** Whether the run still has something to do. */
fun Training.active(): Boolean = status in setOf("preparing", "queued", "training", "installing")

/** How far along a run is, 0–1, or null with no measure yet (caching and loading
    take minutes but have no count to show). */
fun Training.fraction(): Float? = when {
    status == "done" || status == "installing" -> 1f
    total <= 0 -> null
    else -> (step.toFloat() / total).coerceIn(0f, 1f)
}

private val TRAIN_PHASES = mapOf(
    "waiting" to "Waiting for the GPU",
    "receiving" to "Receiving the pictures",
    "loading" to "Loading the checkpoint",
    "caching" to "Preparing the pictures",
    "training" to "Training",
    "sampling" to "Rendering a sample",
    "saving" to "Saving",
    "done" to "Finished — installing next",
    "error" to "Stopping",
    "cancelled" to "Stopping",
)

private val TRAIN_STATUSES = mapOf(
    "preparing" to "Sending the pictures",
    "queued" to "Waiting for the GPU",
    "training" to "Training",
    "installing" to "Installing into the generator",
    "done" to "Ready to use",
    "failed" to "Failed",
    "cancelled" to "Cancelled",
)

/** The one line under a run's name, as the web's train-progress.ts words it. */
fun Training.line(): String {
    if (status == "failed") return if (error.isNotBlank()) "Failed: $error" else "Failed"
    if (status != "training") return TRAIN_STATUSES[status] ?: status
    val phaseLabel = TRAIN_PHASES[phase] ?: "Training"
    if (phase != "training" || total <= 0) return phaseLabel
    val parts = mutableListOf("Step $step of $total")
    if (epoch > 0 && epochs > 0) parts += "epoch $epoch/$epochs"
    if (eta.isNotBlank() && eta != "?" && eta != "00:00") parts += "$eta left"
    if (loss > 0) parts += "loss ${"%.3f".format(loss)}"
    return parts.joinToString(" · ")
}
