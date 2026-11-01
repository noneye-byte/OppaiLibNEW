package api

import "testing"

func TestAShowcaseClipPlaysFromTheCDNsSmallTranscode(t *testing.T) {
	const raw = "https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/d5b7663d/original=true/68089394.mp4"
	if got, want := civitaiVideoPlay(raw), "https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/d5b7663d/transcode=true,width=450,optimized=true/68089394.mp4"; got != want {
		t.Fatalf("got %s", got)
	}
	stills, clips := civitaiPreviews([]civitaiRawImage{
		{URL: raw, Type: "video"},
		{URL: "https://image.civitai.com/k/u/original=true/2.jpeg", Type: "image"},
		{URL: "https://image.civitai.com/k/u/original=true/3.mp3", Type: "audio"},
	}, 5)
	if len(stills) != 2 || len(clips) != 2 {
		t.Fatalf("stills %v clips %v", stills, clips)
	}
	if clips[0] == "" || clips[1] != "" {
		t.Fatalf("a clip's still should carry the clip and a picture's nothing: %v", clips)
	}
}
