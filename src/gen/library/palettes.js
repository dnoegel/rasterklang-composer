// Sound choices per role (instrument names from instruments.js).

import { HVSC_KITS, HVSC_BASSES, HVSC_LEADS } from './hvsc-instruments.js';
import { STANDARD_BASSES, STANDARD_LEADS, STANDARD_KITS } from './standard.js';

const named = (obj) => Object.fromEntries(Object.entries(obj).map(([id, v]) => [id, `${v.name} (HVSC)`]));
// standard library sounds that passed the mix gate
const standard = (obj) => Object.fromEntries(Object.entries(obj).map(([id, v]) => [id, `${v.description} (HVSC standard)`]));

export const LEADS = {
  lead: 'pulse lead with pulse-width modulation', saw: 'sawtooth lead', brass: 'soft brass', bell: 'bell',
  pluck: 'plucked pulse', octave: 'pulse lead with octave attack', whistle: 'flute (triangle)', fiddle: 'fiddle (sawtooth with vibrato)',
  fuzz: 'fuzz lead (distorted guitar)', square: 'dry square wave, no vibrato (chip)', glide: 'sawtooth lead gliding between notes',
  reed: 'nasal narrow pulse (oboe, clarinet)', warble: 'warbling octave arpeggio lead (classic C64)',
  ring: 'ring-modulated bell-metal lead moving with the bass (classic C64)', sync: 'hard-synced saw lead, growling with the bass (classic C64)',
  ...named(HVSC_LEADS),
  ...standard(STANDARD_LEADS),
};
// 'custom' is the lead designed in the brief's `sound` (LLM path only).
export const CUSTOM_LEAD = 'custom';
export const BASSES = { bass: 'pulse bass with click', sub: 'round sub bass', slap: 'slap bass', acid: 'acid sawtooth', drone: 'drone sawtooth',
  chipbass: 'punchy square bass', slidebass: 'sub bass gliding between notes (808, 303)', growl: 'growling pulse-sweep bass',
  ...named(HVSC_BASSES),
  ...standard(STANDARD_BASSES),
};
export const SNARES = { snare: 'noise snare', snare2: 'tonal rock snare', clap: 'clap' };

// Sound of the chord arpeggio voice, one per song. `pwm` was the only one
// until 2026-10-28 and stays the default for briefs that name none, so
// stored songs keep their sound.
export const ARPS = {
  pwm: 'pulse arpeggio with a width sweep (classic)', square: 'dry square arpeggio (chip)', thin: 'thin narrow-pulse arpeggio (nasal, glassy)',
  saw: 'bright sawtooth arpeggio (buzzy)', tri: 'soft triangle arpeggio (music box)', pluck: 'plucked pulse arpeggio, fast decay (harp, strum)',
  slow: 'rolling pulse arpeggio, two frames per note', pad: 'swelling triangle pad, rolling', wide: 'pulse arpeggio over an octave (sparkling)',
};
// Weights per style family; defaults to tune by ear.
export const ARP_POOLS = {
  game: { pwm: 2, square: 2, wide: 2, thin: 1, pluck: 1 },
  synth: { pwm: 2, saw: 2, wide: 1.5, slow: 1.5, pad: 1, thin: 1 },
  dance: { saw: 2, pwm: 1.5, wide: 2, square: 1, pluck: 1 },
  rock: { saw: 2, pwm: 1.5, pluck: 1.5, slow: 1, square: 0.5 },
  metal: { saw: 3, pwm: 1, thin: 1, slow: 1 },
  pop: { pwm: 1.5, pluck: 2, wide: 1, square: 1, tri: 1 },
  funk: { pluck: 2, thin: 2, square: 1, pwm: 1 },
  hiphop: { tri: 2, pluck: 2, pad: 1.5, thin: 1 },
  cinematic: { pad: 2, slow: 2, saw: 1.5, tri: 1, pwm: 1 },
  latin: { pluck: 3, tri: 2, thin: 1 },
  reggae: { pluck: 2, thin: 2, square: 1 },
  jazz: { tri: 2, pluck: 2, pad: 1.5, thin: 1 },
  blues: { pluck: 2, thin: 1.5, saw: 1, tri: 1 },
  folk: { pluck: 3, tri: 2, slow: 1 },
  classical: { tri: 2, pluck: 2, slow: 1.5, pad: 1 },
  ambient: { pad: 3, tri: 2, slow: 1.5 },
};

// Drum kits: which instrument plays kick, snare and closed hat. `std` is
// the bank's own kit (its snare is the brief's snare choice); the others
// are C64-style kits, whose snare replaces
// snare/snare2 (a clap stays a clap). Toms, open hat and crash are shared.
export const KITS = {
  std: { name: 'the bank\'s own kit: noise-click kick, noise snare, short hat', kick: 'kick', snare: null, hat: 'hat' },
  ...Object.fromEntries(Object.entries(HVSC_KITS).map(([id, k]) => [id, { ...k, name: `${k.name} (HVSC)` }])),
  ...Object.fromEntries(Object.entries(STANDARD_KITS).map(([id, k]) => [id, { ...k, name: `${k.name} (HVSC standard)` }])),
};

// C64-style sounds join a style's pools by family with these weights, next to
// the style's own palette (kits next to `std` at weight 1). Families with
// few drums or acoustic models get the soft sounds only. Weights are
// defaults to tune by ear.
const SID_BAND = {
  kit: { tight: 0.6, boom: 0.5, round: 0.4, thin: 0.4 },
  bass: { gtbass: 0.6, thump: 0.4, buzz: 0.3 },
  lead: { scoop: 0.6, sharp: 0.5, chime: 0.4, vibra: 0.6 },
};
const SOFT = {
  kit: { round: 0.5 },
  bass: { gtbass: 0.3 },
  lead: { chime: 0.5, vibra: 0.4 },
};
export const HVSC_POOLS = {
  game: { kit: { tight: 0.8, thin: 0.6, boom: 0.5, round: 0.4 }, bass: { gtbass: 0.8, thump: 0.6, buzz: 0.4 }, lead: { scoop: 0.8, sharp: 0.6, chime: 0.7, vibra: 0.7 } },
  synth: SID_BAND,
  dance: { kit: { boom: 0.7, round: 0.6, tight: 0.4 }, bass: { gtbass: 0.5, buzz: 0.5, thump: 0.4 }, lead: { scoop: 0.6, sharp: 0.6, vibra: 0.4 } },
  rock: { kit: { tight: 0.6, boom: 0.5, thin: 0.3 }, bass: { gtbass: 0.5, buzz: 0.4 }, lead: { scoop: 0.6, vibra: 0.6 } },
  metal: { kit: { tight: 0.6, boom: 0.6 }, bass: { gtbass: 0.4, buzz: 0.5 }, lead: { scoop: 0.6, vibra: 0.5 } },
  pop: SID_BAND,
  funk: { kit: { tight: 0.6, thin: 0.4, round: 0.4 }, bass: { gtbass: 0.4, buzz: 0.3 }, lead: { sharp: 0.6, vibra: 0.5, chime: 0.3 } },
  hiphop: { kit: { round: 0.7, boom: 0.6 }, bass: { gtbass: 0.3 }, lead: { chime: 0.5, vibra: 0.4 } },
  cinematic: { kit: { boom: 0.5, round: 0.4 }, bass: { gtbass: 0.3 }, lead: { vibra: 0.6, scoop: 0.4 } },
  latin: SOFT,
  reggae: SOFT,
  jazz: SOFT,
  blues: SOFT,
  folk: SOFT,
  classical: SOFT,
  ambient: { kit: { round: 0.4 }, bass: {}, lead: { vibra: 0.4, chime: 0.4 } },
};
export const hvscPool = (style, role) => HVSC_POOLS[style.family]?.[role] || {};
// Families whose songs may draw the standard library sounds: the
// SID band ones, not the acoustic and soft families.
export const STANDARD_FAMILIES = ['game', 'synth', 'dance', 'rock', 'metal', 'pop', 'funk'];
