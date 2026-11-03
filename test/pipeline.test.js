import { describe, expect, it } from 'vitest';
import { createPipeline, seededRand } from '../src/pipeline.js';
import { generator } from '../src/generator.js';
import { briefToAnswer } from '../src/gen/menu.js';
import { briefFromPrompt } from '../src/gen/compose.js';

const gen = generator;
const PROMPT = 'rainy night drive through a neon city';

const READING = {
  genres: [{ style: 'synthwave', weight: 0.7 }, { style: 'house', weight: 0.3 }],
  moods: [{ mood: 'melancholic', weight: 0.6 }, { mood: 'dreamy', weight: 0.4 }],
  energy: 0.5, valence: 0.4, tension: 0.3, sid_idiom: 0.4, arc: [], fixed: [], reference: '',
  interpretation: { kind: 'none', work: '', by: '' },
};
// a valid composer answer: a rule-based brief in the model's answer shape
const ANSWER = briefToAnswer(gen.validateBrief(briefFromPrompt(PROMPT, 1).brief).brief);

// a model stand-in: answers per role and records every call
function fakeLlm(answers) {
  const calls = [];
  const llm = async (req) => {
    calls.push(req);
    const a = answers[req.role];
    const answer = typeof a === 'function' ? a(calls.filter((c) => c.role === req.role).length) : a;
    if (answer instanceof Error) throw answer;
    return { answer, usage: { prompt_tokens: 1, completion_tokens: 1 } };
  };
  return { llm, calls };
}

describe('pipeline', () => {
  it('runs prompt to .sid with one reader and one composer call', async () => {
    const { llm, calls } = fakeLlm({ reader: READING, composer: ANSWER });
    const P = createPipeline({ gen, llm, rand: seededRand('test') });
    const steps = [];
    const song = await P.compose(PROMPT, { step: (s) => steps.push(s) });
    expect(steps).toEqual(['reading', 'composing', 'rendering']);
    expect(calls[0].role).toBe('reader');
    expect(calls.filter((c) => c.role === 'composer').length).toBeGreaterThanOrEqual(1);
    expect(song.understanding.genres.synthwave).toBeGreaterThan(0);
    expect(song.errors).toEqual([]);
    expect(song.tune.dsl).toContain('instrument ');
    expect(song.sid.bytes.length).toBeGreaterThan(1000);
    expect(song.request.user).toContain(PROMPT);
    expect(song.request.system).toBe(gen.systemPrompt());
  });

  it('draws the same constraints for the same seed', () => {
    const P1 = createPipeline({ gen, llm: null, rand: seededRand('x', 7) });
    const P2 = createPipeline({ gen, llm: null, rand: seededRand('x', 7) });
    expect(P1.draw({ prompt: PROMPT, count: 3 })).toEqual(P2.draw({ prompt: PROMPT, count: 3 }));
    expect(P1.draw({ prompt: PROMPT })[0].user).toContain(PROMPT);
  });

  it('uses given keys instead of drawing them, and none for a melody', () => {
    const P = createPipeline({ gen, rand: seededRand('k') });
    const three = P.draw({ prompt: PROMPT, count: 3, keys: ['C', 'Eb', 'A'] });
    expect(three.map((d) => d.constraints.find((c) => c.startsWith('Play in the key of')))).toEqual(['C', 'Eb', 'A'].map(gen.keyConstraint));
    const [withMelody] = P.draw({ prompt: PROMPT, melody: { notes: 'c4 d4 e4', section: 'chorus' } });
    expect(withMelody.constraints.some((c) => c.startsWith('Play in the key of'))).toBe(false);
  });

  it('falls back to the rule-based reading when the reader fails', async () => {
    const { llm } = fakeLlm({ reader: new Error('timeout'), composer: ANSWER });
    const log = [];
    const P = createPipeline({ gen, llm, log: (m) => log.push(m) });
    expect(await P.read(PROMPT)).toBeNull();
    expect(log[0]).toContain('timeout');
    const song = await P.compose(PROMPT);
    expect(song.understanding).toBeNull();
    expect(song.sid.bytes.length).toBeGreaterThan(1000);
  });

  it('sends validation errors back to the composer once', async () => {
    const { llm, calls } = fakeLlm({ reader: READING, composer: (n) => (n === 1 ? { ...ANSWER, sections: [] } : ANSWER) });
    const P = createPipeline({ gen, llm });
    const [drawn] = P.draw({ prompt: PROMPT });
    const out = await P.write({ prompt: PROMPT, user: drawn.user });
    const composer = calls.filter((c) => c.role === 'composer');
    expect(composer[1].user).toContain('Your previous brief had these problems');
    expect(out.errors).toEqual([]);
  });

  it('does not guess a named piece without research', async () => {
    const { llm } = fakeLlm({ reader: { ...READING, interpretation: { kind: 'work', work: 'Autumn', by: 'Vivaldi' } }, composer: ANSWER });
    const out = await createPipeline({ gen, llm }).compose("Vivaldi's Autumn on the C64");
    expect(out.notFound).toBe(true);
    expect(out.sid).toBeUndefined();
  });

  it('asks the critic and clamps its fit', async () => {
    const { llm, calls } = fakeLlm({ critic: { fit: 9, assessment: 'ok', issues: [], suggestion: '' } });
    const out = await createPipeline({ gen, llm }).critique({ prompt: PROMPT, description: 'x' });
    expect(calls[0].role).toBe('critic');
    expect(out.fit).toBe(5);
  });
});
