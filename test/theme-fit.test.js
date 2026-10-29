import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { answerToBrief } from '../src/gen/menu.js';
import { validateBrief } from '../src/gen/brief.js';
import { themeFit, themeFitText, themeFollowUp, THEME_FIT_GATE } from '../src/eval/theme-fit.js';

// A daily brief whose themes clash with their chords (song 64 % chord tones
// on strong beats) and the same answer without themes (generated melody).
const daily = JSON.parse(readFileSync(new URL('../data/daily-briefs/d-2026-10-28-a3.json', import.meta.url), 'utf8'));
const CLASH = daily.answer;
const PROMPT = daily.prompt;
const FITS = { ...CLASH, themes: [] };
const first = (answer) => ({ out: { answer, usage: { prompt_tokens: 100, completion_tokens: 50, cost: 0.02 } }, result: validateBrief(answerToBrief(answer, PROMPT)) });

describe('theme fit', () => {
  it('names the clashing themes, their bars, chords and off notes', () => {
    const { brief } = validateBrief(answerToBrief(CLASH, PROMPT));
    const fit = themeFit(brief, PROMPT);
    expect(fit.chordTone).toBeLessThan(THEME_FIT_GATE);
    expect(fit.misfits.length).toBeGreaterThan(0);
    const text = themeFitText(fit.misfits, brief);
    for (const m of fit.misfits) expect(text).toContain(`- ${m.section} theme over`);
    expect(text).toMatch(/bar \d over [ivIVb#\dMm]+ \([\d#b ]+\): [\d#b, ]+/);
    expect(text).toContain('Return the complete brief again');
  });

  it('leaves a song without themes or above the gate alone', () => {
    const { brief } = validateBrief(answerToBrief(FITS, PROMPT));
    expect(themeFit(brief, PROMPT).misfits).toEqual([]);
  });

  it('asks once with the answer and the problem, keeps a better retry', async () => {
    const calls = [];
    const ask = async (turns) => { calls.push(turns); return { answer: FITS, usage: { prompt_tokens: 120, completion_tokens: 40, cost: 0.03 } }; };
    const { result, usage } = await themeFollowUp({ prompt: PROMPT, ...first(CLASH), ask });
    expect(calls).toHaveLength(1);
    expect(calls[0].map((t) => t.role)).toEqual(['assistant', 'user']);
    expect(JSON.parse(calls[0][0].content).title).toBe(CLASH.title);
    expect(calls[0][1].content).toContain('do not fit the chords');
    expect(result.brief.themeRetry.kept).toBe('retry');
    expect(result.brief.themeRetry.after.themes).toEqual([]);
    expect(Object.keys(result.brief.themes)).toEqual([]);
    expect(usage).toEqual({ prompt_tokens: 220, completion_tokens: 90, cost: 0.05 });
  });

  it('keeps the first brief when the retry fails, is invalid or not better', async () => {
    for (const ask of [
      async () => { throw new Error('timeout'); },
      async () => ({ answer: { ...CLASH, sections: [] }, usage: null }),
      async () => ({ answer: CLASH, usage: null }),
    ]) {
      const f = first(CLASH);
      const { result } = await themeFollowUp({ prompt: PROMPT, ...f, ask });
      expect(result.brief.title).toBe(f.result.brief.title);
      expect(result.brief.themes).toEqual(f.result.brief.themes);
      expect(result.brief.themeRetry.kept).toBe('first');
    }
  });

  it('does not call the model for a fitting brief', async () => {
    const ask = async () => { throw new Error('must not be called'); };
    const { result } = await themeFollowUp({ prompt: PROMPT, ...first(FITS), ask });
    expect(result.brief.themeRetry).toBeUndefined();
  });
});
