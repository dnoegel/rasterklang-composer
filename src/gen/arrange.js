// Drums, bass, chord arpeggios and the voice-role arrangement.
// Role templates per section,
// "Voice roles"): V0 / V1 / V2 =
//   DBL  drums, bass, lead              (default)
//   DBA  drums, bass, arp chords        (intros, bridges, breakdowns)
//   MAL  bass+drums multiplexed, arp, lead   (Rob Hubbard's trick: the bass
//        voice plays the snare between bass notes, freeing a voice for chords)
//   BAL  bass, arp, lead                (no drums)

import { DRUM_LETTERS, arpInstrumentFor } from './instruments.js';
import { renderMelody } from './melody.js';
import { noteName } from './theory.js';
import { Rng } from './prng.js';

// Per-bar decisions seeded by section type and bar, so repeats match.
const barRng = (plan, section, b, what) => new Rng(plan.seed, plan.version, what, section.type, b);

const REST = { tok: '~', inst: null };
const HOLD = { tok: '_', inst: null };

function drumLevel(energy) {
  if (energy < 0.22) return 0;
  if (energy < 0.5) return 1;
  if (energy < 0.78) return 2;
  return 3;
}

function drumBar(section, b, plan, rng, bassIdiom) {
  const { style } = plan;
  const d = style.drums;
  let row = d.levels[drumLevel(section.energy)];
  if (section.type === 'breakdown' && d.halftime) row = d.halftime;
  if (bassIdiom === 'gallop' && d.gallop && section.energy > 0.5) row = mergeSnare(d.gallop, d.levels[1]);
  const lastOfSection = b === section.bars - 1;
  const phraseEnd = (b + 1) % 4 === 0;
  if (section.type !== 'outro' && section.type !== 'intro' && section.energy > 0.3
    && ((lastOfSection && rng.chance(0.8)) || (phraseEnd && !lastOfSection && rng.chance(0.3)))) {
    row = rng.pick(d.fills);
  }
  let cells = [...row];
  if (b === 0 && section.energy > 0.6 && section.type !== 'verse') cells[0] = 'x';
  if (section.type === 'outro' && b === section.bars - 1) cells = cells.map((c, i) => (i === 0 ? 'x' : '.'));
  return cells.map((c) => (c === '.' ? REST : { tok: 'c4', inst: DRUM_LETTERS[c] }));
}

// Gallop kick with the backbeat snare of a plain level.
function mergeSnare(kickRow, levelRow) {
  return [...kickRow].map((c, i) => (levelRow[i] === 's' ? 's' : c)).join('');
}

function bassRoot(pc, octave) {
  // E1 (28) .. D#2 (39): low but within the SID's clean range
  let n = 24 + octave * 12 + pc;
  if (n > 39 + (octave - 1) * 12) n -= 12;
  return n;
}

function chooseBassIdiom(section, plan, rng, memory) {
  if (memory[section.type]) return memory[section.type];
  // Closest energy band wins most often; legato moods lean to calmer rows.
  const want = section.energy - plan.target.legato * 0.15;
  const weights = plan.style.bass.idioms.map((i) => {
    const center = (i.energy[0] + i.energy[1]) / 2;
    return [i, Math.exp(-((want - center) ** 2) / (2 * 0.12 ** 2)) + 1e-4];
  });
  const pick = rng.weighted(weights);
  memory[section.type] = pick;
  return pick;
}

function bassBar(section, b, plan, rng, idiom, inst) {
  const chord = section.chords[b];
  const next = section.chords[b + 1] || chord;
  const root = bassRoot(chord.root, plan.style.bass.octave);
  const third = chord.tones[1] !== undefined ? ((chord.tones[1] - chord.root + 12) % 12) : 4;
  const lastBar = section.type === 'outro' && b === section.bars - 1;
  const row = lastBar ? `R${'_'.repeat(plan.style.meter.steps - 1)}` : idiom.row;
  const cells = [];
  const lastOnset = row.lastIndexOf('R') > row.lastIndexOf('5') ? row.lastIndexOf('R') : row.lastIndexOf('5');
  for (let i = 0; i < row.length; i += 1) {
    const c = row[i];
    let pitch = null;
    if (c === 'R') pitch = root;
    else if (c === '5') pitch = root + 7;
    else if (c === '8') pitch = root + 12;
    else if (c === '3') pitch = root + third;
    else if (c === 'b') pitch = root + 10;
    else if (c === 'A') pitch = bassRoot(next.root, plan.style.bass.octave) + (rng.chance(0.5) ? -1 : 1);
    if (pitch !== null) {
      // approach note into a chord change, more often with tension
      if (i === lastOnset && i > row.length / 2 && next.root !== chord.root && rng.chance(0.25 + plan.target.tension * 0.5)) {
        pitch = bassRoot(next.root, plan.style.bass.octave) + (rng.chance(0.6) ? -1 : 2);
      }
      cells.push({ tok: noteName(pitch), inst });
    } else if (c === '_') cells.push(HOLD);
    else cells.push(REST);
  }
  return cells;
}

function arpBar(section, b, plan, rng, cell) {
  const chord = section.chords[b];
  const quality = plan.style.power ? '5' : chord.quality;
  const inst = arpInstrumentFor(quality);
  let n = 48 + chord.root;
  if (n > 55) n -= 12;
  const lastBar = section.type === 'outro' && b === section.bars - 1;
  const row = lastBar ? `x${'_'.repeat(plan.style.meter.steps - 1)}` : cell;
  return [...row].map((c) => (c === 'x' ? { tok: noteName(n), inst } : c === '_' ? HOLD : REST));
}

// Bass and drums on one voice: snares/claps/toms interrupt the bass,
// kicks fall on bass notes (the bass instrument's noise click is the kick).
function multiplex(drums, bass) {
  return drums.map((d, i) => {
    const isAccent = d.inst && d.inst !== 'kick' && d.inst !== 'hat' && d.inst !== 'ohat';
    if (isAccent) return d;
    if (bass[i].tok !== '~') return bass[i];
    if (d.inst === 'kick') return d;
    return bass[i];
  });
}

// Renders the whole plan into three voices of bars of {tok, inst} cells.
export function arrange(plan, rng, melodyRng) {
  const voices = [[], [], []];
  const melodyMemory = {};
  const bassMemory = {};
  const arpMemory = {};
  const leadNotes = [];
  const bassInst = rng.pick(plan.style.bass.inst);
  for (const section of plan.sections) {
    const idiom = chooseBassIdiom(section, plan, rng, bassMemory);
    if (!arpMemory[section.type]) {
      const cells = plan.style.arp.cells;
      arpMemory[section.type] = cells[Math.min(cells.length - 1, Math.floor(section.energy * cells.length))];
    }
    const needsLead = section.roles.includes('L');
    const melody = needsLead ? renderMelody(section, plan, melodyRng, melodyMemory) : null;
    let leadInst = section.leadInst;
    if (section.occurrence >= 3 && plan.style.lead.inst[section.type]?.length > 1) {
      leadInst = plan.style.lead.inst[section.type].find((i) => i !== leadInst) || leadInst;
    }
    for (let b = 0; b < section.bars; b += 1) {
      const drums = drumBar(section, b, plan, barRng(plan, section, b, 'drums'), idiom.id);
      const bass = bassBar(section, b, plan, barRng(plan, section, b, 'bass'), idiom, bassInst);
      const arp = arpBar(section, b, plan, rng, arpMemory[section.type]);
      const lead = melody ? melody.bars[b].tokens.map((t) => (t === '~' || t === '_' ? { tok: t, inst: null } : { tok: t, inst: leadInst })) : null;
      if (melody) leadNotes.push(...melody.bars[b].notes.map((n) => ({ ...n, bar: section.startBar + b, section: section.type })));
      let v;
      switch (section.roles) {
        case 'DBA': v = [drums, bass, arp]; break;
        case 'MAL': v = [multiplex(drums, bass), arp, lead]; break;
        case 'BAL': v = [bass, arp, lead]; break;
        default: v = [drums, bass, lead];
      }
      v.forEach((cells, i) => voices[i].push(cells));
    }
  }
  return { voices, leadNotes, bassInst, idioms: Object.fromEntries(Object.entries(bassMemory).map(([k, v]) => [k, v.id])) };
}

// Which voice carries the bass in each section (for filter routing).
export function bassVoiceOf(roles) {
  return roles === 'DBL' || roles === 'DBA' ? 1 : 0;
}
