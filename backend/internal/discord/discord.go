// Package discord is a small, deliberately incomplete Discord bot client.
//
// It speaks the REST API over net/http and nothing else. There is no gateway
// connection, and that is a decision rather than an omission:
//
//   - The gateway needs a WebSocket implementation, which this project does not
//     otherwise have, and a full bot library is a large dependency to take on for one
//     optional feature in a self-hosted app.
//   - Reading messages over the gateway needs the privileged Message Content intent,
//     which has to be granted per application and is reviewed once a bot is in enough
//     servers. Reading the same messages over REST needs only the permissions the
//     server owner already granted the bot in the channel.
//   - What this is for is a mascot answering the person who owns the server, in a
//     handful of channels they picked. Second-scale latency from polling is fine for
//     that. Real-time presence is not the requirement.
//
// The cost is honest and worth stating: replies arrive a poll interval late, and
// nothing here sees typing indicators, reactions, or edits.
//
// Everything in this package is transport. It holds no policy: what may be read, what
// may be written, who is allowed to talk to her and how often are all decided by the
// caller. That separation is deliberate — the permission rules are the part worth
// auditing, and they should not be buried in an HTTP client.
package discord

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
)

// API is the Discord REST base. Pinned to a version so a future default cannot change
// the shape of what is parsed below without the change being made deliberately.
const API = "https://discord.com/api/v10"

// maxBody bounds a response read. Discord's payloads are small; anything approaching
// this is a sign something is wrong, not a large legitimate answer.
const maxBody = 4 << 20

// Client talks to Discord as a bot.
//
// One per token. Safe for concurrent use: the only mutable state is the rate-limit
// backoff, which is guarded.
type Client struct {
	token string
	http  *http.Client

	mu sync.Mutex
	// until is when the next request may be sent. Discord answers a 429 with how long
	// to wait, and honouring it is the difference between being throttled and being
	// banned — a bot that ignores 429s gets its whole token cut off.
	until time.Time
}

// New builds a client for a bot token. The token is used as-is; validation is
// Verify's job, so a caller can construct one and report a bad token as a bad token
// rather than as a construction failure.
func New(token string) *Client {
	return &Client{
		token: strings.TrimSpace(token),
		http: &http.Client{
			Timeout: 20 * time.Second,
		},
	}
}

// User is whoever sent a message, or the bot itself.
type User struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	// GlobalName is the display name Discord shows now; Username is the handle.
	GlobalName string `json:"global_name"`
	Bot        bool   `json:"bot"`
}

// Name is what to call this user on screen.
func (u User) Name() string {
	if u.GlobalName != "" {
		return u.GlobalName
	}
	return u.Username
}

// Guild is a server the bot has been added to.
type Guild struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// Channel is one channel in a guild, or a DM.
type Channel struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Type    int    `json:"type"`
	GuildID string `json:"guild_id"`
}

// Channel types. Only the ones that carry text conversation are of any use here; the
// rest are filtered out rather than offered as choices that cannot work.
const (
	ChannelText          = 0
	ChannelDM            = 1
	ChannelGroupDM       = 3
	ChannelAnnouncement  = 5
	ChannelPublicThread  = 11
	ChannelPrivateThread = 12
)

// Textual reports whether messages can be read from and written to this channel.
func (c Channel) Textual() bool {
	switch c.Type {
	case ChannelText, ChannelDM, ChannelAnnouncement, ChannelPublicThread, ChannelPrivateThread:
		return true
	}
	return false
}

// Message is one message in a channel.
type Message struct {
	ID        string `json:"id"`
	ChannelID string `json:"channel_id"`
	Content   string `json:"content"`
	Author    User   `json:"author"`
	Timestamp string `json:"timestamp"`
}

// At parses the message's timestamp, returning the zero time if Discord sent
// something unexpected. Never fatal: a message with an unreadable timestamp is still
// a message.
func (m Message) At() time.Time {
	t, err := time.Parse(time.RFC3339, m.Timestamp)
	if err != nil {
		return time.Time{}
	}
	return t
}

var (
	// ErrUnauthorized means the token is wrong, revoked, or not a bot token. Named so a
	// caller can tell "your token is bad" from "Discord is having a bad day", because
	// those need very different things said to the user.
	ErrUnauthorized = errors.New("discord: the bot token was rejected")
	// ErrForbidden means the token is fine but the bot lacks permission here. Also
	// named: it is the normal answer for a channel the bot was never given access to,
	// and it must not read as an outage.
	ErrForbidden = errors.New("discord: the bot does not have access to that")
	// ErrNoToken is the unconfigured case.
	ErrNoToken = errors.New("discord: no bot token is configured")
)

// do issues one authorised request, honouring the rate limiter in both directions.
func (c *Client) do(ctx context.Context, method, path string, body any, out any) error {
	if c.token == "" {
		return ErrNoToken
	}
	if err := c.waitForSlot(ctx); err != nil {
		return err
	}
	var reader io.Reader
	if body != nil {
		raw, err := json.Marshal(body)
		if err != nil {
			return err
		}
		reader = bytes.NewReader(raw)
	}
	req, err := http.NewRequestWithContext(ctx, method, API+path, reader)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bot "+c.token)
	// Discord asks bots to identify themselves, and a bot that does not is treated
	// with more suspicion by their abuse tooling.
	req.Header.Set("User-Agent", "DiscordBot (https://github.com/youruser/oppailib, 1.0)")
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("discord: %w", err)
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(resp.Body, maxBody))
	if err != nil {
		return fmt.Errorf("discord: %w", err)
	}
	switch {
	case resp.StatusCode == http.StatusTooManyRequests:
		c.backOff(retryAfter(resp, raw))
		return fmt.Errorf("discord: rate limited, retrying after %s", retryAfter(resp, raw))
	case resp.StatusCode == http.StatusUnauthorized:
		return ErrUnauthorized
	case resp.StatusCode == http.StatusForbidden:
		return ErrForbidden
	case resp.StatusCode < 200 || resp.StatusCode >= 300:
		return fmt.Errorf("discord: %s returned %s", path, resp.Status)
	}
	if out == nil || len(raw) == 0 {
		return nil
	}
	return json.Unmarshal(raw, out)
}

// waitForSlot blocks until the rate limiter says a request may go out.
func (c *Client) waitForSlot(ctx context.Context) error {
	c.mu.Lock()
	wait := time.Until(c.until)
	c.mu.Unlock()
	if wait <= 0 {
		return nil
	}
	// A long backoff is reported rather than slept through: the caller is a background
	// poll that would rather skip this round than hold a worker for a minute.
	if wait > 10*time.Second {
		return fmt.Errorf("discord: rate limited for another %s", wait.Round(time.Second))
	}
	select {
	case <-time.After(wait):
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

func (c *Client) backOff(d time.Duration) {
	if d <= 0 {
		d = time.Second
	}
	c.mu.Lock()
	if next := time.Now().Add(d); next.After(c.until) {
		c.until = next
	}
	c.mu.Unlock()
}

// retryAfter reads how long Discord asked us to wait, from the header or the body.
// Both are checked because which one is populated depends on whether the limit was
// per-route or global.
func retryAfter(resp *http.Response, body []byte) time.Duration {
	if header := resp.Header.Get("Retry-After"); header != "" {
		if seconds, err := strconv.ParseFloat(header, 64); err == nil && seconds > 0 {
			return time.Duration(seconds * float64(time.Second))
		}
	}
	var payload struct {
		RetryAfter float64 `json:"retry_after"`
	}
	if json.Unmarshal(body, &payload) == nil && payload.RetryAfter > 0 {
		return time.Duration(payload.RetryAfter * float64(time.Second))
	}
	return time.Second
}

// Verify checks the token and returns who the bot is.
//
// Also the source of the bot's own user id, which is what makes loop prevention
// possible: a bot that cannot recognise its own messages will answer them.
func (c *Client) Verify(ctx context.Context) (User, error) {
	var me User
	err := c.do(ctx, http.MethodGet, "/users/@me", nil, &me)
	return me, err
}

// Guilds lists the servers the bot has been added to.
//
// This is the whole of what "which servers can it see" means for a bot: it is in a
// server or it is not, and being added is an act by someone with authority there. The
// caller still has to allow each one — being in a server is not consent to read it.
func (c *Client) Guilds(ctx context.Context) ([]Guild, error) {
	var guilds []Guild
	err := c.do(ctx, http.MethodGet, "/users/@me/guilds?limit=100", nil, &guilds)
	return guilds, err
}

// Channels lists a guild's channels, textual ones only.
func (c *Client) Channels(ctx context.Context, guildID string) ([]Channel, error) {
	if !validSnowflake(guildID) {
		return nil, errors.New("discord: bad guild id")
	}
	var all []Channel
	if err := c.do(ctx, http.MethodGet, "/guilds/"+guildID+"/channels", nil, &all); err != nil {
		return nil, err
	}
	out := make([]Channel, 0, len(all))
	for _, channel := range all {
		if channel.Textual() {
			channel.GuildID = guildID
			out = append(out, channel)
		}
	}
	return out, nil
}

// Messages returns messages posted after the given message id, oldest first.
//
// after="" asks for the most recent one only, which is how a newly-allowed channel
// establishes where "now" is without replaying its history at the user.
func (c *Client) Messages(ctx context.Context, channelID, after string, limit int) ([]Message, error) {
	if !validSnowflake(channelID) {
		return nil, errors.New("discord: bad channel id")
	}
	if limit <= 0 || limit > 50 {
		limit = 20
	}
	path := "/channels/" + channelID + "/messages?limit=" + strconv.Itoa(limit)
	if validSnowflake(after) {
		path += "&after=" + after
	} else {
		path = "/channels/" + channelID + "/messages?limit=1"
	}
	var messages []Message
	if err := c.do(ctx, http.MethodGet, path, nil, &messages); err != nil {
		return nil, err
	}
	// Discord returns newest first; conversation reads the other way.
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}
	return messages, nil
}

// maxMessageLen is Discord's own limit for a message from a bot without nitro.
const maxMessageLen = 2000

// Send posts a message to a channel.
//
// Long content is truncated rather than split. A mascot's reply running past two
// thousand characters is a runaway generation, and answering it with a wall of four
// messages makes that worse.
func (c *Client) Send(ctx context.Context, channelID, content string) (Message, error) {
	if !validSnowflake(channelID) {
		return Message{}, errors.New("discord: bad channel id")
	}
	content = strings.TrimSpace(content)
	if content == "" {
		return Message{}, errors.New("discord: nothing to send")
	}
	if len(content) > maxMessageLen {
		content = strings.TrimSpace(content[:maxMessageLen-1]) + "…"
	}
	body := map[string]any{
		"content": content,
		// Nothing this bot says may ping anyone. A mascot that can be made to write
		// "@everyone" by asking it nicely is a hole in somebody else's server, and the
		// text is generated by a model reading text from strangers.
		"allowed_mentions": map[string]any{"parse": []string{}},
	}
	var sent Message
	err := c.do(ctx, http.MethodPost, "/channels/"+channelID+"/messages", body, &sent)
	return sent, err
}

// OpenDM opens (or reuses) the direct-message channel with one user.
//
// This is how she reaches the user outside the app at all. It is only ever called for
// a user the owner has explicitly allowed — Discord will happily open a DM channel
// with anyone the bot shares a server with, and the allowlist is what stops that
// meaning she can message them.
func (c *Client) OpenDM(ctx context.Context, userID string) (Channel, error) {
	if !validSnowflake(userID) {
		return Channel{}, errors.New("discord: bad user id")
	}
	var channel Channel
	err := c.do(ctx, http.MethodPost, "/users/@me/channels", map[string]any{"recipient_id": userID}, &channel)
	return channel, err
}

// validSnowflake reports whether an id is one of Discord's — a run of digits. Checked
// before every interpolation into a path, so an id from settings or a client cannot
// become path traversal or a query string.
func validSnowflake(id string) bool {
	if len(id) < 5 || len(id) > 24 {
		return false
	}
	for _, r := range id {
		if r < '0' || r > '9' {
			return false
		}
	}
	return true
}

// ValidSnowflake is the exported form, for callers validating ids out of settings
// before they ever reach a request.
func ValidSnowflake(id string) bool { return validSnowflake(id) }
