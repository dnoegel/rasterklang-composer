// Sounds drawn by code for a model brief. Left alone, the model
// collapsed on the same colours: every AI song played the pwm arpeggio (the
// schema had no arp field), custom leads were mostly a medium pulse with a
// slow sweep, 47 % used the sub bass, 42 % of main sections the
// "syncopated" feel. So code draws one coherent set of sounds per song and
// hands it over as the default; the model keeps it unless it clearly fights
// the prompt, and says in reasoning what it changed.
//
// The draw follows a reading of the prompt: the first model pass's genre
// candidates, moods, energy and SID idiom, or the rule-based
// reading when that pass is missing. So the defaults mostly fit; the
// composer corrects the rest.

import { parsePrompt, resolveStyle } from './intent.js';
import { sampleBrief } from './brief.js';
import { ARPS, BASSES, KITS } from './library/palettes.js';
import { STYLES } from './styles.js';

const pick = (rand, list) => list[Math.floor(rand() * list.length)];
const between = (rand, [lo, hi]) => lo + Math.floor(rand() * (hi - lo + 1));
const weighted = (rand, weights) => {
  const entries = Object.entries(weights);
  let r = rand() * entries.reduce((a, [, w]) => a + w, 0);
  for (const [k, w] of entries) { r -= w; if (r <= 0) return k; }
  return entries[entries.length - 1][0];
};

// The ten lead characters of the system prompt as ranges; code draws the
// numbers inside them, so a model that copies them still gets a new sound.
export const CHARACTERS = {
  glassy: { wave: ['triangle', 'pulse'], pw: ['narrow', 'medium'], pwm: ['none', 'slow'], a: [0, 0], d: [7, 10], s: [0, 4], r: [7, 10], vib: [0, 1], onset: ['none', 'octave'], slide: ['none'] },
  breathy: { wave: ['triangle', 'pulse'], pw: ['medium', 'square'], pwm: ['none', 'slow'], a: [2, 5], d: [6, 9], s: [8, 12], r: [6, 9], vib: [1, 2], onset: ['noise'], slide: ['none', 'short'] },
  biting: { wave: ['saw', 'pulse'], pw: ['narrow'], pwm: ['none', 'medium'], a: [0, 0], d: [5, 8], s: [11, 14], r: [3, 6], vib: [0, 1], onset: ['noise', 'none'], slide: ['none'] },
  nasal: { wave: ['pulse'], pw: ['narrow'], pwm: ['none'], a: [0, 1], d: [6, 9], s: [9, 12], r: [4, 7], vib: [1, 2], onset: ['none'], slide: ['none', 'short'] },
  hollow: { wave: ['pulse'], pw: ['square'], pwm: ['none'], a: [0, 2], d: [6, 9], s: [10, 13], r: [4, 7], vib: [0, 0], onset: ['none', 'octave'], slide: ['none'] },
  shimmering: { wave: ['pulse'], pw: ['medium', 'square'], pwm: ['fast', 'medium'], a: [0, 2], d: [6, 9], s: [9, 12], r: [6, 9], vib: [2, 3], onset: ['none'], slide: ['none'] },
  percussive: { wave: ['pulse', 'triangle', 'saw'], pw: ['narrow', 'medium'], pwm: ['none'], a: [0, 0], d: [4, 7], s: [0, 0], r: [2, 5], vib: [0, 0], onset: ['noise', 'octave'], slide: ['none'] },
  singing: { wave: ['saw', 'pulse'], pw: ['medium'], pwm: ['slow', 'none'], a: [1, 3], d: [7, 10], s: [12, 15], r: [5, 8], vib: [2, 3], onset: ['none'], slide: ['short'] },
  swelling: { wave: ['triangle', 'saw', 'pulse'], pw: ['square', 'medium'], pwm: ['slow', 'none'], a: [6, 10], d: [8, 11], s: [13, 15], r: [8, 12], vib: [1, 1], onset: ['none'], slide: ['none', 'long'] },
  'dry chip': { wave: ['pulse'], pw: ['square'], pwm: ['none'], a: [0, 0], d: [5, 8], s: [6, 10], r: [1, 3], vib: [0, 0], onset: ['none'], slide: ['none'] },
};

export function drawSound(rand, character) {
  const c = CHARACTERS[character];
  const wave = pick(rand, c.wave);
  const pulse = wave === 'pulse';
  return {
    wave,
    attack: between(rand, c.a),
    decay: between(rand, c.d),
    sustain: between(rand, c.s),
    release: between(rand, c.r),
    vibrato: between(rand, c.vib),
    pwm: pulse ? pick(rand, c.pwm) : 'none',
    pulse_width: pulse ? pick(rand, c.pw) : 'square',
    onset: pick(rand, c.onset),
    slide: pick(rand, c.slide),
  };
}

// Soft characters for calm prompts, hard ones for driving prompts, chip
// colours along the SID-idiom spectrum (energy -0.6 to 0.6). Nothing drops
// to zero: an unexpected colour is still possible.
const SOFT = ['glassy', 'breathy', 'hollow', 'singing', 'swelling'];
const HARD = ['biting', 'nasal', 'percussive', 'dry chip', 'shimmering'];
const CHIP = ['dry chip', 'shimmering', 'hollow'];
export function characterWeights(energy, idiom) {
  return Object.fromEntries(Object.keys(CHARACTERS).map((c) => {
    let w = 1;
    if (SOFT.includes(c)) w *= Math.max(0.15, 1 - energy * 1.4);
    if (HARD.includes(c)) w *= Math.max(0.15, 1 + energy * 1.4);
    if (CHIP.includes(c)) w *= 0.6 + idiom;
    return [c, w];
  }));
}

// Rhythms of the chord arpeggio voice in 4/4 (x hit, _ hold, . rest). The
// model wrote no arp pattern in most main sections and otherwise plain
// eighths or the system prompt's example.
const ARP_RHYTHMS_NATIVE = {
  xxxxxxxxxxxxxxxx: 2, 'x.xxx.xxx.xxx.xx': 1, 'xx.xxx.xxx.xxx.x': 1, 'x.x.xx.xx.x.xx.x': 1, 'x__x__x_x__x__x_': 1, 'x.x.x.x.x.x.x.x.': 0.5,
};
const ARP_RHYTHMS_GENRE = {
  'x___x___x___x___': 1, 'x_______x_______': 0.7, '..x...x...x...x.': 0.8, 'x..x..x.x..x..x.': 1, 'x_x_x_x_x_x_x_x_': 1, 'x.x.x.x.x.x.x.x.': 0.5, 'x__x__x_x__x__x_': 0.8,
};
// Melody feels of the chorus in 4/4: "syncopated" took 42 % of main sections.
const FEELS = { straight: 1, riff: 1, long: 1, dotted: 1, syncopated: 0.5, running: 1, sid: 1 };

// The sampler's intent from a model reading (src/gen/understand.js); the
// style is drawn from its candidates unless the prompt fixed it.
function intentFrom(understanding, prompt, rand) {
  const fixed = understanding.fixed.includes('style');
  const top = Object.entries(understanding.genres).sort((a, b) => b[1] - a[1])[0][0];
  const style = fixed ? top : weighted(rand, understanding.genres);
  return {
    prompt, style, blend: null, artist: null, scene: null, form: null, tempo: null, key: null,
    moods: understanding.moods,
    energy: Math.max(-0.6, Math.min(0.6, (understanding.energy - 0.5) * 1.2)),
    sidIdiom: understanding.sidIdiom,
  };
}

// understanding: the first pass's reading of the prompt; without
// it (the call failed, scripts) the rule-based reading stands in.
export function drawVoicing(rand, prompt = '', understanding = null) {
  const intent = understanding ? intentFrom(understanding, prompt, rand) : parsePrompt(prompt);
  const styleId = understanding ? intent.style : resolveStyle(intent);
  const fixed = new Set(understanding?.fixed || []);
  // the style sampler's palette for this reading of the prompt, with its
  // own random seed (sampleBrief is deterministic per key)
  const drawn = sampleBrief(intent, `voicing|${Math.floor(rand() * 1e9)}`, styleId, intent.blend);
  const idiom = drawn.sidIdiom ?? 0.3;
  const arp = ARPS[drawn.palette.arp] ? drawn.palette.arp : 'pwm';
  const bass = BASSES[drawn.palette.bass] ? drawn.palette.bass : 'bass';
  const kit = KITS[drawn.palette.kit] ? drawn.palette.kit : 'std';
  const character = weighted(rand, characterWeights(understanding ? intent.energy : drawn.energy || 0, idiom));
  const sound = drawSound(rand, character);
  const native = rand() < 0.25 + idiom * 0.6;
  const arpRhythm = weighted(rand, native ? ARP_RHYTHMS_NATIVE : ARP_RHYTHMS_GENRE);
  const feel = weighted(rand, FEELS);
  const s = sound;
  const soundText = `wave ${s.wave}, attack ${s.attack}, decay ${s.decay}, sustain ${s.sustain}, release ${s.release}, vibrato ${s.vibrato}`
    + `${s.wave === 'pulse' ? `, pulse_width ${s.pulse_width}, pwm ${s.pwm}` : ''}, onset ${s.onset}, slide ${s.slide}`;
  const palette = [
    fixed.has('arp') ? null : `palette.arp ${arp}`,
    fixed.has('bass') ? null : `palette.bass ${bass}`,
    fixed.has('drums') ? null : `palette.kit ${kit}`,
  ].filter(Boolean);
  const style = STYLES[styleId]?.name || styleId;
  return {
    voicing: { styleGuess: styleId, arp, bass, kit, character, sound, arpRhythm, feel },
    style: styleId,
    lines: [
      understanding && !fixed.has('style') && Object.keys(understanding.genres).length > 1
        ? `Style: ${styleId} (${style}), one of the styles that fit this prompt.` : null,
      palette.length ? `Sounds: ${palette.join(', ')}.` : null,
      fixed.has('lead') ? null : `Custom lead (sound): a ${character} sound, ${soundText}.`,
      `If the song is in 4/4, give the chorus the melody feel ${feel}${fixed.has('arp') ? '' : ` and, where the chord arpeggio plays, the arp_pattern "${arpRhythm}"`}.`,
    ].filter(Boolean),
  };
}
