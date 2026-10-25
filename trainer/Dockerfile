# ── OppaiLib trainer ─────────────────────────────────────────────────────
# The LoRA trainer OppaiLib drives (server.py). Kept out of the OppaiLib image on
# purpose: that one is a Go binary of a few hundred megabytes, and this is PyTorch
# with CUDA — gigabytes, and useful only on a box with an NVIDIA GPU.
#
# Run it with the GPU passed through (Unraid: --runtime=nvidia and
# NVIDIA_VISIBLE_DEVICES), a /data volume for jobs and the base-model cache, and
# optionally the generator's models folder at /models so checkpoints need not be
# sent over. See unraid/oppailib-trainer.xml.

# PyTorch 2.4 is what sd-scripts v0.9.1's pins (accelerate 0.30, transformers 4.44,
# diffusers 0.25) were released against; CUDA 12.4 runs on any driver from 550 up.
FROM pytorch/pytorch:2.4.1-cuda12.4-cudnn9-runtime

ARG SD_SCRIPTS_VERSION=v0.9.1

# opencv (which sd-scripts imports for bucketing) needs libGL and glib at runtime;
# git fetches sd-scripts itself.
RUN apt-get update && apt-get install -y --no-install-recommends git libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# sd-scripts' requirements end with "-e .", which installs its own library package
# from the checkout, so they are installed from inside it. numpy is held below 2: the
# opencv-python they pin (4.8.1.78) is built against numpy 1 and fails to import
# ("_ARRAY_API not found") beside numpy 2, which pip otherwise picks.
RUN git clone --depth 1 --branch "${SD_SCRIPTS_VERSION}" https://github.com/kohya-ss/sd-scripts /opt/sd-scripts \
    && cd /opt/sd-scripts \
    && pip install --no-cache-dir -r requirements.txt "numpy<2" \
    && python -c "import torch, accelerate, transformers, diffusers, library.train_util"

# The CLIP tokenizers every SD 1.5 and SDXL run loads, saved where sd-scripts'
# --tokenizer_cache_dir looks for them (the repo id with "/" as "_"), so a training
# run on a box without internet does not stop at "can't download the tokenizer".
RUN python -c "from transformers import CLIPTokenizer as T; \
[T.from_pretrained(r).save_pretrained('/opt/tokenizers/' + r.replace('/', '_')) \
 for r in ('openai/clip-vit-large-patch14', 'laion/CLIP-ViT-bigG-14-laion2B-39B-b160k')]" \
    && test -f /opt/tokenizers/openai_clip-vit-large-patch14/vocab.json \
    && test -f /opt/tokenizers/laion_CLIP-ViT-bigG-14-laion2B-39B-b160k/vocab.json

COPY server.py /opt/trainer/server.py

ENV TRAINER_DATA=/data \
    TRAINER_MODELS=/models \
    TRAINER_PORT=7870 \
    TRAINER_TOKENIZERS=/opt/tokenizers \
    SD_SCRIPTS=/opt/sd-scripts \
    SD_SCRIPTS_VERSION=${SD_SCRIPTS_VERSION} \
    HF_HUB_DISABLE_TELEMETRY=1 \
    PYTHONUNBUFFERED=1

VOLUME ["/data"]
EXPOSE 7870
ENTRYPOINT ["python", "/opt/trainer/server.py"]
