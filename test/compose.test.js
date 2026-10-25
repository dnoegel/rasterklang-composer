import { describe, expect, it } from 'vitest';
import { compose } from '../src/gen/compose.js';
import { renderFrames } from '../src/gen/frames.js';
import { parsePrompt, resolveStyle } from '../src/gen/intent.js';
import { buildSid } from '../src/export/sid.js';

const PROMPTS = [
  'high energy heavy metal tune with melodic chorus',
  'melancholic rainy night synthwave',
  'happy platformer level',
  'Celtic jig for a tavern',
  'spooky dungeon loop',
  'calm menu music for a puzzle game',
];

describe('intent', () => {
  it.each([
    ['fröhliche irische Kneipenmusik', 'jig'],
    ['aggressive thrash metal', 'metal'],
    ['dreamy 80s night drive', 'synthwave'],
    ['levels of a jump and run', 'platformer'],
    ['Boss fight, fast and menacing', 'metal'],
  ])('%s -> %s', (prompt, style) => {
    expect(resolveStyle(parsePrompt(prompt))).toBe(style);
  });

  it('reads explicit tempo and key', () => {
    const i = parsePrompt('synthwave in F# minor at 100 bpm');
    expect(i.tempo).toBe(100);
    expect(i.key).toEqual({ root: 6, minor: true });
  });
});

describe('compose', () => {
  it('is deterministic for prompt and seed', () => {
    expect(compose(PROMPTS[1], 7).dsl).toBe(compose(PROMPTS[1], 7).dsl);
    expect(compose(PROMPTS[1], 7).dsl).not.toBe(compose(PROMPTS[1], 8).dsl);
  });

  it.each(PROMPTS)('%s compiles, passes the melody gates and fits a .sid', (prompt) => {
    const tune = compose(prompt, 1);
    expect(tune.measure.ok).toBe(true);
    const { frames, barStarts } = renderFrames(tune.dsl, tune.plan.totalBars);
    expect(frames.length).toBeGreaterThan(50 * 20);
    expect(frames.every((f) => f.length / 2 <= 127)).toBe(true);
    const sid = buildSid(frames, barStarts, { title: tune.title });
    expect(sid.complete).toBe(true);
    expect(sid.bytes.length).toBeLessThan(0xa000);
    expect(String.fromCharCode(...sid.bytes.slice(0, 4))).toBe('PSID');
  });

  it('honours an explicit key', () => {
    const tune = compose('happy platformer level in D major', 1);
    expect(tune.plan.keyRoot).toBe(2);
    expect(['ionian', 'mixolydian', 'lydian']).toContain(tune.plan.mode);
  });
});
