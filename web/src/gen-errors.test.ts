import { test } from "node:test";
import assert from "node:assert/strict";

const { explainGenError } = await import("./gen-errors.ts");

const split = 'image generator returned 500: {"error":"RuntimeError","detail":"","body":"","errors":"Expected all tensors to be on the same device, ' +
  'but found at least two devices, cpu and cuda:0! (when checking argument for argument index in method wrapper_CUDA__index_select)"}';

test("a model split across the CPU and GPU is named, with the way out and a restart offered", () => {
  const e = explainGenError(split);
  assert.match(e.message, /split between the CPU and the GPU/);
  assert.match(e.hint ?? "", /Restarting A1111 clears it/);
  assert.equal(e.restart, true);
  assert.equal(e.raw, split);
});

test("the reason is pulled out of the generator's JSON, with its kind", () => {
  const e = explainGenError('image generator returned 500: {"error":"ValueError","detail":"","errors":"bad sampler name"}');
  assert.equal(e.message, "ValueError: bad sampler name");
  assert.equal(e.hint, undefined);
});

test("plain text stands as it came, and running out of memory says what to try", () => {
  assert.equal(explainGenError("ComfyUI unreachable").message, "ComfyUI unreachable");
  assert.match(explainGenError("torch.cuda.OutOfMemoryError: CUDA out of memory").hint ?? "", /smaller size/);
});
