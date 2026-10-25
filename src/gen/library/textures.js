// Textures: which role each of the three SID voices plays, bar by bar,
// inside a section. Roles: D drums, B bass, L lead, A chord arpeggio,
// M bass and drums on one voice (a classic SID trick), C counter-melody
// (a second line under the lead, contrary motion, chord tones), - silent.
// stages: [fromFraction, roles] in order. lead: which motifs the lead
// uses (own section, 'verse' or 'chorus' material). drums: override for
// the drum part. filter: 'sweep' opens the filter over the section.
// Research: game "vertical layering" and EDM muting of one repeating
// sequence.

export const TEXTURES = {
  // ---- main sections ---------------------------------------------------
  full: { kind: 'main', name: 'full band: drums, bass, lead', stages: [[0, 'DBL']] },
  multiplex: { kind: 'main', name: 'bass+drums on one voice, chord arps, lead', stages: [[0, 'MAL']] },
  no_drums: { kind: 'main', name: 'bass, chord arps, lead, no drums', stages: [[0, 'BAL']] },
  groove_chords: { kind: 'main', name: 'drums, bass, chord arps (instrumental)', stages: [[0, 'DBA']] },
  call_response: { kind: 'main', name: 'lead and arps take turns', stages: [[0, 'DBL'], [0.5, 'DBA']] },
  counter: { kind: 'main', name: 'bass+drums on one voice, counter-melody, lead', stages: [[0, 'MCL']] },
  counter_nodrums: { kind: 'main', name: 'bass, counter-melody, lead, no drums', stages: [[0, 'BCL']] },
  build_up_band: { kind: 'main', name: 'band builds up: bass and lead, then drums, then chords', stages: [[0, '-BL'], [0.25, 'DBL'], [0.75, 'MAL']] },

  // ---- intros ----------------------------------------------------------
  staggered: { kind: 'intro', name: 'staggered entry: bass, then drums, then chords', stages: [[0, '-B-'], [0.25, 'DB-'], [0.5, 'DBA']] },
  riff_solo: { kind: 'intro', name: 'riff alone, band joins in', stages: [[0, '--L'], [0.5, '-BL'], [0.75, 'DBL']], lead: 'verse' },
  countin: { kind: 'intro', name: 'drum count-in, then full band', stages: [[0, 'D--'], [0.5, 'DBA']], drums: 'fill' },
  cold_start: { kind: 'intro', name: 'cold start on the chorus theme', stages: [[0, 'DBL']], lead: 'chorus', energy: 0.85 },
  arp_swell: { kind: 'intro', name: 'chord arps with an opening filter', stages: [[0, '-A-'], [0.5, 'BA-']], filter: 'open' },
  drone_lead: { kind: 'intro', name: 'drone with a free melody', stages: [[0, 'B-L']], lead: 'verse', bass: 'drone' },
  twin_lead: { kind: 'intro', name: 'lead over chords, no drums', stages: [[0, '-AL']], lead: 'chorus' },
  drum_groove: { kind: 'intro', name: 'groove alone, bass joins', stages: [[0, 'D--'], [0.5, 'DB-']] },

  // ---- breakdowns and builds ---------------------------------------------
  bass_alone: { kind: 'breakdown', name: 'bass alone, drums come back', stages: [[0, '-B-'], [0.5, 'DB-']] },
  arp_lead: { kind: 'breakdown', name: 'only chords and lead', stages: [[0, '-AL']] },
  duet: { kind: 'breakdown', name: 'lead and counter-melody in duet', stages: [[0, '-CL']] },
  halftime_break: { kind: 'breakdown', name: 'halftime breakdown', stages: [[0, 'DBA']], drums: 'halftime' },
  drop_out: { kind: 'breakdown', name: 'drums and bass without melody', stages: [[0, 'DB-']] },
  snare_build: { kind: 'build', name: 'build-up with snare roll', stages: [[0, 'DBA']], drums: 'build', filter: 'open' },

  // ---- outros ------------------------------------------------------------
  fade_layers: { kind: 'outro', name: 'voices drop out one by one', stages: [[0, 'DBL'], [0.5, 'DB-'], [0.75, '-B-']] },
  final_hit: { kind: 'outro', name: 'full band, final chord', stages: [[0, 'DBA']] },
  riff_out: { kind: 'outro', name: 'theme at the end, final chord', stages: [[0, 'DBL']], lead: 'chorus' },
  arp_out: { kind: 'outro', name: 'chords ring out', stages: [[0, 'BA-'], [0.5, '-A-']] },
};

// Section type -> texture kind used to pick candidates.
export const KIND_OF = {
  intro: 'intro', verse: 'main', pre: 'main', chorus: 'main', bridge: 'main', solo: 'main',
  breakdown: 'breakdown', build: 'build', outro: 'outro',
};

// Filter shape over a section: follow the energy curve, open up, close
// down, wobble once per bar, or stay put.
export const FILTER_SHAPES = {
  follow: 'follows the energy', open: 'opens up', close: 'closes down', wobble: 'pulses every bar', steady: 'stays put',
};

// Transitions at the end of a section.
export const TRANSITIONS = {
  fill: { name: 'drum fill' },
  stop: { name: 'stop-time: band halts' },
  dropout: { name: 'drums drop out for a bar' },
  none: { name: 'direct transition' },
};
