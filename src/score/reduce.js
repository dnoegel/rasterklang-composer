// A score (from MIDI, MusicXML or ABC) -> what three SID voices can play:
// one lead line (the highest voice, or a chosen part), one bass
// line (the lowest), one chord per bar, on the generator's step grid.
// Notes are note names ("f5", "c#4"), "_" holds, "." rests, as in the
// own-melody field.

import { noteName, KEY_NAMES } from '../gen/theory.js';

// time signature -> the generator's meter, and how many source bars make
// one of its bars (2/4 pairs into 4/4, 3/8 into 6/8)
const METER_OF = {
  '4/4': ['4/4', 1], '2/2': ['4/4', 1], '2/4': ['4/4', 2], '3/4': ['3/4', 1],
  '6/8': ['6/8', 1], '3/8': ['6/8', 2], '12/8': ['12/8', 1], '6/4': ['6/8', 0.5], '3/2': ['3/4', 0.5],
};
const STEPS = { '4/4': 16, '3/4': 12, '6/8': 12, '12/8': 12 };
// quarter notes per generator bar
const QUARTERS = { '4/4': 4, '3/4': 3, '6/8': 3, '12/8': 6 };

const PC = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
export function parseNote(t) {
  const m = /^([a-gA-G])(#|s|b)?(-?\d)$/.exec(String(t));
  if (!m) return null;
  return (Number(m[3]) + 1) * 12 + PC[m[1].toLowerCase()] + (m[2] === '#' || m[2] === 's' ? 1 : m[2] === 'b' ? -1 : 0);
}

// key signature (fifths) -> tonic pitch class and mode
export function keyOf(fifths, minor) {
  const major = ((fifths * 7) % 12 + 12) % 12;
  return minor ? { root: (major + 9) % 12, mode: 'aeolian' } : { root: major, mode: 'ionian' };
}

// Krumhansl-Kessler key finding, when the file names no key
const KK_MAJ = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const KK_MIN = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
function estimateKey(hist) {
  let best = { root: 0, mode: 'ionian', r: -Infinity };
  const corr = (prof, k) => {
    const mx = hist.reduce((a, b) => a + b, 0) / 12;
    const mp = prof.reduce((a, b) => a + b, 0) / 12;
    let num = 0; let dx = 0; let dp = 0;
    for (let i = 0; i < 12; i += 1) {
      const x = hist[(i + k) % 12] - mx;
      const y = prof[i] - mp;
      num += x * y; dx += x * x; dp += y * y;
    }
    return num / Math.sqrt(dx * dp || 1);
  };
  for (let k = 0; k < 12; k += 1) {
    const a = corr(KK_MAJ, k);
    const b = corr(KK_MIN, k);
    if (a > best.r) best = { root: k, mode: 'ionian', r: a };
    if (b > best.r) best = { root: k, mode: 'aeolian', r: b };
  }
  return best;
}

const CHORD_SHAPES = [
  ['', [0, 4, 7], 1], ['m', [0, 3, 7], 1], ['7', [0, 4, 7, 10], 0.92], ['dim', [0, 3, 6], 0.85], ['m7', [0, 3, 7, 10], 0.88], ['maj7', [0, 4, 7, 11], 0.85],
];
const NAME = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const SCALE_OF = { ionian: [0, 2, 4, 5, 7, 9, 11], aeolian: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], mixolydian: [0, 2, 4, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], lydian: [0, 2, 4, 6, 7, 9, 11] };
// key: chords built on the scale win close calls; a single melody line
// gets triads only (its passing notes are not sevenths)
function chordOf(hist, bassPc, key, single) {
  const total = hist.reduce((a, b) => a + b, 0);
  if (!total) return null;
  const scale = (SCALE_OF[key.mode] || SCALE_OF.ionian).map((d) => (d + key.root) % 12);
  if (key.mode === 'aeolian') scale.push((key.root + 11) % 12);
  let best = null;
  for (let root = 0; root < 12; root += 1) {
    for (const [suffix, shape, w] of CHORD_SHAPES) {
      if (single && shape.length === 4) continue;
      const inside = shape.reduce((a, iv) => a + hist[(root + iv) % 12], 0);
      // chord tones present, few tones outside, the bass on the root helps
      let score = (inside / total) * w + (bassPc === root ? 0.15 : 0) + (hist[root] / total) * 0.2;
      if (shape.length === 4 && hist[(root + shape[3]) % 12] / total < 0.08) score -= 0.2;
      if (shape.slice(0, 3).every((iv) => scale.includes((root + iv) % 12))) score += 0.08;
      if (!best || score > best.score) best = { name: NAME[root] + suffix, score };
    }
  }
  return best.name;
}

// steps per beat and the second strong step (half bar) per meter
const BEAT = { '4/4': 4, '3/4': 4, '6/8': 6, '12/8': 3 };
const HALF = { '4/4': 8, '6/8': 6, '12/8': 6 };

// An upbeat: files (MIDI from LilyPond, MusicXML, ABC) start the pickup
// note at time 0, so every bar line of the grid would fall that much too
// early, phrases would end in the next bar and drums and chords would run
// against the melody. Returns the pickup length in steps (0: none). The
// last note ending that far past a bar line is the clear sign; otherwise
// only a shift whose notes sit much better on the beats counts.
function pickupSteps(parts, meter, steps, stepTicks, end) {
  const weight = (p) => (p === 0 ? 4 : p === HALF[meter] ? 3 : p % BEAT[meter] === 0 ? 2 : p % 2 === 0 ? 1 : 0);
  // offset o: a note at step s sits on bar position (s + o) % steps
  const fit = (o) => {
    let sum = 0;
    let total = 0;
    for (const p of parts) {
      for (const n of p.notes) {
        const w = Math.log2(1 + n.dur / stepTicks) * (n.pitch < 55 ? 1.5 : 1);
        sum += w * weight((Math.round(n.start / stepTicks) + o) % steps);
        total += w;
      }
    }
    return total ? sum / total : 0;
  };
  const fits = Array.from({ length: steps }, (_, o) => fit(o));
  const top = Math.max(...fits);
  // (a last note cut short also ends off the bar line: the shift must
  // then still be among the best fits)
  const tail = Math.round(end / stepTicks) % steps;
  if (tail > 0 && fits[steps - tail] > fits[0] * 1.05 && fits[steps - tail] >= top * 0.97) return tail;
  const best = fits.indexOf(top);
  return best && top > fits[0] * 1.15 ? steps - best : 0;
}

// score: { ppq, num, den, bpm, fifths?, minor?, parts: [{ name, notes: [{ pitch, start, dur }] }] }
// opts: { lead: part index or null (highest line over all parts), bass: part index or null }
export function reduceScore(score, opts = {}) {
  const sig = `${score.num || 4}/${score.den || 4}`;
  const [meter, group] = METER_OF[sig] || ['4/4', (score.num || 4) / (score.den || 4)];
  const steps = STEPS[meter];
  const quarterTicks = score.ppq;
  const barTicks = Math.round(quarterTicks * QUARTERS[meter]);
  const stepTicks = barTicks / steps;
  const parts = score.parts.map((p, i) => {
    const pitches = p.notes.map((n) => n.pitch);
    const mean = pitches.reduce((a, b) => a + b, 0) / (pitches.length || 1);
    return { i, name: p.name || `part ${i + 1}`, notes: p.notes, mean, low: Math.min(...pitches), high: Math.max(...pitches) };
  }).filter((p) => p.notes.length);
  if (!parts.length) throw new Error('the score has no notes');
  let end = Math.max(...parts.flatMap((p) => p.notes.map((n) => n.start + n.dur)));
  // an upbeat goes to the end of bar 1, so bar 2 starts on the first downbeat
  const pickup = pickupSteps(parts, meter, steps, stepTicks, end);
  if (pickup) {
    const shift = (steps - pickup) * stepTicks;
    for (const p of parts) p.notes = p.notes.map((n) => ({ ...n, start: n.start + shift }));
    end += shift;
  }
  const totalSteps = Math.ceil(end / stepTicks);
  const bars = Math.ceil(totalSteps / steps);

  // one line from a set of parts: per step the highest (or lowest) note
  // sounding; a new token where that note starts or changes
  const line = (set, pickHigh, ceiling = Infinity) => {
    const best = new Array(bars * steps).fill(null);
    for (const p of set) {
      for (const n of p.notes) {
        if (n.pitch >= ceiling && p !== byMean[0]) continue;
        const s0 = Math.round(n.start / stepTicks);
        const s1 = Math.max(s0 + 1, Math.round((n.start + n.dur) / stepTicks));
        for (let s = s0; s < s1 && s < best.length; s += 1) {
          const cur = best[s];
          const better = !cur || (pickHigh ? n.pitch > cur.pitch : n.pitch < cur.pitch);
          // a note that starts here wins over one only held into this step
          if (better || (cur.onset !== s0 && s === s0 && n.pitch === cur.pitch)) best[s] = { pitch: n.pitch, onset: s0, id: n };
        }
      }
    }
    return best.map((c, s) => {
      if (!c) return '.';
      const prev = best[s - 1];
      return prev && prev.id === c.id && c.onset !== s ? '_' : c.pitch;
    });
  };
  const byMean = [...parts].sort((a, b) => a.mean - b.mean);
  const leadSet = Number.isInteger(opts.lead) && parts.find((p) => p.i === opts.lead) ? [parts.find((p) => p.i === opts.lead)]
    : parts.length > 1 ? parts.filter((p) => p !== byMean[0] || p.mean >= 60) : parts;
  const bassSet = Number.isInteger(opts.bass) && parts.find((p) => p.i === opts.bass) ? [parts.find((p) => p.i === opts.bass)]
    : parts.length > 1 ? byMean.slice(0, Math.max(1, Math.ceil(parts.length / 2))) : parts;
  const lead = line(leadSet, true);
  // a single melody line (ABC, a lead sheet) has no bass of its own
  // where the lowest part rests, an upper part's figures (violins at c5)
  // are no bass: only notes below middle C fill in for it
  let bass = parts.length > 1 ? line(bassSet, false, Number.isInteger(opts.bass) ? Infinity : 60) : new Array(bars * steps).fill('.');
  // the bass must not double the lead: where they are the same note, rest
  bass = bass.map((t, s) => (typeof t === 'number' && t === lead[s] && parts.length > 1 ? '.' : t));

  // chords per bar from every note, weighted by duration, with the bass
  const hists = [];
  const hist = new Array(12).fill(0);
  for (let b = 0; b < bars; b += 1) {
    const h = new Array(12).fill(0);
    const t0 = b * barTicks;
    const t1 = t0 + barTicks;
    for (const p of parts) {
      for (const n of p.notes) {
        const overlap = Math.min(t1, n.start + n.dur) - Math.max(t0, n.start);
        if (overlap > 0) { h[n.pitch % 12] += overlap * (n.pitch < 55 ? 1.5 : 1); hist[n.pitch % 12] += overlap; }
      }
    }
    hists.push(h);
  }
  const key = Number.isInteger(score.keyRoot) ? { root: score.keyRoot, mode: score.mode || 'ionian' }
    : Number.isInteger(score.fifths) ? keyOf(score.fifths, score.minor) : estimateKey(hist);
  const chords = hists.map((h, b) => {
    const firstBass = bass.slice(b * steps, (b + 1) * steps).find((t) => typeof t === 'number');
    return chordOf(h, firstBass === undefined ? null : firstBass % 12, key, parts.length === 1);
  });
  return {
    meter,
    sourceMeter: sig,
    group,
    steps,
    bpm: Math.round(score.bpm || 100),
    key: KEY_NAMES[key.root],
    keyRoot: key.root,
    mode: key.mode,
    bars,
    pickup,
    parts: parts.map((p) => ({ index: p.i, name: p.name, notes: p.notes.length, range: `${noteName(p.low)}-${noteName(p.high)}` })),
    lead: lead.map((t) => (typeof t === 'number' ? noteName(t) : t)),
    bass: bass.map((t) => (typeof t === 'number' ? noteName(t) : t)),
    chords,
  };
}

const barSlice = (r, line, b) => r[line].slice(b * r.steps, (b + 1) * r.steps);

// Phrase map: 4-bar blocks labelled by their lead line, so a returning
// theme (a ritornello, a chorus) shows up as the same letter.
export function phraseMap(r) {
  const blocks = [];
  const sig = (b0) => {
    const toks = [];
    for (let b = b0; b < Math.min(r.bars, b0 + 4); b += 1) toks.push(...barSlice(r, 'lead', b));
    return toks;
  };
  const same = (a, b) => {
    let hit = 0; let n = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
      if (a[i] === '_' && b[i] === '_') continue;
      n += 1;
      if (a[i] === b[i]) hit += 1;
    }
    return n && hit / n >= 0.75;
  };
  let next = 0;
  // after an upbeat the phrases start in bar 2
  if (r.pickup) blocks.push({ from: 1, to: 1, label: 'upbeat', silent: true, sig: [] });
  for (let b0 = r.pickup ? 1 : 0; b0 < r.bars; b0 += 4) {
    const s = sig(b0);
    const silent = s.every((t) => t === '.' || t === '_');
    const earlier = blocks.find((x) => !x.silent && same(x.sig, s));
    const label = silent ? '-' : earlier ? earlier.label : String.fromCharCode(65 + (next++ % 26));
    blocks.push({ from: b0 + 1, to: Math.min(r.bars, b0 + 4), label, silent, sig: s });
  }
  return blocks.map(({ from, to, label }) => `${from}-${to} ${label}`).join(', ');
}

// Bars from..to (1-based, inclusive) as text for the model.
export function barsText(r, from, to) {
  const out = [];
  for (let b = Math.max(1, from); b <= Math.min(r.bars, to); b += 1) {
    out.push(`bar ${b} [${r.chords[b - 1] || '-'}]\n  lead: ${barSlice(r, 'lead', b - 1).join(' ')}\n  bass: ${barSlice(r, 'bass', b - 1).join(' ')}`);
  }
  return out.join('\n');
}

export function overviewText(r) {
  return `meter ${r.meter}${r.sourceMeter !== r.meter ? ` (source ${r.sourceMeter})` : ''}, ${r.bpm} bpm (from the file, may be wrong), key ${r.key} ${r.mode === 'ionian' ? 'major' : r.mode === 'aeolian' ? 'minor' : r.mode}, ${r.bars} bars${r.pickup ? ` (starts with an upbeat: bar 1 holds only the pickup, the first full bar is bar 2)` : ''}
parts: ${r.parts.map((p) => `${p.index}: ${p.name} (${p.range}, ${p.notes} notes)`).join('; ')}
phrase map (4-bar blocks, same letter = same lead line): ${phraseMap(r)}`;
}

// A segment of the reduced score as material for one section.
export function extractMaterial(r, from, to) {
  const b0 = Math.max(1, Math.min(r.bars, from)) - 1;
  const b1 = Math.max(b0 + 1, Math.min(r.bars, to));
  const lead = r.lead.slice(b0 * r.steps, b1 * r.steps);
  const bass = r.bass.slice(b0 * r.steps, b1 * r.steps);
  // a line never starts with a hold
  if (lead[0] === '_') lead[0] = '.';
  if (bass[0] === '_') bass[0] = '.';
  return { lead, bass, chords: r.chords.slice(b0, b1).map((c) => c || null), bars: b1 - b0 };
}
