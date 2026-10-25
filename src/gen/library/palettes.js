// Sound choices per role (instrument names from instruments.js).

export const LEADS = {
  lead: 'pulse lead with pulse-width modulation', saw: 'sawtooth lead', brass: 'soft brass', bell: 'bell',
  pluck: 'plucked pulse', octave: 'pulse lead with octave attack', whistle: 'flute (triangle)', fiddle: 'fiddle (sawtooth with vibrato)',
  fuzz: 'fuzz lead (distorted guitar)',
};
// 'custom' is the lead designed in the brief's `sound` (LLM path only).
export const CUSTOM_LEAD = 'custom';
export const BASSES = { bass: 'pulse bass with click', sub: 'round sub bass', slap: 'slap bass', acid: 'acid sawtooth', drone: 'drone sawtooth' };
export const SNARES = { snare: 'noise snare', snare2: 'tonal rock snare', clap: 'clap' };
