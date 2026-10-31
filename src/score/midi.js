// Standard MIDI file -> notes per track. Only what a reduction
// to three SID voices needs: note on/off, tempo, time and key signature,
// track names and programs. Formats 0 and 1; SMPTE timing is rejected.

const text = (bytes) => String.fromCharCode(...bytes).replace(/[^\x20-\x7e]/g, '').trim();

export function parseMidi(buf) {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let p = 0;
  const u32 = () => { const v = (b[p] << 24 | b[p + 1] << 16 | b[p + 2] << 8 | b[p + 3]) >>> 0; p += 4; return v; };
  const u16 = () => { const v = b[p] << 8 | b[p + 1]; p += 2; return v; };
  const tag = () => { const t = String.fromCharCode(b[p], b[p + 1], b[p + 2], b[p + 3]); p += 4; return t; };
  if (tag() !== 'MThd') throw new Error('not a MIDI file');
  const hlen = u32();
  const format = u16();
  const ntracks = u16();
  const division = u16();
  p = 8 + hlen;
  if (division & 0x8000) throw new Error('SMPTE timing not supported');
  const out = { format, ppq: division, tempos: [], timeSigs: [], keySigs: [], tracks: [], endTick: 0 };
  for (let t = 0; t < ntracks && p < b.length; t += 1) {
    if (tag() !== 'MTrk') break;
    const len = u32();
    const end = p + len;
    const track = { name: '', programs: {}, notes: [] };
    const open = new Map();
    let tick = 0;
    let status = 0;
    const vlq = () => { let v = 0; let c; do { c = b[p++]; v = (v << 7) | (c & 0x7f); } while (c & 0x80 && p < end); return v; };
    while (p < end) {
      tick += vlq();
      let s = b[p];
      if (s & 0x80) p += 1; else s = status;
      if (s === 0xff) {
        const type = b[p++];
        const l = vlq();
        const data = b.subarray(p, p + l);
        p += l;
        if (type === 0x03 && !track.name) track.name = text(data);
        else if (type === 0x51 && l === 3) out.tempos.push({ tick, bpm: 60000000 / ((data[0] << 16) | (data[1] << 8) | data[2]) });
        else if (type === 0x58 && l >= 2) out.timeSigs.push({ tick, num: data[0], den: 2 ** data[1] });
        else if (type === 0x59 && l === 2) out.keySigs.push({ tick, sharps: (data[0] << 24) >> 24, minor: data[1] === 1 });
        else if (type === 0x2f) break;
        continue;
      }
      if (s === 0xf0 || s === 0xf7) { p += vlq(); continue; }
      status = s;
      const kind = s & 0xf0;
      const ch = s & 0x0f;
      const d1 = b[p++];
      const d2 = kind === 0xc0 || kind === 0xd0 ? 0 : b[p++];
      if (kind === 0xc0) track.programs[ch] = d1;
      else if (kind === 0x90 || kind === 0x80) {
        const key = ch * 128 + d1;
        if (open.has(key)) {
          const n = open.get(key);
          n.dur = tick - n.start;
          if (n.dur > 0) track.notes.push(n);
          open.delete(key);
        }
        if (kind === 0x90 && d2 > 0) open.set(key, { pitch: d1, start: tick, dur: 0, vel: d2, ch });
      }
    }
    for (const n of open.values()) { n.dur = Math.max(1, tick - n.start); track.notes.push(n); }
    track.notes.sort((x, y) => x.start - y.start || y.pitch - x.pitch);
    out.endTick = Math.max(out.endTick, tick);
    p = end;
    out.tracks.push(track);
  }
  // drums (channel 10) never carry melody or bass
  for (const tr of out.tracks) tr.notes = tr.notes.filter((n) => n.ch !== 9);
  out.tracks = out.tracks.filter((tr) => tr.notes.length);
  return out;
}

// parsed MIDI -> the score shape reduceScore reads
export function midiScore(buf) {
  const m = parseMidi(buf);
  const ts = m.timeSigs[0] || { num: 4, den: 4 };
  const ks = m.keySigs[0];
  return {
    ppq: m.ppq,
    num: ts.num,
    den: ts.den,
    bpm: m.tempos[0]?.bpm || 120,
    fifths: ks ? ks.sharps : undefined,
    minor: ks ? ks.minor : undefined,
    parts: m.tracks.map((t) => ({ name: t.name, notes: t.notes.map(({ pitch, start, dur }) => ({ pitch, start, dur })) })),
  };
}
