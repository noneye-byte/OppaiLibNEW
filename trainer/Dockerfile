# ── OppaiLib trainer ─────────────────────────────────────────────────────
# The LoRA trainer OppaiLib drives (server.py), on kohya's sd-scripts for SD 1.5, SDXL
# and the newer models it knows, and musubi-tuner for the rest. Kept out of the OppaiLib image on
# purpose: that one is a Go binary of a few hundred megabytes, and this is PyTorch
# with CUDA — gigabytes, and useful only on a box with an NVIDIA GPU.
#
# Run it with the GPU passed through (Unraid: --runtime=nvidia and
# NVIDIA_VISIBLE_DEVICES), a /data volume for jobs and the base-model cache, and
# optionally the generator's models folder at /models so checkpoints need not be
# sent over. See unraid/oppailib-trainer.xml.

# sd-scripts needs PyTorch 2.6 or later since diffusers 0.40 does; 2.6 is what its CI
# runs on, and CUDA 12.4 runs on any driver from 550 up.
FROM pytorch/pytorch:2.6.0-cuda12.4-cudnn9-runtime

ARG SD_SCRIPTS_VERSION=v0.12.3
ARG MUSUBI_TUNER_VERSION=v0.3.6

# opencv (which sd-scripts imports for bucketing) needs libGL and glib at runtime;
# git fetches the trainers themselves.
RUN apt-get update && apt-get install -y --no-install-recommends git libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# sd-scripts' requirements end with "-e .", which installs its own library package
# from the checkout, so they are installed from inside it. The two trainers pin the same
# versions of everything they share, which is why one Python can hold both.
RUN git clone --depth 1 --branch "${SD_SCRIPTS_VERSION}" https://github.com/kohya-ss/sd-scripts /opt/sd-scripts \
    && cd /opt/sd-scripts \
    && pip install --no-cache-dir -r requirements.txt \
    && python -c "import torch, accelerate, transformers, diffusers, library.train_util"

RUN git clone --depth 1 --branch "${MUSUBI_TUNER_VERSION}" https://github.com/kohya-ss/musubi-tuner /opt/musubi-tuner \
    && cd /opt/musubi-tuner \
    && pip install --no-cache-dir --no-deps -e . \
    && pip install --no-cache-dir "av==17.1.0" "easydict==1.13" "pillow>=11.3.0" \
    && python -c "import musubi_tuner.hv_train_network, library.train_util"

# The CLIP tokenizers every SD 1.5 and SDXL run loads, saved where sd-scripts'
# --tokenizer_cache_dir looks for them (the repo id with "/" as "_"), so a training
# run on a box without internet does not stop at "can't download the tokenizer".
# Transformers 5 saves a tokenizer as tokenizer.json alone, not the vocab.json it did.
# The new families' are below; the weights of none of these are in the image.
RUN python -c "from transformers import CLIPTokenizer as T; \
[T.from_pretrained(r).save_pretrained('/opt/tokenizers/' + r.replace('/', '_')) \
 for r in ('openai/clip-vit-large-patch14', 'laion/CLIP-ViT-bigG-14-laion2B-39B-b160k')]" \
    && test -f /opt/tokenizers/openai_clip-vit-large-patch14/tokenizer.json \
    && test -f /opt/tokenizers/laion_CLIP-ViT-bigG-14-laion2B-39B-b160k/tokenizer.json

# The tokenizers the newer families read from the Hub, saved in its cache so a run needs
# no internet. Public repositories, and small: tokenizer files alone. One that is gone
# from the Hub costs its family a download at run time, which is no reason to fail a build.
RUN python -c "\
from huggingface_hub import snapshot_download as get; \
repos = ['google/t5-v1_1-xxl', 'Alpha-VLLM/Lumina-Image-2.0', 'OpenMOSS-Team/MOSS-Image-Base', \
         'Tongyi-MAI/Z-Image', 'Qwen/Qwen-Image', 'Qwen/Qwen3-4B', 'Qwen/Qwen3-8B', 'Qwen/Qwen3-VL-4B-Instruct']; \
[get(r, allow_patterns=['*tokenizer*', '*.model', 'vocab*', 'merges*', 'special_tokens*', '*config.json', 'tokenizer/*', 'text_encoder/config.json']) \
 for r in repos]" || echo "a tokenizer could not be baked in; its family fetches it at run time"

# Finding people in a comic's panels (detect.py): ultralytics and the person
# segmentation model ADetailer itself downloads, baked in so it works offline. The
# opencv sd-scripts pinned is kept: ultralytics accepts it, and takes numpy as it finds it.
RUN pip install --no-cache-dir "ultralytics==8.3.40" "opencv-python==4.10.0.84" \
    && mkdir -p /opt/detectors \
    && python -c "import urllib.request as u; u.urlretrieve('https://huggingface.co/Bingsu/adetailer/resolve/main/person_yolov8m-seg.pt', '/opt/detectors/person_yolov8m-seg.pt')" \
    && YOLO_CONFIG_DIR=/tmp/yolo python -c "from ultralytics import YOLO; YOLO('/opt/detectors/person_yolov8m-seg.pt')" \
    && python -c "import library.train_util, cv2, numpy"

COPY server.py detect.py /opt/trainer/

ENV TRAINER_DATA=/data \
    TRAINER_MODELS=/models \
    TRAINER_PORT=7870 \
    TRAINER_TOKENIZERS=/opt/tokenizers \
    SD_SCRIPTS=/opt/sd-scripts \
    SD_SCRIPTS_VERSION=${SD_SCRIPTS_VERSION} \
    MUSUBI_TUNER=/opt/musubi-tuner \
    MUSUBI_TUNER_VERSION=${MUSUBI_TUNER_VERSION} \
    HF_HUB_DISABLE_TELEMETRY=1 \
    YOLO_CONFIG_DIR=/data/.yolo \
    YOLO_OFFLINE=true \
    PYTHONUNBUFFERED=1

VOLUME ["/data"]
EXPOSE 7870
ENTRYPOINT ["python", "/opt/trainer/server.py"]
