import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { answerToBrief } from '../src/gen/menu.js';
import { composeBrief, compose } from '../src/gen/compose.js';
import { renderFrames } from '../src/gen/frames.js';
import { buildSid } from '../src/export/sid.js';

const DIR = join(import.meta.dirname, '..', 'examples', 'briefs');
const briefs = readdirSync(DIR).filter((f) => f.endsWith('.json')).sort()
  .map((f) => JSON.parse(readFileSync(join(DIR, f), 'utf8'))).filter((x) => x.answer).slice(0, 6);

//: "New variant" on an AI song lets code redraw the arrangement
describe('code variants of a model brief', () => {
  it('leaves seed 1 as the model wrote it', () => {
    const { prompt, answer } = briefs[0];
    const tune = composeBrief(answerToBrief(answer, prompt), { prompt, seed: 1 });
    expect(tune.brief.variant).toBeUndefined();
  });

  it('redraws key or arrangement but keeps style, mode, meter, chorus hook and chords', () => {
    for (const { prompt, answer } of briefs) {
      const base = composeBrief(answerToBrief(answer, prompt), { prompt, seed: 1 });
      const chorus = (t) => t.brief.sections.find((s) => s.type === 'chorus');
      let differs = 0;
      for (const seed of [2, 3, 4]) {
        const v = composeBrief(answerToBrief(answer, prompt), { prompt, seed });
        expect(v.brief.style).toBe(base.brief.style);
        expect(v.brief.mode).toBe(base.brief.mode);
        expect(v.brief.meter).toBe(base.brief.meter);
        expect(v.brief.sections.map((s) => s.type)).toEqual(base.brief.sections.map((s) => s.type));
        if (chorus(base)) expect(chorus(v).chords).toEqual(chorus(base).chords);
        if (base.brief.themes.chorus) expect(v.brief.themes.chorus.notes).toBe(base.brief.themes.chorus.notes);
        expect(v.measure.ok).toBe(true);
        const sig = (t) => JSON.stringify([t.plan.keyRoot, t.brief.tempo, t.brief.sections.map((s) => [s.groove, s.bass, s.texture, s.lead])]);
        if (sig(v) !== sig(base)) differs += 1;
        // the same seed replays the same variant (links, ratings, favourites)
        expect(composeBrief(answerToBrief(answer, prompt), { prompt, seed }).dsl).toBe(v.dsl);
      }
      expect(differs).toBe(3);
    }
  });

  it('keeps the key of a user melody and fits the .sid', () => {
    const { prompt, answer } = briefs[1];
    const brief = answerToBrief(answer, prompt);
    brief.themes = { ...brief.themes, verse: { notes: '1 _ 2 _ 3 _ 5 _ 3 _ 2 _ 1 _ _ _', user: true } };
    const v = composeBrief(brief, { prompt, seed: 2 });
    expect(v.plan.keyRoot).toBe(composeBrief(brief, { prompt, seed: 1 }).plan.keyRoot);
    expect(v.brief.themes.verse.user).toBe(true);
    const { frames, barStarts } = renderFrames(v.dsl, v.plan.totalBars);
    expect(buildSid(frames, barStarts, { title: 'x' }).complete).toBe(true);
  });

  it('does not touch rule-based songs (their seed already redraws everything)', () => {
    expect(compose('spooky dungeon loop', 3).brief.variant).toBeUndefined();
  });
});
