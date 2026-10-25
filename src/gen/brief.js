// The song brief: every musical choice of a song in
// one plain object. The rule-based path samples it from style weights; the
// LLM path writes it. validateBrief repairs either, planFromBrief turns it
// into the plan the renderer reads.

import { VARIATIONS } from './melody.js';
import { Rng } from './prng.js';
import { MOODS } from './moods.js';
import { STYLES, blendStyles } from './styles.js';
import { MODE_BRIGHTNESS, MINOR_MODES, SCALES, chordAt, parseRoman, chordNameToRoman } from './theory.js';
import { METERS, framesPerBeat, bpmFor } from './library/meters.js';
import { GROOVES } from './library/grooves.js';
import { BASS } from './library/bass.js';
import { CELLS } from './library/cells.js';
import { PROGRESSIONS } from './library/progressions.js';
import { TEXTURES, KIND_OF, TRANSITIONS, FILTER_SHAPES } from './library/textures.js';
import { FORMS, SECTION_ENERGY } from './library/forms.js';
import { LEADS, BASSES, SNARES, CUSTOM_LEAD } from './library/palettes.js';
import { styleHint, nudgeModes, loopToRomans } from './hvsc-data.js';
import { ARTISTS } from './library/hvsc.js';

export const GENERATOR_VERSION = 'compose-0.2.0';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const LABELS = { intro: 'Intro', verse: 'Verse', pre: 'Pre-Chorus', chorus: 'Chorus', bridge: 'Bridge', solo: 'Solo', breakdown: 'Breakdown', build: 'Build-up', outro: 'Outro' };

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
  blues: [4, 9, 7, 2, 0], jazz: [5, 10, 3, 0, 7], latin: [2, 9, 4, 7], dance: [9, 4, 0, 5, 7], funk: [4, 9, 2, 7],
  reggae: [7, 2, 9, 0], classical: [0, 7, 2, 5, 9], cinematic: [2, 9, 4, 0, 5], ambient: [2, 7, 9, 4], hiphop: [5, 9, 2, 7],
  rock: [4, 9, 2, 7, 0], pop: [0, 7, 2, 9, 5],
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
  const base = blendStyles(styleId, blend?.style, blend?.amount || 0);
  // HVSC inventory: how C64 musicians arranged this genre (and, if named,
  // this artist) nudges modes, harmonic rhythm and textures
  const hint = styleHint(styleId);
  const artist = intent.artist ? ARTISTS[intent.artist] : null;
  const style = { ...base, modes: nudgeModes(base.modes, artist ? artist.minorShare : hint?.minorShare, artist ? 0.8 : 0.5) };
  if (style.slowHarmony === undefined && (artist?.slowHarmony ?? hint?.slowHarmony) != null) style.slowHarmony = artist?.slowHarmony ?? hint.slowHarmony;
  const drumsShare = artist?.drums ?? hint?.drums;
  if (drumsShare != null && drumsShare < 0.3) {
    style.textures = { ...style.textures, main: { ...style.textures.main, no_drums: (style.textures.main.no_drums || 0.5) * 2, counter_nodrums: (style.textures.main.counter_nodrums || 0.3) * 2 } };
  }
  const rng = new Rng(seedKey, GENERATOR_VERSION, 'brief');
  const target = descriptorTarget(intent, style);
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
      (id) => PROGRESSIONS[id] && PROGRESSIONS[id].tonality === tonality && (!PROGRESSIONS[id].form || PROGRESSIONS[id].form === formId)
        && (bridgeLike || PROGRESSIONS[id].role !== 'bridge'),
      (id) => moodWeight(PROGRESSIONS[id]) * (used.includes(id) && !PROGRESSIONS[id].form ? 0.15 : 1)
        * (bridgeLike && PROGRESSIONS[id].role === 'bridge' ? 2 : 1) * (PROGRESSIONS[id].form === formId ? 20 : 1))
      || Object.keys(PROGRESSIONS).find((id) => PROGRESSIONS[id].tonality === tonality);
    const progression = PROGRESSIONS[progressionId].chords.map((s) => colourChord(s, target.sevenths, rng, style.palette.chords === 'power'));
    // groove and bass: the chorus must carry the signature; common SID
    // idioms derived from HVSC join every 4/4 style's pool with a small weight
    const grooveOk = (id) => GROOVES[id]?.meter === meter;
    const sidGrooves = meter === '4/4' ? { sid_drive: 0.5, sid_kss: 0.35 } : {};
    const sidBass = meter === '4/4' ? { offbeat_stab: 0.4, eighth_legato: 0.4, quarter_stab: 0.3, octave_legato: 0.3, syncopated_push: 0.3, offbeat_quarters: 0.2, octave_gallop: 0.2, pickup_whole: 0.2 } : {};
    const groovePool = { ...sidGrooves, ...style.grooves };
    const bassPool = { ...sidBass, ...style.bass };
    let groove = type === 'chorus' && sig.grooves
      ? pickWeighted(rng, style.grooves, (id) => grooveOk(id) && sig.grooves.includes(id), (id) => energyFit(GROOVES[id], energy))
      : null;
    groove = groove || pickWeighted(rng, groovePool, grooveOk, (id) => energyFit(GROOVES[id], energy));
    const bassOk = (id) => BASS[id]?.meter === meter;
    const want = energy - target.legato * 0.15;
    let bass = isMain && sig.bass && (type === 'verse' || !byType.verse || !sig.bass.includes(byType.verse.bass))
      ? pickWeighted(rng, style.bass, (id) => bassOk(id) && sig.bass.includes(id), (id) => energyFit(BASS[id], want))
      : null;
    bass = bass || pickWeighted(rng, bassPool, bassOk, (id) => energyFit(BASS[id], want));
    const feel = pickWeighted(rng, { sid: 0.8, ...style.feels }, (f) => CELLS[meter][f]) || Object.keys(CELLS[meter])[0];
    const kind = KIND_OF[type];
    // every style may use the counter-melody and build-up textures a little
    const pool = kind === 'main'
      ? { counter: 0.7, counter_nodrums: 0.25, build_up_band: 0.4, ...style.textures.main }
      : kind === 'breakdown' ? { duet: 0.6, ...(style.textures.breakdown || {}) } : (style.textures[kind] || style.textures.main);
    let texture = pickWeighted(rng, pool, (id) => TEXTURES[id], (id) => {
      let w = 1;
      if (id === 'cold_start') w *= 1 + Math.max(0, target.energyBias) * 4;
      if (id === 'arp_swell' || id === 'drone_lead' || id === 'twin_lead') w *= 1 + Math.max(0, -target.energyBias) * 3;
      return w;
    }) || (kind === 'main' ? 'full' : Object.keys(TEXTURES).find((id) => TEXTURES[id].kind === kind));
    // the chorus carries the hook: it must have a lead
    if (type === 'chorus' && !TEXTURES[texture].stages.some(([, r]) => r.includes('L'))) {
      texture = pickWeighted(rng, style.textures.main, (id) => TEXTURES[id]?.stages.some(([, r]) => r.includes('L'))) || 'full';
    }
    const leadPool = sig.lead ? Object.fromEntries(sig.lead.map((l) => [l, 1])) : style.palette.lead;
    const lead = pickWeighted(rng, leadPool, (l) => LEADS[l]);
    // two bars per chord now and then (slower harmonic rhythm, typical in SID
    // music); the progression then spans eight bars
    const chordBars = !bridgeLike && type !== 'intro' && type !== 'outro' && rng.chance(style.slowHarmony ?? 0.3) ? 2 : 1;
    byType[type] = { energy, progressionId, progression, groove, bass, feel, texture, lead, chordBars };
    return byType[type];
  };

  const sections = [];
  let templ = FORMS[formId].sections;
  // real SID songs mostly start straight away (59 % with all voices in bar 1,
  //: drop the intro now and then, or shorten it
  if (templ[0]?.[0] === 'intro' && intent.form !== 'loop') {
    const r = rng.next();
    if (r < 0.3) templ = templ.slice(1);
    else if (r < 0.65 && templ[0][1] > 2) templ = [['intro', 2], ...templ.slice(1)];
  }
  const seen = {};
  // energy and filter movement inside a section (research: verse stable,
  // pre-chorus and builds rise, choruses plateau, outros fall away)
  const RAMP = { intro: 0.15, verse: 0.05, pre: 0.25, chorus: 0.04, bridge: 0.08, solo: 0.06, breakdown: 0, build: 0.3, outro: -0.2 };
  const leadTextures = Object.keys(style.textures.main || {}).filter((id) => TEXTURES[id]?.stages.some(([, r]) => r.includes('L')));
  templ.forEach(([type, bars], i) => {
    const c = choose(type);
    const last = i === templ.length - 1;
    seen[type] = (seen[type] || 0) + 1;
    let texture = c.texture;
    // later choruses may change colour (not every chorus is "full band")
    if (type === 'chorus' && seen[type] >= 2 && rng.chance(0.35)) {
      texture = rng.pick([...leadTextures, 'counter'].filter((id) => id !== c.texture)) || texture;
    }
    const lastChorus = type === 'chorus' && templ.slice(i + 1).every(([t]) => t !== 'chorus');
    const energyEnd = Math.max(0.05, Math.min(1, c.energy + (RAMP[type] || 0) + (lastChorus ? 0.06 : 0)));
    const filter = type === 'outro' ? 'close' : type === 'build' || type === 'intro' ? 'open'
      : type === 'breakdown' && ['dance', 'synth'].includes(style.family) && rng.chance(0.4) ? 'wobble' : 'follow';
    sections.push({
      type,
      bars,
      energy: Math.round(c.energy * 100) / 100,
      energyEnd: Math.round(energyEnd * 100) / 100,
      filter,
      texture,
      transition: last ? 'none' : pickWeighted(rng, style.transitions, (t) => TRANSITIONS[t]) || 'fill',
      groove: c.groove,
      bass: c.bass,
      feel: c.feel,
      lead: c.lead,
      chords: c.progression,
      chordBars: c.chordBars,
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
      // the first verse and the last chorus always stay
      const keepFirst = type === 'verse' || type === 'chorus';
      const idx = sections.findIndex((x, i) => x.type === type && (!keepFirst || i !== firstIdx) && i !== lastChorus);
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
  // An artist fingerprint gives verse and chorus its measured drum row,
  // bass figure and bass-root loop
  if (artist && meter === '4/4') {
    const drum = artist.drumRows.length ? rng.pick(artist.drumRows.slice(0, 3)) : null;
    const bassRow = artist.bassRows.length ? rng.pick(artist.bassRows.slice(0, 3)) : null;
    const loop = artist.loops.length ? loopToRomans(rng.pick(artist.loops.slice(0, 2)), mode) : null;
    for (const s of sections) {
      if (s.type !== 'verse' && s.type !== 'chorus') continue;
      if (drum && /[ks]/.test(drum)) s.drumPattern = drum;
      if (bassRow) s.bassPattern = bassRow.replace(/[42]/g, 'A');
      if (loop && loop.length >= 2 && (s.type === 'verse' || !artist.loops[1])) s.chords = loop;
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
    artist: intent.artist || null,
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
  // octave below, optional # or b for a chromatic step), _ hold, . rest.
  if (!theme || typeof theme.notes !== 'string') return null;
  const DEG = /^-?\d+[#b]?$/;
  let tokens = theme.notes.trim().split(/\s+/).map((t) => (DEG.test(t) || t === '_' || t === '.' ? t : t.replace(/[^0-9_.\-#b]/g, ''))).filter(Boolean);
  if (!tokens.length) return null;
  if (tokens.length < steps) tokens = [...tokens, ...Array(steps - tokens.length).fill('_')];
  // round to whole bars: pad a nearly full bar, drop a stub
  const rem = tokens.length % steps;
  if (rem && rem >= steps - 3) tokens = [...tokens, ...Array(steps - rem).fill('_')];
  else if (rem && tokens.length > steps) tokens = tokens.slice(0, tokens.length - rem);
  const bars = [];
  for (let i = 0; i < tokens.length && bars.length < 4; i += steps) {
    const bar = tokens.slice(i, i + steps);
    if (bar.length < steps) break;
    if (bar[0] === '_') bar[0] = '.';
    bars.push(bar);
  }
  const ok = bars.length && bars.every((b) => b.some((t) => DEG.test(t)));
  return ok ? bars.map((b) => b.map((t) => {
    if (!DEG.test(t)) return t === '_' ? '_' : '.';
    const alt = t.endsWith('#') ? '#' : t.endsWith('b') ? 'b' : '';
    const d = Math.max(-7, Math.min(14, parseInt(t, 10))) || 1;
    return alt ? `${d}${alt}` : d;
  })) : null;
}

// Patterns written in the brief (LLM path): one character per step, one or
// two bars. Close misses are padded or cut, others dropped.
function cleanPattern(raw, steps, alphabet, mustHave) {
  if (typeof raw !== 'string') return null;
  let p = raw.replace(/[\s|]/g, '');
  if (!p) return null;
  if ([...p].some((c) => !alphabet.includes(c))) return null;
  for (const n of [steps, steps * 2]) {
    if (Math.abs(p.length - n) <= 2) {
      p = p.length < n ? p + '.'.repeat(n - p.length) : p.slice(0, n);
      const bars = p.length === steps ? [p] : [p.slice(0, steps), p.slice(steps)];
      if (!bars.every((b) => [...b].some((c) => mustHave.includes(c)))) return null;
      return bars.map((b) => (b[0] === '_' ? `.${b.slice(1)}` : b));
    }
  }
  return null;
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
  // names from older briefs
  delete b.persona;
  for (const sec of b.sections || []) {
    if (sec.texture === 'hubbard') sec.texture = 'multiplex';
    if (sec.lead === 'hubbard') sec.lead = 'octave';
  }
  b.palette = b.palette || {};
  if (!BASSES[b.palette.bass]) b.palette.bass = Object.keys(style.palette.bass)[0];
  if (!SNARES[b.palette.snare]) b.palette.snare = Object.keys(style.palette.snare)[0];
  if (b.palette.chords !== 'power' && b.palette.chords !== 'triad') b.palette.chords = style.palette.chords;
  b.moods = Object.fromEntries(Object.entries(b.moods || {}).filter(([m, w]) => MOODS[m] && w > 0));
  if (!b.sound || !['pulse', 'saw', 'triangle'].includes(b.sound.wave)) b.sound = null;
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
    // any known texture may serve any section (a twin-lead bridge, a
    // bass-alone verse); only unknown ids are replaced
    if (!TEXTURES[s.texture]) {
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
    if (!LEADS[s.lead] && !(s.lead === CUSTOM_LEAD && b.sound)) s.lead = Object.keys(style.palette.lead)[0];
    s.energyEnd = clamp(Number(s.energyEnd ?? s.energy), 0.05, 1);
    if (!FILTER_SHAPES[s.filter]) s.filter = 'follow';
    if (!VARIATIONS[s.variation] || s.variation === 'auto') delete s.variation;
    for (const [field, alphabet, must] of [['drumPattern', 'kshocTtx.', 'kst'], ['bassPattern', 'R583b6A_.', 'R'], ['arpPattern', 'x_.', 'x']]) {
      if (s[field] === undefined || s[field] === null || s[field] === '') { delete s[field]; continue; }
      const bars = Array.isArray(s[field]) ? s[field] : cleanPattern(s[field], steps, alphabet, must);
      if (bars && bars.every((r) => typeof r === 'string' && r.length === steps)) s[field] = bars;
      else { repairs.push(`${s.type}: ${field} not usable, library entry used`); delete s[field]; }
    }
    // roman numerals, or chord names converted against the key
    const chords = (Array.isArray(s.chords) ? s.chords : []).map((c) => {
      try { parseRoman(String(c)); return String(c); } catch { /* not roman */ }
      const r = chordNameToRoman(c, b.keyRoot);
      if (r) { repairs.push(`${s.type}: chord ${c} -> ${r}`); return r; }
      return null;
    }).filter(Boolean);
    if (!chords.length) {
      s.chords = firstOf[s.type]?.chords || PROGRESSIONS[Object.keys(style.progressions).find((id) => PROGRESSIONS[id]?.tonality === (MINOR_MODES.has(b.mode) ? 'minor' : 'major'))].chords;
      repairs.push(`${s.type}: no valid chords, used a style default`);
    } else {
      if (chords.length !== s.chords.length) repairs.push(`${s.type}: dropped invalid chords`);
      s.chords = chords.slice(0, 16);
    }
    s.transpose = clamp(Math.round(Number(s.transpose) || 0), -5, 5);
    s.chordBars = Number(s.chordBars) === 2 ? 2 : 1;
    firstOf[s.type] = firstOf[s.type] || s;
  }
  if (total > 140) errors.push(`song too long (${total} bars)`);
  b.sections[b.sections.length - 1].transition = 'none';

  const themes = {};
  for (const [type, theme] of Object.entries(b.themes || {})) {
    const parsed = parseTheme(theme, steps);
    if (parsed) themes[type] = { notes: theme.notes, bars: parsed, ...(theme.user ? { user: true } : {}) };
    else repairs.push(`theme for ${type} not usable`);
  }
  b.themes = themes;
  return { brief: b, repairs, errors };
}

// --- brief -> plan --------------------------------------------------------

// A drum pattern from the brief becomes a groove: the written rows are the
// main levels; the calm level keeps only kick, snare and toms, the busiest
// adds hats on free 8ths.
function customGroove(rows, base) {
  const calm = (r) => [...r].map((c) => ('kstTx'.includes(c) ? c : '.')).join('');
  const busy = (r) => [...r].map((c, i) => (c === '.' && i % 2 === 0 ? 'h' : c)).join('');
  return {
    name: 'eigenes Drum-Muster',
    meter: base?.meter,
    tags: base?.tags || [],
    custom: true,
    rows,
    levels: [calm(rows[0]), rows[0], rows[0], busy(rows[0])],
  };
}

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
    // harmonic rhythm: a chord may last two bars (common in SID music:
    // i-i-bVI-bVI loops in
    const per = s.chordBars === 2 ? 2 : 1;
    for (let i = 0; i < s.bars; i += 1) chords.push(chordAt(key, s.chords[Math.floor(i / per) % s.chords.length]));
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
      grooveDef: s.drumPattern ? customGroove(s.drumPattern, GROOVES[s.groove]) : GROOVES[s.groove],
      bassDef: s.bassPattern ? { name: 'eigene Bass-Figur', row: s.bassPattern[0], rows: s.bassPattern, custom: true } : BASS[s.bass],
      arpRows: s.arpPattern || null,
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
    sound: brief.sound || null,
    themes: brief.themes || {},
    sections,
    totalBars: bar,
  };
}
