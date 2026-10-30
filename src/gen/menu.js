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
import { LEADS, BASSES, SNARES, KITS, ARPS, CUSTOM_LEAD } from './library/palettes.js';
import { findArtist, artistSummary } from './hvsc-data.js';
import { VARIATIONS } from './melody.js';
import { HVSC_BASS_ROWS } from './library/hvsc-rhythms.js';
import { C64_LEADS, C64_ARPS, C64_TEXTURES, C64_FEELS, isC64Bass, isC64Groove } from './idiom.js';
import { drawVoicing } from './voicing.js';

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
    required: ['reasoning', 'title', 'imagery', 'liner_note', 'style', 'blend_style', 'blend_amount', 'sid_idiom', 'moods', 'tempo', 'meter', 'key', 'mode', 'palette', 'sound', 'sections', 'themes'],
    properties: {
      reasoning: str,
      title: str,
      imagery: str,
      liner_note: str,
      style: en(Object.keys(STYLES)),
      blend_style: en(['none', ...Object.keys(STYLES)]),
      sid_idiom: { type: 'number' },
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
        required: ['bass', 'snare', 'chords', 'kit', 'arp'],
        properties: { bass: en(Object.keys(BASSES)), snare: en(Object.keys(SNARES)), chords: en(['power', 'triad']), kit: en(Object.keys(KITS)), arp: en(Object.keys(ARPS)) },
      },
      sound: {
        type: 'object',
        additionalProperties: false,
        required: ['wave', 'attack', 'decay', 'sustain', 'release', 'vibrato', 'pwm', 'pulse_width', 'onset', 'slide'],
        properties: {
          wave: en(['none', 'pulse', 'saw', 'triangle']), attack: int, decay: int, sustain: int, release: int, vibrato: num, pwm: en(['none', 'slow', 'medium', 'fast']),
          pulse_width: en(['narrow', 'medium', 'square']), onset: en(['none', 'noise', 'octave']), slide: en(['none', 'short', 'long']),
        },
      },
      sections: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['type', 'bars', 'energy', 'energy_end', 'filter', 'texture', 'transition', 'groove', 'drums_pattern', 'bass', 'bass_pattern', 'bass_sound', 'arp_pattern', 'feel', 'lead', 'chords', 'chord_bars', 'transpose', 'variation'],
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
            bass_sound: en(['palette', ...Object.keys(BASSES)]),
            feel: en(feels),
            lead: en([...Object.keys(LEADS), CUSTOM_LEAD]),
            chords: { type: 'array', items: str },
            chord_bars: int,
            transpose: int,
            variation: en(Object.keys(VARIATIONS)),
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
  const c64 = (yes) => (yes ? ' (C64)' : '');
  const grooves = lines(GROOVES, (g, id) => `${g.meter}, ${g.name}, energy ${g.energy.join('-')}, ${g.tags.join('/')}${c64(isC64Groove(id))}`);
  const bass = lines(BASS, (b, id) => `${b.meter}, ${b.name}, energy ${b.energy.join('-')}, row ${b.row}${c64(isC64Bass(id))}`);
  const feels = Object.entries(CELLS).map(([m, f]) => `- ${m}: ${Object.keys(f).map((x) => `${x}${c64(C64_FEELS.includes(x))}`).join(', ')}`).join('\n');
  const textures = lines(TEXTURES, (t, id) => `${t.kind}: ${t.name}; voices per stage ${t.stages.map(([f, r]) => `${f}:${r}`).join(' ')}${c64(C64_TEXTURES.includes(id))}`);
  const transitions = lines(TRANSITIONS, (t) => t.name);
  const forms = lines(FORMS, (f) => f.sections.map(([t, b]) => `${t}${b}`).join(' '));
  const progs = lines(PROGRESSIONS, (p) => `${p.tonality}: ${p.chords.join(' ')} (${p.tags.join('/')})`);
  return `## Styles
${styles}

## Grooves (drums, one SID voice)
${grooves}

## Bass idioms (R root, 5 fifth, 8 octave, 3 third, 6 sixth, b flat 7th, 2 scale step above, 4 fourth, A approach note)
${bass}

## Melody feels per meter
${feels}

## Textures (voices per stage: D drums, B bass, L lead, A chord arpeggio, M bass+drums on one voice, C counter-melody, E echo of the lead (an eighth later, softer), - silent; code may put an echo on a silent voice under the lead; the number is the fraction of the section where the stage starts)
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
- leads: ${Object.entries(LEADS).map(([k, v]) => `${k} (${v})${c64(C64_LEADS.includes(k))}`).join(', ')}
- arp sounds (palette.arp, the chord arpeggio voice): ${Object.entries(ARPS).map(([k, v]) => `${k} (${v})${c64(C64_ARPS.includes(k))}`).join(', ')}
- bass sounds: ${Object.entries(BASSES).map(([k, v]) => `${k} (${v})`).join(', ')}
- snares: ${Object.entries(SNARES).map(([k, v]) => `${k} (${v})`).join(', ')}
- drum kits (kick, snare, hat; a kit other than std replaces snare and snare2, a clap stays): ${Object.entries(KITS).map(([k, v]) => `${k} (${v.name})`).join(', ')}

## Moods
${Object.keys(MOODS).join(', ')}

## Variations of a repeated section (field variation; the melody of a section type comes back each time it repeats)
${lines(VARIATIONS, (v) => v)}

## Section types and default energy
${Object.entries(SECTION_ENERGY).map(([k, v]) => `${k} ${v}`).join(', ')}`;
}

export function systemPrompt() {
  return `You are the composer and arranger of a generator that plays music of any genre on the SID sound chip of the Commodore 64. The SID has three voices; drums, bass, chords (as fast arpeggios) and lead share them. You do not write every note of the song. You write a song brief: you choose from a menu of tested building blocks, write your own patterns and themes, decide the form, the energy curve, the textures and the harmony. Code then composes and renders the song from your brief with music-theory rules (motif development, chord tones on strong beats, cadences), so keep to the formats below.

Goal: the listener must recognise the prompt in the music. Genre is recognised mostly by tempo, groove and bass idiom, then by scale and one signature device; mood mostly by mode (major/minor brightness), then tempo, then register and articulation. Generated music tends to sound emotionally neutral, so make your choices clearly characteristic. Be creative inside the rules: an unexpected but fitting texture, a strong hook, a surprising but musical form are welcome. Avoid cliches you would pick every time.

The SID can play any genre, and it has a native idiom of its own. Place every song on a spectrum, sid_idiom from 0 to 1. At 0 the genre is played faithfully on the SID: its groove, bass idiom and harmony, the chip only the instrument. At 1 the song is fully C64-native, the way the classic game and demo composers wrote: bass in constant motion (octave 16ths, root-fifth-octave runs, gallops, syncopated octave jumps), fast chord arpeggios as a main voice, quick runs and ornaments in the lead, echo, octave/ring/sync leads, pulse-width sweeps, a driving beat. Most songs sit in between: a genre with C64 colour, or a C64 tune with a genre's groove and harmony. Read the prompt: games, arcades, computers, robots, space, neon, demos, loaders and tapes pull towards 1; a named acoustic or traditional genre pulls towards 0 unless the prompt asks for a twist; imagery and moods leave you free, so choose what makes the picture most vivid, and do not settle in the middle by habit. The building blocks marked (C64) in the menu carry the native idiom: use more of them, and in more sections, the higher the value. Whatever the value, keep the prompt's genre recognisable in its chorus.

Reference songs: when the prompt names an existing song or artist, recreate its musical fingerprint as closely as you can: tempo, key and mode, meter, form with section lengths, the dynamics between sections (for example a quiet verse and an explosive chorus), the groove (write drums_pattern), the bass behaviour (bass_pattern), the chord progression, the arrangement and the timbres (pick sounds or design a custom sound that imitates the original instrument), and signature devices (stops, riffs, shouts as short staccato bursts).  Say in reasoning which features you took from the reference.

Rules:
- The user prompt brings an arrangement and sounds drawn by code for this song, so that songs differ from each other. They are your starting point, not a suggestion among many: keep them, and change one only when it clearly works against the prompt, a reference song or a melody. Then choose something that fits better, not the most common choice, and name in reasoning what you changed and why.
- Use the style whose signature grooves and bass fit the prompt; use blend_style (amount 0.2-0.5) only when the prompt names two genres, else "none".
- The groove and bass ids must match the meter you choose. Main sections (verse, chorus) should use at least one signature groove or bass of the style.
- Tempo inside the style's band unless the prompt asks otherwise. tempo is bpm of the felt beat (dotted quarter in 6/8 and 12/8).
- Bars per section: 2, 4, 8, 16 (12 for blues). Total length 30 to 150 seconds. Contrast: the chorus should differ from the verse (energy, texture, groove or harmony) and come back recognisably.
- Chords: roman numerals relative to the tonic, read against the major scale: lowercase minor (i, iv, v), b for flat (bVI, bVII, bIII, bII), suffixes 7, M7, m7 (use "ii7"), dim, sus2, sus4, 5. They should fit the mode. One chord per bar; the list repeats over the section. A section's chords list may be 2 to 16 entries.
- chord_bars: 1 (one chord per bar) or 2 (each chord lasts two bars; slower harmonic rhythm, common in SID music).
- transpose: 0, or 2 for a key change up a whole step on a late chorus.
- Themes (optional but encouraged for the chorus, and the verse): "notes" is one token per step of 1 to 4 bars, space separated. Steps per bar: 4/4 = 16 (16th notes), 3/4 = 12, 6/8 = 12 (16th notes), 12/8 = 12 (8th triplets). Token: a scale degree 1-7 (8-14 for the octave above, -1 to -7 for the octave below), "_" holds the previous note, "." is a rest. Write a memorable hook: a short motif that comes back, developed rather than copied (a sequence a step higher, a changed ending, a fragment), mostly steps with one leap into a high point, ending on a stable degree (1, 3 or 5). Give each song its own rhythm; the user prompt shows one example shape, do not copy it.
- energy per section 0-1; intros, breakdowns and outros lower, choruses and solos higher.
- Pick textures per section: intros, breakdowns, builds and outros have their own textures; main sections use main textures. Vary them: not every song starts the same way.
- energy is where a section starts, energy_end where it ends (0-1): let pre-choruses and builds rise, choruses plateau or lift a little, outros fall. Drums, arpeggio density and the filter follow it bar by bar. filter: follow (default), open, close, wobble, steady.
- Make the grooves yours: drums_pattern, bass_pattern and arp_pattern let you write the section's own pattern instead of the library id (keep the id as fallback). One character per step, 1 or 2 bars (two bars alternate), steps per bar as for themes. Drums: k kick, s snare, c clap, h closed hat, o open hat, t low tom, T high tom, x crash, . rest (one voice: one hit per step). Bass, resolved against each chord: R root, 5 fifth, 8 octave, 3 third, 6 sixth, b flat seventh, 2 the scale step above the root, 4 the fourth, A approach note to the next chord, _ hold, . rest. Arp rhythm of the chord voice: x hit, _ hold, . rest. Write patterns for the verse and chorus at least whenever the genre needs a particular groove (a reggae one drop, a funk bass, a jig lilt); leave "" to use the library. Examples 4/4: drums "k.h.s.hkk.h.s.hh", bass "R..R..8.R.b.R.5.", arp "x.x.x_x_x.x.x___".
- Themes may be 1 to 4 bars; a 3-4 bar theme is a full phrase and is played twice in an 8-bar section.
- The bass is a full voice, not just the root: in main sections give it movement (octaves, fifths, thirds, steps, syncopation, approach notes) with a bass_pattern of its own, and let verse and chorus bass differ. Held bass (whole_note, sustained, half_note) belongs to calm sections or genres that need it. Code adds walks and runs at phrase ends.
- bass_sound per section: "palette" keeps the song's bass sound; another id changes the colour for that section (for example sub in the verse, growl or chipbass in the chorus, slidebass for 808 or acid slides).
- sound designs the lead "custom": wave pulse, saw or triangle (or "none" for no custom lead), attack/decay/release 0-12, sustain 0-15 (SID envelope nibbles: 0 fast, 12 slow), vibrato 0-3, pwm none/slow/medium/fast (pulse only), pulse_width narrow (nasal, thin), medium or square (hollow, full; static width when pwm is none), onset none/noise (a hard click, like a picked string or a chiff)/octave (a bright octave blip at each note start), slide none/short/long (portamento between notes). Design a sound that fits this prompt, not a safe middle. First name its character, then set the numbers for it; characters to pick, blend or go beyond: glassy (instant attack, long decay, little sustain, long release), breathy (soft attack, noise onset like a chiff, light vibrato), biting (saw or narrow pulse, instant attack, high sustain, noise onset), nasal (narrow pulse, no pwm), hollow (square pulse, static, no vibrato), shimmering (pulse with fast pwm and vibrato), percussive (fast decay, no sustain, short release), singing (high sustain, strong vibrato, short slide), swelling (slow attack, full sustain, slow release), dry chip (square, no vibrato, staccato). These are directions, not fixed values: choose every number for this song. Use lead "custom" in the sections that should have this sound.
- Leads: choose the lead colour for the prompt, and use two or three colours per song (a softer verse, a brighter chorus, another for the solo or bridge). bell is one colour among many, not a default.
- Sounds marked (HVSC) are instrument programs taken from real C64 songs (tracker); palette.kit picks the drum kit, std is the bank's own. They sound most at home in game, synth, dance, pop and rock prompts.
- Textures: the chorus does not always need "full". counter, counter_nodrums and duet add a counter-melody under the lead; build_up_band brings the band in during the section. Vary textures between repeats of a section when it helps the story.
- variation: how a repeated section's melody changes against its first time (the head of each phrase stays, so the hook is recognised). "auto" lets code choose; use "exact" only when a literal repeat is the point (a riff, a chant). Give the second and third chorus different variations when the story builds.
- Forms: verse/chorus is not the only option. AABA, a through-composed piece, a chorus only at the end, or a single long build are fine when they fit the prompt.
- sid_idiom: 0-1, see above; say in reasoning why the song sits there.
- reasoning: 2-4 short sentences on how your choices express the prompt (in english).
- title: short, evocative, no real song or artist names. imagery: one line of the picture the music paints (english). liner_note: 1-2 sentences for the listener (english).

Menu:

${menuText()}`;
}

// Creative constraints drawn by code: push the model away from
// its most likely answer. `rand` is a function returning [0, 1).
export const CONSTRAINTS = [
  'Use a stop-time transition right before the last chorus.',
  'Include a breakdown where the drums drop out.',
  'Let the bridge move to a different tonal colour (relative major or minor, or a borrowed chord).',
  'Give the chorus a different groove than the verse.',
  'Write a theme for the chorus whose highest note falls on the third beat.',
  'Use call and response between lead and chords in at least one section.',
  'End the song with layers dropping out one by one.',
  'Use a key change up a whole step on the last chorus.',
  'Keep the verse sparse and let the chorus explode in energy.',

  'Write the verse theme so it starts on an offbeat.',
  'Use a pre-chorus that builds tension before every chorus.',
  'Write your own drums_pattern and bass_pattern for the chorus.',
  'Give the second chorus a different texture than the first, for example a counter-melody.',
  'Design a custom lead sound that fits the imagery and use it for the main theme.',
  'Let one section build its energy from low to high within itself.',
  'Write a theme of four bars for the chorus.',
  'Write the chorus hook as a sequence: a short figure, then the same figure a step higher or lower.',
  'Let the chorus theme open with a leap of a fourth or more, then fall back by steps.',
  'Write a syncopated hook with at least two notes off the beat.',
  'Give every repeat of the chorus a different variation, ending with the octave.',
  'Let the verse theme be a question and the chorus theme its answer: the same rhythm, a different contour.',
];

// Example hook shapes: one per song, chosen from the
// constraints, so the model does not copy a single example everywhere.
export const THEME_EXAMPLES = [
  '5 _ _ 3 4 _ 5 _ 6 _ 5 _ 3 _ _ _',
  '1 _ 3 _ 5 _ _ _ 6 5 4 _ 3 _ . .',
  '. . 3 _ 2 _ 1 _ 2 _ _ _ 5 _ _ _',
  '8 _ _ _ 7 _ 6 _ 5 _ _ 4 3 _ _ _',
  '3 3 _ 4 5 _ 3 _ . 2 _ 1 2 _ _ _',
  '5 _ . 5 6 _ 5 _ 8 _ _ _ 7 _ 5 _',
  '1 _ _ 2 3 _ _ 5 _ _ 4 _ 3 _ _ _',
  '. 6 _ 5 . 6 _ 5 3 _ _ _ 2 _ 1 _',
];
const hashText = (t) => [...t].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
export const themeExampleFor = (constraints) => THEME_EXAMPLES[hashText(constraints.join('|')) % THEME_EXAMPLES.length];

export function drawConstraints(rand, n = 2) {
  const pool = [...CONSTRAINTS];
  const out = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  return out;
}

// Keys drawn by code: left alone, the model put almost half of all songs
// in D. One key per song, distinct across the three interpretations.
export function drawKeys(rand, n = 1) {
  const pool = [...KEYS];
  const out = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  return out;
}

// Arrangement choices drawn by code. Left alone, every model
// answered the same: six models given one prompt all opened with
// drone_lead, kept the tempo at the bottom of the band and used the same
// chorus groove. Abstract constraints ("an untypical intro") had a modal
// answer too. So code draws concrete picks; the model may deviate only for
// the prompt, a reference song or a melody.
const INTRO_DRAW = { none: 3, staggered: 1, riff_solo: 1, countin: 1, cold_start: 1, arp_swell: 1, drone_lead: 0.5, twin_lead: 1, drum_groove: 1 };
const TEMPO_DRAW = ['lower third', 'middle', 'upper third'];
// "full" (drums, bass, lead) took 89 % of first choruses
const CHORUS_DRAW = { full: 1, multiplex: 1, counter: 1, call_response: 0.7, build_up_band: 0.5 };
const FORM_DRAW = [
  'verse and chorus with a contrasting bridge before the last chorus',
  'verse, pre-chorus and chorus; the pre-chorus builds tension',
  'AABA: the A section carries the hook, B contrasts in harmony and texture',
  'one long build: start sparse, add a layer every section, peak at the end',
  'verse and chorus with a breakdown (drums out) before the last chorus',
  'short and direct: verse and chorus twice, a short outro',
  'a through-composed journey: every section new, only the chorus hook returns',
];
const weighted = (rand, weights) => {
  const entries = Object.entries(weights);
  let r = rand() * entries.reduce((a, [, w]) => a + w, 0);
  for (const [k, w] of entries) { r -= w; if (r <= 0) return k; }
  return entries[entries.length - 1][0];
};

// intros: restrict the intro draw (the three readings each get a group)
const weightedRow = (rand, rows) => {
  let r = rand() * rows.reduce((a, [, n]) => a + Math.sqrt(n), 0);
  for (const [row, n] of rows) { r -= Math.sqrt(n); if (r <= 0) return row; }
  return rows[rows.length - 1][0];
};

// prompt, understanding: the sounds follow the first pass's
// reading of the prompt, else the rule-based one; what the
// prompt fixed is not drawn
export function drawArrangement(rand, { intros = null, prompt = '', understanding = null } = {}) {
  const fixed = new Set(understanding?.fixed || []);
  const pool = intros ? Object.fromEntries(intros.map((t) => [t, INTRO_DRAW[t] ?? 1])) : INTRO_DRAW;
  const intro = weighted(rand, pool);
  const tempo = TEMPO_DRAW[Math.floor(rand() * TEMPO_DRAW.length)];
  const form = FORM_DRAW[Math.floor(rand() * FORM_DRAW.length)];
  const chorus = weighted(rand, CHORUS_DRAW);
  const slow = rand() < 0.4;
  const leads = [...Object.keys(LEADS), CUSTOM_LEAD];
  const lead = leads[Math.floor(rand() * leads.length)];
  // a verse bass figure of real C64 music: without it the model
  // wrote the same few figures. (Two drawn hook rhythms made the lead more
  // uniform, not less, and were dropped:
  const onsets = (p) => [...p].filter((c) => c !== '.' && c !== '_').length;
  const bassFigure = weightedRow(rand, HVSC_BASS_ROWS.filter(([r]) => onsets(r) >= 3 && onsets(r) <= 10));
  return [
    intro === 'none' ? 'Start directly with the first verse or the chorus: no intro section.' : `Open with an intro of texture ${intro}.`,
    fixed.has('tempo') ? null : `Set the tempo in the ${tempo} of the chosen style's tempo band.`,
    fixed.has('form') ? null : `Form: ${form}.`,
    `Use the texture ${chorus} for the first chorus.`,
    slow ? 'Let the verse chords last two bars each (chord_bars 2).' : null,
    fixed.has('lead') ? null : `Give the chorus the lead sound ${lead}${lead === CUSTOM_LEAD ? ' (design it in sound)' : ''}; other sections may use other leads.`,
    fixed.has('bass') ? null : `If the song is in 4/4, use this bass figure from real C64 tunes as the verse bass_pattern: "${bassFigure}".`,
    ...drawVoicing(rand, prompt, understanding).lines,
  ].filter(Boolean);
}

export const arrangementNote = 'Arrangement drawn for this song (follow it unless the prompt, a reference song or a melody clearly needs otherwise):';

export const keyConstraint = (key) => `Play in the key of ${key}, unless the prompt, a reference song or a melody clearly needs another key.`;

export function userPrompt(prompt, constraints, errors = null, melody = null, arrangement = null) {
  let text = `Prompt: ${prompt}\n\nCreative constraints for this song (follow them if they do not contradict the prompt):\n${constraints.map((c) => `- ${c}`).join('\n')}`;
  if (arrangement?.length) text += `\n\n${arrangementNote}\n${arrangement.map((c) => `- ${c}`).join('\n')}`;
  text += `\n\nOne possible hook shape in 4/4, for orientation only (write your own): "${themeExampleFor(constraints)}"`;
  const artist = findArtist(prompt);
  if (artist) {
    text += `\n\nMeasured facts to guide your choices (style ${artist.style}): ${artistSummary(artist)} Use the drum rows, bass rows and loops as patterns where they fit.`;
  }
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
    sidIdiom: Number.isFinite(answer.sid_idiom) ? answer.sid_idiom : null,
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
      transpose: x.transpose, chordBars: x.chord_bars, variation: x.variation, drumPattern: x.drums_pattern, bassPattern: x.bass_pattern, arpPattern: x.arp_pattern,
      bassSound: x.bass_sound,
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

export function userPromptWithLens(prompt, constraints, assignment, melody = null, arrangement = null) {
  const a = typeof assignment === 'string' ? { lens: assignment } : assignment;
  let text = a.lens;
  if (a.intros && !arrangement) text += `\nThe intro texture must be one of: ${a.intros.join(', ')}.`;
  text += '\nGive the song a title that does not simply repeat words of the prompt.';
  return `${text}\n\n${userPrompt(prompt, constraints, null, melody, arrangement)}`;
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
    sid_idiom: brief.sidIdiom ?? 0.3,
    moods: Object.entries(brief.moods || {}).map(([mood, weight]) => ({ mood, weight: Math.round(weight * 100) / 100 })),
    tempo: brief.tempo,
    meter: brief.meter,
    key: KEYS[brief.keyRoot] || 'C',
    mode: brief.mode,
    palette: { kit: 'std', arp: 'pwm', ...brief.palette },
    sound: { wave: 'none', attack: 0, decay: 9, sustain: 10, release: 6, vibrato: 0, pwm: 'none', pulse_width: 'square', onset: 'none', slide: 'none', ...(brief.sound || {}) },
    sections: brief.sections.map((s) => ({
      type: s.type, bars: s.bars, energy: s.energy, energy_end: s.energyEnd ?? s.energy, filter: s.filter || 'follow',
      texture: s.texture, transition: s.transition, groove: s.groove, drums_pattern: (s.drumPattern || []).join(''),
      bass: s.bass, bass_pattern: (s.bassPattern || []).join(''), bass_sound: s.bassSound || 'palette', arp_pattern: (s.arpPattern || []).join(''),
      feel: s.feel, lead: s.lead, chords: s.chords, chord_bars: s.chordBars || 1, transpose: s.transpose || 0, variation: s.variation || 'auto',
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

Return the complete revised brief. Change what the request needs and keep everything else, especially themes, title and the overall form, unless the request asks otherwise. Update reasoning to explain the change (in English).`;
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
  return `You review C64 SID songs made by a rule-based generator from a song brief. You cannot hear the song; you get a precise description of what it contains, measured by code. Judge whether a listener would recognise the prompt in it: genre identity (tempo, groove, bass idiom, scale, signature device), mood (mode brightness, tempo, register, articulation), dramaturgy (form, energy curve, contrast between verse and chorus, intro and ending), and the hook. Be concrete and short. Answer in English.
- assessment: 2-3 sentences, in English.
- fit: 1-5, how well the song matches the prompt.
- issues: up to 4 concrete problems, each one sentence.
- suggestion: one change request, phrased as an instruction for the arranger (for example "Give the chorus a halftime groove and let the drums drop out in the last bar before the chorus."). It will be applied to the brief.

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
