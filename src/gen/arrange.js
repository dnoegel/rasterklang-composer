// Renders a plan (from a brief) into three SID voices, bar by bar.
// Textures (library/textures.js) decide which role each voice plays in
// each bar: D drums, B bass, L lead, A chord arpeggio, M bass and drums on
// one voice (a classic SID trick), - silent. Transitions shape the last
// bar of a section (fill, stop-time, drop-out).

import { DRUM_LETTERS, SID_TOP_NOTE, arpInstrumentFor, arpReach } from './instruments.js';
import { renderMelody } from './melody.js';
import { noteName, SCALES } from './theory.js';
import { Rng } from './prng.js';
import { GROOVES, FILLS } from './library/grooves.js';
import { BASS } from './library/bass.js';
import { ARP_CELLS } from './library/cells.js';
import { KITS } from './library/palettes.js';
import { ECHO_MAX_BARS } from './library/textures.js';
import { noteMidi } from './brief.js';

const REST = { tok: '~', inst: null };
const HOLD = { tok: '_', inst: null };

// Per-bar decisions seeded by section type and bar, so repeats match.
const barRng = (plan, section, b, what) => new Rng(plan.seed, plan.version, what, section.type, section.texture, b);

// Energy inside a section, bar by bar, from start to end value.
function energyAt(section, b) {
  const end = section.energyEnd ?? section.energy;
  return section.energy + (end - section.energy) * (section.bars > 1 ? b / (section.bars - 1) : 0);
}

// Small per-bar changes so a groove breathes instead of looping: ghost
// hats, an open hat before the next bar, a kick pickup. Anchors (beat 1,
// backbeats) stay. Seeded per section type and bar, so repeats match.
function varyDrums(row, rng, energy, strong) {
  const cells = [...row];
  const n = cells.length;
  if (rng.chance(0.25 + energy * 0.3)) {
    const i = 1 + 2 * rng.int(0, n / 2 - 1);
    if (cells[i] === '.') cells[i] = 'h';
  }
  if (energy > 0.45 && rng.chance(0.3)) {
    const i = n - 2;
    if (cells[i] === 'h' || cells[i] === '.') cells[i] = 'o';
  }
  if (energy > 0.55 && rng.chance(0.25)) {
    const i = strong * 2 - 1;
    if (i < n && cells[i] === '.' && cells[i + 1] !== 'k') cells[i] = 'k';
  }
  if (energy < 0.35 && rng.chance(0.3)) {
    const i = 2 * rng.int(1, n / 2 - 1);
    if (cells[i] === 'h') cells[i] = '.';
  }
  return cells.join('');
}

// Bass: an octave jump, a fifth instead of a root, or a pickup before
// the next bar, now and then.
function varyBass(row, rng, energy) {
  const cells = [...row];
  const onsets = cells.map((c, i) => (c === 'R' ? i : -1)).filter((i) => i > 0);
  if (onsets.length && rng.chance(0.2 + energy * 0.25)) cells[rng.pick(onsets)] = rng.chance(0.6) ? '8' : '5';
  const last = cells.length - 1;
  if (rng.chance(0.15 + energy * 0.15) && (cells[last] === '.' || cells[last] === '_') && cells[last - 1] !== '_') cells[last] = 'A';
  return cells.join('');
}

// Echo: the lead `delay` steps later on its own voice, with the
// softer echo variant of each lead sound. A note that started in the bar
// before is struck again at the bar line (a bar cannot start with a hold).
function echoBar(prev, cur, delay) {
  const steps = cur.length;
  const echoOf = (c) => (c.inst ? { tok: c.tok, inst: `${c.inst}echo` } : c);
  const cells = [...prev.slice(steps - delay), ...cur.slice(0, steps - delay)].map(echoOf);
  if (cells[0].tok === '_') {
    cells[0] = REST;
    for (let i = steps - delay - 1; i >= 0; i -= 1) {
      if (prev[i].tok === '~') break;
      if (prev[i].inst) { cells[0] = echoOf(prev[i]); break; }
    }
  }
  return cells;
}

function drumLevel(energy) {
  return energy < 0.22 ? 0 : energy < 0.5 ? 1 : energy < 0.78 ? 2 : 3;
}

function stageAt(section, b) {
  const frac = b / section.bars;
  let roles = section.textureDef.stages[0][1];
  for (const [from, r] of section.textureDef.stages) if (frac >= from - 1e-9) roles = r;
  return roles;
}

// The song's kit plays kick, snare and hat; a clap stays a
// clap, and the bank's own kit uses the brief's snare.
const kitOf = (plan) => KITS[plan.palette.kit] || KITS.std;
// Lead tokens with the section's lead sound. A note reached by a half or
// whole step straight from the note before may glide into place (its bend
// variant), as C64 leads do on a few percent of their notes.
// Leads that glide on every note anyway are left alone.
const SLIDING = new Set(['glide']);
function leadBar(mbar, inst, plan, rng, state) {
  const slides = SLIDING.has(inst) || (inst === 'custom' && plan.sound?.slide && plan.sound.slide !== 'none');
  const pitches = new Map(mbar.notes.map((n) => [n.step, n.pitch]));
  return mbar.tokens.map((t, i) => {
    if (t === '~') { state.open = false; return { tok: t, inst: null }; }
    if (t === '_') return { tok: t, inst: null };
    const pitch = pitches.get(i);
    const step = state.pitch !== null && pitch !== undefined ? Math.abs(pitch - state.pitch) : 0;
    const bend = !slides && state.open && (step === 1 || step === 2) && rng.chance(0.12);
    state.pitch = pitch ?? state.pitch;
    state.open = true;
    // a note whose attack arp would climb past the SID's top pitch (the
    // register wraps into a squeal) drops the arp an octave at a time,
    // only as far as needed; every other note keeps the full arp
    let sound = inst;
    while (pitch !== undefined && pitch + arpReach(sound, plan.sound) > SID_TOP_NOTE && sound.length < inst.length + 9) sound += 'top';
    return { tok: t, inst: bend ? `${sound}bend` : sound };
  });
}

// A song with an echo puts it on a voice left silent under the lead.
function rolesAt(section, b, plan) {
  const roles = stageAt(section, b);
  return plan.echo?.fill && roles.includes('L') && roles.includes('-') ? roles.replace('-', 'E') : roles;
}

function drumCell(c, plan) {
  if (c === '.') return REST;
  const kit = kitOf(plan);
  let inst = DRUM_LETTERS[c];
  if (c === 'k') inst = kit.kick;
  else if (c === 'h') inst = kit.hat;
  else if (c === 's') inst = kit.snare && plan.palette.snare !== 'clap' ? kit.snare : plan.palette.snare;
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
  const groove = section.textureDef.drums === 'halftime' && GROOVES.halftime.meter === plan.meterId ? GROOVES.halftime : section.grooveDef;
  const energy = energyAt(section, b);
  let level = drumLevel(energy);
  if (section.textureDef.drums === 'build') level = Math.min(3, Math.floor((b / section.bars) * 4));
  let row = groove.levels[Math.min(level, groove.levels.length - 1)];
  // a written two-bar pattern alternates on its main levels
  if (groove.custom && groove.rows.length > 1 && (level === 1 || level === 2)) row = groove.rows[b % 2];
  const varied = !groove.custom || level !== 1;
  if (varied) row = varyDrums(row, rng, energy, plan.meter.strong);
  const last = b === section.bars - 1;
  // count-in: the drum-only stage ends in a fill
  if (section.textureDef.drums === 'fill' && b + 1 < section.bars && stageAt(section, b + 1) !== stageAt(section, b)) row = pickFill(plan, rng) || row;
  else if (section.textureDef.drums === 'build' && last) row = pickFill(plan, rng) || row;
  else if (last && section.transition === 'fill' && rng.chance(0.9)) row = pickFill(plan, rng) || row;
  else if (!last && (b + 1) % 4 === 0 && energy > 0.35 && rng.chance(0.22)) row = pickFill(plan, rng) || row;
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

// The k-th scale note above a chord root (2 = a step, 4 = a fourth), or a
// fixed interval when the chord is borrowed from outside the scale.
function scaleAbove(plan, section, root, k, fallback) {
  const scale = SCALES[section.mode || plan.mode].map((d) => (d + section.keyRoot) % 12);
  const i = scale.indexOf(root % 12);
  if (i < 0) return root + fallback;
  return root + ((scale[(i + k) % 7] - scale[i] + 12) % 12);
}

// Fill on the last beat of a phrase: the bass walks up or down the scale,
// runs chromatically or jumps octaves into the next chord, so it moves
// between phrases instead of looping. Seeded by occurrence too, so a
// repeated chorus gets other fills.
function bassFill(cells, section, b, plan, rng, chord, next, inst, energy) {
  const beat = plan.meter.strong;
  const spacing = beat === 3 ? 1 : beat === 6 ? 2 : energy > 0.65 ? 1 : 2;
  const n = beat / spacing;
  const root = bassRoot(chord.root);
  const target = bassRoot(next.root);
  const scale = SCALES[section.mode || plan.mode].map((d) => (d + section.keyRoot) % 12);
  const inScale = (p) => scale.includes(((p % 12) + 12) % 12);
  const below = [];
  for (let p = target - 1; below.length < n && p > target - 12; p -= 1) if (inScale(p)) below.push(p);
  const above = [];
  for (let p = target + 1; above.length < n && p < target + 12; p += 1) if (inScale(p)) above.push(p);
  const kinds = ['walk_up', 'walk_down', 'chromatic', 'octave'];
  const kind = next.root === chord.root ? rng.pick(['octave', 'walk_down', 'walk_up']) : rng.pick(kinds);
  let pitches;
  if (kind === 'walk_up') pitches = below.slice(0, n).reverse();
  else if (kind === 'walk_down') pitches = above.slice(0, n).reverse();
  else if (kind === 'chromatic') pitches = Array.from({ length: n }, (_, i) => target - n + i);
  else pitches = Array.from({ length: n }, (_, i) => (i % 2 ? root + 12 : root));
  if (pitches.length < n) return cells;
  const out = [...cells];
  const start = cells.length - beat;
  for (let i = start; i < cells.length; i += 1) out[i] = HOLD;
  pitches.forEach((p, i) => { out[start + i * spacing] = { tok: noteName(Math.max(24, p)), inst }; });
  return out;
}

function bassBar(section, b, plan, rng, idiom, inst, after = null) {
  const chord = section.chords[b];
  const next = section.chords[b + 1] || after || chord;
  const root = bassRoot(chord.root);
  const third = chord.tones[1] !== undefined ? ((chord.tones[1] - chord.root + 12) % 12) : 4;
  let row = idiom.rows ? idiom.rows[b % idiom.rows.length] : idiom.row;
  if (!idiom.custom && !/^R_+$/.test(row)) row = varyBass(row, rng, energyAt(section, b));
  const lastOnset = Math.max(row.lastIndexOf('R'), row.lastIndexOf('5'), row.lastIndexOf('8'));
  const cells = [...row].map((c, i) => {
    let pitch = null;
    if (c === 'R') pitch = root;
    else if (c === '5') pitch = root + 7;
    else if (c === '8') pitch = root + 12;
    else if (c === '3') pitch = root + third;
    else if (c === '6') pitch = root + 9;
    else if (c === 'b') pitch = root + 10;
    else if (c === '2') pitch = scaleAbove(plan, section, root, 1, 2);
    else if (c === '4') pitch = scaleAbove(plan, section, root, 3, 5);
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
  // phrase ends (every 4th bar and the section's last) get a fill now and
  // then; calm and drone bass stays still, written patterns get fewer
  const energy = energyAt(section, b);
  const phraseEnd = (b + 1) % 4 === 0 || b === section.bars - 1;
  if (!phraseEnd || energy < 0.3 || section.textureDef.bass === 'drone') return cells;
  const fillRng = new Rng(plan.seed, plan.version, 'bassfill', section.type, section.occurrence, b);
  const chance = idiom.custom ? 0.25 + energy * 0.3 : 0.35 + energy * 0.45;
  return fillRng.chance(chance) ? bassFill(cells, section, b, plan, fillRng, chord, next, inst, energy) : cells;
}

// Chord arpeggio with voice leading: major and minor chords may use an
// inversion, whichever keeps the arpeggio's lowest note closest to the
// previous chord's (inversions are common in real SID arps).
const INVERSIONS = { M: [['M', 0], ['M1', 4], ['M2', 7]], m: [['m', 0], ['m1', 3], ['m2', 7]] };
function arpBar(section, b, plan, cell, state) {
  const chord = section.chords[b];
  let quality = plan.palette.chords === 'power' ? '5' : chord.quality;
  let base = chord.root;
  const options = plan.palette.chords === 'power' ? null : INVERSIONS[quality];
  let n;
  if (options) {
    let best = null;
    for (const [q, off] of options) {
      let cand = 48 + ((chord.root + off) % 12);
      if (cand > 57) cand -= 12;
      const d = state.prev === null ? Math.abs(cand - 52) : Math.abs(cand - state.prev);
      if (!best || d < best.d) best = { q, cand, d };
    }
    quality = best.q;
    n = best.cand;
  } else {
    n = 48 + base;
    if (n > 55) n -= 12;
  }
  state.prev = n;
  const inst = arpInstrumentFor(quality);
  return [...cell].map((c) => (c === 'x' ? { tok: noteName(n), inst } : c === '_' ? HOLD : REST));
}

// Counter-melody: a slower second line under the lead, chord tones a third
// or sixth below the lead note sounding at that moment, preferring contrary
// motion and small steps (textbook two-voice writing).
function counterBar(section, b, plan, leadNotes, prev, energy) {
  const steps = plan.meter.steps;
  const chord = section.chords[b];
  const every = energy > 0.6 ? plan.meter.strong : plan.meter.strong * 2;
  const tones = [];
  for (let n = 50; n <= 69; n += 1) if (chord.tones.includes(n % 12)) tones.push(n);
  const cells = [];
  let last = prev.pitch;
  let lastLead = prev.lead;
  for (let i = 0; i < steps; i += 1) {
    if (i % every !== 0) { cells.push(HOLD); continue; }
    const lead = [...leadNotes].reverse().find((x) => x.step <= i)?.pitch ?? lastLead ?? 72;
    let best = tones[0];
    let bestScore = -Infinity;
    for (const t of tones) {
      const below = lead - t;
      let score = [3, 4, 8, 9].includes(below) ? 3 : [5, 7].includes(below) ? 1 : below <= 0 || below === 12 ? -5 : 0;
      if (last !== null && lastLead !== null) {
        const dl = Math.sign(lead - lastLead);
        const dc = Math.sign(t - last);
        if (dl !== 0 && dc === -dl) score += 1.5;
        score -= Math.abs(t - last) / 4;
      }
      if (score > bestScore) { bestScore = score; best = t; }
    }
    cells.push({ tok: noteName(best), inst: 'counter' });
    last = best;
    lastLead = lead;
  }
  prev.pitch = last;
  prev.lead = lastLead;
  return cells;
}

// Bass and drums on one voice: snares/claps/toms interrupt the bass, kicks
// fall on bass notes (the bass instrument's noise click is the kick). Under a
// dense bass figure (half the steps or more, a gallop or 16ths) the kicks no
// longer fill its rests and only the snare beats and the crash interrupt it:
// otherwise bass and drums ran together into one stream of 16ths whose
// figure nobody could follow (heard in a metal chorus at 166 bpm).
function multiplex(drums, bass, kit) {
  const dense = bass.filter((c) => c.tok !== '~' && c.tok !== '_').length >= bass.length / 2;
  return drums.map((d, i) => {
    const accent = d.inst && d.inst !== kit.kick && d.inst !== kit.hat && d.inst !== 'ohat';
    if (accent && (!dense || d.inst === 'crash' || isBackbeat(i, drums.length))) return d;
    if (bass[i].tok !== '~') return bass[i];
    if (d.inst === kit.kick && !dense) return d;
    return bass[i];
  });
}
// the snare's beats 2 and 4 of a 4/4 bar (steps 4 and 12 of 16), or the
// middle of shorter bars
const isBackbeat = (i, steps) => (steps === 16 ? i === 4 || i === 12 : i === Math.floor(steps / 2));

const restBar = (steps) => Array.from({ length: steps }, () => REST);

// Notes from a score, played exactly: the lead as melody bars
// (the shape renderMelody returns), the bass as voice cells. The section's
// transpose and the song's octave shift apply.
function scoreMelody(section, plan) {
  const steps = plan.meter.steps;
  const shift = (plan.scoreShift?.lead || 0) + (section.transpose || 0);
  const strong = plan.meter.strong;
  const bars = [];
  for (let b = 0; b < section.bars; b += 1) {
    const tokens = [];
    const notes = [];
    for (let i = 0; i < steps; i += 1) {
      const t = section.score.lead[b * steps + i];
      const n = t ? noteMidi(t) : null;
      if (n !== null) {
        const pitch = n + shift;
        tokens.push(noteName(pitch));
        notes.push({ step: i, pitch, strong: i % strong === 0, chord: section.chords[b] });
      } else tokens.push(t === '_' && (i > 0 || b > 0) ? '_' : '~');
    }
    bars.push({ tokens, notes, label: 'score', section: section.type });
  }
  return { bars, template: 'score', themed: true, variation: 'exact' };
}

function scoreBassBar(section, b, plan, inst) {
  const steps = plan.meter.steps;
  const shift = (plan.scoreShift?.bass || 0) + (section.transpose || 0);
  return section.score.bass.slice(b * steps, (b + 1) * steps).map((t, i) => {
    const n = noteMidi(t);
    if (n !== null) return { tok: noteName(Math.max(24, n + shift)), inst };
    return t === '_' && (i > 0 || b > 0) ? HOLD : REST;
  });
}

export function arrange(plan, rng, melodyRng) {
  const steps = plan.meter.steps;
  const voices = [[], [], []];
  const routes = [];
  const melodyMemory = {};
  const leadNotes = [];
  plan.grooveTags = [...new Set(plan.sections.flatMap((s) => s.grooveDef.tags))];
  const arpState = { prev: null };
  let prevTransition = null;
  let prevLead = restBar(steps);
  const echoDelay = plan.echo?.delay || 2;
  let echoBars = 0;
  const bendState = { pitch: null, open: false };
  const roleBars = [];

  plan.sections.forEach((section, si) => {
    const idiom = bassIdiom(section, plan);
    const cells = ARP_CELLS[plan.meterId];
    const needsLead = section.textureDef.stages.some(([, r]) => r.includes('L') || r.includes('C'));
    const counterState = { pitch: null, lead: null };
    const material = section.textureDef.lead || section.type;
    const melody = !needsLead ? null : section.score?.lead ? scoreMelody(section, plan) : renderMelody(section, plan, melodyRng, melodyMemory, material);
    let leadInst = section.leadInst;
    if (section.occurrence >= 3 && section.lastOccurrence && !plan.style.signature?.lead) {
      const alt = Object.keys(plan.style.palette.lead).find((l) => l !== leadInst);
      if (alt) leadInst = alt;
    }
    const isLastSection = si === plan.sections.length - 1;
    const after = plan.sections[si + 1]?.chords[0] || null;
    // the brief may give a section its own bass sound; a gliding bass would
    // slide from the drum hits when it shares a voice with them
    const sectionBass = section.bassInst || plan.palette.bass;
    const bassInst = (roles) => (sectionBass === 'slidebass' && roles.includes('M') ? 'sub' : sectionBass);

    for (let b = 0; b < section.bars; b += 1) {
      let roles = rolesAt(section, b, plan);
      if (roles.includes('E') && (echoBars += 1) > ECHO_MAX_BARS) roles = roles.replace('E', '-');
      const drums = drumBar(section, b, plan, barRng(plan, section, b, 'drums'), b === 0 ? prevTransition : null);
      const bass = section.score?.bass ? scoreBassBar(section, b, plan, bassInst(roles))
        : bassBar(section, b, plan, barRng(plan, section, b, 'bass'), idiom, bassInst(roles), after);
      const e = energyAt(section, b);
      const cellNow = section.arpRows ? section.arpRows[b % section.arpRows.length]
        : cells[Math.min(cells.length - 1, Math.floor(e * cells.length))];
      const arp = arpBar(section, b, plan, cellNow, arpState);
      const lead = melody
        ? leadBar(melody.bars[b], leadInst, plan, barRng(plan, section, b, 'bend'), bendState)
        : restBar(steps);
      if (melody && roles.includes('L')) {
        leadNotes.push(...melody.bars[b].notes.map((n) => ({ ...n, bar: section.startBar + b, section: section.type })));
      }
      let bar = [...roles].map((r) => {
        if (r === 'D') return drums;
        if (r === 'B') return bass;
        if (r === 'L') return lead;
        if (r === 'A') return arp;
        if (r === 'M') return multiplex(drums, bass, kitOf(plan));
        if (r === 'C') return melody ? counterBar(section, b, plan, melody.bars[b].notes, counterState, e) : restBar(steps);
        // a fast line from a score (runs, trills) blurs under its own echo
        if (r === 'E' && section.score && melody && melody.bars[b].notes.length > steps / 2) return restBar(steps);
        if (r === 'E') return echoBar(prevLead, roles.includes('L') ? lead : restBar(steps), echoDelay);
        return restBar(steps);
      });

      const lastBar = b === section.bars - 1;
      if (lastBar && isLastSection && section.type === 'outro') {
        // final hit: crash, root, chord, tonic, all ringing out
        const chord = section.chords[b];
        bar = [...roles].map((r) => {
          const out = restBar(steps).map(() => HOLD);
          if (r === 'D' || r === 'M') return [{ tok: 'c4', inst: 'crash' }, ...restBar(steps - 1)];
          if (r === 'B') out[0] = { tok: noteName(bassRoot(chord.root)), inst: bassInst(roles) };
          else if (r === 'A') out[0] = arp.find((c) => c.inst) || { tok: noteName(48 + chord.root), inst: arpInstrumentFor('M') };
          else if (r === 'L') out[0] = { tok: noteName(72 + section.keyRoot - (section.keyRoot > 7 ? 12 : 0)), inst: leadInst };
          else return restBar(steps);
          return out;
        });
      } else if (lastBar && section.transition === 'stop' && !isLastSection) {
        const half = Math.floor(steps / 2);
        bar = bar.map((cellsV, v) => cellsV.map((c, i) => {
          // the melody of a score ends its phrase; the band stops under it
          if (i < half || (section.score && roles[v] === 'L')) return c;
          if (i === half) {
            const r = roles[v];
            if (r === 'D' || r === 'M') return { tok: 'c4', inst: 'crash' };
            if (r === 'B') return { tok: noteName(bassRoot(section.chords[b].root)), inst: bassInst(roles) };
          }
          return REST;
        }));
      } else if (lastBar && section.transition === 'dropout' && !isLastSection) {
        bar = bar.map((cellsV, v) => (roles[v] === 'D' ? restBar(steps) : roles[v] === 'M' ? bass : cellsV));
      }
      roleBars.push(roles);
      bar.forEach((cellsV, v) => voices[v].push(cellsV));
      prevLead = roles.includes('L') ? bar[roles.indexOf('L')] : restBar(steps);
      // filter routing: the echo (darker, further away), and the bass only
      // when the section sweeps it (open, close, wobble): a routed voice
      // loses about half its level even with the filter open, which left
      // the low end about 3 dB under typical C64 music.
      // Without them the chords; else a silent voice (routing it is
      // harmless), never the lead or drums alone
      const pick = (set) => [...roles].map((r, v) => (set.includes(r) ? v : -1)).filter((v) => v >= 0);
      const shape = section.filter || (section.textureDef.filter === 'open' ? 'open' : 'follow');
      const sweeping = ['open', 'close', 'wobble'].includes(shape);
      let route = pick(sweeping ? ['B', 'M', 'E'] : ['E']);
      // chords and counter only under a sweep: a steady low cutoff buried
      // the verse arp about 5 dB; else no voice is routed
      if (!route.length && sweeping) route = pick(['A', 'C']);
      if (!route.length && sweeping) route = pick(['-']).slice(0, 1);
      routes.push(route);
    }
    prevTransition = section.transition;
  });
  return { voices, leadNotes, routes, roleBars };
}
