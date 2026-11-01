// Which instrument plays which part (lead, bass, drums, ...), for the mix
// measurement in src/eval/mix.js. Read-only knowledge: nothing here changes
// the DSL. Derived variants follow their base instrument (`leadbend`,
// `belltop`) except echoes, which are their own role.

import { isDrum } from './instruments.js';
import { LEADS, BASSES, CUSTOM_LEAD } from './library/palettes.js';

export const ROLES = ['lead', 'bass', 'drums', 'arp', 'echo', 'counter', 'pad', 'other'];

const SUFFIXES = ['echo', 'bend', 'top', 'hold'];

// Instrument name without a derived-variant suffix, if the rest is a known instrument.
export function baseName(name) {
  for (const s of SUFFIXES) {
    if (name.endsWith(s) && name.length > s.length) {
      const base = name.slice(0, -s.length);
      if (roleOfInstrument(base) !== 'other') return base;
    }
  }
  return name;
}
// the instrument without any chain of suffixes (belltophold -> bell)
export function rootName(name) {
  let n = name;
  for (let b = baseName(n); b !== n; b = baseName(n)) n = b;
  return n;
}

export function roleOfInstrument(name) {
  if (!name) return 'other';
  if (isDrum(name)) return 'drums';
  if (BASSES[name]) return 'bass';
  if (/^arp[A-Z]/.test(name)) return 'arp';
  if (name === 'counter') return 'counter';
  if (LEADS[name] || name === CUSTOM_LEAD) return 'lead';
  if (name.endsWith('echo') && roleOfInstrument(baseName(name)) !== 'other') return 'echo';
  const base = baseName(name);
  return base === name ? 'other' : roleOfInstrument(base);
}

// Instrument name -> role for a list of names.
export const roleMap = (names) => Object.fromEntries([...names].map((n) => [n, roleOfInstrument(n)]));

// Per voice, per bar, per step: the instrument that starts a note there, '_'
// for a hold, '' for a rest. `bars` holds each bar's role letters per voice
// (D B L A M C E -) as arranged, after echo and cap adjustments.
export function roleTimeline(voices, bars) {
  const names = new Set();
  const cells = voices.map((vb) => vb.map((bar) => bar.map((c) => {
    if (c.inst) { names.add(c.inst); return c.inst; }
    return c.tok === '_' ? '_' : '';
  })));
  return { map: roleMap(names), bars, voices: cells };
}
