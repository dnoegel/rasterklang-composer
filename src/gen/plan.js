// Intent -> descriptor target -> song plan.

import { Rng } from './prng.js';
import { MOODS } from './moods.js';
import { STYLES, SECTION_ENERGY } from './styles.js';
import { MODE_BRIGHTNESS, MINOR_MODES, chordAt, parseRoman } from './theory.js';
import { resolveStyle } from './intent.js';

export const GENERATOR_VERSION = 'compose-0.1.0';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Weighted sum of the prompt's mood offsets.
export function moodVector(moods) {
  const v = { brightness: 0, tempo: 1, energy: 0, register: 0, legato: 0, tension: 0, sevenths: 0 };
  for (const [m, w] of Object.entries(moods)) {
    const o = MOODS[m];
    if (!o) continue;
    v.brightness += o.brightness * w;
    v.tempo *= 1 + (o.tempo - 1) * w;
    v.energy += o.energy * w;
    v.register += o.register * w;
    v.legato += o.legato * w;
    v.tension += o.tension * w;
    v.sevenths += o.sevenths * w;
  }
  return v;
}

// The descriptor target: what the rendered tune should measure as.
export function descriptorTarget(intent, style) {
  const mood = moodVector(intent.moods);
  const modeWeights = style.modes;
  const total = Object.values(modeWeights).reduce((s, w) => s + w, 0);
  const styleBrightness = Object.entries(modeWeights).reduce((s, [m, w]) => s + MODE_BRIGHTNESS[m] * w, 0) / total;
  const energyBias = clamp(intent.energy + mood.energy, -0.6, 0.6);
  const [lo, hi] = style.tempo;
  let tempo = lo + (hi - lo) * clamp(0.5 + energyBias * 0.8, 0, 1);
  tempo *= mood.tempo;
  // The style keeps its tempo band; moods only bend inside it (research:
  // genre identity rides on tempo and groove, valence on mode).
  tempo = clamp(tempo, lo * 0.92, hi * 1.04);
  if (intent.tempo) tempo = intent.tempo;
  return {
    brightness: clamp(styleBrightness + mood.brightness, 0.08, 0.88),
    tempo,
    energyBias,
    register: mood.register,
    legato: clamp(mood.legato, -1, 1),
    tension: clamp(mood.tension, 0, 1),
    sevenths: clamp((style.sevenths || 0) + mood.sevenths, 0, 0.9),
  };
}

function chooseMode(style, target, intent, rng) {
  const weights = Object.entries(style.modes).map(([mode, w]) => {
    let weight = w * Math.exp(-((MODE_BRIGHTNESS[mode] - target.brightness) ** 2) / (2 * 0.16 ** 2));
    if (mode === 'harmonic' || mode === 'phrygian') weight *= 1 + target.tension * 2;
    if (intent.key && intent.key.minor === true && !MINOR_MODES.has(mode)) weight = 0;
    if (intent.key && intent.key.minor === false && MINOR_MODES.has(mode)) weight = 0;
    return [mode, weight + 1e-6];
  });
  return rng.weighted(weights);
}

// Comfortable keys per family keep the lead and bass in a good register.
const KEY_POOLS = {
  metal: [4, 9, 2, 7, 0], // E A D G C
  synth: [9, 4, 2, 0, 5, 7, 11],
  game: [0, 7, 2, 5, 9, 4],
  folk: [2, 7, 9, 4, 0], // D G A E C
};

// Frames per beat: whole frames, so bars line up with the SID frame grid.
function snapTempo(style, bpm) {
  if (style.meter.unit === 8) {
    const fpe = Math.round(3000 / (bpm * 3)); // frames per eighth, bpm = dotted quarter
    return { speed: fpe, bpm: 3000 / fpe / 3 };
  }
  const fpb = Math.round(3000 / bpm);
  return { speed: fpb, bpm: 3000 / fpb };
}

function colourChord(symbol, sevenths, rng, power) {
  if (power) return symbol.replace(/(7|M7|m7|dim|sus4|sus2)$/, '');
  if (/(7|dim|sus|5)$/.test(symbol) || !rng.chance(sevenths)) return symbol;
  const { quality } = parseRoman(symbol);
  if (quality === 'm') return `${symbol}7`;
  // major: I and IV get maj7, V gets dominant 7
  if (/^V$/.test(symbol)) return 'V7';
  if (/^(I|IV|bVI|bIII)$/.test(symbol)) return `${symbol}M7`;
  return symbol;
}

export function makePlan(intent, seed) {
  const styleId = resolveStyle(intent);
  const style = STYLES[styleId];
  const rng = new Rng(seed, GENERATOR_VERSION, 'plan');
  const target = descriptorTarget(intent, style);
  const mode = chooseMode(style, target, intent, rng);
  const tonality = MINOR_MODES.has(mode) ? 'minor' : 'major';
  const keyRoot = intent.key ? intent.key.root : rng.pick(KEY_POOLS[style.family]);
  const { speed, bpm } = snapTempo(style, target.tempo);

  const formId = intent.form && style.forms[intent.form] ? intent.form : 'song';
  const progs = style.progressions[tonality];
  const byType = {};
  const leadInst = {};
  const sections = [];
  let bar = 0;
  const counts = {};
  for (const [type, bars] of style.forms[formId]) {
    counts[type] = (counts[type] || 0) + 1;
    const progType = progs[type] ? type : type === 'solo' ? 'verse' : type === 'breakdown' || type === 'outro' || type === 'intro' ? 'verse' : 'bridge';
    if (!byType[progType]) {
      const base = rng.pick(progs[progType] || progs.verse);
      byType[progType] = base.map((s) => colourChord(s, target.sevenths, rng, style.power));
    }
    if (!leadInst[type] && style.lead.inst[type]) leadInst[type] = rng.pick(style.lead.inst[type]);
    const energy = clamp(SECTION_ENERGY[type] + target.energyBias * 0.7, 0.05, 1);
    const chords = [];
    for (let b = 0; b < bars; b += 1) {
      const symbol = byType[progType][b % byType[progType].length];
      chords.push(chordAt(keyRoot, symbol));
    }
    // Sections end on the tonic when the tune is about to stop or turn.
    if (type === 'outro') chords[chords.length - 1] = chordAt(keyRoot, tonality === 'minor' ? 'i' : 'I');
    sections.push({
      type,
      label: style.partNames?.[type] || type,
      occurrence: counts[type],
      startBar: bar,
      bars,
      energy,
      chords,
      roles: style.roles[type] || 'DBL',
      leadInst: leadInst[type] || leadInst.verse || style.lead.inst.verse[0],
    });
    bar += bars;
  }
  for (const s of sections) s.lastOccurrence = s.occurrence === counts[s.type];

  return {
    version: GENERATOR_VERSION,
    seed,
    styleId,
    style,
    target,
    mode,
    tonality,
    keyRoot,
    speed,
    bpm,
    form: formId,
    sections,
    totalBars: bar,
  };
}
