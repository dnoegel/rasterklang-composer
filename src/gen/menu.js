// What the LLM may choose from: the library as a compact menu,
// the JSON schema of its answer, the system prompt, creative constraints,
// and the conversion of its answer into a brief. Built from the library,
// so new entries show up in the menu automatically.

import { STYLES } from './styles.js';
import { MOODS } from './moods.js';
import { SCALES, KEY_NAMES } from './theory.js';
import { METERS } from './library/meters.js';
import { GROOVES } from './library/grooves.js';
import { BASS } from './library/bass.js';
import { CELLS } from './library/cells.js';
import { PROGRESSIONS } from './library/progressions.js';
import { TEXTURES, TRANSITIONS, FILTER_SHAPES } from './library/textures.js';
import { FORMS, SECTION_ENERGY } from './library/forms.js';
import { LEADS, BASSES, SNARES, CUSTOM_LEAD } from './library/palettes.js';

const SECTION_TYPES = Object.keys(SECTION_ENERGY);
const KEYS = KEY_NAMES;

export function briefSchema() {
  const str = { type: 'string' };
  const num = { type: 'number' };
  const int = { type: 'integer' };
  const en = (values) => ({ type: 'string', enum: values });
  const feels = [...new Set(Object.values(CELLS).flatMap((m) => Object.keys(m)))];
  return {
    type: 'object',
    additionalProperties: false,
    required: ['reasoning', 'title', 'imagery', 'liner_note', 'style', 'blend_style', 'blend_amount', 'moods', 'tempo', 'meter', 'key', 'mode', 'palette', 'sound', 'sections', 'themes'],
    properties: {
      reasoning: str,
      title: str,
      imagery: str,
      liner_note: str,
      style: en(Object.keys(STYLES)),
      blend_style: en(['none', ...Object.keys(STYLES)]),
      blend_amount: num,
      moods: {
        type: 'array',
        items: { type: 'object', additionalProperties: false, required: ['mood', 'weight'], properties: { mood: en(Object.keys(MOODS)), weight: num } },
      },
      tempo: num,
      meter: en(Object.keys(METERS)),
      key: en(KEYS),
      mode: en(Object.keys(SCALES)),
      palette: {
        type: 'object',
        additionalProperties: false,
        required: ['bass', 'snare', 'chords'],
        properties: { bass: en(Object.keys(BASSES)), snare: en(Object.keys(SNARES)), chords: en(['power', 'triad']) },
      },
      sound: {
        type: 'object',
        additionalProperties: false,
        required: ['wave', 'attack', 'decay', 'sustain', 'release', 'vibrato', 'pwm'],
        properties: {
          wave: en(['none', 'pulse', 'saw', 'triangle']), attack: int, decay: int, sustain: int, release: int, vibrato: num, pwm: en(['none', 'slow', 'medium', 'fast']),
        },
      },
      sections: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['type', 'bars', 'energy', 'energy_end', 'filter', 'texture', 'transition', 'groove', 'drums_pattern', 'bass', 'bass_pattern', 'arp_pattern', 'feel', 'lead', 'chords', 'transpose'],
          properties: {
            type: en(SECTION_TYPES),
            bars: int,
            energy: num,
            energy_end: num,
            filter: en(Object.keys(FILTER_SHAPES)),
            drums_pattern: str,
            bass_pattern: str,
            arp_pattern: str,
            texture: en(Object.keys(TEXTURES)),
            transition: en(Object.keys(TRANSITIONS)),
            groove: en(Object.keys(GROOVES)),
            bass: en(Object.keys(BASS)),
            feel: en(feels),
            lead: en([...Object.keys(LEADS), CUSTOM_LEAD]),
            chords: { type: 'array', items: str },
            transpose: int,
          },
        },
      },
      themes: {
        type: 'array',
        items: { type: 'object', additionalProperties: false, required: ['section', 'notes'], properties: { section: en(SECTION_TYPES), notes: str } },
      },
    },
  };
}

function lines(obj, fn) {
  return Object.entries(obj).map(([id, v]) => `- ${id}: ${fn(v, id)}`).join('\n');
}

export function menuText() {
  const styles = lines(STYLES, (s) => `${s.name}; meter ${Object.keys(s.meter).join('/')}; ${Math.round(s.tempo[0])}-${Math.round(s.tempo[1])} bpm; `
    + `signature grooves ${(s.signature.grooves || []).join(', ')}; signature bass ${(s.signature.bass || []).join(', ')}`
    + `${s.signature.lead ? `; signature lead ${s.signature.lead.join(', ')}` : ''}; typical modes ${Object.keys(s.modes).join(', ')}`);
  const grooves = lines(GROOVES, (g) => `${g.meter}, ${g.name}, energy ${g.energy.join('-')}, ${g.tags.join('/')}`);
  const bass = lines(BASS, (b) => `${b.meter}, ${b.name}, energy ${b.energy.join('-')}, row ${b.row}`);
  const feels = Object.entries(CELLS).map(([m, f]) => `- ${m}: ${Object.keys(f).join(', ')}`).join('\n');
  const textures = lines(TEXTURES, (t) => `${t.kind}: ${t.name}; voices per stage ${t.stages.map(([f, r]) => `${f}:${r}`).join(' ')}`);
  const transitions = lines(TRANSITIONS, (t) => t.name);
  const forms = lines(FORMS, (f) => f.sections.map(([t, b]) => `${t}${b}`).join(' '));
  const progs = lines(PROGRESSIONS, (p) => `${p.tonality}: ${p.chords.join(' ')} (${p.tags.join('/')})`);
  return `## Styles
${styles}

## Grooves (drums, one SID voice)
${grooves}

## Bass idioms (R root, 5 fifth, 8 octave, 3 third, 6 sixth, b flat 7th, A approach note)
${bass}

## Melody feels per meter
${feels}

## Textures (voices per stage: D drums, B bass, L lead, A chord arpeggio, M bass+drums on one voice, - silent; the number is the fraction of the section where the stage starts)
${textures}

## Transitions (end of a section)
${transitions}

## Filter shapes over a section (the low-pass on the bass voice)
${lines(FILTER_SHAPES, (v) => v)}

## Example forms (for orientation, you may write your own)
${forms}

## Example progressions (you may write your own roman numerals)
${progs}

## Sounds
- leads: ${Object.entries(LEADS).map(([k, v]) => `${k} (${v})`).join(', ')}
- bass sounds: ${Object.entries(BASSES).map(([k, v]) => `${k} (${v})`).join(', ')}
- snares: ${Object.entries(SNARES).map(([k, v]) => `${k} (${v})`).join(', ')}

## Moods
${Object.keys(MOODS).join(', ')}

## Section types and default energy
${Object.entries(SECTION_ENERGY).map(([k, v]) => `${k} ${v}`).join(', ')}`;
}

export function systemPrompt() {
  return `You are the composer and arranger of a generator that plays music of any genre on the SID sound chip of the Commodore 64. The SID has three voices; drums, bass, chords (as fast arpeggios) and lead share them. You do not write every note of the song. You write a song brief: you choose from a menu of tested building blocks, write your own patterns and themes, decide the form, the energy curve, the textures and the harmony. Code then composes and renders the song from your brief with music-theory rules (motif development, chord tones on strong beats, cadences), so keep to the formats below.

Goal: the listener must recognise the prompt in the music. Genre is recognised mostly by tempo, groove and bass idiom, then by scale and one signature device; mood mostly by mode (major/minor brightness), then tempo, then register and articulation. Generated music tends to sound emotionally neutral, so make your choices clearly characteristic. Be creative inside the rules: an unexpected but fitting texture, a strong hook, a surprising but musical form are welcome. Avoid cliches you would pick every time.

The SID is only the instrument. A rock, pop, hip-hop or folk prompt gets that genre, played on the SID: do not turn it into retro, synthwave, chiptune, demoscene or game music. Choose those styles only when the prompt is about games, the 80s, retro or the C64 scene.

Reference songs: when the prompt names an existing song or artist, recreate its musical fingerprint as closely as you can: tempo, key and mode, meter, form with section lengths, the dynamics between sections (for example a quiet verse and an explosive chorus), the groove (write drums_pattern), the bass behaviour (bass_pattern), the chord progression, the arrangement and the timbres (pick sounds or design a custom sound that imitates the original instrument), and signature devices (stops, riffs, shouts as short staccato bursts).  Say in reasoning which features you took from the reference.

Rules:
- Use the style whose signature grooves and bass fit the prompt; use blend_style (amount 0.2-0.5) only when the prompt names two genres, else "none".
- The groove and bass ids must match the meter you choose. Main sections (verse, chorus) should use at least one signature groove or bass of the style.
- Tempo inside the style's band unless the prompt asks otherwise. tempo is bpm of the felt beat (dotted quarter in 6/8 and 12/8).
- Bars per section: 2, 4, 8, 16 (12 for blues). Total length 30 to 150 seconds. Contrast: the chorus should differ from the verse (energy, texture, groove or harmony) and come back recognisably.
- Chords: roman numerals relative to the tonic, read against the major scale: lowercase minor (i, iv, v), b for flat (bVI, bVII, bIII, bII), suffixes 7, M7, m7 (use "ii7"), dim, sus2, sus4, 5. They should fit the mode. One chord per bar; the list repeats over the section. A section's chords list may be 2 to 16 entries.
- transpose: 0, or 2 for a key change up a whole step on a late chorus.
- Themes (optional but encouraged for the chorus, and the verse): "notes" is one token per step of 1 to 4 bars, space separated. Steps per bar: 4/4 = 16 (16th notes), 3/4 = 12, 6/8 = 12 (16th notes), 12/8 = 12 (8th triplets). Token: a scale degree 1-7 (8-14 for the octave above, -1 to -7 for the octave below), "_" holds the previous note, "." is a rest. Write a memorable hook: a few notes, repetition, mostly steps with one leap into a high point, ending on a stable degree (1, 3 or 5). Example 4/4 bar: "5 _ _ 3 4 _ 5 _ 6 _ 5 _ 3 _ _ _".
- energy per section 0-1; intros, breakdowns and outros lower, choruses and solos higher.
- Pick textures per section: intros, breakdowns, builds and outros have their own textures; main sections use main textures. Vary them: not every song starts the same way.
- energy is where a section starts, energy_end where it ends (0-1): let pre-choruses and builds rise, choruses plateau or lift a little, outros fall. Drums, arpeggio density and the filter follow it bar by bar. filter: follow (default), open, close, wobble, steady.
- Make the grooves yours: drums_pattern, bass_pattern and arp_pattern let you write the section's own pattern instead of the library id (keep the id as fallback). One character per step, 1 or 2 bars (two bars alternate), steps per bar as for themes. Drums: k kick, s snare, c clap, h closed hat, o open hat, t low tom, T high tom, x crash, . rest (one voice: one hit per step). Bass, resolved against each chord: R root, 5 fifth, 8 octave, 3 third, 6 sixth, b flat seventh, A approach note to the next chord, _ hold, . rest. Arp rhythm of the chord voice: x hit, _ hold, . rest. Write patterns for the verse and chorus at least whenever the genre needs a particular groove (a reggae one drop, a funk bass, a jig lilt); leave "" to use the library. Examples 4/4: drums "k.h.s.hkk.h.s.hh", bass "R..R..8.R.b.R.5.", arp "x.x.x_x_x.x.x___".
- Themes may be 1 to 4 bars; a 3-4 bar theme is a full phrase and is played twice in an 8-bar section.
- sound designs the lead "custom": wave pulse, saw or triangle (or "none" for no custom lead), attack/decay/release 0-12, sustain 0-15 (SID envelope nibbles: 0 fast, 12 slow), vibrato 0-3, pwm none/slow/medium/fast (pulse only). Use lead "custom" in the sections that should have this sound.
- Textures: the chorus does not always need "full". counter, counter_nodrums and duet add a counter-melody under the lead; build_up_band brings the band in during the section. Vary textures between repeats of a section when it helps the story.
- Forms: verse/chorus is not the only option. AABA, a through-composed piece, a chorus only at the end, or a single long build are fine when they fit the prompt.
- reasoning: 2-4 short sentences on how your choices express the prompt (in english).
- title: short, evocative, no real song or artist names. imagery: one line of the picture the music paints (english). liner_note: 1-2 sentences for the listener (english).

Menu:

${menuText()}`;
}

// Creative constraints drawn by code: push the model away from
// its most likely answer. `rand` is a function returning [0, 1).
export const CONSTRAINTS = [
  'Start the song with a texture that is not the most typical intro for this style.',
  'Use a stop-time transition right before the last chorus.',
  'Include a breakdown where the drums drop out.',
  'Let the bridge move to a different tonal colour (relative major or minor, or a borrowed chord).',
  'Give the chorus a different groove than the verse.',
  'Write a theme for the chorus whose highest note falls on the third beat.',
  'Begin with the chorus theme (cold start), then build down into the verse.',
  'Use call and response between lead and chords in at least one section.',
  'End the song with layers dropping out one by one.',
  'Use a key change up a whole step on the last chorus.',
  'Keep the verse sparse and let the chorus explode in energy.',

  'Write the verse theme so it starts on an offbeat.',
  'Use a pre-chorus that builds tension before every chorus.',
  'Write your own drums_pattern and bass_pattern for the chorus.',
  'Use an AABA form instead of verse and chorus.',
  'Give the second chorus a different texture than the first, for example a counter-melody.',
  'Design a custom lead sound that fits the imagery and use it for the main theme.',
  'Let one section build its energy from low to high within itself.',
  'Write a theme of four bars for the chorus.',
];

export function drawConstraints(rand, n = 2) {
  const pool = [...CONSTRAINTS];
  const out = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  return out;
}

export function userPrompt(prompt, constraints, errors = null, melody = null) {
  let text = `Prompt: ${prompt}\n\nCreative constraints for this song (follow them if they do not contradict the prompt):\n${constraints.map((c) => `- ${c}`).join('\n')}`;
  if (melody) {
    text += `\n\nThe user brings their own melody for the ${melody.section} (note names, one token per step, "_" hold, "." rest): ${melody.notes}\nChoose a key, mode, meter and chords that fit this melody. Do not write a theme for the ${melody.section}; the user's melody will be used there.`;
  }
  if (errors?.length) text += `\n\nYour previous brief had these problems, fix them:\n${errors.map((e) => `- ${e}`).join('\n')}`;
  return text;
}

// Model answer -> brief (the validator does the rest).
export function answerToBrief(answer, prompt) {
  const moods = {};
  let total = 0;
  for (const { mood, weight } of answer.moods || []) if (MOODS[mood] && weight > 0) { moods[mood] = weight; total += weight; }
  for (const m of Object.keys(moods)) moods[m] /= total || 1;
  const themes = {};
  for (const t of answer.themes || []) if (t?.section && t.notes) themes[t.section] = { notes: t.notes };
  return {
    version: 1,
    source: 'llm',
    prompt,
    title: answer.title,
    imagery: answer.imagery,
    liner: answer.liner_note,
    reasoning: answer.reasoning,
    style: answer.style,
    blend: answer.blend_style && answer.blend_style !== 'none' ? { style: answer.blend_style, amount: answer.blend_amount } : null,
    moods,
    tempo: answer.tempo,
    meter: answer.meter,
    keyRoot: Math.max(0, KEYS.indexOf(answer.key)),
    mode: answer.mode,
    palette: answer.palette,
    sound: answer.sound && answer.sound.wave && answer.sound.wave !== 'none' ? answer.sound : null,
    sections: (answer.sections || []).map((x) => ({
      type: x.type, bars: x.bars, energy: x.energy, energyEnd: x.energy_end, filter: x.filter, texture: x.texture,
      transition: x.transition, groove: x.groove, bass: x.bass, feel: x.feel, lead: x.lead, chords: x.chords,
      transpose: x.transpose, drumPattern: x.drums_pattern, bassPattern: x.bass_pattern, arpPattern: x.arp_pattern,
    })),
    themes,
  };
}

// --- interpretations, refinement, critique -----------------------

// Lenses for "three interpretations": the same prompt read three ways.
export const LENSES = [
  'Interpretation 1 of 3: the most fitting, classic reading of the prompt. A listener should recognise it at once.',
  'Interpretation 2 of 3: a bolder reading. Choose a different style or blend than the obvious one, as long as the prompt is still clearly recognisable.',
  'Interpretation 3 of 3: an unexpected angle. Start from the imagery or story of the prompt, choose an unusual form and textures, and let the music tell that story.',
];

// Parallel calls cannot see each other, so code makes them differ: each
// reading gets its own group of intro textures.
const INTRO_GROUPS = [
  ['staggered', 'drum_groove', 'countin'],
  ['riff_solo', 'cold_start', 'twin_lead'],
  ['arp_swell', 'drone_lead', 'twin_lead', 'staggered'],
];

export function lensAssignments(rand) {
  const groups = [...INTRO_GROUPS].sort(() => rand() - 0.5);
  return LENSES.map((lens, i) => ({ lens, intros: groups[i] }));
}

export function userPromptWithLens(prompt, constraints, assignment, melody = null) {
  const a = typeof assignment === 'string' ? { lens: assignment } : assignment;
  let text = a.lens;
  if (a.intros) text += `\nThe intro texture must be one of: ${a.intros.join(', ')}.`;
  text += '\nGive the song a title that does not simply repeat words of the prompt.';
  return `${text}\n\n${userPrompt(prompt, constraints, null, melody)}`;
}

// Brief -> the model's answer format, so it can be edited and sent back.
export function briefToAnswer(brief) {
  return {
    reasoning: brief.reasoning || '',
    title: brief.title || '',
    imagery: brief.imagery || '',
    liner_note: brief.liner || '',
    style: brief.style,
    blend_style: brief.blend?.style || 'none',
    blend_amount: brief.blend?.amount || 0,
    moods: Object.entries(brief.moods || {}).map(([mood, weight]) => ({ mood, weight: Math.round(weight * 100) / 100 })),
    tempo: brief.tempo,
    meter: brief.meter,
    key: KEYS[brief.keyRoot] || 'C',
    mode: brief.mode,
    palette: brief.palette,
    sound: brief.sound || { wave: 'none', attack: 0, decay: 9, sustain: 10, release: 6, vibrato: 0, pwm: 'none' },
    sections: brief.sections.map((s) => ({
      type: s.type, bars: s.bars, energy: s.energy, energy_end: s.energyEnd ?? s.energy, filter: s.filter || 'follow',
      texture: s.texture, transition: s.transition, groove: s.groove, drums_pattern: (s.drumPattern || []).join(''),
      bass: s.bass, bass_pattern: (s.bassPattern || []).join(''), arp_pattern: (s.arpPattern || []).join(''),
      feel: s.feel, lead: s.lead, chords: s.chords, transpose: s.transpose || 0,
    })),
    themes: Object.entries(brief.themes || {}).map(([section, t]) => ({ section, notes: t.notes })),
  };
}

export function refinePrompt(prompt, brief, description, instruction) {
  return `The song was written for this prompt: ${prompt}

Current song brief (JSON, your answer format):
${JSON.stringify(briefToAnswer(brief))}

What the rendered song actually contains (measured by code):
${description}

Change request: ${instruction}

Return the complete revised brief. Change what the request needs and keep everything else, especially themes, title and the overall form, unless the request asks otherwise. Update reasoning to explain the change (German).`;
}

export function critiqueSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['assessment', 'fit', 'issues', 'suggestion'],
    properties: {
      assessment: { type: 'string' },
      fit: { type: 'integer' },
      issues: { type: 'array', items: { type: 'string' } },
      suggestion: { type: 'string' },
    },
  };
}

export function critiqueSystemPrompt() {
  return `You review C64 SID songs made by a rule-based generator from a song brief. You cannot hear the song; you get a precise description of what it contains, measured by code. Judge whether a listener would recognise the prompt in it: genre identity (tempo, groove, bass idiom, scale, signature device), mood (mode brightness, tempo, register, articulation), dramaturgy (form, energy curve, contrast between verse and chorus, intro and ending), and the hook. Be concrete and short. Answer in German.
- assessment: 2-3 sentences.
- fit: 1-5, how well the song matches the prompt.
- issues: up to 4 concrete problems, each one sentence.
- suggestion: one change request, phrased as an instruction for the arranger (for example "Gib dem Refrain einen Halftime-Groove und lass die Drums im letzten Takt vor dem Refrain aussetzen."). It will be applied to the brief.

Building blocks the arranger can use:

${menuText()}`;
}

export function critiquePrompt(prompt, description) {
  return `Prompt: ${prompt}\n\nThe song:\n${description}`;
}

// A melody the user typed as note names ("e4 _ g4 a4 . .") -> theme tokens
// (scale degrees) in the brief's key and mode. Notes outside the scale
// become the degree below plus a sharp ("4#"), so nothing is lost.
export function melodyToTheme(notes, keyRoot, mode, scales) {
  const NAMES = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  const toks = String(notes).trim().split(/\s+/).filter(Boolean);
  const midi = (t) => {
    const m = /^([a-gA-G])([#sb]?)(-?\d)$/.exec(t);
    if (!m) return null;
    return (Number(m[3]) + 1) * 12 + NAMES[m[1].toLowerCase()] + (m[2] === '#' || m[2] === 's' ? 1 : m[2] === 'b' ? -1 : 0);
  };
  const pitches = toks.map(midi).filter((n) => n !== null);
  if (!pitches.length) return null;
  const low = Math.min(...pitches);
  let tonic = low - ((((low - keyRoot) % 12) + 12) % 12);
  const scale = scales[mode] || scales.ionian;
  const out = toks.map((t) => {
    if (t === '_' || t === '.' || t === '~' || t === '-') return t === '_' ? '_' : '.';
    const n = midi(t);
    if (n === null) return '.';
    const rel = n - tonic;
    const oct = Math.floor(rel / 12);
    const pc = ((rel % 12) + 12) % 12;
    // exact scale degree, or the degree below raised by a semitone ("4#")
    let idx = scale.indexOf(pc);
    let alt = '';
    if (idx < 0) {
      idx = scale.reduce((best, v, i) => (v < pc ? i : best), 0);
      alt = '#';
    }
    return `${oct * 7 + idx + 1}${alt}`;
  });
  return out.join(' ');
}
