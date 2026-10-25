// DSL -> per-frame register writes, computed once. Playback, seeking,
// WAV and SID export all read from this one array.

import { evaluateSongSource } from 'rasterklang-score/compiler/evaluateSong.js';
import { compile, framesForCycles } from 'rasterklang-score/compiler/compile.js';

export function renderFrames(dsl, totalBars) {
  const song = evaluateSongSource(dsl);
  const source = compile(song);
  const total = framesForCycles(song, totalBars);
  const frames = new Array(total);
  for (let i = 0; i < total; i += 1) {
    const pokes = source(i) || [];
    const flat = [];
    for (const { addr, value } of pokes) flat.push(addr & 0x1f, value & 0xff);
    frames[i] = flat;
  }
  const barStarts = [];
  for (let b = 0; b <= totalBars; b += 1) barStarts.push(framesForCycles(song, b));
  return { frames, barStarts, fps: 50 };
}

// Register state after `frame` frames: used to start playback mid-song.
export function stateAt(frames, frame) {
  const regs = new Array(25).fill(0);
  for (let i = 0; i < frame && i < frames.length; i += 1) {
    const f = frames[i];
    for (let j = 0; j < f.length; j += 2) if (f[j] < 25) regs[f[j]] = f[j + 1];
  }
  return regs;
}
