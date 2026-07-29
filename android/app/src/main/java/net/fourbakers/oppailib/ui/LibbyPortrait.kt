package net.fourbakers.oppailib.ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import coil.compose.SubcomposeAsyncImage
import net.fourbakers.oppailib.data.Repository

/**
 * Libby's portrait, in one place. Given an emotion and the current horniness tier it
 * shows the worn outfit's art, walking down a fallback chain on any load error so a
 * missing tier (or a stale outfit) degrades cleanly instead of breaking:
 *
 *   worn outfit at [tier] → … → the outfit's baseline (level 0) → the bundled asset.
 *
 * This mirrors the web client's libby-portrait / libbyArtChain and is the single
 * source of Libby's face on the phone (Chat and any event reactions use it).
 */
@Composable
fun LibbyPortrait(
    repo: Repository,
    emotion: String,
    tier: Int,
    /** Bundled default art (an android_asset filename) for when no outfit covers this. */
    fallbackAsset: String,
    modifier: Modifier = Modifier,
) {
    val outfit = repo.prefs.libbyOutfit
    val chain = buildList {
        if (outfit.isNotEmpty()) {
            // The fine emotion first, then the drawn pose it borrows, so an outfit that
            // has "surprised" but not "shy" shows *its own* surprised art rather than
            // dropping to the bundled wardrobe. Without that step, adding a finer
            // emotion would silently undress every existing outfit whenever she felt it.
            for (slot in listOf(emotion, drawnPose(emotion)).distinct()) {
                for (level in tier downTo 1) add(repo.libbyEmotionUrl(outfit, slot, level))
                add(repo.libbyEmotionUrl(outfit, slot, 0))
            }
        }
        add("file:///android_asset/$fallbackAsset")
    }
    ChainImage(chain, repo, modifier)
}

/**
 * Everything Libby can feel, in the order the outfit editor lays its slots out.
 *
 * The first five are drawn by the bundled wardrobe; the rest are finer moods with no
 * art of their own, each borrowing a drawn pose (drawnPose) until an outfit supplies
 * one. Kept in step with the server's libbyEmotions and the web client's
 * LIBBY_EMOTIONS.
 */
val libbyEmotions = listOf(
    "neutral", "happy", "surprised", "thinking", "mischievous",
    "shy", "smug", "sad", "annoyed", "sleepy", "loving", "excited",
)

/** Which bundled pose stands in for each emotion. Mirrors libbyDrawnPose server-side. */
fun drawnPose(emotion: String): String = when (emotion.lowercase()) {
    "happy", "mischievous", "surprised", "thinking", "neutral" -> emotion.lowercase()
    "shy" -> "surprised"
    "smug" -> "mischievous"
    // "worried" is a legacy name from before the vocabulary grew.
    "sad", "annoyed", "worried" -> "thinking"
    "sleepy" -> "neutral"
    "loving", "excited" -> "happy"
    "horniness" -> "mischievous"
    else -> "neutral"
}

/** The bundled default art (an android_asset filename) for an emotion, used when no
    worn outfit covers it. Mirrors the web client's defaultLibbyArt(). */
fun mascotAsset(emotion: String, tier: Int = 1): String {
    val mood = drawnPose(emotion)
    return when (tier.coerceIn(1, 5)) {
        1 -> when (mood) {
            "happy" -> "Libby_New/Calm/happy.png"
            "mischievous" -> "Libby_New/Calm/Mischievous.png"
            "surprised" -> "Libby_New/Calm/suprised.png"
            "thinking" -> "Libby_New/Calm/Thinking.png"
            else -> "Libby_New/Calm/neutral.png"
        }
        2 -> "Libby_New/Warm/warm ${when (mood) { "mischievous" -> "Mischievous"; "surprised" -> "suprised"; else -> mood }}.png"
        3 -> "Libby_New/flirty/Flirty ${when (mood) { "mischievous" -> "Mis"; "surprised" -> "Suprised"; else -> mood.replaceFirstChar(Char::uppercase) }}.png"
        4 -> "Libby_New/heated/heated ${when (mood) { "mischievous" -> "mis"; "neutral" -> "Neutral"; "happy" -> "Happy"; "surprised" -> "suprised"; else -> mood }}.png"
        else -> "Libby_New/Peak/Peak ${when (mood) { "mischievous" -> "Mis"; "surprised" -> "Suprise"; else -> mood.replaceFirstChar(Char::uppercase) }}.png"
    }
}

/** Renders the first model, falling through to the next on load error. */
@Composable
private fun ChainImage(models: List<String>, repo: Repository, modifier: Modifier) {
    if (models.isEmpty()) return
    SubcomposeAsyncImage(
        model = models.first(),
        imageLoader = repo.imageLoader,
        contentDescription = "Libby",
        contentScale = ContentScale.Fit,
        modifier = modifier,
        error = { ChainImage(models.drop(1), repo, modifier) },
    )
}
