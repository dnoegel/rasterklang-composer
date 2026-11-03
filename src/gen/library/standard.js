// The standard library of C64 sounds as instruments: basses, leads and
// drum kits under their own names, `std`
// plus role plus a number taken from the program itself (stdlead417,
// stdkit203 with stdkick203, stdsnare203), so a sound keeps its name when
// the library is rebuilt. A program that is already in the C64-style
// palette keeps that name instead of a copy. Every candidate
// compiles (CANDIDATE_*); only those in STANDARD_PASSED (written by
// a gate that checks each sound in a mix) join the palettes, the pools and the model's
// menu. Arps, pads and lone toms of the library do not fit V2's roles
// (arp sounds are per-chord presets) and are left out.

import { BASSS, LEADS, KITS } from './hvsc-library.js';
import { HVSC_DRUMS, HVSC_BASSES, HVSC_LEADS, HVSC_KITS } from './hvsc-instruments.js';
import { STANDARD_PASSED } from './standard-passed.js';

const norm = (body) => body.trim().replace(/\s+/g, ' ');

// a three-digit number from the program (FNV-1a), stable across rebuilds
function code(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return 100 + (h % 900);
}
// the id for a program of a role; a rare clash takes the next free number
function idFor(role, text, taken) {
  let n = code(norm(text));
  while (taken.has(`std${role}${n}`)) n = n === 999 ? 100 : n + 1;
  taken.add(`std${role}${n}`);
  return `std${role}${n}`;
}

// Waveforms of a body's wave line in order, repeats folded (noise, pulse).
function waves(body) {
  const line = /\n\s*wave ([^\n]*)/.exec(body);
  const out = [];
  for (const t of (line ? line[1] : '').split(/\s+/)) {
    const w = t.replace(/!\d+$/, '');
    if (w && w !== '0' && out[out.length - 1] !== w) out.push(w);
  }
  return out;
}
const adsrOf = (body) => (/\n\s*adsr (\d+) (\d+) (\d+) (\d+)/.exec(body) || []).slice(1).map(Number);

// A short description for the model's menu, from the program itself.
function describe(role, body, tags) {
  const w = waves(body);
  const noise = w[0] === 'noise';
  const tone = w.filter((x) => x !== 'noise').filter((x, i, a) => x !== a[i - 1]);
  const parts = [noise ? 'noise click into' : null, tone.length ? tone.join(' into ') : 'noise', role];
  const extras = [];
  if (!noise && w.includes('noise')) extras.push('noise blip');
  if (tags.includes('pulse sweep')) extras.push('width sweep');
  if (tags.includes('vibrato')) extras.push('vibrato');
  const [, , s] = adsrOf(body);
  if (s === 0) extras.push('percussive');
  return `${parts.filter(Boolean).join(' ')}${extras.length ? ` with ${extras.join(', ')}` : ''}`;
}

const knownBodies = new Map(Object.entries({ ...HVSC_DRUMS, ...Object.fromEntries(Object.entries({ ...HVSC_BASSES, ...HVSC_LEADS }).map(([id, v]) => [id, v.body])) }).map(([id, b]) => [norm(b), id]));

function pitched(lib, role) {
  const out = {};
  const taken = new Set();
  for (const x of Object.values(lib)) {
    if (knownBodies.has(norm(x.body))) continue;
    out[idFor(role, x.body, taken)] = { body: x.body.trimEnd(), description: describe(role, x.body, x.tags) };
  }
  return out;
}

export const CANDIDATE_BASSES = pitched(BASSS, 'bass');
export const CANDIDATE_LEADS = pitched(LEADS, 'lead');

// Kits: each drum is a new instrument unless the C64-style palette has its
// program already; a kit whose three drums all exist as one kit there is left out.
export const CANDIDATE_DRUMS = {};
export const CANDIDATE_KITS = {};
const takenKits = new Set();
Object.values(KITS).forEach((k) => {
  const kit = {};
  const descs = [];
  const kitId = idFor('kit', ['kick', 'snare', 'hat'].map((p) => k[p].body).join('|'), takenKits);
  const n = kitId.slice(6);
  for (const part of ['kick', 'snare', 'hat']) {
    const known = knownBodies.get(norm(k[part].body));
    const id = known || `std${part}${n}`;
    if (!known) CANDIDATE_DRUMS[id] = k[part].body.trimEnd();
    kit[part] = id;
    descs.push(`${waves(k[part].body).join('-')} ${part}`);
  }
  const same = Object.values(HVSC_KITS).some((m) => m.kick === kit.kick && m.snare === kit.snare && m.hat === kit.hat);
  if (!same) CANDIDATE_KITS[kitId] = { name: descs.join(', '), ...kit };
});

const passed = new Set(STANDARD_PASSED);
const keep = (obj) => Object.fromEntries(Object.entries(obj).filter(([id]) => passed.has(id)));
export const STANDARD_BASSES = keep(CANDIDATE_BASSES);
export const STANDARD_LEADS = keep(CANDIDATE_LEADS);
export const STANDARD_KITS = keep(CANDIDATE_KITS);
