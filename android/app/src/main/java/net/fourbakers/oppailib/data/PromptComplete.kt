package net.fourbakers.oppailib.data

/**
 * Prompt autocomplete, the phone's copy of web/src/prompt-complete.ts (which has the
 * tests): what is being typed at the caret, what it could become, and how accepting a
 * completion rewrites the prompt.
 *
 * The token is the run of text around the caret between the prompt's own delimiters —
 * commas, line breaks, and the brackets that weight a tag — so "(red dre|ss:1.2)"
 * completes "red dre" and keeps the weight. The first version completed whatever
 * followed the prompt's last comma, wherever the caret was, and replaced the wrong tag.
 * A "<lora:" reference and a "__wildcard__" complete from lists the screen already
 * holds; tags come from the server's Danbooru vocabulary.
 */
object PromptComplete {
    enum class Mode { TAG, LORA, WILDCARD }

    data class Token(val start: Int, val end: Int, val query: String, val mode: Mode)

    enum class Kind { TAG, LORA, WILDCARD, TRIGGER }

    data class Completion(
        val kind: Kind,
        val label: String,
        val insert: String,
        val detail: String = "",
        val category: Int = 0,
        val count: Long = 0,
    )

    private const val DELIMS = ",\n|()[]{}"
    private const val BRACKETS = "()[]{}"

    private fun isDelimiter(text: String, i: Int): Boolean {
        val c = text[i]
        if (c !in DELIMS) return false
        // "\(" is a literal bracket inside a tag ("ganyu \(genshin impact\)"), not a group.
        return !(i > 0 && text[i - 1] == '\\' && c in BRACKETS)
    }

    private val loraOpen = Regex("""<lora:([^:>]*)$""", RegexOption.IGNORE_CASE)
    private val wildcardTyped = Regex("""^__([^_]*(?:_[^_]+)*)_{0,2}$""")

    /** The token the caret is in, or null when there is nothing to complete there. */
    fun tokenAt(text: String, caretIn: Int): Token? {
        val caret = caretIn.coerceIn(0, text.length)
        val before = text.substring(0, caret)
        loraOpen.find(before)?.let { m ->
            var end = caret
            val close = text.indexOf('>', caret)
            val nextOpen = text.indexOf('<', caret)
            if (close >= 0 && (nextOpen < 0 || close < nextOpen)) end = close + 1
            return Token(m.range.first, end, m.groupValues[1].trim(), Mode.LORA)
        }
        var start = caret
        while (start > 0 && !isDelimiter(text, start - 1)) start--
        var end = caret
        while (end < text.length && !isDelimiter(text, end)) end++
        while (start < caret && text[start].isWhitespace()) start++
        val typed = text.substring(start, caret)
        // A weight being typed ("tag:1.") is not a tag, nor the inside of a LoRA reference.
        if (':' in typed || Regex("""<[^>]*$""").containsMatchIn(typed)) return null
        val colon = text.substring(caret, end).indexOf(':')
        if (colon >= 0) end = caret + colon
        while (end > caret && text[end - 1].isWhitespace()) end--
        if (typed.startsWith("__")) {
            wildcardTyped.find(typed)?.let { m ->
                var wend = end
                val closeAt = text.indexOf("__", start + 2)
                if (closeAt >= 0 && closeAt + 2 <= end) wend = closeAt + 2
                return Token(start, wend, m.groupValues[1], Mode.WILDCARD)
            }
        }
        return Token(start, end, unescape(typed).trim(), Mode.TAG)
    }

    /** Writes a tag so a prompt parser reads its brackets as part of the name. */
    fun escape(tag: String): String = tag.replace(Regex("""([()\[\]{}])"""), """\\$1""")

    fun unescape(tag: String): String = tag.replace(Regex("""\\([()\[\]{}])"""), "$1")

    /**
     * Replaces the token with the completion, returning the new text and where the
     * caret goes. A tag accepted at the end is followed by ", " so the next can be
     * typed straight away.
     */
    fun apply(text: String, token: Token, insert: String): Pair<String, Int> {
        val after = text.substring(token.end)
        val tail = if (token.mode != Mode.LORA && after.isBlank()) ", " else ""
        val rest = if (after.isBlank()) "" else after
        return (text.substring(0, token.start) + insert + tail + rest) to (token.start + insert.length + tail.length)
    }

    private fun score(name: String, q: String): Int {
        val n = name.lowercase()
        return when {
            q.isEmpty() -> 2
            n == q -> 0
            n.startsWith(q) -> 1
            n.split(Regex("""[\s_\-.]+""")).any { it.startsWith(q) } -> 2
            q in n -> 3
            else -> -1
        }
    }

    private fun <T> ranked(items: List<T>, name: (T) -> String, q: String, limit: Int): List<T> =
        items.map { it to score(name(it), q) }
            .filter { it.second >= 0 }
            .sortedWith(compareBy<Pair<T, Int>> { it.second }.thenBy { name(it.first) })
            .take(limit)
            .map { it.first }

    /** Completions the screen answers itself: LoRAs, wildcard lists, trigger words. */
    fun local(
        token: Token,
        loras: List<GenLora>,
        wildcards: List<GenWildcard>,
        triggers: List<String>,
        limit: Int = 6,
    ): List<Completion> {
        val q = token.query.lowercase()
        return when (token.mode) {
            Mode.LORA -> ranked(loras, { it.alias.ifBlank { it.name } }, q, limit).map {
                val w = it.weight.takeIf { w -> w != 0.0 && w.isFinite() } ?: 1.0
                Completion(Kind.LORA, it.alias.ifBlank { it.name }, "<lora:${it.name}:${fmtWeight(w)}>")
            }
            Mode.WILDCARD -> ranked(wildcards, { it.name }, q, limit).map {
                Completion(Kind.WILDCARD, "__${it.name}__", "__${it.name}__",
                    detail = if (it.entries.isNotEmpty()) "${it.entries.size} lines" else "")
            }
            Mode.TAG -> if (q.isEmpty()) emptyList() else ranked(triggers, { it }, q, minOf(3, limit)).map {
                Completion(Kind.TRIGGER, it, it, detail = "trigger word")
            }
        }
    }

    /** The server's tags as completions, the alias that matched shown beside. */
    fun fromServer(res: TagSuggestions): List<Completion> {
        val items = res.items.ifEmpty { res.suggestions.map { TagCompletion(it) } }
        val out = items.map {
            Completion(Kind.TAG, it.tag, escape(it.tag),
                detail = if (it.alias.isNotEmpty()) "“${it.alias}”" else "",
                category = it.category, count = it.count)
        }.toMutableList()
        if (out.isEmpty() && res.correction.isNotEmpty()) {
            out += Completion(Kind.TAG, res.correction, escape(res.correction), detail = "did you mean")
        }
        return out
    }

    fun merge(local: List<Completion>, tags: List<Completion>, limit: Int = 8): List<Completion> =
        (local + tags).distinctBy { it.insert.lowercase() }.take(limit)

    /** How a post count reads: 6.0M, 52k, 870. */
    fun formatCount(n: Long): String = when {
        n <= 0 -> ""
        n >= 1_000_000 -> "%.1fM".format(n / 1_000_000.0)
        n >= 10_000 -> "${Math.round(n / 1000.0)}k"
        n >= 1_000 -> "%.1fk".format(n / 1000.0)
        else -> n.toString()
    }

    private fun fmtWeight(w: Double): String =
        if (w == Math.floor(w)) w.toLong().toString() else (Math.round(w * 100) / 100.0).toString()
}
