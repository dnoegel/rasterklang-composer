// The song brief: every musical choice of a song in
// one plain object. The rule-based path samples it from style weights; the
// LLM path writes it. validateBrief repairs either, planFromBrief turns it
// into the plan the renderer reads.

import { Rng } from './prng.js';
import { MOODS } from './moods.js';
import { STYLES, blendStyles } from './styles.js';
import { MODE_BRIGHTNESS, MINOR_MODES, SCALES, chordAt, parseRoman } from './theory.js';
import { METERS, framesPerBeat, bpmFor } from './library/meters.js';
import { GROOVES } from './library/grooves.js';
import { BASS } from './library/bass.js';
import { CELLS } from './library/cells.js';
import { PROGRESSIONS } from './library/progressions.js';
import { TEXTURES, KIND_OF, TRANSITIONS } from './library/textures.js';
import { FORMS, SECTION_ENERGY } from './library/forms.js';
import { LEADS, BASSES, SNARES, PERSONAS } from './library/palettes.js';

export const GENERATOR_VERSION = 'compose-0.2.0';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const LABELS = { intro: 'Intro', verse: 'Strophe', pre: 'Pre-Chorus', chorus: 'Refrain', bridge: 'Bridge', solo: 'Solo', breakdown: 'Breakdown', build: 'Aufbau', outro: 'Outro' };

export function moodVector(moods) {
  const v = { brightness: 0, tempo: 1, energy: 0, register: 0, legato: 0, tension: 0, sevenths: 0 };
  for (const [m, w] of Object.entries(moods || {})) {
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

// The descriptor target: what the tune should measure as.
export function descriptorTarget(intent, style) {
  const mood = moodVector(intent.moods);
  const total = Object.values(style.modes).reduce((s, w) => s + w, 0);
  const styleBrightness = Object.entries(style.modes).reduce((s, [m, w]) => s + MODE_BRIGHTNESS[m] * w, 0) / total;
  const energyBias = clamp((intent.energy || 0) + mood.energy, -0.6, 0.6);
  const [lo, hi] = style.tempo;
  let tempo = lo + (hi - lo) * clamp(0.5 + energyBias * 0.8, 0, 1);
  tempo = clamp(tempo * mood.tempo, lo * 0.92, hi * 1.04);
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

function energyFit(entry, energy) {
  const [lo, hi] = entry.energy || [0, 1];
  if (energy >= lo && energy <= hi) return 1;
  const d = energy < lo ? lo - energy : energy - hi;
  return Math.exp(-(d * d) / (2 * 0.1 * 0.1));
}

function pickWeighted(rng, weights, filter = () => true, boost = () => 1) {
  const entries = Object.entries(weights).filter(([id, w]) => w > 0 && filter(id)).map(([id, w]) => [id, w * boost(id)]);
  if (!entries.length) return null;
  return rng.weighted(entries);
}

function chooseMode(style, target, intent, rng) {
  return rng.weighted(Object.entries(style.modes).map(([mode, w]) => {
    let weight = w * Math.exp(-((MODE_BRIGHTNESS[mode] - target.brightness) ** 2) / (2 * 0.16 ** 2));
    if (mode === 'harmonic' || mode === 'phrygian') weight *= 1 + target.tension * 2;
    if (intent.key?.minor === true && !MINOR_MODES.has(mode)) weight = 0;
    if (intent.key?.minor === false && MINOR_MODES.has(mode)) weight = 0;
    return [mode, weight + 1e-6];
  }));
}

const KEY_POOLS = {
  metal: [4, 9, 2, 7, 0], synth: [9, 4, 2, 0, 5, 7, 11], game: [0, 7, 2, 5, 9, 4], folk: [2, 7, 9, 4, 0],
};

function colourChord(symbol, sevenths, rng, power) {
  if (power) return symbol.replace(/(M7|m7|7|dim|sus4|sus2)$/, '');
  if (/(7|dim|sus|5)$/.test(symbol) || !rng.chance(sevenths)) return symbol;
  const { quality } = parseRoman(symbol);
  if (quality === 'm') return `${symbol}7`;
  if (symbol === 'V') return 'V7';
  if (/^(I|IV|bVI|bIII)$/.test(symbol)) return `${symbol}M7`;
  return symbol;
}

// Rule-based path: sample a full brief from the style's weights.
export function sampleBrief(intent, seedKey, styleId, blend = null) {
  const style = blendStyles(styleId, blend?.style, blend?.amount || 0);
  const rng = new Rng(seedKey, GENERATOR_VERSION, 'brief');
  const target = descriptorTarget(intent, style);
  const persona = intent.persona || pickWeighted(rng, style.personas || { none: 1 }) || 'none';
  const P = PERSONAS[persona] || PERSONAS.none;
  const mode = chooseMode(style, target, intent, rng);
  const tonality = MINOR_MODES.has(mode) ? 'minor' : 'major';
  const meter = pickWeighted(rng, style.meter);
  const keyRoot = intent.key ? intent.key.root : rng.pick(KEY_POOLS[style.family] || KEY_POOLS.synth);

  const formId = intent.form === 'short' ? 'short' : intent.form === 'loop' ? 'loop' : pickWeighted(rng, style.forms);
  const moodWeight = (prog) => 1 + 1.5 * (prog.moods || []).reduce((s, m) => s + (intent.moods?.[m] || 0), 0);

  const byType = {};
  const choose = (type) => {
    if (byType[type]) return byType[type];
    const energy = clamp(SECTION_ENERGY[type] + target.energyBias * 0.7, 0.05, 1);
    const isMain = type === 'verse' || type === 'chorus';
    const sig = style.signature || {};
    // progression: tonality, mood affinity, different from verse/chorus
    const used = Object.values(byType).map((c) => c.progressionId);
    const bridgeLike = type === 'bridge' || type === 'breakdown' || type === 'pre';
    const progressionId = pickWeighted(rng, style.progressions,
      (id) => PROGRESSIONS[id] && PROGRESSIONS[id].tonality === tonality && !PROGRESSIONS[id].form
        && (bridgeLike || PROGRESSIONS[id].role !== 'bridge'),
      (id) => moodWeight(PROGRESSIONS[id]) * (used.includes(id) ? 0.15 : 1) * (bridgeLike && PROGRESSIONS[id].role === 'bridge' ? 2 : 1))
      || Object.keys(PROGRESSIONS).find((id) => PROGRESSIONS[id].tonality === tonality);
    const progression = PROGRESSIONS[progressionId].chords.map((s) => colourChord(s, target.sevenths, rng, style.palette.chords === 'power'));
    // groove and bass: the chorus must carry the signature
    const grooveOk = (id) => GROOVES[id]?.meter === meter;
    let groove = type === 'chorus' && sig.grooves
      ? pickWeighted(rng, style.grooves, (id) => grooveOk(id) && sig.grooves.includes(id), (id) => energyFit(GROOVES[id], energy))
      : null;
    groove = groove || pickWeighted(rng, style.grooves, grooveOk, (id) => energyFit(GROOVES[id], energy));
    const bassOk = (id) => BASS[id]?.meter === meter;
    const want = energy - target.legato * 0.15;
    let bass = isMain && sig.bass && (type === 'verse' || !byType.verse || !sig.bass.includes(byType.verse.bass))
      ? pickWeighted(rng, style.bass, (id) => bassOk(id) && sig.bass.includes(id), (id) => energyFit(BASS[id], want))
      : null;
    bass = bass || pickWeighted(rng, style.bass, bassOk, (id) => energyFit(BASS[id], want));
    const feel = pickWeighted(rng, style.feels, (f) => CELLS[meter][f]) || Object.keys(CELLS[meter])[0];
    const kind = KIND_OF[type];
    const texture = pickWeighted(rng, style.textures[kind] || style.textures.main, (id) => TEXTURES[id], (id) => {
      let w = P.textures[id] || 1;
      if (id === 'cold_start') w *= 1 + Math.max(0, target.energyBias) * 4;
      if (id === 'arp_swell' || id === 'drone_lead' || id === 'twin_lead') w *= 1 + Math.max(0, -target.energyBias) * 3;
      if (P.drums !== undefined && /D|M/.test(TEXTURES[id].stages.map((s) => s[1]).join(''))) w *= P.drums;
      return w;
    }) || (kind === 'main' ? 'full' : Object.keys(TEXTURES).find((id) => TEXTURES[id].kind === kind));
    const leadPool = sig.lead ? Object.fromEntries(sig.lead.map((l) => [l, 1])) : style.palette.lead;
    const lead = pickWeighted(rng, leadPool, (l) => LEADS[l], (l) => P.leads[l] || 1);
    byType[type] = { energy, progressionId, progression, groove, bass, feel, texture, lead };
    return byType[type];
  };

  const sections = [];
  const templ = FORMS[formId].sections;
  templ.forEach(([type, bars], i) => {
    const c = choose(type);
    const last = i === templ.length - 1;
    sections.push({
      type,
      bars,
      energy: Math.round(c.energy * 100) / 100,
      texture: c.texture,
      transition: last ? 'none' : pickWeighted(rng, style.transitions, (t) => TRANSITIONS[t]) || 'fill',
      groove: c.groove,
      bass: c.bass,
      feel: c.feel,
      lead: c.lead,
      chords: c.progression,
    });
  });
  // Keep songs under about 2:30: drop solos, pre-choruses, breakdowns,
  // bridges and repeated verses (never the first of a kind, never the last
  // chorus) until it fits. Slow tempos would otherwise run 3+ minutes.
  const barSeconds = (METERS[meter].unit === 8 ? METERS[meter].beats / 3 : METERS[meter].beats) * 60 / target.tempo;
  const seconds = () => sections.reduce((sum, x) => sum + x.bars, 0) * barSeconds;
  for (const type of ['solo', 'pre', 'breakdown', 'bridge', 'verse', 'chorus']) {
    while (seconds() > 150) {
      const firstIdx = sections.findIndex((x) => x.type === type);
      const lastChorus = sections.map((x) => x.type).lastIndexOf('chorus');
      const idx = sections.findIndex((x, i) => x.type === type && i !== firstIdx && i !== lastChorus);
      if (idx < 0) break;
      sections.splice(idx, 1);
      // a dropped verse takes its pre-chorus and chorus with it
      if (type === 'verse') {
        if (sections[idx]?.type === 'pre') sections.splice(idx, 1);
        const lc = sections.map((x) => x.type).lastIndexOf('chorus');
        if (sections[idx]?.type === 'chorus' && idx !== lc) sections.splice(idx, 1);
      }
    }
  }
  // A late key change up a whole step on the last chorus (pop, metal, synth).
  const choruses = sections.filter((s) => s.type === 'chorus');
  if (choruses.length >= 2 && rng.chance((style.keyChange || 0) + Math.max(0, target.energyBias) * 0.2)) choruses[choruses.length - 1].transpose = 2;

  const [tLo, tHi] = style.tempo;
  return {
    version: 1,
    source: 'rules',
    style: styleId,
    blend: blend || null,
    persona,
    moods: intent.moods || {},
    scene: intent.scene || null,
    energy: target.energyBias,
    target,
    tempo: Math.round(clamp(target.tempo, tLo * 0.85, tHi * 1.15)),
    meter,
    keyRoot,
    mode,
    palette: { bass: pickWeighted(rng, style.palette.bass) || 'bass', snare: pickWeighted(rng, style.palette.snare) || 'snare', chords: style.palette.chords },
    form: formId,
    sections,
    themes: {},
  };
}

// --- validation and repair ------------------------------------------------

function parseTheme(theme, steps) {
  // "5 _ 4 3 . 1 2 3 ..." one token per step: degree (1-14, -7..-1 for the
  // octave below), _ hold, . rest.
  if (!theme || typeof theme.notes !== 'string') return null;
  let tokens = theme.notes.trim().split(/\s+/).map((t) => t.replace(/[^0-9_.\-]/g, '')).filter(Boolean);
  if (!tokens.length) return null;
  if (tokens.length < steps) tokens = [...tokens, ...Array(steps - tokens.length).fill('_')];
  if (tokens.length > steps && tokens.length < steps * 2) tokens = tokens.slice(0, steps);
  const bars = [];
  for (let i = 0; i < tokens.length && bars.length < 2; i += steps) {
    const bar = tokens.slice(i, i + steps);
    if (bar.length < steps) break;
    if (bar[0] === '_') bar[0] = '.';
    bars.push(bar);
  }
  const ok = bars.length && bars.every((b) => b.some((t) => /^-?\d+$/.test(t)));
  return ok ? bars.map((b) => b.map((t) => {
    if (/^-?\d+$/.test(t)) return clamp(Number(t), -7, 14) || 1;
    return t === '_' ? '_' : '.';
  })) : null;
}

export function validateBrief(input) {
  const repairs = [];
  const errors = [];
  const b = structuredClone(input || {});
  if (!STYLES[b.style]) { errors.push(`unknown style ${b.style}`); b.style = 'synthwave'; }
  if (b.blend && (!STYLES[b.blend.style] || b.blend.style === b.style)) { repairs.push('dropped invalid blend'); b.blend = null; }
  if (b.blend) b.blend.amount = clamp(Number(b.blend.amount) || 0.3, 0.1, 0.5);
  const style = blendStyles(b.style, b.blend?.style, b.blend?.amount || 0);
  if (!METERS[b.meter] || !style.meter[b.meter]) {
    if (METERS[b.meter] && b.meter !== Object.keys(style.meter)[0]) repairs.push(`meter ${b.meter} kept although unusual for ${style.name}`);
    else { if (b.meter) repairs.push(`meter ${b.meter} -> ${Object.keys(style.meter)[0]}`); b.meter = Object.keys(style.meter)[0]; }
  }
  if (!METERS[b.meter]) b.meter = Object.keys(style.meter)[0];
  const [lo, hi] = style.tempo;
  const tempo = Number(b.tempo) || (lo + hi) / 2;
  b.tempo = Math.round(clamp(tempo, lo * 0.85, hi * 1.15));
  if (b.tempo !== Math.round(tempo)) repairs.push(`tempo ${tempo} -> ${b.tempo}`);
  b.keyRoot = ((Math.round(Number(b.keyRoot)) % 12) + 12) % 12 || 0;
  if (!SCALES[b.mode]) { repairs.push(`mode ${b.mode} -> aeolian`); b.mode = 'aeolian'; }
  b.persona = PERSONAS[b.persona] ? b.persona : 'none';
  b.palette = b.palette || {};
  if (!BASSES[b.palette.bass]) b.palette.bass = Object.keys(style.palette.bass)[0];
  if (!SNARES[b.palette.snare]) b.palette.snare = Object.keys(style.palette.snare)[0];
  if (b.palette.chords !== 'power' && b.palette.chords !== 'triad') b.palette.chords = style.palette.chords;
  b.moods = Object.fromEntries(Object.entries(b.moods || {}).filter(([m, w]) => MOODS[m] && w > 0));
  const steps = METERS[b.meter].steps;

  if (!Array.isArray(b.sections) || !b.sections.length) {
    errors.push('no sections');
    b.sections = FORMS.short.sections.map(([type, bars]) => ({ type, bars }));
  }
  let total = 0;
  b.sections = b.sections.slice(0, 16).filter((s) => {
    if (!SECTION_ENERGY[s.type]) { repairs.push(`dropped section type ${s.type}`); return false; }
    return true;
  });
  const firstOf = {};
  for (const s of b.sections) {
    const kind = KIND_OF[s.type];
    let bars = Math.round(Number(s.bars) || 8);
    bars = clamp(bars % 12 === 0 ? bars : bars <= 2 ? bars : Math.round(bars / 2) * 2, 1, 32);
    if (bars !== s.bars) repairs.push(`${s.type} bars ${s.bars} -> ${bars}`);
    s.bars = bars;
    total += bars;
    s.energy = clamp(Number(s.energy ?? SECTION_ENERGY[s.type]), 0.05, 1);
    const tk = TEXTURES[s.texture]?.kind;
    const fits = tk === kind || (kind !== 'main' && tk === 'main') || (s.type === 'pre' && tk === 'build');
    if (!fits) {
      const fallback = firstOf[s.type]?.texture || Object.keys(style.textures[kind] || style.textures.main)[0] || 'full';
      if (s.texture) repairs.push(`texture ${s.texture} -> ${fallback}`);
      s.texture = fallback;
    }
    if (!TRANSITIONS[s.transition]) s.transition = 'fill';
    if (GROOVES[s.groove]?.meter !== b.meter) {
      const fb = firstOf[s.type]?.groove || Object.keys(style.grooves).find((id) => GROOVES[id]?.meter === b.meter) || Object.keys(GROOVES).find((id) => GROOVES[id].meter === b.meter);
      if (s.groove) repairs.push(`groove ${s.groove} -> ${fb}`);
      s.groove = fb;
    }
    if (BASS[s.bass]?.meter !== b.meter) {
      const fb = firstOf[s.type]?.bass || Object.keys(style.bass).find((id) => BASS[id]?.meter === b.meter) || Object.keys(BASS).find((id) => BASS[id].meter === b.meter);
      if (s.bass) repairs.push(`bass ${s.bass} -> ${fb}`);
      s.bass = fb;
    }
    if (!CELLS[b.meter][s.feel]) s.feel = Object.keys(style.feels).find((f) => CELLS[b.meter][f]) || Object.keys(CELLS[b.meter])[0];
    if (!LEADS[s.lead]) s.lead = Object.keys(style.palette.lead)[0];
    const chords = Array.isArray(s.chords) ? s.chords.filter((c) => { try { parseRoman(String(c)); return true; } catch { return false; } }) : [];
    if (!chords.length) {
      s.chords = firstOf[s.type]?.chords || PROGRESSIONS[Object.keys(style.progressions).find((id) => PROGRESSIONS[id]?.tonality === (MINOR_MODES.has(b.mode) ? 'minor' : 'major'))].chords;
      repairs.push(`${s.type}: no valid chords, used a style default`);
    } else {
      if (chords.length !== s.chords.length) repairs.push(`${s.type}: dropped invalid chords`);
      s.chords = chords.slice(0, 16);
    }
    s.transpose = clamp(Math.round(Number(s.transpose) || 0), -5, 5);
    firstOf[s.type] = firstOf[s.type] || s;
  }
  if (total > 140) errors.push(`song too long (${total} bars)`);
  b.sections[b.sections.length - 1].transition = 'none';

  const themes = {};
  for (const [type, theme] of Object.entries(b.themes || {})) {
    const parsed = parseTheme(theme, steps);
    if (parsed) themes[type] = { notes: theme.notes, bars: parsed };
    else repairs.push(`theme for ${type} not usable`);
  }
  b.themes = themes;
  return { brief: b, repairs, errors };
}

// --- brief -> plan --------------------------------------------------------

export function planFromBrief(brief, seedKey) {
  const style = blendStyles(brief.style, brief.blend?.style, brief.blend?.amount || 0);
  const meter = METERS[brief.meter];
  const speed = framesPerBeat(brief.meter, brief.tempo);
  const target = brief.target || descriptorTarget({ moods: brief.moods, energy: brief.energy || 0, tempo: brief.tempo }, style);
  const counts = {};
  const sections = [];
  let bar = 0;
  for (const s of brief.sections) {
    counts[s.type] = (counts[s.type] || 0) + 1;
    const key = (brief.keyRoot + (s.transpose || 0) + 12) % 12;
    const chords = [];
    for (let i = 0; i < s.bars; i += 1) chords.push(chordAt(key, s.chords[i % s.chords.length]));
    const texture = TEXTURES[s.texture];
    sections.push({
      ...s,
      label: style.partNames?.[s.type] || LABELS[s.type],
      occurrence: counts[s.type],
      startBar: bar,
      keyRoot: key,
      chords,
      textureDef: texture,
      energy: texture.energy ? Math.max(s.energy, texture.energy) : s.energy,
      grooveDef: GROOVES[s.groove],
      bassDef: BASS[s.bass],
      leadInst: s.lead,
    });
    bar += s.bars;
  }
  for (const s of sections) s.lastOccurrence = s.occurrence === counts[s.type];
  if (sections.length) {
    const last = sections[sections.length - 1];
    if (last.type === 'outro') {
      const tonic = chordAt(last.keyRoot, MINOR_MODES.has(brief.mode) ? 'i' : 'I');
      last.chords[last.chords.length - 1] = tonic;
    }
  }
  return {
    version: GENERATOR_VERSION,
    seed: seedKey,
    styleId: brief.style,
    style,
    brief,
    meterId: brief.meter,
    meter,
    target,
    mode: brief.mode,
    tonality: MINOR_MODES.has(brief.mode) ? 'minor' : 'major',
    keyRoot: brief.keyRoot,
    speed,
    bpm: bpmFor(brief.meter, speed),
    palette: brief.palette,
    persona: brief.persona,
    themes: brief.themes || {},
    sections,
    totalBars: bar,
  };
}
