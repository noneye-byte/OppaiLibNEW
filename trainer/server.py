"""OppaiLib's LoRA trainer.

OppaiLib is one Go binary with no Python in it, and training a LoRA needs PyTorch, a
GPU and kohya's two trainers — gigabytes the library has no business carrying. So the
training runs here, in a companion container, and OppaiLib drives it over HTTP:

    GET    /health                 what this box is (GPU, queue, trainers, families)
    GET    /bases?key=&size=       whether a base checkpoint is already here
    PUT    /bases?key=&size=       upload one into the cache (OppaiLib sends it)
    POST   /jobs                   a job's settings (JSON); it waits for its pictures
    PUT    /jobs/<id>/files/<f>    one picture (0001.png) or caption (0001.txt);
                                   ?repeats=N shows it N times an epoch, not the job's
    POST   /jobs/<id>/start        queue it once every picture is in
    GET    /jobs                   every job, newest first
    GET    /jobs/<id>              one job's state and progress
    POST   /jobs/<id>/cancel       stop it
    GET    /jobs/<id>/output       the finished .safetensors
    GET    /jobs/<id>/samples/<f>  a sample picture rendered while training
    DELETE /jobs/<id>              forget it, files and all
    POST   /detect?conf=           the people in a picture (its bytes): each one's box
                                   and outline, for cutting out of a comic (detect.py)

One job trains at a time — they share one GPU — and the rest wait in order. A job's
state is kept in a file beside its data, so a restart of this container does not
lose the queue; a job that was running when it stopped is marked failed, since
sd-scripts cannot pick up where it was.

The pictures arrive decrypted: they are library content, and they are on this disk
only while their job needs them. The dataset folder and anything cached from it are
deleted the moment training ends, however it ends, and only the trained file (and any
samples) is kept until OppaiLib has installed it and deletes the job.

Which tool trains what is RECIPES: sd-scripts takes SD 1.5, SDXL and the newer models
it knows, and musubi-tuner the rest. They are sister projects with the same log format,
so a run reads the same whichever it is, but musubi-tuner encodes a set in steps of its
own ahead of training, so one job can be several commands.

Only the standard library is imported at the top, so the request handling and the
argument building can be tested without a GPU (test_server.py).
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import secrets
import shlex
import shutil
import signal
import struct
import subprocess
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

import detect

VERSION = "4"
# What this trainer can do beyond version 1's protocol, for OppaiLib to check before
# it relies on one: "repeats-per-file" is a picture shown more or less often than the
# rest, which is how a tag the pictures have too much of is played down;
# "detect-people" (added at /health when the detector is there) is POST /detect;
# "modules" is a job naming the text encoders and VAE a bare model is trained with.
FEATURES = ["repeats-per-file", "modules"]
# The largest picture /detect reads: a comic page is a few megabytes.
DETECT_MAX_BYTES = 40 << 20
_can_detect: bool | None = None


def features() -> list[str]:
    """FEATURES, and "detect-people" when ultralytics and a person model are here.
    Asked once: importing ultralytics takes seconds, and neither changes while the
    container runs."""
    global _can_detect
    if _can_detect is None:
        _can_detect = detect.available(MODELS)
    return FEATURES + (["detect-people"] if _can_detect else [])

DATA = os.environ.get("TRAINER_DATA", "/data")
MODELS = os.environ.get("TRAINER_MODELS", "/models")
TOKEN = os.environ.get("TRAINER_TOKEN", "")
SD_SCRIPTS = os.environ.get("SD_SCRIPTS", "/opt/sd-scripts")
SD_SCRIPTS_VERSION = os.environ.get("SD_SCRIPTS_VERSION", "")
MUSUBI = os.environ.get("MUSUBI_TUNER", "/opt/musubi-tuner")
MUSUBI_VERSION = os.environ.get("MUSUBI_TUNER_VERSION", "")
PYTHON = os.environ.get("TRAINER_PYTHON", sys.executable)
# TRAINER_COMMAND replaces the sd-scripts invocation with another command, which is
# handed the job's arguments. The tests use it to stand in for a training run.
COMMAND = os.environ.get("TRAINER_COMMAND", "")
# Where the CLIP tokenizers are kept, so a run needs no internet: sd-scripts reads
# them from here and only downloads the ones missing (the image bakes them in).
TOKENIZERS = os.environ.get("TRAINER_TOKENIZERS", "/opt/tokenizers")
# How many base checkpoints the upload cache keeps. Each is gigabytes.
# A bare model brings up to three more files with it, so this is more than three.
KEEP_BASES = int(os.environ.get("TRAINER_KEEP_BASES", "6"))
# A finished job nobody came back for is removed after this long.
KEEP_JOBS_SECONDS = int(os.environ.get("TRAINER_KEEP_JOBS_DAYS", "7")) * 86400

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".bmp"}
NAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$")


def jobs_dir() -> str:
    return os.path.join(DATA, "jobs")


def bases_dir() -> str:
    return os.path.join(DATA, "bases")


# ── finding a base checkpoint ──────────────────────────────────────────────────

# The folder names a checkpoint lives under, lower-case, the way OppaiLib's A1111
# side reads them (backend/internal/imagegen/a1111_models.go): a key names A1111's
# own folder, and the folder here may be called something else.
FOLDER_ALIASES = {
    "stable-diffusion": ["stable-diffusion", "checkpoints", "checkpoint", "ckpt", "diffusion_models", "unet"],
    "text_encoder": ["text_encoder", "text_encoders", "clip"],
    "vae": ["vae"],
}


def resolve_in_models(key: str, size: int, root: str | None = None) -> str | None:
    """Where the key names a file under the mounted models folder, or None.

    The key is OppaiLib's name for the file: A1111's path under its models folder
    ("Stable-diffusion/pony.safetensors") or InvokeAI's path under its own. It is
    tried as written, then with its folders matched in any case and by alias, and
    last by its file name anywhere a few levels down, which is what finds it when
    this container mounts a folder above or below the one OppaiLib means. A size,
    when given, must match: two files called model.safetensors are not the same.
    """
    root = root or MODELS
    if not key or not os.path.isdir(root):
        return None
    parts = [p for p in key.replace("\\", "/").split("/") if p and p not in (".", "..")]
    if not parts:
        return None

    def ok(path: str) -> bool:
        try:
            return os.path.isfile(path) and (size <= 0 or os.path.getsize(path) == size)
        except OSError:
            return False

    exact = os.path.join(root, *parts)
    if ok(exact):
        return exact
    # Folder by folder, in any case, the first by any of its names.
    here = root
    for i, part in enumerate(parts):
        names = [part.lower()]
        if i == 0:
            names = FOLDER_ALIASES.get(part.lower(), names)
        try:
            entries = os.listdir(here)
        except OSError:
            here = None
            break
        match = None
        for want in names:
            match = next((e for e in entries if e.lower() == want), None)
            if match:
                break
        if match is None:
            here = None
            break
        here = os.path.join(here, match)
    if here and ok(here):
        return here
    base = parts[-1].lower()
    root_depth = root.rstrip(os.sep).count(os.sep)
    for dirpath, dirnames, filenames in os.walk(root):
        if dirpath.count(os.sep) - root_depth >= 4:
            dirnames[:] = []
        dirnames[:] = [d for d in dirnames if not d.startswith(".")]
        for f in filenames:
            if f.lower() == base and ok(os.path.join(dirpath, f)):
                return os.path.join(dirpath, f)
    return None


def cached_base_path(key: str, size: int) -> str:
    digest = hashlib.sha256(key.encode("utf-8")).hexdigest()[:20]
    ext = os.path.splitext(key)[1].lower() or ".safetensors"
    if ext not in (".safetensors", ".ckpt"):
        ext = ".safetensors"
    return os.path.join(bases_dir(), f"{digest}-{size}{ext}")


def find_base(key: str, size: int) -> tuple[str | None, str]:
    """The base checkpoint's path and where it was found ("mount" or "cache")."""
    cached = cached_base_path(key, size)
    if size > 0 and os.path.isfile(cached) and os.path.getsize(cached) == size:
        return cached, "cache"
    found = resolve_in_models(key, size)
    if found:
        return found, "mount"
    return None, ""


def prune_bases(keep: str) -> None:
    """Keeps the KEEP_BASES most recently used checkpoints in the upload cache."""
    try:
        files = [os.path.join(bases_dir(), f) for f in os.listdir(bases_dir()) if not f.endswith(".part")]
    except OSError:
        return
    files.sort(key=lambda p: os.path.getatime(p), reverse=True)
    for path in files[KEEP_BASES:]:
        if path != keep:
            try:
                os.remove(path)
            except OSError:
                pass


def read_header(path: str) -> dict:
    """A safetensors file's header: every tensor's name and shape. Only the header is
    read, however large the file."""
    with open(path, "rb") as f:
        (n,) = struct.unpack("<Q", f.read(8))
        if n <= 0 or n > 200_000_000:
            raise ValueError("not a safetensors file")
        return json.loads(f.read(n))


PREFIXES = ("", "model.diffusion_model.", "diffusion_model.", "net.", "model.", "transformer.")


def checkpoint_family(path: str) -> str:
    """Reads which model family a checkpoint is from its tensor names, as Forge does
    and in the order it does, since some of these names are in more than one: the same
    tests as OppaiLib's imagegen/file_facts.go. Only a safetensors header is read; a
    .ckpt is a pickle, and is taken to be SD 1 as nearly all of them are."""
    if not path.lower().endswith(".safetensors"):
        return "sd1"
    try:
        header = read_header(path)
    except (OSError, ValueError, struct.error):
        return "unknown"
    keys = header.keys()
    for p in PREFIXES:
        def has(*names):
            return any(p + n in header for n in names)

        if has("cap_embedder.1.weight") and has("noise_refiner.0.attention.k_norm.weight", "layers.0.attention.to_out.0.qweight"):
            shape = header[p + "cap_embedder.1.weight"].get("shape") or [0]
            return "zimage" if shape[0] == 3840 else "lumina"
        if has("head.modulation"):
            return "wan"
        if has("double_stream_modulation_img.lin.weight"):
            return "flux2"
        if has("distilled_guidance_layer.0.norms.0.scale", "distilled_guidance_layer.norms.0.scale"):
            return "chroma"
        if has("double_blocks.0.img_attn.norm.key_norm.scale", "double_blocks.0.img_attn.norm.key_norm.weight"):
            return "flux"
        if has("blocks.0.mlp.layer1.weight"):
            return "anima"
        if has("lq_proj.latent_proj.0.weight"):
            return "pid"
        if has("txt_in.text_norm.weight") and has("modulation.1.weight"):
            return "qwen21"
        if has("shared_block_modulation.weight"):
            return "moss"
        if has("txt_norm.weight"):
            return "qwen"
        if has("txtfusion.projector.weight"):
            return "krea2"
        if has("layers.0.mlp.linear_fc2.weight"):
            return "ernie"
    if any(k.startswith("conditioner.embedders.1.") for k in keys):
        return "sdxl"
    if any(k.startswith("cond_stage_model.transformer.") for k in keys):
        return "sd1"
    if any(k.startswith("cond_stage_model.model.") for k in keys):
        return "sd2"
    if any(k.startswith(("double_blocks.", "model.diffusion_model.double_blocks.")) for k in keys):
        return "flux"
    return "unknown"


# ── the new families ───────────────────────────────────────────────────────────

# How each family that is a bare diffusion model is trained. "files" hands each file
# OppaiLib names (by the role in its family table, imagegen/families.go) to the argument
# the tool takes it by. "flags" are the tool's own recommended settings for the family,
# from each one's documentation, and "rank" and "alpha" its defaults: most are written
# for an alpha of 1, which is not what SD's half-the-rank habit would give them.
# "swap" is how many blocks a low-VRAM run keeps off the card, and "fp8" and "fp8_te"
# are what cut the model and text encoder down there. "steps" and "cfg" draw a sample.
#
# Nothing here trains Ernie, PiD or Qwen 2.1: neither tool has them. Qwen-Image 2.1 is
# not Qwen-Image with a new number, and musubi-tuner's model_version list stops short of it.
SD_FLAGS = ["--network_train_unet_only", "--cache_text_encoder_outputs", "--cache_text_encoder_outputs_to_disk"]
RECIPES = {
    "flux": {
        "tool": "sd-scripts", "script": "flux_train_network.py", "network": "networks.lora_flux",
        "files": {"clip_l": "--clip_l", "t5xxl": "--t5xxl", "ae": "--ae"},
        "flags": ["--guidance_scale=1.0", "--timestep_sampling=flux_shift", "--model_prediction_type=raw"],
        "rank": 16, "alpha": 1, "swap": 18, "fp8": ["--fp8_base"], "steps": 20, "cfg": 1,
    },
    "chroma": {
        "tool": "sd-scripts", "script": "flux_train_network.py", "network": "networks.lora_flux",
        "files": {"t5xxl": "--t5xxl", "ae": "--ae"},
        "flags": ["--model_type=chroma", "--guidance_scale=0.0", "--timestep_sampling=sigmoid",
                  "--apply_t5_attn_mask", "--model_prediction_type=raw"],
        "rank": 16, "alpha": 1, "swap": 18, "fp8": ["--fp8_base"], "steps": 26, "cfg": 4,
        # Chroma has no guidance built in, and renders grey with one.
        "sample": " --g 0.0",
    },
    "lumina": {
        "tool": "sd-scripts", "script": "lumina_train_network.py", "network": "networks.lora_lumina",
        "files": {"gemma2": "--gemma2", "ae": "--ae"},
        "flags": ["--timestep_sampling=nextdit_shift", "--discrete_flow_shift=6.0", "--model_prediction_type=raw",
                  "--system_prompt=You are an assistant designed to generate high-quality images based on user prompts."],
        "rank": 8, "alpha": 8, "swap": 12, "fp8": ["--fp8_base"], "steps": 32, "cfg": 4,
    },
    "anima": {
        "tool": "sd-scripts", "script": "anima_train_network.py", "network": "networks.lora_anima",
        "files": {"qwen3": "--qwen3", "vae": "--vae"},
        "flags": ["--timestep_sampling=sigmoid", "--discrete_flow_shift=1.0", "--vae_chunk_size=64", "--vae_disable_cache"],
        "rank": 8, "alpha": 1, "swap": 14, "steps": 32, "cfg": 4,
    },
    "moss": {
        "tool": "sd-scripts", "script": "moss_image_train_network.py", "network": "networks.lora_generic",
        "files": {"text_encoder": "--text_encoder", "ae": "--vae"},
        "flags": ["--timestep_sampling=truncated_logit_normal", "--logit_mean=-1.09", "--logit_std=0.95",
                  "--discrete_flow_shift=1.0"],
        "rank": 16, "alpha": 1, "swap": 16, "fp8": ["--convrot_int8"], "steps": 50, "cfg": 3,
    },
    "zimage": {
        "tool": "musubi", "prefix": "zimage", "network": "networks.lora_zimage",
        "files": {"text_encoder": "--text_encoder", "ae": "--vae"},
        "flags": ["--timestep_sampling=shift", "--weighting_scheme=none", "--discrete_flow_shift=2.0"],
        "rank": 32, "alpha": 32, "swap": 14, "fp8": ["--fp8_base", "--fp8_scaled"], "fp8_te": "--fp8_llm",
        "steps": 28, "cfg": 4,
        # Forge reads Z-Image's fused attention by the Diffusers names alone. Left as
        # trained, the LoRA loads, matches nothing and changes nothing, without a word.
        "convert": True,
    },
    "qwen": {
        "tool": "musubi", "prefix": "qwen_image", "network": "networks.lora_qwen_image",
        "files": {"text_encoder": "--text_encoder", "vae": "--vae"}, "version": ["--model_version=original"],
        "flags": ["--timestep_sampling=shift", "--weighting_scheme=none", "--discrete_flow_shift=2.2"],
        "rank": 16, "alpha": 16, "swap": 30, "fp8": ["--fp8_base", "--fp8_scaled"], "fp8_te": "--fp8_vl",
        "steps": 30, "cfg": 2.5,
    },
    "flux2": {
        "tool": "musubi", "prefix": "flux_2", "network": "networks.lora_flux_2",
        "files": {"text_encoder": "--text_encoder", "ae": "--vae"},
        "flags": ["--timestep_sampling=flux2_shift", "--weighting_scheme=none"],
        "rank": 32, "alpha": 32, "swap": 12, "fp8": ["--fp8_base", "--fp8_scaled"], "fp8_te": "--fp8_text_encoder",
        "steps": 4, "cfg": 1,
    },
    "krea2": {
        "tool": "musubi", "prefix": "krea2", "network": "networks.lora_krea2",
        "files": {"text_encoder": "--text_encoder", "vae": "--vae"},
        "flags": ["--timestep_sampling=shift", "--weighting_scheme=none", "--discrete_flow_shift=2.5"],
        "rank": 32, "alpha": 32, "swap": 14, "fp8": ["--fp8_base", "--fp8_scaled"], "steps": 28, "cfg": 5.5,
    },
    "wan": {
        "tool": "musubi", "prefix": "wan", "network": "networks.lora_wan",
        "files": {"vae": "--vae"},
        "flags": ["--timestep_sampling=shift", "--discrete_flow_shift=3.0", "--preserve_distribution_shape"],
        "rank": 32, "alpha": 32, "swap": 20, "fp8": ["--fp8_base"], "fp8_te": "--fp8_t5", "steps": 20, "cfg": 3.5,
        "resolution": 768,
    },
}
# musubi-tuner reads Wan's text encoder in the shape of the file Wan's makers published
# and nothing else, loaded strictly, so the file Forge and ComfyUI use for it fails. The
# first Wan run fetches this one, which is public and is kept with the bases.
WAN_T5 = "models_t5_umt5-xxl-enc-bf16.pth"
WAN_T5_URL = "https://huggingface.co/Wan-AI/Wan2.1-I2V-14B-720P/resolve/main/" + WAN_T5
TRAINABLE = sorted(["sd1", "sdxl", *RECIPES])
OPTIMIZERS_MUSUBI = {"AdamW8bit": "adamw8bit", "AdamW": "adamw", "Adafactor": "adafactor"}


def klein_version(name: str, variant: str) -> str:
    """musubi-tuner's name for a Flux.2 Klein file. The sizes differ by which text
    encoder they take and "base" is the undistilled one, which is the one worth training."""
    size = "9b" if variant == "9b" or "9b" in name.lower() else "4b"
    return f"klein-base-{size}" if "base" in name.lower() else f"klein-{size}"


def wan_flags(name: str, variant: str) -> tuple[list[str], list[str]]:
    """Wan 2.2 comes as two models that each take part of the noise schedule. Trained
    alone, one is held to its own part of it, by what its name says it is; the task and
    the point it splits at go by which way the file runs. Returns the training flags,
    and the flags the latents are cached with."""
    i2v = variant == "i2v" or "i2v" in name.lower()
    split = 900 if i2v else 875
    flags = [f"--task={'i2v' if i2v else 't2v'}-A14B"]
    if "high" in name.lower():
        flags += [f"--min_timestep={split}", "--max_timestep=1000"]
    elif "low" in name.lower():
        flags += ["--min_timestep=0", f"--max_timestep={split}"]
    return flags, (["--i2v"] if i2v else [])


def dataset_toml(cfg: dict, recipe: dict, dataset: str, cache: str) -> str:
    """musubi-tuner's dataset file. Each N_word folder is a dataset of its own, since
    that is where a tag played down has its pictures, with a cache folder of its own:
    sharing one mixes the items up."""
    res = int(_num(cfg, "resolution", recipe.get("resolution", 1024), 256, 2048, int)) // 64 * 64
    batch = int(_num(cfg, "batchSize", 1, 1, 16, int))
    lines = ["[general]", f"resolution = [{res}, {res}]", 'caption_extension = ".txt"',
             f"batch_size = {batch}", "enable_bucket = true", "bucket_no_upscale = true", ""]
    for name in sorted(os.listdir(dataset)):
        folder = os.path.join(dataset, name)
        if not os.path.isdir(folder):
            continue
        repeats = name.split("_", 1)[0]
        lines += ["[[datasets]]", f"image_directory = {json.dumps(folder)}",
                  f"cache_directory = {json.dumps(os.path.join(cache, name))}",
                  f"num_repeats = {int(repeats) if repeats.isdigit() else 1}", ""]
    return "\n".join(lines)


def build_kohya_dit(cfg: dict, recipe: dict, base: str, files: dict, train_dir: str, out_dir: str,
                    sample_file: str | None, precision: str) -> list[str]:
    """sd-scripts' command line for a bare model. Its text encoder is frozen and its
    outputs cached, so the captions are fixed: nothing here shuffles them."""
    res = int(_num(cfg, "resolution", recipe.get("resolution", 1024), 256, 2048, int)) // 64 * 64
    rank = int(_num(cfg, "rank", recipe["rank"], 1, 256, int))
    epochs = int(_num(cfg, "epochs", 10, 1, 200, int))
    optimizer = cfg.get("optimizer") or "AdamW8bit"
    if optimizer not in ("AdamW8bit", "AdamW", "Adafactor", "Lion"):
        optimizer = "AdamW8bit"
    args = [
        os.path.join(SD_SCRIPTS, recipe["script"]),
        f"--pretrained_model_name_or_path={base}",
        *(f"{flag}={files[role]}" for role, flag in recipe["files"].items()),
        f"--train_data_dir={train_dir}",
        f"--output_dir={out_dir}",
        f"--output_name={cfg['name']}",
        "--save_model_as=safetensors",
        f"--network_module={recipe['network']}",
        f"--network_dim={rank}",
        f"--network_alpha={_num(cfg, 'alpha', recipe['alpha'], 0.1, 256):g}",
        f"--resolution={res},{res}",
        "--enable_bucket",
        "--min_bucket_reso=256",
        f"--max_bucket_reso={max(res * 2, 1024)}",
        "--bucket_reso_steps=64",
        "--bucket_no_upscale",
        "--caption_extension=.txt",
        f"--max_train_epochs={epochs}",
        f"--train_batch_size={int(_num(cfg, 'batchSize', 1, 1, 16, int))}",
        f"--learning_rate={_num(cfg, 'learningRate', 1e-4, 1e-7, 1.0):g}",
        "--lr_scheduler=constant",
        f"--optimizer_type={optimizer}",
        f"--mixed_precision={precision}",
        "--cache_latents",
        "--cache_latents_to_disk",
        "--gradient_checkpointing",
        f"--seed={int(_num(cfg, 'seed', 42, 0, 2**31 - 1, int))}",
        "--max_data_loader_n_workers=1",
        "--persistent_data_loader_workers",
        "--training_comment=Trained in OppaiLib",
        f"--tokenizer_cache_dir={TOKENIZERS}",
        *SD_FLAGS,
        *recipe["flags"],
    ]
    if recipe["script"] != "anima_train_network.py":
        args.append("--sdpa")
    if cfg.get("lowVram"):
        args += [f"--blocks_to_swap={recipe['swap']}", *recipe.get("fp8", [])]
    save_every = int(_num(cfg, "saveEvery", 0, 0, 200, int))
    if save_every:
        args.append(f"--save_every_n_epochs={save_every}")
    if sample_file:
        args += [f"--sample_prompts={sample_file}", f"--sample_every_n_epochs={int(_num(cfg, 'sampleEvery', epochs, 1, 200, int))}"]
    return args


def build_musubi(cfg: dict, family: str, recipe: dict, base: str, files: dict, toml: str, out_dir: str,
                 sample_file: str | None, precision: str, variant: str) -> list[tuple[str, list[str]]]:
    """musubi-tuner's run: the latents encoded, the captions encoded, then the training.
    Each is its own process, so that the VAE and text encoder are off the card before
    the model goes on it, which is most of what lets these run on a home GPU."""
    prefix = recipe["prefix"]
    name = os.path.basename(base)
    version = list(recipe.get("version", []))
    latent_flags: list[str] = []
    if family == "flux2":
        version = [f"--model_version={klein_version(name, variant)}"]
    train_flags = list(recipe["flags"])
    if family == "wan":
        task, latent_flags = wan_flags(name, variant)
        train_flags = task + train_flags
    te_role = "t5" if family == "wan" else "text_encoder"
    te_flag = "--t5" if family == "wan" else "--text_encoder"
    vae_flag = f"--vae={files['vae'] if 'vae' in recipe['files'] else files['ae']}"
    low = cfg.get("lowVram")
    fp8_te = [recipe["fp8_te"]] if low and recipe.get("fp8_te") else []

    def script(s: str) -> str:
        return os.path.join(MUSUBI, f"{prefix}_{s}.py")

    latents = [script("cache_latents"), f"--dataset_config={toml}", vae_flag, *version, *latent_flags]
    captions = [script("cache_text_encoder_outputs"), f"--dataset_config={toml}",
                f"{te_flag}={files[te_role]}", "--batch_size=1", *version, *fp8_te]
    epochs = int(_num(cfg, "epochs", 10, 1, 200, int))
    train = [
        script("train_network"),
        f"--dit={base}",
        vae_flag,
        f"{te_flag}={files[te_role]}",
        *version,
        f"--dataset_config={toml}",
        "--sdpa",
        f"--mixed_precision={precision}",
        f"--optimizer_type={OPTIMIZERS_MUSUBI.get(cfg.get('optimizer') or '', 'adamw8bit')}",
        f"--learning_rate={_num(cfg, 'learningRate', 1e-4, 1e-7, 1.0):g}",
        "--gradient_checkpointing",
        "--max_data_loader_n_workers=1",
        "--persistent_data_loader_workers",
        f"--network_module={recipe['network']}",
        f"--network_dim={int(_num(cfg, 'rank', recipe['rank'], 1, 256, int))}",
        f"--network_alpha={_num(cfg, 'alpha', recipe['alpha'], 0.1, 256):g}",
        f"--max_train_epochs={epochs}",
        f"--seed={int(_num(cfg, 'seed', 42, 0, 2**31 - 1, int))}",
        f"--output_dir={out_dir}",
        f"--output_name={cfg['name']}",
        *train_flags,
    ]
    if low:
        train += [f"--blocks_to_swap={recipe['swap']}", *recipe.get("fp8", []), *fp8_te]
    save_every = int(_num(cfg, "saveEvery", 0, 0, 200, int))
    if save_every:
        train.append(f"--save_every_n_epochs={save_every}")
    if sample_file:
        train += [f"--sample_prompts={sample_file}", f"--sample_every_n_epochs={int(_num(cfg, 'sampleEvery', epochs, 1, 200, int))}"]
    return [("caching", latents), ("caching", captions), ("loading", train)]


def fetch(url: str, dest: str, say) -> None:
    """Downloads a public file into the bases folder, whole or not at all."""
    import urllib.request

    say(f"downloading {url}")
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    part = dest + ".part"
    with urllib.request.urlopen(url, timeout=120) as src, open(part, "wb") as out:
        shutil.copyfileobj(src, out, 1 << 20)
    os.replace(part, dest)


# ── building the run ───────────────────────────────────────────────────────────

def _num(cfg: dict, key: str, default, lo, hi, cast=float):
    """cfg[key] as a number within [lo, hi]; missing, unreadable or 0 is the default."""
    try:
        v = cast(cfg.get(key) or default)
    except (TypeError, ValueError):
        v = default
    return max(lo, min(hi, v))


def build_args(cfg: dict, family: str, base: str, train_dir: str, out_dir: str,
               sample_file: str | None, precision: str) -> list[str]:
    """sd-scripts' command line for one job. Every number from OppaiLib is clamped:
    a typo should make a slow run, not a crashed one."""
    sdxl = family == "sdxl"
    script = "sdxl_train_network.py" if sdxl else "train_network.py"
    res = int(_num(cfg, "resolution", 1024 if sdxl else 512, 256, 2048, int)) // 64 * 64
    rank = int(_num(cfg, "rank", 16 if sdxl else 32, 1, 256, int))
    alpha = _num(cfg, "alpha", rank / 2, 0.1, 256)
    epochs = int(_num(cfg, "epochs", 10, 1, 200, int))
    batch = int(_num(cfg, "batchSize", 1, 1, 16, int))
    lr = _num(cfg, "learningRate", 1e-4, 1e-7, 1.0)
    te_lr = _num(cfg, "textEncoderLr", lr / 2, 0, 1.0)
    optimizer = cfg.get("optimizer") or "AdamW8bit"
    if optimizer not in ("AdamW8bit", "AdamW", "Prodigy", "Adafactor", "Lion"):
        optimizer = "AdamW8bit"
    if optimizer == "Prodigy":
        # Prodigy finds its own step size; it wants 1 here and nothing else.
        lr, te_lr = 1.0, 1.0 if te_lr else 0
    seed = int(_num(cfg, "seed", 42, 0, 2**31 - 1, int))

    args = [
        os.path.join(SD_SCRIPTS, script),
        f"--pretrained_model_name_or_path={base}",
        f"--train_data_dir={train_dir}",
        f"--output_dir={out_dir}",
        f"--output_name={cfg['name']}",
        "--save_model_as=safetensors",
        "--network_module=networks.lora",
        f"--network_dim={rank}",
        f"--network_alpha={alpha:g}",
        f"--resolution={res},{res}",
        "--enable_bucket",
        "--min_bucket_reso=256",
        f"--max_bucket_reso={max(res * 2, 1024)}",
        "--bucket_reso_steps=64",
        "--bucket_no_upscale",
        "--caption_extension=.txt",
        f"--max_train_epochs={epochs}",
        f"--train_batch_size={batch}",
        f"--learning_rate={lr:g}",
        f"--unet_lr={lr:g}",
        f"--lr_scheduler={'constant' if optimizer == 'Prodigy' else 'cosine'}",
        f"--optimizer_type={optimizer}",
        f"--mixed_precision={precision}",
        "--save_precision=fp16",
        "--cache_latents",
        "--cache_latents_to_disk",
        "--gradient_checkpointing",
        "--sdpa",
        f"--seed={seed}",
        "--max_data_loader_n_workers=1",
        "--persistent_data_loader_workers",
        "--training_comment=Trained in OppaiLib",
        f"--tokenizer_cache_dir={TOKENIZERS}",
    ]
    if cfg.get("unetOnly") or te_lr == 0:
        args.append("--network_train_unet_only")
    else:
        args.append(f"--text_encoder_lr={te_lr:g}")
    if cfg.get("shuffleCaption", True):
        args.append("--shuffle_caption")
        # The trigger word leads every caption and stays put while the tags shuffle.
        if cfg.get("trigger"):
            args.append("--keep_tokens=1")
    if cfg.get("flip"):
        args.append("--flip_aug")
    noise = _num(cfg, "noiseOffset", 0, 0, 1)
    if noise:
        args.append(f"--noise_offset={noise:g}")
    clip_skip = int(_num(cfg, "clipSkip", 0, 0, 12, int))
    if clip_skip and not sdxl:
        args.append(f"--clip_skip={clip_skip}")
    if sdxl:
        # The SDXL VAE overflows in half precision; sd-scripts' own advice.
        args.append("--no_half_vae")
    save_every = int(_num(cfg, "saveEvery", 0, 0, 200, int))
    if save_every:
        args.append(f"--save_every_n_epochs={save_every}")
    if sample_file:
        every = int(_num(cfg, "sampleEvery", epochs, 1, 200, int))
        args += [f"--sample_prompts={sample_file}", f"--sample_every_n_epochs={every}", "--sample_sampler=euler_a"]
    return args


def sample_lines(cfg: dict, family: str) -> list[str]:
    """The trainers' sample prompt file: one picture per line, with its settings."""
    out = []
    recipe = RECIPES.get(family, {})
    size = 512 if family == "sd1" else recipe.get("resolution", 1024)
    steps, scale = recipe.get("steps", 24), recipe.get("cfg", 6)
    for i, s in enumerate(cfg.get("samples") or []):
        prompt = str(s.get("prompt", "")).replace("\n", " ").strip()
        if not prompt:
            continue
        neg = str(s.get("negative", "")).replace("\n", " ").replace("--", " ").strip()
        line = f"{prompt.replace('--', ' ')} --w {size} --h {size} --s {steps} --l {scale:g} --d {1000 + i}"
        if neg:
            line += f" --n {neg}"
        line += recipe.get("sample", "")
        out.append(line)
    return out[:4]


# ── reading progress ───────────────────────────────────────────────────────────

STEP_RE = re.compile(r"steps:\s*\d+%.*?\|\s*(\d+)/(\d+)\s*\[([^<\]]*)<([^,\]]*)")
LOSS_RE = re.compile(r"avr_loss=([0-9.]+(?:e-?\d+)?)")
EPOCH_RE = re.compile(r"^\s*epoch (\d+)/(\d+)")
PHASES = [
    (re.compile(r"caching latents|caching text encoder|encoding", re.I), "caching"),
    (re.compile(r"loading (?:u-?net|model|text encoder|vae)|load (?:stable diffusion|StableDiffusion) checkpoint", re.I), "loading"),
    (re.compile(r"generating sample images|sample images", re.I), "sampling"),
    (re.compile(r"saving checkpoint|model saved", re.I), "saving"),
]


def read_progress(line: str, job: dict) -> None:
    """Updates a job's progress from one line (or carriage-return chunk) of output."""
    m = STEP_RE.search(line)
    if m:
        job["step"], job["total"] = int(m.group(1)), int(m.group(2))
        job["elapsed"], job["eta"] = m.group(3).strip(), m.group(4).strip()
        job["phase"] = "training"
        loss = LOSS_RE.search(line)
        if loss:
            job["loss"] = float(loss.group(1))
        return
    m = EPOCH_RE.search(line)
    if m:
        job["epoch"], job["epochs"] = int(m.group(1)), int(m.group(2))
        return
    for pattern, phase in PHASES:
        if pattern.search(line):
            job["phase"] = phase
            return


# ── jobs ───────────────────────────────────────────────────────────────────────

LOCK = threading.Lock()
WAKE = threading.Event()
RUNNING: dict[str, subprocess.Popen] = {}
# Jobs asked to stop. Kept here, not in the job's file, which the runner rewrites
# with its own copy every couple of seconds.
CANCELLING: set[str] = set()

PUBLIC = ("id", "name", "state", "phase", "family", "images", "step", "total", "epoch", "epochs",
          "loss", "elapsed", "eta", "error", "output", "download", "samples", "created", "started", "finished")


def job_path(job_id: str, *rest: str) -> str:
    return os.path.join(jobs_dir(), job_id, *rest)


def load_job(job_id: str) -> dict | None:
    try:
        with open(job_path(job_id, "state.json"), encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


# The worker and a request (a cancel, say) can save one job at the same moment; one
# at a time, or the second rename finds the first has already taken its file.
_save_lock = threading.Lock()


def save_job(job: dict) -> None:
    path = job_path(job["id"], "state.json")
    tmp = path + ".tmp"
    with _save_lock:
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(job, f)
        # Windows will not rename over a file someone has open, and a request reading
        # the job's state does for a moment. Everywhere else the first try is it.
        for attempt in range(40):
            try:
                os.replace(tmp, path)
                break
            except PermissionError:
                if attempt == 39:
                    raise
                time.sleep(0.025)


def all_jobs() -> list[dict]:
    out = []
    try:
        ids = os.listdir(jobs_dir())
    except OSError:
        return out
    for job_id in ids:
        job = load_job(job_id)
        if job:
            out.append(job)
    out.sort(key=lambda j: j.get("created", 0), reverse=True)
    return out


def public(job: dict) -> dict:
    out = {k: job[k] for k in PUBLIC if k in job}
    out["log"] = tail_log(job["id"], 40)
    return out


def tail_log(job_id: str, n: int) -> list[str]:
    try:
        with open(job_path(job_id, "log.txt"), encoding="utf-8", errors="replace") as f:
            lines = f.read().splitlines()
    except OSError:
        return []
    return lines[-n:]


def safe_file(name: str) -> str | None:
    """The name an uploaded dataset file may be written as, or None for one that is
    not a plain picture or caption name: no folders, no dots in front, nothing that
    sd-scripts would not read as part of the dataset."""
    if "/" in name or "\\" in name or name.startswith("."):
        return None
    stem, ext = os.path.splitext(name)
    if ext.lower() not in IMAGE_EXTS | {".txt"} or not re.fullmatch(r"[A-Za-z0-9_-]{1,40}", stem):
        return None
    return name


def concept_folder(cfg: dict) -> str:
    """sd-scripts reads the repeat count off the dataset folder's name: "10_name"."""
    repeats = int(_num(cfg, "repeats", 10, 1, 100, int))
    word = re.sub(r"[^A-Za-z0-9]+", "_", str(cfg.get("trigger") or "img")).strip("_")[:40] or "img"
    return f"{repeats}_{word}"


# A job is sent in three steps — its settings, then each picture and caption as a
# request of its own, then "start" — so neither side ever holds a whole dataset in
# memory or needs its size up front.

def create_job(cfg) -> dict:
    """Files a new job's settings. It waits, "receiving", for its pictures."""
    if not isinstance(cfg, dict):
        raise ValueError("the job must be a JSON object")
    name = str(cfg.get("name", ""))
    if not NAME_RE.match(name):
        raise ValueError("the LoRA's name must be letters, digits, dots, dashes and underscores")
    base = cfg.get("base") or {}
    if not isinstance(base, dict) or not base.get("key"):
        raise ValueError("the job names no base model")
    modules = cfg.get("modules") or {}
    if not isinstance(modules, dict) or not all(isinstance(m, dict) and m.get("key") for m in modules.values()):
        raise ValueError("a module of the job names no file")
    job_id = time.strftime("%Y%m%d-%H%M%S") + "-" + secrets.token_hex(3)
    root = job_path(job_id)
    os.makedirs(os.path.join(root, "dataset", concept_folder(cfg)))
    with open(os.path.join(root, "job.json"), "w", encoding="utf-8") as f:
        json.dump(cfg, f)
    job = {
        "id": job_id, "name": name, "state": "receiving", "phase": "receiving", "images": 0,
        "step": 0, "total": 0, "epoch": 0, "epochs": int(_num(cfg, "epochs", 10, 1, 200, int)),
        "created": int(time.time()), "download": secrets.token_urlsafe(18), "samples": [],
    }
    save_job(job)
    return job


def dataset_folder(job_id: str, repeats: int | None = None) -> str | None:
    """The folder a dataset file goes in: the job's own concept folder, or one beside
    it for pictures shown a different number of times an epoch. sd-scripts reads
    every "N_word" folder under the dataset, each at its own repeats."""
    root = job_path(job_id, "dataset")
    try:
        with open(job_path(job_id, "job.json"), encoding="utf-8") as f:
            cfg = json.load(f)
    except (OSError, ValueError):
        return None
    if not os.path.isdir(root):
        return None
    if repeats is not None:
        cfg = {**cfg, "repeats": repeats}
    folder = os.path.join(root, concept_folder(cfg))
    os.makedirs(folder, exist_ok=True)
    return folder


def dataset_images(job_id: str) -> int:
    """How many pictures a job's dataset holds, across all its folders."""
    root = job_path(job_id, "dataset")
    count = 0
    for _, _, files in os.walk(root):
        count += sum(1 for f in files if os.path.splitext(f)[1].lower() in IMAGE_EXTS)
    return count


def receive_file(job: dict, name: str, stream, length: int, repeats: int | None = None) -> None:
    """Writes one picture or caption into a receiving job's dataset. A caption has to
    be sent with the same repeats as its picture, so the two share a folder."""
    if job.get("state") != "receiving":
        raise ValueError("the job is not taking files any more")
    safe = safe_file(name)
    folder = dataset_folder(job["id"], repeats)
    if safe is None or folder is None:
        raise ValueError(f"not a dataset file name: {name}")
    dest = os.path.join(folder, safe)
    body = _Limited(stream, length)
    with open(dest + ".part", "wb") as out:
        while True:
            chunk = body.read(1 << 20)
            if not chunk:
                break
            out.write(chunk)
    if body.left:
        os.remove(dest + ".part")
        raise ValueError("the upload broke off")
    os.replace(dest + ".part", dest)


def start_job(job: dict) -> dict:
    """Queues a job whose pictures have all arrived."""
    if job.get("state") != "receiving":
        raise ValueError("the job has already started")
    images = dataset_images(job["id"])
    if images == 0:
        raise ValueError("the job has no pictures")
    # The job's own folder is made up front and stays empty when every picture came
    # with repeats of its own; sd-scripts is not handed a subset with nothing in it.
    dataset = job_path(job["id"], "dataset")
    for name in os.listdir(dataset):
        folder = os.path.join(dataset, name)
        if os.path.isdir(folder) and not os.listdir(folder):
            os.rmdir(folder)
    job.update(state="queued", phase="waiting", images=images)
    save_job(job)
    return job


class _Limited:
    """A request body as a file that ends where Content-Length says it does."""

    def __init__(self, raw, length: int):
        self.raw, self.left = raw, length

    def read(self, n: int = -1) -> bytes:
        if self.left <= 0:
            return b""
        if n < 0 or n > self.left:
            n = self.left
        data = self.raw.read(n)
        self.left -= len(data)
        return data


_BF16: bool | None = None


def bf16_supported() -> bool:
    """Whether the GPU trains in bfloat16 (Ampere and newer). Asked of a separate
    Python so this process never imports torch and holds no GPU memory."""
    global _BF16
    if _BF16 is None:
        try:
            out = subprocess.run([PYTHON, "-c", "import torch;print(torch.cuda.is_available() and torch.cuda.is_bf16_supported())"],
                                 capture_output=True, text=True, timeout=120)
            _BF16 = out.stdout.strip().endswith("True")
        except (OSError, subprocess.SubprocessError):
            _BF16 = False
    return _BF16


def gpu_info() -> dict:
    try:
        out = subprocess.run(["nvidia-smi", "--query-gpu=name,memory.total,memory.used", "--format=csv,noheader,nounits"],
                             capture_output=True, text=True, timeout=10)
        name, total, used = [p.strip() for p in out.stdout.splitlines()[0].split(",")]
        return {"gpu": name, "vramMB": int(total), "vramUsedMB": int(used)}
    except (OSError, subprocess.SubprocessError, ValueError, IndexError):
        return {"gpu": ""}


def run_command(args: list[str], job: dict, say, root: str) -> int:
    """Runs one of a job's commands to its end, following its output, and returns how
    it exited. args[0] is the script; TRAINER_COMMAND stands in for it in the tests."""
    cmd = shlex.split(COMMAND, posix=os.name != "nt") + args[1:] if COMMAND else [PYTHON, *args]
    say("$ " + " ".join(cmd))
    env = dict(os.environ, PYTHONUNBUFFERED="1")
    script_dir = os.path.dirname(args[0])
    # Under the lock cancel() takes, so a cancel is either seen here or finds the process.
    with LOCK:
        if job["id"] in CANCELLING:
            return -1
        proc = subprocess.Popen(cmd, cwd=script_dir if os.path.isdir(script_dir) else root,
                                stdout=subprocess.PIPE, stderr=subprocess.STDOUT, env=env, start_new_session=True)
        RUNNING[job["id"]] = proc
    last_save = 0.0
    buf = b""
    while True:
        chunk = proc.stdout.read1(4096) if hasattr(proc.stdout, "read1") else proc.stdout.read(4096)
        if not chunk:
            break
        buf += chunk
        # tqdm redraws its bar with carriage returns; each redraw is a reading.
        pieces = re.split(rb"[\r\n]", buf)
        buf = pieces.pop()
        for raw in pieces:
            text = raw.decode("utf-8", "replace").rstrip()
            if not text:
                continue
            read_progress(text, job)
            if not STEP_RE.search(text):
                say(text)
        if time.time() - last_save > 2:
            last_save = time.time()
            save_job(job)
    code = proc.wait()
    proc.stdout.close()
    with LOCK:
        RUNNING.pop(job["id"], None)
    if buf:
        say(buf.decode("utf-8", "replace"))
    return code


def run_job(job: dict) -> None:
    """Runs one queued job to its end and files the result."""
    root = job_path(job["id"])
    with open(os.path.join(root, "job.json"), encoding="utf-8") as f:
        cfg = json.load(f)
    log = open(os.path.join(root, "log.txt"), "a", encoding="utf-8")

    def say(msg: str) -> None:
        log.write(msg.rstrip() + "\n")
        log.flush()

    def finish(state: str, error: str = "") -> None:
        job["state"], job["error"], job["finished"] = state, error, int(time.time())
        job["phase"] = state
        save_job(job)

    try:
        base = cfg["base"]
        path, where = find_base(str(base["key"]), int(base.get("size") or 0))
        if not path:
            finish("error", f"the base model {base['key']} is not here: mount the models folder at {MODELS}, or let OppaiLib send it")
            return
        family = checkpoint_family(path)
        if family == "unknown":
            # Not a file this could read; OppaiLib has the file's name and its card.
            family = str(cfg.get("family") or "unknown")
        if family not in TRAINABLE:
            finish("error", f"the base model is {family}, which neither sd-scripts nor musubi-tuner trains. "
                            f"This trainer makes LoRAs for {', '.join(TRAINABLE)}.")
            return
        job["family"] = family
        recipe = RECIPES.get(family)
        files = {}
        for role, ref in (cfg.get("modules") or {}).items():
            found, _ = find_base(str(ref["key"]), int(ref.get("size") or 0))
            if found:
                files[role] = found
        if family == "wan":
            t5 = os.path.join(bases_dir(), WAN_T5)
            found, _ = find_base("text_encoder/" + WAN_T5, 0)
            if found:
                t5 = found
            elif not os.path.isfile(t5):
                job.update(state="running", phase="loading", started=int(time.time()))
                save_job(job)
                fetch(WAN_T5_URL, t5, say)
            files["t5"] = t5
        lacking = [role for role in (recipe or {}).get("files", {}) if role not in files]
        if lacking:
            finish("error", f"{' and '.join(lacking)} for {family} did not reach the trainer: "
                            f"mount the models folder at {MODELS}, or let OppaiLib send it")
            return
        out_dir = os.path.join(root, "output")
        os.makedirs(out_dir, exist_ok=True)
        # Low VRAM runs skip the samples on the new families: a sample needs the text
        # encoder back on a card that was only just big enough without it.
        lines = [] if recipe and cfg.get("lowVram") else sample_lines(cfg, family)
        sample_file = None
        if lines:
            sample_file = os.path.join(root, "samples.txt")
            with open(sample_file, "w", encoding="utf-8") as f:
                f.write("\n".join(lines) + "\n")
        precision = cfg.get("precision") or ("bf16" if COMMAND or bf16_supported() else "fp16")
        dataset = os.path.join(root, "dataset")
        if recipe is None:
            steps = [("loading", build_args(cfg, family, path, dataset, out_dir, sample_file, precision))]
        elif recipe["tool"] == "sd-scripts":
            steps = [("loading", build_kohya_dit(cfg, recipe, path, files, dataset, out_dir, sample_file, precision))]
        else:
            toml = os.path.join(root, "dataset.toml")
            with open(toml, "w", encoding="utf-8") as f:
                f.write(dataset_toml(cfg, recipe, dataset, os.path.join(root, "cache")))
            steps = build_musubi(cfg, family, recipe, path, files, toml, out_dir, sample_file, precision,
                                 str(cfg.get("variant") or ""))
        say(f"base {base['key']} ({where}, {family}); {job['images']} pictures")
        job.update(state="running", phase="loading", started=int(time.time()))
        save_job(job)
        code = 0
        for phase, args in steps:
            job["phase"] = phase
            save_job(job)
            code = run_command(args, job, say, root)
            if code != 0:
                break
        with LOCK:
            cancelled = job["id"] in CANCELLING
            CANCELLING.discard(job["id"])
        if cancelled:
            finish("cancelled")
            return
        output = os.path.join(out_dir, f"{cfg['name']}.safetensors")
        if code != 0 or not os.path.isfile(output):
            tail = [l for l in tail_log(job["id"], 30) if l.strip()]
            reason = next((l for l in reversed(tail) if re.search(r"error|exception|out of memory", l, re.I)), "")
            if "out of memory" in "\n".join(tail).lower():
                reason = "the GPU ran out of memory — try Low VRAM, a smaller resolution, or free the generator's GPU while training"
            finish("error", reason or f"training stopped (exit {code})")
            return
        if recipe and recipe.get("convert"):
            job["phase"] = "saving"
            save_job(job)
            converted = output + ".converted"
            code = run_command([os.path.join(MUSUBI, "convert_lora.py"), f"--input={output}",
                                f"--output={converted}", "--target=other"], job, say, root)
            with LOCK:
                cancelled = job["id"] in CANCELLING
                CANCELLING.discard(job["id"])
            if cancelled:
                finish("cancelled")
                return
            if code != 0 or not os.path.isfile(converted):
                finish("error", f"the LoRA trained, but converting it for the generator failed (exit {code})")
                return
            os.replace(converted, output)
        job["output"] = os.path.basename(output)
        sample_dir = os.path.join(out_dir, "sample")
        if os.path.isdir(sample_dir):
            job["samples"] = sorted(f for f in os.listdir(sample_dir) if f.lower().endswith(".png"))
        finish("done")
    except Exception as e:  # noqa: BLE001 — a job's failure is reported, never fatal to the server
        say(f"error: {e}")
        finish("error", str(e))
    finally:
        log.close()
        # The pictures are library content; they go as soon as they are not needed, and
        # what was encoded from them with them.
        shutil.rmtree(os.path.join(root, "dataset"), ignore_errors=True)
        shutil.rmtree(os.path.join(root, "cache"), ignore_errors=True)


def worker() -> None:
    while True:
        queued = [j for j in all_jobs() if j.get("state") == "queued"]
        if not queued:
            prune_old_jobs()
            WAKE.wait(30)
            WAKE.clear()
            continue
        job = min(queued, key=lambda j: j.get("created", 0))
        # One job's trouble is that job's. This thread is the whole queue, and if it
        # dies nothing after it ever runs, with nothing to say why.
        try:
            run_job(job)
        except Exception as e:  # noqa: BLE001
            print(f"job {job.get('id')}: {e}", file=sys.stderr, flush=True)
            time.sleep(1)


def prune_old_jobs() -> None:
    now = time.time()
    for job in all_jobs():
        if job.get("state") in ("done", "error", "cancelled") and now - job.get("finished", now) > KEEP_JOBS_SECONDS:
            shutil.rmtree(job_path(job["id"]), ignore_errors=True)
        # A job whose pictures stopped arriving an hour ago is not going to start.
        elif job.get("state") == "receiving" and now - job.get("created", now) > 3600:
            shutil.rmtree(job_path(job["id"]), ignore_errors=True)


def recover() -> None:
    """A job that was running when the container stopped cannot be resumed."""
    for job in all_jobs():
        if job.get("state") == "running":
            job.update(state="error", phase="error", error="the trainer restarted while this was training", finished=int(time.time()))
            save_job(job)
            shutil.rmtree(job_path(job["id"], "dataset"), ignore_errors=True)

    # An upload that never finished leaves its staging folder and no state.
    try:
        for job_id in os.listdir(jobs_dir()):
            if not os.path.exists(job_path(job_id, "state.json")):
                shutil.rmtree(job_path(job_id), ignore_errors=True)
    except OSError:
        pass


def cancel(job_id: str) -> dict | None:
    job = load_job(job_id)
    if not job:
        return None
    if job["state"] in ("queued", "receiving"):
        job.update(state="cancelled", phase="cancelled", finished=int(time.time()))
        save_job(job)
        shutil.rmtree(job_path(job_id, "dataset"), ignore_errors=True)
        return job
    # A running job has no process between its commands, or during a download before
    # the first, so the cancel is noted whether or not there is one to stop: run_command
    # will not start the next. Noted only when there was a process, a cancel in one of
    # those gaps answered 200 and the job trained on to its end.
    with LOCK:
        proc = RUNNING.get(job_id)
        if job["state"] == "running":
            CANCELLING.add(job_id)
    if job["state"] == "running" and proc:
        try:
            os.killpg(proc.pid, signal.SIGTERM)
        except (OSError, AttributeError):
            proc.terminate()
        threading.Timer(20, lambda: proc.poll() is None and proc.kill()).start()
    return job


# ── HTTP ───────────────────────────────────────────────────────────────────────

class Handler(BaseHTTPRequestHandler):
    server_version = "OppaiLibTrainer/" + VERSION

    def log_message(self, fmt, *args):  # quieter than the default: one line per request
        sys.stderr.write("%s %s\n" % (self.command, self.path.split("?")[0]))

    def send_json(self, code: int, body) -> None:
        data = json.dumps(body).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def fail(self, code: int, msg: str) -> None:
        self.send_json(code, {"error": msg})

    def authorized(self, job: dict | None = None) -> bool:
        if not TOKEN:
            return True
        if secrets.compare_digest(self.headers.get("Authorization", ""), "Bearer " + TOKEN):
            return True
        # A finished file can be fetched with the job's own download token, which is
        # what lets a generator install it straight from here without the trainer's.
        if job is not None:
            dl = parse_qs(urlparse(self.path).query).get("dl", [""])[0]
            return bool(dl) and secrets.compare_digest(dl, job.get("download", ""))
        return False

    def route(self):
        u = urlparse(self.path)
        parts = [p for p in u.path.split("/") if p]
        return parts, {k: v[0] for k, v in parse_qs(u.query).items()}

    def do_GET(self):
        parts, q = self.route()
        if parts == ["health"]:
            if not self.authorized():
                return self.fail(401, "wrong trainer token")
            jobs = all_jobs()
            return self.send_json(200, {
                "ok": True, "version": VERSION, "features": features(), "sdScripts": SD_SCRIPTS_VERSION,
                "musubiTuner": MUSUBI_VERSION, "families": TRAINABLE,
                "busy": any(j["state"] == "running" for j in jobs),
                "queued": sum(1 for j in jobs if j["state"] == "queued"),
                "modelsMounted": os.path.isdir(MODELS) and bool(os.listdir(MODELS)),
                **gpu_info(),
            })
        if parts == ["bases"]:
            if not self.authorized():
                return self.fail(401, "wrong trainer token")
            path, where = find_base(q.get("key", ""), int(q.get("size", "0") or 0))
            return self.send_json(200, {"present": bool(path), "where": where})
        if parts == ["jobs"]:
            if not self.authorized():
                return self.fail(401, "wrong trainer token")
            return self.send_json(200, {"jobs": [public(j) for j in all_jobs()]})
        if len(parts) >= 2 and parts[0] == "jobs":
            job = load_job(parts[1]) if re.fullmatch(r"[0-9a-f-]{1,40}", parts[1]) else None
            if not job:
                return self.fail(404, "no such job")
            if len(parts) == 2:
                if not self.authorized():
                    return self.fail(401, "wrong trainer token")
                return self.send_json(200, public(job))
            if parts[2] == "output" and len(parts) <= 4:
                if not self.authorized(job):
                    return self.fail(401, "wrong trainer token")
                if job.get("state") != "done" or not job.get("output"):
                    return self.fail(409, "the job has no finished file")
                return self.send_file(job_path(job["id"], "output", job["output"]), "application/octet-stream", job["output"])
            if parts[2] == "samples" and len(parts) == 4:
                if not self.authorized():
                    return self.fail(401, "wrong trainer token")
                if parts[3] not in job.get("samples", []):
                    return self.fail(404, "no such sample")
                return self.send_file(job_path(job["id"], "output", "sample", parts[3]), "image/png", None)
        self.fail(404, "not found")

    def send_file(self, path: str, ctype: str, download: str | None) -> None:
        try:
            size = os.path.getsize(path)
            f = open(path, "rb")
        except OSError:
            return self.fail(404, "the file is gone")
        with f:
            self.send_response(200)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(size))
            if download:
                self.send_header("Content-Disposition", f'attachment; filename="{download}"')
            self.end_headers()
            shutil.copyfileobj(f, self.wfile, 1 << 20)

    def do_PUT(self):
        parts, q = self.route()
        if not self.authorized():
            return self.fail(401, "wrong trainer token")
        if len(parts) == 4 and parts[0] == "jobs" and parts[2] == "files":
            job = load_job(parts[1]) if re.fullmatch(r"[0-9a-f-]{1,40}", parts[1]) else None
            if not job:
                return self.fail(404, "no such job")
            try:
                repeats = int(q["repeats"]) if q.get("repeats") else None
                receive_file(job, parts[3], self.rfile, int(self.headers.get("Content-Length", "0") or 0), repeats)
            except (ValueError, OSError) as e:
                return self.fail(400, str(e))
            self.send_response(204)
            self.end_headers()
            return
        if parts != ["bases"]:
            return self.fail(404, "not found")
        key, size = q.get("key", ""), int(q.get("size", "0") or 0)
        length = int(self.headers.get("Content-Length", "0") or 0)
        if not key or size <= 0 or length != size:
            return self.fail(400, "key and size are required, and the body must be that size")
        os.makedirs(bases_dir(), exist_ok=True)
        dest = cached_base_path(key, size)
        part = dest + ".part"
        got = 0
        with open(part, "wb") as out:
            body = _Limited(self.rfile, length)
            while True:
                chunk = body.read(1 << 20)
                if not chunk:
                    break
                out.write(chunk)
                got += len(chunk)
        if got != size:
            os.remove(part)
            return self.fail(400, "the upload broke off")
        os.replace(part, dest)
        prune_bases(dest)
        self.send_json(200, {"present": True, "where": "cache"})

    def do_POST(self):
        parts, q = self.route()
        if not self.authorized():
            return self.fail(401, "wrong trainer token")
        if parts == ["detect"]:
            length = int(self.headers.get("Content-Length", "0") or 0)
            if length <= 0 or length > DETECT_MAX_BYTES:
                return self.fail(400, "send the picture, up to 40 MB")
            if "detect-people" not in features():
                return self.fail(501, "this trainer has no person detector — update the oppailib-trainer container")
            data = _Limited(self.rfile, length).read()
            try:
                conf = float(q.get("conf", "0.35"))
            except ValueError:
                conf = 0.35
            busy = any(j["state"] == "running" for j in all_jobs())
            try:
                found = detect.people(data, MODELS, conf=conf, busy=busy)
            except Exception as e:  # a picture PIL can't open, or the model failing
                return self.fail(400, f"couldn't look for people in that picture: {e}")
            return self.send_json(200, found)
        if parts == ["jobs"]:
            length = int(self.headers.get("Content-Length", "0") or 0)
            if length <= 0 or length > 1 << 20:
                return self.fail(400, "the job's settings are missing or too large")
            try:
                job = create_job(json.loads(_Limited(self.rfile, length).read().decode("utf-8")))
            except (ValueError, OSError) as e:
                return self.fail(400, str(e))
            return self.send_json(200, public(job))
        if len(parts) == 3 and parts[0] == "jobs" and parts[2] == "start":
            job = load_job(parts[1]) if re.fullmatch(r"[0-9a-f-]{1,40}", parts[1]) else None
            if not job:
                return self.fail(404, "no such job")
            try:
                start_job(job)
            except ValueError as e:
                return self.fail(400, str(e))
            WAKE.set()
            return self.send_json(200, public(job))
        if len(parts) == 3 and parts[0] == "jobs" and parts[2] == "cancel":
            job = cancel(parts[1])
            if not job:
                return self.fail(404, "no such job")
            return self.send_json(200, public(job))
        self.fail(404, "not found")

    def do_DELETE(self):
        parts, _ = self.route()
        if not self.authorized():
            return self.fail(401, "wrong trainer token")
        if len(parts) == 2 and parts[0] == "jobs" and re.fullmatch(r"[0-9a-f-]{1,40}", parts[1]):
            job = load_job(parts[1])
            if not job:
                return self.fail(404, "no such job")
            if job["state"] in ("queued", "running", "receiving"):
                cancel(job["id"])
                if job["state"] == "running":
                    return self.fail(409, "it is still stopping; ask again in a moment")
            shutil.rmtree(job_path(job["id"]), ignore_errors=True)
            self.send_response(204)
            self.end_headers()
            return
        self.fail(404, "not found")


def main() -> None:
    os.makedirs(jobs_dir(), exist_ok=True)
    os.makedirs(bases_dir(), exist_ok=True)
    recover()
    threading.Thread(target=worker, daemon=True).start()
    addr = os.environ.get("TRAINER_ADDR", "0.0.0.0")
    port = int(os.environ.get("TRAINER_PORT", "7870"))
    if not TOKEN:
        sys.stderr.write("warning: TRAINER_TOKEN is not set; anyone who can reach this port can use the GPU\n")
    sys.stderr.write(f"OppaiLib trainer {VERSION} on {addr}:{port}, models {MODELS}, data {DATA}\n")
    ThreadingHTTPServer((addr, port), Handler).serve_forever()


if __name__ == "__main__":
    main()
