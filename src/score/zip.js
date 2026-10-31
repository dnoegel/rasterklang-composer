// Minimal zip reader (server only): Mutopia ships MIDI files zipped,
// MusicXML comes compressed as .mxl. Stored and deflated entries.

import { inflateRawSync } from 'node:zlib';

export function unzip(buf) {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  // end of central directory: the last "PK\5\6"
  let eocd = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i -= 1) {
    if (b.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('not a zip file');
  const count = b.readUInt16LE(eocd + 10);
  let p = b.readUInt32LE(eocd + 16);
  const out = [];
  for (let k = 0; k < count && b.readUInt32LE(p) === 0x02014b50; k += 1) {
    const method = b.readUInt16LE(p + 10);
    const size = b.readUInt32LE(p + 20);
    const nameLen = b.readUInt16LE(p + 28);
    const extraLen = b.readUInt16LE(p + 30);
    const commentLen = b.readUInt16LE(p + 32);
    const local = b.readUInt32LE(p + 42);
    const name = b.toString('utf8', p + 46, p + 46 + nameLen);
    p += 46 + nameLen + extraLen + commentLen;
    if (name.endsWith('/')) continue;
    const start = local + 30 + b.readUInt16LE(local + 26) + b.readUInt16LE(local + 28);
    const raw = b.subarray(start, start + size);
    if (method !== 0 && method !== 8) continue;
    out.push({ name, read: () => (method === 0 ? Buffer.from(raw) : inflateRawSync(raw)) });
  }
  return out;
}
