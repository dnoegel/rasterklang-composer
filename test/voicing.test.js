import { describe, expect, it } from 'vitest';
import { drawVoicing, characterWeights, CHARACTERS } from '../src/gen/voicing.js';
import { drawArrangement, briefSchema, answerToBrief } from '../src/gen/menu.js';
import { validateBrief } from '../src/gen/brief.js';
import { ARPS, BASSES, KITS } from '../src/gen/library/palettes.js';
import { Rng } from '../src/gen/prng.js';

const rand = (key) => { const r = new Rng(key, 'test'); return () => r.next(); };

describe('drawn sounds for model briefs', () => {
  it('draws valid ids, a custom lead inside its character and a 4/4 arp rhythm', () => {
    for (const prompt of ['lullaby for a sleepy cat', 'boss fight in a neon arcade', 'funky disco', '']) {
      for (let i = 0; i < 20; i += 1) {
        const { voicing: v, lines } = drawVoicing(rand(`${prompt}|${i}`), prompt);
        expect(ARPS[v.arp]).toBeDefined();
        expect(BASSES[v.bass]).toBeDefined();
        expect(KITS[v.kit]).toBeDefined();
        const c = CHARACTERS[v.character];
        expect(c.wave).toContain(v.sound.wave);
        expect(v.sound.attack).toBeGreaterThanOrEqual(c.a[0]);
        expect(v.sound.attack).toBeLessThanOrEqual(c.a[1]);
        expect(v.arpRhythm).toMatch(/^[x_.]{16}$/);
        expect(lines).toHaveLength(3);
      }
    }
  });

  it('follows the prompt: calm prompts lean to soft characters, driving ones to hard', () => {
    const soft = characterWeights(-0.6, 0.2);
    const hard = characterWeights(0.6, 0.8);
    expect(soft.swelling).toBeGreaterThan(soft.biting * 4);
    expect(hard.biting).toBeGreaterThan(hard.swelling * 4);
  });

  it('is part of the drawn arrangement, and the model may answer with an arp sound', () => {
    const lines = drawArrangement(rand('x'), { prompt: 'funky disco' });
    expect(lines.some((l) => l.startsWith('Sounds: palette.arp'))).toBe(true);
    expect(briefSchema().properties.palette.required).toContain('arp');
    const { brief } = validateBrief(answerToBrief({
      title: 't', style: 'funk', meter: '4/4', key: 'C', mode: 'dorian', tempo: 110, moods: [],
      palette: { bass: 'slap', snare: 'snare', chords: 'triad', kit: 'std', arp: 'pluck' },
      sections: [{ type: 'verse', bars: 8, energy: 0.6, texture: 'full', groove: 'four_floor', bass: 'root_eighths', lead: 'pluck', chords: ['i', 'IV'] }],
    }, 'funky disco'));
    expect(brief.palette.arp).toBe('pluck');
  });
});

describe('first pass: the model reads the prompt, code draws', () => {
  it('cleans a reading and drops unknown ids', async () => {
    const { cleanUnderstanding } = await import('../src/gen/understand.js');
    const r = cleanUnderstanding({
      genres: [{ style: 'ambient', weight: 2 }, { style: 'nope', weight: 1 }, { style: 'cinematic', weight: 2 }],
      moods: [{ mood: 'melancholic', weight: 1 }], energy: 1.4, valence: 0.2, tension: 0.6, sid_idiom: 0.4, fixed: ['tempo', 'x'], reference: '',
    });
    expect(r.genres).toEqual({ ambient: 0.5, cinematic: 0.5 });
    expect(r.energy).toBe(1);
    expect(r.fixed).toEqual(['tempo']);
    expect(cleanUnderstanding({ genres: [] })).toBeNull();
  });

  it('draws the style from the candidates and leaves fixed fields to the prompt', () => {
    const understanding = { genres: { ambient: 0.5, cinematic: 0.5 }, moods: { melancholic: 1 }, energy: 0.2, valence: 0.2, tension: 0.5, sidIdiom: 0.9, fixed: ['tempo', 'lead'], reference: '' };
    const styles = new Set();
    for (let i = 0; i < 30; i += 1) {
      const lines = drawArrangement(rand(`u${i}`), { prompt: 'a lonely lighthouse in a storm', understanding });
      expect(lines.some((l) => l.startsWith('Set the tempo'))).toBe(false);
      expect(lines.some((l) => l.startsWith('Custom lead') || l.startsWith('Give the chorus the lead'))).toBe(false);
      styles.add(lines.find((l) => l.startsWith('Style:')).split(' ')[1]);
    }
    expect([...styles].sort()).toEqual(['ambient', 'cinematic']);
    const one = drawVoicing(rand('fixed'), 'Depeche Mode', { ...understanding, genres: { newwave: 0.8, indie: 0.2 }, fixed: ['style'] });
    expect(one.style).toBe('newwave');
    expect(one.lines.some((l) => l.startsWith('Style:'))).toBe(false);
  });
});
