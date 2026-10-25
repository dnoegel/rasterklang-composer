// .sid export: a PSID v2 with a small 6502 register-dump
// replayer, extended from an earlier prototype's exporter. The frame
// stream is split into four streams (voice 1, voice 2, voice 3, filter and
// volume) and each stream into one block per bar. Identical blocks are
// stored once and a per-stream orderlist replays them in song order, so
// drums, bass and chords that repeat cost almost nothing and songs of
// several minutes fit into C64 memory. Playback writes exactly the
// original register values in the original frames.
//
// Block: per frame one count byte N, then N (register, value) pairs;
//        $FF ends the block.
// Orderlist: 2-byte block addresses, $0000 = loop to the first entry.
// Timing: one play call per PAL video frame (50 Hz).

const LOAD = 0x1000;
const DATA = 0x1200;
// The replayer banks the BASIC ROM out ($01 = $36) while it reads, so data
// may run up to the I/O area at $D000.
const DATA_END = 0xd000;
const END_BLOCK = 0xff;
const STREAMS = 4;
const streamOf = (reg) => (reg < 21 ? Math.floor(reg / 7) : 3);

function assemblePlayer(orderAddrs) {
  const out = [];
  const labels = {};
  const fix = [];
  const pc = () => LOAD + out.length;
  const at = (name) => { labels[name] = pc(); };
  const op = (...b) => out.push(...b);
  const abs = (opcode, name, offset = 0) => { op(opcode, 0, 0); fix.push({ at: out.length - 2, name, offset, kind: 'abs' }); };
  const rel = (opcode, name) => { op(opcode, 0); fix.push({ at: out.length - 1, name, kind: 'rel' }); };

  // init: clear the SID, rewind every orderlist, fetch the first blocks.
  op(0xa2, 0x18, 0xa9, 0x00); //               LDX #$18 : LDA #0
  at('clear');
  op(0x9d, 0x00, 0xd4, 0xca); //               STA $D400,X : DEX
  rel(0x10, 'clear'); //                       BPL clear
  for (let s = 0; s < STREAMS; s += 1) {
    abs(0x20, `rewind${s}`); //                JSR rewind_s
    abs(0x20, `next${s}`); //                  JSR next_s
  }
  op(0x60); //                                 RTS

  // play: one frame of every stream, unrolled. BASIC ROM is banked out
  // so blocks under $A000-$BFFF are readable; $01 is restored after.
  at('play');
  op(0xa5, 0x01); //                           LDA $01
  abs(0x8d, 'save01'); //                      STA save01
  op(0xa9, 0x36, 0x85, 0x01); //               LDA #$36 : STA $01
  for (let s = 0; s < STREAMS; s += 1) {
    const bp = 0xf0 + s * 2; // block pointer
    at(`play${s}`);
    op(0xa0, 0x00, 0xb1, bp); //               LDY #0 : LDA (bp),Y
    op(0xc9, END_BLOCK); //                    CMP #$FF
    rel(0xd0, `frame${s}`); //                 BNE frame
    abs(0x20, `next${s}`); //                  JSR next
    abs(0x4c, `play${s}`); //                  JMP play_s
    at(`frame${s}`);
    op(0xaa, 0xc8, 0xe0, 0x00); //             TAX : INY : CPX #0
    rel(0xf0, `done${s}`); //                  BEQ done
    at(`write${s}`);
    op(0xb1, bp); //                           LDA (bp),Y   register
    abs(0x8d, `store${s}`, 1); //              STA store+1   (self-modifying)
    op(0xc8, 0xb1, bp); //                     INY : LDA (bp),Y   value
    at(`store${s}`);
    op(0x8d, 0x00, 0xd4); //                   STA $D400
    op(0xc8, 0xca); //                         INY : DEX
    rel(0xd0, `write${s}`); //                 BNE write
    at(`done${s}`);
    op(0x98, 0x18, 0x65, bp, 0x85, bp); //     TYA : CLC : ADC bp : STA bp
    op(0x90, 0x02, 0xe6, bp + 1); //           BCC +2 : INC bp+1
  }
  abs(0xad, 'save01'); //                      LDA save01
  op(0x85, 0x01); //                           STA $01
  op(0x60); //                                 RTS
  at('save01');
  op(0x37);

  for (let s = 0; s < STREAMS; s += 1) {
    const bp = 0xf0 + s * 2;
    const ob = 0xf8 + s * 2; // orderlist pointer
    // next: load the next block address from the orderlist.
    at(`next${s}`);
    op(0xa0, 0x00, 0xb1, ob, 0x85, bp); //     LDY #0 : LDA (ob),Y : STA bp
    op(0xc8, 0xb1, ob, 0x85, bp + 1); //       INY : LDA (ob),Y : STA bp+1
    op(0x05, bp); //                           ORA bp
    rel(0xd0, `advance${s}`); //               BNE advance
    abs(0x20, `rewind${s}`); //                JSR rewind
    abs(0x4c, `next${s}`); //                  JMP next
    at(`advance${s}`);
    op(0x18, 0xa5, ob, 0x69, 0x02, 0x85, ob); // CLC : LDA ob : ADC #2 : STA ob
    op(0x90, 0x02, 0xe6, ob + 1); //           BCC +2 : INC ob+1
    op(0x60); //                               RTS
    at(`rewind${s}`);
    op(0xa9, orderAddrs[s] & 0xff, 0x85, ob); // LDA #<order : STA ob
    op(0xa9, orderAddrs[s] >> 8, 0x85, ob + 1); // LDA #>order : STA ob+1
    op(0x60); //                               RTS
  }

  for (const f of fix) {
    const target = labels[f.name] + (f.offset || 0);
    if (f.kind === 'abs') {
      out[f.at] = target & 0xff;
      out[f.at + 1] = target >> 8;
    } else {
      const d = target - (LOAD + f.at + 1);
      if (d < -128 || d > 127) throw new Error(`branch to ${f.name} out of range`);
      out[f.at] = d & 0xff;
    }
  }
  if (out.length > DATA - LOAD) throw new Error('SID player too large');
  return { code: out, play: labels.play };
}

function header({ init, play, title, author, released, model }) {
  const h = new Uint8Array(0x7c);
  const be16 = (o, v) => { h[o] = v >> 8; h[o + 1] = v & 0xff; };
  const text = (o, s) => { for (let i = 0; i < 31 && i < s.length; i += 1) h[o + i] = s.charCodeAt(i) & 0x7f; };
  h.set([0x50, 0x53, 0x49, 0x44]); // PSID
  be16(0x04, 2);
  be16(0x06, 0x7c);
  be16(0x08, 0); // load address comes from the first two data bytes
  be16(0x0a, init);
  be16(0x0c, play);
  be16(0x0e, 1);
  be16(0x10, 1);
  // speed bits 0: vertical blank (50 Hz PAL)
  text(0x16, title);
  text(0x36, author);
  text(0x56, released);
  be16(0x76, (1 << 2) | (model === '8580' ? 2 << 4 : 1 << 4)); // PAL, chip model
  return h;
}

const CONTROL_REGS = new Set([4, 11, 18]);
const STREAM_REGS = [[0, 1, 2, 3, 4, 5, 6], [7, 8, 9, 10, 11, 12, 13], [14, 15, 16, 17, 18, 19, 20], [21, 22, 23, 24]];

// The first frame of a block is a keyframe: the stream's full register
// state after that frame, so a bar's bytes do not depend on what the bar
// before it left behind (the compiler only writes changed registers). The
// frame's own control-register writes are kept as they are, because a
// gate-off/gate-on pair is what retriggers the envelope.
function encodeBlock(frames, from, to, stream, state) {
  const out = [];
  const regs = STREAM_REGS[stream];
  for (let i = from; i < to; i += 1) {
    const f = frames[i];
    const w = [];
    const ctrl = [];
    for (let j = 0; j < f.length; j += 2) {
      const reg = f[j];
      if (reg >= 25 || streamOf(reg) !== stream) continue;
      state[reg] = f[j + 1];
      if (CONTROL_REGS.has(reg)) ctrl.push(reg, f[j + 1]);
      w.push(reg, f[j + 1]);
    }
    if (i === from) {
      const key = [];
      for (const reg of regs) if (!CONTROL_REGS.has(reg)) key.push(reg, state[reg]);
      if (ctrl.length) key.push(...ctrl);
      else for (const reg of regs) if (CONTROL_REGS.has(reg)) key.push(reg, state[reg]);
      out.push(key.length / 2, ...key);
    } else {
      out.push(w.length / 2, ...w);
    }
  }
  out.push(END_BLOCK);
  return out;
}

function layoutFor(streams, bars) {
  let addr = DATA + STREAMS * (bars + 1) * 2;
  const orderAddrs = [];
  for (let s = 0; s < STREAMS; s += 1) orderAddrs.push(DATA + s * (bars + 1) * 2);
  const addrOf = streams.map(() => new Map());
  streams.forEach((st, s) => {
    for (const u of new Set(st.order.slice(0, bars))) {
      addrOf[s].set(u, addr);
      addr += st.unique[u].length;
    }
  });
  return { orderAddrs, addrOf, end: addr };
}

// frames: per frame a flat [reg, value, ...] array; barStarts: frame index
// of every bar start plus the end.
export function buildSid(frames, barStarts, { title = 'Rasterklang Compose', author = 'Rasterklang', model = '6581' } = {}) {
  const totalBars = barStarts.length - 1;
  const streams = [];
  for (let s = 0; s < STREAMS; s += 1) {
    const index = new Map();
    const unique = [];
    const order = [];
    const state = new Array(25).fill(0);
    for (let b = 0; b < totalBars; b += 1) {
      const bytes = encodeBlock(frames, barStarts[b], barStarts[b + 1], s, state);
      const key = bytes.join(',');
      if (!index.has(key)) { index.set(key, unique.length); unique.push(bytes); }
      order.push(index.get(key));
    }
    streams.push({ unique, order });
  }

  // Fit as many bars as memory allows.
  let bars = totalBars;
  let layout = layoutFor(streams, bars);
  while (layout.end > DATA_END && bars > 1) {
    bars -= 1;
    layout = layoutFor(streams, bars);
  }

  const { code, play } = assemblePlayer(layout.orderAddrs);
  const payload = new Uint8Array(layout.end - LOAD);
  payload.set(code);
  streams.forEach((st, s) => {
    let p = layout.orderAddrs[s] - LOAD;
    for (let i = 0; i < bars; i += 1) {
      const a = layout.addrOf[s].get(st.order[i]);
      payload[p] = a & 0xff;
      payload[p + 1] = a >> 8;
      p += 2;
    }
    for (const [u, a] of layout.addrOf[s]) payload.set(st.unique[u], a - LOAD);
  });

  const head = header({ init: LOAD, play, title, author, model, released: `${new Date().getFullYear()} Rasterklang` });
  const bytes = new Uint8Array(head.length + 2 + payload.length);
  bytes.set(head);
  bytes[0x7c] = LOAD & 0xff;
  bytes[0x7d] = LOAD >> 8;
  bytes.set(payload, 0x7e);
  return {
    bytes,
    complete: bars === totalBars,
    blocks: bars,
    totalBlocks: totalBars,
    uniqueBlocks: streams.map((st) => new Set(st.order.slice(0, bars)).size),
    seconds: barStarts[bars] / 50,
  };
}
