// The .sid replayer on a real 6502 (rasterklang-wasm's emulator): after every
// frame the SID registers must equal the song's own frames (the low cutoff
// bits aside, which the export leaves at 0), including a song long enough to
// continue in the RAM under the KERNAL.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { compose, renderFrames } from '../src/index.js';
import { buildSid } from '../src/export/sid.js';

// found like src/render/sid-node.js does
const wasmDir = createRequire(import.meta.url).resolve.paths('rasterklang-wasm')
  .map((p) => join(p, 'rasterklang-wasm', 'dist'))
  .find((d) => existsSync(join(d, 'rasterklang.wasm')));

async function engine() {
  await import(pathToFileURL(join(wasmDir, 'wasm_exec.js')).href);
  const bytes = readFileSync(join(wasmDir, 'rasterklang.wasm'));
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (u, ...r) => (String(u).endsWith('.wasm') ? new Response(bytes, { headers: { 'content-type': 'application/wasm' } }) : realFetch(u, ...r));
  const { createRasterklang } = await import(pathToFileURL(join(wasmDir, 'rasterklang.js')).href);
  return createRasterklang({ wasmURL: 'rasterklang.wasm', wasmExecURL: 'wasm_exec.js' });
}

describe('.sid export', () => {
  // doom metal fills the RAM below $D000 and continues under the KERNAL
  it('a long song plays its frames on a 6502, across both memory regions', async () => {
    const prompt = 'dark doom metal';
    const rk = await engine();
    const tune = compose(prompt, 1);
    const { frames, barStarts } = renderFrames(tune.dsl, tune.plan.totalBars, { score: tune.score });
    const sid = buildSid(frames, barStarts);
    expect(sid.complete).toBe(true);
    expect(sid.bytes.length - 0x7e + 0x0800 > 0xd000).toBe(true);
    const stream = rk.loadBytes(sid.bytes).createDebugStream({ sampleRate: 44100 });
    const state = new Array(25).fill(0);
    let differing = 0;
    for (let i = 0; i < frames.length; i += 1) {
      for (let j = 0; j < frames[i].length; j += 2) if (frames[i][j] < 25) state[frames[i][j]] = frames[i][j + 1];
      const regs = stream.stepFrame().snapshot.sid.registers;
      if (state.some((v, r) => r !== 21 && regs[r] !== v)) differing += 1;
    }
    stream.stop();
    expect(differing).toBe(0);
  }, 300000);
});
