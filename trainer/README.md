# OppaiLib trainer

The container OppaiLib trains LoRAs on. OppaiLib itself is one Go binary with no
Python in it; this is PyTorch, CUDA and kohya's
[sd-scripts](https://github.com/kohya-ss/sd-scripts) (pinned in the
[Dockerfile](Dockerfile)) behind a small HTTP API ([server.py](server.py)). OppaiLib's
Create → Train screen sends it pictures from the library, captioned from their tags,
follows the run, and installs the finished LoRA into Automatic1111 or InvokeAI.

## Running it

Needs an NVIDIA GPU: 12 GB or more for SDXL (Pony, Illustrious, NoobAI), less with
Low VRAM, 8 GB is plenty for SD 1.5. On Unraid, see [below](#on-unraid). Elsewhere:

```sh
docker run -d --name oppailib-trainer --gpus all --shm-size=8g -p 7870:7870 \
  -e TRAINER_TOKEN=some-long-random-string \
  -v /path/to/trainer-data:/data \
  -v /path/to/stable-diffusion-webui/models:/models:ro \
  ghcr.io/noneye-byte/oppailib-trainer:latest
```

Then in OppaiLib, Settings → Image generation → LoRA training: the address
(`http://<box>:7870`) and the same token.

`/models` is optional. With the generator's models folder there, a checkpoint is read
in place; without it, OppaiLib sends the checkpoint the first time it is trained
against (from Automatic1111's models folder, which then has to be mounted into
OppaiLib), and the last few are kept in `/data/bases`.

## On Unraid

Unraid no longer takes a template by URL, so the container is added by hand. It is
one form, filled in once; Unraid keeps what was entered as the container's own
template, so updates and edits afterwards are the usual Docker-tab buttons.

### 1. The GPU driver

Apps → search **Nvidia Driver** → install the plugin (by ich777), then open it under
Plugins, let it download the production driver, and reboot when it says so. The
plugin's page then lists the card and its UUID. Without it the container starts but
finds no GPU, and every run fails.

### 2. A token

Any long random string; OppaiLib sends it with every request, and without it anyone
on the network who can reach the port can use the GPU. From the Unraid terminal
(the `>_` icon at the top right):

```sh
openssl rand -hex 32
```

Keep it for step 3 and step 5.

### 3. The container

Docker → **Add Container**, and switch **Basic View** to **Advanced View** at the top
right — Extra Parameters is hidden otherwise.

| Field | Value |
|-------|-------|
| Name | `OppaiLib-Trainer` |
| Repository | `ghcr.io/noneye-byte/oppailib-trainer:latest` |
| Icon URL | `https://raw.githubusercontent.com/noneye-byte/OppaiLibNEW/main/web/public/icon.png` |
| Extra Parameters | `--runtime=nvidia --shm-size=8g` |
| Network Type | `Bridge` |
| Console shell command | `Bash` |
| Privileged | off |

`--runtime=nvidia` is what hands the container the GPU. `--shm-size=8g` matters too:
Docker's default shared memory is 64 MB, and PyTorch's data loader runs out of it and
dies partway into the first epoch.

Then, under the form, **Add another Path, Port, Variable, Label or Device** once per
row here, choosing the Config Type in the first column:

| Config Type | Name | Container side | Host side / value | Notes |
|-------------|------|----------------|-------------------|-------|
| Port | Port | Container Port `7870` | Host Port `7870` | Connection Type TCP |
| Path | Data | Container Path `/data` | `/mnt/user/appdata/oppailib-trainer` | Read/Write |
| Path | Models | Container Path `/models` | the generator's models folder | Read Only — optional, see below |
| Variable | Token | Key `TRAINER_TOKEN` | the token from step 2 | Password Mask: Yes |
| Variable | GPU | Key `NVIDIA_VISIBLE_DEVICES` | `all` | or one card's UUID from the driver plugin |
| Variable | Driver capabilities | Key `NVIDIA_DRIVER_CAPABILITIES` | `compute,utility` | |

`/data` holds a cached checkpoint or three, several GB each, so a pool with room is
better than a small cache drive. The pictures of a run sit there decrypted while it
trains, so it wants to be a disk you would trust with the library itself.

`/models` is the same folder Automatic1111 or InvokeAI loads checkpoints from — the
one OppaiLib has at `/a1111-models`, e.g. `/mnt/user/appdata/stable-diffusion/models`.
With it, a checkpoint is read where it is; leave the row out and OppaiLib sends the
checkpoint over the network the first time it is trained against.

**Apply.** The first pull is around 6 GB (PyTorch with CUDA), so it takes a while.

### 4. Check it started

Click the container's icon → **Logs**. It prints one line when it is up —
`OppaiLib trainer … on 0.0.0.0:7870, models /models, data /data` — preceded by a
warning if `TRAINER_TOKEN` did not come through. Which GPU it sees is shown in
OppaiLib, in step 5.

### 5. Point OppaiLib at it

OppaiLib → Settings → Image generation → **LoRA training**:

- **Trainer:** `http://<the Unraid box's IP>:7870` — the LAN address, not
  `localhost`, which inside OppaiLib's container is OppaiLib itself. InvokeAI
  downloads each finished LoRA from this same address, so it has to work from
  InvokeAI's container too; the LAN address does.
- **Token:** the one from step 2.

Create → **Train** then shows the trainer at the top: the card's name and VRAM, e.g.
*NVIDIA GeForce RTX 3090 · 24 GB · idle*. Just *Trainer · idle*, with no card, means
the container cannot see the GPU — the driver plugin is not installed, or
`--runtime=nvidia` did not make it into Extra Parameters. *Trainer unreachable* means
the address or the token is wrong; hover it for which.

### If the GPU is shared with the generator

Leave **Free the generator's GPU while training** ticked on the Train screen: when a
run starts OppaiLib asks Automatic1111 or InvokeAI to unload its checkpoint, and has it
load again when the run ends. Generating while a run trains will be slow or run out of
memory.

### Shortcut, if the Docker tab still lists user templates

[unraid/oppailib-trainer.xml](../unraid/oppailib-trainer.xml) is all of the above as
one file. Saved where Unraid keeps the templates it made from the form, it appears in
Add Container's **Template** list, filled in except for the token and `/models`:

```sh
wget -O /boot/config/plugins/dockerMan/templates-user/my-OppaiLib-Trainer.xml \
  https://raw.githubusercontent.com/noneye-byte/OppaiLibNEW/main/unraid/oppailib-trainer.xml
```

## What it keeps

`/data/jobs/<id>/` holds a run: its settings, its log, the pictures while it trains —
deleted the moment it ends, however it ends — and the finished `.safetensors` until
OppaiLib has installed it and deletes the job. Finished jobs nobody came back for go
after a week. Pictures are library content and arrive decrypted, so put `/data` on a
disk you would put the library's own scratch on.

## Testing

```sh
python -m unittest test_server.py
```

needs no GPU: [fake_train.py](fake_train.py) stands in for sd-scripts, printing what a
run prints and leaving the file one leaves.
