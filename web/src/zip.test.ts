import assert from "node:assert/strict";
import test from "node:test";
import { createZip } from "./zip.ts";

function u16(bytes: Uint8Array, at: number) {
  return bytes[at] | (bytes[at + 1] << 8);
}

function u32(bytes: Uint8Array, at: number) {
  return (bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16) | (bytes[at + 3] << 24)) >>> 0;
}

test("creates one ZIP containing flat, UTF-8 named files", async () => {
  const zip = new Uint8Array(await (await createZip([
    { name: "warm-happy.png", data: new Uint8Array([1, 2, 3]) },
    { name: "folder/peak-loving.png", data: new Uint8Array([4, 5]) },
  ], new Date(2026, 0, 2, 3, 4, 6))).arrayBuffer());

  assert.equal(u32(zip, 0), 0x04034b50);
  const firstNameLength = u16(zip, 26);
  assert.equal(new TextDecoder().decode(zip.subarray(30, 30 + firstNameLength)), "warm-happy.png");
  const second = 30 + firstNameLength + 3;
  assert.equal(u32(zip, second), 0x04034b50);
  const secondNameLength = u16(zip, second + 26);
  assert.equal(
    new TextDecoder().decode(zip.subarray(second + 30, second + 30 + secondNameLength)),
    "folder_peak-loving.png",
  );
  assert.equal(u32(zip, zip.length - 22), 0x06054b50);
  assert.equal(u16(zip, zip.length - 12), 2);
});
