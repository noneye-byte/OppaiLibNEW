"""Finding the people in a picture, for cutting them out of a comic's panels.

A training set for a character wants her alone, and a manga page has her among
panels, speech balloons and other people. ADetailer finds people with a YOLO
segmentation model; there is no way to ask A1111 to run it alone, so the trainer runs
the same model (person_yolov8m-seg.pt, baked into the image) and hands back where each
person is: a box, and the outline of the figure inside it. OppaiLib's browser does the
cutting, so the picture is never written to disk here.

ultralytics is imported when the first picture comes, not at the top: server.py stays
standard-library only, and its tests run without it (test_server.py).
"""

from __future__ import annotations

import glob
import io
import os
import threading

# The model the image bakes in, then anything ADetailer has in the generator's models
# folder when that is mounted at /models.
DETECTOR = os.environ.get("TRAINER_DETECTOR", "/opt/detectors/person_yolov8m-seg.pt")

_lock = threading.Lock()
_models: dict[str, object] = {}


def detector_path(models_dir: str) -> str:
    """The person detector to use, "" when there is none."""
    if DETECTOR and os.path.isfile(DETECTOR):
        return DETECTOR
    for pattern in ("adetailer/person_yolov8*-seg.pt", "adetailer/person_yolov8*.pt"):
        found = sorted(glob.glob(os.path.join(models_dir, pattern)))
        if found:
            return found[-1]
    return ""


def available(models_dir: str) -> bool:
    if not detector_path(models_dir):
        return False
    try:
        import ultralytics  # noqa: F401
    except ImportError:
        return False
    return True


def _model(path: str):
    if path not in _models:
        from ultralytics import YOLO

        _models[path] = YOLO(path)
    return _models[path]


def people(data: bytes, models_dir: str, conf: float = 0.35, busy: bool = False) -> dict:
    """Every person in a picture: box, score and outline in its own pixels, largest
    first. On the CPU while a training run has the GPU, so finding people never takes
    memory a run needs."""
    path = detector_path(models_dir)
    if not path:
        raise RuntimeError("the trainer has no person detector")
    from PIL import Image

    img = Image.open(io.BytesIO(data))
    img.load()
    # A manga page is greyscale and often a palette PNG; the model wants three channels.
    img = img.convert("RGB")
    device = "cpu"
    if not busy:
        try:
            import torch

            if torch.cuda.is_available():
                device = 0
        except ImportError:
            pass
    with _lock:
        result = _model(path).predict(img, conf=max(0.05, min(conf, 0.95)), device=device, verbose=False, retina_masks=True)[0]
    found = []
    boxes = result.boxes
    outlines = result.masks.xy if result.masks is not None else []
    for i in range(len(boxes)):
        x0, y0, x1, y1 = (int(round(float(v))) for v in boxes.xyxy[i].tolist())
        outline = []
        if i < len(outlines):
            outline = [[int(round(float(x))), int(round(float(y)))] for x, y in outlines[i].tolist()]
        found.append({
            "box": [x0, y0, x1, y1],
            "score": round(float(boxes.conf[i]), 3),
            "outline": outline,
        })
    found.sort(key=lambda p: (p["box"][2] - p["box"][0]) * (p["box"][3] - p["box"][1]), reverse=True)
    return {"width": img.width, "height": img.height, "model": os.path.basename(path), "people": found}
