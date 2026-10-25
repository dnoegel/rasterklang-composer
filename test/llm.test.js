import { describe, expect, it } from 'vitest';
import { answerToBrief, briefSchema, systemPrompt, drawConstraints } from '../src/gen/menu.js';
import { composeBrief } from '../src/gen/compose.js';
import { renderFrames } from '../src/gen/frames.js';

// What a model answer looks like (shape of briefSchema()).
const ANSWER = {
  reasoning: 'Dorisches Moll und ein langsamer Aufbau zeichnen den zögerlichen Sonnenaufgang.',
  title: 'Pixel Dawn',
  imagery: 'Erstes Licht auf Pixel-Dächern',
  liner_note: 'Erst tastend, dann hell.',
  style: 'synthwave',
  blend_style: 'none',
  blend_amount: 0,
  persona: 'galway',
  moods: [{ mood: 'hopeful', weight: 0.6 }, { mood: 'dreamy', weight: 0.4 }],
  tempo: 100,
  meter: '4/4',
  key: 'D',
  mode: 'dorian',
  palette: { bass: 'sub', snare: 'clap', chords: 'triad' },
  sections: [
    { type: 'intro', bars: 8, energy: 0.2, texture: 'arp_swell', transition: 'none', groove: 'synth_gated', bass: 'whole_note', feel: 'long', lead: 'bell', chords: ['i', 'IV'], transpose: 0 },
    { type: 'verse', bars: 8, energy: 0.45, texture: 'call_response', transition: 'fill', groove: 'synth_gated', bass: 'octave_8ths', feel: 'syncopated', lead: 'pluck', chords: ['i', 'IV', 'bVII', 'i'], transpose: 0 },
    { type: 'chorus', bars: 8, energy: 0.85, texture: 'hubbard', transition: 'stop', groove: 'four_floor', bass: 'octave_16th', feel: 'long', lead: 'saw', chords: ['bIII', 'bVII', 'IV', 'i'], transpose: 0 },
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
});
