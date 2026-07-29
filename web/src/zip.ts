/** A tiny, dependency-free ZIP writer for browser exports.
 *
 * Outfit PNGs are already compressed, so DEFLATE would spend CPU without making the
 * archive meaningfully smaller. ZIP's "stored" method keeps the implementation small
 * and, importantly, turns sixty browser downloads into one reliable download.
 */

export interface ZipEntry {
  name: string;
  data: Blob | Uint8Array | ArrayBuffer;
}

const encoder = new TextEncoder();

function u16(view: DataView, at: number, value: number) {
  view.setUint16(at, value, true);
}

function u32(view: DataView, at: number, value: number) {
  view.setUint32(at, value >>> 0, true);
}

let crcTable: Uint32Array | undefined;
function crc32(bytes: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let bit = 0; bit < 8; bit++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date: Date): { date: number; time: number } {
  const year = Math.min(2107, Math.max(1980, date.getFullYear()));
  return {
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
  };
}

function blobPart(bytes: Uint8Array): ArrayBuffer {
  if (bytes.buffer instanceof ArrayBuffer) {
    if (bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength) return bytes.buffer;
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  }
  return bytes.slice().buffer as ArrayBuffer;
}

async function bytesOf(data: ZipEntry["data"]): Promise<Uint8Array> {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  return new Uint8Array(await data.arrayBuffer());
}

/** Builds a standards-compatible, uncompressed ZIP archive. */
export async function createZip(entries: ZipEntry[], modified = new Date()): Promise<Blob> {
  if (entries.length > 0xffff) throw new Error("Too many files for one ZIP archive.");
  const stamp = dosDateTime(modified);
  const locals: { header: Uint8Array; data: Uint8Array }[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    // A flat archive is intentional. It also prevents a generated name from becoming
    // a path if this helper is reused with user-controlled text later.
    const safeName = entry.name.replaceAll("\\", "_").replaceAll("/", "_") || "file";
    const name = encoder.encode(safeName);
    const data = await bytesOf(entry.data);
    if (name.length > 0xffff || data.length > 0xffffffff) throw new Error(`File is too large for ZIP: ${safeName}`);
    const crc = crc32(data);

    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    u32(lv, 0, 0x04034b50);
    u16(lv, 4, 20);       // version needed
    u16(lv, 6, 0x0800);   // UTF-8 filenames
    u16(lv, 8, 0);        // stored, PNG is already compressed
    u16(lv, 10, stamp.time);
    u16(lv, 12, stamp.date);
    u32(lv, 14, crc);
    u32(lv, 18, data.length);
    u32(lv, 22, data.length);
    u16(lv, 26, name.length);
    u16(lv, 28, 0);
    local.set(name, 30);
    locals.push({ header: local, data });

    const central = new Uint8Array(46 + name.length);
    const cv = new DataView(central.buffer);
    u32(cv, 0, 0x02014b50);
    u16(cv, 4, 20);       // made by
    u16(cv, 6, 20);       // version needed
    u16(cv, 8, 0x0800);
    u16(cv, 10, 0);
    u16(cv, 12, stamp.time);
    u16(cv, 14, stamp.date);
    u32(cv, 16, crc);
    u32(cv, 20, data.length);
    u32(cv, 24, data.length);
    u16(cv, 28, name.length);
    u16(cv, 30, 0);
    u16(cv, 32, 0);
    u16(cv, 34, 0);
    u16(cv, 36, 0);
    u32(cv, 38, 0);
    u32(cv, 42, offset);
    central.set(name, 46);
    centrals.push(central);
    offset += local.length + data.length;
  }

  const centralSize = centrals.reduce((sum, item) => sum + item.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  u32(ev, 0, 0x06054b50);
  u16(ev, 4, 0);
  u16(ev, 6, 0);
  u16(ev, 8, entries.length);
  u16(ev, 10, entries.length);
  u32(ev, 12, centralSize);
  u32(ev, 16, offset);
  u16(ev, 20, 0);

  const chunks = [
    ...locals.flatMap((item) => [item.header, item.data]),
    ...centrals,
    end,
  ];
  const parts: BlobPart[] = chunks.map(blobPart);
  return new Blob(parts, { type: "application/zip" });
}
