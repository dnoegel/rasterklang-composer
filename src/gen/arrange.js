// Renders a plan (from a brief) into three SID voices, bar by bar.
// Textures (library/textures.js) decide which role each voice plays in
// each bar: D drums, B bass, L lead, A chord arpeggio, M bass and drums on
// one voice (Rob Hubbard's trick), - silent. Transitions shape the last
// bar of a section (fill, stop-time, drop-out).

import { DRUM_LETTERS, arpInstrumentFor } from './instruments.js';
import { renderMelody } from './melody.js';
import { noteName } from './theory.js';
import { Rng } from './prng.js';
import { GROOVES, FILLS } from './library/grooves.js';
import { BASS } from './library/bass.js';
import { ARP_CELLS } from './library/cells.js';
import { PERSONAS } from './library/palettes.js';

const REST = { tok: '~', inst: null };
const HOLD = { tok: '_', inst: null };

// Per-bar decisions seeded by section type and bar, so repeats match.
const barRng = (plan, section, b, what) => new Rng(plan.seed, plan.version, what, section.type, section.texture, b);

function drumLevel(energy, persona) {
  let level = energy < 0.22 ? 0 : energy < 0.5 ? 1 : energy < 0.78 ? 2 : 3;
  if (persona.drums !== undefined && persona.drums < 0.5) level = Math.max(0, level - 1);
  return level;
}

function stageAt(section, b) {
  const frac = b / section.bars;
  let roles = section.textureDef.stages[0][1];
  for (const [from, r] of section.textureDef.stages) if (frac >= from - 1e-9) roles = r;
  return roles;
}

function drumCell(c, plan) {
  if (c === '.') return REST;
  const inst = c === 's' ? plan.palette.snare : DRUM_LETTERS[c];
  return { tok: 'c4', inst };
}

function pickFill(plan, rng) {
  const fills = FILLS[plan.meterId] || [];
  if (!fills.length) return null;
  const fam = plan.style.family;
  const tagged = fills.filter((f) => f.tags.some((t) => (plan.grooveTags || []).includes(t) || t === fam));
  return rng.pick(tagged.length ? tagged : fills).row;
}

function drumBar(section, b, plan, rng, prevTransition) {
  const persona = PERSONAS[plan.persona] || PERSONAS.none;
  const groove = section.textureDef.drums === 'halftime' && GROOVES.halftime.meter === plan.meterId ? GROOVES.halftime : section.grooveDef;
  let level = drumLevel(section.energy, persona);
  if (section.textureDef.drums === 'build') level = Math.min(3, Math.floor((b / section.bars) * 4));
  let row = groove.levels[Math.min(level, groove.levels.length - 1)];
  const last = b === section.bars - 1;
  const fillsMul = persona.fills || 1;
  // count-in: the drum-only stage ends in a fill
  if (section.textureDef.drums === 'fill' && b + 1 < section.bars && stageAt(section, b + 1) !== stageAt(section, b)) row = pickFill(plan, rng) || row;
  else if (section.textureDef.drums === 'build' && last) row = pickFill(plan, rng) || row;
  else if (last && section.transition === 'fill' && rng.chance(0.9)) row = pickFill(plan, rng) || row;
  else if (!last && (b + 1) % 4 === 0 && section.energy > 0.35 && rng.chance(0.22 * fillsMul)) row = pickFill(plan, rng) || row;
  const cells = [...row].map((c) => drumCell(c, plan));
  const crash = b === 0 && (prevTransition === 'fill' || prevTransition === 'stop' || (section.energy > 0.6 && section.type !== 'verse'));
  if (crash) cells[0] = { tok: 'c4', inst: 'crash' };
  return cells;
}

function bassRoot(pc) {
  // E1 (28) .. D#2 (39): low but within the SID's clean range
  let n = 36 + pc;
  if (n > 39) n -= 12;
  return n;
}

function bassIdiom(section, plan) {
  if (section.textureDef.bass === 'drone') {
    return Object.values(BASS).find((i) => i.meter === plan.meterId && /^R_+$/.test(i.row)) || section.bassDef;
  }
  return section.bassDef;
}

function bassBar(section, b, plan, rng, idiom, inst) {
  const chord = section.chords[b];
  const next = section.chords[b + 1] || chord;
  const root = bassRoot(chord.root);
  const third = chord.tones[1] !== undefined ? ((chord.tones[1] - chord.root + 12) % 12) : 4;
  const row = idiom.row;
  const lastOnset = Math.max(row.lastIndexOf('R'), row.lastIndexOf('5'), row.lastIndexOf('8'));
  return [...row].map((c, i) => {
    let pitch = null;
    if (c === 'R') pitch = root;
    else if (c === '5') pitch = root + 7;
    else if (c === '8') pitch = root + 12;
    else if (c === '3') pitch = root + third;
    else if (c === '6') pitch = root + 9;
    else if (c === 'b') pitch = root + 10;
    else if (c === 'A') pitch = bassRoot(next.root) + (rng.chance(0.5) ? -1 : 1);
    if (pitch !== null) {
      // approach note into a chord change, more often with tension
      if (i === lastOnset && i > row.length / 2 && next.root !== chord.root && rng.chance(0.25 + plan.target.tension * 0.5)) {
        pitch = bassRoot(next.root) + (rng.chance(0.6) ? -1 : 2);
      }
      return { tok: noteName(pitch), inst };
    }
    return c === '_' ? HOLD : REST;
  });
}

function arpBar(section, b, plan, cell) {
  const chord = section.chords[b];
  const quality = plan.palette.chords === 'power' ? '5' : chord.quality;
  const inst = arpInstrumentFor(quality);
  let n = 48 + chord.root;
  if (n > 55) n -= 12;
  return [...cell].map((c) => (c === 'x' ? { tok: noteName(n), inst } : c === '_' ? HOLD : REST));
}

// Bass and drums on one voice: snares/claps/toms interrupt the bass, kicks
// fall on bass notes (the bass instrument's noise click is the kick).
function multiplex(drums, bass) {
  return drums.map((d, i) => {
    const accent = d.inst && d.inst !== 'kick' && d.inst !== 'hat' && d.inst !== 'ohat';
    if (accent) return d;
    if (bass[i].tok !== '~') return bass[i];
    if (d.inst === 'kick') return d;
    return bass[i];
  });
}

const restBar = (steps) => Array.from({ length: steps }, () => REST);

export function arrange(plan, rng, melodyRng) {
  const steps = plan.meter.steps;
  const voices = [[], [], []];
  const routes = [];
  const melodyMemory = {};
  const leadNotes = [];
  const persona = PERSONAS[plan.persona] || PERSONAS.none;
  plan.grooveTags = [...new Set(plan.sections.flatMap((s) => s.grooveDef.tags))];
  let prevTransition = null;

  plan.sections.forEach((section, si) => {
    const idiom = bassIdiom(section, plan);
    const cells = ARP_CELLS[plan.meterId];
    const arpCell = persona.arpBusy ? cells[cells.length - 1] : cells[Math.min(cells.length - 1, Math.floor(section.energy * cells.length))];
    const needsLead = section.textureDef.stages.some(([, r]) => r.includes('L'));
    const material = section.textureDef.lead || section.type;
    const melody = needsLead ? renderMelody(section, plan, melodyRng, melodyMemory, material) : null;
    let leadInst = section.leadInst;
    if (section.occurrence >= 3 && section.lastOccurrence && !plan.style.signature?.lead) {
      const alt = Object.keys(plan.style.palette.lead).find((l) => l !== leadInst);
      if (alt) leadInst = alt;
    }
    const isLastSection = si === plan.sections.length - 1;

    for (let b = 0; b < section.bars; b += 1) {
      const roles = stageAt(section, b);
      const drums = drumBar(section, b, plan, barRng(plan, section, b, 'drums'), b === 0 ? prevTransition : null);
      const bass = bassBar(section, b, plan, barRng(plan, section, b, 'bass'), idiom, plan.palette.bass);
      const arp = arpBar(section, b, plan, arpCell);
      const lead = melody
        ? melody.bars[b].tokens.map((t) => (t === '~' || t === '_' ? { tok: t, inst: null } : { tok: t, inst: leadInst }))
        : restBar(steps);
      if (melody && roles.includes('L')) {
        leadNotes.push(...melody.bars[b].notes.map((n) => ({ ...n, bar: section.startBar + b, section: section.type })));
      }
      let bar = [...roles].map((r) => {
        if (r === 'D') return drums;
        if (r === 'B') return bass;
        if (r === 'L') return lead;
        if (r === 'A') return arp;
        if (r === 'M') return multiplex(drums, bass);
        return restBar(steps);
      });

      const lastBar = b === section.bars - 1;
      if (lastBar && isLastSection && section.type === 'outro') {
        // final hit: crash, root, chord, tonic, all ringing out
        const chord = section.chords[b];
        bar = [...roles].map((r) => {
          const out = restBar(steps).map(() => HOLD);
          if (r === 'D' || r === 'M') return [{ tok: 'c4', inst: 'crash' }, ...restBar(steps - 1)];
          if (r === 'B') out[0] = { tok: noteName(bassRoot(chord.root)), inst: plan.palette.bass };
          else if (r === 'A') out[0] = arp.find((c) => c.inst) || { tok: noteName(48 + chord.root), inst: arpInstrumentFor('M') };
          else if (r === 'L') out[0] = { tok: noteName(72 + section.keyRoot - (section.keyRoot > 7 ? 12 : 0)), inst: leadInst };
          else return restBar(steps);
          return out;
        });
      } else if (lastBar && section.transition === 'stop' && !isLastSection) {
        const half = Math.floor(steps / 2);
        bar = bar.map((cellsV, v) => cellsV.map((c, i) => {
          if (i < half) return c;
          if (i === half) {
            const r = roles[v];
            if (r === 'D' || r === 'M') return { tok: 'c4', inst: 'crash' };
            if (r === 'B') return { tok: noteName(bassRoot(section.chords[b].root)), inst: plan.palette.bass };
          }
          return REST;
        }));
      } else if (lastBar && section.transition === 'dropout' && !isLastSection) {
        bar = bar.map((cellsV, v) => (roles[v] === 'D' ? restBar(steps) : roles[v] === 'M' ? bass : cellsV));
      }
      bar.forEach((cellsV, v) => voices[v].push(cellsV));
      // filter routing: the bass voice; without bass the chords; else a
      // silent voice (routing it is harmless), never the lead or drums alone
      const pick = (set) => [...roles].map((r, v) => (set.includes(r) ? v : -1)).filter((v) => v >= 0);
      let route = pick(['B', 'M']);
      if (!route.length) route = pick(['A']);
      if (!route.length) route = pick(['-']).slice(0, 1);
      routes.push(route);
    }
    prevTransition = section.transition;
  });
  return { voices, leadNotes, routes };
}
