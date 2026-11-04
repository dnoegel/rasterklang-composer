// Instrument bank as rasterklang-dsl instrument blocks: wavetables, PWM
// bounds and drum programs as DSL tables, which run per frame since each
// note's onset.
// Pulse sweeps stay within pw >= 768 and small steps: narrower or faster
// sweeps alias into hiss in the emulator.

import { customEnvelope, holdEnvelope, bassEnvelope, ECHO_RULE } from './sound/profile.js';
import { BASSES } from './library/palettes.js';
import { HVSC_DRUMS, HVSC_BASSES, HVSC_LEADS } from './library/hvsc-instruments.js';
import { CANDIDATE_DRUMS, CANDIDATE_BASSES, CANDIDATE_LEADS } from './library/standard.js';

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
  // C64-style drum kits (library/hvsc-instruments.js)
  ...Object.fromEntries(Object.entries(HVSC_DRUMS).map(([id, body]) => [id, body.trimEnd()])),
  // standard library kits; all candidates compile, the palettes hold the passed ones
  ...CANDIDATE_DRUMS,
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
  // classic SID tricks: ring modulation and hard sync
  // take the neighbouring voice (usually the bass) as source, so the timbre
  // moves with the bass line. ring/sync are voice fields in the DSL: the
  // emitter switches them on for the steps these leads play (src/gen/emit.js).
  ring: `
  wave triangle
  adsr 0 9 8 8
  vibTri 2 s3 16
  gate -2`,
  sync: `
  wave saw
  adsr 0 10 10 6
  vibTri 2 s3 14
  gate -2`,
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
  arp 12 0
  loop arp 1
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

  // ---- C64-style basses and leads (library/hvsc-instruments.js) ----
  ...Object.fromEntries(Object.entries({ ...HVSC_BASSES, ...HVSC_LEADS }).map(([id, v]) => [id, v.body.trimEnd()])),
  // ---- standard library of HVSC sounds ----------------------
  ...Object.fromEntries(Object.entries({ ...CANDIDATE_BASSES, ...CANDIDATE_LEADS }).map(([id, v]) => [id, v.body])),
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
  // inversions (common in real SID music: 0-3-8, 0-5-9, 0-4-9, 0-5-8)
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

// The song's arp sound (palette.arp, library/palettes.js ARPS) sets the
// waveform, envelope and pace of every chord quality's arpeggio.
// wave, frames per arp note, pulse width (a number, a sweep [start, lo,
// hi, step] or null), adsr; `wide` adds the octave above.
const ARP_SOUNDS = {
  pwm: ['pulse', 1, [1024, 768, 2560, 12], '0 10 8 6'],
  square: ['pulse', 1, 2048, '0 9 9 4'],
  thin: ['pulse', 1, 768, '0 10 7 5'],
  saw: ['saw', 1, null, '0 9 7 5'],
  tri: ['triangle', 1, null, '0 10 10 7'],
  pluck: ['pulse', 1, [1536, 1024, 2304, 14], '0 6 2 3'],
  slow: ['pulse', 2, [1280, 768, 2304, 10], '0 10 9 6'],
  pad: ['triangle', 2, null, '4 10 11 9'],
  wide: ['pulse', 1, [1536, 768, 2560, 16], '0 9 8 5'],
};
function arpInstrument(shape, kind, tuning) {
  const [wave, frames, pw, designed] = ARP_SOUNDS[kind] || ARP_SOUNDS.pwm;
  const adsr = tuning?.arp?.[kind] ? tuning.arp[kind].join(' ') : designed;
  const notes = kind === 'wide' ? [...shape, 12] : shape;
  const lines = [`  wave ${wave}`, `  arp ${notes.map((x) => (frames > 1 ? `${x}!${frames}` : x)).join(' ')}`];
  if (Array.isArray(pw)) lines.push(`  pw ${pwBounce(...pw)}`, '  loop arp 0 pw 0');
  else lines.push(...(pw ? [`  pw ${pw}`] : []), '  loop arp 0');
  lines.push(`  adsr ${adsr}`, '  gate -2');
  return `\n${lines.join('\n')}`;
}

// A lead sound designed in the brief: waveform, envelope,
// vibrato depth and pulse-width movement, all clamped to safe ranges.
export function customLeadBody(sound, rule = null) {
  const wave = ['pulse', 'saw', 'triangle'].includes(sound.wave) ? sound.wave : 'pulse';
  const n = (v, lo, hi, d) => Math.max(lo, Math.min(hi, Math.round(Number.isFinite(Number(v)) ? Number(v) : d)));
  const requested = [n(sound.attack, 0, 12, 1), n(sound.decay, 0, 12, 9), n(sound.sustain, 0, 15, 10), n(sound.release, 0, 12, 6)];
  const adsr = rule ? customEnvelope(requested, rule) : requested;
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
// sustain (C64 echoes typically sit 3-6 sustain steps below their lead).
// Pulse width stays at its first value and there is no vibrato: an echo
// needs no movement of its own, and per-frame writes would fill the .sid.
function echoBody(body, rule = null) {
  const { dMax, sDrop } = { ...ECHO_RULE, ...rule }; // tuned profiles move both (src/gen/sound/profile.js)
  return body
    .replace(/adsr (\d+) (\d+) (\d+) (\d+)/, (_, a, d, s, r) => `adsr ${a} ${Math.min(Number(d), dMax)} ${Math.max(0, Number(s) - sDrop)} ${r}`)
    .replace(/\n {2}pw (\d+)[^\n]*/, '\n  pw $1')
    .replace(/\n {2}vib(Tri)? [^\n]*/, '');
}

// Bend variant of a lead: the same sound gliding into the note
// from the previous one in about three frames, for the few notes a melody
// slides into (C64 leads glide on a few percent of notes, mostly by a
// half or whole step).
function bendBody(body, speed) {
  return /\n {2}slide /.test(body) ? body : body.replace(/\n {2}gate /, `\n  slide ${Math.max(0.02, Math.round((300 / speed)) / 100)}\n  gate `);
}

// Top variant of a lead: the same sound with its upward attack arp one
// octave lower (bell 24 12 0 -> 12 0 0), for notes where note + arp would
// pass the SID's top pitch (SID_TOP_NOTE). Stacks: belltoptop drops two.
function topBody(body) {
  return body.replace(/\n {2}arp ([^\n]*)/, (_, vals) => `\n  arp ${vals.split(/\s+/).map((t) => (/^\d+(!\d+)?$/.test(t) ? t.replace(/^\d+/, (v) => String(Math.max(0, Number(v) - 12))) : t)).join(' ')}`);
}

// `tuning` (src/gen/sound/tuned.js) replaces the ADSR of base
// instruments, arp sounds and the custom lead; derived variants (echo, bend,
// top) then follow their base by the rules below.
const withAdsr = (body, adsr) => (adsr ? body.replace(/adsr \d+ \d+ \d+ \d+/, `adsr ${adsr.join(' ')}`) : body);

function bodyOf(name, sound, speed, arp, tuning = null) {
  let body = DRUMS[name] || MELODIC[name];
  if (body) body = withAdsr(body, tuning?.instruments?.[name]);
  // bass rule of the profile: a sustain floor for the basses (src/gen/sound/profile.js)
  if (body && BASSES[name] && tuning?.bass) {
    const m = /adsr (\d+) (\d+) (\d+) (\d+)/.exec(body);
    if (m) body = withAdsr(body, bassEnvelope(name, m.slice(1).map(Number), tuning.bass));
  }
  if (!body && name === 'custom' && sound) body = customLeadBody(sound, tuning?.custom);
  if (!body && ARP_QUALITY[name]) body = arpInstrument(ARP_SHAPES[ARP_QUALITY[name]], arp, tuning);
  if (!body && name.endsWith('echo')) {
    const base = bodyOf(name.slice(0, -4), sound, speed, arp, tuning);
    if (base) body = echoBody(base, tuning?.echo);
  }
  // held variant of a lead for long notes (tuned profiles only, src/gen/sound/hold.js)
  if (!body && name.endsWith('hold') && tuning?.hold) {
    const base = bodyOf(name.slice(0, -4), sound, speed, arp, tuning);
    const m = base && /adsr (\d+) (\d+) (\d+) (\d+)/.exec(base);
    if (m) body = withAdsr(base, holdEnvelope(m.slice(1).map(Number), tuning.hold));
  }
  if (!body && name.endsWith('bend')) {
    const base = bodyOf(name.slice(0, -4), sound, speed, arp, tuning);
    if (base) body = bendBody(base, speed);
  }
  if (!body && name.endsWith('top')) {
    const base = bodyOf(name.slice(0, -3), sound, speed, arp, tuning);
    if (base) body = topBody(base);
  }
  return body;
}

// Hard restart for the accurate SID engine (and real C64s): the SID's
// envelope waits for its rate counter to wrap (the ADSR delay bug), so an
// attack or release can start up to about 1.7 frames late, and a short drum
// hit loses its first frame. Before every note (also after a rest) the
// envelope goes to 00 00, and a release faster than the decay is preset just
// before the gate closes (rasterklang-dsl 4.7.0). Gate tables restart in
// their last frame, `gate -M` instruments in their M frames. Slow attacks
// keep their envelope, as a restart from silence would change their sound.
//
// The restart envelope is tuned per instrument by ear and by measurement
// against the old sound (tick frames above 4 kHz plus frames more than
// 6 dB off, each instrument alone): SR 00 cuts a tail that still sounds,
// which clicks on a 6581, so instruments whose tail is still loud at the
// restart keep their own release (`own`) or a gentle one (`sr 0 1`,
// `sr 0 2`), and two do best without a restart. Derived variants (echo,
// hold, bend, top) follow their base instrument.
const RESTART_CLAUSES = { cur: 'ad 0 0 sr 0 0', own: 'ad 0 0', sr1: 'ad 0 0 sr 0 1', sr2: 'ad 0 0 sr 0 2' };
const RESTART_OF = {
  kickBoom: 'own', hatBoom: 'own', snareTight: 'own', snareThin: 'own', hatThin: 'own', stdsnare772: 'own',
  chipbass: 'own', growl: 'own', saw: 'own', brass: 'own', octave: 'own', square: 'own', thump: 'own',
  buzz: 'own', vibra: 'own', scoop: 'own', stdbass494: 'own', stdbass399: 'own',
  clap: 'sr1', snareRound: 'sr1', gtbass: 'sr1',
  snareBoom: 'sr2', stdsnare422: 'sr2', sharp: 'sr2',
  stdsnare583: 'none', fuzz: 'none',
};
// Arpeggio instruments by the song's arp sound (measured the same way).
const RESTART_OF_ARP = { pwm: 'none', slow: 'none', wide: 'none', pluck: 'own', pad: 'own' };
const RESTART_MAX_ATTACK = 5;
const baseName = (name) => (/(echo|hold|bend|top)$/.test(name) ? baseName(name.replace(/(echo|hold|bend|top)$/, '')) : name);
function withHardRestart(body, name, arp) {
  const base = baseName(name);
  const kind = (ARP_QUALITY[base] ? RESTART_OF_ARP[arp] : RESTART_OF[base]) || 'cur';
  if (kind === 'none') return body;
  const clauses = `${RESTART_CLAUSES[kind]} afterRests presetRelease`;
  const attack = /\n {2}adsr (\d+)/.exec(body);
  if (attack && Number(attack[1]) > RESTART_MAX_ATTACK) return body;
  if (/\n {2}gate [01](!\d+)?( [01](!\d+)?)+(\n|$)/.test(body)) return `${body}\n  hardRestart 1 ${clauses}`;
  return body.replace(/\n {2}gate -(\d+)(?=\n|$)/, `\n  hardRestart $1 ${clauses}`);
}

// Noise four octaves lower (rasterklang-composer 0.2.1): the SID clocks its
// noise generator from bit 19 of the oscillator, the engine the instruments
// were tuned on from bit 23, so on a real C64 (and rasterklang-wasm 0.1.1)
// every noise frame sounded 16 times faster, much brighter. Every arp entry
// that plays on a noise frame moves down 48 semitones (from the register a
// wrapped high note really played), so the noise sounds as it was tuned. Wave and arp tables are expanded frame by frame with the
// compiler's wrap-and-loop rule and the arp table is written back with their
// common period. kickThin's noise frame follows a test-bit frame, which
// resets the noise generator on a real SID; four octaves down it barely moves
// within the frame and the kick loses 4 dB, so it moves 46 semitones; the
// tuned hatBoom (also after a test bit) moves 36.
const NOISE_SHIFT = 48;
// The note whose frequency register is the one `note` produced (16 bits, so
// notes above about 107 wrap around) moved down `shift` semitones: a wrapped
// high hat was a much lower noise than its note name says.
const SID_FREQ_PER_HZ = 16777216 / 985248;
function noiseNoteFor(note, shift) {
  const reg = Math.round(440 * 2 ** ((note - 69) / 12) * SID_FREQ_PER_HZ) & 0xffff;
  if (reg === Math.round(440 * 2 ** ((note - 69) / 12) * SID_FREQ_PER_HZ)) return note - shift;
  return Math.round(69 + 12 * Math.log2(reg / SID_FREQ_PER_HZ / 440)) - shift;
}
const NOISE_SHIFT_OF = { kickThin: 46, hatBoom: 36 };
const expandTable = (row) => row.trim().split(/\s+/).flatMap((t) => {
  const m = /^(.*?)(?:!(\d+))?$/.exec(t);
  return Array(Number(m[2] || 1)).fill(m[1]);
});
const compressTable = (items) => {
  const out = [];
  for (const x of items) {
    const last = out[out.length - 1];
    if (last && last[0] === x) last[1] += 1;
    else out.push([x, 1]);
  }
  return out.map(([x, n]) => (n > 1 ? `${x}!${n}` : x)).join(' ');
};
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
function withOldNoiseClock(body, shift = NOISE_SHIFT) {
  const wave = /\n {2}wave ([^\n]*)/.exec(body);
  if (!wave || !/noise/.test(wave[1])) return body;
  const arp = /\n {2}arp ([^\n]*)/.exec(body);
  const loopLine = /\n {2}loop ([^\n]*)/.exec(body);
  const loopOf = (kind) => {
    const m = loopLine && new RegExp(`\\b${kind} (\\d+)`).exec(loopLine[1]);
    return m ? Number(m[1]) : 0;
  };
  const W = expandTable(wave[1]);
  const A = arp ? expandTable(arp[1]) : ['0'];
  const lw = Math.min(loopOf('wave'), W.length - 1);
  const la = arp ? Math.min(loopOf('arp'), A.length - 1) : 0;
  const at = (T, loop, t) => (t < T.length ? T[t] : T[loop + ((t - loop) % (T.length - loop))]);
  const start = Math.max(lw, la);
  const cw = W.length - lw;
  const ca = A.length - la;
  const period = (cw * ca) / gcd(cw, ca);
  const length = Math.max(W.length, A.length, start + period);
  const shifted = [];
  for (let t = 0; t < length; t += 1) {
    const a = at(A, la, t);
    if (!/noise/.test(at(W, lw, t))) { shifted.push(a); continue; }
    const abs = /^=(-?\d+)$/.exec(a);
    if (abs) shifted.push(`=${noiseNoteFor(Number(abs[1]), shift)}`);
    else if (/^-?\d+$/.test(a)) shifted.push(String(Number(a) - shift));
    else return body; // a note name or another spelling: leave the instrument as it is
  }
  const row = compressTable(shifted);
  let out = arp ? body.replace(/\n {2}arp [^\n]*/, `\n  arp ${row}`) : body.replace(/(\n {2}wave [^\n]*)/, `$1\n  arp ${row}`);
  const loopArp = start + (length - start - period);
  if (loopArp > 0 || (loopLine && /\barp \d+/.test(loopLine[1]))) {
    out = loopLine
      ? out.replace(/\n {2}loop ([^\n]*)/, (m, rest) => `\n  loop ${/\barp \d+/.test(rest) ? rest.replace(/\barp \d+/, `arp ${loopArp}`) : `${rest} arp ${loopArp}`}`)
      : `${out}\n  loop arp ${loopArp}`;
  }
  return out;
}

// speed: frames per beat of the song (bend variants slide in frames);
// arp: the song's arp sound (ARP_SOUNDS). With a tuning (score 0.2) every
// instrument gets its hard restart (withHardRestart).
export function instrumentBlocks(names, sound = null, speed = 24, arp = 'pwm', tuning = null) {
  const out = [];
  for (const name of names) {
    let body = bodyOf(name, sound, speed, arp, tuning);
    if (!body) throw new Error(`unknown instrument ${name}`);
    if (tuning) body = withHardRestart(body, name, arp);
    body = withOldNoiseClock(body, NOISE_SHIFT_OF[name] ?? NOISE_SHIFT);
    out.push(`instrument ${name}${body}\nend`);
  }
  return out.join('\n\n');
}

// [attack, decay, sustain, release] an instrument plays with (derived
// variants included), under a sound profile's tuning or as designed.
export function instrumentAdsr(name, sound = null, speed = 24, arp = 'pwm', tuning = null) {
  const m = /\n {2}adsr (\d+) (\d+) (\d+) (\d+)/.exec(bodyOf(name, sound, speed, arp, tuning) || '');
  return m ? m.slice(1).map(Number) : null;
}

// Names the tuner may give an envelope: base instruments (bank and C64-style),
// arp sounds; the custom lead has a rule instead.
export const tunableInstruments = () => Object.keys({ ...DRUMS, ...MELODIC });
export const arpSoundKinds = () => Object.keys(ARP_SOUNDS);

// Highest MIDI note the SID's 16-bit frequency register holds (B7, about
// 3.95 kHz on PAL); higher pitches wrap around into a random squeal.
export const SID_TOP_NOTE = 107;

// How far an instrument's arp table climbs above the played note (bell
// starts two octaves up), so melodies can keep note + arp on the chip.
export function arpReach(name, sound = null) {
  const arp = /\n {2}arp ([^\n]*)/.exec(bodyOf(name, sound) || '');
  if (!arp) return 0;
  const ups = arp[1].split(/\s+/).filter((t) => /^-?\d+(!\d+)?$/.test(t)).map((t) => parseInt(t, 10));
  return Math.max(0, ...ups);
}

export const DRUM_LETTERS ={ k: 'kick', s: 'snare', h: 'hat', o: 'ohat', c: 'clap', t: 'tom', T: 'tomhi', x: 'crash' };
export const isDrum = (name) => Boolean(DRUMS[name]);
