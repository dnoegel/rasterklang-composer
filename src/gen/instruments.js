// Instrument bank as rasterklang-dsl instrument blocks. Ported from
// an earlier prototype's audio/sounds.js (wavetables, PWM bounds, drum
// programs) to DSL tables, which run per frame since each note's onset.
// Pulse sweeps stay within pw >= 768 and small steps: narrower or faster
// sweeps alias into hiss in the emulator (launchpad known issue).

import { HVSC_DRUMS, HVSC_BASSES, HVSC_LEADS } from './library/hvsc-instruments.js';

// Pulse-width bounce: up from `start` to `hi`, down to `lo`, back to start.
// Each value is held for two frames with twice the step: same sweep speed,
// half the register writes (keeps .sid exports small).
function pwBounce(start, lo, hi, step) {
  const vals = [];
  const s2 = step * 2;
  for (let v = start; v < hi; v += s2) vals.push(v);
  for (let v = hi; v > lo; v -= s2) vals.push(v);
  for (let v = lo; v < start; v += s2) vals.push(v);
  return vals.map((v) => `${v}!2`).join(' ');
}

const DRUMS = {
  kick: `
  wave noise pulse pulse pulse pulse pulse pulse
  arp =76 =50 =45 =41 =38 =35 =33
  pw 2048
  adsr 0 8 0 0
  gate -1`,
  snare: `
  wave noise pulse pulse noise noise noise
  arp =92 =57 =54 =86 =84 =83
  pw 2048
  adsr 0 8 0 0
  gate -1`,
  // tonal rock snare: more pulse body, shorter noise tail
  snare2: `
  wave noise pulse pulse pulse noise noise
  arp =90 =60 =58 =56 =82 =80
  pw 1792
  adsr 0 8 0 0
  gate -1`,
  hat: `
  wave noise
  arp =110
  adsr 0 3 0 0
  gate -1`,
  ohat: `
  wave noise
  arp =108
  adsr 0 7 0 0
  gate -1`,
  clap: `
  wave noise noise noise noise noise
  arp =94 =94 =93 =93 =92
  gate 1 0 1 0 1
  adsr 0 7 0 0`,
  tom: `
  wave noise triangle
  arp =74 =52 =51 =50 =49 =48 =47 =46
  adsr 0 8 0 0
  gate -1`,
  tomhi: `
  wave noise triangle
  arp =80 =59 =58 =57 =56 =55 =54 =53
  adsr 0 8 0 0
  gate -1`,
  crash: `
  wave noise
  arp =104 =101
  adsr 0 10 0 0
  gate -1`,
  // kits in C64 style
  ...Object.fromEntries(Object.entries(HVSC_DRUMS).map(([id, body]) => [id, body.trimEnd()])),
};

const MELODIC = {
  // ---- bass -------------------------------------------------------------
  bass: `
  wave noise pulse
  arp 24 0
  pw ${pwBounce(1024, 768, 2560, 16)}
  loop wave 1 arp 1 pw 0
  adsr 0 9 6 0
  gate -2`,
  acid: `
  wave saw
  adsr 0 8 4 0
  gate -2`,
  sub: `
  wave pulse triangle
  arp 12 0
  pw 2048
  loop wave 1 arp 1
  adsr 0 10 10 4
  gate -2`,
  slap: `
  wave noise pulse pulse
  arp 36 12 0
  pw ${pwBounce(1280, 768, 2048, 20)}
  loop wave 2 arp 2 pw 0
  adsr 0 7 4 0
  gate -2`,
  drone: `
  wave saw
  adsr 6 9 12 8
  vib 0.08 4`,
  // plain 50 % pulse: the punchy chip bass
  chipbass: `
  wave pulse
  pw 2048
  adsr 0 9 9 2
  gate -2`,
  // round sub that glides into each note (808 and 303 slides)
  slidebass: `
  wave pulse triangle
  arp 12 0
  pw 2048
  loop wave 1 arp 1
  adsr 0 10 11 4
  slide 0.12
  gate -2`,
  // narrow pulse with a fast width sweep: a growling, detuned-sounding bass
  growl: `
  wave noise pulse
  arp 12 0
  pw ${pwBounce(768, 768, 1536, 40)}
  loop wave 1 arp 1 pw 0
  adsr 0 9 11 3
  gate -2`,

  // ---- lead -------------------------------------------------------------
  lead: `
  wave pulse
  pw ${pwBounce(1024, 768, 3072, 16)}
  loop pw 0
  adsr 1 9 10 6
  vibTri 2 s3 14
  gate -2`,
  saw: `
  wave saw
  adsr 0 10 9 6
  vibTri 2 s3 10
  gate -2`,
  brass: `
  wave pulse
  pw ${pwBounce(1024, 768, 2304, 8)}
  loop pw 0
  adsr 5 10 10 8
  vibTri 3 s3 20
  gate -2`,
  bell: `
  wave triangle
  arp 24 12 0
  loop arp 2
  adsr 0 10 4 8
  vibTri 3 s4 18
  gate -2`,
  pluck: `
  wave pulse
  pw ${pwBounce(1536, 768, 2048, 14)}
  loop pw 0
  adsr 0 7 3 0
  gate -2`,
  // bright pulse lead that starts each note an octave up
  octave: `
  wave noise pulse
  arp 24 0
  pw ${pwBounce(512, 512, 3328, 24)}
  loop wave 1 arp 1 pw 0
  adsr 0 10 10 8
  vibTri 2 s3 12
  gate -2`,
  // buzzy narrow pulse for guitar-like rock leads
  fuzz: `
  wave noise pulse
  arp 12 0
  pw ${pwBounce(640, 640, 1408, 40)}
  loop wave 1 arp 1 pw 0
  adsr 0 9 12 5
  vibTri 2 s4 18
  gate -2`,
  // plain square wave without vibrato: the dry chip lead
  square: `
  wave pulse
  pw 2048
  adsr 0 8 7 3
  gate -2`,
  // sawtooth lead with portamento between notes
  glide: `
  wave saw
  adsr 1 9 11 6
  slide 0.1
  vibTri 2 s3 20
  gate -2`,
  // narrow static pulse: nasal, like an oboe or a clarinet
  reed: `
  wave pulse
  pw 640
  adsr 2 9 10 5
  vibTri 2 s4 20
  gate -2`,
  // fast root-octave alternation: the warbling C64 lead
  warble: `
  wave pulse
  arp 0 0 12 12
  pw ${pwBounce(1536, 1024, 2560, 10)}
  loop arp 0 pw 0
  adsr 0 9 9 5
  gate -2`,
  // soft second voice for counter-melodies
  counter: `
  wave triangle
  adsr 3 9 10 7
  vibTri 3 s4 24
  gate -2`,
  whistle: `
  wave triangle
  adsr 2 9 11 5
  vibTri 3 s4 16
  gate -2`,
  fiddle: `
  wave saw
  adsr 3 9 10 5
  vibTri 2 s3 12
  gate -2`,

  // ---- in C64 style -------------------------
  ...Object.fromEntries(Object.entries({ ...HVSC_BASSES, ...HVSC_LEADS }).map(([id, v]) => [id, v.body.trimEnd()])),
};

// Chord arpeggio instruments, one per quality: 1 frame per arp step, the
// classic SID warble. Offsets relative to the played (root) note.
export const ARP_SHAPES = {
  M: [0, 4, 7],
  m: [0, 3, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  5: [0, 7, 12],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  M7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  7: [0, 4, 7, 10],
  // inversions (common in real SID music: 0-3-8, 0-5-9, 0-4-9, 0-5-8 in
  //
  M1: [0, 3, 8],
  M2: [0, 5, 9],
  m1: [0, 4, 9],
  m2: [0, 5, 8],
};

// Instrument names must not contain '_' (the mini-notation hold token).
const ARP_NAMES = {
  M: 'arpMaj', m: 'arpMin', dim: 'arpDim', aug: 'arpAug', 5: 'arpPow',
  sus2: 'arpSus2', sus4: 'arpSus4', M7: 'arpMaj7', m7: 'arpMin7', 7: 'arpDom7',
  M1: 'arpMajA', M2: 'arpMajB', m1: 'arpMinA', m2: 'arpMinB',
};
const ARP_QUALITY = Object.fromEntries(Object.entries(ARP_NAMES).map(([q, n]) => [n, q]));
export const arpInstrumentFor = (quality) => ARP_NAMES[quality];

function arpInstrument(quality, shape) {
  return `
  wave pulse
  arp ${shape.join(' ')}
  pw ${pwBounce(1024, 768, 2560, 12)}
  loop arp 0 pw 0
  adsr 0 10 8 6
  gate -2`;
}

// A lead sound designed in the brief: waveform, envelope,
// vibrato depth and pulse-width movement, all clamped to safe ranges.
export function customLeadBody(sound) {
  const wave = ['pulse', 'saw', 'triangle'].includes(sound.wave) ? sound.wave : 'pulse';
  const n = (v, lo, hi, d) => Math.max(lo, Math.min(hi, Math.round(Number.isFinite(Number(v)) ? Number(v) : d)));
  const adsr = [n(sound.attack, 0, 12, 1), n(sound.decay, 0, 12, 9), n(sound.sustain, 0, 15, 10), n(sound.release, 0, 12, 6)];
  // onset: a noise click or an octave-up first frame before the tone
  const onset = sound.onset === 'noise' || sound.onset === 'octave' ? sound.onset : 'none';
  const lines = [onset === 'noise' ? `  wave noise ${wave}` : `  wave ${wave}`];
  const loops = [];
  if (onset !== 'none') { lines.push(`  arp ${onset === 'noise' ? 12 : 24} 0`); loops.push(onset === 'noise' ? 'wave 1 arp 1' : 'arp 1'); }
  const pwmStep = { slow: 6, medium: 14, fast: 22 }[sound.pwm];
  const width = { narrow: 768, medium: 1280, square: 2048 }[sound.pulse_width] || 2048;
  if (wave === 'pulse' && pwmStep) {
    const start = Math.max(1024, width);
    lines.push(`  pw ${pwBounce(start, 768, start + 1536, pwmStep)}`);
    loops.push('pw 0');
  } else if (wave === 'pulse') lines.push(`  pw ${width}`);
  if (loops.length) lines.push(`  loop ${loops.join(' ')}`);
  lines.push(`  adsr ${adsr.join(' ')}`);
  const vib = Math.max(0, Math.min(3, Number(sound.vibrato) || 0));
  if (vib > 0) lines.push(`  vibTri ${vib >= 2 ? 3 : 2} s${vib >= 2.5 ? 2 : vib >= 1.5 ? 3 : 4} 14`);
  const slide = { short: 0.06, long: 0.14 }[sound.slide];
  if (slide) lines.push(`  slide ${slide}`);
  lines.push('  gate -2');
  return `\n${lines.join('\n')}`;
}

// Echo variant of a lead: the SID has no volume per voice, and
// every attack peaks at full level, so the echo decays fast to a low
// sustain (tracker echoes sit 3-6 sustain steps below their lead).
// Pulse width stays at its first value and there is no vibrato: an echo
// needs no movement of its own, and per-frame writes would fill the .sid.
function echoBody(body) {
  return body
    .replace(/adsr (\d+) (\d+) (\d+) (\d+)/, (_, a, d, s, r) => `adsr ${a} ${Math.min(Number(d), 6)} ${Math.max(0, Number(s) - 6)} ${r}`)
    .replace(/\n {2}pw (\d+)[^\n]*/, '\n  pw $1')
    .replace(/\n {2}vib(Tri)? [^\n]*/, '');
}

// Bend variant of a lead: the same sound gliding into the note
// from the previous one in about three frames, for the few notes a melody
// slides into (tracker leads glide on about 5 % of notes, mostly by a
// half or whole step).
function bendBody(body, speed) {
  return /\n {2}slide /.test(body) ? body : body.replace(/\n {2}gate /, `\n  slide ${Math.max(0.02, Math.round((300 / speed)) / 100)}\n  gate `);
}

function bodyOf(name, sound, speed) {
  let body = DRUMS[name] || MELODIC[name];
  if (!body && name === 'custom' && sound) body = customLeadBody(sound);
  if (!body && ARP_QUALITY[name]) body = arpInstrument(ARP_QUALITY[name], ARP_SHAPES[ARP_QUALITY[name]]);
  if (!body && name.endsWith('echo')) {
    const base = bodyOf(name.slice(0, -4), sound, speed);
    if (base) body = echoBody(base);
  }
  if (!body && name.endsWith('bend')) {
    const base = bodyOf(name.slice(0, -4), sound, speed);
    if (base) body = bendBody(base, speed);
  }
  return body;
}

// speed: frames per beat of the song (bend variants slide in frames).
export function instrumentBlocks(names, sound = null, speed = 24) {
  const out = [];
  for (const name of names) {
    const body = bodyOf(name, sound, speed);
    if (!body) throw new Error(`unknown instrument ${name}`);
    out.push(`instrument ${name}${body}\nend`);
  }
  return out.join('\n\n');
}

export const DRUM_LETTERS = { k: 'kick', s: 'snare', h: 'hat', o: 'ohat', c: 'clap', t: 'tom', T: 'tomhi', x: 'crash' };
export const isDrum = (name) => Boolean(DRUMS[name]);
