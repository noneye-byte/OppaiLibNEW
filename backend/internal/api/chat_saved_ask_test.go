package api

import "testing"

func TestAskingForAPictureIsAskingForANewOne(t *testing.T) {
	for _, text := range []string{
		"Hey babe can I get a photo of you in a purple dress?",
		"send me a pic",
		"Can you send me a photo of you?",
		"show me what you're wearing rn",
	} {
		if asksForSavedPicture(text) {
			t.Errorf("%q was read as asking for an old picture", text)
		}
	}
}

func TestAskingForOneSheAlreadyHasIsAskingForASavedOne(t *testing.T) {
	for _, text := range []string{
		"send that red dress pic again",
		"can I see the one from last night",
		"resend the selfie you took earlier",
		"what's your favourite pic of yourself",
		"show me the photo you sent yesterday",
	} {
		if !asksForSavedPicture(text) {
			t.Errorf("%q was not read as asking for an old picture", text)
		}
	}
}
