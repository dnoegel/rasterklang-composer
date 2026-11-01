import { describe, expect, it } from 'vitest';
import { compose } from '../src/gen/compose.js';
import { parsePrompt, resolveStyle } from '../src/gen/intent.js';
import { renderFrames } from '../src/gen/frames.js';
import { buildSid } from '../src/export/sid.js';
import { loopToRomans, nudgeModes, findArtist } from '../src/gen/hvsc-data.js';
import { ARTISTS, GENRE_HINTS } from '../src/gen/library/hvsc.js';
import { HVSC_KITS, HVSC_BASSES, HVSC_LEADS } from '../src/gen/library/hvsc-instruments.js';
import { readFileSync } from 'node:fs';

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

  it('C64-style instruments match their data file', () => {
    const data = JSON.parse(readFileSync(new URL('../', import.meta.url), 'utf8'));
    expect(Object.keys(HVSC_KITS)).toEqual(data.picked.kits.map((k) => k.id));
    expect(Object.keys(HVSC_BASSES)).toEqual(data.picked.basses.map((b) => b.id));
    expect(Object.keys(HVSC_LEADS)).toEqual(data.picked.leads.map((b) => b.id));
    for (const b of [...data.picked.basses, ...data.picked.leads]) expect(b.authors).toBeGreaterThanOrEqual(4);
    for (const b of data.picked.leads) expect(b.level).toBeGreaterThanOrEqual(data.picked.minLeadLevel);
  });

  it('songs use C64-style kits, sounds, echoes and bends, and still fit a .sid', () => {
    const tunes = [1, 2, 3, 4, 5, 6].flatMap((s) => ['happy platformer level', 'melancholic rainy night synthwave'].map((p) => compose(p, s)));
    expect(tunes.some((t) => t.plan.palette.kit && t.plan.palette.kit !== 'std')).toBe(true);
    const kitSong = tunes.find((t) => HVSC_KITS[t.plan.palette.kit]);
    expect(kitSong.dsl).toContain(`instrument ${HVSC_KITS[kitSong.plan.palette.kit].kick}`);
    expect(tunes.some((t) => /instrument \w+echo\b/.test(t.dsl))).toBe(true);
    expect(tunes.some((t) => /instrument \w+bend\b/.test(t.dsl))).toBe(true);
    for (const t of tunes) {
      const { frames, barStarts } = renderFrames(t.dsl, t.plan.totalBars);
      expect(buildSid(frames, barStarts).complete).toBe(true);
    }
  });
});

describe('HVSC standard library', () => {
  it('matches its data file and every sound compiles and sounds', async () => {
    const lib = await import('../src/gen/library/hvsc-library.js');
    const data = JSON.parse(readFileSync('', 'utf8'));
    const roles = ['kick', 'snare', 'hat', 'tom', 'bass', 'lead', 'arp', 'pad'];
    const bodies = [];
    for (const role of roles) {
      const mod = lib[`${role.toUpperCase()}S`];
      expect(Object.keys(mod).length).toBe(data.library[role].length);
      bodies.push(...Object.values(mod).map((x) => x.body));
    }
    for (const kit of Object.values(lib.KITS)) bodies.push(kit.kick.body, kit.snare.body, kit.hat.body);
    expect(bodies.length).toBeGreaterThan(30);
    for (const body of bodies) {
      const dsl = `speed 24 meter 4/4\n\ninstrument x${body.trimEnd()}\nend\n\nvoice 0 x\n  notes "c4 _ e4 _ g4 _ c5 _"\nend\n`;
      const { frames } = renderFrames(dsl, 1);
      expect(frames.length).toBeGreaterThan(0);
    }
  });
});
