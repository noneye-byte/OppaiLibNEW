package net.fourbakers.oppailib.ui

/*
 * A model's recommended prompts, put into the form and taken out again — the same
 * rules as web/src/model-defaults.ts. Picking another model takes the last one's
 * recommended prompt out, but only while all of it is still there as it was put in:
 * once someone has edited that text, it is theirs.
 */

private fun promptParts(text: String): List<String> =
    text.split(",").map { it.trim() }.filter { it.isNotEmpty() }

private fun normPart(p: String): String = p.lowercase().replace(Regex("\\s+"), " ")

internal fun swapPromptDefault(text: String, previous: String?, next: String?, atStart: Boolean): String {
    var current = promptParts(text)
    if (!previous.isNullOrBlank()) {
        val have = current.map(::normPart).toSet()
        val drop = promptParts(previous).map(::normPart)
        if (drop.isNotEmpty() && drop.all { it in have }) {
            current = current.filter { normPart(it) !in drop }
        }
    }
    val have = current.map(::normPart).toSet()
    val add = promptParts(next.orEmpty()).filter { normPart(it) !in have }
    return (if (atStart) add + current else current + add).joinToString(", ")
}

/** The negatives the LoRAs that are on ask for, less what the negative already says. */
internal fun loraNegatives(negative: String, loraNegs: List<String>): String {
    val have = promptParts(negative).map(::normPart).toMutableSet()
    val out = mutableListOf<String>()
    for (neg in loraNegs) {
        for (p in promptParts(neg)) {
            if (have.add(normPart(p))) out += p
        }
    }
    return out.joinToString(", ")
}
