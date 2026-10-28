"""Tests for the trainer that need no GPU: the arguments, the progress, the paths, and
a whole job through the HTTP API with fake_train.py standing in for sd-scripts.

    python -m unittest test_server.py
"""

import json
import os
import struct
import sys
import tempfile
import threading
import time
import unittest
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
TMP = tempfile.mkdtemp(prefix="oppai-trainer-test-")
os.environ.update(
    TRAINER_DATA=os.path.join(TMP, "data"),
    TRAINER_MODELS=os.path.join(TMP, "models"),
    TRAINER_TOKEN="secret",
    SD_SCRIPTS=os.path.join(TMP, "no-sd-scripts"),
    TRAINER_COMMAND=f'"{sys.executable}" "{os.path.join(HERE, "fake_train.py")}"' if os.name != "nt"
    else f"{sys.executable} {os.path.join(HERE, 'fake_train.py')}",
)
sys.path.insert(0, HERE)
import server  # noqa: E402


def safetensors(path, keys):
    header = json.dumps({k: {"dtype": "F16", "shape": [1], "data_offsets": [0, 2]} for k in keys}).encode()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(struct.pack("<Q", len(header)) + header + b"\0\0")
    return os.path.getsize(path)


class ArgsTest(unittest.TestCase):
    def test_an_sdxl_run_uses_the_sdxl_script_and_keeps_its_vae_in_full_precision(self):
        args = server.build_args({"name": "ink"}, "sdxl", "/m/pony.safetensors", "/d", "/o", None, "bf16")
        self.assertTrue(args[0].endswith("sdxl_train_network.py"))
        self.assertIn("--resolution=1024,1024", args)
        self.assertIn("--no_half_vae", args)
        self.assertNotIn("--clip_skip=2", args)

    def test_an_sd1_run_takes_clip_skip_and_trains_at_512(self):
        args = server.build_args({"name": "ink", "clipSkip": 2}, "sd1", "/m/a.safetensors", "/d", "/o", None, "fp16")
        self.assertTrue(args[0].endswith("/train_network.py") or args[0].endswith("\\train_network.py"))
        self.assertIn("--resolution=512,512", args)
        self.assertIn("--clip_skip=2", args)
        self.assertIn("--mixed_precision=fp16", args)

    def test_numbers_are_clamped_and_zero_is_the_default(self):
        args = server.build_args({"name": "x", "rank": 9999, "epochs": 0, "resolution": 1000}, "sdxl", "b", "d", "o", None, "bf16")
        self.assertIn("--network_dim=256", args)
        self.assertIn("--max_train_epochs=10", args)
        self.assertIn("--resolution=960,960", args)

    def test_the_trigger_word_stays_first_while_the_tags_shuffle(self):
        args = server.build_args({"name": "x", "trigger": "ohwx"}, "sd1", "b", "d", "o", None, "fp16")
        self.assertIn("--shuffle_caption", args)
        self.assertIn("--keep_tokens=1", args)

    def test_unet_only_drops_the_text_encoder_rate(self):
        args = server.build_args({"name": "x", "unetOnly": True}, "sdxl", "b", "d", "o", None, "bf16")
        self.assertIn("--network_train_unet_only", args)
        self.assertFalse(any(a.startswith("--text_encoder_lr") for a in args))

    def test_sample_prompts_carry_their_size_and_negative(self):
        lines = server.sample_lines({"samples": [{"prompt": "ohwx, 1girl", "negative": "lowres"}, {"prompt": ""}]}, "sdxl")
        self.assertEqual(lines, ["ohwx, 1girl --w 1024 --h 1024 --s 24 --l 6 --d 1000 --n lowres"])


class ProgressTest(unittest.TestCase):
    def test_a_tqdm_redraw_reads_as_steps_eta_and_loss(self):
        job = {}
        server.read_progress("steps:  12%|█▏        | 120/1000 [01:23<10:12,  1.43it/s, avr_loss=0.0912]", job)
        self.assertEqual((job["step"], job["total"], job["eta"], job["loss"]), (120, 1000, "10:12", 0.0912))

    def test_a_caching_bar_is_not_mistaken_for_training_steps(self):
        job = {}
        server.read_progress("100%|██████████| 40/40 [00:12<00:00,  3.21it/s]", job)
        self.assertNotIn("step", job)
        server.read_progress("caching latents.", job)
        self.assertEqual(job["phase"], "caching")

    def test_the_epoch_line_is_read(self):
        job = {}
        server.read_progress("epoch 3/10", job)
        self.assertEqual((job["epoch"], job["epochs"]), (3, 10))


class PathsTest(unittest.TestCase):
    def test_dataset_files_are_plain_pictures_and_captions(self):
        self.assertEqual(server.safe_file("0001.png"), "0001.png")
        self.assertEqual(server.safe_file("0001.txt"), "0001.txt")
        for bad in ["../x.png", "a/b.png", "a\b.png", "x.sh", ".x.png", "job.json", "x y.png"]:
            self.assertIsNone(server.safe_file(bad), bad)

    def test_a_key_finds_its_file_by_alias_case_or_name(self):
        root = tempfile.mkdtemp(dir=TMP)
        size = safetensors(os.path.join(root, "checkpoints", "Pony.safetensors"), ["conditioner.embedders.1.x"])
        # A1111's folder name for what this mount calls "checkpoints".
        self.assertTrue(server.resolve_in_models("Stable-diffusion/Pony.safetensors", size, root))
        # InvokeAI's path for the same file, by name.
        self.assertTrue(server.resolve_in_models("sdxl/main/pony.safetensors", size, root))
        self.assertIsNone(server.resolve_in_models("Stable-diffusion/Pony.safetensors", size + 1, root))
        self.assertIsNone(server.resolve_in_models("../../etc/passwd", 0, root))

    def test_the_family_is_read_off_the_tensor_names(self):
        root = tempfile.mkdtemp(dir=TMP)
        cases = {"conditioner.embedders.1.model.x": "sdxl", "cond_stage_model.transformer.x": "sd1",
                 "double_blocks.0.x": "flux", "something.else": "unknown"}
        for key, want in cases.items():
            path = os.path.join(root, key + ".safetensors")
            safetensors(path, [key])
            self.assertEqual(server.checkpoint_family(path), want)


class ApiTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        os.makedirs(server.jobs_dir(), exist_ok=True)
        os.makedirs(server.bases_dir(), exist_ok=True)
        cls.httpd = server.ThreadingHTTPServer(("127.0.0.1", 0), server.Handler)
        cls.base = f"http://127.0.0.1:{cls.httpd.server_address[1]}"
        threading.Thread(target=cls.httpd.serve_forever, daemon=True).start()
        threading.Thread(target=server.worker, daemon=True).start()
        cls.size = safetensors(os.path.join(server.MODELS, "Stable-diffusion", "base.safetensors"), ["conditioner.embedders.1.x"])

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()

    def call(self, method, path, body=None, token="secret", ctype=None):
        req = urllib.request.Request(self.base + path, data=body, method=method)
        if token:
            req.add_header("Authorization", "Bearer " + token)
        if ctype:
            req.add_header("Content-Type", ctype)
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = resp.read()
                return resp.status, data
        except urllib.error.HTTPError as e:
            return e.code, e.read()

    def submit(self, cfg):
        code, body = self.call("POST", "/jobs", json.dumps(cfg).encode(), ctype="application/json")
        if code != 200:
            return code, body
        job_id = json.loads(body)["id"]
        for name, data in [("0001.png", b"png"), ("0001.txt", b"ohwx, 1girl")]:
            code, body = self.call("PUT", f"/jobs/{job_id}/files/{name}", data)
            self.assertEqual(code, 204, body)
        return self.call("POST", f"/jobs/{job_id}/start")

    def wait(self, job_id, states=("done", "error", "cancelled")):
        for _ in range(300):
            code, body = self.call("GET", f"/jobs/{job_id}")
            job = json.loads(body)
            if job["state"] in states:
                return job
            time.sleep(0.05)
        self.fail("the job never finished")

    def test_the_token_is_required(self):
        self.assertEqual(self.call("GET", "/health", token="")[0], 401)
        self.assertEqual(self.call("GET", "/health", token="wrong")[0], 401)
        self.assertEqual(self.call("GET", "/health")[0], 200)

    def test_a_job_trains_hands_over_its_file_and_drops_its_pictures(self):
        code, body = self.submit({"name": "ink_style", "trigger": "ohwx", "epochs": 2,
                                  "base": {"key": "Stable-diffusion/base.safetensors", "size": self.size},
                                  "samples": [{"prompt": "ohwx, 1girl"}]})
        self.assertEqual(code, 200, body)
        job = json.loads(body)
        done = self.wait(job["id"])
        self.assertEqual(done["state"], "done", done)
        self.assertEqual((done["family"], done["step"], done["total"], done["epoch"]), ("sdxl", 10, 10, 2))
        self.assertEqual(done["output"], "ink_style.safetensors")
        self.assertEqual(len(done["samples"]), 1)
        self.assertFalse(os.path.exists(server.job_path(job["id"], "dataset")), "the pictures outlived the run")
        # The file comes with the trainer's token, or with the job's own download token.
        self.assertEqual(self.call("GET", f"/jobs/{job['id']}/output", token=""), (401, self.call("GET", f"/jobs/{job['id']}/output", token="")[1]))
        code, data = self.call("GET", f"/jobs/{job['id']}/output?dl={done['download']}", token="")
        self.assertEqual((code, data), (200, b"lora-weights"))
        code, data = self.call("GET", f"/jobs/{job['id']}/samples/{done['samples'][0]}")
        self.assertEqual(code, 200)
        self.assertEqual(self.call("DELETE", f"/jobs/{job['id']}")[0], 204)
        self.assertEqual(self.call("GET", f"/jobs/{job['id']}")[0], 404)

    def test_a_missing_base_fails_the_job_with_a_reason(self):
        code, body = self.submit({"name": "x", "base": {"key": "Stable-diffusion/nowhere.safetensors", "size": 5}})
        self.assertEqual(code, 200)
        done = self.wait(json.loads(body)["id"])
        self.assertEqual(done["state"], "error")
        self.assertIn("not here", done["error"])

    def test_a_base_can_be_uploaded_into_the_cache(self):
        key, data = "sdxl/main/other.safetensors", b"x" * 64
        self.assertFalse(json.loads(self.call("GET", f"/bases?key={key}&size=64")[1])["present"])
        self.assertEqual(self.call("PUT", f"/bases?key={key}&size=64", data)[0], 200)
        self.assertEqual(json.loads(self.call("GET", f"/bases?key={key}&size=64")[1])["where"], "cache")

    def test_out_of_memory_is_said_plainly(self):
        os.environ["FAKE_TRAIN_FAIL"] = "1"
        try:
            code, body = self.submit({"name": "oom", "base": {"key": "Stable-diffusion/base.safetensors", "size": self.size}})
            done = self.wait(json.loads(body)["id"])
        finally:
            del os.environ["FAKE_TRAIN_FAIL"]
        self.assertEqual(done["state"], "error")
        self.assertIn("ran out of memory", done["error"])

    def test_a_running_job_can_be_cancelled(self):
        os.environ["FAKE_TRAIN_STEP"] = "0.5"
        try:
            code, body = self.submit({"name": "slow", "base": {"key": "Stable-diffusion/base.safetensors", "size": self.size}})
            job_id = json.loads(body)["id"]
            self.wait(job_id, states=("running",))
            self.assertEqual(self.call("POST", f"/jobs/{job_id}/cancel")[0], 200)
            done = self.wait(job_id)
        finally:
            del os.environ["FAKE_TRAIN_STEP"]
        self.assertEqual(done["state"], "cancelled")

    def test_a_file_that_is_not_a_picture_or_caption_is_refused(self):
        code, body = self.call("POST", "/jobs", json.dumps({"name": "x", "base": {"key": "k"}}).encode())
        job_id = json.loads(body)["id"]
        for name in [".hidden.png", "run.sh", "..%2Fescape.png"]:
            self.assertIn(self.call("PUT", f"/jobs/{job_id}/files/{name}", b"x")[0], (400, 404), name)
        self.assertFalse(os.path.exists(os.path.join(server.jobs_dir(), "escape.png")))
        # And a job with no pictures does not start.
        self.assertEqual(self.call("POST", f"/jobs/{job_id}/start")[0], 400)

    def test_a_picture_sent_with_its_own_repeats_lands_in_a_folder_of_its_own(self):
        code, body = self.call("POST", "/jobs", json.dumps({"name": "x", "trigger": "ohwx", "repeats": 10, "base": {"key": "k"}}).encode())
        job_id = json.loads(body)["id"]
        for path in ["0001.png?repeats=22", "0001.txt?repeats=22", "0002.png?repeats=3", "0002.txt?repeats=3"]:
            self.assertEqual(self.call("PUT", f"/jobs/{job_id}/files/{path}", b"x")[0], 204, path)
        dataset = server.job_path(job_id, "dataset")
        self.assertEqual(sorted(os.listdir(os.path.join(dataset, "22_ohwx"))), ["0001.png", "0001.txt"])
        self.assertEqual(sorted(os.listdir(os.path.join(dataset, "3_ohwx"))), ["0002.png", "0002.txt"])
        code, body = self.call("POST", f"/jobs/{job_id}/start")
        self.assertEqual((code, json.loads(body)["images"]), (200, 2))
        # The job's own 10_ohwx, which no picture went into, is not left for sd-scripts.
        self.assertEqual(sorted(os.listdir(dataset)), ["22_ohwx", "3_ohwx"])
        # It has no base model, so it ends by itself; wait rather than race it.
        self.wait(job_id)
        self.assertIn("repeats-per-file", json.loads(self.call("GET", "/health")[1])["features"])

    def test_a_job_saved_from_two_threads_at_once_keeps_a_whole_state_file(self):
        # Finished, so the worker leaves it alone: a queued one would be run.
        job = {"id": "20990101-000000-race00", "state": "done"}
        os.makedirs(server.job_path(job["id"]), exist_ok=True)
        errors = []

        def save(n):
            try:
                for _ in range(200):
                    server.save_job({**job, "n": n})
            except OSError as e:
                errors.append(e)
        threads = [threading.Thread(target=save, args=(n,)) for n in range(4)]
        for th in threads:
            th.start()
        for th in threads:
            th.join()
        self.assertEqual(errors, [])
        self.assertEqual(server.load_job(job["id"])["state"], "done")

    def test_a_job_with_a_bad_name_is_refused(self):
        self.assertEqual(self.call("POST", "/jobs", json.dumps({"name": "../x", "base": {"key": "k"}}).encode())[0], 400)

    def test_without_a_person_detector_detect_says_to_update_and_health_does_not_offer_it(self):
        server._can_detect = False
        try:
            self.assertNotIn("detect-people", json.loads(self.call("GET", "/health")[1])["features"])
            code, body = self.call("POST", "/detect", b"not a picture")
            self.assertEqual(code, 501, body)
            self.assertIn("update", json.loads(body)["error"])
        finally:
            server._can_detect = None

    def test_detect_hands_back_what_the_detector_found_and_runs_on_the_cpu_while_a_job_trains(self):
        seen = {}

        def people(data, models_dir, conf=0.35, busy=False):
            seen.update(data=data, conf=conf, busy=busy)
            return {"width": 10, "height": 20, "model": "fake.pt",
                    "people": [{"box": [1, 2, 8, 18], "score": 0.9, "outline": [[1, 2], [8, 2], [8, 18]]}]}

        real, server.detect.people = server.detect.people, people
        server._can_detect = True
        try:
            self.assertIn("detect-people", json.loads(self.call("GET", "/health")[1])["features"])
            code, body = self.call("POST", "/detect?conf=0.5", b"picture")
            self.assertEqual(code, 200, body)
            self.assertEqual(json.loads(body)["people"][0]["box"], [1, 2, 8, 18])
            self.assertEqual((seen["data"], seen["conf"], seen["busy"]), (b"picture", 0.5, False))
            self.assertEqual(self.call("POST", "/detect", b"")[0], 400)
            self.assertEqual(self.call("POST", "/detect", b"x", token="")[0], 401)
        finally:
            server.detect.people, server._can_detect = real, None


if __name__ == "__main__":
    unittest.main()
