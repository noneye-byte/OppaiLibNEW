package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/youruser/oppailib/internal/crypto"
	"github.com/youruser/oppailib/internal/discord"
)

// Libby on Discord.
//
// The brief asks for her to be reachable outside OppaiLib and, where explicitly
// authorised, to be able to see selected channels. The transport for that is
// internal/discord, which holds no policy at all. This file is the policy, and the
// policy is the point: a bot in somebody's server that can read and write is exactly
// the thing that should be hard to misconfigure and easy to audit.
//
// The rules, in the order they are applied to any incoming message:
//
//  1. The connection is off unless it is on. No token, no polling, nothing.
//  2. Only channels on the list are read, and only channels on the list are written to.
//     Reading and writing are separate flags on each channel, because "she can see the
//     screenshots channel" and "she can post in it" are different grants.
//  3. Only allowlisted users are answered. Being in a server the bot is in does not
//     make somebody able to talk to her.
//  4. Her own messages are never answered, and neither are any other bot's. This is
//     the loop guard, and it is structural rather than heuristic: the bot's own user
//     id comes from Discord at connect time.
//  5. A minimum gap per channel and a cap per hour, so a busy channel cannot turn her
//     into a flood.
//
// Every one of those decisions is written to an audit log with its reason, because the
// failure people actually hit is "why did she answer that" or "why didn't she".
//
// DMs are never opened by her unprompted, and never read: this reads channels the
// owner listed, and nothing else. The brief's "must not browse private servers, direct
// messages, or channels without explicit access" is satisfied by there being no code
// path that discovers a channel and reads it.

const (
	// maxDiscordChannels bounds the allowlist. A mascot answering in a handful of
	// channels is the feature; a bot polling fifty is a scraper.
	maxDiscordChannels = 20
	// maxDiscordUsers bounds who may talk to her.
	maxDiscordUsers = 20
	// maxDiscordLog is how many audit entries are kept. Enough to explain the last few
	// days of a quiet bot, bounded so it cannot grow without limit.
	maxDiscordLog = 200
	// discordMinPoll and discordDefaultPoll bound how often channels are read. The
	// floor is politeness to Discord and to the box: this is a background loop making
	// one request per allowed channel.
	discordMinPoll     = 10
	discordDefaultPoll = 20
	// discordMinGapSeconds is the shortest time between two of her messages in one
	// channel, and it cannot be configured away — it is the flood guard.
	discordMinGapSeconds = 20
	// discordDefaultPerHour is how many messages she may send per channel per hour.
	discordDefaultPerHour = 12
	// discordHistory is how much of a channel she is given as context. Short: this is a
	// public channel with several people in it, not a private conversation, and a local
	// 7B has little room to spare anyway.
	discordHistory = 10
)

// discordChannel is one allowed channel and what she may do in it.
type discordChannel struct {
	GuildID   string `json:"guildId"`
	GuildName string `json:"guildName,omitempty"`
	ChannelID string `json:"channelId"`
	Name      string `json:"name,omitempty"`
	// Read and Write are separate grants, as the brief asks. Read without Write is a
	// useful state — she sees what is posted and can mention it in the app — and Write
	// without Read is the one that makes her reachable without being a lurker.
	Read  bool `json:"read"`
	Write bool `json:"write"`
}

// discordSettings is the whole configuration, stored encrypted.
type discordSettings struct {
	// Enabled is the master switch. Off means the poller does not run at all.
	Enabled bool `json:"enabled"`
	// Token is the bot token. Stored inside the encrypted record and never returned by
	// any endpoint — the status view reports whether one is set, not what it is.
	Token string `json:"token,omitempty"`
	// BotUserID is who the bot is, learned from Discord when the token is saved. The
	// loop guard depends on it, so a connection without it does not poll.
	BotUserID string `json:"botUserId,omitempty"`
	BotName   string `json:"botName,omitempty"`
	// OwnerUserID is the OppaiLib account the Discord side acts for — whose memory,
	// wants and bond Libby carries into a Discord conversation. Set when the token is
	// saved, because that is the only moment there is a request to read it from.
	OwnerUserID int64 `json:"ownerUserId,omitempty"`
	// Users are the Discord user ids she will answer. Empty means nobody, which is the
	// safe default: a fresh connection is inert until somebody is named.
	Users []string `json:"users"`
	// Channels is the allowlist, with its per-channel grants.
	Channels []discordChannel `json:"channels"`
	// Memory says what Discord may do to what she remembers. "shared" means it is one
	// person with one memory across both surfaces; "none" keeps Discord out of it
	// entirely — she is told nothing she has learned in the app and files nothing.
	Memory string `json:"memory"`
	// PollSeconds is how often allowed channels are read.
	PollSeconds int `json:"pollSeconds"`
	// PerHour caps her messages per channel per hour.
	PerHour int `json:"perHour"`
}

func defaultDiscordSettings() discordSettings {
	return discordSettings{
		Users:       []string{},
		Channels:    []discordChannel{},
		Memory:      "shared",
		PollSeconds: discordDefaultPoll,
		PerHour:     discordDefaultPerHour,
	}
}

// clamp keeps a hand-edited or older record inside what the code expects, and is the
// single place the hard limits are enforced — the poller trusts what it reads.
func (d *discordSettings) clamp() {
	if d.Users == nil {
		d.Users = []string{}
	}
	if d.Channels == nil {
		d.Channels = []discordChannel{}
	}
	users := d.Users[:0]
	for _, id := range d.Users {
		if discord.ValidSnowflake(id) && len(users) < maxDiscordUsers {
			users = append(users, id)
		}
	}
	d.Users = users
	channels := d.Channels[:0]
	for _, channel := range d.Channels {
		if discord.ValidSnowflake(channel.ChannelID) && len(channels) < maxDiscordChannels {
			channels = append(channels, channel)
		}
	}
	d.Channels = channels
	if d.Memory != "shared" && d.Memory != "none" {
		d.Memory = "shared"
	}
	if d.PollSeconds < discordMinPoll {
		d.PollSeconds = discordMinPoll
	}
	if d.PollSeconds > 600 {
		d.PollSeconds = 600
	}
	if d.PerHour < 1 {
		d.PerHour = 1
	}
	if d.PerHour > 60 {
		d.PerHour = 60
	}
}

// channelFor returns the allowlist entry for a channel, if it is on the list.
func (d discordSettings) channelFor(channelID string) (discordChannel, bool) {
	for _, channel := range d.Channels {
		if channel.ChannelID == channelID {
			return channel, true
		}
	}
	return discordChannel{}, false
}

// allowsUser reports whether this Discord user may be answered.
func (d discordSettings) allowsUser(userID string) bool {
	for _, allowed := range d.Users {
		if allowed == userID {
			return true
		}
	}
	return false
}

// discordEvent is one line of the audit log.
type discordEvent struct {
	At      int64  `json:"at"`
	Kind    string `json:"kind"`
	Channel string `json:"channel,omitempty"`
	User    string `json:"user,omitempty"`
	// Detail is why, in a sentence. The whole value of this log is that a refusal says
	// which rule refused it.
	Detail string `json:"detail,omitempty"`
}

// Audit kinds. Deliberately few: what happened is a short list, and the sentence in
// Detail carries the specifics.
const (
	discordEventConnected    = "connected"
	discordEventDisconnected = "disconnected"
	discordEventSettings     = "settings"
	discordEventReplied      = "replied"
	discordEventRefused      = "refused"
	discordEventError        = "error"
)

// discordState is the settings plus the log, which is the whole stored file.
type discordState struct {
	Settings discordSettings `json:"settings"`
	Log      []discordEvent  `json:"log"`
}

// discordMu guards the stored record and the runtime below it.
var discordMu sync.Mutex

func (s *Server) discordPath() string {
	return filepath.Join(s.libbyDir, "discord.json.enc")
}

func (s *Server) readDiscord() discordState {
	state := discordState{Settings: defaultDiscordSettings(), Log: []discordEvent{}}
	blob, err := os.ReadFile(s.discordPath())
	if err != nil {
		return state
	}
	raw, err := crypto.OpenBytes(s.kek, blob, []byte("libby-discord"))
	if err != nil {
		return state
	}
	var stored discordState
	if err := json.Unmarshal(raw, &stored); err != nil {
		return state
	}
	stored.Settings.clamp()
	if stored.Log == nil {
		stored.Log = []discordEvent{}
	}
	return stored
}

func (s *Server) writeDiscord(state discordState) error {
	state.Settings.clamp()
	if len(state.Log) > maxDiscordLog {
		state.Log = state.Log[len(state.Log)-maxDiscordLog:]
	}
	raw, err := json.Marshal(state)
	if err != nil {
		return err
	}
	blob, err := crypto.SealBytes(s.kek, raw, []byte("libby-discord"))
	if err != nil {
		return err
	}
	if err := os.MkdirAll(s.libbyDir, 0o700); err != nil {
		return err
	}
	tmp, err := os.CreateTemp(s.libbyDir, "discord-*.tmp")
	if err != nil {
		return err
	}
	tmpName := tmp.Name()
	defer os.Remove(tmpName)
	if err = tmp.Chmod(0o600); err == nil {
		_, err = tmp.Write(blob)
	}
	if closeErr := tmp.Close(); err == nil {
		err = closeErr
	}
	if err != nil {
		return err
	}
	return os.Rename(tmpName, s.discordPath())
}

// auditDiscord appends one line to the log.
//
// Takes the lock itself and is safe to call from the poller. Best-effort: a failed
// audit write must not stop her answering, but it is logged so a silently unwritable
// config directory is visible.
func (s *Server) auditDiscord(kind, channel, user, detail string) {
	discordMu.Lock()
	defer discordMu.Unlock()
	state := s.readDiscord()
	state.Log = append(state.Log, discordEvent{
		At: time.Now().UnixMilli(), Kind: kind, Channel: channel, User: user, Detail: detail,
	})
	if err := s.writeDiscord(state); err != nil {
		s.log.Warn("discord: audit write", "err", err)
	}
}

// ── the view a client gets ──────────────────────────────────────────────────

// discordView is the status a client is shown. The token is never in it.
type discordView struct {
	Enabled bool `json:"enabled"`
	// Connected means a token is stored and was accepted when it was saved.
	Connected bool   `json:"connected"`
	BotName   string `json:"botName,omitempty"`
	// HasToken separates "no token" from "token rejected", which need different things
	// said to the user.
	HasToken    bool             `json:"hasToken"`
	Users       []string         `json:"users"`
	Channels    []discordChannel `json:"channels"`
	Memory      string           `json:"memory"`
	PollSeconds int              `json:"pollSeconds"`
	PerHour     int              `json:"perHour"`
	Log         []discordEvent   `json:"log"`
	// Note is the plain-English state of the connection: why she is or is not going to
	// answer anything, without the reader having to work it out from the flags.
	Note string `json:"note"`
}

// discordNote states the connection's actual condition in a sentence.
//
// The flags are all individually legible and still add up to something people get
// wrong — a bot that is enabled, connected, and answers nothing because no user was
// ever allowed is the obvious one. Saying it outright is cheaper than a support thread.
func discordNote(settings discordSettings) string {
	switch {
	case settings.Token == "":
		return "Not connected. Add a bot token to start."
	case settings.BotUserID == "":
		return "The saved token wasn't accepted by Discord. Replace it with a valid bot token."
	case !settings.Enabled:
		return "Connected, but switched off — she isn't reading or posting anything."
	case len(settings.Users) == 0:
		return "Connected, but nobody is allowed to talk to her yet. Add your own Discord user id."
	case len(settings.Channels) == 0:
		return "Connected, but no channels are allowed yet. Add one to let her read or post."
	}
	reads, writes := 0, 0
	for _, channel := range settings.Channels {
		if channel.Read {
			reads++
		}
		if channel.Write {
			writes++
		}
	}
	switch {
	case reads == 0 && writes == 0:
		return "Connected, but every allowed channel has both reading and posting switched off."
	case reads == 0:
		return fmt.Sprintf("She can post in %d channel(s) but reads none, so she'll never answer anything.", writes)
	case writes == 0:
		return fmt.Sprintf("She reads %d channel(s) but can't post, so she'll see things and say nothing.", reads)
	}
	return fmt.Sprintf("Connected as %s, reading %d channel(s) and posting in %d.", settings.BotName, reads, writes)
}

func discordViewOf(state discordState) discordView {
	settings := state.Settings
	return discordView{
		Enabled:     settings.Enabled,
		Connected:   settings.Token != "" && settings.BotUserID != "",
		BotName:     settings.BotName,
		HasToken:    settings.Token != "",
		Users:       settings.Users,
		Channels:    settings.Channels,
		Memory:      settings.Memory,
		PollSeconds: settings.PollSeconds,
		PerHour:     settings.PerHour,
		Log:         state.Log,
		Note:        discordNote(settings),
	}
}

// ── endpoints ───────────────────────────────────────────────────────────────

func (s *Server) handleGetDiscord(w http.ResponseWriter, r *http.Request) {
	discordMu.Lock()
	state := s.readDiscord()
	discordMu.Unlock()
	writeJSON(w, http.StatusOK, discordViewOf(state))
}

// handleConnectDiscord stores a bot token, after checking Discord accepts it.
//
// Verified before it is stored, on purpose: a token that is saved and only fails later
// is indistinguishable, to the user, from the feature being broken. This way the answer
// to "did that work" is the response to the press that did it.
func (s *Server) handleConnectDiscord(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	var in struct {
		Token string `json:"token"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4<<10)).Decode(&in); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid token")
		return
	}
	token := strings.TrimSpace(in.Token)
	if token == "" {
		writeErr(w, http.StatusBadRequest, "paste the bot token from your Discord application")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
	defer cancel()
	me, err := discord.New(token).Verify(ctx)
	if err != nil {
		if errors.Is(err, discord.ErrUnauthorized) {
			writeErr(w, http.StatusBadRequest, "Discord rejected that token. Copy it again from the Bot page of your application.")
			return
		}
		writeErr(w, http.StatusBadGateway, "Couldn't reach Discord: "+err.Error())
		return
	}
	if !me.Bot {
		// A user token is not a bot token. Storing one would work for a while and is
		// against Discord's terms — refusing is both correct and kinder.
		writeErr(w, http.StatusBadRequest, "That's a user token, not a bot token. Use the token from your application's Bot page.")
		return
	}
	discordMu.Lock()
	state := s.readDiscord()
	state.Settings.Token = token
	state.Settings.BotUserID = me.ID
	state.Settings.BotName = me.Name()
	state.Settings.OwnerUserID = u.ID
	state.Log = append(state.Log, discordEvent{
		At: time.Now().UnixMilli(), Kind: discordEventConnected,
		Detail: "Connected as " + me.Name() + ".",
	})
	err = s.writeDiscord(state)
	discordMu.Unlock()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't save the connection")
		return
	}
	s.restartDiscord()
	s.handleGetDiscord(w, r)
}

// handleDisconnectDiscord drops the token and stops the poller.
//
// What this cannot do is revoke the token at Discord's end — only the application's
// owner can, from the developer portal, and there is no API for a bot to invalidate
// its own token. So the response says so. Claiming a revocation that did not happen
// would be the worst possible thing to be vague about.
func (s *Server) handleDisconnectDiscord(w http.ResponseWriter, r *http.Request) {
	discordMu.Lock()
	state := s.readDiscord()
	had := state.Settings.BotName
	state.Settings.Token = ""
	state.Settings.BotUserID = ""
	state.Settings.BotName = ""
	state.Settings.Enabled = false
	state.Log = append(state.Log, discordEvent{
		At: time.Now().UnixMilli(), Kind: discordEventDisconnected,
		Detail: "Disconnected" + map[bool]string{true: " from " + had, false: ""}[had != ""] + ". The token was deleted from this server.",
	})
	err := s.writeDiscord(state)
	discordMu.Unlock()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't disconnect")
		return
	}
	s.restartDiscord()
	writeJSON(w, http.StatusOK, map[string]any{
		"status": "ok",
		"note": "The token is deleted from this server and she's stopped reading and posting. " +
			"To make the token itself useless, regenerate it on the Bot page of your Discord application — " +
			"nothing here can revoke it on Discord's end.",
	})
}

type discordSettingsReq struct {
	Enabled     *bool             `json:"enabled,omitempty"`
	Users       *[]string         `json:"users,omitempty"`
	Channels    *[]discordChannel `json:"channels,omitempty"`
	Memory      *string           `json:"memory,omitempty"`
	PollSeconds *int              `json:"pollSeconds,omitempty"`
	PerHour     *int              `json:"perHour,omitempty"`
}

func (s *Server) handlePutDiscordSettings(w http.ResponseWriter, r *http.Request) {
	var in discordSettingsReq
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10)).Decode(&in); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid Discord settings")
		return
	}
	discordMu.Lock()
	state := s.readDiscord()
	if in.Enabled != nil {
		if *in.Enabled && state.Settings.BotUserID == "" {
			discordMu.Unlock()
			writeErr(w, http.StatusBadRequest, "connect a bot token first")
			return
		}
		state.Settings.Enabled = *in.Enabled
	}
	if in.Users != nil {
		state.Settings.Users = *in.Users
	}
	if in.Channels != nil {
		state.Settings.Channels = *in.Channels
	}
	if in.Memory != nil {
		state.Settings.Memory = *in.Memory
	}
	if in.PollSeconds != nil {
		state.Settings.PollSeconds = *in.PollSeconds
	}
	if in.PerHour != nil {
		state.Settings.PerHour = *in.PerHour
	}
	state.Log = append(state.Log, discordEvent{
		At: time.Now().UnixMilli(), Kind: discordEventSettings, Detail: discordNote(state.Settings),
	})
	err := s.writeDiscord(state)
	discordMu.Unlock()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't save the Discord settings")
		return
	}
	s.restartDiscord()
	s.handleGetDiscord(w, r)
}

// discordPlace is a server and its channels, for the picker.
type discordPlace struct {
	GuildID  string            `json:"guildId"`
	Name     string            `json:"name"`
	Channels []discordChannelD `json:"channels"`
}

type discordChannelD struct {
	ChannelID string `json:"channelId"`
	Name      string `json:"name"`
}

// handleDiscordPlaces lists what the bot can see, so the allowlist can be built by
// choosing rather than by pasting ids.
//
// Listing is not access. A server appears here because somebody with authority over it
// added the bot; nothing is read from it until it is on the allowlist with Read set.
func (s *Server) handleDiscordPlaces(w http.ResponseWriter, r *http.Request) {
	discordMu.Lock()
	settings := s.readDiscord().Settings
	discordMu.Unlock()
	if settings.Token == "" {
		writeErr(w, http.StatusBadRequest, "connect a bot token first")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()
	client := discord.New(settings.Token)
	guilds, err := client.Guilds(ctx)
	if err != nil {
		writeErr(w, http.StatusBadGateway, "Couldn't ask Discord which servers it's in: "+err.Error())
		return
	}
	places := make([]discordPlace, 0, len(guilds))
	for _, guild := range guilds {
		place := discordPlace{GuildID: guild.ID, Name: guild.Name, Channels: []discordChannelD{}}
		// A guild whose channels cannot be listed is still worth showing: the bot is in
		// it, and "it is there but I cannot see its channels" is a permissions answer
		// the user can act on.
		if channels, err := client.Channels(ctx, guild.ID); err == nil {
			for _, channel := range channels {
				place.Channels = append(place.Channels, discordChannelD{ChannelID: channel.ID, Name: channel.Name})
			}
		}
		places = append(places, place)
	}
	writeJSON(w, http.StatusOK, map[string]any{"servers": places})
}

// handleDiscordSay sends one message as the bot, from the app.
//
// The manual half of "communicate with the user outside OppaiLib": it is also how a
// user checks the connection works without waiting for her to decide to say something.
// Subject to the same channel allowlist as everything else — a send endpoint that
// ignored it would be a hole straight through the policy above.
func (s *Server) handleDiscordSay(w http.ResponseWriter, r *http.Request) {
	var in struct {
		ChannelID string `json:"channelId"`
		Text      string `json:"text"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 8<<10)).Decode(&in); err != nil {
		writeErr(w, http.StatusBadRequest, "what should she say, and where?")
		return
	}
	discordMu.Lock()
	settings := s.readDiscord().Settings
	discordMu.Unlock()
	if settings.Token == "" || settings.BotUserID == "" {
		writeErr(w, http.StatusBadRequest, "connect a bot token first")
		return
	}
	channel, allowed := settings.channelFor(in.ChannelID)
	if !allowed || !channel.Write {
		writeErr(w, http.StatusForbidden, "she isn't allowed to post in that channel")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
	defer cancel()
	if _, err := discord.New(settings.Token).Send(ctx, in.ChannelID, in.Text); err != nil {
		s.auditDiscord(discordEventError, channelLabel(channel), "", "Couldn't post: "+err.Error())
		writeErr(w, http.StatusBadGateway, "Couldn't post that: "+err.Error())
		return
	}
	s.auditDiscord(discordEventReplied, channelLabel(channel), "", "Posted from the app.")
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// channelLabel names a channel for the audit log, preferring what a person would call
// it over its id.
func channelLabel(channel discordChannel) string {
	switch {
	case channel.Name != "" && channel.GuildName != "":
		return channel.GuildName + " #" + channel.Name
	case channel.Name != "":
		return "#" + channel.Name
	}
	return channel.ChannelID
}
