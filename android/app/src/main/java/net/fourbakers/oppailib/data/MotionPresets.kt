package net.fourbakers.oppailib.data

/**
 * Ready-made phrases for what moves in a clip, and the showcase made of them.
 *
 * The phone's copy of web/src/motion-presets.ts, kept saying the same sentences so a
 * prompt written on one reads the same chips lit on the other. Wan reads sentences,
 * not tags; a preset is one sentence in the prompt, taken out again by pressing it a
 * second time — and only while it is still the whole sentence, so one edited by hand is
 * the user's and stays.
 */
object MotionPresets {
    data class Preset(val id: String, val label: String, val phrase: String, val group: String)

    val all: List<Preset> = listOf(
        Preset("push", "Push in", "The camera slowly pushes in toward her face", "camera"),
        Preset("pull", "Pull back", "The camera slowly pulls back to reveal more of the scene", "camera"),
        Preset("orbit", "Orbit", "The camera orbits slowly around her", "camera"),
        Preset("pan", "Pan", "The camera pans gently from left to right", "camera"),
        Preset("still", "Locked off", "The camera stays perfectly still", "camera"),
        Preset("handheld", "Handheld", "Subtle handheld camera sway", "camera"),
        Preset("look", "Looks at you", "She turns her head to look straight at the camera", "her"),
        Preset("smile", "Smiles", "She breaks into a warm smile", "her"),
        Preset("blink", "Blinks", "She blinks naturally", "her"),
        Preset("wave", "Waves", "She raises a hand and waves", "her"),
        Preset("breathe", "Breathing", "Her chest rises and falls with slow breathing", "her"),
        Preset("hair", "Hair in the wind", "Her hair flows and moves softly in the breeze", "her"),
        Preset("pose", "Holds her pose", "She holds her pose and moves only a little", "her"),
        Preset("walk", "Walks closer", "She walks slowly toward the camera", "her"),
        Preset("dance", "Sways", "She sways her hips gently to music", "her"),
        Preset("light", "Flickering light", "Warm light flickers across the scene", "scene"),
        Preset("rain", "Rain", "Rain falls steadily in the background", "scene"),
        Preset("petals", "Petals", "Petals drift through the air", "scene"),
        Preset("cloth", "Fabric moves", "Her clothes sway and ripple gently as she moves", "scene"),
    )

    /** Showcase: she stays put and comes alive — blinks, breathes, her hair and clothes
        move, the camera holds still. With a loop it plays round for ever. */
    val showcase: List<String> = listOf("still", "pose", "blink", "breathe", "hair", "cloth")

    private fun sentences(prompt: String): List<String> =
        prompt.split(Regex("(?<=[.!?])\\s+|\\n+"))
            .map { it.trim().trimEnd('.', '!', '?').trim() }
            .filter { it.isNotEmpty() }

    private fun same(a: String, b: String) = a.equals(b, ignoreCase = true)

    private fun join(parts: List<String>) = if (parts.isEmpty()) "" else parts.joinToString(". ") + "."

    fun has(prompt: String, phrase: String): Boolean = sentences(prompt).any { same(it, phrase) }

    fun toggle(prompt: String, phrase: String): String {
        val parts = sentences(prompt)
        val kept = parts.filterNot { same(it, phrase) }
        return join(if (kept.size == parts.size) parts + phrase else kept)
    }

    private fun showcasePhrases() = showcase.map { id -> all.first { it.id == id }.phrase }

    fun isShowcase(prompt: String): Boolean = showcasePhrases().all { has(prompt, it) }

    /** Puts the showcase first in the prompt, keeping the rest after it, or takes it
        out when it is all there. */
    fun toggleShowcase(prompt: String): String {
        val parts = showcasePhrases()
        val rest = sentences(prompt).filterNot { s -> parts.any { same(s, it) } }
        return join(if (isShowcase(prompt)) rest else parts + rest)
    }
}
