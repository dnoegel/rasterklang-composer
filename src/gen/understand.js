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
    required: ['genres', 'moods', 'energy', 'valence', 'tension', 'sid_idiom', 'fixed', 'reference'],
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
      fixed: { type: 'array', items: en(FIXABLE) },
      reference: { type: 'string' },
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
- fixed: only what the prompt states explicitly: style (a genre, artist or song is named), tempo (slow, fast, a bpm), form, lead (a lead instrument or sound is named), bass, drums, arp. Empty if the prompt states none of them.
- reference: the song or artist the prompt names, else "".

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
    fixed: [...new Set((Array.isArray(answer?.fixed) ? answer.fixed : []).filter((f) => FIXABLE.includes(f)))],
    reference: typeof answer?.reference === 'string' ? answer.reference.slice(0, 120) : '',
  };
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
    fixed: ['style'],
    reference: '',
  };
}
