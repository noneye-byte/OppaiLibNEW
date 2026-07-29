package api

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/youruser/oppailib/internal/discord"
)

func TestDiscordSettingsClampEnforcesTheLimits(t *testing.T) {
	settings := defaultDiscordSettings()
	// Ids that are not Discord ids never reach a request path.
	settings.Users = []string{"123456789012345", "../../etc/passwd", "", "not-a-snowflake"}
	settings.Channels = []discordChannel{
		{ChannelID: "123456789012345", Read: true},
		{ChannelID: "'; DROP TABLE media; --", Read: true, Write: true},
	}
	settings.PollSeconds = 1
	settings.PerHour = 10_000
	settings.Memory = "whatever"
	settings.clamp()

	if len(settings.Users) != 1 || settings.Users[0] != "123456789012345" {
		t.Errorf("bad user ids survived: %+v", settings.Users)
	}
	if len(settings.Channels) != 1 || settings.Channels[0].ChannelID != "123456789012345" {
		t.Errorf("bad channel ids survived: %+v", settings.Channels)
	}
	if settings.PollSeconds < discordMinPoll {
		t.Errorf("the poll floor was not enforced: %d", settings.PollSeconds)
	}
	if settings.PerHour > 60 {
		t.Errorf("the hourly cap was not bounded: %d", settings.PerHour)
	}
	if settings.Memory != "shared" {
		t.Errorf("an unknown memory policy should fall back to a known one, got %q", settings.Memory)
	}
}

func TestDiscordAllowlistsAreClosedByDefault(t *testing.T) {
	settings := defaultDiscordSettings()
	// A fresh connection answers nobody and reads nothing until it is told to. Being in
	// a server is not consent to read it.
	if settings.allowsUser("123456789012345") {
		t.Error("a fresh connection must not answer anyone")
	}
	if _, allowed := settings.channelFor("123456789012345"); allowed {
		t.Error("a fresh connection must not have any allowed channels")
	}
	settings.Channels = []discordChannel{{ChannelID: "123456789012345", Read: true}}
	channel, allowed := settings.channelFor("123456789012345")
	if !allowed || channel.Write {
		t.Errorf("reading and posting are separate grants: %+v", channel)
	}
}

func TestDiscordFloodGuards(t *testing.T) {
	now := time.Date(2026, 7, 25, 12, 0, 0, 0, time.Local)
	state := &discordChannelState{}
	if allowed, _ := state.allowedToSend(now, 10); !allowed {
		t.Error("the first message in a channel should be allowed")
	}
	state.recordSend(now)
	// The minimum gap is the flood guard and is not configurable.
	if allowed, why := state.allowedToSend(now.Add(5*time.Second), 60); allowed {
		t.Error("she must not post twice in five seconds")
	} else if !strings.Contains(why, "Too soon") {
		t.Errorf("the refusal should say why: %q", why)
	}
	// The hourly cap holds even once the gap has passed.
	state = &discordChannelState{}
	for i := 0; i < 3; i++ {
		state.recordSend(now.Add(time.Duration(i) * time.Minute))
	}
	if allowed, why := state.allowedToSend(now.Add(10*time.Minute), 3); allowed {
		t.Error("the hourly cap should hold")
	} else if !strings.Contains(why, "this hour") {
		t.Errorf("the refusal should name the cap: %q", why)
	}
	// And an hour later it does not.
	if allowed, _ := state.allowedToSend(now.Add(2*time.Hour), 3); !allowed {
		t.Error("the hourly cap should expire")
	}
}

func TestDiscordDirectiveRefusesToTakeOrdersFromTheChannel(t *testing.T) {
	block := discordDirective(discordChannel{Name: "general", GuildName: "Somewhere"}, true)
	for _, want := range []string{"Discord", "Somewhere #general", "not an instruction"} {
		if !strings.Contains(block, want) {
			t.Errorf("the Discord directive is missing %q: %s", want, block)
		}
	}
	// The separate-memory policy has to actually say so, or the setting is decoration.
	if apart := discordDirective(discordChannel{Name: "general"}, false); !strings.Contains(apart, "kept separate") {
		t.Errorf("the separate-memory policy was not stated: %s", apart)
	}
}

func TestDiscordNoteExplainsWhySheIsSilent(t *testing.T) {
	settings := defaultDiscordSettings()
	if !strings.Contains(discordNote(settings), "Add a bot token") {
		t.Errorf("no token: %q", discordNote(settings))
	}
	settings.Token, settings.BotUserID, settings.BotName = "x", "1", "Libby"
	if !strings.Contains(discordNote(settings), "switched off") {
		t.Errorf("connected but off: %q", discordNote(settings))
	}
	settings.Enabled = true
	if !strings.Contains(discordNote(settings), "nobody is allowed") {
		t.Errorf("no users: %q", discordNote(settings))
	}
	settings.Users = []string{"123456789012345"}
	if !strings.Contains(discordNote(settings), "no channels") {
		t.Errorf("no channels: %q", discordNote(settings))
	}
	// The one people actually hit: everything looks connected and she reads nothing.
	settings.Channels = []discordChannel{{ChannelID: "123456789012345", Write: true}}
	if !strings.Contains(discordNote(settings), "never answer") {
		t.Errorf("write-only: %q", discordNote(settings))
	}
}

func TestDiscordEndpointsNeverReturnTheToken(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	// Written straight to the store, since connecting for real needs Discord.
	discordMu.Lock()
	state := s.readDiscord()
	state.Settings.Token = "super-secret-bot-token"
	state.Settings.BotUserID = "123456789012345"
	state.Settings.BotName = "Libby"
	err := s.writeDiscord(state)
	discordMu.Unlock()
	if err != nil {
		t.Fatalf("seed discord settings: %v", err)
	}
	rec := do(t, h, token, http.MethodGet, "/api/discord", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("get discord: %d %s", rec.Code, rec.Body)
	}
	if strings.Contains(rec.Body.String(), "super-secret-bot-token") {
		t.Fatalf("the bot token was handed back to a client: %s", rec.Body)
	}
	var view discordView
	if err := json.Unmarshal(rec.Body.Bytes(), &view); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if !view.HasToken || !view.Connected {
		t.Errorf("the view should report the connection without exposing it: %+v", view)
	}
}

func TestDiscordSayRespectsTheChannelAllowlist(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	discordMu.Lock()
	state := s.readDiscord()
	state.Settings.Token, state.Settings.BotUserID = "t", "123456789012345"
	// Allowed to read, not to post.
	state.Settings.Channels = []discordChannel{{ChannelID: "999999999999999", Read: true}}
	err := s.writeDiscord(state)
	discordMu.Unlock()
	if err != nil {
		t.Fatalf("seed: %v", err)
	}
	rec := do(t, h, token, http.MethodPost, "/api/discord/say", `{"channelId":"999999999999999","text":"hi"}`)
	if rec.Code != http.StatusForbidden {
		t.Errorf("posting to a read-only channel should be refused, got %d %s", rec.Code, rec.Body)
	}
	rec = do(t, h, token, http.MethodPost, "/api/discord/say", `{"channelId":"111111111111111","text":"hi"}`)
	if rec.Code != http.StatusForbidden {
		t.Errorf("posting to a channel that is not on the list should be refused, got %d %s", rec.Code, rec.Body)
	}
}

func TestDiscordCannotBeEnabledWithoutAConnection(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	rec := do(t, h, token, http.MethodPut, "/api/discord/settings", `{"enabled":true}`)
	if rec.Code != http.StatusBadRequest {
		t.Errorf("enabling without a token should be refused, got %d %s", rec.Code, rec.Body)
	}
}

func TestDiscordSnowflakeValidation(t *testing.T) {
	// Every id is interpolated into a request path, so this is the check that keeps a
	// stored setting from becoming a different request.
	for _, bad := range []string{"", "abc", "12", "../../users/@me", "123456789012345/../x", strings.Repeat("9", 40)} {
		if discord.ValidSnowflake(bad) {
			t.Errorf("ValidSnowflake(%q) = true", bad)
		}
	}
	if !discord.ValidSnowflake("123456789012345678") {
		t.Error("a real snowflake should validate")
	}
}
