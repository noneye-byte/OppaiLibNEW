"""Stands in for sd-scripts in the tests: prints what a training run prints and
writes the file one leaves behind. TRAINER_COMMAND points here."""

import os
import struct
import sys
import time
import zlib

args = dict(a[2:].split("=", 1) for a in sys.argv[1:] if a.startswith("--") and "=" in a)
out, name = args["output_dir"], args["output_name"]
if os.environ.get("FAKE_TRAIN_FAIL"):
    print("torch.OutOfMemoryError: CUDA out of memory. Tried to allocate 2.00 GiB", flush=True)
    sys.exit(1)
print("caching latents.", flush=True)
for epoch in (1, 2):
    print(f"\nepoch {epoch}/2", flush=True)
    for step in range(1, 6):
        n = (epoch - 1) * 5 + step
        sys.stdout.write(f"\rsteps:  {n * 10}%|##        | {n}/10 [00:0{n}<00:0{10 - n},  2.00it/s, avr_loss=0.1{n}]")
        sys.stdout.flush()
        time.sleep(float(os.environ.get("FAKE_TRAIN_STEP", "0.02")))
if "sample_prompts" in args:
    os.makedirs(os.path.join(out, "sample"), exist_ok=True)
    # A real picture, so a client that shows it shows something.
    raw = b"".join(b"\0" + b"\xc8\x78\x8c" * 8 for _ in range(8))

    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)

    with open(os.path.join(out, "sample", f"{name}_e000002_00_0.png"), "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", 8, 8, 8, 2, 0, 0, 0))
                + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b""))
with open(os.path.join(out, f"{name}.safetensors"), "wb") as f:
    f.write(b"lora-weights")
print("\nmodel saved.", flush=True)
