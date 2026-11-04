// .sid export: a PSID v2 with a small 6502 register-dump
// replayer. The frame
// stream is split into four streams (voice 1, voice 2, voice 3, filter and
// volume) and each stream into one block per bar. Identical blocks are
// stored once and a per-stream orderlist replays them in song order, so
// drums, bass and chords that repeat cost almost nothing and songs of
// several minutes fit into C64 memory. Playback writes the original
// register values in the original frames, except the low 3 bits of the
// filter cutoff.
//
// Block: per frame one count byte N (0-127), then N (register, value)
//        pairs; a byte $80+N (N = 1..126) stands for N frames without
//        writes; $FF ends the block.
// Orderlist: 2-byte block addresses, $0000 = loop to the first entry.
// Timing: one play call per PAL video frame (50 Hz).

// The player (about 550 bytes) loads at $0800, the lowest PSID load
// address, and the data follows it: hard restarts cost register writes, and
// the 2.4 KB gained over $1000/$1400 keep long songs whole.
const LOAD = 0x0800;
const DATA = 0x0a80;
// The replayer banks the BASIC ROM out ($01 = $36) while it reads, so data
// may run up to the I/O area at $D000.
const DATA_END = 0xd000;
// Songs that do not fit continue in the RAM under the KERNAL ROM. The player
// then banks the KERNAL out too ($01 = $35) and blocks interrupts while it
// reads; the CPU vectors at $FFFA-$FFFF point to an RTI in case an NMI comes
// in that moment. Songs that fit below $D000 keep the player as it was.
const HIGH = 0xe000;
const HIGH_END = 0xfffa;
const END_BLOCK = 0xff;
const STREAMS = 4;
const streamOf = (reg) => (reg < 21 ? Math.floor(reg / 7) : 3);
// Low 3 bits of the 11-bit filter cutoff: filter sweeps change them almost
// every frame, so no filter bar repeated and long songs did not fit. The
// high byte keeps 256 cutoff steps, finer than the ear follows; the .sid
// leaves the low bits at 0.
const CUTOFF_LO = 21;

function assemblePlayer(orderAddrs, { kernalOut = false } = {}) {
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
    op(0xa9, 0x00); //                         LDA #0
    abs(0x8d, `skip${s}`); //                  STA skip_s
    abs(0x20, `rewind${s}`); //                JSR rewind_s
    abs(0x20, `next${s}`); //                  JSR next_s
  }
  op(0x60); //                                 RTS

  // play: one frame of every stream, unrolled. BASIC ROM is banked out
  // so blocks under $A000-$BFFF are readable; $01 is restored after.
  at('play');
  if (kernalOut) op(0x08, 0x78); //            PHP : SEI   (no IRQ while the KERNAL is out)
  op(0xa5, 0x01); //                           LDA $01
  abs(0x8d, 'save01'); //                      STA save01
  op(0xa9, kernalOut ? 0x35 : 0x36, 0x85, 0x01); // LDA #$36 (#$35) : STA $01
  for (let s = 0; s < STREAMS; s += 1) {
    const bp = 0xf0 + s * 2; // block pointer
    at(`play${s}`);
    abs(0xad, `skip${s}`); //                  LDA skip_s   (inside a run of empty frames?)
    rel(0xf0, `read${s}`); //                  BEQ read
    abs(0xce, `skip${s}`); //                  DEC skip_s
    abs(0x4c, `end${s}`); //                   JMP end_s
    at(`read${s}`);
    op(0xa0, 0x00, 0xb1, bp); //               LDY #0 : LDA (bp),Y
    op(0xc9, END_BLOCK); //                    CMP #$FF
    rel(0xd0, `notend${s}`); //                BNE notend
    abs(0x20, `next${s}`); //                  JSR next
    abs(0x4c, `read${s}`); //                  JMP read_s
    at(`notend${s}`);
    op(0xc9, 0x80); //                         CMP #$80
    rel(0x90, `frame${s}`); //                 BCC frame    (a write count)
    op(0x38, 0xe9, 0x81); //                   SEC : SBC #$81  (N-1 more empty frames)
    abs(0x8d, `skip${s}`); //                  STA skip_s
    op(0xe6, bp); //                           INC bp
    op(0xd0, 0x02, 0xe6, bp + 1); //           BNE +2 : INC bp+1
    abs(0x4c, `end${s}`); //                   JMP end_s
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
    at(`end${s}`);
  }
  abs(0xad, 'save01'); //                      LDA save01
  op(0x85, 0x01); //                           STA $01
  if (kernalOut) op(0x28); //                  PLP
  op(0x60); //                                 RTS
  at('rti');
  op(0x40); //                                 RTI   (CPU vectors while the KERNAL is out)
  at('save01');
  op(0x37);
  for (let s = 0; s < STREAMS; s += 1) { at(`skip${s}`); op(0x00); }

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
  return { code: out, play: labels.play, rti: labels.rti };
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
      if (reg >= 25 || reg === CUTOFF_LO || streamOf(reg) !== stream) continue;
      state[reg] = f[j + 1];
      if (CONTROL_REGS.has(reg)) ctrl.push(reg, f[j + 1]);
      w.push(reg, f[j + 1]);
    }
    if (i !== from && !w.length) {
      // extend a run of empty frames, or start one
      const lastIdx = out.length - 1;
      if (lastIdx >= 0 && out[lastIdx] >= 0x81 && out[lastIdx] < 0xfe && out.runMarker === lastIdx) out[lastIdx] += 1;
      else { out.push(0x81); out.runMarker = out.length - 1; }
      continue;
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
  return [...out];
}

// Blocks go below $D000 and, when they do not fit there, on in the RAM
// under the KERNAL; a block never crosses a region's end. `fits` is false
// when even that is not enough.
function layoutFor(streams, bars) {
  let addr = DATA + STREAMS * (bars + 1) * 2;
  const orderAddrs = [];
  for (let s = 0; s < STREAMS; s += 1) orderAddrs.push(DATA + s * (bars + 1) * 2);
  const addrOf = streams.map(() => new Map());
  let high = false;
  let fits = addr <= DATA_END;
  streams.forEach((st, s) => {
    for (const u of new Set(st.order.slice(0, bars))) {
      const len = st.unique[u].length;
      if (!high && addr + len > DATA_END) { high = true; addr = HIGH; }
      if (high && addr + len > HIGH_END) fits = false;
      addrOf[s].set(u, addr);
      addr += len;
    }
  });
  return { orderAddrs, addrOf, end: high ? 0x10000 : addr, high, fits };
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
  while (!layout.fits && bars > 1) {
    bars -= 1;
    layout = layoutFor(streams, bars);
  }

  const { code, play, rti } = assemblePlayer(layout.orderAddrs, { kernalOut: layout.high });
  const payload = new Uint8Array(layout.end - LOAD);
  payload.set(code);
  if (layout.high) for (const v of [0xfffa, 0xfffc, 0xfffe]) { payload[v - LOAD] = rti & 0xff; payload[v + 1 - LOAD] = rti >> 8; }
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
