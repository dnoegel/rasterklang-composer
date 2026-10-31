// Interpretations of a named work. When the first pass reads a
// prompt as "play this piece" (Vivaldi's Autumn as a C64 tune), the
// composer first researches the notes with tools (score search, score
// reading, web search) and hands in material: segments of real notes. Then
// it writes the brief as usual, but each section may take a segment, whose
// notes (lead and bass), chords and length code puts in exactly. Without
// such a request nothing here runs.

import { briefSchema } from './menu.js';
import { KEY_NAMES } from './theory.js';
import { METERS } from './library/meters.js';
import { SCORE_MAX_BARS } from './brief.js';

export const RESEARCH_MAX_CALLS = 10;
export const MAX_SEGMENTS = 6;

export function researchSystemPrompt() {
  return `You prepare an interpretation of an existing piece of music for a generator that plays it on the C64's SID chip (three voices: lead, bass, chords as arpeggios, drums share them). Your job now is only to find the real notes and hand them in as material; the arrangement comes later.

Tools:
- search_scores(query): machine-readable scores. Mutopia (classical, typeset, MIDI) and The Session (folk tunes, ABC). Search by composer and title, also the original-language title (e.g. "vivaldi autumn", "beethoven elise", "greensleeves").
- web_search(query): the web, for facts (movements, keys, tempo, form, which theme is the famous one) and for links to MIDI, MusicXML (.mxl, .musicxml) or ABC files of pieces the score search lacks (pop and rock songs, film and game music). Load such a link with load_score("url:https://...").
- load_score(id, lead_part, bass_part): downloads a score and reduces it to a lead line (highest voice, or the part you name), a bass line (lowest voice) and one chord per bar. Shows each file (a zip holds one file per movement) with meter, key, tempo, parts and a phrase map (4-bar blocks with letters; the same letter means the lead line returns).
- show_bars(id, file, from_bar, to_bar): the notes of up to 24 bars: per bar the chord, the lead and the bass as note names on the step grid (4/4: 16 steps per bar, 3/4 and 6/8: 12), "_" holds, "." rests.
- submit_material(...): hand in the material. This ends the research.
- no_score_found(reason): say that no usable score of this piece exists in the sources. This ends the research; the user gets an error instead of a song.

How to work:
1. Search, load the most likely score, find the right movement or file, and look at the bars that carry the famous theme. Check them against what you know of the piece: the theme must be recognisable. A file whose notes do not look like the piece is the wrong file or a bad transcription: try another.
2. Choose 2 to ${MAX_SEGMENTS} segments of 4 to ${SCORE_MAX_BARS} bars that together tell the piece: the main theme first, then contrasting material (an episode, a second theme, a bridge), as the piece has them. A segment should start on a downbeat and end at a phrase end. If the lead line jumps between voices in a way that breaks the melody, load again with lead_part set to the melody's part.
3. The score is the anchor: the first segment (the main theme) and at least half of all segments must come from a score of this piece that you loaded and looked at. Once you have it, you may add a segment from memory for a part of the same piece the file lacks or garbles (a second theme, a famous episode, the other movement): in the score's key and meter, as note names on the step grid with chords per bar, label it "(from memory)". Without a score of the piece, nothing from memory: never guess, never use a different piece because it is similar.
4. Before giving up, try at least two search_scores queries (title and composer or artist, other spellings or the original-language title) and at least one web_search for a MIDI, MusicXML or ABC file of the piece, and load the files you find. If none is the piece, or the notes are not recognisably the piece, call no_score_found and say briefly what you searched.
Use at most ${RESEARCH_MAX_CALLS} tool calls before submitting or giving up.`;
}

export function researchUserPrompt(prompt, interpretation) {
  const what = interpretation.kind === 'artist'
    ? `music by ${interpretation.by}${interpretation.work ? ` (${interpretation.work})` : ''}: choose the piece by this composer or artist that fits the prompt best, usually the most famous one`
    : `${interpretation.work}${interpretation.by ? ` by ${interpretation.by}` : ''}`;
  return `Prompt: ${prompt}\n\nThe user wants an interpretation of ${what}. Find its notes and submit the material.`;
}

const obj = (properties, required = Object.keys(properties)) => ({ type: 'object', properties, required, additionalProperties: false });
const s = (description) => ({ type: 'string', description });
const i = (description) => ({ type: 'integer', description });

export function researchTools() {
  const fn = (name, description, parameters) => ({ type: 'function', function: { name, description, parameters } });
  return [
    fn('search_scores', 'Search machine-readable scores (Mutopia classical MIDI, The Session folk ABC).', obj({ query: s('composer and title') })),
    fn('web_search', 'Search the web for facts about the piece or for links to MIDI, MusicXML or ABC files.', obj({ query: s('search query') })),
    fn('load_score', 'Download and reduce a score: overview of each file (meter, key, tempo, parts, phrase map).', obj({
      id: s('an id from search_scores, or "url:https://..." for a MIDI, MusicXML or ABC file'),
      lead_part: i('optional: index of the part that carries the melody (from the parts list); -1 for the highest voice over all parts'),
      bass_part: i('optional: index of the bass part; -1 for the lowest voices'),
    }, ['id'])),
    fn('show_bars', 'Show the reduced notes of some bars of a loaded score.', obj({
      id: s('the id used with load_score'),
      file: i('file index from load_score (0 when there is one file)'),
      from_bar: i('first bar, 1-based'),
      to_bar: i('last bar, inclusive (at most 24 bars per call)'),
    })),
    fn('submit_material', 'Hand in the material for the interpretation. Ends the research.', obj({
      work: s('title of the piece (and movement)'),
      by: s('composer or artist'),
      tempo: { type: 'number', description: 'the tempo the piece is usually played at, bpm of the felt beat (dotted quarter in 6/8)' },
      source: s('where the notes come from, one line (e.g. "Mutopia score, 1st movement")'),
      segments: {
        type: 'array',
        description: `2 to ${MAX_SEGMENTS} segments, the main theme first`,
        items: obj({
          id: s('short id: A, B, C ...'),
          label: s('what it is, e.g. "ritornello: the peasants\' dance"'),
          score_id: s('id of the loaded score, or "" for a segment from memory'),
          file: i('file index in that score (0 when there is one file or from memory)'),
          from_bar: i('first bar (0 from memory)'),
          to_bar: i('last bar, inclusive (0 from memory)'),
          lead: s('only from memory: note names per step in the score\'s meter, e.g. "a5 _ a5 _ a5 _ a#5 _ ..."; else ""'),
          bass: s('only from memory: bass note names per step, or ""'),
          chords: s('only from memory: one chord name per bar, space separated, e.g. "F F C7 F"; else ""'),
        }),
      },
    })),
    fn('no_score_found', 'No usable score of the piece was found. Ends the research with an error for the user.', obj({
      reason: s('one or two sentences: what was searched and why nothing fits'),
    })),
  ];
}


// The model's submit_material + loaded scores -> material, or { error }
// for the model to fix. getReduced(id, file) returns a reduced score or null.
const NOTE = /^[a-g](#|b)?-?\d$/i;
const toks = (v) => String(v || '').trim().split(/\s+/).filter(Boolean);

export function buildMaterial(args, getReduced, extract) {
  const segs = Array.isArray(args?.segments) ? args.segments.slice(0, MAX_SEGMENTS) : [];
  if (!segs.length) return { error: 'no segments' };
  const out = [];
  const problems = [];
  let meter = null;
  let keyRoot = null;
  let mode = null;
  // the score is the anchor: the first segment and at
  // least half of them from a loaded score; memory only fills in parts of
  // the same piece, in the score's meter
  const memory = [];
  for (const [n, seg] of segs.entries()) {
    const id = String(seg.id || String.fromCharCode(65 + n)).replace(/[^A-Za-z0-9]/g, '').slice(0, 4) || String.fromCharCode(65 + n);
    if (out.some((x) => x.id === id) || memory.some((x) => x.id === id)) { problems.push(`segment id ${id} used twice`); continue; }
    if (!seg.score_id) {
      if (n === 0) { problems.push(`${id}: the first segment (the main theme) must come from a loaded score`); continue; }
      memory.push({ id, seg, n });
      continue;
    }
    const r = getReduced(seg.score_id, seg.file || 0);
    if (!r) { problems.push(`${id}: score ${seg.score_id} file ${seg.file || 0} is not loaded`); continue; }
    const from = Math.max(1, Number(seg.from_bar) || 1);
    const to = Math.min(from + SCORE_MAX_BARS - 1, Number(seg.to_bar) || from + 7);
    const m = { ...extract(r, from, to), meter: r.meter, keyRoot: r.keyRoot, mode: r.mode, from: `${seg.score_id.replace(/^url:/, '')} #${seg.file || 0} bars ${from}-${to}`, n };
    if (meter && m.meter !== meter) { problems.push(`${id}: meter ${m.meter} differs from ${meter}; all segments need one meter`); continue; }
    meter = m.meter;
    if (keyRoot === null) { keyRoot = m.keyRoot; mode = m.mode; }
    out.push({ id, label: String(seg.label || '').slice(0, 120), ...m });
  }
  if (memory.length > out.length) problems.push(`${memory.length} segments from memory but only ${out.length} from a score; at least half must come from a score`);
  if (meter) {
    const steps = METERS[meter].steps;
    for (const { id, seg, n } of memory) {
      const line = (v) => toks(v).map((t) => (NOTE.test(t) ? t.toLowerCase() : t === '_' ? '_' : '.'));
      const lead = line(seg.lead);
      const bass = line(seg.bass);
      if (!lead.some((t) => NOTE.test(t))) { problems.push(`${id}: no score_id and no lead notes`); continue; }
      const bars = Math.min(SCORE_MAX_BARS, Math.ceil(lead.length / steps));
      const label = String(seg.label || '').slice(0, 100);
      out.push({
        id, n, label: /memory/i.test(label) ? label : `${label} (from memory)`.trim(), bars, from: 'memory',
        lead: [...lead.slice(0, bars * steps), ...Array(Math.max(0, bars * steps - lead.length)).fill('.')],
        bass: bass.some((t) => NOTE.test(t)) ? [...bass.slice(0, bars * steps), ...Array(Math.max(0, bars * steps - bass.length)).fill('.')] : null,
        chords: toks(seg.chords).slice(0, bars),
      });
    }
  }
  out.sort((a, b) => a.n - b.n);
  // a single missing or unloaded segment sends the whole submission back
  if (!out.length || problems.length) return { error: problems.join('; ') || 'no usable segments' };
  // empty chord bars take the chord before (or the tonic)
  for (const seg of out) {
    const tonic = `${KEY_NAMES[keyRoot]}${mode === 'aeolian' ? 'm' : ''}`;
    let prev = tonic;
    seg.chords = Array.from({ length: seg.bars }, (_, b) => { prev = seg.chords[b] || prev; return prev; });
    for (const k of ['meter', 'keyRoot', 'mode', 'n']) delete seg[k];
  }
  const tempo = Math.round(Math.max(40, Math.min(220, Number(args.tempo) || 110)));
  return {
    material: {
      work: String(args.work || '').slice(0, 120),
      by: String(args.by || '').slice(0, 80),
      source: String(args.source || 'score').slice(0, 160),
      fromScore: memory.length ? 'mixed' : 'score',
      tempo,
      meter,
      keyRoot,
      mode,
      segments: out,
    },
    problems,
  };
}

// The composer's brief schema with a material id per section.
export function interpretationSchema(ids) {
  const schema = structuredClone(briefSchema());
  const sec = schema.properties.sections.items;
  sec.properties.material = { type: 'string', enum: [...ids, 'none'] };
  sec.required = [...sec.required, 'material'];
  return schema;
}

const first = (line, steps, bars = 2) => line.slice(0, steps * bars).join(' ');

export function interpretationUserPrompt(prompt, material, arrangement = [], lens = null) {
  const steps = METERS[material.meter].steps;
  const key = `${KEY_NAMES[material.keyRoot]} ${material.mode}`;
  const segs = material.segments.map((s) => `- ${s.id}: ${s.label || 'segment'}; ${s.bars} bars; chords per bar ${s.chords.join(' ')}; ${s.bass ? 'with its own bass line' : 'no bass line (code writes one from the chords)'}\n  lead, first bars: ${first(s.lead, steps)}`).join('\n');
  return `${lens ? `${lens}\n\n` : ''}Prompt: ${prompt}

This is an interpretation of an existing piece: ${material.work}${material.by ? ` by ${material.by}` : ''}. The notes come from: ${material.source}.

Material (code plays these notes exactly in every section that takes the segment: lead, bass, chords and length come from the segment):
${segs}

Write the song brief for this interpretation:
- Fixed by the material: key ${key}, meter ${material.meter}. Tempo: about ${material.tempo} bpm, the way the piece is played; faster or slower only when the prompt asks for it.
- sections: tell the piece in the order it has, with its returns (a ritornello or main theme that comes back, contrast between). Each section takes one segment in material; its bars and chords then come from the segment (write the segment's bar count and chords anyway). Sections with material "none" are your own (a short intro, a build, an outro, a bridge): give them chords in the key and, if they need one, a theme. Keep the whole song between 45 and 150 seconds.
- Every section that takes a segment must have a texture with a lead (L) so the melody is heard; with a bass line, use a texture with a bass voice (B or M).
- You are free in everything else: style and sid_idiom (the genre of the original, or a C64-native take, as the prompt asks), grooves and drums (the original may have none; add them when the prompt wants a C64 tune), arps, sounds, energy, transitions, variations. Repeated segments can change their texture, lead sound and energy so the piece develops.
- title: the work's name may appear (e.g. "${material.work || 'Autumn'} (SID version)"). reasoning: say how you staged the piece.
${arrangement.length ? `\nSounds and textures drawn by code for this song (keep them unless they work against the piece or the prompt):\n${arrangement.map((c) => `- ${c}`).join('\n')}` : ''}`;
}

// The model's answer (with material per section) -> brief fields: the
// segment's notes, chords and length go into its sections.
export function applyMaterial(brief, answer, material) {
  const byId = Object.fromEntries(material.segments.map((s) => [s.id, s]));
  brief.keyRoot = material.keyRoot;
  brief.mode = material.mode;
  brief.meter = material.meter;
  brief.sections.forEach((sec, n) => {
    const seg = byId[answer.sections?.[n]?.material];
    if (!seg) return;
    sec.score = { lead: seg.lead.join(' '), bass: seg.bass ? seg.bass.join(' ') : '', from: seg.id };
    sec.bars = seg.bars;
    sec.chords = seg.chords;
    sec.chordBars = 1;
    sec.mode = undefined;
    sec.transpose = sec.transpose === 2 || sec.transpose === -2 ? sec.transpose : 0;
  });
  brief.interpretation = {
    work: material.work,
    by: material.by,
    source: material.source,
    fromScore: material.fromScore,
    segments: material.segments.map((s) => ({ id: s.id, label: s.label, bars: s.bars, from: s.from })),
  };
  return brief;
}

// Three readings of the same piece.
export const LENSES_INTERPRETATION = [
  'Interpretation 1 of 3: faithful. The piece as it is, its form and character, with the SID as the instrument; add only what the prompt asks for.',
  'Interpretation 2 of 3: a C64 game or demo tune made of the piece: driving drums, bass in motion, fast arps, sid_idiom high.',
  'Interpretation 3 of 3: a bold genre turn that the prompt allows (for example rock, synthwave, dance or a slow ballad), the melody still clearly the original.',
];

// An interpretation's material back from its brief (for refinements, which
// keep the notes): one segment per distinct segment id in the sections.
export function materialFromBrief(brief) {
  if (!brief?.interpretation) return null;
  const segments = [];
  for (const s of brief.sections || []) {
    const id = s.score?.from;
    if (!id || segments.some((x) => x.id === id)) continue;
    const label = brief.interpretation.segments?.find((x) => x.id === id)?.label || '';
    segments.push({ id, label, bars: s.bars, lead: s.score.lead || [], bass: s.score.bass || null, chords: s.chords.map(String) });
  }
  if (!segments.length) return null;
  return { ...brief.interpretation, keyRoot: brief.keyRoot, mode: brief.mode, meter: brief.meter, tempo: brief.tempo, segments, calls: 0 };
}
