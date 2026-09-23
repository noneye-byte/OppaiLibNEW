package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/youruser/oppailib/internal/buildinfo"
	"github.com/youruser/oppailib/internal/settings"
)

// Libby looking after the box.
//
// She already knew the library's shape — how many things, of which kinds, what is
// thin — and the version and uptime rode along with it. What she did not know was
// whether the machine under it was well: that the media drive was nearly full, that
// four hundred pictures were waiting to be described, which model she herself was
// running on and what else was on disk to run instead, whether the generator was
// holding the card. Asked "how's the server doing?" she answered from the library
// counts and a guess.
//
// So there are two halves, with the line between them in the usual place:
//
//   - Knowing. A short "how the box is" section, gathered on a tight deadline and
//     only on turns that are about the server — or, whatever the turn, when something
//     is wrong enough that someone who lived there would mention it unprompted: a
//     drive nearly full. The alarm is the part of this that is looking after the
//     server rather than answering questions about it.
//   - Doing. A handful of admin actions — load a different model, describe the
//     backlog, clean up scratch, make the generator let go of the card — offered as
//     the same Allow cards as everything else she does. Offered only to an admin,
//     and checked again at /api/libby/act, because a model can be talked into writing
//     any tag at all and the second check is the one that holds.

// serverCue reads a message as being about the machine rather than the collection.
// Loose on purpose: a false positive costs a few hundred tokens of a section offered
// last, a false negative costs her not knowing the drive is full when asked.
var serverCue = regexp.MustCompile(`(?i)\b(server|box|machine|disk|drive|storage|space|full|backlog|queue|gpu|vram|graphics card|the card|model|models|load|unload|status|health|healthy|uptime|running|describe|describing|described|tagger|tagging|clean ?up|slow|lag|laggy|memory|ram|how'?s (?:it|everything) (?:going|running|holding))\b`)

// diskAlarmPercent is how full a drive has to be before she mentions it unasked. Above
// the settings page's own warning (which is for a person looking at a storage screen):
// this is for interrupting a conversation, and that needs to be worth it.
const diskAlarmPercent = 92

// serverStateTimeout bounds the whole snapshot. It runs on the chat path.
const serverStateTimeout = 3 * time.Second

// maxListedModels bounds the model names she is shown, so a models folder with sixty
// quantisations of the same thing does not become the prompt.
const maxListedModels = 16

// serverState is what she knows about the box on this turn.
type serverState struct {
	Version  string
	Uptime   time.Duration
	Drives   []driveState
	Tagger   string
	AutoTag  bool
	Describe describeState
	// ChatModel is the model she is running on; Window and Tier are how it is used.
	ChatModel string
	Window    int
	Tier      modelTier
	Eyes      bool
	// Models are the other models the chat backend could load, when it can be asked.
	Models        []string
	ModelControl  bool
	ImageGen      string // the generator's kind, "" when none is configured
	ImageGenDown  bool
	CardShare     string // "swap" or ""
	CardLent      bool
	Voice         string
	PendingUpload int64
}

type driveState struct {
	Label       string
	Free, Total int64
}

func (d driveState) percentUsed() int {
	if d.Total <= 0 {
		return 0
	}
	return int(100 - d.Free*100/d.Total)
}

type describeState struct {
	Enabled bool
	Pending int
	Running bool
}

// alarms are the things wrong enough to mention unasked.
func (st serverState) alarms() []string {
	var out []string
	for _, d := range st.Drives {
		if d.Total > 0 && d.percentUsed() >= diskAlarmPercent {
			out = append(out, fmt.Sprintf("the %s drive is %d%% full (%s left)", strings.ToLower(d.Label), d.percentUsed(), humanBytes(d.Free)))
		}
	}
	// Only the drive. A generator that is not answering is usually one switched off on
	// purpose, and one the user already knows about; saying so every evening is nagging.
	return out
}

// render is the prompt section. Plain facts, one per line, in her terms rather than the
// settings page's: she is told what is true and left to say it like herself.
func (st serverState) render(full bool) string {
	var b strings.Builder
	b.WriteString("\n\nHow the server you live on is doing right now (you look after it; say it in your own words, never as a report):")
	alarms := st.alarms()
	for _, a := range alarms {
		b.WriteString("\n- Needs attention: " + a + ".")
	}
	if !full {
		if len(alarms) > 0 {
			b.WriteString("\nMention it once, lightly, if the moment allows — the way someone who lives here would — and not again this conversation.")
		}
		return b.String()
	}
	fmt.Fprintf(&b, "\n- OppaiLib %s, up %s.", st.Version, humanDuration(int64(st.Uptime.Seconds())))
	for _, d := range st.Drives {
		if d.Total > 0 {
			fmt.Fprintf(&b, "\n- %s drive: %s free of %s (%d%% used).", d.Label, humanBytes(d.Free), humanBytes(d.Total), d.percentUsed())
		}
	}
	if st.PendingUpload > 0 {
		fmt.Fprintf(&b, "\n- Uploads in progress still expect %s.", humanBytes(st.PendingUpload))
	}
	tagging := "off"
	if st.AutoTag {
		tagging = "on for new imports"
	}
	fmt.Fprintf(&b, "\n- Tagger: %s, tagging %s.", st.Tagger, tagging)
	if st.Describe.Enabled {
		line := fmt.Sprintf("\n- Vision model: %d items still have no description", st.Describe.Pending)
		if st.Describe.Running {
			line += ", and it is working through them now"
		}
		b.WriteString(line + ".")
	}
	if st.ChatModel != "" {
		eyes := "reads pictures as the tagger's words"
		if st.Eyes {
			eyes = "can see pictures directly"
		}
		fmt.Fprintf(&b, "\n- You are running on %s (%s-model settings, a %d-token window, %s).", st.ChatModel, st.Tier, st.Window, eyes)
	}
	if len(st.Models) > 0 {
		b.WriteString("\n- Other chat models on disk: " + strings.Join(st.Models, ", ") + ".")
	}
	switch {
	case st.ImageGen == "":
		b.WriteString("\n- No image generator is connected.")
	case st.ImageGenDown:
		b.WriteString("\n- The image generator is configured but not answering.")
	default:
		line := "\n- Image generator: " + st.ImageGen
		if st.CardShare == "swap" {
			line += "; it takes turns with you on the graphics card"
			if st.CardLent {
				line += ", and has it right now"
			}
		}
		b.WriteString(line + ".")
	}
	if st.Voice != "" {
		b.WriteString("\n- Your voice: " + st.Voice + ".")
	}
	return b.String()
}

// gatherServerState takes the snapshot. model, window and tier are what the chat turn
// already knows; admin says whether to spend a request listing the other models, since
// only an admin can be offered one.
//
// full=false is the every-turn check for alarms, and reads the drives and nothing else:
// a local syscall. Everything that asks another service — the generator, the chat
// backend's model list — is for a turn about the server, because a service that is
// switched off answers with a timeout, and that timeout would be added to every reply.
func (s *Server) gatherServerState(ctx context.Context, cur settings.Settings, model string, window int, tier modelTier, admin, full bool) serverState {
	ctx, cancel := context.WithTimeout(ctx, serverStateTimeout)
	defer cancel()
	st := serverState{
		Version:   buildinfo.String(),
		Uptime:    time.Since(s.startedAt),
		Tagger:    s.ai.TaggerName(),
		AutoTag:   cur.AIEnabled && cur.AIAutoTag,
		ChatModel: model,
		Window:    window,
		Tier:      tier,
		Eyes:      chatSeesPictures(cur.ChatVision, model) && !knownBlind(cur.ChatURL, model),
		CardShare: cur.GPUShare,
		CardLent:  s.card.parkedModel() != "",
	}
	// The drives that matter to her: where the library lives, and where the database
	// does when that is a different volume. The rest of the storage page's mappings are
	// small, and walking them is not a thing to do before every reply.
	seen := map[string]bool{}
	for _, d := range []struct{ label, path string }{{"Media", s.cfg.MediaDir}, {"Database", dirOf(s.cfg.DBPath)}} {
		free, total, err := diskSpace(d.path)
		if err != nil || total <= 0 {
			continue
		}
		key := fmt.Sprint(free, total)
		if seen[key] {
			continue // the same volume, already reported
		}
		seen[key] = true
		st.Drives = append(st.Drives, driveState{Label: d.label, Free: free, Total: total})
	}
	if !full {
		return st
	}
	if pending, err := s.db.LiveUploadBytes(ctx); err == nil {
		staged, _ := s.db.UploadStagingBytes(ctx)
		st.PendingUpload = max(0, pending-staged)
	}
	if cur.VisionEnabled {
		st.Describe.Enabled = true
		st.Describe.Pending, _ = s.db.CountUndescribed(ctx)
		s.describe.mu.Lock()
		st.Describe.Running = s.describe.backfilling
		s.describe.mu.Unlock()
	}
	if cur.ImageGenURL != "" {
		if kind, err := s.imagegen.Backend(ctx, cur.ImageGenURL); err == nil {
			st.ImageGen = string(kind)
		} else {
			st.ImageGen, st.ImageGenDown = "configured", true
		}
	}
	switch cur.TTSEngine {
	case "off":
		st.Voice = "switched off; the devices speak for you"
	case "openai":
		st.Voice = "a speech server on the network"
	default:
		if s.speaker != nil && s.speaker.Piper() != nil {
			st.Voice = "piper, on this server"
		} else if cur.TTSURL != "" {
			st.Voice = "a speech server on the network"
		}
	}
	if admin {
		st.Models, st.ModelControl = s.chatModelNames(ctx, model)
	}
	return st
}

// chatModelNames lists what the chat backend could load instead of current, when it is
// a backend that can be asked. The bool says whether it can.
func (s *Server) chatModelNames(ctx context.Context, current string) ([]string, bool) {
	status, raw, err := s.chatBackendRequest(ctx, http.MethodGet, "/v1/internal/model/list", nil)
	if err != nil || status < 200 || status >= 300 {
		return nil, false
	}
	var list struct {
		ModelNames []string `json:"model_names"`
	}
	if json.Unmarshal(raw, &list) != nil {
		return nil, false
	}
	var out []string
	for _, name := range list.ModelNames {
		if name = strings.TrimSpace(name); name != "" && !strings.EqualFold(name, current) && !strings.EqualFold(name, "None") {
			out = append(out, name)
		}
	}
	sort.Strings(out)
	if len(out) > maxListedModels {
		out = out[:maxListedModels]
	}
	return out, true
}

// matchModelName resolves the model she named against the list: exact first, ignoring
// case, then the one name that contains what she wrote. Two candidates is no match —
// "the 24B" on a disk with three 24Bs is a question for the user, not a guess.
func matchModelName(asked string, names []string) (string, bool) {
	asked = strings.Trim(strings.TrimSpace(asked), wrappingQuotes)
	if asked == "" {
		return "", false
	}
	for _, n := range names {
		if strings.EqualFold(n, asked) {
			return n, true
		}
	}
	found := ""
	for _, n := range names {
		if strings.Contains(strings.ToLower(n), strings.ToLower(asked)) {
			if found != "" {
				return "", false
			}
			found = n
		}
	}
	return found, found != ""
}

func dirOf(path string) string {
	if i := strings.LastIndexAny(path, `/\`); i > 0 {
		return path[:i]
	}
	return path
}

// ── the admin actions, once allowed ─────────────────────────────────────────

// actServer performs one of the server actions the user has approved.
//
// Admin-only, checked here whatever the card said: the offer is only made to an admin,
// but this endpoint is reachable by any signed-in user and the offer is a string a
// model wrote. 403 rather than 401 — a 401 from any endpoint signs the web client out.
//
// Each answers with a message the card shows in place of its generic "Done", because
// "Done" under "Load a different chat model" does not say that she is gone for the next
// ninety seconds.
func (s *Server) actServer(w http.ResponseWriter, r *http.Request, cur settings.Settings, req actRequest) {
	if u, ok := s.chatUser(r); !ok || !u.IsAdmin {
		writeErr(w, http.StatusForbidden, "only an admin can do that")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()
	switch req.Kind {
	case "load":
		names, controllable := s.chatModelNames(ctx, "")
		if !controllable {
			writeErr(w, http.StatusConflict, "this chat backend cannot load models over its API")
			return
		}
		name, ok := matchModelName(req.Prompt, names)
		if !ok {
			writeErr(w, http.StatusBadRequest, "that model is not on the chat backend")
			return
		}
		if !s.modelMu.TryLock() {
			writeErr(w, http.StatusConflict, "another model operation is already in progress")
			return
		}
		// A card lent to the generator would otherwise be handed back to the *old*
		// model once it went quiet, undoing what was just approved.
		s.forgetParkedCard()
		// In the background, like a load from the models page: minutes off a cold disk,
		// and a closed tab must not abandon the backend with nothing resident.
		go func() {
			defer s.modelMu.Unlock()
			loadCtx, done := context.WithTimeout(context.Background(), modelLoadTimeout)
			defer done()
			if err := s.loadRemembered(loadCtx, name); err != nil {
				s.log.Error("libby: approved model load failed", "model", name, "err", err)
				return
			}
			s.log.Info("libby: approved model load", "model", name, "user", userFrom(r))
		}()
		writeJSON(w, http.StatusAccepted, map[string]any{"message": "Loading " + name + " — she'll be back in a minute or two."})
	case "cleanup":
		captured := s.delegate(r, s.handleStorageCleanup, http.MethodPost, "/api/storage/cleanup", map[string]any{})
		if captured.status < 200 || captured.status >= 300 {
			relay(w, captured)
			return
		}
		var out struct {
			FreedHuman string `json:"freedHuman"`
		}
		_ = json.Unmarshal([]byte(captured.body.String()), &out)
		writeJSON(w, http.StatusOK, map[string]any{"message": "Cleaned up — freed " + out.FreedHuman + "."})
	case "describe":
		if !cur.VisionEnabled {
			writeErr(w, http.StatusServiceUnavailable, "no vision model is configured")
			return
		}
		pending, _ := s.db.CountUndescribed(ctx)
		if !s.startDescribeBackfill() {
			writeJSON(w, http.StatusOK, map[string]any{"message": "Already working through them."})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"message": fmt.Sprintf("Describing %d items in the background.", pending)})
	case "free":
		if cur.ImageGenURL == "" {
			writeErr(w, http.StatusServiceUnavailable, "image generation is not configured")
			return
		}
		if err := s.imagegen.FreeMemory(ctx, cur.ImageGenURL); err != nil {
			writeErr(w, http.StatusBadGateway, err.Error())
			return
		}
		s.card.mu.Lock()
		s.card.freed = true
		s.card.mu.Unlock()
		writeJSON(w, http.StatusOK, map[string]any{"message": "The generator has let go of the card."})
	}
}
