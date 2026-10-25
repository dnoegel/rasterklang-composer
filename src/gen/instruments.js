// Instrument bank as rasterklang-dsl instrument blocks. Ported from
// an earlier prototype's audio/sounds.js (wavetables, PWM bounds, drum
// programs) to DSL tables, which run per frame since each note's onset.
// Pulse sweeps stay within pw >= 768 and small steps: narrower or faster
// sweeps alias into hiss in the emulator (launchpad known issue).

// Pulse-width bounce: up from `start` to `hi`, down to `lo`, back to start.
function pwBounce(start, lo, hi, step) {
  return `ramp ${start}..${hi} step ${step} ramp ${hi}..${lo} step -${step} ramp ${lo}..${start} step ${step}`;
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
  hubbard: `
  wave noise pulse
  arp 24 0
  pw ${pwBounce(512, 512, 3328, 24)}
  loop wave 1 arp 1 pw 0
  adsr 0 10 10 8
  vibTri 2 s3 12
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
};

// Instrument names must not contain '_' (the mini-notation hold token).
const ARP_NAMES = {
  M: 'arpMaj', m: 'arpMin', dim: 'arpDim', aug: 'arpAug', 5: 'arpPow',
  sus2: 'arpSus2', sus4: 'arpSus4', M7: 'arpMaj7', m7: 'arpMin7', 7: 'arpDom7',
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

export function instrumentBlocks(names) {
  const out = [];
  for (const name of names) {
    let body = DRUMS[name] || MELODIC[name];
    if (!body && ARP_QUALITY[name]) body = arpInstrument(ARP_QUALITY[name], ARP_SHAPES[ARP_QUALITY[name]]);
    if (!body) throw new Error(`unknown instrument ${name}`);
    out.push(`instrument ${name}${body}\nend`);
  }
  return out.join('\n\n');
}

export const DRUM_LETTERS = { k: 'kick', s: 'snare', h: 'hat', o: 'ohat', c: 'clap', t: 'tom', T: 'tomhi', x: 'crash' };
export const isDrum = (name) => Boolean(DRUMS[name]);
