import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseMidi, midiScore } from '../src/score/midi.js';
import { abcScore } from '../src/score/abc.js';
import { musicXmlScore } from '../src/score/musicxml.js';
import { reduceScore, extractMaterial, overviewText, barsText } from '../src/score/reduce.js';
import { readScoreFile } from '../src/score/read.js';
import { buildMaterial, applyMaterial, interpretationSchema, interpretationUserPrompt, materialFromBrief } from '../src/gen/interpret.js';
import { cleanInterpretation, understandSchema } from '../src/gen/understand.js';
import { answerToBrief, briefToAnswer } from '../src/gen/menu.js';
import { validateBrief } from '../src/gen/brief.js';
import { composeBrief } from '../src/gen/compose.js';
import { varyBrief } from '../src/gen/vary.js';

// a type-1 MIDI file: tempo/meter/key track, then one track per part;
// notes: [pitch, startQuarter, quarters]
function midiFile(parts, { ppq = 96, bpm = 100, num = 4, den = 4, sharps = -1 } = {}) {
  const vlq = (n) => { const out = [n & 0x7f]; while ((n >>= 7)) out.unshift((n & 0x7f) | 0x80); return out; };
  const track = (events) => {
    const body = [];
    let last = 0;
    for (const [tick, bytes] of events.sort((a, b) => a[0] - b[0] || a[2] - b[2])) { body.push(...vlq(tick - last), ...bytes); last = tick; }
    body.push(0, 0xff, 0x2f, 0);
    return [0x4d, 0x54, 0x72, 0x6b, (body.length >>> 24) & 255, (body.length >>> 16) & 255, (body.length >>> 8) & 255, body.length & 255, ...body];
  };
  const us = Math.round(60000000 / bpm);
  const meta = track([[0, [0xff, 0x51, 3, (us >> 16) & 255, (us >> 8) & 255, us & 255], 0], [0, [0xff, 0x58, 4, num, Math.log2(den), 24, 8], 0], [0, [0xff, 0x59, 2, sharps & 255, 0], 0]]);
  const tracks = parts.map(({ name, notes }) => track([
    [0, [0xff, 0x03, name.length, ...[...name].map((c) => c.charCodeAt(0))], 0],
    ...notes.flatMap(([p, s, d]) => [[Math.round(s * ppq), [0x90, p, 80], 1], [Math.round((s + d) * ppq), [0x80, p, 0], 0]]),
  ]));
  return Uint8Array.from([0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 1, 0, parts.length + 1, 0, ppq, ...meta, ...tracks.flat()]);
}

// the opening of Vivaldi's Autumn, first bar: a a a bb a . a bb over F
const AUTUMN = midiFile([
  { name: 'violin', notes: [[81, 0, 0.5], [81, 0.5, 0.5], [81, 1, 0.5], [82, 1.5, 0.5], [81, 2, 1], [81, 3, 0.5], [82, 3.5, 0.5]] },
  { name: 'cello', notes: [[53, 0, 0.5], [53, 0.5, 0.5], [53, 1, 0.5], [48, 1.5, 0.5], [53, 2, 1], [53, 3, 0.5], [48, 3.5, 0.5]] },
]);

describe('score readers', () => {
  it('reads a MIDI file into parts with tempo, meter and key', () => {
    const m = parseMidi(AUTUMN);
    expect(m.tracks.map((t) => t.name)).toEqual(['violin', 'cello']);
    expect(Math.round(m.tempos[0].bpm)).toBe(100);
    expect(m.timeSigs[0]).toMatchObject({ num: 4, den: 4 });
    expect(m.keySigs[0].sharps).toBe(-1);
  });

  it('reduces a score to lead, bass and a chord per bar on the step grid', () => {
    const r = reduceScore(midiScore(AUTUMN));
    expect(r.meter).toBe('4/4');
    expect(r.key).toBe('F');
    expect(r.lead.slice(0, 16).join(' ')).toBe('a5 _ a5 _ a5 _ a#5 _ a5 _ _ _ a5 _ a#5 _');
    expect(r.bass.slice(0, 8).join(' ')).toBe('f3 _ f3 _ f3 _ c3 _');
    expect(r.chords[0]).toBe('F');
    expect(overviewText(r)).toMatch(/parts: 0: violin/);
    expect(barsText(r, 1, 1)).toMatch(/^bar 1 \[F\]/);
  });

  it('reads ABC with modes, repeats and broken rhythm', () => {
    const r = reduceScore(abcScore('X:1\nT:Drowsy Maggie\nM:4/4\nL:1/8\nK:Edor\n|:E2BE dEBE|E2BE AFDF|E2BE dEBE|BABc dAFD:|'));
    expect(r.key).toBe('E');
    expect(r.mode).toBe('dorian');
    expect(r.bars).toBe(8);
    expect(r.lead.slice(0, 16).join(' ')).toBe('e4 _ _ _ b4 _ e4 _ d5 _ e4 _ b4 _ e4 _');
    expect(r.lead.slice(64, 72).join(' ')).toBe(r.lead.slice(0, 8).join(' '));
    // a single melody line has no bass of its own
    expect(r.bass.every((t) => t === '.')).toBe(true);
    const dotted = reduceScore(abcScore('X:1\nM:4/4\nL:1/8\nK:D\nA>B c<d a4|'));
    expect(dotted.lead.slice(0, 8).join(' ')).toBe('a4 _ _ b4 c#5 d5 _ _');
  });

  it('reads MusicXML parts, chords and ties', () => {
    const note = (step, oct, dur, extra = '') => `<note>${extra}<pitch><step>${step}</step><octave>${oct}</octave></pitch><duration>${dur}</duration></note>`;
    const xml = `<?xml version="1.0"?><score-partwise><part-list><score-part id="P1"><part-name>Flute</part-name></score-part><score-part id="P2"><part-name>Bass</part-name></score-part></part-list>
<part id="P1"><measure number="1"><attributes><divisions>2</divisions><key><fifths>0</fifths></key><time><beats>3</beats><beat-type>4</beat-type></time></attributes>
${note('E', 5, 2)}${note('G', 5, 2, '')}${note('C', 6, 2, '<tie type="start"/>')}</measure><measure number="2">${note('C', 6, 2, '<tie type="stop"/>')}<note><rest/><duration>4</duration></note></measure></part>
<part id="P2"><measure number="1"><attributes><divisions>2</divisions></attributes>${note('C', 3, 6)}</measure><measure number="2">${note('G', 2, 6)}</measure></part></score-partwise>`;
    const s = musicXmlScore(xml);
    expect(s.parts.map((p) => p.name)).toEqual(['Flute', 'Bass']);
    expect(s.parts[0].notes[2].dur).toBe(960);
    const r = reduceScore(s);
    expect(r.meter).toBe('3/4');
    expect(r.lead.slice(0, 12).join(' ')).toBe('e5 _ _ _ g5 _ _ _ c6 _ _ _');
    expect(r.bass[0]).toBe('c3');
    expect(r.chords[0]).toBe('C');
  });

  it('detects the file type of downloads', () => {
    expect(readScoreFile(Buffer.from(AUTUMN), 'a.mid')[0].score.parts).toHaveLength(2);
    expect(readScoreFile(Buffer.from('X:1\nT:One\nK:G\nGABc|\n\nX:2\nT:Two\nK:D\nDEFG|'), 'x.abc').map((f) => f.name)).toEqual(['One', 'Two']);
    expect(() => readScoreFile(Buffer.from('<html></html>'))).toThrow(/not a score/);
  });
});

describe('interpretation path', () => {
  it('reads only explicit requests for a piece as an interpretation', () => {
    expect(understandSchema().required).toContain('interpretation');
    expect(cleanInterpretation({ kind: 'work', work: 'The Four Seasons: Autumn', by: 'Vivaldi' })).toEqual({ kind: 'work', work: 'The Four Seasons: Autumn', by: 'Vivaldi' });
    expect(cleanInterpretation({ kind: 'artist', work: '', by: 'Bach' })).toMatchObject({ kind: 'artist', by: 'Bach' });
    expect(cleanInterpretation({ kind: 'work', work: '', by: 'x' })).toBeNull();
    expect(cleanInterpretation({ kind: 'none', work: 'x', by: 'y' })).toBeNull();
  });

  const reduced = reduceScore(midiScore(AUTUMN));
  const material = buildMaterial({
    work: 'Autumn', by: 'Vivaldi', tempo: 108, source: 'test score',
    segments: [
      { id: 'A', label: 'ritornello', score_id: 's1', file: 0, from_bar: 1, to_bar: 1 },
      { id: 'B', label: 'again', score_id: 's1', file: 0, from_bar: 1, to_bar: 1 },
    ],
  }, (id) => (id === 's1' ? reduced : null), extractMaterial).material;

  it('builds material from loaded score bars only, never from memory', () => {
    expect(material.keyRoot).toBe(5);
    expect(material.meter).toBe('4/4');
    expect(material.fromScore).toBe('score');
    expect(material.segments.map((s) => [s.id, s.bars, s.bass ? 'bass' : 'none'])).toEqual([['A', 1, 'bass'], ['B', 1, 'bass']]);
    const bad = buildMaterial({ segments: [{ id: 'A', score_id: 'nope', file: 0, from_bar: 1, to_bar: 4 }] }, () => null, extractMaterial);
    expect(bad.error).toMatch(/not loaded/);
    // one segment written from memory sends the whole submission back
    const guessed = buildMaterial({ segments: [{ id: 'A', score_id: 's1', file: 0, from_bar: 1, to_bar: 1 }, { id: 'B', score_id: '', lead: 'c6 _ a5' }] }, (id) => (id === 's1' ? reduced : null), extractMaterial);
    expect(guessed.material).toBeUndefined();
    expect(guessed.error).toMatch(/memory are not accepted/);
    expect(interpretationSchema(['A', 'B']).properties.sections.items.properties.material.enum).toEqual(['A', 'B', 'none']);
    expect(interpretationUserPrompt('vivaldi autumn c64', material)).toMatch(/key F ionian, meter 4\/4/);
  });

  const daily = JSON.parse(readFileSync(new URL('../data/daily-briefs/d-2026-10-26-a1.json', import.meta.url)));
  const answer = structuredClone(daily.answer);
  answer.key = 'C#';
  answer.meter = '6/8';
  answer.tempo = 170;
  const base = answer.sections.find((s) => s.type === 'chorus');
  answer.sections = [
    { ...base, type: 'verse', bars: 8, material: 'A', texture: 'full', chords: ['I'] },
    { ...base, type: 'chorus', bars: 4, material: 'B', texture: 'full', chords: ['I'] },
    { ...base, type: 'outro', bars: 2, material: 'none', texture: 'full', chords: ['I', 'V'] },
  ].map((s) => ({ ...s, drums_pattern: '', bass_pattern: '', arp_pattern: '', groove: 'rock', bass: 'walk' }));

  it('puts the exact notes, chords and length of a segment into its sections', () => {
    const { brief, errors } = validateBrief(applyMaterial(answerToBrief(answer, 'vivaldi autumn c64'), answer, material));
    expect(errors).toEqual([]);
    expect(brief.keyRoot).toBe(5);
    expect(brief.meter).toBe('4/4');
    // the work's tempo, not clamped to the style's band
    expect(brief.tempo).toBe(170);
    expect(brief.sections.map((s) => s.bars)).toEqual([1, 1, 2]);
    expect(brief.sections[0].score.lead.slice(0, 4)).toEqual(['a5', '_', 'a5', '_']);
    expect(brief.sections[1].score.bass.slice(0, 2)).toEqual(['f3', '_']);
    expect(brief.interpretation).toMatchObject({ work: 'Autumn', by: 'Vivaldi', fromScore: 'score' });

    const tune = composeBrief(brief, { prompt: 'vivaldi autumn c64', seed: 1, withLead: true });
    const first = tune.leadNotes.filter((n) => n.bar === 0).map((n) => n.pitch);
    expect(first).toEqual([81, 81, 81, 82, 81, 81, 82]);
    // the cello moves an octave down into the SID's bass range
    expect(tune.plan.scoreShift.bass).toBe(-12);
    expect(tune.dsl).toMatch(/"f2 _ f2 _ f2 _ c2 _/);

    // a code variant keeps the key and the score's chords
    const v = varyBrief(brief, 'vivaldi autumn c64', 3);
    expect(v.brief.keyRoot).toBe(5);
    expect(v.brief.sections[0].score).toEqual(brief.sections[0].score);
    expect(v.brief.sections[0].chords).toEqual(brief.sections[0].chords);

    // a refinement gets the same material back from the brief
    const again = materialFromBrief(brief);
    expect(again.segments.map((s) => s.id)).toEqual(['A', 'B']);
    expect(briefToAnswer(brief).sections.map((s) => s.material)).toEqual(['A', 'B', 'none']);
    const refined = validateBrief(applyMaterial(answerToBrief(briefToAnswer(brief), 'x'), briefToAnswer(brief), again)).brief;
    expect(refined.sections[0].score.lead).toEqual(brief.sections[0].score.lead);
  });
});
