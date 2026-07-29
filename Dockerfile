# ── OppaiLib single-image build ─────────────────────────────────────────
# Multi-stage: build the web UI, build the Go binary (with the web assets
# embedded), then ship a runtime image.
#
# Two runtime targets:
#   --target runtime        lean, cgo-free, heuristic tagging only
#   --target runtime-onnx   default; bakes in ONNX Runtime + the wd14 tagger
#                           model for real NSFW content tagging (~540MB, of
#                           which the model is 379MB and the runtime .so 23MB)

# --- Stage 1: web UI ----------------------------------------------------
FROM node:22-alpine AS web
WORKDIR /web
COPY web/package.json web/package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY web/ ./
ENV OPPAI_WEB_OUTDIR=/web/dist
RUN npm run build          # emits /web/dist

# --- Stage 2: Go backend (lean, cgo-free) -------------------------------
FROM golang:1.25-bookworm AS backend
WORKDIR /src
COPY backend/go.mod backend/go.sum* ./
RUN go mod download
COPY backend/ ./
# Web assets are embedded via go:embed from this path:
COPY --from=web /web/dist ./internal/web/dist
# Build version stamp — pass with `--build-arg OPPAI_VERSION=$(git describe --tags --always)`
# so the running container can be matched to a source revision (GET /api/health).
ARG OPPAI_VERSION=docker
ENV LDFLAGS="-s -w -X github.com/youruser/oppailib/internal/buildinfo.Version=${OPPAI_VERSION}"
# CGO off → pure-Go sqlite; static-ish binary.
RUN CGO_ENABLED=0 go build -ldflags="${LDFLAGS}" -o /out/oppailib ./cmd/oppailib

# --- Stage 2b: Go backend (onnx) ----------------------------------------
# onnxruntime_go binds the C API, so this build needs cgo. sqlite stays pure-Go
# either way — CGO_ENABLED=1 only permits cgo, it does not switch drivers.
# The ONNX Runtime headers are vendored by onnxruntime_go and the .so is
# dlopen'd at runtime, so nothing extra is needed to *compile*.
FROM backend AS backend-onnx
ARG OPPAI_VERSION=docker
RUN CGO_ENABLED=1 go build -tags onnx -ldflags="${LDFLAGS}" -o /out/oppailib-onnx ./cmd/oppailib

# --- Stage 2c: ONNX Runtime + tagger model ------------------------------
# Pinned so a rebuild is reproducible. onnxruntime_go 1.31 requests ORT C API
# version 26, so this must be >= 1.26.0 — an older runtime aborts at startup with
# "Error setting ORT API base". Verified against 1.26.0.
FROM debian:bookworm-slim AS onnxdeps
ARG ORT_VERSION=1.26.0
# JoyTag: a ViT over the Danbooru tag schema, but trained past the Danbooru domain onto
# photographs as well as drawn art. That is the whole reason it's the default. A wd14
# tagger only ever saw anime, so on a photograph it either says nothing or says something
# it made up — and this library holds both. JoyTag tags the drawn and the real with one
# model and one vocabulary, which also means one set of tags to search across.
#
# Files: model.onnx + top_tags.txt (~5k tags, one per line). See MODEL_JSON below for the
# contract, and docs/AI.md for swapping in something else.
ARG MODEL_REPO=fancyfeast/joytag
ARG MODEL_LABELS=top_tags.txt
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /out/lib /out/models \
    && curl -fsSL -o /tmp/ort.tgz \
        "https://github.com/microsoft/onnxruntime/releases/download/v${ORT_VERSION}/onnxruntime-linux-x64-${ORT_VERSION}.tgz" \
    && tar -xzf /tmp/ort.tgz -C /tmp \
    && cp -a /tmp/onnxruntime-linux-x64-${ORT_VERSION}/lib/libonnxruntime.so* /out/lib/ \
    && rm -rf /tmp/ort.tgz /tmp/onnxruntime-linux-x64-${ORT_VERSION}
# Hugging Face drops long transfers. A truncated model.onnx would bake a corrupt
# model into the image that only fails at the first inference, so resume on
# failure and sanity-check the sizes before the layer is committed. (These are
# floors, not checksums — MODEL_REPO is a build arg, so exact digests would go
# stale the moment anyone points it at a different model.)
RUN curl -fL --retry 8 --retry-all-errors --retry-delay 3 -C - \
        -o /out/models/model.onnx "https://huggingface.co/${MODEL_REPO}/resolve/main/model.onnx" \
    && curl -fL --retry 8 --retry-all-errors --retry-delay 3 \
        -o "/out/models/${MODEL_LABELS}" "https://huggingface.co/${MODEL_REPO}/resolve/main/${MODEL_LABELS}" \
    && [ "$(wc -c < /out/models/model.onnx)" -gt 100000000 ] \
    && [ "$(wc -l < "/out/models/${MODEL_LABELS}")" -gt 1000 ]
# JoyTag wants CLIP-normalized RGB in NCHW: 0–255 scaled to 0–1, then the CLIP mean and
# std. Getting these wrong doesn't fail — it just quietly produces worse tags — so they
# are spelled out rather than left to the defaults. input_name/output_name/input_size are
# read from the graph, so they stay unset.
#
# "activation" is the one that isn't merely a quality knob: JoyTag's graph ends at the
# tag *logits*, so without the sigmoid the 0.4 threshold would be compared against
# unbounded numbers and the scores stored on every tag would leave [0,1]. A wd14 export
# bakes its activation in and needs "none" — which is the default.
ARG MODEL_THRESHOLD=0.4
ARG MODEL_ACTIVATION=sigmoid
RUN printf '%s\n' \
    '{' \
    '  "model": "model.onnx",' \
    "  \"labels\": \"${MODEL_LABELS}\"," \
    '  "layout": "nchw",' \
    '  "scale": 0.00392156862745098,' \
    '  "mean": [0.48145466, 0.4578275, 0.40821073],' \
    '  "std":  [0.26862954, 0.26130258, 0.27577711],' \
    "  \"activation\": \"${MODEL_ACTIVATION}\"," \
    "  \"threshold\": ${MODEL_THRESHOLD}," \
    '  "category": "general"' \
    '}' > /out/models/model.json

# --- Stage 3: lean runtime (no AI model) --------------------------------
FROM debian:bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates ffmpeg \
    && rm -rf /var/lib/apt/lists/*
COPY --from=backend /out/oppailib /usr/local/bin/oppailib
# The Android client, offered for download from the server that holds the library.
# CI drops the freshly-built APK into docker/apk/ before the image build; the
# directory is committed (with only a .gitkeep in it) so this COPY works either way
# and a local `docker build` doesn't need an Android toolchain.
COPY docker/apk/ /app/apk/

ENV OPPAI_HTTP_ADDR=:8080 \
    OPPAI_MEDIA_DIR=/media \
    OPPAI_CONFIG_DIR=/config \
    OPPAI_DB_PATH=/db/oppailib.sqlite \
    OPPAI_AI_MODEL_DIR=/config/models \
    OPPAI_APK_PATH=/app/apk/oppailib.apk

VOLUME ["/media", "/config", "/db"]
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/oppailib"]

# --- Stage 4: onnx runtime (default) ------------------------------------
FROM debian:bookworm-slim AS runtime-onnx
# libgomp1 is required by the ONNX Runtime CPU build.
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates libgomp1 ffmpeg \
    && rm -rf /var/lib/apt/lists/*
COPY --from=backend-onnx /out/oppailib-onnx /usr/local/bin/oppailib
COPY --from=onnxdeps /out/lib/ /usr/local/lib/
# The model lives outside /config on purpose. /config is a VOLUME, and a bind
# mount over it (what the Unraid template does) would hide anything baked
# underneath — the model would silently vanish and tagging would fall back to
# the heuristic tagger. Point OPPAI_AI_MODEL_DIR at /config/models yourself if
# you would rather manage the model from the host.
COPY --from=onnxdeps /out/models/ /opt/oppailib/models/
# See the lean stage: the APK ships with the server that serves the library.
COPY docker/apk/ /app/apk/
RUN ldconfig

ENV OPPAI_HTTP_ADDR=:8080 \
    OPPAI_MEDIA_DIR=/media \
    OPPAI_CONFIG_DIR=/config \
    OPPAI_DB_PATH=/db/oppailib.sqlite \
    OPPAI_AI_MODEL_DIR=/opt/oppailib/models \
    OPPAI_APK_PATH=/app/apk/oppailib.apk \
    ONNXRUNTIME_LIB_PATH=/usr/local/lib/libonnxruntime.so

VOLUME ["/media", "/config", "/db"]
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/oppailib"]
