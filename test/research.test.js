import { describe, it, expect, vi } from 'vitest';

// a scripted composer: search, load, look at bars, submit
const script = [
  [{ name: 'search_scores', args: { query: 'vivaldi autumn' } }],
  [{ name: 'load_score', args: { id: 'mutopia:x' } }],
  [{ name: 'show_bars', args: { id: 'mutopia:x', file: 0, from_bar: 1, to_bar: 2 } }],
  [{ name: 'submit_material', args: { work: 'Autumn', by: 'Vivaldi', tempo: 100, source: 'score', segments: [{ id: 'B', score_id: 'nope', file: 0, from_bar: 1, to_bar: 2 }] } }],
  [{ name: 'submit_material', args: { work: 'Autumn', by: 'Vivaldi', tempo: 100, source: 'Mutopia', segments: [{ id: 'A', label: 'theme', score_id: 'mutopia:x', file: 0, from_bar: 1, to_bar: 2 }] } }],
];
const seen = [];
vi.mock('../tools/openrouter.mjs', () => ({
  chatStep: async ({ messages }) => {
    seen.push(messages[messages.length - 1]);
    const turn = script.shift();
    return { message: { role: 'assistant', content: null, tool_calls: turn.map((t, i) => ({ id: `c${seen.length}${i}`, type: 'function', function: { name: t.name, arguments: JSON.stringify(t.args) } })) } };
  },
  webSearch: async () => ({ text: 'none' }),
}));
vi.mock('../scores.mjs', async () => {
  const { reduceScore } = await import('../src/score/reduce.js');
  const notes = Array.from({ length: 8 }, (_, i) => ({ pitch: 72 + (i % 3), start: i * 480, dur: 480 }));
  const bass = Array.from({ length: 2 }, (_, i) => ({ pitch: 48, start: i * 1920, dur: 1920 }));
  return {
    searchScores: async () => ({ results: [{ id: 'mutopia:x', title: 'Autumn', by: 'Vivaldi', info: '', source: 'Mutopia' }] }),
    loadScore: async () => [{ name: 'autumn.mid', reduced: reduceScore({ ppq: 480, num: 4, den: 4, bpm: 100, fifths: 0, parts: [{ name: 'violin', notes }, { name: 'cello', notes: bass }] }) }],
  };
});

describe('research loop', () => {
  it('runs the tools, answers a bad submission and returns the material', async () => {
    const { research } = await import('../research.mjs');
    const m = await research({ prompt: 'vivaldi autumn c64', interpretation: { kind: 'work', work: 'Autumn', by: 'Vivaldi' }, url: 'x', key: 'k', model: 'm', searchModel: 's' });
    expect(m.work).toBe('Autumn');
    expect(m.segments[0]).toMatchObject({ id: 'A', bars: 2 });
    expect(m.segments[0].lead.slice(0, 4)).toEqual(['c5', '_', '_', '_']);
    expect(m.steps.map((s) => s.tool)).toEqual(['search_scores', 'load_score', 'show_bars']);
    // tool results went back to the model, the bad submission with its reason
    expect(seen[1]).toMatchObject({ role: 'tool' });
    expect(seen[4].content).toMatch(/Not usable: .*not loaded/);
    expect(m.calls).toBe(5);
  });
});
