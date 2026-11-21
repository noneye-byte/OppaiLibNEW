package net.fourbakers.oppailib.data

import kotlinx.serialization.Serializable

/**
 * A chub.ai card's page, for reading it before adding it (GET /api/chub/details): the
 * search's fields, chub's figures, the card as the import will read it, its lorebook in
 * either the V2 or SillyTavern world-info shape, and its expression pack. [art] and the
 * expressions' urls are the server's proxy, like [ChubCard.avatar].
 */
@Serializable
data class ChubDetails(
    val path: String = "",
    val name: String = "",
    val tagline: String = "",
    val topics: List<String> = emptyList(),
    val stars: Int = 0,
    val chats: Int = 0,
    val tokens: Int = 0,
    val nsfw: Boolean = false,
    val avatar: String = "",
    val id: Long = 0,
    val creator: String = "",
    val art: String = "",
    val favorites: Int = 0,
    val messages: Int = 0,
    val forks: Int = 0,
    val rating: Double = 0.0,
    val ratingCount: Int = 0,
    val updated: String = "",
    val tokenCounts: Map<String, Int> = emptyMap(),
    val creatorNotes: String = "",
    val description: String = "",
    val personality: String = "",
    val scenario: String = "",
    val firstMessage: String = "",
    val greetings: List<String> = emptyList(),
    val exampleDialogs: String = "",
    val systemPrompt: String = "",
    val postHistory: String = "",
    val lorebookName: String = "",
    val lorebook: List<ChubLoreEntry> = emptyList(),
    val lorebookMore: Int = 0,
    val expressionPack: String = "",
    val expressions: List<ChubExpressionPic> = emptyList(),
    val hasGallery: Boolean = false,
) {
    /** The card as the search knew it, for the import. */
    fun asCard() = ChubCard(path = path, name = name, tagline = tagline, topics = topics, stars = stars, chats = chats, tokens = tokens, nsfw = nsfw, avatar = avatar)
}

@Serializable
data class ChubLoreEntry(
    val name: String = "",
    val keys: List<String> = emptyList(),
    val content: String = "",
    val constant: Boolean = false,
    val disabled: Boolean = false,
)

@Serializable
data class ChubExpressionPic(val label: String = "", val url: String = "")

@Serializable
data class ChubGalleryItem(val id: String = "", val url: String = "", val description: String = "", val nsfw: Boolean = false)

@Serializable
data class ChubGalleryPage(val items: List<ChubGalleryItem> = emptyList(), val total: Int = 0, val more: Boolean = false)

/*
 * The card's text, as the web's chub-cards.ts reads it.
 */

/** A card's {{char}} and {{user}} (and the old <BOT>/<USER>) read out as names. */
fun fillNames(text: String, name: String, user: String = "you"): String =
    text.replace(Regex("""\{\{\s*char\s*\}\}|<BOT>""", RegexOption.IGNORE_CASE), Regex.escapeReplacement(name.ifBlank { "them" }))
        .replace(Regex("""\{\{\s*user\s*\}\}|<USER>""", RegexOption.IGNORE_CASE), Regex.escapeReplacement(user))

/** One run of a roleplay message: plain narration, an *action*, or "speech". */
data class RoleplayRun(val text: String, val kind: String)

private val runPattern = Regex("""\*([^*\n][^*]*?)\*|"([^"\n]+?)"|“([^”\n]+?)”""")

/**
 * A roleplay message cut into the runs a chat draws differently: *actions* in italics and
 * "speech" brighter. An asterisk or a quote with no partner is left as written, so a stray
 * one does not turn the rest of a greeting into an action.
 */
fun roleplayRuns(text: String): List<RoleplayRun> {
    val out = mutableListOf<RoleplayRun>()
    var last = 0
    for (m in runPattern.findAll(text)) {
        if (m.range.first > last) out += RoleplayRun(text.substring(last, m.range.first), "plain")
        val action = m.groups[1]
        out += if (action != null) RoleplayRun(action.value, "action") else RoleplayRun(m.value, "speech")
        last = m.range.last + 1
    }
    if (last < text.length) out += RoleplayRun(text.substring(last), "plain")
    return out.filter { it.text.isNotEmpty() }
}

/** One of the card's own fields, with the tokens chub counted for it where it did. */
data class CardSection(val key: String, val label: String, val text: String, val tokens: Int? = null)

/** The card's own fields in the order a person reads a card. Empty ones are left out. */
fun cardSections(card: ChubDetails): List<CardSection> {
    val t = card.tokenCounts
    return listOf(
        CardSection("notes", "Creator's notes", card.creatorNotes),
        CardSection("description", "Description", card.description, t["description"]),
        CardSection("personality", "Personality", card.personality, t["personality"]),
        CardSection("scenario", "Scenario", card.scenario, t["scenario"]),
        CardSection("examples", "Example dialogue", card.exampleDialogs, t["mes_example"]),
        CardSection("system", "System prompt", card.systemPrompt, t["system_prompt"]),
        CardSection("post", "After the history", card.postHistory, t["post_history_instructions"]),
    ).map { it.copy(text = it.text.trim(), tokens = it.tokens?.takeIf { n -> n > 0 }) }.filter { it.text.isNotEmpty() }
}
