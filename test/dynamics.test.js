import { describe, expect, it } from 'vitest';
import { composeBrief, compose } from '../src/gen/compose.js';
import { renderFrames } from '../src/gen/frames.js';
import { buildSid } from '../src/export/sid.js';
import { answerToBrief } from '../src/gen/menu.js';

const base = {
  style: 'reggae', tempo: 76, meter: '4/4', keyRoot: 7, mode: 'mixolydian', moods: { calm: 1 },
  palette: { bass: 'sub', snare: 'snare', chords: 'triad' },
  sound: { wave: 'triangle', attack: 2, decay: 9, sustain: 11, release: 7, vibrato: 1.5, pwm: 'none' },
  sections: [
    { type: 'intro', bars: 4, energy: 0.2, energyEnd: 0.5, filter: 'open', texture: 'staggered', groove: 'one_drop', bass: 'reggae', feel: 'long', lead: 'custom', chords: ['I', 'IV'] },
    { type: 'verse', bars: 8, energy: 0.4, energyEnd: 0.6, texture: 'counter', groove: 'one_drop', bass: 'reggae', feel: 'syncopated', lead: 'custom', chords: ['I', 'bVII', 'IV', 'I'],
      drumPattern: '..h...h.k.h...h. ..h...h.k.h.o.h.', bassPattern: '....R..5..R.8...', arpPattern: '..x_..x_..x_..x_' },
    { type: 'chorus', bars: 8, energy: 0.7, energyEnd: 0.8, texture: 'full', groove: 'one_drop', bass: 'reggae', feel: 'long', lead: 'custom', chords: ['IV', 'V', 'I', 'I'],
      drumPattern: 'k.h.zzz', bassPattern: 'R'.repeat(40) },
    { type: 'breakdown', bars: 4, energy: 0.3, texture: 'duet', filter: 'wobble', groove: 'one_drop', bass: 'reggae', feel: 'long', lead: 'custom', chords: ['vi', 'IV'] },
    { type: 'outro', bars: 4, energy: 0.4, energyEnd: 0.1, filter: 'close', texture: 'fade_layers', groove: 'one_drop', bass: 'reggae', feel: 'long', lead: 'custom', chords: ['I'] },
  ],
  themes: { chorus: { notes: '5 _ _ 3 4 _ 5 _ 6 _ 5 _ 3 _ _ _ 2 _ 3 _ 4 _ 3 _ 1 _ _ _ . . . . 5 _ 6 _ 8 _ 6 _ 5 _ 3 _ 2 _ . . 1 _ _ _ _ _ _ _ . . . . . . . .' } },
};

describe('dynamics and written patterns', () => {
  const tune = composeBrief(base, { prompt: 'test', seed: 1 });

  it('keeps valid patterns, repairs broken ones', () => {
    const verse = tune.brief.sections[1];
    expect(verse.drumPattern).toHaveLength(2);
    expect(verse.bassPattern).toEqual(['....R..5..R.8...']);
    const chorus = tune.brief.sections[2];
    expect(chorus.drumPattern).toBeUndefined();
    expect(chorus.bassPattern).toBeUndefined();
    expect(tune.repairs.filter((r) => r.includes('not usable'))).toHaveLength(2);
  });

  it('uses the written rows, the counter voice and the custom lead', () => {
    expect(tune.dsl).toContain('instrument custom');
    expect(tune.dsl).toContain('instrument counter');
    expect(tune.dsl).toMatch(/pattern v\dn\d+ = "~ ~ c4 ~ ~ ~ c4 ~ c4/); // the one drop row
    expect(tune.plan.themes.chorus.bars).toHaveLength(4);
  });

  it('renders filter shapes and fits a .sid', () => {
    expect(tune.dsl).toMatch(/saw \d+\.\.\d+ \/ 4/); // open / close
    expect(tune.dsl).toMatch(/sine \d+\.\.\d+ \* 1/); // wobble
    const { frames, barStarts } = renderFrames(tune.dsl, tune.plan.totalBars);
    expect(buildSid(frames, barStarts).complete).toBe(true);
  });

  it('round-trips the new fields through the model answer format', () => {
    const b = answerToBrief({
      style: 'funk', blend_style: 'none', blend_amount: 0, persona: 'none', moods: [], tempo: 110, meter: '4/4', key: 'E', mode: 'dorian',
      palette: { bass: 'slap', snare: 'snare', chords: 'triad' }, sound: { wave: 'none', attack: 0, decay: 0, sustain: 0, release: 0, vibrato: 0, pwm: 'none' },
      sections: [{ type: 'verse', bars: 8, energy: 0.5, energy_end: 0.7, filter: 'follow', texture: 'full', transition: 'fill', groove: 'funk',
        drums_pattern: 'k.h.s.hkh.k.s.h.', bass: 'funk_16ths', bass_pattern: '', arp_pattern: '', feel: 'syncopated', lead: 'brass', chords: ['i7', 'IV7'], transpose: 0 }],
      themes: [],
    }, 'funk');
    expect(b.sound).toBeNull();
    expect(b.sections[0].energyEnd).toBe(0.7);
    expect(b.sections[0].drumPattern).toBe('k.h.s.hkh.k.s.h.');
    const t = composeBrief(b, { prompt: 'funk', seed: 1 });
    expect(t.brief.sections[0].drumPattern).toEqual(['k.h.s.hkh.k.s.h.']);
  });

  it('rule-based songs get energy curves and varied drum bars', () => {
    const t = compose('high energy heavy metal tune with melodic chorus', 1);
    expect(t.brief.sections.some((s) => s.energyEnd !== s.energy)).toBe(true);
    const drumBars = new Set(t.dsl.split('\n').filter((l) => l.startsWith('pattern v0n')).map((l) => l.split('=')[1]));
    expect(drumBars.size).toBeGreaterThan(8);
  });
});
