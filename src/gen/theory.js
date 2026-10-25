// Pitch helpers: scales, chord qualities, roman numerals.

export const NOTE_NAMES = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];
export const KEY_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

export function noteName(midi) {
  return `${NOTE_NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}

// Seven-note modes ordered from dark to bright, plus a few colours.
export const SCALES = {
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  ionian: [0, 2, 4, 5, 7, 9, 11],
  lydian: [0, 2, 4, 6, 7, 9, 11],
};

// Brightness of each mode, used by the descriptor's modeBrightness axis.
export const MODE_BRIGHTNESS = {
  phrygian: 0.05, harmonic: 0.15, aeolian: 0.3, dorian: 0.45, mixolydian: 0.7, ionian: 0.85, lydian: 0.95,
};

export const MINOR_MODES = new Set(['phrygian', 'harmonic', 'aeolian', 'dorian']);

export const CHORD_TONES = {
  M: [0, 4, 7],
  m: [0, 3, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  5: [0, 7, 12],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  M7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  7: [0, 4, 7, 10],
};

const ROMAN = { i: 0, ii: 1, iii: 2, iv: 3, v: 4, vi: 5, vii: 6 };

// Roman numeral relative to the tonic, read chromatically against the
// major scale: "bVI" = 8 semitones, "iv" = 5 semitones, minor. Quality
// suffixes: "7", "M7", "m7", "5", "sus4", "dim", "+".
export function parseRoman(symbol) {
  const m = /^([b#]?)([ivIV]+)(.*)$/.exec(symbol);
  if (!m) throw new Error(`bad roman numeral ${symbol}`);
  const [, acc, num, suffix] = m;
  const degree = ROMAN[num.toLowerCase()];
  if (degree === undefined) throw new Error(`bad roman numeral ${symbol}`);
  let semis = SCALES.ionian[degree] + (acc === 'b' ? -1 : acc === '#' ? 1 : 0);
  semis = (semis + 12) % 12;
  const minor = num === num.toLowerCase();
  let quality = minor ? 'm' : 'M';
  if (suffix === '7') quality = minor ? 'm7' : '7';
  else if (suffix === 'M7') quality = 'M7';
  else if (suffix === 'dim' || suffix === 'o') quality = 'dim';
  else if (suffix === '5') quality = '5';
  else if (suffix === 'sus4') quality = 'sus4';
  else if (suffix === 'sus2') quality = 'sus2';
  else if (suffix === '+') quality = 'aug';
  return { semis, quality, symbol };
}

// Absolute chord: root pitch class and tone pitch classes.
export function chordAt(keyRoot, symbol) {
  const { semis, quality } = parseRoman(symbol);
  const root = (keyRoot + semis) % 12;
  return { root, quality, symbol, tones: CHORD_TONES[quality].map((t) => (root + t) % 12) };
}

// All MIDI notes of a scale between lo and hi.
export function scaleNotes(keyRoot, scale, lo, hi) {
  const out = [];
  const pcs = SCALES[scale];
  for (let n = lo; n <= hi; n += 1) if (pcs.includes((((n - keyRoot) % 12) + 12) % 12)) out.push(n);
  return out;
}

export function nearestIndex(list, value) {
  let best = 0;
  for (let i = 1; i < list.length; i += 1) if (Math.abs(list[i] - value) < Math.abs(list[best] - value)) best = i;
  return best;
}

// Chord name ("Am7", "F#", "Bbmaj7", "Gsus4", "E5", "Bdim") -> roman
// numeral against the key, for briefs that write names instead of degrees.
const ROMAN_UP = ['I', 'bII', 'II', 'bIII', 'III', 'IV', 'bV', 'V', 'bVI', 'VI', 'bVII', 'VII'];
export function chordNameToRoman(name, keyRoot) {
  const m = /^([A-Ga-g])([#b]?)(maj7|M7|m7|min7|m|min|dim|o|aug|\+|sus2|sus4|5|7)?$/.exec(String(name).trim());
  if (!m) return null;
  const base = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }[m[1].toLowerCase()];
  const pc = (base + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
  const q = m[3] || '';
  let roman = ROMAN_UP[(pc - keyRoot + 12) % 12];
  const minor = ['m', 'min', 'm7', 'min7', 'dim', 'o'].includes(q);
  if (minor) roman = roman.replace(/[IV]+/, (r) => r.toLowerCase());
  const suffix = { maj7: 'M7', M7: 'M7', m7: '7', min7: '7', 7: '7', dim: 'dim', o: 'dim', aug: '+', '+': '+', sus2: 'sus2', sus4: 'sus4', 5: '5' }[q] || '';
  return roman + suffix;
}
