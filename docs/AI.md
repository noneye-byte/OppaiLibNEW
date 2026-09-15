# Local AI auto-tagging

OppaiLib tags media **entirely on your hardware**. Nothing is sent anywhere.

## Libby chat

The Chat tab talks to an OpenAI-compatible LLM on your own network. Configure it
from **Settings → Libby chat**, or set a startup default:

```env
OPPAI_CHAT_URL=http://192.168.1.10:5000/v1
# Optional fallback for generic OpenAI-compatible servers:
OPPAI_CHAT_MODEL=your-local-model-name
```

The URL may be the server root or its `/v1` base; OppaiLib normalizes it before
calling `/v1/chat/completions`. LM Studio, llama.cpp server, and Ollama's
OpenAI-compatible bridge can all expose this shape. For text-generation-webui,
load and unload models in its own WebUI (or startup configuration). OppaiLib only
checks readiness and sends generation requests; its model controls are deliberately
read-only to avoid racing or destabilizing the backend container.
Conversation history stays in the current web/Android screen and is sent only to
that configured endpoint.

**Which model.** Libby is a text-protocol workload — a dozen-odd silent tags
(`[mood:]`, `[link:]`, `[send:]`, `[remember:]`, `[want:]`, …) that a small model
has to keep obeying inside an 8K window — so instruction-following matters more
than prose. On an 8 GB card the recommended pick is an **abliterated Qwen3.5‑9B**
at `Q4_K_M` (~5.6 GB, text-only build; the chat model never receives images, shared
photos reach it as the local tagger's words). A Mistral‑Nemo‑12B roleplay merge at
`IQ4_XS` trades some obedience for a better voice. Reasoning models are told not to
think: every request carries `enable_thinking: false` (text-generation-webui) and
`chat_template_kwargs.enable_thinking: false` (llama.cpp server, vLLM), and a
`<think>` block that leaks anyway is stripped before the reply is parsed, so no
loader-side switch is required. Libby's Sweet, Playful, Bold, and Roleplay modes change
the local system prompt; the latter modes permit consensual adult NSFW chat.

**How the window is spent.** The prompt is built for the turn, not copied from a
template. Her card and the tag protocol are fixed; everything else is a ranked,
optional section, and the library is fed by what the message says rather than as one
block — the collection's shape is always offered, the items your words match are
looked up through the same index that resolves her links, and the recommendation
shortlists and recent additions arrive only when you ask for something to watch or
what is new. Sections the turn has no use for (her selfie catalogue on a message
about the weather, the action vocabulary on small talk, the rooms she can move to
when nobody is on a call) are offered last and cleared first, and the reply's budget
report names what was cleared apart from what genuinely did not fit. Every message in
the history carries what it attached — a photo's tags, a library item's title — so
she can talk about a picture from earlier in the evening, and a quoted reply is
resolved back to the whole message it points at.

Prefer OppaiLib without the mascot? **Settings → Libby → Hide Libby** (per-device;
the Android app has the same switch in its settings) removes the artwork from the
login screen, error popups, and Chat. The features stay — errors show as plain
messages and chat keeps working.

### How she looks and moves

Libby is pixel art, in five intensity tiers × five moods. The pre-pixel artwork
has been removed — the bundled wardrobe covers every mood at every tier, so there
is nothing left to fall back to and nothing that could fall back to a file the
build no longer ships.

The wardrobe art is a **cowboy shot** — head to mid-thigh, 1024×1344 — and every
surface frames it as one. Beside the chat it stands in a portrait column laid
out from the top at its own aspect, as wide as the column, so her face is where a
reader looks first; where the column does not fit (under about 960px, and on the
phone) a banner along the top of the conversation crops the same art at the
chest, a bust rather than a figure shrunk into a strip, and tapping it opens the
call. On the call she stands on the bottom edge of the frame, cut at the thigh.
Her **profile picture** — the message list, the chat list, the header, the
bubbles — is a separate face crop (`default-libby-pfp.png`), because a pfp is a
face and the sprite in a 34px circle was a silhouette; a picture set on her
character card replaces it. On a wide screen the **call is the screen**: she and
her room take the main pane and the conversation moves into a sidebar with the
same log and composer, so nothing is lost by picking up.

She speaks through a retro dialogue box: her sprite in a framed portrait window,
a nameplate, a stepped pixel frame, and the line typed out with a blinking marker
when it finishes. The box is sized by the whole line from the first frame, so it
does not crawl across the screen while typing.

Her motion is one shared vocabulary (`web/src/libby-motion.ts`) rather than four
per-screen imitations of it: she steps in, breathes while idle, rocks into each
line, and jolts on an error. Everything is stepped rather than eased — smooth
interpolation on a pixel sprite reads as a smooth image being nudged around — and
all of it is off under `prefers-reduced-motion`.

Outside a conversation she is capped at the flirty tier. The sign-in page and the
pop-up appear unasked, over whatever you were doing, on a screen that may have
someone else in the room; the heated and peak artwork stays in Chat, where you
chose to be.

### The character card

**Chat → settings → Character card** edits whoever you are talking to, Libby
included — her built-in card is editable and a workspace saved before a field
existed picks up the shipped default for that field only, never overwriting
something you have written.

Two fields do more than describe:

- **Appearance** is written as short picture tags (`long orange hair, red eyes,
  glasses`) rather than prose, because it is also matched against the local
  scanner's output when you share a photo — and a whole feature has to fit inside
  one tag to count. Two of the character's own features in one picture and she is
  told it is a picture of *her*, so she reacts to seeing herself rather than
  describing a stranger. Libby ships knowing she has long orange hair, red eyes,
  and black-framed glasses.

  This field is the **constant** likeness only. What she has on is separate,
  because it moves — see below.
- **Kinks and turn-ons** colours what she notices and steers towards. It is
  explicitly not a list to recite, and it is dropped the moment you take the
  conversation elsewhere.

### What she is wearing

Libby's sprite undresses as the session meter climbs, so she is told what she has
on at the tier that is currently drawn — Calm and Warm in a black tank top and
orange sweatpants, Flirty down to the bra, Heated and Peak past that. The
description tracks the bundled artwork exactly: a character talking about her
hoodie beside a picture of her in something else breaks the illusion harder than
saying nothing.

Wearing one of your own **outfits** replaces that. The sprite is yours, so the
tier table no longer describes it and she is simply told the outfit's name. Which
outfit is worn is a per-device choice the server never stores, so the client sends
its id with each turn and the server resolves the name; an outfit deleted since it
was selected falls back to the bundled wardrobe rather than naming something that
no longer exists.

### Pictures she sends

A character can attach one of her own pictures to a reply, chosen by tag from the
gallery under **Chat → settings → Images**. Pictures already seen in a
conversation are held back: she is told which ones she has already sent and asked
not to repeat them, and the server will not attach one regardless of what she
asks for. Asking her for a picture lifts that — "send me that one again" works,
though never with the file already on screen. An *unrequested* picture needs two
matching tag words before it rides along, so a chat that happens to mention a
bedroom no longer produces the same bedroom photo every turn.

### Linking things from the library

Libby can point at anything in your collection: she writes the title, and the
client draws it as a chip that opens the item — and the name itself, where it
sits in her sentence, is the link. Resolution happens on the server against your
own database: by title and by tag across the whole library, since tags are the
only searchable text a title's encryption leaves in the clear. A title she has
invented resolves to nothing and is left as her own words rather than a broken
link.

She is taught one tag, `[link: <title>]`, and a small model half-remembers it in
several ways. Every shape that used to come out as a pretend hyperlink now
resolves: a markdown link to nowhere (`[Title](…)`), a wiki-style `[[Title]]`, a
bare `[Title]`, `[Link: …]`, `[item: …]`, the title quoted inside the tag — and a
real title she simply wrote in quotes or emphasis with no tag at all. The last
two are exact-only, so `[laughs]` and `*leans in*` stay prose. A title she
writes exactly beats a newer item that shares most of its words.

### Which one she reaches for

When she attaches something by description — "a girl with brown hair" — and ten
items fit equally, the pick used to be the newest, every time. It is now drawn
from everything that fits the request the same, and drawn with her own taste on
the die: the words of her **kinks** and her standing **wants** are matched
against the items' tags, so with a want for skirts on file she reaches for the
one in a skirt, and what is left after that is random. Taste only ever decides
between equal fits; it never promotes something that fits the request worse, and
items already shown in the conversation are skipped before the draw rather than
after it.

### Browsing together

The **Together** tab is the library with her sitting next to you. Click a tile and
she reacts to it; the shelf you are looking at travels with the request as ids
only, and the server reads the titles and tags out of the database, so what she is
told about your collection is what your collection actually says. "Pick something
for me" asks her to choose, and she answers with a link you can open.

Nothing said in a browse-together session is filed in your chat history — it is a
running commentary, not correspondence — but the mood meter is shared with Chat,
so where you leave her is where you find her. Web only for now; the Android app
gets the card fields and the no-repeat picture fix, not this screen.

### Outfits

**Settings → Libby → Outfits** is the outfit creator: an outfit is a named set of
replacement artwork across neutral, happy, mischievous, surprised, thinking,
shy, smug, sad, annoyed, sleepy, loving, and excited. On the web, drag and drop
an image onto each emotion slot; on Android, tap a slot and pick an image. Outfit
Helper in Create can step through the same twelve expressions at each of the five
heat tiers, producing all sixty slots in order. Outfit art is stored encrypted on
the server beside the config; which outfit Libby *wears* is a per-device choice,
and an emotion or tier an outfit doesn't cover falls back to the closest bundled
art.

### Wants of her own

Libby keeps her own standing wants the same way she keeps what she has learned
about you: quietly, from her own replies, in an encrypted file per user
(`libby-wants.json.enc`, sibling to her memory) that carries between
conversations. They are hers, not a to-do list of yours — an outfit she'd like to
wear, media she wishes were on the shelves, how she wants a night to go — and she
raises them herself, now and then, in her own voice rather than as an offer to
help. They are grounded in what is actually here: she is told where the collection
is thin or empty, so a craving is prompted by a real gap rather than invented. A
want for media can resolve through the ordinary approve-first proposal — she offers
to have something made or added and nothing happens until you press **Allow**, the
same gate as everything else she does to the library. A want for an outfit has no
such lever (outfits are art you drop in), so it stays conversation. She keeps a
small handful and voices them rarely; most replies carry none. **Chat → settings →
your profile** lists what she has been wanting, alongside what she remembers, and
lets you drop any of it or clear it all. Web only for now, like Outfits and Memory.

### Where you left off

Beyond the facts she keeps and the wants she carries, Libby keeps a single standing
sense of *the two of you* — a third encrypted file per user (`libby-bond.json.enc`,
sibling to memory and wants), written from her own turns. It holds when you last
talked, the mood she ended on, an arousal baseline, how close you've grown, and any
pet name she's settled on. So conversations stop opening cold: she meets the time
that's actually passed (picking up mid-thought after minutes, noting it's been a
while after days), carries her mood in instead of resetting to blank, and warms up
over the days you keep talking rather than treating every night like the first.

Her heat is her own weather now. The baseline **cools while you're away** — hot if
you stopped mid-scene, calm days later — so she can reopen still a little warmed up
and take the lead herself, or start soft and sated after a peak, rather than only
ever reacting to you. When a fresh chat opens, the meter is seeded from that decayed
baseline (capped at the flirty tier, so she reopens warm but never at peak out of
nowhere) and the sprite opens in her carried mood; an ongoing conversation keeps its
own heat. The pet name rides the same silent tag protocol as her wants — she settles
on it in her own replies, you never see the tag, and it persists.

Want payoff leans on what's already there: she's told the library's recent arrivals
and its gaps, so when something she'd been wanting turns up on the shelves she
notices it and is pleased — that's hers arriving, not a task closed. **Chat →
settings → your profile** shows where you stand — last talked, her mood, how close,
the name she calls you — with **Start fresh** to reset just the bond (your memories
and her wants are kept). Web only for now, like Memory, Wants, and Outfits.

### Texting, not request-and-response

A longer reply arrives the way a person texts — as two or three short messages
sent back to back rather than one paragraph — with the typing indicator stopping
and starting between them. And if a conversation with Libby goes quiet for a few
minutes after *she* spoke, and the tab is still open in front of you, she sends one
unprompted follow-up to pick it back up: exactly once per lull, not a loop. (That
is separate from **autopilot**, the toggle that lets her keep the conversation
going continuously — this is just her not wanting to be left on read.)

### Reading, reacting, and what she reaches for

You can keep sending while she reads and while she replies. A text lands as
**Sent**; after a moment she picks the phone up, the receipt under your latest one
turns to **Read**, the dots start, and she answers the whole burst at once — the
server folds a run of your texts into one turn, so "wait" / "actually the beach one"
/ "and send a pic" is one request in three bubbles. Anything you send while she is
typing is answered by another turn straight after. Her replies split on the blank
lines she is told to text with, whatever their length, so a two-line text is two
bubbles.

She can **react** to a message — a heart, a laugh, eyes — instead of, or as well as,
replying, and a reaction alone is a legal turn. You can react to hers (hover or
long-press), and she is told about it on the next turn. **Swipe** a message sideways
on a phone to quote it in your reply. A **snap** is a selfie sent to be seen once: a
tile you tap, full-screen until you tap it away, and then "Opened" — the picture
stays in her gallery, but the log never shows it again.

Which picture she sends is a weighted draw, not the best match: everything already
shown this conversation is penalised (and the one on screen a message ago is
withheld outright), so "send me another" reaches for something new until the
gallery is spent, and a declared send always finds *something* rather than arriving
as "here you go" with nothing under it. **Chat → settings → Images** sets how readily
she reaches for each picture (never / rarely / normal / often) and weights **tags** —
more of this, less of that, none of the other — which apply to every picture and
library item carrying the tag, so a video collection can be steered the same way.

Her memory no longer depends entirely on the model thinking to file a note: when you
state something about yourself in so many words — your name, where you live, what
you do, what you love or hate, a line not to cross — it is kept whether or not she
wrote the tag, and if you ask what she remembers about you, she tells you.

## Image generation

The Create tab drives a local image generator, configured by URL under
**Settings → Import & scraping → Image generation** (or `OPPAI_IMAGEGEN_URL`).
Two backends are supported and auto-detected:

- **InvokeAI** (4.0+) — models and LoRAs come from its model manager; generation
  runs through its session queue with the standard txt2img graph (SD 1.x/2.x and
  SDXL; LoRAs whose base doesn't match the chosen model are skipped). InvokeAI
  keeps every finished image in its own gallery, and the studio's **Gallery**
  panel (a tab on Android) browses those boards, expands images, deletes them
  from InvokeAI, or saves one into the library — which remains the only way an
  image enters the library.
- **Automatic1111 / SD.Next** — anything exposing `/sdapi/v1`. LoRAs are applied
  as `<lora:name:weight>` prompt tokens.

With an InvokeAI backend the studio also offers:

- **Model/LoRA editing** — the ✎ on a picker card opens the record as InvokeAI's
  model manager holds it: name, description, trigger phrases, and recommended
  settings (steps, CFG, size, scheduler, VAE; a LoRA's recommended weight).
  Edits are written back to InvokeAI, so both UIs stay in sync.
- **A Civitai browser** — the catalogue, proxied through the server via the
  civitai.red mirror, on three pages. *Browse* searches with the site's own
  filters (type, base model, period, category, creator, NSFW, seven sorts) and
  opens a model's page: its description, tags, every version with its files,
  hashes and trigger words, and the pictures people posted with it — each with
  the prompt and settings behind it, which "Use in the studio" loads into the
  form. *My account* is whoever the API key belongs to, with their models and
  posted pictures. *Installed* is the studio's own models seen from the
  catalogue's side, matched by file hash (InvokeAI and Civitai both publish
  BLAKE3), with a note when a newer version has been published.

  **Installing** hands a version's download URL to InvokeAI, which fetches the
  file on its own box. Once the download completes, the server writes the
  catalogue's description (as plain text), the version's trained words (as
  trigger phrases) and its first showcase image (as cover art) onto the InvokeAI
  record, so the model arrives looking the way it did on the site rather than
  as a bare filename with a black tile. The same dressing is one click away for
  models that were already there ("Fetch from Civitai"), and a file the
  catalogue does not know by hash can be linked by pasting a version id.

  Two things the public API does not offer, so neither does this: **uploading**
  (the site's own uploads go through an internal tRPC/S3 flow), and the
  **prompts behind posted pictures without an API key** — add yours under
  Settings → Image generation and the gallery shows them.

## Describing pictures in prose

The tagger says what is in a picture as a word list. A **vision model** — a
local multimodal LLM — says it as a sentence or three: who is where, doing
what, in what style. Configure one under **Settings → AI → Describing
pictures**, or set a startup default:

```env
OPPAI_VISION_URL=http://192.168.1.10:11434/v1
OPPAI_VISION_MODEL=qwen2.5vl:7b
```

Any OpenAI-compatible chat endpoint whose model accepts images works: Ollama or
LM Studio with a llava, qwen-vl, minicpm-v or gemma3 build, llama.cpp server
with an mmproj, vLLM. It is a separate endpoint from Libby's chat backend
because her text model is picked for obedience inside an 8K window and is
usually a text-only build. Frames are sent as base64 JPEGs downsized to 1024px;
nothing leaves the LAN.

What it describes: a picture as itself; a GIF as four composited frames; a
video as six frames chosen by scene, the same way the tagger chooses them,
shown to the model as a sequence so it narrates the clip rather than describing
six unrelated pictures. The tagger's tags ride along as hints, which makes a
small vision model markedly more accurate — so on import, with **Describe on
import** on, describing runs after tagging. Comics and games are not pictures.

The description is stored like a note — AES-256-GCM-encrypted, `description_enc`
— decrypted into the search index (so "red dress balcony" finds the picture the
model described that way), shown in the viewer with a **Describe** button beside
**Auto-tag**, editable by hand, and handed to Libby beside the tags when a
picture comes up in chat, so she answers about what is in it rather than reading
six tags back. **Describe what has none** on the settings page walks the library
in the background, one item at a time; **Test** sends the model a generated
picture so a wrong URL or a text-only model is found out before the first import.

## What gets tagged

| kind | frames tagged | needs ffmpeg |
|------|---------------|--------------|
| image | the image | no |
| gif | up to N frames, evenly sampled across the animation | no |
| video | N or more frames, taken from the clip's scenes | **yes** |
| comic, game | not yet — see Roadmap | — |

`N` defaults to 5 and is set by `OPPAI_AI_VIDEO_FRAMES`. For video it is a
**floor**, not a fixed budget: five frames cover a thirty-second clip well and
leave a thirty-minute one nearly blind, so a longer clip is sampled at more than
`N` — roughly one extra frame per 20 seconds of runtime, capped at 32. A GIF still
uses exactly `N`.

**Scene-aware sampling.** Rather than sampling on a fixed clock, the tagger first
asks ffmpeg where the picture changes enough to read as a cut (the `scene` metric,
computed on a 320px-downscaled copy so it stays cheap) and samples from the scenes
between those cuts. Every scene contributes at least one frame; when the frame
budget exceeds the scene count the leftover frames deepen the longest scenes, and
when there are more scenes than budget the frames are spread evenly across them.
This is what lets the tags describe *what happens* in a clip rather than whatever
happened to line up with a timestamp. Scene detection decodes the whole stream, so
it runs under its own 4-minute timeout; if it fails or times out — or the clip has
no detectable cuts — the tagger falls back to even sampling across the middle 90%
of the clip. Without ffmpeg, video tagging is skipped entirely (below).

Each sampled frame is tagged independently and the results are merged, keeping
the **highest** confidence seen for each tag. A tag that is only true of one
scene is still true of the clip, so max wins over mean. In a densely sampled clip
(8+ frames), a general tag seen in a single frame at middling confidence is dropped
as a likely decode/seek artefact — strong single-frame tags, characters, and the
rating are always kept.

Video frames are extracted at the source's native resolution, so
resolution-sensitive tags describe the video rather than a downscaled poster.
Animated GIF frames are composited onto a running canvas (honouring each frame's
disposal method) before tagging — the raw frames stored in a GIF are usually
partial deltas, not whole pictures.

If `ffmpeg` is not installed, video auto-tagging is skipped with a warning and
everything else keeps working, exactly like video poster generation.

## Two modes

### 1. ONNX + JoyTag (default image)
The default image (`--target runtime-onnx`) bakes in
[ONNX Runtime](https://onnxruntime.ai/) and
[JoyTag](https://huggingface.co/fancyfeast/joytag), so real content tagging works
with no setup. It emits ~5000 Danbooru-vocabulary `general` tags, each scored
independently, at `threshold` (0.4) or above.

**Why JoyTag.** This library holds photographs *and* drawn art, and it needs NSFW
tags on both. A wd14 tagger is trained on Danbooru alone — point it at a photo and
it has nothing true to say, so it either goes quiet or invents anime tags for a
real person. JoyTag is a ViT over the same tag vocabulary but deliberately trained
past that domain onto photographic content, with NSFW concepts as an explicit goal
rather than an embarrassment. One model covers both halves of the library, and —
because it is one vocabulary — a tag search spans them. It is also fully open and
self-hostable (no API, no licence phone-home), runs on CPU and accelerates on GPU,
and ships as a plain `model.onnx` + `top_tags.txt`, so it stays swappable.

**What you give up.** JoyTag has no `rating` label, so items get no
`general`/`sensitive`/`questionable`/`explicit` verdict — the explicit *content*
tags carry that instead. It is also a little weaker than wd14 v3 on pure anime,
which is the trade for it working on photographs at all. If your library is
anime-only and you want the rating back, wd14 is still fully supported — see
[Swapping the model](#swapping-the-model).

### 2. Heuristic (lean image, always available)
The `:lean` tag (`--target runtime`) is a **cgo-free** image with no model and no ONNX Runtime.
It emits structural `meta` tags (`portrait`/`landscape`/`square`, `high-res`) and
records image dimensions. It is also the automatic fallback whenever the ONNX
tagger cannot load — a missing model, a bad `model.json` — so tagging degrades
rather than breaks. Check the startup log for the reason.

## Swapping the model

Any single-input image classifier that emits a 1×N score vector works. Drop the
files in a directory and point `OPPAI_AI_MODEL_DIR` at it:

```
/opt/oppailib/models/          # baked-in default; override the env var to move it
├── model.onnx
├── top_tags.txt               # or a wd14 selected_tags.csv — see below
└── model.json                 # tells OppaiLib how to feed the model
```

> `/config` is a bind mount on most setups (including the Unraid template), which
> would **hide** anything baked underneath it. That is why the model lives at
> `/opt/oppailib/models` rather than `/config/models`. If you would rather manage
> the model from the host, put it in `/config/models` and set
> `OPPAI_AI_MODEL_DIR=/config/models`.

**Back to a wd14 tagger** (anime-only, but it restores the `rating` verdict and is
a little sharper on illustrated content):

```
--build-arg MODEL_REPO=SmilingWolf/wd-vit-tagger-v3 \
--build-arg MODEL_LABELS=selected_tags.csv
```

and edit the generated `model.json` to wd14's contract — it wants raw 0–255 **BGR**
pixels in **NHWC** and already ends in its own activation, i.e. `"layout": "nhwc"`,
`"bgr": true`, `"scale": 1.0`, no `mean`/`std`, `"activation": "none"`,
`"threshold": 0.35`, `"character_threshold": 0.85`. The other v3 variants
(`wd-swinv2-tagger-v3`, `wd-convnext-tagger-v3`) use the same contract.

Anything else that is a single-input image classifier emitting a 1×N score vector
works too — describe it in `model.json`.

### Label files
Two formats are accepted, both index-aligned to the model's output vector:

- **`*.csv`** — a wd14 `selected_tags.csv` (`tag_id,name,category,count`). The
  numeric category column maps to `0 → general`, `4 → character`, `9 → rating`;
  anything else falls back to `category` from `model.json`. Underscores in tag
  names become spaces. A header row is detected and skipped.
- **anything else** — one tag per line, all assigned `category`.

An off-by-one row in this file silently shifts *every* tag, so it must match the
model exactly.

### `model.json`
Every field is optional — `{}` is valid. Tensor names, input size and layout are
read from the ONNX graph itself, because tagger exports disagree wildly on names
(`input_1:0`, `input`, `pixel_values`).

This is the baked-in default (JoyTag): CLIP-normalized RGB in NCHW.

```json
{
  "model": "model.onnx",
  "labels": "top_tags.txt",
  "layout": "nchw",
  "scale": 0.00392156862745098,
  "mean": [0.48145466, 0.4578275, 0.40821073],
  "std":  [0.26862954, 0.26130258, 0.27577711],
  "activation": "sigmoid",
  "threshold": 0.4,
  "category": "general"
}
```
| field | default | meaning |
|-------|---------|---------|
| `model` | `model.onnx` | onnx file name |
| `labels` | `labels.txt` | label file (see above) |
| `input_name` / `output_name` | from the graph | graph tensor names |
| `input_size` | from the graph | square side the model expects (e.g. 448) |
| `layout` | from the graph | `nchw` or `nhwc` tensor layout |
| `bgr` | `false` | swap RGB→BGR (wd14 wants BGR; JoyTag does not) |
| `scale` | `1/255` | pixel multiplier (`1.0` keeps 0–255, as wd14 wants) |
| `mean`/`std` | none | optional per-channel normalization (ImageNet-style) |
| `activation` | `none` | `none` or `sigmoid` — see below |
| `threshold` | `0.35` | minimum confidence to emit a general tag |
| `character_threshold` | `threshold` | minimum confidence for `character` tags |
| `category` | `general` | category for labels without one of their own |

**`activation` is the one that bites.** Exports disagree on whether the final
activation is part of the graph. A wd14 tagger bakes it in and returns
probabilities, so it wants `none`. JoyTag's graph stops at the tag **logits**, so it
wants `sigmoid` — set it to `none` and nothing errors, but every threshold is now
being compared against an unbounded number and the confidence stored on each tag
escapes `[0,1]`, which is the range `min_score` and the tag list assume. An
unrecognised value is rejected at startup rather than treated as `none`.

### Preprocessing
Frames are composited onto **white**, padded to a square, then resized — never
stretched. Both JoyTag and wd14 were trained on white-padded squares, so stretching
a portrait to 448×448 distorts every aspect-sensitive tag. Compositing is what stops
a transparent PNG arriving as a black rectangle (Go's RGBA is alpha-premultiplied,
so an untouched transparent pixel reads as zero).

## Building it yourself
```sh
cd backend
CGO_ENABLED=1 go build -tags onnx -o oppailib ./cmd/oppailib
export ONNXRUNTIME_LIB_PATH=/usr/local/lib/libonnxruntime.so
```
`onnxruntime_go` binds the C API, so the ONNX build needs cgo. sqlite stays
pure-Go either way — `CGO_ENABLED=1` only *permits* cgo, it does not switch
drivers. The lean build is the only fully cgo-free one.

The ONNX Runtime `.so` is `dlopen`'d at runtime, so it is not needed to compile.

### Testing against a real model
The unit tests cover preprocessing and score collection. To check that the
graph-introspected tensor names and the label count agree with the real
artifacts:
```sh
export ONNXRUNTIME_LIB_PATH=/usr/local/lib/libonnxruntime.so
export OPPAI_TEST_MODEL_DIR=/opt/oppailib/models
go test -tags onnx -run TestRealModel ./internal/ai/
```
Without `OPPAI_TEST_MODEL_DIR` those tests skip.

## Tuning

| env var | default | meaning |
|---------|---------|---------|
| `OPPAI_AI_ENABLED` | `true` | master switch for auto-tagging |
| `OPPAI_AI_MODEL_DIR` | `/config/models` | where `model.onnx` + `labels.txt` live |
| `OPPAI_AI_DEVICE` | `cpu` | `cpu` or `cuda` |
| `OPPAI_AI_VIDEO_FRAMES` | `5` | baseline frames per video (GIF: exact); scales up with video length, capped at 32 |

Each frame costs one ffmpeg seek-and-decode plus one model inference, so raising
`OPPAI_AI_VIDEO_FRAMES` trades import throughput for tag coverage; a long video
already earns extra frames above this baseline on its own. Background tag
jobs are bounded by a worker pool (half the core count, max 4), shared shape with
the thumbnail pool, so a bulk import queues instead of spawning one ffmpeg per
video at once. Every new-media path uses the same post-ingest hook, and a bounded
startup pass retries taggable items with no persisted AI result. Turning **Tag on
import** back on runs that recovery pass immediately as well.

## Roadmap
- Comics: tag the cover + sampled pages.
- Persist per-attempt job diagnostics so Settings can show failures and retry
  history beyond the current automatic missing-result recovery.
