import { describe, expect, it } from 'vitest';
import { answerToBrief, briefToAnswer, briefSchema, systemPrompt, drawConstraints, drawKeys, keyConstraint, drawArrangement, userPrompt, refinePrompt, critiqueSystemPrompt } from '../src/gen/menu.js';
import { composeBrief, compose, describeTune } from '../src/gen/compose.js';
import { renderFrames } from '../src/gen/frames.js';
import { buildSid } from '../src/export/sid.js';

// What a model answer looks like (shape of briefSchema()).
const ANSWER = {
  reasoning: 'Dorian minor and a slow build-up paint the hesitant sunrise.',
  title: 'Pixel Dawn',
  imagery: 'First light on pixel rooftops',
  liner_note: 'Tentative at first, then bright.',
  style: 'synthwave',
  blend_style: 'none',
  blend_amount: 0,
  moods: [{ mood: 'hopeful', weight: 0.6 }, { mood: 'dreamy', weight: 0.4 }],
  tempo: 100,
  meter: '4/4',
  key: 'D',
  mode: 'dorian',
  palette: { bass: 'sub', snare: 'clap', chords: 'triad' },
  sections: [
    { type: 'intro', bars: 8, energy: 0.2, texture: 'arp_swell', transition: 'none', groove: 'synth_gated', bass: 'whole_note', feel: 'long', lead: 'bell', chords: ['i', 'IV'], transpose: 0 },
    { type: 'verse', bars: 8, energy: 0.45, texture: 'call_response', transition: 'fill', groove: 'synth_gated', bass: 'octave_8ths', feel: 'syncopated', lead: 'pluck', chords: ['i', 'IV', 'bVII', 'i'], transpose: 0 },
    { type: 'chorus', bars: 8, energy: 0.85, texture: 'multiplex', transition: 'stop', groove: 'four_floor', bass: 'octave_16th', feel: 'long', lead: 'saw', chords: ['bIII', 'bVII', 'IV', 'i'], transpose: 0 },
    { type: 'chorus', bars: 8, energy: 0.9, texture: 'full', transition: 'none', groove: 'four_floor', bass: 'octave_16th', feel: 'long', lead: 'saw', chords: ['bIII', 'bVII', 'IV', 'i'], transpose: 2 },
    { type: 'outro', bars: 4, energy: 0.3, texture: 'fade_layers', transition: 'none', groove: 'bodhran', bass: 'drone', feel: 'running', lead: 'saw', chords: ['i'], transpose: 0 },
  ],
  themes: [
    { section: 'chorus', notes: '5 _ _ 3 4 _ 5 _ 6 _ 5 _ 3 _ _ _ 2 _ 3 _ 4 _ 3 _ 1 _ _ _ . . . .' },
    { section: 'verse', notes: '. . 1 _ 3 _ 1 _ -7 _ 1 _ _ _ . .' },
  ],
};

describe('llm path', () => {
  it('schema and prompt are built from the library', () => {
    const schema = briefSchema();
    expect(schema.properties.sections.items.properties.groove.enum).toContain('metal_gallop');
    expect(systemPrompt()).toContain('arp_swell');
    expect(drawConstraints(() => 0.5, 2)).toHaveLength(2);
  });

  it('draws concrete arrangement choices that the menu knows', () => {
    let i = 0;
    const rand = () => (i++ * 0.618) % 1;
    const intros = new Set();
    const chorus = new Set();
    for (let n = 0; n < 200; n += 1) {
      const a = drawArrangement(rand);
      expect(a.length).toBeGreaterThanOrEqual(5);
      intros.add(a[0]);
      chorus.add(a.find((x) => x.startsWith('Use the texture')));
    }
    expect(intros.size).toBeGreaterThan(6);
    expect(chorus.size).toBe(5);
    for (const x of chorus) expect(systemPrompt()).toContain(x.split(' ')[3]);
    // the three readings keep their intro groups
    for (let n = 0; n < 50; n += 1) expect(drawArrangement(rand, { intros: ['riff_solo', 'cold_start'] })[0]).toMatch(/riff_solo|cold_start/);
    expect(userPrompt('x', ['c'], null, null, drawArrangement(rand))).toContain('Arrangement drawn for this song');
  });

  it('draws distinct keys from all twelve', () => {
    let i = 0;
    const seen = new Set();
    for (let n = 0; n < 200; n += 1) for (const k of drawKeys(() => (i++ * 0.37) % 1, 3)) seen.add(k);
    expect(seen.size).toBe(12);
    expect(new Set(drawKeys(() => 0.99, 3)).size).toBe(3);
    expect(keyConstraint('F#')).toContain('key of F#');
  });

  it('turns a model answer into a playable tune with its themes', () => {
    const tune = composeBrief(answerToBrief(ANSWER, 'Sonnenaufgang'), { prompt: 'Sonnenaufgang', seed: 1 });
    expect(tune.title).toBe('Pixel Dawn');
    expect(tune.plan.keyRoot).toBe(2);
    expect(tune.plan.mode).toBe('dorian');
    expect(tune.plan.themes.chorus.bars).toHaveLength(2);
    // outro groove/bass were 6/8 entries: repaired to 4/4 ones
    expect(tune.repairs.some((r) => r.includes('bodhran'))).toBe(true);
    expect(tune.plan.sections[3].keyRoot).toBe(4);
    const { frames } = renderFrames(tune.dsl, tune.plan.totalBars);
    expect(frames.length).toBeGreaterThan(1000);
  });

  it('renders every new sound, bass sounds per section and bass fills', () => {
    const sections = ANSWER.sections.slice(0, 4).map((x, i) => ({
      ...x, texture: 'full', energy: 0.8, energy_end: 0.8, bass_sound: ['slidebass', 'growl', 'chipbass', 'palette'][i], lead: ['glide', 'reed', 'warble', 'custom'][i],
      bass_pattern: i === 1 ? 'R.2.4.5.8.4.2.A.' : '',
    }));
    sections[0].lead = 'square';
    const answer = { ...ANSWER, sections, sound: { wave: 'pulse', attack: 0, decay: 6, sustain: 2, release: 3, vibrato: 1, pwm: 'slow', pulse_width: 'narrow', onset: 'noise', slide: 'short' } };
    const tune = composeBrief(answerToBrief(answer, 'p'), { prompt: 'p', seed: 1 });
    for (const name of ['slidebass', 'growl', 'chipbass', 'square', 'reed', 'warble', 'custom']) expect(tune.dsl).toContain(`instrument ${name}`);
    expect(tune.plan.sections[1].bassPattern[0]).toBe('R.2.4.5.8.4.2.A.');
    const { frames, barStarts } = renderFrames(tune.dsl, tune.plan.totalBars);
    expect(buildSid(frames, barStarts, { title: 'x' }).complete).toBe(true);
    const brief = briefToAnswer(tune.brief);
    expect(brief.sections[1].bass_sound).toBe('growl');
    expect(brief.sound.onset).toBe('noise');
  });

  it('round-trips a brief through the answer format for refinement', () => {
    const tune = compose('celtic metal', 2);
    const again = composeBrief(answerToBrief(briefToAnswer(tune.brief), 'celtic metal'), { prompt: 'celtic metal', seed: 1 });
    expect(again.brief.sections.map((s) => s.texture)).toEqual(tune.brief.sections.map((s) => s.texture));
    expect(again.plan.keyRoot).toBe(tune.plan.keyRoot);
    const text = refinePrompt('celtic metal', tune.brief, describeTune(tune), 'darker chorus');
    expect(text).toContain('darker chorus');
    expect(text).toContain('"sections"');
    expect(critiqueSystemPrompt()).toContain('suggestion');
  });
});
