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


class FamilyArgsTest(unittest.TestCase):
    """The new families' command lines. The flags themselves are checked against the
    tools' sources by hand when their versions move; here is what OppaiLib decides."""

    FILES = {r: f"/m/{r}" for r in ("clip_l", "t5xxl", "ae", "gemma2", "qwen3", "vae", "text_encoder", "t5")}

    def kohya(self, family, **cfg):
        return server.build_kohya_dit({"name": "x", **cfg}, server.RECIPES[family], "/m/base.safetensors",
                                      self.FILES, "/d", "/o", None, "bf16")

    def musubi(self, family, base="/m/base.safetensors", variant="", **cfg):
        return server.build_musubi({"name": "x", **cfg}, family, server.RECIPES[family], base, self.FILES,
                                   "/j/dataset.toml", "/o", None, "bf16", variant)

    def test_every_family_the_trainer_claims_hands_over_each_file_it_needs(self):
        for family, recipe in server.RECIPES.items():
            if recipe["tool"] == "sd-scripts":
                args = self.kohya(family)
                self.assertIn(f"--network_module={recipe['network']}", args)
                for role, flag in recipe["files"].items():
                    self.assertIn(f"{flag}=/m/{role}", args, family)
            else:
                train = self.musubi(family)[-1][1]
                self.assertIn(f"--network_module={recipe['network']}", train)
                for role, flag in recipe["files"].items():
                    self.assertIn(f"{flag}=/m/{role}", train, family)

    def test_an_anima_run_is_what_its_guide_says(self):
        args = self.kohya("anima")
        self.assertTrue(args[0].endswith("anima_train_network.py"))
        for flag in ("--qwen3=/m/qwen3", "--vae=/m/vae", "--network_train_unet_only", "--timestep_sampling=sigmoid",
                     "--cache_text_encoder_outputs", "--network_dim=8", "--network_alpha=1"):
            self.assertIn(flag, args)

    def test_a_frozen_text_encoder_means_fixed_captions(self):
        # sd-scripts refuses to run with both: the cached outputs are of one caption.
        for family, recipe in server.RECIPES.items():
            if recipe["tool"] == "sd-scripts":
                self.assertNotIn("--shuffle_caption", self.kohya(family, shuffleCaption=True, trigger="x"))

    def test_low_vram_keeps_blocks_off_the_card(self):
        self.assertNotIn("--blocks_to_swap=18", self.kohya("flux"))
        args = self.kohya("flux", lowVram=True)
        self.assertIn("--blocks_to_swap=18", args)
        self.assertIn("--fp8_base", args)
        self.assertNotIn("--fp8_base", self.kohya("anima", lowVram=True), "Anima's guide says it is unsupported")

    def test_musubi_encodes_a_set_before_training_on_it(self):
        steps = self.musubi("zimage")
        self.assertEqual([phase for phase, _ in steps], ["caching", "caching", "loading"])
        self.assertTrue(steps[0][1][0].endswith("zimage_cache_latents.py"))
        self.assertTrue(steps[1][1][0].endswith("zimage_cache_text_encoder_outputs.py"))
        self.assertTrue(steps[2][1][0].endswith("zimage_train_network.py"))

    def test_klein_is_told_its_size_and_whether_it_is_the_base_model(self):
        self.assertEqual(server.klein_version("flux-2-klein-4b.safetensors", "4b"), "klein-4b")
        self.assertEqual(server.klein_version("flux-2-klein-9b.safetensors", "9b"), "klein-9b")
        self.assertEqual(server.klein_version("flux-2-klein-base-9b.safetensors", ""), "klein-base-9b")
        for _, args in self.musubi("flux2", base="/m/flux-2-klein-base-4b.safetensors", variant="4b"):
            self.assertIn("--model_version=klein-base-4b", args)

    def test_one_half_of_wan_is_held_to_its_part_of_the_schedule(self):
        flags, latent = server.wan_flags("wan2.2_t2v_high_noise_14B.safetensors", "t2v")
        self.assertEqual(flags, ["--task=t2v-A14B", "--min_timestep=875", "--max_timestep=1000"])
        self.assertEqual(latent, [])
        flags, latent = server.wan_flags("wan2.2_i2v_low_noise_14B.safetensors", "i2v")
        self.assertEqual(flags, ["--task=i2v-A14B", "--min_timestep=0", "--max_timestep=900"])
        self.assertEqual(latent, ["--i2v"])

    def test_wan_takes_its_text_encoder_by_another_name(self):
        steps = self.musubi("wan")
        self.assertIn("--t5=/m/t5", steps[1][1])
        self.assertIn("--t5=/m/t5", steps[2][1])

    def test_each_repeat_folder_is_a_dataset_with_a_cache_of_its_own(self):
        root = tempfile.mkdtemp(dir=TMP)
        for folder in ("10_mika", "4_mika"):
            os.makedirs(os.path.join(root, folder))
        toml = server.dataset_toml({"resolution": 1024}, server.RECIPES["zimage"], root, "/cache")
        self.assertIn("resolution = [1024, 1024]", toml)
        self.assertIn("num_repeats = 10", toml)
        self.assertIn("num_repeats = 4", toml)
        self.assertEqual(toml.count("[[datasets]]"), 2)
        self.assertIn(os.path.join("/cache", "10_mika").replace("\\", "\\\\"), toml)

    def test_a_family_no_tool_has_is_not_claimed(self):
        for family in ("ernie", "pid", "qwen21", "sd2"):
            self.assertNotIn(family, server.TRAINABLE)


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

    def test_the_new_families_are_told_apart_as_forge_tells_them(self):
        for family, keys in {
            "anima": ["net.blocks.0.mlp.layer1.weight"], "wan": ["head.modulation"],
            "flux2": ["double_blocks.0.img_attn.norm.key_norm.scale", "double_stream_modulation_img.lin.weight"],
            "chroma": ["double_blocks.0.img_attn.norm.key_norm.scale", "distilled_guidance_layer.norms.0.scale"],
            "flux": ["model.diffusion_model.double_blocks.0.img_attn.norm.key_norm.scale"],
            "qwen": ["txt_norm.weight"], "krea2": ["txtfusion.projector.weight"], "ernie": ["layers.0.mlp.linear_fc2.weight"],
            "moss": ["shared_block_modulation.weight"], "pid": ["lq_proj.latent_proj.0.weight"],
            "qwen21": ["txt_in.text_norm.weight", "modulation.1.weight"],
        }.items():
            path = os.path.join(TMP, "family", f"{family}.safetensors")
            safetensors(path, keys)
            self.assertEqual(server.checkpoint_family(path), family)

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

    def test_a_new_family_trains_with_its_modules_and_leaves_nothing_of_the_set_behind(self):
        safetensors(os.path.join(TMP, "models", "Stable-diffusion", "z_image_bf16.safetensors"),
                    {"noise_refiner.0.attention.k_norm.weight": 1, "cap_embedder.1.weight": 1})
        path = os.path.join(TMP, "models", "Stable-diffusion", "z_image_bf16.safetensors")
        header = json.dumps({
            "cap_embedder.1.weight": {"dtype": "F16", "shape": [3840, 2560], "data_offsets": [0, 2]},
            "noise_refiner.0.attention.k_norm.weight": {"dtype": "F16", "shape": [1], "data_offsets": [0, 2]},
        }).encode()
        with open(path, "wb") as f:
            f.write(struct.pack("<Q", len(header)) + header + b"\0\0")
        for name in ("qwen_3_4b.safetensors",):
            safetensors(os.path.join(TMP, "models", "text_encoder", name), ["x"])
        safetensors(os.path.join(TMP, "models", "VAE", "ae.safetensors"), ["x"])
        _, body = self.submit({
            "name": "zlora", "base": {"key": "Stable-diffusion/z_image_bf16.safetensors"},
            "modules": {"text_encoder": {"key": "text_encoder/qwen_3_4b.safetensors"}, "ae": {"key": "VAE/ae.safetensors"}},
        })
        job = json.loads(body)
        done = self.wait(job["id"])
        self.assertEqual(done["state"], "done", done)
        self.assertEqual(done["family"], "zimage")
        with open(server.job_path(job["id"], "output", "zlora.safetensors"), "rb") as f:
            # Z-Image's LoRA goes through convert_lora.py, or it does nothing in Forge.
            self.assertTrue(f.read().endswith(b"-converted"))
        self.assertFalse(os.path.exists(server.job_path(job["id"], "dataset")))
        self.assertFalse(os.path.exists(server.job_path(job["id"], "cache")))

    def test_a_family_with_no_tool_fails_saying_so(self):
        safetensors(os.path.join(TMP, "models", "Stable-diffusion", "ernie.safetensors"), ["layers.0.mlp.linear_fc2.weight"])
        _, body = self.submit({"name": "e", "base": {"key": "Stable-diffusion/ernie.safetensors"}})
        done = self.wait(json.loads(body)["id"])
        self.assertEqual(done["state"], "error")
        self.assertIn("neither sd-scripts nor musubi-tuner", done["error"])

    def test_a_module_that_did_not_arrive_fails_saying_which(self):
        safetensors(os.path.join(TMP, "models", "Stable-diffusion", "anima.safetensors"), ["net.blocks.0.mlp.layer1.weight"])
        _, body = self.submit({"name": "a", "base": {"key": "Stable-diffusion/anima.safetensors"}})
        done = self.wait(json.loads(body)["id"])
        self.assertEqual(done["state"], "error")
        self.assertIn("qwen3", done["error"])

    def test_health_says_which_families_it_trains(self):
        code, body = self.call("GET", "/health")
        self.assertEqual(code, 200)
        health = json.loads(body)
        self.assertIn("anima", health["families"])
        self.assertIn("modules", health["features"])

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
