// The SID-idiom spectrum. 0: a genre played faithfully on the
// SID, the chip only the instrument. 1: fully C64-native, as the classic
// game and demo composers wrote (the world of an earlier prototype): bass
// in constant motion, chord arpeggios as a main voice, quick runs, echo,
// octave/ring/sync leads, a driving beat. No modes: the value weights the
// building blocks tagged c64, so songs move along a spectrum.

import { BASS } from './library/bass.js';
import { GROOVES } from './library/grooves.js';

// Where a style sits by itself; the prompt moves it.
export const STYLE_IDIOM = {
  demoscene: 0.9, platformer: 0.8, synthwave: 0.6, dance: 0.55, dnb: 0.5, newwave: 0.45, metal: 0.35, cinematic: 0.35,
  ambient: 0.3, pop: 0.3, punk: 0.3, funk: 0.3, hardrock: 0.25, indie: 0.25, poprock: 0.25, hiphop: 0.25, march: 0.25,
  alt: 0.2, lofi: 0.2, doom: 0.2, ragtime: 0.2, classical: 0.2, reggae: 0.15, waltz: 0.15, jig: 0.15,
  blues: 0.1, jazz: 0.1, bossa: 0.1, folk: 0.1, country: 0.1,
};

// Words that pull a prompt towards the native idiom, and away from it.
const TOWARDS = ['arcade', 'video game', 'game', 'level', 'boss', 'pixel', '8-bit', '8 bit', 'chip', 'retro', 'c64', 'commodore', 'sid',
  'demo', 'cracktro', 'loader', 'loading', 'tape', 'floppy', 'disk', 'joystick', 'sprite', 'hacker', 'cyber', 'neon', 'laser', 'robot',
  'android', 'space', 'galaxy', 'asteroid', 'starship', 'alien', 'rave', 'techno', 'trance', 'computer', 'terminal', 'glitch',
  'power-up', 'high score', 'highscore', 'insert coin', 'speedrun', 'console', 'synth', 'machine',
  // German prompts
  'spiel', 'videospiel', 'computerspiel', 'spielhalle', 'diskette', 'kassette', 'datasette', 'roboter', 'weltraum', 'weltall',
  'raumschiff', 'außerirdische', 'maschine'];
const AWAY = ['acoustic', 'unplugged', 'orchestra', 'orchestral', 'choir', 'string quartet', 'strings', 'piano', 'church', 'campfire',
  'lullaby', 'wedding', 'ballroom', 'tavern', 'bluegrass', 'live band', 'jazz club',
  'akustisch', 'orchester', 'chor', 'streicher', 'klavier', 'kirche', 'lagerfeuer', 'wiegenlied', 'schlaflied', 'hochzeit',
  'ballsaal', 'kneipe', 'taverne'];

const hits = (text, words) => words.filter((w) => new RegExp(`(^|[^a-z])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}s?([^a-z]|$)`).test(text)).length;
const clamp = (x) => Math.max(0, Math.min(1, x));

// rule-based estimate; named: did the prompt name the style (else it came
// from the mood, and imagery prompts spread across the spectrum)
export function estimateIdiom(prompt, styleId, { named = true, rand = Math.random } = {}) {
  const text = ` ${String(prompt).toLowerCase()} `;
  let x = STYLE_IDIOM[styleId] ?? 0.3;
  x += Math.min(0.5, hits(text, TOWARDS) * 0.2) - Math.min(0.4, hits(text, AWAY) * 0.2);
  if (!named) x += (rand() - 0.5) * 0.5;
  return Math.round(clamp(x) * 100) / 100;
}

// The building blocks that carry the native idiom.
export const C64_LEADS = ['octave', 'ring', 'sync', 'square', 'warble'];
export const C64_TEXTURES = ['multiplex', 'groove_chords', 'echo_lead', 'counter'];
export const C64_FEELS = ['running', 'sid'];
export const isC64Bass = (id) => Boolean(BASS[id]?.tags?.includes('c64'));
export const isC64Groove = (id) => Boolean(GROOVES[id]?.tags?.some((t) => t === 'c64' || t === 'sid'));

// A pool weighted along the spectrum: native blocks gain with the idiom,
// added at `extra` times the idiom squared when the pool lacks them (so a
// genre song keeps its own palette); the others lose a little at the
// native end.
export function alongIdiom(pool, idiom, isNative, candidates = [], extra = 1) {
  if (idiom === null || idiom === undefined) return pool;
  const out = {};
  for (const [id, w] of Object.entries(pool)) out[id] = w * (isNative(id) ? 1 + 2 * idiom : 1 - 0.5 * idiom);
  for (const id of candidates) if (!(id in out)) out[id] = extra * idiom * idiom;
  return out;
}
