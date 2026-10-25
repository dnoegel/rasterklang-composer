import { describe, expect, it } from 'vitest';
import { compose } from '../src/gen/compose.js';
import { parsePrompt, resolveStyle } from '../src/gen/intent.js';
import { renderFrames } from '../src/gen/frames.js';
import { buildSid } from '../src/export/sid.js';
import { loopToRomans, nudgeModes, findArtist } from '../src/gen/hvsc-data.js';
import { ARTISTS, GENRE_HINTS } from '../src/gen/library/hvsc.js';

describe('HVSC inventory data', () => {
  it('has genre hints and artist fingerprints with usable rows', () => {
    expect(Object.keys(GENRE_HINTS).length).toBeGreaterThan(10);
    const a = Object.values(ARTISTS);
    expect(a.length).toBeGreaterThan(10);
    for (const x of a) {
      for (const r of x.drumRows) expect(r).toMatch(/^[ksh.]{16}$/);
      for (const r of x.bassRows) expect(r).toMatch(/^[R583b6A42_.]{16}$/);
    }
  });

  it('converts bass-root loops into romans for the mode', () => {
    expect(loopToRomans('I-I-bVI-bVII', 'aeolian')).toEqual(['i', 'i', 'bVI', 'bVII']);
    expect(loopToRomans('I-IV-V-VI', 'ionian')).toEqual(['I', 'IV', 'V', 'vi']);
  });

  it('nudges modes toward a minor share', () => {
    const m = nudgeModes({ ionian: 1, aeolian: 1 }, 1, 0.5);
    expect(m.aeolian / (m.aeolian + m.ionian)).toBeCloseTo(0.75, 2);
  });

  it('finds artists by name, also without "the"', () => {
    expect(findArtist('a song like Depeche Mode')?.name).toBe('Depeche Mode');
    expect(parsePrompt('Beatles style tune').artist).toBe('The Beatles');
  });

  it.each(['a song like Depeche Mode', 'something like Madonna', 'like Jean-Michel Jarre'])('%s uses the artist fingerprint', (prompt) => {
    const t = compose(prompt, 1);
    expect(t.brief.artist).toBeTruthy();
    expect(t.plan.styleId).toBe(ARTISTS[t.brief.artist].style);
    const { frames, barStarts } = renderFrames(t.dsl, t.plan.totalBars);
    expect(buildSid(frames, barStarts).complete).toBe(true);
    expect(t.measure.ok).toBe(true);
  });

  it.each([['Bach fugue', 'classical'], ['a march for the parade', 'march'], ['ragtime piano', 'ragtime'], ['christmas carol', 'folk']])(
    'new style %s -> %s',
    (prompt, style) => {
      expect(resolveStyle(parsePrompt(prompt))).toBe(style);
      const t = compose(prompt, 1);
      const { frames, barStarts } = renderFrames(t.dsl, t.plan.totalBars);
      expect(buildSid(frames, barStarts).complete).toBe(true);
    },
  );

  it('uses arpeggio inversions and two-bar chords somewhere', () => {
    const tunes = [1, 2, 3, 4, 5, 6].map((s) => compose('melancholic rainy night synthwave', s));
    expect(tunes.some((t) => /arp(Maj|Min)[AB]/.test(t.dsl))).toBe(true);
    expect(tunes.some((t) => t.brief.sections.some((s) => s.chordBars === 2))).toBe(true);
  });
});
