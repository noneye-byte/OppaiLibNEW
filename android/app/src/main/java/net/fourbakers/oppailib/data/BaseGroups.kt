package net.fourbakers.oppailib.data

/**
 * Sorting checkpoints and LoRAs by what they are built on: the web's
 * web/src/lora-categories.ts, whose baseFamily and baseGroup these are, and the server's
 * imagegen/families.go behind it. A family is what a LoRA can run on, which is too
 * coarse to find anything by, since Illustrious, Pony and NoobAI are all SDXL. So the
 * chips group by the finest name there is.
 */
data class BaseGroup(val key: String, val label: String)

private val familyLabels = mapOf(
    "sd1" to "SD 1.5", "sd2" to "SD 2", "sdxl" to "SDXL", "sd3" to "SD 3", "flux" to "Flux.1",
    "flux2" to "Flux.2 Klein", "chroma" to "Chroma", "qwen" to "Qwen", "qwen21" to "Qwen 2.1",
    "lumina" to "Lumina", "zimage" to "Z-Image", "wan" to "Wan", "anima" to "Anima",
    "ernie" to "Ernie", "pid" to "PiD", "krea2" to "Krea 2", "moss" to "MOSS Image",
)

private val groupOrder = listOf(
    "illustrious", "noobai", "pony", "sdxl", "mugen", "anima", "sd1", "sd2", "sd3", "flux", "flux2",
    "chroma", "zimage", "qwen", "qwen21", "krea2", "lumina", "ernie", "moss", "wan", "pid", "other",
)

private val xlKinds = listOf(
    "illustrious" to BaseGroup("illustrious", "Illustrious"),
    "noob" to BaseGroup("noobai", "NoobAI"),
    "pony" to BaseGroup("pony", "Pony"),
    "mugen" to BaseGroup("mugen", "Mugen"),
)

/** The family a base name stands for, "" when it says none. */
fun baseFamily(base: String): String {
    val b = base.lowercase().filter { it in 'a'..'z' || it in '0'..'9' }
    fun has(vararg prefixes: String) = prefixes.any { b.startsWith(it) }
    return when {
        b.isEmpty() || b == "unknown" || b == "other" || b == "any" -> ""
        // Pony V7 is on AuraFlow, nothing like the Pony before it.
        has("ponyv7", "flux3", "qwen3") -> ""
        has("flux2") -> "flux2"
        has("flux") -> "flux"
        has("chroma") -> "chroma"
        has("qwen21") -> "qwen21"
        has("qwen") -> "qwen"
        has("lumina", "neta") -> "lumina"
        has("zimage") -> "zimage"
        has("wan") -> "wan"
        has("anima") -> "anima"
        has("ernie") -> "ernie"
        has("moss") -> "moss"
        has("krea2") -> "krea2"
        has("pid") -> "pid"
        has("sd3") -> "sd3"
        b.contains("xl") || has("pony", "illustrious", "noob", "mugen") -> "sdxl"
        has("sd2") -> "sd2"
        has("sd1") -> "sd1"
        else -> ""
    }
}

/** What a model is built on, as the picker groups it. [family] is what its file was read
    as, which outranks a base that says nothing. */
fun baseGroup(base: String, family: String): BaseGroup {
    val fam = family.ifBlank { baseFamily(base) }
    if (fam == "sdxl") {
        val b = base.lowercase()
        xlKinds.firstOrNull { b.contains(it.first) }?.let { return it.second }
    }
    val label = familyLabels[fam] ?: return BaseGroup("other", "Other")
    return BaseGroup(fam, label)
}

/** Each group among some items with how many are in it, in the picker's order. */
fun <T> baseGroups(items: List<T>, group: (T) -> BaseGroup): List<Pair<BaseGroup, Int>> =
    items.groupingBy(group).eachCount().toList().sortedBy { groupOrder.indexOf(it.first.key) }
