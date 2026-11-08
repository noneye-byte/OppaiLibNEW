package net.fourbakers.oppailib.data

// Which words a character or pose puts in the prompt, as web/src/fragment-words.ts.
//
// A character is written as tags, which is what the SDXL family was trained on. Anima
// reads sentences as well and does better with a subject described than listed, so a
// character or pose can carry a plain description, and on an Anima checkpoint that is
// what is sent. Everywhere else the tags still are.

/** The model families a description is sent to in place of the tags. */
val PROSE_FAMILIES: Set<String> = setOf("anima")

/** Whether a checkpoint of this family reads a description. */
fun readsProse(family: String?): Boolean = !family.isNullOrEmpty() && family in PROSE_FAMILIES

/** The words a character or pose adds: its description on a model that reads prose, when
 *  it has one; its tags otherwise. */
fun fragmentWords(fragment: GenCharacter, prose: Boolean): String {
    val description = fragment.description.trim()
    return if (prose && description.isNotEmpty()) description else fragment.prompt.trim()
}

/**
 * The prompt's pieces joined: by commas, as tags are, except after a piece that ends a
 * sentence, which the next follows after a space. Joined by commas alone, a description
 * came out "…green eyes., sitting".
 */
fun joinPrompt(parts: List<String>): String {
    val out = StringBuilder()
    for (raw in parts) {
        val part = raw.trim()
        if (part.isEmpty()) continue
        if (out.isNotEmpty()) out.append(if (out.last() in ".!?…") " " else ", ")
        out.append(part)
    }
    return out.toString()
}
