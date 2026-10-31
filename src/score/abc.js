// ABC notation (folk tunes, The Session, abcnotation.com) -> the score
// shape reduceScore reads. One melody line: header fields M, L,
// K, Q; notes with accidentals, octaves, lengths, broken rhythm, triplets,
// ties, rests; repeats and first/second endings are played out. Chord
// symbols, grace notes and decorations are skipped.

const PPQ = 480;
const STEP_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const MODE_SHIFT = { maj: 0, ion: 0, '': 0, m: -3, min: -3, aeo: -3, mix: -1, dor: -2, phr: -4, lyd: 1, loc: -5 };
const ORDER_SHARPS = 'FCGDAEB';

// "Edor" -> sharps (+) or flats (-) of the key signature
function keyFifths(k) {
  const m = /^([A-G])([#b]?)\s*([a-zA-Z]*)/.exec(k.trim());
  if (!m) return { fifths: 0, minor: false, root: 0, mode: 'ionian' };
  const tonicFifths = { C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, F: -1 }[m[1]] + (m[2] === '#' ? 7 : m[2] === 'b' ? -7 : 0);
  const mode = m[3].toLowerCase().slice(0, 3);
  const shift = MODE_SHIFT[mode] ?? (mode.startsWith('m') ? -3 : 0);
  const root = (STEP_PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
  const modeName = { '-3': 'aeolian', '-1': 'mixolydian', '-2': 'dorian', '-4': 'phrygian', 1: 'lydian', '-5': 'aeolian' }[shift] || 'ionian';
  return { fifths: tonicFifths + shift, minor: shift === -3, root, mode: modeName };
}
function signature(fifths) {
  const acc = {};
  if (fifths > 0) for (let i = 0; i < Math.min(7, fifths); i += 1) acc[ORDER_SHARPS[i]] = 1;
  if (fifths < 0) for (let i = 0; i < Math.min(7, -fifths); i += 1) acc[ORDER_SHARPS[6 - i]] = -1;
  return acc;
}
const frac = (s) => {
  const m = /^(\d+)\/(\d+)$/.exec(s.trim());
  return m ? Number(m[1]) / Number(m[2]) : null;
};

// Repeats as written: |: ... :| twice, [1 ... :| [2 ... the second time.
function expandRepeats(body) {
  const tokens = body.replace(/::/g, ':||:').split(/(\|\]|\|\||\[\||:\||\|:|\|\s*\[?[12]|\[[12]|\|)/);
  const out = [];
  let start = 0;
  let pass1End = null;
  let inEnding = 0;
  const seq = [];
  for (const t of tokens) {
    const tt = t.replace(/\s/g, '');
    if (tt === '|:' ) { start = seq.length; pass1End = null; seq.push('|'); continue; }
    if (/^\|?\[?1$/.test(tt)) { pass1End = seq.length; inEnding = 1; seq.push('|'); continue; }
    if (/^\|?\[?2$/.test(tt)) { inEnding = 2; continue; }
    if (tt === ':|') {
      // replay from the repeat start, skipping a first ending
      const again = seq.slice(start, pass1End ?? seq.length);
      seq.push('|', ...again);
      start = seq.length;
      pass1End = null;
      inEnding = 0;
      continue;
    }
    if (tt === '|' || tt === '||' || tt === '|]' || tt === '[|') { seq.push('|'); if (inEnding === 2) inEnding = 0; continue; }
    seq.push(t);
  }
  out.push(...seq);
  return out.join('');
}

export function abcScore(source) {
  const lines = String(source).split(/\r?\n/);
  let meter = '4/4';
  let unit = null;
  let key = 'C';
  let bpm = null;
  let title = '';
  const body = [];
  let inBody = false;
  for (const raw of lines) {
    const line = raw.replace(/%.*$/, '');
    const h = /^([A-Za-z]):\s*(.*)$/.exec(line);
    if (h && (!inBody || 'MLKQ'.includes(h[1]))) {
      const [, f, v] = h;
      if (f === 'M') meter = v.trim() === 'C' ? '4/4' : v.trim() === 'C|' ? '2/2' : v.trim();
      else if (f === 'L') unit = frac(v);
      else if (f === 'K') { key = v; inBody = true; }
      else if (f === 'T' && !title) title = v.trim();
      else if (f === 'Q') { const q = /(\d+)\s*$/.exec(v); if (q) bpm = Number(q[1]); }
      continue;
    }
    if (inBody || !h) body.push(line);
  }
  const [num, den] = meter.split('/').map(Number);
  if (!unit) unit = num / den < 0.75 ? 1 / 16 : 1 / 8;
  const { fifths, minor, root, mode } = keyFifths(key);
  const sig = signature(fifths);
  const text = expandRepeats(body.join(' ')
    .replace(/"[^"]*"/g, ' ')
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/![^!\s]*!/g, ' ')
    .replace(/\+[^+\s]*\+/g, ' ')
    .replace(/\[[A-Za-z]:[^\]]*\]/g, ' '));
  const notes = [];
  let tick = 0;
  let barAcc = {};
  let tuplet = null;
  let pendingBroken = null;
  let last = null;
  let tie = false;
  const re = /(\|)|\((\d)|([<>]+)|(-)|(\[)|(\])|([=^_]*)([A-Ga-gzx])([,']*)(\d*\/*\d*)/g;
  let m;
  let chordStart = null;
  while ((m = re.exec(text))) {
    if (m[1]) { barAcc = {}; continue; }
    if (m[2]) { const n = Number(m[2]); tuplet = { left: n, ratio: n === 3 ? 2 / 3 : n === 2 ? 3 / 2 : n === 4 ? 3 / 4 : 2 / 3 }; continue; }
    if (m[3]) { pendingBroken = m[3]; continue; }
    if (m[4]) { tie = true; continue; }
    if (m[5]) { chordStart = tick; continue; }
    if (m[6]) { chordStart = null; continue; }
    const acc = m[7];
    const letter = m[8];
    const octs = m[9];
    const len = m[10];
    let mult = 1;
    if (len) {
      const parts = /^(\d*)(\/*)(\d*)$/.exec(len);
      const a = parts[1] ? Number(parts[1]) : 1;
      const slashes = parts[2].length;
      const b = parts[3] ? Number(parts[3]) : 2 ** slashes;
      mult = slashes ? a / b : a;
    }
    let dur = unit * 4 * mult * PPQ;
    if (tuplet) { dur *= tuplet.ratio; tuplet.left -= 1; if (tuplet.left <= 0) tuplet = null; }
    if (pendingBroken && last) {
      // a> b: the first dotted, the second halved (>> double-dotted)
      const k = pendingBroken.length;
      const f = 1 - 0.5 ** k;
      const shift = (pendingBroken[0] === '>' ? 1 : -1) * last.dur * f;
      last.dur += shift;
      tick += shift;
      dur -= shift * (dur / (last.dur - shift));
      pendingBroken = null;
    }
    const start = chordStart ?? tick;
    if (letter === 'z' || letter === 'x') {
      if (chordStart === null) tick += dur;
      last = null;
      continue;
    }
    const upper = letter.toUpperCase();
    let pitch = 60 + STEP_PC[upper] + (letter === upper ? 0 : 12);
    for (const c of octs) pitch += c === ',' ? -12 : 12;
    let alter;
    if (acc) {
      alter = [...acc].reduce((a, c) => a + (c === '^' ? 1 : c === '_' ? -1 : 0), 0);
      barAcc[`${upper}${pitch}`] = alter;
    } else alter = barAcc[`${upper}${pitch}`] ?? sig[upper] ?? 0;
    pitch += alter;
    if (tie && last && last.pitch === pitch) { last.dur += dur; tie = false; if (chordStart === null) tick += dur; continue; }
    tie = false;
    const note = { pitch, start: Math.round(start), dur: Math.round(dur) };
    if (chordStart === null || !notes.length || notes[notes.length - 1].start !== note.start || note.pitch > notes[notes.length - 1].pitch) notes.push(note);
    last = note;
    if (chordStart === null) tick += dur;
  }
  return { ppq: PPQ, num: num || 4, den: den || 4, bpm: bpm || null, fifths, minor, keyRoot: root, mode, title, parts: [{ name: 'melody', notes }] };
}
