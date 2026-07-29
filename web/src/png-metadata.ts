const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const encoder = new TextEncoder();

function readU32(bytes: Uint8Array, at: number): number {
  return (((bytes[at] << 24) | (bytes[at + 1] << 16) | (bytes[at + 2] << 8) | bytes[at + 3]) >>> 0);
}

function writeU32(bytes: Uint8Array, at: number, value: number): void {
  bytes[at] = (value >>> 24) & 255;
  bytes[at + 1] = (value >>> 16) & 255;
  bytes[at + 2] = (value >>> 8) & 255;
  bytes[at + 3] = value & 255;
}

let crcTable: Uint32Array | undefined;
function crc32(bytes: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (const byte of bytes) c = crcTable[(c ^ byte) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: "tEXt" | "iTXt", data: Uint8Array): Uint8Array {
  const typeBytes = encoder.encode(type);
  const out = new Uint8Array(12 + data.length);
  writeU32(out, 0, data.length);
  out.set(typeBytes, 4);
  out.set(data, 8);
  const crcInput = new Uint8Array(typeBytes.length + data.length);
  crcInput.set(typeBytes);
  crcInput.set(data, typeBytes.length);
  writeU32(out, out.length - 4, crc32(crcInput));
  return out;
}

function textChunk(keyword: string, text: string): Uint8Array {
  const latin1 = [...text].every((char) => (char.codePointAt(0) ?? 256) <= 255);
  const key = encoder.encode(keyword);
  if (latin1) {
    const value = Uint8Array.from([...text], (char) => char.codePointAt(0) ?? 0);
    const data = new Uint8Array(key.length + 1 + value.length);
    data.set(key);
    data.set(value, key.length + 1);
    return chunk("tEXt", data);
  }
  // iTXt: keyword NUL, uncompressed flag, compression method, empty language NUL,
  // empty translated keyword NUL, then UTF-8 text.
  const value = encoder.encode(text);
  const data = new Uint8Array(key.length + 5 + value.length);
  data.set(key);
  data.set(value, key.length + 5);
  return chunk("iTXt", data);
}

/** Adds standard Stable Diffusion metadata immediately before IEND.
 *
 * Civitai and A1111 read the `parameters` PNG text field. The optional `oppailib`
 * field keeps the lossless record for importing back into this app without affecting
 * tools that only understand A1111 infotext.
 */
export function embedGenerationMetadata(
  source: ArrayBuffer | Uint8Array,
  parameters: string,
  oppaiJSON?: string,
): Uint8Array {
  const bytes = source instanceof Uint8Array ? source : new Uint8Array(source);
  if (bytes.length < 20 || !PNG_SIGNATURE.every((byte, i) => bytes[i] === byte)) {
    throw new Error("The generated image is not a PNG.");
  }

  let at = PNG_SIGNATURE.length;
  let iend = -1;
  const kept: Uint8Array[] = [];
  while (at + 12 <= bytes.length) {
    const length = readU32(bytes, at);
    const end = at + 12 + length;
    if (end > bytes.length) throw new Error("The PNG is truncated.");
    const type = String.fromCharCode(...bytes.subarray(at + 4, at + 8));
    if (type === "IEND") { iend = at; break; }
    const data = bytes.subarray(at + 8, at + 8 + length);
    const nul = data.indexOf(0);
    const keyword = nul < 0 ? "" : String.fromCharCode(...data.subarray(0, nul));
    // Re-exporting an already-exported PNG replaces our fields. Duplicate parameters
    // chunks are interpreted inconsistently (some readers take the first, some last).
    if (!((type === "tEXt" || type === "iTXt") && (keyword === "parameters" || keyword === "oppailib"))) {
      kept.push(bytes.subarray(at, end));
    }
    at = end;
  }
  if (iend < 0) throw new Error("The PNG has no IEND chunk.");

  const additions = [textChunk("parameters", parameters)];
  if (oppaiJSON) additions.push(textChunk("oppailib", oppaiJSON));
  const keptSize = kept.reduce((sum, value) => sum + value.length, 0);
  const additionsSize = additions.reduce((sum, value) => sum + value.length, 0);
  const tail = bytes.subarray(iend);
  const out = new Uint8Array(PNG_SIGNATURE.length + keptSize + additionsSize + tail.length);
  out.set(PNG_SIGNATURE);
  let cursor = PNG_SIGNATURE.length;
  for (const original of kept) { out.set(original, cursor); cursor += original.length; }
  for (const addition of additions) { out.set(addition, cursor); cursor += addition.length; }
  out.set(tail, cursor);
  return out;
}

export async function downloadGenerationPNG(
  url: string,
  filename: string,
  parameters: string,
  oppaiJSON?: string,
): Promise<void> {
  const response = await fetch(url, { credentials: "same-origin" });
  if (!response.ok) throw new Error(`Couldn't export image (${response.status}).`);
  const bytes = embedGenerationMetadata(await response.arrayBuffer(), parameters, oppaiJSON);
  const payload = bytes.slice().buffer as ArrayBuffer;
  const objectURL = URL.createObjectURL(new Blob([payload], { type: "image/png" }));
  try {
    const link = document.createElement("a");
    link.href = objectURL;
    link.download = filename.toLowerCase().endsWith(".png") ? filename : `${filename}.png`;
    link.click();
  } finally {
    setTimeout(() => URL.revokeObjectURL(objectURL), 0);
  }
}
