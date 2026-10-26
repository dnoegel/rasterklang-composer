import { describe, expect, it } from 'vitest';
import { METERS } from '../src/gen/library/meters.js';
import { GROOVES, FILLS } from '../src/gen/library/grooves.js';
import { BASS } from '../src/gen/library/bass.js';
import { CELLS, ARP_CELLS } from '../src/gen/library/cells.js';
import { PROGRESSIONS } from '../src/gen/library/progressions.js';
import { TEXTURES } from '../src/gen/library/textures.js';
import { FORMS, SECTION_ENERGY } from '../src/gen/library/forms.js';
import { STYLES } from '../src/gen/styles.js';
import { parseRoman } from '../src/gen/theory.js';
import { instrumentBlocks } from '../src/gen/instruments.js';
import { LEADS, BASSES, SNARES, KITS, HVSC_POOLS } from '../src/gen/library/palettes.js';

const steps = (m) => METERS[m].steps;

describe('library', () => {
  it('rows match their meter', () => {
    for (const [id, g] of Object.entries(GROOVES)) for (const r of g.levels) expect(r.length, id).toBe(steps(g.meter));
    for (const [m, list] of Object.entries(FILLS)) for (const f of list) expect(f.row.length, f.id).toBe(steps(m));
    for (const [id, b] of Object.entries(BASS)) expect(b.row.length, id).toBe(steps(b.meter));
    for (const [m, feels] of Object.entries(CELLS)) for (const cells of Object.values(feels)) for (const c of cells) expect(c.length, c).toBe(steps(m));
    for (const [m, cells] of Object.entries(ARP_CELLS)) for (const c of cells) expect(c.length).toBe(steps(m));
  });

  it('progressions parse', () => {
    for (const p of Object.values(PROGRESSIONS)) for (const c of p.chords) expect(() => parseRoman(c)).not.toThrow();
  });

  it('textures and forms are well formed', () => {
    for (const [id, t] of Object.entries(TEXTURES)) for (const [, roles] of t.stages) expect(roles, id).toMatch(/^[DBLAMCE-]{3}$/);
    // an echo needs the lead it repeats
    for (const [id, t] of Object.entries(TEXTURES)) for (const [, roles] of t.stages) if (roles.includes('E')) expect(roles, id).toContain('L');
    for (const f of Object.values(FORMS)) for (const [type] of f.sections) expect(SECTION_ENERGY[type]).toBeDefined();
  });

  it('styles reference existing entries', () => {
    for (const [id, s] of Object.entries(STYLES)) {
      for (const g of Object.keys(s.grooves)) expect(GROOVES[g], `${id} groove ${g}`).toBeDefined();
      for (const b of Object.keys(s.bass)) expect(BASS[b], `${id} bass ${b}`).toBeDefined();
      for (const p of Object.keys(s.progressions)) expect(PROGRESSIONS[p], `${id} progression ${p}`).toBeDefined();
      for (const kind of Object.values(s.textures)) for (const t of Object.keys(kind)) expect(TEXTURES[t], `${id} texture ${t}`).toBeDefined();
      for (const f of Object.keys(s.forms)) expect(FORMS[f], `${id} form ${f}`).toBeDefined();
      for (const l of Object.keys(s.palette.lead)) expect(LEADS[l], `${id} lead ${l}`).toBeDefined();
      for (const b of Object.keys(s.palette.bass)) expect(BASSES[b]).toBeDefined();
      for (const n of Object.keys(s.palette.snare)) expect(SNARES[n]).toBeDefined();
      const meters = Object.keys(s.meter);
      for (const g of s.signature.grooves || []) expect(meters).toContain(GROOVES[g].meter);
    }
  });

  it('all instruments compile into blocks', () => {
    expect(() => instrumentBlocks([...Object.keys(LEADS), ...Object.keys(BASSES), ...Object.keys(SNARES), 'kick', 'hat', 'crash', 'tom', 'tomhi', 'ohat'])).not.toThrow();
    const kits = Object.values(KITS).flatMap((k) => [k.kick, k.snare, k.hat]).filter(Boolean);
    expect(() => instrumentBlocks(kits)).not.toThrow();
    // echo and bend variants of every lead
    expect(() => instrumentBlocks(Object.keys(LEADS).flatMap((l) => [`${l}echo`, `${l}bend`, `${l}bendecho`]))).not.toThrow();
    for (const name of [...Object.keys(LEADS), ...Object.keys(BASSES), ...kits]) expect(name).not.toContain('_');
  });

  it('C64-style sound pools name known sounds', () => {
    for (const [family, pool] of Object.entries(HVSC_POOLS)) {
      for (const k of Object.keys(pool.kit || {})) expect(KITS[k], `${family} kit ${k}`).toBeDefined();
      for (const b of Object.keys(pool.bass || {})) expect(BASSES[b], `${family} bass ${b}`).toBeDefined();
      for (const l of Object.keys(pool.lead || {})) expect(LEADS[l], `${family} lead ${l}`).toBeDefined();
    }
  });
});
