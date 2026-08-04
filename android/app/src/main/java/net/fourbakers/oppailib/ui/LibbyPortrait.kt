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
            // The exact emotion first, then its nearest kin, so an outfit that has
            // "surprised" but not "shy" shows *its own* surprised art rather than
            // dropping to the bundled wardrobe. Without that step, adding a finer
            // emotion would silently undress every existing outfit whenever she felt it.
            for (slot in listOf(emotion, nearestPose(emotion)).distinct()) {
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
 * The bundled wardrobe draws every one of them at every tier; the first five lead
 * because they are the moods every outfit should cover. Kept in step with the
 * server's libbyEmotions and the web client's LIBBY_EMOTIONS.
 */
val libbyEmotions = listOf(
    "neutral", "happy", "surprised", "thinking", "mischievous",
    "shy", "smug", "sad", "annoyed", "sleepy", "loving", "excited",
)

/**
 * Which emotion each one is closest to, for *outfits* only — the bundled art covers
 * them all. An outfit that drew "surprised" but not "shy" should show its own
 * surprised art rather than dropping out of the costume the user chose.
 *
 * Mirrors libbyNearestPose server-side and NEAREST_POSE in the web client.
 */
fun nearestPose(emotion: String): String = when (emotion.lowercase()) {
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

/** The bundled wardrobe's tier names, as they appear in the file names, for tiers 1..5. */
private val mascotTiers = listOf("calm", "warm", "flirty", "heated", "peak")

/**
 * The bundled default art (an android_asset filename) for an emotion, used when no
 * worn outfit covers it. The assets come straight from web/public (see the app's
 * gradle sourceSets), so this mirrors the web client's defaultLibbyArt().
 */
fun mascotAsset(emotion: String, tier: Int = 1): String {
    val mood = emotion.lowercase().let { if (it in libbyEmotions) it else nearestPose(it) }
    return "Libby_Default/default-libby-${mascotTiers[tier.coerceIn(1, 5) - 1]}-$mood.png"
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
