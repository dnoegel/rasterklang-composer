// Prompt -> intent. puts a language model here; this first slice
// uses keyword matching so the pipeline runs without
// an API key. The intent shape is the contract either way: discrete fields,
// each may be unspecified (null).

import { MOODS, MOOD_WORDS, SCENES } from './moods.js';
import { STYLES } from './styles.js';
import { findArtist } from './hvsc-data.js';
import { KEY_NAMES } from './theory.js';

// English, then German (prompts arrive in both, the app itself is English)
const ENERGY_UP = ['fast', 'energetic', 'high energy', 'intense', 'frantic', 'driving', 'hard', 'wild', 'action', 'speedy',
  'schnell', 'wilde', 'wildes', 'wilder', 'rasant', 'energisch', 'treibend', 'hektisch'];
const ENERGY_DOWN = ['slow', 'calm', 'chill', 'soft', 'quiet', 'minimal', 'laid back', 'lazy', 'gentle',
  'langsam', 'ruhig', 'leise', 'sanft', 'gemütlich', 'entspannt'];
const FORM_WORDS = {
  loop: ['loop', 'looping', 'background', 'schleife', 'hintergrund'],
  short: ['short', 'jingle', 'quick', 'kurz', 'kurzes'],
  song: ['song', 'full song', 'long', 'epic length', 'langes lied'],
};

// The medium, not a genre: a prompt that only asks for "a C64 tune" gets
// the native style; any genre or scene word wins over it
const C64_WORDS = ['c64', 'commodore', 'sid', 'sid tune', 'sid-tune', '8-bit', '8 bit', '8bit'];
// No style word and no mood word at all: spread over the C64-native end
// instead of always landing on the style with the highest base weight
const FALLBACK_STYLES = ['demoscene', 'platformer', 'synthwave', 'newwave'];

// Word match. Words of 5+ letters also match as the start of a longer
// word, so inflections and compounds count ("rainy", "jazzy", "spookiest").
function has(text, word) {
  const w = word.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tail = word.length >= 5 ? '' : '($|[^a-z0-9])';
  return new RegExp(`(^|[^a-z0-9])${w}${tail}`, 'i').test(text);
}

export function parsePrompt(prompt) {
  const text = ` ${prompt.toLowerCase()} `;
  const matched = [];

  const styleScores = {};
  const lastPos = {};
  const byName = {}; // styles whose own genre name is in the prompt
  for (const [id, style] of Object.entries(STYLES)) {
    for (const w of [...new Set([...(style.names || []), ...(style.keywords || [])])]) {
      if (!has(text, w)) continue;
      // the style's own name counts most, longer phrases more than short words
      styleScores[id] = (styleScores[id] || 0) + ((style.names || []).includes(w) ? 3 : w.length > 5 ? 2 : 1);
      lastPos[id] = Math.max(lastPos[id] || 0, text.lastIndexOf(w.toLowerCase()) + w.length);
      if ((style.names || []).includes(w)) byName[id] = true;
      matched.push(w);
    }
  }
  // an artist with an HVSC fingerprint points to its genre's style
  const artist = findArtist(prompt);
  if (artist) {
    matched.push(artist.match);
    if (!Object.keys(styleScores).length) styleScores[artist.style] = 3;
  }
  const namedStyles = { ...styleScores }; // before scene hints: only these may blend

  const moods = {};
  for (const [mood, words] of Object.entries(MOOD_WORDS)) {
    for (const w of words) if (has(text, w)) { moods[mood] = (moods[mood] || 0) + 1; matched.push(w); }
  }

  let scene = null;
  let energy = 0;
  let form = null;
  let sceneHits = [];
  for (const [id, s] of Object.entries(SCENES)) {
    const hits = s.words.filter((w) => has(text, w));
    if (hits.length > sceneHits.length) { scene = id; sceneHits = hits; }
  }
  if (scene) {
    const s = SCENES[scene];
    matched.push(...sceneHits);
    for (const [m, w] of Object.entries(s.moods)) moods[m] = (moods[m] || 0) + w;
    for (const [st, w] of Object.entries(s.styleHint)) styleScores[st] = (styleScores[st] || 0) + w;
    energy += s.energy;
    if (s.form) form = s.form;
  }

  const c64 = C64_WORDS.filter((w) => has(text, w));
  if (c64.length && !Object.keys(styleScores).length) {
    styleScores.demoscene = 1;
    matched.push(...c64);
  }

  for (const w of ENERGY_UP) if (has(text, w)) { energy += 0.25; matched.push(w); }
  for (const w of ENERGY_DOWN) if (has(text, w)) { energy -= 0.25; matched.push(w); }
  for (const [f, words] of Object.entries(FORM_WORDS)) if (words.some((w) => has(text, w))) form = f;

  // Explicit constraints.
  const bpm = /(\d{2,3})\s*bpm/.exec(text);
  const keyMatch = /\b(?:in|key of)\s+([a-g])\s*(#|b|sharp|flat)?\s*(minor|major|m)?\b/i.exec(prompt);
  let key = null;
  if (keyMatch) {
    const base = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }[keyMatch[1].toLowerCase()];
    const acc = keyMatch[2] ? (/#|sharp/.test(keyMatch[2]) ? 1 : -1) : 0;
    const q = (keyMatch[3] || '').toLowerCase();
    key = { root: (base + acc + 12) % 12, minor: q === 'minor' || q === 'm' ? true : q ? false : null };
  }

  // Normalise mood weights, keep the strongest three.
  const moodList = Object.entries(moods).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const total = moodList.reduce((s, [, w]) => s + w, 0) || 1;

  let style = null;
  let blend = null;
  // higher score first; a genre named outright beats one only hinted at by
  // a keyword ("ragtime saloon" is ragtime); near ties between named genres
  // go to the one named last, the head noun in English ("Celtic metal" is
  // metal with Celtic colour)
  const ranked = Object.entries(styleScores).sort((a, b) => {
    if (!byName[a[0]] !== !byName[b[0]]) return byName[a[0]] ? -1 : 1;
    const near = Math.abs(b[1] - a[1]) <= 1;
    const dPos = (lastPos[b[0]] || 0) - (lastPos[a[0]] || 0);
    return near && dPos ? dPos : b[1] - a[1];
  });
  if (ranked.length) style = ranked[0][0];
  // two styles named with similar weight: blend them ("Celtic metal")
  if (ranked.length > 1 && namedStyles[ranked[0][0]] && namedStyles[ranked[1][0]] && ranked[1][1] >= ranked[0][1] * 0.5) {
    blend = { style: ranked[1][0], amount: 0.35 };
  }

  return {
    prompt,
    style, // null = unspecified, decided by moods later
    blend,
    artist: artist ? artist.name : null,
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
  if (!Object.keys(intent.moods).length) {
    let h = 0;
    for (const ch of String(intent.prompt || '')) h = (h * 31 + ch.codePointAt(0)) >>> 0;
    return FALLBACK_STYLES[h % FALLBACK_STYLES.length];
  }
  const score = Object.entries(STYLES).map(([id, st]) => [id,
    (st.base || 0) + Object.entries(st.moods || {}).reduce((sum, [m, w]) => sum + (intent.moods[m] || 0) * w, 0)]);
  return score.sort((a, b) => b[1] - a[1])[0][0];
}

export function describeIntent(intent, styleId) {
  const parts = [STYLES[styleId].name + (intent.blend ? ` × ${STYLES[intent.blend.style].name}` : '')];
  const moods = Object.keys(intent.moods);
  if (moods.length) parts.push(moods.join(' + '));
  if (intent.scene) parts.push(`scene: ${intent.scene.replace('_', ' ')}`);
  if (intent.artist) parts.push(`like ${intent.artist} (HVSC data)`);
  if (intent.key) parts.push(`key ${KEY_NAMES[intent.key.root]}${intent.key.minor === true ? ' minor' : intent.key.minor === false ? ' major' : ''}`);
  return parts.join(', ');
}

export { MOODS };
