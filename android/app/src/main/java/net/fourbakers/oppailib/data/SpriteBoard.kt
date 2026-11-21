package net.fourbakers.oppailib.data

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.longOrNull
import kotlinx.serialization.json.put

/*
 * The Sprites board, on the phone: her wardrobe as the matrix of twelve expressions by
 * five heat tiers, and the moments (what she is doing rather than feeling) under it.
 *
 * The web draws a square from the studio's whole recipe — the outfit layer, undress per
 * tier, the reference square, the checkpoint's dialect. The phone does not rebuild that:
 * every square the studio has drawn keeps its generation record on the server (the WIP
 * store), so a square is redrawn from its own record, and a missing one is drawn from a
 * sibling's at the same heat with the expression's words swapped — the one part that
 * differs between such squares. A heat with nothing drawn at it yet starts on the web,
 * where the recipe is.
 */

/** One expression: its wardrobe slot, and the words that draw it (tags, then prose). */
data class SpriteFace(val id: String, val label: String, val face: String, val pose: String, val prose: String)

/** One heat tier: what owns the emotional performance at it. */
data class SpriteTier(val label: String, val mood: String, val moodProse: String)

/** One moment: a pose with a face of its own, drawn at the heat it carries. */
data class SpriteActivity(
    val id: String, val label: String, val face: String, val pose: String, val prose: String,
    val heat: Int, val intimate: Boolean = false, val app: Boolean = false,
)

/** A square's words as they are drawn: the studio's, with the user's rewrites over them. */
data class SquareWords(val face: String, val pose: String, val prose: String)

/** A square on the board: a slot (an expression or a moment) at a level. Moments are
 *  stored at level 0 whatever the heat they are drawn at. */
data class SpriteSquare(val slot: String, val level: Int, val label: String, val moment: Boolean) {
    val key: String get() = "$slot:$level"
}

/** Where one square is: nothing yet, drawn and waiting for review, or in the wardrobe. */
enum class SquareState { NONE, REVIEW, FILED }

/** A board filter, as sprite-board.ts's (without Stale, which needs the web's recipe). */
enum class BoardFilter(val label: String) { ALL("All"), MISSING("Missing"), REVIEW("To review"), FILED("Done") }

fun matchesFilter(filter: BoardFilter, state: SquareState): Boolean = when (filter) {
    BoardFilter.ALL -> true
    BoardFilter.MISSING -> state == SquareState.NONE
    BoardFilter.REVIEW -> state == SquareState.REVIEW
    BoardFilter.FILED -> state == SquareState.FILED
}

/** The board's squares in its own order: tier by tier through the expressions, then the moments. */
fun boardSquares(): List<SpriteSquare> =
    SPRITE_TIERS.indices.flatMap { t -> SPRITE_FACES.map { f -> SpriteSquare(f.id, t, f.label, moment = false) } } +
        SPRITE_ACTIVITIES.map { a -> SpriteSquare(a.id, 0, a.label, moment = true) }

/** The studio's words for a slot, with the user's rewrites (GET /api/libby/sprite-words)
 *  over them where a field was rewritten. */
fun squareWords(slot: String, rewrites: Map<String, SquareWordsChange>): SquareWords {
    val f = SPRITE_FACES.firstOrNull { it.id == slot }
    val a = SPRITE_ACTIVITIES.firstOrNull { it.id == slot }
    val base = SquareWords(f?.face ?: a?.face ?: "", f?.pose ?: a?.pose ?: "", f?.prose ?: a?.prose ?: "")
    val c = rewrites[slot] ?: return base
    return SquareWords(
        c.face?.takeIf { it.isNotBlank() } ?: base.face,
        c.pose?.takeIf { it.isNotBlank() } ?: base.pose,
        c.prose?.takeIf { it.isNotBlank() } ?: base.prose,
    )
}

/** The heat a square is drawn at: its tier, or a moment's own. */
fun squareHeat(sq: SpriteSquare): Int = if (sq.moment) SPRITE_ACTIVITIES.firstOrNull { it.id == sq.slot }?.heat ?: 0 else sq.level

/**
 * A sibling's prompt, moved to another square of the same heat: the sibling's face, pose
 * and prose replaced by the target's. Null when none of the sibling's words are in the
 * prompt — rewritten since, or drawn some other way — so the move would be a guess.
 */
fun retargetPrompt(prompt: String, from: SquareWords, to: SquareWords): String? {
    var out = prompt
    var moved = false
    for ((a, b) in listOf(from.prose to to.prose, from.face to to.face, from.pose to to.pose)) {
        if (a.isNotBlank() && out.contains(a)) { out = out.replace(a, b); moved = true }
    }
    return if (moved) out else null
}

private fun JsonObject.str(vararg keys: String): String? = keys.firstNotNullOfOrNull { (this[it] as? JsonPrimitive)?.contentOrNull }
private fun JsonObject.num(vararg keys: String): Double? = keys.firstNotNullOfOrNull { (this[it] as? JsonPrimitive)?.doubleOrNull }

/**
 * A generate request rebuilt from a square's stored record (the studio's GenInfo), with
 * [prompt] in place of its own and [seed] for the take. Left out of the studio's gallery:
 * a square is kept in its wardrobe, and a copy there would only be a second one.
 */
fun spriteRequest(info: JsonObject, prompt: String, seed: Long, jobId: String): SpriteGenerateRequest {
    val loras = (info["loras"] as? JsonArray).orEmpty().mapNotNull { e ->
        val o = e as? JsonObject ?: return@mapNotNull null
        val name = o.str("name") ?: return@mapNotNull null
        SpriteLora(name, o.num("weight") ?: 1.0)
    }
    return SpriteGenerateRequest(
        jobId = jobId,
        prompt = prompt,
        negativePrompt = info.str("negativePrompt", "negative").orEmpty(),
        checkpoint = info.str("model", "checkpoint").orEmpty(),
        vae = info.str("vae").orEmpty(),
        sampler = info.str("sampler").orEmpty(),
        steps = (info["steps"] as? JsonPrimitive)?.intOrNull ?: 25,
        width = (info["width"] as? JsonPrimitive)?.intOrNull ?: 832,
        height = (info["height"] as? JsonPrimitive)?.intOrNull ?: 1216,
        cfgScale = info.num("cfgScale", "cfg") ?: 6.0,
        clipSkip = (info["clipSkip"] as? JsonPrimitive)?.intOrNull ?: 0,
        seed = seed,
        loras = loras,
    )
}

/** The record stored with a redrawn square: its old one, with this take's prompt and seed. */
fun spriteInfo(info: JsonObject, prompt: String, seed: Long): JsonObject = buildJsonObject {
    info.forEach { (k, v) -> if (k != "prompt" && k != "seed") put(k, v) }
    put("prompt", prompt)
    put("seed", seed)
}

/** The seed a record was drawn with, when it kept one. */
fun recordSeed(info: JsonObject?): Long? = (info?.get("seed") as? JsonPrimitive)?.longOrNull

// The web's OUTFIT_FACES, OUTFIT_TIERS and OUTFIT_ACTIVITIES (web/src/views/imagegen.ts),
// copied word for word. Keep the two in step: the ids are wardrobe slots the server
// checks, and the words are what a stored prompt is searched for when a recipe moves.
internal val SPRITE_FACES = listOf(
    SpriteFace("neutral", "Neutral", "calm neutral expression, relaxed face, looking at viewer", "both arms hanging naturally at her sides, relaxed hands", "She has a calm, neutral expression on a relaxed face and looks at the viewer, both arms hanging naturally at her sides with relaxed hands."),
    SpriteFace("happy", "Happy", "warm genuine smile, bright eyes, cheerful expression", "hands loosely clasped behind her lower back, open cheerful posture", "She smiles a warm, genuine smile with bright eyes, cheerful, her hands loosely clasped behind her lower back in an open posture."),
    SpriteFace("mischievous", "Mischievous", "smirk, half-lidded eyes, teasing knowing expression", "one hand resting on her hip, other arm relaxed at her side", "She smirks with half-lidded eyes and a teasing, knowing look, one hand resting on her hip and the other arm relaxed at her side."),
    SpriteFace("surprised", "Surprised", "surprised expression, wide eyes, slightly open mouth", "hands open near her waist, elbows bent slightly in surprise", "She looks surprised, her eyes wide and her mouth slightly open, her hands open near her waist with her elbows bent a little."),
    SpriteFace("thinking", "Thinking", "thoughtful expression, looking to the side", "one fingertip resting at her chin, other arm folded gently across her waist", "She looks to the side, thoughtful, one fingertip resting at her chin and the other arm folded gently across her waist."),
    SpriteFace("shy", "Shy", "bashful shy expression, blushing cheeks, averted eyes, hesitant small smile", "hands clasped low in front of her skirt, shoulders tucked slightly inward", "She is bashful and shy, blushing, her eyes averted and a small hesitant smile on her lips, her hands clasped low in front of her and her shoulders tucked slightly inward."),
    SpriteFace("smug", "Smug", "self-satisfied smug expression, raised eyebrow, confident knowing smirk", "one hand planted on her hip, other arm loose, confident stance", "She looks smug and self-satisfied, one eyebrow raised over a confident, knowing smirk, one hand planted on her hip and the other arm loose."),
    SpriteFace("sad", "Sad", "sad wistful expression, downcast eyes, slight frown, vulnerable face", "arms hanging softly at her sides, shoulders slightly slumped", "She looks sad and wistful, her eyes downcast and a slight frown on her vulnerable face, her arms hanging softly at her sides and her shoulders slightly slumped."),
    SpriteFace("annoyed", "Annoyed", "annoyed irritated expression, furrowed brows, impatient pout", "arms crossed low beneath her chest, weight shifted impatiently", "She looks annoyed, her brows furrowed in an impatient pout, her arms crossed low beneath her chest and her weight shifted impatiently."),
    SpriteFace("sleepy", "Sleepy", "sleepy drowsy expression, heavy half-closed eyes, relaxed tired face", "arms loose at her sides, languid slouched posture", "She looks sleepy and drowsy, her eyes heavy and half closed in a relaxed, tired face, her arms loose at her sides in a languid slouch."),
    SpriteFace("loving", "Loving", "tender loving expression, soft adoring eyes, affectionate gentle smile", "hands gently clasped low over her abdomen, body leaning affectionately forward", "She looks tender and loving, with soft, adoring eyes and a gentle, affectionate smile, her hands clasped low over her abdomen as she leans affectionately forward."),
    SpriteFace("excited", "Excited", "excited thrilled expression, sparkling wide eyes, eager open smile", "hands held eagerly near her hips, lively forward-leaning stance", "She looks thrilled, her eyes wide and sparkling and an eager open smile on her face, her hands held near her hips as she leans forward, lively."),
)

internal val SPRITE_TIERS = listOf(
    SpriteTier("Calm", "composed", "She is composed."),
    SpriteTier("Warm", "soft light blush", "A soft, light blush colours her cheeks."),
    SpriteTier("Flirty", "flirty, visible blush", "She is flirty, with a visible blush."),
    SpriteTier("Heated", "blush, sultry, parted lips, heavy-lidded eyes", "She is blushing and sultry, her lips parted and her eyes heavy-lidded."),
    SpriteTier("Peak", "deep blush, needy expression, parted lips", "She is deeply blushing, with a needy expression and parted lips."),
)

internal val SPRITE_ACTIVITIES = listOf(
    SpriteActivity("typing", "Typing", "focused expression, eyes on her phone, faint smile", "holding a smartphone in both hands at chest height, thumbs on the screen, typing a message", "She holds a smartphone in both hands at chest height, typing a message with her thumbs, focused, her eyes on the phone and a faint smile on her lips.", heat = 0, intimate = false, app = true),
    SpriteActivity("reading", "Reading", "absorbed expression, eyes lowered to the page", "curled up holding an open book, one leg tucked under her", "She is curled up holding an open book, one leg tucked under her, absorbed, her eyes lowered to the page.", heat = 0, intimate = false, app = false),
    SpriteActivity("gaming", "Gaming", "intent expression, eyes wide on the screen, tongue at the corner of her mouth", "sitting cross-legged holding a game controller in both hands", "She sits cross-legged holding a game controller in both hands, intent, her eyes wide on the screen and her tongue at the corner of her mouth.", heat = 0, intimate = false, app = false),
    SpriteActivity("lounging", "Lounging", "relaxed expression, eyes half closed, easy smile", "sprawled back across a sofa, arms loose, one knee raised", "She is sprawled back across a sofa with her arms loose and one knee raised, relaxed, her eyes half closed and an easy smile on her face.", heat = 0, intimate = false, app = false),
    SpriteActivity("drinking", "Drinking", "contented expression, eyes closed over the rim", "holding a steaming mug in both hands near her chest", "She holds a steaming mug in both hands near her chest, contented, her eyes closed over the rim.", heat = 0, intimate = false, app = false),
    SpriteActivity("eating", "Eating", "cheeks slightly full, pleased expression", "holding food up to her mouth mid-bite, other hand cupped beneath it", "She holds food up to her mouth mid-bite, her other hand cupped beneath it, her cheeks slightly full and her face pleased.", heat = 0, intimate = false, app = false),
    SpriteActivity("stretching", "Stretching", "eyes shut, mouth open in a small yawn", "arms stretched overhead, back arched, rising onto her toes", "She stretches her arms overhead with her back arched, rising onto her toes, her eyes shut and her mouth open in a small yawn.", heat = 0, intimate = false, app = false),
    SpriteActivity("napping", "Napping", "sleeping, eyes closed, lips parted, peaceful", "curled on her side asleep, hands tucked under her cheek", "She is asleep, curled on her side with her hands tucked under her cheek, her eyes closed and her lips parted, peaceful.", heat = 0, intimate = false, app = false),
    SpriteActivity("dancing", "Dancing", "eyes closed, delighted open smile", "mid-step with hips turned, one arm raised loosely, hair in motion", "She is dancing mid-step with her hips turned, one arm raised loosely and her hair in motion, her eyes closed and her smile delighted.", heat = 0, intimate = false, app = false),
    SpriteActivity("tidying", "Tidying", "mildly absorbed expression, glancing at what she is holding", "reaching to shelve something, weight on one foot", "She reaches to put something on a shelf, her weight on one foot, mildly absorbed and glancing at what she is holding.", heat = 0, intimate = false, app = false),
    SpriteActivity("drawing", "Drawing", "concentrating, brow faintly furrowed, tongue between her teeth", "hunched over a sketchbook, pencil in hand, other arm steadying the page", "She is hunched over a sketchbook with a pencil in hand, her other arm steadying the page, concentrating, her brow faintly furrowed and her tongue between her teeth.", heat = 0, intimate = false, app = false),
    SpriteActivity("waving", "Waving", "bright welcoming smile, eyes on the viewer", "one arm raised waving at the viewer, weight on one hip", "She waves at the viewer with one arm raised and her weight on one hip, a bright welcoming smile on her face and her eyes on the viewer.", heat = 0, intimate = false, app = false),
    SpriteActivity("undressing", "Undressing", "half-lidded eyes, small knowing smile, watching the viewer", "peeling clothing off one shoulder, other hand at her waistband", "She is peeling her clothing off one shoulder, her other hand at her waistband, watching the viewer with half-lidded eyes and a small knowing smile.", heat = 2, intimate = true, app = false),
    SpriteActivity("teasing", "Teasing", "smirking, heavy-lidded eyes locked on the viewer", "posing for the viewer, back arched, hands framing her hips", "She poses for the viewer with her back arched and her hands framing her hips, smirking, her heavy-lidded eyes locked on the viewer.", heat = 2, intimate = true, app = false),
    SpriteActivity("touching", "Touching herself", "flushed, lips parted, eyes on the viewer", "one hand pressed between her thighs over her clothes, other hand at her chest", "She presses one hand between her thighs over her clothes, her other hand at her chest, flushed, her lips parted and her eyes on the viewer.", heat = 2, intimate = true, app = false),
    SpriteActivity("rubbing", "Rubbing", "deep blush, mouth open, eyes unfocused", "reclining with one hand rubbing between her spread thighs", "She reclines, rubbing between her spread thighs with one hand, deeply blushing, her mouth open and her eyes unfocused.", heat = 3, intimate = true, app = false),
    SpriteActivity("fingering", "Fingering", "blushing, head tipped back, brow drawn, mouth open", "lying back with her fingers inside herself, knees fallen open", "She lies back with her knees fallen open and her fingers inside herself, blushing, her head tipped back, her brow drawn and her mouth open.", heat = 4, intimate = true, app = false),
    SpriteActivity("spread", "Spread", "flushed, watching the viewer, mouth open", "lying back holding herself open with both hands, legs spread wide", "She lies back with her legs spread wide, holding herself open with both hands, flushed, watching the viewer with her mouth open.", heat = 4, intimate = true, app = false),
    SpriteActivity("vibrator", "Vibrator", "eyes squeezed shut, mouth open, deep blush", "holding a vibrator against herself, thighs tensed together", "She holds a vibrator against herself with her thighs tensed together, her eyes squeezed shut, her mouth open and her face deeply blushing.", heat = 3, intimate = true, app = false),
    SpriteActivity("dildo", "Dildo", "flushed, half-lidded, biting her lip", "using a dildo on herself, one hand braced behind her", "She is using a dildo on herself, one hand braced behind her, flushed and half-lidded, biting her lip.", heat = 4, intimate = true, app = false),
    SpriteActivity("riding", "Riding", "flushed, head thrown back, mouth open", "straddling and riding a toy, hands braced on her thighs, back arched", "She straddles a toy and rides it, her hands braced on her thighs and her back arched, flushed, her head thrown back and her mouth open.", heat = 4, intimate = true, app = false),
    SpriteActivity("grinding", "Grinding", "flushed, eyes shut, teeth in her lip", "straddling a pillow, hips rolling forward, hands gripping it", "She straddles a pillow and grips it as her hips roll forward, flushed, her eyes shut and her teeth in her lip.", heat = 3, intimate = true, app = false),
    SpriteActivity("climax", "Climax", "eyes rolled up, mouth wide open, whole face flushed", "body arched taut mid-orgasm, toes curled, hands fisted", "Her body is arched taut mid-orgasm, her toes curled and her hands fisted, her eyes rolled up, her mouth wide open and her whole face flushed.", heat = 4, intimate = true, app = false),
    SpriteActivity("afterglow", "Afterglow", "dazed exhausted smile, heavy-lidded eyes, deep blush", "collapsed limp on her back, limbs loose", "She lies collapsed on her back with her limbs loose, a dazed, exhausted smile on her face, her eyes heavy-lidded and her cheeks deeply blushing.", heat = 3, intimate = true, app = false),
    SpriteActivity("talking", "Talking", "talking, mouth open mid-word, friendly expression, eyes on the viewer", "facing the viewer, one hand raised a little as she speaks", "She faces the viewer, talking, her mouth open mid-word and her expression friendly, one hand raised a little as she speaks.", heat = 0, intimate = false, app = true),
    SpriteActivity("greeting", "Greeting", "bright welcoming smile, eyes on the viewer", "one hand raised in a small wave hello, leaning slightly toward the viewer", "She raises one hand in a small wave hello, leaning slightly toward the viewer with a bright welcoming smile.", heat = 0, intimate = false, app = true),
    SpriteActivity("startled", "Startled", "startled expression, wide eyes, mouth open in a small gasp", "flinching back, both hands raised in front of her chest", "She flinches back, startled, both hands raised in front of her chest, her eyes wide and her mouth open in a small gasp.", heat = 0, intimate = false, app = true),
)
