// First pass of an AI song: a small, fast model only reads the
// prompt (genre candidates, moods, energy, how C64-native, what the prompt
// fixes). It makes no musical choices. Code then draws the arrangement and
// the sounds from this reading (src/gen/voicing.js), and the composer model
// writes the brief with them as defaults. The model understands the prompt
// far better than keyword matching; code is better at varying the result.

import { STYLES } from './styles.js';
import { MOODS } from './moods.js';

// What a prompt can pin down; code draws only what stays free.
export const FIXABLE = ['style', 'tempo', 'form', 'lead', 'bass', 'drums', 'arp'];

export function understandSchema() {
  const num = { type: 'number' };
  const en = (values) => ({ type: 'string', enum: values });
  return {
    type: 'object',
    additionalProperties: false,
    required: ['genres', 'moods', 'energy', 'valence', 'tension', 'sid_idiom', 'arc', 'fixed', 'reference', 'interpretation'],
    properties: {
      genres: {
        type: 'array',
        items: { type: 'object', additionalProperties: false, required: ['style', 'weight'], properties: { style: en(Object.keys(STYLES)), weight: num } },
      },
      moods: {
        type: 'array',
        items: { type: 'object', additionalProperties: false, required: ['mood', 'weight'], properties: { mood: en(Object.keys(MOODS)), weight: num } },
      },
      energy: num,
      valence: num,
      tension: num,
      sid_idiom: num,
      arc: {
        type: 'array',
        items: { type: 'object', additionalProperties: false, required: ['mood', 'energy', 'share'], properties: { mood: en(Object.keys(MOODS)), energy: num, share: num } },
      },
      fixed: { type: 'array', items: en(FIXABLE) },
      reference: { type: 'string' },
      interpretation: {
        type: 'object',
        additionalProperties: false,
        required: ['kind', 'work', 'by'],
        properties: { kind: en(['none', 'work', 'artist']), work: { type: 'string' }, by: { type: 'string' } },
      },
    },
  };
}

export function understandSystemPrompt() {
  const styles = Object.entries(STYLES).map(([id, s]) => `${id} (${s.name})`).join(', ');
  return `You read prompts for a generator that plays music of any genre on the C64's SID chip. You do not compose. You only say what the prompt asks for, as JSON:
- genres: 1 to 3 styles from the list that would fit, with weights summing to 1. If the prompt names a genre, artist or song, that style gets most of the weight. If it only paints a picture or a mood, spread the weight over the styles that could all carry it well, not only the most obvious one.
- moods: 1 to 3 from the list, with weights summing to 1.
- energy (0 calm to 1 driving), valence (0 dark or sad to 1 bright or happy), tension (0 relaxed to 1 tense), each 0 to 1.
- sid_idiom 0 to 1: 0 the genre played faithfully on the SID, 1 fully C64-native game and demo music. Games, arcades, computers, robots, space, neon, demos, loaders and tapes pull towards 1; a named acoustic or traditional genre towards 0; pure imagery sits wherever it is most vivid.
- arc: only if the prompt tells a sequence (first this, then that; starts ... ends ...; suddenly ...): its 2 to 4 phases in order, each with a mood, an energy 0 to 1 and its share of the song (shares sum to 1). Empty if the prompt describes one state.
- fixed: only what the prompt states explicitly: style (a genre, artist or song is named), tempo (slow, fast, a bpm), form, lead (a lead instrument or sound is named), bass, drums, arp. Empty if the prompt states none of them.
- reference: the song or artist the prompt names, else "".
- interpretation: whether the prompt asks to play an existing piece itself, its real melody, as a cover, version or interpretation. kind "work" when it names a piece ("Vivaldi's Autumn as a C64 tune", "Für Elise im SID-Sound", "a chiptune cover of Billie Jean", "spiel Greensleeves", "Ich möchte den Herbst von Vivaldi"). A film, game, series or musical named as the thing to play ("Lord of the Rings in a SID tune", "Star Wars als C64-Song", "Zelda on the SID") asks for its best-known theme: kind "work", work the theme's common title, or the franchise with "main theme" ("The Lord of the Rings: main theme"), by its composer. "artist" when it asks for the music of a composer or artist itself without naming a piece ("Vivaldi interpreted on the C64", "play some Bach"). "none" when a piece or artist only describes a sound or style ("sounds like Depeche Mode", "in the style of Rob Hubbard", "epic like a film score") or nothing is named. work: the title as commonly known in English, with the movement if the prompt names one ("The Four Seasons: Autumn"), else ""; by: composer or artist, else "".

Styles: ${styles}
Moods: ${Object.keys(MOODS).join(', ')}`;
}

export const understandPrompt = (prompt) => `Prompt: ${prompt}`;

const clamp01 = (x, d = 0.5) => (Number.isFinite(Number(x)) ? Math.max(0, Math.min(1, Number(x))) : d);
const weights = (list, key, known, max) => {
  const out = {};
  for (const item of Array.isArray(list) ? list : []) {
    const id = item?.[key];
    const w = Number(item?.weight);
    if (known[id] && w > 0) out[id] = (out[id] || 0) + w;
  }
  const top = Object.entries(out).sort((a, b) => b[1] - a[1]).slice(0, max);
  const total = top.reduce((s, [, w]) => s + w, 0) || 1;
  return Object.fromEntries(top.map(([id, w]) => [id, w / total]));
};

// 2-4 phases in order, shares summing to 1; anything else is no arc
function cleanArc(list) {
  const phases = (Array.isArray(list) ? list : []).filter((p) => MOODS[p?.mood]).slice(0, 4)
    .map((p) => ({ mood: p.mood, energy: clamp01(p.energy), share: Math.max(0.05, Number(p.share) || 1) }));
  if (phases.length < 2) return [];
  const total = phases.reduce((s, p) => s + p.share, 0);
  return phases.map((p) => ({ ...p, share: Math.round((p.share / total) * 100) / 100 }));
}

// The model's answer -> a clean reading, or null if it names no style.
export function cleanUnderstanding(answer) {
  const genres = weights(answer?.genres, 'style', STYLES, 3);
  if (!Object.keys(genres).length) return null;
  return {
    genres,
    moods: weights(answer?.moods, 'mood', MOODS, 3),
    energy: clamp01(answer?.energy),
    valence: clamp01(answer?.valence),
    tension: clamp01(answer?.tension),
    sidIdiom: clamp01(answer?.sid_idiom, null),
    arc: cleanArc(answer?.arc),
    fixed: [...new Set((Array.isArray(answer?.fixed) ? answer.fixed : []).filter((f) => FIXABLE.includes(f)))],
    reference: typeof answer?.reference === 'string' ? answer.reference.slice(0, 120) : '',
    interpretation: cleanInterpretation(answer?.interpretation),
  };
}

// "play this piece": null unless the prompt asks for one
export function cleanInterpretation(x) {
  if (!x || !['work', 'artist'].includes(x.kind)) return null;
  const work = typeof x.work === 'string' ? x.work.trim().slice(0, 120) : '';
  const by = typeof x.by === 'string' ? x.by.trim().slice(0, 80) : '';
  if (x.kind === 'work' && !work) return null;
  if (x.kind === 'artist' && !by) return null;
  return { kind: x.kind, work, by };
}

// A radio stop already carries style and moods chosen by code.
export function understandingFromStop(stop) {
  const moodEnergy = stop.moods.reduce((s, m) => s + (MOODS[m]?.energy || 0), 0) / (stop.moods.length || 1);
  return {
    genres: { [stop.style]: 1 },
    moods: Object.fromEntries(stop.moods.map((m) => [m, 1 / stop.moods.length])),
    energy: clamp01(0.5 + moodEnergy * 1.5),
    valence: null,
    tension: null,
    sidIdiom: null,
    arc: [],
    fixed: ['style'],
    reference: '',
    interpretation: null,
  };
}
