// Real SID render in Node: the Go/WASM engine from the rasterklang-wasm
// package (its loader wants `document`, so we load wasm_exec.js ourselves and
// hand fetch() the wasm file). renderPcm(frames) -> Float32Array, mono.
//   frames: arrays from renderFrames, flat [addr, value, ...] per frame (50 fps)
//   mute:   voices 0-2 to silence (their waveform bits are forced to 0)
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// the package's dist/ folder; it exports only its ESM entry, so look it up
// along Node's module paths
const WASM_DIR = createRequire(import.meta.url).resolve.paths('rasterklang-wasm')
  .map((p) => join(p, 'rasterklang-wasm', 'dist'))
  .find((d) => existsSync(join(d, 'rasterklang.wasm')));
if (!WASM_DIR) throw new Error('rasterklang-wasm not found: npm install');
let rkPromise;

function loadRk() {
  rkPromise ||= (async () => {
    await import(pathToFileURL(join(WASM_DIR, 'wasm_exec.js')).href);
    const realFetch = globalThis.fetch;
    const bytes = readFileSync(join(WASM_DIR, 'rasterklang.wasm'));
    globalThis.fetch = async (url, ...rest) => (String(url).endsWith('.wasm')
      ? new Response(bytes, { headers: { 'content-type': 'application/wasm' } })
      : realFetch(url, ...rest));
    try {
      const mod = await import(pathToFileURL(join(WASM_DIR, 'rasterklang.js')).href);
      return await mod.createRasterklang({ wasmURL: 'rasterklang.wasm', wasmExecURL: 'wasm_exec.js' });
    } finally { globalThis.fetch = realFetch; }
  })();
  return rkPromise;
}

export async function renderPcm(frames, { sampleRate = 22050, mute = [], model = '6581' } = {}) {
  const rk = await loadRk();
  const session = rk.startLive({ sampleRate, model });
  const spf = Math.round(sampleRate / 50);
  const out = new Float32Array(frames.length * spf);
  const ctlOf = mute.map((v) => v * 7 + 4);
  const ctl = ctlOf.length ? new Map(ctlOf.map((a) => [a, 0])) : null;
  const touch = (a, v) => { session.poke(a, ctl && ctl.has(a) ? (ctl.set(a, v), v & 0x0f) : v); };
  try {
    for (let i = 0; i < frames.length; i += 1) {
      const f = frames[i];
      for (let j = 0; j < f.length; j += 2) touch(f[j], f[j + 1]);
      const chunk = session.readChunk(spf);
      const o = i * spf;
      for (let k = 0; k < spf; k += 1) out[o + k] = chunk[k] / 32768;
    }
  } finally { session.stop(); }
  return out;
}

// Mean-square amplitude per frame (after a DC blocker at about 7 Hz, the
// engine's pulse waves carry DC that moves with the envelope).
export function framePower(pcm, sampleRate = 22050) {
  const spf = Math.round(sampleRate / 50);
  const n = Math.floor(pcm.length / spf);
  const out = new Float32Array(n);
  let x1 = 0;
  let y1 = 0;
  for (let i = 0; i < n; i += 1) {
    let s = 0;
    for (let k = 0; k < spf; k += 1) {
      const x = pcm[i * spf + k];
      y1 = x - x1 + 0.998 * y1;
      x1 = x;
      s += y1 * y1;
    }
    out[i] = s / spf;
  }
  return out;
}

// Solo render of one voice (the other two muted): per-frame mean-square.
export async function soloPower(frames, voice, opts = {}) {
  const pcm = await renderPcm(frames, { ...opts, mute: [0, 1, 2].filter((v) => v !== voice) });
  return framePower(pcm, opts.sampleRate || 22050);
}
