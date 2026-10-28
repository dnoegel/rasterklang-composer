import { describe, expect, it } from 'vitest';
import { estimateIdiom, alongIdiom, C64_LEADS, isC64Bass } from '../src/gen/idiom.js';
import { compose } from '../src/gen/compose.js';
import { briefSchema, systemPrompt } from '../src/gen/menu.js';
import { LEADS } from '../src/gen/library/palettes.js';

describe('SID-idiom spectrum', () => {
  it('reads the prompt: genres low, C64 worlds high', () => {
    expect(estimateIdiom('lazy bossa nova on a sunny afternoon', 'bossa')).toBeLessThan(0.25);
    expect(estimateIdiom('neon arcade boss rush', 'platformer')).toBeGreaterThan(0.8);
    expect(estimateIdiom('Roboter im Weltraum', 'ambient')).toBeGreaterThan(estimateIdiom('Wolken am Himmel', 'ambient'));
    expect(estimateIdiom('Wiegenlied mit Klavier', 'waltz')).toBe(0);
    expect(estimateIdiom('bossa nova on a sunny day', 'bossa')).toBe(estimateIdiom('nova on a sunny day', 'bossa')); // "bossa" is not "boss"
  });

  it('weights native blocks up with the idiom and keeps a genre palette at the low end', () => {
    const pool = { brass: 1, bell: 1 };
    const low = alongIdiom(pool, 0.1, (l) => C64_LEADS.includes(l), C64_LEADS, 0.8);
    const high = alongIdiom(pool, 0.9, (l) => C64_LEADS.includes(l), C64_LEADS, 0.8);
    expect(low.ring).toBeLessThan(0.01);
    expect(high.ring).toBeGreaterThan(high.brass);
    for (const l of C64_LEADS) expect(LEADS[l]).toBeDefined();
  });

  it('rule-based songs follow the spectrum', () => {
    const native = compose('neon arcade boss rush', 1);
    const genre = compose('lazy bossa nova on a sunny afternoon', 1);
    expect(native.brief.sidIdiom).toBeGreaterThan(genre.brief.sidIdiom);
    expect(native.brief.sections.some((s) => isC64Bass(s.bass))).toBe(true);
    expect(genre.brief.sections.every((s) => !isC64Bass(s.bass) || s.type !== 'chorus')).toBe(true);
  });

  it('the model places each song on the spectrum', () => {
    expect(briefSchema().required).toContain('sid_idiom');
    expect(systemPrompt()).toContain('(C64)');
    expect(systemPrompt()).not.toContain('do not turn it into retro');
  });
});
