import { describe, expect, it } from 'vitest';
import { compose, composeBrief } from '../src/gen/compose.js';
import { ARPS } from '../src/gen/library/palettes.js';
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
    ['cheerful Irish pub music', 'jig'],
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
    expect(sid.bytes.length).toBeLessThan(0xd000 - 0x1000 + 0x7e); // data ends before I/O at $D000
    expect(String.fromCharCode(...sid.bytes.slice(0, 4))).toBe('PSID');
  });

  it('every arp sound renders and fits a .sid', () => {
    const base = compose('happy platformer level', 1);
    for (const arp of Object.keys(ARPS)) {
      const tune = composeBrief({ ...base.brief, palette: { ...base.brief.palette, arp } }, { prompt: 'happy platformer level', seed: 1, candidates: 1 });
      expect(tune.dsl, arp).toMatch(/instrument arp/);
      const { frames, barStarts } = renderFrames(tune.dsl, tune.plan.totalBars);
      expect(buildSid(frames, barStarts, { title: arp }).complete, arp).toBe(true);
    }
  }, 60000);

  it('blends two named styles, the last named leads', () => {
    const i = parsePrompt('celtic metal');
    expect(resolveStyle(i)).toBe('metal');
    expect(i.blend).toEqual({ style: 'jig', amount: 0.35 });
  });

  it('a genre named outright beats one hinted at by a keyword', () => {
    expect(resolveStyle(parsePrompt('ragtime saloon'))).toBe('ragtime');
  });

  it('a jig led blend with metal uses 6/8 metal blocks', () => {
    const i = parsePrompt('metal jig');
    expect(resolveStyle(i)).toBe('jig');
    expect(i.blend?.style).toBe('metal');
    const grooves = new Set([1, 2, 3, 4].flatMap((s) => compose('metal jig', s).brief.sections.map((x) => x.groove)));
    expect(grooves.has('metal_68')).toBe(true);
  });

  it('varies intros between seeds', () => {
    const intros = new Set([1, 2, 3, 4, 5, 6].map((s) => compose('heavy metal', s).brief.sections[0].texture));
    expect(intros.size).toBeGreaterThanOrEqual(3);
  });

  it('repairs a broken brief instead of failing', async () => {
    const { composeBrief } = await import('../src/gen/compose.js');
    const tune = composeBrief({
      style: 'metal', tempo: 400, meter: '5/4', keyRoot: 4, mode: 'nonsense',
      sections: [
        { type: 'intro', bars: 3, texture: 'riff_solo', chords: ['i', 'bVII'] },
        { type: 'verse', bars: 8, groove: 'bodhran', chords: ['i', 'xyz', 'bVI'] },
        { type: 'chorus', bars: 8, chords: [] },
        { type: 'outro', bars: 2 },
      ],
      themes: { chorus: { notes: '5 _ 4 3 _ 1 2 3 _ _ 5 _ 6 _ 5 _' } },
    }, { prompt: 'test', seed: 1 });
    expect(tune.repairs.length).toBeGreaterThan(3);
    expect(tune.plan.meterId).toBe('4/4');
    expect(tune.plan.bpm).toBeLessThan(210);
    expect(tune.plan.themes.chorus.bars[0]).toHaveLength(16);
    const { frames } = renderFrames(tune.dsl, tune.plan.totalBars);
    expect(frames.length).toBeGreaterThan(100);
  });

  it.each([
    ['dark doom metal', 'doom'], ['slow blues in a smoky bar', 'blues'], ['jazzy hotel lobby', 'jazz'],
    ['lazy sunday bossa nova', 'bossa'], ['90s eurodance rave', 'dance'], ['liquid drum and bass', 'dnb'],
    ['funky space station cantina', 'funk'], ['chill reggae on the beach', 'reggae'], ['music box waltz', 'waltz'],
    ['epic trailer battle hymn', 'cinematic'], ['calm ambient space', 'ambient'], ['fast punk', 'punk'],
    ['lofi hip hop beats to study', 'lofi'], ['1988 cracktro music', 'demoscene'],
    ['Song 2 von Blur als C64 Song', 'alt'], ['indie rock', 'indie'], ['rock song', 'poprock'],
    ['hard rock riffs like ac/dc', 'hardrock'], ['a pop hit with a big chorus', 'pop'], ['trap banger', 'hiphop'],
    ['country saloon', 'country'], ['new wave like depeche mode', 'newwave'],
  ])('genre %s -> %s renders with a lead and fits a .sid', (prompt, style) => {
    const tune = compose(prompt, 1);
    expect(tune.plan.styleId).toBe(style);
    expect(tune.measure.ok).toBe(true);
    const { frames, barStarts } = renderFrames(tune.dsl, tune.plan.totalBars);
    expect(frames.length / 50).toBeLessThanOrEqual(152);
    expect(buildSid(frames, barStarts).complete).toBe(true);
  });

  it('honours an explicit key', () => {
    const tune = compose('happy platformer level in D major', 1);
    expect(tune.plan.keyRoot).toBe(2);
    expect(['ionian', 'mixolydian', 'lydian']).toContain(tune.plan.mode);
  });
});
