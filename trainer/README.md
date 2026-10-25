# OppaiLib trainer

The container OppaiLib trains LoRAs on. OppaiLib itself is one Go binary with no
Python in it; this is PyTorch, CUDA and kohya's
[sd-scripts](https://github.com/kohya-ss/sd-scripts) (pinned in the
[Dockerfile](Dockerfile)) behind a small HTTP API ([server.py](server.py)). OppaiLib's
Create → Train screen sends it pictures from the library, captioned from their tags,
follows the run, and installs the finished LoRA into Automatic1111 or InvokeAI.

## Running it

Needs an NVIDIA GPU: 12 GB or more for SDXL (Pony, Illustrious, NoobAI), less with
Low VRAM, 8 GB is plenty for SD 1.5. On Unraid, install the Nvidia Driver plugin and
use [unraid/oppailib-trainer.xml](../unraid/oppailib-trainer.xml). Elsewhere:

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
