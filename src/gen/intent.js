// Prompt -> intent. puts a language model here; this first slice
// uses keyword matching (English and German) so the pipeline runs without
// an API key. The intent shape is the contract either way: discrete fields,
// each may be unspecified (null).

import { MOODS, MOOD_WORDS, SCENES } from './moods.js';
import { STYLES } from './styles.js';
import { KEY_NAMES } from './theory.js';

const STYLE_WORDS = {
  metal: ['metal', 'heavy', 'thrash', 'headbang', 'riff', 'guitar', 'shred', 'rock', 'iron maiden', 'metallica', 'power metal', 'speed metal', 'gitarre', 'headbanger'],
  synthwave: ['synthwave', 'outrun', 'retrowave', '80s', '80er', 'eighties', 'neon', 'cyberpunk', 'miami', 'vaporwave', 'synth', 'synthpop', 'italo', 'night drive', 'blade runner', 'darksynth'],
  platformer: ['platformer', 'platform game', 'jump and run', "jump'n'run", 'jump n run', 'mario', 'sonic', 'giana', 'overworld', 'video game', 'videogame', 'game music', 'spielmusik', 'chiptune', '8-bit', '8 bit', 'arcade', 'level'],
  jig: ['celtic', 'irish', 'jig', 'reel', 'folk', 'fiddle', 'tavern', 'pub', 'scottish', 'bagpipe', 'medieval', 'bard', 'keltisch', 'irisch', 'schottisch', 'mittelalter', 'volksmusik', 'dudelsack', 'taverne', 'kneipe'],
};

const ENERGY_UP = ['fast', 'energetic', 'high energy', 'intense', 'frantic', 'driving', 'hard', 'wild', 'action', 'speedy', 'schnell', 'energisch', 'intensiv', 'treibend', 'wild', 'hart', 'rasant'];
const ENERGY_DOWN = ['slow', 'calm', 'chill', 'soft', 'quiet', 'minimal', 'laid back', 'lazy', 'gentle', 'langsam', 'leise', 'ruhig', 'gemächlich', 'sanft'];
const FORM_WORDS = {
  loop: ['loop', 'looping', 'background', 'schleife', 'hintergrund'],
  short: ['short', 'jingle', 'quick', 'kurz', 'kurzes'],
  song: ['song', 'full song', 'long', 'epic length', 'lang', 'ganzer song'],
};

// Word match that works for umlauts. Words of 5+ letters also match as the
// start of a longer word, so German inflections and compounds count
// ("irische", "Kneipenmusik", "fröhliche").
function has(text, word) {
  const w = word.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tail = word.length >= 5 ? '' : '($|[^a-zäöüß0-9])';
  return new RegExp(`(^|[^a-zäöüß0-9])${w}${tail}`, 'i').test(text);
}

export function parsePrompt(prompt) {
  const text = ` ${prompt.toLowerCase()} `;
  const matched = [];

  const styleScores = {};
  for (const [id, words] of Object.entries(STYLE_WORDS)) {
    for (const w of words) if (has(text, w)) { styleScores[id] = (styleScores[id] || 0) + (w.length > 5 ? 2 : 1); matched.push(w); }
  }

  const moods = {};
  for (const [mood, words] of Object.entries(MOOD_WORDS)) {
    for (const w of words) if (has(text, w)) { moods[mood] = (moods[mood] || 0) + 1; matched.push(w); }
  }

  let scene = null;
  let energy = 0;
  let form = null;
  for (const [id, s] of Object.entries(SCENES)) {
    if (s.words.some((w) => has(text, w))) {
      scene = id;
      matched.push(...s.words.filter((w) => has(text, w)));
      for (const [m, w] of Object.entries(s.moods)) moods[m] = (moods[m] || 0) + w;
      for (const [st, w] of Object.entries(s.styleHint)) styleScores[st] = (styleScores[st] || 0) + w;
      energy += s.energy;
      if (s.form) form = s.form;
      break;
    }
  }

  for (const w of ENERGY_UP) if (has(text, w)) { energy += 0.25; matched.push(w); }
  for (const w of ENERGY_DOWN) if (has(text, w)) { energy -= 0.25; matched.push(w); }
  for (const [f, words] of Object.entries(FORM_WORDS)) if (words.some((w) => has(text, w))) form = f;

  // Explicit constraints.
  const bpm = /(\d{2,3})\s*bpm/.exec(text);
  const keyMatch = /\b(?:in|key of)\s+([a-g])\s*(#|b|sharp|flat|is|es)?\s*(minor|major|moll|dur|m)?\b/i.exec(prompt);
  let key = null;
  if (keyMatch) {
    const base = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }[keyMatch[1].toLowerCase()];
    const acc = keyMatch[2] ? (/#|sharp|is/.test(keyMatch[2]) ? 1 : -1) : 0;
    const q = (keyMatch[3] || '').toLowerCase();
    key = { root: (base + acc + 12) % 12, minor: q === 'minor' || q === 'moll' || q === 'm' ? true : q ? false : null };
  }

  // Normalise mood weights, keep the strongest three.
  const moodList = Object.entries(moods).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const total = moodList.reduce((s, [, w]) => s + w, 0) || 1;

  let style = null;
  const ranked = Object.entries(styleScores).sort((a, b) => b[1] - a[1]);
  if (ranked.length) style = ranked[0][0];

  return {
    prompt,
    style, // null = unspecified, decided by moods later
    styleScores,
    moods: Object.fromEntries(moodList.map(([m, w]) => [m, w / total])),
    scene,
    energy: Math.max(-0.6, Math.min(0.6, energy)),
    form,
    tempo: bpm ? Number(bpm[1]) : null,
    key,
    matched: [...new Set(matched)],
  };
}

// Fill unspecified fields from moods: a style is always needed downstream.
export function resolveStyle(intent) {
  if (intent.style) return intent.style;
  const m = intent.moods;
  const score = {
    metal: (m.aggressive || 0) * 2 + (m.menacing || 0) + (m.epic || 0) * 0.6,
    synthwave: (m.nostalgic || 0) * 2 + (m.dreamy || 0) * 1.5 + (m.melancholic || 0) + (m.mysterious || 0) * 0.8 + 0.3,
    platformer: (m.happy || 0) * 1.5 + (m.playful || 0) * 2 + (m.triumphant || 0) * 0.8 + (m.hopeful || 0) * 0.6,
    jig: (m.playful || 0) * 0.5 + (m.happy || 0) * 0.4,
  };
  return Object.entries(score).sort((a, b) => b[1] - a[1])[0][0];
}

export function describeIntent(intent, styleId) {
  const parts = [STYLES[styleId].name];
  const moods = Object.keys(intent.moods);
  if (moods.length) parts.push(moods.join(' + '));
  if (intent.scene) parts.push(`scene: ${intent.scene.replace('_', ' ')}`);
  if (intent.key) parts.push(`key ${KEY_NAMES[intent.key.root]}${intent.key.minor === true ? ' minor' : intent.key.minor === false ? ' major' : ''}`);
  return parts.join(', ');
}

export { MOODS };
