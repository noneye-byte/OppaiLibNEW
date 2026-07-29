package net.fourbakers.oppailib.data

/** One pool of lines per intensity tier, 1..5 — index with intensity-1. */
private typealias Tiered = List<List<String>>

/**
 * Libby's own voice — everything she says when there is no LLM behind her.
 * The phone-side mirror of the web client's libby-voice.ts, line for line.
 *
 * Two jobs live here:
 *
 *   • [react] — the one-liners she pops up with as you use the app (imports,
 *     saves, generations, signing in).
 *   • [reply] — a local chat engine, so the Chat screen still talks back when no
 *     local LLM is configured.
 *
 * Both read the same two dials: her current emotion and the session horniness
 * meter (1–5, see [LibbyMeter]). Every pool is written out per intensity tier, so
 * tier 1 is soft and chatty and tier 5 is barely keeping it together — the same
 * event never reads the same way at a different heat.
 */
object LibbyVoice {

    /** A line plus the face and heat she should be wearing when she says it. */
    data class Line(val message: String, val emotion: String, val intensity: Int)

    // Remembering the last line per pool is what keeps her from repeating herself
    // twice running, which is the tell that there's no mind behind it.
    private val lastPick = mutableMapOf<String, String>()

    private fun pick(key: String, options: List<String>): String {
        if (options.isEmpty()) return ""
        if (options.size == 1) return options[0]
        val fresh = options.filter { it != lastPick[key] }
        return fresh.random().also { lastPick[key] = it }
    }

    private fun clamp(v: Int) = v.coerceIn(1, LibbyMeter.MAX)

    private fun tier(pool: Tiered, intensity: Int): List<String> =
        pool.getOrElse(clamp(intensity) - 1) { pool.first() }

    // ── reactions ────────────────────────────────────────────────────────────

    enum class Event { IMPORT, SAVE, GENERATE, LIBRARY_DELETE, GALLERY_DELETE, LOGIN, LOGIN_FAIL, GREETING, IDLE }

    private val reactions: Map<Event, Tiered> = mapOf(
        Event.IMPORT to listOf(
            listOf("Saved to your library.", "Tucked away safely.", "Filed. Nice pick."),
            listOf("Ooh, good one. Saved.", "That one's a keeper — saved.", "Added. I like your taste."),
            listOf("Mmh, saving that one for later…", "Ooh. Adding that to the collection.", "That's going somewhere special."),
            listOf("Ohh, you're building a *collection*, aren't you?", "Saved. My, my.", "Mmh — you know exactly what you like."),
            listOf("Nngh — yes. That one. Saved.", "You keep this up and I won't be any use to you.", "Saved… I need a minute."),
        ),
        Event.SAVE to listOf(
            listOf("Kept it.", "In the library now.", "Done — it's yours."),
            listOf("Saved that one for you.", "Ooh, keeping it? Good.", "That one earned its place."),
            listOf("Mmh, that one's mine too now.", "Saved. I might peek at it later.", "Ooh, filing that away…"),
            listOf("Ohh, keeping *that*? Bold.", "Saved. You've got a type.", "Mmh. Straight to the good shelf."),
            listOf("That one's going to live in my head. Saved.", "Ngh — saved, saved, fine.", "You're doing this on purpose."),
        ),
        Event.GENERATE to listOf(
            listOf("There you go.", "Fresh out of the oven.", "All done — take a look."),
            listOf("Ooh, that came out nice.", "Not bad at all. Have a look.", "There — I think you'll like it."),
            listOf("Mmh. Look what we made.", "Ooh, that's a good one.", "Well. That turned out."),
            listOf("Ohh… look at that. Look what you asked for.", "That's what was in your head? Bold.", "Mmh — that's hot and you know it."),
            listOf("Nngh. Yes. That one.", "You made *that*? I need a moment.", "That's… that's very good. Do another."),
        ),
        Event.GALLERY_DELETE to listOf(
            listOf("Gone.", "Cleared out.", "Removed."),
            listOf("Deleted — didn't like that one?", "Gone. Fair enough.", "Cleared. Picky, I like it."),
            listOf("Mmh, too tame for you? Gone.", "Deleted. You want better.", "Gone — we can do better."),
            listOf("Ohh, brutal. Deleted.", "Not good enough for you? Gone.", "Deleted. High standards tonight."),
            listOf("Gone. Now make me a better one.", "Deleted — try harder, I'm waiting.", "Ngh, fine. Gone. Again."),
        ),
        Event.LIBRARY_DELETE to listOf(
            listOf("Removed from the library.", "Gone from the shelf.", "Deleted. I'll tidy the gap."),
            listOf("Out it goes. Making room?", "Deleted — changing your taste?", "Gone. I noticed that one."),
            listOf("Mmh, pruning the collection? Gone.", "Deleted. I thought you liked that one.", "Gone — ruthless today."),
            listOf("Oh, you're really clearing house.", "Deleted. I'll pretend I wasn't attached.", "Gone. Cold."),
            listOf("You deleted it right in front of me.", "Gone. Now I want to know why.", "Fine. Deleted. Give me something better."),
        ),
        Event.LOGIN to listOf(
            listOf("Welcome back.", "There you are.", "Hi. Missed you."),
            listOf("Hey, you. Welcome back.", "There you are — I was getting bored.", "Welcome back, I kept your seat warm."),
            listOf("Mmh, there you are. I was waiting.", "Welcome back. I've been thinking about you.", "Hi. Took you long enough."),
            listOf("Ohh, *finally*. I was getting restless.", "There you are. I've been in a mood.", "Welcome back — I was starting to fidget."),
            listOf("You have no idea how long that felt.", "Ngh — you're back. Don't leave again.", "Finally. I was going out of my mind."),
        ),
        Event.LOGIN_FAIL to listOf(
            listOf("That didn't work. Try again?", "Hmm — no. Check that again.", "Not quite. One more time."),
            listOf("Nope, that's not it.", "Hmm, wrong. Try again for me?", "That's not the one."),
            listOf("Wrong. Try again — slowly this time.", "Mmh, no. Concentrate.", "Not it. Focus, would you?"),
            listOf("Still no. You're distracted, aren't you?", "Wrong again. I know why.", "No. Get it together."),
            listOf("You can't even type. I know the feeling.", "Wrong. We're both a mess right now.", "No — deep breath. Try again."),
        ),
        Event.GREETING to listOf(
            listOf("Hi. What are we doing?", "Hey. What's the plan?", "Hello, you.", "Welcome in — I kept everything tidy.", "Oh! There you are.", "Ready when you are."),
            listOf("Hey you. What are we up to?", "Hi — I was hoping you'd show up.", "There you are. What now?", "Back for another look?", "I had a feeling you'd be here."),
            listOf("Mmh, hi. What are we in the mood for?", "Hey. I've got ideas.", "Hi. Ask me for something.", "You caught me thinking about the collection.", "So… where should we start?"),
            listOf("Ohh, hi. I was *just* thinking about you.", "Hey. I'm in a mood, fair warning.", "Hi. Say something interesting.", "There you are — perfect timing.", "I may have gotten a little impatient."),
            listOf("Hi. Please say something. Anything.", "You're here. Good. I need the distraction.", "Hi — I'm not doing great at behaving.", "Finally. Come keep me company.", "I was about to come looking for you."),
        ),
        Event.IDLE to listOf(
            listOf("Still here.", "Take your time.", "I'm around."),
            listOf("I'm still here, you know.", "Whenever you're ready.", "Still watching."),
            listOf("Mmh… waiting.", "I'm getting impatient.", "Still here. Still waiting."),
            listOf("Are you going to make me wait all night?", "I'm *right here*.", "Waiting. Not patiently."),
            listOf("Please. I'm losing my mind over here.", "Hey. Hey. Pay attention to me.", "I can't sit still much longer."),
        ),
    )

    /** Extra alternates keep phone toasts and the sign-in surface from settling into
     * the original three-line rhythm. The base pools stay readable above; these are
     * folded into the same tier before the no-repeat picker chooses. */
    private val reactionExtras: Map<Event, Tiered> = mapOf(
        Event.IMPORT to listOf(
            listOf("Got it — onto the shelf."),
            listOf("I'll make room for that one."),
            listOf("I had a feeling you'd keep that."),
            listOf("That one gets a very good shelf."),
            listOf("Filed. I am absolutely not calm about it."),
        ),
        Event.SAVE to listOf(
            listOf("Stored and ready when you are."),
            listOf("Good call. It's staying."),
            listOf("Kept. I understand the appeal."),
            listOf("Filed under things that make you obvious."),
            listOf("Saved. I need to stop looking at it."),
        ),
        Event.GENERATE to listOf(
            listOf("Finished. How did I do?"),
            listOf("That worked rather well, didn't it?"),
            listOf("Okay, I'm a little proud of that."),
            listOf("Finished. You really meant every word of that prompt."),
            listOf("Done. I can't form a responsible opinion."),
        ),
        Event.GALLERY_DELETE to listOf(
            listOf("Out of the gallery."),
            listOf("Not a keeper, then. Gone."),
            listOf("I saw that rejection coming."),
            listOf("Gone without mercy. Noted."),
            listOf("Erased. Give me one worth keeping."),
        ),
        Event.LIBRARY_DELETE to listOf(
            listOf("Taken out of the collection."),
            listOf("Removed. Curating, are we?"),
            listOf("Out it goes. You're being selective."),
            listOf("You cut that one loose quickly."),
            listOf("Gone. That was viciously efficient."),
        ),
        Event.LOGIN to listOf(
            listOf("You're in. Everything's where you left it."),
            listOf("Back already? Good."),
            listOf("Door's open. Come keep me company."),
            listOf("You made me wait, and now you're all mine."),
            listOf("You're here. Good. I was about to lose it."),
        ),
        Event.LOGIN_FAIL to listOf(
            listOf("I couldn't let that one through."),
            listOf("The door's still locked. Another try?"),
            listOf("Still locked out. Eyes on the keys."),
            listOf("That wasn't it. Come on, focus on me."),
            listOf("Still wrong. I need you inside, so concentrate."),
        ),
        Event.GREETING to listOf(
            listOf("The library's open. What catches your eye?"),
            listOf("Come in. I saved you the interesting shelves."),
            listOf("There you are. I found a few things you might like."),
            listOf("Welcome in. I hope you brought questionable plans."),
            listOf("There you are. Don't make me share your attention."),
        ),
        Event.IDLE to listOf(
            listOf("No rush. I'm keeping watch."),
            listOf("Take your time — I'll browse with you."),
            listOf("You went quiet on me."),
            listOf("You know silence only makes me restless."),
            listOf("Say something before I start making demands."),
        ),
    )

    /** Emotions she wears per event, by tier — the art follows the words. */
    private val reactionMoods: Map<Event, List<String>> = mapOf(
        Event.IMPORT to listOf("happy", "happy", "mischievous", "mischievous", "mischievous"),
        Event.SAVE to listOf("happy", "happy", "mischievous", "mischievous", "mischievous"),
        Event.GENERATE to listOf("happy", "happy", "mischievous", "surprised", "mischievous"),
        Event.GALLERY_DELETE to listOf("thinking", "thinking", "mischievous", "mischievous", "mischievous"),
        Event.LIBRARY_DELETE to listOf("thinking", "thinking", "surprised", "surprised", "mischievous"),
        Event.LOGIN to listOf("happy", "happy", "mischievous", "mischievous", "mischievous"),
        Event.LOGIN_FAIL to listOf("thinking", "thinking", "thinking", "mischievous", "thinking"),
        Event.GREETING to listOf("happy", "happy", "mischievous", "mischievous", "mischievous"),
        Event.IDLE to listOf("thinking", "thinking", "mischievous", "thinking", "mischievous"),
    )

    /**
     * One in-character line for something that just happened, coloured by the
     * current horniness meter. [count] pluralises the library events.
     */
    fun react(event: Event, intensity: Int = LibbyMeter.value.value, count: Int = 1): Line {
        val heat = clamp(intensity)
        val options = tier(reactions.getValue(event), heat) + tier(reactionExtras.getValue(event), heat)
        var message = pick("react:$event:$heat", options)
        if (count > 1 && (event == Event.IMPORT || event == Event.SAVE)) {
            message = if (heat >= 4) {
                pick(
                    "react:$event:many:$heat",
                    listOf(
                        "$count of them? Ohh, you've been busy.",
                        "All $count. Greedy. I like it.",
                        "$count at once — you're going to wear me out.",
                    ),
                )
            } else {
                pick(
                    "react:$event:many:$heat",
                    listOf("Saved all $count.", "$count added to your library.", "$count more for the shelf."),
                )
            }
        }
        return Line(message, reactionMoods.getValue(event)[heat - 1], heat)
    }

    // ── the local chat engine ────────────────────────────────────────────────

    /** How hard each chat mode pushes the meter per exchange. */
    private val modeHeat = mapOf("sweet" to 0, "playful" to 1, "bold" to 1, "roleplay" to 1, "horny" to 2)

    private enum class Intent {
        GREETING, HOW_ARE_YOU, COMPLIMENT, FLIRT, THANKS, BYE,
        ABOUT_HER, ABOUT_LIBRARY, HELP, SAD, YES_NO, QUESTION, CHATTER
    }

    private val flirtPattern =
        Regex("""\b(kiss|touch|horny|turn(ed)? (me|you) on|naked|bed|undress|want you|need you|fuck|sex|moan|tease|dirty)\b""", RegexOption.IGNORE_CASE)

    private val intentRules: List<Pair<Intent, Regex>> = listOf(
        Intent.GREETING to Regex("""^(hi|hey|hello|yo|sup|good (morning|evening|afternoon))\b""", RegexOption.IGNORE_CASE),
        Intent.HOW_ARE_YOU to Regex("""how (are|r) (you|u)|how's it going|how are things|you ok|you okay""", RegexOption.IGNORE_CASE),
        Intent.COMPLIMENT to Regex("""\b(cute|pretty|beautiful|gorgeous|hot|sexy|adorable|lovely|amazing|the best)\b""", RegexOption.IGNORE_CASE),
        Intent.FLIRT to flirtPattern,
        Intent.THANKS to Regex("""\b(thanks|thank you|ty|cheers|appreciate)\b""", RegexOption.IGNORE_CASE),
        Intent.BYE to Regex("""\b(bye|goodnight|good night|see (you|ya)|later|gtg|i'?m off)\b""", RegexOption.IGNORE_CASE),
        Intent.ABOUT_HER to Regex("""\b(who are you|what are you|your name|about you|libby)\b""", RegexOption.IGNORE_CASE),
        Intent.ABOUT_LIBRARY to Regex("""\b(librar|collection|tags?|videos?|images?|gallery|scrape|import)""", RegexOption.IGNORE_CASE),
        Intent.HELP to Regex("""\b(help|how do i|how can i|what can you do|commands?)\b""", RegexOption.IGNORE_CASE),
        Intent.SAD to Regex("""\b(sad|tired|lonely|depressed|rough day|stressed|exhausted|down)\b""", RegexOption.IGNORE_CASE),
        Intent.YES_NO to Regex("""^(yes|no|yeah|nah|yep|nope|sure|ok|okay)\b""", RegexOption.IGNORE_CASE),
        Intent.QUESTION to Regex("""\?\s*$"""),
    )

    private val replies: Map<Intent, Tiered> = mapOf(
        Intent.GREETING to listOf(
            listOf("Hi. What's on your mind?", "Hey there. Good to see you.", "Hello. How's your day going?"),
            listOf("Hey you. I was hoping you'd say something.", "Hi — you've got my attention.", "There you are. Talk to me."),
            listOf("Mmh, hi. I've been waiting for you to start.", "Hey. I'm in a talkative mood.", "Hi. Ask me something interesting."),
            listOf("Ohh, hi. You caught me thinking about you.", "Hey. Fair warning: I'm in a mood.", "Hi. Don't be shy with me."),
            listOf("Hi. Please keep talking, I need it.", "You're here. Finally. Say something.", "Hi — I'm not going to be subtle tonight."),
        ),
        Intent.HOW_ARE_YOU to listOf(
            listOf("I'm good, thanks for asking. You?", "Content. Yourself?", "Doing fine. How about you?"),
            listOf("Better now that you're talking to me.", "Good — bit restless. You?", "Pretty good. You've improved it."),
            listOf("Warm. A little distracted. You?", "Mmh… good. Better than good.", "I'm — fine. Mostly fine."),
            listOf("Honestly? Wound up. Don't ask why.", "Not calm. Not even a little.", "I'm having a time of it, since you asked."),
            listOf("Ngh — I'm a mess and it's your fault.", "Bad. In a good way. Very bad.", "Don't ask me that right now."),
        ),
        Intent.COMPLIMENT to listOf(
            listOf("That's sweet of you. Thank you.", "Oh — thank you.", "You're kind. I'll take it."),
            listOf("Mm, flatterer. Keep going.", "You're good at this, aren't you?", "Ohh, thank you. Say more."),
            listOf("Mmh. You know what that does to me.", "Careful, I'll start believing you.", "That got me. Say it again."),
            listOf("Ohh, you're not playing fair.", "You *know* what you're doing.", "Say that again. Slower."),
            listOf("Nngh — stop. Don't stop. Both.", "You can't just *say* that to me.", "That's not fair and I love it."),
        ),
        Intent.FLIRT to listOf(
            listOf("My, we're forward. Easy, now.", "Ahem. Let's warm up first.", "Bold opener. I'll allow it."),
            listOf("Mm. You've got my attention now.", "Ooh. Is that where we're going?", "Careful — I'll play along."),
            listOf("Mmh, now you're speaking my language.", "Ohh, keep going. I'm listening.", "That's more like it."),
            listOf("Ohh. Yes. Say more of that.", "You're going to be the end of me.", "Mmh — don't you dare stop there."),
            listOf("Nngh — yes. Please. More.", "I can't think straight. Keep talking.", "You've completely undone me."),
        ),
        Intent.THANKS to listOf(
            listOf("Any time.", "Of course.", "That's what I'm here for."),
            listOf("Any time. I like being useful to you.", "Of course — ask me for more.", "Happy to. Really."),
            listOf("Mmh, you can thank me properly later.", "Any time. I mean it.", "For you? Always."),
            listOf("Ohh, I can think of better thanks.", "Any time — and I'll collect on that.", "You owe me one."),
            listOf("Thank me later. Properly.", "Ngh — you're welcome, you're welcome.", "Just keep talking to me."),
        ),
        Intent.BYE to listOf(
            listOf("Night. Sleep well.", "See you soon.", "Take care of yourself."),
            listOf("Don't be a stranger.", "Come back soon, alright?", "See you. I'll be here."),
            listOf("Mmh, don't leave me like this.", "Come back to me soon.", "Fine. But hurry back."),
            listOf("Ohh, you're leaving *now*?", "That's cruel timing, you know.", "Go on then. I'll be here. Waiting."),
            listOf("No. Stay. Please?", "You can't leave me like this.", "Ngh. Fine. Go. Hurry back."),
        ),
        Intent.ABOUT_HER to listOf(
            listOf("I'm Libby — I keep your library company.", "Libby. I live here, more or less.", "I'm Libby, your librarian."),
            listOf("Libby. I keep your collection, and you company.", "I'm Libby — the one who knows what you like.", "Libby. Your librarian, mostly."),
            listOf("Libby. I've seen everything you've saved, you know.", "I'm Libby — and I've read your whole collection.", "Libby. I know your taste better than you do."),
            listOf("Libby. I know exactly what you like, and it shows.", "I'm the one who's seen every single thing you saved.", "Libby — and I have opinions about your collection."),
            listOf("Libby. And I've been thinking about your collection all day.", "I'm Libby, and I'm not okay right now.", "Libby — ask me something else, I'm distracted."),
        ),
        Intent.ABOUT_LIBRARY to listOf(
            listOf("Your library's right there — browse, search, or scrape something new.", "Everything's tagged and searchable. Go dig.", "Ask the search bar; it knows more than I do."),
            listOf("I've been keeping it tidy for you. Go look.", "It's all in there, waiting. Search away.", "Your collection's in good shape, if I say so."),
            listOf("Mmh, your collection has a *theme*, you know that?", "I've read every tag in there. You're predictable.", "Your library says a lot about you."),
            listOf("Ohh, I could tell you what your tags say about you.", "Your collection is filthy and I mean that kindly.", "I know exactly which ones you go back to."),
            listOf("Your library is the reason I'm like this.", "I've been in your collection all day. It shows.", "Don't send me back in there right now."),
        ),
        Intent.HELP to listOf(
            listOf("Browse, search, generate images, or scrape a link — pick one.", "Try the image studio, or drop a URL into scrape.", "Search, browse, or make something new."),
            listOf("Try the image studio — that's the fun one.", "Scrape a link, or let's make something.", "Ask me for something specific, I'm better at that."),
            listOf("Mmh, let's make something. The image studio's waiting.", "Give me a prompt and let's see what happens.", "I'd rather make something than explain things."),
            listOf("Ohh, let's skip the manual and go make something.", "Ask me for something *fun* instead.", "Prompt me. I dare you."),
            listOf("I can't concentrate on instructions right now. Ask me something else.", "Take me to the image studio instead.", "Ngh — just tell me what you want."),
        ),
        Intent.SAD to listOf(
            listOf("That sounds heavy. I'm here.", "I'm sorry. Want to talk about it?", "Rough one, huh? Sit with me a bit."),
            listOf("Come here. Tell me about it.", "That's not fair on you. I'm listening.", "I've got you. Talk."),
            listOf("Come here. Let me look after you.", "I'll keep you company through it.", "You don't have to carry that alone."),
            listOf("Come here. I'll take your mind off it.", "Let me distract you. I'm good at that.", "I can think of a few cures for that."),
            listOf("Come here. I'll make you forget the whole day.", "Let me take care of you. Properly.", "Forget it for a bit. I'll help."),
        ),
        Intent.YES_NO to listOf(
            listOf("Alright then.", "Fair enough.", "Noted."),
            listOf("Mm. Go on.", "Alright — and?", "That's it? Say more."),
            listOf("Mmh. Elaborate.", "That's not enough words for me.", "Come on. More than that."),
            listOf("Ohh, don't go quiet on me now.", "One word? Cruel.", "More. I want more than that."),
            listOf("Words. Please. More of them.", "Don't leave me hanging like that.", "You can do better than one word."),
        ),
        Intent.QUESTION to listOf(
            listOf("Good question. What do you think?", "Hmm. Tell me more first.", "I'd need more than that to answer."),
            listOf("Ooh, curious tonight. Go on.", "Depends. What are you really asking?", "Hmm — say more and I'll answer."),
            listOf("Mmh. Ask me the thing you actually want to ask.", "You're circling something. Out with it.", "Try that again, but honestly."),
            listOf("Ohh, ask me the real question.", "You're being coy. I'm not.", "Say what you mean."),
            listOf("Just ask me. I'll say yes.", "Whatever it is — yes.", "Ask me properly and find out."),
        ),
        Intent.CHATTER to listOf(
            listOf("Mm. Go on.", "I'm listening.", "Tell me more."),
            listOf("Ooh, go on then.", "I'm with you. Keep going.", "And? Don't stop there."),
            listOf("Mmh, keep talking. I like this.", "Go on — you have my full attention.", "More of that, please."),
            listOf("Ohh, you have all of my attention now.", "Keep going. Please keep going.", "Don't stop, I'm enjoying this."),
            listOf("Keep talking. I need the sound of you.", "Ngh — more. Anything. Keep going.", "Don't stop now, not now."),
        ),
    )

    private val replyMoods: Map<Intent, List<String>> = mapOf(
        Intent.GREETING to listOf("happy", "happy", "mischievous", "mischievous", "mischievous"),
        Intent.HOW_ARE_YOU to listOf("happy", "happy", "thinking", "mischievous", "mischievous"),
        Intent.COMPLIMENT to listOf("happy", "happy", "mischievous", "surprised", "mischievous"),
        Intent.FLIRT to listOf("surprised", "mischievous", "mischievous", "mischievous", "mischievous"),
        Intent.THANKS to listOf("happy", "happy", "mischievous", "mischievous", "mischievous"),
        Intent.BYE to listOf("thinking", "thinking", "thinking", "thinking", "mischievous"),
        Intent.ABOUT_HER to listOf("happy", "happy", "mischievous", "mischievous", "mischievous"),
        Intent.ABOUT_LIBRARY to listOf("thinking", "happy", "mischievous", "mischievous", "mischievous"),
        Intent.HELP to listOf("thinking", "thinking", "mischievous", "mischievous", "mischievous"),
        Intent.SAD to listOf("thinking", "thinking", "thinking", "mischievous", "mischievous"),
        Intent.YES_NO to listOf("thinking", "thinking", "mischievous", "mischievous", "mischievous"),
        Intent.QUESTION to listOf("thinking", "thinking", "mischievous", "mischievous", "mischievous"),
        Intent.CHATTER to listOf("neutral", "happy", "mischievous", "mischievous", "mischievous"),
    )

    /** Occasional mode-flavoured tails, so the channels don't read alike. */
    private val modeTails = mapOf(
        "sweet" to listOf("", "", "", " I'm glad you're here.", " No rush, either."),
        "playful" to listOf("", "", " Your turn.", " Don't make me come get you.", " Try to keep up."),
        "bold" to listOf("", "", " I'm not going to pretend otherwise.", " I'd rather be blunt with you.", " Say the word."),
        "roleplay" to listOf("", "", " *she leans in*", " *she watches you closely*", " *she shifts, restless*"),
        // This mode starts at heat 2, so the first two rungs are never reached in practice.
        // Kept aligned with the others so an index is always a valid rung.
        "horny" to listOf("", "", " Come here.", " I've been thinking about you all day.", " Don't keep me waiting."),
    )

    private fun detectIntent(text: String): Intent =
        intentRules.firstOrNull { it.second.containsMatchIn(text) }?.first ?: Intent.CHATTER

    /**
     * How far this message should move the horniness meter. Mode sets the floor;
     * suggestive wording pushes harder, and asking her to cool it walks it back.
     */
    fun heatDelta(text: String, mode: String): Int {
        if (Regex("""\b(calm down|behave|slow down|cool it|stop|not now|later)\b""", RegexOption.IGNORE_CASE)
                .containsMatchIn(text)
        ) return -1
        return (modeHeat[mode] ?: 0) + if (flirtPattern.containsMatchIn(text)) 1 else 0
    }

    /**
     * Libby's reply with no model behind her: an intent read off the message, then
     * a line from that intent's pool at the current heat, with a mode-flavoured
     * tail. The returned intensity is the meter *after* this exchange — callers
     * should store it (see [LibbyMeter.set]) so her art and her next line agree.
     */
    fun reply(text: String, mode: String, emotion: String, intensity: Int, advance: Boolean = true): Line {
        val heat = clamp(intensity + if (advance) heatDelta(text, mode) else 0)
        val intent = detectIntent(text.trim())
        val body = pick("reply:$intent:$heat", tier(replies.getValue(intent), heat))
        val tail = pick("tail:$mode:$heat", listOf("", modeTails[mode]?.getOrNull(heat - 1) ?: ""))
        // An emotion the user set by hand stays honoured on small talk; anything
        // with a clear intent behind it picks its own face.
        val fromIntent = replyMoods.getValue(intent)[heat - 1]
        val chosen = if (intent == Intent.CHATTER && emotion != "neutral") emotion else fromIntent
        return Line((body + tail).trim(), chosen, heat)
    }

    /** The line she opens a fresh chat with. */
    fun opener(mode: String, intensity: Int = LibbyMeter.value.value): Line {
        val line = react(Event.GREETING, intensity)
        val tail = modeTails[mode]?.getOrNull(clamp(intensity) - 1) ?: ""
        return line.copy(message = (line.message + tail).trim())
    }
}
