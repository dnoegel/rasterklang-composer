// Motif-based melody,
// "Melodies need motifs"). A section's melody is built from a few one-bar
// motifs (rhythm cell + scale-step contour), arranged by a phrase template
// (period, sentence, riff, sequence, bar form). Templates develop their
// motifs instead of repeating them: sequence, inversion,
// fragmentation, ornamentation, augmentation and diminution. Strong beats
// snap to chord tones, the section follows an arch, phrases end on cadence
// notes, choruses sit higher. Repeated sections reuse their motifs so hooks
// come back recognisably, each repeat with its own variation, the head of
// every phrase unchanged (lessons from an earlier experiment: exact repeats sound
// static, unrelated phrases sound like a medley).

import { SCALES, nearestIndex, noteName } from './theory.js';
import { Rng } from './prng.js';
import { CELLS, CELL_VARIANTS } from './library/cells.js';
import { SECTION_ENERGY } from './library/forms.js';

const LEAD_RANGE = { metal: [52, 79], synth: [57, 81], game: [60, 84], folk: [62, 86], classical: [62, 86], ambient: [60, 86], jazz: [57, 81], blues: [55, 79], rock: [55, 81], pop: [60, 84], hiphop: [57, 81] };
const STEP_SHARE = { folk: 0.62, metal: 0.55, synth: 0.5, game: 0.5, jazz: 0.55, classical: 0.6, ambient: 0.5, blues: 0.5 };

// Labels: motif name, then operators ("a:frag:seq" = a, fragmented, then
// sequenced). hc and pac are cadence bars.
const TEMPLATES = {
  8: {
    // antecedent and consequent; the consequent starts like the antecedent
    period: ['a', 'b', 'a:orn', 'hc', 'a', 'b', 'a2', 'pac'],
    // basic idea, sequenced repetition, fragmentation, cadence (Caplin)
    sentence: ['a', 'b', 'a:seq', 'b:seq', 'a:frag', 'a:frag:seq', 'c', 'pac'],
    // riffs repeat by nature, but not four times unchanged
    riff: ['a', 'a', 'a:orn', 'a2', 'a', 'a:seq', 'b', 'pac'],
    // call and response
    qa: ['a', 'b', 'a:seq', 'b2', 'a', 'b:orn', 'c', 'pac'],
    // Fortspinnung: an idea spun out in a sequence, then an epilogue
    spin: ['a', 'a:seq', 'a:seq:seq', 'hc', 'b', 'b:frag', 'c', 'pac'],
    // bar form AAB: two Stollen, an Abgesang that develops c
    bar: ['a', 'b', 'a', 'b2', 'c', 'c:seq', 'c:frag', 'pac'],
  },
  4: {
    period: ['a', 'b', 'a2', 'pac'],
    riff: ['a', 'a', 'a2', 'pac'],
    sentence: ['a', 'a:seq', 'a:frag', 'pac'],
    spin: ['a', 'a:seq', 'b', 'pac'],
  },
  2: { period: ['a', 'pac'], echo: ['a', 'a:frag'] },
};

// Variations of a repeated section (brief field `variation`).
export const VARIATIONS = {
  auto: 'chosen by code: ornaments on the 2nd time, sequences later, an octave up on the last of 3+',
  exact: 'the same melody again',
  ornament: 'passing and neighbour notes fill long notes',
  sequence: 'the second half of the section moves a step up or down',
  fragment: 'the second half breaks the motifs into their first halves',
  invert: 'the answering motifs turn upside down',
  octave: 'the whole melody an octave higher',
  answer: 'a new answer phrase before the cadence',
};

// Arch contour: anchor offsets in scale steps per bar position (8 bars).
const ARCH = [0, 1, 2, 1, 2, 4, 3, 0];

// Scale for one bar: the mode, with chord tones forced in (a scale note a
// semitone away from a chord tone gives way to it), so passing tones never
// clash with the harmony (dorian over iv, harmonic minor over bVII).
function barScale(keyRoot, mode, chord) {
  const pcs = SCALES[mode].map((s) => (keyRoot + s) % 12);
  const out = new Set(pcs);
  for (const t of chord.tones) {
    if (out.has(t)) continue;
    out.delete((t + 1) % 12);
    out.delete((t + 11) % 12);
    out.add(t);
  }
  return out;
}

function poolFor(lo, hi, pcs) {
  const pool = [];
  for (let n = lo; n <= hi; n += 1) if (pcs.has(n % 12)) pool.push(n);
  return pool;
}

function onsetsOf(cell) {
  const out = [];
  for (let i = 0; i < cell.length; i += 1) if (cell[i] === 'x') out.push(i);
  return out;
}

// Contour of n notes in scale steps: mostly steps, some repeats and skips,
// reversal after a leap, gentle pull back toward 0.
function makeSteps(n, rng, stepShare) {
  const out = [0];
  let pos = 0;
  let dir = rng.chance(0.5) ? 1 : -1;
  let lastLeap = false;
  for (let i = 1; i < n; i += 1) {
    const r = rng.next();
    let size;
    if (r < 0.18) size = 0;
    else if (r < 0.18 + stepShare) size = 1;
    else if (r < 0.18 + stepShare + 0.2) size = 2;
    else size = rng.pick([3, 4]);
    if (lastLeap) dir = -dir; // post-skip reversal
    else if (rng.chance(0.3)) dir = -dir;
    if (Math.abs(pos) > 4) dir = pos > 0 ? -1 : 1;
    pos += dir * size;
    lastLeap = size >= 3;
    out.push(pos);
  }
  return out;
}

function cadenceCell(cell, steps) {
  // Keep the first half of the cell, then one long note to the bar end.
  const half = Math.floor(steps / 2);
  let out = cell.slice(0, half).replace(/x(?=[^x]*$)/, 'x');
  out += 'x' + '_'.repeat(steps - half - 1);
  return out;
}

// pool: [cell, weight]; derived cell variants weigh less than the library's.
// The density window widens with the pool, so bigger pools are used.
function pickCell(pool, density, rng, exclude) {
  const sorted = [...pool].sort((a, b) => onsetsOf(a[0]).length - onsetsOf(b[0]).length);
  const center = density * (sorted.length - 1);
  const sigma = Math.max(1.1, sorted.length / 6);
  const weights = sorted.map(([c, w], i) => [c, (c === exclude ? 0.05 : 1) * w * Math.exp(-((i - center) ** 2) / (2 * sigma * sigma))]);
  return rng.weighted(weights);
}

// --- motif development ------------------------------------------------------
// A motif: { cell, steps (scale-step offset per onset), alts?, abs?, user? }.
// abs motifs (themes from the brief) count from the tonic, others from the
// section's base and arch. A user's own melody is never changed.

const withNotes = (m, cell, steps, alts) => ({ ...m, cell, steps, alts: m.alts ? alts : undefined });

function seqOp(m, set) {
  return { ...m, steps: m.steps.map((x) => x + set.seqStep), alts: m.alts?.map(() => 0) };
}

function invOp(m) {
  const s0 = m.steps[0] ?? 0;
  return { ...m, steps: m.steps.map((x) => s0 - (x - s0)), alts: m.alts?.map(() => 0) };
}

// Ornament: a long note gives an eighth to a passing note (toward the next
// note) or a neighbour note; without long notes, one weak inner note moves.
function ornOp(m, rng) {
  const cell = [...m.cell];
  const on = onsetsOf(m.cell);
  const steps = [...m.steps];
  const alts = m.alts ? [...m.alts] : null;
  const longs = [];
  on.forEach((pos, k) => {
    const end = k + 1 < on.length ? on[k + 1] : cell.length;
    if (end - pos >= 4 && cell[pos + 1] === '_' && cell[pos + 2] === '_') longs.push(k);
  });
  if (longs.length) {
    const picks = [rng.pick(longs)];
    if (longs.length > 2) picks.push(rng.pick(longs.filter((k) => k !== picks[0])));
    picks.sort((x, y) => y - x);
    for (const k of picks) {
      const pos = on[k];
      const cur = steps[k];
      const next = steps[k + 1];
      const add = next !== undefined && Math.abs(next - cur) === 2 ? cur + Math.sign(next - cur)
        : cur + (rng.chance(0.5) ? 1 : -1);
      cell[pos + 2] = 'x';
      steps.splice(k + 1, 0, add);
      if (alts) alts.splice(k + 1, 0, 0);
    }
    return withNotes(m, cell.join(''), steps, alts);
  }
  const inner = on.map((pos, k) => k).filter((k) => k > 0 && k < on.length - 1 && on[k] % 4 !== 0);
  const k = inner.length ? rng.pick(inner) : on.length - 1;
  if (k > 0) {
    steps[k] += rng.chance(0.5) ? 1 : -1;
    if (alts) alts[k] = 0;
  } else return seqOp(m, { seqStep: 1 });
  return withNotes(m, m.cell, steps, alts);
}

// Fragmentation: the first half of the motif twice, the copy sequenced.
function fragOp(m, set) {
  const half = Math.floor(m.cell.length / 2);
  const h = onsetsOf(m.cell.slice(0, half)).length;
  if (h === 0 || h === m.steps.length) return seqOp(m, set);
  const second = m.cell.slice(0, half).replace(/^_/, '.');
  const steps = [...m.steps.slice(0, h), ...m.steps.slice(0, h).map((x) => x + set.seqStep)];
  const alts = m.alts ? [...m.alts.slice(0, h), ...m.alts.slice(0, h).map(() => 0)] : null;
  return withNotes(m, m.cell.slice(0, half) + second, steps, alts);
}

// Augmentation: the first half stretched over the whole bar.
function augOp(m, set, rng) {
  const half = Math.floor(m.cell.length / 2);
  const h = onsetsOf(m.cell.slice(0, half)).length;
  if (h < 2) return ornOp(m, rng);
  const cell = [...m.cell.slice(0, half)].map((c) => (c === 'x' ? 'x_' : c + c)).join('');
  return withNotes(m, cell, m.steps.slice(0, h), m.alts?.slice(0, h));
}

// Diminution: the motif in half the time, twice, the copy sequenced.
function dimOp(m, set, rng) {
  const on = onsetsOf(m.cell);
  if (on.length > 5 || on.some((p) => p % 2)) return fragOp(m, set);
  const half = [...m.cell].filter((c, i) => i % 2 === 0).join('');
  const second = half.replace(/^_/, '.');
  const steps = [...m.steps, ...m.steps.map((x) => x + set.seqStep)];
  const alts = m.alts ? [...m.alts, ...m.alts.map(() => 0)] : null;
  return withNotes(m, half + second, steps, alts);
}

const OPS = { seq: seqOp, inv: invOp, orn: (m, set, rng) => ornOp(m, rng), frag: fragOp, aug: augOp, dim: dimOp };

// Resolve "b:orn:seq" against the set; derived motifs are cached in the set,
// so a label sounds the same wherever it comes back.
function motifFor(set, label, rng) {
  if (set.cache[label]) return set.cache[label];
  const [base, ...ops] = label.split(':');
  let m = set[base] || set.a;
  if (!m.user) for (const op of ops) m = OPS[op] ? OPS[op](m, set, rng) : m;
  set.cache[label] = m;
  return m;
}

const isCadence = (label) => label === 'hc' || label === 'pac';
const addOp = (label, op) => (isCadence(label) ? label : `${label}:${op}`);

// Label of bar b: the template, a developed second pass in long sections,
// then the variation of this occurrence. The first bar of every 4-bar
// phrase (the head of the hook) and the cadences stay as they are.
function labelAt(set, section, b, variation) {
  const tpl = set.template;
  let label = tpl[b % tpl.length];
  const head = b % 4 === 0;
  if (b >= tpl.length && !head && !set.user) label = addOp(label, set.passOp);
  if (head || set.user) {
    if (variation === 'answer' && b === section.bars - 2 && !set.user) return 'c';
    return label;
  }
  const late = b >= section.bars / 2;
  switch (variation) {
    case 'ornament': return /^(b|c|a2|a3)/.test(label) ? addOp(label, 'orn') : label;
    case 'sequence': return late ? addOp(label, 'seq') : label;
    case 'fragment': return late ? addOp(label, 'frag') : label;
    case 'invert': return label.startsWith('b') || label.startsWith('c') ? addOp(label, 'inv') : label;
    case 'answer': return b === section.bars - 2 ? 'c' : label;
    default: return label;
  }
}

// The variation of this occurrence: the brief's choice, or by code.
function variationOf(section, set, rng) {
  const asked = section.variation;
  if (section.occurrence <= 1) return 'exact';
  if (asked && asked !== 'auto' && VARIATIONS[asked]) return asked;
  if (section.occurrence >= 3 && section.lastOccurrence) return 'octave';
  if (section.occurrence === 2) return set.secondVariation;
  return rng.pick(['sequence', 'fragment', 'invert']);
}

const isNote = (t) => typeof t === 'number' || /^-?\d+[#b]$/.test(t);
function themeMotif(bar, user = false) {
  const cell = bar.map((t) => (isNote(t) ? 'x' : t === '_' ? '_' : '.')).join('');
  const notes = bar.filter(isNote);
  const offset = (d) => (d > 0 ? d - 1 : -d - 1 - 7);
  return {
    cell,
    // scale steps from the tonic (degree 1 = 0, -1 = an octave below)
    steps: notes.map((t) => offset(typeof t === 'number' ? t : parseInt(t, 10))),
    alts: notes.map((t) => (typeof t === 'number' ? 0 : t.endsWith('#') ? 1 : -1)),
    abs: true,
    user,
  };
}

// Build (or reuse) the motif set for one kind of material (a section type).
// An intro that previews the verse uses the verse's set, so the riff it
// plays is the riff the verse will play.
function motifSet(material, section, plan, rng, memory) {
  if (memory[material]) return memory[material];
  const { style, target } = plan;
  const steps = plan.meter.steps;
  const energy = material === section.type ? section.energy : Math.min(1, (SECTION_ENERGY[material] || 0.6) + target.energyBias * 0.7);
  const density = Math.max(0, Math.min(1, energy * 0.9 + (material === 'solo' ? 0.3 : 0) - target.legato * 0.15 - (material === 'chorus' ? 0.15 : 0)));
  const feel = CELLS[plan.meterId][section.feel] ? section.feel : Object.keys(CELLS[plan.meterId])[0];
  const cellsOf = (f) => [...(CELLS[plan.meterId][f] || []).map((c) => [c, 1]), ...(CELL_VARIANTS[plan.meterId][f] || []).map((c) => [c, 0.5])];
  const pool = material === 'solo' ? [...cellsOf(feel), ...(feel === 'running' ? [] : cellsOf('running'))] : cellsOf(feel);
  const cellA = pickCell(pool, density, rng);
  const cellB = pickCell(pool, density, rng, cellA);
  const cellC = pickCell(pool, Math.min(1, density + 0.15), rng, cellA);
  const templates = TEMPLATES[section.bars >= 8 ? 8 : section.bars >= 4 ? 4 : 2];
  const names = Object.keys(templates);
  let tplName = rng.pick(names);
  if (style.family === 'metal' && material === 'verse' && templates.riff) tplName = rng.chance(0.6) ? 'riff' : tplName;
  const share = style.stepShare || STEP_SHARE[style.family] || 0.55;
  const motif = (cell) => ({ cell, steps: makeSteps(onsetsOf(cell).length, rng, share) });
  const a = motif(cellA);
  const set = {
    template: templates[tplName] || TEMPLATES[8].period,
    templateName: tplName,
    a,
    a2: { cell: cellA, steps: [...a.steps.slice(0, -2), ...makeSteps(3, rng, share).slice(1).map((x) => x + a.steps[Math.max(0, a.steps.length - 3)])].slice(0, a.steps.length) },
    b: motif(cellB),
    c: motif(cellC),
    hc: { cell: cadenceCell(cellA, steps), steps: makeSteps(onsetsOf(cadenceCell(cellA, steps)).length, rng, share) },
    pac: { cell: cadenceCell(cellB, steps), steps: makeSteps(onsetsOf(cadenceCell(cellB, steps)).length, rng, share) },
    archScale: rng.float(0.7, 1.2),
    lift: material === 'chorus' || material === 'solo' ? 3 : 0,
    // sequences move by a step or a third, the same way all section long
    seqStep: rng.pick([1, -1, 1, 2, -2]),
    // how a long section's second pass develops, how the 2nd time varies
    passOp: rng.pick(['orn', 'seq', 'orn', 'inv']),
    secondVariation: rng.pick(['ornament', 'ornament', 'sequence', 'answer', 'invert']),
    cache: {},
  };
  set.b2 = { cell: set.b.cell, steps: set.b.steps.map((x, i) => (i === set.b.steps.length - 1 ? x - 1 : x)) };
  // A theme from the brief replaces the generated main motif.
  const theme = plan.themes?.[material];
  if (theme) {
    const u = Boolean(theme.user);
    set.a = themeMotif(theme.bars[0], u);
    set.a2 = theme.bars[1] ? themeMotif(theme.bars[1], u) : set.a;
    set.a3 = theme.bars[2] ? themeMotif(theme.bars[2], u) : null;
    set.a4 = theme.bars[3] ? themeMotif(theme.bars[3], u) : null;
    set.themed = true;
    set.user = u;
    const n = section.bars >= 8 ? 8 : section.bars >= 4 ? 4 : 2;
    if (set.a3) {
      // a three- or four-bar theme is a phrase: played twice per 8 bars,
      // the second time with ornaments in its middle bars
      const t = ['a', 'a2', 'a3', set.a4 ? 'a4' : 'pac'];
      set.template = n === 8 ? [...t, 'a', 'a2:orn', 'a3:orn', t[3]] : n === 4 ? t : ['a', 'a2'];
      set.templateName = 'theme';
    } else if (theme.bars[1]) {
      set.template = { 8: ['a', 'a2', 'b', 'hc', 'a', 'a2', 'c', 'pac'], 4: ['a', 'a2', 'a', 'pac'], 2: ['a', 'a2'] }[n];
      set.templateName = 'theme';
    }
  }
  memory[material] = set;
  return set;
}

// Returns per bar { tokens: [...], notes: [...] } for the lead voice.
export function renderMelody(section, plan, rng, memory, material = section.type) {
  const { style, target, mode } = plan;
  const keyRoot = section.keyRoot ?? plan.keyRoot;
  const steps = plan.meter.steps;
  const strong = plan.meter.strong;
  const set = motifSet(material, section, plan, rng, memory);
  let variation = variationOf(section, set, rng);
  const leapMax = style.leapMax || 12;
  const [lo0, hi0] = style.leadRange || LEAD_RANGE[style.family] || [57, 81];
  const shift = Math.round(target.register);
  // given themes may span wider than generated lines: give them room
  const lo = lo0 + shift - (set.themed ? 5 : 0);
  const hi = hi0 + shift + (set.themed ? 7 : 0);
  // an octave that does not fit the SID's range becomes ornaments
  if (variation === 'octave' && hi + 12 > 96) variation = 'ornament';
  const octave = variation === 'octave' ? 12 : 0;

  const bars = [];
  let prev = null;
  const basePool = poolFor(lo, hi, new Set(SCALES[mode].map((s) => (keyRoot + s) % 12)));
  const baseIdx = Math.floor(basePool.length * 0.35) + set.lift;
  // tonic near the middle of the range, for themes written as degrees
  let tonicIdx = basePool.findIndex((n, i) => i >= basePool.length * 0.3 && n % 12 === keyRoot);
  if (tonicIdx < 0) tonicIdx = basePool.findIndex((n) => n % 12 === keyRoot);
  if (set.themed) {
    // place the tonic so the theme's span sits in the middle of the range
    const offs = [set.a, set.a2, set.a3, set.a4].filter(Boolean).flatMap((m) => m.steps);
    const span = [Math.min(...offs), Math.max(...offs)];
    let best = tonicIdx;
    let bestScore = -Infinity;
    basePool.forEach((n, i) => {
      if (n % 12 !== keyRoot) return;
      const lowRoom = i + span[0];
      const highRoom = basePool.length - 1 - (i + span[1]);
      const score = Math.min(lowRoom, highRoom) * 10 - Math.abs(lowRoom - highRoom);
      if (score > bestScore) { bestScore = score; best = i; }
    });
    tonicIdx = best;
  }

  for (let b = 0; b < section.bars; b += 1) {
    const chord = section.chords[b];
    const pcs = barScale(keyRoot, mode, chord);
    const pool = poolFor(lo, hi, pcs);
    const label = labelAt(set, section, b, variation);
    const motif = motifFor(set, label, rng);
    const anchor = motif.abs ? 0 : Math.round(ARCH[Math.floor((b / section.bars) * 8) % 8] * set.archScale);
    const onsets = onsetsOf(motif.cell);
    const tokens = [];
    const notes = [];
    let k = 0;
    for (let i = 0; i < steps; i += 1) {
      const c = motif.cell[i];
      if (c === 'x') {
        let degree;
        if (motif.abs) degree = tonicIdx + (motif.steps[k] ?? 0);
        else degree = baseIdx + anchor + motif.steps[k];
        // map the base-pool degree into this bar's pool by pitch
        const approx = basePool[Math.max(0, Math.min(basePool.length - 1, degree))];
        let idx = nearestIndex(pool, approx);
        const isStrong = i % strong === 0;
        const isLast = k === onsets.length - 1;
        // given themes keep their notes unless they clash: snap on the
        // downbeat or when a semitone rubs against a chord tone
        const clash = (n) => chord.tones.some((t) => [1, 11].includes(((n % 12) - t + 12) % 12));
        const mustSnap = motif.user ? false : motif.abs ? (i === 0 && !chord.tones.includes(pool[idx] % 12) && clash(pool[idx])) || (isStrong && clash(pool[idx])) : isStrong;
        if (mustSnap || (!motif.user && isLast && isCadence(label))) {
          // snap to the nearest chord tone (cadence: tonic or fifth/second)
          let targets = chord.tones;
          if (isLast && label === 'pac' && b === section.bars - 1) targets = [keyRoot];
          else if (isLast && label === 'hc') targets = [(keyRoot + 7) % 12, (keyRoot + 2) % 12, ...chord.tones];
          const moving = k > 0 && motif.steps[k] !== motif.steps[k - 1];
          let best = idx;
          let dist = Infinity;
          pool.forEach((n, j) => {
            if (!targets.includes(n % 12)) return;
            // a moving motif should not collapse onto the note it came from
            const d = Math.abs(j - idx) + (moving && n === prev ? 2.5 : 0);
            if (d < dist) { best = j; dist = d; }
          });
          idx = best;
        }
        let pitch = pool[idx];
        if (motif.user) {
          // the user's own melody plays exactly as written
          pitch = basePool[Math.max(0, Math.min(basePool.length - 1, degree))] + (motif.alts[k] || 0);
        } else {
          if (prev !== null && Math.abs(pitch - prev) > leapMax) pitch += pitch > prev ? -12 : 12;
          pitch = Math.max(lo, Math.min(hi, pitch));
        }
        pitch += octave;
        prev = pitch;
        tokens.push(noteName(pitch));
        notes.push({ step: i, pitch, strong: isStrong, chord });
        k += 1;
      } else if (c === '_') tokens.push('_');
      else tokens.push('~');
    }
    // Articulation from the mood: legato fills short rests, staccato cuts holds.
    // Seeded per section type and bar, so a repeated section repeats exactly.
    const art = new Rng(plan.seed, plan.version, 'articulation', material, section.type, b);
    for (let i = 1; i < steps; i += 1) {
      if (tokens[i] === '_' && target.legato < 0 && art.chance(-target.legato * 0.5) && tokens[i - 1] !== '~') tokens[i] = '~';
      else if (tokens[i] === '~' && target.legato > 0 && tokens[i - 1] !== '~' && art.chance(target.legato * 0.7)) tokens[i] = '_';
    }
    bars.push({ tokens, notes, label, section: section.type });
  }
  return { bars, template: set.templateName, themed: Boolean(set.themed), variation };
}
