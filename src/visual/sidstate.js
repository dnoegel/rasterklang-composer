// Per-frame SID state for the voice visualizer, computed once
// from the frame stream the player uses: pitch, waveform, pulse width and an
// emulated ADSR envelope for each voice, plus filter cutoff, resonance,
// routing, mode and volume. Everything is indexed by frame (50 per second),
// so the picture follows playback and seeking exactly.

const SID_HZ = 0.0596; // PAL: frequency register value * this = Hz
// SID attack times in ms per register value; decay and release take 3x.
const ATTACK_MS = [2, 8, 16, 24, 38, 56, 68, 80, 100, 250, 500, 800, 1000, 3000, 5000, 8000];
const FRAME_MS = 20;

export function midiOf(freqReg) {
  if (!freqReg) return null;
  return 69 + 12 * Math.log2((freqReg * SID_HZ) / 440);
}

const NOTE_NAMES = ['C-', 'C#', 'D-', 'D#', 'E-', 'F-', 'F#', 'G-', 'G#', 'A-', 'A#', 'B-'];
// Tracker-style note name: "C#4"
export function noteName(midi) {
  if (midi === null || !Number.isFinite(midi)) return '---';
  const m = Math.round(midi);
  return `${NOTE_NAMES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
}

export function sidState(frames) {
  const n = frames.length;
  const voices = [0, 1, 2].map(() => ({
    freq: new Uint16Array(n),
    ctrl: new Uint8Array(n),
    pw: new Uint16Array(n),
    env: new Float32Array(n),
    onset: new Uint8Array(n),
  }));
  const cutoff = new Uint16Array(n);
  const res = new Uint8Array(n);
  const route = new Uint8Array(n);
  const mode = new Uint8Array(n);
  const vol = new Uint8Array(n);
  const regs = new Array(25).fill(0);
  const env = [0, 0, 0];
  const phase = ['release', 'release', 'release'];
  for (let i = 0; i < n; i += 1) {
    const before = [regs[4], regs[11], regs[18]];
    const f = frames[i];
    for (let j = 0; j < f.length; j += 2) if (f[j] < 25) regs[f[j]] = f[j + 1];
    for (let v = 0; v < 3; v += 1) {
      const b = v * 7;
      const ctrl = regs[b + 4];
      const gate = ctrl & 1;
      const wasGate = before[v] & 1;
      const ad = regs[b + 5];
      const sr = regs[b + 6];
      const sustain = (sr >> 4) / 15;
      if (gate && (!wasGate || (ctrl & 8))) { phase[v] = 'attack'; voices[v].onset[i] = 1; }
      if (!gate && wasGate) phase[v] = 'release';
      if (phase[v] === 'attack') {
        env[v] += FRAME_MS / ATTACK_MS[ad >> 4];
        if (env[v] >= 1) { env[v] = 1; phase[v] = 'decay'; }
      } else if (phase[v] === 'decay') {
        env[v] = Math.max(sustain, env[v] - FRAME_MS / (ATTACK_MS[ad & 15] * 3));
      } else {
        env[v] = Math.max(0, env[v] - FRAME_MS / (ATTACK_MS[sr & 15] * 3));
      }
      voices[v].freq[i] = regs[b] | (regs[b + 1] << 8);
      voices[v].ctrl[i] = ctrl;
      voices[v].pw[i] = (regs[b + 2] | ((regs[b + 3] & 15) << 8));
      voices[v].env[i] = env[v];
    }
    cutoff[i] = (regs[21] & 7) | (regs[22] << 3);
    res[i] = regs[23] >> 4;
    route[i] = regs[23] & 7;
    mode[i] = (regs[24] >> 4) & 7;
    vol[i] = regs[24] & 15;
  }
  return { n, voices, cutoff, res, route, mode, vol };
}

// The main waveform of a control register value.
export function waveOf(ctrl) {
  if (ctrl & 0x80) return 'noise';
  if (ctrl & 0x40) return 'pulse';
  if (ctrl & 0x20) return 'saw';
  if (ctrl & 0x10) return 'tri';
  return null;
}
