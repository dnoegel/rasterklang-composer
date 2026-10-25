// Motif-based melody,
// "Melodies need motifs"). A section's melody is built from a few one-bar
// motifs (rhythm cell + scale-step contour), arranged by a phrase template
// (period, sentence, riff). Strong beats snap to chord tones, the section
// follows an arch, phrases end on cadence notes, choruses sit higher.
// Repeated sections reuse their motifs so hooks come back recognisably,
// with one variation per repeat (lessons from an earlier experiment: exact
// repeats sound static, unrelated phrases sound like a medley).

import { SCALES, nearestIndex, noteName } from './theory.js';
import { Rng } from './prng.js';
import { CELLS } from './library/cells.js';
import { SECTION_ENERGY } from './library/forms.js';

const LEAD_RANGE = { metal: [52, 79], synth: [57, 81], game: [60, 84], folk: [62, 86] };
const STEP_SHARE = { folk: 0.62, metal: 0.55, synth: 0.5, game: 0.5 };

const TEMPLATES = {
  8: {
    period: ['a', 'b', 'a', 'hc', 'a', 'b', 'a2', 'pac'],
    sentence: ['a', 'a', 'b', 'hc', 'a', 'a', 'c', 'pac'],
    riff: ['a', 'a', 'a', 'a2', 'a', 'a', 'b', 'pac'],
    qa: ['a', 'b', 'a', 'b2', 'a', 'b', 'c', 'pac'],
  },
  4: { period: ['a', 'b', 'a', 'pac'], riff: ['a', 'a', 'a2', 'pac'] },
  2: { period: ['a', 'pac'] },
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

function pickCell(cells, density, rng, exclude) {
  const sorted = [...cells].sort((a, b) => onsetsOf(a).length - onsetsOf(b).length);
  const center = density * (sorted.length - 1);
  const weights = sorted.map((c, i) => [c, c === exclude ? 0.05 : Math.exp(-((i - center) ** 2) / 2.5)]);
  return rng.weighted(weights);
}

function themeMotif(bar) {
  const cell = bar.map((t) => (typeof t === 'number' ? 'x' : t === '_' ? '_' : '.')).join('');
  return { cell, degrees: bar.filter((t) => typeof t === 'number'), abs: true };
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
  const feelCells = CELLS[plan.meterId][section.feel] || Object.values(CELLS[plan.meterId])[0];
  const pool = material === 'solo' ? [...feelCells, ...(CELLS[plan.meterId].running || [])] : feelCells;
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
  };
  set.b2 = { cell: set.b.cell, steps: set.b.steps.map((x, i) => (i === set.b.steps.length - 1 ? x - 1 : x)) };
  // A theme from the brief replaces the generated main motif.
  const theme = plan.themes?.[material];
  if (theme) {
    set.a = themeMotif(theme.bars[0]);
    set.a2 = theme.bars[1] ? themeMotif(theme.bars[1]) : set.a;
    set.themed = true;
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
  const leapMax = style.leapMax || 12;
  const [lo0, hi0] = style.leadRange || LEAD_RANGE[style.family] || [57, 81];
  const shift = Math.round(target.register);
  const lo = lo0 + shift;
  const hi = hi0 + shift;
  // Variation per repeat: 2nd time a new answer bar, 3rd time an octave up
  // (if it fits) or a different lead colour.
  // (a late repeat goes back to the original, the last of 3+ goes up)
  let variation = 'none';
  if (section.occurrence >= 3 && section.lastOccurrence) variation = 'octave';
  else if (section.occurrence % 2 === 0) variation = 'answer';
  const octave = variation === 'octave' && hi + 12 <= 96 ? 12 : 0;

  const bars = [];
  let prev = null;
  const basePool = poolFor(lo, hi, new Set(SCALES[mode].map((s) => (keyRoot + s) % 12)));
  const baseIdx = Math.floor(basePool.length * 0.35) + set.lift;
  // tonic near the middle of the range, for themes written as degrees
  let tonicIdx = basePool.findIndex((n, i) => i >= basePool.length * 0.3 && n % 12 === keyRoot);
  if (tonicIdx < 0) tonicIdx = basePool.findIndex((n) => n % 12 === keyRoot);

  for (let b = 0; b < section.bars; b += 1) {
    const chord = section.chords[b];
    const pcs = barScale(keyRoot, mode, chord);
    const pool = poolFor(lo, hi, pcs);
    let label = set.template[b % set.template.length];
    if (variation === 'answer' && b === section.bars - 2) label = 'c';
    const motif = set[label] || set.a;
    const anchor = motif.abs ? 0 : Math.round(ARCH[Math.floor((b / section.bars) * 8) % 8] * set.archScale);
    const onsets = onsetsOf(motif.cell);
    const tokens = [];
    const notes = [];
    let k = 0;
    for (let i = 0; i < steps; i += 1) {
      const c = motif.cell[i];
      if (c === 'x') {
        let degree;
        if (motif.abs) {
          const d = motif.degrees[k] ?? 1;
          degree = tonicIdx + (d > 0 ? d - 1 : -d - 1 - 7);
        } else degree = baseIdx + anchor + motif.steps[k];
        // map the base-pool degree into this bar's pool by pitch
        const approx = basePool[Math.max(0, Math.min(basePool.length - 1, degree))];
        let idx = nearestIndex(pool, approx);
        const isStrong = i % strong === 0;
        const isLast = k === onsets.length - 1;
        if (isStrong || (isLast && (label === 'pac' || label === 'hc'))) {
          // snap to the nearest chord tone (cadence: tonic or fifth/second)
          let targets = chord.tones;
          if (isLast && label === 'pac' && b === section.bars - 1) targets = [keyRoot];
          else if (isLast && label === 'hc') targets = [(keyRoot + 7) % 12, (keyRoot + 2) % 12, ...chord.tones];
          const seq = motif.abs ? motif.degrees : motif.steps;
          const moving = k > 0 && seq[k] !== seq[k - 1];
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
        if (prev !== null && Math.abs(pitch - prev) > leapMax) pitch += pitch > prev ? -12 : 12;
        pitch = Math.max(lo, Math.min(hi, pitch)) + octave;
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
  return { bars, template: set.templateName, themed: Boolean(set.themed) };
}
