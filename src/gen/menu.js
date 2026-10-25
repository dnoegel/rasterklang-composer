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
import { TEXTURES, TRANSITIONS } from './library/textures.js';
import { FORMS, SECTION_ENERGY } from './library/forms.js';
import { LEADS, BASSES, SNARES, PERSONAS } from './library/palettes.js';

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
    required: ['reasoning', 'title', 'imagery', 'liner_note', 'style', 'blend_style', 'blend_amount', 'persona', 'moods', 'tempo', 'meter', 'key', 'mode', 'palette', 'sections', 'themes'],
    properties: {
      reasoning: str,
      title: str,
      imagery: str,
      liner_note: str,
      style: en(Object.keys(STYLES)),
      blend_style: en(['none', ...Object.keys(STYLES)]),
      blend_amount: num,
      persona: en(Object.keys(PERSONAS)),
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
      sections: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['type', 'bars', 'energy', 'texture', 'transition', 'groove', 'bass', 'feel', 'lead', 'chords', 'transpose'],
          properties: {
            type: en(SECTION_TYPES),
            bars: int,
            energy: num,
            texture: en(Object.keys(TEXTURES)),
            transition: en(Object.keys(TRANSITIONS)),
            groove: en(Object.keys(GROOVES)),
            bass: en(Object.keys(BASS)),
            feel: en(feels),
            lead: en(Object.keys(LEADS)),
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

## Example forms (for orientation, you may write your own)
${forms}

## Example progressions (you may write your own roman numerals)
${progs}

## Sounds
- leads: ${Object.entries(LEADS).map(([k, v]) => `${k} (${v})`).join(', ')}
- bass sounds: ${Object.entries(BASSES).map(([k, v]) => `${k} (${v})`).join(', ')}
- snares: ${Object.entries(SNARES).map(([k, v]) => `${k} (${v})`).join(', ')}
- personas: ${Object.entries(PERSONAS).map(([k, v]) => `${k} (${v.name})`).join(', ')}

## Moods
${Object.keys(MOODS).join(', ')}

## Section types and default energy
${Object.entries(SECTION_ENERGY).map(([k, v]) => `${k} ${v}`).join(', ')}`;
}

export function systemPrompt() {
  return `You are the composer and arranger of a C64 SID music generator. The SID chip has three voices; drums, bass, chords (as fast arpeggios) and lead share them. You do not write the notes of the whole song. You write a song brief: you choose from a menu of tested building blocks, decide the form, the energy curve, the textures, the harmony, and you may invent short themes. Code then composes and renders the song from your brief with music-theory rules (motif development, chord tones on strong beats, cadences, voice leading), so keep to the menu.

Goal: the listener must recognise the prompt in the music. Genre is recognised mostly by tempo, groove and bass idiom, then by scale and one signature device; mood mostly by mode (major/minor brightness), then tempo, then register and articulation. Generated music tends to sound emotionally neutral, so make your choices clearly characteristic. Be creative inside the rules: an unexpected but fitting texture, a strong hook, a surprising but musical form are welcome. Avoid cliches you would pick every time.

Rules:
- Use the style whose signature grooves and bass fit the prompt; use blend_style (amount 0.2-0.5) only when the prompt names two genres, else "none".
- The groove and bass ids must match the meter you choose. Main sections (verse, chorus) should use at least one signature groove or bass of the style.
- Tempo inside the style's band unless the prompt asks otherwise. tempo is bpm of the felt beat (dotted quarter in 6/8 and 12/8).
- Bars per section: 2, 4, 8, 16 (12 for blues). Total length 30 to 150 seconds. Contrast: the chorus should differ from the verse (energy, texture, groove or harmony) and come back recognisably.
- Chords: roman numerals relative to the tonic, read against the major scale: lowercase minor (i, iv, v), b for flat (bVI, bVII, bIII, bII), suffixes 7, M7, m7 (use "ii7"), dim, sus2, sus4, 5. They should fit the mode. One chord per bar; the list repeats over the section. A section's chords list may be 2 to 16 entries.
- transpose: 0, or 2 for a key change up a whole step on a late chorus.
- Themes (optional but encouraged for the chorus, and the verse): "notes" is one token per step of 1 or 2 bars, space separated. Steps per bar: 4/4 = 16 (16th notes), 3/4 = 12, 6/8 = 12 (16th notes), 12/8 = 12 (8th triplets). Token: a scale degree 1-7 (8-14 for the octave above, -1 to -7 for the octave below), "_" holds the previous note, "." is a rest. Write a memorable hook: a few notes, repetition, mostly steps with one leap into a high point, ending on a stable degree (1, 3 or 5). Example 4/4 bar: "5 _ _ 3 4 _ 5 _ 6 _ 5 _ 3 _ _ _".
- energy per section 0-1; intros, breakdowns and outros lower, choruses and solos higher.
- Pick textures per section: intros, breakdowns, builds and outros have their own textures; main sections use main textures. Vary them: not every song starts the same way.
- reasoning: 2-4 short sentences on how your choices express the prompt (in German).
- title: short, evocative, no real song or artist names. imagery: one line of the picture the music paints (German). liner_note: 1-2 sentences for the listener (German).
- Never copy melodies of existing songs; prompts naming an artist map to a style description.

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
  'Choose a persona whose habits suit the prompt and let it shape the textures.',
  'Write the verse theme so it starts on an offbeat.',
  'Use a pre-chorus that builds tension before every chorus.',
];

export function drawConstraints(rand, n = 2) {
  const pool = [...CONSTRAINTS];
  const out = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  return out;
}

export function userPrompt(prompt, constraints, errors = null) {
  let text = `Prompt: ${prompt}\n\nCreative constraints for this song (follow them if they do not contradict the prompt):\n${constraints.map((c) => `- ${c}`).join('\n')}`;
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
    persona: answer.persona,
    moods,
    tempo: answer.tempo,
    meter: answer.meter,
    keyRoot: Math.max(0, KEYS.indexOf(answer.key)),
    mode: answer.mode,
    palette: answer.palette,
    sections: answer.sections,
    themes,
  };
}
