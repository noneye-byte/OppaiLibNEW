package api

import "regexp"

// Whether the picture asked for already says what she is wearing.
//
// libbySelfiePrompt draws her in her current clothes, which is right for "a selfie" or
// "you on the balcony" and wrong for "you in a red dress": the worn wardrobe went in
// ahead of the subject, so the generator was handed a tank top, orange shorts *and* a
// red dress and drew a blend of the three. The default outfit is what nearly every
// device is wearing, so nearly every dressed request came back half in the default
// outfit. A subject that names clothing, or no clothing, is the whole of what she has
// on, and her current outfit stays out of the prompt.
//
// Scenes that decide the clothes count too. Nobody sits in the bath in a tank top; the
// generator, told both, drew exactly that.

// subjectClothes matches a garment, a costume, a state of undress, or a scene that sets
// what she wears. Whole words, so "dressing gown" matches and "address" does not.
var subjectClothes = regexp.MustCompile(`(?i)\b(?:` +
	// garments
	`dress(?:es)?|gown|sundress|skirt|miniskirt|bikini|swimsuit|swimwear|one-piece|lingerie|bra|bralette|panties|thong|underwear|knickers|` +
	`shirt|t-shirt|tee|blouse|sweater|jumper|hoodie|cardigan|jacket|coat|blazer|vest|` +
	`(?:crop|tank|tube|halter|bikini) top|jeans|pants|trousers|leggings|shorts|stockings|thigh-?highs|pantyhose|tights|socks|` +
	`corset|bodysuit|leotard|catsuit|romper|jumpsuit|overalls|kimono|yukata|qipao|cheongsam|sari|robe|bathrobe|nightgown|nightie|` +
	`pajamas|pyjamas|pjs|onesie|apron|towel|uniform|costume|cosplay|suit|heels|boots|` +
	`maid|nurse|schoolgirl|cheerleader|bunny ?girl|` +
	// no clothes
	`naked|nude|topless|bottomless|undressed|unclothed|nothing on|wearing nothing|` +
	// a scene that decides them
	`bath|bathtub|bubble bath|shower|hot tub|jacuzzi|onsen|sauna|swimming|skinny-?dipping` +
	`)\b|\bwearing\b`)

// subjectDressesHer reports whether the subject settles what she has on.
func subjectDressesHer(subject string) bool {
	return subjectClothes.MatchString(subject)
}
