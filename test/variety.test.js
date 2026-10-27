import { describe, expect, it } from 'vitest';
import { compose, composeBrief } from '../src/gen/compose.js';
import { answerToBrief, briefSchema, briefToAnswer, themeExampleFor, userPrompt } from '../src/gen/menu.js';
import { validateBrief } from '../src/gen/brief.js';
import { CELLS, CELL_VARIANTS } from '../src/gen/library/cells.js';
import { METERS } from '../src/gen/library/meters.js';
import { fingerprint, jaccard } from '../src/gen/variety.js';

const PROMPTS = ['happy platformer level', 'melancholic rainy night synthwave', 'high energy metal with a melodic chorus', 'Celtic jig for a tavern', 'sad waltz music box'];

describe('melody variety', () => {
  it('keeps exact bar repeats inside a section rare and changes repeated sections', () => {
    const tunes = PROMPTS.flatMap((p) => [1, 2].map((s) => compose(p, s)));
    const mean = (f) => tunes.reduce((a, t) => a + f(t), 0) / tunes.length;
    expect(mean((t) => t.variety.withinRepeat)).toBeLessThan(0.15);
    const rep = tunes.filter((t) => t.variety.repeatSame !== null);
    expect(rep.length).toBeGreaterThan(3);
    // recognisable (heads stay) but not a copy
    const same = rep.reduce((a, t) => a + t.variety.repeatSame, 0) / rep.length;
    expect(same).toBeGreaterThan(0.3);
    expect(same).toBeLessThan(0.75);
    for (const t of tunes) expect(t.measure.ok).toBe(true);
  });

  it('derives cell variants of the right length that are not library cells', () => {
    for (const [meter, feels] of Object.entries(CELL_VARIANTS)) {
      const lib = new Set(Object.values(CELLS[meter]).flat());
      for (const cells of Object.values(feels)) {
        for (const c of cells) {
          expect(c).toHaveLength(METERS[meter].steps);
          expect(lib.has(c)).toBe(false);
          expect(c).toMatch(/^[x.][x_.]*$/);
        }
      }
    }
  });

  it('plays a brief variation and validates unknown ones away', () => {
    const base = compose('happy pop song', 3).brief;
    const answer = briefToAnswer(base);
    const choruses = answer.sections.filter((s) => s.type === 'chorus');
    expect(choruses.length).toBeGreaterThan(1);
    const render = (variation) => {
      const a = structuredClone(answer);
      for (const s of a.sections) { s.variation = variation; s.transpose = 0; }
      return composeBrief(answerToBrief(a, 'happy pop song'), { prompt: 'happy pop song', seed: 1 });
    };
    expect(render('exact').variety.repeatSame).toBe(1);
    expect(render('octave').variety.repeatSame).toBeLessThan(0.7);
    expect(render('sequence').variety.repeatSame).toBeLessThan(1);
    const { brief } = validateBrief({ ...base, sections: base.sections.map((s) => ({ ...s, variation: 'loud' })) });
    expect(brief.sections.every((s) => s.variation === undefined)).toBe(true);
  });

  it('never changes a user melody', () => {
    const answer = briefToAnswer(compose('happy pop song', 3).brief);
    const notes = '1 _ 2 _ 3 _ 5 _ 3 _ 2 _ 1 _ _ _ 5 _ 4 _ 3 _ 2 _ 1 _ _ _ . . . .';
    const brief = answerToBrief({ ...answer, themes: [] }, 'x');
    brief.themes = { chorus: { notes, user: true } };
    for (const s of brief.sections) if (s.type === 'chorus') s.variation = 'sequence';
    const tune = composeBrief(brief, { prompt: 'x', seed: 1, withLead: true });
    const chorusBars = tune.plan.sections.filter((s) => s.type === 'chorus');
    const pitchesOf = (s) => tune.leadNotes.filter((n) => n.bar >= s.startBar && n.bar < s.startBar + 2).map((n) => n.pitch);
    expect(pitchesOf(chorusBars[1])).toEqual(pitchesOf(chorusBars[0]));
  });

  it('offers the variation field to the model and rotates the hook example', () => {
    const props = briefSchema().properties.sections.items;
    expect(props.required).toContain('variation');
    expect(props.properties.variation.enum).toContain('ornament');
    const examples = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((x) => themeExampleFor([x])));
    expect(examples.size).toBeGreaterThan(2);
    expect(userPrompt('p', ['c1'])).toContain(themeExampleFor(['c1']));
  });

  it('compares songs by fingerprint', () => {
    const a = compose('happy platformer level', 1, { withLead: true });
    const b = compose('spooky dungeon loop', 1, { withLead: true });
    const fa = fingerprint(a.plan, a.leadNotes);
    expect(jaccard(fa.rhythms, fa.rhythms)).toBe(1);
    expect(jaccard(fa.grams, fingerprint(b.plan, b.leadNotes).grams)).toBeLessThan(0.5);
  });
});
