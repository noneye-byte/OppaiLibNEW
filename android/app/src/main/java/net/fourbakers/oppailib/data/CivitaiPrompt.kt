package net.fourbakers.oppailib.data

/**
 * Turning a Civitai showcase picture into studio settings — the phone's copy of
 * the web's civitai-prompt.ts, kept in step with it.
 *
 * Civitai keeps A1111-flavoured metadata ("DPM++ 2M Karras", "Size": "512x768");
 * the studio speaks InvokeAI scheduler ids and separate width and height. Only what
 * the poster kept is carried across, so a gap leaves the form's own value alone.
 */
data class PromptSettings(
    val prompt: String,
    val negativePrompt: String = "",
    val sampler: String = "",
    val steps: Int = 0,
    val cfgScale: Double = 0.0,
    val seed: Long = 0,
    val width: Int = 0,
    val height: Int = 0,
)

object CivitaiPrompt {
    private val samplers = mapOf(
        "euler a" to "euler_a", "euler" to "euler", "euler karras" to "euler_k",
        "lms" to "lms", "lms karras" to "lms_k", "heun" to "heun", "heun karras" to "heun_k",
        "dpm2" to "kdpm_2", "dpm2 karras" to "kdpm_2_k", "dpm2 a" to "kdpm_2_a", "dpm2 a karras" to "kdpm_2_a_k",
        "dpm++ 2s a" to "dpmpp_2s", "dpm++ 2s a karras" to "dpmpp_2s_k",
        "dpm++ 2m" to "dpmpp_2m", "dpm++ 2m karras" to "dpmpp_2m_k",
        "dpm++ 2m sde" to "dpmpp_2m_sde", "dpm++ 2m sde karras" to "dpmpp_2m_sde_k",
        "dpm++ 3m sde" to "dpmpp_3m", "dpm++ 3m sde karras" to "dpmpp_3m_k",
        "dpm++ sde" to "dpmpp_sde", "dpm++ sde karras" to "dpmpp_sde_k",
        "ddim" to "ddim", "ddpm" to "ddpm", "deis" to "deis", "unipc" to "unipc", "lcm" to "lcm",
        "pndm" to "pndm", "tcd" to "tcd",
    )

    /** The studio's id for a sampler as Civitai names it, or "" when it has none. */
    fun schedulerIdFor(name: String): String {
        val key = name.trim().lowercase().replace(Regex("\\s+"), " ")
        if (key.isEmpty()) return ""
        samplers[key]?.let { return it }
        if (key in samplers.values) return key
        val words = key.split(" ")
        for (n in words.size - 1 downTo 1) {
            samplers[words.take(n).joinToString(" ")]?.let { return it }
        }
        return ""
    }

    private val sizeRe = Regex("^\\s*(\\d{2,5})\\s*[x×]\\s*(\\d{2,5})\\s*$", RegexOption.IGNORE_CASE)

    fun parseSize(size: String): Pair<Int, Int>? {
        val m = sizeRe.find(size) ?: return null
        val w = m.groupValues[1].toInt()
        val h = m.groupValues[2].toInt()
        return if (w >= 64 && h >= 64) w to h else null
    }

    fun from(img: CivitaiImage): PromptSettings? {
        val prompt = img.prompt.trim()
        if (prompt.isEmpty()) return null
        val size = parseSize(img.size) ?: (if (img.width >= 64 && img.height >= 64) img.width to img.height else null)
        return PromptSettings(
            prompt = prompt,
            negativePrompt = img.negativePrompt.trim(),
            sampler = schedulerIdFor(img.sampler),
            steps = if (img.steps in 1..150) img.steps else 0,
            cfgScale = if (img.cfgScale > 0 && img.cfgScale <= 30) img.cfgScale else 0.0,
            seed = if (img.seed > 0) img.seed else 0,
            width = size?.first ?: 0,
            height = size?.second ?: 0,
        )
    }
}
