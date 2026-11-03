// Style hints per genre and artist fingerprints (library/hvsc.js):
// statistics on how C64 arrangements of known music are built. Approximate.

import { GENRE_HINTS, ARTISTS } from './library/hvsc.js';
import { SCALES, MINOR_MODES } from './theory.js';

// The strongest-supported genre hint for a style.
export function styleHint(styleId) {
  let best = null;
  for (const h of Object.values(GENRE_HINTS)) if (h.style === styleId && (!best || h.tunes > best.tunes)) best = h;
  return best;
}

function wordMatch(text, name) {
  const w = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-zäöüß0-9])${w}($|[^a-zäöüß0-9])`, 'i').test(text);
}

// An artist named in the prompt, if the inventory has a fingerprint.
export function findArtist(prompt) {
  const text = ` ${String(prompt).toLowerCase()} `;
  let best = null;
  for (const [name, a] of Object.entries(ARTISTS)) {
    for (const n of a.names) {
      if (n.length >= 4 && wordMatch(text, n) && (!best || n.length > best.match.length)) best = { name, match: n, ...a };
    }
  }
  return best;
}

// Mode weights nudged toward a target minor share (half way by default).
export function nudgeModes(modes, target, weight = 0.5) {
  if (target === null || target === undefined) return modes;
  const minor = Object.entries(modes).filter(([m]) => MINOR_MODES.has(m)).reduce((s, [, w]) => s + w, 0);
  const major = Object.entries(modes).filter(([m]) => !MINOR_MODES.has(m)).reduce((s, [, w]) => s + w, 0);
  if (!minor || !major) return modes;
  const now = minor / (minor + major);
  const want = Math.min(0.95, Math.max(0.05, now + (target - now) * weight));
  const b = (minor * (1 - want)) / (want * major); // scale factor for major modes
  return Object.fromEntries(Object.entries(modes).map(([m, w]) => [m, MINOR_MODES.has(m) ? w : w * b]));
}

// "I-I-bVI-bVII" (bass roots against the key) -> roman numerals with the
// triad quality the mode gives each degree (borrowed degrees stay major).
const DEG = { I: 0, bII: 1, II: 2, bIII: 3, III: 4, IV: 5, bV: 6, V: 7, bVI: 8, VI: 9, bVII: 10, VII: 11 };
export function loopToRomans(loop, mode) {
  const scale = SCALES[mode] || SCALES.ionian;
  return loop.split('-').map((d) => {
    const s = DEG[d];
    if (s === undefined) return null;
    const idx = scale.indexOf(s);
    if (idx < 0) return d; // borrowed: major
    const third = (scale[(idx + 2) % 7] - s + 12) % 12;
    const fifth = (scale[(idx + 4) % 7] - s + 12) % 12;
    if (third === 3 && fifth === 6) return `${d.toLowerCase()}dim`;
    return third === 3 ? d.toLowerCase() : d;
  }).filter(Boolean);
}

export function artistSummary(a) {
  return `Data from ${a.tunes} C64 arrangements of music by ${a.name} (HVSC): ${Math.round(a.minorShare * 100)} % in minor; `
    + `drums in ${Math.round(a.drums * 100)} % of bars, arpeggios in ${Math.round(a.arp * 100)} %; `
    + `typical drum rows ${a.drumRows.join(' | ') || 'n/a'}; bass rows ${a.bassRows.join(' | ') || 'n/a'}; `
    + `bass-root loops ${a.loops.join(' | ') || 'n/a'}; lead rhythm cells ${a.cells.join(' | ') || 'n/a'}.`;
}
