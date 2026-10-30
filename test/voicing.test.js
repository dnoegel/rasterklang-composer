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

describe('stories in phases and a mode per section', () => {
  const arc = [{ mood: 'tense', energy: 0.3, share: 0.6 }, { mood: 'triumphant', energy: 0.9, share: 0.4 }];
  const understanding = { genres: { cinematic: 1 }, moods: { tense: 1 }, energy: 0.6, valence: 0.4, tension: 0.6, sidIdiom: 0.3, arc, fixed: [], reference: '' };

  it('cleans an arc: at least two phases, shares summing to 1', async () => {
    const { cleanUnderstanding } = await import('../src/gen/understand.js');
    const base = { genres: [{ style: 'pop', weight: 1 }], moods: [], energy: 0.5, valence: 0.5, tension: 0.5, sid_idiom: 0.3, fixed: [], reference: '' };
    expect(cleanUnderstanding({ ...base, arc: [{ mood: 'calm', energy: 0.2, share: 1 }] }).arc).toEqual([]);
    const two = cleanUnderstanding({ ...base, arc: [{ mood: 'calm', energy: 0.2, share: 3 }, { mood: 'epic', energy: 0.9, share: 1 }] }).arc;
    expect(two.map((p) => p.share)).toEqual([0.75, 0.25]);
  });

  it('draws phases instead of a form, with a mode where the mood turns', () => {
    const lines = drawArrangement(rand('arc'), { prompt: 'scary, then relief', understanding });
    expect(lines.some((l) => l.startsWith('Form:'))).toBe(false);
    expect(lines.some((l) => l.startsWith('Give the chorus the lead'))).toBe(false);
    const story = lines.find((l) => l.startsWith('The prompt tells a story'));
    expect(story).toMatch(/phase 1 \(about 0-60 %.*tense.*mode (aeolian|dorian|phrygian)/);
    expect(story).toMatch(/phase 2 \(about 60-100 %.*triumphant.*mode (ionian|mixolydian|lydian)/);
  });

  it('plays a section in its own mode, and songs without one stay as they were', async () => {
    const { composeBrief } = await import('../src/gen/compose.js');
    const answer = {
      title: 't', style: 'cinematic', meter: '4/4', key: 'A', mode: 'aeolian', tempo: 100, moods: [{ mood: 'tense', weight: 1 }],
      palette: { bass: 'sub', snare: 'snare', chords: 'triad', kit: 'std', arp: 'pwm' },
      sections: [
        { type: 'verse', bars: 8, energy: 0.4, texture: 'full', groove: 'four_floor', bass: 'root_eighths', lead: 'whistle', chords: ['i', 'bVI', 'bVII', 'i'], mode: 'song' },
        { type: 'chorus', bars: 8, energy: 0.9, texture: 'full', groove: 'four_floor', bass: 'root_eighths', lead: 'brass', chords: ['I', 'IV', 'V', 'I'], mode: 'ionian' },
      ],
      themes: [],
    };
    const tune = composeBrief(answerToBrief(answer, 'p'), { prompt: 'p', seed: 1, withLead: true });
    const chorus = tune.plan.sections.find((s) => s.type === 'chorus');
    expect(chorus.mode).toBe('ionian');
    expect(tune.plan.sections[0].mode).toBe('aeolian');
    // lead notes of the chorus use the major third (C#), the verse the minor one (C)
    const pcs = (type) => new Set(tune.leadNotes.filter((n) => n.section === type).map((n) => n.pitch % 12));
    expect(pcs('chorus').size).toBeGreaterThan(2);
    expect(pcs('chorus').has(0)).toBe(false);
    expect(pcs('verse').has(1)).toBe(false);
    const plain = composeBrief(answerToBrief({ ...answer, sections: answer.sections.map((s) => ({ ...s, mode: 'song' })) }, 'p'), { prompt: 'p', seed: 1 });
    const without = composeBrief(answerToBrief({ ...answer, sections: answer.sections.map(({ mode, ...s }) => s) }, 'p'), { prompt: 'p', seed: 1 });
    expect(plain.dsl).toBe(without.dsl);
  });
});
